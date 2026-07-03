export type SubjectSetting = {
  code: string;
  name: string;
};

export type FacultyAssignment = {
  subjectCode: string;
  facultyName: string;
};

export type AppSettings = {
  academicYear: string;
  year: string;
  semester: string;
  section: string;
  subjects: SubjectSetting[];
  facultyAssignments: FacultyAssignment[];
};

export const defaultSettings: AppSettings = {
  academicYear: "2025-2026",
  year: "III",
  semester: "Semester 5",
  section: "A",
  subjects: [
    { code: "231ADC601T", name: "Data Analytics" },
    { code: "231ADC602T", name: "Data Exploration and Visualization" },
    { code: "231CSE918T", name: "AI for Edge Computing (PE - IV)" },
    { code: "231CSE914T", name: "Large Language Models (PE V)" },
    { code: "231CSE913T", name: "Recommender Systems (PE VI)" },
    { code: "231IBM0901T", name: "Health Informatics (OE)" },
  ],
  facultyAssignments: [
    { subjectCode: "231ADC601T", facultyName: "Dr.K.P.Revathi" },
    { subjectCode: "231ADC602T", facultyName: "Dr. J.Vijayaraj" },
    { subjectCode: "231CSE918T", facultyName: "Dr. T. Kalaiselvi" },
    { subjectCode: "231CSE914T", facultyName: "Dr. R. Meena" },
    { subjectCode: "231CSE913T", facultyName: "Dr. V. Vidhya" },
    { subjectCode: "231IBM0901T", facultyName: "Mrs. J. Febina" },
  ],
};
