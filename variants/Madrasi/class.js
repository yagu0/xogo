import ChessRules from "/base_rules.js";

export default class MadrasiRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      check: [
        {
          label: "Rex Incl.",
          defaut: false,
          variable: "rexincl"
        }
      ].concat(C.Options.check),
      styles: C.Options.styles.filter(s => s != "madrasi")
    };
  }

  constructor(o) {
    o.options["madrasi"] = true;
    super(o);
  }

  underCheck([x, y], color) {
    if (this.options["rexincl"]) {
      // If Rex Inclusive, kings do not check each other:
      // we just replace it very temporarily.
      const [ox, oy] = this.searchKingPos(color);
      const saveOppKing = this.board[ox][oy];
      this.board[ox][oy] = C.GetOppCol(color) + "q"; //arbitrary
      const res = super.underCheck([x, y], color);
      this.board[ox][oy] = saveOppKing;
      return res;
    }
    return super.underCheck([x, y], color);
  }

};
