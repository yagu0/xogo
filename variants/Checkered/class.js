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

  static GetColorClass(c) {
    if (c == 'c')
      return "checkered";
    return C.GetColorClass(c);
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

  genRandInitBaseFen() {
    let res = super.genRandInitBaseFen();
    res.o.flags += "1".repeat(16); //pawns flags
    return res;
  }

  getPartFen(o) {
    return Object.assign(
      {
        "cmove": o.init ? "-" : this.getCmoveFen(),
        "stage": o.init ? "1" : this.getStageFen()
      },
      super.getPartFen(o)
    );
  }

  getCmoveFen() {
    if (!this.cmove)
      return "-";
    return (
      C.CoordsToSquare(this.cmove.start) + C.CoordsToSquare(this.cmove.end)
    );
  }

  getStageFen() {
    return (this.stage + this.sideCheckered);
  }

  getFlagsFen() {
    let fen = super.getFlagsFen();
    // Add pawns flags
    for (let c of ["w", "b"]) {
      for (let i = 0; i < 8; i++)
        fen += (this.pawnFlags[c][i] ? "1" : "0");
    }
    return fen;
  }

  getPawnShift(color) {
    return super.getPawnShift(color == 'c' ? this.turn : color);
  }

  getOppCols(color) {
    if (this.stage == 1)
      return super.getOppCols(color).concat(['c']);
    // Stage 2: depends if color is w+b or checkered
    if (color == this.sideCheckered)
      return ['w', 'b'];
    return ['c'];
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
    this.sideCheckered = (this.stage == 2 ? stageInfo[1] : "");
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
      return {start: move.start, end: move.end};
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
    const piece = this.getPiece(x, y);
    // King is treated differently: it never turn checkered
    if (piece == 'k' && this.stage == 1) {
      // If at least one checkered piece, allow switching:
      if (
        this.options["withswitch"] &&
        this.board.some(b => b.some(cell => cell[0] == 'c'))
      ) {
        const oppKingPos = this.searchKingPos(C.GetOppTurn(this.turn))[0];
        moves.push(
          new Move({
            start: { x: x, y: y },
            end: {x: oppKingPos[0], y: oppKingPos[1]},
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
        if (m.vanish.length > 0 && m.vanish[0].p == 'p') {
          if (
            Math.abs(m.end.x - m.start.x) == 2 &&
            !this.pawnFlags[this.turn][m.start.y]
          ) {
            return false; //forbidden 2-squares jumps
          }
          if (
            this.board[m.end.x][m.end.y] == "" &&
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
      if (m.vanish.length == 2 && m.appear.length == 1) {
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

  canIplay(x, y) {
    if (this.stage == 2) {
      const color = this.getColor(x, y);
      return (
        this.turn == this.sideCheckered
          ? color == 'c'
          : ['w', 'b'].includes(color)
      );
    }
    return (
      this.playerColor == this.turn &&
      [this.turn, "c"].includes(this.getColor(x, y))
    );
  }

  // Does m2 un-do m1 ? (to disallow undoing checkered moves)
  oppositeMoves(m1, m2) {
    return (
      !!m1 &&
      m2.appear.length == 1 &&
      m2.vanish.length == 1 &&
      m2.appear[0].c == "c" &&
      m1.start.x == m2.end.x &&
      m1.end.x == m2.start.x &&
      m1.start.y == m2.end.y &&
      m1.end.y == m2.start.y
    );
  }

  filterValid(moves) {
    const color = this.turn;
    if (this.stage == 2 && this.sideCheckered == color)
      // Checkered cannot be under check (no king)
      return moves;
    let kingPos = super.searchKingPos(color);
    if (this.stage == 2)
      // Must consider both kings (attacked by checkered side)
      kingPos = [kingPos, super.searchKingPos(C.GetOppTurn(this.turn))];
    const oppCols = this.getOppCols(color);
    return moves.filter(m => {
      this.playOnBoard(m);
      let res = true;
      if (this.stage == 1)
        res = !this.oppositeMoves(this.cmove, m);
      if (res && m.appear.length > 0)
        res = !this.underCheck(kingPos, oppCols);
      this.undoOnBoard(m);
      return res;
    });
  }

  atLeastOneMove(color) {
    const myCols = [color, 'c'];
    for (let i = 0; i < this.size.x; i++) {
      for (let j = 0; j < this.size.y; j++) {
        const colIJ = this.getColor(i, j);
        if (
          this.board[i][j] != "" &&
          (
            (this.stage == 1 && myCols.includes(colIJ)) ||
            (this.stage == 2 &&
              (
                (this.sideCheckered == color && colIJ == 'c') ||
                (this.sideCheckered != color && ['w', 'b'].includes(colIJ))
              )
            )
          )
        ) {
          const moves = this.getPotentialMovesFrom([i, j]);
          if (moves.some(m => this.filterValid([m]).length >= 1))
            return true;
        }
      }
    }
    return false;
  }

  underCheck(square_s, oppCols) {
    if (this.stage == 2 && oppCol != this.sideCheckered)
      return false; //checkered pieces is me, I'm not under check
    return square_s.some(sq => super.underAttack(sq, oppCols));
  }

  prePlay(move) {
    if (move.appear.length > 0 && move.vanish.length > 0) {
      super.prePlay(move);
      if (
        [1, 6].includes(move.start.x) &&
        move.vanish[0].p == 'p' &&
        Math.abs(move.end.x - move.start.x) == 2
      ) {
        // This move turns off a 2-squares pawn flag
        this.pawnFlags[move.start.x == 6 ? "w" : "b"][move.start.y] = false;
      }
    }
  }

  postPlay(move) {
    if (move.appear.length == 0 && move.vanish.length == 0) {
      this.stage = 2;
      this.sideCheckered = this.turn;
    }
    else
      super.postPlay(move);
    this.cmove = this.getCmove(move);
  }

  tryChangeTurn(move) {
    if (move.appear.length > 0 && move.vanish.length > 0)
      super.tryChangeTurn(move);
  }

  getCurrentScore() {
    const color = this.turn;
    if (this.stage == 1) {
      if (this.atLeastOneMove(color))
        return "*";
      // Artifically change turn, for checkered pawns
      const oppTurn = C.GetOppTurn(color);
      this.turn = oppTurn;
      const kingPos = super.searchKingPos(color)[0];
      let res = "1/2";
      if (super.underAttack(kingPos, [oppTurn, 'c']))
        res = (color == "w" ? "0-1" : "1-0");
      this.turn = color;
      return res;
    }
    // Stage == 2:
    if (this.sideCheckered == color) {
      // Check if remaining checkered pieces: if none, I lost
      if (this.board.some(b => b.some(cell => cell[0] == 'c'))) {
        if (!this.atLeastOneMove(color))
          return "1/2";
        return "*";
      }
      return (color == 'w' ? "0-1" : "1-0");
    }
    if (this.atLeastOneMove(color))
      return "*";
    let res = super.underAttack(super.searchKingPos(color)[0], ['c']);
    if (!res)
      res = super.underAttack(super.searchKingPos(oppCol)[0], ['c']);
    if (res)
      return (color == 'w' ? "0-1" : "1-0");
    return "1/2";
  }

};
