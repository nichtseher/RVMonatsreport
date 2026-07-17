const fs = require('fs');

const fileNames = ['src/components/StatsModal.tsx', 'src/components/TimeModal.tsx'];

fileNames.forEach(fileName => {
  let content = fs.readFileSync(fileName, 'utf8');
  content = content.replace(
    /const formatMonthGerman = \([^)]*\) => {[\s\S]*?idx > 11 \? monthStr : \`\${months\[idx\]} \${year}\`;\n  };\n/,
    ''
  );
  content = content.replace(
    /const formatMonthGerman = \([^)]*\) => {[\s\S]*?idx > 11 \? monthStr : \`\${monthNames\[idx\]} \${year}\`;\n  };\n/,
    ''
  );
  content = content.replace(
    'import {',
    'import { formatMonthGerman } from "../utils/dateUtils";\nimport {'
  );
  fs.writeFileSync(fileName, content);
});

