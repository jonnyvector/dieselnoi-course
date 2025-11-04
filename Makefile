.PHONY: help install dev test clean migrate docker-up docker-down

help:
	@echo "Available commands:"
	@echo "  make install       - Install all dependencies"
	@echo "  make dev           - Start development servers"
	@echo "  make test          - Run all tests"
	@echo "  make migrate       - Run database migrations"
	@echo "  make clean         - Clean temporary files"
	@echo "  make docker-up     - Start Docker containers"
	@echo "  make docker-down   - Stop Docker containers"

install:
	@echo "Installing backend dependencies..."
	cd backend && pip install -r requirements.txt
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

dev:
	@echo "Starting development servers..."
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:3000"
	@trap 'kill 0' SIGINT; \
	(cd backend && source venv/bin/activate && python manage.py runserver) & \
	(cd frontend && npm run dev)

test:
	@echo "Running backend tests..."
	cd backend && pytest
	@echo "Running frontend tests..."
	cd frontend && npm test

migrate:
	@echo "Running database migrations..."
	cd backend && source venv/bin/activate && python manage.py makemigrations && python manage.py migrate

clean:
	@echo "Cleaning temporary files..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name ".DS_Store" -delete

docker-up:
	@echo "Starting Docker containers..."
	docker-compose up -d
	@echo "Containers started!"
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:3000"

docker-down:
	@echo "Stopping Docker containers..."
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-rebuild:
	@echo "Rebuilding Docker containers..."
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d
