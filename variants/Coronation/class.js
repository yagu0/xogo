import ChessRules from "/base_rules.js";

export default class CoronationRules extends ChessRules {

  get hasSelfCaptures() {
    return true;
  }

  canSelfTake([x1, y1], [x2, y2]) {
    const c = this.getColor(x1, y1);
    if (
      this.board.some(row =>
        row.some(square =>
          square[0] == c && square[1] == 'q')
      )
    ) {
      // Already a queen on the board: no coronation
      return false;
    }
    const [p1, p2] = [this.getPiece(x1, y1), this.getPiece(x2, y2)];
    return ((p1 == 'r' && p2 == 'b') || (p1 == 'b' && p2 == 'r'));
  }

  getPotentialMovesOf(piece, [x, y]) {
    const res = super.getPotentialMovesOf(piece, [x, y]);
    if (['r', 'b'].includes(piece)) {
      res.forEach(m => {
        if (
          m.vanish.length == 2 &&
          m.appear.length == 1 &&
          m.vanish[1].c == m.vanish[0].c
        ) {
          m.appear[0].p = 'q';
        }
      });
    }
    return res;
  }

};
