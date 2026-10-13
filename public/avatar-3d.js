/* Studio Prompt : avatar 3D « enfant enseignant » (garçon assis en boubou moderne et kufi brodé, table basse et Coran sur son porte-livre).
   Personnage fictif, construit avec three.js à partir de formes simples (aucune personne réelle). Un seul moteur WebGL partagé pour toute la page
   (les navigateurs limitent le nombre de moteurs 3D) ; à chaque image, la pose est donnée : bouche sur la voix, clignements, respiration,
   balancement pendant la récitation, gestes (montrer la tablette, mains ouvertes). Fond transparent : le décor est dessiné par recitation-fx.js. */
(function(){
"use strict";
const THREE_URL="https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.min.js";
const STYLES={
  indigo:{nom:"Indigo brodé d'or", robe:"#26365E", brod:"#E2B857", kufi:"#F3EEE2", kufiB:"#26365E"},
  sauge:{nom:"Vert sauge et blanc", robe:"#7C9A84", brod:"#FFFFFF", kufi:"#FFFFFF", kufiB:"#5E7B66"},
  ivoire:{nom:"Ivoire et terracotta", robe:"#EEE4CF", brod:"#B85A36", kufi:"#B85A36", kufiB:"#EEE4CF"},
  ciel:{nom:"Bleu ciel et or", robe:"#86BFE3", brod:"#C9932E", kufi:"#FFFFFF", kufiB:"#C9932E"},
  bordeaux:{nom:"Bordeaux et or", robe:"#6C1F32", brod:"#E8C26A", kufi:"#1E1B1B", kufiB:"#E8C26A"},
  blanc:{nom:"Blanc pur et bleu", robe:"#F7F7F4", brod:"#2F5D9E", kufi:"#F7F7F4", kufiB:"#2F5D9E"}
};
const SKINS={fonce:{nom:"Peau foncée", c:"#5A3A24"}, moyen:{nom:"Peau brune", c:"#7B4F2E"}, clair:{nom:"Peau claire", c:"#A87A52"}};
let T=null, loading=null, R=null, rig=null, failed=false;
function load(){ if(T) return Promise.resolve(T); if(failed) return Promise.reject(new Error("3D indisponible"));
  return loading||(loading=import(THREE_URL).then(m=>{ T=m; return T; }).catch(e=>{ failed=true; loading=null; throw e; })); }
const rnd=i=>{ const x=Math.sin(i*127.1+311.7)*43758.5453; return x-Math.floor(x); };
/* broderie : losanges, chevrons et points, dans la couleur choisie */
function embroideryCanvas(st){ const c=document.createElement("canvas"); c.width=1024; c.height=1024; const g=c.getContext("2d");
  g.fillStyle=st.robe; g.fillRect(0,0,1024,1024);
  /* tissu : très léger tissage */
  g.globalAlpha=.025; for(let i=0;i<6000;i++){ g.fillStyle=rnd(i)>.5?"#000":"#fff"; g.fillRect(rnd(i+1)*1024,rnd(i+2)*1024,2,2); } g.globalAlpha=1;
  const band=(y,h)=>{ g.fillStyle=st.brod; g.fillRect(0,y,1024,3); g.fillRect(0,y+h-3,1024,3); for(let x=0;x<1024;x+=h){ g.beginPath(); g.moveTo(x+h/2,y+6); g.lineTo(x+h-6,y+h/2); g.lineTo(x+h/2,y+h-6); g.lineTo(x+6,y+h/2); g.closePath(); g.lineWidth=3; g.strokeStyle=st.brod; g.stroke(); g.beginPath(); g.arc(x+h/2,y+h/2,4,0,7); g.fill(); } };
  /* plastron brodé devant (le devant du boubou est au milieu de l'image) : grand motif en V */
  g.save(); g.strokeStyle=st.brod; g.fillStyle=st.brod; g.lineWidth=5; const cx=512;
  /* plastron : col en V brodé, rangs de chevrons, losanges au centre, petites étoiles */
  for(let k=0;k<4;k++){ const w=190-k*30, y0=0+k*30; g.lineWidth=k?4:8; g.beginPath(); g.moveTo(cx-w,y0); g.lineTo(cx,y0+330-k*40); g.lineTo(cx+w,y0); g.stroke(); }
  for(let k=0;k<9;k++){ const y=40+k*34, r=k%2?10:14; g.beginPath(); g.moveTo(cx,y); g.lineTo(cx+r,y+r); g.lineTo(cx,y+2*r); g.lineTo(cx-r,y+r); g.closePath(); g.fill(); }
  [[-120,70],[120,70],[-80,150],[80,150]].forEach(([dx,y])=>{ g.beginPath(); for(let i=0;i<8;i++){ const a=i*Math.PI/4, q=i%2?5:13; g.lineTo(cx+dx+q*Math.cos(a),y+q*Math.sin(a)); } g.closePath(); g.fill(); });
  /* bandes brodées des côtés (coupe moderne) */
  [cx-300,cx+300].forEach(x=>{ g.fillRect(x-3,0,6,1024); for(let y=20;y<1024;y+=46){ g.beginPath(); g.moveTo(x,y); g.lineTo(x+9,y+12); g.lineTo(x,y+24); g.lineTo(x-9,y+12); g.closePath(); g.fill(); } });
  g.restore(); band(980,40);
  return c; }
function kufiCanvas(st){ const c=document.createElement("canvas"); c.width=1024; c.height=256; const g=c.getContext("2d"); g.fillStyle=st.kufi; g.fillRect(0,0,1024,256);
  g.fillStyle=st.kufiB; g.strokeStyle=st.kufiB; g.lineWidth=4;
  for(let x=0;x<1024;x+=64){ g.beginPath(); g.moveTo(x+32,60); g.lineTo(x+60,128); g.lineTo(x+32,196); g.lineTo(x+4,128); g.closePath(); g.stroke(); g.beginPath(); g.arc(x+32,128,7,0,7); g.fill(); }
  g.fillRect(0,0,1024,14); g.fillRect(0,242,1024,14); return c; }
function pageCanvas(){ const c=document.createElement("canvas"); c.width=256; c.height=320; const g=c.getContext("2d"); g.fillStyle="#F6EDD6"; g.fillRect(0,0,256,320);
  g.strokeStyle="#B8862E"; g.lineWidth=6; g.strokeRect(14,14,228,292); g.fillStyle="#3A2716"; for(let y=46;y<290;y+=20){ const w=170-((y*7)%40); g.fillRect(128-w/2,y,w,5); } return c; }
function coverCanvas(){ const c=document.createElement("canvas"); c.width=256; c.height=320; const g=c.getContext("2d"); g.fillStyle="#174A39"; g.fillRect(0,0,256,320);
  g.strokeStyle="#D9B256"; g.lineWidth=5; g.strokeRect(14,14,228,292); g.lineWidth=2; g.strokeRect(24,24,208,272); g.fillStyle="#D9B256";
  g.beginPath(); for(let i=0;i<16;i++){ const a=-Math.PI/2+i*Math.PI/8, q=i%2?34:52; g.lineTo(128+q*Math.cos(a),160+q*Math.sin(a)); } g.closePath(); g.lineWidth=3; g.stroke(); g.beginPath(); g.arc(128,160,22,0,7); g.fill(); return c; }
function build(){
  const S={}, scene=new T.Scene(), cam=new T.PerspectiveCamera(26,1,.1,100);
  scene.add(new T.HemisphereLight(0xFFF1DC,0x3A2A22,1.35));
  const key=new T.DirectionalLight(0xFFF4E2,2.6); key.position.set(-3,5,6); scene.add(key);
  const fill=new T.DirectionalLight(0xBFD8FF,.65); fill.position.set(4,2,4); scene.add(fill);
  const rim=new T.DirectionalLight(0xFFD49A,1.6); rim.position.set(2,4,-5); scene.add(rim);
  const M=(c,r,o)=>new T.MeshStandardMaterial(Object.assign({color:c, roughness:r==null?.6:r, metalness:0},o||{}));
  const skin=M("#5A3A24",.55), dark=M("#1A120E",.4), white=M("#FBFBF8",.25), iris=M("#3B2416",.3), lip=M("#3E2016",.6), mouthIn=M("#2A0F0E",.8), tongue=M("#B8605A",.7);
  const robeTex=new T.CanvasTexture(embroideryCanvas(STYLES.indigo)); robeTex.colorSpace=T.SRGBColorSpace; robeTex.anisotropy=4;
  const robe=M("#FFFFFF",.85,{map:robeTex, side:T.DoubleSide}), kufiTex=new T.CanvasTexture(kufiCanvas(STYLES.indigo)); kufiTex.colorSpace=T.SRGBColorSpace; kufiTex.wrapS=T.RepeatWrapping; kufiTex.repeat.set(2,1);
  const kufi=M("#FFFFFF",.75,{map:kufiTex}), kufiTop=M(STYLES.indigo.kufi,.75), wood=M("#8A5A33",.55), woodD=M("#5E3B20",.6), cover=M("#FFFFFF",.45,{map:Object.assign(new T.CanvasTexture(coverCanvas()),{colorSpace:T.SRGBColorSpace})}), page=M("#FFFFFF",.8,{map:Object.assign(new T.CanvasTexture(pageCanvas()),{colorSpace:T.SRGBColorSpace})});
  const root=new T.Group(); scene.add(root);
  /* boubou : cloche drapée (garçon assis en tailleur), couture derrière, plastron brodé devant */
  const prof=[[1.5,0],[1.48,.08],[1.34,.4],[1.12,.82],[.94,1.22],[.86,1.5],[.8,1.78],[.66,1.97],[.34,2.08],[.3,2.12]].map(([x,y])=>new T.Vector2(x,y));
  const body=new T.Mesh(new T.LatheGeometry(prof,72,Math.PI,Math.PI*2),robe); root.add(body);
  const torso=new T.Group(); root.add(torso);
  const neck=new T.Mesh(new T.CylinderGeometry(.24,.28,.4,24),skin); neck.position.y=2.2; torso.add(neck);
  /* tête */
  const head=new T.Group(); head.position.y=2.95; torso.add(head); S.head=head;
  const skull=new T.Mesh(new T.SphereGeometry(.8,48,40),skin); skull.scale.set(1,1.04,.96); head.add(skull);
  [-1,1].forEach(k=>{ const ear=new T.Mesh(new T.SphereGeometry(.17,20,16),skin); ear.scale.set(.5,1,.8); ear.position.set(.78*k,-.02,0); head.add(ear); });
  const cheekM=M("#7A4430",.6,{transparent:true,opacity:.35}); [-1,1].forEach(k=>{ const ch=new T.Mesh(new T.SphereGeometry(.14,16,12),cheekM); ch.scale.set(1,.6,.3); ch.position.set(.42*k,-.2,.66); head.add(ch); });
  /* yeux : grands, expressifs ; clignement = paupière qui s'écrase */
  S.eyes=[]; [-1,1].forEach(k=>{ const eg=new T.Group(); eg.position.set(.28*k,.06,.62); head.add(eg);
    const w=new T.Mesh(new T.SphereGeometry(.19,32,24),white); w.scale.set(1,1.12,.55); eg.add(w);
    const ir=new T.Mesh(new T.SphereGeometry(.115,28,20),iris); ir.scale.set(1,1.08,.4); ir.position.z=.075; eg.add(ir);
    const pu=new T.Mesh(new T.SphereGeometry(.062,20,14),dark); pu.scale.set(1,1,.4); pu.position.z=.105; eg.add(pu);
    const hl=new T.Mesh(new T.SphereGeometry(.03,12,10),white); hl.position.set(.035,.045,.125); eg.add(hl);
    const lid=new T.Mesh(new T.SphereGeometry(.2,32,16,0,Math.PI*2,0,Math.PI/2),skin); lid.scale.set(1.02,1.14,.6); lid.rotation.x=-1.25; eg.add(lid);
    S.eyes.push({g:eg, ir, pu, hl, lid}); });
  /* sourcils */
  S.brows=[]; [-1,1].forEach(k=>{ const b=new T.Mesh(new T.CapsuleGeometry(.03,.16,4,8),dark); b.rotation.z=Math.PI/2+.12*k; b.position.set(.28*k,.33,.66); head.add(b); S.brows.push(b); });
  const nose=new T.Mesh(new T.SphereGeometry(.09,20,16),M("#4E321F",.5)); nose.scale.set(1.15,.8,.8); nose.position.set(0,-.1,.76); head.add(nose);
  /* bouche : sourire au repos, s'ouvre avec la voix */
  const mouth=new T.Group(); mouth.position.set(0,-.33,.7); head.add(mouth); S.mouth=mouth;
  const inner=new T.Mesh(new T.SphereGeometry(.12,24,16),mouthIn); inner.scale.set(1.25,.1,.45); mouth.add(inner); S.inner=inner;
  const tng=new T.Mesh(new T.SphereGeometry(.07,16,12),tongue); tng.scale.set(1.3,.5,.5); tng.position.set(0,-.03,.01); mouth.add(tng); S.tongue=tng;
  const smile=new T.Mesh(new T.TorusGeometry(.12,.017,8,24,Math.PI),lip); smile.rotation.z=Math.PI; smile.position.y=.03; mouth.add(smile); S.smile=smile;
  /* kufi brodé */
  const kg=new T.Group(); kg.position.set(0,.5,-.05); kg.rotation.x=-.12; head.add(kg);
  const kb=new T.Mesh(new T.CylinderGeometry(.66,.72,.46,48,1,true),kufi); kb.position.y=.12; kg.add(kb);
  const kt=new T.Mesh(new T.CylinderGeometry(.66,.66,.04,48),kufiTop); kt.position.y=.35; kg.add(kt); S.kufi={kb,kt};
  /* bras : manches larges du boubou, mains ; pivot à l'épaule */
  S.arms=[]; [-1,1].forEach(k=>{ const sh=new T.Group(); sh.position.set(.7*k,1.9,.05); torso.add(sh);
    const sl=new T.Mesh(new T.CylinderGeometry(.2,.46,1.05,28,1,true),robe); sl.position.y=-.5; sh.add(sl);
    const hand=new T.Mesh(new T.SphereGeometry(.16,24,18),skin); hand.scale.set(1,.9,.8); hand.position.y=-1.08; sh.add(hand);
    const finger=new T.Mesh(new T.CapsuleGeometry(.045,.16,4,8),skin); finger.position.set(0,-1.28,0); finger.visible=false; sh.add(finger);
    S.arms.push({sh,hand,finger,k}); });
  /* table basse, porte-livre en X et Coran ouvert */
  const desk=new T.Group(); desk.position.set(0,0,1.35); root.add(desk); S.desk=desk;
  const top=new T.Mesh(new T.BoxGeometry(2.7,.12,1.05),wood); top.position.y=.62; desk.add(top);
  [-1,1].forEach(k=>{ const leg=new T.Mesh(new T.BoxGeometry(.14,.6,.9),woodD); leg.position.set(1.15*k,.3,0); desk.add(leg); });
  const rehal=new T.Group(); rehal.position.set(0,.68,-.05); desk.add(rehal);
  [-1,1].forEach(k=>{ const p=new T.Mesh(new T.BoxGeometry(.9,.04,.62),woodD); p.rotation.x=.55*k; p.position.set(0,.18,.12*k); rehal.add(p); });
  const book=new T.Group(); book.position.set(0,.42,.12); book.rotation.x=-.55; rehal.add(book);
  [-1,1].forEach(k=>{ const cv=new T.Mesh(new T.BoxGeometry(.52,.03,.66),cover); cv.position.x=.27*k; cv.rotation.z=-.12*k; book.add(cv); const pg=new T.Mesh(new T.PlaneGeometry(.48,.62),page); pg.rotation.x=-Math.PI/2; pg.rotation.y=-.12*k; pg.position.set(.27*k,.025,0); book.add(pg); });
  S.scene=scene; S.cam=cam; S.root=root; S.torso=torso; S.body=body; S.mats={skin,robe,robeTex,kufi,kufiTex,kufiTop}; S.style="indigo"; S.skin="fonce";
  return S; }
function setStyle(st, sk){ const S=rig; if(!S) return; if(st&&STYLES[st]&&S.style!==st){ S.style=st; const s=STYLES[st];
    const c1=embroideryCanvas(s); S.mats.robeTex.image=c1; S.mats.robeTex.needsUpdate=true; const c2=kufiCanvas(s); S.mats.kufiTex.image=c2; S.mats.kufiTex.needsUpdate=true; S.mats.kufiTop.color.set(s.kufi); }
  if(sk&&SKINS[sk]&&S.skin!==sk){ S.skin=sk; S.mats.skin.color.set(SKINS[sk].c); [S.eyes[0].lid,S.eyes[1].lid].forEach(l=>l.material.color.set(SKINS[sk].c)); } }
/* pose de l'instant t : p = {mouth 0..1, speak bool, point 0..1 (montre la tablette), side -1|1 (côté de la tablette), open 0..1 (mains ouvertes), rock bool} */
function pose(t, p){ const S=rig; p=p||{}; const m=Math.max(0,Math.min(1,p.mouth||0));
  S.inner.scale.y=.1+m*.62; S.inner.scale.x=1.25+m*.15; S.inner.position.y=-.02-m*.035; S.tongue.visible=m>.25; S.smile.position.y=.03+m*.02; S.smile.scale.set(1-m*.25,1-m*.6,1); S.head.rotation.x=.04-m*.05;
  /* clignement toutes les 3 à 5 s (et un double, parfois) */
  const per=3.6+rnd(Math.floor(t/4))*1.6, ph=t%per, bl=ph<.13?1-Math.abs(ph-.065)/.065:0; S.eyes.forEach(e=>{ e.lid.rotation.x=-1.25+bl*1.3; });
  /* regard : vers la caméra, de temps en temps vers la tablette */
  const look=(p.point||0)*.6, lx=(p.side||1)*look*.035; S.eyes.forEach(e=>{ e.ir.position.x=lx; e.pu.position.x=lx*1.1; e.hl.position.x=.035+lx; });
  /* respiration, balancement doux pendant la récitation (comme à l'école coranique), tête vivante */
  const br=Math.sin(t*1.6)*.012, rk=p.rock?Math.sin(t*4.2)*.035:0;
  S.torso.position.y=br*2; S.torso.rotation.x=rk; S.body.scale.set(1+br*.5,1+br,1+br*.5);
  S.head.rotation.y=Math.sin(t*.45)*.08+(p.side||1)*look*.25; S.head.rotation.z=Math.sin(t*.33)*.035;
  S.brows.forEach((b,i)=>{ b.position.y=.33+(p.speak?.01*Math.sin(t*3+i):0); });
  /* gestes : une main montre la tablette, ou les deux s'ouvrent pour expliquer */
  const pt=Math.max(0,Math.min(1,p.point||0)), op=Math.max(0,Math.min(1,p.open||0));
  S.arms.forEach(a=>{ const toward=a.k===(p.side||1), e=x=>x*x*(3-2*x);
    let rz=-.1*a.k, rx=-.78+Math.sin(t*1.6)*.01;   /* repos : mains posées sur la table, près du livre */
    if(toward&&pt>0){ const q=e(pt); rz=a.k*(-.1+1.12*q); rx=-.78+.05*q+Math.sin(t*1.3)*.03*q; }
    else if(op>0){ const q=e(op); rz=a.k*(-.1+.7*q); rx=-.78-.22*q+Math.sin(t*2.1+a.k)*.06*q; }
    a.sh.rotation.z=rz; a.sh.rotation.x=rx; a.finger.visible=toward&&pt>.6; }); }
/* rend l'avatar à la taille demandée ; rend le canevas WebGL (à dessiner aussitôt avec drawImage) */
function render(w, h, t, p, opts){ if(!T) return null; w=Math.max(16,Math.round(w)); h=Math.max(16,Math.round(h));
  if(!R){ const c=document.createElement("canvas"); R=new T.WebGLRenderer({canvas:c, antialias:true, alpha:true, preserveDrawingBuffer:true, powerPreference:"high-performance"}); R.setPixelRatio(1); R.outputColorSpace=T.SRGBColorSpace; R.toneMapping=T.ACESFilmicToneMapping; R.toneMappingExposure=1.08; R.setClearColor(0x000000,0); }
  if(!rig) rig=build();
  if(opts) setStyle(opts.style, opts.skin);
  const cv=R.domElement; if(cv.width!==w||cv.height!==h) R.setSize(w,h,false);
  const S=rig, a=w/h; S.cam.aspect=a; S.cam.fov=a<.8?30:26; S.cam.updateProjectionMatrix();
  /* cadrage : le garçon entier, assis derrière sa table, un peu de haut (comme un élève qui le regarde) */
  const d=a<.8?13.2:11.6; S.cam.position.set(0,3.4,d); S.cam.lookAt(0,1.75,0);
  pose(t||0, p||{}); R.render(S.scene,S.cam); return cv; }
window.SP_AVATAR={version:1, styles:STYLES, skins:SKINS, load, render, ready:()=>!!T};
})();
