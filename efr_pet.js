(function(){
  "use strict";

  const G=()=>window.EFRGame;
  const MAX_ANIMALS=20;

  const PET_TYPES={
    hound:{name:"猟犬",desc:"戦闘・追跡・突撃",damage:6,speed:1.15,vision:0,enemyVision:1,ability:"rush"},
    bird:{name:"偵察鳥",desc:"索敵・マーキング・偵察",damage:-2,speed:1.25,vision:100,enemyVision:1,ability:"mark"},
    cat:{name:"猫",desc:"隠密・接近・回避",damage:2,speed:1.1,vision:25,enemyVision:.75,ability:"stealth"},
    pack:{name:"荷運び獣",desc:"探索・携行・素材回収支援",damage:-2,speed:.9,vision:35,enemyVision:1,carry:2,ability:"search"}
  };

  const PET_SKILLS={
    combat:{name:"戦闘訓練",desc:"ペット攻撃力 +5 / Lv",max:3},
    scout:{name:"偵察訓練",desc:"プレイヤー視界 +50 / Lv",max:3},
    bond:{name:"絆・支援",desc:"一定間隔でプレイヤーを回復",max:3}
  };

  const COMMANDS={
    follow:{name:"追従",desc:"プレイヤーについてくる"},
    attack:{name:"攻撃",desc:"近くの敵を優先して攻撃"},
    wait:{name:"待機",desc:"その場で待機"}
  };

  let attackTimers=[];
  let damageTimers=[];
  let supportTimers=[];
  let abilityTimers=[];
  let xpTimers=[];

  function clone(x){
    return x?JSON.parse(JSON.stringify(x)):x;
  }

  function makeId(){
    return "animal-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
  }

  function isTrainer(){
    return G()?.save?.player?.classId==="trainer";
  }

  function xpNext(level){
    return 40+(Math.max(1,level)-1)*40;
  }

  function normalizeAnimal(animal){
    if(!animal)return null;

    if(!animal.id)animal.id=makeId();

    animal.kind="pet";
    animal.type=PET_TYPES[animal.type]?animal.type:"hound";
    animal.name=animal.name||PET_TYPES[animal.type].name;
    animal.level=Math.max(1,Number(animal.level||1));
    animal.xp=Math.max(0,Number(animal.xp||0));
    animal.skillPoints=Math.max(0,Number(animal.skillPoints||0));
    animal.command=COMMANDS[animal.command]?animal.command:"follow";
    animal.downed=!!animal.downed;

    animal.skills=Object.assign({
      combat:0,
      scout:0,
      bond:0
    },animal.skills||{});

    animal.stats=Object.assign({
      missions:0,
      defeats:0,
      abilities:0
    },animal.stats||{});

    return animal;
  }

  function ensure(){
    const g=G();

    if(!g?.save)return [];

    if(!Array.isArray(g.save.animals)){
      g.save.animals=[];
    }

    g.save.animals=
      g.save.animals
        .slice(0,MAX_ANIMALS)
        .map(normalizeAnimal)
        .filter(Boolean);

    if(
      g.save.player?.pet &&
      !g.save.animals.length
    ){
      g.save.animals.push(
        normalizeAnimal(
          clone(g.save.player.pet)
        )
      );
    }

    if(
      isTrainer() &&
      !g.save.animals.length
    ){
      g.save.animals.push(
        normalizeAnimal({
          type:"hound"
        })
      );
    }

    if(!g.save.player){
      g.save.player={};
    }

    delete g.save.player.pet;

    return g.save.animals;
  }

  function getById(petId){
    return ensure().find(
      x=>x.id===petId
    )||null;
  }

  function equippedAnimals(){
    const g=G();

    if(!g?.save || !isTrainer()){
      return [];
    }

    const animals=ensure();
    const result=[];
    const seen=new Set();

    for(const slot of ["weapon1","weapon2"]){
      const item=g.save.equipment?.[slot];

      if(
        item?.kind!=="pet" ||
        !item.petId ||
        seen.has(item.petId)
      ){
        continue;
      }

      const animal=
        animals.find(
          x=>x.id===item.petId
        );

      if(animal){
        result.push({
          animal,
          slot
        });

        seen.add(animal.id);
      }
    }

    return result;
  }

  function firstEquipped(){
    return equippedAnimals()[0]?.animal||null;
  }

  function gainXP(amount,reason,petId){
    const targets=
      petId
        ? [getById(petId)].filter(Boolean)
        : equippedAnimals().map(
            x=>x.animal
          );

    for(const pet of targets){
      pet.xp+=Math.max(
        0,
        Number(amount||0)
      );

      while(
        pet.xp>=xpNext(pet.level)
      ){
        pet.xp-=xpNext(pet.level);
        pet.level++;
        pet.skillPoints++;

        G().logMessage?.(
          pet.name+
          " Lv."+
          pet.level+
          " / スキルポイント +1"
        );
      }
    }

    G()?.persist?.();
  }

  function skillLevel(key,petId){
    const pet=
      getById(petId)||
      firstEquipped()||
      ensure()[0];

    return Math.max(
      0,
      Math.min(
        PET_SKILLS[key]?.max||0,
        Number(
          pet?.skills?.[key]||0
        )
      )
    );
  }

  function spendSkill(key,petId){
    if(!isTrainer())return false;

    const pet=
      getById(petId)||
      firstEquipped();

    const skill=PET_SKILLS[key];

    if(!pet || !skill)return false;

    const lv=skillLevel(
      key,
      pet.id
    );

    if(
      pet.skillPoints<=0 ||
      lv>=skill.max
    ){
      return false;
    }

    pet.skills[key]=lv+1;
    pet.skillPoints--;

    applyEffects();

    G().persist?.();

    return true;
  }

  function setCommand(command,petId){
    if(
      !isTrainer() ||
      !COMMANDS[command]
    ){
      return false;
    }

    const pet=
      getById(petId)||
      firstEquipped();

    if(!pet)return false;

    pet.command=command;

    G().persist?.();

    G().logMessage?.(
      pet.name+
      "への指示："+
      COMMANDS[command].name
    );

    return true;
  }

  function setType(type,petId){
    if(
      !isTrainer() ||
      !PET_TYPES[type]
    ){
      return false;
    }

    const pet=
      getById(petId)||
      firstEquipped();

    if(!pet)return false;

    pet.type=type;

    applyEffects();

    G().persist?.();

    return true;
  }

  function equipAnimal(petId,slot){
    const g=G();

    if(
      !g?.save ||
      !isTrainer() ||
      !["weapon1","weapon2"].includes(slot)
    ){
      return false;
    }

    const pet=getById(petId);

    if(!pet)return false;

    /*
     * 同じ個体をweapon1/weapon2へ同時装備しない。
     * 別個体なら2匹同時装備可能。
     */
    for(const otherSlot of ["weapon1","weapon2"]){
      if(
        g.save.equipment?.[otherSlot]?.kind==="pet" &&
        g.save.equipment[otherSlot].petId===pet.id
      ){
        g.save.equipment[otherSlot]=null;
      }
    }

    g.save.equipment[slot]={
      kind:"pet",
      petId:pet.id,
      name:pet.name,
      type:pet.type,
      slots:1,
      weight:0
    };

    g.activeWeaponSlot=
      slot==="weapon2"
        ? 2
        : 1;

    applyEffects();

    g.persist?.();
    g.renderInventory?.();
    window.EFRLoadout?.render?.();
    window.EFRHub?.render?.();

    return true;
  }

  function unequipAnimal(slot){
    const g=G();

    if(
      !g?.save ||
      !isTrainer() ||
      !["weapon1","weapon2"].includes(slot)
    ){
      return false;
    }

    if(
      g.save.equipment?.[slot]?.kind!=="pet"
    ){
      return false;
    }

    g.save.equipment[slot]=null;

    applyEffects();

    g.persist?.();
    g.renderInventory?.();
    window.EFRLoadout?.render?.();
    window.EFRHub?.render?.();

    return true;
  }

  function applyEffects(){
    const g=G();

    if(!g?.player)return;

    let vision=0;
    let enemyVision=1;
    let carry=0;

    for(
      const {animal} of equippedAnimals()
    ){
      const type=PET_TYPES[animal.type];

      vision=Math.max(
        vision,
        (type.vision||0)+
        skillLevel(
          "scout",
          animal.id
        )*50
      );

      enemyVision=Math.min(
        enemyVision,
        type.enemyVision||1
      );

      carry+=type.carry||0;
    }

    g.player.petVisionBonus=
      isTrainer()
        ? vision
        : 0;

    g.player.petEnemyVisionMultiplier=
      isTrainer()
        ? enemyVision
        : 1;

    g.player.petCarryBonus=
      isTrainer()
        ? carry
        : 0;

    g.player.petDamageBonus=0;
    g.player.petStealthTimer=0;
  }

  function prepareRaid(){
    const g=G();

    if(
      !g ||
      !isTrainer()
    ){
      return;
    }

    const equipped=
      equippedAnimals();

    attackTimers=
      equipped.map(()=>0);

    damageTimers=
      equipped.map(()=>0);

    supportTimers=
      equipped.map(()=>0);

    abilityTimers=
      equipped.map(()=>0);

    xpTimers=
      equipped.map(()=>0);

    window.EFRPetStates=
      equipped.map(
        ({animal},index)=>({
          petId:animal.id,
          x:g.player.x-35-index*24,
          y:g.player.y+35+index*24,
          hp:100,
          maxHp:100,
          markedTarget:null
        })
      );

    window.EFRPetState=
      window.EFRPetStates[0]||null;

    for(
      const {animal} of equipped
    ){
      animal.downed=false;
      animal.stats.missions++;
    }

    g.persist?.();
    renderHud();
  }

  function onExtract(){
    for(
      const {animal} of equippedAnimals()
    ){
      animal.downed=false;
      gainXP(
        15,
        "extract",
        animal.id
      );
    }

    resetStates();
  }

  function onFail(){
    for(
      const {animal} of equippedAnimals()
    ){
      animal.downed=false;
    }

    resetStates();
  }

  function resetStates(){
    if(
      Array.isArray(
        window.EFRPetStates
      )
    ){
      for(
        const state of window.EFRPetStates
      ){
        state.hp=state.maxHp;
      }
    }

    window.EFRPetState=
      window.EFRPetStates?.[0]||null;

    G()?.persist?.();
  }

  function stateFor(petId){
    return (
      window.EFRPetStates||[]
    ).find(
      state=>state.petId===petId
    )||null;
  }

  function movePetToward(
    targetX,
    targetY,
    dt,
    speed,
    state
  ){
    const g=G();

    if(!g || !state)return;

    const dx=targetX-state.x;
    const dy=targetY-state.y;
    const d=Math.hypot(dx,dy)||1;

    if(d<=.01)return;

    const step=Math.min(
      d,
      speed*dt
    );

    const nx=
      state.x+
      dx/d*step;

    const ny=
      state.y+
      dy/d*step;

    if(
      typeof g.blocked==="function" &&
      !g.blocked({
        x:nx,
        y:ny,
        r:11
      })
    ){
      state.x=nx;
      state.y=ny;
      return;
    }

    if(
      typeof g.blocked==="function" &&
      !g.blocked({
        x:nx,
        y:state.y,
        r:11
      })
    ){
      state.x=nx;
    }

    if(
      typeof g.blocked==="function" &&
      !g.blocked({
        x:state.x,
        y:ny,
        r:11
      })
    ){
      state.y=ny;
    }
  }

  function nearestEnemy(range,state){
    const g=G();

    if(!g || !state)return null;

    let best=null;
    let bestScore=Infinity;

    for(
      const enemy of g.enemies||[]
    ){
      if(enemy.dead)continue;

      const d=
        Math.hypot(
          enemy.x-state.x,
          enemy.y-state.y
        );

      if(
        d>(range||190)
      ){
        continue;
      }

      if(
        g.hasLineOfSight &&
        !g.hasLineOfSight(
          {
            x:state.x,
            y:state.y
          },
          enemy
        )
      ){
        continue;
      }

      if(d<bestScore){
        best=enemy;
        bestScore=d;
      }
    }

    return best;
  }

  function markNearby(state){
    const g=G();

    if(!g || !state)return 0;

    let count=0;

    for(
      const enemy of g.enemies||[]
    ){
      if(enemy.dead)continue;

      const d=
        Math.hypot(
          enemy.x-state.x,
          enemy.y-state.y
        );

      if(d>280)continue;

      enemy.efrPetMarked=true;
      enemy.efrPetMarkTimer=12;

      count++;
    }

    return count;
  }

  function onLootInspect(target,source){
    if(
      !G() ||
      !isTrainer() ||
      !target
    ){
      return false;
    }

    const pet=
      equippedAnimals()
        .find(
          x=>x.animal.type==="pack"
        )?.animal;

    if(
      !pet ||
      pet.downed ||
      target.efrPackLootChecked
    ){
      return false;
    }

    target.efrPackLootChecked=true;

    if(
      Math.random()>=.10 ||
      typeof G().createPackBonusLootItem!=="function"
    ){
      return false;
    }

    const bonus=
      G().createPackBonusLootItem();

    if(!bonus)return false;

    if(!Array.isArray(target.loot)){
      target.loot=[];
    }

    target.loot.push(bonus);

    gainXP(
      4,
      "pack-loot-bonus",
      pet.id
    );

    G().logMessage?.(
      "荷運び獣の効果で"+
      (
        source==="enemy"
          ? "敵の戦利品"
          : "コンテナ"
      )+
      "に追加ドロップが1枠発生しました"
    );

    G().persist?.();

    return true;
  }

  function useAbility(petId){
    const g=G();

    if(
      !g ||
      !isTrainer()
    ){
      return false;
    }

    const pet=
      getById(petId)||
      firstEquipped();

    const state=
      stateFor(pet?.id);

    if(
      !pet ||
      !state ||
      pet.downed
    ){
      return false;
    }

    const index=
      equippedAnimals().findIndex(
        x=>x.animal.id===pet.id
      );

    if(
      (abilityTimers[index]||0)>0
    ){
      g.logMessage?.(
        "ペット能力は再使用待ちです"
      );
      return false;
    }

    const type=PET_TYPES[pet.type];

    if(type.ability==="rush"){
      const target=
        nearestEnemy(
          280,
          state
        );

      if(!target){
        g.logMessage?.(
          "突撃対象がいません"
        );
        return false;
      }

      target.hp-=
        30+
        pet.level*3+
        skillLevel(
          "combat",
          pet.id
        )*5;

      target.efrPetMarked=true;
      target.efrPetMarkTimer=8;

      if(target.hp<=0){
        target.dead=true;
        target.loot=[
          {
            type:"敵の戦利品",
            kind:"loot",
            slots:1
          }
        ];

        pet.stats.defeats++;

        g.gainPlayerXP?.(
          20,
          "pet-ability-defeat"
        );

        gainXP(
          15,
          "ability",
          pet.id
        );
      }

      abilityTimers[index]=8;
      pet.stats.abilities++;

      g.logMessage?.(
        pet.name+
        "が敵へ突撃しました"
      );

    }else if(type.ability==="mark"){
      const count=
        markNearby(state);

      if(!count){
        g.logMessage?.(
          "周囲に敵がいません"
        );
        return false;
      }

      abilityTimers[index]=10;
      pet.stats.abilities++;

      gainXP(
        5,
        "scout",
        pet.id
      );

      g.logMessage?.(
        pet.name+
        "が"+
        count+
        "体の敵をマーキングしました"
      );

    }else if(type.ability==="stealth"){
      g.player.petStealthTimer=8;

      abilityTimers[index]=12;
      pet.stats.abilities++;

      g.logMessage?.(
        pet.name+
        "と身を潜めました"
      );

    }else if(type.ability==="search"){
      abilityTimers[index]=10;
      pet.stats.abilities++;

      g.logMessage?.(
        pet.name+
        "は探索準備中です。中身を初めて確認した時に効果判定します"
      );
    }

    g.persist?.();

    return true;
  }

  function updateMarkedEnemies(dt){
    const g=G();

    for(
      const enemy of g?.enemies||[]
    ){
      if(!enemy.efrPetMarked)continue;

      enemy.efrPetMarkTimer=
        Math.max(
          0,
          (enemy.efrPetMarkTimer||0)-dt
        );

      if(
        enemy.efrPetMarkTimer<=0
      ){
        enemy.efrPetMarked=false;
      }
    }
  }

  function update(dt){
    const g=G();

    if(
      !g?.running ||
      !isTrainer()
    ){
      return;
    }

    const equipped=
      equippedAnimals();

    if(!equipped.length){
      return;
    }

    applyEffects();
    updateMarkedEnemies(dt);

    if(
      (window.EFRPetStates||[]).length !==
      equipped.length
    ){
      prepareRaid();
    }

    const states=
      window.EFRPetStates||[];

    equipped.forEach(
      ({animal},index)=>{
        const state=states[index];

        if(!state)return;

        const type=
          PET_TYPES[animal.type];

        abilityTimers[index]=
          Math.max(
            0,
            (abilityTimers[index]||0)-dt
          );

        xpTimers[index]=
          Math.max(
            0,
            (xpTimers[index]||0)-dt
          );

        if(animal.downed){
          movePetToward(
            g.player.x-35-index*24,
            g.player.y+35+index*24,
            dt,
            95,
            state
          );

          return;
        }

        if(
          animal.command==="follow"
        ){
          const targetX=
            g.player.x-
            g.player.facingX*32;

          const targetY=
            g.player.y-
            g.player.facingY*32;

          if(
            Math.hypot(
              targetX-state.x,
              targetY-state.y
            )>18
          ){
            movePetToward(
              targetX,
              targetY,
              dt,
              95*(type.speed||1),
              state
            );
          }
        }

        if(
          animal.command==="attack"
        ){
          const target=
            nearestEnemy(
              280,
              state
            );

          if(
            target &&
            Math.hypot(
              target.x-state.x,
              target.y-state.y
            )>25
          ){
            movePetToward(
              target.x,
              target.y,
              dt,
              105*(type.speed||1),
              state
            );
          }
        }

        attackTimers[index]=
          Math.max(
            0,
            (attackTimers[index]||0)-dt
          );

        if(
          animal.command!=="wait" &&
          attackTimers[index]<=0
        ){
          const target=
            nearestEnemy(
              animal.command==="attack"
                ? 300
                : 190,
              state
            );

          if(target){
            target.hp-=
              12+
              (animal.level-1)*2+
              skillLevel(
                "combat",
                animal.id
              )*5+
              (type.damage||0);

            target.efrPetMarked=true;
            target.efrPetMarkTimer=5;

            attackTimers[index]=.9;

            if(target.hp<=0){
              target.dead=true;

              target.loot=[
                {
                  type:"敵の戦利品",
                  kind:"loot",
                  slots:1
                }
              ];

              animal.stats.defeats++;

              g.gainPlayerXP?.(
                20,
                "pet-defeat"
              );

              gainXP(
                10+
                (
                  animal.command==="attack"
                    ? 3
                    : 0
                ),
                "defeat",
                animal.id
              );
            }
          }
        }

        damageTimers[index]=
          Math.max(
            0,
            (damageTimers[index]||0)-dt
          );

        if(
          damageTimers[index]<=0
        ){
          for(
            const enemy of g.enemies||[]
          ){
            if(enemy.dead)continue;

            const d=
              Math.hypot(
                enemy.x-state.x,
                enemy.y-state.y
              );

            if(d<30){
              state.hp-=
                Math.max(
                  1,
                  Math.round(
                    (enemy.damage||8)*.45
                  )
                );

              damageTimers[index]=.65;
              break;
            }
          }
        }

        if(state.hp<=0){
          state.hp=0;
          animal.downed=true;

          g.logMessage?.(
            animal.name+
            "が負傷して戦闘不能になりました"
          );
        }

        supportTimers[index]=
          Math.max(
            0,
            (supportTimers[index]||0)-dt
          );

        if(
          supportTimers[index]<=0 &&
          skillLevel(
            "bond",
            animal.id
          )>0 &&
          Math.hypot(
            g.player.x-state.x,
            g.player.y-state.y
          )<90
        ){
          g.player.hp=
            Math.min(
              g.player.maxHp||100,
              g.player.hp+
              skillLevel(
                "bond",
                animal.id
              )*2
            );

          supportTimers[index]=8;
        }

        if(
          xpTimers[index]<=0 &&
          animal.command!=="wait"
        ){
          gainXP(
            1,
            "activity",
            animal.id
          );

          xpTimers[index]=12;
        }
      }
    );

    window.EFRPetState=
      states[0]||null;

    renderHud();
  }

  function draw(){
    const g=G();

    if(
      !g?.running ||
      !isTrainer()
    ){
      return;
    }

    const equipped=
      equippedAnimals();

    const states=
      window.EFRPetStates||[];

    if(!equipped.length)return;

    const ctx=g.ctx;

    ctx.save();

    for(
      const enemy of g.enemies||[]
    ){
      if(
        enemy.dead ||
        !enemy.efrPetMarked
      ){
        continue;
      }

      ctx.strokeStyle="#f6d365";
      ctx.lineWidth=2;

      ctx.beginPath();
      ctx.arc(
        enemy.x,
        enemy.y,
        enemy.r+7,
        0,
        Math.PI*2
      );
      ctx.stroke();

      ctx.fillStyle="#f6d365";
      ctx.font="bold 11px sans-serif";
      ctx.textAlign="center";

      ctx.fillText(
        "MARK",
        enemy.x,
        enemy.y-enemy.r-10
      );
    }

    equipped.forEach(
      ({animal},index)=>{
        const state=states[index];

        if(!state)return;

        const type=
          PET_TYPES[animal.type];

        ctx.fillStyle=
          animal.downed
            ? "#666"
            : animal.type==="bird"
              ? "#e8d28a"
              : animal.type==="cat"
                ? "#c8a8d8"
                : animal.type==="pack"
                  ? "#9b7958"
                  : "#a86f4d";

        ctx.beginPath();

        ctx.arc(
          state.x,
          state.y,
          11,
          0,
          Math.PI*2
        );

        ctx.fill();

        ctx.strokeStyle=
          animal.downed
            ? "#aaa"
            : "#fff";

        ctx.stroke();

        ctx.fillStyle="#fff";
        ctx.font="bold 9px sans-serif";
        ctx.textAlign="center";

        ctx.fillText(
          animal.name,
          state.x,
          state.y-16
        );

        ctx.fillText(
          COMMANDS[animal.command].name,
          state.x,
          state.y+27
        );

        ctx.fillStyle="#222";

        ctx.fillRect(
          state.x-14,
          state.y+14,
          28,
          3
        );

        ctx.fillStyle="#67c56f";

        ctx.fillRect(
          state.x-14,
          state.y+14,
          28*
          Math.max(
            0,
            state.hp/state.maxHp
          ),
          3
        );
      }
    );

    ctx.restore();
  }

  function ensureHud(){
    if(
      document.getElementById(
        "efrPetHud"
      )
    ){
      return;
    }

    const raid=
      document.getElementById(
        "raidPanel"
      );

    if(!raid)return;

    const hud=
      document.createElement("div");

    hud.id="efrPetHud";
    hud.className="efrPetHud";

    hud.innerHTML=`
      <strong>ペット</strong>
      <div id="efrPetHudList"></div>
    `;

    raid.insertBefore(
      hud,
      raid.querySelector("canvas")
    );

    hud.addEventListener(
      "click",
      event=>{
        const command=
          event.target.closest(
            "[data-pet-command]"
          );

        if(command){
          setCommand(
            command.dataset.petCommand,
            command.dataset.petId
          );

          renderHud();

          return;
        }

        const ability=
          event.target.closest(
            "[data-pet-ability]"
          );

        if(ability){
          useAbility(
            ability.dataset.petId
          );

          renderHud();
        }
      }
    );
  }

  function renderHud(){
    ensureHud();

    const hud=
      document.getElementById(
        "efrPetHud"
      );

    if(!hud)return;

    hud.classList.toggle(
      "hidden",
      !isTrainer()
    );

    if(!isTrainer())return;

    const list=
      document.getElementById(
        "efrPetHudList"
      );

    if(!list)return;

    list.innerHTML=
      equippedAnimals()
        .map(({animal})=>{
          const state=
            stateFor(animal.id);

          return `
            <div class="efrPetHudCard">
              <b>
                ${animal.name}
                Lv.${animal.level}
              </b>
              <span>
                ${
                  state
                    ? "HP "+
                      Math.round(state.hp)+
                      "/"+
                      Math.round(state.maxHp)
                    : "未出撃"
                }
                /
                指示：
                ${COMMANDS[animal.command].name}
              </span>
              <div class="efrPetHudButtons">
                <button
                  data-pet-id="${animal.id}"
                  data-pet-command="follow"
                >追従</button>
                <button
                  data-pet-id="${animal.id}"
                  data-pet-command="attack"
                >攻撃</button>
                <button
                  data-pet-id="${animal.id}"
                  data-pet-command="wait"
                >待機</button>
                <button
                  data-pet-id="${animal.id}"
                  data-pet-ability
                >能力</button>
              </div>
            </div>
          `;
        })
        .join("")||
      "<span>ペット未装備</span>";
  }

  function getState(){
    const pet=
      firstEquipped()||
      ensure()[0];

    if(!pet)return null;

    return {
      ...pet,
      typeData:
        PET_TYPES[pet.type],
      xpNext:
        xpNext(pet.level),
      commands:COMMANDS,
      ability:
        PET_TYPES[pet.type]?.ability
    };
  }

  function getAnimals(){
    return ensure();
  }

  function init(){
    ensure();
    ensureHud();
    applyEffects();
    renderHud();

    setInterval(
      renderHud,
      300
    );
  }

  window.EFRPet={
    PET_TYPES,
    PET_SKILLS,
    COMMANDS,
    MAX_ANIMALS,
    ensure,
    getState,
    getAnimals,
    equippedAnimals,
    gainXP,
    skillLevel,
    spendSkill,
    setType,
    setCommand,
    equipAnimal,
    unequipAnimal,
    prepareRaid,
    onExtract,
    onFail,
    useAbility,
    onLootInspect,
    applyEffects,
    update,
    draw,
    init
  };

  init();

})();
