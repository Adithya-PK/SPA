import json
import re
import shutil
from io import BytesIO
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import HTTPException, UploadFile

from app.config import PROCESSED_DIR, UPLOADS_DIR

REQUIRED_SHEET = "Upload"
REQUIRED_COLUMNS = ["REGISTER NUMBER", "NAME OF THE STUDENTS", "MARKS"]


def context_path(academic_year: str, year: str, semester: str, section: str, exam: str) -> Path:
    parts = [academic_year, year, semester, section, exam]
    return Path(*[_slug(part) for part in parts])


async def save_subject_upload(
    *,
    file: UploadFile,
    subject_code: str,
    subject_name: str,
    faculty_name: str,
    academic_year: str,
    year: str,
    semester: str,
    section: str,
    exam: str,
) -> dict[str, Any]:
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported.")

    content = await file.read()
    parsed_students = parse_subject_excel(content)
    relative_context = context_path(academic_year, year, semester, section, exam)
    upload_dir = UPLOADS_DIR / relative_context
    processed_dir = PROCESSED_DIR / relative_context
    upload_dir.mkdir(parents=True, exist_ok=True)
    processed_dir.mkdir(parents=True, exist_ok=True)

    normalized_subject = _slug(subject_code).upper()
    upload_path = upload_dir / f"{normalized_subject}.xlsx"
    processed_path = processed_dir / f"{normalized_subject}.json"

    upload_path.write_bytes(content)
    subject_payload = {
        "subjectCode": subject_code,
        "subjectName": subject_name,
        "facultyName": faculty_name,
        "sourceFile": file.filename,
        "studentCount": len(parsed_students),
        "students": parsed_students,
    }
    _write_json(processed_path, subject_payload)
    merged = merge_context(processed_dir)

    return {
        "subjectCode": subject_code,
        "uploaded": True,
        "studentCount": len(parsed_students),
        "mergedStudentCount": len(merged["students"]),
        "warnings": merged["warnings"],
    }


def get_upload_status(
    *,
    academic_year: str,
    year: str,
    semester: str,
    section: str,
    exam: str,
) -> dict[str, Any]:
    processed_dir = PROCESSED_DIR / context_path(academic_year, year, semester, section, exam)
    uploads = []
    if processed_dir.exists():
        for path in sorted(processed_dir.glob("*.json")):
            if path.name == "merged.json":
                continue
            payload = _read_json(path)
            uploads.append(
                {
                    "subjectCode": payload.get("subjectCode", path.stem),
                    "subjectName": payload.get("subjectName", ""),
                    "facultyName": payload.get("facultyName", ""),
                    "studentCount": payload.get("studentCount", 0),
                    "sourceFile": payload.get("sourceFile", ""),
                }
            )

    merged_path = processed_dir / "merged.json"
    merged = _read_json(merged_path) if merged_path.exists() else {"students": [], "warnings": []}
    return {
        "uploads": uploads,
        "mergedStudentCount": len(merged.get("students", [])),
        "warnings": merged.get("warnings", []),
    }


def parse_subject_excel(content: bytes) -> list[dict[str, Any]]:
    try:
        excel_file = pd.ExcelFile(BytesIO(content), engine="openpyxl")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Unable to read Excel file.") from exc

    if REQUIRED_SHEET not in excel_file.sheet_names:
        raise HTTPException(status_code=400, detail="Excel file must contain a sheet named Upload.")

    try:
        frame = pd.read_excel(excel_file, sheet_name=REQUIRED_SHEET, dtype={"REGISTER NUMBER": str})
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Unable to read Upload sheet.") from exc

    frame.columns = [str(column).strip() for column in frame.columns]
    missing_columns = [column for column in REQUIRED_COLUMNS if column not in frame.columns]
    if missing_columns:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns: {', '.join(missing_columns)}.",
        )

    frame = frame[REQUIRED_COLUMNS].dropna(how="all")
    students = []
    seen_register_numbers: set[str] = set()

    for row_index, row in frame.iterrows():
        register_number = _clean_register_number(row["REGISTER NUMBER"])
        student_name = _clean_text(row["NAME OF THE STUDENTS"])
        raw_marks = row["MARKS"]

        if not register_number or not student_name:
            raise HTTPException(status_code=400, detail=f"Missing register number or student name at row {row_index + 2}.")

        if register_number in seen_register_numbers:
            raise HTTPException(status_code=400, detail=f"Duplicate register number found: {register_number}.")
        seen_register_numbers.add(register_number)

        students.append(
            {
                "registerNumber": register_number,
                "studentName": student_name,
                "marks": _parse_marks_or_grade(raw_marks),
                "status": _parse_status(raw_marks),
            }
        )

    if not students:
        raise HTTPException(status_code=400, detail="Upload sheet does not contain student rows.")

    return students


def merge_context(processed_dir: Path) -> dict[str, Any]:
    students: dict[str, dict[str, Any]] = {}
    warnings: list[str] = []

    for path in sorted(processed_dir.glob("*.json")):
        if path.name == "merged.json":
            continue
        subject_payload = _read_json(path)
        subject_code = subject_payload["subjectCode"]

        for student in subject_payload.get("students", []):
            register_number = student["registerNumber"]
            student_name = student["studentName"]

            if register_number not in students:
                students[register_number] = {
                    "registerNumber": register_number,
                    "studentName": student_name,
                    "subjects": {},
                }
            elif students[register_number]["studentName"].strip().lower() != student_name.strip().lower():
                warnings.append(
                    f"Name mismatch for {register_number}: {students[register_number]['studentName']} / {student_name}"
                )

            students[register_number]["subjects"][subject_code] = {
                "marks": student["marks"],
                "status": student["status"],
            }

    merged = {"students": list(students.values()), "warnings": warnings}
    _write_json(processed_dir / "merged.json", merged)
    return merged


def clear_context(
    *,
    academic_year: str,
    year: str,
    semester: str,
    section: str,
    exam: str,
) -> None:
    relative_context = context_path(academic_year, year, semester, section, exam)
    for root in [UPLOADS_DIR / relative_context, PROCESSED_DIR / relative_context]:
        if root.exists():
            shutil.rmtree(root)


def _parse_marks_or_grade(value: Any) -> int | float | str | None:
    if _is_absent(value):
        return "AB"
    if pd.isna(value):
        return None
    if isinstance(value, str):
        value = value.strip()
    numeric_value = pd.to_numeric(value, errors="coerce")
    if pd.isna(numeric_value):
        return str(value).strip().upper()
    if float(numeric_value).is_integer():
        return int(numeric_value)
    return float(numeric_value)


def _is_absent(value: Any) -> bool:
    return isinstance(value, str) and value.strip().upper() == "AB"


def _parse_status(value: Any) -> str:
    if _is_absent(value):
        return "absent"
    if isinstance(value, str) and value.strip().upper() == "W":
        return "withdrawn"
    return "present"


def _clean_register_number(value: Any) -> str:
    if pd.isna(value):
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def _clean_text(value: Any) -> str:
    if pd.isna(value):
        return ""
    return str(value).strip()


def _slug(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", "-", value.strip()).strip("-")
    return cleaned.lower() or "default"


def _read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
