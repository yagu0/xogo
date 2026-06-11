import ChessRules from "/js/base_rules.js";
import BerolinaPawnSpec from "/variants/_Berolina/pawnSpec.js";

export default class BerolinaRules extends ChessRules {

  pieceDef(piece, color, x, y) {
    if (piece == 'p') {
      const initRank = ((color == 'w' && x == 6) || (color == 'b' && x == 1));
      return BerolinaPawnSpec(color, initRank);
    }
    return super.pieceDef(piece, color, x, y);
  }

};
