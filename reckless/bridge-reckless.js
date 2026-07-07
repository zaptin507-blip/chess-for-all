const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');
const path = require('path');
const os = require('os');

const PORT = 9002;
const ENGINE_PATH = path.join(__dirname, 'reckless');
const NUM_THREADS = Math.max(2, os.cpus().length);
const HASH_MB = 4096;

const wss = new WebSocketServer({ port: PORT });
console.log(`Reckless bridge listening on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
    console.log('[connect] Client connected');

    // Spawn Reckless process
    const engine = spawn(ENGINE_PATH, [], {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let buffer = '';

    // Configure Reckless with optimal settings on startup
    // Note: Reckless uses 'MoveOverhead' (no space) unlike Stockfish
    const startupConfig = [
        `setoption name Threads value ${NUM_THREADS}`,
        `setoption name Hash value ${HASH_MB}`,
        'setoption name MoveOverhead value 10'
    ];
    for (const cfg of startupConfig) {
        engine.stdin.write(cfg + '\n');
        console.log('[cfg]', cfg);
    }

    // Forward engine stdout to WebSocket client
    engine.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
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
        console.log(`[exit] Reckless exited with code ${code}`);
        ws.close();
    });
});

console.log('Reckless Bridge Server');
console.log(`Engine: ${ENGINE_PATH}`);
console.log(`WebSocket port: ${PORT}`);
console.log(`Threads: ${NUM_THREADS}, Hash: ${HASH_MB}MB`);
