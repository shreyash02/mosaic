# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# Stage 2: Backend with frontend static files
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ .

# Copy built frontend files
COPY --from=frontend-builder /app/frontend/dist ./static

# Copy startup script and make it executable
COPY backend/start.sh ./start.sh
RUN chmod +x ./start.sh

# Expose port
EXPOSE 8000

# Run the application with migrations
CMD ["./start.sh"]

