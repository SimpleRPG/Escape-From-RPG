(function(){
  "use strict";

  const cache=new Map();

  function hash(v){
    let h=2166136261;
    for(const c of String(v||"pet")){
      h^=c.charCodeAt(0);
      h=Math.imul(h,16777619);
    }
    return (h>>>0)/4294967295;
  }

  function rgb(hex){
    const m=String(hex||"").match(/^#([0-9a-f]{6})$/i);
    if(!m)return [168,111,77];
    const n=parseInt(m[1],16);
    return[(n>>16)&255,(n>>8)&255,n&255];
  }

  function rgba(hex,a){
    const [r,g,b]=rgb(hex);
    return `rgba(${r},${g},${b},${a})`;
  }

  function shade(hex,f){
    const [r,g,b]=rgb(hex);
    return `rgb(${Math.round(r*f)},${Math.round(g*f)},${Math.round(b*f)})`;
  }

  function profile(body){
    if([
      "bird","owl","crow","eagle","kite","bat","cormorant"
    ].includes(body))return "bird";

    if(body==="snake")return "snake";
    if(body==="spider")return "spider";

    if([
      "turtle","crocodile","penguin"
    ].includes(body))return "special";

    if([
      "horse","ox","alpaca","deer","camel"
    ].includes(body))return "large";

    return "quad";
  }

  function silhouette(ctx,r,body,fill,stroke,light){
    const p=profile(body);

    ctx.fillStyle=fill;
    ctx.strokeStyle=stroke;
    ctx.lineWidth=Math.max(1,r*.065);
    ctx.lineJoin="round";
    ctx.lineCap="round";

    if(p==="snake"){
      ctx.beginPath();
      ctx.moveTo(-.9*r,.2*r);
      ctx.bezierCurveTo(
        -.55*r,-.62*r,
        .05*r,-.55*r,
        .28*r,-.08*r
      );
      ctx.bezierCurveTo(
        .5*r,.38*r,
        .8*r,.4*r,
        1.02*r,-.05*r
      );
      ctx.bezierCurveTo(
        .72*r,-.55*r,
        .35*r,-.3*r,
        .08*r,.02*r
      );
      ctx.bezierCurveTo(
        -.22*r,.35*r,
        -.55*r,.55*r,
        -.9*r,.2*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(p==="spider"){
      ctx.beginPath();
      ctx.ellipse(
        0,.05*r,
        .48*r,.42*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        0,-.42*r,
        .33*r,.28*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(p==="bird"){
      ctx.beginPath();
      ctx.ellipse(
        0,.02*r,
        .62*r,.58*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(.42*r,-.08*r);
      ctx.lineTo(1.12*r,-.2*r);
      ctx.lineTo(.44*r,.18*r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(body==="penguin"){
      ctx.beginPath();
      ctx.ellipse(
        0,.05*r,
        .62*r,.86*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle=light;
      ctx.beginPath();
      ctx.ellipse(
        0,.2*r,
        .39*r,.58*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      return;
    }

    if(body==="turtle"){
      ctx.beginPath();
      ctx.ellipse(
        -.05*r,0,
        .84*r,.58*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle=light;
      ctx.beginPath();
      ctx.arc(
        .7*r,.04*r,
        .27*r,
        0,Math.PI*2
      );
      ctx.fill();
      return;
    }

    if(body==="crocodile"){
      ctx.beginPath();
      ctx.ellipse(
        -.05*r,.1*r,
        .88*r,.43*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(.3*r,-.24*r);
      ctx.lineTo(1.18*r,-.1*r);
      ctx.lineTo(.35*r,.24*r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(p==="large"){
      ctx.beginPath();
      ctx.ellipse(
        -.08*r,.12*r,
        .78*r,.48*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(.28*r,-.02*r);
      ctx.quadraticCurveTo(
        .5*r,-.62*r,
        .86*r,-.66*r
      );
      ctx.lineTo(1.02*r,-.42*r);
      ctx.lineTo(.7*r,.12*r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(body==="camel"){
      ctx.beginPath();
      ctx.ellipse(
        0,.12*r,
        .82*r,.48*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle=shade(
        String(fill).startsWith("#")
          ? fill
          : "#a86f4d",
        .86
      );

      ctx.beginPath();
      ctx.arc(
        -.25*r,-.33*r,
        .25*r,
        Math.PI,Math.PI*2
      );
      ctx.arc(
        .2*r,-.32*r,
        .24*r,
        Math.PI,Math.PI*2
      );
      ctx.fill();
      return;
    }

    if(body==="sheep"){
      for(const q of [
        [-.38,0,.38],
        [0,-.12,.48],
        [.38,0,.38],
        [0,.24,.43]
      ]){
        ctx.beginPath();
        ctx.arc(
          q[0]*r,
          q[1]*r,
          q[2]*r,
          0,Math.PI*2
        );
        ctx.fill();
        ctx.stroke();
      }
      return;
    }

    if(body==="weasel"||body==="otter"){
      ctx.beginPath();
      ctx.ellipse(
        0,.08*r,
        .92*r,.35*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(body==="raccoon"||body==="badger"){
      ctx.beginPath();
      ctx.ellipse(
        -.04*r,.08*r,
        .76*r,.5*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();
      return;
    }

    ctx.beginPath();
    ctx.ellipse(
      0,.06*r,
      .76*r,.57*r,
      0,0,Math.PI*2
    );
    ctx.fill();
    ctx.stroke();
  }

  function ears(ctx,r,part,fill,stroke,tilt){
    if(!part)return;

    ctx.save();
    ctx.rotate(tilt);
    ctx.fillStyle=fill;
    ctx.strokeStyle=stroke;
    ctx.lineWidth=Math.max(1,r*.055);

    for(const s of [-1,1]){
      if(part==="point"||part==="tuft"){
        ctx.beginPath();
        ctx.moveTo(s*.28*r,-.36*r);
        ctx.lineTo(
          s*.52*r,
          -(part==="tuft"?.96:1)*r
        );
        ctx.lineTo(s*.72*r,-.43*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }else if(part==="long"){
        ctx.beginPath();
        ctx.ellipse(
          s*.5*r,
          -.5*r,
          .18*r,.5*r,
          s*.12,
          0,Math.PI*2
        );
        ctx.fill();
        ctx.stroke();
      }else if(part==="drop"){
        ctx.beginPath();
        ctx.ellipse(
          s*.55*r,
          -.45*r,
          .24*r,.38*r,
          s*.35,
          0,Math.PI*2
        );
        ctx.fill();
        ctx.stroke();
      }else if(part==="round"){
        ctx.beginPath();
        ctx.arc(
          s*.5*r,
          -.5*r,
          .26*r,
          0,Math.PI*2
        );
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function legs(ctx,r,body,stroke,phase){
    if([
      "bird","owl","crow","eagle","kite",
      "bat","cormorant","snake","spider",
      "turtle","crocodile"
    ].includes(body)){
      return;
    }

    const large=[
      "horse","ox","alpaca","deer","camel"
    ].includes(body);

    ctx.strokeStyle=stroke;
    ctx.fillStyle=stroke;
    ctx.lineWidth=Math.max(
      1.2,
      r*(large?.095:.075)
    );

    for(const [i,x] of [
      -.5,-.18,.18,.5
    ].entries()){
      const lift=
        Math.sin(phase+i*1.7)*
        r*.025;

      ctx.beginPath();
      ctx.moveTo(x*r,.35*r);
      ctx.lineTo(
        (x+(i%2?.025:-.02))*r,
        (large?.78:.68)*r+lift
      );
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        (x+.015)*r,
        (large?.79:.69)*r+lift,
        r*.09,
        r*.035,
        0,0,Math.PI*2
      );
      ctx.fill();
    }
  }

  function tail(ctx,r,kind,stroke,phase){
    if(!kind)return;

    ctx.save();
    ctx.strokeStyle=stroke;
    ctx.lineCap="round";
    ctx.lineWidth=Math.max(1.5,r*.11);
    ctx.rotate(Math.sin(phase)*.08);

    if(kind==="bush"){
      ctx.beginPath();
      ctx.arc(
        .62*r,-.02*r,
        .72*r,
        -1.55,.65
      );
      ctx.stroke();

      ctx.lineWidth=Math.max(2,r*.23);
      ctx.stroke();
    }else if(
      kind==="curve"||
      kind==="ring"
    ){
      ctx.beginPath();
      ctx.arc(
        .68*r,0,
        .55*r,
        -1.45,1.8
      );
      ctx.stroke();
    }else if(kind==="long"){
      ctx.beginPath();
      ctx.arc(
        -.35*r,0,
        .9*r,
        .55,2.35
      );
      ctx.stroke();
    }else if(kind==="flow"){
      ctx.beginPath();
      ctx.moveTo(.58*r,0);
      ctx.quadraticCurveTo(
        1.15*r,-.5*r,
        .82*r,-.88*r
      );
      ctx.stroke();
    }else if(kind==="fork"){
      ctx.beginPath();
      ctx.moveTo(-.52*r,0);
      ctx.lineTo(-1.02*r,-.42*r);
      ctx.moveTo(-.52*r,0);
      ctx.lineTo(-1.02*r,.38*r);
      ctx.stroke();
    }else if(kind==="fan"){
      ctx.fillStyle=stroke;
      ctx.beginPath();
      ctx.moveTo(-.5*r,0);
      ctx.lineTo(-1.08*r,-.52*r);
      ctx.lineTo(-.82*r,0);
      ctx.lineTo(-1.08*r,.52*r);
      ctx.closePath();
      ctx.fill();
    }else if(kind==="coil"){
      ctx.beginPath();
      ctx.arc(
        -.18*r,.04*r,
        .7*r,
        .5,5.35
      );
      ctx.stroke();
    }else{
      ctx.fillStyle=stroke;
      ctx.beginPath();
      ctx.arc(
        -.7*r,.05*r,
        .2*r,
        0,Math.PI*2
      );
      ctx.fill();
    }

    ctx.restore();
  }

  function marks(ctx,r,mark,fill){
    if(
      mark==="stripe"||
      mark==="mask"
    ){
      ctx.strokeStyle="rgba(25,25,25,.46)";
      ctx.lineWidth=Math.max(1,r*.085);

      for(let i=-1;i<=1;i++){
        ctx.beginPath();
        ctx.moveTo(
          (.02+i*.14)*r,
          -.34*r
        );
        ctx.lineTo(
          (.13+i*.14)*r,
          .08*r
        );
        ctx.stroke();
      }
    }else if(mark==="spot"){
      ctx.fillStyle="rgba(35,35,35,.38)";

      for(let i=0;i<5;i++){
        ctx.beginPath();
        ctx.arc(
          (-.28+(i%3)*.28)*r,
          (-.06+Math.floor(i/3)*.26)*r,
          r*(.055+(i%2)*.018),
          0,Math.PI*2
        );
        ctx.fill();
      }
    }else if([
      "chest","belly","wool"
    ].includes(mark)){
      ctx.fillStyle="rgba(245,240,225,.82)";
      ctx.beginPath();
      ctx.ellipse(
        .03*r,.2*r,
        .3*r,.32*r,
        0,0,Math.PI*2
      );
      ctx.fill();
    }else if(mark==="shell"){
      ctx.strokeStyle="rgba(30,60,30,.6)";
      ctx.lineWidth=Math.max(1,r*.065);

      ctx.beginPath();
      ctx.moveTo(-.45*r,0);
      ctx.lineTo(.4*r,0);
      ctx.moveTo(-.05*r,-.48*r);
      ctx.lineTo(-.05*r,.48*r);
      ctx.stroke();
    }else if(mark==="antler"){
      ctx.strokeStyle="#e8d8b6";
      ctx.lineWidth=Math.max(1,r*.075);

      for(const s of [-1,1]){
        ctx.beginPath();
        ctx.moveTo(s*.25*r,-.35*r);
        ctx.lineTo(s*.4*r,-.9*r);
        ctx.lineTo(s*.6*r,-.72*r);
        ctx.moveTo(s*.4*r,-.7*r);
        ctx.lineTo(s*.18*r,-.82*r);
        ctx.stroke();
      }
    }else if(mark==="horn"){
      ctx.strokeStyle="#ead5a6";
      ctx.lineWidth=Math.max(1,r*.085);

      for(const s of [-1,1]){
        ctx.beginPath();
        ctx.moveTo(s*.25*r,-.36*r);
        ctx.quadraticCurveTo(
          s*.5*r,-.78*r,
          s*.32*r,-.98*r
        );
        ctx.stroke();
      }
    }else if(mark==="hump"){
      ctx.fillStyle=shade(fill,.82);
      ctx.beginPath();
      ctx.arc(
        -.22*r,-.35*r,
        .28*r,
        Math.PI,Math.PI*2
      );
      ctx.arc(
        .2*r,-.34*r,
        .27*r,
        Math.PI,Math.PI*2
      );
      ctx.fill();
    }else if(mark==="fluff"){
      ctx.fillStyle="rgba(247,242,226,.78)";
      ctx.beginPath();
      ctx.arc(
        -.18*r,-.48*r,
        .27*r,
        0,Math.PI*2
      );
      ctx.arc(
        .12*r,-.45*r,
        .25*r,
        0,Math.PI*2
      );
      ctx.fill();
    }else if(mark==="pack"){
      ctx.strokeStyle="rgba(75,50,35,.65)";
      ctx.lineWidth=Math.max(1,r*.075);
      ctx.strokeRect(
        -.55*r,-.12*r,
        .7*r,.4*r
      );
    }else if(mark==="wing"){
      ctx.strokeStyle="rgba(255,255,255,.56)";
      ctx.lineWidth=Math.max(1,r*.065);
      ctx.beginPath();
      ctx.arc(
        -.28*r,0,
        .44*r,
        -1.4,1.25
      );
      ctx.stroke();
    }
  }

  function special(ctx,r,body,fill,light,phase){
    ctx.save();

    if(body==="bird"||body==="bat"){
      ctx.rotate(Math.sin(phase)*.05);
      ctx.fillStyle=shade(fill,.86);

      ctx.beginPath();
      ctx.moveTo(-.12*r,-.1*r);
      ctx.quadraticCurveTo(
        -1.1*r,-.9*r,
        -.96*r,.18*r
      );
      ctx.quadraticCurveTo(
        -.5*r,.06*r,
        -.12*r,.2*r
      );
      ctx.closePath();
      ctx.fill();
    }else if(body==="owl"){
      ctx.fillStyle=light;

      for(const s of [-1,1]){
        ctx.beginPath();
        ctx.arc(
          s*.25*r,
          -.1*r,
          .27*r,
          0,Math.PI*2
        );
        ctx.fill();
      }
    }else if(body==="raccoon"){
      ctx.strokeStyle="rgba(35,35,35,.5)";
      ctx.lineWidth=Math.max(1,r*.085);

      for(let i=0;i<3;i++){
        ctx.beginPath();
        ctx.moveTo(
          (-.82+i*.12)*r,
          -.15*r
        );
        ctx.lineTo(
          (-.5+i*.12)*r,
          .28*r
        );
        ctx.stroke();
      }
    }else if(body==="spider"){
      ctx.strokeStyle=shade(fill,.65);
      ctx.lineWidth=Math.max(1,r*.065);

      for(let i=0;i<4;i++){
        const y=(-.42+i*.28)*r;

        ctx.beginPath();
        ctx.moveTo(-.22*r,y);
        ctx.quadraticCurveTo(
          -.82*r,
          y-.18*r,
          -1.02*r,
          y+.25*r
        );
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(.22*r,y);
        ctx.quadraticCurveTo(
          .82*r,
          y-.18*r,
          1.02*r,
          y+.25*r
        );
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function draw(
    ctx,
    animal,
    x,
    y,
    r,
    g,
    base,
    downed
  ){
    const body=
      String(
        g?.body||
        animal?.type||
        "hound"
      );

    const variant=
      hash(
        animal?.id||
        animal?.name||
        body
      );

    const t=Date.now()*.003;
    const phase=variant*Math.PI*2;

    const moving=
      !downed &&
      animal?.command!=="wait";

    const bob=
      moving
        ? Math.sin(t+phase)*
          Math.max(.45,r*.055)
        : 0;

    const sway=
      moving
        ? Math.sin(t*.72+phase)*.026
        : 0;

    const scaleX=
      1+(variant-.5)*.10;

    const scaleY=
      1+(variant-.5)*.08;

    const stroke=
      downed
        ? "#999"
        : rgba("#ffffff",.82);

    const fill=
      downed
        ? "#666"
        : base;

    const dark=
      downed
        ? "#4e4e4e"
        : shade(base,.72);

    const light=
      downed
        ? "#777"
        : "rgba(248,242,226,.84)";

    const lod=
      r<7
        ? 0
        : r<13
          ? 1
          : 2;

    const cacheKey=[
      body,
      Math.round(r),
      downed?1:0,
      Math.round(variant*8)
    ].join(":");

    ctx.save();

    ctx.fillStyle=
      downed
        ? "rgba(0,0,0,.16)"
        : "rgba(0,0,0,.25)";

    ctx.beginPath();
    ctx.ellipse(
      x,
      y+r*.62,
      r*.82,
      Math.max(1.5,r*.17),
      0,0,Math.PI*2
    );
    ctx.fill();

    ctx.translate(x,y+bob);
    ctx.rotate(sway);
    ctx.scale(scaleX,scaleY);

    if(lod===2){
      const grad=
        ctx.createLinearGradient(
          -r,-r,r,r
        );

      grad.addColorStop(0,light);
      grad.addColorStop(.25,fill);
      grad.addColorStop(1,dark);

      silhouette(
        ctx,
        r,
        body,
        grad,
        stroke,
        light
      );
    }else{
      silhouette(
        ctx,
        r,
        body,
        fill,
        stroke,
        light
      );
    }

    legs(
      ctx,
      r,
      body,
      stroke,
      t+phase
    );

    ears(
      ctx,
      r,
      g?.ears,
      fill,
      stroke,
      moving
        ? Math.sin(t*.8+phase)*.045
        : 0
    );

    tail(
      ctx,
      r,
      g?.tail,
      stroke,
      t+phase
    );

    special(
      ctx,
      r,
      body,
      fill,
      light,
      t+phase
    );

    marks(
      ctx,
      r,
      g?.mark,
      fill
    );

    if(
      body==="bird"||
      body==="penguin"
    ){
      ctx.fillStyle=
        downed
          ? "#888"
          : "#d99a3e";

      ctx.beginPath();
      ctx.moveTo(.48*r,-.2*r);
      ctx.lineTo(.88*r,-.1*r);
      ctx.lineTo(.48*r,-.01*r);
      ctx.closePath();
      ctx.fill();
    }

    const faceX=
      (
        [
          "bird","owl","penguin","raccoon",
          "fox","deer","rabbit","boar","goat",
          "monkey","squirrel","badger",
          "crocodile","camel","horse","ox",
          "alpaca"
        ].includes(body)
          ? r*.42
          : r*.3
      )+
      (variant-.5)*r*.08;

    ctx.fillStyle="#fff";
    ctx.beginPath();
    ctx.arc(
      faceX,
      -r*.2,
      Math.max(1.3,r*.105),
      0,Math.PI*2
    );
    ctx.fill();

    ctx.fillStyle="#171717";
    ctx.beginPath();
    ctx.arc(
      faceX+r*.025,
      -r*.2,
      Math.max(.7,r*.052),
      0,Math.PI*2
    );
    ctx.fill();

    if([
      "dog","fox","weasel","cat","lynx",
      "raccoon","boar","goat","monkey",
      "deer","rabbit","sheep","capybara",
      "otter","badger","squirrel"
    ].includes(body)){
      ctx.fillStyle=
        downed
          ? "#777"
          : "#292929";

      ctx.beginPath();
      ctx.arc(
        faceX+r*.16,
        -r*.03,
        Math.max(.9,r*.065),
        0,Math.PI*2
      );
      ctx.fill();
    }

    if(lod>=1&&!downed){
      ctx.strokeStyle=
        "rgba(255,255,255,.3)";
      ctx.lineWidth=
        Math.max(.8,r*.035);

      ctx.beginPath();
      ctx.arc(
        -r*.1,
        -r*.12,
        r*.5,
        Math.PI*1.08,
        Math.PI*1.7
      );
      ctx.stroke();
    }

    if(lod===2&&!downed){
      ctx.fillStyle=
        "rgba(255,255,255,.13)";

      ctx.beginPath();
      ctx.arc(
        -r*.25,
        -r*.28,
        r*.12,
        0,Math.PI*2
      );
      ctx.fill();
    }

    if(
      animal?.command==="attack"&&
      moving&&
      !downed
    ){
      ctx.strokeStyle=
        "rgba(255,220,130,.45)";
      ctx.lineWidth=
        Math.max(1,r*.045);

      ctx.beginPath();
      ctx.arc(
        r*.15,
        0,
        r*.8,
        -.55,.55
      );
      ctx.stroke();
    }

    ctx.restore();

    if(!cache.has(cacheKey)){
      cache.set(cacheKey,true);

      if(cache.size>128){
        cache.delete(
          cache.keys().next().value
        );
      }
    }
  }

  window.EFRPetRenderer={
    draw
  };
})();
