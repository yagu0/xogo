import ChessRules from "/base_rules.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export default class BarioRules extends ChessRules {

  static get Options() {
    return {
      // TODO: Zen too?
      styles: [
        "atomic", "cannibal", "capture", "cylinder",
        "dark", "madrasi", "rifle", "teleport"
      ]
    };
  }

  // Does not really seem necessary (although the author mention it)
  // Instead, first move = pick a square for the king.
  get hasFlags() {
    return false;
  }
  get hasReserve() {
    return true;
  }

  pieces(color, x, y) {
    return Object.assign(
      {
        'u': {
          "class": "undefined",
          moves: []
        }
      },
      super.pieces(color, x, y)
    );
  }

  get onlyClick() {
    return this.movesCount <= 1;
  }

  // Initiate the game by choosing a square for the king:
  doClick(coords) {
    const color = this.turn;
    if (
      this.movesCount <= 1 &&
      (
        (color == 'w' && coords.x == this.size.x - 1) ||
        (color == 'b' && coords.x == 0)
      )
    ) {
      return new Move({
        appear: [ new PiPo({x: coords.x, y: coords.y, c: color, p: 'k' }) ],
        vanish: [ new PiPo({x: coords.x, y: coords.y, c: color, p: 'u' }) ]
      });
    }
    return null;
  }

  genRandInitBaseFen() {
    return {
      fen: "uuuuuuuu/pppppppp/8/8/8/8/PPPPPPPP/UUUUUUUU",
      o: {}
    }
  }

  getPartFen(o) {
    return Object.assign(
      {
        captureUndef: (o.init || !this.captureUndef)
          ? "-"
          : C.CoordsToSquare(this.captureUndef)
      },
      super.getPartFen(o)
    );
  }

  getReserveFen(o) {
    if (o.init)
      return "22212221";
    return (
      ["w","b"].map(c => Object.values(this.reserve[c]).join("")).join("")
    );
  }

  initReserves(reserveStr) {
    super.initReserves(reserveStr, ['r', 'n', 'b', 'q']);
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    this.captureUndef = fenParsed.captureUndef == '-'
      ? null :
      C.SquareToCoords(fenParsed.captureUndef);
    this.definition = null;
  }

  canDrop([c, p], [i, j]) {
    switch (this.subTurn) {
      case 0:
        return i == this.captureUndef.x && j == this.captureUndef.y;
      case 1:
        return this.getPiece(i, j) == 'u' && c == this.getColor(i, j);
    }
    return false; //never reached
  }

  getPotentialMovesFrom([x, y]) {
    if (this.movesCount <= 1)
      return [];
    let moves = [];
    switch (this.subTurn) {
      case 0:
        if (typeof x == "string")
          moves = this.getDropMovesFrom([x, y]);
        break;
      case 1:
        // Both normal move (from defined piece) and definition allowed
        if (typeof x == "string")
          moves = this.getDropMovesFrom([x, y]);
        else if (this.getPiece(x, y) != 'u')
          moves = super.getPotentialMovesFrom([x, y]);
        break;
      case 2:
        // We can only move the just-defined piece
        if (x == this.definition.x && y == this.definition.y)
          moves = super.getPotentialMovesFrom([x, y]);
        break;
    }
    return moves;
  }

  filterValid(moves) {
    if (this.movesCount <= 1 || this.subTurn == 0)
      return moves;
    if (this.subTurn == 1) {
      // Remove defining moves with un-movable def piece
      moves = moves.filter(m => {
        if (m.vanish.length >= 2 || m.vanish[0].p != 'u')
          return true;
        this.playOnBoard(m);
        const canMove = super.filterValid(
          super.getPotentialMovesFrom([m.end.x, m.end.y])).length >= 1;
        this.undoOnBoard(m);
        return canMove;
      });
    }
    return super.filterValid(moves);
  }

  atLeastOneMove(color) {
    if (this.subTurn != 1)
      return true;
    return super.atLeastOneMove(color);
  }

  // TODO: this method fails to detect undefined checks
  underCheck(square_s, oppCol) {
    if (super.underCheck(square_s, oppCol))
      return true;
    // Check potential specializations of undefined using reserve:
    const allAttacks = Array.prototype.concat.apply(
      ['r', 'n', 'b', 'q'].map(p => this.pieces()[p].moves[0]));
    const [x, y] = [square_s[0], square_s[1]];
    for (let i=0; i<this.size.x; i++) {
      for (let j=0; j<this.size.y; j++) {
        if (
          this.board[i][j] != "" &&
          this.getColor(i, j) == oppCol &&
          this.getPiece(i, j) == 'u'
        ) {
          for (let stepDef of allAttacks) {
            for (let s of stepDef.steps) {
              if (!super.compatibleStep([i, j], [x, y], s, stepDef.range))
                continue;
              if (
                super.findDestSquares(
                  [i, j],
                  {
                    captureTarget: [x, y],
                    captureSteps: [{steps: [s], range: stepDef.range}],
                    segments: false,
                    attackOnly: true,
                    one: false
                  }
                )
              ) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  // TODO: missing "undefined reset" check (is everything defined? If yes, reset if enough variety)
  postPlay(move) {
    const color = this.turn;
    const toNextPlayer = () => {
      this.turn = C.GetOppCol(color);
      this.movesCount++;
    };
    if (this.movesCount <= 1) {
      toNextPlayer();
      return;
    }
    const captureUndef = (
      move.vanish.length == 2 &&
      move.vanish[1].c != color &&
      move.vanish[1].p == 'u'
    );
    if (typeof move.start.x == "number" && !captureUndef)
      // Normal move (including Teleport)
      super.postPlay(move);
    else if (typeof move.start.x == "string") {
      this.reserve[color][move.appear[0].p]--;
      if (move.vanish.length == 1 && move.vanish[0].p == 'u')
        this.definition = move.end;
      this.subTurn++;
    }
    else {
      this.subTurn = 0;
      this.captureUndef = move.end;
      toNextPlayer();
    }
  }

  isLastMove() {
    return true; //called only on normal moves (not Teleport)
  }

  getCurrentScore(move_s) {
    return (this.movesCount <= 2 ? "*" : super.getCurrentScore(move_s));
  }

};
