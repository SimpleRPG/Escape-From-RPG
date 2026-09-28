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
const lootContents = document.getElementById("lootContents");
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

const camera = {
  x: 0,
  y: 0
};

function updateCamera(){
  if(!world)return;

  camera.x = Math.max(
    0,
    Math.min(
      WORLD_W - W,
      player.x - W / 2
    )
  );

  camera.y = Math.max(
    0,
    Math.min(
      WORLD_H - H,
      player.y - H / 2
    )
  );
}

function worldToScreenX(x){
  return x - camera.x;
}

function worldToScreenY(y){
  return y - camera.y;
}

function screenToWorldX(x){
  return x + camera.x;
}

function screenToWorldY(y){
  return y + camera.y;
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

  const amount=Math.max(0,Math.round(Number(damage)||0));
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

function efrSetAim(x, y){
  const d = Math.hypot(x, y);
  if(d < 0.001)return;

  player.facingX = x / d;
  player.facingY = y / d;
}

function efrAimFromScreen(clientX, clientY){
  const rect = canvas.getBoundingClientRect();

  const x =
    (clientX - rect.left) *
    (canvas.width / rect.width);

  const y =
    (clientY - rect.top) *
    (canvas.height / rect.height);

  const worldX = screenToWorldX(x);
  const worldY = screenToWorldY(y);

  efrSetAim(
    worldX - player.x,
    worldY - player.y
  );
}

let world = null;
let enemies = [];
let items = [];
let containers = [];
let openContainer = null;
let openLoot = [];
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
  save.keys=Array.isArray(raw.keys)
    ? raw.keys
        .filter(x=>typeof x==="string")
        .filter(x=>["military","research","factory","storage","security","special"].includes(x))
        .slice(0,3)
    : [];
  save.equipment=Object.assign({},defaultSave.equipment,raw.equipment || {});

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
      "貴重品":{name:"貴重品",kind:"loot",slots:2,weight:1},
      "敵の戦利品":{name:"敵の戦利品",kind:"loot",slots:1,weight:1}
    };

    return known[item]
      ? {...known[item]}
      : {name:item,kind:"material",slots:1,weight:1};
  });

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

  player.x=60;
  player.y=270;
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

  ctx.save();

  ctx.beginPath();
  ctx.moveTo(actor.x,actor.y);
  ctx.arc(
    actor.x,
    actor.y,
    range,
    start,
    end
  );
  ctx.closePath();

  ctx.fillStyle=fillStyle;
  ctx.fill();

  ctx.strokeStyle=strokeStyle;
  ctx.stroke();

  ctx.restore();
}

const KEY_DEFINITIONS=Object.freeze({military:{name:"軍用鍵"},research:{name:"研究施設鍵"},factory:{name:"工場鍵"},storage:{name:"倉庫鍵"},security:{name:"保安区画鍵"},special:{name:"特殊区画鍵"}});const MAX_PERSISTENT_KEYS=3;function keyDefinition(id){return KEY_DEFINITIONS[id]||null;}function isKeyItem(item){return item?.kind==="key"&&!!keyDefinition(item.keyType);}function createKeyItem(keyType){const d=keyDefinition(keyType);if(!d)return null;return {name:d.name,kind:"key",keyType,gridW:1,gridH:1,slots:1,weight:0};}function hasRaidKey(keyType){return Array.isArray(player.raidKeys)&&player.raidKeys.includes(keyType);}function prepareRaidKeys(){const stored=Array.isArray(save.keys)?save.keys:[];const normalized=stored.filter(keyDefinition).slice(0,MAX_PERSISTENT_KEYS);save.keys=normalized;player.raidKeys=normalized.slice();}function assignLockedBuildings(buildings,rng){const ids=Object.keys(KEY_DEFINITIONS);const count=buildings.length?1+Math.floor(rng()*Math.min(3,buildings.length)):0;const pool=buildings.slice();for(let i=0;i<count;i++){const bi=Math.floor(rng()*pool.length);const b=pool.splice(bi,1)[0];const ki=Math.floor(rng()*ids.length);const keyType=ids.splice(ki,1)[0];b.locked=true;b.keyType=keyType;b.door.locked=true;b.door.unlocked=false;}}function unlockBuilding(building){if(!building?.locked)return true;if(building.door.unlocked)return true;if(!hasRaidKey(building.keyType)){logMessage((keyDefinition(building.keyType)?.name||"鍵")+"が必要です");return false;}building.door.unlocked=true;logMessage(building.name+"の鍵を開けました");return true;}function addRareKeyLoot(loot){if(Math.random()>=0.015)return;const ids=Object.keys(KEY_DEFINITIONS);const keyType=ids[Math.floor(Math.random()*ids.length)];const key=createKeyItem(keyType);if(key)loot.push(key);}function addLockedAreaLoot(container,loot){const building=world?.buildings?.find(b=>b.id===container?.buildingId);if(!building?.locked)return;const roll=Math.random();if(roll<0.45)return;if(roll<0.75){loot.push(Math.random()<0.65?{type:"部品",kind:"loot",value:0,slots:1}:{type:"貴重品",kind:"loot",value:0,slots:2});return;}if(roll<0.96){const pool=["防護ベスト","防護ヘルメット","防護ブーツ","タクティカルバックパック","大型バックパック"];const item=catalogItem(pool[Math.floor(Math.random()*pool.length)]);if(item)loot.push(item);return;}if(roll<0.995){const pool=["防護ベスト","防護ヘルメット","大型バックパック"];const item=catalogItem(pool[Math.floor(Math.random()*pool.length)]);if(item){item.rarity=4;if(isWeaponItem(item))applyWeaponProgression(item);if(isArmorItem(item))applyArmorProgression(item);if(isBackpackItem(item))applyBackpackProgression(item);loot.push(item);}return;}const jackpot=Math.random()<0.5?catalogItem("防護ベスト"):catalogItem("大型バックパック");if(jackpot){jackpot.rarity=5;if(isArmorItem(jackpot))applyArmorProgression(jackpot);if(isBackpackItem(jackpot))applyBackpackProgression(jackpot);loot.push(jackpot);}}
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
  window.EFRPet?.prepareRaid?.();

  player.x=60;
  player.y=270;
  player.hp=player.maxHp||100;
  player.mp=player.maxMP||100;
  player.casting=false;

  // 拠点で選択した持込品を出撃開始時に維持する。
  player.loot=Array.isArray(player.loot)
    ? player.loot.map(item=>cloneItem(item))
    : [];

  player.inside=null;
  camera.x=0;
  camera.y=0;
  updateCamera();
  refreshBackpackCapacity();

  // 容量超過した旧セーブは末尾から倉庫へ戻す。
  while(backpackUsed()>player.backpackCapacity && player.loot.length){
    const item=player.loot.pop();
    save.stash.push(cloneItem(item));
  }

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
    catalogItem("ナイフ"),
    catalogItem("鉄パイプ")
  ];

  const armorData=[
    catalogItem("軽量アーマー"),
    catalogItem("防護ベスト"),
    catalogItem("軽量ヘルメット"),
    catalogItem("防護ヘルメット"),
    catalogItem("軽量ブーツ"),
    catalogItem("防護ブーツ")
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

  if(!w){
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

  const petCarry=
    window.EFRPet?.getCarryBonus?.() || 0;

  const equipmentCapacity=
    Number(backpack.capacity || 0);

  player.backpackCapacity=
    Math.max(4,equipmentCapacity)+
    skillBonus+
    petCarry;

  // マス容量とは別に、装備・携行品全体の重量上限を持つ。
  // バッグ容量1マスにつき2kgを基準とし、最低20kgを確保する。
  player.backpackWeightCapacity=
    Math.max(
      20,
      player.backpackCapacity*2
    );
}

function equipmentSlotForItem(item){
  if(item.kind==="weapon")return "weapon";
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
  "加工金属":[1,2],
  "回路基板":[2,1],
  "医療キット素材":[1,1],

  // 修理・戦利品
  "修理キット・改":[2,1],
  "貴重品":[2,1],
  "敵の戦利品":[1,1],

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

  if(c<=7)return c;
  if(c<=12)return 6;
  return 8;
}

function inventoryGridCanPlace(
  placed,
  item,
  x,
  y,
  columns,
  capacity
){
  const [w,h]=inventoryGridSize(item);

  if(x<0 || y<0)return false;
  if(x+w>columns)return false;

  const rows=Math.ceil(capacity/columns);

  if(y+h>rows)return false;

  return !placed.some(other=>{
    const [ow,oh]=inventoryGridSize(other);

    return !(
      x+w<=Number(other.gridX||0) ||
      Number(other.gridX||0)+ow<=x ||
      y+h<=Number(other.gridY||0) ||
      Number(other.gridY||0)+oh<=y
    );
  });
}

function inventoryGridLayout(items,capacity){
  const list=Array.isArray(items)?items:[];
  const cap=Math.max(
    1,
    Math.floor(Number(capacity)||1)
  );
  const columns=inventoryGridColumns(cap);
  const placed=[];
  let changed=false;

  for(const item of list){
    const [w,h]=inventoryGridSize(item);

    let x=Number.isFinite(Number(item?.gridX))
      ?Math.floor(Number(item.gridX))
      :-1;

    let y=Number.isFinite(Number(item?.gridY))
      ?Math.floor(Number(item.gridY))
      :-1;

    if(
      !inventoryGridCanPlace(
        placed,
        item,
        x,
        y,
        columns,
        cap
      )
    ){
      x=-1;
      y=-1;

      const rows=Math.ceil(cap/columns);

      outer:
      for(let yy=0;yy<rows;yy++){
        for(let xx=0;xx<columns;xx++){
          if(
            inventoryGridCanPlace(
              placed,
              item,
              xx,
              yy,
              columns,
              cap
            )
          ){
            x=xx;
            y=yy;
            break outer;
          }
        }
      }
    }

    if(x<0 || y<0){
      if(w>columns){
        throw new Error(
          "GRID_LAYOUT_FAILED:"+(
            item?.name||
            item?.type||
            "unknown"
          )
        );
      }

      const recoveryStartRow=Math.ceil(cap/columns);

      outerRecovery:
      for(let yy=recoveryStartRow;;yy++){
        for(let xx=0;xx<columns;xx++){
          const collision=placed.some(other=>{
            const [ow,oh]=inventoryGridSize(other);

            return !(
              xx+w<=Number(other.gridX||0) ||
              Number(other.gridX||0)+ow<=xx ||
              yy+h<=Number(other.gridY||0) ||
              Number(other.gridY||0)+oh<=yy
            );
          });

          if(!collision){
            x=xx;
            y=yy;
            break outerRecovery;
          }
        }
      }
    }

    if(
      Number(item.gridX)!==x ||
      Number(item.gridY)!==y
    ){
      item.gridX=x;
      item.gridY=y;
      changed=true;
    }

    placed.push(item);
  }

  const rows=Math.max(
    Math.ceil(cap/columns),
    ...placed.map(item=>{
      const [w,h]=inventoryGridSize(item);
      return Number(item.gridY||0)+h;
    })
  );

  return {
    changed,
    columns,
    rows
  };
}

function inventoryGridUsed(items){
  return (Array.isArray(items)?items:[])
    .reduce((total,item)=>{
      const [w,h]=inventoryGridSize(item);
      return total+(w*h);
    },0);
}

function inventoryGridMove(items,capacity,index,x,y){
  const list=Array.isArray(items)?items:[];
  const item=list[index];

  if(!item)return false;

  const cap=Math.max(
    1,
    Math.floor(Number(capacity)||1)
  );

  const columns=inventoryGridColumns(cap);
  const numericX=Number(x);
  const numericY=Number(y);

  if(
    !Number.isFinite(numericX) ||
    !Number.isFinite(numericY)
  ){
    return false;
  }

  const targetX=Math.floor(numericX);
  const targetY=Math.floor(numericY);

  if(
    !inventoryGridCanPlace(
      list.filter((_,i)=>i!==index),
      item,
      targetX,
      targetY,
      columns,
      cap
    )
  ){
    return false;
  }

  if(
    Number(item.gridX)===targetX &&
    Number(item.gridY)===targetY
  ){
    return false;
  }

  item.gridX=targetX;
  item.gridY=targetY;

  return true;
}

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
  move:inventoryGridMove,
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

function itemWeight(item){
  if(!item)return 0;

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

  if(item.kind==="key")return 0;
  if(item.kind==="ammo")return 0.25;
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

function backpackCanFit(item){
  if(!item)return false;

  refreshBackpackCapacity();
  ensureItemWeight(item);

  const [itemW,itemH]=window.EFRGrid?.size?.(item) || [1,1];
  const itemCells=itemW*itemH;

  if(
    backpackUsed()+itemCells>
    player.backpackCapacity
  ){
    return false;
  }

  if(
    carriedWeight()+itemWeight(item)>
    backpackWeightCapacity()+0.0001
  ){
    return false;
  }

  if(!window.EFRGrid){
    return true;
  }

  const probe=cloneItem(item);

  try{
    window.EFRGrid.layout(
      [...player.loot,probe],
      player.backpackCapacity
    );

    return true;
  }catch(error){
    return false;
  }
}

function addToBackpack(item){
  if(!item)return false;

  refreshBackpackCapacity();
  ensureItemWeight(item);

  if(!backpackCanFit(item)){
    if(
      carriedWeight()+itemWeight(item)>
      backpackWeightCapacity()+0.0001
    ){
      logMessage("バッグの重量上限を超えています");
    }else{
      logMessage("バッグの空きが足りません");
    }

    return false;
  }

  player.loot.push(cloneItem(item));
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

function storeInventoryKey(index){const item=player.loot[index];if(!isKeyItem(item))return false;if(!Array.isArray(save.keys))save.keys=[];if(save.keys.length>=MAX_PERSISTENT_KEYS){logMessage("鍵保管は3個までです");return false;}player.loot.splice(index,1);save.keys.push(item.keyType);persist();renderInventory();window.EFRLoadout?.render?.();logMessage(item.name+"を鍵として保管しました");return true;}

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
      const trainer=
        save.player?.classId==="trainer";

      const disabled=
        trainer && key==="weapon2"
          ? " disabled"
          : "";

      button=
        `<button
          type="button"
          data-weapon-slot="${key.slice(-1)}"
          ${disabled}
        >使用</button>`;
    }

    return `
      <div class="equipmentSlot${active}">
        <span>${label}: ${name}</span>
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
            ${item.kind==="key" ? `<button type="button" data-store-key="${index}">保管</button>` : ""}
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
            ${item.kind==="key" ? `<button type="button" data-store-key="${index}">保管</button>` : ""}
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
      inventoryPanel.classList.remove("hidden");
      renderInventory();
    }
  );
}

if(closeInventoryBtn && inventoryPanel){
  bindTap(
    closeInventoryBtn,
    ()=>{
      inventoryPanel.classList.add("hidden");
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

  addRareKeyLoot(loot);
  addLockedAreaLoot(container,loot);

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

function searchContainer(container){
  if(!container.searched){
    container.searched=true;
    generateContainerLoot(container);

    window.EFRPet?.onLootInspect?.(
      container,
      "container"
    );
  }

  openContainer=container;
  openLoot=container.loot.filter(Boolean);

  showLootPanel(container.type);
}

function showLootPanel(title){
  lootPanel.classList.remove("hidden");
  lootTitle.textContent=title+"の中身";
  renderLootPanel();
}

function hideLootPanel(){
  lootPanel.classList.add("hidden");
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

function renderLootPanel(){
  lootContents.innerHTML="";

  if(!openLoot.length){
    lootContents.innerHTML="<div class='lootItem'><span>空です</span></div>";
    return;
  }

  openLoot.forEach((item,index)=>{
    const row=document.createElement("div");
    row.className="lootItem";

    const info=document.createElement("div");

    const name=document.createElement("strong");
    name.textContent=itemLabel(item);

    const detail=document.createElement("small");
    detail.textContent="使用 "+(item.slots||1)+" スロット";

    info.appendChild(name);
    info.appendChild(detail);

    const button=document.createElement("button");
    button.textContent=
      backpackCanFit(item) ? "回収" : "満杯";

    button.disabled=!backpackCanFit(item);

    button.addEventListener("click",()=>{
      if(!backpackCanFit(item))return;

      if(addToBackpack(item)){
        removeLootFromSource(item);
        openLoot.splice(index,1);
        persist();
        renderLootPanel();
      }
    });

    row.appendChild(info);
    row.appendChild(button);

    lootContents.appendChild(row);
  });
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
  if(!corpse.loot){
    corpse.loot=[{
      type:"敵の戦利品",
      kind:"loot",
      value:0,
      slots:1
    }];
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

    if(d<30 && d<bestDistance){
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

    if(d<38 && d<bestDistance){
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
  if(lootPanel && !lootPanel.classList.contains("hidden")){
    interactionBar.classList.add("hidden");
    return;
  }

  interactionTarget=nearestInteraction();

  if(!interactionTarget){
    interactionBar.classList.add("hidden");
    return;
  }

  interactionBar.classList.remove("hidden");

  if(interactionTarget.type==="lockedDoor"){
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

    target.loot=[
      {
        type:"敵の戦利品",
        kind:"loot",
        value:0,
        slots:1
      }
    ];
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
    if(!efrAim.active){
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

      player.hp-=Math.max(
        1,
        10-hitReduction
      );

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

  for(let y=startY;y<camera.y+H+80;y+=80){
    for(let x=startX;x<camera.x+W+80;x+=80){
      const seed=Math.abs(
        Math.sin(x*12.9898+y*78.233)*43758.5453
      );
      const n=seed-Math.floor(seed);

      const px=x+12+n*52;
      const py=y+18+(seed*31%1)*42;

      if(n<.34){
        ctx.fillStyle="#3a4036";
        ctx.beginPath();
        ctx.moveTo(px-7,py+4);
        ctx.lineTo(px-3,py-5);
        ctx.lineTo(px+5,py-8);
        ctx.lineTo(px+9,py+1);
        ctx.lineTo(px+3,py+7);
        ctx.closePath();
        ctx.fill();
      }else if(n<.62){
        ctx.strokeStyle="rgba(93,126,75,.55)";
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.moveTo(px,py+8);
        ctx.lineTo(px-2,py);
        ctx.moveTo(px,py+8);
        ctx.lineTo(px+5,py+2);
        ctx.moveTo(px,py+7);
        ctx.lineTo(px-5,py+3);
        ctx.stroke();
        ctx.lineWidth=1;
      }else if(n<.77){
        ctx.strokeStyle="rgba(79,116,105,.30)";
        ctx.beginPath();
        ctx.arc(px,py,8,0,Math.PI*2);
        ctx.moveTo(px-5,py);
        ctx.lineTo(px+5,py);
        ctx.moveTo(px,py-5);
        ctx.lineTo(px,py+5);
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

    ctx.fillStyle="#d8a23a";
    ctx.beginPath();
    ctx.roundRect(
      building.door.x,
      building.door.y,
      building.door.w,
      building.door.h,
      5
    );
    ctx.fill();

    ctx.fillStyle="#f4df9b";
    ctx.fillRect(
      building.door.x+5,
      building.door.y+7,
      4,
      4
    );

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

  ctx.strokeStyle="#e1e8ef";
  ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(6,0);
  ctx.lineTo(18,0);
  ctx.stroke();

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
  ctx.translate(-camera.x,-camera.y);

  drawGroundDecorations();

  ctx.strokeStyle="#30372d";

  const gridStartX=Math.floor(camera.x/40)*40;
  const gridStartY=Math.floor(camera.y/40)*40;
  const gridEndX=camera.x+W+40;
  const gridEndY=camera.y+H+40;

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

  ctx.restore();

  hpEl.textContent=Math.max(
    0,
    Math.round(player.hp)
  );

  weaponEl.textContent=
    save.equipment.weapon1?.name || "素手";

  weapon2El.textContent=
    save.equipment.weapon2?.name || "なし";

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

function bindTap(button,handler){
  if(!button)return;

  let lastActivation=0;

  const activate=event=>{
    const now=Date.now();

    if(now-lastActivation<400){
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

  button.addEventListener(
    "pointerup",
    activate,
    {passive:false}
  );

  button.addEventListener(
    "click",
    activate
  );
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
  resetStick
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
  }
);

bindTap(
  closeLootBtn,
  ()=>{
    hideLootPanel();
  }
);

document.addEventListener("keydown",event=>{
  if(event.key.toLowerCase()==="e"){
    event.preventDefault();
    interact();
  }
});


/* =========================================================
   EFR mobile combat controls
   Left thumb  : movement stick
   Right half  : free aim / camera direction
   Fire button : hold to fire, drag while holding to aim
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
   * Right half of the game screen:
   * touch anywhere -> rotate aim.
   * It does NOT fire.
   */
  canvas.addEventListener(
    "pointerdown",
    event=>{
      if(!running)return;

      const rect =
        canvas.getBoundingClientRect();

      if(
        event.clientX <
        rect.left + rect.width / 2
      ){
        return;
      }

      event.preventDefault();

      efrAim.active = true;
      efrAim.pointerId = event.pointerId;

      canvas.setPointerCapture(
        event.pointerId
      );

      efrAimFromScreen(
        event.clientX,
        event.clientY
      );
    },
    {passive:false}
  );

  canvas.addEventListener(
    "pointermove",
    event=>{
      if(
        !efrAim.active ||
        event.pointerId !== efrAim.pointerId
      )return;

      event.preventDefault();


      // 右画面は「現在触れている地点」そのものを照準先にする。
      // 画面座標→ワールド座標変換後、プレイヤーからの方向を直接求める。
      efrAimFromScreen(
        event.clientX,
        event.clientY
      );
    },
    {passive:false}
  );

  canvas.addEventListener(
    "pointerup",
    event=>{
      if(event.pointerId === efrAim.pointerId){
        event.preventDefault();
        resetAim();
      }
    },
    {passive:false}
  );

  canvas.addEventListener(
    "pointercancel",
    event=>{
      if(event.pointerId === efrAim.pointerId){
        event.preventDefault();
        resetAim();
      }
    },
    {passive:false}
  );

  /*
   * Fire button:
   * press = shoot
   * hold = repeated shooting
   * drag = aim while shooting
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
