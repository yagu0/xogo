import ChessRules from "/base_rules.js";

export default class DoublemoveRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: C.Options.styles.filter(s => s != "doublemove")
    };
  }

  constructor(o) {
    o.options["doublemove"] = true;
    super(o);
  }

};
