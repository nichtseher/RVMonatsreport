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
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      // Strikte CSP: ausschliesslich eigene Ressourcen, keine externen Dienste.
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; " +
          "worker-src 'self'; manifest-src 'self'; media-src 'self'; " +
          "object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
      );
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();