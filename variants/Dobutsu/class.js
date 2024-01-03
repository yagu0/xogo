import ChessRules from "/base_rules.js";

export default class DobutsuRules extends ChessRules {

  static get Options() {
    return {};
  }

  get hasFlags() {
    return false;
  }

  get hasEnpassant() {
    return false;
  }

  pieces(color, x, y) {
    const pawnShift = this.getPawnShift(color || 'w');
    // NOTE: classs change according to playerColor (orientation)
    const mySide = (this.playerColor == color);
    return {
      'c': {
        "class": (mySide ? "" : "rev-") + "chick",
        both: [{steps: [[pawnShift, 0]], range: 1}]
      },
      'h': {
        "class": (mySide ? "" : "rev-") + "hen",
        both: [
          {
            steps: [
              [pawnShift, 1], [pawnShift, -1],
              [0, 1], [0, -1], [1, 0], [-1, 0]
            ],
            range: 1
          }
        ]
      },
      'e': {
        "class": (mySide ? "" : "rev-") + "elephant",
        both: [{steps: [[-1, 1], [-1, -1], [1, 1], [1, -1]], range: 1}]
      },
      'g': {
        "class": (mySide ? "" : "rev-") + "giraffe",
        both: [{steps: [[0, 1], [0, -1], [1, 0], [-1, 0]], range: 1}]
      },
      'l': {
        "class": (mySide ? "" : "rev-") + "lion",
        both: [{
          steps: [[-1, 1], [-1, -1], [1, 1], [1, -1],
                  [0, 1], [0, -1], [1, 0], [-1, 0]],
          range: 1
        }]
      }
    };
  }

  isKing(x, y, p) {
    if (!p)
      p = this.getPiece(x, y);
    return (p == 'l');
  }

  static get ReserveArray() {
    return ['p', 'h', 'e', 'g'];
  }

  constructor(o) {
    o.options = {crazyhouse: true, taking: true};
    super(o);
  }

  get pawnPromotions() {
    return ['h'];
  }

  genRandInitBaseFen() {
    return {
      fen: "gle/1c1/1C1/ELG",
      o: {}
    };
  }

  get size() {
    return {x: 4, y: 4};
  }

  getCurrentScore(move_s) {
    const res = super.getCurrentScore(move_s);
    if (res != '*')
      return res;
    const oppCol = C.GetOppTurn(this.turn);
    const oppLastRank = (oppCol == 'b' ? 3 : 0);
    for (let j=0; j < this.size.y; j++) {
      if (this.board[oppLastRank][j] == oppCol + 'l')
        return (oppCol == 'w' ? "1-0" : "0-1");
    }
    return "*";
  }

};
