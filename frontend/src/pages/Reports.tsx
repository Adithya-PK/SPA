import { Fragment, useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ContextFilters } from "../components/filters/ContextFilters";
import { PageLayout } from "../components/layout/PageLayout";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAcademicContext } from "../context/AcademicContext";
import { subjectLabel } from "../lib/academic";
import { downloadExport, fetchAnalysis, fetchContextConfig, fetchUploadStatus, type AnalysisResponse, type AppConfigResponse, type UploadContext, type UploadStatusResponse } from "../lib/api";

const tabs = ["Report 1", "Report 2", "Report 3"];
const chartColors = ["#0f766e", "#eab308", "#2563eb", "#dc2626", "#7c3aed", "#475569"];

export function Reports() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") ?? tabs[0]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(searchParams.get("subject"));
  const { context, setContext } = useAcademicContext();
  const [config, setConfig] = useState<AppConfigResponse>({ ...context, subjects: [], facultyAssignments: [] });
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatusResponse>({ uploads: [], mergedStudentCount: 0, warnings: [] });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [message, setMessage] = useState("Upload subject files to view reports.");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setConfig({ ...context, subjects: [], facultyAssignments: [] });
    setUploadStatus({ uploads: [], mergedStudentCount: 0, warnings: [] });
    setAnalysis(null);
    setSelectedSubject(null);

    async function loadReports() {
      try {
        const nextConfig = await fetchContextConfig(context);
        if (!active) return;
        setConfig(nextConfig);

        if (!nextConfig.subjects.length) {
          setUploadStatus({ uploads: [], mergedStudentCount: 0, warnings: [] });
          setAnalysis(null);
          setMessage("No reports available because this semester has no configured subjects.");
          return;
        }

        const nextUploadStatus = filterUploadStatus(await fetchUploadStatus(context), nextConfig);
        if (!active) return;
        setUploadStatus(nextUploadStatus);

        if (!nextConfig.facultyAssignments.length) {
          setAnalysis(null);
          setMessage("No reports available because this section has no faculty assignments.");
          return;
        }

        try {
          const nextAnalysis = await fetchAnalysis(context);
          if (!active) return;
          setAnalysis(nextAnalysis);
          setSelectedSubject((current) => current ?? searchParams.get("subject") ?? nextAnalysis.subjects[0]?.subjectCode ?? null);
          setMessage(`Live reports generated from ${nextAnalysis.examType.replace("_", " ")} analysis.`);
        } catch (error) {
          if (!active) return;
          setAnalysis(null);
          setMessage(error instanceof Error ? error.message : "Upload subject files to view reports.");
        }
      } catch (error) {
        if (!active) return;
        setAnalysis(null);
        setMessage(error instanceof Error ? error.message : "Unable to load reports.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadReports();

    return () => {
      active = false;
    };
  }, [context, searchParams]);

  const rows = useMemo(() => buildSubjectRows(analysis, uploadStatus, config), [analysis, uploadStatus, config]);
  const selectedRow = rows.find((row) => row.subjectCode === selectedSubject) ?? rows[0];

  useEffect(() => {
    if (!rows.length) return;
    if (!selectedSubject || !rows.some((row) => row.subjectCode === selectedSubject)) {
      setSelectedSubject(rows[0].subjectCode);
    }
  }, [rows, selectedSubject]);

  async function handleExport(type: "pdf" | "excel") {
    setExporting(type);
    setMessage(`Preparing ${type === "pdf" ? "PDF" : "Excel"} export...`);
    try {
      await downloadExport(context, type);
      setMessage(`${type === "pdf" ? "PDF" : "Excel"} export downloaded.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <PageLayout title="Reports" description="Live examination reports generated from the reusable analysis engine.">
      <ContextFilters value={context} onChange={setContext} />

      {activeTab === "Report 3" && rows.length ? (
        <SubjectNavigation rows={rows} selectedSubject={selectedRow?.subjectCode ?? selectedSubject} onSelectSubject={setSelectedSubject} />
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">{loading ? "Loading live report data..." : message}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={!analysis || !config.subjects.length || Boolean(exporting)} onClick={() => handleExport("pdf")}>
              <FileText className="h-4 w-4" />
              {exporting === "pdf" ? "Preparing..." : "PDF Export"}
            </Button>
            <Button type="button" variant="outline" disabled={!analysis || !config.subjects.length || Boolean(exporting)} onClick={() => handleExport("excel")}>
              <FileSpreadsheet className="h-4 w-4" />
              {exporting === "excel" ? "Preparing..." : "Excel Export"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {!analysis && !loading ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {config.subjects.length
              ? "No report data is available for this selection. Upload subject files for the selected exam to continue."
              : "No reports available because this semester has no configured subjects."}
          </CardContent>
        </Card>
      ) : null}

      {analysis ? <Tabs>
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {activeTab === "Report 1" ? (
          <ReportOne rows={rows} expanded={expanded} onToggle={setExpanded} analysis={analysis} />
        ) : null}

        {activeTab === "Report 2" ? (
          <ReportTwo analysis={analysis} expanded={expanded} onToggle={setExpanded} />
        ) : null}

        {activeTab === "Report 3" ? (
          <ReportThree
            selectedRow={selectedRow}
          />
        ) : null}
      </Tabs> : null}
    </PageLayout>
  );
}

function SubjectNavigation({
  rows,
  selectedSubject,
  onSelectSubject,
}: {
  rows: SubjectReportRow[];
  selectedSubject: string | null | undefined;
  onSelectSubject: (value: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {rows.map((row) => (
            <Button
              key={row.subjectCode}
              type="button"
              variant={selectedSubject === row.subjectCode ? "default" : "outline"}
              size="sm"
              className="shrink-0"
              onClick={() => onSelectSubject(row.subjectCode)}
            >
              {row.subjectName}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReportOne({
  rows,
  expanded,
  onToggle,
  analysis,
}: {
  rows: SubjectReportRow[];
  expanded: string | null;
  onToggle: (value: string | null) => void;
  analysis: AnalysisResponse | null;
}) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Faculty Subject Summary</CardTitle>
          <CardDescription>Expand a subject to view failed students, absentees, and marks short.</CardDescription>
        </CardHeader>
        <CardContent>
          <SubjectSummaryTable rows={rows} expanded={expanded} onToggle={onToggle} />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <ReportChartCard title="Subject Pass %" description="Subject-wise pass percentage.">
          <BarChart data={rows.map((row) => ({ ...row, subjectLabel: row.subjectName }))}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="subjectLabel" tick={{ fontSize: 11 }} interval={0} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="passPercentage" name="Pass %" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ReportChartCard>

        <ReportChartCard title="Attendance" description="Attended and absent students by subject.">
          <BarChart data={rows.map((row) => ({ ...row, subjectLabel: row.subjectName }))}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="subjectLabel" tick={{ fontSize: 11 }} interval={0} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="attended" name="Attended" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="absent" name="Absent" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ReportChartCard>

        <ReportChartCard title="Average Marks" description="Average marks from uploaded subject data.">
          <BarChart data={rows.map((row) => ({ ...row, subjectLabel: row.subjectName }))}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="subjectLabel" tick={{ fontSize: 11 }} interval={0} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="averageMarks" name="Average" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ReportChartCard>
      </div>
    </div>
  );
}

function ReportTwo({
  analysis,
  expanded,
  onToggle,
}: {
  analysis: AnalysisResponse | null;
  expanded: string | null;
  onToggle: (value: string | null) => void;
}) {
  const distribution = analysis?.failureDistribution ?? [];
  const allPass = distribution.find((item) => item.label === "All Pass")?.count ?? 0;
  const totalStudents = analysis?.overall.classStrength ?? 0;
  const overallPass = totalStudents ? Math.round((allPass / totalStudents) * 10000) / 100 : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Failure Distribution Summary</CardTitle>
          <CardDescription>Section-level failure distribution.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Total Students</th>
                  <th className="py-3 pr-4 font-medium">All Pass</th>
                  <th className="py-3 pr-4 font-medium">1 Failure</th>
                  <th className="py-3 pr-4 font-medium">2 Failures</th>
                  <th className="py-3 pr-4 font-medium">3 Failures</th>
                  <th className="py-3 pr-4 font-medium">4 Failures</th>
                  <th className="py-3 pr-4 font-medium">More than 4</th>
                  <th className="py-3 font-medium">Overall Pass %</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 pr-4">{totalStudents}</td>
                  <td className="py-3 pr-4">{countFor(distribution, "All Pass")}</td>
                  <td className="py-3 pr-4">{countFor(distribution, "One Failure")}</td>
                  <td className="py-3 pr-4">{countFor(distribution, "Two Failures")}</td>
                  <td className="py-3 pr-4">{countFor(distribution, "Three Failures")}</td>
                  <td className="py-3 pr-4">{countFor(distribution, "Four Failures")}</td>
                  <td className="py-3 pr-4">{countFor(distribution, "More than Four Failures")}</td>
                  <td className="py-3">{overallPass}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <ReportChartCard title="Failure Distribution" description="Students grouped by number of failed subjects.">
          <PieChart>
            <Pie data={distribution} dataKey="count" nameKey="label" outerRadius={104}>
              {distribution.map((entry, index) => (
                <Cell key={entry.label} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ReportChartCard>

        <ReportChartCard title="Overall Pass vs Fail" description="All-pass students compared with students having failures.">
          <PieChart>
            <Pie
              data={[
                { name: "All Pass", value: allPass, color: "hsl(var(--accent))" },
                { name: "Failed", value: Math.max(totalStudents - allPass, 0), color: "hsl(var(--destructive))" },
              ]}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={104}
              paddingAngle={4}
            >
              {[
                { name: "All Pass", color: "hsl(var(--accent))" },
                { name: "Failed", color: "hsl(var(--destructive))" },
              ].map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ReportChartCard>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribution Categories</CardTitle>
          <CardDescription>Expandable student lists.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {distribution.map((item) => {
            const students = studentsForDistribution(analysis, item.label);
            const isOpen = expanded === item.label;
            return (
              <div key={item.label} className="rounded-lg border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  onClick={() => onToggle(isOpen ? null : item.label)}
                >
                  <span className="font-medium">{item.label}</span>
                  <Badge variant={item.count ? "default" : "muted"}>{item.count} students</Badge>
                </button>
                {isOpen ? (
                  <div className="border-t p-4">
                    <StudentList students={students} emptyText="No students in this category." />
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function ReportThree({ selectedRow }: { selectedRow: SubjectReportRow | undefined }) {
  const selectedChartRows = selectedRow
    ? [
        { name: "Passed", value: selectedRow.passed, color: "hsl(var(--accent))" },
        { name: "Failed", value: selectedRow.failed, color: "hsl(var(--destructive))" },
      ]
    : [];
  const attendanceRows = selectedRow
    ? [
        { name: "Attended", value: selectedRow.attended, color: "hsl(var(--primary))" },
        { name: "Absent", value: selectedRow.absent, color: "hsl(var(--secondary))" },
      ]
    : [];
  const resultRows = selectedRow
    ? [
        { name: "Pass", value: selectedRow.passed },
        { name: "Fail", value: selectedRow.failed },
        { name: "Absent", value: selectedRow.absent },
        { name: "Borderline", value: selectedRow.borderlineStudents.length },
      ]
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Subject Analysis</CardTitle>
          <CardDescription>Selected subject summary.</CardDescription>
        </CardHeader>
        <CardContent>
          <SubjectSummaryTable rows={selectedRow ? [selectedRow] : []} expanded={null} onToggle={() => undefined} compact />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-4">
        <ReportChartCard title="Pass vs Fail" description="Selected subject result split.">
          <PieChart>
            <Pie data={selectedChartRows} dataKey="value" nameKey="name" innerRadius={64} outerRadius={96} paddingAngle={4}>
              {selectedChartRows.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ReportChartCard>

        <ReportChartCard title="Marks Distribution" description="Selected subject result categories.">
          <BarChart data={resultRows}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="Students" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ReportChartCard>

        <ReportChartCard title="Attendance" description="Attended and absent students.">
          <PieChart>
            <Pie data={attendanceRows} dataKey="value" nameKey="name" innerRadius={64} outerRadius={96} paddingAngle={4}>
              {attendanceRows.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ReportChartCard>

        <ReportChartCard title="Borderline Students" description="Students within borderline marks.">
          <BarChart data={[{ name: selectedRow?.subjectName ?? "Subject", value: selectedRow?.borderlineStudents.length ?? 0 }]}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="Borderline" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ReportChartCard>
      </div>

      {selectedRow ? (
        <div className="space-y-4">
          <DetailPanel title="Failed Students">
            <StudentList students={selectedRow.failedStudents} emptyText="No failed students." showSubject={false} />
          </DetailPanel>
          <DetailPanel title="Absent Students">
            <StudentList students={selectedRow.absentStudents} emptyText="No absent students." showSubject={false} />
          </DetailPanel>
          <DetailPanel title="Borderline Students">
            <StudentList students={selectedRow.borderlineStudents} emptyText="No borderline students." showSubject={false} />
          </DetailPanel>
        </div>
      ) : null}

      {selectedRow ? (
        <Card>
          <CardHeader>
            <CardTitle>Student Marks Table</CardTitle>
            <CardDescription>Uploaded marks and calculated result for the selected subject.</CardDescription>
          </CardHeader>
          <CardContent>
            <MarksTable row={selectedRow} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function countFor(items: { label: string; count: number }[], label: string) {
  return items.find((item) => item.label === label)?.count ?? 0;
}

function ReportChartCard({ title, description, children }: { title: string; description: string; children: React.ReactElement }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function SubjectSummaryTable({
  rows,
  expanded,
  onToggle,
  compact = false,
}: {
  rows: SubjectReportRow[];
  expanded: string | null;
  onToggle: (value: string | null) => void;
  compact?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="border-b text-xs uppercase text-muted-foreground">
          <tr>
            {!compact ? <th className="py-3 pr-4 font-medium">Details</th> : null}
            <th className="py-3 pr-4 font-medium">Faculty</th>
            <th className="py-3 pr-4 font-medium">Subject</th>
            <th className="py-3 pr-4 font-medium">Subject Code</th>
            <th className="py-3 pr-4 font-medium">Strength</th>
            <th className="py-3 pr-4 font-medium">Attended</th>
            <th className="py-3 pr-4 font-medium">Absent</th>
            <th className="py-3 pr-4 font-medium">Passed</th>
            <th className="py-3 pr-4 font-medium">Failed</th>
            <th className="py-3 pr-4 font-medium">Pass %</th>
            <th className="py-3 font-medium">Fail %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isOpen = expanded === row.subjectCode;
            return (
              <Fragment key={row.subjectCode}>
                <tr className="border-b last:border-0">
                  {!compact ? (
                    <td className="py-3 pr-4">
                      <Button type="button" variant="outline" size="sm" onClick={() => onToggle(isOpen ? null : row.subjectCode)}>
                        {isOpen ? "Hide" : "View"}
                      </Button>
                    </td>
                  ) : null}
                  <td className="py-3 pr-4">{row.faculty}</td>
                  <td className="py-3 pr-4">{row.subject}</td>
                  <td className="py-3 pr-4 font-medium">{row.subjectCode}</td>
                  <td className="py-3 pr-4">{row.strength}</td>
                  <td className="py-3 pr-4">{row.attended}</td>
                  <td className="py-3 pr-4">{row.absent}</td>
                  <td className="py-3 pr-4">{row.passed}</td>
                  <td className="py-3 pr-4">{row.failed}</td>
                  <td className="py-3 pr-4">{row.passPercentage}</td>
                  <td className="py-3">{row.failPercentage}</td>
                </tr>
                {!compact && isOpen ? (
                  <tr className="border-b bg-muted/40">
                    <td colSpan={11} className="p-4">
                      <div className="grid gap-4 xl:grid-cols-3">
                        <DetailPanel title="Failed Students">
                          <StudentList students={row.failedStudents} emptyText="No failed students." showSubject={false} />
                        </DetailPanel>
                        <DetailPanel title="Absent Students">
                          <StudentList students={row.absentStudents} emptyText="No absent students." showSubject={false} />
                        </DetailPanel>
                        <DetailPanel title="Marks Short">
                          <StudentList students={row.marksShortStudents} emptyText="No marks-short students." showSubject={false} showMarksShort />
                        </DetailPanel>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DetailPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      {children}
    </div>
  );
}

function StudentList({
  students,
  emptyText,
  showSubject = true,
  showMarksShort = false,
}: {
  students: StudentReportItem[];
  emptyText: string;
  showSubject?: boolean;
  showMarksShort?: boolean;
}) {
  if (!students.length) return <p className="text-sm text-muted-foreground">{emptyText}</p>;

  return (
    <div className="max-h-72 space-y-2 overflow-auto">
      {students.map((student) => (
        <div key={`${student.registerNumber}-${student.subjectCode ?? "all"}`} className="rounded-md bg-background p-3 text-sm">
          <p className="font-medium">{student.studentName}</p>
          <p className="text-xs text-muted-foreground">
            {student.registerNumber}
            {showSubject && student.subjectCode ? ` / ${student.subjectCode}` : ""}
            {student.marks !== undefined ? ` / Marks: ${formatValue(student.marks)}` : ""}
            {showMarksShort && student.marksShort !== undefined ? ` / Short: ${student.marksShort}` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function MarksTable({ row }: { row: SubjectReportRow }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="border-b text-xs uppercase text-muted-foreground">
          <tr>
            <th className="py-3 pr-4 font-medium">Register Number</th>
            <th className="py-3 pr-4 font-medium">Student Name</th>
            <th className="py-3 pr-4 font-medium">Marks</th>
            <th className="py-3 pr-4 font-medium">Result</th>
            <th className="py-3 font-medium">Borderline</th>
          </tr>
        </thead>
        <tbody>
          {row.marksTable.map((student) => (
            <tr key={student.registerNumber} className="border-b last:border-0">
              <td className="py-3 pr-4 font-medium">{student.registerNumber}</td>
              <td className="py-3 pr-4">{student.studentName}</td>
              <td className="py-3 pr-4">{formatValue(student.marks)}</td>
              <td className="py-3 pr-4">{student.result}</td>
              <td className="py-3">{student.isBorderline ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function buildSubjectRows(
  analysis: AnalysisResponse | null,
  uploadStatus: UploadStatusResponse,
  settings: AppConfigResponse,
): SubjectReportRow[] {
  if (!analysis) return [];

  return analysis.subjects.map((subject) => {
    const configuredSubject = settings.subjects.find((item) => item.code.toUpperCase() === subject.subjectCode.toUpperCase());
    const assignment = settings.facultyAssignments.find((item) => item.subjectCode.toUpperCase() === subject.subjectCode.toUpperCase());
    const upload = uploadStatus.uploads.find((item) => item.subjectCode.toUpperCase() === subject.subjectCode.toUpperCase());
    const subjectName = configuredSubject?.name || upload?.subjectName || subject.subjectCode;
    const students = analysis.students.map((student) => {
      const result = student.subjects[subject.subjectCode];
      return {
        registerNumber: student.registerNumber,
        studentName: student.studentName,
        subjectCode: subject.subjectCode,
        marks: result?.marks ?? null,
        result: result?.result ?? "not_uploaded",
        isBorderline: Boolean(result?.isBorderline),
        marksShort: marksShort(result?.marks, analysis.rule.passMark),
      };
    });

    return {
      faculty: assignment?.facultyName || upload?.facultyName || "Unassigned",
      subject: subjectLabel(subject.subjectCode, subjectName),
      subjectName,
      subjectCode: subject.subjectCode,
      strength: subject.classStrength,
      attended: subject.studentsAttended,
      absent: subject.studentsAbsent,
      passed: subject.studentsPassed,
      failed: subject.studentsFailed,
      passPercentage: subject.passPercentage,
      failPercentage: subject.failPercentage,
      averageMarks: subject.averageMarks ?? 0,
      failedStudents: students.filter((student) => student.result === "fail"),
      absentStudents: students.filter((student) => student.result === "absent"),
      borderlineStudents: students.filter((student) => student.isBorderline),
      marksShortStudents: students.filter((student) => student.result === "fail" && student.marksShort !== undefined),
      marksTable: students,
    };
  });
}

function studentsForDistribution(analysis: AnalysisResponse | null, label: string): StudentReportItem[] {
  if (!analysis) return [];
  return analysis.students
    .filter((student) => distributionLabel(student.failedSubjectCount) === label)
    .map((student) => ({
      registerNumber: student.registerNumber,
      studentName: student.studentName,
      subjectCode: student.failedSubjects.join(", ") || "All pass",
    }));
}

function distributionLabel(failureCount: number) {
  if (failureCount === 0) return "All Pass";
  if (failureCount === 1) return "One Failure";
  if (failureCount === 2) return "Two Failures";
  if (failureCount === 3) return "Three Failures";
  if (failureCount === 4) return "Four Failures";
  return "More than Four Failures";
}

function marksShort(marks: number | string | null | undefined, passMark: number | null) {
  if (passMark === null || typeof marks !== "number") return undefined;
  const short = passMark - marks;
  return short > 0 ? short : undefined;
}

function formatValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function filterUploadStatus(status: UploadStatusResponse, config: AppConfigResponse): UploadStatusResponse {
  const configuredCodes = new Set(config.subjects.map((subject) => subject.code.toUpperCase()));
  return {
    uploads: status.uploads.filter((upload) => configuredCodes.has(upload.subjectCode.toUpperCase())),
    mergedStudentCount: config.subjects.length ? status.mergedStudentCount : 0,
    warnings: status.warnings,
  };
}

type SubjectReportRow = {
  faculty: string;
  subject: string;
  subjectName: string;
  subjectCode: string;
  strength: number;
  attended: number;
  absent: number;
  passed: number;
  failed: number;
  passPercentage: number;
  failPercentage: number;
  averageMarks: number;
  failedStudents: StudentReportItem[];
  absentStudents: StudentReportItem[];
  borderlineStudents: StudentReportItem[];
  marksShortStudents: StudentReportItem[];
  marksTable: StudentReportItem[];
};

type StudentReportItem = {
  registerNumber: string;
  studentName: string;
  subjectCode?: string;
  marks?: number | string | null;
  result?: string;
  isBorderline?: boolean;
  marksShort?: number;
};
