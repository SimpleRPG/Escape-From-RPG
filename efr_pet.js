(function(){
  "use strict";

  const G=()=>window.EFRGame;
  const MAX_ANIMALS=20;

  const MAX_PET_LEVEL=5;
  const PET_BOARD_SIZE=9;
  const PET_SKILL_BOARD_VERSION=4;

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
    pack:{name:"ロバ",group:"運搬",desc:"探索・素材回収支援",damage:-2,speed:.9,vision:35,enemyVision:1,ability:"scent",baseHp:140},
    horse:{name:"馬",group:"運搬",desc:"高速移動・回収支援",damage:3,speed:1.35,vision:30,enemyVision:1,ability:"scent",baseHp:170},
    ox:{name:"牛",group:"運搬",desc:"高耐久・回収支援",damage:5,speed:.72,vision:20,enemyVision:1,ability:"scent",baseHp:210},
    camel:{name:"ラクダ",group:"運搬",desc:"長距離探索・回収支援",damage:2,speed:.92,vision:35,enemyVision:1,ability:"scent",baseHp:180},
    alpaca:{name:"アルパカ",group:"運搬",desc:"回収・探索支援",damage:0,speed:.88,vision:30,enemyVision:1,ability:"scent",baseHp:150},

    // 探索系
    dog:{name:"雑種犬",group:"探索",desc:"探索・発見・追跡",damage:4,speed:1.08,vision:50,enemyVision:1,ability:"inspect",baseHp:105},
    raccoon:{name:"狸",group:"探索",desc:"探索・発見・回収",damage:2,speed:.98,vision:55,enemyVision:.9,ability:"inspect",baseHp:110},
    boar:{name:"猪",group:"探索",desc:"突破・探索・素材回収",damage:8,speed:1.0,vision:25,enemyVision:1,ability:"inspect",baseHp:155},
    goat:{name:"山羊",group:"探索",desc:"悪路探索・素材発見",damage:3,speed:1.05,vision:45,enemyVision:1,ability:"inspect",baseHp:125},
    monkey:{name:"猿",group:"探索",desc:"探索・回収・発見",damage:3,speed:1.18,vision:70,enemyVision:.9,ability:"inspect",baseHp:85},

    // 支援系
    deer:{name:"鹿",group:"支援",desc:"回復・索敵・支援",damage:2,speed:1.1,vision:55,enemyVision:.9,ability:"support",baseHp:130},
    rabbit:{name:"兎",group:"支援",desc:"回避・回復・索敵",damage:0,speed:1.28,vision:45,enemyVision:.72,ability:"support",baseHp:60},
    sheep:{name:"羊",group:"支援",desc:"回復・携行支援",damage:0,speed:.86,vision:25,enemyVision:1,ability:"support",baseHp:125},
    capybara:{name:"カピバラ",group:"支援",desc:"回復・安定支援",damage:1,speed:.82,vision:35,enemyVision:.95,ability:"support",baseHp:160},
    golden:{name:"ゴールデンレトリバー",group:"支援",desc:"回復・追跡・支援",damage:4,speed:1.04,vision:45,enemyVision:.95,ability:"support",baseHp:135},

    // 妨害系
    otter:{name:"カワウソ",group:"妨害",desc:"妨害・撹乱・接近",damage:3,speed:1.12,vision:50,enemyVision:.9,ability:"debuff",baseHp:95},
    cormorant:{name:"鵜",group:"妨害",desc:"妨害・索敵・弱体化",damage:1,speed:1.05,vision:90,enemyVision:1,ability:"debuff",baseHp:85},
    penguin:{name:"ペンギン",group:"妨害",desc:"妨害・支援・足止め",damage:1,speed:.8,vision:45,enemyVision:.95,ability:"debuff",baseHp:110},
    turtle:{name:"亀",group:"妨害",desc:"妨害・耐久・足止め",damage:2,speed:.55,vision:35,enemyVision:.9,ability:"debuff",baseHp:190},
    crocodile:{name:"ワニ",group:"妨害",desc:"妨害・奇襲・弱体化",damage:13,speed:.82,vision:45,enemyVision:.85,ability:"debuff",baseHp:200},

    // 特殊系
    bat:{name:"コウモリ",group:"特殊",desc:"索敵・暗所探索・回避",damage:1,speed:1.3,vision:95,enemyVision:.8,ability:"survival",baseHp:65},
    spider:{name:"蜘蛛",group:"特殊",desc:"隠密・奇襲・妨害",damage:5,speed:1.08,vision:20,enemyVision:.6,ability:"survival",baseHp:55},
    squirrel:{name:"リス",group:"特殊",desc:"素材発見・回収・探索",damage:0,speed:1.3,vision:60,enemyVision:.75,ability:"survival",baseHp:50},
    badger:{name:"アナグマ",group:"特殊",desc:"探索・突破・高耐久",damage:7,speed:.9,vision:30,enemyVision:.85,ability:"survival",baseHp:145},
    raccoonDog:{name:"ハクビシン",group:"特殊",desc:"隠密・探索・回収",damage:2,speed:1.05,vision:55,enemyVision:.7,ability:"survival",baseHp:95}
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

    const spawnRadius=18;

    function valid(x,y,minPlayerDistance){
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

    function randomSafePoint(minPlayerDistance){
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

        if(valid(x,y,minPlayerDistance)){
          return {x,y};
        }
      }

      return null;
    }

    /*
     * 通常はプレイヤーから十分離れた安全地面を優先する。
     * 120pxで見つからない場合も出現自体を中止せず、
     * 安全地面を確保できるまで距離条件だけを段階的に緩和する。
     * 壁・建物等の衝突条件は最後まで維持する。
     */
    for(const minPlayerDistance of [120,80,40,0]){
      const randomPoint=
        randomSafePoint(minPlayerDistance);

      if(randomPoint){
        return randomPoint;
      }

      /*
       * ランダム探索で見つからない場合はマップ全体を
       * 決定的に走査して安全地面を探す。
       */
      for(
        const step of [24,12,6]
      ){
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
            if(valid(x,y,minPlayerDistance)){
              return {x,y};
            }
          }
        }
      }
    }

    /*
     * 通常のgenerateWorld()ではここへ到達する前に
     * 安全地面が見つかることを前提とする。
     * それでも見つからない場合は壁内生成を行わず、
     * findWildPetSpawn()側の失敗を明示する。
     */
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
     * ランダム探索だけで失敗した場合は findWildPetSpawn()
     * 内部の決定的全走査まで完了している。
     * それでも安全地点が存在しない場合だけ、壁内生成を
     * 行わず、この遭遇生成を安全に終了する。
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

    haulMaster:{name:"荷運び上手",desc:"重量上限 +2kg / Lv",max:3},
    loadBoost:{name:"積載強化",desc:"バッグ容量 +1マス / Lv",max:3},
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

    disruptionDuration:{name:"妨害持続",desc:"衰弱の咆哮の効果時間 +0.5秒 / Lv",max:3},
    slow:{name:"足止め",desc:"衰弱の咆哮の移動速度低下 +5% / Lv",max:3},
    disruptionRange:{name:"妨害範囲",desc:"衰弱の咆哮の範囲 +25 / Lv",max:3},
    weakness:{name:"弱体化",desc:"衰弱の咆哮の攻撃力低下 +4% / Lv",max:3},
    armorBreak:{name:"防御崩し",desc:"衰弱の咆哮の防御力低下 +2% / Lv",max:3},

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
      "haulMaster","loadBoost","salvage","haul","stamina"
    ],
    "探索":[
      "forager","gatherer","finder","scavenger","pathfinder"
    ],
    "支援":[
      "bond","healPulse","morale","cleanse","shareXP"
    ],
    "妨害":[
      "disruptionDuration",
      "slow",
      "disruptionRange",
      "weakness",
      "armorBreak"
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
    camel:"妨害",
    alpaca:"支援",

    dog:"支援",
    raccoon:"隠密",
    boar:"戦闘",
    goat:"運搬",
    monkey:"偵察",

    deer:"偵察",
    rabbit:"隠密",
    sheep:"運搬",
    capybara:"妨害",
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

  const PET_SKILL_KEY_MIGRATIONS={
    waterAdapt:"disruptionDuration",
    swimmer:"slow",
    diveSense:"disruptionRange",
    aquaticForage:"weakness",
    currentSense:"armorBreak"
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
          (cell,index)=>{
            const migratedSkill=
              PET_SKILL_KEY_MIGRATIONS[cell?.skill]||
              cell?.skill;

            return {
              index,
              skill:
                pool.includes(migratedSkill)
                  ? migratedSkill
                  : pool[
                      Math.floor(
                        Math.random()*pool.length
                      )
                    ],
              selected:!!cell?.selected
            };
          }
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
      (
        target?.alerted===false
          ? skillLevel("ambush",animal?.id)*2
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
      skillLevel("pathfinder",animal?.id)*20;

    return Number(baseRange||0)+bonus;
  }

  function interactionRangeBonus(){
    const bonus=
      equippedAnimals().reduce(
        (total,{animal})=>
          total+
          skillLevel("finder",animal.id)*8,
        0
      );

    return isTrainer() ? bonus : 0;
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
    G().refreshBackpackCapacity?.();

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

    g.player.petCarryBonus=
      equippedAnimals().reduce(
        (total,{animal})=>
          total+
          skillLevel("loadBoost",animal.id),
        0
      );

    g.player.petWeightBonus=
      equippedAnimals().reduce(
        (total,{animal})=>
          total+
          skillLevel("haulMaster",animal.id)*2,
        0
      );

    g.player.petDamageBonus=0;
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

    g.player.petStealthTimer=0;
    g.player.petScentTimer=0;
    g.player.petFastInspectTimer=0;
    g.player.petSurvivalTimer=0;
    g.player.petSurvivalGuardUsed=false;

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
      enemy.efrPetMarkTimer=10;
      count++;
    }

    for(
      const container of g.containers||[]
    ){
      const d=
        Math.hypot(
          container.x-state.x,
          container.y-state.y
        );

      if(d>range)continue;

      container.efrPetMarked=true;
      container.efrPetMarkTimer=10;
      count++;
    }

    for(
      const item of g.items||[]
    ){
      if(item.taken)continue;

      const d=
        Math.hypot(
          item.x-state.x,
          item.y-state.y
        );

      if(d>range)continue;

      item.efrPetMarked=true;
      item.efrPetMarkTimer=10;
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
    const ability=type?.ability;

    if(ability==="rush"){
      const facingX=
        Number(g.player.facingX)||1;
      const facingY=
        Number(g.player.facingY)||0;

      const length=
        Math.hypot(
          facingX,
          facingY
        )||1;

      const dirX=facingX/length;
      const dirY=facingY/length;

      state.attackDirX=dirX;
      state.attackDirY=dirY;
      state.attackPulse=1;

      let hit=null;

      /*
       * 既存のmovePetToward()/blocked()を使用して
       * 10px単位で最大120pxを突進する。
       * 敵へ接触した時点でその敵を最初の接触対象として確定する。
       */
      for(let step=0;step<12;step++){
        movePetToward(
          state.x+dirX*10,
          state.y+dirY*10,
          1/24,
          240,
          state
        );

        for(
          const enemy of g.enemies||[]
        ){
          if(enemy.dead)continue;

          if(
            Math.hypot(
              enemy.x-state.x,
              enemy.y-state.y
            )<30
          ){
            hit=enemy;
            break;
          }
        }

        if(hit)break;
      }

      if(hit){
        hit.hp-=
          30+
          pet.level*3+
          skillLevel("combat",pet.id)*5+
          skillLevel("ferocity",pet.id)*4+
          skillLevel("assault",pet.id)*3+
          skillLevel("predator",pet.id)*3;

        hit.efrPetMarked=true;
        hit.efrPetMarkTimer=10;

        const knockbackDistance=36;
        const nx=
          hit.x+
          dirX*knockbackDistance;
        const ny=
          hit.y+
          dirY*knockbackDistance;

        if(
          typeof g.blocked!=="function" ||
          !g.blocked({
            x:nx,
            y:ny,
            r:Number(hit.r)||12
          })
        ){
          hit.x=nx;
          hit.y=ny;
        }

        if(hit.hp<=0){
          /*
           * 通常攻撃と同じ敵死亡runtimeへ接続する。
           * 死体のLootはgame.js::collectCorpse()側で
           * 既存generateContainerLoot()から生成する。
           */
          hit.dead=true;

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
      }

      abilityTimers[index]=12;
      pet.stats.abilities++;

      g.logMessage?.(
        pet.name+
        "が前方へ猛突進しました"
      );

    }else if(ability==="mark"){
      const count=
        markNearby(state);

      if(!count){
        g.logMessage?.(
          "周囲にマーキング対象がいません"
        );
        return false;
      }

      abilityTimers[index]=20;
      pet.stats.abilities++;

      gainXP(
        5,
        "scout",
        pet.id
      );

      g.logMessage?.(
        pet.name+
        "が周囲を広域マーキングしました"
      );

    }else if(ability==="stealth"){
      g.player.petStealthTimer=8;

      abilityTimers[index]=18;
      pet.stats.abilities++;

      g.logMessage?.(
        pet.name+
        "と完全に身を潜めました"
      );

    }else if(ability==="scent"){
      const range=
        petTrackingRange(
          pet,
          280
        );

      let count=0;

      for(
        const container of g.containers||[]
      ){
        const d=
          Math.hypot(
            container.x-state.x,
            container.y-state.y
          );

        if(d>range)continue;

        container.efrPetScentTimer=8;
        count++;
      }

      if(!count){
        g.logMessage?.(
          "近くに探せるコンテナがありません"
        );
        return false;
      }

      g.player.petScentTimer=8;

      abilityTimers[index]=25;
      pet.stats.abilities++;

      g.logMessage?.(
        pet.name+
        "が近くのコンテナを探しました"
      );

    }else if(ability==="inspect"){
      g.player.petFastInspectTimer=8;

      abilityTimers[index]=18;
      pet.stats.abilities++;

      g.logMessage?.(
        pet.name+
        "が調査を手伝い、調査速度が上がりました"
      );

    }else if(ability==="support"){
      const maxHp=
        Number(
          g.player.maxHp||100
        );

      const heal=
        Math.max(
          1,
          Math.round(maxHp*.20)
        );

      const before=
        Number(
          g.player.hp||0
        );

      if(
        before>=maxHp
      ){
        g.logMessage?.(
          "プレイヤーのHPは満タンです"
        );
        return false;
      }

      movePetToward(
        g.player.x,
        g.player.y,
        .35,
        220,
        state
      );

      g.player.hp=
        Math.min(
          maxHp,
          before+heal
        );

      abilityTimers[index]=22;
      pet.stats.abilities++;

      gainXP(
        5,
        "support",
        pet.id
      );

      g.logMessage?.(
        pet.name+
        "が応急支援しました"
      );

    }else if(ability==="debuff"){
      const range=
        180+
        skillLevel("disruptionRange",pet.id)*25;

      const duration=
        8+
        skillLevel("disruptionDuration",pet.id)*.5;

      const speedReduction=
        Math.min(
          .45,
          .25+
          skillLevel("slow",pet.id)*.05
        );

      const attackReduction=
        Math.min(
          .35,
          .15+
          skillLevel("weakness",pet.id)*.04
        );

      const defenseReduction=
        Math.min(
          .15,
          .05+
          skillLevel("armorBreak",pet.id)*.02
        );

      let count=0;

      for(const enemy of g.enemies||[]){
        if(enemy.dead)continue;

        const distance=
          Math.hypot(
            enemy.x-state.x,
            enemy.y-state.y
          );

        if(distance>range)continue;

        enemy.efrPetDebuffTimer=
          Math.max(
            Number(enemy.efrPetDebuffTimer)||0,
            duration
          );

        enemy.efrPetDebuffSpeedMultiplier=
          Math.min(
            Number(enemy.efrPetDebuffSpeedMultiplier)||1,
            1-speedReduction
          );

        enemy.efrPetDebuffAttackMultiplier=
          Math.min(
            Number(enemy.efrPetDebuffAttackMultiplier)||1,
            1-attackReduction
          );

        enemy.efrPetDebuffDefenseIncrease=
          Math.max(
            Number(enemy.efrPetDebuffDefenseIncrease)||0,
            defenseReduction
          );

        count++;
      }

      if(!count){
        g.logMessage?.(
          "周囲に妨害できる敵がいません"
        );
        return false;
      }

      abilityTimers[index]=20;
      pet.stats.abilities++;

      gainXP(
        5,
        "debuff",
        pet.id
      );

      g.logMessage?.(
        pet.name+
        "が衰弱の咆哮を放ちました"
      );

    }else if(ability==="survival"){
      g.player.petSurvivalTimer=8;
      g.player.petSurvivalGuardUsed=false;

      abilityTimers[index]=30;
      pet.stats.abilities++;

      g.logMessage?.(
        pet.name+
        "が生存本能を発動しました"
      );
    }

    g.persist?.();

    return true;
  }

  function updatePetDebuffs(dt){
    const g=G();

    for(const enemy of g?.enemies||[]){
      const timer=
        Math.max(
          0,
          (Number(enemy.efrPetDebuffTimer)||0)-dt
        );

      enemy.efrPetDebuffTimer=timer;

      if(timer<=0){
        enemy.efrPetDebuffSpeedMultiplier=1;
        enemy.efrPetDebuffAttackMultiplier=1;
        enemy.efrPetDebuffDefenseIncrease=0;
      }
    }
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

    for(
      const target of [
        ...(g?.containers||[]),
        ...(g?.items||[])
      ]
    ){
      if(target.efrPetMarked){
        target.efrPetMarkTimer=
          Math.max(
            0,
            (target.efrPetMarkTimer||0)-dt
          );

        if(
          target.efrPetMarkTimer<=0
        ){
          target.efrPetMarked=false;
        }
      }

      if(target.efrPetScentTimer){
        target.efrPetScentTimer=
          Math.max(
            0,
            target.efrPetScentTimer-dt
          );

        if(
          target.efrPetScentTimer<=0
        ){
          target.efrPetScentTimer=0;
        }
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
    updatePetDebuffs(dt);
    updateMarkedEnemies(dt);

    g.player.petStealthTimer=
      Math.max(
        0,
        (g.player.petStealthTimer||0)-dt
      );

    g.player.petScentTimer=
      Math.max(
        0,
        (g.player.petScentTimer||0)-dt
      );

    g.player.petFastInspectTimer=
      Math.max(
        0,
        (g.player.petFastInspectTimer||0)-dt
      );

    g.player.petSurvivalTimer=
      Math.max(
        0,
        (g.player.petSurvivalTimer||0)-dt
      );

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
  /*
   * svg = 種族のbaseグラフィック原本。
   * directions = runtimeで使用する4方向16×16 SVG。
   * body/ears/tail/markはruntime互換metadata。
   */

    hound:{svg:"assets/pets/svg/hound.svg",directions:{right:"assets/pets/svg/hound_right.svg",down:"assets/pets/svg/hound_down.svg",up:"assets/pets/svg/hound_up.svg",left:"assets/pets/svg/hound_left.svg"},body:"dog",ears:"drop",tail:"curve",mark:"chest"},
    wolf:{svg:"assets/pets/svg/wolf.svg",directions:{right:"assets/pets/svg/wolf_right.svg",down:"assets/pets/svg/wolf_down.svg",up:"assets/pets/svg/wolf_up.svg",left:"assets/pets/svg/wolf_left.svg"},body:"dog",ears:"point",tail:"curve",mark:"mask"},
    bear:{svg:"assets/pets/svg/bear.svg",directions:{right:"assets/pets/svg/bear_right.svg",down:"assets/pets/svg/bear_down.svg",up:"assets/pets/svg/bear_up.svg",left:"assets/pets/svg/bear_left.svg"},body:"bear",ears:"round",tail:"short",mark:"chest"},
    tiger:{svg:"assets/pets/svg/tiger.svg",directions:{right:"assets/pets/svg/tiger_right.svg",down:"assets/pets/svg/tiger_down.svg",up:"assets/pets/svg/tiger_up.svg",left:"assets/pets/svg/tiger_left.svg"},body:"cat",ears:"point",tail:"curve",mark:"stripe"},
    leopard:{svg:"assets/pets/svg/leopard.svg",directions:{right:"assets/pets/svg/leopard_right.svg",down:"assets/pets/svg/leopard_down.svg",up:"assets/pets/svg/leopard_up.svg",left:"assets/pets/svg/leopard_left.svg"},body:"cat",ears:"round",tail:"curve",mark:"spot"},
    bird:{svg:"assets/pets/svg/bird.svg",directions:{right:"assets/pets/svg/bird_right.svg",down:"assets/pets/svg/bird_down.svg",up:"assets/pets/svg/bird_up.svg",left:"assets/pets/svg/bird_left.svg"},body:"bird",ears:"none",tail:"fork",mark:"wing"},
    eagle:{svg:"assets/pets/svg/eagle.svg",directions:{right:"assets/pets/svg/eagle_right.svg",down:"assets/pets/svg/eagle_down.svg",up:"assets/pets/svg/eagle_up.svg",left:"assets/pets/svg/eagle_left.svg"},body:"bird",ears:"none",tail:"fan",mark:"wing"},
    owl:{svg:"assets/pets/svg/owl.svg",directions:{right:"assets/pets/svg/owl_right.svg",down:"assets/pets/svg/owl_down.svg",up:"assets/pets/svg/owl_up.svg",left:"assets/pets/svg/owl_left.svg"},body:"owl",ears:"tuft",tail:"short",mark:"eyes"},
    crow:{svg:"assets/pets/svg/crow.svg",directions:{right:"assets/pets/svg/crow_right.svg",down:"assets/pets/svg/crow_down.svg",up:"assets/pets/svg/crow_up.svg",left:"assets/pets/svg/crow_left.svg"},body:"bird",ears:"none",tail:"fork",mark:"wing"},
    kite:{svg:"assets/pets/svg/kite.svg",directions:{right:"assets/pets/svg/kite_right.svg",down:"assets/pets/svg/kite_down.svg",up:"assets/pets/svg/kite_up.svg",left:"assets/pets/svg/kite_left.svg"},body:"bird",ears:"none",tail:"fork",mark:"wing"},
    cat:{svg:"assets/pets/svg/cat.svg",directions:{right:"assets/pets/svg/cat_right.svg",down:"assets/pets/svg/cat_down.svg",up:"assets/pets/svg/cat_up.svg",left:"assets/pets/svg/cat_left.svg"},body:"cat",ears:"point",tail:"curve",mark:"face"},
    fox:{svg:"assets/pets/svg/fox.svg",directions:{right:"assets/pets/svg/fox_right.svg",down:"assets/pets/svg/fox_down.svg",up:"assets/pets/svg/fox_up.svg",left:"assets/pets/svg/fox_left.svg"},body:"fox",ears:"point",tail:"bush",mark:"chest"},
    weasel:{svg:"assets/pets/svg/weasel.svg",directions:{right:"assets/pets/svg/weasel_right.svg",down:"assets/pets/svg/weasel_down.svg",up:"assets/pets/svg/weasel_up.svg",left:"assets/pets/svg/weasel_left.svg"},body:"weasel",ears:"round",tail:"long",mark:"face"},
    lynx:{svg:"assets/pets/svg/lynx.svg",directions:{right:"assets/pets/svg/lynx_right.svg",down:"assets/pets/svg/lynx_down.svg",up:"assets/pets/svg/lynx_up.svg",left:"assets/pets/svg/lynx_left.svg"},body:"lynx",ears:"tuft",tail:"short",mark:"spot"},
    snake:{svg:"assets/pets/svg/snake.svg",directions:{right:"assets/pets/svg/snake_right.svg",down:"assets/pets/svg/snake_down.svg",up:"assets/pets/svg/snake_up.svg",left:"assets/pets/svg/snake_left.svg"},body:"snake",ears:"none",tail:"coil",mark:"stripe"},
    pack:{svg:"assets/pets/svg/pack.svg",directions:{right:"assets/pets/svg/pack_right.svg",down:"assets/pets/svg/pack_down.svg",up:"assets/pets/svg/pack_up.svg",left:"assets/pets/svg/pack_left.svg"},body:"horse",ears:"long",tail:"short",mark:"pack"},
    horse:{svg:"assets/pets/svg/horse.svg",directions:{right:"assets/pets/svg/horse_right.svg",down:"assets/pets/svg/horse_down.svg",up:"assets/pets/svg/horse_up.svg",left:"assets/pets/svg/horse_left.svg"},body:"horse",ears:"long",tail:"flow",mark:"face"},
    ox:{svg:"assets/pets/svg/ox.svg",directions:{right:"assets/pets/svg/ox_right.svg",down:"assets/pets/svg/ox_down.svg",up:"assets/pets/svg/ox_up.svg",left:"assets/pets/svg/ox_left.svg"},body:"ox",ears:"round",tail:"short",mark:"horn"},
    camel:{svg:"assets/pets/svg/camel.svg",directions:{right:"assets/pets/svg/camel_right.svg",down:"assets/pets/svg/camel_down.svg",up:"assets/pets/svg/camel_up.svg",left:"assets/pets/svg/camel_left.svg"},body:"camel",ears:"round",tail:"short",mark:"hump"},
    alpaca:{svg:"assets/pets/svg/alpaca.svg",directions:{right:"assets/pets/svg/alpaca_right.svg",down:"assets/pets/svg/alpaca_down.svg",up:"assets/pets/svg/alpaca_up.svg",left:"assets/pets/svg/alpaca_left.svg"},body:"alpaca",ears:"long",tail:"short",mark:"fluff"},
    dog:{svg:"assets/pets/svg/dog.svg",directions:{right:"assets/pets/svg/dog_right.svg",down:"assets/pets/svg/dog_down.svg",up:"assets/pets/svg/dog_up.svg",left:"assets/pets/svg/dog_left.svg"},body:"dog",ears:"drop",tail:"curve",mark:"face"},
    raccoon:{svg:"assets/pets/svg/raccoon.svg",directions:{right:"assets/pets/svg/raccoon_right.svg",down:"assets/pets/svg/raccoon_down.svg",up:"assets/pets/svg/raccoon_up.svg",left:"assets/pets/svg/raccoon_left.svg"},body:"raccoon",ears:"round",tail:"ring",mark:"mask"},
    boar:{svg:"assets/pets/svg/boar.svg",directions:{right:"assets/pets/svg/boar_right.svg",down:"assets/pets/svg/boar_down.svg",up:"assets/pets/svg/boar_up.svg",left:"assets/pets/svg/boar_left.svg"},body:"boar",ears:"point",tail:"short",mark:"snout"},
    goat:{svg:"assets/pets/svg/goat.svg",directions:{right:"assets/pets/svg/goat_right.svg",down:"assets/pets/svg/goat_down.svg",up:"assets/pets/svg/goat_up.svg",left:"assets/pets/svg/goat_left.svg"},body:"goat",ears:"point",tail:"short",mark:"horn"},
    monkey:{svg:"assets/pets/svg/monkey.svg",directions:{right:"assets/pets/svg/monkey_right.svg",down:"assets/pets/svg/monkey_down.svg",up:"assets/pets/svg/monkey_up.svg",left:"assets/pets/svg/monkey_left.svg"},body:"monkey",ears:"round",tail:"curve",mark:"face"},
    deer:{svg:"assets/pets/svg/deer.svg",directions:{right:"assets/pets/svg/deer_right.svg",down:"assets/pets/svg/deer_down.svg",up:"assets/pets/svg/deer_up.svg",left:"assets/pets/svg/deer_left.svg"},body:"deer",ears:"long",tail:"short",mark:"antler"},
    rabbit:{svg:"assets/pets/svg/rabbit.svg",directions:{right:"assets/pets/svg/rabbit_right.svg",down:"assets/pets/svg/rabbit_down.svg",up:"assets/pets/svg/rabbit_up.svg",left:"assets/pets/svg/rabbit_left.svg"},body:"rabbit",ears:"long",tail:"round",mark:"face"},
    sheep:{svg:"assets/pets/svg/sheep.svg",directions:{right:"assets/pets/svg/sheep_right.svg",down:"assets/pets/svg/sheep_down.svg",up:"assets/pets/svg/sheep_up.svg",left:"assets/pets/svg/sheep_left.svg"},body:"sheep",ears:"round",tail:"short",mark:"wool"},
    capybara:{svg:"assets/pets/svg/capybara.svg",directions:{right:"assets/pets/svg/capybara_right.svg",down:"assets/pets/svg/capybara_down.svg",up:"assets/pets/svg/capybara_up.svg",left:"assets/pets/svg/capybara_left.svg"},body:"capybara",ears:"round",tail:"short",mark:"snout"},
    golden:{svg:"assets/pets/svg/golden.svg",directions:{right:"assets/pets/svg/golden_right.svg",down:"assets/pets/svg/golden_down.svg",up:"assets/pets/svg/golden_up.svg",left:"assets/pets/svg/golden_left.svg"},body:"dog",ears:"drop",tail:"curve",mark:"chest"},
    otter:{svg:"assets/pets/svg/otter.svg",directions:{right:"assets/pets/svg/otter_right.svg",down:"assets/pets/svg/otter_down.svg",up:"assets/pets/svg/otter_up.svg",left:"assets/pets/svg/otter_left.svg"},body:"otter",ears:"round",tail:"long",mark:"belly"},
    cormorant:{svg:"assets/pets/svg/cormorant.svg",directions:{right:"assets/pets/svg/cormorant_right.svg",down:"assets/pets/svg/cormorant_down.svg",up:"assets/pets/svg/cormorant_up.svg",left:"assets/pets/svg/cormorant_left.svg"},body:"bird",ears:"none",tail:"fan",mark:"wing"},
    penguin:{svg:"assets/pets/svg/penguin.svg",directions:{right:"assets/pets/svg/penguin_right.svg",down:"assets/pets/svg/penguin_down.svg",up:"assets/pets/svg/penguin_up.svg",left:"assets/pets/svg/penguin_left.svg"},body:"penguin",ears:"none",tail:"short",mark:"belly"},
    turtle:{svg:"assets/pets/svg/turtle.svg",directions:{right:"assets/pets/svg/turtle_right.svg",down:"assets/pets/svg/turtle_down.svg",up:"assets/pets/svg/turtle_up.svg",left:"assets/pets/svg/turtle_left.svg"},body:"turtle",ears:"none",tail:"short",mark:"shell"},
    crocodile:{svg:"assets/pets/svg/crocodile.svg",directions:{right:"assets/pets/svg/crocodile_right.svg",down:"assets/pets/svg/crocodile_down.svg",up:"assets/pets/svg/crocodile_up.svg",left:"assets/pets/svg/crocodile_left.svg"},body:"crocodile",ears:"none",tail:"long",mark:"snout"},
    bat:{svg:"assets/pets/svg/bat.svg",directions:{right:"assets/pets/svg/bat_right.svg",down:"assets/pets/svg/bat_down.svg",up:"assets/pets/svg/bat_up.svg",left:"assets/pets/svg/bat_left.svg"},body:"bat",ears:"point",tail:"none",mark:"wing"},
    spider:{svg:"assets/pets/svg/spider.svg",directions:{right:"assets/pets/svg/spider_right.svg",down:"assets/pets/svg/spider_down.svg",up:"assets/pets/svg/spider_up.svg",left:"assets/pets/svg/spider_left.svg"},body:"spider",ears:"none",tail:"none",mark:"legs"},
    squirrel:{svg:"assets/pets/svg/squirrel.svg",directions:{right:"assets/pets/svg/squirrel_right.svg",down:"assets/pets/svg/squirrel_down.svg",up:"assets/pets/svg/squirrel_up.svg",left:"assets/pets/svg/squirrel_left.svg"},body:"squirrel",ears:"point",tail:"bush",mark:"chest"},
    badger:{svg:"assets/pets/svg/badger.svg",directions:{right:"assets/pets/svg/badger_right.svg",down:"assets/pets/svg/badger_down.svg",up:"assets/pets/svg/badger_up.svg",left:"assets/pets/svg/badger_left.svg"},body:"badger",ears:"round",tail:"short",mark:"face"},
    raccoonDog:{svg:"assets/pets/svg/raccoonDog.svg",directions:{right:"assets/pets/svg/raccoonDog_right.svg",down:"assets/pets/svg/raccoonDog_down.svg",up:"assets/pets/svg/raccoonDog_up.svg",left:"assets/pets/svg/raccoonDog_left.svg"},body:"raccoon",ears:"round",tail:"ring",mark:"mask"},
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
    interactionRangeBonus,
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
