// Moteur de montage du Constructeur : une vidéo jointe est analysée sur l'ordinateur (plans, mouvement, netteté, son, point d'intérêt),
// l'agent reçoit les plans repérés, l'éditeur permet de choisir plan, début, fin et vitesse, et le recadrage vertical suit l'action.
// IA simulée (aucun quota). Le serveur doit tourner (npm start). La vidéo d'essai est fabriquée ici par FFmpeg.
const p = require("puppeteer-core"), path = require("path"), fs = require("fs"), {execFileSync} = require("child_process");
const {BASE, EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const FF = require(path.join(__dirname, "..", "node_modules", "ffmpeg-static")), F = n => path.join(OUT, n);
/* 3 plans de 2 s : rouge (un carré blanc traverse de gauche à droite), bleu (immobile), vert (le carré traverse) ; un son seulement sur le 3e plan */
if(!fs.existsSync(F("montage-3plans.mp4"))) execFileSync(FF, ["-hide_banner", "-loglevel", "error", "-y",
  "-f", "lavfi", "-i", "color=c=0xC0392B:s=640x360:r=25:d=2", "-f", "lavfi", "-i", "color=c=0x2471A3:s=640x360:r=25:d=2", "-f", "lavfi", "-i", "color=c=0x229954:s=640x360:r=25:d=2",
  "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono:d=4", "-f", "lavfi", "-i", "sine=f=440:r=44100:d=2", "-f", "lavfi", "-i", "color=c=white:s=60x60:r=25:d=6",
  "-filter_complex", "[0][1][2]concat=n=3:v=1:a=0[bg];[bg][5]overlay=x='if(lt(t,2),t*270,if(lt(t,4),290,(t-4)*270))':y=150:eval=frame[v];[3][4]concat=n=2:v=0:a=1[a]",
  "-map", "[v]", "-map", "[a]", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-c:a", "aac", F("montage-3plans.mp4")]);
const PLAN = {titre: "Montage", genre: "pub", habillage: "degrade", style: {look: "naturel", sous_titres: "aucun"},
  scenes: [{duree: 2, mise_en_page: "plein_ecran", titre: "", media: [{fichier: "vidéo 1", debut: 0, fin: 2, vitesse: 1, mouvement: "fixe"}], voix: "", transition: "coupe", cadrage: "suivi"},
    {duree: 2, mise_en_page: "plein_ecran", titre: "La fin", media: [{fichier: "vidéo 1", debut: 4, fin: 6, vitesse: 2, mouvement: "fixe"}], voix: "", transition: "coupe"}], appel: {}, publication: {titre: "Montage"}};
(async () => {
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000});
  const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if(m.type() === "error") errs.push(m.text()); });
  const asked = [];
  await pg.setRequestInterception(true);
  pg.on("request", r => { if(r.url().includes("/api/sample") && r.method() === "POST"){ try{ asked.push(JSON.parse(r.postData()).prompt || ""); }catch(e){} r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({delta: JSON.stringify(PLAN)}) + "\n"}); } else r.continue(); });
  try{
    await pg.setViewport({width: 1280, height: 900});
    await pg.goto(BASE + "/#constructeur", {waitUntil: "networkidle0"});
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}, cb: {fmt: "9:16", voix: "none"}})); });
    await pg.reload({waitUntil: "networkidle0"});
    await (await pg.$("#cb-files")).uploadFile(F("montage-3plans.mp4"));
    await pg.waitForFunction(() => /\d+ plans?/.test(document.getElementById("cb-assets").innerText), {timeout: 60000});
    const chip = await pg.evaluate(() => document.getElementById("cb-assets").innerText.replace(/\s+/g, " "));
    check("vidéo analysée sur l'ordinateur : 3 plans repérés (les changements de couleur)", /· 3 plans/.test(chip), chip.slice(0, 80));
    await pg.evaluate(() => { document.getElementById("cb-brief").value = "Pub rythmée avec ma vidéo"; document.getElementById("cb-go").click(); });
    await pg.waitForFunction(() => document.querySelectorAll("#cb-res .cb-scene").length === 2, {timeout: 30000});
    const q = asked[0] || "", plans = (q.match(/plans repérés : (.*)/) || [, ""])[1];
    check("l'agent reçoit les plans repérés (début, fin, mouvement, son) et leurs images", /1\) 0\.0–2\.0 s/.test(plans) && /2\) 2\.0–4\.0 s/.test(plans) && /3\) 4\.0–6\.0 s/.test(plans) && /mouvement fort/.test(plans) && /plan calme/.test(plans) && /son fort/.test(plans), plans.slice(0, 220));
    const ed = await pg.evaluate(() => ({opts: [...document.querySelectorAll('select[data-cb-v="0:0:plan"] option')].map(o => o.textContent), sel: (document.querySelector('select[data-cb-v="0:0:plan"]').selectedOptions[0] || {}).textContent, vit: document.querySelector('select[data-cb-v="1:0:vitesse"]').value}));
    check("éditeur : chaque vidéo d'une scène a son plan, son début, sa fin, sa vitesse (2× gardé pour la scène 2)", ed.opts.length === 4 && /Plan 1 · 0,0–2,0 s/.test(ed.sel) && ed.vit === "2", JSON.stringify(ed).slice(0, 220));
    await pg.evaluate(() => { const s = document.querySelector('select[data-cb-v="0:0:plan"]'); s.value = "1"; s.dispatchEvent(new Event("change", {bubbles: true})); }); await new Promise(r => setTimeout(r, 800));
    const ch = await pg.evaluate(() => ({d: document.querySelector('input[data-cb-v="0:0:debut"]').value, f: document.querySelector('input[data-cb-v="0:0:fin"]').value, dur: document.querySelector('input[data-cb-s="0:duree"]').value}));
    check("choisir le plan 2 règle le début, la fin et la durée de la scène", ch.d === "2.0" && ch.f === "4.0" && ch.dur === "2", JSON.stringify(ch));
    await pg.evaluate(() => { const s = document.querySelector('select[data-cb-v="0:0:plan"]'); s.value = "0"; s.dispatchEvent(new Event("change", {bubbles: true})); }); await new Promise(r => setTimeout(r, 800));
    /* recadrage qui suit l'action : à 1,6 s du plan 1, le carré blanc est à droite de la vidéo d'origine (x ≈ 430/640) ; en vertical, il reste à l'écran */
    await pg.evaluate(() => document.getElementById("cb-make").click());
    await pg.waitForFunction(() => /Vidéo prête|échoué|impossible/.test(document.getElementById("cb-vmsg").textContent), {timeout: 300000});
    const v = await pg.evaluate(async () => { const v = document.querySelector("#cb-vids video"); if(!v) return {msg: document.getElementById("cb-vmsg").textContent};
      await new Promise(r => { if(v.readyState >= 1) r(); else v.onloadedmetadata = r; setTimeout(r, 8000); }); const seek = async t => { v.currentTime = t; await new Promise(r => { v.onseeked = r; setTimeout(r, 3000); }); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); };
      const c = document.createElement("canvas"); c.width = 90; c.height = 160; const x = c.getContext("2d"), whiteAt = async t => { await seek(t); x.drawImage(v, 0, 0, 90, 160); const d = x.getImageData(0, 0, 90, 160).data; let n = 0, sx = 0; for(let i = 0; i < d.length; i += 4) if(d[i] > 225 && d[i + 1] > 225 && d[i + 2] > 225){ n++; sx += (i / 4) % 90; } return {n, x: n ? Math.round(sx / n) : -1}; };
      await seek(.1); return {msg: document.getElementById("cb-vmsg").textContent, w: v.videoWidth, h: v.videoHeight, a: await whiteAt(1.6), b: await whiteAt(.4)}; });
    check("recadrage vertical qui suit l'action : le carré blanc reste vers le centre de l'image, qu'il soit à gauche (0,4 s) ou à droite (1,6 s) de la vidéo d'origine", v.w === 1080 && v.h === 1920 && v.a.n > 20 && v.b.n > 20 && v.a.x > 18 && v.a.x < 72 && v.b.x > 18 && v.b.x < 72, JSON.stringify(v).slice(0, 200));
    /* sans IA : les meilleurs plans des vidéos deviennent des scènes, avec début et fin */
    const n0 = asked.length; await pg.evaluate(() => document.getElementById("cb-free").click()); await new Promise(r => setTimeout(r, 1500));
    const fr = await pg.evaluate(() => [...document.querySelectorAll('input[data-cb-v$=":debut"]')].map(i => i.value + "→" + (document.querySelector(`input[data-cb-v="${i.dataset.cbV.replace("debut", "fin")}"]`) || {}).value));
    check("« Sans IA » : le montage prend les meilleurs plans repérés (début et fin de chaque plan)", asked.length === n0 && fr.length >= 2 && fr.every(z => /^\d\.0→\d\.0$/.test(z)), fr.join(" · "));
    check("aucune erreur dans la console", errs.length === 0, errs.slice(0, 3).join(" | "));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  await b.close(); console.log(out.join("\n"));
})();
