class ChessAnalyzer {
    constructor(chessInstance, stockfish) {
        this.chess = chessInstance;
        this.stockfish = stockfish;
        this.moveHistory = [];
        this.evaluationHistory = [];
    }

    async evaluatePosition(fen, depth = 18) {
        return new Promise((resolve) => {
            let timeout;
            
            const listener = (event) => {
                const message = event.data;
                const match = message.match(/score cp (-?\d+)/);
                const mateMatch = message.match(/score mate (-?\d+)/);
                
                if (mateMatch) {
                    clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    resolve({ mate: parseInt(mateMatch[1]), score: mateMatch[1] > 0 ? 10000 : -10000 });
                } else if (match) {
                    const score = parseInt(match[1]);
                    clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    resolve({ score: this.chess.turn() === 'b' ? -score : score });
                }
            };

            this.stockfish.addEventListener('message', listener);
            
            // Add 10 second timeout to prevent hanging
            timeout = setTimeout(() => {
                console.warn('evaluatePosition timed out for FEN:', fen);
                this.stockfish.removeEventListener('message', listener);
                resolve({ score: 0 }); // Return neutral score on timeout
            }, 10000);
            
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    async analyzeMove(move, fenBefore, fenAfter) {
        const evalBefore = await this.evaluatePosition(fenBefore);
        const evalAfter = await this.evaluatePosition(fenAfter);

        const evalDiff = evalAfter.score - evalBefore.score;
        const isWhite = move.color === 'w';
        const actualEvalChange = isWhite ? evalDiff : -evalDiff;

        let classification = 'good';
        let description = 'Good move';
        let suggestedMove = null;

        const isSacrifice = this.detectSacrifice(move, fenAfter);
        const isHangingCapture = this.detectHangingCapture(move, fenBefore);
        const isBlunderPiece = this.detectBlunder(move, fenBefore, fenAfter);
        const missedCheckmate = await this.detectMissedCheckmate(fenBefore);

        // If it's a mistake, blunder, or inaccuracy, find the best move using Magnus-level analysis
        // Also check for blunder pieces or hanging captures that might be classified as blunders
        // Generate suggestions for any eval drop that could be improved
        if (actualEvalChange < -20 || missedCheckmate || isBlunderPiece || isHangingCapture) {
            console.log(`Finding best move for ${move.san} (eval change: ${actualEvalChange}, blunderPiece: ${isBlunderPiece}, hangingCapture: ${isHangingCapture})`);
            
            // Try multiple times to get a suggestion
            suggestedMove = await this.findBestMove(fenBefore, 15); // Use depth 15 for Magnus-level
            
            // If first attempt failed, try again with lower depth
            if (!suggestedMove) {
                console.log('First attempt failed, trying again with depth 12...');
                suggestedMove = await this.findBestMove(fenBefore, 12);
            }
            
            // If still no suggestion, try one more time with minimal depth
            if (!suggestedMove) {
                console.log('Second attempt failed, trying with depth 8...');
                suggestedMove = await this.findBestMove(fenBefore, 8);
            }
            
            console.log(`Magnus would play: ${suggestedMove || 'NO MOVE FOUND'}`);
        }

        // ====== PROPER CHESS.COM MOVE CLASSIFICATION ======
        
        // 1. BRILLIANT (!!): A good piece sacrifice that improves or maintains a winning position
        //    MUST be a sacrifice AND maintain/improve position
        if (isSacrifice && actualEvalChange > -50) {
            // Sacrifice that doesn't lose eval (maintains or improves position)
            classification = 'brilliant';
            description = '!! Brilliant! Excellent sacrifice';
        }
        // 2. BLUNDER (??): Major mistakes - BE VERY STRICT
        //    - Lost 2+ pawns
        //    - OR blundered a piece (isBlunderPiece)
        //    - OR left a piece hanging (isHangingCapture) unless it's a sacrifice
        else if (actualEvalChange < -200 || isBlunderPiece || (isHangingCapture && !isSacrifice)) {
            classification = 'blunder';
            description = '?? Blunder!';
            if (suggestedMove) {
                description += `. Better was ${suggestedMove}`;
            }
        }
        // 3. BEST MOVE (★): The highest-rated move by the engine
        else if (suggestedMove && suggestedMove === move.san) {
            // Player played the exact engine top choice
            classification = 'best';
            description = '★ Best move';
        }
        // 4. GREAT (!): Critical moves that significantly impact the game
        //    - Turning losing to equal, or finding the only good move
        else if (actualEvalChange > 100 || (evalBefore.score < -100 && actualEvalChange > -50)) {
            // Either gained 1+ pawn OR was losing but found the only move to stay in game
            classification = 'great';
            description = '! Great move! Critical move found';
        }
        // 5. EXCELLENT: Very good move, close to the best move
        else if (actualEvalChange > 50 && actualEvalChange <= 100) {
            // Solid improvement, close to best
            classification = 'excellent';
            description = 'Excellent move';
        }
        // 6. GOOD: Solid move that maintains the position
        else if (actualEvalChange >= -20 && actualEvalChange <= 50) {
            // Small change, position maintained
            classification = 'good';
            description = 'Good move';
        }
        // 7. INACCURACY (?!): Slight advantage lost
        else if (actualEvalChange < -20 && actualEvalChange >= -80) {
            classification = 'inaccuracy';
            description = '?! Inaccuracy';
            if (suggestedMove) {
                description += `. Better was ${suggestedMove}`;
            }
        }
        // 8. MISTAKE (?): Significant advantage lost
        else if (actualEvalChange < -80 && actualEvalChange >= -200) {
            classification = 'mistake';
            description = '? Mistake!';
            if (suggestedMove) {
                description += `. Better was ${suggestedMove}`;
            }
        }
        // Default
        else {
            classification = 'good';
            description = 'Good move';
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
                                // If move failed, return the UCI move formatted nicely
                                console.warn('Move conversion failed, using UCI format:', bestMove);
                                resolve(this.formatUCIToAlgebraic(bestMove));
                            }
                        } catch (error) {
                            console.error('Error converting move:', error, bestMove);
                            resolve(this.formatUCIToAlgebraic(bestMove));
                        }
                    } else {
                        resolve(null);
                    }
                }
            };

            this.stockfish.addEventListener('message', listener);
            
            // 5 second timeout (increased from 3)
            timeout = setTimeout(() => {
                console.warn('findBestMove timed out at depth', depth);
                this.stockfish.removeEventListener('message', listener);
                resolve(null);
            }, 5000);
            
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    formatUCIToAlgebraic(uciMove) {
        // Convert UCI format (e.g., "e2e4") to algebraic (e.g., "e4")
        if (!uciMove || uciMove.length < 4) return uciMove;
        
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : null;
        
        // Simple conversion - just show the destination square
        // This isn't perfect but better than showing raw UCI
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
                        
                        // Play the best move and check if it's checkmate
                        const tempChess = new Chess(fen);
                        const moveResult = tempChess.move({ from, to, promotion });
                        
                        // Check if the move resulted in checkmate
                        const isCheckmate = moveResult && tempChess.game_over() && tempChess.in_checkmate();
                        resolve(isCheckmate);
                    } else {
                        resolve(false);
                    }
                }
            };

            this.stockfish.addEventListener('message', listener);
            
            // Add 8 second timeout
            timeout = setTimeout(() => {
                console.warn('detectMissedCheckmate timed out');
                this.stockfish.removeEventListener('message', listener);
                resolve(false);
            }, 8000);
            
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    detectSacrifice(move, fenAfter) {
        const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        
        if (move.captured) {
            return false;
        }

        const tempChess = new Chess(fenAfter);
        const opponentMoves = tempChess.moves({ verbose: true });
        
        for (const oppMove of opponentMoves) {
            if (oppMove.to === move.to && pieceValues[oppMove.piece] < pieceValues[move.piece]) {
                return true;
            }
        }

        return false;
    }

    detectHangingCapture(move, fenBefore) {
        if (!move.captured) {
            return false;
        }

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
        
        if (move.captured) {
            return false;
        }

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
            best: 0,
            missedWin: 0,
            brilliant: 0,
            great: 0,
            inaccuracy: 0,
            mistake: 0,
            blunder: 0,
            good: 0
        };

        moveAnalyses.forEach(analysis => {
            summary[analysis.classification]++;
        });

        return summary;
    }
}
