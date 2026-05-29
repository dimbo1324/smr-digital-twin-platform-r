FROM golang:1.25.10-alpine AS build

WORKDIR /src
COPY apps/api/go.mod apps/api/go.sum ./
RUN go mod download
COPY apps/api ./
RUN go build -o /out/api ./cmd/api

FROM alpine:3.22
RUN adduser -D -H appuser
USER appuser
COPY --from=build /out/api /usr/local/bin/api
EXPOSE 8080
ENTRYPOINT ["api"]
