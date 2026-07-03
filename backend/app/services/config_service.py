import json
import re
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from app.config import DATA_DIR

DEFAULT_SUBJECTS = [
    {"code": "231ADC601T", "name": "Data Analytics"},
    {"code": "231ADC602T", "name": "Data Exploration and Visualization"},
    {"code": "231CSE918T", "name": "AI for Edge Computing (PE - IV)"},
    {"code": "231CSE914T", "name": "Large Language Models (PE V)"},
    {"code": "231CSE913T", "name": "Recommender Systems (PE VI)"},
    {"code": "231IBM0901T", "name": "Health Informatics (OE)"},
]

DEFAULT_FACULTY = [
    {"subjectCode": "231ADC601T", "facultyName": "Dr.K.P.Revathi"},
    {"subjectCode": "231ADC602T", "facultyName": "Dr. J.Vijayaraj"},
    {"subjectCode": "231CSE918T", "facultyName": "Dr. T. Kalaiselvi"},
    {"subjectCode": "231CSE914T", "facultyName": "Dr. R. Meena"},
    {"subjectCode": "231CSE913T", "facultyName": "Dr. V. Vidhya"},
    {"subjectCode": "231IBM0901T", "facultyName": "Mrs. J. Febina"},
]


def get_context_config(academic_year: str, year: str, semester: str, section: str) -> dict[str, Any]:
    context_dir = _context_dir(academic_year, year, semester)
    subjects_path = context_dir / "subjects.json"
    section_path = context_dir / f"section_{section.upper()}.json"

    subjects = [_normalize_subject(subject) for subject in _read_json(subjects_path).get("subjects", [])] if subjects_path.exists() else []
    configured_codes = {subject.get("code", "").strip().upper() for subject in subjects}
    faculty_assignments = (
        [_normalize_faculty(assignment) for assignment in _read_json(section_path).get("facultyAssignments", [])]
        if section_path.exists()
        else []
    )
    faculty_assignments = [
        assignment
        for assignment in faculty_assignments
        if assignment.get("subjectCode", "").strip().upper() in configured_codes
    ]
    if subjects_path.exists():
        _write_json(subjects_path, {"subjects": subjects})
    if section_path.exists():
        _write_json(section_path, {"facultyAssignments": faculty_assignments})
    return {
        "academicYear": academic_year,
        "year": year,
        "semester": semester,
        "section": section,
        "subjects": subjects,
        "facultyAssignments": faculty_assignments,
    }


def save_subjects(academic_year: str, year: str, semester: str, subjects: list[dict[str, str]]) -> dict[str, Any]:
    _validate_subjects(subjects)
    path = _context_dir(academic_year, year, semester) / "subjects.json"
    _write_json(path, {"subjects": subjects})
    return {"saved": True, "subjects": subjects}


def save_faculty_assignments(
    academic_year: str,
    year: str,
    semester: str,
    section: str,
    faculty_assignments: list[dict[str, str]],
) -> dict[str, Any]:
    subjects = get_context_config(academic_year, year, semester, section)["subjects"]
    subject_codes = {subject["code"].strip().upper() for subject in subjects}
    errors = []
    for index, assignment in enumerate(faculty_assignments):
        subject_code = assignment.get("subjectCode", "").strip().upper()
        faculty_name = assignment.get("facultyName", "").strip()
        if not subject_code:
            errors.append(f"Faculty row {index + 1}: Subject Code is required.")
        elif subject_code not in subject_codes:
            errors.append(f"Faculty row {index + 1}: Subject Code must match a saved subject.")
        if not faculty_name:
            errors.append(f"Faculty row {index + 1}: Faculty Name is required.")
    if errors:
        raise HTTPException(status_code=400, detail=errors)

    path = _context_dir(academic_year, year, semester) / f"section_{section.upper()}.json"
    _write_json(path, {"facultyAssignments": faculty_assignments})
    return {"saved": True, "facultyAssignments": faculty_assignments}


def _validate_subjects(subjects: list[dict[str, str]]) -> None:
    errors = []
    codes = []
    for index, subject in enumerate(subjects):
        code = subject.get("code", "").strip()
        name = subject.get("name", "").strip()
        if not code:
            errors.append(f"Subject row {index + 1}: Subject Code is required.")
        if not name:
            errors.append(f"Subject row {index + 1}: Subject Name is required.")
        if code:
            codes.append(code.upper())
    duplicates = sorted({code for code in codes if codes.count(code) > 1})
    if duplicates:
        errors.append(f"Duplicate Subject Code found: {', '.join(duplicates)}.")
    if errors:
        raise HTTPException(status_code=400, detail=errors)


def _normalize_subject(subject: dict[str, str]) -> dict[str, str]:
    if subject.get("code", "").strip().upper() == "231BMO901T":
        return {**subject, "code": "231IBM0901T"}
    return subject


def _normalize_faculty(assignment: dict[str, str]) -> dict[str, str]:
    if assignment.get("subjectCode", "").strip().upper() == "231BMO901T":
        return {**assignment, "subjectCode": "231IBM0901T"}
    return assignment


def _context_dir(academic_year: str, year: str, semester: str) -> Path:
    return DATA_DIR / "academic_years" / _slug(academic_year) / _slug(year) / _slug(semester)


def _slug(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9-]+", "", value.strip().replace(" ", ""))
    return cleaned or "default"


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
