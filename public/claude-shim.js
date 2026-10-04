/*
  Studio Prompt · adaptateur local
  Sur claude.ai, la page reçoit window.claude (sample, db, user, downloads).
  Sur ton ordinateur, ce fichier recrée exactement la même interface :
  - sample  → ton serveur local (server.js), qui appelle Gemini ou Claude avec TA clé, jamais exposée dans la page ;
  - db      → stockage dans le navigateur (localStorage) ;
  - user    → un utilisateur local unique ;
  - downloads → téléchargement direct d'un fichier.
  Ne change pas les noms des fonctions : toute l'application les utilise.
*/
(function(){
  "use strict";
  const API = "/api/sample";

  function fail(code, message, text){ const e = new Error(message || code); e.code = code; if(text) e.text = text; return e; }

  async function toPart(blob){
    const u = new Uint8Array(await blob.arrayBuffer()); let bin = "";
    for(let i=0;i<u.length;i+=0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i+0x8000));
    return {mime: blob.type || "image/jpeg", data: btoa(bin)};
  }

  async function call(input, opts, json){
    opts = opts || {};
    const prompt = typeof input === "string" ? input
      : Array.isArray(input) ? input.map(t => (t.role === "assistant" ? "Réponse précédente de l'assistant :\n" : "") + t.content).join("\n\n")
      : String(input);
    let images = [];
    if(opts.images){ const list = opts.images instanceof Blob ? [opts.images] : Array.from(opts.images); images = await Promise.all(list.slice(0, 8).map(toPart)); }
    let res;
    try{
      res = await fetch(API, {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({prompt, images, tier:opts.modelTier || "default", json:!!json, search:!!opts.search, engine:opts.engine || ""}), signal:opts.signal});
    }catch(e){
      if(e && e.name === "AbortError") throw fail("cancelled", "Annulé.");
      throw fail("network", "Le serveur local ne répond pas : lance « npm start » dans le dossier du projet.");
    }
    if(!res.ok){
      const b = await res.json().catch(()=>({}));
      if(res.status === 404 || res.status === 405) throw fail("network", "Cette version en ligne n'a pas de serveur (GitHub Pages) : les agents marchent sur ton ordinateur (Lancer Studio Prompt.bat) ou sur un hébergement avec serveur.");
      throw fail(b.code || (res.status === 429 ? "rate_limited" : "server_error"), b.message || ("Erreur du serveur " + res.status));
    }
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = "", text = "", meta = null, late = null;
    try{
      for(;;){
        const {value, done} = await reader.read(); if(done) break;
        buf += dec.decode(value, {stream:true});
        let i;
        while((i = buf.indexOf("\n")) >= 0){
          const line = buf.slice(0, i).trim(); buf = buf.slice(i+1);
          if(!line) continue;
          let m; try{ m = JSON.parse(line); }catch(e){ continue; }
          if(m.error){ late = m; continue; }   /* on lit jusqu'au bout : les sources arrivent après */
          if(m.meta) meta = m.meta;
          if(m.delta){ text += m.delta; if(opts.onText) try{ opts.onText({text, delta:m.delta}); }catch(e){} }
        }
      }
    }catch(e){
      if(e && (e.name === "AbortError" || (opts.signal && opts.signal.aborted))) throw fail("cancelled", "Annulé.", text);
      throw fail("network", "La connexion avec le serveur a été coupée pendant la génération (fenêtre du serveur fermée ou relancée). Relance « Lancer Studio Prompt », puis réessaie.", text);
    }
    if(late){
      /* Erreur arrivée APRÈS une réponse JSON complète et valide (ex. facturation OpenAI à la fin) : on garde la réponse */
      if(json && text.trim()){ try{ parseJSON(text); return {text, meta}; }catch(e){} }
      throw fail(late.code || "server_error", late.message || "Erreur du modèle.", text);
    }
    return {text, meta};
  }

  function parseJSON(t){
    const s = String(t || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    try{ return JSON.parse(s); }catch(e){}
    const fence = String(t || "").match(/```(?:json)?\s*([\s\S]*?)```/i);  /* JSON au milieu d'un texte (recherche web) */
    if(fence){ try{ return JSON.parse(fence[1].trim()); }catch(e){} }
    const a = s.indexOf("{"), b = s.lastIndexOf("}");
    if(a >= 0 && b > a){ try{ return JSON.parse(s.slice(a, b+1)); }catch(e){} }
    throw fail("invalid_json", "La réponse du modèle n'est pas un JSON valide.", t);
  }

  /* opts.search = true : recherche web en direct ; les sources arrivent dans .meta (texte) ou ._meta (JSON) */
  /* opts.engine = "best" : le meilleur moteur (OpenAI Sol) ; s'il n'a plus de crédits, on relance avec le moteur par défaut */
  /* Gemini surchargé : le serveur a déjà écarté le modèle saturé, on relance une fois (un autre modèle répond) */
  async function callBest(input, opts, json){
    try{ return await call(input, opts, json); }
    catch(e){
      if(e && e.code === "no_credit" && opts && opts.engine === "best") return await call(input, Object.assign({}, opts, {engine:"default"}), json);
      if(e && e.code === "overloaded" && !(opts && opts.signal && opts.signal.aborted)){ await new Promise(r => setTimeout(r, 1500)); return await call(input, opts, json); }
      throw e;
    }
  }
  const sample = async (input, opts) => { const r = await callBest(input, opts, false); return {text:r.text, truncated:false, meta:r.meta}; };
  sample.json = async (input, opts) => {
    const r = await callBest(input, opts, true), o = parseJSON(r.text);
    if(r.meta && o && typeof o === "object") Object.defineProperty(o, "_meta", {value:r.meta, enumerable:false});
    return o;
  };
  sample.limits = async () => ({inputBytes: 4000000, images:{maxCount:8, mediaTypes:["image/png","image/jpeg","image/webp"]}});

  /* ---------- db : même interface que sur claude.ai, stockée dans le navigateur ---------- */
  const KEY = "sp-local-db", listeners = [];
  const load = () => { try{ return JSON.parse(localStorage.getItem(KEY) || "{}"); }catch(e){ return {}; } };
  const save = o => { try{ localStorage.setItem(KEY, JSON.stringify(o)); }catch(e){ throw fail("quota_exceeded", "Mémoire du navigateur pleine : supprime d'anciens projets."); } };
  function notify(){
    const o = load();
    listeners.forEach(l => {
      let docs = Object.entries(o[l.path] || {}).map(([id, d]) => ({id, exists:true, data:() => JSON.parse(JSON.stringify(d))}));
      if(l.order){ const [f, dir] = l.order; docs.sort((a, b) => { const x = a.data()[f], y = b.data()[f]; return (x > y ? 1 : x < y ? -1 : 0) * (dir === "desc" ? -1 : 1); }); }
      if(l.limit) docs = docs.slice(0, l.limit);
      try{ l.cb({docs, size:docs.length, empty:!docs.length}); }catch(e){ console.error(e); }
    });
  }
  function collection(path){
    const q = {path, order:null, limit:0};
    const api = {
      doc(id){
        id = id || ("d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
        return {
          id,
          async set(data){ const o = load(); (o[path] = o[path] || {})[id] = JSON.parse(JSON.stringify(data)); save(o); setTimeout(notify, 0); },
          async update(patch){ const o = load(); const cur = (o[path] || {})[id] || {}; (o[path] = o[path] || {})[id] = Object.assign(cur, patch); save(o); setTimeout(notify, 0); },
          async delete(){ const o = load(); if(o[path]) delete o[path][id]; save(o); setTimeout(notify, 0); },
          async get(){ const d = (load()[path] || {})[id]; return {id, exists:!!d, data:() => d ? JSON.parse(JSON.stringify(d)) : undefined}; }
        };
      },
      orderBy(f, dir){ q.order = [f, dir || "asc"]; return api; },
      limit(n){ q.limit = n; return api; },
      onSnapshot(cb){ const l = {path:q.path, order:q.order, limit:q.limit, cb}; listeners.push(l); setTimeout(notify, 0); return () => { const i = listeners.indexOf(l); if(i >= 0) listeners.splice(i, 1); }; }
    };
    return api;
  }
  window.addEventListener("storage", e => { if(e.key === KEY) notify(); });

  const user = {id: async () => "local", me: async () => ({id:"local", name:""}), isOwner: () => true, canEdit: () => true, can: () => true};
  const downloads = {
    async save({filename, data}){
      const blob = data instanceof Blob ? data : new Blob([data], {type:"text/plain;charset=utf-8"});
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename || "fichier.txt";
      document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }
  };
  const caps = {sample, db:{collection}, user, downloads};
  window.claude = {use: async name => caps[name] || null};
})();
