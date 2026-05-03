// ===== SIDEBAR TOGGLE & MOBILE INIT =====

export function toggleSidebar() {
    const sidebar = document.getElementById('sidebarMenu');
    const toggle = document.getElementById('sidebarToggle');
    
    if (sidebar.classList.contains('sidebar-open')) {
        sidebar.classList.remove('sidebar-open');
        toggle.style.left = '10px';
        toggle.textContent = '\u2630';
    } else {
        sidebar.classList.add('sidebar-open');
        toggle.style.left = '230px';
        toggle.textContent = '\u2715';
    }
}

export function initMobileSidebar() {
    if (window.innerWidth > 768) return;
    
    const sidebarMenu = document.getElementById('sidebarMenu');
    const sidebarToggle = document.getElementById('sidebarToggle');
    
    if (sidebarMenu) {
        sidebarMenu.classList.remove('sidebar-open');
        sidebarMenu.style.left = '';
    }
    
    if (sidebarToggle) {
        sidebarToggle.style.display = 'block';
        sidebarToggle.textContent = '\u2630';
        sidebarToggle.style.left = '10px';
    }
}

// Expose globally for HTML onclick handlers
window.toggleSidebar = toggleSidebar;
