// Onglet Paroles : modifier une voix off, transformer un plan en dialogue, compteur de mots, prompts mis à jour.
const p = require("puppeteer-core");
const out = [], check = (n, ok, x) => out.push(`${ok ? "OK   " : "ECHEC"} ${n}${x ? " — " + x : ""}`);
(async () => {
  const b = await p.launch({executablePath: require("./env").EDGE, headless: true}); const pg = await b.newPage(); await require("./noauto")(pg);
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  for(const [tag, vp] of [["ordinateur", {width: 1366, height: 900}], ["téléphone", {width: 390, height: 844, isMobile: true, hasTouch: true}]]){
    await pg.setViewport(vp);
    await pg.goto(require("./env").BASE + "/#studio", {waitUntil: "networkidle0"});
    await pg.evaluate(() => { localStorage.clear(); localStorage.setItem("sp-prefs", JSON.stringify({veille: {auto: false}})); });
    await pg.reload({waitUntil: "networkidle0"});
    await pg.evaluate(() => { const bt = [...document.querySelectorAll("button")].find(x => /exemple/i.test(x.textContent)); if(bt) bt.click(); });
    await pg.waitForSelector('[data-ptab="paroles"]'); await pg.$eval('[data-ptab="paroles"]', e => e.scrollIntoView({block: "center"})); await pg.click('[data-ptab="paroles"]'); await new Promise(r => setTimeout(r, 300));
    const st = await pg.evaluate(() => ({vis: !document.getElementById("s-paroles").hidden, plans: document.querySelectorAll("#s-paroles [data-par]").length, scenes: document.querySelectorAll("#s-paroles .par-scene").length, count: (document.querySelector('#s-paroles [data-par="0"] .par-count') || {}).textContent, tabs: [...document.querySelectorAll("[data-ptab]")].map(x => x.textContent).slice(0, 3).join(" · "), overflow: document.documentElement.scrollWidth > innerWidth}));
    check(`[${tag}] onglet Paroles : 11 plans rangés en 6 scènes, compteur de mots`, st.vis && st.plans === 11 && st.scenes === 6 && /mots/.test(st.count || ""), `${st.tabs} · ${st.count}`);
    check(`[${tag}] pas de débordement`, !st.overflow);
    if(tag === "téléphone"){ await pg.screenshot({path: "paroles-tel.png"}); continue; }
    // 1. modifier la voix off du plan 1
    await pg.evaluate(() => { const t = document.querySelector('#s-paroles [data-par="0"] .par-vo'); t.value = "Cette année-là, aucune goutte n'était tombée."; t.dispatchEvent(new Event("input", {bubbles: true})); });
    // 2. plan 2 → dialogue à deux voix
    await pg.click('#s-paroles [data-par="1"] [data-par-add]'); await pg.click('#s-paroles [data-par="1"] [data-par-add]');
    await pg.evaluate(() => { const rows = document.querySelectorAll('#s-paroles [data-par="1"] .par-rep'); rows[0].querySelector(".par-who").value = "awa"; rows[0].querySelector(".par-txt").value = "Grand-père, il n'y a plus d'eau."; rows[1].querySelector(".par-who").value = "moussa"; rows[1].querySelector(".par-txt").value = "Alors creusons."; rows[1].querySelector(".par-ton").value = "calm, wise"; });
    // 3. texte trop long au plan 3
    await pg.evaluate(() => { const t = document.querySelector('#s-paroles [data-par="2"] .par-vo'); t.value = "un ".repeat(40).trim(); t.dispatchEvent(new Event("input", {bubbles: true})); });
    const over = await pg.evaluate(() => document.querySelector('#s-paroles [data-par="2"] .par-count').className.includes("over"));
    check("compteur rouge quand le texte est trop long pour le plan", over);
    await pg.evaluate(() => { const t = document.querySelector('#s-paroles [data-par="2"] .par-vo'); t.value = "Awa eut une idée."; });
    await pg.click("#par-save"); await new Promise(r => setTimeout(r, 500));
    await pg.click('[data-ptab="plans"]'); await pg.evaluate(() => document.getElementById("pg-all").click()); await new Promise(r => setTimeout(r, 300));
    const r = await pg.evaluate(() => ({p1: (document.querySelector("#plan-0 .vo") || {}).innerText || "", p2: (document.querySelector("#plan-1 .vo") || {}).innerText || "", prompt: [...document.querySelectorAll("#plan-1 pre")].map(x => x.textContent).join(" ")}));
    check("plan 1 : nouvelle voix off affichée", /aucune goutte/.test(r.p1), r.p1.replace(/\s+/g, " ").slice(0, 90));
    check("plan 2 : dialogue à deux voix avec les noms", /Grand-père, il n'y a plus d'eau/.test(r.p2) && /Alors creusons/.test(r.p2), r.p2.replace(/\s+/g, " ").slice(0, 120));
    await pg.click('[data-ptab="paroles"]'); await new Promise(r => setTimeout(r, 200));
    await pg.evaluate(() => { document.querySelector('#s-paroles [data-par="0"] .par-vo').value = "brouillon"; }); await pg.click("#par-reset"); await new Promise(r => setTimeout(r, 300));
    check("Annuler les changements remet le texte enregistré", await pg.evaluate(() => /aucune goutte/.test(document.querySelector('#s-paroles [data-par="0"] .par-vo').value)));
  }
  check("aucune erreur JavaScript", errs.length === 0, errs.join(" | "));
  await b.close(); console.log(out.join("\n"));
})().catch(e => { console.log(out.join("\n")); console.log("ERREUR DU TEST :", e.message); });
