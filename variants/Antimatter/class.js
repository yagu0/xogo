import ChessRules from "/base_rules.js";

export default class AntimatterRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: C.Options.styles.filter(s => !["atomic", "madrasi"].includes(s))
    };
  }

  getPotentialMovesFrom([x, y]) {
    let moves = super.getPotentialMovesFrom([x, y]);
    // Handle "matter collisions"
    moves.forEach(m => {
      if (
        m.vanish.length == 2 &&
        m.appear.length == 1 &&
        m.vanish[0].p == m.vanish[1].p &&
        m.vanish[0].c != m.vanish[1].c //for Recycle & Teleport
      ) {
        m.appear.pop();
      }
    });
    return moves;
  }

};
