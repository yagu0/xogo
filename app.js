let $ = document; //shortcut

///////////////////
// Initialisations

// https://stackoverflow.com/a/27747377/12660887
function generateId (len) {
  const dec2hex = (dec) => dec.toString(16).padStart(2, "0");
  let arr = new Uint8Array(len / 2); //len/2 because 2 chars per hex value
  window.crypto.getRandomValues(arr); //fill with random integers
  return Array.from(arr, dec2hex).join('');
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
  if (active)
    formField.classList.add("form-field--is-active");
  else {
    formField.classList.remove("form-field--is-active");
    inputName.value == ''
      ? formField.classList.remove("form-field--is-filled")
      : formField.classList.add("form-field--is-filled");
  }
};
setActive(true);
inputName.onblur = () => setActive(false);
inputName.onfocus = () => setActive(true);

/////////
// Utils

function setName() {
  // 'onChange' event on name input text field [HTML]
  localStorage.setItem("name", $.getElementById("myName").value);
}

// Turn a "tab" on, and "close" all others
function toggleVisible(element) {
  for (elt of document.querySelectorAll("main > div")) {
    if (elt.id != element)
      elt.style.display = "none";
    else
      elt.style.display = "block";
  }
  if (element == "boardContainer") {
    // Avoid smartphone scrolling effects (TODO?)
    document.querySelector("html").style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }
  else {
    document.querySelector("html").style.overflow = "visible";
    document.body.style.overflow = "visible";
    // Workaround "superposed texts" effect:
    if (element == "newGame")
      setActive(false);
  }
}

let seek_vname;
function seekGame() {
  seek_vname = $.getElementById("selectVariant").value;
  if (send("seekgame",
           {vname: seek_vname, name: localStorage.getItem("name")})
  ) {
    toggleVisible("pendingSeek");
  }
}
function cancelSeek() {
  if (send("cancelseek", {vname: seek_vname}))
    toggleVisible("newGame");
}

function sendRematch(random) {
  if (send("rematch", {gid: gid, random: !!random}))
    toggleVisible("pendingRematch");
}
function cancelRematch() {
  if (send("norematch", {gid: gid}))
    toggleVisible("newGame");
}

// Play with a friend (or not ^^)
function showNewGameForm() {
  const vname = $.getElementById("selectVariant").value;
  if (vname == "_random")
    alert("Select a variant first");
  else {
    $.getElementById("gameLink").innerHTML = "";
    $.getElementById("selectColor").selectedIndex = 0;
    toggleVisible("newGameForm");
    import(`/variants/${vname}/class.js`).then(module => {
      window.V = module.default;
      for (const [k, v] of Object.entries(V.Aliases))
        window[k] = v;
      prepareOptions();
    });
  }
}
function backToNormalSeek() {
  toggleVisible("newGame");
}

function toggleStyle(event, obj) {
  const word = obj.innerHTML;
  options[word] = !options[word];
  event.target.classList.toggle("highlight-word");
}

let options;
function prepareOptions() {
  options = {};
  let optHtml = "";
  if (V.Options.select) {
    optHtml += V.Options.select.map(select => { return `
      <div class="option-select">
        <label for="var_${select.variable}">${select.label}</label>
        <div class="select">
          <select id="var_${select.variable}">` +
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
  }
  if (V.Options.input) {
    optHtml += V.Options.input.map(input => { return `
      <div class="option-input">
        <label class="input">
          <input id="var_${input.variable}"
                 type="${input.type}"
                 ${input.type == "checkbox" && input.defaut
                   ? "checked"
                   : 'value="' + input.defaut + '"'}
          />
          <span class="spacer"></span>
          <span>${input.label}</span>
        </label>
      </div>`;
    }).join("");
  }
  if (V.Options.styles) {
    optHtml += '<div class="words">';
    let i = 0;
    const stylesLength = V.Options.styles.length;
    while (i < stylesLength) {
      optHtml += '<div class="row">';
      for (let j=i; j<i+4; j++) {
        if (j == stylesLength)
          break;
        const style = V.Options.styles[j];
        optHtml += `<span onClick="toggleStyle(event, this)">${style}</span>`;
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
    let value = parseInt(select.value, 10);
    if (isNaN(value)) //not an integer
      value = select.value;
    options[ select.id.split("_")[1] ] = value;
  }
  for (const input of $.querySelectorAll("#gameOptions input")) {
    const variable = input.id.split("_")[1];
    if (input.type == "number")
      options[variable] = parseInt(input.value, 10); //TODO: real numbers?
    else if (input.type == "checkbox")
      options[variable] = input.checked;
  }
  send("creategame", {
    vname: vname,
    player: {sid: sid, name: localStorage.getItem("name"), color: color},
    options: options
  });
}

function fillGameInfos(gameInfos, oppIndex) {
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
          if (j == options.length)
            break;
          const opt = options[j];
          if (!opt[1]) //includes 0 and false (lighter display)
            continue;
          htmlContent +=
            '<span class="option">' +
            (opt[1] === true ? opt[0] : `${opt[0]}:${opt[1]}`) + " " +
            "</span>";
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
}

////////////////
// Communication

let socket, gid, recoAttempt = 0;
const autoReconnectDelay = () => {
  return [100, 200, 500, 1000, 3000, 10000, 30000][Math.min(recoAttempt, 6)];
};

function send(code, data, opts) {
  opts = opts || {};
  const trySend = () => {
    if (socket.readyState == 1) {
      socket.send(JSON.stringify(Object.assign({code: code}, data)));
      if (opts.success)
        opts.success();
      return true;
    }
    return false;
  };
  const firstTry = trySend();
  if (!firstTry) {
    if (opts.retry) {
      // Retry for a few seconds (sending move)
      let sendAttempt = 1;
      const retryLoop = setInterval(
        () => {
          if (trySend() || ++sendAttempt >= 3)
            clearInterval(retryLoop);
          if (sendAttempt >= 3 && opts.error)
            opts.error();
        },
        1000
      );
    }
    else if (opts.error)
      opts.error();
  }
  return firstTry;
}

function copyClipboard(msg) {
  navigator.clipboard.writeText(msg);
}
function getWhatsApp(msg) {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
}

const tryResumeGame = () => {
  recoAttempt = 0;
  // If a game is found, resume it:
  if (localStorage.getItem("gid")) {
    gid = localStorage.getItem("gid");
    send("getgame",
         {gid: gid},
         {
           retry: true,
           error: () => alert("Cannot load game: no connection")
         });
  }
  else {
    // If URL indicates "play with a friend", start game:
    const hashIdx = document.URL.indexOf('#');
    if (hashIdx >= 0) {
      const urlParts = $.URL.split('#');
      gid = urlParts[1];
      localStorage.setItem("gid", gid);
      history.replaceState(null, '', urlParts[0]); //hide game ID
      send("joingame",
           {gid: gid, name: localStorage.getItem("name")},
           {
             retry: true,
             error: () => alert("Cannot load game: no connection")
           });
    }
  }
};

const messageCenter = (msg) => {
  const obj = JSON.parse(msg.data);
  switch (obj.code) {
    // Start new game:
    case "gamestart": {
      if (document.hidden)
        notifyMe("game");
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
          <span onClick="copyClipboard('${link}')">ToClipboard</span>
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
      // Basic check: was it really opponent's turn?
      if (vr.turn == playerColor)
        break;
      if (document.hidden)
        notifyMe("move");
      vr.playReceivedMove(obj.moves, () => {
        if (vr.getCurrentScore(obj.moves[obj.moves.length-1]) != "*") {
          localStorage.removeItem("gid");
          setTimeout( () => toggleVisible("gameStopped"), 2000 );
        }
        else
          toggleTurnIndicator(true);
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
  if (err.code === "ECONNREFUSED") {
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

function removeAllListeners() {
  socket.removeEventListener("open", tryResumeGame);
  socket.removeEventListener("message", messageCenter);
  socket.removeEventListener("error", handleError);
  socket.removeEventListener("close", handleClose);
}

function connectToWSS() {
  socket =
    new WebSocket(`${Params.socket_server}${Params.socket_path}?sid=${sid}`);
  socket.addEventListener("open", tryResumeGame);
  socket.addEventListener("message", messageCenter);
  socket.addEventListener("error", handleError);
  socket.addEventListener("close", handleClose);
  recoAttempt++;
}
connectToWSS();

///////////
// Playing

function toggleTurnIndicator(myTurn) {
  let indicator =
    $.getElementById("boardContainer").querySelector(".chessboard");
  if (myTurn)
    indicator.style.outline = "thick solid green";
  else
    indicator.style.outline = "thick solid lightgrey";
}

function notifyMe(code) {
  const doNotify = () => {
    // NOTE: empty body (TODO?)
    new Notification("New " + code, { vibrate: [200, 100, 200] });
    new Audio("/assets/new_" + code + ".mp3").play();
  }
  if (Notification.permission === "granted")
    doNotify();
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted")
        doNotify();
    });
  }
}

let curMoves = [],
    lastFen;
const afterPlay = (move_s) => {
  const callbackAfterSend = () => {
    curMoves = [];
    const result = vr.getCurrentScore(move_s);
    if (result != "*") {
      setTimeout(() => {
        toggleVisible("gameStopped");
        send("gameover", {gid: gid});
      }, 2000);
    }
  };
  // Pack into one moves array, then send
  if (Array.isArray(move_s))
    // Array of simple moves (e.g. Chakart)
    Array.prototype.push.apply(curMoves, move_s);
  else
    // Usual case
    curMoves.push(move_s);
  if (vr.turn != playerColor) {
    toggleTurnIndicator(false);
    send("newmove",
         {gid: gid, moves: curMoves, fen: vr.getFen()},
         {
           retry: true,
           success: callbackAfterSend,
           error: () => alert("Move not sent: reload page")
         });
  }
};

let vr, playerColor;
function initializeGame(obj) {
  const options = obj.options || {};
  import(`/variants/${obj.vname}/class.js`).then(module => {
    window.V = module.default;
    for (const [k, v] of Object.entries(V.Aliases))
      window[k] = v;
    // Load CSS. Avoid loading twice the same stylesheet:
    const allIds = [].slice.call($.styleSheets).map(s => s.id);
    const newId = obj.vname + "_css";
    if (!allIds.includes(newId)) {
      $.getElementsByTagName("head")[0].insertAdjacentHTML(
        "beforeend",
        `<link id="${newId}" rel="stylesheet"
               href="/variants/${obj.vname}/style.css"/>`);
    }
    playerColor = (sid == obj.players[0].sid ? "w" : "b");
    // Init + remove potential extra DOM elements from a previous game:
    document.getElementById("boardContainer").innerHTML = `
      <div id="upLeftInfos"
           onClick="toggleGameInfos()">
        <svg version="1.1"
             viewBox="0.5 0.5 100 100">
          <g>
            <path d="M50.5,0.5c-27.614,0-50,22.386-50,50c0,27.614,22.386,50,50,50s50-22.386,50-50C100.5,22.886,78.114,0.5,50.5,0.5z M60.5,85.5h-20v-40h20V85.5z M50.5,35.5c-5.523,0-10-4.477-10-10s4.477-10,10-10c5.522,0,10,4.477,10,10S56.022,35.5,50.5,35.5z"/>
          </g>
        </svg>
      </div>
      <div id="upRightStop"
           onClick="confirmStopGame()">
        <svg version="1.1"
             viewBox="0 0 533.333 533.333">
          <g>
            <path d="M528.468,428.468c-0.002-0.002-0.004-0.004-0.006-0.005L366.667,266.666l161.795-161.797 c0.002-0.002,0.004-0.003,0.006-0.005c1.741-1.742,3.001-3.778,3.809-5.946c2.211-5.925,0.95-12.855-3.814-17.62l-76.431-76.43 c-4.765-4.763-11.694-6.024-17.619-3.812c-2.167,0.807-4.203,2.066-5.946,3.807c0,0.002-0.002,0.003-0.005,0.005L266.667,166.666 L104.87,4.869c-0.002-0.002-0.003-0.003-0.005-0.005c-1.743-1.74-3.778-3-5.945-3.807C92.993-1.156,86.065,0.105,81.3,4.869 L4.869,81.3c-4.764,4.765-6.024,11.694-3.813,17.619c0.808,2.167,2.067,4.205,3.808,5.946c0.002,0.001,0.003,0.003,0.005,0.005 l161.797,161.796L4.869,428.464c-0.001,0.002-0.003,0.003-0.004,0.005c-1.741,1.742-3,3.778-3.809,5.945 c-2.212,5.924-0.951,12.854,3.813,17.619L81.3,528.464c4.766,4.765,11.694,6.025,17.62,3.813c2.167-0.809,4.203-2.068,5.946-3.809 c0.001-0.002,0.003-0.003,0.005-0.005l161.796-161.797l161.795,161.797c0.003,0.001,0.005,0.003,0.007,0.004 c1.743,1.741,3.778,3.001,5.944,3.81c5.927,2.212,12.856,0.951,17.619-3.813l76.43-76.432c4.766-4.765,6.026-11.696,3.815-17.62 C531.469,432.246,530.209,430.21,528.468,428.468z"/>
          </g>
        </svg>
      </div>
      <div class="chessboard"></div>`;
    vr = new V({
      seed: obj.seed, //may be null if FEN already exists (running game)
      fen: obj.fen,
      element: "boardContainer",
      color: playerColor,
      afterPlay: afterPlay,
      options: options
    });
    if (!obj.fen) {
      // Game creation: both players set FEN, in case of one is offline
      send("setfen", {gid: obj.gid, fen: vr.getFen()});
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
    if (obj.randvar)
      toggleVisible("gameInfos");
    else
      toggleVisible("boardContainer");
    toggleTurnIndicator(vr.turn == playerColor);
  });
}

function confirmStopGame() {
  if (confirm("Stop game?") && send("gameover", {gid: gid, relay: true})) {
    localStorage.removeItem("gid");
    toggleVisible("gameStopped");
  }
}

function toggleGameInfos() {
  if ($.getElementById("gameInfos").style.display == "none")
    toggleVisible("gameInfos");
  else
    toggleVisible("boardContainer");
}

$.body.addEventListener("keydown", (e) => {
  if (!localStorage.getItem("gid"))
    return;
  if (e.keyCode == 27)
    confirmStopGame();
  else if (e.keyCode == 32) {
    e.preventDefault();
    toggleGameInfos();
  }
});
