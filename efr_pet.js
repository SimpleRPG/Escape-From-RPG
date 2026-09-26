(function(){
  "use strict";

  const G=()=>window.EFRGame;

  const PET_TYPES={
    hound:{
      name:"猟犬",
      desc:"戦闘と追跡に特化",
      damage:6,
      speed:1.15,
      vision:0,
      enemyVision:1
    },
    bird:{
      name:"偵察鳥",
      desc:"索敵とマーキングに特化",
      damage:-2,
      speed:1.25,
      vision:100,
      enemyVision:1
    },
    cat:{
      name:"猫",
      desc:"隠密と接近戦に特化",
      damage:2,
      speed:1.1,
      vision:25,
      enemyVision:.75
    },
    pack:{
      name:"荷運び獣",
      desc:"探索と携行に特化",
      damage:-2,
      speed:.9,
      vision:35,
      enemyVision:1,
      carry:2
    }
  };

  const PET_SKILLS={
    combat:{
      name:"戦闘訓練",
      desc:"ペットの攻撃力 +5 / Lv",
      max:3
    },
    scout:{
      name:"偵察訓練",
      desc:"プレイヤーの視界 +50 / Lv",
      max:3
    },
    bond:{
      name:"絆・支援",
      desc:"一定間隔でプレイヤーを回復",
      max:3
    }
  };

  let attackTimer=0;
  let damageTimer=0;
  let supportTimer=0;

  function ensure(){
    const g=G();
    if(!g?.save)return null;

    const p=g.save.player;

    p.pet=p.pet || {
      type:"hound",
      level:1,
      xp:0,
      skillPoints:0,
      skills:{
        combat:0,
        scout:0,
        bond:0
      }
    };

    p.pet.skills=Object.assign({
      combat:0,
      scout:0,
      bond:0
    },p.pet.skills||{});

    p.pet.level=Math.max(1,Number(p.pet.level||1));
    p.pet.xp=Math.max(0,Number(p.pet.xp||0));
    p.pet.skillPoints=Math.max(0,Number(p.pet.skillPoints||0));

    if(!PET_TYPES[p.pet.type]){
      p.pet.type="hound";
    }

    return p.pet;
  }

  function isTrainer(){
    return G()?.save?.player?.classId==="trainer";
  }

  function xpNext(level){
    return 40+(Math.max(1,level)-1)*40;
  }

  function gainXP(amount){
    const pet=ensure();
    if(!pet || !isTrainer())return;

    pet.xp+=Math.max(0,Number(amount||0));

    while(pet.xp>=xpNext(pet.level)){
      pet.xp-=xpNext(pet.level);
      pet.level++;
      pet.skillPoints++;

      G().logMessage?.(
        "ペットLv."+pet.level+
        " / スキルポイント +1"
      );
    }

    G().persist?.();
  }

  function skillLevel(key){
    const pet=ensure();

    return Math.max(
      0,
      Math.min(
        PET_SKILLS[key]?.max||0,
        Number(pet?.skills?.[key]||0)
      )
    );
  }

  function spendSkill(key){
    const pet=ensure();
    const skill=PET_SKILLS[key];

    if(!pet || !skill)return false;

    const lv=skillLevel(key);

    if(pet.skillPoints<=0){
      G().logMessage?.("ペットのスキルポイントがありません");
      return false;
    }

    if(lv>=skill.max){
      G().logMessage?.(skill.name+"は最大レベルです");
      return false;
    }

    pet.skills[key]=lv+1;
    pet.skillPoints--;

    G().persist?.();
    applyEffects();

    return true;
  }

  function setType(type){
    const pet=ensure();

    if(!isTrainer()){
      G().logMessage?.("調教師のみペットを選択できます");
      return false;
    }

    if(!PET_TYPES[type])return false;

    pet.type=type;
    G().persist?.();
    applyEffects();

    G().logMessage?.(
      "ペットを"+PET_TYPES[type].name+"に変更しました"
    );

    return true;
  }

  function ensureTrainerLoadout(){
    const g=G();
    const pet=ensure();

    if(!g || !pet || !isTrainer())return;

    g.activeWeaponSlot=1;

    const weapon2=g.save.equipment?.weapon2;

    if(weapon2){
      g.save.stash.push(
        JSON.parse(JSON.stringify(weapon2))
      );

      g.save.equipment.weapon2=null;
      g.persist?.();
    }
  }

  function applyEffects(){
    const g=G();
    const pet=ensure();

    if(!g || !pet || !isTrainer()){
      if(g?.player){
        g.player.petVisionBonus=0;
        g.player.petEnemyVisionMultiplier=1;
        g.player.petCarryBonus=0;
      }
      return;
    }

    const type=PET_TYPES[pet.type];

    g.player.petVisionBonus=
      (type.vision||0)+
      skillLevel("scout")*50;

    g.player.petEnemyVisionMultiplier=
      type.enemyVision||1;

    g.player.petCarryBonus=
      type.carry||0;

    g.player.petDamageBonus=
      type.damage||0;
  }

  function prepareRaid(){
    ensureTrainerLoadout();
    applyEffects();

    const pet=ensure();
    if(!pet || !isTrainer())return;

    pet.downed=false;

    window.EFRPetState={
      x:G().player.x-35,
      y:G().player.y+35,
      hp:100,
      maxHp:100
    };

    attackTimer=0;
    damageTimer=0;
    supportTimer=0;
  }

  function onExtract(){
    const pet=ensure();

    if(!pet || !isTrainer())return;

    pet.downed=false;

    if(window.EFRPetState){
      window.EFRPetState.hp=
        window.EFRPetState.maxHp;
    }

    G().persist?.();
  }

  function onFail(){
    const pet=ensure();

    if(!pet || !isTrainer())return;

    /*
     * ペット自体は失わない。
     * 出撃失敗後は拠点へ戻った扱いにする。
     */
    pet.downed=false;

    if(window.EFRPetState){
      window.EFRPetState.hp=
        window.EFRPetState.maxHp;
    }

    G().persist?.();
  }

  function nearestEnemy(){
    const g=G();
    const s=window.EFRPetState;

    if(!g || !s)return null;

    let best=null;
    let bestScore=Infinity;

    for(const enemy of g.enemies||[]){
      if(enemy.dead)continue;

      const d=Math.hypot(
        enemy.x-s.x,
        enemy.y-s.y
      );

      if(d>190)continue;

      if(!g.hasLineOfSight?.(
        {x:s.x,y:s.y},
        enemy
      ))continue;

      if(d<bestScore){
        best=enemy;
        bestScore=d;
      }
    }

    return best;
  }

  function update(dt){
    const g=G();

    if(!g?.running || !isTrainer()){
      return;
    }

    const pet=ensure();

    if(!pet)return;

    applyEffects();

    const s=window.EFRPetState;
    if(!s)return;

    const type=PET_TYPES[pet.type];

    if(pet.downed){
      s.x+=(g.player.x-35-s.x)*Math.min(1,dt*2);
      s.y+=(g.player.y+35-s.y)*Math.min(1,dt*2);
      return;
    }

    /*
     * プレイヤーの少し後ろを追従。
     */
    const targetX=
      g.player.x-g.player.facingX*32;

    const targetY=
      g.player.y-g.player.facingY*32;

    const dx=targetX-s.x;
    const dy=targetY-s.y;
    const d=Math.hypot(dx,dy)||1;

    if(d>18){
      const step=
        Math.min(
          d,
          95*(type.speed||1)*dt
        );

      s.x+=dx/d*step;
      s.y+=dy/d*step;
    }

    /*
     * ペット攻撃。
     */
    attackTimer=Math.max(0,attackTimer-dt);

    const target=nearestEnemy();

    if(target && attackTimer<=0){
      const damage=
        12+
        (pet.level-1)*2+
        skillLevel("combat")*5+
        (type.damage||0);

      target.hp-=damage;
      attackTimer=.9;

      if(target.hp<=0){
        target.dead=true;
        target.loot=[
          {
            type:"敵の戦利品",
            kind:"loot",
            slots:1
          }
        ];
      }
    }

    /*
     * 敵と近距離になった場合、ペットもダメージを受ける。
     */
    damageTimer=Math.max(0,damageTimer-dt);

    if(damageTimer<=0){
      for(const enemy of g.enemies||[]){
        if(enemy.dead)continue;

        const d=Math.hypot(
          enemy.x-s.x,
          enemy.y-s.y
        );

        if(d<30){
          s.hp-=Math.max(
            1,
            Math.round((enemy.damage||8)*.45)
          );

          damageTimer=.65;
          break;
        }
      }
    }

    if(s.hp<=0){
      s.hp=0;
      pet.downed=true;

      g.logMessage?.(
        PET_TYPES[pet.type].name+
        "が負傷して戦闘不能になりました"
      );
    }

    /*
     * 絆・支援。
     */
    supportTimer=Math.max(0,supportTimer-dt);

    if(
      supportTimer<=0 &&
      skillLevel("bond")>0 &&
      Math.hypot(
        g.player.x-s.x,
        g.player.y-s.y
      )<90
    ){
      g.player.hp=Math.min(
        g.player.maxHp,
        g.player.hp+skillLevel("bond")*2
      );

      supportTimer=8;
    }

    /*
     * 敵撃破を検出してペットXP。
     */
    for(const enemy of g.enemies||[]){
      if(enemy.dead && !enemy.__efrPetXp){
        enemy.__efrPetXp=true;
        gainXP(10);
      }
    }
  }

  function draw(){
    const g=G();
    const s=window.EFRPetState;

    if(!g?.running || !isTrainer() || !s)return;

    const pet=ensure();
    const type=PET_TYPES[pet.type];

    const ctx=g.ctx;

    ctx.save();

    ctx.fillStyle=
      pet.downed
        ? "#666"
        : pet.type==="bird"
          ? "#e8d28a"
          : pet.type==="cat"
            ? "#c8a8d8"
            : pet.type==="pack"
              ? "#9b7958"
              : "#a86f4d";

    ctx.beginPath();
    ctx.arc(s.x,s.y,11,0,Math.PI*2);
    ctx.fill();

    ctx.strokeStyle=
      pet.downed
        ? "#aaa"
        : "#fff";

    ctx.stroke();

    ctx.fillStyle="#fff";
    ctx.font="bold 9px sans-serif";
    ctx.textAlign="center";

    ctx.fillText(
      type.name,
      s.x,
      s.y-16
    );

    ctx.fillStyle="#222";
    ctx.fillRect(
      s.x-14,
      s.y+14,
      28,
      3
    );

    ctx.fillStyle="#67c56f";
    ctx.fillRect(
      s.x-14,
      s.y+14,
      28*Math.max(
        0,
        s.hp/s.maxHp
      ),
      3
    );

    ctx.restore();
  }

  function getState(){
    const pet=ensure();

    return {
      ...pet,
      typeData:PET_TYPES[pet.type],
      xpNext:xpNext(pet.level)
    };
  }

  function init(){
    ensure();
    applyEffects();
  }

  window.EFRPet={
    PET_TYPES,
    PET_SKILLS,
    ensure,
    getState,
    gainXP,
    skillLevel,
    spendSkill,
    setType,
    prepareRaid,
    onExtract,
    onFail,
    applyEffects,
    update,
    draw,
    init
  };

  init();
})();
