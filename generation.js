/*
  Studio Prompt · fabrication des vidéos et des voix (côté serveur, aucune dépendance)
  - Vidéo : Veo 3.1 (clé Gemini, facturation Google activée) ou Runway (crédits API Runway)
  - Voix  : Gemini (offre gratuite) ou ElevenLabs
  - Les images de départ restent faites par la route /api/images/generate de server.js : ce module ne la double pas,
    il compte seulement son coût dans le budget du jour.
  Les clés ne quittent jamais ce serveur. Une vidéo prend de quelques secondes à quelques minutes : chaque fabrication
  est une TÂCHE suivie ici, enregistrée dans public/generated/jobs.json (ignoré par git) et reprise si le serveur redémarre.
  Sources vérifiées le 5 octobre 2026 : ai.google.dev/gemini-api/docs/veo, /speech-generation, /pricing ;
  docs.dev.runwayml.com (API, pricing, inputs) ; elevenlabs.io/docs/api-reference/text-to-speech/convert.
*/
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");

module.exports = function createGeneration({dir, env, sendJson, readBody}){
  const GEMINI_KEY = env.GEMINI_API_KEY || "", GEMINI_BASE = (env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
  /* Clé d'un projet Google AVEC facturation, réservée aux médias payants (Veo, images) : la clé principale reste gratuite
     pour les agents et les voix. Sans elle, on essaie la clé principale (il faut alors activer la facturation de son projet). */
  const MEDIA_KEY = env.GEMINI_MEDIA_API_KEY || GEMINI_KEY, MEDIA_OWN = !!env.GEMINI_MEDIA_API_KEY;
  const KEY_TAG = crypto.createHash("sha256").update(MEDIA_KEY).digest("hex").slice(0, 12);   /* empreinte, jamais la clé */
  const RUNWAY_KEY = env.RUNWAY_API_KEY || env.RUNWAYML_API_SECRET || "", RUNWAY_BASE = (env.RUNWAY_BASE_URL || "https://api.dev.runwayml.com/v1").replace(/\/$/, "");
  const RUNWAY_MODEL = env.RUNWAY_MODEL || "gen4.5", RUNWAY_VERSION = env.RUNWAY_VERSION || "2024-11-06";
  const ELEVEN_KEY = env.ELEVENLABS_API_KEY || "", ELEVEN_BASE = (env.ELEVENLABS_BASE_URL || "https://api.elevenlabs.io").replace(/\/$/, ""), ELEVEN_MODEL = env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
  const TTS_MODEL = env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts";
  const POLL = Number(env.GEN_POLL_MS) || 10000, PARALLEL = Math.max(1, Number(env.GEN_PARALLEL) || 2), VOICE_PARALLEL = Math.max(1, Number(env.GEN_VOICE_PARALLEL) || 1), MAX_WAIT = Number(env.GEN_MAX_WAIT_MS) || 25 * 60 * 1000;
  const num = (k, d) => env[k] !== undefined && env[k] !== "" && isFinite(Number(env[k])) ? Number(env[k]) : d;
  const BUDGET = num("GEN_BUDGET_USD", 5);
  /* Prix indicatifs en dollars (pages officielles, 5 octobre 2026), modifiables dans .env */
  const PRICES_DATE = "5 octobre 2026";
  const VIDEO = [
    {id:"veo-lite", model:env.VEO_MODEL_LITE || "veo-3.1-lite-generate-preview", label:"Veo 3.1 Lite", note:"le moins cher, son inclus", price_s:num("PRICE_VEO_LITE", 0.05), durations:[4, 6, 8], audio:true, key:"gemini"},
    {id:"veo-fast", model:env.VEO_MODEL_FAST || "veo-3.1-fast-generate-preview", label:"Veo 3.1 Fast", note:"bon rapport qualité-prix, son inclus", price_s:num("PRICE_VEO_FAST", 0.10), durations:[4, 6, 8], audio:true, key:"gemini"},
    {id:"veo", model:env.VEO_MODEL || "veo-3.1-generate-preview", label:"Veo 3.1", note:"meilleure qualité, son inclus", price_s:num("PRICE_VEO", 0.40), durations:[4, 6, 8], audio:true, key:"gemini"},
    {id:"runway", model:RUNWAY_MODEL, label:"Runway Gen-4.5", note:"sans son (ajoute les voix)", price_s:num("PRICE_RUNWAY", 0.12), durations:[5, 10], audio:false, key:"runway"}];
  const IMAGE_PRICE = num("PRICE_IMAGE", 0.07);
  const NAME = {veo:"Veo", runway:"Runway", image:"Nano Banana", tts:"La voix Gemini", elevenlabs:"ElevenLabs"};
  /* 30 voix Gemini ; le genre indiqué est celui annoncé par Google Studio, à confirmer à l'écoute avec « Essai » */
  const GEMINI_VOICES = [["Kore","femme","ferme"],["Aoede","femme","légère"],["Leda","femme","jeune"],["Zephyr","femme","lumineuse"],["Callirrhoe","femme","détendue"],["Autonoe","femme","lumineuse"],["Despina","femme","douce"],["Erinome","femme","claire"],["Laomedeia","femme","enjouée"],["Achernar","femme","tendre"],["Gacrux","femme","mûre"],["Pulcherrima","femme","assurée"],["Vindemiatrix","femme","calme"],["Sulafat","femme","chaleureuse"],
    ["Puck","homme","enjouée"],["Charon","homme","posée, informative"],["Fenrir","homme","vive"],["Orus","homme","ferme"],["Enceladus","homme","soufflée"],["Iapetus","homme","claire"],["Umbriel","homme","détendue"],["Algieba","homme","douce"],["Algenib","homme","rauque"],["Rasalgethi","homme","informative"],["Alnilam","homme","ferme"],["Schedar","homme","égale"],["Achird","homme","amicale"],["Zubenelgenubi","homme","décontractée"],["Sadachbia","homme","vive"],["Sadaltager","homme","savante"]];

  /* ---------- stockage ---------- */
  fs.mkdirSync(dir, {recursive:true});
  const JOBS = path.join(dir, "jobs.json"), STATE = path.join(dir, "state.json");
  let jobs = []; try{ jobs = JSON.parse(fs.readFileSync(JOBS, "utf8")); if(!Array.isArray(jobs)) jobs = []; }catch(e){}
  let state = {billing:"unknown", billingKey:"", day:"", spent:0}; try{ Object.assign(state, JSON.parse(fs.readFileSync(STATE, "utf8"))); }catch(e){}
  if(state.billingKey !== KEY_TAG){ state.billing = "unknown"; state.billingKey = KEY_TAG; }   /* nouvelle clé média : facturation à revérifier */
  let saveT = null;
  const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => { try{ fs.writeFileSync(JOBS, JSON.stringify(jobs.slice(-3000))); }catch(e){} }, 150); };
  const saveState = () => { try{ fs.writeFileSync(STATE, JSON.stringify(state)); }catch(e){} };
  const today = () => new Date().toISOString().slice(0, 10);
  const spentToday = () => { if(state.day !== today()){ state.day = today(); state.spent = 0; saveState(); } return state.spent; };
  const money = x => (Math.round(x * 100) / 100).toFixed(2).replace(".", ",") + " $";
  /* Budget du jour : réservé au départ, rendu si la fabrication échoue */
  function reserve(amount){
    amount = Math.max(0, Number(amount) || 0); const s = spentToday();
    if(amount > 0 && s + amount > BUDGET + 1e-9) return {ok:false, code:"budget", message:`Budget du jour atteint : ${money(s)} dépensés sur ${money(BUDGET)} (cette fabrication coûterait environ ${money(amount)}). Pour dépenser plus, change GEN_BUDGET_USD dans le fichier .env.`};
    state.spent = s + amount; saveState(); return {ok:true, amount, day:state.day};
  }
  function refund(r){ if(r && r.amount && r.day === today()){ state.spent = Math.max(0, spentToday() - r.amount); saveState(); } }
  function billing(ok){ const v = ok ? "ok" : "missing"; if(state.billing !== v){ state.billing = v; saveState(); } }

  const safeId = s => String(s || "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "projet";
  const pad = n => String(Math.max(0, Number(n) || 0)).padStart(2, "0");
  const MIME = {mp4:"video/mp4", webm:"video/webm", mov:"video/quicktime", png:"image/png", jpg:"image/jpeg", jpeg:"image/jpeg", webp:"image/webp", wav:"audio/wav", mp3:"audio/mpeg", json:"application/json"};
  const EXT = {"video/mp4":"mp4", "video/webm":"webm", "video/quicktime":"mov", "audio/x-wav":"wav", "audio/mp3":"mp3", "image/png":"png", "image/jpeg":"jpg", "image/webp":"webp", "audio/wav":"wav", "audio/mpeg":"mp3"};
  function fileOf(url){
    const m = String(url || "").match(/^\/generated\/([a-zA-Z0-9_-]{1,80})\/([a-zA-Z0-9_.-]{1,140})$/);
    if(!m || m[2].startsWith(".")) return null;
    const f = path.join(dir, m[1], m[2]);
    return f.startsWith(path.join(dir, m[1]) + path.sep) ? f : null;
  }
  function saveMedia(project, base, buf, mime){
    const p = safeId(project), d = path.join(dir, p); fs.mkdirSync(d, {recursive:true});
    const name = `${safeId(base)}-${Date.now().toString(36)}.${EXT[mime] || "bin"}`;
    fs.writeFileSync(path.join(d, name), buf);
    return {url:`/generated/${p}/${name}`, mime, size:buf.length};
  }
  function imageInput(x){
    const s = String(x || ""), d = s.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/);
    if(d) return {mime:d[1].replace("jpg", "jpeg"), data:d[2]};
    const f = fileOf(s); if(!f || !fs.existsSync(f)) return null;
    const mime = MIME[path.extname(f).slice(1).toLowerCase()] || "";
    return /^image\//.test(mime) ? {mime, data:fs.readFileSync(f).toString("base64")} : null;
  }
  /* WAV 16 bits mono à partir de PCM brut (format des voix Gemini) */
  function wav(pcm, rate){
    const h = Buffer.alloc(44);
    h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
    h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
    return Buffer.concat([h, pcm]);
  }
  function wavSeconds(buf){ try{ if(buf.slice(0, 4).toString() !== "RIFF") return 0; const rate = buf.readUInt32LE(24), bps = buf.readUInt16LE(32); let i = 12; while(i + 8 <= buf.length){ const id = buf.slice(i, i + 4).toString(), len = buf.readUInt32LE(i + 4); if(id === "data") return Math.round(Math.min(len, buf.length - i - 8) / (rate * bps) * 10) / 10; i += 8 + len; } }catch(e){} return 0; }
  /* Trouve un média (image ou audio) dans une réponse Gemini, quel que soit le format (interactions ou generateContent) ; garde le dernier */
  function findMedia(o, kind){
    let hit = null;
    (function walk(x){
      if(!x || typeof x !== "object") return;
      const inl = x.inlineData || x.inline_data;
      if(inl && typeof inl.data === "string" && String(inl.mimeType || inl.mime_type || "").startsWith(kind + "/")) hit = {data:inl.data, mime:inl.mimeType || inl.mime_type};
      else if(typeof x.data === "string" && x.data.length > 64 && (x.type === kind || String(x.mime_type || x.mimeType || "").startsWith(kind + "/"))) hit = {data:x.data, mime:x.mime_type || x.mimeType || ""};
      for(const k of Object.keys(x)) if(k !== "inlineData" && k !== "inline_data") walk(x[k]);
    })(o);
    return hit;
  }

  /* ---------- appels réseau ---------- */
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function call(url, opts, ms){
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms || 120000);
    try{
      const r = await fetch(url, Object.assign({signal:ctl.signal}, opts || {}));
      const buf = Buffer.from(await r.arrayBuffer()); let json = null;
      if(/json/.test(r.headers.get("content-type") || "") || buf[0] === 0x7b){ try{ json = JSON.parse(buf.toString("utf8")); }catch(e){} }
      return {ok:r.ok, status:r.status, json, buf, type:r.headers.get("content-type") || ""};
    }finally{ clearTimeout(t); }
  }
  const gHead = (key) => ({"x-goog-api-key":key || GEMINI_KEY, "Content-Type":"application/json"});
  const mHead = () => gHead(MEDIA_KEY);   /* Veo : clé du projet payant */
  const rwHead = () => ({"Authorization":"Bearer " + RUNWAY_KEY, "X-Runway-Version":RUNWAY_VERSION, "Content-Type":"application/json"});
  const post = (headers, body) => ({method:"POST", headers, body:JSON.stringify(body)});
  /* Traduit une erreur de service en message simple ; jamais la clé */
  function errOf(svc, r){
    const j = r.json || {}, e = j.error;
    let s = (e && (e.message || e.status)) || j.failure || j.failureCode || (j.detail && (j.detail.message || j.detail.status || j.detail)) || j.message || (typeof e === "string" ? e : "") || (r.buf ? r.buf.toString("utf8").slice(0, 300) : "");
    s = typeof s === "string" ? s : JSON.stringify(s);
    const google = svc === "veo" || svc === "image" || svc === "tts", name = NAME[svc] || svc;
    if(google && /billing|free.?tier|limit: ?0|paid tier|requires a paid|FAILED_PRECONDITION/i.test(s)) return {code:"billing", message:`${name} est payant chez Google : active la facturation de ton projet dans Google AI Studio (page Connexions de Studio Prompt, étape 1), puis réessaie.`};
    if(r.status === 401 || (r.status === 403 && !/quota|billing/i.test(s))) return {code:"bad_key", message:`Clé ${name} refusée : vérifie la clé dans le fichier .env, puis relance Studio Prompt.`};
    if(r.status === 429) return {code:"rate_limited", message:`${name} : trop de demandes en même temps. Réessaie dans une minute.`};
    if(/credit|insufficient|balance|quota_exceeded|paid_plan/i.test(s)) return {code:"no_credit", message:`${name} : plus de crédits sur ton compte. Recharge-le, puis réessaie.`};
    if(/safety|moderation|blocked|rai|policy|celebrit|prominent|sensitive|SAFETY/i.test(s)) return {code:"refused", message:`${name} a refusé ce plan (filtre de sécurité) : ${s.slice(0, 200)}`};
    return {code:r.status >= 500 ? "overloaded" : "server_error", message:`${name} : erreur ${r.status || ""}. ${s.slice(0, 220)}`.trim()};
  }

  /* ---------- tâches ---------- */
  const update = (j, patch) => { Object.assign(j, patch, {updated:Date.now()}); persist(); };
  const pub = j => { const o = Object.assign({}, j); delete o.refs; delete o.charge; delete o.remote; return o; };
  function finish(j, media){ update(j, Object.assign({status:"done", step:""}, media)); if(j.service !== "runway" && j.kind === "video") billing(true); pump(); }
  function failJob(j, e){
    refund(j.charge); update(j, {status:"failed", step:"", code:e.code || "server_error", error:e.message || String(e)});
    if(e.code === "billing") billing(false);
    pump();
  }
  function pump(){
    /* vidéos : quelques-unes en même temps ; voix : une par une (l'offre gratuite limite les demandes par minute) */
    let free = PARALLEL - jobs.filter(j => j.kind === "video" && j.status === "running").length, freeV = VOICE_PARALLEL - jobs.filter(j => j.kind === "voice" && j.status === "running").length;
    for(const j of jobs){
      if(j.status !== "queued") continue;
      if(j.kind === "video"){ if(free <= 0) continue; free--; }
      else{ if(freeV <= 0) continue; freeV--; }
      run(j);
    }
  }
  async function run(j){
    update(j, {status:"running", step:"envoi"});
    try{
      if(j.kind === "video") await (j.service === "runway" ? runRunway(j) : runVeo(j));
      else await (j.service === "elevenlabs" ? runEleven(j) : runGeminiVoice(j));
    }catch(e){ failJob(j, e && e.code ? e : {code:"network", message:`Connexion impossible avec le service (${String(e && e.message || e).slice(0, 120)}). Vérifie Internet, puis relance.`}); }
  }
  /* Attente d'une tâche distante : coupures réseau tolérées, durée maximale bornée */
  async function poll(j, check){
    let errors = 0;
    for(;;){
      if(Date.now() - j.created > MAX_WAIT) throw {code:"timeout", message:"La fabrication a pris trop de temps : relance ce plan."};
      await sleep(POLL);
      let r; try{ r = await check(); errors = 0; }catch(e){ if(++errors > 12) throw e; continue; }
      if(r) return r;
    }
  }
  async function runVeo(j){
    const m = VIDEO.find(x => x.id === j.service) || VIDEO[1], img = imageInput(j.image);
    const inst = {prompt:j.prompt};
    if(img) inst.image = {inlineData:{mimeType:img.mime, data:img.data}};
    const params = {aspectRatio:j.ratio === "9:16" ? "9:16" : "16:9", durationSeconds:j.duration, resolution:"720p", personGeneration:img ? "allow_adult" : "allow_all"};
    let r = await call(`${GEMINI_BASE}/models/${m.model}:predictLongRunning`, post(mHead(), {instances:[inst], parameters:params}));
    if(!r.ok && r.status === 400 && /personGeneration|allow_all/i.test(JSON.stringify(r.json || ""))){ params.personGeneration = "allow_adult"; r = await call(`${GEMINI_BASE}/models/${m.model}:predictLongRunning`, post(mHead(), {instances:[inst], parameters:params})); }
    if(!r.ok || !r.json || !r.json.name) throw errOf("veo", r);
    update(j, {remote:{op:r.json.name}, step:"fabrication"});
    return veoWait(j);
  }
  async function veoWait(j){
    const uri = await poll(j, async () => {
      const r = await call(`${GEMINI_BASE}/${j.remote.op}`, {headers:mHead()}, 60000);
      if(!r.ok){ if(r.status >= 500 || r.status === 429) return null; throw errOf("veo", r); }
      const o = r.json || {}; if(!o.done) return null;
      if(o.error) throw errOf("veo", {status:400, json:{error:o.error}});
      const g = (o.response && (o.response.generateVideoResponse || o.response)) || {}, s = (g.generatedSamples || g.generatedVideos || [])[0], u = s && s.video && (s.video.uri || s.video.url);
      if(!u) throw {code:"refused", message:`Veo n'a pas rendu de vidéo${(g.raiMediaFilteredReasons || []).length ? " : " + g.raiMediaFilteredReasons.join(" ").slice(0, 220) : " (contenu filtré ou réponse vide)"}. Modifie le plan, puis relance.`};
      return u;
    });
    update(j, {step:"téléchargement"});
    const v = await call(uri, {headers:{"x-goog-api-key":MEDIA_KEY}}, 300000);
    if(!v.ok || v.buf.length < 1000) throw errOf("veo", v);
    finish(j, saveMedia(j.project, `P${pad(j.plan)}-video-${j.service}`, v.buf, "video/mp4"));
  }
  async function runRunway(j){
    const img = imageInput(j.image), body = {model:RUNWAY_MODEL, promptText:String(j.prompt).slice(0, 1000), ratio:j.ratio === "9:16" ? "720:1280" : "1280:720", duration:j.duration};
    if(img){
      if(img.data.length > 5e6) throw {code:"bad_request", message:"Image de départ trop lourde pour Runway (5 Mo au maximum) : régénère-la en 1K."};
      body.promptImage = `data:${img.mime};base64,${img.data}`;
    }
    const r = await call(`${RUNWAY_BASE}/${img ? "image_to_video" : "text_to_video"}`, post(rwHead(), body));
    if(!r.ok || !r.json || !r.json.id) throw errOf("runway", r);
    update(j, {remote:{task:r.json.id}, step:"fabrication"});
    return runwayWait(j);
  }
  async function runwayWait(j){
    const url = await poll(j, async () => {
      const r = await call(`${RUNWAY_BASE}/tasks/${encodeURIComponent(j.remote.task)}`, {headers:rwHead()}, 60000);
      if(!r.ok){ if(r.status >= 500 || r.status === 429) return null; throw errOf("runway", r); }
      const t = r.json || {};
      if(t.status === "SUCCEEDED"){ const u = Array.isArray(t.output) ? t.output[0] : t.output; if(!u) throw {code:"server_error", message:"Runway a terminé sans renvoyer de vidéo : relance ce plan."}; return u; }
      if(t.status === "FAILED" || t.status === "CANCELLED") throw errOf("runway", {status:400, json:{failure:t.failure || t.failureCode || t.status}});
      if(t.status === "RUNNING" && typeof t.progress === "number") update(j, {step:`fabrication ${Math.round(t.progress * 100)} %`});
      return null;
    });
    update(j, {step:"téléchargement"});
    const v = await call(url, {}, 300000);
    if(!v.ok || v.buf.length < 1000) throw errOf("runway", v);
    finish(j, saveMedia(j.project, `P${pad(j.plan)}-video-runway`, v.buf, "video/mp4"));
  }
  async function runGeminiVoice(j){
    const content = {type:"text", text:j.text}; if(j.style) content.annotations = [{type:"speech_metadata", style:j.style}];
    let r, tries = 0;
    for(;;){
      r = await call(`${GEMINI_BASE}/interactions`, post(gHead(), {model:TTS_MODEL, input:[{type:"user_input", content:[content]}], response_format:{type:"audio", mime_type:"audio/wav", sample_rate:24000}, generation_config:{speech_config:[{voice:j.voice || "Kore"}]}}), 120000);
      if(r.status === 404){   /* ancien format, si l'API interactions n'est pas ouverte sur ce compte */
        r = await call(`${GEMINI_BASE}/models/${TTS_MODEL}:generateContent`, post(gHead(), {contents:[{parts:[{text:j.style ? `Say in a ${j.style} way: ${j.text}` : j.text}]}], generationConfig:{responseModalities:["AUDIO"], speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:j.voice || "Kore"}}}}}), 120000);
      }
      if(r.status !== 429) break;
      /* limite de l'offre gratuite : par jour → message clair ; par minute → on attend puis on réessaie */
      const txt = JSON.stringify(r.json || "") || "";
      if(/per.?day|PerDay|daily/i.test(txt)) throw {code:"quota_day", message:"Quota du jour des voix gratuites atteint chez Google : reprends demain matin, ou ajoute une clé ElevenLabs (page Connexions)."};
      if(++tries > 4) throw errOf("tts", r);
      const m = txt.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/), wait = Number(env.GEN_RETRY_MS) || Math.min(60, m ? Number(m[1]) + 1 : 20) * 1000;
      update(j, {step:`attente de Google (${Math.round(wait / 1000)} s)`}); await sleep(wait);
    }
    if(!r.ok) throw errOf("tts", r);
    const a = findMedia(r.json, "audio"); if(!a) throw {code:"server_error", message:"La voix Gemini n'a pas rendu d'audio : réessaie."};
    let buf = Buffer.from(a.data, "base64"); if(buf.slice(0, 4).toString() !== "RIFF") buf = wav(buf, Number((String(a.mime).match(/rate=(\d+)/) || [])[1]) || 24000);
    finish(j, Object.assign(saveMedia(j.project, j.base || `P${pad(j.plan)}-voix`, buf, "audio/wav"), {seconds:wavSeconds(buf)}));
  }
  async function runEleven(j){
    const r = await call(`${ELEVEN_BASE}/v1/text-to-speech/${encodeURIComponent(j.voice)}?output_format=mp3_44100_128`, post({"xi-api-key":ELEVEN_KEY, "Content-Type":"application/json", "Accept":"audio/mpeg"}, {text:j.text, model_id:ELEVEN_MODEL}), 120000);
    if(!r.ok || /json/.test(r.type) || r.buf.length < 200) throw errOf("elevenlabs", r);
    finish(j, Object.assign(saveMedia(j.project, j.base || `P${pad(j.plan)}-voix`, r.buf, "audio/mpeg"), {seconds:Math.round(r.buf.length / 16000 * 10) / 10}));
  }
  /* Reprise après redémarrage : on continue d'attendre les vidéos déjà commandées (jamais payées deux fois) */
  for(const j of jobs){
    if(j.status === "running" && j.remote){ (j.remote.op ? veoWait(j) : runwayWait(j)).catch(e => failJob(j, e && e.code ? e : {code:"network", message:"Connexion perdue pendant l'attente : relance ce plan."})); }
    else if(j.status === "running") failJob(j, {code:"interrupted", message:"Studio Prompt a été fermé pendant l'envoi : relance ce plan."});
  }
  setTimeout(pump, 0);

  /* ---------- état des services (jamais les clés) ---------- */
  /* « billing » = la facturation Google reste à activer (ou a été refusée) pour la clé des médias */
  const mediaNeeds = () => !MEDIA_KEY ? "key" : state.billing === "ok" ? "" : state.billing === "missing" ? "billing" : MEDIA_OWN ? "" : "billing";
  function status(){
    return {
      prices_date:PRICES_DATE, budget:{limit:BUDGET, spent:Math.round(spentToday() * 100) / 100}, billing:state.billing,
      video:VIDEO.map(v => ({id:v.id, label:v.label, note:v.note, price_s:v.price_s, durations:v.durations, audio:v.audio, ready:v.key === "gemini" ? !!MEDIA_KEY : !!RUNWAY_KEY, needs:v.key === "gemini" ? mediaNeeds() : (RUNWAY_KEY ? "" : "key")})),
      image:{label:"Nano Banana (Gemini)", price:IMAGE_PRICE, ready:!!MEDIA_KEY, needs:mediaNeeds()}, media_key:MEDIA_OWN,
      voice:[{id:"gemini", label:"Voix Gemini", note:"offre gratuite, 30 voix, français inclus", ready:!!GEMINI_KEY, free:true}, {id:"elevenlabs", label:"ElevenLabs", note:"voix très naturelles, petite offre gratuite chaque mois", ready:!!ELEVEN_KEY}],
      running:jobs.filter(j => j.status === "running" || j.status === "queued").length
    };
  }
  async function voices(provider){
    if(provider !== "elevenlabs") return {voices:GEMINI_VOICES.map(([id, g, d]) => ({id, name:id, desc:`${g}, voix ${d}`}))};
    if(!ELEVEN_KEY) return {voices:[], error:"Pas de clé ElevenLabs dans le fichier .env."};
    let r = await call(`${ELEVEN_BASE}/v2/voices?page_size=100`, {headers:{"xi-api-key":ELEVEN_KEY}}, 30000);
    if(!r.ok) r = await call(`${ELEVEN_BASE}/v1/voices`, {headers:{"xi-api-key":ELEVEN_KEY}}, 30000);
    if(!r.ok) return {voices:[], error:errOf("elevenlabs", r).message};
    return {voices:((r.json && r.json.voices) || []).map(v => ({id:v.voice_id, name:v.name, desc:Object.values(v.labels || {}).filter(x => typeof x === "string").join(", "), preview:v.preview_url || ""}))};
  }
  function start(b){
    const kind = b.kind === "voice" ? "voice" : b.kind === "video" ? "video" : "";
    if(!kind) return [400, {code:"bad_request", message:"Type de fabrication inconnu."}];
    const project = safeId(b.project), plan = Math.max(0, Math.floor(Number(b.plan) || 0));
    if(kind === "video"){
      const v = VIDEO.find(x => x.id === b.service);
      if(!v) return [400, {code:"bad_request", message:"Service vidéo inconnu."}];
      if(v.key === "gemini" ? !MEDIA_KEY : !RUNWAY_KEY) return [400, {code:"no_key", message:`Pas de clé ${v.key === "gemini" ? "Gemini" : "Runway"} dans le fichier .env : ouvre la page Connexions pour savoir comment l'ajouter.`}];
      const prompt = String(b.prompt || "").trim(); if(prompt.length < 10 || prompt.length > 12000) return [400, {code:"bad_request", message:"Prompt vidéo manquant ou trop long."}];
      const want = Math.max(1, Number(b.seconds) || 8), duration = v.durations.find(d => d >= want) || v.durations[v.durations.length - 1];
      const imgIn = b.image ? imageInput(b.image) : null;
      if(b.image && !imgIn) return [400, {code:"bad_request", message:"Image de départ introuvable : régénère-la dans le Storyboard, ou fabrique la vidéo sans image."}];
      const image = !imgIn ? "" : String(b.image).startsWith("data:") ? saveMedia(project, `P${pad(plan)}-depart`, Buffer.from(imgIn.data, "base64"), imgIn.mime).url : String(b.image);
      const charge = reserve(v.price_s * duration); if(!charge.ok) return [402, charge];
      const j = {id:"j" + Date.now().toString(36) + crypto.randomBytes(3).toString("hex"), kind, service:v.id, label:v.label, project, plan, prompt, image, ratio:b.ratio === "9:16" ? "9:16" : "16:9", duration, estimate:Math.round(v.price_s * duration * 100) / 100, charge, status:"queued", created:Date.now(), updated:Date.now()};
      jobs.push(j); persist(); pump(); return [200, {job:pub(j)}];
    }
    const service = b.service === "elevenlabs" ? "elevenlabs" : "gemini";
    if(service === "elevenlabs" ? !ELEVEN_KEY : !GEMINI_KEY) return [400, {code:"no_key", message:`Pas de clé ${service === "elevenlabs" ? "ElevenLabs" : "Gemini"} dans le fichier .env : ouvre la page Connexions.`}];
    const text = String(b.text || "").trim(); if(!text || text.length > 3000) return [400, {code:"bad_request", message:"Texte à dire manquant ou trop long."}];
    if(service === "elevenlabs" && !b.voice) return [400, {code:"bad_request", message:"Choisis d'abord une voix ElevenLabs pour ce personnage."}];
    const j = {id:"j" + Date.now().toString(36) + crypto.randomBytes(3).toString("hex"), kind, service, label:service === "elevenlabs" ? "ElevenLabs" : "Voix Gemini", project, plan, text, voice:String(b.voice || "").slice(0, 80), style:String(b.style || "").slice(0, 200), base:safeId(b.base || `P${pad(plan)}-voix`), who:String(b.who || "").slice(0, 80), line:Number(b.line) || 0, estimate:0, status:"queued", created:Date.now(), updated:Date.now()};
    jobs.push(j); persist(); pump(); return [200, {job:pub(j)}];
  }

  /* ---------- fichiers fabriqués : lecture avec « Range » (indispensable pour avancer dans une vidéo) ---------- */
  function serveMedia(req, res, url){
    const f = fileOf(url);
    if(!f){ res.writeHead(404); return res.end(); }
    fs.stat(f, (err, st) => {
      if(err || !st.isFile()){ res.writeHead(404, {"Content-Type":"text/plain; charset=utf-8"}); return res.end("Introuvable"); }
      const type = MIME[path.extname(f).slice(1).toLowerCase()] || "application/octet-stream", m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
      if(m && (m[1] !== "" || m[2] !== "")){
        let a = m[1] === "" ? Math.max(0, st.size - Number(m[2])) : Number(m[1]), b = m[1] === "" || m[2] === "" ? st.size - 1 : Math.min(Number(m[2]), st.size - 1);
        if(a > b || a >= st.size){ res.writeHead(416, {"Content-Range":`bytes */${st.size}`}); return res.end(); }
        res.writeHead(206, {"Content-Type":type, "Content-Range":`bytes ${a}-${b}/${st.size}`, "Accept-Ranges":"bytes", "Content-Length":b - a + 1, "Cache-Control":"no-cache"});
        if(req.method === "HEAD") return res.end();
        return fs.createReadStream(f, {start:a, end:b}).pipe(res);
      }
      res.writeHead(200, {"Content-Type":type, "Content-Length":st.size, "Accept-Ranges":"bytes", "Cache-Control":"no-cache"});
      if(req.method === "HEAD") return res.end();
      fs.createReadStream(f).pipe(res);
    });
  }

  /* Renvoie true si la requête concerne la fabrication */
  function handle(req, res){
    const u = new URL(req.url, "http://x"); let p = u.pathname; try{ p = decodeURIComponent(p); }catch(e){}
    if((req.method === "GET" || req.method === "HEAD") && p.startsWith("/generated/")){ if(/\.json$/i.test(p)){ res.writeHead(404); res.end(); } else serveMedia(req, res, p); return true; }
    if(!p.startsWith("/api/gen/")) return false;
    const route = p.slice(9);
    (async () => {
      if(req.method === "GET" && route === "status") return sendJson(res, 200, status());
      if(req.method === "GET" && route === "voices") return sendJson(res, 200, await voices(u.searchParams.get("provider")));
      if(req.method === "GET" && route === "jobs"){ const pr = u.searchParams.get("project"), ids = String(u.searchParams.get("ids") || "").split(",").filter(Boolean); return sendJson(res, 200, {jobs:jobs.filter(j => (!pr || j.project === safeId(pr)) && (!ids.length || ids.includes(j.id))).slice(-400).map(pub)}); }
      if(req.method === "POST" && route === "start"){
        let b; try{ b = JSON.parse(await readBody(req, 20e6)); }catch(e){ return sendJson(res, 400, {code:"bad_request", message:"Demande illisible ou image trop lourde."}); }
        const [code, out] = start(b || {}); return sendJson(res, code, out);
      }
      /* Import d'un fichier fait ailleurs (image Gemini, clip Flow, voix) : envoyé tel quel, écrit en flux sur le disque */
      if(req.method === "POST" && route === "upload-file"){
        const mime = String(req.headers["content-type"] || "").split(";")[0].toLowerCase().replace("image/jpg", "image/jpeg"), ext = EXT[mime];
        if(!ext || !/^(image|video|audio)\//.test(mime)) return sendJson(res, 415, {code:"bad_request", message:"Format non accepté : image (PNG, JPEG, WebP), vidéo (MP4, WebM, MOV) ou son (WAV, MP3)."});
        const limit = mime.startsWith("video/") ? 800e6 : 30e6, size = Number(req.headers["content-length"] || 0);
        if(size > limit) return sendJson(res, 413, {code:"input_too_large", message:`Fichier trop lourd (${Math.round(limit / 1e6)} Mo au maximum).`});
        const project = safeId(req.headers["x-project"]), d = path.join(dir, project); fs.mkdirSync(d, {recursive:true});
        const name = `${safeId(req.headers["x-base"] || "import")}-${Date.now().toString(36)}.${ext}`, f = path.join(d, name);
        let n = 0, over = false; const ws = fs.createWriteStream(f);
        req.on("data", c => { n += c.length; if(n > limit && !over){ over = true; req.unpipe(ws); ws.destroy(); fs.rm(f, () => {}); sendJson(res, 413, {code:"input_too_large", message:`Fichier trop lourd (${Math.round(limit / 1e6)} Mo au maximum).`}); req.resume(); } });
        ws.on("finish", () => { if(!over) sendJson(res, 200, {url:`/generated/${project}/${name}`, mime, size:n}); });
        ws.on("error", () => { if(!res.headersSent) sendJson(res, 500, {code:"server_error", message:"Le fichier n'a pas pu être enregistré sur l'ordinateur."}); });
        req.pipe(ws); return;
      }
      if(req.method === "POST" && route === "upload"){
        let b; try{ b = JSON.parse(await readBody(req, 20e6)); }catch(e){ return sendJson(res, 400, {code:"bad_request", message:"Image illisible ou trop lourde (15 Mo au maximum)."}); }
        const img = imageInput(b && b.data); if(!img || !String(b.data).startsWith("data:")) return sendJson(res, 400, {code:"bad_request", message:"Format d'image non accepté : PNG, JPEG ou WebP."});
        return sendJson(res, 200, saveMedia(b.project, b.base || `P${pad(b.plan)}-import`, Buffer.from(img.data, "base64"), img.mime));
      }
      sendJson(res, 404, {code:"not_found", message:"Route de fabrication inconnue."});
    })().catch(e => { console.error(e); if(!res.headersSent) sendJson(res, 500, {code:"server_error", message:"Erreur interne de la fabrication."}); else res.end(); });
    return true;
  }
  return {handle, reserve, refund, billing, status, imagePrice:IMAGE_PRICE, mediaKey:MEDIA_KEY};
};
