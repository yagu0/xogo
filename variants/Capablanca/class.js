import ChessRules from "/base_rules.js";

export default class CapablancaRules extends ChessRules {

  get pawnPromotions() {
    return ['q', 'e', 's', 'r', 'n', 'b'];
  }

  pieces(color, x, y) {
    let newPieces = {
      'e': {
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
      },
      's': {
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
      }
    };
    return Object.assign(newPieces, super.pieces(color, x, y));
  }

  get size() {
    return {x: 8, y: 10};
  }

  genRandInitBaseFen() {
    const s = FenUtil.setupPieces(
      ['r', 'n', 's', 'b', 'q', 'k', 'b', 'e', 'n', 'r'],
      {
        between: {p1: 'k', p2: 'r'},
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
