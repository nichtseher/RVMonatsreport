const fs = require('fs');
let content = fs.readFileSync('src/components/HistoryModal.tsx', 'utf8');

content = content.replace(
  'import { SectionsConfig, HistoryRecord } from "../types";',
  'import { SectionsConfig, HistoryRecord } from "../types";\nimport { exportReportToExcel, exportTimeLogsToExcel, triggerFileDownload } from "../utils/excelUtils";\nimport { formatMonthGerman } from "../utils/dateUtils";'
);

// Remove formatMonthGerman
content = content.replace(/const formatMonthGerman = \([^)]*\) => {[\s\S]*?idx > 11 \? monthStr : \`\${monthNames\[idx\]} \${year}\`;\n  };\n/, '');

const handleDirectExportRegex = /const handleDirectExport = async \([^)]*\) => {[\s\S]*?announceToAriaAndSpeech\(\`Excel RV Report für \${formatMonthGerman\(monthVal\)} heruntergeladen.\`\);\n  };/;
content = content.replace(handleDirectExportRegex, `const handleDirectExport = async (record: HistoryRecord) => {
    announceToAriaAndSpeech(\`Direkt-Export für \${formatMonthGerman(record.month)} wird vorbereitet.\`);
    try {
      const { wbout, monthVal, nameVal } = await exportReportToExcel(record, {} as any, true);
      const cleanName = nameVal.replace(/\\s+/g, "_") || "Mitarbeiter";
      const formattedMonthName = formatMonthGerman(monthVal).replace(/\\s+/g, "_");
      const fileName = \`RV_Mobil_Report_\${cleanName}_\${formattedMonthName}_Archiv.xlsx\`;
      
      await triggerFileDownload(wbout, fileName);
      triggerToast(\`Excel RV Report für \${formatMonthGerman(monthVal)} exportiert!\`);
      announceToAriaAndSpeech(\`Excel RV Report für \${formatMonthGerman(monthVal)} exportiert.\`);
    } catch (err) {
      console.error(err);
      triggerToast("Fehler beim Exportieren des Reports.");
    }
  };`);
  
const handleDirectExportTimeLogsRegex = /const handleDirectExportTimeLogs = async \([^)]*\) => {[\s\S]*?announceToAriaAndSpeech\(\`Zeiterfassungs-Protokoll für \${formatMonthGerman\(monthVal\)} heruntergeladen.\`\);\n  };/;
content = content.replace(handleDirectExportTimeLogsRegex, `const handleDirectExportTimeLogs = async (record: HistoryRecord) => {
    announceToAriaAndSpeech(\`Zeiterfassungs-Export für \${formatMonthGerman(record.month)} wird vorbereitet.\`);
    try {
      const result = await exportTimeLogsToExcel(record, true);
      if (!result) {
        triggerToast("Keine Zeiterfassungsdaten vorhanden!");
        announceToAriaAndSpeech("Keine Zeiterfassungsdaten zum Exportieren vorhanden.");
        return;
      }
      
      const { wbout, monthVal, nameVal } = result;
      const cleanName = nameVal.replace(/\\s+/g, "_") || "Mitarbeiter";
      const formattedMonthName = formatMonthGerman(monthVal).replace(/\\s+/g, "_");
      const fileName = \`RV_Zeiterfassung_\${cleanName}_\${formattedMonthName}_Archiv.xlsx\`;
      
      await triggerFileDownload(wbout, fileName);
      triggerToast(\`Zeiterfassung für \${formatMonthGerman(monthVal)} exportiert!\`);
      announceToAriaAndSpeech(\`Zeiterfassungs-Protokoll für \${formatMonthGerman(monthVal)} exportiert.\`);
    } catch (err) {
      console.error(err);
      triggerToast("Fehler beim Exportieren der Zeiterfassung.");
    }
  };`);

fs.writeFileSync('src/components/HistoryModal.tsx', content);
