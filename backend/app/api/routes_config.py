from fastapi import APIRouter
from pydantic import BaseModel

from app.services.config_service import get_context_config, save_faculty_assignments, save_subjects

router = APIRouter(prefix="/config", tags=["config"])


class SubjectPayload(BaseModel):
    code: str
    name: str


class FacultyPayload(BaseModel):
    subjectCode: str
    facultyName: str


class SubjectsSavePayload(BaseModel):
    academicYear: str
    year: str
    semester: str
    subjects: list[SubjectPayload]


class FacultySavePayload(BaseModel):
    academicYear: str
    year: str
    semester: str
    section: str
    facultyAssignments: list[FacultyPayload]


@router.get("/context")
def context_config(academic_year: str, year: str, semester: str, section: str):
    return get_context_config(academic_year, year, semester, section)


@router.post("/subjects")
def update_subjects(payload: SubjectsSavePayload):
    return save_subjects(
        payload.academicYear,
        payload.year,
        payload.semester,
        [_to_dict(subject) for subject in payload.subjects],
    )


@router.post("/faculty")
def update_faculty(payload: FacultySavePayload):
    return save_faculty_assignments(
        payload.academicYear,
        payload.year,
        payload.semester,
        payload.section,
        [_to_dict(assignment) for assignment in payload.facultyAssignments],
    )


def _to_dict(model: BaseModel):
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()
