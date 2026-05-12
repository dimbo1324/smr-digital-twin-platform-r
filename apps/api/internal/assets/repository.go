package assets

import "context"

type Repository interface {
	List(ctx context.Context) ([]Asset, error)
}
