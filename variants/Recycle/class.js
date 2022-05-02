import ChessRules from "/base_rules.js";

export default class RecycleRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      check: [
        {
          label: "Capture king",
          defaut: false,
          variable: "taking"
        },
        {
          label: "Falling pawn",
          defaut: true,
          variable: "pawnfall"
        }
      ],
      styles: C.Options.styles.filter(s => s != "recycle")
    };
  }

  constructor(o) {
    o.options["recycle"] = true;
    super(o);
  }

};
