package simulation

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type Client struct {
	baseURL string
	http    *http.Client
	enabled bool
}

func NewClient(baseURL string, timeout time.Duration, enabled bool) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: timeout},
		enabled: enabled,
	}
}

func (c *Client) Enabled() bool {
	return c.enabled
}

func (c *Client) Status(ctx context.Context) (Status, error) {
	return get[Status](ctx, c, "/api/v1/simulation/status")
}

func (c *Client) Assets(ctx context.Context) ([]Asset, error) {
	return get[[]Asset](ctx, c, "/api/v1/simulation/assets")
}

func (c *Client) LatestTelemetry(ctx context.Context) (TelemetrySnapshot, error) {
	return get[TelemetrySnapshot](ctx, c, "/api/v1/simulation/telemetry/latest")
}

func (c *Client) TelemetryHistory(ctx context.Context, window string) ([]TelemetrySnapshot, error) {
	if window == "" {
		window = "15m"
	}
	return get[[]TelemetrySnapshot](ctx, c, "/api/v1/simulation/telemetry/history?window="+window)
}

func (c *Client) ActiveAlarms(ctx context.Context) ([]Alarm, error) {
	return get[[]Alarm](ctx, c, "/api/v1/simulation/alarms/active")
}

func (c *Client) Scenarios(ctx context.Context) ([]ScenarioInfo, error) {
	return get[[]ScenarioInfo](ctx, c, "/api/v1/simulation/scenarios")
}

func (c *Client) StartScenario(ctx context.Context, scenarioName string) (Status, error) {
	return post[Status](ctx, c, "/api/v1/simulation/scenarios/"+scenarioName+"/start")
}

func (c *Client) StopScenario(ctx context.Context) (Status, error) {
	return post[Status](ctx, c, "/api/v1/simulation/scenarios/stop")
}

func (c *Client) Reset(ctx context.Context) (Status, error) {
	return post[Status](ctx, c, "/api/v1/simulation/reset")
}

func get[T any](ctx context.Context, c *Client, path string) (T, error) {
	return do[T](ctx, c, http.MethodGet, path)
}

func post[T any](ctx context.Context, c *Client, path string) (T, error) {
	return do[T](ctx, c, http.MethodPost, path)
}

func do[T any](ctx context.Context, c *Client, method, path string) (T, error) {
	var zero T
	if !c.enabled {
		return zero, ErrDisabled
	}
	request, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, bytes.NewReader(nil))
	if err != nil {
		return zero, err
	}
	request.Header.Set("Accept", "application/json")

	response, err := c.http.Do(request)
	if err != nil {
		return zero, err
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return zero, fmt.Errorf("simulation response status %d", response.StatusCode)
	}

	var payload envelope[T]
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return zero, err
	}
	return payload.Data, nil
}

var ErrDisabled = fmt.Errorf("simulation client disabled")
