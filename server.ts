import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Sync projects to disk (so they can be committed to GitHub)
  app.post("/api/sync-data", async (req, res) => {
    try {
      const { projects, scores } = req.body;
      const dataDir = path.join(process.cwd(), 'src', 'data');
      
      // Ensure directory exists
      await fs.mkdir(dataDir, { recursive: true });
      
      // Write data
      await fs.writeFile(
        path.join(dataDir, 'projects.json'),
        JSON.stringify(projects, null, 2)
      );
      
      if (scores) {
        await fs.writeFile(
          path.join(dataDir, 'scores.json'),
          JSON.stringify(scores, null, 2)
        );
      }

      res.json({ success: true, message: "Data synced to filesystem" });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ error: "Failed to sync data" });
    }
  });

  // Fetch seed data
  app.get("/api/seed-data", async (req, res) => {
    try {
      const projectsPath = path.join(process.cwd(), 'src', 'data', 'projects.json');
      const scoresPath = path.join(process.cwd(), 'src', 'data', 'scores.json');
      
      let projects = [];
      let scores = [];

      try {
        const pData = await fs.readFile(projectsPath, 'utf8');
        projects = JSON.parse(pData);
      } catch (e) {}

      try {
        const sData = await fs.readFile(scoresPath, 'utf8');
        scores = JSON.parse(sData);
      } catch (e) {}

      res.json({ projects, scores });
    } catch (error) {
      res.status(500).json({ error: "Failed to load seed data" });
    }
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
