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

test("full-video analysis streams the original media and waits for Gemini ACTIVE state", () => {
  assert.match(server, /async function handleVideoAnalyze\(req,res\)/);
  assert.match(server, /req\.url\.startsWith\("\/api\/video\/analyze"\)/);
  assert.match(server, /"X-Goog-Upload-Protocol":"resumable"/);
  assert.match(server, /"X-Goog-Upload-Command":"upload, finalize"/);
  assert.match(server, /body:req,duplex:"half"/);
  assert.match(server, /const state=String\(file\.state\|\|""\)\.toUpperCase\(\); if\(state==="ACTIVE"\) break/);
  assert.match(server, /if\(!state\.includes\("ACTIVE"\)\|\|!file\.uri\)/);
  assert.match(server, /type:"video",uri:file\.uri,mime_type:file\.mimeType\|\|mime,processing/);
  assert.match(server, /flux visuel ET le flux audio/);
  assert.match(server, /Transcris les paroles mot pour mot dans leur langue/);
  assert.match(server, /camera_movement/);
});

test("remake frontend prefers full-video analysis and retains a frame fallback", () => {
  assert.match(html, /function normalizeFullVideo\(x,durHint\)/);
  assert.match(html, /async function analyzeFullVideo\(signal\)/);
  assert.match(html, /fetch\("\/api\/video\/analyze"[\s\S]{0,500}body:RM\.file,signal/);
  assert.match(html, /if\(!RM\.full&&!RM\.caps\)[\s\S]{0,180}await analyzeFullVideo\(rmctl\.signal\)/);
  assert.match(html, /Analyse compl[^\n]{0,120}images cl[^\n]{0,80}prennent automatiquement le relais/);
  assert.match(html, /if\(!RM\.desc\) RM\.desc = await describeFrames\(rmctl\.signal\)/);
  assert.match(html, /AbortError[\s\S]{0,100}cancelled|cancelled[\s\S]{0,100}AbortError/);
});

test("manual remake speech remains available in any language and is locked for generation", () => {
  assert.match(html, /<textarea id="rm-text"/);
  assert.match(html, /textDirty:false/);
  assert.match(html, /function rmReadText\([^)]*\)[\s\S]{0,180}RM\.plain=c\.length\?"":t\.trim\(\)/);
  assert.match(html, /RM\.textDirty=true/);
  assert.match(html, /if\((?:!RM\.textDirty&&x\.transcript\.length|x\.transcript\.length&&!RM\.textDirty)\)/);
  assert.match(html, /const fullTxt = RM\.cues&&RM\.cues\.length \? RM\.cues\.map\(c=>c\.text\)\.join\(" "\) : RM\.plain/);
  assert.match(html, /PAROLES EXACTES[\s\S]{0,160}langue verrouill/);
});

test("analyzed shots are split to the selected generator duration instead of producing oversized plans", () => {
  assert.match(html, /function splitFullVideoShots\(/);
  const start = html.indexOf("function rmTimeline(){");
  const end = html.indexOf("function rmRefresh(){", start);
  assert.ok(start >= 0 && end > start, "rmTimeline must remain extractable");
  const source = html.slice(start, end);
  assert.doesNotMatch(source, /while\(parts\.length>MAX_PLANS\)/, "the 90-plan limiter must have a bounded/non-stalling guard");
  const makeTimeline = new Function(
    "RM", "PLAN_SEC", "$", "fmtT", "clip", "cuesFromText", "cuesInRange", "cuesTextInRange", "MAX_PLANS",
    `${source}; return {rmTimeline,splitFullVideoShots};`
  );
  const state = {
    dur: 24,
    full: {
      transcript: [{t0:0,t1:24,text:"texte"}],
      shots: [{
        shot_id:"P01", scene_id:"S01", t0:0, t1:24,
        description:"Un plan continu", camera_movement:"travelling"
      }]
    },
    cues: null,
    plain: "",
    an: null,
    scenes: [],
    desc: null,
    stretch: 1
  };
  const helpers = makeTimeline(
    state,
    {veo:8},
    () => ({value:"veo"}),
    value => String(value),
    value => String(value),
    () => [],
    () => "",
    cues => cues.map(c => c.text).join(" "),
    90
  );
  const timeline = helpers.rmTimeline();
  assert.ok(timeline.length >= 3, "a 24-second analyzed shot must become at least three Veo plans");
  assert.ok(timeline.every(plan => plan.t1 - plan.t0 <= 8.01), "no generated plan may exceed the Veo duration");
  assert.equal(timeline[0].t0, 0);
  assert.equal(timeline.at(-1).t1, 24);
  const clipped = helpers.splitFullVideoShots([{t0:24,t1:40,description:"hors durée"}], 8, 24);
  assert.ok(clipped.every(plan => plan.t0 >= 0 && plan.t1 <= 24), "shot segments must stay inside the video duration");
});

test("multimodal report, characters, defects and timestamped shots reach Director V4", () => {
  assert.match(html, /persos:RM\.full&&src!=="autre"\?RM\.full\.characters:\[\]/);
  assert.match(html, /fullVideoAnalysis:RM\.full\|\|null/);
  assert.match(html, /timeline:tl/);
  assert.match(html, /p\.fullVideoAnalysis\?`ANALYSE MULTIMODALE DE LA VID/);
  assert.match(html, /overview:p\.fullVideoAnalysis\.overview/);
  assert.match(html, /characters:p\.fullVideoAnalysis\.characters/);
  assert.match(html, /locations:p\.fullVideoAnalysis\.locations/);
  assert.match(html, /scenes:p\.fullVideoAnalysis\.scenes/);
  assert.match(html, /reconstruction:p\.fullVideoAnalysis\.reconstruction/);
  assert.match(html, /RM\.full\.defects\.slice\(0,30\)/);
  assert.match(html, /original_shot:s/);
});
