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
    {id:"guard",name:"ガード",cost:20,cast:1.1,power:0,kind:"support"},
    {id:"haste",name:"ヘイスト",cost:14,cast:.8,power:0,kind:"support"}
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

  function applySpellEffect(spell,target){
    const g=G();
    if(!target)return;

    if(spell.kind==="attack"){
      if(target!==g.player){
        g.applyDamage?.(target,spell.power);
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

    if(spell.effect==="attackUp"){
      target.attackUpTimer=8;
      target.attackUpMultiplier=1.25;
      return;
    }

    if(spell.effect==="speedUp"){
      target.speedUpTimer=8;
      target.speedUpMultiplier=1.25;
      return;
    }

    if(spell.effect==="defenseUp"){
      target.defenseUpTimer=8;
      target.defenseUpReduction=4;
      return;
    }

    if(spell.effect==="slow"){
      target.slowTimer=5;
      target.slowMultiplier=.5;
      return;
    }

    if(spell.effect==="burn"){
      target.burnTimer=5;
      target.burnDamage=Number(spell.power||10);
      return;
    }

    if(spell.effect==="freeze"){
      target.freezeTimer=2;
      return;
    }

    if(spell.effect==="defenseDown"){
      target.defenseDownTimer=5;
      target.defenseDownReduction=4;
    }
  }

  function spawnProjectile(shot,x,y,angle,originX=x,originY=y){
    const behaviors=shot.behaviors||[];
    const spell=shot.spell;

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
      range:Number(G().activeStaffRange||330),
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
      payloadTimer:behaviors.includes("timer")?.8:null
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

    const key=target===G().player
      ? "player"
      : target;

    if(projectile.hitTargets.has(key)){
      return false;
    }

    projectile.hitTargets.add(key);

    applySpellEffect(
      projectile.spell,
      target
    );

    if(projectile.payload){
      releasePayload(projectile);
    }

    return !projectile.behaviors.includes("pierce");
  }

  function updateProjectiles(dt){
    const g=G();

    if(!g?.running){
      projectiles.length=0;
      return;
    }

    for(let i=projectiles.length-1;i>=0;i--){
      const p=projectiles[i];

      p.age+=dt;

      if(
        p.payloadTimer!==null &&
        !p.payloadReleased
      ){
        p.payloadTimer-=dt;

        if(p.payloadTimer<=0){
          releasePayload(p);
        }
      }

      if(p.stopped){
        p.stopTimer-=dt;

        if(p.stopTimer<=0){
          p.stopped=false;
        }else{
          continue;
        }
      }

      if(p.behaviors.includes("homing")){
        const target=findHomingTarget(p);

        if(target){
          const targetAngle=Math.atan2(
            target.y-p.y,
            target.x-p.x
          );

          let delta=targetAngle-p.angle;

          while(delta>Math.PI)delta-=Math.PI*2;
          while(delta<-Math.PI)delta+=Math.PI*2;

          p.angle+=Math.max(
            -.09,
            Math.min(.09,delta)
          );
        }
      }

      if(p.behaviors.includes("accelerate")){
        p.speed=Math.min(
          p.baseSpeed*2.2,
          p.speed+180*dt
        );
      }

      if(p.behaviors.includes("decelerate")){
        p.speed=Math.max(
          p.baseSpeed*.35,
          p.speed-120*dt
        );
      }

      if(p.behaviors.includes("curveRight")){
        p.angle+=.55*dt;
      }

      if(p.behaviors.includes("curveLeft")){
        p.angle-=.55*dt;
      }

      if(p.behaviors.includes("sine")){
        p.angle+=Math.sin(p.age*8)*.025;
      }

      if(
        p.behaviors.includes("reverse") &&
        !p.returning &&
        p.traveled>=p.range*.5
      ){
        p.angle+=Math.PI;
        p.returning=true;
      }

      if(
        p.behaviors.includes("boomerang") &&
        !p.returning &&
        p.traveled>=p.range*.5
      ){
        p.returning=true;
      }

      if(p.behaviors.includes("boomerang") && p.returning){
        const returnAngle=Math.atan2(
          p.originY-p.y,
          p.originX-p.x
        );

        p.angle=returnAngle;

        if(
          Math.hypot(
            p.originX-p.x,
            p.originY-p.y
          )<18
        ){
          projectiles.splice(i,1);
          continue;
        }
      }

      p.vx=Math.cos(p.angle);
      p.vy=Math.sin(p.angle);

      const step=p.speed*dt;
      const nextX=p.x+p.vx*step;
      const nextY=p.y+p.vy*step;

      if(g.blocked?.({
        x:nextX,
        y:nextY,
        r:5
      })){
        if(p.behaviors.includes("bounce")){
          p.angle+=Math.PI;
          p.vx=Math.cos(p.angle);
          p.vy=Math.sin(p.angle);
          p.x+=p.vx*4;
          p.y+=p.vy*4;
          continue;
        }

        if(p.payload && !p.payloadReleased){
          releasePayload(p);
        }

        projectiles.splice(i,1);
        continue;
      }

      p.x=nextX;
      p.y=nextY;
      p.traveled+=step;

      let remove=false;

      for(const enemy of g.enemies||[]){
        if(enemy.dead)continue;

        const distance=Math.hypot(
          enemy.x-p.x,
          enemy.y-p.y
        );

        if(distance<=enemy.r+7){
          if(hitProjectileTarget(p,enemy)){
            remove=true;
          }

          if(remove)break;
        }
      }

      if(!remove){
        const playerDistance=Math.hypot(
          g.player.x-p.x,
          g.player.y-p.y
        );

        if(playerDistance<=g.player.r+7){
          if(
            p.spell.kind!=="attack" &&
            hitProjectileTarget(p,g.player)
          ){
            remove=true;
          }
        }
      }

      if(
        p.traveled>=p.range &&
        !p.behaviors.includes("boomerang") &&
        !p.payloadReleased
      ){
        if(p.payload){
          releasePayload(p);
        }

        remove=true;
      }

      if(remove){
        projectiles.splice(i,1);
      }
    }

    for(let i=g.enemies.length-1;i>=0;i--){
      const enemy=g.enemies[i];

      if(enemy.dead)continue;

      if((enemy.burnTimer||0)>0){
        enemy.burnTimer=Math.max(
          0,
          enemy.burnTimer-dt
        );

        const tick=Number(enemy.burnTick||0)-dt;

        if(tick<=0){
          enemy.burnTick=.5;
          g.applyDamage?.(
            enemy,
            Math.max(1,Number(enemy.burnDamage||1))
          );
        }else{
          enemy.burnTick=tick;
        }
      }
    }
  }

  function drawProjectiles(){
    const g=G();

    if(!g?.running)return;

    const ctx=g.ctx;

    for(const p of projectiles){
      ctx.save();

      ctx.translate(p.x,p.y);

      const name=p.spell.name||"";
      const support=
        p.spell.kind==="support" ||
        p.spell.kind==="heal";

      ctx.shadowBlur=12;
      ctx.shadowColor=
        support
          ? "rgba(90,210,170,.55)"
          : "rgba(150,100,240,.55)";

      ctx.fillStyle=
        p.spell.id==="fire"
          ? "#ef713f"
          : p.spell.id==="ice"
            ? "#78c9f0"
            : p.spell.id==="lightning"
              ? "#e7dc72"
              : support
                ? "#71d6b5"
                : "#b16be8";

      ctx.beginPath();
      ctx.arc(
        0,
        0,
        p.spell.id==="lightning" ? 7 : 6,
        0,
        Math.PI*2
      );
      ctx.fill();

      ctx.strokeStyle="#f5ead0";
      ctx.lineWidth=1;
      ctx.stroke();

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

    if(targetSlot){
      g.save.equipment[targetSlot]=item;
    }else{
      g.save.stash=Array.isArray(g.save.stash)
        ? g.save.stash
        : [];
      g.save.stash.push(item);
    }

    if(starterAmmo){
      if(
        g.backpackCanFit?.(starterAmmo) &&
        g.addToBackpack?.(starterAmmo)
      ){
        /* starter reserve ammo is already in the carry inventory */
      }else{
        g.save.stash=Array.isArray(g.save.stash)
          ? g.save.stash
          : [];
        g.save.stash.push(starterAmmo);
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
