import ChessRules from "/base_rules.js";
import AbstractAntikingRules from "/variants/AbstractAntiking.js";
import { Random } from "/utils/alea.js";

export class Antiking2Rules extends AbstractAntikingRules {

  static get Aliases() {
    return Object.assign({'A': AbstractAntikingRules}, ChessRules.Aliases);
  }

  static get Options() {
    return {
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
    const whiteLine = (akPos[0] > 0 ? akPos[0] : "") + 'A' + (akPos < this.size.y - 1 ? ...);
    const blackLine = ...
    return baseFen.replace(...)
  }

};
