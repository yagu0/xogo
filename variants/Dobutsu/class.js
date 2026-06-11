import ChessRules from "/js/base_rules.js";

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

  pieceDef(piece, color, x, y) {
    // NOTE: classs change according to playerColor (orientation)
    const mySide = (this.playerColor == color);
    switch (piece) {
    case 'p': {
      const pawnShift = this.getPawnShift(color || 'w');
      return {
        "class": (mySide ? "" : "rev-") + "chick",
        both: [{steps: [[pawnShift, 0]], range: 1}]
      };
    }
    case 'h': return {
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
    };
    case 'e': return {
      "class": (mySide ? "" : "rev-") + "elephant",
      both: [{steps: [[-1, 1], [-1, -1], [1, 1], [1, -1]], range: 1}]
    };
    case 'g': return {
      "class": (mySide ? "" : "rev-") + "giraffe",
      both: [{steps: [[0, 1], [0, -1], [1, 0], [-1, 0]], range: 1}]
    };
    case 'k': return {
      "class": (mySide ? "" : "rev-") + "lion",
      both: [{
        steps: [[-1, 1], [-1, -1], [1, 1], [1, -1],
                [0, 1], [0, -1], [1, 0], [-1, 0]],
        range: 1
      }]
    };
    }
    return {}; //never reached
  }

  static get ReserveArray() {
    return ['p', 'h', 'e', 'g'];
  }

  updateReserve(color, piece, count) {
    if (piece != 'k')
      super.updateReserve(color, piece, count);
  }

  constructor(o) {
    o.options = {crazyhouse: true, taking: true};
    super(o);
  }

  pawnPromotions() {
    return ['h'];
  }

  genRandInitBaseFen() {
    return {
      fen: "gke/1p1/1P1/EKG",
      o: {}
    };
  }

  get size() {
    return {x: 4, y: 3};
  }

  getCurrentScore(move_s) {
    const res = super.getCurrentScore(move_s);
    if (res != '*')
      return res;
    for (let lastRank of [0, 3]) {
      const color = (lastRank == 0 ? 'w' : 'b');
      for (let j=0; j < this.size.y; j++) {
        if (
          this.board[lastRank][j] == color + 'k' &&
          !this.underAttack([lastRank, j], [C.GetOppTurn(color)])
        ) {
          return (color == 'w' ? "1-0" : "0-1");
        }
      }
    }
    return "*";
  }

};
