import ChessRules from "/base_rules.js";

export default class DarkRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      check: C.Options.check,
      styles: C.Options.styles.filter(s => s != "dark")
    };
  }

  constructor(o) {
    o.options["dark"] = true;
    super(o);
  }

};
