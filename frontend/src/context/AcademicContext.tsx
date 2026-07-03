import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { validSemesterForYear } from "../lib/academic";
import type { UploadContext } from "../lib/api";
import { defaultSettings } from "../lib/settings";

const storageKey = "spa.academicContext.v1";

type AcademicContextValue = {
  context: UploadContext;
  setContext: (context: UploadContext) => void;
};

const AcademicContext = createContext<AcademicContextValue | null>(null);

const defaultContext: UploadContext = {
  academicYear: defaultSettings.academicYear,
  year: defaultSettings.year,
  semester: defaultSettings.semester,
  section: defaultSettings.section,
  exam: "UT 1",
};

export function AcademicContextProvider({ children }: { children: ReactNode }) {
  const [context, setStoredContext] = useState<UploadContext>(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return defaultContext;
    try {
      const parsed = { ...defaultContext, ...JSON.parse(stored) };
      return { ...parsed, semester: validSemesterForYear(parsed.year, parsed.semester) };
    } catch {
      return defaultContext;
    }
  });

  function setContext(nextContext: UploadContext) {
    setStoredContext({ ...nextContext, semester: validSemesterForYear(nextContext.year, nextContext.semester) });
  }

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(context));
  }, [context]);

  const value = useMemo(() => ({ context, setContext }), [context]);

  return <AcademicContext.Provider value={value}>{children}</AcademicContext.Provider>;
}

export function useAcademicContext() {
  const value = useContext(AcademicContext);
  if (!value) throw new Error("useAcademicContext must be used inside AcademicContextProvider");
  return value;
}
