# Stage 1 -- Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2 -- Build backend (embeds frontend dist)
FROM golang:1.26-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist ./cmd/server/frontend/dist
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w -X main.version=${VERSION:-dev}" \
    -o /ss-ui ./cmd/server

# Stage 3 -- Runtime
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=backend-builder /ss-ui /ss-ui
EXPOSE 8080
ENTRYPOINT ["/ss-ui"]
