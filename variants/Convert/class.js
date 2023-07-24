import ChessRules from "/base_rules.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export default class ConvertRules extends ChessRules {

  // TODO
  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: [
        "atomic", "cannibal", "capture", "cylinder",
        "dark", "madrasi", "rifle", "teleport"
      ]
    };
  }

  get hasEnpassant() {
    return false;
  }

  setOtherVariables(fenParsed, pieceArray) {
    super.setOtherVariables(fenParsed, pieceArray);
    // Stack of "last move" only for intermediate chaining
    this.lastMoveEnd = [null];
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
    const lm = this.lastMoveEnd[L-1];
    const piece = (!!lm ? lm.p : null);
    const c = this.turn;
    if (this.board[ex][ey] == "") {
      if (piece && !tr)
        tr = {c: c, p: piece};
      let mv = super.getBasicMove([sx, sy], [ex, ey], tr);
      if (piece)
        mv.vanish.pop();
      return mv;
    }
    // Capture: initial, or inside a chain
    const initPiece = (piece || this.getPiece(sx, sy));
    const oppCol = C.GetOppTurn(c);
    const oppPiece = this.getPiece(ex, ey);
    let mv = new Move({
      start: {x: sx, y: sy},
      end: {x: ex, y: ey},
      appear: [
        new PiPo({
          x: ex,
          y: ey,
          c: c,
          p: (!!tr ? tr.p : initPiece)
        })
      ],
      vanish: [
        new PiPo({
          x: ex,
          y: ey,
          c: oppCol,
          p: oppPiece
        })
      ]
    });
    if (!piece) {
      // Initial capture
      mv.vanish.unshift(
        new PiPo({
          x: sx,
          y: sy,
          c: c,
          p: initPiece
        })
      );
    }
    return mv;
  }

// TODO from here

  getPotentialMovesFrom([x, y], asA) {
    const L = this.lastMoveEnd.length;
    if (!!this.lastMoveEnd[L-1]) {
      if (x != this.lastMoveEnd[L-1].x || y != this.lastMoveEnd[L-1].y)
        // A capture was played: wrong square
        return [];
      asA = this.lastMoveEnd[L-1].p;
    }
    switch (asA || this.getPiece(x, y)) {
      case V.PAWN: return super.getPotentialPawnMoves([x, y]);
      case V.ROOK: return super.getPotentialRookMoves([x, y]);
      case V.KNIGHT: return super.getPotentialKnightMoves([x, y]);
      case V.BISHOP: return super.getPotentialBishopMoves([x, y]);
      case V.QUEEN: return super.getPotentialQueenMoves([x, y]);
      case V.KING: return super.getPotentialKingMoves([x, y]);
    }
    return [];
  }

  getPossibleMovesFrom(sq) {
    const L = this.lastMoveEnd.length;
    let asA = undefined;
    if (!!this.lastMoveEnd[L-1]) {
      if (
        sq[0] != this.lastMoveEnd[L-1].x ||
        sq[1] != this.lastMoveEnd[L-1].y
      ) {
        return [];
      }
      asA = this.lastMoveEnd[L-1].p;
    }
    return this.filterValid(this.getPotentialMovesFrom(sq, asA));
  }

  isAttacked_aux([x, y], color, explored) {
    if (explored.some(sq => sq[0] == x && sq[1] == y))
      // Start of an infinite loop: exit
      return false;
    explored.push([x, y]);
    if (super.isAttacked([x, y], color)) return true;
    // Maybe indirect "chaining" attack:
    const myColor = this.turn
    let res = false;
    let toCheck = []; //check all but king (no need)
    // Pawns:
    const shiftToPawn = (myColor == 'w' ? -1 : 1);
    for (let yShift of [-1, 1]) {
      const [i, j] = [x + shiftToPawn, y + yShift];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        // NOTE: no need to check color (no enemy pawn can take directly)
        this.getPiece(i, j) == V.PAWN
      ) {
        toCheck.push([i, j]);
      }
    }
    // Knights:
    V.steps[V.KNIGHT].forEach(s => {
      const [i, j] = [x + s[0], y + s[1]];
      if (
        V.OnBoard(i, j) &&
        this.board[i][j] != V.EMPTY &&
        this.getPiece(i, j) == V.KNIGHT
      ) {
        toCheck.push([i, j]);
      }
    });
    // Sliders:
    V.steps[V.ROOK].concat(V.steps[V.BISHOP]).forEach(s => {
      let [i, j] = [x + s[0], y + s[1]];
      while (V.OnBoard(i, j) && this.board[i][j] == V.EMPTY) {
        i += s[0];
        j += s[1];
      }
      if (!V.OnBoard(i, j)) return;
      const piece = this.getPiece(i, j);
      if (
        piece == V.QUEEN ||
        (piece == V.ROOK && (s[0] == 0 || s[1] == 0)) ||
        (piece == V.BISHOP && (s[0] != 0 && s[1] != 0))
      ) {
        toCheck.push([i, j]);
      }
    });
    for (let ij of toCheck) {
      if (this.isAttacked_aux(ij, color, explored)) return true;
    }
    return false;
  }

  isAttacked([x, y], color) {
    let explored = [];
    return this.isAttacked_aux([x, y], color, explored);
  }

  filterValid(moves) {
    // No "checks" (except to forbid castle)
    return moves;
  }

  prePlay(move) {
    const c = this.turn;
    // Extra conditions to avoid tracking converted kings:
    if (
      move.appear[0].p == V.KING &&
      move.vanish.length >= 1 &&
      move.vanish[0].p == V.KING
    ) {
      this.kingPos[c][0] = move.appear[0].x;
      this.kingPos[c][1] = move.appear[0].y;
    }
  }

  play(move) {
    this.prePlay(move);
    const c = this.turn;
    move.flags = JSON.stringify(this.aggregateFlags());
    V.PlayOnBoard(this.board, move);
    if (!move.end.converted) {
      // Not a capture: change turn
      this.turn = V.GetOppCol(this.turn);
      this.movesCount++;
      this.lastMoveEnd.push(null);
    }
    else {
      this.lastMoveEnd.push(
        Object.assign({}, move.end, { p: move.end.converted })
      );
    }
    super.updateCastleFlags(move, move.appear[0].p, c);
  }

};
