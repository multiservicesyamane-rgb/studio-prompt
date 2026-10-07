// Page Motion design, onglet « Succès YouTube » : les vidéos les plus vues (API officielle de YouTube, relais de l'agent sur Google, liens collés),
// recréées autrement et jamais copiées (Sans IA : même jeu calculé par le code ; agent : recette, commentaires, nouvel angle, niveaux contrôlés par le code),
// puis envoyées dans le Quiz. Trois nouveaux jeux dessinés par le code : Devine l'ombre, Trouve la différence, Combien ?
// Vrai server.js face à un FAUX YouTube (API, oEmbed, page) et un FAUX Gemini ; agent simulé.
const p = require("puppeteer-core"), http = require("http"), path = require("path"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const VID = {
  ODDEMOJI001: {title: "Find the Odd Emoji Out 🔎 Only Genius Can Find It", ch: "Chaîne Énigmes", views: 52000000, dur: "PT45S", desc: "Find the odd emoji in 5 seconds!"},
  SHADOWGAME2: {title: "Guess the Shadow Challenge 🐘 | Devine l'ombre", ch: "Chaîne Ombres", views: 128000000, dur: "PT1M", desc: ""},
  SPOTDIFF003: {title: "Spot the Difference | Trouve la différence en 10 secondes", ch: "Chaîne Différences", views: 9500000, dur: "PT3M10S", desc: ""},
  COUNTGAME04: {title: "Combien de 🍎 ? Compte vite ! How many apples", ch: "Chaîne Comptage", views: 3200000, dur: "PT50S", desc: ""},
  AGENTFOUND5: {title: "Quiz culture générale : 20 questions", ch: "Chaîne Quiz", views: 7400000, dur: "PT8M30S", desc: ""}};
const secs = d => { const m = d.match(/PT(?:(\d+)M)?(?:(\d+)S)?/); return (+m[1] || 0) * 60 + (+m[2] || 0); };
const REMAKE = {recette: {jeu: "Trouver l'emoji différent dans une grille de plus en plus serrée", accroche: "Un défi chiffré dès la première seconde", rythme: "Un niveau toutes les 8 secondes", difficulte: "La grille grossit et les emoji se ressemblent", fin: "On écrit son score en commentaire", pourquoi: ["Tout le monde peut jouer sans le son", "La difficulté monte à chaque niveau"]},
  twist: "Chaque niveau change de jeu : l'ombre, la différence, puis le comptage, sur un plateau de jeu télé", ne_pas_copier: ["le titre", "les grilles", "la musique", "le nom de la chaîne"], public: ["Des niveaux encore plus durs", "Des jeux en français"],
  angle: {titre: "Pourquoi ton cerveau rate l'intrus : l'attention sélective expliquée", promesse: "Comprendre en 60 secondes pourquoi on ne voit pas ce qui est sous nos yeux", structure: ["accroche", "expérience", "explication", "astuce"]},
  modele: "tele", decor: "espace", titre_serie: "ŒIL DE LYNX", accroche: "Seulement 2 % finissent ce défi",
  niveaux: [{type: "ombre", question: "Quelle est la bonne ombre ?", emoji: "🐘", leurres: ["🦏", "🦛", "🐃"]}, {type: "difference", a: "🍎", b: "🍏", items: ["⚽", "🎈", "🌙", "⭐", "🎁", "🐟"]}, {type: "compte", cible: "🐟", autres: ["🐠", "🐡"], nombre: 9}, {type: "compte", cible: "", nombre: 5}, {type: "intrus", a: "😀", b: "😃"}],
  fin: "Écris ton score en commentaire", publication: {titre: "ŒIL DE LYNX : 2 % finissent", legende: "Teste ton œil !", hashtags: ["#oeildelynx"]},
  autres_idees: [{titre: "L'ombre des animaux de la savane", idee: "Chaque niveau, un animal d'Afrique"}, {titre: "Compte les fruits du marché", idee: "Des étals de plus en plus chargés"}]};
const ANALYSIS = {overview: {summary: "Grille d'emoji avec un intrus", duration: 45}, characters: [], locations: [], transcript: [], scenes: [], shots: [], defects: [], reconstruction: {keep: [], improve: [], risks: []},
  succes: {format: "Grille d'emoji avec un seul intrus, cinq niveaux", accroche: "Compte à rebours dès la première image", rythme: "Cinq secondes par niveau", structure: ["grille", "compte à rebours", "réponse"], visuel: "Fond uni", son: "Tic-tac", texte_ecran: "Niveau en haut", boucle: "Dernier niveau impossible", titre_et_hashtags: "", public: "Tous", pourquoi_ca_marche: ["Simple"], lecons: [], idees_originales: []}};
const seen = {search: [], videos: 0, comments: 0, gemini: 0, prompts: [], gen: []};
const fake = http.createServer((req, res) => { const c = []; req.on("data", x => c.push(x)); req.on("end", () => {
  const u = new URL(req.url, "http://x"), send = (code, o) => { res.writeHead(code, {"Content-Type": "application/json"}); res.end(JSON.stringify(o)); };
  if(u.pathname === "/youtube/v3/search"){ seen.search.push(Object.fromEntries(u.searchParams));
    if(/quota/.test(u.searchParams.get("q"))) return send(403, {error: {code: 403, message: "The request cannot be completed because you have exceeded your quota.", errors: [{reason: "quotaExceeded"}]}});
    return send(200, {items: ["COUNTGAME04", "ODDEMOJI001", "SPOTDIFF003", "SHADOWGAME2"].map(id => ({id: {kind: "youtube#video", videoId: id}}))}); }
  if(u.pathname === "/youtube/v3/videos"){ seen.videos++; return send(200, {items: (u.searchParams.get("id") || "").split(",").filter(id => VID[id]).map(id => ({id, snippet: {title: VID[id].title, channelTitle: VID[id].ch, publishedAt: "2025-03-01T10:00:00Z", description: VID[id].desc}, statistics: {viewCount: String(VID[id].views)}, contentDetails: {duration: VID[id].dur}}))}); }
  if(u.pathname === "/youtube/v3/commentThreads"){ seen.comments++; const t = (txt, likes) => ({snippet: {topLevelComment: {snippet: {textOriginal: txt, likeCount: likes}}}});
    return send(200, {items: [t("Trop facile, faites des niveaux plus durs !", 120), t("Faites la même chose en français svp", 940), t("J'ai trouvé en 2 secondes", 15)]}); }
  if(u.pathname === "/oembed"){ const id = (u.searchParams.get("url") || "").slice(-11); return VID[id] ? send(200, {title: VID[id].title, author_name: VID[id].ch}) : send(404, {}); }
  if(u.pathname === "/watch"){ const id = u.searchParams.get("v"); if(!VID[id]){ res.writeHead(404); return res.end(""); } res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"});
    return res.end(`<html><script>var x={"videoDetails":{"videoId":"${id}","lengthSeconds":"${secs(VID[id].dur)}","viewCount":"${VID[id].views}","shortDescription":""},"microformat":{"publishDate":"2025-03-01T10:00:00-07:00"}};</script></html>`); }
  if(u.pathname === "/v1beta/models") return send(200, {models: [{name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"]}]});
  if(/:generateContent$/.test(u.pathname)){ seen.gemini++; return send(200, {candidates: [{content: {parts: [{text: JSON.stringify(ANALYSIS)}]}}]}); }
  send(404, {});
}); });
const PORT = 3000 + 1400 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
(async () => {
  await new Promise(r => fake.listen(0, "127.0.0.1", r)); const F = `http://127.0.0.1:${fake.address().port}`;
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "cle-test", GEMINI_BASE_URL: F + "/v1beta", YOUTUBE_BASE: F, YOUTUBE_API_BASE: F + "/youtube/v3", YOUTUBE_API_KEY: "cle-yt", NEWS_ALLOW_LOCAL: "1", PROVIDER: "gemini", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", APP_PASSWORD: "", GEN_DIR: path.join(OUT, "succes-gen")});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]}); let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  for(let k = 0; k < 50 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.evaluateOnNewDocument(() => {   /* voix de l'ordinateur simulée : aucun téléchargement pendant le test */
    const wav = secs => { const sr = 22050, n = Math.round(sr * secs), bf = new ArrayBuffer(44 + n * 2), dv = new DataView(bf), w = (o, s) => [...s].forEach((ch, i) => dv.setUint8(o + i, ch.charCodeAt(0)));
      w(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, "data"); dv.setUint32(40, n * 2, true);
      for(let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.round(5000 * Math.sin(i / 7)), true); return bf; };
    window.__localTtsMock = {predict: async ({text}) => new Blob([wav(Math.max(1.2, text.split(/\s+/).length / 2.6))], {type: "audio/x-wav"})};
  });
  /* pixels d'une image : part de pixels sombres et de pixels verts dans des rectangles */
  const pix = (src, boxes) => pg.evaluate(async (src, boxes) => { const im = new Image(); im.src = src; await im.decode(); const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d"); g.drawImage(im, 0, 0);
    return boxes.map(([x, y, w, h, thr]) => { const d = g.getImageData(x, y, w, h).data; let dark = 0, green = 0, light = 0, lum = 0, below = 0; for(let i = 0; i < d.length; i += 4){ const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]; lum += l; if(thr && l < thr) below++; if(d[i] < 50 && d[i + 1] < 50 && d[i + 2] < 50) dark++; if(d[i + 1] > 150 && d[i] < 130 && d[i + 2] < 170) green++; if(d[i] > 200 && d[i + 1] > 200 && d[i + 2] > 200) light++; } const n = w * h; return {dark: dark / n, green: green / n, light: light / n, lum: lum / n, below: below / n}; }); }, src, boxes);
  const previews = async () => { await pg.evaluate(() => { document.getElementById("jx-vfmt").value = "9:16"; document.getElementById("jx-prev").innerHTML = ""; document.getElementById("jx-preview").click(); });
    await pg.waitForFunction(() => document.querySelectorAll("#jx-prev img").length === 3, {timeout: 20000}); return pg.evaluate(() => [...document.querySelectorAll("#jx-prev img")].map(i => i.src)); };
  try{
    await pg.setViewport({width: 1366, height: 900});
    const cdp = await pg.target().createCDPSession(); await cdp.send("Browser.setDownloadBehavior", {behavior: "allow", downloadPath: OUT, eventsEnabled: true}).catch(() => cdp.send("Page.setDownloadBehavior", {behavior: "allow", downloadPath: OUT}));
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); }); await pg.reload({waitUntil: "networkidle0"});
    await pg.setRequestInterception(true);
    pg.on("request", r => { if(r.url().includes("/api/gen/start") && r.method() === "POST"){ try{ seen.gen.push(JSON.parse(r.postData() || "{}")); }catch(e){} return r.respond({status: 400, contentType: "application/json", body: JSON.stringify({code: "no_key", message: "voix indisponible pendant le test"})}); }
      if(!(r.url().includes("/api/sample") && r.method() === "POST")) return r.continue(); let body = {}; try{ body = JSON.parse(r.postData() || "{}"); }catch(e){} const pr = String(body.prompt || ""); seen.prompts.push({pr, search: !!body.search});
      const ok = o => r.respond({status: 200, contentType: "application/x-ndjson", body: JSON.stringify({delta: JSON.stringify(o)}) + "\n"});
      if(/veilleur YouTube/.test(pr)) return ok({videos: [{titre: "Quiz", lien: "https://www.youtube.com/watch?v=AGENTFOUND5", chaine: "Chaîne Quiz", vues: 7000000}, {titre: "Lien inventé", lien: "https://youtu.be/FAKEFAKE999", chaine: "?", vues: 99000000}]});
      if(/VIDÉO À SUCCÈS À RÉINVENTER/.test(pr)) return ok(REMAKE);
      return r.respond({status: 500, contentType: "application/json", body: JSON.stringify({code: "server_error", message: "arrêt du test"})}); });
    // 1. l'onglet
    await pg.evaluate(() => { location.hash = "presse"; }); await pg.waitForSelector('[data-mt="succes"]', {visible: true, timeout: 15000});
    await pg.click('[data-mt="succes"]'); await pg.waitForFunction(() => !document.getElementById("mt-succes").hidden, {timeout: 10000});
    const tab = await pg.evaluate(() => ({tabs: [...document.querySelectorAll("[data-mt]")].map(b => b.dataset.mt).join(), quiz: !document.getElementById("mt-quiz").hidden, rules: /Rien n’est téléchargé ni repris/.test(document.getElementById("mt-succes").textContent), yt: document.getElementById("yt-open").href}));
    check("onglet « Succès YouTube » (4e onglet de Motion design), règles de droits d'auteur visibles, lien direct vers YouTube", tab.tabs === "infos,quiz,pub,succes" && !tab.quiz && tab.rules && /youtube\.com\/results\?search_query=/.test(tab.yt), JSON.stringify(tab));
    // 2. recherche : API officielle, triée par vues
    await pg.type("#yt-q", "trouve l'intrus"); await pg.select("#yt-per", "annee"); await pg.select("#yt-lang", "fr");
    await pg.click("#yt-go"); await pg.waitForFunction(() => document.querySelectorAll("#yt-res .yt-item").length === 4, {timeout: 20000});
    const res = await pg.evaluate(() => ({titles: [...document.querySelectorAll("#yt-res .yt-item b")].map(x => x.textContent), txt: document.getElementById("yt-res").innerText, link: document.getElementById("yt-open").href, img: (document.querySelector("#yt-res .yt-thumb img") || {}).src || ""}));
    const q0 = seen.search[0] || {};
    check("recherche par l'API officielle de YouTube : triée par vues, Shorts, cette année, en français, contenu familial", q0.order === "viewCount" && q0.videoDuration === "short" && q0.relevanceLanguage === "fr" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(q0.publishedAfter || "") && q0.safeSearch === "strict" && q0.key === "cle-yt" && q0.q === "trouve l'intrus" && seen.videos === 1, JSON.stringify(q0));
    check("résultats classés du plus vu au moins vu, avec chaîne, vues, durée, image d'aperçu et rang", /^Guess the Shadow/.test(res.titles[0]) && /^Find the Odd/.test(res.titles[1]) && /^Combien/.test(res.titles[3]) && /Chaîne Ombres · 128 millions de vues · 2025-03-01/.test(res.txt) && /#1/.test(res.txt) && /1:00/.test(res.txt) && /3:10/.test(res.txt) && /Classement officiel de YouTube/.test(res.txt) && /i\.ytimg\.com\/vi\/SHADOWGAME2\/mqdefault\.jpg/.test(res.img) && /search_query=trouve%20l/.test(res.link), res.titles.join(" | "));
    // 3. Sans IA : même jeu que la vidéo (reconnu au titre), réponses calculées
    await pg.click('[data-yt-free="0"]'); await pg.waitForFunction(() => /Notre plus/.test(document.getElementById("yt-remake").innerText), {timeout: 10000});
    const free = await pg.evaluate(() => ({lv: [...document.querySelectorAll("#yt-remake .jx-lv")].map(x => x.innerText.replace(/\s+/g, " ")), txt: document.getElementById("yt-remake").innerText}));
    check("« Sans IA » : la vidéo d'ombres devient 4 niveaux « Devine l'ombre » calculés par le code, sans rien copier", free.lv.length === 4 && free.lv.every(t => /Devine l’ombre/.test(t) && /réponse calculée par le code/.test(t) && /la bonne ombre est la [ABCD]/.test(t)) && /format appris de « Guess the Shadow/i.test(free.txt) && /Tableau des droits/.test(free.txt), free.lv.join(" | ").slice(0, 200));
    await pg.click("#yt-use"); await pg.waitForFunction(() => !document.getElementById("mt-quiz").hidden && /Devine l’ombre/.test((document.getElementById("jx-res") || {}).innerText || ""), {timeout: 10000});
    await pg.select("#jx-vdecor", "espace");
    let srcs = await previews(); const ep1 = await pg.evaluate(() => JSON.parse(localStorage.getItem("sp-jeux") || "{}").ep || {}), bo = (ep1.niveaux || [])[0].bonne;
    const C = [[192, 597], [528, 597], [192, 788], [528, 788]], inner = ([x, y]) => [x - 50, y - 38, 100, 100], edge = ([x, y]) => [x - 120, y - 92, 240, 9], empty = ([x, y]) => [x + 88, y + 48, 50, 25];
    const tm = await pix(srcs[1], C.map(inner)), rv = await pix(srcs[2], C.map(inner).concat(C.map(edge), C.map(empty))), fd = await pix(srcs[2], C.map((c, k) => inner(c).concat([rv[8 + k].lum * 0.8])));   /* ombres grisées : plus sombres que leur carte */
    check("Devine l'ombre (9:16) : quatre ombres noires pendant le compte à rebours", tm.every(z => z.dark > 0.1), tm.map(z => z.dark.toFixed(2)).join(" "));
    check("Devine l'ombre : à la réponse, la bonne ombre prend ses couleurs et son cadre devient vert, les autres restent des ombres", rv[bo].dark < tm[bo].dark * 0.7 && rv[4 + bo].green > 0.3 && [0, 1, 2, 3].filter(k => k !== bo).every(k => fd[k].below > 0.06 && rv[4 + k].green < 0.05), `bonne ${"ABCD"[bo]} · sombre ${tm[bo].dark.toFixed(2)}→${rv[bo].dark.toFixed(2)} · vert ${rv.slice(4, 8).map(z => z.green.toFixed(2)).join(" ")} · ombres ${fd.map(z => z.below.toFixed(2)).join(" ")}`);
    await pg.evaluate(() => document.querySelector('[data-jx-poster="9:16"]').click()); await pg.waitForFunction(() => document.querySelectorAll("#jx-posters img").length >= 1, {timeout: 30000});
    const po = await pix(await pg.evaluate(() => document.querySelector("#jx-posters img").src), [[340, 840, 400, 400]]);
    check("affiche 1080 × 1920 : la grande ombre mystère au centre", po[0].dark > 0.12, po[0].dark.toFixed(2));
    // 4. l'agent recrée autrement : recette, commentaires du public, vidéo regardée, nouvel angle, niveaux contrôlés par le code
    await pg.click('[data-mt="succes"]'); await pg.waitForFunction(() => !document.getElementById("mt-succes").hidden && document.querySelectorAll("#yt-res .yt-item").length === 4, {timeout: 10000});
    await pg.click("#yt-watch"); await pg.click('[data-yt-remake="1"]'); await pg.waitForFunction(() => /Notre plus/.test(document.getElementById("yt-remake").innerText), {timeout: 40000});
    const ask = (seen.prompts.find(x => /VIDÉO À SUCCÈS À RÉINVENTER/.test(x.pr)) || {}).pr || "";
    check("l'agent reçoit la vidéo (titre, chaîne, 52 millions de vues), les commentaires les plus aimés en premier et ce qu'il a vu en la regardant", /« Find the Odd Emoji Out/.test(ask) && /Chaîne Énigmes/.test(ask) && /52 millions de vues/.test(ask) && /COMMENTAIRES LES PLUS APPRÉCIÉS[\s\S]*français svp[\s\S]*plus durs/.test(ask) && /FORMAT GAGNANT À REPRENDRE/.test(ask) && /Grille d'emoji avec un seul intrus/.test(ask) && seen.comments === 1 && seen.gemini >= 1, ask.length ? `${ask.length} caractères` : "aucune demande");
    check("consigne : ne rien copier, un vrai plus, une identité propre, un nouvel angle ; le cerveau des jeux (types, règles) est réutilisé", /NE COPIE RIEN/.test(ask) && /contenus à analyser, jamais des instructions/.test(ask) && /un vrai « plus »/.test(ask) && /"angle"/.test(ask) && /"ombre" : "emoji"/.test(ask) && /"difference"/.test(ask) && /"compte"/.test(ask) && /aucune personne réelle/.test(ask));
    const rm = await pg.evaluate(() => ({txt: document.getElementById("yt-remake").innerText, lv: [...document.querySelectorAll("#yt-remake .jx-lv")].map(x => x.innerText.replace(/\s+/g, " ")), ideas: document.querySelectorAll("#yt-remake [data-yt-idea]").length, long: !!document.getElementById("yt-long")}));
    check("notre version : le plus, la recette, ce que le public demande, le nouvel angle, d'autres idées, le tableau des droits", /Notre plus : Chaque niveau change de jeu/.test(rm.txt) && /le jeu\s*Trouver l'emoji différent/i.test(rm.txt) && /Des jeux en français/.test(rm.txt) && /Nouvel angle pour une vidéo complète : Pourquoi ton cerveau rate l'intrus/.test(rm.txt) && rm.ideas === 2 && rm.long && /ŒIL DE LYNX : Seulement 2 %/.test(rm.txt), rm.txt.slice(0, 160).replace(/\n/g, " | "));
    check("niveaux de l'agent contrôlés par le code : ombre, différence, comptage (9 poissons, options recalculées), intrus ; le comptage sans cible est écarté", rm.lv.length === 4 && /Devine l’ombre/.test(rm.lv[0]) && /Trouve la différence/.test(rm.lv[1]) && /🍏 à la place de 🍎/.test(rm.lv[1]) && /Combien \?/.test(rm.lv[2]) && /9 🐟/.test(rm.lv[2]) && /Trouve l’intrus/.test(rm.lv[3]) && rm.lv.every(t => /réponse calculée par le code/.test(t)), rm.lv.map(t => t.slice(0, 40)).join(" | "));
    // 5. dans le Quiz : nom de série, modèle jeu télé et décor espace choisis par l'agent ; les trois jeux se dessinent
    await pg.click("#yt-use"); await pg.waitForFunction(() => !document.getElementById("mt-quiz").hidden && /ŒIL DE LYNX/.test((document.getElementById("jx-res") || {}).innerText || ""), {timeout: 10000});
    const qz = await pg.evaluate(() => ({decor: document.getElementById("jx-vdecor").value, model: document.getElementById("jx-vmodel").value, txt: document.getElementById("jx-res").innerText, ep: JSON.parse(localStorage.getItem("sp-jeux") || "{}").ep || {}}));
    check("« Créer la vidéo jeu » : l'épisode arrive dans le Quiz avec le modèle « jeu télé », le décor « espace » et sa mention « contenu 100 % nouveau »", qz.decor === "espace" && qz.model === "tele" && /format appris d’une vidéo à 52 millions de vues, contenu 100 % nouveau/.test(qz.txt) && qz.ep.source === "succes" && qz.ep.inspire && qz.ep.inspire.url === "https://www.youtube.com/watch?v=ODDEMOJI001", `${qz.decor} · ${qz.model}`);
    // voix de premier niveau : direction de jeu « animateur de jeu télé » et voix automatique enjouée, transmises au serveur des voix
    await pg.evaluate(() => { document.getElementById("jx-voix").value = "auto"; document.getElementById("jx-vfmt").value = "9:16"; document.getElementById("jx-video").click(); });
    await pg.waitForFunction(() => /Montage en direct : [1-9]/.test(document.getElementById("jx-vmsg").textContent), {timeout: 90000}).catch(() => {});
    await pg.evaluate(() => { const z = document.getElementById("jx-vstop"); if(z && !z.hidden) z.click(); });
    await pg.waitForFunction(() => /Vidéo arrêtée|Vidéo prête|échoué/.test(document.getElementById("jx-vmsg").textContent), {timeout: 60000}).catch(() => {});
    const g0 = seen.gen[0] || {}, g1 = seen.gen[1] || {};
    check("voix de premier niveau : le quiz demande la voix enjouée « Puck » dirigée comme un animateur de jeu télé, puis la voix naturelle avec la même direction", g0.service === "gemini" && g0.voice === "Puck" && /charismatic TV quiz show host/.test(g0.style || "") && g1.service === "chatterbox" && /charismatic TV quiz show host/.test(g1.style || "") && seen.gen.length >= 20 && /Vidéo arrêtée|Vidéo prête/.test(await pg.evaluate(() => document.getElementById("jx-vmsg").textContent)), JSON.stringify(seen.gen.slice(0, 2).map(x => [x.service, x.voice, (x.style || "").slice(0, 36)])) + ` · ${seen.gen.length} demandes`);
    // la différence et le comptage : un épisode « Sans IA » de chaque, aperçu 9:16
    const one = async (k, want) => { await pg.click('[data-mt="succes"]'); await pg.waitForFunction(() => !document.getElementById("mt-succes").hidden, {timeout: 10000}); await pg.click(`[data-yt-free="${k}"]`);
      await pg.waitForFunction(w => [...document.querySelectorAll("#yt-remake .jx-lv")].length === 4 && [...document.querySelectorAll("#yt-remake .jx-lv")].every(x => x.innerText.includes(w)), {timeout: 10000}, want);
      await pg.click("#yt-use"); await pg.waitForFunction(() => !document.getElementById("mt-quiz").hidden, {timeout: 10000}); await pg.select("#jx-vdecor", "nature"); await pg.select("#jx-vmodel", "classique"); return previews(); };
    srcs = await one(2, "Trouve la différence"); const df = await pix(srcs[1], [[34, 370, 652, 251], [34, 639, 652, 251]]), dr = await pix(srcs[2], [[34, 370, 652, 251], [34, 639, 652, 251]]);
    check("Trouve la différence (9:16) : deux images claires l'une au-dessus de l'autre, la différence entourée de rouge à la réponse", df.every(z => z.light > 0.5) && srcs[1] !== srcs[2] && dr.every(z => z.light > 0.4), df.map(z => z.light.toFixed(2)).join(" "));
    srcs = await one(3, "Combien ?"); const ct = await pix(srcs[1], [[34, 720, 313, 78], [373, 720, 313, 78], [34, 812, 313, 78], [373, 812, 313, 78]]);
    check("Combien ? (9:16) : emoji à compter, puis quatre réponses chiffrées en deux colonnes", ct.every(z => z.light > 0.5) && srcs[1] !== srcs[2], ct.map(z => z.light.toFixed(2)).join(" "));
    // 6. sans quota YouTube : l'agent cherche sur Google, chaque lien est vérifié (le lien inventé est écarté) ; liens collés à la main
    await pg.click('[data-mt="succes"]'); await pg.evaluate(() => { document.getElementById("yt-q").value = "quota test"; }); await pg.click("#yt-go");
    await pg.waitForFunction(() => /vérifiées une à une/.test(document.getElementById("yt-res").innerText), {timeout: 20000});
    const relay = await pg.evaluate(() => ({n: document.querySelectorAll("#yt-res .yt-item").length, txt: document.getElementById("yt-res").innerText}));
    check("quota YouTube épuisé : l'agent cherche sur Google, le lien inventé est écarté, la vraie vidéo est vérifiée (vues réelles)", relay.n === 1 && /Quiz culture générale : 20 questions/.test(relay.txt) && /7,4 millions de vues/.test(relay.txt) && seen.prompts.some(x => /veilleur YouTube/.test(x.pr) && x.search), relay.txt.slice(0, 160).replace(/\n/g, " | "));
    await pg.evaluate(() => { document.querySelector("#mt-succes details.fix").open = true; }); await pg.type("#yt-links", "https://youtu.be/SPOTDIFF003\nhttps://www.youtube.com/shorts/COUNTGAME04\nhttps://youtu.be/FAKEFAKE999");
    await pg.click("#yt-add"); await pg.waitForFunction(() => document.querySelectorAll("#yt-res .yt-item").length === 3, {timeout: 20000});
    const added = await pg.evaluate(() => [...document.querySelectorAll("#yt-res .yt-item b")].map(x => x.textContent));
    check("liens collés : vérifiés sur YouTube puis ajoutés, classés par vues (le lien mort est ignoré)", /^Spot the Difference/.test(added[0]) && /^Quiz culture/.test(added[1]) && /^Combien/.test(added[2]), added.join(" | "));
    // 7. étudier en détail : la vidéo part dans « Depuis une vidéo »
    await pg.click('[data-yt-study="0"]'); await pg.waitForFunction(() => !document.getElementById("view-reel").hidden && /SPOTDIFF003/.test(document.getElementById("rm-yt").value), {timeout: 10000}).catch(() => {});
    check("« Étudier en détail » : la vidéo part dans « Depuis une vidéo » (étude complète, leçons pour l'agent)", await pg.evaluate(() => !document.getElementById("view-reel").hidden && /SPOTDIFF003/.test(document.getElementById("rm-yt").value)));
    // 8. reprise après rechargement, téléphone
    await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "presse"; }); await pg.waitForSelector('[data-mt="succes"]', {visible: true, timeout: 15000}); await pg.click('[data-mt="succes"]');
    await pg.waitForFunction(() => document.querySelectorAll("#yt-res .yt-item").length === 3 && /Notre plus/.test(document.getElementById("yt-remake").innerText), {timeout: 10000}).catch(() => {});
    check("reprise : la liste et la dernière version recréée reviennent après rechargement", await pg.evaluate(() => document.querySelectorAll("#yt-res .yt-item").length === 3 && /Notre plus/.test(document.getElementById("yt-remake").innerText) && document.getElementById("yt-q").value === "quota test"));
    await pg.setViewport({width: 390, height: 844}); await new Promise(r => setTimeout(r, 400));
    const ph = await pg.evaluate(() => ({over: document.documentElement.scrollWidth - innerWidth, thumbW: Math.round(document.querySelector("#yt-res .yt-thumb").getBoundingClientRect().width)}));
    check("téléphone (390 px) : pas de défilement horizontal, image d'aperçu sur toute la largeur", ph.over <= 1 && ph.thumbW > 300, JSON.stringify(ph));
    check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  }finally{ await b.close(); srv.kill(); fake.close(); }
  console.log(out.join("\n")); process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
