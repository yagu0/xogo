import ChessRules from "/base_rules.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export default class ConvertRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      styles: ["cylinder", "dark", "recycle", "teleport"]
    };
  }

  get hasEnpassant() {
    return false;
  }

  setOtherVariables(fenParsed, pieceArray) {
    super.setOtherVariables(fenParsed, pieceArray);
    // Stack of "last move" only for intermediate chaining
    this.lastMoveEnd = [];
  }

  genRandInitBaseFen() {
    const baseFen = super.genRandInitBaseFen();
    return {
      fen: baseFen.fen.replace("pppppppp/8", "8/pppppppp")
                      .replace("8/PPPPPPPP", "PPPPPPPP/8"),
      o: baseFen.o
    };
  }

  getBasicMove([sx, sy], [ex, ey], tr) {
    const L = this.lastMoveEnd.length;
    const piece = (L >= 1 ? this.lastMoveEnd[L-1].p : null);
    if (this.board[ex][ey] == "") {
      if (piece && !tr)
        tr = {c: this.turn, p: piece};
      let mv = super.getBasicMove([sx, sy], [ex, ey], tr);
      if (piece)
        mv.vanish.pop(); //end of a chain: initial piece remains
      return mv;
    }
    // Capture: initial, or inside a chain
    const initPiece = (piece || this.getPiece(sx, sy)),
          destPiece = this.getPiece(ex, ey);
    let mv = new Move({
      start: {x: sx, y: sy},
      end: {x: ex, y: ey},
      appear: [
        new PiPo({
          x: ex,
          y: ey,
          c: this.turn,
          p: (!!tr ? tr.p : initPiece)
        })
      ],
      vanish: [
        new PiPo({
          x: ex,
          y: ey,
          c: C.GetOppTurn(this.turn),
          p: destPiece
        })
      ]
    });
    if (!piece) {
      // Initial capture
      mv.vanish.unshift(
        new PiPo({
          x: sx,
          y: sy,
          c: this.turn,
          p: initPiece
        })
      );
    }
    mv.converted = destPiece; //easier (no need to detect it)
//    mv.drag = {c: this.turn, p: initPiece}; //TODO: doesn't work
    return mv;
  }

  getPiece(x, y) {
    const L = this.lastMoveEnd.length;
    if (L >= 1 && this.lastMoveEnd[L-1].x == x && this.lastMoveEnd[L-1].y == y)
      return this.lastMoveEnd[L-1].p;
    return super.getPiece(x, y);
  }

  getPotentialMovesFrom([x, y], color) {
    const L = this.lastMoveEnd.length;
    if (
      L >= 1 &&
      (x != this.lastMoveEnd[L-1].x || y != this.lastMoveEnd[L-1].y)
    ) {
      // A capture was played: wrong square
      return [];
    }
    return super.getPotentialMovesFrom([x, y], color);
  }

  underAttack_aux([x, y], color, explored) {
    if (explored.some(sq => sq[0] == x && sq[1] == y))
      // Start of an infinite loop: exit
      return false;
    explored.push([x, y]);
    if (super.underAttack([x, y], [color]))
      return true;
    // Maybe indirect "chaining" attack:
    const myColor = this.turn;
    let res = false;
    let toCheck = []; //check all but king (no need)
    // Pawns:
    const shiftToPawn = (myColor == 'w' ? -1 : 1);
    for (let yShift of [-1, 1]) {
      const [i, j] = [x + shiftToPawn, y + yShift];
      if (
        this.onBoard(i, j) &&
        this.board[i][j] != "" &&
        // NOTE: no need to check color (no enemy pawn can take directly)
        this.getPiece(i, j) == 'p'
      ) {
        toCheck.push([i, j]);
      }
    }
    // Knights:
    this.pieces()['n'].both[0].steps.forEach(s => {
      const [i, j] = [x + s[0], y + s[1]];
      if (
        this.onBoard(i, j) &&
        this.board[i][j] != "" &&
        this.getPiece(i, j) == 'n'
      ) {
        toCheck.push([i, j]);
      }
    });
    // Sliders:
    this.pieces()['q'].both[0].steps.forEach(s => {
      let [i, j] = [x + s[0], y + s[1]];
      while (this.onBoard(i, j) && this.board[i][j] == "") {
        i += s[0];
        j += s[1];
      }
      if (!this.onBoard(i, j))
        return;
      const piece = this.getPiece(i, j);
      if (
        piece == 'q' ||
        (piece == 'r' && (s[0] == 0 || s[1] == 0)) ||
        (piece == 'b' && (s[0] != 0 && s[1] != 0))
      ) {
        toCheck.push([i, j]);
      }
    });
    for (let ij of toCheck) {
      if (this.underAttack_aux(ij, color, explored))
        return true;
    }
    return false;
  }

  underAttack([x, y], [color]) {
    let explored = [];
    return this.underAttack_aux([x, y], color, explored);
  }

  filterValid(moves) {
    // No "checks" (except to forbid castle)
    return moves;
  }

  isLastMove(move) {
    return !move.converted;
  }

  postPlay(move) {
    super.postPlay(move);
    if (!!move.converted) {
      this.lastMoveEnd.push({
        x: move.end.x,
        y: move.end.y,
        p: move.converted
      });
    }
    else
      this.lastMoveEnd = [];
  }

};
