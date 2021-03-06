import ChessRules from "/base_rules.js";

export default class BalancedRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: C.Options.styles.filter(s => s != "balance")
    };
  }

  constructor(o) {
    o.options["balance"] = true;
    super(o);
  }

};
