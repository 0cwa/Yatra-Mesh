import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 5174;

app.use(express.json());

app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/save-project', (req, res) => {
  const projectData = req.body;
  const filePath = path.join(__dirname, 'public', 'gjs-project.grapesjs');
  
  fs.writeFileSync(filePath, JSON.stringify(projectData, null, 2));
  console.log('Project saved to', filePath);
  
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Editor at http://localhost:${PORT}/editor.html`);
});