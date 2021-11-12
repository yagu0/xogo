let $ = document; //shortcut

///////////////////
// Initialisations

// https://stackoverflow.com/a/27747377/12660887
function dec2hex (dec) { return dec.toString(16).padStart(2, "0") }
function generateId (len) {
  var arr = new Uint8Array((len || 40) / 2)
  window.crypto.getRandomValues(arr)
  return Array.from(arr, dec2hex).join('')
}

// Populate variants dropdown list
let dropdown = $.getElementById("selectVariant");
dropdown[0] = new Option("? ? ?", "_random", true, true);
dropdown[0].title = "Random variant";
for (let i = 0; i < variants.length; i++) {
  let newOption = new Option(
    variants[i].disp || variants[i].name, variants[i].name, false, false);
  newOption.title = variants[i].desc;
  dropdown[dropdown.length] = newOption;
}

// Ensure that I have a socket ID and a name
if (!localStorage.getItem("sid"))
  localStorage.setItem("sid", generateId(8));
if (!localStorage.getItem("name"))
  localStorage.setItem("name", "@non" + generateId(4));
const sid = localStorage.getItem("sid");
$.getElementById("myName").value = localStorage.getItem("name");

/////////
// Utils

function setName() {
  localStorage.setItem("name", $.getElementById("myName").value);
}

// Turn a "tab" on, and "close" all others
function toggleVisible(element) {
  for (elt of document.querySelectorAll('body > div')) {
    if (elt.id != element) elt.style.display = "none";
    else elt.style.display = "block";
  }
}

let seek_vname;
function seekGame() {
  seek_vname = $.getElementById("selectVariant").value;
  send("seekgame", {vname: seek_vname, name: localStorage.getItem("name")});
  toggleVisible("pendingSeek");
}
function cancelSeek() {
  send("cancelseek", {vname: seek_vname});
  toggleVisible("newGame");
}

function sendRematch() {
  send("rematch", { gid: gid });
  toggleVisible("pendingRematch");
}
function cancelRematch() {
  send("norematch", { gid: gid });
  toggleVisible("newGame");
}

// Play with a friend (or not ^^)
function showNewGameForm() {
  const vname = $.getElementById("selectVariant").value;
  if (vname == "_random") alert("Select a variant first");
  else {
    $.getElementById("gameLink").innerHTML = "";
    $.getElementById("selectColor").selectedIndex = 0;
    toggleVisible("newGameForm");
    import(`/variants/${vname}/class.js`).then(module => {
      const Rules = module.default;
      prepareOptions(Rules);
    });
  }
}
function backToNormalSeek() { toggleVisible("newGame"); }

function toggleStyle(e, word) {
  options[word] = !options[word];
  e.target.classList.toggle("highlight-word");
}

let options;
function prepareOptions(Rules) {
  options = {};
  let optHtml = "";
  for (let select of Rules.Options.select) {
    optHtml += `
      <label for="var_${select.variable}">${select.label}</label>
      <select id="var_${select.variable}" data-numeric="1">`;
    for (option of select.options) {
      const defaut = option.value == select.defaut;
      optHtml += `<option value="${option.value}"`;
      if (defaut) optHtml += 'selected="true"';
      optHtml += `>${option.label}</option>`;
    }
    optHtml += '</select>';
  }
  for (let check of Rules.Options.check) {
    optHtml += `
      <label for="var_${check.variable}">${check.label}</label>
      <input id="var_${check.variable}"
             type="checkbox"`;
    if (check.defaut) optHtml += 'checked="true"';
    optHtml += '/>';
  }
  if (Rules.Options.styles.length >= 1) optHtml += '<p class="words">';
  for (let style of Rules.Options.styles) {
    optHtml += `
      <span class="word" onClick="toggleStyle(event, '${style}')">
        ${style}
      </span>`;
  }
  if (Rules.Options.styles.length >= 1) optHtml += "</p>";
  $.getElementById("gameOptions").innerHTML = optHtml;
}

function getGameLink() {
  const vname = $.getElementById("selectVariant").value;
  const color = $.getElementById("selectColor").value;
  for (const select of $.querySelectorAll("#gameOptions > select")) {
    let value = select.value;
    if (select.attributes["data-numeric"]) value = parseInt(value, 10);
    options[ select.id.split("_")[1] ] = value;
  }
  for (const check of $.querySelectorAll("#gameOptions > input"))
    options[ check.id.split("_")[1] ] = check.checked;
  send("creategame", {
    vname: vname,
    player: { sid: sid, name: localStorage.getItem("name"), color: color },
    options: options
  });
}

const fillGameInfos = (gameInfos, oppIndex) => {
  fetch(`/variants/${gameInfos.vname}/rules.html`)
  .then(res => res.text())
  .then(txt => {
    let htmlContent = `
      <p>
        <strong>${gameInfos.vdisp}</strong>
        <span>vs. ${gameInfos.players[oppIndex].name}</span>
      </p>
      <hr>
      <p>`;
    htmlContent +=
      Object.entries(gameInfos.options).map(opt => {
        return (
          '<span class="option">' +
          (opt[1] === true ? opt[0] : `${opt[0]}:${opt[1]}`) +
          '</span>'
        );
      })
      .join(", ");
    htmlContent += `
      </p>
      <hr>
      <div class="rules">
        ${txt}
      </div>
      <button onClick="toggleGameInfos()">Back to game</button>`;
    $.getElementById("gameInfos").innerHTML = htmlContent;
  });
};

////////////////
// Communication

let socket, gid, attempt = 0;
const autoReconnectDelay = () => {
  return [100, 200, 500, 1000, 3000, 10000, 30000][Math.min(attempt, 6)];
};

function copyClipboard(msg) { navigator.clipboard.writeText(msg); }
function getWhatsApp(msg) {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
}

const tryResumeGame = () => {
  attempt = 0;
  // If a game is found, resume it:
  if (localStorage.getItem("gid")) {
    gid = localStorage.getItem("gid");
    send("getgame", { gid: gid });
  }
  else {
    // If URL indicates "play with a friend", start game:
    const hashIdx = document.URL.indexOf('#');
    if (hashIdx >= 0) {
      const urlParts = $.URL.split('#');
      gid = urlParts[1];
      send("joingame", { gid: gid, name: localStorage.getItem("name") });
      localStorage.setItem("gid", gid);
      history.replaceState(null, '', urlParts[0]);
    }
  }
};

const messageCenter = (msg) => {
  const obj = JSON.parse(msg.data);
  switch (obj.code) {
    // Start new game:
    case "gamestart": {
      if (!$.hasFocus()) notifyMe("game");
      gid = obj.gid;
      initializeGame(obj);
      break;
    }
    // Game vs. friend just created on server: share link now
    case "gamecreated": {
      const link = `${Params.http_server}/#${obj.gid}`;
      $.getElementById("gameLink").innerHTML = `
        <p>
          <a href="${getWhatsApp(link)}">WhatsApp</a>
          /
          <span onClick='copyClipboard("${link}")'>ToClipboard</span>
        </p>
        <p>${link}</p>
      `;
      break;
    }
    // Game vs. friend joined after 1 minute (try again!)
    case "jointoolate":
      alert("Game no longer available");
      break;
    // Get infos of a running game (already launched)
    case "gameinfo":
      initializeGame(obj);
      break;
    // Tried to resume a game which is now gone:
    case "nogame":
      localStorage.removeItem("gid");
      break;
    // Receive opponent's move:
    case "newmove":
      if (!$.hasFocus()) notifyMe("move");
      vr.playReceivedMove(obj.moves, () => {
        if (vr.getCurrentScore(obj.moves[obj.moves.length-1]) != "*") {
          localStorage.removeItem("gid");
          setTimeout( () => toggleVisible("gameStopped"), 2000 );
        }
        else toggleTurnIndicator(true);
      });
      break;
    // Opponent stopped game (draw, abort, resign...)
    case "gameover":
      toggleVisible("gameStopped");
      localStorage.removeItem("gid");
      break;
    // Opponent cancelled rematch:
    case "closerematch":
      toggleVisible("newGame");
      break;
  }
};

const handleError = (err) => {
  if (err.code === 'ECONNREFUSED') {
    removeAllListeners();
    alert("Server refused connection. Please reload page later");
  }
  socket.close();
};

const handleClose = () => {
  setTimeout(() => {
    removeAllListeners();
    connectToWSS();
  }, autoReconnectDelay());
};

const removeAllListeners = () => {
  socket.removeEventListener("open", tryResumeGame);
  socket.removeEventListener("message", messageCenter);
  socket.removeEventListener("error", handleError);
  socket.removeEventListener("close", handleClose);
};

const connectToWSS = () => {
  socket =
    new WebSocket(`${Params.socket_server}${Params.socket_path}?sid=${sid}`);
  socket.addEventListener("open", tryResumeGame);
  socket.addEventListener("message", messageCenter);
  socket.addEventListener("error", handleError);
  socket.addEventListener("close", handleClose);
  attempt++;
};
connectToWSS();

const send = (code, data) => {
  socket.send(JSON.stringify(Object.assign({code: code}, data)));
};

///////////
// Playing

function toggleTurnIndicator(myTurn) {
  let indicator = $.getElementById("chessboard");
  if (myTurn) indicator.style.outline = "thick solid green";
  else indicator.style.outline = "thick solid lightgrey";
}

function notifyMe(code) {
  const doNotify = () => {
    // NOTE: empty body (TODO?)
    new Notification("New " + code, { vibrate: [200, 100, 200] });
    new Audio("/assets/new_" + code + ".mp3").play();
  }
  if (Notification.permission === 'granted') doNotify();
  else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') doNotify();
    });
  }
}

let curMoves = [];
const afterPlay = (move) => { //pack into one moves array, then send
  curMoves.push({
    appear: move.appear,
    vanish: move.vanish,
    start: move.start,
    end: move.end
  });
  if (vr.turn != playerColor) {
    toggleTurnIndicator(false);
    send("newmove", { gid: gid, moves: curMoves, fen: vr.getFen() });
    curMoves = [];
    const result = vr.getCurrentScore(move);
    if (result != "*") {
      setTimeout( () => {
        toggleVisible("gameStopped");
        send("gameover", { gid: gid });
      }, 2000);
    }
  }
};

// Avoid loading twice the same stylesheet:
const conditionalLoadCSS = (vname) => {
  const allIds = [].slice.call($.styleSheets).map(s => s.id);
  const newId = vname + "_css";
  if (!allIds.includes(newId)) {
    $.getElementsByTagName("head")[0].insertAdjacentHTML(
      "beforeend",
      `<link id="${newId}" rel="stylesheet"
             href="/variants/${vname}/style.css"/>`);
  }
};

let vr, playerColor;
function initializeGame(obj) {
  const options = obj.options || {};
  import(`/variants/${obj.vname}/class.js`).then(module => {
    const Rules = module.default;
    conditionalLoadCSS(obj.vname);
    playerColor = (sid == obj.players[0].sid ? "w" : "b");
    // Init + remove potential extra DOM elements from a previous game:
    document.getElementById("boardContainer").innerHTML = `
      <div id="upLeftInfos"
           onClick="toggleGameInfos()">
        <img src="/assets/icon_infos.svg"/>
      </div>
      <div id="upRightStop"
           onClick="confirmStopGame()">
        <img src="/assets/icon_close.svg"/>
      </div>
      <div class="resizeable" id="chessboard"></div>`;
    vr = new Rules({
      seed: obj.seed, //may be null if FEN already exists (running game)
      fen: obj.fen,
      element: "chessboard",
      color: playerColor,
      afterPlay: afterPlay,
      options: options
    });
    if (!obj.fen) {
      // Game creation
      if (playerColor == "w") send("setfen", {gid: obj.gid, fen: vr.getFen()});
      localStorage.setItem("gid", obj.gid);
    }
    const select = $.getElementById("selectVariant");
    obj.vdisp = "";
    for (let i=0; i<select.options.length; i++) {
      if (select.options[i].value == obj.vname) {
        obj.vdisp = select.options[i].text;
        break;
      }
    }
    fillGameInfos(obj, playerColor == "w" ? 1 : 0);
    if (obj.randvar) toggleVisible("gameInfos");
    else toggleVisible("boardContainer");
    toggleTurnIndicator(vr.turn == playerColor);
  });
}

function confirmStopGame() {
  if (confirm("Stop game?")) {
    send("gameover", { gid: gid, relay: true });
    localStorage.removeItem("gid");
    toggleVisible("gameStopped");
  }
}

function toggleGameInfos() {
  if ($.getElementById("gameInfos").style.display == "none")
    toggleVisible("gameInfos");
  else {
    toggleVisible("boardContainer");
    // Quickfix for the "vanished piece" bug (move played while on game infos)
    vr.setupPieces(); //TODO: understand better
  }
}

$.body.addEventListener("keydown", (e) => {
  if (!localStorage.getItem("gid")) return;
  if (e.keyCode == 27) confirmStopGame();
  else if (e.keyCode == 32) {
    e.preventDefault();
    toggleGameInfos();
  }
});
