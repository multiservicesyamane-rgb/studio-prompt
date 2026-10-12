"use strict";
/* Studio Prompt : « Garder la voix, refaire l'image » (récitations, conférences, lectures… jusqu'à plusieurs heures).
   - Réception du fichier (sans limite pratique de taille, écrit au fil de l'eau) ; seule la voix est gardée (la vidéo d'origine est supprimée).
   - Analyse par FFmpeg : durée, voix extraite (AAC), pauses (silencedetect) → morceaux de parole. Avancement suivi.
   - Texte du Coran (écriture uthmani) et traduction depuis l'API publique alquran.cloud, gardés en cache sur l'ordinateur.
   - Vidéo refaite reçue morceau par morceau (écrite à sa position), puis FFmpeg y remet la voix d'origine (+ ambiance facultative, très douce).
   Tout est local et gratuit. Aucune clé. */
const fs = require("fs"), path = require("path"), {spawn} = require("child_process"), crypto = require("crypto");

module.exports = function createRecitation({GENERATED, FFMPEG_PATH, sendJson, readBody, DATA}){
  const ROOT = path.join(GENERATED), CACHE = path.join(DATA || path.join(GENERATED, "_textes"), "coran");
  const jobs = {};   /* id → {state, step, progress, result, error} (analyses et finitions) */
  const okId = v => /^[a-z0-9]{6,32}$/.test(String(v || ""));
  const dirOf = id => path.join(ROOT, `recit-${id}`);
  const urlOf = (id, name) => `/generated/recit-${id}/${name}`;
  const json = (res, code, o) => sendJson(res, code, o);

  /* FFmpeg avec suivi de l'avancement (« time=… ») */
  function ffmpeg(args, onTime){
    return new Promise((resolve, reject) => {
      if(!FFMPEG_PATH || !fs.existsSync(FFMPEG_PATH)) return reject(Object.assign(new Error("FFmpeg n'est pas installé sur ce serveur."), {code:"ffmpeg_missing"}));
      let log = ""; const p = spawn(FFMPEG_PATH, ["-hide_banner", "-nostdin", ...args], {windowsHide:true, shell:false, stdio:["ignore", "ignore", "pipe"]});
      p.stderr.on("data", b => { const s = b.toString("utf8"); log = (log + s).slice(-200000); const m = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(s); if(m && onTime) onTime(+m[1] * 3600 + +m[2] * 60 + +m[3]); });
      p.once("error", e => reject(e));
      p.once("close", code => code === 0 ? resolve(log) : reject(Object.assign(new Error(`FFmpeg a échoué (code ${code}).`), {detail:log.slice(-1500)})));
    });
  }
  const durationOf = log => { const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(log); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0; };

  /* ---------- 1. réception du fichier ---------- */
  function upload(req, res, u){
    const id = crypto.randomBytes(6).toString("hex"), dir = dirOf(id), ext = (String(u.searchParams.get("name") || "").match(/\.([a-z0-9]{2,5})$/i) || [, "bin"])[1].toLowerCase();
    if(!/^(mp4|mov|webm|mkv|m4a|mp3|wav|aac|ogg|opus|flac|3gp|avi)$/.test(ext)) return json(res, 400, {code:"bad_request", message:"Format non accepté : vidéo (mp4, mov, webm, mkv…) ou audio (mp3, m4a, wav…)."});
    fs.mkdirSync(dir, {recursive:true}); const file = path.join(dir, `source.${ext}`), out = fs.createWriteStream(file); let size = 0, failed = false;
    req.on("data", c => { size += c.length; if(size > 20e9 && !failed){ failed = true; req.destroy(); out.destroy(); fs.rm(dir, {recursive:true, force:true}, () => {}); json(res, 413, {code:"too_large", message:"Fichier trop gros (20 Go au plus)."}); } });
    req.pipe(out); out.on("finish", () => { if(!failed) json(res, 200, {id, size, name:`source.${ext}`}); });
    out.on("error", e => { if(!failed){ failed = true; json(res, 500, {code:"disk", message:"Écriture impossible (disque plein ?)."}); } });
  }

  /* ---------- 2. analyse : voix gardée, pauses repérées ---------- */
  async function analyze(id, noise, minPause){
    const dir = dirOf(id), src = fs.readdirSync(dir).find(f => f.startsWith("source.")); if(!src) throw Object.assign(new Error("Fichier introuvable : envoie-le de nouveau."), {code:"not_found"});
    const J = jobs[id] = {state:"running", step:"lecture du fichier", progress:0};
    const probe = await ffmpeg(["-i", path.join(dir, src), "-f", "null", "-t", "0.1", "-"]).catch(e => e.detail || ""), D = durationOf(String(probe));
    if(!/Audio:/.test(String(probe))) throw Object.assign(new Error("Ce fichier n'a pas de son : il faut une vidéo ou un audio avec la voix."), {code:"no_audio"});
    J.step = "extraction de la voix"; J.duration = D;
    await ffmpeg(["-y", "-i", path.join(dir, src), "-vn", "-map", "0:a:0", "-ac", "2", "-c:a", "aac", "-b:a", "192k", path.join(dir, "voix.m4a")], t => { J.progress = D ? Math.min(.5, t / D * .5) : 0; });
    J.step = "repérage des pauses";
    const log = await ffmpeg(["-i", path.join(dir, "voix.m4a"), "-af", `silencedetect=noise=${noise}dB:d=${minPause}`, "-f", "null", "-"], t => { J.progress = .5 + (D ? Math.min(.5, t / D * .5) : 0); });
    const sil = []; let st = null; String(log).split(/\r?\n/).forEach(l => { const a = /silence_start: (-?\d+(?:\.\d+)?)/.exec(l), b = /silence_end: (\d+(?:\.\d+)?)/.exec(l); if(a) st = Math.max(0, +a[1]); if(b && st != null){ sil.push([st, +b[1]]); st = null; } });
    if(st != null) sil.push([st, D]);
    /* morceaux de parole = entre les silences ; les tout petits bruits (< 0,25 s) sont écartés */
    const speech = []; let cur = 0; sil.forEach(([a, b]) => { if(a - cur >= .25) speech.push({a:+cur.toFixed(2), b:+a.toFixed(2)}); cur = b; }); if(D - cur >= .25) speech.push({a:+cur.toFixed(2), b:+D.toFixed(2)});
    /* la vidéo d'origine n'est plus utile : seule la voix est gardée (place sur le disque) */
    if(!/^source\.(m4a|mp3|wav|aac|ogg|opus|flac)$/.test(src)) try{ fs.rmSync(path.join(dir, src), {force:true}); }catch(e){}
    const result = {id, duration:+D.toFixed(2), audio:urlOf(id, "voix.m4a"), speech, noise, minPause};
    fs.writeFileSync(path.join(dir, "analyse.json"), JSON.stringify(result));
    Object.assign(J, {state:"done", step:"", progress:1, result});
    return result;
  }

  /* ---------- 3. texte du Coran (alquran.cloud), en cache ---------- */
  async function getJson(url){ const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 20000); try{ const r = await fetch(url, {signal:ctl.signal}); if(!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json(); } finally{ clearTimeout(t); } }
  async function quranList(){
    const f = path.join(CACHE, "liste.json"); if(fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
    const j = await getJson("https://api.alquran.cloud/v1/surah"), list = (j.data || []).map(s => ({n:s.number, ar:s.name, nom:s.englishName, sens:s.englishNameTranslation, versets:s.numberOfAyahs}));
    fs.mkdirSync(CACHE, {recursive:true}); fs.writeFileSync(f, JSON.stringify(list)); return list;
  }
  async function quranSurah(n, tr){
    const ed = /^[a-z]{2}\.[a-z0-9-]{2,30}$/.test(tr || "") ? tr : "fr.hamidullah", f = path.join(CACHE, `${n}-${ed}.json`); if(fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
    const j = await getJson(`https://api.alquran.cloud/v1/surah/${n}/editions/quran-uthmani,${ed}`), [a, t] = j.data || [];
    if(!a || !a.ayahs) throw new Error("Sourate introuvable.");
    const strip = s => String(s || "").replace(/﻿/g, "").trim();
    const out = {n, ar:a.name, nom:a.englishName, sens:a.englishNameTranslation, traduction:ed, source:"Texte : Tanzil / alquran.cloud (écriture uthmani)" + (t ? ` · Traduction : ${t.edition ? t.edition.name : ed}` : ""),
      versets:a.ayahs.map((v, i) => ({n:v.numberInSurah, ar:strip(v.text), tr:t && t.ayahs[i] ? strip(t.ayahs[i].text) : ""}))};
    /* sauf Al-Fatiha (où elle est le verset 1) et At-Tawba, la basmala ouvre le premier verset dans ce texte : on la sépare pour l'afficher comme ouverture */
    if(n !== 1 && n !== 9 && out.versets[0]){ const b = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", bare = x => String(x).replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, "").replace(/[ٱآأإ]/g, "ا"), w = out.versets[0].ar.split(/\s+/);
      /* comparaison sans les signes de lecture (leur ordre varie selon les textes) : les 4 premiers mots sont-ils la basmala ? */
      if(w.length > 4 && bare(w.slice(0, 4).join(" ")) === bare(b)){ out.basmala = w.slice(0, 4).join(" "); out.versets[0].ar = w.slice(4).join(" "); } else out.basmala = b; }
    fs.mkdirSync(CACHE, {recursive:true}); fs.writeFileSync(f, JSON.stringify(out)); return out;
  }

  /* ---------- 4. projet (pour l'écran de direct), liste des projets, place libre sur le disque ---------- */
  function saveProject(id, body){ fs.writeFileSync(path.join(dirOf(id), "projet.json"), JSON.stringify(body)); }
  function list(){
    if(!fs.existsSync(ROOT)) return [];
    return fs.readdirSync(ROOT).filter(d => /^recit-[a-f0-9]{12}$/.test(d)).map(d => {
      const dir = path.join(ROOT, d), id = d.slice(6); let an = null, pj = null;
      try{ an = JSON.parse(fs.readFileSync(path.join(dir, "analyse.json"), "utf8")); }catch(e){ return null; }
      try{ pj = JSON.parse(fs.readFileSync(path.join(dir, "projet.json"), "utf8")); }catch(e){}
      const videos = fs.readdirSync(dir).filter(f => /\.mp4$/i.test(f) && !/^(image-|source\.)/.test(f)).map(f => ({url:urlOf(id, f), name:f, size:fs.statSync(path.join(dir, f)).size}));
      return {id, nom:(pj && pj.nom) || "", duration:an.duration, at:fs.statSync(dir).mtimeMs, projet:!!pj, videos};
    }).filter(Boolean).sort((a, b) => b.at - a.at).slice(0, 60);
  }
  const freeBytes = () => { try{ fs.mkdirSync(ROOT, {recursive:true}); const st = fs.statfsSync(ROOT); return st.bavail * st.bsize; }catch(e){ return null; } };

  /* ---------- 5. vidéo refaite : morceaux écrits à leur place, puis la voix d'origine (+ ambiance) ---------- */
  function chunk(req, res, u){
    const id = u.searchParams.get("id"), rid = u.searchParams.get("rid"), pos = Number(u.searchParams.get("pos"));
    if(!okId(id) || !okId(rid) || !Number.isFinite(pos) || pos < 0 || pos > 20e9 || !fs.existsSync(dirOf(id))) return json(res, 400, {code:"bad_request", message:"Morceau de vidéo invalide."});
    const bufs = []; let size = 0; req.on("data", c => { size += c.length; if(size <= 96e6) bufs.push(c); });
    req.on("end", () => { if(size > 96e6) return json(res, 413, {code:"too_large", message:"Morceau trop gros."});
      const f = path.join(dirOf(id), `image-${rid}.mp4`), fd = fs.openSync(f, fs.existsSync(f) ? "r+" : "w+"); try{ fs.writeSync(fd, Buffer.concat(bufs), 0, size, pos); } finally{ fs.closeSync(fd); } json(res, 200, {ok:true}); });
  }
  function ambient(req, res, u){
    const id = u.searchParams.get("id"); if(!okId(id) || !fs.existsSync(dirOf(id))) return json(res, 400, {code:"bad_request", message:"Projet inconnu."});
    const out = fs.createWriteStream(path.join(dirOf(id), "ambiance.wav")); let size = 0; req.on("data", c => { size += c.length; if(size > 60e6) req.destroy(); }); req.pipe(out); out.on("finish", () => json(res, 200, {ok:true}));
  }
  async function finish(id, rid, o){
    const dir = dirOf(id), img = path.join(dir, `image-${rid}.mp4`), voix = path.join(dir, "voix.m4a"); if(!fs.existsSync(img) || !fs.existsSync(voix)) throw new Error("Vidéo ou voix introuvable.");
    const J = jobs[rid] = {state:"running", step:"la voix d'origine est remise", progress:0}, D = Number(o.duration) || 0, amb = o.ambiance && fs.existsSync(path.join(dir, "ambiance.wav")), vol = Math.max(0, Math.min(.4, Number(o.volume) || .1));
    const name = `${String(o.nom || "recitation").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "recitation"}-${rid}.mp4`, out = path.join(dir, name);
    const args = ["-y", "-i", img, "-i", voix]; if(amb) args.push("-stream_loop", "-1", "-i", path.join(dir, "ambiance.wav"));
    if(amb) args.push("-filter_complex", `[2:a]volume=${vol},afade=t=in:d=3[b];[1:a][b]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]`, "-map", "0:v", "-map", "[a]", "-c:a", "aac", "-b:a", "192k");
    else args.push("-map", "0:v", "-map", "1:a", "-c:a", "copy");
    args.push("-c:v", "copy", "-shortest"); if(!D || D <= 3600) args.push("-movflags", "+faststart"); args.push(out);
    await ffmpeg(args, t => { J.progress = D ? Math.min(.99, t / D) : 0; });
    try{ fs.rmSync(img, {force:true}); }catch(e){}
    Object.assign(J, {state:"done", step:"", progress:1, result:{url:urlOf(id, name), name, size:fs.statSync(out).size}});
  }
  const start = (key, fn) => { fn().catch(e => { jobs[key] = Object.assign(jobs[key] || {}, {state:"failed", step:"", error:e.message || String(e), code:e.code || "server_error"}); }); };

  function handle(req, res){
    const u = new URL(req.url, "http://x"), p = u.pathname; if(!p.startsWith("/api/recit/")) return false;
    const r = p.slice("/api/recit/".length), body = async lim => { try{ return JSON.parse(await readBody(req, lim || 4e6) || "{}"); }catch(e){ return null; } };
    (async () => {
      if(req.method === "POST" && r === "upload") return upload(req, res, u);
      if(req.method === "POST" && r === "analyze"){ const b = await body(); if(!b || !okId(b.id) || !fs.existsSync(dirOf(b.id))) return json(res, 400, {code:"bad_request", message:"Projet inconnu."});
        const noise = Math.max(-60, Math.min(-15, Math.round(Number(b.noise) || -35))), minPause = Math.max(.15, Math.min(3, Number(b.minPause) || .45));
        jobs[b.id] = {state:"running", step:"démarrage", progress:0}; start(b.id, () => analyze(b.id, noise, minPause)); return json(res, 200, {job:b.id}); }
      if(req.method === "GET" && r === "status"){ const id = u.searchParams.get("id"); if(!okId(id)) return json(res, 400, {code:"bad_request", message:"Identifiant invalide."});
        const J = jobs[id]; if(J) return json(res, 200, J); const f = path.join(dirOf(id), "analyse.json"); return fs.existsSync(f) ? json(res, 200, {state:"done", progress:1, result:JSON.parse(fs.readFileSync(f, "utf8"))}) : json(res, 404, {code:"not_found", message:"Rien en cours."}); }
      if(req.method === "GET" && r === "quran/list") return json(res, 200, {sourates:await quranList()});
      if(req.method === "GET" && r === "quran/surah"){ const n = Math.round(Number(u.searchParams.get("n"))); if(!(n >= 1 && n <= 114)) return json(res, 400, {code:"bad_request", message:"Numéro de sourate : de 1 à 114."}); return json(res, 200, await quranSurah(n, u.searchParams.get("tr"))); }
      if(req.method === "POST" && r === "project"){ const b = await body(40e6); if(!b || !okId(b.id) || !fs.existsSync(dirOf(b.id))) return json(res, 400, {code:"bad_request", message:"Projet inconnu."}); saveProject(b.id, b); return json(res, 200, {ok:true}); }
      if(req.method === "GET" && r === "project"){ const id = u.searchParams.get("id"), f = okId(id) && path.join(dirOf(id), "projet.json"); if(!f || !fs.existsSync(f)) return json(res, 404, {code:"not_found", message:"Projet introuvable."}); return json(res, 200, JSON.parse(fs.readFileSync(f, "utf8"))); }
      if(req.method === "POST" && r === "render/start"){ const b = await body(); if(!b || !okId(b.id) || !fs.existsSync(dirOf(b.id))) return json(res, 400, {code:"bad_request", message:"Projet inconnu."}); return json(res, 200, {rid:crypto.randomBytes(5).toString("hex"), libre:freeBytes()}); }
      if(req.method === "GET" && r === "list") return json(res, 200, {projets:list(), libre:freeBytes()});
      /* suppression d'un projet (voix, vidéos) pour libérer de la place */
      if(req.method === "POST" && r === "delete"){ const b = await body(); if(!b || !okId(b.id) || !fs.existsSync(dirOf(b.id))) return json(res, 400, {code:"bad_request", message:"Projet inconnu."}); fs.rmSync(dirOf(b.id), {recursive:true, force:true}); return json(res, 200, {ok:true, libre:freeBytes()}); }
      if(req.method === "PUT" && r === "render/chunk") return chunk(req, res, u);
      if(req.method === "PUT" && r === "ambiance") return ambient(req, res, u);
      if(req.method === "POST" && r === "render/finish"){ const b = await body(); if(!b || !okId(b.id) || !okId(b.rid)) return json(res, 400, {code:"bad_request", message:"Paramètres invalides."});
        jobs[b.rid] = {state:"running", step:"démarrage", progress:0}; start(b.rid, () => finish(b.id, b.rid, b)); return json(res, 200, {job:b.rid}); }
      json(res, 404, {code:"not_found", message:"Route inconnue."});
    })().catch(e => { if(!res.headersSent) json(res, 502, {code:e.code || "server_error", message:e.message || "Erreur du serveur."}); });
    return true;
  }
  return {handle};
};
