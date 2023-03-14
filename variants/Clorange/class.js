import { ChessRules, PiPo, Move } from "@/base_rules";
import { ArrayFun } from "@/utils/array";

export default class ClorangeRules extends ChessRules {

  get hasReserve() {
    return true;
  }

// TODO

  static GenRandInitFen(options) {
    // Capturing and non-capturing reserves:
    return ChessRules.GenRandInitFen(options) + " 00000000000000000000";
  }

  getFen() {
    return super.getFen() + " " + this.getReserveFen();
  }

  getFenForRepeat() {
    return super.getFenForRepeat() + "_" + this.getReserveFen();
  }

  getReserveFen() {
    return (
      Object.keys(this.reserve).map(
        c => Object.values(this.reserve[c]).join("")).join("")
    );
  }

  getEpSquare(moveOrSquare) {
    if (!moveOrSquare) return undefined;
    if (typeof moveOrSquare === "string") {
      const square = moveOrSquare;
      if (square == "-") return undefined;
      return V.SquareToCoords(square);
    }
    const move = moveOrSquare;
    const s = move.start,
          e = move.end;
    if (
      s.y == e.y &&
      Math.abs(s.x - e.x) == 2 &&
      move.vanish.length > 0 && ['p', 's'].includes(move.vanish[0].p)
    ) {
      return {
        x: (s.x + e.x) / 2,
        y: s.y
      };
    }
    return undefined;
  }

  setOtherVariables(fen) {
    super.setOtherVariables(fen);
    // Also init reserves (used by the interface to show landable pieces)
    const reserve =
      V.ParseFen(fen).reserve.split("").map(x => parseInt(x, 10));
    this.reserve = {
      w: {
        'p': reserve[0],
        'r': reserve[1],
        'n': reserve[2],
        'b': reserve[3],
        'q': reserve[4],
        's': reserve[5],
        'u': reserve[6],
        'o': reserve[7],
        'c': reserve[8],
        't': reserve[9]
      },
      b: {
        'p': reserve[10],
        'r': reserve[11],
        'n': reserve[12],
        'b': reserve[13],
        'q': reserve[14],
        's': reserve[15],
        'u': reserve[16],
        'o': reserve[17],
        'c': reserve[18],
        't': reserve[19]
      }
    };
  }

  getColor(i, j) {
    if (i >= V.size.x) return i == V.size.x ? "w" : "b";
    return this.board[i][j].charAt(0);
  }

  getPiece(i, j) {
    if (i >= V.size.x) return V.RESERVE_PIECES[j];
    return this.board[i][j].charAt(1);
  }

  getPpath(b) {
    return (V.NON_VIOLENT.includes(b[1]) ? "Clorange/" : "") + b;
  }

  getReservePpath(index, color) {
    const prefix =
      (V.NON_VIOLENT.includes(V.RESERVE_PIECES[index]) ? "Clorange/" : "");
    return prefix + color + V.RESERVE_PIECES[index];
  }

  static get NON_VIOLENT() {
    return ['s', 'u', 'o', 'c', 't'];
  }

  static get PIECES() {
    return ChessRules.PIECES.concat(V.NON_VIOLENT);
  }

  // Ordering on reserve pieces
  static get RESERVE_PIECES() {
    return V.PIECES.filter(p => p != 'k');
  }

  getReserveMoves([x, y]) {
    const color = this.turn;
    const p = V.RESERVE_PIECES[y];
    if (this.reserve[color][p] == 0) return [];
    let moves = [];
    let rank1 = 0;
    let rank2 = V.size.x - 1;
    if (['p', 's'].includes(p)) {
      if (color == 'w') rank1++;
      else rank2--;
    }
    for (let i = rank1; i <= rank2; i++) {
      for (let j = 0; j < V.size.y; j++) {
        if (this.board[i][j] == V.EMPTY) {
          let mv = new Move({
            appear: [
              new PiPo({
                x: i,
                y: j,
                c: color,
                p: p
              })
            ],
            vanish: [],
            start: { x: x, y: y }, //a bit artificial...
            end: { x: i, y: j }
          });
          moves.push(mv);
        }
      }
    }
    return moves;
  }

  getPotentialMovesFrom([x, y]) {
    if (x >= V.size.x)
      // Reserves, outside of board: x == sizeX(+1)
      return this.getReserveMoves([x, y]);
    // Standard moves
    switch (this.getPiece(x, y)) {
      case 's': return this.getPotentialPawnMoves([x, y]);
      case 'u': return super.getPotentialRookMoves([x, y]);
      case 'o': return super.getPotentialKnightMoves([x, y]);
      case 'c': return super.getPotentialBishopMoves([x, y]);
      case 't': return super.getPotentialQueenMoves([x, y]);
      default: return super.getPotentialMovesFrom([x, y]);
    }
    return []; //never reached
  }

  getPotentialPawnMoves(sq) {
    let moves = super.getPotentialPawnMoves(sq);
    if (moves.length > 0 && moves[0].vanish[0].p == 's') {
      // Remove captures for non-violent pawns:
      moves = moves.filter(m => m.vanish.length == 1);
      moves.forEach(m => {
        if (m.appear[0].p != 's') {
          // Promotion pieces should be non-violent as well:
          const pIdx = ChessRules.PIECES.findIndex(p => p == m.appear[0].p)
          m.appear[0].p = V.NON_VIOLENT[pIdx];
        }
      });
    }
    return moves;
  }

  canTake([x1, y1], [x2, y2]) {
    return (
      this.getColor(x1, y1) !== this.getColor(x2, y2) &&
      ChessRules.PIECES.includes(this.getPiece(x1, y1))
    );
  }

  getAllValidMoves() {
    let moves = super.getAllPotentialMoves();
    const color = this.turn;
    for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
      moves = moves.concat(
        this.getReserveMoves([V.size.x + (color == "w" ? 0 : 1), i])
      );
    }
    return this.filterValid(moves);
  }

  atLeastOneMove() {
    if (!super.atLeastOneMove()) {
      // Search one reserve move
      for (let i = 0; i < V.RESERVE_PIECES.length; i++) {
        let moves = this.filterValid(
          this.getReserveMoves([V.size.x + (this.turn == "w" ? 0 : 1), i])
        );
        if (moves.length > 0) return true;
      }
      return false;
    }
    return true;
  }

  prePlay(move) {
    super.prePlay(move);
    // Skip castle:
    if (move.vanish.length == 2 && move.appear.length == 2) return;
    const color = this.turn;
    if (move.vanish.length == 0) this.reserve[color][move.appear[0].p]--;
    else if (move.vanish.length == 2) {
      // Capture
      const normal = ChessRules.PIECES.includes(move.vanish[1].p);
      const pIdx =
        normal
          ? ChessRules.PIECES.findIndex(p => p == move.vanish[1].p)
          : V.NON_VIOLENT.findIndex(p => p == move.vanish[1].p);
      const rPiece = (normal ? V.NON_VIOLENT : ChessRules.PIECES)[pIdx];
      this.reserve[move.vanish[1].c][rPiece]++;
    }
  }

};
