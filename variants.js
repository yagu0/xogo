const variants = [
  {name: 'Absorption', desc: 'Absorb powers'},
  {name: 'Alapo', desc: 'Geometric Chess'},
  {name: 'Alice', desc: 'Both sides of the mirror'},
  {name: 'Align4', desc: 'Align four pawns'},
  {name: 'Allmate', desc: 'Mate any piece'},
  {name: 'Ambiguous', desc: "Play opponent's pieces"},
  {name: 'Antiking1', desc: 'Keep antiking in check', disp: 'Anti-King I'},
  {name: 'Antiking2', desc: 'Keep antiking in check', disp: 'Anti-King II'},
  {name: 'Antimatter', desc: 'Dangerous collisions'},
  {name: 'Apocalypse', desc: 'The end of the world'},
  {name: 'Arena', desc: 'Middle battle'},
  {name: 'Atarigo', desc: 'First capture wins', disp: 'Atari-Go'},
  {name: 'Atomic', desc: 'Explosive captures'},
  {name: 'Avalam', desc: 'Build towers'},
  {name: 'Avalanche', desc: 'Pawnfalls'},
  {name: 'Balaklava', desc: 'Meet the Mammoth'},
  {name: "Balanced", desc: "Balanced chess"},
  {name: 'Bario', desc: 'A quantum story'},
  {name: 'Baroque', desc: 'Exotic captures'},
  {name: "Benedict", desc: "Change colors"},
  {name: 'Berolina', desc: 'Pawns move diagonally'},
  {name: 'Bicolour', desc: 'Harassed kings'},
  {name: 'Brotherhood', desc: 'Friendly pieces'},
  {name: 'Cannibal', desc: 'Capture powers'},
  {name: 'Capablanca', desc: 'Capablanca Chess', disp: 'Capablanca'},
  {name: 'Capture', desc: 'Mandatory captures'},
  {name: 'Chaining', desc: 'Speed-up development'},
  {name: 'Chakart', desc: 'Capture the princess'},
  {name: 'Checkered', desc: 'Shared pieces'},
  {name: 'Checkless', desc: 'No-check mode'},
  {name: 'Chess960', disp: "Chess 960", desc: "Standard rules"},
  {name: 'Circular', desc: 'Run forward'},
  {name: 'Clorange', desc: 'A Clockwork Orange', disp: 'Clockwork Orange'},
  {name: 'Convert', desc: 'Convert enemy pieces'},
  {name: 'Copycat', desc: 'Borrow powers'},
  {name: 'Coregal', desc: 'Two royal pieces'},
  {name: 'Coronation', desc: 'Long live the Queen'},
  {name: 'Crazyhouse', desc: 'Captures reborn'},
  {name: 'Crossing', desc: 'Cross the river'},
  {name: 'Cylinder', desc: 'Neverending rows'},
  {name: 'Cwda', desc: 'New teams', disp: 'Different armies'},
  {name: 'Dark', desc: 'In the shadow'},
  {name: 'Diamond', desc: 'Rotating board'},
  {name: 'Dice', desc: 'Roll the dice'},
  {name: 'Discoduel', desc: 'Enter the disco', disp: 'Disco Duel'},
  {name: 'Dobutsu', desc: "Let's catch the Lion!"},
  {name: 'Doublearmy', desc: '64 pieces on the board', disp: 'Double Army'},
  {name: 'Doublemove', desc: 'Double moves'},
  {name: 'Dynamo', desc: 'Push and pull'},
//  {name: 'Eightpieces', desc: 'Each piece is unique', disp: '8 Pieces'},
//  {name: 'Emergo', desc: 'Stacking Checkers variant'},
//  {name: 'Empire', desc: 'Empire versus Kingdom'},
//  {name: 'Enpassant', desc: 'Capture en passant', disp: 'En-passant'},
//  {name: 'Evolution', desc: 'Faster development'},
//  {name: 'Extinction', desc: 'Capture all of a kind'},
//  {name: 'Fanorona', desc: 'Malagasy Draughts'},
//  {name: 'Football', desc: 'Score a goal'},
//  {name: 'Forward', desc: 'Moving forward'},
//  {name: 'Freecapture', desc: 'Capture both colors', disp: 'Free Capture'},
//  {name: 'Fugue', desc: 'Baroque Music'},
//  {name: 'Fullcavalry', desc: 'Lancers everywhere', disp: 'Full Cavalry'},
//  {name: 'Fusion', desc: 'Fusion pieces (v1)'},
  {name: 'Giveaway', desc: 'Lose all pieces'},
//  {name: 'Gomoku', desc: 'Align five stones'},
//  {name: 'Grand', desc: 'Big board'},
//  {name: 'Grasshopper', desc: 'Long jumps over pieces'},
//  {name: 'Gridolina', desc: 'Jump the borders'},
//  {name: 'Hamilton', desc: 'Walk on a graph'},
  {name: 'Hex', desc: 'Connect sides'},
//  {name: 'Hidden', desc: 'Unidentified pieces', disp: 'Strate-Go'},
//  {name: 'Hiddenqueen', desc: 'Queen disguised as a pawn', disp: 'Hidden Queen'},
//  {name: 'Hoppelpoppel', desc: 'Knibis and Bisknis', disp: 'Hoppel-Poppel'},
//  {name: 'Horde', desc: 'A pawns cloud'},
//  {name: 'Hypnotic', desc: 'Mind control (v1)'},
//  {name: 'Iceage', desc: 'Ice Age is coming!', disp: 'Ice Age'},
//  {name: 'Interweave', desc: 'Interweaved colorbound teams'},
//  {name: 'Isardam', desc: 'No paralyzed pieces'},
//  {name: 'Janggi', desc: 'Korean Chess'},
//  {name: 'Joker', desc: 'Replace pieces'},
//  {name: 'Karouk', desc: 'Thai Chess (v3)', disp: 'Kar-Ouk'},
//  {name: 'Kinglet', desc: 'Protect your pawns'},
//  {name: 'Kingsmaker', desc: 'Promote into kings'},
//  {name: 'Knightmate', desc: 'Mate the knight'},
//  {name: 'Knightrelay', desc: 'Move like a knight'},
//  {name: 'Konane', desc: 'Hawaiian Checkers'},
//  {name: 'Koopa', desc: 'Stun & kick pieces'},
//  {name: 'Koth', desc: 'King of the Hill', disp:'King of the Hill'},
//  {name: 'Madhouse', desc: 'Rearrange enemy pieces'},
  {name: 'Madrasi', desc: 'Paralyzed pieces'},
//  {name: 'Magnetic', desc: 'Laws of attraction'},
//  {name: 'Maharajah', desc: 'Augmented Queens'},
//  {name: 'Makpong', desc: 'Thai Chess (v2)'},
//  {name: 'Makruk', desc: 'Thai Chess (v1)'},
//  {name: 'Maxima', desc: 'Occupy the enemy palace'},
//  {name: 'Mesmer', desc: 'Mind control (v2)'},
//  {name: 'Minishogi', desc: 'Shogi 5 x 5'},
//  {name: 'Minixiangqi', desc: 'Xiangqi 7 x 7'},
//  {name: 'Monocolor', desc: 'All of the same color'},
//  {name: 'Monster', desc: 'White move twice'},
//  {name: 'Musketeer', desc: 'New fairy pieces'},
//  {name: 'Newzealand', desc: 'Kniros and Rosknis', disp: 'New-Zealand'},
//  {name: 'Omega', desc: 'A wizard in the corner'},
//  {name: 'Orda', desc: 'Mongolian Horde (v1)'},
//  {name: 'Ordamirror', desc: 'Mongolian Horde (v2)', disp: 'Orda Mirror'},
//  {name: 'Otage', desc: 'Capture and release hostages'},
//  {name: 'Pacifist', desc: 'Convert & support'},
//  {name: 'Pacosako', desc: 'Dance with the King', disp: 'Paco-Sako'},
//  {name: 'Pandemonium', desc: 'Noise and confusion'},
//  {name: 'Parachute', desc: 'Landing on the board'},
//  {name: 'Pawnmassacre', desc: 'Pieces upside down', disp: 'Pawn Massacre'},
//  {name: 'Pawns', desc: 'Reach the last rank (v1)'},
//  {name: 'Pawnsking', desc: 'Reach the last rank (v2)', disp: 'Pawns & King'},
//  {name: 'Perfect', desc: 'Powerful pieces'},
//  {name: 'Pocketknight', desc: 'Knight in pocket', disp: 'Pocket Knight'},
  {name: 'Progressive', desc: 'Play more and more moves'},
//  {name: 'Racingkings', desc: 'Kings cross the 8x8 board', disp: 'Racing Kings'},
//  {name: 'Rampage', desc: 'Move under cover'},
//  {name: 'Relayup', desc: 'Upgrade pieces', disp: 'Relay-up'},
  {name: 'Recycle', desc: 'Reuse pieces'},
  {name: 'Refusal', desc: 'Do not play that!'},
  {name: 'Rifle', desc: 'Shoot pieces'},
//  {name: 'Rollerball', desc: 'As in the movie'},
//  {name: 'Rococo', desc: 'Capture on the edge'},
//  {name: 'Royalrace', desc: 'Kings cross the 11x11 board', disp: 'Royal Race'},
//  {name: 'Rugby', desc: 'Transform an essay'},
//  {name: 'Schess', desc: 'Seirawan-Harper Chess', disp: 'S-Chess'},
//  {name: 'Screen', desc: 'Free initial setup'},
//  {name: 'Selfabsorb', desc: 'Fusion pieces (v2)', disp: 'Self-Absorption'},
//  {name: 'Shako', desc: 'Non-conformism and utopia'},
//  {name: 'Shatranj', desc: 'Ancient rules'},
//  {name: 'Shinobi', desc: 'A story of invasion'},
//  {name: 'Shogi', desc: 'Japanese Chess'},
//  {name: 'Shogun', desc: "General's Chess"},
//  {name: 'Sittuyin', desc: 'Burmese Chess'},
//  {name: 'Spartan', desc: 'Spartan versus Persians'},
//  {name: 'Squatter', desc: 'Squat last rank'},
//  {name: 'Stealthbomb', desc: 'Beware the bomb'},
  {name: 'Suction', desc: 'Attract opposite king'},
//  {name: 'Swap', desc: 'Dangerous captures'},
//  {name: 'Switching', desc: "Exchange pieces' positions"},
//  {name: 'Synchrone', desc: 'Play at the same time'},
//  {name: 'Synochess', desc: 'Dynasty versus Kingdom'},
//  {name: 'Takenmake', desc: 'Prolongated captures', disp: 'Take and make'},
  {name: 'Teleport', desc: 'Reposition pieces'},
//  {name: 'Tencubed', desc: 'Four new pieces'},
//  {name: 'Threechecks', desc: 'Give three checks', disp: 'Three Checks'},
//  {name: 'Titan', desc: 'Extra bishops and knights'},
//  {name: 'Twokings', desc: 'Two kings', disp: 'Two Kings'},
//  {name: 'Upsidedown', desc: 'Board upside down', disp: 'Upside-down'},
//  {name: 'Vchess', desc: 'Pawns capture backward', disp: 'Victor Chess'},
  {name: 'Weiqi', desc: 'Surround territory'},
//  {name: 'Wildebeest', desc: 'Balanced sliders & leapers'},
//  {name: 'Wormhole', desc: 'Squares disappear'},
//  {name: 'Xiangqi', desc: 'Chinese Chess'},
//  {name: 'Yote', desc: 'African Draughts'},
  {name: "Zen", desc: "Reverse captures"}
];

// Next line for usage on server (Node.js)
if (typeof window === 'undefined') module.exports = variants;
