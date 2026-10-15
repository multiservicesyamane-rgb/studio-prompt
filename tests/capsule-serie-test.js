// Capsule pédagogique et séries de cours (15 octobre) : programme importé (classes, leçons, univers lu par l'agent), plan du jour (une vidéo par classe,
// bande-annonce le jour 1, défi du jour ensuite), étude YouTube jointe à la consigne, relecteur, voix par personnage, vraie vidéo 1080 × 1920 vérifiée par FFmpeg,
// texte de publication pour les parents ; enseignants 3D sans crâne nu ni kufi pour une femme ; « Garder la voix » garde son garçon en boubou.
// Serveur de test séparé ; aucune IA réelle, aucun quota.
const p = require("puppeteer-core"), path = require("path"), fs = require("fs"), {spawn, execFileSync} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const FF = require(path.join(__dirname, "..", "node_modules", "ffmpeg-static")), GEN = path.join(OUT, "gen-capsule"), wait = ms => new Promise(r => setTimeout(r, ms));
const PROG = `# Les Curieux — 6 leçons
## Univers
Deux enfants, Léa et Tom, et un robot, Robo, cherchent des réponses à des questions simples.
- Une capsule = une compétence.
- Un défi avec pause, puis la réponse expliquée.
### Classe A — 3 leçons — 1 à 1 min 30
| N° | Titre | Objectif | Format |
|---|---|---|---|
| 1 | Le point final | Mettre un point à la fin d'une phrase. | Enquête |
| 2 | Les syllabes | Découper un mot en syllabes. | Chanson |
| 3 | Compter jusqu'à cinq | Dénombrer cinq objets. | Jeu |
### Classe B — 3 leçons — 2 à 3 min
| N° | Titre | Objectif | Format |
|---|---|---|---|
| 4 | Le sujet | Trouver le sujet du verbe. | Enquête |
| 5 | Le verbe | Trouver le verbe conjugué. | Jeu |
| 6 | Bilan | Réviser. | Quiz |`;
const UNIVERS = {serie: "Les Curieux", langue: "fr", personnages: [{nom: "Léa", kind: "fille", role: "pose les questions"}, {nom: "Tom", kind: "enfant", role: "essaie"}, {nom: "Robo", kind: "robot", role: "fait rire"}], pedagogie: ["Une capsule = une compétence.", "Un défi avec pause."], publication: ["Une playlist par classe."]};
const CAPSULE = {titre: "Le point fnal", intro: "Bonjour les curieux !", fin: "Bravo, à demain !", capsule: {objectif: "Mettre un point à la fin d'une phrase.", etapes: [
  {type: "question", lignes: [{qui: "robo", texte: "Bip ! Où finit ma phrase ?"}, {qui: "lea", texte: "On va chercher !"}], visuel: {type: "texte", texte: "le chat dort", surligne: ["dort"]}},
  {type: "demo", titre: "Le point", lignes: [{qui: "prof", texte: "Je mets un point après dort."}], visuel: {type: "mots", mots: ["Le", "chat", "dort", "."], marques: [{mots: [0], role: "majuscule"}, {mots: [3], role: "point"}, {mots: [99], role: "verbe"}]}},
  {type: "defi", lignes: [{qui: "tom", texte: "Quelle phrase est juste ?"}], visuel: {type: "choix", choix: ["le chat dort", "Le chat dort."], bonne: 1}, pause: 4},
  {type: "reponse", lignes: [{qui: "prof", texte: "La deuxième : majuscule et point."}]},
  {type: "retenir", lignes: [{qui: "prof", texte: "Une phrase finit par un point."}], visuel: {type: "regle", texte: "Une phrase finit par un point."}},
  {type: "exercice", lignes: [{qui: "lea", texte: "Écris deux phrases."}], visuel: {type: "inconnu"}}]},
  methode: ["Observer", "Corriger"], publication: {titre: "Classe A — Le point final", description: "Votre enfant apprend le point.\n00:00 La question", tags: ["point", "phrase", "cours"], hashtags: ["#ecole"], miniature: "LE POINT", playlist: "Classe A — Les Curieux"}};
(async () => {
  fs.rmSync(GEN, {recursive: true, force: true, maxRetries: 20, retryDelay: 250});
  const PORT = 3000 + 700 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env: Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "x", GEN_DIR: GEN}), stdio: ["ignore", "pipe", "pipe"]});
  let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 1800000});
  try{
    for(let k = 0; k < 80 && !/prêt/.test(log); k++) await wait(100);
    const pg = await b.newPage(); await require("./noauto")(pg);
    const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if(m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    await pg.evaluateOnNewDocument(() => {
      window.__localCalls = [];
      const wav = secs => { const sr = 22050, n = Math.round(sr * secs), b = new ArrayBuffer(44 + n * 2), d = new DataView(b), w = (o, s) => [...s].forEach((c, i) => d.setUint8(o + i, c.charCodeAt(0))); w(0, "RIFF"); d.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 1, true); d.setUint32(24, sr, true); d.setUint32(28, sr * 2, true); d.setUint16(32, 2, true); d.setUint16(34, 16, true); w(36, "data"); d.setUint32(40, n * 2, true); for(let i = 0; i < n; i++) d.setInt16(44 + i * 2, Math.round(Math.sin(i / sr * 2 * Math.PI * 220) * 12000 * Math.abs(Math.sin(i / sr * 9))), true); return b; };
      window.__localTtsMock = {predict: async ({text, voiceId}) => { window.__localCalls.push({text, voiceId}); return new Blob([wav(1)], {type: "audio/x-wav"}); }};
    });
    const asked = {}; await pg.setRequestInterception(true);
    pg.on("request", r => { const u = r.url();
      if(u.includes("/api/youtube/top")) return r.respond({status: 200, contentType: "application/json", body: JSON.stringify({items: [{id: "abcdefghijk", title: "Le point en CP, vidéo très vue", channel: "Chaîne test", views: 123456, duration: 150}], source: "api"})});
      if(!(u.includes("/api/sample") && r.method() === "POST")) return r.continue(); const body = r.postData() || "", nd = o => r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({delta: JSON.stringify(o)}) + "\n"});
      if(/univers et sa pédagogie/.test(body)){ asked.univers = (asked.univers || 0) + 1; return nd(UNIVERS); }
      if(/relecteur exigeant/.test(body)){ asked.review = (asked.review || 0) + 1; return nd(Object.assign({}, CAPSULE, {titre: "Le point final", corrections: ["fnal → final"]})); }
      if(/Écris UNE CAPSULE VIDÉO/.test(body)){ asked.capsule = {yt: /Le point en CP, vidéo très vue/.test(body), structure: /\\?"defi\\?"/.test(body) && /\\?"retenir\\?"/.test(body), cast: /\\?"lea\\?" = Léa/.test(body), pedago: /Un défi avec pause/.test(body), chanson: /chanson-rappel/.test(body), kids: /conçue pour les enfants/.test(body)}; return nd(CAPSULE); }
      nd({}); });
    await pg.setViewport({width: 390, height: 844, deviceScaleFactor: 1});
    await pg.goto(BASE + "/#lecon", {waitUntil: "networkidle0"});
    await pg.waitForFunction(() => document.querySelectorAll("#lc-models canvas").length === 4, {timeout: 60000}); await wait(800);
    /* 1. enseignants 3D : chaque femme a des cheveux ou un foulard (jamais le kufi), « Garder la voix » sans profil garde le garçon en boubou */
    const s1 = await pg.evaluate(async () => { const A = window.SP_AVATAR; await A.load(); const P = A.profiles, fem = Object.values(P).filter(q => q.gender === "f");
      const c1 = A.render(120, 130, 1, {mouth: .2}, {scene: "solo"}), c2 = A.render(200, 180, 1, {prof: {}, cast: [{}, {}, {mouth: .5, speak: true}]}, {scene: "classe", profile: "fatou", cast: [{kind: "fille"}, {kind: "enfant"}, {kind: "robot", couleur: "#2F9BFF"}]});
      return {n: Object.keys(P).length, coiffes: Object.values(P).every(q => A.coiffes[q.coiffe]), femKufi: fem.some(q => q.coiffe === "kufi"), garcon: P.garcon && P.garcon.age === "enfant" && P.garcon.coiffe === "kufi", kind: A.kindOf(P.garcon), solo: !!(c1 && c1.width), classe: !!(c2 && c2.width)}; });
    check("enseignants 3D : 13 profils, chacun avec une coiffe (cheveux, chignon, foulard ou kufi), jamais de kufi pour une femme ; le garçon en boubou reste le présentateur par défaut de « Garder la voix » ; la classe (enseignant, 2 enfants, robot) se dessine",
      s1.n === 13 && s1.coiffes && !s1.femKufi && s1.garcon && s1.kind === "enfant" && s1.solo && s1.classe, JSON.stringify(s1));
    /* 2. le programme : classes, leçons, univers lu par l'agent ; enseignant, voix et couleurs par classe ; plan du jour */
    await pg.evaluate(t => { document.getElementById("sr-box").open = true; document.getElementById("sr-text").value = t; }, PROG); await pg.click("#sr-read");
    await pg.waitForFunction(() => /✅/.test(document.getElementById("sr-msg").textContent), {timeout: 60000});
    const s2 = await pg.evaluate(() => { const S = window.__spSerie, d1 = S.plan(1), d2 = S.plan(2); return {serie: S.cfg.serie, nv: S.prog.niveaux.map(n => `${n.court}:${n.lecons.length}:${n.duree}`), cast: S.cfg.cast.map(g => `${g.id}:${g.kind}`), profs: S.cfg.niveaux.map(v => v.prof), femmes: S.cfg.niveaux.map(v => window.SP_AVATAR.profiles[v.prof].gender),
      d1: d1.map(x => x.kind + (x.lecon ? x.lecon.n : "")), d2: d2.map(x => x.kind + (x.lecon ? x.lecon.n : "")), li: document.querySelectorAll("#sr-plan li").length, levels: document.querySelectorAll("#sr-levels .sr-level").length}; });
    check("programme importé : 2 classes (A, B), 6 leçons, durées ; univers lu par l'agent (Léa fillette, Tom garçon, Robo robot) ; un enseignant différent par classe ; jour 1 = une leçon par classe + bande-annonce ; jour 2 = une leçon par classe + défi du jour",
      asked.univers === 1 && s2.serie === "Les Curieux" && s2.nv.join() === "CA:3:1 à 1 min 30,CB:3:2 à 3 min" && s2.cast.join() === "lea:fille,tom:enfant,robo:robot" && new Set(s2.profs).size === 2 && s2.d1.join() === "lecon1,lecon4,bande" && s2.d2.join() === "lecon2,lecon5,defi2" && s2.li === 3 && s2.levels === 2, JSON.stringify(s2));
    /* 3. une vidéo de la série : étude YouTube jointe, relecteur, voix par personnage (relais gratuit simulé), vraie vidéo 9:16 */
    await pg.evaluate(() => { const C = window.__spSerie.cfg; C.niveaux.forEach(v => { v.voix = "local:fr_FR-siwis-medium"; }); C.cast[0].voix = "local:fr_FR-upmc-medium"; C.cast[1].voix = "local:fr_FR-gilles-low"; C.cast[2].voix = "local:fr_FR-mls-medium"; });
    const t0 = Date.now();
    const s3 = await pg.evaluate(async () => { const S = window.__spSerie, it = S.plan(1)[0], msgs = []; const r = await S.make(it, ["9:16"], t => msgs.push(t)); const v = r.videos[0];
      const ab = new Uint8Array(await (v.blob || await (await fetch(v.url)).blob()).arrayBuffer()); let s = "";   /* enregistrée : la page la relit depuis son fichier */ for(let i = 0; i < ab.length; i += 32768) s += String.fromCharCode.apply(null, ab.subarray(i, i + 32768));
      const L = r.L, who = window.SP_LECON.speakers(L); return {b64: btoa(s), w: v.w, h: v.h, pro: v.pro, sec: v.seconds, saved: v.saved, titre: L.titre, etapes: L.capsule.etapes.map(e => e.type + (e.visuel ? ":" + e.visuel.type : "")), marques: L.capsule.etapes[1].visuel.marques.length,
        chanson: L.chanson.place, voices: [...new Set(window.__localCalls.map(x => x.voiceId))], who: Object.values(who).join(","), pub: r.pub, msgs: msgs.filter(m => /YouTube|relecteur|Voix de/.test(m)).slice(0, 6)}; });
    const file = path.join(OUT, "capsule-9x16.mp4"); fs.writeFileSync(file, Buffer.from(s3.b64, "base64"));
    let probe = ""; try{ execFileSync(FF, ["-hide_banner", "-i", file], {stdio: ["ignore", "ignore", "pipe"]}); }catch(e){ probe = String(e.stderr || ""); }
    const dur = (/Duration: (\d+):(\d+):([\d.]+)/.exec(probe) || []).slice(1).map(Number), D = dur.length ? dur[0] * 3600 + dur[1] * 60 + dur[2] : 0;
    check("la consigne de l'agent contient l'étude YouTube du sujet, la structure (défi, à retenir), les personnages, la pédagogie de la série et la publication « conçue pour les enfants »", asked.capsule && Object.values(asked.capsule).every(Boolean), JSON.stringify(asked.capsule));
    check("le relecteur passe après l'agent et sa correction est gardée (« fnal » → « final ») ; visuels nettoyés (marque hors phrase retirée, visuel inconnu ignoré) ; pas de chanson quand l'agent n'en écrit pas",
      asked.review === 1 && s3.titre === "Le point final" && s3.etapes.join() === "question:texte,demo:mots,defi:choix,reponse,retenir:regle,exercice" && s3.marques === 2 && s3.chanson === "aucune", `${s3.titre} · ${s3.etapes.join(" ")}`);
    check("une voix par personnage : l'enseignant, Léa, Tom et Robo ont chacun la leur (4 voix gratuites simulées)", s3.voices.length === 4 && /prof/.test(s3.who) && /robo/.test(s3.who), s3.voices.join(", "));
    check("vidéo Full HD 1080 × 1920 : H.264 + AAC, durée de la capsule, enregistrée sur l'ordinateur", s3.pro && s3.w === 1080 && s3.h === 1920 && /Video: h264/.test(probe) && /Audio: aac/.test(probe) && D > 12 && Math.abs(D - s3.sec) < 1.5 && /^\/generated\/serie-les-curieux\//.test(s3.saved || ""), `${s3.w} × ${s3.h} · ${D.toFixed(1)} s · ${Math.round((Date.now() - t0) / 1000)} s de fabrication · ${s3.saved}`);
    check("texte de publication pour les parents : titre, description, tags, playlist, miniature, réglage « conçue pour les enfants », crédits", /^TITRE\nClasse A — Le point final/.test(s3.pub) && /TAGS[^\n]*\npoint, phrase, cours/.test(s3.pub) && /PLAYLIST\nClasse A — Les Curieux/.test(s3.pub) && /LE POINT/.test(s3.pub) && /conçue pour les enfants/.test(s3.pub) && /Twemoji/.test(s3.pub), s3.pub.slice(0, 120).replace(/\n/g, " | "));
    const png = path.join(OUT, "capsule-image.png"); try{ execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-ss", "7", "-i", file, "-frames:v", "1", "-vf", "scale=360:-2", png]); }catch(e){}
    const big = fs.existsSync(png) ? fs.statSync(png).size : 0; check(`image de la capsule à 7 s non vide (contrôle : ${png})`, big > 30000, `${big} octets`);
    /* 4. la capsule s'ouvre dans la page : éditeur des étapes, sans la liste des éléments */
    await pg.click('[data-lc-model="capsule"]'); await pg.evaluate(() => { document.getElementById("lc-more").open = true; document.getElementById("lc-sujet").value = "Le point"; document.getElementById("lc-lignes").value = "[question] Robo : Où finit ma phrase ?\n[demo] prof : Je mets un point.\n[defi] Tom : À toi !"; });
    await pg.click("#lc-free"); await pg.waitForFunction(() => /Capsule prête/.test(document.getElementById("lc-msg").textContent), {timeout: 30000});
    await pg.waitForFunction(() => document.querySelectorAll("#lc-prev img").length === 3, {timeout: 60000}).catch(() => {});
    const s4 = await pg.evaluate(() => ({steps: document.querySelectorAll("#lc-cap .lc-cap-step").length, itemsHidden: document.getElementById("lc-items").hidden, cast: __spLecon.L.capsule.cast.map(g => g.id).join(), prev: document.querySelectorAll("#lc-prev img").length, wide: document.documentElement.scrollWidth}));
    check("sans IA : une capsule écrite à la main (« [étape] qui : texte ») s'ouvre dans l'éditeur des étapes ; personnages de la série reconnus ; aperçu de 3 moments", s4.steps === 3 && s4.itemsHidden && s4.cast === "robo,tom" && s4.prev === 3, JSON.stringify(s4));
    check("téléphone (390 px) : aucun défilement horizontal", s4.wide <= 390, `${s4.wide} px`);
    check("aucune erreur dans la console", !errs.length, errs.slice(0, 3).join(" | "));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  await b.close(); srv.kill(); fs.rmSync(GEN, {recursive: true, force: true, maxRetries: 20, retryDelay: 250}); console.log(out.join("\n")); process.exit(0);
})();
