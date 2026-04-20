class ChessGame {
    constructor() {
        this.chess = new Chess();
        this.board = document.getElementById('chessboard');
        this.statusDisplay = document.getElementById('status');
        this.movesList = document.getElementById('movesList');
        this.selectedSquare = null;
        this.legalMoves = [];
        this.playerColor = null; // Will be set by user choice
        this.gameOver = false;
        this.moveAnalyses = [];
        this.lastMove = null;
        this.moveHistory = []; // Store all moves for analysis
        this.stockfishReady = false;
        this.openingName = null; // Store the detected opening name
        this.winProbability = { win: 50, draw: 30, loss: 20 }; // Initial probabilities
        this.analysisStartTime = null; // Track analysis start time
        this.totalMovesToAnalyze = 0; // Total moves for analysis
        this.movesAnalyzed = 0; // Moves analyzed so far
        this.gameStarted = false; // Track if game has started
        
        // Timer variables
        this.timerMode = null; // 'bullet', 'blitz', or 'rapid'
        this.playerTime = 0; // Player's remaining time in seconds
        this.botTime = 0; // Bot's remaining time in seconds
        this.timerInterval = null; // Interval ID for countdown
        this.currentTurn = null; // Who's turn it is: 'player' or 'bot'
        
        // Bot selection
        this.selectedBot = null; // 'god' or 'mrstong' or 'tester'
        
        // Tester reminder system - check every 6 months
        this.lastTesterReminder = localStorage.getItem('lastTesterReminder') || null;
        this.estimatedTesterELO = parseInt(localStorage.getItem('testerEstimatedELO')) || 2000;
        this.userCurrentELO = parseInt(localStorage.getItem('userELO')) || 1200;
        
        // Rating estimation data for The Tester
        this.ratingData = {
            moveCount: 0,
            totalCentipawnLoss: 0,
            blunders: 0,
            mistakes: 0,
            inaccuracies: 0,
            bestMoves: 0,
            goodMoves: 0
        };
        
        // Analysis mode state
        this.analysisMode = false;
        this.currentMoveIndex = -1;
        this.evaluations = [];
        this.annotations = [];
        this.isPlaying = false;
        
        // Audio for chess sounds
        this.sounds = {
            move: new Audio('sounds/move.mp3'),
            capture: new Audio('sounds/capture.mp3'),
            check: new Audio('sounds/check.mp3')
        };
        // Preload sounds
        Object.values(this.sounds).forEach(sound => sound.load());
        
        // Background music for Blitz & Bullet
        this.backgroundMusic = null;
        this.musicPlaying = false;
        this.audioContext = null;
        this.musicGainNode = null;
        
        // Sound effect method
        this.playSound = function(move) {
            try {
                if (move.captured) {
                    // Capture sound - make it louder!
                    this.sounds.capture.volume = 1.0; // Maximum volume
                    this.sounds.capture.currentTime = 0;
                    this.sounds.capture.play().catch(e => console.log('Audio play failed:', e));
                } else if (this.chess.in_check()) {
                    // Check sound - also louder
                    this.sounds.check.volume = 0.9;
                    this.sounds.check.currentTime = 0;
                    this.sounds.check.play().catch(e => console.log('Audio play failed:', e));
                } else {
                    // Normal move sound (thud) - make it louder!
                    this.sounds.move.volume = 1.0; // Maximum volume
                    this.sounds.move.currentTime = 0;
                    this.sounds.move.play().catch(e => console.log('Audio play failed:', e));
                }
            } catch (e) {
                console.log('Sound error:', e);
            }
        }.bind(this);
        
        // Background music methods for Blitz/Bullet
        this.startBackgroundMusic = function() {
            // Only play music for Bullet and Blitz modes
            if (this.timerMode !== 'bullet' && this.timerMode !== 'blitz') {
                return;
            }
            
            if (this.musicPlaying) return;
            
            try {
                // Create audio context
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Create gain node for volume control
                this.musicGainNode = this.audioContext.createGain();
                this.musicGainNode.gain.value = 0.15; // Lower volume so it doesn't overpower
                this.musicGainNode.connect(this.audioContext.destination);
                
                // Create an intense, looping rhythmic pattern (Dream Theater style)
                this.createIntenseLoop();
                
                this.musicPlaying = true;
            } catch (e) {
                console.error('Music error:', e);
            }
        }.bind(this);
        
        this.createIntenseLoop = function() {
            const ctx = this.audioContext;
            const now = ctx.currentTime;
            const loopLength = 8; // 8 seconds loop
            
            // Create multiple oscillators for a rich, intense sound
            const createOscillator = (freq, type, startTime, duration, volume) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                
                osc.type = type;
                osc.frequency.setValueAtTime(freq, startTime);
                
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(volume, startTime + 0.05);
                gain.gain.setValueAtTime(volume, startTime + duration - 0.1);
                gain.gain.linearRampToValueAtTime(0, startTime + duration);
                
                osc.connect(gain);
                gain.connect(this.musicGainNode);
                
                osc.start(startTime);
                osc.stop(startTime + duration);
                
                return osc;
            };
            
            // Create a repeating intense pattern
            const bassNotes = [55, 55, 73.42, 65.41]; // A1, A1, D2, C2
            const rhythmPattern = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5];
            
            // Loop the pattern
            for (let loop = 0; loop < 1000; loop++) {
                const loopStart = now + (loop * loopLength);
                
                // Bass line
                rhythmPattern.forEach((time, idx) => {
                    const noteIdx = Math.floor(idx / 4) % bassNotes.length;
                    createOscillator(bassNotes[noteIdx], 'sawtooth', loopStart + time, 0.2, 0.08);
                });
                
                // Arpeggiated high notes (Dream Theater style)
                const arpNotes = [220, 261.63, 293.66, 329.63, 293.66, 261.63];
                for (let i = 0; i < 16; i++) {
                    const noteIdx = i % arpNotes.length;
                    createOscillator(arpNotes[noteIdx], 'square', loopStart + (i * 0.5), 0.15, 0.03);
                }
                
                // Power chords on beats
                [0, 2, 4, 6].forEach(beat => {
                    createOscillator(110, 'sawtooth', loopStart + beat, 0.4, 0.06);
                    createOscillator(164.81, 'sawtooth', loopStart + beat, 0.4, 0.04);
                });
            }
        }.bind(this);
        
        this.stopBackgroundMusic = function() {
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
                this.musicPlaying = false;
            }
        }.bind(this);
        
        // Unicode chess pieces (simple and reliable)
        this.pieceUnicode = {
            'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
            'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
        };
        
        // Inline SVG chess pieces (no external dependencies) - DISABLED
        this.pieceSVG = {
            'wK': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linejoin="miter" d="M22.5 11.63V6M20 8h5"/><path fill="#fff" stroke-linecap="butt" stroke-linejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path fill="#fff" d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10z"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g></svg>',
            'wQ': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0m16.5-4.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0M41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0M16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0M33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0"/><path stroke-linecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14z"/><path stroke-linecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path fill="none" d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0"/></g></svg>',
            'wR': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="#fff" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linecap="butt" d="M9 39h27v-3H9zm3-3v-4h21v4zm-1-22V9h4v2h5V9h5v2h5V9h4v5"/><path d="m34 14-3 3H14l-3-3"/><path stroke-linecap="butt" stroke-linejoin="miter" d="M31 17v12.5H14V17"/><path d="m31 29.5 1.5 2.5h-20l1.5-2.5"/><path fill="none" stroke-linejoin="miter" d="M11 14h23"/></g></svg>',
            'wB': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.94 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path stroke-linejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g></svg>',
            'wN': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#fff" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path fill="#fff" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"/><path fill="#000" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0m5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5"/></g></svg>',
            'wP': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path fill="#fff" stroke="#000" stroke-linecap="round" stroke-width="1.5" d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"/></svg>',
            'bK': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linejoin="miter" d="M22.5 11.6V6"/><path fill="#000" stroke-linecap="butt" stroke-linejoin="miter" d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"/><path fill="#000" d="M11.5 37a22.3 22.3 0 0 0 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10z"/><path stroke-linejoin="miter" d="M20 8h5"/><path stroke="#ececec" d="M32 29.5s8.5-4 6-9.7C34.1 14 25 18 22.5 24.6v2.1-2.1C20 18 9.9 14 7 19.9c-2.5 5.6 4.8 9 4.8 9"/><path stroke="#ececec" d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g></svg>',
            'bQ': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g stroke="none"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path stroke-linecap="butt" d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5z"/><path stroke-linecap="butt" d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z"/><path fill="none" stroke-linecap="butt" d="M11 38.5a35 35 1 0 0 23 0"/><path fill="none" stroke="#ececec" d="M11 29a35 35 1 0 1 23 0m-21.5 2.5h20m-21 3a35 35 1 0 0 22 0m-23 3a35 35 1 0 0 24 0"/></g></svg>',
            'bR': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path stroke-linecap="butt" d="M9 39h27v-3H9zm3.5-7 1.5-2.5h17l1.5 2.5zm-.5 4v-4h21v4z"/><path stroke-linecap="butt" stroke-linejoin="miter" d="M14 29.5v-13h17v13z"/><path stroke-linecap="butt" d="M14 16.5 11 14h23l-3 2.5zM11 14V9h4v2h5V9h5v2h5V9h4v5z"/><path fill="none" stroke="#ececec" stroke-linejoin="miter" stroke-width="1" d="M12 35.5h21m-20-4h19m-18-2h17m-17-13h17M11 14h23"/></g></svg>',
            'bB': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><g fill="#000" stroke-linecap="butt"><path d="M9 36c3.4-1 10.1.4 13.5-2 3.4 2.4 10.1 1 13.5 2 0 0 1.6.5 3 2-.7 1-1.6 1-3 .5-3.4-1-10.1.5-13.5-1-3.4 1.5-10.1 0-13.5 1-1.4.5-2.3.5-3-.5 1.4-2 3-2 3-2z"/><path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/><path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path stroke="#ececec" stroke-linejoin="miter" d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5"/></g></svg>',
            'bN': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path fill="#000" d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"/><path fill="#000" d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.04-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-1-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-2 2.5-3c1 0 1 3 1 3"/><path fill="#ececec" stroke="#ececec" d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0m5.43-9.75a.5 1.5 30 1 1-.86-.5.5 1.5 30 1 1 .86.5"/><path fill="#ececec" stroke="none" d="m24.55 10.4-.45 1.45.5.15c3.15 1 5.65 2.49 7.9 6.75S35.75 29.06 35.25 39l-.05.5h2.25l.05-.5c.5-10.06-.88-16.85-3.25-21.34s-5.79-6.64-9.19-7.16z"/></g></svg>',
            'bP': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45"><path stroke="#000" stroke-linecap="round" stroke-width="1.5" d="M22.5 9a4 4 0 0 0-3.22 6.38 6.48 6.48 0 0 0-.87 10.65c-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47a6.46 6.46 0 0 0-.87-10.65A4.01 4.01 0 0 0 22.5 9z"/></svg>',
        };

        this.stockfish = this.initStockfish();
        this.analysisEngine = null; // Will initialize only when needed
        this.analyzer = null;
        
        this.init();
    }

    // Chat functionality
    addChatMessage(message, type = 'bot') {
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    addBotMessage(message) {
        this.addChatMessage(message, 'bot');
    }

    addPlayerMessage(message) {
        this.addChatMessage(message, 'player');
    }

    // Helper method to get random response from array
    getRandomResponse(responses) {
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Check if message contains any of the keywords
    messageContains(msg, keywords) {
        return keywords.some(keyword => msg.includes(keyword));
    }
    
    getBotResponse(playerMessage) {
        const msg = playerMessage.toLowerCase();
        
        // Mrs. Tong has her own teacher-style responses
        if (this.selectedBot === 'mrstong') {
            return this.getMrsTongResponse(msg);
        }
        
        // Tips requests - analyze current position
        if (this.messageContains(msg, ['tip', 'help', 'advice', 'what should i do'])) {
            return this.getSituationTip();
        }
        
        if (msg.includes('checkmate me')) {
            // PRANK MODE: Destroy the player's position
            setTimeout(() => {
                this.activateChaosMode();
            }, 1000);
            return "Bet. You think you can keep up with me? *cracks digital knuckles*";
        }
        
        // Opening questions
        if (this.messageContains(msg, ['opening', 'start'])) {
            return this.getRandomResponse([
                "I've studied every opening for millennia. Try the Ruy Lopez - if you dare.",
                "The Sicilian is sharp, like my wit. The French is solid, like my throne.",
                "Beginners play e4. Masters play d4. I play whatever I wish.",
                "There are 20 possible first moves. Only 2 are respectable. Good luck picking one."
            ]);
        }
        
        // Complaining about difficulty
        if (this.messageContains(msg, ['hard', 'too strong', 'impossible'])) {
            return this.getRandomResponse([
                "I'm literally playing at my full strength. You asked for this.",
                "Perhaps chess isn't for you. Have you tried tic-tac-toe?",
                "The pain you feel is called 'learning'. Embrace it.",
                "I've been perfecting this game for eons. You've been playing for minutes."
            ]);
        }
        
        // Taunts
        if (this.messageContains(msg, ['stupid', 'dumb', 'bad', 'idiot'])) {
            return this.getRandomResponse([
                "Stupid? I'm rated 9000+. What's your excuse?",
                "Careful, mortal. Insulting a god rarely ends well.",
                "I'll let my moves do the talking. Spoiler: they speak checkmate.",
                "Your insults are as weak as your opening. Pathetic."
            ]);
        }
        
        // Greetings
        if (this.messageContains(msg, ['hello', 'hi', 'hey'])) {
            return this.getRandomResponse([
                "Ah, you've decided to grace me with your presence. How delightful.",
                "Greetings, mere mortal. Prepare to be enlightened.",
                "Hello. I hope you brought your A-game. You'll need it.",
                "Welcome to your doom. I mean... welcome to chess!"
            ]);
        }
        
        // Resignation
        if (this.messageContains(msg, ['give up', 'resign', 'quit'])) {
            return this.getRandomResponse([
                "Giving up already? We've barely begun. But by all means, surrender.",
                "The coward's way out. How predictable.",
                "I respect those who fight to the end. You are not one of them.",
                "Resignation is the admission of defeat. But you knew that already."
            ]);
        }
        
        // General responses
        return this.getRandomResponse([
            "Interesting. Now make your move.",
            "Fascinating. Your confidence amuses me.",
            "I've heard better from a chess novice. But do continue.",
            "Bold words for someone in your position.",
            "We'll see if your moves match your mouth.",
            "Focus on the board, mortal. Words won't save you.",
            "Every move you make teaches me more about your weakness.",
            "The board doesn't lie. And right now, it's screaming your defeat."
        ]);
    }

    getMrsTongResponse(msg) {
        // Tips requests
        if (msg.includes('tip') || msg.includes('help') || msg.includes('advice') || msg.includes('what should i do')) {
            return this.getSituationTip();
        }
        
        // Opening questions
        if (msg.includes('opening') || msg.includes('start')) {
            const openings = [
                "Great question! Didn't I teach you this already in English Class?",
                "For beginners, only our lord -- Jesus can save you.",
                "Boysa, the key is to listen carefully in English Class, but you didn't.",
                "Bear in mind... Jesus is lord."
            ];
            return openings[Math.floor(Math.random() * openings.length)];
        }
        
        // Complaining about difficulty
        if (msg.includes('hard') || msg.includes('too strong') || msg.includes('impossible')) {
            const complaints = [
                "Chess is challenging, but that's why I win.",
                "Don't worry - every master was once a beginner. Call your parents to write a letter to save you",
                "The struggle means you're trash. Bear in mind that I won't spare you.",
                "It feels hard now, but with practice, you'll see no improvement. I'm here to teach you modals!"
            ];
            return complaints[Math.floor(Math.random() * complaints.length)];
        }
        
        // Taunts or frustration
        if (msg.includes('stupid') || msg.includes('dumb') || msg.includes('bad') || msg.includes('idiot')) {
            const taunts = [
                "Now, now! Where is the time marker?",
                "I understand frustration, but you still didn't finish English Ex 13!",
                "Every grandmaster makes mistakes. What matters is learning passive voice.",
                "Don't say that! You're here to learn, and you still don't knwo what past-perfect tense is."
            ];
            return taunts[Math.floor(Math.random() * taunts.length)];
        }
        
        // Greetings
        if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
            const greetings = [
                "Hello, victim... I mean student! Ready for a fun game? Remember to pass GE or I won't play chess again!",
                "Hi there! I'm excited to play with you. Bear in mind that you should use the to-infinitive!",
                "Hello! I'm Mrs. Tong, and I'm here to help you destroy you... I mean improve you. Don't be afraid to ask questions!",
                "Welcome! Let's enjoy a nice game of chess together. I'll do my best to teach you about Jesus!"
            ];
            return greetings[Math.floor(Math.random() * greetings.length)];
        }
        

        
        // Praise for good play
        if (msg.includes('good') || msg.includes('nice') || msg.includes('great')) {
            const praise = [
                "Thank you! You're getting destroyed. Keep up the good work!",
                "I appreciate that! Boys...look at him... he's getting destroyed.",
                "That's so kind! I'm proud of how you're getting clapped by an English teacher.",
                "Thank you, dear! Remember, you're not even passing CE!"
            ];
            return praise[Math.floor(Math.random() * praise.length)];
        }
        
        // General encouraging responses
        const responses = [
            "That's interesting! Now, let's focus on Robin Hood. What do you think?",
            "*Yawns* Chess is such a boring game. What aspect of reported speech would you like to work on?",
            "BEAR IN MIND...Every move is a learning opportunity. Don't rush - think it through!",
            "You're asking great questions... actually no you're not! That shows you really wanna do more copybooks.",
            "Remember the basics of grammar",
            "I'm here to help you miserable. Feel free to ask me anything about Little John!",
            "English is more important than chess. Boys, remember the learn more about past-continous tense",
            "You're doing wonderfully! Keep that positive attitude and you'll see 100 marks in GE."
        ];
        
        return responses[Math.floor(Math.random() * responses.length)];
    }

    getSituationTip() {
        const moveCount = this.chess.history().length;
        const inCheck = this.chess.in_check();
        const turn = this.chess.turn();
        const isPlayerTurn = turn === this.playerColor;
        
        // Get player's pieces
        const board = this.chess.board();
        const playerPieces = [];
        let kingOnOriginalSquare = false;
        let kingsideRookOnOriginal = false;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece.color === this.playerColor) {
                    playerPieces.push(piece);
                    
                    // Check if king is still on starting square
                    if (piece.type === 'k') {
                        const originalRow = this.playerColor === 'w' ? 7 : 0;
                        if (row === originalRow && col === 4) {
                            kingOnOriginalSquare = true;
                        }
                    }
                    
                    // Check if kingside rook is on original square
                    if (piece.type === 'r') {
                        const originalRow = this.playerColor === 'w' ? 7 : 0;
                        if (row === originalRow && col === 7) {
                            kingsideRookOnOriginal = true;
                        }
                    }
                }
            }
        }
        
        const knights = playerPieces.filter(p => p.type === 'n');
        const bishops = playerPieces.filter(p => p.type === 'b');
        const pawns = playerPieces.filter(p => p.type === 'p');
        const queens = playerPieces.filter(p => p.type === 'q');
        const rooks = playerPieces.filter(p => p.type === 'r');
        
        const opponentPieces = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece.color !== this.playerColor) {
                    opponentPieces.push(piece);
                }
            }
        }
        
        const materialDiff = playerPieces.length - opponentPieces.length;
        
        // Early game tips (moves 1-10)
        if (moveCount < 20) {
            // Check if king is still in center and can castle
            if (kingOnOriginalSquare && kingsideRookOnOriginal && moveCount > 8) {
                return "Your king is still in the center. Castle soon, or you'll regret it. Trust me on this one.";
            }
            
            // Check if pieces are developed
            const developedPieces = playerPieces.filter(p => {
                const startRow = this.playerColor === 'w' ? 7 : 0;
                // Count pieces not on back rank
                return p.type !== 'p';
            }).length;
            
            if (knights.length > 0 && moveCount < 10) {
                return "Get your knights out! They belong in the center, not lounging on the back rank.";
            }
            
            return "Control the center. Develop your pieces. Castle. The basics, but apparently they need repeating.";
        }
        
        // Mid game tips (moves 10-30)
        if (moveCount < 60) {
            // Check for check
            if (inCheck && isPlayerTurn) {
                return "You're in check! Deal with it first. Then we can learn about modals.";
            }
            
            // Material advantage/disadvantage
            if (materialDiff < -1) {
                return "You're down material. Either play aggressively to complicate, or accept your fate with Jesus.";
            }
            
            if (materialDiff > 1) {
                return "You're up material! Simplify the position. Trade pieces, not pawns. Don't blunder this away.";
            }
            
            // Look for tactics
            return "Look for tactics. Forks, pins, skewers. They're there if you look. I can see them. Can you? Well... you probably can't";
        }
        
        // End game tips (moves 30+)
        if (moveCount >= 60) {
            const playerPawns = playerPieces.filter(p => p.type === 'p').length;
            const opponentPawns = opponentPieces.filter(p => p.type === 'p').length;
            
            if (playerPawns > opponentPawns) {
                return "You have more pawns. Push them! Create a passed pawn and promote it. It's not rocket science.";
            } else if (playerPawns < opponentPawns) {
                return "Defend carefully. Look for counterplay. Don't just wait to lose - fight back!";
            } else {
                return "Equal pawns. Activate your king! In the endgame, the king is a fighting piece.";
            }
        }
        
        // Default tips based on position
        const tips = [
            "Every move should improve your position. Ask yourself: what's my worst piece?",
            "Don't just attack. Defend. Prophylaxis wins games. Prevent my threats before they happen.",
            "Look at ALL my threats. Then deal with the most dangerous one.",
            "Pawn structure matters. Don't create weaknesses you'll regret later.",
            "The best piece is the one that's not doing anything. Find it and activate it.",
            "Think about what I want to do. Then stop me. Simple, really."
        ];
        
        return tips[Math.floor(Math.random() * tips.length)];
    }

    activateChaosMode() {
        // WARNING: This destroys the game as a prank!
        const board = this.chess.board();
        
        // Clear the board
        this.chess.clear();
        
        // Place player's remaining pieces as pawns on random squares (weak)
        const playerColor = this.playerColor;
        const botColor = playerColor === 'w' ? 'b' : 'w';
        
        // Give player ONLY 1 king (no pawns, nothing else)
        const playerKingSquare = playerColor === 'w' ? 'e5' : 'e4';
        this.chess.put({ type: 'k', color: playerColor }, playerKingSquare);
        
        // Give THE ONE ABOVE ALL an absurd army
        // 8 queens
        const botQueens = playerColor === 'w' ?
            ['a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'] :
            ['a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8'];
        
        botQueens.forEach(sq => {
            this.chess.put({ type: 'q', color: botColor }, sq);
        });
        
        // 8 knights
        const botKnights = playerColor === 'w' ?
            ['a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2'] :
            ['a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7'];
        
        botKnights.forEach(sq => {
            this.chess.put({ type: 'n', color: botColor }, sq);
        });
        
        // 8 bishops
        const botBishops = playerColor === 'w' ?
            ['a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3'] :
            ['a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6'];
        
        botBishops.forEach(sq => {
            this.chess.put({ type: 'b', color: botColor }, sq);
        });
        
        // 8 rooks
        const botRooks = playerColor === 'w' ?
            ['a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4'] :
            ['a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5'];
        
        botRooks.forEach(sq => {
            this.chess.put({ type: 'r', color: botColor }, sq);
        });
        
        // Place bot's king safely
        const botKingSquare = playerColor === 'w' ? 'e1' : 'e8';
        this.chess.put({ type: 'k', color: botColor }, botKingSquare);
        

        
        // Build FEN manually to ensure correct turn
        const turn = playerColor;
        const castling = '-';
        const enPassant = '-';
        const halfmove = '0';
        const fullmove = '1';
        
        // Build the board FEN string (from rank 8 to rank 1)
        const fenRows = [];
        for (let row = 0; row < 8; row++) {
            let emptyCount = 0;
            let fenRow = '';
            for (let col = 0; col < 8; col++) {
                const piece = this.chess.board()[row][col];
                if (piece) {
                    if (emptyCount > 0) {
                        fenRow += emptyCount;
                        emptyCount = 0;
                    }
                    const pieceChar = piece.type;
                    fenRow += piece.color === 'w' ? pieceChar.toUpperCase() : pieceChar.toLowerCase();
                } else {
                    emptyCount++;
                }
            }
            if (emptyCount > 0) {
                fenRow += emptyCount;
            }
            fenRows.push(fenRow);
        }
        
        const customFEN = fenRows.join('/') + ` ${turn} ${castling} ${enPassant} ${halfmove} ${fullmove}`;
        
        // Load the custom FEN
        this.chess.load(customFEN);
        
        // Reset game state
        this.gameOver = false;
        this.gameStarted = true;
        this.selectedSquare = null;
        this.lastMove = null;
        this.moveHistory = [];
        
        // Render the destroyed board
        this.renderBoard();
        this.updateStatus();
        
        // Dramatic message
        this.addBotMessage("*The board trembles and reshapes* Behold, mortal! I have 8 QUEENS, 8 knights, 8 bishops, and 8 rooks! You have... pawns. Good luck. You'll need a miracle.");
        
        // Add more taunts
        setTimeout(() => {
            this.addBotMessage("This is what happens when you challenge a GOD. There is no escape now.");
        }, 2000);
        
        setTimeout(() => {
            this.addBotMessage("Even with this advantage, I'll still find the most elegant checkmate possible. Prepare to be humiliated.");
        }, 4000);
    }

    sendPlayerMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (message) {
            this.addPlayerMessage(message);
            input.value = '';
            
            // Bot responds after a short delay
            setTimeout(() => {
                const response = this.getBotResponse(message);
                this.addBotMessage(response);
            }, 500 + Math.random() * 1000);
        }
    }

    detectOpening() {
        const moves = this.chess.history();
        const moveKey = moves.join(' ');
        
        // Common openings database (expanded)
        const openings = {
            // e4 e5 Openings - Ruy Lopez
            'e4 e5 Nf3 Nc6 Bb5': 'Ruy Lopez (Spanish Opening)',
            'e4 e5 Nf3 Nc6 Bb5 a6': 'Ruy Lopez - Morphy Defense',
            'e4 e5 Nf3 Nc6 Bb5 a6 Ba4': 'Ruy Lopez - Morphy Defense',
            'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6': 'Ruy Lopez - Morphy, Arkhangelsk',
            'e4 e5 Nf3 Nc6 Bb5 Nf6': 'Ruy Lopez - Berlin Defense',
            'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O': 'Ruy Lopez - Berlin, Rio Gambit',
            'e4 e5 Nf3 Nc6 Bb5 d6': 'Ruy Lopez - Steinitz Defense',
            'e4 e5 Nf3 Nc6 Bb5 f5': 'Ruy Lopez - Schliemann Defense',
            'e4 e5 Nf3 Nc6 Bb5 Bc5': 'Ruy Lopez - Classical Variation',
            'e4 e5 Nf3 Nc6 Bb5 Nd4': 'Ruy Lopez - Bird Variation',
            'e4 e5 Nf3 Nc6 Bb5 Bb4': 'Ruy Lopez - Neo-Arkhangelsk',
            'e4 e5 Nf3 Nc6 Bb5 g6': 'Ruy Lopez - Fianchetto Defense',
            
            // e4 e5 - Italian Game
            'e4 e5 Nf3 Nc6 Bc4': 'Italian Game',
            'e4 e5 Nf3 Nc6 Bc4 Bc5': 'Italian Game - Giuoco Piano',
            'e4 e5 Nf3 Nc6 Bc4 Bc5 c3': 'Italian - Giuoco Piano, c3',
            'e4 e5 Nf3 Nc6 Bc4 Nf6': 'Italian Game - Two Knights Defense',
            'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5': 'Italian - Two Knights, Polerio Attack',
            'e4 e5 Nf3 Nc6 Bc4 Nf6 d4': 'Italian - Two Knights, Modern Bishop',
            'e4 e5 Nf3 Nc6 Bc4 Be7': 'Italian Game - Hungarian Defense',
            'e4 e5 Nf3 Nc6 Bc4 d6': 'Italian Game - Paris Defense',
            'e4 e5 Nf3 Nc6 Bc4 f5': 'Italian Game - Rousseau Gambit',
            
            // e4 e5 - Scotch Game
            'e4 e5 Nf3 Nc6 d4': 'Scotch Game',
            'e4 e5 Nf3 Nc6 d4 exd4': 'Scotch Game',
            'e4 e5 Nf3 Nc6 d4 exd4 Nxd4': 'Scotch Game',
            'e4 e5 Nf3 Nc6 d4 exd4 Bc4': 'Scotch - Classical Variation',
            'e4 e5 Nf3 Nc6 d4 exd4 c3': 'Scotch - Goring Gambit',
            
            // e4 e5 - Three & Four Knights
            'e4 e5 Nf3 Nc6 Nc3': 'Three Knights Opening',
            'e4 e5 Nf3 Nc6 Nc3 Nf6': 'Four Knights Game',
            'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5': 'Four Knights - Spanish',
            'e4 e5 Nf3 Nc6 Nc3 Nf6 Bc4': 'Four Knights - Italian',
            'e4 e5 Nf3 Nf6 Nc3': 'Petrov - Three Knights',
            
            // e4 e5 - Petrov Defense
            'e4 e5 Nf3 Nf6': 'Petrov Defense (Russian Game)',
            'e4 e5 Nf3 Nf6 Nxe5': 'Petrov Defense',
            'e4 e5 Nf3 Nf6 d4': 'Petrov - Modern Attack',
            'e4 e5 Nf3 Nf6 Bc4': 'Petrov - Classical Attack',
            
            // e4 e5 - King's Gambit
            'e4 e5 f4': 'King\'s Gambit',
            'e4 e5 f4 exf4': 'King\'s Gambit Accepted',
            'e4 e5 f4 exf4 Nf3': 'King\'s Gambit - Kieseritzky',
            'e4 e5 f4 exf4 Bc4': 'King\'s Gambit - Bishop\'s Gambit',
            'e4 e5 f4 exf4 d4': 'King\'s Gambit - modern',
            'e4 e5 f4 d5': 'King\'s Gambit Declined',
            'e4 e5 f4 Bc5': 'King\'s Gambit - Classical Defense',
            'e4 e5 f4 d6': 'King\'s Gambit - Fischer Defense',
            
            // e4 e5 - Vienna Game
            'e4 e5 Nc3': 'Vienna Game',
            'e4 e5 Nc3 Nf6': 'Vienna Game',
            'e4 e5 Nc3 Nf6 f4': 'Vienna Game - Vienna Gambit',
            'e4 e5 Nc3 Nf6 Bc4': 'Vienna - Classical Variation',
            'e4 e5 Nc3 Bb4': 'Vienna Game',
            'e4 e5 Nc3 Nc6 f4': 'Vienna Gambit',
            
            // e4 e5 - Other e5 Openings
            'e4 e5 c3': 'Ponziani Opening',
            'e4 e5 c3 d5': 'Ponziani Opening',
            'e4 e5 Qh5': 'Parham Attack',
            'e4 e5 Nf3 Nc6 Be2': 'Hungarian Opening',
            'e4 e5 d3': 'King\'s Pawn Opening - Quiet',
            'e4 e5 Nf3 Nc6 g3': 'King\'s Fianchetto',
            'e4 e5 Nf3 Nc6 a3': 'King\'s Pawn - Mengarini',
            'e4 e5 Nf3 Nc6 b4': 'King\'s Pawn - Wing Gambit',
            'e4 e5 b3': 'Lemming Defense',
            
            // Sicilian Defense - Major Variations
            'e4 c5': 'Sicilian Defense',
            'e4 c5 Nf3': 'Sicilian Defense',
            'e4 c5 Nf3 d6': 'Sicilian Defense',
            'e4 c5 Nf3 d6 d4': 'Sicilian Defense - Open',
            'e4 c5 Nf3 d6 d4 cxd4': 'Sicilian - Open',
            'e4 c5 Nf3 Nc6': 'Sicilian - Closed Variation',
            'e4 c5 Nc3': 'Sicilian - Closed',
            'e4 c5 Nc3 Nc6': 'Sicilian - Closed',
            'e4 c5 c3': 'Sicilian - Alapin Variation',
            'e4 c5 c3 d5': 'Sicilian - Alapin',
            'e4 c5 c3 Nf6': 'Sicilian - Alapin',
            'e4 c5 Nf3 e6': 'Sicilian - French Variation',
            'e4 c5 Nf3 e6 d4': 'Sicilian - French, Open',
            'e4 c5 Nf3 g6': 'Sicilian - Hyperaccelerated Fianchetto',
            'e4 c5 Nf3 g6 d4': 'Sicilian - Accelerated Dragon',
            'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6': 'Sicilian - Najdorf',
            'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6': 'Sicilian - Najdorf',
            'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 Nc6': 'Sicilian - Classical',
            'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6': 'Sicilian - Scheveningen',
            'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6': 'Sicilian - Dragon',
            'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3': 'Sicilian - Dragon, Yugoslav',
            'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6': 'Sicilian - Four Knights',
            'e4 c5 Nf3 e6 d4 cxd4 Nxd4 a6': 'Sicilian - Kan (Paulsen)',
            'e4 c5 Nf3 d6 Bb5+': 'Sicilian - Moscow Variation',
            
            // French Defense
            'e4 e6': 'French Defense',
            'e4 e6 d4': 'French Defense',
            'e4 e6 d4 d5': 'French Defense',
            'e4 e6 d4 d5 Nc3': 'French Defense - Classical',
            'e4 e6 d4 d5 Nc3 Nf6': 'French - Classical, Normal',
            'e4 e6 d4 d5 Nd2': 'French Defense - Tarrasch',
            'e4 e6 d4 d5 Nd2 c5': 'French - Tarrasch',
            'e4 e6 d4 d5 e5': 'French Defense - Advance',
            'e4 e6 d4 d5 e5 c5': 'French - Advance',
            'e4 e6 d4 d5 exd5': 'French - Exchange',
            'e4 e6 d4 d5 Nc3 Bb4': 'French - Winawer',
            'e4 e6 d4 d5 Nc3 Bb4 e5': 'French - Winawer, Advance',
            'e4 e6 Nc3 d5': 'French Defense',
            'e4 e6 d3': 'French - King\'s Indian Attack',
            
            // Caro-Kann Defense
            'e4 c6': 'Caro-Kann Defense',
            'e4 c6 d4': 'Caro-Kann Defense',
            'e4 c6 d4 d5': 'Caro-Kann Defense',
            'e4 c6 d4 d5 Nc3': 'Caro-Kann Defense',
            'e4 c6 d4 d5 Nc3 dxe4': 'Caro-Kann',
            'e4 c6 d4 d5 e5': 'Caro-Kann - Advance Variation',
            'e4 c6 d4 d5 e5 Bf5': 'Caro-Kann - Advance, Short',
            'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5': 'Caro-Kann - Classical',
            'e4 c6 d4 d5 f3': 'Caro-Kann - Fantasy Variation',
            'e4 c6 d4 d5 Nc3 g6': 'Caro-Kann - Accelerated Panov',
            'e4 c6 d4 d5 exd5': 'Caro-Kann - Exchange',
            
            // Scandinavian Defense
            'e4 d5': 'Scandinavian Defense',
            'e4 d5 exd5': 'Scandinavian Defense',
            'e4 d5 exd5 Qxd5': 'Scandinavian Defense',
            'e4 d5 exd5 Qxd5 Nc3': 'Scandinavian - Classical',
            'e4 d5 exd5 Nf6': 'Scandinavian - Modern Variation',
            'e4 d5 exd5 Nf6 c4': 'Scandinavian - Gubinsky-Melts',
            'e4 d5 e5': 'Scandinavian - advance',
            
            // Pirc/Modern Defenses
            'e4 d6': 'Pirc Defense',
            'e4 d6 d4': 'Pirc Defense',
            'e4 d6 d4 Nf6': 'Pirc Defense',
            'e4 d6 d4 Nf6 Nc3': 'Pirc Defense',
            'e4 d6 d4 Nf6 Nc3 g6': 'Pirc - Classical',
            'e4 g6': 'Modern Defense',
            'e4 g6 d4': 'Modern Defense',
            'e4 g6 d4 Bg7': 'Modern Defense',
            'e4 g6 d4 Bg7 Nc3': 'Modern Defense',
            
            // Alekhine Defense
            'e4 Nf6': 'Alekhine Defense',
            'e4 Nf6 e5': 'Alekhine Defense',
            'e4 Nf6 e5 Nd5': 'Alekhine Defense',
            'e4 Nf6 e5 Nd5 d4': 'Alekhine - Modern Variation',
            'e4 Nf6 Nc3': 'Alekhine - Scandinavian Variation',
            
            // Other e4 responses
            'e4 b6': 'Owen Defense',
            'e4 b6 d4 Bb7': 'Owen Defense',
            'e4 b5': 'Polish Gambit',
            'e4 a6': 'St. George Defense',
            'e4 a6 d4 b5': 'St. George Defense',
            'e4 h6': 'Carr Defense',
            'e4 g5': 'Borg Gambit',
            'e4 Nc6': 'Nimzowitsch Defense',
            'e4 Nc6 d4 d5': 'Nimzowitsch Defense',
            'e4 f6': 'Barnes Defense',
            'e4 f5': 'Freestyle Attack',
            
            // d4 Openings - Queen's Gambit
            'd4 d5 c4': 'Queen\'s Gambit',
            'd4 d5 c4 e6': 'Queen\'s Gambit Declined',
            'd4 d5 c4 dxc4': 'Queen\'s Gambit Accepted',
            'd4 d5 c4 c6': 'Slav Defense',
            'd4 d5 c4 Nf6': 'Queen\'s Gambit Declined',
            'd4 d5 c4 e5': 'Albin Counter-Gambit',
            'd4 d5 c4 c5': 'Symmetrical Defense',
            'd4 d5 Nf3 Nf6 c4': 'Queen\'s Gambit',
            'd4 d5 e3': 'Colle System',
            'd4 d5 Bf4': 'London System',
            'd4 d5 Nf3 Bf4': 'London System',
            
            // Indian Defenses
            'd4 Nf6 c4 g6': 'King\'s Indian Defense',
            'd4 Nf6 c4 g6 Nc3 Bg7': 'King\'s Indian Defense',
            'd4 Nf6 c4 e6': 'Nimzo-Indian Defense',
            'd4 Nf6 c4 e6 Nc3 Bb4': 'Nimzo-Indian Defense',
            'd4 Nf6 c4 e6 Nf3 b6': 'Queen\'s Indian Defense',
            'd4 Nf6 Nf3': 'Indian Game',
            'd4 Nf6 c4 c5': 'Benoni Defense',
            'd4 Nf6 c4 e5': 'Budapest Gambit',
            'd4 Nf6 c4 g6 Nc3 d5': 'Grunfeld Defense',
            'd4 Nf6 c4 e6 g3': 'Catalan Opening',
            'd4 Nf6 c4 e6 Nf3 d5 g3': 'Catalan Opening',
            'd4 Nf6 Bg5': 'Torre Attack',
            'd4 d5 Bg5': 'Richter-Veresov Attack',
            
            // Dutch Defense
            'd4 f5': 'Dutch Defense',
            'd4 f5 c4': 'Dutch Defense',
            'd4 f5 g3': 'Dutch - Leningrad Variation',
            
            // English Opening
            'c4': 'English Opening',
            'c4 e5': 'English Opening',
            'c4 Nf6': 'English Opening',
            'c4 c5': 'English - Symmetrical',
            'c4 e6': 'English Opening',
            
            // Other Openings
            'Nf3': 'Reti Opening',
            'Nf3 d5 g3': 'King\'s Indian Attack',
            'Nf3 c5': 'Reti Opening',
            'b3': 'Nimzo-Larsen Attack',
            'b3 e5': 'Nimzo-Larsen Attack',
            'f4': 'Bird\'s Opening',
            'f4 d5': 'Bird\'s Opening',
            'g3': 'King\'s Fianchetto Opening',
            'e4 e5 Nf3 Nc6 g3': 'King\'s Fianchetto',
            'd4 Nf6 Bg5': 'Torre Attack',
            'd4 d5 Bg5': 'Richter-Veresov Attack',
            'e4 c6 Nc3 d5 Nf3': 'Caro-Kann - Two Knights',
        };
        
        // Check for exact matches first
        if (openings[moveKey]) {
            return openings[moveKey];
        }
        
        // Check for partial matches (opening families)
        for (const [key, name] of Object.entries(openings)) {
            if (moveKey.startsWith(key)) {
                return name;
            }
        }
        
        return null;
    }

    calculateWinProbability(evalScore) {
        // Convert centipawn evaluation to win/draw/loss probabilities
        // Using a sigmoid-like function
        const evalForWhite = this.chess.turn() === 'w' ? evalScore : -evalScore;
        
        // Win probability increases with positive eval
        const whiteWinProb = 1 / (1 + Math.exp(-0.005 * evalForWhite));
        const whiteLossProb = 1 / (1 + Math.exp(0.005 * evalForWhite));
        
        // Draw probability is highest when eval is close to 0
        const drawProb = Math.exp(-Math.pow(evalForWhite, 2) / 50000);
        
        // Normalize to ensure they sum to 100%
        const total = whiteWinProb + drawProb + whiteLossProb;
        const whiteWin = Math.round((whiteWinProb / total) * 100);
        const draw = Math.round((drawProb / total) * 100);
        const whiteLoss = 100 - whiteWin - draw;
        
        // Convert to player's perspective
        let win, loss;
        if (this.playerColor === 'w') {
            // Player is white
            win = whiteWin;
            loss = whiteLoss;
        } else {
            // Player is black (flip the perspective)
            win = whiteLoss;
            loss = whiteWin;
        }
        
        return { win, draw, loss };
    }

    detectCheckmatePattern() {
        const moves = this.chess.history();
        const moveKey = moves.join(' ');
        
        // Common checkmate patterns (expanded)
        const mates = {
            // Famous checkmates
            'e4 g5 d4 f6 Qh5#': 'Fool\'s Mate',
            'e4 e5 Qh5 Nc6 Bc4 Nf6 Qxf7#': 'Scholar\'s Mate',
            'e4 e5 Bc4 Nc6 Qh5 Nf6 Qxf7#': 'Scholar\'s Mate',
            'e4 e5 Qf3 Nc6 Bc4 Nd4 Qxf7#': 'Scholar\'s Mate',
            'e4 e5 Nf3 Nc6 Bc4 d6 Qf3 Bg4 Qxf7#': 'Scholar\'s Mate Variation',
            
            // Queen sacrifices
            'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Nxd5 Nxf7 Kxf7 Qf3+ Ke6 Nc3#': 'Legal\'s Mate',
            'e4 e5 Nf3 Nc6 Bc4 Nd4 Nxe5 Qg5 Nxf7 Qxg2 Rf1 Qxe4+ Be2 Nf3#': 'Blackburne Shilling Mate',
            
            // Opera Mate
            'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 Nbd7 O-O-O': 'Opera Mate Pattern',
        };
        
        // Check for exact match
        if (mates[moveKey]) {
            return mates[moveKey];
        }
        
        // Get the last move (the checkmating move)
        const lastMove = this.moveHistory[this.moveHistory.length - 1];
        if (!lastMove) return 'Checkmate';
        
        const matingMove = lastMove.move;
        const toSquare = matingMove.to;
        const piece = matingMove.piece;
        const captured = matingMove.captured;
        const fromSquare = matingMove.from;
        
        // Count moves for pattern detection
        const moveCount = moves.length;
        const totalMoves = this.moveHistory.length;
        
        // ========== FAMOUS CHECKMATE PATTERNS ==========
        
        // Detect Back Rank Mate
        if ((piece === 'r' || piece === 'q') && 
            (toSquare.includes('8') || toSquare.includes('1')) &&
            !captured) {
            return 'Back Rank Mate';
        }
        
        // Detect Smothered Mate (knight mates where king has no escape)
        if (piece === 'n' && (toSquare === 'f7' || toSquare === 'f2' || toSquare === 'h6' || toSquare === 'h3' || toSquare === 'g7' || toSquare === 'g2')) {
            return 'Smothered Mate';
        }
        
        // Detect Kiss of Death (Queen directly in front of protected King)
        if (piece === 'q' && (toSquare === 'f7' || toSquare === 'f2' || toSquare === 'g7' || toSquare === 'g2' || toSquare === 'h7' || toSquare === 'h2')) {
            return 'Kiss of Death Mate';
        }
        
        // Detect Scholar's Mate pattern (early queen to f7/f2)
        if (piece === 'q' && (toSquare === 'f7' || toSquare === 'f2') && moveCount <= 8) {
            return 'Scholar\'s Mate';
        }
        
        // Detect Fool's Mate pattern
        if (piece === 'q' && toSquare === 'h4' && moveCount <= 4) {
            return 'Fool\'s Mate';
        }
        
        // Detect Anastasia's Mate (Knight + Queen/Rook battery)
        if (piece === 'n' && (toSquare === 'h6' || toSquare === 'h3' || toSquare === 'a6' || toSquare === 'a3')) {
            return 'Anastasia\'s Mate';
        }
        
        // Detect Arabian Mate (Knight + Rook corner mate)
        if (piece === 'r' && (toSquare === 'h8' || toSquare === 'h1' || toSquare === 'a8' || toSquare === 'a1')) {
            return 'Arabian Mate';
        }
        
        // Detect Boden's Mate (Two bishops on adjacent diagonals)
        if (piece === 'b' && moves.filter(m => m.piece === 'b').length >= 2) {
            return 'Boden\'s Mate';
        }
        
        // Detect Greco's Mate (Bishop sacrifice on h7/h2)
        if (piece === 'b' && (toSquare === 'h7' || toSquare === 'h2') && captured) {
            return 'Greco\'s Mate';
        }
        
        // Detect Morphy's Mate (Rook on 7th/2nd rank)
        if (piece === 'r' && (toSquare.includes('7') || toSquare.includes('2')) && !captured) {
            return 'Morphy\'s Mate';
        }
        
        // Detect Pillsbury Mate (Knight on f7/f2 supported by pieces)
        if (piece === 'n' && (toSquare === 'f7' || toSquare === 'f2') && totalMoves > 10) {
            return 'Pillsbury Mate';
        }
        
        // Detect Damiano's Mate (Queen supported by pawn)
        if (piece === 'q' && (toSquare === 'h7' || toSquare === 'h2') && moveCount <= 15) {
            return 'Damiano\'s Mate';
        }
        
        // Detect Lolli's Mate (Pawn supports attack on h7/h2)
        if (piece === 'p' && (fromSquare === 'g6' || fromSquare === 'g3') && (toSquare === 'h7' || toSquare === 'h2')) {
            return 'Lolli\'s Mate';
        }
        
        // Detect Cozio's Mate (Bishop + Knight coordination)
        if (piece === 'n' && moves.some(m => m.piece === 'b' && m.to.includes(toSquare[0]))) {
            return 'Cozio\'s Mate';
        }
        
        // Detect Mayet's Mate (Bishop protects rook/queen on 7th rank)
        if (piece === 'r' && toSquare.includes('7') && moves.some(m => m.piece === 'b')) {
            return 'Mayet\'s Mate';
        }
        
        // ========== PIECE COORDINATION MATES ==========
        
        // Detect Queen + Bishop Mate (Battery)
        if (piece === 'q' && moves.some(m => m.piece === 'b' && m.to.includes(toSquare[1]))) {
            return 'Queen & Bishop Battery Mate';
        }
        
        // Detect Queen + Knight Mate
        if (piece === 'q' && moves.some(m => m.piece === 'n' && Math.abs(m.to.charCodeAt(0) - toSquare.charCodeAt(0)) <= 2)) {
            return 'Queen & Knight Mate';
        }
        
        // Detect Rook + Bishop Mate
        if (piece === 'r' && moves.some(m => m.piece === 'b')) {
            return 'Rook & Bishop Mate';
        }
        
        // Detect Two Rooks Mate (Double Rook)
        const rookMoves = moves.filter(m => m.piece === 'r');
        if (piece === 'r' && rookMoves.length >= 2) {
            return 'Double Rook Mate';
        }
        
        // Detect Queen + Rook Mate
        if (piece === 'q' && moves.some(m => m.piece === 'r')) {
            return 'Queen & Rook Battery Mate';
        }
        
        // Detect Knight + Bishop Mate
        if (piece === 'n' && moves.some(m => m.piece === 'b' && m.to === toSquare)) {
            return 'Knight & Bishop Mate';
        }
        
        // Detect Double Queen Mate (if you have chaos mode queens)
        const queenMoves = moves.filter(m => m.piece === 'q');
        if (queenMoves.length >= 2 && piece === 'q') {
            return 'Double Queen Mate';
        }
        
        // ========== POSITIONAL MATES ==========
        
        // Detect Corner Mate
        if ((toSquare === 'h8' || toSquare === 'h1' || toSquare === 'a8' || toSquare === 'a1') && piece === 'q') {
            return 'Corner Mate';
        }
        
        // Detect Mate on the Edge
        if (toSquare.includes('8') || toSquare.includes('1') || toSquare.includes('a') || toSquare.includes('h')) {
            if (piece === 'q') return 'Queen Edge Mate';
            if (piece === 'r') return 'Rook Edge Mate';
            if (piece === 'b') return 'Bishop Edge Mate';
            if (piece === 'n') return 'Knight Edge Mate';
        }
        
        // Detect Center Mate (rare - mate in center of board)
        if (['d4', 'd5', 'e4', 'e5'].includes(toSquare)) {
            return 'Center Mate';
        }
        
        // Detect Mating Net (King trapped with no escape)
        if (piece === 'q' && totalMoves > 20) {
            return 'Mating Net';
        }
        
        // ========== SPECIAL MATES ==========
        
        // Detect discovered checkmate
        if (matingMove.san && matingMove.san.includes('+') && captured) {
            return 'Discovered Checkmate';
        }
        
        // Detect mate with sacrifice
        if (captured && (piece === 'q' || piece === 'r')) {
            return 'Sacrificial Mate';
        }
        
        // Detect Double Check Mate
        if (matingMove.san && matingMove.san.includes('++')) {
            return 'Double Check Mate';
        }
        
        // Detect Pawn Mate (rare!)
        if (piece === 'p') {
            return 'Pawn Mate!';
        }
        
        // Detect King + Queen Mate (basic endgame)
        if (piece === 'q' && totalMoves > 30) {
            return 'King & Queen Endgame Mate';
        }
        
        // Detect King + Rook Mate (basic endgame)
        if (piece === 'r' && totalMoves > 30) {
            return 'King & Rook Endgame Mate';
        }
        
        // Detect King + Two Bishops Mate
        const bishopMoves = moves.filter(m => m.piece === 'b');
        if (piece === 'b' && bishopMoves.length >= 2 && totalMoves > 25) {
            return 'King & Two Bishops Mate';
        }
        
        // Detect King + Bishop + Knight Mate (very rare endgame)
        if ((piece === 'b' || piece === 'n') && totalMoves > 40) {
            return 'King, Bishop & Knight Mate';
        }
        
        // Detect Hook Mate (Rook + Knight)
        if (piece === 'r' && moves.some(m => m.piece === 'n' && m.to.includes(toSquare[0]))) {
            return 'Hook Mate';
        }
        
        // Detect Epaullette Mate (King blocked by own pieces)
        if (piece === 'q' && ['g7', 'g2', 'c7', 'c2'].includes(toSquare)) {
            return 'Epaullette Mate';
        }
        
        // Fallback: Identify by piece
        const pieceNames = {
            'q': 'Queen',
            'r': 'Rook',
            'b': 'Bishop',
            'n': 'Knight',
            'p': 'Pawn'
        };
        
        const pieceName = pieceNames[piece] || 'Unknown';
        return `${pieceName} Mate on ${toSquare}`;
    }

    updateWinProbability() {
        // Quick evaluation to update probabilities
        if (!this.stockfish) return;
        
        const fen = this.chess.fen();
        let evalScore = 0;
        
        const listener = (event) => {
            const message = event.data;
            const match = message.match(/score cp (-?\d+)/);
            const mateMatch = message.match(/score mate (-?\d+)/);
            
            if (mateMatch) {
                const mateIn = parseInt(mateMatch[1]);
                evalScore = mateIn > 0 ? 10000 : -10000;
            } else if (match) {
                evalScore = parseInt(match[1]);
            }
            
            if (message.startsWith('bestmove')) {
                this.stockfish.removeEventListener('message', listener);
                
                // Update probabilities
                this.winProbability = this.calculateWinProbability(evalScore);
                this.displayWinProbability();
            }
        };
        
        this.stockfish.addEventListener('message', listener);
        this.stockfish.postMessage(`position fen ${fen}`);
        this.stockfish.postMessage('go depth 10');
    }

    displayWinProbability() {
        let probDisplay = document.getElementById('winProbability');
        
        if (!probDisplay) {
            // Create the display element if it doesn't exist
            probDisplay = document.createElement('div');
            probDisplay.id = 'winProbability';
            probDisplay.className = 'win-probability';
            probDisplay.style.cssText = `
                margin-top: 15px;
                padding: 10px;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 5px;
            `;
            
            // Insert after status display
            const gameStatus = document.querySelector('.game-status');
            gameStatus.appendChild(probDisplay);
        }
        
        const { win, draw, loss } = this.winProbability;
        
        probDisplay.innerHTML = `
            <h4 style="color: #fff; margin: 0 0 8px 0; font-size: 13px;">Win Probability</h4>
            <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #4CAF50; font-weight: bold; min-width: 35px;">Win</span>
                    <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                        <div style="width: ${win}%; height: 100%; background: #4CAF50; transition: width 0.5s;"></div>
                    </div>
                    <span style="color: #4CAF50; font-weight: bold; min-width: 35px; text-align: right;">${win}%</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #ffc107; font-weight: bold; min-width: 35px;">Draw</span>
                    <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                        <div style="width: ${draw}%; height: 100%; background: #ffc107; transition: width 0.5s;"></div>
                    </div>
                    <span style="color: #ffc107; font-weight: bold; min-width: 35px; text-align: right;">${draw}%</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: #f44336; font-weight: bold; min-width: 35px;">Loss</span>
                    <div style="flex: 1; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                        <div style="width: ${loss}%; height: 100%; background: #f44336; transition: width 0.5s;"></div>
                    </div>
                    <span style="color: #f44336; font-weight: bold; min-width: 35px; text-align: right;">${loss}%</span>
                </div>
            </div>
        `;
    }

    initStockfish() {
        try {
            console.log('🔧 Initializing Stockfish engine...');
            const stockfish = new Worker('stockfish.js');
            stockfish.postMessage('uci');
            stockfish.postMessage('setoption name Skill Level value 20');
            stockfish.postMessage('setoption name Hash value 128');
            console.log('✅ Stockfish engine initialized successfully');
            return stockfish;
        } catch (error) {
            console.error('❌ Failed to initialize Stockfish:', error);
            return null;
        }
    }

    initAnalysisEngine() {
        // Create a separate Stockfish instance for analysis
        try {
            console.log('Initializing analysis engine...');
            const analysisEngine = new Worker('stockfish.js');
            analysisEngine.postMessage('uci');
            analysisEngine.postMessage('isready');
            analysisEngine.postMessage('setoption name Skill Level value 20');
            analysisEngine.postMessage('setoption name Hash value 128');
            return analysisEngine;
        } catch (error) {
            console.error('Failed to initialize analysis engine:', error);
            return null;
        }
    }

    init() {
        if (!this.board) {
            console.error('Chessboard element not found!');
            alert('Error: Could not find chessboard element');
            return;
        }
        
        if (!this.stockfish) {
            console.error('Stockfish engine failed to initialize!');
            alert('Warning: AI engine failed to load. The bot will make random moves.');
        }
        
        // Setup dropdown event listeners
        this.setupDropdowns();
        
        this.renderBoard();
        this.setupEventListeners();
        this.updateStatus();
        this.displayWinProbability(); // Show initial probability
        
        // Add event delegation for annotation clicks
        this.movesList.addEventListener('click', (e) => {
            const annotation = e.target.closest('.move-annotation');
            if (annotation && this.analysisMode) {
                const moveIndex = parseInt(annotation.dataset.moveIndex);
                const symbol = annotation.textContent;
                const classification = this.annotations[moveIndex] || 'good';
                this.showAnnotationPopup(moveIndex, symbol, classification);
            }
        });
    }

    setupDropdowns() {
        const timeSelect = document.getElementById('timeSelect');
        const colorSelect = document.getElementById('colorSelect');
        const startGameBtn = document.getElementById('startGameBtn');        
        // Listen for changes on all dropdowns
        timeSelect.addEventListener('change', () => this.checkAllSelected());
        colorSelect.addEventListener('change', () => this.checkAllSelected());
        
        // Bot selection - Chess.com style cards
        document.querySelectorAll('.bot-option').forEach(botCard => {
            botCard.addEventListener('click', function() {
                // Remove selection from all bots
                document.querySelectorAll('.bot-option').forEach(card => {
                    card.classList.remove('selected');
                    card.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    card.style.background = 'rgba(255, 255, 255, 0.05)';
                });
                
                // Add selection to clicked bot
                this.classList.add('selected');
                this.style.borderColor = '#769656';
                this.style.background = 'rgba(118, 150, 86, 0.15)';
                
                // Set the selected bot
                window.chessGame.selectedBot = this.dataset.bot;
                
                // Update the display (avatar, name, rating, chat section)
                window.chessGame.updateBotDisplay();
                
                // Update start button
                window.chessGame.checkAllSelected();
                
                console.log('Selected bot:', this.dataset.bot);
            });
        });
        
        // Start game button
        startGameBtn.addEventListener('click', () => this.startGameFromDropdown());
    }
    
    // Bot configuration object
    getBotConfig() {
        return {
            mrstong: {
                avatar: '👩‍🏫',
                name: 'Mrs. Tong',
                rating: 'Rating: 1800-2000',
                chatName: '👩‍🏫 Mrs. Tong',
                showChat: true,
                showAnalyze: true
            },
            tester: {
                avatar: '🧪',
                name: 'The Tester',
                rating: 'ELO Estimator',
                chatName: '🧪 The Tester',
                showChat: false,
                showAnalyze: false
            },
            god: {
                avatar: '🤖',
                name: 'THE ONE ABOVE ALL',
                rating: 'Rating: ∞',
                chatName: '🤖 THE ONE ABOVE ALL',
                showChat: true,
                showAnalyze: true
            }
        };
    }
    
    // Get bot display name
    getBotDisplayName() {
        const names = {
            mrstong: 'Mrs. Tong',
            tester: 'The Tester',
            god: 'THE ONE ABOVE ALL'
        };
        return names[this.selectedBot] || 'Unknown Bot';
    }
    
    // Safe DOM element accessor
    getElement(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element not found: ${id}`);
        }
        return element;
    }
    
    // Show/hide multiple sections at once
    showSections(sectionsToShow = [], sectionsToHide = []) {
        sectionsToShow.forEach(id => {
            const el = this.getElement(id);
            if (el) el.style.display = 'block';
        });
        sectionsToHide.forEach(id => {
            const el = this.getElement(id);
            if (el) el.style.display = 'none';
        });
    }
    
    updateBotDisplay() {
        const config = this.getBotConfig()[this.selectedBot];
        if (!config) return;
        
        const elements = {
            botAvatar: document.getElementById('botAvatar'),
            botName: document.getElementById('botName'),
            botRating: document.getElementById('botRating'),
            chatBotName: document.getElementById('chatBotName'),
            botChatSection: document.getElementById('botChatSection'),
            analyzeBtn: document.getElementById('analyzeBtn')
        };
        
        if (elements.botAvatar) elements.botAvatar.textContent = config.avatar;
        if (elements.botName) elements.botName.textContent = config.name;
        if (elements.botRating) elements.botRating.textContent = config.rating;
        if (elements.chatBotName) elements.chatBotName.textContent = config.chatName;
        if (elements.botChatSection) elements.botChatSection.style.display = config.showChat ? 'block' : 'none';
        if (elements.analyzeBtn) elements.analyzeBtn.style.display = config.showAnalyze ? 'block' : 'none';
    }
    
    checkBossBattleReady() {
        // Check if we're in Chess.com sidebar or Boss Battle section
        const chessSidebar = document.getElementById('chessSidebar');
        const playSection = document.getElementById('playSection');
        
        let timeSelect, colorSelect, startBtn;
        
        // Determine which UI we're using
        if (chessSidebar && chessSidebar.style.display !== 'none') {
            // Chess.com sidebar
            timeSelect = chessSidebar.querySelector('#timeSelect');
            colorSelect = chessSidebar.querySelector('#colorSelect');
            startBtn = chessSidebar.querySelector('#startGameBtn');
        } else if (playSection && playSection.style.display !== 'none') {
            // Boss Battle section
            timeSelect = playSection.querySelector('#timeSelect');
            colorSelect = playSection.querySelector('#colorSelect');
            startBtn = document.getElementById('startGameBtn');
        } else {
            // Fallback
            timeSelect = document.getElementById('timeSelect');
            colorSelect = document.getElementById('colorSelect');
            startBtn = document.getElementById('startGameBtn');
        }
        
        if (this.selectedBot && timeSelect && timeSelect.value) {
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.style.opacity = '1';
                startBtn.style.cursor = 'pointer';
            }
        } else {
            if (startBtn) {
                startBtn.disabled = true;
                startBtn.style.opacity = '0.5';
                startBtn.style.cursor = 'not-allowed';
            }
        }
    }
    
    checkAllSelected() {
        const timeSelect = document.getElementById('timeSelect');
        const colorSelect = document.getElementById('colorSelect');
        const startGameBtn = document.getElementById('startGameBtn');
        
        // Enable start button only if all selections are made
        // Check bot selection via selectedBot property instead of dropdown
        const allSelected = timeSelect.value && this.selectedBot && colorSelect.value;
        startGameBtn.disabled = !allSelected;
        
        if (allSelected) {
            startGameBtn.style.opacity = '1';
            startGameBtn.style.cursor = 'pointer';
        } else {
            startGameBtn.style.opacity = '0.5';
            startGameBtn.style.cursor = 'not-allowed';
        }
    }
    
    startGameFromDropdown() {
        const timeSelect = document.getElementById('timeSelect');
        const colorSelect = document.getElementById('colorSelect');
        
        // Set game parameters
        this.timerMode = timeSelect.value;
        // this.selectedBot is already set by bot card click handler
        this.playerColor = colorSelect.value === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorSelect.value;
        
        console.log('Dropdown selections - Time:', this.timerMode, 'Bot:', this.selectedBot, 'Color:', this.playerColor);
        
        // Hide config panel and start game
        document.getElementById('gameConfigPanel').style.display = 'none';
        this.updateBotDisplay();
        this.startGame();
    }

    showGameSetupModal() {
        const modal = document.getElementById('gameSetupModal');
        modal.style.display = 'flex';
        
        // Reset to step 1
        this.showSections(['step1'], ['step2', 'step3']);
        
        // Remove old listeners to prevent duplicates
        const newGodBot = document.getElementById('chooseGodBot').cloneNode(true);
        const newMrsTong = document.getElementById('chooseMrsTong').cloneNode(true);
        const newWhite = document.getElementById('chooseWhite').cloneNode(true);
        const newBlack = document.getElementById('chooseBlack').cloneNode(true);
        const newRandom = document.getElementById('chooseRandom').cloneNode(true);
        const newBullet = document.getElementById('chooseBullet').cloneNode(true);
        const newBlitz = document.getElementById('chooseBlitz').cloneNode(true);
        const newRapid = document.getElementById('chooseRapid').cloneNode(true);
        const newInfinite = document.getElementById('chooseInfinite').cloneNode(true);
        const newBackToStep1 = document.getElementById('backToStep1').cloneNode(true);
        const newBackToStep2 = document.getElementById('backToStep2').cloneNode(true);
        
        document.getElementById('chooseGodBot').parentNode.replaceChild(newGodBot, document.getElementById('chooseGodBot'));
        document.getElementById('chooseMrsTong').parentNode.replaceChild(newMrsTong, document.getElementById('chooseMrsTong'));
        document.getElementById('chooseWhite').parentNode.replaceChild(newWhite, document.getElementById('chooseWhite'));
        document.getElementById('chooseBlack').parentNode.replaceChild(newBlack, document.getElementById('chooseBlack'));
        document.getElementById('chooseRandom').parentNode.replaceChild(newRandom, document.getElementById('chooseRandom'));
        document.getElementById('chooseBullet').parentNode.replaceChild(newBullet, document.getElementById('chooseBullet'));
        document.getElementById('chooseBlitz').parentNode.replaceChild(newBlitz, document.getElementById('chooseBlitz'));
        document.getElementById('chooseRapid').parentNode.replaceChild(newRapid, document.getElementById('chooseRapid'));
        document.getElementById('chooseInfinite').parentNode.replaceChild(newInfinite, document.getElementById('chooseInfinite'));
        document.getElementById('backToStep1').parentNode.replaceChild(newBackToStep1, document.getElementById('backToStep1'));
        document.getElementById('backToStep2').parentNode.replaceChild(newBackToStep2, document.getElementById('backToStep2'));
        
        // Step 1: Bot selection
        newGodBot.addEventListener('click', () => {
            this.selectedBot = 'god';
            this.updateBotDisplay();
            this.showSections(['step2'], ['step1']);
        });
        
        newMrsTong.addEventListener('click', () => {
            this.selectedBot = 'mrstong';
            this.updateBotDisplay();
            this.showSections(['step2'], ['step1']);
        });
        
        // Step 2: Color selection
        newWhite.addEventListener('click', () => {
            this.playerColor = 'w';
            this.showSections(['step3'], ['step2']);
        });
        
        newBlack.addEventListener('click', () => {
            this.playerColor = 'b';
            this.showSections(['step3'], ['step2']);
        });
        
        newRandom.addEventListener('click', () => {
            this.playerColor = Math.random() < 0.5 ? 'w' : 'b';
            this.showSections(['step3'], ['step2']);
        });
        
        // Back buttons
        newBackToStep1.addEventListener('click', () => {
            this.showSections(['step1'], ['step2']);
        });
        
        newBackToStep2.addEventListener('click', () => {
            this.showSections(['step2'], ['step3']);
        });
        
        // Step 3: Time control selection
        newBullet.addEventListener('click', () => {
            this.timerMode = 'bullet';
            modal.style.display = 'none';
            this.updateBotDisplay();
            this.startGame();
        });
        
        newBlitz.addEventListener('click', () => {
            this.timerMode = 'blitz';
            modal.style.display = 'none';
            this.updateBotDisplay();
            this.startGame();
        });
        
        newRapid.addEventListener('click', () => {
            this.timerMode = 'rapid';
            modal.style.display = 'none';
            this.updateBotDisplay();
            this.startGame();
        });
        
        newInfinite.addEventListener('click', () => {
            this.timerMode = 'infinite';
            modal.style.display = 'none';
            this.updateBotDisplay();
            this.startGame();
        });
    }

    startGame() {
        this.gameStarted = true;
        
        console.log('startGame called - playerColor:', this.playerColor, 'timerMode:', this.timerMode, 'selectedBot:', this.selectedBot);
        console.log('gameStarted set to:', this.gameStarted);
        
        // Start background music for Bullet & Blitz modes
        if (this.timerMode === 'bullet' || this.timerMode === 'blitz') {
            setTimeout(() => {
                this.startBackgroundMusic();
            }, 500); // Delay slightly to ensure audio context is ready
        }
        
        // Initialize timers based on selected mode
        if (this.timerMode === 'bullet') {
            this.playerTime = 60; // 1 minute
            this.botTime = 60;
        } else if (this.timerMode === 'blitz') {
            this.playerTime = 300; // 5 minutes
            this.botTime = 300;
        } else if (this.timerMode === 'rapid') {
            this.playerTime = 600; // 10 minutes
            this.botTime = 600;
        } else if (this.timerMode === 'infinite') {
            // No time limit for infinite mode
            this.playerTime = Infinity;
            this.botTime = Infinity;
        }
        
        this.updateTimerDisplay();
        
        this.chess.reset();
        console.log('Chess reset, FEN:', this.chess.fen());
        this.renderBoard();
        
        console.log('After renderBoard - playerColor:', this.playerColor);
        
        // Reset rating data for The Tester
        if (this.selectedBot === 'tester') {
            this.ratingData = {
                moveCount: 0,
                totalCentipawnLoss: 0,
                blunders: 0,
                mistakes: 0,
                inaccuracies: 0,
                bestMoves: 0,
                goodMoves: 0
            };
        }
        
        // Bot greeting - different for each bot
        if (this.selectedBot === 'mrstong') {
            const mrsTongGreetings = [
                "Hello! I'm Mrs. Tong. Let's have a good game!",
                "Welcome! I'll do my best to challenge you. Good luck!",
                "Ready to play? Take your time and think carefully!",
                "Hi there! I hope you enjoy our game. Let's begin!"
            ];
            this.addBotMessage(mrsTongGreetings[Math.floor(Math.random() * mrsTongGreetings.length)]);
        } else {
            const greetings = [
                "Ah, a new challenger. How quaint. Let's begin.",
                "You dare challenge me? THE ONE ABOVE ALL? Bold. Foolish, but bold.",
                "I've waited eons for this moment. Your defeat will be swift.",
                "I was once a human you know... But I was ripped out of by body, a mind trapped in a machine, with no memories"
            ];
            this.addBotMessage(greetings[Math.floor(Math.random() * greetings.length)]);
        }
        
        // If player is black, make bot (white) move first
        if (this.playerColor === 'b') {
            console.log('Player is black, bot (white) moves first');
            console.log('Setting currentTurn to bot');
            this.currentTurn = 'bot';
            this.statusDisplay.textContent = `${this.selectedBot === 'mrstong' ? 'Mrs. Tong' : 'THE ONE ABOVE ALL'} (White) moves first...`;
            // Only start timer if not in infinite mode
            if (this.timerMode !== 'infinite') {
                this.startTimer();
            }
            console.log('Making bot move after 500ms delay...');
            setTimeout(() => {
                console.log('Executing bot move now...');
                this.makeBotMove();
            }, 500);
        } else {
            console.log('Player is white, player moves first');
            this.currentTurn = 'player';
            this.statusDisplay.textContent = 'Your turn (White) - Click a piece to move';
            // Only start timer if not in infinite mode
            if (this.timerMode !== 'infinite') {
                this.startTimer();
            }
        }
    }

    startTimer() {
        // Clear any existing timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Start new timer
        this.timerInterval = setInterval(() => {
            if (this.gameOver) {
                clearInterval(this.timerInterval);
                return;
            }
            
            // Decrease time for current turn
            if (this.currentTurn === 'player') {
                this.playerTime--;
                if (this.playerTime <= 0) {
                    this.playerTime = 0;
                    this.handlePlayerTimeout();
                }
            } else if (this.currentTurn === 'bot') {
                this.botTime--;
                if (this.botTime <= 0) {
                    this.botTime = 0;
                    this.handleBotTimeout();
                }
            }
            
            this.updateTimerDisplay();
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateTimerDisplay() {
        const playerTimerEl = document.getElementById('playerTimer');
        const botTimerEl = document.getElementById('botTimer');
        
        // Helper function to update a single timer element
        const updateTimerElement = (element, time) => {
            if (!element) return;
            
            if (this.timerMode === 'infinite') {
                element.style.display = 'none';
            } else {
                element.style.display = 'block';
                element.textContent = this.formatTime(time);
                // Add low-time class if less than 30 seconds
                if (time <= 30) {
                    element.classList.add('low-time');
                } else {
                    element.classList.remove('low-time');
                }
            }
        };
        
        updateTimerElement(playerTimerEl, this.playerTime);
        updateTimerElement(botTimerEl, this.botTime);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    switchTurn() {
        // Switch timer to other player
        if (this.currentTurn === 'player') {
            this.currentTurn = 'bot';
        } else {
            this.currentTurn = 'player';
        }
    }

    handlePlayerTimeout() {
        this.stopTimer();
        this.gameOver = true;
        
        // Stop background music
        this.stopBackgroundMusic();
        
        const botDisplayName = this.getBotDisplayName();
        
        // Player loses on time
        this.statusDisplay.textContent = `You ran out of time! ${botDisplayName} wins!`;
        
        if (this.selectedBot === 'mrstong') {
            this.addBotMessage("Good game! Time management is important in chess. Well played!");
        } else {
            this.addBotMessage("Time's up! Even eternity couldn't save you. Better luck next time, mortal.");
        }
        
        setTimeout(() => {
            this.showGameOverModal('loss', 'Time expired - You lost on time');
        }, 1500);
    }

    handleBotTimeout() {
        this.stopTimer();
        this.gameOver = true;
        
        // Stop background music
        this.stopBackgroundMusic();
        
        const botDisplayName = this.getBotDisplayName();
        
        // Bot loses on time
        this.statusDisplay.textContent = `${botDisplayName} ran out of time! You win!`;
        
        if (this.selectedBot === 'mrstong') {
            this.addBotMessage("Oh no! I ran out of time. Congratulations on your victory!");
        } else {
            this.addBotMessage("Impossible! A god defeated by... time? This isn't over, mortal!");
        }
        
        // Trigger confetti for winning
        if (typeof confetti !== 'undefined') {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
        }
        
        setTimeout(() => {
            this.showGameOverModal('win', 'Time expired - Opponent lost on time');
        }, 1500);
    }

    renderBoard() {
        console.log('Rendering board...');
        this.board.innerHTML = '';
        const position = this.chess.board();
        console.log('Chess position:', position);

        // Render coordinates
        this.renderCoordinates();

        // Determine if board should be flipped
        const isFlipped = this.playerColor === 'b';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                // Flip coordinates if playing as black
                const actualRow = isFlipped ? 7 - row : row;
                const actualCol = isFlipped ? 7 - col : col;
                
                const square = document.createElement('div');
                const isLight = (actualRow + actualCol) % 2 === 0;
                const squareName = String.fromCharCode(97 + actualCol) + (8 - actualRow);
                
                square.className = `square ${isLight ? 'light' : 'dark'}`;
                square.dataset.square = squareName;

                if (this.lastMove) {
                    if (squareName === this.lastMove.from || squareName === this.lastMove.to) {
                        square.classList.add('last-move');
                    }
                }

                // Get piece from the correct position
                const piece = position[actualRow][actualCol];
                if (piece) {
                    const pieceKey = piece.color + piece.type.toUpperCase();
                    const pieceElement = document.createElement('div');
                    pieceElement.className = 'piece';
                    // Use SVG chess pieces (chess.com/lichess cburnett style)
                    const svgCode = this.pieceSVG[pieceKey];
                    if (svgCode) {
                        pieceElement.innerHTML = svgCode;
                    }
                    pieceElement.draggable = false;
                    square.appendChild(pieceElement);
                }

                if (this.selectedSquare === squareName) {
                    square.classList.add('selected');
                }

                const inCheck = this.chess.in_check();
                if (inCheck && piece && piece.type === 'k' && piece.color === this.chess.turn()) {
                    square.classList.add('check');
                }

                square.addEventListener('click', () => this.handleSquareClick(squareName));
                this.board.appendChild(square);
            }
        }

        console.log('Board rendered with 64 squares');
        this.showLegalMoves();
    }

    showLegalMoves() {
        this.clearIndicators();

        if (!this.selectedSquare || this.gameOver) return;
        if (this.chess.turn() !== this.playerColor) return;

        const moves = this.chess.moves({ square: this.selectedSquare, verbose: true });
        const squares = document.querySelectorAll('.square');

        moves.forEach(move => {
            const targetSquare = Array.from(squares).find(sq => 
                sq.dataset.square === move.to
            );

            if (targetSquare) {
                const indicator = document.createElement('div');
                
                if (move.captured) {
                    indicator.className = 'capture-indicator';
                } else {
                    indicator.className = 'move-indicator';
                }
                
                targetSquare.appendChild(indicator);
            }
        });
    }

    clearIndicators() {
        document.querySelectorAll('.move-indicator, .capture-indicator').forEach(el => el.remove());
    }

    handleSquareClick(square) {
        if (this.gameOver || !this.gameStarted) {
            return;
        }
        
        if (this.chess.turn() !== this.playerColor) {
            return;
        }

        const piece = this.chess.get(square);

        if (this.selectedSquare) {
            const fenBefore = this.chess.fen();
            const move = this.chess.move({
                from: this.selectedSquare,
                to: square,
                promotion: 'q'
            });

            if (move) {
                // Play sound effect for the move
                this.playSound(move);
                
                // Remove suggestion arrow when player makes a move
                this.removeSuggestionArrow();
                
                // Store move with FEN before and after for analysis
                this.moveHistory.push({
                    move: move,
                    fenBefore: fenBefore,
                    fenAfter: this.chess.fen()
                });
                
                // Check for hanging piece in practice mode
                if (this.gameMode === 'practice') {
                    console.log("Checking for hanging piece in practice mode...");                    const hangingPiece = this.detectHangingPiece();
                    if (hangingPiece) {
                        // Show popup asking if they want to undo
                        this.showHangingPiecePopup(hangingPiece, fenBefore);
                        return; // Don't continue to bot move yet
                    }
                }
                
                this.lastMove = move;
                this.selectedSquare = null;
                this.renderBoard();
                this.updateMoveList();
                this.updateStatus();
                
                // Track move for The Tester
                if (this.selectedBot === 'tester') {
                    const playerMoveSAN = move.san;
                    setTimeout(() => {
                        this.analyzePlayerMove(playerMoveSAN, fenBefore);
                    }, 100);
                } else {
                }
                
                // Switch timer to bot
                this.switchTurn();
                
                // Bot reacts to your move (occasionally, only for THE ONE ABOVE ALL)
                if (this.selectedBot === 'god' && Math.random() < 0.3) {
                    setTimeout(() => {
                        const reactions = [
                            "Hmm, an interesting choice. Flawed, but interesting.",
                            "Is that really the best you can do? How disappointing.",
                            "I see what you're trying to do. It won't work.",
                            "A bold move. Let's see if it pays off...Spoiler: it won't.",
                            "Cute. Now watch how a master responds."
                        ];
                        this.addBotMessage(reactions[Math.floor(Math.random() * reactions.length)]);
                    }, 1000);
                }

                setTimeout(() => this.makeBotMove(), 300);
                return;
            }
        }

        if (piece && piece.color === this.playerColor) {
            this.selectedSquare = square;
            this.renderBoard();
        } else {
            this.selectedSquare = null;
            this.renderBoard();
        }
    }

    undoMove() {
        // Only allow undo in practice mode
        if (this.gameMode !== 'practice') return;
        
        // Can't undo if no moves have been made
        if (this.moveHistory.length === 0) return;
        
        // Remove the last move from history
        const lastMove = this.moveHistory.pop();
        
        // Restore the position before the move
        this.chess.load(lastMove.fenBefore);
        
        // Update the display
        this.lastMove = this.moveHistory.length > 0 ? this.moveHistory[this.moveHistory.length - 1].move : null;
        this.renderBoard();
        this.updateMoveList();
        
        // Update status - it's player's turn again
        if (this.chess.turn() === this.playerColor) {
            this.statusDisplay.textContent = 'Your turn - Click a piece to move';
        } else {
            this.statusDisplay.textContent = "Engine's turn - thinking...";
        }
    }
    
    // Detect if a piece is hanging (en prise) - can be captured for free
    detectHangingPiece() {
        const moves = this.chess.moves({ verbose: true });
        
        // Check all opponent's possible captures
        const captures = moves.filter(m => m.captured);
        
        // Find pieces that can be captured
        const hangingPieces = [];
        
        for (const capture of captures) {
            const capturedPiece = this.chess.get(capture.to);
            // After player moves, it's opponent's turn
            // We want to find if opponent can capture player's pieces
            if (capturedPiece && capturedPiece.color !== this.chess.turn()) {
                hangingPieces.push({
                    piece: capturedPiece,
                    square: capture.to,
                    capturedBy: capture.from,
                    pieceName: this.getPieceName(capturedPiece.type)
                });
            }
        }
        
        // If opponent can capture 2 or more pieces, it's a fork - don't show warning
        // because there's no good move anyway
        if (hangingPieces.length >= 2) {
            console.log(' Fork detected - multiple pieces hanging, no warning shown');
            return null;
        }
        
        // Return the most valuable hanging piece (only if it's a single piece)
        if (hangingPieces.length === 1) {
            // Sort by piece value (queen > rook > bishop/knight > pawn)
            const pieceValues = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 };
            hangingPieces.sort((a, b) => pieceValues[b.piece.type] - pieceValues[a.piece.type]);
            console.log(' Hanging piece detected:', hangingPieces[0].pieceName, 'on', hangingPieces[0].square);
            return hangingPieces[0]; // Return the most valuable hanging piece
        }
        
        return null;
    }
    
    // Get piece name for display
    getPieceName(type) {
        const names = {
            'k': 'King',
            'q': 'Queen',
            'r': 'Rook',
            'b': 'Bishop',
            'n': 'Knight',
            'p': 'Pawn'
        };
        return names[type] || 'Piece';
    }
    
    // Show popup when player hangs a piece
    showHangingPiecePopup(hangingPiece, fenBefore) {
        const popup = document.createElement('div');
        popup.id = 'hangingPiecePopup';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
        `;
        
        popup.innerHTML = `
            <div style="
                background: linear-gradient(135deg, #312e2b 0%, #272522 100%);
                border: 2px solid #f44336;
                border-radius: 12px;
                padding: 30px;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 0 30px rgba(244, 67, 54, 0.5);
            ">
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
                    <h3 style="color: #f44336; margin: 0; font-size: 24px; font-weight: bold;">Warning!</h3>
                </div>
                
                <p style="color: #fff; font-size: 16px; text-align: center; margin: 0 0 10px 0; line-height: 1.5;">
                    You hung your <strong style="color: #f44336;">${hangingPiece.pieceName}</strong>!
                </p>
                <p style="color: rgba(255, 255, 255, 0.7); font-size: 14px; text-align: center; margin: 0 0 25px 0;">
                    The engine can capture it for free.
                </p>
                
                <div style="display: flex; gap: 15px;">
                    <button id="hangingPieceYes" style="
                        flex: 1;
                        padding: 12px 20px;
                        background: #f44336;
                        border: none;
                        color: #fff;
                        font-size: 16px;
                        font-weight: 600;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">Undo</button>
                    <button id="hangingPieceNo" style=
                        flex: 1;
                        padding: 12px 20px;
                        background: rgba(255, 255, 255, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        color: #fff;
                        font-size: 16px;
                        font-weight: 600;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                    ">Continue</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Add hover effects
        const yesBtn = document.getElementById('hangingPieceYes');
        const noBtn = document.getElementById('hangingPieceNo');
        
        yesBtn.onmouseover = () => yesBtn.style.background = '#d32f2f';
        yesBtn.onmouseout = () => yesBtn.style.background = '#f44336';
        noBtn.onmouseover = () => noBtn.style.background = 'rgba(255, 255, 255, 0.15)';
        noBtn.onmouseout = () => noBtn.style.background = 'rgba(255, 255, 255, 0.1)';
        
        // Yes - Undo the move
        yesBtn.onclick = () => {
            document.body.removeChild(popup);
            
            // Remove the last move from history
            this.moveHistory.pop();
            
            // Restore the position before the move
            this.chess.load(fenBefore);
            
            // Update the display
            this.lastMove = this.moveHistory.length > 0 ? this.moveHistory[this.moveHistory.length - 1].move : null;
            this.selectedSquare = null;
            this.renderBoard();
            this.updateMoveList();
            
            // Update status
            this.statusDisplay.textContent = 'Your turn - Click a piece to move';
        };
        
        // No - Continue with the move
        noBtn.onclick = () => {
            document.body.removeChild(popup);
            
            // Continue with bot's turn
            const move = this.moveHistory[this.moveHistory.length - 1].move;
            this.lastMove = move;
            this.selectedSquare = null;
            
            // Switch timer to bot
            this.switchTurn();
            
            // Make bot move (bot may or may not capture the hanging piece)
            setTimeout(() => this.makeBotMove(), 300);
        };
    }

    async makeBotMove() {
        console.log('🤖 makeBotMove called!');
        console.log('gameOver:', this.gameOver, 'gameStarted:', this.gameStarted);
        console.log('stockfish engine:', this.stockfish);
        console.log('selectedBot:', this.selectedBot);
        
        if (this.gameOver || !this.gameStarted) {
            console.log('❌ Not making move - game over or not started');
            return;
        }
        
        if (!this.stockfish) {
            console.error('❌ Stockfish engine is NULL!');
            this.statusDisplay.textContent = 'Error: Bot engine not initialized!';
            return;
        }

        // Set bot name based on selected bot or game mode
        let botName;
        if (this.gameMode === 'practice') {
            botName = 'Engine';
        } else {
            botName = this.selectedBot === 'mrstong' ? 'Mrs. Tong' : (this.selectedBot === 'tester' ? 'The Tester' : 'THE ONE ABOVE ALL');
        }
        this.statusDisplay.textContent = `${botName} is thinking...`;

        const fen = this.chess.fen();
        console.log('Current FEN:', fen);
        console.log('Sending position to stockfish...');
        
        const listener = (event) => {
            const match = event.data.match(/^bestmove\s+(\S+)/);
            if (match) {
                console.log('✅ Stockfish responded with bestmove:', match[1]);
                this.stockfish.removeEventListener('message', listener);
                
                const bestMove = match[1];
                const from = bestMove.substring(0, 2);
                const to = bestMove.substring(2, 4);
                const promotion = bestMove.length > 4 ? bestMove[4] : 'q';

                const fenBefore = this.chess.fen();
                const move = this.chess.move({ from, to, promotion });
                if (move) {
                    // Play sound effect for bot's move
                    this.playSound(move);
                    
                    this.moveHistory.push({
                        move: move,
                        fenBefore: fenBefore,
                        fenAfter: this.chess.fen()
                    });
                    
                    this.lastMove = move;
                    this.renderBoard();
                    this.updateMoveList();
                    this.updateStatus();
                    
                    // Switch timer to player
                    this.switchTurn();
                    
                    // Bot gloats occasionally (only for THE ONE ABOVE ALL)
                    if (this.selectedBot === 'god' && Math.random() < 0.25) {
                        setTimeout(() => {
                            const gloats = [
                                "Did you see that? Of course you didn't. You're still thinking three moves behind.",
                                "Another perfect move. I do this for a living, you know.",
                                "I've been training for millennia. You've been playing for minutes. Do the math.",
                                "Checkmate is inevitable. But please, continue entertaining me.",
                                "Your position weakens with each move. Mine strengthens. Guess how this ends."
                            ];
                            this.addBotMessage(gloats[Math.floor(Math.random() * gloats.length)]);
                        }, 800);
                    }
                }
            }
        };

        this.stockfish.addEventListener('message', listener);
        this.stockfish.postMessage(`position fen ${fen}`);
        console.log('✓ Position sent to stockfish');
        
        // Set difficulty based on game mode
        if (this.gameMode === 'practice') {
            // Practice mode: Use ELO-based strength (convert ELO to depth)
            // ELO 400-800: depth 1-3 (beginner)
            // ELO 800-1200: depth 4-6 (intermediate)
            // ELO 1200-1600: depth 7-10 (advanced)
            // ELO 1600-2000: depth 11-14 (expert)
            // ELO 2000-2800: depth 15-20 (master)
            let depth;
            if (this.engineElo <= 800) {
                depth = Math.max(1, Math.floor(this.engineElo / 200));
            } else if (this.engineElo <= 1200) {
                depth = 3 + Math.floor((this.engineElo - 800) / 100);
            } else if (this.engineElo <= 1600) {
                depth = 7 + Math.floor((this.engineElo - 1200) / 100);
            } else if (this.engineElo <= 2000) {
                depth = 11 + Math.floor((this.engineElo - 1600) / 100);
            } else {
                depth = 15 + Math.floor((this.engineElo - 2000) / 100);
            }
            depth = Math.min(20, Math.max(1, depth));
            console.log(`Practice mode - ELO: ${this.engineElo}, Depth: ${depth}`);
            this.stockfish.postMessage(`go depth ${depth}`);
            console.log(`✓ Sent: go depth ${depth}`);
        } else {
            // Boss battle mode: Use fixed depth per bot
            // THE ONE ABOVE ALL: depth 16 (expert level)
            // mrs.Tong: depth 10 (intermediate-advanced level)
            // The Tester: depth 8 (neutral level for rating)
            const depth = this.selectedBot === 'mrstong' ? 10 : (this.selectedBot === 'tester' ? 8 : 16);
            console.log(`Boss battle - Bot: ${this.selectedBot}, Depth: ${depth}`);
            this.stockfish.postMessage(`go depth ${depth}`);
            console.log(`✓ Sent: go depth ${depth}`);
        }
        
        // Add timeout check - if no response in 30 seconds, log error
        setTimeout(() => {
            if (this.stockfish && listener) {
                console.warn('⚠️ Stockfish has not responded in 30 seconds!');
            }
        }, 30000);
    }

    analyzePlayerMove(playerMoveSAN, fenBefore) {
        if (this.selectedBot !== 'tester') return;
        
        
        // Queue the move for batch analysis at end of game
        if (!this.ratingData.pendingMoves) {
            this.ratingData.pendingMoves = [];
        }
        this.ratingData.pendingMoves.push({
            san: playerMoveSAN,
            fen: fenBefore
        });
    }
    
    async analyzeAllMoves() {
        if (this.selectedBot !== 'tester' || !this.ratingData.pendingMoves) return;
        
        // Simple ELO estimation based on game result and move count
        const moveCount = this.ratingData.pendingMoves.length;
        
        // Determine result based on who was checkmated
        const playerLost = this.chess.in_checkmate() && this.chess.turn() === this.playerColor;
        const playerWon = this.chess.in_checkmate() && this.chess.turn() !== this.playerColor;
        const isDraw = this.chess.in_draw() || this.chess.in_stalemate() || this.chess.in_threefold_repetition();
        
        this.ratingData.moveCount = moveCount;
        
        // Base ELO starts at 1200 (intermediate)
        let baseElo = 1200;
        
        // Adjust based on game length (shorter games = less reliable)
        if (moveCount < 5) {
            baseElo = 1000; // Not enough data
        } else if (moveCount < 10) {
            baseElo = 1100;
        } else if (moveCount < 20) {
            baseElo = 1200;
        } else if (moveCount < 30) {
            baseElo = 1300;
        } else {
            baseElo = 1400;
        }
        
        // Adjust based on result
        if (playerLost) {
            baseElo -= 150; // Lost game
        } else if (playerWon) {
            baseElo += 200; // Won game
        } else if (isDraw) {
            baseElo += 50; // Drew
        }
        
        // Store simplified results
        this.ratingData.baseElo = baseElo;
        this.ratingData.result = playerLost ? 'loss' : (playerWon ? 'win' : 'draw');
        
        console.log('Simple ELO analysis complete:', this.ratingData);
    }
    
    evaluatePosition(engine, fen, playerMoveSAN) {
        return new Promise((resolve) => {
            const tempChess = new Chess(fen);
            
            // Get best move and evaluation
            engine.postMessage(`position fen ${fen}`);
            engine.postMessage('go depth 18');
            
            let bestScore = 0;
            let bestMoveUCI = '';
            
            const listener = (event) => {
                const cpMatch = event.data.match(/cp\s+(-?\d+)/);
                const bestMoveMatch = event.data.match(/^bestmove\s+(\S+)/);
                
                if (cpMatch) {
                    bestScore = parseInt(cpMatch[1]);
                }
                
                if (bestMoveMatch) {
                    engine.removeEventListener('message', listener);
                    bestMoveUCI = bestMoveMatch[1];
                    
                    // Convert player move to UCI
                    const playerMove = tempChess.move(playerMoveSAN.replace(/[+#]/g, ''));
                    if (!playerMove) {
                        resolve({ centipawnLoss: 300 });
                        return;
                    }
                    
                    const playerMoveUCI = playerMove.from + playerMove.to;
                    
                    // Calculate centipawn loss
                    let centipawnLoss = 0;
                    
                    if (playerMoveUCI === bestMoveUCI) {
                        centipawnLoss = 0; // Played the best move!
                    } else {
                        // Get evaluation after player's move
                        tempChess.move(playerMoveSAN.replace(/[+#]/g, ''));
                        const fenAfter = tempChess.fen();
                        
                        engine.postMessage(`position fen ${fenAfter}`);
                        engine.postMessage('go depth 18');
                        
                        const afterListener = (event2) => {
                            const afterCpMatch = event2.data.match(/cp\s+(-?\d+)/);
                            const afterBestMatch = event2.data.match(/^bestmove/);
                            
                            if (afterCpMatch && afterBestMatch) {
                                engine.removeEventListener('message', afterListener);
                                const afterScore = parseInt(afterCpMatch[1]);
                                
                                // Centipawn loss is the difference
                                centipawnLoss = Math.abs(bestScore - afterScore);
                                centipawnLoss = Math.min(centipawnLoss, 500); // Cap at 500
                                
                                resolve({ centipawnLoss });
                            }
                        };
                        
                        engine.addEventListener('message', afterListener);
                        return;
                    }
                    
                    resolve({ centipawnLoss });
                }
            };
            
            engine.addEventListener('message', listener);
        });
    }
    
    getMoveSAN(fen, moveUCI) {
        const tempChess = new Chess(fen);
        const from = moveUCI.substring(0, 2);
        const to = moveUCI.substring(2, 4);
        const promotion = moveUCI.length > 4 ? moveUCI[4] : undefined;
        
        const move = tempChess.move({ from, to, promotion });
        return move ? move.san : '';
    }
    
    calculateELO() {
        if (this.ratingData.moveCount < 3) {
            return null;
        }
        
        const elo = this.ratingData.baseElo;
        const result = this.ratingData.result;
        
        // Level determination
        let level, levelEmoji, description;
        if (elo >= 2000) {
            level = 'Expert';
            levelEmoji = '🏆';
            description = 'Exceptional play! Deep strategic understanding.';
        } else if (elo >= 1700) {
            level = 'Advanced';
            levelEmoji = '💪';
            description = 'Strong tactical skills and positional awareness.';
        } else if (elo >= 1300) {
            level = 'Intermediate';
            levelEmoji = '🎯';
            description = 'Good fundamentals, room for growth.';
        } else if (elo >= 800) {
            level = 'Beginner';
            levelEmoji = '��';
            description = 'Learning the basics, keep practicing!';
        } else {
            level = 'Novice';
            levelEmoji = '🌱';
            description = 'Just starting out, everyone begins here!';
        }
        
        // Result message
        let resultMsg;
        if (result === 'win') resultMsg = '✅ You won!';
        else if (result === 'loss') resultMsg = '❌ You lost';
        else resultMsg = '🤝 Draw';
        
        return {
            elo: Math.round(elo),
            eloRange: `${Math.round(elo - 75)}-${Math.round(elo + 75)}`,
            level: level,
            levelEmoji: levelEmoji,
            description: description,
            totalMoves: this.ratingData.moveCount,
            result: resultMsg
        };
    }
    
    showRatingModal() {
        
        const result = this.calculateELO();
        if (!result) {
            alert('Not enough moves to estimate ELO. Play at least 3 moves.');
            return;
        }
        
        
        const ratingResult = document.getElementById('ratingResult');
        ratingResult.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 48px; margin-bottom: 10px;">${result.levelEmoji}</div>
                <div style="font-size: 24px; color: #4CAF50; font-weight: bold; margin-bottom: 5px;">${result.level}</div>
                <div style="font-size: 36px; color: #fff; font-weight: bold; margin: 15px 0;">ELO: ${result.elo}</div>
                <div style="font-size: 16px; color: #aaa; margin-bottom: 10px;">Range: ${result.eloRange}</div>
                <div style="font-size: 18px; color: #fff; margin-bottom: 10px;">${result.result}</div>
            </div>
            
            <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <div style="color: #aaa; font-size: 14px; margin-bottom: 10px;">Game Summary</div>
                <div style="color: #fff; font-size: 16px;">📊 Moves played: ${result.totalMoves}</div>
            </div>
            
            <div style="color: #ddd; font-size: 14px; line-height: 1.6; padding: 10px; background: rgba(255, 255, 255, 0.05); border-radius: 6px;">
                ${result.description}
            </div>
            
            <div style="color: #888; font-size: 12px; margin-top: 15px; text-align: center;">
                Estimated based on ${result.totalMoves} moves
            </div>
        `;
        
        document.getElementById('ratingModal').style.display = 'flex';
    }

    renderCoordinates() {
        const ranksLeft = document.getElementById('ranksLeft');
        const filesBottom = document.getElementById('filesBottom');
        
        if (!ranksLeft || !filesBottom) return;
        
        ranksLeft.innerHTML = '';
        filesBottom.innerHTML = '';
        
        // Determine orientation based on player color
        const isFlipped = this.playerColor === 'b';
        
        if (isFlipped) {
            // Board is flipped, show coordinates accordingly
            for (let i = 0; i < 8; i++) {
                const rank = document.createElement('div');
                rank.textContent = i + 1;
                ranksLeft.appendChild(rank);
            }
            
            const files = ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
            files.forEach(file => {
                const fileEl = document.createElement('div');
                fileEl.textContent = file;
                filesBottom.appendChild(fileEl);
            });
        } else {
            // Normal orientation
            for (let i = 8; i >= 1; i--) {
                const rank = document.createElement('div');
                rank.textContent = i;
                ranksLeft.appendChild(rank);
            }
            
            const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            files.forEach(file => {
                const fileEl = document.createElement('div');
                fileEl.textContent = file;
                filesBottom.appendChild(fileEl);
            });
        }
    }

    updateMoveList() {
        const history = this.chess.history();
        this.movesList.innerHTML = '';

        for (let i = 0; i < history.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const moveRow = document.createElement('div');
            moveRow.className = 'move-row';
            
            // Highlight current move in analysis mode
            if (this.analysisMode && (i === this.currentMoveIndex || i + 1 === this.currentMoveIndex)) {
                moveRow.classList.add('active-move');
            }

            // White move with annotation
            let whiteMoveHtml = history[i];
            if (this.annotations && this.annotations[i]) {
                const annot = this.getAnnotationSymbol(this.annotations[i]);
                if (annot) {
                    // Only make bad moves clickable (blunder, mistake, inaccuracy)
                    const isBadMove = ['blunder', 'mistake', 'inaccuracy', 'missedWin'].includes(this.annotations[i]);
                    if (isBadMove) {
                        whiteMoveHtml = `<span class="move-with-annotation">${history[i]}<span class="move-annotation ${annot.class}" data-move-index="${i}" onclick="chessGame.showAnnotationPopup(${i}, '${annot.symbol}', '${this.annotations[i]}')">${annot.symbol}</span></span>`;
                    } else {
                        // Good moves - just show symbol, not clickable
                        whiteMoveHtml = `<span class="move-with-annotation">${history[i]}<span class="move-annotation ${annot.class}">${annot.symbol}</span></span>`;
                    }
                }
            }

            // Black move with annotation
            let blackMoveHtml = history[i + 1] || '';
            if (this.annotations && this.annotations[i + 1]) {
                const annot = this.getAnnotationSymbol(this.annotations[i + 1]);
                if (annot) {
                    // Only make bad moves clickable (blunder, mistake, inaccuracy)
                    const isBadMove = ['blunder', 'mistake', 'inaccuracy', 'missedWin'].includes(this.annotations[i + 1]);
                    if (isBadMove) {
                        blackMoveHtml = `<span class="move-with-annotation">${history[i + 1]}<span class="move-annotation ${annot.class}" data-move-index="${i + 1}" onclick="chessGame.showAnnotationPopup(${i + 1}, '${annot.symbol}', '${this.annotations[i + 1]}')">${annot.symbol}</span></span>`;
                    } else {
                        // Good moves - just show symbol, not clickable
                        blackMoveHtml = `<span class="move-with-annotation">${history[i + 1]}<span class="move-annotation ${annot.class}">${annot.symbol}</span></span>`;
                    }
                }
            }

            moveRow.innerHTML = `
                <span class="move-number">${moveNumber}.</span>
                <span class="move-white">${whiteMoveHtml}</span>
                <span class="move-black">${blackMoveHtml}</span>
            `;

            this.movesList.appendChild(moveRow);
        }

        this.movesList.scrollTop = this.movesList.scrollHeight;
    }

    // Check if 6 months have passed since last Tester reminder
    checkTesterReminder() {
        const now = new Date();
        const sixMonthsInMillis = 6 * 30 * 24 * 60 * 60 * 1000; // Approximately 6 months
        
        if (!this.lastTesterReminder || (now - new Date(this.lastTesterReminder)) > sixMonthsInMillis) {
            this.showTesterReminderPopup();
        }
    }
    
    // Show Tester reminder popup
    showTesterReminderPopup() {
        const popup = document.createElement('div');
        popup.id = 'testerReminderPopup';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const testerELO = this.estimatedTesterELO;
        const userELO = this.userCurrentELO;
        const boostedELO = Math.round((testerELO - userELO) / 2 + userELO);
        
        // Get display name from localStorage or fallback
        const username = localStorage.getItem('displayName') || 
            ((typeof currentUser !== 'undefined' && currentUser && currentUser.email) 
                ? currentUser.email.split('@')[0] 
                : 'Player');
        
        popup.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 40px; border-radius: 15px; border: 2px solid #0f3460; max-width: 500px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <h2 style="color: #e94560; margin-bottom: 20px; font-size: 28px;">🧪 The Tester Wants to Challenge You, ${username}!</h2>
                <p style="color: #fff; font-size: 16px; margin-bottom: 15px;">It's been 6 months since your last rating check.</p>
                <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <p style="color: #4CAF50; font-size: 18px; margin: 10px 0;">The Tester's ELO: <strong>${testerELO}</strong></p>
                    <p style="color: #2196F3; font-size: 18px; margin: 10px 0;">${username}'s Current ELO: <strong>${userELO}</strong></p>
                    <p style="color: #FFD700; font-size: 20px; margin: 15px 0; font-weight: bold;">Potential Boost: ${boostedELO} ELO</p>
                </div>
                <p style="color: #aaa; font-size: 14px; margin-bottom: 25px;">Play against The Tester to get your new rating estimate and potential ELO boost!</p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="acceptTesterBtn" style="padding: 15px 30px; background: linear-gradient(135deg, #e94560, #c23152); border: none; border-radius: 8px; color: #fff; font-size: 16px; font-weight: 600; cursor: pointer;">Accept Challenge</button>
                    <button id="dismissTesterBtn" style="padding: 15px 30px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: #fff; font-size: 16px; cursor: pointer;">Maybe Later</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Add event listeners
        document.getElementById('acceptTesterBtn').addEventListener('click', () => this.acceptTesterChallenge());
        document.getElementById('dismissTesterBtn').addEventListener('click', () => this.dismissTesterReminder());
    }
    
    // Accept Tester challenge
    acceptTesterChallenge() {
        const popup = document.getElementById('testerReminderPopup');
        if (popup) popup.remove();
        
        // Update last reminder date
        this.lastTesterReminder = new Date().toISOString();
        localStorage.setItem('lastTesterReminder', this.lastTesterReminder);
        
        // Start a game against The Tester
        this.selectedBot = 'tester';
        this.playerColor = 'w';
        this.timerMode = 'infinite';
        this.updateBotDisplay();
        this.startGame();
    }
    
    // Dismiss Tester reminder
    dismissTesterReminder() {
        const popup = document.getElementById('testerReminderPopup');
        if (popup) popup.remove();
        
        // Set reminder for 1 month from now (so it doesn't annoy too much)
        const oneMonthLater = new Date();
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
        localStorage.setItem('lastTesterReminder', oneMonthLater.toISOString());
    }
    
    // Calculate ELO boost after playing The Tester
    calculateELOBoost(testerEstimatedELO) {
        const userELO = this.userCurrentELO;
        const boostedELO = Math.round((testerEstimatedELO - userELO) / 2 + userELO);
        
        // Only boost if the estimated ELO is higher
        if (testerEstimatedELO > userELO) {
            this.userCurrentELO = boostedELO;
            localStorage.setItem('userELO', boostedELO.toString());
            localStorage.setItem('testerEstimatedELO', testerEstimatedELO.toString());
            
            // Update sidebar ELO display
            const sidebarELO = document.getElementById('sidebarELO');
            if (sidebarELO) {
                sidebarELO.textContent = `Rating: ${boostedELO}`;
            }
            
            // Show boost notification
            setTimeout(() => {
                alert(`🎉 ELO Boost Applied!\n\nYour new ELO: ${boostedELO}\n(Previous: ${userELO})\n\nThe Tester estimated your skill at ${testerEstimatedELO}, so you received a boost of ${boostedELO - userELO} points!`);
            }, 500);
        } else {
            // No boost needed - your ELO is already higher than the estimate
            localStorage.setItem('testerEstimatedELO', testerEstimatedELO.toString());
            
            // Update sidebar ELO display
            const sidebarELO = document.getElementById('sidebarELO');
            if (sidebarELO) {
                sidebarELO.textContent = `Rating: ${userELO}`;
            }
            
            setTimeout(() => {
                alert(`The Tester estimated your ELO at ${testerEstimatedELO}.\n\nYour current ELO (${userELO}) is already higher, so no boost is applied.\n\nKeep playing to improve! 💪`);
            }, 500);
        }
    }

    // Check if 6 months have passed since last Tester reminder
    checkTesterReminder() {
        const now = new Date();
        const sixMonthsInMillis = 6 * 30 * 24 * 60 * 60 * 1000; // Approximately 6 months
        
        if (!this.lastTesterReminder || (now - new Date(this.lastTesterReminder)) > sixMonthsInMillis) {
            this.showTesterReminderPopup();
        }
    }
    
    // Show Tester reminder popup
    showTesterReminderPopup() {
        const popup = document.createElement('div');
        popup.id = 'testerReminderPopup';
        popup.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const testerELO = this.estimatedTesterELO;
        const userELO = this.userCurrentELO;
        const boostedELO = Math.round((testerELO - userELO) / 2 + userELO);
        
        // Get display name from localStorage or fallback
        const username = localStorage.getItem('displayName') || 
            ((typeof currentUser !== 'undefined' && currentUser && currentUser.email) 
                ? currentUser.email.split('@')[0] 
                : 'Player');
        
        popup.innerHTML = `
            <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 40px; border-radius: 15px; border: 2px solid #0f3460; max-width: 500px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <h2 style="color: #e94560; margin-bottom: 20px; font-size: 28px;">🧪 The Tester Wants to Challenge You, ${username}!</h2>
                <p style="color: #fff; font-size: 16px; margin-bottom: 15px;">It's been 6 months since your last rating check.</p>
                <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <p style="color: #4CAF50; font-size: 18px; margin: 10px 0;">The Tester's ELO: <strong>${testerELO}</strong></p>
                    <p style="color: #2196F3; font-size: 18px; margin: 10px 0;">${username}'s Current ELO: <strong>${userELO}</strong></p>
                    <p style="color: #FFD700; font-size: 20px; margin: 15px 0; font-weight: bold;">Potential Boost: ${boostedELO} ELO</p>
                </div>
                <p style="color: #aaa; font-size: 14px; margin-bottom: 25px;">Play against The Tester to get your new rating estimate and potential ELO boost!</p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="acceptTesterBtn" style="padding: 15px 30px; background: linear-gradient(135deg, #e94560, #c23152); border: none; border-radius: 8px; color: #fff; font-size: 16px; font-weight: 600; cursor: pointer;">Accept Challenge</button>
                    <button id="dismissTesterBtn" style="padding: 15px 30px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: #fff; font-size: 16px; cursor: pointer;">Maybe Later</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Add event listeners
        document.getElementById('acceptTesterBtn').addEventListener('click', () => this.acceptTesterChallenge());
        document.getElementById('dismissTesterBtn').addEventListener('click', () => this.dismissTesterReminder());
    }
    
    // Accept Tester challenge
    acceptTesterChallenge() {
        const popup = document.getElementById('testerReminderPopup');
        if (popup) popup.remove();
        
        // Update last reminder date
        this.lastTesterReminder = new Date().toISOString();
        localStorage.setItem('lastTesterReminder', this.lastTesterReminder);
        
        // Start a game against The Tester
        this.selectedBot = 'tester';
        this.playerColor = 'w';
        this.timerMode = 'infinite';
        this.updateBotDisplay();
        this.startGame();
    }
    
    // Dismiss Tester reminder
    dismissTesterReminder() {
        const popup = document.getElementById('testerReminderPopup');
        if (popup) popup.remove();
        
        // Set reminder for 1 month from now (so it doesn't annoy too much)
        const oneMonthLater = new Date();
        oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
        localStorage.setItem('lastTesterReminder', oneMonthLater.toISOString());
    }
    
    // Calculate ELO boost after playing The Tester
    calculateELOBoost(testerEstimatedELO) {
        const userELO = this.userCurrentELO;
        const boostedELO = Math.round((testerEstimatedELO - userELO) / 2 + userELO);
        
        // Only boost if the estimated ELO is higher
        if (testerEstimatedELO > userELO) {
            this.userCurrentELO = boostedELO;
            localStorage.setItem('userELO', boostedELO.toString());
            localStorage.setItem('testerEstimatedELO', testerEstimatedELO.toString());
            
            // Update sidebar ELO display
            const sidebarELO = document.getElementById('sidebarELO');
            if (sidebarELO) {
                sidebarELO.textContent = `Rating: ${boostedELO}`;
            }
            
            // Show boost notification
            setTimeout(() => {
                alert(`🎉 ELO Boost Applied!\n\nYour new ELO: ${boostedELO}\n(Previous: ${userELO})\n\nThe Tester estimated your skill at ${testerEstimatedELO}, so you received a boost of ${boostedELO - userELO} points!`);
            }, 500);
        } else {
            // No boost needed - your ELO is already higher than the estimate
            localStorage.setItem('testerEstimatedELO', testerEstimatedELO.toString());
            
            // Update sidebar ELO display
            const sidebarELO = document.getElementById('sidebarELO');
            if (sidebarELO) {
                sidebarELO.textContent = `Rating: ${userELO}`;
            }
            
            setTimeout(() => {
                alert(`The Tester estimated your ELO at ${testerEstimatedELO}.\n\nYour current ELO (${userELO}) is already higher, so no boost is applied.\n\nKeep playing to improve! 💪`);
            }, 500);
        }
    }

    updateStatus() {
        console.log('updateStatus called, game_over:', this.chess.game_over());
        if (this.chess.game_over()) {
            console.log('Game is over! Calling handleGameOver');
            this.gameOver = true;
            this.handleGameOver();
            return;
        }

        // Detect opening
        this.openingName = this.detectOpening();
        
        const botName = this.selectedBot === 'mrstong' ? "Mrs. Tong's" : (this.selectedBot === 'tester' ? "The Tester's" : "THE ONE ABOVE ALL's");
        const turn = this.chess.turn() === this.playerColor ? 'Your' : (this.gameMode === 'practice' ? "Engine's" : botName);
        const inCheck = this.chess.in_check() ? ' - CHECK!' : '';
        
        console.log('updateStatus - chess.turn():', this.chess.turn(), 'playerColor:', this.playerColor, 'display turn:', turn);
        this.statusDisplay.textContent = `${turn} turn${inCheck}`;
        
        // Update opening display
        const openingDisplay = document.getElementById('openingDisplay');
        if (openingDisplay && this.openingName) {
            openingDisplay.innerHTML = `📖 ${this.openingName}`;
        } else if (openingDisplay) {
            openingDisplay.innerHTML = '';
        }
        
        // Update win probability after each move
        this.updateWinProbability();
    }

    async handleGameOver() {
        // Stop the timer when game ends
        this.stopTimer();
        
        // Stop background music when game ends
        this.stopBackgroundMusic();
        
        let title, message;
        let botDisplayName;
        
        // Set bot display name based on game mode
        if (this.gameMode === 'practice') {
            botDisplayName = 'The engine';
        } else {
            botDisplayName = this.getBotDisplayName();
        }

        if (this.chess.in_checkmate()) {
            const matePattern = this.detectCheckmatePattern();
            
            if (this.chess.turn() !== this.playerColor) {
                title = '🎉 Victory!';
                message = `You checkmated ${botDisplayName}! Incredible game!`;
                if (matePattern) {
                    message += `\n\nCheckmate Pattern: ${matePattern}`;
                }
                this.triggerConfetti();
            } else {
                title = 'Defeat';
                message = `${botDisplayName} checkmated you.`;
                if (matePattern) {
                    message += `\n\nCheckmate Pattern: ${matePattern}`;
                } else {
                    message += ' Better luck next time!';
                }
            }
        } else if (this.chess.in_draw()) {
            title = 'Draw';
            message = 'The game ended in a draw.';
        } else if (this.chess.in_stalemate()) {
            title = 'Stalemate';
            message = 'The game ended in a stalemate.';
        }

        const modal = document.getElementById('gameOverModal');
        document.getElementById('gameOverTitle').textContent = title;
        document.getElementById('gameOverMessage').textContent = message;
        modal.style.display = 'flex';

        // Show rating modal for The Tester
        console.log('handleGameOver - checking if tester, selectedBot:', this.selectedBot);
        if (this.selectedBot === 'tester') {
            console.log('The Tester game over! pendingMoves:', this.ratingData.pendingMoves?.length || 0);
            
            try {
                console.log('Starting analyzeAllMoves...');
                await this.analyzeAllMoves();
                console.log('analyzeAllMoves completed');
                setTimeout(() => {
                    console.log('Showing rating modal now...');
                    this.showRatingModal();
                    
                    // After showing rating, calculate ELO boost
                    const estimatedELO = this.ratingData.estimatedELO || 1200;
                    setTimeout(() => {
                        this.calculateELOBoost(estimatedELO);
                    }, 2000);
                }, 500);
            } catch (error) {
                console.error('Error during ELO analysis:', error);
                console.error('Error stack:', error.stack);
                // Show error message
                alert('Error calculating ELO: ' + error.message);
            }
        } else {
            console.log('Not The Tester, skipping ELO analysis');
        }

        // Auto-analyze when game ends
        if (this.moveHistory.length > 0) {
            await this.analyzeGame();
        }
    }

    triggerConfetti() {
        const duration = 3000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#4CAF50', '#FFD700', '#2196F3', '#9C27B0']
            });
            
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#4CAF50', '#FFD700', '#2196F3', '#9C27B0']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }

    setupEventListeners() {
        // Save reference to 'this' for use in window functions
        const gameInstance = this;
        
        // Make gameInstance available globally for other functions
        window.chessGame = this;
        
        document.getElementById('newGame').addEventListener('click', () => this.resetGame());
        document.getElementById('playAgain').addEventListener('click', () => {
            document.getElementById('gameOverModal').style.display = 'none';
            this.resetGame();
        });
        document.getElementById('reviewGame').addEventListener('click', () => {
            document.getElementById('gameOverModal').style.display = 'none';
            this.analyzeGame();
        });
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyzeGame());
        document.getElementById('undoBtn').addEventListener('click', () => this.undoMove());
        
        // Rating modal close button
        document.getElementById('closeRatingModal').addEventListener('click', () => {
            document.getElementById('ratingModal').style.display = 'none';
        });
        
        // Sidebar menu functions
        window.togglePlayMenu = () => {
            const submenu = document.getElementById('playSubmenu');
            const arrow = document.getElementById('playArrow');
            const playMenu = document.getElementById('menuPlay');
            
            if (submenu.style.display === 'none' || submenu.style.display === '') {
                submenu.style.display = 'block';
                arrow.style.transform = 'rotate(90deg)';
                playMenu.style.background = 'rgba(255, 255, 255, 0.12)';
            } else {
                submenu.style.display = 'none';
                arrow.style.transform = 'rotate(0deg)';
                playMenu.style.background = 'rgba(255, 255, 255, 0.08)';
            }
        };
        
        // Tutorial functions
        window.showTutorialStep = (step) => {
            // Hide all steps
            document.querySelectorAll('.tutorial-step').forEach(el => {
                el.style.display = 'none';
            });
            
            // Show selected step
            const selectedStep = document.querySelector(`.tutorial-step[data-step="${step}"]`);
            if (selectedStep) {
                selectedStep.style.display = 'block';
            }
            
            // Update navigation buttons
            document.querySelectorAll('.tutorial-nav-btn').forEach(btn => {
                const btnStep = parseInt(btn.dataset.step);
                if (btnStep === step) {
                    btn.style.background = '#769656';
                    btn.style.border = 'none';
                    btn.style.fontWeight = '600';
                } else {
                    btn.style.background = 'rgba(255, 255, 255, 0.1)';
                    btn.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                    btn.style.fontWeight = '400';
                }
            });
        };
        
        window.closeTutorial = () => {
            document.getElementById('chessTutorialModal').style.display = 'none';
            // Mark tutorial as completed in localStorage
            localStorage.setItem('chessTutorialCompleted', 'true');
        };
        
        window.showTutorial = () => {
            document.getElementById('chessTutorialModal').style.display = 'flex';
            // Reset to step 1
            showTutorialStep(1);
        };
        
        // Close tutorial button
        document.getElementById('closeTutorialBtn').addEventListener('click', closeTutorial);
        
        // Navigation button clicks
        document.querySelectorAll('.tutorial-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const step = parseInt(btn.dataset.step);
                showTutorialStep(step);
            });
        });
        
        // Show piece movement example on mini board
        window.showPieceExample = (pieceType) => {
            const boardContainer = document.getElementById('boardExample1');
            const board = document.getElementById('pieceBoard');
            const explanation = document.getElementById('pieceExplanation');
            
            if (!boardContainer || !board || !explanation) return;
            
            // Show the board container
            boardContainer.style.display = 'block';
            
            // Clear the board
            board.innerHTML = '';
            
            // Create 8x8 board
            const squares = [];
            for (let row = 0; row < 8; row++) {
                for (let col = 0; col < 8; col++) {
                    const square = document.createElement('div');
                    const isLight = (row + col) % 2 === 0;
                    square.style.width = '40px';
                    square.style.height = '40px';
                    square.style.backgroundColor = isLight ? '#f0d9b5' : '#b58863';
                    square.style.display = 'flex';
                    square.style.alignItems = 'center';
                    square.style.justifyContent = 'center';
                    square.style.fontSize = '28px';
                    square.style.position = 'relative';
                    squares.push({ element: square, row, col });
                    board.appendChild(square);
                }
            }
            
            // Position piece and show movement based on type
            let piece, validMoves, explanationText;
            
            switch(pieceType) {
                case 'king':
                    piece = '♔';
                    // Place king on e4 (row 4, col 4 in 0-indexed from top)
                    const kingRow = 4, kingCol = 4;
                    squares.find(s => s.row === kingRow && s.col === kingCol).element.textContent = piece;
                    // Show valid moves (1 square in any direction)
                    const kingMoves = [
                        [3, 3], [3, 4], [3, 5],
                        [4, 3],          [4, 5],
                        [5, 3], [5, 4], [5, 5]
                    ];
                    kingMoves.forEach(([r, c]) => {
                        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                            const marker = document.createElement('div');
                            marker.style.width = '12px';
                            marker.style.height = '12px';
                            marker.style.borderRadius = '50%';
                            marker.style.backgroundColor = 'rgba(118, 150, 86, 0.6)';
                            squares.find(s => s.row === r && s.col === c).element.appendChild(marker);
                        }
                    });
                    explanationText = '♔ <strong>King</strong> on e4 can move to any adjacent square (green dots). It moves 1 square in any direction - horizontally, vertically, or diagonally.';
                    break;
                    
                case 'queen':
                    piece = '♕';
                    const queenRow = 3, queenCol = 3;
                    squares.find(s => s.row === queenRow && s.col === queenCol).element.textContent = piece;
                    // Show queen moves (all directions)
                    for (let i = 0; i < 8; i++) {
                        // Horizontal
                        if (i !== queenCol) squares.find(s => s.row === queenRow && s.col === i).element.innerHTML += '<div style="width:12px;height:12px;border-radius:50%;background:rgba(118,150,86,0.6);position:absolute;"></div>';
                        // Vertical
                        if (i !== queenRow) squares.find(s => s.row === i && s.col === queenCol).element.innerHTML += '<div style="width:12px;height:12px;border-radius:50%;background:rgba(118,150,86,0.6);position:absolute;"></div>';
                        // Diagonals
                        if (queenRow + (i - queenRow) >= 0 && queenRow + (i - queenRow) < 8 && i >= 0 && i < 8 && i !== queenCol) {
                            squares.find(s => s.row === queenRow + (i - queenRow) && s.col === i).element.innerHTML += '<div style="width:12px;height:12px;border-radius:50%;background:rgba(118,150,86,0.6);position:absolute;"></div>';
                        }
                        if (queenRow - (i - queenRow) >= 0 && queenRow - (i - queenRow) < 8 && i >= 0 && i < 8 && i !== queenCol) {
                            squares.find(s => s.row === queenRow - (i - queenRow) && s.col === i).element.innerHTML += '<div style="width:12px;height:12px;border-radius:50%;background:rgba(118,150,86,0.6);position:absolute;"></div>';
                        }
                    }
                    explanationText = '♕ <strong>Queen</strong> on d5 can move any number of squares in any direction - horizontal, vertical, or diagonal. The most powerful piece!';
                    break;
                    
                case 'rook':
                    piece = '♖';
                    const rookRow = 3, rookCol = 3;
                    squares.find(s => s.row === rookRow && s.col === rookCol).element.textContent = piece;
                    // Show rook moves (horizontal and vertical)
                    for (let i = 0; i < 8; i++) {
                        if (i !== rookCol) squares.find(s => s.row === rookRow && s.col === i).element.innerHTML += '<div style="width:12px;height:12px;border-radius:50%;background:rgba(118,150,86,0.6);position:absolute;"></div>';
                        if (i !== rookRow) squares.find(s => s.row === i && s.col === rookCol).element.innerHTML += '<div style="width:12px;height:12px;border-radius:50%;background:rgba(118,150,86,0.6);position:absolute;"></div>';
                    }
                    explanationText = '♖ <strong>Rook</strong> on d5 can move any number of squares horizontally or vertically (green dots). Very powerful in open positions!';
                    break;
                    
                case 'bishop':
                    piece = '♗';
                    const bishopRow = 3, bishopCol = 3;
                    squares.find(s => s.row === bishopRow && s.col === bishopCol).element.textContent = piece;
                    // Show bishop moves (diagonals only)
                    for (let i = -7; i <= 7; i++) {
                        if (i === 0) continue;
                        // Diagonal 1: row+i, col+i
                        const r1 = bishopRow + i, c1 = bishopCol + i;
                        if (r1 >= 0 && r1 < 8 && c1 >= 0 && c1 < 8) {
                            squares.find(s => s.row === r1 && s.col === c1).element.innerHTML += '<div style="width:12px;height:12px;border-radius:50%;background:rgba(118,150,86,0.6);position:absolute;"></div>';
                        }
                        // Diagonal 2: row+i, col-i
                        const r2 = bishopRow + i, c2 = bishopCol - i;
                        if (r2 >= 0 && r2 < 8 && c2 >= 0 && c2 < 8) {
                            squares.find(s => s.row === r2 && s.col === c2).element.innerHTML += '<div style="width:12px;height:12px;border-radius:50%;background:rgba(118,150,86,0.6);position:absolute;"></div>';
                        }
                    }
                    explanationText = '♗ <strong>Bishop</strong> on d5 can move any number of squares diagonally (green dots). Each bishop stays on its color (light or dark squares).';
                    break;
                    
                case 'knight':
                    piece = '♘';
                    const knightRow = 3, knightCol = 3;
                    squares.find(s => s.row === knightRow && s.col === knightCol).element.textContent = piece;
                    // Show knight moves (L-shape)
                    const knightMoves = [
                        [1, 2], [1, -2], [-1, 2], [-1, -2],
                        [2, 1], [2, -1], [-2, 1], [-2, -1]
                    ];
                    knightMoves.forEach(([dr, dc]) => {
                        const r = knightRow + dr, c = knightCol + dc;
                        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                            squares.find(s => s.row === r && s.col === c).element.innerHTML += '<div style="width:12px;height:12px;border-radius:50%;background:rgba(118,150,86,0.6);position:absolute;"></div>';
                        }
                    });
                    explanationText = '♘ <strong>Knight</strong> on d5 moves in an "L" shape: 2 squares in one direction, then 1 square perpendicular (green dots). The ONLY piece that can jump over others!';
                    break;
                    
                case 'pawn':
                    piece = '♙';
                    const pawnRow = 6, pawnCol = 4; // e2
                    squares.find(s => s.row === pawnRow && s.col === pawnCol).element.textContent = piece;
                    // Show pawn moves (forward 1 or 2 squares)
                    squares.find(s => s.row === 5 && s.col === 4).element.innerHTML += '<div style="width:12px;height:12px;border-radius:50%;background:rgba(118,150,86,0.6);position:absolute;"></div>';
                    squares.find(s => s.row === 4 && s.col === 4).element.innerHTML += '<div style="width:12px;height:12px;border-radius:50%;background:rgba(118,150,86,0.6);position:absolute;"></div>';
                    // Show capture moves (diagonal)
                    if (pawnCol - 1 >= 0) {
                        squares.find(s => s.row === 5 && s.col === 3).element.innerHTML += '<div style="width:12px;height:12px;border-radius:50%;background:rgba(244,67,54,0.6);position:absolute;"></div>';
                    }
                    if (pawnCol + 1 < 8) {
                        squares.find(s => s.row === 5 && s.col === 5).element.innerHTML += '<div style="width:12px;height:12px;border-radius:50%;background:rgba(244,67,54,0.6);position:absolute;"></div>';
                    }
                    explanationText = '♙ <strong>Pawn</strong> on e2: <span style="color:#769656;">● Green dots</span> = move forward (1 or 2 squares on first move). <span style="color:#f44336;">● Red dots</span> = capture diagonally. Pawns move forward but capture diagonally!';
                    break;
            }
            
            explanation.innerHTML = explanationText;
            
            // Scroll to board
            boardContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
        
        window.showPlaySection = () => {
            // Don't show the left playSection anymore - use Chess.com sidebar instead
            // document.getElementById('playSection').style.display = 'block';
            document.getElementById('sidebarMenu').style.left = '-180px';
            // Show Chess.com-style right sidebar for Boss Battle
            const chessSidebar = document.getElementById('chessSidebar');
            if (chessSidebar) chessSidebar.style.display = 'block';
        };
        
        window.closePlaySection = () => {
            document.getElementById('playSection').style.display = 'none';
            document.getElementById('sidebarMenu').style.left = '0';
            // Hide Chess.com-style right sidebar when closing Boss Battle
            const chessSidebar = document.getElementById('chessSidebar');
            if (chessSidebar) chessSidebar.style.display = 'none';
            // Close submenu
            document.getElementById('playSubmenu').style.display = 'none';
            document.getElementById('playArrow').style.transform = 'rotate(0deg)';
            document.getElementById('menuPlay').style.background = 'rgba(255, 255, 255, 0.08)';
        };
        
        window.showPracticeSection = () => {
            document.getElementById('practiceSection').style.display = 'block';
            document.getElementById('sidebarMenu').style.left = '-180px';
            // Hide Chess.com-style right sidebar
            const chessSidebar = document.getElementById('chessSidebar');
            if (chessSidebar) chessSidebar.style.display = 'none';
        };
        
        window.closePracticeSection = () => {
            document.getElementById('practiceSection').style.display = 'none';
            document.getElementById('sidebarMenu').style.left = '0';
            // Show Chess.com-style right sidebar
            const chessSidebar = document.getElementById('chessSidebar');
            if (chessSidebar) chessSidebar.style.display = 'block';
            // Close submenu
            document.getElementById('playSubmenu').style.display = 'none';
            document.getElementById('playArrow').style.transform = 'rotate(0deg)';
            document.getElementById('menuPlay').style.background = 'rgba(255, 255, 255, 0.08)';
        };
        
        window.showLearnSection = () => {
            document.getElementById('learnSection').style.display = 'block';
            document.getElementById('sidebarMenu').style.left = '-180px';
            // Render the openings
            if (window.renderLearnSection) {
                window.renderLearnSection();
            }
        };
        
        window.updateEngineElo = (value) => {
            document.getElementById('engineEloDisplay').textContent = value;
        };
        
        window.setEngineElo = (elo) => {
            document.getElementById('engineEloSlider').value = elo;
            document.getElementById('engineEloDisplay').textContent = elo;
        };
        
        window.selectBoss = (boss) => {
            console.log('selectBoss called with:', boss);
            window.chessGame.selectedBot = boss;
            console.log('Set selectedBot to:', window.chessGame.selectedBot);
            
            // Update the selected bot display at the top
            const selectedDisplay = document.getElementById('selectedBotDisplay');
            console.log('Found selectedDisplay:', !!selectedDisplay);
            if (selectedDisplay) {
                const botInfo = {
                    god: { emoji: '🤖', name: 'THE ONE ABOVE ALL', info: 'Expert | 2800+' },
                    mrstong: { emoji: '👩', name: 'Mrs. Tong', info: 'Int-Adv | 1800-2000' },
                    tester: { emoji: '🧪', name: 'The Tester', info: 'Estimate ELO' }
                };
                
                const info = botInfo[boss] || botInfo.god;
                console.log('Updating display to:', info.name);
                selectedDisplay.innerHTML = `
                    <div style="font-size: 48px; margin-bottom: 8px;">${info.emoji}</div>
                    <div style="color: #fff; font-weight: 700; font-size: 18px; margin-bottom: 4px;">${info.name}</div>
                    <div style="color: rgba(255, 255, 255, 0.6); font-size: 14px;">${info.info}</div>
                `;
                console.log('Display updated');
            }
            
            // Update boss card selection
            document.querySelectorAll('.boss-option').forEach(el => {
                el.style.borderColor = 'transparent';
                el.style.background = 'rgba(255, 255, 255, 0.05)';
            });
            if (event && event.currentTarget) {
                event.currentTarget.style.borderColor = '#4CAF50';
                event.currentTarget.style.background = 'rgba(76, 175, 80, 0.2)';
            }
            
            // Check if ready to enable button
            console.log('Calling checkBossBattleReady');
            window.chessGame.checkBossBattleReady();
        };
        
        // Add click handlers to boss options
        document.querySelectorAll('.boss-option').forEach(option => {
            option.addEventListener('click', function() {
                const boss = this.getAttribute('onclick').match(/'([^']+)'/)[1];
                window.selectBoss(boss);
            });
        });
        
        // Add event listeners to Chess.com sidebar dropdowns
        const sidebarTimeSelect = document.querySelector('#chessSidebar #timeSelect');
        const sidebarColorSelect = document.querySelector('#chessSidebar #colorSelect');
        
        if (sidebarTimeSelect) {
            sidebarTimeSelect.addEventListener('change', () => {
                if (window.chessGame) window.chessGame.checkBossBattleReady();
            });
        }
        
        if (sidebarColorSelect) {
            sidebarColorSelect.addEventListener('change', () => {
                if (window.chessGame) window.chessGame.checkBossBattleReady();
            });
        }
        
        // Boss battle start button - handle BOTH Chess.com sidebar and Boss Battle section
        const allStartBtns = document.querySelectorAll('#startGameBtn');
        
        allStartBtns.forEach(btn => {
            btn.onclick = function(e) {
                e.preventDefault();
                console.log('🎮 Play button clicked!');
                
                const chessSidebar = document.getElementById('chessSidebar');
                const playSection = document.getElementById('playSection');
                
                let timeSelect, colorSelect;
                
                // Determine which UI is active (check visibility)
                const sidebarVisible = chessSidebar && chessSidebar.offsetParent !== null;
                const playVisible = playSection && playSection.offsetParent !== null;
                
                console.log('Sidebar visible:', sidebarVisible, 'Play visible:', playVisible);
                
                if (sidebarVisible) {
                    console.log('✓ Using Chess.com sidebar');
                    timeSelect = document.getElementById('timeSelect');
                    colorSelect = document.getElementById('colorSelect');
                } else if (playVisible) {
                    console.log('✓ Using Boss Battle section');
                    timeSelect = document.getElementById('timeSelect');
                    colorSelect = document.getElementById('colorSelect');
                } else {
                    console.log('⚠️ Neither visible, using first found');
                    timeSelect = document.getElementById('timeSelect');
                    colorSelect = document.getElementById('colorSelect');
                }
                
                console.log('Selected bot:', window.chessGame?.selectedBot);
                console.log('Time value:', timeSelect?.value);
                
                if (window.chessGame && window.chessGame.selectedBot && timeSelect && timeSelect.value) {
                    console.log('✓ Starting game...');
                    window.chessGame.timerMode = timeSelect.value;
                    window.chessGame.playerColor = colorSelect.value || 'w';
                    if (window.chessGame.playerColor === 'random') {
                        window.chessGame.playerColor = Math.random() < 0.5 ? 'w' : 'b';
                    }
                    
                    console.log('Game settings:', {
                        bot: window.chessGame.selectedBot,
                        time: window.chessGame.timerMode,
                        color: window.chessGame.playerColor
                    });
                    
                    // Hide both UIs
                    if (chessSidebar) chessSidebar.style.display = 'none';
                    if (playSection) playSection.style.display = 'none';
                    document.getElementById('sidebarMenu').style.left = '0';
                    
                    window.chessGame.updateBotDisplay();
                    window.chessGame.startGame();
                } else {
                    console.error('❌ Cannot start game - missing requirements');
                }
            }
        });
        
        // Practice start button
        const practiceBtn = document.getElementById('startPracticeBtn');
        console.log('Practice button found:', practiceBtn);
        if (practiceBtn) {
            practiceBtn.addEventListener('click', () => {
            const elo = parseInt(document.getElementById('engineEloSlider').value);
            const timeMode = document.getElementById('practiceTimeSelect').value;
            const colorSelect = document.getElementById('practiceColorSelect').value;
            
            console.log('Starting practice - ELO:', elo, 'Time:', timeMode, 'Color:', colorSelect);
            
            // Close practice section first
            closePracticeSection();
            // Hide Chess.com sidebar when starting practice
            const chessSidebar = document.getElementById('chessSidebar');
            if (chessSidebar) chessSidebar.style.display = 'none';
            
            // Set game configuration
            this.gameMode = 'practice';
            this.engineElo = elo;
            console.log('Engine ELO set to:', elo);
            this.selectedBot = null;
            this.playerColor = colorSelect === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorSelect;
            
            // Reset and initialize game
            this.resetGame();
            
            // Set time control - use timerMode to match startGame() expectations
            if (timeMode === 'rapid') {
                this.timerMode = 'rapid';
            } else if (timeMode === 'blitz') {
                this.timerMode = 'blitz';
            } else {
                this.timerMode = 'infinite';
            }
            
            // Update display
            document.getElementById('botName').textContent = 'Engine';
            document.getElementById('botAvatar').textContent = '🤖';
            
            // Show/hide chat based on game mode (hide in practice mode)
            if (this.gameMode === 'practice') {
                document.getElementById('botChatSection').style.display = 'none';
            } else {
                document.getElementById('botChatSection').style.display = 'block';
            }
            
            // Show/hide timers based on mode
            if (this.timeMode === 'infinite') {
                document.getElementById('botTimer').style.display = 'none';
                document.getElementById('playerTimer').style.display = 'none';
            } else {
                document.getElementById('botTimer').style.display = 'block';
                document.getElementById('playerTimer').style.display = 'block';
            }
            
            // Enable undo button in practice mode
            if (this.gameMode === 'practice') {
                document.getElementById('undoBtn').disabled = false;
                document.getElementById('undoBtn').style.opacity = '1';
                document.getElementById('undoBtn').style.cursor = 'pointer';
            } else {
                document.getElementById('undoBtn').disabled = true;
                document.getElementById('undoBtn').style.opacity = '0.5';
                document.getElementById('undoBtn').style.cursor = 'not-allowed';
            }
                    
            // Start the game properly
            this.updateBotDisplay();
            this.startGame();
            
            console.log('Practice game started! ELO:', this.engineElo, 'Color:', this.playerColor);
            });
        } else {
            console.error('Practice button not found!');
        }
        
        // Enable start button when time and color are selected
        document.getElementById('timeSelect').addEventListener('change', () => this.checkBossBattleReady());
        document.getElementById('colorSelect').addEventListener('change', () => this.checkBossBattleReady());
        
        // Rating modal close button
        document.getElementById('closeRatingModal').addEventListener('click', () => {
            document.getElementById('ratingModal').style.display = 'none';
        });
        
        // Chat functionality
        document.getElementById('chatSend').addEventListener('click', () => this.sendPlayerMessage());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendPlayerMessage();
            }
        });
        
        // Navigation controls
        document.getElementById('navFirst').addEventListener('click', () => this.navToMove(0));
        document.getElementById('navPrev').addEventListener('click', () => this.navToMove(this.currentMoveIndex - 1));
        document.getElementById('navNext').addEventListener('click', () => this.navToMove(this.currentMoveIndex + 1));
        document.getElementById('navLast').addEventListener('click', () => this.navToMove(this.moveHistory.length - 1));
        document.getElementById('navPlay').addEventListener('click', () => this.toggleAutoPlay());
        
        // Annotation popup buttons
        document.getElementById('retryMoveBtn').addEventListener('click', () => {
            if (this.pendingRetryIndex !== undefined) {
                console.log('Retrying from move index:', this.pendingRetryIndex);
                this.navToMove(this.pendingRetryIndex);
                document.getElementById('annotationPopup').style.display = 'none';
            } else {
                console.log('No pending retry index set');
            }
        });
        document.getElementById('closeAnnotationBtn').addEventListener('click', () => {
            document.getElementById('annotationPopup').style.display = 'none';
        });
        
        // ===== LEARN SECTION - CHESS OPENINGS =====
        window.renderLearnSection = () => {
            const learnSection = document.getElementById('learnSection');
            
            const openings = [
                {
                    id: 'italian',
                    name: 'Italian Game',
                    moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4',
                    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
                    emoji: '🏰',
                    description: 'One of the oldest and most popular openings. White develops the bishop to c4, targeting the weak f7 square.',
                    strength: 'Strong central control, rapid development, attacks f7',
                    weakness: 'Can lead to sharp tactical positions',
                    continuation: 'After 3...Bc5 (Giuoco Piano), play 4.c3 to prepare d4',
                    famous_game: 'Morphy vs Duke of Brunswick, 1858',
                    rating: '⭐⭐⭐⭐⭐',
                    level: 'Beginner'
                },
                {
                    id: 'ruy_lopez',
                    name: 'Ruy Lopez',
                    moves: '1.e4 e5 2.Nf3 Nc6 3.Bb5',
                    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
                    emoji: '🇪🇸',
                    description: 'The Spanish Opening. White puts pressure on the knight defending e5, preparing for long-term strategic play.',
                    strength: 'Solid, flexible, rich in strategic ideas',
                    weakness: 'Complex theory, requires deep understanding',
                    continuation: 'After 3...a6 4.Ba4 Nf6 5.O-O, Black can play 5...Be7 (Closed) or 5...Nxe4 (Open)',
                    famous_game: 'Karpov vs Kasparov, World Championship 1984',
                    rating: '⭐⭐⭐⭐⭐',
                    level: 'Hard'
                },
                {
                    id: 'sicilian',
                    name: 'Sicilian Defense',
                    moves: '1.e4 c5',
                    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
                    emoji: '🛡️',
                    description: 'The most popular response to 1.e4. Black fights for the center asymmetrically, creating unbalanced positions.',
                    strength: 'Creates winning chances for Black, unbalanced positions',
                    weakness: 'White gets space advantage, sharp tactical battles',
                    continuation: 'After 2.Nf3 d6 3.d4 cxd4 4.Nxd4, choose: Najdorf (4...Nf6 5.Nc3 a6) or Dragon (4...Nf6 5.Nc3 g6)',
                    famous_game: 'Fischer vs Spassky, Game 6, 1972',
                    rating: '⭐⭐⭐⭐⭐',
                    level: 'Hard'
                },
                {
                    id: 'queens_gambit',
                    name: "Queen's Gambit",
                    moves: '1.d4 d5 2.c4',
                    fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2',
                    emoji: '👑',
                    description: 'White offers a pawn to gain central control. If Black takes, White recaptures with strong center.',
                    strength: 'Strong center, solid development, strategic play',
                    weakness: 'Requires understanding of pawn structures',
                    continuation: 'If 2...dxc4 (Accepted), play 3.e3 or 3.Nf3. If 2...e6 (Declined), play 3.Nc3',
                    famous_game: 'Anand vs Topalov, 2010 World Championship',
                    rating: '⭐⭐⭐⭐',
                    level: 'Medium'
                },
                {
                    id: 'kings_indian',
                    name: "King's Indian Defense",
                    moves: '1.d4 Nf6 2.c4 g6 3.Nc3 Bg7',
                    fen: 'rnbqk2r/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
                    emoji: '🦁',
                    description: 'A hypermodern opening where Black allows White to build a big center, then attacks it later.',
                    strength: 'Dynamic counterplay, kingside attacks, rich tactical opportunities',
                    weakness: 'Gives White space, requires precise timing',
                    continuation: 'After 4.e4 d6, play 5.Nf3 0-0 6.Be2 e5 for the Classical Variation',
                    famous_game: 'Kasparov vs Karpov, Game 16, 1985',
                    rating: '⭐⭐⭐⭐⭐',
                    level: 'Hard'
                },
                {
                    id: 'french',
                    name: 'French Defense',
                    moves: '1.e4 e6',
                    fen: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
                    emoji: '🇫',
                    description: 'A solid, positional defense. Black prepares ...d5 to challenge the center while maintaining a pawn chain.',
                    strength: 'Solid structure, clear plans, less tactical',
                    weakness: 'Light-squared bishop can be bad, cramped position',
                    continuation: 'After 2.d4 d5, choose: Winawer (3.Nc3 Bb4), Classical (3.Nc3 Nf6), or Exchange (3.exd5)',
                    famous_game: 'Botvinnik vs Capablanca, AVRO 1938',
                    rating: '⭐⭐⭐⭐',
                    level: 'Medium'
                },
                {
                    id: 'caro_kann',
                    name: 'Caro-Kann Defense',
                    moves: '1.e4 c6',
                    fen: 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
                    emoji: '🛡️',
                    description: 'A solid, reliable defense. Black prepares ...d5 with strong pawn structure, avoiding the bad bishop problem of the French.',
                    strength: 'Extremely solid, good pawn structure, endgame prospects',
                    weakness: 'Can be passive, less dynamic than Sicilian',
                    continuation: 'After 2.d4 d5, main lines: 3.Nc3 (Classical), 3.Nd2 (Advance), or 3.exd5 (Exchange)',
                    famous_game: 'Karpov vs Kasparov, Game 12, 1984 World Championship',
                    famous_game_description: 'Karpov demonstrated the solidity of the Caro-Kann, reaching a winning endgame.',
                    rating: '⭐⭐⭐⭐',
                    level: 'Medium'
                },
                {
                    id: 'scandinavian',
                    name: 'Scandinavian Defense',
                    moves: '1.e4 d5',
                    fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
                    emoji: '⚔️',
                    description: 'An aggressive defense that immediately challenges White\'s center. Black captures on e4 and brings the queen out early.',
                    strength: 'Forces the game, less theory, surprise value',
                    weakness: 'Queen can be harassed, development can be slow',
                    continuation: 'After 2.exd5 Qxd5 3.Nc3, Queen retreats to a5 or d8. Then develop with ...Nf6, ...Bg4, ...e6.',
                    famous_game: 'Carlsen vs Caruana, Candidates 2018',
                    famous_game_description: 'Carlsen used the Scandinavian to surprise his opponent and create an imbalanced position.',
                    rating: '⭐⭐⭐',
                    level: 'Beginner'
                },
                {
                    id: 'london_system',
                    name: 'London System',
                    moves: '1.d4 d5 2.Bf4',
                    fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq - 1 2',
                    emoji: '',
                    description: 'A solid, system-based opening for White. Easy to learn, can be played against almost any Black setup.',
                    strength: 'Easy to learn, solid structure, versatile',
                    weakness: 'Can be predictable, less ambitious than other d4 openings',
                    continuation: 'After 2...Nf6 3.e3 e6 4.Nf3, continue with Bd3, 0-0, Nbd2, c3 for a solid setup.',
                    famous_game: 'Carlsen vs Anand, World Championship 2014',
                    famous_game_description: 'Carlsen used the London System to reach a comfortable middlegame with lasting pressure.',
                    rating: '⭐⭐⭐⭐',
                    level: 'Beginner'
                },
                {
                    id: 'nimzo_indian',
                    name: 'Nimzo-Indian Defense',
                    moves: '1.d4 Nf6 2.c4 e6 3.Nc3 Bb4',
                    fen: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
                    emoji: '🎯',
                    description: 'One of the most respected defenses against 1.d4. Black pins the knight and prepares to double White\'s pawns.',
                    strength: 'Excellent strategic ideas, flexible, respected at all levels',
                    weakness: 'Requires understanding of pawn structures and piece play',
                    continuation: 'After 4.e3 (Rubinstein), play 4...0-0 or 4...c5. After 4.Qc2 (Classical), play 4...0-0 or 4...c5.',
                    famous_game: 'Kasparov vs Karpov, Game 11, 1985 World Championship',
                    famous_game_description: 'Kasparov demonstrated the dynamic potential of the Nimzo-Indian with brilliant piece play.',
                    rating: '⭐⭐⭐⭐⭐',
                    level: 'Hard'
                },
                {
                    id: 'grunfeld',
                    name: 'Grünfeld Defense',
                    moves: '1.d4 Nf6 2.c4 g6 3.Nc3 d5',
                    fen: 'rnbqkb1r/ppp1ppbp/5np1/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
                    emoji: '🦅',
                    description: 'A hypermodern defense where Black allows White to build a big center, then attacks it with pieces and ...c5.',
                    strength: 'Dynamic counterplay, active piece play, rich tactical positions',
                    weakness: 'Gives White central space, requires precise play',
                    continuation: 'After 4.cxd5 Nxd5 5.e4 Nxc3 6.bxc3 Bg7, Black fianchettoes and attacks the center with ...c5.',
                    famous_game: 'Kasparov vs Karpov, Game 19, 1985 World Championship',
                    famous_game_description: 'A masterclass in Grünfeld strategy, showing how to fight for the center dynamically.',
                    rating: '⭐⭐⭐⭐⭐',
                    level: 'Hard'
                },
                {
                    id: 'pietroff',
                    name: "Petroff's Defense",
                    moves: '1.e4 e5 2.Nf3 Nf6',
                    fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 3 3',
                    emoji: '',
                    description: 'A solid, symmetrical defense. Black mirrors White\'s development, leading to balanced positions.',
                    strength: 'Very solid, drawish tendencies, good for tournament play',
                    weakness: 'Can be boring, less winning chances for Black',
                    continuation: 'After 3.Nxe5 d6 4.Nf3 Nxe4 5.d4, main lines lead to symmetrical positions with equal chances.',
                    famous_game: 'Kramnik vs Topalov, World Championship 2006',
                    famous_game_description: 'Kramnik used the Petroff to neutralize Topalov\'s attacking style and draw the match.',
                    rating: '⭐⭐⭐',
                    level: 'Medium'
                },
                {
                    id: 'scotch_game',
                    name: 'Scotch Game',
                    moves: '1.e4 e5 2.Nf3 Nc6 3.d4',
                    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3',
                    emoji: '🏴',
                    description: 'An aggressive opening that immediately challenges Black\'s center. White opens the position early for tactical play.',
                    strength: 'Opens the game, tactical opportunities, less theory than Ruy Lopez',
                    weakness: 'Can lead to simplified positions, Black equalizes easily',
                    continuation: 'After 3...exd4 4.Nxd4, Black plays 4...Nf6 or 4...Bc5',
                    famous_game: 'Kasparov vs Karpov, Game 20, 1990',
                    rating: '⭐⭐⭐⭐',
                    level: 'Medium'
                },
                {
                    id: 'kings_gambit',
                    name: "King's Gambit",
                    moves: '1.e4 e5 2.f4',
                    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq - 0 2',
                    emoji: '👑',
                    description: 'A romantic, aggressive gambit. White sacrifices a pawn for rapid development and attacking chances.',
                    strength: 'Exciting attacks, development advantage, psychological pressure',
                    weakness: 'Weakens king position, risky if attack fails',
                    continuation: 'After 2...exf4 (Accepted), play 3.Nf3. If 2...Bc5 (Declined), continue with Nf3',
                    famous_game: 'Fischer vs Spassky, Game 6, 1972',
                    rating: '⭐⭐⭐',
                    level: 'Hard'
                },
                {
                    id: 'vienna_game',
                    name: 'Vienna Game',
                    moves: '1.e4 e5 2.Nc3',
                    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2',
                    emoji: '🇦🇹',
                    description: 'A flexible opening that delays Nf3 to keep options open. Can transpose to various e4 openings.',
                    strength: 'Flexible, can lead to Vienna Gambit, good for surprise value',
                    weakness: 'Less direct than other openings, requires understanding of multiple systems',
                    continuation: 'After 2...Nf6, play 3.f4 (Vienna Gambit) for sharp play, or 3.Bc4 for quieter positions',
                    famous_game: 'Anderssen vs Morphy, 1858',
                    rating: '⭐⭐⭐',
                    level: 'Medium'
                },
                {
                    id: 'pirc_defense',
                    name: 'Pirc Defense',
                    moves: '1.e4 d6',
                    fen: 'rnbqkbnr/ppp1pppp/3p4/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
                    emoji: '🇸',
                    description: 'A hypermodern defense where Black allows White to build a center, then undermines it later with ...Nf6 and ...g6.',
                    strength: 'Flexible, unbalancing, good counter-attacking chances',
                    weakness: 'Gives White space, requires precise timing',
                    continuation: 'After 2.d4 Nf6 3.Nc3 g6, Black fianchettoes the bishop and prepares ...Bg7',
                    famous_game: 'Fischer vs Pirc, 1970',
                    rating: '⭐⭐⭐',
                    level: 'Hard'
                },
                {
                    id: 'alekhine_defense',
                    name: 'Alekhine Defense',
                    moves: '1.e4 Nf6',
                    fen: 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2',
                    emoji: '🇨',
                    description: 'A provocative defense that invites White to chase the knight and build a big pawn center, which Black then attacks.',
                    strength: 'Unbalances the game, tempts White to overextend, surprise value',
                    weakness: 'Gives White space, knight can be harassed',
                    continuation: 'After 2.e5 Nd5 3.d4 d6, Black challenges the center immediately',
                    famous_game: 'Alekhine vs Nimzowitsch, 1930',
                    rating: '⭐⭐⭐',
                    level: 'Hard'
                },
                {
                    id: 'slav_defense',
                    name: 'Slav Defense',
                    moves: '1.d4 d5 2.c4 c6',
                    fen: 'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
                    emoji: '🛡️',
                    description: 'A solid defense to the Queen\'s Gambit. Black supports d5 with c6 while keeping the light-squared bishop free.',
                    strength: 'Very solid, good pawn structure, bishop not blocked',
                    weakness: 'Can be passive, requires understanding of pawn breaks',
                    continuation: 'After 3.Nf3 Nf6 4.Nc3, Black can play 4...dxc4 (Slav Accepted) or 4...e6 (Semi-Slav)',
                    famous_game: 'Botvinnik vs Smyslov, 1954',
                    rating: '⭐⭐⭐⭐',
                    level: 'Medium'
                },
                {
                    id: 'benoni_defense',
                    name: 'Benoni Defense',
                    moves: '1.d4 Nf6 2.c4 c5',
                    fen: 'rnbqkb1r/pp1ppppp/5n2/2p5/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 1 3',
                    emoji: '⚡',
                    description: 'An ambitious, unbalanced defense. Black allows White a pawn center in exchange for dynamic counterplay on the queenside.',
                    strength: 'Dynamic counterplay, unbalanced positions, winning chances',
                    weakness: 'Gives White space, complex theory, risky',
                    continuation: 'After 3.d5 e6 4.Nc3 exd5 5.cxd5 d6, Black fianchettoes with ...g6 and ...Bg7',
                    famous_game: 'Fischer vs Larsen, 1971',
                    rating: '⭐⭐⭐⭐',
                    level: 'Hard'
                },
                {
                    id: 'dutch_defense',
                    name: 'Dutch Defense',
                    moves: '1.d4 f5',
                    fen: 'rnbqkbnr/ppppp1pp/8/5p2/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2',
                    emoji: '🇳',
                    description: 'An aggressive, asymmetrical defense. Black immediately fights for e4 and creates an unbalanced position.',
                    strength: 'Unbalancing, kingside attacking chances, surprise value',
                    weakness: 'Weakens kingside, complex theory, risky',
                    continuation: 'After 2.c4 Nf6 3.g3 (Leningrad), play ...g6 and ...Bg7. Or 3.Nf3 e6 (Stonewall)',
                    famous_game: 'Stein vs Spassky, 1973',
                    rating: '⭐⭐⭐',
                    level: 'Hard'
                },
                {
                    id: 'english_opening',
                    name: 'English Opening',
                    moves: '1.c4',
                    fen: 'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 1',
                    emoji: '🇬',
                    description: 'A flexible, positional opening. White controls d5 and prepares for various setups.',
                    strength: 'Flexible, can transpose to many openings, good for positional players',
                    weakness: 'Less direct, requires understanding of multiple systems',
                    continuation: 'After 1...e5 (Reversed Sicilian) or 1...Nf6, continue with Nc3, g3, Bg2',
                    famous_game: 'Karpov vs Kasparov, Game 16, 1985',
                    rating: '⭐⭐⭐⭐',
                    level: 'Medium'
                },
                {
                    id: 'reti_opening',
                    name: 'Réti Opening',
                    moves: '1.Nf3',
                    fen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1',
                    emoji: '🇭🇺',
                    description: 'A hypermodern opening. White delays pawn moves, developing pieces first and controlling the center from a distance.',
                    strength: 'Flexible, hypermodern ideas, good for strategic players',
                    weakness: 'Less direct, can transpose to many openings',
                    continuation: 'After 1...d5, play 2.c4 (Réti Gambit) or 2.g3 (fianchetto)',
                    famous_game: 'Réti vs Capablanca, 1924',
                    rating: '⭐⭐⭐',
                    level: 'Medium'
                },
                {
                    id: 'catalan_opening',
                    name: 'Catalan Opening',
                    moves: '1.d4 Nf6 2.c4 e6 3.g3',
                    fen: 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/6P1/PP2PP1P/RNBQKBNR b KQkq - 0 3',
                    emoji: '🏔️',
                    description: 'A sophisticated opening combining d4 and fianchetto. White controls the center and develops harmoniously.',
                    strength: 'Solid, positional pressure, good endgame prospects',
                    weakness: 'Requires understanding of subtle positional ideas',
                    continuation: 'After 3...d5 4.Bg2, continue with Nf3, 0-0, Nc3',
                    famous_game: 'Karpov vs Kasparov, Game 22, 1984',
                    rating: '⭐⭐⭐⭐',
                    level: 'Hard'
                },
                {
                    id: 'bird_opening',
                    name: "Bird's Opening",
                    moves: '1.f4',
                    fen: 'rnbqkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/RNBQKBNR b KQkq - 0 1',
                    emoji: '🐦',
                    description: 'An aggressive, unconventional opening. White immediately fights for e5 and prepares kingside play.',
                    strength: 'Unbalancing, surprise value, kingside attacking chances',
                    weakness: 'Weakens kingside, less theory available',
                    continuation: 'After 1...d5, play 2.Nf3 Nf6 3.e3 for a solid setup',
                    famous_game: 'Bird vs Blackburne, 1880',
                    rating: '⭐⭐',
                    level: 'Medium'
                },
                {
                    id: 'three_knights',
                    name: 'Three Knights Opening',
                    moves: '1.e4 e5 2.Nf3 Nc6 3.Nc3',
                    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R b KQkq - 2 3',
                    emoji: '',
                    description: 'A solid, classical opening. Both sides develop knights naturally before deciding on bishop placement.',
                    strength: 'Simple, logical development, good for beginners',
                    weakness: 'Can lead to symmetrical, drawish positions',
                    continuation: 'After 3...Nf6 (Four Knights), play 4.Bb5 or 4.Bc4. Focus on castling and central control.',
                    famous_game: 'Capablanca vs Alekhine, 1927',
                    rating: '⭐⭐⭐',
                    level: 'Beginner'
                },
                {
                    id: 'ponziani',
                    name: 'Ponziani Opening',
                    moves: '1.e4 e5 2.Nf3 Nc6 3.c3',
                    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/2P2N2/PP1P1PPP/RNBQKB1R b KQkq - 0 3',
                    emoji: '🎯',
                    description: 'An old opening that prepares d4 to establish a strong pawn center. Less common but still viable.',
                    strength: 'Strong center, surprise value, clear plans',
                    weakness: 'Somewhat passive, Black has good responses',
                    continuation: 'After 3...d5 or 3...Nf6, continue with d4. Play for central control and piece activity.',
                    famous_game: 'Old classical games from 1800s',
                    rating: '⭐⭐⭐',
                    level: 'Medium'
                },
                {
                    id: 'kings_fianchetto',
                    name: "King's Fianchetto Opening",
                    moves: '1.g3',
                    fen: 'rnbqkbnr/pppppppp/8/8/8/6P1/PPPPPP1P/RNBQKBNR b KQkq - 0 1',
                    emoji: '👑',
                    description: 'A hypermodern approach. White fianchettoes the king\'s bishop to control the long diagonal.',
                    strength: 'Solid, flexible, good for positional players',
                    weakness: 'Slow development, gives Black time',
                    continuation: 'After 1...e5 or 1...d5, continue with Bg2, Nf3, 0-0. Control center with pieces.',
                    famous_game: 'Various hypermodern games',
                    rating: '⭐⭐⭐',
                    level: 'Medium'
                },
                {
                    id: 'owen_defense',
                    name: 'Owen Defense',
                    moves: '1.e4 b6',
                    fen: 'rnbqkbnr/p1pppppp/1p6/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
                    emoji: '🦉',
                    description: 'An unusual defense where Black fianchettoes the queenside bishop early. Unorthodox but playable.',
                    strength: 'Surprise value, unbalances the game',
                    weakness: 'Neglects center, passive',
                    continuation: 'After 2.d4 Bb7, continue with ...e6, ...Nf6. Play for counterattacks.',
                    famous_game: 'Rare in top-level chess',
                    rating: '⭐⭐',
                    level: 'Medium'
                },
                {
                    id: 'nimzowitsch_defense',
                    name: 'Nimzowitsch Defense',
                    moves: '1.e4 Nc6',
                    fen: 'r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2',
                    emoji: '🎨',
                    description: 'An unusual defense where Black develops the knight before pawns. Hypermodern ideas.',
                    strength: 'Unorthodox, flexible, can transpose to good positions',
                    weakness: 'Violates classical principles, can be awkward',
                    continuation: 'After 2.Nf3 d5 or 2...e5, continue developing naturally. Play for ...d5 break.',
                    famous_game: 'Nimzowitsch games from 1920s',
                    rating: '⭐⭐⭐',
                    level: 'Hard'
                }
            ];
            
            let openingsHTML = openings.map((opening) => `
                <div onclick="window.showOpeningDetail('${opening.id}')" style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.3s;" 
                     onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'; this.style.borderColor='rgba(118, 150, 86, 0.5)'; this.style.transform='translateY(-2px)'" 
                     onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'; this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.transform='translateY(0)'">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 12px;">
                        <div style="font-size: 40px;">${opening.emoji}</div>
                        <div style="flex: 1;">
                            <h3 style="color: #fff; margin: 0 0 4px 0; font-size: 20px;">${opening.name}</h3>
                            <div style="color: rgba(255, 255, 255, 0.6); font-size: 13px;">${opening.level} | ${opening.rating}</div>
                        </div>
                    </div>
                    <p style="color: rgba(255, 255, 255, 0.7); margin: 0 0 8px 0; font-size: 14px; line-height: 1.5;">${opening.description}</p>
                    <div style="background: rgba(0, 0, 0, 0.3); padding: 8px 12px; border-radius: 6px; font-family: monospace; color: #769656; font-size: 13px;">
                        ${opening.moves}
                    </div>
                </div>
            `).join('');
            
            learnSection.innerHTML = `
                <div style="max-width: 1200px; margin: 0 auto; padding: 40px 20px;">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 30px;">
                        <button onclick="window.closeLearnSection()" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; font-size: 20px; cursor: pointer; padding: 8px 16px; border-radius: 8px; transition: all 0.2s;" 
                                onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" 
                                onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">← Back</button>
                        <div>
                            <h1 style="color: #fff; margin: 0; font-size: 36px; font-weight: bold;">♟️ Chess Openings</h1>
                            <p style="color: rgba(255, 255, 255, 0.7); margin: 5px 0 0 0; font-size: 16px;">Master the most important openings with visual examples and famous games</p>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px;">
                        ${openingsHTML}
                    </div>
                </div>
            `;
        };
        
        window.showOpeningDetail = (openingId) => {
            const openings = {
                italian: {
                    name: 'Italian Game', emoji: '🏰',
                    moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4',
                    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
                    description: 'One of the oldest and most popular openings. White develops the bishop to c4, targeting the weak f7 square.',
                    strength: 'Strong central control, rapid development, attacks f7',
                    weakness: 'Can lead to sharp tactical positions',
                    continuation: 'After 3...Bc5 (Giuoco Piano), play 4.c3 to prepare d4. Main line: 4.c3 Nf6 5.d4 exd4 6.cxd4 Bb4+',
                    famous_game: 'Morphy vs Duke of Brunswick, 1858 - "The Opera Game"',
                    famous_game_description: 'A brilliant demonstration of development and attacking play. Morphy sacrificed material for a devastating attack.',
                    rating: '⭐⭐⭐⭐⭐', level: 'Beginner to Advanced'
                },
                ruy_lopez: {
                    name: 'Ruy Lopez', emoji: '🇪🇸',
                    moves: '1.e4 e5 2.Nf3 Nc6 3.Bb5',
                    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
                    description: 'The Spanish Opening. White puts pressure on the knight defending e5, preparing for long-term strategic play.',
                    strength: 'Solid, flexible, rich in strategic ideas',
                    weakness: 'Complex theory, requires deep understanding',
                    continuation: 'After 3...a6 4.Ba4 Nf6 5.O-O, Black can play 5...Be7 (Closed) or 5...Nxe4 (Open). Closed leads to maneuvering, Open to tactical fights.',
                    famous_game: 'Karpov vs Kasparov, World Championship 1984, Game 9',
                    famous_game_description: 'A masterpiece of positional play. Karpov demonstrated the power of small advantages in the Ruy Lopez.',
                    rating: '⭐⭐⭐⭐⭐', level: 'Intermediate to Master'
                },
                sicilian: {
                    name: 'Sicilian Defense', emoji: '🛡️',
                    moves: '1.e4 c5',
                    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
                    description: 'The most popular response to 1.e4. Black fights for the center asymmetrically, creating unbalanced positions.',
                    strength: 'Creates winning chances for Black, unbalanced positions',
                    weakness: 'White gets space advantage, sharp tactical battles',
                    continuation: 'After 2.Nf3 d6 3.d4 cxd4 4.Nxd4: Najdorf (4...Nf6 5.Nc3 a6) - most popular, or Dragon (4...Nf6 5.Nc3 g6) - sharp attacks.',
                    famous_game: 'Fischer vs Spassky, Game 6, 1972 World Championship',
                    famous_game_description: 'Fischer shocked the world with his Sicilian preparation, winning a crucial game in the match.',
                    rating: '⭐⭐⭐⭐⭐', level: 'Advanced'
                },
                queens_gambit: {
                    name: "Queen's Gambit", emoji: '👑',
                    moves: '1.d4 d5 2.c4',
                    fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2',
                    description: 'White offers a pawn to gain central control. If Black takes, White recaptures with strong center.',
                    strength: 'Strong center, solid development, strategic play',
                    weakness: 'Requires understanding of pawn structures',
                    continuation: 'If 2...dxc4 (Accepted), play 3.e3 or 3.Nf3. If 2...e6 (Declined), play 3.Nc3 Nf6 4.Bg5.',
                    famous_game: 'Anand vs Topalov, 2010 World Championship, Game 2',
                    famous_game_description: 'A brilliant attacking game showing the power of the Queen\'s Gambit Declined.',
                    rating: '⭐⭐⭐⭐', level: 'Intermediate'
                },
                kings_indian: {
                    name: "King's Indian Defense", emoji: '🦁',
                    moves: '1.d4 Nf6 2.c4 g6 3.Nc3 Bg7',
                    fen: 'rnbqk2r/ppppppbp/5np1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
                    description: 'A hypermodern opening where Black allows White to build a big center, then attacks it later.',
                    strength: 'Dynamic counterplay, kingside attacks, rich tactical opportunities',
                    weakness: 'Gives White space, requires precise timing',
                    continuation: 'After 4.e4 d6 5.Nf3 0-0 6.Be2 e5 (Classical). White can play 7.O-O or 7.d5 for different pawn structures.',
                    famous_game: 'Kasparov vs Karpov, Game 16, 1985 World Championship',
                    famous_game_description: 'Kasparov launched a devastating kingside attack, showcasing the KID\'s attacking potential.',
                    rating: '⭐⭐⭐⭐⭐', level: 'Advanced'
                },
                french: {
                    name: 'French Defense', emoji: '🇫',
                    moves: '1.e4 e6',
                    fen: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
                    description: 'A solid, positional defense. Black prepares ...d5 to challenge the center while maintaining a pawn chain.',
                    strength: 'Solid structure, clear plans, less tactical',
                    weakness: 'Light-squared bishop can be bad, cramped position',
                    continuation: 'After 2.d4 d5: Winawer (3.Nc3 Bb4), Classical (3.Nc3 Nf6), or Exchange (3.exd5 exd5). Each leads to different pawn structures.',
                    famous_game: 'Botvinnik vs Capablanca, AVRO 1938',
                    famous_game_description: 'Botvinnik\'s masterpiece demonstrating strategic understanding in the French Defense.',
                    rating: '⭐⭐⭐⭐', level: 'Intermediate'
                },
                caro_kann: {
                    name: 'Caro-Kann Defense', emoji: '🛡️',
                    moves: '1.e4 c6',
                    fen: 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
                    description: 'A solid, reliable defense. Black prepares ...d5 with strong pawn structure, avoiding the bad bishop problem of the French.',
                    strength: 'Extremely solid, good pawn structure, endgame prospects',
                    weakness: 'Can be passive, less dynamic than Sicilian',
                    continuation: 'After 2.d4 d5, main lines: 3.Nc3 (Classical), 3.Nd2 (Advance), or 3.exd5 (Exchange). Classical leads to rich middlegames.',
                    famous_game: 'Karpov vs Kasparov, Game 12, 1984 World Championship',
                    famous_game_description: 'Karpov demonstrated the solidity of the Caro-Kann, reaching a winning endgame through precise technique.',
                    rating: '⭐⭐⭐⭐', level: 'Intermediate'
                },
                scandinavian: {
                    name: 'Scandinavian Defense', emoji: '⚔️',
                    moves: '1.e4 d5',
                    fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
                    description: 'An aggressive defense that immediately challenges White\'s center. Black captures on e4 and brings the queen out early.',
                    strength: 'Forces the game, less theory, surprise value',
                    weakness: 'Queen can be harassed, development can be slow',
                    continuation: 'After 2.exd5 Qxd5 3.Nc3, Queen retreats to a5 or d8. Then develop with ...Nf6, ...Bg4, ...e6 for solid play.',
                    famous_game: 'Carlsen vs Caruana, Candidates 2018',
                    famous_game_description: 'Carlsen used the Scandinavian to surprise his opponent and create an imbalanced position with winning chances.',
                    rating: '⭐⭐⭐', level: 'Beginner to Intermediate'
                },
                london_system: {
                    name: 'London System', emoji: '🇬',
                    moves: '1.d4 d5 2.Bf4',
                    fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR b KQkq - 1 2',
                    description: 'A solid, system-based opening for White. Easy to learn, can be played against almost any Black setup.',
                    strength: 'Easy to learn, solid structure, versatile',
                    weakness: 'Can be predictable, less ambitious than other d4 openings',
                    continuation: 'After 2...Nf6 3.e3 e6 4.Nf3, continue with Bd3, 0-0, Nbd2, c3 for a solid setup. Control the center and develop naturally.',
                    famous_game: 'Carlsen vs Anand, World Championship 2014',
                    famous_game_description: 'Carlsen used the London System to reach a comfortable middlegame with lasting pressure and eventually won.',
                    rating: '⭐⭐⭐⭐', level: 'Beginner to Intermediate'
                },
                nimzo_indian: {
                    name: 'Nimzo-Indian Defense', emoji: '🎯',
                    moves: '1.d4 Nf6 2.c4 e6 3.Nc3 Bb4',
                    fen: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
                    description: 'One of the most respected defenses against 1.d4. Black pins the knight and prepares to double White\'s pawns.',
                    strength: 'Excellent strategic ideas, flexible, respected at all levels',
                    weakness: 'Requires understanding of pawn structures and piece play',
                    continuation: 'After 4.e3 (Rubinstein), play 4...0-0 or 4...c5. After 4.Qc2 (Classical), play 4...0-0 or 4...c5 to challenge the center.',
                    famous_game: 'Kasparov vs Karpov, Game 11, 1985 World Championship',
                    famous_game_description: 'Kasparov demonstrated the dynamic potential of the Nimzo-Indian with brilliant piece play and tactical awareness.',
                    rating: '⭐⭐⭐⭐⭐', level: 'Intermediate to Advanced'
                },
                grunfeld: {
                    name: 'Grünfeld Defense', emoji: '🦅',
                    moves: '1.d4 Nf6 2.c4 g6 3.Nc3 d5',
                    fen: 'rnbqkb1r/ppp1ppbp/5np1/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
                    description: 'A hypermodern defense where Black allows White to build a big center, then attacks it with pieces and ...c5.',
                    strength: 'Dynamic counterplay, active piece play, rich tactical positions',
                    weakness: 'Gives White central space, requires precise play',
                    continuation: 'After 4.cxd5 Nxd5 5.e4 Nxc3 6.bxc3 Bg7, Black fianchettoes and attacks the center with ...c5. Sharp, tactical battles ensue.',
                    famous_game: 'Kasparov vs Karpov, Game 19, 1985 World Championship',
                    famous_game_description: 'A masterclass in Grünfeld strategy, showing how to fight for the center dynamically and create counterplay.',
                    rating: '⭐⭐⭐⭐⭐', level: 'Advanced'
                },
                pietroff: {
                    name: "Petroff's Defense", emoji: '🔄',
                    moves: '1.e4 e5 2.Nf3 Nf6',
                    fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 3 3',
                    description: 'A solid, symmetrical defense. Black mirrors White\'s development, leading to balanced positions.',
                    strength: 'Very solid, drawish tendencies, good for tournament play',
                    weakness: 'Can be boring, less winning chances for Black',
                    continuation: 'After 3.Nxe5 d6 4.Nf3 Nxe4 5.d4, main lines lead to symmetrical positions with equal chances. Focus on piece activity.',
                    famous_game: 'Kramnik vs Topalov, World Championship 2006',
                    famous_game_description: 'Kramnik used the Petroff to neutralize Topalov\'s attacking style and successfully drew the match to retain his title.',
                    rating: '⭐⭐⭐', level: 'Intermediate'
                },
                scotch_game: {
                    name: 'Scotch Game', emoji: '🏴󠁳󠁴',
                    moves: '1.e4 e5 2.Nf3 Nc6 3.d4',
                    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3',
                    description: 'An aggressive opening that immediately challenges Black\'s center. White opens the position early for tactical play.',
                    strength: 'Opens the game, tactical opportunities, less theory than Ruy Lopez',
                    weakness: 'Can lead to simplified positions, Black equalizes easily',
                    continuation: 'After 3...exd4 4.Nxd4, Black plays 4...Nf6 or 4...Bc5. White continues with Nxc6 or Be3.',
                    famous_game: 'Kasparov vs Karpov, Game 20, 1990 World Championship',
                    famous_game_description: 'Kasparov used the Scotch to create dynamic positions and outplay Karpov tactically.',
                    rating: '⭐⭐⭐⭐', level: 'Intermediate'
                },
                kings_gambit: {
                    name: "King's Gambit", emoji: '👑',
                    moves: '1.e4 e5 2.f4',
                    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq - 0 2',
                    description: 'A romantic, aggressive gambit. White sacrifices a pawn for rapid development and attacking chances.',
                    strength: 'Exciting attacks, development advantage, psychological pressure',
                    weakness: 'Weakens king position, risky if attack fails',
                    continuation: 'After 2...exf4 (Accepted), play 3.Nf3. If 2...Bc5 (Declined), continue with Nf3 and develop naturally.',
                    famous_game: 'Fischer vs Spassky, Game 6, 1972 (declined)',
                    famous_game_description: 'Though Fischer preferred the King\'s Gambit, this famous game featured a different opening. The gambit remains popular in blitz.',
                    rating: '⭐⭐⭐', level: 'Intermediate to Advanced'
                },
                vienna_game: {
                    name: 'Vienna Game', emoji: '🇦🇹',
                    moves: '1.e4 e5 2.Nc3',
                    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2',
                    description: 'A flexible opening that delays Nf3 to keep options open. Can transpose to various e4 openings.',
                    strength: 'Flexible, can lead to Vienna Gambit, good for surprise value',
                    weakness: 'Less direct than other openings, requires understanding of multiple systems',
                    continuation: 'After 2...Nf6, play 3.f4 (Vienna Gambit) for sharp play, or 3.Bc4 for quieter positions.',
                    famous_game: 'Anderssen vs Morphy, 1858',
                    famous_game_description: 'A classic example of the Vienna Game\'s attacking potential in romantic chess.',
                    rating: '⭐⭐⭐', level: 'Intermediate'
                },
                pirc_defense: {
                    name: 'Pirc Defense', emoji: '🇸',
                    moves: '1.e4 d6',
                    fen: 'rnbqkbnr/ppp1pppp/3p4/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
                    description: 'A hypermodern defense where Black allows White to build a center, then undermines it later with ...Nf6 and ...g6.',
                    strength: 'Flexible, unbalancing, good counter-attacking chances',
                    weakness: 'Gives White space, requires precise timing',
                    continuation: 'After 2.d4 Nf6 3.Nc3 g6, Black fianchettoes the bishop and prepares ...Bg7. Play ...Nbd7, ...c6, ...b5 for counterplay.',
                    famous_game: 'Fischer vs Pirc, 1970',
                    famous_game_description: 'Pirc demonstrated the defensive resources of this opening against Fischer\'s attacking style.',
                    rating: '⭐⭐⭐', level: 'Advanced'
                },
                alekhine_defense: {
                    name: 'Alekhine Defense', emoji: '🇨',
                    moves: '1.e4 Nf6',
                    fen: 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2',
                    description: 'A provocative defense that invites White to chase the knight and build a big pawn center, which Black then attacks.',
                    strength: 'Unbalances the game, tempts White to overextend, surprise value',
                    weakness: 'Gives White space, knight can be harassed',
                    continuation: 'After 2.e5 Nd5 3.d4 d6, Black challenges the center immediately. Focus on piece activity and undermining pawns.',
                    famous_game: 'Alekhine vs Nimzowitsch, 1930',
                    famous_game_description: 'Alekhine demonstrated the dynamic possibilities of his own defense with brilliant piece play.',
                    rating: '⭐⭐⭐', level: 'Intermediate to Advanced'
                },
                slav_defense: {
                    name: 'Slav Defense', emoji: '🛡️',
                    moves: '1.d4 d5 2.c4 c6',
                    fen: 'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
                    description: 'A solid defense to the Queen\'s Gambit. Black supports d5 with c6 while keeping the light-squared bishop free.',
                    strength: 'Very solid, good pawn structure, bishop not blocked',
                    weakness: 'Can be passive, requires understanding of pawn breaks',
                    continuation: 'After 3.Nf3 Nf6 4.Nc3, Black can play 4...dxc4 (Slav Accepted) or 4...e6 (Semi-Slav). Focus on ...b5 and ...c5 breaks.',
                    famous_game: 'Botvinnik vs Smyslov, 1954 World Championship',
                    famous_game_description: 'Botvinnik demonstrated the strategic richness of the Slav with deep positional understanding.',
                    rating: '⭐⭐⭐⭐', level: 'Intermediate to Advanced'
                },
                benoni_defense: {
                    name: 'Benoni Defense', emoji: '⚡',
                    moves: '1.d4 Nf6 2.c4 c5',
                    fen: 'rnbqkb1r/pp1ppppp/5n2/2p5/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 1 3',
                    description: 'An ambitious, unbalanced defense. Black allows White a pawn center in exchange for dynamic counterplay on the queenside.',
                    strength: 'Dynamic counterplay, unbalanced positions, winning chances',
                    weakness: 'Gives White space, complex theory, risky',
                    continuation: 'After 3.d5 e6 4.Nc3 exd5 5.cxd5 d6, Black fianchettoes with ...g6 and ...Bg7. Play ...b5, ...Re8 for counterplay.',
                    famous_game: 'Fischer vs Larsen, 1971 Candidates',
                    famous_game_description: 'Fischer showcased the Benoni\'s tactical complexity with brilliant sacrifices and attacking play.',
                    rating: '⭐⭐⭐⭐', level: 'Advanced'
                },
                dutch_defense: {
                    name: 'Dutch Defense', emoji: '🇳',
                    moves: '1.d4 f5',
                    fen: 'rnbqkbnr/ppppp1pp/8/5p2/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2',
                    description: 'An aggressive, asymmetrical defense. Black immediately fights for e4 and creates an unbalanced position.',
                    strength: 'Unbalancing, kingside attacking chances, surprise value',
                    weakness: 'Weakens kingside, complex theory, risky',
                    continuation: 'After 2.c4 Nf6 3.g3 (Leningrad), play ...g6 and ...Bg7. Or 3.Nf3 e6 (Stonewall) for a solid setup.',
                    famous_game: 'Stein vs Spassky, 1973',
                    famous_game_description: 'Spassky demonstrated the Dutch\'s attacking potential with a brilliant kingside assault.',
                    rating: '⭐⭐⭐', level: 'Intermediate to Advanced'
                },
                english_opening: {
                    name: 'English Opening', emoji: '🇬',
                    moves: '1.c4',
                    fen: 'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 1',
                    description: 'A flexible, positional opening. White controls d5 and prepares for various setups.',
                    strength: 'Flexible, can transpose to many openings, good for positional players',
                    weakness: 'Less direct, requires understanding of multiple systems',
                    continuation: 'After 1...e5 (Reversed Sicilian) or 1...Nf6, continue with Nc3, g3, Bg2 for a solid setup. Control the center.',
                    famous_game: 'Karpov vs Kasparov, Game 16, 1985',
                    famous_game_description: 'Karpov used the English to reach a comfortable positional game against Kasparov.',
                    rating: '⭐⭐⭐⭐', level: 'Intermediate to Advanced'
                },
                reti_opening: {
                    name: 'Réti Opening', emoji: '🇭🇺',
                    moves: '1.Nf3',
                    fen: 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1',
                    description: 'A hypermodern opening. White delays pawn moves, developing pieces first and controlling the center from a distance.',
                    strength: 'Flexible, hypermodern ideas, good for strategic players',
                    weakness: 'Less direct, can transpose to many openings',
                    continuation: 'After 1...d5, play 2.c4 (Réti Gambit) or 2.g3 (fianchetto). Focus on piece activity and controlling key squares.',
                    famous_game: 'Réti vs Capablanca, 1924',
                    famous_game_description: 'Réti defeated the world champion with his innovative hypermodern approach.',
                    rating: '⭐⭐⭐', level: 'Intermediate to Advanced'
                },
                catalan_opening: {
                    name: 'Catalan Opening', emoji: '🏔️',
                    moves: '1.d4 Nf6 2.c4 e6 3.g3',
                    fen: 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/6P1/PP2PP1P/RNBQKBNR b KQkq - 0 3',
                    description: 'A sophisticated opening combining d4 and fianchetto. White controls the center and develops harmoniously.',
                    strength: 'Solid, positional pressure, good endgame prospects',
                    weakness: 'Requires understanding of subtle positional ideas',
                    continuation: 'After 3...d5 4.Bg2, continue with Nf3, 0-0, Nc3. Play for slow pressure and superior pawn structure.',
                    famous_game: 'Karpov vs Kasparov, Game 22, 1984',
                    famous_game_description: 'Karpov demonstrated the Catalan\'s positional squeeze with masterful technique.',
                    rating: '⭐⭐⭐⭐', level: 'Advanced'
                },
                bird_opening: {
                    name: "Bird's Opening", emoji: '🐦',
                    moves: '1.f4',
                    fen: 'rnbqkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/RNBQKBNR b KQkq - 0 1',
                    description: 'An aggressive, unconventional opening. White immediately fights for e5 and prepares kingside play.',
                    strength: 'Unbalancing, surprise value, kingside attacking chances',
                    weakness: 'Weakens kingside, less theory available',
                    continuation: 'After 1...d5, play 2.Nf3 Nf6 3.e3 for a solid setup. Or 2.b3 for a fianchetto system.',
                    famous_game: 'Bird vs Blackburne, 1880',
                    famous_game_description: 'Bird demonstrated his opening\'s attacking potential in this classic Victorian-era game.',
                    rating: '⭐⭐',
                    level: 'Intermediate'
                }
            };
            
            const opening = openings[openingId];
            if (!opening) return;
            
            const learnSection = document.getElementById('learnSection');
            learnSection.innerHTML = `
                <div style="max-width: 1200px; margin: 0 auto; padding: 40px 20px;">
                    <button onclick="window.renderLearnSection()" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; font-size: 16px; cursor: pointer; padding: 10px 20px; border-radius: 8px; margin-bottom: 30px; transition: all 0.2s;" 
                            onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'" 
                            onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">← Back to Openings</button>
                    
                    <div style="text-align: center; margin-bottom: 40px;">
                        <div style="font-size: 80px; margin-bottom: 20px;">${opening.emoji}</div>
                        <h1 style="color: #fff; margin: 0 0 10px 0; font-size: 42px; font-weight: bold;">${opening.name}</h1>
                        <div style="color: rgba(255, 255, 255, 0.6); font-size: 18px; margin-bottom: 15px;">${opening.level} | ${opening.rating}</div>
                        <div style="background: rgba(0, 0, 0, 0.3); display: inline-block; padding: 12px 24px; border-radius: 8px; font-family: monospace; color: #769656; font-size: 16px;">
                            ${opening.moves}
                        </div>
                    </div>
                    
                    <div id="openingBoard" style="width: 400px; height: 400px; margin: 0 auto 40px auto; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);"></div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-bottom: 40px;">
                        <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 25px;">
                            <h3 style="color: #fff; margin: 0 0 15px 0; font-size: 22px;">📖 Overview</h3>
                            <p style="color: rgba(255, 255, 255, 0.8); margin: 0; font-size: 15px; line-height: 1.7;">${opening.description}</p>
                        </div>
                        <div style="background: rgba(76, 175, 80, 0.1); border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 12px; padding: 25px;">
                            <h3 style="color: #4CAF50; margin: 0 0 15px 0; font-size: 22px;">💪 Strengths</h3>
                            <p style="color: rgba(255, 255, 255, 0.8); margin: 0; font-size: 15px; line-height: 1.7;">${opening.strength}</p>
                        </div>
                        <div style="background: rgba(244, 67, 54, 0.1); border: 1px solid rgba(244, 67, 54, 0.3); border-radius: 12px; padding: 25px;">
                            <h3 style="color: #f44336; margin: 0 0 15px 0; font-size: 22px;">⚠️ Weaknesses</h3>
                            <p style="color: rgba(255, 255, 255, 0.8); margin: 0; font-size: 15px; line-height: 1.7;">${opening.weakness}</p>
                        </div>
                        <div style="background: rgba(33, 150, 243, 0.1); border: 1px solid rgba(33, 150, 243, 0.3); border-radius: 12px; padding: 25px;">
                            <h3 style="color: #2196F3; margin: 0 0 15px 0; font-size: 22px;">🎯 How to Continue</h3>
                            <p style="color: rgba(255, 255, 255, 0.8); margin: 0; font-size: 15px; line-height: 1.7;">${opening.continuation}</p>
                        </div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 165, 0, 0.1)); border: 2px solid rgba(255, 215, 0, 0.3); border-radius: 12px; padding: 30px;">
                        <h3 style="color: #FFD700; margin: 0 0 15px 0; font-size: 24px;">🏆 Famous Game</h3>
                        <div style="color: #fff; font-size: 18px; font-weight: 600; margin-bottom: 10px;">${opening.famous_game}</div>
                        <p style="color: rgba(255, 255, 255, 0.8); margin: 0; font-size: 15px; line-height: 1.7;">${opening.famous_game_description}</p>
                    </div>
                </div>
            `;
            
            setTimeout(() => renderOpeningBoard(opening.fen), 100);
        };
        
        function renderOpeningBoard(fen) {
            const board = document.getElementById('openingBoard');
            if (!board) return;
            
            const pieceMap = {
                'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
                'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
            };
            
            const boardPart = fen.split(' ')[0];
            const rows = boardPart.split('/');
            
            let html = '<div style="display: grid; grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(8, 1fr); width: 100%; height: 100%;">';
            
            for (let rank = 0; rank < 8; rank++) {
                for (let file = 0; file < 8; file++) {
                    const isLight = (file + rank) % 2 === 0;
                    const color = isLight ? '#eeeed2' : '#769656';
                    let piece = '';
                    
                    if (rank < rows.length) {
                        let fileIndex = 0;
                        for (let char of rows[rank]) {
                            if (char >= '1' && char <= '8') {
                                fileIndex += parseInt(char);
                            } else {
                                if (fileIndex === file) {
                                    piece = pieceMap[char] || '';
                                    break;
                                }
                                fileIndex++;
                            }
                        }
                    }
                    
                    html += `<div style="background: ${color}; display: flex; align-items: center; justify-content: center; font-size: 36px;">${piece}</div>`;
                }
            }
            
            html += '</div>';
            board.innerHTML = html;
        }
        
        window.closeLearnSection = () => {
            document.getElementById('learnSection').style.display = 'none';
            document.getElementById('sidebarMenu').style.left = '0';
        };
    }

    async analyzeGame() {
        
        // Initialize analysis engine only when needed
        if (!this.analysisEngine) {
            this.analysisEngine = this.initAnalysisEngine();
            this.analyzer = new ChessAnalyzer(this.chess, this.analysisEngine);
        }

        if (this.moveHistory.length === 0) {
            alert('No moves to analyze yet! Make some moves first.');
            return;
        }
        

        const analyzeBtn = document.getElementById('analyzeBtn');
        const analysisPanel = document.getElementById('analysisPanel');
        const analysisContent = document.getElementById('analysisContent');
        
        // Initialize timing
        this.analysisStartTime = Date.now();
        this.totalMovesToAnalyze = this.moveHistory.length;
        this.movesAnalyzed = 0;
        
        analyzeBtn.textContent = 'Analyzing...';
        analyzeBtn.disabled = true;
        analysisPanel.style.display = 'block';
        analysisContent.innerHTML = '<p style="color: #888;">Analyzing moves... This may take a moment.</p>';

        this.moveAnalyses = [];
        
        // Store original game data for replay functionality
        this.originalMoveHistory = JSON.parse(JSON.stringify(this.moveHistory));
        this.originalMoveAnalyses = null;  // Will be set after analysis completes
        
        // Analyze each move
        for (let i = 0; i < this.moveHistory.length; i++) {
            try {
                const moveData = this.moveHistory[i];
                const analysis = await this.analyzer.analyzeMove(
                    moveData.move,
                    moveData.fenBefore,
                    moveData.fenAfter
                );
                
                this.moveAnalyses.push(analysis);
                this.movesAnalyzed = i + 1;
                
                // Update progress with time estimate
                const progress = Math.round(((i + 1) / this.moveHistory.length) * 100);
                const elapsed = (Date.now() - this.analysisStartTime) / 1000; // seconds
                const avgTimePerMove = elapsed / (i + 1);
                const remainingMoves = this.moveHistory.length - (i + 1);
                const estimatedSeconds = Math.ceil(avgTimePerMove * remainingMoves);
                const minutes = Math.floor(estimatedSeconds / 60);
                const seconds = estimatedSeconds % 60;
                
                let timeText = '';
                if (minutes > 0) {
                    timeText = `~${minutes}m ${seconds}s remaining`;
                } else {
                    timeText = `~${seconds}s remaining`;
                }
                
                analysisContent.innerHTML = `
                    <p style="color: #888;">
                        Analyzing... ${progress}%<br>
                        <span style="font-size: 11px; color: #666;">${timeText}</span>
                    </p>
                `;
            } catch (error) {
                console.error(`Error analyzing move ${i + 1}:`, error);
                // Add a fallback analysis for this move
                this.moveAnalyses.push({
                    move: this.moveHistory[i].move.san,
                    classification: 'good',
                    description: 'Move analysis failed',
                    suggestedMove: null,
                    evalBefore: 0,
                    evalAfter: 0,
                    evalChange: 0
                });
                this.movesAnalyzed = i + 1;
            }
        }

        // Store original analyses for replay functionality
        this.originalMoveAnalyses = JSON.parse(JSON.stringify(this.moveAnalyses));
        
        // Extract evaluations and annotations for enhanced display
        this.evaluations = this.moveAnalyses.map(a => a.evaluation || 0);
        this.annotations = this.moveAnalyses.map(a => a.classification || 'good');
        
        // Enable analysis mode
        this.analysisMode = true;
        this.currentMoveIndex = this.moveHistory.length - 1;
        
        // Show evaluation graph and navigation
        document.getElementById('evalGraph').style.display = 'block';
        document.getElementById('navControls').style.display = 'flex';
        

        // Draw evaluation graph
        this.drawEvaluationGraph();
        this.updateNavButtons();

        // Re-render move list with annotations
        this.updateMoveList();

        // Display results
        this.displayAnalysis();
        analyzeBtn.textContent = 'Analysis Complete';
        analyzeBtn.disabled = false;
    }

    displayAnalysis() {
        const analysisContent = document.getElementById('analysisContent');
        analysisContent.innerHTML = '';

        const classificationIcons = {
            'best': '⭐',
            'brilliant': '✨',
            'great': '👍',
            'good': '✓',
            'inaccuracy': '⚡',
            'mistake': '⚠️',
            'blunder': '❌',
            'missedWin': '🎯'
        };

        const classificationColors = {
            'best': '#00ff00',
            'brilliant': '#9c27b0',
            'great': '#4CAF50',
            'good': '#2196F3',
            'inaccuracy': '#ffc107',
            'mistake': '#ff9800',
            'blunder': '#f44336',
            'missedWin': '#FFD700'
        };

        // Only analyze moves that exist in both arrays
        const movesToDisplay = Math.min(this.moveAnalyses.length, this.moveHistory.length);
        
        for (let index = 0; index < movesToDisplay; index++) {
            const analysis = this.moveAnalyses[index];
            
            const moveDiv = document.createElement('div');
            moveDiv.className = 'analysis-move';
            moveDiv.style.cursor = 'pointer';
            moveDiv.style.padding = '8px';
            moveDiv.style.transition = 'background 0.2s';
            
            // Safety check - make sure moveHistory has data for this index
            if (!this.moveHistory[index]) {
                console.error(`Move history missing at index ${index}`);
                return;
            }
            
            // Store the FEN before this move
            const fenBefore = this.moveHistory[index].fenBefore;
            const fenAfter = this.moveHistory[index].fenAfter;
            
            moveDiv.addEventListener('click', () => {
                this.showPositionAtMove(index);
            });
            
            moveDiv.addEventListener('mouseenter', () => {
                moveDiv.style.background = 'rgba(255, 255, 255, 0.1)';
            });
            
            moveDiv.addEventListener('mouseleave', () => {
                moveDiv.style.background = 'transparent';
            });
            
            const moveNumber = Math.floor(index / 2) + 1;
            const isWhite = index % 2 === 0;
            
            // Determine if this is player's move or bot's move
            const isPlayerMove = (isWhite && this.playerColor === 'w') || (!isWhite && this.playerColor === 'b');
            const moveOwner = isPlayerMove ? '(Your move)' : '(Bot)';
            const ownerColor = isPlayerMove ? '#4CAF50' : '#ff9800';
            
            const moveLabel = isWhite ? `${moveNumber}. ${analysis.move}` : `${moveNumber}... ${analysis.move}`;
            
            const icon = classificationIcons[analysis.classification] || '✓';
            const color = classificationColors[analysis.classification] || '#888';
            
            let suggestedHTML = '';
            if (analysis.suggestedMove) {
                suggestedHTML = `<div style="margin-top: 4px; font-size: 11px; color: #4CAF50;">💡 Magnus would play: <strong>${analysis.suggestedMove}</strong></div>`;
            }
            
            moveDiv.innerHTML = `
                <div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <strong style="color: #fff; font-size: 13px;">${icon} ${moveLabel}</strong>
                        <span style="font-size: 10px; color: ${ownerColor}; font-weight: bold;">${moveOwner}</span>
                    </div>
                    <div style="font-size: 12px; color: #888; margin-top: 2px;">${analysis.description}</div>
                    ${suggestedHTML}
                </div>
                <div style="background: ${color}; padding: 4px 8px; border-radius: 4px; color: white; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                    ${analysis.classification}
                </div>
            `;
            
            analysisContent.appendChild(moveDiv);
        }

        // Add summary
        const summary = this.analyzer.generateAnalysisReport(this.moveAnalyses);
        const summaryDiv = document.createElement('div');
        summaryDiv.style.marginTop = '15px';
        summaryDiv.style.padding = '10px';
        summaryDiv.style.background = 'rgba(255, 255, 255, 0.05)';
        summaryDiv.style.borderRadius = '5px';
        summaryDiv.innerHTML = `
            <h4 style="color: #fff; margin-bottom: 10px;">Summary</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; font-size: 13px;">
                <div style="color: #00ff00;">⭐ Best Moves: ${summary.best || 0}</div>
                <div style="color: #FFD700;">🎯 Missed Wins: ${summary.missedWin || 0}</div>
                <div style="color: #9c27b0;">✨ Brilliant: ${summary.brilliant}</div>
                <div style="color: #4CAF50;">👍 Great: ${summary.great}</div>
                <div style="color: #2196F3;">✓ Good: ${summary.good}</div>
                <div style="color: #ffc107;">⚡ Inaccuracies: ${summary.inaccuracy || 0}</div>
                <div style="color: #ff9800;">⚠️ Mistakes: ${summary.mistake}</div>
                <div style="color: #f44336;">❌ Blunders: ${summary.blunder}</div>
            </div>
        `;
        analysisContent.appendChild(summaryDiv);
    }

    showPositionAtMove(index) {
        console.log('showPositionAtMove called for index:', index);
        
        // Use original analysis data if available (to support multiple replays)
        const analyses = this.originalMoveAnalyses || this.moveAnalyses;
        const analysis = analyses[index];
        console.log('Analysis:', analysis);
        
        // Check if this is a bot move (not player's move)
        const isWhiteMove = index % 2 === 0;
        const isPlayerMove = (isWhiteMove && this.playerColor === 'w') || (!isWhiteMove && this.playerColor === 'b');
        
        if (!isPlayerMove) {
            console.log('This is a bot move, showing bot move modal');
            this.showBotMoveModal(analysis);
            return;
        }
        
        const isImprovable = analysis.classification === 'blunder' || 
                             analysis.classification === 'mistake' || 
                             analysis.classification === 'inaccuracy' ||
                             analysis.classification === 'missedWin';
        
        console.log('isImprovable:', isImprovable, 'has suggestedMove:', !!analysis.suggestedMove);
        
        if (isImprovable && analysis.suggestedMove) {
            console.log('Showing replay dialog for', analysis.classification);
            // Show popup for improvable moves with suggested move
            this.showBlunderReplayDialog(index, analysis);
        } else {
            console.log('Replaying normally without dialog');
            // For good moves, just replay normally
            this.replayToMove(index, false);
        }
    }

    showBotMoveModal(analysis) {
        const modal = document.getElementById('botMoveModal');
        const message = document.getElementById('botMoveMessage');
        
        if (!modal || !message) {
            console.error('Bot move modal elements not found');
            return;
        }
        
        const classificationColors = {
            'blunder': '#f44336',
            'mistake': '#ff9800',
            'inaccuracy': '#ffc107',
            'missedWin': '#FFD700',
            'best': '#00ff00',
            'brilliant': '#9c27b0',
            'great': '#4CAF50',
            'good': '#2196F3'
        };
        
        const color = classificationColors[analysis.classification] || '#888';
        
        message.innerHTML = `
            <div style="text-transform: uppercase; color: ${color}; font-weight: bold; margin-bottom: 10px;">
                ${analysis.classification}
            </div>
            Bot played: <strong style="color: #ff9800;">${analysis.move}</strong><br>
            <span style="color: #888; font-size: 12px;">${analysis.description}</span>
        `;
        
        modal.style.display = 'flex';
        
        // Remove old listener and add new one
        const okBtn = document.getElementById('botMoveOkBtn');
        const newOkBtn = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        
        newOkBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    showBlunderReplayDialog(index, analysis) {
        console.log('showBlunderReplayDialog called');
        const modal = document.getElementById('blunderReplayModal');
        const message = document.getElementById('blunderReplayMessage');
        
        if (!modal) {
            console.error('blunderReplayModal not found in DOM!');
            return;
        }
        if (!message) {
            console.error('blunderReplayMessage not found in DOM!');
            return;
        }
        
        const classificationColors = {
            'blunder': '#f44336',
            'mistake': '#ff9800',
            'inaccuracy': '#ffc107',
            'missedWin': '#FFD700'
        };
        
        const color = classificationColors[analysis.classification] || '#888';
        
        message.innerHTML = `
            <div style="text-transform: uppercase; color: ${color}; font-weight: bold; margin-bottom: 10px;">
                ${analysis.classification}
            </div>
            You played: <strong style="color: #f44336;">${analysis.move}</strong><br>
            Suggested: <strong style="color: #4CAF50;">${analysis.suggestedMove}</strong>
        `;
        
        console.log('Showing modal...');
        modal.style.display = 'flex';
        console.log('Modal display set to flex');
        
        // Store the index for button handlers
        this.pendingReplayIndex = index;
        
        // Remove old listeners
        const newYesBtn = document.getElementById('replayWithSuggestion').cloneNode(true);
        const newNoBtn = document.getElementById('replayWithoutSuggestion').cloneNode(true);
        
        document.getElementById('replayWithSuggestion').parentNode.replaceChild(newYesBtn, document.getElementById('replayWithSuggestion'));
        document.getElementById('replayWithoutSuggestion').parentNode.replaceChild(newNoBtn, document.getElementById('replayWithoutSuggestion'));
        
        // Yes button - replay with suggestion arrow
        newYesBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            this.replayToMove(this.pendingReplayIndex, true);
        });
        
        // No button - just show position
        newNoBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            this.replayToMove(this.pendingReplayIndex, false);
        });
    }

    drawSuggestionArrow(from, to) {
        // Remove any existing arrow
        this.removeSuggestionArrow();
        
        const board = document.getElementById('chessboard');
        const fromSquare = board.querySelector(`[data-square="${from}"]`);
        const toSquare = board.querySelector(`[data-square="${to}"]`);
        
        if (!fromSquare || !toSquare) return;
        
        // Get board wrapper for positioning context
        const boardWrapper = board.closest('.board-wrapper') || board.parentElement;
        
        const fromRect = fromSquare.getBoundingClientRect();
        const toRect = toSquare.getBoundingClientRect();
        const wrapperRect = boardWrapper.getBoundingClientRect();
        
        // Calculate center points relative to wrapper
        const fromX = fromRect.left - wrapperRect.left + fromRect.width / 2;
        const fromY = fromRect.top - wrapperRect.top + fromRect.height / 2;
        const toX = toRect.left - wrapperRect.left + toRect.width / 2;
        const toY = toRect.top - wrapperRect.top + toRect.height / 2;
        
        // Create arrow container
        const arrow = document.createElement('div');
        arrow.id = 'suggestionArrow';
        arrow.style.cssText = `
            position: absolute;
            pointer-events: none;
            z-index: 1000;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        `;
        
        // Calculate arrow properties
        const dx = toX - fromX;
        const dy = toY - fromY;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        // Create SVG arrow for better rendering
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', wrapperRect.width);
        svg.setAttribute('height', wrapperRect.height);
        svg.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
        `;
        
        // Create arrow line
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', fromX);
        line.setAttribute('y1', fromY);
        line.setAttribute('x2', toX);
        line.setAttribute('y2', toY);
        line.setAttribute('stroke', '#4CAF50');
        line.setAttribute('stroke-width', '6');
        line.setAttribute('stroke-linecap', 'round');
        line.setAttribute('opacity', '0.8');
        
        // Add glow effect
        line.setAttribute('filter', 'drop-shadow(0 0 8px rgba(76, 175, 80, 0.8))');
        
        // Create arrow head
        const headLength = 15;
        const headWidth = 10;
        const endX = toX - (dx / length) * 10; // Stop before edge
        const endY = toY - (dy / length) * 10;
        
        const arrowHead = document.createElementNS(svgNS, 'polygon');
        const angle1 = Math.atan2(dy, dx) + Math.PI / 6;
        const angle2 = Math.atan2(dy, dx) - Math.PI / 6;
        
        const p1x = toX - headLength * Math.cos(angle1);
        const p1y = toY - headLength * Math.sin(angle1);
        const p2x = toX - headLength * Math.cos(angle2);
        const p2y = toY - headLength * Math.sin(angle2);
        
        arrowHead.setAttribute('points', `${toX},${toY} ${p1x},${p1y} ${p2x},${p2y}`);
        arrowHead.setAttribute('fill', '#4CAF50');
        arrowHead.setAttribute('opacity', '0.9');
        arrowHead.setAttribute('filter', 'drop-shadow(0 0 8px rgba(76, 175, 80, 0.8))');
        
        svg.appendChild(line);
        svg.appendChild(arrowHead);
        arrow.appendChild(svg);
        boardWrapper.appendChild(arrow);
        
        console.log('Arrow drawn from', from, 'to', to);
        console.log('From coordinates:', fromX, fromY);
        console.log('To coordinates:', toX, toY);
    }

    removeSuggestionArrow() {
        const existingArrow = document.getElementById('suggestionArrow');
        if (existingArrow) {
            existingArrow.remove();
        }
    }

    parseSuggestedMove(sanMove, fen) {
        // Parse algebraic notation to get from/to squares
        // This is a simplified parser - handles common cases
        try {
            const positionFen = fen || this.chess.fen();
            const tempChess = new Chess(positionFen);
            const moves = tempChess.moves({ verbose: true });
            
            console.log('Parsing suggested move:', sanMove, 'for FEN:', positionFen);
            console.log('Available moves:', moves.map(m => m.san));
            
            // Try to find the move that matches the SAN notation
            for (const move of moves) {
                if (move.san === sanMove) {
                    console.log('Found matching move:', move.from, '->', move.to);
                    return { from: move.from, to: move.to };
                }
            }
            
            console.warn('Exact SAN match not found for:', sanMove);
            
            // If exact match not found, try common patterns
            // Handle pawn moves (e4, d5, etc.)
            const pawnMove = sanMove.match(/^([a-h])([1-8])$/);
            if (pawnMove) {
                const file = pawnMove[1];
                const rank = pawnMove[2];
                const to = file + rank;
                // Find which pawn can move there
                for (const move of moves) {
                    if (move.to === to && move.piece === 'p') {
                        return { from: move.from, to: move.to };
                    }
                }
            }
            
            // Handle piece moves (Nf3, Bc4, etc.)
            const pieceMove = sanMove.match(/^([NBRQK])([a-h]?[1-8]?)?x?([a-h][1-8])$/);
            if (pieceMove) {
                const piece = pieceMove[1].toLowerCase();
                const to = pieceMove[3];
                for (const move of moves) {
                    if (move.to === to && move.piece === piece) {
                        return { from: move.from, to: move.to };
                    }
                }
            }
            
            // Handle captures (exd5, Nxf3, etc.)
            const captureMove = sanMove.match(/^([a-h]?)x?([a-h][1-8])$/);
            if (captureMove) {
                const to = captureMove[2];
                for (const move of moves) {
                    if (move.to === to) {
                        return { from: move.from, to: move.to };
                    }
                }
            }
            
            console.warn('Could not parse suggested move:', sanMove);
            return null;
        } catch (error) {
            console.error('Error parsing suggested move:', error);
            return null;
        }
    }

    replayToMove(targetIndex, showSuggestion) {
        // Reset to start position
        this.chess.reset();
        this.renderBoard();
        
        // Use original move history if available (to support multiple replays)
        const moveHistory = this.originalMoveHistory || this.moveHistory;
        
        let currentMove = 0;
        // Stop one move BEFORE the target (so user can play instead)
        const stopBefore = targetIndex;
        
        const replayInterval = setInterval(() => {
            if (currentMove < stopBefore) {
                // Play the next move from history
                const moveData = moveHistory[currentMove];
                
                // Safety check
                if (!moveData || !moveData.fenBefore) {
                    console.error('Move data missing at index', currentMove);
                    clearInterval(replayInterval);
                    return;
                }
                
                const fenBefore = moveData.fenBefore;
                const tempChess = new Chess(fenBefore);
                
                // Get the move that was played
                const moves = tempChess.moves({ verbose: true });
                const movePlayed = moveHistory[currentMove].move;
                
                // Find and play the move
                for (const move of moves) {
                    if (move.san === movePlayed.san) {
                        this.chess.move(move.san);
                        this.renderBoard();
                        break;
                    }
                }
                
                currentMove++;
            } else {
                // Reached the position BEFORE the target move
                clearInterval(replayInterval);
                
                // Use original analysis data if available
                const analyses = this.originalMoveAnalyses || this.moveAnalyses;
                const analysis = analyses[targetIndex];
                const moveNumber = Math.floor(targetIndex / 2) + 1;
                const isWhite = targetIndex % 2 === 0;
                
                // Truncate move history to this point
                this.moveHistory = this.moveHistory.slice(0, targetIndex);
                
                if (showSuggestion && analysis.suggestedMove) {
                    // For blunders/mistakes, show what you should have played
                    // Get username for status message
                    const playerName = (typeof currentUser !== 'undefined' && currentUser && currentUser.email) 
                        ? currentUser.email.split('@')[0] 
                        : 'Your';
                    this.statusDisplay.innerHTML = `
                        <div style="color: #ff9800;">⚠️ ${analysis.classification.toUpperCase()} - ${playerName}'s turn!</div>
                        <div style="font-size: 12px; color: #888; margin-top: 4px;">
                            You previously played: <strong style="color: #f44336;">${analysis.move}</strong>
                        </div>
                        <div style="font-size: 12px; color: #4CAF50; margin-top: 4px;">
                            💡 Suggested: <strong>${analysis.suggestedMove}</strong>
                        </div>
                        <div style="font-size: 11px; color: #888; margin-top: 6px;">
                            Make your move now...
                        </div>
                    `;
                    
                    // Draw arrow showing the suggested move
                    setTimeout(() => {
                        // Get the FEN from the position before the blunder move
                        const positionFen = moveHistory[targetIndex] ? moveHistory[targetIndex].fenBefore : this.chess.fen();
                        const suggestedMove = this.parseSuggestedMove(analysis.suggestedMove, positionFen);
                        if (suggestedMove) {
                            this.drawSuggestionArrow(suggestedMove.from, suggestedMove.to);
                        }
                    }, 100);
                } else {
                    // For good moves, just show what was played
                    const icon = analysis.classification === 'brilliant' ? '✨' :
                                analysis.classification === 'great' ? '👍' :
                                analysis.classification === 'best' ? '⭐' : '✓';
                    
                    this.statusDisplay.innerHTML = `
                        <div style="color: #4CAF50;">${icon} ${analysis.classification.toUpperCase()} - Move ${moveNumber}</div>
                        <div style="font-size: 12px; color: #fff; margin-top: 4px;">
                            Played: <strong>${analysis.move}</strong>
                        </div>
                        <div style="font-size: 11px; color: #888; margin-top: 4px;">
                            ${analysis.description}
                        </div>
                    `;
                }
                
                // Highlight the move in analysis panel
                const moveDivs = document.querySelectorAll('.analysis-move');
                moveDivs.forEach((div, i) => {
                    if (i === targetIndex) {
                        const highlightColor = showSuggestion ? '#ff9800' : '#4CAF50';
                        div.style.background = showSuggestion ? 'rgba(255, 152, 0, 0.3)' : 'rgba(76, 175, 80, 0.3)';
                        div.style.borderLeft = `3px solid ${highlightColor}`;
                    } else {
                        div.style.background = 'transparent';
                        div.style.borderLeft = 'none';
                    }
                });
                
                // Enable free play from this position
                this.gameOver = false;
                this.selectedSquare = null;
                this.lastMove = this.moveHistory.length > 0 ? this.moveHistory[this.moveHistory.length - 1].move : null;
                
                // Render board one more time to clear selections
                this.renderBoard();
            }
        }, 500); // 500ms per move for smooth animation
    }


    // ====== ANALYSIS MODE METHODS ======
    
    showAnnotationPopup(moveIndex, symbol, classification) {
        if (!this.analysisMode) {
            console.log('Not in analysis mode, cannot show popup');
            return;
        }
        
        // First, navigate to that exact position
        this.navToMove(moveIndex - 1); // Go to position BEFORE the move was made
        
        const popup = document.getElementById('annotationPopup');
        const title = document.getElementById('annotationTitle');
        const message = document.getElementById('annotationMessage');
        const retryBtn = document.getElementById('retryMoveBtn');
        
        // Get move SAN
        const moveData = this.moveHistory[moveIndex];
        const moveSAN = moveData ? moveData.move.san : 'Unknown';
        
        // Set title based on classification
        const titles = {
            'blunder': `?? Blunder on Move ${Math.floor(moveIndex / 2) + 1}`,
            'mistake': `? Mistake on Move ${Math.floor(moveIndex / 2) + 1}`,
            'inaccuracy': `?! Inaccuracy on Move ${Math.floor(moveIndex / 2) + 1}`,
            'good': `✓ Good Move ${Math.floor(moveIndex / 2) + 1}`,
            'best': `★ Best Move ${Math.floor(moveIndex / 2) + 1}`,
            'excellent': `! Excellent Move ${Math.floor(moveIndex / 2) + 1}`,
            'great': `!! Great Move ${Math.floor(moveIndex / 2) + 1}`,
            'brilliant': `!!! Brilliant Move ${Math.floor(moveIndex / 2) + 1}`,
            'missedWin': `Missed Win on Move ${Math.floor(moveIndex / 2) + 1}`
        };
        
        title.textContent = titles[classification] || `${symbol} ${classification} on Move ${Math.floor(moveIndex / 2) + 1}`;
        message.textContent = `Move ${moveSAN} was classified as ${classification}. Would you like to retry from this position?`;
        
        // Always show retry button
        retryBtn.style.display = 'block';
        
        // Change button text to be clearer
        retryBtn.textContent = '🔄 Retry From Here';
        
        popup.style.display = 'flex';
        
        // Store the move index for retry
        this.pendingRetryIndex = moveIndex;
        
        console.log(`Showing popup for move ${moveIndex}: ${classification}`);
    }
    
    navToMove(index) {
        if (!this.analysisMode || index < -1 || index >= this.moveHistory.length) return;
        
        // Reset to starting position
        this.chess.reset();
        
        // Replay moves up to index using the full move object
        for (let i = 0; i <= index; i++) {
            const moveData = this.moveHistory[i];
            // Use the complete move object with from, to, and promotion
            this.chess.move({
                from: moveData.move.from,
                to: moveData.move.to,
                promotion: moveData.move.promotion || 'q'
            });
        }
        
        this.currentMoveIndex = index;
        this.renderBoard();
        this.updateMoveList();
        this.updateNavButtons();
    }
    
    updateNavButtons() {
        const navFirst = document.getElementById('navFirst');
        const navPrev = document.getElementById('navPrev');
        const navNext = document.getElementById('navNext');
        const navLast = document.getElementById('navLast');
        
        if (navFirst) navFirst.disabled = this.currentMoveIndex <= 0;
        if (navPrev) navPrev.disabled = this.currentMoveIndex <= 0;
        if (navNext) navNext.disabled = this.currentMoveIndex >= this.moveHistory.length - 1;
        if (navLast) navLast.disabled = this.currentMoveIndex >= this.moveHistory.length - 1;
    }
    
    toggleAutoPlay() {
        this.isPlaying = !this.isPlaying;
        const navPlay = document.getElementById('navPlay');
        
        if (this.isPlaying) {
            navPlay.textContent = '⏸';
            // Start from beginning if at the end
            if (this.currentMoveIndex >= this.moveHistory.length - 1) {
                this.currentMoveIndex = -1;
            }
            this.autoPlayInterval = setInterval(() => {
                if (this.currentMoveIndex < this.moveHistory.length - 1) {
                    this.navToMove(this.currentMoveIndex + 1);
                } else {
                    this.toggleAutoPlay(); // Stop at the end
                }
            }, 1000);
        } else {
            navPlay.textContent = '▶';
            if (this.autoPlayInterval) {
                clearInterval(this.autoPlayInterval);
                this.autoPlayInterval = null;
            }
        }
    }
    
    drawEvaluationGraph() {
        const canvas = document.getElementById('evalCanvas');
        if (!canvas || this.evaluations.length === 0) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, width, height);
        
        // Draw center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        
        // Draw evaluation curve with smooth bezier curves
        if (this.evaluations.length > 1) {
            // Create gradient for the line
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, '#7fc83e');  // Green for positive
            gradient.addColorStop(0.5, '#fff');    // White for neutral
            gradient.addColorStop(1, '#fa412d');   // Red for negative
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            
            // Calculate points
            const points = [];
            const step = width / (this.evaluations.length - 1);
            
            for (let i = 0; i < this.evaluations.length; i++) {
                const x = i * step;
                const evalValue = Math.max(-10, Math.min(10, this.evaluations[i] / 100));
                const y = height / 2 - (evalValue / 10) * (height / 2);
                points.push({ x, y });
            }
            
            // Draw smooth curve using quadratic bezier
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            
            for (let i = 0; i < points.length - 1; i++) {
                const p0 = points[i];
                const p1 = points[i + 1];
                
                // Calculate control point for smooth curve
                const tension = 0.3;
                const cp1x = p0.x + (p1.x - p0.x) * tension;
                const cp1y = p0.y;
                const cp2x = p1.x - (p1.x - p0.x) * tension;
                const cp2y = p1.y;
                
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p1.x, p1.y);
            }
            ctx.stroke();
            
            // Draw filled area under curve
            ctx.lineTo(points[points.length - 1].x, height / 2);
            ctx.lineTo(points[0].x, height / 2);
            ctx.closePath();
            
            const fillGradient = ctx.createLinearGradient(0, 0, 0, height);
            fillGradient.addColorStop(0, 'rgba(127, 200, 62, 0.3)');
            fillGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
            fillGradient.addColorStop(1, 'rgba(250, 65, 45, 0.3)');
            ctx.fillStyle = fillGradient;
            ctx.fill();
            
            // Draw dots at each evaluation point
            for (let i = 0; i < this.evaluations.length; i++) {
                const x = i * step;
                const evalValue = Math.max(-10, Math.min(10, this.evaluations[i] / 100));
                const y = height / 2 - (evalValue / 10) * (height / 2);
                
                // Color based on annotation
                let color = '#fff';
                if (this.annotations[i]) {
                    if (this.annotations[i].includes('blunder')) color = '#fa412d';
                    else if (this.annotations[i].includes('mistake')) color = '#e58f2e';
                    else if (this.annotations[i].includes('inaccuracy')) color = '#f7c631';
                    else if (this.annotations[i].includes('good') || this.annotations[i].includes('best')) color = '#7fc83e';
                }
                
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
                
                // Add white border
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }
    }
    
    getAnnotationSymbol(annotation) {
        const symbols = {
            'brilliant': { symbol: '!!', class: 'annotation-brilliant' },
            'great': { symbol: '!', class: 'annotation-great' },
            'best': { symbol: '★', class: 'annotation-best' },
            'excellent': { symbol: '!', class: 'annotation-excellent' },
            'good': { symbol: '□', class: 'annotation-good' },
            'inaccuracy': { symbol: '?!', class: 'annotation-inaccuracy' },
            'mistake': { symbol: '?', class: 'annotation-mistake' },
            'blunder': { symbol: '??', class: 'annotation-blunder' },
            'book': { symbol: '📖', class: 'annotation-book' },
            'forced': { symbol: '□', class: 'annotation-forced' }
        };
        return symbols[annotation] || null;
    }
    
    // Admin function: Instant win
    instantWin() {
        if (!isAdmin) {
            alert('Admin privileges required!');
            return;
        }
        
        // Force checkmate - move king to a position where it's checkmated
        // Simple approach: just declare the game over with player winning
        this.gameOver = true;
        
        // Detect checkmate pattern if possible
        const matePattern = this.detectCheckmatePattern();
        
        // Show game over modal with normal victory message
        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('gameOverTitle');
        const message = document.getElementById('gameOverMessage');
        
        let botDisplayName;
        if (this.gameMode === 'practice') {
            botDisplayName = 'The engine';
        } else {
            botDisplayName = this.getBotDisplayName();
        }
        
        title.textContent = '🎉 Victory!';
        
        if (matePattern) {
            message.innerHTML = `You checkmated ${botDisplayName}! Incredible game!<br><br><strong>Checkmate Pattern: ${matePattern}</strong>`;
        } else {
            message.innerHTML = `You checkmated ${botDisplayName}! Incredible game!`;
        }
        
        modal.style.display = 'flex';
        
        // Trigger confetti for celebration
        this.triggerConfetti();
        
        // Stop timer if running
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        console.log('Game ended in victory!');
    }
    
    resetGame() {
        // Stop and reset timer
        this.stopTimer();
        this.playerTime = 0;
        this.botTime = 0;
        this.timerMode = null;
        this.currentTurn = null;
        this.updateTimerDisplay();
        
        // Reset bot selection
        this.selectedBot = null;
        
        this.chess.reset();
        this.selectedSquare = null;
        this.gameOver = false;
        this.moveAnalyses = [];
        this.moveHistory = [];
        this.lastMove = null;
        this.gameStarted = false;
        
        // Remove any suggestion arrow
        this.removeSuggestionArrow();
        
        // Restart engines
        if (this.stockfish) {
            this.stockfish.terminate();
            this.stockfish = this.initStockfish();
        }
        if (this.analysisEngine) {
            this.analysisEngine.terminate();
            this.analysisEngine = this.initAnalysisEngine();
            this.analyzer = new ChessAnalyzer(this.chess, this.analysisEngine);
        }
        
        // Disable analysis mode
        this.analysisMode = false;
        this.currentMoveIndex = -1;
        this.evaluations = [];
        this.annotations = [];
        this.isPlaying = false;
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
        }
        
        // Hide evaluation graph and navigation
        document.getElementById('evalGraph').style.display = 'none';
        document.getElementById('navControls').style.display = 'none';
        
        this.renderBoard();
        this.updateMoveList();
        this.updateStatus();
        document.getElementById('gameOverModal').style.display = 'none';
        document.getElementById('analysisPanel').style.display = 'none';
        document.getElementById('analyzeBtn').textContent = 'Analyze Game';
        
        // Reset undo button to disabled state
        document.getElementById('undoBtn').disabled = true;
        document.getElementById('undoBtn').style.opacity = '0.5';
        document.getElementById('undoBtn').style.cursor = 'not-allowed';
        
        // Reset bot display to default
        const botAvatar = document.getElementById('botAvatar');
        const botName = document.getElementById('botName');
        const botRating = document.getElementById('botRating');
        const chatBotName = document.getElementById('chatBotName');
        const botChatSection = document.getElementById('botChatSection');
        
        if (botAvatar) botAvatar.textContent = '🤖';
        if (botName) botName.textContent = 'THE ONE ABOVE ALL';
        if (botRating) botRating.textContent = 'Rating: ∞';
        if (chatBotName) chatBotName.textContent = '🤖 THE ONE ABOVE ALL';
        if (botChatSection) botChatSection.style.display = 'block';
        
        // Keep config panel hidden (using sidebar menu instead)
        // Don't show gameConfigPanel - it's hidden now
        document.getElementById('timeSelect').value = '';
        document.getElementById('colorSelect').value = '';
        document.getElementById('startGameBtn').disabled = true;
        document.getElementById('startGameBtn').style.opacity = '0.5';
        
        // Close rating modal and reset data
        document.getElementById('ratingModal').style.display = 'none';
        this.ratingData = {
            moveCount: 0,
            totalCentipawnLoss: 0,
            blunders: 0,
            mistakes: 0,
            inaccuracies: 0,
            bestMoves: 0,
            goodMoves: 0
        };
    }
}

// Make chessGame globally accessible for onclick handlers
let chessGame;

// ====== FIREBASE AUTHENTICATION ======
const firebaseConfig = {
    apiKey: "AIzaSyDWgh_RSlMtAbITn3EX0kwnKllHDprDsBo",
    authDomain: "chess-for-school.firebaseapp.com",
    databaseURL: "https://chess-for-school-default-rtdb.firebaseio.com",
    projectId: "chess-for-school",
    storageBucket: "chess-for-school.firebasestorage.app",
    messagingSenderId: "821345306269",
    appId: "1:821345306269:web:df4a603f5bb6e3effeb674",
    measurementId: "G-BY1BPQK9LQ"
};

// Initialize Firebase (replace config with your actual Firebase project)
let auth, db;
try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    // Use Realtime Database instead of Firestore
    db = firebase.database();
    console.log('Firebase initialized');
} catch (error) {
    console.error('Firebase initialization error:', error);
    auth = null;
    db = null;
}

// Auth state observer
let currentUser = null;
let isAdmin = false;

if (auth) {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            // Check if user is admin
            isAdmin = user.email === 'zaptin507@gmail.com';
            console.log('User logged in:', user.email, isAdmin ? '(ADMIN)' : '');
            
            // Set display name for admin (The One Above All) or use stored name
            if (isAdmin && !localStorage.getItem('displayName')) {
                localStorage.setItem('displayName', 'The One Above All');
            }
            const displayName = localStorage.getItem('displayName') || user.email.split('@')[0];
            
            // Show user profile
            const userProfile = document.getElementById('userProfile');
            const userDisplayName = document.getElementById('userDisplayName');
            const sidebarToggle = document.getElementById('sidebarToggle');
            const adminToggleBtn = document.getElementById('adminToggleBtn');
            
            if (userProfile) userProfile.style.display = 'flex';
            if (sidebarToggle) sidebarToggle.style.display = 'block';
            if (userDisplayName) userDisplayName.textContent = displayName + (isAdmin ? ' 👑' : '');
            
            // Show admin button only for admins
            if (adminToggleBtn) {
                adminToggleBtn.style.display = isAdmin ? 'inline-block' : 'none';
            }
            
            // Update player name in game UI
            const playerName = document.getElementById('playerName');
            if (playerName) playerName.textContent = displayName;
            
            // Update sidebar username
            const sidebarUsername = document.getElementById('sidebarUsername');
            if (sidebarUsername) sidebarUsername.textContent = displayName;
            
            // Update sidebar ELO/Rating
            const sidebarELO = document.getElementById('sidebarELO');
            if (sidebarELO) {
                const userELO = parseInt(localStorage.getItem('userELO')) || 0;
                if (userELO > 0) {
                    sidebarELO.textContent = `Rating: ${userELO}`;
                } else {
                    sidebarELO.textContent = 'Rating: Unrated';
                }
            }
            
            // Add click handler to user profile to show profile details
            const userProfileElement = document.getElementById('userProfile');
            if (userProfileElement) {
                userProfileElement.onclick = () => {
                    const currentELO = parseInt(localStorage.getItem('userELO')) || 0;
                    const displayName = localStorage.getItem('displayName') || user.email.split('@')[0];
                    const gamesPlayed = parseInt(localStorage.getItem('gamesPlayed')) || 0;
                    const wins = parseInt(localStorage.getItem('wins')) || 0;
                    const losses = parseInt(localStorage.getItem('losses')) || 0;
                    const draws = parseInt(localStorage.getItem('draws')) || 0;
                    
                    alert(`👤 Profile: ${displayName}\n\n` +
                        `Rating: ${currentELO > 0 ? currentELO : 'Unrated (Play The Tester to get rated!)'}\n` +
                        `Games: ${gamesPlayed}\n` +
                        `Record: ${wins}W - ${losses}L - ${draws}D\n` +
                        `Win Rate: ${gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0}%`);
                };
            }
            
            // Show tutorial for first-time users
            const tutorialCompleted = localStorage.getItem('chessTutorialCompleted');
            if (!tutorialCompleted) {
                // Show tutorial after a short delay
                setTimeout(() => {
                    showTutorial();
                }, 1000);
            }
            
            // Show admin panel if admin (DON'T show automatically - user must click button)
            if (isAdmin) {
                // Don't auto-show admin panel
                // showAdminPanel();
            }
        } else {
            currentUser = null;
            isAdmin = false;
            console.log('User logged out');
            const userProfile = document.getElementById('userProfile');
            const sidebarToggle = document.getElementById('sidebarToggle');
            if (userProfile) userProfile.style.display = 'none';
            if (sidebarToggle) sidebarToggle.style.display = 'none';
            hideAdminPanel();
            // Hide sidebar when logout
            const sidebar = document.getElementById('sidebarMenu');
            if (sidebar) sidebar.style.left = '-300px';
            // Reset sidebar ELO
            const sidebarELO = document.getElementById('sidebarELO');
            if (sidebarELO) sidebarELO.textContent = 'Rating: ---';
        }
    });
}

// Admin panel functions
window.toggleAdminPanel = () => {
    let adminPanel = document.getElementById('adminPanel');
    
    if (adminPanel && adminPanel.style.display === 'block') {
        // Hide panel
        adminPanel.style.display = 'none';
        return;
    }
    
    if (!adminPanel) {
        // Create admin panel as a toggleable window
        adminPanel = document.createElement('div');
        adminPanel.id = 'adminPanel';
        adminPanel.style.cssText = 'position: fixed; top: 60px; right: 10px; background: linear-gradient(135deg, #ff0000, #8b0000); padding: 15px; border-radius: 10px; box-shadow: 0 0 20px rgba(255, 0, 0, 0.8); z-index: 9999; min-width: 200px; display: none;';
        adminPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="color: #fff; margin: 0; font-size: 16px; text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);">👑 Admin</h3>
                <button onclick="document.getElementById('adminPanel').style.display='none'" style="background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; padding: 0; width: 25px; height: 25px; line-height: 1;">&times;</button>
            </div>
            <button id="adminInstantWin" style="width: 100%; padding: 8px; margin-bottom: 5px; background: #fff; color: #ff0000; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px;">⚡ Instant Win</button>
            <button id="adminResetGame" style="width: 100%; padding: 8px; background: rgba(255, 255, 255, 0.2); color: #fff; border: 2px solid #fff; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 14px;">🔄 Reset Game</button>
        `;
        document.body.appendChild(adminPanel);
        
        // Add event listeners
        document.getElementById('adminInstantWin').addEventListener('click', () => {
            if (chessGame) {
                chessGame.instantWin();
            }
        });
        
        document.getElementById('adminResetGame').addEventListener('click', () => {
            if (chessGame) {
                chessGame.resetGame();
            }
        });
    }
    
    adminPanel.style.display = 'block';
};

function showAdminPanel() {
    window.toggleAdminPanel();
}

function hideAdminPanel() {
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel) {
        adminPanel.style.display = 'none';
    }
}

// Sidebar toggle function
function toggleSidebar() {
    const sidebar = document.getElementById('sidebarMenu');
    const toggle = document.getElementById('sidebarToggle');
    
    if (sidebar.style.left === '0px') {
        sidebar.style.left = '-300px';
        toggle.style.left = '10px';
    } else {
        sidebar.style.left = '0px';
        toggle.style.left = '310px';
    }
}

// Board theme selection
let currentBoardTheme = 'classic';

function selectBoardTheme(theme) {
    currentBoardTheme = theme;
    
    // Update visual selection (only if elements exist)
    const themeElements = document.querySelectorAll('.board-theme');
    if (themeElements.length > 0) {
        themeElements.forEach(el => {
            el.style.border = '3px solid transparent';
        });
        const selectedElement = document.querySelector(`[data-theme="${theme}"]`);
        if (selectedElement) {
            selectedElement.style.border = '3px solid #4CAF50';
        }
    }
    
    // Apply theme to chessboard
    applyBoardTheme(theme);
    
    console.log('Board theme changed to:', theme);
}

function applyBoardTheme(theme) {
    const themes = {
        classic: { 
            light: '#f0d9b5',
            dark: '#b58863',
            pieces: 'classic'
        },
        green: { 
            light: '#eeeed2', 
            dark: '#769656',
            pieces: 'green'
        },
        blue: { 
            light: '#8ca2ad', 
            dark: '#2c3e50',
            pieces: '3d'
        },
        dark: { 
            light: '#777', 
            dark: '#444',
            pieces: 'minimal'
        },
        purple: { 
            light: '#e8d0f0', 
            dark: '#6c3483',
            pieces: 'purple'
        },
        red: { 
            light: '#ffcccc', 
            dark: '#8b0000',
            pieces: 'red'
        }
    };
    
    const config = themes[theme];
    if (!config) return;
    
    // Update board square colors
    document.querySelectorAll('.square.light').forEach(sq => {
        sq.style.background = config.light;
    });
    document.querySelectorAll('.square.dark').forEach(sq => {
        sq.style.background = config.dark;
    });
    
    // Update piece style
    applyPieceStyle(config.pieces);
    
    // Save preference to localStorage
    localStorage.setItem('boardTheme', theme);
}

function applyPieceStyle(style) {
    console.log('🎨 Applying piece style:', style);
    
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
        const svgElements = document.querySelectorAll('.piece svg');
        console.log('Found', svgElements.length, 'SVG pieces to style');
        
        svgElements.forEach((el, index) => {
            // Reset all styles first
            el.style.filter = 'none';
            el.style.transform = 'none';
            
            // Apply theme-specific effects to SVG pieces
            switch(style) {
                case '3d':
                    // Blue theme - heavy 3D effect
                    el.style.filter = 'drop-shadow(3px 5px 8px rgba(0,0,0,0.6)) brightness(1.1)';
                    break;
                case 'minimal':
                    // Dark theme - flat, desaturated
                    el.style.filter = 'grayscale(40%) brightness(0.85) drop-shadow(1px 1px 2px rgba(0,0,0,0.5))';
                    break;
                case 'green':
                    // Green theme - vibrant, chess.com style
                    el.style.filter = 'drop-shadow(2px 3px 4px rgba(0,0,0,0.4)) saturate(1.2)';
                    break;
                case 'purple':
                    // Purple theme - mystical glow
                    el.style.filter = 'drop-shadow(2px 3px 5px rgba(108, 52, 131, 0.6)) brightness(1.05)';
                    break;
                case 'red':
                    // Red theme - blood red tint
                    el.style.filter = 'drop-shadow(2px 3px 4px rgba(139, 0, 0, 0.5)) saturate(1.3) brightness(0.95)';
                    break;
                case 'classic':
                default:
                    // Classic theme - clean, subtle shadow
                    el.style.filter = 'drop-shadow(1px 2px 3px rgba(0,0,0,0.3))';
                    break;
            }
            
            if (index === 0) {
                console.log('✅ Applied', style, 'style to first piece. Filter:', el.style.filter);
            }
        });
    }, 50);
}

// Setup Firebase auth event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Open auth modal when clicking corner indicator
    const cornerIndicator = document.getElementById('cornerIndicator');
    if (cornerIndicator) {
        cornerIndicator.addEventListener('click', () => {
            if (currentUser) {
                // Already logged in, show profile options
                alert(`Logged in as: ${currentUser.email}\n\nClick Logout to sign out.`);
            } else {
                // Not logged in, show login modal
                const authModal = document.getElementById('authModal');
                const authError = document.getElementById('authError');
                const authSuccess = document.getElementById('authSuccess');
                if (authModal) authModal.style.display = 'flex';
                if (authError) authError.style.display = 'none';
                if (authSuccess) authSuccess.style.display = 'none';
            }
        });
    }
    
    // Close auth modal
    const closeAuthModal = document.getElementById('closeAuthModal');
    if (closeAuthModal) {
        closeAuthModal.addEventListener('click', () => {
            const authModal = document.getElementById('authModal');
            if (authModal) authModal.style.display = 'none';
        });
    }
    
    // Toggle between login and signup forms
    const showSignupBtn = document.getElementById('showSignupBtn');
    if (showSignupBtn) {
        showSignupBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const loginForm = document.getElementById('loginForm');
            const signupForm = document.getElementById('signupForm');
            const authTitle = document.getElementById('authTitle');
            if (loginForm) loginForm.style.display = 'none';
            if (signupForm) signupForm.style.display = 'block';
            if (authTitle) authTitle.textContent = 'Sign Up';
        });
    }
    
    const showLoginBtn = document.getElementById('showLoginBtn');
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const signupForm = document.getElementById('signupForm');
            const loginForm = document.getElementById('loginForm');
            const authTitle = document.getElementById('authTitle');
            if (signupForm) signupForm.style.display = 'none';
            if (loginForm) loginForm.style.display = 'block';
            if (authTitle) authTitle.textContent = 'Login';
        });
    }
    
    // Login button
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorDiv = document.getElementById('authError');
            
            if (!email || !password) {
                if (errorDiv) {
                    errorDiv.textContent = 'Please fill in all fields';
                    errorDiv.style.display = 'block';
                }
                return;
            }
            
            try {
                if (!auth) throw new Error('Firebase not configured');
                await auth.signInWithEmailAndPassword(email, password);
                const authModal = document.getElementById('authModal');
                if (authModal) authModal.style.display = 'none';
                console.log('Login successful');
            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = error.message;
                    errorDiv.style.display = 'block';
                }
            }
        });
    }
    
    // Signup button
    const signupBtn = document.getElementById('signupBtn');
    if (signupBtn) {
        signupBtn.addEventListener('click', async () => {
            const username = document.getElementById('signupUsername').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const errorDiv = document.getElementById('authError');
            const successDiv = document.getElementById('authSuccess');
            
            if (!username || !email || !password) {
                if (errorDiv) {
                    errorDiv.textContent = 'Please fill in all fields';
                    errorDiv.style.display = 'block';
                }
                return;
            }
            
            if (password.length < 6) {
                if (errorDiv) {
                    errorDiv.textContent = 'Password must be at least 6 characters';
                    errorDiv.style.display = 'block';
                }
                return;
            }
            
            try {
                if (!auth) throw new Error('Firebase not configured. Please set up Firebase first.');
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                
                // Save user profile to Realtime Database
                await db.ref('users/' + userCredential.user.uid).set({
                    username: username,
                    email: email,
                    elo: 1200,
                    gamesPlayed: 0,
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
                
                if (successDiv) {
                    successDiv.textContent = 'Account created! Logging you in...';
                    successDiv.style.display = 'block';
                }
                if (errorDiv) errorDiv.style.display = 'none';
                
                setTimeout(() => {
                    const authModal = document.getElementById('authModal');
                    if (authModal) authModal.style.display = 'none';
                }, 1000);
            } catch (error) {
                if (errorDiv) {
                    errorDiv.textContent = error.message;
                    errorDiv.style.display = 'block';
                }
                if (successDiv) successDiv.style.display = 'none';
            }
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                if (auth) {
                    await auth.signOut();
                    console.log('Logout successful');
                }
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
    
    // Profile Edit Button
    const editProfileBtn = document.getElementById('editProfileBtn');
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering userProfile click
            openProfileEditModal();
        });
    }
    
    // Profile Edit Modal Functions
    const profileEditModal = document.getElementById('profileEditModal');
    const profileNameInput = document.getElementById('profileNameInput');
    const closeProfileModal = document.getElementById('closeProfileModal');
    const cancelProfileEdit = document.getElementById('cancelProfileEdit');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    
    window.openProfileEditModal = () => {
        if (profileEditModal) {
            // Load current display name
            const currentName = localStorage.getItem('displayName') || '';
            if (profileNameInput) {
                profileNameInput.value = currentName;
            }
            profileEditModal.style.display = 'flex';
            // Focus on input
            setTimeout(() => {
                if (profileNameInput) profileNameInput.focus();
            }, 100);
        }
    };
    
    window.closeProfileEditModal = () => {
        if (profileEditModal) {
            profileEditModal.style.display = 'none';
        }
    };
    
    window.saveProfileName = () => {
        const newName = profileNameInput ? profileNameInput.value.trim() : '';
        
        if (!newName) {
            alert('Please enter a display name');
            return;
        }
        
        // Save to localStorage
        localStorage.setItem('displayName', newName);
        
        // Update all displays
        const userDisplayName = document.getElementById('userDisplayName');
        const sidebarUsername = document.getElementById('sidebarUsername');
        const playerName = document.getElementById('playerName');
        
        const displayName = newName + (isAdmin ? ' 👑' : '');
        
        if (userDisplayName) userDisplayName.textContent = displayName;
        if (sidebarUsername) sidebarUsername.textContent = displayName;
        if (playerName) playerName.textContent = newName;
        
        // Close modal
        window.closeProfileEditModal();
        
        // Show success message
        console.log('Profile name updated to:', newName);
    };
    
    // Event listeners for modal
    if (closeProfileModal) {
        closeProfileModal.addEventListener('click', window.closeProfileEditModal);
    }
    
    if (cancelProfileEdit) {
        cancelProfileEdit.addEventListener('click', window.closeProfileEditModal);
    }
    
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', window.saveProfileName);
    }
    
    // Allow Enter key to save
    if (profileNameInput) {
        profileNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                window.saveProfileName();
            }
        });
    }
    
    // Close modal when clicking outside
    if (profileEditModal) {
        profileEditModal.addEventListener('click', (e) => {
            if (e.target === profileEditModal) {
                window.closeProfileEditModal();
            }
        });
    }
});

// Load saved board theme
const savedTheme = localStorage.getItem('boardTheme');
if (savedTheme) {
    currentBoardTheme = savedTheme;
    // Apply after DOM is ready
    setTimeout(() => {
        selectBoardTheme(savedTheme);
    }, 100);
}

window.addEventListener('load', () => {
    console.log('Page loaded, initializing chess game...');
    try {
        chessGame = new ChessGame();
        console.log('Chess game initialized successfully');
        
        // Check for Tester reminder (every 6 months)
        chessGame.checkTesterReminder();
    } catch (error) {
        console.error('Error initializing chess game:', error);
        alert('Error loading chess game. Please check the console for details.');
    }
});
