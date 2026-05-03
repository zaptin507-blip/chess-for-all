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
            // Parse side-to-move from FEN (2nd field) instead of using this.chess.turn()
            // which may not reflect the position being evaluated.
            const fenParts = fen.split(' ');
            const sideToMove = fenParts.length > 1 ? fenParts[1] : 'w';
            
            const listener = (event) => {
                const message = event.data;
                const match = message.match(/score cp (-?\d+)/);
                const mateMatch = message.match(/score mate (-?\d+)/);
                
                if (mateMatch) {
                    clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    resolve({ mate: parseInt(mateMatch[1]), score: parseInt(mateMatch[1]) > 0 ? 10000 : -10000 });
                } else if (match) {
                    const score = parseInt(match[1]);
                    clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    // Stockfish reports score from side-to-move perspective.
                    // Normalize so positive = white advantage.
                    resolve({ score: sideToMove === 'b' ? -score : score });
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

    async analyzeMove(move, fenBefore, fenAfter, moveIndex = -1) {
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
        const missedCheckmateResult = await this.detectMissedCheckmate(fenBefore);
        const missedCheckmate = missedCheckmateResult.isCheckmate;
        const isBook = this.detectBookMove(move.san, moveIndex);

        // Find the engine's best move with adaptive depth based on move quality.
        // For bad moves: deep analysis with retries to provide reliable suggested alternatives.
        // For good moves: shallow check to determine if the player found the engine's top choice (Best Move).
        if (missedCheckmate && missedCheckmateResult.bestMove) {
            // We already have the best move from missed-checkmate detection — no extra call needed
            suggestedMove = missedCheckmateResult.bestMove;
        } else if (actualEvalChange < -20 || isBlunderPiece || isHangingCapture) {
            // Bad move — deep analysis with retries for reliable suggestions
            console.log(`Finding best move for ${move.san} (eval change: ${actualEvalChange}, blunderPiece: ${isBlunderPiece}, hangingCapture: ${isHangingCapture})`);
            
            suggestedMove = await this.findBestMove(fenBefore, 15);
            
            if (!suggestedMove) {
                console.log('First attempt failed, trying again with depth 12...');
                suggestedMove = await this.findBestMove(fenBefore, 12);
            }
            
            if (!suggestedMove) {
                console.log('Second attempt failed, trying with depth 8...');
                suggestedMove = await this.findBestMove(fenBefore, 8);
            }
            
            console.log(`Magnus would play: ${suggestedMove || 'NO MOVE FOUND'}`);
        } else {
            // Good move — shallow check for Best Move classification
            suggestedMove = await this.findBestMove(fenBefore, 8);
        }

        // ====== PROPER CHESS.COM MOVE CLASSIFICATION ======
        
        // 0. BOOK MOVE (📖): Follows standard opening theory
        //    Checked first — a move can be both book AND good/great/excellent
        if (isBook && actualEvalChange >= -20) {
            // Book move that doesn't lose the position
            classification = 'book';
            description = '📖 Book move — follows opening theory';
        }
        // 1. BRILLIANT (!!): A good piece sacrifice that improves or maintains a winning position
        //    MUST be a sacrifice AND maintain/improve position
        else if (isSacrifice && actualEvalChange > -50) {
            // Sacrifice that doesn't lose eval (maintains or improves position)
            classification = 'brilliant';
            description = '!! Brilliant! Excellent sacrifice';
        }
        // 2. MISSED WIN (🎯): Had a clear checkmate but missed it
        else if (missedCheckmate) {
            classification = 'missedWin';
            description = '🎯 Missed win! You had a forced checkmate';
            if (suggestedMove) {
                description += `. Checkmate was: ${suggestedMove}`;
            }
        }
        // 3. BEST MOVE (★): The highest-rated move by the engine
        //    MUST be checked BEFORE blunder/inaccuracy/mistake.
        //    If the engine's top pick also loses evaluation, the position was simply
        //    lost and the player found the only reasonable continuation — not a blunder.
        else if (suggestedMove && suggestedMove === move.san) {
            // Player played the exact engine top choice
            classification = 'best';
            description = '★ Best move';
        }
        // 4. BLUNDER (??): Major mistakes - BE VERY STRICT
        //    - Lost 2+ pawns
        //    - OR blundered a piece (isBlunderPiece)
        //    - OR left a piece hanging (isHangingCapture) unless it's a sacrifice
        //    Only triggers when the player did NOT play the engine's best move (checked above).
        else if (actualEvalChange < -200 || isBlunderPiece || (isHangingCapture && !isSacrifice)) {
            classification = 'blunder';
            description = '?? Blunder!';
            if (suggestedMove) {
                description += `. Better was ${suggestedMove}`;
            }
        }
        // 5. GREAT (!): Critical moves that significantly impact the game
        //    - Turning losing to equal, or finding the only good move
        else if (actualEvalChange > 100 || (evalBefore.score < -100 && actualEvalChange > -50)) {
            // Either gained 1+ pawn OR was losing but found the only move to stay in game
            classification = 'great';
            description = '! Great move! Critical move found';
        }
        // 6. EXCELLENT: Very good move, close to the best move
        else if (actualEvalChange > 50 && actualEvalChange <= 100) {
            // Solid improvement, close to best
            classification = 'excellent';
            description = 'Excellent move';
        }
        // 7. GOOD: Solid move that maintains the position
        else if (actualEvalChange >= -20 && actualEvalChange <= 50) {
            // Small change, position maintained
            classification = 'good';
            description = 'Good move';
        }
        // 8. INACCURACY (?!): Slight advantage lost
        else if (actualEvalChange < -20 && actualEvalChange >= -80) {
            classification = 'inaccuracy';
            description = '?! Inaccuracy';
            if (suggestedMove) {
                description += `. Better was ${suggestedMove}`;
            }
        }
        // 9. MISTAKE (?): Significant advantage lost
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

    formatUCIToAlgebraic(uciMove, fen) {
        // Convert UCI format (e.g., "e2e4") to algebraic (e.g., "e4")
        // When FEN is provided, use chess.js for proper SAN conversion.
        if (!uciMove || uciMove.length < 4) return uciMove;
        
        const from = uciMove.substring(0, 2);
        const to = uciMove.substring(2, 4);
        const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
        
        // Try full chess.js conversion if FEN is available
        if (fen) {
            try {
                const tempChess = new Chess(fen);
                const move = tempChess.move({ from, to, promotion });
                if (move && move.san) {
                    return move.san;
                }
            } catch (e) {
                // Fall through to simple conversion below
            }
        }
        
        // Simple fallback conversion — just show the destination square
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
                        resolve({ 
                            isCheckmate: isCheckmate,
                            bestMove: moveResult ? moveResult.san : this.formatUCIToAlgebraic(bestMove, fen)
                        });
                    } else {
                        resolve({ isCheckmate: false, bestMove: null });
                    }
                }
            };

            this.stockfish.addEventListener('message', listener);
            
            // Add 8 second timeout
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
        // Only check book moves in the opening phase (first 15 moves)
        if (moveIndex < 0 || moveIndex > 14) return false;
        if (!moveSan) return false;
        
        // Normalize move for comparison (remove check/checkmate symbols)
        const normalizedMove = moveSan.replace(/[+#]$/, '');
        
        // Check against all openings in the database
        const openings = Object.values(chessOpenings);
        for (const opening of openings) {
            if (!opening.moves || !Array.isArray(opening.moves)) continue;
            // Check if this move index matches the opening's expected move
            if (moveIndex < opening.moves.length) {
                const expectedMove = opening.moves[moveIndex];
                // Compare case-insensitive, trim whitespace
                if (normalizedMove.toLowerCase() === expectedMove.toLowerCase()) {
                    return true;
                }
            }
        }
        return false;
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
            book: 0,
            best: 0,
            missedWin: 0,
            brilliant: 0,
            great: 0,
            excellent: 0,
            good: 0,
            inaccuracy: 0,
            mistake: 0,
            blunder: 0
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
