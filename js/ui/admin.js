// ===== ADMIN PANEL =====
import safeStorage from '../core/storage.js';

function createAdminPanel() {
    const adminPanel = document.createElement('div');
    adminPanel.id = 'adminPanel';
    adminPanel.className = 'admin-panel';
    adminPanel.innerHTML = `
        <div class="admin-panel-header">
            <h3 class="admin-panel-title">Admin</h3>
            <button onclick="document.getElementById('adminPanel').style.display='none'" class="admin-panel-close">&times;</button>
        </div>
        <button id="adminInstantWin" class="admin-panel-btn-primary">Instant Win</button>
        <button id="adminResetGame" class="admin-panel-btn-secondary">Reset Game</button>
    `;
    document.body.appendChild(adminPanel);
    
    document.getElementById('adminInstantWin').addEventListener('click', () => {
        if (window.chessGame) {
            window.chessGame.instantWin();
        }
    });
    
    document.getElementById('adminResetGame').addEventListener('click', () => {
        if (window.chessGame) {
            window.chessGame.resetGame();
        }
    });
    
    return adminPanel;
}

export function toggleAdminPanel() {
    let adminPanel = document.getElementById('adminPanel');
    
    if (adminPanel && adminPanel.style.display === 'block') {
        adminPanel.style.display = 'none';
        return;
    }
    
    if (!adminPanel) {
        adminPanel = createAdminPanel();
    }
    
    adminPanel.style.display = 'block';
}

export function hideAdminPanel() {
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        adminPanel.style.display = 'none';
    }
}

// Expose globally for HTML onclick handlers
window.toggleAdminPanel = toggleAdminPanel;
window.hideAdminPanel = hideAdminPanel;
