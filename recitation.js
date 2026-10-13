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
    const dir = dirOf(id), previousFile=path.join(dir,"analyse.json"), previous=fs.existsSync(previousFile)?JSON.parse(fs.readFileSync(previousFile,"utf8")):null;
    const src = fs.readdirSync(dir).find(f => f.startsWith("source.")), kept=path.join(dir,"voix.m4a"), input=src?path.join(dir,src):kept;
    if(!fs.existsSync(input)) throw Object.assign(new Error("Fichier introuvable : envoie-le de nouveau."), {code:"not_found"});
    const J = jobs[id] = {state:"running", step:"lecture du fichier", progress:0};
    const probe = await ffmpeg(["-i", input, "-f", "null", "-t", "0.1", "-"]).catch(e => e.detail || ""), D = durationOf(String(probe));
    if(!/Audio:/.test(String(probe))) throw Object.assign(new Error("Ce fichier n'a pas de son : il faut une vidéo ou un audio avec la voix."), {code:"no_audio"});
    /* format de la vidéo d'origine (rotation des téléphones comprise) */
    const vm = /Video:[^\n]*?\b(\d{2,5})x(\d{2,5})\b/.exec(String(probe)); let vw = vm ? +vm[1] : Number(previous&&previous.video&&previous.video.w)||0, vh = vm ? +vm[2] : Number(previous&&previous.video&&previous.video.h)||0;
    if(/rotation of -?(90|270)|rotate\s*:\s*(90|270|-90)/.test(String(probe))) [vw, vh] = [vh, vw];
    J.step = src?"extraction de la voix":"nouvelle analyse de la voix"; J.duration = D;
    if(src) await ffmpeg(["-y", "-i", input, "-vn", "-map", "0:a:0", "-ac", "2", "-c:a", "aac", "-b:a", "192k", kept], t => { J.progress = D ? Math.min(.5, t / D * .5) : 0; });
    J.step = "repérage des pauses";
    const log = await ffmpeg(["-i", path.join(dir, "voix.m4a"), "-af", `silencedetect=noise=${noise}dB:d=${minPause}`, "-f", "null", "-"], t => { J.progress = .5 + (D ? Math.min(.5, t / D * .5) : 0); });
    const sil = []; let st = null; String(log).split(/\r?\n/).forEach(l => { const a = /silence_start: (-?\d+(?:\.\d+)?)/.exec(l), b = /silence_end: (\d+(?:\.\d+)?)/.exec(l); if(a) st = Math.max(0, +a[1]); if(b && st != null){ sil.push([st, +b[1]]); st = null; } });
    if(st != null) sil.push([st, D]);
    /* morceaux de parole = entre les silences ; les tout petits bruits (< 0,25 s) sont écartés */
    const speech = []; let cur = 0; sil.forEach(([a, b]) => { if(a - cur >= .25) speech.push({a:+cur.toFixed(2), b:+a.toFixed(2)}); cur = b; }); if(D - cur >= .25) speech.push({a:+cur.toFixed(2), b:+D.toFixed(2)});
    /* 6 images de la vidéo d'origine, petites (pour comparer « avant / après » et laisser l'agent comprendre son design) */
    const apercus = src?[]:((previous&&previous.apercus)||[]).filter(u=>fs.existsSync(path.join(dir,path.basename(String(u)))));
    if(src&&vw && !/^source\.(m4a|mp3|wav|aac|ogg|opus|flac)$/.test(src)){ J.step = "images de la vidéo d'origine";
      for(let i = 0; i < 6; i++){ const name = `apercu-${i + 1}.jpg`; try{ await ffmpeg(["-y", "-ss", String(+(D * (i + .5) / 6).toFixed(2)), "-i", path.join(dir, src), "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "4", path.join(dir, name)]); if(fs.existsSync(path.join(dir, name))) apercus.push(urlOf(id, name)); }catch(e){} } }
    /* la vidéo d'origine n'est plus utile : seule la voix est gardée (place sur le disque) */
    if(src&&!/^source\.(m4a|mp3|wav|aac|ogg|opus|flac)$/.test(src)) try{ fs.rmSync(path.join(dir, src), {force:true}); }catch(e){}
    const result = {id, duration:+D.toFixed(2), audio:urlOf(id, "voix.m4a"), speech, noise, minPause, video:vw ? {w:vw, h:vh} : null, apercus};
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
  async function quranSurah(n, tr, ph){
    const ed = /^[a-z]{2}\.[a-z0-9-]{2,30}$/.test(tr || "") ? tr : "fr.hamidullah", f = path.join(CACHE, `${n}-${ed}${ph ? "-ph" : ""}.json`); if(fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
    /* phonétique (lecture en lettres latines, pour apprendre) : édition en.transliteration, sans la basmala */
    const j = await getJson(`https://api.alquran.cloud/v1/surah/${n}/editions/quran-uthmani,${ed}${ph ? ",en.transliteration" : ""}`), [a, t, pt] = j.data || [];
    if(!a || !a.ayahs) throw new Error("Sourate introuvable.");
    const strip = s => String(s || "").replace(/﻿/g, "").trim();
    const out = {n, ar:a.name, nom:a.englishName, sens:a.englishNameTranslation, traduction:ed, source:"Texte : Tanzil / alquran.cloud (écriture uthmani)" + (t ? ` · Traduction : ${t.edition ? t.edition.name : ed}` : ""),
      versets:a.ayahs.map((v, i) => Object.assign({n:v.numberInSurah, ar:strip(v.text), tr:t && t.ayahs[i] ? strip(t.ayahs[i].text) : ""}, pt && pt.ayahs[i] ? {ph:strip(pt.ayahs[i].text).replace(/<[^>]+>/g, "")} : {}))};
    /* sauf Al-Fatiha (où elle est le verset 1) et At-Tawba, la basmala ouvre le premier verset dans ce texte : on la sépare pour l'afficher comme ouverture */
    if(n !== 1 && n !== 9 && out.versets[0]){ const b = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ", bare = x => String(x).replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, "").replace(/[ٱآأإ]/g, "ا"), w = out.versets[0].ar.split(/\s+/);
      /* comparaison sans les signes de lecture (leur ordre varie selon les textes) : les 4 premiers mots sont-ils la basmala ? */
      if(w.length > 4 && bare(w.slice(0, 4).join(" ")) === bare(b)){ out.basmala = w.slice(0, 4).join(" "); out.versets[0].ar = w.slice(4).join(" "); } else out.basmala = b; }
    fs.mkdirSync(CACHE, {recursive:true}); fs.writeFileSync(f, JSON.stringify(out)); return out;
  }

  /* ---------- 3 bis. reconnaissance : quelle sourate, quels versets ? Le texte entendu (Gemini ou Whisper) est comparé au Coran complet,
     écriture simple sans voyelles, par groupes de 2 et 3 mots qui « votent » pour une position. Résiste aux mots mal entendus. ---------- */
  const NORM = t => String(t || "").replace(/\uFEFF/g, "").replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, "").replace(/[ٱأإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي").replace(/ء/g, "").replace(/[^\u0621-\u064A\s]/g, " ").split(/\s+/).filter(Boolean);
  const BASM = NORM("بسم الله الرحمن الرحيم"), ISTI = NORM("أعوذ بالله من الشيطان الرجيم");
  let CORPUS = null;
  async function corpus(){
    if(CORPUS) return CORPUS;
    const f = path.join(CACHE, "quran-simple-clean.json"); let rows;
    if(fs.existsSync(f)) rows = JSON.parse(fs.readFileSync(f, "utf8"));
    else{ const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 90000); let j; try{ const r = await fetch("https://api.alquran.cloud/v1/quran/quran-simple-clean", {signal:ctl.signal}); if(!r.ok) throw new Error(`HTTP ${r.status}`); j = await r.json(); } finally{ clearTimeout(t); }
      rows = []; (j.data.surahs || []).forEach(su => su.ayahs.forEach(a => rows.push([su.number, a.numberInSurah, String(a.text || "")])));
      fs.mkdirSync(CACHE, {recursive:true}); fs.writeFileSync(f, JSON.stringify(rows)); }
    const words = [], verse = [], last = {}, g2 = new Map(), g3 = new Map();
    rows.forEach(([su, v, text], k) => { let w = NORM(text); if(v === 1 && su !== 1 && w.slice(0, 4).join(" ") === BASM.join(" ")) w = w.slice(4); w.forEach(x => { words.push(x); verse.push(k); }); last[su] = v; });
    const add = (m, key, p) => { const a = m.get(key); if(a) a.push(p); else m.set(key, [p]); };
    for(let i = 0; i + 1 < words.length; i++){ add(g2, words[i] + " " + words[i + 1], i); if(i + 2 < words.length) add(g3, words[i] + " " + words[i + 1] + " " + words[i + 2], i); }
    return CORPUS = {rows, words, verse, last, g2, g3};
  }
  const strip = (q, seq) => { for(let i = 0; i <= Math.min(12, q.length - seq.length); i++) if(seq.every((w, k) => q[i + k] === w)) return [q.slice(0, i).concat(q.slice(i + seq.length)), true]; return [q, false]; };
  async function quranFind(texte){
    const C = await corpus(); let q = NORM(texte), isti, basm; [q, isti] = strip(q, ISTI); [q, basm] = strip(q, BASM);
    if(q.length < 3) return {ok:false, isti, basm, mots:q.length};
    const votes = new Map(), vote = (off, n) => votes.set(off, (votes.get(off) || 0) + n), hits = [];
    for(let i = 0; i + 1 < q.length; i++){ const p2 = C.g2.get(q[i] + " " + q[i + 1]) || []; if(p2.length < 400) p2.forEach(p => { vote(p - i, 1); hits.push([p, i, 2]); });
      if(i + 2 < q.length){ const p3 = C.g3.get(q[i] + " " + q[i + 1] + " " + q[i + 2]) || []; p3.forEach(p => { vote(p - i, 2); hits.push([p, i, 3]); }); } }
    let best = null, bv = 0; for(const [off] of votes){ let v = 0; for(let d = -4; d <= 4; d++) v += votes.get(off + d) || 0; if(v > bv){ bv = v; best = off; } }
    if(best == null) return {ok:false, isti, basm, mots:q.length};
    const near = hits.filter(([p, i]) => Math.abs(p - i - best) <= 8); if(!near.length) return {ok:false, isti, basm, mots:q.length};
    const p0 = Math.min(...near.map(h => h[0])), p1 = Math.max(...near.map(h => h[0] + h[2] - 1)), r0 = C.rows[C.verse[p0]], r1 = C.rows[C.verse[p1]];
    const score = +(bv / Math.max(1, 3 * (q.length - 2))).toFixed(2), ok = bv >= 6 && score >= .12;
    return {ok, score, isti, basm, mots:q.length, debut:{s:r0[0], v:r0[1]}, fin:{s:r1[0], v:r1[1]}, versets:C.last};
  }

  /* ---------- 3 ter. extrait de la voix (16 kHz, mono, WAV) : pour l'écoute par Gemini ou par le moteur gratuit ---------- */
  function extrait(req, res, u){
    const id = u.searchParams.get("id"), a = Math.max(0, Number(u.searchParams.get("a")) || 0), b = Number(u.searchParams.get("b")), f = okId(id) && path.join(dirOf(id), "voix.m4a");
    if(!f || !(b > a) || b - a > 330 || !fs.existsSync(f)) return json(res, 400, {code:"bad_request", message:"Extrait invalide (330 s au plus)."});
    const p = spawn(FFMPEG_PATH, ["-hide_banner", "-nostdin", "-loglevel", "error", "-ss", String(a), "-t", String(+(b - a).toFixed(2)), "-i", f, "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", "-map_metadata", "-1", "-fflags", "+bitexact", "-f", "wav", "pipe:1"], {windowsHide:true, stdio:["ignore", "pipe", "ignore"]});
    const bufs = []; p.stdout.on("data", c => bufs.push(c)); p.once("error", () => { if(!res.headersSent) json(res, 500, {code:"ffmpeg_missing", message:"FFmpeg introuvable."}); });
    p.once("close", () => { if(res.headersSent) return; const w = Buffer.concat(bufs); if(w.length < 44) return json(res, 500, {code:"server_error", message:"Extrait vide."});
      /* tailles du WAV corrigées (FFmpeg ne peut pas revenir en arrière dans un flux) */
      w.writeUInt32LE(w.length - 8, 4); const d = w.indexOf("data", 12, "ascii"); if(d > 0) w.writeUInt32LE(w.length - d - 8, d + 4);
      res.writeHead(200, {"Content-Type":"audio/wav", "Content-Length":w.length, "Cache-Control":"no-store"}); res.end(w); });
    req.on("close", () => { try{ p.kill(); }catch(e){} });
  }

  /* ---------- 3 quater. énergie de la voix toutes les 40 ms (0 à 100) : les lèvres de l'avatar suivent la vraie voix ---------- */
  async function envelope(id){
    const dir = dirOf(id), f = path.join(dir, "enveloppe.json"); if(fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
    const voix = path.join(dir, "voix.m4a"); if(!fs.existsSync(voix)) throw Object.assign(new Error("Voix introuvable."), {code:"not_found"});
    const v = await new Promise((resolve, reject) => {
      const p = spawn(FFMPEG_PATH, ["-hide_banner", "-nostdin", "-i", voix, "-af", "aresample=8000,asetnsamples=n=320:p=0,astats=metadata=1:reset=1,ametadata=mode=print:key=lavfi.astats.Overall.RMS_level:file=-", "-f", "null", "-"], {windowsHide:true, stdio:["ignore", "pipe", "ignore"]});
      let buf = ""; const out = [];
      p.stdout.on("data", d => { buf += d; let i; while((i = buf.indexOf("\n")) >= 0){ const l = buf.slice(0, i); buf = buf.slice(i + 1); const m = /RMS_level=(-?[\d.]+|-inf)/.exec(l); if(m){ const db = m[1] === "-inf" ? -100 : +m[1]; out.push(Math.max(0, Math.min(100, Math.round((db + 52) / 42 * 100)))); } } });
      p.once("error", reject); p.once("close", c => c === 0 ? resolve(out) : reject(new Error("Analyse de la voix impossible.")));
    });
    const res = {step:.04, v}; fs.writeFileSync(f, JSON.stringify(res)); return res;
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
    const J = jobs[rid] = {state:"running", step:"la voix est finalisée", progress:0}, D = Number(o.duration) || 0, amb = o.ambiance && fs.existsSync(path.join(dir, "ambiance.wav")), vol = Math.max(0, Math.min(.4, Number(o.volume) || .1));
    const voice = ["original","studio","warm","deep","airy"].includes(o.voix) ? o.voix : "original";
    const voiceFx = {
      studio:"highpass=f=70,lowpass=f=12500,afftdn=nf=-28,dynaudnorm=f=250:g=7:p=0.9,acompressor=threshold=-18dB:ratio=2.2:attack=15:release=180:makeup=1.5",
      warm:"highpass=f=60,equalizer=f=180:t=q:w=0.8:g=3,equalizer=f=3200:t=q:w=1:g=-1.5,acompressor=threshold=-20dB:ratio=2:attack=20:release=220:makeup=1.4",
      deep:"highpass=f=45,bass=g=4:f=120:w=0.6,equalizer=f=250:t=q:w=1:g=2,treble=g=-1:f=5000,acompressor=threshold=-19dB:ratio=2.3:attack=18:release=240:makeup=1.4",
      airy:"highpass=f=85,equalizer=f=250:t=q:w=0.9:g=-1.5,treble=g=3.5:f=6500,acompressor=threshold=-18dB:ratio=1.8:attack=12:release=160:makeup=1.3"
    }[voice] || "";
    const N = Math.max(1, Math.min(500, Math.round(Number(o.repeat) || 1))), T = D * N;
    const name = `${String(o.nom || "recitation").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) || "recitation"}${N > 1 ? `-x${N}` : ""}-${rid}.mp4`, out = path.join(dir, name);
    const loop = N > 1 ? ["-stream_loop", String(N - 1)] : [];
    const args = ["-y", ...loop, "-i", img, ...loop, "-i", voix]; if(amb) args.push("-stream_loop", "-1", "-i", path.join(dir, "ambiance.wav"));
    const vf = voiceFx ? `[1:a]${voiceFx}[v];` : "";
    const vin = voiceFx ? "[v]" : "[1:a]";
    if(amb) args.push("-filter_complex", `${vf}[2:a]volume=${vol},afade=t=in:d=3[b];${vin}[b]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]`, "-map", "0:v", "-map", "[a]", "-c:a", "aac", "-b:a", "192k");
    else if(voiceFx) args.push("-filter_complex", `${vf.slice(0,-1)}`, "-map", "0:v", "-map", "[v]", "-c:a", "aac", "-b:a", "192k");
    else args.push("-map", "0:v", "-map", "1:a", ...(N > 1 ? ["-c:a", "aac", "-b:a", "192k"] : ["-c:a", "copy"]));
    args.push("-c:v", "copy", "-shortest"); if(N > 1 && T) args.push("-t", String(+T.toFixed(3))); if(!T || T <= 3600) args.push("-movflags", "+faststart"); args.push(out);
    await ffmpeg(args, t => { J.progress = T ? Math.min(.99, t / T) : 0; });
    try{ fs.rmSync(img, {force:true}); }catch(e){}
    Object.assign(J, {state:"done", step:"", progress:1, result:{url:urlOf(id, name), name, size:fs.statSync(out).size}});
  }
  /* découpage en parties : chaque partie commence sur une image clé posée exprès au début d'un verset → coupe exacte, sans réencodage */
  async function split(id, sid, file, parts){
    const dir = dirOf(id), inp = path.join(dir, file); if(!fs.existsSync(inp)) throw new Error("Vidéo introuvable.");
    const J = jobs[sid] = {state:"running", step:"découpage", progress:0}, base = file.replace(/\.mp4$/i, ""), out = [];
    for(let k = 0; k < parts.length; k++){ const [a, b] = parts[k], name = `${base}-partie-${k + 1}-sur-${parts.length}.mp4`;
      await ffmpeg(["-y", "-ss", String(a), "-i", inp, "-t", String(+(b - a).toFixed(3)), "-map", "0", "-c", "copy", "-avoid_negative_ts", "make_zero", "-movflags", "+faststart", path.join(dir, name)]);
      out.push({url:urlOf(id, name), name, size:fs.statSync(path.join(dir, name)).size, a, b}); J.progress = (k + 1) / parts.length; J.step = `partie ${k + 1} sur ${parts.length}`; }
    Object.assign(J, {state:"done", step:"", progress:1, result:{parts:out}}); }
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
      if(req.method === "POST" && r === "quran/find"){ const b = await body(); if(!b || typeof b.texte !== "string") return json(res, 400, {code:"bad_request", message:"Texte manquant."}); return json(res, 200, await quranFind(b.texte.slice(0, 20000))); }
      if(req.method === "GET" && r === "extrait") return extrait(req, res, u);
      if(req.method === "GET" && r === "env"){ const id = u.searchParams.get("id"); if(!okId(id) || !fs.existsSync(dirOf(id))) return json(res, 400, {code:"bad_request", message:"Projet inconnu."}); return json(res, 200, await envelope(id)); }
      if(req.method === "GET" && r === "quran/surah"){ const n = Math.round(Number(u.searchParams.get("n"))); if(!(n >= 1 && n <= 114)) return json(res, 400, {code:"bad_request", message:"Numéro de sourate : de 1 à 114."}); return json(res, 200, await quranSurah(n, u.searchParams.get("tr"), u.searchParams.get("ph") === "1")); }
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
      if(req.method === "POST" && r === "split"){ const b = await body(), parts = b && Array.isArray(b.parts) ? b.parts.filter(x => Array.isArray(x) && x[1] > x[0] && x[0] >= 0).slice(0, 400) : [];
        if(!b || !okId(b.id) || !/^[A-Za-z0-9_-]{1,120}\.mp4$/.test(String(b.file || "")) || parts.length < 2) return json(res, 400, {code:"bad_request", message:"Découpage invalide."});
        const sid = crypto.randomBytes(5).toString("hex"); jobs[sid] = {state:"running", step:"démarrage", progress:0}; start(sid, () => split(b.id, sid, b.file, parts)); return json(res, 200, {job:sid}); }
      json(res, 404, {code:"not_found", message:"Route inconnue."});
    })().catch(e => { if(!res.headersSent) json(res, 502, {code:e.code || "server_error", message:e.message || "Erreur du serveur."}); });
    return true;
  }
  return {handle};
};
