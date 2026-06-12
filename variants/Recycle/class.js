import ChessRules from "/js/base_rules.js";

export default class RecycleRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: C.Options.styles.filter(s => s != "recycle")
    };
  }

  constructor(o) {
    o.options["recycle"] = true;
    super(o);
  }

};
