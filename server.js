import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 5174;

app.use(express.json());

app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

function autoCommit() {
  try {
    execSync('git add -A', { cwd: __dirname });
    const date = new Date().toISOString();
    execSync(`git commit -m "Auto-save: ${date}"`, { cwd: __dirname });
    console.log(`Auto-committed at ${date}`);
  } catch (err) {
    console.error('Auto-commit failed:', err.message);
  }
}

app.post('/api/save-project', (req, res) => {
  const projectData = req.body;
  const filePath = path.join(__dirname, 'public', 'gjs-project.grapesjs');
  
  fs.writeFileSync(filePath, JSON.stringify(projectData, null, 2));
  console.log('Project saved to', filePath);
  
  autoCommit();
  
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Editor at http://localhost:${PORT}/editor.html`);
});