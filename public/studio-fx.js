/* Studio Prompt : bibliothèque d'effets du Constructeur.
   Sous-titres, transitions, effets d'image (étalonnage), couleurs, styles de titres, animations de titres, mouvements de caméra :
   au moins 50 modèles par catégorie, construits par paramètres comme les préréglages des logiciels de montage
   (masques, modes de fusion, flous, grain, lueurs, courbes d'animation…). Fonctions pures : elles dessinent sur le contexte 2D reçu.
   Aucune dépendance, aucun réseau : tout marche hors ligne et gratuitement. */
(function(){
"use strict";
const PI=Math.PI, cl=(v,a,b)=>Math.max(a==null?0:a,Math.min(b==null?1:b,v));
/* courbes d'animation (comme les « easings » des logiciels d'animation) */
const E={
  lin:p=>p, inQ:p=>p*p, outQ:p=>1-(1-p)*(1-p), inOutQ:p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2,
  outC:p=>1-Math.pow(1-p,3), inOutC:p=>p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2, inOutS:p=>-(Math.cos(PI*p)-1)/2,
  outBack:p=>{ const c1=1.70158, c3=c1+1; return 1+c3*Math.pow(p-1,3)+c1*Math.pow(p-1,2); },
  outElastic:p=>p<=0?0:p>=1?1:Math.pow(2,-10*p)*Math.sin((p*10-.75)*(2*PI/3))+1,
  outBounce:p=>{ const n=7.5625, d=2.75; if(p<1/d) return n*p*p; if(p<2/d) return n*(p-=1.5/d)*p+.75; if(p<2.5/d) return n*(p-=2.25/d)*p+.9375; return n*(p-=2.625/d)*p+.984375; },
  outExpo:p=>p>=1?1:1-Math.pow(2,-10*p), inExpo:p=>p<=0?0:Math.pow(2,10*p-10)
};
const rnd=i=>{ const x=Math.sin(i*127.1+311.7)*43758.5453; return x-Math.floor(x); };
const pool={}; const tmp=(k,w,h)=>{ let c=pool[k]; if(!c) c=pool[k]=document.createElement("canvas"); w=Math.max(1,Math.round(w)); h=Math.max(1,Math.round(h)); if(c.width!==w||c.height!==h){ c.width=w; c.height=h; } return c; };
const rgba=(hex,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(String(hex||"")); if(!m) return hex; const n=parseInt(m[1],16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; };
const lum=hex=>{ const m=/^#?([0-9a-f]{6})$/i.exec(String(hex||"")); if(!m) return .5; const n=parseInt(m[1],16), f=v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }; return .2126*f(n>>16&255)+.7152*f(n>>8&255)+.0722*f(n&255); };
const onCol=hex=>lum(hex)>.42?"#141414":"#FFFFFF";

/* ================= MOUVEMENTS DE CAMÉRA sur les photos et vidéos (zoom, travelling, rotation, caméra à l'épaule…) ================= */
const MOVES={}; const mv=(id,nom,f)=>{ MOVES[id]={id,nom,f}; };
const ANC={c:[0,0,"centre"],hg:[-1,-1,"haut gauche"],hd:[1,-1,"haut droite"],bg:[-1,1,"bas gauche"],bd:[1,1,"bas droite"],g:[-1,0,"gauche"],d:[1,0,"droite"],h:[0,-1,"haut"],b:[0,1,"bas"]};
Object.entries(ANC).forEach(([k,[ax,ay,n]])=>{
  mv(`zoom_avant_${k}`,`Zoom avant · ${n}`,p=>{ const q=E.inOutS(p); return {z:1.02+.16*q,x:-ax*.045*q,y:-ay*.045*q,r:0}; });
  mv(`zoom_arriere_${k}`,`Zoom arrière · ${n}`,p=>{ const q=E.inOutS(p); return {z:1.18-.16*q,x:-ax*.045*(1-q),y:-ay*.045*(1-q),r:0}; }); });
const DIR={g:[-1,0,"vers la gauche"],d:[1,0,"vers la droite"],h:[0,-1,"vers le haut"],b:[0,1,"vers le bas"],hg:[-1,-1,"en haut à gauche"],hd:[1,-1,"en haut à droite"],bg:[-1,1,"en bas à gauche"],bd:[1,1,"en bas à droite"]};
Object.entries(DIR).forEach(([k,[dx,dy,n]])=>{ mv(`travelling_${k}`,`Travelling ${n}`,p=>{ const q=E.inOutS(p)-.5; return {z:1.14,x:-dx*.1*q,y:-dy*.1*q,r:0}; }); });
["g","d","h","b"].forEach(k=>{ const [dx,dy,n]=DIR[k]; mv(`dolly_${k}`,`Dolly (zoom + travelling) ${n}`,p=>{ const q=E.inOutS(p); return {z:1.04+.16*q,x:-dx*.05*q,y:-dy*.05*q,r:0}; }); });
mv("rotation_horaire","Rotation lente (horaire)",p=>({z:1.16,x:0,y:0,r:(E.inOutS(p)-.5)*.07}));
mv("rotation_anti","Rotation lente (anti-horaire)",p=>({z:1.16,x:0,y:0,r:-(E.inOutS(p)-.5)*.07}));
mv("zoom_rotation_h","Zoom et rotation (horaire)",p=>{ const q=E.inOutS(p); return {z:1.04+.2*q,x:0,y:0,r:q*.06}; });
mv("zoom_rotation_a","Zoom et rotation (anti-horaire)",p=>{ const q=E.inOutS(p); return {z:1.04+.2*q,x:0,y:0,r:-q*.06}; });
mv("poussee_rapide","Poussée rapide",p=>({z:1+.32*E.outExpo(p),x:0,y:0,r:0}));
mv("recul_rapide","Recul rapide",p=>({z:1.32-.32*E.outExpo(p),x:0,y:0,r:0}));
mv("crash_zoom","Crash zoom (coup de zoom)",p=>({z:p<.15?1+.35*E.outExpo(p/.15):1.35+.03*(p-.15),x:0,y:0,r:0}));
mv("zoom_secousse","Zoom avec secousse",(p,t)=>{ const a=.012*(1-p); return {z:1.04+.12*E.outC(p),x:a*Math.sin(t*41),y:a*Math.cos(t*37),r:a*.6*Math.sin(t*29)}; });
mv("epaule","Caméra à l'épaule",(p,t)=>({z:1.08,x:.006*Math.sin(t*1.3)+.004*Math.sin(t*2.9),y:.005*Math.sin(t*1.7+1)+.003*Math.sin(t*3.7),r:.004*Math.sin(t*1.1)}));
mv("epaule_forte","Caméra à l'épaule (forte)",(p,t)=>({z:1.12,x:.016*Math.sin(t*1.9)+.01*Math.sin(t*4.3),y:.013*Math.sin(t*2.3+1)+.008*Math.sin(t*5.1),r:.01*Math.sin(t*1.6)}));
mv("pulsation","Pulsation sur le rythme",(p,t)=>({z:1.03+.035*Math.pow(Math.max(0,Math.cos(t*2*PI*2)),6),x:0,y:0,r:0}));
mv("ken_burns","Ken Burns classique",p=>{ const q=E.inOutS(p); return {z:1.05+.1*q,x:.02-.04*q,y:.01-.02*q,r:0}; });
mv("vertige","Vertige",(p,t)=>({z:1.06+.22*E.inOutS(p),x:0,y:0,r:.02*Math.sin(t*3)}));
mv("fixe","Fixe",()=>({z:1,x:0,y:0,r:0}));
mv("zoom_lent_avant","Zoom lent avant",p=>({z:1+.06*p,x:0,y:0,r:0}));
mv("zoom_lent_arriere","Zoom lent arrière",p=>({z:1.06-.06*p,x:0,y:0,r:0}));
mv("plongee","Plongée (la caméra descend)",p=>({z:1.12,x:0,y:.05-.1*E.inOutS(p),r:0}));
mv("contre_plongee","Contre-plongée (la caméra monte)",p=>({z:1.12,x:0,y:-.05+.1*E.inOutS(p),r:0}));
mv("orbite","Orbite",p=>({z:1.1,x:.025*Math.cos(2*PI*p),y:.025*Math.sin(2*PI*p),r:0}));
mv("derive_g","Dérive douce à gauche",p=>({z:1.06,x:.015-.03*p,y:0,r:0}));
mv("derive_d","Dérive douce à droite",p=>({z:1.06,x:-.015+.03*p,y:0,r:0}));
const MOVE_ALIAS={zoom_avant:"zoom_avant_c",zoom_arriere:"zoom_arriere_c",glisse_gauche:"travelling_g",glisse_droite:"travelling_d",fixe:"fixe"};
function move(id,p,t){ const m=MOVES[id]||MOVES[MOVE_ALIAS[id]]||MOVES.zoom_avant_c; return m.f(cl(p),t||0); }

/* ================= EFFETS D'IMAGE : étalonnage (filtres) + calques par-dessus (grain, vignette, fuites de lumière, VHS…) ================= */
const noiseTile=(()=>{ let c=null; return ()=>{ if(c) return c; c=document.createElement("canvas"); c.width=c.height=192; const x=c.getContext("2d"), d=x.createImageData(192,192); for(let i=0;i<d.data.length;i+=4){ const v=Math.floor(rnd(i*.37+1)*255); d.data[i]=d.data[i+1]=d.data[i+2]=v; d.data[i+3]=255; } x.putImageData(d,0,0); return c; }; })();
const lineTile=(()=>{ let c=null; return ()=>{ if(c) return c; c=document.createElement("canvas"); c.width=4; c.height=4; const x=c.getContext("2d"); x.fillStyle="rgba(0,0,0,.55)"; x.fillRect(0,0,4,1.5); return c; }; })();
const dotTile=s=>{ const k="dot"+s; let c=pool[k]; if(c) return c; c=pool[k]=document.createElement("canvas"); c.width=c.height=s; const x=c.getContext("2d"); x.fillStyle="#fff"; x.fillRect(0,0,s,s); x.fillStyle="#000"; x.beginPath(); x.arc(s/2,s/2,s*.32,0,2*PI); x.fill(); return c; };
const OV={
  vignette:(a,col)=>(G,o)=>{ const r=Math.hypot(o.W,o.H)/2, gr=G.createRadialGradient(o.W/2,o.H/2,r*.42,o.W/2,o.H/2,r); gr.addColorStop(0,rgba(col||"#000000",0)); gr.addColorStop(1,rgba(col||"#000000",a)); G.fillStyle=gr; G.fillRect(0,0,o.W,o.H); },
  grain:a=>(G,o)=>{ const n=noiseTile(), f=Math.floor((o.t||0)*24); G.save(); G.globalCompositeOperation="overlay"; G.globalAlpha=a; const pat=G.createPattern(n,"repeat"); G.translate(-Math.floor(rnd(f)*192),-Math.floor(rnd(f+9)*192)); G.fillStyle=pat; G.fillRect(0,0,o.W+192,o.H+192); G.restore(); },
  tint:(col,a,mode)=>(G,o)=>{ G.save(); G.globalCompositeOperation=mode||"soft-light"; G.globalAlpha=a; G.fillStyle=col; G.fillRect(0,0,o.W,o.H); G.restore(); },
  grad:(c1,c2,a,mode)=>(G,o)=>{ G.save(); G.globalCompositeOperation=mode||"soft-light"; G.globalAlpha=a; const gr=G.createLinearGradient(0,0,o.W*.3,o.H); gr.addColorStop(0,c1); gr.addColorStop(1,c2); G.fillStyle=gr; G.fillRect(0,0,o.W,o.H); G.restore(); },
  fade:a=>(G,o)=>{ G.save(); G.globalCompositeOperation="screen"; G.fillStyle=`rgba(60,60,60,${a})`; G.fillRect(0,0,o.W,o.H); G.restore(); },
  leak:(c1,c2,a)=>(G,o)=>{ const t=o.t||0; G.save(); G.globalCompositeOperation="screen"; [[c1,.15+.1*Math.sin(t*.7),.12+.08*Math.cos(t*.5),.75],[c2,.9+.08*Math.cos(t*.6),.85+.06*Math.sin(t*.8),.6]].forEach(([c,x,y,r])=>{ const R=Math.max(o.W,o.H)*r, gr=G.createRadialGradient(o.W*x,o.H*y,0,o.W*x,o.H*y,R); gr.addColorStop(0,rgba(c,a)); gr.addColorStop(1,rgba(c,0)); G.fillStyle=gr; G.fillRect(0,0,o.W,o.H); }); G.restore(); },
  scan:a=>(G,o)=>{ G.save(); G.globalAlpha=a; G.fillStyle=G.createPattern(lineTile(),"repeat"); G.setTransform(1,0,0,1,0,((o.t||0)*20)%4); G.fillRect(0,-4,o.W,o.H+8); G.restore(); },
  halftone:(s,a)=>(G,o)=>{ G.save(); G.globalCompositeOperation="multiply"; G.globalAlpha=a; G.fillStyle=G.createPattern(dotTile(Math.max(4,Math.round(s*o.W/1080))),"repeat"); G.fillRect(0,0,o.W,o.H); G.restore(); },
  bars:k=>(G,o)=>{ const h=o.H>o.W?o.H*k*.5:Math.max(0,(o.H-o.W/2.39)/2); G.fillStyle="#000"; G.fillRect(0,0,o.W,h); G.fillRect(0,o.H-h,o.W,h); },
  bloom:a=>(G,o)=>{ const s=tmp("bloom",o.W/6,o.H/6), x=s.getContext("2d"); x.filter="blur(4px) brightness(1.15)"; x.drawImage(G.canvas,0,0,s.width,s.height); x.filter="none"; G.save(); G.globalCompositeOperation="screen"; G.globalAlpha=a; G.drawImage(s,0,0,o.W,o.H); G.restore(); },
  bokeh:(a,cols)=>(G,o)=>{ const t=o.t||0; G.save(); G.globalCompositeOperation="screen"; for(let i=0;i<14;i++){ const x=(rnd(i)*o.W+t*12*(rnd(i+3)-.5)*o.W/100)%o.W, y=(rnd(i+20)*o.H-t*o.H*.02*(1+rnd(i+5)))%o.H, r=o.W*(.03+.06*rnd(i+40)), c=cols[i%cols.length], gr=G.createRadialGradient(x,(y+o.H)%o.H,0,x,(y+o.H)%o.H,r); gr.addColorStop(0,rgba(c,a)); gr.addColorStop(.7,rgba(c,a*.6)); gr.addColorStop(1,rgba(c,0)); G.fillStyle=gr; G.beginPath(); G.arc(x,(y+o.H)%o.H,r,0,2*PI); G.fill(); } G.restore(); },
  dust:a=>(G,o)=>{ const f=Math.floor((o.t||0)*24); G.save(); G.globalAlpha=a; for(let i=0;i<26;i++){ const r=rnd(f*31+i); G.fillStyle=r>.5?"rgba(255,255,255,.7)":"rgba(0,0,0,.6)"; G.beginPath(); G.arc(rnd(f*7+i)*o.W,rnd(f*13+i)*o.H,1+r*2.2*o.W/1080,0,2*PI); G.fill(); } if(rnd(f)>.55){ G.fillStyle="rgba(255,255,255,.35)"; G.fillRect(rnd(f+2)*o.W,0,Math.max(1,o.W/900),o.H); } G.restore(); },
  chroma:px=>(G,o)=>{ const d=Math.max(1,Math.round(px*o.W/1080)), src=tmp("chS",o.W,o.H); src.getContext("2d").drawImage(G.canvas,0,0); G.save(); G.globalCompositeOperation="copy"; G.fillStyle="#000"; G.fillRect(0,0,o.W,o.H); G.globalCompositeOperation="lighter";
    [["#FF0000",-d],["#00FF00",0],["#0000FF",d]].forEach(([c,dx],i)=>{ const ch=tmp("ch"+i,o.W,o.H), x=ch.getContext("2d"); x.globalCompositeOperation="copy"; x.drawImage(src,0,0); x.globalCompositeOperation="multiply"; x.fillStyle=c; x.fillRect(0,0,o.W,o.H); x.globalCompositeOperation="source-over"; G.drawImage(ch,dx,0); }); G.restore(); },
  slices:a=>(G,o)=>{ const f=Math.floor((o.t||0)*12); if(rnd(f*3)>a) return; const src=tmp("slS",o.W,o.H); src.getContext("2d").drawImage(G.canvas,0,0); for(let i=0;i<6;i++){ const y=rnd(f*11+i)*o.H, h=o.H*(.01+.04*rnd(f*5+i)), dx=(rnd(f*17+i)-.5)*o.W*.08; G.drawImage(src,0,y,o.W,h,dx,y,o.W,h); } },
  duo:(dark,light)=>(G,o)=>{ G.save(); G.globalCompositeOperation="multiply"; G.fillStyle=light; G.fillRect(0,0,o.W,o.H); G.globalCompositeOperation="screen"; G.fillStyle=dark; G.fillRect(0,0,o.W,o.H); G.restore(); },
  frame:(col,k)=>(G,o)=>{ const w=o.W*k; G.save(); G.strokeStyle=col; G.lineWidth=w*2; G.strokeRect(0,0,o.W,o.H); G.restore(); }
};
const LOOKS={}; const lk=(id,nom,f,ov)=>{ LOOKS[id]={id,nom,f:f||"",ov:ov||[]}; };
lk("naturel","Naturel");
lk("eclatant","Éclatant","saturate(1.35) contrast(1.08)");
lk("cinema","Cinéma sarcelle et orange","contrast(1.12) saturate(1.1)",[OV.grad("#ff8a3d","#0b7a8c",.28),OV.vignette(.35)]);
lk("cinemascope","Cinémascope","contrast(1.12) saturate(1.05)",[OV.grad("#ff9a4d","#0a6d80",.25),OV.bars(.16),OV.vignette(.3)]);
lk("nb","Noir et blanc","grayscale(1) contrast(1.15)");
lk("nb_dur","Noir et blanc contrasté","grayscale(1) contrast(1.55) brightness(.95)",[OV.vignette(.45)]);
lk("sepia","Sépia","sepia(.85) contrast(1.05)",[OV.vignette(.35)]);
lk("vintage","Vintage","sepia(.35) contrast(.92) brightness(1.04) saturate(.9)",[OV.fade(.35),OV.grain(.18),OV.vignette(.4)]);
lk("argentique","Film argentique","contrast(1.05) saturate(.9)",[OV.grain(.22),OV.vignette(.35),OV.dust(.6)]);
lk("chaud","Chaud","sepia(.18) saturate(1.2) brightness(1.03)",[OV.tint("#ff9a3c",.25)]);
lk("froid","Froid","saturate(.92) brightness(1.02)",[OV.tint("#3c8cff",.28)]);
lk("coucher_soleil","Coucher de soleil","saturate(1.25) contrast(1.05)",[OV.grad("#ff5e3a","#ffb347",.35),OV.leak("#ff7a2f","#ff2f6d",.35)]);
lk("nuit_bleue","Nuit bleue","brightness(.82) contrast(1.1) saturate(.85)",[OV.tint("#1e3a8a",.35,"multiply"),OV.vignette(.45)]);
lk("pastel","Pastel","saturate(.7) brightness(1.1) contrast(.9)",[OV.fade(.25)]);
lk("delave","Délavé","contrast(.85) brightness(1.08) saturate(.85)",[OV.fade(.45)]);
lk("pop_vif","Pop vif","saturate(1.65) contrast(1.15)");
lk("reve","Rêve","brightness(1.06) saturate(1.1)",[OV.bloom(.55),OV.fade(.15)]);
lk("neon_lueur","Lueur néon","saturate(1.45) contrast(1.1)",[OV.bloom(.6),OV.tint("#ff2fb3",.18)]);
lk("vhs","Cassette VHS","saturate(1.25) contrast(1.05)",[OV.chroma(5),OV.scan(.35),OV.grain(.15),OV.slices(.25)]);
lk("retro80","Rétro années 80","saturate(1.3) contrast(1.05)",[OV.grad("#ff2fb3","#22d3ee",.3),OV.scan(.25)]);
lk("polaroid","Instantané","contrast(.95) brightness(1.06) sepia(.15)",[OV.fade(.3),OV.frame("#f5f1e6",.025)]);
lk("lumiere_doree","Lumière dorée","saturate(1.15) brightness(1.04)",[OV.leak("#ffc24d","#ff8a3d",.4)]);
lk("duo_violet_jaune","Bichromie violet et jaune","grayscale(1) contrast(1.25)",[OV.duo("#3b0a6b","#ffd23f")]);
lk("duo_bleu_rose","Bichromie bleu et rose","grayscale(1) contrast(1.2)",[OV.duo("#1d2b8f","#ff8fc7")]);
lk("duo_vert","Bichromie vert et noir","grayscale(1) contrast(1.3)",[OV.duo("#0a2e1a","#a3e635")]);
lk("duo_rouge","Bichromie rouge","grayscale(1) contrast(1.3)",[OV.duo("#3d0505","#ff4d4d")]);
lk("matrice","Code vert","grayscale(.6) contrast(1.2) brightness(.9)",[OV.tint("#00ff66",.35,"multiply"),OV.scan(.3)]);
lk("desert","Désert","sepia(.3) saturate(1.2) contrast(1.05)",[OV.tint("#e0a050",.3)]);
lk("ocean","Océan","saturate(1.15) hue-rotate(-8deg)",[OV.tint("#0fb5c9",.3)]);
lk("foret","Forêt","saturate(1.25) contrast(1.05)",[OV.tint("#2f9e44",.25)]);
lk("luxe_or","Luxe doré","contrast(1.15) saturate(.9)",[OV.tint("#d4af37",.3),OV.vignette(.5)]);
lk("mode","Mode","contrast(1.2) saturate(.8)",[OV.tint("#9ec5ff",.15)]);
lk("documentaire","Documentaire","contrast(1.05) saturate(.95)",[OV.vignette(.2)]);
lk("grain_fort","Grain fort","contrast(1.08)",[OV.grain(.35)]);
lk("halo","Halo lumineux","brightness(1.04)",[OV.bloom(.7)]);
lk("bokeh","Bokeh","brightness(1.02) saturate(1.1)",[OV.bokeh(.35,["#ffd27a","#ff9ad5","#9ad7ff"])]);
lk("poussiere","Vieux film","sepia(.3) contrast(1.05)",[OV.dust(.9),OV.grain(.2),OV.vignette(.45)]);
lk("trame_bd","Trame bande dessinée","contrast(1.35) saturate(1.3)",[OV.halftone(9,.35)]);
lk("bd","Bande dessinée","contrast(1.45) saturate(1.55)",[OV.halftone(7,.2)]);
lk("infrarouge","Infrarouge","hue-rotate(180deg) saturate(1.4) contrast(1.1)");
lk("negatif","Négatif","invert(1)");
lk("lavande","Lavande","saturate(.95) brightness(1.04)",[OV.tint("#a78bfa",0.44)]);
lk("peche","Pêche","saturate(1.05) brightness(1.05)",[OV.tint("#ffb38a",0.44)]);
lk("menthe","Menthe","saturate(.95) brightness(1.05)",[OV.tint("#5eead4",0.42)]);
lk("cerise","Cerise","saturate(1.15) contrast(1.05)",[OV.tint("#e11d48",0.39)]);
lk("glacier","Glacier","brightness(1.1) saturate(.75) contrast(1.05)",[OV.tint("#bae6fd",.35)]);
lk("brume","Brume","contrast(.85) brightness(1.08)",[OV.fade(.4),OV.vignette(.25,"#ffffff")]);
lk("orage","Orage","grayscale(.55) contrast(1.25) brightness(.85)",[OV.tint("#334155",.35,"multiply"),OV.vignette(.5)]);
lk("soleil_afrique","Soleil d'Afrique","saturate(1.35) contrast(1.08) sepia(.12)",[OV.leak("#ffb703","#fb5607",.35),OV.vignette(.3)]);
lk("studio","Studio","brightness(1.05) contrast(1.06)");
lk("nettete","Net et propre","contrast(1.14) saturate(1.06)");
lk("vignette_noire","Vignette noire","contrast(1.05)",[OV.vignette(.65)]);
lk("vignette_blanche","Vignette blanche","brightness(1.04)",[OV.vignette(.55,"#ffffff")]);
lk("cadre_film","Cadre de pellicule","contrast(1.08) sepia(.2)",[OV.dust(.6),OV.frame("#0b0b0b",.03),OV.grain(.2)]);
lk("glitch","Glitch","saturate(1.3) contrast(1.1)",[OV.chroma(8),OV.slices(.6)]);
lk("clair_obscur","Clair-obscur","contrast(1.35) brightness(.9)",[OV.vignette(.7)]);
lk("tropical","Tropical","saturate(1.45) hue-rotate(8deg)",[OV.tint("#ffd23f",.15)]);
lk("automne","Automne","sepia(.25) hue-rotate(-12deg) saturate(1.2)",[OV.tint("#d9480f",.2)]);
lk("hiver","Hiver","saturate(.6) brightness(1.06)",[OV.tint("#93c5fd",.3)]);
lk("neon_rose","Néon rose","saturate(1.4) contrast(1.1)",[OV.tint("#ff2fb3",.3),OV.bloom(.45)]);
lk("cyber","Cyber","contrast(1.2) saturate(1.3)",[OV.grad("#22d3ee","#d946ef",.4,"overlay"),OV.scan(.3),OV.chroma(3)]);
lk("lomo","Lomo","saturate(1.4) contrast(1.25)",[OV.vignette(.7)]);
lk("matin","Lumière du matin","brightness(1.08) saturate(1.05)",[OV.leak("#fff1c1","#ffd6a5",.35)]);
function look(G, src, id, o){ const L=LOOKS[id]||LOOKS.naturel; G.save(); G.setTransform(1,0,0,1,0,0); G.globalAlpha=1; G.globalCompositeOperation="source-over"; G.filter=L.f||"none"; G.drawImage(src,0,0,o.W,o.H); G.filter="none"; G.restore(); L.ov.forEach(fn=>{ G.save(); G.setTransform(1,0,0,1,0,0); fn(G,o); G.restore(); }); }

/* ================= TRANSITIONS : A = fin de la scène précédente, B = début de la nouvelle ; p va de 0 à 1 ================= */
const TRANS={}; const tr=(id,nom,f,d,ease)=>{ TRANS[id]={id,nom,f,d:d==null?.45:d,e:ease||"inOutC"}; };
const D2={g:[-1,0,"vers la gauche"],d:[1,0,"vers la droite"],h:[0,-1,"vers le haut"],b:[0,1,"vers le bas"],hg:[-1,-1,"vers le haut à gauche"],hd:[1,-1,"vers le haut à droite"],bg:[-1,1,"vers le bas à gauche"],bd:[1,1,"vers le bas à droite"]};
const clipPoly=(G,pts)=>{ G.beginPath(); pts.forEach(([x,y],i)=>i?G.lineTo(x,y):G.moveTo(x,y)); G.closePath(); G.clip(); };
/* demi-plan : la partie déjà « balayée » par un front qui avance dans la direction (dx,dy) */
const halfPlane=(W,H,dx,dy,p)=>{ const n=Math.hypot(dx,dy)||1, ux=dx/n, uy=dy/n, cs=[[0,0],[W,0],[W,H],[0,H]], s=cs.map(([x,y])=>x*ux+y*uy), mn=Math.min(...s), mx=Math.max(...s), f=mn+p*(mx-mn), out=[];
  for(let i=0;i<4;i++){ const a=cs[i], b=cs[(i+1)%4], sa=s[i]-f, sb=s[(i+1)%4]-f; if(sa<=0) out.push(a); if((sa<0&&sb>0)||(sa>0&&sb<0)){ const k=sa/(sa-sb); out.push([a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k]); } } return out; };
const starPts=(cx,cy,R,n,k)=>{ const out=[]; for(let i=0;i<n*2;i++){ const r=i%2?R*k:R, a=-PI/2+i*PI/n; out.push([cx+r*Math.cos(a),cy+r*Math.sin(a)]); } return out; };
const heartPts=(cx,cy,s)=>{ const out=[]; for(let i=0;i<64;i++){ const t=i/64*2*PI; out.push([cx+s*16*Math.pow(Math.sin(t),3),cy-s*(13*Math.cos(t)-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))]); } return out; };
const blurDraw=(G,img,px,o,alpha)=>{ const s=tmp("blurT",o.W/4,o.H/4), x=s.getContext("2d"); x.filter=`blur(${Math.max(0,px/4)}px)`; x.clearRect(0,0,s.width,s.height); x.drawImage(img,0,0,s.width,s.height); x.filter="none"; G.globalAlpha=alpha==null?1:alpha; G.drawImage(s,0,0,o.W,o.H); G.globalAlpha=1; };
const centered=(G,img,o,sx,sy,rot,alpha)=>{ G.save(); G.globalAlpha=alpha==null?1:alpha; G.translate(o.W/2,o.H/2); if(rot) G.rotate(rot); G.scale(sx,sy==null?sx:sy); G.drawImage(img,-o.W/2,-o.H/2,o.W,o.H); G.restore(); };
tr("coupe","Coupe sèche",(G,A,B)=>G.drawImage(B,0,0),0);
tr("fondu","Fondu enchaîné",(G,A,B,p)=>{ G.drawImage(A,0,0); G.globalAlpha=p; G.drawImage(B,0,0); G.globalAlpha=1; });
tr("fondu_noir","Fondu au noir",(G,A,B,p,o)=>{ G.drawImage(p<.5?A:B,0,0); G.fillStyle=`rgba(0,0,0,${p<.5?p*2:(1-p)*2})`; G.fillRect(0,0,o.W,o.H); },.7,"lin");
tr("flash_blanc","Flash blanc",(G,A,B,p,o)=>{ G.drawImage(p<.3?A:B,0,0); G.fillStyle=`rgba(255,255,255,${p<.3?p/.3:1-(p-.3)/.7})`; G.fillRect(0,0,o.W,o.H); },.4,"lin");
tr("flash_couleur","Flash de couleur",(G,A,B,p,o)=>{ G.drawImage(p<.3?A:B,0,0); G.globalAlpha=p<.3?p/.3:1-(p-.3)/.7; G.fillStyle=o.acc||"#FF2E88"; G.fillRect(0,0,o.W,o.H); G.globalAlpha=1; },.4,"lin");
tr("fondu_morph","Fondu avec respiration",(G,A,B,p,o)=>{ centered(G,A,o,1+.06*p); centered(G,B,o,1.06-.06*p,null,0,p); });
Object.entries(D2).forEach(([k,[dx,dy,n]])=>{
  tr(`glisse_${k}`,`Glissement ${n}`,(G,A,B,p,o)=>{ G.drawImage(A,0,0); G.drawImage(B,-dx*(1-p)*o.W,-dy*(1-p)*o.H); });
  tr(`volet_${k}`,`Volet ${n}`,(G,A,B,p,o)=>{ G.drawImage(A,0,0); G.save(); clipPoly(G,halfPlane(o.W,o.H,dx,dy,p)); G.drawImage(B,0,0); G.restore(); }); });
["g","d","h","b"].forEach(k=>{ const [dx,dy,n]=D2[k];
  tr(`pousse_${k}`,`Poussée ${n}`,(G,A,B,p,o)=>{ G.drawImage(A,dx*p*o.W,dy*p*o.H); G.drawImage(B,-dx*(1-p)*o.W,-dy*(1-p)*o.H); });
  tr(`fouette_${k}`,`Panoramique filé ${n}`,(G,A,B,p,o)=>{ const img=p<.5?A:B, q=p<.5?p*2:(p-1)*2, ox=dx*q*o.W*.6, oy=dy*q*o.H*.6, wrap=(x,y)=>{ G.drawImage(img,x,y); G.drawImage(img,x-dx*o.W,y-dy*o.H); G.drawImage(img,x+dx*o.W,y+dy*o.H); };
    for(let i=5;i>=0;i--){ G.globalAlpha=i?.2:1; wrap(ox-dx*i*o.W*.04,oy-dy*i*o.H*.04); } G.globalAlpha=1; },.35,"inOutQ"); });
["g","d"].forEach(k=>{ const [dx,,n]=D2[k]; tr(`volet_doux_${k}`,`Volet doux ${n}`,(G,A,B,p,o)=>{ G.drawImage(A,0,0); const t=tmp("wipeS",o.W,o.H), x=t.getContext("2d"); x.globalCompositeOperation="copy"; x.drawImage(B,0,0); x.globalCompositeOperation="destination-in"; const f=dx>0?p*1.3*o.W:o.W-p*1.3*o.W, gr=x.createLinearGradient(f-dx*o.W*.3,0,f,0); gr.addColorStop(0,"rgba(0,0,0,1)"); gr.addColorStop(1,"rgba(0,0,0,0)"); x.fillStyle=gr; x.fillRect(0,0,o.W,o.H); x.globalCompositeOperation="source-over"; G.drawImage(t,0,0); },.6); });
tr("iris","Iris (cercle qui s'ouvre)",(G,A,B,p,o)=>{ G.drawImage(A,0,0); G.save(); G.beginPath(); G.arc(o.W/2,o.H/2,p*Math.hypot(o.W,o.H)/2,0,2*PI); G.clip(); G.drawImage(B,0,0); G.restore(); });
tr("iris_ferme","Iris (cercle qui se ferme)",(G,A,B,p,o)=>{ G.drawImage(B,0,0); G.save(); G.beginPath(); G.arc(o.W/2,o.H/2,(1-p)*Math.hypot(o.W,o.H)/2,0,2*PI); G.clip(); G.drawImage(A,0,0); G.restore(); });
tr("losange","Losange",(G,A,B,p,o)=>{ G.drawImage(A,0,0); const r=p*(o.W+o.H)/2*1.02; G.save(); clipPoly(G,[[o.W/2,o.H/2-r],[o.W/2+r,o.H/2],[o.W/2,o.H/2+r],[o.W/2-r,o.H/2]]); G.drawImage(B,0,0); G.restore(); });
tr("carre","Carré qui s'ouvre",(G,A,B,p,o)=>{ G.drawImage(A,0,0); G.save(); G.beginPath(); G.rect(o.W/2*(1-p),o.H/2*(1-p),o.W*p,o.H*p); G.clip(); G.drawImage(B,0,0); G.restore(); });
tr("etoile","Étoile",(G,A,B,p,o)=>{ G.drawImage(A,0,0); G.save(); clipPoly(G,starPts(o.W/2,o.H/2,p*Math.hypot(o.W,o.H)*1.15,5,.5)); G.drawImage(B,0,0); G.restore(); },.55);
tr("coeur","Cœur",(G,A,B,p,o)=>{ G.drawImage(A,0,0); G.save(); clipPoly(G,heartPts(o.W/2,o.H/2,p*Math.hypot(o.W,o.H)/16)); G.drawImage(B,0,0); G.restore(); },.6);
tr("horloge","Horloge",(G,A,B,p,o)=>{ G.drawImage(A,0,0); G.save(); G.beginPath(); G.moveTo(o.W/2,o.H/2); G.arc(o.W/2,o.H/2,Math.hypot(o.W,o.H),-PI/2,-PI/2+p*2*PI); G.closePath(); G.clip(); G.drawImage(B,0,0); G.restore(); },.55,"inOutQ");
tr("horloge_inverse","Horloge inversée",(G,A,B,p,o)=>{ G.drawImage(A,0,0); G.save(); G.beginPath(); G.moveTo(o.W/2,o.H/2); G.arc(o.W/2,o.H/2,Math.hypot(o.W,o.H),-PI/2,-PI/2-p*2*PI,true); G.closePath(); G.clip(); G.drawImage(B,0,0); G.restore(); },.55,"inOutQ");
tr("persiennes_h","Persiennes horizontales",(G,A,B,p,o)=>{ G.drawImage(A,0,0); const n=8, h=o.H/n; G.save(); G.beginPath(); for(let i=0;i<n;i++) G.rect(0,i*h,o.W,h*p); G.clip(); G.drawImage(B,0,0); G.restore(); });
tr("persiennes_v","Persiennes verticales",(G,A,B,p,o)=>{ G.drawImage(A,0,0); const n=8, w=o.W/n; G.save(); G.beginPath(); for(let i=0;i<n;i++) G.rect(i*w,0,w*p,o.H); G.clip(); G.drawImage(B,0,0); G.restore(); });
tr("damier","Damier",(G,A,B,p,o)=>{ G.drawImage(A,0,0); const nx=6, ny=Math.round(6*o.H/o.W), w=o.W/nx, h=o.H/ny; G.save(); G.beginPath(); for(let i=0;i<nx;i++) for(let j=0;j<ny;j++){ const q=cl(((i+j)%2?p-.4:p)*1.7), s=q; if(s>0) G.rect(i*w+w*(1-s)/2,j*h+h*(1-s)/2,w*s,h*s); } G.clip(); G.drawImage(B,0,0); G.restore(); },.55,"lin");
tr("mosaique","Mosaïque",(G,A,B,p,o)=>{ G.drawImage(A,0,0); const nx=8, ny=Math.round(8*o.H/o.W), w=o.W/nx, h=o.H/ny; G.save(); G.beginPath(); for(let i=0;i<nx;i++) for(let j=0;j<ny;j++) if(p>rnd(i*31+j)*.85) G.rect(i*w,j*h,w+1,h+1); G.clip(); G.drawImage(B,0,0); G.restore(); },.55,"lin");
tr("barres","Barres aléatoires",(G,A,B,p,o)=>{ G.drawImage(A,0,0); const n=16, w=o.W/n; G.save(); G.beginPath(); for(let i=0;i<n;i++){ const q=cl((p-rnd(i+5)*.4)/.6); G.rect(i*w,0,w+1,o.H*q); } G.clip(); G.drawImage(B,0,0); G.restore(); },.55,"lin");
tr("pixels","Pixelisation",(G,A,B,p,o)=>{ const img=p<.5?A:B, q=p<.5?p*2:(1-p)*2, b=Math.max(1,Math.round(1+q*48*o.W/1080)), s=tmp("pix",o.W/b,o.H/b), x=s.getContext("2d"); x.imageSmoothingEnabled=false; x.drawImage(img,0,0,s.width,s.height); G.save(); G.imageSmoothingEnabled=false; G.drawImage(s,0,0,o.W,o.H); G.restore(); },.5,"lin");
tr("flou","Fondu flou",(G,A,B,p,o)=>{ blurDraw(G,A,p*40*o.W/1080,o); blurDraw(G,B,(1-p)*40*o.W/1080,o,p); },.5);
tr("zoom_entree","Zoom d'entrée",(G,A,B,p,o)=>{ G.drawImage(A,0,0); centered(G,B,o,.55+.45*p,null,0,p); });
tr("zoom_sortie","Zoom de sortie",(G,A,B,p,o)=>{ G.drawImage(B,0,0); centered(G,A,o,1+.5*p,null,0,1-p); });
tr("zoom_traverse","Zoom traversant",(G,A,B,p,o)=>{ if(p<.5) centered(G,A,o,1+2.2*E.inQ(p*2)); else centered(G,B,o,1.8-.8*E.outQ((p-.5)*2)); G.fillStyle=`rgba(255,255,255,${.35*Math.sin(p*PI)})`; G.fillRect(0,0,o.W,o.H); },.45,"lin");
tr("rotation","Rotation",(G,A,B,p,o)=>{ G.drawImage(A,0,0); centered(G,B,o,.5+.5*p,null,-(1-p)*PI/2,Math.min(1,p*1.6)); });
tr("tourbillon","Tourbillon",(G,A,B,p,o)=>{ G.fillStyle="#000"; G.fillRect(0,0,o.W,o.H); if(p<.5) centered(G,A,o,1-p*1.6,null,p*2*PI*.75); else centered(G,B,o,.2+.8*(p-.5)*2,null,-(1-p)*2*PI*.75); },.55,"inOutQ");
tr("retournement","Retournement horizontal",(G,A,B,p,o)=>{ G.fillStyle="#000"; G.fillRect(0,0,o.W,o.H); if(p<.5) centered(G,A,o,Math.max(.001,1-p*2),1); else centered(G,B,o,Math.max(.001,(p-.5)*2),1); });
tr("retournement_v","Retournement vertical",(G,A,B,p,o)=>{ G.fillStyle="#000"; G.fillRect(0,0,o.W,o.H); if(p<.5) centered(G,A,o,1,Math.max(.001,1-p*2)); else centered(G,B,o,1,Math.max(.001,(p-.5)*2)); });
tr("cube_g","Cube vers la gauche",(G,A,B,p,o)=>{ const wa=o.W*(1-p), wb=o.W*p; G.drawImage(A,0,0,wa,o.H); G.fillStyle=`rgba(0,0,0,${.5*p})`; G.fillRect(0,0,wa,o.H); G.drawImage(B,wa,0,wb,o.H); G.fillStyle=`rgba(0,0,0,${.5*(1-p)})`; G.fillRect(wa,0,wb,o.H); });
tr("cube_d","Cube vers la droite",(G,A,B,p,o)=>{ const wb=o.W*p, wa=o.W*(1-p); G.drawImage(B,0,0,wb,o.H); G.fillStyle=`rgba(0,0,0,${.5*(1-p)})`; G.fillRect(0,0,wb,o.H); G.drawImage(A,wb,0,wa,o.H); G.fillStyle=`rgba(0,0,0,${.5*p})`; G.fillRect(wb,0,wa,o.H); });
tr("cube_h","Cube vers le haut",(G,A,B,p,o)=>{ const ha=o.H*(1-p), hb=o.H*p; G.drawImage(A,0,0,o.W,ha); G.fillStyle=`rgba(0,0,0,${.5*p})`; G.fillRect(0,0,o.W,ha); G.drawImage(B,0,ha,o.W,hb); G.fillStyle=`rgba(0,0,0,${.5*(1-p)})`; G.fillRect(0,ha,o.W,hb); });
tr("rideau","Rideau qui s'ouvre",(G,A,B,p,o)=>{ G.drawImage(B,0,0); const w=o.W/2, d=p*w; G.drawImage(A,0,0,w,o.H,-d,0,w,o.H); G.drawImage(A,w,0,w,o.H,w+d,0,w,o.H); });
tr("portes","Portes qui se ferment",(G,A,B,p,o)=>{ G.drawImage(A,0,0); const w=o.W/2, d=(1-p)*w; G.drawImage(B,0,0,w,o.H,-d,0,w,o.H); G.drawImage(B,w,0,w,o.H,w+d,0,w,o.H); });
tr("glitch","Glitch",(G,A,B,p,o)=>{ const f=Math.floor(p*14); G.drawImage(p<.5?A:B,0,0); const other=p<.5?B:A, k=Math.sin(p*PI); for(let i=0;i<9;i++){ const y=rnd(f*13+i)*o.H, h=o.H*(.02+.07*rnd(f*7+i)), dx=(rnd(f*5+i)-.5)*o.W*.25*k; G.drawImage(rnd(f+i)>.5?other:(p<.5?A:B),0,y,o.W,h,dx,y,o.W,h); }
  G.save(); G.globalCompositeOperation="screen"; G.fillStyle=`rgba(255,0,90,${.25*k})`; G.fillRect((rnd(f)-.5)*20,0,o.W,o.H); G.fillStyle=`rgba(0,220,255,${.25*k})`; G.fillRect((rnd(f+1)-.5)*-20,0,o.W,o.H); G.restore(); },.4,"lin");
tr("secousse","Coupe avec secousse",(G,A,B,p,o)=>{ const a=(1-p)*.05; G.fillStyle="#000"; G.fillRect(0,0,o.W,o.H); G.save(); G.translate(o.W/2+(rnd(Math.floor(p*30))-.5)*o.W*a*2,o.H/2+(rnd(Math.floor(p*30)+7)-.5)*o.H*a); G.rotate((rnd(Math.floor(p*30)+3)-.5)*a*2); G.scale(1+a*1.5,1+a*1.5); G.drawImage(B,-o.W/2,-o.H/2,o.W,o.H); G.restore(); },.4,"lin");
tr("encre","Taches d'encre",(G,A,B,p,o)=>{ G.drawImage(A,0,0); const R=Math.hypot(o.W,o.H); G.save(); G.beginPath(); for(let i=0;i<9;i++){ const q=cl((p-rnd(i+2)*.35)/.65), r=q*R*(.25+.3*rnd(i+11)); if(r>0){ G.moveTo(rnd(i+21)*o.W+r,rnd(i+31)*o.H); G.arc(rnd(i+21)*o.W,rnd(i+31)*o.H,r,0,2*PI); } } G.clip(); G.drawImage(B,0,0); G.restore(); },.65,"inOutQ");
tr("cercles","Cercles",(G,A,B,p,o)=>{ G.drawImage(A,0,0); const nx=4, ny=Math.round(4*o.H/o.W), w=o.W/nx, h=o.H/ny, r=p*Math.hypot(w,h)*.75; G.save(); G.beginPath(); for(let i=0;i<nx;i++) for(let j=0;j<ny;j++){ G.moveTo(i*w+w/2+r,j*h+h/2); G.arc(i*w+w/2,j*h+h/2,r,0,2*PI); } G.clip(); G.drawImage(B,0,0); G.restore(); },.55);
tr("bandes","Bandes diagonales",(G,A,B,p,o)=>{ G.drawImage(A,0,0); const per=o.W/5; G.save(); G.translate(o.W/2,o.H/2); G.rotate(-PI/4); G.beginPath(); const R=Math.hypot(o.W,o.H); for(let x=-R;x<R;x+=per) G.rect(x,-R,per*p,2*R); G.rotate(PI/4); G.translate(-o.W/2,-o.H/2); G.clip(); G.drawImage(B,0,0); G.restore(); },.55);
tr("lumiere","Fuite de lumière",(G,A,B,p,o)=>{ G.drawImage(A,0,0); G.globalAlpha=p; G.drawImage(B,0,0); G.globalAlpha=1; const k=Math.sin(p*PI); G.save(); G.globalCompositeOperation="screen"; const gr=G.createRadialGradient(o.W*(.2+.6*p),o.H*.4,0,o.W*(.2+.6*p),o.H*.4,Math.max(o.W,o.H)*.8); gr.addColorStop(0,`rgba(255,200,90,${.9*k})`); gr.addColorStop(.5,`rgba(255,90,40,${.45*k})`); gr.addColorStop(1,"rgba(255,90,40,0)"); G.fillStyle=gr; G.fillRect(0,0,o.W,o.H); G.restore(); },.6,"lin");
tr("page","Page qui tourne",(G,A,B,p,o)=>{ G.drawImage(A,0,0); const pts=halfPlane(o.W,o.H,-1,-1,p); G.save(); clipPoly(G,pts); G.drawImage(B,0,0); G.restore(); if(p>0&&p<1){ const n=Math.SQRT1_2, ss=[[0,0],[o.W,0],[o.W,o.H],[0,o.H]].map(([x,y])=>-x*n-y*n), mx=Math.max(...ss), mn=Math.min(...ss), f=mn+p*(mx-mn), cx=-f*n, cy=-f*n; G.save(); clipPoly(G,pts); const gr=G.createLinearGradient(cx,cy,cx+o.W*.08,cy+o.W*.08); gr.addColorStop(0,"rgba(0,0,0,.45)"); gr.addColorStop(1,"rgba(0,0,0,0)"); G.fillStyle=gr; G.fillRect(0,0,o.W,o.H); G.restore(); } },.6);
tr("tranches_v","Trois tranches verticales",(G,A,B,p,o)=>{ G.drawImage(A,0,0); const w=o.W/3; for(let i=0;i<3;i++){ const q=E.outC(cl((p-i*.15)/.7)), dy=(i%2?1:-1)*(1-q)*o.H; G.drawImage(B,i*w,0,w+1,o.H,i*w,dy,w+1,o.H); } },.55,"lin");
tr("tranches_h","Trois tranches horizontales",(G,A,B,p,o)=>{ G.drawImage(A,0,0); const h=o.H/3; for(let i=0;i<3;i++){ const q=E.outC(cl((p-i*.15)/.7)), dx=(i%2?1:-1)*(1-q)*o.W; G.drawImage(B,0,i*h,o.W,h+1,dx,i*h,o.W,h+1); } },.55,"lin");
tr("etirement","Étirement",(G,A,B,p,o)=>{ G.drawImage(B,0,0); centered(G,A,o,1+2*p,1-.3*p,0,1-p); });
tr("rebond","Chute avec rebond",(G,A,B,p,o)=>{ G.drawImage(A,0,0); G.drawImage(B,0,-(1-E.outBounce(p))*o.H); },.7,"lin");
tr("elastique","Élastique",(G,A,B,p,o)=>{ G.drawImage(A,0,0); centered(G,B,o,Math.max(.001,E.outElastic(p))); },.7,"lin");
tr("zoom_rotation","Zoom tournant",(G,A,B,p,o)=>{ G.drawImage(A,0,0); centered(G,B,o,Math.max(.001,p),null,(1-p)*PI,Math.min(1,p*2)); },.55);
tr("tele_off","Télé qui s'éteint",(G,A,B,p,o)=>{ G.fillStyle="#000"; G.fillRect(0,0,o.W,o.H); if(p<.6){ const q=p/.6; centered(G,A,o,q<.7?1:1-(q-.7)/.3*.98,Math.max(.004,1-q*1.1)); G.fillStyle=`rgba(255,255,255,${q*.8})`; G.fillRect(0,o.H/2-2,o.W,4); } else centered(G,B,o,1,1,0,(p-.6)/.4); },.55,"lin");
tr("tele_on","Télé qui s'allume",(G,A,B,p,o)=>{ G.fillStyle="#000"; G.fillRect(0,0,o.W,o.H); const q=E.outC(p); centered(G,B,o,Math.min(1,q*1.6),Math.max(.004,q)); G.fillStyle=`rgba(255,255,255,${(1-q)*.7})`; G.fillRect(0,o.H/2-3,o.W,6); },.5,"lin");
tr("division","Écran qui se divise",(G,A,B,p,o)=>{ G.drawImage(B,0,0); const h=o.H/2, d=p*h; G.drawImage(A,0,0,o.W,h,0,-d,o.W,h); G.drawImage(A,0,h,o.W,h,0,h+d,o.W,h); });
tr("coupe_rythme","Coupe sur le rythme (petit zoom)",(G,A,B,p,o)=>{ centered(G,B,o,1.08-.08*E.outC(p)); },.25,"lin");
const TRANS_ALIAS={glisse:"glisse_g",zoom:"zoom_entree",flash:"flash_blanc"};
function trans(id){ return TRANS[id]||TRANS[TRANS_ALIAS[id]]||TRANS.fondu; }

/* ================= COULEURS : palettes (couleur vive + couleur sombre), combinables avec chaque habillage ================= */
const PALETTES={auto:{id:"auto",nom:"Automatique (habillage ou marque)",acc:"",acc2:""}};
[["coucher","Coucher de soleil","#FF6B35","#3C096C"],["ocean","Océan profond","#0EA5E9","#0B2545"],["orange_indigo","Orange et indigo","#F77F00","#1D3557"],["ocre","Ocre et sable","#D98E04","#3D2C1E"],
 ["savane","Vert savane","#7CB518","#1B2A14"],["rouge_or","Or sur rouge","#FFBA08","#6A040F"],["miami","Néon Miami","#FF2E88","#14213D"],["foret","Forêt","#52B788","#081C15"],["bonbon","Bonbon","#FF8FC7","#3B0764"],
 ["or_noir","Or et noir","#D4AF37","#0B0B0B"],["corail","Corail","#FF6F61","#2B2D42"],["lavande","Lavande","#A78BFA","#1E1B4B"],["menthe","Menthe","#2DD4BF","#042F2E"],["citron","Citron","#FACC15","#1F2937"],
 ["cerise","Cerise","#FB7185","#4C0519"],["royal","Bleu royal","#3B82F6","#172554"],["terre","Terre cuite","#E07A5F","#3D405B"],["glacier","Glacier","#7DD3FC","#0C4A6E"],["peche","Pêche","#FFB4A2","#6D2E46"],
 ["emeraude","Émeraude","#10B981","#022C22"],["rubis","Rubis","#EF4444","#450A0A"],["saphir","Saphir","#6366F1","#1E1B4B"],["ambre","Ambre","#F59E0B","#451A03"],["turquoise","Turquoise","#06B6D4","#083344"],
 ["fuchsia","Fuchsia","#D946EF","#4A044E"],["lime","Citron vert","#A3E635","#1A2E05"],["cuivre","Cuivre","#EA580C","#1C1917"],["nuit","Nuit étoilée","#FDE68A","#0F172A"],["cafe","Café","#C8A27A","#2B1B12"],
 ["choco_menthe","Chocolat menthe","#6EE7B7","#3B2416"],["pasteque","Pastèque","#F43F5E","#14532D"],["mangue","Mangue","#FFA62B","#3A0CA3"],["hibiscus","Hibiscus","#E2336B","#1A0B14"],["indigo","Indigo","#818CF8","#0F0A2E"],
 ["ciel","Ciel","#60A5FA","#1E293B"],["sable","Sable doré","#E9C46A","#264653"],["sarcelle","Sarcelle et orange","#F4A261","#0B4F6C"],["rose_poudre","Rose poudré","#F9A8D4","#3F1D38"],["kaki","Kaki","#A3B18A","#344E41"],
 ["bordeaux","Bordeaux","#E5383B","#2B0A0D"],["graphite","Graphite","#F8FAFC","#111827"],["electrique","Électrique","#00F5D4","#240046"],["solaire","Solaire","#FFD60A","#003566"],["volcan","Volcan","#FF4800","#1B1B1B"],
 ["prune","Prune","#C77DFF","#240046"],["jade","Jade","#00C2A8","#02343F"],["flamant","Flamant","#FF7AA2","#2E1A47"],["tournesol","Tournesol","#FFC300","#2E2400"],["grenade","Grenade","#E63946","#003049"],
 ["azur","Azur","#00B4D8","#03045E"],["papaye","Papaye","#FF8C42","#2D3047"],["olive","Olive","#B5C99A","#2F3E46"],["cobalt","Cobalt","#4D8DFF","#001233"],["guimauve","Guimauve","#FFAFCC","#3D2C5E"],
 ["retro","Rétro","#F28482","#1D3557"],["aurore","Aurore","#F72585","#3A0CA3"],["minuit","Minuit","#4CC9F0","#03071E"],["safran","Safran","#F4A300","#3B1F0B"],["monochrome","Noir et blanc","#FFFFFF","#000000"],["marine","Marine","#F1FAEE","#1D3557"]
].forEach(([id,nom,acc,acc2])=>{ PALETTES[id]={id,nom,acc,acc2}; });

/* ================= STYLES DE TITRES : remplissage, dégradés, contours, ombres, lueurs, relief 3D, pastilles, surligneur… ================= */
const TSTYLES={}; const ts=(id,nom,s)=>{ TSTYLES[id]=Object.assign({id,nom},s); };
const G_OR=["#FFF6C8","#E9B949","#A36B0F"], SOFT={x:0,y:.05,b:.2,c:"rgba(0,0,0,.45)"};
ts("simple","Simple",{});
ts("ombre_douce","Ombre douce",{shadow:SOFT});
ts("ombre_dure","Ombre dure",{shadow:{x:.05,y:.05,b:0,c:"rgba(0,0,0,.6)"}});
ts("ombre_longue","Ombre longue",{long:{n:.22,c:"rgba(0,0,0,.22)"}});
ts("contour_noir","Contour noir",{fill:"#FFFFFF",stroke:{w:.12,c:"#000000"}});
ts("contour_blanc","Contour blanc",{fill:"#141414",stroke:{w:.12,c:"#FFFFFF"}});
ts("double_contour","Double contour",{fill:"#FFFFFF",stroke2:{w:.26,c:"acc"},stroke:{w:.11,c:"#000000"}});
ts("neon","Néon",{fill:"#FFFFFF",glow:{b:.4,c:"acc"}});
ts("neon_blanc","Néon blanc",{fill:"#FFFFFF",glow:{b:.32,c:"#FFFFFF"}});
ts("relief_3d","Relief 3D",{extrude:{n:.12,c:"#000000"}});
ts("relief_couleur","Relief 3D en couleur",{fill:"#FFFFFF",extrude:{n:.12,c:"acc2"}});
ts("or","Or",{fill:{g:G_OR},stroke:{w:.025,c:"#5C3B00"},shadow:SOFT});
ts("chrome","Chrome",{fill:{g:["#FFFFFF","#9AA3AD","#F4F6F8","#5B636D"]},stroke:{w:.025,c:"#2B2F33"},shadow:SOFT});
ts("coucher_soleil","Dégradé coucher de soleil",{fill:{g:["#FFD23F","#FF7B3A","#E11D48"]},shadow:SOFT});
ts("ocean","Dégradé océan",{fill:{g:["#A5F3FC","#22D3EE","#1D4ED8"]},shadow:SOFT});
ts("feu","Feu",{fill:{g:["#FFF3B0","#FF9F1C","#D00000"]},glow:{b:.25,c:"#FF6A00"}});
ts("glace","Glace",{fill:{g:["#FFFFFF","#BAE6FD","#60A5FA"]},stroke:{w:.02,c:"#1E3A8A"}});
ts("arc_en_ciel","Arc-en-ciel",{fill:{g:["#FF595E","#FFCA3A","#8AC926","#1982C4","#6A4C93"],h:true},stroke:{w:.06,c:"#141414"}});
ts("bonbon","Bonbon",{fill:{g:["#F9A8D4","#C084FC"]},stroke:{w:.07,c:"#FFFFFF"},shadow:SOFT});
ts("menthe","Menthe fraîche",{fill:{g:["#D1FAE5","#34D399"]},shadow:SOFT});
ts("degrade_marque","Dégradé aux couleurs",{fill:{g:["acc","acc2"]},stroke:{w:.03,c:"#FFFFFF"}});
ts("pastille","Pastille",{fill:"onacc",box:{t:"pill",c:"acc"}});
ts("pastille_blanche","Pastille blanche",{fill:"#141414",box:{t:"pill",c:"#FFFFFF"}});
ts("pastille_noire","Pastille noire",{fill:"#FFFFFF",box:{t:"pill",c:"#141414"}});
ts("bandeau","Bandeau",{fill:"onacc",box:{t:"rect",c:"acc"}});
ts("surligneur_jaune","Surligneur jaune",{fill:"#141414",box:{t:"marker",c:"#FFE14D"}});
ts("surligneur_rose","Surligneur rose",{fill:"#141414",box:{t:"marker",c:"#FF8FC7"}});
ts("souligne","Souligné",{box:{t:"under",c:"acc"}});
ts("souligne_epais","Souligné épais",{box:{t:"under",c:"acc2",k:2}});
ts("majuscules_espacees","Majuscules espacées",{up:true,ls:.12});
ts("italique","Italique dynamique",{it:true,shadow:SOFT});
ts("retro","Rétro",{fill:"#FFFFFF",stroke:{w:.06,c:"#141414"},shadow:{x:.07,y:.07,b:0,c:"acc"}});
ts("pop_art","Pop art",{fill:"#FFE14D",stroke:{w:.1,c:"#111111"},shadow:{x:.06,y:.06,b:0,c:"#111111"}});
ts("bd","Bande dessinée",{fill:"#FFFFFF",stroke:{w:.1,c:"#111111"},shadow:{x:.05,y:.05,b:0,c:"acc"},rot:-3});
ts("graffiti","Graffiti",{fill:{g:["acc","acc2"]},stroke:{w:.1,c:"#111111"},shadow:{x:.04,y:.06,b:.05,c:"rgba(0,0,0,.5)"},rot:-4});
ts("elegant","Élégant",{ls:.08,w:400});
ts("luxe","Luxe doré",{fill:{g:G_OR},ls:.1,up:true,w:500});
ts("minimal","Minimal",{ls:.03,w:500});
ts("contour_seul","Contour seul",{fill:"none",stroke:{w:.05,c:"ink"}});
ts("contour_couleur","Contour en couleur",{fill:"none",stroke:{w:.06,c:"acc"}});
ts("ombre_couleur","Ombre colorée",{shadow:{x:.06,y:.06,b:0,c:"acc"}});
ts("lueur_douce","Lueur douce",{glow:{b:.25,c:"rgba(255,255,255,.85)"}});
ts("verre","Verre dépoli",{fill:"#FFFFFF",box:{t:"glass",c:"rgba(255,255,255,.18)"}});
ts("etiquette","Étiquette",{fill:"onacc",box:{t:"pill",c:"acc"},rot:-3});
ts("tampon","Tampon",{fill:"#D00000",box:{t:"stamp",c:"#D00000"},rot:-6,up:true});
ts("ruban","Ruban",{fill:"onacc",box:{t:"rect",c:"acc"},shadow:{x:.04,y:.06,b:.1,c:"rgba(0,0,0,.4)"}});
ts("cartoon","Cartoon",{fill:"#FFD23F",stroke:{w:.14,c:"#3B1D0F"},shadow:{x:0,y:.08,b:0,c:"#3B1D0F"}});
ts("gaming","Jeu vidéo",{fill:"#B6FF3B",glow:{b:.3,c:"#39FF14"},it:true,up:true});
ts("journal","Journal",{up:true,ls:.02,box:{t:"under",c:"ink"}});
ts("double_ombre","Double ombre",{shadows:[{x:.08,y:.08,c:"acc2"},{x:.04,y:.04,c:"acc"}]});
ts("ombre_3d_couleur","Ombre longue en couleur",{long:{n:.2,c:"acc2"}});
ts("ombre_flottante","Ombre flottante",{shadow:{x:0,y:.16,b:.3,c:"rgba(0,0,0,.35)"}});
const res=(c,o)=>c==="acc"?o.acc:c==="acc2"?o.acc2:c==="ink"?o.color:c==="onacc"?onCol(o.acc):c;
const rrect=(g,x,y,w,h,r)=>{ r=Math.max(0,Math.min(r,w/2,h/2)); g.beginPath(); g.moveTo(x+r,y); g.arcTo(x+w,y,x+w,y+h,r); g.arcTo(x+w,y+h,x,y+h,r); g.arcTo(x,y+h,x,y,r); g.arcTo(x,y,x+w,y,r); g.closePath(); };
const withWeight=(font,w)=>w?String(font).replace(/^\s*(italic\s+)?\d{3}\s/,(m,i)=>`${i||""}${w} `):font;
/* prépare la police d'un style (graisse, italique, espacement) : sert à mesurer comme à dessiner */
function setStyleFont(g, font, S, size){ let f=withWeight(font,S.w); if(S.it&&!/italic/.test(f)) f="italic "+f; g.font=f; if("letterSpacing" in g) g.letterSpacing=S.ls?`${Math.round(S.ls*size)}px`:"0px"; }
/* un texte (ligne, mot ou lettre) avec son style ; ligne de base « top » ; x = bord gauche */
function styledText(g, txt, x, y, size, S, o, w){
  const lh=size*1.12, fillC=S.fill===undefined?o.color:S.fill; w=w==null?g.measureText(txt).width:w;
  if(S.box&&!o.noBox){ const b=S.box, pad=size*(b.t==="under"?0:.22), c=res(b.c,o); g.save();
    if(b.t==="pill"){ rrect(g,x-pad*1.4,y-pad*.55,w+pad*2.8,lh+pad*1.1,(lh+pad*1.1)/2); g.fillStyle=c; g.fill(); }
    else if(b.t==="rect"){ g.fillStyle=c; g.fillRect(x-pad,y-pad*.45,w+pad*2,lh+pad*.9); }
    else if(b.t==="marker"){ g.fillStyle=c; g.beginPath(); g.moveTo(x-pad*.6,y+lh*.25); g.lineTo(x+w+pad*.8,y+lh*.18); g.lineTo(x+w+pad*.5,y+lh*.98); g.lineTo(x-pad*.9,y+lh*1.02); g.closePath(); g.fill(); }
    else if(b.t==="under"){ g.fillStyle=c; g.fillRect(x,y+lh*.98,w,Math.max(2,size*.08*(b.k||1))); }
    else if(b.t==="glass"){ rrect(g,x-pad*1.2,y-pad*.5,w+pad*2.4,lh+pad,pad); g.fillStyle=c; g.fill(); g.lineWidth=Math.max(1,size*.025); g.strokeStyle="rgba(255,255,255,.55)"; g.stroke(); }
    else if(b.t==="stamp"){ g.lineWidth=Math.max(2,size*.07); g.strokeStyle=c; g.strokeRect(x-pad,y-pad*.4,w+pad*2,lh+pad*.8); }
    g.restore(); }
  const fs=(()=>{ if(fillC==="none") return null; if(fillC&&typeof fillC==="object"){ const gr=fillC.h?g.createLinearGradient(x,0,x+w,0):g.createLinearGradient(0,y,0,y+lh); fillC.g.forEach((c,i,a)=>gr.addColorStop(i/Math.max(1,a.length-1),res(c,o))); return gr; } return res(fillC,o)||"#FFFFFF"; })();
  if(S.long){ const n=Math.max(1,Math.round(S.long.n*size)); g.fillStyle=res(S.long.c,o); for(let k=n;k>0;k--) g.fillText(txt,x+k,y+k); }
  if(S.extrude){ const n=Math.max(1,Math.round(S.extrude.n*size)); g.fillStyle=res(S.extrude.c,o); for(let k=n;k>0;k--) g.fillText(txt,x+k*.7,y+k); }
  if(S.shadows) S.shadows.forEach(sh=>{ g.fillStyle=res(sh.c,o); g.fillText(txt,x+sh.x*size,y+sh.y*size); });
  const shade=S.glow?{x:0,y:0,b:S.glow.b,c:res(S.glow.c,o)}:S.shadow?{x:S.shadow.x,y:S.shadow.y,b:S.shadow.b,c:res(S.shadow.c,o)}:o.shadow?{x:0,y:.04,b:.25,c:"rgba(0,0,0,.55)"}:null;
  const setShade=()=>{ if(!shade) return; g.shadowColor=shade.c; g.shadowBlur=shade.b*size; g.shadowOffsetX=shade.x*size; g.shadowOffsetY=shade.y*size; }, noShade=()=>{ g.shadowColor="transparent"; g.shadowBlur=0; g.shadowOffsetX=0; g.shadowOffsetY=0; };
  g.lineJoin="round"; let shaded=false;
  if(S.stroke2){ setShade(); shaded=true; g.lineWidth=S.stroke2.w*size; g.strokeStyle=res(S.stroke2.c,o); g.strokeText(txt,x,y); noShade(); }
  if(S.stroke){ if(!shaded){ setShade(); shaded=true; } g.lineWidth=S.stroke.w*size; g.strokeStyle=res(S.stroke.c,o); g.strokeText(txt,x,y); noShade(); }
  if(fs){ if(!shaded||S.glow) setShade(); g.fillStyle=fs; g.fillText(txt,x,y); if(S.glow){ g.fillText(txt,x,y); } noShade(); }
}

/* ================= ANIMATIONS DE TITRES : par bloc, par mot ou par lettre (comme les préréglages d'animation de texte) ================= */
const ANIMS={}; const an=(id,nom,unit,d,st,f,dl)=>{ ANIMS[id]={id,nom,unit,d,st,f,dl}; };
const fadeIn=q=>cl(q*2.5);
an("aucune","Sans animation","bloc",.01,0,()=>({}));
an("fondu","Fondu","bloc",.5,0,q=>({a:E.outC(q)}));
an("monte","Monte en fondu","bloc",.5,0,q=>({a:E.outC(q),dy:(1-E.outC(q))*.45}));
an("descend","Descend en fondu","bloc",.5,0,q=>({a:E.outC(q),dy:-(1-E.outC(q))*.45}));
an("depuis_droite","Arrive de la droite","bloc",.55,0,q=>({a:fadeIn(q),dx:(1-E.outC(q))*2}));
an("depuis_gauche","Arrive de la gauche","bloc",.55,0,q=>({a:fadeIn(q),dx:-(1-E.outC(q))*2}));
an("zoom_avant","Zoom avant","bloc",.5,0,q=>({a:E.outC(q),s:.5+.5*E.outC(q)}));
an("zoom_arriere","Zoom arrière","bloc",.5,0,q=>({a:E.outC(q),s:1.7-.7*E.outC(q)}));
an("pop","Pop","bloc",.45,0,q=>({a:fadeIn(q),s:Math.max(.01,E.outBack(q))}));
an("elastique","Élastique","bloc",.8,0,q=>({a:fadeIn(q),s:Math.max(.01,E.outElastic(q))}));
an("rebond","Rebond","bloc",.8,0,q=>({a:cl(q*4),dy:-(1-E.outBounce(q))*3}));
an("rotation","Rotation","bloc",.55,0,q=>({a:E.outC(q),r:-(1-E.outC(q))*.6,s:.7+.3*E.outC(q)}));
an("retournement","Retournement","bloc",.55,0,q=>({a:fadeIn(q),sx:Math.max(.01,E.outBack(q))}));
an("retournement_v","Retournement vertical","bloc",.55,0,q=>({a:fadeIn(q),sy:Math.max(.01,E.outBack(q))}));
an("flou","Mise au point","bloc",.6,0,q=>({a:E.outC(q),b:(1-E.outC(q))*.35}));
an("masque_gauche","Révélation de gauche à droite","bloc",.6,0,q=>({cx:E.inOutC(q)}));
an("masque_bas","Révélation de bas en haut","bloc",.55,0,q=>({cy:E.outC(q)}));
an("balancier","Balancier","bloc",.9,0,q=>({a:fadeIn(q),r:Math.sin(q*PI*3)*(1-q)*.3}));
an("etirement","Étirement","bloc",.5,0,q=>({a:fadeIn(q),sx:Math.max(.01,E.outBack(q)),sy:1+(1-q)*.3}));
an("glitch","Glitch","bloc",.6,0,(q,i,n,lt)=>({a:q>0?1:0,dx:q<1?(rnd(Math.floor(lt*30))-.5)*.5*(1-q):0,col:q<.8&&rnd(Math.floor(lt*30)+3)>.6?"acc":null}));
an("secousse","Secousse","bloc",.6,0,(q,i,n,lt)=>({a:cl(q*4),dx:Math.sin(lt*70)*.12*(1-q),dy:Math.cos(lt*53)*.08*(1-q)}));
an("spirale","Spirale","bloc",.7,0,q=>({a:E.outC(q),r:(1-E.outC(q))*PI,s:Math.max(.01,E.outC(q))}));
an("inclinaison","Inclinaison","bloc",.55,0,q=>({a:fadeIn(q),k:(1-E.outC(q))*.7,dx:(1-E.outC(q))*1.2}));
an("tampon","Coup de tampon","bloc",.35,0,q=>({a:cl(q*5),s:2.2-1.2*E.outExpo(q),r:-.06*(1-q)}));
an("chute","Chute","bloc",.6,0,q=>({a:cl(q*5),dy:-Math.pow(1-q,2)*5}));
an("envol","Envol","bloc",.55,0,q=>({a:fadeIn(q),dy:(1-E.outExpo(q))*3}));
an("mots_fondu","Mots en fondu","mot",.4,.12,q=>({a:E.outC(q)}));
an("mots_monte","Mots qui montent","mot",.45,.1,q=>({a:E.outC(q),dy:(1-E.outC(q))*.6}));
an("mots_pop","Mots qui sautent","mot",.4,.1,q=>({a:fadeIn(q),s:Math.max(.01,E.outBack(q))}));
an("mots_rebond","Mots qui rebondissent","mot",.6,.1,q=>({a:cl(q*4),dy:-(1-E.outBounce(q))*1.8}));
an("mots_glisse","Mots qui glissent","mot",.45,.1,q=>({a:fadeIn(q),dx:(1-E.outC(q))*1.4}));
an("mots_zoom","Mots qui zooment","mot",.4,.1,q=>({a:E.outC(q),s:1.9-.9*E.outC(q)}));
an("mots_flou","Mots qui s'éclaircissent","mot",.45,.1,q=>({a:E.outC(q),b:(1-q)*.3}));
an("mots_rotation","Mots qui tournent","mot",.45,.1,q=>({a:fadeIn(q),r:(1-E.outBack(q))*.8}));
an("mots_cascade","Mots en cascade","mot",.45,.1,(q,i)=>({a:E.outC(q),dy:(i%2?1:-1)*(1-E.outC(q))*.9}));
an("mots_machine","Mot après mot","mot",.01,.22,q=>({a:q>0?1:0}));
an("mots_elastique","Mots élastiques","mot",.7,.1,q=>({a:fadeIn(q),s:Math.max(.01,E.outElastic(q))}));
an("mots_tampon","Mots tamponnés","mot",.3,.16,q=>({a:cl(q*5),s:2-E.outExpo(q)}));
an("machine","Machine à écrire","lettre",.01,.045,q=>({a:q>0?1:0}));
an("lettres_fondu","Lettres en fondu","lettre",.35,.03,q=>({a:E.outC(q)}));
an("lettres_monte","Lettres qui montent","lettre",.4,.03,q=>({a:E.outC(q),dy:(1-E.outC(q))*.55}));
an("lettres_pop","Lettres qui sautent","lettre",.35,.03,q=>({a:fadeIn(q),s:Math.max(.01,E.outBack(q))}));
an("lettres_rebond","Lettres qui rebondissent","lettre",.6,.035,q=>({a:cl(q*4),dy:-(1-E.outBounce(q))*1.4}));
an("lettres_vague","Vague de lettres","lettre",.35,.03,(q,i,n,lt)=>({a:E.outC(q),dy:Math.sin(lt*6-i*.55)*.1}));
an("lettres_chute","Lettres qui tombent","lettre",.55,.035,q=>({a:cl(q*4),dy:-(1-E.outBounce(q))*2.2}));
an("lettres_zoom","Lettres qui zooment","lettre",.35,.03,q=>({a:E.outC(q),s:2.2-1.2*E.outC(q)}));
an("lettres_desordre","Lettres en désordre","lettre",.35,0,q=>({a:E.outC(q)}),(i,n)=>rnd(i+3)*Math.min(.9,n*.035));
an("lettres_rotation","Lettres qui tournent","lettre",.45,.03,q=>({a:fadeIn(q),r:(1-E.outC(q))*PI}));
an("lettres_flou","Lettres floues","lettre",.4,.03,q=>({a:E.outC(q),b:(1-q)*.35}));
an("lettres_ecart","Lettres qui se rapprochent","lettre",.7,0,(q,i,n)=>({a:E.outC(q),dx:(i-n/2)/Math.max(1,n)*(1-E.outC(q))*6}));
an("decodage","Décodage","lettre",.45,.03,q=>({a:1,ch:q<1?"#$%&@*?!ABCDEFGHJKMNPRSTUVWXYZ0123456789":null}));
an("lettres_elastique","Lettres élastiques","lettre",.7,.03,q=>({a:fadeIn(q),s:Math.max(.01,E.outElastic(q))}));
an("lettres_balancier","Lettres en balancier","lettre",.8,.03,q=>({a:fadeIn(q),r:Math.sin(q*PI*2)*(1-q)*.6}));
an("lettres_couleur","Lettres qui s'allument","lettre",.4,.035,q=>({a:fadeIn(q),col:q<1?"acc":null}));
const ANIM_ALIAS={};
/* dessine un titre déjà découpé en lignes, avec son style et son animation ; lt = temps depuis le début de la scène */
function drawTitle(g, lines, x, y, lh, o){ g.save(); try{ drawTitle0(g,lines,x,y,lh,o); } finally{ g.restore(); if("letterSpacing" in g) g.letterSpacing="0px"; } }
function drawTitle0(g, lines, x, y, lh, o){
  const A=ANIMS[o.anim]||ANIMS.monte, S=TSTYLES[o.style]||TSTYLES.simple, size=o.size, delay=o.delay||0;
  setStyleFont(g,o.font,S,size); g.textAlign="left"; g.textBaseline="top";
  const units=[]; let nUnits=0; const lines2=lines.map((ln,li)=>{ const nat=g.measureText(ln).width, lw=Math.min(o.max||1e9,nat), kx=nat>lw?lw/nat:1, x0=o.align==="center"?x-lw/2:o.align==="right"?x-lw:x; return {ln,li,lw,kx,x0,y:y+li*lh}; });
  lines2.forEach(L=>{ if(A.unit==="bloc") return; const parts=A.unit==="mot"?L.ln.split(" "):[...L.ln];
    parts.forEach((p,k)=>{ const pre=A.unit==="mot"?parts.slice(0,k).join(" ")+(k?" ":""):parts.slice(0,k).join(""); if(!p.trim()) return; units.push({txt:p,x:L.x0+g.measureText(pre).width*L.kx,y:L.y,w:g.measureText(p).width*L.kx,kx:L.kx,L,i:nUnits++}); }); });
  const n=Math.max(1,nUnits), lt=o.lt-delay, prog=i=>{ const d0=A.dl?A.dl(i,n):i*A.st; return cl((lt-d0)/Math.max(.001,A.d)); };
  const apply=(r,cx,cy)=>{ g.translate(cx+(r.dx||0)*size,cy+(r.dy||0)*size); if(r.r) g.rotate(r.r); if(r.k) g.transform(1,0,-r.k,1,0,0); const s=r.s==null?1:r.s; g.scale(s*(r.sx==null?1:r.sx),s*(r.sy==null?1:r.sy)); g.translate(-cx,-cy); };
  const drawUnit=(txt,ux,uy,w,kx,r,noBox,ui)=>{ const a=r.a==null?1:r.a; if(a<=0.001) return; g.save(); g.globalAlpha*=a; if(r.b) g.filter=`blur(${Math.max(0,r.b*size).toFixed(1)}px)`;
    if(kx!==1){ g.translate(ux,0); g.scale(kx,1); g.translate(-ux,0); }
    const t=r.ch?[...txt].map((c,j)=>c===" "?c:r.ch[Math.floor(rnd(Math.floor(o.lt*20)*13+((ui||0)+j)*7.31)*r.ch.length)]).join(""):txt;
    styledText(g,t,ux,uy,size,S,Object.assign({},o,{noBox,color:r.col?res(r.col,o):o.color}),w/kx); g.restore(); };
  if(A.unit==="bloc"){ const r=A.f(prog(0),0,1,lt), bx=lines2.reduce((m,L)=>Math.min(m,L.x0),1e9), bw=lines2.reduce((m,L)=>Math.max(m,L.x0+L.lw),-1e9)-bx, bh=lines.length*lh, cx=bx+bw/2, cy=y+bh/2;
    g.save(); apply(r,cx,cy); if(r.cx!=null||r.cy!=null){ g.beginPath(); if(r.cx!=null) g.rect(bx-2,y-size,(bw+4)*r.cx,bh+2*size); else g.rect(bx-size,y+bh+size-(bh+2*size)*r.cy,bw+2*size,(bh+2*size)*r.cy); g.clip(); }
    lines2.forEach(L=>drawUnit(L.ln,L.x0,L.y,L.lw,L.kx,r,false)); g.restore(); return; }
  /* par mot ou par lettre : le fond du style (pastille, bandeau…) apparaît avec la première unité de la ligne */
  if(S.box) lines2.forEach(L=>{ const first=units.find(u=>u.L===L); if(!first) return; const a=(A.f(prog(first.i),first.i,n,lt).a); g.save(); g.globalAlpha*=(a==null?1:a); styledText(g,"",L.x0,L.y,size,Object.assign({},S,{fill:"none",stroke:null,stroke2:null,long:null,extrude:null,shadows:null,glow:null,shadow:null}),o,L.lw); g.restore(); });
  units.forEach(u=>{ const r=A.f(prog(u.i),u.i,n,lt); g.save(); apply(r,u.x+u.w/2,u.y+lh/2); drawUnit(u.txt,u.x,u.y,u.w,u.kx,r,true,u.i); g.restore(); });
}

/* ================= SOUS-TITRES : styles animés mot par mot (le mot prononcé s'allume, saute, s'encadre…) ================= */
const CAPF={lourde:["900",'"Hanken Grotesk","Arial Black","Segoe UI",sans-serif'],condensee:["900",'"Big Shoulders Display","Arial Narrow",sans-serif'],serif:["700",'Georgia,"Times New Roman",serif'],
  manuscrite:["700",'"Segoe Print","Comic Sans MS",cursive'],ronde:["700",'"Comic Sans MS","Segoe UI",sans-serif'],mono:["700",'"IBM Plex Mono",Consolas,monospace'],fine:["600",'"Hanken Grotesk","Segoe UI",sans-serif']};
const SUBS={aucun:{id:"aucun",nom:"Sans sous-titres",mode:"aucun"}};
const sb=(id,nom,mode,o)=>{ SUBS[id]=Object.assign({id,nom,mode,font:"lourde",up:true,size:1,pos:"bas",col:"#FFFFFF",hi:"#FFE14D",stroke:"#000000",sw:.17,chunk:3},o||{}); };
[["jaune","#FFE14D"],["vert","#4ADE80"],["cyan","#22D3EE"],["rose","#FF5FA2"],["orange","#FF9F1C"],["rouge","#FF4D4D"]].forEach(([k,c])=>sb(`karaoke_${k}`,`Karaoké ${k}`,"karaoke",{hi:c}));
sb("karaoke_haut","Karaoké en haut de l'écran","karaoke",{pos:"haut"});
sb("karaoke_manuscrit","Karaoké écriture à la main","karaoke",{font:"manuscrite",up:false,hi:"#FFB703"});
sb("karaoke_condense","Karaoké lettres hautes","karaoke",{font:"condensee",size:1.15,hi:"#4ADE80"});
sb("karaoke_doux","Karaoké doux (minuscules)","karaoke",{font:"fine",up:false,hi:"#F9A8D4",sw:.12});
sb("pop_blanc","Pop (un mot à la fois)","pop",{chunk:1});
sb("pop_jaune","Pop jaune","pop",{chunk:1,col:"#FFE14D",hi:"#FFFFFF"});
sb("pop_centre","Pop au centre de l'écran","pop",{chunk:1,pos:"centre"});
sb("pop_condense","Pop lettres hautes","pop",{chunk:1,font:"condensee",size:1.2});
sb("geant_blanc","Mot géant","pop",{chunk:1,size:1.35});
sb("geant_rouge","Mot géant rouge","pop",{chunk:1,size:1.35,col:"#FF3B3B",hi:"#FFFFFF"});
[["jaune","#FFE14D"],["rouge","#E11D48"],["vert","#22C55E"],["violet","#8B5CF6"],["blanche","#FFFFFF"]].forEach(([k,c])=>sb(`boite_${k}`,`Boîte ${k}`,"boite",{hi:c}));
sb("bandeau_noir","Classique sur bandeau noir","classique",{chunk:7,up:false,stroke:null,bg:"rgba(0,0,0,.62)",font:"fine"});
sb("bandeau_blanc","Classique sur bandeau blanc","classique",{chunk:7,up:false,stroke:null,bg:"rgba(255,255,255,.92)",col:"#141414",font:"fine"});
sb("info_rouge","Bandeau d'info rouge","classique",{chunk:6,up:true,stroke:null,bg:"#C1121F",font:"condensee",size:1.1});
sb("sobre_bas","Sobre (petit, sans fond)","classique",{chunk:7,up:false,stroke:"#000000",sw:.12,bg:"rgba(0,0,0,0)",font:"fine",size:.9});
sb("machine_blanc","Machine à écrire","machine",{chunk:5,font:"mono",up:false,hi:"#FFFFFF"});
sb("machine_neon","Machine à écrire néon","machine",{chunk:5,font:"mono",up:false,col:"#39FF14",hi:"#B6FF3B",stroke:"#003300"});
sb("vague","Vague","vague",{});
sb("vague_couleurs","Vague arc-en-ciel","couleurs",{wave:true});
sb("rebond_blanc","Rebond","rebond",{});
sb("rebond_couleur","Rebond en couleur","rebond",{col:"#FFE14D",hi:"#FF5FA2"});
sb("glisse","Glissé vers le haut","glisse",{});
sb("glisse_doux","Glissé doux (minuscules)","glisse",{font:"fine",up:false,sw:.12});
sb("zoom_blanc","Zoom sur le mot","zoom",{chunk:3});
sb("zoom_jaune","Zoom jaune","zoom",{chunk:3,hi:"#FFE14D"});
[["rose","#FF2FB3"],["bleu","#38BDF8"],["vert","#39FF14"]].forEach(([k,c])=>sb(`neon_${k}`,`Néon ${k}`,"neon",{hi:c,stroke:null}));
sb("souligne_jaune","Souligné jaune","souligne",{hi:"#FFE14D"});
sb("souligne_rose","Souligné rose","souligne",{hi:"#FF5FA2"});
[["jaune","#FFE14D"],["vert","#86EFAC"],["rose","#F9A8D4"]].forEach(([k,c])=>sb(`surligneur_${k}`,`Surligneur ${k}`,"surligneur",{hi:c}));
sb("contour_blanc","Contour (mot plein quand il est dit)","contour",{hi:"#FFFFFF",col:"#FFFFFF",stroke:null});
sb("contour_jaune","Contour jaune","contour",{hi:"#FFE14D",col:"#FFE14D",stroke:null});
sb("tremble","Mot qui tremble","tremble",{hi:"#FF4D4D"});
sb("couleurs_vives","Couleurs vives","couleurs",{});
sb("couleurs_pastel","Couleurs pastel","couleurs",{cols:["#FDE68A","#BBF7D0","#BAE6FD","#FBCFE8","#DDD6FE"],stroke:"#1F2937"});
sb("relief_noir","Relief 3D","relief",{ex:"#000000"});
sb("relief_or","Relief 3D doré","relief",{col:"#FFE7A3",hi:"#FFFFFF",ex:"#8C5A00",stroke:"#3B2600"});
sb("bulle_blanche","Bulle de bande dessinée","bulle",{chunk:4,up:false,stroke:null,bg:"#FFFFFF",ink:"#141414",hi:"#E11D48",font:"ronde"});
sb("bulle_sombre","Bulle sombre","bulle",{chunk:4,up:false,stroke:null,bg:"#111827",ink:"#FFFFFF",hi:"#FFE14D"});
sb("fondu","Mots qui apparaissent","fondu",{});
sb("degrade_feu","Dégradé feu","degrade",{g:["#FFF3B0","#FF9F1C","#D00000"]});
sb("degrade_ocean","Dégradé océan","degrade",{g:["#E0F2FE","#22D3EE","#1D4ED8"]});
sb("degrade_or","Dégradé or","degrade",{g:["#FFF6C8","#E9B949","#A36B0F"],stroke:"#3B2600"});
sb("ombre_dure","Ombre dure","ombre",{shadow:"#000000",stroke:null});
sb("ombre_couleur","Ombre colorée","ombre",{shadow:"#FF2FB3",stroke:"#000000",sw:.08});
sb("serif_elegant","Élégant (lettres à empattement)","glisse",{font:"serif",up:false,sw:.1});
sb("luxe_or","Luxe doré","degrade",{font:"serif",up:false,g:["#FFF6C8","#E9B949","#A36B0F"],stroke:"#1A1100",sw:.1});
sb("jeu_video","Jeu vidéo","karaoke",{font:"mono",hi:"#B6FF3B",col:"#FFFFFF",stroke:"#002200"});
sb("enfant","Enfant (lettres rondes)","rebond",{font:"ronde",up:false,col:"#FFFFFF",hi:"#FFB703",sw:.2});
sb("gros_contour","Très gros contour","karaoke",{sw:.3,hi:"#FFE14D"});
const SUB_ALIAS={karaoke:"karaoke_jaune",pop:"pop_blanc",boite:"boite_jaune",classique:"bandeau_noir"};
const KEYW=/\d|%|€|\$|£|¥|₦|fcfa|\bcfa\b|xof|gratuit|offert|promo|solde|nouveau|nouvelle|maintenant|aujourd|seulement|livraison|commande/i;
function subChunks(ws,pr){ const max=pr.chunk||3, maxc=max>=6?34:max<=1?12:max>=4?28:22, out=[]; let cur=[];
  ws.forEach(o=>{ const len=cur.reduce((n,c)=>n+c.w.length+1,0)+o.w.length; if(cur.length&&(cur.length>=max||len>maxc)){ out.push(cur); cur=[]; } cur.push(o); if(/[.,;:!?…]$/.test(o.w)){ out.push(cur); cur=[]; } }); if(cur.length) out.push(cur); return out; }
function subPreset(id){ return SUBS[id]||SUBS[SUB_ALIAS[id]]||SUBS.karaoke_jaune; }
/* o = {capt (mots minutés par scène), t, W, H, L, V, Q, sub} */
function drawCaps(g, o){ const pr=subPreset(o.sub); if(pr.mode==="aucun"||!o.capt) return; const t=o.t;
  const c=o.capt.find(z=>z.ws.length&&t>=z.ws[0].a-0.04&&t<z.ws[z.ws.length-1].b+0.3); if(!c) return;
  const chunks=(c._ch=c._ch||{})[pr.id]||(c._ch[pr.id]=subChunks(c.ws,pr)), ch=chunks.find((k,j)=>t<(chunks[j+1]?chunks[j+1][0].a:k[k.length-1].b+0.3)); if(!ch) return;
  const {W,H,L,V,Q}=o, F=CAPF[pr.font]||CAPF.lourde, base=(pr.mode==="pop"?(V?96:84):pr.mode==="classique"||pr.mode==="bulle"?(V?42:38):(V?64:56))*(pr.size||1), maxw=W*(V?.78:.7), extra=pr.mode==="zoom"?1.35:1.08;
  const Y=pr.pos==="haut"?(V?H*.2:H*.18):pr.pos==="centre"?H*.5:(V?H*.7:Q?H*.78:H*.82), tx=w=>pr.up?w.toLocaleUpperCase("fr-FR"):w, fontAt=z=>`${F[0]} ${Math.round(z*L)}px ${F[1]}`;
  let size=base; const meas=()=>{ g.font=fontAt(size); if("letterSpacing" in g) g.letterSpacing="0px"; const sp=g.measureText(" ").width*1.7+size*L*.06*extra, lines=[[]], lw=[0];
    ch.forEach((w0,i)=>{ const txt=tx(w0.w), w=g.measureText(txt).width; let k=lines.length-1; if(lw[k]&&lw[k]+sp+w>maxw){ lines.push([]); lw.push(0); k++; } lines[k].push({wd:w0,txt,w,i}); lw[k]+=(lw[k]?sp:0)+w; }); return {sp,lines,lw}; };
  let M=meas(); while(M.lines.length>1&&size>base*.78){ size-=3; M=meas(); } while((M.lines.length>2||Math.max(...M.lw)>maxw)&&size>base*.55){ size-=3; M=meas(); }
  const S=size*L, lh=S*1.2, y0=Y-(M.lines.length-1)*lh/2; g.save(); g.textBaseline="middle"; g.lineJoin="round";
  if(pr.mode==="classique"&&pr.bg!=="rgba(0,0,0,0)") M.lines.forEach((ln,li)=>{ rrect(g,W/2-M.lw[li]/2-S*.4,y0+li*lh-lh*.55,M.lw[li]+S*.8,lh*1.1,S*.25); g.fillStyle=pr.bg; g.fill(); });
  if(pr.mode==="bulle"){ const bw=Math.max(...M.lw)+S*1.3, bh=M.lines.length*lh+S*.8, bx=W/2-bw/2, by=y0-lh*.5-S*.4; g.save(); g.shadowColor="rgba(0,0,0,.35)"; g.shadowBlur=S*.4; g.shadowOffsetY=S*.12; rrect(g,bx,by,bw,bh,S*.6); g.fillStyle=pr.bg; g.fill(); g.beginPath(); g.moveTo(W/2-S*.55,by+bh-1); g.lineTo(W/2-S*.15,by+bh+S*.75); g.lineTo(W/2+S*.3,by+bh-1); g.closePath(); g.fill(); g.restore(); }
  M.lines.forEach((ln,li)=>{ let xx=W/2-M.lw[li]/2; const yy=y0+li*lh; ln.forEach(({wd,txt,w,i})=>{
    const cur=t>=wd.a&&t<wd.b, past=t>=wd.b, fut=t<wd.a, key=KEYW.test(wd.w), q=cl((t-wd.a)/Math.max(.05,wd.b-wd.a)), qa=cl((t-wd.a)/.22);
    let col=pr.col, sc=1, dx=0, dy=0, a=1, box=null, marker=false, under=null, glow=null, outline=false, s=txt, ex=null, grad=null, left=false;
    switch(pr.mode){
      case "karaoke": if(cur){ col=pr.hi; sc=1.07; } else if(key&&past) col=pr.hi; break;
      case "pop": sc=.55+.45*E.outBack(cl((t-wd.a)/.2)); col=key?pr.hi:pr.col; break;
      case "boite": if(cur){ box=pr.hi; col=onCol(pr.hi); } else if(key) col=pr.hi===pr.col?"#FFE14D":pr.hi; break;
      case "classique": break;
      case "machine": left=true; if(fut) a=0; else if(cur){ const n=Math.max(1,Math.ceil([...txt].length*Math.min(1,q*1.4))); s=[...txt].slice(0,n).join(""); col=pr.hi; } break;
      case "vague": dy=Math.sin(t*6+i*.9)*S*.08; if(cur) col=pr.hi; break;
      case "rebond": if(fut) a=0; else dy=-(1-E.outBounce(cl((t-wd.a)/.35)))*S*.7; if(cur) col=pr.hi; break;
      case "glisse": if(fut) a=0; else { const k=E.outC(qa); dy=(1-k)*S*.5; a=k; } if(cur) col=pr.hi; break;
      case "zoom": if(cur){ sc=1.3; col=pr.hi; } break;
      case "neon": if(cur){ glow=pr.hi; col="#FFFFFF"; } else { a=.75; col=pr.hi; } break;
      case "souligne": if(cur) under={c:pr.hi,k:E.outC(cl(q*1.5))}; break;
      case "surligneur": if(cur||(past&&key)){ box=pr.hi; marker=true; col=onCol(pr.hi); } break;
      case "contour": outline=!cur; if(cur) col=pr.hi; break;
      case "tremble": if(cur){ dx=Math.sin(t*90)*S*.05; dy=Math.cos(t*77)*S*.05; col=pr.hi; sc=1.06; } break;
      case "couleurs": col=(pr.cols||["#FFE14D","#4ADE80","#22D3EE","#FF5FA2","#FF9F1C"])[i%5]; if(cur) sc=1.1; if(pr.wave) dy=Math.sin(t*6+i*.9)*S*.08; break;
      case "relief": ex=pr.ex; if(cur) col=pr.hi; break;
      case "bulle": col=cur?pr.hi:pr.ink; break;
      case "fondu": a=fut?0:cur?Math.max(.15,qa):1; if(cur) col=pr.hi; break;
      case "degrade": grad=pr.g; if(cur) sc=1.06; break;
      case "ombre": if(cur) sc=1.06; break;
    }
    if(a<=0.01){ xx+=w+M.sp; return; }
    g.save(); g.globalAlpha=a; g.translate(xx+w/2+dx,yy+dy); g.scale(sc,sc); g.font=fontAt(size); g.textAlign=left?"left":"center"; const X=left?-w/2:0, Y0=S*.04;
    if(box){ if(marker){ g.fillStyle=box; g.beginPath(); g.moveTo(-w/2-S*.15,-lh*.32); g.lineTo(w/2+S*.2,-lh*.38); g.lineTo(w/2+S*.12,lh*.42); g.lineTo(-w/2-S*.22,lh*.46); g.closePath(); g.fill(); } else { rrect(g,-w/2-S*.2,-lh*.5,w+S*.4,lh,S*.22); g.fillStyle=box; g.fill(); } }
    if(under){ g.fillStyle=under.c; g.fillRect(-w/2,lh*.36,w*under.k,Math.max(2,S*.11)); }
    if(ex){ g.fillStyle=ex; for(let k=Math.max(1,Math.round(S*.12));k>0;k--) g.fillText(s,X+k*.7,Y0+k); }
    if(pr.shadow){ g.shadowColor=pr.shadow; g.shadowOffsetX=S*.07; g.shadowOffsetY=S*.07; g.shadowBlur=0; }
    if(glow){ g.shadowColor=glow; g.shadowBlur=S*.55; }
    const stroke=pr.stroke&&!box&&!outline;
    if(stroke){ g.lineWidth=Math.max(2,S*pr.sw); g.strokeStyle=pr.stroke; g.strokeText(s,X,Y0); if(!glow&&!pr.shadow){ g.shadowColor="transparent"; } }
    if(outline){ g.lineWidth=Math.max(2,S*.07); g.strokeStyle=col; g.strokeText(s,X,Y0); }
    else { if(grad){ const gr=g.createLinearGradient(0,-S*.5,0,S*.5); grad.forEach((c2,k,arr)=>gr.addColorStop(k/(arr.length-1),c2)); g.fillStyle=gr; } else g.fillStyle=col; g.fillText(s,X,Y0); if(glow) g.fillText(s,X,Y0); }
    g.restore(); xx+=w+M.sp; }); });
  g.restore(); }

/* ================= APERÇUS (petites images pour choisir) ================= */
function sample(w,h){ const k=`sample${w}x${h}`; let c=pool[k]; if(c) return c; c=pool[k]=document.createElement("canvas"); c.width=w; c.height=h; const x=c.getContext("2d");
  const sky=x.createLinearGradient(0,0,0,h); sky.addColorStop(0,"#5B8DEF"); sky.addColorStop(.62,"#F8B26A"); sky.addColorStop(1,"#E76F51"); x.fillStyle=sky; x.fillRect(0,0,w,h);
  x.fillStyle="#FFE8A3"; x.beginPath(); x.arc(w*.7,h*.36,Math.min(w,h)*.13,0,2*PI); x.fill();
  x.fillStyle="#2A9D8F"; x.beginPath(); x.moveTo(0,h*.72); x.quadraticCurveTo(w*.3,h*.58,w*.6,h*.7); x.quadraticCurveTo(w*.85,h*.78,w,h*.66); x.lineTo(w,h); x.lineTo(0,h); x.closePath(); x.fill();
  x.fillStyle="#264653"; x.fillRect(0,h*.86,w,h*.14); x.fillStyle="#FFFFFF"; x.fillRect(w*.16,h*.6,w*.26,h*.22); x.fillStyle="#E63946"; x.fillRect(w*.16,h*.6,w*.26,h*.055); x.fillStyle="#1D3557"; x.fillRect(w*.2,h*.7,w*.18,h*.02);
  return c; }
const card=(w,h,bg,txt)=>{ const k=`card${w}x${h}${bg}${txt}`; let c=pool[k]; if(c) return c; c=pool[k]=document.createElement("canvas"); c.width=w; c.height=h; const x=c.getContext("2d"); x.fillStyle=bg; x.fillRect(0,0,w,h); x.fillStyle="rgba(255,255,255,.9)"; x.font=`900 ${Math.round(Math.min(w,h)*.55)}px "Hanken Grotesk",Arial,sans-serif`; x.textAlign="center"; x.textBaseline="middle"; x.fillText(txt,w/2,h/2); return c; };
function thumb(cat,id,cv,o){ o=o||{}; const g=cv.getContext("2d"), W=cv.width, H=cv.height, V=H>W*1.2, L=Math.min(W,H)/720, acc=o.acc||"#FF2E88", acc2=o.acc2||"#14213D";
  g.save(); g.setTransform(1,0,0,1,0,0); g.globalAlpha=1; g.globalCompositeOperation="source-over"; g.filter="none"; g.fillStyle="#000"; g.fillRect(0,0,W,H);
  try{
    if(cat==="trans"){ const T=trans(id); T.f(g,card(W,H,"#1F2937","A"),card(W,H,"#E8590C","B"),o.p==null?.5:o.p,{W,H,acc,t:o.p||.5}); }
    else if(cat==="looks"){ look(g,o.src||sample(W,H),id,{W,H,t:o.t||.4}); }
    else if(cat==="subs"){ g.drawImage(sample(W,H),0,0); g.fillStyle="rgba(0,0,0,.35)"; g.fillRect(0,0,W,H); const ws=[["TON",0,.35],["TEXTE",.35,.8],["ICI",.8,1.2]].map(([w,a,b])=>({w,a,b}));
      drawCaps(g,{capt:[{i:0,ws}],t:o.t==null?.55:o.t,W,H,L,V,Q:!V&&H>W*.8,sub:id}); }
    else if(cat==="palettes"){ const P=PALETTES[id]; if(!P||!P.acc){ const gr=g.createLinearGradient(0,0,W,H); ["#FF6B35","#FFD60A","#4ADE80","#22D3EE","#A78BFA"].forEach((c,i)=>gr.addColorStop(i/4,c)); g.fillStyle=gr; g.fillRect(0,0,W,H); }
      else { const gr=g.createLinearGradient(0,0,W,H); gr.addColorStop(0,P.acc); gr.addColorStop(1,P.acc2); g.fillStyle=gr; g.fillRect(0,0,W,H); g.fillStyle=P.acc; g.beginPath(); g.arc(W*.3,H*.72,Math.min(W,H)*.16,0,2*PI); g.fill(); g.fillStyle=P.acc2; g.beginPath(); g.arc(W*.62,H*.72,Math.min(W,H)*.16,0,2*PI); g.fill(); g.lineWidth=2; g.strokeStyle="rgba(255,255,255,.7)"; g.stroke(); }
      g.fillStyle=P&&P.acc?onCol(P.acc):"#141414"; g.font=`900 ${Math.round(Math.min(W,H)*.3)}px "Hanken Grotesk",Arial,sans-serif`; g.textAlign="center"; g.textBaseline="middle"; g.fillText("Aa",W/2,H*.32); }
    else if(cat==="tstyles"){ g.fillStyle="#334155"; g.fillRect(0,0,W,H); const S=TSTYLES[id]||TSTYLES.simple, size=Math.round(Math.min(W,H)*.24), txt=S.up?"PROMO":"Promo"; setStyleFont(g,`900 ${size}px "Hanken Grotesk",Arial,sans-serif`,S,size); g.textBaseline="top"; const w=g.measureText(txt).width;
      g.save(); if(S.rot){ g.translate(W/2,H/2); g.rotate(S.rot*PI/180); g.translate(-W/2,-H/2); } styledText(g,txt,W/2-w/2,H/2-size*.56,size,S,{acc,acc2,color:"#FFFFFF"},w); g.restore(); if("letterSpacing" in g) g.letterSpacing="0px"; }
    else if(cat==="anims"){ g.fillStyle="#1F2937"; g.fillRect(0,0,W,H); const size=Math.round(Math.min(W,H)*.22); drawTitle(g,["Titre"],W/2,H/2-size*.56,size*1.12,{size,font:`900 ${size}px "Hanken Grotesk",Arial,sans-serif`,color:"#FFFFFF",align:"center",max:W*.9,style:"simple",anim:id,lt:o.lt==null?.22:o.lt,acc,acc2}); }
    else if(cat==="moves"){ const src=sample(W,H), m=move(id,o.p==null?.85:o.p,o.t||1); g.globalAlpha=.35; g.drawImage(src,0,0); g.globalAlpha=1; g.save(); g.translate(W/2+m.x*W,H/2+m.y*H); g.rotate(m.r); const fw=W/m.z, fh=H/m.z; g.beginPath(); g.rect(-fw/2,-fh/2,fw,fh); g.restore(); g.save(); g.clip(); g.drawImage(src,0,0); g.restore();
      g.save(); g.translate(W/2+m.x*W,H/2+m.y*H); g.rotate(m.r); g.lineWidth=2; g.strokeStyle="#FFFFFF"; g.strokeRect(-W/m.z/2,-H/m.z/2,W/m.z,H/m.z); g.restore(); }
  }catch(e){ g.fillStyle="#7F1D1D"; g.fillRect(0,0,W,H); }
  g.restore(); }

/* ================= CATALOGUE ================= */
const list=o=>Object.values(o).map(v=>({id:v.id,nom:v.nom}));
/* familles cohérentes de transitions, pour « Surprends-moi » et le choix automatique */
const KITS={energique:["zoom_entree","fouette_g","fouette_d","flash_blanc","coupe_rythme","secousse","pousse_g","glitch"],doux:["fondu","volet_doux_d","flou","fondu_morph","iris","lumiere"],
  luxe:["fondu","volet_doux_g","lumiere","iris","fondu_noir","rideau"],fun:["rebond","elastique","etoile","coeur","cercles","damier","tourbillon","zoom_rotation"],
  tech:["glitch","pixels","barres","mosaique","tele_on","volet_d","tranches_v"],cinema:["fondu_noir","volet_doux_d","rideau","lumiere","division","zoom_traverse"],
  dynamique:["pousse_g","pousse_h","glisse_g","volet_bd","cube_g","tranches_h","coupe_rythme"]};
window.SP_FX={version:1, E, rnd, move, moves:MOVES, look, looks:LOOKS, transition:trans, trans:TRANS, palettes:PALETTES, tstyles:TSTYLES, styledText, setStyleFont, anims:ANIMS, drawTitle,
  subs:SUBS, subPreset, drawCaps, sample, thumb, rrect, onCol, kits:KITS, alias:{move:MOVE_ALIAS, trans:TRANS_ALIAS, subs:SUB_ALIAS},
  list:{subs:list(SUBS), trans:list(TRANS), looks:list(LOOKS), palettes:list(PALETTES), tstyles:list(TSTYLES), anims:list(ANIMS), moves:list(MOVES)}};
})();
