import ChessRules from "/base_rules.js";

export default class RifleRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      check: C.Options.check,
      styles: C.Options.styles.filter(s => s != "rifle")
    };
  }

  constructor(o) {
    o.options["rifle"] = true;
    super(o);
  }

};
