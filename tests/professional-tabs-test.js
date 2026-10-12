"use strict";

// Contrats statiques des espaces professionnels. Ce test ne lance ni navigateur,
// ni serveur, ni IA : il vérifie que la structure accessible et les identités
// propres à chaque métier restent présentes dans public/index.html.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
const styles = [...html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join("\n");

const VIEWS = [
  "accueil", "tendances", "idees", "studio", "images", "audio",
  "agence", "presse", "reel", "niches", "pays", "persos", "qualite",
  "son", "chaine", "connexions", "memoire", "projets", "assistant", "constructeur"
];
const MOTION = ["libre", "cours", "infos", "quiz", "pub", "succes"];
const FREE_LAYOUTS = ["hero", "split", "data", "timeline", "quote", "process", "cta"];

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function balancedFrom(openAt, open = "{", close = "}") {
  assert.ok(openAt >= 0 && html[openAt] === open, `délimiteur ${open} introuvable`);
  let depth = 0;
  let quote = "";
  let lineComment = false;
  let blockComment = false;
  for (let i = openAt; i < html.length; i++) {
    const c = html[i];
    const n = html[i + 1];
    if (lineComment) {
      if (c === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === "*" && n === "/") { blockComment = false; i++; }
      continue;
    }
    if (quote) {
      if (c === "\\") { i++; continue; }
      if (c === quote) quote = "";
      continue;
    }
    if (c === "/" && n === "/") { lineComment = true; i++; continue; }
    if (c === "/" && n === "*") { blockComment = true; i++; continue; }
    if (c === "\"" || c === "'" || c === "`") { quote = c; continue; }
    if (c === open) depth++;
    if (c === close && --depth === 0) return html.slice(openAt, i + 1);
  }
  assert.fail(`bloc ${open}${close} non refermé`);
}

function frozenObject(name) {
  const marker = new RegExp(`const\\s+${name}\\s*=\\s*Object\\.freeze\\s*\\(`, "m").exec(html);
  assert.ok(marker, `${name} doit être déclaré avec Object.freeze`);
  const openAt = html.indexOf("{", marker.index + marker[0].length);
  const literal = balancedFrom(openAt);
  return vm.runInNewContext(`(${literal})`, Object.create(null), {timeout: 1000});
}

function constArray(name) {
  const marker = new RegExp(`const\\s+${name}\\s*=\\s*`, "m").exec(html);
  assert.ok(marker, `${name} doit être déclaré`);
  const openAt = html.indexOf("[", marker.index + marker[0].length);
  const literal = balancedFrom(openAt, "[", "]");
  return vm.runInNewContext(literal, Object.create(null), {timeout: 1000});
}

function functionBody(name) {
  const marker = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`, "m").exec(html);
  assert.ok(marker, `function ${name}() doit exister`);
  const openAt = html.indexOf("{", marker.index + marker[0].length - 1);
  return balancedFrom(openAt);
}

function functionSource(name) {
  const marker = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`, "m").exec(html);
  assert.ok(marker, `function ${name}() doit exister`);
  const openAt = html.indexOf("{", marker.index + marker[0].length - 1);
  return html.slice(marker.index, openAt) + balancedFrom(openAt);
}

function selectorBlock(selector) {
  // Exige la règle exacte : `section[data-view]:not(...)` ne doit pas être
  // confondu avec le socle `section[data-view]`.
  const marker = new RegExp(`(?:^|\\})\\s*${escapeRe(selector)}\\s*\\{`, "m").exec(styles);
  assert.ok(marker, `sélecteur CSS absent : ${selector}`);
  const openAt = marker.index + marker[0].lastIndexOf("{");
  let depth = 0;
  for (let i = openAt; i < styles.length; i++) {
    if (styles[i] === "{") depth++;
    if (styles[i] === "}" && --depth === 0) return styles.slice(openAt, i + 1);
  }
  assert.fail(`bloc CSS non refermé : ${selector}`);
}

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("les 20 vues DOM (dont le Constructeur et « Créer en 3 questions ») possèdent exactement 20 VIEW_PROFILES complets", () => {
  const tags = [...html.matchAll(/<section\b[^>]*\bdata-view="([^"]+)"[^>]*>/gi)];
  const domViews = tags.map(match => {
    const id = /\bid="view-([^"]+)"/i.exec(match[0]);
    assert.ok(id, `la vue ${match[1]} doit avoir un id view-*`);
    assert.equal(id[1], match[1], `id et data-view doivent correspondre pour ${match[1]}`);
    return match[1];
  });
  assert.equal(domViews.length, 20);
  assert.deepEqual(sorted(domViews), sorted(VIEWS));

  const profiles = frozenObject("VIEW_PROFILES");
  assert.deepEqual(sorted(Object.keys(profiles)), sorted(VIEWS));
  for (const name of VIEWS) {
    const p = profiles[name];
    assert.match(p.family, /^[a-z][a-z-]*$/, `${name}: family`);
    assert.match(p.index, /^\d{2}$/, `${name}: index`);
    assert.ok(p.code && p.code.length >= 4, `${name}: code professionnel`);
    for (const key of ["accent", "accent2", "deep"])
      assert.match(p[key], /^#[0-9A-F]{6}$/i, `${name}: ${key}`);
    assert.ok(Array.isArray(p.tags) && p.tags.length === 3 && p.tags.every(Boolean), `${name}: trois marqueurs métier`);
  }
});

test("les six MOTION_PROFILES correspondent exactement aux onglets et panneaux Motion", () => {
  assert.deepEqual([...constArray("MOTION_TABS")], MOTION);
  const profiles = frozenObject("MOTION_PROFILES");
  assert.deepEqual(sorted(Object.keys(profiles)), sorted(MOTION));

  const tabKeys = [...html.matchAll(/<button\b[^>]*\bdata-mt="([^"]+)"[^>]*>/gi)].map(m => m[1]);
  const panelKeys = [...html.matchAll(/<div\s+id="mt-([^"]+)"(?:\s[^>]*)?>/gi)].map(m => m[1]);
  assert.deepEqual(sorted(tabKeys), sorted(MOTION));
  assert.deepEqual(sorted(panelKeys), sorted(MOTION));
  for (const name of MOTION) {
    const p = profiles[name];
    assert.ok(p.code && p.code.length >= 4, `${name}: code`);
    assert.match(p.accent, /^#[0-9A-F]{6}$/i, `${name}: accent`);
    assert.match(p.accent2, /^#[0-9A-F]{6}$/i, `${name}: accent secondaire`);
    assert.match(p.deep, /^#[0-9A-F]{6}$/i, `${name}: fond profond`);
    assert.ok(Array.isArray(p.tags) && p.tags.length === 3, `${name}: marqueurs`);
  }
});

test("mtShow applique l'identité du format Motion actif", () => {
  const mtShow = functionBody("mtShow");
  const identity = functionBody("applyMotionIdentity");
  assert.match(mtShow, /applyMotionIdentity\s*\(\s*k\s*\)/,
    "changer d'onglet doit immédiatement appliquer son identité");
  assert.match(identity, /dataset\.motion\s*=\s*k/);
  for (const token of ["--view-accent", "--view-accent-2", "--view-deep"])
    assert.ok(identity.includes(`setProperty("${token}"`) || identity.includes(`setProperty('${token}'`), `${token} doit être appliqué`);
  assert.match(identity, /viewSignature\s*\(\s*view\s*,\s*p\s*\)/);
  assert.match(identity, /syncProfessionalShell\s*\(\s*["']presse["']\s*\)/);
});

test("navigation accessible : tablist, relations, clavier, titres et focus", () => {
  assert.match(html, /class="mt-tabs"[^>]*role="tablist"/);
  for (const name of MOTION) {
    const tab = new RegExp(`<button\\b(?=[^>]*\\brole="tab")(?=[^>]*\\bdata-mt="${escapeRe(name)}")(?=[^>]*\\baria-selected="(?:true|false)")[^>]*>`, "i");
    assert.match(html, tab, `${name}: bouton role=tab avec état sélectionné`);
  }

  const init = functionBody("initProfessionalViews");
  assert.match(init, /aria-controls/);
  assert.match(init, /setAttribute\s*\(\s*["']role["']\s*,\s*["']tabpanel["']\s*\)/);
  assert.match(init, /aria-labelledby/);
  assert.match(init, /tabIndex\s*=\s*-1/);
  for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"])
    assert.ok(init.includes(`"${key}"`) || init.includes(`'${key}'`), `navigation clavier ${key}`);

  const setView = functionBody("setView");
  assert.match(setView, /requestAnimationFrame\s*\(/);
  assert.match(setView, /\.focus\s*\(\s*\{\s*preventScroll\s*:\s*true\s*\}\s*\)/);
  const shell = functionBody("syncProfessionalShell");
  assert.match(shell, /document\.title\s*=/);
  assert.match(shell, /--active-view-accent/);
});

test("les thèmes restent scoped par vue et respectent reduced-motion", () => {
  const base = selectorBlock("section[data-view]");
  for (const token of ["--view-accent", "--view-accent-2", "--view-deep", "--accent", "--accent-soft"])
    assert.ok(base.includes(token), `token scoped manquant : ${token}`);

  // Accueil utilise le profil de base ; les 17 autres vues ont leur palette locale.
  for (const name of VIEWS.filter(name => name !== "accueil")) {
    const block = selectorBlock(`#view-${name}`);
    for (const token of ["--view-accent", "--view-accent-2", "--view-deep"])
      assert.ok(block.includes(token), `${name}: ${token}`);
  }
  for (const name of MOTION) {
    const block = selectorBlock(`#view-presse[data-motion="${name}"]`);
    for (const token of ["--view-accent", "--view-accent-2", "--view-deep"])
      assert.ok(block.includes(token), `motion ${name}: ${token}`);
  }

  assert.match(styles, /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)/i);
  assert.match(styles, /prefers-reduced-motion\s*:\s*reduce[\s\S]*?section\[data-view\][^{}]*\{\s*animation\s*:\s*none/);
  assert.match(styles, /prefers-reduced-motion\s*:\s*reduce[\s\S]*?\.mt-tabs\s+button\[aria-selected="true"\][^{}]*\{[^}]*transform\s*:\s*none/);
});

test("la publicité n'invente aucune promesse commerciale absente du brief", () => {
  const forbidden = /Qualité garantie par la boutique|Prix juste|Service rapide/i.exec(html);
  if (forbidden) assert.fail(`promesse commerciale inventée encore présente : « ${forbidden[0]} »`);
});

test("le projet Motion libre possède un renderer multi-layout dédié", () => {
  const frame = functionBody("mdProjectFrame");
  for (const layout of FREE_LAYOUTS) {
    assert.match(frame, new RegExp(`["']${escapeRe(layout)}["']`), `layout ${layout} absent de mdProjectFrame`);
  }
  const makeVideo = functionBody("mdMakeVideo");
  assert.match(makeVideo, /mdProjectFrame\s*\(/, "mdMakeVideo doit composer les scènes libres avec mdProjectFrame");
  assert.match(makeVideo, /!\s*MD_RESULT\.course|MD_RESULT\.course\s*===\s*false/,
    "le renderer libre doit être séparé du renderer pédagogique");
});

test("les scènes libres sont normalisées avant rendu et terminent à la durée exacte", () => {
  const normalize = functionBody("mdNormalizeProject");
  for (const layout of FREE_LAYOUTS)
    assert.match(normalize, new RegExp(`["']${escapeRe(layout)}["']`), `layout normalisé manquant : ${layout}`);
  assert.match(normalize, /s\.debut\s*=\s*Number\s*\(/);
  assert.match(normalize, /s\.fin\s*=\s*Number\s*\(/);
  assert.match(normalize, /i\s*===\s*scenes\.length\s*-\s*1\s*\?\s*Number\s*\(\s*f\.duration\s*\)/,
    "la dernière scène doit finir exactement à la durée demandée");
  assert.match(normalize, /layout\s*===\s*previous/,
    "deux compositions successives identiques doivent être corrigées");
  assert.match(html, /const\s+r\s*=\s*mdNormalizeProject\s*\(\s*await\s+sample\.json/,
    "la réponse IA doit être normalisée avant MD_RESULT");

  const runNormalize = vm.runInNewContext(`(${functionSource("mdNormalizeProject")})`);
  const result = runNormalize({scenes: [
    {debut: 8, fin: 11, layout: "hero", fonction: "hook"},
    {debut: 0, fin: 4, layout: "hero", fonction: "explication"},
    {debut: 12, fin: 18, layout: "invalide", fonction: "preuve"}
  ]}, {duration: 30, style: "editorial", brief: "Démonstration", goal: "expliquer"});
  assert.equal(result.scenes[0].debut, 0);
  assert.equal(result.scenes.at(-1).fin, 30);
  assert.ok(result.scenes.every((scene, i) => FREE_LAYOUTS.includes(scene.layout) && (!i || scene.layout !== result.scenes[i - 1].layout)));
});

test("le projet libre passe lui aussi par le serveur FFmpeg", () => {
  const finalize = functionBody("mdFinalizeFfmpeg");
  assert.match(finalize, /MD_RESULT\.course\s*\?\s*["']\/api\/course\/finalize["']\s*:\s*["']\/api\/video\/finalize["']/);
  assert.match(finalize, /MD_RESULT\.course\s*\?[^;]+:\s*["']track["']/,
    "le master libre doit recevoir une piste SRT activable");
  assert.doesNotMatch(finalize, /if\s*\(\s*!MD_RESULT\.course\s*\)\s*return/,
    "FFmpeg ne doit plus être réservé au cours");
  assert.match(html, /const\s+capture\s*=\s*await\s+mdMakeVideo\(\)[\s\S]{0,240}await\s+mdFinalizeFfmpeg\(capture/,
    "la capture libre doit être envoyée au serveur avant affichage du master");
});

test("les 14 branches Canvas libres s'exécutent sans exception et diffèrent", () => {
  const roundPath = vm.runInNewContext(`(${functionSource("crRoundPath")})`);
  const frame = vm.runInNewContext(`(${functionSource("mdProjectFrame")})`, {crRoundPath: roundPath, mdCover() {}});
  const hash = text => { let h = 2166136261; for (const c of text) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const signatures = {wide: [], vertical: []};
  for (const [kind, W, H] of [["wide", 1280, 720], ["vertical", 720, 1280]]) {
    for (let index = 0; index < FREE_LAYOUTS.length; index++) {
      const calls = [], gradient = {addColorStop(...args) { calls.push(["stop", ...args]); }};
      const g = {
        beginPath(){calls.push(["begin"]);}, moveTo(...a){calls.push(["move",...a]);}, lineTo(...a){calls.push(["line",...a]);}, quadraticCurveTo(...a){calls.push(["quad",...a]);}, closePath(){calls.push(["close"]);},
        fill(){calls.push(["fill"]);}, stroke(){calls.push(["stroke"]);}, fillRect(...a){calls.push(["rect",...a]);}, arc(...a){calls.push(["arc",...a]);}, save(){calls.push(["save"]);}, restore(){calls.push(["restore"]);}, translate(...a){calls.push(["translate",...a]);}, rotate(...a){calls.push(["rotate",...a]);}, clip(){calls.push(["clip"]);}, drawImage(...a){calls.push(["image",...a]);},
        fillText(...a){calls.push(["text",...a]);}, measureText(text){return {width:String(text).length*10};}, createLinearGradient(){calls.push(["gradient"]);return gradient;}
      };
      const scenes=FREE_LAYOUTS.map((layout,i)=>({n:i+1,layout,fonction:i===0?"hook":i===6?"cta":"explication",texte_ecran:layout==="data"?"75 % utile":"Une idée devient visible",message:"Observer. Comprendre. Appliquer.",voix_off:"Une démonstration claire."}));
      const r={titre:"Énergie solaire",promesse:"Comprendre et agir",direction:{style:"tech"},scenes},f={style:"tech",format:H>W?"9:16":"16:9"};
      assert.doesNotThrow(()=>frame(g,r,f,scenes[index],index,.58,2.4,W,H,["#070914","#675cff","#32c6d4","#ffbd4a"],null),`${FREE_LAYOUTS[index]} ${W}x${H}`);
      assert.ok(calls.length>20,`${FREE_LAYOUTS[index]} doit réellement dessiner`);
      signatures[kind].push(hash(JSON.stringify(calls)));
    }
  }
  assert.equal(new Set(signatures.wide).size,7,"les sept compositions 16:9 doivent être structurellement distinctes");
  assert.equal(new Set(signatures.vertical).size,7,"les sept compositions 9:16 doivent être structurellement distinctes");
});
