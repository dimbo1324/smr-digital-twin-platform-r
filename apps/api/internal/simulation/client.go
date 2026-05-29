package simulation

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
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

const maxUpstreamJSONBytes = 8 << 20

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

func (c *Client) TelemetryHistory(ctx context.Context, window string, resolution string) (TelemetryHistoryResult, error) {
	if window == "" {
		window = "15m"
	}
	if resolution == "" {
		resolution = "raw"
	}
	query := url.Values{}
	query.Set("window", window)
	query.Set("resolution", resolution)
	payload, err := getEnvelope[[]TelemetrySnapshot](ctx, c, "/api/v1/simulation/telemetry/history?"+query.Encode())
	if err != nil {
		return TelemetryHistoryResult{}, err
	}
	return TelemetryHistoryResult{Values: payload.Data, Meta: payload.Meta}, nil
}

func (c *Client) ControlStatus(ctx context.Context) (ControlStatus, error) {
	return get[ControlStatus](ctx, c, "/api/v1/simulation/control/status")
}

func (c *Client) SetControlMode(ctx context.Context, request ModeChangeRequest) (ControlStatus, error) {
	return postJSON[ControlStatus](ctx, c, "/api/v1/simulation/control/mode", request)
}

func (c *Client) PIDStatus(ctx context.Context) (PIDStatus, error) {
	return get[PIDStatus](ctx, c, "/api/v1/simulation/pid/status")
}

func (c *Client) HistorianStatus(ctx context.Context) (HistorianStatus, error) {
	return get[HistorianStatus](ctx, c, "/api/v1/simulation/historian/status")
}

func (c *Client) MQTTStatus(ctx context.Context) (MQTTStatus, error) {
	return get[MQTTStatus](ctx, c, "/api/v1/simulation/mqtt/status")
}

func (c *Client) UpdatePIDConfig(ctx context.Context, request PIDConfigUpdateRequest) (PIDStatus, error) {
	return patchJSON[PIDStatus](ctx, c, "/api/v1/simulation/pid/config", request)
}

func (c *Client) ActiveAlarms(ctx context.Context) ([]Alarm, error) {
	return get[[]Alarm](ctx, c, "/api/v1/simulation/alarms/active")
}

func (c *Client) AlarmHistory(ctx context.Context) ([]Alarm, error) {
	return get[[]Alarm](ctx, c, "/api/v1/simulation/alarms/history")
}

func (c *Client) AcknowledgeAlarm(ctx context.Context, id string, request AlarmAcknowledgeRequest) (Alarm, error) {
	return postJSON[Alarm](ctx, c, "/api/v1/simulation/alarms/"+url.PathEscape(id)+"/acknowledge", request)
}

func (c *Client) Scenarios(ctx context.Context) ([]ScenarioInfo, error) {
	return get[[]ScenarioInfo](ctx, c, "/api/v1/simulation/scenarios")
}

func (c *Client) StartScenario(ctx context.Context, scenarioName string) (Status, error) {
	return post[Status](ctx, c, "/api/v1/simulation/scenarios/"+url.PathEscape(scenarioName)+"/start")
}

func (c *Client) StopScenario(ctx context.Context) (Status, error) {
	return post[Status](ctx, c, "/api/v1/simulation/scenarios/stop")
}

func (c *Client) Reset(ctx context.Context) (Status, error) {
	return post[Status](ctx, c, "/api/v1/simulation/reset")
}

func (c *Client) SubmitCommand(ctx context.Context, request CommandRequest) (Command, error) {
	return postJSON[Command](ctx, c, "/api/v1/simulation/commands", request)
}

func (c *Client) RecentCommands(ctx context.Context, limit int) ([]Command, error) {
	return get[[]Command](ctx, c, recentPath("/api/v1/simulation/commands/recent", limit))
}

func (c *Client) RecentEvents(ctx context.Context, limit int) ([]Event, error) {
	return get[[]Event](ctx, c, recentPath("/api/v1/simulation/events/recent", limit))
}

func recentPath(path string, limit int) string {
	if limit <= 0 {
		return path
	}
	query := url.Values{}
	query.Set("limit", fmt.Sprintf("%d", limit))
	return path + "?" + query.Encode()
}

func get[T any](ctx context.Context, c *Client, path string) (T, error) {
	return do[T](ctx, c, http.MethodGet, path)
}

func getEnvelope[T any](ctx context.Context, c *Client, path string) (envelope[T], error) {
	return doEnvelope[T](ctx, c, http.MethodGet, path, nil)
}

func post[T any](ctx context.Context, c *Client, path string) (T, error) {
	return do[T](ctx, c, http.MethodPost, path)
}

func postJSON[T any](ctx context.Context, c *Client, path string, body any) (T, error) {
	return doWithBody[T](ctx, c, http.MethodPost, path, body)
}

func patchJSON[T any](ctx context.Context, c *Client, path string, body any) (T, error) {
	return doWithBody[T](ctx, c, http.MethodPatch, path, body)
}

func do[T any](ctx context.Context, c *Client, method, path string) (T, error) {
	return doWithBody[T](ctx, c, method, path, nil)
}

func doWithBody[T any](ctx context.Context, c *Client, method, path string, body any) (T, error) {
	payload, err := doEnvelope[T](ctx, c, method, path, body)
	if err != nil {
		var zero T
		return zero, err
	}
	return payload.Data, nil
}

func doEnvelope[T any](ctx context.Context, c *Client, method, path string, body any) (envelope[T], error) {
	if !c.enabled {
		return envelope[T]{}, ErrDisabled
	}
	var reader io.Reader = bytes.NewReader(nil)
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			return envelope[T]{}, err
		}
		reader = bytes.NewReader(payload)
	}
	request, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reader)
	if err != nil {
		return envelope[T]{}, err
	}
	request.Header.Set("Accept", "application/json")
	if body != nil {
		request.Header.Set("Content-Type", "application/json")
	}

	response, err := c.http.Do(request)
	if err != nil {
		return envelope[T]{}, err
	}
	defer response.Body.Close()

	if response.StatusCode < 200 || response.StatusCode >= 300 {
		var payload errorEnvelope
		if err := decodeUpstreamJSON(response.Body, &payload); err == nil && payload.Error.Code != "" {
			return envelope[T]{}, ResponseError{StatusCode: response.StatusCode, Code: payload.Error.Code, Message: payload.Error.Message}
		}
		return envelope[T]{}, ResponseError{StatusCode: response.StatusCode, Code: "SIMULATION_ERROR", Message: fmt.Sprintf("simulation response status %d", response.StatusCode)}
	}

	var payload envelope[T]
	if err := decodeUpstreamJSON(response.Body, &payload); err != nil {
		return envelope[T]{}, err
	}
	return payload, nil
}

func decodeUpstreamJSON(reader io.Reader, payload any) error {
	limited := io.LimitReader(reader, maxUpstreamJSONBytes+1)
	body, err := io.ReadAll(limited)
	if err != nil {
		return err
	}
	if len(body) > maxUpstreamJSONBytes {
		return ResponseError{StatusCode: http.StatusBadGateway, Code: "SIMULATION_RESPONSE_TOO_LARGE", Message: "simulation response exceeded gateway safety limit"}
	}
	decoder := json.NewDecoder(bytes.NewReader(body))
	if err := decoder.Decode(payload); err != nil {
		return err
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		return fmt.Errorf("simulation response contains trailing JSON")
	}
	return nil
}

var ErrDisabled = fmt.Errorf("simulation client disabled")

type ResponseError struct {
	StatusCode int
	Code       string
	Message    string
}

func (e ResponseError) Error() string {
	return e.Message
}

func IsResponseError(err error) (ResponseError, bool) {
	var responseErr ResponseError
	if errors.As(err, &responseErr) {
		return responseErr, true
	}
	return ResponseError{}, false
}

type errorEnvelope struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}
