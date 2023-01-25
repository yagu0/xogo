import ChessRules from "/base_rules.js";
import {ArrayFun} from "/utils/array.js";

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

  isKing(x, y, p) {
    if (!p)
      p = this.getPiece(x, y);
    return ['k', 'l'].includes(p);
  }

  pieces(color, x, y) {
    let alices = {
      's': {"class": "alice-pawn", moveas: 'p'},
      'u': {"class": "alice-rook", moveas: 'r'},
      'o': {"class": "alice-knight", moveas: 'n'},
      'c': {"class": "alice-bishop", moveas: 'b'},
      't': {"class": "alice-queen", moveas: 'q'},
      'l': {"class": "alice-king", moveas: 'k'}
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

  // helper for filterValid
  toggleWorld(x, y) {
    const piece = this.getPiece(x, y);
    if (V.ALICE_PIECES[piece])
      // From the other side of the mirror
      this.board[x][y] = this.getColor(x, y) + V.ALICE_PIECES[piece];
    else
      // From the other other side :)
      this.board[x][y] = this.getColor(x, y) + V.ALICE_CODES[piece];
  }

  filterValid(moves) {
    const color = this.turn;
    const oppCol = C.GetOppTurn(color);
    const kingPos = this.searchKingPos(color)[0];
    const kingPiece = this.getPiece(kingPos[0], kingPos[1]);
    return super.filterValid(moves).filter(m => {
      // A move must also be legal on the board it is played:
      // Shortcut if the moving piece and king are on different sides
      if (
        !this.isKing(0, 0, m.vanish[0].p) &&
        !this.fromSameWorld(kingPiece, m.vanish[0].p)
      ) {
        return true;
      }
      this.playOnBoard(m);
      m.appear.forEach(a => this.toggleWorld(a.x, a.y));
      const kingAppear = m.appear.find(a => this.isKing(0, 0, a.p));
      const target = [kingAppear ? [kingAppear.x, kingAppear.y] : kingPos];
      const res = this.underCheck(target, oppCol);
      m.appear.forEach(a => this.toggleWorld(a.x, a.y));
      this.undoOnBoard(m);
      return !res;
    });
  }

};
