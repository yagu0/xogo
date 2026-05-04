import {FenUtil} from "/utils/setupPieces.js";
import ChessRules from "/js/base_rules.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export default class EightpiecesRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: ["crazyhouse", "cylinder", "recycle", "teleport"]
    };
  }

  getLancerOptions(x, y) {
    let options = [];
    if (y > 0)
      options.push('m');
    if (y < this.size.y)
      options.push('e');
    if (x < this.size.x) {
      options.push('g');
      if (y > 0)
        options.push('h');
      if (y < this.size.y)
        options.push('f');
    }
    if (x > 0) {
      options.push('c');
      if (y > 0)
        options.push('o');
      if (y < this.size.y)
        options.push('d');
    }
    return options;
  }

  pawnPromotions(x, y) {
    const base_pieces = ['q', 'r', 'n', 'b', 'j', 's'];
    let lancer_orients = this.getLancerOptions(x, y);
    return base_pieces.concat(lancer_orients);
  }

  genRandInitBaseFen() {
    let s = FenUtil.setupPieces(
      ['j', 'l', 's', 'q', 'k', 'b', 'n', 'r'],
      {
        randomness: this.options["randomness"],
        between: [{p1: 'k', p2: ['r', 'j']}],
        diffCol: ['bs'],
        range: {'s': [2, 3, 4, 5]},
        flags: ['r', 'j']
      }
    );
    const random = (this.options["randomness"] > 0);
    const fen = s.b.join("").replace('l', random ? 'g' : 'f') +
      "/pppppppp/8/8/8/8/PPPPPPPP/" +
      s.w.join("").replace('l', random > 0 ? 'c' : 'd').toUpperCase();
    return {
      fen: 'jfs1kb1r/1P3ppp/3p1q2/p7/2P5/8/P2PPPPP/J1SQKBNR', //     fen,
      o: {flags: s.flags}
    };
  }

  static get LANCERS() {
    return ['c', 'd', 'e', 'f', 'g', 'h', 'm', 'o'];
  }

  // obj == "-", {-1,-1} or ["]{x,y}["]
  static convertPush(obj) {
    if (typeof obj === "string")
      // Reading from FEN
      return obj == "-" ? {x: -1, y: -1} : JSON.parse(obj);
    // Sending to FEN
    return obj.x < 0 ? "-" : JSON.stringify(obj);
  }

  getPartFen(o) {
    return Object.assign(
      {
        pushFrom: o.init ? "-" : V.convertPush(this.pushFrom),
        pushedTo: o.init ? "-" : V.convertPush(this.pushedTo)
      },
      super.getPartFen(o)
    );
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    this.pushFrom = V.convertPush(fenParsed.pushFrom);
    this.pushedTo = V.convertPush(fenParsed.pushedTo);
  }

  pieces(color, x, y) {
    const mirror = (this.playerColor == 'b');
    return Object.assign({
      'j': {
        "class": "jailer",
        moves: [
          {steps: [[0, 1], [0, -1], [1, 0], [-1, 0]]}
        ]
      },
      's': {
        "class": "sentry",
        indirectAttack: true,
        both: [
          {steps: [[1, 1], [1, -1], [-1, 1], [-1, -1]]}
        ]
      },
      'c': {
        "class": mirror ? "lancer_S" : "lancer_N",
        both: [
          {steps: [[-1, 0]]}
        ]
      },
      'd': {
        "class": mirror ? "lancer_SO" : "lancer_NE",
        both: [
          {steps: [[-1, 1]]}
        ]
      },
      'e': {
        "class": mirror ? "lancer_O" : "lancer_E",
        both: [
          {steps: [[0, 1]]}
        ]
      },
      'f': {
        "class": mirror ? "lancer_NO" : "lancer_SE",
        both: [
          {steps: [[1, 1]]}
        ]
      },
      'g': {
        "class": mirror ? "lancer_N" : "lancer_S",
        both: [
          {steps: [[1, 0]]}
        ]
      },
      'h': {
        "class": mirror ? "lancer_NE" : "lancer_SO",
        both: [
          {steps: [[1, -1]]}
        ]
      },
      'm': {
        "class": mirror ? "lancer_E" : "lancer_O",
        both: [
          {steps: [[0, -1]]}
        ]
      },
      'o': {
        "class": mirror ? "lancer_SE" : "lancer_NO",
        both: [
          {steps: [[-1, -1]]}
        ]
      },
    }, super.pieces(color, x, y));
  }

  canStepOver(i, j, p, c) {
    const colIJ = this.getColor(i, j);
    return this.board[i][j] == "" || (V.LANCERS.includes(p) && c == colIJ);
  }

  canIplay(x, y) {
    if (
      this.pushFrom.x == x && this.pushFrom.y == y &&
      this.getColor(x, y) != this.playerColor
    ) {
      return true;
    }
    return super.canIplay(x, y);
  }

  isImmobilized([x, y]) {
    const color = this.getColor(x, y);
    const oppCol = C.GetOppTurn(color);
    const stepSpec = this.getStepSpec(color, x, y, 'j');
    for (let step of stepSpec.moves[0].steps) {
      let [i, j] = this.increment([x, y], step);
      if (
        this.onBoard(i, j) &&
        this.getPiece(i, j) == 'j' &&
        this.getColor(i, j) == oppCol
      ) {
        return true;
      }
    }
    return false;
  }

  getPassMoves(x, y) {
    const col = this.getColor(x, y);
    let res = [];
    if (this.getPiece(x, y) == 'k') {
      for (let i of [-1, 1]) {
        for (let j of [-1, 1]) {
          if (
            this.onBoard(x + i, y + j) &&
            this.getPiece(x + i, y + j) == 'j' &&
            this.getColor(x + i, y + j) != col
          ) {
            res.push( new Move({
              appear: [],
              vanish: [],
              start: {x: x, y: y},
              end: {x: x + i, y: y + j}
            }) );
          }
        }
      }
    }
    return res;
  }

  getPotentialMovesFrom([x, y], color) {
    if (this.pushFrom.x < 0 || this.pushedTo.x >= 0) {
      let smoves = super.getPotentialMovesFrom([x, y], color);
      // Forbid direction x,y --> pushFrom if x,y == pushedTo
      if (x == this.pushedTo.x && y == this.pushedTo.y) {
        smoves = smoves.filter(m => {
          return ( !super.compatibleStep(
            [x, y], [m.end.x, m.end.y],
            [this.pushFrom.x - x, this.pushFrom.y - y]
          ) );
        });
      }
      return smoves.concat(this.getPassMoves(x, y));
    }
    // pushFrom.x >= 0 && pushedTo.x < 0
    if (x != this.pushFrom.x || y != this.pushFrom.y)
      return [];
    // After sentry "attack": move enemy as if it was ours
    const p = this.getPiece(x, y);
    this.board[x][y] = this.turn + p;
    let pmoves = super.getPotentialMovesFrom([x, y], this.turn);
    const oppCol = C.GetOppTurn(this.turn)
    this.board[x][y] = oppCol + p;
    pmoves.forEach(m => {
      m.appear[0].c = m.vanish[0].c = oppCol;
      m.appear.push( new PiPo({x:x, y:y, p:'s', c:this.turn}) );
    });
    
console.log(pmoves);

    return pmoves;



  }

  postPlay(move) {
    if (
      move.vanish.length > 0 &&
      move.vanish[0].p == 's' &&
      move.appear[0].c != move.vanish[0].c
    ) {
      // Sentry push ("capturing" part)
      this.pushFrom = {x: move.end.x, y: move.end.y};
      this.pushedTo = {x: -1, y: -1};
    }
    else if (move.vanish.length > 0 && move.vanish[0].c != this.turn)
      this.pushedTo = {x: move.end.x, y: move.end.y};
    else {
      // All other cases: just reset both push variables
      this.pushFrom = {x: -1, y: -1};
      this.pushedTo = {x: -1, y: -1};
    }
    super.postPlay(move);
  }

  isLastMove(move) {
    if (move.vanish[0].p == 's' && move.appear[0].c != move.vanish[0].c)
      return false;
    return super.isLastMove(move);
  }

  postProcessPotentialMoves(moves) {
    moves = super.postProcessPotentialMoves(moves);
    let finalMoves = [];
    for (const m of moves) {
      // Reorient a lancer after drop or regular move
      if (
        (m.vanish.length == 0 && ['c', 'g'].includes(m.appear[0].p)) ||
        (
          (m.vanish.length > 0 && V.LANCERS.includes(m.vanish[0].p)) &&
          // Next line test checks that the lancer wasn't just pushed away
          (m.start.x != this.pushFrom.x || m.start.y != this.pushFrom.y)
        )
      ) {
        this.getLancerOptions(m.end.x, m.end.y).forEach(o => {
          finalMoves.push( new Move({
            appear: [new PiPo({x:m.end.x,y:m.end.y,c:m.appear[0].c,p:o})],
            vanish: m.vanish
          }) );
        });
      }
      else if (m.vanish.length == m.appear.length || m.vanish[0].p != 's')
        finalMoves.push(m);
      else {
        // Sentry "capture" --> remove sentry from final square (TODO: blink?)
        const [x, y] = [m.end.x, m.end.y]
        const p = this.getPiece(x, y);
        const c = this.getColor(x, y);
        finalMoves.push( new Move({
          appear: [new PiPo({x:m.end.x,y:m.end.y,c:c,p:p})],
          vanish: [ m.vanish[0] ]
        }) );
      }
    }
    return finalMoves;
  }

  underAttack([x, y], oppCols) {
    // TODO: check enemy sentry(ies), for each, check all of our own pieces which attack the square (if belonging to opponent!). Then, call :
    return super.underAttack([x, y], oppCols);
  }

  // Lazy sentry attacks check: after push move
  filterValid(moves, color) {
    let sentryAttack = [];
    moves = moves.filter(m => {
      if (m.appear.length == 0) {
        sentryAttack.push(m);
        return false;
      }
      return true;
    });
    return super.filterValid(moves, color).concat(sentryAttack);
  }

  updateReserve(color, piece, count) {
    if (V.LANCERS.includes(piece))
      // Show only one lancer orientation, and reorient when drop:
      piece = color == 'w' ? 'c' : 'g';
    super.updateReserve(color, piece, count);
  }

};
