import ChessRules from "/base_rules.js";

export default class CrossingRules extends ChessRules {

  getSvgChessboard() {
    let svg = super.getSvgChessboard();
    return (
      svg.slice(0, -6) +
      '<line x1="0" y1="40" x2="80" y2="40" ' +
      'style="stroke:black;stroke-width:0.2"/></svg>'
    );
  }

  getCurrentScore(move_s) {
    const res = super.getCurrentScore(move_s);
    if (res != "*")
      return res;
    // Turn has changed:
    const color = V.GetOppTurn(this.turn);
    const secondHalf = (color == 'w' ? [0, 1, 2, 3] : [4, 5, 6, 7]);
    for (let move of move_s) {
      if (
        move.appear.length >= 1 &&
        move.appear[0].p == 'k' &&
        secondHalf.includes(move.appear[0].x)
      ) {
        // Half-board is crossed
        return color == "w" ? "1-0" : "0-1";
      }
    }
    return "*";
  }

};
