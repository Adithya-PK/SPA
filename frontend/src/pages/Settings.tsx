import { useMemo, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { PageLayout } from "../components/layout/PageLayout";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select } from "../components/ui/select";
import { sectionOptions, semestersByYear, validSemesterForYear, yearOptions } from "../lib/academic";
import { loadSettings, saveSettings, type AppSettings } from "../lib/settings";

export function Settings() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const settingsJson = useMemo(() => JSON.stringify(settings, null, 2), [settings]);

  function updateField<Key extends keyof AppSettings>(key: Key, value: AppSettings[Key]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setErrors([]);
  }

  function handleSave() {
    const validationErrors = validateSettings(settings);
    if (validationErrors.length) {
      setErrors(validationErrors);
      setSaved(false);
      return;
    }
    saveSettings(settings);
    setSaved(true);
  }

  return (
    <PageLayout title="Settings" description="Academic setup for the examination analysis MVP.">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Academic Context</CardTitle>
              <CardDescription>Stored locally as JSON for the MVP foundation.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Academic Year" value={settings.academicYear} onChange={(value) => updateField("academicYear", value)} />
              <SelectField
                label="Year"
                value={settings.year}
                values={yearOptions}
                onChange={(value) => {
                  setSettings((current) => ({
                    ...current,
                    year: value,
                    semester: validSemesterForYear(value, current.semester),
                  }));
                  setSaved(false);
                  setErrors([]);
                }}
              />
              <SelectField
                label="Semester"
                value={validSemesterForYear(settings.year, settings.semester)}
                values={semestersByYear[settings.year] ?? semestersByYear.III}
                onChange={(value) => updateField("semester", value)}
              />
              <SelectField label="Section" value={settings.section} values={sectionOptions} onChange={(value) => updateField("section", value)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Subjects</CardTitle>
                  <CardDescription>Subject codes are used by the upload screen.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateField("subjects", [...settings.subjects, { code: "", name: "" }])
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {settings.subjects.map((subject, index) => (
                <div key={`${subject.code}-${index}`} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[0.5fr_1fr_auto]">
                  <Input
                    aria-label="Subject code"
                    value={subject.code}
                    placeholder="Code"
                    onChange={(event) => {
                      const next = [...settings.subjects];
                      next[index] = { ...subject, code: event.target.value };
                      updateField("subjects", next);
                    }}
                  />
                  <Input
                    aria-label="Subject name"
                    value={subject.name}
                    placeholder="Subject name"
                    onChange={(event) => {
                      const next = [...settings.subjects];
                      next[index] = { ...subject, name: event.target.value };
                      updateField("subjects", next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => updateField("subjects", settings.subjects.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>Faculty Assignments</CardTitle>
                  <CardDescription>One faculty assignment per subject for the MVP.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    updateField("facultyAssignments", [
                      ...settings.facultyAssignments,
                      { subjectCode: "", facultyName: "" },
                    ])
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {settings.facultyAssignments.map((assignment, index) => (
                <div key={`${assignment.subjectCode}-${index}`} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[0.5fr_1fr_auto]">
                  <Input
                    aria-label="Assignment subject code"
                    value={assignment.subjectCode}
                    placeholder="Subject code"
                    onChange={(event) => {
                      const next = [...settings.facultyAssignments];
                      next[index] = { ...assignment, subjectCode: event.target.value };
                      updateField("facultyAssignments", next);
                    }}
                  />
                  <Input
                    aria-label="Faculty name"
                    value={assignment.facultyName}
                    placeholder="Faculty name"
                    onChange={(event) => {
                      const next = [...settings.facultyAssignments];
                      next[index] = { ...assignment, facultyName: event.target.value };
                      updateField("facultyAssignments", next);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      updateField(
                        "facultyAssignments",
                        settings.facultyAssignments.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Local JSON Preview</CardTitle>
            <CardDescription>This is the current settings payload stored in the browser.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <pre className="max-h-[520px] overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{settingsJson}</pre>
            <Button type="button" onClick={handleSave} className="w-full">
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
            {saved ? <p className="text-sm font-medium text-emerald-700">Settings saved locally.</p> : null}
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

function validateSettings(settings: AppSettings) {
  const errors: string[] = [];
  const subjectCodes = settings.subjects.map((subject) => subject.code.trim().toUpperCase()).filter(Boolean);

  settings.subjects.forEach((subject, index) => {
    if (!subject.name.trim()) errors.push(`Subject ${index + 1}: Subject Name is required.`);
    if (!subject.code.trim()) errors.push(`Subject ${index + 1}: Subject Code is required.`);
  });

  const duplicateCodes = subjectCodes.filter((code, index) => subjectCodes.indexOf(code) !== index);
  if (duplicateCodes.length) errors.push(`Duplicate Subject Code found: ${Array.from(new Set(duplicateCodes)).join(", ")}.`);

  settings.facultyAssignments.forEach((assignment, index) => {
    if (!assignment.subjectCode.trim()) errors.push(`Faculty Assignment ${index + 1}: Subject Code is required.`);
    if (!assignment.facultyName.trim()) errors.push(`Faculty Assignment ${index + 1}: Faculty Name is required.`);
    if (assignment.subjectCode.trim() && !subjectCodes.includes(assignment.subjectCode.trim().toUpperCase())) {
      errors.push(`Faculty Assignment ${index + 1}: Subject Code must match an existing subject.`);
    }
  });

  if (!settings.academicYear.trim()) errors.push("Academic Year is required.");
  if (!sectionOptions.includes(settings.section)) errors.push("Section must be A, B, C, or D.");
  if (!validSemesterForYear(settings.year, settings.semester)) errors.push("Invalid Year/Semester combination.");

  return errors;
}
