const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const basePanel = document.getElementById("basePanel");
const raidPanel = document.getElementById("raidPanel");
const resultPanel = document.getElementById("resultPanel");

const statusEl = document.getElementById("status");
const hpEl = document.getElementById("hp");
const weaponEl = document.getElementById("weapon");
const armorEl = document.getElementById("armor");
const bagCountEl = document.getElementById("bagCount");
const mapInfoEl = document.getElementById("mapInfo");

const interactionBar = document.getElementById("interactionBar");
const interactionText = document.getElementById("interactionText");
const interactBtn = document.getElementById("interactBtn");
const lootPanel = document.getElementById("lootPanel");
const lootTitle = document.getElementById("lootTitle");
const lootStatus = document.getElementById("lootStatus");
const lootContents = document.getElementById("lootContents");
const lootPauseBtn = document.getElementById("lootPauseBtn");
const lootCollectAllBtn = document.getElementById("lootCollectAllBtn");
const closeLootBtn = document.getElementById("closeLootBtn");

const baseLootEl = document.getElementById("baseLoot");
const escapesEl = document.getElementById("escapes");
const baseWeapon2El = document.getElementById("baseWeapon2");
const stashEl = document.getElementById("stash");
const baseWeaponSlot2El = document.getElementById("baseWeaponSlot2");
const baseHeadEl = document.getElementById("baseHead");
const baseChestEl = document.getElementById("baseChest");
const baseLegsEl = document.getElementById("baseLegs");
const baseBackpackEl = document.getElementById("baseBackpack");
const weapon2El = document.getElementById("weapon2");
const inventoryPanel = document.getElementById("inventoryPanel");
const equipmentSlotsEl = document.getElementById("equipmentSlots");
const inventoryContentsEl = document.getElementById("inventoryContents");
const inventoryBtn = document.getElementById("inventoryBtn");
const closeInventoryBtn = document.getElementById("closeInventoryBtn");
const raidInspectBackdrop = document.getElementById("raidInspectBackdrop");
const raidInspectTitle = document.getElementById("raidInspectTitle");

const stickArea = document.getElementById("stickArea");
const stickKnob = document.getElementById("stickKnob");

const W = canvas.width;
const H = canvas.height;

/*
 * 探索ワールドは表示領域の約4倍の面積を持つ。
 * Canvas自体は従来どおり960x540のまま。
 * カメラ座標とワールド座標を分離し、プレイヤー移動に追従させる。
 */
const WORLD_SCALE = 2;
const WORLD_W = W * WORLD_SCALE;
const WORLD_H = H * WORLD_SCALE;

/*
 * 探索ワールドだけを拡大表示する。
 * Canvas/HUD/操作UIのサイズは変更しない。
 *
 * 1.5倍にすることで、人・敵・ペット・アイテムの
 * ワールド内の相対サイズは維持したまま、
 * スマホ上での視認性を上げる。
 */
const CAMERA_ZOOM = 1.5;

const CAMERA_VIEW_W = W / CAMERA_ZOOM;
const CAMERA_VIEW_H = H / CAMERA_ZOOM;

const camera = {
  x: 0,
  y: 0
};

function updateCamera(){
  if(!world)return;

  camera.x = Math.max(
    0,
    Math.min(
      Math.max(0,WORLD_W-CAMERA_VIEW_W),
      player.x-CAMERA_VIEW_W/2
    )
  );

  camera.y = Math.max(
    0,
    Math.min(
      Math.max(0,WORLD_H-CAMERA_VIEW_H),
      player.y-CAMERA_VIEW_H/2
    )
  );
}

function worldToScreenX(x){
  return (x-camera.x)*CAMERA_ZOOM;
}

function worldToScreenY(y){
  return (y-camera.y)*CAMERA_ZOOM;
}

function screenToWorldX(x){
  return x/CAMERA_ZOOM+camera.x;
}

function screenToWorldY(y){
  return y/CAMERA_ZOOM+camera.y;
}

let running = false;
let lastTime = 0;
let damageTimer = 0;
let attackTimer = 0;
let attackFlash = 0;
let noiseStepTimer = 0;
const noiseEvents = [];
const damageNumbers = [];

function applyDamage(target,damage){
  if(!target)return 0;

  let amount=Math.max(0,Math.round(Number(damage)||0));

  if(
    !target.trainingDummy &&
    Number(target.efrPetDebuffDefenseIncrease||0)>0
  ){
    amount=Math.max(
      0,
      Math.round(
        amount*
        (
          1+
          Number(target.efrPetDebuffDefenseIncrease||0)
        )
      )
    );
  }

  if(amount<=0)return 0;

  if(target.trainingDummy){
    showDamageNumber(target,amount);
    return amount;
  }

  const before=Math.max(0,Number(target.hp)||0);
  const applied=Math.min(before,amount);

  if(applied<=0)return 0;

  target.hp=before-applied;
  showDamageNumber(target,applied);

  return applied;
}

function showDamageNumber(target,damage){
  const value=Math.max(0,Math.round(Number(damage)||0));
  if(!target || value<=0)return;

  damageNumbers.push({
    x:Number(target.x)||0,
    y:(Number(target.y)||0)-target.r-8,
    value,
    life:.75,
    maxLife:.75,
    drift:(Math.random()-.5)*16
  });

  if(damageNumbers.length>40){
    damageNumbers.splice(0,damageNumbers.length-40);
  }
}

function updateDamageNumbers(dt){
  for(let i=damageNumbers.length-1;i>=0;i--){
    const item=damageNumbers[i];
    item.life-=dt;
    item.y-=34*dt;

    if(item.life<=0){
      damageNumbers.splice(i,1);
    }
  }
}

function drawDamageNumbers(){
  if(!damageNumbers.length)return;

  ctx.save();
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.font="900 16px sans-serif";
  ctx.lineWidth=4;
  ctx.strokeStyle="rgba(0,0,0,.82)";

  for(const item of damageNumbers){
    const alpha=Math.min(1,item.life/.18);
    const x=item.x+
      Math.sin((item.maxLife-item.life)*10)*item.drift;

    ctx.globalAlpha=alpha;
    ctx.strokeText("-"+item.value,x,item.y);

    ctx.fillStyle="#fff4dc";
    ctx.fillText("-"+item.value,x,item.y);
  }

  ctx.restore();
}

let activeWeaponSlot = 1;

const efrAim = {
  active: false,
  pointerId: null
};

const efrFire = {
  active: false,
  pointerId: null,
  suppressClick: false,
  aimOriginX: 0,
  aimOriginY: 0
};

const efrLook = {
  active: false,
  pointerId: null,
  originX: 0,
  originY: 0
};

function efrSetAim(x, y){
  const d = Math.hypot(x, y);
  if(d < 0.001)return;

  player.facingX = x / d;
  player.facingY = y / d;
}

let world = null;
let enemies = [];
let items = [];
let containers = [];
let openContainer = null;
let openLoot = [];
let lootRevealTimer = null;
let lootRevealLastTickAt = 0;
let lootRevealPaused = false;
let interactionTarget = null;

const stick = {
  active:false,
  pointerId:null,
  x:0,
  y:0
};


const equipmentCatalog=[
  {name:"小型バックパック",kind:"backpack",slotType:"backpack",capacity:6,slots:2},
  {name:"タクティカルバックパック",kind:"backpack",slotType:"backpack",capacity:12,slots:2},
  {name:"大型バックパック",kind:"backpack",slotType:"backpack",capacity:18,slots:3},

  {name:"軽量ヘルメット",kind:"armor",slotType:"head",reduction:2,slots:1},
  {name:"防護ヘルメット",kind:"armor",slotType:"head",reduction:4,slots:1},

  {name:"軽量アーマー",kind:"armor",slotType:"chest",reduction:3,slots:2},
  {name:"防護ベスト",kind:"armor",slotType:"chest",reduction:6,slots:2},

  {name:"軽量ブーツ",kind:"armor",slotType:"legs",reduction:2,slots:1},
  {name:"防護ブーツ",kind:"armor",slotType:"legs",reduction:4,slots:1},

  {name:"ナイフ",kind:"weapon",damage:22,range:42,cooldown:.22,knockback:8,slots:1},
  {name:"鉄パイプ",kind:"weapon",damage:30,range:48,cooldown:.55,knockback:22,slots:2}
];

function catalogItem(name){
  const item=equipmentCatalog.find(x=>x.name===name);
  if(!item)return null;

  const result=cloneItem(item);
  ensureWeaponProgression(result);
  ensureArmorProgression(result);

  return result;
}

const defaultSave = {
  stash:[],
  animals:[],
  escapes:0,
  player:{
    level:1,
    xp:0,
    classId:"melee",
    skillPoints:0,
    skills:{
      meleePower:0,
      gunPower:0,
      exploration:0,
      magic:0,
      survival:0
    }
  },
  base:{
    level:1,
    xp:0,
    facilities:{
      storage:1,
      workshop:1,
      medical:1,
      workbench:1
    }
  },
  research:{
    unlocked:{}
  },
  wishlist:[],
  keys:[],
  equipment:{
    weapon1:null,
    weapon2:null,
    head:null,
    chest:null,
    legs:null,
    backpack:null
  }
};

let save;

try{
  const raw=JSON.parse(localStorage.getItem("efr-save") || "{}");

  save=Object.assign({},defaultSave,raw);
  save.player=Object.assign({},defaultSave.player,raw.player || {});
  save.player.skills=Object.assign(
    {},
    defaultSave.player.skills,
    raw.player?.skills || {}
  );
  save.player.skillPoints=Math.max(
    0,
    Number(raw.player?.skillPoints ?? 0)
  );
  save.player.level=Math.max(
    1,
    Number(save.player.level || 1)
  );
  save.player.xp=Math.max(
    0,
    Number(save.player.xp || 0)
  );

  save.base=Object.assign({},defaultSave.base,raw.base || {});
  save.base.facilities=Object.assign(
    {},
    defaultSave.base.facilities,
    raw.base?.facilities || {}
  );
  save.research=Object.assign(
    {},
    defaultSave.research,
    raw.research || {}
  );
  save.research.unlocked=Object.assign(
    {},
    defaultSave.research.unlocked,
    raw.research?.unlocked || {}
  );
  save.wishlist=Array.isArray(raw.wishlist)
    ? raw.wishlist.filter(entry=>
        entry &&
        (entry.type==="recipe" || entry.type==="upgrade")
      )
    : [];
  save.keys=Array.isArray(raw.keys)
    ? raw.keys
        .filter(x=>typeof x==="string")
        .filter(x=>["military","research","factory","storage","security","special"].includes(x))
        .slice(0,3)
    : [];
  save.equipment=Object.assign({},defaultSave.equipment,raw.equipment || {});

  save.animals=Array.isArray(raw.animals)
    ? raw.animals.slice(0,20)
    : [];

  if(
    !save.animals.length &&
    raw.player?.pet &&
    typeof raw.player.pet==="object"
  ){
    save.animals=[raw.player.pet];
  }

  if(raw.equipment?.weapon && !save.equipment.weapon1){
    save.equipment.weapon1={
      name:raw.equipment.weapon.name,
      damage:raw.equipment.weapon.damage,
      range:raw.equipment.weapon.range,
      kind:"weapon",
      slots:1
    };
  }

  if(raw.equipment?.armor && !save.equipment.chest){
    save.equipment.chest={
      name:raw.equipment.armor.name,
      reduction:raw.equipment.armor.reduction,
      kind:"armor",
      slotType:"chest",
      slots:2
    };
  }

  if(!Object.prototype.hasOwnProperty.call(raw.equipment || {},"backpack")){
    save.equipment.backpack={
      name:"小型バックパック",
      capacity:4,
      kind:"backpack",
      slotType:"backpack",
      slots:2
    };
  }else if(save.equipment.backpack && !save.equipment.backpack.capacity){
    save.equipment.backpack={
      name:"小型バックパック",
      capacity:4,
      kind:"backpack",
      slotType:"backpack",
      slots:2
    };
  }

  if(save.equipment.backpack?.name==="小型バックパック"){
    save.equipment.backpack.baseCapacity=4;
  }else if(save.equipment.backpack?.name==="タクティカルバックパック"){
    save.equipment.backpack.baseCapacity=10;
  }else if(save.equipment.backpack?.name==="大型バックパック"){
    save.equipment.backpack.baseCapacity=14;
  }

  ensureBackpackProgression(save.equipment.backpack);
  applyBackpackProgression(save.equipment.backpack);

  delete save.equipment.weapon;
  delete save.equipment.armor;

  // 旧セーブの文字列アイテムを構造化データへ移行
  save.stash=(save.stash || []).map(item=>{
    if(typeof item !== "string") return item;

    const known={
      "部品":{name:"部品",kind:"material",slots:1,weight:1},
      "電子部品":{name:"電子部品",kind:"material",slots:1,weight:1},
      "貴重品":{name:"貴重品",kind:"loot",slots:2,weight:1}
    };

    return known[item]
      ? {...known[item]}
      : {name:item,kind:"material",slots:1,weight:1};
  });

  /*
   * 旧専用 weaponParts 在庫を通常グリッド倉庫へ一度だけ移行する。
   * base.weaponParts を以後の現行在庫として使用しない。
   */
  if(Array.isArray(save.base?.weaponParts)){
    const legacyPartNames={
      precisionBarrel:"精密バレル",
      stableStock:"安定ストック",
      grip:"グリップ",
      extendedMagazine:"拡張マガジン",
      muzzleBrake:"制退器"
    };

    for(const rawPart of save.base.weaponParts){
      const id=
        typeof rawPart==="string"
          ? rawPart
          : rawPart?.id;

      if(!id)continue;

      const rarity=Math.max(
        1,
        Math.min(
          5,
          Number(
            typeof rawPart==="string"
              ? 1
              : rawPart?.rarity||1
          )
        )
      );

      save.stash.push({
        name:legacyPartNames[id]||id,
        kind:"weaponPart",
        id,
        partId:id,
        rarity,
        slots:1,
        gridW:1,
        gridH:1,
        weight:.5
      });
    }

    delete save.base.weaponParts;
  }

  [
    ...Object.values(save.equipment||{}),
    ...(save.stash||[])
  ].forEach(item=>{
    ensureWeaponProgression(item);
    ensureArmorProgression(item);
    ensureBackpackProgression(item);
  });

}catch{
  save=JSON.parse(JSON.stringify(defaultSave));
}

const player = {
  x:60,
  y:270,
  r:14,
  hp:100,
  speed:185,
  loot:[],
  inside:null,
  backpackCapacity:4,
  baseBackpackCapacity:4,
  baseSpeed:185,
  baseMaxMP:100,
  facingX:1,
  facingY:0,
  maxHp:100,
  mp:100,
  maxMP:100,
  casting:false
};

const exit = {
  x:WORLD_W-70,
  y:WORLD_H/2-35,
  w:35,
  h:70
};

function persist(){
  localStorage.setItem("efr-save",JSON.stringify(save));
}

const RAID_START_POSITION=Object.freeze({
  x:60,
  y:270
});

function resetSaveData(){
  const fresh=JSON.parse(JSON.stringify(defaultSave));

  fresh.equipment.backpack={
    name:"小型バックパック",
    capacity:4,
    baseCapacity:4,
    kind:"backpack",
    slotType:"backpack",
    slots:2,
    rarity:1
  };

  Object.keys(save).forEach(key=>{
    delete save[key];
  });

  Object.assign(save,fresh);

  running=false;
  lastTime=0;
  damageTimer=0;
  attackTimer=0;
  attackFlash=0;
  noiseStepTimer=0;
  noiseEvents.length=0;
  activeWeaponSlot=1;

  player.x=RAID_START_POSITION.x;
  player.y=RAID_START_POSITION.y;
  player.hp=100;
  player.speed=185;
  player.loot=[];
  player.inside=null;
  player.backpackCapacity=4;
  player.baseBackpackCapacity=4;
  player.baseSpeed=185;
  player.baseMaxMP=100;
  player.facingX=1;
  player.facingY=0;
  player.maxHp=100;
  player.mp=100;
  player.maxMP=100;
  player.casting=false;

  enemies=[];
  items=[];
  containers=[];
  openContainer=null;
  openLoot=[];
  interactionTarget=null;

  persist();
  refreshBackpackCapacity();

  basePanel.classList.remove("hidden");
  raidPanel.classList.add("hidden");
  resultPanel.classList.add("hidden");
  inventoryPanel.classList.add("hidden");
  statusEl.textContent="拠点";

  renderBase();
  window.EFRHub?.render?.();
  window.EFRLoadout?.render?.();
  renderInventory();
}

function removeLegacySaveData(){
  let removed=0;

  if(save.equipment){
    for(const key of ["weapon","armor"]){
      if(Object.prototype.hasOwnProperty.call(save.equipment,key)){
        delete save.equipment[key];
        removed++;
      }
    }
  }

  const cleanItem=item=>{
    if(!item || typeof item!=="object")return;

    if(Object.prototype.hasOwnProperty.call(item,"upgradeLevel")){
      delete item.upgradeLevel;
      removed++;
    }

    if(Object.prototype.hasOwnProperty.call(item,"_efrBaseStats")){
      delete item._efrBaseStats;
      removed++;
    }
  };

  for(const item of Object.values(save.equipment||{})){
    cleanItem(item);
  }

  for(const item of save.stash||[]){
    cleanItem(item);
  }

  if(removed>0){
    persist();
  }

  return removed;
}


const WEAPON_LEVEL_MAX=10;
const WEAPON_RARITY_MAX=5;
const ARMOR_LEVEL_MAX=10;
const ARMOR_RARITY_MAX=5;

const WEAPON_RARITIES=[
  "コモン",
  "アンコモン",
  "レア",
  "エピック",
  "レジェンダリー"
];

const ARMOR_RARITIES=[
  "コモン",
  "アンコモン",
  "レア",
  "エピック",
  "レジェンダリー"
];

const WEAPON_RARITY_MULTIPLIERS=[
  1,
  1.08,
  1.18,
  1.30,
  1.45
];

function isWeaponItem(item){
  return item?.kind==="weapon" || item?.kind==="firearm";
}

function ensureWeaponProgression(item){
  if(!isWeaponItem(item))return item;

  const oldUpgrade=Math.max(
    0,
    Number(item.upgradeLevel||0)
  );

  const level=Number(item.weaponLevel);
  const rarity=Number(item.rarity);

  item.weaponLevel=Math.min(
    WEAPON_LEVEL_MAX,
    Math.max(
      1,
      Number.isFinite(level)
        ? level
        : 1+oldUpgrade
    )
  );

  item.rarity=Math.min(
    WEAPON_RARITY_MAX,
    Math.max(
      1,
      Number.isFinite(rarity)
        ? rarity
        : 1
    )
  );

  if(item.baseDamage==null){
    const oldBase=
      Number(item._efrBaseStats?.damage||0);

    const currentDamage=
      Number(item.damage||0);

    item.baseDamage=Math.max(
      1,
      oldBase ||
      (
        oldUpgrade>0
          ? currentDamage/Math.pow(1.08,oldUpgrade)
          : currentDamage
      )
    );
  }

  delete item.upgradeLevel;

  return item;
}

function weaponRarityName(rarity){
  const index=Math.min(
    WEAPON_RARITY_MAX-1,
    Math.max(0,Number(rarity||1)-1)
  );

  return WEAPON_RARITIES[index];
}

function weaponLevelMultiplier(level){
  const lv=Math.min(
    WEAPON_LEVEL_MAX,
    Math.max(1,Number(level||1))
  );

  return 1+(lv-1)*0.05;
}

function weaponRarityMultiplier(rarity){
  const index=Math.min(
    WEAPON_RARITY_MAX-1,
    Math.max(0,Number(rarity||1)-1)
  );

  return WEAPON_RARITY_MULTIPLIERS[index];
}

function weaponProgressionDamage(item,baseDamage){
  ensureWeaponProgression(item);

  const base=Math.max(
    1,
    Number(baseDamage ?? item.baseDamage ?? item.damage ?? 1)
  );

  return Math.max(
    1,
    Math.round(
      base*
      weaponLevelMultiplier(item.weaponLevel)*
      weaponRarityMultiplier(item.rarity)
    )
  );
}

function isArmorItem(item){
  return item?.kind==="armor";
}

function isBackpackItem(item){
  return item?.kind==="backpack";
}

function ensureBackpackProgression(item){
  if(!isBackpackItem(item))return item;

  const rarity=Number(item.rarity);

  item.rarity=Math.min(
    5,
    Math.max(
      1,
      Number.isFinite(rarity)
        ? rarity
        : 1
    )
  );

  if(item.baseCapacity==null){
    item.baseCapacity=Math.max(
      0,
      Number(item.capacity||0)
    );
  }

  return item;
}

function backpackRarityName(rarity){
  const index=Math.min(
    4,
    Math.max(0,Number(rarity||1)-1)
  );

  return WEAPON_RARITIES[index];
}

function backpackRarityMultiplier(rarity){
  const index=Math.min(
    4,
    Math.max(0,Number(rarity||1)-1)
  );

  return WEAPON_RARITY_MULTIPLIERS[index];
}

function backpackProgressionCapacity(item){
  ensureBackpackProgression(item);

  const base=Math.max(
    0,
    Number(item.baseCapacity ?? item.capacity ?? 0)
  );

  return Math.max(
    0,
    Math.round(
      base*
      backpackRarityMultiplier(item.rarity)
    )
  );
}

function applyBackpackProgression(item){
  if(!isBackpackItem(item))return item;

  ensureBackpackProgression(item);

  item.capacity=backpackProgressionCapacity(item);

  return item;
}

function ensureArmorProgression(item){
  if(!isArmorItem(item))return item;

  const oldUpgrade=Math.max(
    0,
    Number(item.upgradeLevel||0)
  );

  const level=Number(item.armorLevel);
  const rarity=Number(item.rarity);

  item.armorLevel=Math.min(
    ARMOR_LEVEL_MAX,
    Math.max(
      1,
      Number.isFinite(level)
        ? level
        : 1+oldUpgrade
    )
  );

  item.rarity=Math.min(
    ARMOR_RARITY_MAX,
    Math.max(
      1,
      Number.isFinite(rarity)
        ? rarity
        : 1
    )
  );

  if(item.baseReduction==null){
    const oldBase=Number(item._efrBaseStats?.reduction||0);
    const current=Number(item.reduction||0);

    item.baseReduction=Math.max(
      0,
      oldBase ||
      (
        oldUpgrade>0
          ? current/Math.pow(1.05,oldUpgrade)
          : current
      )
    );
  }

  delete item.upgradeLevel;

  return item;
}

function armorRarityName(rarity){
  const index=Math.min(
    ARMOR_RARITY_MAX-1,
    Math.max(0,Number(rarity||1)-1)
  );

  return ARMOR_RARITIES[index];
}

function armorLevelMultiplier(level){
  const lv=Math.min(
    ARMOR_LEVEL_MAX,
    Math.max(1,Number(level||1))
  );

  return 1+(lv-1)*0.05;
}

function armorRarityMultiplier(rarity){
  const index=Math.min(
    ARMOR_RARITY_MAX-1,
    Math.max(0,Number(rarity||1)-1)
  );

  return [
    1,
    1.08,
    1.18,
    1.30,
    1.45
  ][index];
}

function armorProgressionReduction(item,baseReduction){
  ensureArmorProgression(item);

  const base=Math.max(
    0,
    Number(
      baseReduction ??
      item.baseReduction ??
      item.reduction ??
      0
    )
  );

  return Math.max(
    0,
    Math.round(
      base*
      armorLevelMultiplier(item.armorLevel)*
      armorRarityMultiplier(item.rarity)
    )
  );
}

function applyArmorProgression(item){
  if(!isArmorItem(item))return item;

  ensureArmorProgression(item);

  item.reduction=armorProgressionReduction(
    item,
    item.baseReduction
  );

  return item;
}

function applyEquipmentProgression(item){
  if(isWeaponItem(item))return applyWeaponProgression(item);
  if(isArmorItem(item))return applyArmorProgression(item);
  return item;
}

function applyWeaponProgression(item){
  if(!isWeaponItem(item))return item;

  ensureWeaponProgression(item);

  item.damage=weaponProgressionDamage(
    item,
    item.baseDamage
  );

  return item;
}

const CHARACTER_SKILLS={
  meleePower:{
    name:"近接威力",
    description:"近接武器のダメージ +6% / Lv",
    max:3
  },
  gunPower:{
    name:"銃器威力",
    description:"銃器のダメージ +5% / Lv",
    max:3
  },
  exploration:{
    name:"携行術",
    description:"バッグ容量 +1 / Lv",
    max:3
  },
  magic:{
    name:"魔力容量",
    description:"最大MP +10 / Lv",
    max:3
  },
  survival:{
    name:"生存力",
    description:"最大HP +5 / Lv",
    max:3
  }
};

function playerXpToNextLevel(level){
  return 50+(Math.max(1,level)-1)*50;
}

function logMessage(message){
  const text=String(message ?? "");

  if(!text){
    return;
  }

  const previous=statusEl.textContent;
  statusEl.textContent=text;

  window.clearTimeout(logMessage.timer);

  logMessage.timer=window.setTimeout(()=>{
    if(statusEl.textContent===text){
      statusEl.textContent=
        running
          ? "探索中"
          : "拠点";
    }
  },2500);
}

function gainPlayerXP(amount,reason=""){
  const p=save.player;
  if(!p)return 0;

  p.xp=Math.max(
    0,
    (p.xp||0)+Math.max(0,amount||0)
  );

  let gained=0;

  while(p.xp>=playerXpToNextLevel(p.level||1)){
    p.xp-=playerXpToNextLevel(p.level||1);
    p.level=(p.level||1)+1;
    p.skillPoints=(p.skillPoints||0)+1;
    gained++;

    logMessage(
      "レベルアップ！ Lv."+p.level+
      " / スキルポイント +1"
    );
  }

  if(gained)persist();

  return gained;
}

function characterSkillLevel(key){
  return Math.max(
    0,
    Math.min(
      CHARACTER_SKILLS[key]?.max||0,
      Number(save.player?.skills?.[key]||0)
    )
  );
}

function spendCharacterSkill(key){
  const skill=CHARACTER_SKILLS[key];

  if(!skill)return false;

  const p=save.player;
  p.skills=p.skills||{};

  const lv=characterSkillLevel(key);

  if((p.skillPoints||0)<=0){
    logMessage("スキルポイントがありません");
    return false;
  }

  if(lv>=skill.max){
    logMessage(skill.name+"は最大レベルです");
    return false;
  }

  p.skills[key]=lv+1;
  p.skillPoints--;

  applyCharacterGrowth();
  persist();

  logMessage(
    skill.name+"をLv."+(lv+1)+"にしました"
  );

  return true;
}

function applyCharacterGrowth(){
  const skills=save.player?.skills||{};

  player.maxHp=
    100+
    Math.max(0,Number(skills.survival||0))*5;

  player.baseMaxMP=100;

  player.maxMP=
    player.baseMaxMP+
    Math.max(0,Number(skills.magic||0))*10;

  player.baseBackpackCapacity=4;

  refreshBackpackCapacity();

  if(player.hp>player.maxHp){
    player.hp=player.maxHp;
  }

  if(player.mp>player.maxMP){
    player.mp=player.maxMP;
  }
}

function characterWeaponDamage(weapon){
  let multiplier=1;
  const skills=save.player?.skills||{};

  if(weapon?.kind==="firearm"){
    multiplier+=
      Math.max(0,Number(skills.gunPower||0))*0.05;
  }else{
    multiplier+=
      Math.max(0,Number(skills.meleePower||0))*0.06;
  }

  const bonus=player.classBonus||{};

  if(weapon?.kind==="firearm"){
    multiplier*=bonus.firearmDamageMultiplier||1;
  }else{
    multiplier*=bonus.meleeDamageMultiplier||1;
  }

  return weapon.damage*multiplier;
}

function baseStorageCapacity(){
  const f=save.base?.facilities || {};
  return 24+
    Math.max(0,(save.base?.level||1)-1)*4+
    Math.max(0,(f.storage||1)-1)*10;
}

function gainBaseProgress(amount){
  save.base=save.base || {level:1,xp:0,facilities:{}};

  save.base.facilities=Object.assign({
    storage:1,
    workshop:1,
    medical:1,
    workbench:1
  },save.base.facilities||{});

  save.base.xp=(save.base.xp||0)+Math.max(0,amount||0);

  const thresholds=[0,50,125,225,350];

  while(
    save.base.level<5 &&
    save.base.xp>=thresholds[save.base.level]
  ){
    save.base.level++;
  }
}

function randomSeed(){
  return Math.floor(Math.random()*2147483647);
}

function mulberry32(seed){
  return function(){
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15,t | 1);
    t ^= t + Math.imul(t ^ t >>> 7,t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function rectHitCircle(c,r){
  const nx=Math.max(r.x,Math.min(c.x,r.x+r.w));
  const ny=Math.max(r.y,Math.min(c.y,r.y+r.h));
  return Math.hypot(c.x-nx,c.y-ny)<c.r;
}

function pointInRect(x,y,r){
  return x>r.x && x<r.x+r.w && y>r.y && y<r.y+r.h;
}

const PLAYER_VISION_RANGE=300;
const PLAYER_VISION_ANGLE=Math.PI*0.62;

const ENEMY_VISION_RANGE=280;
const ENEMY_VISION_ANGLE=Math.PI*0.55;

function angleDifference(a,b){
  let d=a-b;

  while(d>Math.PI)d-=Math.PI*2;
  while(d<-Math.PI)d+=Math.PI*2;

  return Math.abs(d);
}

function hasLineOfSight(from,to){
  const dx=to.x-from.x;
  const dy=to.y-from.y;
  const distance=Math.hypot(dx,dy);

  if(distance<=1)return true;

  const steps=Math.ceil(distance/6);

  for(let i=1;i<steps;i++){
    const t=i/steps;

    const x=from.x+dx*t;
    const y=from.y+dy*t;

    if(blocked({
      x,
      y,
      r:0
    })){
      return false;
    }
  }

  return true;
}

function inVision(from,target,range,angle){
  const dx=target.x-from.x;
  const dy=target.y-from.y;
  const distance=Math.hypot(dx,dy);

  if(distance>range)return false;

  const facingAngle=Math.atan2(
    from.facingY,
    from.facingX
  );

  const targetAngle=Math.atan2(dy,dx);

  if(angleDifference(facingAngle,targetAngle)>angle/2){
    return false;
  }

  return hasLineOfSight(from,target);
}

function playerCanSeeEnemy(enemy){
  const nearRange=player.r*3;
  const nearDx=enemy.x-player.x;
  const nearDy=enemy.y-player.y;
  const nearDistance=Math.hypot(nearDx,nearDy);

  if(nearDistance<=nearRange && hasLineOfSight(player,enemy)){
    return true;
  }

  let range=
    PLAYER_VISION_RANGE+
    (player.petVisionBonus||0);

  if(enemy?.efrPetMarked){
    range+=80;
  }

  return inVision(
    player,
    enemy,
    range,
    PLAYER_VISION_ANGLE
  );
}

function enemyCanSeePlayer(enemy){
  let range=
    ENEMY_VISION_RANGE*
    (player.petEnemyVisionMultiplier||1);

  /*
   * 猫の隠密能力。
   * 一時的にさらに視認距離を短縮する。
   */
  if(
    (player.petStealthTimer||0)>0
  ){
    range*=0.72;
  }

  return inVision(
    enemy,
    player,
    range,
    ENEMY_VISION_ANGLE
  );
}

function drawVisionCone(actor,range,angle,fillStyle,strokeStyle){
  const facingAngle=Math.atan2(
    actor.facingY,
    actor.facingX
  );

  const start=facingAngle-angle/2;
  const end=facingAngle+angle/2;
  const segments=24;
  const points=[];

  for(let i=0;i<=segments;i++){
    const rayAngle=
      start+
      (end-start)*(i/segments);

    let distance=range;
    const step=18;

    if(typeof blocked==="function"){
      for(
        let testDistance=step;
        testDistance<=range;
        testDistance+=step
      ){
        const testPoint={
          x:actor.x+Math.cos(rayAngle)*testDistance,
          y:actor.y+Math.sin(rayAngle)*testDistance,
          r:0
        };

        if(blocked(testPoint)){
          let low=Math.max(0,testDistance-step);
          let high=testDistance;

          for(let iteration=0;iteration<4;iteration++){
            const mid=(low+high)/2;
            const point={
              x:actor.x+Math.cos(rayAngle)*mid,
              y:actor.y+Math.sin(rayAngle)*mid,
              r:0
            };

            if(blocked(point)){
              high=mid;
            }else{
              low=mid;
            }
          }

          distance=low;
          break;
        }
      }
    }

    points.push({
      x:actor.x+Math.cos(rayAngle)*distance,
      y:actor.y+Math.sin(rayAngle)*distance
    });
  }

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(actor.x,actor.y);

  for(const point of points){
    ctx.lineTo(point.x,point.y);
  }

  ctx.closePath();

  ctx.fillStyle=fillStyle;
  ctx.fill();

  ctx.strokeStyle=strokeStyle;
  ctx.stroke();

  ctx.restore();
}
const KEY_DEFINITIONS=Object.freeze({military:{name:"軍用鍵"},research:{name:"研究施設鍵"},factory:{name:"工場鍵"},storage:{name:"倉庫鍵"},security:{name:"保安区画鍵"},special:{name:"特殊区画鍵"}});const MAX_PERSISTENT_KEYS=3;function keyDefinition(id){return KEY_DEFINITIONS[id]||null;}function isKeyItem(item){return item?.kind==="key"&&!!keyDefinition(item.keyType);}function createKeyItem(keyType){const d=keyDefinition(keyType);if(!d)return null;return {name:d.name,kind:"key",keyType,gridW:1,gridH:1,slots:1,weight:0};}function hasRaidKey(keyType){return Array.isArray(player.raidKeys)&&player.raidKeys.includes(keyType);}function prepareRaidKeys(){const stored=Array.isArray(save.keys)?save.keys:[];const normalized=stored.filter(keyDefinition).slice(0,MAX_PERSISTENT_KEYS);save.keys=normalized;player.raidKeys=normalized.slice();}function assignLockedBuildings(buildings,rng){const ids=Object.keys(KEY_DEFINITIONS);const count=buildings.length?1+Math.floor(rng()*Math.min(3,buildings.length)):0;const pool=buildings.slice();for(let i=0;i<count;i++){const bi=Math.floor(rng()*pool.length);const b=pool.splice(bi,1)[0];const ki=Math.floor(rng()*ids.length);const keyType=ids.splice(ki,1)[0];b.locked=true;b.keyType=keyType;b.door.locked=true;b.door.unlocked=false;}}function unlockBuilding(building){if(!building?.locked)return true;if(building.door.unlocked)return true;if(!hasRaidKey(building.keyType)){logMessage((keyDefinition(building.keyType)?.name||"鍵")+"が必要です");return false;}building.door.unlocked=true;logMessage(building.name+"の鍵を開けました");return true;}function addRareKeyLoot(loot){if(Math.random()>=0.015)return;const ids=Object.keys(KEY_DEFINITIONS);const keyType=ids[Math.floor(Math.random()*ids.length)];const key=createKeyItem(keyType);if(key)loot.push(key);}function addLockedAreaLoot(container,loot){
  const building=
    world?.buildings?.find(
      b=>b.id===container?.buildingId
    );

  if(!building?.locked)return;

  const roll=Math.random();

  if(roll<0.45)return;

  if(roll<0.75){
    loot.push(
      Math.random()<0.65
        ?{
          type:"部品",
          kind:"loot",
          value:0,
          slots:1
        }
        :{
          type:"貴重品",
          kind:"loot",
          value:0,
          slots:2
        }
    );
    return;
  }

  if(roll<0.96){
    const pool=[
      "防護ベスト",
      "防護ヘルメット",
      "防護ブーツ",
      "タクティカルバックパック",
      "大型バックパック"
    ];

    const item=catalogItem(
      pool[
        Math.floor(
          Math.random()*pool.length
        )
      ]
    );

    if(item)loot.push(item);
    return;
  }

  if(roll<0.995){
    const pool=[
      "防護ベスト",
      "防護ヘルメット",
      "大型バックパック"
    ];

    const item=catalogItem(
      pool[
        Math.floor(
          Math.random()*pool.length
        )
      ]
    );

    if(item)loot.push(item);
    return;
  }

  const jackpot=
    Math.random()<0.5
      ?catalogItem("防護ベスト")
      :catalogItem("大型バックパック");

  if(jackpot){
    loot.push(jackpot);
  }
}

function generateWorld(){
  const seed=randomSeed();
  const rng=mulberry32(seed);

  const walls=[
    {x:0,y:0,w:WORLD_W,h:18},
    {x:0,y:WORLD_H-18,w:WORLD_W,h:18},
    {x:0,y:0,w:18,h:WORLD_H},
    {x:WORLD_W-18,y:0,w:18,h:WORLD_H}
  ];

  const buildings=[];
  const occupied=[];

  const attempts=110;

  for(let i=0;i<attempts && buildings.length<12;i++){
    const w=120+Math.floor(rng()*100);
    const h=95+Math.floor(rng()*80);
    const x=45+Math.floor(rng()*(WORLD_W-w-90));
    const y=35+Math.floor(rng()*(WORLD_H-h-70));

    const r={
      x:x-18,
      y:y-18,
      w:w+36,
      h:h+36
    };

    if(
      pointInRect(60,270,r) ||
      pointInRect(exit.x,exit.y,r) ||
      occupied.some(o =>
        o.x<r.x+r.w &&
        o.x+o.w>r.x &&
        o.y<r.y+r.h &&
        o.y+o.h>r.y
      )
    ){
      continue;
    }

    const doorSide=rng()>0.5?"bottom":"right";

    let door;

    if(doorSide==="bottom"){
      door={
        x:x+w/2-24,
        y:y+h-8,
        w:48,
        h:24
      };
    }else{
      door={
        x:x+w-8,
        y:y+h/2-24,
        w:24,
        h:48
      };
    }

    buildings.push({
      id:i,
      name:[
        "倉庫","民家","事務所","整備室","施設",
        "工場","研究棟","店舗","住宅","格納庫",
        "診療所","管理棟"
      ][buildings.length],
      x,y,w,h,
      door,
      color:[
        "#554d45","#5a5146","#4c5058","#4d5054","#55504a",
        "#514b46","#4d5358","#5a5048","#554c49","#4b5052",
        "#55514d","#4e5048"
      ][buildings.length]
    });

    occupied.push(r);
  }

  assignLockedBuildings(buildings,rng);

  return {
    seed,
    walls,
    buildings
  };
}

function applyEFRClassBonuses(){
  const magic=window.EFRMagic;
  if(!magic?.applyClassPlayerBonuses)return;

  magic.applyClassPlayerBonuses(player,save);

  const b=player.classBonus||{};

  player.speed=(player.baseSpeed||185)*b.speedMultiplier;

  player.maxMP=(player.baseMaxMP||100)+b.maxMPBonus;
  player.mp=Math.min(player.mp,player.maxMP);

  const baseCapacity=player.baseBackpackCapacity||4;
  player.backpackCapacity=baseCapacity+b.backpackCapacityBonus;

  refreshBackpackCapacity();
}

function generateRaid(){
  world=generateWorld();
  prepareRaidKeys();

  applyCharacterGrowth();
  applyEFRClassBonuses();

  player.x=RAID_START_POSITION.x;
  player.y=RAID_START_POSITION.y;
  player.hp=player.maxHp||100;
  player.mp=player.maxMP||100;
  player.casting=false;

  window.EFRPet?.prepareRaid?.();

  // 拠点で選択した持込品を出撃開始時に維持する。
  player.loot=Array.isArray(player.loot)
    ? player.loot.map(item=>cloneItem(item))
    : [];

  player.inside=null;
  window.EFRPet?.prepareWildEncounter?.();
  camera.x=0;
  camera.y=0;
  updateCamera();
  refreshBackpackCapacity();

  efrSetAim(1,0);

  damageTimer=0;
  attackTimer=0;
  attackFlash=0;

  const rng=mulberry32(world.seed+777);

  items=[];
  enemies=[];
  containers=[];
  openContainer=null;
  openLoot=[];
  interactionTarget=null;

  const weaponData=[
    catalogLootItem("ナイフ"),
    catalogLootItem("鉄パイプ")
  ];

  const armorData=[
    catalogLootItem("軽量アーマー"),
    catalogLootItem("防護ベスト"),
    catalogLootItem("軽量ヘルメット"),
    catalogLootItem("防護ヘルメット"),
    catalogLootItem("軽量ブーツ"),
    catalogLootItem("防護ブーツ")
  ];

  for(let i=0;i<world.buildings.length;i++){
    const b=world.buildings[i];

    const containerTypes=["棚","机","箱","ロッカー","工具箱","キャビネット","車"];

    const containerCount=1+(rng()>.55?1:0);

    for(let c=0;c<containerCount;c++){
      const type=c===0
        ? "棚"
        : containerTypes[(i+c)%containerTypes.length];

      const isCar=type==="車";

      containers.push({
        id:"container-"+i+"-"+c,
        type,
        x:isCar
          ? Math.max(34,Math.min(WORLD_W-34,b.x+(i%2===0?b.w+24:-24)))
          : b.x+28+rng()*Math.max(20,b.w-56),
        y:isCar
          ? Math.max(34,Math.min(WORLD_H-34,b.y+b.h/2+rng()*34-17))
          : b.y+28+rng()*Math.max(20,b.h-56),
        buildingId:isCar ? null : b.id,
        searched:false,
        loot:null,
        preloadedLoot:[]
      });
    }

    // 地面に直接落ちているアイテムは例外的に発生させる。
    // 通常の探索報酬はコンテナ側へ寄せる。
    if(rng()<.10){
      const looseRoll=rng();

      if(looseRoll<.34){
        const w=weaponData[i%weaponData.length];

        items.push({
          ...cloneItem(w),
          x:b.x+30+rng()*(b.w-60),
          y:b.y+30+rng()*(b.h-60),
          buildingId:b.id,
          taken:false
        });
      }else if(looseRoll<.67){
        const a=armorData[i%armorData.length];

        items.push({
          ...cloneItem(a),
          x:b.x+45+rng()*(b.w-90),
          y:b.y+45+rng()*(b.h-90),
          buildingId:b.id,
          taken:false
        });
      }else{
        items.push({
          x:b.x+40+rng()*(b.w-80),
          y:b.y+40+rng()*(b.h-80),
          type:"回復薬",
          kind:"heal",
          value:25,
          buildingId:b.id,
          taken:false
        });
      }
    }

    enemies.push({
      x:b.x+b.w/2,
      y:b.y+b.h/2,
      r:15,
      hp:55+Math.floor(rng()*35),
      maxHp:90,
      speed:42+rng()*18,
      buildingId:b.id,
      visualType:rng()>.72 ? "arcane" : "human",
      facingX:1,
      facingY:0,
      alerted:false,
      lastSeenX:null,
      lastSeenY:null,
      searchTimer:0,
      alertX:null,
      alertY:null,
      alertConfidence:0,
      alertTimer:0,
      alertRole:null,
      alertSource:null,
      alertShareTimer:0
    });
  }

  for(let i=0;i<2;i++){
    enemies.push({
      x:180+rng()*(WORLD_W-360),
      y:80+rng()*(WORLD_H-160),
      r:15,
      hp:60,
      maxHp:60,
      speed:45+rng()*12,
      buildingId:null,
      visualType:rng()>.72 ? "arcane" : "human",
      facingX:1,
      facingY:0,
      alerted:false,
      lastSeenX:null,
      lastSeenY:null,
      searchTimer:0,
      alertX:null,
      alertY:null,
      alertConfidence:0,
      alertTimer:0,
      alertRole:null,
      alertSource:null,
      alertShareTimer:0
    });
  }

  mapInfoEl.textContent =
    "Map Seed: " + world.seed +
    "　建物 " + world.buildings.length +
    "棟　毎回ランダム生成";
}

function equippedWeapon(slot=activeWeaponSlot){
  const w=save.equipment["weapon"+slot];

  if(!w || w.kind==="pet"){
    return {
      name:"素手",
      damage:10,
      range:38,
      cooldown:.45,
      knockback:0,
      kind:"weapon",
      slots:1
    };
  }

  ensureWeaponProgression(w);

  const definition=
    equipmentCatalog.find(item =>
      item.kind==="weapon" &&
      item.name===w.name
    );

  const result=definition
    ? {...definition,...w}
    : {
        ...w,
        cooldown:w.cooldown || .35,
        knockback:w.knockback || 0
      };

  ensureWeaponProgression(result);

  if(result.kind==="firearm"){
    window.EFRBaseParts?.normalizeWeapon?.(result);
  }else{
    applyWeaponProgression(result);
  }

  return result;
}

function equippedArmor(){
  const durability=window.EFRDurability;

  ["head","chest","legs"].forEach(slot=>{
    const armor=save.equipment?.[slot];
    if(armor){
      ensureArmorProgression(armor);
      applyArmorProgression(armor);
    }
  });

  if(durability?.getArmorReduction){
    return {
      name:"防具",
      reduction:durability.getArmorReduction()
    };
  }

  return {
    name:"防具",
    reduction:
      (save.equipment.head?.reduction || 0)+
      (save.equipment.chest?.reduction || 0)+
      (save.equipment.legs?.reduction || 0)
  };
}

function equippedBackpack(){
  const backpack=save.equipment.backpack || {
    name:"バックパックなし",
    baseCapacity:0,
    capacity:0,
    kind:"backpack",
    slotType:"backpack",
    slots:0,
    rarity:1
  };

  ensureBackpackProgression(backpack);
  applyBackpackProgression(backpack);

  return backpack;
}

function refreshBackpackCapacity(){
  const backpack=equippedBackpack();
  const skillBonus=
    Math.max(
      0,
      Number(save.player?.skills?.exploration||0)
    );

  const equipmentCapacity=
    Number(backpack.capacity || 0);

  player.backpackCapacity=
    Math.max(4,equipmentCapacity)+
    skillBonus+
    Math.max(
      0,
      Number(player.petCarryBonus||0)
    );

  // マス容量とは別に、装備・携行品全体の重量上限を持つ。
  // バッグ容量1マスにつき2kgを基準とし、最低20kgを確保する。
  // 荷運び上手は容量とは独立した重量上限ボーナスとして加算する。
  player.backpackWeightCapacity=
    Math.max(
      20,
      player.backpackCapacity*2+
      Math.max(
        0,
        Number(player.petWeightBonus||0)
      )
    );
}

function equipmentSlotForItem(item){
  if(item?.kind==="pet"){
    return save.player?.classId==="trainer"
      ? "weapon"
      : null;
  }

  if(
    item.kind==="weapon" ||
    item.kind==="firearm" ||
    item.magicStaff
  ){
    return "weapon";
  }

  if(item.kind==="armor")return item.slotType || "chest";
  if(item.kind==="backpack")return "backpack";

  return null;
}

function cloneItem(item){
  return item ? JSON.parse(JSON.stringify(item)) : null;
}

function equipItem(item){
  const slot=equipmentSlotForItem(item);
  if(!slot)return false;

  const itemIndex=player.loot.indexOf(item);

  if(itemIndex<0){
    logMessage("装備対象がバッグにありません");
    return false;
  }

  if(item.kind==="pet"){
    if(save.player?.classId!=="trainer"){
      logMessage("ペットを装備できるのは調教師だけです");
      return false;
    }

    const target=
      "weapon"+activeWeaponSlot;

    if(!["weapon1","weapon2"].includes(target)){
      return false;
    }

    const old=save.equipment[target];

    if(old?.kind==="pet"){
      const oldPet=
        window.EFRPet?.getAnimalById?.(old.petId);

      if(oldPet){
        player.loot.push({
          kind:"pet",
          petId:oldPet.id,
          name:oldPet.name,
          type:oldPet.type,
          gridW:2,
          gridH:2,
          slots:4,
          weight:0
        });
      }
    }else if(old){
      player.loot.push(cloneItem(old));
    }

    const equipped=
      window.EFRPet?.equipAnimal?.(
        item.petId,
        target
      );

    if(!equipped){
      if(old){
        player.loot.pop();
      }
      return false;
    }

    player.loot.splice(itemIndex,1);

    refreshBackpackCapacity();
    persist();
    renderInventory();

    return true;
  }

  if(slot==="backpack"){
    const old=save.equipment.backpack;

    ensureBackpackProgression(item);
    applyBackpackProgression(item);

    const newCapacity=
      Math.max(4,Number(item.capacity || 0));

    const remainingLoot=
      player.loot.filter((_,index)=>index!==itemIndex);

    const usedAfterSwap=
      inventoryGridUsed(remainingLoot)+
      inventoryGridUsed(old ? [old] : []);

    if(usedAfterSwap>newCapacity){
      logMessage("現在の荷物が新しいバッグに収まりません");
      return false;
    }

    save.equipment.backpack=cloneItem(item);
    player.loot.splice(itemIndex,1);

    if(old){
      player.loot.push(cloneItem(old));
    }

    refreshBackpackCapacity();
    localStorage.setItem("efr-save",JSON.stringify(save));
    renderInventory();
    return true;
  }

  let target=slot;

  if(slot==="weapon"){
    target="weapon"+activeWeaponSlot;
  }

  const old=save.equipment[target];

  const remainingLoot=
    player.loot.filter((_,index)=>index!==itemIndex);

  const usedAfterSwap=
    inventoryGridUsed(remainingLoot)+
    inventoryGridUsed(old ? [old] : []);

  if(usedAfterSwap>player.backpackCapacity){
    logMessage("装備を交換するとバッグが満杯になります");
    return false;
  }

  save.equipment[target]=cloneItem(item);
  player.loot.splice(itemIndex,1);

  if(old){
    player.loot.push(cloneItem(old));
  }

  refreshBackpackCapacity();
  localStorage.setItem("efr-save",JSON.stringify(save));
  renderInventory();
  return true;
}

function equipLootItemFromSource(item){
  const source=openContainer;

  if(
    !source ||
    !Array.isArray(source.loot)
  ){
    return false;
  }

  const sourceIndex=source.loot.indexOf(item);

  if(sourceIndex<0){
    return false;
  }

  const temporaryItem=cloneItem(item);
  player.loot.push(temporaryItem);

  if(!equipItem(temporaryItem)){
    const rollbackIndex=player.loot.indexOf(temporaryItem);

    if(rollbackIndex>=0){
      player.loot.splice(rollbackIndex,1);
    }

    return false;
  }

  source.loot.splice(sourceIndex,1);

  const openIndex=openLoot.indexOf(item);

  if(openIndex>=0){
    openLoot.splice(openIndex,1);
  }

  source.revealedLootCount=Math.max(
    0,
    Math.min(
      source.loot.filter(Boolean).length,
      (Number(source.revealedLootCount)||0)-1
    )
  );

  persist();
  renderInventory();
  renderLootPanel();

  return true;
}

function toggleWeaponSlot(slot){
  if(slot!==1 && slot!==2)return;
  activeWeaponSlot=slot;
  renderInventory();
}
function currentBuilding(){
  if(!world)return null;

  return world.buildings.find(b =>
    pointInRect(
      player.x,
      player.y,
      {
        x:b.x+10,
        y:b.y+10,
        w:b.w-20,
        h:b.h-20
      }
    )
  ) || null;
}

function buildingBlocked(c,b){
  const outer={
    x:b.x,
    y:b.y,
    w:b.w,
    h:b.h
  };

  if(!rectHitCircle(c,outer))return false;

  const inner={
    x:b.x+15,
    y:b.y+15,
    w:b.w-30,
    h:b.h-30
  };

  const innerSafe={
    x:inner.x-c.r,
    y:inner.y-c.r,
    w:inner.w+c.r*2,
    h:inner.h+c.r*2
  };

  if(pointInRect(c.x,c.y,innerSafe)){
    return false;
  }

  const door={
    x:b.door.x-c.r-2,
    y:b.door.y-c.r-2,
    w:b.door.w+c.r*2+4,
    h:b.door.h+c.r*2+4
  };

  if(pointInRect(c.x,c.y,door)){
    if(b.locked && !b.door.unlocked)return true;
    return false;
  }

  return true;
}

function blocked(c){
  if(world.walls.some(w=>rectHitCircle(c,w))){
    return true;
  }

  for(const b of world.buildings){
    if(buildingBlocked(c,b)){
      return true;
    }
  }

  return false;
}

function movePlayer(dx,dy,dt){
  if(player.casting)return;
  let nx=player.x+dx*dt;
  let ny=player.y+dy*dt;

  let test={
    x:nx,
    y:player.y,
    r:player.r
  };

  if(!blocked(test)){
    player.x=nx;
  }

  test={
    x:player.x,
    y:ny,
    r:player.r
  };

  if(!blocked(test)){
    player.y=ny;
  }

  player.x=Math.max(25,Math.min(WORLD_W-25,player.x));
  player.y=Math.max(25,Math.min(WORLD_H-25,player.y));
}


const INVENTORY_GRID_SPECS=Object.freeze({
  // 近接武器
  "ナイフ":[1,2],
  "鉄パイプ":[1,3],
  "バット":[1,3],
  "ハンマー":[1,3],
  "手斧":[1,3],
  "マチェット":[1,3],

  // 銃器
  "ハンドガン":[2,2],
  "SMG":[2,3],
  "ショットガン":[1,4],
  "アサルトライフル":[2,4],
  "マークスマンライフル":[2,4],
  "スナイパーライフル":[2,5],
  "ボルトアクション":[2,5],

  // 弓・魔法
  "狩猟弓":[2,4],
  "コンポジットボウ":[2,4],
  "魔法の杖":[1,3],

  // ヘルメット
  "簡易ヘルメット":[2,2],
  "軽量ヘルメット":[2,2],
  "防護ヘルメット":[2,2],
  "戦術ヘルメット":[2,2],

  // 胴防具
  "軽量アーマー":[3,2],
  "防護ベスト":[3,2],
  "戦闘アーマー":[3,3],

  // 脚防具
  "軽量ブーツ":[2,2],
  "防護ブーツ":[2,2],
  "戦術ブーツ":[2,2],

  // バッグ（装備時容量とは独立した倉庫占有サイズ）
  "小型バックパック":[2,2],
  "タクティカルバックパック":[2,3],
  "大型バックパック":[3,3],

  // HP回復
  "応急包帯":[1,1],
  "医療キット":[1,2],
  "高性能医療キット":[2,2],
  "戦闘用メディキット":[2,2],
  "完全回復剤":[2,2],

  // MP回復
  "微量魔力薬":[1,1],
  "魔力回復薬":[1,2],
  "高濃度魔力薬":[2,2],
  "精製魔力エリクサー":[2,2],
  "超濃縮魔力剤":[2,2],

  // 弾薬
  "9mm弾":[1,1],
  "9mm":[1,1],
  "12ゲージ弾":[1,1],
  "12ゲージ":[1,1],
  "5.56mm弾":[1,1],
  "5.56mm":[1,1],
  "7.62mm弾":[1,1],
  "7.62mm":[1,1],
  "矢":[1,1],

  // 素材（素材ごとに個別の倉庫・バッグ占有形状を定義）
  "鉄くず":[1,2],
  "木材":[1,3],
  "布":[1,1],
  "革":[1,2],
  "ボルト":[1,1],
  "ネジ":[1,1],
  "電子部品":[1,1],
  "バッテリー":[1,2],
  "ケーブル":[1,3],
  "ガラス":[2,2],
  "プラスチック":[1,1],
  "医療素材":[1,1],
  "火薬":[1,1],
  "接着剤":[1,1],
  "高品質金属":[1,1],

  // 追加素材
  "銅線":[1,2],
  "アルミ片":[1,1],
  "ゴム片":[1,1],
  "金属板":[2,1],
  "金属パイプ":[1,2],
  "歯車":[1,1],
  "スプリング":[1,1],
  "軸受":[1,1],
  "モーター":[2,1],
  "精密部品":[1,1],
  "センサー":[1,1],
  "光学部品":[1,1],
  "マイクロチップ":[1,1],
  "半導体":[1,1],
  "トランジスタ":[1,1],
  "ヒューズ":[1,1],
  "電池セル":[1,1],
  "絶縁材":[1,1],
  "コネクタ":[1,1],
  "レンズ":[1,1],
  "研磨材":[1,1],
  "化学薬品":[1,1],
  "試薬":[1,1],
  "サンプル容器":[1,1],
  "滅菌ガーゼ":[1,1],
  "医療テープ":[1,1],
  "樹脂":[1,1],
  "繊維":[1,1],
  "強化布":[1,1],
  "合成皮革":[1,2],
  "木材接着剤":[1,1],
  "工具鋼":[1,1],

  // 中間素材
  "加工金属":[1,2],
  "回路基板":[2,1],
  "医療キット素材":[1,1],
  "絶縁配線":[1,2],
  "金属部品":[1,1],
  "精密機械部品":[1,1],
  "駆動ユニット":[2,1],
  "電子制御部品":[1,1],
  "センサーユニット":[1,1],
  "光学ユニット":[1,1],
  "高性能電池":[1,2],
  "化学試薬セット":[1,1],
  "医療繊維素材":[1,1],
  "合成補強材":[1,1],
  "強化素材":[1,2],

  // 修理・戦利品
  "修理キット・改":[2,1],
  "貴重品":[2,1],

  // 設計図
  "設計図":[1,1]
});

function inventoryGridSpec(item){
  const explicitW=Number(item?.gridW);
  const explicitH=Number(item?.gridH);

  if(
    Number.isFinite(explicitW) &&
    Number.isFinite(explicitH) &&
    explicitW>=1 &&
    explicitH>=1
  ){
    return [
      Math.max(1,Math.floor(explicitW)),
      Math.max(1,Math.floor(explicitH))
    ];
  }

  const key=String(item?.name || item?.type || "");

  if(item?.kind==="pet"){
    return [2,2];
  }

  const named=INVENTORY_GRID_SPECS[key];

  if(named){
    return named;
  }

  if(item?.kind==="ammo" || item?.kind==="blueprint"){
    return [1,1];
  }

  if(item?.kind==="material" || item?.kind==="loot"){
    return [1,1];
  }

  const area=Math.max(
    1,
    Math.floor(Number(item?.slots||1))
  );

  if(area===1)return [1,1];
  if(area===2)return [2,1];
  if(area===3)return [3,1];
  if(area===4)return [2,2];
  if(area===5)return [5,1];
  if(area===6)return [3,2];
  if(area===7)return [7,1];
  if(area===8)return [4,2];
  if(area===9)return [3,3];
  if(area===10)return [5,2];

  const width=Math.min(
    6,
    Math.max(1,Math.ceil(Math.sqrt(area)))
  );

  return [
    width,
    Math.ceil(area/width)
  ];
}

function inventoryGridSize(item){
  const [w,h]=inventoryGridSpec(item);

  if(
    item &&
    (
      !Number.isFinite(Number(item.gridW)) ||
      !Number.isFinite(Number(item.gridH))
    )
  ){
    item.gridW=w;
    item.gridH=h;
  }

  // slotsは既存のクラフト・容量・互換処理で使用されるため、
  // グリッド形状の正規化によって上書きしない。
  // グリッド占有マスは常に gridW × gridH から算出する。
  return [w,h];
}

function inventoryGridColumns(capacity){
  const c=Math.max(
    1,
    Math.floor(Number(capacity)||1)
  );

  // 初期容量4は縦画面で2×2として表示する。
  if(c<=4)return 2;
  if(c<=7)return c;
  if(c<=12)return 6;
  return 8;
}

function inventoryGridCanPlace(placed,item,x,y,columns,capacity){
  const [w,h]=inventoryGridSize(item);
  if(x<0||y<0||x+w>columns)return false;
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(yy*columns+xx>=capacity)return false;
  return !(Array.isArray(placed)?placed:[]).some(other=>{
    const [ow,oh]=inventoryGridSize(other);
    return !(x+w<=Number(other.gridX||0)||Number(other.gridX||0)+ow<=x||y+h<=Number(other.gridY||0)||Number(other.gridY||0)+oh<=y);
  });
}

function inventoryGridPack(items,capacity){
  const list=Array.isArray(items)?items:[];const cap=Math.max(1,Math.floor(Number(capacity)||1));const columns=inventoryGridColumns(cap);
  if(inventoryGridUsed(list)>cap)return null;
  const work=list.map((item,index)=>({item:Object.assign({},item),index}));
  work.forEach(e=>inventoryGridSize(e.item));
  work.sort((a,b)=>{const [aw,ah]=inventoryGridSize(a.item),[bw,bh]=inventoryGridSize(b.item);return bw*bh-aw*ah||Math.max(bw,bh)-Math.max(aw,ah)||a.index-b.index;});
  const placed=[],positions=Array(list.length),memo=new Set(),rows=Math.ceil(cap/columns);
  function key(depth){return depth+"|"+placed.map(e=>`${e.x},${e.y},${e.w},${e.h}`).sort().join(";");}
  function search(depth){
    if(depth===work.length)return true;
    const k=key(depth);if(memo.has(k))return false;memo.add(k);
    const e=work[depth],[w,h]=inventoryGridSize(e.item);
    for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
      if(!inventoryGridCanPlace(placed,e.item,x,y,columns,cap))continue;
      placed.push({x,y,w,h,index:e.index});positions[e.index]={x,y};
      if(search(depth+1))return true;placed.pop();
    }
    return false;
  }
  return search(0)?positions:null;
}

function inventoryGridLayout(items,capacity){
  const list=Array.isArray(items)?items:[];const cap=Math.max(1,Math.floor(Number(capacity)||1));const columns=inventoryGridColumns(cap);
  const valid=list.every((item,index)=>inventoryGridCanPlace(list.slice(0,index),item,Number(item?.gridX),Number(item?.gridY),columns,cap));
  if(valid)return {changed:false,columns,rows:Math.max(Math.ceil(cap/columns),...list.map(item=>Number(item.gridY||0)+inventoryGridSize(item)[1]))};
  const packed=inventoryGridPack(list,cap);if(!packed)throw new Error("GRID_LAYOUT_FAILED");
  let changed=false;list.forEach((item,i)=>{const pos=packed[i];if(Number(item.gridX)!==pos.x||Number(item.gridY)!==pos.y){item.gridX=pos.x;item.gridY=pos.y;changed=true;}});
  return {changed,columns,rows:Math.max(Math.ceil(cap/columns),...list.map(item=>Number(item.gridY||0)+inventoryGridSize(item)[1]))};
}

function inventoryGridUsed(items){
  return (Array.isArray(items)?items:[])
    .reduce((total,item)=>{
      const [w,h]=inventoryGridSize(item);
      return total+(w*h);
    },0);
}

function inventoryGridMove(items,capacity,index,x,y){
  const list=Array.isArray(items)?items:[];const item=list[index];if(!item)return false;
  const cap=Math.max(1,Math.floor(Number(capacity)||1)),columns=inventoryGridColumns(cap),targetX=Math.floor(Number(x)),targetY=Math.floor(Number(y));
  if(!Number.isFinite(targetX)||!Number.isFinite(targetY))return false;
  const original={x:item.gridX,y:item.gridY},others=list.filter((_,i)=>i!==index);
  if(inventoryGridCanPlace(others,item,targetX,targetY,columns,cap)){
    if(Number(item.gridX)===targetX&&Number(item.gridY)===targetY)return false;
    item.gridX=targetX;item.gridY=targetY;return true;
  }
  const clones=list.map(source=>Object.assign({},source));clones[index].gridX=targetX;clones[index].gridY=targetY;
  const packed=inventoryGridPack(clones,cap);
  if(!packed){item.gridX=original.x;item.gridY=original.y;inventoryGridFlash();return false;}
  list.forEach((source,i)=>{source.gridX=packed[i].x;source.gridY=packed[i].y;});return true;
}

function inventoryGridCanFit(items,capacity){const clones=(Array.isArray(items)?items:[]).map(item=>Object.assign({},item));try{inventoryGridLayout(clones,capacity);return true;}catch(error){return false;}}
function inventoryGridFlash(){const target=document.querySelector(".efrSlotItem.efrSelected,.loadoutSlot.efrSelected,.efrPetCageCard.efrSelected,.loadoutKeySlot.efrSelected");if(!target)return;target.classList.remove("efrPlacementFailed");void target.offsetWidth;target.classList.add("efrPlacementFailed");window.setTimeout(()=>target.classList.remove("efrPlacementFailed"),1000);}
function inventoryGridAdd(items,item,capacity,x,y){const list=Array.isArray(items)?items:[];if(!item)return false;list.push(item);let ok=false;if(Number.isFinite(Number(x))&&Number.isFinite(Number(y)))ok=inventoryGridMove(list,capacity,list.length-1,x,y);else if(inventoryGridCanFit(list,capacity)){inventoryGridLayout(list,capacity);ok=true;}if(!ok){list.pop();inventoryGridFlash();}return ok;}

function renderInventoryGrid(
  items,
  capacity,
  renderItem,
  options={}
){
  const list=Array.isArray(items)?items:[];
  const cap=Math.max(
    1,
    Math.floor(Number(capacity)||1)
  );

  const layout=
    options.layout===false
      ? {
          changed:false,
          columns:inventoryGridColumns(cap),
          rows:Math.ceil(
            cap/inventoryGridColumns(cap)
          )
        }
      : inventoryGridLayout(list,cap);

  const cells=Array.from(
    {length:cap},
    (_,index)=>{
      const x=index%layout.columns;
      const y=Math.floor(index/layout.columns);

      return `
        <button
          type="button"
          class="efrSlotCell"
          data-grid-cell-x="${x}"
          data-grid-cell-y="${y}"
          aria-label="マス ${x+1},${y+1}"
          style="
            grid-column:${x+1};
            grid-row:${y+1};
          "
        ></button>
      `;
    }
  ).join("");

  const cards=list.map((item,index)=>{
    const [w,h]=inventoryGridSize(item);
    const x=Number(item.gridX||0);
    const y=Number(item.gridY||0);

    return `
      <article
        class="efrSlotItem"
        data-grid-item-index="${
          options.indexMap?.[index] ?? index
        }"
        style="
          grid-column:${x+1}/span ${w};
          grid-row:${y+1}/span ${h};
        "
      >
        ${renderItem(item,index,{x,y,w,h})}
      </article>
    `;
  }).join("");

  return {
    changed:layout.changed,
    used:inventoryGridUsed(list),
    html:`
      <div
        class="efrSlotGrid"
        style="
          --efr-grid-cols:${layout.columns};
          --efr-grid-rows:${layout.rows};
        "
      >
        ${cells}
        ${cards}
      </div>
    `
  };
}

window.EFRGrid={
  size:inventoryGridSize,
  columns:inventoryGridColumns,
  layout:inventoryGridLayout,
  used:inventoryGridUsed,
  canFit:inventoryGridCanFit,
  add:inventoryGridAdd,
  move:inventoryGridMove,
  flash:inventoryGridFlash,
  render:renderInventoryGrid
};

const ITEM_WEIGHT_SPECS=Object.freeze({
  "ナイフ":0.8,
  "鉄パイプ":1.8,
  "バット":2.2,
  "ハンマー":2.8,
  "手斧":2.5,
  "マチェット":2.0,

  "ハンドガン":1.4,
  "SMG":2.8,
  "ショットガン":4.2,
  "アサルトライフル":3.6,
  "マークスマンライフル":4.4,
  "スナイパーライフル":6.2,
  "ボルトアクション":6.8,

  "狩猟弓":1.8,
  "コンポジットボウ":2.4,
  "魔法の杖":2.0,

  "簡易ヘルメット":1.5,
  "軽量ヘルメット":1.5,
  "防護ヘルメット":2.0,
  "戦術ヘルメット":2.2,

  "軽量アーマー":3.0,
  "防護ベスト":4.0,
  "戦闘アーマー":5.0,

  "軽量ブーツ":1.0,
  "防護ブーツ":1.5,
  "戦術ブーツ":2.0,

  "小型バックパック":2.0,
  "タクティカルバックパック":3.0,
  "大型バックパック":4.0,

  "応急包帯":0.4,
  "医療キット":0.6,
  "高性能医療キット":0.8,
  "戦闘用メディキット":1.0,
  "完全回復剤":1.2,

  "微量魔力薬":0.4,
  "魔力回復薬":0.5,
  "高濃度魔力薬":0.8,
  "精製魔力エリクサー":1.0,
  "超濃縮魔力剤":1.0
});

const AMMO_STACK_LIMITS=Object.freeze({
  "9mm":60,
  "12ゲージ":60,
  "5.56mm":60,
  "7.62mm":60,
  "矢":30
});

const AMMO_UNIT_WEIGHTS=Object.freeze({
  "9mm":0.008,
  "12ゲージ":0.035,
  "5.56mm":0.012,
  "7.62mm":0.025,
  "矢":0.020
});

function ammoStackLimit(item){
  if(item?.kind!=="ammo")return 0;
  return Number(AMMO_STACK_LIMITS[item.name]||0);
}

function ammoUnitWeight(item){
  if(item?.kind!=="ammo")return 0;
  return Number(AMMO_UNIT_WEIGHTS[item.name]||0);
}

function normalizeAmmoAmount(item){
  return Math.max(
    0,
    Math.floor(Number(item?.amount)||0)
  );
}

function itemWeight(item){
  if(!item)return 0;

  if(item.kind==="ammo"){
    const amount=normalizeAmmoAmount(item);
    const unit=ammoUnitWeight(item);

    if(unit>0){
      return amount*unit;
    }

    const explicit=Number(item.weight);
    return Number.isFinite(explicit) && explicit>0
      ? explicit
      : 0.25;
  }

  const explicit=Number(item.weight);

  if(
    Number.isFinite(explicit) &&
    explicit>0
  ){
    return explicit;
  }

  const key=String(
    item.name ||
    item.type ||
    ""
  );

  const named=ITEM_WEIGHT_SPECS[key];

  if(Number.isFinite(named)){
    return named;
  }

  if(item.kind==="pet")return 0;
  if(item.kind==="key")return 0;
  if(item.kind==="blueprint")return 0.2;
  if(item.kind==="heal")return 0.5;
  if(item.kind==="mpRestore")return 0.5;
  if(item.kind==="material")return 0.5;
  if(item.kind==="loot")return 1;
  if(item.kind==="repair")return 0.8;
  if(item.kind==="weapon" || item.kind==="firearm")return 2;
  if(item.kind==="armor")return 2;
  if(item.kind==="backpack")return 2;

  return 0.5;
}

function ensureItemWeight(item){
  if(!item)return item;

  if(item.kind==="ammo"){
    item.amount=normalizeAmmoAmount(item);
    const unit=ammoUnitWeight(item);
    if(unit>0){
      item.weight=item.amount*unit;
    }else if(
      !Number.isFinite(Number(item.weight)) ||
      Number(item.weight)<=0
    ){
      item.weight=0.25;
    }
    return item;
  }

  if(
    !Number.isFinite(Number(item.weight)) ||
    Number(item.weight)<=0
  ){
    item.weight=itemWeight(item);
  }

  return item;
}

function equipmentWeight(){
  return Object.values(save.equipment||{})
    .reduce(
      (total,item)=>
        total+itemWeight(item),
      0
    );
}

function backpackWeight(){
  return player.loot.reduce(
    (total,item)=>
      total+itemWeight(item),
    0
  );
}

function carriedWeight(){
  return equipmentWeight()+backpackWeight();
}

function backpackWeightCapacity(){
  refreshBackpackCapacity();

  return Math.max(
    20,
    Number(player.backpackWeightCapacity||0)
  );
}

function backpackUsed(){
  return window.EFRGrid?.used?.(player.loot) ?? player.loot.reduce((total,item)=>{
    const [w,h]=window.EFRGrid?.size?.(item) || [1,1];
    return total+(w*h);
  },0);
}

function backpackAmmoPlan(item){
  if(item?.kind!=="ammo"){
    return {
      merges:[],
      additions:item ? [cloneItem(item)] : []
    };
  }

  const limit=ammoStackLimit(item);
  const amount=normalizeAmmoAmount(item);

  if(limit<=0 || amount<=0){
    return {
      merges:[],
      additions:amount>0 ? [cloneItem(item)] : []
    };
  }

  let remaining=amount;
  const merges=[];
  const additions=[];

  for(const existing of player.loot){
    if(
      remaining<=0 ||
      existing?.kind!=="ammo" ||
      existing?.name!==item.name
    ){
      continue;
    }

    const current=Math.min(
      limit,
      normalizeAmmoAmount(existing)
    );
    const free=Math.max(0,limit-current);

    if(free<=0)continue;

    const take=Math.min(
      free,
      remaining
    );

    if(take>0){
      merges.push({item:existing,amount:take});
      remaining-=take;
    }
  }

  while(remaining>0){
    const amountForStack=Math.min(
      limit,
      remaining
    );
    const stack=cloneItem(item);
    stack.amount=amountForStack;
    delete stack.gridX;
    delete stack.gridY;
    ensureItemWeight(stack);
    additions.push(stack);
    remaining-=amountForStack;
  }

  return {merges,additions};
}

function backpackCanFit(item){
  if(!item)return false;

  refreshBackpackCapacity();
  ensureItemWeight(item);

  if(
    item.kind==="ammo" &&
    normalizeAmmoAmount(item)<=0
  ){
    return false;
  }

  if(
    carriedWeight()+itemWeight(item)>
    backpackWeightCapacity()+0.0001
  ){
    return false;
  }

  const plan=backpackAmmoPlan(item);
  const candidate=[
    ...player.loot,
    ...plan.additions
  ];

  return window.EFRGrid?.canFit?.(
    candidate,
    player.backpackCapacity
  )??false;
}

function addToBackpack(item){
  if(!item)return false;

  refreshBackpackCapacity();
  ensureItemWeight(item);

  if(
    item.kind==="ammo" &&
    normalizeAmmoAmount(item)<=0
  ){
    return false;
  }

  if(
    carriedWeight()+itemWeight(item)>
    backpackWeightCapacity()+0.0001
  ){
    logMessage("バッグの重量上限を超えています");
    return false;
  }

  const plan=backpackAmmoPlan(item);

  if(
    !(window.EFRGrid?.canFit?.(
      [...player.loot,...plan.additions],
      player.backpackCapacity
    )??false)
  ){
    window.EFRGrid?.flash?.();
    return false;
  }

  for(const merge of plan.merges){
    merge.item.amount=
      normalizeAmmoAmount(merge.item)+
      merge.amount;
    ensureItemWeight(merge.item);
  }

  for(const addition of plan.additions){
    player.loot.push(addition);
  }

  window.EFRGrid?.layout?.(
    player.loot,
    player.backpackCapacity
  );
  renderInventory();
  return true;
}

function inventoryItemName(item){
  const name=item?.name || item?.type || "不明";

  if(isWeaponItem(item)){
    ensureWeaponProgression(item);

    return name+
      " Lv."+item.weaponLevel+
      " / "+weaponRarityName(item.rarity);
  }

  if(isArmorItem(item)){
    ensureArmorProgression(item);

    return name+
      " Lv."+item.armorLevel+
      " / "+armorRarityName(item.rarity);
  }

  if(isBackpackItem(item)){
    ensureBackpackProgression(item);
    applyBackpackProgression(item);

    return name+
      " / "+backpackRarityName(item.rarity)+
      " / 容量"+item.capacity;
  }

  return name;
}

function removeInventoryItem(index){
  if(index<0 || index>=player.loot.length)return null;
  return player.loot.splice(index,1)[0];
}

function storeInventoryKey(index){
  if(running){
    logMessage("探索中は鍵を保管できません。持ち帰るまで失う可能性があります");
    return false;
  }

  const item=player.loot[index];

  if(!isKeyItem(item)){
    return false;
  }

  if(!Array.isArray(save.keys)){
    save.keys=[];
  }

  if(save.keys.length>=MAX_PERSISTENT_KEYS){
    logMessage("鍵保管は3個までです");
    return false;
  }

  player.loot.splice(index,1);
  save.keys.push(item.keyType);
  persist();
  renderInventory();
  window.EFRLoadout?.render?.();
  logMessage(item.name+"を鍵として保管しました");
  return true;
}

function useInventoryItem(index){
  const item=player.loot[index];

  if(item?.kind==="mpRestore"){
    if(player.mp>=player.maxMP){
      logMessage("MPは満タンです");
      return false;
    }

    player.mp=Math.min(
      player.maxMP,
      player.mp+(item.value||0)
    );

    removeInventoryItem(index);
    renderInventory();
    return true;
  }

  if(!item || item.kind!=="heal")return false;

  if(player.hp>=100){
    logMessage("HPは満タンです");
    return false;
  }

  player.hp=Math.min(100,player.hp+(item.value||0));
  removeInventoryItem(index);
  renderInventory();
  return true;
}


let efrItemIconInstanceId=0;

function itemIconMarkup(item,revealed=true){
  if(
    revealed &&
    item?.kind==="pet" &&
    window.EFRPet?.petIconMarkup
  ){
    return window.EFRPet.petIconMarkup(
      item,
      {size:38}
    );
  }

  if(!revealed){
    return `
      <span class="efrItemIcon efrItemIconUnknown" aria-hidden="true">
        <svg viewBox="0 0 32 32" focusable="false">
          <circle cx="16" cy="16" r="11"></circle>
          <path d="M16 10v9M16 23v1"></path>
        </svg>
      </span>
    `;
  }

  const name=String(
    item?.name ||
    item?.type ||
    ""
  );

  const exact={
    "ナイフ":"knife",
    "鉄パイプ":"pipe",
    "バット":"bat",
    "ハンマー":"hammer",
    "手斧":"axe",
    "マチェット":"machete",

    "ハンドガン":"pistol",
    "SMG":"smg",
    "ショットガン":"shotgun",
    "アサルトライフル":"rifle",
    "マークスマンライフル":"marksman",
    "スナイパーライフル":"sniper",
    "ボルトアクション":"bolt",

    "狩猟弓":"bow",
    "コンポジットボウ":"compoundBow",
    "魔法の杖":"staff",

    "簡易ヘルメット":"helmetLight",
    "軽量ヘルメット":"helmet",
    "防護ヘルメット":"helmetArmor",
    "戦術ヘルメット":"helmetTactical",

    "軽量アーマー":"armorLight",
    "防護ベスト":"vest",
    "戦闘アーマー":"armorHeavy",

    "軽量ブーツ":"bootsLight",
    "防護ブーツ":"boots",
    "戦術ブーツ":"bootsTactical",

    "小型バックパック":"packSmall",
    "タクティカルバックパック":"pack",
    "大型バックパック":"packLarge",

    "応急包帯":"bandage",
    "医療キット":"medkit",
    "高性能医療キット":"medkitPro",
    "戦闘用メディキット":"combatMedkit",
    "完全回復剤":"fullHeal",

    "微量魔力薬":"manaSmall",
    "魔力回復薬":"mana",
    "高濃度魔力薬":"manaStrong",
    "精製魔力エリクサー":"elixir",
    "超濃縮魔力剤":"manaUltra",

    "9mm弾":"ammoPistol",
    "9mm":"ammoPistol",
    "12ゲージ弾":"ammoShotgun",
    "12ゲージ":"ammoShotgun",
    "5.56mm弾":"ammo556",
    "5.56mm":"ammo556",
    "7.62mm弾":"ammo762",
    "7.62mm":"ammo762",
    "矢":"arrow",

    "鉄くず":"scrap",
    "木材":"wood",
    "布":"cloth",
    "革":"leather",
    "ボルト":"boltMaterial",
    "ネジ":"screw",
    "電子部品":"electronics",
    "バッテリー":"battery",
    "ケーブル":"cable",
    "ガラス":"glass",
    "プラスチック":"plastic",
    "医療素材":"medicalMaterial",
    "火薬":"powder",
    "接着剤":"adhesive",
    "高品質金属":"metalHigh",

    "銅線":"copper",
    "アルミ片":"aluminum",
    "ゴム片":"rubber",
    "金属板":"metalPlate",
    "金属パイプ":"metalPipe",
    "歯車":"gear",
    "スプリング":"spring",
    "軸受":"bearing",
    "モーター":"motor",
    "精密部品":"precision",
    "センサー":"sensor",
    "光学部品":"optic",
    "マイクロチップ":"chip",
    "半導体":"semiconductor",
    "トランジスタ":"transistor",
    "ヒューズ":"fuse",
    "電池セル":"cell",
    "絶縁材":"insulator",
    "コネクタ":"connector",
    "レンズ":"lens",
    "研磨材":"polish",
    "化学薬品":"chemical",
    "試薬":"reagent",
    "サンプル容器":"sample",
    "滅菌ガーゼ":"gauze",
    "医療テープ":"medicalTape",
    "樹脂":"resin",
    "繊維":"fiber",
    "強化布":"reinforcedCloth",
    "合成皮革":"syntheticLeather",
    "木材接着剤":"woodGlue",
    "工具鋼":"toolSteel",

    "加工金属":"processedMetal",
    "回路基板":"circuit",
    "医療キット素材":"medicalKitMaterial",
    "絶縁配線":"insulatedWire",
    "金属部品":"metalPart",
    "精密機械部品":"machinePart",
    "駆動ユニット":"driveUnit",
    "電子制御部品":"controlPart",
    "センサーユニット":"sensorUnit",
    "光学ユニット":"opticUnit",
    "高性能電池":"batteryPro",
    "化学試薬セット":"reagentSet",
    "医療繊維素材":"medicalFiber",
    "合成補強材":"syntheticReinforce",
    "強化素材":"reinforcedMaterial",

    "修理キット・改":"repair",
    "貴重品":"valuable",
    "設計図":"blueprint"
  };

  const key=
    exact[name] ||
    (
      item?.kind==="pet"
        ? "pet"
        : item?.kind==="key"
          ? "key"
          : item?.kind==="ammo"
            ? "ammoPistol"
            : item?.kind==="heal"
              ? "medkit"
              : item?.kind==="mpRestore"
                ? "mana"
                : item?.kind==="blueprint"
                  ? "blueprint"
                  : item?.kind==="repair"
                    ? "repair"
                    : item?.kind==="material" ||
                      item?.kind==="loot"
                      ? "material"
                      : item?.kind==="backpack"
                        ? "pack"
                        : item?.kind==="armor"
                          ? "armor"
                          : item?.kind==="firearm"
                            ? "rifle"
                            : item?.kind==="weapon"
                              ? "weapon"
                              : "item"
    );

  const shapes={
    knife:'<path d="M5 25l9-9 12-10-5 13-16 6z"/><path d="M14 16l6 6"/>',
    pipe:'<path d="M7 8h12a5 5 0 0 1 5 5v2"/><path d="M7 8v16"/>',
    bat:'<path d="M9 25l8-17 5 3-8 17z"/><path d="M10 24l4 2"/>',
    hammer:'<path d="M7 9h18"/><path d="M12 9v16"/><path d="M8 25h8"/>',
    axe:'<path d="M7 26l11-18"/><path d="M15 10c4-4 8-2 10 2-4 2-7 2-10-2z"/>',
    machete:'<path d="M6 23l9-13 12-4-8 13z"/><path d="M6 23l6 3"/>',

    pistol:'<path d="M5 11h18v7H14l-2 8H7l2-8H5z"/><path d="M20 11h7v4h-7"/>',
    smg:'<path d="M4 11h19v7H13l-2 8H7l2-8H4z"/><path d="M23 12l5 3-5 2"/>',
    shotgun:'<path d="M4 12h23v5H13l-2 8H7l2-8H4z"/><path d="M27 12V8"/>',
    rifle:'<path d="M4 13h24v4H13l-2 8H7l2-8H4z"/><path d="M19 13l3-6h5v6"/>',
    marksman:'<path d="M4 14h24v4H13l-2 7H7l2-7H4z"/><path d="M17 10h10v4H17z"/>',
    sniper:'<path d="M4 14h24v4H13l-2 7H7l2-7H4z"/><path d="M14 9h14v4H14z"/><circle cx="18" cy="11" r="2"/>',
    bolt:'<path d="M5 14h23v4H13l-2 7H7l2-7H5z"/><path d="M18 10h9M22 8v5"/>',

    bow:'<path d="M24 5c-9 4-9 18 0 22"/><path d="M24 16H7"/><path d="M7 16l4-4m-4 4l4 4"/>',
    compoundBow:'<path d="M24 5c-6 3-6 19 0 22"/><path d="M20 7c-5 4-5 14 0 18"/><path d="M23 16H7"/>',
    staff:'<path d="M9 28L21 7"/><circle cx="22" cy="6" r="4"/>',

    helmetLight:'<path d="M7 20a9 9 0 0 1 18 0v5H7z"/><path d="M7 20h20"/>',
    helmet:'<path d="M6 20a10 10 0 0 1 20 0v5H6z"/><path d="M6 20h22"/><path d="M18 12l5 5"/>',
    helmetArmor:'<path d="M5 20a11 11 0 0 1 22 0v5H5z"/><path d="M5 20h24"/><path d="M19 12l6 6"/>',
    helmetTactical:'<path d="M5 20a11 11 0 0 1 22 0v5H5z"/><path d="M5 20h24"/><path d="M16 10v9m5-7v6"/>',

    armorLight:'<path d="M10 5l6 3 6-3 4 6-4 4v12H6V15L2 11z"/><path d="M16 8v19M8 15h16"/>',
    vest:'<path d="M10 5l6 3 6-3 5 8-5 4v10H5V17l-5-4z"/><path d="M16 8v19"/>',
    armorHeavy:'<path d="M9 4l7 4 7-4 6 9-5 5v10H2V18l-5-5z"/><path d="M16 8v20m-7-8h14"/>',

    bootsLight:'<path d="M9 5h9v12l8 4v6H5v-6l4-3z"/>',
    boots:'<path d="M8 4h10v14l9 4v6H4v-6l4-4z"/><path d="M18 18h-7"/>',
    bootsTactical:'<path d="M7 3h11v15l10 4v6H3v-6l4-4z"/><path d="M18 8h6m-6 5h5"/>',

    packSmall:'<path d="M10 7a6 6 0 0 1 12 0v3h3v17H7V10h3z"/><path d="M10 15h12"/>',
    pack:'<path d="M9 6a7 7 0 0 1 14 0v3h4v18H5V9h4z"/><path d="M9 15h14m-7-8v20"/>',
    packLarge:'<path d="M8 5a8 8 0 0 1 16 0v4h5v19H3V9h5z"/><path d="M8 14h16m-8-9v23"/>',

    bandage:'<path d="M8 8h16v16H8z"/><path d="M12 16h8M16 12v8M8 12l-4 4 4 4m16-8l4 4-4 4"/>',
    medkit:'<rect x="5" y="9" width="22" height="17" rx="3"/><path d="M12 9V6h8v3m-10 8h12m-6-6v12"/>',
    medkitPro:'<rect x="4" y="8" width="24" height="19" rx="3"/><path d="M11 8V5h10v3m-12 10h14m-7-7v14"/>',
    combatMedkit:'<rect x="3" y="7" width="26" height="20" rx="3"/><path d="M10 7V4h12v3m-14 10h16m-8-8v16"/>',
    fullHeal:'<path d="M16 4c7 4 9 10 6 17-2 4-5 6-6 7-1-1-4-3-6-7-3-7-1-13 6-17z"/><path d="M16 10v10m-5-5h10"/>',

    manaSmall:'<path d="M11 5h10v4l3 4v11H8V13l3-4z"/><path d="M10 18h12"/>',
    mana:'<path d="M10 4h12v5l3 4v13H7V13l3-4z"/><path d="M9 19h14"/>',
    manaStrong:'<path d="M9 4h14v5l4 4v14H5V13l4-4z"/><path d="M8 19h16m-8-10v10"/>',
    elixir:'<path d="M11 4h10v6l4 4v12H7V14l4-4z"/><path d="M10 18h12"/>',
    manaUltra:'<path d="M10 3h12v7l4 4v14H6V14l4-4z"/><path d="M9 19h14m-7-9v10"/>',

    ammoPistol:'<path d="M10 25V9l6-4 6 4v16z"/><path d="M13 10h6m-6 4h6"/>',
    ammoShotgun:'<path d="M8 25V8h16v17z"/><path d="M8 12h16m-8-4v17"/>',
    ammo556:'<path d="M10 25V7l6-3 6 3v18z"/><path d="M13 10h6m-6 5h6"/>',
    ammo762:'<path d="M9 26V6l7-3 7 3v20z"/><path d="M12 10h8m-8 5h8"/>',
    arrow:'<path d="M5 27L24 8"/><path d="M19 8h8v8"/><path d="M14 22l-4 1 1-4"/>',

    scrap:'<path d="M7 6h18v20H7z"/><path d="M10 10h12v12H10zM12 8v16m8-16v16"/>',
    wood:'<path d="M7 7h18v7H7zM5 16h20v7H5z"/><path d="M12 7v7m8 2v7"/>',
    cloth:'<path d="M6 8l7-4 6 4 7-4v20l-7 4-6-4-7 4z"/><path d="M13 4v20m6-16v20"/>',
    leather:'<path d="M7 6h18l2 20H5z"/><path d="M11 9l10 14m-8-16l10 14"/>',
    electronics:'<path d="M5 7h22v18H5z"/><path d="M10 12h12v8H10z"/><path d="M12 12V8m8 4V8m-8 12v5m8-5v5"/>',
    battery:'<rect x="7" y="7" width="18" height="19" rx="2"/><path d="M13 4h6v3m-5 8h4v6h-4z"/>',
    plastic:'<path d="M8 7h16l3 19H5z"/><path d="M10 12h12m-10 5h8"/>',
    medicalMaterial:'<path d="M6 9h20v17H6z"/><path d="M11 9V6h10v3m-7 5v9m-4-4h8"/>',
    powder:'<path d="M8 8h16v18H8z"/><path d="M11 12h10m-10 5h7"/>',
    adhesive:'<path d="M10 5h12v7l4 5v9H6v-9l4-5z"/><path d="M9 20h14"/>',
    metalHigh:'<path d="M6 7l10-4 10 4v19l-10 3-10-3z"/><path d="M6 7l10 6 10-6M16 13v16"/>',
    copper:'<path d="M8 25V9l8-5 8 5v16z"/><path d="M11 10h10m-10 5h10m-10 5h10"/>',
    aluminum:'<path d="M6 7h20v19H6z"/><path d="M10 11h12v11H10z"/>',
    rubber:'<path d="M7 8c4-4 14-4 18 0v16c-4 4-14 4-18 0z"/><path d="M10 13h12m-12 6h12"/>',
    metalPlate:'<path d="M5 6h22v21H5z"/><circle cx="9" cy="10" r="1"/><circle cx="23" cy="10" r="1"/><circle cx="9" cy="23" r="1"/><circle cx="23" cy="23" r="1"/>',
    metalPipe:'<path d="M7 5h8v16h10v6H9V11H7z"/>',
    gear:'<circle cx="16" cy="16" r="7"/><circle cx="16" cy="16" r="2"/><path d="M16 3v6m0 14v6M3 16h6m14 0h6M7 7l4 4m10 10l4 4M25 7l-4 4M11 21l-4 4"/>',
    spring:'<path d="M8 6c10 0 16 4 16 10s-6 10-16 10c-4 0-4-6 0-6 7 0 10-2 10-4s-3-4-10-4z"/>',
    bearing:'<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="5"/><circle cx="16" cy="16" r="2"/>',
    motor:'<rect x="6" y="8" width="20" height="16" rx="3"/><circle cx="16" cy="16" r="5"/><path d="M10 8V5m12 3V5m-12 19v3m12-3v3"/>',
    precision:'<path d="M5 7h22v18H5z"/><circle cx="16" cy="16" r="6"/><path d="M16 10v12m-6-6h12"/>',
    sensor:'<path d="M6 10h20v13H6z"/><circle cx="16" cy="16" r="4"/><path d="M11 10V6h10v4"/>',
    optic:'<circle cx="16" cy="16" r="10"/><circle cx="16" cy="16" r="5"/><path d="M16 3v4m0 18v4M3 16h4m18 0h4"/>',
    chip:'<rect x="8" y="8" width="16" height="16"/><path d="M12 12h8v8h-8zM8 12H4m24 0h-4M12 8V4m0 24v-4m8-16V4m0 24v-4"/>',
    semiconductor:'<path d="M7 6h18v20H7z"/><path d="M11 10h10v12H11z"/><path d="M11 15H4m24 0h-7"/>',
    transistor:'<path d="M10 5v22m12-22v22M10 16h12"/><path d="M16 10l6 6-6 6"/>',
    fuse:'<path d="M6 12h7l3 4 3-4h7v8h-7l-3-4-3 4H6z"/>',
    cell:'<rect x="8" y="6" width="16" height="21" rx="2"/><path d="M13 3h6v3m-3 5v10m-5-5h10"/>',
    insulator:'<path d="M8 7h16v19H8z"/><path d="M12 7v19m8-19v19"/>',
    connector:'<path d="M7 9h18v14H7z"/><path d="M12 9V5m4 4V5m4 4V5m-8 18v4m4-4v4m4-4v4"/>',
    lens:'<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="6"/><path d="M10 10l4 4"/>',
    polish:'<path d="M7 9h18v14H7z"/><path d="M11 13h10m-10 5h7"/>',
    reagent:'<path d="M11 4h10v7l4 4v11H7V15l4-4z"/><path d="M9 20h14"/>',
    sample:'<path d="M10 4h12v7l3 4v11H7V15l3-4z"/><path d="M9 20h14"/>',
    gauze:'<path d="M6 7h20v20H6z"/><path d="M6 12h20M6 17h20M6 22h20M11 7v20M16 7v20M21 7v20"/>',
    medicalTape:'<circle cx="16" cy="16" r="10"/><circle cx="16" cy="16" r="4"/><path d="M6 16h20"/>',
    resin:'<path d="M10 4h12l4 8-10 16L6 12z"/><path d="M10 4l6 8 6-8"/>',
    fiber:'<path d="M7 7c5 4 13 4 18 0M7 13c5 4 13 4 18 0M7 19c5 4 13 4 18 0M7 25c5 4 13 4 18 0"/>',
    reinforcedCloth:'<path d="M6 6h20v20H6z"/><path d="M6 11h20M6 16h20M6 21h20M11 6v20M16 6v20M21 6v20"/>',
    syntheticLeather:'<path d="M6 6h20l-2 21H8z"/><path d="M10 10l12 13M22 10L10 23"/>',
    woodGlue:'<path d="M11 4h10v7l4 5v10H7V16l4-5z"/><path d="M9 20h14"/>',
    toolSteel:'<path d="M5 7h22v19H5z"/><path d="M9 11h14v11H9z"/>',
    cable:'<path d="M7 9c12-8 18 8 8 13-5 3-10 0-6-4 3-2 6 0 5 3"/>',
    glass:'<path d="M7 5h18l-3 22H10z"/><path d="M10 12h12"/>',
    chemical:'<path d="M11 4h10v6l4 4v12H7V14l4-4z"/><path d="M9 20h14"/>',
    valuable:'<path d="M6 9l6-5h8l6 5-10 18z"/><path d="M12 4l4 23m4-23l-4 23"/>',
    blueprint:'<path d="M6 5h20v22H6z"/><path d="M10 10h12m-12 5h8m-8 5h12"/>',
    repair:'<path d="M21 5a7 7 0 0 0-7 9L5 23l4 4 9-9a7 7 0 0 0 9-9l-5 5-4-4z"/>',
    key:'<circle cx="11" cy="12" r="5"/><path d="M15 15l12 12m-6-6h4m-7-1h4"/>',
    pet:'<path d="M8 12a5 5 0 0 1 10-2 6 6 0 0 1 6 6v7H7v-7a6 6 0 0 1 1-4z"/><circle cx="12" cy="17" r="1"/><circle cx="20" cy="17" r="1"/>',

    material:'<path d="M7 8l9-4 9 4v16l-9 4-9-4z"/><path d="M7 8l9 5 9-5M16 13v15"/>',
    weapon:'<path d="M4 14h24v4H13l-2 7H7l2-7H4z"/><path d="M20 14l3-6h4"/>',
    armor:'<path d="M9 5l7 4 7-4 5 9-5 4v10H5V18l-5-4z"/>',
    item:'<path d="M6 9l10-5 10 5v15l-10 5-10-5z"/><path d="M6 9l10 5 10-5M16 14v15"/>'
  };

  const pixelPalette=Object.freeze({
    K:"#0a0d12",
    M:"#a9b2bd",
    L:"#eef3f8",
    W:"#875a3d"
  });

  function pixelRects(rows){
    if(
      !Array.isArray(rows) ||
      rows.length!==16 ||
      rows.some(row=>typeof row!=="string" || row.length!==16)
    ){
      throw new Error("EFR pixel weapon icon requires a 16x16 pixel master");
    }

    let markup="";
    for(let y=0;y<16;y++){
      const row=rows[y];
      for(let x=0;x<16;x++){
        const color=pixelPalette[row[x]];
        if(!color)continue;
        markup+=`<rect x="${x}" y="${y}" width="1" height="1" fill="${color}" stroke="none"></rect>`;
      }
    }
    return markup;
  }

  const shape=shapes[key] || shapes.item;

  const rarity=Math.max(
    1,
    Math.min(
      5,
      Math.round(Number(item?.rarity)||1)
    )
  );

  if(isWeaponItem(item)){
    const [gridW,gridH]=inventoryGridSize(item);
    const pixelWidth=gridW*16;
    const pixelHeight=gridH*16;
    const asset=`assets/items/svg/武器/${key}.svg`;

    return `
      <span
        class="efrItemIcon efrItemIcon-${key} efrItemIconRarity${rarity} efrItemIconPixel"
        data-icon-key="${key}"
        data-icon-rarity="${rarity}"
        data-pixel-master="${pixelWidth}x${pixelHeight}"
        data-grid-w="${gridW}"
        data-grid-h="${gridH}"
        data-grid-footprint="${gridW}x${gridH}"
        style="--efr-icon-pixel-w:${pixelWidth}px;--efr-icon-pixel-h:${pixelHeight}px"
        aria-hidden="true"
      >
        <span class="efrItemIconGlow"></span>
        <img
          src="${asset}"
          width="${pixelWidth}"
          height="${pixelHeight}"
          alt=""
          draggable="false"
        >
      </span>
    `;
  }

  const iconId=
    `efrIconStroke-${key}-${++efrItemIconInstanceId}`;

  const detailMap={
    pistol:'<path d="M9 12h10M13 18v5M18 12v3"/>',
    smg:'<path d="M8 12h11M12 18v5M20 13l4 2"/>',
    shotgun:'<path d="M8 13h15M12 18v5M22 9v4"/>',
    rifle:'<path d="M8 14h15M12 17v6M21 8h4"/>',
    marksman:'<path d="M8 15h15M12 18v5M18 10h7"/>',
    sniper:'<path d="M8 15h15M12 18v5M15 10h10"/>',
    bolt:'<path d="M8 15h14M13 18v5M21 9v4"/>',
    medkit:'<path d="M11 21h11M13 12h8M17 9v6"/>',
    combatMedkit:'<path d="M9 22h14M12 12h10M17 9v6"/>',
    battery:'<path d="M11 12h10M13 17h6M16 13v8"/>',
    electronics:'<circle cx="16" cy="16" r="2"/><path d="M10 16h4m4 0h4M16 10v4m0 4v4"/>',
    chip:'<circle cx="16" cy="16" r="2"/><path d="M11 16h3m4 0h3M16 11v3m0 4v3"/>',
    key:'<circle cx="11" cy="12" r="2"/><path d="M16 16l7 7m-3-3h4"/>',
    blueprint:'<path d="M10 10h12M10 15h8M10 20h12"/>',
    repair:'<path d="M18 10l4 4M10 22l6-6"/>'
  };

  const detail=detailMap[key] || "";

  return `
    <span
      class="efrItemIcon efrItemIcon-${key} efrItemIconRarity${rarity}"
      data-icon-key="${key}"
      data-icon-rarity="${rarity}"
      aria-hidden="true"
    >
      <span class="efrItemIconGlow"></span>

      <svg
        viewBox="0 0 32 32"
        focusable="false"
      >
        <defs>
          <linearGradient
            id="${iconId}"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            <stop offset="0" stop-color="#ffffff"></stop>
            <stop offset=".30" stop-color="currentColor"></stop>
            <stop offset=".72" stop-color="currentColor"></stop>
            <stop offset="1" stop-color="#ffffff"></stop>
          </linearGradient>
        </defs>

        <g
          class="efrIconDepth"
          transform="translate(.8 1)"
        >
          ${shape}
        </g>

        <g class="efrIconSurface">
          ${shape}
        </g>

        <g
          class="efrIconLine"
          stroke="url(#${iconId})"
        >
          ${shape}
        </g>

        <g
          class="efrIconHighlight"
          transform="translate(-.35 -.45)"
        >
          ${shape}
        </g>

        ${
          detail
            ? `<g class="efrIconDetail">${detail}</g>`
            : ""
        }
      </svg>
    </span>
  `;
}

/*
 * EFR共通アイテムアイコンAPI
 *
 * 既存の itemIconMarkup() に定義された
 * アイテム名ごとの個別SVG形状を、探索・出撃準備・倉庫・
 * クラフト等の全UIから共通利用する。
 *
 * 新しいアイテムDBや別アイコン管理層は作らない。
 */
window.EFRItemIcons={
  markup:itemIconMarkup
};

function renderInventory(){
  refreshBackpackCapacity();

  if(!equipmentSlotsEl || !inventoryContentsEl)return;

  const eq=save.equipment;

  const slots=[
    ["weapon1","武器1",eq.weapon1],
    ["weapon2","武器2",eq.weapon2],
    ["head","頭",eq.head],
    ["chest","胴",eq.chest],
    ["legs","脚",eq.legs],
    ["backpack","バッグ",eq.backpack]
  ];

  equipmentSlotsEl.innerHTML=slots.map(([key,label,item])=>{
    const active=
      key==="weapon"+activeWeaponSlot
        ? " active"
        : "";

    const name=item
      ? inventoryItemName(item)
      : "なし";

    let button="";

    if(key==="weapon1" || key==="weapon2"){
      button=
        `<button
          type="button"
          data-weapon-slot="${key.slice(-1)}"
        >使用</button>`;
    }

    return `
      <div class="equipmentSlot${active}">
        <span class="equipmentSlotLabel">
          <span class="equipmentSlotName">${label}</span>
          ${
            item
              ? itemIconMarkup(item,true)
              : ""
          }
          <span class="equipmentSlotItemName">${name}</span>
        </span>
        ${button}
      </div>
    `;
  }).join("");

  if(window.EFRGrid){
    const grid=window.EFRGrid.render(
      player.loot,
      player.backpackCapacity,
      (item,index)=>{
        const name=inventoryItemName(item);

        const type=
          item.kind==="weapon"
            ? "武器"
            : item.kind==="armor"
              ? "防具"
              : item.kind==="backpack"
                ? "バッグ"
                : item.kind==="heal"
                  ? "回復"
                  : item.kind==="mpRestore"
                    ? "MP回復"
                    : item.kind==="key"
                      ? "鍵"
                      : item.kind==="ammo"
                      ? "弾薬"
                      : "アイテム";

        const action=
          item.kind==="heal" ||
          item.kind==="mpRestore"
            ? `
              <button
                type="button"
                data-use-item="${index}"
              >使用</button>
            `
            : (
              item.kind==="weapon" ||
              item.kind==="armor" ||
              item.kind==="backpack"
            )
              ? `
                <button
                  type="button"
                  data-equip-item="${index}"
                >装備</button>
              `
              : "";

        return `
          <div class="efrSlotItemBody">
            ${itemIconMarkup(item,true)}
            <strong>${name}</strong>
            <small>
              ${type} / ${item.slots||1}マス
            </small>
            ${
              item.amount
                ? `<b class="efrSlotAmount">×${item.amount}</b>`
                : ""
            }
            ${action}
            ${item.kind==="key" && !running ? `<button type="button" data-store-key="${index}">保管</button>` : ""}
          </div>
        `;
      }
    );

    inventoryContentsEl.innerHTML=
      grid.html;

    if(grid.changed){
      persist();
    }
  }else{
    inventoryContentsEl.innerHTML=
      player.loot.length
        ? player.loot.map((item,index)=>{
            const name=inventoryItemName(item);

            const type=
              item.kind==="weapon"
                ? "武器"
                : item.kind==="armor"
                  ? "防具"
                  : item.kind==="backpack"
                    ? "バッグ"
                    : item.kind==="heal"
                      ? "回復"
                      : item.kind==="mpRestore"
                        ? "MP回復"
                        : item.kind==="key"
                          ? "鍵"
                          : "アイテム";

            const action=
              item.kind==="heal" ||
              item.kind==="mpRestore"
                ? `<button type="button" data-use-item="${index}">使用</button>`
                : (
                  item.kind==="weapon" ||
                  item.kind==="armor" ||
                  item.kind==="backpack"
                )
                  ? `<button type="button" data-equip-item="${index}">装備</button>`
                  : "";

            return `
              <div class="inventoryItem">
                <span>
                  ${name}
                  <small>${type}</small>
                </span>
                ${action}
            ${item.kind==="key" && !running ? `<button type="button" data-store-key="${index}">保管</button>` : ""}
              </div>
            `;
          }).join("")
        : `<div class="inventoryEmpty">バッグは空です</div>`;
  }

  const countEl=
    document.getElementById("bagCount");

  if(countEl){
    countEl.textContent=
      `${backpackUsed()}/${player.backpackCapacity}`;
  }

  const wishlistContent=
    document.getElementById("raidWishlistContent");

  if(wishlistContent){
    const summary=
      window.EFRHub?.renderWishlistPreview?.(
        wishlistContent,
        player.loot||[]
      );
    const summaryLabel=
      document.getElementById("raidWishlistCount");

    if(summaryLabel){
      summaryLabel.textContent=
        summary
          ? summary.goalCount
            ? `目標 ${summary.goalCount}件 · 残り素材 ${summary.missingTotal}個`
            : "目標未登録"
          : "目標を読み込めません";
    }

    if(!summary){
      wishlistContent.textContent=
        "欲しいものを表示できません。拠点画面で再度お試しください。";
    }
  }

  window.EFRPet?.mountPetIcons?.(
    inventoryPanel
  );
}

if(inventoryBtn && inventoryPanel){
let inventoryGridSelection=null;

function bindInventoryGridEvents(){
  if(!inventoryContentsEl)return;

  let lastActivation=0;

  const activate=event=>{
    if(
      event.target.closest(
        "button:not(.efrSlotCell)"
      )
    ){
      return;
    }

    const now=Date.now();

    if(
      event.type==="click" &&
      now-lastActivation<400
    ){
      lastActivation=0;
      return;
    }

    lastActivation=now;

    if(event.type==="pointerup"){
      event.preventDefault();
    }

    const itemEl=
      event.target.closest(".efrSlotItem");

    if(itemEl){
      const index=Number(
        itemEl.dataset.gridItemIndex
      );

      if(
        Number.isInteger(index) &&
        player.loot[index]
      ){
        inventoryGridSelection=index;

        inventoryContentsEl
          .querySelectorAll(".efrSlotItem")
          .forEach(el=>{
            el.classList.toggle(
              "efrSelected",
              Number(
                el.dataset.gridItemIndex
              )===index
            );
          });
      }

      return;
    }

    const cell=
      event.target.closest(".efrSlotCell");

    if(
      !cell ||
      inventoryGridSelection===null
    ){
      return;
    }

    const moved=
      window.EFRGrid?.move?.(
        player.loot,
        player.backpackCapacity,
        inventoryGridSelection,
        Number(cell.dataset.gridCellX),
        Number(cell.dataset.gridCellY)
      );

    if(moved){
      persist();
      inventoryGridSelection=null;
      renderInventory();
    }
  };

  inventoryContentsEl.addEventListener(
    "pointerup",
    activate,
    {passive:false}
  );

  inventoryContentsEl.addEventListener(
    "click",
    activate
  );
}

bindInventoryGridEvents();

  bindTap(
    inventoryBtn,
    ()=>{
      showInventoryPanel();
    }
  );
}

if(closeInventoryBtn && inventoryPanel){
  bindTap(
    closeInventoryBtn,
    ()=>{
      hideLootPanel();
    }
  );
}

if(raidInspectBackdrop){
  bindTap(
    raidInspectBackdrop,
    ()=>{
      hideLootPanel();
    }
  );
}

if(equipmentSlotsEl){
  bindTapDelegate(
    equipmentSlotsEl,
    "[data-weapon-slot]",
    btn=>{
      toggleWeaponSlot(
        Number(btn.dataset.weaponSlot)
      );
    }
  );
}

if(inventoryContentsEl){
  bindTapDelegate(
    inventoryContentsEl,
    "[data-equip-item],[data-use-item],[data-store-key]",
    button=>{
      if(button.hasAttribute("data-store-key")){storeInventoryKey(Number(button.dataset.storeKey));return;}
      if(button.hasAttribute("data-equip-item")){
        const index=
          Number(button.dataset.equipItem);

        const item=player.loot[index];

        if(!item)return;

        equipItem(item);
        return;
      }

      useInventoryItem(
        Number(button.dataset.useItem)
      );
    }
  );
}

function itemLabel(item){
  if(typeof item==="string")return item;
  return item?.name || item?.type || "不明なアイテム";
}

function applyGeneratedLootRarity(item){
  if(!item)return item;

  const equipment=
    isWeaponItem(item) ||
    isArmorItem(item) ||
    isBackpackItem(item);

  if(!equipment){
    return item;
  }

  item.rarity=
    window.EFRBaseParts?.randomRarity?.() || 1;

  if(isWeaponItem(item)){
    applyWeaponProgression(item);
  }

  if(isArmorItem(item)){
    applyArmorProgression(item);
  }

  if(isBackpackItem(item)){
    applyBackpackProgression(item);
  }

  return item;
}

function catalogLootItem(name){
  return applyGeneratedLootRarity(
    catalogItem(name)
  );
}

function generateContainerLoot(container){
  if(container.loot)return;

  const roll=Math.random();
  const loot=[];
  const preloaded=Array.isArray(container.preloadedLoot)
    ? container.preloadedLoot.filter(Boolean)
    : [];

  if(roll<.12){
    loot.push(
      window.EFRMagic?.makeStaff?.() || {
        name:"魔法の杖",
        kind:"weapon",
        slotType:"weapon",
        magicStaff:true,
        damage:24,
        range:330,
        cooldown:1.2,
        durability:90,
        maxDurability:90,
        weight:2,
        slots:2,
        spells:[]
      }
    );
  }else if(roll<.18){
    loot.push({
      name:"魔力回復薬",
      kind:"mpRestore",
      value:35,
      slots:1,
      weight:.5
    });
  }else if(roll<.22){
    loot.push(catalogItem("ナイフ"));
  }else if(roll<.38){
    loot.push(catalogItem("鉄パイプ"));
  }else if(roll<.55){
    loot.push(catalogItem("軽量アーマー"));
  }else if(roll<.68){
    loot.push(catalogItem("防護ベスト"));
  }else if(roll<.74){
    loot.push(catalogItem("軽量ヘルメット"));
  }else if(roll<.79){
    loot.push(catalogItem("防護ヘルメット"));
  }else if(roll<.84){
    loot.push(catalogItem("軽量ブーツ"));
  }else if(roll<.89){
    loot.push(catalogItem("防護ブーツ"));
  }else if(roll<.93){
    loot.push(catalogItem("タクティカルバックパック"));
  }else if(roll<.96){
    loot.push(catalogItem("大型バックパック"));
  }else if(roll<.98){
    loot.push({
      type:"回復薬",
      kind:"heal",
      value:25,
      slots:1
    });
  }else{
    loot.push({
      type:"部品",
      kind:"loot",
      value:0,
      slots:1
    });

    if(Math.random()>.55){
      loot.push({
        type:"電子部品",
        kind:"loot",
        value:0,
        slots:1
      });
    }
  }

  if(Math.random()>.72){
    loot.push({
      type:"貴重品",
      kind:"loot",
      value:0,
      slots:2
    });
  }

  const standalonePart=
    window.EFRBaseParts?.randomStandalonePartItem?.();

  if(standalonePart){
    loot.push(standalonePart);
  }

  addRareKeyLoot(loot);
  addLockedAreaLoot(container,loot);

  for(let i=0;i<loot.length;i++){
    loot[i]=applyGeneratedLootRarity(loot[i]);
  }

  // マップ生成時に既存のワールド報酬が割り当てられている場合も、
  // 通常コンテナ報酬と同じUI・回収経路で扱う。
  container.loot=[...preloaded,...loot];
}

function createPackBonusLootItem(){
  const temp={loot:null};

  generateContainerLoot(temp);

  if(
    !Array.isArray(temp.loot) ||
    !temp.loot.length
  ){
    return {
      type:"部品",
      kind:"loot",
      value:0,
      slots:1
    };
  }

  const item=
    temp.loot[
      Math.floor(
        Math.random()*temp.loot.length
      )
    ];

  return cloneItem(item);
}

function clearLootRevealTimer(){
  if(lootRevealTimer){
    clearInterval(lootRevealTimer);
    lootRevealTimer=null;
  }
}

function startLootReveal(source){
  clearLootRevealTimer();

  if(!source || !Array.isArray(source.loot) || lootRevealPaused){
    return;
  }

  if(!Number.isFinite(Number(source.revealedLootCount))){
    source.revealedLootCount=0;
  }

  const total=source.loot.filter(Boolean).length;

  if(source.revealedLootCount>=total){
    source.revealedLootCount=total;
    return;
  }

  let revealAccumulator=0;

  lootRevealTimer=setInterval(()=>{
    if(openContainer!==source || lootRevealPaused){
      clearLootRevealTimer();
      return;
    }

    const current=Number(source.revealedLootCount)||0;
    const currentTotal=source.loot.filter(Boolean).length;

    if(current>=currentTotal){
      source.revealedLootCount=currentTotal;
      clearLootRevealTimer();
      renderLootPanel();
      return;
    }

    /*
     * 通常:
     *   500ms tick × 2 = 1 item / 1.0 sec
     *
     * 高速調査:
     *   500ms tick × 1 = 1 item / 0.5 sec
     *
     * petFastInspectTimerを毎tick参照するため、
     * 調査途中で能力が発動・終了してもruntimeと一致する。
     */
    revealAccumulator+=
      (player.petFastInspectTimer||0)>0
        ? 1
        : .5;

    if(revealAccumulator<1){
      return;
    }

    revealAccumulator-=1;

    const next=Math.min(
      currentTotal,
      current+1
    );

    if(next!==current){
      source.revealedLootCount=next;
      persist();
      renderLootPanel();
    }

    if(next>=currentTotal){
      clearLootRevealTimer();
    }
  },500);
}

function searchContainer(container){
  if(!container.searched){
    container.searched=true;
    generateContainerLoot(container);

    if(!Number.isFinite(Number(container.revealedLootCount))){
      container.revealedLootCount=0;
    }

    window.EFRPet?.onLootInspect?.(
      container,
      "container"
    );
  }

  openContainer=container;
  openLoot=container.loot.filter(Boolean);

  showLootPanel(container.type);
  startLootReveal(container);
}

function openRaidInspectModal(){
  inventoryPanel.classList.remove("hidden");
  inventoryPanel.setAttribute("aria-hidden","false");
}

function showInventoryPanel(){
  clearLootRevealTimer();
  lootRevealPaused=false;
  openContainer=null;
  openLoot=[];
  lootPanel.classList.add("hidden");

  if(raidInspectTitle){
    raidInspectTitle.textContent="探索インベントリ";
  }

  openRaidInspectModal();
  renderInventory();
}

function showLootPanel(title){
  clearLootRevealTimer();
  lootRevealPaused=false;

  if(raidInspectTitle){
    raidInspectTitle.textContent=title+"を調査";
  }

  openRaidInspectModal();
  lootPanel.classList.remove("hidden");

  lootTitle.textContent=title+"の中身";
  renderInventory();
  renderLootPanel();

  if(openContainer && Array.isArray(openContainer.loot)){
    startLootReveal(openContainer);
  }
}

function hideContainerPanel(){
  clearLootRevealTimer();
  lootRevealPaused=false;

  lootPanel.classList.add("hidden");

  if(raidInspectTitle){
    raidInspectTitle.textContent="探索インベントリ";
  }

  openContainer=null;
  openLoot=[];

  renderInventory();
}

function hideLootPanel(){
  clearLootRevealTimer();
  lootRevealPaused=false;

  lootPanel.classList.add("hidden");
  inventoryPanel.classList.add("hidden");
  inventoryPanel.setAttribute("aria-hidden","true");

  if(raidInspectTitle){
    raidInspectTitle.textContent="探索インベントリ";
  }

  openContainer=null;
  openLoot=[];
}

function removeLootFromSource(item){
  if(!openContainer || !Array.isArray(openContainer.loot)){
    return;
  }

  const index=openContainer.loot.indexOf(item);

  if(index>=0){
    openContainer.loot.splice(index,1);
  }
}

function lootRarityLabel(item){
  const rarity=Number(item?.rarity);

  if(!Number.isFinite(rarity) || rarity<1){
    return "";
  }

  const names=[
    "コモン",
    "アンコモン",
    "レア",
    "エピック",
    "レジェンダリー"
  ];

  return names[
    Math.min(
      names.length-1,
      Math.max(0,Math.round(rarity)-1)
    )
  ];
}

function renderLootPanel(){
  lootContents.innerHTML="";

  const progressiveSource=
    !!openContainer &&
    Array.isArray(openContainer.loot);

  lootContents.classList.toggle(
    "efrLootGrid",
    progressiveSource
  );

  const total=openLoot.length;

  const revealedCount=progressiveSource
    ? Math.max(
        0,
        Math.min(
          total,
          Number(openContainer.revealedLootCount)||0
        )
      )
    : total;

  lootStatus.textContent=
    total<=0
      ? "空です"
      : progressiveSource
        ? (
            revealedCount>=total
              ? "調査完了 "+total+"/"+total
              : (lootRevealPaused ? "調査停止 " : "調査中 ")+
                revealedCount+"/"+total
          )
        : "即時回収";

  lootPauseBtn.disabled=
    !progressiveSource ||
    revealedCount>=total;

  lootPauseBtn.textContent=
    lootRevealPaused
      ? "調査再開"
      : "調査停止";

  const canCollectCount=openLoot.reduce(
    (count,item,index)=>{
      const revealed=
        !progressiveSource ||
        index<revealedCount;

      return count+
        (revealed && backpackCanFit(item) ? 1 : 0);
    },
    0
  );

  lootCollectAllBtn.disabled=
    canCollectCount<=0;

  if(!openLoot.length){
    lootContents.innerHTML="<div class='lootItem'><span>空です</span></div>";
    return;
  }

  openLoot.forEach((item,index)=>{
    const row=document.createElement("div");

    row.className=progressiveSource
      ? "lootItem efrLootCell"
      : "lootItem";

    const info=document.createElement("div");

    const revealed=
      !progressiveSource ||
      index<revealedCount;

    info.insertAdjacentHTML(
      "afterbegin",
      itemIconMarkup(item,revealed)
    );

    const name=document.createElement("strong");

    name.textContent=
      revealed
        ? itemLabel(item)
        : "？？？";

    const rarityLabel=
      revealed
        ? lootRarityLabel(item)
        : "";

    const lootSize=
      window.EFRGrid?.size?.(item) ||
      [1,1];

    row.style.setProperty(
      "--loot-grid-w",
      String(lootSize[0])
    );

    row.style.setProperty(
      "--loot-grid-h",
      String(lootSize[1])
    );

    if(progressiveSource){
      row.style.gridColumn=
        "span "+
        Math.max(
          1,
          Math.min(6,Number(lootSize[0])||1)
        );

      row.style.gridRow=
        "span "+
        Math.max(
          1,
          Math.min(6,Number(lootSize[1])||1)
        );
    }

    const detail=document.createElement("small");

    if(progressiveSource && !revealed){
      detail.textContent="調査中…";
    }else{
      detail.textContent=[
        rarityLabel,
        lootSize[0]+"×"+lootSize[1]+"マス"
      ].filter(Boolean).join(" / ");
    }

    const state=document.createElement("span");

    state.className="efrLootState";

    state.textContent=
      !revealed
        ? "未判明"
        : "識別済み";

    info.appendChild(state);

    const rarity=Number(item?.rarity);

    if(revealed){
      row.classList.add("efrLootIdentified");
    }

    if(
      revealed &&
      Number.isFinite(rarity) &&
      rarity>=1 &&
      rarity<=5
    ){
      const normalizedRarity=
        Math.round(rarity);

      row.classList.add(
        "efrLootRarity"+normalizedRarity
      );

      row.dataset.lootRarity=
        String(normalizedRarity);
    }

    info.appendChild(name);
    info.appendChild(detail);

    const actions=document.createElement("div");
    actions.className="lootActions";

    const equipmentSlot=
      revealed
        ? equipmentSlotForItem(item)
        : null;

    if(equipmentSlot){
      const equipButton=document.createElement("button");

      equipButton.type="button";
      equipButton.textContent="装備";

      equipButton.addEventListener("click",event=>{
        event.stopPropagation();
        equipLootItemFromSource(item);
      });

      actions.appendChild(equipButton);
    }

    const button=document.createElement("button");

    const canCollect=
      revealed &&
      backpackCanFit(item);

    button.type="button";
    button.textContent=
      !revealed
        ? "未判明"
        : canCollect
          ? "回収"
          : "満杯";

    button.disabled=!canCollect;

    button.addEventListener("click",event=>{
      event.stopPropagation();

      if(!revealed || !backpackCanFit(item))return;

      if(addToBackpack(item)){
        removeLootFromSource(item);
        openLoot.splice(index,1);

        if(progressiveSource){
          openContainer.revealedLootCount=Math.max(
            0,
            (Number(openContainer.revealedLootCount)||0)-1
          );
        }

        persist();
        renderInventory();
        renderLootPanel();
      }
    });

    actions.appendChild(button);

    row.appendChild(info);
    row.appendChild(actions);

    lootContents.appendChild(row);
  });
}

function collectRevealedLoot(){
  if(
    !openContainer ||
    !Array.isArray(openContainer.loot) ||
    !openLoot.length
  ){
    return;
  }

  const revealedCount=Math.max(
    0,
    Math.min(
      openLoot.length,
      Number(openContainer.revealedLootCount)||0
    )
  );

  let collected=0;

  for(let i=openLoot.length-1;i>=0;i--){
    if(i>=revealedCount)continue;

    const item=openLoot[i];

    if(!backpackCanFit(item))continue;

    if(addToBackpack(item)){
      removeLootFromSource(item);
      openLoot.splice(i,1);
      openContainer.revealedLootCount=Math.max(
        0,
        (Number(openContainer.revealedLootCount)||0)-1
      );
      collected++;
    }
  }

  if(collected>0){
    persist();
  }

  renderLootPanel();
}

function collectFloorItem(item){
  if(!backpackCanFit(item)){
    interactionText.textContent="バックパックが満杯";
    return;
  }

  if(addToBackpack(item)){
    item.taken=true;
    interactionTarget=null;
    persist();
  }
}

function collectCorpse(corpse){
  if(!Array.isArray(corpse.loot)){
    generateContainerLoot(corpse);
  }

  if(!Number.isFinite(Number(corpse.revealedLootCount))){
    corpse.revealedLootCount=0;
  }

  window.EFRPet?.onLootInspect?.(
    corpse,
    "enemy"
  );

  openContainer=corpse;
  openLoot=corpse.loot.filter(Boolean);
  showLootPanel("敵の死体");
}

function nearestInteraction(){
  let best=null;
  let bestDistance=Infinity;

  const finderBonus=
    Number(
      window.EFRPet?.interactionRangeBonus?.()||0
    );

  const wildPet=
    window.EFRPet?.getNearestWildPet?.(
      player.x,
      player.y,
      38
    );

  if(wildPet){
    best={
      type:"wildPet",
      target:wildPet,
      distance:Math.hypot(
        player.x-wildPet.x,
        player.y-wildPet.y
      )
    };

    bestDistance=best.distance;
  }

  for(const item of items){
    if(item.taken)continue;

    const building=world.buildings.find(
      b=>b.id===item.buildingId
    );

    if(building && player.inside!==building)continue;

    const d=Math.hypot(
      player.x-item.x,
      player.y-item.y
    );

    if(
      d<(30+finderBonus) &&
      d<bestDistance
    ){
      best={
        type:"item",
        target:item,
        distance:d
      };
      bestDistance=d;
    }
  }

  for(const container of containers){
    const building=world.buildings.find(
      b=>b.id===container.buildingId
    );

    if(building && player.inside!==building)continue;

    const d=Math.hypot(
      player.x-container.x,
      player.y-container.y
    );

    if(
      d<(38+finderBonus) &&
      d<bestDistance
    ){
      best={
        type:"container",
        target:container,
        distance:d
      };
      bestDistance=d;
    }
  }

  for(const building of world.buildings){
    if(!building.locked || building.door?.unlocked)continue;
    const door=building.door;
    const dx=player.x-(door.x+door.w/2);
    const dy=player.y-(door.y+door.h/2);
    const d=Math.hypot(dx,dy);
    if(d<48 && d<bestDistance){
      best={
        type:"lockedDoor",
        target:building,
        distance:d
      };
      bestDistance=d;
    }
  }

  for(const enemy of enemies){
    if(!enemy.dead)continue;

    const d=Math.hypot(
      player.x-enemy.x,
      player.y-enemy.y
    );

    if(d<40 && d<bestDistance){
      best={
        type:"corpse",
        target:enemy,
        distance:d
      };
      bestDistance=d;
    }
  }

  return best;
}

function updateInteraction(){
  if(
    (inventoryPanel && !inventoryPanel.classList.contains("hidden")) ||
    (lootPanel && !lootPanel.classList.contains("hidden"))
  ){
    interactionBar.classList.add("hidden");
    return;
  }

  interactionTarget=nearestInteraction();

  if(!interactionTarget){
    interactionBar.classList.add("hidden");
    return;
  }

  interactionBar.classList.remove("hidden");

  if(interactionTarget.type==="wildPet"){
    interactionText.textContent=
      interactionTarget.target.name;

    interactBtn.textContent=
      interactionTarget.target.inspected
        ? "仲間にする"
        : "調査";
  }else if(interactionTarget.type==="lockedDoor"){
    interactionText.textContent=(keyDefinition(interactionTarget.target.keyType)?.name||"鍵")+"が必要です";
    interactBtn.textContent="解錠";
  }else if(interactionTarget.type==="container"){
    interactionText.textContent=
      interactionTarget.target.searched
      ? "調べ直す"
      : interactionTarget.target.type+"を調べる";

    interactBtn.textContent="調べる";
  }else if(interactionTarget.type==="corpse"){
    interactionText.textContent="敵の死体を漁る";
    interactBtn.textContent="漁る";
  }else{
    interactionText.textContent=
      "拾う: "+itemLabel(interactionTarget.target);

    interactBtn.textContent="拾う";
  }
}

function interact(){
  const run=window.EFRErrorHandler?.run;

  const execute=()=>{
    if(!interactionTarget)return;

    const target=interactionTarget.target;

    if(interactionTarget.type==="wildPet"){
      if(target.inspected){
        window.EFRPet?.captureWildPet?.(
          target.id
        );
      }else{
        window.EFRPet?.inspectWildPet?.(
          target.id
        );
      }

      updateInteraction();
      return;
    }

    if(interactionTarget.type==="lockedDoor"){
      unlockBuilding(target);
      updateInteraction();
      return;
    }

    if(interactionTarget.type==="container"){
      searchContainer(target);
      return;
    }

    if(interactionTarget.type==="corpse"){
      collectCorpse(target);
      return;
    }

    if(interactionTarget.type==="item"){
      collectFloorItem(target);
    }
  };

  if(run){
    return run(
      "探索中のインタラクション",
      execute,
      {
        phase:"探索中の調査・取得",
        file:"game.js",
        screen:"探索画面"
      }
    );
  }

  return execute();
}

function attack(){
  const run=window.EFRErrorHandler?.run;

  const execute=()=>{
  if(
    (!running && !window.EFRTraining?.isActive?.()) ||
    attackTimer>0
  )return;
  if(player.casting)return;

  const weapon=equippedWeapon();

  if(weapon.magicStaff){
    window.EFRMagic?.castSpell?.(0);
    return;
  }

  attackTimer=weapon.cooldown || .35;
  attackFlash=.14;

  let target=null;
  let best=Infinity;

  for(const enemy of enemies){
    if(enemy.dead)continue;

    const dx=enemy.x-player.x;
    const dy=enemy.y-player.y;
    const d=Math.hypot(dx,dy);

    if(d > weapon.range + enemy.r)continue;
    if(!playerCanSeeEnemy(enemy))continue;

    const targetAngle =
      Math.atan2(dy,dx);

    const aimAngle =
      Math.atan2(
        player.facingY,
        player.facingX
      );

    const delta =
      angleDifference(
        aimAngle,
        targetAngle
      );

    const angularWindow =
      weapon.kind === "firearm"
        ? 0.22
        : 0.55;

    if(delta > angularWindow)continue;

    const score =
      d + delta * 180;

    if(score < best){
      best = score;
      target = enemy;
    }
  }

  emitNoise(
    player.x,
    player.y,
    weapon.kind==="firearm" ? 300 : 90,
    weapon.kind==="firearm" ? "gunshot" : "melee"
  );

  if(!target)return;

  const savedWeapon=
    save.equipment["weapon"+activeWeaponSlot];

  if(
    !window.EFRTraining?.isActive?.() &&
    savedWeapon &&
    (
      savedWeapon.maxDurability ||
      savedWeapon.durability != null
    )
  ){
    const maxDurability=Number(
      savedWeapon.maxDurability||
      savedWeapon.durability||
      100
    );

    const durability=Number(
      savedWeapon.durability??maxDurability
    );

    if(durability<=0){
      logMessage("武器が壊れています。整備台で修理してください");
      return;
    }

    savedWeapon.durability=Math.max(
      0,
      durability-1
    );
  }

  /*
   * ペット「完全潜伏」は実際の攻撃成立時に解除する。
   * 武器破損時は上のreturnで攻撃自体が成立しないため解除しない。
   */
  if((player.petStealthTimer||0)>0){
    player.petStealthTimer=0;
  }

  applyDamage(target,characterWeaponDamage(weapon));

  if(target.hp>0 && weapon.knockback>0){
    const dx=target.x-player.x;
    const dy=target.y-player.y;
    const distance=Math.hypot(dx,dy)||1;

    const nextX=
      target.x+
      dx/distance*weapon.knockback;

    const nextY=
      target.y+
      dy/distance*weapon.knockback;

    if(!blocked({
      x:nextX,
      y:nextY,
      r:target.r
    })){
      target.x=nextX;
      target.y=nextY;
    }
  }

  if(target.hp<=0){
    if(target.trainingDummy){
      target.hp=target.maxHp;
      target.dead=false;
      window.EFRTraining?.update?.();
      return;
    }

    target.dead=true;

    // 敵撃破で永続キャラクターXP
    gainPlayerXP(20,"enemy");

    // 死体Lootは既存の共通generateContainerLoot()で生成する。
    // 架空のプレースホルダー項目は生成しない。
  }
  };

  if(run){
    return run(
      "攻撃処理",
      execute,
      {
        phase:"戦闘処理",
        file:"game.js",
        screen:"探索画面"
      }
    );
  }

  return execute();
}

function finish(success,text){
  running=false;

  hideLootPanel();
  interactionBar.classList.add("hidden");

  resultPanel.classList.remove("hidden");
  raidPanel.classList.add("hidden");

  document.getElementById("resultTitle").textContent =
    success ? "脱出成功" : "探索失敗";

  if(success){
    const capacity=baseStorageCapacity();
    const free=Math.max(0,capacity-save.stash.length);

    const returned=
      player.loot
        .map(item=>cloneItem(item))
        .slice(0,free);

    save.stash.push(...returned);

    save.escapes++;

    // 脱出成功を拠点発展へ反映
    gainBaseProgress(25);

    // 生還でも永続キャラクターXPを獲得
    gainPlayerXP(
      25+Math.min(25,player.loot.length*5),
      "extract"
    );

    window.EFRPet?.onExtract?.();

    if(player.loot.length>returned.length){
      text+="\n倉庫容量を超えた "+
        (player.loot.length-returned.length)+
        " 個は持ち帰れませんでした。";
    }

    // 帰還済みの持込・回収品を探索中の一時状態へ残さない。
    player.loot=[];

    persist();
  }else{
    player.loot=[];
    player.casting=false;
    player.mp=player.maxMP||100;
    save.equipment={
      weapon1:null,
      weapon2:null,
      head:null,
      chest:null,
      legs:null,
      backpack:null
    };
    refreshBackpackCapacity();
    window.EFRPet?.onFail?.();
    persist();
  }

  document.getElementById("resultText").textContent=text;

  statusEl.textContent=success ? "帰還" : "失敗";


renderBase();
}

  Object.defineProperties(window,{
  EFRGameRunning:{get:()=>running},
  EFRGameAttackTimer:{get:()=>attackTimer,set:v=>{attackTimer=v}},
  EFRGameAttackFlash:{get:()=>attackFlash,set:v=>{attackFlash=v}}
});

window.EFRGame={
  get canvas(){return canvas},
  get ctx(){return ctx},
  get player(){return player},
  get world(){return world},
  get enemies(){return enemies},
  get items(){return items},
  get containers(){return containers},
  get save(){return save},
  get running(){return running},
  get moveInputStrength(){
    return Math.min(
      1,
      Math.hypot(stick.x,stick.y)
    );
  },
  get attackTimer(){return attackTimer},
  set attackTimer(v){attackTimer=v},
  get attackFlash(){return attackFlash},
  set attackFlash(v){attackFlash=v},
  get activeWeaponSlot(){return activeWeaponSlot},
  set activeWeaponSlot(v){activeWeaponSlot=v},
  bindTap,
  bindTapDelegate,
  setAim:(x,y)=>efrSetAim(x,y),
  attack,
  equipItem,
  toggleWeaponSlot,
  equippedWeapon,
  equippedArmor,
  addToBackpack,
  createPackBonusLootItem,
  backpackCanFit,
  refreshBackpackCapacity,
  itemWeight,
  ensureItemWeight,
  backpackWeight,
  carriedWeight,
  backpackWeightCapacity,
  renderInventory,
  persist,
  resetSaveData,
  removeLegacySaveData,
  logMessage,
  recoverRaidStall,
  applyDamage,
  showDamageNumber,
  gainPlayerXP,
  emitNoise,
  playerXpToNextLevel,
  getCharacterSkills:()=>CHARACTER_SKILLS,
  getCharacterSkillLevel:characterSkillLevel,
  spendCharacterSkill,
  isWeaponItem,
  ensureWeaponProgression,
  weaponRarityName,
  weaponLevelMultiplier,
  weaponRarityMultiplier,
  weaponProgressionDamage,
  applyWeaponProgression,
  isArmorItem,
  ensureArmorProgression,
  armorRarityName,
  armorLevelMultiplier,
  armorRarityMultiplier,
  armorProgressionReduction,
  applyArmorProgression,
  isBackpackItem,
  ensureBackpackProgression,
  backpackRarityName,
  backpackRarityMultiplier,
  backpackProgressionCapacity,
  applyBackpackProgression,
  applyEquipmentProgression,
  applyCharacterGrowth,
  playerCanSeeEnemy,
  enemyCanSeePlayer,
  hasLineOfSight,
  blocked,
  start,
  stopTrainingRuntime,
  finish,
  get playerMP(){return player.mp},
  set playerMP(v){player.mp=v},
  get playerMaxMP(){return player.maxMP},
  set playerMaxMP(v){player.maxMP=v},
  get playerCasting(){return player.casting},
  set playerCasting(v){player.casting=!!v}
};
const ALERT_SHARE_RANGE=260;
const ALERT_SHARE_MAX=2;
const ALERT_DURATION=8;

function receiveEnemyAlert(enemy,source,x,y,confidence,role){
  if(enemy.dead || enemy===source)return;

  const current=enemy.alertConfidence || 0;

  if(confidence<current*.75)return;

  enemy.alerted=true;
  enemy.alertX=x;
  enemy.alertY=y;
  enemy.alertConfidence=Math.min(
    1,
    Math.max(current,confidence)
  );
  enemy.alertTimer=ALERT_DURATION;
  enemy.alertRole=role;
  enemy.alertSource=source;
}

function shareEnemyAlert(source){
  if(
    source.lastSeenX===null ||
    source.lastSeenY===null
  ){
    return;
  }

  const candidates=[];

  for(const enemy of enemies){
    if(enemy.dead || enemy===source)continue;

    const distance=Math.hypot(
      enemy.x-source.x,
      enemy.y-source.y
    );

    if(distance>ALERT_SHARE_RANGE)continue;

    candidates.push({
      enemy,
      distance
    });
  }

  candidates.sort(
    (a,b)=>a.distance-b.distance
  );

  for(
    let i=0;
    i<Math.min(ALERT_SHARE_MAX,candidates.length);
    i++
  ){
    const target=candidates[i].enemy;
    const distance=candidates[i].distance;

    const confidence=Math.max(
      .35,
      1-distance/ALERT_SHARE_RANGE
    );

    receiveEnemyAlert(
      target,
      source,
      source.lastSeenX,
      source.lastSeenY,
      confidence,
      i===0 ? "investigate" : "guard"
    );
  }
}

function emitNoise(x,y,radius,source="unknown"){
  if(!running)return;
  noiseEvents.push({
    x,
    y,
    radius:Math.max(1,Number(radius)||1),
    source
  });
}

function processNoiseEvents(){
  if(!noiseEvents.length)return;

  const events=noiseEvents.splice(0);

  for(const event of events){
    for(const enemy of enemies){
      if(enemy.dead)continue;

      const distance=
        Math.hypot(
          enemy.x-event.x,
          enemy.y-event.y
        );

      if(distance>event.radius)continue;

      let confidence=
        Math.max(
          .2,
          1-distance/event.radius
        );

      if(!hasLineOfSight(
        enemy,
        {x:event.x,y:event.y}
      )){
        confidence*=.55;
      }

      if(
        player.inside &&
        enemy.buildingId!==player.inside.id
      ){
        confidence*=.7;
      }

      if(confidence<.2)continue;

      receiveEnemyAlert(
        enemy,
        null,
        event.x,
        event.y,
        confidence,
        "sound:"+event.source
      );
    }
  }
}

function updateAlertedEnemy(enemy,dt,speed){
  if(
    !enemy.alerted ||
    enemy.alertX===null ||
    enemy.alertY===null
  ){
    return false;
  }

  enemy.alertTimer=Math.max(
    0,
    enemy.alertTimer-dt
  );

  enemy.alertConfidence=Math.max(
    0,
    enemy.alertConfidence-dt*.035
  );

  if(
    enemy.alertTimer<=0 ||
    enemy.alertConfidence<=.05
  ){
    enemy.alerted=false;
    enemy.alertX=null;
    enemy.alertY=null;
    enemy.lastSeenX=null;
    enemy.lastSeenY=null;
    enemy.alertRole=null;
    enemy.alertSource=null;
    enemy.searchTimer=0;
    return false;
  }

  if(enemy.alertRole==="guard"){
    const dx=enemy.alertX-enemy.x;
    const dy=enemy.alertY-enemy.y;
    const distance=Math.hypot(dx,dy)||1;

    enemy.facingX=dx/distance;
    enemy.facingY=dy/distance;

    return true;
  }

  const dx=enemy.alertX-enemy.x;
  const dy=enemy.alertY-enemy.y;
  const distance=Math.hypot(dx,dy)||1;

  if(distance>18){
    moveEnemyToward(
      enemy,
      enemy.alertX,
      enemy.alertY,
      speed,
      dt
    );
  }else{
    enemy.searchTimer=Math.max(
      0,
      enemy.searchTimer-dt
    );

    if(enemy.searchTimer<=0){
      enemy.searchTimer=2.5;
      enemy.alertRole="guard";
    }
  }

  return true;
}

function moveEnemyToward(enemy,targetX,targetY,speed,dt){
  const dx=targetX-enemy.x;
  const dy=targetY-enemy.y;
  const distance=Math.hypot(dx,dy)||1;

  if(distance<=1)return true;

  const dirX=dx/distance;
  const dirY=dy/distance;

  enemy.facingX=dirX;
  enemy.facingY=dirY;

  const step=Math.min(
    speed*dt,
    distance
  );

  const candidates=[
    {x:dirX,y:dirY},
    {x:-dirY,y:dirX},
    {x:dirY,y:-dirX},
    {x:-dirX,y:-dirY}
  ];

  for(const dir of candidates){
    const nx=enemy.x+dir.x*step;
    const ny=enemy.y+dir.y*step;

    if(!blocked({
      x:nx,
      y:ny,
      r:enemy.r
    })){
      enemy.x=nx;
      enemy.y=ny;

      enemy.facingX=dir.x;
      enemy.facingY=dir.y;

      return false;
    }
  }

  return false;
}

function update(dt){
  window.EFRErrorHandler?.setContext?.({
    phase:"探索実行",
    file:"game.js",
    operation:"update"
  });
  window.EFRErrorHandler?.beat?.();

  window.EFRHooks?.update?.(dt);
  window.EFRPet?.update?.(dt);
  window.EFRMagic?.updateProjectiles?.(dt);
  let dx=stick.x;
  let dy=stick.y;

  if(Math.abs(dx)<.08)dx=0;
  if(Math.abs(dy)<.08)dy=0;

  if(dx || dy){
    const length=Math.hypot(dx,dy);
    const scale=Math.min(1,length);

    /*
     * 移動方向と照準方向を分離する。
     * 右指で照準中は、左スティックの移動方向で
     * player.facing を上書きしない。
     */
    if(!efrAim.active && !efrLook.active){
      player.facingX=dx/Math.max(1,length);
      player.facingY=dy/Math.max(1,length);
    }

    movePlayer(
      dx/Math.max(1,length)*scale,
      dy/Math.max(1,length)*scale,
      player.speed*dt
    );

    noiseStepTimer-=dt;

    if(noiseStepTimer<=0){
      emitNoise(
        player.x,
        player.y,
        70,
        "movement"
      );
      noiseStepTimer=.55;
    }
  }else{
    noiseStepTimer=0;
  }

  player.inside=currentBuilding();

  processNoiseEvents();

  for(const enemy of enemies){
    if(enemy.dead)continue;

    if(window.EFRTraining?.isActive?.()){
      continue;
    }

    const dx=player.x-enemy.x;
    const dy=player.y-enemy.y;
    const d=Math.hypot(dx,dy)||1;

    let speed=enemy.speed;

    if(
      Number(enemy.efrPetDebuffSpeedMultiplier||1)<1
    ){
      speed*=
        Number(enemy.efrPetDebuffSpeedMultiplier||1);
    }

    if(player.inside){
      if(
        enemy.buildingId!==null &&
        player.inside.id!==enemy.buildingId
      ){
        speed*=.18;
      }else{
        speed*=.8;
      }
    }

    const seesPlayer=enemyCanSeePlayer(enemy);

    if(seesPlayer){
      enemy.alerted=true;
      enemy.lastSeenX=player.x;
      enemy.lastSeenY=player.y;
      enemy.alertX=player.x;
      enemy.alertY=player.y;
      enemy.alertConfidence=1;
      enemy.alertTimer=ALERT_DURATION;
      enemy.alertRole="investigate";
      enemy.alertSource=enemy;

      enemy.alertShareTimer=Math.max(
        0,
        (enemy.alertShareTimer||0)-dt
      );

      if(enemy.alertShareTimer<=0){
        shareEnemyAlert(enemy);
        enemy.alertShareTimer=1.5;
      }

      enemy.facingX=dx/d;
      enemy.facingY=dy/d;

      moveEnemyToward(
        enemy,
        player.x,
        player.y,
        speed,
        dt
      );
    }else{
      updateAlertedEnemy(
        enemy,
        dt,
        speed
      );
    }

    if(
      d<enemy.r+player.r+4 &&
      damageTimer<=0
    ){
      const armor=equippedArmor();

      const hitSlot=
        window.EFRDurability?.resolveHitLocation?.() ||
        "chest";

      const hitReduction=
        window.EFRDurability?.getArmorReduction?.(
          hitSlot
        ) ?? 0;

      let incomingDamage=
        Math.max(
          1,
          10-hitReduction
        );

      if(
        Number(enemy.efrPetDebuffAttackMultiplier||1)<1
      ){
        incomingDamage=
          Math.max(
            1,
            Math.round(
              incomingDamage*
              Number(
                enemy.efrPetDebuffAttackMultiplier||1
              )
            )
          );
      }

      if(
        (player.petSurvivalTimer||0)>0
      ){
        incomingDamage=
          Math.max(
            1,
            Math.round(
              incomingDamage*.75
            )
          );

        /*
         * 生存本能中は致死ダメージを1回だけ
         * HP1で耐える。
         */
        if(
          !player.petSurvivalGuardUsed &&
          player.hp-incomingDamage<=0
        ){
          incomingDamage=
            Math.max(
              0,
              player.hp-1
            );

          player.petSurvivalGuardUsed=true;
        }
      }

      player.hp-=incomingDamage;

      // 実際の被弾部位だけ防御値を適用し、
      // 同じ部位の防具だけ耐久を1減らす。
      window.EFRDurability?.damageArmor?.(
        1,
        hitSlot
      );

      damageTimer=.65;
    }
  }
  damageTimer=Math.max(
    0,
    damageTimer-dt
  );

  updateDamageNumbers(dt);

  attackTimer=Math.max(
    0,
    attackTimer-dt
  );

  /*
   * 射撃継続はpointermoveではなくゲーム更新側で処理する。
   * これにより、攻撃ボタンを押したまま右指を動かしても
   * 照準更新と射撃間隔を独立して維持できる。
   */
  if(efrFire.active){
    attack();
  }

  attackFlash=Math.max(
    0,
    attackFlash-dt
  );

  updateInteraction();

  if(player.hp<=0){
    finish(
      false,
      "力尽きました。今回の戦利品は失われました。"
    );
    return;
  }

  updateCamera();

  if(
    player.x>exit.x &&
    player.y>exit.y &&
    player.y<exit.y+exit.h
  ){
    finish(
      true,
      "脱出成功。戦利品を拠点へ持ち帰りました。"
    );
  }
}

function drawGroundDecorations(){
  const startX=Math.floor(camera.x/80)*80;
  const startY=Math.floor(camera.y/80)*80;

  for(let y=startY;y<camera.y+CAMERA_VIEW_H+80;y+=80){
    for(let x=startX;x<camera.x+CAMERA_VIEW_W+80;x+=80){
      const seed=Math.abs(
        Math.sin(x*12.9898+y*78.233)*43758.5453
      );
      const n=seed-Math.floor(seed);

      const px=x+12+n*52;
      const py=y+18+(seed*31%1)*42;

      if(n<.34){
        ctx.fillStyle="rgba(0,0,0,.18)";
        ctx.beginPath();
        ctx.ellipse(px+2,py+5,10,5,.15,0,Math.PI*2);
        ctx.fill();

        ctx.fillStyle="#3a4036";
        ctx.beginPath();
        ctx.moveTo(px-7,py+4);
        ctx.lineTo(px-3,py-5);
        ctx.lineTo(px+5,py-8);
        ctx.lineTo(px+9,py+1);
        ctx.lineTo(px+3,py+7);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle="rgba(111,119,104,.26)";
        ctx.lineWidth=1;
        ctx.beginPath();
        ctx.moveTo(px-2,py-2);
        ctx.lineTo(px+4,py+3);
        ctx.stroke();
      }else if(n<.62){
        ctx.strokeStyle="rgba(93,126,75,.50)";
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.moveTo(px,py+8);
        ctx.lineTo(px-2,py);
        ctx.moveTo(px,py+8);
        ctx.lineTo(px+5,py+2);
        ctx.moveTo(px,py+7);
        ctx.lineTo(px-5,py+3);
        ctx.stroke();

        ctx.strokeStyle="rgba(133,158,92,.24)";
        ctx.lineWidth=1;
        ctx.beginPath();
        ctx.moveTo(px+2,py+8);
        ctx.lineTo(px+7,py+4);
        ctx.stroke();
      }else if(n<.77){
        ctx.save();
        ctx.shadowBlur=5;
        ctx.shadowColor="rgba(83,190,171,.12)";
        ctx.strokeStyle="rgba(79,116,105,.30)";
        ctx.lineWidth=1;
        ctx.beginPath();
        ctx.arc(px,py,8,0,Math.PI*2);
        ctx.moveTo(px-5,py);
        ctx.lineTo(px+5,py);
        ctx.moveTo(px,py-5);
        ctx.lineTo(px,py+5);
        ctx.stroke();
        ctx.restore();
      }else{
        ctx.strokeStyle="rgba(158,150,127,.12)";
        ctx.lineWidth=1;
        ctx.beginPath();
        ctx.moveTo(px-12,py+5);
        ctx.lineTo(px-3,py+2);
        ctx.lineTo(px+5,py+7);
        ctx.stroke();
      }
    }
  }

  for(let i=0;i<world.buildings.length;i++){
    const b=world.buildings[i];

    if(i%4!==1)continue;

    const cx=b.x+b.w-24;
    const cy=b.y+24;

    ctx.save();
    ctx.shadowBlur=10;
    ctx.shadowColor="rgba(85,210,190,.28)";
    ctx.fillStyle="#4aa99c";

    ctx.beginPath();
    ctx.moveTo(cx,cy-13);
    ctx.lineTo(cx+7,cy-3);
    ctx.lineTo(cx+5,cy+10);
    ctx.lineTo(cx,cy+15);
    ctx.lineTo(cx-6,cy+8);
    ctx.lineTo(cx-8,cy-4);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur=0;
    ctx.strokeStyle="#9be6d7";
    ctx.stroke();
    ctx.restore();
  }
}

function drawBuilding(building){
  const inside=player.inside===building;

  ctx.save();

  ctx.fillStyle="rgba(0,0,0,.28)";
  ctx.beginPath();
  ctx.moveTo(building.x+9,building.y+13);
  ctx.lineTo(building.x+building.w+6,building.y+8);
  ctx.lineTo(building.x+building.w+10,building.y+building.h+9);
  ctx.lineTo(building.x+5,building.y+building.h+14);
  ctx.closePath();
  ctx.fill();

  const wall=inside ? "#6d665b" : building.color;
  ctx.fillStyle=wall;
  ctx.beginPath();
  ctx.moveTo(building.x+3,building.y+5);
  ctx.lineTo(building.x+building.w-8,building.y+1);
  ctx.lineTo(building.x+building.w,building.y+9);
  ctx.lineTo(building.x+building.w-4,building.y+building.h-7);
  ctx.lineTo(building.x+building.w-13,building.y+building.h);
  ctx.lineTo(building.x+8,building.y+building.h-3);
  ctx.lineTo(building.x,building.y+building.h-12);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle=inside
    ? "#c9bfa9"
    : "rgba(214,201,171,.34)";
  ctx.lineWidth=2;
  ctx.stroke();

  /*
   * 建物の視覚情報を強化する。
   * 衝突・探索・保存データには変更を加えない。
   */
  ctx.save();

  if(inside){
    ctx.strokeStyle="rgba(229,217,190,.14)";
    ctx.lineWidth=1;

    for(
      let tx=building.x+28;
      tx<building.x+building.w-20;
      tx+=28
    ){
      ctx.beginPath();
      ctx.moveTo(tx,building.y+19);
      ctx.lineTo(tx,building.y+building.h-19);
      ctx.stroke();
    }

    for(
      let ty=building.y+28;
      ty<building.y+building.h-20;
      ty+=28
    ){
      ctx.beginPath();
      ctx.moveTo(building.x+19,ty);
      ctx.lineTo(building.x+building.w-19,ty);
      ctx.stroke();
    }

    ctx.fillStyle="rgba(28,31,29,.24)";
    ctx.fillRect(
      building.x+building.w*.5-18,
      building.y+14,
      36,
      5
    );
  }else{
    ctx.fillStyle="rgba(243,232,205,.10)";
    ctx.beginPath();
    ctx.moveTo(building.x+8,building.y+6);
    ctx.lineTo(building.x+building.w-11,building.y+2);
    ctx.lineTo(building.x+building.w-15,building.y+11);
    ctx.lineTo(building.x+12,building.y+15);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle="rgba(48,51,47,.32)";
    ctx.lineWidth=1;

    const seamStep=Math.max(
      42,
      Math.floor(building.w/4)
    );

    for(
      let sx=building.x+seamStep;
      sx<building.x+building.w-12;
      sx+=seamStep
    ){
      ctx.beginPath();
      ctx.moveTo(sx,building.y+20);
      ctx.lineTo(sx+1,building.y+building.h-24);
      ctx.stroke();
    }

    ctx.fillStyle="rgba(37,42,39,.62)";
    ctx.fillRect(
      building.x+building.w*.5-17,
      building.y+13,
      34,
      6
    );

    ctx.fillStyle="rgba(191,202,195,.24)";
    ctx.fillRect(
      building.x+building.w*.5-11,
      building.y+14,
      22,
      2
    );
  }

  ctx.restore();

  if(inside){
    ctx.fillStyle="#817866";
    ctx.fillRect(
      building.x+17,
      building.y+17,
      building.w-34,
      building.h-34
    );

    ctx.strokeStyle="#c8b995";
    ctx.strokeRect(
      building.x+17,
      building.y+17,
      building.w-34,
      building.h-34
    );

    ctx.fillStyle="rgba(38,35,31,.26)";
    ctx.fillRect(
      building.x+22,
      building.y+22,
      building.w-44,
      7
    );

    ctx.strokeStyle="rgba(226,211,178,.18)";
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(
      building.x+25,
      building.y+building.h-27
    );
    ctx.lineTo(
      building.x+building.w-25,
      building.y+building.h-27
    );
    ctx.stroke();
  }else{
    const windowCount=Math.max(
      2,
      Math.floor(building.w/55)
    );

    for(let i=0;i<windowCount;i++){
      const wx=
        building.x+
        20+
        i*((building.w-45)/Math.max(1,windowCount-1));

      const wy=building.y+58;

      ctx.fillStyle=i%2
        ? "#38515a"
        : "#33464d";

      ctx.fillRect(wx-8,wy-6,16,11);

      ctx.strokeStyle="rgba(185,220,218,.32)";
      ctx.strokeRect(wx-8,wy-6,16,11);

      ctx.strokeStyle="rgba(220,239,231,.18)";
      ctx.lineWidth=1;
      ctx.beginPath();
      ctx.moveTo(wx-7,wy-5);
      ctx.lineTo(wx+6,wy+4);
      ctx.stroke();
    }

    ctx.fillStyle="rgba(40,43,42,.30)";
    ctx.fillRect(
      building.x+12,
      building.y+building.h-18,
      building.w-24,
      5
    );

    ctx.fillStyle=building.locked
      ? "#72544a"
      : "#d8a23a";

    ctx.beginPath();
    ctx.roundRect(
      building.door.x,
      building.door.y,
      building.door.w,
      building.door.h,
      5
    );
    ctx.fill();

    ctx.strokeStyle=building.locked
      ? "#c88d78"
      : "rgba(255,239,190,.46)";
    ctx.lineWidth=1.5;
    ctx.stroke();

    ctx.fillStyle=building.locked
      ? "#f0b66e"
      : "#f4df9b";
    ctx.fillRect(
      building.door.x+5,
      building.door.y+7,
      4,
      4
    );

    if(building.locked){
      const lockX=
        building.door.x+
        building.door.w*.5;

      const lockY=
        building.door.y+12;

      ctx.strokeStyle="#f4d7a0";
      ctx.lineWidth=1.5;

      ctx.strokeRect(
        lockX-4,
        lockY-2,
        8,
        7
      );

      ctx.beginPath();
      ctx.arc(
        lockX,
        lockY-2,
        3.5,
        Math.PI,
        Math.PI*2
      );
      ctx.stroke();

      ctx.fillStyle="#f4d7a0";
      ctx.beginPath();
      ctx.arc(
        lockX,
        lockY+1,
        1.2,
        0,
        Math.PI*2
      );
      ctx.fill();
    }

    if(building.id%3===0){
      ctx.strokeStyle="rgba(83,211,184,.55)";
      ctx.lineWidth=1.5;

      ctx.beginPath();
      ctx.arc(
        building.x+building.w-28,
        building.y+building.h-27,
        13,
        0,
        Math.PI*2
      );
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(
        building.x+building.w-38,
        building.y+building.h-27
      );
      ctx.lineTo(
        building.x+building.w-18,
        building.y+building.h-27
      );
      ctx.moveTo(
        building.x+building.w-28,
        building.y+building.h-37
      );
      ctx.lineTo(
        building.x+building.w-28,
        building.y+building.h-17
      );
      ctx.stroke();
    }
  }

  ctx.fillStyle=inside
    ? "#f0dfb8"
    : "#c7c0b1";

  ctx.font="bold 12px sans-serif";
  ctx.fillText(
    building.name,
    building.x+18,
    building.y+37
  );

  ctx.restore();
}

function drawContainerSprite(container){
  const x=container.x;
  const y=container.y;
  const type=String(container.type||"");
  const searched=!!container.searched;

  ctx.save();

  ctx.fillStyle="rgba(0,0,0,.28)";
  ctx.beginPath();
  ctx.ellipse(
    x,
    y+11,
    type==="机" || type==="車" ? 21 : 15,
    5,
    0,
    0,
    Math.PI*2
  );
  ctx.fill();

  ctx.translate(x,y);

  if(
    (container.efrPetScentTimer||0)>0 ||
    (container.efrPetMarked||false)
  ){
    const pulse=
      .5+
      .5*Math.sin(
        performance.now()*.008
      );

    ctx.strokeStyle=
      container.efrPetMarked
        ? `rgba(105,205,255,${.65+.25*pulse})`
        : `rgba(245,205,92,${.60+.25*pulse})`;

    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.arc(
      0,
      0,
      18+3*pulse,
      0,
      Math.PI*2
    );
    ctx.stroke();
  }

  if(type==="箱"){
    ctx.fillStyle=searched ? "#55483a" : "#806548";
    ctx.strokeStyle=searched ? "rgba(192,170,139,.28)" : "#b9966b";
    ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.roundRect(-13,-10,26,20,3);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle="rgba(46,35,26,.65)";
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(-9,-7);
    ctx.lineTo(9,7);
    ctx.moveTo(9,-7);
    ctx.lineTo(-9,7);
    ctx.stroke();
    ctx.fillStyle="#c8a46e";
    ctx.fillRect(-2,-2,4,4);
  }else if(type==="ロッカー"){
    ctx.fillStyle=searched ? "#4c5558" : "#657176";
    ctx.strokeStyle="#a9b6b8";
    ctx.lineWidth=1.4;
    ctx.beginPath();
    ctx.roundRect(-10,-15,20,30,2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle="rgba(27,34,36,.65)";
    ctx.beginPath();
    ctx.moveTo(0,-13);
    ctx.lineTo(0,13);
    ctx.stroke();
    ctx.fillStyle="#d1b76e";
    ctx.fillRect(-4,-3,2,5);
    ctx.fillRect(2,-3,2,5);
  }else if(type==="机"){
    ctx.fillStyle=searched ? "#4b4038" : "#705b49";
    ctx.strokeStyle="#b18d6d";
    ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.roundRect(-17,-7,34,10,2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle=searched ? "#3c3430" : "#5c493b";
    ctx.fillRect(-13,3,4,10);
    ctx.fillRect(9,3,4,10);
    ctx.fillStyle="#c7a65f";
    ctx.fillRect(-3,-5,6,3);
  }else if(type==="棚"){
    ctx.fillStyle=searched ? "#4a4139" : "#66594c";
    ctx.strokeStyle="#a9957d";
    ctx.lineWidth=1.4;
    ctx.beginPath();
    ctx.roundRect(-14,-15,28,30,2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle="rgba(218,199,168,.34)";
    ctx.beginPath();
    ctx.moveTo(-11,-6);
    ctx.lineTo(11,-6);
    ctx.moveTo(-11,3);
    ctx.lineTo(11,3);
    ctx.stroke();
    ctx.fillStyle="#8b7762";
    ctx.fillRect(-17,-14,3,28);
    ctx.fillRect(14,-14,3,28);
    ctx.fillStyle="#c0a77f";
    ctx.fillRect(-9,-12,7,3);
    ctx.fillRect(3,-3,7,3);
    ctx.fillRect(-9,6,7,3);
  }else if(type==="工具箱"){
    ctx.fillStyle=searched ? "#62483d" : "#9b4033";
    ctx.strokeStyle="#c9a17c";
    ctx.lineWidth=1.4;
    ctx.beginPath();
    ctx.roundRect(-14,-7,28,15,3);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle="#d2b48a";
    ctx.beginPath();
    ctx.moveTo(-7,-7);
    ctx.lineTo(-5,-12);
    ctx.lineTo(5,-12);
    ctx.lineTo(7,-7);
    ctx.stroke();
    ctx.fillStyle="#d5b65f";
    ctx.fillRect(-2,-2,4,3);
  }else if(type==="キャビネット"){
    ctx.fillStyle=searched ? "#4a4642" : "#77726b";
    ctx.strokeStyle="#b7b0a4";
    ctx.lineWidth=1.3;
    ctx.beginPath();
    ctx.roundRect(-12,-15,24,30,2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle="rgba(36,36,36,.55)";
    for(let row=-10;row<=7;row+=9){
      ctx.beginPath();
      ctx.moveTo(-9,row);
      ctx.lineTo(9,row);
      ctx.stroke();
      ctx.fillStyle="#c7b778";
      ctx.fillRect(-1,row+2,2,3);
    }
  }else if(type==="車"){
    ctx.fillStyle=searched ? "#414b52" : "#596d78";
    ctx.strokeStyle="#b3c1c6";
    ctx.lineWidth=1.3;
    ctx.beginPath();
    ctx.roundRect(-19,-9,38,18,5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle="#25323a";
    ctx.beginPath();
    ctx.roundRect(-9,-6,18,12,3);
    ctx.fill();
    ctx.fillStyle="#161b1d";
    ctx.fillRect(-18,-10,5,4);
    ctx.fillRect(13,-10,5,4);
    ctx.fillRect(-18,6,5,4);
    ctx.fillRect(13,6,5,4);
    ctx.fillStyle="#d7c56e";
    ctx.fillRect(16,-2,2,4);
  }

  if(!searched){
    const pulse=.5+.5*Math.sin(
      performance.now()*.003+x*.03+y*.02
    );

    ctx.strokeStyle=
      `rgba(222,205,150,${.18+.16*pulse})`;
    ctx.lineWidth=1;

    ctx.beginPath();
    ctx.arc(
      0,
      0,
      type==="机" || type==="車" ? 22 : 18,
      0,
      Math.PI*2
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawItemSprite(item){
  const x=item.x;
  const y=item.y;
  const name=String(item.name||item.type||"");
  const kind=item.kind||"";
  const pulse=.5+.5*Math.sin(performance.now()*.004+x*.03+y*.02);
  const bob=Math.sin(performance.now()*.003+x*.02)*1.5;

  ctx.save();
  ctx.translate(x,y+bob);

  if(item.efrPetMarked){
    const pulse=
      .5+
      .5*Math.sin(
        performance.now()*.008
      );

    ctx.strokeStyle=
      `rgba(105,205,255,${.65+.25*pulse})`;
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.arc(
      0,
      0,
      15+3*pulse,
      0,
      Math.PI*2
    );
    ctx.stroke();
  }

  ctx.fillStyle="rgba(0,0,0,.24)";
  ctx.beginPath();
  ctx.ellipse(0,11,9,3.5,0,0,Math.PI*2);
  ctx.fill();

  ctx.shadowBlur=7;
  ctx.shadowColor=
    kind==="weapon" || kind==="firearm"
      ? "rgba(225,151,82,.28)"
      : kind==="blueprint"
        ? "rgba(106,187,230,.30)"
        : name.includes("魔力")
          ? `rgba(105,118,255,${.30+.14*pulse})`
          : "rgba(220,194,105,.20)";

  if(
    name.includes("魔力") ||
    name.includes("結晶") ||
    name.includes("魔")
  ){
    ctx.fillStyle=`rgba(125,105,235,${.06+.08*pulse})`;
    ctx.beginPath();
    ctx.arc(0,0,16+3*pulse,0,Math.PI*2);
    ctx.fill();
  }

  if(kind==="weapon" || kind==="firearm"){
    ctx.strokeStyle="#d7d0c1";
    ctx.lineWidth=4;
    ctx.lineCap="round";

    if(
      name.includes("ナイフ") ||
      name.includes("マチェット") ||
      name.includes("手斧") ||
      name.includes("鉄パイプ")
    ){
      ctx.beginPath();
      ctx.moveTo(-10,8);
      ctx.lineTo(8,-9);
      ctx.stroke();

      ctx.strokeStyle="#8d5f42";
      ctx.lineWidth=5;
      ctx.beginPath();
      ctx.moveTo(-11,9);
      ctx.lineTo(-3,1);
      ctx.stroke();
    }else{
      ctx.beginPath();
      ctx.moveTo(-12,3);
      ctx.lineTo(5,3);
      ctx.lineTo(11,-1);
      ctx.stroke();

      ctx.strokeStyle="#8a684d";
      ctx.lineWidth=5;
      ctx.beginPath();
      ctx.moveTo(-7,4);
      ctx.lineTo(-12,11);
      ctx.stroke();

      ctx.strokeStyle="#c9c1b1";
      ctx.lineWidth=3;
      ctx.beginPath();
      ctx.moveTo(2,3);
      ctx.lineTo(9,-5);
      ctx.stroke();
    }
  }else if(kind==="armor"){
    if(
      item.slotType==="head" ||
      name.includes("ヘルメット")
    ){
      ctx.fillStyle="#6d7984";
      ctx.beginPath();
      ctx.arc(0,-2,9,Math.PI,Math.PI*2);
      ctx.lineTo(8,6);
      ctx.lineTo(-8,6);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle="#d1d8dc";
      ctx.stroke();
    }else if(item.slotType==="legs"){
      ctx.strokeStyle="#6d7984";
      ctx.lineWidth=5;
      ctx.beginPath();
      ctx.moveTo(-5,-5);
      ctx.lineTo(-5,8);
      ctx.moveTo(5,-5);
      ctx.lineTo(5,8);
      ctx.stroke();
    }else{
      ctx.fillStyle="#596875";
      ctx.beginPath();
      ctx.moveTo(-9,-7);
      ctx.lineTo(9,-7);
      ctx.lineTo(7,8);
      ctx.lineTo(-7,8);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle="#b7c5cc";
      ctx.stroke();

      ctx.strokeStyle="#303941";
      ctx.beginPath();
      ctx.moveTo(0,-6);
      ctx.lineTo(0,7);
      ctx.stroke();
    }
  }else if(kind==="backpack"){
    ctx.fillStyle="#59604f";
    ctx.beginPath();
    ctx.roundRect(-8,-10,16,20,4);
    ctx.fill();
    ctx.strokeStyle="#a6aa8d";
    ctx.stroke();
    ctx.fillStyle="#777e67";
    ctx.fillRect(-5,-5,10,5);
    ctx.strokeStyle="#2e332d";
    ctx.strokeRect(-5,-5,10,5);
  }else if(kind==="ammo"){
    ctx.fillStyle="#b6a27b";
    ctx.fillRect(-9,-6,18,12);
    ctx.fillStyle="#d7c89e";
    for(let i=-6;i<=6;i+=4){
      ctx.beginPath();
      ctx.arc(i,-1,1.7,0,Math.PI*2);
      ctx.fill();
    }
    ctx.strokeStyle="#6d6250";
    ctx.strokeRect(-9,-6,18,12);
  }else if(
    kind==="heal" ||
    kind==="mpRestore"
  ){
    ctx.fillStyle=
      kind==="mpRestore"
        ? "#6575d7"
        : "#d8d7d0";

    ctx.beginPath();
    ctx.roundRect(-7,-9,14,18,4);
    ctx.fill();

    ctx.strokeStyle=
      kind==="mpRestore"
        ? "#c0c9ff"
        : "#8c9a91";
    ctx.stroke();

    ctx.strokeStyle="#e9eeee";
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(-3,0);
    ctx.lineTo(3,0);
    ctx.moveTo(0,-3);
    ctx.lineTo(0,3);
    ctx.stroke();
  }else if(kind==="blueprint"){
    ctx.fillStyle="#d7e3e8";
    ctx.fillRect(-9,-11,18,22);
    ctx.strokeStyle="#6b9db1";
    ctx.strokeRect(-9,-11,18,22);

    ctx.strokeStyle="#5f8190";
    ctx.lineWidth=1;
    ctx.beginPath();
    ctx.moveTo(-5,-5);
    ctx.lineTo(5,-5);
    ctx.moveTo(-5,0);
    ctx.lineTo(6,0);
    ctx.moveTo(-5,5);
    ctx.lineTo(2,5);
    ctx.stroke();
  }else if(
    name.includes("魔") ||
    name.includes("杖") ||
    name.includes("結晶")
  ){
    ctx.fillStyle="#806ee6";
    ctx.beginPath();
    ctx.moveTo(0,-12);
    ctx.lineTo(7,0);
    ctx.lineTo(0,12);
    ctx.lineTo(-7,0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle="#d7d0ff";
    ctx.stroke();

    ctx.fillStyle="#9de6d7";
    ctx.beginPath();
    ctx.arc(0,0,3,0,Math.PI*2);
    ctx.fill();
  }else{
    ctx.fillStyle=
      kind==="loot"
        ? "#b48748"
        : kind==="material"
          ? "#8b9a9c"
          : "#aa9270";

    ctx.beginPath();
    ctx.moveTo(-8,-5);
    ctx.lineTo(-2,-9);
    ctx.lineTo(8,-5);
    ctx.lineTo(6,7);
    ctx.lineTo(-7,8);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle="#d1c3a4";
    ctx.stroke();
  }

  /*
   * アイテムのレアリティを、既存のrarity値だけから
   * 視覚的に補助表示する。データ値そのものは変更しない。
   */
  if(
    kind==="weapon" ||
    kind==="firearm" ||
    kind==="armor" ||
    kind==="backpack"
  ){
    const rarity=Math.min(
      5,
      Math.max(1,Number(item.rarity||1))
    );

    const rarityAlpha=
      .18 + rarity*.045;

    ctx.shadowBlur=8+rarity*2;
    ctx.shadowColor=
      `rgba(235,205,120,${rarityAlpha})`;

    ctx.strokeStyle=
      `rgba(245,220,155,${.28+rarity*.08})`;

    ctx.lineWidth=1;

    ctx.beginPath();
    ctx.arc(
      0,
      0,
      14+rarity*.7,
      0,
      Math.PI*2
    );
    ctx.stroke();

    if(rarity>=4){
      ctx.strokeStyle=
        `rgba(225,235,255,${.18+rarity*.04})`;

      ctx.beginPath();
      ctx.arc(
        0,
        0,
        18+rarity,
        -Math.PI*.35,
        Math.PI*.35
      );
      ctx.stroke();
    }
  }

  ctx.shadowBlur=0;
  ctx.restore();
}

function drawEnemySprite(enemy){
  const x=enemy.x;
  const y=enemy.y;
  const angle=Math.atan2(
    enemy.facingY||0,
    enemy.facingX||1
  );

  ctx.save();

  ctx.fillStyle="rgba(0,0,0,.30)";
  ctx.beginPath();
  ctx.ellipse(
    0,
    12,
    enemy.visualType==="arcane" ? 13 : 11,
    5,
    0,
    0,
    Math.PI*2
  );
  ctx.fill();
  ctx.translate(x,y);
  ctx.rotate(angle);

  if(
    enemy.efrPetMarked &&
    !enemy.dead
  ){
    const pulse=
      .5+
      .5*Math.sin(
        performance.now()*.008
      );

    ctx.strokeStyle=
      `rgba(105,205,255,${.70+.25*pulse})`;
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.arc(
      0,
      0,
      22+3*pulse,
      0,
      Math.PI*2
    );
    ctx.stroke();
  }

  if(enemy.dead){
    ctx.rotate(-.35);
    ctx.fillStyle="#493532";
    ctx.beginPath();
    ctx.ellipse(0,5,18,8,0,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle="#6a4b42";
    ctx.beginPath();
    ctx.arc(-12,2,6,0,Math.PI*2);
    ctx.fill();

    ctx.restore();
    return;
  }

  if(enemy.visualType==="arcane"){
    const glow=.5+.5*Math.sin(
      performance.now()*.005+x*.03
    );

    ctx.shadowBlur=14+8*glow;
    ctx.shadowColor=`rgba(154,95,235,${.20+.16*glow})`;

    ctx.fillStyle=enemy.alerted
      ? "#c36ee6"
      : "#7457a8";

    ctx.beginPath();
    ctx.moveTo(0,-17);
    ctx.lineTo(10,-8);
    ctx.lineTo(13,8);
    ctx.lineTo(5,17);
    ctx.lineTo(-8,14);
    ctx.lineTo(-13,0);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur=0;

    ctx.fillStyle="#d8f5ef";
    ctx.beginPath();
    ctx.arc(3,-6,3,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle=`rgba(157,230,215,${.16+.18*glow})`;
    ctx.beginPath();
    ctx.arc(3,-6,7+2*glow,0,Math.PI*2);
    ctx.fill();

    ctx.strokeStyle="#8ce2d0";
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(8,8);
    ctx.lineTo(15,13);
    ctx.moveTo(-8,8);
    ctx.lineTo(-15,13);
    ctx.stroke();
  }else{
    ctx.fillStyle=
      enemy.role==="sniper"
        ? "#4b5664"
        : enemy.role==="rifle"
          ? "#58634f"
          : enemy.role==="scout"
            ? "#665a49"
            : "#704c42";

    ctx.beginPath();
    ctx.moveTo(-9,-5);
    ctx.lineTo(-7,9);
    ctx.lineTo(-3,15);
    ctx.lineTo(3,15);
    ctx.lineTo(8,8);
    ctx.lineTo(9,-5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle="#b99374";
    ctx.beginPath();
    ctx.arc(0,-11,6,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle="#343a3d";
    ctx.beginPath();
    ctx.arc(0,-13,7,Math.PI,Math.PI*2);
    ctx.fill();

    ctx.strokeStyle="#c5b8a1";
    ctx.lineWidth=3;
    ctx.beginPath();

    if(enemy.role==="sniper"){
      ctx.moveTo(3,1);
      ctx.lineTo(21,1);
    }else{
      ctx.moveTo(3,2);
      ctx.lineTo(15,2);
    }

    ctx.stroke();

    ctx.strokeStyle="#2e3536";
    ctx.lineWidth=4;
    ctx.beginPath();
    ctx.moveTo(-5,7);
    ctx.lineTo(-9,16);
    ctx.moveTo(5,7);
    ctx.lineTo(9,16);
    ctx.stroke();
  }

  if(enemy.alerted){
    ctx.strokeStyle="#e4a24c";
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.arc(0,0,21,0,Math.PI*2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPlayerSprite(){
  const angle=Math.atan2(
    player.facingY,
    player.facingX
  );

  ctx.save();

  ctx.fillStyle="rgba(0,0,0,.34)";
  ctx.beginPath();
  ctx.ellipse(
    player.x,
    player.y+13,
    12,
    5,
    0,
    0,
    Math.PI*2
  );
  ctx.fill();
  ctx.translate(player.x,player.y);
  ctx.rotate(angle);

  ctx.fillStyle="#4f8fe8";
  ctx.beginPath();
  ctx.moveTo(-8,-7);
  ctx.lineTo(8,-7);
  ctx.lineTo(10,7);
  ctx.lineTo(4,13);
  ctx.lineTo(-4,13);
  ctx.lineTo(-10,7);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle="rgba(221,236,255,.40)";
  ctx.lineWidth=1.5;
  ctx.stroke();

  ctx.fillStyle="#d4aa86";
  ctx.beginPath();
  ctx.arc(0,-11,6,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle="#343d43";
  ctx.beginPath();
  ctx.arc(0,-13,7,Math.PI,Math.PI*2);
  ctx.fill();

  /*
   * プレイヤーの装備シルエットを少し強調する。
   * 実際の武器処理・装備データには介入しない。
   */
  const weapon=equippedWeapon();
  const weaponName=String(
    weapon?.name||""
  );

  if(
    weapon?.magicStaff ||
    weaponName.includes("杖") ||
    weaponName.includes("魔")
  ){
    ctx.strokeStyle="#9b8cff";
    ctx.lineWidth=2.5;
    ctx.shadowBlur=9;
    ctx.shadowColor="rgba(130,105,255,.42)";

    ctx.beginPath();
    ctx.moveTo(7,1);
    ctx.lineTo(21,-7);
    ctx.stroke();

    ctx.fillStyle="#c9c0ff";
    ctx.beginPath();
    ctx.arc(22,-8,3,0,Math.PI*2);
    ctx.fill();
  }else if(
    weapon?.kind==="firearm" ||
    weapon?.kind==="weapon"
  ){
    ctx.strokeStyle="#e1e8ef";
    ctx.lineWidth=3.2;

    ctx.beginPath();
    ctx.moveTo(6,0);
    ctx.lineTo(19,0);
    ctx.stroke();

    ctx.strokeStyle="#59636c";
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(9,2);
    ctx.lineTo(12,6);
    ctx.stroke();
  }else{
    ctx.strokeStyle="#d0d7dc";
    ctx.lineWidth=2.5;

    ctx.beginPath();
    ctx.moveTo(6,1);
    ctx.lineTo(15,1);
    ctx.stroke();
  }

  ctx.shadowBlur=0;

  /*
   * プレイヤー中心の小さな反射ハイライト。
   * 視認性を上げるだけで当たり判定は変更しない。
   */
  ctx.fillStyle="rgba(225,239,255,.20)";
  ctx.beginPath();
  ctx.arc(-3,-7,2,0,Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function draw(){
  window.EFRErrorHandler?.setContext?.({
    phase:"探索描画",
    file:"game.js",
    operation:"draw"
  });

  updateCamera();

  ctx.clearRect(0,0,W,H);

  ctx.fillStyle="#252a23";
  ctx.fillRect(0,0,W,H);

  ctx.save();

  /*
   * ワールド描画だけを1.5倍にする。
   * 画面中央をカメラの中心として扱うため、
   * プレイヤー周辺の表示密度を上げながら
   * HUDや操作UIには倍率を伝播させない。
   */
  ctx.translate(W/2,H/2);
  ctx.scale(CAMERA_ZOOM,CAMERA_ZOOM);
  ctx.translate(
    -camera.x-CAMERA_VIEW_W/2,
    -camera.y-CAMERA_VIEW_H/2
  );

  drawGroundDecorations();

  ctx.strokeStyle="#30372d";

  const gridStartX=Math.floor(camera.x/40)*40;
  const gridStartY=Math.floor(camera.y/40)*40;
  const gridEndX=camera.x+CAMERA_VIEW_W+40;
  const gridEndY=camera.y+CAMERA_VIEW_H+40;

  for(let x=gridStartX;x<gridEndX;x+=40){
    ctx.beginPath();
    ctx.moveTo(x,Math.max(0,camera.y));
    ctx.lineTo(x,Math.min(WORLD_H,gridEndY));
    ctx.stroke();
  }

  for(let y=gridStartY;y<gridEndY;y+=40){
    ctx.beginPath();
    ctx.moveTo(Math.max(0,camera.x),y);
    ctx.lineTo(Math.min(WORLD_W,gridEndX),y);
    ctx.stroke();
  }

  for(const wall of world.walls){
    ctx.fillStyle="#454b43";
    ctx.fillRect(
      wall.x,
      wall.y,
      wall.w,
      wall.h
    );
  }

  drawVisionCone(
    player,
    PLAYER_VISION_RANGE,
    PLAYER_VISION_ANGLE,
    "rgba(79,143,232,.08)",
    "rgba(79,143,232,.28)"
  );

  for(const building of world.buildings){
    drawBuilding(building);
  }

  const exitPulse=.5+.5*Math.sin(
    performance.now()*.004
  );

  ctx.save();

  ctx.shadowBlur=16+8*exitPulse;
  ctx.shadowColor="rgba(72,211,151,.42)";

  ctx.fillStyle="#2f7655";
  ctx.beginPath();
  ctx.roundRect(
    exit.x-3,
    exit.y-3,
    exit.w+6,
    exit.h+6,
    7
  );
  ctx.fill();

  ctx.shadowBlur=0;

  ctx.strokeStyle="#8ee8b6";
  ctx.lineWidth=2;
  ctx.stroke();

  ctx.fillStyle="rgba(124,230,174,.16)";
  ctx.fillRect(
    exit.x+4,
    exit.y+4,
    Math.max(2,exit.w-8),
    Math.max(2,exit.h-8)
  );

  ctx.strokeStyle=`rgba(201,255,225,${.45+.25*exitPulse})`;
  ctx.lineWidth=1.5;
  ctx.beginPath();
  ctx.arc(
    exit.x+exit.w*.5,
    exit.y+exit.h*.5,
    Math.min(exit.w,exit.h)*.34+2*exitPulse,
    0,
    Math.PI*2
  );
  ctx.stroke();

  ctx.fillStyle="#d8f5df";
  ctx.font="bold 13px sans-serif";

  ctx.fillText(
    "EXIT",
    exit.x-2,
    exit.y+42
  );

  ctx.restore();

  for(const container of containers){
    const building=world.buildings.find(
      b=>b.id===container.buildingId
    );

    if(
      building &&
      player.inside!==building
    ){
      continue;
    }

    drawContainerSprite(container);
  }

  for(const item of items){
    if(item.taken)continue;

    const building=world.buildings.find(
      b=>b.id===item.buildingId
    );

    if(
      building &&
      player.inside!==building
    ){
      continue;
    }

    drawItemSprite(item);

    ctx.fillStyle="#f1eee5";
    ctx.font="10px sans-serif";
    ctx.fillText(
      itemLabel(item),
      item.x-24,
      item.y-15
    );
  }

  for(const enemy of enemies){
    if(!enemy.dead && !playerCanSeeEnemy(enemy)){
      continue;
    }

    if(!enemy.dead){
      drawVisionCone(
        enemy,
        ENEMY_VISION_RANGE,
        ENEMY_VISION_ANGLE,
        "rgba(169,68,68,.035)",
        "rgba(169,68,68,.16)"
      );
    }

    drawEnemySprite(enemy);

    if(enemy.dead)continue;

    ctx.fillStyle="rgba(20,22,24,.82)";
    ctx.beginPath();
    ctx.roundRect(
      enemy.x-16,
      enemy.y-27,
      32,
      5,
      2
    );
    ctx.fill();

    ctx.fillStyle=enemy.alerted
      ? "#e5a14c"
      : "#61c46d";

    ctx.beginPath();
    ctx.roundRect(
      enemy.x-15,
      enemy.y-26,
      30*Math.max(
        0,
        enemy.hp/enemy.maxHp
      ),
      3,
      1
    );
    ctx.fill();
  }

  window.EFRMagic?.drawProjectiles?.();

  drawDamageNumbers();

  window.EFRPet?.draw?.();

  drawPlayerSprite();

  if(attackFlash>0){
    ctx.strokeStyle="#f4d27a";
    ctx.lineWidth=4;

    ctx.beginPath();

    ctx.arc(
      player.x,
      player.y,
      equippedWeapon().range,
      0,
      Math.PI*2
    );

    ctx.stroke();

    ctx.lineWidth=1;
  }

  window.EFRHooks?.draw?.();

  /*
   * EFR combat presentation:
   * プレイヤーの現在の照準方向をゲーム画面上でも明確にする。
   * 操作入力や攻撃判定そのものには介入しない。
   */
  {
    const aimX = player.x + player.facingX * 76;
    const aimY = player.y + player.facingY * 76;
    const pulse =
      .5 +
      .5 * Math.sin(performance.now() * .006);

    ctx.save();

    ctx.strokeStyle =
      `rgba(220,235,255,${.16+.08*pulse})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([7,6]);

    ctx.beginPath();
    ctx.moveTo(
      player.x + player.facingX * 22,
      player.y + player.facingY * 22
    );
    ctx.lineTo(aimX,aimY);
    ctx.stroke();

    ctx.setLineDash([]);

    ctx.shadowBlur = 10 + 5*pulse;
    ctx.shadowColor = "rgba(216,230,255,.32)";

    ctx.strokeStyle =
      `rgba(235,242,255,${.56+.22*pulse})`;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(
      aimX,
      aimY,
      8 + 2*pulse,
      0,
      Math.PI*2
    );
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(aimX-13,aimY);
    ctx.lineTo(aimX-5,aimY);
    ctx.moveTo(aimX+5,aimY);
    ctx.lineTo(aimX+13,aimY);
    ctx.moveTo(aimX,aimY-13);
    ctx.lineTo(aimX,aimY-5);
    ctx.moveTo(aimX,aimY+5);
    ctx.lineTo(aimX,aimY+13);
    ctx.stroke();

    ctx.fillStyle =
      `rgba(235,242,255,${.35+.18*pulse})`;

    ctx.beginPath();
    ctx.arc(
      aimX,
      aimY,
      2.2,
      0,
      Math.PI*2
    );
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();

  ctx.save();

  const vignette=ctx.createRadialGradient(
    W*.5,
    H*.48,
    Math.min(W,H)*.20,
    W*.5,
    H*.48,
    Math.max(W,H)*.72
  );

  vignette.addColorStop(0,"rgba(0,0,0,0)");
  vignette.addColorStop(.72,"rgba(0,0,0,.04)");
  vignette.addColorStop(1,"rgba(0,0,0,.28)");

  ctx.fillStyle=vignette;
  ctx.fillRect(0,0,W,H);

  /*
   * 低HP時だけ画面端に弱い警告演出を重ねる。
   * UIのHP表示を置き換えず、視認性だけ補助する。
   */
  if(player.hp < 35){
    const danger =
      Math.max(0,1-player.hp/35);

    const dangerPulse =
      .5 +
      .5*Math.sin(performance.now()*.008);

    const warning =
      ctx.createRadialGradient(
        W*.5,
        H*.5,
        Math.min(W,H)*.22,
        W*.5,
        H*.5,
        Math.max(W,H)*.72
      );

    warning.addColorStop(
      0,
      "rgba(150,30,30,0)"
    );

    warning.addColorStop(
      1,
      `rgba(190,35,35,${.08+.10*danger+.04*dangerPulse})`
    );

    ctx.fillStyle=warning;
    ctx.fillRect(0,0,W,H);
  }

  ctx.restore();

  hpEl.textContent=Math.max(
    0,
    Math.round(player.hp)
  );

  const weapon1Hud=
    save.equipment.weapon1;

  const weapon2Hud=
    save.equipment.weapon2;

  weaponEl.textContent=
    weapon1Hud?.kind==="pet"
      ? "ペット"
      : weapon1Hud?.name || "素手";

  weapon2El.textContent=
    weapon2Hud?.kind==="pet"
      ? "ペット"
      : weapon2Hud?.name || "なし";

  armorEl.textContent=
    String(equippedArmor().reduction);

  bagCountEl.textContent=
    backpackUsed()+"/"+player.backpackCapacity+
    " / "+
    carriedWeight().toFixed(1)+
    "/"+
    backpackWeightCapacity().toFixed(1)+
    "kg";

}

function recoverRaidStall(){
  if(!running)return false;

  player.x=RAID_START_POSITION.x;
  player.y=RAID_START_POSITION.y;
  player.inside=null;
  player.casting=false;

  resetStick();

  efrFire.active=false;
  efrFire.pointerId=null;
  efrFire.suppressClick=false;
  resetEFRLook();

  attackTimer=0;
  attackFlash=0;
  interactionTarget=null;
  interactionBar.classList.add("hidden");
  hideLootPanel();

  lastTime=performance.now();
  updateCamera();
  updateInteraction();
  window.EFRErrorHandler?.beat?.();

  logMessage("スタックを解除しました。初期位置へ戻りました。");

  return true;
}

function loop(time){
  if(!running)return;

  window.EFRErrorHandler?.setContext?.({
    phase:"探索ゲームループ",
    file:"game.js",
    operation:"loop"
  });
  window.EFRErrorHandler?.beat?.();

  const dt=Math.min(
    .033,
    (time-lastTime)/1000 || 0
  );

  lastTime=time;

  update(dt);
  draw();

  if(running){
    requestAnimationFrame(loop);
  }
}

function stopTrainingRuntime(){
  running=false;
  window.EFRCombat?.cancelReload?.();
  window.EFRPet?.resetWildEncounter?.();
  attackTimer=0;
  attackFlash=0;
  player.casting=false;
  enemies=[];
  items=[];
  containers=[];
  openContainer=null;
  openLoot=[];
  interactionTarget=null;

  raidPanel.classList.add("hidden");
  resultPanel.classList.add("hidden");
  basePanel.classList.remove("hidden");
  statusEl.textContent="拠点";

  renderBase();
  window.EFRHub?.render?.();
  window.EFRLoadout?.render?.();
  renderInventory();
}

function start(){
  window.EFRCombat?.cancelReload?.();

  window.EFRErrorHandler?.setContext?.({
    phase:"探索開始",
    file:"game.js",
    operation:"start"
  });

  basePanel.classList.add("hidden");
  resultPanel.classList.add("hidden");
  raidPanel.classList.remove("hidden");

  statusEl.textContent="探索中";

  refreshBackpackCapacity();
  generateRaid();

  running=true;
  window.EFRCombat?.resetAimSpread?.();
  lastTime=performance.now();

  requestAnimationFrame(loop);
}

function renderBase(){
  baseLootEl.textContent=
    save.stash.length+"/"+baseStorageCapacity();

  escapesEl.textContent=
    save.escapes;

  const weapon1=save.equipment.weapon1;
  const weapon2=save.equipment.weapon2;

  baseWeapon2El.textContent=
    weapon1?.name || "素手";

  if(baseWeaponSlot2El){
    baseWeaponSlot2El.textContent=
      weapon2?.name || "空き";
  }

  if(baseHeadEl){
    baseHeadEl.textContent=
      save.equipment.head?.name || "なし";
  }

  if(baseChestEl){
    baseChestEl.textContent=
      save.equipment.chest?.name || "なし";
  }

  if(baseLegsEl){
    baseLegsEl.textContent=
      save.equipment.legs?.name || "なし";
  }

  if(baseBackpackEl){
    baseBackpackEl.textContent=
      save.equipment.backpack?.name || "なし";
  }

  /*
   * 拠点ホームには倉庫の中身を表示しない。
   * 詳細は EFRHub の「倉庫」タブで表示する。
   */
  if(stashEl){
    stashEl.innerHTML="";
  }
}

function resetStick(){
  stick.active=false;
  stick.pointerId=null;
  stick.x=0;
  stick.y=0;

  stickKnob.style.transform=
    "translate(0px,0px)";
}

function updateStick(event){
  const rect=stickArea.getBoundingClientRect();

  const centerX=rect.left+rect.width/2;
  const centerY=rect.top+rect.height/2;

  let dx=event.clientX-centerX;
  let dy=event.clientY-centerY;

  const max=42;
  const distance=Math.hypot(dx,dy);

  if(distance>max){
    dx=dx/distance*max;
    dy=dy/distance*max;
  }

  stick.x=dx/max;
  stick.y=dy/max;

  stickKnob.style.transform=
    "translate("+dx+"px,"+dy+"px)";
}

stickArea.addEventListener(
  "pointerdown",
  event=>{
    event.preventDefault();

    stick.active=true;
    stick.pointerId=event.pointerId;

    stickArea.setPointerCapture(
      event.pointerId
    );

    updateStick(event);
  },
  {passive:false}
);

stickArea.addEventListener(
  "pointermove",
  event=>{
    if(
      !stick.active ||
      event.pointerId!==stick.pointerId
    ){
      return;
    }

    event.preventDefault();
    updateStick(event);
  },
  {passive:false}
);

stickArea.addEventListener(
  "pointerup",
  event=>{
    event.preventDefault();
    resetStick();
  },
  {passive:false}
);

stickArea.addEventListener(
  "pointercancel",
  event=>{
    event.preventDefault();
    resetStick();
  },
  {passive:false}
);

stickArea.addEventListener(
  "lostpointercapture",
  resetStick
);

/*
 * 攻撃ボタン以外の右側操作エリア:
 * 攻撃はせず、タップした地点を基準に
 * 指の相対移動方向だけを照準へ使用する。
 *
 * 左スティックとは別pointerとして追跡するため、
 * 移動と照準を同時に操作できる。
 */
const efrControls=document.querySelector(".controls");

function resetEFRLook(){
  efrLook.active=false;
  efrLook.pointerId=null;
  efrLook.originX=0;
  efrLook.originY=0;

  if(!efrFire.active){
    efrAim.active=false;
    efrAim.pointerId=null;
  }
}

function beginEFRLook(event){
  if(!running)return;

  if(
    event.target.closest("#attackBtn") ||
    event.target.closest("#stickArea")
  ){
    return;
  }

  if(!efrControls)return;

  const rect=efrControls.getBoundingClientRect();

  if(event.clientX < rect.left + rect.width/2){
    return;
  }

  event.preventDefault();

  efrLook.active=true;
  efrLook.pointerId=event.pointerId;
  efrLook.originX=event.clientX;
  efrLook.originY=event.clientY;

  efrAim.active=true;
  efrAim.pointerId=event.pointerId;
}

function updateEFRLook(event){
  if(
    !efrLook.active ||
    event.pointerId!==efrLook.pointerId
  ){
    return;
  }

  event.preventDefault();

  const dx=event.clientX-efrLook.originX;
  const dy=event.clientY-efrLook.originY;

  if(Math.hypot(dx,dy)>=8){
    efrSetAim(dx,dy);
  }
}

function releaseEFRLook(event){
  if(
    event &&
    event.pointerId!==efrLook.pointerId
  ){
    return;
  }

  resetEFRLook();
}

if(efrControls){
  efrControls.addEventListener(
    "pointerdown",
    beginEFRLook,
    {passive:false}
  );
}

window.addEventListener(
  "pointermove",
  updateEFRLook,
  {passive:false}
);

window.addEventListener(
  "pointerup",
  releaseEFRLook,
  {passive:false}
);

window.addEventListener(
  "pointercancel",
  releaseEFRLook,
  {passive:false}
);

function bindTap(button,handler,options={}){
  if(!button)return;

  let lastActivation=0;

  const activate=event=>{
    const now=Date.now();

    if(
      !options.clickOnly &&
      now-lastActivation<400
    ){
      return;
    }

    lastActivation=now;

    if(event.type==="pointerup"){
      event.preventDefault();
    }

    const run=window.EFRErrorHandler?.run;
    const operation=
      "UI操作: "+
      (
        button.id ||
        button.dataset.action ||
        button.textContent?.trim() ||
        "button"
      );

    if(run){
      return run(
        operation,
        ()=>handler(event),
        {
          phase:"UIイベント",
          file:"game.js",
          screen:
            document.getElementById("raidPanel") &&
            !document.getElementById("raidPanel").classList.contains("hidden")
              ? "探索画面"
              : "拠点画面"
        }
      );
    }

    return handler(event);
  };

  if(!options.clickOnly){
    button.addEventListener(
      "pointerup",
      activate,
      {passive:false}
    );
  }

  button.addEventListener("click",activate);
}

function bindTapDelegate(container,selector,handler){
  if(!container)return;

  let lastActivation=0;

  const activate=event=>{
    const button=event.target.closest(selector);

    if(
      !button ||
      !container.contains(button)
    ){
      return;
    }

    const now=Date.now();

    if(
      event.type==="click" &&
      now-lastActivation<400
    ){
      lastActivation=0;
      return;
    }

    lastActivation=now;

    if(event.type==="pointerup"){
      event.preventDefault();
    }

    const run=window.EFRErrorHandler?.run;
    const operation=
      "UI委譲操作: "+
      (
        button.id ||
        button.dataset.action ||
        button.textContent?.trim() ||
        selector
      );

    if(run){
      return run(
        operation,
        ()=>handler(button,event),
        {
          phase:"UI委譲イベント",
          file:"game.js",
          screen:
            document.getElementById("raidPanel") &&
            !document.getElementById("raidPanel").classList.contains("hidden")
              ? "探索画面"
              : "拠点画面"
        }
      );
    }

    return handler(button,event);
  };

  container.addEventListener(
    "pointerup",
    activate,
    {passive:false}
  );

  container.addEventListener(
    "click",
    activate
  );
}

bindTap(
  document.getElementById("startBtn"),
  ()=>{
    if(window.EFRLoadout?.open){
      window.EFRLoadout.open();
    }else{
      start();
    }
  }
);

bindTap(
  document.getElementById("raidStallRecoveryBtn"),
  ()=>{
    window.EFRGame?.recoverRaidStall?.();
  }
);

bindTap(
  document.getElementById("returnBtn"),
  ()=>{
    resultPanel.classList.add("hidden");
    basePanel.classList.remove("hidden");
    renderBase();
    window.EFRHub?.render?.();
    window.EFRLoadout?.render?.();
    statusEl.textContent="拠点";
  }
);

document.getElementById("attackBtn")
  .addEventListener(
    "click",
    attack
  );

document.getElementById("attackBtn")
  .addEventListener(
    "pointerdown",
    event=>event.preventDefault()
  );

window.addEventListener(
  "contextmenu",
  event=>event.preventDefault()
);

window.addEventListener(
  "selectstart",
  event=>event.preventDefault()
);

window.addEventListener(
  "dragstart",
  event=>event.preventDefault()
);

window.addEventListener(
  "blur",
  ()=>{
    resetStick();
    resetEFRLook();
  }
);

window.addEventListener(
  "keydown",
  event=>{
    if(
      ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "]
      .includes(event.key)
    ){
      event.preventDefault();
    }

    if(event.key===" "){
      attack();
    }
  }
);

renderBase();

world={
  seed:0,
  walls:[
    {x:0,y:0,w:W,h:18},
    {x:0,y:H-18,w:W,h:18},
    {x:0,y:0,w:18,h:H},
    {x:W-18,y:0,w:18,h:H}
  ],
  buildings:[]
};

draw();


bindTap(
  interactBtn,
  ()=>{
    interact();
  },
  {clickOnly:true}
);

bindTap(
  closeLootBtn,
  ()=>{
    hideContainerPanel();
  }
);

bindTap(
  lootPauseBtn,
  ()=>{
    if(
      !openContainer ||
      !Array.isArray(openContainer.loot)
    ){
      return;
    }

    const total=openContainer.loot.filter(Boolean).length;
    const revealedCount=Math.max(
      0,
      Math.min(
        total,
        Number(openContainer.revealedLootCount)||0
      )
    );

    if(revealedCount>=total)return;

    lootRevealPaused=!lootRevealPaused;

    if(lootRevealPaused){
      clearLootRevealTimer();
    }else{
      startLootReveal(openContainer);
    }

    renderLootPanel();
  }
);

bindTap(
  lootCollectAllBtn,
  ()=>{
    collectRevealedLoot();
  }
);

document.addEventListener("keydown",event=>{
  if(
    event.key==="Escape" &&
    inventoryPanel &&
    !inventoryPanel.classList.contains("hidden")
  ){
    event.preventDefault();
    hideLootPanel();
    return;
  }

  if(event.key.toLowerCase()==="e"){
    event.preventDefault();
    interact();
  }
});


/* =========================================================
   EFR mobile combat controls
   Left finger  : movement stick
   Right finger : attack button + relative aim drag
   ========================================================= */

(function installEFRMobileCombatControls(){
  const attackButton =
    document.getElementById("attackBtn");

  if(!attackButton || !canvas)return;

  function resetAim(){
    efrAim.active = false;
    efrAim.pointerId = null;
  }

  function releaseFire(event){
    if(
      event &&
      event.pointerId !== efrFire.pointerId
    )return;

    efrFire.active = false;
    efrFire.pointerId = null;
    efrFire.aimOriginX = 0;
    efrFire.aimOriginY = 0;
    resetAim();
  }

  /*
   * 攻撃ボタン:
   * 押した瞬間に攻撃。
   * 押している右指の相対移動量だけを照準に使用する。
   *
   * Canvasを直接触って照準する旧経路は存在しない。
   */
  attackButton.addEventListener(
    "pointerdown",
    event=>{
      if(!running)return;

      event.preventDefault();
      event.stopPropagation();

      /*
       * 攻撃ボタンは攻撃状態だけを担当する。
       * pointer capture は取得しない。
       *
       * 同じ右指のpointerをwindow側でも追跡することで、
       * ボタンを押したまま指を動かしても照準を変更できる。
       */
      efrFire.active = true;
      efrFire.pointerId = event.pointerId;
      efrFire.suppressClick = true;

      /*
       * 攻撃ボタンはCanvas外の操作エリアにある。
       * その画面座標を直接Canvas座標へ変換すると、
       * ボタン上で上へ指を動かしたときに
       * 「画面上の位置」を照準として誤解釈してしまう。
       *
       * 攻撃開始時は現在の照準をそのまま維持し、
       * 以後は攻撃ボタンを押した地点からの
       * 指の移動量を照準操作として扱う。
       */
      efrFire.aimOriginX = event.clientX;
      efrFire.aimOriginY = event.clientY;

      efrAim.active = true;
      efrAim.pointerId = event.pointerId;

      attack();
    },
    {passive:false}
  );

  window.addEventListener(
    "pointermove",
    event=>{
      if(
        !efrFire.active ||
        event.pointerId !== efrFire.pointerId
      )return;

      event.preventDefault();

      /*
       * 攻撃中の右指は、下側の操作エリア内で
       * 動かした方向そのものを照準方向として扱う。
       *
       * 重要:
       *   上へドラッグ -> Canvas内でも上を向く
       *   下へドラッグ -> Canvas内でも下を向く
       *
       * 攻撃ボタンの絶対画面座標は照準に使わない。
       */
      const dx =
        event.clientX - efrFire.aimOriginX;
      const dy =
        event.clientY - efrFire.aimOriginY;

      const distance = Math.hypot(dx, dy);

      if(distance >= 8){
        efrSetAim(dx, dy);
      }
    },
    {passive:false}
  );

  window.addEventListener(
    "pointerup",
    releaseFire,
    {passive:false}
  );

  window.addEventListener(
    "pointercancel",
    releaseFire,
    {passive:false}
  );

  /*
   * Existing click handler would fire a second time
   * after pointerdown. Suppress that synthetic click.
   */
  attackButton.addEventListener(
    "click",
    event=>{
      if(efrFire.suppressClick){
        efrFire.suppressClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true
  );

  window.addEventListener(
    "blur",
    ()=>{
      efrFire.active = false;
      efrFire.pointerId = null;
      resetAim();
    }
  );
})();
