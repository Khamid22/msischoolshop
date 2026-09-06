from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import RequestResponseEndpoint

from .config import CORS_ORIGINS, REPOSITORY_DIR
from .database import initialize_database
from .routers import admin, auth, catalog, orders


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(
    title="MSI Shop API",
    version="1.0.0",
    description="FastAPI backend for the MSI Telegram shop.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def prevent_stale_admin_pages(request: Request, call_next: RequestResponseEndpoint):
    response = await call_next(request)
    if request.url.path in {"/admin.html", "/admin-sso.html", "/admin-login.html"}:
        # These stable URLs select content-hashed assets after each deployment.
        # Caching the HTML can strand an LMS iframe on the previous admin UI.
        response.headers["Cache-Control"] = "no-store, max-age=0"
    return response


app.include_router(catalog.router)
app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(admin.router)


@app.get("/health", tags=["health"])
@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


frontend_dist = Path(REPOSITORY_DIR) / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
