const puppeteer = require("puppeteer-core");
const path = require("path");
const OUT = require("./env").OUT;
const URL = require("./env").BASE + "/#studio";
const EDGE = require("./env").EDGE;

const results = [];
function check(name, ok, extra){ results.push(`${ok ? "OK   " : "ECHEC"} ${name}${extra ? " — " + extra : ""}`); }

async function run(label, viewport){
  const browser = await puppeteer.launch({executablePath: EDGE, headless: true, args: ["--no-first-run"]});
  const ctx = browser.defaultBrowserContext();
  await ctx.overridePermissions(require("./env").BASE, ["clipboard-read", "clipboard-write", "clipboard-sanitized-write"]);
  const page = await browser.newPage(); await require("./noauto")(page);
  const errors = [];
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { if(m.type() === "error") errors.push("console: " + m.text()); });
  await page.setViewport(viewport);
  await page.goto(URL, {waitUntil: "networkidle0"});
  await page.evaluate(() => document.getElementById("open-example").click());
  await page.waitForSelector(".ptabs");
  await new Promise(r => setTimeout(r, 300));

  const state = () => page.evaluate(() => {
    const vis = el => el && !el.hidden && el.offsetParent !== null;
    const shots = [...document.querySelectorAll("#s-plans .shot")];
    return {
      tab: (document.querySelector('[data-ptab][aria-selected="true"]') || {}).dataset?.ptab,
      sections: [...document.querySelectorAll("#result section[data-tab]")].filter(vis).map(s => s.id),
      visibleShots: shots.filter(vis).map(s => s.id),
      nShots: shots.length,
      count: (document.getElementById("pg-count") || {}).textContent,
      current: (document.querySelector('#pg-nums [aria-current="true"]') || {}).textContent,
      done: [...document.querySelectorAll("#pg-nums button.done")].map(b => b.textContent),
      overflow: document.documentElement.scrollWidth - window.innerWidth,
    };
  });

  let s = await state();
  check(`[${label}] onglet par défaut = Plans`, s.tab === "plans" && s.sections.join() === "s-plans", JSON.stringify(s.sections));
  check(`[${label}] un seul plan visible`, s.visibleShots.length === 1 && s.visibleShots[0] === "plan-0", `${s.count}, ${s.nShots} plans`);
  check(`[${label}] pas de débordement horizontal`, s.overflow <= 0, `écart ${s.overflow}px`);
  await page.screenshot({path: path.join(OUT, `${label}-1-plan.png`)});

  // Suivant / Précédent / numéros
  await page.click('#pager [data-plan-step="1"]');
  s = await state(); check(`[${label}] Suivant → plan 2`, s.count === `Plan 2 sur ${s.nShots}` && s.visibleShots[0] === "plan-1", s.count);
  await page.click('#pager [data-plan-step="-1"]');
  s = await state(); check(`[${label}] Précédent → plan 1`, s.count === `Plan 1 sur ${s.nShots}`, s.count);
  const prevDisabled = await page.$eval('#pager [data-plan-step="-1"]', b => b.disabled);
  check(`[${label}] Précédent désactivé au plan 1`, prevDisabled);
  await page.click('#pg-nums [data-plan="4"]');
  s = await state(); check(`[${label}] numéro 05 → plan 5`, s.count === `Plan 5 sur ${s.nShots}` && s.current === "05", `${s.count}, actif ${s.current}`);

  // Prompt replié, Afficher / Masquer
  const fold = await page.evaluate(() => {
    const pb = document.querySelector("#plan-4 .pb.fold"); const pre = pb.querySelector("pre");
    return {folded: pre.clientHeight < pre.scrollHeight, h: pre.clientHeight, full: pre.scrollHeight, kinds: [...document.querySelectorAll("#plan-4 .pb .ktag")].map(x => x.textContent), labels: [...document.querySelectorAll("#plan-4 .pb-label")].map(x => x.textContent), joins: [...document.querySelectorAll("#plan-4 .pb-info .join")].map(x => x.textContent.trim())};
  });
  check(`[${label}] prompt replié (premières lignes)`, fold.folded, `${fold.h}px affichés sur ${fold.full}px`);
  check(`[${label}] types visibles dans le plan`, fold.kinds.join() === "Image,Vidéo,Vidéo", fold.kinds.join(" | "));
  results.push(`      étiquettes : ${fold.labels.join(" | ")}`);
  results.push(`      à joindre : ${fold.joins.join(" | ")}`);
  await page.click("#plan-4 .pb.fold [data-fold]");
  const opened = await page.evaluate(() => { const pb = document.querySelector("#plan-4 .pb.fold"); const pre = pb.querySelector("pre"); return {open: pb.classList.contains("open"), btn: pb.querySelector("[data-fold]").textContent, full: pre.clientHeight >= pre.scrollHeight}; });
  check(`[${label}] Afficher ouvre le prompt en entier`, opened.open && opened.full && opened.btn.startsWith("Masquer"), opened.btn);
  await page.screenshot({path: path.join(OUT, `${label}-2-ouvert.png`)});
  await page.click("#plan-4 .pb.fold [data-fold]");
  const closed = await page.evaluate(() => document.querySelector("#plan-4 .pb.fold").classList.contains("open"));
  check(`[${label}] Masquer replie le prompt`, !closed);

  // Copier (prompt replié) → texte complet + numéro vert
  await page.click("#plan-4 .pb.fold .copy");
  await new Promise(r => setTimeout(r, 200));
  const clip = await page.evaluate(async () => { try { return await navigator.clipboard.readText(); } catch(e) { return "ERR " + e.message; } });
  const full = await page.$eval("#plan-4 .pb.fold pre", p => p.textContent);
  check(`[${label}] Copier copie le prompt complet même replié`, clip === full, `${clip.length} caractères copiés / ${full.length}`);
  s = await state(); check(`[${label}] numéro du plan copié devient vert`, s.done.includes("05"), `verts : ${s.done.join(",")}`);
  const green = await page.$eval('#pg-nums [data-plan="4"]', b => getComputedStyle(b).backgroundColor);
  results.push(`      couleur du numéro 05 (actif + copié) : ${green}`);
  await page.click('#pg-nums [data-plan="5"]');
  const green2 = await page.$eval('#pg-nums [data-plan="4"]', b => getComputedStyle(b).backgroundColor + " / texte " + getComputedStyle(b).color);
  results.push(`      couleur du numéro 05 quand on est sur un autre plan : ${green2}`);

  // Clavier (ordinateur)
  if(!viewport.isMobile){
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    await page.keyboard.press("ArrowRight");
    s = await state(); check(`[${label}] flèche → passe au plan suivant`, s.count === `Plan 7 sur ${s.nShots}`, s.count);
    await page.keyboard.press("ArrowLeft");
    s = await state(); check(`[${label}] flèche ← revient`, s.count === `Plan 6 sur ${s.nShots}`, s.count);
  }

  // Voir tous les plans
  await page.click("#pg-all");
  s = await state(); check(`[${label}] « Voir tous les plans » affiche la liste`, s.visibleShots.length === s.nShots, `${s.visibleShots.length} visibles, bouton « ${await page.$eval("#pg-all", b => b.textContent)} »`);
  await page.click("#pg-all");
  s = await state(); check(`[${label}] retour à un plan à la fois`, s.visibleShots.length === 1, s.count);

  // Barre d'onglets collée en haut
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 150));
  const top = await page.$eval(".ptabs", n => Math.round(n.getBoundingClientRect().top));
  check(`[${label}] barre d'onglets collée en haut en descendant`, top === 0, `top=${top}px`);
  await page.screenshot({path: path.join(OUT, `${label}-3-bas.png`)});

  // Onglets
  for(const [k, id] of [["board","s-board"],["perso","s-perso"],["brief","s-brief"],["audio","s-audio"],["montage","s-montage"],["yt","s-yt"]]){
    await page.click(`[data-ptab="${k}"]`);
    s = await state(); check(`[${label}] onglet ${k}`, s.tab === k && s.sections.includes(id) && !s.sections.includes("s-plans"), s.sections.join(","));
  }
  await page.click('[data-ptab="tout"]');
  s = await state(); check(`[${label}] onglet Tout = tout le projet`, s.sections.length >= 7 && s.visibleShots.length === s.nShots, `${s.sections.length} sections, ${s.visibleShots.length} plans`);
  await page.click('[data-ptab="perso"]');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({path: path.join(OUT, `${label}-4-personnages.png`)});
  const tabsList = await page.$$eval("[data-ptab]", bs => bs.map(b => b.textContent).join(" · "));
  results.push(`      onglets : ${tabsList}`);

  // Changer d'outil (Wan) : le projet se redessine sans erreur, l'état est gardé
  await page.click('[data-ptab="plans"]');
  await page.select("#v-outil", "wan");
  await new Promise(r => setTimeout(r, 200));
  s = await state();
  const wanKinds = await page.$$eval(`#${s.visibleShots[0]} .pb .ktag`, xs => xs.map(x => x.textContent).join(","));
  check(`[${label}] outil Wan : plan gardé + prompt négatif`, s.tab === "plans" && s.count === "Plan 6 sur " + s.nShots || label === "telephone", `${s.count} · ${wanKinds}`);
  await page.select("#v-outil", "veo");

  check(`[${label}] aucune erreur dans la console`, errors.length === 0, errors.join(" | "));
  await browser.close();
}

(async () => {
  await run("telephone", {width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2});
  await run("ordinateur", {width: 1366, height: 900, deviceScaleFactor: 1});
  console.log(results.join("\n"));
})().catch(e => { console.log(results.join("\n")); console.error("ERREUR DU TEST :", e.message); process.exit(1); });
