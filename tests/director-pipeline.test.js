"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");

test("frontend and backend JavaScript parse", () => {
  assert.doesNotThrow(() => new Function(server));
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
  assert.ok(scripts.length > 0);
  scripts.forEach(script => assert.doesNotThrow(() => new Function(script)));
});

test("audio Master Plans use small batches and retry interrupted responses", () => {
  assert.match(html, /const BATCH_SHOTS = 8, AUDIO_BATCH_SHOTS = 4;/);
  assert.match(html, /limit=audio\?AUDIO_BATCH_SHOTS:BATCH_SHOTS/);
  assert.match(html, /\["invalid_json","server_error","network","overloaded"\]\.includes\(err\.code\)/);
  assert.match(html, /nouvelle tentative automatique/);
});

test("a failed optional realization continues from validated scenes", () => {
  assert.match(html, /function fallbackMasterFromScenes\(scenePlan,p,reason\)/);
  assert.match(html, /CONTINUED WITH FALLBACK/);
  assert.match(html, /poursuite automatique avec les scènes validées/);
  assert.match(html, /if\(err&&err\.code==="cancelled"\) throw err/);
});

test("manual lyrics create a locked character bible in any language", () => {
  assert.match(html, /function lyricsAnalysisPrompt\(text,kind\)/);
  assert.match(html, /ne corrige, ne traduis, ne reformule et ne complète AUCUN mot/);
  assert.match(html, /persos:lyrics\?lyrics\.characters\.map/);
  assert.match(html, /lyricsLocked:true/);
  assert.match(html, /Détection automatique · toute langue/);
  assert.match(html, /ou écris les paroles manuellement/);
});

test("Director V4 risk contract remains non-numeric before generation", () => {
  assert.match(html, /"risk_level":"LOW\|MEDIUM\|HIGH"/);
  assert.match(html, /Aucun score numérique avant inspection du média généré/);
  assert.match(html, /Tu es le VIDEO CRITIC/);
});

test("API keys remain server-side and server defaults to loopback", () => {
  const publicFiles = fs.readdirSync(path.join(root, "public"), {withFileTypes:true})
    .filter(entry => entry.isFile() && /\.(?:html|js|md)$/i.test(entry.name))
    .map(entry => fs.readFileSync(path.join(root, "public", entry.name), "utf8"));
  for(const text of publicFiles) assert.doesNotMatch(text, /AIza[0-9A-Za-z_-]{30,}|sk-[A-Za-z0-9_-]{20,}/);
  assert.match(server, /const HOST = process\.env\.HOST \|\| "127\.0\.0\.1"/);
  assert.match(server, /timingSafeEqual/);
});

test("automatic storyboard images use a protected server route and resumable plan state", () => {
  assert.match(server, /async function handleImageGenerate\(req,res\)/);
  assert.match(server, /GEMINI_IMAGE_MODEL\|\|"gemini-3\.1-flash-image"/);
  assert.match(server, /req\.url\.startsWith\("\/api\/images\/generate"\)/);
  assert.match(server, /\.slice\(0,4\)/);
  assert.match(html, /async function generateBoardImages\(onlyMissing,oneIndex\)/);
  assert.match(html, /generated_images/);
  assert.match(html, /Reprendre les manquantes/);
});
