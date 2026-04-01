import {FenUtil} from "/utils/setupPieces.js";
import ChessRules from "/base_rules.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export default class EightpiecesRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: ["crazyhouse", "cylinder", "doublemove", "progressive",
        "recycle", "rifle", "teleport", "zen"]
    };
  }

  pawnPromotions(x, y) {
    const base_pieces = ['q', 'r', 'n', 'b', 'j', 's'];
    let lancers = [];
    if (y > 0)
      lancers.push('m');
    if (y < this.size.y)
      lancers.push('e');
    if (x == 0) {
      lancers.push('g');
      if (y > 0)
        lancers.push('h');
      if (y < this.size.y)
        lancers.push('f');
    }
    else { //x == this.size.x-1 (7)
      lancers.push('c');
      if (y > 0)
        lancers.push('o');
      if (y < this.size.y)
        lancers.push('d');
    }
    return base_pieces.concat(lancers);
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
      fen: fen,
      o: {flags: s.flags}
    };
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

  getPotentialMovesFrom([x, y], color) {
    if (!this.pushFrom)
      return super.getPotentialMovesFrom([x, y], color);
    if (x != this.pushFrom.x || y != this.pushFrom.y)
      return [];
    // After sentry "attack": move enemy as if it was ours
    return []; //TODO
  }

  getSentryPushes(x, y) {
    // TODO: return all squares piece on x, y can be pushed to
    return [{x: x+1, y: y-1}];
  }

  // Post-process sentry pushes (if any)
  postProcessPotentialMoves(moves) {
    let finalMoves = [];
    for (const m of moves) {
      if (m.vanish.length == m.appear.length || m.vanish[0].p != 's')
        finalMoves.push(m);
      else {
        // Sentry "capture" --> turn into pushes
        const [x, y] = [m.end.x, m.end.y]
        const p = this.getPiece(x, y);
        const c = this.getColor(x, y);
        const squares = this.getSentryPushes(x, y);
        for (const sq of squares) {
          finalMoves.push( new Move({
            appear: m.appear.concat(new PiPo({x:sq.x, y:sq.y, p:p, c:c})),
            vanish: m.vanish
          }) );
        }
      }
    }
    return finalMoves;
  }

  underAttack() {
    // TODO: check enemy sentry(ies), for each, check all of our own pieces which attack the square (if belonging to opponent!). Then, call :
    return super.undeerAttack();
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

};
