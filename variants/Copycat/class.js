import ChessRules from "/base_rules.js";

export default class CopycatRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: ["atomic", "capture", "crazyhouse", "cylinder", "dark", "zen"]
    };
  }

  getPotentialMovesFrom([x, y], color) {
    let moves = super.getPotentialMovesFrom([x, y], color);
    // Expand potential moves if attacking friendly pieces.
    const piece = this.getPiece(x,y);
    if (['p', 'k'].includes(piece))
      return moves;
    let movements = {};
    const steps = this.pieces()[piece].both[0].steps;
    steps.forEach(s => {
      let [i, j] = [x + s[0], y + s[1]];
      while (
        this.onBoard(i, j) &&
        this.board[i][j] == "" &&
        piece != 'n'
      ) {
        i += s[0];
        j += s[1];
      }
      if (this.onBoard(i, j) && this.getColor(i, j) == this.turn) {
        const attacked = this.getPiece(i, j);
        if (['r', 'b', 'n'].includes(attacked)) {
          if (!movements[attacked])
            movements[attacked] = true;
        }
        else if (attacked == 'q') {
          if (!movements['r'])
            movements['r'] = true;
          if (!movements['b'])
            movements['b'] = true;
        }
      }
    });
    Object.keys(movements).forEach(type => {
      if (
        (piece != 'q' && type != piece) ||
        (piece == 'q' && type == 'n')
      ) {
        Array.prototype.push.apply(moves,
          super.getPotentialMovesOf(type, [x, y]));
      }
    });
    return moves;
  }

  underAttack([x, y], oppCols) {
    if (super.underAttack([x, y], oppCols)
      return true;
    //TODO
  }

};
