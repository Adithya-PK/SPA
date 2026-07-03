from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal

import pandas as pd
from fastapi import HTTPException

from app.config import PROCESSED_DIR
from app.services.upload_service import context_path

ExamType = Literal["UT", "CAT", "END_SEMESTER"]
ResultStatus = Literal["pass", "fail", "absent", "withdrawn", "invalid", "not_uploaded"]


@dataclass(frozen=True)
class ExamRule:
    exam_type: ExamType
    total: int | None
    pass_mark: int | None
    borderline_min: int | None
    borderline_max: int | None


EXAM_RULES: dict[ExamType, ExamRule] = {
    "UT": ExamRule("UT", total=25, pass_mark=15, borderline_min=15, borderline_max=17),
    "CAT": ExamRule("CAT", total=50, pass_mark=33, borderline_min=33, borderline_max=35),
    "END_SEMESTER": ExamRule("END_SEMESTER", total=None, pass_mark=None, borderline_min=None, borderline_max=None),
}

FAILURE_DISTRIBUTION_LABELS = [
    "All Pass",
    "One Failure",
    "Two Failures",
    "Three Failures",
    "Four Failures",
    "More than Four Failures",
]


def get_analysis(
    *,
    academic_year: str,
    year: str,
    semester: str,
    section: str,
    exam: str,
) -> dict[str, Any]:
    merged = load_merged_data(
        academic_year=academic_year,
        year=year,
        semester=semester,
        section=section,
        exam=exam,
    )
    return analyze_merged_data(merged, exam=exam)


def load_merged_data(
    *,
    academic_year: str,
    year: str,
    semester: str,
    section: str,
    exam: str,
) -> dict[str, Any]:
    merged_path = PROCESSED_DIR / context_path(academic_year, year, semester, section, exam) / "merged.json"
    if not merged_path.exists():
        raise HTTPException(status_code=404, detail="Merged upload data not found for the selected context.")
    return json.loads(merged_path.read_text(encoding="utf-8"))


def analyze_merged_data(merged: dict[str, Any], *, exam: str) -> dict[str, Any]:
    exam_type = detect_exam_type(exam)
    rule = EXAM_RULES[exam_type]
    students = merged.get("students", [])
    subject_codes = sorted({subject_code for student in students for subject_code in student.get("subjects", {})})

    student_results = [analyze_student(student, subject_codes, rule) for student in students]
    subject_summaries = [
        analyze_subject(subject_code, students, rule)
        for subject_code in subject_codes
    ]

    return {
        "examType": rule.exam_type,
        "rule": {
            "total": rule.total,
            "passMark": rule.pass_mark,
            "borderlineMin": rule.borderline_min,
            "borderlineMax": rule.borderline_max,
        },
        "overall": summarize_evaluations(
            [result for student in student_results for result in student["subjects"].values()],
            class_strength=len(students),
        ),
        "subjects": subject_summaries,
        "students": student_results,
        "failureDistribution": failure_distribution(student_results),
        "warnings": merged.get("warnings", []),
    }


def analyze_subject(subject_code: str, students: list[dict[str, Any]], rule: ExamRule) -> dict[str, Any]:
    evaluations = [
        evaluate_subject_result(student.get("subjects", {}).get(subject_code), rule)
        for student in students
    ]
    return {
        "subjectCode": subject_code,
        **summarize_evaluations(evaluations, class_strength=len(students)),
    }


def analyze_student(student: dict[str, Any], subject_codes: list[str], rule: ExamRule) -> dict[str, Any]:
    subject_results = {
        subject_code: evaluate_subject_result(student.get("subjects", {}).get(subject_code), rule)
        for subject_code in subject_codes
    }
    failed_subjects = [
        subject_code
        for subject_code, result in subject_results.items()
        if result["result"] == "fail"
    ]
    absent_subjects = [
        subject_code
        for subject_code, result in subject_results.items()
        if result["result"] == "absent"
    ]
    return {
        "registerNumber": student.get("registerNumber", ""),
        "studentName": student.get("studentName", ""),
        "failedSubjects": failed_subjects,
        "failedSubjectCount": len(failed_subjects),
        "absentSubjects": absent_subjects,
        "absentSubjectCount": len(absent_subjects),
        "subjects": subject_results,
    }


def evaluate_subject_result(subject: dict[str, Any] | None, rule: ExamRule) -> dict[str, Any]:
    if subject is None:
        return {"marks": None, "result": "not_uploaded", "isBorderline": False}

    marks = subject.get("marks")
    status = subject.get("status")
    if status == "absent" or _normalized_text(marks) == "AB":
        return {"marks": marks, "result": "absent", "isBorderline": False}
    if status == "withdrawn" or _normalized_text(marks) == "W":
        return {"marks": marks, "result": "withdrawn", "isBorderline": False}

    if rule.exam_type == "END_SEMESTER":
        grade = _normalized_text(marks)
        if grade == "U":
            return {"marks": marks, "result": "fail", "isBorderline": False}
        return {"marks": marks, "result": "pass", "isBorderline": False}

    numeric_marks = _numeric_marks(marks)
    if numeric_marks is None:
        return {"marks": marks, "result": "invalid", "isBorderline": False}

    is_pass = numeric_marks >= (rule.pass_mark or 0)
    is_borderline = (
        is_pass
        and rule.borderline_min is not None
        and rule.borderline_max is not None
        and rule.borderline_min <= numeric_marks <= rule.borderline_max
    )
    return {
        "marks": numeric_marks,
        "result": "pass" if is_pass else "fail",
        "isBorderline": is_borderline,
    }


def summarize_evaluations(evaluations: list[dict[str, Any]], *, class_strength: int) -> dict[str, Any]:
    attended = [item for item in evaluations if item["result"] in {"pass", "fail"}]
    absent = [item for item in evaluations if item["result"] == "absent"]
    passed = [item for item in evaluations if item["result"] == "pass"]
    failed = [item for item in evaluations if item["result"] == "fail"]
    numeric_marks = [
        item["marks"]
        for item in attended
        if isinstance(item.get("marks"), (int, float)) and not pd.isna(item.get("marks"))
    ]

    return {
        "classStrength": class_strength,
        "studentsAttended": len(attended),
        "studentsAbsent": len(absent),
        "studentsPassed": len(passed),
        "studentsFailed": len(failed),
        "passPercentage": _percentage(len(passed), len(attended)),
        "failPercentage": _percentage(len(failed), len(attended)),
        "averageMarks": _round_or_none(sum(numeric_marks) / len(numeric_marks)) if numeric_marks else None,
        "highestMarks": max(numeric_marks) if numeric_marks else None,
        "lowestMarks": min(numeric_marks) if numeric_marks else None,
    }


def failure_distribution(student_results: list[dict[str, Any]]) -> list[dict[str, int | str]]:
    buckets = {label: 0 for label in FAILURE_DISTRIBUTION_LABELS}
    for student in student_results:
        failure_count = student["failedSubjectCount"]
        if failure_count == 0:
            buckets["All Pass"] += 1
        elif failure_count == 1:
            buckets["One Failure"] += 1
        elif failure_count == 2:
            buckets["Two Failures"] += 1
        elif failure_count == 3:
            buckets["Three Failures"] += 1
        elif failure_count == 4:
            buckets["Four Failures"] += 1
        else:
            buckets["More than Four Failures"] += 1

    return [{"label": label, "count": count} for label, count in buckets.items()]


def detect_exam_type(exam: str) -> ExamType:
    normalized = exam.strip().upper()
    if "CAT" in normalized:
        return "CAT"
    if "END" in normalized or "SEMESTER" in normalized:
        return "END_SEMESTER"
    return "UT"


def _numeric_marks(value: Any) -> int | float | None:
    numeric = pd.to_numeric(value, errors="coerce")
    if pd.isna(numeric):
        return None
    if float(numeric).is_integer():
        return int(numeric)
    return float(numeric)


def _normalized_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip().upper()


def _percentage(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return 0
    return round((numerator / denominator) * 100, 2)


def _round_or_none(value: float | None) -> float | None:
    if value is None:
        return None
    return round(value, 2)
