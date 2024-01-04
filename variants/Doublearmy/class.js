import ChessRules from "/base_rules.js";

export default class DoublearmyRules extends ChessRules {

  static get Options() {
    return {
      select: C.Options.select,
      input: C.Options.input,
      styles: C.Options.styles.filter(s => s != "madrasi")
    };
  }

  pieces(color, x, y) {
    let res = super.pieces(color, x, y);
    return Object.assign(
      {
        'c': {
          "class": "commoner",
          moveas: 'k'
        }
      },
      res
    );
  }

  genRandInitBaseFen() {
    const s = super.genRandInitBaseFen();
    const rows = s.fen.split('/');
    return {
      fen:
        rows[0] + "/" +
        rows[1] + "/" +
        rows[0].replace('k', 'c') + "/" +
        rows[1] + "/" +
        rows[6] + "/" +
        rows[7].replace('K', 'C') + "/" +
        rows[6] + "/" +
        rows[7],
      o: s.o
    };
  }

};
