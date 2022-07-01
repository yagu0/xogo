import ChessRules from "/base_rules.js";

export class ApocalypseRules extends ChessRules {

  static get Options() {
    return {};
  }

  get pawnPromotions() {
    return ['n', 'p'];
  }

  get size() {
    return {x: 5, y: 5};
  }

  genRandInitBaseFen() {
    return {
      fen: "npppn/p3p/5/P3P/NPPPN w 0",
      o: {"flags":"00"}
    };
  }

  getPartFen(o) {
    let parts = super.getPartFen(o);
    parts["whiteMove"] = this.whiteMove || "-";
    return parts;
  }

  getFlagsFen() {
    return (
      this.penaltyFlags['w'].toString() + this.penaltyFlags['b'].toString()
    );
  }

  setOtherVariables(fen) {
    const parsedFen = V.ParseFen(fen);
    this.setFlags(parsedFen.flags);
    // Also init whiteMove
    this.whiteMove =
      parsedFen.whiteMove != "-"
        ? JSON.parse(parsedFen.whiteMove)
        : null;
  }

  setFlags(fenflags) {
    this.penaltyFlags = {
      'w': parseInt(fenflags[0], 10),
      'b': parseInt(fenflags[1], 10)
    };
  }

  // TODO: could be a stack of 2 (pawn promote + relocation)
  getWhitemoveFen() {
    if (!this.whiteMove) return "-";
    return JSON.stringify({
      start: this.whiteMove.start,
      end: this.whiteMove.end,
      appear: this.whiteMove.appear,
      vanish: this.whiteMove.vanish
    });
  }

  // allow pawns to move diagonally and capture vertically --> only purpose illegal
  // allow capture self --> same purpose
  // ---> MARK such moves : move.illegal = true

  // simpler: allow all moves, including "capturing nothing"
  // flag every pawn capture as "illegal" (potentially)

  pieces(color, x, y) {
    const pawnShift = (color == "w" ? -1 : 1);
    return {
      'p': {
        "class": "pawn",
        moves: [
          {
            steps: [[pawnShift, 0], [pawnShift, -1], [pawnShift, 1]],
            range: 1
          }
        ],
      },
      'n': super.pieces(color, x, y)['n']
    };
  }

  canTake() {
    return true;
  }

  getPotentialMovesFrom([x, y]) {
    let moves = [];
    if (this.subTurn == 2) {
      const start = this.moveStack[0].end;
      if (x == start.x && y == start.y) {
        // Move the pawn to any empty square not on last rank (== x)
        for (let i=0; i<this.size.x; i++) {
          if (i == x)
            continue;
          for (let j=0; j<this.size.y; j++) {
            if (this.board[i][j] == "")
              moves.push(this.getBasicMove([x, y], [i, j]));
          }
        }
      }
    }
    else {
      moves = super.getPotentialMovesFrom([x, y])
      // Flag a priori illegal moves
      moves.forEach(m => {
        if (
          // Self-capture test:
          (m.vanish.length == 2 && m.vanish[1].c == m.vanish[0].c) ||
          // Pawn going diagonaly to empty square, or vertically to occupied
          (
            m.vanish[0].p == 'p' &&
            (
              (m.end.y == m.start.y && m.vanish.length == 2) ||
              (m.end.y != m.start.y && m.vanish.length == 1)
            )
          )
        ) {
          m.illegal = true;
        }
      });
    }
    return moves;
  }

  filterValid(moves) {
    // No checks:
    return moves;
  }

  // White and black (partial) moves were played: merge
  // + animate both at the same time !
  resolveSynchroneMove(move) {
    // TODO
  }

  play(move) {
    // Do not play on board (would reveal the move...)
    this.turn = V.GetOppCol(this.turn);
    this.movesCount++;
    this.postPlay(move);
  }

  postPlay(move) {
    if (pawn promotion into pawn) {
      this.curMove move; //TODO: animate both move at same time + effects AFTER !
      this.subTurn = 2
    }
    else if (this.turn == 'b')
      // NOTE: whiteMove is used read-only, so no need to copy
      this.whiteMove = move;
    }
    else {
      // A full turn just ended:
      const smove = this.resolveSynchroneMove(move);
      V.PlayOnBoard(this.board, smove); //----> ici : animate both !
      this.whiteMove = null;
    }
  }

  atLeastOneLegalMove(...) {
    // TODO
  }

  getCurrentScore() {
    if (this.turn == 'b')
      // Turn (white + black) not over yet. Could be stalemate if black cannot move (legally)
      // TODO: check. If so, return "1/2".
      return "*";
    // Count footmen: if a side has none, it loses
    let fmCount = { 'w': 0, 'b': 0 };
    for (let i=0; i<5; i++) {
      for (let j=0; j<5; j++) {
        if (this.board[i][j] != V.EMPTY && this.getPiece(i, j) == V.PAWN)
          fmCount[this.getColor(i, j)]++;
      }
    }
    if (Object.values(fmCount).some(v => v == 0)) {
      if (fmCount['w'] == 0 && fmCount['b'] == 0)
        // Everyone died
        return "1/2";
      if (fmCount['w'] == 0) return "0-1";
      return "1-0"; //fmCount['b'] == 0
    }
    // Check penaltyFlags: if a side has 2 or more, it loses
    if (Object.values(this.penaltyFlags).every(v => v == 2)) return "1/2";
    if (this.penaltyFlags['w'] == 2) return "0-1";
    if (this.penaltyFlags['b'] == 2) return "1-0";
    if (!this.atLeastOneLegalMove('w') || !this.atLeastOneLegalMove('b'))
      // Stalemate (should be very rare)
      return "1/2";
    return "*";
  }

};
