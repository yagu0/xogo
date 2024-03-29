import WeiqiRules from "/variants/Weiqi/class.js";
import Move from "/utils/Move.js";
import PiPo from "/utils/PiPo.js";
import {ArrayFun} from "/utils/array.js";

export default class AtarigoRules extends WeiqiRules {

  static get Options() {
    let input = WeiqiRules.Options.input;
    input[0].defaut = 11;
    return {input: input};
  }

  getCurrentScore(move_s) {
    if (move_s[0].vanish.length > 0)
      return (this.turn == 'w' ? "0-1" : "1-0");
    return "*";
  }

};
