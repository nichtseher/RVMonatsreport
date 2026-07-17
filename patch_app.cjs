const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add imports
content = content.replace(
  'import { AccessibilitySettings',
  'import { exportReportToExcel, exportTimeLogsToExcel, triggerFileDownload } from "./utils/excelUtils";\nimport { formatMonthGerman } from "./utils/dateUtils";\nimport { AccessibilitySettings'
);

// 2. Remove formatMonthGerman definition
content = content.replace(/const formatMonthGerman = \([^)]*\) => {[\s\S]*?idx > 11 \? monthStr : \`\${monthNames\[idx\]} \${year}\`;\n  };\n/, '');

// 3. Replace handleExportExcel
const exportExcelRegex = /const handleExportExcel = async \(\) => {[\s\S]*?announceToAriaAndSpeech\(\`Excel RV Report für \${monthVal} heruntergeladen.\`\);\n  };/;
content = content.replace(exportExcelRegex, `const handleExportExcel = async () => {
    triggerHaptic(25);
    if (!reportData) return;
    try {
      const { wbout, monthVal, nameVal } = await exportReportToExcel(reportData, appFields, false);
      const cleanName = nameVal.replace(/\\s+/g, "_") || "Mitarbeiter";
      const formattedMonthName = formatMonthGerman(monthVal).replace(/\\s+/g, "_");
      const fileName = \`RV_Mobil_Report_\${cleanName}_\${formattedMonthName}.xlsx\`;
      
      await triggerFileDownload(wbout, fileName);
      triggerToast(\`Excel RV Report für \${formatMonthGerman(monthVal)} exportiert!\`);
      announceToAriaAndSpeech(\`Excel RV Report für \${formatMonthGerman(monthVal)} exportiert.\`);
    } catch (err) {
      console.error(err);
      triggerToast("Fehler beim Exportieren des Reports.");
    }
  };`);

// 4. Replace handleExportTimeLogsExcel
const exportTimeLogsRegex = /const handleExportTimeLogsExcel = async \(\) => {[\s\S]*?announceToAriaAndSpeech\(\`Zeiterfassungs-Protokoll für \${monthVal} heruntergeladen.\`\);\n  };/;
content = content.replace(exportTimeLogsRegex, `const handleExportTimeLogsExcel = async () => {
    triggerHaptic(25);
    if (!reportData) return;
    try {
      const result = await exportTimeLogsToExcel(reportData, false);
      if (!result) {
        triggerToast("Keine Zeiterfassungsdaten vorhanden!");
        announceToAriaAndSpeech("Keine Zeiterfassungsdaten zum Exportieren vorhanden.");
        return;
      }
      
      const { wbout, monthVal, nameVal } = result;
      const cleanName = nameVal.replace(/\\s+/g, "_") || "Mitarbeiter";
      const formattedMonthName = formatMonthGerman(monthVal).replace(/\\s+/g, "_");
      const fileName = \`RV_Zeiterfassung_\${cleanName}_\${formattedMonthName}.xlsx\`;
      
      await triggerFileDownload(wbout, fileName);
      triggerToast(\`Zeiterfassung für \${formatMonthGerman(monthVal)} exportiert!\`);
      announceToAriaAndSpeech(\`Zeiterfassungs-Protokoll für \${formatMonthGerman(monthVal)} exportiert.\`);
    } catch (err) {
      console.error(err);
      triggerToast("Fehler beim Exportieren der Zeiterfassung.");
    }
  };`);

// 5. Remove the "COMPACT EXPORT OPTIONS" from the form because we can keep only VL senden if the user wants it, or remove all. 
// Wait, user said: "da sind unten ein paar Button s zu viel glaube ich" - we can just keep "Monat abschließen" and "Direkt an VL Senden" ?
// Actually, let's keep "VL Senden" only as an icon button next to "Monat abschließen", or maybe under it. 
const finalActionAreaRegex = /\{\/\* COMPACT EXPORT OPTIONS \*\/\}[\s\S]*?<\/div>\n      <\/section>/;
content = content.replace(finalActionAreaRegex, `
        {/* EXPORT OPTIONS (Reduced) */}
        <div className="flex justify-center mt-2">
          <button
            type="button"
            onClick={handleSendToVL}
            className="w-full py-4 px-6 rounded-2xl font-bold bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-base flex items-center justify-center gap-2.5 shadow-sm cursor-pointer transition-all active:scale-[0.99] focus-visible:ring-4"
          >
            <span className="text-xl">🚀</span>
            <span>Direkt an VL senden</span>
          </button>
        </div>
      </section>`);

fs.writeFileSync('src/App.tsx', content);
