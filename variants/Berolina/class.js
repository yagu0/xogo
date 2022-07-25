import ChessRules from "/base_rules.js";
import BerolinaPawnSpec from "/variants/_Berolina/pawnSpec.js";

export default class BerolinaRules extends ChessRules {

  pieces(color, x, y) {
    let res = super.pieces(color, x, y);
    res['p'] = BerolinaPawnSpec(color);
    return res;
  }

};
