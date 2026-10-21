import hashlib
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import RequestResponseEndpoint

from . import media
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


@app.middleware("http")
async def revalidate_api_reads(request: Request, call_next: RequestResponseEndpoint):
    """Answer unchanged API reads with 304 so the storefront's polling stays cheap."""
    response = await call_next(request)
    path = request.url.path
    if (
        request.method != "GET" or response.status_code != 200 or not path.startswith("/api/")
        or path.startswith("/api/media/") or not response.headers.get("content-type", "").startswith("application/json")
    ):
        return response
    body = b"".join([chunk async for chunk in response.body_iterator])
    etag = f'W/"{hashlib.sha256(body).hexdigest()[:32]}"'
    cache_control = "private, no-cache" if request.headers.get("authorization") else "no-cache"
    if etag in {value.strip() for value in request.headers.get("if-none-match", "").split(",")}:
        return Response(status_code=304, headers={"ETag": etag, "Cache-Control": cache_control})
    headers = {key: value for key, value in response.headers.items() if key != "content-length"}
    headers.update({"ETag": etag, "Cache-Control": cache_control})
    return Response(body, status_code=200, headers=headers)


app.add_middleware(GZipMiddleware, minimum_size=1024, compresslevel=6)

app.include_router(media.router)
app.include_router(catalog.router)
app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(admin.router)


@app.get("/health", tags=["health"])
@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


class FrontendFiles(StaticFiles):
    """Cache content-hashed build assets forever; always revalidate HTML entry pages."""

    def file_response(self, full_path, stat_result, scope, status_code=200):
        response = super().file_response(full_path, stat_result, scope, status_code)
        file_path = Path(full_path)
        if file_path.parent.name == "assets":
            response.headers["Cache-Control"] = media.IMMUTABLE
        elif file_path.suffix == ".html":
            response.headers["Cache-Control"] = "no-cache"
        else:
            response.headers["Cache-Control"] = "public, max-age=86400"
        return response


frontend_dist = Path(REPOSITORY_DIR) / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", FrontendFiles(directory=frontend_dist, html=True), name="frontend")
