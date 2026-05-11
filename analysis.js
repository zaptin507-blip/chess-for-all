class ChessAnalyzer {
    constructor(chessInstance, stockfish) {
        this.chess = chessInstance;
        this.stockfish = stockfish;
        this.moveHistory = [];
        this.evaluationHistory = [];
    }

    /**
     * Sigmoig-based expected score from a centipawn or mate evaluation.
     * Uses the standard logistic function (same as wintrchess / Leela / Stockfish win-rate model).
     * Returns 0.0 to 1.0 — win probability for the side indicated by `perspectiveColor`.
     */
    static getExpectedPoints(evalObj, perspectiveColor) {
        // evalObj = { type: 'cp', value: centipawnScore } or { type: 'mate', value: mateInPly }
        // perspectiveColor = 'w' or 'b' — the side whose win probability we want
        if (evalObj.type === 'mate') {
            if (evalObj.value === 0) return 0.5; // stalemate / draw
            return evalObj.value > 0 ? 1 : 0;   // forced win or forced loss
        }
        // Centipawn evaluation: sigmoid with 0.0035 gradient (standard chess win-rate model)
        const score = perspectiveColor === 'w' ? evalObj.value : -evalObj.value;
        return 1 / (1 + Math.exp(-0.0035 * score));
    }

    /**
     * Expected-points loss caused by a move.
     * Measures how much the win probability dropped from before to after the move.
     * This is the core of the wintrchess classification system — replaces raw centipawn loss.
     */
    static getExpectedPointsLoss(evalBefore, evalAfter, moveColor) {
        // Expected points for the PLAYER BEFORE the move
        const playerBefore = ChessAnalyzer.getExpectedPoints(evalBefore, moveColor);

        // Expected points for the PLAYER AFTER the move
        const playerAfter = ChessAnalyzer.getExpectedPoints(evalAfter, moveColor);

        // Loss = player's win probability before - after
        // Positive loss means the player made things worse for themselves
        const rawLoss = playerBefore - playerAfter;
        return Math.max(0, rawLoss);
    }

    /**
     * Move accuracy percentage using wintrchess formula.
     * Returns 0-100, where 100 = perfect move.
     * Formula: 103.16 * exp(-4 * pointLoss) - 3.17
     */
    static getMoveAccuracy(pointLoss) {
        return Math.min(100, Math.max(0, 103.16 * Math.exp(-4 * pointLoss) - 3.17));
    }

    async evaluatePosition(fen, depth = 18) {
        return new Promise((resolve) => {
            let timeout;
            const fenParts = fen.split(' ');
            const sideToMove = fenParts.length > 1 ? fenParts[1] : 'w';

            const listener = (event) => {
                const message = event.data;
                const match = message.match(/score cp (-?\d+)/);
                const mateMatch = message.match(/score mate (-?\d+)/);

                if (mateMatch) {
                    clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    const mateVal = parseInt(mateMatch[1]);
                    resolve({
                        type: 'mate',
                        value: mateVal,
                        score: mateVal > 0 ? 10000 : -10000
                    });
                } else if (match) {
                    const rawScore = parseInt(match[1]);
                    clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    // Stockfish reports score from side-to-move perspective.
                    // Normalize so positive = white advantage.
                    const score = sideToMove === 'b' ? -rawScore : rawScore;
                    resolve({ type: 'cp', value: score, score });
                }
            };

            this.stockfish.addEventListener('message', listener);

            timeout = setTimeout(() => {
                console.warn('evaluatePosition timed out for FEN:', fen);
                this.stockfish.removeEventListener('message', listener);
                resolve({ type: 'cp', value: 0, score: 0 });
            }, 10000);

            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    async analyzeMove(move, fenBefore, fenAfter, moveIndex = -1) {
        // ──────────────────────────────────────────────────────────
        // STEP 0: Forced move — only one legal move available
        // ──────────────────────────────────────────────────────────
        const chessAtPosition = new Chess(fenBefore);
        const legalMoves = chessAtPosition.moves();
        const isForced = legalMoves.length <= 1;

        if (isForced) {
            return {
                move: move.san,
                classification: 'forced',
                description: 'Forced move — only legal option',
                suggestedMove: null,
                evalBefore: 0,
                evalAfter: 0,
                evalChange: 0
            };
        }

        // ──────────────────────────────────────────────────────────
        // STEP 1: Evaluate position before and after
        // ──────────────────────────────────────────────────────────
        const evalBefore = await this.evaluatePosition(fenBefore);
        const evalAfter = await this.evaluatePosition(fenAfter);

        // Wrap evaluation scores for point-loss computation
        const evalObjBefore = { type: evalBefore.type || 'cp', value: evalBefore.score };
        const evalObjAfter = { type: evalAfter.type || 'cp', value: evalAfter.score };

        // ──────────────────────────────────────────────────────────
        // STEP 2: Run detection helpers
        // ──────────────────────────────────────────────────────────
        const isBrilliant = ChessAnalyzer.isBrilliantPosition(move, fenBefore);
        const missedCheckmateResult = await this.detectMissedCheckmate(fenBefore);
        const missedCheckmate = missedCheckmateResult.isCheckmate;
        const isBook = this.detectBookMove(move.san, moveIndex);

        // ──────────────────────────────────────────────────────────
        // STEP 3: Calculate expected-points loss (wintrchess core metric)
        // ──────────────────────────────────────────────────────────
        const pointLoss = ChessAnalyzer.getExpectedPointsLoss(evalObjBefore, evalObjAfter, move.color);
        const evalDiff = evalAfter.score - evalBefore.score;
        const actualEvalChange = move.color === 'w' ? evalDiff : -evalDiff;

        // ──────────────────────────────────────────────────────────
        // STEP 4: Find engine's best move
        // ──────────────────────────────────────────────────────────
        let suggestedMove = null;

        if (missedCheckmate && missedCheckmateResult.bestMove) {
            suggestedMove = missedCheckmateResult.bestMove;
        } else if (pointLoss >= 0.01) {
            // Lost win probability — deep analysis for reliable suggested alternatives
            suggestedMove = await this.findBestMove(fenBefore, 15);
            if (!suggestedMove) suggestedMove = await this.findBestMove(fenBefore, 12);
            if (!suggestedMove) suggestedMove = await this.findBestMove(fenBefore, 8);
        } else {
            // Good move — shallow check for Best / Critical classification
            suggestedMove = await this.findBestMove(fenBefore, 8);
        }

        const topMovePlayed = suggestedMove && suggestedMove === move.san;

        // ──────────────────────────────────────────────────────────
        // STEP 5: Classify using expected-points loss + wintrchess thresholds
        // ──────────────────────────────────────────────────────────
        let classification;
        let description = '';

        if (isBook && pointLoss < 0.01) {
            classification = 'book';
            description = 'Book move — follows opening theory';
        }

        else if (missedCheckmate) {
            classification = 'missedWin';
            description = 'Missed win! You had a forced checkmate';
            if (suggestedMove) description += `. Checkmate was: ${suggestedMove}`;
        }

        // BRILLIANT: sound material sacrifice — piece was NOT already hanging,
        // opponent can capture with a cheaper piece, but the position is still winning.
        else if (isBrilliant && topMovePlayed && pointLoss < 0.01) {
            classification = 'brilliant';
            description = 'Brilliant! Sound material sacrifice with winning follow-up';
        }

        // CRITICAL: only good move in a dangerous position (player found the needle)
        else if (topMovePlayed && this._isCriticalPosition(evalObjBefore, legalMoves.length, move)) {
            classification = 'critical';
            description = '! Critical move — only good move in the position';
        }

        // BEST: played the engine's top pick or lost negligible win probability
        else if (topMovePlayed || pointLoss < 0.01) {
            classification = 'best';
            description = 'Best move';
        }

        // EXCELLENT: very small loss (0.01 — 0.045)
        else if (pointLoss < 0.045) {
            classification = 'excellent';
            description = 'Excellent move';
        }

        // OKAY: small loss (0.045 — 0.08)
        else if (pointLoss < 0.08) {
            classification = 'okay';
            description = 'Okay move';
        }

        // INACCURACY: moderate loss (0.08 — 0.12)
        else if (pointLoss < 0.12) {
            classification = 'inaccuracy';
            description = '?! Inaccuracy';
            if (suggestedMove) description += `. Better was ${suggestedMove}`;
        }

        // MISTAKE: significant loss (0.12 — 0.22)
        else if (pointLoss < 0.22) {
            classification = 'mistake';
            description = '? Mistake';
            if (suggestedMove) description += `. Better was ${suggestedMove}`;
        }

        // BLUNDER: catastrophic loss (>= 0.22)
        else {
            classification = 'blunder';
            description = '?? Blunder';
            if (suggestedMove) description += `. Better was ${suggestedMove}`;
        }

        return {
            move: move.san,
            classification,
            description,
            suggestedMove,
            evalBefore: evalBefore.score,
            evalAfter: evalAfter.score,
            evalChange: actualEvalChange
        };
    }

    /**
     * Heuristic for detecting "Critical" positions where only one move saves the game.
     * Without MultiPV=2 support from this Stockfish build, we approximate:
     *   - Position is losing (eval < -200 cp for the player)
     *   - Few legal moves (<= 3 — high pressure, limited options)
     *   - The player found the best move (topMovePlayed was already checked by caller)
     */
    _isCriticalPosition(evalObjBefore, legalMoveCount, move) {
        if (legalMoveCount > 3) return false;

        // The player's position before the move was losing
        const playerPerspective = move.color === 'w' ? evalObjBefore.value : -evalObjBefore.value;
        if (playerPerspective > -150) return false; // not losing enough

        return true;
    }

    async findBestMove(fen, depth = 10) {
        return new Promise((resolve) => {
            let timeout;

            const listener = (event) => {
                const message = event.data;
                if (message.startsWith('bestmove')) {
                    clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    const match = message.match(/^bestmove\s+(\S+)/);
                    if (match && match[1] !== '(none)') {
                        const bestMove = match[1];
                        const from = bestMove.substring(0, 2);
                        const to = bestMove.substring(2, 4);
                        const promotion = bestMove.length > 4 ? bestMove[4] : undefined;

                        try {
                            const tempChess = new Chess(fen);
                            const move = tempChess.move({ from, to, promotion });
                            if (move && move.san) {
                                resolve(move.san);
                            } else {
                                console.warn('Move conversion failed, using UCI format:', bestMove);
                                resolve(this.formatUCIToAlgebraic(bestMove, fen));
                            }
                        } catch (error) {
                            console.error('Error converting move:', error, bestMove);
                            resolve(this.formatUCIToAlgebraic(bestMove, fen));
                        }
                    } else {
                        resolve(null);
                    }
                }
            };

            this.stockfish.addEventListener('message', listener);

            timeout = setTimeout(() => {
                console.warn('findBestMove timed out at depth', depth);
                this.stockfish.removeEventListener('message', listener);
                resolve(null);
            }, 5000);

            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    formatUCIToAlgebraic(uciMove, fen) {
        if (!uciMove || uciMove.length < 4) return uciMove;

        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;

        if (fen) {
            try {
                const tempChess = new Chess(fen);
                const move = tempChess.move({ from, to, promotion });
                if (move && move.san) {
                    return move.san;
                }
            } catch (e) {
                // Fall through
            }
        }

        let algebraic = to;
        if (promotion) {
            algebraic += '=' + promotion.toUpperCase();
        }
        return algebraic;
    }

    async detectMissedCheckmate(fen, depth = 15) {
        return new Promise((resolve) => {
            let timeout;

            const listener = (event) => {
                const message = event.data;
                if (message.startsWith('bestmove')) {
                    clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    const match = message.match(/^bestmove\s+(\S+)/);
                    if (match && match[1] !== '(none)') {
                        const bestMove = match[1];
                        const from = bestMove.substring(0, 2);
                        const to = bestMove.substring(2, 4);
                        const promotion = bestMove.length > 4 ? bestMove[4] : undefined;

                        const tempChess = new Chess(fen);
                        const moveResult = tempChess.move({ from, to, promotion });

                        const isCheckmate = moveResult && tempChess.game_over() && tempChess.in_checkmate();
                        resolve({
                            isCheckmate,
                            bestMove: moveResult ? moveResult.san : this.formatUCIToAlgebraic(bestMove, fen)
                        });
                    } else {
                        resolve({ isCheckmate: false, bestMove: null });
                    }
                }
            };

            this.stockfish.addEventListener('message', listener);

            timeout = setTimeout(() => {
                console.warn('detectMissedCheckmate timed out');
                this.stockfish.removeEventListener('message', listener);
                resolve({ isCheckmate: false, bestMove: null });
            }, 8000);

            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    detectBookMove(moveSan, moveIndex) {
        if (moveIndex < 0 || moveIndex > 14) return false;
        if (!moveSan) return false;

        const normalizedMove = moveSan.replace(/[+#]$/, '');

        const openings = Object.values(chessOpenings);
        for (const opening of openings) {
            if (!opening.moves || !Array.isArray(opening.moves)) continue;
            if (moveIndex < opening.moves.length) {
                const expectedMove = opening.moves[moveIndex];
                if (normalizedMove.toLowerCase() === expectedMove.toLowerCase()) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Determines if a move is a Brilliant sacrifice using piece-safety analysis.
     * A brilliant move = you voluntarily place a piece where the opponent can
     * capture it with a lower-value piece, AND the resulting position is
     * winning/equalizing (caller checks pointLoss < 0.01).
     *
     * This follows the modern chess.com definition:
     *   - Leaves a piece hanging (forfeits material)
     *   - The piece was NOT already hanging before the move (voluntary)
     *   - Results in a significant advantage through a strong follow-up
     *   - Requires deep calculation (non-obvious)
     */
    static isBrilliantPosition(move, fenBefore) {
        const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

        // Need a real piece move with a from-square
        if (!move || !move.from || !move.to || !move.color) return false;

        const chess = new Chess(fenBefore);
        const opponentColor = move.color === 'w' ? 'b' : 'w';

        // Check 1: Piece was NOT already hanging on its source square.
        // A voluntary sacrifice means the piece wasn't already under attack.
        const beforeMoves = chess.moves({ verbose: true });
        for (const bm of beforeMoves) {
            if (bm.to === move.from && bm.color === opponentColor) {
                return false; // piece was already attacked — moving it is obvious
            }
        }

        // Make the move to get the resulting position
        chess.move({ from: move.from, to: move.to, promotion: move.promotion });
        const afterMoves = chess.moves({ verbose: true });

        // Check 2: Is the piece hanging AFTER the move?
        // Opponent must be able to capture it on the destination square.
        let capturedByPiece = null;
        for (const am of afterMoves) {
            if (am.to === move.to && am.color === opponentColor) {
                if (!capturedByPiece || pieceValues[am.piece] < pieceValues[capturedByPiece]) {
                    capturedByPiece = am.piece;
                }
            }
        }

        if (!capturedByPiece) return false; // not hanging — no sacrifice

        // Check 3: Real sacrifice — opponent captures with a cheaper piece
        // (The moved piece is worth MORE than the attacker)
        const movedValue = pieceValues[move.piece] || 0;
        const attackerValue = pieceValues[capturedByPiece] || 0;
        if (movedValue <= attackerValue) return false;

        // Check 4: Not a promotion (promoting is usually a straightforward gain)
        if (move.promotion) return false;

        return true;
    }

    detectHangingCapture(move, fenBefore) {
        if (!move.captured) return false;

        const tempChess = new Chess(fenBefore);
        const opponentColor = move.color === 'w' ? 'b' : 'w';

        const opponentMoves = tempChess.moves({ verbose: true });
        const capturedSquare = move.to;

        for (const oppMove of opponentMoves) {
            if (oppMove.to === capturedSquare && oppMove.color === opponentColor) {
                return false;
            }
        }
        return true;
    }

    detectBlunder(move, fenBefore, fenAfter) {
        const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

        if (move.captured) return false;

        const tempChess = new Chess(fenAfter);
        const opponentColor = move.color === 'w' ? 'b' : 'w';

        const opponentMoves = tempChess.moves({ verbose: true });

        for (const oppMove of opponentMoves) {
            if (oppMove.to === move.to && oppMove.color === opponentColor) {
                if (pieceValues[oppMove.piece] <= pieceValues[move.piece]) {
                    return true;
                }
            }
        }
        return false;
    }

    generateAnalysisReport(moveAnalyses) {
        const summary = {
            book: 0,
            forced: 0,
            best: 0,
            critical: 0,
            missedWin: 0,
            brilliant: 0,
            excellent: 0,
            okay: 0,
            inaccuracy: 0,
            mistake: 0,
            blunder: 0,
            good: 0  // Keep for backward compatibility
        };

        moveAnalyses.forEach(analysis => {
            if (summary.hasOwnProperty(analysis.classification)) {
                summary[analysis.classification]++;
            } else {
                summary.good++;
            }
        });

        return summary;
    }
}
