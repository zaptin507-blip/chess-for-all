const chessOpenings = {
    // BEGINNER OPENINGS
    italian: {
        id: 'italian',
        name: 'Italian Game',
        eco: 'C50-C54',
        difficulty: 'beginner',
        category: 'Open Games',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
        description: 'One of the oldest and most classical openings. White develops the bishop to an active square, targeting the weak f7 pawn.',
        finalPosition: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
        strengths: [
            'Fast and natural development',
            'Controls the center with e4 and Bc4',
            'Clear strategic plans for beginners',
            'Targets weak f7 square'
        ],
        weaknesses: [
            'Can become drawish at high levels',
            'Black has solid defensive resources',
            'Less complex than other openings'
        ],
        plans: [
            'Castle kingside quickly',
            'Play c3 to support d4 push',
            'Develop knight to c3',
            'Consider d4 to open center'
        ],
        famousGames: [
            {
                name: 'Morphy vs Duke & Count, Paris 1858',
                result: '1-0',
                description: 'The Opera Game - brilliant sacrificial attack'
            }
        ],
        rating: { beginners: '95%', intermediate: '70%', advanced: '50%' }
    },

    london: {
        id: 'london',
        name: 'London System',
        eco: 'D00',
        difficulty: 'beginner',
        category: 'Closed Games',
        moves: ['d4', 'd5', 'Bf4'],
        description: 'A solid, easy-to-learn system opening. White develops the bishop outside the pawn chain before playing e3.',
        finalPosition: 'rnbqkbnr/ppp1pppp/8/3p4/3P1B2/8/PPP1PPPP/RN1QKBNR w KQkq - 1 3',
        strengths: [
            'Very easy to learn - same setup vs almost anything',
            'Solid and safe',
            'Good for beginners',
            'Avoids heavy theory'
        ],
        weaknesses: [
            'Can be passive',
            'Less ambitious than other d4 openings',
            'Experienced players know how to equalize'
        ],
        plans: [
            'Play e3 to solidify center',
            'Develop knight to f3 and d2',
            'Consider c4 to challenge center',
            'Build up on kingside'
        ],
        famousGames: [
            {
                name: 'Carlsen vs Various GMs',
                result: 'Multiple wins',
                description: 'World Champion frequently uses London'
            }
        ],
        rating: { beginners: '90%', intermediate: '65%', advanced: '45%' }
    },

    // INTERMEDIATE OPENINGS
    ruylopez: {
        id: 'ruylopez',
        name: 'Ruy Lopez (Spanish Game)',
        eco: 'C60-C99',
        difficulty: 'intermediate',
        category: 'Open Games',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
        description: 'One of the most analyzed openings in chess history. White puts pressure on the knight defending e5.',
        finalPosition: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
        strengths: [
            'Rich in strategic ideas',
            'Many variations to choose from',
            'Excellent long-term pressure',
            'Classical and respected'
        ],
        weaknesses: [
            'Complex - lots of theory',
            'Takes time to learn properly',
            'Black has many good defenses'
        ],
        plans: [
            'Castle and play Re1',
            'Consider d3 or d4',
            'Exchange on c6 in some lines',
            'Build up with c3 and d4'
        ],
        famousGames: [
            {
                name: 'Karpov vs Korchnoi, World Championship 1978',
                result: 'Multiple games',
                description: 'Classic strategic battles in Ruy Lopez'
            }
        ],
        rating: { beginners: '60%', intermediate: '85%', advanced: '80%' }
    },

    queensgambit: {
        id: 'queensgambit',
        name: "Queen's Gambit",
        eco: 'D06-D69',
        difficulty: 'intermediate',
        category: 'Closed Games',
        moves: ['d4', 'd5', 'c4'],
        description: 'White offers a pawn to gain central control. One of the most popular and respected openings.',
        finalPosition: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2',
        strengths: [
            'Strong central control',
            'Many strategic plans available',
            'Time-tested and reliable',
            'Good pawn structure'
        ],
        weaknesses: [
            'Requires understanding of pawn structures',
            'Black can accept or decline',
            'Needs precise play in some lines'
        ],
        plans: [
            'Develop knights to f3 and c3',
            'Play e3 or e4',
            'Control center with pieces',
            'Consider minority attack on queenside'
        ],
        famousGames: [
            {
                name: 'Botvinnik vs Capablanca, AVRO 1938',
                result: '1-0',
                description: 'Masterful positional play in Queen\'s Gambit'
            }
        ],
        rating: { beginners: '55%', intermediate: '80%', advanced: '85%' }
    },

    // ADVANCED OPENINGS
    sicilannajdorf: {
        id: 'sicilannajdorf',
        name: 'Sicilian Defense - Najdorf',
        eco: 'B90-B99',
        difficulty: 'advanced',
        category: 'Semi-Open Games',
        moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'],
        description: 'The sharpest and most complex response to e4. Black fights for the center and creates imbalanced positions.',
        finalPosition: 'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6',
        strengths: [
            'Creates unbalanced, winning chances',
            'Favored by Fischer and Kasparov',
            'Excellent counterattacking chances',
            'Many tactical opportunities'
        ],
        weaknesses: [
            'Extremely complex theory',
            'White has strong attacking options',
            'Requires precise calculation',
            'One mistake can be fatal'
        ],
        plans: [
            'Play e5 or e6 depending on variation',
            'Develop pieces actively',
            'Look for counterplay on queenside',
            'Castle kingside and attack'
        ],
        famousGames: [
            {
                name: 'Fischer vs Various opponents',
                result: 'Numerous victories',
                description: 'Fischer\'s favorite opening - played it in almost every game'
            }
        ],
        rating: { beginners: '20%', intermediate: '60%', advanced: '95%' }
    },

    kingsindian: {
        id: 'kingsindian',
        name: "King's Indian Defense",
        eco: 'E60-E99',
        difficulty: 'advanced',
        category: 'Indian Defenses',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'],
        description: 'A hypermodern opening where Black allows White to build a big center, then attacks it. Leads to sharp, tactical battles.',
        finalPosition: 'rnbqk2r/ppp1ppbp/3p1np1/8/2PPP3/2N5/PP3PPP/R1BQKBNR w KQkq - 0 5',
        strengths: [
            'Dynamic and aggressive',
            'Great attacking chances for Black',
            'Complex middlegame positions',
            'Favored by Kasparov and Fischer'
        ],
        weaknesses: [
            'Very complex - lots of theory',
            'White has space advantage',
            'Can be risky',
            'Requires deep understanding'
        ],
        plans: [
            'Play e5 to challenge center',
            'Fianchetto bishop to g7',
            'Launch kingside attack',
            'Consider ...f5 push'
        ],
        famousGames: [
            {
                name: 'Kasparov vs Karpov, World Championship 1984-85',
                result: 'Multiple dramatic games',
                description: 'Epic battles in the King\'s Indian'
            }
        ],
        rating: { beginners: '15%', intermediate: '55%', advanced: '90%' }
    }
};

// Generate opening board image as SVG
function generateOpeningBoard(fen, size = 200) {
    const pieces = {
        'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
        'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
    };

    const rows = fen.split(' ')[0].split('/');
    let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;
    
    const squareSize = size / 8;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const x = col * squareSize;
            const y = row * squareSize;
            const isLight = (row + col) % 2 === 0;
            
            svg += `<rect x="${x}" y="${y}" width="${squareSize}" height="${squareSize}" fill="${isLight ? '#f0d9b5' : '#b58863'}"/>`;
        }
    }
    
    for (let row = 0; row < 8; row++) {
        let col = 0;
        for (const char of rows[row]) {
            if (char >= '1' && char <= '8') {
                col += parseInt(char);
            } else {
                const x = col * squareSize + squareSize / 2;
                const y = row * squareSize + squareSize / 2;
                const piece = pieces[char];
                const fontSize = squareSize * 0.7;
                svg += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${fontSize}" fill="${char === char.toUpperCase() ? '#fff' : '#000'}" stroke="${char === char.toUpperCase() ? '#000' : '#fff'}" stroke-width="0.5">${piece}</text>`;
                col++;
            }
        }
    }
    
    svg += '</svg>';
    return svg;
}

// Render opening card
function renderOpeningCard(opening) {
    const boardSvg = generateOpeningBoard(opening.finalPosition, 150);
    const difficultyColor = opening.difficulty === 'beginner' ? '#4CAF50' : 
                           opening.difficulty === 'intermediate' ? '#FF9800' : '#f44336';
    
    return `
        <div class="opening-card" data-opening="${opening.id}" onclick="showOpeningDetail('${opening.id}')" style="
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid transparent;
            border-radius: 12px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s;
        " onmouseover="this.style.borderColor='#769656'; this.style.transform='translateY(-5px)'; this.style.boxShadow='0 10px 30px rgba(118, 150, 86, 0.3)'" 
           onmouseout="this.style.borderColor='transparent'; this.style.transform='translateY(0)'; this.style.boxShadow='none'">
            <div style="display: flex; gap: 15px; align-items: center;">
                <div style="flex-shrink: 0;">
                    ${boardSvg}
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <h3 style="color: #fff; margin: 0; font-size: 18px;">${opening.name}</h3>
                        <span style="background: ${difficultyColor}; color: #fff; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase;">${opening.difficulty}</span>
                    </div>
                    <div style="color: rgba(255, 255, 255, 0.6); font-size: 13px; margin-bottom: 8px;">
                        ${opening.eco} • ${opening.category}
                    </div>
                    <div style="color: rgba(255, 255, 255, 0.8); font-size: 13px; line-height: 1.5;">
                        ${opening.description.substring(0, 100)}...
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <span style="color: rgba(255, 255, 255, 0.5); font-size: 11px;">
                            Moves: ${opening.moves.join(' ')}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Show opening detail modal
window.showOpeningDetail = (openingId) => {
    const opening = chessOpenings[openingId];
    if (!opening) return;

    const modal = document.createElement('div');
    modal.id = 'openingDetailModal';
    modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.9); z-index: 10000; display: flex; justify-content: center; align-items: center; padding: 20px;';
    
    const boardSvg = generateOpeningBoard(opening.finalPosition, 300);
    const difficultyColor = opening.difficulty === 'beginner' ? '#4CAF50' : 
                           opening.difficulty === 'intermediate' ? '#FF9800' : '#f44336';

    modal.innerHTML = `
        <div style="max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; background: linear-gradient(135deg, #312e2b 0%, #272522 100%); border: 2px solid #769656; border-radius: 16px; padding: 30px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <h2 style="color: #fff; margin: 0; font-size: 28px;">${opening.name}</h2>
                    <span style="background: ${difficultyColor}; color: #fff; padding: 5px 15px; border-radius: 15px; font-size: 13px; font-weight: 600; text-transform: uppercase;">${opening.difficulty}</span>
                </div>
                <button onclick="document.getElementById('openingDetailModal').remove()" style="background: none; border: none; color: #fff; font-size: 32px; cursor: pointer; padding: 0; width: 40px; height: 40px;">&times;</button>
            </div>

            <div style="display: grid; grid-template-columns: 320px 1fr; gap: 30px; margin-bottom: 25px;">
                <div style="background: rgba(0, 0, 0, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
                    <div style="margin-bottom: 15px;">
                        ${boardSvg}
                    </div>
                    <div style="color: rgba(255, 255, 255, 0.6); font-size: 13px; margin-bottom: 5px;">
                        Opening Position
                    </div>
                    <div style="color: #769656; font-size: 14px; font-weight: 600;">
                        ${opening.moves.join(' ')}
                    </div>
                </div>

                <div>
                    <div style="background: rgba(0, 0, 0, 0.2); border-radius: 10px; padding: 20px; margin-bottom: 15px;">
                        <h3 style="color: #769656; margin: 0 0 10px 0; font-size: 18px;">📖 Description</h3>
                        <p style="color: rgba(255, 255, 255, 0.9); margin: 0; line-height: 1.6; font-size: 15px;">${opening.description}</p>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="background: rgba(76, 175, 80, 0.1); border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 10px; padding: 15px;">
                            <h4 style="color: #4CAF50; margin: 0 0 10px 0; font-size: 16px;">✅ Strengths</h4>
                            <ul style="color: rgba(255, 255, 255, 0.8); margin: 0; padding-left: 20px; line-height: 1.8; font-size: 13px;">
                                ${opening.strengths.map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        </div>

                        <div style="background: rgba(244, 67, 54, 0.1); border: 1px solid rgba(244, 67, 54, 0.3); border-radius: 10px; padding: 15px;">
                            <h4 style="color: #f44336; margin: 0 0 10px 0; font-size: 16px;">⚠️ Weaknesses</h4>
                            <ul style="color: rgba(255, 255, 255, 0.8); margin: 0; padding-left: 20px; line-height: 1.8; font-size: 13px;">
                                ${opening.weaknesses.map(w => `<li>${w}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <div style="background: rgba(0, 0, 0, 0.2); border-radius: 10px; padding: 20px; margin-bottom: 15px;">
                <h3 style="color: #769656; margin: 0 0 15px 0; font-size: 18px;">🎯 Typical Plans</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    ${opening.plans.map((plan, i) => `
                        <div style="background: rgba(118, 150, 86, 0.1); border-left: 3px solid #769656; padding: 12px; border-radius: 6px;">
                            <span style="color: #769656; font-weight: 600; margin-right: 8px;">${i + 1}.</span>
                            <span style="color: rgba(255, 255, 255, 0.9); font-size: 14px;">${plan}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="background: rgba(0, 0, 0, 0.2); border-radius: 10px; padding: 20px; margin-bottom: 15px;">
                <h3 style="color: #769656; margin: 0 0 15px 0; font-size: 18px;">🏆 Famous Games</h3>
                ${opening.famousGames.map(game => `
                    <div style="background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                        <div style="color: #fff; font-weight: 600; margin-bottom: 5px;">${game.name}</div>
                        <div style="color: rgba(255, 255, 255, 0.6); font-size: 13px;">${game.description}</div>
                        <div style="color: #4CAF50; font-size: 13px; margin-top: 5px; font-weight: 600;">Result: ${game.result}</div>
                    </div>
                `).join('')}
            </div>

            <div style="background: rgba(0, 0, 0, 0.2); border-radius: 10px; padding: 20px;">
                <h3 style="color: #769656; margin: 0 0 15px 0; font-size: 18px;">📊 Success Rate by Level</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                    <div style="text-align: center;">
                        <div style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin-bottom: 5px;">Beginners</div>
                        <div style="color: #4CAF50; font-size: 24px; font-weight: 700;">${opening.rating.beginners}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin-bottom: 5px;">Intermediate</div>
                        <div style="color: #FF9800; font-size: 24px; font-weight: 700;">${opening.rating.intermediate}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="color: rgba(255, 255, 255, 0.6); font-size: 12px; margin-bottom: 5px;">Advanced</div>
                        <div style="color: #f44336; font-size: 24px; font-weight: 700;">${opening.rating.advanced}</div>
                    </div>
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 25px;">
                <button onclick="practiceOpening('${opening.id}')" style="flex: 1; padding: 14px; background: #769656; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;">
                    🎮 Practice This Opening
                </button>
                <button onclick="document.getElementById('openingDetailModal').remove()" style="flex: 1; padding: 14px; background: rgba(255, 255, 255, 0.1); color: #fff; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;">
                    Close
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
};

// Practice opening (placeholder)
window.practiceOpening = (openingId) => {
    alert('Practice mode coming soon! You\'ll be able to play through the opening moves on an interactive board.');
};

// Render all openings
window.renderLearnSection = () => {
    const learnSection = document.getElementById('learnSection');
    if (!learnSection) return;

    const openings = Object.values(chessOpenings);
    
    let html = `
        <div style="padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
                <div>
                    <h2 style="color: #fff; margin: 0 0 5px 0; font-size: 24px;">♟️ Chess Openings</h2>
                    <p style="color: rgba(255, 255, 255, 0.6); margin: 0; font-size: 14px;">Learn the most important openings in chess</p>
                </div>
                <button onclick="closeLearnSection()" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px;">
                    ← Back
                </button>
            </div>

            <div style="margin-bottom: 20px;">
                <div style="color: rgba(255, 255, 255, 0.5); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Filter by Difficulty</div>
                <div style="display: flex; gap: 10px;">
                    <button onclick="filterOpenings('all')" style="padding: 8px 16px; background: #769656; border: none; border-radius: 6px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;">All</button>
                    <button onclick="filterOpenings('beginner')" style="padding: 8px 16px; background: rgba(76, 175, 80, 0.2); border: 1px solid rgba(76, 175, 80, 0.3); border-radius: 6px; color: #4CAF50; font-size: 13px; font-weight: 600; cursor: pointer;">Beginner</button>
                    <button onclick="filterOpenings('intermediate')" style="padding: 8px 16px; background: rgba(255, 152, 0, 0.2); border: 1px solid rgba(255, 152, 0, 0.3); border-radius: 6px; color: #FF9800; font-size: 13px; font-weight: 600; cursor: pointer;">Intermediate</button>
                    <button onclick="filterOpenings('advanced')" style="padding: 8px 16px; background: rgba(244, 67, 54, 0.2); border: 1px solid rgba(244, 67, 54, 0.3); border-radius: 6px; color: #f44336; font-size: 13px; font-weight: 600; cursor: pointer;">Advanced</button>
                </div>
            </div>

            <div id="openingsList">
                ${openings.map(renderOpeningCard).join('')}
            </div>
        </div>
    `;

    learnSection.innerHTML = html;
};

// Filter openings
window.filterOpenings = (difficulty) => {
    const openings = Object.values(chessOpenings);
    const filtered = difficulty === 'all' ? openings : openings.filter(o => o.difficulty === difficulty);
    
    document.getElementById('openingsList').innerHTML = filtered.map(renderOpeningCard).join('');
};

// Close learn section
window.closeLearnSection = () => {
    document.getElementById('learnSection').style.display = 'none';
    document.getElementById('sidebarMenu').style.left = '0';
};
