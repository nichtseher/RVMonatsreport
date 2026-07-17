const fs = require('fs');

let content = fs.readFileSync('src/components/HistoryModal.tsx', 'utf8');

// Update Interface
content = content.replace(
  'interface HistoryModalProps {',
  'interface HistoryModalProps {\n  appFields: SectionsConfig;'
);

// Update Component props
content = content.replace(
  'export default function HistoryModal({',
  'export default function HistoryModal({\n  appFields,'
);

// Update exportReportToExcel call
content = content.replace(
  'await exportReportToExcel(record, {} as any, true);',
  'await exportReportToExcel(record, appFields, true);'
);

fs.writeFileSync('src/components/HistoryModal.tsx', content);

let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(
  '<HistoryModal\n            history={history}',
  '<HistoryModal\n            appFields={appFields}\n            history={history}'
);
fs.writeFileSync('src/App.tsx', appContent);
