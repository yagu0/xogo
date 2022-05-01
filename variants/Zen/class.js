import ChessRules from "/base_rules.js";

export default class ZenRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      check: C.Options.check,
      styles: C.Options.styles.filter(s => s != "zen")
    };
  }

  constructor(o) {
    o.options["zen"] = true;
    super(o);
  }

};
