import ChessRules from "/base_rules.js";

export default class CaptureRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: C.Options.styles.filter(s => s != "capture")
    };
  }

  constructor(o) {
    o.options["capture"] = true;
    super(o);
  }

};
