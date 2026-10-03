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

  function silhouette(ctx,r,body,graphic,fill,stroke,light){
    const key=String(graphic?.key||"");
    const p=profile(body);

    ctx.fillStyle=fill;
    ctx.strokeStyle=stroke;
    ctx.lineWidth=Math.max(1,r*.065);
    ctx.lineJoin="round";
    ctx.lineCap="round";

    if(body==="owl"){
      ctx.beginPath();
      ctx.ellipse(
        0,.04*r,
        .58*r,.68*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(key==="hound"||key==="dog"||key==="golden"||key==="wolf"){
      const wolf=key==="wolf";
      const golden=key==="golden";
      const hound=key==="hound";

      ctx.beginPath();
      ctx.ellipse(
        -.16*r,
        .1*r,
        (golden?.82:hound?.78:wolf?.74:.72)*r,
        (golden?.5:hound?.45:wolf?.42:.43)*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        .56*r,
        -.18*r,
        (wolf?.34:golden?.39:.36)*r,
        (wolf?.30:golden?.34:.31)*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(
        .76*r,
        wolf?-.22*r:-.12*r
      );
      ctx.lineTo(
        (wolf?1.08:1.02)*r,
        wolf?-.05*r:.02*r
      );
      ctx.lineTo(
        .72*r,
        .08*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(key==="tiger"||key==="leopard"||key==="cat"){
      const wild=key!=="cat";

      ctx.beginPath();
      ctx.ellipse(
        -.12*r,
        .1*r,
        (wild?.72:.66)*r,
        (wild?.43:.4)*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        .5*r,
        -.18*r,
        .32*r,
        .29*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(
      key==="bird"||
      key==="eagle"||
      key==="crow"||
      key==="kite"||
      key==="cormorant"
    ){
      const longBeak=
        key==="eagle"||
        key==="cormorant";

      ctx.beginPath();
      ctx.ellipse(
        -.04*r,
        .03*r,
        (key==="crow"?.57:.62)*r,
        (key==="cormorant"?.64:.58)*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(
        .42*r,
        -.12*r
      );
      ctx.lineTo(
        (longBeak?1.18:.98)*r,
        -.18*r
      );
      ctx.lineTo(
        .44*r,
        .08*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if(key==="eagle"||key==="kite"){
        ctx.beginPath();
        ctx.moveTo(-.22*r,-.05*r);
        ctx.quadraticCurveTo(
          -.72*r,
          -.55*r,
          -1.02*r,
          -.08*r
        );
        ctx.lineTo(-.42*r,.16*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      return;
    }

    if(key==="raccoonDog"){
      ctx.beginPath();
      ctx.ellipse(
        -.12*r,.1*r,
        .7*r,.44*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        .52*r,-.17*r,
        .34*r,.3*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(.76*r,-.14*r);
      ctx.lineTo(1.02*r,-.04*r);
      ctx.lineTo(.76*r,.06*r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(key==="pack"){
      ctx.beginPath();
      ctx.ellipse(
        -.2*r,.14*r,
        .78*r,.5*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(.2*r,.04*r);
      ctx.quadraticCurveTo(
        .38*r,-.52*r,
        .7*r,-.6*r
      );
      ctx.lineTo(.94*r,-.38*r);
      ctx.lineTo(.68*r,.1*r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(body==="bat"){
      ctx.beginPath();
      ctx.ellipse(
        0,.08*r,
        .42*r,.32*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();
      return;
    }

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

    if(body==="pack"){
      ctx.beginPath();
      ctx.ellipse(
        -.18*r,.12*r,
        .74*r,.48*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(.2*r,.02*r);
      ctx.quadraticCurveTo(
        .38*r,-.52*r,
        .7*r,-.58*r
      );
      ctx.lineTo(.9*r,-.38*r);
      ctx.lineTo(.66*r,.1*r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(body==="dog"){
      ctx.beginPath();
      ctx.ellipse(-.14*r,.1*r,.76*r,.46*r,0,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(.58*r,-.16*r,.36*r,.31*r,0,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(.86*r,-.11*r,.28*r,.18*r,0,0,Math.PI*2);
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(body==="fox"||body==="cat"||body==="lynx"){
      const small=body!=="fox";

      ctx.beginPath();
      ctx.ellipse(
        -.14*r,.1*r,
        (small?.66:.74)*r,
        (small?.4:.44)*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        .58*r,-.16*r,
        (small?.3:.36)*r,
        (small?.28:.3)*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      if(body==="fox"){
        ctx.beginPath();
        ctx.moveTo(.68*r,-.2*r);
        ctx.lineTo(1.04*r,-.12*r);
        ctx.lineTo(.68*r,.02*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      return;
    }

    if(body==="bear"){
      ctx.beginPath();
      ctx.ellipse(
        -.12*r,.12*r,
        .76*r,.56*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        .46*r,-.18*r,
        .42*r,.4*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(body==="boar"||body==="capybara"){
      ctx.beginPath();
      ctx.ellipse(
        -.12*r,.14*r,
        .78*r,.48*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        .5*r,-.02*r,
        .4*r,.31*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(body==="goat"){
      ctx.beginPath();
      ctx.ellipse(
        -.16*r,.12*r,
        .7*r,.44*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(.14*r,.02*r);
      ctx.quadraticCurveTo(
        .34*r,-.48*r,
        .62*r,-.48*r
      );
      ctx.lineTo(.8*r,-.3*r);
      ctx.lineTo(.58*r,.08*r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(body==="monkey"){
      ctx.beginPath();
      ctx.ellipse(
        -.14*r,.1*r,
        .7*r,.44*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        .54*r,-.18*r,
        .34*r,.3*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        .8*r,-.12*r,
        .23*r,.18*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();
      return;
    }

    if(body==="rabbit"||body==="squirrel"){
      ctx.beginPath();
      ctx.ellipse(
        -.14*r,.12*r,
        .64*r,.4*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        .5*r,-.18*r,
        .3*r,.28*r,
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

  function legs(ctx,r,body,stroke,phase,key){
    if([
      "bird","owl","crow","eagle","kite",
      "bat","cormorant","snake","spider",
      "turtle","crocodile"
    ].includes(body)){
      return;
    }

    const k=String(key||body||"");
    const lift=Math.sin(phase)*r*.018;

    ctx.fillStyle=stroke;
    ctx.strokeStyle="rgba(35,28,24,.38)";
    ctx.lineWidth=Math.max(.7,r*.028);
    ctx.lineJoin="round";

    const leg=(x,top,bottom,width)=>{
      ctx.beginPath();
      ctx.moveTo(
        (x-width*.45)*r,
        top*r
      );
      ctx.lineTo(
        (x-width*.62)*r,
        (bottom-.08)*r
      );
      ctx.quadraticCurveTo(
        x*r,
        (bottom+.02)*r,
        (x+width*.62)*r,
        (bottom-.08)*r
      );
      ctx.lineTo(
        (x+width*.45)*r,
        top*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    const pairs=[
      [-.5,.34,.72],
      [-.18,.35,.69],
      [.18,.35,.69],
      [.5,.34,.72]
    ];

    if([
      "tiger","leopard","cat","lynx"
    ].includes(k)){
      for(const [i,pair] of pairs.entries()){
        const x=
          pair[0]+
          (i%2?.025:-.02);

        leg(
          x,
          pair[1],
          pair[2]+
            lift*(i%2?1:-1),
          .13
        );

        ctx.fillStyle="rgba(248,242,226,.55)";
        ctx.beginPath();
        ctx.ellipse(
          (x+.01)*r,
          (pair[2]+.015)*r,
          r*.07,
          r*.028,
          0,0,Math.PI*2
        );
        ctx.fill();
        ctx.fillStyle=stroke;
      }
      return;
    }

    const long=[
      "horse","deer","camel","alpaca"
    ].includes(k);

    const stocky=[
      "bear","ox","boar","capybara","sheep"
    ].includes(k);

    for(let i=0;i<4;i++){
      const x=pairs[i][0];

      leg(
        x+(i%2?.015:-.015),
        .30,
        (
          long
            ? .84
            : stocky
              ? .72
              : .69
        )+
        lift*(i%2?1:-1),
        long
          ? .11
          : stocky
            ? .16
            : .13
      );
    }
  }

  function tail(ctx,r,kind,stroke,phase,key){
    if(!kind||kind==="none")return;

    const k=String(key||"");

    ctx.save();
    ctx.lineCap="round";
    ctx.lineJoin="round";
    ctx.strokeStyle=stroke;
    ctx.fillStyle=stroke;
    ctx.lineWidth=Math.max(1.2,r*.075);

    const thick=(width)=>{
      ctx.lineWidth=Math.max(2,r*width);
    };

    if(["fox","squirrel"].includes(k)){
      ctx.beginPath();
      ctx.moveTo(-.38*r,.08*r);
      ctx.quadraticCurveTo(
        -.9*r,-.35*r,
        -.62*r,-.78*r
      );
      ctx.quadraticCurveTo(
        -.1*r,-.65*r,
        .02*r,-.08*r
      );
      ctx.quadraticCurveTo(
        -.08*r,.08*r,
        -.38*r,.08*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

    }else if([
      "tiger","leopard","cat","lynx",
      "hound","dog","golden","wolf","monkey"
    ].includes(k)){
      ctx.beginPath();
      ctx.moveTo(-.38*r,.08*r);
      ctx.quadraticCurveTo(
        .15*r,-.38*r,
        .76*r,-.05*r
      );
      ctx.quadraticCurveTo(
        .95*r,.12*r,
        .72*r,.28*r
      );
      ctx.quadraticCurveTo(
        .15*r,.02*r,
        -.38*r,.08*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

    }else if(k==="horse"){
      thick(.12);
      ctx.beginPath();
      ctx.moveTo(.45*r,.05*r);
      ctx.quadraticCurveTo(
        1.02*r,-.2*r,
        .78*r,-.76*r
      );
      ctx.stroke();

      thick(.055);
      ctx.beginPath();
      ctx.moveTo(.76*r,-.7*r);
      ctx.lineTo(.96*r,-.82*r);
      ctx.stroke();

    }else if([
      "otter","weasel","crocodile"
    ].includes(k)){
      thick(.09);
      ctx.beginPath();
      ctx.moveTo(-.35*r,.12*r);
      ctx.quadraticCurveTo(
        -.95*r,.45*r,
        -.92*r,-.3*r
      );
      ctx.stroke();

    }else if([
      "raccoon","raccoonDog"
    ].includes(k)){
      ctx.beginPath();
      ctx.moveTo(-.38*r,.08*r);
      ctx.quadraticCurveTo(
        -.9*r,-.3*r,
        -.58*r,-.72*r
      );
      ctx.quadraticCurveTo(
        -.08*r,-.82*r,
        .02*r,-.18*r
      );
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle="rgba(35,35,35,.45)";
      ctx.lineWidth=Math.max(1,r*.05);

      for(let i=0;i<3;i++){
        ctx.beginPath();
        ctx.moveTo(
          (-.55+i*.18)*r,
          (-.38-i*.08)*r
        );
        ctx.lineTo(
          (-.35+i*.18)*r,
          (-.55-i*.08)*r
        );
        ctx.stroke();
      }

    }else if(k==="rabbit"){
      ctx.beginPath();
      ctx.arc(
        -.55*r,
        .02*r,
        .19*r,
        0,
        Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

    }else if([
      "deer","goat","sheep","bear",
      "boar","capybara","ox","camel",
      "alpaca","pack"
    ].includes(k)){
      ctx.lineWidth=Math.max(2,r*.065);
      ctx.beginPath();
      ctx.moveTo(-.42*r,.1*r);
      ctx.lineTo(-.7*r,.03*r);
      ctx.stroke();

    }else if(kind==="bush"){
      ctx.beginPath();
      ctx.arc(
        .62*r,-.02*r,
        .72*r,
        -1.55,.65
      );
      ctx.stroke();

      ctx.lineWidth=Math.max(2,r*.23);
      ctx.stroke();

    }else if(kind==="curve"||kind==="ring"){
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


  function ambientProfile(){
    const g=window.EFRGame||null;
    const now=new Date();
    const minutes=
      now.getHours()*60+
      now.getMinutes()+
      now.getSeconds()/60;
    const h=minutes/60;

    let light=1;
    let tint="rgba(0,0,0,0)";
    let tintAlpha=0;

    if(h<5.5||h>=21){
      light=.62;
      tint="rgba(28,42,78,.26)";
      tintAlpha=.26;
    }else if(h<7||h>=19.5){
      light=.78;
      tint="rgba(92,76,110,.12)";
      tintAlpha=.12;
    }else if(h<8.5||h>=18){
      light=.9;
    }

    const weather=String(
      g?.world?.weather||
      g?.weather||
      g?.world?.condition||
      ""
    ).toLowerCase();

    if(
      /rain|storm|snow|fog|mist|霧|雨|雪/.test(weather)
    ){
      light*=.9;
      tint=
        /fog|mist|霧/.test(weather)
          ? "rgba(235,240,246,.13)"
          : "rgba(72,105,138,.12)";
      tintAlpha=.12;
    }else if(
      /cloud|overcast|曇/.test(weather)
    ){
      light*=.94;
      tint="rgba(105,120,135,.07)";
      tintAlpha=.07;
    }

    return{
      light,
      tint,
      tintAlpha,
      shadow:
        Math.max(
          .12,
          Math.min(
            .34,
            .17+(.95-light)*.2
          )
        )
    };
  }

  function createCacheCanvas(size){
    try{
      if(typeof OffscreenCanvas==="function"){
        return new OffscreenCanvas(size,size);
      }

      if(
        typeof document!=="undefined"&&
        typeof document.createElement==="function"
      ){
        const canvas=document.createElement("canvas");
        canvas.width=size;
        canvas.height=size;
        return canvas;
      }
    }catch(_e){}

    return null;
  }


  function eyePalette(body){
    if(["cat","lynx"].includes(body)){
      return {iris:"#6fae68",ring:"#d8f0c8"};
    }
    if(["wolf","hound","dog","golden"].includes(body)){
      return {iris:"#8aa8c6",ring:"#e7f1ff"};
    }
    if([
      "fox","raccoon","badger","raccoonDog","deer",
      "goat","horse","ox","camel","alpaca","monkey","boar"
    ].includes(body)){
      return {iris:"#b97932",ring:"#f0d19a"};
    }
    if([
      "bird","eagle","crow","kite","cormorant","owl","bat"
    ].includes(body)){
      return {iris:"#c58a35",ring:"#f4df9e"};
    }
    if([
      "snake","crocodile","turtle","spider"
    ].includes(body)){
      return {iris:"#a9b84c",ring:"#eef2b5"};
    }
    if([
      "penguin","otter","rabbit","sheep",
      "capybara","squirrel","weasel"
    ].includes(body)){
      return {iris:"#765d45",ring:"#e5d7c4"};
    }
    return {iris:"#8d6f56",ring:"#ead8bf"};
  }

  function drawSurfaceDetails(
    ctx,
    r,
    body,
    base,
    downed,
    lod
  ){
    if(downed||lod<1)return;

    const dark=shade(base,.58);
    const light="rgba(255,255,255,.34)";

    if([
      "bird","eagle","crow","kite",
      "cormorant","owl","bat"
    ].includes(body)){
      ctx.strokeStyle=dark;
      ctx.lineWidth=Math.max(.7,r*.028);

      for(let i=0;i<4;i++){
        const yy=(-.28+i*.14)*r;

        ctx.beginPath();
        ctx.moveTo(-.18*r,yy);
        ctx.quadraticCurveTo(
          .18*r,
          yy-.08*r,
          .46*r,
          yy+.02*r
        );
        ctx.stroke();
      }
    }else if([
      "snake","crocodile"
    ].includes(body)){
      ctx.strokeStyle=dark;
      ctx.lineWidth=Math.max(.65,r*.024);

      for(let i=-1;i<=2;i++){
        ctx.beginPath();
        ctx.arc(
          (-.1+i*.22)*r,
          .08*r,
          .18*r,
          0,
          Math.PI
        );
        ctx.stroke();
      }
    }else if(body==="turtle"){
      ctx.strokeStyle=dark;
      ctx.lineWidth=Math.max(.8,r*.03);

      ctx.beginPath();
      ctx.ellipse(
        -.05*r,
        0,
        .64*r,
        .42*r,
        0,
        0,
        Math.PI*2
      );
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-.05*r,-.42*r);
      ctx.lineTo(-.05*r,.42*r);
      ctx.moveTo(-.55*r,0);
      ctx.lineTo(.45*r,0);
      ctx.stroke();
    }else if([
      "sheep","alpaca","capybara","rabbit"
    ].includes(body)){
      ctx.fillStyle="rgba(255,250,235,.20)";

      for(let i=0;i<4;i++){
        ctx.beginPath();
        ctx.arc(
          (-.34+i*.22)*r,
          (-.08+(i%2)*.16)*r,
          .13*r,
          0,
          Math.PI*2
        );
        ctx.fill();
      }
    }else{
      ctx.strokeStyle=light;
      ctx.lineWidth=Math.max(.7,r*.026);

      ctx.beginPath();
      ctx.arc(
        -.18*r,
        -.18*r,
        .42*r,
        Math.PI*1.1,
        Math.PI*1.65
      );
      ctx.stroke();
    }
  }


  function drawSpeciesArtwork(
    ctx,
    r,
    key,
    body,
    base,
    downed,
    lod
  ){
    if(downed)return;

    const dark=shade(base,.62);
    const deep=shade(base,.45);
    const light="rgba(255,248,230,.55)";
    const edge="rgba(35,28,24,.58)";
    const white="rgba(248,242,226,.86)";

    const quadAnimals=[
      "hound","dog","golden","wolf","fox",
      "weasel","lynx","badger","raccoon",
      "raccoonDog","boar","goat","monkey",
      "deer","rabbit","sheep","capybara",
      "otter","squirrel","bear","horse",
      "tiger","leopard","cat",
      "ox","camel","alpaca","pack"
    ];

    if(quadAnimals.includes(key)){
      const canine=[
        "hound","dog","golden","wolf","fox",
        "weasel","lynx","badger","raccoon",
        "raccoonDog"
      ].includes(key);

      const feline=[
        "tiger","leopard","cat"
      ].includes(key);

      const headX=
        key==="bear" ? .55 :
        key==="rabbit" ? .58 :
        key==="horse" ? .66 :
        key==="ox" ? .62 :
        key==="camel" ? .64 :
        key==="alpaca" ? .62 :
        key==="deer" ? .64 :
        .57;

      const headY=
        feline ? -.22 :
        canine ? -.19 :
        key==="rabbit" ? -.28 :
        -.16;

      /*
       * Ears are filled anatomical shapes rather than lines.
       */
      ctx.fillStyle=base;
      ctx.strokeStyle=edge;
      ctx.lineWidth=Math.max(1,r*.045);
      ctx.lineJoin="round";

      if(
        ["wolf","fox","cat","lynx","boar","goat",
         "squirrel","tiger"].includes(key)
      ){
        for(const side of [-1,1]){
          const x=headX+side*.16;
          const top=
            key==="lynx" ? -.72 :
            key==="wolf" ? -.66 :
            key==="fox" ? -.62 :
            key==="goat" ? -.58 :
            -.56;

          ctx.beginPath();
          ctx.moveTo((x-.10*side)*r,headY*r);
          ctx.quadraticCurveTo(
            (x-.05*side)*r,
            (top+.15)*r,
            x*r,
            top*r
          );
          ctx.quadraticCurveTo(
            (x+.10*side)*r,
            (top+.16)*r,
            (x+.10*side)*r,
            headY*r
          );
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          if(key==="lynx"){
            ctx.fillStyle=light;
            ctx.beginPath();
            ctx.moveTo(x*r,(top+.01)*r);
            ctx.lineTo((x+.035*side)*r,(top+.13)*r);
            ctx.lineTo((x-.035*side)*r,(top+.12)*r);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle=base;
          }
        }
      }else if(
        ["hound","dog","golden","weasel","raccoon",
         "raccoonDog","bear","badger","horse",
         "ox","camel","alpaca","deer","sheep",
         "capybara","otter","monkey","pack"].includes(key)
      ){
        for(const side of [-1,1]){
          const x=headX+side*.14;
          const drop=
            ["hound","dog","golden","bear",
             "raccoon","raccoonDog","otter"].includes(key);

          ctx.beginPath();

          if(drop){
            ctx.moveTo((x-.12*side)*r,headY*r);
            ctx.quadraticCurveTo(
              (x-.20*side)*r,
              (headY+.16)*r,
              (x-.08*side)*r,
              (headY+.30)*r
            );
            ctx.quadraticCurveTo(
              x*r,
              (headY+.25)*r,
              (x+.10*side)*r,
              headY*r
            );
          }else{
            ctx.moveTo((x-.09*side)*r,headY*r);
            ctx.quadraticCurveTo(
              x*r,
              -.50*r,
              (x+.10*side)*r,
              headY*r
            );
          }

          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      /*
       * Species-specific muzzle and nose.
       * This is deliberately drawn as a real face structure,
       * not as one eye placed on an oval.
       */
      ctx.fillStyle=
        ["wolf","hound","dog","golden","fox",
         "weasel","badger","raccoon","raccoonDog",
         "otter"].includes(key)
          ? "rgba(245,232,211,.72)"
          : "rgba(245,235,216,.48)";

      if(
        ["hound","dog","golden","wolf","fox",
         "weasel","badger","raccoon","raccoonDog",
         "otter","bear"].includes(key)
      ){
        ctx.beginPath();
        ctx.ellipse(
          (headX+.22)*r,
          (headY+.13)*r,
          (key==="bear"?.25:.22)*r,
          (key==="bear"?.17:.14)*r,
          0,0,Math.PI*2
        );
        ctx.fill();

        ctx.fillStyle=deep;
        ctx.beginPath();
        ctx.ellipse(
          (headX+.39)*r,
          (headY+.11)*r,
          (key==="bear"?.075:.065)*r,
          (key==="bear"?.055:.045)*r,
          0,0,Math.PI*2
        );
        ctx.fill();

        ctx.strokeStyle=edge;
        ctx.lineWidth=Math.max(.7,r*.025);
        ctx.beginPath();
        ctx.moveTo(
          (headX+.37)*r,
          (headY+.18)*r
        );
        ctx.quadraticCurveTo(
          (headX+.28)*r,
          (headY+.28)*r,
          (headX+.18)*r,
          (headY+.22)*r
        );
        ctx.stroke();
      }

      if(["tiger","leopard","cat"].includes(key)){
        ctx.fillStyle="rgba(248,231,218,.58)";
        ctx.beginPath();
        ctx.ellipse(
          (headX+.18)*r,
          -.06*r,
          .20*r,
          .13*r,
          0,0,Math.PI*2
        );
        ctx.fill();

        ctx.fillStyle=deep;
        ctx.beginPath();
        ctx.moveTo((headX+.18)*r,-.03*r);
        ctx.quadraticCurveTo(
          (headX+.26)*r,.03*r,
          (headX+.18)*r,.08*r
        );
        ctx.quadraticCurveTo(
          (headX+.10)*r,.03*r,
          (headX+.18)*r,-.03*r
        );
        ctx.fill();

        if(lod>=2){
          ctx.strokeStyle=edge;
          ctx.lineWidth=Math.max(.7,r*.024);

          for(const side of [-1,1]){
            ctx.beginPath();
            ctx.moveTo((headX+.12)*r,.06*r);
            ctx.quadraticCurveTo(
              (headX-.02)*r,
              (.03+side*.02)*r,
              (headX-.18)*r,
              (.02+side*.10)*r
            );
            ctx.stroke();
          }
        }
      }

      /*
       * Species body accents.
       */
      if(key==="wolf"){
        ctx.fillStyle="rgba(245,240,226,.62)";
        ctx.beginPath();
        ctx.moveTo(-.12*r,-.18*r);
        ctx.quadraticCurveTo(
          .04*r,.28*r,
          .35*r,.36*r
        );
        ctx.quadraticCurveTo(
          .18*r,.02*r,
          .30*r,-.12*r
        );
        ctx.closePath();
        ctx.fill();
      }

      if(key==="bear"){
        ctx.fillStyle="rgba(245,232,210,.42)";
        ctx.beginPath();
        ctx.ellipse(
          -.08*r,.20*r,
          .32*r,.38*r,
          0,0,Math.PI*2
        );
        ctx.fill();
      }

      if(key==="fox"){
        ctx.fillStyle="rgba(250,235,215,.76)";
        ctx.beginPath();
        ctx.moveTo(.48*r,-.12*r);
        ctx.quadraticCurveTo(
          .72*r,.04*r,
          .42*r,.20*r
        );
        ctx.lineTo(.20*r,.10*r);
        ctx.closePath();
        ctx.fill();
      }

      if(key==="raccoon"||key==="raccoonDog"){
        ctx.fillStyle="rgba(28,27,28,.58)";
        ctx.beginPath();
        ctx.ellipse(
          (.55)*r,
          -.20*r,
          .30*r,
          .09*r,
          0,0,Math.PI*2
        );
        ctx.fill();
      }

      if(key==="boar"){
        ctx.fillStyle=deep;
        ctx.beginPath();
        ctx.ellipse(
          .78*r,.02*r,
          .17*r,.12*r,
          0,0,Math.PI*2
        );
        ctx.fill();

        ctx.strokeStyle=white;
        ctx.lineWidth=Math.max(.8,r*.035);
        for(const side of [-1,1]){
          ctx.beginPath();
          ctx.arc(
            .72*r,
            (.10+side*.03)*r,
            .12*r,
            side<0?Math.PI:0,
            side<0?Math.PI*1.65:Math.PI*.65
          );
          ctx.stroke();
        }
      }

      if(key==="deer"){
        ctx.fillStyle=deep;
        ctx.beginPath();
        ctx.ellipse(
          .86*r,-.02*r,
          .10*r,.07*r,
          0,0,Math.PI*2
        );
        ctx.fill();

        ctx.strokeStyle="#e6d4b0";
        ctx.lineWidth=Math.max(1,r*.045);
        for(const side of [-1,1]){
          ctx.beginPath();
          ctx.moveTo((.54+side*.13)*r,-.42*r);
          ctx.lineTo((.52+side*.18)*r,-.78*r);
          ctx.moveTo((.53+side*.17)*r,-.63*r);
          ctx.lineTo((.39+side*.18)*r,-.72*r);
          ctx.moveTo((.53+side*.18)*r,-.68*r);
          ctx.lineTo((.67+side*.12)*r,-.76*r);
          ctx.stroke();
        }
      }

      if(key==="goat"){
        ctx.strokeStyle="#dfd0a8";
        ctx.lineWidth=Math.max(1,r*.055);
        for(const side of [-1,1]){
          ctx.beginPath();
          ctx.moveTo((.52+side*.13)*r,-.35*r);
          ctx.quadraticCurveTo(
            (.72+side*.18)*r,
            -.58*r,
            (.55+side*.11)*r,
            -.78*r
          );
          ctx.stroke();
        }
      }

      if(key==="horse"||key==="pack"){
        ctx.fillStyle=shade(base,.72);
        ctx.beginPath();
        ctx.moveTo(-.32*r,-.16*r);
        ctx.quadraticCurveTo(
          -.02*r,-.55*r,
          .28*r,-.18*r
        );
        ctx.lineTo(.18*r,.18*r);
        ctx.lineTo(-.24*r,.20*r);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle="rgba(35,28,24,.34)";
        ctx.lineWidth=Math.max(.8,r*.025);
        for(let i=0;i<4;i++){
          ctx.beginPath();
          ctx.moveTo(
            (-.20+i*.10)*r,
            (-.20-i*.02)*r
          );
          ctx.lineTo(
            (-.14+i*.10)*r,
            (.16-i*.01)*r
          );
          ctx.stroke();
        }
      }

      if(key==="ox"){
        ctx.strokeStyle="#e8d4a8";
        ctx.lineWidth=Math.max(1,r*.065);

        for(const side of [-1,1]){
          ctx.beginPath();
          ctx.moveTo((.48+side*.15)*r,-.30*r);
          ctx.quadraticCurveTo(
            (.72+side*.25)*r,
            -.56*r,
            (.60+side*.16)*r,
            -.76*r
          );
          ctx.stroke();
        }
      }

      if(key==="camel"){
        ctx.fillStyle=shade(base,.78);
        ctx.beginPath();
        ctx.arc(-.22*r,-.28*r,.30*r,Math.PI,Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(.16*r,-.27*r,.27*r,Math.PI,Math.PI*2);
        ctx.fill();
      }

      if(key==="alpaca"||key==="sheep"){
        ctx.fillStyle=white;
        for(let i=0;i<6;i++){
          ctx.beginPath();
          ctx.arc(
            (-.38+i*.14)*r,
            (-.18+(i%2)*.14)*r,
            .13*r,
            0,Math.PI*2
          );
          ctx.fill();
        }
      }

      if(key==="rabbit"){
        ctx.fillStyle=white;
        ctx.beginPath();
        ctx.ellipse(.72*r,.10*r,.10*r,.07*r,0,0,Math.PI*2);
        ctx.fill();
      }

      if(key==="squirrel"){
        ctx.strokeStyle=light;
        ctx.lineWidth=Math.max(2,r*.16);
        ctx.beginPath();
        ctx.arc(
          -.28*r,
          -.02*r,
          .70*r,
          2.1,
          5.0
        );
        ctx.stroke();
      }

      /*
       * Paw shapes replace the impression of four straight lines.
       */
      if(
        !["rabbit","capybara"].includes(key) &&
        lod>=1
      ){
        ctx.fillStyle=dark;
        const wide=
          ["horse","ox","camel","alpaca","deer","goat"].includes(key)
            ? .075
            : .065;

        for(const x of [-.5,-.18,.18,.5]){
          ctx.beginPath();
          ctx.ellipse(
            x*r,
            .72*r,
            wide*r,
            .045*r,
            0,0,Math.PI*2
          );
          ctx.fill();
        }
      }

      return;
    }

    if(
      ["bird","eagle","owl","crow","kite","cormorant",
       "penguin","bat"].includes(key)
    ){
      /*
       * Feather structure.
       */
      ctx.strokeStyle="rgba(30,28,28,.38)";
      ctx.lineWidth=Math.max(.7,r*.025);

      const featherRows=
        key==="owl" ? 5 :
        key==="penguin" ? 3 : 4;

      for(let i=0;i<featherRows;i++){
        const yy=(-.18+i*.13)*r;

        ctx.beginPath();
        ctx.moveTo(-.30*r,yy);
        ctx.quadraticCurveTo(
          -.02*r,
          yy+.08*r,
          .28*r,
          yy-.02*r
        );
        ctx.stroke();
      }

      /*
       * Species-specific beaks.
       */
      ctx.fillStyle=
        key==="crow" ? "#25272a" :
        key==="eagle" ? "#d3a642" :
        key==="cormorant" ? "#343638" :
        key==="owl" ? "#b47a48" :
        "#d49a43";

      ctx.strokeStyle=edge;
      ctx.beginPath();

      if(key==="owl"){
        ctx.moveTo(.32*r,-.10*r);
        ctx.lineTo(.52*r,.03*r);
        ctx.lineTo(.32*r,.13*r);
      }else if(key==="eagle"){
        ctx.moveTo(.35*r,-.16*r);
        ctx.quadraticCurveTo(
          .70*r,-.05*r,
          .42*r,.08*r
        );
        ctx.lineTo(.29*r,.02*r);
      }else if(key==="cormorant"){
        ctx.moveTo(.38*r,-.12*r);
        ctx.lineTo(.85*r,-.06*r);
        ctx.lineTo(.40*r,.08*r);
      }else{
        ctx.moveTo(.35*r,-.12*r);
        ctx.lineTo(.68*r,-.05*r);
        ctx.lineTo(.37*r,.06*r);
      }

      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      if(key==="owl"){
        ctx.fillStyle="rgba(245,238,218,.76)";

        for(const side of [-1,1]){
          ctx.beginPath();
          ctx.ellipse(
            side*.22*r,
            -.10*r,
            .25*r,
            .29*r,
            0,0,Math.PI*2
          );
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle="#202020";
          ctx.beginPath();
          ctx.arc(
            side*.22*r,
            -.11*r,
            .09*r,
            0,Math.PI*2
          );
          ctx.fill();

          ctx.fillStyle="rgba(245,238,218,.76)";
        }
      }

      if(
        ["eagle","kite","cormorant"].includes(key)
      ){
        ctx.strokeStyle=shade(base,.52);
        ctx.lineWidth=Math.max(1,r*.035);

        for(const side of [-1,1]){
          ctx.beginPath();
          ctx.moveTo(-.05*r,.05*r);
          ctx.quadraticCurveTo(
            side*.70*r,
            -.48*r,
            side*.92*r,
            .12*r
          );
          ctx.stroke();
        }
      }

      if(key==="penguin"){
        ctx.fillStyle="rgba(242,240,228,.88)";
        ctx.beginPath();
        ctx.ellipse(
          .04*r,.12*r,
          .34*r,.48*r,
          0,0,Math.PI*2
        );
        ctx.fill();

        ctx.fillStyle="#e1a744";
        ctx.beginPath();
        ctx.ellipse(
          .55*r,.02*r,
          .11*r,.07*r,
          0,0,Math.PI*2
        );
        ctx.fill();
      }

      if(key==="bat"){
        ctx.fillStyle=deep;
        ctx.beginPath();
        ctx.moveTo(.22*r,-.20*r);
        ctx.lineTo(.30*r,-.50*r);
        ctx.lineTo(.43*r,-.30*r);
        ctx.lineTo(.55*r,-.48*r);
        ctx.lineTo(.58*r,-.08*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      return;
    }

    if(key==="snake"){
      ctx.strokeStyle=shade(base,.48);
      ctx.lineWidth=Math.max(.8,r*.028);

      for(let i=0;i<8;i++){
        const x=(-.62+i*.20)*r;

        ctx.beginPath();
        ctx.arc(
          x,
          (.04+Math.sin(i*.8)*.05)*r,
          .11*r,
          Math.PI,
          Math.PI*2
        );
        ctx.stroke();
      }

      ctx.fillStyle=deep;
      ctx.beginPath();
      ctx.ellipse(
        .70*r,-.15*r,
        .25*r,.18*r,
        -.15,0,Math.PI*2
      );
      ctx.fill();

      ctx.strokeStyle=edge;
      ctx.lineWidth=Math.max(.8,r*.025);
      ctx.beginPath();
      ctx.moveTo(.78*r,-.05*r);
      ctx.quadraticCurveTo(
        .96*r,.02*r,
        .78*r,.08*r
      );
      ctx.stroke();

      return;
    }

    if(key==="spider"){
      ctx.fillStyle=deep;
      ctx.beginPath();
      ctx.ellipse(
        .20*r,.02*r,
        .36*r,.30*r,
        0,0,Math.PI*2
      );
      ctx.fill();

      ctx.fillStyle=shade(base,.72);
      ctx.beginPath();
      ctx.ellipse(
        -.34*r,.02*r,
        .26*r,.23*r,
        0,0,Math.PI*2
      );
      ctx.fill();

      ctx.fillStyle="rgba(255,240,220,.78)";
      for(const [x,y] of [
        [-.40,-.10],[-.27,-.10],
        [-.40,.04],[-.27,.04]
      ]){
        ctx.beginPath();
        ctx.arc(x*r,y*r,.035*r,0,Math.PI*2);
        ctx.fill();
      }

      return;
    }

    if(key==="turtle"){
      ctx.fillStyle=shade(base,.72);
      ctx.strokeStyle=edge;
      ctx.lineWidth=Math.max(1,r*.035);

      for(const side of [-1,1]){
        ctx.beginPath();
        ctx.ellipse(
          side*.56*r,
          .22*r,
          .16*r,.24*r,
          side*.3,0,Math.PI*2
        );
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle=base;
      ctx.beginPath();
      ctx.ellipse(
        .65*r,-.10*r,
        .22*r,.18*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle=deep;
      ctx.beginPath();
      ctx.arc(.75*r,-.12*r,.035*r,0,Math.PI*2);
      ctx.fill();

      return;
    }

    if(key==="crocodile"){
      ctx.fillStyle=deep;
      ctx.strokeStyle=edge;
      ctx.lineWidth=Math.max(1,r*.035);

      ctx.beginPath();
      ctx.moveTo(.22*r,-.16*r);
      ctx.lineTo(1.05*r,-.18*r);
      ctx.lineTo(.92*r,.08*r);
      ctx.lineTo(.25*r,.05*r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle="rgba(244,232,205,.84)";
      for(let i=0;i<5;i++){
        ctx.beginPath();
        ctx.moveTo(
          (.45+i*.10)*r,
          -.08*r
        );
        ctx.lineTo(
          (.50+i*.10)*r,
          -.01*r
        );
        ctx.lineTo(
          (.55+i*.10)*r,
          -.08*r
        );
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle=shade(base,.45);
      for(let i=0;i<7;i++){
        ctx.beginPath();
        ctx.arc(
          (-.30+i*.18)*r,
          .10*r,
          .10*r,
          0,
          Math.PI
        );
        ctx.stroke();
      }

      return;
    }
  }

  function drawFaceDetails(
    ctx,
    r,
    body,
    base,
    downed,
    variant,
    lod
  ){
    const faceAnchor={
      dog:.82,
      fox:.88,
      cat:.78,
      lynx:.8,
      bear:.76,
      boar:.82,
      capybara:.84,
      raccoon:.82,
      badger:.82,
      weasel:.84,
      otter:.86,
      monkey:.78,
      rabbit:.78,
      squirrel:.78,
      horse:.84,
      ox:.82,
      alpaca:.82,
      deer:.84,
      goat:.84,
      camel:.82,
      bird:.62,
      owl:.48,
      penguin:.48,
      crocodile:.82,
      turtle:.74,
      snake:.76,
      spider:.32,
      bat:.38
    };

    const faceX=
      (faceAnchor[body]??.5)*r+
      (variant-.5)*r*.08;

    const eyeY=-r*.2;
    const eyeR=Math.max(1.3,r*.105);

    if(downed){
      ctx.strokeStyle="#333";
      ctx.lineWidth=Math.max(.8,r*.045);

      ctx.beginPath();
      ctx.moveTo(
        faceX-eyeR,
        eyeY-eyeR*.25
      );
      ctx.lineTo(
        faceX+eyeR,
        eyeY+eyeR*.25
      );
      ctx.moveTo(
        faceX+eyeR,
        eyeY-eyeR*.25
      );
      ctx.lineTo(
        faceX-eyeR,
        eyeY+eyeR*.25
      );
      ctx.stroke();

      return;
    }

    const palette=eyePalette(body);

    ctx.fillStyle=palette.ring;
    ctx.beginPath();
    ctx.arc(
      faceX,
      eyeY,
      eyeR*1.08,
      0,
      Math.PI*2
    );
    ctx.fill();

    ctx.fillStyle=palette.iris;
    ctx.beginPath();
    ctx.arc(
      faceX+r*.012,
      eyeY,
      eyeR*.72,
      0,
      Math.PI*2
    );
    ctx.fill();

    ctx.fillStyle="#171717";
    ctx.beginPath();

    if([
      "snake","crocodile"
    ].includes(body)){
      ctx.ellipse(
        faceX+r*.018,
        eyeY,
        Math.max(.7,eyeR*.16),
        Math.max(1,eyeR*.62),
        0,
        0,
        Math.PI*2
      );
    }else{
      ctx.arc(
        faceX+r*.018,
        eyeY,
        Math.max(.7,eyeR*.42),
        0,
        Math.PI*2
      );
    }

    ctx.fill();

    ctx.fillStyle="#fff";
    ctx.beginPath();
    ctx.arc(
      faceX-eyeR*.22,
      eyeY-eyeR*.25,
      Math.max(.55,eyeR*.2),
      0,
      Math.PI*2
    );
    ctx.fill();

    if(lod>=1){
      ctx.strokeStyle="rgba(30,25,20,.38)";
      ctx.lineWidth=Math.max(.6,r*.025);

      ctx.beginPath();
      ctx.arc(
        faceX,
        eyeY,
        eyeR*1.28,
        Math.PI*1.05,
        Math.PI*1.85
      );
      ctx.stroke();
    }

    if([
      "dog","hound","wolf","fox","cat","lynx",
      "weasel","raccoon","raccoonDog","boar",
      "goat","monkey","deer","rabbit","sheep",
      "capybara","otter","badger","squirrel","golden"
    ].includes(body)){
      ctx.fillStyle="#2b211c";

      ctx.beginPath();
      ctx.ellipse(
        faceX+r*.15,
        -r*.03,
        Math.max(1,r*.065),
        Math.max(.8,r*.045),
        0,
        0,
        Math.PI*2
      );
      ctx.fill();
    }

    if([
      "rabbit","cat","dog","golden",
      "capybara","otter","squirrel"
    ].includes(body)&&lod>=2){
      ctx.fillStyle="rgba(255,135,155,.16)";

      ctx.beginPath();
      ctx.arc(
        faceX+r*.13,
        -r*.02,
        r*.11,
        0,
        Math.PI*2
      );
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
        faceX+r*.22,
        -r*.02,
        r*.08,
        0,
        Math.PI*2
      );
      ctx.fill();
    }

    if([
      "wolf","hound","tiger","leopard",
      "bear","crocodile","eagle","owl","snake"
    ].includes(body)&&lod>=2){
      ctx.strokeStyle="rgba(35,28,22,.34)";
      ctx.lineWidth=Math.max(.7,r*.026);

      ctx.beginPath();
      ctx.moveTo(
        faceX-eyeR*.9,
        eyeY-eyeR*.95
      );
      ctx.quadraticCurveTo(
        faceX,
        eyeY-eyeR*1.28,
        faceX+eyeR*.55,
        eyeY-eyeR*.82
      );
      ctx.stroke();
    }
  }

  function paintStaticLayer(
    layerCtx,
    center,
    r,
    body,
    graphic,
    base,
    downed,
    variant,
    lod
  ){
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

    layerCtx.save();
    layerCtx.translate(center,center);

    drawAnatomicalBody(
      layerCtx,
      r,
      graphic?.key||body,
      fill,
      stroke,
      light,
      lod,
      0
    );

    drawAnatomicalSurface(
      layerCtx,
      r,
      graphic?.key||body,
      base,
      light,
      lod
    );

    marks(
      layerCtx,
      r,
      graphic?.mark,
      fill
    );

    if(
      body==="bird"||
      body==="penguin"
    ){
      layerCtx.fillStyle=
        downed
          ? "#888"
          : "#d99a3e";

      layerCtx.beginPath();
      layerCtx.moveTo(.48*r,-.2*r);
      layerCtx.lineTo(.88*r,-.1*r);
      layerCtx.lineTo(.48*r,-.01*r);
      layerCtx.closePath();
      layerCtx.fill();
    }

    drawSpeciesArtwork(
      layerCtx,
      r,
      graphic?.key||"",
      body,
      base,
      downed,
      lod
    );

    drawFaceDetails(
      layerCtx,
      r,
      body,
      base,
      downed,
      variant,
      lod
    );

    drawSurfaceDetails(
      layerCtx,
      r,
      body,
      base,
      downed,
      lod
    );

    if(lod>=1&&!downed){
      layerCtx.strokeStyle=
        "rgba(255,255,255,.3)";
      layerCtx.lineWidth=
        Math.max(.8,r*.035);

      layerCtx.beginPath();
      layerCtx.arc(
        -r*.1,
        -r*.12,
        r*.5,
        Math.PI*1.08,
        Math.PI*1.7
      );
      layerCtx.stroke();
    }

    if(lod===2&&!downed){
      layerCtx.fillStyle=
        "rgba(255,255,255,.13)";

      layerCtx.beginPath();
      layerCtx.arc(
        -r*.25,
        -r*.28,
        r*.12,
        0,Math.PI*2
      );
      layerCtx.fill();
    }

    layerCtx.restore();
  }

  function getStaticLayer(
    body,
    graphic,
    base,
    r,
    downed,
    variant,
    lod
  ){
    const cacheKey=[
      graphic?.key||"",
      body,
      graphic?.ears||"",
      graphic?.tail||"",
      graphic?.mark||"",
      base,
      Math.round(r*10),
      downed?1:0,
      Math.round(variant*32),
      lod
    ].join(":");

    let entry=cache.get(cacheKey);

    if(entry){
      cache.delete(cacheKey);
      cache.set(cacheKey,entry);
      return entry;
    }

    const size=
      Math.max(
        24,
        Math.ceil(r*2.9+10)
      );

    const canvas=
      createCacheCanvas(size);

    if(!canvas)return null;

    const layerCtx=
      canvas.getContext("2d");

    if(!layerCtx)return null;

    paintStaticLayer(
      layerCtx,
      size/2,
      r,
      body,
      graphic,
      base,
      downed,
      variant,
      lod
    );

    entry={
      canvas,
      size,
      cacheKey
    };

    cache.set(cacheKey,entry);

    while(cache.size>192){
      cache.delete(
        cache.keys().next().value
      );
    }

    return entry;
  }

  function special(
    ctx,
    r,
    body,
    fill,
    light,
    phase,
    animated
  ){
    ctx.save();

    if(body==="bird"||body==="bat"){
      const flap=
        animated
          ? Math.sin(phase*2.8)*.24
          : 0;

      for(const s of [-1,1]){
        ctx.save();
        ctx.translate(
          0,
          -.05*r
        );
        ctx.rotate(
          s*(.08+flap)
        );
        ctx.fillStyle=shade(fill,.86);

        ctx.beginPath();
        ctx.moveTo(
          -.12*r,
          -.1*r
        );
        ctx.quadraticCurveTo(
          s*(-1.1*r),
          -.9*r,
          s*(-.96*r),
          .18*r
        );
        ctx.quadraticCurveTo(
          s*(-.5*r),
          .06*r,
          -.12*r,
          .2*r
        );
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
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

      const pulse=
        animated
          ? Math.sin(phase*3.1)*r*.035
          : 0;

      for(let i=0;i<4;i++){
        const y=
          (-.42+i*.28)*r;

        ctx.beginPath();
        ctx.moveTo(-.22*r,y);
        ctx.quadraticCurveTo(
          -.82*r,
          y-.18*r+pulse*(i%2?-1:1),
          -1.02*r,
          y+.25*r
        );
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(.22*r,y);
        ctx.quadraticCurveTo(
          .82*r,
          y-.18*r+pulse*(i%2?1:-1),
          1.02*r,
          y+.25*r
        );
        ctx.stroke();
      }
    }

    ctx.restore();
  }


  /*
   * Species anatomy renderer.
   *
   * This replaces the old "shared oval body + decorative parts" path
   * for normal gameplay LODs.  Shared helpers are retained only for
   * geometry/shading; the visible body proportions are selected per
   * species so the result reads as an animal rather than an icon.
   */
  function drawAnatomicalBody(
    ctx,
    r,
    key,
    fill,
    stroke,
    light,
    lod,
    phase
  ){
    const k=String(key||"");

    ctx.save();
    ctx.fillStyle=fill;
    ctx.strokeStyle=stroke;
    ctx.lineWidth=Math.max(1,r*.045);
    ctx.lineJoin="round";
    ctx.lineCap="round";

    const path=(commands)=>{
      ctx.beginPath();

      for(const c of commands){
        if(c[0]==="M"){
          ctx.moveTo(c[1]*r,c[2]*r);
        }else if(c[0]==="L"){
          ctx.lineTo(c[1]*r,c[2]*r);
        }else if(c[0]==="Q"){
          ctx.quadraticCurveTo(
            c[1]*r,c[2]*r,
            c[3]*r,c[4]*r
          );
        }else if(c[0]==="C"){
          ctx.bezierCurveTo(
            c[1]*r,c[2]*r,
            c[3]*r,c[4]*r,
            c[5]*r,c[6]*r
          );
        }else if(c[0]==="Z"){
          ctx.closePath();
        }
      }

      ctx.fill();
      ctx.stroke();
    };

    const leg=(x,y,h,w)=>{
      const jointY=y+h*.46;
      const ankleY=y+h*.86;

      ctx.beginPath();
      ctx.moveTo((x-w)*r,y*r);
      ctx.quadraticCurveTo(
        (x-w*.72)*r,
        (y+h*.34)*r,
        (x-w*.48)*r,
        jointY*r
      );
      ctx.quadraticCurveTo(
        (x-w*.34)*r,
        (y+h*.66)*r,
        (x-w*.42)*r,
        ankleY*r
      );
      ctx.quadraticCurveTo(
        x*r,
        (y+h*1.03)*r,
        (x+w*.48)*r,
        ankleY*r
      );
      ctx.quadraticCurveTo(
        (x+w*.62)*r,
        (y+h*.68)*r,
        (x+w)*r,
        y*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle=shade(fill,.70);
      ctx.beginPath();
      ctx.ellipse(
        x*r,
        jointY*r,
        w*.72*r,
        Math.max(.035*r,w*.46*r),
        0,
        0,
        Math.PI*2
      );
      ctx.fill();

      ctx.fillStyle=fill;
      ctx.beginPath();
      ctx.moveTo((x-w*.72)*r,ankleY*r);
      ctx.quadraticCurveTo(
        (x-w*.86)*r,
        (y+h*.98)*r,
        (x-w*.58)*r,
        (y+h*1.05)*r
      );
      ctx.quadraticCurveTo(
        x*r,
        (y+h*1.10)*r,
        (x+w*.72)*r,
        (y+h*1.04)*r
      );
      ctx.quadraticCurveTo(
        (x+w*.84)*r,
        (y+h*.98)*r,
        (x+w*.72)*r,
        ankleY*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    const fourLeg=(
      frontX,
      rearX,
      top,
      height,
      width
    )=>{
      /*
       * 四足動物の脚を「4本の棒」として描かない。
       *
       * 近側の前脚・後脚を身体下面へ深く食い込ませた
       * 大きな脚群として描き、遠側は暗い面として重ねる。
       *
       * これにより、
       *   胴体
       *   ↓
       *   胸・腰
       *   ↓
       *   前脚群・後脚群
       *   ↓
       *   足先
       *
       * が一つの動物シルエットとして連続する。
       *
       * 特にr≈14pxの通常表示で、細い線へ潰れないことを優先する。
       */
      const pair = (
        x,
        y,
        h,
        w,
        far=false
      )=>{
        const topY=y-h*.08;
        const kneeY=y+h*.48;
        const ankleY=y+h*.82;
        const footY=y+h*1.02;

        ctx.beginPath();
        ctx.moveTo(
          (x-w*1.18)*r,
          topY*r
        );

        ctx.quadraticCurveTo(
          (x-w*1.42)*r,
          (y+h*.22)*r,
          (x-w*.82)*r,
          kneeY*r
        );

        ctx.quadraticCurveTo(
          (x-w*.70)*r,
          (y+h*.64)*r,
          (x-w*.56)*r,
          ankleY*r
        );

        ctx.quadraticCurveTo(
          (x-w*.92)*r,
          footY*r,
          x*r,
          (y+h*1.09)*r
        );

        ctx.quadraticCurveTo(
          (x+w*.94)*r,
          footY*r,
          (x+w*.62)*r,
          ankleY*r
        );

        ctx.quadraticCurveTo(
          (x+w*.72)*r,
          (y+h*.61)*r,
          (x+w*.92)*r,
          kneeY*r
        );

        ctx.quadraticCurveTo(
          (x+w*1.30)*r,
          (y+h*.18)*r,
          (x+w*1.18)*r,
          topY*r
        );

        ctx.closePath();

        ctx.fillStyle =
          far
            ? shade(fill,.68)
            : fill;

        ctx.fill();

        if(!far){
          ctx.strokeStyle=stroke;
          ctx.lineWidth=Math.max(1,r*.038);
          ctx.stroke();
        }
      };

      /*
       * 遠側を先に描く。
       * 胴体との重なりを深くして、独立した棒に見せない。
       */
      pair(
        rearX+.10,
        top+.015,
        height*.96,
        Math.max(width,.095),
        true
      );

      pair(
        frontX+.08,
        top+.005,
        height,
        Math.max(width,.095),
        true
      );

      /*
       * 近側の脚は大きな塊として描く。
       * 前後脚それぞれに肩・臀部からの連続感を持たせる。
       */
      pair(
        rearX-.02,
        top,
        height,
        Math.max(width,.105),
        false
      );

      pair(
        frontX-.02,
        top,
        height,
        Math.max(width,.105),
        false
      );

      /*
       * 足先だけを細い線で表現しない。
       * 接地面を小さな面として残し、モバイル表示でも
       * 「脚が地面に着いている」ことを維持する。
       */
      ctx.fillStyle =
        far
          ? shade(fill,.62)
          : shade(fill,.82);

      for(const x of [rearX-.02,frontX-.02]){
        ctx.beginPath();
        ctx.ellipse(
          x*r,
          (top+height*1.04)*r,
          Math.max(width*1.12,.12)*r,
          Math.max(width*.34,.045)*r,
          0,
          0,
          Math.PI*2
        );
        ctx.fill();
      }
    };

    const canine=({
      bodyW=.78,
      bodyH=.40,
      chest=.16,
      neck=.10,
      head=.28,
      muzzleW=.22,
      muzzleH=.13,
      legH=.40,
      legW=.065,
      back=.00,
      belly=.05
    }={})=>{
      /*
       * 四足動物を「胴体の楕円＋頭の楕円」にしない。
       * 背中・胸・腹・首・頭部・口吻を連続した輪郭として
       * 構成し、脚は関節と足先を分離して動物の骨格を読む。
       */
      path([
        ["M",-bodyW,.13+back],
        ["Q",-bodyW-.06,.02,-bodyW*.78,-.17],
        ["Q",-bodyW*.54,-bodyH-.02,-.18,-bodyH],
        ["Q",.05,-bodyH-.06,.26,-bodyH*.72],
        ["Q",.34,-bodyH*.46,.38,-.30],
        ["Q",.42,-.20,.50,-.12],
        ["Q",.66,-.22,.82,-.14],
        ["Q",1.00,-.07,1.02,.01],
        ["Q",1.00,.08,.83,.11],
        ["Q",.67,.12,.55,.18],
        ["Q",.48,.28,.34,.38],
        ["Q",.04,.45,-.30,.41+belly],
        ["Q",-bodyW*.72,.38,-bodyW,.13+back],
        ["Z"]
      ]);

      ctx.fillStyle=shade(fill,.80);
      ctx.beginPath();
      ctx.moveTo(
        (-bodyW*.55)*r,
        (-bodyH*.44)*r
      );
      ctx.quadraticCurveTo(
        (-.05)*r,
        (-bodyH*.56)*r,
        (.28)*r,
        (-bodyH*.22)*r
      );
      ctx.quadraticCurveTo(
        (.10)*r,
        (.03)*r,
        (-bodyW*.34)*r,
        (.08)*r
      );
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle=shade(fill,.90);
      ctx.beginPath();
      ctx.moveTo(
        (.28)*r,
        (-.27)*r
      );
      ctx.quadraticCurveTo(
        (.39)*r,
        (-.02)*r,
        (.43)*r,
        (.25)*r
      );
      ctx.quadraticCurveTo(
        (.30)*r,
        (.34)*r,
        (.12)*r,
        (.28)*r
      );
      ctx.closePath();
      ctx.fill();

      fourLeg(
        .50,
        -.48,
        .16,
        legH,
        legW
      );

      ctx.fillStyle=fill;
      ctx.strokeStyle=stroke;
      path([
        ["M",.28,-.30],
        ["Q",.34,-.49,.46,-.56],
        ["Q",.60,-.60,.68,-.48],
        ["L",.73,-.22],
        ["Q",.56,-.16,.42,-.12],
        ["Z"]
      ]);

      const hx=.55+neck;
      const hy=-.31;

      path([
        ["M",hx-head*.52,hy+head*.40],
        ["Q",hx-head*.62,hy-head*.28,hx-head*.18,hy-head*.88],
        ["Q",hx+head*.26,hy-head*1.02,hx+head*.62,hy-head*.62],
        ["Q",hx+head*.82,hy-head*.42,hx+head*.82,hy-head*.10],
        ["L",hx+head*1.28,hy+head*.02],
        ["Q",hx+head*1.20,hy+head*.26,hx+head*.74,hy+head*.34],
        ["Q",hx+head*.36,hy+head*.54,hx-head*.10,hy+head*.50],
        ["Q",hx-head*.42,hy+head*.48,hx-head*.52,hy+head*.40],
        ["Z"]
      ]);

      muzzle(
        hx+head*.82,
        hy+head*.06,
        muzzleW,
        muzzleH
      );

      eye(
        hx+head*.26,
        hy-head*.42,
        .045
      );

      ctx.strokeStyle=shade(fill,.48);
      ctx.lineWidth=Math.max(.8,r*.022);
      ctx.beginPath();
      ctx.moveTo(
        (hx+head*.40)*r,
        (hy+head*.28)*r
      );
      ctx.quadraticCurveTo(
        (hx+head*.66)*r,
        (hy+head*.38)*r,
        (hx+head*.94)*r,
        (hy+head*.20)*r
      );
      ctx.stroke();

      ctx.strokeStyle=stroke;
      ctx.lineWidth=Math.max(1,r*.045);
    };

    const feline=({
      bodyW=.70,
      bodyH=.40,
      head=.29,
      muzzleW=.18,
      legH=.42,
      legW=.065
    }={})=>{
      path([
        ["M",-bodyW,.14],
        ["Q",-bodyW-.04,-.04,-bodyW*.70,-.25],
        ["Q",-bodyW*.34,-bodyH-.04,.00,-bodyH],
        ["Q",.27,-bodyH*.95,.38,-.68*bodyH],
        ["Q",.43,-.48,.47,-.35],
        ["Q",.52,-.27,.62,-.23],
        ["Q",.80,-.16,.90,-.08],
        ["Q",.98,.00,.91,.08],
        ["Q",.80,.13,.64,.10],
        ["Q",.53,.10,.46,.24],
        ["Q",.36,.39,.10,.40],
        ["Q",-.30,.43,-.60,.36],
        ["Q",-bodyW*.90,.32,-bodyW,.14],
        ["Z"]
      ]);

      fourLeg(
        .40,
        -.48,
        .17,
        legH,
        legW
      );

      ctx.fillStyle=fill;

      ctx.beginPath();
      ctx.ellipse(
        .53*r,
        -.34*r,
        head*r,
        head*.86*r,
        0,
        0,
        Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      for(const side of [-1,1]){
        ctx.beginPath();
        ctx.moveTo(
          (.40+side*.13)*r,
          (-.55)*r
        );
        ctx.lineTo(
          (.45+side*.19)*r,
          (-.90)*r
        );
        ctx.lineTo(
          (.58+side*.08)*r,
          (-.59)*r
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      muzzle(
        .70,
        -.22,
        muzzleW,
        .11
      );

      eye(
        .59,
        -.42,
        .043
      );

      if(lod>=2){
        ctx.strokeStyle=light;
        ctx.lineWidth=Math.max(.7,r*.018);

        for(const y of [-.20,-.05,.10]){
          ctx.beginPath();
          ctx.moveTo(-.30*r,y*r);
          ctx.quadraticCurveTo(
            .02*r,
            (y-.04)*r,
            .29*r,
            (y+.01)*r
          );
          ctx.stroke();
        }
      }
    };

    const midMammal=({
      kind="weasel",
      bodyW=.72,
      bodyH=.30,
      head=.23,
      legH=.28,
      legW=.05,
      muzzleW=.21
    }={})=>{
      if(kind==="weasel"){
        path([
          ["M",-bodyW,.14],
          ["Q",-bodyW-.05,-.02,-bodyW*.72,-.18],
          ["Q",-bodyW*.38,-bodyH,.02,-bodyH*.82],
          ["Q",.30,-bodyH*.78,.42,-.22],
          ["Q",.54,-.18,.72,-.10],
          ["Q",.92,-.02,.88,.08],
          ["Q",.78,.16,.58,.13],
          ["Q",.42,.13,.34,.25],
          ["Q",.20,.38,-.06,.37],
          ["Q",-.44,.35,-.72,.28],
          ["Q",-bodyW-.02,.22,-bodyW,.14],
          ["Z"]
        ]);

        leg(-.48,.20,.28,.05);
        leg(-.22,.19,.27,.05);
        leg(.26,.18,.29,.05);
        leg(.50,.17,.27,.05);

        ctx.fillStyle=fill;
        ctx.beginPath();
        ctx.ellipse(
          .54*r,-.28*r,
          head*r,head*.78*r,
          -.04,0,Math.PI*2
        );
        ctx.fill();
        ctx.stroke();

        muzzle(
          .75,-.21,
          muzzleW,.09
        );

        eye(.62,-.37,.038);

      }else if(kind==="otter"){
        path([
          ["M",-bodyW,.18],
          ["Q",-bodyW-.04,.02,-bodyW*.76,-.18],
          ["Q",-bodyW*.42,-bodyH+.02,-.04,-bodyH],
          ["Q",.28,-bodyH+.01,.42,-.20],
          ["Q",.56,-.17,.74,-.08],
          ["Q",.94,.00,.90,.11],
          ["Q",.78,.19,.58,.16],
          ["Q",.42,.17,.32,.30],
          ["Q",.16,.42,-.12,.40],
          ["Q",-.52,.38,-.78,.30],
          ["Q",-bodyW-.03,.25,-bodyW,.18],
          ["Z"]
        ]);

        leg(-.48,.22,.30,.065);
        leg(-.20,.21,.29,.065);
        leg(.25,.20,.31,.065);
        leg(.50,.20,.29,.065);

        ctx.fillStyle=fill;
        ctx.beginPath();
        ctx.ellipse(
          .56*r,-.26*r,
          head*r,head*.80*r,
          0,0,Math.PI*2
        );
        ctx.fill();
        ctx.stroke();

        muzzle(
          .80,-.19,
          muzzleW,.10
        );

        eye(.64,-.36,.040);

      }else if(kind==="raccoon"){
        path([
          ["M",-bodyW,.16],
          ["Q",-bodyW-.04,-.02,-bodyW*.72,-.22],
          ["Q",-bodyW*.38,-bodyH-.03,-.02,-bodyH],
          ["Q",.30,-bodyH+.01,.42,-.20],
          ["Q",.56,-.17,.74,-.08],
          ["Q",.94,.00,.90,.12],
          ["Q",.78,.20,.58,.17],
          ["Q",.42,.18,.34,.31],
          ["Q",.18,.44,-.10,.42],
          ["Q",-.46,.40,-.76,.32],
          ["Q",-bodyW-.02,.25,-bodyW,.16],
          ["Z"]
        ]);

        leg(-.46,.21,.37,.075);
        leg(-.18,.21,.35,.075);
        leg(.24,.20,.37,.075);
        leg(.50,.20,.35,.075);

        ctx.fillStyle=fill;
        ctx.beginPath();
        ctx.ellipse(
          .56*r,-.28*r,
          head*r*1.05,head*.92*r,
          0,0,Math.PI*2
        );
        ctx.fill();
        ctx.stroke();

        muzzle(.82,-.20,.25,.12);
        eye(.65,-.39,.042);

      }else if(kind==="raccoonDog"){
        path([
          ["M",-bodyW,.17],
          ["Q",-bodyW-.05,.00,-bodyW*.74,-.21],
          ["Q",-bodyW*.40,-bodyH-.03,-.04,-bodyH],
          ["Q",.28,-bodyH+.02,.42,-.21],
          ["Q",.58,-.16,.80,-.05],
          ["Q",1.00,.04,.94,.14],
          ["Q",.80,.22,.60,.18],
          ["Q",.42,.18,.32,.32],
          ["Q",.16,.45,-.12,.43],
          ["Q",-.50,.41,-.80,.33],
          ["Q",-bodyW-.03,.26,-bodyW,.17],
          ["Z"]
        ]);

        leg(-.46,.22,.38,.08);
        leg(-.18,.22,.36,.08);
        leg(.24,.21,.38,.08);
        leg(.50,.21,.36,.08);

        ctx.fillStyle=fill;
        ctx.beginPath();
        ctx.ellipse(
          .57*r,-.27*r,
          head*r*1.08,head*.96*r,
          0,0,Math.PI*2
        );
        ctx.fill();
        ctx.stroke();

        muzzle(.84,-.18,.27,.13);
        eye(.66,-.38,.043);

      }else{
        path([
          ["M",-bodyW,.19],
          ["Q",-bodyW-.06,.00,-bodyW*.74,-.22],
          ["Q",-bodyW*.40,-bodyH+.01,-.02,-bodyH],
          ["Q",.28,-bodyH+.02,.40,-.22],
          ["Q",.58,-.18,.76,-.08],
          ["Q",.94,.00,.90,.12],
          ["Q",.78,.21,.58,.18],
          ["Q",.40,.19,.30,.33],
          ["Q",.12,.46,-.16,.44],
          ["Q",-.52,.42,-.82,.34],
          ["Q",-bodyW-.04,.27,-bodyW,.19],
          ["Z"]
        ]);

        leg(-.48,.23,.36,.085);
        leg(-.20,.23,.35,.085);
        leg(.24,.22,.36,.085);
        leg(.50,.22,.34,.085);

        ctx.fillStyle=fill;
        ctx.beginPath();
        ctx.ellipse(
          .57*r,-.29*r,
          head*r*1.10,head*r,
          0,0,Math.PI*2
        );
        ctx.fill();
        ctx.stroke();

        muzzle(.84,-.19,.27,.13);
        eye(.66,-.41,.043);
      }

      ctx.fillStyle=shade(fill,.78);
      ctx.beginPath();
      ctx.ellipse(
        -.16*r,.20*r,
        bodyW*.44*r,
        .12*r,
        0,0,Math.PI*2
      );
      ctx.fill();

      ctx.fillStyle=fill;
    };

    const smallMammal=({
      kind="rabbit",
      bodyW=.60,
      bodyH=.30,
      head=.24,
      legH=.34,
      legW=.055
    }={})=>{
      if(kind==="rabbit"){
        path([
          ["M",-bodyW,.18],
          ["Q",-bodyW-.04,-.02,-bodyW*.72,-.24],
          ["Q",-bodyW*.30,-bodyH-.08,.02,-bodyH],
          ["Q",.30,-bodyH+.01,.40,-.18],
          ["Q",.54,-.12,.76,-.04],
          ["Q",.94,.04,.88,.14],
          ["Q",.78,.21,.58,.18],
          ["Q",.42,.18,.34,.32],
          ["Q",.20,.46,-.06,.45],
          ["Q",-.42,.42,-bodyW,.18],
          ["Z"]
        ]);

        leg(-.34,.22,.46,.065);
        leg(.08,.20,.52,.075);
        leg(.38,.20,.48,.065);

        ctx.fillStyle=fill;
        ctx.beginPath();
        ctx.ellipse(
          .54*r,-.30*r,
          head*r,head*.82*r,
          0,0,Math.PI*2
        );
        ctx.fill();
        ctx.stroke();

        muzzle(.73,-.22,.15,.10);
        eye(.61,-.39,.040);

      }else if(kind==="squirrel"){
        path([
          ["M",-bodyW,.16],
          ["Q",-bodyW-.04,-.02,-bodyW*.72,-.22],
          ["Q",-bodyW*.32,-bodyH-.05,.02,-bodyH],
          ["Q",.25,-bodyH+.01,.38,-.14],
          ["Q",.52,-.08,.72,.02],
          ["Q",.86,.10,.80,.18],
          ["Q",.68,.23,.50,.18],
          ["Q",.38,.20,.30,.31],
          ["Q",.16,.42,-.08,.40],
          ["Q",-.42,.38,-bodyW,.16],
          ["Z"]
        ]);

        leg(-.36,.20,.39,.055);
        leg(-.08,.20,.37,.055);
        leg(.28,.20,.40,.055);
        leg(.48,.20,.36,.05);

        ctx.fillStyle=fill;
        ctx.beginPath();
        ctx.ellipse(
          .53*r,-.27*r,
          head*r,head*.82*r,
          0,0,Math.PI*2
        );
        ctx.fill();
        ctx.stroke();

        muzzle(.70,-.20,.14,.09);
        eye(.59,-.37,.038);

      }else{
        path([
          ["M",-bodyW,.15],
          ["Q",-bodyW-.03,-.02,-bodyW*.68,-.24],
          ["Q",-bodyW*.30,-bodyH-.04,.02,-bodyH],
          ["Q",.28,-bodyH+.02,.40,-.18],
          ["Q",.54,-.13,.72,-.02],
          ["Q",.88,.08,.82,.17],
          ["Q",.70,.23,.52,.18],
          ["Q",.38,.20,.28,.32],
          ["Q",.12,.46,-.10,.42],
          ["Q",-.44,.38,-bodyW,.15],
          ["Z"]
        ]);

        leg(-.34,.20,.44,.065);
        leg(-.08,.20,.46,.065);
        leg(.28,.20,.50,.065);
        leg(.48,.20,.43,.06);

        ctx.fillStyle=fill;
        ctx.beginPath();
        ctx.ellipse(
          .54*r,-.29*r,
          head*r,head*.86*r,
          0,0,Math.PI*2
        );
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle=light;
        ctx.beginPath();
        ctx.ellipse(
          .72*r,-.23*r,
          .17*r,.12*r,
          0,0,Math.PI*2
        );
        ctx.fill();

        eye(.60,-.39,.040);

        tailCurve([
          [-.38,.16,-.72,.00],
          [-.72,.00,-.84,-.34],
          [-.84,-.34,-.62,-.60]
        ],.065);
      }

      ctx.fillStyle=shade(fill,.76);
      ctx.beginPath();
      ctx.ellipse(
        -.02*r,
        .20*r,
        bodyW*.42*r,
        .10*r,
        0,0,Math.PI*2
      );
      ctx.fill();

      ctx.fillStyle=fill;
    };

    const large=({
      kind="standard",
      bodyW=.78,
      bodyH=.40,
      head=.30,
      legH=.58,
      legW=.075,
      muzzleW=.21
    }={})=>{
      if(kind==="horse"||kind==="pack"){
        path([
          ["M",-bodyW,.10],
          ["Q",-bodyW-.03,-.10,-bodyW*.68,-.31],
          ["Q",-bodyW*.30,-bodyH-.10,.08,-bodyH],
          ["Q",.34,-bodyH+.01,.44,-.58],
          ["Q",.50,-.42,.58,-.29],
          ["Q",.72,-.24,.88,-.14],
          ["Q",1.05,-.06,1.00,.04],
          ["Q",.92,.14,.72,.12],
          ["Q",.56,.13,.48,.27],
          ["Q",.38,.43,.10,.44],
          ["Q",-.28,.45,-.66,.36],
          ["Q",-bodyW*.92,.30,-bodyW,.10],
          ["Z"]
        ]);
      }else if(kind==="deer"){
        path([
          ["M",-bodyW,.10],
          ["Q",-bodyW-.02,-.06,-bodyW*.64,-.29],
          ["Q",-bodyW*.25,-bodyH-.11,.10,-bodyH],
          ["Q",.34,-bodyH+.03,.46,-.68],
          ["Q",.50,-.52,.55,-.36],
          ["Q",.66,-.29,.82,-.17],
          ["Q",1.00,-.08,.98,.03],
          ["Q",.90,.12,.70,.10],
          ["Q",.54,.11,.45,.25],
          ["Q",.36,.40,.08,.42],
          ["Q",- .30,.43,-.62,.35],
          ["Q",-bodyW*.90,.29,-bodyW,.10],
          ["Z"]
        ]);
      }else if(kind==="ox"){
        path([
          ["M",-bodyW,.14],
          ["Q",-bodyW-.04,-.02,-bodyW*.74,-.28],
          ["Q",-bodyW*.42,-bodyH-.02,-.02,-bodyH],
          ["Q",.20,-bodyH+.02,.34,-.48],
          ["Q",.40,-.37,.49,-.26],
          ["Q",.64,-.20,.84,-.12],
          ["Q",1.02,-.04,.98,.08],
          ["Q",.90,.16,.68,.15],
          ["Q",.52,.17,.45,.29],
          ["Q",.36,.43,.06,.45],
          ["Q",- .40,.47,-.72,.39],
          ["Q",-bodyW*.94,.32,-bodyW,.14],
          ["Z"]
        ]);
      }else if(kind==="camel"){
        path([
          ["M",-bodyW,.12],
          ["Q",-bodyW-.03,-.08,-bodyW*.66,-.31],
          ["Q",-bodyW*.30,-bodyH-.12,.04,-bodyH],
          ["Q",.30,-bodyH+.02,.40,-.74],
          ["Q",.46,-.80,.54,-.64],
          ["Q",.59,-.43,.62,-.18],
          ["Q",.70,-.18,.86,-.11],
          ["Q",1.04,-.03,1.00,.08],
          ["Q",.92,.17,.70,.15],
          ["Q",.53,.18,.43,.31],
          ["Q",.34,.45,.04,.46],
          ["Q",- .34,.47,-.66,.38],
          ["Q",-bodyW*.92,.31,-bodyW,.12],
          ["Z"]
        ]);
      }else if(kind==="alpaca"){
        path([
          ["M",-bodyW,.12],
          ["Q",-bodyW-.03,-.08,-bodyW*.69,-.31],
          ["Q",-bodyW*.34,-bodyH-.10,.03,-bodyH],
          ["Q",.28,-bodyH+.02,.38,-.66],
          ["Q",.44,-.74,.54,-.58],
          ["Q",.58,-.40,.61,-.25],
          ["Q",.70,-.21,.86,-.14],
          ["Q",1.03,-.06,.98,.06],
          ["Q",.90,.15,.68,.14],
          ["Q",.50,.16,.42,.30],
          ["Q",.31,.46,.02,.47],
          ["Q",- .34,.47,-.67,.38],
          ["Q",-bodyW*.91,.31,-bodyW,.12],
          ["Z"]
        ]);
      }else if(kind==="goat"){
        path([
          ["M",-bodyW,.13],
          ["Q",-bodyW-.03,-.04,-bodyW*.68,-.26],
          ["Q",-bodyW*.34,-bodyH-.06,.02,-bodyH],
          ["Q",.28,-bodyH+.03,.38,-.58],
          ["Q",.44,-.46,.50,-.30],
          ["Q",.61,-.23,.80,-.15],
          ["Q",.98,-.06,.96,.04],
          ["Q",.88,.13,.68,.12],
          ["Q",.53,.14,.44,.28],
          ["Q",.34,.42,.05,.44],
          ["Q",- .30,.45,-.63,.37],
          ["Q",-bodyW*.90,.30,-bodyW,.13],
          ["Z"]
        ]);
      }else if(kind==="boar"){
        path([
          ["M",-bodyW,.16],
          ["Q",-bodyW-.05,-.02,-bodyW*.76,-.22],
          ["Q",-bodyW*.38,-bodyH+.02,-.02,-bodyH],
          ["Q",.28,-bodyH+.01,.40,-.34],
          ["Q",.48,-.25,.58,-.20],
          ["Q",.76,-.16,.94,-.06],
          ["Q",1.08,.02,1.00,.12],
          ["Q",.88,.19,.68,.17],
          ["Q",.50,.19,.40,.32],
          ["Q",.25,.44,-.06,.45],
          ["Q",- .46,.44,-.76,.35],
          ["Q",-bodyW*.94,.28,-bodyW,.16],
          ["Z"]
        ]);
      }else if(kind==="capybara"){
        path([
          ["M",-bodyW,.18],
          ["Q",-bodyW-.06,.00,-bodyW*.78,-.20],
          ["Q",-bodyW*.44,-bodyH+.02,-.04,-bodyH],
          ["Q",.24,-bodyH+.03,.40,-.22],
          ["Q",.52,-.18,.64,-.12],
          ["Q",.82,-.08,.98,.02],
          ["Q",1.08,.10,.98,.17],
          ["Q",.82,.23,.64,.20],
          ["Q",.48,.21,.38,.32],
          ["Q",.22,.43,-.10,.43],
          ["Q",- .48,.42,-.80,.34],
          ["Q",-bodyW*.95,.28,-bodyW,.18],
          ["Z"]
        ]);
      }else if(kind==="sheep"){
        path([
          ["M",-bodyW,.16],
          ["Q",-bodyW-.04,.00,-bodyW*.70,-.22],
          ["Q",-bodyW*.40,-bodyH-.03,.00,-bodyH],
          ["Q",.28,-bodyH,.38,-.42],
          ["Q",.48,-.28,.56,-.20],
          ["Q",.70,-.17,.88,-.08],
          ["Q",1.02,.00,.96,.10],
          ["Q",.86,.18,.67,.16],
          ["Q",.50,.19,.42,.31],
          ["Q",.33,.45,.04,.46],
          ["Q",- .34,.48,-.67,.40],
          ["Q",-bodyW*.92,.33,-bodyW,.16],
          ["Z"]
        ]);
      }else{
        path([
          ["M",-bodyW,.13],
          ["Q",-bodyW-.03,-.08,-bodyW*.70,-.29],
          ["Q",-bodyW*.32,-bodyH-.08,.06,-bodyH],
          ["Q",.34,-bodyH+.01,.45,-.57],
          ["Q",.50,-.40,.56,-.30],
          ["Q",.67,-.24,.86,-.17],
          ["Q",1.05,-.08,1.00,.04],
          ["Q",.94,.13,.74,.12],
          ["Q",.58,.12,.49,.26],
          ["Q",.42,.43,.12,.46],
          ["Q",- .30,.47,-.65,.38],
          ["Q",-bodyW*.90,.32,-bodyW,.13],
          ["Z"]
        ]);
      }

      fourLeg(
        kind==="ox"||kind==="sheep" ? .42 : .45,
        kind==="ox"||kind==="sheep" ? -.50 : -.52,
        .18,
        legH,
        legW
      );

      ctx.fillStyle=fill;

      ctx.beginPath();
      ctx.ellipse(
        kind==="horse"||kind==="pack" ? .60 :
        kind==="deer" ? .63 :
        kind==="ox" ? .55 :
        kind==="camel" ? .61 :
        kind==="alpaca" ? .61 :
        kind==="goat" ? .58 :
        kind==="sheep" ? .57 :
        .58,
        kind==="horse"||kind==="pack" ? -.38 :
        kind==="deer" ? -.44 :
        kind==="ox" ? -.31 :
        kind==="camel" ? -.44 :
        kind==="alpaca" ? -.43 :
        kind==="goat" ? -.36 :
        kind==="sheep" ? -.31 :
        -.36,
        head*r,
        head*.78*r,
        0,
        0,
        Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      muzzle(
        kind==="ox" ? .79 :
        kind==="camel" ? .84 :
        kind==="sheep" ? .79 :
        .82,
        kind==="horse"||kind==="pack" ? -.23 :
        kind==="deer" ? -.25 :
        kind==="ox" ? -.16 :
        kind==="camel" ? -.22 :
        kind==="alpaca" ? -.24 :
        kind==="goat" ? -.20 :
        kind==="sheep" ? -.18 :
        -.22,
        muzzleW,
        kind==="ox" ? .15 :
        kind==="sheep" ? .14 :
        .13
      );

      eye(
        kind==="horse"||kind==="pack" ? .67 :
        kind==="deer" ? .71 :
        kind==="ox" ? .63 :
        kind==="camel" ? .69 :
        kind==="alpaca" ? .68 :
        kind==="goat" ? .65 :
        kind==="sheep" ? .64 :
        .66,
        kind==="horse"||kind==="pack" ? -.45 :
        kind==="deer" ? -.51 :
        kind==="ox" ? -.38 :
        kind==="camel" ? -.51 :
        kind==="alpaca" ? -.50 :
        kind==="goat" ? -.43 :
        kind==="sheep" ? -.40 :
        -.43,
        .044
      );

      ctx.strokeStyle=light;
      ctx.lineWidth=Math.max(.8,r*.02);
      ctx.beginPath();
      ctx.moveTo(-.35*r,-.28*r);
      ctx.quadraticCurveTo(
        .02*r,-.42*r,
        .30*r,-.25*r
      );
      ctx.stroke();
    };

    const bird=({
      kind="bird",
      bodyW=.55,
      bodyH=.48,
      head=.25,
      beak=.38,
      belly=.50
    }={})=>{
      path([
        ["M",-bodyW,.18],
        ["Q",-bodyW-.05,-.12,-bodyW*.60,-.43],
        ["Q",-bodyW*.18,-bodyH-.04,.22,-bodyH],
        ["Q",.45,-bodyH*.76,.47,-.42],
        ["Q",.58,-.25,.72,-.16],
        ["L",beak,-.11],
        ["L",.73,.01],
        ["Q",.52,.07,.45,.25],
        ["Q",.30,.48,-.02,.48],
        ["Q",-.40,.46,-bodyW,.18],
        ["Z"]
      ]);

      ctx.fillStyle=shade(fill,.86);
      ctx.beginPath();
      ctx.ellipse(
        -.02*r,
        .08*r,
        .43*r,
        belly*r,
        -.12,
        0,
        Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle=fill;
      ctx.beginPath();
      ctx.ellipse(
        .38*r,
        -.43*r,
        head*r,
        head*.88*r,
        0,
        0,
        Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle=shade(fill,.72);
      ctx.beginPath();
      ctx.moveTo(-.08*r,-.12*r);
      ctx.quadraticCurveTo(
        -.58*r,-.05*r,
        -.60*r,.28*r
      );
      ctx.quadraticCurveTo(
        -.25*r,.20*r,
        .16*r,.02*r
      );
      ctx.closePath();
      ctx.fill();

      eye(
        .43,
        -.50,
        .040
      );

      /*
       * Species-specific bird silhouette.
       * These are structural features, not color-only decoration:
       * wing profile, tail fan, crest and head contour are changed
       * according to the actual species.
       */
      ctx.fillStyle=shade(fill,.62);
      ctx.strokeStyle=stroke;
      ctx.lineWidth=Math.max(.8,r*.035);

      if(kind==="bird"){
        /* Falcon: narrow swept wings and pointed tail. */
        ctx.beginPath();
        ctx.moveTo(-.12*r,-.10*r);
        ctx.quadraticCurveTo(
          -.72*r,-.62*r,
          -1.00*r,-.18*r
        );
        ctx.quadraticCurveTo(
          -.70*r,-.02*r,
          -.30*r,.10*r
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-.30*r,.24*r);
        ctx.lineTo(-.82*r,.50*r);
        ctx.lineTo(-.58*r,.12*r);
        ctx.lineTo(-.12*r,.28*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

      }else if(kind==="eagle"){
        /* Eagle: broad primary feathers and heavier head/neck. */
        ctx.beginPath();
        ctx.moveTo(-.08*r,-.06*r);
        ctx.quadraticCurveTo(
          -.78*r,-.78*r,
          -1.12*r,-.16*r
        );
        ctx.quadraticCurveTo(
          -.86*r,.08*r,
          -.28*r,.18*r
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-.38*r,.25*r);
        ctx.lineTo(-.94*r,.58*r);
        ctx.lineTo(-.62*r,.10*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle=shade(fill,.48);
        ctx.beginPath();
        ctx.arc(
          .48*r,-.48*r,
          .09*r,
          0,Math.PI*2
        );
        ctx.fill();

      }else if(kind==="kite"){
        /* Kite: long swept wing and forked tail. */
        ctx.beginPath();
        ctx.moveTo(-.10*r,-.08*r);
        ctx.quadraticCurveTo(
          -.82*r,-.68*r,
          -1.12*r,-.08*r
        );
        ctx.quadraticCurveTo(
          -.76*r,.04*r,
          -.18*r,.20*r
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-.18*r,.20*r);
        ctx.lineTo(-.92*r,.62*r);
        ctx.lineTo(-.58*r,.18*r);
        ctx.lineTo(-.82*r,.62*r);
        ctx.lineTo(-.08*r,.28*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

      }else if(kind==="crow"){
        /* Crow: compact body, rounded wing and heavy black beak. */
        ctx.beginPath();
        ctx.moveTo(-.16*r,-.08*r);
        ctx.quadraticCurveTo(
          -.62*r,-.52*r,
          -.82*r,-.02*r
        );
        ctx.quadraticCurveTo(
          -.62*r,.22*r,
          -.18*r,.20*r
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle="#25272a";
        ctx.beginPath();
        ctx.moveTo(.56*r,-.48*r);
        ctx.lineTo(1.12*r,-.34*r);
        ctx.lineTo(.58*r,-.22*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

      }else if(kind==="cormorant"){
        /* Cormorant: long neck, long bill and narrow swept wing. */
        ctx.beginPath();
        ctx.moveTo(.18*r,-.30*r);
        ctx.quadraticCurveTo(
          .26*r,-.78*r,
          .48*r,-.88*r
        );
        ctx.quadraticCurveTo(
          .68*r,-.84*r,
          .64*r,-.42*r
        );
        ctx.lineTo(.58*r,-.14*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(.54*r,-.64*r);
        ctx.lineTo(1.28*r,-.52*r);
        ctx.lineTo(.60*r,-.40*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

      }else if(kind==="owl"){
        /* Owl: broad rounded wing and facial ear tufts. */
        ctx.beginPath();
        ctx.moveTo(-.18*r,-.04*r);
        ctx.quadraticCurveTo(
          -.66*r,-.48*r,
          -.72*r,.12*r
        );
        ctx.quadraticCurveTo(
          -.48*r,.28*r,
          -.12*r,.22*r
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(.18*r,-.56*r);
        ctx.lineTo(.30*r,-.82*r);
        ctx.lineTo(.42*r,-.58*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

      }else if(kind==="penguin"){
        /* Penguin: short flippers and upright body. */
        ctx.beginPath();
        ctx.moveTo(-.20*r,-.04*r);
        ctx.quadraticCurveTo(
          -.64*r,.10*r,
          -.58*r,.42*r
        );
        ctx.quadraticCurveTo(
          -.34*r,.34*r,
          -.12*r,.16*r
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle=shade(fill,.48);
        ctx.beginPath();
        ctx.arc(
          .34*r,-.48*r,
          .035*r,
          0,Math.PI*2
        );
        ctx.fill();
      }

      ctx.fillStyle=fill;
      ctx.strokeStyle=stroke;
    };

    if([
      "hound","dog","golden"
    ].includes(k)){
      canine({
        bodyW:k==="golden"?.82:.78,
        bodyH:k==="hound"?.42:.39,
        head:k==="hound"?.29:.28,
        muzzleW:k==="hound"?.25:.22,
        legH:k==="hound"?.43:.40
      });
    }else if(k==="wolf"){
      canine({
        bodyW:.80,
        bodyH:.43,
        head:.31,
        muzzleW:.25,
        muzzleH:.15,
        legH:.45
      });
    }else if(k==="fox"){
      canine({
        bodyW:.67,
        bodyH:.34,
        head:.27,
        muzzleW:.27,
        muzzleH:.12,
        legH:.45,
        legW:.055
      });
    }else if(k==="weasel"){
      midMammal({
        kind:"weasel",
        bodyW:.72,
        bodyH:.30,
        head:.23,
        legH:.28,
        legW:.05,
        muzzleW:.21
      });
    }else if(k==="otter"){
      midMammal({
        kind:"otter",
        bodyW:.86,
        bodyH:.30,
        head:.24,
        legH:.30,
        legW:.065,
        muzzleW:.24
      });
    }else if(k==="raccoon"){
      midMammal({
        kind:"raccoon",
        bodyW:.78,
        bodyH:.40,
        head:.29,
        legH:.37,
        legW:.075,
        muzzleW:.24
      });
    }else if(k==="raccoonDog"){
      midMammal({
        kind:"raccoonDog",
        bodyW:.80,
        bodyH:.42,
        head:.30,
        legH:.38,
        legW:.08,
        muzzleW:.26
      });
    }else if(k==="badger"){
      midMammal({
        kind:"badger",
        bodyW:.84,
        bodyH:.45,
        head:.31,
        legH:.36,
        legW:.085,
        muzzleW:.27
      });
    }else if(k==="bear"){
      large({
        bodyW:.86,
        bodyH:.49,
        head:.35,
        legH:.34,
        legW:.11,
        muzzleW:.25
      });

      ctx.fillStyle=shade(fill,.58);
      ctx.beginPath();
      ctx.ellipse(
        .55*r,-.26*r,
        .20*r,.15*r,
        0,0,Math.PI*2
      );
      ctx.fill();

      ctx.fillStyle=light;
      ctx.beginPath();
      ctx.ellipse(
        .70*r,-.20*r,
        .13*r,.10*r,
        0,0,Math.PI*2
      );
      ctx.fill();

      ctx.fillStyle=fill;
    }else if([
      "tiger","leopard","cat","lynx"
    ].includes(k)){
      feline({
        bodyW:k==="tiger"?.76:k==="cat"?.62:.70,
        bodyH:k==="tiger"?.44:.38,
        head:k==="tiger"?.31:.27,
        legH:k==="tiger"?.43:.40
      });
    }else if(k==="pack"){
      large({
        kind:"pack",
        bodyW:.74,
        bodyH:.42,
        head:.30,
        legH:.58,
        legW:.065,
        muzzleW:.24
      });

      ctx.fillStyle=shade(fill,.76);
      ctx.beginPath();
      ctx.moveTo(-.35*r,-.34*r);
      ctx.quadraticCurveTo(
        -.02*r,-.55*r,
        .28*r,-.37*r
      );
      ctx.lineTo(.22*r,-.18*r);
      ctx.quadraticCurveTo(
        -.08*r,-.28*r,
        -.30*r,-.18*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle=fill;
    }else if(k==="horse"){
      large({
        kind:"horse",
        bodyW:.84,
        bodyH:.38,
        head:.28,
        legH:.67,
        legW:.055,
        muzzleW:.23
      });
    }else if(k==="deer"){
      large({
        kind:"deer",
        bodyW:.70,
        bodyH:.32,
        head:.25,
        legH:.70,
        legW:.045,
        muzzleW:.20
      });
    }else if(k==="camel"){
      large({
        kind:"camel",
        bodyW:.86,
        bodyH:.43,
        head:.28,
        legH:.62,
        legW:.06,
        muzzleW:.22
      });

      ctx.fillStyle=shade(fill,.88);
      ctx.beginPath();
      ctx.ellipse(
        -.22*r,-.48*r,
        .18*r,.20*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        .16*r,-.45*r,
        .18*r,.20*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();
    }else if(k==="ox"){
      large({
        kind:"ox",
        bodyW:.86,
        bodyH:.48,
        head:.33,
        legH:.36,
        legW:.10,
        muzzleW:.25
      });
    }else if(k==="boar"){
      large({
        kind:"boar",
        bodyW:.88,
        bodyH:.47,
        head:.31,
        legH:.31,
        legW:.105,
        muzzleW:.30
      });

      ctx.fillStyle=shade(fill,.48);
      ctx.beginPath();
      ctx.moveTo(-.72*r,-.28*r);
      ctx.lineTo(-.58*r,-.55*r);
      ctx.lineTo(-.46*r,-.34*r);
      ctx.lineTo(-.30*r,-.57*r);
      ctx.lineTo(-.14*r,-.30*r);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle=fill;
    }else if(k==="capybara"){
      large({
        kind:"capybara",
        bodyW:.90,
        bodyH:.42,
        head:.31,
        legH:.29,
        legW:.095,
        muzzleW:.28
      });

      ctx.fillStyle=shade(fill,.84);
      ctx.beginPath();
      ctx.ellipse(
        -.02*r,.22*r,
        .55*r,.16*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.fillStyle=fill;
    }else if([
      "alpaca","goat","sheep"
    ].includes(k)){
      large({
        kind: k==="alpaca" ? "alpaca" :
              k==="goat" ? "goat" :
              "sheep",
        bodyW:.76,
        bodyH:.38,
        head:.26,
        legH:.56,
        legW:.055,
        muzzleW:.20
      });

      ctx.fillStyle=light;
      for(let i=0;i<5;i++){
        ctx.beginPath();
        ctx.arc(
          (-.35+i*.18)*r,
          (-.22+(i%2)*.13)*r,
          .12*r,
          0,
          Math.PI*2
        );
        ctx.fill();
      }
    }else if(k==="rabbit"){
      smallMammal({
        kind:"rabbit",
        bodyW:.57,
        bodyH:.30,
        head:.23,
        legH:.38,
        legW:.055
      });
    }else if(k==="squirrel"){
      smallMammal({
        kind:"squirrel",
        bodyW:.60,
        bodyH:.27,
        head:.22,
        legH:.35,
        legW:.05
      });
    }else if(k==="monkey"){
      smallMammal({
        kind:"monkey",
        bodyW:.63,
        bodyH:.34,
        head:.25,
        legH:.44,
        legW:.055
      });
    }else if([
      "bird","eagle","owl","crow","kite","cormorant","penguin"
    ].includes(k)){
      bird({
        kind:k,
        bodyW:
          k==="eagle" ? .68 :
          k==="cormorant" ? .60 :
          k==="owl" ? .54 :
          k==="kite" ? .54 :
          k==="crow" ? .56 :
          .57,
        bodyH:
          k==="penguin" ? .58 :
          k==="cormorant" ? .56 :
          k==="owl" ? .54 :
          k==="eagle" ? .50 :
          .48,
        head:
          k==="owl" ? .30 :
          k==="eagle" ? .27 :
          k==="cormorant" ? .25 :
          .24,
        beak:
          k==="eagle" || k==="cormorant" ? 1.18 :
          k==="crow" ? 1.04 :
          k==="kite" ? 1.12 :
          .98,
        belly:
          k==="penguin" ? .58 :
          k==="cormorant" ? .52 :
          .48
      });

      if(k==="eagle"){
        ctx.fillStyle=shade(fill,.58);
        ctx.beginPath();
        ctx.moveTo(-.08*r,-.12*r);
        ctx.quadraticCurveTo(
          -.82*r,-.62*r,
          -1.04*r,-.12*r
        );
        ctx.quadraticCurveTo(
          -.72*r,.16*r,
          -.18*r,.18*r
        );
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle=fill;
        ctx.beginPath();
        ctx.moveTo(.62*r,-.18*r);
        ctx.quadraticCurveTo(
          .84*r,-.34*r,
          1.04*r,-.28*r
        );
        ctx.quadraticCurveTo(
          .88*r,-.06*r,
          .66*r,.02*r
        );
        ctx.closePath();
        ctx.fill();
      }else if(k==="kite"){
        ctx.fillStyle=shade(fill,.58);
        ctx.beginPath();
        ctx.moveTo(-.12*r,-.05*r);
        ctx.quadraticCurveTo(
          -.86*r,-.68*r,
          -1.12*r,-.10*r
        );
        ctx.quadraticCurveTo(
          -.78*r,.14*r,
          -.20*r,.20*r
        );
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle=fill;
        ctx.beginPath();
        ctx.moveTo(-.42*r,.28*r);
        ctx.lineTo(-.92*r,.46*r);
        ctx.lineTo(-.60*r,.08*r);
        ctx.lineTo(-.30*r,.30*r);
        ctx.closePath();
        ctx.fill();
      }else if(k==="crow"){
        ctx.fillStyle=shade(fill,.55);
        ctx.beginPath();
        ctx.ellipse(
          .46*r,-.44*r,
          .27*r,.22*r,
          0,0,Math.PI*2
        );
        ctx.fill();

        ctx.fillStyle=fill;
        ctx.beginPath();
        ctx.moveTo(.57*r,-.42*r);
        ctx.lineTo(1.10*r,-.30*r);
        ctx.lineTo(.60*r,-.22*r);
        ctx.closePath();
        ctx.fill();
      }else if(k==="cormorant"){
        ctx.fillStyle=shade(fill,.62);
        ctx.beginPath();
        ctx.moveTo(.16*r,-.36*r);
        ctx.quadraticCurveTo(
          .36*r,-.72*r,
          .48*r,-.82*r
        );
        ctx.quadraticCurveTo(
          .62*r,-.86*r,
          .66*r,-.64*r
        );
        ctx.lineTo(.60*r,-.20*r);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle=fill;
        ctx.beginPath();
        ctx.moveTo(.58*r,-.62*r);
        ctx.lineTo(1.26*r,-.50*r);
        ctx.lineTo(.62*r,-.40*r);
        ctx.closePath();
        ctx.fill();
      }

      if(k==="owl"){
        ctx.strokeStyle=light;
        ctx.lineWidth=Math.max(.8,r*.025);

        for(const side of [-1,1]){
          ctx.beginPath();
          ctx.arc(
            (.29+side*.12)*r,
            -.42*r,
            .12*r,
            0,
            Math.PI*2
          );
          ctx.stroke();
        }
      }

      if(k==="penguin"){
        ctx.fillStyle="rgba(248,242,226,.82)";
        ctx.beginPath();
        ctx.ellipse(
          .05*r,.12*r,
          .31*r,.39*r,
          0,0,Math.PI*2
        );
        ctx.fill();
      }
    }else if(k==="bat"){
      ctx.beginPath();
      ctx.moveTo(-.16*r,-.12*r);
      ctx.quadraticCurveTo(
        -.72*r,-.78*r,
        -1.10*r,-.48*r
      );
      ctx.quadraticCurveTo(
        -.92*r,-.05*r,
        -.60*r,.30*r
      );
      ctx.lineTo(0,.42*r);
      ctx.lineTo(.60*r,.30*r);
      ctx.quadraticCurveTo(
        .92*r,-.05*r,
        1.10*r,-.48*r
      );
      ctx.quadraticCurveTo(
        .72*r,-.78*r,
        .16*r,-.12*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle=fill;
      ctx.beginPath();
      ctx.ellipse(
        0,-.10*r,
        .25*r,.37*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      eye(-.08,-.18,.035);
      eye(.08,-.18,.035);
    }else if(k==="snake"){
      ctx.strokeStyle=fill;
      ctx.lineWidth=Math.max(3,r*.22);
      ctx.beginPath();

      for(let i=0;i<=18;i++){
        const xx=-.95+i*.105;
        const yy=
          Math.sin(
            phase+i*.55
          )*.22;
        if(i===0)ctx.moveTo(xx*r,yy*r);
        else ctx.lineTo(xx*r,yy*r);
      }

      ctx.stroke();

      ctx.strokeStyle=stroke;
      ctx.lineWidth=Math.max(1,r*.045);
      ctx.stroke();

      ctx.fillStyle=fill;
      ctx.beginPath();
      ctx.ellipse(
        1.00*r,0,
        .22*r,.16*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      eye(1.06,-.07,.028);
      eye(1.06,.07,.028);
    }else if(k==="spider"){
      ctx.fillStyle=fill;

      ctx.beginPath();
      ctx.ellipse(
        -.22*r,.08*r,
        .40*r,.32*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(
        .30*r,-.02*r,
        .27*r,.22*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle=stroke;
      ctx.lineWidth=Math.max(1,r*.055);

      for(let i=0;i<4;i++){
        const yy=(-.34+i*.22)*r;

        ctx.beginPath();
        ctx.moveTo(-.10*r,yy);
        ctx.quadraticCurveTo(
          -.72*r,
          yy-.18*r,
          -1.02*r,
          yy+.24*r
        );
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(.10*r,yy);
        ctx.quadraticCurveTo(
          .72*r,
          yy-.18*r,
          1.02*r,
          yy+.24*r
        );
        ctx.stroke();
      }
    }else if(k==="turtle"){
      ctx.fillStyle=shade(fill,.70);

      ctx.beginPath();
      ctx.ellipse(
        -.04*r,.02*r,
        .72*r,.48*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle=fill;

      ctx.beginPath();
      ctx.ellipse(
        .68*r,-.04*r,
        .22*r,.17*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      for(const side of [-1,1]){
        for(const y of [-.22,.22]){
          ctx.beginPath();
          ctx.ellipse(
            side*.52*r,
            y*r,
            .18*r,
            .10*r,
            side*.3,
            0,
            Math.PI*2
          );
          ctx.fill();
          ctx.stroke();
        }
      }

      ctx.strokeStyle=light;
      ctx.lineWidth=Math.max(.7,r*.025);

      for(const xx of [-.30,0,.30]){
        ctx.beginPath();
        ctx.moveTo(
          xx*r,-.38*r
        );
        ctx.lineTo(
          xx*r,.38*r
        );
        ctx.stroke();
      }
    }else if(k==="crocodile"){
      path([
        ["M",-1.00,.08],
        ["Q",-1.04,-.18,-.72,-.28],
        ["Q",-.30,-.42,.25,-.30],
        ["L",.82,-.25],
        ["L",1.12,-.10],
        ["L",.98,.04],
        ["L",.62,.08],
        ["Q",.28,.36,-.25,.32],
        ["Q",-.72,.29,-1.00,.08],
        ["Z"]
      ]);

      ctx.fillStyle=shade(fill,.70);

      for(let i=0;i<7;i++){
        ctx.beginPath();
        ctx.moveTo(
          (-.55+i*.20)*r,
          (-.30-Math.abs(Math.sin(i))*.07)*r
        );
        ctx.lineTo(
          (-.45+i*.20)*r,
          (-.46-Math.abs(Math.sin(i))* .08)*r
        );
        ctx.lineTo(
          (-.35+i*.20)*r,
          (-.30-Math.abs(Math.sin(i))* .07)*r
        );
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle=fill;
      ctx.beginPath();
      ctx.ellipse(
        .92*r,-.14*r,
        .22*r,.13*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      eye(.98,-.19,.028);
    }else{
      canine();
    }

    ctx.restore();
  }


  /*
   * Species-specific surface identity for the anatomical renderer.
   * Body geometry is the primary silhouette; this layer supplies the
   * high-value visual identifiers that must survive at mobile scale.
   */
  function drawAnatomicalSurface(
    ctx,
    r,
    key,
    base,
    light,
    lod
  ){
    const k=String(key||"");
    const fill=base;
    const stroke=light;
    const dark=shade(base,.48);
    const deep=shade(base,.32);

    ctx.save();
    ctx.lineCap="round";
    ctx.lineJoin="round";

    const stripe=(x1,y1,x2,y2,w=.035)=>{
      ctx.strokeStyle=dark;
      ctx.lineWidth=Math.max(.8,r*w);
      ctx.beginPath();
      ctx.moveTo(x1*r,y1*r);
      ctx.quadraticCurveTo(
        ((x1+x2)/2)*r,
        ((y1+y2)/2-.05)*r,
        x2*r,y2*r
      );
      ctx.stroke();
    };

    const spot=(x,y,size)=>{
      ctx.fillStyle=dark;
      ctx.beginPath();
      ctx.ellipse(
        x*r,y*r,
        size*r,
        size*.72*r,
        .2,
        0,
        Math.PI*2
      );
      ctx.fill();
    };

    if(k==="tiger"){
      for(const v of [
        [-.50,-.25,-.28,.00],
        [-.42,-.05,-.22,.16],
        [-.34,.14,-.12,.28],
        [-.10,-.30,.08,-.04],
        [.02,-.18,.20,.02],
        [.12,-.04,.30,.10]
      ]){
        stripe(...v,.045);
      }
    }else if(k==="leopard"){
      for(const v of [
        [-.52,-.16,.05,-.08],
        [-.44,.08,-.12,.18],
        [-.18,-.22,.18,-.18],
        [-.10,.10,.30,.16],
        [.16,-.08,.42,.00]
      ]){
        spot(...v.slice(0,2),.055);
        if(lod>=2)spot(v[2],v[3],.035);
      }
    }else if(k==="wolf"){
      ctx.fillStyle="rgba(246,242,230,.55)";
      ctx.beginPath();
      ctx.moveTo(-.46*r,-.12*r);
      ctx.quadraticCurveTo(
        -.20*r,.02*r,
        .16*r,.26*r
      );
      ctx.quadraticCurveTo(
        .05*r,.04*r,
        -.02*r,-.20*r
      );
      ctx.closePath();
      ctx.fill();
    }else if(
      k==="hound"||
      k==="dog"||
      k==="golden"
    ){
      ctx.fillStyle="rgba(248,239,220,.52)";
      ctx.beginPath();
      ctx.moveTo(-.18*r,-.30*r);
      ctx.quadraticCurveTo(
        -.02*r,-.04*r,
        .20*r,.28*r
      );
      ctx.quadraticCurveTo(
        .30*r,.18*r,
        .34*r,.02*r
      );
      ctx.quadraticCurveTo(
        .04*r,-.10*r,
        -.18*r,-.30*r
      );
      ctx.closePath();
      ctx.fill();

      if(k==="hound"){
        stripe(.36,-.42,.52,-.22,.032);
      }
    }else if(k==="fox"){
      ctx.fillStyle="rgba(252,242,224,.78)";
      ctx.beginPath();
      ctx.moveTo(.48*r,-.28*r);
      ctx.quadraticCurveTo(
        .70*r,-.12*r,
        .92*r,-.10*r
      );
      ctx.quadraticCurveTo(
        .70*r,.00*r,
        .44*r,.14*r
      );
      ctx.closePath();
      ctx.fill();
    }else if(
      k==="raccoon"||
      k==="raccoonDog"
    ){
      ctx.fillStyle="rgba(35,32,30,.62)";
      ctx.beginPath();
      ctx.ellipse(
        .62*r,-.38*r,
        .20*r,.11*r,
        0,0,Math.PI*2
      );
      ctx.fill();

      ctx.fillStyle=light;
      ctx.beginPath();
      ctx.arc(
        .62*r,-.39*r,
        .045*r,
        0,Math.PI*2
      );
      ctx.fill();

      for(const x of [-.52,-.38,-.24]){
        stripe(x,.24,x+.08,.40,.025);
      }
    }else if(k==="badger"){
      ctx.fillStyle="rgba(245,240,226,.58)";
      ctx.beginPath();
      ctx.moveTo(.48*r,-.58*r);
      ctx.quadraticCurveTo(
        .60*r,-.25*r,
        .72*r,.00*r
      );
      ctx.lineTo(.82*r,-.02*r);
      ctx.quadraticCurveTo(
        .68*r,-.34*r,
        .60*r,-.60*r
      );
      ctx.closePath();
      ctx.fill();
    }else if(k==="deer"){
      for(const x of [-.48,-.28,-.08,.12]){
        spot(x,.00,.028);
        if(lod>=2)spot(x+.05,.13,.024);
      }
    }else if(k==="boar"){
      ctx.fillStyle=deep;
      ctx.beginPath();
      ctx.ellipse(
        .76*r,-.18*r,
        .23*r,.14*r,
        0,0,Math.PI*2
      );
      ctx.fill();
    }else if(k==="goat"){
      stripe(.44,-.30,.58,-.08,.025);
      stripe(.50,-.18,.66,-.02,.025);
    }else if(k==="ox"){
      ctx.fillStyle="rgba(248,242,226,.34)";
      ctx.beginPath();
      ctx.ellipse(
        -.22*r,.18*r,
        .28*r,.20*r,
        0,0,Math.PI*2
      );
      ctx.fill();
    }else if(k==="horse"||k==="pack"){
      ctx.fillStyle=dark;
      ctx.beginPath();
      ctx.moveTo(.22*r,-.66*r);
      ctx.quadraticCurveTo(
        .04*r,-.34*r,
        .18*r,.02*r
      );
      ctx.lineTo(.32*r,.00*r);
      ctx.quadraticCurveTo(
        .18*r,-.32*r,
        .38*r,-.64*r
      );
      ctx.closePath();
      ctx.fill();
    }else if(k==="camel"){
      stripe(-.34,-.62,-.10,-.38,.03);
      stripe(.02,-.60,.22,-.36,.03);
    }else if(
      k==="alpaca"||
      k==="sheep"
    ){
      ctx.fillStyle="rgba(255,250,236,.70)";
      for(let i=0;i<7;i++){
        ctx.beginPath();
        ctx.arc(
          (-.52+i*.15)*r,
          (-.20+(i%2)*.12)*r,
          .10*r,
          0,Math.PI*2
        );
        ctx.fill();
      }
    }else if(k==="rabbit"){
      ctx.fillStyle="rgba(255,250,236,.48)";
      ctx.beginPath();
      ctx.ellipse(
        -.28*r,.08*r,
        .18*r,.28*r,
        0,0,Math.PI*2
      );
      ctx.fill();
    }else if(k==="squirrel"){
      ctx.fillStyle=dark;
      ctx.beginPath();
      ctx.arc(
        -.68*r,.00*r,
        .28*r,
        0,Math.PI*2
      );
      ctx.fill();
    }else if(k==="monkey"){
      ctx.fillStyle="rgba(245,225,197,.58)";
      ctx.beginPath();
      ctx.ellipse(
        .68*r,-.28*r,
        .16*r,.12*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
        .22*r,.14*r,
        .25*r,.18*r,
        0,0,Math.PI*2
      );
      ctx.fill();
    }else if(k==="owl"){
      ctx.strokeStyle=light;
      ctx.lineWidth=Math.max(.8,r*.028);
      for(const x of [-.20,.00,.20]){
        ctx.beginPath();
        ctx.arc(
          (.18+x)*r,
          -.28*r,
          .09*r,
          0,Math.PI*2
        );
        ctx.stroke();
      }
    }else if(
      k==="eagle"||
      k==="crow"||
      k==="kite"||
      k==="cormorant"
    ){
      ctx.strokeStyle=dark;
      ctx.lineWidth=Math.max(.8,r*.025);
      for(let i=0;i<3;i++){
        ctx.beginPath();
        ctx.moveTo(
          (-.38+i*.14)*r,
          -.02*r
        );
        ctx.quadraticCurveTo(
          (-.10+i*.10)*r,
          .12*r,
          (.22+i*.08)*r,
          .02*r
        );
        ctx.stroke();
      }
    }else if(k==="penguin"){
      ctx.fillStyle="rgba(248,242,226,.82)";
      ctx.beginPath();
      ctx.ellipse(
        .02*r,.10*r,
        .28*r,.36*r,
        0,0,Math.PI*2
      );
      ctx.fill();
    }else if(k==="turtle"){
      ctx.strokeStyle=light;
      ctx.lineWidth=Math.max(.8,r*.025);
      for(const x of [-.38,-.18,.02,.22,.42]){
        ctx.beginPath();
        ctx.moveTo(x*r,-.30*r);
        ctx.quadraticCurveTo(
          (x+.06)*r,.02*r,
          x*r,.34*r
        );
        ctx.stroke();
      }
    }else if(k==="crocodile"){
      ctx.fillStyle=dark;
      for(let i=0;i<6;i++){
        ctx.beginPath();
        ctx.arc(
          (-.48+i*.20)*r,
          -.22*r,
          .045*r,
          0,Math.PI*2
        );
        ctx.fill();
      }
    }else if(k==="snake"){
      ctx.strokeStyle=light;
      ctx.lineWidth=Math.max(.8,r*.022);
      for(let i=0;i<6;i++){
        const x=(-.55+i*.24)*r;
        ctx.beginPath();
        ctx.moveTo(x,-.12*r);
        ctx.lineTo(x+.10*r,.12*r);
        ctx.stroke();
      }
    }else if(k==="spider"){
      ctx.fillStyle=light;
      for(const x of [-.30,-.10,.10,.30]){
        ctx.beginPath();
        ctx.arc(x*r,-.03*r,.025*r,0,Math.PI*2);
        ctx.fill();
      }
    }else if(k==="bat"){
      ctx.strokeStyle=light;
      ctx.lineWidth=Math.max(.8,r*.02);
      for(const s of [-1,1]){
        ctx.beginPath();
        ctx.moveTo(0,.18*r);
        ctx.quadraticCurveTo(
          s*.42*r,.02*r,
          s*.84*r,-.32*r
        );
        ctx.stroke();
      }
    }


    /*
     * Integrated species anatomy.
     * LOD1/2 must not append the old generic ears/tail/special layers.
     * These features belong to the same animal illustration as the body.
     */
    const appendageStroke=stroke;

    const earPoint=(x,y,w,h,lean=0)=>{
      ctx.fillStyle=fill;
      ctx.beginPath();
      ctx.moveTo(x*r,y*r);
      ctx.quadraticCurveTo(
        (x+lean-w)*r,
        (y-h*.55)*r,
        (x+lean)*r,
        (y-h)*r
      );
      ctx.quadraticCurveTo(
        (x+lean+w)*r,
        (y-h*.45)*r,
        (x+w*.55)*r,
        (y+.02)*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    const earDrop=(x,y,w,h,lean=0)=>{
      ctx.fillStyle=fill;
      ctx.beginPath();
      ctx.moveTo(x*r,y*r);
      ctx.quadraticCurveTo(
        (x+lean-w)*r,
        (y+h*.18)*r,
        (x+lean-w*.65)*r,
        (y+h)*r
      );
      ctx.quadraticCurveTo(
        (x+lean)*r,
        (y+h*1.12)*r,
        (x+w*.55)*r,
        (y+h*.35)*r
      );
      ctx.quadraticCurveTo(
        (x+w*.72)*r,
        (y+h*.08)*r,
        x*r,y*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    const earRound=(x,y,w,h)=>{
      ctx.fillStyle=fill;
      ctx.beginPath();
      ctx.ellipse(
        x*r,
        y*r,
        w*r,
        h*r,
        0,
        0,
        Math.PI*2
      );
      ctx.fill();
      ctx.stroke();
    };

    const tailCurve=(points,width=.09)=>{
      ctx.fillStyle=fill;
      ctx.beginPath();
      ctx.moveTo(points[0][0]*r,points[0][1]*r);

      for(let i=1;i<points.length;i++){
        const q=points[i];
        if(q.length===4){
          ctx.quadraticCurveTo(
            q[0]*r,q[1]*r,
            q[2]*r,q[3]*r
          );
        }else{
          ctx.lineTo(q[0]*r,q[1]*r);
        }
      }

      ctx.strokeStyle=appendageStroke;
      ctx.lineWidth=Math.max(1,r*width);
      ctx.lineCap="round";
      ctx.lineJoin="round";
      ctx.stroke();
    };

    const tailBush=(x,y,flip=1)=>{
      ctx.fillStyle=shade(fill,.94);
      ctx.beginPath();
      ctx.moveTo(x*r,y*r);
      ctx.quadraticCurveTo(
        (x-.30*flip)*r,
        (y-.22)*r,
        (x-.54*flip)*r,
        (y-.02)*r
      );
      ctx.quadraticCurveTo(
        (x-.76*flip)*r,
        (y+.18)*r,
        (x-.52*flip)*r,
        (y+.38)*r
      );
      ctx.quadraticCurveTo(
        (x-.24*flip)*r,
        (y+.25)*r,
        x*r,
        (y+.08)*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    const paw=(x,y,w=.09)=>{
      ctx.fillStyle=shade(fill,.76);
      ctx.beginPath();
      ctx.ellipse(
        x*r,
        y*r,
        w*r,
        .055*r,
        0,
        0,
        Math.PI*2
      );
      ctx.fill();
    };

    const canineFeatures=()=>{
      if(k==="wolf"){
        earPoint(.40,-.53,.12,.30,-.02);
        earPoint(.68,-.55,.12,.30,.02);
      }else if(k==="fox"){
        earPoint(.39,-.51,.14,.34,-.02);
        earPoint(.68,-.53,.14,.36,.02);
      }else if(k==="hound"){
        earDrop(.40,-.48,.13,.25,-.05);
        earDrop(.68,-.47,.13,.25,.05);
      }else if(k==="golden"){
        earDrop(.40,-.46,.13,.22,-.04);
        earDrop(.69,-.45,.13,.22,.04);
      }else if(k==="weasel"||k==="otter"){
        earRound(.42,-.50,.09,.10);
        earRound(.67,-.49,.09,.10);
      }else if(k==="raccoon"||k==="raccoonDog"||k==="badger"){
        earRound(.39,-.52,.10,.11);
        earRound(.68,-.51,.10,.11);
      }else{
        earDrop(.41,-.48,.12,.20,-.03);
        earDrop(.69,-.47,.12,.20,.03);
      }

      tailCurve([
        [-.66,.18,-.94,.02],
        [-.94,.02,-.96,-.24],
        [-.96,-.24,-.72,-.36]
      ],.095);

      paw(-.48,.59,.10);
      paw(-.24,.59,.10);
      paw(.33,.59,.10);
      paw(.54,.59,.10);
    };

    const felineFeatures=()=>{
      if(k==="lynx"){
        earPoint(.39,-.56,.12,.30,-.02);
        earPoint(.68,-.57,.12,.30,.02);

        ctx.fillStyle=dark;
        for(const x of [.37,.69]){
          ctx.beginPath();
          ctx.arc(
            x*r,
            -.82*r,
            .035*r,
            0,
            Math.PI*2
          );
          ctx.fill();
        }
      }else{
        earPoint(.40,-.57,.12,.30,-.02);
        earPoint(.68,-.57,.12,.30,.02);
      }

      tailCurve([
        [-.60,.20,-.94,.05],
        [-.94,.05,-.98,-.25],
        [-.98,-.25,-.72,-.42]
      ],k==="tiger"?.12:.085);

      paw(-.47,.58,.095);
      paw(-.23,.58,.095);
      paw(.28,.58,.095);
      paw(.48,.58,.095);
    };

    const largeFeatures=()=>{
      if(k==="pack"){
        earPoint(.43,-.57,.10,.38,-.02);
        earPoint(.70,-.56,.10,.40,.02);

        ctx.strokeStyle=shade(fill,.50);
        ctx.lineWidth=Math.max(1,r*.075);
        ctx.beginPath();
        ctx.moveTo(.34*r,-.65*r);
        ctx.quadraticCurveTo(
          .10*r,-.48*r,
          .18*r,-.08*r
        );
        ctx.stroke();

        ctx.fillStyle=shade(fill,.82);
        ctx.beginPath();
        ctx.ellipse(
          .40*r,-.70*r,
          .18*r,.08*r,
          0,0,Math.PI*2
        );
        ctx.fill();

        ctx.fillStyle=fill;
        tailCurve([
          [-.64,.22,-.84,.14],
          [-.84,.14,-.90,-.06]
        ],.065);
      }else if(k==="horse"){
        earPoint(.43,-.57,.10,.25,-.02);
        earPoint(.70,-.56,.10,.25,.02);

        ctx.strokeStyle=shade(fill,.50);
        ctx.lineWidth=Math.max(1,r*.09);
        ctx.beginPath();
        ctx.moveTo(.30*r,-.68*r);
        ctx.quadraticCurveTo(
          .05*r,-.44*r,
          .18*r,-.08*r
        );
        ctx.stroke();

        tailBush(-.72,.20,1);
      }else if(k==="deer"){
        earPoint(.38,-.54,.11,.25,-.06);
        earPoint(.69,-.54,.11,.25,.06);

        ctx.strokeStyle=shade(fill,.45);
        ctx.lineWidth=Math.max(1,r*.035);

        for(const side of [-1,1]){
          ctx.beginPath();
          ctx.moveTo(
            (.50+side*.10)*r,
            -.70*r
          );
          ctx.quadraticCurveTo(
            (.44+side*.20)*r,
            -1.00*r,
            (.34+side*.28)*r,
            -1.12*r
          );
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(
            (.46+side*.13)*r,
            -.84*r
          );
          ctx.lineTo(
            (.30+side*.28)*r,
            -1.00*r
          );
          ctx.stroke();
        }

        tailCurve([
          [-.62,.20,-.84,.02],
          [-.84,.02,-.84,-.22],
          [-.84,-.22,-.64,-.34]
        ],.07);
      }else if(k==="ox"){
        earRound(.38,-.53,.11,.10);
        earRound(.70,-.53,.11,.10);

        ctx.strokeStyle=light;
        ctx.lineWidth=Math.max(1,r*.065);

        for(const side of [-1,1]){
          ctx.beginPath();
          ctx.moveTo(
            (.42+side*.20)*r,
            -.61*r
          );
          ctx.quadraticCurveTo(
            (.35+side*.34)*r,
            -.78*r,
            (.20+side*.48)*r,
            -.69*r
          );
          ctx.stroke();
        }

        tailCurve([
          [-.68,.20,-.90,.15],
          [-.90,.15,-.94,.36],
          [-.94,.36,-.78,.43]
        ],.065);
      }else if(k==="camel"){
        earRound(.42,-.55,.10,.09);
        earRound(.68,-.54,.10,.09);

        tailCurve([
          [-.68,.20,-.88,.25],
          [-.88,.25,-.94,.48]
        ],.07);
      }else if(k==="alpaca"){
        earPoint(.40,-.55,.10,.27,-.02);
        earPoint(.69,-.55,.10,.27,.02);

        ctx.fillStyle=light;
        for(let i=0;i<4;i++){
          ctx.beginPath();
          ctx.arc(
            (.39+i*.10)*r,
            -.75*r,
            .07*r,
            0,
            Math.PI*2
          );
          ctx.fill();
        }

        tailCurve([
          [-.66,.20,-.86,.08],
          [-.86,.08,-.90,-.18]
        ],.08);
      }else if(k==="goat"){
        earPoint(.40,-.55,.10,.22,-.02);
        earPoint(.69,-.55,.10,.22,.02);

        ctx.strokeStyle=shade(fill,.45);
        ctx.lineWidth=Math.max(1,r*.045);
        ctx.beginPath();
        ctx.moveTo(.45*r,-.67*r);
        ctx.quadraticCurveTo(
          .28*r,-.90*r,
          .39*r,-1.02*r
        );
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(.65*r,-.67*r);
        ctx.quadraticCurveTo(
          .82*r,-.90*r,
          .71*r,-1.02*r
        );
        ctx.stroke();

        tailCurve([
          [-.65,.20,-.86,.02],
          [-.86,.02,-.88,-.18]
        ],.06);
      }else{
        earRound(.40,-.54,.10,.09);
        earRound(.69,-.54,.10,.09);

        tailCurve([
          [-.68,.20,-.86,.10],
          [-.86,.10,-.88,-.06]
        ],.06);
      }

      paw(-.53,.68,.10);
      paw(-.25,.68,.10);
      paw(.27,.68,.10);
      paw(.50,.68,.10);
    };

    const smallFeatures=()=>{
      if(k==="rabbit"){
        earPoint(.38,-.52,.10,.42,-.02);
        earPoint(.67,-.52,.10,.44,.02);

        tailBush(-.60,.20,-1);
      }else if(k==="squirrel"){
        earPoint(.39,-.51,.09,.19,-.02);
        earPoint(.66,-.51,.09,.19,.02);

        tailBush(-.60,.05,-1);
      }else{
        earRound(.40,-.51,.09,.10);
        earRound(.66,-.51,.09,.10);

        tailCurve([
          [-.60,.18,-.82,.04],
          [-.82,.04,-.90,-.20],
          [-.90,-.20,-.72,-.30]
        ],.07);
      }

      paw(-.43,.55,.08);
      paw(-.20,.55,.08);
      paw(.27,.55,.08);
      paw(.46,.55,.08);
    };

    const birdFeatures=()=>{
      if(k==="owl"){
        ctx.fillStyle=light;

        for(const side of [-1,1]){
          ctx.beginPath();
          ctx.moveTo(
            (.40+side*.13)*r,
            -.64*r
          );
          ctx.lineTo(
            (.48+side*.16)*r,
            -.88*r
          );
          ctx.lineTo(
            (.56+side*.06)*r,
            -.63*r
          );
          ctx.closePath();
          ctx.fill();
        }
      }

      if(k==="eagle"||k==="kite"){
        ctx.fillStyle=shade(fill,.62);
        ctx.beginPath();
        ctx.moveTo(-.35*r,-.15*r);
        ctx.quadraticCurveTo(
          -.92*r,-.55*r,
          -1.04*r,-.18*r
        );
        ctx.quadraticCurveTo(
          -.82*r,.06*r,
          -.36*r,.22*r
        );
        ctx.closePath();
        ctx.fill();
      }

      if(k==="penguin"){
        ctx.fillStyle="rgba(248,242,226,.82)";
        ctx.beginPath();
        ctx.ellipse(
          .05*r,.12*r,
          .31*r,.39*r,
          0,0,Math.PI*2
        );
        ctx.fill();
      }

      ctx.fillStyle=shade(fill,.62);
      ctx.beginPath();
      ctx.moveTo(.63*r,-.43*r);
      ctx.lineTo(
        (k==="eagle"||k==="cormorant"?1.28:.98)*r,
        -.38*r
      );
      ctx.lineTo(.64*r,-.27*r);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle=fill;
      ctx.strokeStyle=appendageStroke;

      if(k!=="penguin"){
        ctx.beginPath();
        ctx.moveTo(-.08*r,.34*r);
        ctx.lineTo(-.02*r,.60*r);
        ctx.lineTo(.08*r,.60*r);
        ctx.lineTo(.10*r,.34*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(.18*r,.34*r);
        ctx.lineTo(.24*r,.60*r);
        ctx.lineTo(.34*r,.60*r);
        ctx.lineTo(.34*r,.34*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    };

    const reptileFeatures=()=>{
      if(k==="turtle"){
        ctx.fillStyle=shade(fill,.54);
        ctx.strokeStyle=light;
        ctx.lineWidth=Math.max(1,r*.025);

        for(const x of [-.40,-.20,0,.20,.40]){
          ctx.beginPath();
          ctx.moveTo(x*r,-.38*r);
          ctx.quadraticCurveTo(
            (x+.05)*r,
            -.02*r,
            x*r,
            .35*r
          );
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.moveTo(-.60*r,.02*r);
        ctx.lineTo(-.82*r,.22*r);
        ctx.lineTo(-.60*r,.28*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(.52*r,.02*r);
        ctx.lineTo(.78*r,.18*r);
        ctx.lineTo(.56*r,.30*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }else if(k==="crocodile"){
        ctx.fillStyle=shade(fill,.45);

        for(let i=0;i<7;i++){
          ctx.beginPath();
          ctx.arc(
            (-.55+i*.18)*r,
            -.34*r,
            .045*r,
            0,
            Math.PI*2
          );
          ctx.fill();
        }

        ctx.fillStyle=light;
        for(let i=0;i<5;i++){
          ctx.beginPath();
          ctx.moveTo(
            (.45+i*.10)*r,
            -.20*r
          );
          ctx.lineTo(
            (.50+i*.10)*r,
            -.10*r
          );
          ctx.lineTo(
            (.55+i*.10)*r,
            -.20*r
          );
          ctx.closePath();
          ctx.fill();
        }

        tailCurve([
          [-.72,.20,-1.00,.12],
          [-1.00,.12,-1.12,-.08],
          [-1.12,-.08,-.98,-.30]
        ],.13);
      }
    };

    const snakeFeatures=()=>{
      if(k==="snake"){
        ctx.fillStyle=shade(fill,.48);

        for(const side of [-1,1]){
          ctx.beginPath();
          ctx.moveTo(
            1.08*r,
            side*.03*r
          );
          ctx.lineTo(
            1.18*r,
            side*.07*r
          );
          ctx.lineTo(
            1.08*r,
            side*.11*r
          );
          ctx.closePath();
          ctx.fill();
        }
      }
    };

    const spiderFeatures=()=>{
      if(k==="spider"){
        ctx.fillStyle=light;

        for(const x of [-.30,-.10,.10,.30]){
          ctx.beginPath();
          ctx.arc(
            x*r,
            -.03*r,
            .025*r,
            0,
            Math.PI*2
          );
          ctx.fill();
        }
      }
    };

    const batFeatures=()=>{
      if(k==="bat"){
        earPoint(-.12,-.40,.08,.20,-.02);
        earPoint(.12,-.40,.08,.20,.02);

        ctx.fillStyle=light;
        ctx.beginPath();
        ctx.arc(-.08*r,-.18*r,.025*r,0,Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(.08*r,-.18*r,.025*r,0,Math.PI*2);
        ctx.fill();
      }
    };

    const bearFeatures=()=>{
      earRound(.39,-.56,.13,.13);
      earRound(.69,-.55,.13,.13);

      tailCurve([
        [-.72,.24,-.86,.20],
        [-.86,.20,-.90,.08]
      ],.10);

      paw(-.54,.58,.13);
      paw(-.24,.58,.13);
      paw(.27,.58,.13);
      paw(.55,.58,.13);
    };

    const otterFeatures=()=>{
      earRound(.43,-.48,.075,.075);
      earRound(.67,-.47,.075,.075);

      tailCurve([
        [-.62,.18,-.96,.30],
        [-.96,.30,-1.08,.08],
        [-1.08,.08,-.96,-.16]
      ],.11);

      paw(-.45,.48,.075);
      paw(-.18,.48,.075);
      paw(.25,.48,.075);
      paw(.47,.48,.075);
    };

    const boarFeatures=()=>{
      earPoint(.38,-.50,.11,.20,-.12);
      earPoint(.68,-.50,.11,.20,.12);

      ctx.fillStyle=light;
      ctx.beginPath();
      ctx.moveTo(.78*r,-.19*r);
      ctx.quadraticCurveTo(
        1.02*r,-.10*r,
        .88*r,.02*r
      );
      ctx.quadraticCurveTo(
        .74*r,.02*r,
        .68*r,-.10*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle=shade(fill,.42);
      ctx.beginPath();
      ctx.arc(.89*r,-.09*r,.055*r,0,Math.PI*2);
      ctx.fill();

      ctx.fillStyle=fill;
      tailCurve([
        [-.68,.20,-.88,.04],
        [-.88,.04,-.80,-.16]
      ],.055);

      paw(-.50,.61,.105);
      paw(-.23,.61,.105);
      paw(.28,.61,.105);
      paw(.51,.61,.105);
    };

    const capybaraFeatures=()=>{
      earRound(.42,-.45,.085,.075);
      earRound(.68,-.45,.085,.075);

      ctx.fillStyle=light;
      ctx.beginPath();
      ctx.ellipse(
        .77*r,-.19*r,
        .25*r,.17*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle=shade(fill,.38);
      ctx.beginPath();
      ctx.ellipse(
        .91*r,-.17*r,
        .075*r,.045*r,
        0,0,Math.PI*2
      );
      ctx.fill();

      ctx.fillStyle=fill;
      tailCurve([
        [-.70,.20,-.86,.24]
      ],.045);

      paw(-.48,.58,.10);
      paw(-.22,.58,.10);
      paw(.28,.58,.10);
      paw(.50,.58,.10);
    };

    const monkeyFeatures=()=>{
      earRound(.40,-.50,.14,.13);
      earRound(.69,-.50,.14,.13);

      ctx.fillStyle=light;
      ctx.beginPath();
      ctx.ellipse(
        .70*r,-.30*r,
        .20*r,.14*r,
        0,0,Math.PI*2
      );
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle=fill;
      tailCurve([
        [-.48,.18,-.82,.02],
        [-.82,.02,-.86,-.36],
        [-.86,-.36,-.62,-.62]
      ],.065);

      paw(-.40,.54,.07);
      paw(-.12,.56,.07);
      paw(.25,.56,.07);
      paw(.45,.50,.07);
    };

    if(k==="bear"){
      bearFeatures();
    }else if(k==="otter"){
      otterFeatures();
    }else if(k==="boar"){
      boarFeatures();
    }else if(k==="capybara"){
      capybaraFeatures();
    }else if(k==="monkey"){
      monkeyFeatures();
    }else if([
      "hound","dog","golden","wolf","fox",
      "weasel","raccoon","raccoonDog","badger"
    ].includes(k)){
      canineFeatures();
    }else if([
      "tiger","leopard","cat","lynx"
    ].includes(k)){
      felineFeatures();
    }else if([
      "horse","pack","deer","ox","camel",
      "alpaca","goat","sheep"
    ].includes(k)){
      largeFeatures();
    }else if([
      "rabbit","squirrel","monkey"
    ].includes(k)){
      smallFeatures();
    }else if([
      "bird","eagle","owl","crow","kite",
      "cormorant","penguin"
    ].includes(k)){
      birdFeatures();
    }else if([
      "turtle","crocodile"
    ].includes(k)){
      reptileFeatures();
    }else if(k==="snake"){
      snakeFeatures();
    }else if(k==="spider"){
      spiderFeatures();
    }else if(k==="bat"){
      batFeatures();
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
    downed,
    state
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

    const stateMoving=
      state?.moving===true;

    const moving=
      !downed &&
      (
        state
          ? stateMoving
          : animal?.command!=="wait"
      );

    const attackPulse=
      Math.max(
        0,
        Math.min(
          1,
          Number(state?.attackPulse)||0
        )
      );

    const hitPulse=
      Math.max(
        0,
        Math.min(
          1,
          Number(state?.hitPulse)||0
        )
      );

    const attackDirX=
      Number.isFinite(Number(state?.attackDirX))
        ? Number(state.attackDirX)
        : 1;

    const attackDirY=
      Number.isFinite(Number(state?.attackDirY))
        ? Number(state.attackDirY)
        : 0;

    let speciesX=0;
    let speciesBob=0;
    let speciesRotate=0;

    if(moving){
      if(body==="snake"){
        speciesX=
          Math.sin(t*1.65+phase)*
          r*.08;
        speciesRotate=
          Math.sin(t*1.65+phase)*.055;
      }else if(
        ["bird","eagle","crow","kite","cormorant","bat"]
          .includes(body)
      ){
        speciesBob=
          Math.sin(t*2.5+phase)*
          r*.035;
      }else if(body==="spider"){
        speciesBob=
          Math.sin(t*2.2+phase)*
          r*.02;
      }else if(
        ["turtle","crocodile","penguin"]
          .includes(body)
      ){
        speciesBob=
          Math.sin(t*1.4+phase)*
          r*.018;
      }
    }

    const bob=
      moving
        ? (
            Math.sin(t+phase)*
            Math.max(.45,r*.055)
          )+
          speciesBob
        : 0;

    const sway=
      moving
        ? Math.sin(t*.72+phase)*.026+
          speciesRotate
        : 0;

    const scaleX=
      1+(variant-.5)*.10;

    const scaleY=
      1+(variant-.5)*.08;

    const ambient=ambientProfile();

    const lod=
      r<7
        ? 0
        : r<13
          ? 1
          : 2;

    const staticLayer=
      lod===0
        ? getStaticLayer(
            body,
            g,
            base,
            r,
            downed,
            variant,
            lod
          )
        : null;

    ctx.save();

    const shadowAlpha=
      downed
        ? .08
        : ambient.shadow;

    const outerShadow=
      ctx.createRadialGradient(
        x,
        y+r*.66,
        0,
        x,
        y+r*.66,
        r*1.18
      );

    outerShadow.addColorStop(
      0,
      `rgba(0,0,0,${shadowAlpha})`
    );
    outerShadow.addColorStop(
      1,
      "rgba(0,0,0,0)"
    );

    ctx.fillStyle=outerShadow;
    ctx.beginPath();
    ctx.ellipse(
      x,
      y+r*.66,
      r*.98*
        (
          1+
          Math.max(
            0,
            Math.abs(scaleX-1)
          )
        ),
      Math.max(1.8,r*.22),
      0,
      0,
      Math.PI*2
    );
    ctx.fill();

    ctx.fillStyle=
      `rgba(0,0,0,${Math.min(.38,shadowAlpha+.08)})`;
    ctx.beginPath();
    ctx.ellipse(
      x,
      y+r*.58,
      r*.58*
        (
          1+
          Math.max(
            0,
            Math.abs(scaleX-1)
          )
        ),
      Math.max(1.3,r*.105),
      0,
      0,
      Math.PI*2
    );
    ctx.fill();

    const hitShake=
      hitPulse*
      Math.sin(t*14+phase)*
      r*.055;

    const attackLunge=
      attackPulse*
      Math.max(
        0,
        Math.min(
          r*.3,
          r*
          (
            Math.abs(attackDirX)+
            Math.abs(attackDirY)
          )*.15
        )
      );

    ctx.translate(
      x+
      speciesX+
      attackDirX*attackLunge+
      hitShake,
      y+
      bob+
      attackDirY*attackLunge
    );
    ctx.rotate(
      sway+
      attackPulse*.085+
      hitPulse*
      Math.sin(t*17+phase)*.055
    );
    ctx.scale(scaleX,scaleY);

    if(staticLayer){
      ctx.drawImage(
        staticLayer.canvas,
        -staticLayer.size/2,
        -staticLayer.size/2
      );
    }else{
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

      const grad=
        ctx.createLinearGradient(
          -r,-r,r,r
        );

      grad.addColorStop(0,light);
      grad.addColorStop(.25,fill);
      grad.addColorStop(1,dark);

      drawAnatomicalBody(
        ctx,
        r,
        g?.key||animal?.type||"hound",
        fill,
        stroke,
        light,
        lod,
        phase
      );

      drawAnatomicalSurface(
        ctx,
        r,
        g?.key||animal?.type||"hound",
        base,
        light,
        lod
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

      drawSpeciesArtwork(
        ctx,
        r,
        g?.key||"",
        body,
        base,
        downed,
        lod
      );

      drawFaceDetails(
        ctx,
        r,
        body,
        base,
        downed,
        g?.variant||variant,
        lod
      );

      drawSurfaceDetails(
        ctx,
        r,
        body,
        base,
        downed,
        lod
      );

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
    }

    const motionPhase=
      moving
        ? t+phase
        : 0;

    if(lod===0&&!staticLayer){
      legs(
        ctx,
        r,
        body,
        downed ? "#777" : rgba("#ffffff",.72),
        motionPhase,
        g?.key||""
      );
    }

    if(lod===0&&!staticLayer){
      ears(
        ctx,
        r,
        g?.ears,
        downed
          ? "#666"
          : base,
        downed
          ? "#999"
          : rgba("#ffffff",.82),
        moving
          ? Math.sin(t*.8+phase)*.065+
            (
              ["rabbit","deer","horse","alpaca","goat"]
                .includes(body)
                ? Math.sin(t*1.7+phase)*.055
                : 0
            )
          : 0
      );

      tail(
        ctx,
        r,
        g?.tail,
        downed
          ? "#888"
          : rgba("#ffffff",.72),
        motionPhase,
        g?.key||""
      );

      special(
        ctx,
        r,
        body,
        downed
          ? "#666"
          : base,
        downed
          ? "#777"
          : "rgba(248,242,226,.84)",
        motionPhase,
        moving
      );
    }

    if(
      animal?.command==="attack"&&
      moving&&
      !downed
    ){
      ctx.strokeStyle=
        attackPulse>.15
          ? "rgba(255,235,150,.78)"
          : "rgba(255,220,130,.45)";
      ctx.lineWidth=
        Math.max(1,r*.045);

      ctx.beginPath();
      ctx.arc(
        r*.15,
        0,
        r*.8+
        attackPulse*r*.12,
        -.55,.55
      );
      ctx.stroke();
    }

    if(hitPulse>.1&&!downed){
      ctx.strokeStyle=
        `rgba(255,105,105,${.3+hitPulse*.4})`;
      ctx.lineWidth=
        Math.max(1,r*.055);

      ctx.beginPath();
      ctx.arc(
        0,
        0,
        r*(.72+hitPulse*.16),
        0,
        Math.PI*2
      );
      ctx.stroke();
    }

    if(ambient.tintAlpha>0){
      ctx.fillStyle=ambient.tint;
      ctx.beginPath();
      ctx.ellipse(
        0,
        0,
        r*1.18,
        r*.96,
        0,
        0,
        Math.PI*2
      );
      ctx.fill();
    }

    ctx.restore();
  }


  window.EFRPetRenderer={
    draw
  };
})();
