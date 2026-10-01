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
    if(downed || lod<1)return;

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

    if(lod===2){
      const grad=
        layerCtx.createLinearGradient(
          -r,-r,r,r
        );

      grad.addColorStop(0,light);
      grad.addColorStop(.25,fill);
      grad.addColorStop(1,dark);

      silhouette(
        layerCtx,
        r,
        body,
        graphic,
        grad,
        stroke,
        light
      );
    }else{
      silhouette(
        layerCtx,
        r,
        body,
        graphic,
        fill,
        stroke,
        light
      );
    }

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
      getStaticLayer(
        body,
        g,
        base,
        r,
        downed,
        variant,
        lod
      );

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
          g,
          grad,
          stroke,
          light
        );
      }else{
        silhouette(
          ctx,
          r,
          body,
          g,
          fill,
          stroke,
          light
        );
      }
    }

    const motionPhase=
      moving
        ? t+phase
        : 0;

    legs(
      ctx,
      r,
      body,
      downed ? "#777" : rgba("#ffffff",.72),
      motionPhase,
      g?.key||""
    );

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
