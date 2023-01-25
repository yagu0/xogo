import ChessRules from "/base_rules.js";

export default class AbstractFlipRules extends ChessRules {

  // For games without captures (replaced by flips)
  get hasEnpassant() {
    return false;
  }
  canTake() {
    return false;
  }
  filterValid(moves) {
    return moves;
  }
  underCheck() {
    return false;
  }

  playOnBoard(move) {
    super.playOnBoard(move);
    this.flipColorOf(move.flips);
  }
  undoOnBoard(move) {
    super.undoOnBoard(move);
    this.flipColorOf(move.flips);
  }

  flipColorOf(flips) {
    for (let xy of flips) {
      const newColor = C.GetOppTurn(this.getColor(xy.x, xy.y));
      this.board[xy.x][xy.y] = newColor + this.board[xy.x][xy.y][1];
    }
  }

  playVisual(move, r) {
    super.playVisual(move, r);
    move.flips.forEach(f => {
      this.g_pieces[f.x][f.y].classList.toggle("white");
      this.g_pieces[f.x][f.y].classList.toggle("black");
    });
  }

};
