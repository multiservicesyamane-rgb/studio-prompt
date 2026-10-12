// Bibliothèque d'effets du Constructeur (public/studio-fx.js) : au moins 50 modèles par catégorie, chacun se dessine sans erreur
// et donne une image différente des autres (sous-titres, transitions, effets d'image, couleurs, styles et animations de titres, mouvements).
// Aucun quota, aucune IA. Le serveur doit tourner (npm start).
const p = require("puppeteer-core"), fs = require("fs"), path = require("path");
const {BASE, EDGE, OUT} = require("./env");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
(async () => {
  const b = await p.launch({executablePath: EDGE, headless: true, protocolTimeout: 300000});
  const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message)); pg.on("console", m => { if(m.type() === "error") errs.push(m.text()); });
  try{
    await pg.goto(BASE + "/#constructeur", {waitUntil: "networkidle0"});
    if(!(await pg.evaluate(() => !!window.SP_FX))) await pg.addScriptTag({url: BASE + "/studio-fx.js"});
    const r = await pg.evaluate(async () => {
      const FX = window.SP_FX, W = 144, H = 256, res = {};
      const sig = c => { const s = document.createElement("canvas"); s.width = 12; s.height = 20; const x = s.getContext("2d"); x.drawImage(c, 0, 0, 12, 20); const d = x.getImageData(0, 0, 12, 20).data; let h = ""; for(let i = 0; i < d.length; i += 4) h += ((d[i] >> 5) * 64 + (d[i + 1] >> 5) * 8 + (d[i + 2] >> 5)).toString(36); return h; };
      const dark = c => { const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let r = 0, g = 0, n = 0; for(let i = 0; i < d.length; i += 40){ r += d[i]; g += d[i + 1]; n++; } return {r: r / n, g: g / n}; };
      for(const cat of ["subs", "trans", "looks", "palettes", "tstyles", "anims", "moves", "elems", "ambs"]){
        const ids = FX.list[cat].map(x => x.id), sigs = new Set(), bad = [];
        for(const id of ids){ if(id === "aucun" || id === "auto" || id === "naturel" || id === "fixe" || id === "aucune" || id === "coupe") { continue; }
          const c = document.createElement("canvas"); c.width = W; c.height = H;
          try{ const g = c.getContext("2d");
            /* appel direct (sans le filet de sécurité de thumb) pour voir les vraies erreurs */
            if(cat === "trans"){ const T = FX.transition(id); const A = document.createElement("canvas"), B = document.createElement("canvas"); [A, B].forEach((x, k) => { x.width = W; x.height = H; const y = x.getContext("2d"); y.fillStyle = k ? "#E8590C" : "#1F2937"; y.fillRect(0, 0, W, H); y.fillStyle = "#fff"; y.fillRect(W * .3, H * .3, W * .4, H * .4); }); g.fillStyle = "#000"; g.fillRect(0, 0, W, H); T.f(g, A, B, .5, {W, H, acc: "#FF2E88", t: .5}); }
            else if(cat === "looks") FX.look(g, FX.sample(W, H), id, {W, H, t: .4});
            else if(cat === "subs"){ g.drawImage(FX.sample(W, H), 0, 0); FX.drawCaps(g, {capt: [{i: 0, ws: [{w: "TON", a: 0, b: .35}, {w: "TEXTE", a: .35, b: .8}, {w: "ICI", a: .8, b: 1.2}]}], t: .55, W, H, L: W / 720, V: true, Q: false, sub: id}); }
            else if(cat === "anims"){ g.fillStyle = "#1F2937"; g.fillRect(0, 0, W, H); FX.drawTitle(g, ["Titre"], W / 2, H / 2 - 18, 36, {size: 32, font: '900 32px "Hanken Grotesk",Arial,sans-serif', color: "#fff", align: "center", max: W * .9, style: "simple", anim: id, lt: .22, acc: "#FF2E88", acc2: "#14213D"}); }
            else if(cat === "moves"){ let all = ""; for(const p of [.15, .5, .85]){ FX.thumb(cat, id, c, {p, t: p * 3}); all += sig(c); } sigs.add(all); continue; }
            else if(cat === "elems" || cat === "ambs"){ let all = ""; for(const tt of [.35, 1.2, 2.3]){ FX.thumb(cat, id, c, {t: tt}); all += sig(c); } sigs.add(all); continue; }   /* un mouvement se reconnaît dans le temps */
            else FX.thumb(cat, id, c, {});
            const d = dark(c); if(d.r > 120 && d.r < 135 && d.g < 35) bad.push(id + " (image d'erreur)"); sigs.add(sig(c));
          }catch(e){ bad.push(id + " : " + e.message); } }
        res[cat] = {n: ids.length, distinct: sigs.size, bad};
      }
      /* les alias des anciens noms restent valides */
      res.alias = {move: !!FX.move("zoom_avant", .5, 0).z, trans: FX.transition("glisse").id, subs: FX.subPreset("karaoke").id};
      return res; });
    const noms = {subs: "sous-titres", trans: "transitions", looks: "effets d'image", palettes: "couleurs", tstyles: "styles de titres", anims: "animations de titres", moves: "mouvements de caméra", elems: "éléments animés", ambs: "ambiances animées"};
    for(const [cat, nom] of Object.entries(noms)){ const x = r[cat]; check(`${nom} : au moins 50 modèles, tous dessinés sans erreur, et vraiment différents`, x.n >= 50 && !x.bad.length && x.distinct >= Math.min(50, x.n - 6), `${x.n} modèles · ${x.distinct} images différentes${x.bad.length ? " · erreurs : " + x.bad.slice(0, 4).join(" | ") : ""}`); }
    check("anciens noms toujours compris (zoom_avant, glisse, karaoke)", r.alias.move && r.alias.trans === "glisse_g" && r.alias.subs === "karaoke_jaune", JSON.stringify(r.alias));
    /* planche-contact de chaque catégorie, pour contrôle à l'œil */
    for(const cat of ["subs", "trans", "looks", "tstyles", "anims", "moves", "palettes", "elems", "ambs"]){
      const png = await pg.evaluate(cat => { const FX = window.SP_FX, ids = FX.list[cat].map(x => x.id), w = 96, h = 170, cols = 12, rows = Math.ceil(ids.length / cols), sheet = document.createElement("canvas"); sheet.width = cols * w; sheet.height = rows * (h + 14); const x = sheet.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, sheet.width, sheet.height);
        ids.forEach((id, i) => { const c = document.createElement("canvas"); c.width = w; c.height = h; FX.thumb(cat, id, c, {}); x.drawImage(c, (i % cols) * w, Math.floor(i / cols) * (h + 14)); x.fillStyle = "#000"; x.font = "9px sans-serif"; x.fillText(id.slice(0, 18), (i % cols) * w + 2, Math.floor(i / cols) * (h + 14) + h + 10); });
        return sheet.toDataURL("image/png"); }, cat);
      fs.writeFileSync(path.join(OUT, `effets-${cat}.png`), Buffer.from(png.split(",")[1], "base64"));
    }
    check("aucune erreur dans la console", errs.length === 0, errs.slice(0, 3).join(" | "));
  }catch(e){ out.push("ERREUR DU TEST : " + e.message); }
  await b.close(); console.log(out.join("\n"));
})();
