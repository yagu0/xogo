// class "Move": generic ready-to-play verbose move, standardised format.
export default class Move {
  // o: {appear, vanish, [start,] [end,]}
  // appear,vanish = arrays of PiPo
  // start,end = coordinates to apply to trigger move visually (think castle)
  constructor(o) {
    this.appear = o.appear;
    this.vanish = o.vanish;
    this.start = o.start || { x: o.vanish[0].x, y: o.vanish[0].y };
    this.end = o.end || { x: o.appear[0].x, y: o.appear[0].y };
  }
};
