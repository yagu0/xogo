import ChessRules from "/base_rules.js";

export default class CannibalRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: C.Options.styles.filter(s => s != "cannibal")
    };
  }

  constructor(o) {
    o.options["cannibal"] = true;
    super(o);
  }

};
