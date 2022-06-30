import ChessRules from "/base_rules.js";
import AbstractAntikingRules from "/variants/_Antiking/class.js";
import {Random} from "/utils/alea.js";

export default class Antiking2Rules extends AbstractAntikingRules {

  static get Options() {
    return {
      select: C.Options.select,
      styles: A.Options.styles.concat("cylinder")
    };
  }

  genRandInitFen(seed) {
    const baseFen = super.genRandInitFen(seed);
    // Just add an antiking on 3rd ranks
    let akPos = [3, 3];
    if (this.options.randomness >= 1) {
      akPos[0] = Random.randInt(this.size.y);
      if (this.options.randomness == 2)
        akPos[1] = Random.randInt(this.size.y);
      else
        akPos[1] = akPos[0];
    }
    const antikingLine = (color) => {
      const [idx, symbol] = (color == 'w' ? [0, 'a'] : [1, 'A']);
      return (
        (akPos[idx] > 0 ? akPos[idx] : "") + symbol +
        (akPos[idx] < this.size.y - 1
          ? C.FenEmptySquares(this.size.y - 1 - akPos[idx])
          : "")
      );
    };
    return (
      baseFen.replace("p/8", "p/" + antikingLine('b'))
             .replace("8/P", antikingLine('w') + "/P")
    );
  }

};
