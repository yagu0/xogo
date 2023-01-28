import ChessRules from "/base_rules.js";
import {FenUtil} from "/utils/setupPieces.js";

export default class BalaklavaRules extends ChessRules {

  get pawnPromotions() {
    return ['r', 'm', 'b', 'q'];
  }

  get hasEnpassant() {
    return false;
  }

  pieces(color, x, y) {
    let res = super.pieces(color, x, y);
    const knightSpecMoves = res['n'].both;
    delete res['n'];
    res['m'] = {
      "class": "mammoth",
      both: [
        {
          steps: [
            [-2, -2], [-2, 0], [-2, 2],
            [0, -2], [0, 2], [2, -2],
            [2, 0], [2, 2]
          ],
          range: 1
        }
      ]
    };
    ['p', 'r', 'b', 'm', 'q'].forEach(p => {
      if (!res[p].moves)
        res[p].moves = [];
      Array.prototype.push.apply(res[p].moves, knightSpecMoves);
    });
    return res;
  }

  genRandInitBaseFen() {
    const s = FenUtil.setupPieces(
      ['r', 'm', 'b', 'q', 'k', 'b', 'm', 'r'],
      {
        randomness: this.options["randomness"],
        diffCol: ['b']
      }
    );
    return {
      fen: s.b.join("") + "/pppppppp/8/8/8/8/PPPPPPPP/" +
           s.w.join("").toUpperCase(),
      o: {flags: s.flags}
    };
  }

  pawnPostProcess(moves) {
    if (moves.length == 0)
      return [];
    const color = moves[0].vanish[0].c;
    const lastRank = (color == 'w' ? 0 : this.size.x - 1);
    const forward = (color == 'w' ? -1 : 1);
    const noKnightPromotions = moves.filter(m => {
      return (
        (m.end.x - m.start.x) * forward > 0 &&
        (
          m.end.x != lastRank ||
          (
            Math.abs(m.start.x - m.end.x) <= 1 &&
            Math.abs(m.start.y - m.end.y) <= 1
          )
        )
      );
    });
    return super.pawnPostProcess(noKnightPromotions);
  }

};
