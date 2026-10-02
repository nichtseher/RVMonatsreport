import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Schlanker Auslieferungs-Server OHNE jegliche Datenverarbeitung:
// - Kein Socket.io  (Geraete-Sync laeuft offline per QR-Code direkt in der App)
// - Kein Web-Push   (Erinnerungen erzeugt die App lokal auf dem Geraet)
// - Keine API       (alle Daten bleiben in localStorage/IndexedDB des Geraets)
// => Serverseitig werden keinerlei personenbezogene Daten verarbeitet (DSGVO).

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // DevSecOps: Security-Header
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "no-referrer");
    // Mikrofon NUR fuer die eigene Seite (0.9.72): Das Diktat braucht es.
    // `microphone=()` schaltete es ab -- wer die App ueber diesen Server
    // auslieferte, hatte ein Diktat, das nie ein Mikrofon bekam.
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), geolocation=()");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      /*
        Nur das, was ein <meta> nicht kann: `frame-ancestors`.

        Die uebrige Richtlinie steht seit 0.9.34 als <meta> in der gebauten
        index.html, MIT dem Hash des Inline-Skripts (Update-Hinweis und
        Service-Worker-Registrierung). Eine zweite, strengere Richtlinie als
        HTTP-Kopfzeile gilt ZUSAETZLICH -- und ihr `script-src 'self'` ohne
        Hash sperrte genau dieses Skript: Wer die App ueber `npm start`
        auslieferte, bekam keinen Service Worker und damit keinen
        Offline-Betrieb, ohne dass irgendetwas eine Fehlermeldung zeigte.
      */
      res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");
    }
    next();
  });

  if (process.env.NODE_ENV !== "production") {
    // Entwicklung: Vite-Middleware (HMR); CSP hier bewusst deaktiviert,
    // da Vite im Dev-Modus Inline-Skripte benoetigt.
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();