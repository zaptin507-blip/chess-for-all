// ===== SAFE STORAGE UTILITY =====
// Wraps localStorage with try/catch to prevent crashes in:
// - Safari private browsing (QuotaExceededError)
// - Storage-disabled browsers
// - Corrupt localStorage data
const safeStorage = {
    get(key, fallback = null) {
        try {
            const value = localStorage.getItem(key);
            return value !== null ? value : fallback;
        } catch (e) {
            console.warn('localStorage.getItem failed:', e.message);
            return fallback;
        }
    },
    getInt(key, fallback = 0) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return fallback;
            const parsed = parseInt(value);
            return isNaN(parsed) ? fallback : parsed;
        } catch (e) {
            console.warn('localStorage.getItem (int) failed:', e.message);
            return fallback;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, String(value));
            return true;
        } catch (e) {
            console.warn('localStorage.setItem failed:', e.message);
            return false;
        }
    },
    setInt(key, value) {
        try {
            localStorage.setItem(key, String(value));
            return true;
        } catch (e) {
            console.warn('localStorage.setItem (int) failed:', e.message);
            return false;
        }
    },
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn('localStorage.removeItem failed:', e.message);
            return false;
        }
    },
    getJSON(key, fallback = null) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return fallback;
            return JSON.parse(value);
        } catch (e) {
            console.warn('localStorage.getItem (JSON) failed:', e.message);
            return fallback;
        }
    },
    setJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('localStorage.setItem (JSON) failed:', e.message);
            return false;
        }
    },
    getBool(key, fallback = false) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return fallback;
            return value === 'true' || value === '1';
        } catch (e) {
            return fallback;
        }
    },
    setBool(key, value) {
        try {
            localStorage.setItem(key, value ? 'true' : 'false');
            return true;
        } catch (e) {
            return false;
        }
    }
};

export default safeStorage;
