#!/usr/bin/env -S yarn dlx tsx
import "zx/globals";
import { runPromptEvals } from "../utils/prompt-evals";

$.verbose = true;

await runPromptEvals();
