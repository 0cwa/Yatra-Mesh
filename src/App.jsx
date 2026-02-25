import { useEffect, useRef, useState } from 'react';
import createStudioEditor from '@grapesjs/studio-sdk';
import '@grapesjs/studio-sdk/style';
import './App.css';

const localFonts = [
  { name: 'Inter', weights: [400, 600, 700] },
  { name: 'Monoton', weights: [400] },
  { name: 'Orbitron', weights: [400, 500, 600, 700] },
];

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

    const injectFonts = () => {
      const fontFaces = [];
      localFonts.forEach(font => {
        font.weights.forEach(weight => {
          const filename = font.name.toLowerCase() === 'inter'
            ? `inter-latin-${weight}`
            : `${font.name.toLowerCase()}-latin-${weight}`;
          fontFaces.push(`
            @font-face {
              font-family: '${font.name}';
              font-style: normal;
              font-weight: ${weight};
              font-display: swap;
              src: url('/fonts/${filename}.woff2') format('woff2');
            }
          `);
        });
      });

      // Inject into main document
      const mainStyle = document.createElement('style');
      mainStyle.id = 'local-fonts';
      mainStyle.textContent = fontFaces.join('\n');
      document.head.appendChild(mainStyle);
      console.log('Injected local fonts into document head');

      // Inject into canvas iframe - called multiple times to handle page changes
      const tryInjectCanvas = () => {
        const frame = document.querySelector('.gjs-frame') || document.querySelector('iframe[name="editor-frame"]');
        if (frame && frame.contentDocument && frame.contentDocument.head) {
          // Remove old style if it exists (in case iframe was reused)
          const existing = frame.contentDocument.getElementById('local-fonts');
          if (existing) {
            existing.remove();
          }

          const canvasStyle = frame.contentDocument.createElement('style');
          canvasStyle.id = 'local-fonts';
          canvasStyle.textContent = fontFaces.join('\n');
          frame.contentDocument.head.appendChild(canvasStyle);
          console.log('Injected fonts into canvas iframe');
        }
      };

      // Try multiple times in case iframe loads later
      setTimeout(tryInjectCanvas, 500);
      setTimeout(tryInjectCanvas, 1000);
      setTimeout(tryInjectCanvas, 2000);
      setTimeout(tryInjectCanvas, 4000);
    };

    const initEditor = async () => {
      try {
        console.log('Initializing editor with project data...');
        await createStudioEditor({
          root: '#editor',
          project: {
            type: 'web',
            default: projectData,
          },
          fonts: {
            enableFontManager: true,
            default: [
              {
                family: 'Inter',
                variants: {
                  '400': { source: '/fonts/inter-latin-400.woff2' },
                  '600': { source: '/fonts/inter-latin-600.woff2' },
                  '700': { source: '/fonts/inter-latin-700.woff2' },
                },
              },
              {
                family: 'Orbitron',
                variants: {
                  '400': { source: '/fonts/orbitron-latin-400.woff2' },
                  '500': { source: '/fonts/orbitron-latin-500.woff2' },
                  '600': { source: '/fonts/orbitron-latin-600.woff2' },
                  '700': { source: '/fonts/orbitron-latin-700.woff2' },
                },
              },
              {
                family: 'Monoton',
                variants: {
                  '400': { source: '/fonts/monoton-latin-400.woff2' },
                },
              },
            ],
          },
          storage: {
            type: 'self',
            autosaveChanges: 10,
            onSave: async ({ project }) => {
              console.log('Saving project...');
              const response = await fetch('/api/save-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project }),
              });
              if (!response.ok) {
                throw new Error('Failed to save project');
              }
              console.log(`Project saved successfully`);
            },
            onLoad: async () => {
              return projectData;
            },
          },
          onEditor: (ed) => {
            editorRef.current = ed;
            injectFonts();

            // Re-inject fonts when page changes
            ed.on('page:select', () => {
              console.log('Page changed, re-injecting fonts...');
              // Inject with delays to ensure iframe is ready
              setTimeout(() => injectFonts(), 50);
              setTimeout(() => injectFonts(), 200);
            });

            // Also re-inject when content is set/loaded
            ed.on('component:update', () => {
              const frame = document.querySelector('.gjs-frame') || document.querySelector('iframe[name="editor-frame"]');
              if (frame && frame.contentDocument) {
                const hasLocalFonts = frame.contentDocument.getElementById('local-fonts');
                if (!hasLocalFonts) {
                  injectFonts();
                }
              }
            });

            console.log('Editor ready via callback');
            setLoading(false);

            // Generate initial static site files on every editor open
            setTimeout(() => ed.store(), 1500);
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

  return (
    <>
      {(loading || error) && (
        <div style={{ padding: 20, position: 'absolute', zIndex: 9999, background: '#fff' }}>
          {loading && 'Loading project...'}
          {error && <span style={{ color: 'red' }}>Error: {error}</span>}
        </div>
      )}
      <div id="editor" style={{ height: '100vh', width: '100%' }}></div>
    </>
  );
}

export default App;