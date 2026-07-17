import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createServer as createHttpServer } from "http";
import { Server } from "socket.io";
import webpush from "web-push";
import cron from "node-cron";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Add JSON parsing middleware
  app.use(express.json());

  // DevSecOps: Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("Content-Security-Policy", "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: *;");
    next();
  });

  // --- Push Notifications Setup ---
  const vapidKeysFile = path.join(process.cwd(), 'vapid-keys.json');
  let vapidKeys: { publicKey: string, privateKey: string };
  if (fs.existsSync(vapidKeysFile)) {
    vapidKeys = JSON.parse(fs.readFileSync(vapidKeysFile, 'utf8'));
  } else {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(vapidKeysFile, JSON.stringify(vapidKeys));
  }

  webpush.setVapidDetails(
    'mailto:test@example.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );

  const subsFile = path.join(process.cwd(), 'subscriptions.json');
  let subscriptions: any[] = [];
  if (fs.existsSync(subsFile)) {
    subscriptions = JSON.parse(fs.readFileSync(subsFile, 'utf8'));
  }

  app.get('/api/push/public-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post('/api/push/subscribe', (req, res) => {
    const subscription = req.body;
    if (!subscriptions.some(s => s.endpoint === subscription.endpoint)) {
      subscriptions.push(subscription);
      fs.writeFileSync(subsFile, JSON.stringify(subscriptions));
    }
    res.status(201).json({ success: true });
  });

  app.post('/api/push/unsubscribe', (req, res) => {
    const endpoint = req.body.endpoint;
    subscriptions = subscriptions.filter(s => s.endpoint !== endpoint);
    fs.writeFileSync(subsFile, JSON.stringify(subscriptions));
    res.status(200).json({ success: true });
  });

  app.post('/api/push/test', (req, res) => {
    const payload = JSON.stringify({
      title: 'Monatsbericht Erinnerung (Test)',
      body: 'Dies ist ein Test für den Push-Service. Bitte denken Sie an den Monatsbericht!'
    });
    subscriptions.forEach(sub => {
      webpush.sendNotification(sub, payload).catch(err => console.error('Push error:', err));
    });
    res.json({ success: true });
  });

  // Daily cron job at 9:00 AM (Europe/Berlin)
  cron.schedule('0 9 * * *', () => {
    const today = new Date();
    // 8th of the month reminder
    if (today.getDate() === 8) {
      const payload = JSON.stringify({
        title: 'Wichtig: Monatsbericht fällig!',
        body: 'Heute ist der 8. des Monats. Bitte senden Sie den Report als Excel-Datei an die Vertriebsleitung (VL).'
      });
      subscriptions.forEach(sub => {
        webpush.sendNotification(sub, payload).catch(err => console.error('Push error:', err));
      });
    }
  }, {
    timezone: "Europe/Berlin"
  });
  // --------------------------------

  const httpServer = createHttpServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Signaling server logic
  io.on("connection", (socket) => {
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      // Notify others in the room
      socket.to(roomId).emit("user-joined", socket.id);
    });

    socket.on("relay-data", ({ roomId, payload }) => {
      socket.to(roomId).emit("relay-data", payload);
    });

    socket.on("signal", ({ roomId, signalData, to }) => {
      if (to) {
        // Send directly to the target peer
        io.to(to).emit("signal", { signalData, from: socket.id });
      } else {
        // Broadcast to everyone else in the room
        socket.to(roomId).emit("signal", { signalData, from: socket.id });
      }
    });

    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          socket.to(room).emit("user-left", socket.id);
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
