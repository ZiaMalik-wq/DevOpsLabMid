import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import logging
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.session import check_db_connection
from app.core.vector_db import vector_db 
from app.api.routes import auth, jobs, chat, students, companies, applications, analytics, admin, notifications

# 1. Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 2. Define Lifespan (Startup & Shutdown)
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("App starting...")
    yield
    logger.info("App shutdown")

# 3. Initialize App
app = FastAPI(
    title=settings.PROJECT_NAME, 
    version="1.0",
    lifespan=lifespan
)

logger = logging.getLogger(__name__)


@app.exception_handler(RequestValidationError)
async def request_validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(
        "RequestValidationError on %s %s: %s",
        request.method,
        request.url.path,
        exc.errors(),
    )
    return JSONResponse(status_code=422, content={"detail": exc.errors()})

# 4. Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"UNHANDLED ERROR: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error. Please contact support."},
    )

origins = [
    "http://localhost:5173",  # dev
    "https://campuscareerai.me",
    "https://www.campuscareerai.me",
    "https://api.campuscareerai.me",
]

# 5. Middleware (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 6. Register Routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
app.include_router(students.router, prefix="/students", tags=["Students"])
app.include_router(chat.router, prefix="/chat", tags=["AI Chat"])
app.include_router(companies.router, prefix="/companies", tags=["Companies"])
app.include_router(applications.router, prefix="/applications", tags=["Applications"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(admin.router, prefix="/admin", tags=["Admin Panel"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

# 7. Root Endpoints
# Allow HEAD for Render Health Checks
@app.api_route("/", methods=["GET", "HEAD"], tags=["Status"])
def read_root():
    return {
        "project": settings.PROJECT_NAME, 
        "version": "1.0", 
        "status": "active"
    }

@app.get("/health", tags=["Status"])
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import os
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)