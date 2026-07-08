const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');
const path = require('path');
const os = require('os');

const PORT = 9003;
const ENGINE_PATH = path.join(__dirname, '..', 'lc0', 'lc0-bin');
const WEIGHTS_PATH = path.join(__dirname, '..', 'lc0', 'weights_320b_32195.dat.gz');
const NUM_THREADS = Math.max(2, os.cpus().length);

const wss = new WebSocketServer({ port: PORT });
console.log(`LCZero bridge listening on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
    console.log('[connect] Client connected');

    // Spawn LCZero process with BLAS backend (CPU via Apple Accelerate)
    const engine = spawn(ENGINE_PATH, [], {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let buffer = '';

    // Configure LCZero with optimal settings on startup
    // Notes:
    //   - Backend=blas uses Apple Accelerate framework (compatible, no GPU dependency)
    //     Change to 'metal' if GPU inference works on your system (~3x faster)
    //   - WeightsFile must be an absolute path since lc0 changes CWD
    //   - CPuct=2.0 balances exploration vs exploitation (default: 1.745)
    //   - ScoreType=centipawn gives traditional eval (not WDL_mu)
    const startupConfig = [
        `setoption name Backend value blas`,
        `setoption name WeightsFile value ${WEIGHTS_PATH}`,
        `setoption name MinibatchSize value 128`,
        `setoption name MaxPrefetch value 32`,
        `setoption name Threads value ${NUM_THREADS}`,
        `setoption name CPuct value 2.0`,
        `setoption name ScoreType value centipawn`
    ];
    for (const cfg of startupConfig) {
        engine.stdin.write(cfg + '\n');
        console.log('[cfg]', cfg);
    }

    // Forward engine stdout to WebSocket client
    engine.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed) {
                ws.send(trimmed);
            }
        }
    });

    // Forward engine stderr to console for debugging
    engine.stderr.on('data', (data) => {
        console.error('[stderr]', data.toString());
    });

    // Handle WebSocket messages (UCI commands from client)
    ws.on('message', (msg) => {
        const command = msg.toString().trim();
        if (command) {
            console.log('[>>]', command);
            engine.stdin.write(command + '\n');
        }
    });

    // Cleanup on disconnect
    ws.on('close', () => {
        console.log('[disconnect] Client disconnected');
        engine.stdin.write('quit\n');
        setTimeout(() => {
            engine.kill();
        }, 100);
    });

    // Cleanup on engine exit
    engine.on('exit', (code) => {
        console.log(`[exit] LCZero exited with code ${code}`);
        ws.close();
    });
});

console.log('LCZero Bridge Server');
console.log(`Engine: ${ENGINE_PATH}`);
console.log(`Weights: ${WEIGHTS_PATH}`);
console.log(`WebSocket port: ${PORT}`);
console.log(`Threads: ${NUM_THREADS}, Backend: blas (CPU)`);
