import ChessRules from "/base_rules.js";
import {ArrayFun} from "/utils/array.js";
import {Random} from "/utils/alea.js";
import {FenUtil} from "/utils/setupPieces.js";
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
      ],
      styles: ["cylinder"]
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

  canIplay(x, y) {
    if (
      this.playerColor != this.turn ||
      Object.keys(V.IMMOBILIZE_DECODE).includes(this.getPiece(x, y))
    ) {
      return false;
    }
    return this.egg == "kingboo" || this.getColor(x, y) == this.turn;
  }

  pieces(color, x, y) {
    const specials = {
      'i': {"class": "invisible"}, //queen
      '?': {"class": "mystery"}, //...initial square
      'e': {"class": "egg"},
      'm': {"class": "mushroom"},
      'd': {"class": "banana"},
      'w': {"class": "bomb"},
      'z': {"class": "remote-capture"}
    };
    const bowsered = {
      's': {"class": ["immobilized", "pawn"]},
      'u': {"class": ["immobilized", "rook"]},
      'o': {"class": ["immobilized", "knight"]},
      'c': {"class": ["immobilized", "bishop"]},
      't': {"class": ["immobilized", "queen"]},
      'l': {"class": ["immobilized", "king"]}
    };
    return Object.assign(
      {
        'y': {
          // Virtual piece for "king remote shell captures"
          attack: [
            {
              steps: [
                [0, 1], [0, -1], [1, 0], [-1, 0],
                [1, 1], [1, -1], [-1, 1], [-1, -1]
              ]
            }
          ]
        }
      },
      specials, bowsered, super.pieces(color, x, y)
    );
  }

  genRandInitBaseFen() {
    const s = FenUtil.setupPieces(
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'], {diffCol: ['b']});
    return {
      fen: s.b.join("") + "/pppppppp/8/8/8/8/PPPPPPPP/" +
           s.w.join("").toUpperCase(),
      o: {flags: "1111"} //Peach + Mario
    };
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
    super.setOtherVariables(fenParsed);
    this.egg = null;
    // Change seed (after FEN generation!!)
    // so that further calls differ between players:
    Random.setSeed(Math.floor(19840 * Math.random()));
  }

  initReserves() {
    this.reserve = {}; //to be filled later
  }

  canStepOver(i, j) {
    return (
      this.board[i][j] == "" ||
      ['i', V.EGG, V.MUSHROOM].includes(this.getPiece(i, j))
    );
  }

  // For Toadette bonus
  canDrop([c, p], [i, j]) {
    return (
      (
        this.board[i][j] == "" ||
        this.getColor(i, j) == 'a' ||
        this.getPiece(i, j) == 'i'
      )
      &&
      (p != "p" || (c == 'w' && i < this.size.x - 1) || (c == 'b' && i > 0))
    );
  }

  getPotentialMovesFrom([x, y]) {
    let moves = [];
    const piece = this.getPiece(x, y);
    if (this.egg == "toadette")
      moves = this.getDropMovesFrom([x, y]);
    else if (this.egg == "kingboo") {
      const color = this.turn;
      const oppCol = C.GetOppCol(color);
      // Only allow to swap (non-immobilized!) pieces
      for (let i=0; i<this.size.x; i++) {
        for (let j=0; j<this.size.y; j++) {
          const colIJ = this.getColor(i, j);
          const pieceIJ = this.getPiece(i, j);
          if (
            (i != x || j != y) &&
            ['w', 'b'].includes(colIJ) &&
            !Object.keys(V.IMMOBILIZE_DECODE).includes(pieceIJ) &&
            // Next conditions = no pawn on last rank
            (
              piece != 'p' ||
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
            m.appear.push(new PiPo({x: x, y: y, p: pieceIJ, c: colIJ}));
            m.kingboo = true; //avoid some side effects (bananas/bombs)
            moves.push(m);
          }
        }
      }
    }
    else {
      // Normal case (including bonus daisy)
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
          // Explicitely listing types to avoid moving immobilized piece
          moves = super.getPotentialMovesOf(piece, [x, y]);
          break;
      }
    }
    return moves;
  }

  getPawnMovesFrom([x, y]) {
    const color = this.turn;
    const oppCol = C.GetOppCol(color);
    const shiftX = (color == 'w' ? -1 : 1);
    const firstRank = (color == "w" ? this.size.x - 1 : 0);
    let moves = [];
    const frontPiece = this.getPiece(x + shiftX, y);
    if (
      this.board[x + shiftX][y] == "" ||
      this.getColor(x + shiftX, y) == 'a' ||
      frontPiece == 'i'
    ) {
      moves.push(this.getBasicMove([x, y], [x + shiftX, y]));
      if (
        [firstRank, firstRank + shiftX].includes(x) &&
        ![V.BANANA, V.BOMB].includes(frontPiece) &&
        (
          this.board[x + 2 * shiftX][y] == "" ||
          this.getColor(x + 2 * shiftX, y) == 'a' ||
          this.getPiece(x + 2 * shiftX, y) == 'i'
        )
      ) {
        moves.push(this.getBasicMove([x, y], [x + 2 * shiftX, y]));
      }
    }
    for (let shiftY of [-1, 1]) {
      const nextY = this.getY(y + shiftY);
      if (
        nextY >= 0 &&
        nextY < this.size.y &&
        this.board[x + shiftX][nextY] != "" &&
        // Pawns cannot capture invisible queen this way!
        this.getPiece(x + shiftX, nextY) != 'i' &&
        ['a', oppCol].includes(this.getColor(x + shiftX, nextY))
      ) {
        moves.push(this.getBasicMove([x, y], [x + shiftX, nextY]));
      }
    }
    moves = super.pawnPostProcess(moves, color, oppCol);
    // Add mushroom on before-last square (+ potential segments)
    moves.forEach(m => {
      let [mx, my] = [x, y];
      if (Math.abs(m.end.x - m.start.x) == 2)
        mx = (m.start.x + m.end.x) / 2;
      m.appear.push(new PiPo({x: mx, y: my, c: 'a', p: 'm'}));
      if (mx != x && this.board[mx][my] != "") {
        m.vanish.push(new PiPo({
          x: mx,
          y: my,
          c: this.getColor(mx, my),
          p: this.getPiece(mx, my)
        }));
      }
      if (Math.abs(m.end.y - m.start.y) > 1) {
        m.segments = [
          [[x, y], [x, y]],
          [[m.end.x, m.end.y], [m.end.x, m.end.y]]
        ];
      }
    });
    return moves;
  }

  getKnightMovesFrom([x, y]) {
    // Add egg on initial square:
    return super.getPotentialMovesOf('n', [x, y]).map(m => {
      m.appear.push(new PiPo({p: "e", c: "a", x: x, y: y}));
      return m;
    });
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
          im.appear[0].p = 'i';
          im.noAnimate = true;
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
      let shellCaptures = super.getPotentialMovesOf('y', [x, y]);
      shellCaptures.forEach(sc => {
        sc.shell = true; //easier play()
        sc.choice = 'z'; //to display in showChoices()
        // Fix move (Rifle style):
        sc.vanish.shift();
        sc.appear.shift();
      });
      Array.prototype.push.apply(moves, shellCaptures);
    }
    return moves;
  }

  play(move) {
    const color = this.turn;
    const oppCol = C.GetOppCol(color);
    this.egg = move.egg;
    if (move.egg == "toadette") {
      this.reserve = { w: {}, b: {} };
      // Randomly select a piece in pawnPromotions
      if (!move.toadette)
        move.toadette = Random.sample(this.pawnPromotions);
      this.reserve[color][move.toadette] = 1;
      this.re_drawReserve([color]);
    }
    else if (Object.keys(this.reserve).length > 0) {
      this.reserve = {};
      this.re_drawReserve([color]);
    }
    if (move.shell)
      this.powerFlags[color]['k'] = false;
    else if (move.appear.length > 0 && move.appear[0].p == 'i') {
      this.powerFlags[move.appear[0].c]['q'] = false;
      if (color == this.playerColor) {
        move.appear.push(
          new PiPo({x: move.start.x, y: move.start.y, c: color, p: '?'}));
      }
    }
    if (color == this.playerColor) {
      // Look for an immobilized piece of my color: it can now move
      for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
          if ((i != move.end.x || j != move.end.y) && this.board[i][j] != "") {
            const piece = this.getPiece(i, j);
            if (
              this.getColor(i, j) == color &&
              Object.keys(V.IMMOBILIZE_DECODE).includes(piece)
            ) {
              move.vanish.push(new PiPo({
                x: i, y: j, c: color, p: piece
              }));
              move.appear.push(new PiPo({
                x: i, y: j, c: color, p: V.IMMOBILIZE_DECODE[piece]
              }));
            }
          }
        }
      }
      // Also make opponent invisible queen visible again, if any
      for (let i=0; i<8; i++) {
        for (let j=0; j<8; j++) {
          if (
            this.board[i][j] != "" &&
            this.getColor(i, j) == oppCol
          ) {
            const pieceIJ = this.getPiece(i, j);
            if (
              pieceIJ == 'i' &&
              // Ensure that current move doesn't erase invisible queen
              move.appear.every(a => a.x != i || a.y != j)
            ) {
              move.vanish.push(new PiPo({x: i, y: j, c: oppCol, p: 'i'}));
              move.appear.push(new PiPo({x: i, y: j, c: oppCol, p: 'q'}));
            }
            else if (pieceIJ == '?')
              move.vanish.push(new PiPo({x: i, y: j, c: oppCol, p: '?'}));
          }
        }
      }
    }
    this.playOnBoard(move);
    super.postPlay(move);
  }

  playVisual(move, r) {
    super.playVisual(move, r);
    if (move.egg)
      this.displayBonus(move);
  }

  buildMoveStack(move, r) {
    const color = this.turn;
    if (
      move.appear.length > 0 &&
      move.appear[0].p == 'p' &&
      (
        (color == 'w' && move.end.x == 0) ||
        (color == 'b' && move.end.x == this.size.x - 1)
      )
    ) {
      // "Forgotten" promotion, which occurred after some effect
      let moves = super.pawnPostProcess([move], color, C.GetOppCol(color));
      super.showChoices(moves, r);
    }
    else
      super.buildMoveStack(move, r);
  }

  computeNextMove(move) {
    if (move.koopa)
      return null;
    // Set potential random effects, so that play() is deterministic
    // from opponent viewpoint:
    const endPiece = this.getPiece(move.end.x, move.end.y);
    switch (endPiece) {
      case V.EGG:
        move.egg = Random.sample(V.EGG_SURPRISE);
        move.next = this.getEggEffect(move);
        break;
      case V.MUSHROOM:
        move.next = this.getMushroomEffect(move);
        break;
      case V.BANANA:
      case V.BOMB:
        move.next = this.getBombBananaEffect(move, endPiece);
        break;
    }
    // NOTE: Chakart has also some side-effects:
    if (
      !move.next && move.appear.length > 0 &&
      !move.kingboo && !move.luigiEffect
    ) {
      const movingPiece = move.appear[0].p;
      if (['b', 'r'].includes(movingPiece)) {
        // Drop a banana or bomb:
        const bs =
          this.getRandomSquare([move.end.x, move.end.y],
            movingPiece == 'r'
              ? [[1, 1], [1, -1], [-1, 1], [-1, -1]]
              : [[1, 0], [-1, 0], [0, 1], [0, -1]],
            "freeSquare");
        if (bs) {
          move.appear.push(
            new PiPo({
              x: bs[0],
              y: bs[1],
              c: 'a',
              p: movingPiece == 'r' ? 'd' : 'w'
            })
          );
          if (this.board[bs[0]][bs[1]] != "") {
            move.vanish.push(
              new PiPo({
                x: bs[0],
                y: bs[1],
                c: this.getColor(bs[0], bs[1]),
                p: this.getPiece(bs[0], bs[1])
              })
            );
          }
        }
      }
    }
  }

  isLastMove(move) {
    return !move.next && !["daisy", "toadette", "kingboo"].includes(move.egg);
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

  getEggEffect(move) {
    const getRandomPiece = (c) => {
      let bagOfPieces = [];
      for (let i=0; i<this.size.x; i++) {
        for (let j=0; j<this.size.y; j++) {
          const pieceIJ = this.getPiece(i, j);
          if (
            this.getColor(i, j) == c && pieceIJ != 'k' &&
            (
              // The color will change, so pawns on first rank are ineligible
              pieceIJ != 'p' ||
              (c == 'w' && i < this.size.x - 1) || (c == 'b' && i > 0)
            )
          ) {
            bagOfPieces.push([i, j]);
          }
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
          em.luigiEffect = true; //avoid dropping bomb/banana by mistake
        }
        break;
      case "bowser":
        em = new Move({
          appear: [
            new PiPo({
              x: move.end.x,
              y: move.end.y,
              c: color,
              p: V.IMMOBILIZE_CODE[move.appear[0].p]
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
        if (this.board[move.start.x][move.start.y] != "") {
          // Pawn or knight let something on init square
          em.vanish.push(new PiPo({
            x: move.start.x,
            y: move.start.y,
            c: 'a',
            p: this.getPiece(move.start.x, move.start.y)
          }));
        }
        em.koopa = true; //avoid applying effect
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
    if (em && move.egg != "koopa")
      em.noAnimate = true; //static move
    return em;
  }

  getMushroomEffect(move) {
    if (
      typeof move.start.x == "string" || //drop move (toadette)
      ['b', 'r', 'q'].includes(move.vanish[0].p) //slider
    ) {
      return null;
    }
    let step = [move.end.x - move.start.x, move.end.y - move.start.y];
    if (Math.abs(step[0]) == 2 && Math.abs(step[1]) == 0)
      // Pawn initial 2-squares move: normalize step
      step[0] /= 2;
    const nextSquare = [move.end.x + step[0], move.end.y + step[1]];
    let nextMove = null;
    if (
      this.onBoard(nextSquare[0], nextSquare[1]) &&
      (
        this.board[nextSquare[0]][nextSquare[1]] == "" ||
        this.getColor(nextSquare[0], nextSquare[1]) == 'a'
      )
    ) {
      this.playOnBoard(move); //HACK for getBasicMove()
      nextMove = this.getBasicMove([move.end.x, move.end.y], nextSquare);
      this.undoOnBoard(move);
    }
    return nextMove;
  }

  getBombBananaEffect(move, item) {
    const steps = item == V.BANANA
      ? [[1, 0], [-1, 0], [0, 1], [0, -1]]
      : [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    const nextSquare = this.getRandomSquare([move.end.x, move.end.y], steps);
    this.playOnBoard(move); //HACK for getBasicMove()
    const res = this.getBasicMove([move.end.x, move.end.y], nextSquare);
    this.undoOnBoard(move);
    return res;
  }

  displayBonus(move) {
    super.displayMessage(null, move.egg, "bonus-text", 2000);
  }

  atLeastOneMove() {
    return true;
  }

  filterValid(moves) {
    return moves;
  }

  // Kingboo bonus can be animated better:
  customAnimate(move, segments, cb) {
    if (!move.kingboo)
      return 0;
    super.animateMoving(move.end, move.start, null,
                        segments.reverse().map(s => s.reverse()), cb);
    return 1;
  }

};
