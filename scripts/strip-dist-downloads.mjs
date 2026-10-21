#!/usr/bin/env node
import { rmSync } from "node:fs";
import { join } from "node:path";
import { projectRoot } from "./source-hash.mjs";

rmSync(join(projectRoot(), "dist/downloads"), { recursive: true, force: true });
