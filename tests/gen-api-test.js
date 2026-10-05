// Fabrication (generation.js) avec de FAUX services Google, Runway et ElevenLabs : aucun appel réel, aucun argent dépensé.
// Vérifie : voix gratuite avec la clé principale, Veo avec la clé du projet payant, budget du jour, erreurs de facturation,
// Runway, ElevenLabs, lecture des fichiers par morceaux (Range), sécurité des chemins, reprise après redémarrage.
const http = require("http"), fs = require("fs"), path = require("path");
const createGeneration = require("../generation.js");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const DIR = path.join(require("./env").OUT, "gen-data");
fs.rmSync(DIR, {recursive: true, force: true});
const listen = srv => new Promise(r => srv.listen(0, "127.0.0.1", () => r(srv.address().port)));
const body = req => new Promise(r => { const c = []; req.on("data", x => c.push(x)); req.on("end", () => r(Buffer.concat(c).toString("utf8"))); });
const json = (res, code, o) => { res.writeHead(code, {"Content-Type": "application/json"}); res.end(JSON.stringify(o)); };

/* ---------- faux services ---------- */
const seen = {keys: [], runway: [], eleven: [], polls: {}, ttsActive: 0, ttsMax: 0}; let FAKE = "", veoBilling = false, ttsMode = "ok";
const fake = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x"), b = req.method === "POST" ? await body(req) : "";
  if(u.pathname === "/v1beta/interactions"){ const o = JSON.parse(b); seen.keys.push(["tts", req.headers["x-goog-api-key"], o.generation_config && o.generation_config.speech_config[0].voice]);
    if(ttsMode === "day") return json(res, 429, {error: {code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for metric: generate_content_free_tier_requests, limit: 15", details: [{"@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]}});
    if(ttsMode === "minute-once"){ ttsMode = "ok"; return json(res, 429, {error: {code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded", details: [{"@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier"}]}, {"@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "3s"}]}}); }
    seen.ttsActive++; seen.ttsMax = Math.max(seen.ttsMax, seen.ttsActive); await new Promise(r => setTimeout(r, 80)); seen.ttsActive--;
    return json(res, 200, {steps: [{type: "thought"}, {type: "model_output", content: [{type: "audio", data: Buffer.alloc(48000).toString("base64")}]}]}); }   // 1 s de PCM 24 kHz
  let m = u.pathname.match(/^\/v1beta\/models\/([^:]+):predictLongRunning$/);
  if(m){ seen.keys.push(["veo", req.headers["x-goog-api-key"], m[1]]); const o = JSON.parse(b);
    if(veoBilling) return json(res, 429, {error: {code: 429, status: "RESOURCE_EXHAUSTED", message: "Quota exceeded for metric: generate_requests_per_model, limit: 0 (free_tier)"}});
    const id = "op" + seen.keys.length; seen.polls[id] = 0; seen.lastVeo = o; return json(res, 200, {name: `models/${m[1]}/operations/${id}`}); }
  m = u.pathname.match(/\/operations\/(op\d+)$/);
  if(m){ seen.keys.push(["poll", req.headers["x-goog-api-key"]]); if(++seen.polls[m[1]] < 2) return json(res, 200, {name: m[1], done: false});
    return json(res, 200, {name: m[1], done: true, response: {generateVideoResponse: {generatedSamples: [{video: {uri: `${FAKE}/v1beta/files/${m[1]}:download?alt=media`}}]}}}); }
  if(u.pathname.startsWith("/v1beta/files/")){ seen.keys.push(["dl", req.headers["x-goog-api-key"]]); res.writeHead(200, {"Content-Type": "video/mp4"}); return res.end(Buffer.alloc(5000, 7)); }
  if(u.pathname === "/v1/text_to_video" || u.pathname === "/v1/image_to_video"){ seen.runway.push([u.pathname, req.headers.authorization, req.headers["x-runway-version"], JSON.parse(b)]); return json(res, 200, {id: "t1"}); }
  if(u.pathname === "/v1/tasks/t1"){ seen.polls.t1 = (seen.polls.t1 || 0) + 1; return json(res, 200, seen.polls.t1 < 2 ? {id: "t1", status: "RUNNING", progress: 0.5} : {id: "t1", status: "SUCCEEDED", output: [`${FAKE}/rw/out.mp4`]}); }
  if(u.pathname === "/rw/out.mp4"){ res.writeHead(200, {"Content-Type": "video/mp4"}); return res.end(Buffer.alloc(4000, 3)); }
  m = u.pathname.match(/^\/v1\/text-to-speech\/(.+)$/);
  if(m){ seen.eleven.push([m[1], req.headers["xi-api-key"], JSON.parse(b)]); res.writeHead(200, {"Content-Type": "audio/mpeg"}); return res.end(Buffer.alloc(3200, 1)); }
  if(u.pathname === "/v2/voices") return json(res, 200, {voices: [{voice_id: "v-awa", name: "Awa", labels: {gender: "female", accent: "african"}, preview_url: ""}]});
  json(res, 404, {error: {message: "inconnu " + u.pathname}});
});

/* ---------- Studio Prompt réduit à la fabrication ---------- */
const sendJson = (res, s, o) => { res.writeHead(s, {"Content-Type": "application/json; charset=utf-8"}); res.end(JSON.stringify(o)); };
const readBody = (req, limit) => new Promise((ok, ko) => { let n = 0; const c = []; req.on("data", x => { n += x.length; if(n > limit){ ko(new Error("too_large")); req.destroy(); } else c.push(x); }); req.on("end", () => ok(Buffer.concat(c).toString("utf8"))); });
function studio(env){ const gen = createGeneration({dir: DIR, env, sendJson, readBody}); return {gen, srv: http.createServer((req, res) => { if(!gen.handle(req, res)){ res.writeHead(404); res.end(); } })}; }
const get = (port, p, headers) => new Promise((r, j) => http.get({host: "127.0.0.1", port, path: p, headers: headers || {}}, res => { const c = []; res.on("data", x => c.push(x)); res.on("end", () => r({status: res.statusCode, headers: res.headers, buf: Buffer.concat(c)})); }).on("error", j));
const getJ = async (port, p) => JSON.parse((await get(port, p)).buf.toString("utf8"));
const postJ = (port, p, o) => new Promise((r, j) => { const d = JSON.stringify(o), q = http.request({host: "127.0.0.1", port, path: p, method: "POST", headers: {"Content-Type": "application/json", "Content-Length": Buffer.byteLength(d)}}, res => { const c = []; res.on("data", x => c.push(x)); res.on("end", () => r({status: res.statusCode, body: JSON.parse(Buffer.concat(c).toString("utf8") || "{}")})); }); q.on("error", j); q.end(d); });
async function waitJob(port, id){ for(let k = 0; k < 150; k++){ const j = (await getJ(port, `/api/gen/jobs?ids=${id}`)).jobs[0]; if(j && /done|failed/.test(j.status)) return j; await new Promise(r => setTimeout(r, 60)); } return null; }
const PNG = "data:image/png;base64," + Buffer.alloc(300, 9).toString("base64");

(async () => {
  const fp = await listen(fake); FAKE = `http://127.0.0.1:${fp}`;
  const ENV = {GEMINI_API_KEY: "cle-gratuite", GEMINI_MEDIA_API_KEY: "cle-payante", GEMINI_BASE_URL: FAKE + "/v1beta", RUNWAY_API_KEY: "cle-runway", RUNWAY_BASE_URL: FAKE + "/v1", ELEVENLABS_API_KEY: "cle-eleven", ELEVENLABS_BASE_URL: FAKE, GEN_POLL_MS: "40", GEN_BUDGET_USD: "2", GEN_RETRY_MS: "60"};
  let {srv} = studio(ENV); const port = await listen(srv);

  const st = await getJ(port, "/api/gen/status");
  check("état : voix Gemini gratuite prête, Veo prêt avec la clé du projet payant, budget 2 $", st.voice[0].ready && st.voice[0].free && st.video[1].ready && st.video[1].needs === "" && st.budget.limit === 2 && st.media_key === true, JSON.stringify({veo: st.video[1], budget: st.budget}));
  check("aucune clé dans l'état renvoyé à la page", !/cle-/.test(JSON.stringify(st)));
  const vg = await getJ(port, "/api/gen/voices?provider=gemini"), ve = await getJ(port, "/api/gen/voices?provider=elevenlabs");
  check("30 voix Gemini (avec genre) et voix ElevenLabs du compte", vg.voices.length === 30 && /femme|homme/.test(vg.voices[0].desc) && ve.voices[0].id === "v-awa", `${vg.voices.length} · ${ve.voices.map(v => v.name)}`);

  // 1. voix gratuite
  let r = await postJ(port, "/api/gen/start", {kind: "voice", service: "gemini", project: "proj1", plan: 3, text: "Tu savais depuis quand ?", voice: "Charon", style: "cold, quiet", who: "fils", line: 0});
  let j = r.status === 200 && await waitJob(port, r.body.job.id);
  const wav = j && j.url ? (await get(port, j.url)).buf : Buffer.alloc(0);
  check("voix Gemini : fichier WAV valide, durée calculée, coût 0", j && j.status === "done" && wav.slice(0, 4).toString() === "RIFF" && j.seconds === 1 && j.estimate === 0, j ? `${j.status} ${j.url} ${j.seconds} s ${j.error || ""}` : r.body.message);
  check("voix : clé GRATUITE utilisée, voix demandée transmise", seen.keys.some(k => k[0] === "tts" && k[1] === "cle-gratuite" && k[2] === "Charon") && !seen.keys.some(k => k[0] === "tts" && k[1] === "cle-payante"));

  // 1 bis. offre gratuite des voix : une à la fois, attente si limite par minute, message clair si limite du jour
  ttsMode = "minute-once";
  const vj = [];
  for(let k = 0; k < 3; k++){ const x = await postJ(port, "/api/gen/start", {kind: "voice", service: "gemini", project: "proj1", plan: 10 + k, text: "Phrase " + k, voice: "Kore"}); vj.push(x.body.job.id); }
  const vdone = []; for(const id of vj) vdone.push(await waitJob(port, id));
  check("voix : une seule demande à la fois chez Google", seen.ttsMax === 1, `max simultané ${seen.ttsMax}`);
  check("limite par minute : attente puis réussite automatique (aucune voix perdue)", vdone.every(x => x && x.status === "done"), vdone.map(x => x && x.status).join(","));
  ttsMode = "day";
  r = await postJ(port, "/api/gen/start", {kind: "voice", service: "gemini", project: "proj1", plan: 20, text: "Encore une", voice: "Kore"});
  j = await waitJob(port, r.body.job.id); ttsMode = "ok";
  check("limite du jour : échec clair (demain matin ou ElevenLabs)", j && j.code === "quota_day" && /demain/.test(j.error), j ? `${j.code} · ${j.error}` : "");
  // 1 ter. import direct d'une image (Gemini) et d'un clip (Flow)
  const raw = (pth, type, bytes, h) => new Promise((ok, ko) => { const q = http.request({host: "127.0.0.1", port, path: pth, method: "POST", headers: Object.assign({"Content-Type": type, "Content-Length": bytes.length}, h || {})}, res => { const c = []; res.on("data", x => c.push(x)); res.on("end", () => ok({status: res.statusCode, body: JSON.parse(Buffer.concat(c).toString("utf8") || "{}")})); }); q.on("error", ko); q.end(bytes); });
  const im = await raw("/api/gen/upload-file", "image/jpeg", Buffer.alloc(2000, 4), {"X-Project": "proj1", "X-Base": "P02-depart"});
  const cl = await raw("/api/gen/upload-file", "video/mp4", Buffer.alloc(9000, 6), {"X-Project": "proj1", "X-Base": "P02-clip"});
  const back = cl.body.url ? await get(port, cl.body.url) : {buf: Buffer.alloc(0), headers: {}};
  check("import d'une image et d'un clip : enregistrés dans le projet, relisibles", im.status === 200 && /^\/generated\/proj1\/P02-depart-.+\.jpg$/.test(im.body.url) && cl.status === 200 && back.buf.length === 9000 && /video\/mp4/.test(back.headers["content-type"]), `${im.body.url} · ${cl.body.url}`);
  const bad1 = await raw("/api/gen/upload-file", "application/x-msdownload", Buffer.alloc(10), {"X-Project": "proj1"});
  check("fichier qui n'est ni image, ni vidéo, ni son → refusé", bad1.status === 415, String(bad1.status));

  // 2. Veo depuis une image de départ
  r = await postJ(port, "/api/gen/start", {kind: "video", service: "veo-fast", project: "proj1", plan: 3, prompt: "Animate the attached image as the first frame of the shot. Camera: locked camera.", image: PNG, ratio: "9:16", seconds: 7});
  j = r.status === 200 && await waitJob(port, r.body.job.id);
  const vid = j && j.url ? await get(port, j.url) : {buf: Buffer.alloc(0), headers: {}};
  check("Veo : vidéo reçue et enregistrée (mp4), 8 s, ≈ 0,80 $", j && j.status === "done" && vid.buf.length === 5000 && /video\/mp4/.test(vid.headers["content-type"]) && j.duration === 8 && j.estimate === 0.8, j ? `${j.status} ${j.error || ""} ${j.estimate} $` : JSON.stringify(r.body));
  check("Veo : clé PAYANTE pour l'envoi, l'attente et le téléchargement", ["veo", "poll", "dl"].every(t => seen.keys.filter(k => k[0] === t).every(k => k[1] === "cle-payante")) && seen.keys.some(k => k[0] === "veo"));
  check("Veo : image de départ envoyée, format 9:16, personnes adultes autorisées (image)", !!(seen.lastVeo && seen.lastVeo.instances[0].image && seen.lastVeo.instances[0].image.inlineData.data && seen.lastVeo.parameters.aspectRatio === "9:16" && seen.lastVeo.parameters.personGeneration === "allow_adult"));
  const part = j && j.url ? await get(port, j.url, {Range: "bytes=100-199"}) : {};
  check("lecture par morceaux (Range) pour avancer dans la vidéo", part.status === 206 && part.buf.length === 100 && /bytes 100-199\/5000/.test(part.headers["content-range"] || ""), `${part.status} ${part.headers && part.headers["content-range"]}`);

  // 3. budget du jour
  r = await postJ(port, "/api/gen/start", {kind: "video", service: "veo", project: "proj1", plan: 4, prompt: "A wide shot of a market at noon, locked camera.", seconds: 8});
  check("budget dépassé (3,20 $ demandés, 1,20 $ restants) → refus clair, rien d'envoyé", r.status === 402 && r.body.code === "budget" && /Budget du jour/.test(r.body.message), r.body.message);

  // 4. facturation non activée → échec expliqué et argent rendu au budget
  veoBilling = true;
  const before = (await getJ(port, "/api/gen/status")).budget.spent;
  r = await postJ(port, "/api/gen/start", {kind: "video", service: "veo-lite", project: "proj1", plan: 5, prompt: "A close-up of hands pouring tea, locked camera.", seconds: 4});
  j = r.status === 200 && await waitJob(port, r.body.job.id);
  const st2 = await getJ(port, "/api/gen/status");
  check("facturation Google absente → message clair, budget rendu, état « facturation à activer »", j && j.code === "billing" && /facturation/.test(j.error) && st2.budget.spent === before && st2.video[0].needs === "billing", j ? `${j.code} · ${j.error} · ${st2.budget.spent} $` : "");
  veoBilling = false;

  // 5. Runway et ElevenLabs
  r = await postJ(port, "/api/gen/start", {kind: "video", service: "runway", project: "proj1", plan: 6, prompt: "A man walks into the courtyard, locked camera.", ratio: "16:9", seconds: 4});
  j = r.status === 200 && await waitJob(port, r.body.job.id);
  const rw = seen.runway[0] || [];
  check("Runway : vidéo directe 5 s, format 1280:720, en-têtes officiels", j && j.status === "done" && rw[0] === "/v1/text_to_video" && rw[1] === "Bearer cle-runway" && rw[2] === "2024-11-06" && rw[3].duration === 5 && rw[3].ratio === "1280:720", j ? `${j.status} ${j.error || ""} ${JSON.stringify(rw[3])}` : JSON.stringify(r.body));
  r = await postJ(port, "/api/gen/start", {kind: "voice", service: "elevenlabs", project: "proj1", plan: 6, text: "Bonjour.", voice: "v-awa"});
  j = r.status === 200 && await waitJob(port, r.body.job.id);
  check("ElevenLabs : voix mp3 enregistrée avec la voix choisie", j && j.status === "done" && /\.mp3$/.test(j.url) && seen.eleven[0][0] === "v-awa" && seen.eleven[0][1] === "cle-eleven", j ? `${j.status} ${j.error || ""}` : "");

  // 6. sécurité des chemins
  const bad = await Promise.all(["/generated/../server.js", "/generated/proj1/..%2F..%2Fserver.js", "/generated/jobs.json", "/generated/state.json", "/generated/proj1/.hidden"].map(p => get(port, p)));
  check("aucun fichier hors des médias fabriqués n'est lisible", bad.every(x => x.status === 404), bad.map(x => x.status).join(","));
  r = await postJ(port, "/api/gen/start", {kind: "video", service: "veo-fast", project: "proj1", plan: 7, prompt: "Animate the attached image.", image: "/generated/proj1/introuvable.png"});
  check("image de départ introuvable → refus clair (pas de vidéo payée par erreur)", r.status === 400 && /introuvable/.test(r.body.message), r.body.message);

  // 7. reprise après redémarrage : une vidéo déjà commandée est attendue, jamais recommandée
  await new Promise(x => srv.close(x)); await new Promise(x => setTimeout(x, 300));
  const jobsFile = path.join(DIR, "jobs.json"), saved = JSON.parse(fs.readFileSync(jobsFile, "utf8"));
  seen.polls.op999 = 0; const nVeo = seen.keys.filter(k => k[0] === "veo").length;
  saved.push({id: "jreprise", kind: "video", service: "veo-fast", project: "proj1", plan: 9, prompt: "x", status: "running", remote: {op: "models/veo-3.1-fast-generate-preview/operations/op999"}, created: Date.now(), updated: Date.now(), estimate: 0.8});
  fs.writeFileSync(jobsFile, JSON.stringify(saved));
  ({srv} = studio(ENV)); const port2 = await listen(srv);
  j = await waitJob(port2, "jreprise");
  check("après redémarrage : l'historique est gardé et la vidéo en cours est récupérée sans nouvel envoi", j && j.status === "done" && (await getJ(port2, "/api/gen/jobs?project=proj1")).jobs.length >= 10 && seen.keys.filter(k => k[0] === "veo").length === nVeo, j ? `${j.status} ${j.error || ""}` : "aucune reprise");

  // 8. sans clé payante : Veo demande la facturation, les voix restent gratuites
  await new Promise(x => srv.close(x));
  fs.rmSync(DIR, {recursive: true, force: true});
  ({srv} = studio({GEMINI_API_KEY: "cle-gratuite", GEMINI_BASE_URL: FAKE + "/v1beta"})); const port3 = await listen(srv);
  const st3 = await getJ(port3, "/api/gen/status");
  check("seulement la clé gratuite : voix prêtes, Veo et images marqués « facturation », Runway et ElevenLabs « clé »", st3.voice[0].ready && st3.video[0].needs === "billing" && st3.image.needs === "billing" && st3.video[3].needs === "key" && !st3.voice[1].ready && st3.media_key === false, JSON.stringify({veo: st3.video[0].needs, img: st3.image.needs, rw: st3.video[3].needs}));
  r = await postJ(port3, "/api/gen/start", {kind: "voice", service: "elevenlabs", project: "p", text: "Bonjour", voice: "x"});
  check("ElevenLabs sans clé → refus clair qui renvoie à la page Connexions", r.status === 400 && r.body.code === "no_key" && /Connexions/.test(r.body.message), r.body.message);

  await new Promise(x => srv.close(x)); fake.close();
  console.log(out.join("\n"));
  process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
