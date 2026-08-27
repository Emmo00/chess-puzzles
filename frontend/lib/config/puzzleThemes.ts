// Puzzle themes extracted from Lichess puzzle database
// Each theme has an id, name, and description

export interface PuzzleTheme {
  id: string;
  name: string;
  description: string;
}

export const PUZZLE_THEMES: PuzzleTheme[] = [
  // Tactical Motifs
  { id: "fork", name: "Fork", description: "A move where the moved piece attacks two opponent pieces at once." },
  { id: "pin", name: "Pin", description: "A tactic involving pins, where a piece is unable to move without revealing an attack on a higher value piece." },
  { id: "skewer", name: "Skewer", description: "A motif involving a high value piece being attacked, moving out the way, and allowing a lower value piece behind it to be captured or attacked." },
  { id: "discoveredAttack", name: "Discovered Attack", description: "Moving a piece that previously blocked an attack by a long range piece, out of the way of that piece." },
  { id: "discoveredCheck", name: "Discovered Check", description: "Move a piece to reveal a check from a hidden attacking piece, which often leads to a decisive advantage." },
  { id: "doubleCheck", name: "Double Check", description: "Checking with two pieces at once, as a result of a discovered attack." },
  { id: "sacrifice", name: "Sacrifice", description: "A tactic involving giving up material in the short-term, to gain an advantage after a forced sequence of moves." },
  { id: "attraction", name: "Attraction", description: "An exchange or sacrifice encouraging or forcing an opponent piece to a square that allows a follow-up tactic." },
  { id: "deflection", name: "Deflection", description: "A move that distracts an opponent piece from another duty that it performs, such as guarding a key square." },
  { id: "interference", name: "Interference", description: "Moving a piece between two opponent pieces to leave one or both opponent pieces undefended." },
  { id: "clearance", name: "Clearance", description: "A move, often with tempo, that clears a square, file or diagonal for a follow-up tactical idea." },
  { id: "xRayAttack", name: "X-Ray Attack", description: "A piece attacks or defends a square, through an enemy piece." },
  { id: "zugzwang", name: "Zugzwang", description: "The opponent is limited in the moves they can make, and all moves worsen their position." },
  { id: "intermezzo", name: "Intermezzo", description: "Instead of playing the expected move, first interpose another move posing an immediate threat that the opponent must answer." },
  
  // Mate Patterns
  { id: "mate", name: "Checkmate", description: "Win the game with style." },
  { id: "mateIn1", name: "Mate in 1", description: "Deliver checkmate in one move." },
  { id: "mateIn2", name: "Mate in 2", description: "Deliver checkmate in two moves." },
  { id: "mateIn3", name: "Mate in 3", description: "Deliver checkmate in three moves." },
  { id: "mateIn4", name: "Mate in 4", description: "Deliver checkmate in four moves." },
  { id: "mateIn5", name: "Mate in 5+", description: "Figure out a long mating sequence." },
  { id: "backRankMate", name: "Back Rank Mate", description: "Checkmate the king on the home rank, when it is trapped there by its own pieces." },
  { id: "smotheredMate", name: "Smothered Mate", description: "A checkmate delivered by a knight in which the mated king is unable to move because it is surrounded by its own pieces." },
  { id: "anastasiaMate", name: "Anastasia's Mate", description: "A knight and rook or queen team up to trap the opposing king between the side of the board and a friendly piece." },
  { id: "arabianMate", name: "Arabian Mate", description: "A knight and a rook team up to trap the opposing king on a corner of the board." },
  { id: "bodenMate", name: "Boden's Mate", description: "Two attacking bishops on criss-crossing diagonals deliver mate to a king obstructed by friendly pieces." },
  { id: "doubleBishopMate", name: "Double Bishop Mate", description: "Two attacking bishops on adjacent diagonals deliver mate to a king obstructed by friendly pieces." },
  { id: "dovetailMate", name: "Dovetail Mate", description: "A queen delivers mate to an adjacent king, whose only two escape squares are obstructed by friendly pieces." },
  { id: "hookMate", name: "Hook Mate", description: "Checkmate with a rook, knight, and pawn along with one enemy pawn to limit the enemy king's escape." },
  { id: "operaMate", name: "Opera Mate", description: "Check the king with a rook and use a bishop to defend the rook." },
  { id: "cornerMate", name: "Corner Mate", description: "Confine the king to the corner using a rook or queen and a knight to engage the checkmate." },
  { id: "killBoxMate", name: "Kill Box Mate", description: "A rook is next to the enemy king and supported by a queen that also blocks the king's escape squares." },
  { id: "morphysMate", name: "Morphy's Mate", description: "Use the bishop to check the king, while your rook helps to confine it." },
  { id: "pillsburysMate", name: "Pillsbury's Mate", description: "The rook delivers checkmate, while the bishop helps to confine it." },
  { id: "vukovicMate", name: "Vukovic Mate", description: "A rook and knight team up to mate the king." },
  { id: "triangleMate", name: "Triangle Mate", description: "The queen and rook, one square away from the enemy king, are on the same rank or file, forming a triangle." },
  { id: "balestraMate", name: "Balestra Mate", description: "A bishop delivers the checkmate, while a queen blocks the remaining escape squares." },
  { id: "blindSwineMate", name: "Blind Swine Mate", description: "Two rooks team up to mate the king in an area of 2 by 2 squares." },
  
  // Piece & Position Themes
  { id: "hangingPiece", name: "Hanging Piece", description: "A tactic involving an opponent piece being undefended or insufficiently defended and free to capture." },
  { id: "trappedPiece", name: "Trapped Piece", description: "A piece is unable to escape capture as it has limited moves." },
  { id: "capturingDefender", name: "Capture the Defender", description: "Removing a piece that is critical to defence of another piece." },
  { id: "exposedKing", name: "Exposed King", description: "A tactic involving a king with few defenders around it, often leading to checkmate." },
  { id: "advancedPawn", name: "Advanced Pawn", description: "One of your pawns is deep into the opponent position, maybe threatening to promote." },
  { id: "promotion", name: "Promotion", description: "Promote one of your pawn to a queen or minor piece." },
  { id: "underPromotion", name: "Underpromotion", description: "Promotion to a knight, bishop, or rook." },
  { id: "attackingF2F7", name: "Attacking f2 or f7", description: "An attack focusing on the f2 or f7 pawn, such as in the fried liver opening." },
  { id: "kingsideAttack", name: "Kingside Attack", description: "An attack of the opponent's king, after they castled on the king side." },
  { id: "queensideAttack", name: "Queenside Attack", description: "An attack of the opponent's king, after they castled on the queen side." },
  { id: "castling", name: "Castling", description: "Bring the king to safety, and deploy the rook for attack." },
  
  // Game Phase
  { id: "opening", name: "Opening", description: "A tactic during the first phase of the game." },
  { id: "middlegame", name: "Middlegame", description: "A tactic during the second phase of the game." },
  { id: "endgame", name: "Endgame", description: "A tactic during the last phase of the game." },
  
  // Endgame Types
  { id: "pawnEndgame", name: "Pawn Endgame", description: "An endgame with only pawns." },
  { id: "bishopEndgame", name: "Bishop Endgame", description: "An endgame with only bishops and pawns." },
  { id: "knightEndgame", name: "Knight Endgame", description: "An endgame with only knights and pawns." },
  { id: "rookEndgame", name: "Rook Endgame", description: "An endgame with only rooks and pawns." },
  { id: "queenEndgame", name: "Queen Endgame", description: "An endgame with only queens and pawns." },
  { id: "queenRookEndgame", name: "Queen and Rook Endgame", description: "An endgame with only queens, rooks and pawns." },
  
  // Puzzle Length
  { id: "oneMove", name: "One Move", description: "A puzzle that is only one move long." },
  { id: "short", name: "Short", description: "Two moves to win." },
  { id: "long", name: "Long", description: "Three moves to win." },
  { id: "veryLong", name: "Very Long", description: "Four moves or more to win." },
  
  // Move Types
  { id: "quietMove", name: "Quiet Move", description: "A move that does neither make a check or capture, nor an immediate threat to capture, but prepares a hidden unavoidable threat." },
  { id: "defensiveMove", name: "Defensive Move", description: "A precise move or sequence of moves that is needed to avoid losing material or another advantage." },
  
  // Evaluation Based
  { id: "advantage", name: "Advantage", description: "Seize your chance to get a decisive advantage. (200cp ≤ eval ≤ 600cp)" },
  { id: "crushing", name: "Crushing", description: "Spot the opponent blunder to obtain a crushing advantage. (eval ≥ 600cp)" },
  { id: "equality", name: "Equality", description: "Come back from a losing position, and secure a draw or a balanced position. (eval ≤ 200cp)" },
  
  // Special
  { id: "master", name: "Master Games", description: "Puzzles from games played by titled players." },
  { id: "masterVsMaster", name: "Master vs Master", description: "Puzzles from games between two titled players." },
  { id: "superGM", name: "Super GM Games", description: "Puzzles from games played by the best players in the world." },
];

// Default themes - all themes enabled by default
export const DEFAULT_THEMES: string[] = PUZZLE_THEMES.map(theme => theme.id);

// Theme categories for UI grouping
export const THEME_CATEGORIES = {
  "Tactical Motifs": ["fork", "pin", "skewer", "discoveredAttack", "discoveredCheck", "doubleCheck", "sacrifice", "attraction", "deflection", "interference", "clearance", "xRayAttack", "zugzwang", "intermezzo"],
  "Mate Patterns": ["mate", "mateIn1", "mateIn2", "mateIn3", "mateIn4", "mateIn5", "backRankMate", "smotheredMate", "anastasiaMate", "arabianMate", "bodenMate", "doubleBishopMate", "dovetailMate", "hookMate", "operaMate", "cornerMate", "killBoxMate", "morphysMate", "pillsburysMate", "vukovicMate", "triangleMate", "balestraMate", "blindSwineMate"],
  "Position & Pieces": ["hangingPiece", "trappedPiece", "capturingDefender", "exposedKing", "advancedPawn", "promotion", "underPromotion", "attackingF2F7", "kingsideAttack", "queensideAttack", "castling"],
  "Game Phase": ["opening", "middlegame", "endgame"],
  "Endgame Types": ["pawnEndgame", "bishopEndgame", "knightEndgame", "rookEndgame", "queenEndgame", "queenRookEndgame"],
  "Puzzle Length": ["oneMove", "short", "long", "veryLong"],
  "Move Types": ["quietMove", "defensiveMove"],
  "Evaluation": ["advantage", "crushing", "equality"],
  "Special": ["master", "masterVsMaster", "superGM"],
};

// Get theme by ID
export function getThemeById(id: string): PuzzleTheme | undefined {
  return PUZZLE_THEMES.find(theme => theme.id === id);
}

// Get themes by category
export function getThemesByCategory(category: string): PuzzleTheme[] {
  const themeIds = THEME_CATEGORIES[category as keyof typeof THEME_CATEGORIES] || [];
  return themeIds.map(id => getThemeById(id)).filter(Boolean) as PuzzleTheme[];
}
