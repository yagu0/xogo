import ChessRules from "/base_rules.js";
import {ArrayFun} from "/utils/array.js";
import {Random} from "/utils/alea.js";
import {FenUtil} from "/utils/setupPieces.js";

export default class AlapoRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      styles: C.Options.styles.filter(s => s != "teleport")
    };
  }

  get hasFlags() {
    return false;
  }
  get hasEnpassant() {
    return false;
  }

  getSvgChessboard() {
    let board = super.getSvgChessboard().slice(0, -6);
    // Add lines to delimitate goals
    board += `
      <line x1="0" y1="10" x2="60" y2="10" stroke="black" stroke-width="0.1"/>
      <line x1="0" y1="50" x2="60" y2="50" stroke="black" stroke-width="0.1"/>
      </svg>`;
    return board;
  }

  genRandInitBaseFen() {
    const s =
      FenUtil.setupPieces(['r', 'b', 'q', 'q', 'b', 'r'], {diffCol: ['b']});
    const piece2pawn = {
      r: 't',
      q: 's',
      b: 'c'
    };
    const fen = (
      s.b.join("") + "/" +
      s.b.map(p => piece2pawn[p]).join("") +
      "/6/6/" +
      s.w.map(p => piece2pawn[p].toUpperCase()).join("") + "/" +
      s.w.join("").toUpperCase()
    );
    return { fen: fen, o: {} };
  }

  // Triangles are rotated from opponent viewpoint (=> suffix "_inv")
  pieces(color, x, y) {
    const allSpecs = super.pieces(color, x, y);
    return {
      'r': allSpecs['r'],
      'q': allSpecs['q'],
      'b': Object.assign({}, allSpecs['b'],
        {"class": "bishop" + (this.playerColor != color ? "_inv" : "")}),
      's': { //"square"
        "class": "babyrook",
        both: [
          {
            steps: [[0, 1], [0, -1], [1, 0], [-1, 0]],
            range: 1
          }
        ]
      },
      'c': { //"circle"
        "class": "babyqueen",
        both: [
          {
            steps: [
              [0, 1], [0, -1], [1, 0], [-1, 0],
              [1, 1], [1, -1], [-1, 1], [-1, -1]
            ],
            range: 1
          }
        ]
      },
      't': { //"triangle"
        "class": "babybishop" + (this.playerColor != color ? "_inv" : ""),
        both: [
          {
            steps: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
            range: 1
          }
        ]
      }
    };
  }

  get size() {
    return {
      x: 6,
      y: 6
    };
  }

  filterValid(moves) {
    return moves;
  }

  getCurrentScore() {
    // Try both colors (to detect potential suicides)
    let won = {};
    for (let c of ['w', 'b']) {
      const oppCol = C.GetOppCol(c);
      const goal = (c == 'w' ? 0 : 5);
      won[c] = this.board[goal].some((b,j) => {
        return (
          this.getColor(goal, j) == c &&
          !this.findCapturesOn(
            [goal, j],
            {
              one: true,
              oppCol: oppCol,
              segments: this.options["cylinder"]
            }
          )
        );
      });
    }
    if (won['w'] && won['b'])
      return "?"; //no idea who won, not relevant anyway :)
    return (won['w'] ? "1-0" : (won['b'] ? "0-1" : "*"));
  }

};
