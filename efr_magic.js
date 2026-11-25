(() => {
  "use strict";

  const G=()=>window.EFRGame;

  const CLASS={
    melee:{name:"近接",desc:"近接戦闘に特化"},
    gunner:{name:"銃士",desc:"銃器運用に特化"},
    rogue:{name:"盗賊",desc:"機動・探索に特化"},
    mage:{name:"魔術師",desc:"魔法運用に特化（パッシブ：3秒ごとにMP+1）"},
    support:{name:"支援",desc:"回復・支援に特化"},
    alchemist:{name:"錬金術師",desc:"素材を攻撃・防御・移動の全てに使う。薬を1枠に5個まで重ねて持てて、効果時間が長く、半分の確率で薬が減らない"},
    trainer:{name:"調教師",desc:"ペットとの連携に特化"}
  };

  const SPELLS=[
    {id:"fire",name:"ファイア",cost:18,cast:1.0,power:34,kind:"attack"},
    {id:"ice",name:"アイス",cost:22,cast:1.25,power:28,kind:"attack"},
    {id:"lightning",name:"ライトニング",cost:30,cast:1.7,power:52,kind:"attack"},
    {id:"earth",name:"アース",cost:34,cast:2.0,power:60,kind:"attack"},
    {id:"wind",name:"ウィンド",cost:10,cast:.5,power:16,kind:"attack"},
    {id:"meteor",name:"メテオ",cost:55,cast:3.0,power:120,kind:"attack"},
    {id:"heal",name:"ヒール",cost:16,cast:.9,power:28,kind:"heal"},
    {id:"guard",name:"ガード",cost:20,cast:1.1,power:0,kind:"support",effect:"defenseUp"},
    {id:"haste",name:"ヘイスト",cost:14,cast:.8,power:0,kind:"support",effect:"speedUp"}
  ];

  const MP_ITEMS=[
    {name:"魔力回復薬",kind:"mpRestore",value:35,useSeconds:1,slots:1,weight:.5},
    {name:"大魔力回復薬",kind:"mpRestore",value:70,useSeconds:1.5,slots:2,weight:.8}
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
    {id:"defenseDown",name:"ディフェンスダウン",cost:16,cast:.85,power:0,kind:"debuff",effect:"defenseDown"},
    {id:"poison",name:"ポイズン",cost:20,cast:1.0,power:6,kind:"debuff",effect:"poison"},
    {id:"attackDown",name:"アタックダウン",cost:16,cast:.85,power:0,kind:"debuff",effect:"attackDown"},
    {id:"blind",name:"ブラインド",cost:18,cast:.9,power:0,kind:"debuff",effect:"blind"},
    {id:"regen",name:"リジェネ",cost:22,cast:1.0,power:40,kind:"support",effect:"regen"},
    {id:"barrier",name:"バリア",cost:24,cast:1.1,power:30,kind:"support",effect:"barrier"}
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
    if(spell.id==="wind")speed=430;
    if(spell.id==="earth")speed=200;
    if(spell.id==="meteor")speed=260;

    const speedUpCount=
      behaviors.filter(id=>id==="speedUp").length;
    const slowDownCount=
      behaviors.filter(id=>id==="slowDown").length;

    if(speedUpCount){
      speed*=1.8+.45*(speedUpCount-1);
    }

    if(slowDownCount){
      speed*=.55*Math.pow(.8,slowDownCount-1);
    }

    return speed;
  }

  function magicTargets(g=G(),includeInactive=false){
    if(!g)return [];

    const companionTargets=window.EFRPet?.getMagicTargets?.(includeInactive);
    const companions=Array.isArray(companionTargets)
      ? companionTargets
      : (window.EFRPetStates||[]);
    const candidates=[g.player,...(g.enemies||[]),...companions];
    const seen=new Set();

    return candidates.filter(target=>{
      if(
        !target ||
        seen.has(target) ||
        !Number.isFinite(Number(target.x)) ||
        !Number.isFinite(Number(target.y)) ||
        target.dead ||
        (!includeInactive && Number(target.hp||0)<=0)
      )return false;

      seen.add(target);
      return true;
    });
  }

  function findHomingTarget(projectile){
    const g=G();
    if(!g || !projectile)return null;

    let best=null;
    let bestDistance=Infinity;

    for(const target of magicTargets(g)){
      // Do not home back into the caster unless the projectile is returning.
      if(target===g.player && !projectile.returning)continue;

      const distance=Math.hypot(
        target.x-projectile.x,
        target.y-projectile.y
      );

      if(
        distance<bestDistance &&
        distance<=projectile.range
      ){
        best=target;
        bestDistance=distance;
      }
    }

    return best;
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
    defenseDown:"#e07ae8",
    earth:"#d29a4b",
    wind:"#a8e6b0",
    meteor:"#ff9a3c",
    poison:"#8ee63a",
    attackDown:"#7a86e8",
    blind:"#8a90b8",
    regen:"#57cc6e",
    barrier:"#ffe08a"
  });

  function modifyOutgoingDamage(damage,attacker=G()?.player){
    const amount=Math.max(0,Number(damage)||0);

    if(!attacker || Number(attacker.attackUpTimer||0)<=0){
      return amount;
    }

    return Math.max(
      0,
      Math.round(
        amount*Math.max(1,Number(attacker.attackUpMultiplier)||1.25)
      )
    );
  }

  function modifyIncomingDamage(target,damage){
    const amount=Math.max(0,Number(damage)||0);
    if(!target || amount<=0)return amount;

    let adjusted=amount;

    if(Number(target.defenseUpTimer||0)>0){
      adjusted=Math.max(
        1,
        adjusted-Math.max(0,Number(target.defenseUpReduction)||4)
      );
    }

    if(Number(target.defenseDownTimer||0)>0){
      adjusted+=Math.max(
        0,
        Number(target.defenseDownReduction)||4
      );
    }

    if(Number(target.barrierHp||0)>0 && adjusted>0){
      const absorbed=Math.min(
        Number(target.barrierHp),
        adjusted
      );
      target.barrierHp-=absorbed;
      adjusted-=absorbed;
    }

    return adjusted;
  }

  function characterSpeedMultiplier(target){
    if(!target)return 1;
    if(Number(target.freezeTimer||0)>0)return 0;

    let multiplier=1;

    if(Number(target.speedUpTimer||0)>0){
      multiplier*=Math.max(
        1,
        Number(target.speedUpMultiplier)||1.25
      );
    }

    if(Number(target.slowTimer||0)>0){
      multiplier*=Math.max(
        0,
        Math.min(1,Number(target.slowMultiplier)||.5)
      );
    }

    return multiplier;
  }

  function playerSpeedMultiplier(){
    return characterSpeedMultiplier(G()?.player);
  }

  function applyMagicDamage(target,damage,opts){
    const g=G();
    const amount=Math.max(0,Number(damage)||0);
    if(!target || amount<=0)return 0;

    if(
      Array.isArray(g?.enemies) &&
      g.enemies.includes(target) &&
      typeof g.resolveEnemyDamage==="function"
    ){
      return g.resolveEnemyDamage(target,amount,opts);
    }

    if(typeof g?.applyDamage==="function"){
      return g.applyDamage(target,amount);
    }

    const before=Math.max(0,Number(target.hp)||0);
    target.hp=Math.max(0,before-amount);
    return Math.min(before,amount);
  }

  function applySpellEffect(spell,target){
    const g=G();
    if(!target)return;

    if(spell.kind==="attack"){
      const damage=modifyOutgoingDamage(spell.power,g?.player);
      applyMagicDamage(target,damage);
      applyElementalRider(spell,target,damage);
      return;
    }

    if(spell.kind==="heal"){
      target.hp=Math.min(
        Math.max(0,Number(target.maxHp)||100),
        Math.max(0,Number(target.hp)||0)+Math.max(0,Number(spell.power)||0)
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
      target.burnSource="spell";
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

    if(effect==="poison"){
      target.poisonTimer=12;
      target.poisonDamage=Number(spell.power||6);
      target.poisonTick=1;
    }

    if(effect==="attackDown"){
      target.attackDownTimer=8;
      target.attackDownMultiplier=.7;
    }

    if(effect==="blind"){
      target.blindTimer=6;
    }

    if(effect==="regen"){
      target.regenTimer=10;
      target.regenAmount=Math.max(
        1,
        Math.round(Number(spell.power||40)/10)
      );
      target.regenTick=1;
    }

    if(effect==="barrier"){
      target.barrierHp=Math.max(
        Number(target.barrierHp||0),
        Number(spell.power||30)
      );
    }
  }

  function isEnemyTarget(target){
    const g=G();

    return Boolean(
      target &&
      target!==g?.player &&
      (g?.enemies||[]).includes(target)
    );
  }

  function applyElementalRider(spell,target,damage){
    if(!isEnemyTarget(target))return;

    if(spell.id==="meteor"){
      // 着弾点の周囲にも半分のダメージ
      const g=G();

      for(const enemy of g?.enemies||[]){
        if(!enemy || enemy.dead || enemy===target)continue;

        if(
          Math.hypot(enemy.x-target.x,enemy.y-target.y)<=60
        ){
          applyMagicDamage(
            enemy,
            Math.max(1,Math.round(damage*.5))
          );
        }
      }
      return;
    }

    if(target.dead)return;

    if(spell.id==="fire"){
      // 弱いバーン（専用のバーン魔法より短く弱い。燃えていれば上書きしない）
      if(!(Number(target.burnTimer||0)>0)){
        target.burnTimer=2;
        target.burnDamage=4;
        target.burnTick=.5;
        target.burnSource="weak";
      }
      return;
    }

    if(spell.id==="ice"){
      // 熱衝撃：燃えている敵に当てると追加ダメージ＋消火
      if(Number(target.burnTimer||0)>0){
        target.burnTimer=0;
        applyMagicDamage(target,18);
      }

      if(!(Number(target.slowTimer||0)>0)){
        target.slowTimer=2;
        target.slowMultiplier=.7;
      }
      return;
    }

    if(spell.id==="lightning"){
      chainLightning(target,damage);
    }
  }

  function chainLightning(source,baseDamage){
    const g=G();
    if(!g || !source)return;

    // 凍っている敵からは広く強く伝播する（氷＝水分のイメージ）
    const frozen=Number(source.freezeTimer||0)>0;
    const reach=frozen ? 170 : 115;
    const jumps=frozen ? 3 : 2;
    const ratio=frozen ? .7 : .4;
    const chainDamage=Math.max(
      1,
      Math.round((Number(baseDamage)||0)*ratio)
    );

    const hit=new Set([source]);
    let from=source;

    for(let jump=0;jump<jumps;jump++){
      let best=null;
      let bestDistance=Infinity;

      for(const enemy of g.enemies||[]){
        if(!enemy || enemy.dead || hit.has(enemy))continue;

        const distance=Math.hypot(
          enemy.x-from.x,
          enemy.y-from.y
        );

        if(distance<=reach && distance<bestDistance){
          bestDistance=distance;
          best=enemy;
        }
      }

      if(!best)break;

      hit.add(best);
      applyMagicDamage(best,chainDamage);
      from=best;
    }
  }

  function updateStatusEffects(dt){
    const g=G();
    if(!g)return;
    const delta=Math.max(0,Number(dt)||0);

    for(const target of magicTargets(g,true)){
      for(const key of [
        "attackUpTimer",
        "speedUpTimer",
        "defenseUpTimer",
        "slowTimer",
        "freezeTimer",
        "defenseDownTimer",
        "attackDownTimer",
        "blindTimer",
        "regenTimer"
      ]){
        const remaining=Number(target[key]||0);
        if(remaining>0)target[key]=Math.max(0,remaining-delta);
      }

      const burnRemaining=Math.max(0,Number(target.burnTimer)||0);

      if(burnRemaining>0){
        const activeDelta=Math.min(delta,burnRemaining);
        let timeUntilTick=Math.max(0,Number(target.burnTick??.5));
        let elapsed=activeDelta;

        // Preserve every burn tick, including the final tick at expiry, for any target.
        while(timeUntilTick<=elapsed+1e-9){
          elapsed=Math.max(0,elapsed-timeUntilTick);
          if(!target.dead && Number(target.hp||0)>0){
            applyMagicDamage(
              target,
              Math.max(1,Number(target.burnDamage||1)),
              {dot:true}
            );
          }
          timeUntilTick=.5;
        }

        target.burnTick=Math.max(0,timeUntilTick-elapsed);
        target.burnTimer=Math.max(0,burnRemaining-delta);
      }

      const poisonRemaining=Math.max(0,Number(target.poisonTimer)||0);

      if(poisonRemaining>0){
        const activeDelta=Math.min(delta,poisonRemaining);
        let timeUntilTick=Math.max(0,Number(target.poisonTick??1));
        let elapsed=activeDelta;

        while(timeUntilTick<=elapsed+1e-9){
          elapsed=Math.max(0,elapsed-timeUntilTick);
          if(!target.dead && Number(target.hp||0)>0){
            applyMagicDamage(
              target,
              Math.max(1,Number(target.poisonDamage||1)),
              {dot:true}
            );
          }
          timeUntilTick=1;
        }

        target.poisonTick=Math.max(0,timeUntilTick-elapsed);
        target.poisonTimer=Math.max(0,poisonRemaining-delta);
      }

      const regenRemaining=Math.max(0,Number(target.regenTimer)||0);

      if(regenRemaining>0 && !target.dead && Number(target.hp||0)>0){
        const activeDelta=Math.min(delta,regenRemaining);
        let timeUntilTick=Math.max(0,Number(target.regenTick??1));
        let elapsed=activeDelta;

        while(timeUntilTick<=elapsed+1e-9){
          elapsed=Math.max(0,elapsed-timeUntilTick);
          target.hp=Math.min(
            Math.max(0,Number(target.maxHp)||100),
            Math.max(0,Number(target.hp)||0)+
              Math.max(1,Number(target.regenAmount||1))
          );
          timeUntilTick=1;
        }

        target.regenTick=Math.max(0,timeUntilTick-elapsed);
      }
    }
  }

  function spawnProjectile(shot,x,y,angle,originX=x,originY=y,launchClearance=0){
    const behaviors=shot.behaviors||[];
    const spell=shot.spell;
    const range=Number(G().activeStaffRange||330);

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
      launchClearance:Math.max(0,Number(launchClearance)||0),
      casterClearancePassed:Number(launchClearance)<=0
    };

    projectiles.push(projectile);
  }

function spawnShot(shot,x,y,angle,preventCasterSpawnHit=false){
    const splitCount=
      shot.behaviors.filter(id=>id==="split").length;
    const split=1+Math.min(3,splitCount);

    for(let i=0;i<split;i++){
      const offset=
        split===1
          ? 0
          : -.16+.32*(i/(split-1));

      spawnProjectile(
        shot,
        x,
        y,
        angle+offset,
        x,
        y,
        preventCasterSpawnHit
          ? (Number(G()?.player?.r)||10)+11
          : 0
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
    if(projectile.hitTargets.has(target))return false;
    projectile.hitTargets.add(target);

    applySpellEffect(projectile.spell,target);

    if(projectile.payload)releasePayload(projectile);

    return !projectile.behaviors.includes("pierce");
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

      const behaviorCount=id=>
        p.behaviors.filter(x=>x===id).length;

      const homingCount=behaviorCount("homing");

      if(homingCount){
        const target=findHomingTarget(p);
        if(target){
          const targetAngle=Math.atan2(target.y-p.y,target.x-p.x);
          let deltaAngle=targetAngle-p.angle;
          while(deltaAngle>Math.PI)deltaAngle-=Math.PI*2;
          while(deltaAngle<-Math.PI)deltaAngle+=Math.PI*2;
          const turn=.09*(1+.6*(homingCount-1));
          p.angle+=Math.max(-turn,Math.min(turn,deltaAngle));
        }
      }

      const accelerateCount=behaviorCount("accelerate");

      if(accelerateCount){
        p.speed=Math.min(
          p.baseSpeed*(2.2+.5*(accelerateCount-1)),
          p.speed+180*delta
        );
      }

      const decelerateCount=behaviorCount("decelerate");

      if(decelerateCount){
        p.speed=Math.max(
          p.baseSpeed*Math.max(.12,.35-.08*(decelerateCount-1)),
          p.speed-120*delta
        );
      }

      p.angle+=.55*delta*
        (behaviorCount("curveRight")-behaviorCount("curveLeft"));
      p.angle+=Math.sin(p.age*8)*.025*behaviorCount("sine");

      if(p.behaviors.includes("reverse") && !p.returning && p.traveled>=p.range*.5){
        p.angle+=Math.PI;
        p.returning=true;
      }

      if(p.behaviors.includes("boomerang") && !p.returning && p.traveled>=p.range*.5){
        p.returning=true;
      }

      if(p.behaviors.includes("boomerang") && p.returning){
        p.angle=Math.atan2(p.originY-p.y,p.originX-p.x);
      }

      p.vx=Math.cos(p.angle);
      p.vy=Math.sin(p.angle);
      const step=p.speed*delta;
      const nextX=p.x+p.vx*step;
      const nextY=p.y+p.vy*step;

      if(g.blocked?.({x:nextX,y:nextY,r:5})){
        if(p.behaviors.includes("bounce")){
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

      // Clear the caster's launch overlap by actual separation, not traveled distance;
      // curved/slow shots must not hit the caster merely because a timer elapsed.
      if(
        !p.casterClearancePassed &&
        Math.hypot(g.player.x-p.x,g.player.y-p.y)>=p.launchClearance
      ){
        p.casterClearancePassed=true;
      }

      for(const target of magicTargets(g)){
        // Ignore only the initial caster overlap; other actors collide normally.
        if(target===g.player && !p.casterClearancePassed)continue;

        const targetRadius=(Number(target.r)||(
          target===g.player ? 10 :
          (g.enemies||[]).includes(target) ? 12 : 11
        ))+7;
        const distance=Math.hypot(target.x-p.x,target.y-p.y);

        if(distance<=targetRadius && hitProjectileTarget(p,target)){
          remove=true;
          break;
        }
      }

      if(
        !remove &&
        p.returning &&
        (p.behaviors.includes("reverse") || p.behaviors.includes("boomerang")) &&
        Math.hypot(p.originX-p.x,p.originY-p.y)<Math.max(18,(Number(g.player?.r)||10)+8)
      ){
        remove=true;
      }

      if(!remove && p.traveled>=p.range){
        if(p.payload && !p.payloadReleased)releasePayload(p);
        remove=true;
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
        ("#b16be8");
      const trailLength=Math.max(18,Math.min(34,12+(Number(p.speed)||240)*.055));

      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(p.angle);
      /* グローは太い半透明ストロークの下敷きで近似する（shadowBlur は
         モバイルGPUで高コストなため使わない）。 */
      ctx.lineCap="round";

      ctx.globalAlpha=p.stopped?.10:.16;
      ctx.strokeStyle=color;
      ctx.lineWidth=(p.spell.id==="lightning"?4.5:3.5)+7;
      ctx.beginPath();
      ctx.moveTo(-trailLength,0);
      ctx.lineTo(2,0);
      ctx.stroke();
      ctx.globalAlpha=1;

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

  function spellCatalog(){
    return SPELLS.map(spell=>({
      id:spell.id,
      name:spell.name,
      cost:spell.cost,
      power:spell.power,
      kind:spell.kind
    }));
  }

  function makeBlankStaff(){
    const staff=makeStaff();
    staff.construction=[];
    staff.spells=[];
    return staff;
  }

  function ensureStaff(staff){
    if(!staff?.magicStaff)return staff;

    // 空の杖（魔法店の白紙）は空のままにする。ここでランダム付与すると
    // 「パーツで組む」前提が崩れ、外した魔法がパーツとして増殖してしまう。
    if(
      Array.isArray(staff.spells) &&
      staff.spells.length===0 &&
      Array.isArray(staff.construction) &&
      staff.construction.length===0
    ){
      return staff;
    }

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

    // 属性の杖など固定スペルを持つ杖：固定スペルは外せず、
    // 自由に入れられるスペルは「3 - 固定数」まで
    if(Array.isArray(staff.lockedSpells)&&staff.lockedSpells.length){
      const lockedIds=staff.lockedSpells.filter(id=>spellDefinition(id));
      if(lockedIds.length){
        let nodes=Array.isArray(staff.construction)
          ? staff.construction.slice()
          : [];

        for(let i=lockedIds.length-1;i>=0;i--){
          if(!nodes.some(node=>node.kind==="spell"&&node.id===lockedIds[i])){
            nodes.unshift({kind:"spell",id:lockedIds[i]});
          }
        }

        const freeAllowance=Math.max(0,3-lockedIds.length);
        let freeSeen=0;
        nodes=nodes.filter(node=>{
          if(node.kind!=="spell")return true;
          if(lockedIds.includes(node.id))return true;
          freeSeen++;
          return freeSeen<=freeAllowance;
        });

        staff.construction=nodes;
        staff.spells=nodes
          .filter(node=>node.kind==="spell")
          .map(node=>clone(spellDefinition(node.id)));
      }
    }

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

    if(Number(p.freezeTimer||0)>0){
      g.logMessage?.("凍結中は詠唱できません");
      return;
    }

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

      if(Number(p.freezeTimer||0)>0){
        p.casting=false;
        p.mp=Math.min(p.maxMP,p.mp+cost);
        if(bar)bar.classList.add("hidden");
        if(fill)fill.style.width="0%";
        g.logMessage?.("凍結で詠唱が中断されました");
        render();
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
          ),
          true
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

    if(mp){
      mp.textContent=
        Math.round(g.player.mp)+
        "/"+
        Math.round(g.player.maxMP);
    }

    const bar=document.getElementById("efrCastBar");

    if(bar){
      bar.classList.toggle(
        "hidden",
        !g.player.casting
      );
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
  let staffEditorOriginal=[];

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
              <strong>${node.kind==="spell"?spellIconMarkup(node.id):""}${prefix}：${definition?.name||node.id}</strong>
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

    const partBags=staffEditorBags();
    spells.innerHTML=SPELLS.map(spell=>{
      const perBag=partBags
        .map(({bag,label})=>({
          label,
          count:spellPartCount(bag,spell.id)
        }))
        .filter(entry=>entry.count>0);
      const held=perBag.reduce(
        (sum,entry)=>sum+entry.count,
        0
      );
      const inStaff=staffEditorConstruction.some(
        node=>node.kind==="spell"&&node.id===spell.id
      );
      const note=held>0
        ? " / パーツ×"+held+(
            partBags.length>1
              ? "（"+perBag
                  .map(entry=>entry.label+entry.count)
                  .join("・")+"）"
              : ""
          )
        : inStaff
          ? ""
          : " / パーツなし";
      return `
      <button
        type="button"
        data-staff-add-spell="${spell.id}"
      >
        ${spellIconMarkup(spell.id)}${spell.name}
        <small>${spell.cost}MP / ${spell.cast.toFixed(2)}秒${note}</small>
      </button>
    `;
    }).join("");

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
    staffEditorOriginal=staffEditorConstruction.map(node=>({
      kind:node.kind,
      id:node.id
    }));

    renderStaffEditor();
    return true;
  }

  function spellPartItem(spellId){
    const def=spellDefinition(spellId);
    return {
      name:def?def.name:spellId,
      kind:"spellPart",
      spellId,
      slots:1,
      weight:.1,
      gridW:1,
      gridH:1
    };
  }

  function staffEditorBags(){
    const g=G();
    if(g?.save?.raidActive&&Array.isArray(g.player?.loot)){
      return [{bag:g.player.loot,label:"探索"}];
    }
    if(g?.save){
      if(!Array.isArray(g.save.stash))g.save.stash=[];
      const bags=[{bag:g.save.stash,label:"倉庫"}];
      if(Array.isArray(g.player?.loot)){
        bags.push({bag:g.player.loot,label:"持込"});
      }
      return bags;
    }
    return [{bag:[],label:""}];
  }

  function spellIconMarkup(spellId){
    const spell=spellDefinition(spellId);
    if(!spell)return "";
    return window.EFRItemIcons?.markup?.({
      name:spell.name,
      kind:"spellPart",
      spellId,
      slots:1,
      gridW:1,
      gridH:1
    })||"";
  }

  function spellPartCount(bag,spellId){
    return bag.filter(
      item=>item?.kind==="spellPart"&&item.spellId===spellId
    ).length;
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

    const countSpells=nodes=>{
      const map=new Map();
      for(const node of nodes){
        if(node.kind==="spell"){
          map.set(node.id,(map.get(node.id)||0)+1);
        }
      }
      return map;
    };
    const beforeCounts=countSpells(staffEditorOriginal);
    const afterCounts=countSpells(construction);
    const addedCounts=new Map();
    const removedIds=[];
    for(const [id,count] of afterCounts){
      const extra=count-(beforeCounts.get(id)||0);
      if(extra>0)addedCounts.set(id,extra);
    }
    for(const [id,count] of beforeCounts){
      const extra=count-(afterCounts.get(id)||0);
      for(let i=0;i<extra;i++)removedIds.push(id);
    }
    const bags=staffEditorBags();
    const totalParts=id=>bags.reduce(
      (sum,{bag})=>sum+spellPartCount(bag,id),
      0
    );
    for(const [id,need] of addedCounts){
      if(totalParts(id)<need){
        G().logMessage?.(
          "魔法パーツが足りません（"+(spellDefinition(id)?.name||id)+"）"
        );
        return false;
      }
    }
    for(const [id,need] of addedCounts){
      let left=need;
      for(const {bag} of bags){
        for(let i=bag.length-1;i>=0&&left>0;i--){
          if(bag[i]?.kind==="spellPart"&&bag[i].spellId===id){
            bag.splice(i,1);
            left--;
          }
        }
        if(left<=0)break;
      }
    }
    const returnBag=bags[0]?.bag;
    for(const id of removedIds){
      returnBag?.push(spellPartItem(id));
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
    alchemist:{kind:"recipe",name:"火炎瓶"},
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

  // 初めて杖を装備した時に1回だけ出す手引き。
  // 出撃中（戦闘中の付け替え）には出さず、拠点に戻ってから出す。
  function maybeShowStaffGuide(){
    const g=G();
    const save=g?.save;
    if(!save?.player||save.player.staffGuideSeen)return;
    if(save.raidActive)return;
    if(document.getElementById("efrIntro"))return;
    const editor=document.getElementById("efrStaffEditor");
    if(editor&&!editor.classList.contains("hidden"))return;
    const equipment=save.equipment||{};
    const hasStaff=[equipment.weapon1,equipment.weapon2]
      .some(item=>item?.magicStaff===true);
    if(!hasStaff)return;

    save.player.staffGuideSeen=true;
    g.persist?.();

    const panel=document.createElement("section");
    panel.id="efrStaffGuide";
    panel.className="efrIntro";
    panel.innerHTML=`
      <div class="efrIntroWindow">
        <h2>杖の手引き</h2>
        <p class="efrIntroLines">
          杖は魔法パーツを組み合わせて作る武器です。<br>
          組み込んだ魔法を、並べた順番に実行します。<br>
          挙動パーツは「次の魔法」にかかります。<br>
          魔法は全部、向いた方向に飛ぶ弾です。回復や支援を自分にかけたい時は、ブーメランや反転で当て直してください。<br>
          魔法を増やすには魔法パーツが要ります（魔法店で買えます）。外した魔法はパーツに戻ります。<br>
          死ぬと、杖ごとロストします。<br>
          編集は出撃準備で杖を長押し。
        </p>
        <button type="button" class="efrIntroSkip" data-staff-guide-close>閉じる</button>
      </div>
    `;
    document.body.appendChild(panel);
    panel.querySelector("[data-staff-guide-close]")
      ?.addEventListener("click",()=>panel.remove());
  }

  // 魔術師のパッシブ：3秒ごとにMP+1（ゆっくり回復）
  let mageRegenSeconds=0;
  function mageMpRegenTick(){
    const g=G();
    if(g?.save?.player?.classId!=="mage"){
      mageRegenSeconds=0;
      return false;
    }
    const p=g.player;
    if(!p||typeof p.mp!=="number"||typeof p.maxMP!=="number")return false;
    if(p.mp>=p.maxMP)return false;
    mageRegenSeconds++;
    if(mageRegenSeconds<3)return false;
    mageRegenSeconds=0;
    p.mp=Math.min(p.maxMP,p.mp+1);
    return true;
  }

  function render(){

    ensureState();
    maybeShowStaffGuide();

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

    setInterval(()=>{mageMpRegenTick();},1000);

    // 魔法ボタンは撤去済み：杖の魔法は攻撃ボタンで撃つ。
    // Lv・職はバッグ、MPは上のHUDのHP横、仮クレジットは
    // バッグと有料脱出地点で確認する。ここでは詠唱バー
    // だけを作る。装備/バッグボタンは上のHUDに残す。
    if(!document.getElementById("efrCastBar")){

      const raid=
        document.getElementById("raidPanel");

      if(raid){

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
      alchemist:{speedMultiplier:1,maxMPBonus:0,backpackCapacityBonus:0,meleeDamageMultiplier:1,firearmDamageMultiplier:1},
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
    characterSpeedMultiplier,
    openStaffEditor,
    saveStaffEditor,
    updateStatusEffects,
    closeStaffEditor,
    makeStaff,
    makeBlankStaff,
    mageMpRegenTick,
    applySpellEffect,
    spellCatalog,
    ensureStaff,
    castSpell,
    useMpItem,
    updateProjectiles,
    drawProjectiles,
    clearProjectiles,
    render,
    applyClassPlayerBonuses
  };

  const INTRO_STARTER_LABELS=Object.freeze({
    melee:"初期装備：ナイフ",
    gunner:"初期装備：ハンドガン",
    rogue:"初期装備：狩猟弓",
    mage:"初期装備：ファイアの杖",
    support:"初期装備：ヒールの杖",
    trainer:"ペットと一緒に出撃できる"
  });

  // 初回モーダルは「まだ見ていないか」だけで判定する。
  // （開いただけで初期装備が自動付与されるため、進行度では判定しない）
  function saveLooksFresh(){
    const save=G()?.save;
    if(!save?.player)return false;
    return !save.player.introDone;
  }

  function closeIntro(classId){
    const g=G();
    if(!g?.save?.player)return;
    if(classId&&CLASS[classId]){
      g.save.player.classId=classId;
    }
    g.save.player.introDone=true;
    delete g.save.player.introPending;
    ensureClassStarter(g.save.player.classId||"melee");
    if(g.save.player.classId==="trainer"){
      window.EFRPet?.ensureTrainerLoadout?.();
    }
    window.EFRPet?.applyEffects?.();
    g.persist?.();
    render();
    document.getElementById("efrIntro")?.remove();
  }

  function maybeShowIntro(){
    const g=G();
    if(!g?.save?.player)return;
    if(!saveLooksFresh()&&!g.save.player.introPending)return;
    g.save.player.introPending=true;

    const panel=document.createElement("section");
    panel.id="efrIntro";
    panel.className="efrIntro";
    panel.innerHTML=`
      <div class="efrIntroWindow">
        <h2>エスケープフロムRPG</h2>
        <p class="efrIntroLines">
          探索に出て、アイテムを持ち帰るゲームです。<br>
          死ぬと、持ち込んだ物は全部ロストします（鍵専用インベントリの中身だけは残ります）。<br>
          持ち帰った素材で拠点を育て、装備や杖を整えて、また出撃します。<br>
          1日は「出撃を終える」か「ベッドで寝る」と進みます。畑やお店は日にちで変わります。<br>
          杖は魔法パーツを組み合わせて作ります。並べる順番で効果が変わります。
        </p>
        <h3>クラスを選ぶ</h3>
        <p class="efrIntroNote">クラスは後から変更できます。初期装備はクラスごとに1回だけもらえます。</p>
        <div class="efrIntroClasses">
          ${Object.entries(CLASS).map(([id,c])=>`
            <button type="button" class="efrClassCard" data-intro-class="${id}">
              <strong>${c.name}</strong>
              <br><small>${c.desc}</small>
              <br><small>${INTRO_STARTER_LABELS[id]||""}</small>
            </button>
          `).join("")}
        </div>
        <button type="button" class="efrIntroSkip" data-intro-skip>あとで選ぶ（近接で開始）</button>
      </div>
    `;
    document.body.appendChild(panel);
    panel.querySelectorAll("[data-intro-class]").forEach(btn=>{
      btn.addEventListener("click",()=>closeIntro(btn.dataset.introClass));
    });
    panel.querySelector("[data-intro-skip]")
      ?.addEventListener("click",()=>closeIntro(null));
  }

  setup();
  render();
  maybeShowIntro();

  setTimeout(
    ()=>{
      if(
        !G()?.save?.player?.introPending&&
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
