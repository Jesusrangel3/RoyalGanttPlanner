const { Server } = require("socket.io");
const http = require("http");

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("Cliente conectado:", socket.id);

  socket.on("sync-tasks", (data) => {
    socket.broadcast.emit("update-tasks", data);
  });

  socket.on("sync-projects", (data) => {
    socket.broadcast.emit("update-projects", data);
  });

  socket.on("sync-phases", (data) => {
    socket.broadcast.emit("update-phases", data);
  });

  socket.on("sync-milestones", (data) => {
    socket.broadcast.emit("update-milestones", data);
  });

  socket.on("sync-users", (data) => {
    socket.broadcast.emit("update-users", data);
  });

  socket.on("sync-notifications", (data) => {
    socket.broadcast.emit("update-notifications", data);
  });

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor de WebSockets de Royal Gantt Planner corriendo en el puerto ${PORT}`);
});
