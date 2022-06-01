import ChessRules from "/base_rules.js";

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

  pieces(color, x, y) {
    let res = super.pieces(color, x, y);
    if (this.options["logical"]) {
      const pawnShift = (color == "w" ? -1 : 1);
      res["p"].moves[0] = {
        steps: [[pawnShift, 0]],
        range: 1 //always
      };
    }
    return res;
  }

};
