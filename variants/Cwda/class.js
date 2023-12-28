import ChessRules from "/base_rules.js";
import {FenUtil} from "/utils/setupPieces.js"

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
        flags: ['r']
      }
    );
    let pawnLines = {
      w: Array(8).fill('p'),
      b: Array(8).fill('p')
    };
    for (const c of ['w', 'b']) {
      const army = "army" + (c == 'w' ? "1" : "2");
      if (this.options[army] != 'F') {
        for (let obj of [s, pawnLines])
          obj[c] = obj[c].map(p => V.PiecesMap[this.options[army]][p]);
      }
    }
    return {
      fen: s.b.join("") + "/" +
           pawnLines['b'].join("") +
           "/8/8/8/8/" +
           pawnLines['w'].join("").toUpperCase() +
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
    this.options["army1"] = fenParsed.armies.charAt(0);
    this.options["army2"] = fenParsed.armies.charAt(1);
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
    const backward = (color == 'w' ? 1 : -1);
    const forward = -backward;
    return Object.assign(
      {
        'd': {
          "class": "c_rook",
          both: [
            {steps: res['b'].both[0].steps},
            {steps: V.steps.d, range: 1}
          ]
        },
        'w': {
          "class": "c_knight",
          both: [
            {steps: V.steps.a, range: 1},
            {steps: res['r'].both[0].steps, range: 1}
          ]
        },
        'f': {
          "class": "c_bishop",
          both: [
            {steps: V.steps.d, range: 1},
            {steps: V.steps.a, range: 1},
            {steps: res['b'].both[0].steps, range: 1}
          ]
        },
        'c': {
          "class": "c_queen",
          both: [
            {steps: res['b'].both[0].steps},
            {steps: res['n'].both[0].steps, range: 1}
          ]
        },
        'm': { "class": "c_king", moveas: 'k' },
        'z': { "class": "c_pawn", moveas: 'p' },
        'g': {
          "class": "n_rook",
          both: [
            {steps: [[0, -1], [0, 1], [color == 'w' ? -1 : 1, 0]]},
            {steps: [[backward, -1], [backward, 0], [backward, 1]], range: 1}
          ]
        },
        'i': {
          "class": "n_knight",
          both: [
            {steps: V.steps.$n, range: 1},
            {steps: V.steps.f, range: 1}
          ]
        },
        't': {
          "class": "n_bishop",
          both: [
            {
              steps: [[0, -1], [0, 1], [backward, -1],
                     [backward, 0], [backward, 1]],
              range: 1
            },
            {
              steps: [[2*forward, -1], [2*forward, 1],
                     [forward, -2], [forward, 2]],
              range: 1
            }
          ]
        },
        'l': {
          "class": "n_queen",
          both: [
            {steps: [[0, -1], [0, 1], [forward, 0]]},
            {steps: [[forward, -1], [forward, 1],
                    [backward, -1], [backward, 0], [backward, 1]], range: 1},
            {steps: [[2*forward, -1], [2*forward, 1],
                    [forward, -2], [forward, 2]], range: 1}
          ]
        },
        'e': { "class": "n_king", moveas: 'k' },
        'v': { "class": "n_pawn", moveas: 'p' },
        's': {
          "class": "r_rook",
          both: [{steps: res['r'].both[0].steps, range: 4}]
        },
        'y': {
          "class": "r_knight",
          both: [
            {steps: V.steps.d, range: 1},
            {steps: V.steps.w, range: 1}
          ]
        },
        'h': {
          "class": "r_bishop",
          both: [
            {steps: V.steps.d, range: 1},
            {steps: V.steps.f, range: 1},
            {steps: V.steps.$3, range: 1}
          ]
        },
        'o': {
          "class": "r_queen",
          both: [
            {steps: res['r'].both[0].steps},
            {steps: res['n'].both[0].steps, range: 1}
          ]
        },
        'a': { "class": "r_king", moveas: 'k' },
        'u': { "class": "r_pawn", moveas: 'p' }
      },
      res
    );
  }

  get pawnPromotions() {
    // Can promote in anything from the two current armies
    let promotions = [];
    for (let army of ["army1", "army2"]) {
      if (army == "army2" && this.options["army2"] == this.options["army1"])
        break;
      switch (this.options[army]) {
        case 'C':
          Array.prototype.push.apply(promotions, ['d', 'w', 'f', 'c']);
          break;
        case 'N':
          Array.prototype.push.apply(promotions, ['g', 'i', 't', 'l']);
          break;
        case 'R':
          Array.prototype.push.apply(promotions, ['s', 'y', 'h', 'o']);
          break;
        case 'F':
          Array.prototype.push.apply(promotions, ['r', 'n', 'b', 'q']);
          break;
      }
    }
    return promotions;
  }

  getCastleMoves([x, y]) {
    const color = this.getColor(x, y);
    let finalSquares = [ [2, 3], [this.size.y - 2, this.size.y - 3] ];
    if (
      (color == 'w' && this.options["army1"] == 'C') ||
      (color == 'b' && this.options["army2"] == 'C')
    ) {
      // Colorbound castle long in an unusual way:
      finalSquares[0] = [1, 2];
    }
    return super.getCastleMoves([x, y], finalSquares);
  }

};
