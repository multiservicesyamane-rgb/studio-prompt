// Analyse complète d'une vidéo (/api/video/analyze) avec un FAUX Google : vrai server.js, aucune vraie clé, aucun quota.
// Vérifie l'envoi reprenable de la vidéo entière, l'attente de l'état ACTIVE, l'image par seconde adaptée à la durée,
// le mode « agentic » en flux pour les vidéos longues, le rapport JSON structuré, la suppression chez Google et les erreurs.
const http = require("http"), path = require("path"), {spawn} = require("child_process");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const body = req => new Promise(r => { const c = []; req.on("data", x => c.push(x)); req.on("end", () => r(Buffer.concat(c))); });
const json = (res, code, o, h) => { res.writeHead(code, Object.assign({"Content-Type": "application/json"}, h || {})); res.end(JSON.stringify(o)); };
const ANALYSIS = {overview: {summary: "Une femme découvre une lettre.", story: "x", visual_style: "naturel", editing_style: "lent", audio_style: "voix et ambiance", language: "fr", duration: 20},
  characters: [{id: "c1", nom: "Femme", fiche_fr: "femme de 40 ans", fiche_en: "a 40-year-old woman with braided hair, green dress", rappel_en: "the woman in a green dress"}], locations: [{id: "l1", name: "salon", description: "petit salon"}],
  transcript: [{t0: 1, t1: 4, speaker: "c1", text: "Qui a laissé ça ici ?", language: "fr"}], scenes: [{scene_id: "S01", t0: 0, t1: 20, location_id: "l1", objective: "comprendre", event: "lettre trouvée", change: "doute", characters: ["c1"]}],
  shots: [{shot_id: "P01", scene_id: "S01", t0: 0, t1: 12, characters: ["c1"], description: "Elle entre", action: "entre", performance: "hésite", framing: "plan large", angle: "hauteur d'yeux", lens: "35mm", camera_movement: "fixe", focus: "", lighting: "fenêtre", color: "chaud", dialogue: "Qui a laissé ça ici ?", speaker: "c1", music: "", sfx: "porte", ambience: "rue", transition_in: "", transition_out: "coupe", continuity_in: "", continuity_out: "", object_state: "lettre fermée", reconstruction_note: ""},
    {shot_id: "P02", scene_id: "S01", t0: 12, t1: 20, characters: ["c1"], description: "Gros plan lettre", action: "ouvre", performance: "", framing: "insert", angle: "plongée", lens: "", camera_movement: "fixe", focus: "lettre", lighting: "fenêtre", color: "", dialogue: "", speaker: "", music: "", sfx: "papier", ambience: "", transition_in: "coupe", transition_out: "", continuity_in: "", continuity_out: "", object_state: "lettre ouverte", reconstruction_note: ""}],
  defects: [{t0: 2, t1: 5, problem: "image floue", improvement: "mise au point sur le visage"}], reconstruction: {keep: ["l'hésitation"], improve: ["plus de suspense"], risks: ["mains"]}};

let FAKE = "", mode = "short", seen = {};
const fake = http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x"), b = req.method === "POST" ? await body(req) : Buffer.alloc(0);
  if(req.method === "GET" && u.pathname === "/v1beta/models") return json(res, 200, {models: [{name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"]}, {name: "models/gemini-3-pro-preview", supportedGenerationMethods: ["generateContent"]}]});
  if(u.pathname === "/upload/v1beta/files"){ seen.start = {key: req.headers["x-goog-api-key"], proto: req.headers["x-goog-upload-protocol"], cmd: req.headers["x-goog-upload-command"], len: req.headers["x-goog-upload-header-content-length"], type: req.headers["x-goog-upload-header-content-type"], name: JSON.parse(b.toString()).file.display_name};
    res.writeHead(200, {"x-goog-upload-url": `${FAKE}/session/1`}); return res.end(); }
  if(u.pathname === "/session/1"){ seen.upload = {cmd: req.headers["x-goog-upload-command"], offset: req.headers["x-goog-upload-offset"], bytes: b.length}; seen.polls = 0;
    return json(res, 200, {file: {name: "files/abc", uri: `${FAKE}/v1beta/files/abc`, mimeType: "video/mp4", state: "PROCESSING"}}); }
  if(req.method === "GET" && u.pathname === "/v1beta/files/abc"){ seen.polls++;
    return json(res, 200, seen.polls < 2 ? {name: "files/abc", state: "PROCESSING"} : {name: "files/abc", uri: `${FAKE}/v1beta/files/abc`, mimeType: "video/mp4", state: "ACTIVE", videoMetadata: {videoDuration: mode === "long" ? "400s" : "20s"}}); }
  if(req.method === "DELETE" && u.pathname === "/v1beta/files/abc"){ seen.deleted = (seen.deleted || 0) + 1; return json(res, 200, {}); }
  if(u.pathname === "/v1beta/interactions"){ const o = JSON.parse(b.toString()); seen.asks = (seen.asks || 0) + 1;
    if(mode === "noenum" && /video_type/.test(JSON.stringify(o.response_format))) return json(res, 400, {error: {code: 400, message: "Invalid JSON payload: enum is not supported", status: "INVALID_ARGUMENT"}});
    seen.ask = o;
    if(mode === "quota") return json(res, 429, {error: {code: 429, message: "Resource has been exhausted", status: "RESOURCE_EXHAUSTED"}}, {"retry-after": "30"});
    const text = JSON.stringify(ANALYSIS);
    if(o.stream){ res.writeHead(200, {"Content-Type": "text/event-stream"});
      for(let i = 0; i < text.length; i += 200) res.write(`data: ${JSON.stringify({event_type: "step.delta", delta: {type: "text", text: text.slice(i, i + 200)}})}\r\n\r\n`);
      res.write(`data: ${JSON.stringify({event_type: "interaction.complete", interaction: {status: "completed"}})}\r\n\r\n`); return res.end(); }
    return json(res, 200, {status: "completed", steps: [{type: "thought", text: "je réfléchis"}, {type: "model_output", content: [{type: "text", text}]}]}); }
  json(res, 404, {error: {message: "inconnu " + req.method + " " + u.pathname}});
});
const PORT = 3000 + 100 + Math.floor(Math.random() * 800);
const send = (bytes, headers) => new Promise((r, j) => { const q = http.request({host: "127.0.0.1", port: PORT, path: "/api/video/analyze", method: "POST", headers: Object.assign({"Content-Length": bytes.length}, headers)}, res => { const c = []; res.on("data", x => c.push(x)); res.on("end", () => { let o = {}; try{ o = JSON.parse(Buffer.concat(c).toString("utf8")); }catch(e){} r({status: res.statusCode, body: o}); }); }); q.on("error", j); q.end(bytes); });

(async () => {
  await new Promise(r => fake.listen(0, "127.0.0.1", r)); FAKE = `http://127.0.0.1:${fake.address().port}`;
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "cle-test", GEMINI_BASE_URL: FAKE + "/v1beta", PROVIDER: "gemini", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", APP_PASSWORD: "", GEMINI_VIDEO_MODEL: ""});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]});
  let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  for(let k = 0; k < 50 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
  try{
    const video = Buffer.alloc(60000, 5), H = {"Content-Type": "video/mp4", "X-Video-Mime": "video/mp4", "X-Video-Name": encodeURIComponent("Ma vidéo d'été.mp4"), "X-Video-Duration": "20"};
    // 1. vidéo courte
    let r = await send(video, H);
    check("vidéo courte : rapport complet reçu (scènes, plans, transcription, défauts)", r.status === 200 && r.body.shots && r.body.shots.length === 2 && r.body.transcript[0].text === "Qui a laissé ça ici ?" && r.body.defects.length === 1, `${r.status} ${r.body.message || ""}`);
    check("envoi reprenable de la vidéo ENTIÈRE (pas des captures)", seen.start && seen.start.proto === "resumable" && seen.start.cmd === "start" && seen.start.len === "60000" && seen.start.type === "video/mp4" && seen.upload.cmd === "upload, finalize" && seen.upload.offset === "0" && seen.upload.bytes === 60000, JSON.stringify({start: seen.start, upload: seen.upload}));
    check("attente de l'état ACTIVE avant l'analyse", seen.polls >= 2);
    const item = seen.ask.input[0];
    check("vidéo envoyée au modèle avec image ET son, 4 images/s pour 20 s", item.type === "video" && item.uri === `${FAKE}/v1beta/files/abc` && item.processing && item.processing.fps === 4 && /flux visuel ET le flux audio/.test(seen.ask.input[1].text) && !seen.ask.stream, JSON.stringify(item.processing));
    check("rapport structuré imposé (schéma JSON avec caméra, son, raccords)", seen.ask.response_format && seen.ask.response_format.mime_type === "application/json" && /camera_movement/.test(JSON.stringify(seen.ask.response_format.schema)) && /continuity_out/.test(JSON.stringify(seen.ask.response_format.schema)));
    check("modèle Flash le plus récent choisi automatiquement", seen.ask.model === "gemini-3.8-flash" && r.body.model === "gemini-3.8-flash", seen.ask.model);
    check("vidéo supprimée chez Google après l'analyse", seen.deleted === 1 && r.body.source_deleted === true && r.body.processing === "static_4fps", `${seen.deleted} ${r.body.processing}`);
    check("nom de fichier nettoyé, aucune clé renvoyée", seen.start.name === "Ma-vid-o-d-t-mp4" && !/cle-test/.test(JSON.stringify(r.body)), seen.start.name);
    // 1 bis. catalogue de Studio Prompt : Gemini choisit le type et le style, l'application règle le projet toute seule
    seen = {};
    const CAT = {types: [["tale", "Conte / fable"], ["documentary", "Documentaire"]], styles: [["realiste", "Réaliste cinéma"], ["anim3d", "Animation 3D"]]};
    r = await send(video, Object.assign({}, H, {"X-Catalog": encodeURIComponent(JSON.stringify(CAT))}));
    const ov = seen.ask && seen.ask.response_format.schema.properties.overview;
    check("classement : type et style choisis parmi ceux de Studio Prompt (schéma imposé)", r.status === 200 && ov && ov.properties.video_type.enum.join() === "tale,documentary" && ov.properties.style_id.enum.join() === "realiste,anim3d" && /CLASSEMENT POUR STUDIO PROMPT/.test(seen.ask.input[1].text), ov ? JSON.stringify(ov.properties.video_type) : `${r.status}`);
    seen = {};
    r = await send(video, Object.assign({}, H, {"X-Catalog": "%7Bpas-du-json"}));
    check("catalogue illisible : analyse normale, sans classement", r.status === 200 && !seen.ask.response_format.schema.properties.overview.properties.video_type && !/CLASSEMENT/.test(seen.ask.input[1].text), String(r.status));
    // 1 ter. si l'API refuse le classement, l'analyse complète est refaite sans lui (jamais perdue)
    mode = "noenum"; seen = {};
    r = await send(video, Object.assign({}, H, {"X-Catalog": encodeURIComponent(JSON.stringify(CAT))}));
    check("classement refusé par l'API : analyse refaite sans lui, rapport complet quand même", r.status === 200 && r.body.shots && r.body.shots.length === 2 && seen.asks === 2 && !/CLASSEMENT/.test(seen.ask.input[1].text) && /flux visuel ET le flux audio/.test(seen.ask.input[1].text), `${r.status} · ${seen.asks} demande(s)`);
    mode = "short";
    // 2. vidéo longue : mode agentic + flux
    mode = "long"; seen = {};
    r = await send(video, Object.assign({}, H, {"X-Video-Duration": "400"}));
    check("vidéo longue (6 min 40) : mode « agentic » en flux, rapport recollé", r.status === 200 && seen.ask.input[0].processing === "agentic" && seen.ask.stream === true && r.body.shots.length === 2 && r.body.processing === "agentic", `${r.status} ${r.body.message || ""}`);
    // 3. quota épuisé : message clair, vidéo quand même supprimée chez Google
    mode = "quota"; seen = {};
    r = await send(video, H); await new Promise(x => setTimeout(x, 300));   // la suppression suit la réponse
    check("quota Gemini épuisé : erreur claire (relais images clés possible), vidéo supprimée", r.status === 429 && r.body.code === "rate_limited" && /Quota gratuit/.test(r.body.message) && seen.deleted === 1, `${r.status} ${r.body.code} ${r.body.message}`);
    // 4. format refusé
    r = await send(Buffer.alloc(100), Object.assign({}, H, {"Content-Type": "text/plain", "X-Video-Mime": "text/plain"}));
    check("fichier qui n'est pas une vidéo → refus avant tout envoi", r.status === 415, String(r.status));
  }finally{ srv.kill(); fake.close(); }
  console.log(out.join("\n")); process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
