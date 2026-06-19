import ChessRules from "/js/base_rules.js";
import PiPo from "/utils/PiPo.js";

export default class EnpassantRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: C.Options.styles.filter(s => s != "zen")
    };
  }

  pieceDef(piece, color, x, y) {
    let res = super.pieceDef(piece, color, x, y);
    if (piece == 'n') {
      res["class"] = "nightrider";
      res.both[0].range = 8; //"infinite"
    }
    return res;
  }

  setEpSquare_s(move) {
    // All intermediate squares are en-passant candidates,
    // except if the moving piece is a king.
    const piece = move.appear[0].p;
    if (piece == 'k' ||
      (
        Math.abs(move.end.x - move.start.x) <= 1 &&
        Math.abs(move.end.y - move.start.y) <= 1
      )
    ) {
      this.epSquare_s = undefined;
    }
    else {
      const delta = [move.end.x-move.start.x, move.end.y-move.start.y];
      const divisor = [Math.abs(delta[0]), Math.abs(delta[1])].sort();
      const idx = (divisor[0] > 0 ? 0 : 1);
      const step = [delta[0]/divisor[idx], delta[1]/divisor[idx]];
      this.epSquare_s = [];
      for (
        let [x,y] = [move.start.x + step[0], move.start.y + step[1]];
        x != move.end.x || y != move.end.y;
        x += step[0], y += step[1]
      ) {
        this.epSquare_s.push({ x: x, y: y });
      }
      // Add final square to know which piece is taken en passant:
      this.epSquare_s.push(move.end);
    }
  }

  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x,y]);
    // Special case of the king knight's movement:
    if (!!this.epSquare_s) {
      const L = this.epSquare_s.length;
      const pipoV = new PiPo({
        x: this.epSquare_s[L-1].x,
        y: this.epSquare_s[L-1].y,
        c: C.GetOppTurn(this.turn),
        p: this.getPiece(this.epSquare_s[L-1].x, this.epSquare_s[L-1].y)
      });
      // Check if existing non-capturing moves could also capture en passant
      moves.forEach(m => {
        if (
          m.appear[0].p != 'p' && //special pawn case is handled elsewhere
          m.vanish.length <= 1 &&
          this.epSquare_s.some(sq => m.end.x == sq.x && m.end.y == sq.y)
        ) {
          m.vanish.push(pipoV);
        }
      });
      if (this.getPiece(x, y) == 'k') {
        super.pieceDef('n').both[0].steps.forEach(step => {
          const [endX, endY] = [x + step[0], y + step[1]];
          if (
            this.onBoard(endX, endY) &&
            this.epSquare_s.some(sq => endX == sq.x && endY == sq.y)
          ) {
            let enpassantMove = this.getBasicMove([x, y], [endX, endY]);
            enpassantMove.vanish.push(pipoV);
            moves.push(enpassantMove);
          }
        });
      }
    }
    return moves;
  }

  filterValid(moves) {
    const filteredMoves = super.filterValid(moves);
    // If at least one full move made, everything is allowed:
    if (this.movesCount >= 2)
      return filteredMoves;
    // Else, forbid captures:
    return filteredMoves.filter(m => m.vanish.length == 1);
  }

};
