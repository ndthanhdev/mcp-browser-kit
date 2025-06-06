package main

import (
	"context"
	"dagger/runner/internal/dagger"
	"fmt"
)

type Con struct {
	*dagger.Container
}

func (c *Con) SetEnvs(ctx context.Context, m *Runner) *Con {
	c.Container = c.Container.
		WithEnvVariable("MODE", m.Mode)

	return c
}

func (c *Con) WithAction(action string) *Con {
	c.Container = c.
		Container.
		WithExec([]string{"bash", "-l", "-c", fmt.Sprintf("./etc/scripts/actions/%s.ts", action)})
	return c
}
