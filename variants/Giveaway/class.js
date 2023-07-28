import ChessRules from "/base_rules.js";
import {ArrayFun} from "/utils/array.js";
import {Random} from "/utils/alea.js";
import {FenUtil} from "/utils/setupPieces.js";

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
    let setupOpts = {
      randomness: this.options["randomness"],
      diffCol: ['b']
    };
    if (this.options["mode"] == "losers") {
      setupOpts["between"] = [{p1: 'k', p2: 'r'}];
      setupOpts["flags"] = ['r'];
    }
    const s = FenUtil.setupPieces(
      ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'], setupOpts);
    return {
      fen: s.b.join("") + "/pppppppp/8/8/8/8/PPPPPPPP/" +
           s.w.join("").toUpperCase(),
      o: {flags: s.flags}
    };
  }

  constructor(o) {
    o.options["capture"] = true;
    super(o);
  }

  underCheck(square_s, oppCol) {
    if (this.options["mode"] == "suicide")
      return false;
    return super.underCheck(square_s, oppCol);
  }

  getCurrentScore() {
    if (this.atLeastOneMove(this.turn))
      return "*";
    // No valid move: the side who cannot move wins
    return (this.turn == "w" ? "1-0" : "0-1");
  }

};
