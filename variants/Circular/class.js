import ChessRules from "/base_rules.js";
import {FenUtil} from "/utils/setupPieces.js";

export default class CircularRules extends ChessRules {

  get hasCastle() {
    return false;
  }
  get hasEnpassant() {
    return false;
  }

  // Everypawn is going up!
  getPawnShift(color) {
    return -1;
  }
  isPawnInitRank(x, color) {
    return (color == 'w' && x == 6) || (color == 'b' && x == 2);
  }

  get flippedBoard() {
    return false;
  }

  // Circular board:
  getX(x) {
    let res = x % this.size.x;
    if (res < 0)
      res += this.size.x;
    return res;
  }

  // TODO: rewrite in more elegant way
  getFlagsFen() {
    let flags = "";
    for (let c of ["w", "b"]) {
      for (let i = 0; i < 8; i++)
        flags += this.pawnFlags[c][i] ? "1" : "0";
    }
    return flags;
  }

  setFlags(fenflags) {
    this.pawnFlags = {
      w: [...Array(8)], //pawns can move 2 squares?
      b: [...Array(8)]
    };
    for (let c of ["w", "b"]) {
      for (let i = 0; i < 8; i++)
        this.pawnFlags[c][i] = fenflags.charAt((c == "w" ? 0 : 8) + i) == "1";
    }
  }

  genRandInitBaseFen() {
    let setupOpts = {
      randomness: this.options["randomness"],
      diffCol: ['b']
    };
    const s = FenUtil.setupPieces(
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'], setupOpts);
    return {
      fen: "8/8/pppppppp/" + s.b.join("") + "/8/8/PPPPPPPP/" +
           s.w.join("").toUpperCase(),
      o: {flags: "11111111"}
    };
  }

  filterValid(moves) {
    const filteredMoves = super.filterValid(moves);
    // If at least one full move made, everything is allowed:
    if (this.movesCount >= 2)
      return filteredMoves;
    // Else, forbid checks:
    const oppCol = C.GetOppTurn(this.turn);
    const oppKingPos = this.searchKingPos(oppCol);
    return filteredMoves.filter(m => {
      this.playOnBoard(m);
      const res = !this.underCheck(oppKingPos, [this.turn]);
      this.undoOnBoard(m);
      return res;
    });
  }

  prePlay(move) {
    if (move.appear.length > 0 && move.vanish.length > 0) {
      super.prePlay(move);
      if (
        [2, 6].includes(move.start.x) &&
        move.vanish[0].p == 'p' &&
        Math.abs(move.end.x - move.start.x) == 2
      ) {
        // This move turns off a 2-squares pawn flag
        this.pawnFlags[move.start.x == 6 ? "w" : "b"][move.start.y] = false;
      }
    }
  }

};
