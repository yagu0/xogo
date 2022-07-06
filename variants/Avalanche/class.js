import ChessRules from "/base_rules.js";
import PiPo from "/utils/PiPo.js";
import Move from "/utils/Move.js";

export default class AvalancheRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      styles: [
        "atomic",
        "cannibal",
        "capture",
        "crazyhouse",
        "cylinder",
        "dark",
        "madrasi",
        "recycle",
        "rifle",
        "teleport",
        "zen"
      ]
    };
  }

  get hasEnpassant() {
    return false;
  }

  getPartFen(o) {
    return Object.assign(
      {promotion: o.init ? false : this.promotion},
      super.getPartFen(o)
    );
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    this.promotion = (fenParsed.promotion == '1');
    this.subTurn = 1 - (this.promotion ? 1 : 0);
  }

  doClick(coords) {
    const myLastRank = (this.turn == 'w' ? 0 : this.size.x - 1);
    if (
      this.subTurn != 0 ||
      coords.x != myLastRank ||
      this.getPiece(coords.x, coords.y) != 'p'
    ) {
      return null;
    }
    let moves = [];
    this.pawnPromotions.forEach(pr => {
      moves.push(
        new Move({
          vanish: [new PiPo({x: coords.x, y: coords.y, c: this.turn, p: 'p'})],
          appear: [new PiPo({x: coords.x, y: coords.y, c: this.turn, p: pr})]
        })
      );
    });
    super.showChoices(moves);
  }

  canIplay(x, y) {
    const pieceColor = this.getColor(x, y);
    return (
      this.playerColor == this.turn &&
      (
        (this.subTurn <= 1 && pieceColor == this.playerColor) ||
        (
          this.subTurn == 2 &&
          pieceColor != this.playerColor &&
          this.getPiece(x, y) == 'p'
        )
      )
    );
  }

  getPotentialMovesFrom([x, y]) {
    if (this.subTurn == 0)
      return [];
    if (this.subTurn == 1)
      // Usual case:
      return super.getPotentialMovesFrom([x, y]);
    // subTurn == 2: only allowed to push an opponent's pawn (if possible)
    const oppPawnShift = (this.turn == 'w' ? 1 : -1);
    if (
      this.onBoard(x + oppPawnShift, y) &&
      this.board[x + oppPawnShift][y] == ""
    ) {
      return [this.getBasicMove([x, y], [x + oppPawnShift, y])];
    }
    return [];
  }

  filterValid(moves) {
    if (this.subTurn != 1)
      return moves; //self-checks by pawns are allowed
    return super.filterValid(moves);
  }

  atLeastOnePawnPush(color) {
    const pawnShift = (color == 'w' ? -1 : 1);
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (
          this.board[i][j] != "" &&
          this.getColor(i, j) == color &&
          this.getPiece(i, j) == 'p' &&
          this.board[i + pawnShift][j] == ""
        ) {
          return true;
        }
      }
    }
    return false;
  }

  postPlay(move) {
    const color = this.turn;
    const oppCol = C.GetOppCol(color);
    this.promotion = (
      this.subTurn == 2 &&
      move.end.x == (oppCol == 'w' ? 0 : this.size.x - 1) &&
      move.vanish[0].p == 'p'
    );
    if (this.subTurn == 0) {
      this.subTurn++;
      if (!this.atLeastOneMove(color)) {
        move.result = "1/2"; //avoid re-computation
        this.turn = oppCol;
      }
    }
    else if (this.subTurn == 2) {
      this.turn = oppCol;
      this.subTurn = this.promotion ? 0 : 1;
    }
    else { //subTurn == 1, usual case
      const kingCapture = this.searchKingPos(oppCol).length == 0;
      if (kingCapture)
        move.result = (color == 'w' ? "1-0" : "0-1");
      if (!kingCapture && this.atLeastOnePawnPush(oppCol))
        this.subTurn++;
      else {
        this.turn = oppCol;
        this.subTurn = this.promotion ? 0 : 1;
      }
    }
  }

  atLeastOneMove(color, lastMove) {
    if (this.subTurn == 0)
      return true;
    return super.atLeastOneMove(color);
  }

};
