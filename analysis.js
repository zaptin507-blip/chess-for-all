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

    /** Estimate game phase 0.0 (opening) → 1.0 (endgame) from non-pawn material */
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

    /** Move classification with game-phase-aware thresholds */
    static pointLossClassify(evalBefore, evalAfter, moveColor, gamePhase = 0) {
        const svBefore = evalBefore.value * (moveColor === 'w' ? 1 : -1);
        const svAfter = evalAfter.value * (moveColor === 'w' ? 1 : -1);

        if (evalBefore.type === 'mate' && evalAfter.type === 'mate') {
            if (svBefore > 0 && svAfter < 0) return svAfter < -3 ? 'mistake' : 'blunder';
            const mateLoss = (evalAfter.value - evalBefore.value) * (moveColor === 'w' ? 1 : -1);
            if (mateLoss < 0 || (mateLoss === 0 && svAfter < 0)) return 'best';
            if (mateLoss < 2) return 'excellent';
            if (mateLoss < 7) return 'okay';
            return 'inaccuracy';
        }
        if (evalBefore.type === 'mate' && evalAfter.type === 'centipawn') {
            if (svAfter >= 800) return 'excellent';
            if (svAfter >= 400) return 'okay';
            if (svAfter >= 200) return 'inaccuracy';
            if (svAfter >= 0) return 'mistake';
            return 'blunder';
        }
        if (evalBefore.type === 'centipawn' && evalAfter.type === 'mate') {
            if (svAfter > 0) return 'best';
            if (svAfter >= -2) return 'blunder';
            if (svAfter >= -5) return 'mistake';
            return 'inaccuracy';
        }

        const pl = ChessAnalyzer.getExpectedPointsLoss(evalBefore, evalAfter, moveColor);
        const pf = 1.0 - 0.4 * gamePhase;
        if (pl < 0.01) return 'best';
        if (pl < 0.045 * pf) return 'excellent';
        if (pl < 0.08 * pf) return 'okay';
        if (pl < 0.12 * pf) return 'inaccuracy';
        if (pl < 0.22 * pf) return 'mistake';
        return 'blunder';
    }

    async evaluatePosition(fen, depth = 18) {
        let resolved = false;
        return new Promise((resolve) => {
            let timeout;
            const sideToMove = fen.split(' ').length > 1 ? fen.split(' ')[1] : 'w';
            const listener = (event) => {
                if (resolved) return;
                const msg = event.data;
                const m = msg.match(/score cp (-?\d+)/);
                const mm = msg.match(/score mate (-?\d+)/);
                if (mm) {
                    resolved = true; clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    const v = parseInt(mm[1]);
                    resolve({ type: 'mate', value: v, sideToMove, score: v > 0 ? 10000 : -10000 });
                } else if (m) {
                    const raw = parseInt(m[1]);
                    resolved = true; clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    const score = sideToMove === 'b' ? -raw : raw;
                    resolve({ type: 'cp', value: score, score });
                }
            };
            this.stockfish.addEventListener('message', listener);
            timeout = setTimeout(() => {
                if (resolved) return;
                resolved = true; this.stockfish.removeEventListener('message', listener);
                resolve({ type: 'cp', value: 0, score: 0 });
            }, 10000);
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    /** Find top N moves using Stockfish MultiPV (fixed depth) */
    async findTopMoves(fen, numMoves = 3, depth = 15) {
        let resolved = false;
        return new Promise((resolve) => {
            const topMoves = {};
            let timeout;
            const listener = (event) => {
                if (resolved) return;
                const msg = event.data;
                const pm = msg.match(/^info.*multipv\s+(\d+).*?score\s+(cp|mate)\s+(-?\d+)(?:.*?pv\s+(\S+))?/);
                if (pm) {
                    const idx = parseInt(pm[1]), st = pm[2], sv = parseInt(pm[3]), uci = pm[4] || '';
                    if (!topMoves[idx] || (msg.includes('depth') && topMoves[idx].msgDepth !== undefined)) {
                        const dm = msg.match(/\bdepth\s+(\d+)/);
                        const md = dm ? parseInt(dm[1]) : 0;
                        if (!topMoves[idx] || md >= topMoves[idx].msgDepth) topMoves[idx] = { idx, st, sv, uci, msgDepth: md };
                    }
                }
                if (msg.startsWith('bestmove')) {
                    resolved = true; clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    this.stockfish.postMessage('setoption name MultiPV value 1');
                    const results = [];
                    for (const k of Object.keys(topMoves).sort((a, b) => a - b)) {
                        const e = topMoves[k];
                        if (e && e.uci) results.push({ uci: e.uci, san: this.formatUCIToAlgebraic(e.uci, fen), scoreType: e.st, scoreVal: e.sv });
                    }
                    resolve(results);
                }
            };
            this.stockfish.addEventListener('message', listener);
            timeout = setTimeout(() => {
                if (resolved) return;
                resolved = true; this.stockfish.removeEventListener('message', listener);
                this.stockfish.postMessage('setoption name MultiPV value 1');
                resolve([]);
            }, 15000);
            this.stockfish.postMessage(`setoption name MultiPV value ${numMoves}`);
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    /**
     * Adaptive MultiPV using time-bounded Stockfish analysis.
     * Uses `go movetime` with budget from _estimateSearchBudget so Stockfish
     * naturally searches deeper in simple positions and wider in complex ones.
     */
    async findTopMovesAdaptive(fen, numMoves = 3) {
        const budget = ChessAnalyzer._estimateSearchBudget(fen);
        let resolved = false;
        return new Promise((resolve) => {
            const topMoves = {};
            let timeout, finalDepth = 0;
            const listener = (event) => {
                if (resolved) return;
                const msg = event.data;
                const pm = msg.match(/^info.*multipv\s+(\d+).*?score\s+(cp|mate)\s+(-?\d+)(?:.*?pv\s+(\S+))?/);
                if (pm) {
                    const idx = parseInt(pm[1]), st = pm[2], sv = parseInt(pm[3]), uci = pm[4] || '';
                    if (!topMoves[idx] || (msg.includes('depth') && topMoves[idx].msgDepth !== undefined)) {
                        const dm = msg.match(/\bdepth\s+(\d+)/);
                        const md = dm ? parseInt(dm[1]) : 0;
                        if (!topMoves[idx] || md >= topMoves[idx].msgDepth) {
                            topMoves[idx] = { idx, st, sv, uci, msgDepth: md };
                            if (md > finalDepth) finalDepth = md;
                        }
                    }
                }
                if (msg.startsWith('bestmove')) {
                    resolved = true; clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    this.stockfish.postMessage('setoption name MultiPV value 1');
                    const results = [];
                    for (const k of Object.keys(topMoves).sort((a, b) => a - b)) {
                        const e = topMoves[k];
                        if (e && e.uci) results.push({ uci: e.uci, san: this.formatUCIToAlgebraic(e.uci, fen), scoreType: e.st, scoreVal: e.sv, depth: e.msgDepth || finalDepth });
                    }
                    resolve(results);
                }
            };
            this.stockfish.addEventListener('message', listener);
            timeout = setTimeout(() => {
                if (resolved) return;
                resolved = true; this.stockfish.removeEventListener('message', listener);
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

        if (isGameOver) return { move: move.san, classification: 'forced', description: 'Game already over', suggestedMove: null, evalBefore: 0, evalAfter: 0, evalChange: 0 };
        if (isForced) return { move: move.san, classification: 'forced', description: 'Forced move', suggestedMove: null, evalBefore: 0, evalAfter: 0, evalChange: 0 };

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

        // Adaptive MultiPV: time-budgeted search, deeper in simple positions
        const topMoves = await this.findTopMovesAdaptive(fenBefore, 3);
        const playerMoveSan = move.san;
        const topSanList = topMoves.map(tm => tm.san);
        const topMovePlayed = topMoves.length > 0 && topMoves[0].san === playerMoveSan;
        const playerMoveRank = topSanList.indexOf(playerMoveSan);

        let suggestedMove = null;
        if (playerMoveRank !== 0 && topMoves.length > 0) suggestedMove = topMoves[0].san;

        const mateResult = ChessAnalyzer.detectMissedCheckmateMultiPV(topMoves, fenBefore);
        const isCritical = ChessAnalyzer._isCriticalPositionMultiPV(topMoves, playerMoveSan, move.color);
        const isBrilliant = await ChessAnalyzer.isBrilliantPositionAsync(move, fenBefore, this.stockfish);
        const isBook = this.detectBookMove(playerMoveSan, moveIndex, fenBefore);
        const gamePhase = ChessAnalyzer._getGamePhase(fenBefore);
        const baseClass = ChessAnalyzer.pointLossClassify(evalObjBefore, evalObjAfter, move.color, gamePhase);
        let classification, description = '';

        if (isBook && pointLoss < 0.01) {
            classification = 'book';
            description = 'Book move';
        } else if (mateResult.isCheckmate) {
            classification = 'missedWin';
            description = 'Missed win!';
            if (mateResult.bestMove) description += ` Checkmate: ${mateResult.bestMove}`;
        } else if (isBrilliant && topMovePlayed && pointLoss < 0.01) {
            classification = 'brilliant';
            description = 'Brilliant sacrifice!';
        } else if (topMovePlayed && isCritical) {
            classification = 'critical';
            description = '! Critical move';
        } else {
            if (playerMoveRank > 0 && playerMoveRank < topMoves.length) {
                const bestScore = ChessAnalyzer._topMoveScore(topMoves[0], fenBefore);
                const playerScore = ChessAnalyzer._topMoveScore(topMoves[playerMoveRank], fenBefore);
                const gap = move.color === 'w' ? (bestScore - playerScore) : (playerScore - bestScore);
                if (gap < 30 && baseClass === 'blunder') {
                    classification = 'mistake';
                    description = '? Mistake (alternatives nearly as good)';
                    if (suggestedMove) description += `. Better: ${suggestedMove}`;
                } else if (gap < 60 && baseClass === 'blunder') {
                    classification = 'mistake';
                    if (suggestedMove) description = `? Mistake. Better: ${suggestedMove}`;
                    else description = '? Mistake';
                } else if (gap < 30 && baseClass === 'mistake') {
                    classification = 'inaccuracy';
                    description = '?! Inaccuracy (alternatives only slightly better)';
                    if (suggestedMove) description += `. Better: ${suggestedMove}`;
                } else {
                    classification = baseClass;
                }
            } else {
                classification = baseClass;
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
        const stm = fen.split(' ')[1];
        return stm === 'b' ? -topMove.scoreVal : topMove.scoreVal;
    }

    _buildDescription(c, d, sm, tmp) {
        switch (c) {
            case 'best': return tmp ? 'Best move' : 'Excellent move';
            case 'excellent': return 'Excellent move';
            case 'okay': return 'Okay move';
            case 'inaccuracy': return sm ? `?! Inaccuracy. Better: ${sm}` : '?! Inaccuracy';
            case 'mistake': return sm ? `? Mistake. Better: ${sm}` : '? Mistake';
            case 'blunder': return sm ? `?? Blunder. Better: ${sm}` : '?? Blunder';
            default: return d;
        }
    }

    /** Critical = all alternatives at least 150cp worse than player's move */
    static _isCriticalPositionMultiPV(topMoves, playerMoveSan, moveColor) {
        if (!topMoves || topMoves.length < 2 || topMoves[0].san !== playerMoveSan) return false;
        const ps = ChessAnalyzer._scoreForClassification(topMoves[0], moveColor);
        for (let i = 1; i < topMoves.length; i++) {
            if (ps - ChessAnalyzer._scoreForClassification(topMoves[i], moveColor) < 150) return false;
        }
        return true;
    }

    static _scoreForClassification(topMove, moveColor) {
        if (topMove.scoreType === 'mate') return topMove.scoreVal > 0 ? 10000 : -10000;
        return moveColor === 'w' ? topMove.scoreVal : -topMove.scoreVal;
    }

    /** Missed checkmate: checks ALL top moves, not just the best */
    static detectMissedCheckmateMultiPV(topMoves, fenBefore) {
        if (!topMoves || topMoves.length === 0) return { isCheckmate: false, bestMove: null };
        let best = null, bestDepth = Infinity;
        for (const tm of topMoves) {
            if (tm.scoreType === 'mate' && tm.scoreVal > 0) {
                const d = Math.abs(tm.scoreVal);
                if (d < bestDepth) {
                    try {
                        const chess = new Chess(fenBefore);
                        const mr = chess.move({ from: tm.uci.substring(0, 2), to: tm.uci.substring(2, 4), promotion: tm.uci.length > 4 ? tm.uci[4] : undefined });
                        if (mr && chess.game_over() && chess.in_checkmate()) { bestDepth = 0; best = mr.san; }
                        else { bestDepth = d; best = tm.san; }
                    } catch (e) { bestDepth = d; best = tm.san; }
                }
            }
        }
        if (best) return { isCheckmate: true, bestMove: best };
        return { isCheckmate: false, bestMove: null };
    }

    _isCriticalPosition(evalObjBefore, legalMoveCount, move) {
        const pp = move.color === 'w' ? evalObjBefore.value : -evalObjBefore.value;
        return (pp < -500) || (legalMoveCount <= 3 && pp <= -150);
    }

    async findBestMove(fen, depth = 10) {
        let resolved = false;
        return new Promise((resolve) => {
            let timeout;
            const listener = (event) => {
                if (resolved) return;
                const msg = event.data;
                if (msg.startsWith('bestmove')) {
                    resolved = true; clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    const m = msg.match(/^bestmove\s+(\S+)/);
                    if (m && m[1] !== '(none)') {
                        try {
                            const chess = new Chess(fen);
                            const mv = chess.move({ from: m[1].substring(0, 2), to: m[1].substring(2, 4), promotion: m[1].length > 4 ? m[1][4] : undefined });
                            resolve(mv && mv.san ? mv.san : this.formatUCIToAlgebraic(m[1], fen));
                        } catch (e) { resolve(this.formatUCIToAlgebraic(m[1], fen)); }
                    } else { resolve(null); }
                }
            };
            this.stockfish.addEventListener('message', listener);
            timeout = setTimeout(() => {
                if (resolved) return;
                resolved = true; this.stockfish.removeEventListener('message', listener);
                resolve(null);
            }, 5000);
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    formatUCIToAlgebraic(uciMove, fen) {
        if (!uciMove || uciMove.length < 4) return uciMove;
        const from = uciMove.substring(0, 2), to = uciMove.substring(2, 4), prom = uciMove.length > 4 ? uciMove[4] : undefined;
        if (fen) {
            try { const chess = new Chess(fen); const m = chess.move({ from, to, promotion: prom }); if (m && m.san) return m.san; } catch (e) {}
        }
        return prom ? to + '=' + prom.toUpperCase() : to;
    }

    async detectMissedCheckmate(fen, depth = 15) {
        let resolved = false;
        return new Promise((resolve) => {
            let timeout;
            const listener = (event) => {
                if (resolved) return;
                const msg = event.data;
                if (msg.startsWith('bestmove')) {
                    resolved = true; clearTimeout(timeout);
                    this.stockfish.removeEventListener('message', listener);
                    const m = msg.match(/^bestmove\s+(\S+)/);
                    if (m && m[1] !== '(none)') {
                        const chess = new Chess(fen);
                        const mr = chess.move({ from: m[1].substring(0, 2), to: m[1].substring(2, 4), promotion: m[1].length > 4 ? m[1][4] : undefined });
                        resolve({ isCheckmate: mr && chess.game_over() && chess.in_checkmate(), bestMove: mr ? mr.san : this.formatUCIToAlgebraic(m[1], fen) });
                    } else { resolve({ isCheckmate: false, bestMove: null }); }
                }
            };
            this.stockfish.addEventListener('message', listener);
            timeout = setTimeout(() => {
                if (resolved) return;
                resolved = true; this.stockfish.removeEventListener('message', listener);
                resolve({ isCheckmate: false, bestMove: null });
            }, 8000);
            this.stockfish.postMessage(`position fen ${fen}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        });
    }

    /** FEN-based opening book with transposition support */
    detectBookMove(moveSan, moveIndex, fenBefore) {
        if (!ChessAnalyzer._openingPositionIndex) ChessAnalyzer._buildOpeningPositionIndex();
        if (fenBefore) {
            const nf = ChessAnalyzer._normalizeFenForBook(fenBefore);
            const pe = ChessAnalyzer._openingPositionIndex[nf];
            if (pe) {
                const nm = moveSan.replace(/[+#]$/, '').toLowerCase();
                for (const e of pe) { if (e.move && e.move.toLowerCase() === nm) return true; }
            }
        }
        if (moveIndex < 0 || moveIndex > 14 || !moveSan) return false;
        if (!ChessAnalyzer._bookMoveIndex) {
            ChessAnalyzer._bookMoveIndex = {};
            for (const op of Object.values(chessOpenings)) {
                if (!op.moves || !Array.isArray(op.moves)) continue;
                for (let i = 0; i < op.moves.length; i++) {
                    if (!ChessAnalyzer._bookMoveIndex[i]) ChessAnalyzer._bookMoveIndex[i] = new Set();
                    ChessAnalyzer._bookMoveIndex[i].add(op.moves[i].toLowerCase());
                }
            }
        }
        const idx = ChessAnalyzer._bookMoveIndex[moveIndex];
        return idx ? idx.has(moveSan.replace(/[+#]$/, '').toLowerCase()) : false;
    }

    static _buildOpeningPositionIndex() {
        ChessAnalyzer._openingPositionIndex = {};
        for (const op of Object.values(chessOpenings)) {
            if (!op.moves || !Array.isArray(op.moves)) continue;
            const chess = new Chess();
            for (let i = 0; i < op.moves.length; i++) {
                try {
                    if (!chess.move(op.moves[i])) break;
                    const fk = ChessAnalyzer._normalizeFenForBook(chess.fen());
                    if (!ChessAnalyzer._openingPositionIndex[fk]) ChessAnalyzer._openingPositionIndex[fk] = [];
                    ChessAnalyzer._openingPositionIndex[fk].push({ opening: op.name, move: i + 1 < op.moves.length ? op.moves[i + 1] : null, isTerminal: i + 1 >= op.moves.length });
                } catch (e) { break; }
            }
        }
    }

    static _normalizeFenForBook(fen) {
        return fen.split(' ').slice(0, 4).join(' ');
    }

    /** Brilliant sacrifice detection with Stockfish follow-up verification */
    static async isBrilliantPositionAsync(move, fenBefore, stockfish) {
        const pv = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        if (!move || !move.from || !move.to || !move.color || move.promotion) return false;
        const chess = new Chess(fenBefore);
        const opp = move.color === 'w' ? 'b' : 'w';
        for (const bm of chess.moves({ verbose: true })) { if (bm.to === move.from && bm.color === opp) return false; }
        chess.move({ from: move.from, to: move.to, promotion: move.promotion });
        let ba = null, bav = Infinity;
        for (const am of chess.moves({ verbose: true })) {
            if (am.to === move.to && am.color === opp) { const av = pv[am.piece] || 0; if (av < bav) { ba = am; bav = av; } }
        }
        if (!ba || (pv[move.piece] || 0) <= bav) return false;
        try {
            chess.move({ from: ba.from, to: ba.to });
            const ev = new ChessAnalyzer(null, stockfish);
            const er = await ev.evaluatePosition(chess.fen(), 14);
            const score = er.type === 'mate' ? (er.value > 0 ? 10000 : -10000) : er.score;
            const stm = chess.fen().split(' ')[1];
            return move.color === 'w' ? (stm === 'b' ? -score : score) > -100 : (stm === 'b' ? -score : score) < 100;
        } catch (e) { return true; }
    }

    /** Insufficient material / fortress detection */
    static _isDrawishEndgame(fenBefore, fenAfter) {
        const board = (fenAfter || fenBefore).split(' ')[0];
        const wp = {}, bp = {};
        let wPawns = 0, bPawns = 0;
        for (const ch of board) {
            if (ch === '/') continue;
            if (ch >= 'a' && ch <= 'z') { if (ch === 'p') bPawns++; else bp[ch] = (bp[ch] || 0) + 1; }
            else if (ch >= 'A' && ch <= 'Z') { if (ch === 'P') wPawns++; else wp[ch.toLowerCase()] = (wp[ch.toLowerCase()] || 0) + 1; }
        }
        if (wPawns > 0 || bPawns > 0) return false;
        const mat = (p) => Object.entries(p).flatMap(([t, c]) => Array(c).fill(t)).sort().join(',');
        const wm = mat(wp), bm = mat(bp);
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
        for (let ri = 0, ranks = board.split('/'); ri < 8; ri++) {
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
        const opp = move.color === 'w' ? 'b' : 'w';
        for (const bm of chess.moves({ verbose: true })) { if (bm.to === move.from && bm.color === opp) return false; }
        chess.move({ from: move.from, to: move.to, promotion: move.promotion });
        let cap = null, capVal = Infinity;
        for (const am of chess.moves({ verbose: true })) {
            if (am.to === move.to && am.color === opp) { const av = pv[am.piece] || 0; if (av < capVal) { cap = am.piece; capVal = av; } }
        }
        return !!cap && (pv[move.piece] || 0) > capVal && !move.promotion;
    }

    detectHangingCapture(move, fenBefore) {
        if (!move.captured) return false;
        const chess = new Chess(fenBefore);
        const opp = move.color === 'w' ? 'b' : 'w';
        for (const om of chess.moves({ verbose: true })) { if (om.to === move.to && om.color === opp) return false; }
        return true;
    }

    detectBlunder(move, fenBefore, fenAfter) {
        if (ChessAnalyzer._isDrawishEndgame(fenBefore, fenAfter)) return false;
        const pv = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
        const chess = new Chess(fenAfter);
        const opp = move.color === 'w' ? 'b' : 'w', me = move.color;
        let hanging = false, attVal = Infinity;
        for (const om of chess.moves({ verbose: true })) {
            if (om.to === move.to && om.color === opp) {
                const av = pv[om.piece] || 0, mv = pv[move.piece] || 0;
                if (av <= mv && av < attVal) { hanging = true; attVal = av; }
            }
        }
        if (!hanging) return false;
        for (const pm of chess.moves({ verbose: true })) { if (pm.to === move.to && pm.color === me) return false; }
        return true;
    }

    generateAnalysisReport(moveAnalyses) {
        const summary = { book: 0, forced: 0, best: 0, critical: 0, missedWin: 0, brilliant: 0, great: 0, excellent: 0, okay: 0, inaccuracy: 0, mistake: 0, blunder: 0, good: 0 };
        moveAnalyses.forEach(a => { if (summary.hasOwnProperty(a.classification)) summary[a.classification]++; else summary.good++; });
        return summary;
    }
}
