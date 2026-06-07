class ChessAnalyzer {
    constructor(chessInstance, stockfish) {
        this.chess = chessInstance;
        this.stockfish = stockfish;
        this.moveHistory = [];
        this.evaluationHistory = [];
    }

    /**
     * Sigmoid-based expected score from a centipawn or mate evaluation.
     * For centipawn evals: computes sigmoid(raw eval value), NO sign flipping.
     * For mate evals: positive mate = winning = 1.0 expected points.
     *   mate 0 = checkmate (side-to-move is checkmated); the computing side
     *   (moveColour) gets 1 if they delivered the mate (they are NOT the
     *   side-to-move), 0 if they were checkmated. Falls back to 1 if
     *   sideToMove is unknown.
     * Accepts options: { moveColour: 'w'|'b', centipawnGradient?: number }
     */
    static getExpectedPoints(evalObj, options = {}) {
        const opts = { centipawnGradient: 0.0035, ...options };

        if (evalObj.type === 'mate') {
            if (evalObj.value === 0) {
                if (!evalObj.sideToMove) return 1;
                return opts.moveColour !== evalObj.sideToMove ? 1 : 0;
            }
            return evalObj.value > 0 ? 1 : 0;
        }
        return 1 / (1 + Math.exp(-opts.centipawnGradient * evalObj.value));
    }

    static getExpectedPointsLoss(evalBefore, evalAfter, moveColor) {
        const opponentColor = moveColor === 'w' ? 'b' : 'w';
        const raw = (
            ChessAnalyzer.getExpectedPoints(evalBefore, { moveColour: opponentColor })
            - ChessAnalyzer.getExpectedPoints(evalAfter, { moveColour: moveColor })
        );
        return Math.max(0, raw * (moveColor === 'w' ? 1 : -1));
    }

    static getMoveAccuracy(pointLoss) {
        return 103.16 * Math.exp(-4 * pointLoss) - 3.17;
    }

    /**
     * Estimate game phase from FEN based on remaining non-pawn material.
     * Returns a value 0.0 (opening) to 1.0 (endgame).
     * Opening: both sides have most pieces, Endgame: few pieces remain.
     */
    static _getGamePhase(fen) {
        const fenParts = fen.split(' ');
        const board = fenParts[0];
        let totalMaterial = 0;
        for (const ch of board) {
            switch (ch) {
                case 'n': case 'b': totalMaterial += 3; break;
                case 'N': case 'B': totalMaterial += 3; break;
                case 'r': case 'R': totalMaterial += 5; break;
                case 'q': case 'Q': totalMaterial += 9; break;
            }
        }
        // Starting non-pawn material = 40 (20 per side)
        // Phase from 0 (40) to 1 (<=6 material)
        const phase = Math.max(0, Math.min(1, (40 - totalMaterial) / 34));
        return phase;
    }

    /**
     * Classify move quality with game-phase-aware thresholds.
     * In endgames, small point losses are more significant (fewer pieces = less compensation).
     * In openings, the same loss is less impactful.
     */
    static pointLossClassify(evalBefore, evalAfter, moveColor, gamePhase = 0) {
        const subjectiveValueBefore = evalBefore.value * (moveColor === 'w' ? 1 : -1);
        const subjectiveValueAfter = evalAfter.value * (moveColor === 'w' ? 1 : -1);

        if (evalBefore.type === 'mate' && evalAfter.type === 'mate') {
            if (subjectiveValueBefore > 0 && subjectiveValueAfter < 0) {
                return subjectiveValueAfter < -3 ? 'mistake' : 'blunder';
            }
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

        if (evalBefore.type === 'mate' && evalAfter.type === 'centipawn') {
            if (subjectiveValueAfter >= 800) return 'excellent';
            else if (subjectiveValueAfter >= 400) return 'okay';
            else if (subjectiveValueAfter >= 200) return 'inaccuracy';
            else if (subjectiveValueAfter >= 0) return 'mistake';
            else return 'blunder';
        }

        if (evalBefore.type === 'centipawn' && evalAfter.type === 'mate') {
            if (subjectiveValueAfter > 0) return 'best';
            else if (subjectiveValueAfter >= -2) return 'blunder';
            else if (subjectiveValueAfter >= -5) return 'mistake';
            else return 'inaccuracy';
        }

        const pointLoss = ChessAnalyzer.getExpectedPointsLoss(evalBefore, evalAfter, moveColor);

        // Apply phase-aware threshold adjustment.
        // Endgame (phase=1): thresholds are tighter (multiplied by ~0.6)
        // Opening (phase=0): thresholds are more lenient (multiplied by ~1.0)
        const phaseFactor = 1.0 - 0.4 * gamePhase;

        if (pointLoss < 0.01) return 'best';
        else if (pointLoss < 0.045 * phaseFactor) return 'excellent';
        else if (pointLoss < 0.08 * phaseFactor) return 'okay';
        else if (pointLoss < 0.12 * phaseFactor) return 'inaccuracy';
        else if (pointLoss < 0.22 * phaseFactor) return 'mistake';
        else return 'blunder';
    }

    async evaluatePosition(fen, depth = 18) {
        let resolved = false;
        return new Promise((resolve) => {
            let timeout;
            const fenParts = fen.split(' ');
            const sideToMove = fenParts.length > 1 ? fenParts[1] : 'w';

            const listener = (event) => {
                if (resolved) return;
                const message = event.data;
                const match = message.match(/score cp (-?\d+)/);
                const mateMatch = message.match(/score mate (-?\d+)/);

                if (mateMatch) {
                    resolved = true;
                    clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    const mateVal = parseInt(mateMatch[1]);
                    resolve({
                        type: 'mate',
                        value: mateVal,
                        sideToMove,
                        score: mateVal > 0 ? 10000 : -10000
                    });
                } else if (match) {
                    const rawScore = parseInt(match[1]);
                    resolved = true;
                    clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    const score = sideToMove === 'b' ? -rawScore : rawScore;
                    resolve({ type: 'cp', value: score, score });
                }
            };

            this.stockfish.addEventListener('message', listener);

            timeout = setTimeout(() => {
                if (resolved) return;
                resolved = true;
                console.warn('evaluatePosition timed out for FEN:', fen);
                this.stockfish.removeEventListener('message', listener);
                resolve({ type: 'cp', value: 0, score: 0 });
            }, 10000);

            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    /**
     * Find the top N best moves using Stockfish MultiPV mode.
     * Returns an array of { uci: string, san: string, scoreType: 'cp'|'mate', scoreVal: number }
     * sorted by rank (1 = best). Resets MultiPV to 1 afterward.
     */
    async findTopMoves(fen, numMoves = 3, depth = 15) {
        let resolved = false;
        return new Promise((resolve) => {
            const topMoves = {};
            let timeout;

            const listener = (event) => {
                if (resolved) return;
                const message = event.data;

                // Parse MultiPV info lines: "info depth N ... multipv N score (cp|mate) VAL ... pv MOVE1 MOVE2 ..."
                const pvMatch = message.match(/^info.*multipv\s+(\d+).*?score\s+(cp|mate)\s+(-?\d+)(?:.*?pv\s+(\S+))?/);
                if (pvMatch) {
                    const pvIndex = parseInt(pvMatch[1]);
                    const scoreType = pvMatch[2];
                    const scoreVal = parseInt(pvMatch[3]);
                    const uciMove = pvMatch[4] || '';

                    // Store only the deepest info for each multipv slot
                    if (!topMoves[pvIndex] || message.includes('depth') && topMoves[pvIndex].msgDepth !== undefined) {
                        // Extract depth from message
                        const depthMatch = message.match(/\bdepth\s+(\d+)/);
                        const msgDepth = depthMatch ? parseInt(depthMatch[1]) : 0;
                        if (!topMoves[pvIndex] || msgDepth >= topMoves[pvIndex].msgDepth) {
                            topMoves[pvIndex] = { pvIndex, scoreType, scoreVal, uciMove, msgDepth };
                        }
                    }
                }

                if (message.startsWith('bestmove')) {
                    resolved = true;
                    clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    // Reset MultiPV to 1 for normal operation
                    this.stockfish.postMessage('setoption name MultiPV value 1');

                    // Convert results to array and convert UCI to SAN
                    const results = [];
                    const sortedIndices = Object.keys(topMoves).sort((a, b) => a - b);
                    for (const idx of sortedIndices) {
                        const entry = topMoves[idx];
                        if (entry && entry.uciMove) {
                            const san = this.formatUCIToAlgebraic(entry.uciMove, fen);
                            results.push({
                                uci: entry.uciMove,
                                san: san,
                                scoreType: entry.scoreType,
                                scoreVal: entry.scoreVal
                            });
                        }
                    }
                    resolve(results);
                }
            };

            this.stockfish.addEventListener('message', listener);

            timeout = setTimeout(() => {
                if (resolved) return;
                resolved = true;
                console.warn('findTopMoves timed out at depth', depth);
                this.stockfish.removeEventListener('message', listener);
                this.stockfish.postMessage('setoption name MultiPV value 1');
                resolve([]);
            }, 15000);

            this.stockfish.postMessage(`setoption name MultiPV value ${numMoves}`);
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    async analyzeMove(move, fenBefore, fenAfter, moveIndex = -1) {
        const chessAtPosition = new Chess(fenBefore);
        const legalMoves = chessAtPosition.moves();
        const isGameOver = legalMoves.length === 0;
        const isForced = !isGameOver && legalMoves.length === 1;

        if (isGameOver) {
            return {
                move: move.san,
                classification: 'forced',
                description: 'Game already over — no legal moves available',
                suggestedMove: null,
                evalBefore: 0,
                evalAfter: 0,
                evalChange: 0
            };
        }

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

        const evalBefore = await this.evaluatePosition(fenBefore);
        const evalAfter = await this.evaluatePosition(fenAfter);

        const evalObjBefore = {
            type: evalBefore.type || 'cp',
            value: evalBefore.type === 'mate'
                ? (fenBefore.split(' ')[1] === 'w' ? evalBefore.value : -evalBefore.value)
                : evalBefore.score,
            sideToMove: evalBefore.sideToMove
        };
        const evalObjAfter = {
            type: evalAfter.type || 'cp',
            value: evalAfter.type === 'mate'
                ? (fenAfter.split(' ')[1] === 'w' ? evalAfter.value : -evalAfter.value)
                : evalAfter.score,
            sideToMove: evalAfter.sideToMove
        };

        const pointLoss = ChessAnalyzer.getExpectedPointsLoss(evalObjBefore, evalObjAfter, move.color);
        const evalDiff = evalAfter.score - evalBefore.score;
        const actualEvalChange = move.color === 'w' ? evalDiff : -evalDiff;

        // === MultiPV-based analysis ===
        const topMoves = await this.findTopMoves(fenBefore, 3, 15);
        const playerMoveSan = move.san;

        // Determine top moves ranking
        const topSanList = topMoves.map(tm => tm.san);
        const topMovePlayed = topMoves.length > 0 && topMoves[0].san === playerMoveSan;
        const playerMoveRank = topSanList.indexOf(playerMoveSan);

        // Find suggested move (the best alternative to player's move)
        let suggestedMove = null;
        if (playerMoveRank !== 0 && topMoves.length > 0) {
            suggestedMove = topMoves[0].san;
        }

        // === MultiPV missed checkmate detection ===
        const mateResult = ChessAnalyzer.detectMissedCheckmateMultiPV(topMoves, fenBefore);
        const missedCheckmate = mateResult.isCheckmate;

        // === MultiPV critical position detection ===
        const isCritical = ChessAnalyzer._isCriticalPositionMultiPV(topMoves, playerMoveSan, evalObjBefore, move.color);

        // === Improved brilliant move detection ===
        const isBrilliant = await ChessAnalyzer.isBrilliantPositionAsync(move, fenBefore, this.stockfish);

        // === Book move detection (FEN-based, transposition-aware) ===
        const isBook = this.detectBookMove(playerMoveSan, moveIndex, fenBefore, move);

        // === Game phase for dynamic thresholds ===
        const gamePhase = ChessAnalyzer._getGamePhase(fenBefore);

        const baseClassification = ChessAnalyzer.pointLossClassify(evalObjBefore, evalObjAfter, move.color, gamePhase);
        let classification;
        let description = '';

        if (isBook && pointLoss < 0.01) {
            classification = 'book';
            description = 'Book move — follows opening theory';
        } else if (missedCheckmate) {
            classification = 'missedWin';
            description = 'Missed win! You had a forced checkmate';
            if (mateResult.bestMove) description += `. Checkmate was: ${mateResult.bestMove}`;
        } else if (isBrilliant && topMovePlayed && pointLoss < 0.01) {
            classification = 'brilliant';
            description = 'Brilliant! Sound material sacrifice with winning follow-up';
        } else if (topMovePlayed && isCritical) {
            classification = 'critical';
            description = '! Critical move — only good move in the position';
        } else {
            // If player's move is in top 3 but not best, it's less serious
            // If the gap between the best and player's move is very small (< 30cp), downgrade
            if (playerMoveRank > 0 && playerMoveRank < topMoves.length) {
                const bestScore = ChessAnalyzer._topMoveScore(topMoves[0], fenBefore);
                const playerScore = ChessAnalyzer._topMoveScore(topMoves[playerMoveRank], fenBefore);
                const gap = move.color === 'w' ? (bestScore - playerScore) : (playerScore - bestScore);
                if (gap < 30 && baseClassification === 'blunder') {
                    classification = 'mistake';
                    description = '? Mistake (overstated — alternative was nearly as good)';
                    if (suggestedMove) description += `. Better was ${suggestedMove}`;
                } else if (gap < 60 && baseClassification === 'blunder') {
                    classification = 'mistake';
                    description = '? Mistake';
                    if (suggestedMove) description += `. Better was ${suggestedMove}`;
                } else if (gap < 30 && baseClassification === 'mistake') {
                    classification = 'inaccuracy';
                    description = '?! Inaccuracy (alternatives only slightly better)';
                    if (suggestedMove) description += `. Better was ${suggestedMove}`;
                } else {
                    classification = baseClassification;
                }
            } else {
                classification = baseClassification;
            }

            if (!description) {
                description = this._buildDescription(classification, '', suggestedMove, topMovePlayed);
            }
        }

        return {
            move: move.san,
            classification,
            description,
            suggestedMove,
            evalBefore: evalBefore.score,
            evalAfter: evalAfter.score,
            evalChange: actualEvalChange,
            topMoves: topMoves.slice(0, 3).map(tm => tm.san),
            gamePhase
        };
    }

    static _topMoveScore(topMove, fen) {
        if (topMove.scoreType === 'mate') {
            const sideToMove = fen.split(' ')[1];
            return topMove.scoreVal > 0 ? 10000 : -10000;
        }
        const sideToMove = fen.split(' ')[1];
        return sideToMove === 'b' ? -topMove.scoreVal : topMove.scoreVal;
    }

    _buildDescription(classification, currentDesc, suggestedMove, topMovePlayed) {
        let desc = currentDesc;
        switch (classification) {
            case 'best':
                desc = topMovePlayed ? 'Best move' : 'Excellent move';
                break;
            case 'excellent':
                desc = 'Excellent move';
                break;
            case 'okay':
                desc = 'Okay move';
                break;
            case 'inaccuracy':
                desc = '?! Inaccuracy';
                if (suggestedMove) desc += `. Better was ${suggestedMove}`;
                break;
            case 'mistake':
                desc = '? Mistake';
                if (suggestedMove) desc += `. Better was ${suggestedMove}`;
                break;
            case 'blunder':
                desc = '?? Blunder';
                if (suggestedMove) desc += `. Better was ${suggestedMove}`;
                break;
        }
        return desc;
    }

    /**
     * Critical position detection using MultiPV data.
     * A position is "critical" when the player's move is the only good one:
     * all top-3 alternatives are significantly worse (loss > threshold).
     */
    static _isCriticalPositionMultiPV(topMoves, playerMoveSan, evalObjBefore, moveColor) {
        if (!topMoves || topMoves.length < 2) return false;
        if (topMoves[0].san !== playerMoveSan) return false;

        const playerScore = ChessAnalyzer._scoreForClassification(topMoves[0], moveColor);

        // Check if alternatives are at least 150cp worse
        for (let i = 1; i < topMoves.length; i++) {
            const altScore = ChessAnalyzer._scoreForClassification(topMoves[i], moveColor);
            if (playerScore - altScore < 150) {
                return false; // There's an alternative that's almost as good
            }
        }
        return true; // All alternatives are significantly worse, this is critical
    }

    static _scoreForClassification(topMove, moveColor) {
        if (topMove.scoreType === 'mate') {
            return topMove.scoreVal > 0 ? 10000 : -10000;
        }
        return moveColor === 'w' ? topMove.scoreVal : -topMove.scoreVal;
    }

    /**
     * Detect missed checkmates using MultiPV data.
     * Checks ALL top moves for forced mate, not just the best one.
     */
    static detectMissedCheckmateMultiPV(topMoves, fenBefore) {
        if (!topMoves || topMoves.length === 0) {
            return { isCheckmate: false, bestMove: null, shortestMate: null };
        }

        let shortestMate = null;
        let shortestMateDepth = Infinity;
        let anyMateMove = null;

        for (const tm of topMoves) {
            if (tm.scoreType === 'mate') {
                const mateDepth = Math.abs(tm.scoreVal);
                if (tm.scoreVal > 0 && mateDepth < shortestMateDepth) {
                    // Positive mate = side to move can force mate
                    const tempChess = new Chess(fenBefore);
                    try {
                        const from = tm.uci.substring(0, 2);
                        const to = tm.uci.substring(2, 4);
                        const promotion = tm.uci.length > 4 ? tm.uci[4] : undefined;
                        const moveResult = tempChess.move({ from, to, promotion });
                        if (moveResult && tempChess.game_over() && tempChess.in_checkmate()) {
                            // Immediate checkmate
                            shortestMateDepth = 0;
                            shortestMate = moveResult.san;
                            anyMateMove = moveResult.san;
                        } else {
                            shortestMateDepth = mateDepth;
                            shortestMate = tm.san;
                            anyMateMove = tm.san;
                        }
                    } catch (e) {
                        shortestMateDepth = mateDepth;
                        shortestMate = tm.san;
                        anyMateMove = tm.san;
                    }
                }
            }
        }

        if (shortestMateDepth < Infinity) {
            return {
                isCheckmate: true,
                bestMove: shortestMate,
                shortestMateDepth
            };
        }

        return { isCheckmate: false, bestMove: null, shortestMate: null };
    }

    _isCriticalPosition(evalObjBefore, legalMoveCount, move) {
        const playerPerspective = move.color === 'w' ? evalObjBefore.value : -evalObjBefore.value;
        if (playerPerspective < -500) return true;
        if (legalMoveCount > 3) return false;
        if (playerPerspective > -150) return false;
        return true;
    }

    async findBestMove(fen, depth = 10) {
        let resolved = false;
        return new Promise((resolve) => {
            let timeout;

            const listener = (event) => {
                if (resolved) return;
                const message = event.data;
                if (message.startsWith('bestmove')) {
                    resolved = true;
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
                                resolve(this.formatUCIToAlgebraic(bestMove, fen));
                            }
                        } catch (error) {
                            resolve(this.formatUCIToAlgebraic(bestMove, fen));
                        }
                    } else {
                        resolve(null);
                    }
                }
            };

            this.stockfish.addEventListener('message', listener);

            timeout = setTimeout(() => {
                if (resolved) return;
                resolved = true;
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
                if (move && move.san) return move.san;
            } catch (e) {}
        }
        let algebraic = to;
        if (promotion) algebraic += '=' + promotion.toUpperCase();
        return algebraic;
    }

    async detectMissedCheckmate(fen, depth = 15) {
        let resolved = false;
        return new Promise((resolve) => {
            let timeout;
            const listener = (event) => {
                if (resolved) return;
                const message = event.data;
                if (message.startsWith('bestmove')) {
                    resolved = true;
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
                if (resolved) return;
                resolved = true;
                console.warn('detectMissedCheckmate timed out');
                this.stockfish.removeEventListener('message', listener);
                resolve({ isCheckmate: false, bestMove: null });
            }, 8000);
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    /**
     * FEN-based opening book detection with transposition support.
     * Builds a lazy index mapping board positions (FEN without move counters) to
     * the expected opening moves for that position. Catches transpositions:
     * different move orders arriving at the same position.
     */
    detectBookMove(moveSan, moveIndex, fenBefore, move) {
        // First, try the FEN-based position index (transposition-aware)
        if (!ChessAnalyzer._openingPositionIndex) {
            ChessAnalyzer._buildOpeningPositionIndex();
        }

        if (fenBefore) {
            const normalizedFen = ChessAnalyzer._normalizeFenForBook(fenBefore);
            const positionEntry = ChessAnalyzer._openingPositionIndex[normalizedFen];
            if (positionEntry) {
                const normalizedMove = moveSan.replace(/[+#]$/, '').toLowerCase();
                for (const entry of positionEntry) {
                    if (entry.move.toLowerCase() === normalizedMove) {
                        return true;
                    }
                }
            }
        }

        // Fall back to move-index-based lookup (original behavior)
        if (moveIndex < 0 || moveIndex > 14) return false;
        if (!moveSan) return false;
        if (!ChessAnalyzer._bookMoveIndex) {
            ChessAnalyzer._bookMoveIndex = {};
            const openings = Object.values(chessOpenings);
            for (const opening of openings) {
                if (!opening.moves || !Array.isArray(opening.moves)) continue;
                for (let i = 0; i < opening.moves.length; i++) {
                    if (!ChessAnalyzer._bookMoveIndex[i]) {
                        ChessAnalyzer._bookMoveIndex[i] = new Set();
                    }
                    ChessAnalyzer._bookMoveIndex[i].add(opening.moves[i].toLowerCase());
                }
            }
        }
        const normalizedMove = moveSan.replace(/[+#]$/, '').toLowerCase();
        const index = ChessAnalyzer._bookMoveIndex[moveIndex];
        if (index && index.has(normalizedMove)) return true;

        return false;
    }

    /**
     * Build a FEN-based position index for transposition-aware opening detection.
     * For each opening, play through the move sequence and record every position.
     */
    static _buildOpeningPositionIndex() {
        ChessAnalyzer._openingPositionIndex = {};
        const openings = Object.values(chessOpenings);
        for (const opening of openings) {
            if (!opening.moves || !Array.isArray(opening.moves)) continue;
            const chess = new Chess();
            for (let i = 0; i < opening.moves.length; i++) {
                try {
                    const moveObj = chess.move(opening.moves[i]);
                    if (!moveObj) break;
                    const fenKey = ChessAnalyzer._normalizeFenForBook(chess.fen());
                    if (!ChessAnalyzer._openingPositionIndex[fenKey]) {
                        ChessAnalyzer._openingPositionIndex[fenKey] = [];
                    }
                    // Record the next move from this position, or mark it as terminal
                    if (i + 1 < opening.moves.length) {
                        const nextMove = opening.moves[i + 1];
                        ChessAnalyzer._openingPositionIndex[fenKey].push({
                            opening: opening.name,
                            move: nextMove,
                            isTerminal: false
                        });
                    } else {
                        ChessAnalyzer._openingPositionIndex[fenKey].push({
                            opening: opening.name,
                            move: null,
                            isTerminal: true
                        });
                    }
                } catch (e) {
                    break;
                }
            }
        }
    }

    /**
     * Normalize a FEN for book lookup by stripping move counters
     * (the last two fields: halfmove clock and fullmove number).
     * Also strips en-passant and keeps castling availability and side to move.
     * This ensures positions match regardless of how many moves were played.
     */
    static _normalizeFenForBook(fen) {
        const parts = fen.split(' ');
        // Keep: board, sideToMove, castling, enPassant (first 4 fields)
        // Strip: halfmoveClock, fullmoveNumber (last 2 fields)
        return parts.slice(0, 4).join(' ');
    }

    /**
     * Improved brilliant move detection with follow-up verification.
     * After detecting a sacrifice, plays the forced capture sequence and
     * re-evaluates to confirm the position remains winning/equal.
     */
    static async isBrilliantPositionAsync(move, fenBefore, stockfish) {
        const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        if (!move || !move.from || !move.to || !move.color) return false;
        if (move.promotion) return false;

        const chess = new Chess(fenBefore);
        const opponentColor = move.color === 'w' ? 'b' : 'w';

        // Step 1: Check the piece was NOT already hanging (voluntary sacrifice)
        const beforeMoves = chess.moves({ verbose: true });
        let wasAttacked = false;
        for (const bm of beforeMoves) {
            if (bm.to === move.from && bm.color === opponentColor) {
                wasAttacked = true;
                break;
            }
        }
        if (wasAttacked) return false;

        // Step 2: Play the move
        chess.move({ from: move.from, to: move.to, promotion: move.promotion });

        // Step 3: Check if opponent can capture with a cheaper piece
        const afterMoves = chess.moves({ verbose: true });
        let bestAttacker = null;
        let bestAttackerValue = Infinity;
        for (const am of afterMoves) {
            if (am.to === move.to && am.color === opponentColor) {
                const attVal = pieceValues[am.piece] || 0;
                if (attVal < bestAttackerValue) {
                    bestAttacker = am;
                    bestAttackerValue = attVal;
                }
            }
        }
        if (!bestAttacker) return false;

        const movedValue = pieceValues[move.piece] || 0;
        if (movedValue <= bestAttackerValue) return false;

        // Step 4: Follow-up verification — play the capture and re-evaluate
        try {
            chess.move({ from: bestAttacker.from, to: bestAttacker.to });
            const fenAfterCapture = chess.fen();

            // Evaluate with Stockfish to confirm the position is still favorable
            const evaluator = new ChessAnalyzer(null, stockfish);
            const evalResult = await evaluator.evaluatePosition(fenAfterCapture, 14);
            const score = evalResult.type === 'mate'
                ? (evalResult.value > 0 ? 10000 : -10000)
                : evalResult.score;

            // For the sacrificing side:
            // Positive score = still better after the capture sequence
            const sideToMove = fenAfterCapture.split(' ')[1];
            const sacrificedColor = move.color;
            const isStillWinning = sacrificedColor === 'w'
                ? (sideToMove === 'b' ? -score : score) > -100
                : (sideToMove === 'b' ? -score : score) < 100;

            return isStillWinning;
        } catch (e) {
            // If evaluation fails, fall back to the static check
            return true;
        }
    }

    /**
     * Quick draw/fortress detection based on material analysis.
     * Checks if the remaining material is insufficient for checkmate
     * or forms a known fortress.
     */
    static _isDrawishEndgame(fenBefore, fenAfter) {
        const gFen = fenAfter || fenBefore;
        const fenParts = gFen.split(' ');
        const board = fenParts[0];

        const whitePieces = {};
        const blackPieces = {};
        let whitePawns = 0, blackPawns = 0;

        for (const ch of board) {
            if (ch === '/') continue;
            if (ch >= 'a' && ch <= 'z') {
                if (ch === 'p') blackPawns++;
                else blackPieces[ch] = (blackPieces[ch] || 0) + 1;
            } else if (ch >= 'A' && ch <= 'Z') {
                if (ch === 'P') whitePawns++;
                else whitePieces[ch.toLowerCase()] = (whitePieces[ch.toLowerCase()] || 0) + 1;
            }
        }

        const totalPieces = { w: whitePieces, b: blackPieces };
        const totalPawns = { w: whitePawns, b: blackPawns };

        // Helper: get material type summary
        const materialStr = (pieces) => {
            const entries = [];
            for (const [type, count] of Object.entries(pieces)) {
                for (let i = 0; i < count; i++) entries.push(type);
            }
            return entries.sort().join(',');
        };

        // Known insufficient material / fortress positions
        const wMat = materialStr(whitePieces);
        const bMat = materialStr(blackPieces);

        // No pawns
        if (whitePawns === 0 && blackPawns === 0) {
            // K vs K
            if (wMat === '' && bMat === '') return true;
            // K+B vs K
            if (wMat === 'b' && bMat === '') return true;
            if (wMat === '' && bMat === 'b') return true;
            // K+N vs K
            if (wMat === 'n' && bMat === '') return true;
            if (wMat === '' && bMat === 'n') return true;
            // K+B vs K+B (same color bishops) — simplified check
            if (wMat === 'b' && bMat === 'b') {
                // Check if bishops are on same color
                const wBishopSquare = ChessAnalyzer._findPieceSquare(board, 'b', 'w');
                const bBishopSquare = ChessAnalyzer._findPieceSquare(board, 'b', 'b');
                if (wBishopSquare && bBishopSquare) {
                    const wSquareColor = (wBishopSquare.charCodeAt(0) + parseInt(wBishopSquare[1])) % 2;
                    const bSquareColor = (bBishopSquare.charCodeAt(0) + parseInt(bBishopSquare[1])) % 2;
                    if (wSquareColor === bSquareColor) return true;
                }
            }
            // K+2N vs K (theoretical draw, cannot force mate with correct defense)
            if (wMat === 'n,n' && bMat === '') return true;
            if (wMat === '' && bMat === 'n,n') return true;
        }

        // K+R vs K+R (drawn with correct play, simplified check)
        if (whitePawns === 0 && blackPawns === 0) {
            if (wMat === 'r' && bMat === 'r') {
                // Typically drawn unless one king is badly positioned
                return true; // Simplified: most K+R vs K+R endgames are drawn
            }
        }

        return false;
    }

    static _findPieceSquare(board, pieceType, color) {
        const isWhite = color === 'w';
        const ranks = board.split('/');
        for (let rankIdx = 0; rankIdx < 8; rankIdx++) {
            let fileIdx = 0;
            for (const ch of ranks[rankIdx]) {
                if (ch >= '1' && ch <= '8') {
                    fileIdx += parseInt(ch);
                } else {
                    const upperCh = ch.toUpperCase();
                    if (upperCh === pieceType.toUpperCase()) {
                        const chIsWhite = ch === ch.toUpperCase();
                        if ((isWhite && chIsWhite) || (!isWhite && !chIsWhite)) {
                            const file = String.fromCharCode(97 + fileIdx);
                            const rank = 8 - rankIdx;
                            return file + rank;
                        }
                    }
                    fileIdx++;
                }
            }
        }
        return null;
    }

    static isBrilliantPosition(move, fenBefore) {
        const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        if (!move || !move.from || !move.to || !move.color) return false;
        const chess = new Chess(fenBefore);
        const opponentColor = move.color === 'w' ? 'b' : 'w';
        const beforeMoves = chess.moves({ verbose: true });
        for (const bm of beforeMoves) {
            if (bm.to === move.from && bm.color === opponentColor) {
                return false;
            }
        }
        chess.move({ from: move.from, to: move.to, promotion: move.promotion });
        const afterMoves = chess.moves({ verbose: true });
        let capturedByPiece = null;
        for (const am of afterMoves) {
            if (am.to === move.to && am.color === opponentColor) {
                if (!capturedByPiece || pieceValues[am.piece] < pieceValues[capturedByPiece]) {
                    capturedByPiece = am.piece;
                }
            }
        }
        if (!capturedByPiece) return false;
        const movedValue = pieceValues[move.piece] || 0;
        const attackerValue = pieceValues[capturedByPiece] || 0;
        if (movedValue <= attackerValue) return false;
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
        // Check for drawish endgame first — simplified blunder that leads to a fortress
        if (ChessAnalyzer._isDrawishEndgame(fenBefore, fenAfter)) {
            return false;
        }

        const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        const tempChess = new Chess(fenAfter);
        const opponentColor = move.color === 'w' ? 'b' : 'w';
        const playerColor = move.color;
        const opponentMoves = tempChess.moves({ verbose: true });

        let isHanging = false;
        let attackerValue = Infinity;
        for (const oppMove of opponentMoves) {
            if (oppMove.to === move.to && oppMove.color === opponentColor) {
                const attVal = pieceValues[oppMove.piece] || 0;
                const movedVal = pieceValues[move.piece] || 0;
                if (attVal <= movedVal && attVal < attackerValue) {
                    isHanging = true;
                    attackerValue = attVal;
                }
            }
        }
        if (!isHanging) return false;

        const playerMoves = tempChess.moves({ verbose: true });
        for (const pm of playerMoves) {
            if (pm.to === move.to && pm.color === playerColor) {
                return false;
            }
        }
        return true;
    }

    _getSimplifiedFEN(fen) {
        const parts = fen.split(' ');
        return parts.slice(0, 4).join(' ');
    }

    generateAnalysisReport(moveAnalyses) {
        const summary = {
            book: 0, forced: 0, best: 0, critical: 0, missedWin: 0,
            brilliant: 0, great: 0, excellent: 0, okay: 0, inaccuracy: 0,
            mistake: 0, blunder: 0, good: 0
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
