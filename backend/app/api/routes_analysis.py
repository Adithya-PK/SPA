from fastapi import APIRouter

from app.services.analysis_service import get_analysis

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/summary")
def analysis_summary(
    academic_year: str,
    year: str,
    semester: str,
    section: str,
    exam: str,
):
    return get_analysis(
        academic_year=academic_year,
        year=year,
        semester=semester,
        section=section,
        exam=exam,
    )
