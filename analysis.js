class ChessAnalyzer {
    constructor(chessInstance, stockfish) {
        this.chess = chessInstance;
        this.stockfish = stockfish;
        this.moveHistory = [];
        this.evaluationHistory = [];
    }

    /**
     * Sigmoig-based expected score from a centipawn or mate evaluation.
     * Exact copy of wintrchess getExpectedPoints().
     * For centipawn evals: computes sigmoid(raw eval value), NO sign flipping.
     * For mate evals: moveColour determines which side gets the point for stalemate (mate=0).
     * Accepts options: { moveColour: 'w'|'b', centipawnGradient?: number }
     */
    static getExpectedPoints(evalObj, options = {}) {
        const opts = { centipawnGradient: 0.0035, ...options };

        if (evalObj.type === 'mate') {
            if (evalObj.value === 0) {
                // Stalemate: the side we're computing expected points for gets 0 or 1
                return opts.moveColour === 'w' ? 1 : 0;
            }
            return evalObj.value > 0 ? 1 : 0;
        }
        // Centipawn evaluation: pure sigmoid, no perspective flipping
        return 1 / (1 + Math.exp(-opts.centipawnGradient * evalObj.value));
    }

    /**
     * Expected-points loss caused by a move.
     * EXACT copy of wintrchess getExpectedPointsLoss().
     * Computes opponent's expected points before minus player's expected points after,
     * then flips sign for Black.
     */
    static getExpectedPointsLoss(evalBefore, evalAfter, moveColor) {
        const opponentColor = moveColor === 'w' ? 'b' : 'w';
        const raw = (
            ChessAnalyzer.getExpectedPoints(evalBefore, { moveColour: opponentColor })
            - ChessAnalyzer.getExpectedPoints(evalAfter, { moveColour: moveColor })
        );
        return Math.max(0, raw * (moveColor === 'w' ? 1 : -1));
    }

    /**
     * Move accuracy percentage using wintrchess formula.
     * EXACT copy — NO clamping (wintrchess does not clamp).
     * Formula: 103.16 * exp(-4 * pointLoss) - 3.17
     */
    static getMoveAccuracy(pointLoss) {
        return 103.16 * Math.exp(-4 * pointLoss) - 3.17;
    }

    /**
     * Full point-loss classification with mate transition handling.
     * EXACT copy of wintrchess pointLossClassify().
     * Handles mate→mate, mate→cp, cp→mate, and cp→cp transitions.
     * Expects evaluations from a consistent perspective (White's POV is our convention).
     */
    static pointLossClassify(evalBefore, evalAfter, moveColor) {
        // Subjective values: convert from White's POV to the player who just moved
        const subjectiveValueBefore = evalBefore.value * (moveColor === 'w' ? 1 : -1);
        const subjectiveValueAfter = evalAfter.value * (moveColor === 'w' ? 1 : -1);

        // Mate to mate evaluations
        if (evalBefore.type === 'mate' && evalAfter.type === 'mate') {
            // Winning mate to losing mate
            if (subjectiveValueBefore > 0 && subjectiveValueAfter < 0) {
                return subjectiveValueAfter < -3 ? 'mistake' : 'blunder';
            }

            // For the losing side, making a move that keeps the mate the same is best.
            // Only the winning side expects a mate loss of -1.
            const mateLoss = (
                (evalAfter.value - evalBefore.value)
                * (moveColor === 'w' ? 1 : -1)
            );

            if (mateLoss < 0 || (mateLoss === 0 && subjectiveValueAfter < 0)) {
                return 'best';
            } else if (mateLoss < 2) {
                return 'excellent';
            } else if (mateLoss < 7) {
                return 'okay';
            } else {
                return 'inaccuracy';
            }
        }

        // Mate to centipawn evaluations
        if (evalBefore.type === 'mate' && evalAfter.type === 'centipawn') {
            if (subjectiveValueAfter >= 800) return 'excellent';
            else if (subjectiveValueAfter >= 400) return 'okay';
            else if (subjectiveValueAfter >= 200) return 'inaccuracy';
            else if (subjectiveValueAfter >= 0) return 'mistake';
            else return 'blunder';
        }

        // Centipawn to mate evaluations
        if (evalBefore.type === 'centipawn' && evalAfter.type === 'mate') {
            if (subjectiveValueAfter > 0) return 'best';
            else if (subjectiveValueAfter >= -2) return 'blunder';
            else if (subjectiveValueAfter >= -5) return 'mistake';
            else return 'inaccuracy';
        }

        // Centipawn to centipawn (standard case)
        const pointLoss = ChessAnalyzer.getExpectedPointsLoss(evalBefore, evalAfter, moveColor);

        if (pointLoss < 0.01) return 'best';
        else if (pointLoss < 0.045) return 'excellent';
        else if (pointLoss < 0.08) return 'okay';
        else if (pointLoss < 0.12) return 'inaccuracy';
        else if (pointLoss < 0.22) return 'mistake';
        else return 'blunder';
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
        // For mate evals: use the actual mate-in-N value (normalized to White's POV)
        // For cp evals: use the centipawn score (already normalized to White's POV)
        const evalObjBefore = {
            type: evalBefore.type || 'cp',
            value: evalBefore.type === 'mate'
                ? (fenBefore.split(' ')[1] === 'w' ? evalBefore.value : -evalBefore.value)
                : evalBefore.score
        };
        const evalObjAfter = {
            type: evalAfter.type || 'cp',
            value: evalAfter.type === 'mate'
                ? (fenAfter.split(' ')[1] === 'w' ? evalAfter.value : -evalAfter.value)
                : evalAfter.score
        };

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
        // STEP 5: Classify using wintrchess pointLossClassify (inc. mate transitions)
        // ──────────────────────────────────────────────────────────
        const baseClassification = ChessAnalyzer.pointLossClassify(evalObjBefore, evalObjAfter, move.color);
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

        // Use wintrchess pointLossClassify for all other cases
        // (handles cp→cp, mate→mate, mate→cp, cp→mate transitions)
        else {
            classification = baseClassification;
            switch (baseClassification) {
                case 'best':
                    description = topMovePlayed ? 'Best move' : 'Excellent move';
                    break;
                case 'excellent':
                    description = 'Excellent move';
                    break;
                case 'okay':
                    description = 'Okay move';
                    break;
                case 'inaccuracy':
                    description = '?! Inaccuracy';
                    if (suggestedMove) description += `. Better was ${suggestedMove}`;
                    break;
                case 'mistake':
                    description = '? Mistake';
                    if (suggestedMove) description += `. Better was ${suggestedMove}`;
                    break;
                case 'blunder':
                    description = '?? Blunder';
                    if (suggestedMove) description += `. Better was ${suggestedMove}`;
                    break;
            }
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
