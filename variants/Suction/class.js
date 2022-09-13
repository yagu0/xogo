import ChessRules from "/base_rules.js";
import {FenUtil} from "/utils/setupPieces.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export default class SuctionRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      styles: [
        "balance",
        "capture",
        "cylinder",
        "dark",
        "doublemove",
        "madrasi",
        "progressive",
        "teleport"
      ]
    };
  }

  get pawnPromotions() {
    return ['p']; //no promotions
  }

  get hasFlags() {
    return false;
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    this.cmove = null;
    const cmove_str = fenParsed.cmove;
    if (cmove_str != "-") {
      this.cmove = {
        start: C.SquareToCoords(cmove_str.substr(0, 2)),
        end: C.SquareToCoords(cmove_str.substr(2))
      };
    }
  }

  genRandInitBaseFen() {
    const s = FenUtil.setupPieces(
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'], {diffCol: ['b']});
    return {
      fen: s.b.join("") + "/pppppppp/8/8/8/8/PPPPPPPP/" +
           s.w.join("").toUpperCase(),
      o: {}
    };
  }

  getPartFen(o) {
    let parts = super.getPartFen(o);
    const cmoveFen = o.init || !this.cmove
      ? "-"
      : C.CoordsToSquare(this.cmove.start) + C.CoordsToSquare(this.cmove.end);
    parts["cmove"] = cmoveFen;
    return parts;
  }

  getBasicMove([sx, sy], [ex, ey]) {
    let move = super.getBasicMove([sx, sy], [ex, ey]);
    if (move.vanish.length == 2) {
      move.appear.push(
        new PiPo({
          x: sx,
          y: sy,
          c: move.vanish[1].c,
          p: move.vanish[1].p
        })
      );
    }
    return move;
  }

  canIplay(x, y) {
    return this.getPiece(x, y) != 'k' && super.canIplay(x, y);
  }

  // Does m2 un-do m1 ? (to disallow undoing captures)
  oppositeMoves(m1, m2) {
    return (
      !!m1 &&
      m2.vanish.length == 2 &&
      m1.start.x == m2.start.x &&
      m1.end.x == m2.end.x &&
      m1.start.y == m2.start.y &&
      m1.end.y == m2.end.y
    );
  }

  filterValid(moves) {
    return moves.filter(m => !this.oppositeMoves(this.cmove, m));
  }

  postPlay(move) {
    super.postPlay(move);
    this.cmove =
      (move.vanish.length == 2 ? {start: move.start, end: move.end} : null);
  }

  atLeastOneMove() {
    return true;
  }

  getCurrentScore() {
    const color = this.turn;
    const kingPos = super.searchKingPos(color);
    if (color == "w" && kingPos[0][0] == 0) return "0-1";
    if (color == "b" && kingPos[0][0] == this.size.x - 1) return "1-0";
    // King is not on the opposite edge: game not over
    return "*";
  }

  // Better animation for swaps
  customAnimate(move, segments, cb) {
    if (move.vanish.length < 2)
      return 0;
    super.animateMoving(move.end, move.start, null,
                        segments.reverse().map(s => s.reverse()), cb);
    return 1;
  }

};
