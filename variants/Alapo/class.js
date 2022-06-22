import ChessRules from "/base_rules.js";
import { ArrayFun } from "/utils/array.js";
import { Random } from "/utils/alea.js";

export default class AlapoRules extends ChessRules {

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

  genRandInitFen(seed) {
    if (this.options["randomness"] == 0)
      return "rbqqbr/tcssct/6/6/TCSSCT/RBQQBR w 0";

    Random.setSeed(seed);

    const piece2pawn = {
      r: 't',
      q: 's',
      b: 'c'
    };

    let pieces = { w: new Array(6), b: new Array(6) };
    // Shuffle pieces on first (and last rank if randomness == 2)
    for (let c of ["w", "b"]) {
      if (c == 'b' && this.options["randomness"] == 1) {
        pieces['b'] = pieces['w'];
        break;
      }

      let positions = ArrayFun.range(6);

      // Get random squares for bishops
      let randIndex = 2 * Random.randInt(3);
      const bishop1Pos = positions[randIndex];
      let randIndex_tmp = 2 * Random.randInt(3) + 1;
      const bishop2Pos = positions[randIndex_tmp];
      positions.splice(Math.max(randIndex, randIndex_tmp), 1);
      positions.splice(Math.min(randIndex, randIndex_tmp), 1);

      // Get random square for queens
      randIndex = Random.randInt(4);
      const queen1Pos = positions[randIndex];
      positions.splice(randIndex, 1);
      randIndex = Random.randInt(3);
      const queen2Pos = positions[randIndex];
      positions.splice(randIndex, 1);

      // Rooks positions are now fixed,
      const rook1Pos = positions[0];
      const rook2Pos = positions[1];

      pieces[c][rook1Pos] = "r";
      pieces[c][bishop1Pos] = "b";
      pieces[c][queen1Pos] = "q";
      pieces[c][queen2Pos] = "q";
      pieces[c][bishop2Pos] = "b";
      pieces[c][rook2Pos] = "r";
    }

    return (
      pieces["b"].join("") + "/" +
      pieces["b"].map(p => piece2pawn[p]).join("") +
      "/6/6/" +
      pieces["w"].map(p => piece2pawn[p].toUpperCase()).join("") + "/" +
      pieces["w"].join("").toUpperCase() +
      " w 0"
    );
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
        moves: [
          {
            steps: [[0, 1], [0, -1], [1, 0], [-1, 0]],
            range: 1
          }
        ]
      },
      'c': { //"circle"
        "class": "babyqueen",
        moves: [
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
        moves: [
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
          this.findCapturesOn(
            [goal, j], {one: true, oppCol: oppCol}).length == 0
        );
      });
    }
    if (won['w'] && won['b'])
      return "?"; //no idea who won, not relevant anyway :)
    return (won['w'] ? "1-0" : (won['b'] ? "0-1" : "*"));
  }

};
