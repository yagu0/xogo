import ChessRules from "/base_rules";
import GiveawayRules from "/variants/Giveaway";
import { ArrayFun } from "/utils/array.js";
import { Random } from "/utils/alea.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export class ChakartRules extends ChessRules {

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
    const gr = new GiveawayRules({mode: "suicide"}, true);
    return (
      gr.genRandInitFen(seed).slice(0, -1) +
      // Add Peach + Mario flags + capture counts
      '{"flags":"1111", "ccount":"000000000000"}'
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
    const res = ['w', 'b'].map(c => {
      Object.values(this.captured[c])
    });
    return res[0].concat(res[1]).join("");
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    // Initialize captured pieces' counts from FEN
    const allCapts = fenParsed.captured.split("").map(x => parseInt(x, 10));
    const pieces = ['p', 'r', 'n', 'b', 'q', 'k'];
    this.captured = {
      w: Array.toObject(pieces, allCapts.slice(0, 6)),
      b: Array.toObject(pieces, allCapts.slice(6, 12))
    };
    this.reserve = { w: {}, b: {} }; //to be replaced by this.captured
    this.moveStack = [];
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

// TODO: rethink from here:

// allow pawns 
  // queen invisible move, king shell: special functions

// prevent pawns from capturing invisible queen (post)
// post-process: 

//events : playPlusVisual after mouse up, playReceived (include animation) on opp move
// ==> if move.cont (banana...) self re-call playPlusVisual (rec ?)

  // Moving something. Potential effects resolved after playing
  getPotentialMovesFrom([x, y], bonus) {
    let moves = [];
    if (bonus == "toadette")
      return this.getDropMovesFrom([x, y]);
    else if (bonus == "kingboo") {
      const initPiece = this.getPiece(x, y);
      const color = this.getColor(x, y);
      const oppCol = C.GetOppCol(color);
      // Only allow to swap pieces (TODO: restrict for pawns)
      for (let i=0; i<this.size.x; i++) {
        for (let j=0; j<this.size.y; j++) {
          if ((i != x || j != y) && this.board[i][j] != "") {
            const pstart = new PiPo({x: x, y: y, p: initPiece, c: color});
            const pend =
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
        // TODO: add mushroom on init square
        break;
      case 'q':
        moves = this.getQueenMovesFrom([x, y]);
        break;
      case 'k',
        moves = this.getKingMovesFrom([x, y]);
        break;
      case 'n':
        moves = super.getPotentialMovesFrom([x, y]);
        // TODO: add egg on init square
        break;
      default:
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

      // TODO:
      this.addPawnMoves([x, y], [x + shiftX, y], moves);
      if (
        [firstRank, firstRank + shiftX].includes(x) &&
        (
          this.board[x + 2 * shiftX][y] == V.EMPTY ||
          this.getColor(x + 2 * shiftX, y) == 'a' ||
          this.getPiece(x + 2 * shiftX, y) == V.INVISIBLE_QUEEN
        )
      ) {
        moves.push(this.getBasicMove({ x: x, y: y }, [x + 2 * shiftX, y]));
      }
    }
    for (let shiftY of [-1, 1]) {
      if (
        y + shiftY >= 0 &&
        y + shiftY < sizeY &&
        this.board[x + shiftX][y + shiftY] != V.EMPTY &&
        // Pawns cannot capture invisible queen this way!
        this.getPiece(x + shiftX, y + shiftY) != V.INVISIBLE_QUEEN &&
        ['a', oppCol].includes(this.getColor(x + shiftX, y + shiftY))
      ) {
        this.addPawnMoves([x, y], [x + shiftX, y + shiftY], moves);
      }
    }
    return moves;
  }

  getQueenMovesFrom(sq) {
    const normalMoves = super.getPotentialQueenMoves(sq);
    // If flag allows it, add 'invisible movements'
    let invisibleMoves = [];
    if (this.powerFlags[this.turn][V.QUEEN]) {
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
    let moves = super.getPotentialKingMoves([x, y]);
    const color = this.turn;
    // If flag allows it, add 'remote shell captures'
    if (this.powerFlags[this.turn][V.KING]) {
      V.steps[V.ROOK].concat(V.steps[V.BISHOP]).forEach(step => {
        let [i, j] = [x + step[0], y + step[1]];
        while (
          V.OnBoard(i, j) &&
          (
            this.board[i][j] == V.EMPTY ||
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
        if (V.OnBoard(i, j)) {
          const colIJ = this.getColor(i, j);
          if (colIJ != color) {
            // May just destroy a bomb or banana:
            moves.push(
              new Move({
                start: { x: x, y: y},
                end: { x: i, y: j },
                appear: [],
                vanish: [
                  new PiPo({
                    x: i, y: j, c: colIJ, p: this.getPiece(i, j)
                  })
                ]
              })
            );
          }
        }
      });
    }
    return moves;
  }

  // TODO: can merge prePlay into play() ==> no need to distinguish
/// if any of my pieces was immobilized, it's not anymore.
  //if play set a piece immobilized, then mark it
  prePlay(move) {
    if (move.effect == "toadette")
      this.reserve = this.captured;
    else
      this.reserve = { w: {}, b: {} };;
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
      if (move.appear.length == 0 || move.appear[0].c == 'a') return;
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
  }

  play(move) {
    this.prePlay(move);
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
  }

  filterValid(moves) {
    return moves;
  }

  // idée : on joue le coup, puis son effet est déterminé, puis la suite (si suite)
  // est jouée automatiquement ou demande action utilisateur, etc jusqu'à coup terminal.
  tryMoveFollowup(move, cb) {
    if (this.getColor(move.end.x, move.end.y) == 'a') {
      // effect, or bonus/malus
      const endType = this.getPiece(m.end.x, m.end.y);
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
          const nextMove = this.getBasicMove([move.end.x, move.end.y], dest);
          cb(nextMove);
          break;
        }
        case V.MUSHROOM:
          // aller dans direction, saut par dessus pièce adverse
          // ou amie (tjours), new step si roi caval pion
          break;
      }
    }
  }

  applyRandomBonnus(move, cb) {
    // TODO: determine bonus/malus, and then 
  }

  // Helper to apply banana/bomb effect
  getRandomSquare([x, y], steps) {
    const validSteps = steps.filter(s => this.onBoard(x + s[0], y + s[1]));
    const step = validSteps[Random.randInt(validSteps.length)];
    return [x + step[0], y + step[1]];
  }
// TODO: turn change indicator ?!
  playPlusVisual(move, r) {
    this.moveStack.push(move);
    this.play(move);
    this.playVisual(move, r);
    if (move.bonus)
      alert(move.bonus); //TODO: nicer display
    this.tryMoveFollowup(move, (nextMove) => {
      if (nextMove)
        this.playPlusVisual(nextMove, r);
      else
        this.afterPlay(this.moveStack);
    });
  }

};
