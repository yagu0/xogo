import ChessRules from "/js/base_rules.js";

export default class EvolutionRules extends ChessRules {

//  static get Options() {
//    return C.Options;
//  }

  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);
    const c = this.getColor(x, y);
    const piece = this.getPiece(x, y);
    if (
      ['b', 'r', 'q'].includes(piece) &&
      (c == 'w' && x == 7) || (c == 'b' && x == 0)
    ) {
      // Move from first rank
      const forward = (c == 'w' ? -1 : 1);
      for (let shift of [-2, 0, 2]) {
        if ((piece == 'r' && shift != 0) || (piece == 'b' && shift == 0))
          continue;
        if (
          this.onBoard(x+2*forward, y+shift) &&
          this.board[x+forward][y+shift/2] != "" &&
          this.getColor(x+2*forward, y+shift) != c
        ) {
          moves.push(this.getBasicMove([x,y], [x+2*forward,y+shift]));
        }
      }
    }
    return moves;
  }

};
