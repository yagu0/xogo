import ChessRules from "/js/base_rules.js";

export default class ProgressiveRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: [
        {
          label: "Logical",
          variable: "logical",
          type: "checkbox",
          defaut: false
        }
      ].concat(C.Options.input),
      styles: C.Options.styles.filter(s => s != "progressive")
    };
  }

  constructor(o) {
    o.options["progressive"] = true;
    super(o);
  }

  get hasCastle() {
    return !this.options["logical"];
  }

  pieceDef(piece, color, x, y) {
    if (this.options["logical"] && piece == 'p') {
      const pawnShift = (color == "w" ? -1 : 1);
      let res = super.pieceDef('p', color, x, y);
      res.moves[0] = {
        steps: [[pawnShift, 0]],
        range: 1 //always
      };
      return res;
    }
    return super.pieceDef(piece, color, x, y);
  }

};
