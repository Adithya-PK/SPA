import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import { useAcademicContext } from "../context/AcademicContext";
import { sectionOptions, semestersByYear, validSemesterForYear, yearOptions } from "../lib/academic";
import {
  fetchContextConfig,
  saveFacultyConfig,
  saveSubjectConfig,
  type FacultyAssignmentConfig,
  type SubjectConfig,
} from "../lib/api";

export function Settings() {
  const { context, setContext } = useAcademicContext();
  const { academicYear, year, semester, section } = context;
  const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
  const [facultyAssignments, setFacultyAssignments] = useState<FacultyAssignmentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Loading configuration...");
  const [errors, setErrors] = useState<string[]>([]);

  const semesters = semestersByYear[year] ?? semestersByYear.III;
  const configuredSubjects = subjects.filter((subject) => subject.code.trim() && subject.name.trim());

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrors([]);
    fetchContextConfig(context)
      .then((config) => {
        if (!active) return;
        setSubjects(config.subjects);
        setFacultyAssignments(syncFacultyRows(config.subjects, config.facultyAssignments));
        setMessage("Configuration loaded.");
      })
      .catch((error) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Unable to load configuration.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [context]);

  function handleYearChange(nextYear: string) {
    setContext({ ...context, year: nextYear, semester: validSemesterForYear(nextYear, semester) });
  }

  async function handleSaveSubjects() {
    const validationErrors = validateSubjects(subjects);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    try {
      await saveSubjectConfig({ academicYear, year, semester, subjects });
      setFacultyAssignments((current) => syncFacultyRows(subjects, current));
      setErrors([]);
      setMessage("Subjects saved for this semester.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save subjects.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveFaculty() {
    const facultyRows = syncFacultyRows(configuredSubjects, facultyAssignments);
    const validationErrors = validateFaculty(configuredSubjects, facultyRows);
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    try {
      await saveFacultyConfig({ academicYear, year, semester, section, facultyAssignments: facultyRows });
      setFacultyAssignments(facultyRows);
      setErrors([]);
      setMessage(`Faculty assignments saved for Section ${section}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save faculty assignments.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageLayout title="Settings" description="Configure semester subjects once, then assign faculty separately for each section.">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Academic Context</CardTitle>
              <CardDescription>Subjects belong to the semester. Faculty assignments belong to the selected section.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="Academic Year" value={academicYear} onChange={(value) => setContext({ ...context, academicYear: value })} />
              <SelectField label="Year" value={year} values={yearOptions} onChange={handleYearChange} />
              <SelectField label="Semester" value={validSemesterForYear(year, semester)} values={semesters} onChange={(value) => setContext({ ...context, semester: value })} />
              <SelectField label="Section" value={section} values={sectionOptions} onChange={(value) => setContext({ ...context, section: value })} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Step 1: Semester Subjects</CardTitle>
                  <CardDescription>Subject Code and Subject Name are shared by all sections in this semester.</CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setSubjects((current) => [...current, { code: "", name: "" }])}>
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {subjects.map((subject, index) => (
                <div key={index} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[0.7fr_1.2fr_auto]">
                  <Input
                    aria-label="Subject code"
                    value={subject.code}
                    placeholder="231ADC601T"
                    onChange={(event) => {
                      const next = [...subjects];
                      next[index] = { ...subject, code: event.target.value };
                      setSubjects(next);
                    }}
                  />
                  <Input
                    aria-label="Subject name"
                    value={subject.name}
                    placeholder="Data Analytics"
                    onChange={(event) => {
                      const next = [...subjects];
                      next[index] = { ...subject, name: event.target.value };
                      setSubjects(next);
                    }}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setSubjects(subjects.filter((_, itemIndex) => itemIndex !== index))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" onClick={handleSaveSubjects} disabled={loading}>
                <Save className="h-4 w-4" />
                Save Subjects
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Step 2: Section Faculty Assignments</CardTitle>
              <CardDescription>Only Faculty is editable here. Change Section above to configure A, B, C, or D.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {configuredSubjects.map((subject) => {
                const assignment = facultyAssignments.find((item) => item.subjectCode.toUpperCase() === subject.code.toUpperCase());
                return (
                  <div key={subject.code || subject.name} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[0.75fr_1.15fr_1fr]">
                    <Input value={subject.code} readOnly className="bg-muted" />
                    <Input value={subject.name} readOnly className="bg-muted" />
                    <Input
                      value={assignment?.facultyName ?? ""}
                      placeholder="Faculty Name"
                      onChange={(event) => {
                        setFacultyAssignments((current) =>
                          syncFacultyRows(configuredSubjects, current).map((item) =>
                            item.subjectCode.toUpperCase() === subject.code.toUpperCase()
                              ? { ...item, facultyName: event.target.value }
                              : item,
                          ),
                        );
                      }}
                    />
                  </div>
                );
              })}
              {!configuredSubjects.length ? (
                <p className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
                  Save configured subjects first. Faculty rows are shown only for saved subject code/name pairs.
                </p>
              ) : null}
              <Button type="button" onClick={handleSaveFaculty} disabled={loading || !configuredSubjects.length}>
                <Save className="h-4 w-4" />
                Save Section Faculty
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuration Status</CardTitle>
            <CardDescription>Saved as local JSON files in the backend data folder.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted p-4 text-sm">
              <p className="font-medium">{academicYear} / {year} / {semester} / Section {section}</p>
              <p className="mt-2 text-muted-foreground">{loading ? "Working..." : message}</p>
            </div>
            {errors.length ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {errors.map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

function syncFacultyRows(subjects: SubjectConfig[], assignments: FacultyAssignmentConfig[]) {
  return subjects.map((subject) => ({
    subjectCode: subject.code,
    facultyName:
      assignments.find((assignment) => assignment.subjectCode.toUpperCase() === subject.code.toUpperCase())?.facultyName ?? "",
  }));
}

function validateSubjects(subjects: SubjectConfig[]) {
  const errors: string[] = [];
  const codes = subjects.map((subject) => subject.code.trim().toUpperCase()).filter(Boolean);
  subjects.forEach((subject, index) => {
    if (!subject.code.trim()) errors.push(`Subject row ${index + 1}: Subject Code is required.`);
    if (!subject.name.trim()) errors.push(`Subject row ${index + 1}: Subject Name is required.`);
  });
  const duplicateCodes = codes.filter((code, index) => codes.indexOf(code) !== index);
  if (duplicateCodes.length) errors.push(`Duplicate Subject Code found: ${Array.from(new Set(duplicateCodes)).join(", ")}.`);
  return errors;
}

function validateFaculty(subjects: SubjectConfig[], assignments: FacultyAssignmentConfig[]) {
  const errors: string[] = [];
  const subjectCodes = new Set(subjects.map((subject) => subject.code.trim().toUpperCase()));
  assignments.forEach((assignment, index) => {
    if (!subjectCodes.has(assignment.subjectCode.trim().toUpperCase())) {
      errors.push(`Faculty row ${index + 1}: Subject Code must match a saved subject.`);
    }
    if (!assignment.facultyName.trim()) errors.push(`Faculty row ${index + 1}: Faculty Name is required.`);
  });
  return errors;
}

function SelectField({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        {values.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </Select>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}
