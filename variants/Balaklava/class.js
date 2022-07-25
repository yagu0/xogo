import ChessRules from "/base_rules.js";

export default class BalaklavaRules extends ChessRules {

  get pawnPromotions() {
    return ['r', 'm', 'b', 'q'];
  }

  get hasEnpassant() {
    return false;
  }

  pieces(color, x, y) {
    let res = super.pieces(color, x, y);
    const knightSpec = res['n'];
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
    ['r', 'b', 'm', 'q'].forEach(p => res[p].moves = knightSpec.moves);
    return res;
  }

  genRandInitBaseFen() {
    const baseFen = super.genRandInitBaseFen();
    return {
      fen: baseFen.replace(/n/g, 'm').replace(/N/g, 'M'),
      o: baseFen.o
    };
  }

  pawnPostProcess(moves) {
    if (moves.length == 0)
      return [];
    const color = moves[0].vanish[0].c;
    const lastRank = (color == 'w' ? 0 : this.size.x - 1);
    const noKnightPromotions = moves.filter(m => {
      return (
        m.end.x != lastRank ||
        (
          Math.abs(m.start.x - m.end.x) <= 1 &&
          Math.abs(m.start.y - m.end.y) <= 1
        )
      );
    });
    return super.pawnPostProcess(noKnightPromotions);
  }

};
