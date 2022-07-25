import ChessRules from "/base_rules.js";

export default class BrotherhoodRules extends ChessRules {

  canTake([x1, y1], [x2, y2]) {
    if (!super.canTake([x1, y1], [x2, y2]))
      return false;
    const p1 = this.getPiece(x1, y1),
          p2 = this.getPiece(x2, y2);
    return (p1 != p2 || ['p', 'k'].some(symb => [p1, p2].includes(symb)));
  }

  getCurrentScore() {
    if (this.atLeastOneMove(this.turn))
      return "*";
    // Stalemate = loss
    return (this.turn == 'w' ? "0-1" : "1-0");
  }

};
