export const yearOptions = ["I", "II", "III", "IV"];

export const semestersByYear: Record<string, string[]> = {
  I: ["Semester 1", "Semester 2"],
  II: ["Semester 3", "Semester 4"],
  III: ["Semester 5", "Semester 6"],
  IV: ["Semester 7", "Semester 8"],
};

export const sectionOptions = ["A", "B", "C", "D"];

export const examOptions = ["UT 1", "CAT 1", "UT 2", "CAT 2", "END SEMESTER"];

export function normalizeYear(value: string) {
  return value.replace(" Year", "").trim();
}

export function validSemesterForYear(year: string, semester: string) {
  const options = semestersByYear[normalizeYear(year)] ?? semestersByYear.III;
  return options.includes(semester) ? semester : options[0];
}

export function exportExamName(exam: string) {
  return exam.replace(/\s+/g, "");
}

export function subjectLabel(code: string, name: string) {
  if (!name || name.trim().toUpperCase() === code.trim().toUpperCase()) return code;
  return `${code} - ${name}`;
}
