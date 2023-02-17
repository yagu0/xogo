import ChessRules from "/base_rules.js";

export default class ChecklessRules extends ChessRules {

  // Cannot use super.atLeastOneMove: lead to infinite recursion
  atLeastOneMove_aux(kingPos, oppKingPos, color, oppCol) {
    for (let i = 0; i < this.size.x; i++) {
      for (let j = 0; j < this.size.y; j++) {
        if (this.getColor(i, j) == color) {
          const moves = this.getPotentialMovesFrom([i, j]);
          for (let m of moves) {
            this.playOnBoard(m);
            const res = this.trackKingWrap(m, kingPos, (kp) => {
              return !this.underCheck(kp, [oppCol]);
            });
            this.undoOnBoard(m);
            if (res)
              return true;
          }
        }
      }
    }
    return false;
  }

  filterValid(moves) {
    fmoves = super.filterValid(moves);
    // Filter out moves giving check but not checkmate
    const color = this.turn;
    const oppCol = C.GetOppTurn(color);
    let kingPos = this.searchKingPos(color),
        oppKingPos = this.searchKingPos(oppCol);
    return fmoves.filter(m => {
      this.playOnBoard(m);
      const res = this.trackKingWrap(m, oppKingPos, (oppKp) => {
        return (
          !this.underCheck(oppKp, [color]) ||
          this.atLeastOneMove_aux(oppKp, kingPos, oppCol, color)
        );
      });
      this.undoOnBoard(m);
      return res;
    });
  }

};
