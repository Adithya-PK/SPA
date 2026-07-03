import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { examOptions, sectionOptions, semestersByYear, validSemesterForYear, yearOptions } from "../../lib/academic";
import type { UploadContext } from "../../lib/api";

const filterOptions = {
  academicYear: ["2025-2026", "2026-2027"],
};

export function ContextFilters({
  showExam = true,
  value,
  onChange,
}: {
  showExam?: boolean;
  value?: UploadContext;
  onChange?: (value: UploadContext) => void;
}) {
  function update(key: keyof UploadContext, nextValue: string) {
    if (!value || !onChange) return;
    if (key === "year") {
      onChange({ ...value, year: nextValue, semester: validSemesterForYear(nextValue, value.semester) });
      return;
    }
    onChange({ ...value, [key]: nextValue });
  }

  const year = value?.year ?? "III";
  const semesterOptions = semestersByYear[year] ?? semestersByYear.III;

  return (
    <div className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-5">
      <FilterSelect
        label="Academic Year"
        values={uniqueOptions(filterOptions.academicYear, value?.academicYear)}
        value={value?.academicYear}
        defaultValue="2025-2026"
        onChange={(nextValue) => update("academicYear", nextValue)}
      />
      <FilterSelect
        label="Year"
        values={uniqueOptions(yearOptions, value?.year)}
        value={value?.year}
        defaultValue="III"
        onChange={(nextValue) => update("year", nextValue)}
      />
      <FilterSelect
        label="Semester"
        values={uniqueOptions(semesterOptions, value?.semester)}
        value={validSemesterForYear(year, value?.semester ?? semesterOptions[0])}
        defaultValue="Semester 5"
        onChange={(nextValue) => update("semester", nextValue)}
      />
      <FilterSelect
        label="Section"
        values={uniqueOptions(sectionOptions, value?.section)}
        value={value?.section}
        defaultValue="A"
        onChange={(nextValue) => update("section", nextValue)}
      />
      {showExam ? (
        <FilterSelect
          label="Exam"
          values={uniqueOptions(examOptions, value?.exam)}
          value={value?.exam}
          defaultValue="UT 1"
          onChange={(nextValue) => update("exam", nextValue)}
        />
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  values,
  defaultValue,
  value,
  onChange,
}: {
  label: string;
  values: string[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} defaultValue={value ? undefined : defaultValue ?? values[0]} onChange={(event) => onChange?.(event.target.value)}>
        {values.map((value) => (
          <option key={value}>{value}</option>
        ))}
      </Select>
    </div>
  );
}

function uniqueOptions(options: string[], value?: string) {
  if (!value || options.includes(value)) return options;
  return [value, ...options];
}
