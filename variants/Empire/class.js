import ChessRules from "/js/base_rules.js";
import {FenUtil} from "/utils/setupPieces.js" //required?

export default class EmpireRules extends ChessRules {

  // TODO: options ?
  static get Options() {
    return C.Options;
  }

  // TODO: adapt
  static GenRandInitFen(options) {
    if (options.randomness == 0)
      return "rnbqkbnr/pppppppp/8/8/8/PPPSSPPP/8/TECDKCET w 0 ah -";

    // Mapping kingdom --> empire:
    const piecesMap = {
      'R': 'T',
      'N': 'E',
      'B': 'C',
      'Q': 'D',
      'K': 'K'
    };

    const baseFen = ChessRules.GenRandInitFen(options);
    return (
      baseFen.substr(0, 24) + "PPPSSPPP/8/" +
      baseFen.substr(35, 8).split('').map(p => piecesMap[p]).join('') +
      baseFen.substr(43, 5) + baseFen.substr(50)
    );
  }

  pawnPromotions() {
    return ['q'];
  }

  pieceDef() {
    // TODO : + adjust pieces() ====> pieceDef() everywhere
  }

  filterValid(moves) {
    return super.filterValid(moves).filter(m => {
      // TODO: filter out moves letting kings facing each other
    });
  }

  getCurrentScore() {
    // Turn has changed:
    const color = C.GetOppTurn(this.turn);
    const lastRank = (color == 'w' ? 0 : 7);
    if (this.kingPos[color][0] == lastRank)
      // The opposing edge is reached!
      return (color == "w" ? "1-0" : "0-1");
    if (this.atLeastOneMove())
      return "*";
    // Game over
    return (this.turn == "w" ? "0-1" : "1-0");
  }

};
