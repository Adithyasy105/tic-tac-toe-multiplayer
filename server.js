const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",   // Allow frontend from Vercel
    methods: ["GET", "POST"]
  }
});


app.use(express.static("public"));

let waitingPlayer = null;

io.on("connection", (socket) => {
  console.log("🎮 New player connected:", socket.id);

  socket.on("joinPvP", (playerInfo) => {
    socket.data.info = playerInfo;
    socket.data.playAgain = false;

    // Remove any previous listeners (important for reconnections)
    socket.removeAllListeners("makeMove");
    socket.removeAllListeners("playAgainRequest");
    socket.removeAllListeners("leaveGame");
    socket.removeAllListeners("playerLeft");
    socket.removeAllListeners("disconnect");

    if (!waitingPlayer) {
      waitingPlayer = socket;
      socket.emit("waitingForPlayer");
    } else {
      const opponent = waitingPlayer;
      waitingPlayer = null;

      // Set opponents
      socket.data.opponent = opponent;
      opponent.data.opponent = socket;

      // Send startGame to both players
      opponent.emit("startGame", { opponent: playerInfo, symbol: "X" });
      socket.emit("startGame", { opponent: opponent.data.info, symbol: "O" });

      socket.data.playAgain = false;
      opponent.data.playAgain = false;

      const checkPlayAgain = () => {
        if (socket.data.playAgain && opponent.data.playAgain) {
          socket.emit("startNewGame");
          opponent.emit("startNewGame");

          socket.data.playAgain = false;
          opponent.data.playAgain = false;
        }
      };

      const handleLeave = (leaver, other) => {
        if (other && other.connected) {
          other.emit("opponentLeft");  // ✅ Alert other player
          other.data.opponent = null;
        }
        leaver.data.opponent = null;
      };

      const setupPlayerEvents = (player, other) => {
        player.on("makeMove", (index) => {
          if (other && other.connected) {
            other.emit("opponentMove", index);
          }
        });

        player.on("playAgainRequest", () => {
          player.data.playAgain = true;
          checkPlayAgain();
        });

        /*player.on("leaveGame", () => {
          handleLeave(player, other);
        });*/

        // ✅ Listen to playerLeft from frontend leaveGame()
        player.on("playerLeft", () => {
          console.log("🚪 Player left:", player.id);
          handleLeave(player, other);
        });

        // ✅ Also handle unexpected disconnects (tab closed etc.)
        player.on("disconnect", () => {
          console.log("❌ Disconnected:", player.id);
          if (player.data.opponent) {
            handleLeave(player, player.data.opponent);
          } else if (waitingPlayer?.id === player.id) {
            waitingPlayer = null;
          }
        });
      };

      setupPlayerEvents(socket, opponent);
      setupPlayerEvents(opponent, socket);
    }
  });
});

server.listen(3000, () => {
  console.log("✅ Server running at http://localhost:3000");
});
