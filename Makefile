.PHONY: help install dev stop clean migrate db-reset

help:
	@echo "Mosaic - Development Commands"
	@echo ""
	@echo "  make install     - Install dependencies"
	@echo "  make dev         - Start development servers"
	@echo "  make stop        - Stop all services"
	@echo "  make clean       - Clean up containers and volumes"
	@echo "  make migrate     - Run database migrations"
	@echo "  make db-reset    - Reset database"
	@echo ""

install:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Done!"

dev:
	@echo "Starting development environment..."
	docker-compose up -d postgres
	@echo "Waiting for postgres to be ready..."
	@sleep 5
	@echo "Running migrations..."
	cd backend && alembic upgrade head
	@echo "Starting backend and frontend..."
	docker-compose up backend frontend

stop:
	@echo "Stopping all services..."
	docker-compose down

clean:
	@echo "Cleaning up..."
	docker-compose down -v
	@echo "Done!"

migrate:
	@echo "Running migrations..."
	cd backend && alembic upgrade head

db-reset:
	@echo "Resetting database..."
	docker-compose down postgres
	docker volume rm mosaic_postgres_data || true
	docker-compose up -d postgres
	@sleep 5
	cd backend && alembic upgrade head
	@echo "Database reset complete!"

# Backend-specific commands
backend-shell:
	docker-compose exec backend bash

backend-logs:
	docker-compose logs -f backend

# Frontend-specific commands
frontend-shell:
	docker-compose exec frontend sh

frontend-logs:
	docker-compose logs -f frontend

# Database commands
db-shell:
	docker-compose exec postgres psql -U mosaic -d mosaic
