import ChessRules from "/base_rules.js";

export default class RecycleRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: [
        {
          label: "Capture king",
          variable: "taking",
          type: "checkbox",
          defaut: false
        },
        {
          label: "Falling pawn",
          variable: "pawnfall",
          type: "checkbox",
          defaut: true
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
