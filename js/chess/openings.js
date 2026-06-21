/*
 * Chess openings database.
 * Maps move sequences to opening names.
 * Used by ChessGame.detectOpening() to identify the opening being played.
 */
export const openings = {
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
