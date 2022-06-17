import ChessRules from "/base_rules.js";
import GiveawayRules from "/variants/Giveaway/class.js";
import { ArrayFun } from "/utils/array.js";
import { Random } from "/utils/alea.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export default class ChakartRules extends ChessRules {

  static get Options() {
    return {
      select: [
        {
          label: "Randomness",
          variable: "randomness",
          defaut: 2,
          options: [
            {label: "Deterministic", value: 0},
            {label: "Symmetric random", value: 1},
            {label: "Asymmetric random", value: 2}
          ]
        }
      ]
    };
  }

  get pawnPromotions() {
    return ['q', 'r', 'n', 'b', 'k'];
  }

  get hasCastle() {
    return false;
  }
  get hasEnpassant() {
    return false;
  }

  static get IMMOBILIZE_CODE() {
    return {
      'p': 's',
      'r': 'u',
      'n': 'o',
      'b': 'c',
      'q': 't',
      'k': 'l'
    };
  }

  static get IMMOBILIZE_DECODE() {
    return {
      's': 'p',
      'u': 'r',
      'o': 'n',
      'c': 'b',
      't': 'q',
      'l': 'k'
    };
  }

  static get INVISIBLE_QUEEN() {
    return 'i';
  }

  // Fictive color 'a', bomb banana mushroom egg
  static get BOMB() {
    return 'w'; //"Wario"
  }
  static get BANANA() {
    return 'd'; //"Donkey"
  }
  static get EGG() {
    return 'e';
  }
  static get MUSHROOM() {
    return 'm';
  }

  genRandInitFen(seed) {
    const gr = new GiveawayRules(
      {mode: "suicide", options: {}, genFenOnly: true});
    return (
      gr.genRandInitFen(seed).slice(0, -17) +
      // Add Peach + Mario flags + capture counts
      '{"flags":"1111","ccount":"000000000000"}'
    );
  }

  fen2board(f) {
    return (
      f.charCodeAt() <= 90
        ? "w" + f.toLowerCase()
        : (['w', 'd', 'e', 'm'].includes(f) ? "a" : "b") + f
    );
  }

  setFlags(fenflags) {
    // King can send shell? Queen can be invisible?
    this.powerFlags = {
      w: {k: false, q: false},
      b: {k: false, q: false}
    };
    for (let c of ['w', 'b']) {
      for (let p of ['k', 'q']) {
        this.powerFlags[c][p] =
          fenflags.charAt((c == "w" ? 0 : 2) + (p == 'k' ? 0 : 1)) == "1";
      }
    }
  }

  aggregateFlags() {
    return this.powerFlags;
  }

  disaggregateFlags(flags) {
    this.powerFlags = flags;
  }

  getFen() {
    return super.getFen() + " " + this.getCapturedFen();
  }

  getFlagsFen() {
    return ['w', 'b'].map(c => {
      return ['k', 'q'].map(p => this.powerFlags[c][p] ? "1" : "0").join("");
    }).join("");
  }

  getCapturedFen() {
    const res = ['w', 'b'].map(c => Object.values(this.captured[c]));
    return res[0].concat(res[1]).join("");
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    // Initialize captured pieces' counts from FEN
    const allCapts = fenParsed.ccount.split("").map(x => parseInt(x, 10));
    const pieces = ['p', 'r', 'n', 'b', 'q', 'k'];
    this.captured = {
      w: ArrayFun.toObject(pieces, allCapts.slice(0, 6)),
      b: ArrayFun.toObject(pieces, allCapts.slice(6, 12))
    };
    this.reserve = { w: {}, b: {} }; //to be replaced by this.captured
    this.moveStack = [];
    this.egg = null;
  }

  // For Toadette bonus
  getDropMovesFrom([c, p]) {
    if (typeof c != "string" || this.reserve[c][p] == 0)
      return [];
    let moves = [];
    const start = (c == 'w' && p == 'p' ? 1 : 0);
    const end = (color == 'b' && p == 'p' ? 7 : 8);
    for (let i = start; i < end; i++) {
      for (let j = 0; j < this.size.y; j++) {
        const pieceIJ = this.getPiece(i, j);
        if (
          this.board[i][j] == "" ||
          this.getColor(i, j) == 'a' ||
          pieceIJ == V.INVISIBLE_QUEEN
        ) {
          let m = new Move({
            start: {x: c, y: p},
            end: {x: i, y: j},
            appear: [new PiPo({x: i, y: j, c: c, p: p})],
            vanish: []
          });
          // A drop move may remove a bonus (or hidden queen!)
          if (this.board[i][j] != "")
            m.vanish.push(new PiPo({x: i, y: j, c: 'a', p: pieceIJ}));
          moves.push(m);
        }
      }
    }
    return moves;
  }

  // Moving something. Potential effects resolved after playing
  getPotentialMovesFrom([x, y]) {
    let moves = [];
    if (this.egg == "toadette")
      return this.getDropMovesFrom([x, y]);
    if (this.egg == "kingboo") {
      const initPiece = this.getPiece(x, y);
      const color = this.getColor(x, y);
      const oppCol = C.GetOppCol(color);
      // Only allow to swap pieces
      for (let i=0; i<this.size.x; i++) {
        for (let j=0; j<this.size.y; j++) {
          const colIJ = this.getColor(i, j);
          const pieceIJ = this.getPiece(i, j);
          if (
            (i != x || j != y) &&
            ['w', 'b'].includes(colIJ) &&
            // Next conditions = no pawn on last rank
            (
              initPiece != 'p' ||
              (
                (color != 'w' || i != 0) &&
                (color != 'b' || i != this.size.x - 1)
              )
            )
            &&
            (
              pieceIJ != 'p' ||
              (
                (colIJ != 'w' || x != 0) &&
                (colIJ != 'b' || x != this.size.x - 1)
              )
            )
          ) {
            let m = this.getBasicMove([x, y], [i, j]);
            m.appear.push(
              new PiPo({x: x, y: y, p: this.getPiece(i, j), c: oppCol}));
            moves.push(m);
          }
        }
      }
      return moves;
    }
    // Normal case (including bonus daisy)
    switch (this.getPiece(x, y)) {
      case 'p':
        moves = this.getPawnMovesFrom([x, y]); //apply promotions
        break;
      case 'q':
        moves = this.getQueenMovesFrom([x, y]);
        break;
      case 'k':
        moves = this.getKingMovesFrom([x, y]);
        break;
      case 'n':
        moves = this.getKnightMovesFrom([x, y]);
        break;
      case 'b':
      case 'r':
        // explicitely listing types to avoid moving immobilized piece
        moves = super.getPotentialMovesFrom([x, y]);
    }
    return moves;
  }

  getPawnMovesFrom([x, y]) {
    const color = this.turn;
    const oppCol = C.GetOppCol(color);
    const shiftX = (color == 'w' ? -1 : 1);
    const firstRank = (color == "w" ? this.size.x - 1 : 0);
    let moves = [];
    if (
      this.board[x + shiftX][y] == "" ||
      this.getColor(x + shiftX, y) == 'a' ||
      this.getPiece(x + shiftX, y) == V.INVISIBLE_QUEEN
    ) {
      moves.push(this.getBasicMove([x, y], [x + shiftX, y]));
      if (
        [firstRank, firstRank + shiftX].includes(x) &&
        (
          this.board[x + 2 * shiftX][y] == "" ||
          this.getColor(x + 2 * shiftX, y) == 'a' ||
          this.getPiece(x + 2 * shiftX, y) == V.INVISIBLE_QUEEN
        )
      ) {
        moves.push(this.getBasicMove([x, y], [x + 2 * shiftX, y]));
      }
    }
    for (let shiftY of [-1, 1]) {
      if (
        y + shiftY >= 0 &&
        y + shiftY < this.size.y &&
        this.board[x + shiftX][y + shiftY] != "" &&
        // Pawns cannot capture invisible queen this way!
        this.getPiece(x + shiftX, y + shiftY) != V.INVISIBLE_QUEEN &&
        ['a', oppCol].includes(this.getColor(x + shiftX, y + shiftY))
      ) {
        moves.push(this.getBasicMove([x, y], [x + shiftX, y + shiftY]));
      }
    }
    super.pawnPostProcess(moves, color, oppCol);
    return moves;
  }

  getQueenMovesFrom(sq) {
    const normalMoves = super.getPotentialMovesOf('q', sq);
    // If flag allows it, add 'invisible movements'
    let invisibleMoves = [];
    if (this.powerFlags[this.turn]['q']) {
      normalMoves.forEach(m => {
        if (
          m.appear.length == 1 &&
          m.vanish.length == 1 &&
          // Only simple non-capturing moves:
          m.vanish[0].c != 'a'
        ) {
          let im = JSON.parse(JSON.stringify(m));
          im.appear[0].p = V.INVISIBLE_QUEEN;
          im.end.noHighlight = true;
          invisibleMoves.push(im);
        }
      });
    }
    return normalMoves.concat(invisibleMoves);
  }

  getKingMovesFrom([x, y]) {
    let moves = super.getPotentialMovesOf('k', [x, y]);
    // If flag allows it, add 'remote shell captures'
    if (this.powerFlags[this.turn]['k']) {
      super.pieces()['k'].moves[0].steps.forEach(step => {
        let [i, j] = [x + step[0], y + step[1]];
        while (
          this.onBoard(i, j) &&
          (
            this.board[i][j] == "" ||
            this.getPiece(i, j) == V.INVISIBLE_QUEEN ||
            (
              this.getColor(i, j) == 'a' &&
              [V.EGG, V.MUSHROOM].includes(this.getPiece(i, j))
            )
          )
        ) {
          i += step[0];
          j += step[1];
        }
        if (this.onBoard(i, j)) {
          const colIJ = this.getColor(i, j);
          if (colIJ != this.turn) {
            // May just destroy a bomb or banana:
            moves.push(
              new Move({
                start: {x: x, y: y},
                end: {x: i, y: j},
                appear: [],
                vanish: [
                  new PiPo({x: i, y: j, c: colIJ, p: this.getPiece(i, j)})
                ]
              })
            );
          }
        }
      });
    }
    return moves;
  }

  getKnightMovesFrom([x, y]) {
    // Add egg on initial square:
    return super.getPotentialMovesOf('n', [x, y]).map(m => {
      m.appear.push(new PiPo({p: "e", c: "a", x: x, y: y}));
      return m;
    });
  }

/// if any of my pieces was immobilized, it's not anymore.
  //if play set a piece immobilized, then mark it
  play(move) {
    if (move.effect == "toadette") {
      this.reserve = this.captured;
      this.re_drawReserve([this.turn]);
    }
    else if (this.reserve) {
      this.reserve = { w: {}, b: {} };
      this.re_drawReserve([this.turn]);
    }
    const color = this.turn;
    if (
      move.vanish.length == 2 &&
      move.vanish[1].c != 'a' &&
      move.appear.length == 1 //avoid king Boo!
    ) {
      // Capture: update this.captured
      let capturedPiece = move.vanish[1].p;
      if (capturedPiece == V.INVISIBLE_QUEEN)
        capturedPiece = V.QUEEN;
      else if (Object.keys(V.IMMOBILIZE_DECODE).includes(capturedPiece))
        capturedPiece = V.IMMOBILIZE_DECODE[capturedPiece];
      this.captured[move.vanish[1].c][capturedPiece]++;
    }
    else if (move.vanish.length == 0) {
      if (move.appear.length == 0 || move.appear[0].c == 'a')
        return;
      // A piece is back on board
      this.captured[move.appear[0].c][move.appear[0].p]--;
    }
    if (move.appear.length == 0) {
      // Three cases: king "shell capture", Chomp or Koopa
      if (this.getPiece(move.start.x, move.start.y) == V.KING)
        // King remote capture:
        this.powerFlags[color][V.KING] = false;
      else if (move.end.effect == "chomp")
        this.captured[color][move.vanish[0].p]++;
    }
    else if (move.appear[0].p == V.INVISIBLE_QUEEN)
      this.powerFlags[move.appear[0].c][V.QUEEN] = false;
    if (this.subTurn == 2) return;
    if (
      move.turn[1] == 1 &&
      move.appear.length == 0 ||
      !(Object.keys(V.IMMOBILIZE_DECODE).includes(move.appear[0].p))
    ) {
      // Look for an immobilized piece of my color: it can now move
      for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
          if (this.board[i][j] != V.EMPTY) {
            const piece = this.getPiece(i, j);
            if (
              this.getColor(i, j) == color &&
              Object.keys(V.IMMOBILIZE_DECODE).includes(piece)
            ) {
              this.board[i][j] = color + V.IMMOBILIZE_DECODE[piece];
              move.wasImmobilized = [i, j];
            }
          }
        }
      }
    }
    // Also make opponent invisible queen visible again, if any
    const oppCol = V.GetOppCol(color);
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (
          this.board[i][j] != V.EMPTY &&
          this.getColor(i, j) == oppCol &&
          this.getPiece(i, j) == V.INVISIBLE_QUEEN
        ) {
          this.board[i][j] = oppCol + V.QUEEN;
          move.wasInvisible = [i, j];
        }
      }
    }
    this.playOnBoard(move);
    if (["kingboo", "toadette", "daisy"].includes(move.effect)) {
      this.effect = move.effect;
      this.subTurn = 2;
    }
    else {
      this.turn = C.GetOppCol(this.turn);
      this.movesCount++;
      this.subTurn = 1;
    }


    if (move.egg)
      this.displayBonus(move.egg);
    else if (this.egg)
      this.egg = null; //the egg is consumed
  }

  displayBonus(egg) {
    alert(egg); //TODO: nicer display
  }

  filterValid(moves) {
    return moves;
  }

  tryMoveFollowup(move, cb) {
    // Warning: at this stage, the move is played
    if (move.vanish.length == 2 && move.vanish[1].c == 'a') {
      // effect, or bonus/malus
      const endType = move.vanish[1].p;
      switch (endType) {
        case V.EGG:
          this.applyRandomBonus(move, cb);
          break;
        case V.BANANA:
        case V.BOMB: {
          const dest =
            this.getRandomSquare([m.end.x, m.end.y],
              endType == V.BANANA
                ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
                : [[1, 0], [-1, 0], [0, 1], [0, -1]]);
          cb(this.getBasicMove([move.end.x, move.end.y], dest));
          break;
        }
        case V.MUSHROOM: {
          let step = [move.end.x - move.start.x, move.end.y - move.start.y];
          if ([0, 1].some(i => step[i] >= 2 && step[1-i] != 1)) {
            // Slider, multi-squares: normalize step
            for (let j of [0, 1])
              step[j] = step[j] / Math.abs(step[j]) || 0;
          }
          const nextSquare = [move.end.x + step[0], move.end.y + step[1]];
          if (this.onBoard(nextSquare[0], nextSquare[1])) {
            if (
              this.board[nextSquare[0]][nextSquare[1]] != "" &&
              this.getColor(nextSquare[0], nextSquare[1]) != 'a'
            ) {
              // (try to) jump
              const afterSquare =
                [nextSquare[0] + step[0], nextSquare[1] + step[1]];
              if (
                this.onBoard(afterSquare[0], afterSquare[1]) &&
                this.getColor(afterSquare[0], afterSquare[1]) != this.turn
              ) {
                cb(this.getBasicMove([move.end.x, move.end.y], afterSquare));
              }
            }
            else if (!['b', 'r', 'q'].includes(move.vanish[0].p))
              // Take another step forward if not slider move
              cb(this.getBasicMove([move.end.x, move.end.y], nextSquare));
          }
          break;
        }
      }
    }
  }

  applyRandomBonus(move, cb) {
    // TODO: determine bonus/malus, and then ...
    // if toadette, daisy or kingboo : do not call cb
    this.egg = "daisy"; //not calling cb in this case
    this.displayBonus(this.egg);
    move.egg = this.egg; //for play() by opponent
  }

  // Helper to apply banana/bomb effect
  getRandomSquare([x, y], steps) {
    const validSteps = steps.filter(s => this.onBoard(x + s[0], y + s[1]));
    const step = validSteps[Random.randInt(validSteps.length)];
    return [x + step[0], y + step[1]];
  }

  // Warning: if play() is called, then move.end changed.
  playPlusVisual(move, r) {
    this.moveStack.push(move);
    this.play(move);
    this.playVisual(move, r);
    this.tryMoveFollowup(move, (nextMove) => {
      if (nextMove)
        this.playPlusVisual(nextMove, r);
      else
        this.afterPlay(this.moveStack);
    });
  }

};
