import ChessRules from "/js/base_rules.js";
import {FenUtil} from "/utils/setupPieces.js";

export default class BalaklavaRules extends ChessRules {

  pawnPromotions() {
    return ['r', 'm', 'b', 'q'];
  }

  get hasEnpassant() {
    return false;
  }

  pieceDef(piece, color, x, y) {
    if (piece == 'm') {
      return {
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
    }
    let res = super.pieceDef(piece, color, x, y);
    const knightSpecMoves = super.pieceDef('n').both;
    if (!res.moves)
      res.moves = [];
    res.moves.push(...knightSpecMoves);
    return res;
  }

  genRandInitBaseFen() {
    let res = super.genRandInitBaseFen();
    res.fen = res.fen.replaceAll(/[nN]/g, match => (match == 'n' ? 'm' : 'M'));
    return res;
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
