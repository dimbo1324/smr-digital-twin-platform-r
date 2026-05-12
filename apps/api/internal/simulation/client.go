package simulation

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Client struct {
	baseURL string
	http    *http.Client
	enabled bool
}

type RemoteError struct {
	Status  int
	Code    string
	Message string
}

func (e *RemoteError) Error() string {
	if e.Code != "" {
		return fmt.Sprintf("simulation response status %d: %s", e.Status, e.Code)
	}
	return fmt.Sprintf("simulation response status %d", e.Status)
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

func (c *Client) Alarms(ctx context.Context) ([]Alarm, error) {
	return get[[]Alarm](ctx, c, "/api/v1/simulation/alarms")
}

func (c *Client) AlarmEvents(ctx context.Context, limit string) ([]AlarmEvent, error) {
	if limit == "" {
		limit = "100"
	}
	return get[[]AlarmEvent](ctx, c, "/api/v1/simulation/alarms/events?limit="+url.QueryEscape(limit))
}

func (c *Client) Alarm(ctx context.Context, alarmID string) (Alarm, error) {
	return get[Alarm](ctx, c, "/api/v1/simulation/alarms/"+url.PathEscape(alarmID))
}

func (c *Client) AcknowledgeAlarm(ctx context.Context, alarmID string, request AcknowledgeAlarmRequest) (AcknowledgeAlarmResponse, error) {
	return postJSON[AcknowledgeAlarmResponse](ctx, c, "/api/v1/simulation/alarms/"+url.PathEscape(alarmID)+"/acknowledge", request)
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
	return doRequest[T](ctx, c, http.MethodGet, path, nil)
}

func post[T any](ctx context.Context, c *Client, path string) (T, error) {
	return doRequest[T](ctx, c, http.MethodPost, path, nil)
}

func postJSON[T any](ctx context.Context, c *Client, path string, payload any) (T, error) {
	var body bytes.Buffer
	if err := json.NewEncoder(&body).Encode(payload); err != nil {
		var zero T
		return zero, err
	}
	return doRequest[T](ctx, c, http.MethodPost, path, &body)
}

func doRequest[T any](ctx context.Context, c *Client, method, path string, body io.Reader) (T, error) {
	var zero T
	if !c.enabled {
		return zero, ErrDisabled
	}
	if body == nil {
		body = bytes.NewReader(nil)
	}
	request, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, body)
	if err != nil {
		return zero, err
	}
	request.Header.Set("Accept", "application/json")
	if method == http.MethodPost {
		request.Header.Set("Content-Type", "application/json")
	}

	response, err := c.http.Do(request)
	if err != nil {
		return zero, err
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		var payload struct {
			Error struct {
				Code    string `json:"code"`
				Message string `json:"message"`
			} `json:"error"`
		}
		_ = json.NewDecoder(response.Body).Decode(&payload)
		return zero, &RemoteError{Status: response.StatusCode, Code: payload.Error.Code, Message: payload.Error.Message}
	}

	var payload envelope[T]
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		return zero, err
	}
	return payload.Data, nil
}

var ErrDisabled = fmt.Errorf("simulation client disabled")
