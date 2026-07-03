import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Percent, UploadCloud } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ContextFilters } from "../components/filters/ContextFilters";
import { PageLayout } from "../components/layout/PageLayout";
import { StatCard } from "../components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { useAcademicContext } from "../context/AcademicContext";
import { fetchAnalysis, fetchContextConfig, fetchUploadStatus, type AnalysisResponse, type AppConfigResponse, type UploadContext, type UploadStatusResponse } from "../lib/api";

export function Dashboard() {
  const { context, setContext } = useAcademicContext();
  const [config, setConfig] = useState<AppConfigResponse>({ ...context, subjects: [], facultyAssignments: [] });
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatusResponse>({ uploads: [], mergedStudentCount: 0, warnings: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Upload subject files to generate analysis.");

  useEffect(() => {
    let active = true;
    setLoading(true);

    async function loadDashboard() {
      try {
        const [nextConfig, nextUploadStatus] = await Promise.all([fetchContextConfig(context), fetchUploadStatus(context)]);
        if (!active) return;
        setConfig(nextConfig);
        setUploadStatus(nextUploadStatus);
        try {
          const nextAnalysis = await fetchAnalysis(context);
          if (!active) return;
          setAnalysis(nextAnalysis);
          setMessage(`Analysis ready for ${nextAnalysis.examType.replace("_", " ")} rules.`);
        } catch (error) {
          if (!active) return;
          setAnalysis(null);
          setMessage(error instanceof Error ? error.message : "Upload subject files to generate analysis.");
        }
      } catch (error) {
        if (!active) return;
        setAnalysis(null);
        setMessage(error instanceof Error ? error.message : "Unable to load dashboard data.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      active = false;
    };
  }, [context]);

  const uploadedCount = uploadStatus.uploads.length;
  const uploadBySubject = new Map(uploadStatus.uploads.map((upload) => [upload.subjectCode.toUpperCase(), upload]));
  const uploadProgress = config.subjects.length ? Math.round((uploadedCount / config.subjects.length) * 100) : 0;
  const uploadData = [
    { name: "Uploaded", value: uploadedCount, color: "hsl(var(--primary))" },
    { name: "Missing", value: Math.max(config.subjects.length - uploadedCount, 0), color: "hsl(var(--muted))" },
  ];
  const subjectChartData = analysis?.subjects.map((subject) => ({
    subject: subject.subjectCode,
    average: subject.averageMarks ?? 0,
    passRate: subject.passPercentage,
  })) ?? [];
  const allPassCount = analysis?.failureDistribution.find((item) => item.label === "All Pass")?.count ?? 0;
  const failedStudentCount = Math.max((analysis?.overall.classStrength ?? 0) - allPassCount, 0);
  const riskStudents =
    analysis?.students
      .filter((student) => student.failedSubjectCount > 0 || student.absentSubjectCount > 0)
      .slice(0, 8) ?? [];

  return (
    <PageLayout
      title="Dashboard"
      description="A section-level view of upload completion and reusable examination analysis."
    >
      <ContextFilters value={context} onChange={setContext} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Overall Pass %" value={`${analysis?.overall.passPercentage ?? 0}%`} hint="Across uploaded subject entries" icon={Percent} />
        <StatCard label="Students Passed" value={String(allPassCount)} hint="No subject failures" icon={CheckCircle2} />
        <StatCard label="Students Failed" value={String(failedStudentCount)} hint="One or more failures" icon={AlertTriangle} />
        <StatCard label="Upload Progress" value={`${uploadProgress}%`} hint={`${uploadedCount} of ${config.subjects.length} subjects`} icon={UploadCloud} />
      </div>

      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">{loading ? "Loading dashboard analysis..." : message}</CardContent>
      </Card>

      {!analysis && !loading ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No analysis data is available for this selection. Upload subject files for the selected exam to populate the dashboard.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
            <CardDescription>Average marks from uploaded and merged subject files.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="subject" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="average" name="Average marks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload Progress</CardTitle>
            <CardDescription>Configured subjects compared with uploaded files.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={uploadData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={4}>
                    {uploadData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <Progress value={uploadProgress} />
            <p className="text-sm text-muted-foreground">{uploadProgress}% of subject files uploaded.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subject Uploads</CardTitle>
          <CardDescription>Configured subjects and their current upload status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {config.subjects.map((subject) => {
              const upload = uploadBySubject.get(subject.code.toUpperCase());
              const faculty =
                config.facultyAssignments.find((assignment) => assignment.subjectCode.toUpperCase() === subject.code.toUpperCase())
                  ?.facultyName ?? "Unassigned";
              return (
                <div key={subject.code} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{subject.name}</p>
                      <p className="text-xs text-muted-foreground">{subject.code}</p>
                    </div>
                    <Badge variant={upload ? "success" : "muted"}>{upload ? "Uploaded" : "Missing"}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{faculty}</p>
                  <Link
                    to={`/reports?tab=Report%203&subject=${encodeURIComponent(subject.code)}`}
                    className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    Open Analysis
                  </Link>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <Card>
          <CardHeader>
            <CardTitle>Subject Analysis</CardTitle>
            <CardDescription>Reusable metrics generated from merged upload data.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="border-b text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-3 pr-4 font-medium">Subject</th>
                    <th className="py-3 pr-4 font-medium">Strength</th>
                    <th className="py-3 pr-4 font-medium">Attended</th>
                    <th className="py-3 pr-4 font-medium">Absent</th>
                    <th className="py-3 pr-4 font-medium">Passed</th>
                    <th className="py-3 pr-4 font-medium">Failed</th>
                    <th className="py-3 pr-4 font-medium">Pass %</th>
                    <th className="py-3 pr-4 font-medium">Fail %</th>
                    <th className="py-3 pr-4 font-medium">Avg</th>
                    <th className="py-3 pr-4 font-medium">High</th>
                    <th className="py-3 font-medium">Low</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis?.subjects.map((subject) => (
                    <tr key={subject.subjectCode} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{subject.subjectCode}</td>
                      <td className="py-3 pr-4">{subject.classStrength}</td>
                      <td className="py-3 pr-4">{subject.studentsAttended}</td>
                      <td className="py-3 pr-4">{subject.studentsAbsent}</td>
                      <td className="py-3 pr-4">{subject.studentsPassed}</td>
                      <td className="py-3 pr-4">{subject.studentsFailed}</td>
                      <td className="py-3 pr-4">{subject.passPercentage}</td>
                      <td className="py-3 pr-4">{subject.failPercentage}</td>
                      <td className="py-3 pr-4">{formatValue(subject.averageMarks)}</td>
                      <td className="py-3 pr-4">{formatValue(subject.highestMarks)}</td>
                      <td className="py-3">{formatValue(subject.lowestMarks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Failure Distribution</CardTitle>
            <CardDescription>Students grouped by number of failed subjects.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analysis?.failureDistribution ?? []} layout="vertical" margin={{ left: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="label" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" name="Students" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Students Needing Attention</CardTitle>
          <CardDescription>Students with at least one failed or absent subject.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-3 pr-4 font-medium">Register Number</th>
                  <th className="py-3 pr-4 font-medium">Student Name</th>
                  <th className="py-3 pr-4 font-medium">Failed Subjects</th>
                  <th className="py-3 pr-4 font-medium">Absent Subjects</th>
                  <th className="py-3 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody>
                {riskStudents.map((student) => (
                  <tr key={student.registerNumber} className="border-b last:border-0">
                    <td className="py-3 pr-4 font-medium">{student.registerNumber}</td>
                    <td className="py-3 pr-4">{student.studentName}</td>
                    <td className="py-3 pr-4">{student.failedSubjectCount}</td>
                    <td className="py-3 pr-4">{student.absentSubjectCount}</td>
                    <td className="py-3">{student.failedSubjectCount >= 2 ? "High" : "Monitor"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}

function formatValue(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return String(value);
}
