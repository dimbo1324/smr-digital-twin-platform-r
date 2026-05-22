package postgres

// Config is reserved for API-side PostgreSQL connection settings if the gateway
// later needs direct storage access.
// The MVP backend skeleton intentionally does not open database connections yet.
type Config struct {
	DSN string
}

func NewConfig(dsn string) Config {
	return Config{DSN: dsn}
}
