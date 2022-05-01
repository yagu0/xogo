import ChessRules from "/base_rules.js";

export default class CrazyhouseRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      check: C.Options.check,
      styles: C.Options.styles.filter(s => s != "crazyhouse")
    };
  }

  constructor(o) {
    o.options["crazyhouse"] = true;
    super(o);
  }

};
