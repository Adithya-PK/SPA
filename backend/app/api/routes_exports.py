from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.services.export_service import build_excel_export, build_pdf_export

router = APIRouter(prefix="/exports", tags=["exports"])


@router.get("/pdf")
def export_pdf(academic_year: str, year: str, semester: str, section: str, exam: str):
    buffer = build_pdf_export(academic_year=academic_year, year=year, semester=semester, section=section, exam=exam)
    filename = _export_filename(academic_year, year, section, exam, "OverallSectionAnalysis", "pdf")
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/excel")
def export_excel(academic_year: str, year: str, semester: str, section: str, exam: str):
    buffer = build_excel_export(academic_year=academic_year, year=year, semester=semester, section=section, exam=exam)
    filename = _export_filename(academic_year, year, section, exam, "OverallSectionAnalysis", "xlsx")
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _export_filename(academic_year: str, year: str, section: str, exam: str, report_name: str, extension: str) -> str:
    parts = [academic_year, year, section, exam.replace(" ", ""), report_name]
    safe = "_".join(part.strip().replace("/", "-").replace("\\", "-") for part in parts if part.strip())
    return f"{safe}.{extension}"
