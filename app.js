import safeStorage from './js/core/storage.js';
import './js/ui/admin.js';
import { initMobileSidebar } from './js/ui/sidebar.js';

class ChessGame {
    constructor() {
        this.chess = new Chess();
        this.board = document.getElementById('chessboard');
        this.statusDisplay = document.getElementById('status');
        this.movesList = document.getElementById('movesList');
        this.selectedSquare = null;
        this.legalMoves = [];
        this.gameOver = false;
        this.moveAnalyses = [];
        this.lastMove = null;
        this.moveHistory = []; // Store all moves for analysis
        this.stockfishReady = false;
        
        // Timer variables
        this.timerMode = null; // 'bullet', 'blitz', or 'rapid'
        
        // Bot selection
        this.selectedBot = null; // 'god' or 'mrstong' or 'tester'
        
        // Tester reminder system - check every 6 months
        this.lastTesterReminder = safeStorage.get('lastTesterReminder', null);
        this.estimatedTesterELO = safeStorage.getInt('testerEstimatedELO', 2000);
        this.userCurrentELO = safeStorage.getInt('userELO', 1200);
        
        // Rating estimation data for The Tester
        this.ratingData = {
            moveCount: 0,
            totalCentipawnLoss: 0,
            blunders: 0,
            mistakes: 0,
            inaccuracies: 0,
            bestMoves: 0,
            goodMoves: 0,
            brilliantMoves: 0
        };
        
        // Analysis mode state
        this.analysisMode = false;
        this.currentMoveIndex = -1;
        this.evaluations = [];
        this.annotations = [];
        this.isPlaying = false;
        
        // Board state
        this.boardFlipped = false;
        this.pendingPromotion = null;
        
        // Audio for chess sounds
        this.sounds = {
            move: new Audio('sounds/move.mp3'),
            capture: new Audio('sounds/capture.mp3'),
            check: new Audio('sounds/check.mp3')
        };
        // Preload sounds (silently fail if files don't exist)
        try {
            Object.values(this.sounds).forEach(sound => sound.load());
        } catch (e) {
            // Sounds are optional, game works without them
        }
        
        // Background music for Blitz & Bullet
        this.backgroundMusic = null;
        this.musicPlaying = false;
        this.audioContext = null;
        this.musicGainNode = null;
        
        // Sound effect method
        this.playSound = function(move) {
            try {
                let sound;
                if (move.captured) {
                    sound = this.sounds.capture;
                } else if (this.chess.in_check()) {
                    sound = this.sounds.check;
                    sound.volume = 0.9;
                } else {
                    sound = this.sounds.move;
                }
                sound.volume = sound.volume || 1.0;
                sound.currentTime = 0;
                sound.play().catch(() => {
                    // Silent fail if sound can't play (browser policy)
                });
            } catch (e) {
                // Silent fail if sound file doesn't exist
            }
        }.bind(this);
        
        // Background music methods for Blitz/Bullet
        this.startBackgroundMusic = async function() {
            // Only play music for Bullet and Blitz modes
            if (this.timerMode !== 'bullet' && this.timerMode !== 'blitz') {
                return;
            }
            
            if (this.musicPlaying) return;
            
            try {
                // Create audio context
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Resume audio context if suspended (required by modern browsers)
                // MUST await this before creating music!
                if (this.audioContext.state === 'suspended') {
                    await this.audioContext.resume();
                } else {
                }
                
                // Create gain node for volume control
                this.musicGainNode = this.audioContext.createGain();
                this.musicGainNode.gain.value = 0.15; // Lower volume so it doesn't overpower
                this.musicGainNode.connect(this.audioContext.destination);
                
                // Create an intense, looping rhythmic pattern (Dream Theater style)
                this.createIntenseLoop();
                
                this.musicPlaying = true;
            } catch (e) {
                console.error('❌ Music error:', e);
                console.error('Error stack:', e.stack);
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
        if (this.messageContains(msg, ['stupid', 'dumb', 'bad', 'idiot','fuck'])) {
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
        // Guard: winProbability might not be initialized yet during init()
        if (!this.winProbability) {
            return;
        }
        
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
            const stockfish = new Worker('stockfish.js');
            stockfish.postMessage('uci');
            // Don't set Skill Level here - it will be set dynamically based on ELO
            stockfish.postMessage('setoption name Hash value 128');
            return stockfish;
        } catch (error) {
            console.error('❌ Failed to initialize Stockfish:', error);
            return null;
        }
    }

    initAnalysisEngine() {
        // Create a separate Stockfish instance for analysis
        try {
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
        if (this.movesList) {
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
    }

    setupDropdowns() {
        const timeSelect = document.getElementById('sidebarTimeSelect');
        const colorSelect = document.getElementById('sidebarColorSelect');
        const startGameBtn = document.getElementById('sidebarStartGameBtn');        
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
    showSections(sectionsToShow = [], sectionsToHide = [], displayType = 'block') {
        sectionsToShow.forEach(id => {
            const el = this.getElement(id);
            if (el) el.style.display = displayType;
        });
        sectionsToHide.forEach(id => {
            const el = this.getElement(id);
            if (el) el.style.display = 'none';
        });
    }
    
    updateBotDisplay() {
        // Skip updateBotDisplay in practice mode
        if (this.gameMode === 'practice') {
            return;
        }
        
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
        if (elements.analyzeBtn) elements.analyzeBtn.style.display = config.showAnalyze ? 'flex' : 'none';
    }
    
    checkBossBattleReady() {
        // Check if we're in Chess.com sidebar or Boss Battle section
        const chessSidebar = document.getElementById('chessSidebar');
        const playSection = document.getElementById('playSection');
        
        let timeSelect, colorSelect, startBtn;
        
        // Determine which UI we're using
        if (chessSidebar && chessSidebar.style.display !== 'none') {
            // Chess.com sidebar
            timeSelect = chessSidebar.querySelector('#sidebarTimeSelect');
            colorSelect = chessSidebar.querySelector('#sidebarColorSelect');
            startBtn = chessSidebar.querySelector('#sidebarStartGameBtn');
        } else if (playSection && playSection.style.display !== 'none') {
            // Boss Battle section
            timeSelect = playSection.querySelector('#timeSelect');
            colorSelect = playSection.querySelector('#colorSelect');
            startBtn = document.getElementById('startGameBtn');
        } else {
            // Fallback
            timeSelect = document.getElementById('sidebarTimeSelect');
            colorSelect = document.getElementById('sidebarColorSelect');
            startBtn = document.getElementById('sidebarStartGameBtn');
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
        const timeSelect = document.getElementById('sidebarTimeSelect');
        const colorSelect = document.getElementById('sidebarColorSelect');
        const startGameBtn = document.getElementById('sidebarStartGameBtn');
        
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
        const timeSelect = document.getElementById('sidebarTimeSelect');
        const colorSelect = document.getElementById('sidebarColorSelect');
        
        // Set game parameters
        this.timerMode = timeSelect.value;
        // this.selectedBot is already set by bot card click handler
        this.playerColor = colorSelect.value === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorSelect.value;
        
        
        this.updateBotDisplay();
        this.startGame();
    }

    startGame() {
        this.gameStarted = true;
        
        // Load saved preferences
        this.loadPreferences();
        
        
        // Start background music for Bullet & Blitz modes
        if (this.timerMode === 'bullet' || this.timerMode === 'blitz') {
            setTimeout(async () => {
                await this.startBackgroundMusic();
            }, 500); // Delay slightly to ensure audio context is ready
        }
        
        // Initialize timers based on selected mode
        if (this.timerMode === 'infinite' || !['bullet', 'blitz', 'rapid', 'classical'].includes(this.timerMode)) {
            this.playerTime = Infinity;
            this.botTime = Infinity;
            this.timerMode = 'infinite';
        } else if (this.timerMode === 'bullet') {
            this.playerTime = 60;
            this.botTime = 60;
        } else if (this.timerMode === 'blitz') {
            this.playerTime = 300;
            this.botTime = 300;
        } else if (this.timerMode === 'rapid') {
            this.playerTime = 600;
            this.botTime = 600;
        } else if (this.timerMode === 'classical') {
            this.playerTime = 1800;
            this.botTime = 1800;
        }
        
        this.updateTimerDisplay();
        
        this.chess.reset();
        this.renderBoard();
        
        
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
        
        // Initialize Chess.com-style interval blunder schedule for Mrs. Tong
        // She plays at intermediate level (~1400 ELO) with mandatory mistakes
        // at set intervals to create a realistic human-like experience.
        if (this.selectedBot === 'mrstong') {
            this._botMoveCount = 0;
            this._blunderSchedule = this._generateBlunderSchedule(1400);
        }
        
        // Bot greeting - different for each bot (skip in practice mode)
        if (this.gameMode !== 'practice') {
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
        }
        
        // If player is black, make bot (white) move first
        if (this.playerColor === 'b') {
            this.currentTurn = 'bot';
            // Show correct bot name based on game mode
            let botName;
            if (this.gameMode === 'practice') {
                botName = 'Engine';
            } else {
                botName = this.selectedBot === 'mrstong' ? 'Mrs. Tong' : 'THE ONE ABOVE ALL';
            }
            this.statusDisplay.textContent = `${botName} (White) moves first...`;
            // Only start timer if not in infinite mode
            if (this.timerMode !== 'infinite') {
                this.startTimer();
            }
            setTimeout(() => {
                this.makeBotMove();
            }, 500);
        } else {
            this.currentTurn = 'player';
            // Show correct message based on game mode
            if (this.gameMode === 'practice') {
                this.statusDisplay.textContent = 'Your turn (White) - Click a piece to move';
            } else {
                this.statusDisplay.textContent = 'Your turn (White) - Click a piece to move';
            }
            // Only start timer if not in infinite mode
            if (this.timerMode !== 'infinite') {
                this.startTimer();
            }
        }
        
        this.updateTurnIndicator();
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
        this.updateTurnIndicator();
    }

    handlePlayerTimeout() {
        // Don't timeout in practice mode with infinite time
        if (this.gameMode === 'practice' && this.timerMode === 'infinite') {
            return;
        }
        
        this.stopTimer();
        this.gameOver = true;
        this.updateTurnIndicator();
        
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
        // Don't timeout in practice mode with infinite time
        if (this.gameMode === 'practice' && this.timerMode === 'infinite') {
            return;
        }
        
        this.stopTimer();
        this.gameOver = true;
        this.updateTurnIndicator();
        
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
        this.board.innerHTML = '';
        const position = this.chess.board();

        // Render coordinates
        this.renderCoordinates();

        // Determine if board should be flipped (player as black, or manual flip)
        const isFlipped = this.boardFlipped ? 
            (this.playerColor === 'w') : 
            (this.playerColor === 'b');

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
                    
                    // Enable drag and drop for player's pieces
                    if (piece.color === this.playerColor && !this.gameOver && this.gameStarted) {
                        pieceElement.draggable = true;
                        pieceElement.dataset.square = squareName;
                        pieceElement.dataset.piece = pieceKey;
                        
                        
                        // Add drag event listeners
                        pieceElement.addEventListener('dragstart', (e) => this.handleDragStart(e, squareName));
                        pieceElement.addEventListener('dragend', (e) => this.handleDragEnd(e));
                    } else {
                        pieceElement.draggable = false;
                    }
                    
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

                // Add drag and drop event listeners to squares
                square.addEventListener('dragover', (e) => this.handleSquareDragOver(e));
                square.addEventListener('dragleave', (e) => this.handleSquareDragLeave(e));
                square.addEventListener('drop', (e) => this.handleSquareDrop(e, squareName));
                this.board.appendChild(square);
            }
        }

        this.showLegalMoves();
        
        // Apply saved board theme after rendering
        this.applyBoardTheme(safeStorage.get('boardTheme', 'green'));
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
            // Check if this is a pawn promotion move (must be a legal promotion)
            const sourcePiece = this.chess.get(this.selectedSquare);
            const isPromotion = sourcePiece && sourcePiece.type === 'p' && 
                (square[1] === '8' || square[1] === '1') &&
                this.chess.moves({ square: this.selectedSquare, verbose: true })
                    .some(m => m.to === square && m.promotion);
            
            if (isPromotion) {
                // Store the move info and show promotion modal
                this.pendingPromotion = {
                    from: this.selectedSquare,
                    to: square
                };
                this.showPromotionModal();
                return;
            }
            
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
                    const hangingPiece = this.detectHangingPiece();
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

    // Drag and Drop Handlers
    handleDragStart(e, square) {
        
        if (this.gameOver || !this.gameStarted) {
            e.preventDefault();
            return;
        }
        
        if (this.chess.turn() !== this.playerColor) {
            e.preventDefault();
            return;
        }
        
        
        // Set the dragged piece data
        e.dataTransfer.setData('text/plain', square);
        e.dataTransfer.effectAllowed = 'move';
        
        // Add visual feedback
        setTimeout(() => {
            e.target.style.opacity = '0.5';
        }, 0);
        
        // Store the source square
        this.draggedPiece = square;
        
    }
    
    handleDragEnd(e) {
        // Restore opacity
        e.target.style.opacity = '1';
        
        // Clear drag state
        this.draggedPiece = null;
        
        // Remove highlight from all squares
        document.querySelectorAll('.square').forEach(sq => {
            sq.classList.remove('drag-over');
        });
    }
    
    handleSquareDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        // Highlight the square
        e.currentTarget.classList.add('drag-over');
    }
    
    handleSquareDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }
    
    handleSquareDrop(e, targetSquare) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const sourceSquare = this.draggedPiece;
        if (!sourceSquare) return;
        
        
        // Attempt the move
        const piece = this.chess.get(sourceSquare);
        if (piece && piece.color === this.playerColor) {
            // Check if this is a pawn promotion move (must be a legal promotion)
            const isPromotion = piece.type === 'p' && 
                (targetSquare[1] === '8' || targetSquare[1] === '1') &&
                this.chess.moves({ square: sourceSquare, verbose: true })
                    .some(m => m.to === targetSquare && m.promotion);
            
            if (isPromotion) {
                // Store the move info and show promotion modal
                this.pendingPromotion = {
                    from: sourceSquare,
                    to: targetSquare
                };
                this.showPromotionModal();
                return;
            }
            
            const fenBefore = this.chess.fen();
            const move = this.chess.move({
                from: sourceSquare,
                to: targetSquare,
                promotion: 'q' // Always promote to queen for simplicity
            });
            
            if (move) {
                // Valid move - play sound
                this.playSound(move);
                
                // Track move for analysis
                this.moveHistory.push({
                    move: move,
                    fenBefore: fenBefore,
                    fenAfter: this.chess.fen()
                });
                
                this.lastMove = move;
                this.selectedSquare = null;
                
                // Track move for The Tester
                if (this.selectedBot === 'tester') {
                    const playerMoveSAN = move.san;
                    setTimeout(() => {
                        this.analyzePlayerMove(playerMoveSAN, fenBefore);
                    }, 100);
                }
                
                this.renderBoard();
                this.updateMoveList();
                this.updateStatus();
                
                // Switch timer to bot
                this.switchTurn();
                
                // Bot reacts occasionally
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
            } else {
                // Invalid move - re-render to clear selection
                this.selectedSquare = null;
                this.renderBoard();
            }
        }
    }

    undoMove() {
        // Allow undo in all game modes (casual play)
        
        // Can't undo if no moves have been made
        if (this.moveHistory.length === 0) return;
        
        // In bot/play mode, undo both the bot's move AND the player's last move
        // So the player gets to retry their turn
        if (this.gameMode !== 'practice' && this.moveHistory.length >= 2) {
            // Remove the last two moves (bot move + player move)
            this.moveHistory.pop(); // bot move
            const prevMove = this.moveHistory.pop(); // player move
            
            // Restore the position before the player's move
            this.chess.load(prevMove.fenBefore);
            this.lastMove = this.moveHistory.length > 0 ? this.moveHistory[this.moveHistory.length - 1].move : null;
            
            // Mark undo has pending (we'll restore the timer turn state)
            this.currentTurn = 'player';
        } else {
            // Practice mode or only 1 move: simple undo
            const lastMove = this.moveHistory.pop();
            this.chess.load(lastMove.fenBefore);
            this.lastMove = this.moveHistory.length > 0 ? this.moveHistory[this.moveHistory.length - 1].move : null;
        }
        
        this.renderBoard();
        this.updateMoveList();
        this.updateTurnIndicator();
        
        // Update status - it's player's turn again
        if (this.chess.turn() === this.playerColor) {
            this.statusDisplay.textContent = 'Your turn - Click a piece to move';
        } else {
            this.statusDisplay.textContent = "Engine's turn - thinking...";
        }
    }
    
    // Pawn Promotion Modal
    showPromotionModal() {
        const modal = document.getElementById('promotionModal');
        if (!modal) return;
        modal.style.display = 'flex';
        
        // Set up one-time click handlers for promotion options
        const options = modal.querySelectorAll('.promotion-option');
        const handler = (e) => {
            const piece = e.currentTarget.dataset.piece;
            modal.style.display = 'none';
            this.executePromotion(piece);
            // Remove event listeners
            options.forEach(opt => opt.removeEventListener('click', handler));
        };
        options.forEach(opt => opt.addEventListener('click', handler));
    }
    
    executePromotion(promotionPiece) {
        if (!this.pendingPromotion) return;
        
        const { from, to } = this.pendingPromotion;
        this.pendingPromotion = null;
        
        const fenBefore = this.chess.fen();
        const move = this.chess.move({
            from: from,
            to: to,
            promotion: promotionPiece
        });
        
        if (move) {
            this.playSound(move);
            this.removeSuggestionArrow();
            
            this.moveHistory.push({
                move: move,
                fenBefore: fenBefore,
                fenAfter: this.chess.fen()
            });
            
            // Check for hanging piece in practice mode
            if (this.gameMode === 'practice') {
                const hangingPiece = this.detectHangingPiece();
                if (hangingPiece) {
                    this.showHangingPiecePopup(hangingPiece, fenBefore);
                    return;
                }
            }
            
            this.lastMove = move;
            this.selectedSquare = null;
            this.renderBoard();
            this.updateMoveList();
            this.updateStatus();
            this.updateTurnIndicator();
            
            // Track move for The Tester
            if (this.selectedBot === 'tester') {
                const playerMoveSAN = move.san;
                setTimeout(() => {
                    this.analyzePlayerMove(playerMoveSAN, fenBefore);
                }, 100);
            }
            
            this.switchTurn();
            
            // Bot reaction
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
        } else {
            this.selectedSquare = null;
            this.renderBoard();
        }
    }
    
    // Resign the current game
    resignGame() {
        if (!this.gameStarted || this.gameOver) return;
        
        this.stopTimer();
        this.stopBackgroundMusic();
        this.gameOver = true;
        
        const botDisplayName = this.getBotDisplayName();
        this.statusDisplay.textContent = `You resigned. ${botDisplayName} wins!`;
        
        if (this.selectedBot === 'mrstong') {
            this.addBotMessage("Good game! There's no shame in resigning — it's a sign of respect. Well played!");
        } else if (this.selectedBot === 'god') {
            this.addBotMessage("Wise choice. Sometimes surrender is the only rational option against a god.");
        }
        
        this.updateTurnIndicator();
        
        // Show the game over modal after a brief pause
        setTimeout(() => {
            this.showGameOverModal('resign', 'You resigned');
        }, 800);
    }
    
    // Show the game over modal with result
    showGameOverModal(result, customMessage) {
        const modal = document.getElementById('gameOverModal');
        if (!modal) return;
        
        let title, message;
        const botDisplayName = this.gameMode === 'practice' ? 'The engine' : this.getBotDisplayName();
        
        if (result === 'win') {
            title = '🎉 Victory!';
            message = customMessage || `You defeated ${botDisplayName}!`;
            this.triggerConfetti();
        } else if (result === 'loss') {
            title = 'Defeat';
            message = customMessage || `${botDisplayName} defeated you.`;
        } else if (result === 'resign') {
            title = 'Resigned';
            message = `You resigned. ${botDisplayName} wins.`;
        } else {
            title = 'Game Over';
            message = customMessage || 'The game has ended.';
        }
        
        document.getElementById('gameOverTitle').textContent = title;
        document.getElementById('gameOverMessage').textContent = message;
        modal.style.display = 'flex';
        
        // Save to game history
        this.saveGameToHistory(result, message, botDisplayName);
        
        // Auto-analyze
        if (this.moveHistory.length > 0) {
            this.analyzeGame();
        }
    }
    
    // Flip the board perspective
    flipBoard() {
        this.boardFlipped = !this.boardFlipped;
        this.renderBoard();
        this.updateTurnIndicator();
    }
    
    // Update visual turn indicator (highlight active player)
    updateTurnIndicator() {
        const topPlayer = document.querySelector('.player-info.top');
        const bottomPlayer = document.querySelector('.player-info.bottom');
        
        if (!topPlayer || !bottomPlayer) return;
        
        // Remove active class from both
        topPlayer.classList.remove('active-turn');
        bottomPlayer.classList.remove('active-turn');
        
        if (this.gameOver || !this.gameStarted) return;
        
        // Determine whose turn it is visually
        // If board is flipped, top = bottom perspective and vice versa
        const topIsPlayer = this.boardFlipped ? 
            (this.playerColor === 'b') : 
            (this.playerColor === 'w');
        
        if (this.currentTurn === 'player') {
            if (topIsPlayer) {
                topPlayer.classList.add('active-turn');
            } else {
                bottomPlayer.classList.add('active-turn');
            }
        } else {
            if (topIsPlayer) {
                bottomPlayer.classList.add('active-turn');
            } else {
                topPlayer.classList.add('active-turn');
            }
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
            return null;
        }
        
        // Return the most valuable hanging piece (only if it's a single piece)
        if (hangingPieces.length === 1) {
            // Sort by piece value (queen > rook > bishop/knight > pawn)
            const pieceValues = { q: 9, r: 5, b: 3, n: 3, p: 1, k: 0 };
            hangingPieces.sort((a, b) => pieceValues[b.piece.type] - pieceValues[a.piece.type]);
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
        
        if (this.gameOver || !this.gameStarted) {
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
        
        const listener = (event) => {
            const match = event.data.match(/^bestmove\s+(\S+)/);
            if (match) {
                this.stockfish.removeEventListener('message', listener);
                
                const bestMove = match[1];
                
                // Guard: Stockfish returns '(none)' when no legal moves exist
                if (bestMove === '(none)') {
                    console.warn('⚠️ Stockfish returned no valid move — game may be over');
                    this.handleGameOver();
                    return;
                }
                
                // Interval-based blunder injection for practice mode.
                // Chess.com bots play accurately at a set interval, then make
                // a mandatory mistake to "rebalance" their rating.
                let finalMoveUCI = bestMove;
                if (this.gameMode === 'practice' && this._blunderSchedule && this._blunderSchedule.has(this._botMoveCount)) {
                    finalMoveUCI = this._makeBlunderMove(bestMove);
                }
                
                const from = finalMoveUCI.substring(0, 2);
                const to = finalMoveUCI.substring(2, 4);
                const promotion = finalMoveUCI.length > 4 ? finalMoveUCI[4] : 'q';

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
        
        // Set difficulty based on game mode
        if (this.gameMode === 'practice' || this.selectedBot === 'mrstong') {
            // Chess.com-style difficulty system: depth control + interval blunder schedule.
            // Used by: Practice mode (variable ELO) and Mrs. Tong (fixed intermediate ~1400).
            //
            // NOTE: Stockfish 10.0.2 WASM build does NOT support "Skill Level" option,
            // so we rely on depth + mandatory blunder intervals for realistic difficulty.
            // Ratings are inflated ~200-500 pts vs human strength (per community analysis).
            
            const effectiveElo = this.gameMode === 'practice' ? this.engineElo : 1400;
            
            // Increment bot move counter for blunder schedule tracking
            this._botMoveCount = (this._botMoveCount || 0) + 1;
            
            let depth;
            if (effectiveElo <= 400) {
                depth = 1;   // Single-ply: static eval only, no look-ahead
            } else if (effectiveElo <= 600) {
                depth = 1;
            } else if (effectiveElo <= 800) {
                depth = 2;
            } else if (effectiveElo <= 1000) {
                depth = 3;
            } else if (effectiveElo <= 1200) {
                depth = 4;
            } else if (effectiveElo <= 1400) {
                depth = 6;
            } else if (effectiveElo <= 1600) {
                depth = 8;
            } else if (effectiveElo <= 1800) {
                depth = 10;
            } else if (effectiveElo <= 2000) {
                depth = 14;
            } else if (effectiveElo <= 2400) {
                depth = 16;
            } else {
                depth = 18;
            }
            
            // Ensure Skill Level is set for this move (safety net)
            const skillLevel = this.getSkillLevel(effectiveElo);
            this.stockfish.postMessage(`setoption name Skill Level value ${skillLevel}`);
            this.stockfish.postMessage(`go depth ${depth}`);
        } else {
            // Boss battle mode: Use fixed depth per bot
            // THE ONE ABOVE ALL: depth 16 (expert level)
            // The Tester: depth 8 (neutral level for rating)
            const depth = this.selectedBot === 'tester' ? 8 : 16;
            this.stockfish.postMessage(`go depth ${depth}`);
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
        if (this.selectedBot !== 'tester' || !this.ratingData.pendingMoves || this.ratingData.pendingMoves.length === 0) {
            return;
        }
        const moveCount = this.ratingData.pendingMoves.length;
        
        // Determine result
        const playerLost = this.chess.in_checkmate() && this.chess.turn() === this.playerColor;
        const playerWon = this.chess.in_checkmate() && this.chess.turn() !== this.playerColor;
        const isDraw = this.chess.in_draw() || this.chess.in_stalemate() || this.chess.in_threefold_repetition();
        
        // Initialize metrics
        let totalCentipawnLoss = 0;
        let blunders = 0;
        let mistakes = 0;
        let inaccuracies = 0;
        let bestMoves = 0;
        let goodMoves = 0;
        let brilliantMoves = 0;
        let forcedMoves = 0;
        
        // Analyze each move with Stockfish
        for (let i = 0; i < this.ratingData.pendingMoves.length; i++) {
            const moveData = this.ratingData.pendingMoves[i];
            
            try {
                // Check if this is a forced move (should not be rated)
                const isForced = this.isForcedMove(moveData.fen, moveData.san);
                
                if (isForced) {
                    forcedMoves++;
                    continue; // Skip this move from analysis
                }
                                // Get position evaluation before the move (from White's perspective)
                const evalBefore = await this.getPositionEvaluation(moveData.fen);
                
                // Determine whose turn it is
                const isWhiteTurn = moveData.fen.split(' ')[1] === 'w';
                
                // Get the position after the player's move
                const tempChess = new Chess(moveData.fen);
                tempChess.move(moveData.san);
                const fenAfter = tempChess.fen();
                const evalAfter = await this.getPositionEvaluation(fenAfter);
                
                // Calculate centipawn loss correctly
                // Stockfish eval is always from White's perspective
                // If it's White's turn and eval decreases (e.g., +100 → -50), that's a loss of 150
                // If it's Black's turn and eval increases (e.g., -100 → +50), that's a loss of 150
                
                let centipawnLoss = 0;
                
                if (isWhiteTurn) {
                    // White moved: positive eval is good for White
                    // If evalBefore > evalAfter, White made the position worse
                    centipawnLoss = Math.max(0, evalBefore - evalAfter);
                } else {
                    // Black moved: negative eval is good for Black
                    // If evalBefore < evalAfter, Black made the position worse (eval became more positive)
                    centipawnLoss = Math.max(0, evalAfter - evalBefore);
                }
                
                
                totalCentipawnLoss += centipawnLoss;
                
                // Check for brilliant move BEFORE regular classification
                // Brilliant move criteria (chess.com style):
                // 1. It's a best move (0-20 CPL)
                // 2. It's a sacrifice (gives up material)
                // 3. It's a quiet move (no check or capture)
                // 4. It's unique (only one best move)
                let isBrilliant = false;
                
                if (centipawnLoss < 20) {
                    // Check if it's a sacrifice
                    const tempChessForSacrifice = new Chess(moveData.fen);
                    const moveObj = tempChessForSacrifice.move(moveData.san);
                    
                    if (moveObj) {
                        const isCapture = moveObj.flags.includes('c'); // capture
                        const isPromotion = moveObj.flags.includes('p'); // promotion
                        const hasCheck = moveData.san.includes('+') || moveData.san.includes('#');
                        
                        // Check if it's a sacrifice: we gave up material
                        const wasSacrifice = this.isSacrifice(moveData.fen, moveData.san);
                        
                        // Brilliant = best move + sacrifice + quiet (no check/capture)
                        if (wasSacrifice && !isCapture && !hasCheck) {
                            isBrilliant = true;
                            brilliantMoves++;
                        }
                    }
                }
                
                // Regular classification (only if not brilliant)
                if (!isBrilliant) {
                    if (centipawnLoss === 0) {
                        bestMoves++; // Perfect move
                    } else if (centipawnLoss < 20) {
                        bestMoves++; // Excellent (close enough to best)
                    } else if (centipawnLoss < 50) {
                        goodMoves++; // Great move
                    } else if (centipawnLoss < 100) {
                        goodMoves++; // Good move
                    } else if (centipawnLoss < 200) {
                        inaccuracies++; // Inaccuracy
                    } else if (centipawnLoss < 400) {
                        mistakes++; // Mistake
                    } else {
                        blunders++; // Blunder
                    }
                }
                
            } catch (error) {
                console.error(`Error analyzing move ${i + 1}:`, error);
                // Assume moderate error if analysis fails
                totalCentipawnLoss += 200;
                mistakes++;
            }
        }
        
        // Store metrics
        this.ratingData.totalCentipawnLoss = totalCentipawnLoss;
        this.ratingData.blunders = blunders;
        this.ratingData.mistakes = mistakes;
        this.ratingData.inaccuracies = inaccuracies;
        this.ratingData.bestMoves = bestMoves;
        this.ratingData.goodMoves = goodMoves;
        this.ratingData.moveCount = moveCount;
        this.ratingData.result = playerLost ? 'loss' : (playerWon ? 'win' : 'draw');
        
        
        // Calculate ELO based on comprehensive metrics
        // Range: 200-3000
        
        // Start with base of 1500 (average player)
        let estimatedELO = 1500;
        
        // Factor 1: Game result (strong impact)
        if (playerLost) {
            estimatedELO -= 300; // Lost game
        } else if (playerWon) {
            estimatedELO += 400; // Won game
        } else if (isDraw) {
            estimatedELO += 100; // Drew
        }
        
        // Factor 2: Move quality (centipawn loss)
        const avgCentipawnLoss = totalCentipawnLoss / moveCount;
        
        // Scale ELO based on average centipawn loss
        // Lower CPL = higher ELO (better player)
        // 0-20 CPL = 2800+ ELO (Grandmaster)
        // 20-50 CPL = 2400 ELO (Master)
        // 50-100 CPL = 2000 ELO (Expert)
        // 100-200 CPL = 1500 ELO (Intermediate)
        // 200-350 CPL = 1000 ELO (Beginner)
        // 350-500 CPL = 600 ELO (Novice)
        // 500+ CPL = 300 ELO (Very beginner)
        
        if (avgCentipawnLoss < 20) {
            estimatedELO = Math.min(estimatedELO + 800, 3000); // Grandmaster level
        } else if (avgCentipawnLoss < 50) {
            estimatedELO = Math.min(estimatedELO + 600, 2800); // Master level
        } else if (avgCentipawnLoss < 100) {
            estimatedELO = Math.min(estimatedELO + 300, 2400); // Expert
        } else if (avgCentipawnLoss < 200) {
            estimatedELO = Math.min(estimatedELO + 100, 1800); // Intermediate
        } else if (avgCentipawnLoss < 350) {
            estimatedELO = Math.max(estimatedELO - 200, 800); // Beginner
        } else if (avgCentipawnLoss < 500) {
            estimatedELO = Math.max(estimatedELO - 500, 500); // Novice
        } else {
            estimatedELO = Math.max(estimatedELO - 800, 200); // Very beginner
        }
        
        // Factor 3: Blunder rate
        const blunderRate = blunders / moveCount;
        
        if (blunderRate > 0.4) {
            estimatedELO -= 500; // Very high blunder rate
        } else if (blunderRate > 0.3) {
            estimatedELO -= 400; // High blunder rate
        } else if (blunderRate > 0.2) {
            estimatedELO -= 250; // Moderate blunder rate
        } else if (blunderRate > 0.1) {
            estimatedELO -= 100; // Low blunder rate
        }
        
        // Factor 4: Best move rate
        const bestMoveRate = bestMoves / moveCount;
        
        if (bestMoveRate > 0.7) {
            estimatedELO += 400; // Exceptional accuracy
        } else if (bestMoveRate > 0.5) {
            estimatedELO += 250; // Very good accuracy
        } else if (bestMoveRate > 0.3) {
            estimatedELO += 100; // Good accuracy
        } else if (bestMoveRate > 0.15) {
            estimatedELO += 30; // Decent accuracy
        }
        
        // Factor 5: Game length consideration
        if (moveCount < 3) {
            // Too few moves, can't estimate accurately
            estimatedELO = 1200; // Default to beginner-intermediate
        } else if (moveCount < 8) {
            // Short game, reduce confidence
            estimatedELO = Math.round(estimatedELO * 0.85);
        } else if (moveCount < 15) {
            // Medium game
            estimatedELO = Math.round(estimatedELO * 0.95);
        }
        
        // Clamp to valid range: 200-3000
        estimatedELO = Math.max(200, Math.min(3000, estimatedELO));
        estimatedELO = Math.round(estimatedELO);
        
        this.ratingData.estimatedELO = estimatedELO;
        
        
        // Store the estimate
        safeStorage.set('testerEstimatedELO', estimatedELO);
        
        // Apply ELO boost
        this.calculateELOBoost(estimatedELO);
    }
    
    // Helper function to check if a move is a sacrifice
    isSacrifice(fen, moveSAN) {
        try {
            const chess = new Chess(fen);
            const playerColor = chess.turn(); // Color of the player making the move
            
            // Get piece values
            const pieceValues = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
            
            // Count material before the move
            let materialBefore = 0;
            const board = chess.board();
            for (let row of board) {
                for (let square of row) {
                    if (square && square.color === playerColor) {
                        materialBefore += pieceValues[square.type] || 0;
                    }
                }
            }
            
            // Make the move
            chess.move(moveSAN);
            
            // Count material after the move (playerColor is still the same player)
            let materialAfter = 0;
            const boardAfter = chess.board();
            for (let row of boardAfter) {
                for (let square of row) {
                    if (square && square.color === playerColor) {
                        materialAfter += pieceValues[square.type] || 0;
                    }
                }
            }
            
            // If we have less material after (and it wasn't a capture), it's a sacrifice
            const isCapture = moveSAN.includes('x');
            return materialAfter < materialBefore && !isCapture;
        } catch (error) {
            return false;
        }
    }
    

    // Check if a move is forced (should not be rated)
    isForcedMove(fen, moveSAN) {
        try {
            const chess = new Chess(fen);
            
            // Get all legal moves
            const legalMoves = chess.moves({ verbose: true });
            
            // If in check, see if there's only one legal move
            if (chess.in_check()) {
                // Count legal moves
                if (legalMoves.length === 1) {
                    return true;
                }
                
                // If multiple moves, check if only one doesn't lose immediately
                const playerColor = chess.turn();
                let nonLosingMoves = 0;
                
                for (const move of legalMoves) {
                    const tempChess = new Chess(fen);
                    tempChess.move(move.san);
                    
                    // If opponent can checkmate next move, this move loses
                    if (tempChess.in_checkmate()) {
                        continue; // This move loses
                    }
                    
                    // Get evaluation after this move
                    const evalAfter = this.getQuickEvaluation(tempChess.fen());
                    
                    // If eval is not terrible (>-1000), it's a reasonable move
                    const isWhiteTurn = playerColor === 'w';
                    const evalForPlayer = isWhiteTurn ? evalAfter : -evalAfter;
                    
                    if (evalAfter > -1000) {
                        nonLosingMoves++;
                    }
                }
                
                // If only one move doesn't lose immediately, it's forced
                if (nonLosingMoves === 1) {
                    return true;
                }
            }
            
            // Check if the player is losing significant material no matter what
            // Get current evaluation
            const evalBefore = this.getQuickEvaluation(fen);
            
            let reasonableMoves = 0;
            const playerColor = chess.turn();
            
            for (const move of legalMoves) {
                const tempChess = new Chess(fen);
                tempChess.move(move.san);
                
                // Get evaluation after this move
                const evalAfter = this.getQuickEvaluation(tempChess.fen());
                
                // Calculate centipawn loss for this move
                const isWhiteTurn = playerColor === 'w';
                let centipawnLoss;
                
                if (isWhiteTurn) {
                    centipawnLoss = Math.max(0, evalBefore - evalAfter);
                } else {
                    centipawnLoss = Math.max(0, evalAfter - evalBefore);
                }
                
                // If centipawn loss is reasonable (< 300), it's a reasonable move
                if (centipawnLoss < 300) {
                    reasonableMoves++;
                }
            }
            
            // If only one reasonable move, it's practically forced
            if (reasonableMoves === 1 && legalMoves.length > 1) {
                return true;
            }
            
            return false;
        } catch (error) {
            // If we can't determine, assume not forced
            return false;
        }
    }
    
    // Quick evaluation for forced move detection (lower depth for speed)
    getQuickEvaluation(fen) {
        return new Promise((resolve) => {
            const tempEngine = new Worker('stockfish.js');
            
            let evaluation = 0;
            let resolved = false;
            
            const listener = (event) => {
                if (resolved) return;
                
                const cpMatch = event.data.match(/cp\s+(-?\d+)/);
                const mateMatch = event.data.match(/mate\s+(-?\d+)/);
                
                if (mateMatch) {
                    const mateIn = parseInt(mateMatch[1]);
                    evaluation = mateIn > 0 ? 10000 : -10000;
                    resolved = true;
                    tempEngine.removeEventListener('message', listener);
                    tempEngine.terminate();
                    resolve(evaluation);
                } else if (cpMatch) {
                    evaluation = parseInt(cpMatch[1]);
                }
                
                if (event.data.startsWith('bestmove')) {
                    if (!resolved) {
                        resolved = true;
                        tempEngine.removeEventListener('message', listener);
                        tempEngine.terminate();
                        resolve(evaluation);
                    }
                }
            };
            
            tempEngine.addEventListener('message', listener);
            tempEngine.postMessage('uci');
            tempEngine.postMessage(`position fen ${fen}`);
            tempEngine.postMessage('go depth 12'); // Lower depth for speed
            
            // Timeout after 2 seconds
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    tempEngine.removeEventListener('message', listener);
                    tempEngine.terminate();
                    resolve(evaluation);
                }
            }, 2000);
        });
    }
    // Helper function to get position evaluation
    async getPositionEvaluation(fen) {
        return new Promise((resolve) => {
            const tempEngine = new Worker('stockfish.js');
            
            let evaluation = 0;
            const listener = (event) => {
                const cpMatch = event.data.match(/cp\s+(-?\d+)/);
                const mateMatch = event.data.match(/mate\s+(-?\d+)/);
                
                if (mateMatch) {
                    // Mate in X moves - use large number
                    const mateIn = parseInt(mateMatch[1]);
                    evaluation = mateIn > 0 ? 10000 : -10000;
                } else if (cpMatch) {
                    evaluation = parseInt(cpMatch[1]);
                }
                
                if (event.data.startsWith('bestmove')) {
                    tempEngine.removeEventListener('message', listener);
                    tempEngine.terminate();
                    resolve(evaluation);
                }
            };
            
            tempEngine.addEventListener('message', listener);
            tempEngine.postMessage('uci');
            tempEngine.postMessage(`position fen ${fen}`);
            tempEngine.postMessage('go depth 15');
        });
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
    
    // Evaluate current position and display evaluation to user
    async evaluateCurrentPosition() {
        if (!this.analysisEngine) {
            alert('Analysis engine not initialized. Please wait or reload.');
            return;
        }
        
        const currentFEN = this.chess.fen();
        const evaluation = await this.getPositionEvaluation(currentFEN);
        
        if (!evaluation) {
            alert('Failed to evaluate position');
            return;
        }
        
        // Convert centipawns to pawn units
        const evalInPawns = (evaluation.score / 100).toFixed(2);
        const isPositive = evaluation.score > 0;
        const side = isPositive ? 'White' : 'Black';
        
        // Determine advantage level
        let advantage = 'Equal';
        const absScore = Math.abs(evaluation.score);
        if (absScore > 300) advantage = 'Winning';
        else if (absScore > 150) advantage = 'Clear advantage';
        else if (absScore > 50) advantage = 'Slight advantage';
        
        alert(`📊 Position Evaluation\n\n` +
              `Score: ${isPositive ? '+' : ''}${evalInPawns}\n` +
              `Advantage: ${advantage} for ${side}\n` +
              `Depth: 18\n\n` +
              `${absScore < 50 ? 'Position is balanced' : side + ' has the advantage'}`);
    }
    
    calculateELO() {
        if (this.ratingData.moveCount < 3) {
            return null;
        }
        
        const elo = this.ratingData.estimatedELO || this.ratingData.baseElo || 1200;
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
        
        // Build detailed stats
        let statsHTML = '';
        if (this.ratingData.brilliantMoves !== undefined && this.ratingData.brilliantMoves > 0) {
            statsHTML += `<div style="color: #FFD700; font-size: 15px; margin: 8px 0; font-weight: bold;">✨ Brilliant Moves: ${this.ratingData.brilliantMoves}</div>`;
        }
        if (this.ratingData.bestMoves !== undefined) {
            statsHTML += `<div style="color: #fff; font-size: 14px; margin: 5px 0;">⭐ Best Moves: ${this.ratingData.bestMoves}</div>`;
        }
        if (this.ratingData.goodMoves !== undefined) {
            statsHTML += `<div style="color: #fff; font-size: 14px; margin: 5px 0;">👍 Good Moves: ${this.ratingData.goodMoves}</div>`;
        }
        if (this.ratingData.inaccuracies !== undefined) {
            statsHTML += `<div style="color: #fff; font-size: 14px; margin: 5px 0;">⚡ Inaccuracies: ${this.ratingData.inaccuracies}</div>`;
        }
        if (this.ratingData.mistakes !== undefined) {
            statsHTML += `<div style="color: #fff; font-size: 14px; margin: 5px 0;">⚠️ Mistakes: ${this.ratingData.mistakes}</div>`;
        }
        if (this.ratingData.blunders !== undefined) {
            statsHTML += `<div style="color: #ff6b6b; font-size: 14px; margin: 5px 0;">❌ Blunders: ${this.ratingData.blunders}</div>`;
        }
        if (this.ratingData.totalCentipawnLoss !== undefined && this.ratingData.moveCount > 0) {
            const avgCPL = Math.round(this.ratingData.totalCentipawnLoss / this.ratingData.moveCount);
            statsHTML += `<div style="color: #aaa; font-size: 13px; margin: 10px 0 5px 0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">📊 Avg Centipawn Loss: ${avgCPL}</div>`;
        }
        
        return {
            elo: Math.round(elo),
            eloRange: `${Math.round(elo - 100)}-${Math.round(elo + 100)}`,
            level: level,
            levelEmoji: levelEmoji,
            description: description,
            totalMoves: this.ratingData.moveCount,
            result: resultMsg,
            statsHTML: statsHTML
        };
    }
    
    showRatingModal() {
        const result = this.calculateELO();
        if (!result) {
            console.error('❌ calculateELO returned null!');
            alert('Not enough moves to estimate ELO. Play at least 3 moves.');
            return;
        }
        const ratingResult = document.getElementById('ratingResult');
        ratingResult.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 48px; margin-bottom: 10px;">${result.levelEmoji}</div>
                <div style="font-size: 24px; color: #4CAF50; font-weight: bold; margin-bottom: 5px;">${result.level}</div>
                <div style="font-size: 42px; color: #fff; font-weight: bold; margin: 15px 0; text-shadow: 0 0 20px rgba(76, 175, 80, 0.5);">ELO: ${result.elo}</div>
                <div style="font-size: 16px; color: #aaa; margin-bottom: 10px;">Estimated Range: ${result.eloRange}</div>
                <div style="font-size: 18px; color: #fff; margin-bottom: 10px;">${result.result}</div>
            </div>
            
            <div style="background: rgba(255, 255, 255, 0.05); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <div style="color: #aaa; font-size: 14px; margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">📊 Game Summary</div>
                <div style="color: #fff; font-size: 15px; margin: 8px 0;">Moves played: ${result.totalMoves}</div>
                ${result.statsHTML || ''}
            </div>
            
            <div style="color: #ddd; font-size: 14px; line-height: 1.6; padding: 10px; background: rgba(76, 175, 80, 0.1); border-left: 3px solid #4CAF50; border-radius: 4px;">
                ${result.description}
            </div>
            
            <div style="color: #888; font-size: 11px; margin-top: 15px; text-align: center; font-style: italic;">
                Analysis powered by The Tester • ${result.totalMoves} moves analyzed
            </div>
        `;
        
        this.showSections(['ratingModal'], [], 'flex');
    }

    renderCoordinates() {
        const ranksLeft = document.getElementById('ranksLeft');
        const filesBottom = document.getElementById('filesBottom');
        
        if (!ranksLeft || !filesBottom) return;
        
        ranksLeft.innerHTML = '';
        filesBottom.innerHTML = '';
        
        // Determine orientation based on player color AND manual flip
        const isFlipped = this.boardFlipped ? 
            (this.playerColor === 'w') : 
            (this.playerColor === 'b');
        
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

    // Build annotated move HTML with optional clickable badge
    buildAnnotatedMoveHtml(moveSan, moveIndex) {
        if (!moveSan || !this.annotations || !this.annotations[moveIndex]) {
            return moveSan || '';
        }
        
        const classification = this.annotations[moveIndex];
        const annot = this.getAnnotationSymbol(classification);
        if (!annot) return moveSan;
        
        const badgeClass = annot.class;
        const symbol = annot.symbol;
        
        // Only bad moves get clickable badges for retry via event delegation in init()
        const BAD_MOVES = ['blunder', 'mistake', 'inaccuracy', 'missedWin'];
        if (BAD_MOVES.includes(classification)) {
            return `<span class="move-with-annotation">${moveSan}<span class="move-annotation ${badgeClass}" data-move-index="${moveIndex}">${symbol}</span></span>`;
        }
        
        return `<span class="move-with-annotation">${moveSan}<span class="move-annotation ${badgeClass}">${symbol}</span></span>`;
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
            const whiteMoveHtml = this.buildAnnotatedMoveHtml(history[i], i);

            // Black move with annotation
            const blackMoveHtml = this.buildAnnotatedMoveHtml(history[i + 1], i + 1);

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
        popup.className = 'tester-reminder-overlay';
        
        const testerELO = this.estimatedTesterELO;
        const userELO = this.userCurrentELO;
        const boostedELO = Math.round((testerELO - userELO) / 2 + userELO);
        
        // Get display name from localStorage or fallback
        const username = safeStorage.get('displayName') ||
            ((typeof currentUser !== 'undefined' && currentUser && currentUser.email) 
                ? currentUser.email.split('@')[0] 
                : 'Player');
        
        popup.innerHTML = `
            <div class="tester-reminder-content">
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
        safeStorage.set('lastTesterReminder', this.lastTesterReminder);
        
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
        safeStorage.set('lastTesterReminder', oneMonthLater.toISOString());
    }
    
    // Calculate ELO boost after playing The Tester
    calculateELOBoost(testerEstimatedELO) {
        const userELO = this.userCurrentELO;
        const boostedELO = Math.round((testerEstimatedELO - userELO) / 2 + userELO);
        
        // Only boost if the estimated ELO is higher
        if (testerEstimatedELO > userELO) {
            this.userCurrentELO = boostedELO;
            safeStorage.set('userELO', boostedELO);
            safeStorage.set('testerEstimatedELO', testerEstimatedELO);
            
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
            safeStorage.set('testerEstimatedELO', testerEstimatedELO);
            
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
        if (this.chess.game_over()) {
            this.gameOver = true;
            // Call handleGameOver() which will run async analysis for The Tester
            this.handleGameOver();
            return;
        }

        // Detect opening
        this.openingName = this.detectOpening();
        
        const botName = this.selectedBot === 'mrstong' ? "Mrs. Tong's" : (this.selectedBot === 'tester' ? "The Tester's" : "THE ONE ABOVE ALL's");
        const turn = this.chess.turn() === this.playerColor ? 'Your' : (this.gameMode === 'practice' ? "Engine's" : botName);
        const inCheck = this.chess.in_check() ? ' - CHECK!' : '';
        
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
        
        // Update turn indicator
        this.updateTurnIndicator();
    }

    async handleGameOver() {
        // Stop the timer when game ends
        this.stopTimer();
        
        // Stop background music when game ends
        this.stopBackgroundMusic();
        
        // Clear turn indicator
        this.updateTurnIndicator();
        
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

        // Save game to history for profile page
        const gameResult = title === '🎉 Victory!' ? 'win' : title === 'Defeat' ? 'loss' : 'draw';
        this.saveGameToHistory(gameResult, message, botDisplayName);

        // Show rating modal for The Tester
        if (this.selectedBot === 'tester') {
            try {
                await this.analyzeAllMoves();
                // Check if we have enough data
                if (!this.ratingData.estimatedELO) {
                    console.error('❌ No ELO estimated!');
                    alert('Unable to calculate ELO. Please play more moves.');
                    return;
                }
                
                // Show rating modal after a delay (after game over modal is visible)
                setTimeout(() => {
                    this.showRatingModal();
                    
                    // After showing rating, calculate ELO boost
                    const estimatedELO = this.ratingData.estimatedELO || 1200;
                    setTimeout(() => {
                        this.calculateELOBoost(estimatedELO);
                    }, 2000);
                }, 1000);
            } catch (error) {
                console.error('❌ Error during ELO analysis:', error);
                console.error('Error stack:', error.stack);
                // Show error message
                alert('Error calculating ELO: ' + error.message);
            }
        } else {
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

    // Shared game restart logic — used by both New Game and Play Again buttons
    restartWithSettings({ practiceMode, engineElo, bot, timerMode, playerColor }) {
        this.resetGame();
        
        // Restore game mode settings
        if (practiceMode) {
            this.gameMode = 'practice';
            this.engineElo = engineElo;
            this.selectedBot = null; // Practice mode doesn't use selectedBot
            
            // Reconfigure Stockfish for practice mode
            if (this.stockfish && engineElo) {
                const skillLevel = this.getSkillLevel(engineElo);
                this.stockfish.postMessage(`setoption name Skill Level value ${skillLevel}`);
            }
        } else if (bot) {
            this.selectedBot = bot;
        }
        
        if (timerMode) this.timerMode = timerMode;
        if (playerColor) this.playerColor = playerColor;
        
        // Update UI dropdowns to match restored settings
        const timeSelect = document.getElementById('sidebarTimeSelect');
        const colorSelect = document.getElementById('sidebarColorSelect');
        if (timeSelect && timerMode) timeSelect.value = timerMode;
        if (colorSelect && playerColor) colorSelect.value = playerColor;
        
        this.updateBotDisplay();
        
        // Hide chess.com sidebar if visible
        const chessSidebar = document.getElementById('chessSidebar');
        if (chessSidebar) chessSidebar.style.display = 'none';
        
        // Only reposition sidebar menu on desktop (mobile uses overlay)
        if (window.innerWidth > 768) {
            const sidebarMenu = document.getElementById('sidebarMenu');
            if (sidebarMenu) sidebarMenu.style.left = '0';
        }
        
        this.startGame();
    }

    setupEventListeners() {
        // Save reference to 'this' for use in window functions
        const gameInstance = this;
        
        // Make gameInstance available globally for other functions
        window.chessGame = this;
        
        document.getElementById('newGame').addEventListener('click', () => {
            const wasPracticeMode = this.gameMode === 'practice';
            const savedEngineElo = this.engineElo;
            const savedTimerMode = this.timerMode;
            const savedBot = this.selectedBot;
            const savedPlayerColor = this.playerColor;
            
            if (wasPracticeMode || savedBot) {
                this.restartWithSettings({
                    practiceMode: wasPracticeMode,
                    engineElo: savedEngineElo,
                    bot: savedBot,
                    timerMode: savedTimerMode,
                    playerColor: savedPlayerColor
                });
            } else {
                this.resetGame();
            }
        });
        const playAgainBtn = document.getElementById('playAgain');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => {
                this.showSections([], ['gameOverModal']);
                
                const wasPracticeMode = this.gameMode === 'practice';
                const savedEngineElo = this.engineElo;
                const savedBot = this.selectedBot;
                const savedTimerMode = this.timerMode;
                const savedPlayerColor = this.playerColor;
                
                this.restartWithSettings({
                    practiceMode: wasPracticeMode,
                    engineElo: savedEngineElo,
                    bot: wasPracticeMode ? null : savedBot,
                    timerMode: savedTimerMode,
                    playerColor: savedPlayerColor
                });
            });
        } else {
            console.error('❌ playAgain button not found in DOM');
        }
        document.getElementById('reviewGame').addEventListener('click', () => {
            this.showSections([], ['gameOverModal']);
            this.analyzeGame();
        });
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyzeGame());
        document.getElementById('undoBtn').addEventListener('click', () => this.undoMove());
        document.getElementById('flipBoardBtn').addEventListener('click', () => this.flipBoard());
        document.getElementById('resignBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to resign?')) {
                this.resignGame();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
            
            switch (e.key.toLowerCase()) {
                case 'u':
                    e.preventDefault();
                    this.undoMove();
                    break;
                case 'f':
                    e.preventDefault();
                    this.flipBoard();
                    break;
                case 'r':
                    e.preventDefault();
                    if (this.gameStarted && !this.gameOver && confirm('Are you sure you want to resign?')) {
                        this.resignGame();
                    }
                    break;
                case 'n':
                    e.preventDefault();
                    if (!this.gameOver && this.gameStarted && !confirm('Start a new game? Current progress will be lost.')) break;
                    document.getElementById('newGame').click();
                    break;
            }
        });
        
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
            safeStorage.set('chessTutorialCompleted', 'true');
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
            
            // Helper to render SVG piece into a square (chess.com style)
            const placePiece = (sq, pieceKey) => {
                const svgCode = window.chessGame && window.chessGame.pieceSVG ? window.chessGame.pieceSVG[pieceKey] : null;
                const style = safeStorage.get('pieceStyle', 'cburnett');
                if (svgCode) {
                    let displaySvg = svgCode;
                    if (style === 'neo') {
                        displaySvg = displaySvg.replace(/stroke-width="1\.5"/g, 'stroke-width="0.9"');
                        displaySvg = displaySvg.replace(/stroke-width="1\.2"/g, 'stroke-width="0.7"');
                        displaySvg = displaySvg.replace(/stroke-width="1\.3"/g, 'stroke-width="0.8"');
                        displaySvg = displaySvg.replace('<g ', '<g filter="drop-shadow(0 1px 2px rgba(0,0,0,0.25))" ');
                        if (pieceKey.startsWith('w')) {
                            displaySvg = displaySvg.replace('fill="#fff"', 'fill="#faf3e6"');
                        } else {
                            displaySvg = displaySvg.replace('fill="#000"', 'fill="#1a1a1a"');
                        }
                    } else if (style === 'animated') {
                        displaySvg = displaySvg.replace('<g ', '<g filter="drop-shadow(0 2px 4px rgba(0,0,0,0.35))" ');
                        if (!pieceKey.startsWith('w')) {
                            displaySvg = displaySvg.replace('fill="#000"', 'fill="#0a0a0a"');
                        }
                    }
                    const animClass = style === 'animated' ? ' class="piece-animated"' : '';
                    sq.element.innerHTML = `<div class="piece"${animClass} style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${displaySvg}</div>`;
                } else {
                    sq.element.textContent = pieceKey;
                }
            };
            
            // Helper to place a move marker dot on a square
            const placeMarker = (sq, bgColor) => {
                const m = document.createElement('div');
                m.style.cssText = `width:12px;height:12px;border-radius:50%;position:absolute;background:${bgColor};`;
                sq.element.appendChild(m);
            };
            
            // Position piece and show movement based on type
            let explanationText;
            
            switch(pieceType) {
                case 'king':
                    // Place king on e4 (row 4, col 4 in 0-indexed from top)
                    const kingRow = 4, kingCol = 4;
                    placePiece(squares.find(s => s.row === kingRow && s.col === kingCol), 'wK');
                    // Show valid moves (1 square in any direction)
                    const kingMoves = [
                        [3, 3], [3, 4], [3, 5],
                        [4, 3],          [4, 5],
                        [5, 3], [5, 4], [5, 5]
                    ];
                    kingMoves.forEach(([r, c]) => {
                        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                            placeMarker(squares.find(s => s.row === r && s.col === c), 'rgba(118,150,86,0.6)');
                        }
                    });
                    explanationText = '♔ <strong>King</strong> on e4 can move to any adjacent square (green dots). It moves 1 square in any direction - horizontally, vertically, or diagonally.';
                    break;
                    
                case 'queen':
                    const queenRow = 3, queenCol = 3;
                    placePiece(squares.find(s => s.row === queenRow && s.col === queenCol), 'wQ');
                    // Show queen moves (all directions)
                    for (let i = 0; i < 8; i++) {
                        // Horizontal
                        if (i !== queenCol) placeMarker(squares.find(s => s.row === queenRow && s.col === i), 'rgba(118,150,86,0.6)');
                        // Vertical
                        if (i !== queenRow) placeMarker(squares.find(s => s.row === i && s.col === queenCol), 'rgba(118,150,86,0.6)');
                        // Diagonals
                        if (queenRow + (i - queenRow) >= 0 && queenRow + (i - queenRow) < 8 && i >= 0 && i < 8 && i !== queenCol) {
                            placeMarker(squares.find(s => s.row === queenRow + (i - queenRow) && s.col === i), 'rgba(118,150,86,0.6)');
                        }
                        if (queenRow - (i - queenRow) >= 0 && queenRow - (i - queenRow) < 8 && i >= 0 && i < 8 && i !== queenCol) {
                            placeMarker(squares.find(s => s.row === queenRow - (i - queenRow) && s.col === i), 'rgba(118,150,86,0.6)');
                        }
                    }
                    explanationText = '♕ <strong>Queen</strong> on d5 can move any number of squares in any direction - horizontal, vertical, or diagonal. The most powerful piece!';
                    break;
                    
                case 'rook':
                    const rookRow = 3, rookCol = 3;
                    placePiece(squares.find(s => s.row === rookRow && s.col === rookCol), 'wR');
                    // Show rook moves (horizontal and vertical)
                    for (let i = 0; i < 8; i++) {
                        if (i !== rookCol) placeMarker(squares.find(s => s.row === rookRow && s.col === i), 'rgba(118,150,86,0.6)');
                        if (i !== rookRow) placeMarker(squares.find(s => s.row === i && s.col === rookCol), 'rgba(118,150,86,0.6)');
                    }
                    explanationText = '♖ <strong>Rook</strong> on d5 can move any number of squares horizontally or vertically (green dots). Very powerful in open positions!';
                    break;
                    
                case 'bishop':
                    const bishopRow = 3, bishopCol = 3;
                    placePiece(squares.find(s => s.row === bishopRow && s.col === bishopCol), 'wB');
                    // Show bishop moves (diagonals only)
                    for (let i = -7; i <= 7; i++) {
                        if (i === 0) continue;
                        // Diagonal 1: row+i, col+i
                        const r1 = bishopRow + i, c1 = bishopCol + i;
                        if (r1 >= 0 && r1 < 8 && c1 >= 0 && c1 < 8) {
                            placeMarker(squares.find(s => s.row === r1 && s.col === c1), 'rgba(118,150,86,0.6)');
                        }
                        // Diagonal 2: row+i, col-i
                        const r2 = bishopRow + i, c2 = bishopCol - i;
                        if (r2 >= 0 && r2 < 8 && c2 >= 0 && c2 < 8) {
                            placeMarker(squares.find(s => s.row === r2 && s.col === c2), 'rgba(118,150,86,0.6)');
                        }
                    }
                    explanationText = '♗ <strong>Bishop</strong> on d5 can move any number of squares diagonally (green dots). Each bishop stays on its color (light or dark squares).';
                    break;
                    
                case 'knight':
                    const knightRow = 3, knightCol = 3;
                    placePiece(squares.find(s => s.row === knightRow && s.col === knightCol), 'wN');
                    // Show knight moves (L-shape)
                    const knightMoves = [
                        [1, 2], [1, -2], [-1, 2], [-1, -2],
                        [2, 1], [2, -1], [-2, 1], [-2, -1]
                    ];
                    knightMoves.forEach(([dr, dc]) => {
                        const r = knightRow + dr, c = knightCol + dc;
                        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                            placeMarker(squares.find(s => s.row === r && s.col === c), 'rgba(118,150,86,0.6)');
                        }
                    });
                    explanationText = '♘ <strong>Knight</strong> on d5 moves in an "L" shape: 2 squares in one direction, then 1 square perpendicular (green dots). The ONLY piece that can jump over others!';
                    break;
                    
                case 'pawn':
                    const pawnRow = 6, pawnCol = 4; // e2
                    placePiece(squares.find(s => s.row === pawnRow && s.col === pawnCol), 'wP');
                    // Show pawn moves (forward 1 or 2 squares)
                    placeMarker(squares.find(s => s.row === 5 && s.col === 4), 'rgba(118,150,86,0.6)');
                    placeMarker(squares.find(s => s.row === 4 && s.col === 4), 'rgba(118,150,86,0.6)');
                    // Show capture moves (diagonal)
                    if (pawnCol - 1 >= 0) {
                        placeMarker(squares.find(s => s.row === 5 && s.col === 3), 'rgba(244,67,54,0.6)');
                    }
                    if (pawnCol + 1 < 8) {
                        placeMarker(squares.find(s => s.row === 5 && s.col === 5), 'rgba(244,67,54,0.6)');
                    }
                    explanationText = '♙ <strong>Pawn</strong> on e2: <span style="color:#769656;">● Green dots</span> = move forward (1 or 2 squares on first move). <span style="color:#f44336;">● Red dots</span> = capture diagonally. Pawns move forward but capture diagonally!';
                    break;
            }
            
            explanation.innerHTML = explanationText;
            
            // Scroll to board
            boardContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };
        
        window.showHomeSection = () => {
            const homeSection = document.getElementById('homeSection');
            if (homeSection) homeSection.style.display = 'block';
            // Hide game content
            const container = document.querySelector('.container');
            if (container) container.style.display = 'none';
            // Hide overlays
            document.getElementById('playSection').style.display = 'none';
            document.getElementById('practiceSection').style.display = 'none';
            document.getElementById('learnSection').style.display = 'none';
            const chessSidebar = document.getElementById('chessSidebar');
            if (chessSidebar) chessSidebar.style.display = 'none';
            // Hide profile page
            const profilePage = document.getElementById('profileStatsModal');
            if (profilePage) profilePage.style.display = 'none';
            // Populate home stats if logged in
            window.updateHomeStats();
        };
        
        window.updateHomeStats = function() {
            const wins = safeStorage.getInt('wins', 0);
            const losses = safeStorage.getInt('losses', 0);
            const draws = safeStorage.getInt('draws', 0);
            const elo = safeStorage.getInt('userELO', 0);
            const gamesPlayed = safeStorage.getInt('gamesPlayed', 0);
            const displayName = safeStorage.get('displayName', '');
            const streak = safeStorage.getInt('dailyStreak', 0);
            
            // Greeting
            const greeting = document.getElementById('homeGreeting');
            if (greeting) {
                if (displayName) {
                    greeting.textContent = 'Welcome back, ' + displayName;
                } else {
                    greeting.textContent = 'Welcome to Chess';
                }
            }
            
            // Header stats
            const headerELO = document.getElementById('homeHeaderELO');
            if (headerELO) headerELO.textContent = elo || '—';
            
            const headerWinRate = document.getElementById('homeHeaderWinRate');
            if (headerWinRate && gamesPlayed > 0) {
                const rate = Math.round((wins / gamesPlayed) * 100);
                headerWinRate.textContent = rate + '% win rate';
            }
            
            // Stats pills
            const streakEl = document.getElementById('homeStreak');
            if (streakEl) streakEl.textContent = streak || '0';
            
            const gamesTotal = document.getElementById('homeGamesTotal');
            if (gamesTotal) gamesTotal.textContent = gamesPlayed;
            
            const puzzlesEl = document.getElementById('homePuzzles');
            if (puzzlesEl) puzzlesEl.textContent = safeStorage.getInt('puzzlesSolved', 0);
            
            // Stats column
            const statGames = document.getElementById('homeStatGames');
            if (statGames) statGames.textContent = gamesPlayed;
            
            const statWins = document.getElementById('homeStatWins');
            if (statWins) statWins.textContent = wins;
            
            const statLosses = document.getElementById('homeStatLosses');
            if (statLosses) statLosses.textContent = losses;
            
            const statDraws = document.getElementById('homeStatDraws');
            if (statDraws) statDraws.textContent = draws;
            
            const statWinRate = document.getElementById('homeStatWinRate');
            if (statWinRate) {
                if (gamesPlayed > 0) {
                    statWinRate.textContent = Math.round((wins / gamesPlayed) * 100) + '%';
                } else {
                    statWinRate.textContent = '—%';
                }
            }
            
            // Welcome message: show only for new users (no games played)
            const welcomeMsg = document.getElementById('homeWelcomeMsg');
            if (welcomeMsg) {
                welcomeMsg.style.display = gamesPlayed === 0 ? 'block' : 'none';
            }
            
            // Profile picture — restore saved avatar to home screen header
            const homeAvatar = document.getElementById('homeAvatar');
            const savedPic = safeStorage.get('profilePicture', '');
            if (homeAvatar && savedPic) {
                homeAvatar.innerHTML = `<img src="${savedPic}" style="width: 100%; height: 100%; object-fit: cover;" alt="Profile">`;
                homeAvatar.style.display = 'block'; // override grid
            }
        };
        
        window.showPlaySection = () => {
            const isMobile = window.innerWidth <= 768;
            // Hide home section
            const homeSection = document.getElementById('homeSection');
            if (homeSection) homeSection.style.display = 'none';
            // Hide learn section if open
            const learnSection = document.getElementById('learnSection');
            if (learnSection) learnSection.style.display = 'none';
            // Show game container if hidden
            const container = document.querySelector('.container');
            if (container) container.style.display = '';
            // Show Chess.com-style right sidebar for Boss Battle
            const chessSidebar = document.getElementById('chessSidebar');
            if (chessSidebar) chessSidebar.style.display = 'block';
        };
        
        window.closePlaySection = () => {
            const isMobile = window.innerWidth <= 768;
            document.getElementById('playSection').style.display = 'none';
            // Hide Chess.com-style right sidebar when closing Boss Battle
            const chessSidebar = document.getElementById('chessSidebar');
            if (chessSidebar) chessSidebar.style.display = 'none';
            // Close submenu
            document.getElementById('playSubmenu').style.display = 'none';
            document.getElementById('playArrow').style.transform = 'rotate(0deg)';
            document.getElementById('menuPlay').style.background = 'rgba(255, 255, 255, 0.08)';
        };
        
        window.showPracticeSection = () => {
            // Hide learn section if open
            const learnSection = document.getElementById('learnSection');
            if (learnSection) learnSection.style.display = 'none';
            document.getElementById('practiceSection').style.display = 'block';
            // Hide Chess.com-style right sidebar
            const chessSidebar = document.getElementById('chessSidebar');
            if (chessSidebar) chessSidebar.style.display = 'none';
        };
        
        window.closePracticeSection = () => {
            document.getElementById('practiceSection').style.display = 'none';
            // Show Chess.com-style right sidebar
            const chessSidebar = document.getElementById('chessSidebar');
            if (chessSidebar) chessSidebar.style.display = 'block';
            // Close submenu
            document.getElementById('playSubmenu').style.display = 'none';
            document.getElementById('playArrow').style.transform = 'rotate(0deg)';
            document.getElementById('menuPlay').style.background = 'rgba(255, 255, 255, 0.08)';
        };
        
        window.showLearnSection = () => {
            // Hide other sections first to prevent overlaps
            const practiceSection = document.getElementById('practiceSection');
            if (practiceSection) practiceSection.style.display = 'none';
            const chessSidebar = document.getElementById('chessSidebar');
            if (chessSidebar) chessSidebar.style.display = 'none';
            const playSection = document.getElementById('playSection');
            if (playSection) playSection.style.display = 'none';
            document.getElementById('learnSection').style.display = 'block';
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
            window.chessGame.selectedBot = boss;
            
            // Update the selected bot display at the top
            const selectedDisplay = document.getElementById('selectedBotDisplay');
            if (selectedDisplay) {
                const botInfo = {
                    god: { emoji: '🤖', name: 'THE ONE ABOVE ALL', info: 'Expert | 2800+' },
                    mrstong: { emoji: '👩', name: 'Mrs. Tong', info: 'Int-Adv | 1800-2000' },
                    tester: { emoji: '🧪', name: 'The Tester', info: 'Estimate ELO' }
                };
                
                const info = botInfo[boss] || botInfo.god;
                selectedDisplay.innerHTML = `
                    <div style="font-size: 48px; margin-bottom: 8px;">${info.emoji}</div>
                    <div style="color: #fff; font-weight: 700; font-size: 18px; margin-bottom: 4px;">${info.name}</div>
                    <div style="color: rgba(255, 255, 255, 0.6); font-size: 14px;">${info.info}</div>
                `;
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
        const sidebarStartBtn = document.getElementById('sidebarStartGameBtn');
        const playStartBtn = document.getElementById('startGameBtn');
        
        [sidebarStartBtn, playStartBtn].forEach(btn => {
            if (!btn) return;
            btn.onclick = function(e) {
                e.preventDefault();
                
                const chessSidebar = document.getElementById('chessSidebar');
                const playSection = document.getElementById('playSection');
                
                let timeSelect, colorSelect;
                
                // Determine which UI is active (check visibility)
                const sidebarVisible = chessSidebar && chessSidebar.offsetParent !== null;
                const playVisible = playSection && playSection.offsetParent !== null;
                
                if (sidebarVisible) {
                    timeSelect = document.getElementById('sidebarTimeSelect');
                    colorSelect = document.getElementById('sidebarColorSelect');
                } else if (playVisible) {
                    timeSelect = document.getElementById('timeSelect');
                    colorSelect = document.getElementById('colorSelect');
                } else {
                    timeSelect = document.getElementById('sidebarTimeSelect');
                    colorSelect = document.getElementById('sidebarColorSelect');
                }
                
                
                if (window.chessGame && window.chessGame.selectedBot && timeSelect && timeSelect.value) {
                    window.chessGame.timerMode = timeSelect.value;
                    window.chessGame.playerColor = colorSelect.value || 'w';
                    if (window.chessGame.playerColor === 'random') {
                        window.chessGame.playerColor = Math.random() < 0.5 ? 'w' : 'b';
                    }
                    
                    //     bot: window.chessGame.selectedBot,
                    //     time: window.chessGame.timerMode,
                    //     color: window.chessGame.playerColor
                    // });
                    
                    // Hide both UIs
                    if (chessSidebar) chessSidebar.style.display = 'none';
                    if (playSection) playSection.style.display = 'none';
                    
                    window.chessGame.updateBotDisplay();
                    window.chessGame.startGame();
                } else {
                    console.error('❌ Cannot start game - missing requirements');
                }
            }
        });
        
        // Practice start button
        const practiceBtn = document.getElementById('startPracticeBtn');
        if (practiceBtn) {
            practiceBtn.addEventListener('click', () => {
            const elo = parseInt(document.getElementById('engineEloSlider').value);
            const timeMode = document.getElementById('practiceTimeSelect').value;
            const colorSelect = document.getElementById('practiceColorSelect').value;
            
            
            // Close practice section first
            closePracticeSection();
            // Hide Chess.com sidebar when starting practice
            const chessSidebar = document.getElementById('chessSidebar');
            if (chessSidebar) chessSidebar.style.display = 'none';
            
            // Set game configuration
            this.gameMode = 'practice';
            this.engineElo = elo;
            this.selectedBot = null;
            this.playerColor = colorSelect === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : colorSelect;
            
            // Set Stockfish Skill Level based on ELO
            const skillLevel = this.getSkillLevel(elo);
            
            if (this.stockfish) {
                this.stockfish.postMessage(`setoption name Skill Level value ${skillLevel}`);
            }
            
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
            document.getElementById('botRating').textContent = `Rating: ${elo}`;
            
            // Hide chat section in practice mode
            if (document.getElementById('botChatSection')) {
                document.getElementById('botChatSection').style.display = 'none';
            }
            if (document.getElementById('chatBotName')) {
                document.getElementById('chatBotName').textContent = '🤖 Engine';
            }
            
            // Show/hide chat based on game mode (hide in practice mode)
            if (this.gameMode === 'practice') {
                document.getElementById('botChatSection').style.display = 'none';
            } else {
                document.getElementById('botChatSection').style.display = 'block';
            }
            
            // Show/hide timers based on mode
            if (this.timerMode === 'infinite') {
                document.getElementById('botTimer').style.display = 'none';
                document.getElementById('playerTimer').style.display = 'none';
            } else {
                document.getElementById('botTimer').style.display = 'block';
                document.getElementById('playerTimer').style.display = 'block';
            }
            
            // Enable undo button in all game modes
            document.getElementById('undoBtn').disabled = false;
            document.getElementById('undoBtn').style.opacity = '1';
            document.getElementById('undoBtn').style.cursor = 'pointer';
                    
            // Start the game properly
            this.updateBotDisplay();
            this.startGame();
            
            });
        } else {
            console.error('Practice button not found!');
        }
        
        // Enable start button when time and color are selected
        document.getElementById('sidebarTimeSelect').addEventListener('change', () => this.checkBossBattleReady());
        document.getElementById('sidebarColorSelect').addEventListener('change', () => this.checkBossBattleReady());
        
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
                this.navToMove(this.pendingRetryIndex);
                document.getElementById('annotationPopup').style.display = 'none';
            } else {
            }
        });
        document.getElementById('closeAnnotationBtn').addEventListener('click', () => {
            document.getElementById('annotationPopup').style.display = 'none';
        });
        
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
        
        analyzeBtn.title = 'Analyzing...';
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
                    moveData.fenAfter,
                    i  // Pass move index for book move detection
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
        analyzeBtn.title = 'Analysis Complete';
        analyzeBtn.disabled = false;
    }

    displayAnalysis() {
        const analysisContent = document.getElementById('analysisContent');
        analysisContent.innerHTML = '';

        const classificationIcons = {
            'book': '📖',
            'best': '⭐',
            'brilliant': '✨',
            'great': '👍',
            'excellent': '👏',
            'good': '✓',
            'inaccuracy': '⚡',
            'mistake': '⚠️',
            'blunder': '❌',
            'missedWin': '🎯'
        };

        const classificationColors = {
            'book': '#8B7355',
            'best': '#00ff00',
            'brilliant': '#9c27b0',
            'great': '#4CAF50',
            'excellent': '#00BCD4',
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
                <div class="analysis-badge" style="background: ${color};">${analysis.classification}</div>
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
                <div style="color: #8B7355;">📖 Book Moves: ${summary.book || 0}</div>
                <div style="color: #00ff00;">⭐ Best Moves: ${summary.best || 0}</div>
                <div style="color: #9c27b0;">✨ Brilliant: ${summary.brilliant}</div>
                <div style="color: #FFD700;">🎯 Missed Wins: ${summary.missedWin || 0}</div>
                <div style="color: #4CAF50;">👍 Great: ${summary.great}</div>
                <div style="color: #00BCD4;">👏 Excellent: ${summary.excellent || 0}</div>
                <div style="color: #2196F3;">✓ Good: ${summary.good}</div>
                <div style="color: #ffc107;">⚡ Inaccuracies: ${summary.inaccuracy || 0}</div>
                <div style="color: #ff9800;">⚠️ Mistakes: ${summary.mistake}</div>
                <div style="color: #f44336;">❌ Blunders: ${summary.blunder}</div>
            </div>
        `;
        analysisContent.appendChild(summaryDiv);
    }

    showPositionAtMove(index) {
        
        // Use original analysis data if available (to support multiple replays)
        const analyses = this.originalMoveAnalyses || this.moveAnalyses;
        const analysis = analyses[index];
        
        // Check if this is a bot move (not player's move)
        const isWhiteMove = index % 2 === 0;
        const isPlayerMove = (isWhiteMove && this.playerColor === 'w') || (!isWhiteMove && this.playerColor === 'b');
        
        if (!isPlayerMove) {
            this.showBotMoveModal(analysis);
            return;
        }
        
        const isImprovable = analysis.classification === 'blunder' || 
                             analysis.classification === 'mistake' || 
                             analysis.classification === 'inaccuracy' ||
                             analysis.classification === 'missedWin';
        
        
        if (isImprovable && analysis.suggestedMove) {
            // Show popup for improvable moves with suggested move
            this.showBlunderReplayDialog(index, analysis);
        } else {
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
        
        modal.style.display = 'flex';
        
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
            
            
            // Try to find the move that matches the SAN notation
            for (const move of moves) {
                if (move.san === sanMove) {
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
        
    }
    
    // Convert ELO rating to Stockfish Skill Level (0-20)
    getSkillLevel(elo) {
        let skillLevel;
        if (elo <= 800) {
            skillLevel = Math.floor((elo - 400) / 200);
        } else if (elo <= 1200) {
            skillLevel = 3 + Math.floor((elo - 800) / 133);
        } else if (elo <= 1600) {
            skillLevel = 7 + Math.floor((elo - 1200) / 133);
        } else if (elo <= 2000) {
            skillLevel = 11 + Math.floor((elo - 1600) / 133);
        } else {
            skillLevel = 15 + Math.floor((elo - 2000) / 160);
        }
        return Math.max(0, Math.min(20, skillLevel));
    }
    
    // Generate a pre-determined blunder schedule for the bot.
    // Chess.com bots don't blunder randomly each move — they play accurately
    // at a set interval and then make a mandatory mistake to "rebalance."
    // Returns a Set of bot-move numbers where blunders must occur.
    _generateBlunderSchedule(elo) {
        const schedule = new Set();
        const estimatedGameLength = 50; // assume max 50 bot moves per game
        
        // Blunder interval: how many bot moves between forced mistakes.
        // Lower ELO = more frequent blunders.
        // Ratings are inflated ~200-500 pts vs human strength per community analysis.
        let interval;
        if (elo <= 400)      interval = 3;   // ~30% blunder rate — beginner
        else if (elo <= 600) interval = 4;   // ~25% — novice
        else if (elo <= 800) interval = 5;   // ~20%
        else if (elo <= 1000) interval = 7;  // ~14%
        else if (elo <= 1200) interval = 10; // ~10% — intermediate
        else if (elo <= 1500) interval = 16; // ~6% — ~2 blunders per game
        else if (elo <= 2000) interval = 30; // ~3% — ~1 blunder per game
        else                  interval = 999; // never — expert+
        
        let nextBlunder = interval;
        while (nextBlunder < estimatedGameLength) {
            schedule.add(nextBlunder);
            // Add random jitter (±25% of interval) so blunders aren't predictable
            const jitter = Math.floor(interval * 0.25 * (Math.random() * 2 - 1));
            nextBlunder += interval + jitter;
            if (nextBlunder <= 0) nextBlunder = interval; // safety
        }
        
        return schedule;
    }
    
    // Make a deliberate blunder move. Different mistake types per ELO range
    // to match how Chess.com bots actually play:
    //   Low ELO (≤1000):   Random legal move — hangs pieces, misses tactics
    //   Mid ELO (1000–1600): Random non-best — positional inaccuracy
    //   High ELO (1600+):   No blunders (handled by reduced depth only)
    _makeBlunderMove(bestMoveUCI) {
        const moves = this.chess.moves({ verbose: true });
        if (moves.length <= 1) return bestMoveUCI; // forced move
        
        const nonBestMoves = moves.filter(m => {
            const uci = m.from + m.to + (m.promotion || '');
            return uci !== bestMoveUCI;
        });
        
        if (nonBestMoves.length === 0) return bestMoveUCI;
        
        // Pick a random non-best move.
        // This creates realistic mistakes: from hanging pieces to subtle inaccuracies
        // depending on how strong the best move actually was.
        const pick = nonBestMoves[Math.floor(Math.random() * nonBestMoves.length)];
        return pick.from + pick.to + (pick.promotion || '');
    }
    
    resetGame() {
        // Stop and reset timer
        this.stopTimer();
        this.currentTurn = null;
        
        // Save practice mode settings before reset
        const wasPracticeMode = this.gameMode === 'practice';
        const savedEngineElo = this.engineElo;
        
        // Don't reset timerMode to null - keep it if it was set
        // Only reset timer values if starting fresh
        if (!this.timerMode) {
            this.playerTime = 0;
            this.botTime = 0;
        }
        
        this.updateTimerDisplay();
        
        // Reset bot selection (but not in practice mode)
        if (!wasPracticeMode) {
            this.selectedBot = null;
        }
        
        this.chess.reset();
        this.selectedSquare = null;
        this.gameOver = false;
        this.moveAnalyses = [];
        this.moveHistory = [];
        this.lastMove = null;
        this.gameStarted = false;
        this.boardFlipped = false;
        this.pendingPromotion = null;
        
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
        const evalGraph = document.getElementById('evalGraph');
        const navControls = document.getElementById('navControls');
        if (evalGraph) evalGraph.style.display = 'none';
        if (navControls) navControls.style.display = 'none';
        
        this.renderBoard();
        this.updateMoveList();
        this.updateStatus();
        
        const gameOverModal = document.getElementById('gameOverModal');
        const analysisPanel = document.getElementById('analysisPanel');
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (gameOverModal) gameOverModal.style.display = 'none';
        if (analysisPanel) analysisPanel.style.display = 'none';
        if (analyzeBtn) analyzeBtn.title = 'Analyze Game';
        
        // Reset undo button — enabled (undoMove handles empty history gracefully)
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
            undoBtn.disabled = false;
            undoBtn.style.opacity = '1';
            undoBtn.style.cursor = 'pointer';
        }
        
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
        
        // Reset sidebar dropdowns
        document.getElementById('sidebarTimeSelect').value = '';
        document.getElementById('sidebarColorSelect').value = '';
        document.getElementById('sidebarStartGameBtn').disabled = true;
        document.getElementById('sidebarStartGameBtn').style.opacity = '0.5';
        
        // Close rating modal and reset data
        document.getElementById('ratingModal').style.display = 'none';
        this.ratingData = {
            moveCount: 0,
            totalCentipawnLoss: 0,
            blunders: 0,
            mistakes: 0,
            inaccuracies: 0,
            bestMoves: 0,
            goodMoves: 0,
            brilliantMoves: 0
        };
        
        // Restore practice mode settings if it was practice mode
        if (wasPracticeMode) {
            this.gameMode = 'practice';
            this.engineElo = savedEngineElo;
            
            // Initialize interval-based blunder schedule for realistic Chess.com-style bot play
            this._botMoveCount = 0;
            this._blunderSchedule = this._generateBlunderSchedule(savedEngineElo);
            
            // Reconfigure Stockfish for practice mode
            if (this.stockfish && savedEngineElo) {
                const skillLevel = this.getSkillLevel(savedEngineElo);
                this.stockfish.postMessage(`setoption name Skill Level value ${skillLevel}`);
            }
        }
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
            
            // Set display name for admin (The One Above All) or use stored name
            if (isAdmin && !safeStorage.get('displayName')) {
                safeStorage.set('displayName', 'The One Above All');
            }
            const displayName = safeStorage.get('displayName') || (user.email ? user.email.split('@')[0] : null) || 'Player';
            // Show user profile (both sidebar and main)
            const userProfile = document.getElementById('userProfile');
            const sidebarUserProfile = document.getElementById('sidebarUserProfile');
            const userDisplayName = document.getElementById('userDisplayName');
            const sidebarUserDisplayName = document.getElementById('sidebarUserDisplayName');
            const sidebarToggle = document.getElementById('sidebarToggle');
            const adminToggleBtn = document.getElementById('adminToggleBtn');if (userProfile) userProfile.style.display = 'flex';
            if (sidebarUserProfile) {
                sidebarUserProfile.style.display = 'flex';
                // Restore saved profile picture to sidebar avatar on page load
                const savedPic = safeStorage.get('profilePicture', '');
                if (savedPic && window.chessGame) {
                    window.chessGame.updateSidebarProfilePic(savedPic);
                }
            }
            if (sidebarToggle) sidebarToggle.style.display = 'block';
            if (userDisplayName) userDisplayName.textContent = displayName + (isAdmin ? ' 👑' : '');
            if (sidebarUserDisplayName) {
                sidebarUserDisplayName.textContent = displayName + (isAdmin ? ' 👑' : '');
            }
            
            // Load user's saved preferences on login
            if (window.chessGame) {
                window.chessGame.loadPreferences();
            }
            
            // Show admin button only for admins
            if (adminToggleBtn) {
                adminToggleBtn.style.display = isAdmin ? 'flex' : 'none';
            }
            
            // Update player name in game UI
            const playerName = document.getElementById('playerName');
            if (playerName) playerName.textContent = displayName;
            
            // Update sidebar ELO/Rating
            const sidebarELO = document.getElementById('sidebarELO');
            if (sidebarELO) {
                const userELO = safeStorage.getInt('userELO', 0);
                if (userELO > 0) {
                    sidebarELO.textContent = `Rating: ${userELO}`;
                } else {
                    sidebarELO.textContent = 'Rating: Unrated';
                }
            }
            
            // Populate home screen stats (ELO, wins, losses, profile pic, display name)
            if (typeof window.updateHomeStats === 'function') {
                window.updateHomeStats();
            }
            
            // Make sidebar profile clickable → opens Chess.com-style stats modal
            const sidebarProfileClickable = document.getElementById('sidebarUserProfile');
            if (sidebarProfileClickable) {
                sidebarProfileClickable.addEventListener('click', (e) => {
                    // Don't trigger if user clicked one of the action buttons
                    const excludedButtons = ['#sidebarFriendsBtn', '#sidebarMailBtn', '#sidebarNotifBtn', '#sidebarSettingsBtn'];
                    const clickedExcluded = excludedButtons.some(sel => e.target.closest(sel));
                    if (!clickedExcluded) {
                        if (window.chessGame && typeof window.chessGame.showProfileStats === 'function') {
                            window.chessGame.showProfileStats();
                        } else {
                            console.error('❌ DEBUG: window.chessGame.showProfileStats not available!', {
                                chessGame: !!window.chessGame,
                                showProfileStats: typeof (window.chessGame || {}).showProfileStats
                            });
                        }
                    }
                });
            } else {
                console.error('❌ DEBUG: sidebarUserProfile element NOT found in DOM!');
            }
            
            // Close profile dropdown when clicking outside
            document.addEventListener('click', (e) => {
                const dropdown = document.getElementById('profileDropdown');
                const profile = document.getElementById('sidebarUserProfile');
                const settingsBtn = document.getElementById('sidebarSettingsBtn');
                if (dropdown && profile && settingsBtn && 
                    !dropdown.contains(e.target) && 
                    !settingsBtn.contains(e.target)) {
                    closeProfileDropdown();
                }
            });
            
            // Show tutorial for first-time users
            const tutorialCompleted = safeStorage.get('chessTutorialCompleted');
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
            const userProfile = document.getElementById('userProfile');
            const sidebarUserProfile = document.getElementById('sidebarUserProfile');
            const sidebarToggle = document.getElementById('sidebarToggle');
            if (userProfile) userProfile.style.display = 'none';
            // Hide profile section — no "Guest" label, just remove profile functions
            if (sidebarUserProfile) sidebarUserProfile.style.display = 'none';
            if (sidebarToggle) sidebarToggle.style.display = 'none';
            hideAdminPanel();
        }
    });
} else {
    console.error('❌ DEBUG: Firebase auth is NOT initialized — profile click handler will NOT be attached');
}


// Board & Piece Preference Methods
ChessGame.prototype.loadPreferences = function() {
    // Load board theme
    const boardTheme = safeStorage.get('boardTheme', 'green');
    this.applyBoardTheme(boardTheme);
    
    // Load piece style
    const pieceStyle = safeStorage.get('pieceStyle', 'cburnett');
    this.applyPieceStyle(pieceStyle);
};

ChessGame.prototype.applyBoardTheme = function(theme) {
    const lightSquares = document.querySelectorAll('.square.light');
    const darkSquares = document.querySelectorAll('.square.dark');
    
    const themes = {
        green: { light: '#e8f0d5', dark: '#769656' },
        blue: { light: '#dee3ec', dark: '#8ca2ad' },
        brown: { light: '#f0d9b5', dark: '#b58863' },
        gray: { light: '#e8e8e8', dark: '#888888' },
        classic: { light: '#f0d9b5', dark: '#b58863' },
        dark: { light: '#777', dark: '#444' },
        purple: { light: '#e8d0f0', dark: '#6c3483' },
        red: { light: '#ffcccc', dark: '#8b0000' }
    };
    
    // Expose globally for other modules (openings.js, etc.)
    window.boardThemes = themes;
    
    const colors = themes[theme] || themes.green;
    
    lightSquares.forEach(sq => {
        sq.style.backgroundColor = colors.light;
    });
    
    darkSquares.forEach(sq => {
        sq.style.backgroundColor = colors.dark;
    });
    
};

ChessGame.prototype.applyPieceStyle = function(style) {
    const pieces = document.querySelectorAll('.piece');
    
    pieces.forEach((pieceEl, index) => {
        const pieceKey = pieceEl.dataset.piece;
        // Guard: skip if pieceKey is missing
        if (!pieceKey) return;
        
        if (style === 'unicode') {
            // Show Unicode chess symbols
            const unicodePieces = {
                'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
                'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
            };
            pieceEl.innerHTML = `<span style="font-size: 40px; line-height: 1; color: ${pieceKey.startsWith('w') ? '#fff' : '#000'}; text-shadow: ${pieceKey.startsWith('w') ? '0 0 3px #000' : '0 0 3px #fff'};">${unicodePieces[pieceKey] || '?'}</span>`;
        } else if (style === 'neo') {
            // Neo style — modern minimal: modify SVG stroke widths, fill, add glow
            const svgCode = this.pieceSVG[pieceKey];
            if (svgCode) {
                let modified = svgCode;
                // Thinner strokes for a cleaner look
                modified = modified.replace(/stroke-width="1\.5"/g, 'stroke-width="0.9"');
                modified = modified.replace(/stroke-width="1\.2"/g, 'stroke-width="0.7"');
                modified = modified.replace(/stroke-width="1\.3"/g, 'stroke-width="0.8"');
                // Add subtle drop-shadow to the SVG group
                modified = modified.replace('<g ', '<g filter="drop-shadow(0 1px 2px rgba(0,0,0,0.25))" ');
                // Change white pieces to have a warm ivory fill
                if (pieceKey.startsWith('w')) {
                    modified = modified.replace('fill="#fff"', 'fill="#faf3e6"');
                } else {
                    modified = modified.replace('fill="#000"', 'fill="#1a1a1a"');
                }
                pieceEl.innerHTML = modified;
            }
        } else if (style === 'animated') {
            // Animated style — pieces pulse/hover with CSS animation
            const svgCode = this.pieceSVG[pieceKey];
            if (svgCode) {
                let modified = svgCode;
                // Add a glow filter and larger shadow for depth
                modified = modified.replace('<g ', '<g filter="drop-shadow(0 2px 4px rgba(0,0,0,0.35))" ');
                // Black pieces get a richer dark fill
                if (!pieceKey.startsWith('w')) {
                    modified = modified.replace('fill="#000"', 'fill="#0a0a0a"');
                }
                pieceEl.innerHTML = modified;
                // Add animation class only if SVG was successfully rendered
                pieceEl.classList.add('piece-animated');
            }
        } else {
            // Classic cbumett style (default)
            const svgCode = this.pieceSVG[pieceKey];
            if (svgCode) {
                pieceEl.innerHTML = svgCode;
            }
            // Remove any animation class
            pieceEl.classList.remove('piece-animated');
        }
    });
    
    // Update profile page piece style buttons if visible
    const profileStyles = ['cburnett', 'neo', 'animated', 'unicode'];
    profileStyles.forEach(s => {
        const btn = document.getElementById('profile' + s.charAt(0).toUpperCase() + s.slice(1) + 'Btn');
        if (btn) {
            if (s === style) {
                btn.style.background = 'rgba(118,150,86,0.2)';
                btn.style.borderColor = '#769656';
                btn.style.color = '#fff';
            } else {
                btn.style.background = 'rgba(255,255,255,0.06)';
                btn.style.borderColor = 'rgba(255,255,255,0.12)';
                btn.style.color = 'rgba(255,255,255,0.5)';
            }
        }
    });
    
};

// Show chess.com-style profile page (full-page)
ChessGame.prototype.showProfileStats = function() {
    const currentELO = safeStorage.getInt('userELO', 0);
    const displayName = safeStorage.get('displayName', 'Player');
    const gamesPlayed = safeStorage.getInt('gamesPlayed', 0);
    const wins = safeStorage.getInt('wins', 0);
    const losses = safeStorage.getInt('losses', 0);
    const draws = safeStorage.getInt('draws', 0);
    const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
    const userStatus = safeStorage.get('userStatus', '');
    const joinDate = safeStorage.get('joinDate', 'Mar 7, 2026');
    const friendsCount = safeStorage.getInt('friendsCount', 0);
    const viewsCount = safeStorage.getInt('viewsCount', 0);
    const streak = safeStorage.getInt('dailyStreak', 0);
    const puzzleRating = safeStorage.getInt('puzzleRating', 0);
    
    // Load saved profile picture
    const savedPic = safeStorage.get('profilePicture', '');
    const avatarImg = document.getElementById('profileAvatarImg');
    if (avatarImg) {
        if (savedPic) {
            avatarImg.src = savedPic;
        } else {
            // Default checkered avatar
            avatarImg.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="50" height="50" fill="%234a7ed4"/><rect x="50" width="50" height="50" fill="%23f0f0f0"/><rect y="50" width="50" height="50" fill="%23f0f0f0"/><rect x="50" y="50" width="50" height="50" fill="%234a7ed4"/><text x="50" y="62" text-anchor="middle" fill="white" font-size="42" font-family="sans-serif">♟</text></svg>');
        }
    }
    
    // Populate header fields
    const nameEl = document.getElementById('profileStatsName');
    const joinDateEl = document.getElementById('profileJoinDate');
    const friendsCountEl = document.getElementById('profileFriendsCount');
    const viewsCountEl = document.getElementById('profileViewsCount');
    const statusDisplay = document.getElementById('profileStatusDisplay');
    const statusInput = document.getElementById('profileStatusInput');
    const rapidRatingEl = document.getElementById('profileRapidRating');
    const puzzleRatingEl = document.getElementById('profilePuzzleRating');
    const streakEl = document.getElementById('profileStreak');
    
    if (nameEl) nameEl.textContent = displayName;
    if (joinDateEl) joinDateEl.textContent = joinDate;
    if (friendsCountEl) friendsCountEl.textContent = friendsCount;
    if (viewsCountEl) viewsCountEl.textContent = viewsCount;
    if (statusDisplay) statusDisplay.textContent = userStatus || 'Enter a status here';
    if (statusInput) statusInput.value = userStatus;
    if (rapidRatingEl) rapidRatingEl.textContent = currentELO || '—';
    if (puzzleRatingEl) puzzleRatingEl.textContent = puzzleRating || '—';
    if (streakEl) streakEl.textContent = streak;
    
    // Rating trend arrows
    const rapidTrend = document.getElementById('profileRapidTrend');
    const prevELO = safeStorage.getInt('prevELO', 0);
    if (rapidTrend && prevELO && currentELO) {
        const diff = currentELO - prevELO;
        rapidTrend.textContent = diff >= 0 ? '↑' + diff : '↓' + Math.abs(diff);
        rapidTrend.style.color = diff >= 0 ? '#4CAF50' : '#f44336';
    }
    const puzzleTrend = document.getElementById('profilePuzzleTrend');
    const prevPuzzle = safeStorage.getInt('prevPuzzleRating', 0);
    if (puzzleTrend && prevPuzzle && puzzleRating) {
        const pDiff = puzzleRating - prevPuzzle;
        puzzleTrend.textContent = pDiff >= 0 ? '↑' + pDiff : '↓' + Math.abs(pDiff);
        puzzleTrend.style.color = pDiff >= 0 ? '#4CAF50' : '#f44336';
    }
    
    // Populate stats
    const gamesEl = document.getElementById('profileStatsGames');
    const wrEl = document.getElementById('profileStatsWinRate');
    const winsEl = document.getElementById('profileStatsWins');
    const lossesEl = document.getElementById('profileStatsLosses');
    const drawsEl = document.getElementById('profileStatsDraws');
    
    if (gamesEl) gamesEl.textContent = gamesPlayed;
    if (wrEl) wrEl.textContent = `${winRate}%`;
    if (winsEl) winsEl.textContent = wins;
    if (lossesEl) lossesEl.textContent = losses;
    if (drawsEl) drawsEl.textContent = draws;
    
    // Build game history
    this.buildProfileGameHistory();
    
    // Update piece style button states
    const currentPieceStyle = safeStorage.get('pieceStyle', 'cburnett');
    const cburnettBtn = document.getElementById('profileCburnettBtn');
    const unicodeBtn = document.getElementById('profileUnicodeBtn');
    if (cburnettBtn && unicodeBtn) {
        if (currentPieceStyle === 'cburnett') {
            cburnettBtn.style.background = 'rgba(118,150,86,0.2)';
            cburnettBtn.style.borderColor = '#769656';
            cburnettBtn.style.color = '#fff';
            unicodeBtn.style.background = 'rgba(255,255,255,0.06)';
            unicodeBtn.style.borderColor = 'rgba(255,255,255,0.12)';
            unicodeBtn.style.color = 'rgba(255,255,255,0.5)';
        } else {
            unicodeBtn.style.background = 'rgba(118,150,86,0.2)';
            unicodeBtn.style.borderColor = '#769656';
            unicodeBtn.style.color = '#fff';
            cburnettBtn.style.background = 'rgba(255,255,255,0.06)';
            cburnettBtn.style.borderColor = 'rgba(255,255,255,0.12)';
            cburnettBtn.style.color = 'rgba(255,255,255,0.5)';
        }
    }
    
// Highlight current board theme button
const currentTheme = safeStorage.get('boardTheme', 'green');
document.querySelectorAll('[data-theme]').forEach(btn => {
    if (btn.getAttribute('data-theme') === currentTheme) {
        btn.style.border = '2px solid #fff';
        btn.style.boxShadow = '0 0 8px rgba(255,255,255,0.3)';
    } else {
        btn.style.border = '2px solid rgba(255,255,255,0.2)';
        btn.style.boxShadow = 'none';
    }
});
    
    // Show profile page (full-page, not a popup)
    // Hide board area and chess sidebar
    const container = document.querySelector('.container');
    const chessSidebar = document.getElementById('chessSidebar');
    if (container) container.style.display = 'none';
    if (chessSidebar) chessSidebar.style.display = 'none';
    
    // On mobile, profile takes full width; on desktop, starts after sidebar
    const isMobile = window.innerWidth <= 768;
    const profilePage = document.getElementById('profileStatsModal');
    if (profilePage) {
        profilePage.style.left = isMobile ? '0' : '180px';
    }
    
    // Show full-page profile
    this.showSections(['profileStatsModal'], [], 'block');
    
    // Reset to Overview tab
    this.switchProfileTab('overview', document.querySelector('.profileTab[data-tab="overview"]'));
    
    // Verify it showed up
    setTimeout(() => {
        const m = document.getElementById('profileStatsModal');
    }, 100);
    
};

// Build game history table on profile page
ChessGame.prototype.buildProfileGameHistory = function() {
    const historyEl = document.getElementById('profileGameHistory');
    if (!historyEl) return;
    
    const gameHistory = safeStorage.getJSON('gameHistory', []);
    if (!gameHistory || gameHistory.length === 0) {
        historyEl.innerHTML = '<div style="color: rgba(255,255,255,0.3); font-size: 13px; text-align: center; padding: 20px 0;">No games played yet. Start a game to see your history!</div>';
        return;
    }
    
    const recentGames = gameHistory.slice(-10).reverse();
    let html = '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse; font-size: 12px;">';
    html += '<thead><tr style="color: rgba(255,255,255,0.35); text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06);">';
    html += '<th style="padding: 8px 6px; font-weight: 500;">Players</th>';
    html += '<th style="padding: 8px 6px; font-weight: 500;">Result</th>';
    html += '<th style="padding: 8px 6px; font-weight: 500;">Moves</th>';
    html += '<th style="padding: 8px 6px; font-weight: 500;">Date</th></tr></thead><tbody>';
    
    recentGames.forEach(game => {
        const playerName = safeStorage.get('displayName', 'You');
        const playerELO = safeStorage.getInt('userELO', 0);
        const opponent = game.opponent || 'Bot';
        const result = game.result || '—';
        const moves = game.moves || '—';
        const date = game.date || '—';
        const resultColor = result === 'win' ? '#4CAF50' : result === 'loss' ? '#f44336' : result === 'draw' ? '#FFC107' : 'rgba(255,255,255,0.5)';
        const resultIcon = result === 'win' ? '1–0' : result === 'loss' ? '0–1' : result === 'draw' ? '½–½' : '—';
        
        html += '<tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">';
        html += `<td style="padding: 8px 6px;"><span style="color: #fff;">${playerName} (${playerELO})</span><span style="color: rgba(255,255,255,0.3);"> vs </span><span style="color: rgba(255,255,255,0.7);">${opponent}</span></td>`;
        html += `<td style="padding: 8px 6px; color: ${resultColor}; font-weight: 600;">${resultIcon}</td>`;
        html += `<td style="padding: 8px 6px; color: rgba(255,255,255,0.5);">${moves}</td>`;
        html += `<td style="padding: 8px 6px; color: rgba(255,255,255,0.3);">${date}</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    historyEl.innerHTML = html;
};

// Handle profile picture change
ChessGame.prototype.handleProfilePictureChange = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        safeStorage.set('profilePicture', dataUrl);
        const avatarImg = document.getElementById('profileAvatarImg');
        if (avatarImg) {
            avatarImg.src = dataUrl;
        }
        // Also update sidebar avatar if visible
        const sidebarAvatar = document.querySelector('#sidebarUserProfile [style*="grid-template-columns"]');
        if (sidebarAvatar && window.chessGame) {
            window.chessGame.updateSidebarProfilePic(dataUrl);
        }
    };
    reader.readAsDataURL(file);
};

// Update sidebar profile picture
ChessGame.prototype.updateSidebarProfilePic = function(dataUrl) {
    // The sidebar uses a checkered grid, we can replace its content with an img
    const profileSection = document.getElementById('sidebarUserProfile');
    if (!profileSection) return;
    const avatarContainer = profileSection.querySelector('[style*="grid-template-columns"]');
    if (avatarContainer && dataUrl) {
        avatarContainer.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;" alt="Profile">`;
    }
};

// Switch profile tabs
ChessGame.prototype.switchProfileTab = function(tabName, clickedBtn) {
    // Update tab button styles
    document.querySelectorAll('.profileTab').forEach(btn => {
        btn.style.borderBottomColor = 'transparent';
        btn.style.color = 'rgba(255,255,255,0.45)';
        btn.style.fontWeight = '500';
    });
    if (clickedBtn) {
        clickedBtn.style.borderBottomColor = '#769656';
        clickedBtn.style.color = '#fff';
        clickedBtn.style.fontWeight = '600';
    }
    
    // Show/hide tab content
    document.querySelectorAll('.profileTabContent').forEach(content => {
        content.style.display = 'none';
    });
    const targetContent = document.getElementById('profileTab' + tabName.charAt(0).toUpperCase() + tabName.slice(1));
    if (targetContent) {
        targetContent.style.display = 'block';
    }
};

// Apply board theme from profile page
ChessGame.prototype.applyTheme = function(theme) {
    safeStorage.set('boardTheme', theme);
    if (this.setBoardTheme) {
        this.setBoardTheme(theme);
    }
    
    // Highlight selected theme button in profile
    document.querySelectorAll('[data-theme]').forEach(btn => {
        if (btn.getAttribute('data-theme') === theme) {
            btn.style.border = '2px solid #fff';
            btn.style.boxShadow = '0 0 8px rgba(255,255,255,0.3)';
        } else {
            btn.style.border = '2px solid rgba(255,255,255,0.2)';
            btn.style.boxShadow = 'none';
        }
    });
};

// Save completed game to history for profile page display
ChessGame.prototype.saveGameToHistory = function(result, message, botDisplayName) {
    const history = safeStorage.getJSON('gameHistory', []);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const moveCount = this.moveHistory ? this.moveHistory.length : 0;
    
    history.push({
        result: result,
        opponent: botDisplayName || this.getBotDisplayName(),
        moves: moveCount,
        date: dateStr,
        message: message
    });
    
    // Keep only last 50 games
    if (history.length > 50) {
        history.splice(0, history.length - 50);
    }
    
    safeStorage.setJSON('gameHistory', history);
    
    // Also save previous ELO for trend tracking
    const currentELO = safeStorage.getInt('userELO', 0);
    if (currentELO > 0) {
        safeStorage.setInt('prevELO', currentELO);
    }
    
    // Track games played
    const gamesPlayed = safeStorage.getInt('gamesPlayed', 0);
    safeStorage.setInt('gamesPlayed', gamesPlayed + 1);
    
    if (result === 'win') {
        const wins = safeStorage.getInt('wins', 0);
        safeStorage.setInt('wins', wins + 1);
    } else if (result === 'loss') {
        const losses = safeStorage.getInt('losses', 0);
        safeStorage.setInt('losses', losses + 1);
    } else {
        const draws = safeStorage.getInt('draws', 0);
        safeStorage.setInt('draws', draws + 1);
    }
    
    // Update views
    const views = safeStorage.getInt('viewsCount', 0);
    safeStorage.setInt('viewsCount', views + 1);
    
    // Update streak
    const streak = safeStorage.getInt('dailyStreak', 0);
    safeStorage.setInt('dailyStreak', streak + 1);
};

// Helper to close profile dropdown
function closeProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) dropdown.style.display = 'none';
}

// Helper to toggle profile dropdown
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
    }
}

// Setup Firebase auth event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Bottom-right corner indicator - show login modal
    const cornerIndicator = document.getElementById('cornerIndicator');
    if (cornerIndicator) {
        cornerIndicator.addEventListener('click', () => {
            if (currentUser) {
                // Already logged in, show logout confirmation
                if (confirm('Do you want to logout?')) {
                    if (auth) {
                        auth.signOut();
                        // UI reset handled by onAuthStateChanged(null) callback
                    }
                }
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
    
    // Settings button (main profile)
    const profileSettingsBtn = document.getElementById('profileSettingsBtn');
    if (profileSettingsBtn) {
        profileSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleProfileDropdown();
        });
    }
    
    // Settings button (sidebar profile)
    const sidebarSettingsBtn = document.getElementById('sidebarSettingsBtn');
    if (sidebarSettingsBtn) {
        sidebarSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleProfileDropdown();
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                closeProfileDropdown();
                
                if (auth) {
                    await auth.signOut();
                    // UI reset handled by onAuthStateChanged(null) callback
                    // No alert() — it blocks the event loop and prevents the callback from firing
                } else {
                    console.error('❌ Firebase auth not initialized');
                    alert('Error: Authentication service not available.');
                }
            } catch (error) {
                console.error('❌ Logout error:', error);
                alert('Logout failed: ' + error.message);
            }
        });
    } else {
        console.error('❌ Logout button not found in DOM');
    }
    
    // All Settings button
    const allSettingsBtn = document.getElementById('allSettingsBtn');
    if (allSettingsBtn) {
        allSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeProfileDropdown();
            window.chessGame.showSections(['boardThemeModal'], [], 'flex');
        });
    }
    
    // Customize Sidebar button
    const customizeSidebarBtn = document.getElementById('customizeSidebarBtn');
    if (customizeSidebarBtn) {
        customizeSidebarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeProfileDropdown();
            window.chessGame.showSections(['pieceStyleModal'], [], 'flex');
        });
    }
    
    // Light UI button
    const lightUIBtn = document.getElementById('lightUIBtn');
    if (lightUIBtn) {
        lightUIBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeProfileDropdown();
            alert('Light UI coming soon!');
        });
    }
    
    // Collapse button — toggle sidebar
    const collapseBtn = document.getElementById('collapseBtn');
    if (collapseBtn) {
        collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeProfileDropdown();
            toggleSidebar();
        });
    }
    
    // Help & Support button
    const helpSupportBtn = document.getElementById('helpSupportBtn');
    if (helpSupportBtn) {
        helpSupportBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeProfileDropdown();
            showTutorial();
        });
    }
    
    // Board Theme Selection
    document.querySelectorAll('.board-theme-option').forEach(option => {
        option.addEventListener('click', () => {
            const theme = option.dataset.theme;
            safeStorage.set('boardTheme', theme);
            window.chessGame.applyBoardTheme(theme);
            window.chessGame.showSections([], ['boardThemeModal']);
        });
    });
    
    // Piece Style Selection
    document.querySelectorAll('.piece-style-option').forEach(option => {
        option.addEventListener('click', () => {
            const style = option.dataset.style;
            safeStorage.set('pieceStyle', style);
            window.chessGame.applyPieceStyle(style);
            window.chessGame.showSections([], ['pieceStyleModal']);
        });
    });
    
    // Close Board Theme Modal
    const closeBoardModal = document.getElementById('closeBoardModal');
    if (closeBoardModal) {
        closeBoardModal.addEventListener('click', () => {
            window.chessGame.showSections([], ['boardThemeModal']);
        });
    }
    
    // Close Piece Style Modal
    const closePieceModal = document.getElementById('closePieceModal');
    if (closePieceModal) {
        closePieceModal.addEventListener('click', () => {
            window.chessGame.showSections([], ['pieceStyleModal']);
        });
    }
    
    // Close Profile Stats Modal
    const closeProfileStats = document.getElementById('closeProfileStats');
    if (closeProfileStats) {
        closeProfileStats.addEventListener('click', () => {
            // Close profile page and restore game view
            window.chessGame.showSections([], ['profileStatsModal']);
            const container = document.querySelector('.container');
            const chessSidebar = document.getElementById('chessSidebar');
            if (container) container.style.display = '';
            if (chessSidebar) chessSidebar.style.display = 'block';
        });
    }
    
    // Profile page is now full-page (not modal) — no outside-click-to-close needed
    
    // Logout from Profile Stats Modal
    const logoutFromStats = document.getElementById('logoutFromStats');
    if (logoutFromStats) {
        logoutFromStats.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                if (auth) {
                    document.getElementById('profileStatsModal').style.display = 'none';
                    await auth.signOut();
                    // UI reset handled by onAuthStateChanged(null) callback
                } else {
                    alert('Error: Authentication service not available.');
                }
            } catch (error) {
                console.error('❌ Logout error:', error);
                alert('Logout failed: ' + error.message);
            }
        });
    }
    
    // Profile Edit from Stats Page — show edit modal on top (don't close profile page)
    const profileEditFromStats = document.getElementById('profileEditFromStats');
    if (profileEditFromStats) {
        profileEditFromStats.addEventListener('click', () => {
            window.chessGame.showSections(['profileEditModal'], [], 'flex');
        });
    }
    
    // Profile Preferences from Stats Modal
    const profilePreferences = document.getElementById('profilePreferences');
    if (profilePreferences) {
        profilePreferences.addEventListener('click', () => {
            // Show board theme modal on top of profile page (don't close profile)
            window.chessGame.showSections(['boardThemeModal'], [], 'flex');
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
            const currentName = safeStorage.get('displayName', '');
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
        safeStorage.set('displayName', newName);
        
        // Update all displays
        const userDisplayName = document.getElementById('userDisplayName');
        const sidebarUserDisplayName = document.getElementById('sidebarUserDisplayName');
        const playerName = document.getElementById('playerName');
        const profileStatsName = document.getElementById('profileStatsName');
        
        const displayName = newName + (isAdmin ? ' 👑' : '');
        
        if (userDisplayName) userDisplayName.textContent = displayName;
        if (sidebarUserDisplayName) sidebarUserDisplayName.textContent = displayName;
        if (playerName) playerName.textContent = newName;
        if (profileStatsName) profileStatsName.textContent = displayName;
        
        // Close modal
        window.closeProfileEditModal();
        
        // Show success message
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

window.addEventListener('load', () => {
    initMobileSidebar();
    
    try {
        chessGame = new ChessGame();
        
        // Load saved board and piece preferences immediately
        chessGame.loadPreferences();
        
        // Check for Tester reminder (every 6 months)
        chessGame.checkTesterReminder();
    } catch (error) {
        console.error('⚠️ Chess game initialization warning:', error);
        // Only show alert for critical errors that prevent the game from working
        if (error.message && error.message.includes('Critical')) {
            alert('Error loading chess game: ' + error.message);
        }
        // For non-critical errors (like sound files), the game will still work
    }
});
