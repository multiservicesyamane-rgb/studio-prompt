// Revue de presse : vrai server.js face à de FAUX Google Actualités, Google voix et site d'actualité ; l'IA qui écrit est simulée.
// Infos du jour cochées, écriture fidèle aux sources, voix d'or partie par partie, audio complet, textes + liens, vidéo, reprise.
const p = require("puppeteer-core"), http = require("http"), fs = require("fs"), path = require("path"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const rss = items => `<?xml version="1.0"?><rss><channel>${items.map(([t, s]) => `<item><title>${t} - ${s}</title><link>https://news.google.com/rss/articles/abc</link><pubDate>Mon, 05 Oct 2026 08:00:00 GMT</pubDate><source url="https://${s.toLowerCase()}.sn">${s}</source></item>`).join("")}</channel></rss>`;
const tts = [], seen = {news: [], prompt: ""};
const fake = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), c = []; req.on("data", x => c.push(x)); req.on("end", () => {
    const send = (code, o, type) => { res.writeHead(code, {"Content-Type": type || "application/json"}); res.end(typeof o === "string" ? o : JSON.stringify(o)); };
    if(u.pathname === "/v1beta/models") return send(200, {models: [{name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"]}]});
    if(u.pathname === "/v1beta/interactions"){ const o = JSON.parse(Buffer.concat(c).toString("utf8")), it = o.input[0].content[0];
      tts.push({voice: o.generation_config.speech_config[0].voice, text: it.text, style: it.annotations && it.annotations[0].style});
      return send(200, {steps: [{type: "model_output", content: [{type: "audio", data: Buffer.alloc(48000, 1).toString("base64")}]}]}); }
    if(u.pathname === "/rss"){ seen.news.push("une " + u.search); return send(200, rss([["Inondations à Dakar : les sinistrés attendent l'aide", "BBC"], ["Rentrée scolaire : les syndicats haussent le ton", "NDARINFO"], ["La flamme des JOJ traverse Louga", "Olympics"]]), "application/rss+xml"); }
    if(u.pathname === "/rss/search"){ const q = u.searchParams.get("q"); seen.news.push(q); const site = (q.match(/site:([^\s]+)/) || [])[1] || "";
      return send(200, rss(site ? [[`Titre du jour de ${site}`, site.split(".")[0]], [`Deuxième titre de ${site}`, site.split(".")[0]]] : [["Résultat de recherche", "RTS"]]), "application/rss+xml"); }
    if(u.pathname === "/article.html") return send(200, `<html><head><title>Le port de Dakar bat un record</title></head><body><nav>menu</nav><article><p>Le port autonome de Dakar a traité un volume record de marchandises au troisième trimestre, selon sa direction générale.</p><p>Cette hausse s'explique par la reprise des échanges avec le Mali et par la modernisation des quais, a précisé le directeur.</p><p>Abonnez-vous à notre newsletter pour ne rien manquer.</p></article></body></html>`, "text/html; charset=utf-8");
    send(404, {error: {message: "inconnu " + u.pathname}});
  });
});
const REVUE = {titre: "Dakar sous l'eau, l'école en colère", accroche: "Bonjour, voici l'essentiel de ce lundi.", segments: [{titre: "Inondations à Dakar", texte: "Selon la BBC, les sinistrés des inondations à Dakar attendent toujours l'aide promise.", sources: ["BBC"]}, {titre: "Rentrée sous tension", texte: "NDARINFO rapporte que les syndicats d'enseignants haussent le ton.", sources: ["NDARINFO"]}],
  conclusion: "Une journée entre urgence et revendications.", appel: "Abonne-toi pour ne rien manquer.", publication: {titres: ["Dakar sous l'eau", "L'actu du jour"], description: "La revue du jour.", hashtags: ["#Sénégal"]}, a_verifier: ["Le montant de l'aide annoncée"]};
const PORT = 3000 + 800 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
(async () => {
  await new Promise(r => fake.listen(0, "127.0.0.1", r)); const F = `http://127.0.0.1:${fake.address().port}`;
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "cle-test", GEMINI_BASE_URL: F + "/v1beta", GOOGLE_NEWS_BASE: F, NEWS_ALLOW_LOCAL: "1", PROVIDER: "gemini", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", APP_PASSWORD: "", GEN_DIR: path.join(OUT, "presse-gen"), GEN_POLL_MS: "50"});
  fs.rmSync(env.GEN_DIR, {recursive: true, force: true});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]}); let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  for(let k = 0; k < 50 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  try{
    const cdp = await pg.target().createCDPSession(); await cdp.send("Browser.setDownloadBehavior", {behavior: "allow", downloadPath: OUT, eventsEnabled: true}).catch(() => cdp.send("Page.setDownloadBehavior", {behavior: "allow", downloadPath: OUT}));
    await pg.setViewport({width: 1366, height: 900});
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); }); await pg.reload({waitUntil: "networkidle0"});
    await pg.setRequestInterception(true);
    pg.on("request", r => { if(r.url().includes("/api/sample") && r.method() === "POST"){ try{ seen.prompt = JSON.parse(r.postData()).prompt || ""; }catch(e){}
      return r.respond({status: 200, contentType: "application/x-ndjson", body: JSON.stringify({delta: JSON.stringify(REVUE)}) + "\n" + JSON.stringify({model: "simulation"}) + "\n"}); } r.continue(); });
    // 1. page et journaux du pays
    await pg.click('.side-link[data-go="presse"]'); await pg.waitForFunction(() => !document.getElementById("view-presse").hidden && document.getElementById("pr-voix").options.length > 5, {timeout: 15000});
    const st = await pg.evaluate(() => ({pays: document.getElementById("pr-pays").value, sites: document.getElementById("pr-sites").value.split("\n"), lang: document.getElementById("pr-langue").value, voix: document.getElementById("pr-voix").value, links: document.querySelectorAll(".side-link").length}));
    check("menu « Depuis des infos » : pays, grands journaux du pays (modifiables), langue et voix", st.pays === "sn" && st.sites.includes("seneweb.com") && st.sites.includes("lesoleil.sn") && st.lang === "fr" && st.voix === "Charon" && st.links === 13, JSON.stringify(st));
    // 2. infos du jour
    await pg.click("#pr-fetch"); await pg.waitForSelector("#pr-news .pr-list", {timeout: 15000});
    const news = await pg.evaluate(() => ({groups: [...document.querySelectorAll("#pr-news .pr-grp")].map(g => g.textContent), items: document.querySelectorAll("#pr-news [data-pr-item]").length, checked: document.querySelectorAll("#pr-news [data-pr-item]:checked").length, first: (document.querySelector("#pr-news .pr-item") || {}).innerText || ""}));
    check("infos du jour : une de Google Actualités (édition du pays) + titres de chaque journal", news.groups[0].startsWith("À la une") && news.groups.includes("seneweb.com") && news.items >= 15 && seen.news.some(x => /gl=SN/.test(x)) && seen.news.some(x => /site:dakaractu\.com when:2d/.test(x)) && /Inondations à Dakar/.test(news.first) && !/- BBC/.test(news.first), JSON.stringify({groups: news.groups.length, items: news.items, checked: news.checked}));
    await pg.evaluate(() => { const c = [...document.querySelectorAll("#pr-news [data-pr-item]")].find(x => /Olympics/.test(x.parentElement.innerText)); if(c) c.checked = false; });
    // 3. écriture fidèle
    await pg.select("#pr-duree", "60"); await pg.select("#pr-ton", "inspirant"); await pg.select("#pr-voix", "Sadaltager");
    await pg.click("#pr-go"); await pg.waitForSelector("#pr-res .pr-seg", {timeout: 20000});
    check("l'agent reçoit seulement les infos cochées, attribuées à leur média, avec les règles de vérité", /\[BBC\] Inondations à Dakar/.test(seen.prompt) && /\[seneweb\] Titre du jour de seneweb\.com/.test(seen.prompt) && !/flamme des JOJ/.test(seen.prompt) && /VÉRITÉ \(non négociable\)/.test(seen.prompt) && /144 mots/.test(seen.prompt) && /n'invente aucun fait/.test(seen.prompt));
    const res = await pg.evaluate(() => ({segs: document.querySelectorAll("#pr-res .pr-seg").length, txt: document.getElementById("pr-res").innerText}));
    check("revue affichée : accroche, sujets avec sources, conclusion, publication, points à vérifier", res.segs === 4 && /Sources : BBC/.test(res.txt) && /Le montant de l'aide annoncée/.test(res.txt) && /Dakar sous l'eau/.test(res.txt), `${res.segs} parties`);
    await pg.evaluate(() => { const t = document.querySelector('[data-pr-edit="seg-1"]'); t.value = "NDARINFO rapporte que les syndicats d'enseignants menacent de faire grève."; t.dispatchEvent(new Event("input", {bubbles: true})); });
    await new Promise(r => setTimeout(r, 600));
    // 4. voix d'or
    await pg.click("#pr-voice"); await pg.waitForFunction(() => document.querySelectorAll("#pr-voices audio").length === 4, {timeout: 30000});
    check("voix d'or : chaque partie lue par la voix choisie, style grand présentateur, texte corrigé pris en compte", tts.length === 4 && tts.every(t => t.voice === "Sadaltager" && /world-class news anchor/.test(t.style)) && tts.some(t => /menacent de faire grève/.test(t.text)), JSON.stringify(tts.map(t => t.voice)));
    // 5. audio complet
    fs.readdirSync(OUT).filter(f => /revue-de-presse.*\.wav$/.test(f)).forEach(f => fs.rmSync(path.join(OUT, f), {force: true}));   // un ancien fichier ferait nommer le nouveau « (1) »
    const before = new Set(fs.readdirSync(OUT));
    await pg.click("#pr-dl"); let wav = "";
    for(let k = 0; k < 60 && !wav; k++){ await new Promise(r => setTimeout(r, 200)); wav = fs.readdirSync(OUT).find(f => !before.has(f) && /revue-de-presse\.wav$/.test(f)) || ""; }
    const wb = wav ? fs.readFileSync(path.join(OUT, wav)) : Buffer.alloc(0), secs = wb.length > 44 ? (wb.length - 44) / (wb.readUInt32LE(24) * 2) : 0;
    check("audio complet téléchargé : les 4 parties bout à bout avec de courts silences", wb.slice(0, 4).toString() === "RIFF" && secs > 5.5 && secs < 6.2, `${wav} · ${secs.toFixed(2)} s`);
    // 6. mes textes + lien d'article
    await pg.select("#pr-mode", "textes");
    await pg.type("#pr-text", "Communiqué : la mairie ouvre trois centres d'accueil pour les familles sinistrées.");
    await pg.type("#pr-links", `${F}/article.html\nhttps://news.google.com/rss/articles/xyz`);
    await pg.click("#pr-go"); await pg.waitForFunction(() => document.getElementById("pr-go").disabled === false && /centres d'accueil|ARTICLE/.test(window.__x || "") || document.querySelectorAll("#pr-res .pr-seg").length, {timeout: 20000});
    await new Promise(r => setTimeout(r, 800));
    check("mes textes + lien : article lu par le serveur (sans menus ni pubs), lien Google Actualités refusé avec explication", /centres d'accueil/.test(seen.prompt) && /ARTICLE de 127\.0\.0\.1 · « Le port de Dakar bat un record »/.test(seen.prompt) && /volume record de marchandises/.test(seen.prompt) && !/Abonnez-vous/.test(seen.prompt) && !/menu/.test(seen.prompt.split("ARTICLE")[1] || ""), (seen.prompt.split("MATIÈRE")[1] || "").slice(0, 160).replace(/\n/g, " "));
    // 7. reprise après rechargement, puis vidéo
    await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "presse"; }); await pg.waitForSelector("#pr-res .pr-seg", {timeout: 15000});
    check("la dernière revue est retrouvée après rechargement de la page", await pg.evaluate(() => /Dakar sous l'eau/.test(document.getElementById("pr-res").innerText)));
    await pg.click("#pr-studio"); await new Promise(r => setTimeout(r, 400));
    const idee = await pg.evaluate(() => ({vue: !document.getElementById("view-studio").hidden, txt: document.getElementById("idee").value}));
    check("« En faire une vidéo » : le texte de la revue part dans « Depuis une idée »", idee.vue && /revue de presse/.test(idee.txt) && /Selon la BBC/.test(idee.txt));
    await pg.evaluate(() => { location.hash = "presse"; }); await pg.setViewport({width: 390, height: 844}); await new Promise(r => setTimeout(r, 400));
    check("page sur téléphone : pas de défilement horizontal", await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1);
    check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  }finally{ await b.close(); srv.kill(); fake.close(); }
  console.log(out.join("\n")); process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
