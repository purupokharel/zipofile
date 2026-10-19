#!/usr/bin/env node
// Verifies a Tauri updater signature (minisign, Ed25519) against the public key in
// src-tauri/tauri.conf.json, the same check the installed app does before updating.
//   node scripts/verify-updater-sig.mjs <file> [<file>.sig]
import { createHash, createPublicKey, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { projectRoot } from "./source-hash.mjs";

const b64lines = (b64) => Buffer.from(b64.trim(), "base64").toString("utf8").split("\n");

export function verifyUpdaterSignature(fileBytes, sigB64, pubkeyB64) {
  const [, pkLine] = b64lines(pubkeyB64);
  const pk = Buffer.from(pkLine.trim(), "base64"); // "Ed" + keyid(8) + key(32)
  const lines = b64lines(sigB64);
  const sig = Buffer.from(lines[1].trim(), "base64"); // alg(2) + keyid(8) + sig(64)
  const trusted = lines[2].replace(/^trusted comment: /, "");
  const globalSig = Buffer.from(lines[3].trim(), "base64");
  if (pk.subarray(2, 10).compare(sig.subarray(2, 10)) !== 0) return { ok: false, reason: "key id mismatch" };
  const key = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), pk.subarray(10, 42)]), format: "der", type: "spki" });
  const alg = sig.subarray(0, 2).toString("latin1");
  const msg = alg === "ED" ? createHash("blake2b512").update(fileBytes).digest() : fileBytes;
  if (!verify(null, msg, key, sig.subarray(10, 74))) return { ok: false, reason: "file signature invalid" };
  if (!verify(null, Buffer.concat([sig.subarray(10, 74), Buffer.from(trusted, "utf8")]), key, globalSig)) return { ok: false, reason: "trusted comment signature invalid" };
  return { ok: true, reason: `valid (${alg}, ${trusted})` };
}

if (process.argv[1]?.endsWith("verify-updater-sig.mjs")) {
  const [file, sigFile = `${process.argv[2]}.sig`] = process.argv.slice(2);
  const conf = JSON.parse(readFileSync(join(projectRoot(), "src-tauri/tauri.conf.json"), "utf8"));
  const r = verifyUpdaterSignature(readFileSync(file), readFileSync(sigFile, "utf8"), conf.plugins.updater.pubkey);
  console.log(`${file}: ${r.reason}`);
  process.exit(r.ok ? 0 : 1);
}
