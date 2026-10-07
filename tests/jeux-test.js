// Page Motion design, onglet Quiz « 5 secondes » : niveaux sans IA (réponses calculées par le code), niveaux de l'agent contrôlés par le code (suite corrigée, « à vérifier »),
// aperçu, vidéo 9:16 avec compte à rebours et réponse, kit de publication, téléchargement. Vrai server.js, agent simulé.
const p = require("puppeteer-core"), http = require("http"), fs = require("fs"), path = require("path"), {spawn} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const next = a => { const n = a.length, d = a[1] - a[0]; if(a.every((x, i) => !i || x - a[i - 1] === d)) return a[n - 1] + d; const q = a[1] / a[0]; if(a.every((x, i) => !i || x === a[i - 1] * q)) return a[n - 1] * q;
  if(a.every((x, i) => i < 2 || x === a[i - 1] + a[i - 2])) return a[n - 1] + a[n - 2]; const r = Math.round(Math.sqrt(a[0])); if(a.every((x, i) => x === (r + i) * (r + i))) return (r + n) * (r + n); return null; };
const AGENT = {titre_serie: "5 SECONDES", accroche: "Seulement 3 % trouvent le niveau 3", fin: "Combien en as-tu trouvé ? Dis-le en commentaire !",
  niveaux: [{type: "choix", question: "Quel est le plus long fleuve d'Afrique ?", options: ["Le Congo", "Le Nil", "Le Niger", "Le Zambèze"], bonne: 1, emoji: "🌍", explication: "Le Nil mesure environ 6 650 km."},
    {type: "vrai_faux", affirmation: "Le Sahara est le plus grand désert chaud du monde.", vrai: true, explication: "Il couvre environ 9 millions de km²."},
    {type: "suite", nombres: [3, 6, 12, 24], options: [36, 30, 40, 44], bonne: 0},
    {type: "intrus", a: "😀", b: "😃"}],
  publication: {titre: "5 secondes pour tester ta culture africaine", legende: "Seulement 3 % trouvent le niveau 3 !", hashtags: ["#Afrique", "quiz"]}};
const PORT = 3000 + 1200 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
const fake = http.createServer((req, res) => { res.writeHead(req.url.includes("/models") ? 200 : 404, {"Content-Type": "application/json"}); res.end(JSON.stringify(req.url.includes("/models") ? {models: [{name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"]}]} : {error: {message: "inconnu"}})); });   /* faux Google : l'agent est « connecté », ses réponses sont simulées */
const files = re => fs.readdirSync(OUT).filter(f => re.test(f)).map(f => ({f, n: fs.statSync(path.join(OUT, f)).size}));
const waitFiles = async (re, n, ms) => { for(let k = 0; k < (ms || 20000) / 250; k++){ if(files(re).length >= n) break; await new Promise(r => setTimeout(r, 250)); } await new Promise(r => setTimeout(r, 300)); return files(re); };   /* le navigateur écrit le téléchargement en arrière-plan */
(async () => {
  for(const f of fs.readdirSync(OUT)) if(/^5-secondes-episode-/.test(f)) fs.rmSync(path.join(OUT, f), {force: true});
  await new Promise(r => fake.listen(0, "127.0.0.1", r));
  const env = Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "cle-test", GEMINI_BASE_URL: `http://127.0.0.1:${fake.address().port}/v1beta`, OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "", PROVIDER: "gemini", APP_PASSWORD: "", GEN_DIR: path.join(OUT, "jeux-gen")});
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env, stdio: ["ignore", "pipe", "pipe"]}); let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  for(let k = 0; k < 50 && !/prêt/.test(log); k++) await new Promise(r => setTimeout(r, 100));
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message)); let prompt = "";
  try{
    await pg.setViewport({width: 1366, height: 900});
    const cdp = await pg.target().createCDPSession(); await cdp.send("Browser.setDownloadBehavior", {behavior: "allow", downloadPath: OUT, eventsEnabled: true}).catch(() => cdp.send("Page.setDownloadBehavior", {behavior: "allow", downloadPath: OUT}));
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); }); await pg.reload({waitUntil: "networkidle0"});
    await pg.setRequestInterception(true);
    pg.on("request", r => { if(/\/api\//.test(r.url()) && process.env.JX_DEBUG) console.log("DEMANDE", r.method(), r.url().replace(BASE, ""), (r.postData() || "").slice(0, 80)); if(r.url().includes("/api/sample") && r.method() === "POST"){ try{ prompt = JSON.parse(r.postData()).prompt || ""; }catch(e){} return r.respond({status: 200, contentType: "application/x-ndjson", body: JSON.stringify({delta: JSON.stringify(AGENT)}) + "\n"}); } r.continue(); });
    // 1. accès
    const acc = await pg.evaluate(() => ({side: (document.querySelector('.side-link[data-go="presse"]') || {}).textContent, home: !!document.querySelector('.welcome-action[data-go-inline="presse"]'), links: document.querySelectorAll(".side-link").length}));
    check("accès : « Motion design » dans le menu (même nombre de liens) et sur l'accueil", /Motion design/.test(acc.side) && acc.home && acc.links === 14, JSON.stringify(acc));
    await pg.click('.side-link[data-go="presse"]'); await pg.waitForFunction(() => !document.getElementById("view-presse").hidden, {timeout: 15000});
    const tabs = await pg.evaluate(() => ({t: [...document.querySelectorAll("[data-mt]")].map(b => `${b.dataset.mt}:${b.getAttribute("aria-selected")}`), infos: !document.getElementById("mt-infos").hidden, quiz: !document.getElementById("mt-quiz").hidden}));
    check("page Motion design : onglets Infos du jour, Quiz et Publicités, la revue de presse ouverte par défaut", tabs.t.join() === "infos:true,quiz:false,pub:false" && tabs.infos && !tabs.quiz, JSON.stringify(tabs));
    await pg.click('[data-mt="quiz"]'); await pg.waitForFunction(() => !document.getElementById("mt-quiz").hidden && document.getElementById("jx-pays").options.length > 5, {timeout: 15000});
    // 2. sans IA
    await pg.select("#jx-n", "4"); await pg.evaluate(() => document.getElementById("jx-rand").click()); await pg.waitForSelector("#jx-res .jx-lv", {timeout: 10000});
    const r1 = await pg.evaluate(() => ({s: JSON.parse(localStorage.getItem("sp-jeux") || "{}"), txt: document.getElementById("jx-res").innerText}));
    const lv1 = (r1.s.ep && r1.s.ep.niveaux) || [], suites = lv1.filter(l => l.type === "suite");
    check("« Sans IA » : 4 niveaux (intrus, suite, mémoire), réponses calculées par le code, rien à vérifier", lv1.length === 4 && lv1.every(l => /^(intrus|suite|memoire)$/.test(l.type)) && (r1.txt.match(/réponse calculée par le code/g) || []).length === 4 && !/À vérifier/.test(r1.txt) && r1.s.ep.numero === 1, lv1.map(l => l.type).join(","));
    check("suites tirées au hasard : la bonne réponse suit vraiment la règle", suites.length >= 1 && suites.every(l => l.options[l.bonne] === next(l.nombres)), suites.map(l => `${l.nombres.join(",")}→${l.options[l.bonne]}`).join(" | "));
    // 3. agent : thème, règles, contrôle par le code
    await pg.evaluate(() => { document.getElementById("jx-theme").value = ""; document.querySelector('[data-jx-idea^="géographie"]').click(); }); await pg.select("#jx-n", "3");
    await pg.evaluate(() => document.getElementById("jx-go").click()); await pg.waitForFunction(() => /épisode 2/i.test((document.getElementById("jx-res") || {}).innerText || ""), {timeout: 20000}).catch(async e => { console.log("ÉTAT :", await pg.evaluate(() => (document.getElementById("jx-status-text") || {}).textContent), "· demande vue :", prompt.length); throw e; });
    check("l'agent reçoit le thème choisi et les règles (vrai, sans personne réelle, sans marque), mémoire d'apprentissage comprise", /THÈME : géographie de l'Afrique/.test(prompt) && /aucune personne réelle/.test(prompt) && /aucune marque/.test(prompt) && /"niveaux"/.test(prompt), prompt.length + " caractères");
    const r2 = await pg.evaluate(() => ({s: JSON.parse(localStorage.getItem("sp-jeux") || "{}"), txt: document.getElementById("jx-res").innerText}));
    const lv2 = r2.s.ep.niveaux, su = lv2.find(l => l.type === "suite");
    check("niveaux de l'agent : 3 gardés (choix demandé), dans l'ordre", lv2.length === 3 && lv2.map(l => l.type).join() === "choix,vrai_faux,suite", lv2.map(l => l.type).join(","));
    check("suite de l'agent fausse (36) : corrigée par le code (48) et signalée", su && su.options[su.bonne] === 48 && /la réponse de l'agent était fausse, le code l'a corrigée \(48\)/.test(r2.txt), su && `${su.nombres} → ${su.options[su.bonne]}`);
    check("quiz et vrai ou faux de l'agent : dans « À vérifier avant de publier »", /À vérifier avant de publier/.test(r2.txt) && /Quiz : « Quel est le plus long fleuve d'Afrique \? » → Le Nil/.test(r2.txt) && /Vrai ou faux : « Le Sahara/.test(r2.txt) && (r2.txt.match(/à vérifier\n/g) || []).length >= 0, (r2.txt.match(/À vérifier avant de publier[\s\S]{0,160}/) || [""])[0].replace(/\n/g, " / "));
    // 4. décors animés, puis aperçu
    const deco = {};
    for(const d of ["manga", "nature", "espace"]){ await pg.evaluate(d => { document.getElementById("jx-vdecor").value = d; document.getElementById("jx-vfmt").value = "9:16"; document.getElementById("jx-preview").click(); }, d);
      await pg.waitForFunction(() => document.querySelectorAll("#jx-prev img").length === 3, {timeout: 20000});
      deco[d] = await pg.evaluate(async () => { const im = document.querySelectorAll("#jx-prev img")[1]; await im.decode().catch(() => {}); const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext("2d"); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let L = 0, n = 0; for(let i = 0; i < d.length; i += 64){ L += (d[i] + d[i + 1] + d[i + 2]) / 3; n++; } const top = x.getImageData(c.width / 2, 40, 1, 1).data; return {lum: Math.round(L / n), top: [...top].slice(0, 3)}; }); }
    check("décors animés : manga clair (planche de BD), nature avec ciel bleu, espace sombre", deco.manga.lum > 150 && deco.nature.top[2] > deco.nature.top[0] && deco.espace.top[0] + deco.espace.top[1] + deco.espace.top[2] < 90 && deco.espace.lum < deco.nature.lum, JSON.stringify(deco));
    await pg.evaluate(() => { document.getElementById("jx-vdecor").value = "neon"; document.getElementById("jx-vfmt").value = "9:16"; document.getElementById("jx-preview").click(); });
    await new Promise(r => setTimeout(r, 600));
    await pg.waitForFunction(() => document.querySelectorAll("#jx-prev img").length === 3, {timeout: 20000});
    const pv = await pg.evaluate(async () => Promise.all([...document.querySelectorAll("#jx-prev img")].map(async im => { await im.decode().catch(() => {}); const c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext("2d"); x.drawImage(im, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let g = 0, w = 0; for(let i = 0; i < d.length; i += 16){ if(d[i + 1] > 170 && d[i] < 90 && d[i + 2] < 140) g++; if(d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) w++; } return {w: im.naturalWidth, h: im.naturalHeight, green: g, white: w}; })));
    check("aperçu 9:16 (720 × 1280) : accroche, compte à rebours, réponse en vert", pv.length === 3 && pv.every(x => x.w === 720 && x.h === 1280 && x.white > 500) && pv[2].green > 300, pv.map(x => `${x.w}×${x.h} vert:${x.green}`).join(" | "));
    // 5. vidéo 9:16 (son fabriqué : musique, tic-tac, effets)
    await pg.evaluate(() => document.getElementById("jx-video").click());
    await pg.waitForFunction(() => /Vidéo prête|échoué|navigateur/.test(document.getElementById("jx-vmsg").textContent), {timeout: 180000});
    const vid = await pg.evaluate(async () => { const v = document.querySelector("#jx-vids video"); await new Promise(r => { if(v.readyState >= 1) r(); else v.onloadedmetadata = r; setTimeout(r, 6000); });
      if(!(isFinite(v.duration) && v.duration > 0)) await new Promise(r => { v.ondurationchange = () => { if(isFinite(v.duration)) r(); }; v.currentTime = 1e7; setTimeout(r, 5000); });   /* vidéo du navigateur : durée connue après un saut à la fin */
      const c = document.createElement("canvas"), hits = {green: 0, yellow: 0}, dur = isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
      for(const t of [6.5, 7.5, 10.2, 11]){ v.currentTime = t; await new Promise(r => { v.onseeked = r; setTimeout(r, 2500); }); c.width = v.videoWidth; c.height = v.videoHeight; const x = c.getContext("2d"); x.drawImage(v, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let g = 0, y = 0;
        for(let i = 0; i < d.length; i += 16){ if(d[i + 1] > 170 && d[i] < 90 && d[i + 2] < 140) g++; if(d[i] > 220 && d[i + 1] > 180 && d[i + 2] < 110) y++; } if(g > 800) hits.green++; if(y > 300) hits.yellow++; }
      return {msg: document.getElementById("jx-vmsg").textContent, w: v.videoWidth, h: v.videoHeight, dur, hits}; });
    check("vidéo 9:16 (720 × 1280) de la durée prévue (accroche, 3 niveaux, fin)", /Vidéo prête/.test(vid.msg) && vid.w === 720 && vid.h === 1280 && Math.abs(vid.dur - 33.3) < 2, `${vid.w}×${vid.h} · ${Math.round(vid.dur * 10) / 10} s · ${vid.msg}`);
    check("à l'écran : compte à rebours (jaune) puis la bonne réponse en vert", vid.hits.yellow >= 1 && vid.hits.green >= 1, JSON.stringify(vid.hits));
    const poster = await pg.evaluate(() => (document.querySelector("#jx-vids video") || {}).getAttribute("poster") || "");
    check("la vidéo montre son affiche premium avant la lecture", /^blob:/.test(poster), poster.slice(0, 40));
    await pg.evaluate(() => document.querySelector('[data-jx-dl="0"]').click());
    const vf = await waitFiles(/^5-secondes-episode-2-9x16\.(mp4|webm)$/, 1);
    check("téléchargement de la vidéo (5-secondes-episode-2-9x16)", vf.length === 1 && vf[0].n > 100000, JSON.stringify(vf));
    for(const f of ["16:9", "9:16"]){ await pg.evaluate(f => document.querySelector(`[data-jx-poster="${f}"]`).click(), f); await pg.waitForFunction(n => document.querySelectorAll("#jx-posters img").length >= n, {timeout: 30000}, f === "16:9" ? 1 : 2); }
    const ps = await pg.evaluate(async () => Promise.all([...document.querySelectorAll("#jx-posters img")].map(async im => { await im.decode().catch(() => {}); return `${im.naturalWidth}×${im.naturalHeight}`; })));
    const pf = await waitFiles(/^5-secondes-episode-2-(affiche-youtube|couverture-tiktok)\.jpg$/, 2);
    check("affiche YouTube 1280 × 720 et couverture TikTok 1080 × 1920, montrées et téléchargées", ps.join() === "1280×720,1080×1920" && pf.length === 2, `${ps.join(", ")} · ${pf.map(x => x.f).join(", ")}`);
    // 6. publication
    const kit = await pg.evaluate(() => ({t: document.getElementById("jx-t").value, l: document.getElementById("jx-l").value, txt: document.getElementById("jx-res").innerText}));
    check("publication : titre et légende de l'agent, hashtags du jeu, heures d'un jeu dans le fuseau du pays", kit.t === "5 secondes pour tester ta culture africaine" && /^Seulement 3 % trouvent le niveau 3 !/.test(kit.l) && /#Afrique/.test(kit.l) && /#quiz/.test(kit.l) && /#5secondes/.test(kit.l) && /heure du pays : Sénégal\) : 12 h 30 · 18 h 00 · 21 h 00/.test(kit.txt), kit.l.replace(/\n/g, " / "));
    // 7. téléphone, reprise, console
    await pg.setViewport({width: 390, height: 844}); await new Promise(r => setTimeout(r, 400));
    const wide = await pg.evaluate(() => [...document.querySelectorAll("#view-presse *")].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && e.offsetParent).slice(0, 6).map(e => `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}.${String(e.className).split(" ")[0]} ${Math.round(e.getBoundingClientRect().right)}`));
    check("page sur téléphone : pas de défilement horizontal", await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth <= 1), wide.join(" | "));
    await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "presse"; }); await pg.waitForSelector("#jx-res .jx-lv", {timeout: 10000}).catch(() => {});
    check("après rechargement : l'onglet Quiz et le dernier épisode sont retrouvés", await pg.evaluate(() => !document.getElementById("mt-quiz").hidden && /épisode 2/i.test(document.getElementById("jx-res").innerText)));
    check("aucune erreur JavaScript", !errs.length, errs.join(" | "));
  }finally{ await b.close(); srv.kill(); fake.close(); }
  console.log(out.join("\n")); process.exit(0);
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.stack || e.message); process.exit(1); });
