import ChessRules from "/base_rules.js";

export default class BerolinaRules extends ChessRules {

//TODO: Berolina pawns in Utils, also captures for Baroque+Fugue+...

  pieces(color, x, y) {
      const pawnShift = (color == "w" ? -1 : 1);
      let res = super.pieces(color, x, y);
      res['p'].moves = [
        {
          steps: [[pawnShift, 1], [pawnShift, -1]],
          range: 1
        }
      ];
      res['p'].attack = [
        {
          steps: [[pawnShift, 0]],
          range: 1
        }
      ];
      return res;
    }

};
