export const formatMonthGerman = (monthStr: string) => {
  if (!monthStr || typeof monthStr !== "string") return "";
  const parts = monthStr.split("-");
  if (parts.length < 2) return monthStr;
  
  const [year, month] = parts;
  const monthNames = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ];
  
  const idx = parseInt(month, 10) - 1;
  return isNaN(idx) || idx < 0 || idx > 11 ? monthStr : `${monthNames[idx]} ${year}`;
};
