/* Studio Prompt : personnages 3D des leçons (three.js, formes simples, rendu doux ; personnages fictifs, aucune personne réelle).
   - « enfant » : garçon enseignant assis, boubou moderne et kufi brodés, table basse et Coran sur son porte-livre ;
   - « oustaz » : jeune enseignant adulte, barbe courte, même style ; « talibés » : élèves vus de dos, assis sur la natte.
   Deux scènes : « solo » (l'enfant) et « daara » (l'oustaz et trois talibés qui répètent après lui).
   Vie : regard qui se déplace (caméra, tablette, livre), clignements, sourcils, bouche qui change de forme sur la voix, hochements de tête
   au début des phrases, balancement en récitant, gestes (montrer la tablette, expliquer mains ouvertes, tourner la page), respiration,
   caméra qui se rapproche et tourne lentement, ombres au sol.
   Un seul moteur WebGL partagé pour toute la page (les navigateurs limitent le nombre de moteurs 3D) ; fond transparent :
   le décor et la tablette en bois sont dessinés par recitation-fx.js. */
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
let T=null, loading=null, R=null, failed=false; const SCENES={};
function load(){ if(T) return Promise.resolve(T); if(failed) return Promise.reject(new Error("3D indisponible"));
  return loading||(loading=import(THREE_URL).then(m=>{ T=m; return T; }).catch(e=>{ failed=true; loading=null; throw e; })); }
const rnd=i=>{ const x=Math.sin(i*127.1+311.7)*43758.5453; return x-Math.floor(x); };
const cl=(v,a,b)=>Math.max(a,Math.min(b,v)), sm=x=>{ x=cl(x,0,1); return x*x*(3-2*x); };
/* ---------- textures : broderie du boubou, kufi, pages et couverture du Coran, ombre au sol ---------- */
function embroideryCanvas(st){ const c=document.createElement("canvas"); c.width=1024; c.height=1024; const g=c.getContext("2d");
  g.fillStyle=st.robe; g.fillRect(0,0,1024,1024);
  g.globalAlpha=.025; for(let i=0;i<6000;i++){ g.fillStyle=rnd(i)>.5?"#000":"#fff"; g.fillRect(rnd(i+1)*1024,rnd(i+2)*1024,2,2); } g.globalAlpha=1;
  const band=(y,h)=>{ g.fillStyle=st.brod; g.fillRect(0,y,1024,3); g.fillRect(0,y+h-3,1024,3); for(let x=0;x<1024;x+=h){ g.beginPath(); g.moveTo(x+h/2,y+6); g.lineTo(x+h-6,y+h/2); g.lineTo(x+h/2,y+h-6); g.lineTo(x+6,y+h/2); g.closePath(); g.lineWidth=3; g.strokeStyle=st.brod; g.stroke(); g.beginPath(); g.arc(x+h/2,y+h/2,4,0,7); g.fill(); } };
  g.save(); g.strokeStyle=st.brod; g.fillStyle=st.brod; const cx=512;
  for(let k=0;k<4;k++){ const w=190-k*30, y0=k*30; g.lineWidth=k?4:8; g.beginPath(); g.moveTo(cx-w,y0); g.lineTo(cx,y0+330-k*40); g.lineTo(cx+w,y0); g.stroke(); }
  for(let k=0;k<9;k++){ const y=40+k*34, r=k%2?10:14; g.beginPath(); g.moveTo(cx,y); g.lineTo(cx+r,y+r); g.lineTo(cx,y+2*r); g.lineTo(cx-r,y+r); g.closePath(); g.fill(); }
  [[-120,70],[120,70],[-80,150],[80,150]].forEach(([dx,y])=>{ g.beginPath(); for(let i=0;i<8;i++){ const a=i*Math.PI/4, q=i%2?5:13; g.lineTo(cx+dx+q*Math.cos(a),y+q*Math.sin(a)); } g.closePath(); g.fill(); });
  [cx-300,cx+300].forEach(x=>{ g.fillRect(x-3,0,6,1024); for(let y=20;y<1024;y+=46){ g.beginPath(); g.moveTo(x,y); g.lineTo(x+9,y+12); g.lineTo(x,y+24); g.lineTo(x-9,y+12); g.closePath(); g.fill(); } });
  /* dos : un grand médaillon brodé (les talibés sont vus de dos) */
  g.lineWidth=5; [0,1024].forEach(x0=>{ g.beginPath(); g.arc(x0,190,110,0,7); g.stroke(); g.beginPath(); g.arc(x0,190,70,0,7); g.stroke(); });
  g.restore(); band(980,40); return c; }
function kufiCanvas(st){ const c=document.createElement("canvas"); c.width=1024; c.height=256; const g=c.getContext("2d"); g.fillStyle=st.kufi; g.fillRect(0,0,1024,256);
  g.fillStyle=st.kufiB; g.strokeStyle=st.kufiB; g.lineWidth=4;
  for(let x=0;x<1024;x+=64){ g.beginPath(); g.moveTo(x+32,60); g.lineTo(x+60,128); g.lineTo(x+32,196); g.lineTo(x+4,128); g.closePath(); g.stroke(); g.beginPath(); g.arc(x+32,128,7,0,7); g.fill(); }
  g.fillRect(0,0,1024,14); g.fillRect(0,242,1024,14); return c; }
function pageCanvas(){ const c=document.createElement("canvas"); c.width=256; c.height=320; const g=c.getContext("2d"); g.fillStyle="#F6EDD6"; g.fillRect(0,0,256,320);
  g.strokeStyle="#B8862E"; g.lineWidth=6; g.strokeRect(14,14,228,292); g.fillStyle="#3A2716"; for(let y=46;y<290;y+=20){ const w=170-((y*7)%40); g.fillRect(128-w/2,y,w,5); } return c; }
function coverCanvas(){ const c=document.createElement("canvas"); c.width=256; c.height=320; const g=c.getContext("2d"); g.fillStyle="#174A39"; g.fillRect(0,0,256,320);
  g.strokeStyle="#D9B256"; g.lineWidth=5; g.strokeRect(14,14,228,292); g.lineWidth=2; g.strokeRect(24,24,208,272); g.fillStyle="#D9B256";
  g.beginPath(); for(let i=0;i<16;i++){ const a=-Math.PI/2+i*Math.PI/8, q=i%2?34:52; g.lineTo(128+q*Math.cos(a),160+q*Math.sin(a)); } g.closePath(); g.lineWidth=3; g.stroke(); g.beginPath(); g.arc(128,160,22,0,7); g.fill(); return c; }
function shadowCanvas(){ const c=document.createElement("canvas"); c.width=c.height=128; const g=c.getContext("2d"), r=g.createRadialGradient(64,64,0,64,64,64); r.addColorStop(0,"rgba(30,18,8,.55)"); r.addColorStop(.6,"rgba(30,18,8,.22)"); r.addColorStop(1,"rgba(30,18,8,0)"); g.fillStyle=r; g.fillRect(0,0,128,128); return c; }
const tex=c=>{ const x=new T.CanvasTexture(c); x.colorSpace=T.SRGBColorSpace; x.anisotropy=4; return x; };
const M=(c,r,o)=>new T.MeshStandardMaterial(Object.assign({color:c, roughness:r==null?.6:r, metalness:0},o||{}));
/* ---------- un personnage : « enfant » (garçon) ou « oustaz » (jeune adulte, barbe courte) ---------- */
function buildCharacter(kind, style, skin, seed){
  const A=kind==="oustaz", C={kind, seed:seed||0, style:null, skin:null}, root=new T.Group();
  const robeTex=tex(embroideryCanvas(STYLES[style]||STYLES.indigo)), kufiTex=tex(kufiCanvas(STYLES[style]||STYLES.indigo)); kufiTex.wrapS=T.RepeatWrapping; kufiTex.repeat.set(2,1);
  const skinM=M((SKINS[skin]||SKINS.fonce).c,.52), dark=M("#16100C",.4), white=M("#FBFBF8",.25), iris=M("#3B2416",.3), lip=M("#3E2016",.6), mouthIn=M("#2A0F0E",.8), tongue=M("#B8605A",.7), hair=M("#14100D",.9);
  const robe=new T.MeshStandardMaterial({map:robeTex, roughness:.85, side:T.DoubleSide}), kufi=M("#FFFFFF",.75,{map:kufiTex}), kufiTop=M((STYLES[style]||STYLES.indigo).kufi,.75);
  C.mats={skinM, robeTex, kufiTex, kufiTop};
  /* corps : cloche drapée (assis en tailleur) ; l'adulte est plus grand, aux épaules plus larges */
  const H=A?1.32:1, Wd=A?1.22:1;
  const prof=[[1.5,0],[1.48,.08],[1.34,.4],[1.12,.82],[.94,1.22],[.86,1.5],[.8,1.78],[.66,1.97],[.34,2.08],[.3,2.12]].map(([x,y])=>new T.Vector2(x*Wd,y*H));
  const body=new T.Mesh(new T.LatheGeometry(prof,72,Math.PI,Math.PI*2),robe); root.add(body);
  const torso=new T.Group(); root.add(torso);
  const neck=new T.Mesh(new T.CylinderGeometry(.24*Wd,.28*Wd,.4,24),skinM); neck.position.y=2.2*H; torso.add(neck);
  const head=new T.Group(); head.position.y=2.2*H+(A?.68:.75); torso.add(head);
  const hs=A?.84:1;   /* tête de l'adulte : un peu plus petite par rapport au corps, plus allongée */
  const skull=new T.Mesh(new T.SphereGeometry(.8*hs,48,40),skinM); skull.scale.set(1,A?1.12:1.04,.96); head.add(skull);
  [-1,1].forEach(k=>{ const ear=new T.Mesh(new T.SphereGeometry(.17*hs,20,16),skinM); ear.scale.set(.5,1,.8); ear.position.set(.78*hs*k,-.02,0); head.add(ear); });
  if(!A){ const cheekM=M("#7A4430",.6,{transparent:true,opacity:.35}); [-1,1].forEach(k=>{ const ch=new T.Mesh(new T.SphereGeometry(.14,16,12),cheekM); ch.scale.set(1,.6,.3); ch.position.set(.42*k,-.2,.66); head.add(ch); }); }
  const eyeS=A?.78:1, eyes=[]; [-1,1].forEach(k=>{ const eg=new T.Group(); eg.position.set(.28*hs*k,.06*hs+(A?.05:0),.62*hs); head.add(eg);
    const w=new T.Mesh(new T.SphereGeometry(.19*eyeS,32,24),white); w.scale.set(1,1.12,.55); eg.add(w);
    const ir=new T.Mesh(new T.SphereGeometry(.115*eyeS,28,20),iris); ir.scale.set(1,1.08,.4); ir.position.z=.075*eyeS; eg.add(ir);
    const pu=new T.Mesh(new T.SphereGeometry(.062*eyeS,20,14),dark); pu.scale.set(1,1,.4); pu.position.z=.105*eyeS; eg.add(pu);
    const hl=new T.Mesh(new T.SphereGeometry(.03*eyeS,12,10),white); hl.position.set(.035*eyeS,.045*eyeS,.125*eyeS); eg.add(hl);
    const lid=new T.Mesh(new T.SphereGeometry(.2*eyeS,32,16,0,Math.PI*2,0,Math.PI/2),skinM); lid.scale.set(1.02,1.14,.6); lid.rotation.x=-1.25; eg.add(lid);
    eyes.push({g:eg, ir, pu, hl, lid, s:eyeS}); });
  const brows=[]; [-1,1].forEach(k=>{ const b=new T.Mesh(new T.CapsuleGeometry(A?.038:.03,.16*hs,4,8),dark); b.rotation.z=Math.PI/2+.12*k; b.position.set(.28*hs*k,.33*hs+(A?.07:0),.66*hs); head.add(b); brows.push({m:b,k,y:b.position.y}); });
  const nose=new T.Mesh(new T.SphereGeometry(.09*hs,20,16),M("#4E321F",.5)); nose.scale.set(1.15,A?1:.8,.8); nose.position.set(0,-.1*hs,.76*hs); head.add(nose);
  const mouth=new T.Group(); mouth.position.set(0,-.33*hs,.7*hs); head.add(mouth);
  const inner=new T.Mesh(new T.SphereGeometry(.12*hs,24,16),mouthIn); inner.scale.set(1.25,.1,.45); mouth.add(inner);
  const tng=new T.Mesh(new T.SphereGeometry(.07*hs,16,12),tongue); tng.scale.set(1.3,.5,.5); tng.position.set(0,-.03,.01); mouth.add(tng);
  const smile=new T.Mesh(new T.TorusGeometry(.12*hs,.017,8,24,Math.PI),lip); smile.rotation.z=Math.PI; smile.position.y=.03; mouth.add(smile);
  if(A){ /* barbe courte et moustache, bien taillées (jeune oustaz) */
    const beard=new T.Mesh(new T.SphereGeometry(.81*hs,40,24,Math.PI*.12,Math.PI*.76,Math.PI*.66,Math.PI*.26),hair); beard.scale.set(1.02,1.14,1.0); head.add(beard);
    const must=new T.Mesh(new T.CapsuleGeometry(.035,.2,4,8),hair); must.rotation.z=Math.PI/2; must.position.set(0,-.22*hs,.73*hs); head.add(must); C.must=must; }
  const kg=new T.Group(); kg.position.set(0,.5*hs+(A?.08:0),-.05); kg.rotation.x=-.12; head.add(kg);
  const kb=new T.Mesh(new T.CylinderGeometry(.66*hs,.72*hs,.46*hs,48,1,true),kufi); kb.position.y=.12*hs; kg.add(kb);
  const kt=new T.Mesh(new T.CylinderGeometry(.66*hs,.66*hs,.04,48),kufiTop); kt.position.y=.35*hs; kg.add(kt);
  /* bras : manches larges, mains, index (montrer) ; pivot à l'épaule */
  const arms=[]; [-1,1].forEach(k=>{ const sh=new T.Group(); sh.position.set(.7*Wd*k,1.9*H,.05); torso.add(sh);
    const sl=new T.Mesh(new T.CylinderGeometry(.2*Wd,.46*Wd,1.05*H,28,1,true),robe); sl.position.y=-.5*H; sh.add(sl);
    const hand=new T.Mesh(new T.SphereGeometry(.16*Wd,24,18),skinM); hand.scale.set(1,.9,.8); hand.position.y=-1.08*H; sh.add(hand);
    const finger=new T.Mesh(new T.CapsuleGeometry(.045*Wd,.16,4,8),skinM); finger.position.set(0,-1.28*H,0); finger.visible=false; sh.add(finger);
    arms.push({sh,hand,finger,k}); });
  /* ombre douce au sol */
  const sh=new T.Mesh(new T.PlaneGeometry(4.2*Wd,3.2*Wd),new T.MeshBasicMaterial({map:SH(), transparent:true, depthWrite:false})); sh.rotation.x=-Math.PI/2; sh.position.y=.01; root.add(sh);
  Object.assign(C,{root,body,torso,head,eyes,brows,mouth,inner,tongue:tng,smile,arms,H,Wd,hs});
  setLook(C, style, skin); return C; }
let shadowTex=null; const SH=()=>shadowTex||(shadowTex=tex(shadowCanvas()));
function setLook(C, style, skin){ if(style&&STYLES[style]&&C.style!==style){ C.style=style; const s=STYLES[style]; C.mats.robeTex.image=embroideryCanvas(s); C.mats.robeTex.needsUpdate=true; C.mats.kufiTex.image=kufiCanvas(s); C.mats.kufiTex.needsUpdate=true; C.mats.kufiTop.color.set(s.kufi); }
  if(skin&&SKINS[skin]&&C.skin!==skin){ C.skin=skin; C.mats.skinM.color.set(SKINS[skin].c); } }
/* ---------- la vie d'un personnage à l'instant t ----------
   p = {mouth 0..1, speak, since (s depuis le début de la phrase), point 0..1, side ±1, open 0..1, rock, look:{x,y} cible du regard, listen (écoute un autre)} */
function poseCharacter(C, t, p){ p=p||{}; const sd=C.seed*17.3, m=cl(p.mouth||0,0,1);
  /* bouche : ouverture sur la voix, forme qui change selon les syllabes (plus large / plus ronde) */
  const syl=Math.floor((t+sd)*6.5), wide=.85+.45*rnd(syl+C.seed*31);
  C.inner.scale.set(1.15*wide+m*.2, .1+m*(.55+.25*(1.2-wide)), .45); C.inner.position.y=-.02-m*.035; C.tongue.visible=m>.3; C.smile.position.y=.03+m*.02; C.smile.scale.set(1-m*.25,1-m*.6,1);
  /* clignements toutes les 3 à 5 s, parfois doubles */
  const per=3.4+rnd(Math.floor((t+sd)/4)+C.seed)*1.8, ph=(t+sd)%per, b1=ph<.13?1-Math.abs(ph-.065)/.065:0, b2=rnd(Math.floor((t+sd)/per)+5)>.75&&ph>.22&&ph<.35?1-Math.abs(ph-.285)/.065:0, bl=Math.max(b1,cl(b2,0,1));
  C.eyes.forEach(e=>{ e.lid.rotation.x=-1.25+bl*1.3; });
  /* regard : la cible donnée, sinon il se promène (caméra, tablette, livre), avec de petits mouvements d'œil */
  let lx=0, ly=0; if(p.look){ lx=p.look.x; ly=p.look.y; } else { const gi=Math.floor((t+sd)/2.7), r=rnd(gi*3+C.seed), q=sm(((t+sd)%2.7)/.25), tg=r<.58?[0,0]:r<.82?[(p.side||1)*.9,.25]:[0,-.7], pr=rnd((gi-1)*3+C.seed), tp=pr<.58?[0,0]:pr<.82?[(p.side||1)*.9,.25]:[0,-.7]; lx=tp[0]+(tg[0]-tp[0])*q; ly=tp[1]+(tg[1]-tp[1])*q; }
  /* montrer : sur le côté, ou vers le haut quand le texte est au-dessus (format téléphone) — p.up de 0 (côté) à 1 (en haut) ; le regard suit */
  const pt=cl(p.point||0,0,1), up=cl(p.up||0,0,1); lx=lx*(1-pt)+(p.side||1)*pt*(1-.55*up); ly=ly*(1-pt)+(.2+.6*up)*pt;
  const jx=Math.sin(t*7.3+sd)*.004, jy=Math.cos(t*6.1+sd)*.003;
  C.eyes.forEach(e=>{ const s=e.s, ex=lx*.035*s+jx, ey=ly*.03*s+jy; e.ir.position.x=ex; e.ir.position.y=ey; e.pu.position.x=ex*1.1; e.pu.position.y=ey*1.1; e.hl.position.x=.035*s+ex; });
  /* sourcils : levés quand la voix s'élève, attentifs quand il écoute */
  C.brows.forEach(b=>{ b.m.position.y=b.y+m*.035+(p.listen?.02:0)+(p.speak?.008*Math.sin(t*3+b.k):0); b.m.rotation.z=Math.PI/2+.12*b.k-(m*.08+(p.listen?.05:0))*b.k; });
  /* tête : suit le regard, hoche au début des phrases, bouge avec la voix */
  const since=p.since==null?9:p.since, nod=since<.6?Math.sin(since/.6*Math.PI)*.11:0;
  C.head.rotation.y=lx*.32+Math.sin(t*.45+sd)*.07; C.head.rotation.x=.04-ly*.18+nod-m*.04+Math.sin(t*2.3+sd)*m*.02; C.head.rotation.z=Math.sin(t*.33+sd)*.035+lx*.04;
  /* respiration ; balancement doux en récitant (comme à l'école coranique) */
  const br=Math.sin(t*1.6+sd)*.012, rk=p.rock?Math.sin(t*4.2+sd)*.045*(.4+.6*cl(m*2,0,1)):0;
  C.torso.position.y=br*2; C.torso.rotation.x=rk; C.torso.rotation.z=Math.sin(t*.27+sd)*.012; C.body.scale.set(1+br*.5,1+br,1+br*.5);
  /* gestes */
  const op=cl(p.open||0,0,1), page=cl(p.page||0,0,1);
  C.arms.forEach(a=>{ const toward=a.k===(p.side||1);
    let rz=-.1*a.k, rx=-.78+Math.sin(t*1.6+sd)*.01;
    if(toward&&pt>0){ const q=sm(pt); rz=a.k*(-.1+(1.12+1.3*up)*q); rx=-.78+(.05+.5*up)*q+Math.sin(t*1.3)*.03*q; }
    if(C.stick&&C.stick.parent===a.sh) C.stick.rotation.x=.22+1.15*(1-(toward?sm(pt):0));   /* au repos, le bâton est posé vers l'avant (il ne traverse pas la table) */
    else if(op>0){ const q=sm(op); rz=a.k*(-.1+.7*q); rx=-.78-.22*q+Math.sin(t*2.1+a.k)*.06*q; }
    else if(page>0&&a.k===-1){ const q=Math.sin(page*Math.PI); rz=a.k*(-.1-.35*q); rx=-.78-.25*q; }
    a.sh.rotation.z=rz; a.sh.rotation.x=rx; a.finger.visible=toward&&pt>.6&&!C.stick; }); }
/* ---------- décors 3D : table basse, porte-livre et Coran ; tablette d'élève (alluwa sur les genoux) ---------- */
function deskWithBook(scale){ const g=new T.Group(), wood=M("#8A5A33",.55), woodD=M("#5E3B20",.6), cover=M("#FFFFFF",.45,{map:tex(coverCanvas())}), page=M("#FFFFFF",.8,{map:tex(pageCanvas())});
  const top=new T.Mesh(new T.BoxGeometry(2.7,.12,1.05),wood); top.position.y=.62; g.add(top);
  [-1,1].forEach(k=>{ const leg=new T.Mesh(new T.BoxGeometry(.14,.6,.9),woodD); leg.position.set(1.15*k,.3,0); g.add(leg); });
  const rehal=new T.Group(); rehal.position.set(0,.68,-.05); g.add(rehal);
  [-1,1].forEach(k=>{ const p=new T.Mesh(new T.BoxGeometry(.9,.04,.62),woodD); p.rotation.x=.55*k; p.position.set(0,.18,.12*k); rehal.add(p); });
  const book=new T.Group(); book.position.set(0,.42,.12); book.rotation.x=-.55; rehal.add(book);
  [-1,1].forEach(k=>{ const cv=new T.Mesh(new T.BoxGeometry(.52,.03,.66),cover); cv.position.x=.27*k; cv.rotation.z=-.12*k; book.add(cv); const pg=new T.Mesh(new T.PlaneGeometry(.48,.62),page); pg.rotation.x=-Math.PI/2; pg.rotation.y=-.12*k; pg.position.set(.27*k,.025,0); book.add(pg); });
  const sh=new T.Mesh(new T.PlaneGeometry(3.6,1.8),new T.MeshBasicMaterial({map:SH(), transparent:true, depthWrite:false})); sh.rotation.x=-Math.PI/2; sh.position.y=.012; g.add(sh);
  if(scale) g.scale.setScalar(scale); return g; }
function lapBoard(){ const g=new T.Group(), w=M("#E2C792",.6), f=M("#9C6A3A",.6); const b=new T.Mesh(new T.BoxGeometry(1.0,.05,1.3),w); g.add(b); const tb=new T.Mesh(new T.BoxGeometry(.3,.05,.22),f); tb.position.set(0,0,-.72); g.add(tb); return g; }
function lights(scene){ scene.add(new T.HemisphereLight(0xFFF1DC,0x3A2A22,1.35)); const key=new T.DirectionalLight(0xFFF4E2,2.6); key.position.set(-3,5,6); scene.add(key);
  const fill=new T.DirectionalLight(0xBFD8FF,.65); fill.position.set(4,2,4); scene.add(fill); const rim=new T.DirectionalLight(0xFFD49A,1.6); rim.position.set(2,4,-5); scene.add(rim); }
/* bâton de maître (demande de l'utilisateur : « donne-lui un bâton ») : tenu dans la main qui montre, bois clair et pointe dorée pour bien se voir */
function addStick(C, len){ const g=new T.Group(), H=C.H||1, wood=M("#7A4A22",.55), tip=M("#F2C46B",.35);
  const rod=new T.Mesh(new T.CylinderGeometry(.03,.036,len,10),wood); rod.position.y=-len/2; g.add(rod);
  const end=new T.Mesh(new T.SphereGeometry(.05,12,10),tip); end.position.y=-len; g.add(end);
  g.position.set(0,-1.04*H,0); g.rotation.x=.22; C.arms[1].sh.add(g); C.stick=g; return g; }
function buildSolo(){ const scene=new T.Scene(); lights(scene); const kid=buildCharacter("enfant","indigo","fonce",0); addStick(kid,1.05); scene.add(kid.root); const desk=deskWithBook(); desk.position.set(0,0,1.35); scene.add(desk);
  return {scene, cam:new T.PerspectiveCamera(26,1,.1,100), cast:{kid}}; }
function buildDaara(){ const scene=new T.Scene(); lights(scene);
  const prof=buildCharacter("oustaz","blanc","fonce",3); prof.root.position.set(0,0,-1.2); scene.add(prof.root); const desk=deskWithBook(1.05); desk.position.set(0,0,.35); scene.add(desk);
  /* stick (pointeur) du maître, tenu dans la main qui montre la tablette */
  addStick(prof,1.4);
  const kids=[["ciel","fonce",-2.75,2.3,.42],["ivoire","moyen",-.95,3.45,.14],["sauge","fonce",1.95,3.0,-.32]].map(([st,sk,x,z,ry],i)=>{ const k=buildCharacter("enfant",st,sk,11+i); k.root.position.set(x,0,z); k.root.rotation.y=Math.PI+ry; k.root.scale.setScalar(.82); scene.add(k.root);
    const lb=lapBoard(); lb.position.set(0,.95,.85); lb.rotation.x=-.45; k.root.add(lb); return k; });
  return {scene, cam:new T.PerspectiveCamera(30,1,.1,100), cast:{prof, kids}}; }
/* ---------- rendu : une scène, une taille, l'instant t ----------
   solo  : p = pose de l'enfant ;  daara : p = {prof:{...}, kids:{...}} */
function render(w, h, t, p, opts){ if(!T) return null; w=Math.max(16,Math.round(w)); h=Math.max(16,Math.round(h)); opts=opts||{}; t=t||0;
  if(!R){ const c=document.createElement("canvas"); R=new T.WebGLRenderer({canvas:c, antialias:true, alpha:true, preserveDrawingBuffer:true, powerPreference:"high-performance"}); R.setPixelRatio(1); R.outputColorSpace=T.SRGBColorSpace; R.toneMapping=T.ACESFilmicToneMapping; R.toneMappingExposure=1.08; R.setClearColor(0x000000,0); }
  const kind=opts.scene==="daara"?"daara":"solo", S=SCENES[kind]||(SCENES[kind]=kind==="daara"?buildDaara():buildSolo());
  const cv=R.domElement; if(cv.width!==w||cv.height!==h) R.setSize(w,h,false);
  const a=w/h, cam=S.cam; cam.aspect=a;
  /* caméra vivante : rapprochement et rotation très lents (le décor 2D et la tablette restent fixes) */
  const orbit=Math.sin(t*.05)*.07, dolly=1+Math.sin(t*.037+1)*.035;
  if(kind==="solo"){ setLook(S.cast.kid, opts.style, opts.skin); poseCharacter(S.cast.kid, t, p||{});
    cam.fov=a<.8?30:26; const d=(a<.8?13.2:11.6)*dolly; cam.position.set(Math.sin(orbit)*d,3.4,Math.cos(orbit)*d); cam.lookAt(0,1.75,0); }
  else { p=p||{}; setLook(S.cast.prof, opts.style||"blanc", opts.skin);
    poseCharacter(S.cast.prof, t, Object.assign({side:1}, p.prof||{}));
    S.cast.kids.forEach((k,i)=>poseCharacter(k, t+i*1.7, Object.assign({look:{x:0,y:.15}, rock:true}, p.kids||{}, {mouth:(p.kids&&p.kids.mouth||0)*(.75+.25*rnd(i+Math.floor(t*5)))})));
    cam.fov=a<.8?40:31; const d=(a<.8?15:13.5)*dolly; cam.position.set(Math.sin(orbit)*d,5.3,Math.cos(orbit)*d+1.5); cam.lookAt(0,1.95,0); }
  cam.updateProjectionMatrix(); R.render(S.scene,cam); return cv; }
window.SP_AVATAR={version:2, styles:STYLES, skins:SKINS, load, render, ready:()=>!!T};
})();
