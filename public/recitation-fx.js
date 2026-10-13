/* Studio Prompt : moteur d'image de « Garder la voix, refaire l'image » (récitations, lectures).
   Habillages premium dessinés et animés à la volée (aucune image externe) : livre ancien, nuit sacrée, arabesque d'or, néon doré,
   aube paisible, noir et or, rouleau qui défile. Le texte vient TOUJOURS d'une source fournie (jamais inventé) ; il n'est jamais modifié.
   Même moteur pour l'aperçu, la vidéo et l'écran de direct (OBS, TikTok Live Studio). */
(function(){
"use strict";
const PI=Math.PI, cl=(v,a,b)=>Math.max(a==null?0:a,Math.min(b==null?1:b,v)), ease=p=>1-Math.pow(1-cl(p),3), easeIO=p=>{ p=cl(p); return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2; };
const rnd=i=>{ const x=Math.sin(i*127.1+311.7)*43758.5453; return x-Math.floor(x); };
const AR='"Amiri Quran","Amiri","Scheherazade New","Noto Naskh Arabic","Traditional Arabic",serif', AR_T='"Aref Ruqaa","Amiri","Noto Naskh Arabic",serif', LAT='"Cormorant Garamond",Georgia,"Times New Roman",serif', KID='"Baloo 2","Trebuchet MS","Segoe UI",sans-serif', SANS='"Hanken Grotesk","Segoe UI",Arial,sans-serif';   /* chiffres bien droits (miniatures) */
const DIG="٠١٢٣٤٥٦٧٨٩", arNum=n=>String(n).replace(/\d/g,d=>DIG[d]);
const rgba=(hex,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(hex); if(!m) return hex; const n=parseInt(m[1],16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; };
/* polices du texte coranique (libres, Google Fonts), essayées sur l'écriture uthmani complète (13 octobre) : toutes affichent
   les voyelles, les petites lettres et les signes d'arrêt. Reem Kufi est écartée (signes qui se chevauchent). k = taille relative, pour un rendu égal. */
const AR_FONTS={
  amiri:{nom:"Mushaf classique · Amiri Quran", css:'"Amiri Quran"', k:1},
  scheherazade:{nom:"Naskh très lisible · Scheherazade", css:'"Scheherazade New"', k:.98},
  naskh:{nom:"Naskh moderne · Noto Naskh", css:'"Noto Naskh Arabic"', k:.9},
  kufi:{nom:"Coufique moderne, très net sur téléphone · Noto Kufi", css:'"Noto Kufi Arabic"', w:"500", k:.8},
  harmattan:{nom:"Style d'Afrique de l'Ouest · Harmattan", css:'"Harmattan"', k:1.02},
  markazi:{nom:"Élégant · Markazi", css:'"Markazi Text"', w:"500", k:1.05},
  lateef:{nom:"Doux et aéré · Lateef", css:'"Lateef"', k:1.25}
};
const fontLoads={};
function loadFont(id){ const f=AR_FONTS[id], F=document.fonts; if(!f||!F||!F.load) return Promise.resolve(); return fontLoads[id]||(fontLoads[id]=F.load(`${f.w||"400"} 48px ${f.css}`,"بِسْمِ ٱللَّهِ").catch(()=>null)); }
/* chargement des polices avant de dessiner (sinon le texte arabe sortirait dans une police de secours) */
let fontsP=null;
function ready(){ if(fontsP) return fontsP; const F=document.fonts; if(!F||!F.load) return fontsP=Promise.resolve();
  fontsP=Promise.all(['64px "Amiri Quran"','700 40px "Amiri"','700 48px "Aref Ruqaa"','italic 500 30px "Cormorant Garamond"','500 30px "Cormorant Garamond"','700 30px "Cormorant Garamond"','600 30px "Baloo 2"'].map(f=>F.load(f,"بسم الله Ab").catch(()=>null))).then(()=>null); return fontsP; }

/* ---------- formes ornementales ---------- */
function star8(g,cx,cy,R,r){ g.beginPath(); for(let i=0;i<16;i++){ const a=-PI/2+i*PI/8, q=i%2?r:R; i?g.lineTo(cx+q*Math.cos(a),cy+q*Math.sin(a)):g.moveTo(cx+q*Math.cos(a),cy+q*Math.sin(a)); } g.closePath(); }
function mihrab(g,x,y,w,h){ const r=w/2, top=y+r*.9; g.beginPath(); g.moveTo(x,y+h); g.lineTo(x,top); g.bezierCurveTo(x,top-r*.55,x+w*.28,y+r*.1,x+w/2,y); g.bezierCurveTo(x+w*.72,y+r*.1,x+w,top-r*.55,x+w,top); g.lineTo(x+w,y+h); g.closePath(); }
function rrect(g,x,y,w,h,r){ r=Math.max(0,Math.min(r,w/2,h/2)); g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); }
/* rosace du numéro de verset (étoile à 8 branches et chiffres arabes) */
function ayahMark(g,cx,cy,s,n,col,ink){ g.save(); g.lineWidth=Math.max(1,s*.07); g.strokeStyle=col; star8(g,cx,cy,s,s*.78); g.stroke(); g.beginPath(); g.arc(cx,cy,s*.62,0,2*PI); g.stroke(); g.fillStyle=ink; g.font=`700 ${Math.round(s*.72)}px ${AR}`; g.textAlign="center"; g.textBaseline="middle"; g.fillText(arNum(n),cx,cy+s*.06); g.restore(); }
/* motif géométrique islamique (étoiles à 8 branches entrelacées) sur une zone */
function girih(g,W,H,s,col,lw){ g.save(); g.strokeStyle=col; g.lineWidth=lw; for(let y=-s;y<H+s;y+=s) for(let x=-s;x<W+s;x+=s){ const cx=x+((Math.round(y/s)%2)?s/2:0), cy=y; star8(g,cx,cy,s*.5,s*.36); g.stroke(); g.beginPath(); g.rect(cx-s*.25,cy-s*.25,s*.5,s*.5); g.stroke(); g.save(); g.translate(cx,cy); g.rotate(PI/4); g.beginPath(); g.rect(-s*.25,-s*.25,s*.5,s*.5); g.stroke(); g.restore(); } g.restore(); }
/* silhouette de mosquée (dômes et minarets) */
function mosque(g,W,H,base,col,L){ g.save(); g.fillStyle=col; const cx=W/2, b=base; g.beginPath(); g.rect(cx-W*.32,b-H*.07,W*.64,H*.07+H); g.fill();
  const dome=(x,r,h)=>{ g.beginPath(); g.moveTo(x-r,b-h); g.bezierCurveTo(x-r,b-h-r*1.25,x+r,b-h-r*1.25,x+r,b-h); g.closePath(); g.fill(); g.fillRect(x-r,b-h,2*r,h); g.fillRect(x-1.5*L,b-h-r*1.25-14*L,3*L,16*L); };
  dome(cx,W*.13,H*.07); dome(cx-W*.22,W*.06,H*.06); dome(cx+W*.22,W*.06,H*.06);
  [-.36,.36].forEach(k=>{ const x=cx+W*k, w=W*.03, top=b-H*.34; g.fillRect(x-w/2,top,w,H); g.beginPath(); g.moveTo(x-w*.8,top); g.lineTo(x,top-w*2.4); g.lineTo(x+w*.8,top); g.closePath(); g.fill(); g.fillRect(x-w*.85,top+H*.1,w*1.7,4*L); });
  g.restore(); }

/* crête de montagnes (bruit déterministe, toujours la même) */
function ridge(g,W,H,base,amp,seed,col,step){ g.fillStyle=col; g.beginPath(); g.moveTo(0,H); for(let px=0;px<=W+step;px+=step){ const u=px/W, y=base-amp*(.55*Math.sin(u*PI*2.2+seed)+.3*Math.sin(u*PI*5.3+seed*2.1)+.15*Math.sin(u*PI*11+seed*3.7)+.14*(rnd(Math.floor(px/step)+seed*100)-.5)); g.lineTo(px,y); } g.lineTo(W,H); g.closePath(); g.fill(); }
function pine(g,x,y,h,col,snow){ const w=h*.42; for(let k=0;k<3;k++){ const ty=y-h+k*h*.26, bw=w*(.55+k*.22); g.fillStyle=col; g.beginPath(); g.moveTo(x,ty); g.lineTo(x-bw,ty+h*.42); g.lineTo(x+bw,ty+h*.42); g.closePath(); g.fill();
  if(snow){ g.fillStyle=snow; g.beginPath(); g.moveTo(x,ty); g.lineTo(x-bw*.5,ty+h*.21); g.lineTo(x-bw*.1,ty+h*.17); g.lineTo(x+bw*.35,ty+h*.2); g.closePath(); g.fill(); } } g.fillStyle=col; g.fillRect(x-w*.08,y-h*.1,w*.16,h*.12); }
function moonFull(g,x,y,r){ const halo=g.createRadialGradient(x,y,r*.9,x,y,r*2.8); halo.addColorStop(0,"rgba(215,228,255,.38)"); halo.addColorStop(1,"rgba(215,228,255,0)"); g.fillStyle=halo; g.fillRect(x-r*2.8,y-r*2.8,r*5.6,r*5.6);
  const body=g.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r); body.addColorStop(0,"#FFFFFF"); body.addColorStop(1,"#D6DFF2"); g.fillStyle=body; g.beginPath(); g.arc(x,y,r,0,2*PI); g.fill();
  g.save(); g.beginPath(); g.arc(x,y,r,0,2*PI); g.clip(); for(let i=0;i<28;i++){ const a=rnd(i+300)*2*PI, d=Math.sqrt(rnd(i+340))*r*.85, cr=r*(.04+rnd(i+380)*.14); g.fillStyle=`rgba(118,132,170,${.08+rnd(i+420)*.12})`; g.beginPath(); g.arc(x+Math.cos(a)*d,y+Math.sin(a)*d,cr,0,2*PI); g.fill(); } g.restore(); }
/* silhouette de dos, assise, les mains levées (invocation) : une forme générique, jamais une personne réelle */
function priant(g,x,y,s,col){ g.save(); g.translate(x,y); g.scale(s,s); g.fillStyle=col; g.strokeStyle=col; g.lineCap="round";
  g.beginPath(); g.arc(0,-64,11,0,2*PI); g.fill();
  g.beginPath(); g.moveTo(-14,-52); g.quadraticCurveTo(0,-57,14,-52); g.lineTo(22,-30); g.quadraticCurveTo(34,-6,42,0); g.lineTo(-42,0); g.quadraticCurveTo(-34,-6,-22,-30); g.closePath(); g.fill();
  g.lineWidth=7; [-1,1].forEach(k=>{ g.beginPath(); g.moveTo(13*k,-48); g.quadraticCurveTo(27*k,-52,28*k,-70); g.stroke(); g.beginPath(); g.ellipse(29*k,-77,4.5,8.5,k*.22,0,2*PI); g.fill(); }); g.restore(); }
function puff(g,x,y,w,col){ g.fillStyle=col; [[-.32,0,.2],[-.12,-.12,.26],[.12,-.08,.24],[.32,.02,.18],[0,.04,.22]].forEach(([dx,dy,r])=>{ g.beginPath(); g.arc(x+dx*w,y+dy*w,r*w,0,2*PI); g.fill(); }); }
function butterfly(g,x,y,s,flap,c1,c2){ g.save(); g.translate(x,y); const f=.3+.7*Math.abs(Math.sin(flap)); [-1,1].forEach(k=>{ g.save(); g.scale(k*f,1); g.fillStyle=c1; g.beginPath(); g.ellipse(s*.55,-s*.25,s*.55,s*.42,-.5,0,2*PI); g.fill(); g.fillStyle=c2; g.beginPath(); g.ellipse(s*.42,s*.3,s*.36,s*.3,.4,0,2*PI); g.fill(); g.restore(); }); g.fillStyle="#3A2A40"; g.beginPath(); g.ellipse(0,0,s*.08,s*.45,0,0,2*PI); g.fill(); g.restore(); }
function flower(g,x,y,r,col){ g.fillStyle=col; for(let i=0;i<5;i++){ const a=i*2*PI/5; g.beginPath(); g.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,r*.75,0,2*PI); g.fill(); } g.fillStyle="#FFD93B"; g.beginPath(); g.arc(x,y,r*.6,0,2*PI); g.fill(); }
const easeBack=p=>{ p=cl(p); const c1=1.70158, c3=c1+1; return 1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2); };

/* ---------- habillages ---------- */
const THEMES={
  livre:{nom:"Livre ancien",desc:"Un mushaf posé sur du cuir : pages qui tournent, cadre doré, caméra qui change d'angle."},
  nuit:{nom:"Nuit sacrée",desc:"Ciel étoilé, croissant lumineux, silhouette de mosquée, nuages qui passent."},
  arabesque:{nom:"Arabesque d'or",desc:"Motifs géométriques islamiques dorés, reflet qui les parcourt, cadre en arc de mihrab."},
  neon:{nom:"Néon doré",desc:"Arc de mihrab en néon doré qui se dessine, particules de lumière."},
  aube:{nom:"Aube paisible",desc:"Ciel du lever du jour, rayons du soleil, brume légère."},
  minimal:{nom:"Noir et or",desc:"Minimal et luxueux : filets d'or, grand numéro du verset en filigrane, grain."},
  rouleau:{nom:"Rouleau qui défile",desc:"Un parchemin où les versets défilent comme les lignes d'un livre ; le verset récité est en or."},
  paysage:{nom:"Montagnes et lac",desc:"Paysage de cinéma au soleil couchant : montagnes, reflets dans le lac, nuages et oiseaux qui passent."},
  foret:{nom:"Forêt sous la neige",desc:"Nuit d'hiver : sapins enneigés, lune, neige qui tombe doucement."},
  lune:{nom:"Pleine lune",desc:"Grande lune, nuages qui passent, silhouette en invocation sur la colline. Pour méditer et dormir."},
  kaaba:{nom:"Kaaba · nuit",desc:"La Kaaba stylisée sous un ciel profond, cour lumineuse et lanternes dorées."},
  medine:{nom:"Médine · aube",desc:"Dômes et minarets inspirés de Médine dans une lumière verte et dorée."},
  desert:{nom:"Désert étoilé",desc:"Dunes calmes, voie lactée, lune fine et poussière de lumière."},
  lofi:{nom:"Chambre calme",desc:"Ambiance « lofi » : fenêtre de nuit sous la pluie, lampe chaude, plante. Pour étudier ou dormir."},
  daara:{nom:"Daara · oustaz et talibés",desc:"Un jeune oustaz enseigne à sa table ; ses talibés répètent après lui. Le verset s'écrit sur la grande tablette en bois."},
  enseignant:{nom:"Enseignant · avatar 3D",desc:"Un garçon en boubou moderne enseigne, assis à sa table ; le verset s'écrit sur sa tablette en bois (alluwa) et ses lèvres suivent la voix."},
  enfants:{nom:"Enfants",desc:"Dessin animé joyeux : soleil, collines, fleurs, papillons, texte dans une grande carte. Pour apprendre."}
};

/* Studio d'effets islamique : une sélection courte, cohérente et lisible. Ces réglages sont utilisés par le même
   moteur dans l'aperçu, l'export MP4 et l'écran de direct afin que le rendu et le minutage restent identiques. */
const FX={
  subtitles:{
    mushaf:{nom:"Mushaf classique",desc:"Écriture uthmani claire, or discret et traduction sobre."},
    royal:{nom:"Or royal",desc:"Dégradé d'or, léger relief et halo chaud."},
    emerald:{nom:"Néon émeraude",desc:"Lueur verte premium avec progression lumineuse sur la récitation."},
    mihrab:{nom:"Verre de mihrab",desc:"Panneau translucide, filet doré et texte très lisible."},
    moon:{nom:"Lune argentée",desc:"Blanc lunaire, bleu nuit et reflet froid."},
    ivory:{nom:"Ivoire calligraphique",desc:"Ivoire et encre brune, inspiré d'une page enluminée."}
  },
  transitions:{
    precise:{nom:"Coupe précise",desc:"Le nouveau passage apparaît exactement au timecode, sans fondu."},
    sacred_fade:{nom:"Fondu sacré",desc:"Fondu court sans retarder la lecture."},
    light:{nom:"Voile de lumière",desc:"Le passage est révélé par une lueur dorée."},
    rtl:{nom:"Révélation arabe",desc:"Ouverture douce de droite à gauche."},
    zoom:{nom:"Souffle cinématique",desc:"Très léger zoom et mise au point."},
    page:{nom:"Page de mushaf",desc:"Passage comme une page qui se tourne."}
  },
  palettes:{
    theme:{nom:"Couleurs du décor",desc:"La palette naturelle de l'habillage choisi."},
    emerald_gold:{nom:"Émeraude et or",desc:"Vert profond, ivoire et or lumineux."},
    black_gold:{nom:"Noir et or",desc:"Contraste luxueux et très lisible."},
    sapphire:{nom:"Saphir sacré",desc:"Bleu profond, argent et or pâle."},
    moonlight:{nom:"Clair de lune",desc:"Bleu nuit, blanc et reflets argentés."},
    sand:{nom:"Sable et ivoire",desc:"Teintes chaudes de parchemin et cuivre."}
  },
  animations:{
    none:{nom:"Stable",desc:"Aucun mouvement : priorité absolue à la lecture."},
    rise:{nom:"Élévation douce",desc:"Le passage monte de quelques pixels en apparaissant."},
    focus:{nom:"Mise au point",desc:"Un flou très court devient parfaitement net."},
    glow:{nom:"Éclat doré",desc:"Halo lumineux bref au début de chaque passage."},
    breathe:{nom:"Respiration",desc:"Micro-zoom calme, sans mouvement brusque."},
    reveal:{nom:"Calligraphie révélée",desc:"Le texte se révèle dans son sens de lecture."}
  },
  effects:{
    aucune:{nom:"Aucun effet",desc:"Décor seul, calme maximal."},
    poussiere_doree:{nom:"Poussière dorée",desc:"Particules d'or lentes et discrètes."},
    ciel_etoile:{nom:"Étoiles",desc:"Scintillement fin dans le ciel."},
    lucioles:{nom:"Lucioles",desc:"Petites lumières chaudes qui s'élèvent."},
    brume:{nom:"Brume douce",desc:"Voiles très lents derrière le texte."},
    rayons_soleil:{nom:"Rayons célestes",desc:"Rayons doux, sans flash."},
    anneaux_neon:{nom:"Arcs néon",desc:"Anneaux lumineux modernes et élégants."},
    nuages:{nom:"Nuages lents",desc:"Nuages légers qui traversent le décor."}
  }
};
const SUB_STYLE={
  mushaf:{karaoke:true},
  royal:{ink:"#FFF4C2",ink2:"#F2DEAB",gold:"#F5C85B",active:"#FFFFFF",stroke:"#6B4300",glow:"rgba(245,200,91,.75)",karaoke:true},
  emerald:{ink:"#EFFFF7",ink2:"#CDEBDD",gold:"#58E6A9",active:"#FFFFFF",stroke:"#063D2B",glow:"rgba(40,255,164,.85)",karaoke:true,panel:"neon"},
  mihrab:{ink:"#FFFFFF",ink2:"#EDE7D6",gold:"#E7C66C",active:"#FFF6C8",stroke:"rgba(20,12,0,.8)",glow:"rgba(231,198,108,.55)",karaoke:true,panel:"glass"},
  moon:{ink:"#F7FAFF",ink2:"#D5E3FA",gold:"#CFE1FF",active:"#FFFFFF",stroke:"#142A52",glow:"rgba(150,195,255,.75)",karaoke:true},
  ivory:{ink:"#4A2E16",ink2:"#765C3B",gold:"#B88731",active:"#7A4A12",stroke:"rgba(255,247,220,.75)",glow:"rgba(255,225,155,.35)",karaoke:true,panel:"ivory"}
};
const PAL_STYLE={
  emerald_gold:{ink:"#F3FFF8",ink2:"#CDE9D7",gold:"#E7C768",active:"#FFFFFF",stroke:"#052E22",glow:"rgba(46,220,145,.65)",acc:"#31C48D",acc2:"#052E22"},
  black_gold:{ink:"#FFF8DD",ink2:"#D9CDAA",gold:"#F0C75E",active:"#FFFFFF",stroke:"#050505",glow:"rgba(240,199,94,.7)",acc:"#D4AF37",acc2:"#090909"},
  sapphire:{ink:"#F7FAFF",ink2:"#D7E2F5",gold:"#E5C978",active:"#FFFFFF",stroke:"#081A3A",glow:"rgba(80,145,255,.6)",acc:"#4D8DFF",acc2:"#081A3A"},
  moonlight:{ink:"#FFFFFF",ink2:"#DCE8FA",gold:"#D8E6FF",active:"#FFFFFF",stroke:"#111D3B",glow:"rgba(175,205,255,.7)",acc:"#A9C9FF",acc2:"#0B1636"},
  sand:{ink:"#FFF9EA",ink2:"#E8D7B7",gold:"#E0AD58",active:"#FFFFFF",stroke:"#513018",glow:"rgba(230,170,90,.55)",acc:"#D79A48",acc2:"#3B2416"}
};

/* o = {fmt, K, theme, items:[{kind:"titre"|"basmala"|"verset", n, ar, tr, a, b}], sourate:{ar, nom}, recitant, showTr, total} */
function stage(o){
  const V=o.fmt==="9:16", Q=o.fmt==="1:1", W=V?720:Q?720:1280, H=V?1280:720, K=o.K||1, L=Math.min(W,H)/720, T=THEMES[o.theme]?o.theme:"nuit";
  const AF=AR_FONTS[o.font]||AR_FONTS.amiri;   /* police du texte coranique choisie */
  const SUB=SUB_STYLE[o.subtitle]?o.subtitle:"mushaf", TR=FX.transitions[o.transition]?o.transition:"precise", AN=FX.animations[o.animation]?o.animation:"rise", EFF=FX.effects[o.effect]?o.effect:"aucune", PAL=PAL_STYLE[o.palette]?o.palette:"theme", SYNC=cl(Number(o.syncOffset)||0,-1,1);
  const c=document.createElement("canvas"); c.width=Math.round(W*K); c.height=Math.round(H*K); const g=c.getContext("2d");
  const items=(o.items||[]).slice().sort((a,b)=>a.a-b.a), total=o.total||((items[items.length-1]||{}).b)||0, showTr=o.showTr!==false;
  const off=(w,h)=>{ const x=document.createElement("canvas"); x.width=Math.round(w*K); x.height=Math.round(h*K); const xg=x.getContext("2d"); xg.setTransform(K,0,0,K,0,0); return [x,xg]; };
  /* palette du texte selon l'habillage */
  const baseP={livre:{ink:"#3B2410",ink2:"#6B4A23",gold:"#B8860B",glow:"rgba(255,230,170,.0)"},nuit:{ink:"#FFF8E7",ink2:"#E9DDBA",gold:"#E8C46A",glow:"rgba(232,196,106,.55)"},arabesque:{ink:"#FFF6DC",ink2:"#E7D8A8",gold:"#D4AF37",glow:"rgba(212,175,55,.45)"},
    neon:{ink:"#FFFFFF",ink2:"#F3E3B0",gold:"#FFC94D",glow:"rgba(255,201,77,.75)"},aube:{ink:"#FFFFFF",ink2:"#FFF1DC",gold:"#FFD27A",glow:"rgba(80,40,10,.45)"},minimal:{ink:"#F6EFE0",ink2:"#CFC3A6",gold:"#C9A24A",glow:"rgba(0,0,0,0)"},rouleau:{ink:"#3B2410",ink2:"#7A5A30",gold:"#9C6B12",glow:"rgba(0,0,0,0)"},
    paysage:{ink:"#FFFFFF",ink2:"#F3F1EA",gold:"#FFD98A",glow:"rgba(8,12,28,.8)"},foret:{ink:"#FFFFFF",ink2:"#E2EAF8",gold:"#F7DFA0",glow:"rgba(4,8,26,.8)"},lune:{ink:"#FFFFFF",ink2:"#D9E3F7",gold:"#F2E2B0",glow:"rgba(140,170,255,.45)"},kaaba:{ink:"#FFF9E8",ink2:"#E8D9B3",gold:"#E5BC62",glow:"rgba(229,188,98,.55)"},medine:{ink:"#FFFDF4",ink2:"#DBEBDD",gold:"#E7C875",glow:"rgba(70,140,100,.55)"},desert:{ink:"#FFF8E8",ink2:"#ECD8BC",gold:"#FFD18A",glow:"rgba(255,190,110,.5)"},
    lofi:{ink:"#FFF3E0",ink2:"#F1DDC2",gold:"#F5B867",glow:"rgba(255,150,70,.4)"},enfants:{ink:"#3A2A70",ink2:"#4E3F86",gold:"#FF7A00",glow:"rgba(0,0,0,0)"},
    enseignant:{ink:"#2B1A0D",ink2:"#5B3E22",gold:"#9A3C12",glow:"rgba(0,0,0,0)"},daara:{ink:"#2B1A0D",ink2:"#5B3E22",gold:"#9A3C12",glow:"rgba(0,0,0,0)"}}[T];
  const P=Object.assign({},baseP,SUB_STYLE[SUB]||{},PAL_STYLE[PAL]||{}); P.active=P.active||P.gold; P.stroke=P.stroke||"rgba(0,0,0,.65)"; P.acc=P.acc||P.gold; P.acc2=P.acc2||"#09111F";
  const ENS=T==="enseignant"||T==="daara";   /* habillages avec personnages 3D et tablette en bois */
  const PAPER=T==="livre"||T==="rouleau"||T==="enfants"||ENS;
  /* « Enseignant » : tablette en bois (alluwa) où s'écrit le texte, et place de l'avatar */
  const BOARD=T==="daara"?(V?{x:W*.07,y:H*.075,w:W*.86,h:H*.39}:Q?{x:W*.52,y:H*.07,w:W*.45,h:H*.56}:{x:W*.58,y:H*.08,w:W*.39,h:H*.66}):(V?{x:W*.07,y:H*.085,w:W*.86,h:H*.43}:Q?{x:W*.46,y:H*.08,w:W*.5,h:H*.66}:{x:W*.47,y:H*.09,w:W*.49,h:H*.72});
  const AVR=T==="daara"?(V?{x:-W*.04,y:H*.45,w:W*1.08,h:H*.6}:Q?{x:-W*.04,y:H*.28,w:W*.62,h:H*.76}:{x:-W*.02,y:H*.16,w:W*.62,h:H*.86}):(V?{x:W*.02,y:H*.5,w:W*.96,h:H*.54}:Q?{x:-W*.02,y:H*.24,w:W*.56,h:H*.82}:{x:-W*.01,y:H*.13,w:W*.52,h:H*.94});
  /* zone du texte selon l'habillage et le format */
  const box=ENS?{x:BOARD.x+BOARD.w*.07,y:BOARD.y+BOARD.h*.2,w:BOARD.w*.86,h:BOARD.h*.68}:T==="lune"?(V?{x:W*.08,y:H*.22,w:W*.84,h:H*.44}:{x:W*.05,y:H*.2,w:W*.58,h:H*.58}):T==="enfants"?(V?{x:W*.13,y:H*.29,w:W*.74,h:H*.42}:{x:W*.19,y:H*.25,w:W*.62,h:H*.5}):T==="livre"?(V?{x:W*.17,y:H*.27,w:W*.66,h:H*.5}:{x:W*.55,y:H*.17,w:W*.33,h:H*.62}):T==="rouleau"?(V?{x:W*.13,y:H*.28,w:W*.74,h:H*.46}:{x:W*.22,y:H*.24,w:W*.56,h:H*.52}):T==="arabesque"||T==="neon"?(V?{x:W*.16,y:H*.3,w:W*.68,h:H*.48}:{x:W*.27,y:H*.3,w:W*.46,h:H*.5}):(V?{x:W*.08,y:H*.28,w:W*.84,h:H*.46}:{x:W*.1,y:H*.24,w:W*.8,h:H*.52});
  const band=(x,a)=>{ const dk=x.createLinearGradient(0,box.y-50*L,0,box.y+box.h+50*L); dk.addColorStop(0,"rgba(6,8,20,0)"); dk.addColorStop(.5,`rgba(6,8,20,${a})`); dk.addColorStop(1,"rgba(6,8,20,0)"); x.fillStyle=dk; x.fillRect(0,box.y-50*L,W,box.h+100*L); };
  function subtitlePanel(x,t){ const p=SUB_STYLE[SUB]||{}; if(!p.panel) return; const pad=(V?18:14)*L, bx=box.x-pad, by=box.y-pad, bw=box.w+pad*2, bh=box.h+pad*2; x.save();
    if(p.panel==="glass"){ x.shadowColor="rgba(0,0,0,.35)"; x.shadowBlur=28*L; rrect(x,bx,by,bw,bh,24*L); x.fillStyle="rgba(7,17,20,.48)"; x.fill(); x.shadowBlur=0; x.lineWidth=1.5*L; x.strokeStyle="rgba(247,220,145,.72)"; x.stroke(); }
    else if(p.panel==="neon"){ const pulse=.72+.28*Math.sin(t*1.8); rrect(x,bx,by,bw,bh,22*L); x.fillStyle="rgba(0,22,17,.38)"; x.fill(); x.lineWidth=2.2*L; x.strokeStyle=P.gold; x.shadowColor=P.glow; x.shadowBlur=18*L*pulse; x.stroke(); }
    else if(p.panel==="ivory"){ rrect(x,bx,by,bw,bh,18*L); x.fillStyle="rgba(255,246,218,.88)"; x.fill(); x.lineWidth=2*L; x.strokeStyle=P.gold; x.stroke(); for(let k=0;k<4;k++){ const px=k<2?bx+12*L:bx+bw-12*L, py=k%2?by+bh-12*L:by+12*L; star8(x,px,py,7*L,3.5*L); x.fillStyle=P.gold; x.fill(); } }
    x.restore(); }
  const WIN=V?{x:W*.12,y:H*.1,w:W*.76,h:H*.6}:{x:W*.2,y:H*.08,w:W*.6,h:H*.72};   /* fenêtre de la chambre calme */
  const MOON=V?{x:W*.5,y:H*.8,r:W*.3}:{x:W*.8,y:H*.6,r:H*.25};   /* pleine lune */
  /* ---- fond fixe (dessiné une seule fois) ---- */
  const [bg,bgx]=off(W,H);
  (function paintBg(x){
    if(T==="livre"){ let gr=x.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.hypot(W,H)/1.6); gr.addColorStop(0,"#5A3418"); gr.addColorStop(1,"#1A0C05"); x.fillStyle=gr; x.fillRect(0,0,W,H);
      x.globalAlpha=.06; for(let i=0;i<900;i++){ x.fillStyle=rnd(i)>.5?"#000":"#C08A4A"; x.fillRect(rnd(i+1)*W,rnd(i+2)*H,1.5*L,1.5*L); } x.globalAlpha=1;
      const pg=(px,py,pw,ph,sh)=>{ x.save(); x.shadowColor="rgba(0,0,0,.55)"; x.shadowBlur=40*L; x.shadowOffsetY=16*L; x.fillStyle="#EAD8AE"; x.fillRect(px,py,pw,ph); x.restore(); const p2=x.createLinearGradient(px,0,px+pw,0); p2.addColorStop(0,sh<0?"#D9C08A":"#F4E7C6"); p2.addColorStop(sh<0?.12:.88,"#F4E7C6"); p2.addColorStop(1,sh<0?"#F4E7C6":"#D9C08A"); x.fillStyle=p2; x.fillRect(px,py,pw,ph);
        x.strokeStyle="#B8860B"; x.lineWidth=3*L; x.strokeRect(px+18*L,py+18*L,pw-36*L,ph-36*L); x.lineWidth=1.2*L; x.strokeRect(px+26*L,py+26*L,pw-52*L,ph-52*L);
        [[px+26*L,py+26*L],[px+pw-26*L,py+26*L],[px+26*L,py+ph-26*L],[px+pw-26*L,py+ph-26*L]].forEach(([qx,qy])=>{ x.fillStyle="#B8860B"; star8(x,qx,qy,11*L,6*L); x.fill(); }); };
      if(V) pg(W*.1,H*.12,W*.8,H*.76,0); else { pg(W*.08,H*.1,W*.42,H*.8,-1); pg(W*.5,H*.1,W*.42,H*.8,1); const gu=x.createLinearGradient(W*.47,0,W*.53,0); gu.addColorStop(0,"rgba(0,0,0,0)"); gu.addColorStop(.5,"rgba(60,30,0,.35)"); gu.addColorStop(1,"rgba(0,0,0,0)"); x.fillStyle=gu; x.fillRect(W*.47,H*.1,W*.06,H*.8); }
      if(V){ const cb={x:W*.22,y:H*.15,w:W*.56,h:H*.07}; rrect(x,cb.x,cb.y,cb.w,cb.h,cb.h/2); x.fillStyle="rgba(184,134,11,.14)"; x.fill(); x.strokeStyle="#B8860B"; x.lineWidth=2*L; x.stroke(); }
      else { const lx=W*.08+30*L, lw=W*.42-60*L; [[H*.1+32*L],[H*.9-32*L-46*L]].forEach(([by])=>{ x.save(); x.beginPath(); x.rect(lx,by,lw,46*L); x.clip(); x.fillStyle="rgba(184,134,11,.10)"; x.fillRect(lx,by,lw,46*L); girih(x,W,H,46*L,"rgba(150,105,10,.55)",1.1*L); x.restore(); x.strokeStyle="#B8860B"; x.lineWidth=1.5*L; x.strokeRect(lx,by,lw,46*L); });
        const mx=W*.29, my=H*.5, mr=Math.min(lw,H*.5)*.42; x.save(); x.fillStyle="rgba(184,134,11,.08)"; star8(x,mx,my,mr*1.18,mr*.98); x.fill(); x.strokeStyle="#B8860B"; x.lineWidth=2*L; star8(x,mx,my,mr*1.18,mr*.98); x.stroke(); x.lineWidth=1.2*L; x.beginPath(); x.arc(mx,my,mr*.86,0,2*PI); x.stroke(); x.beginPath(); x.arc(mx,my,mr*.8,0,2*PI); x.stroke();
        for(let i=0;i<16;i++){ const a=i*PI/8; x.fillStyle="#B8860B"; x.beginPath(); x.arc(mx+Math.cos(a)*mr*1.02,my+Math.sin(a)*mr*1.02,2.2*L,0,2*PI); x.fill(); } x.restore(); } }
    else if(T==="nuit"){ const gr=x.createLinearGradient(0,0,0,H); gr.addColorStop(0,"#050A1F"); gr.addColorStop(.6,"#0B1A3A"); gr.addColorStop(1,"#13234A"); x.fillStyle=gr; x.fillRect(0,0,W,H);
      const mg=x.createRadialGradient(W*.78,H*.12,0,W*.78,H*.12,W*.35); mg.addColorStop(0,"rgba(255,236,180,.25)"); mg.addColorStop(1,"rgba(255,236,180,0)"); x.fillStyle=mg; x.fillRect(0,0,W,H);
      x.fillStyle="#FFF3CF"; x.beginPath(); x.arc(W*.78,H*.12,44*L,0,2*PI); x.fill(); x.fillStyle="#0A1636"; x.beginPath(); x.arc(W*.78+16*L,H*.12-8*L,40*L,0,2*PI); x.fill();
      mosque(x,W,H,H*.97,"#03060F",L); const fg=x.createLinearGradient(0,H*.8,0,H); fg.addColorStop(0,"rgba(3,6,15,0)"); fg.addColorStop(1,"rgba(3,6,15,.6)"); x.fillStyle=fg; x.fillRect(0,H*.8,W,H*.2); }
    else if(T==="arabesque"){ const gr=x.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.hypot(W,H)/1.7); gr.addColorStop(0,"#0F3B2E"); gr.addColorStop(1,"#03140F"); x.fillStyle=gr; x.fillRect(0,0,W,H); girih(x,W,H,96*L,"rgba(212,175,55,.22)",1.4*L);
      const fx=V?W*.1:W*.22, fw=V?W*.8:W*.56, fy=V?H*.14:H*.08, fh=V?H*.76:H*.86; x.save(); mihrab(x,fx,fy,fw,fh); x.fillStyle="rgba(2,18,12,.78)"; x.fill(); x.lineWidth=5*L; x.strokeStyle="#D4AF37"; x.stroke(); x.lineWidth=1.5*L; mihrab(x,fx+14*L,fy+20*L,fw-28*L,fh-34*L); x.stroke(); x.restore(); }
    else if(T==="neon"){ const gr=x.createRadialGradient(W/2,H*.45,0,W/2,H*.45,Math.hypot(W,H)/1.6); gr.addColorStop(0,"#1A1206"); gr.addColorStop(1,"#030201"); x.fillStyle=gr; x.fillRect(0,0,W,H); x.globalAlpha=.12; girih(x,W,H,120*L,"#FFC94D",1*L); x.globalAlpha=1; }
    else if(T==="aube"){ const gr=x.createLinearGradient(0,0,0,H); gr.addColorStop(0,"#1E2A5A"); gr.addColorStop(.45,"#C7577A"); gr.addColorStop(.72,"#F5A35C"); gr.addColorStop(1,"#FCE1A8"); x.fillStyle=gr; x.fillRect(0,0,W,H);
      const sg=x.createRadialGradient(W/2,H*.82,0,W/2,H*.82,W*.6); sg.addColorStop(0,"rgba(255,240,200,.9)"); sg.addColorStop(.25,"rgba(255,210,140,.45)"); sg.addColorStop(1,"rgba(255,210,140,0)"); x.fillStyle=sg; x.fillRect(0,0,W,H);
      [[.86,"rgba(120,60,90,.55)",.05],[.9,"rgba(80,40,70,.7)",.04],[.95,"rgba(40,20,40,.85)",.03]].forEach(([yy,col,amp],k)=>{ x.fillStyle=col; x.beginPath(); x.moveTo(0,H); for(let px=0;px<=W;px+=8) x.lineTo(px,H*yy-Math.sin(px/W*PI*(2+k)+k)*H*amp); x.lineTo(W,H); x.closePath(); x.fill(); });
      const dk=x.createLinearGradient(0,box.y-40*L,0,box.y+box.h+40*L); dk.addColorStop(0,"rgba(20,10,30,0)"); dk.addColorStop(.5,"rgba(20,10,30,.35)"); dk.addColorStop(1,"rgba(20,10,30,0)"); x.fillStyle=dk; x.fillRect(0,box.y-40*L,W,box.h+80*L); }
    else if(T==="minimal"){ x.fillStyle="#0B0A08"; x.fillRect(0,0,W,H); x.strokeStyle="#C9A24A"; x.lineWidth=1.2*L; [H*.16,H*.84].forEach(y=>{ x.beginPath(); x.moveTo(W*.2,y); x.lineTo(W*.8,y); x.stroke(); x.fillStyle="#C9A24A"; star8(x,W/2,y,7*L,3.5*L); x.fill(); });
      x.globalAlpha=.07; for(let i=0;i<2500;i++){ x.fillStyle=rnd(i)>.5?"#fff":"#000"; x.fillRect(rnd(i+3)*W,rnd(i+7)*H,1.2*L,1.2*L); } x.globalAlpha=1; }
    else if(T==="rouleau"){ const gr=x.createLinearGradient(0,0,0,H); gr.addColorStop(0,"#2A1608"); gr.addColorStop(1,"#120803"); x.fillStyle=gr; x.fillRect(0,0,W,H);
      const px=V?W*.08:W*.18, pw=V?W*.84:W*.64, py=H*.08, ph=H*.84; x.save(); x.shadowColor="rgba(0,0,0,.6)"; x.shadowBlur=36*L; x.fillStyle="#EBD9AE"; x.fillRect(px,py,pw,ph); x.restore();
      const p2=x.createLinearGradient(px,0,px+pw,0); p2.addColorStop(0,"#D8BF86"); p2.addColorStop(.1,"#F3E5C2"); p2.addColorStop(.9,"#F3E5C2"); p2.addColorStop(1,"#D8BF86"); x.fillStyle=p2; x.fillRect(px,py,pw,ph);
      [py,py+ph].forEach(yy=>{ const rg=x.createLinearGradient(0,yy-14*L,0,yy+14*L); rg.addColorStop(0,"#3A2210"); rg.addColorStop(.5,"#8A5A2B"); rg.addColorStop(1,"#3A2210"); x.fillStyle=rg; rrect(x,px-24*L,yy-14*L,pw+48*L,28*L,14*L); x.fill(); x.fillStyle="#B8860B"; [px-30*L,px+pw+30*L].forEach(ex=>{ x.beginPath(); x.arc(ex,yy,12*L,0,2*PI); x.fill(); }); }); }
    else if(T==="paysage"){ const hz=H*.6; let gr=x.createLinearGradient(0,0,0,hz); gr.addColorStop(0,"#5B7DB0"); gr.addColorStop(.55,"#C8A3A0"); gr.addColorStop(1,"#F6C98E"); x.fillStyle=gr; x.fillRect(0,0,W,hz);
      const sx=W*.68, sy=hz-H*.05, sg=x.createRadialGradient(sx,sy,0,sx,sy,W*.5); sg.addColorStop(0,"rgba(255,238,196,.95)"); sg.addColorStop(.08,"rgba(255,220,160,.6)"); sg.addColorStop(1,"rgba(255,200,140,0)"); x.fillStyle=sg; x.fillRect(0,0,W,hz);
      const [m,mx]=off(W,hz); ridge(mx,W,hz,hz*.62,hz*.28,1.3,"rgba(118,138,178,.85)",6*L); ridge(mx,W,hz,hz*.8,hz*.3,4.1,"#4A6089",5*L); ridge(mx,W,hz,hz*.95,hz*.2,7.7,"#25344E",4*L); x.drawImage(m,0,0,W,hz);
      let lg=x.createLinearGradient(0,hz,0,H); lg.addColorStop(0,"#E9C190"); lg.addColorStop(.35,"#6C7FA6"); lg.addColorStop(1,"#1A2640"); x.fillStyle=lg; x.fillRect(0,hz,W,H-hz);
      x.save(); x.globalAlpha=.42; x.translate(0,2*hz); x.scale(1,-1); x.drawImage(m,0,0,W,hz); x.restore();
      x.fillStyle="rgba(255,255,255,.09)"; for(let i=0;i<70;i++) x.fillRect(rnd(i+50)*W,hz+rnd(i+90)*(H-hz)*.9,(20+rnd(i+130)*90)*L,1.2*L);
      const sh=H*(V?.93:.9); x.fillStyle="#0C1422"; x.beginPath(); x.moveTo(0,H); for(let px=0;px<=W;px+=10) x.lineTo(px,sh-Math.sin(px/W*PI*1.5+.6)*H*.02); x.lineTo(W,H); x.closePath(); x.fill();
      for(let i=0;i<16;i++){ const px=rnd(i+700)<.5?rnd(i+710)*W*.26:W-rnd(i+720)*W*.26, h=(V?120:96)*L*(.6+rnd(i+730)*.8); pine(x,px,sh+H*.03,h,"#09101C"); } band(x,.42); }
    else if(T==="foret"){ let gr=x.createLinearGradient(0,0,0,H); gr.addColorStop(0,"#060C20"); gr.addColorStop(.55,"#1A2A50"); gr.addColorStop(1,"#3A5180"); x.fillStyle=gr; x.fillRect(0,0,W,H);
      for(let i=0;i<120;i++){ x.fillStyle=`rgba(255,255,255,${.3+rnd(i+900)*.6})`; x.fillRect(rnd(i+910)*W,rnd(i+920)*H*.5,1.3*L,1.3*L); }
      const mg=x.createRadialGradient(W*.2,H*.12,0,W*.2,H*.12,W*.3); mg.addColorStop(0,"rgba(230,236,255,.35)"); mg.addColorStop(1,"rgba(230,236,255,0)"); x.fillStyle=mg; x.fillRect(0,0,W,H); x.fillStyle="#F4F6FF"; x.beginPath(); x.arc(W*.2,H*.12,24*L,0,2*PI); x.fill();
      const gy=H*.8, row=(yy,sc,col,snow,n,r)=>{ for(let i=0;i<n;i++){ const px=(i+rnd(i+r*50+1000)*.8)/n*W*1.05-W*.02, h=(V?150:120)*L*sc*(.7+rnd(i+r*50+1100)*.6); pine(x,px,yy,h,col,snow); } };
      row(gy-H*.04,.55,"#2D4270","rgba(220,230,250,.55)",34,0); row(gy,.85,"#192747","rgba(235,240,255,.8)",22,1);
      let sn=x.createLinearGradient(0,gy,0,H); sn.addColorStop(0,"#A9BBDA"); sn.addColorStop(1,"#E6EEFA"); x.fillStyle=sn; x.beginPath(); x.moveTo(0,H); for(let px=0;px<=W;px+=10) x.lineTo(px,gy+H*.02-Math.sin(px/W*PI*2+1)*H*.012); x.lineTo(W,H); x.closePath(); x.fill();
      row(gy+H*.1,1.25,"#0B1430","rgba(245,248,255,.92)",9,2); band(x,.4); }
    else if(T==="lune"){ let gr=x.createLinearGradient(0,0,0,H); gr.addColorStop(0,"#040A1E"); gr.addColorStop(.55,"#0E2457"); gr.addColorStop(1,"#1D3B78"); x.fillStyle=gr; x.fillRect(0,0,W,H);
      for(let i=0;i<110;i++){ x.fillStyle=`rgba(255,255,255,${.25+rnd(i+600)*.6})`; x.fillRect(rnd(i+610)*W,rnd(i+620)*H*.7,1.3*L,1.3*L); }
      moonFull(x,MOON.x,MOON.y,MOON.r); const hy=V?H*.9:H*.86; x.fillStyle="#02050F"; x.beginPath(); x.moveTo(0,H); for(let px=0;px<=W;px+=10){ const d=(px-MOON.x)/W; x.lineTo(px,hy+d*d*H*.5); } x.lineTo(W,H); x.closePath(); x.fill();
      priant(x,MOON.x,hy+2*L,(V?1.7:1.25)*L,"#02050F"); if(V) band(x,.25); }
    else if(T==="kaaba"){ const gr=x.createLinearGradient(0,0,0,H); gr.addColorStop(0,"#050817"); gr.addColorStop(.68,"#14264A"); gr.addColorStop(1,"#B98954"); x.fillStyle=gr; x.fillRect(0,0,W,H); for(let i=0;i<90;i++){ x.fillStyle=`rgba(255,245,205,${.25+rnd(i+2100)*.65})`; x.fillRect(rnd(i+2110)*W,rnd(i+2120)*H*.58,1.2*L,1.2*L); } const kw=V?W*.48:W*.28,kh=kw*.82,kx=W/2-kw/2,ky=H*.69-kh; x.fillStyle="#090909"; x.fillRect(kx,ky,kw,kh); x.fillStyle="#C8A04E"; x.fillRect(kx,ky+kh*.22,kw,kh*.08); x.strokeStyle="#D8B45C"; x.lineWidth=3*L; x.strokeRect(kx+kw*.08,ky+kh*.08,kw*.84,kh*.82); x.fillStyle="#D9B76A"; x.fillRect(kx+kw*.43,ky+kh*.55,kw*.16,kh*.45); band(x,.4); }
    else if(T==="medine"){ const gr=x.createLinearGradient(0,0,0,H); gr.addColorStop(0,"#193C54"); gr.addColorStop(.5,"#6CA49B"); gr.addColorStop(1,"#F3D49A"); x.fillStyle=gr; x.fillRect(0,0,W,H); mosque(x,W,H,H*.88,"#F3E9D1",L); x.fillStyle="#2E8B62"; x.beginPath(); x.arc(W/2,H*.72,W*.1,PI,2*PI); x.fill(); band(x,.32); }
    else if(T==="desert"){ const gr=x.createLinearGradient(0,0,0,H); gr.addColorStop(0,"#07091C"); gr.addColorStop(.55,"#32284C"); gr.addColorStop(1,"#D58A53"); x.fillStyle=gr; x.fillRect(0,0,W,H); for(let i=0;i<170;i++){ x.fillStyle=`rgba(255,245,220,${.25+rnd(i+2200)*.7})`; x.fillRect(rnd(i+2210)*W,rnd(i+2220)*H*.62,(1+rnd(i+2230))*L,(1+rnd(i+2240))*L); } ridge(x,W,H,H*.78,H*.12,22,"#7B4A45",22*L); ridge(x,W,H,H*.9,H*.1,23,"#3B2637",18*L); band(x,.3); }
    else if(T==="lofi"){ let gr=x.createLinearGradient(0,0,0,H); gr.addColorStop(0,"#1A1222"); gr.addColorStop(1,"#2E1D2E"); x.fillStyle=gr; x.fillRect(0,0,W,H);
      x.save(); rrect(x,WIN.x,WIN.y,WIN.w,WIN.h,10*L); x.clip(); let sk=x.createLinearGradient(0,WIN.y,0,WIN.y+WIN.h); sk.addColorStop(0,"#0B1636"); sk.addColorStop(.6,"#283A6E"); sk.addColorStop(1,"#4B4A7A"); x.fillStyle=sk; x.fillRect(WIN.x,WIN.y,WIN.w,WIN.h);
      for(let i=0;i<60;i++){ x.fillStyle=`rgba(255,255,255,${.3+rnd(i+1500)*.5})`; x.fillRect(WIN.x+rnd(i+1510)*WIN.w,WIN.y+rnd(i+1520)*WIN.h*.5,1.2*L,1.2*L); }
      const mx=WIN.x+WIN.w*.78, my=WIN.y+WIN.h*.2, mg=x.createRadialGradient(mx,my,0,mx,my,WIN.w*.25); mg.addColorStop(0,"rgba(255,240,210,.35)"); mg.addColorStop(1,"rgba(255,240,210,0)"); x.fillStyle=mg; x.fillRect(WIN.x,WIN.y,WIN.w,WIN.h); x.fillStyle="#FFF1D6"; x.beginPath(); x.arc(mx,my,18*L,0,2*PI); x.fill();
      for(let i=0;i<26;i++){ const bw=WIN.w/26, bh=WIN.h*(.12+rnd(i+1600)*.22), bx=WIN.x+i*bw, by=WIN.y+WIN.h-bh; x.fillStyle="#141B33"; x.fillRect(bx,by,bw+1,bh); for(let k=0;k<6;k++) if(rnd(i*7+k+1700)>.55){ x.fillStyle="rgba(255,200,110,.75)"; x.fillRect(bx+bw*.25,by+bh*(.1+k*.14),bw*.22,3*L); } }
      x.restore(); x.strokeStyle="#3B2416"; x.lineWidth=14*L; rrect(x,WIN.x,WIN.y,WIN.w,WIN.h,10*L); x.stroke(); x.lineWidth=7*L; x.beginPath(); x.moveTo(WIN.x+WIN.w/2,WIN.y); x.lineTo(WIN.x+WIN.w/2,WIN.y+WIN.h); x.moveTo(WIN.x,WIN.y+WIN.h*.45); x.lineTo(WIN.x+WIN.w,WIN.y+WIN.h*.45); x.stroke();
      x.fillStyle="#4A2E1C"; x.fillRect(WIN.x-26*L,WIN.y+WIN.h+6*L,WIN.w+52*L,16*L);
      const lp=x.createRadialGradient(W*.1,H*.92,0,W*.1,H*.92,W*.6); lp.addColorStop(0,"rgba(255,170,80,.4)"); lp.addColorStop(1,"rgba(255,170,80,0)"); x.fillStyle=lp; x.fillRect(0,0,W,H);
      const px=W*(V?.82:.88), py=H*.97; x.fillStyle="#6B3E26"; rrect(x,px-34*L,py-60*L,68*L,60*L,8*L); x.fill(); x.fillStyle="#1F3A2A"; for(let i=0;i<9;i++){ const a=-PI/2+(i-4)*.32; x.save(); x.translate(px,py-60*L); x.rotate(a+PI/2); x.beginPath(); x.ellipse(0,-50*L,12*L,48*L,0,0,2*PI); x.fill(); x.restore(); }
      band(x,.35); }
    else if(T==="enfants"){ let gr=x.createLinearGradient(0,0,0,H); gr.addColorStop(0,"#5CC8FF"); gr.addColorStop(1,"#C9F1FF"); x.fillStyle=gr; x.fillRect(0,0,W,H);
      [[.74,"#8EE06A",.04,1],[.82,"#66C74A",.035,2.3],[.9,"#49A83A",.03,1.7]].forEach(([yy,col,amp,f],k)=>{ x.fillStyle=col; x.beginPath(); x.moveTo(0,H); for(let px=0;px<=W;px+=8) x.lineTo(px,H*yy-Math.sin(px/W*PI*f+k)*H*amp); x.lineTo(W,H); x.closePath(); x.fill(); });
      for(let i=0;i<5;i++){ const tx=W*(.08+i*.22+rnd(i+1800)*.06), ty=H*.75; x.fillStyle="#8B5A2B"; x.fillRect(tx-4*L,ty-30*L,8*L,30*L); x.fillStyle=["#3FB950","#2EA043","#56D364"][i%3]; x.beginPath(); x.arc(tx,ty-42*L,20*L,0,2*PI); x.fill(); }
      for(let i=0;i<40;i++) flower(x,rnd(i+1900)*W,H*(.86+rnd(i+1910)*.12),(4+rnd(i+1920)*3)*L,["#FF6B9A","#FFFFFF","#B78CFF","#FF9F43"][i%4]);
      const cx=box.x-20*L, cy=box.y-16*L, cw=box.w+40*L, ch=box.h+32*L; x.save(); x.shadowColor="rgba(40,60,120,.3)"; x.shadowBlur=24*L; x.shadowOffsetY=8*L; rrect(x,cx,cy,cw,ch,30*L); x.fillStyle="rgba(255,255,255,.95)"; x.fill(); x.restore();
      x.lineWidth=6*L; x.strokeStyle="#FFB347"; rrect(x,cx,cy,cw,ch,30*L); x.stroke(); x.lineWidth=2*L; x.strokeStyle="#7ED6FF"; rrect(x,cx+10*L,cy+10*L,cw-20*L,ch-20*L,22*L); x.stroke(); }
    else if(ENS){ /* salle d'école coranique (daara) : mur chaud, fenêtre en arc, natte tressée, tablette en bois (alluwa) */
      let gr=x.createLinearGradient(0,0,0,H); gr.addColorStop(0,"#F1DFC0"); gr.addColorStop(1,"#C99A68"); x.fillStyle=gr; x.fillRect(0,0,W,H);
      x.globalAlpha=.05; for(let i=0;i<3000;i++){ x.fillStyle=rnd(i+2100)>.5?"#fff":"#6b4a2a"; x.fillRect(rnd(i+2110)*W,rnd(i+2120)*H,2*L,2*L); } x.globalAlpha=1;
      if(!V){ const ww=AVR.w*.5, wx=AVR.x+AVR.w*.5-ww/2, wy=H*.06, wh=H*.5; x.save(); mihrab(x,wx,wy,ww,wh); x.clip(); let sk=x.createLinearGradient(0,wy,0,wy+wh); sk.addColorStop(0,"#9FD3EE"); sk.addColorStop(.7,"#F6E2B8"); sk.addColorStop(1,"#E9C48A"); x.fillStyle=sk; x.fillRect(wx,wy,ww,wh);
        x.fillStyle="rgba(70,110,70,.55)"; for(let i=0;i<3;i++){ const px=wx+ww*(.2+i*.32), py=wy+wh*.75; x.fillRect(px-2*L,py-wh*.35,4*L,wh*.35); for(let f=0;f<6;f++){ x.save(); x.translate(px,py-wh*.35); x.rotate(-1.4+f*.56); x.beginPath(); x.ellipse(0,-ww*.07,ww*.025,ww*.08,0,0,7); x.fill(); x.restore(); } }
        x.restore(); x.lineWidth=9*L; x.strokeStyle="#8A5A33"; mihrab(x,wx,wy,ww,wh); x.stroke(); x.lineWidth=2*L; x.strokeStyle="#C9A15A"; mihrab(x,wx+8*L,wy+10*L,ww-16*L,wh-14*L); x.stroke(); }
      else { x.save(); x.globalAlpha=.18; girih(x,W,H*.5,70*L,"#8A5A33",1.2*L); x.restore(); }
      const fy=V?H*.9:H*.86; x.fillStyle="#D8B77E"; x.fillRect(0,fy,W,H-fy); [["#A8432F",.18],["#2F6B4A",.42],["#1E1E1E",.62],["#A8432F",.82]].forEach(([c,k])=>{ x.fillStyle=c; x.globalAlpha=.55; x.fillRect(0,fy+(H-fy)*k,W,(H-fy)*.06); }); x.globalAlpha=.12; x.fillStyle="#5a3a1a"; for(let px=0;px<W;px+=6*L) x.fillRect(px,fy,1.2*L,H-fy); x.globalAlpha=1;
      /* l'alluwa : planche claire, poignée en haut, bord plus sombre, fil du bois */
      const b=BOARD, tab={x:b.x+b.w*.42,y:b.y-b.h*.07,w:b.w*.16,h:b.h*.12}; /* la planche et sa poignée dans un seul tracé (rrect recommence un tracé : on trace ici à la main) */
      const rr=(X,Y,w,h,r)=>{ x.moveTo(X+r,Y); x.arcTo(X+w,Y,X+w,Y+h,r); x.arcTo(X+w,Y+h,X,Y+h,r); x.arcTo(X,Y+h,X,Y,r); x.arcTo(X,Y,X+w,Y,r); x.closePath(); };
      const shape=()=>{ x.beginPath(); rr(b.x,b.y,b.w,b.h,b.w*.04); rr(tab.x,tab.y,tab.w,tab.h,tab.w*.3); };
      x.save(); x.shadowColor="rgba(60,30,10,.45)"; x.shadowBlur=30*L; x.shadowOffsetY=12*L; x.fillStyle="#D9BC86"; shape(); x.fill(); x.restore();
      x.save(); shape(); x.clip(); let wg=x.createLinearGradient(b.x,0,b.x+b.w,0); wg.addColorStop(0,"#E2C792"); wg.addColorStop(.5,"#EFD9AE"); wg.addColorStop(1,"#DDBF88"); x.fillStyle=wg; x.fillRect(b.x,tab.y,b.w,b.h+tab.h);
      x.strokeStyle="rgba(120,80,40,.16)"; x.lineWidth=1.4*L; for(let i=0;i<34;i++){ const yy=b.y+b.h*(i/34); x.beginPath(); for(let px=0;px<=b.w;px+=10*L) x.lineTo(b.x+px,yy+Math.sin(px/b.w*6+i*1.3)*4*L+Math.sin(px/b.w*17+i)*1.5*L); x.stroke(); } x.restore();
      x.lineWidth=5*L; x.strokeStyle="#9C6A3A"; shape(); x.stroke(); x.fillStyle="#6B4426"; x.beginPath(); x.arc(tab.x+tab.w/2,tab.y+tab.h*.42,tab.h*.16,0,7); x.fill(); }
  })(bgx);
  /* ---- textes mis en page une fois par élément (cache) ---- */
  const cache=new Map(), meas=document.createElement("canvas").getContext("2d"), isRtl=txt=>/[\u0590-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(String(txt||""));
  const wrapAr=(x,txt,maxw)=>{ const ws=String(txt).split(/\s+/).filter(Boolean), lines=[]; let line=""; ws.forEach(w=>{ const q=line?line+" "+w:w; if(line&&x.measureText(q).width>maxw){ lines.push(line); line=w; } else line=q; }); if(line) lines.push(line); return lines; };
  function layout(it){ const key=it; if(cache.has(key)){ const v=cache.get(key); cache.delete(key); cache.set(key,v); return v; } const tx=meas;
    /* taille de l'écriture choisie (normale, grande, très grande) ; unités seules (lettres, chiffres) : leur nom aussi en grand */
    const isT=it.kind==="titre", ZS=cl(+o.textScale||1,.8,1.8), unit0=!isT&&String(it.ar).trim().split(/\s+/).every(w=>w.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g,"").length<=2);
    const rtl=isRtl(it.ar), maxLines=isT?3:(V?(showTr&&it.tr?5:7):(showTr&&it.tr?3:5)), trH=showTr&&it.tr&&!isT?box.h*(V?.28:.3):0, phH=o.showPh!==false&&it.ph&&!isT?box.h*(unit0?(V?.18:.2):(V?.13:.15)):0, arH=box.h-trH-phH, base=(isT?(V?82:76):rtl?(V?62:56):(V?54:48))*ZS, LH=unit0&&!/[ً-ْ]/.test(it.ar)?1.25:rtl?1.75:1.32;
    const font=sz=>rtl?(isT?`700 ${Math.round(sz)}px ${AR_T}`:`${AF.w?AF.w+" ":""}${Math.round(sz*AF.k)}px ${AF.css},${AR}`):T==="enfants"?`700 ${Math.round(sz)}px ${KID}`:`${isT?"700":"600"} ${Math.round(sz)}px ${LAT}`;
    const txt=String(it.ar).replace(/\s+([\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED])/g,"$1"), floor=isT?24:Math.round(base*.72);
    /* unités seules (lettres, chiffres, syllabes : chaque mot a 2 lettres au plus) : en très grand, comme au tableau */
    const unit=!isT&&txt.trim().split(/\s+/).every(w=>w.replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g,"").length<=2);
    let size=unit?Math.round(base*3.2):base, lines=[]; for(;size>=floor;size-=2){ tx.font=font(size); lines=wrapAr(tx,txt,box.w*.94); if(lines.length<=maxLines&&lines.length*size*LH<=arH) break; }
    size=Math.max(size,floor); tx.font=font(size); lines=wrapAr(tx,txt,box.w*.94);
    /* verset très long : en grandes lettres sur plusieurs pages, qui se suivent au fil de la récitation ; la traduction est répartie avec */
    const per=Math.max(1,Math.min(maxLines,Math.floor(arH/(size*LH)))), pages=[]; for(let i=0;i<lines.length;i+=per) pages.push(lines.slice(i,i+per));
    const trw=String(it.tr||"").split(/\s+/).filter(Boolean), arw=pages.map(pl=>pl.join(" ").split(/\s+/).length), arT=arw.reduce((a,b)=>a+b,0)||1; let acc=0;
    const split=src=>{ const w=String(src||"").split(/\s+/).filter(Boolean); let ac=0; return pages.map((pl,i)=>{ const a=Math.round(w.length*ac/arT); ac+=arw[i]; return w.slice(a,Math.round(w.length*ac/arT)).join(" "); }); };
    const trs=split(it.tr), phs=split(it.ph);
    const lh=size*LH, bys=[], render=(pl,x,trTxt,phTxt,hi)=>{ x.clearRect(0,0,box.w,box.h); x.direction=rtl?"rtl":"ltr"; x.textAlign="center"; x.textBaseline="middle"; x.font=font(size);
      const y0=(arH-pl.length*lh)/2+lh/2; if(!hi) bys.push(y0+(pl.length-1)*lh+size*.95); if(P.glow!=="rgba(0,0,0,0)"&&P.glow!=="rgba(255,230,170,.0)"){ x.shadowColor=P.glow; x.shadowBlur=size*(hi?.58:.34); } x.fillStyle=hi?P.active:(isT?P.gold:P.ink);
      x.lineJoin="round"; x.lineWidth=Math.max(1,size*.045); x.strokeStyle=P.stroke; const dim=!hi&&!isT&&(SUB_STYLE[SUB]||{}).karaoke; if(dim) x.globalAlpha=PAPER?.42:.5;   /* mots pas encore récités : plus pâles */
      pl.forEach((ln,i)=>{ if(!hi&&SUB!=="mushaf") x.strokeText(ln,box.w/2,y0+i*lh); x.fillText(ln,box.w/2,y0+i*lh); }); x.globalAlpha=1; x.shadowColor="transparent"; x.shadowBlur=0;
      if(!hi&&phH&&phTxt){ x.direction="ltr"; let ps=Math.round((unit0?(V?42:36):(V?28:24))*ZS), pl2=[]; for(;ps>=15;ps-=1){ x.font=T==="enfants"?`600 ${ps}px ${KID}`:`italic 600 ${ps}px ${LAT}`; pl2=wrapAr(x,phTxt,box.w*.92); if(pl2.length*ps*1.25<=phH*.92) break; }
        x.fillStyle=P.gold; if(P.glow!=="rgba(0,0,0,0)"&&!PAPER){ x.shadowColor=P.glow; x.shadowBlur=ps*.4; } const py=arH+(phH-pl2.length*ps*1.25)/2+ps*.62; pl2.forEach((ln,i)=>x.fillText(ln,box.w/2,py+i*ps*1.25)); x.shadowColor="transparent"; x.shadowBlur=0; }
      if(!hi&&trH){ x.direction="ltr"; const t0=arH+phH; let ts=Math.round((V?30:26)*ZS), tl=[]; for(;ts>=16;ts-=1){ x.font=T==="enfants"?`600 ${ts}px ${KID}`:`italic 500 ${ts}px ${LAT}`; tl=wrapAr(x,trTxt,box.w*.92); if(tl.length*ts*1.3<=trH*.9) break; }
        x.fillStyle=P.ink2; if(P.glow!=="rgba(0,0,0,0)"&&!PAPER&&T!=="nuit"&&T!=="arabesque"&&T!=="neon"){ x.shadowColor=P.glow; x.shadowBlur=ts*.4; } const ty=t0+(trH-tl.length*ts*1.3)/2+ts*.65; tl.forEach((ln,i)=>x.fillText(ln,box.w/2,ty+i*ts*1.3)); x.shadowColor="transparent"; x.shadowBlur=0;
        x.strokeStyle=rgba(P.gold.length===7?P.gold:"#C9A24A",.6); x.lineWidth=1.2; x.beginPath(); x.moveTo(box.w*.3,t0+4); x.lineTo(box.w*.7,t0+4); x.stroke(); } };
    /* position de chaque mot, page par page, ligne après ligne, dans le sens de lecture : le surlignage suit vraiment la récitation */
    tx.font=font(size); const geo=pages.map(pl=>{ const y0=(arH-pl.length*lh)/2+lh/2, ws=[]; pl.forEach((ln,li)=>{ const W=ln.split(" "), full=tx.measureText(ln).width, cx=box.w/2, yc=y0+li*lh; let pre="";
        W.forEach((w,k)=>{ const a0=k?tx.measureText(pre+" ").width:0; pre=k?pre+" "+w:w; const a1=tx.measureText(pre).width;
          ws.push({x0:rtl?cx+full/2-a1:cx-full/2+a0, x1:rtl?cx+full/2-a0:cx-full/2+a1, y0:yc-lh*.5, y1:yc+lh*.5, n:Math.max(1,w.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g,"").length), waqf:/[\u06D6-\u06DB]/.test(w)}); }); }); return ws; });
    const geoBase=[]; geo.reduce((n,g,i)=>{ geoBase[i]=n; return n+g.length; },0);
    const hiPages=[], out={geo, geoBase, pages:pages.map((pl,i)=>{ const tr0=pages.length>1?trs[i]:String(it.tr||""), ph0=pages.length>1?phs[i]:String(it.ph||""), [pc,px]=off(box.w,box.h); render(pl,px,tr0,ph0,false); if((SUB_STYLE[SUB]||{}).karaoke&&!isT){ const [hc,hx]=off(box.w,box.h); render(pl,hx,"","",true); hiPages.push(hc); } return pc; }), hiPages, lines:lines.length, rtl, arH, bys, trH};
    cache.set(key,out); while(cache.size>12) cache.delete(cache.keys().next().value);   /* seuls les textes autour du moment présent restent en mémoire */
    return out; }
  const itemAt=t=>{ let lo=0, hi=items.length-1, k=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(items[m].a<=t){ k=m; lo=m+1; } else hi=m-1; } return k; };
  const cueProgress=(it,t)=>{ const ws=(it.speech||[]).filter(z=>z&&z.b>z.a), total=ws.reduce((n,z)=>n+z.b-z.a,0); if(!total) return cl((t-it.a)/Math.max(.5,(it.b||it.a+4)-it.a)); let done=0; for(const z of ws){ if(t>=z.b) done+=z.b-z.a; else if(t>z.a){ done+=t-z.a; break; } else break; } return cl(done/total); };
  const wordTimes=new WeakMap();
  function wordTiming(it,lay){ const words=lay.geo.flat(), sig=`${it.a}|${it.b}|${JSON.stringify(it.speech||[])}|${words.length}`, old=wordTimes.get(it); if(old&&old.sig===sig) return old;
    let ws=(it.speech||[]).filter(z=>z&&z.b>z.a).map(z=>({a:+z.a,b:+z.b})); if(!ws.length) ws=[{a:it.a,b:Math.max(it.a+.5,it.b||it.a+4)}];
    const groups=[[]]; words.forEach((w,i)=>{ groups[groups.length-1].push(i); if(w.waqf&&i<words.length-1) groups.push([]); });
    const s=new Array(words.length), e=new Array(words.length);
    const spread=(idx,wins)=>{ const tot=wins.reduce((n,z)=>n+z.b-z.a,0), L=idx.reduce((n,i)=>n+words[i].n,0)||1; let acc=0;
      const at=f=>{ let d=f*tot; for(const z of wins){ const len=z.b-z.a; if(d<=len+1e-6) return z.a+d; d-=len; } return wins[wins.length-1].b; };
      idx.forEach(i=>{ s[i]=at(acc/L); acc+=words[i].n; e[i]=at(acc/L); }); };
    if(groups.length>1&&groups.length===ws.length) groups.forEach((gp,k)=>spread(gp,[ws[k]])); else spread(words.map((w,i)=>i),ws);
    const r={sig,s,e}; wordTimes.set(it,r); return r; }
  /* page d'un verset long : celle du mot en cours de récitation */
  const pageOf=(it,lay,t)=>{ if(lay.pages.length<2) return 0; if(lay.geo){ const tm=wordTiming(it,lay); let k=0; for(let p=1;p<lay.pages.length;p++){ const i=lay.geoBase[p]; if(tm.s[i]!=null&&t>=tm.s[i]-.05) k=p; } return k; } return oldPageOf(it,lay,t); };
  const oldPageOf=(it,lay,t)=>lay.pages.length<2?0:Math.min(lay.pages.length-1,Math.floor(Math.min(.999,cueProgress(it,t))*lay.pages.length));
  /* dessin d'un bloc de texte avec son entrée (fondu, montée, mise au point) */
  function drawText(x,it,t,alpha,dy,blur){ if(!it||alpha<=0) return; const lay=layout(it), pg=pageOf(it,lay,t), pc=lay.pages[pg]; x.save(); x.globalAlpha=alpha; if(blur>0.3) x.filter=`blur(${blur.toFixed(1)}px)`; x.drawImage(pc,box.x,box.y+(dy||0),box.w,box.h); x.restore();
    if(lay.hiPages[pg]&&it.b>it.a){ const tm=wordTiming(it,lay), G=lay.geo[pg], base=lay.geoBase[pg], oy=box.y+(dy||0), pad=3*L; let any=false; x.save(); x.globalAlpha=alpha; x.beginPath();
      G.forEach((r,j)=>{ const i=base+j, s0=tm.s[i], s1=tm.e[i]; if(s0==null||t<s0) return; const f=t>=s1?1:cl((t-s0)/Math.max(.05,s1-s0)), w=(r.x1-r.x0)*f+(f>=1?pad*2:pad);
        x.rect(lay.rtl?box.x+r.x1+pad-w:box.x+r.x0-pad, oy+r.y0, w, r.y1-r.y0); any=true; });
      if(any){ x.clip(); x.drawImage(lay.hiPages[pg],box.x,oy,box.w,box.h); } x.restore(); }
    /* au rythme de la voix, dans le sens de lecture (de droite à gauche pour l'arabe) : sur le papier, un filet d'or avance sous le verset ;
       sur les fonds sombres, une lueur douce passe sur les mots */
    if(it.kind==="verset"&&it.b>it.a&&alpha>.5&&T!=="minimal"){ const p=cueProgress(it,t), y0=box.y+(dy||0);
      if(PAPER){ const y=y0+Math.min(lay.arH-6,lay.bys[pg]||lay.arH*.8), w=box.w*.4; x.save(); x.globalAlpha=alpha*.35; x.fillStyle=P.gold; x.fillRect(box.x+box.w*.3,y,w,1.2*L); x.globalAlpha=alpha*.9;
        if(lay.rtl) x.fillRect(box.x+box.w*.7-w*p,y-.4*L,w*p,2*L); else x.fillRect(box.x+box.w*.3,y-.4*L,w*p,2*L); x.restore(); }
      else { const lx=box.x+box.w*(lay.rtl?1-p:p), cy=y0+lay.arH/2, r=box.w*.2; x.save(); x.globalCompositeOperation="screen"; x.globalAlpha=alpha; x.translate(lx,cy); x.scale(1,Math.max(.3,lay.arH*.42/r));
        const gr=x.createRadialGradient(0,0,0,0,0,r); gr.addColorStop(0,"rgba(255,232,170,.22)"); gr.addColorStop(1,"rgba(255,232,170,0)"); x.fillStyle=gr; x.fillRect(-r,-r,2*r,2*r); x.restore(); } } }
  /* en-tête (sourate) et pied (récitant, avancement) */
  function chrome(x,t,it){ const parchment=T==="livre"||T==="rouleau", col=parchment?"#865813":P.gold, chromeInk=parchment?"#5A3818":P.ink2, so=(!o.fixe&&it&&it.sourate)||o.sourate; x.save(); x.textAlign="center"; x.textBaseline="middle"; x.direction="rtl";
    if(so&&so.ar){ const bk=T==="livre"&&V, med=T==="livre"&&!V, ens=ENS, y=ens?BOARD.y+BOARD.h*.085:med?H*.485:bk?H*.172:T==="rouleau"?H*.04:(V?H*.13:H*.11), cx=ens?BOARD.x+BOARD.w/2:med?W*.29:T==="lune"&&!V?box.x+box.w/2:W/2; const hr=isRtl(so.ar); x.direction=hr?"rtl":"ltr"; x.font=hr?`700 ${Math.round((med?52:bk?34:(V?42:36))*L)}px ${AR_T}`:`700 ${Math.round((med?34:bk?30:(V?38:32))*L)}px ${LAT}`; x.fillStyle=col; if(T==="enfants"){ x.lineJoin="round"; x.lineWidth=8*L; x.strokeStyle="#FFFFFF"; x.strokeText(so.ar,cx,y); } else if(T!=="livre"&&T!=="rouleau"){ x.shadowColor=P.glow; x.shadowBlur=14*L; } x.fillText(so.ar,cx,y); x.shadowBlur=0;
      if(so.nom&&T!=="rouleau"){ x.direction="ltr"; x.font=T==="enfants"?`700 ${Math.round((V?24:20)*L)}px ${KID}`:`500 ${Math.round((med?19:bk?19:(V?22:19))*L)}px ${LAT}`; x.fillStyle=T==="enfants"?"#1E3A8A":chromeInk; x.globalAlpha=.85; x.fillText(so.nom,cx,ens?y+(V?34:28)*L:med?y+48*L:bk?H*.207:y+(V?40:34)*L); x.globalAlpha=1; } }
    if(it&&it.kind==="verset"&&it.n){ const mx=T==="livre"&&!V?W*.71:box.x+box.w/2, my=ENS?BOARD.y+BOARD.h*.94:T==="livre"?(V?H*.8:H*.84):T==="rouleau"?H*.955:(V?box.y+box.h+46*L:box.y+box.h+30*L); ayahMark(x,mx,my,(V?24:20)*L,it.n,col,parchment?"#4A2E16":P.ink); }
    x.direction="ltr"; const fy=T==="rouleau"?H*.985:H-(V?40:26)*L; if(o.recitant&&T!=="rouleau"){ x.font=`italic 500 ${Math.round((V?22:18)*L)}px ${LAT}`; x.fillStyle=T==="livre"?"#E9D9B4":T==="enfants"?"#1E3A8A":ENS?"#3A2614":P.ink2; x.globalAlpha=.85; x.fillText(`Récitation : ${o.recitant}`,W/2,fy-(V?22:20)*L); x.globalAlpha=1; }
    if(total>0){ const pw=W*(V?.5:.3), px=W/2-pw/2; x.fillStyle="rgba(255,255,255,.14)"; x.fillRect(px,fy,pw,2*L); x.fillStyle=col; x.fillRect(px,fy,pw*cl(t/total),2*L); }
    x.restore(); }
  /* décor animé propre à chaque habillage */
  function live(x,t){
    if(T==="nuit"){ for(let i=0;i<150;i++){ const a=.3+.7*Math.abs(Math.sin(t*(.6+rnd(i+9))+i)); x.fillStyle=`rgba(255,250,230,${a*.9})`; const s=(rnd(i+5)>.92?2.2:1.2)*L; x.fillRect(rnd(i)*W,rnd(i+1)*H*.62,s,s); }
      for(let k=0;k<3;k++){ const cx=((t*(6+k*3)*L+rnd(k+40)*W*2)%(W*1.6))-W*.3, cy=H*(.18+k*.12), gr=x.createRadialGradient(cx,cy,0,cx,cy,W*.35); gr.addColorStop(0,"rgba(180,190,230,.10)"); gr.addColorStop(1,"rgba(180,190,230,0)"); x.fillStyle=gr; x.fillRect(cx-W*.35,cy-W*.35,W*.7,W*.7); } }
    else if(T==="arabesque"){ const sx=((t*.08)%1.6-.3)*W; x.save(); x.globalCompositeOperation="screen"; const gr=x.createLinearGradient(sx-W*.25,0,sx+W*.25,H*.3); gr.addColorStop(0,"rgba(255,215,120,0)"); gr.addColorStop(.5,"rgba(255,215,120,.16)"); gr.addColorStop(1,"rgba(255,215,120,0)"); x.fillStyle=gr; x.fillRect(0,0,W,H); x.restore(); }
    else if(T==="neon"){ const fx=V?W*.12:W*.24, fw=V?W*.76:W*.52, fy=V?H*.15:H*.09, fh=V?H*.74:H*.84, pulse=.75+.25*Math.sin(t*1.6); x.save(); x.lineWidth=4*L; x.strokeStyle="#FFC94D"; x.shadowColor="#FFB020"; x.shadowBlur=26*L*pulse; mihrab(x,fx,fy,fw,fh);
      const len=(fw+fh)*2.6, p=cl(t/3); x.setLineDash([len,len]); x.lineDashOffset=len*(1-easeIO(p)); x.stroke(); x.stroke(); x.restore();
      for(let i=0;i<40;i++){ const yy=H-((rnd(i)*H+t*(14+rnd(i+3)*30)*L)%H), xx=rnd(i+7)*W+Math.sin(t+i)*10*L, a=.25+.6*rnd(i+11); x.fillStyle=`rgba(255,210,120,${a})`; x.beginPath(); x.arc(xx,yy,(1+rnd(i+13)*2.2)*L,0,2*PI); x.fill(); } }
    else if(T==="aube"){ x.save(); x.globalCompositeOperation="screen"; for(let k=0;k<6;k++){ const a=-PI/2+(k-2.5)*.22+Math.sin(t*.2+k)*.03; x.fillStyle="rgba(255,235,190,.05)"; x.beginPath(); x.moveTo(W/2,H*.82); x.lineTo(W/2+Math.cos(a-.05)*H*1.4,H*.82+Math.sin(a-.05)*H*1.4); x.lineTo(W/2+Math.cos(a+.05)*H*1.4,H*.82+Math.sin(a+.05)*H*1.4); x.closePath(); x.fill(); } x.restore();
      for(let k=0;k<4;k++){ const cx=((t*(5+k*2)*L+rnd(k+20)*W*2)%(W*1.6))-W*.3, cy=H*(.62+k*.06), gr=x.createRadialGradient(cx,cy,0,cx,cy,W*.4); gr.addColorStop(0,"rgba(255,240,230,.12)"); gr.addColorStop(1,"rgba(255,240,230,0)"); x.fillStyle=gr; x.fillRect(cx-W*.4,cy-W*.4,W*.8,W*.8); } }
    else if(T==="minimal"){ /* rien qui bouge : le calme */ }
    else if(ENS){ /* rayon de lumière et poussière dorée qui flotte, très lentement */ x.save(); x.globalCompositeOperation="screen"; const bx=V?W*.2:AVR.x+AVR.w*.5; const lg=x.createLinearGradient(bx,0,bx+W*.25,H); lg.addColorStop(0,"rgba(255,236,190,.16)"); lg.addColorStop(1,"rgba(255,236,190,0)"); x.fillStyle=lg; x.beginPath(); x.moveTo(bx-W*.06,0); x.lineTo(bx+W*.08,0); x.lineTo(bx+W*.32,H); x.lineTo(bx+W*.1,H); x.closePath(); x.fill();
      for(let i=0;i<26;i++){ const yy=(rnd(i+2300)*H+t*(4+rnd(i+2310)*6)*L)%H, xx=bx+(rnd(i+2320)-.2)*W*.3+Math.sin(t*.4+i)*8*L+yy*.22; x.fillStyle=`rgba(255,230,170,${.25+.4*rnd(i+2330)})`; x.beginPath(); x.arc(xx,yy,(1+rnd(i+2340)*1.6)*L,0,7); x.fill(); } x.restore(); }
    else if(T==="paysage"){ for(let k=0;k<4;k++){ const cx=((t*(4+k*2)*L+rnd(k+60)*W*2)%(W*1.6))-W*.3, cy=H*(.08+k*.07), gr=x.createRadialGradient(cx,cy,0,cx,cy,W*.3); gr.addColorStop(0,"rgba(255,245,235,.22)"); gr.addColorStop(1,"rgba(255,245,235,0)"); x.save(); x.translate(cx,cy); x.scale(1,.35); x.translate(-cx,-cy); x.fillStyle=gr; x.fillRect(cx-W*.3,cy-W*.3,W*.6,W*.6); x.restore(); }
      x.strokeStyle="rgba(20,24,40,.75)"; x.lineWidth=1.6*L; x.lineCap="round"; for(let i=0;i<5;i++){ const per=26+i*3, p=((t+rnd(i+80)*per)%per)/per, bx=-W*.1+p*W*1.2, by=H*(.2+rnd(i+81)*.15)+Math.sin(p*PI*3+i)*H*.02, s=(5+rnd(i+82)*4)*L, f=Math.sin(t*8+i)*s*.5; x.beginPath(); x.moveTo(bx-s,by-f); x.quadraticCurveTo(bx-s*.4,by-s*.3,bx,by); x.quadraticCurveTo(bx+s*.4,by-s*.3,bx+s,by-f); x.stroke(); }
      x.fillStyle="rgba(255,240,210,.18)"; for(let i=0;i<24;i++){ const yy=H*(.62+rnd(i+90)*.3), xx=(rnd(i+91)*W+t*(6+rnd(i+92)*8)*L)%W; x.fillRect(xx,yy,(14+rnd(i+93)*40)*L,1.2*L); } }
    else if(T==="foret"){ for(let i=0;i<160;i++){ const sp=(18+rnd(i+1200)*30)*L, yy=(rnd(i+1210)*H+t*sp)%H, xx=(rnd(i+1220)*W+Math.sin(t*.6+i)*16*L+W)%W, r=(1+rnd(i+1230)*2.4)*L; x.fillStyle=`rgba(255,255,255,${.45+rnd(i+1240)*.5})`; x.beginPath(); x.arc(xx,yy,r,0,2*PI); x.fill(); } }
    else if(T==="lune"){ for(let i=0;i<80;i++){ const a=.25+.75*Math.abs(Math.sin(t*(.5+rnd(i+640))+i)); x.fillStyle=`rgba(255,255,255,${a*.8})`; x.fillRect(rnd(i+650)*W,rnd(i+660)*H*.6,1.4*L,1.4*L); }
      for(let k=0;k<3;k++){ const cw=W*(.35+k*.1), cx=((t*(5+k*2)*L+rnd(k+670)*W*2)%(W+cw*2))-cw, cy=MOON.y-MOON.r*(.6-k*.5), gr=x.createRadialGradient(cx,cy,0,cx,cy,cw*.5); gr.addColorStop(0,"rgba(30,45,85,.55)"); gr.addColorStop(1,"rgba(30,45,85,0)"); x.save(); x.translate(cx,cy); x.scale(1,.32); x.translate(-cx,-cy); x.fillStyle=gr; x.fillRect(cx-cw*.5,cy-cw*.5,cw,cw); x.restore(); } }
    else if(T==="lofi"){ x.save(); rrect(x,WIN.x,WIN.y,WIN.w,WIN.h,10*L); x.clip(); x.strokeStyle="rgba(200,220,255,.32)"; x.lineWidth=1.2*L; for(let i=0;i<90;i++){ const sp=(260+rnd(i+1300)*200)*L, yy=WIN.y+((rnd(i+1310)*WIN.h+t*sp)%WIN.h), xx=WIN.x+rnd(i+1320)*WIN.w, ln=(10+rnd(i+1330)*16)*L; x.beginPath(); x.moveTo(xx,yy); x.lineTo(xx-ln*.15,yy+ln); x.stroke(); }
      x.fillStyle="rgba(210,225,255,.35)"; for(let i=0;i<18;i++){ const yy=WIN.y+((rnd(i+1340)*WIN.h+t*(6+rnd(i+1350)*10)*L)%WIN.h), xx=WIN.x+rnd(i+1360)*WIN.w; x.beginPath(); x.arc(xx,yy,(1.6+rnd(i+1370)*2)*L,0,2*PI); x.fill(); } x.restore();
      const fl=.05+.03*Math.sin(t*2.3)+.02*Math.sin(t*5.1), lp=x.createRadialGradient(W*.1,H*.92,0,W*.1,H*.92,W*.5); lp.addColorStop(0,`rgba(255,170,80,${fl})`); lp.addColorStop(1,"rgba(255,170,80,0)"); x.fillStyle=lp; x.fillRect(0,0,W,H); }
    else if(T==="enfants"){ const sx=W*(V?.16:.1), sy=H*(V?.08:.13), sr=(V?46:40)*L; x.save(); x.translate(sx,sy); x.rotate(t*.25); x.fillStyle="#FFD23F"; for(let i=0;i<12;i++){ x.rotate(PI/6); x.beginPath(); x.moveTo(sr*1.15,-6*L); x.lineTo(sr*1.75,0); x.lineTo(sr*1.15,6*L); x.closePath(); x.fill(); } x.restore(); x.fillStyle="#FFC300"; x.beginPath(); x.arc(sx,sy,sr,0,2*PI); x.fill(); x.fillStyle="#FFE066"; x.beginPath(); x.arc(sx-sr*.25,sy-sr*.25,sr*.45,0,2*PI); x.fill();
      for(let k=0;k<4;k++){ const w=(V?150:170)*L*(.8+rnd(k+1400)*.5), cx=((t*(8+k*3)*L+rnd(k+1410)*W*2)%(W+w*2))-w, cy=H*(.08+k*.06)+(V?H*.04:0); puff(x,cx,cy,w,"rgba(255,255,255,.95)"); }
      for(let i=0;i<4;i++){ const p=t*.05+rnd(i+1450), bx=W*(.1+.8*((p*(1+i*.2))%1)), by=H*(.7+.06*Math.sin(t*.9+i*2))-(V?0:H*.02); butterfly(x,bx,by,(V?13:11)*L,t*9+i,["#FF6B9A","#B78CFF","#FF9F43","#4CC9F0"][i],"#FFD93B"); } }
    else if(T==="livre"){ const gr=x.createRadialGradient(W*(.5+.15*Math.sin(t*.1)),H*.4,0,W/2,H*.4,W*.9); gr.addColorStop(0,"rgba(255,220,160,.07)"); gr.addColorStop(1,"rgba(255,220,160,0)"); x.fillStyle=gr; x.fillRect(0,0,W,H); } }
  /* « autres angles » : la caméra respire et change de cadrage tous les quelques versets */
  function camera(t,k){ if(T==="minimal"||T==="rouleau"||ENS) return {z:1,x:0,y:0,r:0}; const shot=Math.floor(Math.max(0,k)/3)%3, z0=[1.02,1.09,1.05][shot], br=.008*(.5+.5*Math.sin(t*.35)); return {z:z0+br,x:[0,-.012,.012][shot]*W,y:[0,-.01,.008][shot]*H,r:[0,-.004,.004][shot]+.0015*Math.sin(t*.2)}; }
  let prevK=-1, camFrom={z:1,x:0,y:0,r:0}, camAt=0;
  function draw(t){ g.setTransform(K,0,0,K,0,0); g.globalAlpha=1; g.filter="none"; g.globalCompositeOperation="source-over"; const vt=Math.max(0,t+SYNC), k=itemAt(vt), it=items[k], next=items[k+1];
    let cam=camera(t,k); if(k!==prevK){ camFrom=prevK<0?cam:camera(t,prevK); camAt=t; prevK=k; } const cq=easeIO((t-camAt)/1.6); cam={z:camFrom.z+(cam.z-camFrom.z)*cq,x:camFrom.x+(cam.x-camFrom.x)*cq,y:camFrom.y+(cam.y-camFrom.y)*cq,r:camFrom.r+(cam.r-camFrom.r)*cq};
    g.save(); g.translate(W/2+cam.x,H/2+cam.y); g.rotate(cam.r); g.scale(cam.z,cam.z); g.translate(-W/2,-H/2); g.drawImage(bg,0,0,W,H); live(g,t);
    const studio=(typeof window!=="undefined"&&window.SP_FX)||null; if(studio&&EFF!=="aucune") studio.ambiance(g,EFF,{W,H,L,t,acc:P.acc,acc2:P.acc2,k:V?.72:1});
    subtitlePanel(g,t);
    /* Les transitions typographiques se terminent AVANT le timecode suivant. À it.a le nouveau texte est donc déjà
       entièrement lisible : les effets décoratifs ne peuvent jamais retarder un sous-titre par rapport à la voix. */
    const td=TR==="precise"?0:Math.min(.24,next?Math.max(.08,(next.a-it.a)*.08):.24), pre=!!(next&&td>0&&vt>=next.a-td&&vt<next.a), tq=pre?easeIO(cl((vt-(next.a-td))/td)):0;
    const current=(z,tt)=>{ if(!z) return; const age=Math.max(0,vt-z.a), aq=cl(age/.22), cx=box.x+box.w/2, cy=box.y+box.h/2; g.save();
      if(AN==="rise") g.translate(0,(1-ease(aq))*9*L); else if(AN==="focus"&&age<.22) g.filter=`blur(${((1-aq)*1.2*L).toFixed(1)}px)`; else if(AN==="breathe"){ const s=.992+.008*ease(aq); g.translate(cx,cy); g.scale(s,s); g.translate(-cx,-cy); }
      drawText(g,z,tt,1,0,0); g.restore(); if(AN==="glow"&&age<.55){ const a=(1-age/.55)*.2, gr=g.createRadialGradient(cx,cy,0,cx,cy,box.w*.48); gr.addColorStop(0,rgba(P.gold,a)); gr.addColorStop(1,rgba(P.gold,0)); g.save(); g.globalCompositeOperation="screen"; g.fillStyle=gr; g.fillRect(box.x,box.y,box.w,box.h); g.restore(); } };
    if(T==="rouleau"){ const step=box.h*(o.textScale>1.1?1:.86); g.save(); g.beginPath(); g.rect(V?W*.08:W*.18,H*.1,V?W*.84:W*.64,H*.8); g.clip(); for(let j=Math.max(0,k-2);j<=Math.min(items.length-1,k+2);j++){ const d=j-k, a=j===k?1:Math.max(0,.38-.14*Math.abs(d)); if(a<=0) continue; g.save(); g.translate(0,d*step); drawText(g,items[j],vt,a,0,0); g.restore(); } g.restore(); }
    else if(pre){
      /* Avant la limite, seul le passage encore prononcé reste affiché. La transition est un ornement non
         bloquant ; le texte suivant ne remplace celui-ci qu'à son timecode exact, déjà entièrement lisible. */
      current(it,vt); const sx=TR==="rtl"?box.x+box.w*(1-tq):box.x+box.w*tq, sw=box.w*(TR==="page"?.1:.18), a=Math.sin(tq*PI);
      g.save(); g.globalCompositeOperation="screen";
      if(TR==="sacred_fade"||TR==="zoom"){ const rr=box.w*(TR==="zoom"?(.08+.5*tq):.52), gr=g.createRadialGradient(box.x+box.w/2,box.y+box.h/2,0,box.x+box.w/2,box.y+box.h/2,rr); gr.addColorStop(0,rgba(P.gold,.16*a)); gr.addColorStop(1,rgba(P.gold,0)); g.fillStyle=gr; g.fillRect(box.x,box.y,box.w,box.h); }
      else { const gr=g.createLinearGradient(sx-sw,0,sx+sw,0); gr.addColorStop(0,"rgba(255,225,145,0)"); gr.addColorStop(.5,`rgba(255,225,145,${.34*a})`); gr.addColorStop(1,"rgba(255,225,145,0)"); g.fillStyle=gr; g.fillRect(box.x,box.y,box.w,box.h); }
      g.restore(); }
    else current(it,vt);
    if(ENS) drawAvatar(g,t,vt,it);
    chrome(g,t,it); g.restore();
    if(T==="minimal"&&it&&it.kind==="verset"){ g.save(); g.globalAlpha=.06; g.fillStyle="#C9A24A"; g.font=`700 ${Math.round(H*.32)}px ${AR}`; g.textAlign="center"; g.textBaseline="middle"; g.fillText(arNum(it.n),W/2,H*.5); g.restore(); }
    vignette(g); partBadge(g,t); }
  /* avatar « enseignant » : lèvres sur l'énergie de la vraie voix (o.env, toutes les 40 ms), il montre la tablette au début de chaque verset,
     se balance doucement en récitant ; sans 3D (hors ligne), une silhouette simple garde la place */
  function mouthAt(vt){ const E=o.env; if(E&&E.v&&E.v.length){ const i=Math.floor(vt/(E.step||.04)); let m=0; for(let d=-1;d<=1;d++){ const v=E.v[i+d]; if(v!=null) m=Math.max(m,v*(d?.7:1)); } return cl((m/100-.14)/.55); }
    const it=items[itemAt(vt)]; if(!it||!(it.speech||[]).some(z=>vt>=z.a&&vt<z.b)) return 0; return .3+.4*Math.abs(Math.sin(vt*8.3))*(.6+.4*Math.sin(vt*3.1)); }
  function drawAvatar(x,t,vt,it){ const A=typeof window!=="undefined"&&window.SP_AVATAR, av=o.avatar||{};
    if(!A||!A.ready()){ x.save(); x.fillStyle="rgba(58,38,20,.28)"; const cx=AVR.x+AVR.w/2, cy=AVR.y+AVR.h*.42, r=AVR.w*.13; x.beginPath(); x.arc(cx,cy,r,0,7); x.fill(); x.beginPath(); x.ellipse(cx,cy+r*3.1,r*2.2,r*1.9,0,Math.PI,0); x.fill(); x.restore(); return; }
    const m=mouthAt(vt), age=it?vt-it.a:99, point=it&&it.kind==="verset"?(age<.35?age/.35:age<2.2?1:age<2.7?1-(age-2.2)/.5:0):0;
    const ws=it&&(it.speech||[]).find(z=>vt>=z.a-.05&&vt<z.b+.3), since=ws?vt-ws.a:9;
    if(T==="daara"){ const kidsTurn=o.roles!=="prof"&&!!it&&(it.rep||1)%2===0;   /* « répète après moi » : la répétition est dite par les élèves */
      const P2=kidsTurn?{prof:{listen:true, look:{x:0,y:-.35}}, kids:{mouth:m, speak:m>.05, since, rock:true}}:{prof:{mouth:m, speak:m>.05, since, point, side:1, rock:m>.05}, kids:{listen:true, rock:false}};
      const c=A.render(AVR.w*K,AVR.h*K,t,P2,{scene:"daara", style:av.style||"blanc", skin:av.skin||"fonce"}); if(c) x.drawImage(c,AVR.x,AVR.y,AVR.w,AVR.h); return; }
    /* garçon seul : il explique parfois avec les mains pendant un long passage, et tourne la page entre deux versets */
    const quiet=m<.05&&since>1.2, longSpeech=m>.05&&since>3, beat=Math.floor(t/5.5), open=longSpeech&&rnd(beat+77)>.55?Math.sin(((t%5.5)/5.5)*Math.PI):0, page=quiet&&it&&rnd(Math.floor(t/7)+33)>.7?((t%7)/7):0;
    const c=A.render(AVR.w*K,AVR.h*K,t,{mouth:m, speak:m>.05, since, point, side:1, open, page, rock:m>.05&&!!it&&it.kind!=="titre"},{scene:"solo", style:av.style||"indigo", skin:av.skin||"fonce"}); if(c) x.drawImage(c,AVR.x,AVR.y,AVR.w,AVR.h); }
  /* parties pour TikTok et Shorts : « Partie 2/4 », hors du mouvement de caméra */
  function partBadge(x,t){ const P2=o.parts; if(!P2||P2.length<2) return; const k=P2.findIndex(([a,b])=>t>=a-.01&&t<b); if(k<0) return; x.save(); x.direction="ltr";
    const txt=`Partie ${k+1}/${P2.length}`; x.font=`700 ${Math.round((V?26:19)*L)}px ${LAT}`; const h=(V?44:34)*L, w=x.measureText(txt).width+30*L, bx=(V?26:20)*L, by=(V?28:18)*L;
    rrect(x,bx,by,w,h,h/2); x.fillStyle="rgba(0,0,0,.45)"; x.fill(); x.strokeStyle=P.gold; x.lineWidth=1.5*L; x.stroke(); x.fillStyle="#FFFFFF"; x.textAlign="left"; x.textBaseline="middle"; x.fillText(txt,bx+15*L,by+h/2+1*L); x.restore(); }
  function vignette(x){ const va=T==="enfants"?0:T==="paysage"||T==="lofi"||ENS?.25:.35; if(!va) return; const vg=x.createRadialGradient(W/2,H/2,Math.min(W,H)*.45,W/2,H/2,Math.hypot(W,H)/1.7); vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,`rgba(0,0,0,${va})`); x.fillStyle=vg; x.fillRect(0,0,W,H); }
  /* miniature YouTube (ou couverture de Short) : le même décor, un grand titre lisible de loin */
  function poster(p){ p=p||{}; g.setTransform(K,0,0,K,0,0); g.globalAlpha=1; g.filter="none"; g.globalCompositeOperation="source-over"; g.drawImage(bg,0,0,W,H); live(g,6);
    const ens=ENS, AA=typeof window!=="undefined"&&window.SP_AVATAR;
    /* enseignant : le garçon souriant, le titre écrit sur sa tablette */
    if(ens&&AA&&AA.ready()){ const av=o.avatar||{}, c0=AA.render(AVR.w*K,AVR.h*K,2.2,T==="daara"?{prof:{mouth:0},kids:{listen:true}}:{mouth:0},{scene:T==="daara"?"daara":"solo",style:av.style||(T==="daara"?"blanc":"indigo"),skin:av.skin||"fonce"}); if(c0) g.drawImage(c0,AVR.x,AVR.y,AVR.w,AVR.h); }
    if(T!=="enfants"&&!ens){ const sh=g.createLinearGradient(0,0,0,H); sh.addColorStop(0,"rgba(0,0,0,.25)"); sh.addColorStop(.5,"rgba(0,0,0,.5)"); sh.addColorStop(1,"rgba(0,0,0,.3)"); g.fillStyle=sh; g.fillRect(0,0,W,H); }
    g.textAlign="center"; g.textBaseline="middle"; const cx=ens?BOARD.x+BOARD.w/2:W/2, MW=ens?BOARD.w*.9:W*.9, kid=T==="enfants"; let y=ens?BOARD.y+BOARD.h*(p.ar?.3:.45):H*(V?.34:p.ar?.28:.4);
    if(p.ar){ g.save(); g.direction=isRtl(p.ar)?"rtl":"ltr"; g.font=`700 ${Math.round((V?110:96)*L)}px ${AR_T}`; if(kid){ g.lineJoin="round"; g.lineWidth=12*L; g.strokeStyle="#fff"; g.strokeText(p.ar,cx,y); } else { g.shadowColor="rgba(0,0,0,.7)"; g.shadowBlur=20*L; } g.fillStyle=P.gold; g.fillText(p.ar,cx,y); g.restore(); y+=(V?150:118)*L; }
    if(p.titre){ const t=String(p.titre).toUpperCase(); let fs=(V?118:112)*L; g.font=`700 ${Math.round(fs)}px ${kid?KID:LAT}`; while(g.measureText(t).width>MW&&fs>28*L){ fs-=4*L; g.font=`700 ${Math.round(fs)}px ${kid?KID:LAT}`; }
      const gr=g.createLinearGradient(0,y-fs*.5,0,y+fs*.5); gr.addColorStop(0,kid?"#FF9F1C":ens?"#C4602A":"#FFF7DA"); gr.addColorStop(.55,kid?"#FF6B00":ens?"#9A3C12":P.gold); gr.addColorStop(1,kid?"#E85D04":ens?"#6E2A0C":"#B8860B");
      g.save(); g.lineJoin="round"; g.lineWidth=fs*(kid?.14:ens?.05:.07); g.strokeStyle=kid?"#FFFFFF":ens?"rgba(255,246,225,.9)":"rgba(20,12,0,.85)"; g.strokeText(t,cx,y); g.shadowColor="rgba(0,0,0,.5)"; g.shadowBlur=kid?0:18*L; g.fillStyle=gr; g.fillText(t,cx,y); g.restore(); y+=fs*.92; }
    if(p.sous){ g.save(); g.direction="ltr"; let fs=(V?46:38)*L; g.font=`${kid?"700":"600"} ${Math.round(fs)}px ${kid?KID:SANS}`; while(g.measureText(p.sous).width>MW&&fs>20*L){ fs-=2*L; g.font=`${kid?"700":"600"} ${Math.round(fs)}px ${kid?KID:SANS}`; }
      if(kid){ g.lineJoin="round"; g.lineWidth=8*L; g.strokeStyle="#fff"; g.strokeText(p.sous,cx,y); g.fillStyle="#1E3A8A"; } else if(ens){ g.fillStyle="#3A2614"; } else { g.shadowColor="rgba(0,0,0,.8)"; g.shadowBlur=12*L; g.fillStyle="#FFFFFF"; } g.fillText(p.sous,cx,y); g.restore(); }
    if(p.badge){ g.save(); g.direction="ltr"; g.font=`700 ${Math.round(34*L)}px ${kid?KID:SANS}`; const bw=g.measureText(p.badge).width+44*L, bx=28*L, by=28*L; rrect(g,bx,by,bw,60*L,30*L); g.fillStyle=kid?"#FF6B00":P.gold; g.fill(); g.fillStyle=kid?"#fff":"#1A1204"; g.textAlign="left"; g.fillText(p.badge,bx+22*L,by+32*L); g.restore(); }
    vignette(g); return c; }
  return {canvas:c,W,H,K,draw,poster,total,fmt:V?"9:16":Q?"1:1":"16:9",activeAt:t=>itemAt(Math.max(0,(Number(t)||0)+SYNC))};
}

/* Calage des textes sur la voix (aucune IA) : chaque coupure tombe dans une pause, et chaque texte reçoit un temps de parole proche de sa longueur
   (lettres sans les signes de lecture). Programmation dynamique fenêtrée : rapide même pour 5 h de récitation et des milliers de versets.
   speech = [{a,b}] morceaux de parole (pauses repérées par FFmpeg) ; texts = textes dans l'ordre. Rend [{a,b}] pour chaque texte. */
function align(speech, texts, opts){
  const segs=(speech||[]).filter(s=>s&&s.b>s.a).map(s=>({a:+s.a,b:+s.b})).sort((x,y)=>x.a-y.a), voiced=segs.map(s=>({a:s.a,b:s.b})), n=(texts||[]).length, detected=segs.length; if(!segs.length||!n) return [];
  /* Chaque passage garde aussi ses fenêtres de parole réelles. La progression lumineuse se fige donc pendant
     les respirations au lieu de continuer artificiellement jusqu'au passage suivant. */
  const meta=out=>{ out.forEach(c=>{ c.speech=voiced.filter(s=>s.b>c.a&&s.a<c.b).map(s=>({a:+Math.max(c.a,s.a).toFixed(2),b:+Math.min(c.b,s.b).toFixed(2)})); }); out.syntheticCuts=Math.max(0,n-detected); out.detected=detected; out.confidence=out.syntheticCuts?Math.max(.08,Math.min(.65,detected/n)):Math.max(.72,Math.min(1,n/Math.max(n,detected))); return out; };
  const start=segs[0].a, end=segs[segs.length-1].b; if(n===1) return meta([{a:+start.toFixed(2),b:+end.toFixed(2)}]);
  /* pas assez de pauses pour tous les textes : les plus longs morceaux sont coupés en deux */
  while(segs.length<n){ let bi=-1, bd=0; segs.forEach((s,i)=>{ if(s.b-s.a>bd){ bd=s.b-s.a; bi=i; } }); if(bi<0||bd<.4) break; const m=(segs[bi].a+segs[bi].b)/2; segs.splice(bi,1,{a:segs[bi].a,b:m},{a:m,b:segs[bi].b}); }
  const m=segs.length-1;   /* coupure possible c (0..m-1) = début du morceau c+1 */
  if(m<n-1){ const out=[]; for(let j=0;j<n;j++) out.push({a:+(start+(end-start)*j/n).toFixed(2),b:+(start+(end-start)*(j+1)/n).toFixed(2)}); return meta(out); }
  const cum=[0]; segs.forEach(s=>cum.push(cum[cum.length-1]+s.b-s.a)); const total=cum[segs.length];
  const gap=c=>segs[c+1].a-segs[c].b, before=c=>c<0?0:cum[c+1];   /* parole avant la coupure c */
  const units=texts.map(x=>Math.max(4,String(x).replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\s]/g,"").length)), tot=units.reduce((p,q)=>p+q,0);
  const expB=[]; let acc=0; for(let j=0;j<n-1;j++){ acc+=units[j]; expB.push(total*acc/tot); }
  const idxNear=v=>{ let lo=0, hi=m-1; while(lo<hi){ const md=(lo+hi)>>1; if(before(md)<v) lo=md+1; else hi=md; } return lo; };
  /* signes d'arrêt (waqf) du texte : le récitant reprend souvent son souffle à ces endroits ; un verset en a donc à peu près autant de morceaux de parole + 1.
     Les pauses sont comparées à la pause habituelle de ce récitant (médiane). */
  const wq=texts.map(x=>(String(x).match(/[ۖ-ۛ]/g)||[]).length), useW=wq.some(Boolean), LAM=(typeof window!=="undefined"&&window.__alignLam!=null)?window.__alignLam:.35, GB=(typeof window!=="undefined"&&window.__alignGap!=null)?window.__alignGap:.3;
  const gaps=[]; for(let c=0;c<m;c++) gaps.push(gap(c)); const med=gaps.slice().sort((x,y)=>x-y)[gaps.length>>1]||.5;
  const segTerm=(j,ns)=>{ if(!useW) return 0; const E=1+.8*wq[j]+units[j]/80*.25; return LAM*Math.pow(ns-E,2)/(1+E); };
  /* repères d'écoute (facultatifs) : « à t secondes, le récitant en est à la fraction f du texte k » (reconnu par Gemini ou Whisper) ; un texte doit les respecter */
  const anc=texts.map(()=>[]); ((opts&&opts.anchors)||[]).forEach(x=>{ if(x&&x.k>=0&&x.k<n&&isFinite(x.t)) anc[x.k].push(x); });
  const ancTerm=(j,p,c)=>{ if(!anc[j].length) return 0; const s0=p<0?start:segs[p+1].a, s1=c>=m?end:segs[c].b; let v=0;
    anc[j].forEach(x=>{ if(x.f<.02) v+=4*Math.min(25,Math.pow(s0-x.t,2)); else { if(x.t<s0-.3) v+=4*Math.min(25,Math.pow(s0-x.t,2)); if(x.t>s1+.3) v+=4*Math.min(25,Math.pow(x.t-s1,2)); } }); return v; };
  const cost=(j,p,c)=>{ const d=before(c)-before(p), e=total*units[j]/tot; return Math.pow((d-e)/(e+.8),2)-GB*Math.min(2.5,gap(c)/med)+segTerm(j,c-p)+ancTerm(j,p,c); };
  const WIN=Math.max(25,Math.ceil(3*m/n)+10), rows=[]; let prev=new Map([[-1,{v:0,from:null}]]);
  const cutNear=t=>{ let lo=0, hi=m-1; while(lo<hi){ const md=(lo+hi)>>1; if(segs[md+1].a<t) lo=md+1; else hi=md; } return lo; };   /* coupure dont la parole suivante commence vers t */
  for(let j=0;j<n-1;j++){ const lo0=j, hi0=m-(n-1-j), a1=(anc[j+1]||[]).find(x=>x.f<.02), m1=idxNear(expB[j]), m2=a1?cutNear(a1.t):m1, mid=Math.min(m1,m2), mid2=Math.max(m1,m2); let row=new Map();
    const fill=(lo,hi)=>{ for(let c=lo;c<=hi;c++){ let best=Infinity, from=null; for(const [p,pv] of prev){ if(p>=c) continue; const v=pv.v+cost(j,p,c); if(v<best){ best=v; from=p; } } if(from!==null||prev.has(-1)&&best<Infinity) row.set(c,{v:best,from}); } };
    fill(Math.max(lo0,mid-WIN),Math.min(hi0,mid2+WIN)); if(!row.size) fill(lo0,hi0);
    rows.push(row); prev=row; }
  let best=Infinity, last=null; for(const [p,pv] of prev){ const d=total-before(p), e=total*units[n-1]/tot, v=pv.v+Math.pow((d-e)/(e+.8),2)+segTerm(n-1,m-p)+ancTerm(n-1,p,m); if(v<best){ best=v; last=p; } }
  const cuts=new Array(n-1); let c=last; for(let j=n-2;j>=0;j--){ cuts[j]=c; const r=rows[j].get(c); c=r?r.from:null; }
  const starts=[start].concat(cuts.map(ci=>ci==null?null:segs[ci+1].a)); for(let j=1;j<n;j++) if(starts[j]==null||starts[j]<=starts[j-1]) starts[j]=starts[j-1]+.3;
  return meta(starts.map((a,j)=>({a:+a.toFixed(2),b:+(j<n-1?starts[j+1]:Math.max(end,a+.3)).toFixed(2)}))); }

window.SP_RECIT={version:2, themes:THEMES, fx:FX, fonts:AR_FONTS, loadFont, ready, stage, align, arNum, isRtl:t=>/[\u0590-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(String(t||""))};
})();
