(function(){
  "use strict";

  const G=()=>window.EFRGame;
  const MAX_ANIMALS=20;

  const MAX_PET_LEVEL=5;
  const PET_BOARD_SIZE=9;
  const PET_SKILL_BOARD_VERSION=3;

  const WILD_PET_CHANCE=.30;
  const WILD_PET_MAX_SPAWN_ATTEMPTS=120;

  let wildPets=[];
  let capturedWildPet=null;
  let pendingWildPetId=null;

  const PET_TYPES={
    // 戦闘系
    hound:{name:"猟犬",group:"戦闘",desc:"戦闘・追跡・突撃",damage:6,speed:1.15,vision:0,enemyVision:1,ability:"rush",baseHp:120},
    wolf:{name:"狼",group:"戦闘",desc:"戦闘・追跡・威嚇",damage:8,speed:1.12,vision:10,enemyVision:1,ability:"rush",baseHp:135},
    bear:{name:"熊",group:"戦闘",desc:"高耐久・強打・威嚇",damage:12,speed:.78,vision:0,enemyVision:1,ability:"rush",baseHp:220},
    tiger:{name:"虎",group:"戦闘",desc:"攻撃・奇襲・接近",damage:14,speed:1.2,vision:10,enemyVision:.9,ability:"rush",baseHp:160},
    leopard:{name:"豹",group:"戦闘",desc:"高速・奇襲・回避",damage:11,speed:1.28,vision:15,enemyVision:.9,ability:"rush",baseHp:145},

    // 偵察系
    bird:{name:"ハヤブサ",group:"偵察",desc:"索敵・マーキング・偵察",damage:-2,speed:1.25,vision:100,enemyVision:1,ability:"mark",baseHp:80},
    eagle:{name:"鷲",group:"偵察",desc:"遠距離索敵・マーキング",damage:1,speed:1.18,vision:140,enemyVision:1,ability:"mark",baseHp:90},
    owl:{name:"梟",group:"偵察",desc:"夜間索敵・視界補助",damage:0,speed:1.02,vision:125,enemyVision:.95,ability:"mark",baseHp:95},
    crow:{name:"烏",group:"偵察",desc:"探索・索敵・発見",damage:-1,speed:1.2,vision:110,enemyVision:1,ability:"mark",baseHp:75},
    kite:{name:"鳶",group:"偵察",desc:"広域索敵・マーキング",damage:-1,speed:1.15,vision:120,enemyVision:1,ability:"mark",baseHp:85},

    // 隠密系
    cat:{name:"猫",group:"隠密",desc:"隠密・接近・回避",damage:2,speed:1.1,vision:25,enemyVision:.75,ability:"stealth",baseHp:90},
    fox:{name:"狐",group:"隠密",desc:"隠密・回避・探索",damage:3,speed:1.16,vision:40,enemyVision:.7,ability:"stealth",baseHp:100},
    weasel:{name:"鼬",group:"隠密",desc:"小型・高速・回避",damage:2,speed:1.3,vision:20,enemyVision:.65,ability:"stealth",baseHp:65},
    lynx:{name:"山猫",group:"隠密",desc:"奇襲・回避・接近",damage:7,speed:1.2,vision:30,enemyVision:.72,ability:"stealth",baseHp:115},
    snake:{name:"蛇",group:"隠密",desc:"隠密・奇襲・接近",damage:6,speed:1.08,vision:15,enemyVision:.62,ability:"stealth",baseHp:70},

    // 運搬系
    pack:{name:"ロバ",group:"運搬",desc:"探索・素材回収支援",damage:-2,speed:.9,vision:35,enemyVision:1,ability:"search",baseHp:140},
    horse:{name:"馬",group:"運搬",desc:"高速移動・回収支援",damage:3,speed:1.35,vision:30,enemyVision:1,ability:"search",baseHp:170},
    ox:{name:"牛",group:"運搬",desc:"高耐久・回収支援",damage:5,speed:.72,vision:20,enemyVision:1,ability:"search",baseHp:210},
    camel:{name:"ラクダ",group:"運搬",desc:"長距離探索・回収支援",damage:2,speed:.92,vision:35,enemyVision:1,ability:"search",baseHp:180},
    alpaca:{name:"アルパカ",group:"運搬",desc:"回収・探索支援",damage:0,speed:.88,vision:30,enemyVision:1,ability:"search",baseHp:150},

    // 探索系
    dog:{name:"雑種犬",group:"探索",desc:"探索・発見・追跡",damage:4,speed:1.08,vision:50,enemyVision:1,ability:"search",baseHp:105},
    raccoon:{name:"狸",group:"探索",desc:"探索・発見・回収",damage:2,speed:.98,vision:55,enemyVision:.9,ability:"search",baseHp:110},
    boar:{name:"猪",group:"探索",desc:"突破・探索・素材回収",damage:8,speed:1.0,vision:25,enemyVision:1,ability:"search",baseHp:155},
    goat:{name:"山羊",group:"探索",desc:"悪路探索・素材発見",damage:3,speed:1.05,vision:45,enemyVision:1,ability:"search",baseHp:125},
    monkey:{name:"猿",group:"探索",desc:"探索・回収・発見",damage:3,speed:1.18,vision:70,enemyVision:.9,ability:"search",baseHp:85},

    // 支援系
    deer:{name:"鹿",group:"支援",desc:"回復・索敵・支援",damage:2,speed:1.1,vision:55,enemyVision:.9,ability:"support",baseHp:130},
    rabbit:{name:"兎",group:"支援",desc:"回避・回復・索敵",damage:0,speed:1.28,vision:45,enemyVision:.72,ability:"support",baseHp:60},
    sheep:{name:"羊",group:"支援",desc:"回復・携行支援",damage:0,speed:.86,vision:25,enemyVision:1,ability:"support",baseHp:125},
    capybara:{name:"カピバラ",group:"支援",desc:"回復・安定支援",damage:1,speed:.82,vision:35,enemyVision:.95,ability:"support",baseHp:160},
    golden:{name:"ゴールデンレトリバー",group:"支援",desc:"回復・追跡・支援",damage:4,speed:1.04,vision:45,enemyVision:.95,ability:"support",baseHp:135},

    // 水辺系
    otter:{name:"カワウソ",group:"水辺",desc:"水辺探索・回収",damage:3,speed:1.12,vision:50,enemyVision:.9,ability:"search",baseHp:95},
    cormorant:{name:"鵜",group:"水辺",desc:"水辺索敵・探索",damage:1,speed:1.05,vision:90,enemyVision:1,ability:"mark",baseHp:85},
    penguin:{name:"ペンギン",group:"水辺",desc:"水辺探索・支援",damage:1,speed:.8,vision:45,enemyVision:.95,ability:"support",baseHp:110},
    turtle:{name:"亀",group:"水辺",desc:"高耐久・探索・支援",damage:2,speed:.55,vision:35,enemyVision:.9,ability:"support",baseHp:190},
    crocodile:{name:"ワニ",group:"水辺",desc:"高耐久・奇襲・水辺戦闘",damage:13,speed:.82,vision:45,enemyVision:.85,ability:"rush",baseHp:200},

    // 特殊系
    bat:{name:"コウモリ",group:"特殊",desc:"索敵・暗所探索・回避",damage:1,speed:1.3,vision:95,enemyVision:.8,ability:"mark",baseHp:65},
    spider:{name:"蜘蛛",group:"特殊",desc:"隠密・奇襲・妨害",damage:5,speed:1.08,vision:20,enemyVision:.6,ability:"stealth",baseHp:55},
    squirrel:{name:"リス",group:"特殊",desc:"素材発見・回収・探索",damage:0,speed:1.3,vision:60,enemyVision:.75,ability:"search",baseHp:50},
    badger:{name:"アナグマ",group:"特殊",desc:"探索・突破・高耐久",damage:7,speed:.9,vision:30,enemyVision:.85,ability:"search",baseHp:145},
    raccoonDog:{name:"ハクビシン",group:"特殊",desc:"隠密・探索・回収",damage:2,speed:1.05,vision:55,enemyVision:.7,ability:"stealth",baseHp:95}
  };

  const WILD_PET_ENVIRONMENT_POOLS={
    default:Object.keys(PET_TYPES),
    forest:["fox","deer","monkey","boar","owl","rabbit","squirrel","badger","wolf","lynx"],
    urban:["cat","raccoonDog","raccoon","crow","weasel","fox","bat","squirrel","snake","dog"],
    water:["otter","cormorant","penguin","turtle","crocodile","deer","rabbit","camel","crow","owl"],
    mountain:["goat","bear","lynx","wolf","eagle","owl","rabbit","squirrel","fox","badger"],
    coast:["otter","cormorant","penguin","turtle","crow","eagle","fox","rabbit","cat","dog"]
  };

  function wildPetCandidateTypes(){
    const environment=String(
      G()?.world?.environment||"default"
    ).toLowerCase();

    return (
      WILD_PET_ENVIRONMENT_POOLS[environment]||
      WILD_PET_ENVIRONMENT_POOLS.default
    );
  }

  function findWildPetSpawn(){
    const g=G();
    const walls=
      Array.isArray(g?.world?.walls)
        ? g.world.walls
        : [];

    const worldWidth=Math.max(
      0,
      ...walls.map(
        wall=>
          (Number(wall?.x)||0)+
          (Number(wall?.w)||0)
      )
    );

    const worldHeight=Math.max(
      0,
      ...walls.map(
        wall=>
          (Number(wall?.y)||0)+
          (Number(wall?.h)||0)
      )
    );

    if(
      !g ||
      !g.player ||
      !walls.length ||
      worldWidth<=0 ||
      worldHeight<=0
    ){
      return null;
    }

    const spawnRadius=14;
    const minPlayerDistance=120;

    function valid(x,y){
      if(
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      ){
        return false;
      }

      if(
        x<spawnRadius ||
        y<spawnRadius ||
        x>worldWidth-spawnRadius ||
        y>worldHeight-spawnRadius
      ){
        return false;
      }

      if(
        Math.hypot(
          x-g.player.x,
          y-g.player.y
        )<minPlayerDistance
      ){
        return false;
      }

      if(
        typeof g.blocked==="function" &&
        g.blocked({
          x,
          y,
          r:spawnRadius
        })
      ){
        return false;
      }

      return true;
    }

    for(
      let attempt=0;
      attempt<WILD_PET_MAX_SPAWN_ATTEMPTS;
      attempt++
    ){
      const x=
        spawnRadius+
        Math.random()*
        Math.max(
          40,
          worldWidth-spawnRadius*2
        );

      const y=
        spawnRadius+
        Math.random()*
        Math.max(
          40,
          worldHeight-spawnRadius*2
        );

      if(valid(x,y)){
        return {x,y};
      }
    }

    const step=24;

    for(
      let y=spawnRadius;
      y<=worldHeight-spawnRadius;
      y+=step
    ){
      for(
        let x=spawnRadius;
        x<=worldWidth-spawnRadius;
        x+=step
      ){
        if(valid(x,y)){
          return {x,y};
        }
      }
    }

    return null;
  }
  function closeWildReleaseChoice(){
    const modal=
      document.getElementById(
        "efrWildPetReleaseModal"
      );

    if(modal){
      modal.remove();
    }
  }

  function prepareWildEncounter(){
    const g=G();

    wildPets=[];
    capturedWildPet=null;
    pendingWildPetId=null;
    closeWildReleaseChoice();

    if(
      !g ||
      !g.world ||
      !isTrainer()
    ){
      return;
    }

    if(Math.random()>=WILD_PET_CHANCE){
      return;
    }

    const pool=wildPetCandidateTypes();

    const type=
      pool[
        Math.floor(
          Math.random()*pool.length
        )
      ]||
      Object.keys(PET_TYPES)[0];

    const spawn=findWildPetSpawn();

    /*
     * 安全な地面を確保できない場合は、
     * 壁の中へ生成するより今回の出現を見送る。
     */
    if(!spawn){
      return;
    }

    const animal=normalizeAnimal({type});

    wildPets.push({
      ...animal,
      x:spawn.x,
      y:spawn.y,
      inspected:false,
      wanderTimer:1.5+Math.random()*2.5,
      wanderX:spawn.x,
      wanderY:spawn.y
    });

    g.logMessage?.(
      "探索中に動物の気配があります"
    );
  }

  function getNearestWildPet(x,y,maxDistance=38){
    let best=null;
    let bestDistance=Infinity;

    for(const pet of wildPets){
      const distance=
        Math.hypot(
          Number(x)-pet.x,
          Number(y)-pet.y
        );

      if(
        distance<=maxDistance &&
        distance<bestDistance
      ){
        best=pet;
        bestDistance=distance;
      }
    }

    return best;
  }

  function inspectWildPet(petId){
    const pet=
      wildPets.find(
        item=>item.id===petId
      );

    if(!pet)return false;

    pet.inspected=true;

    G()?.logMessage?.(
      pet.name+"を調べました"
    );

    return true;
  }

  function releaseAnimal(petId){
    const g=G();

    if(
      !g?.save ||
      !Array.isArray(g.save.animals)
    ){
      return false;
    }

    const exists=
      g.save.animals.some(
        animal=>animal?.id===petId
      );

    if(!exists){
      return false;
    }

    for(const slot of ["weapon1","weapon2"]){
      if(
        g.save.equipment?.[slot]?.kind==="pet" &&
        g.save.equipment[slot].petId===petId
      ){
        g.save.equipment[slot]=null;
      }
    }

    g.save.animals=
      g.save.animals.filter(
        animal=>animal?.id!==petId
      );

    applyEffects();
    g.persist?.();
    g.renderInventory?.();
    window.EFRLoadout?.render?.();
    window.EFRHub?.render?.();

    return true;
  }

  function cleanupWildPetForSave(pet){
    const animal=clone(pet);

    delete animal.x;
    delete animal.y;
    delete animal.wanderTimer;
    delete animal.wanderX;
    delete animal.wanderY;
    delete animal.inspected;
    delete animal.vx;
    delete animal.vy;
    delete animal.moving;

    animal.command="follow";
    animal.downed=false;

    return normalizeAnimal(animal);
  }

  function finalizeCapturedWildPet(){
    const g=G();

    if(
      !g?.save ||
      !capturedWildPet ||
      !Array.isArray(g.save.animals) ||
      g.save.animals.length>=MAX_ANIMALS
    ){
      return false;
    }

    const animal=
      cleanupWildPetForSave(
        capturedWildPet.animal
      );

    animal.command="follow";
    animal.downed=false;

    g.save.animals.push(animal);

    g.logMessage?.(
      animal.name+
      "が正式なペットになりました"
    );

    capturedWildPet=null;
    wildPets=[];
    pendingWildPetId=null;

    closeWildReleaseChoice();

    g.persist?.();
    g.renderInventory?.();
    window.EFRLoadout?.render?.();
    window.EFRHub?.render?.();

    return true;
  }

  function rejectNewWildPet(){
    const pet=
      wildPets.find(
        item=>item.id===pendingWildPetId
      );

    if(pet){
      G()?.logMessage?.(
        pet.name+"を逃がしました"
      );
    }

    capturedWildPet=null;
    wildPets=[];
    pendingWildPetId=null;

    closeWildReleaseChoice();
  }

  function openWildReleaseChoice(pet){
    pendingWildPetId=pet.id;

    let modal=
      document.getElementById(
        "efrWildPetReleaseModal"
      );

    if(!modal){
      modal=document.createElement("div");
      modal.id="efrWildPetReleaseModal";
      modal.className="efrWildPetReleaseModal";

      modal.addEventListener(
        "click",
        event=>{
          const reject=
            event.target.closest(
              "[data-wild-release-new]"
            );

          if(reject){
            rejectNewWildPet();
            return;
          }

          const button=
            event.target.closest(
              "[data-wild-release-existing]"
            );

          if(!button){
            return;
          }

          const oldId=
            button.dataset.wildReleaseExisting;

          if(!releaseAnimal(oldId)){
            return;
          }

          finalizeCapturedWildPet();
        }
      );

      document.body.appendChild(modal);
    }

    const animals=ensure();

    modal.innerHTML=`
      <div class="efrWildPetReleaseDialog">
        <strong>ペット枠がいっぱいです</strong>
        <p>新しい個体を逃がすか、既存のペットを1匹逃がしてください。</p>

        <button
          type="button"
          data-wild-release-new
        >新しい${pet.name}を逃がす</button>

        <div class="efrWildPetReleaseList">
          ${animals.map(animal=>`
            <button
              type="button"
              data-wild-release-existing
              data-wild-release-existing="${animal.id}"
            >${animal.name}を逃がす</button>
          `).join("")}
        </div>
      </div>
    `;

    modal.classList.remove("hidden");

    document
      .getElementById("interactionBar")
      ?.classList.add("hidden");
  }

  function captureWildPet(petId){
    const pet=
      wildPets.find(
        item=>item.id===petId
      );

    const g=G();

    if(
      !pet ||
      !pet.inspected ||
      !g ||
      !isTrainer()
    ){
      return false;
    }

    capturedWildPet={
      animal:cleanupWildPetForSave(pet),
      state:{
        petId:pet.id,
        x:pet.x,
        y:pet.y,
        hp:pet.maxHp,
        maxHp:pet.maxHp,
        vx:0,
        vy:0,
        moving:false,
        attackPulse:0,
        hitPulse:0,
        attackDirX:1,
        attackDirY:0
      },
      attackTimer:0
    };

    if(
      Array.isArray(g.save?.animals) &&
      g.save.animals.length>=MAX_ANIMALS
    ){
      openWildReleaseChoice(pet);
      return false;
    }

    wildPets=[];

    g.logMessage?.(
      capturedWildPet.animal.name+
      "を仲間にしました。脱出口まで同行します"
    );

    document
      .getElementById("interactionBar")
      ?.classList.add("hidden");

    return true;
  }

  function resetWildEncounter(){
    wildPets=[];
    capturedWildPet=null;
    pendingWildPetId=null;
    closeWildReleaseChoice();
  }

  function updateWildPets(dt){
    const g=G();

    if(
      !g ||
      !g.running ||
      !wildPets.length
    ){
      return;
    }

    for(const pet of wildPets){
      pet.vx=0;
      pet.vy=0;
      pet.moving=false;

      pet.wanderTimer-=dt;

      if(
        pet.wanderTimer<=0 ||
        Math.hypot(
          pet.wanderX-pet.x,
          pet.wanderY-pet.y
        )<5
      ){
        const angle=
          Math.random()*Math.PI*2;

        const distance=
          20+Math.random()*50;

        pet.wanderX=
          pet.x+
          Math.cos(angle)*distance;

        pet.wanderY=
          pet.y+
          Math.sin(angle)*distance;

        pet.wanderTimer=
          2+Math.random()*3;
      }

      const dx=
        pet.wanderX-pet.x;

      const dy=
        pet.wanderY-pet.y;

      const distance=
        Math.hypot(dx,dy)||1;

      const step=
        Math.min(
          distance,
          18*dt
        );

      const nx=
        pet.x+
        dx/distance*step;

      const ny=
        pet.y+
        dy/distance*step;

      const oldX=pet.x;
      const oldY=pet.y;

      if(
        typeof g.blocked!=="function" ||
        !g.blocked({
          x:nx,
          y:ny,
          r:12
        })
      ){
        pet.x=nx;
        pet.y=ny;
      }

      const movedDt=Math.max(
        dt,
        .0001
      );

      pet.vx=
        (pet.x-oldX)/
        movedDt;

      pet.vy=
        (pet.y-oldY)/
        movedDt;

      pet.moving=
        Math.hypot(
          pet.vx,
          pet.vy
        )>.5;
    }
  }

  function updateCapturedWildPet(dt){
    const g=G();

    if(
      !g ||
      !g.running ||
      !capturedWildPet
    ){
      return;
    }

    const {
      animal,
      state
    }=capturedWildPet;

    state.attackPulse=
      Math.max(
        0,
        (state.attackPulse||0)-dt*5
      );

    state.hitPulse=
      Math.max(
        0,
        (state.hitPulse||0)-dt*7
      );

    if(animal.downed){
      movePetToward(
        g.player.x-g.player.facingX*34,
        g.player.y-g.player.facingY*34,
        dt,
        55,
        state
      );
      return;
    }

    const targetX=
      g.player.x-
      g.player.facingX*58;

    const targetY=
      g.player.y-
      g.player.facingY*58;

    if(
      Math.hypot(
        targetX-state.x,
        targetY-state.y
      )>30
    ){
      movePetToward(
        targetX,
        targetY,
        dt,
        petMoveSpeed(
          animal,
          72*
          (
            PET_TYPES[animal.type]?.speed||
            1
          )
        ),
        state
      );
    }

    capturedWildPet.attackTimer=
      Math.max(
        0,
        capturedWildPet.attackTimer-dt
      );

    if(
      capturedWildPet.attackTimer>0
    ){
      return;
    }

    const target=
      nearestEnemy(
        petTrackingRange(animal,34),
        state
      );

    if(!target){
      return;
    }

    const distance=
      Math.hypot(
        target.x-state.x,
        target.y-state.y
      );

    if(distance>32){
      return;
    }

    const type=
      PET_TYPES[animal.type]||
      PET_TYPES.hound;

    const attackDistance=
      Math.hypot(
        target.x-state.x,
        target.y-state.y
      )||1;

    state.attackDirX=
      (target.x-state.x)/
      attackDistance;

    state.attackDirY=
      (target.y-state.y)/
      attackDistance;

    state.attackPulse=1;

    target.hp-=
      petAttackDamage(animal,type);

    target.efrPetMarked=true;
    target.efrPetMarkTimer=5;

    capturedWildPet.attackTimer=
      petAttackInterval(animal);

    if(target.hp<=0){
      target.dead=true;

      target.loot=[
        {
          type:"敵の戦利品",
          kind:"loot",
          slots:1
        }
      ];

      g.gainPlayerXP?.(
        20,
        "captured-pet-defeat"
      );
    }
  }
  function drawWildPetEntity(ctx,pet,g){
    if(
      Math.hypot(
        g.player.x-pet.x,
        g.player.y-pet.y
      )>420
    ){
      return;
    }

    if(
      g.hasLineOfSight &&
      !g.hasLineOfSight(
        g.player,
        pet
      )
    ){
      return;
    }

    const radius=
      14*
      (Number(pet.size)||1);

    drawPetGraphic(
      ctx,
      pet,
      pet.x,
      pet.y,
      radius,
      {
        moving:pet.moving===true,
        vx:Number(pet.vx)||0,
        vy:Number(pet.vy)||0,
        attackPulse:0,
        hitPulse:0,
        attackDirX:1,
        attackDirY:0
      }
    );

    ctx.save();

    ctx.fillStyle="#fff";
    ctx.font="bold 10px sans-serif";
    ctx.textAlign="center";

    ctx.fillText(
      pet.name,
      pet.x,
      pet.y-radius-7
    );

    ctx.restore();
  }

  function drawCapturedWildPetEntity(ctx,pet){
    const state=pet.state;

    const radius=
      14*
      (Number(pet.animal.size)||1);

    drawPetGraphic(
      ctx,
      pet.animal,
      state.x,
      state.y,
      radius,
      state
    );

    ctx.save();

    ctx.fillStyle="#fff";
    ctx.font="bold 9px sans-serif";
    ctx.textAlign="center";

    ctx.fillText(
      pet.animal.name,
      state.x,
      state.y-radius-5
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
        (state.hp||0)/
        Math.max(
          1,
          state.maxHp||1
        )
      ),
      3
    );

    ctx.restore();
  }

  const PET_SKILLS={
    combat:{name:"戦闘訓練",desc:"通常攻撃ダメージ +5 / Lv",max:3},
    predator:{name:"捕食者",desc:"攻撃間隔 -0.04秒 / Lv",max:3},
    ferocity:{name:"猛攻",desc:"通常攻撃ダメージ +4 / Lv",max:3},
    finisher:{name:"追撃",desc:"HPが低い敵へのダメージ増加",max:3},
    assault:{name:"突撃術",desc:"通常攻撃・能力ダメージ +3 / Lv",max:3},

    scout:{name:"偵察訓練",desc:"プレイヤー視界 +35 / Lv",max:3},
    keenEye:{name:"鋭い眼",desc:"索敵・視界 +25 / Lv",max:3},
    tracking:{name:"追跡",desc:"索敵距離 +25 / Lv",max:3},
    markSense:{name:"標的感知",desc:"マーキング範囲 +30 / Lv",max:3},
    nightSight:{name:"暗視",desc:"暗所での視界を補助",max:3},

    stealth:{name:"気配消し",desc:"敵から見つかりにくくなる",max:3},
    swift:{name:"俊足",desc:"移動速度 +4% / Lv",max:3},
    ambush:{name:"奇襲",desc:"未警戒の敵への初撃ダメージ増加",max:3},
    quietStep:{name:"静音歩行",desc:"敵の視認距離を低下",max:3},
    evasion:{name:"身かわし",desc:"ペットが受けるダメージ -2% / Lv",max:3},

    salvage:{name:"回収術",desc:"追加ドロップ発生率 +3% / Lv",max:3},
    haul:{name:"運搬効率",desc:"追加ドロップ発生率 +2% / Lv",max:3},
    stamina:{name:"持久運搬",desc:"移動速度 +2% / Lv",max:3},

    forager:{name:"採取上手",desc:"追加ドロップ発生率 +3% / Lv",max:3},
    gatherer:{name:"採取熟練",desc:"追加ドロップ発生率 +2% / Lv",max:3},
    finder:{name:"発見眼",desc:"探索物の発見を補助",max:3},
    scavenger:{name:"漁り上手",desc:"追加ドロップ発生率 +3% / Lv",max:3},
    pathfinder:{name:"道標",desc:"索敵・探索範囲 +20 / Lv",max:3},

    bond:{name:"絆・支援",desc:"一定間隔でプレイヤーを回復",max:3},
    healPulse:{name:"治癒波",desc:"絆・支援の回復量 +2 / Lv",max:3},
    morale:{name:"鼓舞",desc:"ペット経験値獲得 +1 / Lv",max:3},
    cleanse:{name:"浄化",desc:"回復時の支援効果を強化",max:3},
    shareXP:{name:"経験共有",desc:"ペット経験値獲得 +2 / Lv",max:3},

    waterAdapt:{name:"水辺適応",desc:"水辺で移動性能を補助",max:3},
    swimmer:{name:"遊泳",desc:"水辺で移動速度 +6% / Lv",max:3},
    diveSense:{name:"潜水感知",desc:"水辺の索敵範囲 +30 / Lv",max:3},
    aquaticForage:{name:"水辺採取",desc:"水辺で追加ドロップ率 +3% / Lv",max:3},
    currentSense:{name:"流れ読み",desc:"水辺の探索範囲 +25 / Lv",max:3},

    guard:{name:"護り",desc:"ペット被ダメージ -5% / Lv",max:3},
    shell:{name:"硬質化",desc:"ペット被ダメージ -3% / Lv",max:3},
    regeneration:{name:"自己再生",desc:"ペット最大HP +5% / Lv",max:3},
    instinct:{name:"生存本能",desc:"瀕死時の被ダメージを軽減",max:3},
    lucky:{name:"幸運体質",desc:"追加ドロップ発生率 +2% / Lv",max:3}
  };

  const PET_SKILL_GROUPS={
    "戦闘":[
      "combat","predator","ferocity","finisher","assault"
    ],
    "偵察":[
      "scout","keenEye","tracking","markSense","nightSight"
    ],
    "隠密":[
      "stealth","swift","ambush","quietStep","evasion"
    ],
    "運搬":[
      "salvage","haul","stamina"
    ],
    "探索":[
      "forager","gatherer","finder","scavenger","pathfinder"
    ],
    "支援":[
      "bond","healPulse","morale","cleanse","shareXP"
    ],
    "水辺":[
      "waterAdapt","swimmer","diveSense","aquaticForage","currentSense"
    ],
    "特殊":[
      "guard","shell","regeneration","instinct","lucky"
    ]
  };

  const PET_SECONDARY_GROUPS={
    hound:"支援",
    wolf:"隠密",
    bear:"特殊",
    tiger:"隠密",
    leopard:"偵察",

    bird:"支援",
    eagle:"戦闘",
    owl:"隠密",
    crow:"探索",
    kite:"戦闘",

    cat:"特殊",
    fox:"探索",
    weasel:"運搬",
    lynx:"戦闘",
    snake:"特殊",

    pack:"探索",
    horse:"支援",
    ox:"特殊",
    camel:"水辺",
    alpaca:"支援",

    dog:"支援",
    raccoon:"隠密",
    boar:"戦闘",
    goat:"運搬",
    monkey:"偵察",

    deer:"偵察",
    rabbit:"隠密",
    sheep:"運搬",
    capybara:"水辺",
    golden:"探索",

    otter:"探索",
    cormorant:"偵察",
    penguin:"支援",
    turtle:"特殊",
    crocodile:"戦闘",

    bat:"偵察",
    spider:"隠密",
    squirrel:"探索",
    badger:"戦闘",
    raccoonDog:"隠密"
  };

  const PET_SKILL_GROUP_BY_KEY=
    Object.fromEntries(
      Object.entries(PET_SKILL_GROUPS)
        .flatMap(([group,keys])=>
          keys.map(key=>[key,group])
        )
    );

  const PET_SKILL_POOLS=
    Object.fromEntries(
      Object.entries(PET_TYPES).map(
        ([type,data])=>{
          const main=
            PET_SKILL_GROUPS[data.group]||[];

          const secondary=
            PET_SKILL_GROUPS[
              PET_SECONDARY_GROUPS[type]
            ]||[];

          return [
            type,
            [...new Set([...main,...secondary])]
          ];
        }
      )
    );

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
    return 50+(Math.max(1,level)-1)*50;
  }

  function petSkillChildren(index){
    const row=Math.floor(index/3);

    if(row>=2){
      return [];
    }

    const column=index%3;
    const nextRow=(row+1)*3;

    return [
      nextRow+Math.max(0,column-1),
      nextRow+column,
      nextRow+Math.min(2,column+1)
    ].filter(
      (value,index,array)=>array.indexOf(value)===index
    );
  }

  function shuffleSkills(values){
    const result=[...values];

    for(let i=result.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [result[i],result[j]]=
        [result[j],result[i]];
    }

    return result;
  }

  function skillPool(animal){
    const type=
      typeof animal==="string"
        ? animal
        : animal?.type;

    const pet=
      typeof animal==="object" &&
      animal
        ? animal
        : null;

    const mainGroup=
      PET_TYPES[type]?.group;

    const main=
      PET_SKILL_GROUPS[mainGroup]||[];

    if(!pet){
      return [...main];
    }

    const secondaryGroup=
      PET_SECONDARY_GROUPS[type];

    const secondary=
      PET_SKILL_GROUPS[secondaryGroup]||[];

    const needsMixReset=
      Number(pet.skillBoardVersion||0)!==
      PET_SKILL_BOARD_VERSION ||
      !Array.isArray(pet.secondarySkillKeys);

    if(needsMixReset){
      const count=
        Math.floor(Math.random()*3);

      pet.secondarySkillKeys=
        shuffleSkills(secondary)
          .slice(0,count);
    }

    return [
      ...new Set([
        ...main,
        ...(pet.secondarySkillKeys||[])
      ])
    ].filter(
      key=>PET_SKILLS[key]
    );
  }

  function createSkillBoard(animal){
    const pool=skillPool(animal);

    return Array.from(
      {length:PET_BOARD_SIZE},
      (_,index)=>({
        index,
        skill:
          pool[
            Math.floor(
              Math.random()*pool.length
            )
          ],
        selected:false
      })
    );
  }

  function skillBoardAvailable(board,index){
    if(!Array.isArray(board))return false;

    if(index<3)return true;

    return board.some(cell=>
      cell?.selected &&
      petSkillChildren(cell.index).includes(index)
    );
  }

  function ensureSkillBoard(animal){
    const pool=skillPool(animal);

    const hadBoard=
      Array.isArray(animal.skillBoard) &&
      animal.skillBoard.length===PET_BOARD_SIZE;

    const oldVersion=
      Number(animal.skillBoardVersion||0);

    if(!hadBoard){
      animal.skillBoard=
        createSkillBoard(animal);
    }else{
      animal.skillBoard=
        animal.skillBoard.map(
          (cell,index)=>({
            index,
            skill:
              oldVersion===PET_SKILL_BOARD_VERSION &&
              pool.includes(cell?.skill)
                ? cell.skill
                : pool[
                    Math.floor(
                      Math.random()*pool.length
                    )
                  ],
            selected:!!cell?.selected
          })
        );
    }

    const level=
      Math.max(
        1,
        Math.min(
          MAX_PET_LEVEL,
          Number(animal.level||1)
        )
      );

    let selectedCount=0;

    for(const cell of animal.skillBoard){
      if(!cell.selected)continue;

      if(selectedCount>=level){
        cell.selected=false;
        continue;
      }

      selectedCount++;
    }

    const skillCounts={};

    for(const cell of animal.skillBoard){
      if(!cell.selected)continue;

      const max=
        Number(PET_SKILLS[cell.skill]?.max||99);

      const current=
        Number(skillCounts[cell.skill]||0);

      if(current>=max){
        const alternatives=
          pool.filter(
            key=>
              Number(skillCounts[key]||0)<
              Number(PET_SKILLS[key]?.max||99)
          );

        if(alternatives.length){
          const replacement=
            alternatives[
              Math.floor(
                Math.random()*alternatives.length
              )
            ];

          cell.skill=replacement;
        }else{
          cell.selected=false;
          continue;
        }
      }

      skillCounts[cell.skill]=
        Number(skillCounts[cell.skill]||0)+1;
    }

    animal.skillBoardVersion=
      PET_SKILL_BOARD_VERSION;

    animal.skillPoints=
      Math.max(
        0,
        Math.min(
          MAX_PET_LEVEL-selectedCount,
          level-selectedCount
        )
      );

    animal.skills={};

    for(const key of Object.keys(PET_SKILLS)){
      animal.skills[key]=
        animal.skillBoard.filter(
          cell=>
            cell.selected &&
            cell.skill===key
        ).length;
    }
  }

  function petMaxHp(animal){
    const type=PET_TYPES[animal?.type]||PET_TYPES.hound;

    const level=
      Math.max(
        1,
        Math.min(
          MAX_PET_LEVEL,
          Number(animal?.level||1)
        )
      );

    const regeneration=
      Array.isArray(animal?.skillBoard)
        ? animal.skillBoard.filter(
            cell=>
              cell?.selected &&
              cell?.skill==="regeneration"
          ).length
        : 0;

    return Math.round(
      Number(type.baseHp||100)*
      (
        1+
        (level-1)*.10+
        regeneration*.05
      )
    );
  }

  function normalizeAnimal(animal){
    if(!animal)return null;

    if(!animal.id)animal.id=makeId();

    animal.kind="pet";
    animal.type=PET_TYPES[animal.type]?animal.type:"hound";
    animal.name=animal.name||PET_TYPES[animal.type].name;

    if(
      !Number.isFinite(Number(animal.size))
    ){
      animal.size=
        Math.round(
          (0.85+Math.random()*0.30)*100
        )/100;
    }

    animal.size=Math.max(
      0.85,
      Math.min(
        1.15,
        Number(animal.size)
      )
    );

    animal.level=Math.max(
      1,
      Math.min(
        MAX_PET_LEVEL,
        Number(animal.level||1)
      )
    );
    animal.xp=Math.max(0,Number(animal.xp||0));
    animal.skillPoints=Math.max(0,Number(animal.skillPoints||0));
    animal.command=COMMANDS[animal.command]?animal.command:"follow";
    animal.downed=!!animal.downed;

    animal.skills=Object.assign(
      Object.fromEntries(
        Object.keys(PET_SKILLS).map(
          key=>[key,0]
        )
      ),
      animal.skills||{}
    );

    ensureSkillBoard(animal);

    animal.baseHp=
      Number(PET_TYPES[animal.type]?.baseHp||100);

    animal.maxHp=petMaxHp(animal);

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
      const baseAmount=
        Math.max(
          0,
          Number(amount||0)
        );

      const xpBonus=
        skillLevel("morale",pet.id)+
        skillLevel("shareXP",pet.id)*2;

      pet.xp+=
        baseAmount+
        xpBonus;

      while(
        pet.level<MAX_PET_LEVEL &&
        pet.xp>=xpNext(pet.level)
      ){
        pet.xp-=xpNext(pet.level);
        pet.level++;
        pet.skillPoints=
          Math.max(
            0,
            pet.level-
            pet.skillBoard.filter(
              cell=>cell.selected
            ).length
          );
        pet.maxHp=petMaxHp(pet);

        G().logMessage?.(
          pet.name+
          " Lv."+
          pet.level+
          " / スキルマス取得権 +1 / HP "+
          pet.maxHp
        );
      }

      if(pet.level>=MAX_PET_LEVEL){
        pet.xp=0;
        pet.skillPoints=
          Math.min(
            5-
            pet.skillBoard.filter(
              cell=>cell.selected
            ).length,
            pet.skillPoints
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

    if(!pet)return 0;

    return Math.max(
      0,
      Math.min(
        PET_SKILLS[key]?.max||99,
        pet.skillBoard.filter(
          cell=>
            cell.selected &&
            cell.skill===key
        ).length
      )
    );
  }

  function petAttackDamage(animal,type,target){
    const lowHp=
      target &&
      Number(target.maxHp||0)>0 &&
      Number(target.hp||0)/
      Number(target.maxHp||1)<=.35;

    return (
      12+
      (Number(animal?.level||1)-1)*2+
      skillLevel("combat",animal?.id)*5+
      skillLevel("ferocity",animal?.id)*4+
      skillLevel("assault",animal?.id)*3+
      skillLevel("predator",animal?.id)*2+
      (
        lowHp
          ? skillLevel("finisher",animal?.id)*4
          : 0
      )+
      Number(type?.damage||0)
    );
  }

  function petAttackInterval(animal){
    return Math.max(
      .45,
      .9-
      skillLevel("predator",animal?.id)*.04-
      skillLevel("assault",animal?.id)*.01
    );
  }

  function petMoveSpeed(animal,baseSpeed){
    const environment=
      String(
        G()?.world?.environment||""
      ).toLowerCase();

    let bonus=
      skillLevel("swift",animal?.id)*.04+
      skillLevel("quietStep",animal?.id)*.01+
      skillLevel("stamina",animal?.id)*.02;

    if(environment==="water"){
      bonus+=
        skillLevel("waterAdapt",animal?.id)*.02+
        skillLevel("swimmer",animal?.id)*.06;
    }

    return Number(baseSpeed||0)*(1+bonus);
  }

  function petTrackingRange(animal,baseRange){
    const environment=
      String(
        G()?.world?.environment||""
      ).toLowerCase();

    let bonus=
      skillLevel("tracking",animal?.id)*25+
      skillLevel("keenEye",animal?.id)*10+
      skillLevel("markSense",animal?.id)*30+
      skillLevel("pathfinder",animal?.id)*20+
      skillLevel("markSense",animal?.id)*30+
      skillLevel("pathfinder",animal?.id)*20;

    if(environment==="water"){
      bonus+=
        skillLevel("diveSense",animal?.id)*30+
        skillLevel("currentSense",animal?.id)*25;
    }

    return Number(baseRange||0)+bonus;
  }

  function petDamageTaken(animal,amount,hpRatio=1){
    let reduction=
      skillLevel("guard",animal?.id)*.05+
      skillLevel("shell",animal?.id)*.03+
      skillLevel("evasion",animal?.id)*.02;

    if(Number(hpRatio||1)<=.35){
      reduction+=
        skillLevel("instinct",animal?.id)*.05;
    }

    return Math.max(
      1,
      Math.round(
        Number(amount||0)*
        Math.max(.55,1-reduction)
      )
    );
  }

  function spendSkillCell(index,petId){
    if(!isTrainer())return false;

    const pet=
      getById(petId)||
      firstEquipped();

    if(!pet)return false;

    const cell=
      pet.skillBoard?.find(
        entry=>entry.index===Number(index)
      );

    if(
      !cell ||
      cell.selected ||
      pet.skillPoints<=0 ||
      !skillBoardAvailable(
        pet.skillBoard,
        cell.index
      )
    ){
      return false;
    }

    const skill=PET_SKILLS[cell.skill];

    if(!skill)return false;

    if(
      skillLevel(cell.skill,pet.id)>=skill.max
    ){
      return false;
    }

    cell.selected=true;

    const selectedCount=
      pet.skillBoard.filter(
        entry=>entry.selected
      ).length;

    pet.skillPoints=
      Math.max(
        0,
        pet.level-selectedCount
      );

    pet.skills[cell.skill]=
      skillLevel(
        cell.skill,
        pet.id
      );

    applyEffects();

    G().persist?.();
    renderHud();

    return true;
  }

  function spendSkill(key,petId){
    const pet=
      getById(petId)||
      firstEquipped();

    if(!pet)return false;

    const cell=
      pet.skillBoard?.find(
        entry=>
          !entry.selected &&
          entry.skill===key &&
          skillBoardAvailable(
            pet.skillBoard,
            entry.index
          )
      );

    return cell
      ? spendSkillCell(
          cell.index,
          pet.id
        )
      : false;
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
    pet.skillBoardVersion=0;
    ensureSkillBoard(pet);

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
      gridW:2,
      gridH:2,
      slots:4,
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

    for(
      const {animal} of equippedAnimals()
    ){
      const type=PET_TYPES[animal.type];

      const environment=
        String(
          g?.world?.environment||""
        ).toLowerCase();

      vision=Math.max(
        vision,
        (type.vision||0)+
        skillLevel("scout",animal.id)*35+
        skillLevel("keenEye",animal.id)*25+
        skillLevel("nightSight",animal.id)*20+
        skillLevel("pathfinder",animal.id)*20+
        (
          environment==="water"
            ? skillLevel("diveSense",animal.id)*30+
              skillLevel("currentSense",animal.id)*25
            : 0
        )
      );

      enemyVision=Math.min(
        enemyVision,
        Math.max(
          .45,
          (type.enemyVision||1)-
          skillLevel("stealth",animal.id)*.04-
          skillLevel("quietStep",animal.id)*.03
        )
      );
    }

    g.player.petVisionBonus=
      isTrainer()
        ? vision
        : 0;

    g.player.petEnemyVisionMultiplier=
      isTrainer()
        ? enemyVision
        : 1;

    g.player.petCarryBonus=0;
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
        ({animal},index)=>{
          const offset=35+index*24;
          let x=
            g.player.x-
            g.player.facingX*offset;
          let y=
            g.player.y-
            g.player.facingY*offset;

          if(
            typeof g.blocked==="function" &&
            g.blocked({x,y,r:11})
          ){
            x=
              g.player.x+
              g.player.facingX*offset;
            y=
              g.player.y+
              g.player.facingY*offset;
          }

          if(
            typeof g.blocked==="function" &&
            g.blocked({x,y,r:11})
          ){
            x=g.player.x;
            y=g.player.y;
          }

          return {
            petId:animal.id,
            x,
            y,
            hp:petMaxHp(animal),
          maxHp:petMaxHp(animal),
          markedTarget:null,
          size:animal.size,
          vx:0,
          vy:0,
          moving:false,
          attackPulse:0,
          hitPulse:0,
          attackDirX:1,
            attackDirY:0
          };
        }
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

    finalizeCapturedWildPet();
    resetStates();
  }

  function onFail(){
    for(
      const {animal} of equippedAnimals()
    ){
      animal.downed=false;
    }

    capturedWildPet=null;
    wildPets=[];
    pendingWildPetId=null;
    closeWildReleaseChoice();

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
        state.maxHp=petMaxHp(
          getById(state.petId)||
          {type:"hound",level:1}
        );
        state.hp=Math.min(
          state.hp,
          state.maxHp
        );
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

    state.vx=0;
    state.vy=0;
    state.moving=false;

    const dx=targetX-state.x;
    const dy=targetY-state.y;
    const d=Math.hypot(dx,dy)||1;

    if(d<=.01)return;

    const step=Math.min(
      d,
      speed*dt
    );

    const oldX=state.x;
    const oldY=state.y;

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
    }else{
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

    const movedDt=Math.max(
      dt,
      .0001
    );

    state.vx=
      (state.x-oldX)/
      movedDt;
    state.vy=
      (state.y-oldY)/
      movedDt;
    state.moving=
      Math.hypot(
        state.vx,
        state.vy
      )>.5;
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

    const pet=
      getById(state.petId);

    const range=
      pet
        ? petTrackingRange(pet,280)
        : 280;

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

      if(d>range)continue;

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

    const equipped=
      equippedAnimals().map(
        item=>item.animal
      );

    const packPet=
      equipped.find(
        animal=>animal.type==="pack" &&
        !animal.downed
      )||null;

    const foragerPet=
      equipped.find(
        animal=>
          !animal.downed &&
          skillLevel("forager",animal.id)>0
      )||null;

    const foragerLevel=
      equipped.reduce(
        (best,animal)=>
          Math.max(
            best,
            skillLevel("forager",animal.id)
          ),
        0
      );

    if(
      !packPet &&
      !foragerPet
    ){
      return false;
    }

    if(
      target.efrPetLootChecked ||
      target.efrPackLootChecked
    ){
      return false;
    }

    target.efrPetLootChecked=true;

    const lootSkillLevel=
      equipped.reduce(
        (total,animal)=>{
          return total+
            skillLevel("forager",animal.id)*.03+
            skillLevel("gatherer",animal.id)*.02+
            skillLevel("salvage",animal.id)*.03+
            skillLevel("haul",animal.id)*.02+
            skillLevel("scavenger",animal.id)*.03+
            skillLevel("aquaticForage",animal.id)*.03+
            skillLevel("lucky",animal.id)*.02;
        },
        0
      );

    const chance=Math.min(
      .45,
      (
        packPet
          ? .10
          : 0
      )+
      lootSkillLevel
    );

    if(
      Math.random()>=chance ||
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

    const rewardPet=
      packPet||foragerPet;

    gainXP(
      4,
      "pet-loot-bonus",
      rewardPet?.id
    );

    G().logMessage?.(
      "ペットの採取支援で"+
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
          petTrackingRange(pet,280),
          state
        );

      if(!target){
        g.logMessage?.(
          "突撃対象がいません"
        );
        return false;
      }

      const attackDistance=
        Math.hypot(
          target.x-state.x,
          target.y-state.y
        )||1;

      state.attackDirX=
        (target.x-state.x)/
        attackDistance;
      state.attackDirY=
        (target.y-state.y)/
        attackDistance;
      state.attackPulse=1;

      target.hp-=
        30+
        pet.level*3+
        skillLevel("combat",pet.id)*5+
        skillLevel("ferocity",pet.id)*4+
        skillLevel("assault",pet.id)*3+
        skillLevel("predator",pet.id)*3;

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

    updateWildPets(dt);
    updateCapturedWildPet(dt);
    updateMarkedEnemies(dt);

    const equipped=
      equippedAnimals();

    if(!equipped.length){
      renderHud();
      return;
    }

    applyEffects();

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

        state.moving=false;
        state.vx=0;
        state.vy=0;
        state.attackPulse=
          Math.max(
            0,
            (state.attackPulse||0)-dt*5
          );
        state.hitPulse=
          Math.max(
            0,
            (state.hitPulse||0)-dt*7
          );

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
          let targetX=
            g.player.x-
            g.player.facingX*32;

          let targetY=
            g.player.y-
            g.player.facingY*32;

          if(
            typeof g.blocked==="function" &&
            g.blocked({
              x:targetX,
              y:targetY,
              r:11
            })
          ){
            targetX=
              g.player.x+
              g.player.facingX*32;
            targetY=
              g.player.y+
              g.player.facingY*32;
          }

          if(
            typeof g.blocked==="function" &&
            g.blocked({
              x:targetX,
              y:targetY,
              r:11
            })
          ){
            targetX=g.player.x;
            targetY=g.player.y;
          }

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
              petMoveSpeed(
                animal,
                95*
                (type.speed||1)
              ),
              state
            );
          }
        }

        if(
          animal.command==="attack"
        ){
          const target=
            nearestEnemy(
              petTrackingRange(animal,280),
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
              petMoveSpeed(
                animal,
                105*
                (type.speed||1)
              ),
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
              petTrackingRange(
                animal,
                animal.command==="attack"
                  ? 300
                  : 190
              ),
              state
            );

          if(target){
            const attackDistance=
              Math.hypot(
                target.x-state.x,
                target.y-state.y
              )||1;

            state.attackDirX=
              (target.x-state.x)/
              attackDistance;
            state.attackDirY=
              (target.y-state.y)/
              attackDistance;
            state.attackPulse=1;

            target.hp-=
              petAttackDamage(
                animal,
                type,
                target
              );

            target.efrPetMarked=true;
            target.efrPetMarkTimer=5;

            attackTimers[index]=
              petAttackInterval(animal);

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
              state.hitPulse=1;

              state.hp-=
                petDamageTaken(
                  animal,
                  (enemy.damage||8)*.45,
                  state.hp/Math.max(1,state.maxHp)
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
              skillLevel("bond",animal.id)*2+
              skillLevel("healPulse",animal.id)*2+
              skillLevel("cleanse",animal.id)
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


  const PET_GRAPHICS={
    hound:{body:"dog",ears:"drop",tail:"curve",mark:"chest"},
    wolf:{body:"dog",ears:"point",tail:"curve",mark:"mask"},
    bear:{body:"bear",ears:"round",tail:"short",mark:"chest"},
    tiger:{body:"cat",ears:"point",tail:"curve",mark:"stripe"},
    leopard:{body:"cat",ears:"round",tail:"curve",mark:"spot"},

    bird:{body:"bird",ears:"none",tail:"fork",mark:"wing"},
    eagle:{body:"bird",ears:"none",tail:"fan",mark:"wing"},
    owl:{body:"owl",ears:"tuft",tail:"short",mark:"eyes"},
    crow:{body:"bird",ears:"none",tail:"fork",mark:"wing"},
    kite:{body:"bird",ears:"none",tail:"fork",mark:"wing"},

    cat:{body:"cat",ears:"point",tail:"curve",mark:"face"},
    fox:{body:"fox",ears:"point",tail:"bush",mark:"chest"},
    weasel:{body:"weasel",ears:"round",tail:"long",mark:"face"},
    lynx:{body:"lynx",ears:"tuft",tail:"short",mark:"spot"},
    snake:{body:"snake",ears:"none",tail:"coil",mark:"stripe"},

    pack:{body:"horse",ears:"long",tail:"short",mark:"pack"},
    horse:{body:"horse",ears:"long",tail:"flow",mark:"face"},
    ox:{body:"ox",ears:"round",tail:"short",mark:"horn"},
    camel:{body:"camel",ears:"round",tail:"short",mark:"hump"},
    alpaca:{body:"alpaca",ears:"long",tail:"short",mark:"fluff"},

    dog:{body:"dog",ears:"drop",tail:"curve",mark:"face"},
    raccoon:{body:"raccoon",ears:"round",tail:"ring",mark:"mask"},
    boar:{body:"boar",ears:"point",tail:"short",mark:"snout"},
    goat:{body:"goat",ears:"point",tail:"short",mark:"horn"},
    monkey:{body:"monkey",ears:"round",tail:"curve",mark:"face"},

    deer:{body:"deer",ears:"long",tail:"short",mark:"antler"},
    rabbit:{body:"rabbit",ears:"long",tail:"round",mark:"face"},
    sheep:{body:"sheep",ears:"round",tail:"short",mark:"wool"},
    capybara:{body:"capybara",ears:"round",tail:"short",mark:"snout"},
    golden:{body:"dog",ears:"drop",tail:"curve",mark:"chest"},

    otter:{body:"otter",ears:"round",tail:"long",mark:"belly"},
    cormorant:{body:"bird",ears:"none",tail:"fan",mark:"wing"},
    penguin:{body:"penguin",ears:"none",tail:"short",mark:"belly"},
    turtle:{body:"turtle",ears:"none",tail:"short",mark:"shell"},
    crocodile:{body:"crocodile",ears:"none",tail:"long",mark:"snout"},

    bat:{body:"bat",ears:"point",tail:"none",mark:"wing"},
    spider:{body:"spider",ears:"none",tail:"none",mark:"legs"},
    squirrel:{body:"squirrel",ears:"point",tail:"bush",mark:"chest"},
    badger:{body:"badger",ears:"round",tail:"short",mark:"face"},
    raccoonDog:{body:"raccoon",ears:"round",tail:"ring",mark:"mask"}
  };

  const PET_GRAPHIC_COLORS={
    hound:"#9b7658",wolf:"#6f747c",bear:"#79563e",tiger:"#d28b32",leopard:"#c49555",
    bird:"#8b6fb0",eagle:"#806548",owl:"#756b86",crow:"#42464f",kite:"#9a7354",
    cat:"#a98bb7",fox:"#c8753e",weasel:"#9b866c",lynx:"#8d765e",snake:"#6f9b68",
    pack:"#927052",horse:"#8b684d",ox:"#6b6255",camel:"#bd9860",alpaca:"#d7c5a3",
    dog:"#a86f4d",raccoon:"#77746d",boar:"#70513d",goat:"#b6a78d",monkey:"#8b6047",
    deer:"#9d7655",rabbit:"#d7c7bd",sheep:"#e2ddd2",capybara:"#8b765d",golden:"#c69b55",
    otter:"#725d50",cormorant:"#4c5964",penguin:"#303941",turtle:"#657f59",
    crocodile:"#557457",bat:"#5b536f",spider:"#554a51",squirrel:"#ad7240",
    badger:"#665e55",raccoonDog:"#81776b"
  };

  function drawPetGraphic(ctx,animal,x,y,r,state){
    const key=String(animal?.type||"hound");
    const g={
      ...(PET_GRAPHICS[key]||PET_GRAPHICS.hound),
      key
    };
    const base=PET_GRAPHIC_COLORS[key]||"#a86f4d";
    const downed=Boolean(animal?.downed);

    if(
      window.EFRPetRenderer&&
      typeof window.EFRPetRenderer.draw==="function"
    ){
      window.EFRPetRenderer.draw(
        ctx,
        animal,
        x,
        y,
        r,
        g,
        base,
        downed,
        state
      );
    }
  }

  function petIconMarkup(animal,options={}){
    const petId=String(
      animal?.id ||
      animal?.petId ||
      ""
    );

    const type=String(
      animal?.type ||
      ""
    );

    const size=Math.max(
      36,
      Math.min(
        64,
        Math.round(
          Number(options.size)||48
        )
      )
    );

    const escAttr=value=>String(value||"")
      .replace(/&/g,"&amp;")
      .replace(/"/g,"&quot;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;");

    return `
      <span
        class="efrPetIcon"
        style="--efr-pet-icon-size:${size}px"
        role="img"
        aria-label="${escAttr(
          animal?.name ||
          PET_TYPES[type]?.name ||
          type ||
          "ペット"
        )}"
      >
        <canvas
          class="efrPetIconCanvas"
          width="${size*2}"
          height="${size*2}"
          data-efr-pet-icon
          data-pet-id="${escAttr(petId)}"
          data-pet-type="${escAttr(type)}"
          data-pet-icon-size="${size}"
        ></canvas>
      </span>
    `;
  }

  function mountPetIcons(root){
    const scope=
      root &&
      typeof root.querySelectorAll==="function"
        ? root
        : document;

    scope
      .querySelectorAll(
        "canvas[data-efr-pet-icon]"
      )
      .forEach(canvas=>{
        const petId=
          String(
            canvas.dataset.petId||""
          );

        const animal=
          petId
            ? getAnimalById(petId)
            : null;

        if(!animal){
          return;
        }

        const ctx=
          canvas.getContext("2d");

        if(!ctx){
          return;
        }

        const cssSize=Math.max(
          36,
          Number(
            canvas.dataset.petIconSize
          )||48
        );

        const ratio=
          canvas.width/cssSize;

        ctx.setTransform(
          1,0,0,1,0,0
        );

        ctx.clearRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        ctx.setTransform(
          ratio,
          0,
          0,
          ratio,
          0,
          0
        );

        const individualSize=Math.max(
          .75,
          Math.min(
            1.30,
            Number(animal.size)||1
          )
        );

        const state={
          moving:false,
          attackPulse:0,
          hitPulse:0,
          attackDirX:1,
          attackDirY:0,
          vx:0,
          vy:0
        };

        drawPetGraphic(
          ctx,
          animal,
          cssSize/2,
          cssSize/2,
          cssSize*.30*individualSize,
          state
        );

        ctx.setTransform(
          1,0,0,1,0,0
        );
      });
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

    if(
      !equipped.length &&
      !wildPets.length &&
      !capturedWildPet
    ){
      return;
    }

    const ctx=g.ctx;

    ctx.save();

    for(const pet of wildPets){
      drawWildPetEntity(
        ctx,
        pet,
        g
      );
    }

    if(capturedWildPet){
      drawCapturedWildPetEntity(
        ctx,
        capturedWildPet
      );
    }

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

        const petRadius=
          14*(Number(animal.size)||1);

        drawPetGraphic(
          ctx,
          animal,
          state.x,
          state.y,
          petRadius,
          state
        );

        ctx.fillStyle="#fff";
        ctx.font="bold 9px sans-serif";
        ctx.textAlign="center";

        ctx.fillText(
          animal.name,
          state.x,
          state.y-petRadius-5
        );

        ctx.fillText(
          COMMANDS[animal.command].name,
          state.x,
          state.y+petRadius+16
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
        pet.level>=MAX_PET_LEVEL
          ? 0
          : xpNext(pet.level),
      maxLevel:MAX_PET_LEVEL,
      maxHp:petMaxHp(pet),
      size:pet.size,
      group:PET_TYPES[pet.type]?.group,
      skillBoard:pet.skillBoard,
      skillPools:PET_SKILL_POOLS,
      commands:COMMANDS,
      ability:
        PET_TYPES[pet.type]?.ability
    };
  }

  function getAnimals(){
    return ensure();
  }

  function getAnimalById(id){
    const animals=ensure();
    return animals.find(
      animal=>animal?.id===String(id||"")
    ) || null;
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
    PET_SKILL_GROUPS,
    PET_SKILL_GROUP_BY_KEY,
    PET_SECONDARY_GROUPS,
    PET_SKILL_POOLS,
    COMMANDS,
    MAX_ANIMALS,
    MAX_PET_LEVEL,
    WILD_PET_CHANCE,
    WILD_PET_ENVIRONMENT_POOLS,
    ensure,
    prepareWildEncounter,
    resetWildEncounter,
    getNearestWildPet,
    inspectWildPet,
    captureWildPet,
    releaseAnimal,
    getState,
    getAnimals,
    getAnimalById,
    petIconMarkup,
    mountPetIcons,
    equippedAnimals,
    gainXP,
    skillLevel,
    spendSkill,
    spendSkillCell,
    skillBoardAvailable,
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
