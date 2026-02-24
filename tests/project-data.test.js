import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Project Data Validation', () => {
  it('gjs-project.grapesjs should be valid JSON', () => {
    const projectFilePath = path.join(process.cwd(), 'public', 'gjs-project.grapesjs');
    
    expect(fs.existsSync(projectFilePath), 'Project file should exist').toBe(true);
    
    const content = fs.readFileSync(projectFilePath, 'utf-8');
    
    expect(() => JSON.parse(content), 'Project file should be valid JSON').not.toThrow();
  });

  it('gjs-project.grapesjs should have required top-level structure', () => {
    const projectFilePath = path.join(process.cwd(), 'public', 'gjs-project.grapesjs');
    const content = fs.readFileSync(projectFilePath, 'utf-8');
    const data = JSON.parse(content);
    
    expect(data).toHaveProperty('pages');
    expect(Array.isArray(data.pages)).toBe(true);
  });
});
