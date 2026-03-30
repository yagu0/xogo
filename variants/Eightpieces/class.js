// TODO: not all !!!
import {Random} from "/utils/alea.js";
import {ArrayFun} from "/utils/array.js";
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
    // TODO
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
          {steps: [[-1, 0]]}
        ]
      },
      'e': {
        "class": "lancer_E",
        both: [
          {steps: [[-1, 0]]}
        ]
      },
      'f': {
        "class": "lancer_SE",
        both: [
          {steps: [[-1, 0]]}
        ]
      },
      'g': {
        "class": "lancer_S",
        both: [
          {steps: [[-1, 0]]}
        ]
      },
      'h': {
        "class": "lancer_SO",
        both: [
          {steps: [[-1, 0]]}
        ]
      },
      'm': {
        "class": "lancer_O",
        both: [
          {steps: [[-1, 0]]}
        ]
      },
      'o': {
        "class": "lancer_NO",
        both: [
          {steps: [[-1, 0]]}
        ]
      },
    };
  }


  //TODO:::
  isImmobilized([x, y]) {
    const color = this.getColor(x, y);
    const oppCols = this.getOppCols(color);
    const piece = this.getPieceType(x, y);
    const stepSpec = this.getStepSpec(color, x, y, piece);
    const attacks = stepSpec.both.concat(stepSpec.attack);
    for (let a of attacks) {
      outerLoop: for (let step of a.steps) {
        let [i, j] = this.increment([x, y], step);
        let stepCounter = 0;
        while (this.onBoard(i, j) && this.board[i][j] == "") {
          if (a.range <= stepCounter++)
            continue outerLoop;
          [i, j] = this.increment([i, j], step);
        }
        if (
          this.onBoard(i, j) &&
          oppCols.includes(this.getColor(i, j)) &&
          this.getPieceType(i, j) == piece
        ) {
          return true;
        }
      }
    }
    return false;
  }


  // TODO::::::::
  // All possible moves from selected square
  // TODO: generalize usage if arg "color" (e.g. Checkered)
  getPotentialMovesFrom([x, y], color) {
    if (this.subTurnTeleport == 2)
      return [];
    if (typeof x == "string")
      return this.getDropMovesFrom([x, y]);
    if (this.isImmobilized([x, y]))
      return [];
    const piece = this.getPieceType(x, y);
    let moves = this.getPotentialMovesOf(piece, [x, y]);
    if (piece == "p" && this.hasEnpassant && this.epSquare)
      Array.prototype.push.apply(moves, this.getEnpassantCaptures([x, y]));
    if (this.isKing(0, 0, piece) && this.hasCastle)
      Array.prototype.push.apply(moves, this.getCastleMoves([x, y]));
    return this.postProcessPotentialMoves(moves);
  }


  // TODO::::: (sentry pushes [pawn to promotion] ?!)
  postProcessPotentialMoves(moves) {
    /////////
  }

  // TODO:::: or edit this for sentry ???????
  // Build a regular move from its initial and destination squares.
  // tr: transformation
  getBasicMove([sx, sy], [ex, ey], tr) {
    super.getBasicMove(.......)
  }


  // TODO:::::: under sentry attack?!
  // Is piece (or square) at given position attacked by "oppCol(s)" ?
  underAttack([x, y], oppCols) {
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
