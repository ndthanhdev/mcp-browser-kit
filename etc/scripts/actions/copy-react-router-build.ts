#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import fse from "fs-extra";
import { getProjectRoot } from "../utils/get-envs";

const projectRoot = getProjectRoot();

await fse.emptyDir(`${projectRoot}/target/react-router/build/`);
await fse.copy(
	`${projectRoot}/build/`,
	`${projectRoot}/target/react-router/build/`,
);
