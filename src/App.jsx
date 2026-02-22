import { useEffect, useRef, useState } from 'react';
import createStudioEditor from '@grapesjs/studio-sdk';
import '@grapesjs/studio-sdk/style';
import './App.css';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const editorRef = useRef(null);
  const [projectData, setProjectData] = useState(null);

  useEffect(() => {
    console.log('Fetching project data...');
    fetch('/gjs-project.grapesjs')
      .then(res => {
        console.log('Fetch response:', res.status, res.statusText);
        return res.json();
      })
      .then(data => {
        console.log('Project loaded, pages:', data.pages?.length);
        console.log('First page component preview:', data.pages?.[0]?.component?.substring(0, 200));
        setProjectData(data);
      })
      .catch(err => {
        console.error('Failed to load project:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!projectData) return;

    const initEditor = async () => {
      try {
        console.log('Initializing editor with project data...');
        await createStudioEditor({
          root: '#editor',
          project: {
            type: 'web',
            default: projectData,
          },
          storage: {
            type: 'self',
            autosaveChanges: 10,
            onSave: async ({ project }) => {
              console.log('Saving project...', project);
              const response = await fetch('/api/save-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(project),
              });
              if (!response.ok) {
                throw new Error('Failed to save project');
              }
            },
            onLoad: async () => {
              return projectData;
            },
          },
          onEditor: (editor) => {
            editorRef.current = editor;
            console.log('Editor ready via callback');
            setLoading(false);
          },
        });
      } catch (err) {
        console.error('Editor init error:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    initEditor();
  }, [projectData]);

  if (loading) {
    return <div style={{ padding: 20 }}>Loading project...</div>;
  }

  if (error) {
    return <div style={{ padding: 20, color: 'red' }}>Error: {error}</div>;
  }

  return <div id="editor" style={{ height: '100vh', width: '100%' }}></div>;
}

export default App;