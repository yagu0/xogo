import ChessRules from "/base_rules.js";

export default class CylinderRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      check: C.Options.check,
      styles: C.Options.styles.filter(s => s != "cylinder")
    };
  }

  constructor(o) {
    o.options["cylinder"] = true;
    super(o);
  }

};
