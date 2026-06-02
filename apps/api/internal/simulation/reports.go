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

var allowedReportTemplates = map[string]bool{
	"executive-summary":       true,
	"engineering-detail":      true,
	"alarm-and-event-review":  true,
	"pid-control-review":      true,
	"historian-trend-summary": true,
}

var defaultReportSections = []string{
	"metadata",
	"safetyDisclaimer",
	"systemSummary",
	"processSummary",
	"pidSummary",
	"alarmSummary",
	"eventSummary",
	"commandSummary",
	"historianSummary",
	"mqttSummary",
	"scenarioSummary",
	"trendStatistics",
}

var allowedReportSections = func() map[string]bool {
	sections := make(map[string]bool, len(defaultReportSections))
	for _, section := range defaultReportSections {
		sections[section] = true
	}
	return sections
}()

func (g *Gateway) SimulationReport(w http.ResponseWriter, r *http.Request) {
	window := normalizeReportWindow(r.URL.Query().Get("window"))
	format := strings.ToLower(r.URL.Query().Get("format"))
	if format == "" {
		format = "json"
	}
	if format != "json" && format != "csv" && format != "pdf" {
		httpapi.WriteError(w, r, http.StatusBadRequest, "INVALID_REPORT_FORMAT", "format must be json, csv, or pdf")
		return
	}
	options, ok := parseReportOptions(w, r)
	if !ok {
		return
	}

	report, err := g.buildSimulationReport(r, window, options)
	if err != nil {
		g.writeSimulationCommandError(w, r, err)
		return
	}
	if format == "csv" {
		payload, err := simulationReportCSV(report, options)
		if err != nil {
			httpapi.WriteError(w, r, http.StatusInternalServerError, "REPORT_CSV_FAILED", "Failed to render report CSV")
			return
		}
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.csv"`, safeReportFilename(report.ReportID)))
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(payload)
		return
	}
	if format == "pdf" {
		payload, err := simulationReportPDF(report, options)
		if err != nil {
			httpapi.WriteError(w, r, http.StatusInternalServerError, "REPORT_PDF_FAILED", "Failed to render report PDF")
			return
		}
		w.Header().Set("Content-Type", "application/pdf")
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.pdf"`, safeReportFilename(report.ReportID)))
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(payload)
		return
	}

	httpapi.WriteData(w, r, http.StatusOK, report, httpapi.MetaOptions{Source: report.DataSources.LatestTelemetry, Degraded: report.DataSources.Degraded})
}

func parseReportOptions(w http.ResponseWriter, r *http.Request) (ReportOptions, bool) {
	template := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("template")))
	if template == "" {
		template = "engineering-detail"
	}
	if !allowedReportTemplates[template] {
		httpapi.WriteError(w, r, http.StatusBadRequest, "INVALID_REPORT_TEMPLATE", "unsupported report template")
		return ReportOptions{}, false
	}

	sections := append([]string(nil), defaultReportSections...)
	if rawSections := strings.TrimSpace(r.URL.Query().Get("sections")); rawSections != "" {
		sections = []string{}
		seen := map[string]bool{}
		for _, raw := range strings.Split(rawSections, ",") {
			section := strings.TrimSpace(raw)
			if section == "" {
				continue
			}
			if !allowedReportSections[section] {
				httpapi.WriteError(w, r, http.StatusBadRequest, "INVALID_REPORT_SECTION", "unsupported report section")
				return ReportOptions{}, false
			}
			if !seen[section] {
				sections = append(sections, section)
				seen[section] = true
			}
		}
		if len(sections) == 0 {
			httpapi.WriteError(w, r, http.StatusBadRequest, "INVALID_REPORT_SECTION", "sections must include at least one supported section")
			return ReportOptions{}, false
		}
	}

	includeDisclaimers := true
	if raw := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("includeDisclaimers"))); raw == "false" {
		// Keep the mandatory simulation-only boundary in all formats. This flag only
		// allows future detailed disclaimer text to be reduced, never removed.
		includeDisclaimers = false
	}

	return ReportOptions{Template: template, Sections: sections, IncludeDisclaimers: includeDisclaimers}, true
}

func normalizeReportWindow(window string) string {
	if allowedReportWindows[window] {
		return window
	}
	return "1h"
}

func safeReportFilename(reportID string) string {
	builder := strings.Builder{}
	for _, r := range reportID {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			builder.WriteRune(r)
		}
	}
	if builder.Len() == 0 {
		return "simulation-report"
	}
	return builder.String()
}

func (g *Gateway) buildSimulationReport(r *http.Request, window string, options ReportOptions) (SimulationReport, error) {
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
		Template:       options.Template,
		Sections:       append([]string(nil), options.Sections...),
		Options:        options,
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
		TelemetryStats:  telemetryStatsForOptions(history.Values, historySource, options),
		Commands:        commandSummary(commands),
		Events:          eventSummary(events),
		Alarms:          alarmSummary(activeAlarms, alarmHistory),
	}, nil
}

func reportHasSection(options ReportOptions, section string) bool {
	for _, candidate := range options.Sections {
		if candidate == section {
			return true
		}
	}
	return false
}

func telemetryStatsForOptions(history []TelemetrySnapshot, source string, options ReportOptions) []ReportTelemetryStats {
	if !reportHasSection(options, "trendStatistics") {
		return []ReportTelemetryStats{}
	}
	return telemetryStats(history, source)
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

func simulationReportCSV(report SimulationReport, options ReportOptions) ([]byte, error) {
	buffer := &bytes.Buffer{}
	writer := csv.NewWriter(buffer)
	if err := writer.Write([]string{"section", "key", "value", "unit", "source"}); err != nil {
		return nil, err
	}
	rows := [][]string{}
	if reportHasSection(options, "metadata") {
		rows = append(rows,
			[]string{"report", "reportId", report.ReportID, "", "api"},
			[]string{"report", "generatedAt", report.GeneratedAt.Format(time.RFC3339), "", "api"},
			[]string{"report", "timeWindow", report.TimeWindow, "", "api"},
			[]string{"report", "template", report.Template, "", "api"},
			[]string{"report", "simulationOnly", strconv.FormatBool(report.SimulationOnly), "", "api"},
			[]string{"user", "displayName", report.GeneratedBy.DisplayName, "", report.GeneratedBy.Source},
			[]string{"user", "role", report.GeneratedBy.Role, "", report.GeneratedBy.Source},
		)
	}
	if reportHasSection(options, "safetyDisclaimer") {
		rows = append(rows, []string{"report", "disclaimer", report.Disclaimer, "", "api"})
	}
	if reportHasSection(options, "systemSummary") {
		rows = append(rows,
			[]string{"system", "mode", report.System.Mode, "", "simulation"},
			[]string{"system", "health", report.System.Health, "", "simulation"},
		)
	}
	if reportHasSection(options, "scenarioSummary") {
		rows = append(rows, []string{"system", "activeScenario", report.System.ActiveScenario, "", "simulation"})
	}
	if reportHasSection(options, "historianSummary") {
		rows = append(rows, []string{"historian", "status", report.Historian.Status, "", report.DataSources.History})
	}
	if reportHasSection(options, "mqttSummary") {
		rows = append(rows, []string{"mqtt", "status", report.MQTT.Status, "", "simulation"})
	}
	if reportHasSection(options, "pidSummary") {
		rows = append(rows,
			[]string{"control", "mode", report.Control.Mode, "", "simulation"},
			[]string{"pid", "status", report.PID.Status, "", "simulation"},
		)
	}
	if reportHasSection(options, "commandSummary") {
		rows = append(rows, []string{"commands", "total", strconv.Itoa(report.Commands.Total), "", report.DataSources.Commands})
	}
	if reportHasSection(options, "eventSummary") {
		rows = append(rows, []string{"events", "total", strconv.Itoa(report.Events.Total), "", report.DataSources.Events})
	}
	if reportHasSection(options, "alarmSummary") {
		rows = append(rows,
			[]string{"alarms", "active", strconv.Itoa(report.Alarms.Active), "", report.DataSources.Alarms},
			[]string{"alarms", "acknowledged", strconv.Itoa(report.Alarms.Acknowledged), "", report.DataSources.Alarms},
			[]string{"alarms", "cleared", strconv.Itoa(report.Alarms.Cleared), "", report.DataSources.Alarms},
		)
	}
	for _, row := range rows {
		if err := writer.Write(row); err != nil {
			return nil, err
		}
	}
	if reportHasSection(options, "trendStatistics") {
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
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}
