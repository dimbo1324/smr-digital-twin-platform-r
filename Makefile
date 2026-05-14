.PHONY: help dev dev-up dev-down down status test lint api-dev api-run api-build api-test api-vet simulation-run simulation-build simulation-test simulation-vet web-api-types web-build web-lint web-typecheck

WEB_RUN = docker compose run --rm --no-deps web sh -c

help:
	@echo "Available targets:"
	@echo "  make dev              - start web + api + simulation with Docker Compose"
	@echo "  make dev-up           - start web + api + simulation with Docker Compose"
	@echo "  make dev-down         - stop the Docker Compose stack"
	@echo "  make down             - alias for make dev-down"
	@echo "  make status           - show Docker Compose service status"
	@echo "  make test             - run API, simulation, and frontend checks"
	@echo "  make lint             - run go vet and frontend lint"
	@echo "  make api-run          - run the Go API locally"
	@echo "  make api-build        - build the Go API"
	@echo "  make api-test         - run Go API tests"
	@echo "  make simulation-run   - run the Go simulation service locally"
	@echo "  make simulation-build - build the Go simulation service"
	@echo "  make simulation-test  - run simulation tests"
	@echo "  make web-api-types    - regenerate frontend API contract types"
	@echo "  make web-build        - build the frontend in the web container"
	@echo "  make web-lint         - lint the frontend in the web container"
	@echo "  make web-typecheck    - typecheck the frontend in the web container"

dev: dev-up

dev-up:
	docker compose up --build -d

dev-down:
	docker compose down

down: dev-down

status:
	docker compose ps

test: api-test simulation-test web-api-types web-typecheck web-lint web-build

lint: api-vet simulation-vet web-lint

api-dev: api-run

api-run:
	cd apps/api && go run ./cmd/api

api-build:
	cd apps/api && go build ./cmd/api

api-test:
	cd apps/api && go test ./...

api-vet:
	cd apps/api && go vet ./...

simulation-run:
	cd apps/simulation && go run ./cmd/simulation

simulation-build:
	cd apps/simulation && go build ./cmd/simulation

simulation-test:
	cd apps/simulation && go test ./...

simulation-vet:
	cd apps/simulation && go vet ./...

web-api-types:
	$(WEB_RUN) "npm install && npm run api:types"

web-build:
	$(WEB_RUN) "npm install && npm run build"

web-lint:
	$(WEB_RUN) "npm install && npm run lint"

web-typecheck:
	$(WEB_RUN) "npm install && npm run typecheck"
