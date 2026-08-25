FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
ARG VITE_API_URL=/api
ARG VITE_CUSTOMER_SUPPORT_URL=./admin-login.html
ARG VITE_ALLOWED_HOSTS=msishop.up.railway.app,msi-shop-development.up.railway.app,shop-telegram-bot-development.up.railway.app
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CUSTOMER_SUPPORT_URL=$VITE_CUSTOMER_SUPPORT_URL
ENV VITE_ALLOWED_HOSTS=$VITE_ALLOWED_HOSTS
RUN npm run build


FROM python:3.13-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN python -m pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist/

EXPOSE 8080
CMD ["sh", "-c", "uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port ${PORT:-8080}"]
