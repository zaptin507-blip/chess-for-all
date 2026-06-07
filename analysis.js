class ChessAnalyzer {
    constructor(chessInstance, stockfish) {
        this.chess = chessInstance;
        this.stockfish = stockfish;
        this.moveHistory = [];
        this.evaluationHistory = [];
    }

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

    /* Estimate game phase 0.0 (opening) → 1.0 (endgame) from non-pawn material */
    static _getGamePhase(fen) {
        const board = fen.split(' ')[0];
        let totalMaterial = 0;
        for (const ch of board) {
            switch (ch) {
                case 'n': case 'b': case 'N': case 'B': totalMaterial += 3; break;
                case 'r': case 'R': totalMaterial += 5; break;
                case 'q': case 'Q': totalMaterial += 9; break;
            }
        }
        return Math.max(0, Math.min(1, (40 - totalMaterial) / 34));
    }

    /**
     * Estimate time budget (ms) for Stockfish search based on position complexity.
     * Simple endgame (~3s) → complex middlegame (~12s).
     */
    static _estimateSearchBudget(fen) {
        const board = fen.split(' ')[0];
        let pieceCount = 0;
        for (const ch of board) {
            if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z')) pieceCount++;
        }
        let legalCount = 0, tacticalCount = 0;
        try {
            const chess = new Chess(fen);
            const moves = chess.moves({ verbose: true });
            legalCount = moves.length;
            for (const m of moves) {
                if (m.captured) tacticalCount += 3;
                if (m.flags && (m.flags.includes('k') || m.flags.includes('q'))) tacticalCount += 2;
            }
            if (chess.in_check()) tacticalCount += 3;
            if (chess.in_draw()) legalCount = Math.min(legalCount, 5);
        } catch (e) { legalCount = 35; }
        const complexity = Math.min(2500, legalCount * 50) + Math.min(2000, pieceCount * 70) + Math.min(3000, tacticalCount * 60);
        return Math.min(12000, Math.max(3000, complexity));
    }

    /* Move classification with game-phase-aware thresholds */
    static pointLossClassify(evalBefore, evalAfter, moveColor, gamePhase = 0) {
        const subjectiveValueBefore = evalBefore.value * (moveColor === 'w' ? 1 : -1);
        const subjectiveValueAfter = evalAfter.value * (moveColor === 'w' ? 1 : -1);

        if (evalBefore.type === 'mate' && evalAfter.type === 'mate') {
            if (subjectiveValueBefore > 0 && subjectiveValueAfter < 0) {
                return subjectiveValueAfter < -3 ? 'mistake' : 'blunder';
            }
            const mateLoss = (evalAfter.value - evalBefore.value) * (moveColor === 'w' ? 1 : -1);
            if (mateLoss < 0 || (mateLoss === 0 && subjectiveValueAfter < 0)) return 'best';
            else if (mateLoss < 2) return 'excellent';
            else if (mateLoss < 7) return 'okay';
            else return 'inaccuracy';
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
            const sideToMove = fen.split(' ').length > 1 ? fen.split(' ')[1] : 'w';
            const listener = (event) => {
                if (resolved) return;
                const message = event.data;
                const match = message.match(/score cp (-?\d+)/);
                const mateMatch = message.match(/score mate (-?\d+)/);
                if (mateMatch) {
                    resolved = true; clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    const mateVal = parseInt(mateMatch[1]);
                    resolve({ type: 'mate', value: mateVal, sideToMove, score: mateVal > 0 ? 10000 : -10000 });
                } else if (match) {
                    const rawScore = parseInt(match[1]);
                    resolved = true; clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    resolve({ type: 'cp', value: sideToMove === 'b' ? -rawScore : rawScore, score: sideToMove === 'b' ? -rawScore : rawScore });
                }
            };
            this.stockfish.addEventListener('message', listener);
            timeout = setTimeout(() => {
                if (resolved) return;
                resolved = true;
                this.stockfish.removeEventListener('message', listener);
                resolve({ type: 'cp', value: 0, score: 0 });
            }, 10000);
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    /* Find top N moves using Stockfish MultiPV mode (fixed depth) */
    async findTopMoves(fen, numMoves = 3, depth = 15) {
        let resolved = false;
        return new Promise((resolve) => {
            const topMoves = {};
            let timeout;
            const listener = (event) => {
                if (resolved) return;
                const message = event.data;
                const pvMatch = message.match(/^info.*multipv\s+(\d+).*?score\s+(cp|mate)\s+(-?\d+)(?:.*?pv\s+(\S+))?/);
                if (pvMatch) {
                    const pvIndex = parseInt(pvMatch[1]);
                    const scoreType = pvMatch[2];
                    const scoreVal = parseInt(pvMatch[3]);
                    const uciMove = pvMatch[4] || '';
                    if (!topMoves[pvIndex] || (message.includes('depth') && topMoves[pvIndex].msgDepth !== undefined)) {
                        const dm = message.match(/\bdepth\s+(\d+)/);
                        const msgDepth = dm ? parseInt(dm[1]) : 0;
                        if (!topMoves[pvIndex] || msgDepth >= topMoves[pvIndex].msgDepth) {
                            topMoves[pvIndex] = { pvIndex, scoreType, scoreVal, uciMove, msgDepth };
                        }
                    }
                }
                if (message.startsWith('bestmove')) {
                    resolved = true; clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    this.stockfish.postMessage('setoption name MultiPV value 1');
                    const results = [];
                    const sortedIndices = Object.keys(topMoves).sort((a, b) => a - b);
                    for (const idx of sortedIndices) {
                        const entry = topMoves[idx];
                        if (entry && entry.uciMove) {
                            results.push({ uci: entry.uciMove, san: this.formatUCIToAlgebraic(entry.uciMove, fen), scoreType: entry.scoreType, scoreVal: entry.scoreVal });
                        }
                    }
                    resolve(results);
                }
            };
            this.stockfish.addEventListener('message', listener);
            timeout = setTimeout(() => {
                if (resolved) return;
                resolved = true;
                this.stockfish.removeEventListener('message', listener);
                this.stockfish.postMessage('setoption name MultiPV value 1');
                resolve([]);
            }, 15000);
            this.stockfish.postMessage(`setoption name MultiPV value ${numMoves}`);
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    /**
     * Adaptive MultiPV search using time-bounded Stockfish analysis.
     * Uses `go movetime` with a budget from _estimateSearchBudget so
     * Stockfish naturally searches deeper in simple positions (few pieces,
     * few moves) and wider in complex tactical positions.
     */
    async findTopMovesAdaptive(fen, numMoves = 3) {
        const budget = ChessAnalyzer._estimateSearchBudget(fen);
        let resolved = false;
        return new Promise((resolve) => {
            const topMoves = {};
            let timeout, finalDepth = 0;
            const listener = (event) => {
                if (resolved) return;
                const message = event.data;
                const pvMatch = message.match(/^info.*multipv\s+(\d+).*?score\s+(cp|mate)\s+(-?\d+)(?:.*?pv\s+(\S+))?/);
                if (pvMatch) {
                    const pvIndex = parseInt(pvMatch[1]), scoreType = pvMatch[2], scoreVal = parseInt(pvMatch[3]), uciMove = pvMatch[4] || '';
                    if (!topMoves[pvIndex] || (message.includes('depth') && topMoves[pvIndex].msgDepth !== undefined)) {
                        const dm = message.match(/\bdepth\s+(\d+)/);
                        const msgDepth = dm ? parseInt(dm[1]) : 0;
                        if (!topMoves[pvIndex] || msgDepth >= topMoves[pvIndex].msgDepth) {
                            topMoves[pvIndex] = { pvIndex, scoreType, scoreVal, uciMove, msgDepth };
                            if (msgDepth > finalDepth) finalDepth = msgDepth;
                        }
                    }
                }
                if (message.startsWith('bestmove')) {
                    resolved = true; clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    this.stockfish.postMessage('setoption name MultiPV value 1');
                    const results = [];
                    for (const idx of Object.keys(topMoves).sort((a, b) => a - b)) {
                        const entry = topMoves[idx];
                        if (entry && entry.uciMove) {
                            results.push({ uci: entry.uciMove, san: this.formatUCIToAlgebraic(entry.uciMove, fen), scoreType: entry.scoreType, scoreVal: entry.scoreVal, depth: entry.msgDepth || finalDepth });
                        }
                    }
                    resolve(results);
                }
            };
            this.stockfish.addEventListener('message', listener);
            timeout = setTimeout(() => {
                if (resolved) return;
                resolved = true;
                this.stockfish.removeEventListener('message', listener);
                this.stockfish.postMessage('setoption name MultiPV value 1');
                resolve([]);
            }, Math.min(20000, Math.ceil(budget * 1.2)));
            this.stockfish.postMessage(`setoption name MultiPV value ${numMoves}`);
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go movetime ${budget}`);
        });
    }

    async analyzeMove(move, fenBefore, fenAfter, moveIndex = -1) {
        const chessAtPosition = new Chess(fenBefore);
        const legalMoves = chessAtPosition.moves();
        const isGameOver = legalMoves.length === 0;
        const isForced = !isGameOver && legalMoves.length === 1;

        if (isGameOver) {
            return { move: move.san, classification: 'forced', description: 'Game already over — no legal moves available', suggestedMove: null, evalBefore: 0, evalAfter: 0, evalChange: 0 };
        }
        if (isForced) {
            return { move: move.san, classification: 'forced', description: 'Forced move — only legal option', suggestedMove: null, evalBefore: 0, evalAfter: 0, evalChange: 0 };
        }

        const evalBefore = await this.evaluatePosition(fenBefore);
        const evalAfter = await this.evaluatePosition(fenAfter);

        const evalObjBefore = {
            type: evalBefore.type || 'cp',
            value: evalBefore.type === 'mate' ? (fenBefore.split(' ')[1] === 'w' ? evalBefore.value : -evalBefore.value) : evalBefore.score,
            sideToMove: evalBefore.sideToMove
        };
        const evalObjAfter = {
            type: evalAfter.type || 'cp',
            value: evalAfter.type === 'mate' ? (fenAfter.split(' ')[1] === 'w' ? evalAfter.value : -evalAfter.value) : evalAfter.score,
            sideToMove: evalAfter.sideToMove
        };

        const pointLoss = ChessAnalyzer.getExpectedPointsLoss(evalObjBefore, evalObjAfter, move.color);
        const actualEvalChange = move.color === 'w' ? (evalAfter.score - evalBefore.score) : -(evalAfter.score - evalBefore.score);

        // Adaptive MultiPV — time-budgeted, deeper on simple positions
        const topMoves = await this.findTopMovesAdaptive(fenBefore, 3);
        const playerMoveSan = move.san;
        const topSanList = topMoves.map(tm => tm.san);
        const topMovePlayed = topMoves.length > 0 && topMoves[0].san === playerMoveSan;
        const playerMoveRank = topSanList.indexOf(playerMoveSan);

        let suggestedMove = null;
        if (playerMoveRank !== 0 && topMoves.length > 0) suggestedMove = topMoves[0].san;

        const mateResult = ChessAnalyzer.detectMissedCheckmateMultiPV(topMoves, fenBefore);
        const isCritical = ChessAnalyzer._isCriticalPositionMultiPV(topMoves, playerMoveSan, evalObjBefore, move.color);
        const isBrilliant = await ChessAnalyzer.isBrilliantPositionAsync(move, fenBefore, this.stockfish);
        const isBook = this.detectBookMove(playerMoveSan, moveIndex, fenBefore, move);
        const gamePhase = ChessAnalyzer._getGamePhase(fenBefore);
        const baseClassification = ChessAnalyzer.pointLossClassify(evalObjBefore, evalObjAfter, move.color, gamePhase);
        let classification, description = '';

        if (isBook && pointLoss < 0.01) {
            classification = 'book';
            description = 'Book move — follows opening theory';
        } else if (mateResult.isCheckmate) {
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
            if (!description) description = this._buildDescription(classification, '', suggestedMove, topMovePlayed);
        }

        return {
            move: move.san, classification, description, suggestedMove,
            evalBefore: evalBefore.score, evalAfter: evalAfter.score, evalChange: actualEvalChange,
            topMoves: topMoves.slice(0, 3).map(tm => tm.san), gamePhase
        };
    }

    static _topMoveScore(topMove, fen) {
        if (topMove.scoreType === 'mate') return topMove.scoreVal > 0 ? 10000 : -10000;
        const sideToMove = fen.split(' ')[1];
        return sideToMove === 'b' ? -topMove.scoreVal : topMove.scoreVal;
    }

    _buildDescription(classification, currentDesc, suggestedMove, topMovePlayed) {
        let desc = currentDesc;
        switch (classification) {
            case 'best': desc = topMovePlayed ? 'Best move' : 'Excellent move'; break;
            case 'excellent': desc = 'Excellent move'; break;
            case 'okay': desc = 'Okay move'; break;
            case 'inaccuracy': desc = '?! Inaccuracy'; if (suggestedMove) desc += `. Better was ${suggestedMove}`; break;
            case 'mistake': desc = '? Mistake'; if (suggestedMove) desc += `. Better was ${suggestedMove}`; break;
            case 'blunder': desc = '?? Blunder'; if (suggestedMove) desc += `. Better was ${suggestedMove}`; break;
        }
        return desc;
    }

    /* Critical when player's move is the only good one: all top-3 alternatives are >=150cp worse */
    static _isCriticalPositionMultiPV(topMoves, playerMoveSan, evalObjBefore, moveColor) {
        if (!topMoves || topMoves.length < 2) return false;
        if (topMoves[0].san !== playerMoveSan) return false;
        const playerScore = ChessAnalyzer._scoreForClassification(topMoves[0], moveColor);
        for (let i = 1; i < topMoves.length; i++) {
            if (playerScore - ChessAnalyzer._scoreForClassification(topMoves[i], moveColor) < 150) return false;
        }
        return true;
    }

    static _scoreForClassification(topMove, moveColor) {
        if (topMove.scoreType === 'mate') return topMove.scoreVal > 0 ? 10000 : -10000;
        return moveColor === 'w' ? topMove.scoreVal : -topMove.scoreVal;
    }

    /* Missed checkmate detection: checks ALL top moves, not just the best */
    static detectMissedCheckmateMultiPV(topMoves, fenBefore) {
        if (!topMoves || topMoves.length === 0) return { isCheckmate: false, bestMove: null, shortestMate: null };
        let shortestMate = null, shortestMateDepth = Infinity;
        for (const tm of topMoves) {
            if (tm.scoreType === 'mate' && tm.scoreVal > 0) {
                const mateDepth = Math.abs(tm.scoreVal);
                if (mateDepth < shortestMateDepth) {
                    try {
                        const chess = new Chess(fenBefore);
                        const from = tm.uci.substring(0, 2), to = tm.uci.substring(2, 4);
                        const promotion = tm.uci.length > 4 ? tm.uci[4] : undefined;
                        const mr = chess.move({ from, to, promotion });
                        if (mr && chess.game_over() && chess.in_checkmate()) {
                            shortestMateDepth = 0; shortestMate = mr.san;
                        } else {
                            shortestMateDepth = mateDepth; shortestMate = tm.san;
                        }
                    } catch (e) { shortestMateDepth = mateDepth; shortestMate = tm.san; }
                }
            }
        }
        if (shortestMateDepth < Infinity) return { isCheckmate: true, bestMove: shortestMate, shortestMateDepth };
        return { isCheckmate: false, bestMove: null, shortestMate: null };
    }

    _isCriticalPosition(evalObjBefore, legalMoveCount, move) {
        const pp = move.color === 'w' ? evalObjBefore.value : -evalObjBefore.value;
        if (pp < -500) return true;
        if (legalMoveCount > 3) return false;
        if (pp > -150) return false;
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
                    resolved = true; clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    const match = message.match(/^bestmove\s+(\S+)/);
                    if (match && match[1] !== '(none)') {
                        const bm = match[1];
                        try {
                            const chess = new Chess(fen);
                            const m = chess.move({ from: bm.substring(0, 2), to: bm.substring(2, 4), promotion: bm.length > 4 ? bm[4] : undefined });
                            resolve(m && m.san ? m.san : this.formatUCIToAlgebraic(bm, fen));
                        } catch (e) { resolve(this.formatUCIToAlgebraic(bm, fen)); }
                    } else { resolve(null); }
                }
            };
            this.stockfish.addEventListener('message', listener);
            timeout = setTimeout(() => {
                if (resolved) return;
                resolved = true;
                this.stockfish.removeEventListener('message', listener);
                resolve(null);
            }, 5000);
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    formatUCIToAlgebraic(uciMove, fen) {
        if (!uciMove || uciMove.length < 4) return uciMove;
        const from = uciMove.substring(0, 2), to = uciMove.substring(2, 4), promotion = uciMove.length > 4 ? uciMove[4] : undefined;
        if (fen) {
            try { const chess = new Chess(fen); const m = chess.move({ from, to, promotion }); if (m && m.san) return m.san; } catch (e) {}
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
                    resolved = true; clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    const match = message.match(/^bestmove\s+(\S+)/);
                    if (match && match[1] !== '(none)') {
                        const bm = match[1];
                        const chess = new Chess(fen);
                        const mr = chess.move({ from: bm.substring(0, 2), to: bm.substring(2, 4), promotion: bm.length > 4 ? bm[4] : undefined });
                        resolve({ isCheckmate: mr && chess.game_over() && chess.in_checkmate(), bestMove: mr ? mr.san : this.formatUCIToAlgebraic(bm, fen) });
                    } else { resolve({ isCheckmate: false, bestMove: null }); }
                }
            };
            this.stockfish.addEventListener('message', listener);
            timeout = setTimeout(() => {
                if (resolved) return;
                resolved = true;
                this.stockfish.removeEventListener('message', listener);
                resolve({ isCheckmate: false, bestMove: null });
            }, 8000);
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    /* FEN-based opening book detection with transposition support */
    detectBookMove(moveSan, moveIndex, fenBefore, move) {
        if (!ChessAnalyzer._openingPositionIndex) ChessAnalyzer._buildOpeningPositionIndex();
        if (fenBefore) {
            const normalizedFen = ChessAnalyzer._normalizeFenForBook(fenBefore);
            const positionEntry = ChessAnalyzer._openingPositionIndex[normalizedFen];
            if (positionEntry) {
                const normalizedMove = moveSan.replace(/[+#]$/, '').toLowerCase();
                for (const entry of positionEntry) {
                    if (entry.move && entry.move.toLowerCase() === normalizedMove) return true;
                }
            }
        }
        if (moveIndex < 0 || moveIndex > 14 || !moveSan) return false;
        if (!ChessAnalyzer._bookMoveIndex) {
            ChessAnalyzer._bookMoveIndex = {};
            for (const opening of Object.values(chessOpenings)) {
                if (!opening.moves || !Array.isArray(opening.moves)) continue;
                for (let i = 0; i < opening.moves.length; i++) {
                    if (!ChessAnalyzer._bookMoveIndex[i]) ChessAnalyzer._bookMoveIndex[i] = new Set();
                    ChessAnalyzer._bookMoveIndex[i].add(opening.moves[i].toLowerCase());
                }
            }
        }
        const idx = ChessAnalyzer._bookMoveIndex[moveIndex];
        return idx ? idx.has(moveSan.replace(/[+#]$/, '').toLowerCase()) : false;
    }

    static _buildOpeningPositionIndex() {
        ChessAnalyzer._openingPositionIndex = {};
        for (const opening of Object.values(chessOpenings)) {
            if (!opening.moves || !Array.isArray(opening.moves)) continue;
            const chess = new Chess();
            for (let i = 0; i < opening.moves.length; i++) {
                try {
                    if (!chess.move(opening.moves[i])) break;
                    const fenKey = ChessAnalyzer._normalizeFenForBook(chess.fen());
                    if (!ChessAnalyzer._openingPositionIndex[fenKey]) ChessAnalyzer._openingPositionIndex[fenKey] = [];
                    ChessAnalyzer._openingPositionIndex[fenKey].push({
                        opening: opening.name,
                        move: i + 1 < opening.moves.length ? opening.moves[i + 1] : null,
                        isTerminal: i + 1 >= opening.moves.length
                    });
                } catch (e) { break; }
            }
        }
    }

    static _normalizeFenForBook(fen) {
        return fen.split(' ').slice(0, 4).join(' ');
    }

    /* Brilliant move detection with follow-up verification via Stockfish */
    static async isBrilliantPositionAsync(move, fenBefore, stockfish) {
        const pv = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        if (!move || !move.from || !move.to || !move.color || move.promotion) return false;
        const chess = new Chess(fenBefore);
        const opponentColor = move.color === 'w' ? 'b' : 'w';
        const beforeMoves = chess.moves({ verbose: true });
        for (const bm of beforeMoves) { if (bm.to === move.from && bm.color === opponentColor) return false; }
        chess.move({ from: move.from, to: move.to, promotion: move.promotion });
        const afterMoves = chess.moves({ verbose: true });
        let bestAttacker = null, bestAttackerValue = Infinity;
        for (const am of afterMoves) {
            if (am.to === move.to && am.color === opponentColor) {
                const av = pv[am.piece] || 0;
                if (av < bestAttackerValue) { bestAttacker = am; bestAttackerValue = av; }
            }
        }
        if (!bestAttacker || (pv[move.piece] || 0) <= bestAttackerValue) return false;
        try {
            chess.move({ from: bestAttacker.from, to: bestAttacker.to });
            const evaluator = new ChessAnalyzer(null, stockfish);
            const er = await evaluator.evaluatePosition(chess.fen(), 14);
            const score = er.type === 'mate' ? (er.value > 0 ? 10000 : -10000) : er.score;
            const stm = chess.fen().split(' ')[1];
            return move.color === 'w' ? (stm === 'b' ? -score : score) > -100 : (stm === 'b' ? -score : score) < 100;
        } catch (e) { return true; }
    }

    /* Draw/fortress detection based on insufficient material */
    static _isDrawishEndgame(fenBefore, fenAfter) {
        const board = (fenAfter || fenBefore).split(' ')[0];
        const whitePieces = {}, blackPieces = {};
        let wp = 0, bp = 0;
        for (const ch of board) {
            if (ch === '/') continue;
            if (ch >= 'a' && ch <= 'z') { if (ch === 'p') bp++; else blackPieces[ch] = (blackPieces[ch] || 0) + 1; }
            else if (ch >= 'A' && ch <= 'Z') { if (ch === 'P') wp++; else whitePieces[ch.toLowerCase()] = (whitePieces[ch.toLowerCase()] || 0) + 1; }
        }
        if (wp > 0 || bp > 0) return false;
        const mat = (p) => Object.entries(p).flatMap(([t, c]) => Array(c).fill(t)).sort().join(',');
        const wm = mat(whitePieces), bm = mat(blackPieces);
        if (wm === '' && bm === '') return true;
        if ((wm === 'b' && bm === '') || (wm === '' && bm === 'b')) return true;
        if ((wm === 'n' && bm === '') || (wm === '' && bm === 'n')) return true;
        if ((wm === 'n,n' && bm === '') || (wm === '' && bm === 'n,n')) return true;
        if (wm === 'b' && bm === 'b') {
            const wbs = ChessAnalyzer._findPieceSquare(board, 'b', 'w');
            const bbs = ChessAnalyzer._findPieceSquare(board, 'b', 'b');
            if (wbs && bbs && ((wbs.charCodeAt(0) + parseInt(wbs[1])) % 2) === ((bbs.charCodeAt(0) + parseInt(bbs[1])) % 2)) return true;
        }
        if (wm === 'r' && bm === 'r') return true;
        return false;
    }

    static _findPieceSquare(board, pieceType, color) {
        const isWhite = color === 'w';
        const ranks = board.split('/');
        for (let ri = 0; ri < 8; ri++) {
            let fi = 0;
            for (const ch of ranks[ri]) {
                if (ch >= '1' && ch <= '8') fi += parseInt(ch);
                else {
                    if (ch.toUpperCase() === pieceType.toUpperCase() && ((isWhite && ch === ch.toUpperCase()) || (!isWhite && ch !== ch.toUpperCase()))) {
                        return String.fromCharCode(97 + fi) + (8 - ri);
                    }
                    fi++;
                }
            }
        }
        return null;
    }

    static isBrilliantPosition(move, fenBefore) {
        const pv = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        if (!move || !move.from || !move.to || !move.color) return false;
        const chess = new Chess(fenBefore);
        const oppColor = move.color === 'w' ? 'b' : 'w';
        for (const bm of chess.moves({ verbose: true })) { if (bm.to === move.from && bm.color === oppColor) return false; }
        chess.move({ from: move.from, to: move.to, promotion: move.promotion });
        let cap = null, capVal = Infinity;
        for (const am of chess.moves({ verbose: true })) {
            if (am.to === move.to && am.color === oppColor) {
                const av = pv[am.piece] || 0;
                if (av < capVal) { cap = am.piece; capVal = av; }
            }
        }
        if (!cap || (pv[move.piece] || 0) <= capVal || move.promotion) return false;
        return true;
    }

    detectHangingCapture(move, fenBefore) {
        if (!move.captured) return false;
        const chess = new Chess(fenBefore);
        const oppColor = move.color === 'w' ? 'b' : 'w';
        for (const om of chess.moves({ verbose: true })) { if (om.to === move.to && om.color === oppColor) return false; }
        return true;
    }

    detectBlunder(move, fenBefore, fenAfter) {
        if (ChessAnalyzer._isDrawishEndgame(fenBefore, fenAfter)) return false;
        const pv = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        const chess = new Chess(fenAfter);
        const oppColor = move.color === 'w' ? 'b' : 'w', playerColor = move.color;
        let hanging = false, attVal = Infinity;
        for (const om of chess.moves({ verbose: true })) {
            if (om.to === move.to && om.color === oppColor) {
                const av = pv[om.piece] || 0, mv = pv[move.piece] || 0;
                if (av <= mv && av < attVal) { hanging = true; attVal = av; }
            }
        }
        if (!hanging) return false;
        for (const pm of chess.moves({ verbose: true })) { if (pm.to === move.to && pm.color === playerColor) return false; }
        return true;
    }

    generateAnalysisReport(moveAnalyses) {
        const summary = { book: 0, forced: 0, best: 0, critical: 0, missedWin: 0, brilliant: 0, great: 0, excellent: 0, okay: 0, inaccuracy: 0, mistake: 0, blunder: 0, good: 0 };
        moveAnalyses.forEach(a => { if (summary.hasOwnProperty(a.classification)) summary[a.classification]++; else summary.good++; });
        return summary;
    }
}
