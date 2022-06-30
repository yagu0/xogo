import ChessRules from "/base_rules.js";

export default class MadrasiRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: [
        {
          label: "Rex Incl.",
          variable: "rexincl",
          type: "checkbox",
          defaut: false
        }
      ].concat(C.Options.input),
      styles: C.Options.styles.filter(s => s != "madrasi")
    };
  }

  constructor(o) {
    o.options["madrasi"] = true;
    super(o);
  }

  canTake([x1, y1], [x2, y2]) {
    return (
      (
        !this.options["rexincl"] ||
        this.getPiece(x1, y1) != 'k' ||
        this.getPiece(x2, y2) != 'k'
      )
      &&
      super.canTake([x1, y1], [x2, y2])
    );
  }

};
