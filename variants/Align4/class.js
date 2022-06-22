import ChessRules from "/base_rules.js";

export default class Align4Rules extends ChessRules {

  static get Options() {
    return {
      select: [{
        label: "Randomness",
        variable: "randomness",
        defaut: 0,
        options: [
          {label: "Deterministic", value: 0},
          {label: "Random", value: 1}
        ]
      }],
      styles: ["atomic", "capture", "cylinder"]
    };
  }

  get hasReserve() {
    return true;
  }
  get hasReserveFen() {
    return false;
  }

  genRandInitFen(seed) {
    const baseFen = super.genRandInitFen(seed);
    return "4k3/8" + baseFen.substring(17, 50) + " -"; //TODO: + flags 1188
  }

  setOtherVariables(fenParsed) {
    super.setOtherVariables(fenParsed);
    this.reserve = { b: { p: 1 } };
  }

  // Just do not update any reserve (infinite supply)
  updateReserve() {}

  getCastleMoves([x, y]) {
    if (this.GetColor(x, y) == 'b')
      return [];
    return super.getCastleMoves([x, y]);
  }

  getCurrentScore(move) {
    const score = super.getCurrentScore(move);
    if (score != "*")
      return score;
    // Check pawns connection:
    for (let i = 0; i < this.size.x; i++) {
      for (let j = 0; j < this.size.y; j++) {
        if (
          this.board[i][j] != "" &&
          this.getColor(i, j) == 'b' &&
          this.getPiece(i, j) == 'p'
        ) {
          // Exploration "rightward + downward" is enough
          for (let step of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
            let [ii, jj] = [i + step[0], j + step[1]];
            let kounter = 1;
            while (
              this.onBoard(ii, jj) &&
              this.board[ii][jj] != "" &&
              this.getColor(ii, jj) == 'b' &&
              this.getPiece(ii, jj) == 'p'
            ) {
              kounter++;
              ii += step[0];
              jj += step[1];
            }
            if (kounter == 4)
              return "0-1";
          }
        }
      }
    }
    return "*";
  }

};
