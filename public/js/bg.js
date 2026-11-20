/* Fondo animado: tarjetas flotantes en canvas.
   Código original de bgCards + cierre start() completado. */
(function bgCards(){
  "use strict";
  var MC = document.getElementById("moneyCanvas"); if (!MC) return;
  var mctx = MC.getContext("2d");
  var W=0,H=0,DPR=1,running=true;
  var CW=300, CH=Math.round(300/1.5859), PAD=Math.round(300*0.13);
  var FW=CW+PAD*2, FH=CH+PAD*2, SS=3;
  var LAYERS=[{blur:9,size:138,alpha:.08,sp:.09},{blur:3,size:206,alpha:.14,sp:.17},{blur:0,size:288,alpha:.28,sp:.27}];
  var SPR={}, parts=[];
  function rand(a,b){ return a+Math.random()*(b-a); }
  function rr(g,x,y,w,h,r){
    if (r>Math.min(w,h)/2) r=Math.min(w,h)/2;
    g.beginPath();
    g.moveTo(x+r,y); g.lineTo(x+w-r,y); g.quadraticCurveTo(x+w,y,x+w,y+r);
    g.lineTo(x+w,y+h-r); g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    g.lineTo(x+r,y+h); g.quadraticCurveTo(x,y+h,x,y+h-r);
    g.lineTo(x,y+r); g.quadraticCurveTo(x,y,x+r,y); g.closePath();
  }
  function drawChip(g,x,y,w,h){
    var r=Math.min(w,h)*.22, lg, lw=Math.max(.7,w*.05);
    lg=g.createLinearGradient(x,y,x+w,y+h);
    lg.addColorStop(0,"#fdf0c4"); lg.addColorStop(.26,"#e6cd86"); lg.addColorStop(.58,"#b99341");
    lg.addColorStop(.84,"#8e6d24"); lg.addColorStop(1,"#6d5216");
    rr(g,x,y,w,h,r); g.fillStyle=lg; g.fill();
    g.save(); rr(g,x,y,w,h,r); g.clip();
    g.strokeStyle="rgba(78,58,16,.55)"; g.lineWidth=lw; g.beginPath();
    g.moveTo(x+w*.5,y); g.lineTo(x+w*.5,y+h);
    g.moveTo(x,y+h*.34); g.lineTo(x+w,y+h*.34);
    g.moveTo(x,y+h*.66); g.lineTo(x+w,y+h*.66);
    g.moveTo(x+w*.24,y+h*.34); g.lineTo(x+w*.24,y+h*.66);
    g.moveTo(x+w*.76,y+h*.34); g.lineTo(x+w*.76,y+h*.66); g.stroke();
    lg=g.createLinearGradient(x,y,x,y+h*.45);
    lg.addColorStop(0,"rgba(255,255,255,.34)"); lg.addColorStop(1,"rgba(255,255,255,0)");
    g.fillStyle=lg; g.fillRect(x,y,w,h*.45); g.restore();
    rr(g,x,y,w,h,r); g.strokeStyle="rgba(255,247,216,.42)"; g.lineWidth=Math.max(.6,w*.032); g.stroke();
  }
  function drawWave(g,cx,cy,s){
    g.save(); g.strokeStyle="rgba(228,235,245,.82)"; g.lineCap="round";
    for (var i=0;i<3;i++){ g.lineWidth=s*.10; g.beginPath();
      g.arc(cx-s*.30,cy,s*(.30+i*.26),-Math.PI*.34,Math.PI*.34); g.stroke(); }
    g.restore();
  }
  function drawCard(g,w,h){
    var px=w*.072, r=h*.078, lg, i;
    g.save(); g.shadowColor="rgba(0,0,0,.90)"; g.shadowBlur=h*.22; g.shadowOffsetY=h*.075;
    rr(g,0,0,w,h,r); g.fillStyle="#14171e"; g.fill(); g.restore();
    lg=g.createLinearGradient(0,0,w*.85,h);
    lg.addColorStop(0,"#3b4250"); lg.addColorStop(.26,"#232833"); lg.addColorStop(.60,"#14171e"); lg.addColorStop(1,"#080a0e");
    rr(g,0,0,w,h,r); g.fillStyle=lg; g.fill();
    g.save(); rr(g,0,0,w,h,r); g.clip();
    lg=g.createRadialGradient(w*.14,h*.06,0,w*.14,h*.06,w*.92);
    lg.addColorStop(0,"rgba(226,198,142,.20)"); lg.addColorStop(.42,"rgba(120,146,200,.06)"); lg.addColorStop(1,"rgba(0,0,0,0)");
    g.fillStyle=lg; g.fillRect(0,0,w,h);
    lg=g.createLinearGradient(0,h,w,0);
    lg.addColorStop(0,"rgba(110,160,255,0)"); lg.addColorStop(.34,"rgba(126,170,255,.065)");
    lg.addColorStop(.5,"rgba(186,158,255,.09)"); lg.addColorStop(.66,"rgba(255,186,146,.065)"); lg.addColorStop(1,"rgba(255,214,150,0)");
    g.fillStyle=lg; g.fillRect(0,0,w,h);
    lg=g.createLinearGradient(w*.05,h*1.15,w*.72,-h*.15);
    lg.addColorStop(0,"rgba(255,255,255,0)"); lg.addColorStop(.44,"rgba(255,255,255,.058)");
    lg.addColorStop(.52,"rgba(255,255,255,.020)"); lg.addColorStop(1,"rgba(255,255,255,0)");
    g.fillStyle=lg; g.fillRect(0,0,w,h);
    for (i=0;i<700;i++){ g.fillStyle="rgba(255,255,255,"+(Math.random()*.020).toFixed(3)+")"; g.fillRect(Math.random()*w,Math.random()*h,1,1); }
    drawChip(g,px,h*.255,w*.128,h*.196);
    drawWave(g,w*.245,h*.395,w*.052);
    g.textAlign="left"; g.textBaseline="alphabetic";
    g.font="600 "+(h*.108).toFixed(1)+'px ui-monospace, Menlo, Consolas, monospace';
    var num="4532 1234 5678 9010", ny=h*.635;
    g.fillStyle="rgba(0,0,0,.72)"; g.fillText(num,px,ny+h*.014);
    g.fillStyle="rgba(255,255,255,.15)"; g.fillText(num,px,ny-h*.010);
    g.fillStyle="#e7edf7"; g.fillText(num,px,ny);
    g.font="600 "+(h*.062).toFixed(1)+'px Inter, Helvetica, Arial, sans-serif';
    g.fillStyle="rgba(0,0,0,.60)"; g.fillText("A. CARDHOLDER",px,h*.755);
    g.fillStyle="#aab4c2"; g.fillText("A. CARDHOLDER",px,h*.745);
    g.font="500 "+(h*.046).toFixed(1)+'px Inter, Helvetica, Arial, sans-serif';
    g.fillStyle="#6d7787"; g.fillText("VALID THRU",px,h*.845);
    g.font="700 "+(h*.072).toFixed(1)+'px Inter, Helvetica, Arial, sans-serif';
    g.fillStyle="#cbd4e0"; g.fillText("09/28",px,h*.935);
    g.textAlign="right";
    g.font="900 italic "+(h*.205).toFixed(1)+'px Inter, Helvetica, Arial, sans-serif';
    g.fillStyle="rgba(0,0,0,.55)"; g.fillText("VISA",w-px,h*.859);
    g.fillStyle="#f6f8fc"; g.fillText("VISA",w-px,h*.845);
    g.restore();
    rr(g,.5,.5,w-1,h-1,r-.5); g.strokeStyle="rgba(255,255,255,.16)"; g.lineWidth=1; g.stroke();
    lg=g.createLinearGradient(0,0,w*.55,h);
    lg.addColorStop(0,"rgba(255,255,255,.28)"); lg.addColorStop(.30,"rgba(255,255,255,.03)"); lg.addColorStop(1,"rgba(0,0,0,0)");
    rr(g,1.2,1.2,w-2.4,h-2.4,r-1.2); g.strokeStyle=lg; g.lineWidth=2; g.stroke();
  }
  function makeSprite(L){
    var lay=LAYERS[L];
    var c=document.createElement("canvas");
    c.width=Math.round(FW*SS); c.height=Math.round(FH*SS);
    var g=c.getContext("2d"); g.scale(SS,SS); g.translate(PAD,PAD);
    drawCard(g,CW,CH);
    if (lay.blur>0){
      var toScreen=lay.size/(CW*SS);
      var b=document.createElement("canvas"); b.width=c.width; b.height=c.height;
      var bg=b.getContext("2d");
      try{ bg.filter="blur("+(lay.blur/toScreen).toFixed(1)+"px)"; }catch(e){}
      bg.drawImage(c,0,0); return {img:b};
    }
    return {img:c};
  }
  function cardZoneL(){
    var body=document.getElementById("storeBody"), st=document.getElementById("store");
    var open = st && (st.style.display!=="none" && !st.classList.contains("off"));
    if (!open) return 0;
    if (window.innerWidth<=900) return 0;
    if (body && body.style.display==="none") return 0;
    return 336;
  }
  function newPart(L,initial){
    var lay=LAYERS[L], s=lay.size*rand(.78,1.22), ch=s/1.5859;
    var zl=cardZoneL(), xa=zl+64, xb=Math.max(xa+60,W-64);
    return {
      L:L,s:s,x:rand(xa,xb),
      y: initial ? rand(-ch*1.2,H+ch) : rand(H+ch*.7,H+ch*2.4),
      vy: rand(.25,.70)*(.55+lay.sp),
      amp: rand(14,54), sph: rand(0,Math.PI*2), sf: rand(.00012,.00042),
      rot: rand(-.13,.13), rsph: rand(0,Math.PI*2), rsf: rand(.00014,.00042),
      sq: rand(.05,.13), sqs: rand(.00016,.00042), sqp: rand(0,Math.PI*2),
      a: lay.alpha*rand(.78,1), sh: rand(0,1), shv: rand(.00004,.00011)
    };
  }
  function resizeMoney(){
    DPR=Math.min(window.devicePixelRatio||1,2);
    W=window.innerWidth; H=window.innerHeight;
    MC.width=Math.round(W*DPR); MC.height=Math.round(H*DPR);
    MC.style.width=W+"px"; MC.style.height=H+"px";
    mctx.setTransform(DPR,0,0,DPR,0,0);
    var n=Math.min(14,Math.max(6,Math.round((W*H)/150000)));
    parts=[];
    for (var i=0;i<n;i++){ var q=Math.random(); parts.push(newPart(q<.45?0:(q<.80?1:2),true)); }
  }
  var lastT=performance.now(), TT=0;
  function loop(t){
    var dt=Math.min(40,t-lastT); lastT=t;
    if (!running || !SPR[0]){ requestAnimationFrame(loop); return; }
    TT+=dt; mctx.clearRect(0,0,W,H);
    var f=dt/16,i,p,cx,rot,sx,k,dw,dh,chh,fade,prog,gx,gw,lg;
    for (i=0;i<parts.length;i++){
      p=parts[i]; chh=p.s/1.5859; p.y-=p.vy*f;
      if (p.y < -chh*1.8-150){ parts[i]=newPart(p.L,false); continue; }
      cx=p.x+Math.sin(TT*p.sf+p.sph)*p.amp;
      rot=p.rot+Math.sin(TT*p.rsf+p.rsph)*.055;
      sx=1-p.sq*(.5+.5*Math.sin(TT*p.sqs+p.sqp));
      fade=Math.min(1,Math.max(0,(H+chh-p.y)/130))*Math.min(1,Math.max(0,(p.y+chh)/150));
      if (fade<=.004) continue;
      k=p.s/CW; dw=FW*k; dh=FH*k;
      mctx.save();
      mctx.translate(cx,p.y); mctx.rotate(rot); mctx.scale(sx,1);
      mctx.globalAlpha=p.a*fade;
      mctx.drawImage(SPR[p.L].img,-dw/2,-dh/2,dw,dh);
      if (p.L===2 && fade>.15){
        mctx.save();
        rr(mctx,-p.s/2,-chh/2,p.s,chh,chh*.078); mctx.clip();
        mctx.rotate(-.46);
        prog=(p.sh+TT*p.shv)%1; gx=-p.s*1.3+prog*p.s*2.6; gw=p.s*.34;
        lg=mctx.createLinearGradient(gx-gw,0,gx+gw,0);
        lg.addColorStop(0,"rgba(255,255,255,0)");
        lg.addColorStop(.5,"rgba(255,255,255,.30)");
        lg.addColorStop(1,"rgba(255,255,255,0)");
        mctx.globalCompositeOperation="lighter";
        mctx.globalAlpha=p.a*fade*.9; mctx.fillStyle=lg;
        mctx.fillRect(-p.s*2,-p.s*2,p.s*4,p.s*4);
        mctx.restore();
      }
      mctx.restore();
    }
    mctx.globalAlpha=1; mctx.globalCompositeOperation="source-over";
    requestAnimationFrame(loop);
  }
  function buildAll(){ SPR[0]=makeSprite(0); SPR[1]=makeSprite(1); SPR[2]=makeSprite(2); }

  function start(){
    buildAll();
    resizeMoney();
    window.addEventListener("resize", resizeMoney);
    requestAnimationFrame(loop);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start).catch(start);
  } else {
    start();
  }
})();