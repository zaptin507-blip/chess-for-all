// Debug script to test profile functionality
// Add this temporarily to your browser console to debug

console.log('=== PROFILE DEBUG TEST ===');

// Test 1: Check if profile element exists
const userProfile = document.getElementById('userProfile');
console.log('1. Profile element exists:', !!userProfile);
console.log('   Profile display style:', userProfile ? userProfile.style.display : 'N/A');

// Test 2: Check if dropdown exists
const dropdown = document.getElementById('profileDropdown');
console.log('2. Dropdown element exists:', !!dropdown);
console.log('   Dropdown display style:', dropdown ? dropdown.style.display : 'N/A');

// Test 3: Check settings button
const settingsBtn = document.getElementById('profileSettingsBtn');
console.log('3. Settings button exists:', !!settingsBtn);

// Test 4: Manually show profile
if (userProfile) {
    userProfile.style.display = 'flex';
    console.log('4. ✅ Profile manually set to display: flex');
    console.log('   You should see the profile at bottom-right now!');
}

// Test 5: Test toggle function
if (dropdown && typeof toggleProfileDropdown === 'function') {
    console.log('5. Toggle function exists:', true);
    console.log('   Click the settings button (⚙️) to test the dropdown');
}

console.log('=== DEBUG COMPLETE ===');
console.log('If profile is still not visible, check:');
console.log('- Are you logged in? (profile only shows when logged in)');
console.log('- Check Vercel deployment is complete');
console.log('- Hard refresh: Cmd + Shift + R');
