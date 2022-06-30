function fenToDiag(vname) {
  import(`/variants/${vname}/class.js`).then(module => {
    window.V = module.default;
    for (const [k, v] of Object.entries(V.Aliases))
      window[k] = v;
    re_drawDiagrams();
  });
}

// TODO: heuristic to improve for ratio != 1 (how?)
function getDiagSize(elt) {
  const baseWidth = Math.min(window.innerWidth, 800);
  let multFact = 1;
  if (elt.classList.contains("left") || elt.classList.contains("right"))
    multFact = 0.45;
  else if (baseWidth > 630)
    multFact = 0.5;
  else
    multFact = 0.7;
  return multFact * baseWidth;
}

let vr = null;
function re_drawDiagrams() {
  const diagrams = document.getElementsByClassName("diag");
  if (diagrams.length == 0)
    return;
  const redrawing = !!vr;
  if (!redrawing)
    vr = new Array(diagrams.length);
  for (let i=0; i<diagrams.length; i++) {
    if (!redrawing) {
      let chessboard = document.createElement("div");
      chessboard.classList.add("chessboard");
      diagrams[i].appendChild(chessboard);
      diagrams[i].id = "diag_" + i;
    }
    const diagSize = getDiagSize(diagrams[i]);
    diagrams[i].style.width = diagSize + "px";
    diagrams[i].style.height = diagSize + "px";
    if (!redrawing) {
      vr[i] = new V({
        element: "diag_" + i,
        fen: diagrams[i].dataset.fen,
        marks: diagrams[i].dataset.mks
                 ? JSON.parse('[' + diagrams[i].dataset.mks + ']')
                 : undefined,
        color: diagrams[i].dataset.col || 'w',
        options: {},
        diagram: true
      });
    }
  }
}

window.onresize = re_drawDiagrams;
