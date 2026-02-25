import fs from 'fs';

const project = JSON.parse(fs.readFileSync('public/gjs-project.grapesjs', 'utf8'));

// Add missing background-blobs and background-grid styles
const newStyles = [
  {
    "selectors": ["background-grid"],
    "style": {
      "position": "fixed",
      "inset": "0px",
      "z-index": "-10",
      "background-image": "radial-gradient( rgba(160,106,255,0.12) 1px, transparent 1px ), radial-gradient( rgba(71,179,255,0.1) 1.5px, transparent 1.5px )",
      "background-size": "26px 26px, 46px 46px",
      "background-position": "0 0, 13px 13px",
      "animation": "pulseGlow 7s ease-in-out infinite"
    }
  },
  {
    "selectors": ["background-blobs"],
    "style": {
      "pointer-events": "none",
      "position": "absolute",
      "inset": "0px",
      "z-index": "-10"
    }
  },
  {
    "selectors": ["blob-one"],
    "style": {
      "position": "absolute",
      "left": "-120px",
      "top": "-80px",
      "width": "360px",
      "height": "360px",
      "border-radius": "9999px",
      "background": "radial-gradient(circle, rgba(160, 106, 255, 0.4) 0%, transparent 70%)",
      "filter": "blur(48px)",
      "animation": "floatSlow 9s ease-in-out infinite, rotateDrift 22s linear infinite"
    }
  },
  {
    "selectors": ["blob-two"],
    "style": {
      "position": "absolute",
      "right": "-140px",
      "top": "180px",
      "width": "420px",
      "height": "420px",
      "border-radius": "9999px",
      "background": "radial-gradient(circle, rgba(71, 179, 255, 0.35) 0%, transparent 70%)",
      "filter": "blur(48px)",
      "animation": "floatSlow 9s ease-in-out infinite reverse, rotateDrift 22s linear infinite"
    }
  },
  {
    "selectors": ["blob-three"],
    "style": {
      "position": "absolute",
      "left": "20%",
      "bottom": "-160px",
      "width": "520px",
      "height": "520px",
      "border-radius": "9999px",
      "background": "radial-gradient(circle, rgba(255, 79, 163, 0.35) 0%, transparent 70%)",
      "filter": "blur(48px)",
      "animation": "floatSlow 9s ease-in-out infinite"
    }
  }
];

// Add the new styles
project.styles.push(...newStyles);

// Update brand logo to use file path instead of base64
// Navigate to header > header-container > brand-link > image
const components = project.pages[0].frames[0].component.components;
for (const comp of components) {
  if (comp.classes?.includes('header')) {
    for (const inner of comp.components || []) {
      for (const link of inner.components || []) {
        for (const img of link.components || []) {
          if (img.type === 'image') {
            img.attributes.src = '/icons/psychedelic-logo-48.png';
            console.log('Updated brand logo');
          }
        }
      }
    }
  }
}

fs.writeFileSync('public/gjs-project.grapesjs', JSON.stringify(project, null, 2));
console.log('Done!');
