/* Test d'intégration de la vraie finition serveur des cours.
   Il crée une capture WebM minuscule, lance un serveur isolé, appelle l'API,
   puis demande à FFmpeg de relire le MP4 livré. Aucun service IA ni réseau externe. */
"use strict";
const fs = require("fs");
const path = require("path");
const net = require("net");
const {spawn, spawnSync} = require("child_process");

const ROOT = path.join(__dirname, "..");
const TMP = path.join(__dirname, `.course-ffmpeg-${process.pid}`);
const PROJECT = "course-test";
const PROJECT_DIR = path.join(TMP, PROJECT);
const SOURCE_NAME = "capture-navigateur-test.webm";
const SOURCE = path.join(PROJECT_DIR, SOURCE_NAME);
const GENERIC_SOURCE_NAME = "capture-navigateur-generique.webm";
const GENERIC_SOURCE = path.join(PROJECT_DIR, GENERIC_SOURCE_NAME);
const FFMPEG = require("ffmpeg-static");
let child = null;
let failed = 0;

function check(name, ok, detail=""){
  if(!ok) failed++;
  console.log(`${ok ? "OK   " : "ECHEC"} ${name}${detail ? " — " + detail : ""}`);
}
function freePort(){
  return new Promise((resolve,reject)=>{ const s=net.createServer(); s.once("error",reject); s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));}); });
}
function pause(ms){ return new Promise(resolve=>setTimeout(resolve,ms)); }
async function waitServer(base, logs){
  for(let i=0;i<120;i++){
    if(child && child.exitCode!==null) throw new Error(`Le serveur s'est arrêté (${child.exitCode}). ${logs()}`);
    try{ const r=await fetch(base+"/api/status"); if(r.ok) return r.json(); }catch(e){}
    await pause(100);
  }
  throw new Error("Le serveur de test ne répond pas. "+logs());
}
async function stop(){
  if(!child || child.exitCode!==null) return;
  child.kill();
  await Promise.race([new Promise(resolve=>child.once("exit",resolve)),pause(3000)]);
  if(child.exitCode===null) child.kill("SIGKILL");
}

(async()=>{
  fs.rmSync(TMP,{recursive:true,force:true});
  fs.mkdirSync(PROJECT_DIR,{recursive:true});
  const made=spawnSync(FFMPEG,["-hide_banner","-loglevel","error","-y","-f","lavfi","-i","color=c=0x102030:s=320x180:r=30:d=1.2","-f","lavfi","-i","sine=frequency=440:sample_rate=48000:duration=1.2","-c:v","libvpx-vp9","-deadline","realtime","-cpu-used","8","-b:v","350k","-c:a","libopus","-shortest",SOURCE],{windowsHide:true,encoding:"utf8"});
  check("la capture WebM de test est produite",made.status===0&&fs.existsSync(SOURCE)&&fs.statSync(SOURCE).size>1000,(made.stderr||"").slice(-180));
  if(failed) throw new Error("Impossible de créer la capture source.");
  fs.copyFileSync(SOURCE,GENERIC_SOURCE);

  const port=await freePort(), base=`http://127.0.0.1:${port}`; let output="";
  child=spawn(process.execPath,["--preserve-symlinks","--preserve-symlinks-main",path.join(ROOT,"server.js")],{cwd:ROOT,windowsHide:true,env:{...process.env,PORT:String(port),HOST:"127.0.0.1",GEN_DIR:TMP,SP_NO_DOTENV:"1",APP_PASSWORD:"",GEMINI_API_KEY:"",ANTHROPIC_API_KEY:"",OPENAI_API_KEY:"",PROVIDER:""},stdio:["ignore","pipe","pipe"]});
  const add=b=>{output=(output+b.toString("utf8")).slice(-8000);}; child.stdout.on("data",add); child.stderr.on("data",add);
  const status=await waitServer(base,()=>output);
  check("le serveur annonce FFmpeg disponible",status&&status.tools&&status.tools.ffmpeg===true);

  const badMethod=await fetch(base+"/api/course/finalize");
  check("la route refuse les méthodes autres que POST",badMethod.status===405,`HTTP ${badMethod.status}`);
  const evil=await fetch(base+"/api/course/finalize-evil",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
  check("une route au nom voisin n'est pas acceptée",[404,405].includes(evil.status),`HTTP ${evil.status}`);
  const traversal=await fetch(base+"/api/course/finalize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input:"file:///etc/passwd",title:"x"})});
  check("aucun chemin ni URL arbitraire n'est accepté",traversal.status===400,`HTTP ${traversal.status}`);

  const genericMethods=await Promise.all(["GET","PUT","DELETE"].map(method=>fetch(base+"/api/video/finalize",{method})));
  check("l'alias générique existe et refuse toutes les méthodes autres que POST",genericMethods.every(r=>r.status===405),genericMethods.map(r=>`HTTP ${r.status}`).join(", "));
  const genericEvil=await fetch(base+"/api/video/finalize-evil",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
  check("un faux chemin voisin de l'alias générique n'est pas accepté",[404,405].includes(genericEvil.status),`HTTP ${genericEvil.status}`);
  const genericMalformed=await fetch(base+"/api/video/finalize",{method:"POST",headers:{"Content-Type":"application/json"},body:"{pas-du-json"});
  const genericMalformedBody=await genericMalformed.json().catch(()=>({}));
  check("l'alias générique rejette un corps JSON illisible",genericMalformed.status===400&&genericMalformedBody.code==="bad_request",`HTTP ${genericMalformed.status}`);
  const genericTraversal=await fetch(base+"/api/video/finalize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input:`/generated/${PROJECT}/../server.js`,title:"x"})});
  const genericTraversalBody=await genericTraversal.json().catch(()=>({}));
  check("l'alias générique rejette la traversée de dossiers",genericTraversal.status===400&&genericTraversalBody.code==="bad_request",`HTTP ${genericTraversal.status}`);
  const genericBadSrt=await fetch(base+"/api/video/finalize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input:`/generated/${PROJECT}/${GENERIC_SOURCE_NAME}`,title:"x",subtitles:"burn",srt:"\u0000"})});
  const genericBadSrtBody=await genericBadSrt.json().catch(()=>({}));
  check("l'alias générique rejette les sous-titres non sûrs",genericBadSrt.status===413&&genericBadSrtBody.code==="subtitles_too_large",`HTTP ${genericBadSrt.status}`);

  const genericResponse=await fetch(base+"/api/video/finalize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input:`/generated/${PROJECT}/${GENERIC_SOURCE_NAME}`,title:"Vidéo générique ../../ & calc",duration:1.2,subtitles:"none",srt:""})});
  const genericResult=await genericResponse.json().catch(()=>({}));
  check("POST /api/video/finalize utilise réellement la pipeline FFmpeg sécurisée",genericResponse.status===200&&genericResult.finalized===true&&genericResult.srt===""&&/^\/generated\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\.mp4$/.test(genericResult.url||""),`HTTP ${genericResponse.status} ${genericResult.message||""}`);
  if(genericResponse.ok&&genericResult.url){
    const genericMedia=await fetch(base+genericResult.url), genericBytes=Buffer.from(await genericMedia.arrayBuffer());
    check("le master de l'alias générique est un vrai MP4 servi",/^video\/mp4/.test(genericMedia.headers.get("content-type")||"")&&genericBytes.length>1000&&genericBytes.toString("ascii",4,8)==="ftyp",`${genericBytes.length} octets`);
    check("la capture générique est supprimée après succès",!fs.existsSync(GENERIC_SOURCE));
  }

  const response=await fetch(base+"/api/course/finalize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input:`/generated/${PROJECT}/${SOURCE_NAME}`,title:"Cours test ../../ & calc",duration:1.2,subtitles:"burn",srt:"1\n00:00:00,100 --> 00:00:00,950\nTEST COURS FFMPEG\n"})});
  const result=await response.json().catch(()=>({}));
  check("l'API finalise réellement le cours",response.status===200&&result.finalized===true&&/^\/generated\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+\.mp4$/.test(result.url||""),`HTTP ${response.status} ${result.message||""}`);
  if(response.ok&&result.url){
    const media=await fetch(base+result.url), bytes=Buffer.from(await media.arrayBuffer());
    const moov=bytes.indexOf(Buffer.from("moov")),mdat=bytes.indexOf(Buffer.from("mdat"));
    check("le résultat servi est un MP4 non vide",/^video\/mp4/.test(media.headers.get("content-type")||"")&&bytes.length>1000&&bytes.toString("ascii",4,8)==="ftyp",`${bytes.length} octets`);
    check("le MP4 est optimisé pour lecture immédiate (+faststart)",moov>0&&mdat>0&&moov<mdat,`moov=${moov}, mdat=${mdat}`);
    const finalPath=path.join(TMP,...result.url.split("/").filter(Boolean).slice(1));
    const probe=spawnSync(FFMPEG,["-hide_banner","-i",finalPath,"-f","null","-"],{windowsHide:true,encoding:"utf8"}),log=probe.stderr||"";
    check("le master contient une vidéo H.264 yuv420p",probe.status===0&&/Video:\s*h264/i.test(log)&&/yuv420p/i.test(log));
    check("le master contient un son AAC 48 kHz",probe.status===0&&/Audio:\s*aac/i.test(log)&&/48000 Hz/i.test(log));
    const srt=await fetch(base+result.srt);
    check("le fichier SRT est aussi servi avec son vrai type",srt.ok&&/application\/x-subrip/.test(srt.headers.get("content-type")||""));
    check("la capture temporaire est supprimée après succès",!fs.existsSync(SOURCE));
  }

  const html=fs.readFileSync(path.join(ROOT,"public","index.html"),"utf8");
  check("le clic de rendu appelle la finition FFmpeg uniquement après la capture",html.indexOf("await mdFinalizeFfmpeg(capture")>html.indexOf("const capture=await mdMakeVideo()"));
  check("l'interface conserve un repli navigateur explicite",/finalError[\s\S]{0,500}finalized:false/.test(html)&&/capture navigateur reste téléchargeable/i.test(html));
})().catch(e=>{ failed++; console.error("ECHEC test FFmpeg —",e&&e.stack||e); }).finally(async()=>{
  await stop();
  fs.rmSync(TMP,{recursive:true,force:true});
  process.exitCode=failed?1:0;
});
