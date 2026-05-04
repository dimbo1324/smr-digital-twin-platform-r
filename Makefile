.PHONY: help dev test lint down api-dev api-run api-build api-test

help:
	@echo "Available targets:"
	@echo "  make dev   - start the local development environment placeholder"
	@echo "  make test  - run test suite placeholder"
	@echo "  make lint  - run lint suite placeholder"
	@echo "  make down  - stop the local development environment placeholder"
	@echo "  make api-run   - run the Go API locally"
	@echo "  make api-build - build the Go API"
	@echo "  make api-test  - run Go API tests"

dev:
	@echo "Development environment is not implemented yet. Scaffold is ready."

test:
	@echo "Tests are not implemented yet. Scaffold is ready."

lint:
	@echo "Linting is not implemented yet. Scaffold is ready."

down:
	@echo "Nothing to stop yet. Scaffold is ready."

api-dev: api-run

api-run:
	cd apps/api && go run ./cmd/api

api-build:
	cd apps/api && go build ./cmd/api

api-test:
	cd apps/api && go test ./...
