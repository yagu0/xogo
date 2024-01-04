import ChessRules from "/base_rules.js";
import {ArrayFun} from "/utils/array.js"

export default class DiscoduelRules extends ChessRules {

  static get Options() {
    return {}; //nothing would make sense
  }

  get pawnPromotions() {
    return ['p'];
  }

  get hasFlags() {
    return false;
  }

  genRandInitBaseFen() {
    return {
      fen: "1n4n1/8/8/8/8/8/PPPPPPPP/8",
      o: {}
    };
  }

  getPotentialMovesFrom([x, y]) {
    const moves = super.getPotentialMovesFrom([x, y]);
    if (this.turn == 'b')
      // Prevent pawn captures on last rank:
      return moves.filter(m => m.vanish.length == 1 || m.vanish[1].x != 0);
    return moves;
  }

  filterValid(moves) {
    return moves;
  }

  getCurrentScore() {
    // No real winning condition (promotions count...)
    if (
      ArrayFun.range(1, this.size.x).every(row_idx => {
        return this.board[row_idx].every(square => {
          return (!square || square.charAt(0) != 'w');
        })
      })
      ||
      !this.atLeastOneMove(this.turn)
    ) {
      return "1/2";
    }
    return "*";
  }

};
