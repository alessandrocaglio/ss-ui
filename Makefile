.PHONY: dev build test lint docker docker-push deploy gen-test-cert

VERSION ?= latest
REGISTRY ?= quay.io/acaglio
IMAGE_NAME ?= ss-ui
IMAGE ?= $(REGISTRY)/$(IMAGE_NAME):$(VERSION)

CERT_FILE_ABS := $(if $(CERT_FILE),$(abspath $(CERT_FILE)),)

dev:
	@echo "Starting dev servers..."
	@bash -c "trap 'kill 0' SIGTERM SIGINT; (export CERT_FILE='$(CERT_FILE_ABS)'; cd backend && go run ./cmd/server) & (cd frontend && npm run dev) & wait"

build:
	@echo "Building frontend..."
	@cd frontend && npm run build
	@echo "Building backend..."
	@rm -rf backend/cmd/server/frontend/dist
	@mkdir -p backend/cmd/server/frontend
	@cp -r frontend/dist backend/cmd/server/frontend/dist
	@cd backend && CGO_ENABLED=0 go build -o ../ss-ui ./cmd/server

test:
	@cd backend && go test -v -cover ./...

lint:
	@mkdir -p backend/cmd/server/frontend/dist && touch backend/cmd/server/frontend/dist/.gitkeep
	@cd backend && go vet ./... && gofmt -l .
	@cd frontend && npm run lint

docker:
	@echo "Building image $(IMAGE)..."
	@docker build -t $(IMAGE) -f backend/Dockerfile .

docker-push:
	@echo "Pushing image to $(IMAGE)..."
	@docker push $(IMAGE)

deploy:
	@kubectl apply -f deploy/

gen-test-cert:
	@mkdir -p dev
	@openssl req -x509 -nodes -newkey rsa:4096 \
		-keyout dev/test-key.pem -out dev/test-cert.pem \
		-days 365 -subj "/CN=sealed-secrets/O=sealed-secrets"
	@echo "Saved test cert to dev/test-cert.pem"
