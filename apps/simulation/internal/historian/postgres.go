package historian

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/dimbo1324/smr-digital-twin-platform-r/apps/simulation/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresRepository struct {
	pool   *pgxpool.Pool
	cfg    Config
	logger *slog.Logger
	mu     sync.RWMutex
	status model.HistorianStatus
}

func NewPostgresRepository(ctx context.Context, cfg Config, logger *slog.Logger) (*PostgresRepository, error) {
	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL is required when historian is enabled")
	}
	poolCfg, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}
	poolCfg.MaxConns = 4
	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return nil, err
	}
	repo := &PostgresRepository{
		pool:   pool,
		cfg:    cfg,
		logger: logger,
		status: model.HistorianStatus{
			Enabled:           true,
			Mode:              model.HistorianModePersistent,
			Status:            model.HistorianStatusConnected,
			Database:          model.HistorianStoragePostgresTimescale,
			WriteIntervalMS:   cfg.WriteIntervalMS(),
			TelemetrySampleMS: cfg.TelemetrySampleMS(),
			FallbackActive:    false,
			SimulationOnly:    true,
			SafetyDisclaimer:  model.HistorianSimulationOnlyDataStatement,
		},
	}
	if err := repo.migrate(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return repo, nil
}

func (r *PostgresRepository) Close() {
	r.pool.Close()
}

func (r *PostgresRepository) Status() model.HistorianStatus {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.status
}

func (r *PostgresRepository) markSuccess() {
	now := time.Now().UTC()
	r.mu.Lock()
	defer r.mu.Unlock()
	r.status.Status = model.HistorianStatusConnected
	r.status.Mode = model.HistorianModePersistent
	r.status.FallbackActive = false
	r.status.LastSuccessfulWriteAt = &now
	r.status.LastErrorAt = nil
	r.status.LastErrorMessage = ""
}

func (r *PostgresRepository) markError(err error) {
	now := time.Now().UTC()
	r.mu.Lock()
	defer r.mu.Unlock()
	r.status.Status = model.HistorianStatusDegraded
	r.status.FallbackActive = true
	r.status.LastErrorAt = &now
	r.status.LastErrorMessage = err.Error()
}

func (r *PostgresRepository) migrate(ctx context.Context) error {
	if _, err := r.pool.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`); err != nil {
		return err
	}
	entries, err := os.ReadDir(r.cfg.MigrationsPath)
	if err != nil {
		return err
	}
	var files []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			files = append(files, entry.Name())
		}
	}
	sort.Strings(files)
	for _, name := range files {
		version := strings.TrimSuffix(name, ".sql")
		var exists bool
		if err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version=$1)`, version).Scan(&exists); err != nil {
			return err
		}
		if exists {
			continue
		}
		sqlBytes, err := os.ReadFile(filepath.Join(r.cfg.MigrationsPath, name))
		if err != nil {
			return err
		}
		tx, err := r.pool.Begin(ctx)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, string(sqlBytes)); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("migration %s failed: %w", name, err)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations(version) VALUES($1)`, version); err != nil {
			_ = tx.Rollback(ctx)
			return err
		}
		if err := tx.Commit(ctx); err != nil {
			return err
		}
		r.logger.Info("historian_migration_applied", slog.String("version", version))
	}
	return nil
}

func (r *PostgresRepository) AppendTelemetrySnapshot(ctx context.Context, snapshot model.TelemetrySnapshot) error {
	points := telemetryPoints(snapshot)
	batch := &pgx.Batch{}
	for _, point := range points {
		metadata, _ := json.Marshal(point.Metadata)
		batch.Queue(
			`INSERT INTO telemetry_history(time, tag, name, numeric_value, text_value, unit, quality, source, area, asset_tag, metadata)
			 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
			snapshot.Timestamp, point.Tag, point.Name, point.NumericValue, point.TextValue, point.Unit, point.Quality, point.Source, point.Area, point.AssetTag, metadata,
		)
	}
	results := r.pool.SendBatch(ctx, batch)
	defer results.Close()
	for range points {
		if _, err := results.Exec(); err != nil {
			r.markError(err)
			return err
		}
	}
	r.markSuccess()
	return nil
}

func (r *PostgresRepository) QueryTelemetryHistory(ctx context.Context, window time.Duration, fallbackNow time.Time) ([]model.TelemetrySnapshot, error) {
	if window <= 0 {
		window = 15 * time.Minute
	}
	from := fallbackNow.Add(-window)
	rows, err := r.pool.Query(ctx, `SELECT time, tag, numeric_value, text_value FROM telemetry_history WHERE time >= $1 ORDER BY time ASC, tag ASC`, from)
	if err != nil {
		r.markError(err)
		return nil, err
	}
	defer rows.Close()

	grouped := map[time.Time]*model.TelemetrySnapshot{}
	for rows.Next() {
		var ts time.Time
		var tag string
		var numeric *float64
		var text *string
		if err := rows.Scan(&ts, &tag, &numeric, &text); err != nil {
			r.markError(err)
			return nil, err
		}
		snapshot := grouped[ts]
		if snapshot == nil {
			value := model.TelemetrySnapshot{Timestamp: ts, SimulationOnly: true}
			grouped[ts] = &value
			snapshot = &value
		}
		applyTelemetryValue(snapshot, tag, numeric, text)
	}
	if err := rows.Err(); err != nil {
		r.markError(err)
		return nil, err
	}
	timestamps := make([]time.Time, 0, len(grouped))
	for ts := range grouped {
		timestamps = append(timestamps, ts)
	}
	sort.Slice(timestamps, func(i, j int) bool { return timestamps[i].Before(timestamps[j]) })
	result := make([]model.TelemetrySnapshot, 0, len(timestamps))
	for _, ts := range timestamps {
		result = append(result, *grouped[ts])
	}
	return result, nil
}

func (r *PostgresRepository) SaveCommand(ctx context.Context, command model.Command) error {
	payload, _ := json.Marshal(command.Payload)
	_, err := r.pool.Exec(ctx, `
		INSERT INTO command_history(id, target_tag, command_type, source, requested_by, status, requested_at, accepted_at, completed_at, rejected_at, payload, result_message, error_code, error_message, correlation_id, reject_reason, arbitration_mode, authority, rejected_by)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
		ON CONFLICT(id) DO UPDATE SET
		  target_tag=EXCLUDED.target_tag,
		  command_type=EXCLUDED.command_type,
		  source=EXCLUDED.source,
		  requested_by=EXCLUDED.requested_by,
		  status=EXCLUDED.status,
		  requested_at=EXCLUDED.requested_at,
		  accepted_at=EXCLUDED.accepted_at,
		  completed_at=EXCLUDED.completed_at,
		  rejected_at=EXCLUDED.rejected_at,
		  payload=EXCLUDED.payload,
		  result_message=EXCLUDED.result_message,
		  error_code=EXCLUDED.error_code,
		  error_message=EXCLUDED.error_message,
		  correlation_id=EXCLUDED.correlation_id,
		  reject_reason=EXCLUDED.reject_reason,
		  arbitration_mode=EXCLUDED.arbitration_mode,
		  authority=EXCLUDED.authority,
		  rejected_by=EXCLUDED.rejected_by`,
		command.ID, command.TargetTag, command.CommandType, command.Source, command.RequestedBy, command.Status, command.RequestedAt,
		command.AcceptedAt, command.CompletedAt, command.RejectedAt, payload, command.ResultMessage, command.ErrorCode, command.ErrorMessage,
		command.CorrelationID, command.RejectReason, command.ArbitrationMode, command.Authority, command.RejectedBy,
	)
	if err != nil {
		r.markError(err)
		return err
	}
	r.markSuccess()
	return nil
}

func (r *PostgresRepository) ListRecentCommands(ctx context.Context, limit int) ([]model.Command, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, target_tag, command_type, source, requested_by, status, requested_at, accepted_at, completed_at, rejected_at, payload, result_message, error_code, error_message, correlation_id, reject_reason, arbitration_mode, authority, rejected_by
		FROM command_history ORDER BY requested_at DESC NULLS LAST, created_at DESC LIMIT $1`, limit)
	if err != nil {
		r.markError(err)
		return nil, err
	}
	defer rows.Close()
	var commands []model.Command
	for rows.Next() {
		var command model.Command
		var payload []byte
		if err := rows.Scan(&command.ID, &command.TargetTag, &command.CommandType, &command.Source, &command.RequestedBy, &command.Status, &command.RequestedAt, &command.AcceptedAt, &command.CompletedAt, &command.RejectedAt, &payload, &command.ResultMessage, &command.ErrorCode, &command.ErrorMessage, &command.CorrelationID, &command.RejectReason, &command.ArbitrationMode, &command.Authority, &command.RejectedBy); err != nil {
			r.markError(err)
			return nil, err
		}
		_ = json.Unmarshal(payload, &command.Payload)
		commands = append(commands, command)
	}
	return commands, rows.Err()
}

func (r *PostgresRepository) SaveEvent(ctx context.Context, event model.Event) error {
	metadata, _ := json.Marshal(event.Metadata)
	_, err := r.pool.Exec(ctx, `
		INSERT INTO event_log(id, time, type, source, severity, target_tag, command_id, alarm_id, message, metadata)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
		ON CONFLICT(id) DO UPDATE SET time=EXCLUDED.time, type=EXCLUDED.type, source=EXCLUDED.source, severity=EXCLUDED.severity, target_tag=EXCLUDED.target_tag, command_id=EXCLUDED.command_id, alarm_id=EXCLUDED.alarm_id, message=EXCLUDED.message, metadata=EXCLUDED.metadata`,
		event.ID, event.Timestamp, event.Type, event.Source, event.Severity, event.TargetTag, event.CommandID, event.AlarmID, event.Message, metadata,
	)
	if err != nil {
		r.markError(err)
		return err
	}
	r.markSuccess()
	return nil
}

func (r *PostgresRepository) ListRecentEvents(ctx context.Context, limit int) ([]model.Event, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.pool.Query(ctx, `SELECT id, time, type, source, severity, target_tag, command_id, alarm_id, message, metadata FROM event_log ORDER BY time DESC, created_at DESC LIMIT $1`, limit)
	if err != nil {
		r.markError(err)
		return nil, err
	}
	defer rows.Close()
	var events []model.Event
	for rows.Next() {
		var event model.Event
		var metadata []byte
		if err := rows.Scan(&event.ID, &event.Timestamp, &event.Type, &event.Source, &event.Severity, &event.TargetTag, &event.CommandID, &event.AlarmID, &event.Message, &metadata); err != nil {
			r.markError(err)
			return nil, err
		}
		_ = json.Unmarshal(metadata, &event.Metadata)
		events = append(events, event)
	}
	return events, rows.Err()
}

func (r *PostgresRepository) SaveAlarm(ctx context.Context, alarm model.Alarm) error {
	metadata, _ := json.Marshal(alarm.Metadata)
	_, err := r.pool.Exec(ctx, `
		INSERT INTO alarm_history(id, rule_id, asset_id, tag, code, title, status, severity, message, source, active_at, acknowledged_at, acknowledged_by, cleared_at, last_value, threshold, unit, metadata, updated_at)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
		ON CONFLICT(id) DO UPDATE SET
		  rule_id=EXCLUDED.rule_id,
		  asset_id=EXCLUDED.asset_id,
		  tag=EXCLUDED.tag,
		  code=EXCLUDED.code,
		  title=EXCLUDED.title,
		  status=EXCLUDED.status,
		  severity=EXCLUDED.severity,
		  message=EXCLUDED.message,
		  source=EXCLUDED.source,
		  active_at=EXCLUDED.active_at,
		  acknowledged_at=EXCLUDED.acknowledged_at,
		  acknowledged_by=EXCLUDED.acknowledged_by,
		  cleared_at=EXCLUDED.cleared_at,
		  last_value=EXCLUDED.last_value,
		  threshold=EXCLUDED.threshold,
		  unit=EXCLUDED.unit,
		  metadata=EXCLUDED.metadata,
		  updated_at=EXCLUDED.updated_at`,
		alarm.ID, alarm.RuleID, alarm.AssetID, alarm.Tag, alarm.Code, alarm.Title, alarm.Status, alarm.Severity, alarm.Message, alarm.Source,
		alarm.ActiveAt, alarm.AcknowledgedAt, alarm.AcknowledgedBy, alarm.ClearedAt, alarm.LastValue, alarm.Threshold, alarm.Unit, metadata, alarm.UpdatedAt,
	)
	if err != nil {
		r.markError(err)
		return err
	}
	r.markSuccess()
	return nil
}

func (r *PostgresRepository) ListAlarmHistory(ctx context.Context, limit int) ([]model.Alarm, error) {
	if limit <= 0 {
		limit = 200
	}
	rows, err := r.pool.Query(ctx, `
		SELECT id, rule_id, asset_id, tag, code, title, status, severity, message, source, active_at, acknowledged_at, acknowledged_by, cleared_at, last_value, threshold, unit, metadata, updated_at
		FROM alarm_history ORDER BY active_at DESC NULLS LAST, updated_at DESC LIMIT $1`, limit)
	if err != nil {
		r.markError(err)
		return nil, err
	}
	defer rows.Close()
	var alarms []model.Alarm
	for rows.Next() {
		var alarm model.Alarm
		var metadata []byte
		if err := rows.Scan(&alarm.ID, &alarm.RuleID, &alarm.AssetID, &alarm.Tag, &alarm.Code, &alarm.Title, &alarm.Status, &alarm.Severity, &alarm.Message, &alarm.Source, &alarm.ActiveAt, &alarm.AcknowledgedAt, &alarm.AcknowledgedBy, &alarm.ClearedAt, &alarm.LastValue, &alarm.Threshold, &alarm.Unit, &metadata, &alarm.UpdatedAt); err != nil {
			r.markError(err)
			return nil, err
		}
		alarm.StartedAt = alarm.ActiveAt
		alarm.Value = alarm.LastValue
		_ = json.Unmarshal(metadata, &alarm.Metadata)
		alarms = append(alarms, alarm)
	}
	return alarms, rows.Err()
}

type telemetryRecord struct {
	Tag          string
	Name         string
	NumericValue *float64
	TextValue    *string
	Unit         string
	Quality      string
	Source       string
	Area         string
	AssetTag     string
	Metadata     map[string]string
}

func telemetryPoints(s model.TelemetrySnapshot) []telemetryRecord {
	return []telemetryRecord{
		num("SMR-POWER", "Reactor Power", s.ReactorPowerPct, "%", "unit-overview"),
		num("THERMAL-MW", "Thermal Power", s.ThermalPowerMW, "MW", "unit-overview"),
		num("ELECTRIC-MW", "Electric Power", s.ElectricPowerMW, "MW", "unit-overview"),
		num("TT-PRIMARY", "Primary Temperature", s.PrimaryTemperatureC, "C", "unit-overview"),
		num("TT-SECONDARY", "Secondary Temperature", s.SecondaryTemperatureC, "C", "unit-overview"),
		num("PT-PRIMARY", "Primary Pressure", s.PrimaryPressureMPa, "MPa", "unit-overview"),
		num("PT-SECONDARY", "Secondary Pressure", s.SecondaryPressureMPa, "MPa", "unit-overview"),
		num("FT-COOLANT", "Coolant Flow", s.CoolantFlowPct, "%", "unit-overview"),
		num("LT-SG", "Steam Generator Level", s.SteamGeneratorLevelPct, "%", "unit-overview"),
		num("TURBINE-RPM", "Turbine Speed", s.TurbineRPM, "rpm", "unit-overview"),
		num("GEN-LOAD", "Generator Load", s.GeneratorLoadPct, "%", "unit-overview"),
		num("COND-VAC", "Condenser Vacuum", s.CondenserVacuumKPa, "kPa", "unit-overview"),
		num("FW-FLOW", "Feedwater Flow", s.FeedwaterFlowPct, "%", "unit-overview"),
		num("VIBRATION", "Vibration", s.VibrationMMS, "mm/s", "unit-overview"),
		num("RAD-FIELD", "Synthetic Radiation Field", s.RadiationLevelUSvH, "uSv/h", "unit-overview"),
		num("AVAILABILITY", "Availability", s.AvailabilityPct, "%", "unit-overview"),
		num("EFFICIENCY", "Efficiency", s.EfficiencyPct, "%", "unit-overview"),
		text("SIM-MODE", "Simulation Mode", string(s.Mode), "system"),
		text("SIM-HEALTH", "Simulation Health", string(s.Health), "system"),
		num("TT-101", "Loop Temperature", s.LoopTemperatureC, "C", "thermal-process-loop"),
		num("PT-101", "Loop Pressure", s.LoopPressureMPa, "MPa", "thermal-process-loop"),
		num("FT-101", "Loop Flow", s.LoopFlowKGS, "kg/s", "thermal-process-loop"),
		num("LT-101", "Tank Level", s.TankLevelPct, "%", "thermal-process-loop"),
		num("V-101.POS", "Valve Position", s.ValvePositionPct, "%", "thermal-process-loop"),
		text("V-101.STATE", "Valve State", s.ValveState, "thermal-process-loop"),
		text("P-101.STATE", "Pump State", s.PumpState, "thermal-process-loop"),
		num("P-101.RPM", "Pump Speed", s.PumpRPM, "rpm", "thermal-process-loop"),
		text("HX-101.STATE", "Heat Exchanger State", s.HeatExchangerState, "thermal-process-loop"),
		text("TIC-101.MODE", "PID Controller Mode", s.PIDControllerMode, "thermal-process-loop"),
		num("TIC-101.SETPOINT", "PID Setpoint", s.PIDSetpointC, "C", "thermal-process-loop"),
		num("TIC-101.PV", "PID Process Value", s.PIDProcessValueC, "C", "thermal-process-loop"),
		num("TIC-101.ERROR", "PID Error", s.PIDErrorC, "C", "thermal-process-loop"),
		num("TIC-101.OUTPUT", "PID Output", s.PIDOutputPct, "%", "thermal-process-loop"),
		num("TIC-101.P_TERM", "PID P Term", s.PIDPTermPct, "%", "thermal-process-loop"),
		num("TIC-101.I_TERM", "PID I Term", s.PIDITermPct, "%", "thermal-process-loop"),
		num("TIC-101.D_TERM", "PID D Term", s.PIDDTermPct, "%", "thermal-process-loop"),
		text("TIC-101.STATUS", "PID Status", s.PIDStatus, "thermal-process-loop"),
	}
}

func num(tag, name string, value float64, unit, area string) telemetryRecord {
	v := value
	return telemetryRecord{Tag: tag, Name: name, NumericValue: &v, Unit: unit, Quality: "GOOD", Source: "simulation", Area: area, AssetTag: assetTag(tag), Metadata: map[string]string{"synthetic": "true"}}
}

func text(tag, name, value, area string) telemetryRecord {
	v := value
	return telemetryRecord{Tag: tag, Name: name, TextValue: &v, Quality: "GOOD", Source: "simulation", Area: area, AssetTag: assetTag(tag), Metadata: map[string]string{"synthetic": "true"}}
}

func assetTag(tag string) string {
	if idx := strings.Index(tag, "."); idx > 0 {
		return tag[:idx]
	}
	return tag
}

func applyTelemetryValue(s *model.TelemetrySnapshot, tag string, numeric *float64, text *string) {
	if numeric != nil && math.IsNaN(*numeric) {
		return
	}
	switch tag {
	case "SMR-POWER":
		s.ReactorPowerPct = value(numeric)
	case "THERMAL-MW":
		s.ThermalPowerMW = value(numeric)
	case "ELECTRIC-MW":
		s.ElectricPowerMW = value(numeric)
	case "TT-PRIMARY":
		s.PrimaryTemperatureC = value(numeric)
	case "TT-SECONDARY":
		s.SecondaryTemperatureC = value(numeric)
	case "PT-PRIMARY":
		s.PrimaryPressureMPa = value(numeric)
	case "PT-SECONDARY":
		s.SecondaryPressureMPa = value(numeric)
	case "FT-COOLANT":
		s.CoolantFlowPct = value(numeric)
	case "LT-SG":
		s.SteamGeneratorLevelPct = value(numeric)
	case "TURBINE-RPM":
		s.TurbineRPM = value(numeric)
	case "GEN-LOAD":
		s.GeneratorLoadPct = value(numeric)
	case "COND-VAC":
		s.CondenserVacuumKPa = value(numeric)
	case "FW-FLOW":
		s.FeedwaterFlowPct = value(numeric)
	case "VIBRATION":
		s.VibrationMMS = value(numeric)
	case "RAD-FIELD":
		s.RadiationLevelUSvH = value(numeric)
	case "AVAILABILITY":
		s.AvailabilityPct = value(numeric)
	case "EFFICIENCY":
		s.EfficiencyPct = value(numeric)
	case "SIM-MODE":
		s.Mode = model.Mode(textValue(text))
	case "SIM-HEALTH":
		s.Health = model.Health(textValue(text))
	case "TT-101":
		s.LoopTemperatureC = value(numeric)
	case "PT-101":
		s.LoopPressureMPa = value(numeric)
	case "FT-101":
		s.LoopFlowKGS = value(numeric)
	case "LT-101":
		s.TankLevelPct = value(numeric)
	case "V-101.POS":
		s.ValvePositionPct = value(numeric)
	case "V-101.STATE":
		s.ValveState = textValue(text)
	case "P-101.STATE":
		s.PumpState = textValue(text)
	case "P-101.RPM":
		s.PumpRPM = value(numeric)
	case "HX-101.STATE":
		s.HeatExchangerState = textValue(text)
	case "TIC-101.MODE":
		s.PIDControllerMode = textValue(text)
	case "TIC-101.SETPOINT":
		s.PIDSetpointC = value(numeric)
	case "TIC-101.PV":
		s.PIDProcessValueC = value(numeric)
	case "TIC-101.ERROR":
		s.PIDErrorC = value(numeric)
	case "TIC-101.OUTPUT":
		s.PIDOutputPct = value(numeric)
	case "TIC-101.P_TERM":
		s.PIDPTermPct = value(numeric)
	case "TIC-101.I_TERM":
		s.PIDITermPct = value(numeric)
	case "TIC-101.D_TERM":
		s.PIDDTermPct = value(numeric)
	case "TIC-101.STATUS":
		s.PIDStatus = textValue(text)
	}
}

func value(v *float64) float64 {
	if v == nil {
		return 0
	}
	return *v
}

func textValue(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}
