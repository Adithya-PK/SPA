from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
def api_status():
    return {
        "name": "Student Performance Analyzer",
        "phase": "upload-module",
    }
