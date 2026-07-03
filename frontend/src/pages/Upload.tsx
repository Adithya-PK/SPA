import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, UploadCloud, XCircle } from "lucide-react";
import { ContextFilters } from "../components/filters/ContextFilters";
import { PageLayout } from "../components/layout/PageLayout";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { fetchUploadStatus, uploadSubjectFile, type UploadContext, type UploadStatusResponse } from "../lib/api";
import { loadSettings } from "../lib/settings";

export function Upload() {
  const settings = useMemo(() => loadSettings(), []);
  const [context, setContext] = useState<UploadContext>({
    academicYear: settings.academicYear,
    year: settings.year,
    semester: settings.semester,
    section: settings.section,
    exam: "UT 1",
  });
  const [status, setStatus] = useState<UploadStatusResponse>({ uploads: [], mergedStudentCount: 0, warnings: [] });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [uploadingSubject, setUploadingSubject] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let active = true;
    setLoadingStatus(true);
    fetchUploadStatus(context)
      .then((nextStatus) => {
        if (active) setStatus(nextStatus);
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      })
      .finally(() => {
        if (active) setLoadingStatus(false);
      });

    return () => {
      active = false;
    };
  }, [context]);

  const uploadsBySubject = useMemo(
    () => new Map(status.uploads.map((upload) => [upload.subjectCode.toUpperCase(), upload])),
    [status.uploads],
  );
  const subjects = settings.subjects.map((subject) => ({
    ...subject,
    faculty:
      settings.facultyAssignments.find((assignment) => assignment.subjectCode.toUpperCase() === subject.code.toUpperCase())
        ?.facultyName ?? "Unassigned",
    upload: uploadsBySubject.get(subject.code.toUpperCase()),
  }));
  const uploadedCount = subjects.filter((subject) => subject.upload).length;
  const progress = subjects.length ? Math.round((uploadedCount / subjects.length) * 100) : 0;

  async function handleFileSelected(subjectCode: string, fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    const subject = subjects.find((item) => item.code === subjectCode);
    if (!subject) return;

    setUploadingSubject(subjectCode);
    setMessage(null);
    try {
      await uploadSubjectFile({
        context,
        subjectCode: subject.code,
        subjectName: subject.name,
        facultyName: subject.faculty,
        file,
      });
      const nextStatus = await fetchUploadStatus(context);
      setStatus(nextStatus);
      setMessage(`${subject.code} uploaded and merged successfully.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadingSubject(null);
      const input = fileInputs.current[subjectCode];
      if (input) input.value = "";
    }
  }

  return (
    <PageLayout title="Upload" description="Upload subject-wise Excel files using the fixed faculty template.">
      <ContextFilters value={context} onChange={setContext} />

      <Card>
        <CardHeader>
          <CardTitle>Subject Upload Progress</CardTitle>
          <CardDescription>
            {uploadedCount} of {subjects.length} subjects uploaded. {status.mergedStudentCount} students merged.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={progress} />
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium">{loadingStatus ? "Checking uploads..." : `${progress}% complete`}</p>
            <p className="text-muted-foreground">Merge key: REGISTER NUMBER and NAME OF THE STUDENTS</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Accepted template: one sheet named Upload with REGISTER NUMBER, NAME OF THE STUDENTS, and MARKS columns.
          </p>
          {message ? (
            <div className="flex items-start gap-2 rounded-md border bg-muted p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 text-primary" />
              <p>{message}</p>
            </div>
          ) : null}
          {status.warnings.length ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {status.warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {subjects.map((subject) => (
          <Card key={subject.code}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{subject.code}</CardTitle>
                  <CardDescription>{subject.name}</CardDescription>
                </div>
                <Badge variant={subject.upload ? "success" : "muted"}>
                  {subject.upload ? "Uploaded" : "Missing"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">Faculty</p>
                <p className="font-medium">{subject.faculty}</p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                {subject.upload ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span>{subject.upload ? `${subject.upload.studentCount} rows received` : "Awaiting upload"}</span>
              </div>
              <input
                ref={(element) => {
                  fileInputs.current[subject.code] = element;
                }}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(event) => handleFileSelected(subject.code, event.target.files)}
              />
              <Button
                type="button"
                variant={subject.upload ? "outline" : "default"}
                className="w-full"
                disabled={uploadingSubject === subject.code}
                onClick={() => fileInputs.current[subject.code]?.click()}
              >
                {uploadingSubject === subject.code ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                {subject.upload ? "Replace File" : "Upload File"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageLayout>
  );
}
