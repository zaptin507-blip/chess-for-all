// Simple debug script - paste this in console to test
console.log('=== Boss Battle Debug ===');
console.log('1. Selected bot:', window.chessGame ? window.chessGame.selectedBot : 'NO GAME');
console.log('2. Chess sidebar:', document.getElementById('chessSidebar'));
console.log('3. Time select:', document.querySelector('#chessSidebar #timeSelect'));
console.log('4. Time value:', document.querySelector('#chessSidebar #timeSelect')?.value);
console.log('5. Play button:', document.querySelector('#chessSidebar #startGameBtn'));

// Test selectBoss manually
window.testSelectBoss = (bot) => {
    console.log('Testing selectBoss with:', bot);
    if (window.selectBoss) {
        window.selectBoss(bot);
    } else {
        console.error('selectBoss function not found!');
    }
};

// Test starting game manually  
window.testStartGame = () => {
    console.log('Testing game start...');
    if (window.chessGame && window.chessGame.selectedBot) {
        const timeSelect = document.querySelector('#chessSidebar #timeSelect');
        if (timeSelect && timeSelect.value) {
            window.chessGame.timerMode = timeSelect.value;
            const colorSelect = document.querySelector('#chessSidebar #colorSelect');
            window.chessGame.playerColor = colorSelect.value || 'w';
            console.log('Starting game with:', {
                bot: window.chessGame.selectedBot,
                time: window.chessGame.timerMode,
                color: window.chessGame.playerColor
            });
            document.getElementById('chessSidebar').style.display = 'none';
            document.getElementById('sidebarMenu').style.left = '0';
            window.chessGame.updateBotDisplay();
            window.chessGame.startGame();
        } else {
            console.error('No time selected!');
        }
    } else {
        console.error('No bot selected or game not initialized!');
    }
};

console.log('\n=== Test Commands ===');
console.log('window.testSelectBoss(\'mrstong\') - Test selecting Mrs. Tong');
console.log('window.testStartGame() - Test starting game');
