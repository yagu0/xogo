import ChessRules from "/base_rules.js";

export default class TeleportRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input.concat({
        label: "Teleport king",
        variable: "tpking",
        type: "checkbox",
        defaut: false
      }),
      styles: C.Options.styles.filter(s => s != "teleport")
    };
  }

  constructor(o) {
    o.options["teleport"] = true;
    super(o);
  }

  canSelfTake([x1, y1], [x2, y2]) {
    return (this.options["tpking"] || !this.isKing(x2, y2));
  }

};
