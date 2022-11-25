import ChessRules from "/base_rules.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export default class CheckeredRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: [
        {
          label: "Allow switching",
          variable: "withswitch",
          type: "checkbox",
          defaut: false
        }
      ],
      styles: [
        "balance",
        "capture",
        "cylinder",
        "doublemove",
        "madrasi",
        "progressive",
        "recycle",
        "teleport"
      ]
    };
  }

  static board2fen(b) {
    const checkered_codes = {
      p: "s",
      q: "t",
      r: "u",
      b: "c",
      n: "o"
    };
    if (b[0] == "c")
      return checkered_codes[b[1]];
    return super.board2fen(b);
  }

  static fen2board(f) {
    // Tolerate upper-case versions of checkered pieces (why not?)
    const checkered_pieces = {
      s: "p",
      S: "p",
      t: "q",
      T: "q",
      u: "r",
      U: "r",
      c: "b",
      C: "b",
      o: "n",
      O: "n"
    };
    if (Object.keys(checkered_pieces).includes(f))
      return "c" + checkered_pieces[f];
    return super.fen2board(f);
  }

  pieces(color, x, y) {
    let baseRes = super.pieces(color, x, y);
    if (
      this.getPiece(x, y) == 'p' &&
      this.stage == 2 &&
      this.getColor(x, y) == 'c'
    ) {
      // Checkered pawns on stage 2 are bidirectional
      const initRank = ((color == 'w' && x >= 6) || (color == 'b' && x <= 1));
      baseRes['p'] = {
        "class": "pawn",
        moves: [
          {
            steps: [[1, 0], [-1, 0]],
            range: (initRank ? 2 : 1)
          }
        ],
        attack: [
          {
            steps: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
            range: 1
          }
        ]
      };
    }
    const checkered = {
      's': {"class": "checkered-pawn", moveas: 'p'},
      'u': {"class": "checkered-rook", moveas: 'r'},
      'o': {"class": "checkered-knight", moveas: 'n'},
      'c': {"class": "checkered-bishop", moveas: 'b'},
      't': {"class": "checkered-queen", moveas: 'q'}
    };
    return Object.assign(baseRes, checkered);
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    // Non-capturing last checkered move (if any)
    const cmove = fenParsed.cmove;
    if (cmove == "-") this.cmove = null;
    else {
      this.cmove = {
        start: C.SquareToCoords(cmove.substr(0, 2)),
        end: C.SquareToCoords(cmove.substr(2))
      };
    }
    // Stage 1: as Checkered2. Stage 2: checkered pieces are autonomous
    const stageInfo = fenParsed.stage;
    this.stage = parseInt(stageInfo[0], 10);
    this.canSwitch = (this.stage == 1 && stageInfo[1] != '-');
    this.sideCheckered = (this.stage == 2 ? stageInfo[1] : undefined);
  }

  setFlags(fenflags) {
    super.setFlags(fenflags); //castleFlags
    this.pawnFlags = {
      w: [...Array(8)], //pawns can move 2 squares?
      b: [...Array(8)]
    };
    const flags = fenflags.substr(4); //skip first 4 letters, for castle
    for (let c of ["w", "b"]) {
      for (let i = 0; i < 8; i++)
        this.pawnFlags[c][i] = flags.charAt((c == "w" ? 0 : 8) + i) == "1";
    }
  }

  aggregateFlags() {
    return [this.castleFlags, this.pawnFlags];
  }

  disaggregateFlags(flags) {
    this.castleFlags = flags[0];
    this.pawnFlags = flags[1];
  }

  getEpSquare(moveOrSquare) {
    // At stage 2, all pawns can be captured en-passant
    if (
      this.stage == 2 ||
      typeof moveOrSquare !== "object" ||
      (moveOrSquare.appear.length > 0 && moveOrSquare.appear[0].c != 'c')
    )
      return super.getEpSquare(moveOrSquare);
    // Checkered or switch move: no en-passant
    return undefined;
  }

  getCmove(move) {
    // No checkered move to undo at stage 2:
    if (this.stage == 1 && move.vanish.length == 1 && move.appear[0].c == "c")
      return { start: move.start, end: move.end };
    return null;
  }

  canTake([x1, y1], [x2, y2]) {
    const color1 = this.getColor(x1, y1);
    const color2 = this.getColor(x2, y2);
    if (this.stage == 2) {
      // Black & White <-- takes --> Checkered
      const color1 = this.getColor(x1, y1);
      const color2 = this.getColor(x2, y2);
      return color1 != color2 && [color1, color2].includes('c');
    }
    return (
      color1 != color2 &&
      color2 != "c" && //checkered aren't captured
      (color1 != "c" || color2 != this.turn)
    );
  }

  postProcessPotentialMoves(moves) {
    if (this.stage == 2 || moves.length == 0)
      return moves;
    const color = this.turn;
    // Apply "checkerization" of standard moves
    const lastRank = (color == "w" ? 0 : 7);
    const [x, y] = [moves[0].start.x, moves[0].start.y];
    let moves = [];
    const piece = this.getPiece(x, y);
    // King is treated differently: it never turn checkered
    if (piece == 'k') {
      // If at least one checkered piece, allow switching:
      if (
        this.canSwitch && !noswitch &&
        this.board.some(b => b.some(cell => cell[0] == 'c'))
      ) {
        const oppCol = C.GetOppCol(color);
        const oppKingPos = this.searchKingPos(oppCol)[0];
        moves.push(
          new Move({
            start: { x: x, y: y },
            end: { x: oppKingPos[0], y: oppKingPos[1] },
            appear: [],
            vanish: []
          })
        );
      }
      return moves;
    }
    if (piece == 'p') {
      // Filter out forbidden pawn moves
      moves = moves.filter(m => {
        if (m.vanish[0].p == 'p') {
          if (
            Math.abs(m.end.x - m.start.x) == 2 &&
            !this.pawnFlags[this.turn][m.start.y]
          ) {
            return false; //forbidden 2-squares jumps
          }
          if (
            this.board[m.end.x][m.end.y] == V.EMPTY &&
            m.vanish.length == 2 &&
            this.getColor(m.start.x, m.start.y) == "c"
          ) {
            return false; //checkered pawns cannot take en-passant
          }
        }
        return true;
      });
    }
    let extraMoves = [];
    moves.forEach(m => {
      if (m.vanish.length == 2 && m.appear.length == 1)
        // A capture occured
        m.appear[0].c = "c";
        if (
          m.appear[0].p != m.vanish[1].p &&
          // No choice if promotion:
          (m.vanish[0].p != 'p' || m.end.x != lastRank)
        ) {
          // Add transformation into captured piece
          let m2 = JSON.parse(JSON.stringify(m));
          m2.appear[0].p = m.vanish[1].p;
          extraMoves.push(m2);
        }
      }
    });
    return moves.concat(extraMoves);
  }

  canIplay(side, [x, y]) {
    if (this.stage == 2) {
      const color = this.getColor(x, y);
      return (
        this.turn == this.sideCheckered
          ? color == 'c'
          : ['w', 'b'].includes(color)
      );
    }
    return side == this.turn && [side, "c"].includes(this.getColor(x, y));
  }

  // Does m2 un-do m1 ? (to disallow undoing checkered moves)
  oppositeMoves(m1, m2) {
    return (
      !!m1 &&
      m2.appear[0].c == "c" &&
      m2.appear.length == 1 &&
      m2.vanish.length == 1 &&
      m1.start.x == m2.end.x &&
      m1.end.x == m2.start.x &&
      m1.start.y == m2.end.y &&
      m1.end.y == m2.start.y
    );
  }

  // TODO: adapt, merge
  filterValid(moves) {
    if (moves.length == 0)
      return [];
    const color = this.turn;
    const oppCol = C.GetOppCol(color);
    return moves.filter(m => {
      // Checkered cannot be under check (no king)
      if (stage == 2 && this.sideCheckered == color)
        return true;
      this.playOnBoard(m);
      let res = true;
      if (stage == 1) {
        if (m.appear.length == 0 && m.vanish.length == 0) {
          // Special "switch" move: kings must not be attacked by checkered.
          // Not checking for oppositeMoves here: checkered are autonomous
          res = (
            !this.isAttacked(this.kingPos['w'], ['c']) &&
            !this.isAttacked(this.kingPos['b'], ['c']) &&
            this.getAllPotentialMoves().length > 0
          );
        }
        else res = !this.oppositeMoves(this.cmove, m);
      }
      if (res && m.appear.length > 0) res = !this.underCheck(color);
      // At stage 2, side with B & W can be undercheck with both kings:
      if (res && stage == 2) res = !this.underCheck(oppCol);
      this.undo(m);
      return res;
    });
  }

  atLeastOneMove() {
    const color = this.turn;
    const oppCol = V.GetOppCol(color);
    for (let i = 0; i < V.size.x; i++) {
      for (let j = 0; j < V.size.y; j++) {
        const colIJ = this.getColor(i, j);
        if (
          this.board[i][j] != V.EMPTY &&
          (
            (this.stage == 1 && colIJ != oppCol) ||
            (this.stage == 2 &&
              (
                (this.sideCheckered == color && colIJ == 'c') ||
                (this.sideCheckered != color && ['w', 'b'].includes(colIJ))
              )
            )
          )
        ) {
          const moves = this.getPotentialMovesFrom([i, j]);
          if (moves.length > 0) {
            for (let k = 0; k < moves.length; k++)
              if (this.filterValid([moves[k]]).length > 0) return true;
          }
        }
      }
    }
    return false;
  }

  // TODO: adapt
  underCheck(color) {
    if (this.stage == 1)
      return this.isAttacked(this.kingPos[color], [V.GetOppCol(color), "c"]);
    if (color == this.sideCheckered) return false;
    return (
      this.isAttacked(this.kingPos['w'], ["c"]) ||
      this.isAttacked(this.kingPos['b'], ["c"])
    );
  }

  play(move) {
    move.flags = JSON.stringify(this.aggregateFlags());
    this.epSquares.push(this.getEpSquare(move));
    V.PlayOnBoard(this.board, move);
    if (move.appear.length > 0 || move.vanish.length > 0)
    {
      this.turn = V.GetOppCol(this.turn);
      this.movesCount++;
    }
    this.postPlay(move);
  }

  postPlay(move) {
    if (move.appear.length == 0 && move.vanish.length == 0) {
      this.stage = 2;
      this.sideCheckered = this.turn;
    }
    else {
      const c = move.vanish[0].c;
      const piece = move.vanish[0].p;
      if (piece == V.KING) {
        this.kingPos[c][0] = move.appear[0].x;
        this.kingPos[c][1] = move.appear[0].y;
      }
      super.updateCastleFlags(move, piece);
      if (
        [1, 6].includes(move.start.x) &&
        move.vanish[0].p == V.PAWN &&
        Math.abs(move.end.x - move.start.x) == 2
      ) {
        // This move turns off a 2-squares pawn flag
        this.pawnFlags[move.start.x == 6 ? "w" : "b"][move.start.y] = false;
      }
    }
    this.cmove = this.getCmove(move);
  }

  getCurrentScore() {
    const color = this.turn;
    if (this.stage == 1) {
      if (this.atLeastOneMove()) return "*";
      // Artifically change turn, for checkered pawns
      this.turn = V.GetOppCol(this.turn);
      const res =
        this.isAttacked(this.kingPos[color], [V.GetOppCol(color), "c"])
          ? color == "w"
            ? "0-1"
            : "1-0"
          : "1/2";
      this.turn = V.GetOppCol(this.turn);
      return res;
    }
    // Stage == 2:
    if (this.sideCheckered == this.turn) {
      // Check if remaining checkered pieces: if none, I lost
      if (this.board.some(b => b.some(cell => cell[0] == 'c'))) {
        if (!this.atLeastOneMove()) return "1/2";
        return "*";
      }
      return color == 'w' ? "0-1" : "1-0";
    }
    if (this.atLeastOneMove()) return "*";
    let res = this.isAttacked(this.kingPos['w'], ["c"]);
    if (!res) res = this.isAttacked(this.kingPos['b'], ["c"]);
    if (res) return color == 'w' ? "0-1" : "1-0";
    return "1/2";
  }

  // TODO: adapt
  static GenRandInitFen(options) {
    const baseFen = ChessRules.GenRandInitFen(options);
    return (
      // Add 16 pawns flags + empty cmove + stage == 1:
      baseFen.slice(0, -2) + "1111111111111111 - - 1" +
      (!options["switch"] ? '-' : "")
    );
  }
      {
        cmove: fenParts[5],
        stage: fenParts[6]
      }

  getCmoveFen() {
    const L = this.cmoves.length;
    return (
      !this.cmoves[L - 1]
        ? "-"
        : ChessRules.CoordsToSquare(this.cmoves[L - 1].start) +
          ChessRules.CoordsToSquare(this.cmoves[L - 1].end)
    );
  }

  getStageFen() {
    if (this.stage == 1) return "1" + (!this.canSwitch ? '-' : "");
    // Stage == 2:
    return "2" + this.sideCheckered;
  }

  getFen() {
    return (
      super.getFen() + " " + this.getCmoveFen() + " " + this.getStageFen()
    );
  }

  getFlagsFen() {
    let fen = super.getFlagsFen();
    // Add pawns flags
    for (let c of ["w", "b"])
      for (let i = 0; i < 8; i++) fen += (this.pawnFlags[c][i] ? "1" : "0");
    return fen;
  }

};