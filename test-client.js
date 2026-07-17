import { io } from "socket.io-client";
const socket = io("http://localhost:3000", { transports: ["polling", "websocket"] });
socket.on("connect", () => {
  console.log("Connected to server!");
  process.exit(0);
});
socket.on("connect_error", (err) => {
  console.error("Connect error:", err.message);
  process.exit(1);
});
