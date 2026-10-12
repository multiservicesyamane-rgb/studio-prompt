/* Studio Prompt : moteur d'image de « Garder la voix, refaire l'image » (récitations, lectures).
   Habillages premium dessinés et animés à la volée (aucune image externe) : livre ancien, nuit sacrée, arabesque d'or, néon doré,
   aube paisible, noir et or, rouleau qui défile. Le texte vient TOUJOURS d'une source fournie (jamais inventé) ; il n'est jamais modifié.
   Même moteur pour l'aperçu, la vidéo et l'écran de direct (OBS, TikTok Live Studio). */
(function(){
"use strict";
const PI=Math.PI, cl=(v,a,b)=>Math.max(a==null?0:a,Math.min(b==null?1:b,v)), ease=p=>1-Math.pow(1-cl(p),3), easeIO=p=>{ p=cl(p); return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2; };
const rnd=i=>{ const x=Math.sin(i*127.1+311.7)*43758.5453; return x-Math.floor(x); };
const AR='"Amiri Quran","Amiri","Scheherazade New","Noto Naskh Arabic","Traditional Arabic",serif', AR_T='"Aref Ruqaa","Amiri","Noto Naskh Arabic",serif', LAT='"Cormorant Garamond",Georgia,"Times New Roman",serif';
const DIG="٠١٢٣٤٥٦٧٨٩", arNum=n=>String(n).replace(/\d/g,d=>DIG[d]);
const rgba=(hex,a)=>{ const m=/^#?([0-9a-f]{6})$/i.exec(hex); if(!m) return hex; const n=parseInt(m[1],16); return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`; };
/* chargement des polices avant de dessiner (sinon le texte arabe sortirait dans une police de secours) */
let fontsP=null;
function ready(){ if(fontsP) return fontsP; const F=document.fonts; if(!F||!F.load) return fontsP=Promise.resolve();
  fontsP=Promise.all(['64px "Amiri Quran"','700 40px "Amiri"','700 48px "Aref Ruqaa"','italic 500 30px "Cormorant Garamond"','500 30px "Cormorant Garamond"'].map(f=>F.load(f,"بسم الله Ab").catch(()=>null))).then(()=>null); return fontsP; }

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

/* ---------- habillages ---------- */
const THEMES={
  livre:{nom:"Livre ancien",desc:"Un mushaf posé sur du cuir : pages qui tournent, cadre doré, caméra qui change d'angle."},
  nuit:{nom:"Nuit sacrée",desc:"Ciel étoilé, croissant lumineux, silhouette de mosquée, nuages qui passent."},
  arabesque:{nom:"Arabesque d'or",desc:"Motifs géométriques islamiques dorés, reflet qui les parcourt, cadre en arc de mihrab."},
  neon:{nom:"Néon doré",desc:"Arc de mihrab en néon doré qui se dessine, particules de lumière."},
  aube:{nom:"Aube paisible",desc:"Ciel du lever du jour, rayons du soleil, brume légère."},
  minimal:{nom:"Noir et or",desc:"Minimal et luxueux : filets d'or, grand numéro du verset en filigrane, grain."},
  rouleau:{nom:"Rouleau qui défile",desc:"Un parchemin où les versets défilent comme les lignes d'un livre ; le verset récité est en or."}
};

/* o = {fmt, K, theme, items:[{kind:"titre"|"basmala"|"verset", n, ar, tr, a, b}], sourate:{ar, nom}, recitant, showTr, total} */
function stage(o){
  const V=o.fmt==="9:16", Q=o.fmt==="1:1", W=V?720:Q?720:1280, H=V?1280:720, K=o.K||1, L=Math.min(W,H)/720, T=THEMES[o.theme]?o.theme:"nuit";
  const c=document.createElement("canvas"); c.width=Math.round(W*K); c.height=Math.round(H*K); const g=c.getContext("2d");
  const items=(o.items||[]).slice().sort((a,b)=>a.a-b.a), total=o.total||((items[items.length-1]||{}).b)||0, showTr=o.showTr!==false;
  const off=(w,h)=>{ const x=document.createElement("canvas"); x.width=Math.round(w*K); x.height=Math.round(h*K); const xg=x.getContext("2d"); xg.setTransform(K,0,0,K,0,0); return [x,xg]; };
  /* palette du texte selon l'habillage */
  const P={livre:{ink:"#3B2410",ink2:"#6B4A23",gold:"#B8860B",glow:"rgba(255,230,170,.0)"},nuit:{ink:"#FFF8E7",ink2:"#E9DDBA",gold:"#E8C46A",glow:"rgba(232,196,106,.55)"},arabesque:{ink:"#FFF6DC",ink2:"#E7D8A8",gold:"#D4AF37",glow:"rgba(212,175,55,.45)"},
    neon:{ink:"#FFFFFF",ink2:"#F3E3B0",gold:"#FFC94D",glow:"rgba(255,201,77,.75)"},aube:{ink:"#FFFFFF",ink2:"#FFF1DC",gold:"#FFD27A",glow:"rgba(80,40,10,.45)"},minimal:{ink:"#F6EFE0",ink2:"#CFC3A6",gold:"#C9A24A",glow:"rgba(0,0,0,0)"},rouleau:{ink:"#3B2410",ink2:"#7A5A30",gold:"#9C6B12",glow:"rgba(0,0,0,0)"}}[T];
  /* zone du texte selon l'habillage et le format */
  const box=T==="livre"?(V?{x:W*.17,y:H*.27,w:W*.66,h:H*.5}:{x:W*.55,y:H*.17,w:W*.33,h:H*.62}):T==="rouleau"?(V?{x:W*.13,y:H*.28,w:W*.74,h:H*.46}:{x:W*.22,y:H*.24,w:W*.56,h:H*.52}):T==="arabesque"||T==="neon"?(V?{x:W*.16,y:H*.3,w:W*.68,h:H*.48}:{x:W*.27,y:H*.3,w:W*.46,h:H*.5}):(V?{x:W*.08,y:H*.28,w:W*.84,h:H*.46}:{x:W*.1,y:H*.24,w:W*.8,h:H*.52});
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
  })(bgx);
  /* ---- textes mis en page une fois par élément (cache) ---- */
  const cache=new Map(), meas=document.createElement("canvas").getContext("2d"), isRtl=txt=>/[\u0590-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(String(txt||""));
  const wrapAr=(x,txt,maxw)=>{ const ws=String(txt).split(/\s+/).filter(Boolean), lines=[]; let line=""; ws.forEach(w=>{ const q=line?line+" "+w:w; if(line&&x.measureText(q).width>maxw){ lines.push(line); line=w; } else line=q; }); if(line) lines.push(line); return lines; };
  function layout(it){ const key=it; if(cache.has(key)){ const v=cache.get(key); cache.delete(key); cache.set(key,v); return v; } const tx=meas;
    const isT=it.kind==="titre", rtl=isRtl(it.ar), maxLines=isT?3:(V?(showTr&&it.tr?5:7):(showTr&&it.tr?3:5)), trH=showTr&&it.tr&&!isT?box.h*(V?.28:.3):0, arH=box.h-trH, base=isT?(V?82:76):rtl?(V?62:56):(V?54:48), LH=rtl?1.75:1.32;
    const font=sz=>rtl?`${isT?"700 ":""}${Math.round(sz)}px ${isT?AR_T:AR}`:`${isT?"700":"600"} ${Math.round(sz)}px ${LAT}`;
    const txt=String(it.ar).replace(/\s+([\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED])/g,"$1"), floor=isT?24:Math.round(base*.72);
    let size=base, lines=[]; for(;size>=floor;size-=2){ tx.font=font(size); lines=wrapAr(tx,txt,box.w*.94); if(lines.length<=maxLines&&lines.length*size*LH<=arH) break; }
    size=Math.max(size,floor); tx.font=font(size); lines=wrapAr(tx,txt,box.w*.94);
    /* verset très long : en grandes lettres sur plusieurs pages, qui se suivent au fil de la récitation ; la traduction est répartie avec */
    const per=Math.max(1,Math.min(maxLines,Math.floor(arH/(size*LH)))), pages=[]; for(let i=0;i<lines.length;i+=per) pages.push(lines.slice(i,i+per));
    const trw=String(it.tr||"").split(/\s+/).filter(Boolean), arw=pages.map(pl=>pl.join(" ").split(/\s+/).length), arT=arw.reduce((a,b)=>a+b,0)||1; let acc=0;
    const trs=pages.map((pl,i)=>{ const a=Math.round(trw.length*acc/arT); acc+=arw[i]; return trw.slice(a,Math.round(trw.length*acc/arT)).join(" "); });
    const lh=size*LH, bys=[], render=(pl,x,trTxt)=>{ x.clearRect(0,0,box.w,box.h); x.direction=rtl?"rtl":"ltr"; x.textAlign="center"; x.textBaseline="middle"; x.font=font(size);
      const y0=(arH-pl.length*lh)/2+lh/2; bys.push(y0+(pl.length-1)*lh+size*.95); if(P.glow!=="rgba(0,0,0,0)"&&P.glow!=="rgba(255,230,170,.0)"){ x.shadowColor=P.glow; x.shadowBlur=size*.45; } x.fillStyle=isT?P.gold:P.ink;
      pl.forEach((ln,i)=>x.fillText(ln,box.w/2,y0+i*lh)); x.shadowColor="transparent"; x.shadowBlur=0;
      if(trH){ x.direction="ltr"; let ts=V?30:26, tl=[]; for(;ts>=16;ts-=1){ x.font=`italic 500 ${ts}px ${LAT}`; tl=wrapAr(x,trTxt,box.w*.92); if(tl.length*ts*1.3<=trH*.9) break; }
        x.fillStyle=P.ink2; const ty=arH+(trH-tl.length*ts*1.3)/2+ts*.65; tl.forEach((ln,i)=>x.fillText(ln,box.w/2,ty+i*ts*1.3)); x.strokeStyle=rgba(P.gold.length===7?P.gold:"#C9A24A",.6); x.lineWidth=1.2; x.beginPath(); x.moveTo(box.w*.3,arH+4); x.lineTo(box.w*.7,arH+4); x.stroke(); } };
    const out={pages:pages.map((pl,i)=>{ const [pc,px]=off(box.w,box.h); render(pl,px,pages.length>1?trs[i]:String(it.tr||"")); return pc; }), lines:lines.length, rtl, arH, bys, trH};
    cache.set(key,out); while(cache.size>12) cache.delete(cache.keys().next().value);   /* seuls les textes autour du moment présent restent en mémoire */
    return out; }
  const itemAt=t=>{ let lo=0, hi=items.length-1, k=-1; while(lo<=hi){ const m=(lo+hi)>>1; if(items[m].a<=t){ k=m; lo=m+1; } else hi=m-1; } return k; };
  const pageOf=(it,lay,t)=>lay.pages.length<2?0:Math.min(lay.pages.length-1,Math.floor(cl((t-it.a)/Math.max(.5,(it.b||it.a+4)-it.a),0,.999)*lay.pages.length));
  /* dessin d'un bloc de texte avec son entrée (fondu, montée, mise au point) */
  function drawText(x,it,t,alpha,dy,blur){ if(!it||alpha<=0) return; const lay=layout(it), pc=lay.pages[pageOf(it,lay,t)]; x.save(); x.globalAlpha=alpha; if(blur>0.3) x.filter=`blur(${blur.toFixed(1)}px)`; x.drawImage(pc,box.x,box.y+(dy||0),box.w,box.h); x.restore();
    /* au rythme de la voix, dans le sens de lecture (de droite à gauche pour l'arabe) : sur le papier, un filet d'or avance sous le verset ;
       sur les fonds sombres, une lueur douce passe sur les mots */
    if(it.kind==="verset"&&it.b>it.a&&alpha>.5&&T!=="minimal"){ const p=cl((t-it.a)/(it.b-it.a)), pg=pageOf(it,lay,t), y0=box.y+(dy||0);
      if(T==="livre"||T==="rouleau"){ const y=y0+Math.min(lay.arH-6,lay.bys[pg]||lay.arH*.8), w=box.w*.4; x.save(); x.globalAlpha=alpha*.35; x.fillStyle=P.gold; x.fillRect(box.x+box.w*.3,y,w,1.2*L); x.globalAlpha=alpha*.9;
        if(lay.rtl) x.fillRect(box.x+box.w*.7-w*p,y-.4*L,w*p,2*L); else x.fillRect(box.x+box.w*.3,y-.4*L,w*p,2*L); x.restore(); }
      else { const lx=box.x+box.w*(lay.rtl?1-p:p), cy=y0+lay.arH/2, r=box.w*.2; x.save(); x.globalCompositeOperation="screen"; x.globalAlpha=alpha; x.translate(lx,cy); x.scale(1,Math.max(.3,lay.arH*.42/r));
        const gr=x.createRadialGradient(0,0,0,0,0,r); gr.addColorStop(0,"rgba(255,232,170,.22)"); gr.addColorStop(1,"rgba(255,232,170,0)"); x.fillStyle=gr; x.fillRect(-r,-r,2*r,2*r); x.restore(); } } }
  /* en-tête (sourate) et pied (récitant, avancement) */
  function chrome(x,t,it){ const col=P.gold, so=(!o.fixe&&it&&it.sourate)||o.sourate; x.save(); x.textAlign="center"; x.textBaseline="middle"; x.direction="rtl";
    if(so&&so.ar){ const bk=T==="livre"&&V, med=T==="livre"&&!V, y=med?H*.485:bk?H*.172:T==="rouleau"?H*.04:(V?H*.13:H*.11), cx=med?W*.29:W/2; const hr=isRtl(so.ar); x.direction=hr?"rtl":"ltr"; x.font=hr?`700 ${Math.round((med?52:bk?34:(V?42:36))*L)}px ${AR_T}`:`700 ${Math.round((med?34:bk?30:(V?38:32))*L)}px ${LAT}`; x.fillStyle=col; if(T!=="livre"&&T!=="rouleau"){ x.shadowColor=P.glow; x.shadowBlur=14*L; } x.fillText(so.ar,cx,y); x.shadowBlur=0;
      if(so.nom&&T!=="rouleau"){ x.direction="ltr"; x.font=`500 ${Math.round((med?19:bk?19:(V?22:19))*L)}px ${LAT}`; x.fillStyle=P.ink2; x.globalAlpha=.85; x.fillText(so.nom,cx,med?y+48*L:bk?H*.207:y+(V?40:34)*L); x.globalAlpha=1; } }
    if(it&&it.kind==="verset"&&it.n){ const mx=T==="livre"&&!V?W*.71:W/2, my=T==="livre"?(V?H*.8:H*.84):T==="rouleau"?H*.955:(V?box.y+box.h+46*L:box.y+box.h+30*L); ayahMark(x,mx,my,(V?24:20)*L,it.n,col,T==="livre"||T==="rouleau"?P.ink:P.ink); }
    x.direction="ltr"; const fy=T==="rouleau"?H*.985:H-(V?40:26)*L; if(o.recitant&&T!=="rouleau"){ x.font=`italic 500 ${Math.round((V?22:18)*L)}px ${LAT}`; x.fillStyle=T==="livre"?"#E9D9B4":P.ink2; x.globalAlpha=.85; x.fillText(`Récitation : ${o.recitant}`,W/2,fy-(V?22:20)*L); x.globalAlpha=1; }
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
    else if(T==="livre"){ const gr=x.createRadialGradient(W*(.5+.15*Math.sin(t*.1)),H*.4,0,W/2,H*.4,W*.9); gr.addColorStop(0,"rgba(255,220,160,.07)"); gr.addColorStop(1,"rgba(255,220,160,0)"); x.fillStyle=gr; x.fillRect(0,0,W,H); } }
  /* « autres angles » : la caméra respire et change de cadrage tous les quelques versets */
  function camera(t,k){ if(T==="minimal"||T==="rouleau") return {z:1,x:0,y:0,r:0}; const shot=Math.floor(Math.max(0,k)/3)%3, z0=[1.02,1.09,1.05][shot], br=.008*(.5+.5*Math.sin(t*.35)); return {z:z0+br,x:[0,-.012,.012][shot]*W,y:[0,-.01,.008][shot]*H,r:[0,-.004,.004][shot]+.0015*Math.sin(t*.2)}; }
  let prevK=-1, camFrom={z:1,x:0,y:0,r:0}, camAt=0;
  function draw(t){ g.setTransform(K,0,0,K,0,0); g.globalAlpha=1; g.filter="none"; g.globalCompositeOperation="source-over"; const k=itemAt(t), it=items[k], prev=k>0?items[k-1]:null;
    let cam=camera(t,k); if(k!==prevK){ camFrom=prevK<0?cam:camera(t,prevK); camAt=t; prevK=k; } const cq=easeIO((t-camAt)/1.6); cam={z:camFrom.z+(cam.z-camFrom.z)*cq,x:camFrom.x+(cam.x-camFrom.x)*cq,y:camFrom.y+(cam.y-camFrom.y)*cq,r:camFrom.r+(cam.r-camFrom.r)*cq};
    g.save(); g.translate(W/2+cam.x,H/2+cam.y); g.rotate(cam.r); g.scale(cam.z,cam.z); g.translate(-W/2,-H/2); g.drawImage(bg,0,0,W,H); live(g,t);
    const q=it?cl((t-it.a)/.9):1;
    if(T==="rouleau"){ /* les versets défilent : l'actuel au centre, en or ; les autres plus pâles */ const step=box.h*.62, pos=k<0?0:k-1+easeIO(cl((t-(it?it.a:0))/1.1));
      g.save(); g.beginPath(); g.rect(V?W*.08:W*.18,H*.1,V?W*.84:W*.64,H*.8); g.clip(); for(let j=Math.max(0,k-2);j<=Math.min(items.length-1,k+2);j++){ const d=j-pos, a=j===k?1:Math.max(0,.42-.12*Math.abs(d)); if(a<=0) continue; g.save(); g.translate(0,d*step); drawText(g,items[j],t,a,0,0); g.restore(); } g.restore(); }
    else if(T==="livre"&&prev&&q<1){ /* page qui tourne : elle pivote sur sa reliure (à droite sur téléphone, comme un livre arabe ; au milieu en paysage), s'assombrit, et son ombre glisse sur la page suivante */
      drawText(g,it,t,ease(q*1.6),0,0); const f=easeIO(q), pr=V?{x:W*.1,y:H*.12,w:W*.8,h:H*.76}:{x:W*.5,y:H*.1,w:W*.42,h:H*.8}, piv=V?pr.x+pr.w:pr.x, sx=Math.cos(f*PI/2);
      if(sx>.02){ g.save(); g.translate(piv,0); g.scale(sx,1); g.translate(-piv,0); g.drawImage(bg,pr.x*K,pr.y*K,pr.w*K,pr.h*K,pr.x,pr.y,pr.w,pr.h); drawText(g,prev,t,1,0,0);
        const dk=.5*f, sh=g.createLinearGradient(pr.x,0,pr.x+pr.w,0); sh.addColorStop(0,`rgba(40,20,0,${V?dk:dk*.15})`); sh.addColorStop(1,`rgba(40,20,0,${V?dk*.15:dk})`); g.fillStyle=sh; g.fillRect(pr.x,pr.y,pr.w,pr.h); g.restore();
        const ex=V?piv-pr.w*sx:piv+pr.w*sx, d=V?-1:1, sw=60*L, sg=g.createLinearGradient(ex,0,ex+d*sw,0); sg.addColorStop(0,`rgba(40,20,0,${.32*Math.sin(f*PI)})`); sg.addColorStop(1,"rgba(40,20,0,0)"); g.fillStyle=sg; g.fillRect(Math.min(ex,ex+d*sw),pr.y,sw,pr.h); } }
    else { if(prev&&q<1) drawText(g,prev,t,1-ease(q*1.4),-14*L*ease(q),0); drawText(g,it,t,ease(q*1.2),(1-ease(q))*22*L,(1-ease(q))*6); }
    chrome(g,t,it); g.restore();
    if(T==="minimal"&&it&&it.kind==="verset"){ g.save(); g.globalAlpha=.06; g.fillStyle="#C9A24A"; g.font=`700 ${Math.round(H*.32)}px ${AR}`; g.textAlign="center"; g.textBaseline="middle"; g.fillText(arNum(it.n),W/2,H*.5); g.restore(); }
    const vg=g.createRadialGradient(W/2,H/2,Math.min(W,H)*.45,W/2,H/2,Math.hypot(W,H)/1.7); vg.addColorStop(0,"rgba(0,0,0,0)"); vg.addColorStop(1,"rgba(0,0,0,.35)"); g.fillStyle=vg; g.fillRect(0,0,W,H); }
  return {canvas:c,W,H,K,draw,total,fmt:V?"9:16":Q?"1:1":"16:9"};
}

/* Calage des textes sur la voix (aucune IA) : chaque coupure tombe dans une pause, et chaque texte reçoit un temps de parole proche de sa longueur
   (lettres sans les signes de lecture). Programmation dynamique fenêtrée : rapide même pour 5 h de récitation et des milliers de versets.
   speech = [{a,b}] morceaux de parole (pauses repérées par FFmpeg) ; texts = textes dans l'ordre. Rend [{a,b}] pour chaque texte. */
function align(speech, texts){
  const segs=(speech||[]).filter(s=>s&&s.b>s.a).map(s=>({a:+s.a,b:+s.b})).sort((x,y)=>x.a-y.a), n=(texts||[]).length; if(!segs.length||!n) return [];
  const start=segs[0].a, end=segs[segs.length-1].b; if(n===1) return [{a:+start.toFixed(2),b:+end.toFixed(2)}];
  /* pas assez de pauses pour tous les textes : les plus longs morceaux sont coupés en deux */
  while(segs.length<n){ let bi=-1, bd=0; segs.forEach((s,i)=>{ if(s.b-s.a>bd){ bd=s.b-s.a; bi=i; } }); if(bi<0||bd<.4) break; const m=(segs[bi].a+segs[bi].b)/2; segs.splice(bi,1,{a:segs[bi].a,b:m},{a:m,b:segs[bi].b}); }
  const m=segs.length-1;   /* coupure possible c (0..m-1) = début du morceau c+1 */
  if(m<n-1){ const out=[]; for(let j=0;j<n;j++) out.push({a:+(start+(end-start)*j/n).toFixed(2),b:+(start+(end-start)*(j+1)/n).toFixed(2)}); return out; }
  const cum=[0]; segs.forEach(s=>cum.push(cum[cum.length-1]+s.b-s.a)); const total=cum[segs.length];
  const gap=c=>segs[c+1].a-segs[c].b, before=c=>c<0?0:cum[c+1];   /* parole avant la coupure c */
  const units=texts.map(x=>Math.max(4,String(x).replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\s]/g,"").length)), tot=units.reduce((p,q)=>p+q,0);
  const expB=[]; let acc=0; for(let j=0;j<n-1;j++){ acc+=units[j]; expB.push(total*acc/tot); }
  const idxNear=v=>{ let lo=0, hi=m-1; while(lo<hi){ const md=(lo+hi)>>1; if(before(md)<v) lo=md+1; else hi=md; } return lo; };
  const cost=(j,p,c)=>{ const d=before(c)-before(p), e=total*units[j]/tot; return Math.pow((d-e)/(e+.8),2)-.3*Math.min(2,gap(c)); };
  const WIN=Math.max(25,Math.ceil(3*m/n)+10), rows=[]; let prev=new Map([[-1,{v:0,from:null}]]);
  for(let j=0;j<n-1;j++){ const lo0=j, hi0=m-(n-1-j), mid=idxNear(expB[j]); let row=new Map();
    const fill=(lo,hi)=>{ for(let c=lo;c<=hi;c++){ let best=Infinity, from=null; for(const [p,pv] of prev){ if(p>=c) continue; const v=pv.v+cost(j,p,c); if(v<best){ best=v; from=p; } } if(from!==null||prev.has(-1)&&best<Infinity) row.set(c,{v:best,from}); } };
    fill(Math.max(lo0,mid-WIN),Math.min(hi0,mid+WIN)); if(!row.size) fill(lo0,hi0);
    rows.push(row); prev=row; }
  let best=Infinity, last=null; for(const [p,pv] of prev){ const d=total-before(p), e=total*units[n-1]/tot, v=pv.v+Math.pow((d-e)/(e+.8),2); if(v<best){ best=v; last=p; } }
  const cuts=new Array(n-1); let c=last; for(let j=n-2;j>=0;j--){ cuts[j]=c; const r=rows[j].get(c); c=r?r.from:null; }
  const starts=[start].concat(cuts.map(ci=>ci==null?null:segs[ci+1].a)); for(let j=1;j<n;j++) if(starts[j]==null||starts[j]<=starts[j-1]) starts[j]=starts[j-1]+.3;
  return starts.map((a,j)=>({a:+a.toFixed(2),b:+(j<n-1?starts[j+1]:Math.max(end,a+.3)).toFixed(2)})); }

window.SP_RECIT={version:1, themes:THEMES, ready, stage, align, arNum, isRtl:t=>/[\u0590-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(String(t||""))};
})();
