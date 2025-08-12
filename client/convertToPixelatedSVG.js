import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the beastSVG.ts file
const filePath = path.join(__dirname, 'src', 'utils', 'beastSVG.ts');
const fileContent = fs.readFileSync(filePath, 'utf8');

// Create output directory for SVGs
const outputDir = path.join(__dirname, 'beast-svgs');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Extract function names and their base64 images
const lines = fileContent.split('\n');
let currentFunction = null;
let imageCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Check if this line contains a function definition
  const funcMatch = line.match(/fn\s+get_(\w+)_svg\(\)/);
  if (funcMatch) {
    currentFunction = funcMatch[1];
  }
  
  // Check if this line contains a base64 image
  const base64Match = line.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
  if (base64Match && currentFunction) {
    const base64Data = base64Match[1];
    const dataUri = `data:image/png;base64,${base64Data}`;
    
    // Create SVG with embedded image and pixelated rendering
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <image href="${dataUri}" width="32" height="32" style="image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges;"/>
</svg>`;
    
    // Save as SVG file
    const fileName = `${currentFunction}.svg`;
    const filePath = path.join(outputDir, fileName);
    
    fs.writeFileSync(filePath, svgContent);
    console.log(`Saved: ${fileName}`);
    imageCount++;
    
    // Reset current function after processing its image
    currentFunction = null;
  }
}

console.log(`\nConversion complete! ${imageCount} SVG files saved to ${outputDir}`);