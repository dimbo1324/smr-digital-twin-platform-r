package postgres

// Config is a placeholder for the future PostgreSQL connection settings.
// The MVP backend skeleton intentionally does not open database connections yet.
type Config struct {
	DSN string
}

func NewConfig(dsn string) Config {
	return Config{DSN: dsn}
}
