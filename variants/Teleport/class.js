import ChessRules from "/base_rules.js";

export default class TeleportRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      // TODO? option "teleport king"?
      check: C.Options.check,
      styles: C.Options.styles.filter(s => s != "teleport")
    };
  }

  constructor(o) {
    o.options["teleport"] = true;
    super(o);
  }

};
