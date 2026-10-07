# FederAI Cloud — Master Automation Makefile
.PHONY: help install test lint seed run-backend run-frontend docker-up docker-down docker-build clean

help:
	@echo "FederAI Cloud — Development & Orchestration CLI"
	@echo "================================================"
	@echo "make install        : Install Python virtual environment and dependencies"
	@echo "make test           : Run full test suite with pytest"
	@echo "make lint           : Run code linting with flake8"
	@echo "make seed           : Seed local database with default organizations, clients, and models"
	@echo "make run-backend    : Start FastAPI backend server locally"
	@echo "make run-frontend   : Serve frontend static UI locally"
	@echo "make docker-build   : Build all Docker images"
	@echo "make docker-up      : Start complete local cloud stack (SeaweedFS, Postgres, RabbitMQ, Backend, Frontend, Prometheus, Grafana)"
	@echo "make docker-down    : Stop and tear down local containers"
	@echo "make clean          : Clean temporary caches and test artifacts"

install:
	python3 -m venv .venv
	. .venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt

test:
	. .venv/bin/activate && pytest -v tests/

test-cov:
	. .venv/bin/activate && pytest -v --cov=federated_learning --cov=services --cov-report=term-missing tests/

seed:
	. .venv/bin/activate && python -m database.seeds.seed_data

run-backend:
	. .venv/bin/activate && uvicorn services.api_gateway.main:app --host 0.0.0.0 --port 8000 --reload

run-frontend:
	cd frontend && python3 -m http.server 3000

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache .coverage htmlcov
