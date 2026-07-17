const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');

let braces = 0;
let parens = 0;

for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') braces++;
  if (content[i] === '}') braces--;
  if (content[i] === '(') parens++;
  if (content[i] === ')') parens--;
}
console.log('Braces:', braces, 'Parens:', parens);
