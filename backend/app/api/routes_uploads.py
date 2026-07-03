import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config import PROCESSED_DIR
from app.services.config_service import get_context_config
from app.services.upload_service import clear_context, context_path, get_upload_status, save_subject_upload

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.get("/status")
def upload_status(
    academic_year: str,
    year: str,
    semester: str,
    section: str,
    exam: str,
):
    config = get_context_config(academic_year, year, semester, section)
    if not config["subjects"]:
        return {"uploads": [], "mergedStudentCount": 0, "warnings": []}

    status = get_upload_status(
        academic_year=academic_year,
        year=year,
        semester=semester,
        section=section,
        exam=exam,
    )
    configured_codes = {subject["code"].strip().upper() for subject in config["subjects"]}
    uploads = [upload for upload in status["uploads"] if upload["subjectCode"].strip().upper() in configured_codes]
    return {
        "uploads": uploads,
        "mergedStudentCount": _merged_count_for_configured_uploads(
            academic_year=academic_year,
            year=year,
            semester=semester,
            section=section,
            exam=exam,
            configured_codes=configured_codes,
        ),
        "warnings": status["warnings"],
    }


@router.post("/subject")
async def upload_subject(
    academic_year: str = Form(...),
    year: str = Form(...),
    semester: str = Form(...),
    section: str = Form(...),
    exam: str = Form(...),
    subject_code: str = Form(...),
    subject_name: str = Form(""),
    faculty_name: str = Form(""),
    file: UploadFile = File(...),
):
    config = get_context_config(academic_year, year, semester, section)
    configured_codes = {subject["code"].strip().upper() for subject in config["subjects"]}
    if subject_code.strip().upper() not in configured_codes:
        raise HTTPException(status_code=400, detail="Subject is not configured for the selected semester.")

    return await save_subject_upload(
        file=file,
        subject_code=subject_code,
        subject_name=subject_name,
        faculty_name=faculty_name,
        academic_year=academic_year,
        year=year,
        semester=semester,
        section=section,
        exam=exam,
    )


@router.delete("/context")
def delete_context_uploads(
    academic_year: str,
    year: str,
    semester: str,
    section: str,
    exam: str,
):
    clear_context(
        academic_year=academic_year,
        year=year,
        semester=semester,
        section=section,
        exam=exam,
    )
    return {"deleted": True}


def _merged_count_for_configured_uploads(
    *,
    academic_year: str,
    year: str,
    semester: str,
    section: str,
    exam: str,
    configured_codes: set[str],
) -> int:
    processed_dir = PROCESSED_DIR / context_path(academic_year, year, semester, section, exam)
    students: set[str] = set()
    if not processed_dir.exists():
        return 0
    for path in processed_dir.glob("*.json"):
        if path.name == "merged.json" or path.stem.upper() not in configured_codes:
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        for student in payload.get("students", []):
            register_number = student.get("registerNumber")
            if register_number:
                students.add(register_number)
    return len(students)
