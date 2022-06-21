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
          moves: [],
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
      specials, bowsered, super.pieces(color, x, y));
  }

  genRandInitFen(seed) {
    const options = Object.assign({mode: "suicide"}, this.options);
    const gr = new GiveawayRules({options: options, genFenOnly: true});
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
    // Change seed (after FEN generation!!)
    // so that further calls differ between players:
    Random.setSeed(Math.floor(19840 * Math.random()));
  }

  // For Toadette bonus
  getDropMovesFrom([c, p]) {
    if (typeof c != "string" || this.reserve[c][p] == 0)
      return [];
    let moves = [];
    const start = (c == 'w' && p == 'p' ? 1 : 0);
    const end = (c == 'b' && p == 'p' ? 7 : 8);
    for (let i = start; i < end; i++) {
      for (let j = 0; j < this.size.y; j++) {
        const pieceIJ = this.getPiece(i, j);
        const colIJ = this.getColor(i, j);
        if (this.board[i][j] == "" || colIJ == 'a' || pieceIJ == 'i') {
          let m = new Move({
            start: {x: c, y: p},
            appear: [new PiPo({x: i, y: j, c: c, p: p})],
            vanish: []
          });
          // A drop move may remove a bonus (or hidden queen!)
          if (this.board[i][j] != "")
            m.vanish.push(new PiPo({x: i, y: j, c: colIJ, p: pieceIJ}));
          moves.push(m);
        }
      }
    }
    return moves;
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
          moves = this.getPotentialMovesOf(piece, [x, y]);
          break;
      }
    }
    return moves;
  }

  canStepOver(i, j) {
    return (
      this.board[i][j] == "" ||
      ['i', V.EGG, V.MUSHROOM].includes(this.getPiece(i, j))
    );
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
    this.pawnPostProcess(moves, color, oppCol);
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
          im.appear[0].p = 'i';
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
      let shellCaptures = this.getPotentialMovesOf('y', [x, y]);
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
    if (
      move.appear.length > 0 &&
      move.appear[0].p == 'p' &&
      (
        (color == 'w' && move.end.x == 0) ||
        (color == 'b' && move.end.x == this.size.x - 1)
      )
    ) {
      // "Forgotten" promotion, which occurred after some effect
      let moves = [move];
      super.pawnPostProcess(moves, color, oppCol);
      super.showChoices(moves);
      return false;
    }
    if (!move.nextComputed) {
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
      if (!move.next && move.appear.length > 0 && !move.kingboo) {
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
      move.nextComputed = true;
    }
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
            if (pieceIJ == 'i') {
              move.vanish.push(new PiPo({x: i, y: j, c: oppCol, p: 'i'}));
              move.appear.push(new PiPo({x: i, y: j, c: oppCol, p: 'q'}));
            }
            else if (pieceIJ == '?')
              move.vanish.push(new PiPo({x: i, y: j, c: oppCol, p: '?'}));
          }
        }
      }
    }
    if (!move.next && !["daisy", "toadette", "kingboo"].includes(move.egg)) {
      this.turn = oppCol;
      this.movesCount++;
    }
    if (move.egg)
      this.displayBonus(move);
    this.playOnBoard(move);
    this.nextMove = move.next;
    return true;
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
    if (typeof move.start.x == "string") //drop move (toadette)
      return null;
    let step = [move.end.x - move.start.x, move.end.y - move.start.y];
    if ([0, 1].some(i => Math.abs(step[i]) >= 2 && Math.abs(step[1-i]) != 1)) {
      // Slider, multi-squares: normalize step
      for (let j of [0, 1])
        step[j] = step[j] / Math.abs(step[j]) || 0;
    }
    const nextSquare = [move.end.x + step[0], move.end.y + step[1]];
    const afterSquare =
      [nextSquare[0] + step[0], nextSquare[1] + step[1]];
    let nextMove = null;
    if (this.onBoard(nextSquare[0], nextSquare[1])) {
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
    let divBonus = document.createElement("div");
    divBonus.classList.add("bonus-text");
    divBonus.innerHTML = move.egg;
    let container = document.getElementById(this.containerId);
    container.appendChild(divBonus);
    setTimeout(() => container.removeChild(divBonus), 2000);
  }

  atLeastOneMove() {
    return true;
  }

  filterValid(moves) {
    return moves;
  }

  playPlusVisual(move, r) {
    const nextLines = () => {
      if (!this.play(move))
        return;
      this.moveStack.push(move);
      this.playVisual(move, r);
      if (this.nextMove)
        this.playPlusVisual(this.nextMove, r);
      else {
        this.afterPlay(this.moveStack);
        this.moveStack = [];
      }
    };
    if (this.moveStack.length == 0)
      nextLines();
    else
      this.animate(move, nextLines);
  }

};
