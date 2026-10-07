// Lance toutes les suites et affiche un bilan. Usage (dans tests/) : npm install puis npm test.
// Les suites « code » n'ont besoin de rien ; les suites « navigateur » demandent le serveur (npm start à la racine) et Edge.
// Aucune suite n'appelle une vraie IA : les réponses sont simulées, donc aucun quota n'est consommé.
const {spawnSync} = require("child_process"), path = require("path"), http = require("http");
const {BASE, OUT} = require("./env");
const CODE = ["gates-test.js", "audio-lock-test.js", "video-analyze-test.js", "gen-api-test.js", "fab-ui-test.js", "presse-test.js", "presse-unes-test.js", "presse-studio-test.js", "presse-plateau-test.js", "manus-test.js", "agnes-test.js", "manus-clips-test.js", "voix-gratuite-test.js", "voix-relais-test.js", "jeux-test.js", "pub-test.js", "agence-test.js", "youtube-learn-test.js"];   // ces suites lancent leurs propres serveurs (faux Google)   // video-analyze lance son propre serveur avec un faux Google
const NAV = ["ui-test.js", "menu-test.js", "v4-prompts-test.js", "long-mock-test.js", "adapt-test.js", "monet-test.js", "stats-test.js", "premont-test.js", "paroles-test.js", "paroles-voix-test.js", "remake-test.js"];
const only = process.argv.slice(2);
const up = () => new Promise(r => http.get(BASE + "/api/status", res => { res.resume(); r(res.statusCode === 200); }).on("error", () => r(false)));
(async () => {
  const serverUp = await up();
  let total = 0, bad = 0;
  for(const f of CODE.concat(NAV).filter(f => !only.length || only.some(o => f.includes(o)))){
    if(NAV.includes(f) && !serverUp){ console.log(`--   ${f} : ignoré, serveur absent sur ${BASE} (lance npm start)`); continue; }
    const r = spawnSync(process.execPath, [path.join(__dirname, f)], {cwd: OUT, encoding: "utf8", timeout: 600000});
    const o = (r.stdout || "") + (r.stderr || "");
    const okN = (o.match(/^OK\b/gm) || []).length, koN = (o.match(/^(ECHEC|ÉCHEC)\b|ERREUR DU TEST/gm) || []).length + (r.status ? 1 : 0) * (okN ? 0 : 1);
    total += okN; bad += koN;
    console.log(`${koN ? "ÉCHEC" : "OK   "} ${f} : ${okN} contrôle(s) réussi(s)${koN ? `, ${koN} échec(s)` : ""}`);
    if(koN) o.split("\n").filter(l => /^(ECHEC|ÉCHEC)|ERREUR/.test(l)).slice(0, 8).forEach(l => console.log("       " + l.slice(0, 220)));
  }
  console.log(`\nBilan : ${total} contrôles réussis, ${bad} échec(s).`);
  process.exit(bad ? 1 : 0);
})();
