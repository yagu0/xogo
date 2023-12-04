import ChessRules from "/base_rules.js";

// TODO: there was an issue: I forgot which.. TOFIND and TOFIX :)

export default class CopycatRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: C.Options.styles.filter(s => !["madrasi", "zen"].includes(s))
    };
  }

  getStepSpec(color, x, y) {
    let res = super.getStepSpec(color, x, y);
    const piece = this.getPiece(x,y);
    if (['p', 'k'].includes(piece))
      return res;
    // Now check if the piece at x, y attack some friendly one (enhancement)
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
      if (this.onBoard(i, j) && this.getColor(i, j) == color) {
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
      if ((piece != 'q' && type != piece) || (piece == 'q' && type == 'n'))
        res.both.push(this.pieces()[type].both[0]);
    });
    return res;
  }

};
