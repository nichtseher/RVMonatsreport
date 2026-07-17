const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Remove hook definition
content = content.replace(/\/\/ --- WEB SPEECH API HOOK ---[\s\S]*?const { isListening, toggleListening } = useSpeechToText\(handleSpeechResult\);\n/m, '');

// Remove the second dictation button HTML
const secondButtonRegex = /<div className="mb-2 flex items-center gap-2">[\s\S]*?<button[\s\S]*?onClick={toggleListening}[\s\S]*?<\/button>[\s\S]*?<\/div>\n/;
content = content.replace(secondButtonRegex, '');

fs.writeFileSync('src/App.tsx', content);
