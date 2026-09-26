/* EFR unified gameplay expansion: combat, cover, AI, VFX, audio, world density. */
(() => {
  "use strict";
  const A = () => window.EFRGame;
  const C = window.EFRCombat = {
    particles: [], trails: [], impacts: [], texts: [], shake: 0,
    aim: {accuracy:1, moveSpeed:0, lastX:null, lastY:null, settling:0},
    audio: null, audioReady: false, populatedSeed: null, lastShot: 0,
    weapons: [
      ["ハンドガン",28,250,.32,12,"9mm",1.4,70],
      ["SMG",18,260,.11,30,"9mm",2.8,90],
      ["ショットガン",52,190,.8,6,"12ゲージ",4.2,80],
      ["アサルトライフル",24,300,.14,30,"5.56mm",3.6,100],
      ["マークスマンライフル",48,420,.55,10,"7.62mm",4.4,110],
      ["スナイパーライフル",95,650,1.15,5,"7.62mm",6.2,115],
      ["ボルトアクション",125,720,1.45,4,"7.62mm",6.8,120],
      ["バット",34,48,.58,0,null,2.2,80],
      ["ハンマー",42,42,.72,0,null,2.8,75],
      ["手斧",46,45,.64,0,null,2.5,70],
      ["マチェット",38,52,.42,0,null,2,85]
    ],
    ammo: [["9mm",.25],["12ゲージ",.55],["5.56mm",.3],["7.62mm",.4]],
    materials: ["鉄くず","木材","布","革","ボルト","ネジ","電子部品","バッテリー","ケーブル","ガラス","プラスチック","医療素材","火薬","接着剤","高品質金属"],
    enemyTypes: [
      {role:"melee",name:"略奪者",hp:80,speed:48,range:42,damage:10},
      {role:"rifle",name:"武装兵",hp:90,speed:34,range:300,damage:8},
      {role:"sniper",name:"狙撃兵",hp:70,speed:24,range:600,damage:24},
      {role:"scout",name:"偵察兵",hp:55,speed:62,range:220,damage:6}
    ]
  };
  const item = (name,kind,extra={}) => ({name,kind,slots:1,weight:1,...extra});
  const weapon = name => { const v=C.weapons.find(x=>x[0]===name); return v ? item(v[0],v[5]?"firearm":"weapon",{damage:v[1],range:v[2],cooldown:v[3],magSize:v[4],ammoType:v[5],weight:v[6],durability:v[7],maxDurability:v[7],ammo:0,mods:[]}) : null; };
  function rand(a,b){return a+Math.random()*(b-a)}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
  function ensureAudio(){
    if(C.audioReady)return;
    try{C.audio=new (window.AudioContext||window.webkitAudioContext)();C.audioReady=true;}catch{}
  }
  function tone(freq,dur=.06,type="square",gain=.025){
    if(!C.audioReady||!C.audio)return;
    try{const o=C.audio.createOscillator(),g=C.audio.createGain();o.type=type;o.frequency.value=freq;g.gain.value=gain;o.connect(g);g.connect(C.audio.destination);const t=C.audio.currentTime;o.start(t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.stop(t+dur);}catch{}
  }
  function addParticle(x,y,vx,vy,life=.3,size=2,kind="dust"){C.particles.push({x,y,vx,vy,life,max:life,size,kind})}
  function burst(x,y,n=8,kind="impact"){for(let i=0;i<n;i++){const a=rand(0,Math.PI*2),s=rand(25,130);addParticle(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(.18,.45),rand(1.5,4),kind)}}
  function text(x,y,t){C.texts.push({x,y,t,life:.7})}
  function distPointSegment(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy||1;const q=clamp(((px-x1)*dx+(py-y1)*dy)/l,0,1);const x=x1+dx*q,y=y1+dy*q;return Math.hypot(px-x,py-y)}
  function lineClear(from,to){return A().hasLineOfSight(from,to)}
  /* EFR precision/attack-area system v1 */
  function weaponSpread(w){
    const n=w.name||"";
    if(n.includes("スナイパー")) return 0.055;
    if(n.includes("ボルト")) return 0.045;
    if(n.includes("マークスマン")) return 0.075;
    if(n.includes("ショットガン")) return 0.20;
    if(n.includes("SMG")) return 0.13;
    if(n.includes("アサルト")) return 0.09;
    if(n.includes("ハンドガン")) return 0.075;
    return 0.16;
  }

  function meleeArc(w){
    const n=w?.name||"";
    if(n.includes("ナイフ")) return 0.34;
    if(n.includes("マチェット")) return 0.72;
    if(n.includes("バット")) return 0.62;
    if(n.includes("ハンマー")) return 0.48;
    if(n.includes("手斧")) return 0.55;
    return 0.50;
  }

  function currentSpread(w){
    const acc=C.aim.accuracy;

    let base=weaponSpread(w);

    const partSpread=
      window.EFRBaseParts
        ?window.EFRBaseParts.spreadReduction(w)
        :0;

    const partAccuracy=
      window.EFRBaseParts
        ?window.EFRBaseParts.accuracyBonus(w)
        :0;

    base*=Math.max(
      .60,
      1-partSpread
    );

    return base*
      (
        1.05-
        0.88*
        Math.min(
          1,
          acc+partAccuracy
        )
      );
  }

  function updateAimStability(dt){
    const a=A();
    if(!a?.player)return;

    const p=a.player;

    if(C.aim.lastX==null){
      C.aim.lastX=p.x;
      C.aim.lastY=p.y;
      return;
    }

    const moved=Math.hypot(
      p.x-C.aim.lastX,
      p.y-C.aim.lastY
    )/(dt||1);

    C.aim.moveSpeed=moved;
    C.aim.lastX=p.x;
    C.aim.lastY=p.y;

    const moving=moved>8;
    const target=moving ? 0 : 1;
    const rate=moving ? 3.8 : 1.15;

    C.aim.accuracy +=
      (target-C.aim.accuracy)*
      Math.min(1,rate*dt);

    if(moving){
      C.aim.settling=0;
    }else{
      C.aim.settling=Math.min(
        1,
        C.aim.settling+dt*0.9
      );
    }
  }

  function randomShotAngle(w){
    const a=A();
    const p=a.player;
    const center=Math.atan2(
      p.facingY,
      p.facingX
    );

    const spread=currentSpread(w);

    return center+
      (Math.random()*2-1)*spread;
  }

  function aimedTarget(w, shotAngle=null){
    const a=A(),p=a.player,best={e:null,s:Infinity};
    for(const e of a.enemies){if(e.dead)continue;const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;if(d>w.range+(e.r||15)||!a.playerCanSeeEnemy(e))continue;const ang=Math.atan2(dy,dx),aim=shotAngle==null?Math.atan2(p.facingY,p.facingX):shotAngle;let da=ang-aim;while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;da=Math.abs(da);const aimWindow=(w.name.includes("スナイパー")||w.name.includes("ボルト"))?.10:.22;if(da>aimWindow)continue;const score=d+da*300;if(score<best.s)best.e=e,best.s=score;}
    return best.e;
  }
  function fire(){
    const a=A();if(!a||!a.running)return false;ensureAudio();
    const w=a.equippedWeapon();if(!w)return false;
    if(w.kind!=="firearm")return a.attack();
    if((w.durability??w.maxDurability??100)<=0){a.logMessage?.("武器が壊れています");tone(110,.08,"sawtooth");return false}
    if((w.ammo||0)<=0){a.logMessage?.("弾切れ。リロードしてください");tone(90,.08,"square");return false}
    if(a.attackTimer>0)return false;
    w.ammo--;w.durability=Math.max(0,(w.durability??w.maxDurability??100)-1);a.attackTimer=w.cooldown||.3;a.attackFlash=.12;
    const p=a.player,shotAngle=randomShotAngle(w),sdx=Math.cos(shotAngle),sdy=Math.sin(shotAngle),tx=p.x+sdx*w.range,ty=p.y+sdy*w.range,t=aimedTarget(w,shotAngle);const ex=t?t.x:tx,ey=t?t.y:ty;
    C.trails.push({x1:p.x,y1:p.y,x2:ex,y2:ey,life:.11,max:.11,hit:!!t});C.shake=Math.min(10,C.shake+(w.name.includes("スナイパー")?7:2));burst(p.x+p.facingX*18,p.y+p.facingY*18,w.name.includes("ショットガン")?10:4,"muzzle");tone(w.name.includes("スナイパー")?70:150,.08,"sawtooth",.045);
    if(t){const dmg=Math.round(w.damage*(1+(w.upgradeLevel||0)*.08));t.hp-=dmg;burst(t.x,t.y,10,"impact");text(t.x,t.y-24,"-"+dmg);tone(75,.045,"square",.035);if(t.hp<=0){t.dead=true;t.loot=[item("敵の戦利品","loot",{slots:1})];burst(t.x,t.y,18,"death");}}
    else{for(const b of a.world.buildings){if(distPointSegment(b.x,b.y,p.x,p.y,ex,ey)<18||distPointSegment(b.x+b.w,b.y+b.h,p.x,p.y,ex,ey)<18){burst(ex,ey,7,"wall");break}}}
    return true;
  }
  function reload(){
    const a=A(),w=a?.equippedWeapon?.();if(!a||!w||w.kind!=="firearm")return;
    const need=(w.magSize||1)-(w.ammo||0);if(need<=0)return;
    const idx=a.player.loot.findIndex(x=>x.kind==="ammo"&&x.name===w.ammoType&&(x.amount||0)>0);
    if(idx<0){a.logMessage?.("対応弾薬がありません");return}
    const am=a.player.loot[idx],n=Math.min(need,am.amount);w.ammo=(w.ammo||0)+n;am.amount-=n;if(am.amount<=0)a.player.loot.splice(idx,1);tone(330,.12,"triangle",.03);a.renderInventory?.();
  }
  const recipes=[
    ["包帯",{"布":2,"医療素材":1},()=>item("包帯","heal",{value:20,weight:.5})],
    ["止血剤",{"布":1,"医療素材":2,"接着剤":1},()=>item("止血剤","heal",{value:35,weight:.7})],
    ["修理キット",{"鉄くず":2,"ネジ":2,"布":1},()=>item("修理キット","repair",{weight:1.2})],
    ["簡易バット",{"木材":2,"鉄くず":2,"ボルト":2},()=>item("バット","weapon",{damage:34,range:48,cooldown:.58,knockback:16,weight:2.2,durability:80,maxDurability:80,slots:2})],
    ["電子センサー",{"電子部品":2,"バッテリー":1,"ケーブル":1},()=>item("電子センサー","tool",{weight:1})]
  ];
  function materialCount(name){
    const a=A();if(!a)return 0;

    const stash=(a.save.stash||[]).reduce((n,x)=>{
      if(typeof x==="string") return n+(x===name?1:0);
      return n+(x?.name===name ? (x.amount||1) : 0);
    },0);

    const loot=(a.player.loot||[]).reduce((n,x)=>{
      return n+(x?.name===name ? (x.amount||1) : 0);
    },0);

    return stash+loot;
  }

  function takeMaterial(name,count){
    const a=A();
    let left=count;

    for(let i=a.save.stash.length-1;i>=0&&left;i--){
      const x=a.save.stash[i];

      if(
        (typeof x==="string" && x===name) ||
        (x && x.name===name)
      ){
        const amount=
          typeof x==="string"
            ? 1
            : (x.amount||1);

        if(amount<=left){
          a.save.stash.splice(i,1);
          left-=amount;
        }else{
          x.amount=amount-left;
          left=0;
        }
      }
    }

    return left===0;
  }
  function craft(name){
    const a=A(),r=recipes.find(x=>x[0]===name);if(!a||!r)return false;
    if(!Object.entries(r[1]).every(([k,v])=>materialCount(k)>=v)){a.logMessage?.("素材が不足しています");return false}
    const used=[];for(const [k,v] of Object.entries(r[1])){if(!takeMaterial(k,v)){for(const [uk,uv] of used)for(let i=0;i<uv;i++)a.save.stash.push(uk);a.logMessage?.("素材の消費に失敗しました");return false}used.push([k,v])}
    const result=r[2]();if(!a.addToBackpack(result)){for(const [k,v] of used)for(let i=0;i<v;i++)a.save.stash.push(k);return false}
    a.persist();a.renderInventory?.();return true;
  }
  function repair(slot){
    const a=A(),w=a?.save?.equipment?.[slot];if(!w)return false;
    const max=w.maxDurability||w.durability||100;if((w.durability??max)>=max)return false;
    const need=Math.max(1,Math.ceil((max-(w.durability||0))/25));if(materialCount("鉄くず")<need){a.logMessage?.("鉄くずが不足しています");return false}
    if(!takeMaterial("鉄くず",need))return false;w.durability=max;a.persist();a.renderInventory?.();return true;
  }
  function upgrade(slot){
    const a=A(),w=a?.save?.equipment?.[slot];if(!w)return false;const lv=w.upgradeLevel||0;if(lv>=3){a.logMessage?.("改造上限です");return false}
    if(materialCount("高品質金属")<lv+1||materialCount("接着剤")<1){a.logMessage?.("改造素材が不足しています");return false}
    if(!takeMaterial("高品質金属",lv+1)||!takeMaterial("接着剤",1))return false;
    w.upgradeLevel=lv+1;if(w.damage)w.damage=Math.round(w.damage*1.08);if(w.reduction)w.reduction=Math.round(w.reduction*1.08);a.persist();a.renderInventory?.();return true;
  }
  function weight(){const a=A();return (a?.player?.loot||[]).reduce((n,x)=>n+(x.weight||1)*(x.amount||1),0)}
  function weightLimit(){const a=A();return 10+((a?.save?.equipment?.backpack?.capacity||0)+4)*1.8}

  function addWorldLoot(){
    const a=A();if(!a?.world||C.populatedSeed===a.world.seed)return;C.populatedSeed=a.world.seed;
    const rng=Math.random;
    for(const b of a.world.buildings){
      const count=2+(rng()>.55?1:0);
      for(let i=0;i<count;i++){
        const roll=rng();let x;
        if(roll<.18)x=weapon(C.weapons[(rng()*C.weapons.length)|0][0]);
        else if(roll<.30){const am=C.ammo[(rng()*C.ammo.length)|0];x=item(am[0],"ammo",{amount:6+((rng()*18)|0),weight:am[1]})}
        else if(roll<.43)x=item(["包帯","止血剤","救急キット"][(rng()*3)|0],"heal",{value:[20,35,70][(rng()*3)|0],weight:1});
        else x=item(C.materials[(rng()*C.materials.length)|0],"material",{weight:1});
        if(x)a.items.push({...x,x:rand(b.x+25,b.x+b.w-25),y:rand(b.y+25,b.y+b.h-25),buildingId:b.id,taken:false});
      }
    }
    // Upgrade existing enemies into roles without replacing their core AI.
    a.enemies.forEach((e,i)=>{const t=C.enemyTypes[i%C.enemyTypes.length];Object.assign(e,t,{maxHp:t.hp,hp:t.hp,baseSpeed:t.speed,rangedCooldown:rand(1.1,2.4),rangedTimer:rand(.3,1.5),lastShotX:null,lastShotY:null});});
  }
  function enemyCombat(e,dt){
    const a=A(),p=a.player;if(e.dead)return;const d=Math.hypot(p.x-e.x,p.y-e.y)||1;
    if(!a.enemyCanSeePlayer(e))return;
    if(e.role==="melee")return;
    e.rangedTimer=(e.rangedTimer||0)-dt;if(d>e.range||e.rangedTimer>0)return;
    e.rangedTimer=e.rangedCooldown||1.5;e.lastShotX=p.x;e.lastShotY=p.y;
    C.trails.push({x1:e.x,y1:e.y,x2:p.x,y2:p.y,life:.08,max:.08,hit:true});C.shake=Math.min(6,C.shake+1);tone(e.role==="sniper"?95:120,.05,"sawtooth",.018);
    const armor=a.equippedArmor();p.hp-=Math.max(1,e.damage-(armor.reduction||0));C.texts.push({x:p.x,y:p.y-20,t:"被弾",life:.5});burst(p.x,p.y,5,"hit");
  }
  function update(dt){
    const a=A();if(!a?.running)return;updateAimStability(dt);addWorldLoot();
    for(const e of a.enemies)enemyCombat(e,dt);
    for(const p of C.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.93;p.vy*=.93;p.life-=dt}
    for(const t of C.trails)t.life-=dt;for(const t of C.texts){t.y-=22*dt;t.life-=dt}
    C.particles=C.particles.filter(p=>p.life>0);C.trails=C.trails.filter(t=>t.life>0);C.texts=C.texts.filter(t=>t.life>0);C.shake=Math.max(0,C.shake-dt*18);
  }
  function draw(){
    const a=A();if(!a?.world)return;const ctx=a.ctx, sx=C.shake?rand(-C.shake,C.shake):0,sy=C.shake?rand(-C.shake,C.shake):0;
    const p=a.player,w=a.equippedWeapon(),ang=Math.atan2(p.facingY,p.facingX),range=w?.range||42;

    // 半透明白の攻撃範囲・現在散布範囲。
    ctx.save();
    ctx.translate(sx,sy);
    ctx.globalAlpha=.12;
    ctx.fillStyle="#fff";
    ctx.strokeStyle="rgba(255,255,255,.42)";
    ctx.lineWidth=1;

    if(w?.kind==="firearm"){
      const spread=currentSpread(w);
      const start=ang-spread;
      const end=ang+spread;

      ctx.beginPath();
      ctx.moveTo(p.x,p.y);
      ctx.arc(p.x,p.y,range,start,end);
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha=.5;
      ctx.beginPath();
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(
        p.x+Math.cos(start)*range,
        p.y+Math.sin(start)*range
      );
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(
        p.x+Math.cos(ang)*range,
        p.y+Math.sin(ang)*range
      );
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(
        p.x+Math.cos(end)*range,
        p.y+Math.sin(end)*range
      );
      ctx.stroke();

    }else{
      const arc=meleeArc(w);
      const start=ang-arc/2;
      const end=ang+arc/2;

      ctx.beginPath();
      ctx.moveTo(p.x,p.y);
      ctx.arc(p.x,p.y,range,start,end);
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha=.5;
      ctx.beginPath();
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(
        p.x+Math.cos(start)*range,
        p.y+Math.sin(start)*range
      );
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(
        p.x+Math.cos(end)*range,
        p.y+Math.sin(end)*range
      );
      ctx.stroke();
    }

    ctx.globalAlpha=1;
    ctx.restore();

    ctx.save();
    ctx.translate(sx,sy);
    ctx.save();ctx.translate(sx,sy);
    // Environmental depth pass.
    for(const b of a.world.buildings){
      ctx.save();ctx.globalAlpha=.18;ctx.fillStyle="#000";ctx.fillRect(b.x+6,b.y+8,b.w,b.h);ctx.restore();
      ctx.strokeStyle="rgba(210,200,180,.18)";ctx.strokeRect(b.x+3,b.y+3,b.w-6,b.h-6);
      if(a.player.inside===b){ctx.strokeStyle="rgba(220,205,170,.5)";ctx.lineWidth=2;ctx.strokeRect(b.x+17,b.y+17,b.w-34,b.h-34);ctx.lineWidth=1;}
    }
    // Aim reticle and direction.
    const r=44;

    // 静止しているほど収束する精度リング。
    ctx.save();
    ctx.strokeStyle="rgba(255,255,255,.28)";
    ctx.setLineDash([3,4]);

    const precisionRadius =
      w?.kind==="firearm"
        ? Math.max(5,currentSpread(w)*range)
        : meleeArc(w)*range*.28;

    ctx.beginPath();
    ctx.arc(
      p.x+p.facingX*range*.82,
      p.y+p.facingY*range*.82,
      precisionRadius,
      0,
      Math.PI*2
    );
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.restore();

    ctx.strokeStyle="rgba(255,255,255,.45)";ctx.beginPath();ctx.arc(p.x+p.facingX*48,p.y+p.facingY*48,8,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x+p.facingX*35,p.y+p.facingY*35);ctx.lineTo(p.x+p.facingX*62,p.y+p.facingY*62);ctx.stroke();
    for(const t of C.trails){ctx.globalAlpha=Math.max(0,t.life/t.max);ctx.strokeStyle=t.hit?"#ffd36a":"#ddd";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(t.x1,t.y1);ctx.lineTo(t.x2,t.y2);ctx.stroke();ctx.lineWidth=1;ctx.globalAlpha=1}
    for(const q of C.particles){ctx.globalAlpha=Math.max(0,q.life/q.max);ctx.fillStyle=q.kind==="muzzle"?"#ffe49a":q.kind==="wall"?"#aaa":q.kind==="death"?"#a94444":"#ddd";ctx.beginPath();ctx.arc(q.x,q.y,q.size,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
    for(const q of C.texts){ctx.globalAlpha=Math.max(0,q.life/.7);ctx.fillStyle="#fff";ctx.font="bold 13px sans-serif";ctx.fillText(q.t,q.x-12,q.y);ctx.globalAlpha=1}
    ctx.restore();
  }
  function installControls(){
    const btn=document.getElementById("attackBtn");if(!btn||btn.dataset.efrV2)return;btn.dataset.efrV2="1";
    let active=false,lastX=0,lastY=0;
    btn.addEventListener("pointerdown",e=>{e.preventDefault();e.stopImmediatePropagation();ensureAudio();active=true;lastX=e.clientX;lastY=e.clientY;btn.setPointerCapture?.(e.pointerId);fire();},{capture:true,passive:false});
    btn.addEventListener("pointermove",e=>{if(!active)return;e.preventDefault();const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;const a=A(),p=a?.player;if(p){const ang=Math.atan2(p.facingY,p.facingX)+dx*.012;const y=clamp(Math.sin(ang)-dy*.012,-1,1);a.setAim?.(Math.cos(ang),y)}fire();},{passive:false});
    const up=e=>{active=false;try{btn.releasePointerCapture?.(e.pointerId)}catch{}};btn.addEventListener("pointerup",up,{capture:true});btn.addEventListener("pointercancel",up,{capture:true});
    btn.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();fire()},{capture:true});
    document.addEventListener("keydown",e=>{if(e.key.toLowerCase()==="r"){e.preventDefault();reload()}else if(e.code==="Space"){e.preventDefault();fire()}},{capture:true});
    document.addEventListener("pointerdown",ensureAudio,{once:false,capture:true});
  }
  window.EFRHooks={update,draw};

  window.EFRPrecision={
    get accuracy(){
      return C.aim.accuracy;
    },
    get moveSpeed(){
      return C.aim.moveSpeed;
    },
    get spread(){
      const a=A();
      return a ? currentSpread(a.equippedWeapon()) : 0;
    }
  };
  window.EFRContentExpansion={catalog:C,weapons:C.weapons,ammo:C.ammo,recipes,craft,repair,upgrade,weight,weightLimit,reload,fire};
  window.EFRCombat.fire=fire;window.EFRCombat.reload=reload;
  setInterval(installControls,100);
})();
