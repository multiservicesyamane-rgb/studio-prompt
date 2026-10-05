/*
  Studio Prompt · serveur local (Node 18 ou plus récent, aucune dépendance)
  - sert l'application (dossier public/)
  - reçoit les demandes des agents sur /api/sample et les envoie à Gemini ou à Claude
  - la clé API reste ici, dans le fichier .env : elle n'est jamais envoyée au navigateur
  Lancer : npm start   puis ouvrir http://localhost:3000
*/
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

/* ---------- .env ---------- */
(function loadEnv(){
  const f = path.join(__dirname, ".env");
  if(!fs.existsSync(f)) return;
  for(const line of fs.readFileSync(f, "utf8").split(/\r?\n/)){
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if(m && !line.trim().startsWith("#") && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
})();

const PORT = Number(process.env.PORT) || 3000;
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const PROVIDER = (process.env.PROVIDER || (GEMINI_KEY ? "gemini" : OPENAI_KEY ? "openai" : ANTHROPIC_KEY ? "anthropic" : "")).toLowerCase();
const GEMINI_BASE = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
const ANTHROPIC_BASE = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1";
const OPENAI_BASE = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
/* OpenAI (Responses API). « Meilleur » (Idées, Veille, Story time, qualité Maximale) = GPT-6.1 Sol en réflexion maximale ;
   le reste du temps OpenAI ne sert que de secours. Modèle et effort réglables dans .env. */
const openaiModel = best => best ? (process.env.OPENAI_MODEL_BEST || "gpt-6.1-sol") : (process.env.OPENAI_MODEL || "gpt-6.1-sol");
const openaiEffort = best => best ? (process.env.OPENAI_EFFORT_BEST || "max") : (process.env.OPENAI_EFFORT || "medium");
/* Sans crédits pour Sol, le relais OpenAI est Luna (recherche web comprise) ; on revérifie Sol toutes les 30 minutes */
const OPENAI_FALLBACK = process.env.OPENAI_MODEL_FALLBACK || "gpt-6-luna";
let openaiSolBlockedUntil = 0, openaiAllBlockedUntil = 0;   // Sol sans crédits ; plus aucun crédit OpenAI
let lunaOk = false;   // Sol sans crédits mais Luna répond : Luna remplace le modèle de secours de Gemini (Flash-Lite)
const CREDIT_RE = /insufficient_quota|credit_balance|no credits|exceeded your current quota|billing/i;
async function probeOpenAI(){
  if(!OPENAI_KEY) return;
  try{
    const r = await fetch(`${OPENAI_BASE}/responses`, {method:"POST", headers:{"Content-Type":"application/json", "Authorization":`Bearer ${OPENAI_KEY}`},
      body:JSON.stringify({model:openaiModel(true), input:"OK", max_output_tokens:16, reasoning:{effort:"low"}})});
    const j = await r.json().catch(() => ({}));
    const e = j.error ? `${j.error.code || ""} ${j.error.type || ""} ${j.error.message || ""}` : "";
    if(e && CREDIT_RE.test(e)){
      openaiSolBlockedUntil = Date.now() + 30 * 60 * 1000;
      /* Sol sans crédits : Luna répond-il encore ? */
      const r2 = await fetch(`${OPENAI_BASE}/responses`, {method:"POST", headers:{"Content-Type":"application/json", "Authorization":`Bearer ${OPENAI_KEY}`}, body:JSON.stringify({model:OPENAI_FALLBACK, input:"OK", max_output_tokens:16, reasoning:{effort:"low"}})});
      const j2 = await r2.json().catch(() => ({}));
      lunaOk = r2.ok && !j2.error;
      if(lunaOk){ openaiAllBlockedUntil = 0; console.log(`OpenAI : ${openaiModel(true)} sans crédits ; ${OPENAI_FALLBACK} répond et sert de relais quand les bons modèles Gemini sont épuisés.`); }
      else { openaiAllBlockedUntil = Date.now() + 30 * 60 * 1000; console.log("OpenAI : compte API sans crédits, relais direct par Gemini ou Anthropic pendant 30 minutes."); }
    }
    else if(!e){ if(openaiSolBlockedUntil || openaiAllBlockedUntil) console.log(`OpenAI ${openaiModel(true)} : crédits disponibles.`); openaiSolBlockedUntil = 0; openaiAllBlockedUntil = 0; lunaOk = true; }
  }catch(err){}
}
const MAX_OUT = Number(process.env.MAX_OUTPUT_TOKENS) || 60000;   // un master découpé scène par scène peut être long
const PUBLIC = path.join(__dirname, "public");

/* Modèles de secours quand le quota du jour d'un modèle est atteint (chaque modèle a son propre quota) */
const GEMINI_FALLBACKS = (process.env.GEMINI_FALLBACKS || "gemini-3-flash-preview,gemini-2.5-flash,gemini-3.1-flash-lite-preview").split(",").map(x => x.trim()).filter(Boolean);
const geminiBlocked = new Map();   // modèle → heure (ms) où son quota revient
const geminiBusy = new Map();      // modèle surchargé chez Google → heure (ms) où on le réessaie
const BUSY_RE = /high demand|overloaded|UNAVAILABLE|try again later/i;
const BUSY_MSG = "Gemini est surchargé en ce moment (trop de demandes chez Google) : réessaie dans une minute.";
/* Heure où le premier modèle Gemini bloqué retrouve son quota (sans compter la recherche web) */
function geminiResetText(){
  const now = Date.now(), t = [...geminiBlocked.entries()].filter(([k, v]) => !k.endsWith("|recherche") && v > now).map(([, v]) => v);
  return t.length ? new Date(Math.min(...t)).toLocaleTimeString("fr-FR", {hour:"2-digit", minute:"2-digit"}) : "";
}

/* ---------- choix automatique du modèle Gemini le plus récent ---------- */
const models = {default: process.env.GEMINI_MODEL || "", complex: process.env.GEMINI_MODEL_PRO || ""};
async function geminiModels(){
  if(models.default && models.complex) return models;
  try{
    const r = await fetch(`${GEMINI_BASE}/models?pageSize=200&key=${encodeURIComponent(GEMINI_KEY)}`);
    const j = await r.json();
    const ok = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent")).map(m => String(m.name).replace(/^models\//, ""));
    const ver = n => { const m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
    const bad = /lite|image|tts|live|audio|embed|robotics|computer|learnlm|gemma|nano/;
    const rank = (a, b) => (ver(b) - ver(a)) || ((a.includes("preview") ? 1 : 0) - (b.includes("preview") ? 1 : 0)) || (a.length - b.length);
    const flash = ok.filter(n => /flash/.test(n) && !bad.test(n)).sort(rank);
    const pro = ok.filter(n => /pro/.test(n) && !bad.test(n)).sort(rank);
    if(!models.default) models.default = flash[0] || pro[0] || "";
    if(!models.complex) models.complex = pro[0] || models.default;
    console.log(`Gemini : modèle standard « ${models.default} », modèle maximal « ${models.complex} »`);
  }catch(e){ console.error("Impossible de lister les modèles Gemini :", e.message); }
  return models;
}

/* ---------- utilitaires ---------- */
function sendJson(res, status, obj){ res.writeHead(status, {"Content-Type":"application/json; charset=utf-8"}); res.end(JSON.stringify(obj)); }
function readBody(req, limit){
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if(size > limit){ reject(Object.assign(new Error("too_large"), {code:"input_too_large"})); req.destroy(); } else chunks.push(c); });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
function codeFor(status){ return status === 429 ? "rate_limited" : status === 401 || status === 403 ? "bad_key" : status === 400 ? "bad_request" : "server_error"; }
/* Crédits ou quota épuisés : message clair en français (OpenAI répond en anglais) */
const NO_CREDIT = /no credits|insufficient_quota|exceeded your current quota|billing/i;
const frMessage = (msg, pv = PROVIDER) => !NO_CREDIT.test(String(msg)) ? msg
  : pv === "openai" ? "Plus de crédits API sur ton compte OpenAI : ajoute des crédits sur platform.openai.com › Settings › Billing (l'abonnement ChatGPT ne compte pas pour l'API)."
  : pv === "gemini" ? `Limite de ta clé Gemini gratuite atteinte (environ 20 demandes par jour et par modèle ; une vidéo en utilise 6 à 10)${geminiResetText() ? " : elle revient vers " + geminiResetText() : " : réessaie plus tard"}. Pour ne plus être bloqué : active la facturation de ta clé sur aistudio.google.com, ou ajoute des crédits OpenAI.`
  : "Quota de l'API épuisé : réessaie plus tard ou ajoute des crédits chez le fournisseur.";
async function* sseEvents(body){
  const dec = new TextDecoder(); let buf = "";
  const parse = block => { const data = block.split("\n").filter(l => l.startsWith("data:")).map(l => l.slice(5).trim()).join(""); if(data && data !== "[DONE]"){ try{ return JSON.parse(data); }catch(e){} } return null; };
  for await (const chunk of body){
    buf = (buf + dec.decode(chunk, {stream:true})).replace(/\r\n/g, "\n"); // Gemini sépare les événements par \r\n\r\n
    let i;
    while((i = buf.indexOf("\n\n")) >= 0){
      const ev = parse(buf.slice(0, i)); buf = buf.slice(i + 2);
      if(ev) yield ev;
    }
  }
  const last = parse(buf); if(last) yield last;
}

/* ---------- Recherche web sans clé ni quota : Google Tendances (recherches du jour par pays) et Google Actualités ----------
   Le serveur lit les flux publics, puis donne ces données fraîches au modèle. La recherche Google de Gemini reste un bonus. */
async function fetchText(url, ms = 8000){
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try{ const r = await fetch(url, {signal:ctl.signal, headers:{"User-Agent":"Mozilla/5.0 (StudioPrompt)", "Accept-Language":"fr,en;q=0.8"}}); return r.ok ? await r.text() : ""; }
  catch(e){ return ""; } finally{ clearTimeout(t); }
}
const xmlText = s => String(s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
function rssItems(xml, max){
  return String(xml || "").split(/<item>/).slice(1, max + 1).map(it => {
    const g = re => { const m = it.match(re); return m ? xmlText(m[1]) : ""; };
    return {title:g(/<title>([\s\S]*?)<\/title>/), link:g(/<link>([\s\S]*?)<\/link>/), date:g(/<pubDate>([\s\S]*?)<\/pubDate>/), source:g(/<source[^>]*>([\s\S]*?)<\/source>/), traffic:g(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/),
      news:[...it.matchAll(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/g)].map(m => xmlText(m[1])).filter(Boolean).slice(0, 2),
      newsUrl:(it.match(/<ht:news_item_url>([\s\S]*?)<\/ht:news_item_url>/) || [])[1] || ""};
  }).filter(x => x.title);
}
const shortDate = d => { const t = Date.parse(d); return isNaN(t) ? "" : new Date(t).toLocaleDateString("fr-FR", {day:"numeric", month:"short"}); };
async function gatherWeb(w){
  const q = encodeURIComponent, parts = [], srcParts = [];
  const jobs = [];
  if(/^[A-Z]{2}$/.test(String(w.geo || ""))) jobs.push(fetchText(`https://trends.google.com/trending/rss?geo=${w.geo}`).then(x => {
    const items = rssItems(x, 15); if(!items.length) return;
    parts[0] = `RECHERCHES GOOGLE EN FORTE HAUSSE AUJOURD'HUI (${w.nom}) :\n` + items.map(i => `- ${i.title}${i.traffic ? ` (${i.traffic} recherches)` : ""}${i.news.length ? " : " + i.news.join(" / ") : ""}`).join("\n");
    srcParts[0] = items.map(i => ({title:`Tendance Google : ${i.title}`, uri:i.newsUrl || `https://trends.google.com/trending?geo=${w.geo}`}));
  }));
  (Array.isArray(w.requetes) ? w.requetes : []).slice(0, 6).forEach((rq, k) => jobs.push(fetchText(`https://news.google.com/rss/search?q=${q(String(rq).slice(0, 120) + " when:7d")}&hl=${q(w.hl || "fr")}&gl=${q(w.gl || "FR")}&ceid=${q(w.ceid || "FR:fr")}`).then(x => {
    const items = rssItems(x, 8); if(!items.length) return;
    parts[k + 1] = `ACTUALITÉS « ${rq} » (7 derniers jours) :\n` + items.map(i => `- ${i.title}${i.date ? ` (${shortDate(i.date)})` : ""}`).join("\n");
    srcParts[k + 1] = items.slice(0, 4).map(i => ({title:i.title, uri:i.link}));
  })));
  await Promise.all(jobs);
  const text = parts.filter(Boolean).join("\n\n");
  return {text, sources:srcParts.filter(Boolean).flat().filter(x => /^https?:\/\//.test(x.uri)).slice(0, 30)};   // tendances d'abord, puis actualités dans l'ordre des requêtes
}

/* ---------- appel du modèle, réponse en flux (une ligne JSON par morceau) ---------- */
async function handleSample(req, res){
  let input;
  try{ input = JSON.parse(await readBody(req, 40e6)); }catch(e){ return sendJson(res, 400, {code:"bad_request", message:"Requête illisible."}); }
  if(!PROVIDER) return sendJson(res, 500, {code:"no_key", message:"Aucune clé API : copie .env.example en .env et mets ta clé GEMINI_API_KEY (ou OPENAI_API_KEY, ou ANTHROPIC_API_KEY)."});
  let prompt = String(input.prompt || "");
  const images = Array.isArray(input.images) ? input.images.slice(0, 8) : [], json = !!input.json, search = !!input.search;
  let searchUsed = search;
  /* Recherche web : données fraîches de Google Tendances et Actualités ajoutées à la demande, quel que soit le moteur */
  let web = {text:"", sources:[]};
  if(search && input.web && typeof input.web === "object"){
    web = await gatherWeb(input.web);
    if(web.text) prompt = `DONNÉES DU WEB RÉCUPÉRÉES À L'INSTANT (${new Date().toLocaleDateString("fr-FR", {weekday:"long", day:"numeric", month:"long", year:"numeric"})}) — appuie-toi d'abord sur ces faits réels et récents, sans inventer au-delà :\n${web.text}\n\n` + prompt;
    console.log(`Recherche web (flux Google) : ${web.sources.length} sources pour « ${input.web.nom || "?"} ».`);
  }
  /* Un fichier audio (transcription) : seul Gemini sait l'écouter ici */
  const hasAudio = images.some(i => /^audio\//.test(String(i && i.mime)));
  if(hasAudio && !GEMINI_KEY) return sendJson(res, 400, {code:"no_key", message:"La transcription automatique a besoin d'une clé Gemini (GEMINI_API_KEY dans .env) : OpenAI et Claude ne peuvent pas écouter l'audio ici."});
  const ctl = new AbortController(); res.on("close", () => { if(!res.writableEnded) ctl.abort(); });
  /* Moteur : « best » = OpenAI Sol (réflexion maximale, recherche web fiable) s'il est disponible, sinon le moteur par défaut.
     Si un moteur échoue (quota, crédits, clé), l'autre prend le relais. */
  const best = input.engine === "best" || (input.engine !== "default" && input.tier === "complex");
  /* Ordre des moteurs : Sol (si crédits) → bons modèles Gemini gratuits → Luna (si Sol n'a plus de crédits) → Flash-Lite en dernier */
  const now = Date.now(), solAvail = !!OPENAI_KEY && !(openaiAllBlockedUntil > now) && !(openaiSolBlockedUntil > now);
  const lunaAvail = !!OPENAI_KEY && !(openaiAllBlockedUntil > now) && (openaiSolBlockedUntil > now) && lunaOk;
  let geminiGood = !!GEMINI_KEY;
  if(GEMINI_KEY && lunaAvail){ const gm = await geminiModels(); geminiGood = [gm.default, gm.complex, ...GEMINI_FALLBACKS].filter((x, i, a) => x && a.indexOf(x) === i && !/lite/i.test(x)).some(x => !(geminiBlocked.get(x) > now) && !(geminiBusy.get(x) > now)); }
  const oaOk = solAvail || lunaAvail, lunaFirst = lunaAvail && !geminiGood;
  const engines = hasAudio ? ["gemini"] : [(best && solAvail) || lunaFirst ? "openai" : PROVIDER, PROVIDER, GEMINI_KEY ? "gemini" : "", ANTHROPIC_KEY ? "anthropic" : "", oaOk ? "openai" : ""].filter((x, i, a) => x && a.indexOf(x) === i && !(x === "openai" && !oaOk));
  if(lunaFirst) console.log(`Bons modèles Gemini épuisés : ${OPENAI_FALLBACK} répond à leur place (plutôt que Flash-Lite).`);
  let upstream = null, prov = engines[0], geminiUsed = "";
  const callGemini = async () => {
    const m = await geminiModels(), model = input.tier === "complex" ? m.complex : m.default;
    if(!model) return null;
    const geminiCall = (mdl, withSearch) => fetch(`${GEMINI_BASE}/models/${mdl}:streamGenerateContent?alt=sse&key=${encodeURIComponent(GEMINI_KEY)}`, {
      method:"POST", signal:ctl.signal, headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        contents:[{role:"user", parts:[...images.map(i => ({inlineData:{mimeType:i.mime, data:i.data}})), {text:prompt}]}],
        ...(withSearch ? {tools:[{google_search:{}}]} : {}),
        generationConfig:{maxOutputTokens:MAX_OUT, temperature:0.8, ...(json && !withSearch ? {responseMimeType:"application/json"} : {})}
      })
    });
    /* Clé gratuite : chaque modèle a son propre quota par jour, et la recherche web a le sien (souvent 0 sur Gemini 3).
       Quand l'un est épuisé, on passe au suivant et on s'en souvient jusqu'à sa remise à zéro.
       Si aucun modèle ne peut chercher sur le web, on répond quand même, sans recherche, et on le signale à l'application. */
    const chain = [model, m.default, ...GEMINI_FALLBACKS].filter((x, i, a) => x && a.indexOf(x) === i);
    const tryChain = async withSearch => {
      const key = x => x + (withSearch ? "|recherche" : "");
      const ready = chain.filter(x => !(geminiBlocked.get(key(x)) > Date.now()) && !(geminiBusy.get(x) > Date.now()));
      const order = ready.length ? ready : (withSearch ? [] : chain);
      for(let i = 0; i < order.length; i++){
        const up = await geminiCall(order[i], withSearch);
        /* Modèle surchargé chez Google (503…) : on passe tout de suite au modèle suivant et on le laisse reposer 90 s */
        if([500, 502, 503, 504].includes(up.status)){
          geminiBusy.set(order[i], Date.now() + 90 * 1000);
          console.log(`Gemini : « ${order[i]} » surchargé (${up.status})${order[i + 1] ? `, passage à « ${order[i + 1]} »` : ""}.`);
          if(i === order.length - 1) return up;
          continue;
        }
        if(up.status !== 429){ geminiUsed = order[i]; return up; }
        let wait = 60;
        try{ const j = await up.clone().json(); ((j.error && j.error.details) || []).forEach(d => { if(d.retryDelay) wait = parseInt(d.retryDelay, 10) || wait; }); }catch(e){}
        geminiBlocked.set(key(order[i]), Date.now() + wait * 1000);
        console.log(`Gemini : quota de « ${order[i]} »${withSearch ? " avec recherche web" : ""} atteint (encore ${Math.round(wait / 60)} min)${order[i + 1] ? `, passage à « ${order[i + 1]} »` : ""}.`);
        if(i === order.length - 1) return withSearch ? null : up;
      }
      return null;
    };
    let up = search ? await tryChain(true) : null;
    if(!up){
      if(search){ searchUsed = false; console.log("Recherche web Gemini indisponible pour le moment : réponse sans recherche."); }
      up = await tryChain(false);
    }
    return up;
  };
  const solOk = !(openaiSolBlockedUntil > Date.now());
  const oaModel = solOk ? openaiModel(best) : OPENAI_FALLBACK, oaEffort = solOk ? openaiEffort(best) : (process.env.OPENAI_EFFORT_FALLBACK || "medium");
  const callOpenAI = () => fetch(`${OPENAI_BASE}/responses`, {
    method:"POST", signal:ctl.signal,
    headers:{"Content-Type":"application/json", "Authorization":`Bearer ${OPENAI_KEY}`},
    body:JSON.stringify({model:oaModel, stream:true, max_output_tokens:best ? Math.max(MAX_OUT, 64000) : MAX_OUT, reasoning:{effort:oaEffort},
      input:[{role:"user", content:[...images.map(i => ({type:"input_image", image_url:`data:${i.mime};base64,${i.data}`})), {type:"input_text", text:prompt + (json ? "\n\nRéponds uniquement avec le JSON, sans texte autour." : "")}]}],
      ...(search && solOk ? {tools:[{type:"web_search"}]} : {}),   // relais Luna : pas d'outil payant, les flux Google sont déjà dans la demande
      ...(json && !(search && solOk) ? {text:{format:{type:"json_object"}}} : {})})
  });
  const callAnthropic = () => {
    const model = input.tier === "complex" ? (process.env.ANTHROPIC_MODEL_PRO || process.env.ANTHROPIC_MODEL || "claude-opus-5-5") : (process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5");
    return fetch(`${ANTHROPIC_BASE}/messages`, {
      method:"POST", signal:ctl.signal,
      headers:{"Content-Type":"application/json", "x-api-key":ANTHROPIC_KEY, "anthropic-version":"2023-06-01"},
      body:JSON.stringify({model, max_tokens:MAX_OUT, stream:true,
        messages:[{role:"user", content:[...images.map(i => ({type:"image", source:{type:"base64", media_type:i.mime, data:i.data}})), {type:"text", text:prompt + (json ? "\n\nRéponds uniquement avec le JSON, sans texte autour." : "")}]}]})
    });
  };
  /* Coupure réseau passagère : on réessaie une fois le même moteur, puis on passe au suivant */
  const netErrs = [];
  try{
    for(let k = 0, retried = false; k < engines.length; k++){
      prov = engines[k]; searchUsed = search;
      try{
        upstream = prov === "gemini" ? await callGemini() : prov === "openai" ? await callOpenAI() : await callAnthropic();
      }catch(e){
        if(ctl.signal.aborted) return;
        const why = (e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || "erreur réseau";
        netErrs.push(`${prov} : ${why}`); upstream = null;
        if(!retried){ retried = true; console.log(`${prov} injoignable (${why}), nouvel essai dans 3 s.`); await new Promise(r => setTimeout(r, 3000)); k--; continue; }
        retried = false;
        if(k < engines.length - 1){ console.log(`${prov} injoignable (${why}), passage à ${engines[k + 1]}.`); continue; }
        throw e;
      }
      retried = false;
      if(upstream && upstream.ok) break;
      if(k < engines.length - 1 && (!upstream || [401, 402, 403, 404, 429, 500, 502, 503, 529].includes(upstream.status))){
        let msg = ""; try{ const j = upstream ? await upstream.clone().json() : {}; msg = (j.error && j.error.message) || ""; }catch(e){}
        console.log(`${prov} indisponible (${upstream ? upstream.status : "aucun modèle"}${msg ? " : " + String(msg).slice(0, 90) : ""}), passage à ${engines[k + 1]}.`);
        continue;
      }
      break;
    }
  }catch(e){
    if(ctl.signal.aborted) return;
    console.log("API injoignable :", netErrs.join(" ; ") || (e && e.message));
    return sendJson(res, 502, {code:"network", message:"Le serveur n'arrive pas à joindre l'API : vérifie ta connexion Internet puis réessaie."});
  }
  if(!upstream) return sendJson(res, 500, {code:"no_model", message:"Aucun modèle disponible : vérifie tes clés dans .env."});
  if(!upstream.ok){
    let msg = ""; try{ const j = await upstream.json(); msg = (j.error && (j.error.message || j.error.type)) || ""; }catch(e){}
    if(BUSY_RE.test(msg) || upstream.status === 503) return sendJson(res, 503, {code:"overloaded", message:BUSY_MSG});
    return sendJson(res, upstream.status, NO_CREDIT.test(msg) ? {code:"no_credit", message:frMessage(msg, prov)} : {code:codeFor(upstream.status), message:`Erreur de l'API (${upstream.status}) ${msg}`.trim()});
  }
  res.writeHead(200, {"Content-Type":"application/x-ndjson; charset=utf-8", "Cache-Control":"no-cache"});
  const meta = {sources:[], queries:[], suggestions:""}, seen = new Set();
  const addSource = (title, uri) => { if(uri && !seen.has(uri)){ seen.add(uri); meta.sources.push({title:String(title || uri), uri:String(uri)}); } };
  try{
    for await (const ev of sseEvents(upstream.body)){
      let delta = "";
      if(prov === "gemini"){
        const cand = (ev.candidates || [])[0] || {}, gm = cand.groundingMetadata;
        if(gm){
          (gm.groundingChunks || []).forEach(c => c.web && addSource(c.web.title, c.web.uri));
          (gm.webSearchQueries || []).forEach(q => { if(!meta.queries.includes(q)) meta.queries.push(q); });
          if(gm.searchEntryPoint && gm.searchEntryPoint.renderedContent) meta.suggestions = gm.searchEntryPoint.renderedContent;
        }
        const parts = (cand.content || {}).parts || [];
        delta = parts.filter(p => p.text && !p.thought).map(p => p.text).join("");
        if(ev.error){
          const em = String(ev.error.message || ev.error.status || ""), busy = BUSY_RE.test(em) || ev.error.code === 503;
          if(busy && geminiUsed){ geminiBusy.set(geminiUsed, Date.now() + 90 * 1000); console.log(`Gemini : « ${geminiUsed} » surchargé pendant la réponse, le prochain essai passera par un autre modèle.`); }
          res.write(JSON.stringify(busy ? {error:true, code:"overloaded", message:BUSY_MSG} : {error:true, code:"server_error", message:em || "Erreur du modèle."}) + "\n"); break;
        }
      } else if(prov === "openai"){
        if(ev.type === "response.output_text.delta") delta = ev.delta || "";
        if(ev.type === "response.output_text.annotation.added" && ev.annotation && ev.annotation.type === "url_citation") addSource(ev.annotation.title, ev.annotation.url);
        if(ev.type === "response.completed" && ev.response) (ev.response.output || []).forEach(o => (o.content || []).forEach(c => (c.annotations || []).forEach(a => a.type === "url_citation" && addSource(a.title, a.url))));
        const fail = ev.type === "error" ? (ev.message || (ev.error && ev.error.message))
          : ev.type === "response.failed" ? ((ev.response && ev.response.error && ev.response.error.message) || "La génération a échoué.")
          : ev.type === "response.incomplete" ? `Réponse incomplète (${(ev.response && ev.response.incomplete_details && ev.response.incomplete_details.reason) || "limite atteinte"}) : réessaie.` : "";
        if(fail && CREDIT_RE.test(fail)){
          openaiSolBlockedUntil = openaiAllBlockedUntil = Date.now() + 30 * 60 * 1000;
          console.log("OpenAI : compte API sans crédits, Gemini ou Anthropic prend le relais pendant 30 minutes.");
        }
        if(fail){ res.write(JSON.stringify({error:true, code:NO_CREDIT.test(fail) ? "no_credit" : "server_error", message:frMessage(fail, prov)}) + "\n"); break; }
      } else {
        if(ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") delta = ev.delta.text;
        if(ev.type === "error"){ res.write(JSON.stringify({error:true, code:"server_error", message:(ev.error && ev.error.message) || "Erreur du modèle."}) + "\n"); break; }
      }
      if(delta) res.write(JSON.stringify({delta}) + "\n");
    }
    res.write(JSON.stringify({model: prov === "gemini" ? geminiUsed : prov === "openai" ? oaModel : "claude"}) + "\n");
    if(search){ web.sources.forEach(x => addSource(x.title, x.uri)); if(!searchUsed && !web.text) meta.nosearch = true; if(web.text) meta.web = "Google Tendances et Actualités"; meta.engine = (prov === "openai" ? `OpenAI ${oaModel}` : prov) + (web.text ? " + flux Google" : ""); res.write(JSON.stringify({meta}) + "\n"); }
  }catch(e){
    if(!ctl.signal.aborted) res.write(JSON.stringify({error:true, code:"server_error", message:"Flux interrompu : réessaie."}) + "\n");
  }
  res.end();
}

/* ---------- fichiers de l'application ---------- */
const TYPES = {".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json", ".png":"image/png", ".jpg":"image/jpeg", ".svg":"image/svg+xml", ".ico":"image/x-icon", ".webp":"image/webp"};
function serveStatic(req, res){
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if(p === "/") p = "/index.html";
  const file = path.normalize(path.join(PUBLIC, p));
  if(!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if(err){ res.writeHead(404, {"Content-Type":"text/plain; charset=utf-8"}); return res.end("Introuvable"); }
    res.writeHead(200, {"Content-Type":TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control":"no-cache"});
    res.end(data);
  });
}

/* ---------- état du moteur pour le menu (jamais la clé) ---------- */
async function handleStatus(res){
  let model = "";
  if(PROVIDER === "gemini") model = (await geminiModels()).default;
  else if(PROVIDER === "openai") model = openaiModel(false);
  else if(PROVIDER === "anthropic") model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
  let quota = {};
  if(PROVIDER === "gemini"){ const m = await geminiModels(), chain = [m.default, m.complex, ...GEMINI_FALLBACKS].filter((x, i, a) => x && a.indexOf(x) === i), blocked = chain.filter(x => geminiBlocked.get(x) > Date.now()); quota = {blocked:blocked.length, total:chain.length, all:!!chain.length && blocked.length === chain.length, reset:geminiResetText()}; }
  sendJson(res, 200, {provider:PROVIDER, ready:!!PROVIDER, model, quota, best: OPENAI_KEY && !(openaiAllBlockedUntil > Date.now()) ? (openaiSolBlockedUntil > Date.now() ? `${OPENAI_FALLBACK} (en attendant des crédits pour ${openaiModel(true)})` : `${openaiModel(true)} (${openaiEffort(true)})`) : (ANTHROPIC_KEY ? "Anthropic" : GEMINI_KEY ? "Gemini" : "")});
}

/* En ligne (Render…) : HOST=0.0.0.0 et APP_PASSWORD obligatoire, sinon n'importe qui utiliserait tes clés et tes crédits */
const HOST = process.env.HOST || "127.0.0.1";
const APP_PASSWORD = process.env.APP_PASSWORD || "";
function authorized(req){
  if(!APP_PASSWORD) return true;
  const m = String(req.headers.authorization || "").match(/^Basic\s+(.+)$/i);
  if(!m) return false;
  const pass = Buffer.from(m[1], "base64").toString("utf8").split(":").slice(1).join(":");
  return pass.length === APP_PASSWORD.length && require("crypto").timingSafeEqual(Buffer.from(pass), Buffer.from(APP_PASSWORD));
}

http.createServer((req, res) => {
  if(!authorized(req)){ res.writeHead(401, {"WWW-Authenticate":'Basic realm="Studio Prompt", charset="UTF-8"', "Content-Type":"text/plain; charset=utf-8"}); return res.end("Mot de passe requis."); }
  if(req.method === "GET" && req.url.startsWith("/api/status")) return handleStatus(res).catch(() => sendJson(res, 200, {provider:PROVIDER, ready:!!PROVIDER, model:""}));
  if(req.method === "POST" && req.url.startsWith("/api/sample")) return handleSample(req, res).catch(e => { console.error(e); if(!res.headersSent) sendJson(res, 500, {code:"server_error", message:"Erreur interne du serveur."}); else res.end(); });
  if(req.method === "GET" || req.method === "HEAD") return serveStatic(req, res);
  res.writeHead(405); res.end();
}).on("error", e => {
  if(e.code === "EADDRINUSE"){ console.log(`Studio Prompt tourne déjà : ouvre http://localhost:${PORT} dans ton navigateur.`); process.exit(0); }
  throw e;
}).listen(PORT, HOST, () => {
  if(HOST !== "127.0.0.1" && !APP_PASSWORD) console.log("ATTENTION : serveur ouvert sur le réseau SANS mot de passe. Ajoute APP_PASSWORD dans les variables d'environnement.");
  console.log(`Studio Prompt est prêt : http://localhost:${PORT}`);
  if(!PROVIDER) console.log("Attention : aucune clé API. Copie .env.example en .env et ajoute ta clé.");
  else console.log(`Moteur des agents : ${PROVIDER === "gemini" ? "Gemini" : PROVIDER === "openai" ? `OpenAI (${openaiModel(false)})` : "Claude"}`);
  if(PROVIDER === "gemini") geminiModels();
  if(OPENAI_KEY){ console.log(`Recherche et qualité maximale : OpenAI ${openaiModel(true)} (réflexion ${openaiEffort(true)}), relais ${OPENAI_FALLBACK} puis Gemini.`); probeOpenAI(); setInterval(probeOpenAI, 30 * 60 * 1000); }
});
