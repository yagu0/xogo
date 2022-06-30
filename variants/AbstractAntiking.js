import ChessRules from "/base_rules.js";

export class AbstractAntikingRules extends ChessRules {

  static get Options() {
    return {
      styles: [
        "atomic",
        "balance",
        "cannibal",
        "capture",
        "crazyhouse",
        "doublemove",
        "madrasi",
        "progressive",
        "recycle",
        "rifle",
        "teleport",
        "zen"
      ]
    };
  }

  pieces(color, x, y) {
    "a": {
      // Move like a king, no attacks
      "class": "antiking",
      moves: super.pieces(color, x, y)['k'].moves,
      attack: []
    }
  }

  isKing(x, y, p) {
    if (!p)
      p = this.getPiece(x, y);
    return ['k', 'a'].includes(p);
  }

  canTake([x1, y1], [x2, y2]) {
    const piece1 = this.getPiece(x1, y1);
    const piece2 = this.getPiece(x2, y2);
    const color1 = this.getColor(x1, y1);
    const color2 = this.getColor(x2, y2);
    return (
      piece2 != 'a' &&
      (
        (piece1 != 'a' && color1 != color2) ||
        (piece1 == 'a' && color1 == color2)
      )
    );
  }

  underCheck(squares, color) {
    const oppCol = C.GetOppCol(color);
    let res = false;
    squares.forEach(sq => {
      switch (this.getPiece(sq[0], sq[1])) {
        case 'k':
          res ||= super.underAttack(sq, oppCol);
          break;
        case 'a':
          res ||= !super.underAttack(sq, oppCol);
          break;
      }
    });
    return res;
  }

};
