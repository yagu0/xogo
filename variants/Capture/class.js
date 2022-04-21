import ChessRules from "/base_rules.js";

export default class CaptureRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      check: C.Options.check,
      styles: C.Options.styles.filter(s => s != "capture")
    };
  }

  constructor(o) {
    super(o);
    this.options.capture = true;
  }

};
