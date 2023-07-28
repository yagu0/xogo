import { ChessRules, Move, PiPo } from "@/base_rules";
import { ArrayFun } from "@/utils/array";
import { randInt, sample } from "@/utils/alea";

export class CoregalRules extends ChessRules {

// TODO: special symbol (l) for royal queen...

  getPPpath(m) {
    if (
      m.vanish.length == 2 &&
      m.appear.length == 2 &&
      m.vanish[0].p == V.QUEEN
    ) {
      // Large castle: show castle symbol
      return "Coregal/castle";
    }
    return super.getPPpath(m);
  }

  genRandInitBaseFen() {
    const s = FenUtil.setupPieces(
      ['r', 'n', 'b', 'l', 'k', 'b', 'n', 'r'],
      {
        randomness: this.options["randomness"],
        between: [{p1: 'k', p2: 'r'}, {p1: 'l', p2: 'r'}],
        diffCol: ['b'],
        flags: ['r', 'k', 'l']
      }
    );
    return {
      fen: s.b.join("") + "/pppppppp/8/8/8/8/PPPPPPPP/" +
           s.w.join("").toUpperCase(),
      o: {flags: s.flags}
    };
  }

  pieces() {
    let res = super.pieces();
    res['l'] = {...};
    return res;
  }

  setFlags(fenflags) {
    // white pieces positions, then black pieces positions
    this.castleFlags = { w: [...Array(4)], b: [...Array(4)] };
    for (let i = 0; i < 8; i++) {
      this.castleFlags[i < 4 ? "w" : "b"][i % 4] =
        parseInt(fenflags.charAt(i), 10);
    }
  }

  getPotentialQueenMoves([x, y]) {
    let moves = super.getPotentialQueenMoves([x, y]);
    const c = this.getColor(x, y);
    if (this.castleFlags[c].slice(1, 3).includes(y))
      moves = moves.concat(this.getCastleMoves([x, y]));
    return moves;
  }

  getPotentialKingMoves([x, y]) {
    let moves = this.getSlideNJumpMoves(
      [x, y], V.steps[V.ROOK].concat(V.steps[V.BISHOP]), 1);
    const c = this.getColor(x, y);
    if (this.castleFlags[c].slice(1, 3).includes(y))
      moves = moves.concat(this.getCastleMoves([x, y]));
    return moves;
  }

  getCastleMoves([x, y]) {
    // Relative position of the selected piece: left or right ?
    // If left: small castle left, large castle right.
    // If right: usual situation.
    const c = this.getColor(x, y);
    const relPos = (this.castleFlags[c][1] == y ? "left" : "right");

    const finalSquares = [
      relPos == "left" ? [1, 2] : [2, 3],
      relPos == "right" ? [6, 5] : [5, 4]
    ];
    const saveFlags = JSON.stringify(this.castleFlags[c]);
    // Alter flags to follow base_rules semantic
    this.castleFlags[c] = [0, 3].map(i => this.castleFlags[c][i]);
    const moves = super.getCastleMoves([x, y], finalSquares);
    this.castleFlags[c] = JSON.parse(saveFlags);
    return moves;
  }

  // "twoKings" arg for the similar Twokings variant.
  updateCastleFlags(move, piece, twoKings) {
    const c = V.GetOppCol(this.turn);
    const firstRank = (c == "w" ? V.size.x - 1 : 0);
    // Update castling flags if castling pieces moved or were captured
    const oppCol = V.GetOppCol(c);
    const oppFirstRank = V.size.x - 1 - firstRank;
    if (move.start.x == firstRank) {
      if (piece == V.KING || (!twoKings && piece == V.QUEEN)) {
        if (this.castleFlags[c][1] == move.start.y)
          this.castleFlags[c][1] = 8;
        else if (this.castleFlags[c][2] == move.start.y)
          this.castleFlags[c][2] = 8;
        // Else: the flag is already turned off
      }
    }
    else if (
      move.start.x == firstRank && //our rook moves?
      [this.castleFlags[c][0], this.castleFlags[c][3]].includes(move.start.y)
    ) {
      const flagIdx = (move.start.y == this.castleFlags[c][0] ? 0 : 3);
      this.castleFlags[c][flagIdx] = 8;
    } else if (
      move.end.x == oppFirstRank && //we took opponent rook?
      [this.castleFlags[oppCol][0], this.castleFlags[oppCol][3]]
        .includes(move.end.y)
    ) {
      const flagIdx = (move.end.y == this.castleFlags[oppCol][0] ? 0 : 3);
      this.castleFlags[oppCol][flagIdx] = 8;
    }
  }

};
