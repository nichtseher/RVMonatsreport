const fs = require('fs');

let content = fs.readFileSync('src/components/TimeModal.tsx', 'utf8');

content = content.replace(
  'const calculateYearlyOvertime = () => {',
  'const yearlyOvertime = React.useMemo(() => {'
);
content = content.replace(
  '    return {\n      totalBalance,\n      totalOvertimeAccumulated,\n      monthsCalculated\n    };\n  };',
  '    return {\n      totalBalance,\n      totalOvertimeAccumulated,\n      monthsCalculated\n    };\n  }, [history, selectedMonth, reportData, carryover]);'
);

content = content.replace(
  'const calculateYearlyVacation = () => {',
  'const yearlyVacation = React.useMemo(() => {'
);
content = content.replace(
  '    return {\n      totalEntitlement,\n      totalUrlaubTaken,\n      remainingVacation,\n      totalKrankDays,\n      totalFeiertage\n    };\n  };',
  '    return {\n      totalEntitlement,\n      totalUrlaubTaken,\n      remainingVacation,\n      totalKrankDays,\n      totalFeiertage\n    };\n  }, [history, selectedMonth, reportData, carryover]);'
);

// Replace all usages:
content = content.replace(/calculateYearlyOvertime\(\)/g, 'yearlyOvertime');
content = content.replace(/calculateYearlyVacation\(\)/g, 'yearlyVacation');

fs.writeFileSync('src/components/TimeModal.tsx', content);
