const socket = io("https://tic-tac-toe-multiplayer-lt8o.onrender.com");

socket.on("opponentLeft", () => {
  alert("Opponent left. You'll be returned to the home screen.");
  board = Array(9).fill(null);
  clearInterval(playAgainTimer);
  gameActive = false;
  playAgainRequested = false;
  
  const gameDiv = document.getElementById("game");
  const resultDiv = document.getElementById("result");
  if (gameDiv) gameDiv.classList.add("hidden");
  if (resultDiv) resultDiv.classList.add("hidden");
  
  document.getElementById("home").classList.remove("hidden");
});

let playAgainRequested = false;
let playAgainTimer = null;
let playerInfo = {};
let opponentInfo = {};
let symbol = 'X';
let currentTurn = 'X';
let board = Array(9).fill(null);
let gameActive = false;
let mode = null;

function selectMode(selectedMode) {
  mode = selectedMode;
  document.getElementById("home").classList.add("hidden");
  document.getElementById("form").classList.remove("hidden");
}

document.getElementById("playerForm").addEventListener("submit", function (e) {
  e.preventDefault();
  playerInfo = {
    name: document.getElementById("playerName").value,
    age: document.getElementById("playerAge").value,
    gender: document.getElementById("playerGender").value,
  };

  document.getElementById("form").classList.add("hidden");

  if (mode === "computer") {
    opponentInfo = { name: "Computer", age: "-", gender: "-" };
    symbol = "X";
    currentTurn = "X";
    gameActive = true;
    board = Array(9).fill(null);
    document.getElementById("game").classList.remove("hidden");
    document.getElementById("infoBar").innerText = `${playerInfo.name} VS Computer`;
    renderBoard();
  } else {
    showWaitingScreen();
    socket.emit("joinPvP", playerInfo);
  }
});

function showWaitingScreen() {
  removeWaitingScreen();
  const div = document.createElement("div");
  div.id = "waitingScreen";
  div.className = "container";
  div.innerHTML = "<h2>Waiting for another player...</h2>";
  document.body.appendChild(div);
}

function removeWaitingScreen() {
  const div = document.getElementById("waitingScreen");
  if (div) div.remove();
}

socket.on("waitingForPlayer", () => {
  showWaitingScreen();
});

socket.on("startGame", ({ opponent, symbol: s }) => {
  symbol = s;
  opponentInfo = opponent;
  board = Array(9).fill(null);
  currentTurn = "X";
  gameActive = true;
  playAgainRequested = false;
  clearInterval(playAgainTimer);

  removeWaitingScreen();
  document.getElementById("game").classList.remove("hidden");
  document.getElementById("result").classList.add("hidden");
  document.getElementById("winnerText").innerText = "";
  document.getElementById("countdownText").innerText = "";
  document.getElementById("infoBar").innerText = `${playerInfo.name} VS ${opponentInfo.name}`;
  renderBoard();
});

socket.on("opponentMove", (index) => {
  board[index] = symbol === "X" ? "O" : "X";
  currentTurn = symbol;
  renderBoard();
  checkGameState();
});

socket.on("startNewGame", () => {
  clearInterval(playAgainTimer);
  playAgainRequested = false;
  board = Array(9).fill(null);
  currentTurn = "X";
  gameActive = true;
  document.getElementById("result").classList.add("hidden");
  document.getElementById("winnerText").innerText = "";
  document.getElementById("countdownText").innerText = "";
  renderBoard();
});


/*function renderBoard() {
  const boardDiv = document.getElementById("board");
  boardDiv.innerHTML = "";
  board.forEach((cell, index) => {
    const btn = document.createElement("button");
    btn.className = "square";
    btn.innerText = cell || "";
    btn.onclick = () => handleMove(index);
    boardDiv.appendChild(btn);
  });
}*/
function renderBoard() {
  const boardDiv = document.getElementById("board");
  boardDiv.innerHTML = "";
  board.forEach((cell, index) => {
    const btn = document.createElement("button");
    btn.className = "square";
    if (cell) {
      btn.classList.add("filled");
      btn.setAttribute("data-symbol", cell);
    }
    btn.onclick = () => handleMove(index);
    boardDiv.appendChild(btn);
  });
}

function handleMove(index) {
  if (!gameActive || board[index] || currentTurn !== symbol) return;

  board[index] = symbol;
  renderBoard();
  checkGameState();

  if (mode === "pvp") {
    socket.emit("makeMove", index);
    currentTurn = symbol === "X" ? "O" : "X";
  } else if (mode === "computer") {
    currentTurn = "O";
    setTimeout(computerMove, 500);
  }
}

function computerMove() {
  const empty = board.map((v, i) => v === null ? i : null).filter(i => i !== null);
  const move = empty[Math.floor(Math.random() * empty.length)];
  board[move] = "O";
  currentTurn = "X";
  renderBoard();
  checkGameState();
}

function checkGameState() {
  const winCombos = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];

  for (let [a, b, c] of winCombos) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      const winnerSymbol = board[a];
      const winnerName = (mode === 'computer')
        ? (winnerSymbol === 'X' ? playerInfo.name : 'Computer')
        : (winnerSymbol === symbol ? playerInfo.name : opponentInfo.name);
      endGame(`${winnerName} Wins!`);
      return;
    }
  }

  if (!board.includes(null)) {
    endGame("It's a Draw!");
  }
}

function endGame(msg) {
  gameActive = false;
  document.getElementById("result").classList.remove("hidden");
  document.getElementById("winnerText").innerText = msg;

  let countdown = 10;
  const countdownText = document.getElementById("countdownText");
  countdownText.innerText = `You have ${countdown} seconds to choose...`;

  clearInterval(playAgainTimer);
  playAgainTimer = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(playAgainTimer);
      leaveGame(); // ✅ FIX: correct flow based on mode
    } else {
      countdownText.innerText = `You have ${countdown} seconds to choose...`;
    }
  }, 1000);
}

function playAgain() {
  if (mode === "pvp") {
    if (!playAgainRequested) {
      playAgainRequested = true;
      clearInterval(playAgainTimer);
      document.getElementById("winnerText").innerText = "Waiting for opponent...";
      document.getElementById("countdownText").innerText = "Waiting for opponent to agree...";
      socket.emit("playAgainRequest");
    }
  } else {
    resetGame();
  }
}

function resetGame() {
  board = Array(9).fill(null);
  currentTurn = "X";
  gameActive = true;
  playAgainRequested = false;
  clearInterval(playAgainTimer);
  document.getElementById("result").classList.add("hidden");
  document.getElementById("winnerText").innerText = "";
  document.getElementById("countdownText").innerText = "";
  renderBoard();
}

function leaveGame() {
  clearInterval(playAgainTimer);
  board = Array(9).fill(null);
  gameActive = false;
  playAgainRequested = false;
  socket.emit("playerLeft"); // ✅ Notify server

  document.getElementById("game").classList.add("hidden");
  document.getElementById("result").classList.add("hidden");

  // ✅ FIX: computer mode goes home, PvP rejoins queue
  if (mode === "pvp") {
    console.log("playerLeft event emitted");
    document.getElementById("home").classList.remove("hidden");
  } else {
    document.getElementById("home").classList.remove("hidden");
  }
}
