import AbstractSpecialCaptureRules from "/variants/_SpecialCaptures/class.js";
import {FenUtil} from "/utils/setupPieces.js";
import {Random} from "/utils/alea.js";

export default class BaroqueRules extends AbstractSpecialCaptureRules {

  static get Options() {
    return {
      select: C.Options.Select,
      input: [
        {
          label: "Capture king",
          variable: "taking",
          type: "checkbox",
          defaut: false
        }
      ],
      styles: [
        "balance",
        "capture",
        "crazyhouse",
        "cylinder",
        "doublemove",
        "progressive",
        "recycle",
        "teleport"
      ]
    };
  }

  get hasFlags() {
    return false;
  }

  genRandInitBaseFen() {
    const s = FenUtil.setupPieces(
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'i'],
      {
        randomness: this.options["randomness"],
        diffCol: ['b']
      }
    );
    if (this.options["randomness"] <= 1) {
      // Fix immobilizers/rooks pattern
      const toExchange1 = s.w.indexOf('r'),
            toExchange2 = s.w.indexOf('i');
      s.w[toExchange1] = 'i';
      s.w[toExchange2] = 'r';
    }
    return {
      fen: s.b.join("") + "/pppppppp/8/8/8/8/PPPPPPPP/" +
           s.w.join("").toUpperCase(),
      o: {}
    };
  }

  pieces() {
    return Object.assign({},
      super.pieces(),
      {
        'p': {
          "class": "pawn", //pincer
          moves: [
            {steps: [[0, 1], [0, -1], [1, 0], [-1, 0]]}
          ]
        },
        'r': {
          "class": "rook", //coordinator
          moves: [
            {
              steps: [
                [1, 0], [0, 1], [-1, 0], [0, -1],
                [1, 1], [1, -1], [-1, 1], [-1, -1]
              ]
            }
          ]
        },
        'n': {
          "class": "knight", //long-leaper
          moveas: 'r'
        },
        'b': {
          "class": "bishop", //chameleon
          moveas: 'r'
        },
        'q': {
          "class": "queen", //withdrawer
          moveas: 'r'
        },
        'i': {
          "class": "immobilizer",
          moveas: 'r'
        }
      }
    );
  }

  // Is piece on square (x,y) immobilized?
  isImmobilized([x, y]) {
    const piece = this.getPiece(x, y);
    const color = this.getColor(x, y);
    const oppCol = C.GetOppTurn(color);
    const adjacentSteps = this.pieces()['k'].both[0].steps;
    for (let step of adjacentSteps) {
      const [i, j] = [x + step[0], this.getY(y + step[1])];
      if (
        this.onBoard(i, j) &&
        this.board[i][j] != "" &&
        this.getColor(i, j) == oppCol
      ) {
        const oppPiece = this.getPiece(i, j);
        if (oppPiece == 'i') {
          // Moving is possible only if this immobilizer is neutralized
          for (let step2 of adjacentSteps) {
            const [i2, j2] = [i + step2[0], this.getY(j + step2[1])];
            if (i2 == x && j2 == y)
              continue; //skip initial piece!
            if (
              this.onBoard(i2, j2) &&
              this.board[i2][j2] != "" &&
              this.getColor(i2, j2) == color
            ) {
              if (['b', 'i'].includes(this.getPiece(i2, j2)))
                return false;
            }
          }
          return true; //immobilizer isn't neutralized
        }
        // Chameleons can't be immobilized twice,
        // because there is only one immobilizer
        if (oppPiece == 'b' && piece == 'i')
          return true;
      }
    }
    return false;
  }

  canTake([x1, y1], [x2, y2]) {
    // Deactivate standard captures, except for king:
    return (
      this.getPiece(x1, y1) == 'k' &&
      this.getColor(x1, y1) != this.getColor(x2, y2)
    );
  }

  postProcessPotentialMoves(moves) {
    if (moves.length == 0)
      return [];
    switch (moves[0].vanish[0].p) {
      case 'p':
        this.addPincerCaptures(moves);
        break;
      case 'r':
        this.addCoordinatorCaptures(moves);
        break;
      case 'n':
        const [x, y] = [moves[0].start.x, moves[0].start.y];
        moves = moves.concat(this.getLeaperCaptures([x, y]));
        break;
      case 'b':
        moves = this.getChameleonCaptures(moves, "pull");
        break;
      case 'q':
        this.addPushmePullyouCaptures(moves, false, "pull");
        break;
    }
    return moves;
  }

};
