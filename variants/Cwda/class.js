import ChessRules from "/base_rules.js";

export default class CwdaRules extends ChessRules {

  static get Options() {
    return {
      select: ChessRules.Options.select.concat([
        {
          label: "Army 1",
          variable: "army1",
          defaut: 'C',
          options: [
            { label: "Colorbound Clobberers", value: 'C' },
            { label: "Nutty Knights", value: 'N' },
            { label: "Remarkable Rookies", value: 'R' },
            { label: "Fide", value: 'F' }
          ]
        },
        {
          label: "Army 2",
          variable: "army2",
          defaut: 'C',
          options: [
            { label: "Colorbound Clobberers", value: 'C' },
            { label: "Nutty Knights", value: 'N' },
            { label: "Remarkable Rookies", value: 'R' },
            { label: "Fide", value: 'F' }
          ]
        }
      ]),
      input: ChessRules.Options.input,
      styles: ChessRules.Options.styles
    };
  }

  static get PiecesMap() {
    return {
      // Colorbound Clobberers
      'C': {
        'r': 'd',
        'n': 'w',
        'b': 'f',
        'q': 'c',
        'k': 'm',
        'p': 'z'
      },
      // Nutty Knights
      'N': {
        'r': 'g',
        'n': 'i',
        'b': 't',
        'q': 'l',
        'k': 'e',
        'p': 'v'
      },
      // Remarkable Rookies
      'R': {
        'r': 's',
        'n': 'y',
        'b': 'h',
        'q': 'o',
        'k': 'a',
        'p': 'u'
      }
    };
  }

  genRandInitBaseFen() {
    let s = FenUtil.setupPieces(
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
      {
        randomness: this.options["randomness"],
        between: [{p1: 'k', p2: 'r'}],
        diffCol: ['b'],
        flags: ['r', 'k']
      }
    );
    let pawnLines = {
      w: "pppppppp",
      b: "pppppppp"
    };
    for (const c of ['w', 'b']) {
      const army = "army" + (c == 'w' ? "1" : "2");
      if (this.options[army] != 'F') {
        for (let obj of [s, pawnLines]) {
          obj[c] = obj[c].split("")
            .map(p => V.PiecesMap[this.options[army]][p]).join("");
        }
      }
    }
    return {
      fen: s.b.join("") + "/" +
           pawnLines['b'] + "/8/8/8/8/" + pawnLines['w'].toUpperCase() +
           "/" + s.w.join("").toUpperCase(),
      o: {flags: s.flags}
    };
  }

  getPartFen(o) {
    return Object.assign(
      { "armies": this.options["army1"] + this.options["army2"] },
      super.getPartFen(o)
    );
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    this.army1 = fenParsed.armies.charAt(0);
    this.army2 = fenParsed.armies.charAt(1);
  }

  isKing(x, y, p) {
    if (!p)
      p = this.getPiece(x, y);
    return (super.isKing(x, y, p) || ['a', 'e', 'm'].includes(p));
  }

  // Helper to describe pieces movements
  static get steps() {
    return {
      // Dabbabah
      'd': [
        [-2, 0],
        [0, -2],
        [2, 0],
        [0, 2]
      ],
      // Alfil
      'a': [
        [2, 2],
        [2, -2],
        [-2, 2],
        [-2, -2]
      ],
      // Ferz
      'f': [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1]
      ],
      // Wazir
      'w': [
        [-1, 0],
        [0, -1],
        [1, 0],
        [0, 1]
      ],
      // Threeleaper
      '$3': [
        [-3, 0],
        [0, -3],
        [3, 0],
        [0, 3]
      ],
      // Narrow knight
      '$n': [
        [-2, -1],
        [-2, 1],
        [2, -1],
        [2, 1]
      ]
    };
  }

  pieces(color, x, y) {
    const res = super.pieces(color, x, y);
    return Object.assign(
      {
        'd': {
          "class": "c_rook",
          both: [
            {steps: V.steps.b},
            {steps: V.steps.d, range: 1}
          ]
        },
        'w': {
          "class": "c_knight",
          both: [
            {steps: V.steps.a, range: 1},
            {steps: V.steps.r, range: 1}
          ]
        },
        'f': {
          "class": "c_bishop",
          both: [
            {steps: V.steps.d, range: 1},
            {steps: V.steps.a, range: 1},
            {steps: V.steps.b, range: 1}
          ]
        },
        'c': {
          "class": "c_queen",
          both: [
            {steps: V.steps.b},
            {steps: V.steps.n, range: 1}
          ]
        },
        'm': { moveas: 'k' },
        'z': { moveas: 'p' },
        'g': {

        },
        'i': {

        },
        't': {

        },
        'l': {

        },
        'e': { moveas: 'k' },
        'v': { moveas: 'p' },
        's': {

        },
        'y': {

        },
        'h': {

        },
        'o': {

        },
        'a': { moveas: 'k' },
        'u': { moveas: 'p' }
      },
      res
    );





  getPotentialN_rookMoves(sq) {
    const c = this.turn;
    const rookSteps = [ [0, -1], [0, 1], [c == 'w' ? -1 : 1, 0] ];
    const backward = (c == 'w' ? 1 : -1);
    const kingSteps = [ [backward, -1], [backward, 0], [backward, 1] ];
    return (
      this.getSlideNJumpMoves(sq, rookSteps).concat(
      this.getSlideNJumpMoves(sq, kingSteps, 1))
    );
  }

  getPotentialN_knightMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps.$n, 1).concat(
      this.getSlideNJumpMoves(sq, V.steps.f, 1))
    );
  }

  getPotentialN_bishopMoves(sq) {
    const backward = (this.turn == 'w' ? 1 : -1);
    const kingSteps = [
      [0, -1], [0, 1], [backward, -1], [backward, 0], [backward, 1]
    ];
    const forward = -backward;
    const knightSteps = [
      [2*forward, -1], [2*forward, 1], [forward, -2], [forward, 2]
    ];
    return (
      this.getSlideNJumpMoves(sq, knightSteps, 1).concat(
      this.getSlideNJumpMoves(sq, kingSteps, 1))
    );
  }

  getPotentialN_queenMoves(sq) {
    const backward = (this.turn == 'w' ? 1 : -1);
    const forward = -backward;
    const kingSteps = [
      [forward, -1], [forward, 1],
      [backward, -1], [backward, 0], [backward, 1]
    ];
    const knightSteps = [
      [2*forward, -1], [2*forward, 1], [forward, -2], [forward, 2]
    ];
    const rookSteps = [ [0, -1], [0, 1], [forward, 0] ];
    return (
      this.getSlideNJumpMoves(sq, rookSteps).concat(
      this.getSlideNJumpMoves(sq, kingSteps, 1)).concat(
      this.getSlideNJumpMoves(sq, knightSteps, 1))
    );
  }

  getPotentialR_rookMoves(sq) {
    return this.getSlideNJumpMoves(sq, V.steps.r, 4);
  }

  getPotentialR_knightMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps.d, 1).concat(
      this.getSlideNJumpMoves(sq, V.steps.w, 1))
    );
  }

  getPotentialR_bishopMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps.d, 1).concat(
      this.getSlideNJumpMoves(sq, V.steps.f, 1)).concat(
      this.getSlideNJumpMoves(sq, V.steps.$3, 1))
    );
  }

  getPotentialR_queenMoves(sq) {
    return (
      this.getSlideNJumpMoves(sq, V.steps.r).concat(
      this.getSlideNJumpMoves(sq, V.steps.n, 1))
    );
  }

      case V.PAWN: {
        // Can promote in anything from the two current armies
        let promotions = [];
        for (let army of ["army1", "army2"]) {
          if (army == "army2" && this.army2 == this.army1) break;
          switch (this[army]) {
            case 'C': {
              Array.prototype.push.apply(promotions,
                [V.C_ROOK, V.C_KNIGHT, V.C_BISHOP, V.C_QUEEN]);
              break;
            }
            case 'N': {
              Array.prototype.push.apply(promotions,
                [V.N_ROOK, V.N_KNIGHT, V.N_BISHOP, V.N_QUEEN]);
              break;
            }
            case 'R': {
              Array.prototype.push.apply(promotions,
                [V.R_ROOK, V.R_KNIGHT, V.R_BISHOP, V.R_QUEEN]);
              break;
            }
            case 'F': {
              Array.prototype.push.apply(promotions,
                [V.ROOK, V.KNIGHT, V.BISHOP, V.QUEEN]);
              break;
            }
          }
        }
        return super.getPotentialPawnMoves(sq, promotions);
      }
      default: return super.getPotentialMovesFrom(sq);
    }

  getCastleMoves([x, y]) {
    const color = this.getColor(x, y);
    let finalSquares = [ [2, 3], [V.size.y - 2, V.size.y - 3] ];
    if (
      (color == 'w' && this.army1 == 'C') ||
      (color == 'b' && this.army2 == 'C')
    ) {
      // Colorbound castle long in an unusual way:
      finalSquares[0] = [1, 2];
    }
    return super.getCastleMoves([x, y], finalSquares);
  }

};
