from fastapi import APIRouter

from app.api.routes_analysis import router as analysis_router
from app.api.routes_config import router as config_router
from app.api.routes_exports import router as exports_router
from app.api.routes import router as routes_router
from app.api.routes_uploads import router as uploads_router

router = APIRouter(prefix="/api")
router.include_router(routes_router)
router.include_router(uploads_router)
router.include_router(analysis_router)
router.include_router(exports_router)
router.include_router(config_router)
