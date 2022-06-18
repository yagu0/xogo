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
  get hasReserve() {
    return true;
  }
  get hasReserveFen() {
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

  static get EGG_SURPRISE() {
    return [
      "kingboo", "bowser", "daisy", "koopa",
      "luigi", "waluigi", "toadette", "chomp"];
  }

  pieces(color, x, y) {
    let specials = {
      'i': {"class": "invisible"}, //queen
      'e': {"class": "egg"},
      'm': {"class": "mushroom"},
      'd': {"class": "banana"},
      'w': {"class": "bomb"}
    };
    return Object.assign(specials, super.pieces(color, x, y));
  }

  genRandInitFen(seed) {
    const gr = new GiveawayRules(
      {mode: "suicide", options: {}, genFenOnly: true});
    // Add Peach + mario flags
    return gr.genRandInitFen(seed).slice(0, -17) + '{"flags":"1111"}';
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

  getFlagsFen() {
    return ['w', 'b'].map(c => {
      return ['k', 'q'].map(p => this.powerFlags[c][p] ? "1" : "0").join("");
    }).join("");
  }

  setOtherVariables(fenParsed) {
    this.setFlags(fenParsed.flags);
    this.reserve = {}; //to be filled later
    this.egg = null;
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

  getPotentialMovesFrom([x, y]) {
    let moves = [];
    if (this.egg == "toadette")
      moves = this.getDropMovesFrom([x, y]);
    else if (this.egg == "kingboo") {
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
    }
    else {
      // Normal case (including bonus daisy)
      const piece = this.getPiece(x, y);
      switch (piece) {
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
          moves = this.getRookOrBishopMovesFrom([x, y], piece);
          break;
      }
    }
    // Set potential random effects, so that play() is deterministic
    moves.forEach(m => {
      switch (this.getPiece(m.end.x, m.end.y)) {
        case V.EGG:
          m.egg = Random.sample(V.EGG_SURPRISE);
          m.next = this.getEggEffect(m);
          break;
        case V.BANANA:
          m.next = this.getRandomSquare(
            [m.end.x, m.end.y], [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
          break;
        case V.BOMB:
          m.next = this.getRandomSquare(
            [m.end.x, m.end.y], [[1, 0], [-1, 0], [0, 1], [0, -1]]);
          break;
      }
    });
    return moves;
  }

  getEggEffect(move) {
    const getRandomPiece = (c) => {
      let bagOfPieces = [];
      for (let i=0; i<this.size.x; i++) {
        for (let j=0; j<this.size.y; j++) {
          if (this.getColor(i, j) == c && this.getPiece(i, j) != 'k')
            bagOfPieces.push([i, j]);
        }
      }
      if (bagOfPieces.length >= 1)
        return Random.sample(bagOfPieces);
      return null;
    };
    const color = this.turn;
    let em = null;
    switch (move.egg) {
      case "luigi":
      case "waluigi":
        // Change color of friendly or enemy piece, king excepted
        const oldColor = (move.egg == "waluigi" ? color : C.GetOppCol(color));
        const newColor = C.GetOppCol(oldColor);
        const coords = getRandomPiece(oldColor);
        if (coords) {
          const piece = this.getPiece(coords[0], coords[1]);
          em = new Move({
            appear: [
              new PiPo({x: coords[0], y: coords[1], c: newColor, p: piece})
            ],
            vanish: [
              new PiPo({x: coords[0], y: coords[1], c: oldColor, p: piece})
            ]
          });
        }
        break;
      case "bowser":
        em = new Move({
          appear: [
            new PiPo({
              x: move.end.x,
              y: move.end.y,
              c: color,
              p: V.IMMOBILIZED_CODE[move.appear[0].p]
            })
          ],
          vanish: [
            new PiPo({
              x: move.end.x,
              y: move.end.y,
              c: color,
              p: move.appear[0].p
            })
          ]
        });
        break;
      case "koopa":
        // Reverse move
        em = new Move({
          appear: [
            new PiPo({
              x: move.start.x, y: move.start.y, c: color, p: move.appear[0].p
            })
          ],
          vanish: [
            new PiPo({
              x: move.end.x, y: move.end.y, c: color, p: move.appear[0].p
            })
          ]
        });
        break;
      case "chomp":
        // Eat piece
        em = new Move({
          appear: [],
          vanish: [
            new PiPo({
              x: move.end.x, y: move.end.y, c: color, p: move.appear[0].p
            })
          ],
          end: {x: move.end.x, y: move.end.y}
        });
        break;
    }
    return em;
  }

  // Helper to set and apply banana/bomb effect
  getRandomSquare([x, y], steps, freeSquare) {
    let validSteps = steps.filter(s => this.onBoard(x + s[0], y + s[1]));
    if (freeSquare) {
      // Square to put banana/bomb cannot be occupied by a piece
      validSteps = validSteps.filter(s => {
        return ["", 'a'].includes(this.getColor(x + s[0], y + s[1]))
      });
    }
    if (validSteps.length == 0)
      return null;
    const step = validSteps[Random.randInt(validSteps.length)];
    return [x + step[0], y + step[1]];
  }

  getPotentialMovesOf(piece, [x, y]) {
    const color = this.getColor(x, y);
    const stepSpec = this.pieces(color, x, y)[piece];
    let moves = [];
    const findAddMoves = (type, stepArray) => {
      for (let s of stepArray) {
        outerLoop: for (let step of s.steps) {
          let [i, j] = [x + step[0], y + step[1]];
          let stepCounter = 1;
          while (
            this.onBoard(i, j) &&
            (
              this.board[i][j] == "" ||
              [V.MUSHROOM, V.EGG].includes(this.getPiece(i, j))
            )
          ) {
            if (type != "attack")
              moves.push(this.getBasicMove([x, y], [i, j]));
            if (s.range <= stepCounter++)
              continue outerLoop;
            [i, j] = [i + step[0], j + step[1]];
          }
          if (!this.onBoard(i, j))
            continue;
          const pieceIJ = this.getPiece(i, j);
          if (type != "moveonly" && this.getColor(i, j) != color)
            moves.push(this.getBasicMove([x, y], [i, j]));
        }
      }
    };
    const specialAttack = !!stepSpec.attack;
    if (specialAttack)
      findAddMoves("attack", stepSpec.attack);
    findAddMoves(specialAttack ? "moveonly" : "all", stepSpec.moves);
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
    this.pawnPostProcess(moves, color, oppCol);
    // Add mushroom on initial square
    moves.forEach(m => {
      m.appear.push(new PiPo({x: m.start.x, y: m.start.y, c: 'a', p: 'm'}));
    });
    return moves;
  }

  getRookOrBishopMovesFrom([x, y], type) {
    // Add banana if possible, diagonaly
    return this.getPotentialMovesOf(type, [x, y]).map(m => {
      const bs =
        this.getRandomSquare([m.end.x, m.end.y],
          type == 'r'
            ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
            : [[1, 0], [-1, 0], [0, 1], [0, -1]],
          "freeSquare");
      if (bs) {
        m.appear.push(
          new PiPo({
            x: bs[0],
            y: bs[1],
            c: 'a',
            p: type == 'r' ? 'd' : 'w'
          })
        );
        if (this.board[bs[0]][bs[1]] != "") {
          m.vanish.push(
            new PiPo({
              x: bs[0],
              y: bs[1],
              c: this.getColor(bs[0], bs[1]),
              p: this.getPiece(bs[0], bs[1])
            })
          );
        }
      }
      return m;
    });
  }

  getKnightMovesFrom([x, y]) {
    // Add egg on initial square:
    return this.getPotentialMovesOf('n', [x, y]).map(m => {
      m.appear.push(new PiPo({p: "e", c: "a", x: x, y: y}));
      return m;
    });
  }

  getQueenMovesFrom(sq) {
    const normalMoves = this.getPotentialMovesOf('q', sq);
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
          im.noAnimate = true;
          invisibleMoves.push(im);
        }
      });
    }
    return normalMoves.concat(invisibleMoves);
  }

  getKingMovesFrom([x, y]) {
    let moves = this.getPotentialMovesOf('k', [x, y]);
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
            let shellCapture = new Move({
              start: {x: x, y: y},
              end: {x: i, y: j},
              appear: [],
              vanish: [
                new PiPo({x: i, y: j, c: colIJ, p: this.getPiece(i, j)})
              ]
            });
            shellCapture.shell = true; //easier play()
            moves.push(shellCapture);
          }
        }
      });
    }
    return moves;
  }

  play(move) {
    this.egg = move.egg;
    const color = this.turn;
    if (move.egg == "toadette") {
      this.reserve = { w: {}, b: {} };
      // Randomly select a piece in pawnPromotions
      this.reserve[color][Random.sample(this.pawnPromotions)] = 1;
      this.re_drawReserve([color]);
    }
    else if (Object.keys(this.reserve).length > 0) {
      this.reserve = {};
      this.re_drawReserve([color]);
    }
    if (this.getPiece(move.end.x, move.end.y) == V.MUSHROOM)
      move.next = this.getMushroomEffect(move);
    if (move.shell)
      this.powerFlags[color]['k'] = false;
    else if (move.appear.length > 0 && move.appear[0].p == V.INVISIBLE_QUEEN)
      this.powerFlags[move.appear[0].c]['q'] = false;
    this.playOnBoard(move);
    // Look for an immobilized piece of my color: it can now move
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if ((i != move.end.x || j != move.end.y) && this.board[i][j] != "") {
          const piece = this.getPiece(i, j);
          if (
            this.getColor(i, j) == color &&
            Object.keys(V.IMMOBILIZE_DECODE).includes(piece)
          ) {
            this.board[i][j] = color + V.IMMOBILIZE_DECODE[piece];
          }
        }
      }
    }
    // Also make opponent invisible queen visible again, if any
    const oppCol = C.GetOppCol(color);
    for (let i=0; i<8; i++) {
      for (let j=0; j<8; j++) {
        if (
          this.board[i][j] != "" &&
          this.getColor(i, j) == oppCol &&
          this.getPiece(i, j) == V.INVISIBLE_QUEEN
        ) {
          this.board[i][j] = oppCol + V.QUEEN;
        }
      }
    }
    if (!move.next && !["daisy", "toadette", "kingboo"].includes(move.egg)) {
      this.turn = oppCol;
      this.movesCount++;
    }
    if (move.egg)
      this.displayBonus(move.egg);
    this.nextMove = move.next;
  }

  displayBonus(egg) {
    alert(egg); //TODO: nicer display
  }

  filterValid(moves) {
    return moves;
  }

  getMushroomEffect(move) {
    let step = [move.end.x - move.start.x, move.end.y - move.start.y];
    if ([0, 1].some(i => step[i] >= 2 && step[1-i] != 1)) {
      // Slider, multi-squares: normalize step
      for (let j of [0, 1])
        step[j] = step[j] / Math.abs(step[j]) || 0;
    }
    const nextSquare = [move.end.x + step[0], move.end.y + step[1]];
    const afterSquare =
      [nextSquare[0] + step[0], nextSquare[1] + step[1]];
    let nextMove = null;
    if (
      this.onBoard(nextSquare[0], nextSquare[1]) &&
      this.board[nextSquare[0]][nextSquare[1]] == "" &&
      ['k', 'p', 'n'].includes(move.vanish[0].p)
    ) {
      // Speed up non-sliders
      nextMove = this.getBasicMove([move.end.x, move.end.y], nextSquare);
    }
    else if (
      this.onBoard(afterSquare[0], afterSquare[1]) &&
      this.board[nextSquare[0]][nextSquare[1]] != "" &&
      this.getColor(nextSquare[0], nextSquare[1]) != 'a' &&
      this.getColor(afterSquare[0], afterSquare[1]) != this.turn
    ) {
      nextMove = this.getBasicMove([move.end.x, move.end.y], afterSquare);
    }
    return nextMove;
  }

  playPlusVisual(move, r) {
    this.moveStack.push(move);
    this.play(move);
    this.playVisual(move, r);
    if (this.nextMove)
      this.playPlusVisual(this.nextMove, r);
    else
      this.afterPlay(this.moveStack);
  }

  // TODO: set some special moves (effects) as noAnimate
  // TODO: put bomb/banana only at final location of a move ? Seems more logical
  // + fix bishop takes mushroom and jump
  // Also improve showChoices for invisible queen + king shell
  // + fix turn issues after multimove (like bishop put bomb)

};
