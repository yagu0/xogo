import ChessRules from "/base_rules.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export default class ChainingRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: ["atomic", "capture", "crazyhouse", "cylinder", "dark", "zen"]
    };
  }

  get hasSelfCaptures() {
    return true;
  }

  canSelfTake() {
    return true; //self captures induce chaining
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    // Stack of "last move" only for intermediate chaining
    this.lastMoveEnd = [];
  }

  getBasicMove([sx, sy], [ex, ey], tr) {
    const L = this.lastMoveEnd.length;
    const piece = (L >= 1 ? this.lastMoveEnd[L-1].p : null);
    if (
      this.board[ex][ey] == "" ||
      this.getColor(ex, ey) == C.GetOppTurn(this.turn)
    ) {
      if (piece && !tr)
        tr = {c: this.turn, p: piece};
      let mv = super.getBasicMove([sx, sy], [ex, ey], tr);
      if (piece)
        mv.vanish.pop(); //end of a chain: initial piece remains
      return mv;
    }
    // (Self)Capture: initial, or inside a chain
    const initPiece = (piece || this.getPiece(sx, sy)),
          destPiece = this.getPiece(ex, ey);
    let mv = new Move({
      start: {x: sx, y: sy},
      end: {x: ex, y: ey},
      appear: [
        new PiPo({
          x: ex,
          y: ey,
          c: this.turn,
          p: (!!tr ? tr.p : initPiece)
        })
      ],
      vanish: [
        new PiPo({
          x: ex,
          y: ey,
          c: this.turn,
          p: destPiece
        })
      ]
    });
    if (!piece) {
      // Initial capture
      mv.vanish.unshift(
        new PiPo({
          x: sx,
          y: sy,
          c: this.turn,
          p: initPiece
        })
      );
    }
    mv.chained = destPiece; //easier (no need to detect it)
//    mv.drag = {c: this.turn, p: initPiece}; //TODO: doesn't work
    return mv;
  }

  getPiece(x, y) {
    const L = this.lastMoveEnd.length;
    if (L >= 1 && this.lastMoveEnd[L-1].x == x && this.lastMoveEnd[L-1].y == y)
      return this.lastMoveEnd[L-1].p;
    return super.getPiece(x, y);
  }

  getPotentialMovesFrom([x, y], color) {
    const L = this.lastMoveEnd.length;
    if (
      L >= 1 &&
      (x != this.lastMoveEnd[L-1].x || y != this.lastMoveEnd[L-1].y)
    ) {
      // A self-capture was played: wrong square
      return [];
    }
    return super.getPotentialMovesFrom([x, y], color);
  }

  isLastMove(move) {
    return !move.chained;
  }

  postPlay(move) {
    super.postPlay(move);
    if (!!move.chained) {
      this.lastMoveEnd.push({
        x: move.end.x,
        y: move.end.y,
        p: move.chained
      });
    }
    else
      this.lastMoveEnd = [];
  }

};
