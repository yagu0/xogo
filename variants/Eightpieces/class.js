import {FenUtil} from "/utils/setupPieces.js";
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

  get pawnPromotions(x, y) {
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
    else { //x == this.size.x (8)
      lancers.push('c');
      if (y > 0)
        lancers.push('o');
      if (y < this.size.y)
        lancers.push('d');
    }
    return ['q', 'r', 'n', 'b', 'j', 's', 'l'];
  }

  genRandInitBaseFen() {
    const s = FenUtil.setupPieces(
      ['j', 'l', 's', 'q', 'k', 'b', 'n', 'r'],
      {
        randomness: this.options["randomness"],
        between: [{p1: 'k', p2: ['r', 'j']}],
        diffCol: ['bs'],
        range: {'s': [2, 3, 4, 5]},
        flags: ['r', 'j']
      }
    );
    return {
      fen: s.b.join("") + "/pppppppp/8/8/8/8/PPPPPPPP/" +
           s.w.join("").toUpperCase(),
      o: {flags: s.flags}
    };
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    // TODO: state variables (sentry pushes, lancers?)
  }

  pieces(color, x, y) {
    const base_pieces = super.pieces(color, x, y);
    return {
      'j': {
        "class": "jailer",
        moves: [
          {steps: [[0, 1], [0, -1], [1, 0], [-1, 0]]}
        ]
      },
      's': {
        "class": "sentry",
        both: [
          {steps: [[1, 1], [1, -1], [-1, 1], [-1, -1]]}
        ]
      },
      'c': {
        "class": "lancer_N",
        both: [
          {steps: [[-1, 0]]}
        ]
      },
      'd': {
        "class": "lancer_NE",
        both: [
          {steps: [[-1, 1]]}
        ]
      },
      'e': {
        "class": "lancer_E",
        both: [
          {steps: [[0, 1]]}
        ]
      },
      'f': {
        "class": "lancer_SE",
        both: [
          {steps: [[1, 1]]}
        ]
      },
      'g': {
        "class": "lancer_S",
        both: [
          {steps: [[1, 0]]}
        ]
      },
      'h': {
        "class": "lancer_SO",
        both: [
          {steps: [[1, -1]]}
        ]
      },
      'm': {
        "class": "lancer_O",
        both: [
          {steps: [[0, -1]]}
        ]
      },
      'o': {
        "class": "lancer_NO",
        both: [
          {steps: [[-1, -1]]}
        ]
      },
    };
  }

  isImmobilized([x, y]) {
    const color = this.getColor(x, y);
    const oppCol = C.getOppTurn(color);
    const stepSpec = this.getStepSpec(color, x, y, 'j');
    for (let step of stepSpec.both[0].steps) {
      let [i, j] = this.increment([x, y], step);
      if (
        this.onBoard(i, j) &&
        this.board[i][j] == 'j' &&
        this.getColor(i, j) == oppCol
      ) {
          return true;
      }
    }
    return false;
  }

  getSentryPushes(x, y) {
    // TODO: return all squares piece on x, y can be pushed to
    // Simple
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

//idée exception globle dans base_rules.js d'une pièce marquée comme "indirect attack" ?!

  // TODO:::::: under sentry attack?!
  // Is piece (or square) at given position attacked by "oppCol(s)" ?
  underAttack([x, y], oppCols) {
    super.underAttack([x, y], oppCols)
    // An empty square is considered as king,
    // since it's used only in getCastleMoves (TODO?)
    const king = this.board[x][y] == "" || this.isKing(x, y);
    return (
      (
        (!this.options["zen"] || king) &&
        this.findCapturesOn(
          [x, y],
          {
            byCol: oppCols,
            one: true
          }
        )
      )
      ||
      (
        (!!this.options["zen"] && !king) &&
        this.findDestSquares(
          [x, y],
          {
            attackOnly: true,
            one: true
          },
          ([i1, j1], [i2, j2]) => oppCols.includes(this.getColor(i2, j2))
        )
      )
    );
  }


  // TODO::: sentry subturn ???
  // 'color' arg because some variants (e.g. Refusal) check opponent moves
  filterValid(moves, color) {
    color = color || this.turn;
    const oppCols = this.getOppCols(color);
    let kingPos = this.searchKingPos(color);
    return moves.filter(m => {
      this.playOnBoard(m);
      const res = this.trackKingWrap(m, kingPos, (kp) => {
        return !this.underCheck(kp, oppCols);
      });
      this.undoOnBoard(m);
      return res;
    });
  }

};
