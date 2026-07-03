from fastapi import APIRouter, File, Form, UploadFile

from app.services.upload_service import clear_context, get_upload_status, save_subject_upload

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.get("/status")
def upload_status(
    academic_year: str,
    year: str,
    semester: str,
    section: str,
    exam: str,
):
    return get_upload_status(
        academic_year=academic_year,
        year=year,
        semester=semester,
        section=section,
        exam=exam,
    )


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
