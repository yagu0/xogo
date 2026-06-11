import ChessRules from "/js/base_rules.js";
import {FenUtil} from "/utils/setupPieces.js";

export default class CapablancaRules extends ChessRules {

  pawnPromotions() {
    return ['q', 'e', 's', 'r', 'n', 'b'];
  }

  pieceDef(piece, color, x, y) {
    switch (piece) {
    case 'e': return {
      "class": "empress",
      both: [
        {
          steps: [
            [1, 0], [-1, 0], [0, 1], [0, -1]
          ]
        },
        {
          steps: [
            [1, 2], [1, -2], [-1, 2], [-1, -2],
            [2, 1], [-2, 1], [2, -1], [-2, -1]
          ],
          range: 1
        }
      ]
    };
    case 's': return {
      "class": "princess",
      both: [
        {
          steps: [
            [1, 1], [1, -1], [-1, 1], [-1, -1]
          ]
        },
        {
          steps: [
            [1, 2], [1, -2], [-1, 2], [-1, -2],
            [2, 1], [-2, 1], [2, -1], [-2, -1]
          ],
          range: 1
        }
      ]
    };
    }
    return super.pieceDef(piece, color, x, y);
  }

  get size() {
    return {
      x: 8,
      y: 10,
      ratio: 1.25
    };
  }

  genRandInitBaseFen() {
    const s = FenUtil.setupPieces(
      ['r', 'n', 's', 'b', 'q', 'k', 'b', 'e', 'n', 'r'],
      {
        randomness: this.options["randomness"],
        between: [{p1: 'k', p2: 'r'}],
        diffCol: ['b'],
        flags: ['r']
      }
    );
    return {
      fen: s.b.join("") + "/pppppppppp/91/91/91/91/PPPPPPPPPP/" +
           s.w.join("").toUpperCase(),
      o: {flags: s.flags}
    };
  }

};
