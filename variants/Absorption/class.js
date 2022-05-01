import ChessRules from "/base_rules.js";

export default class AbsorptionRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      check: [],
      styles: [
        "balance",
        "capture",
        "cylinder",
        "dark",
        "doublemove",
        "progressive",
        "recycle",
        "rifle",
        "teleport",
        "zen"
      ]
    };
  }

  pieces(color) {
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
        steps: [
          [1, 2], [1, -2], [-1, 2], [-1, -2],
          [2, 1], [-2, 1], [2, -1], [-2, -1]
        ],
      },
      // princess
      'b': {
        "class": "bishop",
        steps: [[1, 1], [1, -1], [-1, 1], [-1, -1]]
      }
    };
    return Object.assign(fusions, super.pieces(color));
  }

  static get MergeComposed() {
    return {
      "be": "a",
      "bs": "s",
      "er": "e",
      "rs": "a",
      "eq": "a",
      "qs": "a",
      "ee": "e",
      "es": "a",
      "ss": "s"
    };
  }

  static Fusion(p1, p2) {
    if (p1 == V.KING) return p1;
    if (p1 == V.PAWN) return p2;
    if (p2 == V.PAWN) return p1;
    if ([p1, p2].includes(V.KNIGHT)) {
      if ([p1, p2].includes(V.QUEEN)) return V.QN;
      if ([p1, p2].includes(V.ROOK)) return V.RN;
      if ([p1, p2].includes(V.BISHOP)) return V.BN;
      // p1 or p2 already have knight + other piece
      return (p1 == V.KNIGHT ? p2 : p1);
    }
    if ([p1, p2].includes(V.QN)) return V.QN;
    for (let p of [p1, p2]) {
      if ([V.BN, V.RN].includes(p))
        return V.MergeComposed[[p1, p2].sort().join("")];
    }
    // bishop + rook, or queen + [bishop or rook]
    return V.QUEEN;
  }

  getPotentialMovesFrom(sq) {
    let moves = [];
    const piece = this.getPiece(sq[0], sq[1]);
    switch (piece) {
      case V.RN:
        moves =
          super.getPotentialRookMoves(sq).concat(
          super.getPotentialKnightMoves(sq));
        break;
      case V.BN:
        moves =
          super.getPotentialBishopMoves(sq).concat(
          super.getPotentialKnightMoves(sq));
        break;
      case V.QN:
        moves =
          super.getPotentialQueenMoves(sq).concat(
          super.getPotentialKnightMoves(sq));
        break;
      default:
        moves = super.getPotentialMovesFrom(sq);
    }
    // Filter out capturing promotions (except one),
    // because they are all the same.
    moves = moves.filter(m => {
      return (
        m.vanish.length == 1 ||
        m.vanish[0].p != V.PAWN ||
        [V.PAWN, V.QUEEN].includes(m.appear[0].p)
      );
    });
    moves.forEach(m => {
      if (
        m.vanish.length == 2 &&
        m.appear.length == 1 &&
        piece != m.vanish[1].p
      ) {
        // Augment pieces abilities in case of captures
        m.appear[0].p = V.Fusion(piece, m.vanish[1].p);
      }
    });
    return moves;
  }

  isAttacked(sq, color) {
    return (
      super.isAttacked(sq, color) ||
      this.isAttackedByBN(sq, color) ||
      this.isAttackedByRN(sq, color) ||
      this.isAttackedByQN(sq, color)
    );
  }

  isAttackedByBN(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.BN, V.steps[V.BISHOP]) ||
      this.isAttackedBySlideNJump(
        sq, color, V.BN, V.steps[V.KNIGHT], 1)
    );
  }

  isAttackedByRN(sq, color) {
    return (
      this.isAttackedBySlideNJump(sq, color, V.RN, V.steps[V.ROOK]) ||
      this.isAttackedBySlideNJump(
        sq, color, V.RN, V.steps[V.KNIGHT], 1)
    );
  }

  isAttackedByQN(sq, color) {
    return (
      this.isAttackedBySlideNJump(
        sq, color, V.QN, V.steps[V.BISHOP].concat(V.steps[V.ROOK])) ||
      this.isAttackedBySlideNJump(
        sq, color, V.QN, V.steps[V.KNIGHT], 1)
    );
  }

  static get VALUES() {
    return Object.assign(
      { a: 12, e: 7, s: 5 },
      ChessRules.VALUES
    );
  }

  getNotation(move) {
    let notation = super.getNotation(move);
    if (move.vanish[0].p != V.PAWN && move.appear[0].p != move.vanish[0].p)
      // Fusion (not from a pawn: handled in ChessRules)
      notation += "=" + move.appear[0].p.toUpperCase();
    return notation;
  }

};
