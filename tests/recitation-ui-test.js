// « Garder la voix, refaire l'image » : la page complète, sur un écran de téléphone (390 px).
// Envoi d'une vraie vidéo (7 passages séparés par des pauses), paroles (Coran officiel si Internet, sinon « Mon texte »), calage automatique,
// correction à la main, 7 habillages, format téléphone, ambiance, vidéo fabriquée (image + voix d'origine), écran de direct, projets repris et supprimés.
// Le serveur de test est lancé ici, avec un dossier séparé. Aucune IA, aucun quota.
const p = require("puppeteer-core"), http = require("http"), path = require("path"), fs = require("fs"), {spawn, execFileSync} = require("child_process");
const {EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const FF = require(path.join(__dirname, "..", "node_modules", "ffmpeg-static")), F = n => path.join(OUT, n), GEN = path.join(OUT, "gen-recit-ui");
const DUR = [3, 2, 4, 2.5, 3, 2, 3];
if(!fs.existsSync(F("recit-7.mp4"))){ const parts = []; DUR.forEach((d, i) => { parts.push(`sine=f=${220 + i * 40}:r=44100:d=${d}[s${i}]`, `anullsrc=r=44100:cl=mono:d=1[p${i}]`); });
  const chain = DUR.map((d, i) => `[s${i}][p${i}]`).join(""), total = DUR.reduce((a, b) => a + b, 0) + DUR.length;
  execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", `color=c=black:s=320x240:r=10:d=${total}`, "-filter_complex", `${parts.join(";")};${chain}concat=n=${DUR.length * 2}:v=0:a=1[a]`, "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", F("recit-7.mp4")]); }
const probe = f => { try{ execFileSync(FF, ["-hide_banner", "-i", f], {stdio: ["ignore", "ignore", "pipe"]}); }catch(e){ return String(e.stderr || ""); } return ""; };
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  fs.rmSync(GEN, {recursive: true, force: true, maxRetries: 20, retryDelay: 250});
  require("./coran-cache")(GEN);
  const PORT = 3000 + 500 + Math.floor(Math.random() * 90), BASE = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(__dirname, "..", "server.js")], {env: Object.assign({}, process.env, {SP_NO_DOTENV: "1", PORT: String(PORT), HOST: "127.0.0.1", GEMINI_API_KEY: "x", GEN_DIR: GEN}), stdio: ["ignore", "pipe", "pipe"]});
  let log = ""; srv.stdout.on("data", d => log += d); srv.stderr.on("data", d => log += d);
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 600000, args: ["--autoplay-policy=no-user-gesture-required"]});
  try{
    for(let k = 0; k < 80 && !/prêt/.test(log); k++) await wait(100);
    const pg = await b.newPage(); await require("./noauto")(pg);
    const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if(m.type() === "error") errs.push(m.text()); });
    await pg.setViewport({width: 390, height: 844, deviceScaleFactor: 1});
    await pg.goto(BASE + "/#recitation", {waitUntil: "networkidle0"});
    const tabs = await pg.evaluate(() => [...document.querySelectorAll(".grp-tabs button")].map(x => x.textContent));
    check("« Créer » : nouvel onglet « Garder la voix », juste après le Constructeur", tabs[1] === "🎙 Garder la voix", tabs.join(" | "));
    /* 1. envoi + analyse (parcours à la main : l'analyse automatique est testée dans recitation-auto-test.js) */
    await pg.evaluate(() => { document.getElementById("rc-autoon").checked = false; });
    await (await pg.$("#rc-file")).uploadFile(F("recit-7.mp4"));
    await pg.waitForFunction(() => /Voix gardée/.test(document.getElementById("rc-info").textContent), {timeout: 90000});
    const info = await pg.evaluate(() => document.getElementById("rc-info").textContent);
    check("envoi puis analyse sur l'ordinateur : voix gardée, 7 moments de parole", /7 moments de parole/.test(info) && /2[67] s/.test(info), info);
    /* 2. paroles : Coran officiel (Al-Fatiha) si Internet, sinon « Mon texte » */
    const net = await pg.waitForFunction(() => document.querySelector("#rc-pass option[value='114']") || /pas pu être chargée/.test(document.getElementById("rc-src").textContent), {timeout: 30000}).then(() => pg.evaluate(() => !!document.querySelector("#rc-pass option[value='114']")));
    if(net){ await pg.evaluate(() => { document.getElementById("rc-ph").checked = true; const s = document.querySelector("[data-rc-p='0:n']"); s.value = "1"; s.dispatchEvent(new Event("change", {bubbles: true})); }); }
    else{ await pg.evaluate(() => { document.querySelector("[data-rc-mode='texte']").click(); document.getElementById("rc-txt").value = ["Première ligne", "Deuxième", "Troisième ligne plus longue", "Quatre", "Cinquième ligne", "Six", "Septième ligne"].join("\n"); }); out.push("(pas d'Internet : texte libre au lieu du Coran)"); }
    await pg.click("#rc-align");
    await pg.waitForFunction(() => document.querySelectorAll("#rc-list li").length > 0, {timeout: 30000});
    const al = await pg.evaluate(() => ({n: document.querySelectorAll("#rc-list li").length, t: [...document.querySelectorAll("#rc-list .rc-at")].map(x => x.textContent.replace("▶ ", "")), ar: document.querySelectorAll("#rc-list .rc-ar").length, src: document.getElementById("rc-src").textContent}));
    check("calage automatique : les 7 passages commencent aux 7 moments de parole, au dixième de seconde", al.n === 7 && al.t.join(",") === "0:00.0,0:04.0,0:07.0,0:12.0,0:15.5,0:19.5,0:22.5", al.t.join(","));
    await wait(700);
    const alignedProject = await pg.evaluate(async () => { const id=(document.getElementById("rc-live").value.match(/id=([a-f0-9]+)/)||[])[1], r=await fetch(`/api/recit/project?id=${id}`); return r.json(); });
    const windows = (alignedProject.items || []).filter(x => x.kind === "verset").map(x => (x.speech || []).map(s => [s.a, s.b]));
    check("progression des sous-titres : les fenêtres de parole sont gardées et les pauses ne font plus avancer le néon", windows.length === 7 && windows.every(x => x.length === 1), JSON.stringify(windows));
    if(net) check("Coran : texte arabe officiel affiché (écriture uthmani) et source citée", al.ar === 7 && /Tanzil|alquran/.test(al.src), al.src.slice(0, 140));
    /* correction à la main */
    await pg.click("[data-rc-nd='1:0.1']"); const t1 = await pg.evaluate(() => document.querySelector("#rc-list li[data-i='1'] .rc-at").textContent);
    await pg.click("[data-rc-nd='1:-0.1']"); const t2 = await pg.evaluate(() => document.querySelector("#rc-list li[data-i='1'] .rc-at").textContent);
    check("correction fine à la main : +0,1 s puis −0,1 s sur un passage", /0:04\.1/.test(t1) && /0:04\.0/.test(t2), `${t1} → ${t2}`);
    /* 4. habillages */
    await pg.waitForFunction(() => document.querySelectorAll("#rc-themes .rc-th canvas").length === 16, {timeout: 60000});
    const th = await pg.evaluate(() => [...document.querySelectorAll("#rc-themes .rc-th canvas")].map(c => { const g = c.getContext("2d"), d = g.getImageData(0, 0, c.width, c.height).data; let s = 0, v = 0; for(let i = 0; i < d.length; i += 4){ const l = d[i] + d[i + 1] + d[i + 2]; s += l; v += l * l; } const n = d.length / 4, m = s / n; return [Math.round(m), Math.round(Math.sqrt(v / n - m * m))]; }));
    const distinct = new Set(th.map(x => x.join("/"))).size;
    check("16 habillages premium dessinés, dont l'enseignant en 3D (vignettes non vides et toutes différentes)", th.every(x => x[1] > 8) && distinct === 16, JSON.stringify(th));
    const fx0 = await pg.evaluate(() => ({tabs: document.querySelectorAll("#rc-fx-tabs [role='tab']").length, counts: Object.fromEntries(Object.entries(SP_RECIT.fx).map(([k, v]) => [k, Object.keys(v).length]))}));
    check("studio islamique : sous-titres, transitions, couleurs, animations et effets ont leurs vignettes", fx0.tabs === 5 && fx0.counts.subtitles === 6 && fx0.counts.transitions === 6 && fx0.counts.palettes === 6 && fx0.counts.animations === 6 && fx0.counts.effects === 8, JSON.stringify(fx0));
    const exact = await pg.evaluate(() => { const items = [{kind:"verset", ar:"الأول", a:0, b:3}, {kind:"verset", ar:"الثاني", a:3, b:6}], make = syncOffset => SP_RECIT.stage({fmt:"16:9", K:.1, theme:"nuit", items, transition:"sacred_fade", animation:"glow", syncOffset}); const a = make(0), b = make(.25); return {before:a.activeAt(2.999), edge:a.activeAt(3), corrected:b.activeAt(2.8)}; });
    check("synchronisation stricte : aucune transition ne retarde le nouveau passage, et le réglage global agit au bon moment", exact.before === 0 && exact.edge === 1 && exact.corrected === 1, JSON.stringify(exact));
    const chooseFx = async (cat, id) => { await pg.click(`[data-rc-fxtab="${cat}"]`); await pg.waitForFunction(v => !!document.querySelector(`[data-rc-fx="${v}"]`), {}, `${cat}:${id}`); await pg.click(`[data-rc-fx="${cat}:${id}"]`); await wait(120); };
    await chooseFx("subtitles","emerald"); await chooseFx("transitions","light"); await chooseFx("palettes","black_gold"); await chooseFx("animations","glow"); await chooseFx("effects","anneaux_neon");
    await pg.evaluate(() => { const s = document.getElementById("rc-sync"); s.value = ".25"; s.dispatchEvent(new Event("input", {bubbles:true})); }); await wait(800);
    const picked = await pg.evaluate(async () => { const id=(document.getElementById("rc-live").value.match(/id=([a-f0-9]+)/)||[])[1], p=await fetch(`/api/recit/project?id=${id}`).then(r=>r.json()); return {fx:[p.subtitle,p.transition,p.palette,p.animation,p.effect], sync:p.syncOffset, canvases:document.querySelectorAll("#rc-fx-grid canvas").length}; });
    check("choix premium appliqués : néon émeraude, voile lumineux, noir-or, éclat et anneaux néon", picked.fx.join("|") === "emerald|light|black_gold|glow|anneaux_neon" && picked.sync === .25 && picked.canvases === 8, JSON.stringify(picked));
    await pg.evaluate(() => { document.querySelector("[data-rc-theme='livre']").click(); const f = document.getElementById("rc-fmt"); f.value = "9:16"; f.dispatchEvent(new Event("change", {bubbles: true})); });
    await wait(900);
    const pv = await pg.evaluate(() => { const c = document.querySelector("#rc-prev canvas"); return {w: c.width, h: c.height, on: document.querySelector("[data-rc-theme='livre']").getAttribute("aria-checked")}; });
    /* habillage « Enseignant » : avatar 3D en boubou, réglages visibles, lèvres sur la voix */
    await pg.evaluate(() => document.querySelector("[data-rc-theme='enseignant']").click());
    await pg.waitForFunction(() => !document.getElementById("rc-avopts").hidden && document.getElementById("rc-av-style").options.length === 6, {timeout: 60000});
    await wait(1500);
    const teach = await pg.evaluate(async () => { const a = document.getElementById("rc-audio"), c = document.querySelector("#rc-prev canvas"), g = c.getContext("2d");
      const at = async t => { a.currentTime = t; await new Promise(r => a.addEventListener("seeked", r, {once: true})); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return g.getImageData(0, Math.round(c.height * .55), c.width, Math.round(c.height * .4)).data; };
      const d1 = await at(1.5), d2 = await at(3.5); let diff = 0; for(let i = 0; i < d1.length; i += 16) diff += Math.abs(d1[i] - d2[i]); return {ready: SP_AVATAR.ready(), env: (__spRecit.env || {}).v ? __spRecit.env.v.length : 0, diff, opts: document.getElementById("rc-av-style").options.length};});
    check("enseignant 3D : avatar chargé, 6 boubous au choix, énergie de la voix lue (lèvres), il bouge avec la voix", teach.ready && teach.opts === 6 && teach.env > 600 && teach.diff > 0, JSON.stringify(teach));
    check("habillage « Livre ancien » choisi, aperçu au format téléphone (vertical)", pv.on === "true" && pv.h > pv.w, JSON.stringify(pv));
    /* miniature YouTube (couverture TikTok en format téléphone) : même décor, grand titre */
    await pg.evaluate(() => { document.getElementById("rc-th-t").value = "Al-Fatiha"; document.getElementById("rc-th-b").value = "1 H"; document.getElementById("rc-th-go").click(); });
    await pg.waitForFunction(() => { const i = document.querySelector("#rc-th-img img"); return i && i.complete && i.naturalWidth > 0; }, {timeout: 20000});
    const thumb = await pg.evaluate(() => { const i = document.querySelector("#rc-th-img img"), a = document.getElementById("rc-th-dl"); return {w: i.naturalWidth, h: i.naturalHeight, dl: !a.hidden && /\.png$/.test(a.download), ph: (__spRecit.items.find(x => x.kind === "verset") || {}).ph || ""}; });
    check("miniature créée (1080 × 1920 pour le format téléphone), prête à télécharger en PNG", thumb.w === 1080 && thumb.h === 1920 && thumb.dl, `${thumb.w} × ${thumb.h}`);
    if(net) check("phonétique cochée : chaque verset reçoit sa lecture en lettres latines (Al-Fatiha 1 = la basmala)", /^Bismillaahir Rahmaanir Raheem$/.test(thumb.ph), thumb.ph.slice(0, 40));
    /* le texte du verset est bien dessiné : l'aperçu change quand le verset change */
    const sig = await pg.evaluate(async () => { const a = document.getElementById("rc-audio"), c = document.querySelector("#rc-prev canvas"), g = c.getContext("2d"), sum = () => { const d = g.getImageData(0, Math.round(c.height * .3), c.width, Math.round(c.height * .4)).data; let s = 0; for(let i = 0; i < d.length; i += 16) s += d[i]; return s; };
      const at = async t => { a.currentTime = t; await new Promise(r => a.addEventListener("seeked", r, {once: true})); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); return sum(); };
      return [await at(2.5), await at(9.5)]; });
    check("aperçu calé sur la voix : le texte change avec le passage récité", sig[0] !== sig[1], sig.join(" ≠ "));
    /* 5. ambiance + vidéo */
    await pg.evaluate(() => { const s = document.getElementById("rc-amb"); s.value = "pluie"; s.dispatchEvent(new Event("change", {bubbles: true})); });
    const id = await pg.evaluate(() => (document.getElementById("rc-live").value.match(/id=([a-f0-9]+)/) || [])[1]);
    for(let k = 0; k < 120; k++){ const f=path.join(GEN, `recit-${id}`, "ambiance.wav"); if(fs.existsSync(f) && fs.statSync(f).size > 3e6) break; await wait(250); }
    const amb = path.join(GEN, `recit-${id}`, "ambiance.wav");
    check("ambiance « pluie douce » fabriquée sur l'ordinateur (60 s qui bouclent) et envoyée au serveur", fs.existsSync(amb) && fs.statSync(amb).size > 3e6 && /Duration: 00:01:00/.test(probe(amb)), fs.existsSync(amb) ? (probe(amb).match(/Duration: [^,]+/) || [""])[0] : "absent");
    /* découpage pour TikTok et Shorts : parties de 10 s au plus (valeur d'essai), pour la vidéo de 26 s */
    await pg.evaluate(() => { const q = document.getElementById("rc-qual"); q.value = "hd24"; q.dispatchEvent(new Event("change", {bubbles: true})); const sp = document.getElementById("rc-split"); sp.add(new Option("essai 10 s", "10")); sp.value = "10"; sp.dispatchEvent(new Event("change", {bubbles: true})); document.getElementById("rc-make").click(); });
    await pg.waitForFunction(() => document.querySelector("#rc-out video") || /échoué|impossible|refuse|Pas assez/.test(document.getElementById("rc-mprog-t").textContent), {timeout: 300000});
    const res = await pg.evaluate(() => ({src: (document.querySelector("#rc-out video") || {}).getAttribute && document.querySelector("#rc-out video").getAttribute("src"), msg: document.getElementById("rc-mprog-t").textContent, note: (document.querySelector("#rc-out .hint") || {}).textContent || ""}));
    const vf = res.src ? path.join(GEN, res.src.replace(/^\/generated\//, "")) : "", pr = vf ? probe(vf) : "";
    check("vidéo fabriquée : image refaite (H.264, 720 × 1280) + voix d'origine (AAC), même durée", /Video: h264/.test(pr) && /720x1280/.test(pr) && /Audio: aac/.test(pr) && /Duration: 00:00:2[67]/.test(pr), res.msg || (pr.match(/Duration: [^,]+|Video: [^\n]{0,60}/g) || []).join(" · "));
    await pg.waitForFunction(() => document.querySelectorAll("#rc-out .rc-parts a").length > 0 || /échoué|impossible/.test(document.getElementById("rc-mprog-t").textContent), {timeout: 60000}).catch(() => null);
    const parts = await pg.evaluate(() => [...document.querySelectorAll("#rc-out .rc-parts a")].map(a => a.getAttribute("href")));
    const durs = parts.map(u => { const m = /Duration: 00:00:(\d+\.\d+)/.exec(probe(path.join(GEN, u.replace(/^\/generated\//, "")))); return m ? +m[1] : 0; });
    check("TikTok et Shorts : 3 parties coupées juste avant un verset (6,75 s · 8,5 s · 11,25 s), sans réencodage, « Partie k/3 » sur l'image", parts.length === 3 && Math.abs(durs[0] - 6.75) < .15 && Math.abs(durs[1] - 8.5) < .15 && Math.abs(durs[2] - 11.25) < .2 && parts.every(u => /partie-\d-sur-3\.mp4$/.test(u)), durs.join(" s · ") + " s");
    /* contrôle visuel : une image du milieu de la vidéo */
    if(vf){ execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y", "-ss", "10", "-i", vf, "-frames:v", "1", F("recitation-enseignant-9x16.png")]); out.push(`(image de contrôle : ${F("recitation-enseignant-9x16.png")})`); }
    /* 6. écran de direct */
    const live = await pg.evaluate(() => document.getElementById("rc-live").value);
    const lp = await b.newPage(); const lerr = []; lp.on("pageerror", e => lerr.push(e.message)); lp.on("console", m => { if(m.type() === "error") lerr.push(m.text()); });
    await lp.setViewport({width: 540, height: 960}); await lp.goto(live.replace(/^http:\/\/[^/]+/, BASE), {waitUntil: "domcontentloaded"});
    await wait(2500); if(await lp.$eval("#start", x => !x.hidden)) await lp.click("#go");
    for(let k=0;k<24;k++){ if(await lp.$eval("#voix",x=>x.currentTime>.5)) break; if(k===8 && await lp.$eval("#start",x=>!x.hidden)) await lp.click("#go"); await wait(250); }
    const ls = await lp.evaluate(() => { const c = document.getElementById("cv"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data, a=document.getElementById("voix"); let s = 0; for(let i = 0; i < d.length; i += 40) s += d[i] + d[i + 1] + d[i + 2]; return {w: c.width, h: c.height, lit: s > 0, t:a.currentTime, paused:a.paused, ready:a.readyState, duration:a.duration, mediaError:a.error&&a.error.code, overlay:!document.getElementById("start").hidden, msg:document.getElementById("msg").textContent, amb: !!document.getElementById("amb").getAttribute("src")}; });
    check("écran de direct (OBS, TikTok LIVE Studio) : habillage en temps réel, voix qui joue, ambiance incluse", ls.lit && ls.h > ls.w && ls.t > .5 && ls.amb && !lerr.length, JSON.stringify(ls) + (lerr.length ? " · " + lerr[0] : ""));
    await lp.close();
    /* projets : repris après un rechargement, puis supprimés */
    await pg.reload({waitUntil: "networkidle0"});
    await pg.waitForFunction(() => document.querySelectorAll("#rc-old option").length > 1, {timeout: 45000});
    await pg.evaluate(id => { const s = document.getElementById("rc-old"); s.value = id; s.dispatchEvent(new Event("change", {bubbles: true})); }, id);
    await pg.waitForFunction(() => document.querySelectorAll("#rc-list li").length === 7, {timeout: 20000});
    const back = await pg.evaluate(async id => { const p=await fetch(`/api/recit/project?id=${id}`).then(r=>r.json()); return {theme: (document.querySelector("#rc-themes [aria-checked='true']") || {dataset: {}}).dataset.rcTheme, fmt: document.getElementById("rc-fmt").value, amb: document.getElementById("rc-amb").value, fx:[p.subtitle,p.transition,p.palette,p.animation,p.effect], sync:p.syncOffset, vids: (document.getElementById("rc-out").textContent.match(/\.mp4/g) || []).length}; }, id);
    check("projet repris après fermeture : calage, habillage, réglages assortis à l'enseignant, synchronisation, ambiance, vidéo et ses 3 parties retrouvées", back.theme === "enseignant" && back.fmt === "9:16" && back.amb === "pluie" && back.fx.join("|") === "mushaf|light|theme|glow|aucune" && back.sync === .25 && back.vids === 4, JSON.stringify(back));
    const wide = await pg.evaluate(() => document.documentElement.scrollWidth);
    check("téléphone (390 px) : aucun défilement horizontal", wide <= 390, `${wide} px`);
    pg.on("dialog", d => d.accept()); await pg.click("#rc-del");
    await pg.waitForFunction(() => /Projet supprimé/.test(document.getElementById("rc-info").textContent), {timeout: 15000});
    check("projet supprimé de l'ordinateur (place libérée)", !fs.existsSync(path.join(GEN, `recit-${id}`)), "");
    check("aucune erreur dans la console", !errs.length, errs.slice(0, 3).join(" | "));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  await b.close(); srv.kill(); fs.rmSync(GEN, {recursive: true, force: true, maxRetries: 20, retryDelay: 250}); console.log(out.join("\n")); process.exit(0);
})();
