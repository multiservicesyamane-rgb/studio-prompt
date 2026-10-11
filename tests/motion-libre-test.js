// Projet libre (Motion design) : vidéo fabriquée image par image en Full HD (téléphone 1080 × 1920), puis finition FFmpeg du serveur.
// IA simulée (aucun quota). Le serveur doit tourner (npm start).
const p = require("puppeteer-core");
const {BASE, EDGE} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
const PROJET = {titre: "Le soleil en 15 secondes", concept: "Comprendre l'énergie solaire.", promesse: "Une idée claire, tout de suite",
  direction: {style: "tech", palette: ["#070914", "#675cff", "#32c6d4", "#ffbd4a"]},
  scenes: [{debut: 0, fin: 4, fonction: "hook", layout: "hero", texte_ecran: "Le soleil travaille pour toi", message: "Chaque jour, le soleil envoie de l'énergie."},
    {debut: 4, fin: 9, fonction: "explication", layout: "split", texte_ecran: "Lumière → électricité", message: "Les panneaux transforment la lumière."},
    {debut: 9, fin: 15, fonction: "cta", layout: "cta", texte_ecran: "Essaie chez toi", message: "Commence petit."}]};
(async () => {
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000});
  const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if(m.type() === "error") errs.push(m.text()); });
  await pg.setRequestInterception(true);
  pg.on("request", r => { if(r.url().includes("/api/sample") && r.method() === "POST") r.respond({status: 200, contentType: "application/x-ndjson; charset=utf-8", body: JSON.stringify({delta: JSON.stringify(PROJET)}) + "\n" + JSON.stringify({model: "simulation"}) + "\n"}); else r.continue(); });
  try{
    await pg.setViewport({width: 1280, height: 900});
    await pg.goto(BASE + "/#accueil", {waitUntil: "networkidle0"});
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({motion: "libre", veille: {auto: false}})); });
    await pg.reload({waitUntil: "networkidle0"}); await pg.evaluate(() => { location.hash = "presse"; });
    await pg.waitForFunction(() => !document.getElementById("mt-libre").hidden, {timeout: 15000});
    const lab = await pg.evaluate(() => [...document.querySelectorAll("#md-format option")].map(o => o.textContent).join(" | "));
    check("formats nommés comme dans les autres onglets : téléphone, PC, carré", /Téléphone · 9:16/.test(lab) && /PC · 16:9/.test(lab) && /Carré · 1:1/.test(lab), lab);
    await pg.evaluate(() => { const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event("change", {bubbles: true})); };
      set("md-format", "9:16"); set("md-duration", "15"); set("md-image-mode", "none"); set("md-audio-mode", "none");
      document.getElementById("md-brief").value = "Expliquer l'énergie solaire simplement, en 15 secondes."; document.getElementById("md-form").requestSubmit(); });
    await pg.waitForSelector("#md-render", {timeout: 30000});
    await pg.evaluate(() => document.getElementById("md-render").click());
    const steps = new Set();
    for(let i = 0; i < 480; i++){ const m = await pg.evaluate(() => document.getElementById("md-render-msg").textContent); if(/Export Full HD : \d+ s/.test(m)) steps.add("export"); if(/FFmpeg/.test(m)) steps.add("ffmpeg");
      if(/Master MP4 finalisé|Capture prête|Vidéo prête|impossible à|Utilise Chrome/.test(m)) break; await new Promise(r => setTimeout(r, 500)); }
    const v = await pg.evaluate(async () => { const v = document.querySelector("#md-video video"); const msg = document.getElementById("md-render-msg").textContent; if(!v) return {msg};
      await new Promise(r => { if(v.readyState >= 1) r(); else v.onloadedmetadata = r; setTimeout(r, 8000); });
      const c = document.createElement("canvas"), seen = []; for(const t of [1.5, 6.5, 12]){ v.currentTime = t; await new Promise(r => { v.onseeked = r; setTimeout(r, 3000); }); c.width = v.videoWidth; c.height = v.videoHeight;
        const x = c.getContext("2d"); x.drawImage(v, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let lit = 0; for(let i = 0; i < d.length; i += 64) if(d[i] + d[i + 1] + d[i + 2] > 300) lit++; seen.push(lit); }
      return {msg, w: v.videoWidth, h: v.videoHeight, dur: v.duration, seen, meta: (document.getElementById("md-video").innerText || "").replace(/\s+/g, " ").slice(0, 220)}; });
    check("export image par image en Full HD suivi à l'écran, puis finition FFmpeg", steps.has("export") && steps.has("ffmpeg"), [...steps].join(", "));
    check("vidéo téléphone 9:16 en Full HD (1080 × 1920), à la durée demandée (15 s)", v.w === 1080 && v.h === 1920 && Math.abs(v.dur - 15) < 1, `${v.w}×${v.h} · ${Math.round((v.dur || 0) * 10) / 10} s · ${v.msg}`);
    check("master MP4 du serveur FFmpeg (H.264, AAC, -14 LUFS)", /Master MP4 finalisé/.test(v.msg) && /H\.264/.test(v.meta) && /-14 LUFS/.test(v.meta), v.meta);
    check("les scènes sont bien dessinées (textes et formes visibles au début, au milieu et à la fin)", (v.seen || []).length === 3 && v.seen.every(n => n > 300), JSON.stringify(v.seen));
    check("aucune erreur dans la console", errs.length === 0, errs.slice(0, 3).join(" | "));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  await b.close(); console.log(out.join("\n"));
})();
