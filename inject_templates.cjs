const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const applyTemplateFunc = `
  // --- TEMPLATES ---
  const applyTemplate = (templateName: string) => {
    triggerHaptic(20);
    if (!reportData) return;
    
    let newValues = { ...(reportData.values || {}) };
    let newNotes = reportData.notes || "";

    switch (templateName) {
      case "Geraete-Erprobung":
        newValues["vf_arbeit"] = (newValues["vf_arbeit"] || 0) + 1;
        newValues["std_aussendienst"] = (newValues["std_aussendienst"] || 0) + 2.5;
        newNotes = (newNotes ? newNotes + "\\n" : "") + "Standard Geräte-Erprobung durchgeführt.";
        announceToAriaAndSpeech("Template Geräte-Erprobung angewendet.");
        triggerToast("🚀 Template: Geräte-Erprobung geladen");
        break;
      case "Buerotag":
        newValues["std_buero"] = (newValues["std_buero"] || 0) + 8;
        newValues["tage_arbeit"] = (newValues["tage_arbeit"] || 0) + 1;
        newNotes = (newNotes ? newNotes + "\\n" : "") + "Regulärer Bürotag.";
        announceToAriaAndSpeech("Template Bürotag angewendet.");
        triggerToast("☕ Template: Bürotag geladen");
        break;
      case "Schulung":
        newValues["schul_vorort"] = (newValues["schul_vorort"] || 0) + 1;
        newValues["std_aussendienst"] = (newValues["std_aussendienst"] || 0) + 4;
        newNotes = (newNotes ? newNotes + "\\n" : "") + "Schulung vor Ort durchgeführt.";
        announceToAriaAndSpeech("Template Schulung angewendet.");
        triggerToast("🎓 Template: Schulung geladen");
        break;
    }

    setReportData({
      ...reportData,
      values: newValues,
      notes: newNotes,
    });
  };
`;

content = content.replace('// --- EXPORT TO EXCEL ---', applyTemplateFunc + '\n  // --- EXPORT TO EXCEL ---');

const templateUI = `
          {/* TEMPLATES */}
          <section className="mb-4" aria-label="Schnell-Templates">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">⚡ Quick Templates</h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button onClick={() => applyTemplate("Geraete-Erprobung")} className="flex-none whitespace-nowrap bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-blue-200 transition-colors active:scale-95 shadow-sm border border-blue-200 dark:border-blue-800">
                🚀 Geräte-Erprobung
              </button>
              <button onClick={() => applyTemplate("Schulung")} className="flex-none whitespace-nowrap bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-emerald-200 transition-colors active:scale-95 shadow-sm border border-emerald-200 dark:border-emerald-800">
                🎓 Schulung vor Ort
              </button>
              <button onClick={() => applyTemplate("Buerotag")} className="flex-none whitespace-nowrap bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-3 py-1.5 rounded-full text-sm font-medium hover:bg-amber-200 transition-colors active:scale-95 shadow-sm border border-amber-200 dark:border-amber-800">
                ☕ Voll-Bürotag
              </button>
            </div>
          </section>
`;

content = content.replace('{/* SECTION CARDS (Top-Level Dashboard) */}', templateUI + '\n          {/* SECTION CARDS (Top-Level Dashboard) */}');

fs.writeFileSync('src/App.tsx', content);
