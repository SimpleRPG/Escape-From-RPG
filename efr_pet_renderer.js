(function(){
  "use strict";

  const cache=new Map();

  const directionCache=new Map();

  /*
   * 正本の歩行phase仕様。
   *
   * 保存対象ではなくrenderer専用のruntime状態。
   * 既存のpet state(vx/vy/moving)を入力として、
   * 表示FPSに依存しないdt基準で歩行phaseを進める。
   */
  const gaitCache=new Map();

  function gaitStateFor(
    animal,
    body,
    stateMoving,
    vx,
    vy
  ){
    const key=String(
      animal?.id||
      animal?.name||
      body||
      "pet"
    );

    const now=
      typeof performance==="object" &&
      typeof performance.now==="function"
        ? performance.now()*.001
        : Date.now()*.001;

    let gait=gaitCache.get(key);

    if(!gait){
      gait={
        phase:hash(key)*Math.PI*2,
        lastTime:now,
        state:"PLANTED"
      };

      gaitCache.set(key,gait);
    }

    let dt=now-gait.lastTime;

    gait.lastTime=now;

    if(!Number.isFinite(dt)){
      dt=0;
    }

    /*
     * 極端なフレーム停止から復帰した際に、
     * 1フレームで脚を大きく飛ばさない。
     */
    dt=Math.max(
      0,
      Math.min(
        .05,
        dt
      )
    );

    const speed=Math.hypot(
      Number(vx)||0,
      Number(vy)||0
    );

    if(
      stateMoving &&
      speed>.5
    ){
      /*
       * 現行移動速度の基準18px/sを利用。
       * 新しい移動モデルや保存値は追加しない。
       */
      const speedFactor=Math.max(
        .35,
        Math.min(
          1.25,
          speed/18
        )
      );

      gait.phase+=
        dt*
        4.2*
        speedFactor;

      const cycle=
        (
          gait.phase*
          2
        )%
        (Math.PI*2);

      const normalized=
        cycle/(Math.PI*2);

      if(normalized<.25){
        gait.state="LIFT";
      }else if(normalized<.50){
        gait.state="SWING";
      }else if(normalized<.75){
        gait.state="LAND";
      }else{
        gait.state="PLANTED";
      }
    }else{
      /*
       * 停止時は脚を即座に固定せず、
       * 現在位相に最も近い中立接地点へ補間する。
       */
      const neutralStep=Math.PI/2;

      const target=
        Math.round(
          gait.phase/neutralStep
        )*
        neutralStep;

      const delta=
        target-gait.phase;

      gait.phase+=
        delta*
        Math.min(
          1,
          dt*8
        );

      if(Math.abs(delta)<.03){
        gait.phase=target;
        gait.state="PLANTED";
      }else{
        gait.state="LAND";
      }
    }

    return gait;
  }

  function angleDelta(from,to){
    return Math.atan2(
      Math.sin(to-from),
      Math.cos(to-from)
    );
  }

  function bodyDirectionFor(
    animal,
    body,
    stateMoving,
    vx,
    vy
  ){
    const key=String(
      animal?.id||
      animal?.name||
      body||
      "pet"
    );

    let current=directionCache.get(key);

    if(!Number.isFinite(current)){
      current=0;
    }

    const speed=Math.hypot(vx,vy);

    if(
      stateMoving &&
      speed>.5
    ){
      const target=Math.atan2(vy,vx);
      const delta=angleDelta(current,target);

      current+=
        Math.max(
          -.22,
          Math.min(
            .22,
            delta
          )
        );

      directionCache.set(
        key,
        current
      );
    }

    return current;
  }


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
         "otter"].includes(key)
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

      if(key==="horse"){
        /*
         * 馬の尾は臀部から連続して下がる房状シルエットとして描く。
         * 細い一本線だけにせず、根元から先端まで面で成立させる。
         */
        ctx.fillStyle=shade(base,.70);
        ctx.beginPath();
        ctx.moveTo(-.66*r,-.02*r);
        ctx.quadraticCurveTo(-.86*r,.08*r,-.92*r,.30*r);
        ctx.quadraticCurveTo(-.82*r,.22*r,-.74*r,.34*r);
        ctx.quadraticCurveTo(-.70*r,.18*r,-.54*r,.10*r);
        ctx.quadraticCurveTo(-.60*r,.04*r,-.66*r,-.02*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
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

    /*
     * gait phaseから脚の接地状態を決定する。
     *
     * phaseの境界は既存gaitStateFor()と同じ
     * PLANTED → LIFT → SWING → LAND → PLANTED
     * を使用する。
     *
     * 新しい種族別数値や別animation runtimeは追加しない。
     */
    const gaitFootWave=(walkPhase)=>{
      const cycle=
        (
          Number(walkPhase)||0
        )*
        2;

      const normalized=
        (
          (
            cycle%
            (Math.PI*2)
          )+
          Math.PI*2
        )%
        (Math.PI*2)/
        (Math.PI*2);

      let state="PLANTED";
      let lift=0;

      if(normalized<.25){
        state="LIFT";

        /*
         * LIFT開始時は0から上がる。
         */
        const t=
          normalized/.25;

        lift=
          Math.sin(
            t*Math.PI*.5
          );
      }else if(normalized<.50){
        state="SWING";

        /*
         * SWING中央で最大高さ。
         */
        const t=
          (normalized-.25)/.25;

        lift=
          Math.sin(
            (.5+t*.5)*Math.PI
          );
      }else if(normalized<.75){
        state="LAND";

        /*
         * LANDでは接地へ向けて高さを戻す。
         */
        const t=
          (normalized-.50)/.25;

        lift=
          Math.sin(
            (1-t)*Math.PI*.5
          );
      }else{
        state="PLANTED";
        lift=0;
      }

      return {
        state,
        lift
      };
    };

    const canine=({
      kind="dog",
      bodyW=.78,
      bodyH=.40,
      neck=.10,
      head=.30,
      muzzleW=.24,
      muzzleH=.13,
      legH=.40,
      legW=.105,
      back=.00,
      belly=.05,
      walkPhase=0
    }={})=>{
      /*
       * 犬科の基礎シルエットは、胴体・首・頭・口吻・前脚・腹・後脚を
       * 別図形として足し合わせない。
       *
       * 通常半径約14pxでも外周だけで犬の身体として読めることを優先し、
       * 背中→首→頭→口吻→顎→胸→前脚→腹→後脚→臀部を
       * 一つの連続した輪郭として構成する。
       */
      const hx=.55+neck;
      const hy=-.31;

      /*
       * 一体化シルエットでも移動中に「スライド」させない。
       *
       * 4本の脚を別オブジェクトとして動かすのではなく、
       * 連続した外周そのものの脚位置を歩行位相で変形する。
       *
       * 前脚と後脚を逆位相にすることで、
       * 同じ身体輪郭を保ったまま歩行姿勢が交互に変化する。
       */
      const rearFootWave=
        gaitFootWave(walkPhase);

      const frontFootWave=
        gaitFootWave(
          walkPhase+
          Math.PI/2
        );

      const stride=
        Math.sin(walkPhase*2);

      const counterStride=
        -stride;

      const rearOuterX=
        -.50+
        stride*.095;

      const rearInnerX=
        -.35+
        stride*.065;

      const frontOuterX=
        .43+
        counterStride*.095;

      const frontInnerX=
        .30+
        counterStride*.065;

      const legTop=.10;

      const rearFootY=
        legTop+
        legH+
        rearFootWave.lift*
        legH*
        .055;

      const frontFootY=
        legTop+
        legH+
        frontFootWave.lift*
        legH*
        .055;

      const footDepth=Math.max(.065,legW*.62);
      const footWidth=Math.max(.115,legW*1.45);

      path([
        ["M",-bodyW,.13+back],

        /* rump -> back */
        ["Q",-bodyW-.05,.02,-bodyW*.80,-.16],
        ["Q",-bodyW*.56,-bodyH*.88,-.22,-bodyH],

        /* back -> shoulder -> neck */
        ["Q",.02,-bodyH-.04,.24,-bodyH*.72],
        ["Q",.31,-bodyH*.50,.35,-.34],
        ["Q",.38,-.27,.44,-.22],
        ["Q",.48,-.30,hx-head*.56,hy+head*.34],

        /* head top -> forehead -> muzzle */
        ["Q",hx-head*.66,hy-head*.25,hx-head*.18,hy-head*.90],
        ["Q",hx+head*.18,hy-head*1.02,hx+head*.56,hy-head*.66],
        ["Q",hx+head*.82,hy-head*.44,hx+head*.84,hy-head*.10],
        ["L",hx+head*1.28,hy+head*.01],

        /* nose -> jaw */
        ["Q",hx+head*1.22,hy+head*.20,hx+head*.82,hy+head*.31],
        ["Q",hx+head*.57,hy+head*.40,hx+head*.25,hy+head*.43],

        /* throat -> chest */
        ["Q",hx-head*.02,hy+head*.46,.49,.08],
        ["Q",.47,.18,.45,legTop],

        /* front leg outer -> foot -> inner */
        ["Q",frontOuterX,legTop+.18,frontOuterX,legTop+.48],
        ["L",frontOuterX,frontFootY-footDepth],
        ["Q",frontOuterX,frontFootY,frontOuterX-footWidth*.52,frontFootY],
        ["L",frontInnerX+footWidth*.40,frontFootY],
        ["Q",frontInnerX,frontFootY,frontInnerX,frontFootY-footDepth],
        ["L",frontInnerX,.18],

        /* belly -> rear leg */
        ["Q",.12,.30,-.20,.28+belly],
        ["Q",-.30,.26,rearInnerX,.18],
        ["L",rearInnerX,rearFootY-footDepth],
        ["Q",rearInnerX,rearFootY,rearInnerX-footWidth*.42,rearFootY],
        ["L",rearOuterX-footWidth*.50,rearFootY],
        ["Q",rearOuterX,rearFootY,rearOuterX,rearFootY-footDepth],
        ["L",rearOuterX,.13+back],

        /* rump closes into back */
        ["Q",-bodyW*.86,.30,-bodyW,.13+back],
        ["Z"]
      ]);

      /*
       * 胸部と肩の面を追加する。
       * これは外周を補強するための面であり、脚の代替線ではない。
       */
      ctx.fillStyle=shade(fill,.80);
      ctx.beginPath();
      ctx.moveTo(
        (-bodyW*.42)*r,
        (-bodyH*.34)*r
      );
      ctx.quadraticCurveTo(
        .05*r,
        (-bodyH*.46)*r,
        .35*r,
        -.18*r
      );
      ctx.quadraticCurveTo(
        .31*r,
        .08*r,
        .40*r,
        .22*r
      );
      ctx.quadraticCurveTo(
        .10*r,
        .14*r,
        (-bodyW*.30)*r,
        .05*r
      );
      ctx.closePath();
      ctx.fill();

      /*
       * 脚の接地面だけを軽く強調する。
       * 細い棒を追加して脚を表現することは禁止する。
       */
      ctx.fillStyle=shade(fill,.84);

      for(const [x,y] of [
        [rearOuterX,rearFootY],
        [frontOuterX,frontFootY]
      ]){
        ctx.beginPath();
        ctx.ellipse(
          x*r,
          y*r,
          footWidth*.72*r,
          footDepth*.34*r,
          0,
          0,
          Math.PI*2
        );
        ctx.fill();
      }

      /*
       * 口吻先端だけを別面として残し、顔の向きを明確にする。
       */
      ctx.fillStyle=shade(fill,.90);
      ctx.beginPath();
      ctx.ellipse(
        (hx+head*.94)*r,
        (hy+head*.12)*r,
        Math.max(.10,muzzleW*.48)*r,
        Math.max(.055,muzzleH*.42)*r,
        0,
        0,
        Math.PI*2
      );
      ctx.fill();

      /*
       * 目は外周を壊さない最小の識別点。
       */
      eye(
        hx+head*.24,
        hy-head*.40,
        .045
      );

      /*
       * 口角。口吻の輪郭を補助するだけで、身体シルエットを
       * 細線へ依存させない。
       */
      ctx.strokeStyle=shade(fill,.48);
      ctx.lineWidth=Math.max(.8,r*.022);
      ctx.beginPath();
      ctx.moveTo(
        (hx+head*.38)*r,
        (hy+head*.27)*r
      );
      ctx.quadraticCurveTo(
        (hx+head*.68)*r,
        (hy+head*.35)*r,
        (hx+head*1.02)*r,
        (hy+head*.18)*r
      );
      ctx.stroke();

      ctx.strokeStyle=stroke;
      ctx.lineWidth=Math.max(1,r*.045);
    };

    const feline=({
      kind="cat",
      bodyW=.64,
      bodyH=.37,
      head=.27,
      muzzleW=.17,
      legH=.40,
      legW=.060,
      earH=.17,
      walkPhase=0
    }={})=>{
      /*
       * 猫科は楕円胴＋独立脚＋楕円頭ではなく、
       * 背中・肩・首・頭・耳・口吻・胸・前脚・腹・後脚・臀部を
       * 一つの外周として成立させる。
       */
      const rearFootWave=
        gaitFootWave(walkPhase);

      const frontFootWave=
        gaitFootWave(
          walkPhase+
          Math.PI/2
        );

      const stride=Math.sin(walkPhase*2);
      const counterStride=-stride;

      const rearOuterX=-.48+stride*.085;
      const rearInnerX=-.34+stride*.055;
      const frontOuterX=.43+counterStride*.085;
      const frontInnerX=.30+counterStride*.055;

      const legTop=.10;
      const rearFootY=
        legTop+
        legH+
        rearFootWave.lift*
        legH*
        .055;

      const frontFootY=
        legTop+
        legH+
        frontFootWave.lift*
        legH*
        .055;

      const footDepth=Math.max(.055,legW*.72);
      const footWidth=Math.max(.095,legW*1.45);

      const hx=.54;
      const hy=-.30;
      const earSpread=kind==="tiger"?.13:kind==="lynx"?.12:.11;
      const muzzle=kind==="tiger"?.19:kind==="lynx"?.18:muzzleW;

      path([
        ["M",-bodyW,.13],
        ["Q",-bodyW-.04,.02,-bodyW*.80,-.16],
        ["Q",-bodyW*.54,-bodyH*.88,-.22,-bodyH],
        ["Q",.01,-bodyH-.04,.24,-bodyH*.70],
        ["Q",.32,-bodyH*.48,.36,-.34],

        ["Q",.39,-.38,hx-head*.60,-.42],
        ["L",hx-head*.48-earSpread,-.42-earH],
        ["Q",hx-head*.38-earSpread,-.47-earH*.42,hx-head*.18,-.38],
        ["Q",hx-.03,-.43,hx+.10,-.38],
        ["L",hx+earSpread*.65,-.42-earH*.88],
        ["Q",hx+earSpread,-.43-earH*.36,hx+head*.08,-.34],

        ["Q",hx+head*.42,-.29,hx+head*.72,-.18],
        ["L",hx+head*.98,-.06],
        ["Q",hx+head*1.08,.01,hx+head*.76,.09],
        ["Q",hx+head*.48,.15,hx+head*.20,.17],
        ["Q",hx-.02,.18,.47,.08],

        ["Q",.46,.17,.45,legTop],
        ["Q",frontOuterX,legTop+.18,frontOuterX,legTop+.46],
        ["L",frontOuterX,frontFootY-footDepth],
        ["Q",frontOuterX,frontFootY,frontOuterX-footWidth*.52,frontFootY],
        ["L",frontInnerX+footWidth*.40,frontFootY],
        ["Q",frontInnerX,frontFootY,frontInnerX,frontFootY-footDepth],
        ["L",frontInnerX,.18],

        ["Q",.12,.30,-.18,.28],
        ["Q",-.30,.26,rearInnerX,.18],
        ["L",rearInnerX,rearFootY-footDepth],
        ["Q",rearInnerX,rearFootY,rearInnerX-footWidth*.42,rearFootY],
        ["L",rearOuterX-footWidth*.50,rearFootY],
        ["Q",rearOuterX,rearFootY,rearOuterX,rearFootY-footDepth],
        ["L",rearOuterX,.13],
        ["Q",-bodyW*.86,.30,-bodyW,.13],
        ["Z"]
      ]);

      ctx.fillStyle=shade(fill,.67);

      for(const [x,footY] of [
        [rearOuterX+.05,rearFootY],
        [frontOuterX+.05,frontFootY]
      ]){
        ctx.beginPath();
        ctx.moveTo((x-.02)*r,.18*r);
        ctx.quadraticCurveTo(
          (x-.02)*r,
          (footY-.03)*r,
          (x+.05)*r,
          footY*r
        );
        ctx.quadraticCurveTo(
          (x+.15)*r,
          (footY+.01)*r,
          (x+.17)*r,
          .18*r
        );
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle=shade(fill,.80);
      ctx.beginPath();
      ctx.moveTo(-.40*r,-.28*r);
      ctx.quadraticCurveTo(.02*r,-.43*r,.35*r,-.16*r);
      ctx.quadraticCurveTo(.30*r,.08*r,.39*r,.20*r);
      ctx.quadraticCurveTo(.08*r,.14*r,-.30*r,.04*r);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle=light;
      ctx.beginPath();
      ctx.ellipse(
        (hx+head*.80)*r,
        (hy+head*.10)*r,
        Math.max(.075,muzzle*.50)*r,
        Math.max(.040,muzzle*.28)*r,
        0,0,Math.PI*2
      );
      ctx.fill();

      ctx.fillStyle=shade(fill,.45);
      ctx.beginPath();
      ctx.ellipse(
        (hx+head*1.04)*r,
        (hy+head*.10)*r,
        Math.max(.028,muzzle*.18)*r,
        Math.max(.018,muzzle*.10)*r,
        0,0,Math.PI*2
      );
      ctx.fill();

      eye(
        hx+head*.13,
        hy-head*.34,
        kind==="tiger"?.046:.043
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

      ctx.fillStyle=fill;
    };

    const midMammal=({
      kind="weasel",
      bodyW=.72,
      bodyH=.30,
      head=.23,
      legH=.28,
      legW=.05,
      muzzleW=.21,
      walkPhase=0
    }={})=>{
      /*
       * 中型哺乳類も犬科と同じく、
       * 胴体＋独立脚＋楕円頭の積み重ねにはしない。
       *
       * 胴体・首・頭部・口吻・胸・前脚・腹・後脚を
       * 一つの連続した外周として成立させる。
       *
       * walkPhase は連続外周そのものを変形させるために使用する。
       * 座標移動だけのスライド表示にはしない。
       */
      const rearFootWave=
        gaitFootWave(walkPhase);

      const frontFootWave=
        gaitFootWave(
          walkPhase+
          Math.PI/2
        );

      const stride=Math.sin(walkPhase*2);
      const counterStride=-stride;

      const rearX=
        -.48+
        stride*.07;

      const frontX=
        .42+
        counterStride*.07;

      const rearFootY=
        .20+
        legH+
        rearFootWave.lift*
        legH*
        .045;

      const frontFootY=
        .19+
        legH+
        frontFootWave.lift*
        legH*
        .045;

      let headX=.56;
      let headY=-.25;
      let muzzleX=.78;
      let neckTop=-.18;
      let chest=.30;
      let rump=.18;
      let belly=.34;

      if(kind==="otter"){
        headX=.58;
        headY=-.23;
        muzzleX=.82;
        neckTop=-.16;
        chest=.31;
        rump=.20;
        belly=.38;
      }else if(kind==="raccoon"){
        headX=.58;
        headY=-.27;
        muzzleX=.84;
        neckTop=-.18;
        chest=.32;
        rump=.19;
        belly=.38;
      }else if(kind==="raccoonDog"){
        headX=.60;
        headY=-.26;
        muzzleX=.86;
        neckTop=-.17;
        chest=.33;
        rump=.20;
        belly=.40;
      }else if(kind==="badger"){
        headX=.62;
        headY=-.27;
        muzzleX=.88;
        neckTop=-.18;
        chest=.34;
        rump=.20;
        belly=.41;
      }

      path([
        ["M",-bodyW,rump],

        ["Q",
          -bodyW-.05,.02,
          -bodyW*.70,-.20
        ],

        ["Q",
          -bodyW*.38,-bodyH-.04,
          -.04,-bodyH
        ],

        ["Q",
          .22,-bodyH-.01,
          .34,neckTop
        ],

        ["Q",
          headX-.10,-.24,
          headX-.02,headY-.02
        ],

        ["Q",
          headX+.10,headY-.10,
          headX+.22,headY+.01
        ],

        ["Q",
          headX+.34,headY+.02,
          muzzleX,headY+.10
        ],

        ["Q",
          muzzleX+.12,headY+.17,
          muzzleX+.05,headY+.25
        ],

        ["Q",
          muzzleX-.04,headY+.31,
          muzzleX-.18,headY+.27
        ],

        ["Q",
          headX+.18,headY+.31,
          headX+.10,headY+.38
        ],

        ["Q",
          headX+.02,headY+.44,
          headX-.12,chest
        ],

        ["Q",
          frontX+.08,chest+.02,
          frontX+.08,frontFootY-.08
        ],

        ["Q",
          frontX+.05,frontFootY+.03,
          frontX+.13,frontFootY
        ],

        ["Q",
          frontX,frontFootY+.07,
          frontX-.10,frontFootY
        ],

        ["Q",
          frontX-.16,frontFootY-.01,
          frontX-.18,frontFootY-.08
        ],

        ["Q",
          frontX-.12,chest+.08,
          frontX-.20,belly
        ],

        ["Q",
          .02,belly+.03,
          rearX+.10,belly-.02
        ],

        ["Q",
          rearX-.05,belly-.01,
          rearX-.10,rearFootY-.08
        ],

        ["Q",
          rearX-.12,rearFootY+.03,
          rearX-.04,rearFootY
        ],

        ["Q",
          rearX-.14,rearFootY+.07,
          rearX-.25,rearFootY
        ],

        ["Q",
          rearX-.31,rearFootY-.01,
          rearX-.30,rearFootY-.08
        ],

        ["Q",
          rearX-.20,belly-.04,
          -bodyW*.78,.28
        ],

        ["Q",
          -bodyW-.02,.25,
          -bodyW,rump
        ],

        ["Z"]
      ]);

      /*
       * 遠側の脚は暗い面として内部へ重ねる。
       * 独立した棒として描かず、連続外周を補助する。
       */
      ctx.fillStyle=shade(fill,.67);

      ctx.beginPath();
      ctx.moveTo(
        (rearX+.04)*r,
        .18*r
      );
      ctx.quadraticCurveTo(
        (rearX+.02)*r,
        (rearFootY-.03)*r,
        (rearX+.08)*r,
        rearFootY*r
      );
      ctx.quadraticCurveTo(
        (rearX+.17)*r,
        (rearFootY+.01)*r,
        (rearX+.20)*r,
        .18*r
      );
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(
        (frontX+.05)*r,
        .17*r
      );
      ctx.quadraticCurveTo(
        (frontX+.02)*r,
        (frontFootY-.03)*r,
        (frontX+.08)*r,
        frontFootY*r
      );
      ctx.quadraticCurveTo(
        (frontX+.17)*r,
        (frontFootY+.01)*r,
        (frontX+.21)*r,
        .18*r
      );
      ctx.closePath();
      ctx.fill();

      /*
       * 口吻・鼻は顔の立体情報として追加する。
       * 頭部そのものを別の楕円で描かない。
       */
      ctx.fillStyle=light;
      ctx.beginPath();
      ctx.ellipse(
        (headX+.18)*r,
        (headY+.12)*r,
        Math.max(.12,muzzleW*.72)*r,
        Math.max(.07,muzzleW*.48)*r,
        0,
        0,
        Math.PI*2
      );
      ctx.fill();

      ctx.fillStyle=shade(fill,.45);
      ctx.beginPath();
      ctx.ellipse(
        muzzleX*r,
        (headY+.10)*r,
        Math.max(.035,muzzleW*.20)*r,
        Math.max(.025,muzzleW*.13)*r,
        0,
        0,
        Math.PI*2
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
      frontLegH=legH,
      legW=.055,
      muzzleW=.16,
      walkPhase=0
    }={})=>{
      const rearFootWave=
        gaitFootWave(walkPhase);

      const frontFootWave=
        gaitFootWave(
          walkPhase+
          Math.PI/2
        );

      const stride=Math.sin(walkPhase*2);
      const counterStride=-stride;

      let headX=.54;
      let headY=-.29;
      let muzzleX=.72;
      let chest=.29;
      let belly=.34;
      let rump=.15;

      let rearX=-.40+stride*.065;
      let frontX=.30+counterStride*.055;

      let rearFootY=
        .18+
        legH+
        rearFootWave.lift*
        legH*
        .045;

      let frontFootY=
        .18+
        frontLegH+
        frontFootWave.lift*
        frontLegH*
        .045;

      if(kind==="rabbit"){
        headX=.56;
        headY=-.30;
        muzzleX=.76;
        chest=.30;
        belly=.35;
        rump=.16;
        rearX=-.43+stride*.07;
        frontX=.31+counterStride*.055;

      }else if(kind==="squirrel"){
        headX=.52;
        headY=-.27;
        muzzleX=.70;
        chest=.28;
        belly=.32;
        rump=.15;
        rearX=-.38+stride*.06;
        frontX=.30+counterStride*.05;

      }else if(kind==="monkey"){
        headX=.55;
        headY=-.29;
        muzzleX=.73;
        chest=.30;
        belly=.34;
        rump=.15;
        rearX=-.37+stride*.065;
        frontX=.30+counterStride*.055;
      }

      const footDepth=Math.max(.055,legW*.72);
      const footWidth=Math.max(.10,legW*1.55);

      const outline=[
        ["M",-bodyW,.14+rump],

        ["Q",
          -bodyW-.04,-.02,
          -bodyW*.72,-.22
        ],

        ["Q",
          -bodyW*.38,-bodyH-.04,
          -.04,-bodyH
        ],

        ["Q",
          .18,-bodyH-.01,
          .31,-.18
        ],

        ["Q",
          .40,-.18,
          headX-.12,headY+.01
        ]
      ];

      if(kind==="rabbit"){
        outline.push(
          ["Q",
            headX-.10,
            headY-.18,
            headX-.04,
            headY-.40
          ],

          ["L",
            headX-.02,
            headY-.82
          ],

          ["Q",
            headX+.04,
            headY-.92,
            headX+.10,
            headY-.78
          ],

          ["L",
            headX+.15,
            headY-.39
          ],

          ["Q",
            headX+.24,
            headY-.45,
            headX+.31,
            headY-.31
          ]
        );

      }else{
        outline.push(
          ["Q",
            headX-.03,
            headY-.15,
            headX+.09,
            headY-.17
          ],

          ["Q",
            headX+.24,
            headY-.18,
            headX+.31,
            headY-.05
          ]
        );
      }

      outline.push(
        ["Q",
          headX+.40,
          headY-.01,
          muzzleX,
          headY+.05
        ],

        ["Q",
          muzzleX+.09,
          headY+.11,
          muzzleX+.02,
          headY+.19
        ],

        ["Q",
          muzzleX-.05,
          headY+.27,
          headX+.28,
          headY+.26
        ],

        ["Q",
          headX+.15,
          headY+.31,
          headX+.07,
          chest
        ],

        ["Q",
          headX-.02,
          chest+.08,
          .42,
          .12
        ],

        ["Q",
          .40,
          .18,
          frontX,
          .24
        ],

        ["Q",
          frontX,
          frontFootY-.08,
          frontX,
          frontFootY-footDepth
        ],

        ["Q",
          frontX,
          frontFootY,
          frontX-footWidth*.52,
          frontFootY
        ],

        ["L",
          frontX-footWidth*.08,
          frontFootY
        ],

        ["Q",
          frontX-footWidth*.34,
          frontFootY-.01,
          frontX-footWidth*.34,
          frontFootY-footDepth
        ],

        ["L",
          frontX-footWidth*.34,
          .20
        ],

        ["Q",
          .08,
          .29,
          rearX+.08,
          belly
        ],

        ["Q",
          rearX-.05,
          belly,
          rearX-.08,
          rearFootY-footDepth
        ],

        ["Q",
          rearX-.08,
          rearFootY,
          rearX-footWidth*.52,
          rearFootY
        ],

        ["L",
          rearX-footWidth*.04,
          rearFootY
        ],

        ["Q",
          rearX-.04,
          rearFootY-.02,
          rearX-.04,
          rearFootY-footDepth
        ],

        ["L",
          rearX-.04,
          .17
        ],

        ["Q",
          -bodyW*.78,
          .28,
          -bodyW,
          .14+rump
        ],

        ["Z"]
      );

      path(outline);

      /*
       * 遠側の脚は身体内部の暗部として表現する。
       */
      ctx.fillStyle=shade(fill,.66);

      for(const [x,y] of [
        [rearX+.07,rearFootY],
        [frontX+.07,frontFootY]
      ]){
        ctx.beginPath();

        ctx.moveTo(
          (x-.02)*r,
          .18*r
        );

        ctx.quadraticCurveTo(
          (x-.02)*r,
          (y-.03)*r,
          (x+.05)*r,
          y*r
        );

        ctx.quadraticCurveTo(
          (x+.14)*r,
          (y+.01)*r,
          (x+.17)*r,
          .18*r
        );

        ctx.closePath();
        ctx.fill();
      }

      /*
       * 胸・肩の面。
       */
      ctx.fillStyle=shade(fill,.80);

      ctx.beginPath();

      ctx.moveTo(
        -bodyW*.34*r,
        -bodyH*.34*r
      );

      ctx.quadraticCurveTo(
        .02*r,
        -bodyH*.42*r,
        .34*r,
        -.13*r
      );

      ctx.quadraticCurveTo(
        .30*r,
        .08*r,
        .38*r,
        .18*r
      );

      ctx.quadraticCurveTo(
        .08*r,
        .14*r,
        -bodyW*.25*r,
        .04*r
      );

      ctx.closePath();
      ctx.fill();

      /*
       * 口吻面。
       */
      ctx.fillStyle=light;

      ctx.beginPath();

      ctx.ellipse(
        (headX+.18)*r,
        (headY+.11)*r,
        Math.max(.11,muzzleW*.72)*r,
        Math.max(.065,muzzleW*.45)*r,
        0,
        0,
        Math.PI*2
      );

      ctx.fill();

      /*
       * 鼻。
       */
      ctx.fillStyle=shade(fill,.45);

      ctx.beginPath();

      ctx.ellipse(
        muzzleX*r,
        (headY+.10)*r,
        Math.max(.03,muzzleW*.20)*r,
        Math.max(.022,muzzleW*.13)*r,
        0,
        0,
        Math.PI*2
      );

      ctx.fill();

      /*
       * 目。
       */
      eye(
        headX+.08,
        headY-.16,
        .040
      );

      /*
       * monkeyは顔面を少し明確化する。
       */
      if(kind==="monkey"){
        ctx.fillStyle=light;

        ctx.beginPath();

        ctx.ellipse(
          (headX+.18)*r,
          (headY+.12)*r,
          .15*r,
          .11*r,
          0,
          0,
          Math.PI*2
        );

        ctx.fill();
      }

      /*
       * 口角。
       */
      ctx.strokeStyle=shade(fill,.48);
      ctx.lineWidth=Math.max(.8,r*.022);

      ctx.beginPath();

      ctx.moveTo(
        (headX+.10)*r,
        (headY+.22)*r
      );

      ctx.quadraticCurveTo(
        (headX+.26)*r,
        (headY+.27)*r,
        (muzzleX-.01)*r,
        (headY+.17)*r
      );

      ctx.stroke();

      ctx.strokeStyle=stroke;
      ctx.lineWidth=Math.max(1,r*.045);
    };

    const large=({
      kind="standard",
      bodyW=.78,
      bodyH=.40,
      head=.30,
      legH=.58,
      legW=.075,
      muzzleW=.21,
      walkPhase=phase
    }={})=>{
      const rearFootWave=
        gaitFootWave(walkPhase);

      const frontFootWave=
        gaitFootWave(
          walkPhase+
          Math.PI/2
        );

      const stride=Math.sin(walkPhase*2);
      const counterStride=-stride;

      let headX=.58;
      let headY=-.36;
      let muzzleX=.82;
      let neckTop=-.24;
      let chest=.30;
      let belly=.34;
      let rump=.13;

      if(kind==="horse"||kind==="pack"){
        headX=.60;
        headY=-.38;
        muzzleX=.94;
        neckTop=-.58;
        chest=.34;
        belly=.35;
        rump=.11;
      }else if(kind==="deer"){
        headX=.63;
        headY=-.43;
        muzzleX=.94;
        neckTop=-.64;
        chest=.34;
        belly=.33;
        rump=.11;
      }else if(kind==="camel"){
        headX=.61;
        headY=-.43;
        muzzleX=.91;
        neckTop=-.61;
        chest=.36;
        belly=.36;
        rump=.12;
      }else if(kind==="alpaca"){
        headX=.61;
        headY=-.41;
        muzzleX=.90;
        neckTop=-.54;
        chest=.35;
        belly=.35;
        rump=.12;
      }else if(kind==="goat"){
        headX=.58;
        headY=-.35;
        muzzleX=.86;
        neckTop=-.48;
        chest=.32;
        belly=.34;
        rump=.13;
      }else if(kind==="ox"){
        headX=.55;
        headY=-.30;
        muzzleX=.81;
        neckTop=-.25;
        chest=.36;
        belly=.37;
        rump=.15;
      }else if(kind==="boar"){
        headX=.59;
        headY=-.27;
        muzzleX=.90;
        neckTop=-.23;
        chest=.33;
        belly=.35;
        rump=.16;
      }else if(kind==="capybara"){
        headX=.63;
        headY=-.26;
        muzzleX=.94;
        neckTop=-.20;
        chest=.33;
        belly=.38;
        rump=.17;
      }else if(kind==="sheep"){
        headX=.56;
        headY=-.30;
        muzzleX=.80;
        neckTop=-.27;
        chest=.34;
        belly=.37;
        rump=.15;
      }else if(kind==="bear"){
        headX=.56;
        headY=-.27;
        muzzleX=.78;
        neckTop=-.19;
        chest=.36;
        belly=.36;
        rump=.16;
      }

      const rearOuterX=-.49+stride*.085;
      const rearInnerX=-.34+stride*.060;
      const frontOuterX=.43+counterStride*.085;
      const frontInnerX=.29+counterStride*.060;

      /*
       * 大型動物も犬科・猫科等と同じ正式gait stateを使用する。
       * 足高さを単純な連続sinだけで決めず、
       * PLANTED/LIFT/SWING/LANDの接地状態へ接続する。
       */
      const rearFootWave=
        gaitFootWave(walkPhase);

      const frontFootWave=
        gaitFootWave(
          walkPhase+
          Math.PI/2
        );

      const rearFootY=
        .10+
        legH+
        rearFootWave.lift*
        legH*
        .045;

      const frontFootY=
        .10+
        legH+
        frontFootWave.lift*
        legH*
        .045;

      const footDepth=Math.max(.055,legW*.70);
      const footWidth=Math.max(.105,legW*1.45);

      const outline=[
        ["M",-bodyW,.13+rump],
        ["Q",-bodyW-.03,-.01,-bodyW*.82,-.18]
      ];

      if(kind==="camel"){
        outline.push(
          ["Q",-bodyW*.58,-bodyH*.88,-.30,-bodyH*.90],
          ["Q",-bodyW*.32,-bodyH*1.18,-.10,-bodyH*.96],
          ["Q",.04,-bodyH*1.12,.18,-bodyH*.80]
        );
      }else{
        outline.push(
          ["Q",-bodyW*.58,-bodyH*.88,-.24,-bodyH],
          ["Q",.00,-bodyH-.03,.22,-bodyH*.72]
        );
      }

      outline.push(
        ["Q",.31,-bodyH*.50,.35,neckTop],

        ["Q",.40,neckTop-.03,headX-.12,headY+.03],
        ["Q",headX-.03,headY-.13,headX+.10,headY-.16],
        ["Q",headX+.22,headY-.13,headX+.32,headY-.02],

        ["Q",headX+.43,headY-.01,muzzleX,headY+.02],
        ["Q",muzzleX+.09,headY+.09,muzzleX+.02,headY+.17],
        ["Q",muzzleX-.05,headY+.25,headX+.30,headY+.25],

        ["Q",headX+.18,headY+.31,headX+.10,chest],
        ["Q",headX+.03,chest+.08,.45,.10],

        ["Q",.45,.18,frontOuterX,.28],
        ["Q",frontOuterX,frontFootY-.10,frontOuterX,frontFootY-footDepth],
        ["Q",
          frontOuterX,
          frontFootY,
          frontOuterX-footWidth*.52,
          frontFootY
        ],
        ["L",frontInnerX+footWidth*.40,frontFootY],
        ["Q",
          frontInnerX,
          frontFootY,
          frontInnerX,
          frontFootY-footDepth
        ],
        ["L",frontInnerX,.20],

        ["Q",.12,.29,-.20,.28+belly*.04],
        ["Q",-.30,.26,rearInnerX,.19],

        ["L",rearInnerX,rearFootY-footDepth],
        ["Q",
          rearInnerX,
          rearFootY,
          rearInnerX-footWidth*.42,
          rearFootY
        ],
        ["L",rearOuterX-footWidth*.50,rearFootY],
        ["Q",
          rearOuterX,
          rearFootY,
          rearOuterX,
          rearFootY-footDepth
        ],
        ["L",rearOuterX,.13+rump],

        ["Q",-bodyW*.86,.30,-bodyW,.13+rump],
        ["Z"]
      );

      path(outline);

      /*
       * 遠側の脚を身体内部の暗部として表現する。
       */
      ctx.fillStyle=shade(fill,.66);

      for(const [x,y] of [
        [rearOuterX+.055,rearFootY],
        [frontOuterX+.055,frontFootY]
      ]){
        ctx.beginPath();
        ctx.moveTo((x-.015)*r,.18*r);
        ctx.quadraticCurveTo(
          (x-.015)*r,
          (y-.035)*r,
          (x+.055)*r,
          y*r
        );
        ctx.quadraticCurveTo(
          (x+.15)*r,
          (y+.01)*r,
          (x+.17)*r,
          .18*r
        );
        ctx.closePath();
        ctx.fill();
      }

      /*
       * 胸・肩の面。
       */
      ctx.fillStyle=shade(fill,.80);

      ctx.beginPath();
      ctx.moveTo(-bodyW*.40*r,-bodyH*.34*r);
      ctx.quadraticCurveTo(
        .05*r,
        -bodyH*.45*r,
        .34*r,
        -.16*r
      );
      ctx.quadraticCurveTo(
        .31*r,
        .08*r,
        .40*r,
        .21*r
      );
      ctx.quadraticCurveTo(
        .10*r,
        .15*r,
        -bodyW*.28*r,
        .04*r
      );
      ctx.closePath();
      ctx.fill();

      if(kind==="camel"){
        ctx.fillStyle=shade(fill,.76);
        ctx.beginPath();
        ctx.moveTo(-.30*r,-.70*r);
        ctx.quadraticCurveTo(
          -.12*r,-1.00*r,
          .08*r,-.70*r
        );
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle=shade(fill,.84);

      for(const [x,y] of [
        [rearOuterX,rearFootY],
        [frontOuterX,frontFootY]
      ]){
        ctx.beginPath();
        ctx.ellipse(
          x*r,
          y*r,
          footWidth*.72*r,
          footDepth*.34*r,
          0,
          0,
          Math.PI*2
        );
        ctx.fill();
      }

      /*
       * 顔面補助。
       * 頭部本体は連続外周で成立している。
       */
      ctx.fillStyle=light;
      ctx.beginPath();
      ctx.ellipse(
        (headX+.18)*r,
        (headY+.12)*r,
        Math.max(.11,muzzleW*.70)*r,
        Math.max(.065,muzzleW*.45)*r,
        0,
        0,
        Math.PI*2
      );
      ctx.fill();

      ctx.fillStyle=shade(fill,.45);
      ctx.beginPath();
      ctx.ellipse(
        muzzleX*r,
        (headY+.10)*r,
        Math.max(.032,muzzleW*.20)*r,
        Math.max(.022,muzzleW*.13)*r,
        0,
        0,
        Math.PI*2
      );
      ctx.fill();

      eye(
        headX+.08,
        headY-.18,
        .044
      );

      ctx.strokeStyle=shade(fill,.48);
      ctx.lineWidth=Math.max(.8,r*.022);

      ctx.beginPath();
      ctx.moveTo(
        (headX+.12)*r,
        (headY+.23)*r
      );
      ctx.quadraticCurveTo(
        (headX+.31)*r,
        (headY+.29)*r,
        (muzzleX-.01)*r,
        (headY+.18)*r
      );
      ctx.stroke();

      ctx.strokeStyle=stroke;
      ctx.lineWidth=Math.max(1,r*.045);
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

    if(k==="hound"){
      canine({
        kind:"hound",
        bodyW:.84,
        bodyH:.39,
        neck:.055,
        head:.31,
        muzzleW:.30,
        muzzleH:.14,
        legH:.46,
        legW:.080,
        belly:.045,
        walkPhase:phase
      });
    }else if(k==="dog"){
      canine({
        kind:"dog",
        bodyW:.78,
        bodyH:.39,
        neck:.10,
        head:.28,
        muzzleW:.23,
        muzzleH:.13,
        legH:.40,
        legW:.085,
        belly:.05,
        walkPhase:phase
      });
    }else if(k==="golden"){
      canine({
        kind:"golden",
        bodyW:.86,
        bodyH:.43,
        neck:.075,
        head:.30,
        muzzleW:.24,
        muzzleH:.14,
        legH:.41,
        legW:.100,
        belly:.065,
        walkPhase:phase
      });
    }else if(k==="wolf"){
      canine({
        kind:"wolf",
        bodyW:.82,
        bodyH:.43,
        neck:.14,
        head:.31,
        muzzleW:.28,
        muzzleH:.15,
        legH:.48,
        legW:.080,
        belly:.025,
        walkPhase:phase
      });
    }else if(k==="fox"){
      canine({
        kind:"fox",
        bodyW:.65,
        bodyH:.33,
        neck:.045,
        head:.27,
        muzzleW:.29,
        muzzleH:.12,
        legH:.44,
        legW:.052,
        belly:.025,
        walkPhase:phase
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
,        walkPhase:phase
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
,        walkPhase:phase
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
,        walkPhase:phase
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
,        walkPhase:phase
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
,        walkPhase:phase
      });
    }else if(k==="bear"){
      /*
       * クマはlarge()の連続外周を基礎にする。
       * 口吻を独立した楕円として重ねず、bearFeatures()で
       * 頭部から自然につながる顔面構造を追加する。
       */
      large({
        bodyW:.86,
        bodyH:.49,
        head:.35,
        legH:.34,
        legW:.11,
        muzzleW:.25,
        walkPhase:phase
      });

      ctx.fillStyle=fill;
    }else if([
      "tiger","leopard","cat","lynx"
    ].includes(k)){
      feline({
        kind:k,
        bodyW:k==="tiger"?.76:k==="cat"?.62:k==="lynx"?.68:.70,
        bodyH:k==="tiger"?.44:k==="lynx"?.39:.38,
        head:k==="tiger"?.31:k==="lynx"?.29:.27,
        muzzleW:k==="tiger"?.19:k==="lynx"?.18:.17,
        legH:k==="tiger"?.43:k==="lynx"?.42:.40,
        legW:k==="tiger"?.072:k==="lynx"?.062:.060,
        earH:k==="lynx"?.20:.17,
        walkPhase:phase
      });
    }else if(k==="pack"){
      large({
        kind:"pack",
        bodyW:.74,
        bodyH:.42,
        head:.30,
        legH:.58,
        legW:.065,
        muzzleW:.24,
        walkPhase:phase
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
        muzzleW:.23,
        walkPhase:phase
      });
    }else if(k==="deer"){
      large({
        kind:"deer",
        bodyW:.70,
        bodyH:.32,
        head:.25,
        legH:.70,
        legW:.045,
        muzzleW:.20,
        walkPhase:phase
      });
    }else if(k==="camel"){
      /*
       * ラクダはlarge()の連続外周を身体の主構造として維持する。
       * コブは独立した楕円を2個重ねず、背中へ連続接続した
       * 一つの面として描くことで、身体から生えた自然な形状にする。
       */
      large({
        kind:"camel",
        bodyW:.86,
        bodyH:.43,
        head:.28,
        legH:.62,
        legW:.06,
        muzzleW:.22,
        walkPhase:phase
      });
    }else if(k==="ox"){
      large({
        kind:"ox",
        bodyW:.86,
        bodyH:.48,
        head:.33,
        legH:.36,
        legW:.10,
        muzzleW:.25,
        walkPhase:phase
      });
    }else if(k==="boar"){
      large({
        kind:"boar",
        bodyW:.88,
        bodyH:.47,
        head:.31,
        legH:.31,
        legW:.105,
        muzzleW:.30,
        walkPhase:phase
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
        muzzleW:.28,
        walkPhase:phase
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
        muzzleW:.20,
        walkPhase:phase
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
        bodyW:.61,
        bodyH:.33,
        head:.25,
        legH:.47,
        frontLegH:.29,
        legW:.065,
        walkPhase:phase
      });
    }else if(k==="squirrel"){
      smallMammal({
        kind:"squirrel",
        bodyW:.63,
        bodyH:.29,
        head:.23,
        legH:.40,
        frontLegH:.34,
        legW:.055,
        walkPhase:phase
      });
    }else if(k==="monkey"){
      smallMammal({
        kind:"monkey",
        bodyW:.66,
        bodyH:.36,
        head:.28,
        legH:.49,
        frontLegH:.46,
        legW:.060,
        walkPhase:phase
      });
    }else if([
      "bird","eagle","owl","crow","kite","cormorant","penguin"
    ].includes(k)){
      bird({
        kind:k,
        bodyW:
          k==="eagle" ? .72 :
          k==="cormorant" ? .58 :
          k==="owl" ? .56 :
          k==="kite" ? .55 :
          k==="crow" ? .58 :
          k==="penguin" ? .56 :
          .54,
        bodyH:
          k==="penguin" ? .66 :
          k==="cormorant" ? .60 :
          k==="owl" ? .56 :
          k==="eagle" ? .52 :
          k==="crow" ? .46 :
          k==="kite" ? .45 :
          .44,
        head:
          k==="owl" ? .33 :
          k==="eagle" ? .30 :
          k==="cormorant" ? .23 :
          k==="crow" ? .25 :
          k==="kite" ? .23 :
          k==="penguin" ? .25 :
          .22,
        beak:
          k==="eagle" ? 1.22 :
          k==="cormorant" ? 1.24 :
          k==="crow" ? 1.10 :
          k==="kite" ? 1.16 :
          k==="bird" ? 1.02 :
          .90,
        belly:
          k==="penguin" ? .64 :
          k==="cormorant" ? .54 :
          k==="owl" ? .53 :
          k==="eagle" ? .50 :
          .45
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
      /*
       * コウモリは「翼＋楕円胴」ではなく、
       * 頭部・胸腹部・左右翼膜を連続したシルエットとして描く。
       * 小さい表示でも哺乳類の胴体と翼膜の接続が読めることを優先する。
       */

      const wingPulse=
        Math.sin(phase*2.8)*.035;

      path([
        /* 左翼の付け根 */
        ["M",-.10,-.18],

        /* 左翼上縁 */
        ["Q",-.34,-.34,-.58,-.58],
        ["Q",-.82,-.82,-1.10,-.48],

        /* 左翼外縁 */
        ["Q",-1.02,-.20,-.88,.02],
        ["Q",-.74,.20,-.54,.30],

        /* 左翼膜下縁 */
        ["Q",-.72,.18,-.82,.38],
        ["Q",-.60,.30,-.40,.22],
        ["Q",-.28,.17,-.16,.08],

        /* 胸部 */
        ["Q",-.18,.34,-.10,.48],
        ["Q",0,.62,.10,.48],
        ["Q",.18,.34,.16,.08],

        /* 右翼膜下縁 */
        ["Q",.28,.17,.40,.22],
        ["Q",.60,.30,.82,.38],
        ["Q",.72,.18,.54,.30],

        /* 右翼外縁 */
        ["Q",.74,.20,.88,.02],
        ["Q",1.02,-.20,1.10,-.48],
        ["Q",.82,-.82,.58,-.58],
        ["Q",.34,-.34,.10,-.18],

        /* 右首 */
        ["Q",.14,-.02,.13,.12],

        /* 胴体・頭部 */
        ["Q",.12,.24,.10,.30],
        ["Q",.05,.36,0,.38],
        ["Q",-.05,.36,-.10,.30],
        ["Q",-.12,.24,-.13,.12],
        ["Q",-.14,-.02,-.10,-.18],

        ["Z"]
      ]);

      /*
       * 翼膜の内側を面として補強する。
       * 棒状の線だけで翼を表現しない。
       */
      ctx.fillStyle=shade(fill,.72);

      ctx.beginPath();
      ctx.moveTo(-.14*r,-.08*r);
      ctx.quadraticCurveTo(
        -.48*r,
        (-.28+wingPulse)*r,
        -.88*r,
        -.36*r
      );
      ctx.quadraticCurveTo(
        -.66*r,
        -.12*r,
        -.38*r,
        .14*r
      );
      ctx.quadraticCurveTo(
        -.24*r,
        .08*r,
        -.14*r,
        -.08*r
      );
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(.14*r,-.08*r);
      ctx.quadraticCurveTo(
        .48*r,
        (-.28-wingPulse)*r,
        .88*r,
        -.36*r
      );
      ctx.quadraticCurveTo(
        .66*r,
        -.12*r,
        .38*r,
        .14*r
      );
      ctx.quadraticCurveTo(
        .24*r,
        .08*r,
        .14*r,
        -.08*r
      );
      ctx.closePath();
      ctx.fill();

      /*
       * 顔の向きを面で明確化する。
       * 頭部そのものを楕円として追加しない。
       */
      ctx.fillStyle=shade(fill,.88);
      ctx.beginPath();
      ctx.moveTo(-.11*r,-.18*r);
      ctx.quadraticCurveTo(
        -.08*r,-.34*r,
        0,-.39*r
      );
      ctx.quadraticCurveTo(
        .08*r,-.34*r,
        .11*r,-.18*r
      );
      ctx.quadraticCurveTo(
        .08*r,-.10*r,
        0,-.05*r
      );
      ctx.quadraticCurveTo(
        -.08*r,-.10*r,
        -.11*r,-.18*r
      );
      ctx.closePath();
      ctx.fill();

      eye(-.055,-.21,.032);
      eye(.055,-.21,.032);

      ctx.strokeStyle=shade(fill,.42);
      ctx.lineWidth=Math.max(.7,r*.020);

      /* 鼻口 */
      ctx.beginPath();
      ctx.moveTo(-.025*r,-.09*r);
      ctx.quadraticCurveTo(
        0,-.055*r,
        .025*r,-.09*r
      );
      ctx.stroke();

      ctx.strokeStyle=stroke;
      ctx.lineWidth=Math.max(1,r*.045);
    }else if(k==="snake"){
      /*
       * 蛇は頭部から胴体・尾まで連続する細長い輪郭で描く。
       * 楕円頭部を別部品として追加しない。
       */
      const wave=[];
      const segments=18;

      for(let i=0;i<=segments;i++){
        const p=i/segments;
        const xx=-.98+p*1.94;
        const yy=
          Math.sin(phase+i*.62)*
          .13*
          (.55+p*.45);

        wave.push([xx,yy]);
      }

      const width=.105;

      ctx.beginPath();

      ctx.moveTo(
        wave[0][0]*r,
        (wave[0][1]-width)*r
      );

      for(let i=1;i<=segments;i++){
        ctx.lineTo(
          wave[i][0]*r,
          (
            wave[i][1]-
            width*(1-.18*i/segments)
          )*r
        );
      }

      ctx.quadraticCurveTo(
        1.00*r,-.10*r,
        1.12*r,-.03*r
      );

      ctx.quadraticCurveTo(
        1.20*r,.02*r,
        1.12*r,.10*r
      );

      ctx.quadraticCurveTo(
        1.02*r,.18*r,
        .91*r,.13*r
      );

      for(let i=segments;i>=0;i--){
        ctx.lineTo(
          wave[i][0]*r,
          (
            wave[i][1]+
            width*(1-.18*i/segments)
          )*r
        );
      }

      ctx.closePath();

      ctx.fillStyle=fill;
      ctx.fill();
      ctx.stroke();

      /* 口吻 */
      ctx.fillStyle=shade(fill,.84);
      ctx.beginPath();
      ctx.moveTo(.86*r,-.02*r);
      ctx.quadraticCurveTo(
        1.08*r,.00*r,
        1.20*r,.08*r
      );
      ctx.quadraticCurveTo(
        1.08*r,.15*r,
        .88*r,.11*r
      );
      ctx.closePath();
      ctx.fill();

      /* 顎線 */
      ctx.strokeStyle=shade(fill,.42);
      ctx.lineWidth=Math.max(.8,r*.022);
      ctx.beginPath();
      ctx.moveTo(.94*r,.09*r);
      ctx.quadraticCurveTo(
        1.08*r,.16*r,
        1.18*r,.09*r
      );
      ctx.stroke();

      /* 左右の目 */
      eye(1.05,-.075,.028);
      eye(1.05,.075,.028);

      /* 二股の舌 */
      ctx.strokeStyle="#d66b58";
      ctx.lineWidth=Math.max(.8,r*.018);
      ctx.beginPath();
      ctx.moveTo(1.16*r,.08*r);
      ctx.lineTo(1.34*r,.03*r);
      ctx.moveTo(1.16*r,.08*r);
      ctx.lineTo(1.34*r,.13*r);
      ctx.stroke();

      ctx.strokeStyle=stroke;
      ctx.lineWidth=Math.max(1,r*.045);
    }else if(k==="spider"){
      /*
       * 蜘蛛は頭胸部・腹部・8脚・触肢を一体の動物として読める
       * 連続輪郭で描き、旧来の楕円2個＋単純な8本線には戻さない。
       */

      /* 頭胸部 */
      path([
        ["M",-.48,.12],
        ["Q",-.52,-.08,-.40,-.25],
        ["Q",-.25,-.43,.02,-.42],
        ["Q",.24,-.41,.34,-.25],
        ["Q",.42,-.08,.32,.10],
        ["Q",.18,.22,-.06,.24],
        ["Q",-.32,.24,-.48,.12],
        ["Z"]
      ]);

      /* 腹部 */
      ctx.fillStyle=shade(fill,.82);
      ctx.beginPath();
      ctx.moveTo(.12*r,-.10*r);
      ctx.quadraticCurveTo(.34*r,-.34*r,.66*r,-.27*r);
      ctx.quadraticCurveTo(.98*r,-.17*r,1.02*r,.10*r);
      ctx.quadraticCurveTo(.98*r,.36*r,.70*r,.46*r);
      ctx.quadraticCurveTo(.36*r,.50*r,.12*r,.28*r);
      ctx.quadraticCurveTo(-.02*r,.08*r,.12*r,-.10*r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      /* 腹部中央面 */
      ctx.fillStyle=shade(fill,.68);
      ctx.beginPath();
      ctx.moveTo(.34*r,-.08*r);
      ctx.quadraticCurveTo(.62*r,-.20*r,.86*r,-.10*r);
      ctx.quadraticCurveTo(.94*r,.10*r,.82*r,.29*r);
      ctx.quadraticCurveTo(.60*r,.38*r,.38*r,.28*r);
      ctx.quadraticCurveTo(.28*r,.10*r,.34*r,-.08*r);
      ctx.closePath();
      ctx.fill();

      /* 8脚 */
      ctx.strokeStyle=stroke;
      ctx.lineWidth=Math.max(1,r*.045);
      ctx.lineCap="round";
      ctx.lineJoin="round";

      const legs=[
        [-.28,-.16,-.62,-.42,-1.02,-.54],
        [-.38,-.04,-.76,-.16,-1.12,-.04],
        [-.40,.08,-.78,.16,-1.08,.38],
        [-.28,.18,-.56,.48,-.78,.78],
        [.16,-.14,.50,-.42,.88,-.58],
        [.26,-.02,.66,-.16,1.08,-.08],
        [.28,.10,.70,.18,1.06,.42],
        [.20,.22,.50,.50,.72,.76]
      ];

      /*
       * 蜘蛛は8脚を同じphaseで動かさない。
       *
       * 現在の8本の脚配置をそのまま基準にし、
       * 左右交互＋前後の位相差だけを加える。
       *
       * 新しい脚DBや保存データは作らない。
       */
      for(
        let i=0;
        i<legs.length;
        i++
      ){
        const [
          x0,y0,
          x1,y1,
          x2,y2
        ]=legs[i];

        const legPhase=
          phase+
          (
            i%2===0
              ? 0
              : Math.PI
          )+
          (
            Math.floor(i/2)*
            Math.PI/4
          );

        const footWave=
          gaitFootWave(
            legPhase
          );

        const lift=
          footWave.lift*
          .10;

        const stride=
          Math.sin(
            legPhase*2
          )*
          .055;

        /*
         * 先端だけを上下させず、
         * 中間関節と足先を同時に少量追従させる。
         * 既存の2つの曲線区間構造は維持する。
         */
        const bend=
          Math.sin(
            legPhase*2
          )*
          .035;

        ctx.beginPath();

        ctx.moveTo(
          x0*r,
          y0*r
        );

        ctx.quadraticCurveTo(
          (x1+stride)*r,
          (y1-bend)*r,
          (x2+stride)*r,
          (y2-lift)*r
        );

        ctx.stroke();
      }

      /* 触肢 */
      ctx.strokeStyle=light;
      ctx.lineWidth=Math.max(.8,r*.030);

      for(const side of [-1,1]){
        ctx.beginPath();
        ctx.moveTo(.20*r,side*.08*r);
        ctx.quadraticCurveTo(.48*r,side*.16*r,.62*r,side*.10*r);
        ctx.stroke();
      }

      ctx.strokeStyle=stroke;
      ctx.lineWidth=Math.max(1,r*.045);
    }else if(k==="turtle"){
      /*
       * 亀はドーム状の甲羅・頭・四肢・尾を
       * 独立した楕円群ではなく、輪郭主体で構成する。
       */
      path([
        ["M",-1.00,.08],
        ["Q",-1.02,-.18,-.72,-.34],
        ["Q",- .36,-.54,.02,-.55],
        ["Q",.42,-.53,.76,-.34],
        ["Q",.96,-.20,1.00,.02],
        ["Q",.94,.26,.64,.38],
        ["Q",.20,.52,-.24,.48],
        ["Q",- .68,.42,-1.00,.08],
        ["Z"]
      ]);

      ctx.fillStyle=shade(fill,.70);
      ctx.fill();
      ctx.stroke();

      /* 頭 */
      ctx.fillStyle=fill;
      ctx.beginPath();
      ctx.moveTo(.66*r,-.12*r);
      ctx.quadraticCurveTo(
        .88*r,-.20*r,
        1.08*r,-.08*r
      );
      ctx.quadraticCurveTo(
        1.14*r,.00*r,
        1.04*r,.10*r
      );
      ctx.quadraticCurveTo(
        .88*r,.17*r,
        .68*r,.10*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      /* 四肢 */
      for(const side of [-1,1]){
        for(const y of [-.28,.25]){
          const sx=side*.64;
          const sy=y;

          ctx.beginPath();
          ctx.moveTo(
            (sx-.12*side)*r,
            sy*r
          );
          ctx.quadraticCurveTo(
            (sx-.22*side)*r,
            (sy+.16)*r,
            (sx-.05*side)*r,
            (sy+.25)*r
          );
          ctx.quadraticCurveTo(
            (sx+.12*side)*r,
            (sy+.22)*r,
            (sx+.13*side)*r,
            (sy+.02)*r
          );
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }

      /* 尾 */
      ctx.beginPath();
      ctx.moveTo(-.76*r,.24*r);
      ctx.lineTo(-.98*r,.38*r);
      ctx.quadraticCurveTo(
        -1.04*r,.44*r,
        -.84*r,.42*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      /* 甲羅区画 */
      ctx.fillStyle=shade(fill,.46);
      ctx.strokeStyle=light;
      ctx.lineWidth=Math.max(.8,r*.025);

      for(const x of [-.48,-.24,0,.24,.48]){
        ctx.beginPath();
        ctx.moveTo(
          x*r,
          -.43*r
        );
        ctx.quadraticCurveTo(
          (x+.05)*r,
          -.04*r,
          x*r,
          .36*r
        );
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.moveTo(-.80*r,-.04*r);
      ctx.quadraticCurveTo(
        -.40*r,-.25*r,
        0,-.18*r
      );
      ctx.quadraticCurveTo(
        .40*r,-.25*r,
        .80*r,-.04*r
      );
      ctx.stroke();

      eye(.98,-.075,.026);

      ctx.strokeStyle=stroke;
      ctx.lineWidth=Math.max(1,r*.045);
    }else if(k==="crocodile"){
      /*
       * ワニは低い胴体・長い頭部・顎・背面突起を
       * 一体の輪郭として描く。
       */
      path([
        ["M",-1.06,.12],
        ["Q",-1.08,-.12,-.78,-.25],
        ["Q",- .34,-.44,.10,-.39],
        ["Q",.44,-.38,.72,-.28],
        ["L",1.02,-.22],
        ["L",1.30,-.10],
        ["Q",1.36,-.04,1.26,.02],
        ["L",1.00,.08],
        ["Q",.76,.14,.60,.25],
        ["Q",.18,.42,-.30,.38],
        ["Q",- .74,.34,-1.06,.12],
        ["Z"]
      ]);

      ctx.fillStyle=shade(fill,.70);
      ctx.fill();
      ctx.stroke();

      /* 上顎 */
      ctx.fillStyle=shade(fill,.72);
      ctx.beginPath();
      ctx.moveTo(.62*r,-.25*r);
      ctx.quadraticCurveTo(
        .96*r,-.18*r,
        1.34*r,-.10*r
      );
      ctx.lineTo(
        1.02*r,
        -.02*r
      );
      ctx.quadraticCurveTo(
        .78*r,.02*r,
        .60*r,.02*r
      );
      ctx.closePath();
      ctx.fill();

      /* 顎線 */
      ctx.strokeStyle=shade(fill,.42);
      ctx.lineWidth=Math.max(.9,r*.025);
      ctx.beginPath();
      ctx.moveTo(.72*r,.00*r);
      ctx.quadraticCurveTo(
        1.00*r,.04*r,
        1.30*r,-.04*r
      );
      ctx.stroke();

      /* 背面の鱗突起 */
      ctx.fillStyle=shade(fill,.48);

      for(let i=0;i<7;i++){
        const x=-.58+i*.19;
        const y=
          -.31-
          Math.abs(Math.sin(i*.8))*.055;

        ctx.beginPath();
        ctx.moveTo(
          (x-.06)*r,
          y*r
        );
        ctx.lineTo(
          x*r,
          (y-.15-Math.abs(Math.sin(i))*.04)*r
        );
        ctx.lineTo(
          (x+.06)*r,
          y*r
        );
        ctx.closePath();
        ctx.fill();
      }

      /* 目 */
      eye(.99,-.22,.027);

      ctx.strokeStyle=stroke;
      ctx.lineWidth=Math.max(1,r*.045);
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

      const eyes=[
        [-.22,-.16],
        [-.08,-.22],
        [.08,-.22],
        [.22,-.16],
        [-.18,-.05],
        [-.06,-.08],
        [.06,-.08],
        [.18,-.05]
      ];

      for(const [x,y] of eyes){
        ctx.beginPath();
        ctx.arc(
          x*r,
          y*r,
          Math.max(.014,r*.025),
          0,
          Math.PI*2
        );
        ctx.fill();
      }

      ctx.strokeStyle=shade(fill,.38);
      ctx.lineWidth=Math.max(.7,r*.018);

      for(const side of [-1,1]){
        ctx.beginPath();
        ctx.moveTo(side*.08*r,.10*r);
        ctx.quadraticCurveTo(side*.13*r,.18*r,side*.10*r,.25*r);
        ctx.stroke();
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

    const tailBush=(x,y,flip=1,scale=1)=>{
      ctx.fillStyle=shade(fill,.94);
      ctx.beginPath();
      ctx.moveTo(x*r,y*r);
      ctx.quadraticCurveTo(
        (x-.30*flip*scale)*r,
        (y-.22*scale)*r,
        (x-.54*flip*scale)*r,
        (y-.02*scale)*r
      );
      ctx.quadraticCurveTo(
        (x-.76*flip*scale)*r,
        (y+.18*scale)*r,
        (x-.52*flip*scale)*r,
        (y+.38*scale)*r
      );
      ctx.quadraticCurveTo(
        (x-.24*flip*scale)*r,
        (y+.25*scale)*r,
        x*r,
        (y+.08*scale)*r
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    const canineFeatures=()=>{
      if(k==="wolf"){
        earPoint(.40,-.53,.12,.30,-.02);
        earPoint(.68,-.55,.12,.30,.02);

        tailBush(-.66,.18,-1);

        ctx.fillStyle=shade(fill,.55);
        ctx.beginPath();
        ctx.moveTo(-.94*r,.00*r);
        ctx.quadraticCurveTo(
          -1.02*r,.10*r,
          -.84*r,.22*r
        );
        ctx.quadraticCurveTo(
          -.74*r,.18*r,
          -.72*r,.10*r
        );
        ctx.closePath();
        ctx.fill();
      }else if(k==="fox"){
        earPoint(.39,-.51,.14,.34,-.02);
        earPoint(.68,-.53,.14,.36,.02);

        tailBush(-.64,.16,-1);

        ctx.fillStyle="rgba(248,238,218,.76)";
        ctx.beginPath();
        ctx.moveTo(-1.02*r,.06*r);
        ctx.quadraticCurveTo(
          -1.18*r,.14*r,
          -.98*r,.27*r
        );
        ctx.quadraticCurveTo(
          -.86*r,.24*r,
          -.78*r,.18*r
        );
        ctx.closePath();
        ctx.fill();
      }else if(k==="hound"){
        earDrop(.40,-.48,.13,.28,-.06);
        earDrop(.68,-.47,.13,.28,.06);

        tailCurve([
          [-.66,.18,-.96,.02],
          [-.96,.02,-1.00,-.20],
          [-1.00,-.20,-.78,-.32]
        ],.075);
      }else if(k==="golden"){
        earDrop(.40,-.46,.14,.23,-.04);
        earDrop(.69,-.45,.14,.23,.04);

        tailBush(-.64,.18,-1);
      }else if(k==="weasel"||k==="otter"){
        earRound(.42,-.50,.09,.10);
        earRound(.67,-.49,.09,.10);

        tailCurve([
          [-.66,.18,-.94,.02],
          [-.94,.02,-.96,-.24],
          [-.96,-.24,-.72,-.36]
        ],.075);
      }else if(k==="raccoon"||k==="raccoonDog"||k==="badger"){
        earRound(.39,-.52,.10,.11);
        earRound(.68,-.51,.10,.11);

        tailCurve([
          [-.66,.18,-.94,.04],
          [-.94,.04,-1.02,-.18],
          [-1.02,-.18,-.76,-.34]
        ],.085);
      }else{
        earDrop(.41,-.48,.12,.20,-.03);
        earDrop(.69,-.47,.12,.20,.03);

        tailCurve([
          [-.66,.18,-.94,.02],
          [-.94,.02,-.96,-.24],
          [-.96,-.24,-.72,-.36]
        ],.085);
      }

    };

    const felineFeatures=()=>{
      /*
       * 猫科の耳そのものは feline() の連続外周に統合済み。
       * ここでは lynx の耳先毛だけを補助ディテールとして追加する。
       */
      if(k==="lynx"){
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
      }

      tailCurve([
        [-.60,.20,-.94,.05],
        [-.94,.05,-.98,-.25],
        [-.98,-.25,-.72,-.42]
      ],k==="tiger"?.12:.085);
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

    };

    const smallFeatures=()=>{
      if(k==="rabbit"){
        /*
         * rabbitの長い耳はsmallMammal()の連続外周に統合済み。
         * 後肢を大きくした体型に合わせ、尾は小さく丸い。
         */
        tailBush(-.62,.19,-1,.68);

        ctx.fillStyle=light;
        ctx.beginPath();
        ctx.ellipse(
          -.34*r,.10*r,
          .24*r,.18*r,
          0,0,Math.PI*2
        );
        ctx.fill();
      }else if(k==="squirrel"){
        /*
         * squirrelは長い後肢＋細身の胴体＋大型の房尾を
         * silhouette上の主要識別要素として扱う。
         */
        earPoint(.39,-.51,.09,.19,-.02);
        earPoint(.66,-.51,.09,.19,.02);

        tailBush(-.57,.00,-1,1.28);

        ctx.fillStyle=light;
        ctx.beginPath();
        ctx.ellipse(
          -.02*r,.15*r,
          .27*r,.17*r,
          0,0,Math.PI*2
        );
        ctx.fill();
      }else if(k==="monkey"){
        /*
         * monkeyは小型哺乳類の中でも頭部を大きくし、
         * 長い前後肢と長い尾で霊長類らしい比率を明確化する。
         */
        earRound(.38,-.49,.14,.13);
        earRound(.69,-.49,.14,.13);

        ctx.fillStyle=light;
        ctx.beginPath();
        ctx.ellipse(
          .69*r,-.28*r,
          .21*r,.15*r,
          0,0,Math.PI*2
        );
        ctx.fill();

        ctx.fillStyle=fill;
        tailCurve([
          [-.50,.18,-.82,.02],
          [-.82,.02,-.92,-.38],
          [-.92,-.38,-.66,-.70]
        ],.070);
      }

    };

    const birdFeatures=()=>{
      /*
       * 鳥類第2段階では、色だけではなく頭部・翼・尾・脚・顔面の
       * 輪郭差を追加し、遠目でも各種が別の鳥として読める状態を作る。
       */
      if(k==="owl"){
        /* 梟：大きな顔盤＋耳角＋短い尾。 */
        ctx.fillStyle="rgba(248,242,226,.34)";
        ctx.beginPath();
        ctx.ellipse(
          .39*r,-.40*r,
          .33*r,.29*r,
          0,0,Math.PI*2
        );
        ctx.fill();
        ctx.strokeStyle=shade(fill,.58);
        ctx.lineWidth=Math.max(.8,r*.028);
        ctx.stroke();

        for(const side of [-1,1]){
          ctx.fillStyle=shade(fill,.70);
          ctx.beginPath();
          ctx.moveTo(
            (.40+side*.13)*r,
            -.62*r
          );
          ctx.lineTo(
            (.48+side*.18)*r,
            -.90*r
          );
          ctx.lineTo(
            (.57+side*.07)*r,
            -.63*r
          );
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        ctx.fillStyle="#e7c45b";
        for(const side of [-1,1]){
          ctx.beginPath();
          ctx.arc(
            (.33+side*.10)*r,
            -.45*r,
            .075*r,
            0,Math.PI*2
          );
          ctx.fill();
          ctx.stroke();
        }

        ctx.fillStyle=shade(fill,.42);
        ctx.beginPath();
        ctx.moveTo(.43*r,-.30*r);
        ctx.lineTo(.50*r,-.19*r);
        ctx.lineTo(.57*r,-.30*r);
        ctx.closePath();
        ctx.fill();
      }

      if(k==="eagle"){
        /* 鷲：太い頭・鉤状嘴・広い翼・くさび状尾。 */
        ctx.fillStyle="rgba(248,242,226,.74)";
        ctx.beginPath();
        ctx.ellipse(
          .45*r,-.46*r,
          .25*r,.22*r,
          0,0,Math.PI*2
        );
        ctx.fill();

        ctx.fillStyle=shade(fill,.38);
        ctx.beginPath();
        ctx.moveTo(.60*r,-.42*r);
        ctx.lineTo(1.22*r,-.28*r);
        ctx.quadraticCurveTo(
          1.02*r,-.18*r,
          .62*r,-.20*r
        );
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle=shade(fill,.54);
        ctx.beginPath();
        ctx.moveTo(-.28*r,.22*r);
        ctx.lineTo(-.72*r,.58*r);
        ctx.lineTo(-.28*r,.42*r);
        ctx.lineTo(-.02*r,.62*r);
        ctx.lineTo(.16*r,.28*r);
        ctx.closePath();
        ctx.fill();
      }

      if(k==="kite"){
        /* 鳶：細身の翼と明確な二股尾。 */
        ctx.fillStyle=shade(fill,.56);
        ctx.beginPath();
        ctx.moveTo(-.16*r,.18*r);
        ctx.lineTo(-.92*r,.66*r);
        ctx.lineTo(-.62*r,.18*r);
        ctx.lineTo(-.84*r,.66*r);
        ctx.lineTo(-.10*r,.28*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle=shade(fill,.45);
        ctx.lineWidth=Math.max(1,r*.035);
        ctx.beginPath();
        ctx.moveTo(-.54*r,.26*r);
        ctx.lineTo(-.90*r,.58*r);
        ctx.moveTo(-.40*r,.30*r);
        ctx.lineTo(-.74*r,.62*r);
        ctx.stroke();
      }

      if(k==="crow"){
        /* 烏：太い首・厚い嘴・短い角張った尾。 */
        ctx.fillStyle=shade(fill,.48);
        ctx.beginPath();
        ctx.ellipse(
          .32*r,-.34*r,
          .19*r,.25*r,
          0,0,Math.PI*2
        );
        ctx.fill();

        ctx.fillStyle="#202124";
        ctx.beginPath();
        ctx.moveTo(.57*r,-.49*r);
        ctx.lineTo(1.14*r,-.34*r);
        ctx.lineTo(.58*r,-.23*r);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle=shade(fill,.56);
        ctx.beginPath();
        ctx.moveTo(-.18*r,.16*r);
        ctx.lineTo(-.72*r,.28*r);
        ctx.lineTo(-.72*r,.44*r);
        ctx.lineTo(-.12*r,.30*r);
        ctx.closePath();
        ctx.fill();
      }

      if(k==="cormorant"){
        /* 鵜：長い首・細い頭・長い尾・下向きに曲がる嘴。 */
        ctx.fillStyle=shade(fill,.58);
        ctx.beginPath();
        ctx.moveTo(.20*r,-.22*r);
        ctx.quadraticCurveTo(
          .26*r,-.70*r,
          .46*r,-.82*r
        );
        ctx.quadraticCurveTo(
          .62*r,-.78*r,
          .62*r,-.30*r
        );
        ctx.lineTo(.56*r,-.10*r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle=shade(fill,.38);
        ctx.beginPath();
        ctx.moveTo(.56*r,-.60*r);
        ctx.quadraticCurveTo(
          .92*r,-.56*r,
          1.26*r,-.46*r
        );
        ctx.lineTo(.58*r,-.36*r);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle="rgba(248,242,226,.34)";
        ctx.beginPath();
        ctx.moveTo(-.12*r,.20*r);
        ctx.quadraticCurveTo(
          .02*r,.06*r,
          .20*r,.18*r
        );
        ctx.lineTo(.18*r,.34*r);
        ctx.quadraticCurveTo(
          .02*r,.30*r,
          -.12*r,.36*r
        );
        ctx.closePath();
        ctx.fill();
      }

      if(k==="penguin"){
        /* ペンギン：直立した胴体・白い腹・短い翼。 */
        ctx.fillStyle="rgba(248,242,226,.88)";
        ctx.beginPath();
        ctx.ellipse(
          .05*r,.12*r,
          .32*r,.46*r,
          0,0,Math.PI*2
        );
        ctx.fill();

        ctx.fillStyle=shade(fill,.50);
        for(const side of [-1,1]){
          ctx.beginPath();
          ctx.moveTo(
            (-.10+side*.06)*r,
            -.06*r
          );
          ctx.quadraticCurveTo(
            (-.58+side*.02)*r,
            .18*r,
            (-.46+side*.06)*r,
            .48*r
          );
          ctx.quadraticCurveTo(
            (-.18+side*.10)*r,
            .34*r,
            (-.06+side*.12)*r,
            .12*r
          );
          ctx.closePath();
          ctx.fill();
        }
      }

      if(k==="bird"){
        /* ハヤブサ：細い体・鋭い翼端・尖った尾を明確化。 */
        ctx.strokeStyle=shade(fill,.48);
        ctx.lineWidth=Math.max(1,r*.032);
        ctx.beginPath();
        ctx.moveTo(-.24*r,.18*r);
        ctx.lineTo(-.86*r,.48*r);
        ctx.lineTo(-.54*r,.14*r);
        ctx.moveTo(-.18*r,.22*r);
        ctx.lineTo(-.70*r,.56*r);
        ctx.lineTo(-.40*r,.20*r);
        ctx.stroke();
      }

      /*
       * 鳥種共通の脚。
       *
       * 鳥類も静止した2本の固定形状ではなく、
       * 既存gait phaseから前後脚の接地状態を取得する。
       * 飛行中の翼運動とは別に、地上歩行時だけ脚を動かす。
       */
      if(k!=="penguin"){
        const leftFootWave=
          gaitFootWave(
            phase
          );

        const rightFootWave=
          gaitFootWave(
            phase+
            Math.PI
          );

        const birdFoot=(x,wave)=>{
          const lift=
            wave.lift*
            .055;

          const stride=
            Math.sin(
              phase*2+
              (wave===rightFootWave?Math.PI:0)
            )*
            .025;

          ctx.beginPath();
          ctx.moveTo(
            (x+stride)*r,
            .34*r
          );
          ctx.lineTo(
            (x+.02+stride)*r,
            (.56-lift)*r
          );
          ctx.lineTo(
            (x+.11+stride)*r,
            (.56-lift)*r
          );
          ctx.lineTo(
            (x+.13+stride)*r,
            .34*r
          );
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        };

        ctx.fillStyle=fill;
        ctx.strokeStyle=appendageStroke;

        birdFoot(
          -.02,
          leftFootWave
        );

        birdFoot(
          .24,
          rightFootWave
        );
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
      /*
       * クマの顔は独立楕円を積み重ねず、
       * 頭部から前へ張り出す口吻を連続した面として描く。
       */

      earRound(.39,-.56,.13,.13);
      earRound(.69,-.55,.13,.13);

      ctx.fillStyle=light;
      ctx.beginPath();
      ctx.moveTo(.66*r,-.16*r);
      ctx.quadraticCurveTo(
        .76*r,-.28*r,
        .94*r,-.20*r
      );
      ctx.quadraticCurveTo(
        1.02*r,-.14*r,
        .96*r,-.04*r
      );
      ctx.quadraticCurveTo(
        .88*r,.05*r,
        .72*r,.01*r
      );
      ctx.quadraticCurveTo(
        .64*r,-.04*r,
        .66*r,-.16*r
      );
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle=stroke;
      ctx.lineWidth=Math.max(.7,r*.025);
      ctx.stroke();

      /*
       * 鼻は小さな面として作り、楕円を使用しない。
       */
      ctx.fillStyle=shade(fill,.38);
      ctx.beginPath();
      ctx.moveTo(.88*r,-.13*r);
      ctx.quadraticCurveTo(
        .96*r,-.11*r,
        .98*r,-.05*r
      );
      ctx.quadraticCurveTo(
        .94*r,.01*r,
        .87*r,-.01*r
      );
      ctx.quadraticCurveTo(
        .84*r,-.06*r,
        .88*r,-.13*r
      );
      ctx.closePath();
      ctx.fill();

      /*
       * 口元は鼻の下から短い曲線で接続する。
       */
      ctx.strokeStyle=shade(fill,.30);
      ctx.lineWidth=Math.max(.7,r*.020);
      ctx.beginPath();
      ctx.moveTo(.91*r,.00*r);
      ctx.quadraticCurveTo(
        .87*r,.08*r,
        .78*r,.10*r
      );
      ctx.stroke();

      tailCurve([
        [-.72,.24,-.86,.20],
        [-.86,.20,-.90,.08]
      ],.10);

    };

    const otterFeatures=()=>{
      earRound(.43,-.48,.075,.075);
      earRound(.67,-.47,.075,.075);

      tailCurve([
        [-.62,.18,-.96,.30],
        [-.96,.30,-1.08,.08],
        [-1.08,.08,-.96,-.16]
      ],.11);

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

    const stateMoving=
      state?.moving===true;

    const velocityX=
      Number(state?.vx)||0;

    const velocityY=
      Number(state?.vy)||0;

    const gait=
      gaitStateFor(
        animal,
        body,
        stateMoving,
        velocityX,
        velocityY
      );

    const phase=
      gait.phase;

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

    const bodyDirection=
      bodyDirectionFor(
        animal,
        body,
        stateMoving,
        velocityX,
        velocityY
      );

    let speciesX=0;
    let speciesBob=0;
    let speciesRotate=0;

    if(moving){
      if(body==="snake"){
        speciesX=
          Math.sin(phase*1.65)*
          r*.08;
        speciesRotate=
          Math.sin(phase*1.65)*.055;
      }else if(
        ["bird","eagle","crow","kite","cormorant","bat"]
          .includes(body)
      ){
        speciesBob=
          Math.sin(phase*2.5)*
          r*.035;
      }else if(body==="spider"){
        speciesBob=
          Math.sin(phase*2.2)*
          r*.02;
      }else if(
        ["turtle","crocodile","penguin"]
          .includes(body)
      ){
        speciesBob=
          Math.sin(phase*1.4)*
          r*.018;
      }
    }

    /*
     * 歩行中の身体上下動・横揺れも、実際のgait phaseへ接続する。
     *
     * ここでwall-clockのtを直接使うと、
     * gaitStateFor()がdt基準で更新していても、
     * 身体姿勢だけが表示FPSとは無関係な別時間軸で動いてしまう。
     *
     * speciesBob / speciesRotateは鳥・蛇・蜘蛛等の
     * 種族固有補助運動として既存処理を維持する。
     */
    const gaitBobWave=
      Math.sin(phase);

    const gaitSwayWave=
      Math.sin(
        phase*.72
      );

    const bob=
      moving
        ? (
            gaitBobWave*
            Math.max(.45,r*.055)
          )+
          speciesBob
        : 0;

    const sway=
      moving
        ? gaitSwayWave*.026+
          speciesRotate
        : 0;

    const scaleX=
      1+(variant-.5)*.10;

    const scaleY=
      1+(variant-.5)*.08;

    /*
     * 横向き基準の身体を移動方向へ向ける。
     * 上下方向へ進む場合は局所的な前後軸を軽く圧縮して
     * 2D上の奥行きを補助する。
     */
    const viewCompression=
      1-
      Math.abs(
        Math.sin(bodyDirection)
      )*.12;

    const ambient=ambientProfile();

    const lod=
      r<7
        ? 0
        : r<13
          ? 1
          : 2;

    const staticLayer=
      lod===0&&!moving
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
      bodyDirection+
      sway+
      attackPulse*.085+
      hitPulse*
      Math.sin(t*17+phase)*.055
    );
    ctx.scale(
      scaleX*viewCompression,
      scaleY
    );

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

    /*
     * 低LODの種族固有動作も歩行中はgait phaseを基準にする。
     * 攻撃・被弾・環境演出など、歩行とは別の時間演出は
     * 各既存処理側で引き続きtを使用する。
     */
    const motionPhase=
      moving
        ? phase
        : 0;



    if(lod===0&&!staticLayer){

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
