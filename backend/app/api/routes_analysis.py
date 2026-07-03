from fastapi import APIRouter

from app.services.analysis_service import analyze_merged_data, detect_exam_type, load_merged_data
from app.services.config_service import get_context_config

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/summary")
def analysis_summary(
    academic_year: str,
    year: str,
    semester: str,
    section: str,
    exam: str,
):
    config = get_context_config(academic_year, year, semester, section)
    if not config["subjects"] or not config["facultyAssignments"]:
        return _empty_analysis(exam)

    merged = load_merged_data(
        academic_year=academic_year,
        year=year,
        semester=semester,
        section=section,
        exam=exam,
    )
    configured_codes = {subject["code"].strip().upper() for subject in config["subjects"]}
    return analyze_merged_data(_filter_merged_subjects(merged, configured_codes), exam=exam)


def _filter_merged_subjects(merged: dict, configured_codes: set[str]) -> dict:
    students = []
    for student in merged.get("students", []):
        subjects = {
            code: result
            for code, result in student.get("subjects", {}).items()
            if code.strip().upper() in configured_codes
        }
        if subjects:
            students.append({**student, "subjects": subjects})
    return {"students": students, "warnings": merged.get("warnings", [])}


def _empty_analysis(exam: str):
    exam_type = detect_exam_type(exam)
    rule_by_type = {
        "UT": {"total": 25, "passMark": 15, "borderlineMin": 15, "borderlineMax": 17},
        "CAT": {"total": 50, "passMark": 33, "borderlineMin": 33, "borderlineMax": 35},
        "END_SEMESTER": {"total": None, "passMark": None, "borderlineMin": None, "borderlineMax": None},
    }
    zero_metrics = {
        "classStrength": 0,
        "studentsAttended": 0,
        "studentsAbsent": 0,
        "studentsPassed": 0,
        "studentsFailed": 0,
        "passPercentage": 0,
        "failPercentage": 0,
        "averageMarks": None,
        "highestMarks": None,
        "lowestMarks": None,
    }
    return {
        "examType": exam_type,
        "rule": rule_by_type[exam_type],
        "overall": zero_metrics,
        "subjects": [],
        "students": [],
        "failureDistribution": [
            {"label": "All Pass", "count": 0},
            {"label": "One Failure", "count": 0},
            {"label": "Two Failures", "count": 0},
            {"label": "Three Failures", "count": 0},
            {"label": "Four Failures", "count": 0},
            {"label": "More than Four Failures", "count": 0},
        ],
        "warnings": ["No configured subjects or faculty assignments for the selected context."],
    }
