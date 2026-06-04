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
                // mate 0 = the side-to-move (evalObj.sideToMove) is checkmated.
                // The computing side (moveColour) gets 1 if they delivered the mate,
                // i.e. they are NOT the side-to-move. Fallback to 1 if unknown.
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

    static pointLossClassify(evalBefore, evalAfter, moveColor) {
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

        if (pointLoss < 0.01) return 'best';
        else if (pointLoss < 0.045) return 'excellent';
        else if (pointLoss < 0.08) return 'okay';
        else if (pointLoss < 0.12) return 'inaccuracy';
        else if (pointLoss < 0.22) return 'mistake';
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

        const isBrilliant = ChessAnalyzer.isBrilliantPosition(move, fenBefore);
        const missedCheckmateResult = await this.detectMissedCheckmate(fenBefore);
        const missedCheckmate = missedCheckmateResult.isCheckmate;
        const isBook = this.detectBookMove(move.san, moveIndex);

        const pointLoss = ChessAnalyzer.getExpectedPointsLoss(evalObjBefore, evalObjAfter, move.color);
        const evalDiff = evalAfter.score - evalBefore.score;
        const actualEvalChange = move.color === 'w' ? evalDiff : -evalDiff;

        let suggestedMove = null;

        if (missedCheckmate && missedCheckmateResult.bestMove) {
            suggestedMove = missedCheckmateResult.bestMove;
        } else if (pointLoss >= 0.01) {
            suggestedMove = await this.findBestMove(fenBefore, 15);
            if (!suggestedMove) suggestedMove = await this.findBestMove(fenBefore, 12);
            if (!suggestedMove) suggestedMove = await this.findBestMove(fenBefore, 8);
        } else {
            suggestedMove = await this.findBestMove(fenBefore, 8);
        }

        const topMovePlayed = suggestedMove && suggestedMove === move.san;

        const baseClassification = ChessAnalyzer.pointLossClassify(evalObjBefore, evalObjAfter, move.color);
        let classification;
        let description = '';

        if (isBook && pointLoss < 0.01) {
            classification = 'book';
            description = 'Book move — follows opening theory';
        } else if (missedCheckmate) {
            classification = 'missedWin';
            description = 'Missed win! You had a forced checkmate';
            if (suggestedMove) description += `. Checkmate was: ${suggestedMove}`;
        } else if (isBrilliant && topMovePlayed && pointLoss < 0.01) {
            classification = 'brilliant';
            description = 'Brilliant! Sound material sacrifice with winning follow-up';
        } else if (topMovePlayed && this._isCriticalPosition(evalObjBefore, legalMoves.length, move)) {
            classification = 'critical';
            description = '! Critical move — only good move in the position';
        } else {
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

    detectBookMove(moveSan, moveIndex) {
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
        return index ? index.has(normalizedMove) : false;
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
