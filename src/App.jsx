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

      // Also inject into canvas iframe after a delay
      const tryInjectCanvas = () => {
        const frame = document.querySelector('.gjs-frame') || document.querySelector('iframe[name="editor-frame"]');
        if (frame && frame.contentDocument && frame.contentDocument.head) {
          const existing = frame.contentDocument.getElementById('local-fonts');
          if (!existing) {
            const canvasStyle = frame.contentDocument.createElement('style');
            canvasStyle.id = 'local-fonts';
            canvasStyle.textContent = fontFaces.join('\n');
            frame.contentDocument.head.appendChild(canvasStyle);
            console.log('Injected fonts into canvas iframe');
          }
        }
      };

      // Try multiple times in case iframe loads later
      setTimeout(tryInjectCanvas, 1000);
      setTimeout(tryInjectCanvas, 3000);
      setTimeout(tryInjectCanvas, 5000);
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
          fonts: { enableFontManager: true },
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
          onEditor: (ed) => {
            editorRef.current = ed;
            injectFonts();

            // Override existing gjs-t-h2 styles that force right-alignment and flex
            ed.addStyle({
              selectors: ['gjs-t-h2'],
              style: {
                'text-align': 'left',
                'display': 'block',
                'justify-content': 'unset',
                'align-items': 'unset'
              }
            });

            const missingStyles = [
              {
                selectors: ['help-section'],
                style: {
                  'min-height': '100vh',
                  'padding': '80px 40px 60px',
                  'background': '#0b0b13',
                  'position': 'relative',
                  'overflow': 'hidden'
                }
              },
              {
                selectors: ['help-header'],
                style: {
                  'margin-bottom': '48px'
                }
              },
              {
                selectors: ['help-header', 'h1'],
                style: {
                  'font-size': '52px',
                  'font-weight': '700',
                  'color': '#ffffff',
                  'margin-bottom': '12px',
                  'line-height': '1.1'
                }
              },
              {
                selectors: ['help-subtitle'],
                style: {
                  'font-size': '20px',
                  'color': '#a06aff'
                }
              },
              {
                selectors: ['toc-container'],
                style: {
                  'background': 'rgba(160, 106, 255, 0.08)',
                  'border': '1px solid rgba(160, 106, 255, 0.2)',
                  'border-radius': '12px',
                  'padding': '28px 32px',
                  'margin-bottom': '48px',
                  'max-width': '600px'
                }
              },
              {
                selectors: ['toc-title'],
                style: {
                  'font-size': '20px',
                  'color': '#ffffff',
                  'margin-bottom': '20px',
                  'font-weight': '600'
                }
              },
              {
                selectors: ['toc-list'],
                style: {
                  'list-style': 'none',
                  'padding': '0',
                  'margin': '0',
                  'display': 'grid',
                  'grid-template-columns': '1fr 1fr',
                  'gap': '12px 32px'
                }
              },
              {
                selectors: ['toc-list', 'li'],
                style: {
                  'margin': '0'
                }
              },
              {
                selectors: ['toc-list', 'a'],
                style: {
                  'color': '#47b3ff',
                  'text-decoration': 'none',
                  'font-size': '15px',
                  'transition': 'color 0.2s ease',
                  'display': 'inline-block',
                  'padding': '4px 0'
                }
              },
              {
                selectors: ['toc-list', 'a:hover'],
                style: {
                  'color': '#ff4fa3'
                }
              },
              {
                selectors: ['help-content'],
                style: {
                  'max-width': '800px'
                }
              },
              {
                selectors: ['help-content', 'section'],
                style: {
                  'margin-bottom': '48px',
                  'scroll-margin-top': '40px'
                }
              },
              {
                selectors: ['help-content', 'h2'],
                style: {
                  'font-size': '32px',
                  'color': '#f3f3fb',
                  'margin-bottom': '20px',
                  'font-weight': '600',
                  'line-height': '1.2',
                  'text-align': 'left'
                }
              },
              {
                selectors: ['help-content', 'h3'],
                style: {
                  'font-size': '22px',
                  'color': '#a06aff',
                  'margin': '28px 0 12px',
                  'font-weight': '600',
                  'text-align': 'left'
                }
              },
              {
                selectors: ['help-content', 'p'],
                style: {
                  'font-size': '18px',
                  'line-height': '1.7',
                  'color': '#eaeaf1',
                  'margin-bottom': '16px'
                }
              },
              {
                selectors: ['help-content', 'a'],
                style: {
                  'color': '#47b3ff',
                  'text-decoration': 'none',
                  'transition': 'color 0.2s ease'
                }
              },
              {
                selectors: ['help-content', 'a:hover'],
                style: {
                  'color': '#ff4fa3'
                }
              },
              {
                selectors: ['help-content', 'ul', 'ol'],
                style: {
                  'margin': '16px 0',
                  'padding-left': '24px'
                }
              },
              {
                selectors: ['help-content', 'li'],
                style: {
                  'font-size': '18px',
                  'line-height': '1.7',
                  'color': '#eaeaf1',
                  'margin-bottom': '10px'
                }
              },
              {
                selectors: ['step-list'],
                style: {
                  'counter-reset': 'step',
                  'list-style': 'none',
                  'padding': '0'
                }
              },
              {
                selectors: ['step-list', 'li'],
                style: {
                  'position': 'relative',
                  'padding-left': '40px',
                  'margin-bottom': '20px'
                }
              },
              {
                selectors: ['step-list', 'li::before'],
                style: {
                  'counter-increment': 'step',
                  'content': 'counter(step)',
                  'position': 'absolute',
                  'left': '0',
                  'top': '2px',
                  'width': '26px',
                  'height': '26px',
                  'background': '#a06aff',
                  'color': '#0b0b13',
                  'border-radius': '50%',
                  'font-size': '14px',
                  'font-weight': '600',
                  'display': 'flex',
                  'align-items': 'center',
                  'justify-content': 'center'
                }
              },
              {
                selectors: ['feature-list'],
                style: {
                  'list-style': 'none',
                  'padding': '0'
                }
              },
              {
                selectors: ['feature-list', 'li'],
                style: {
                  'position': 'relative',
                  'padding-left': '24px'
                }
              },
              {
                selectors: ['feature-list', 'li::before'],
                style: {
                  'content': '"→"',
                  'position': 'absolute',
                  'left': '0',
                  'color': '#47b3ff'
                }
              },
              {
                selectors: ['code-block'],
                style: {
                  'background': 'rgba(0, 0, 0, 0.4)',
                  'border': '1px solid rgba(71, 179, 255, 0.2)',
                  'border-radius': '8px',
                  'padding': '20px 24px',
                  'font-family': "'SF Mono', 'Monaco', 'Consolas', monospace",
                  'font-size': '14px',
                  'line-height': '1.6',
                  'color': '#eaeaf1',
                  'overflow-x': 'auto',
                  'white-space': 'pre',
                  'margin': '16px 0'
                }
              },
              {
                selectors: ['mobile-help'],
                style: {
                  'background': 'linear-gradient(180deg, #0b0b13 0%, #1a1025 100%)'
                }
              },
              {
                selectors: ['desktop-help'],
                style: {
                  'background': 'linear-gradient(180deg, #0b0b13 0%, #0f1a25 100%)'
                }
              },
              {
                selectors: [],
                selectorsAdd: '@media (max-width: 768px)',
                style: {
                  '.help-section': {
                    'padding': '60px 20px 40px'
                  },
                  '.help-header h1': {
                    'font-size': '36px'
                  },
                  '.help-subtitle': {
                    'font-size': '16px'
                  },
                  '.toc-container': {
                    'padding': '20px'
                  },
                  '.toc-list': {
                    'grid-template-columns': '1fr',
                    'gap': '10px'
                  },
                  '.help-content h2': {
                    'font-size': '26px'
                  },
                  '.help-content h3': {
                    'font-size': '18px'
                  },
                  '.help-content p': {
                    'font-size': '16px'
                  },
                  '.help-content li': {
                    'font-size': '16px'
                  }
                }
              }
            ];

            missingStyles.forEach(styleRule => {
              ed.addStyle(styleRule);
            });

            console.log('Added missing styles to editor for Style Manager');
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