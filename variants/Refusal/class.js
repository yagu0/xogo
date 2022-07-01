import ChessRules from "/base_rules.js";

export default class RefusalRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: [
        {
          label: "Refuse any",
          variable: "refuseany",
          type: "checkbox",
          defaut: true
        }
      ],
      styles: ["cylinder"]
    };
  }

  get hasFlags() {
    return false;
  }

  getPartFen(o) {
    let parts = super.getPartFen(o);
    parts["lastmove"] = o.init ? null : this.lastMove;
    return parts;
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    this.lastMove = JSON.parse(fenParsed.lastmove);
    if (!this.lastMove) {
      // Fill with empty values to avoid checking lastMove != null
      this.lastMove = {
        start: {x: -1, y: -1}, end: {x: -1, y: -1}, vanish: [{c: ''}]
      };
    }
  }

  canIplay(x, y) {
    if (super.canIplay(x, y))
      return true;
    // Check if playing last move, reversed:
    const lm = this.lastMove;
    return (!lm.noRef && x == lm.end.x && y == lm.end.y);
  }

  getPotentialMovesFrom([x, y]) {
    const moveColor = this.getColor(x, y);
    if (moveColor != this.turn) {
      let revLm = JSON.parse(JSON.stringify(this.lastMove));
      [revLm.appear, revLm.vanish] = [revLm.vanish, revLm.appear];
      [revLm.start, revLm.end] = [revLm.end, revLm.start];
      if (!this.options["refuseany"]) {
        // After refusing this move, can my opponent play a different move?
        this.playOnBoard(revLm);
        let totOppMoves = 0;
        outerLoop: for (let i=0; i<this.size.x; i++) {
          for (let j=0; j<this.size.y; j++) {
            if (this.getColor(i, j) == moveColor) {
              const potentialOppMoves = super.getPotentialMovesFrom([i, j]);
              totOppMoves +=
                super.filterValid(potentialOppMoves, moveColor).length;
              if (totOppMoves >= 2)
                break outerLoop;
            }
          }
        }
        this.undoOnBoard(revLm);
        if (totOppMoves <= 1)
          return [];
      }
      // Also reverse segments in Cylinder mode:
      if (this.options["cylinder"])
        revLm.segments = revLm.segments.map(seg => [seg[1], seg[0]]);
      else
        delete revLm["segments"];
      revLm.refusal = true;
      revLm.noRef = true; //cannot refuse a refusal move :)
      return [revLm];
    }
    return super.getPotentialMovesFrom([x, y]);
  }

  getEpSquare(move) {
    if (!move.refusal)
      return super.getEpSquare(move);
    return null;
  }

  filterValid(moves) {
    const color = this.turn;
    const lm = this.lastMove;
    let rMoves = moves.filter(m => {
      return (
        !lm.refusal || //it's my first move attempt on this turn
        m.start.x != lm.end.x || m.start.y != lm.end.y ||
        m.end.x != lm.start.x || m.end.y != lm.start.y ||
        // Doing the same move again: maybe pawn promotion?
        (m.vanish[0].p == 'p' && m.appear[0].p != lm.appear[0].p)
      );
    });
    return super.filterValid(rMoves);
  }

  prePlay(move) {
    if (!move.noRef)
      // My previous move was already refused?
      move.noRef = this.lastMove.vanish[0].c == this.turn;
  }

  postPlay(move) {
    this.lastMove = move;
    super.postPlay(move);
  }

  atLeastOneMove(color) {
    if (!this.lastMove.noRef)
      return true;
    return super.atLeastOneMove(color);
  }

};
