const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  '  // --- ROUTING / NAVIGATION STATE ---',
  'export default function App() {\n  // --- ROUTING / NAVIGATION STATE ---'
);

// I also need to put the `}` back at the end of the file since I deleted it
content += '\n}';

fs.writeFileSync('src/App.tsx', content);
