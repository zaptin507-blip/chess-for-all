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
    },

    // BEGINNER OPENINGS (continued)
    fourKnights: {
        id: 'fourKnights',
        name: 'Four Knights Game',
        eco: 'C47-C49',
        difficulty: 'beginner',
        category: 'Open Games',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Nc3', 'Nf6'],
        description: 'A solid, symmetrical opening where both sides develop knights naturally. Great for learning piece development.',
        finalPosition: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4',
        strengths: ['Very solid and safe', 'Teaches natural development', 'Hard to blunder early', 'Symmetrical structure'],
        weaknesses: ['Can be drawish', 'Less aggressive', 'Limited winning chances'],
        plans: ['Castle kingside', 'Play d3 or Bb5', 'Develop bishop to e2 or c4', 'Consider d4 break'],
        famousGames: [{ name: 'Capablanca vs Multiple Opponents', result: 'Various', description: 'Capablanca\'s favorite solid opening' }],
        rating: { beginners: '90%', intermediate: '65%', advanced: '40%' }
    },

    scotch: {
        id: 'scotch',
        name: 'Scotch Game',
        eco: 'C45',
        difficulty: 'beginner',
        category: 'Open Games',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'],
        description: 'White immediately challenges the center with d4. Leads to open, tactical positions.',
        finalPosition: 'r1bqkbnr/pppp1ppp/2n5/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq d3 0 3',
        strengths: ['Opens the game quickly', 'Good for tactical players', 'Clear plans', 'Forces early action'],
        weaknesses: ['Can favor well-prepared Black', 'Less strategic depth', 'Main lines are well-known'],
        plans: ['Exchange on e5 or d5', 'Develop bishop to c4', 'Castle quickly', 'Control open files'],
        famousGames: [{ name: 'Kasparov vs Karpov, 1990', result: '1-0', description: 'Kasparov\'s aggressive use of Scotch' }],
        rating: { beginners: '85%', intermediate: '70%', advanced: '55%' }
    },

    vienna: {
        id: 'vienna',
        name: 'Vienna Game',
        eco: 'C25-C29',
        difficulty: 'beginner',
        category: 'Open Games',
        moves: ['e4', 'e5', 'Nc3'],
        description: 'A flexible opening that can transpose to various systems. Delays Nf3 for more options.',
        finalPosition: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2',
        strengths: ['Flexible and tricky', 'Can avoid main theory', 'Good for surprises', 'Multiple plans'],
        weaknesses: ['Less direct than Italian', 'Requires understanding of transpositions', 'Can be passive'],
        plans: ['Play f4 for aggressive attack', 'Develop Bc4', 'Consider Nf3 later', 'Control center with d3'],
        famousGames: [{ name: 'Steinitz vs Various', result: 'Mixed', description: 'Named after Vienna chess club' }],
        rating: { beginners: '80%', intermediate: '65%', advanced: '50%' }
    },

    // INTERMEDIATE OPENINGS
    ruyLopez: {
        id: 'ruyLopez',
        name: 'Ruy Lopez (Spanish Game)',
        eco: 'C60-C99',
        difficulty: 'intermediate',
        category: 'Open Games',
        moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
        description: 'One of the oldest and most respected openings. White puts pressure on the knight defending e5.',
        finalPosition: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
        strengths: ['Extremely solid and strategic', 'Rich in tactical possibilities', 'Favored by world champions', 'Long-term pressure'],
        weaknesses: ['Requires deep understanding', 'Main lines are heavily analyzed', 'Can be complex for beginners'],
        plans: ['Castle and play Re1', 'Consider d3 or c3', 'Develop bishop to b3 or a4', 'Prepare d4 break'],
        famousGames: [{ name: 'Fischer vs Spassky, 1972', result: '1-0', description: 'World Championship classic' }],
        rating: { beginners: '60%', intermediate: '85%', advanced: '90%' }
    },

    queensGambit: {
        id: 'queensGambit',
        name: 'Queen\'s Gambit',
        eco: 'D06-D69',
        difficulty: 'intermediate',
        category: 'Closed Games',
        moves: ['d4', 'd5', 'c4'],
        description: 'White offers a pawn to gain central control. One of the most popular openings at all levels.',
        finalPosition: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2',
        strengths: ['Strong central control', 'Multiple variations', 'Excellent for positional play', 'Used by all world champions'],
        weaknesses: ['Black has solid defenses', 'Requires understanding of pawn structures', 'Can lead to complex positions'],
        plans: ['Develop Nc3 and Nf3', 'Play e3 or Bg5', 'Control e5 square', 'Consider cxd5 exchange'],
        famousGames: [{ name: 'Carlsen vs Anand, 2014', result: '1-0', description: 'World Championship Queen\'s Gambit' }],
        rating: { beginners: '65%', intermediate: '90%', advanced: '95%' }
    },

    sicililian: {
        id: 'sicilian',
        name: 'Sicilian Defense',
        eco: 'B20-B99',
        difficulty: 'intermediate',
        category: 'Semi-Open Games',
        moves: ['e4', 'c5'],
        description: 'Black\'s most popular response to e4. Creates imbalanced positions with winning chances for both sides.',
        finalPosition: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
        strengths: ['Fighting and unbalanced', 'Good winning chances for Black', 'Rich in tactics', 'Many variations'],
        weaknesses: ['Complex theory', 'White has space advantage', 'Requires precise play', 'Sharp positions'],
        plans: ['Play Nc6 and d6', 'Consider ...e6 or ...g6', 'Counter-attack on queenside', 'Control d4 square'],
        famousGames: [{ name: 'Kasparov vs Karpov, Multiple', result: 'Mixed', description: 'Most analyzed opening in chess history' }],
        rating: { beginners: '50%', intermediate: '85%', advanced: '95%' }
    },

    french: {
        id: 'french',
        name: 'French Defense',
        eco: 'C00-C19',
        difficulty: 'intermediate',
        category: 'Semi-Open Games',
        moves: ['e4', 'e6'],
        description: 'A solid, strategic defense where Black builds a pawn chain. Leads to closed, maneuvering games.',
        finalPosition: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        strengths: ['Very solid structure', 'Good for strategic players', 'Clear pawn chains', 'Counter-attacking chances'],
        weaknesses: ['Light-squared bishop is blocked', 'Can be passive', 'Requires patience', 'Space disadvantage'],
        plans: ['Play d5 to challenge center', 'Develop bishop to b4 or e7', 'Prepare ...c5 break', 'Exchange on e4 if possible'],
        famousGames: [{ name: 'Botvinnik vs Multiple', result: 'Mixed', description: 'Botvinnik\'s favorite defense' }],
        rating: { beginners: '55%', intermediate: '80%', advanced: '85%' }
    },

    caroKann: {
        id: 'caroKann',
        name: 'Caro-Kann Defense',
        eco: 'B10-B19',
        difficulty: 'intermediate',
        category: 'Semi-Open Games',
        moves: ['e4', 'c6'],
        description: 'A solid, reliable defense combining ideas from French and Slav. Less blocking of light-squared bishop.',
        finalPosition: 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        strengths: ['Very solid and safe', 'Light-squared bishop free', 'Good pawn structure', 'Easy to learn'],
        weaknesses: ['Can be passive', 'Less dynamic than Sicilian', 'White has space', 'Limited counterplay'],
        plans: ['Play d5 to challenge center', 'Develop knight to f6', 'Consider ...Bf5', 'Play ...e6 for solid structure'],
        famousGames: [{ name: 'Karpov vs Multiple', result: 'Mixed', description: 'Karpov\'s solid choice' }],
        rating: { beginners: '70%', intermediate: '85%', advanced: '80%' }
    },

    kingsIndian: {
        id: 'kingsIndian',
        name: 'King\'s Indian Defense',
        eco: 'E60-E99',
        difficulty: 'intermediate',
        category: 'Indian Defenses',
        moves: ['d4', 'Nf6', 'c4', 'g6'],
        description: 'A hypermodern defense where Black fianchettoes the king\'s bishop and attacks the center later.',
        finalPosition: 'rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 2 3',
        strengths: ['Aggressive and dynamic', 'Good attacking chances', 'Rich in tactics', 'Unbalanced positions'],
        weaknesses: ['Complex theory', 'Requires precise timing', 'Can be risky', 'White has space advantage'],
        plans: ['Play Bg7 and castle', 'Prepare ...e5 or ...c5 break', 'Attack on kingside', 'Use bishop pair'],
        famousGames: [{ name: 'Fischer vs Multiple', result: 'Mixed', description: 'Fischer\'s weapon against 1.d4' }],
        rating: { beginners: '45%', intermediate: '80%', advanced: '90%' }
    },

    nimzoIndian: {
        id: 'nimzoIndian',
        name: 'Nimzo-Indian Defense',
        eco: 'E20-E59',
        difficulty: 'intermediate',
        category: 'Indian Defenses',
        moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'],
        description: 'Black pins the knight and fights for control of e4. One of the most respected defenses.',
        finalPosition: 'rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 3 4',
        strengths: ['Very solid and strategic', 'Good pawn structure', 'Prevents e4', 'Flexible plans'],
        weaknesses: ['Gives up bishop pair', 'Requires understanding', 'Can lead to passive positions', 'Theory heavy'],
        plans: ['Exchange on c3 or retreat', 'Play ...d5 or ...c5', 'Control e4 square', 'Develop remaining pieces'],
        famousGames: [{ name: 'Nimzowitsch vs Various', result: 'Mixed', description: 'Named after its inventor' }],
        rating: { beginners: '50%', intermediate: '85%', advanced: '90%' }
    },

    slav: {
        id: 'slav',
        name: 'Slav Defense',
        eco: 'D10-D49',
        difficulty: 'intermediate',
        category: 'Closed Games',
        moves: ['d4', 'd5', 'c4', 'c6'],
        description: 'A solid response to Queen\'s Gambit. Black supports d5 with c6 instead of e6.',
        finalPosition: 'rnbqkbnr/pp2pppp/2p5/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
        strengths: ['Very solid structure', 'Light-squared bishop free', 'Good for positional play', 'Reliable'],
        weaknesses: ['Can be passive', 'Less dynamic', 'White has space', 'Requires patience'],
        plans: ['Develop Nf6 and Bf5', 'Play ...e6 for solid structure', 'Consider ...dxc4', 'Control e4 square'],
        famousGames: [{ name: 'Kramnik vs Multiple', result: 'Mixed', description: 'Kramnik\'s solid choice' }],
        rating: { beginners: '65%', intermediate: '85%', advanced: '85%' }
    },

    // ADVANCED OPENINGS
    grunfeld: {
        id: 'grunfeld',
        name: 'Grünfeld Defense',
        eco: 'D70-D99',
        difficulty: 'advanced',
        category: 'Indian Defenses',
        moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'],
        description: 'A hypermodern defense where Black allows White a strong center, then attacks it with pieces.',
        finalPosition: 'rnbqkb1r/ppp1pp1p/5np1/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4',
        strengths: ['Very dynamic and tactical', 'Good counter-attacking chances', 'Unbalances the position', 'Favored by top players'],
        weaknesses: ['Extremely complex theory', 'Requires precise calculation', 'Risky if unprepared', 'White has space'],
        plans: ['Exchange on c4 or d4', 'Develop Bg7', 'Attack white center', 'Use active piece play'],
        famousGames: [{ name: 'Kasparov vs Multiple', result: 'Mixed', description: 'Kasparov\'s main weapon' }],
        rating: { beginners: '30%', intermediate: '65%', advanced: '95%' }
    },

    dutch: {
        id: 'dutch',
        name: 'Dutch Defense',
        eco: 'A80-A99',
        difficulty: 'advanced',
        category: 'Closed Games',
        moves: ['d4', 'f5'],
        description: 'An aggressive, unbalanced defense where Black immediately stakes claim on e4.',
        finalPosition: 'rnbqkbnr/ppppp1pp/8/5p2/3P4/8/PPP1PPPP/RNBQKBNR w KQkq f6 0 2',
        strengths: ['Very aggressive', 'Unusual and tricky', 'Good for attacking players', 'Creates imbalances'],
        weaknesses: ['Weakens king position', 'Complex theory', 'Risky', 'Requires precise play'],
        plans: ['Play Nf6 and e6', 'Develop Bb4 or Bd6', 'Attack on kingside', 'Consider ...c5 break'],
        famousGames: [{ name: 'Lasker vs Multiple', result: 'Mixed', description: 'Lasker\'s aggressive choice' }],
        rating: { beginners: '35%', intermediate: '60%', advanced: '85%' }
    },

    benoni: {
        id: 'benoni',
        name: 'Modern Benoni',
        eco: 'A60-A79',
        difficulty: 'advanced',
        category: 'Indian Defenses',
        moves: ['d4', 'Nf6', 'c4', 'c5', 'd5', 'e6'],
        description: 'A sharp, tactical defense where Black accepts an isolated pawn for active piece play.',
        finalPosition: 'rnbqkb1r/pp1p1ppp/4pn2/2pP4/2P5/8/PP2PPPP/RNBQKBNR w KQkq - 0 4',
        strengths: ['Very tactical and sharp', 'Good counter-attacking chances', 'Active piece play', 'Unbalanced'],
        weaknesses: ['Extremely complex', 'Weak d6 pawn', 'Requires precise calculation', 'Risky'],
        plans: ['Play ...exd5', 'Develop Bg7', 'Attack on queenside', 'Use active pieces'],
        famousGames: [{ name: 'Tal vs Multiple', result: 'Mixed', description: 'Tal\'s tactical weapon' }],
        rating: { beginners: '25%', intermediate: '55%', advanced: '90%' }
    },

    alekhine: {
        id: 'alekhine',
        name: 'Alekhine\'s Defense',
        eco: 'B02-B05',
        difficulty: 'advanced',
        category: 'Semi-Open Games',
        moves: ['e4', 'Nf6'],
        description: 'A provocative defense where Black tempts White\'s pawns forward, then attacks them.',
        finalPosition: 'rnbqkb1r/pppppppp/5n2/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2',
        strengths: ['Very provocative', 'Creates imbalances', 'Good for tactical players', 'Unusual'],
        weaknesses: ['Gives White space', 'Complex theory', 'Risky', 'Requires precise play'],
        plans: ['Play ...d6', 'Attack white pawns', 'Develop pieces actively', 'Consider ...g6'],
        famousGames: [{ name: 'Alekhine vs Multiple', result: 'Mixed', description: 'Named after World Champion Alekhine' }],
        rating: { beginners: '30%', intermediate: '60%', advanced: '85%' }
    },

    pirc: {
        id: 'pirc',
        name: 'Pirc Defense',
        eco: 'B07-B09',
        difficulty: 'advanced',
        category: 'Semi-Open Games',
        moves: ['e4', 'd6', 'd4', 'Nf6'],
        description: 'A hypermodern defense similar to King\'s Indian but against e4. Solid but passive.',
        finalPosition: 'rnbqkb1r/ppp1pppp/3p1n2/8/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 2 3',
        strengths: ['Solid structure', 'Good for positional play', 'Flexible', 'Hard to crack'],
        weaknesses: ['Passive', 'Gives White space', 'Limited counterplay', 'Requires patience'],
        plans: ['Play g6 and Bg7', 'Castle kingside', 'Prepare ...e5 or ...c5', 'Develop pieces quietly'],
        famousGames: [{ name: 'Pirc vs Multiple', result: 'Mixed', description: 'Named after Yugoslav GM Pirc' }],
        rating: { beginners: '40%', intermediate: '65%', advanced: '80%' }
    },

    bird: {
        id: 'bird',
        name: 'Bird\'s Opening',
        eco: 'A02-A03',
        difficulty: 'advanced',
        category: 'Flank Openings',
        moves: ['f4'],
        description: 'An unusual opening where White immediately stakes claim on e5. Can transpose to Dutch reversed.',
        finalPosition: 'rnbqkbnr/pppppppp/8/8/5P2/8/PPPPP1PP/RNBQKBNR b KQkq f3 0 1',
        strengths: ['Unusual and tricky', 'Good for surprises', 'Aggressive', 'Controls e5'],
        weaknesses: ['Weakens king position', 'Less principled', 'Complex', 'Requires understanding'],
        plans: ['Play Nf3 and e3', 'Develop Bb5 or Bd3', 'Castle kingside', 'Consider From Gambit'],
        famousGames: [{ name: 'Bird vs Multiple', result: 'Mixed', description: 'Named after English master Bird' }],
        rating: { beginners: '35%', intermediate: '60%', advanced: '75%' }
    },

    english: {
        id: 'english',
        name: 'English Opening',
        eco: 'A10-A39',
        difficulty: 'advanced',
        category: 'Flank Openings',
        moves: ['c4'],
        description: 'A flexible flank opening that can transpose to many different systems. Positional and strategic.',
        finalPosition: 'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq c3 0 1',
        strengths: ['Very flexible', 'Good for positional players', 'Many transpositions', 'Strategic'],
        weaknesses: ['Less direct', 'Requires understanding', 'Can be passive', 'Theory heavy'],
        plans: ['Play Nc3 and g3', 'Develop Bg2', 'Control d4 and e5', 'Consider e4 break'],
        famousGames: [{ name: 'Botvinnik vs Multiple', result: 'Mixed', description: 'Botvinnik\'s strategic weapon' }],
        rating: { beginners: '45%', intermediate: '70%', advanced: '90%' }
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

// Practice opening with interactive trainer
window.practiceOpening = (openingId) => {
    const opening = chessOpenings[openingId];
    if (!opening) return;

    // Close detail modal
    const modal = document.getElementById('openingDetailModal');
    if (modal) modal.remove();

    // Create interactive trainer
    const trainer = document.createElement('div');
    trainer.id = 'openingTrainer';
    trainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.9); z-index: 10000; display: flex; justify-content: center; align-items: center;';
    
    trainer.innerHTML = `
        <div style="max-width: 800px; width: 90%; background: linear-gradient(135deg, #312e2b 0%, #272522 100%); border: 2px solid #769656; border-radius: 12px; padding: 30px; box-shadow: 0 0 30px rgba(118, 150, 86, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="color: #fff; margin: 0; font-size: 24px;">🎮 Practice: ${opening.name}</h2>
                <button onclick="document.getElementById('openingTrainer').remove()" style="background: none; border: none; color: #fff; font-size: 28px; cursor: pointer; padding: 0; width: 30px; height: 30px;">&times;</button>
            </div>
            
            <div style="background: rgba(0, 0, 0, 0.3); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <p style="color: #fff; margin: 0 0 10px 0; font-size: 16px;"><strong>Opening:</strong> ${opening.name}</p>
                <p style="color: rgba(255,255,255,0.7); margin: 0 0 15px 0; font-size: 14px;">${opening.description}</p>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    ${opening.moves.map((move, index) => `
                        <span style="padding: 8px 12px; background: rgba(118, 150, 86, 0.3); border: 1px solid #769656; border-radius: 6px; color: #fff; font-size: 14px; font-weight: 600;">
                            ${Math.floor(index/2) + 1}${index % 2 === 0 ? '.' : '...'} ${move}
                        </span>
                    `).join('')}
                </div>
            </div>

            <div style="text-align: center; padding: 20px; background: rgba(0, 0, 0, 0.2); border-radius: 8px; margin-bottom: 20px;">
                <div id="trainerProgress" style="color: #4CAF50; font-size: 18px; font-weight: 700; margin-bottom: 10px;">Move 0 / ${opening.moves.length}</div>
                <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
                    <div id="trainerProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #769656, #4CAF50); transition: width 0.3s;"></div>
                </div>
                <p id="trainerMessage" style="color: #fff; margin: 15px 0 0 0; font-size: 16px;">Click "Start Training" to begin practicing the moves!</p>
            </div>

            <div style="display: flex; gap: 10px;">
                <button id="trainerStartBtn" onclick="startOpeningTrainer('${opening.id}')" style="flex: 1; padding: 14px; background: #769656; color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;">
                    ▶️ Start Training
                </button>
                <button onclick="document.getElementById('openingTrainer').remove()" style="flex: 1; padding: 14px; background: rgba(255, 255, 255, 0.1); color: #fff; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;">
                    Close
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(trainer);
};

// Interactive trainer logic
let trainerState = {
    currentMoveIndex: 0,
    openingMoves: [],
    isWhiteTurn: true
};

window.startOpeningTrainer = (openingId) => {
    const opening = chessOpenings[openingId];
    if (!opening) return;

    trainerState = {
        currentMoveIndex: 0,
        openingMoves: opening.moves,
        isWhiteTurn: true
    };

    const startBtn = document.getElementById('trainerStartBtn');
    if (startBtn) {
        startBtn.textContent = '✅ Started! Play the moves on the board.';
        startBtn.disabled = true;
        startBtn.style.opacity = '0.6';
    }

    const message = document.getElementById('trainerMessage');
    if (message) {
        message.textContent = `Play: ${trainerState.openingMoves[0]} (${trainerState.isWhiteTurn ? 'White' : 'Black'} to move)`;
        message.style.color = '#FFD700';
    }

    // Hook into chess game to validate moves
    if (window.chessGame) {
        window.chessGame.trainerMode = true;
        window.chessGame.trainerMoves = trainerState.openingMoves;
        window.chessGame.trainerIndex = 0;
        
        // Override makePlayerMove temporarily
        const originalMakePlayerMove = window.chessGame.makePlayerMove.bind(window.chessGame);
        window.chessGame.makePlayerMove = function(from, to) {
            const expectedMove = trainerState.openingMoves[trainerState.currentMoveIndex];
            const moveSan = this.chess.move({ from, to, promotion: 'q' });
            
            if (moveSan && moveSan.san === expectedMove) {
                // Correct move!
                trainerState.currentMoveIndex++;
                updateTrainerProgress();
                
                if (trainerState.currentMoveIndex >= trainerState.openingMoves.length) {
                    // Training complete!
                    showMessage('🎉 Excellent! You completed the opening!', '#4CAF50');
                    window.chessGame.trainerMode = false;
                    setTimeout(() => {
                        if (confirm('Great job! Practice another opening?')) {
                            document.getElementById('openingTrainer').remove();
                        }
                    }, 1000);
                } else {
                    const nextMove = trainerState.openingMoves[trainerState.currentMoveIndex];
                    trainerState.isWhiteTurn = !trainerState.isWhiteTurn;
                    showMessage(`✓ Correct! Next: ${nextMove} (${trainerState.isWhiteTurn ? 'White' : 'Black'})`, '#4CAF50');
                }
            } else {
                // Wrong move
                showMessage(`✗ Incorrect! Expected: ${expectedMove}. Try again!`, '#f44336');
                this.chess.undo(); // Undo the wrong move
            }
            
            return moveSan;
        };
    }
};

function updateTrainerProgress() {
    const progress = document.getElementById('trainerProgress');
    const progressBar = document.getElementById('trainerProgressBar');
    
    if (progress) {
        progress.textContent = `Move ${trainerState.currentMoveIndex} / ${trainerState.openingMoves.length}`;
    }
    
    if (progressBar) {
        const percentage = (trainerState.currentMoveIndex / trainerState.openingMoves.length) * 100;
        progressBar.style.width = percentage + '%';
    }
}

function showMessage(text, color) {
    const message = document.getElementById('trainerMessage');
    if (message) {
        message.textContent = text;
        message.style.color = color;
    }
}

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
