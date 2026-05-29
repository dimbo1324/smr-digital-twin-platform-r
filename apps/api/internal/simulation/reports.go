package simulation

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/auth"
	httpapi "github.com/dimbo1324/smr-digital-twin-platform-r/apps/api/internal/http"
)

const reportDisclaimer = "Simulation-only report for synthetic digital twin data. Not a regulatory, production audit, or nuclear compliance report."

var allowedReportWindows = map[string]bool{
	"15m": true,
	"1h":  true,
	"6h":  true,
	"24h": true,
}

func (g *Gateway) SimulationReport(w http.ResponseWriter, r *http.Request) {
	window := normalizeReportWindow(r.URL.Query().Get("window"))
	format := strings.ToLower(r.URL.Query().Get("format"))
	if format == "" {
		format = "json"
	}
	if format != "json" && format != "csv" {
		httpapi.WriteError(w, r, http.StatusBadRequest, "INVALID_REPORT_FORMAT", "format must be json or csv")
		return
	}

	report, err := g.buildSimulationReport(r, window)
	if err != nil {
		g.writeSimulationCommandError(w, r, err)
		return
	}
	if format == "csv" {
		payload, err := simulationReportCSV(report)
		if err != nil {
			httpapi.WriteError(w, r, http.StatusInternalServerError, "REPORT_CSV_FAILED", "Failed to render report CSV")
			return
		}
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.csv"`, report.ReportID))
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(payload)
		return
	}

	httpapi.WriteData(w, r, http.StatusOK, report, httpapi.MetaOptions{Source: report.DataSources.LatestTelemetry, Degraded: report.DataSources.Degraded})
}

func normalizeReportWindow(window string) string {
	if allowedReportWindows[window] {
		return window
	}
	return "1h"
}

func (g *Gateway) buildSimulationReport(r *http.Request, window string) (SimulationReport, error) {
	ctx := r.Context()
	now := time.Now().UTC()
	session := auth.FromRequest(r)

	status, err := g.client.Status(ctx)
	if err != nil {
		return SimulationReport{}, err
	}
	latest, err := g.client.LatestTelemetry(ctx)
	if err != nil {
		return SimulationReport{}, err
	}
	control, err := g.client.ControlStatus(ctx)
	if err != nil {
		return SimulationReport{}, err
	}
	pid, err := g.client.PIDStatus(ctx)
	if err != nil {
		return SimulationReport{}, err
	}

	historian, historianErr := g.client.HistorianStatus(ctx)
	if historianErr != nil {
		historian = HistorianStatus{
			Enabled:              false,
			Mode:                 "in_memory",
			Status:               "unavailable_fallback",
			Database:             "in_memory",
			FallbackActive:       true,
			RetentionEnabled:     false,
			DownsamplingEnabled:  false,
			SupportedResolutions: []string{"raw"},
			AggregateStatus:      "unavailable",
			SimulationOnly:       true,
			SafetyDisclaimer:     "The historian stores synthetic simulation data for demo, learning and portfolio purposes only.",
		}
	}
	mqtt, mqttErr := g.client.MQTTStatus(ctx)
	if mqttErr != nil {
		mqtt = MQTTStatus{
			Enabled:          false,
			Connected:        false,
			Status:           "unavailable",
			SimulationOnly:   true,
			SafetyDisclaimer: "MQTT topics contain synthetic simulation payloads only. The bridge is publish-only and cannot control equipment.",
		}
	}

	history, historyErr := g.client.TelemetryHistory(ctx, window, "raw")
	historySource := history.Meta.Source
	if historySource == "" {
		historySource = "unavailable"
	}
	commands, commandsErr := g.client.RecentCommands(ctx, 100)
	events, eventsErr := g.client.RecentEvents(ctx, 100)
	activeAlarms, activeAlarmErr := g.client.ActiveAlarms(ctx)
	alarmHistory, alarmHistoryErr := g.client.AlarmHistory(ctx)

	dataSources := ReportDataSources{
		LatestTelemetry: "simulation",
		History:         historySource,
		Commands:        sourceForError(commandsErr),
		Events:          sourceForError(eventsErr),
		Alarms:          sourceForError(firstError(activeAlarmErr, alarmHistoryErr)),
		Degraded:        historianErr != nil || mqttErr != nil || historyErr != nil || commandsErr != nil || eventsErr != nil || activeAlarmErr != nil || alarmHistoryErr != nil,
	}

	return SimulationReport{
		ReportID:       fmt.Sprintf("sim-report-%s", now.Format("20060102T150405Z")),
		GeneratedAt:    now,
		TimeWindow:     window,
		SimulationOnly: true,
		Disclaimer:     reportDisclaimer,
		GeneratedBy: ReportUser{
			UserID:      session.UserID,
			DisplayName: session.DisplayName,
			Role:        string(session.Role),
			Source:      session.Source,
		},
		DataSources:     dataSources,
		System:          ReportSystemSummary{Mode: status.Mode, Health: status.Health, ActiveScenario: status.ActiveScenario, Running: status.Running},
		Historian:       historian,
		MQTT:            mqtt,
		Control:         control,
		PID:             pid,
		LatestTelemetry: latest,
		TelemetryStats:  telemetryStats(history.Values, historySource),
		Commands:        commandSummary(commands),
		Events:          eventSummary(events),
		Alarms:          alarmSummary(activeAlarms, alarmHistory),
	}, nil
}

func sourceForError(err error) string {
	if err != nil {
		return "unavailable"
	}
	return "simulation"
}

func firstError(errors ...error) error {
	for _, err := range errors {
		if err != nil {
			return err
		}
	}
	return nil
}

type telemetryMetric struct {
	tag   string
	label string
	unit  string
	value func(TelemetrySnapshot) float64
}

var reportTelemetryMetrics = []telemetryMetric{
	{tag: "TT-101", label: "Loop Temperature", unit: "C", value: func(s TelemetrySnapshot) float64 { return s.LoopTemperatureC }},
	{tag: "PT-101", label: "Loop Pressure", unit: "MPa", value: func(s TelemetrySnapshot) float64 { return s.LoopPressureMPa }},
	{tag: "FT-101", label: "Loop Flow", unit: "kg/s", value: func(s TelemetrySnapshot) float64 { return s.LoopFlowKGS }},
	{tag: "V-101.POS", label: "Valve Position", unit: "%", value: func(s TelemetrySnapshot) float64 { return s.ValvePositionPct }},
	{tag: "TIC-101.OUTPUT", label: "PID Output", unit: "%", value: func(s TelemetrySnapshot) float64 { return s.PIDOutputPct }},
}

func telemetryStats(history []TelemetrySnapshot, source string) []ReportTelemetryStats {
	if len(history) == 0 {
		return []ReportTelemetryStats{}
	}
	stats := make([]ReportTelemetryStats, 0, len(reportTelemetryMetrics))
	for _, metric := range reportTelemetryMetrics {
		minValue := metric.value(history[0])
		maxValue := minValue
		sum := 0.0
		for _, snapshot := range history {
			value := metric.value(snapshot)
			if value < minValue {
				minValue = value
			}
			if value > maxValue {
				maxValue = value
			}
			sum += value
		}
		stats = append(stats, ReportTelemetryStats{
			Tag:    metric.tag,
			Label:  metric.label,
			Unit:   metric.unit,
			Min:    minValue,
			Max:    maxValue,
			Avg:    sum / float64(len(history)),
			Count:  len(history),
			Source: source,
		})
	}
	return stats
}

func commandSummary(commands []Command) ReportCountSummary {
	byStatus := map[string]int{}
	for _, command := range commands {
		byStatus[command.Status]++
	}
	return ReportCountSummary{Total: len(commands), ByType: byStatus}
}

func eventSummary(events []Event) ReportCountSummary {
	bySeverity := map[string]int{}
	for _, event := range events {
		bySeverity[event.Severity]++
	}
	return ReportCountSummary{Total: len(events), ByType: bySeverity}
}

func alarmSummary(activeAlarms []Alarm, history []Alarm) ReportAlarmSummary {
	summary := ReportAlarmSummary{BySeverity: map[string]int{}}
	for _, alarm := range activeAlarms {
		if alarm.Status == "ACTIVE" {
			summary.Active++
		}
		if alarm.Status == "ACKNOWLEDGED" {
			summary.Acknowledged++
		}
		summary.BySeverity[alarm.Severity]++
	}
	for _, alarm := range history {
		if alarm.Status == "CLEARED" {
			summary.Cleared++
		}
		summary.BySeverity[alarm.Severity]++
	}
	return summary
}

func simulationReportCSV(report SimulationReport) ([]byte, error) {
	buffer := &bytes.Buffer{}
	writer := csv.NewWriter(buffer)
	if err := writer.Write([]string{"section", "key", "value", "unit", "source"}); err != nil {
		return nil, err
	}
	rows := [][]string{
		{"report", "reportId", report.ReportID, "", "api"},
		{"report", "generatedAt", report.GeneratedAt.Format(time.RFC3339), "", "api"},
		{"report", "timeWindow", report.TimeWindow, "", "api"},
		{"report", "simulationOnly", strconv.FormatBool(report.SimulationOnly), "", "api"},
		{"report", "disclaimer", report.Disclaimer, "", "api"},
		{"user", "displayName", report.GeneratedBy.DisplayName, "", report.GeneratedBy.Source},
		{"user", "role", report.GeneratedBy.Role, "", report.GeneratedBy.Source},
		{"system", "mode", report.System.Mode, "", "simulation"},
		{"system", "health", report.System.Health, "", "simulation"},
		{"system", "activeScenario", report.System.ActiveScenario, "", "simulation"},
		{"historian", "status", report.Historian.Status, "", report.DataSources.History},
		{"mqtt", "status", report.MQTT.Status, "", "simulation"},
		{"control", "mode", report.Control.Mode, "", "simulation"},
		{"pid", "status", report.PID.Status, "", "simulation"},
		{"commands", "total", strconv.Itoa(report.Commands.Total), "", report.DataSources.Commands},
		{"events", "total", strconv.Itoa(report.Events.Total), "", report.DataSources.Events},
		{"alarms", "active", strconv.Itoa(report.Alarms.Active), "", report.DataSources.Alarms},
		{"alarms", "acknowledged", strconv.Itoa(report.Alarms.Acknowledged), "", report.DataSources.Alarms},
		{"alarms", "cleared", strconv.Itoa(report.Alarms.Cleared), "", report.DataSources.Alarms},
	}
	for _, row := range rows {
		if err := writer.Write(row); err != nil {
			return nil, err
		}
	}
	for _, stat := range report.TelemetryStats {
		if err := writer.Write([]string{"telemetry", stat.Tag + ".avg", fmt.Sprintf("%.2f", stat.Avg), stat.Unit, stat.Source}); err != nil {
			return nil, err
		}
		if err := writer.Write([]string{"telemetry", stat.Tag + ".min", fmt.Sprintf("%.2f", stat.Min), stat.Unit, stat.Source}); err != nil {
			return nil, err
		}
		if err := writer.Write([]string{"telemetry", stat.Tag + ".max", fmt.Sprintf("%.2f", stat.Max), stat.Unit, stat.Source}); err != nil {
			return nil, err
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}
