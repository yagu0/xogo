import ChessRules from "/base_rules.js";
import {ArrayFun} from "/utils/array.js";
import {Random} from "/utils/alea.js";

export default class GiveawayRules extends ChessRules {

  static get Options() {
    return {
      select: [
        {
          label: "Mode",
          variable: "mode",
          defaut: "suicide",
          options: [
            {label: "Suicide", value: "suicide"},
            {label: "Losers", value: "losers"}
          ]
        }
      ].concat(C.Options.select),
      input: C.Options.input.filter(i => i.variable == "pawnfall"),
      styles: [
        "atomic", "cannibal", "cylinder", "dark",
        "madrasi", "rifle", "teleport", "zen"
      ]
    };
  }

  get hasFlags() {
    return this.options["mode"] == "losers";
  }

  get pawnPromotions() {
    let res = ['q', 'r', 'n', 'b'];
    if (this.options["mode"] == "suicide")
      res.push('k');
    return res;
  }

  genRandInitBaseFen() {
    if (this.options["mode"] == "losers")
      return super.genRandInitBaseFen();

    let fen = "";
    if (this.options["randomness"] == 0)
      fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    else {
      let pieces = { w: new Array(8), b: new Array(8) };
      for (let c of ["w", "b"]) {
        if (c == 'b' && this.options["randomness"] == 1) {
          pieces['b'] = pieces['w'];
          break;
        }
        // Get random squares for every piece, totally freely
        let positions = Random.shuffle(ArrayFun.range(8));
        const composition = ['b', 'b', 'r', 'r', 'n', 'n', 'k', 'q'];
        const rem2 = positions[0] % 2;
        if (rem2 == positions[1] % 2) {
          // Fix bishops (on different colors)
          for (let i=2; i<8; i++) {
            if (positions[i] % 2 != rem2) {
              [positions[1], positions[i]] = [positions[i], positions[1]];
              break;
            }
          }
        }
        for (let i = 0; i < 8; i++)
          pieces[c][positions[i]] = composition[i];
      }
      fen = (
        pieces["b"].join("") +
        "/pppppppp/8/8/8/8/PPPPPPPP/" +
        pieces["w"].join("").toUpperCase()
      );
    }
    return { fen: fen, o: {} };
  }

  constructor(o) {
    o.options["capture"] = true;
    super(o);
  }

  underCheck(square, oppCol) {
    if (this.options["mode"] == "suicide")
      return false;
    return super.underCheck(square, oppCol);
  }

  getCurrentScore() {
    if (this.atLeastOneMove(this.turn))
      return "*";
    // No valid move: the side who cannot move wins
    return (this.turn == "w" ? "1-0" : "0-1");
  }

};
