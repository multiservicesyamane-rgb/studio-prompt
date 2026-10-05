// Revue de presse : vrai server.js face à de FAUX Google Actualités, Google voix et site d'actualité ; l'IA qui écrit est simulée.
// Infos du jour cochées, écriture fidèle aux sources, voix d'or partie par partie, audio complet, textes + liens, vidéo, reprise.
const p = require("puppeteer-core"), http = require("http"), fs = require("fs"), path = require("path"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const rss = items => `<?xml version="1.0"?><rss><channel>${items.map(([t, s]) => `<item><title>${t} - ${s}</title><link>https://news.google.com/rss/articles/abc</link><pubDate>Mon, 05 Oct 2026 08:00:00 GMT</pubDate><source url="https://${s.toLowerCase()}.sn">${s}</source></item>`).join("")}</channel></rss>`;
const tts = [], seen = {news: [], prompt: "", photos: []};
const zlib = require("zlib");
function png(w, h){ const crc = b => { let c, t = []; for(let n = 0; n < 256; n++){ c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for(const v of b) x = t[(x ^ v) & 255] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h); for(let y = 0; y < h; y++){ raw[y * (w * 3 + 1)] = 0; for(let x = 0; x < w * 3; x++) raw[y * (w * 3 + 1) + 1 + x] = (x * 7 + y * 13 + (Math.random() * 60 | 0)) & 255; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, {level: 0})), chunk("IEND", Buffer.alloc(0))]); }
const PNG = png(96, 64);
function speech(text){ const paras = String(text).split(/\n\n+/), sr = 24000, out = []; paras.forEach(() => { const tone = Buffer.alloc(Math.round(sr * 0.7) * 2), sil = Buffer.alloc(Math.round(sr * 0.6) * 2); for(let i = 0; i < tone.length / 2; i++) tone.writeInt16LE(Math.round(9000 * Math.sin(i / sr * 2 * Math.PI * 220)), i * 2); out.push(tone, sil); }); return Buffer.concat(out); }
const fake = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x"), c = []; req.on("data", x => c.push(x)); req.on("end", () => {
    const send = (code, o, type) => { res.writeHead(code, {"Content-Type": type || "application/json"}); res.end(typeof o === "string" ? o : JSON.stringify(o)); };
    if(u.pathname === "/v1beta/models") return send(200, {models: [{name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"]}]});
    if(u.pathname === "/v1beta/interactions"){ const o = JSON.parse(Buffer.concat(c).toString("utf8")), it = o.input[0].content[0];
      tts.push({voice: o.generation_config.speech_config[0].voice, text: it.text, style: it.annotations && it.annotations[0].style});
      return send(200, {steps: [{type: "model_output", content: [{type: "audio", data: speech(it.text).toString("base64")}]}]}); }
    if(u.pathname === "/v1/images/"){ seen.photos.push(u.searchParams.get("q") + " | " + u.searchParams.get("license_type")); const F0 = `http://127.0.0.1:${fake.address().port}`;
      return send(200, {result_count: 2, results: [{title: "Flooded street", url: `${F0}/img/flood.png`, thumbnail: `${F0}/img/flood.png`, width: 1024, height: 768, creator: "Jeff Attaway", license: "by", license_version: "2.0", source: "flickr", foreign_landing_url: "https://flickr.com/x"}, {title: "Petite", url: `${F0}/img/small.png`, thumbnail: `${F0}/img/small.png`, width: 300, height: 200, creator: "X", license: "by", license_version: "2.0", source: "flickr"}]}); }
    if(u.pathname === "/w/api.php"){ const F0 = `http://127.0.0.1:${fake.address().port}`;
      return send(200, {query: {pages: {"1": {index: 1, title: "File:Rain in Dakar.jpg", imageinfo: [{url: `${F0}/img/rain.png`, thumburl: `${F0}/img/rain.png`, thumbwidth: 1280, thumbheight: 853, mime: "image/png", descriptionurl: "https://commons.wikimedia.org/wiki/File:Rain", extmetadata: {LicenseShortName: {value: "CC BY-SA 4.0"}, Artist: {value: "<a>Awa Photo</a>"}}}]},
        "2": {index: 2, title: "File:Interdit.jpg", imageinfo: [{url: `${F0}/img/nc.png`, thumburl: `${F0}/img/nc.png`, thumbwidth: 1280, mime: "image/png", extmetadata: {LicenseShortName: {value: "CC BY-NC 2.0"}, Artist: {value: "Y"}}}]}}}}); }
    if(u.pathname.startsWith("/img/")){ res.writeHead(200, {"Content-Type": "image/png"}); return res.end(PNG); }
    if(u.pathname === "/rss"){ seen.news.push("une " + u.search); return send(200, rss([["Inondations à Dakar : les sinistrés attendent l'aide", "BBC"], ["Rentrée scolaire : les syndicats haussent le ton", "NDARINFO"], ["La flamme des JOJ traverse Louga", "Olympics"]]), "application/rss+xml"); }
    if(u.pathname === "/rss/search"){ const q = u.searchParams.get("q"); seen.news.push(q); const site = (q.match(/site:([^\s]+)/) || [])[1] || "";
      return send(200, rss(site ? [[`Titre du jour de ${site}`, site.split(".")[0]], [`Deuxième titre de ${site}`, site.split(".")[0]]] : [["Résultat de recherche", "RTS"]]), "application/rss+xml"); }
    if(u.pathname === "/article.html") return send(200, `<html><head><title>Le port de Dakar bat un record</title><meta property="og:site_name" content="Dakar Port Info"></head><body><nav>menu</nav><article><p>Le port autonome de Dakar a traité un volume record de marchandises au troisième trimestre, selon sa direction générale.</p><p>Cette hausse s'explique par la reprise des échanges avec le Mali et par la modernisation des quais, a précisé le directeur.</p><p>Abonnez-vous à notre newsletter pour ne rien manquer.</p></article></body></html>`, "text/html; charset=utf-8");
    send(404, {error: {message: "inconnu " + u.pathname}});
  });
});
const REVUE = {nom_emission: "Le Brief de Dakar", titre: "Dakar sous l'eau, l'école en colère", accroche: "Bonjour, ici Le Brief de Dakar, ce lundi.", sommaire: "Au sommaire : Dakar sous l'eau, l'école en colère et un chiffre record.",
  segments: [{titre: "Inondations à Dakar", texte: "Selon la BBC, les sinistrés des inondations à Dakar attendent toujours l'aide promise.", sources: ["BBC"]}, {titre: "Rentrée sous tension", texte: "NDARINFO rapporte que les syndicats d'enseignants haussent le ton.", sources: ["NDARINFO"]}, {titre: "Pluies record", texte: "Cent quarante-deux millimètres de pluie sont tombés en vingt-quatre heures.", sources: ["Le Soleil"]}],
  chiffre_du_jour: {texte: "Cent quarante-deux millimètres.", source: "Le Soleil"}, a_retenir: "La solidarité d'abord.", conclusion: "C'était Le Brief de Dakar, demain même heure.", appel: "Abonne-toi pour ne rien manquer.", publication: {titres: ["Dakar sous l'eau", "L'actu du jour"], description: "La revue du jour.", hashtags: ["Sénégal", "#Dakar"]}, a_verifier: ["Le montant de l'aide annoncée"]};
const REVUE2 = Object.assign({}, REVUE, {titre: "Version renforcée par le directeur", accroche: "Bonjour ! Le Brief de Dakar, et une journée qui ne ressemble à aucune autre."});
const PORT = 3000 + 800 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
(async () => {
  await new Promise(r => fake.listen(0, "127.0.0.1", r)); const F = `http://127.0.0.1:${fake.address().port}`;
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "cle-test", GEMINI_BASE_URL: F + "/v1beta", GOOGLE_NEWS_BASE: F, OPENVERSE_BASE: F, COMMONS_BASE: F, NEWS_ALLOW_LOCAL: "1", PROVIDER: "gemini", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", APP_PASSWORD: "", GEN_DIR: path.join(OUT, "presse-gen"), GEN_POLL_MS: "50"});
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
      const rv = /directeur de l'information/.test(seen.prompt) ? REVUE2 : REVUE;
      return r.respond({status: 200, contentType: "application/x-ndjson", body: JSON.stringify({delta: JSON.stringify(rv)}) + "\n" + JSON.stringify({model: "simulation"}) + "\n"}); } r.continue(); });
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
    await pg.select("#pr-duree", "60"); await pg.select("#pr-ton", "inspirant"); await pg.select("#pr-voix", "Sadaltager"); await pg.type("#pr-nom", "Le Brief de Dakar");
    await pg.click("#pr-go"); await pg.waitForSelector("#pr-res .pr-seg", {timeout: 20000});
    check("l'agent reçoit seulement les infos cochées, attribuées à leur média, avec les règles de vérité", /\[BBC\] Inondations à Dakar/.test(seen.prompt) && /\[Seneweb\] Titre du jour de seneweb\.com/.test(seen.prompt) && !/flamme des JOJ/.test(seen.prompt) && /VÉRITÉ \(non négociable\)/.test(seen.prompt) && /144 mots/.test(seen.prompt) && /n'invente aucun fait/.test(seen.prompt));
    check("format signature : nom de l'émission, journaux nommés à voix haute, sommaire, chiffre du jour, rendez-vous", /« Le Brief de Dakar » \(garde exactement ce nom\)/.test(seen.prompt) && /SOURCES DITES À VOIX HAUTE/.test(seen.prompt) && /nomme clairement le ou les journaux/.test(seen.prompt) && /Le chiffre du jour/.test(seen.prompt) && /rendez-vous/.test(seen.prompt));
    const res = await pg.evaluate(() => ({segs: document.querySelectorAll("#pr-res .pr-seg").length, txt: document.getElementById("pr-res").innerText}));
    check("revue affichée : ouverture, sommaire, sujets avec sources dites, chiffre du jour, fin, publication, points à vérifier", res.segs === 7 && /Sources dites à l’antenne : BBC/.test(res.txt) && /Le chiffre du jour/.test(res.txt) && /Le montant de l'aide annoncée/.test(res.txt) && /#Sénégal #Dakar/.test(res.txt) && /le brief de dakar/i.test(res.txt), JSON.stringify({segs: res.segs, bbc: /Sources dites à l’antenne : BBC/.test(res.txt), chiffre: /Le chiffre du jour/.test(res.txt), verif: /Le montant de l'aide annoncée/.test(res.txt), tags: /#Sénégal #Dakar/.test(res.txt), nom: /le brief de dakar/i.test(res.txt)}));
    const added = await pg.evaluate(() => ({t: document.querySelector('[data-pr-edit="seg-2"]').value, hint: document.getElementById("pr-res").innerText.includes("nom du journal ajouté par l’application"), ch: document.querySelector('[data-pr-edit="chiffre"]').value}));
    check("l'application fait dire le journal quand l'IA l'a oublié (sujet et chiffre du jour)", /C'est ce que rapporte Le Soleil\.$/.test(added.t) && added.hint && /^Cent quarante-deux millimètres\. C'est ce que rapporte Le Soleil\.$/.test(added.ch), JSON.stringify(added));
    await pg.evaluate(() => { const t = document.querySelector('[data-pr-edit="seg-1"]'); t.value = "NDARINFO rapporte que les syndicats d'enseignants menacent de faire grève."; t.dispatchEvent(new Event("input", {bubbles: true})); });
    await new Promise(r => setTimeout(r, 600));
    // 4. voix d'or
    await pg.click("#pr-voice"); await pg.waitForFunction(() => document.querySelectorAll("#pr-voices audio").length === 1, {timeout: 30000});
    check("quota économisé : toute la revue (7 parties) fabriquée en une seule demande de voix", tts.length === 1, `${tts.length} demande(s)`);
    check("voix d'or : chaque partie lue par la voix choisie, style grand présentateur, texte corrigé pris en compte", tts.length === 1 && tts[0].text.split(/\n\n/).length === 7 && tts.some(t => /C'est ce que rapporte Le Soleil/.test(t.text)) && tts.every(t => t.voice === "Sadaltager" && /world-class news anchor/.test(t.style)) && tts.some(t => /menacent de faire grève/.test(t.text)), JSON.stringify(tts.map(t => t.voice)));
    // 5. audio complet
    fs.readdirSync(OUT).filter(f => /revue-de-presse.*\.wav$/.test(f)).forEach(f => fs.rmSync(path.join(OUT, f), {force: true}));   // un ancien fichier ferait nommer le nouveau « (1) »
    const before = new Set(fs.readdirSync(OUT));
    await pg.click("#pr-dl"); let wav = "";
    for(let k = 0; k < 60 && !wav; k++){ await new Promise(r => setTimeout(r, 200)); wav = fs.readdirSync(OUT).find(f => !before.has(f) && /revue-de-presse\.wav$/.test(f)) || ""; }
    const wb = wav ? fs.readFileSync(path.join(OUT, wav)) : Buffer.alloc(0), secs = wb.length > 44 ? (wb.length - 44) / (wb.readUInt32LE(24) * 2) : 0;
    check("voix seule téléchargée : les 7 parties bout à bout avec de courts silences", wb.slice(0, 4).toString() === "RIFF" && secs > 9.3 && secs < 9.9, `${wav} · ${secs.toFixed(2)} s`);
    // 5 bis. fusion finale : jingle, transitions, musique baissée sous la voix
    await pg.select("#pr-mood", "journal"); await pg.click("#pr-mix"); await pg.waitForSelector("#pr-mix-out audio", {timeout: 60000});
    fs.readdirSync(OUT).filter(f => /revue-finale.*\.wav$/.test(f)).forEach(f => fs.rmSync(path.join(OUT, f), {force: true}));
    await pg.click("#pr-mix-dl"); let mix = "";
    for(let k = 0; k < 80 && !mix; k++){ await new Promise(r => setTimeout(r, 200)); mix = fs.readdirSync(OUT).find(f => /revue-finale\.wav$/.test(f)) || ""; }
    const mb = mix ? fs.readFileSync(path.join(OUT, mix)) : Buffer.alloc(0), chs = mb.length > 44 ? mb.readUInt16LE(22) : 0, rate = mb.length > 44 ? mb.readUInt32LE(24) : 0, msec = chs ? (mb.length - 44) / (rate * chs * 2) : 0;
    const rms = (a, z) => { let s2 = 0, n = 0; for(let i = 44 + Math.floor(a * rate) * chs * 2; i < Math.min(mb.length - 1, 44 + Math.floor(z * rate) * chs * 2); i += 2){ const v = mb.readInt16LE(i) / 32768; s2 += v * v; n++; } return n ? Math.sqrt(s2 / n) : 0; };
    const msg = await pg.evaluate(() => document.getElementById("pr-mix-msg").textContent);
    check("fusion finale : la voix unique est recoupée aux pauses (7 séquences), jingle audible, transitions, stéréo", chs === 2 && rate === 44100 && msec > 20.5 && msec < 23 && rms(0.4, 2.0) > 0.01 && /7 séquences/.test(msg), `${mix} · ${chs} canaux · ${rate} Hz · ${msec.toFixed(1)} s · jingle ${rms(0.4, 2.0).toFixed(3)} · ${msg}`);
    // 5 quater. images réelles libres de droits pour chaque sujet
    await pg.click("#pr-photos-all"); await pg.waitForFunction(() => /Images choisies/.test(document.getElementById("pr-photos-msg").textContent), {timeout: 30000});
    const ph = await pg.evaluate(() => { const st = JSON.parse(localStorage.getItem("sp-presse")); return {photos: st.photos, thumbs: [...document.querySelectorAll("#ph-grid-0 img")].map(i => i.getAttribute("src")), credit: (document.querySelector("#ph-grid-0 .hint") || {}).textContent || ""}; });
    const p0 = ph.photos && ph.photos["0"];
    check("images : recherche par sujet (mots anglais de l'IA), licences commerciales seulement, petite image et licence NC écartées", seen.photos.some(q => /commercial,modification/.test(q)) && ph.thumbs.length === 2 && !ph.thumbs.some(t => /small|nc\.png/.test(t)), JSON.stringify(ph.thumbs));
    check("images : la première est importée dans le projet avec son crédit (photographe, licence, source)", p0 && /^\/generated\/presse-[a-z0-9]+\/sujet-1-/.test(p0.local) && /Jeff Attaway · CC BY 2\.0 · Flickr/.test(ph.credit) && Object.keys(ph.photos).length === 3, JSON.stringify({p0: p0 && p0.local, credit: ph.credit}));
    // 5 quinquies. vidéo de la revue
    await pg.click("#pr-video"); await pg.waitForFunction(() => document.querySelector("#pr-video-out video") || /échoué|navigateur|fusion|Error|rror/.test(document.getElementById("pr-video-msg").textContent), {timeout: 90000}).catch(async () => console.log("MESSAGE VIDÉO :", await pg.evaluate(() => document.getElementById("pr-video-msg").textContent)));
    const vid = await pg.evaluate(async () => { const v = document.querySelector("#pr-video-out video"); await new Promise(r => { if(v.readyState >= 1) r(); else v.onloadedmetadata = r; setTimeout(r, 4000); }); return {msg: document.getElementById("pr-video-msg").textContent, dl: !!document.getElementById("pr-video-dl")}; });
    const vs = Number((vid.msg.match(/(\d+) s/) || [])[1] || 0);
    for(const [sec, name] of [[1.2, "presse-video-ouverture"], [9.5, "presse-video-sujet"], [16.5, "presse-video-chiffre"]]){   // captures pour juger le rendu
      await pg.evaluate(async t => { const v = document.querySelector("#pr-video-out video"); v.currentTime = t; await new Promise(r => { v.onseeked = r; setTimeout(r, 3000); }); v.scrollIntoView({block: "center"}); }, sec);
      const el = await pg.$("#pr-video-out video"); if(el) await el.screenshot({path: path.join(OUT, name + ".png")}); }
    check("vidéo de la revue : images + fusion, durée de l'émission, prête à télécharger", /Vidéo prête/.test(vid.msg) && vs >= 20 && vs <= 23 && vid.dl, vid.msg);
    // 5 ter. relecture par le directeur de l'information
    await pg.click("#pr-improve"); await pg.waitForFunction(() => /Version renforcée par le directeur/.test(document.getElementById("pr-res").innerText), {timeout: 20000});
    const imp = await pg.evaluate(() => ({voice: document.getElementById("pr-voice").textContent, audios: document.querySelectorAll("#pr-voices audio").length}));
    check("« Rendre la revue encore plus forte » : relue et réécrite sans sortir de la matière, voix à refaire", /directeur de l'information/.test(seen.prompt) && /REVUE À RELIRE/.test(seen.prompt) && /\[BBC\] Inondations à Dakar/.test(seen.prompt) && /Fabriquer la voix/.test(imp.voice) && imp.audios === 0, JSON.stringify(imp));
    // 6. mes textes + lien d'article
    await pg.select("#pr-mode", "textes");
    await pg.type("#pr-text", "Communiqué : la mairie ouvre trois centres d'accueil pour les familles sinistrées.");
    await pg.type("#pr-links", `${F}/article.html\nhttps://news.google.com/rss/articles/xyz`);
    await pg.click("#pr-go"); await pg.waitForFunction(() => document.getElementById("pr-go").disabled === false && /centres d'accueil|ARTICLE/.test(window.__x || "") || document.querySelectorAll("#pr-res .pr-seg").length, {timeout: 20000});
    await new Promise(r => setTimeout(r, 800));
    check("mes textes + lien : article lu par le serveur (sans menus ni pubs), lien Google Actualités refusé avec explication", /centres d'accueil/.test(seen.prompt) && /ARTICLE de Dakar Port Info · « Le port de Dakar bat un record »/.test(seen.prompt) && /volume record de marchandises/.test(seen.prompt) && !/Abonnez-vous/.test(seen.prompt) && !/menu/.test(seen.prompt.split("ARTICLE")[1] || ""), (seen.prompt.split("MATIÈRE")[1] || "").slice(0, 160).replace(/\n/g, " "));
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
