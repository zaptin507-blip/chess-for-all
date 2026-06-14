const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');
const path = require('path');

const PORT = 9001;
const RECKLESS_PATH = path.join(__dirname, 'reckless');

const wss = new WebSocketServer({ port: PORT });
console.log(`♟️ Reckless bridge listening on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
    console.log('🟢 Client connected');

    // Spawn Reckless process
    const reckless = spawn(RECKLESS_PATH, [], {
        stdio: ['pipe', 'pipe', 'pipe']
    });

    let buffer = '';

    // Forward engine stdout to WebSocket client
    reckless.stdout.on('data', (data) => {
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
    reckless.stderr.on('data', (data) => {
        console.error('🔴 Reckless error:', data.toString());
    });

    // Handle WebSocket messages (UCI commands from client)
    ws.on('message', (msg) => {
        const command = msg.toString().trim();
        if (command) {
            console.log('⬆️  >>', command);
            reckless.stdin.write(command + '\n');
        }
    });

    // Cleanup on disconnect
    ws.on('close', () => {
        console.log('🔴 Client disconnected');
        reckless.stdin.write('quit\n');
        setTimeout(() => {
            reckless.kill();
        }, 100);
    });

    // Cleanup on engine exit
    reckless.on('exit', (code) => {
        console.log(`💀 Reckless exited with code ${code}`);
        ws.close();
    });
});

console.log('♟️  Reckless UCI Bridge Server');
console.log(`📍 Engine: ${RECKLESS_PATH}`);
console.log(`🔌 WebSocket port: ${PORT}`);
