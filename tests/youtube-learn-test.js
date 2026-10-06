// Apprendre des vidéos YouTube à forte audience : vrai server.js face à un FAUX YouTube (oEmbed, page, planches d'aperçu) et un FAUX Gemini.
// Vidéo 1 : lue en entier par lien (Gemini) ; vidéo 2 : quota épuisé → images de la vidéo + agent simulé. Leçons dans la mémoire,
// idées originales dans le même format, reconstruction toujours réinventée avec le format gagnant.
const p = require("puppeteer-core"), http = require("http"), path = require("path"), zlib = require("zlib"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
function png(w, h, tiles){ const crc = b => { let c, t = []; for(let n = 0; n < 256; n++){ c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for(const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h); for(let y = 0; y < h; y++){ raw[y * (w * 3 + 1)] = 0; for(let x = 0; x < w; x++){ const col = tiles[(y < h / 2 ? 0 : 2) + (x < w / 2 ? 0 : 1)], o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = col[0]; raw[o + 1] = col[1]; raw[o + 2] = col[2]; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]); }
const SHEET = png(202, 360, [[250, 160, 170], [40, 200, 230], [250, 170, 60], [60, 120, 240]]);
const V1 = "AAAAAAAAAA1", V2 = "BBBBBBBBBB2", seen = {gemini: [], sample: []};
const ANALYSIS = {overview: {summary: "Une présentatrice mime des paires de mots contraires devant des fonds colorés.", story: "", visual_style: "Fonds unis à motifs, couleurs vives", editing_style: "Une paire toutes les 2,5 s", audio_style: "Voix claire et musique douce", language: "Français", duration: 20, video_type: "enfants", style_id: "anim3d"},
  characters: [{id: "C01", nom: "Présentatrice", fiche_fr: "Jeune femme en salopette", fiche_en: "A young woman presenter in colorful overalls", rappel_en: "the presenter in overalls"}], locations: [],
  transcript: [{t0: 0.5, t1: 2, speaker: "C01", text: "Chaud ! Froid !", language: "fr"}],
  scenes: [{scene_id: "S01", t0: 0, t1: 20, location_id: "", objective: "apprendre", event: "paires de contraires", change: "", characters: ["C01"]}],
  shots: [0, 1, 2, 3].map(i => ({shot_id: `P0${i + 1}`, scene_id: "S01", t0: i * 5, t1: (i + 1) * 5, characters: ["C01"], description: `Paire de mots ${i + 1}`, action: "mime le mot", performance: "joyeuse", framing: "plan moyen", angle: "face", lens: "", camera_movement: "fixe", focus: "", lighting: "douce", color: "vive", dialogue: "", speaker: "", music: "douce", sfx: "", ambience: "", transition_in: "coupe", transition_out: "coupe", continuity_in: "", continuity_out: "", object_state: "", reconstruction_note: ""})),
  defects: [], reconstruction: {keep: ["le rythme"], improve: [], risks: []},
  succes: {format: "Paires de mots contraires mimées par une présentatrice, en 20 secondes", accroche: "Le premier mot apparaît en grand dès la première seconde", rythme: "Une paire toutes les 2,5 secondes, 8 paires", structure: ["mot", "image", "contraire", "image"], visuel: "Fond uni à motifs qui change de couleur à chaque paire", son: "Voix nette qui dit chaque mot", texte_ecran: "Deux mots en gros, blancs bordés de noir", boucle: "La fin s'enchaîne sur le début", titre_et_hashtags: "Sujet + drapeau + hashtags éducatifs", public: "Enfants et débutants", pourquoi_ca_marche: ["Très simple à comprendre sans le son", "Change toutes les 2 secondes"],
    lecons: [{regle: "Montre une seule idée toutes les deux à trois secondes, avec un changement visuel net.", domaine: "rythme", type: "faire"}, {regle: "Écris le mot clé en très grand, blanc bordé de noir, en haut de l'image.", domaine: "texte", type: "faire"}, {regle: "Évite les fonds chargés qui volent l'attention au mot appris.", domaine: "format", type: "eviter"}],
    idees_originales: [{titre: "Les contraires en wolof et en français", idee: "Une présentatrice fictive mime chaque paire de mots dans les deux langues."}, {titre: "Les animaux et leurs petits", idee: "Un personnage animé montre l'animal puis son petit."}]}};
const SUCCES2 = {succes: {format: "Pluriels irréguliers illustrés, une paire par plan", accroche: "", rythme: "Une paire toutes les 2 secondes", structure: [], visuel: "Illustrations simples", son: "", texte_ecran: "Mot au singulier et au pluriel", boucle: "", titre_et_hashtags: "", public: "Débutants", pourquoi_ca_marche: ["Comparaison immédiate"],
  lecons: [{regle: "Montre une seule idée toutes les deux à trois secondes, avec un changement visuel net.", domaine: "rythme", type: "faire"}, {regle: "Mets l'image sous chaque mot pour que l'enfant comprenne sans lire.", domaine: "texte", type: "faire"}], idees_originales: [{titre: "Les fruits du marché et leurs couleurs", idee: "Un vendeur fictif montre un fruit et dit sa couleur."}]}};
const fake = http.createServer((req, res) => { const c = []; req.on("data", x => c.push(x)); req.on("end", () => {
  const u = new URL(req.url, "http://x"), F0 = `http://127.0.0.1:${fake.address().port}`, send = (code, o) => { res.writeHead(code, {"Content-Type": "application/json"}); res.end(JSON.stringify(o)); };
  if(u.pathname === "/oembed"){ const id = (u.searchParams.get("url") || "").slice(-11); return send(200, {title: id === V1 ? "Les contraires en français 🇫🇷 #apprendre" : "Les pluriels irréguliers 🇬🇧 #apprendre", author_name: "Chaîne Modèle"}); }
  if(u.pathname === "/watch"){ const id = u.searchParams.get("v"); res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"});
    return res.end(`<html><script>var x={"videoDetails":{"videoId":"${id}","lengthSeconds":"20","viewCount":"${id === V1 ? "1069944755" : "1060860016"}","shortDescription":"Apprends les mots avec moi \\u0026 amuse-toi !"},"microformat":{"publishDate":"2025-04-03T10:09:01-07:00"},"storyboards":{"playerStoryboardSpecRenderer":{"spec":"${F0}/sb/${id}/storyboard3_L$L/$N.jpg?sqp=x|48#27#100#10#10#0#default#rs$AAA|101#180#4#2#2#1000#M$M#rs$BBB"}}};</script></html>`); }
  if(u.pathname.startsWith("/sb/")){ res.writeHead(200, {"Content-Type": "image/png"}); return res.end(SHEET); }
  if(u.pathname === "/v1beta/models") return send(200, {models: [{name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"]}]});
  if(/:generateContent$/.test(u.pathname)){ const o = JSON.parse(Buffer.concat(c).toString("utf8") || "{}"), parts = ((o.contents || [])[0] || {}).parts || [], uri = ((parts.find(x => x.fileData) || {}).fileData || {}).fileUri || "", text = (parts.find(x => x.text) || {}).text || "";
    seen.gemini.push({uri, text}); if(uri.endsWith(V2)) return send(429, {error: {code: 429, message: "Resource exhausted"}});
    return send(200, {candidates: [{content: {parts: [{text: JSON.stringify(ANALYSIS)}]}}]}); }
  send(404, {});
}); });
const PORT = 3000 + 300 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
(async () => {
  await new Promise(r => fake.listen(0, "127.0.0.1", r)); const F = `http://127.0.0.1:${fake.address().port}`;
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "cle-test", GEMINI_BASE_URL: F + "/v1beta", YOUTUBE_BASE: F, NEWS_ALLOW_LOCAL: "1", PROVIDER: "gemini", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", APP_PASSWORD: "", GEN_DIR: path.join(OUT, "yt-gen")});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]}); let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  for(let k = 0; k < 50 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
  const b = await p.launch({executablePath: EDGE, headless: true}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  try{
    await pg.setViewport({width: 1366, height: 900});
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); }); await pg.reload({waitUntil: "networkidle0"});
    await pg.setRequestInterception(true);
    pg.on("request", r => { if(!(r.url().includes("/api/sample") && r.method() === "POST")) return r.continue();
      let body = {}; try{ body = JSON.parse(r.postData() || "{}"); }catch(e){} const pr = String(body.prompt || ""); seen.sample.push({pr, n: (body.images || []).length});
      if(/analyste des vidéos à succès/.test(pr)) return r.respond({status: 200, contentType: "application/x-ndjson", body: JSON.stringify({delta: JSON.stringify(SUCCES2)}) + "\n"});
      return r.respond({status: 500, contentType: "application/json", body: JSON.stringify({code: "server_error", message: "arrêt du test"})}); });
    // 1. étudier deux liens : l'un lu en entier par Gemini, l'autre par ses images (quota épuisé)
    await pg.evaluate(() => { location.hash = "reel"; }); await pg.waitForSelector("#rm-yt", {visible: true, timeout: 15000});
    await pg.type("#rm-yt", `https://youtube.com/shorts/${V1}?si=abc\nhttps://youtu.be/${V2}`);
    await pg.click("#rm-yt-go"); await pg.waitForFunction(() => /Leçons pour ton agent/.test((document.getElementById("rm-learn") || {}).innerText || ""), {timeout: 40000}).catch(() => {});
    const st = await pg.evaluate(() => ({learn: (document.getElementById("rm-learn") || {}).innerText || "", report: !document.getElementById("rm-report").hidden, src: document.getElementById("rm-src").value, warn: !document.getElementById("rm-warn").hidden, fmt: document.getElementById("rm-format").value, auto: (document.getElementById("rm-auto") || {}).innerText || "", lessons: document.querySelectorAll("#rm-learn .stat-pick input").length, ideas: document.querySelectorAll("#rm-learn [data-rl-idea]").length}));
    check("lien lu en entier par Gemini (lien YouTube direct, sans téléchargement) avec la consigne d'étude", seen.gemini.filter(g => g.uri.endsWith(V1)).length === 1 && seen.gemini.filter(g => g.uri.endsWith(V2)).length >= 2 && seen.gemini[0].uri === `https://www.youtube.com/watch?v=${V1}` && /VIDÉO PUBLIQUE D'UN AUTRE CRÉATEUR/.test(seen.gemini[0].text) && /1 069 944 755 vues/.test(seen.gemini[0].text.replace(/ | /g, " ")) && /jamais la copier/.test(seen.gemini[0].text), seen.gemini.map(g => g.uri).join(" | "));
    check("chaque vidéo affichée avec sa chaîne, ses vues et ce qui la fait marcher", /Les contraires en français/.test(st.learn) && /Chaîne Modèle · 1,07 milliard de vues · 20 s · 2025-04-03/.test(st.learn) && /vidéo complète lue \(image et son\)/.test(st.learn) && /Une paire toutes les 2,5 secondes/.test(st.learn) && /Très simple à comprendre sans le son/.test(st.learn), st.learn.slice(0, 220).replace(/\n/g, " | "));
    check("quota épuisé : la 2e vidéo est étudiée à partir de ses images (secours gratuit), 4 images envoyées à l'agent", /étudiée à partir de ses images/.test(st.learn) && seen.sample.some(x => /analyste des vidéos à succès/.test(x.pr) && x.n === 4) && /Pluriels irréguliers illustrés/.test(st.learn), seen.sample.map(x => x.n).join(","));
    check("leçons des deux vidéos fusionnées sans doublon, idées originales proposées", st.lessons === 4 && st.ideas === 3, `${st.lessons} leçons · ${st.ideas} idées`);
    check("la première vidéo sert de base à la reconstruction : réinventée (vidéo d'un autre), format 9:16 du Short, rapport affiché", st.report && st.src === "autre" && st.warn && st.fmt === "9:16" && /Short|9:16|Vertical/i.test(st.auto + st.fmt), `${st.src} · ${st.fmt} · ${st.auto.slice(0, 120)}`);
    // 2. apprendre les leçons à l'agent
    await pg.evaluate(() => { const i = document.querySelectorAll("#rm-learn .stat-pick input"); i[2].checked = false; });
    await pg.click("#rl-keep"); await pg.waitForFunction(() => /retenue/.test((document.getElementById("rl-msg") || {}).textContent || ""), {timeout: 15000}).catch(() => {});
    const mem = await pg.evaluate(() => { const db = JSON.parse(localStorage.getItem("sp-local-db") || "{}")["data/users/local"] || {}; return {msg: (document.getElementById("rl-msg") || {}).textContent || "", les: Object.values(db).filter(d => d && d.kind === "lesson").map(d => d.lesson)}; });
    check("leçons cochées gardées dans la mémoire de l'agent (stratégie, source : vidéo étudiée)", mem.les.length === 3 && mem.les.every(l => l.source === "modele" && l.cible === "strategie" && /vues\)$/.test(l.origine)) && /3 leçons retenues/.test(mem.msg), `${mem.les.length} · ${mem.msg}`);
    // 3. une idée originale part dans « Depuis une idée » avec le format à reprendre
    await pg.click('[data-rl-idea="0"]'); await new Promise(r => setTimeout(r, 400));
    const idea = await pg.evaluate(() => ({vue: !document.getElementById("view-studio").hidden, txt: document.getElementById("idee").value, fmt: document.getElementById("f-format").value}));
    check("« Créer cette idée » : idée originale + format gagnant à reprendre, sans copier, format vertical", idea.vue && /^Les contraires en wolof et en français/.test(idea.txt) && /FORMAT GAGNANT À REPRENDRE/.test(idea.txt) && /aucune image ni phrase de la vidéo étudiée/.test(idea.txt) && idea.fmt === "9:16", idea.txt.slice(0, 160).replace(/\n/g, " | "));
    // 4. « 2. Reconstruire » : la demande contient le format gagnant et l'obligation de réinventer
    await pg.evaluate(() => { location.hash = "reel"; }); await pg.waitForSelector("#rm-go", {visible: true});
    const before = seen.sample.length; await pg.click("#rm-go"); await pg.waitForFunction(n => window.__x || true, {}, 0); await new Promise(r => setTimeout(r, 2500));
    const asked = seen.sample.slice(before).map(x => x.pr).join("\n");
    check("reconstruction : format gagnant transmis à l'agent, vidéo réinventée (jamais copiée)", /FORMAT GAGNANT À REPRENDRE/.test(asked) && /Ambition : réinventée/.test(asked) && /source tierce : comprends sa fonction mais ne recopie aucune phrase/.test(asked), asked.length ? (asked.match(/FORMAT GAGNANT[^\n]{0,80}/) || ["(absent)"])[0] : "aucune demande");
    // 5. mémoire : le bloc stratégie annonce l'origine des leçons
    check("les leçons apprises entrent dans les prochaines idées (bloc « ce qui marche »)", /CE QUI MARCHE SUR LA CHAÎNE DE L'UTILISATEUR ET DANS LES VIDÉOS À TRÈS FORTE AUDIENCE/.test(asked) && /Montre une seule idée toutes les deux à trois secondes/.test(asked), (asked.match(/CE QUI MARCHE[^\n]{0,60}/) || ["(absent)"])[0]);
    await pg.setViewport({width: 390, height: 844}); await new Promise(r => setTimeout(r, 300));
    check("page sur téléphone : pas de défilement horizontal", await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1));
    check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  }finally{ await b.close(); srv.kill(); fake.close(); }
  console.log(out.join("\n")); process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
