FROM golang:1.25-alpine AS build

WORKDIR /src
COPY apps/simulation/go.mod apps/simulation/go.sum ./
RUN go mod download
COPY apps/simulation ./
RUN go build -o /out/simulation ./cmd/simulation

FROM alpine:3.22
RUN adduser -D -H appuser
USER appuser
COPY --from=build /out/simulation /usr/local/bin/simulation
EXPOSE 8081
ENTRYPOINT ["simulation"]
