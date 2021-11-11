import ChessRules from "/base_rules.js";

export default class ZenRules extends ChessRules {

  static get Options() {
    return {
      select: ChessRules.Options.select,
      check: ChessRules.Options.check,
      styles: ChessRules.Options.styles.filter(s => s != "zen")
    };
  }

  constructor(o) {
    super(o);
    o.options.zen = true;
  }

};
