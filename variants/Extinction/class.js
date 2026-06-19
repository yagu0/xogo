import ChessRules from "/js/base_rules.js";

export default class ExtinctionRules extends ChessRules {

//  static get Options() {
//    return C.Options;
//  }

  pawnPromotions() {
    return super.pawnPromotions().concat('k');
  }

  filterValid(moves) {
    return moves; //there is no check
  }

  getCurrentScore() {
    const color = this.turn;
    let material = { 'w': {}, 'b': {} };
    this.board.flat().forEach(cell => {
      if (cell != "")
        material[cell.charAt(0)][cell.charAt(1)] = true;
    });
    for (const c of ['w', 'b']) {
      if (Object.keys(material[c]).length < 6)
        return c == 'w' ? "0-1" : "1-0";
    }
    return "*";
  }

};
