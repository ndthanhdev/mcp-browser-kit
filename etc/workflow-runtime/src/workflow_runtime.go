package main

import (
	"context"
	"dagger/workflow_runtime/internal/dagger"
	"fmt"
)

type WorkflowRuntime struct {
	Dir *dagger.Directory
	Con *dagger.Container
}

// Setup Proto
func (m *WorkflowRuntime) BuildBaseEnv(ctx context.Context) *WorkflowRuntime {
	m.Con = dag.
		Container().
		From("ubuntu:plucky").
		// apt-get update && apt-get install -y curl git unzip gzip xz-utils
		WithExec([]string{"apt-get", "update"}).
		WithExec([]string{"apt-get", "install", "-y", "build-essential", "curl", "git", "unzip", "bash", "gzip", "xz-utils", "pkg-config", "libssl-dev"}).
		// curl -fsSL https://moonrepo.dev/install/proto.sh | bash -s 0.35.3 --yes
		WithExec([]string{"bash", "-l", "-c", "curl -fsSL https://moonrepo.dev/install/proto.sh | bash -s 0.51.4 --yes"}).
		WithEnvVariable("PROTO_HOME", "/root/.proto", dagger.ContainerWithEnvVariableOpts{Expand: true}).
		WithEnvVariable("PATH", "$PATH:$PROTO_HOME/shims:$PROTO_HOME/bin", dagger.ContainerWithEnvVariableOpts{Expand: true})

	return m
}

func (m *WorkflowRuntime) BuildEnv(ctx context.Context) *WorkflowRuntime {
	source := dag.Directory().WithDirectory("/", m.Dir, dagger.DirectoryWithDirectoryOpts{
		Exclude: []string{"node_modules", ".cache", ".moon/cache"},
	})

	m.Con = m.BuildBaseEnv(ctx).
		Con.
		WithWorkdir("/workspace").
		WithFile("/workspace/.prototools", m.Dir.File(".prototools")).
		// proto use
		WithExec([]string{"proto", "use"}).
		// rm .prototools
		WithoutFile("/workspace/.prototools").
		WithMountedDirectory("/workspace", source).
		// moon setup
		WithExec([]string{"moon", "setup"}).
		// yarn install --immutable
		WithExec([]string{"yarn", "install", "--immutable"})

	return m
}

func (m *WorkflowRuntime) WithAction(ctx context.Context, action string) *WorkflowRuntime {
	m.Con = m.Con.WithExec([]string{"bash", "-l", "-c", fmt.Sprintf("./etc/scripts/actions/%s.ts", action)})

	return m
}

func (m *WorkflowRuntime) Container(ctx context.Context) *dagger.Container {
	return m.Con
}

func (m *WorkflowRuntime) Stdout(ctx context.Context) (string, error) {
	stdout, err := m.Con.Stdout(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get stdout: %w", err)
	}
	return stdout, nil
}

func (m *WorkflowRuntime) WithEnvVariable(name, value string) *WorkflowRuntime {
	m.Con = m.Con.WithEnvVariable(name, value)

	return m
}

func (m *WorkflowRuntime) WithSecretVariable(name string, secret *dagger.Secret) *WorkflowRuntime {
	m.Con = m.Con.WithSecretVariable(name, secret)

	return m
}
