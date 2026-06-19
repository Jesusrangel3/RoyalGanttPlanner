const { Server } = require("socket.io");
const http = require("http");

const ALLOWED_ORIGINS = (process.env.SOCKET_ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map(o => o.trim());

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  const ts = () => new Date().toISOString();
  console.log(`[${ts()}] Cliente conectado: ${socket.id}`);

  // Cada usuario se une a su sala personal para recibir notificaciones dirigidas
  socket.on("join-user-room", (userId) => {
    if (userId && typeof userId === "string") {
      socket.join(`user:${userId}`);
      console.log(`[${ts()}] Usuario ${userId} unido a su sala`);
    }
  });

  // Sincronización global de recursos (todos los clientes reciben el estado actualizado)
  socket.on("sync-tasks",       (data) => socket.broadcast.emit("update-tasks",       data));
  socket.on("sync-projects",    (data) => socket.broadcast.emit("update-projects",    data));
  socket.on("sync-phases",      (data) => socket.broadcast.emit("update-phases",      data));
  socket.on("sync-milestones",  (data) => socket.broadcast.emit("update-milestones",  data));
  socket.on("sync-users",       (data) => socket.broadcast.emit("update-users",       data));

  // Notificación dirigida a un usuario específico (por sala)
  socket.on("notify-user", ({ userId, notification }) => {
    if (userId && notification) {
      io.to(`user:${userId}`).emit("new-notification", notification);
      console.log(`[${ts()}] Notificación enviada a usuario ${userId}`);
    }
  });

  // Sincronización global de notificaciones (compatibilidad con versión anterior)
  socket.on("sync-notifications", (data) => socket.broadcast.emit("update-notifications", data));

  socket.on("disconnect", (reason) => {
    console.log(`[${ts()}] Cliente desconectado: ${socket.id} (${reason})`);
  });
});

const PORT = process.env.SOCKET_PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[${new Date().toISOString()}] WebSocket Royal Gantt Planner iniciado en puerto ${PORT}`);
  console.log(`[${new Date().toISOString()}] Orígenes permitidos: ${ALLOWED_ORIGINS.join(", ")}`);
});

server.on("error", (err) => {
  console.error(`[${new Date().toISOString()}] Error en servidor WebSocket:`, err.message);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error(`[${new Date().toISOString()}] Excepción no capturada:`, err.message);
});

process.on("SIGTERM", () => {
  console.log(`[${new Date().toISOString()}] Cerrando servidor WebSocket...`);
  io.close(() => server.close(() => process.exit(0)));
});
