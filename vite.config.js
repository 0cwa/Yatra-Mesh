import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs';
import path from 'path';

const saveProjectPlugin = {
  name: 'save-project',
  configureServer(server) {
    server.middlewares.use('/api/save-project', async (req, res) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
          const projectData = JSON.parse(body);
          const projectFilePath = path.join(import.meta.dirname, 'public', 'gjs-project.grapesjs');
          fs.writeFileSync(projectFilePath, JSON.stringify(projectData, null, 2));
          console.log('Project saved!');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        });
      }
    });
  }
};

export default defineConfig({
  plugins: [react(), saveProjectPlugin],
  server: {
    port: 5173,
    host: true,
  },
})