(() => {
  "use strict";

  const G=()=>window.EFRGame;

  const CLASS={
    melee:{name:"近接",desc:"近接戦闘に特化"},
    gunner:{name:"銃士",desc:"銃器運用に特化"},
    rogue:{name:"盗賊",desc:"機動・探索に特化"},
    mage:{name:"魔術師",desc:"魔法運用に特化"},
    support:{name:"支援",desc:"回復・支援に特化"},
    trainer:{name:"調教師",desc:"ペットとの連携に特化"}
  };

  const SPELLS=[
    {id:"fire",name:"ファイア",cost:18,cast:1.0,power:34,kind:"attack"},
    {id:"ice",name:"アイス",cost:22,cast:1.25,power:28,kind:"attack"},
    {id:"lightning",name:"ライトニング",cost:30,cast:1.7,power:52,kind:"attack"},
    {id:"heal",name:"ヒール",cost:16,cast:.9,power:28,kind:"heal"},
    {id:"guard",name:"ガード",cost:20,cast:1.1,power:0,kind:"support",effect:"defenseUp"},
    {id:"haste",name:"ヘイスト",cost:14,cast:.8,power:0,kind:"support",effect:"speedUp"}
  ];

  const MP_ITEMS=[
    {name:"魔力回復薬",kind:"mpRestore",value:35,slots:1,weight:.5},
    {name:"大魔力回復薬",kind:"mpRestore",value:70,slots:2,weight:.8}
  ];

  const BEHAVIOR_PARTS=Object.freeze({
    homing:{id:"homing",name:"ホーミング",mp:8,time:.04},
    split:{id:"split",name:"分裂",mp:10,time:.05},
    boomerang:{id:"boomerang",name:"ブーメラン",mp:9,time:.05},
    stop:{id:"stop",name:"停止",mp:6,time:.03},
    accelerate:{id:"accelerate",name:"加速",mp:5,time:.02},
    decelerate:{id:"decelerate",name:"減速",mp:5,time:.02},
    speedUp:{id:"speedUp",name:"高速化",mp:4,time:.02},
    slowDown:{id:"slowDown",name:"低速化",mp:4,time:.02},
    curveRight:{id:"curveRight",name:"右カーブ",mp:5,time:.02},
    curveLeft:{id:"curveLeft",name:"左カーブ",mp:5,time:.02},
    sine:{id:"sine",name:"蛇行",mp:6,time:.03},
    reverse:{id:"reverse",name:"反転",mp:6,time:.03},
    bounce:{id:"bounce",name:"跳弾",mp:7,time:.03},
    pierce:{id:"pierce",name:"貫通",mp:8,time:.03},
    trigger:{id:"trigger",name:"トリガー",mp:10,time:.04},
    timer:{id:"timer",name:"タイマー",mp:10,time:.04}
  });

  const EXTRA_SPELLS=[
    {id:"attackUp",name:"アタックアップ",cost:15,cast:.8,power:0,kind:"support",effect:"attackUp"},
    {id:"speedUp",name:"スピードアップ",cost:15,cast:.8,power:0,kind:"support",effect:"speedUp"},
    {id:"defenseUp",name:"ディフェンスアップ",cost:16,cast:.85,power:0,kind:"support",effect:"defenseUp"},
    {id:"slow",name:"スロー",cost:15,cast:.8,power:0,kind:"debuff",effect:"slow"},
    {id:"burn",name:"バーン",cost:18,cast:.9,power:10,kind:"debuff",effect:"burn"},
    {id:"freeze",name:"フリーズ",cost:22,cast:1.0,power:0,kind:"debuff",effect:"freeze"},
    {id:"defenseDown",name:"ディフェンスダウン",cost:16,cast:.85,power:0,kind:"debuff",effect:"defenseDown"}
  ];

  SPELLS.push(...EXTRA_SPELLS);

  const BEHAVIOR_MOVEMENT_POOL=[
    "homing",
    "split",
    "boomerang",
    "stop",
    "accelerate",
    "decelerate",
    "speedUp",
    "slowDown",
    "curveRight",
    "curveLeft",
    "sine",
    "reverse",
    "bounce",
    "pierce"
  ];

  function behaviorDefinition(id){
    return BEHAVIOR_PARTS[id] || null;
  }

  function spellDefinition(id){
    return SPELLS.find(spell=>spell.id===id) || null;
  }

  function normalizeConstruction(construction, fallbackSpells=[]){
    const source=Array.isArray(construction) && construction.length
      ? construction
      : fallbackSpells.map(spell=>({
          kind:"spell",
          id:spell.id
        }));

    return source
      .map(node=>{
        if(typeof node==="string"){
          if(spellDefinition(node)){
            return {kind:"spell",id:node};
          }

          if(behaviorDefinition(node)){
            return {kind:"behavior",id:node};
          }

          return null;
        }

        if(node?.kind==="spell" && spellDefinition(node.id)){
          return {kind:"spell",id:node.id};
        }

        if(node?.kind==="behavior" && behaviorDefinition(node.id)){
          return {kind:"behavior",id:node.id};
        }

        return null;
      })
      .filter(Boolean);
  }

  function randomConstruction(){
    const spells=randomSpells();
    const nodes=[];

    spells.forEach(spell=>{
      if(Math.random()<.38){
        const id=
          BEHAVIOR_MOVEMENT_POOL[
            Math.floor(
              Math.random()*BEHAVIOR_MOVEMENT_POOL.length
            )
          ];

        nodes.push({
          kind:"behavior",
          id
        });
      }

      nodes.push({
        kind:"spell",
        id:spell.id
      });
    });

    return nodes;
  }

  function constructionCost(construction){
    const nodes=normalizeConstruction(construction);

    return nodes.reduce((total,node)=>{
      if(node.kind==="spell"){
        return total+(spellDefinition(node.id)?.cost||0);
      }

      return total+(behaviorDefinition(node.id)?.mp||0);
    },0);
  }

  function constructionCastTime(construction){
    const nodes=normalizeConstruction(construction);

    return nodes.reduce((total,node)=>{
      if(node.kind==="spell"){
        return total+(spellDefinition(node.id)?.cast||0);
      }

      return total+(behaviorDefinition(node.id)?.time||0);
    },0);
  }

  function constructionLabel(construction){
    const nodes=normalizeConstruction(construction);

    return nodes.map(node=>{
      if(node.kind==="spell"){
        return spellDefinition(node.id)?.name || node.id;
      }

      return "["+(behaviorDefinition(node.id)?.name || node.id)+"]";
    }).join(" → ");
  }

  function compileConstruction(construction){
    const nodes=normalizeConstruction(construction);
    const shots=[];
    let pending=[];
    let payloadOwner=null;

    for(const node of nodes){
      if(node.kind==="behavior"){
        pending.push(node.id);
        continue;
      }

      const shot={
        spell:clone(spellDefinition(node.id)),
        behaviors:pending.slice(),
        payload:null
      };

      pending=[];

      if(payloadOwner){
        payloadOwner.payload=shot;
        payloadOwner=null;
      }else{
        shots.push(shot);
      }

      if(
        shot.behaviors.includes("trigger") ||
        shot.behaviors.includes("timer")
      ){
        payloadOwner=shot;
      }
    }

    return shots;
  }

  const projectiles=[];

  function projectileSpeed(spell,behaviors){
    let speed=240;

    if(spell.id==="lightning")speed=320;
    if(spell.id==="heal")speed=220;

    if(behaviors.includes("speedUp"))speed*=1.8;
    if(behaviors.includes("slowDown"))speed*=.55;

    return speed;
  }

  function findHomingTarget(projectile){
    const spell=projectile.spell;

    if(
      spell.kind==="attack" ||
      spell.kind==="debuff"
    ){
      let best=null;
      let bestDistance=Infinity;

      for(const enemy of G().enemies||[]){
        if(enemy.dead)continue;

        const distance=Math.hypot(
          enemy.x-projectile.x,
          enemy.y-projectile.y
        );

        if(
          distance<bestDistance &&
          distance<=projectile.range
        ){
          best=enemy;
          bestDistance=distance;
        }
      }

      return best;
    }

    return G().player;
  }

    const SPELL_PROJECTILE_COLORS=Object.freeze({
    fire:"#ef713f",
    ice:"#78c9f0",
    lightning:"#e7dc72",
    heal:"#71d6b5",
    guard:"#78c5ed",
    haste:"#60e6b0",
    attackUp:"#ffd166",
    speedUp:"#65e0a4",
    defenseUp:"#82c9f1",
    slow:"#a78bfa",
    burn:"#f05b45",
    freeze:"#63d8fa",
    defenseDown:"#e07ae8"
  });

  function isPlayerTargetSpell(spell){
    return spell?.kind==="heal" || spell?.kind==="support";
  }

  function modifyOutgoingDamage(damage,attacker=G()?.player){
    const amount=Math.max(0,Number(damage)||0);
    const player=G()?.player;

    if(
      !player ||
      attacker!==player ||
      Number(player.attackUpTimer||0)<=0
    ){
      return amount;
    }

    return Math.max(
      0,
      Math.round(
        amount*Math.max(1,Number(player.attackUpMultiplier)||1.25)
      )
    );
  }

  function modifyIncomingDamage(target,damage){
    const g=G();
    const amount=Math.max(0,Number(damage)||0);
    if(!target || amount<=0)return amount;

    if(
      target===g?.player &&
      Number(target.defenseUpTimer||0)>0
    ){
      return Math.max(
        1,
        amount-Math.max(0,Number(target.defenseUpReduction)||4)
      );
    }

    if(
      Array.isArray(g?.enemies) &&
      g.enemies.includes(target) &&
      Number(target.defenseDownTimer||0)>0
    ){
      return amount+Math.max(
        0,
        Number(target.defenseDownReduction)||4
      );
    }

    return amount;
  }

  function playerSpeedMultiplier(){
    const player=G()?.player;
    if(!player || Number(player.speedUpTimer||0)<=0)return 1;

    return Math.max(
      1,
      Number(player.speedUpMultiplier)||1.25
    );
  }

  function applySpellEffect(spell,target){
    const g=G();
    if(!target)return;

    const playerTarget=isPlayerTargetSpell(spell);
    if(playerTarget && target!==g.player)return;
    if(!playerTarget && target===g.player)return;

    if(spell.kind==="attack"){
      const damage=modifyOutgoingDamage(spell.power,g.player);
      if(typeof g.resolveEnemyDamage==="function"){
        g.resolveEnemyDamage(target,damage);
      }else{
        g.applyDamage?.(target,damage);
      }
      return;
    }

    if(spell.kind==="heal"){
      target.hp=Math.min(
        Number(target.maxHp||100),
        Number(target.hp||0)+Number(spell.power||0)
      );
      return;
    }

    const effect=spell.effect || ({guard:"defenseUp",haste:"speedUp"})[spell.id] || "";

    if(effect==="attackUp"){
      target.attackUpTimer=8;
      target.attackUpMultiplier=1.25;
      return;
    }

    if(effect==="speedUp"){
      target.speedUpTimer=8;
      target.speedUpMultiplier=1.25;
      return;
    }

    if(effect==="defenseUp"){
      target.defenseUpTimer=8;
      target.defenseUpReduction=4;
      return;
    }

    if(effect==="slow"){
      target.slowTimer=5;
      target.slowMultiplier=.5;
      return;
    }

    if(effect==="burn"){
      target.burnTimer=5;
      target.burnDamage=Number(spell.power||10);
      target.burnTick=.5;
      return;
    }

    if(effect==="freeze"){
      target.freezeTimer=2;
      return;
    }

    if(effect==="defenseDown"){
      target.defenseDownTimer=5;
      target.defenseDownReduction=4;
    }
  }

  function updateStatusEffects(dt){
    const g=G();
    if(!g)return;
    const delta=Math.max(0,Number(dt)||0);
    const player=g.player;

    for(const key of ["attackUpTimer","speedUpTimer","defenseUpTimer"]){
      const remaining=Number(player?.[key]||0);
      if(remaining>0)player[key]=Math.max(0,remaining-delta);
    }

    for(const enemy of g.enemies||[]){
      for(const key of ["slowTimer","freezeTimer","defenseDownTimer"]){
        const remaining=Number(enemy[key]||0);
        if(remaining>0)enemy[key]=Math.max(0,remaining-delta);
      }

      const burnRemaining=Math.max(0,Number(enemy.burnTimer)||0);
      if(burnRemaining<=0)continue;

      const tickRemaining=Math.max(0,Number(enemy.burnTick??.5)-delta);
      if(tickRemaining<=0){
        enemy.burnTick=.5;
        if(!enemy.dead && Number(enemy.hp||0)>0){
          const burnDamage=Math.max(1,Number(enemy.burnDamage||1));
          if(typeof g.resolveEnemyDamage==="function"){
            g.resolveEnemyDamage(enemy,burnDamage);
          }else{
            g.applyDamage?.(enemy,burnDamage);
          }
        }
      }else{
        enemy.burnTick=tickRemaining;
      }

      enemy.burnTimer=Math.max(0,burnRemaining-delta);
    }
  }

  function spawnProjectile(shot,x,y,angle,originX=x,originY=y){
    const behaviors=shot.behaviors||[];
    const spell=shot.spell;
    const range=Number(G().activeStaffRange||330);
    const selfTarget=isPlayerTargetSpell(spell);

    const projectile={
      x,
      y,
      originX,
      originY,
      vx:Math.cos(angle),
      vy:Math.sin(angle),
      angle,
      speed:projectileSpeed(spell,behaviors),
      baseSpeed:projectileSpeed(spell,behaviors),
      range,
      traveled:0,
      age:0,
      spell,
      behaviors,
      payload:shot.payload,
      stopped:behaviors.includes("stop"),
      stopTimer:behaviors.includes("stop")?.45:0,
      returning:false,
      returned:false,
      turnDistance:0,
      hitTargets:new Set(),
      payloadReleased:false,
      payloadTimer:behaviors.includes("timer")?.8:null,
      selfTarget,
      returningToCaster:false,
      selfReturnDistance:Math.min(52,Math.max(28,range*.18))
    };

    projectiles.push(projectile);
  }

function spawnShot(shot,x,y,angle){
    const split=shot.behaviors.includes("split") ? 2 : 1;

    for(let i=0;i<split;i++){
      const offset=
        split===1
          ? 0
          : (i===0 ? -.16 : .16);

      spawnProjectile(
        shot,
        x,
        y,
        angle+offset,
        x,
        y
      );
    }
  }

  function releasePayload(projectile){
    if(
      projectile.payloadReleased ||
      !projectile.payload
    ){
      return;
    }

    projectile.payloadReleased=true;

    spawnShot(
      projectile.payload,
      projectile.x,
      projectile.y,
      projectile.angle
    );
  }

    function hitProjectileTarget(projectile,target){
    if(!target)return false;

    const isPlayer=target===G().player;
    if(isPlayerTargetSpell(projectile.spell)!==isPlayer)return false;

    const key=isPlayer?"player":target;
    if(projectile.hitTargets.has(key))return false;
    projectile.hitTargets.add(key);

    applySpellEffect(projectile.spell,target);

    if(projectile.payload)releasePayload(projectile);

    return projectile.selfTarget || !projectile.behaviors.includes("pierce");
  }

  function updateProjectiles(dt){
    const g=G();
    if(!g || (!g.running && !window.EFRTraining?.isActive?.())){
      projectiles.length=0;
      return;
    }

    const delta=Math.max(0,Number(dt)||0);

    for(let i=projectiles.length-1;i>=0;i--){
      const p=projectiles[i];
      p.age+=delta;

      if(p.payloadTimer!==null && !p.payloadReleased){
        p.payloadTimer-=delta;
        if(p.payloadTimer<=0)releasePayload(p);
      }

      if(p.stopped){
        p.stopTimer-=delta;
        if(p.stopTimer<=0){
          p.stopped=false;
        }else{
          continue;
        }
      }

      if(p.selfTarget && !p.returningToCaster && p.traveled>=p.selfReturnDistance){
        p.returningToCaster=true;
      }

      if((!p.selfTarget || p.returningToCaster) && p.behaviors.includes("homing")){
        const target=findHomingTarget(p);
        if(target){
          const targetAngle=Math.atan2(target.y-p.y,target.x-p.x);
          let deltaAngle=targetAngle-p.angle;
          while(deltaAngle>Math.PI)deltaAngle-=Math.PI*2;
          while(deltaAngle<-Math.PI)deltaAngle+=Math.PI*2;
          p.angle+=Math.max(-.09,Math.min(.09,deltaAngle));
        }
      }

      if(p.behaviors.includes("accelerate")){
        p.speed=Math.min(p.baseSpeed*2.2,p.speed+180*delta);
      }
      if(p.behaviors.includes("decelerate")){
        p.speed=Math.max(p.baseSpeed*.35,p.speed-120*delta);
      }
      if(p.behaviors.includes("curveRight"))p.angle+=.55*delta;
      if(p.behaviors.includes("curveLeft"))p.angle-=.55*delta;
      if(p.behaviors.includes("sine"))p.angle+=Math.sin(p.age*8)*.025;

      if(p.behaviors.includes("reverse") && !p.returning && p.traveled>=p.range*.5){
        p.angle+=Math.PI;
        p.returning=true;
      }

      if(p.behaviors.includes("boomerang") && !p.selfTarget && !p.returning && p.traveled>=p.range*.5){
        p.returning=true;
      }

      if(p.behaviors.includes("boomerang") && !p.selfTarget && p.returning){
        const returnAngle=Math.atan2(p.originY-p.y,p.originX-p.x);
        p.angle=returnAngle;
        if(Math.hypot(p.originX-p.x,p.originY-p.y)<18){
          projectiles.splice(i,1);
          continue;
        }
      }

      if(p.selfTarget && p.returningToCaster){
        p.angle=Math.atan2(g.player.y-p.y,g.player.x-p.x);
      }

      p.vx=Math.cos(p.angle);
      p.vy=Math.sin(p.angle);
      const step=p.speed*delta;
      const nextX=p.x+p.vx*step;
      const nextY=p.y+p.vy*step;

      if(g.blocked?.({x:nextX,y:nextY,r:5})){
        if(p.selfTarget && !p.returningToCaster){
          p.returningToCaster=true;
          if(p.payload && !p.payloadReleased)releasePayload(p);
          continue;
        }

        if(!p.selfTarget && p.behaviors.includes("bounce")){
          p.angle+=Math.PI;
          p.vx=Math.cos(p.angle);
          p.vy=Math.sin(p.angle);
          p.x+=p.vx*4;
          p.y+=p.vy*4;
          continue;
        }

        if(p.payload && !p.payloadReleased)releasePayload(p);
        projectiles.splice(i,1);
        continue;
      }

      p.x=nextX;
      p.y=nextY;
      p.traveled+=step;
      let remove=false;

      if(!p.selfTarget){
        for(const enemy of g.enemies||[]){
          if(enemy.dead)continue;
          const distance=Math.hypot(enemy.x-p.x,enemy.y-p.y);
          if(distance<=enemy.r+7){
            if(hitProjectileTarget(p,enemy))remove=true;
            if(remove)break;
          }
        }
      }

      if(!remove && p.selfTarget && p.returningToCaster){
        const playerDistance=Math.hypot(g.player.x-p.x,g.player.y-p.y);
        if(playerDistance<=g.player.r+7){
          hitProjectileTarget(p,g.player);
          remove=true;
        }
      }

      if(
        !remove &&
        p.traveled>=p.range &&
        !p.behaviors.includes("boomerang") &&
        !(p.selfTarget && p.returningToCaster)
      ){
        if(p.payload && !p.payloadReleased)releasePayload(p);
        if(p.selfTarget){
          p.returningToCaster=true;
        }else{
          remove=true;
        }
      }

      if(remove)projectiles.splice(i,1);
    }

    updateStatusEffects(delta);
  }

  function drawProjectiles(){
    const g=G();
    if(!g?.running)return;
    const ctx=g.ctx;

    for(const p of projectiles){
      const color=SPELL_PROJECTILE_COLORS[p.spell.id] ||
        (isPlayerTargetSpell(p.spell)?"#71d6b5":"#b16be8");
      const trailLength=Math.max(18,Math.min(34,12+(Number(p.speed)||240)*.055));

      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(p.angle);
      ctx.shadowBlur=p.stopped?6:16;
      ctx.shadowColor=color;
      ctx.lineCap="round";

      const trail=ctx.createLinearGradient(-trailLength,0,4,0);
      trail.addColorStop(0,"rgba(255,255,255,0)");
      trail.addColorStop(.38,color);
      trail.addColorStop(.82,color);
      trail.addColorStop(1,"#fff8e8");
      ctx.strokeStyle=trail;
      ctx.lineWidth=p.spell.id==="lightning"?4.5:3.5;
      ctx.beginPath();
      ctx.moveTo(-trailLength,0);
      ctx.lineTo(2,0);
      ctx.stroke();

      ctx.strokeStyle="rgba(255,255,255,.76)";
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(-trailLength*.64,0);
      ctx.lineTo(0,0);
      ctx.stroke();

      ctx.fillStyle=color;
      ctx.beginPath();
      ctx.ellipse(0,0,p.spell.id==="lightning"?7:6,4,0,0,Math.PI*2);
      ctx.fill();

      ctx.fillStyle="#fff8e8";
      ctx.beginPath();
      ctx.arc(1,0,2.1,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

function clearProjectiles(){
    projectiles.length=0;
  }

  function clone(x){
    return x ? JSON.parse(JSON.stringify(x)) : x;
  }

  function tap(button,handler){
    const g=G();

    if(g?.bindTap){
      g.bindTap(button,handler);
    }else if(button){
      button.onclick=handler;
    }
  }

  function ensureState(){
    const g=G();
    if(!g)return;

    g.save.player=g.save.player || {
      level:1,
      xp:0,
      classId:"melee"
    };

    if(!CLASS[g.save.player.classId]){
      g.save.player.classId="melee";
    }

    const p=g.player;

    p.maxHp=p.maxHp || 100;
    p.maxMP=p.maxMP || 100;

    if(typeof p.mp!=="number"){
      p.mp=p.maxMP;
    }

    p.mp=Math.max(0,Math.min(p.maxMP,p.mp));
  }

  function randomSpells(){
    const pool=SPELLS.slice();

    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [pool[i],pool[j]]=[pool[j],pool[i]];
    }

    const count=1+Math.floor(Math.random()*3);

    return pool.slice(0,count).map(clone);
  }

  function makeStaff(){
    const spells=randomSpells();

    return {
      name:"魔法の杖",
      kind:"weapon",
      slotType:"weapon",
      magicStaff:true,
      damage:24,
      baseDamage:24,
      weaponLevel:1,
      range:330,
      cooldown:1.2,
      durability:90,
      maxDurability:90,
      weight:2,
      slots:2,
      spells,
      construction:randomConstruction()
    };
  }

  function ensureStaff(staff){
    if(!staff?.magicStaff)return staff;

    if(
      !Array.isArray(staff.spells) ||
      staff.spells.length<1 ||
      staff.spells.length>3
    ){
      staff.spells=randomSpells();
    }

    const normalized=normalizeConstruction(
      staff.construction,
      staff.spells
    );

    if(
      !normalized.length ||
      !normalized.some(node=>node.kind==="spell")
    ){
      staff.construction=staff.spells.map(spell=>({
        kind:"spell",
        id:spell.id
      }));
    }else{
      staff.construction=normalized;
    }

    staff.spells=staff.construction
      .filter(node=>node.kind==="spell")
      .map(node=>clone(spellDefinition(node.id)));

    return staff;
  }

  function activeStaff(){
    const g=G();

    if(!g)return null;

    const staff=
      g.save.equipment["weapon"+g.activeWeaponSlot];

    return staff?.magicStaff
      ? ensureStaff(staff)
      : null;
  }

  function nearestTarget(range){
    const g=G();
    const p=g.player;

    let best=null;
    let bestDistance=Infinity;

    for(const enemy of g.enemies){
      if(enemy.dead)continue;

      const d=Math.hypot(
        enemy.x-p.x,
        enemy.y-p.y
      );

      if(
        d<=range+(enemy.r||15) &&
        d<bestDistance &&
        g.playerCanSeeEnemy(enemy)
      ){
        best=enemy;
        bestDistance=d;
      }
    }

    return best;
  }

  function spendMP(cost){
    const g=G();

    if(g.player.mp<cost){
      g.logMessage("MPが不足しています");
      return false;
    }

    g.player.mp-=cost;

    return true;
  }

  function useSpell(staff,construction){
    const g=G();
    const p=g.player;
    const staffMax=Number(staff.maxDurability||90);

    if(
      (!g.running && !window.EFRTraining?.isActive?.()) ||
      p.casting
    )return;

    ensureStaff(staff);

    const nodes=normalizeConstruction(construction);
    const cost=constructionCost(nodes);
    const cast=constructionCastTime(nodes);

    if(
      !window.EFRTraining?.isActive?.() &&
      !spendMP(cost)
    )return;

    p.casting=true;

    const started=performance.now();
    const duration=cast*1000;

    const bar=document.getElementById("efrCastBar");
    const fill=document.getElementById("efrCastProgress");
    const label=document.getElementById("efrCastSpell");

    if(bar)bar.classList.remove("hidden");
    if(label){
      label.textContent=
        constructionLabel(nodes)+
        " / "+
        cost+
        "MP";
    }

    const tick=()=>{
      if(!g.running){
        p.casting=false;
        return;
      }

      const ratio=Math.min(
        1,
        (performance.now()-started)/duration
      );

      if(fill){
        fill.style.width=(ratio*100)+"%";
      }

      if(ratio<1){
        requestAnimationFrame(tick);
        return;
      }

      p.casting=false;

      if(!window.EFRTraining?.isActive?.()){
        staff.durability=Math.max(
          0,
          Number(staff.durability??staffMax)-1
        );
      }

      g.activeStaffRange=Number(staff.range||330);

      const shots=compileConstruction(nodes);

      for(const shot of shots){
        spawnShot(
          shot,
          p.x,
          p.y,
          Math.atan2(
            p.facingY,
            p.facingX
          )
        );
      }

      if(fill){
        fill.style.width="0%";
      }

      g.renderInventory?.();
      render();
    };

    requestAnimationFrame(tick);
    render();
  }

  function castSpell(index){
    ensureState();

    const g=G();
    const staff=activeStaff();

    if(!staff){
      g.logMessage("魔法の杖を装備してください");
      return;
    }

    const staffMax=Number(staff.maxDurability||90);
    const staffDurability=Number(staff.durability??staffMax);

    if(
      !window.EFRTraining?.isActive?.() &&
      staffDurability<=0
    ){
      g.logMessage("杖が壊れています。整備台で修理してください");
      return;
    }

    ensureStaff(staff);

    const construction=
      staff.construction?.length
        ? staff.construction
        : staff.spells?.map(spell=>({
            kind:"spell",
            id:spell.id
          }));

    if(!construction?.length){
      g.logMessage("魔法構築がありません");
      return;
    }

    useSpell(staff,construction);
  }

  function useMpItem(index){
    const g=G();
    const item=g.player.loot[index];

    if(!item || item.kind!=="mpRestore"){
      return false;
    }

    if(g.player.mp>=g.player.maxMP){
      g.logMessage("MPは満タンです");
      return false;
    }

    g.player.mp=Math.min(
      g.player.maxMP,
      g.player.mp+(item.value||0)
    );

    g.player.loot.splice(index,1);

    g.renderInventory?.();
    render();

    return true;
  }

  function updateHud(){

    const g=G();

    if(!g)return;

    const mp=document.getElementById("efrMp");
    const cls=document.getElementById("efrClass");
    const lv=document.getElementById("efrLevel");

    if(mp){
      mp.textContent=
        Math.round(g.player.mp)+
        "/"+
        Math.round(g.player.maxMP);
    }

    if(cls){
      cls.textContent=
        CLASS[g.save.player?.classId]?.name ||
        "Melee / 近接";
    }

    if(lv){
      lv.textContent=
        g.save.player?.level || 1;
    }

    const bar=document.getElementById("efrCastBar");

    if(bar){
      bar.classList.toggle(
        "hidden",
        !g.player.casting
      );
    }

    const spells=document.getElementById(
      "efrSpellButtons"
    );

    const staff=activeStaff();

    if(spells){

      if(!staff){
        spells.innerHTML="";
      }else{

        ensureStaff(staff);

        const construction=staff.construction||[];
        const cost=constructionCost(construction);
        const cast=constructionCastTime(construction);

        spells.innerHTML=
          '<button class="efrSpellButton" '+
          'data-spell-index="0" '+
          (g.player.casting ? "disabled":"")+
          '>'+
          constructionLabel(construction)+
          '<br>'+
          cost+
          'MP / '+
          cast.toFixed(2)+
          '秒'+
          '</button>';

      }
    }

    const baseClass=
      document.getElementById(
        "efrBaseClass"
      );

    if(baseClass){
      baseClass.textContent=
        CLASS[g.save.player?.classId]?.name ||
        "Melee / 近接";
    }
  }

  function renderClassPanel(){

    const g=G();

    if(!g?.save?.player){
      return;
    }

    document
      .querySelectorAll(".efrClassCard")
      .forEach(card=>{
        card.classList.toggle(
          "active",
          card.dataset.class===
          g.save.player.classId
        );
      });
  }

  let staffEditorStaff=null;
  let staffEditorConstruction=[];

  function ensureStaffEditorPanel(){
    let panel=document.getElementById("efrStaffEditor");
    if(panel)return panel;

    panel=document.createElement("section");
    panel.id="efrStaffEditor";
    panel.className="efrStaffEditor hidden";

    panel.innerHTML=`
      <div class="efrStaffEditorWindow">
        <div class="efrStaffEditorHead">
          <div>
            <h2>杖を編集</h2>
            <div id="efrStaffEditorMeta" class="loadoutMeta"></div>
          </div>
          <button type="button" data-staff-editor-close>閉じる</button>
        </div>

        <p class="efrStaffEditorGuide">
          杖は1本につき1つの魔法構築を持ちます。
          挙動パーツは「次の魔法」に適用されます。
        </p>

        <div id="efrStaffEditorNodes" class="efrStaffEditorNodes"></div>

        <div class="efrStaffEditorInsert">
          <label>
            追加位置
            <select id="efrStaffEditorInsertIndex"></select>
          </label>
        </div>

        <div class="efrStaffEditorChoiceBox">
          <h3>魔法を追加</h3>
          <div id="efrStaffEditorSpells" class="efrStaffEditorChoices"></div>
        </div>

        <div class="efrStaffEditorChoiceBox">
          <h3>挙動パーツを追加</h3>
          <div id="efrStaffEditorBehaviors" class="efrStaffEditorChoices"></div>
        </div>

        <div class="efrStaffEditorFoot">
          <button type="button" data-staff-editor-clear>全消去</button>
          <span></span>
          <button type="button" data-staff-editor-cancel>キャンセル</button>
          <button type="button" class="primary" data-staff-editor-save>保存</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.addEventListener("click",event=>{
      const close=event.target.closest("[data-staff-editor-close]");
      if(close){
        closeStaffEditor();
        return;
      }

      const cancel=event.target.closest("[data-staff-editor-cancel]");
      if(cancel){
        closeStaffEditor();
        return;
      }

      const clear=event.target.closest("[data-staff-editor-clear]");
      if(clear){
        staffEditorConstruction=[];
        renderStaffEditor();
        return;
      }

      const addSpell=event.target.closest("[data-staff-add-spell]");
      if(addSpell){
        insertStaffEditorNode({
          kind:"spell",
          id:addSpell.dataset.staffAddSpell
        });
        return;
      }

      const addBehavior=event.target.closest("[data-staff-add-behavior]");
      if(addBehavior){
        insertStaffEditorNode({
          kind:"behavior",
          id:addBehavior.dataset.staffAddBehavior
        });
        return;
      }

      const remove=event.target.closest("[data-staff-remove]");
      if(remove){
        staffEditorConstruction.splice(
          Number(remove.dataset.staffRemove),
          1
        );
        renderStaffEditor();
        return;
      }

      const move=event.target.closest("[data-staff-move]");
      if(move){
        const index=Number(move.dataset.staffIndex);
        const direction=Number(move.dataset.staffMove);
        const next=index+direction;

        if(
          index>=0 &&
          index<staffEditorConstruction.length &&
          next>=0 &&
          next<staffEditorConstruction.length
        ){
          [
            staffEditorConstruction[index],
            staffEditorConstruction[next]
          ]=[
            staffEditorConstruction[next],
            staffEditorConstruction[index]
          ];
          renderStaffEditor(next);
        }

        return;
      }

      if(event.target.id==="efrStaffEditorInsertIndex"){
        return;
      }

      const save=event.target.closest("[data-staff-editor-save]");
      if(save){
        saveStaffEditor();
      }
    });

    return panel;
  }

  function editableStaffConstruction(){
    const nodes=normalizeConstruction(staffEditorConstruction);
    let lastSpell=-1;

    nodes.forEach((node,index)=>{
      if(node.kind==="spell")lastSpell=index;
    });

    return lastSpell<0
      ? []
      : nodes.slice(0,lastSpell+1);
  }

  function insertStaffEditorNode(node){
    const select=document.getElementById("efrStaffEditorInsertIndex");
    const raw=Number(select?.value);
    const index=Number.isInteger(raw)
      ?Math.max(
          0,
          Math.min(
            raw,
            staffEditorConstruction.length
          )
        )
      :staffEditorConstruction.length;

    staffEditorConstruction.splice(index,0,node);
    renderStaffEditor(index+1);
  }

  function renderStaffEditor(selectedIndex=null){
    const panel=ensureStaffEditorPanel();
    const nodes=document.getElementById("efrStaffEditorNodes");
    const meta=document.getElementById("efrStaffEditorMeta");
    const select=document.getElementById("efrStaffEditorInsertIndex");
    const spells=document.getElementById("efrStaffEditorSpells");
    const behaviors=document.getElementById("efrStaffEditorBehaviors");

    if(!nodes||!meta||!select||!spells||!behaviors)return;

    const normalized=normalizeConstruction(staffEditorConstruction);
    staffEditorConstruction=normalized;

    const cost=constructionCost(normalized);
    const cast=constructionCastTime(normalized);

    meta.textContent=
      "合計 "+
      cost+
      "MP / 詠唱 "+
      cast.toFixed(2)+
      "秒 / ノード "+
      normalized.length;

    if(normalized.length){
      nodes.innerHTML=normalized.map((node,index)=>{
        const definition=
          node.kind==="spell"
            ?spellDefinition(node.id)
            :behaviorDefinition(node.id);

        const prefix=node.kind==="spell"
          ?"魔法"
          :"挙動";

        const costLabel=node.kind==="spell"
          ?(definition?.cost||0)+"MP"
          :(definition?.mp||0)+"MP";

        const timeLabel=
          (definition?.cast??definition?.time??0).toFixed(2)+"秒";

        return `
          <article class="efrStaffEditorNode ${node.kind}">
            <div class="efrStaffEditorNodeOrder">${index+1}</div>
            <div class="efrStaffEditorNodeMain">
              <strong>${prefix}：${definition?.name||node.id}</strong>
              <small>${costLabel} / +${timeLabel}</small>
            </div>
            <div class="efrStaffEditorNodeActions">
              <button type="button" data-staff-move="-1" data-staff-index="${index}" ${index===0?"disabled":""}>↑</button>
              <button type="button" data-staff-move="1" data-staff-index="${index}" ${index===normalized.length-1?"disabled":""}>↓</button>
              <button type="button" data-staff-remove="${index}">削除</button>
            </div>
          </article>
        `;
      }).join("");
    }else{
      nodes.innerHTML='<div class="efrStaffEditorEmpty">まだ構成がありません。魔法を1つ以上追加してください。</div>';
    }

    const safeSelected=
      Number.isInteger(selectedIndex)
        ?Math.max(
            0,
            Math.min(
              selectedIndex,
              normalized.length
            )
          )
        :Math.min(
            Number(select.value||normalized.length),
            normalized.length
          );

    select.innerHTML=Array.from(
      {length:normalized.length+1},
      (_,index)=>{
        const label=
          index===0
            ?"先頭に追加"
            :index===normalized.length
              ?"末尾に追加"
              :`${index+1}番目の前`;
        return `<option value="${index}">${label}</option>`;
      }
    ).join("");

    select.value=String(safeSelected);

    spells.innerHTML=SPELLS.map(spell=>`
      <button
        type="button"
        data-staff-add-spell="${spell.id}"
      >
        ${spell.name}
        <small>${spell.cost}MP / ${spell.cast.toFixed(2)}秒</small>
      </button>
    `).join("");

    behaviors.innerHTML=Object.values(BEHAVIOR_PARTS).map(part=>`
      <button
        type="button"
        data-staff-add-behavior="${part.id}"
      >
        [${part.name}]
        <small>${part.mp}MP / +${part.time.toFixed(2)}秒</small>
      </button>
    `).join("");

    panel.classList.remove("hidden");
  }

  function openStaffEditor(staff){
    if(!staff?.magicStaff)return false;

    ensureStaff(staff);
    staffEditorStaff=staff;
    staffEditorConstruction=normalizeConstruction(
      staff.construction,
      staff.spells
    ).map(node=>({
      kind:node.kind,
      id:node.id
    }));

    renderStaffEditor();
    return true;
  }

  function saveStaffEditor(){
    if(!staffEditorStaff?.magicStaff)return false;

    const construction=editableStaffConstruction();

    if(
      !construction.some(node=>node.kind==="spell")
    ){
      G().logMessage?.("杖には魔法を1つ以上設定してください");
      return false;
    }

    staffEditorStaff.construction=construction;
    ensureStaff(staffEditorStaff);

    G().persist?.();
    G().renderInventory?.();
    render();
    window.EFRLoadout?.render?.();

    closeStaffEditor();
    G().logMessage?.("杖の構成を保存しました");
    return true;
  }

  function closeStaffEditor(){
    document
      .getElementById("efrStaffEditor")
      ?.classList.add("hidden");

    staffEditorStaff=null;
    staffEditorConstruction=[];
  }


  const CLASS_STARTER_DEFINITIONS=Object.freeze({
    melee:{kind:"recipe",name:"ナイフ"},
    gunner:{kind:"recipe",name:"ハンドガン"},
    rogue:{kind:"recipe",name:"狩猟弓"},
    mage:{kind:"staff",spellId:"fire"},
    support:{kind:"staff",spellId:"heal"},
    trainer:{kind:"none"}
  });

  function createClassStarter(classId){
    const definition=CLASS_STARTER_DEFINITIONS[classId];
    if(!definition)return null;

    if(definition.kind==="none")return null;

    if(definition.kind==="staff"){
      const spell=SPELLS.find(
        entry=>entry.id===definition.spellId
      );

      if(!spell)return null;

      const staff=makeStaff();
      staff.weaponLevel=1;
      staff.rarity=1;
      staff.spells=[clone(spell)];
      staff.construction=[{
        kind:"spell",
        id:spell.id
      }];
      ensureStaff(staff);
      return staff;
    }

    const recipes=
      window.EFRContentExpansion?.__recipes;
    const recipe=
      Array.isArray(recipes)
        ? recipes.find(
            entry=>entry?.name===definition.name &&
              typeof entry.make==="function"
          )
        : null;

    if(!recipe)return null;

    const item=recipe.make();
    if(!item)return null;

    if(G().isWeaponItem?.(item)){
      G().ensureWeaponProgression?.(item);
      item.weaponLevel=1;
      item.rarity=1;
      G().applyWeaponProgression?.(item);
    }

    return item;
  }

  function createClassStarterAmmo(item){
    if(
      !item?.ammoType ||
      Number(item.magSize||0)<=0
    ){
      return null;
    }

    const recipes=
      window.EFRContentExpansion?.__recipes;

    const recipe=
      Array.isArray(recipes)
        ? recipes.find(
            entry=>
              entry?.output?.kind==="ammo" &&
              entry?.output?.name===item.ammoType &&
              typeof entry.make==="function"
          )
        : null;

    if(!recipe)return null;

    const ammo=recipe.make();
    if(!ammo || ammo.kind!=="ammo")return null;

    ammo.amount=Math.max(
      1,
      Math.round(
        Number(item.magSize||0)*2
      )
    );

    return ammo;
  }

  function ensureClassStarter(classId){
    const g=G();
    if(!g?.save?.player)return false;

    g.save.player.classStarterGranted=
      g.save.player.classStarterGranted || {};

    if(
      Object.prototype.hasOwnProperty.call(
        g.save.player.classStarterGranted,
        classId
      )
    ){
      return false;
    }

    const definition=CLASS_STARTER_DEFINITIONS[classId];
    if(!definition)return false;

    if(definition.kind==="none"){
      g.save.player.classStarterGranted[classId]=true;
      return true;
    }

    const item=createClassStarter(classId);
    if(!item)return false;

    if(
      item.kind==="firearm" &&
      Number(item.magSize||0)>0
    ){
      item.ammo=Number(item.magSize||0);
    }

    const starterAmmo=createClassStarterAmmo(item);

    g.save.equipment=g.save.equipment || {};
    const targetSlot=["weapon1","weapon2"].find(
      slot=>!g.save.equipment[slot]
    );
    const starterAmmoFits=Boolean(
      starterAmmo&&g.backpackCanFit?.(starterAmmo)
    );
    const stashNeeded=[
      ...(!targetSlot?[item]:[]),
      ...(starterAmmo&&!starterAmmoFits?[starterAmmo]:[])
    ];

    if(
      stashNeeded.length&&
      !window.EFRBaseCore?.canAddStashItems?.(stashNeeded)
    ){
      g.logMessage?.("倉庫の空きマスが足りず、クラス装備を受け取れません");
      return false;
    }

    if(targetSlot){
      g.save.equipment[targetSlot]=item;
    }else if(!window.EFRBaseCore?.addStashItem?.(item,{silent:true})){
      g.logMessage?.("クラス装備を倉庫へ格納できません");
      return false;
    }

    if(starterAmmo){
      if(starterAmmoFits){
        if(!g.addToBackpack?.(starterAmmo)){
          if(!window.EFRBaseCore?.addStashItem?.(starterAmmo,{silent:true})){
            g.logMessage?.("予備弾を格納できませんでした");
            return false;
          }
        }
      }else if(!window.EFRBaseCore?.addStashItem?.(starterAmmo,{silent:true})){
        g.logMessage?.("予備弾を倉庫へ格納できません");
        return false;
      }
    }

    g.save.player.classStarterGranted[classId]=true;
    return true;
  }

  function render(){

    ensureState();

    const g=G();

    if(!g?.save?.player){
      return;
    }

    updateHud();
    renderClassPanel();

    const spell=
      document.getElementById(
        "efrCastSpell"
      );

    if(
      spell &&
      G().player.casting
    ){
      const staff=activeStaff();

      spell.textContent=
        staff?.spells?.[0]?.name ||
        "詠唱中";
    }
  }

  function openClassPanel(){
    document
      .getElementById("efrClassPanel")
      ?.classList.remove("hidden");

    renderClassPanel();
  }

  function closeClassPanel(){
    document
      .getElementById("efrClassPanel")
      ?.classList.add("hidden");
  }

  function setup(){

    ensureState();

    if(!document.getElementById("efrMagicHud")){

      const raid=
        document.getElementById("raidPanel");

      const hud=
        document.createElement("div");

      hud.id="efrMagicHud";
      hud.className="efrMagicHud";

      hud.innerHTML=
        '<span>Lv <strong id="efrLevel">1</strong></span>'+
        '<span>クラス <strong id="efrClass"></strong></span>'+
        '<span>MP <strong id="efrMp"></strong></span>'+
        '<div id="efrSpellButtons" class="efrSpellButtons"></div>';

      raid.insertBefore(
        hud,
        raid.querySelector("canvas")
      );

      const inventoryButton=
        document.getElementById("inventoryBtn");

      if(inventoryButton){
        inventoryButton.textContent="インベントリ";
        inventoryButton.classList.add(
          "raidInventoryHudButton"
        );
        hud.appendChild(inventoryButton);
      }

      hud.addEventListener(
        "click",
        event=>{
          const btn=
            event.target.closest(
              "[data-spell-index]"
            );

          if(!btn)return;

          castSpell(
            Number(btn.dataset.spellIndex)
          );
        }
      );

      const bar=
        document.createElement("div");

      bar.id="efrCastBar";
      bar.className="efrCastBar hidden";

      bar.innerHTML=
        "<strong>詠唱中</strong>"+
        "<div id='efrCastSpell'></div>"+
        "<div class='efrCastProgress'>"+
        "<i id='efrCastProgress'></i>"+
        "</div>";

      raid.style.position="relative";

      raid.insertBefore(
        bar,
        raid.firstChild
      );
    }

    if(!document.getElementById("efrClassPanel")){

      const cp=
        document.createElement("div");

      cp.id="efrClassPanel";
      cp.className=
        "efrClassPanel hidden";

      cp.innerHTML=
        '<div class="efrClassWindow">'+
        '<h2>クラス選択</h2>'+
        '<p>6クラスから選択できます。</p>'+
        '<div id="efrClassGrid" class="efrClassGrid"></div>'+
        '<button id="efrClassClose">閉じる</button>'+
        '</div>';

      document.body.appendChild(cp);

      const grid=
        cp.querySelector(
          "#efrClassGrid"
        );

      grid.innerHTML=
        Object.entries(CLASS)
        .map(([id,c])=>
          '<button class="efrClassCard" '+
          'data-class="'+id+'">'+
          '<strong>'+c.name+'</strong>'+
          '<br><small>'+c.desc+
          '</small></button>'
        )
        .join("");

      grid
        .querySelectorAll("[data-class]")
        .forEach(btn=>{
          tap(
            btn,
            ()=>{
              G().save.player.classId=
                btn.dataset.class;

              ensureClassStarter(
                btn.dataset.class
              );

              if(btn.dataset.class==="trainer"){
                window.EFRPet?.ensureTrainerLoadout?.();
              }

              window.EFRPet?.applyEffects?.();
              G().persist();

              render();
            }
          );
        });

      tap(
        cp.querySelector(
          "#efrClassClose"
        ),
        closeClassPanel
      );
    }

    const basePanel=
      document.getElementById(
        "basePanel"
      );

    if(
      basePanel &&
      !document.getElementById(
        "efrBaseClassButton"
      )
    ){

      const wrap=
        document.createElement("div");

      wrap.className="efrBaseClassBox";

      wrap.innerHTML=
        '<strong>クラス</strong> '+
        '<span id="efrBaseClass">Melee / 近接</span> '+
        '<button id="efrBaseClassButton">変更</button>';

      basePanel.appendChild(wrap);

      tap(
        document.getElementById(
          "efrBaseClassButton"
        ),
        openClassPanel
      );
    }

    setInterval(
      render,
      300
    );
  }

  function applyClassPlayerBonuses(player,save){
    const id=save?.player?.classId || "melee";

    const bonuses={
      melee:{speedMultiplier:1,maxMPBonus:0,backpackCapacityBonus:0,meleeDamageMultiplier:1.12,firearmDamageMultiplier:1},
      gunner:{speedMultiplier:1,maxMPBonus:0,backpackCapacityBonus:0,meleeDamageMultiplier:1,firearmDamageMultiplier:1.08},
      rogue:{speedMultiplier:1.10,maxMPBonus:0,backpackCapacityBonus:1,meleeDamageMultiplier:1,firearmDamageMultiplier:1},
      mage:{speedMultiplier:1,maxMPBonus:20,backpackCapacityBonus:0,meleeDamageMultiplier:1,firearmDamageMultiplier:1},
      support:{speedMultiplier:1,maxMPBonus:0,backpackCapacityBonus:0,meleeDamageMultiplier:1,firearmDamageMultiplier:1},
      trainer:{speedMultiplier:.95,maxMPBonus:0,backpackCapacityBonus:0,meleeDamageMultiplier:.92,firearmDamageMultiplier:.92}
    };

    player.classBonus=bonuses[id] || bonuses.melee;
  }

  window.EFRMagic={
    CLASS,
    SPELLS,
    EXTRA_SPELLS,
    BEHAVIOR_PARTS,
    MP_ITEMS,
    randomSpells,
    randomConstruction,
    normalizeConstruction,
    constructionCost,
    constructionCastTime,
    constructionLabel,
    compileConstruction,
    modifyOutgoingDamage,
    modifyIncomingDamage,
    playerSpeedMultiplier,
    openStaffEditor,
    closeStaffEditor,
    makeStaff,
    ensureStaff,
    castSpell,
    useMpItem,
    updateProjectiles,
    drawProjectiles,
    clearProjectiles,
    render,
    applyClassPlayerBonuses
  };

  setup();
  render();

  setTimeout(
    ()=>{
      if(
        ensureClassStarter(
          G()?.save?.player?.classId
        )
      ){
        G().persist();
        render();
      }
    },
    0
  );

})();
