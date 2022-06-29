function fenToDiag(vname) {
  import(`/variants/${vname}/class.js`).then(module => {
    window.V = module.default;
    for (const [k, v] of Object.entries(V.Aliases))
      window[k] = v;
    drawDiagrams();
  });
}

// TODO: heuristic to improve for ratio != 1 (how?)
function getDiagSize() {
  if (window.innerWidth > 1000)
    return 500;
  if (window.innerWidth < 800)
    return window.innerWidth;
  return window.innerWidth / 2;
}

function drawDiagrams() {
  const diagrams = document.getElementsByClassName("diag");
  for (let i=0; i<diagrams.length; i++) {
    let chessboard = document.createElement("div");
    chessboard.classList.add("chessboard");
    diagrams[i].appendChild(chessboard);
    const diagSize = getDiagSize();
    diagrams[i].style.width = diagSize + "px";
    diagrams[i].style.height = diagSize + "px";
    diagrams[i].id = "diag_" + i;
    const vr = new V({
      element: "diag_" + i,
      fen: diagrams[i].dataset.fen,
      color: diagrams[i].dataset.col || 'w',
      options: {},
      diagram: true
    });
  }
}
