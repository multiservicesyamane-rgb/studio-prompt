// Séries d'épisodes (21 octobre) : « je lui ai donné l'idée d'une série de 20 épisodes, mais il a fait une seule vidéo ».
// Créer → Depuis une idée : l'idée « une série de 12 épisodes » est comprise, la bible est écrite par paquets de 10 (agent simulé),
// chaque épisode devient un film (générateur simulé) avec les mêmes personnages, l'histoire d'avant et la voix off de fin imposée.
const p = require("puppeteer-core"), path = require("path"), fs = require("fs"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const GEN = path.join(OUT, "gen-serie"), wait = ms => new Promise(r => setTimeout(r, ms));
const EP = n => ({n, titre: `Titre ${n}`, situation: `Problème ${n} : le loyer augmente`, developpement: `Développement ${n}`, tournant: `Tournant ${n}`, enseignement: `Leçon ${n} : connais tes droits, garde ta dignité.`, suite: `Suite ${n}`, personnages: ["c1", "c2"], lieu: "l1", emotion: "inspirant"});
const BIBLE = {titres: [{titre: "JOM", sens: "la dignité"}, {titre: "Liggéey", sens: "le travail"}, {titre: "Ndank Ndank", sens: "petit à petit"}], titre: "JOM", logline: "Ousmane, 24 ans, se bat pour sa famille à Thiaroye.", promesse: "Chaque épisode, une leçon de vie.", ton: "réaliste et digne",
  lieux: [{id: "l1", nom: "Thiaroye", description_en: "busy suburb of Dakar"}], personnages: [{id: "c1", nom: "Ousmane", role: "héros, journalier", age: "24 ans", fiche_fr: "jeune homme mince", fiche_en: "24-year-old Senegalese man, slim, short hair, faded blue work shirt", rappel_en: "Ousmane, blue work shirt", voix: "homme jeune", arc: "de la survie à la dignité"}, {id: "c2", nom: "Adja", role: "sa mère", age: "55 ans", fiche_fr: "mère courageuse", fiche_en: "55-year-old Senegalese woman, colorful wax dress and headscarf", rappel_en: "Adja, wax dress", voix: "femme mûre", arc: ""}],
  parties: [{titre: "La sueur", episodes: "1-6", enjeu: "survivre"}, {titre: "Se relever", episodes: "7-12", enjeu: "la dignité"}], episodes: Array.from({length: 10}, (_, i) => EP(i + 1))};
(async () => {
  fs.rmSync(GEN, {recursive: true, force: true, maxRetries: 20, retryDelay: 250});
  const PORT = 3000 + 600 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env: Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "x", GEN_DIR: GEN}), stdio: ["ignore", "pipe", "pipe"]});
  let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 600000});
  try{
    for(let k = 0; k < 80 && !/prêt/.test(log); k++) await wait(100);
    const pg = await b.newPage(); await require("./noauto")(pg);
    const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if(m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await pg.evaluateOnNewDocument(() => { window.__sfCalls = [];
      window.__sfGen = async (brief, params) => { window.__sfCalls.push({brief, persos: params.persos.map(c => c.fiche_en), serie: params.serie, duree: params.duree}); await new Promise(r => setTimeout(r, 30));
        return {titre: "Film", personnages: params.persos, plans: [{n: 1, debut: "0:00", fin: "0:08", voix_off: "Le problème commence."}, {n: 2, debut: "0:08", fin: "0:16", voix_off: "Une autre phrase sans la leçon."}]}; }; });
    const asked = []; await pg.setRequestInterception(true);
    pg.on("request", r => { if(!(r.url().includes("/api/sample") && r.method() === "POST")) return r.continue(); const body = r.postData() || "", reply = o => r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({delta: JSON.stringify(o)}) + "\n"});
      if(/BIBLE DE LA SÉRIE/.test(body)){ asked.push({kind: "bible", n12: /exactement 12/.test(body), regle: /se termine par un enseignement dit en voix off/.test(body), fictif: /FICTIFS/.test(body), idee: /Thiaroye/.test(body)}); return reply(BIBLE); }
      if(/SEULEMENT les épisodes 11 à 12/.test(body)){ asked.push({kind: "suite", keep: /c1 = Ousmane/.test(body) && /10\. Titre 10/.test(body)}); return reply({episodes: [EP(11), EP(12)]}); }
      reply({}); });
    await pg.setViewport({width: 390, height: 844, deviceScaleFactor: 1});
    await pg.goto(BASE + "/#studio", {waitUntil: "networkidle0"});
    /* 1. l'idée dit « une série de 12 épisodes » : en mode film, l'application comprend et écrit une série */
    await pg.evaluate(() => { document.getElementById("idee").value = "Je veux une série de 12 épisodes : la vie dure d'un jeune homme à Thiaroye, au Sénégal, qui travaille dur pour sa famille sans jamais gagner assez."; });
    const mode0 = await pg.evaluate(() => __spFilmSerie.mode); await pg.click("#go");
    await pg.waitForFunction(() => document.querySelectorAll("#sf-res .sf-ep").length === 12, {timeout: 60000});
    const s1 = await pg.evaluate(() => ({mode: __spFilmSerie.mode, opts: !document.getElementById("sf-opts").hidden, n: document.getElementById("sf-n").value, titre: document.querySelector("#sf-res h2").textContent, eps: [...document.querySelectorAll("#sf-res .sf-t")].map(x => x.textContent), titres: document.querySelectorAll("[data-sf-titre]").length, chars: document.querySelector("#sf-res details").textContent, dur: document.querySelector("#sf-res .kicker").textContent}));
    check("idée « une série de 12 épisodes » comprise : passage en mode série (sans rien choisir), bible écrite par paquets (1-10 puis 11-12) avec la règle et les personnages fictifs", mode0 === "film" && s1.mode === "serie" && s1.opts && s1.n === "12" && asked.length === 2 && asked[0].n12 && asked[0].regle && asked[0].fictif && asked[0].idee && asked[1].keep, JSON.stringify({mode0, mode: s1.mode, opts: s1.opts, n: s1.n, asked: asked.length}));
    check("bible affichée : titre, 3 titres au choix, personnages aux fiches fixes, 12 épisodes de 3 min", s1.titre === "JOM" && s1.titres === 3 && /Ousmane/.test(s1.chars) && s1.eps.length === 12 && s1.eps[11] === "Titre 12" && /12 épisodes de 3 min/.test(s1.dur), `${s1.titre} · ${s1.eps.length} épisodes · ${s1.dur}`);
    await pg.click('[data-sf-titre="1"]'); const t2 = await pg.evaluate(() => document.querySelector("#sf-res h2").textContent);
    check("changer le titre d'un clic (« Liggéey »)", t2 === "Liggéey", t2);
    /* 2. créer les 12 épisodes : un film par épisode, mêmes personnages, histoire d'avant, fin imposée */
    await pg.click("#sf-all");
    await pg.waitForFunction(() => /12\/12 épisodes créés/.test((document.getElementById("sf-msg") || {}).textContent || ""), {timeout: 120000});
    const s2 = await pg.evaluate(async () => { const S = __spFilmSerie.st, calls = window.__sfCalls; await new Promise(r => setTimeout(r, 1500));
      const projs = JSON.parse(localStorage.getItem("sp-local-db") || "{}"), all = Object.values(projs["data/users/local"] || {}), films = all.filter(d => d.kind === "project" && /Liggéey · Ép\./.test(d.titre || "")), serie = all.find(d => d.kind === "creation" && d.type === "serie");
      return {n: calls.length, b3: calls[2].brief, same: calls.every(c => JSON.stringify(c.persos) === JSON.stringify(calls[0].persos)), serie3: calls[2].serie, films: films.length, t1: (films.find(f => /Ép\. 01/.test(f.titre)) || {}).titre, last: films.map(f => ((f.result.plans || []).slice(-1)[0] || {}).voix_off), saved: !!serie && serie.state.bible.episodes.length === 12 && Object.keys(serie.state.done).length === 12, opens: document.querySelectorAll("#sf-res [data-open]").length}; });
    check("12 films créés un par un, avec les MÊMES fiches de personnages, le numéro d'épisode et la durée de 3 min", s2.n === 12 && s2.same && s2.serie3.n === 3 && s2.serie3.total === 12 && s2.films === 12 && /Liggéey · Ép\. 01 — Titre 1/.test(s2.t1 || "") && s2.opens === 12, `${s2.n} appels · ${s2.films} films · ${s2.t1}`);
    check("chaque film reçoit la bible : épisode 3 sur 12, problème du début, histoire d'avant, fin imposée en voix off, règle de la série", /épisode 3 sur 12/.test(s2.b3) && /DÉBUT \(10 premières secondes\) — le problème : Problème 3/.test(s2.b3) && /Ce qui s’est passé avant : épisode 1/.test(s2.b3) && /FIN OBLIGATOIRE/.test(s2.b3) && /Leçon 3/.test(s2.b3) && /Règle de la série/.test(s2.b3), s2.b3.split("\n").slice(0, 4).join(" | "));
    check("la voix off de l'enseignement termine toujours l'épisode (imposée si le film l'a oubliée)", s2.last.length === 12 && s2.last.every(v => /^Leçon \d+ : connais tes droits/.test(v)), s2.last[0]);
    check("la série est enregistrée dans Mes projets avec sa bible et ses 12 épisodes", s2.saved, "");
    const wide = await pg.evaluate(() => document.documentElement.scrollWidth);
    check("téléphone (390 px) : aucun défilement horizontal", wide <= 390, `${wide} px`);
    check("aucune erreur dans la console", !errs.length, errs.slice(0, 3).join(" | "));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  await b.close(); srv.kill(); fs.rmSync(GEN, {recursive: true, force: true, maxRetries: 20, retryDelay: 250}); console.log(out.join("\n")); process.exit(0);
})();
