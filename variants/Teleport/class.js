import ChessRules from "/base_rules.js";

export default class TeleportRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      // TODO? option "teleport king"?
      input: C.Options.input,
      styles: C.Options.styles.filter(s => s != "teleport")
    };
  }

  constructor(o) {
    o.options["teleport"] = true;
    super(o);
  }

};
