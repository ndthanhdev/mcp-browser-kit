// A generated module for Runner functions
//
// This module has been generated via dagger init and serves as a reference to
// basic module structure as you get started with Dagger.
//
// Two functions have been pre-created. You can modify, delete, or add to them,
// as needed. They demonstrate usage of arguments and return types using simple
// echo and grep commands. The functions can be called from the dagger CLI or
// from one of the SDKs.
//
// The first line in this comment block is a short description line and the
// rest is a long description with more detail on the module's purpose or usage,
// if appropriate. All modules should have a short description.

package main

import (
	"context"
	"dagger/runner/internal/dagger"
)

type Runner struct {
	Dir  *dagger.Directory
	Mode string
}

func New(
	// +required
	// +ignore=["node_modules/", ".moon/cache/", "app/public/", "etc/runner/"]
	dir *dagger.Directory,
	// +optional
	// +default="dev"
	mode string,
) *Runner {
	return &Runner{
		Dir:  dir,
		Mode: mode,
	}
}

func (m *Runner) BuildBaseEnv(ctx context.Context) *dagger.Container {
	return dag.
		Container().
		From("ubuntu:plucky").
		// apt-get update && apt-get install -y curl git unzip gzip xz-utils
		WithExec([]string{"apt-get", "update"}).
		WithExec([]string{"apt-get", "install", "-y", "build-essential", "curl", "git", "unzip", "bash", "gzip", "xz-utils"}).
		// curl -fsSL https://moonrepo.dev/install/proto.sh | bash -s 0.35.3 --yes
		WithExec([]string{"bash", "-l", "-c", "curl -fsSL https://moonrepo.dev/install/proto.sh | bash -s 0.49.4 --yes"}).
		WithWorkdir("/mnt").
		WithFile("/mnt/.prototools", m.Dir.File(".prototools")).
		WithEnvVariable("PROTO_HOME", "/root/.proto").
		WithEnvVariable("PATH", "$PATH:$PROTO_HOME/shims:$PROTO_HOME/bin", dagger.ContainerWithEnvVariableOpts{
			Expand: true,
		}).
		// proto use
		WithExec([]string{"bash", "-l", "-c", "proto use"}).
		// rm .prototools
		WithoutFile("/mnt/.prototools")
	// use docker scaffold to optimize build time
}

func (m *Runner) BuildEnv(ctx context.Context) *Con {
	source := dag.Directory().WithDirectory("/", m.Dir, dagger.DirectoryWithDirectoryOpts{
		Exclude: []string{"node_modules", ".cache", ".moon/cache"},
	})

	con := m.BuildBaseEnv(ctx).
		WithMountedDirectory("/mnt", source).
		// moon setup
		WithExec([]string{"bash", "-l", "-c", "moon setup"}).
		// yarn install --immutable
		WithExec([]string{"bash", "-l", "-c", "yarn install --immutable"})

	return (&Con{con}).SetEnvs(ctx, m)
}

func (m *Runner) WithAction(ctx context.Context, command string) *dagger.Container {
	return m.
		BuildEnv(ctx).
		WithAction(command).
		Container
}

func (m *Runner) Test(ctx context.Context) (string, error) {
	return m.
		WithAction(ctx, "test").
		Stdout(ctx)
}

func (m *Runner) Build(ctx context.Context) *dagger.Directory {
	return m.
		WithAction(ctx, "build").
		Directory("/mnt/apps/app/public")
}

func (m *Runner) Publish(ctx context.Context) (string, error) {
	return m.
		WithAction(ctx, "publish").
		Stdout(ctx)
}
