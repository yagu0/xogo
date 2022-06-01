import ChessRules from "/base_rules.js";

export default class AbsorptionRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      styles: [
        "balance",
        "capture",
        "cylinder",
        "dark",
        "doublemove",
        "progressive",
        "recycle",
        //"rifle", //TODO
        "teleport",
        "zen"
      ]
    };
  }

  pieces(color, x, y) {
    let fusions = {
      // amazon
      'a': {
        "class": "amazon",
        moves: [
          {
            steps: [
              [0, 1], [0, -1], [1, 0], [-1, 0],
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
      },
      // empress
      'e': {
        "class": "empress",
        moves: [
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
      // princess
      's': {
        "class": "princess",
        moves: [
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
    return Object.assign(fusions, super.pieces(color, x, y));
  }

  static get MergeComposed() {
    return {
      "be": "a",
      "bq": "q",
      "br": "q",
      "bs": "s",
      "eq": "a",
      "er": "e",
      "es": "a",
      "rs": "a",
      "qr": "q",
      "qs": "a",
      "rs": "a"
    };
  }

  // Assumption p1 != p2
  static Fusion(p1, p2) {
    if (p1 == "k")
      return p1;
    if (p1 == "p")
      return p2;
    if (p2 == "p")
      return p1;
    if ([p1, p2].includes("n")) {
      if ([p1, p2].includes("q"))
        return "a";
      if ([p1, p2].includes("r"))
        return "e";
      if ([p1, p2].includes("b"))
        return "s";
      // p1 or p2 already have knight + other piece
      return (p1 == "n" ? p2 : p1);
    }
    if ([p1, p2].includes("a"))
      return "a";
    // No king, no pawn, no knight or amazon => 5 remaining pieces
    return V.MergeComposed[[p1, p2].sort().join("")];
  }

  // TODO: interaction with rifle ?
  postProcessPotentialMoves(moves) {
    // Filter out capturing promotions (except one),
    // because they are all the same.
    moves = moves.filter(m => {
      return (
        m.vanish.length == 1 ||
        m.vanish[0].p != "p" ||
        ["p", "q"].includes(m.appear[0].p)
      );
    });
    moves.forEach(m => {
      if (
        m.vanish.length == 2 &&
        m.appear.length == 1 &&
        m.vanish[0].p != m.vanish[1].p
      ) {
        // Augment pieces abilities in case of captures
        m.appear[0].p = V.Fusion(m.vanish[0].p, m.vanish[1].p);
      }
    });
    return super.postProcessPotentialMoves(moves);
  }

};
