(function(){
  "use strict";

  const G=()=>window.EFRGame;

  const PET_TYPES={
    hound:{
      name:"猟犬",
      desc:"戦闘・追跡・突撃",
      damage:6,
      speed:1.15,
      vision:0,
      enemyVision:1,
      ability:"rush"
    },
    bird:{
      name:"偵察鳥",
      desc:"索敵・マーキング・偵察",
      damage:-2,
      speed:1.25,
      vision:100,
      enemyVision:1,
      ability:"mark"
    },
    cat:{
      name:"猫",
      desc:"隠密・接近・回避",
      damage:2,
      speed:1.1,
      vision:25,
      enemyVision:.75,
      ability:"stealth"
    },
    pack:{
      name:"荷運び獣",
      desc:"探索・携行・素材回収支援",
      damage:-2,
      speed:.9,
      vision:35,
      enemyVision:1,
      carry:2,
      ability:"search"
    }
  };

  const PET_SKILLS={
    combat:{
      name:"戦闘訓練",
      desc:"ペット攻撃力 +5 / Lv",
      max:3
    },
    scout:{
      name:"偵察訓練",
      desc:"プレイヤー視界 +50 / Lv",
      max:3
    },
    bond:{
      name:"絆・支援",
      desc:"一定間隔でプレイヤーを回復",
      max:3
    }
  };

  const COMMANDS={
    follow:{
      name:"追従",
      desc:"プレイヤーについてくる"
    },
    attack:{
      name:"攻撃",
      desc:"近くの敵を優先して攻撃"
    },
    wait:{
      name:"待機",
      desc:"その場で待機"
    }
  };

  let attackTimer=0;
  let damageTimer=0;
  let supportTimer=0;
  let abilityTimer=0;
  let xpTimer=0;

  function clone(x){
    return x
      ? JSON.parse(JSON.stringify(x))
      : x;
  }

  function ensure(){
    const g=G();

    if(!g?.save)return null;

    const p=g.save.player;

    p.pet=p.pet || {
      type:"hound",
      level:1,
      xp:0,
      skillPoints:0,
      command:"follow",
      skills:{
        combat:0,
        scout:0,
        bond:0
      },
      stats:{
        missions:0,
        defeats:0,
        abilities:0
      }
    };

    p.pet.skills=Object.assign({
      combat:0,
      scout:0,
      bond:0
    },p.pet.skills||{});

    p.pet.stats=Object.assign({
      missions:0,
      defeats:0,
      abilities:0
    },p.pet.stats||{});

    p.pet.level=Math.max(
      1,
      Number(p.pet.level||1)
    );

    p.pet.xp=Math.max(
      0,
      Number(p.pet.xp||0)
    );

    p.pet.skillPoints=Math.max(
      0,
      Number(p.pet.skillPoints||0)
    );

    if(!PET_TYPES[p.pet.type]){
      p.pet.type="hound";
    }

    if(!COMMANDS[p.pet.command]){
      p.pet.command="follow";
    }

    return p.pet;
  }

  function isTrainer(){
    return G()?.save?.player?.classId==="trainer";
  }

  function xpNext(level){
    return 40+
      (Math.max(1,level)-1)*40;
  }

  function gainXP(amount,reason){
    const pet=ensure();

    if(!pet || !isTrainer())return;

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
        "ペットLv."+
        pet.level+
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
        Number(
          pet?.skills?.[key]||0
        )
      )
    );
  }

  function spendSkill(key){
    const pet=ensure();
    const skill=PET_SKILLS[key];

    if(!pet || !skill)return false;

    const lv=skillLevel(key);

    if(pet.skillPoints<=0){
      G().logMessage?.(
        "ペットのスキルポイントがありません"
      );
      return false;
    }

    if(lv>=skill.max){
      G().logMessage?.(
        skill.name+
        "は最大レベルです"
      );
      return false;
    }

    pet.skills[key]=lv+1;
    pet.skillPoints--;

    applyEffects();

    G().persist?.();

    return true;
  }

  function setType(type){
    const pet=ensure();

    if(!isTrainer()){
      G().logMessage?.(
        "調教師のみペットを選択できます"
      );
      return false;
    }

    if(!PET_TYPES[type]){
      return false;
    }

    pet.type=type;

    applyEffects();

    G().persist?.();

    G().logMessage?.(
      "ペットを"+
      PET_TYPES[type].name+
      "に変更しました"
    );

    return true;
  }

  function setCommand(command){
    const pet=ensure();

    if(!pet || !isTrainer())return false;

    if(!COMMANDS[command])return false;

    pet.command=command;

    G().persist?.();

    G().logMessage?.(
      "ペット指示："+
      COMMANDS[command].name
    );

    return true;
  }

  function ensureTrainerLoadout(){
    const g=G();

    if(!g || !isTrainer())return;

    g.activeWeaponSlot=1;

    const equipment=
      g.save.equipment||{};

    const weapon2=
      equipment.weapon2;

    if(weapon2){
      g.save.stash.push(
        clone(weapon2)
      );

      equipment.weapon2=null;

      g.persist?.();

      g.logMessage?.(
        "武器2枠をペット枠へ変更しました"
      );
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
        g.player.petDamageBonus=0;
        g.player.petStealthTimer=0;
      }
      return;
    }

    const type=
      PET_TYPES[pet.type];

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

    pet.stats.missions++;

    window.EFRPetState={
      x:G().player.x-35,
      y:G().player.y+35,
      hp:100,
      maxHp:100,
      markedTarget:null
    };

    attackTimer=0;
    damageTimer=0;
    supportTimer=0;
    abilityTimer=0;
    xpTimer=0;

    G().persist?.();
  }

  function onExtract(){
    const pet=ensure();

    if(!pet || !isTrainer())return;

    pet.downed=false;

    if(window.EFRPetState){
      window.EFRPetState.hp=
        window.EFRPetState.maxHp;
    }

    gainXP(15,"extract");

    G().persist?.();
  }

  function onFail(){
    const pet=ensure();

    if(!pet || !isTrainer())return;

    pet.downed=false;

    if(window.EFRPetState){
      window.EFRPetState.hp=
        window.EFRPetState.maxHp;
    }

    G().persist?.();
  }

  function nearestEnemy(range){
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

      if(d>(range||190))continue;

      if(
        g.hasLineOfSight &&
        !g.hasLineOfSight(
          {x:s.x,y:s.y},
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

  function markNearby(){
    const g=G();
    const s=window.EFRPetState;

    if(!g || !s)return 0;

    let count=0;

    for(const enemy of g.enemies||[]){
      if(enemy.dead)continue;

      const d=Math.hypot(
        enemy.x-s.x,
        enemy.y-s.y
      );

      if(d>280)continue;

      enemy.efrPetMarked=true;
      enemy.efrPetMarkTimer=12;

      count++;
    }

    return count;
  }

  function useAbility(){
    const g=G();
    const pet=ensure();
    const s=window.EFRPetState;

    if(
      !g ||
      !pet ||
      !s ||
      !isTrainer() ||
      pet.downed
    ){
      return false;
    }

    if(abilityTimer>0){
      g.logMessage?.(
        "ペット能力は再使用待ちです"
      );
      return false;
    }

    const type=
      PET_TYPES[pet.type];

    if(type.ability==="rush"){
      const target=
        nearestEnemy(280);

      if(!target){
        g.logMessage?.(
          "突撃対象がいません"
        );
        return false;
      }

      target.hp-=
        30+
        pet.level*3+
        skillLevel("combat")*5;

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
        gainXP(15,"ability");
      }

      abilityTimer=8;
      pet.stats.abilities++;

      g.logMessage?.(
        "猟犬が敵へ突撃しました"
      );

    }else if(type.ability==="mark"){
      const count=markNearby();

      if(!count){
        g.logMessage?.(
          "周囲に敵がいません"
        );
        return false;
      }

      abilityTimer=10;
      pet.stats.abilities++;

      gainXP(5,"scout");

      g.logMessage?.(
        "偵察鳥が"+
        count+
        "体の敵をマーキングしました"
      );

    }else if(type.ability==="stealth"){
      g.player.petStealthTimer=8;

      abilityTimer=12;
      pet.stats.abilities++;

      g.logMessage?.(
        "猫と身を潜めました"
      );

    }else if(type.ability==="search"){
      /*
       * 荷運び獣は周辺の戦利品を
       * プレイヤーが拾いやすくする。
       */
      g.player.petSearchTimer=12;

      abilityTimer=10;
      pet.stats.abilities++;

      gainXP(5,"search");

      g.logMessage?.(
        "荷運び獣が周辺を探索します"
      );
    }

    g.persist?.();

    return true;
  }

  function updateMarkedEnemies(dt){
    const g=G();

    for(const enemy of g?.enemies||[]){
      if(!enemy.efrPetMarked)continue;

      enemy.efrPetMarkTimer=
        Math.max(
          0,
          (enemy.efrPetMarkTimer||0)-dt
        );

      if(enemy.efrPetMarkTimer<=0){
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

    const pet=ensure();

    if(!pet)return;

    applyEffects();

    updateMarkedEnemies(dt);

    const s=window.EFRPetState;

    if(!s)return;

    const type=
      PET_TYPES[pet.type];

    abilityTimer=
      Math.max(
        0,
        abilityTimer-dt
      );

    xpTimer=
      Math.max(
        0,
        xpTimer-dt
      );

    if(pet.downed){
      s.x+=
        (g.player.x-35-s.x)*
        Math.min(1,dt*2);

      s.y+=
        (g.player.y+35-s.y)*
        Math.min(1,dt*2);

      return;
    }

    /*
     * 待機
     */
    if(pet.command==="wait"){
      damageTimer=
        Math.max(
          0,
          damageTimer-dt
        );
    }

    /*
     * 追従
     */
    if(pet.command==="follow"){
      const targetX=
        g.player.x-
        g.player.facingX*32;

      const targetY=
        g.player.y-
        g.player.facingY*32;

      const dx=
        targetX-s.x;

      const dy=
        targetY-s.y;

      const d=
        Math.hypot(dx,dy)||1;

      if(d>18){
        const step=
          Math.min(
            d,
            95*
            (type.speed||1)*
            dt
          );

        s.x+=dx/d*step;
        s.y+=dy/d*step;
      }
    }

    /*
     * 攻撃指示なら敵へ寄る。
     */
    if(pet.command==="attack"){
      const target=
        nearestEnemy(280);

      if(target){
        const dx=
          target.x-s.x;

        const dy=
          target.y-s.y;

        const d=
          Math.hypot(dx,dy)||1;

        if(d>25){
          const step=
            Math.min(
              d,
              105*
              (type.speed||1)*
              dt
            );

          s.x+=dx/d*step;
          s.y+=dy/d*step;
        }
      }
    }

    /*
     * ペット攻撃
     */
    attackTimer=
      Math.max(
        0,
        attackTimer-dt
      );

    if(
      pet.command!=="wait" &&
      attackTimer<=0
    ){
      const target=
        nearestEnemy(
          pet.command==="attack"
            ? 300
            : 190
        );

      if(target){
        const damage=
          12+
          (pet.level-1)*2+
          skillLevel("combat")*5+
          (type.damage||0);

        target.hp-=damage;

        target.efrPetMarked=true;
        target.efrPetMarkTimer=5;

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

          pet.stats.defeats++;

          gainXP(
            10+
            (pet.command==="attack"?3:0),
            "defeat"
          );
        }
      }
    }

    /*
     * 敵からのダメージ
     */
    damageTimer=
      Math.max(
        0,
        damageTimer-dt
      );

    if(
      damageTimer<=0
    ){
      for(const enemy of g.enemies||[]){
        if(enemy.dead)continue;

        const d=
          Math.hypot(
            enemy.x-s.x,
            enemy.y-s.y
          );

        if(d<30){
          s.hp-=Math.max(
            1,
            Math.round(
              (enemy.damage||8)*.45
            )
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
     * 絆・支援
     */
    supportTimer=
      Math.max(
        0,
        supportTimer-dt
      );

    if(
      supportTimer<=0 &&
      skillLevel("bond")>0 &&
      Math.hypot(
        g.player.x-s.x,
        g.player.y-s.y
      )<90
    ){
      const maxHp=
        g.player.maxHp||100;

      g.player.hp=
        Math.min(
          maxHp,
          g.player.hp+
          skillLevel("bond")*2
        );

      supportTimer=8;
    }

    /*
     * 時間経過で探索経験値
     */
    if(
      xpTimer<=0 &&
      pet.command!=="wait"
    ){
      gainXP(1,"activity");
      xpTimer=12;
    }
  }

  function draw(){
    const g=G();
    const s=window.EFRPetState;

    if(
      !g?.running ||
      !isTrainer() ||
      !s
    ){
      return;
    }

    const pet=ensure();
    const type=
      PET_TYPES[pet.type];

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

    ctx.arc(
      s.x,
      s.y,
      11,
      0,
      Math.PI*2
    );

    ctx.fill();

    ctx.strokeStyle=
      pet.downed
        ? "#aaa"
        : "#fff";

    ctx.stroke();

    /*
     * 指示状態
     */
    ctx.fillStyle="#fff";
    ctx.font="bold 9px sans-serif";
    ctx.textAlign="center";

    ctx.fillText(
      type.name,
      s.x,
      s.y-16
    );

    ctx.fillText(
      COMMANDS[pet.command].name,
      s.x,
      s.y+27
    );

    /*
     * HP
     */
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
      28*
      Math.max(
        0,
        s.hp/s.maxHp
      ),
      3
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
      <span id="efrPetName"></span>
      <span id="efrPetHp"></span>
      <span id="efrPetCommand"></span>
      <div class="efrPetHudButtons">
        <button data-pet-command="follow">追従</button>
        <button data-pet-command="attack">攻撃</button>
        <button data-pet-command="wait">待機</button>
        <button data-pet-ability>能力</button>
      </div>
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
            command.dataset.petCommand
          );

          renderHud();

          return;
        }

        const ability=
          event.target.closest(
            "[data-pet-ability]"
          );

        if(ability){
          useAbility();
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

    const visible=
      isTrainer();

    hud.classList.toggle(
      "hidden",
      !visible
    );

    if(!visible)return;

    const pet=ensure();

    const type=
      PET_TYPES[pet.type];

    const s=
      window.EFRPetState;

    const name=
      document.getElementById(
        "efrPetName"
      );

    const hp=
      document.getElementById(
        "efrPetHp"
      );

    const command=
      document.getElementById(
        "efrPetCommand"
      );

    if(name){
      name.textContent=
        type.name+
        " Lv."+pet.level;
    }

    if(hp){
      hp.textContent=
        s
          ? "HP "+
            Math.round(s.hp)+
            "/"+
            Math.round(s.maxHp)
          : "未出撃";
    }

    if(command){
      command.textContent=
        "指示："+
        COMMANDS[pet.command].name;
    }

    hud
      .querySelectorAll(
        "[data-pet-command]"
      )
      .forEach(button=>{
        button.classList.toggle(
          "active",
          button.dataset.petCommand===
          pet.command
        );
      });
  }

  function getState(){
    const pet=ensure();

    return {
      ...pet,
      typeData:
        PET_TYPES[pet.type],
      xpNext:
        xpNext(pet.level),
      commands:
        COMMANDS,
      ability:
        PET_TYPES[pet.type]?.ability
    };
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
    ensure,
    getState,
    gainXP,
    skillLevel,
    spendSkill,
    setType,
    setCommand,
    ensureTrainerLoadout,
    prepareRaid,
    onExtract,
    onFail,
    useAbility,
    applyEffects,
    update,
    draw,
    init
  };

  init();

})();
