import ChessRules from "/base_rules.js";
import { ArrayFun } from "/utils/array.js";

export default class AliceRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: [
        "balance",
        "capture",
        "cylinder",
        "dark",
        "doublemove",
        "progressive",
        "zen"
      ]
    };
  }

  // To the other side of the mirror and back...
  static get ALICE_PIECES() {
    return {
      s: "p",
      u: "r",
      o: "n",
      c: "b",
      t: "q",
      l: "k"
    };
  }
  static get ALICE_CODES() {
    return {
      p: "s",
      r: "u",
      n: "o",
      b: "c",
      q: "t",
      k: "l"
    };
  }

  getPieceType(x, y, p) {
    if (!p)
      p = super.getPiece(x, y);
    return V.ALICE_PIECES[p] || p;
  }

  pieces(color, x, y) {
    let alices = {
      's': {"class": "alice-pawn", "moveas": "p"},
      'u': {"class": "alice-rook", "moveas": "r"},
      'o': {"class": "alice-knight", "moveas": "n"},
      'c': {"class": "alice-bishop", "moveas": "b"},
      't': {"class": "alice-queen", "moveas": "q"},
      'l': {"class": "alice-king", "moveas": "k"}
    };
    return Object.assign(alices, super.pieces(color, x, y));
  }

  fromSameWorld(p1, p2) {
    return (
      (V.ALICE_PIECES[p1] && V.ALICE_PIECES[p2]) ||
      (V.ALICE_CODES[p1] && V.ALICE_CODES[p2])
    );
  }

  // Step of p over i,j ?
  canStepOver(i, j, p) {
    return (
      this.board[i][j] == "" || !this.fromSameWorld(this.getPiece(i, j), p));
  }

  // NOTE: castle & enPassant
  // https://www.chessvariants.com/other.dir/alice.html
  getPotentialMovesFrom([x, y]) {
    return super.getPotentialMovesFrom([x, y]).filter(m => {
      // Remove moves landing on occupied square on other board
      return (
        this.board[m.end.x][m.end.y] == "" ||
        this.fromSameWorld(m.vanish[0].p, m.vanish[1].p)
      );
    }).map(m => {
      // Apply Alice rule: go to the other side of the mirror
      if (Object.keys(V.ALICE_CODES).includes(m.vanish[0].p))
        // Board 1
        m.appear.forEach(a => a.p = V.ALICE_CODES[a.p])
      else
        // Board 2
        m.appear.forEach(a => a.p = V.ALICE_PIECES[a.p])
      return m;
    });
  }

  isKing(symbol) {
    return ['k', 'l'].includes(symbol);
  }

  getCurrentScore() {
    const color = this.turn;
    const inCheck = this.underCheck(this.searchKingPos(color));
    let someLegalMove = false;
    // Search for legal moves: if any is found and
    // does not change king world (if under check), then game not over.
    for (let i=0; i<this.size.x; i++) {
      for (let j=0; j<this.size.y; j++) {
        if (this.getColor(i, j) == color) {
          const moves = this.filterValid(this.getPotentialMovesFrom([i, j]));
          if (
            moves.length >= 1 &&
            (
              !inCheck ||
              moves.some(m => m.vanish.every(v => !this.isKing(v.p)))
            )
          ) {
            return "*";
          }
        }
      }
    }
    // Couldn't find any legal move
    return (inCheck ? "1/2" : (color == 'w' ? "0-1" : "1-0"));
  }

};
