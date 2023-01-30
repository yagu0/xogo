import ChessRules from "/base_rules.js";
import BerolinaPawnSpec from "/variants/_Berolina/pawnSpec.js";

export default class BerolinaRules extends ChessRules {

  pieces(color, x, y) {
    let res = super.pieces(color, x, y);
    const initRank = ((color == 'w' && x == 6) || (color == 'b' && x == 1));
    res['p'] = BerolinaPawnSpec(color, initRank);
    return res;
  }

};
