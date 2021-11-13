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

// "Material" input field name
let inputName = document.getElementById("myName");
let formField = document.getElementById("ng-name");
const setActive = (active) => {
  if (active) formField.classList.add("form-field--is-active");
  else {
    formField.classList.remove("form-field--is-active");
    inputName.value === "" ?
      formField.classList.remove("form-field--is-filled") :
       formField.classList.add("form-field--is-filled");
  }
};
inputName.onblur = () => setActive(false);
inputName.onfocus = () => setActive(true);
inputName.focus();

/////////
// Utils

function setName() {
  localStorage.setItem("name", $.getElementById("myName").value);
}

// Turn a "tab" on, and "close" all others
function toggleVisible(element) {
  for (elt of document.querySelectorAll('main > div')) {
    if (elt.id != element) elt.style.display = "none";
    else elt.style.display = "block";
  }
  if (element.id == "newGame") {
    // Workaround "superposed texts" effect
    inputName.focus();
    inputName.blur();
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
  let optHtml = Rules.Options.select.map(select => { return `
      <div class="option-select">
        <label for="var_${select.variable}">${select.label}</label>
        <div class="select">
          <select id="var_${select.variable}" data-numeric="1">` +
          select.options.map(option => { return `
            <option
              value="${option.value}"
              ${option.value == select.defaut ? " selected" : ""}
            >
              ${option.label}
            </option>`;
          }).join("") + `
          </select>
          <span class="focus"></span>
        </div>
      </div>`;
  }).join("");
  optHtml += Rules.Options.check.map(check => {
    return `
      <div class="option-check">
        <label class="checkbox">
          <input id="var_${check.variable}"
                 type="checkbox"${check.defaut ? " checked" : ""}/>
          <span class="spacer"></span>
          <span>${check.label}</span>
        </label>
      </div>`;
  }).join("");
  if (Rules.Options.styles.length >= 1) {
    optHtml += '<div class="words">';
    let i = 0;
    const stylesLength = Rules.Options.styles.length;
    while (i < stylesLength) {
      optHtml += '<div class="row">';
      for (let j=i; j<i+4; j++) {
        if (j == stylesLength) break;
        const style = Rules.Options.styles[j];
        optHtml +=
          `<span onClick="toggleStyle(event, '${style}')">${style}</span>`;
      }
      optHtml += "</div>";
      i += 4;
    }
    optHtml += "</div>";
  }
  $.getElementById("gameOptions").innerHTML = optHtml;
}

function getGameLink() {
  const vname = $.getElementById("selectVariant").value;
  const color = $.getElementById("selectColor").value;
  for (const select of $.querySelectorAll("#gameOptions select")) {
    let value = select.value;
    if (select.attributes["data-numeric"]) value = parseInt(value, 10);
    options[ select.id.split("_")[1] ] = value;
  }
  for (const check of $.querySelectorAll("#gameOptions input"))
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
      <div class="players-info">
        <p>
          <span class="bold">${gameInfos.vdisp}</span>
          <span>vs. ${gameInfos.players[oppIndex].name}</span>
        </p>
      </div>`;
    const options = Object.entries(gameInfos.options);
    if (options.length > 0) {
      htmlContent += '<div class="options-info">';
      let i = 0;
      while (i < options.length) {
        htmlContent += '<div class="row">';
        for (let j=i; j<i+4; j++) {
          if (j == options.length) break;
          const opt = options[j];
          htmlContent +=
            '<span class="option">' +
            (opt[1] === true ? opt[0] : `${opt[0]}:${opt[1]}`) + " " +
            '</span>';
        }
        htmlContent += "</div>";
        i += 4;
      }
      htmlContent += "</div>";
    }
    htmlContent += `
      <div class="rules">${txt}</div>
      <div class="btn-wrap">
        <button onClick="toggleGameInfos()">Back to game</button>
      </div>`;
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
      if (document.hidden) notifyMe("game");
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
      if (document.hidden) notifyMe("move");
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
    Notification.requestPermission().then(permission => {
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
