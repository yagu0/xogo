import {FenUtil} from "/utils/setupPieces.js";
import ChessRules from "/base_rules.js";
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

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    //this.pushFrom = 
    //this.afterPush = 
  }

  // TODO: FEN utils pushFrom et afterPush

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


// TODO: finish lancers
  // http://ftp.chessvariants.com/rules/8-piece-chess


  getPotentialMovesFrom([x, y], color) {
    if (!this.pushFrom) {
      return this.getPassMoves(x, y).concat(
        super.getPotentialMovesFrom([x, y], color) );
    }
    if (x != this.pushFrom.x || y != this.pushFrom.y)
      return [];
    // After sentry "attack": move enemy as if it was ours
    return []; //TODO
  }

  getSentryPushes(x, y) {
    // TODO: return all squares piece on x, y can be pushed to
    return [{x: x+1, y: y-1}];
  }

  // Post-process sentry pushes (if any), regular lancer moves, lancer drops..
  postProcessPotentialMoves(moves) {
    moves = super.postProcessPotentialMoves(moves);
    let finalMoves = [];
    for (const m of moves) {
      //if (m.vanish.length == 0 && ... TODO: drop
      if (m.vanish.length > 0 && V.LANCERS.includes(m.vanish[0].p)) {
        // TODO: how to know it's regular? (not sentry push)
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
        // Sentry "capture" --> turn into pushes
        const [x, y] = [m.end.x, m.end.y]
        const p = this.getPiece(x, y);
        const c = this.getColor(x, y);
        this.getSentryPushes(x, y).forEach(sq => {
          finalMoves.push( new Move({
            appear: m.appear.concat(new PiPo({x:sq.x, y:sq.y, p:p, c:c})),
            vanish: m.vanish
          }) );
        });
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
      piece = 'c'; //TODO: orientation, or new drawing?
    super.updateReserve(color, piece, count);
  }

};
