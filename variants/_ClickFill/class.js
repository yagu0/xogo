import ChessRules from "/base_rules.js";

export default class AbstractClickFillRules extends ChessRules {

  static get Aliases() {
    return Object.assign({'A': AbstractClickFillRules}, ChessRules.Aliases);
  }

  static get Options() {
    return {}
  }

  setupVisualPieces() {
    for (let i=0; i<this.size.x; i++) {
      for (let j=0; j<this.size.y; j++) {
        const markHere =
          !!this.marks && this.marks.some(m => m[0] == i && m[1] == j);
        if (this.board[i][j] != "" || markHere) {
          let elt = document.getElementById(this.coordsToId({x: i, y: j}));
          elt.classList.remove("neutral-square");
          if (markHere)
            elt.classList.add("bg-mark");
          else {
            const sqColor = (this.getColor(i, j) == 'w' ? "white" : "black");
            elt.classList.add("bg-" + sqColor);
          }
        }
      }
    }
  }

  playVisual(move) {
    move.vanish.forEach(v => {
      let elt = document.getElementById(this.coordsToId({x: v.x, y: v.y}));
      elt.classList.remove("bg-" + (v.c == 'w' ? "white" : "black"));
    });
    move.appear.forEach(a => {
      let elt = document.getElementById(this.coordsToId({x: a.x, y: a.y}));
      elt.classList.add("bg-" + (a.c == 'w' ? "white" : "black"));
    });
  }

  animateFading(arr, cb) {
    const animLength = 350; //TODO: 350ms? More? Less?
    arr.forEach(e => {
      let fadingSquare =
        document.getElementById(this.coordsToId({x: e.x, y: e.y}));
      fadingSquare.style.transitionDuration = (animLength / 1000) + "s";
      //fadingSquare.style.backgroundColor = "0"; //TODO: type in or out
      if (this.board[e.x][e.y] != "") {
        // TODO: fade out curCol --> neutral
      }
      else {
        // TODO: fade in neutral --> this.getColor(e.x, e.y)
      }
    });
    setTimeout(cb, animLength);
  }

  animate(move, callback) {
    // No movement, but use fading effects: TODO
    // https://stackoverflow.com/questions/14350126/transition-color-fade-on-hover
    // https://stackoverflow.com/questions/22581789/fade-in-fade-out-background-color-of-an-html-element-with-javascript-or-jquer
    if (true || this.noAnimate || move.noAnimate) {
      callback();
      return;
    }
    let targetObj = new TargetObj(callback);
    const allChanges = move.appear.concat(move.vanish);
    if (allChanges.length > 0) {
      targetObj.target++;
      this.animateFading(allChanges, () => targetObj.increment());
    }
    targetObj.target +=
      this.customAnimate(move, segments, () => targetObj.increment());
    if (targetObj.target == 0)
      callback();
  }

};
