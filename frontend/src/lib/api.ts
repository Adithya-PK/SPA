const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8001/api";

export type UploadContext = {
  academicYear: string;
  year: string;
  semester: string;
  section: string;
  exam: string;
};

export type SubjectConfig = {
  code: string;
  name: string;
};

export type FacultyAssignmentConfig = {
  subjectCode: string;
  facultyName: string;
};

export type AppConfigResponse = {
  academicYear: string;
  year: string;
  semester: string;
  section: string;
  subjects: SubjectConfig[];
  facultyAssignments: FacultyAssignmentConfig[];
};

export type UploadedSubject = {
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  studentCount: number;
  sourceFile: string;
};

export type UploadStatusResponse = {
  uploads: UploadedSubject[];
  mergedStudentCount: number;
  warnings: string[];
};

export type AnalysisMetrics = {
  classStrength: number;
  studentsAttended: number;
  studentsAbsent: number;
  studentsPassed: number;
  studentsFailed: number;
  passPercentage: number;
  failPercentage: number;
  averageMarks: number | null;
  highestMarks: number | null;
  lowestMarks: number | null;
};

export type SubjectAnalysis = AnalysisMetrics & {
  subjectCode: string;
};

export type FailureDistributionItem = {
  label: string;
  count: number;
};

export type StudentAnalysis = {
  registerNumber: string;
  studentName: string;
  failedSubjects: string[];
  failedSubjectCount: number;
  absentSubjects: string[];
  absentSubjectCount: number;
  subjects: Record<
    string,
    {
      marks: number | string | null;
      result: "pass" | "fail" | "absent" | "withdrawn" | "invalid" | "not_uploaded";
      isBorderline: boolean;
    }
  >;
};

export type AnalysisResponse = {
  examType: "UT" | "CAT" | "END_SEMESTER";
  rule: {
    total: number | null;
    passMark: number | null;
    borderlineMin: number | null;
    borderlineMax: number | null;
  };
  overall: AnalysisMetrics;
  subjects: SubjectAnalysis[];
  students: StudentAnalysis[];
  failureDistribution: FailureDistributionItem[];
  warnings: string[];
};

export async function fetchUploadStatus(context: UploadContext): Promise<UploadStatusResponse> {
  const response = await fetch(`${apiBaseUrl}/uploads/status?${toQuery(context)}`);
  if (!response.ok) {
    throw new Error("Unable to load upload status.");
  }
  return response.json();
}

export async function fetchContextConfig(context: Pick<UploadContext, "academicYear" | "year" | "semester" | "section">): Promise<AppConfigResponse> {
  const response = await fetch(`${apiBaseUrl}/config/context?${toConfigQuery(context)}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(formatApiError(payload?.detail, "Unable to load configuration."));
  }
  return response.json();
}

export async function saveSubjectConfig({
  academicYear,
  year,
  semester,
  subjects,
}: Pick<UploadContext, "academicYear" | "year" | "semester"> & { subjects: SubjectConfig[] }) {
  const response = await fetch(`${apiBaseUrl}/config/subjects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ academicYear, year, semester, subjects }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(formatApiError(payload?.detail, "Unable to save subjects."));
  }
  return response.json();
}

export async function saveFacultyConfig({
  academicYear,
  year,
  semester,
  section,
  facultyAssignments,
}: Pick<UploadContext, "academicYear" | "year" | "semester" | "section"> & { facultyAssignments: FacultyAssignmentConfig[] }) {
  const response = await fetch(`${apiBaseUrl}/config/faculty`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ academicYear, year, semester, section, facultyAssignments }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(formatApiError(payload?.detail, "Unable to save faculty assignments."));
  }
  return response.json();
}

export async function uploadSubjectFile({
  context,
  subjectCode,
  subjectName,
  facultyName,
  file,
}: {
  context: UploadContext;
  subjectCode: string;
  subjectName: string;
  facultyName: string;
  file: File;
}) {
  const formData = new FormData();
  formData.append("academic_year", context.academicYear);
  formData.append("year", context.year);
  formData.append("semester", context.semester);
  formData.append("section", context.section);
  formData.append("exam", context.exam);
  formData.append("subject_code", subjectCode);
  formData.append("subject_name", subjectName);
  formData.append("faculty_name", facultyName);
  formData.append("file", file);

  const response = await fetch(`${apiBaseUrl}/uploads/subject`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? "Upload failed.");
  }

  return response.json();
}

export async function fetchAnalysis(context: UploadContext): Promise<AnalysisResponse> {
  const response = await fetch(`${apiBaseUrl}/analysis/summary?${toQuery(context)}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? "Unable to load analysis.");
  }
  return response.json();
}

export async function downloadExport(context: UploadContext, type: "pdf" | "excel") {
  const response = await fetch(`${apiBaseUrl}/exports/${type}?${toQuery(context)}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `Unable to export ${type}.`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  const fallbackName = `student-performance-${context.exam.toLowerCase().replace(/\s+/g, "-")}.${type === "pdf" ? "pdf" : "xlsx"}`;
  const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? fallbackName;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function toQuery(context: UploadContext) {
  return new URLSearchParams({
    academic_year: context.academicYear,
    year: context.year,
    semester: context.semester,
    section: context.section,
    exam: context.exam,
  }).toString();
}

function toConfigQuery(context: Pick<UploadContext, "academicYear" | "year" | "semester" | "section">) {
  return new URLSearchParams({
    academic_year: context.academicYear,
    year: context.year,
    semester: context.semester,
    section: context.section,
  }).toString();
}

function formatApiError(detail: unknown, fallback: string) {
  if (Array.isArray(detail)) return detail.join(" ");
  if (typeof detail === "string") return detail;
  return fallback;
}
