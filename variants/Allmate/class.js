import ChessRules from "/base_rules.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export default class AllmateRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      styles: [
        "cylinder",
        "madrasi",
        "zen"
      ]
    };
  }

  get hasEnpassant() {
    return false;
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    this.curMove = null;
  }

  getPotentialMovesFrom(sq) {
    // Remove direct captures:
    return super.getPotentialMovesFrom(sq)
      .filter(m => m.vanish.length == m.appear.length);
  }

  // Called "recursively" before a move is played, until no effect
  computeNextMove(move) {
    if (move.appear.length > 0)
      this.curMove = move;
    const color = this.turn;
    const oppCol = C.GetOppCol(this.turn);
    let mv = new Move({
      start: this.curMove.end,
      end: this.curMove.end,
      appear: [],
      vanish: []
    });
    this.playOnBoard(move);
    for (let i=0; i<this.size.x; i++) {
      for (let j=0; j<this.size.y; j++) {
        if (this.getColor(i, j) == oppCol && this.isMated(i, j, color)) {
          mv.vanish.push(
            new PiPo({x: i, y: j, c: oppCol, p: this.getPiece(i, j)})
          );
        }
      }
    }
    this.undoOnBoard(move);
    move.next = (mv.vanish.length > 0 ? mv : null);
  }

  // is piece on square x,y mated by color?
  isMated(x, y, color) {
    const myColor = C.GetOppCol(color);
    if (!super.underAttack([x, y], color))
      return false;
    for (let i=0; i<this.size.x; i++) {
      for (let j=0; j<this.size.y; j++) {
        if (this.getColor(i, j) == myColor) {
          const movesIJ = super.getPotentialMovesFrom([i, j], myColor);
          for (let move of movesIJ) {
            this.playOnBoard(move);
            let testSquare = [x, y];
            if (i == x && j == y) {
              // The mated-candidate has moved itself
              testSquare = [move.end.x, move.end.y]; }
            const res = this.underAttack(testSquare, color);
            this.undoOnBoard(move);
            if (!res)
              return false;
          }
        }
      }
    }
    return true;
  }

  underCheck() {
    return false; //not relevant here
  }

  filterValid(moves) {
    return moves; //TODO?: over-simplification to be fixed later
  }

};
