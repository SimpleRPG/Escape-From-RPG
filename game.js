const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const basePanel = document.getElementById("basePanel");
const raidPanel = document.getElementById("raidPanel");
const resultPanel = document.getElementById("resultPanel");

const statusEl = document.getElementById("status");
const hpEl = document.getElementById("hp");
const weaponEl = document.getElementById("weapon");
const armorEl = document.getElementById("armor");
const enemyEl = document.getElementById("enemyCount");
const buildingEl = document.getElementById("buildingCount");
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
const baseWeaponEl = document.getElementById("baseWeapon");
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

let running = false;
let lastTime = 0;
let damageTimer = 0;
let attackTimer = 0;
let attackFlash = 0;

let activeWeaponSlot = 1;

const efrAim = {
  active: false,
  pointerId: null,
  lastX: 0,
  lastY: 0
};

const efrFire = {
  active: false,
  pointerId: null,
  suppressClick: false
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

  efrSetAim(
    x - player.x,
    y - player.y
  );
}

function efrAimDrag(dx, dy){
  const sensitivity = 0.012;

  const current =
    Math.atan2(
      player.facingY,
      player.facingX
    );

  const angle =
    current + dx * sensitivity;

  const vertical =
    Math.max(
      -1,
      Math.min(
        1,
        Math.sin(angle) - dy * sensitivity
      )
    );

  efrSetAim(
    Math.cos(angle),
    vertical
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
  {name:"小型バックパック",kind:"backpack",slotType:"backpack",capacity:4,slots:2},
  {name:"タクティカルバックパック",kind:"backpack",slotType:"backpack",capacity:10,slots:2},
  {name:"大型バックパック",kind:"backpack",slotType:"backpack",capacity:14,slots:3},

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
  return item ? cloneItem(item) : null;
}

const defaultSave = {
  stash:[],
  escapes:0,
  player:{
    level:1,
    xp:0,
    classId:"melee"
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
  save.base=Object.assign({},defaultSave.base,raw.base || {});
  save.base.facilities=Object.assign(
    {},
    defaultSave.base.facilities,
    raw.base?.facilities || {}
  );
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
    save.equipment.backpack.capacity=4;
  }else if(save.equipment.backpack?.name==="タクティカルバックパック"){
    save.equipment.backpack.capacity=10;
  }else if(save.equipment.backpack?.name==="大型バックパック"){
    save.equipment.backpack.capacity=14;
  }

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
  x:900,
  y:245,
  w:35,
  h:70
};

function persist(){
  localStorage.setItem("efr-save",JSON.stringify(save));
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
  return inVision(
    player,
    enemy,
    PLAYER_VISION_RANGE,
    PLAYER_VISION_ANGLE
  );
}

function enemyCanSeePlayer(enemy){
  return inVision(
    enemy,
    player,
    ENEMY_VISION_RANGE,
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

function generateWorld(){
  const seed=randomSeed();
  const rng=mulberry32(seed);

  const walls=[
    {x:0,y:0,w:W,h:18},
    {x:0,y:H-18,w:W,h:18},
    {x:0,y:0,w:18,h:H},
    {x:W-18,y:0,w:18,h:H}
  ];

  const buildings=[];
  const occupied=[];

  const attempts=40;

  for(let i=0;i<attempts && buildings.length<5;i++){
    const w=120+Math.floor(rng()*100);
    const h=95+Math.floor(rng()*80);
    const x=45+Math.floor(rng()*(W-w-90));
    const y=35+Math.floor(rng()*(H-h-70));

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
      name:["倉庫","民家","事務所","整備室","施設"][buildings.length],
      x,y,w,h,
      door,
      color:["#554d45","#5a5146","#4c5058","#4d5054","#55504a"][buildings.length]
    });

    occupied.push(r);
  }

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

  applyEFRClassBonuses();

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

    const containerTypes=["木箱","ロッカー","机","棚"];

    const containerCount=1+(rng()>.55?1:0);

    for(let c=0;c<containerCount;c++){
      containers.push({
        id:"container-"+i+"-"+c,
        type:containerTypes[(i+c)%containerTypes.length],
        x:b.x+28+rng()*Math.max(20,b.w-56),
        y:b.y+28+rng()*Math.max(20,b.h-56),
        buildingId:b.id,
        searched:false,
        loot:null
      });
    }

    const ix=b.x+30+rng()*(b.w-60);
    const iy=b.y+30+rng()*(b.h-60);

    if(i<2){
      const w=weaponData[i%weaponData.length];

      items.push({
        ...cloneItem(w),
        x:ix,
        buildingId:b.id,
        taken:false
      });
    }

    if(i<2){
      const a=armorData[i%armorData.length];

      items.push({
        ...cloneItem(a),
        x:b.x+45+rng()*(b.w-90),
        y:b.y+45+rng()*(b.h-90),
        buildingId:b.id,
        taken:false
      });
    }

    if(i===0 || i===2){
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

    enemies.push({
      x:b.x+b.w/2,
      y:b.y+b.h/2,
      r:15,
      hp:55+Math.floor(rng()*35),
      maxHp:90,
      speed:42+rng()*18,
      buildingId:b.id,
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
      x:330+rng()*450,
      y:80+rng()*380,
      r:15,
      hp:60,
      maxHp:60,
      speed:45+rng()*12,
      buildingId:null,
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

  const definition=
    equipmentCatalog.find(item =>
      item.kind==="weapon" &&
      item.name===w.name
    );

  return definition
    ? {...definition,...w}
    : {
        ...w,
        cooldown:w.cooldown || .35,
        knockback:w.knockback || 0
      };
}

function equippedArmor(){
  return {
    name:"防具",
    reduction:
      (save.equipment.head?.reduction || 0)+
      (save.equipment.chest?.reduction || 0)+
      (save.equipment.legs?.reduction || 0)
  };
}

function equippedBackpack(){
  return save.equipment.backpack || {
    name:"バックパックなし",
    capacity:0,
    kind:"backpack",
    slotType:"backpack",
    slots:0
  };
}

function refreshBackpackCapacity(){
  player.backpackCapacity=4+(save.equipment.backpack?.capacity || 0);
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
  const itemCost=item.slots||1;

  if(itemIndex<0){
    logMessage("装備対象がバッグにありません");
    return false;
  }

  if(slot==="backpack"){
    const old=save.equipment.backpack;
    const newCapacity=
      4+(item.capacity || 0);

    const usedWithoutItem=
      backpackUsed()-itemCost;

    const oldCost=old ? (old.slots||1) : 0;

    if(usedWithoutItem+oldCost>newCapacity){
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
  const oldCost=old ? (old.slots||1) : 0;

  const usedAfterSwap=
    backpackUsed()-itemCost+oldCost;

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

  player.x=Math.max(25,Math.min(W-25,player.x));
  player.y=Math.max(25,Math.min(H-25,player.y));
}

function backpackUsed(){
  return player.loot.reduce((total,item)=>{
    if(typeof item==="string") return total+1;
    return total+(item.slots||1);
  },0);
}

function backpackCanFit(item){
  const slots=item.slots||1;
  return backpackUsed()+slots<=player.backpackCapacity;
}

function addToBackpack(item){
  if(!item)return false;

  refreshBackpackCapacity();

  if(!backpackCanFit(item)){
    logMessage("バッグの空きが足りません");
    return false;
  }

  player.loot.push(cloneItem(item));
  renderInventory();
  return true;
}

function inventoryItemName(item){
  return item?.name || item?.type || "不明";
}

function removeInventoryItem(index){
  if(index<0 || index>=player.loot.length)return null;
  return player.loot.splice(index,1)[0];
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
    const active=key==="weapon"+activeWeaponSlot ? " active" : "";
    const name=item ? inventoryItemName(item) : "なし";

    let button="";

    if(key==="weapon1" || key==="weapon2"){
      button=`<button type="button" data-weapon-slot="${key.slice(-1)}">使用</button>`;
    }

    return `<div class="equipmentSlot${active}">
      <span>${label}: ${name}</span>${button}
    </div>`;
  }).join("");

  inventoryContentsEl.innerHTML=player.loot.length
    ? player.loot.map((item,index)=>{
        const name=inventoryItemName(item);
        const type=item.kind==="weapon" ? "武器"
          : item.kind==="armor" ? "防具"
          : item.kind==="backpack" ? "バッグ"
          : item.kind==="heal" ? "回復"
          : item.kind==="mpRestore" ? "MP回復"
          : "アイテム";

        const action=
          item.kind==="heal" || item.kind==="mpRestore"
          ? `<button type="button" data-use-item="${index}">使用</button>`
          : (item.kind==="weapon" || item.kind==="armor" || item.kind==="backpack")
            ? `<button type="button" data-equip-item="${index}">装備</button>`
            : "";

        return `<div class="inventoryItem">
          <span>${name} <small>${type}</small></span>${action}
        </div>`;
      }).join("")
    : `<div class="inventoryEmpty">バッグは空です</div>`;

  const countEl=document.getElementById("bagCount");
  if(countEl){
    countEl.textContent=`${backpackUsed()}/${player.backpackCapacity}`;
  }
}

if(inventoryBtn && inventoryPanel){
  inventoryBtn.addEventListener("click",()=>{
    inventoryPanel.classList.remove("hidden");
    renderInventory();
  });
}

if(closeInventoryBtn && inventoryPanel){
  closeInventoryBtn.addEventListener("click",()=>{
    inventoryPanel.classList.add("hidden");
  });
}

if(equipmentSlotsEl){
  equipmentSlotsEl.addEventListener("click",event=>{
    const btn=event.target.closest("[data-weapon-slot]");
    if(!btn)return;
    toggleWeaponSlot(Number(btn.dataset.weaponSlot));
  });
}

if(inventoryContentsEl){
  inventoryContentsEl.addEventListener("click",event=>{
    const equipBtn=event.target.closest("[data-equip-item]");
    if(equipBtn){
      const index=Number(equipBtn.dataset.equipItem);
      const item=player.loot[index];
      if(!item)return;

      equipItem(item);
      return;
    }

    const useBtn=event.target.closest("[data-use-item]");
    if(useBtn){
      useInventoryItem(Number(useBtn.dataset.useItem));
    }
  });
}

function itemLabel(item){
  if(typeof item==="string")return item;
  return item?.name || item?.type || "不明なアイテム";
}

function generateContainerLoot(container){
  if(container.loot)return;

  const roll=Math.random();
  const loot=[];

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

  container.loot=loot;
}

function searchContainer(container){
  if(!container.searched){
    container.searched=true;
    generateContainerLoot(container);
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
        openLoot.splice(index,1);
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

  openContainer=corpse;
  openLoot=corpse.loot.filter(Boolean);
  showLootPanel("敵の死体");
}

function nearestInteraction(){
  let best=null;
  let bestDistance=Infinity;

  for(const container of containers){
    const building=world.buildings.find(
      b=>b.id===container.buildingId
    );

    if(building && player.inside!==building)continue;

    ctx.fillStyle=
      container.searched
      ? "#626a73"
      : "#9b6a3b";

    ctx.fillRect(
      container.x-10,
      container.y-8,
      20,
      16
    );

    ctx.fillStyle="#eee";
    ctx.font="9px sans-serif";

    ctx.fillText(
      container.type,
      container.x-18,
      container.y-12
    );
  }

  for(const enemy of enemies){
    if(!enemy.dead)continue;

    ctx.fillStyle="#4a3030";

    ctx.beginPath();

    ctx.arc(
      enemy.x,
      enemy.y,
      enemy.r,
      0,
      Math.PI*2
    );

    ctx.fill();
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

  if(interactionTarget.type==="container"){
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
  if(!interactionTarget)return;

  const target=interactionTarget.target;

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
}

function pickup(item){
  if(!addToBackpack(item))return;

  item.taken=true;
}

function attack(){
  if(!running || attackTimer>0)return;
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

  if(!target)return;

  target.hp-=weapon.damage;

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
    target.dead=true;
    target.loot=[
      {
        type:"敵の戦利品",
        kind:"loot",
        value:0,
        slots:1
      }
    ];
  }
}

function finish(success,text){
  running=false;

  hideLootPanel();
  interactionBar.classList.add("hidden");

  resultPanel.classList.remove("hidden");
  raidPanel.classList.add("hidden");

  document.getElementById("resultTitle").textContent =
    success ? "脱出成功" : "探索失敗";

  document.getElementById("resultText").textContent=text;

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

    if(player.loot.length>returned.length){
      text+="\\n倉庫容量を超えた "+
        (player.loot.length-returned.length)+
        " 個は持ち帰れませんでした。";
    }

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
    persist();
  }

  statusEl.textContent=success ? "帰還" : "失敗";
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
  setAim:(x,y)=>efrSetAim(x,y),
  attack,
  equippedWeapon,
  equippedArmor,
  addToBackpack,
  backpackCanFit,
  renderInventory,
  persist,
  logMessage,
  playerCanSeeEnemy,
  enemyCanSeePlayer,
  hasLineOfSight,
  blocked,
  start,
  finish,
  get playerMP(){return player.mp},
  set playerMP(v){player.mp=v},
  get playerMaxMP(){return player.maxMP},
  set playerMaxMP(v){player.maxMP=v},
  get playerCasting(){return player.casting},
  set playerCasting(v){player.casting=!!v}
};

renderBase();
}

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
  window.EFRHooks?.update?.(dt);
  let dx=stick.x;
  let dy=stick.y;

  if(Math.abs(dx)<.08)dx=0;
  if(Math.abs(dy)<.08)dy=0;

  if(dx || dy){
    const length=Math.hypot(dx,dy);
    const scale=Math.min(1,length);

    player.facingX=dx/Math.max(1,length);
    player.facingY=dy/Math.max(1,length);

    movePlayer(
      dx/Math.max(1,length)*scale,
      dy/Math.max(1,length)*scale,
      player.speed*dt
    );
  }

  player.inside=currentBuilding();

  for(const enemy of enemies){
    if(enemy.dead)continue;

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

      player.hp-=Math.max(
        1,
        10-armor.reduction
      );

      damageTimer=.65;
    }
  }
  damageTimer=Math.max(
    0,
    damageTimer-dt
  );

  attackTimer=Math.max(
    0,
    attackTimer-dt
  );

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

function drawBuilding(building){
  const inside=player.inside===building;

  ctx.fillStyle=inside
    ? "#71695d"
    : building.color;

  ctx.fillRect(
    building.x,
    building.y,
    building.w,
    building.h
  );

  if(inside){
    ctx.fillStyle="#817866";

    ctx.fillRect(
      building.x+17,
      building.y+17,
      building.w-34,
      building.h-34
    );

    ctx.strokeStyle="#bcae91";
    ctx.strokeRect(
      building.x+17,
      building.y+17,
      building.w-34,
      building.h-34
    );

    ctx.fillStyle="#f0dfb8";
    ctx.font="bold 13px sans-serif";

    ctx.fillText(
      building.name,
      building.x+25,
      building.y+38
    );
  }else{
    ctx.fillStyle="#111316";

    ctx.fillRect(
      building.x+12,
      building.y+12,
      building.w-24,
      building.h-24
    );

    ctx.fillStyle="#b7b0a4";
    ctx.font="bold 13px sans-serif";

    ctx.fillText(
      building.name,
      building.x+20,
      building.y+38
    );

    ctx.fillStyle="#d8a23a";

    ctx.fillRect(
      building.door.x,
      building.door.y,
      building.door.w,
      building.door.h
    );
  }
}

function draw(){
  ctx.clearRect(0,0,W,H);

  ctx.fillStyle="#252a23";
  ctx.fillRect(0,0,W,H);

  ctx.strokeStyle="#30372d";

  for(let x=0;x<W;x+=40){
    ctx.beginPath();
    ctx.moveTo(x,0);
    ctx.lineTo(x,H);
    ctx.stroke();
  }

  for(let y=0;y<H;y+=40){
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.lineTo(W,y);
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

  ctx.fillStyle="#3c8f61";

  ctx.fillRect(
    exit.x,
    exit.y,
    exit.w,
    exit.h
  );

  ctx.fillStyle="#d8f5df";
  ctx.font="bold 13px sans-serif";

  ctx.fillText(
    "EXIT",
    exit.x-2,
    exit.y+42
  );

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

    ctx.fillStyle=
      item.kind==="weapon"
      ? "#d06b3c"
      : item.kind==="armor"
      ? "#6c9bd2"
      : "#d8a23a";

    ctx.beginPath();

    ctx.arc(
      item.x,
      item.y,
      8,
      0,
      Math.PI*2
    );

    ctx.fill();

    ctx.fillStyle="#fff";
    ctx.font="10px sans-serif";

    ctx.fillText(
      itemLabel(item),
      item.x-22,
      item.y-12
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

    ctx.fillStyle=enemy.dead
      ? "#4a3030"
      : enemy.alerted
      ? "#d06b3c"
      : "#a94444";

    ctx.beginPath();

    ctx.arc(
      enemy.x,
      enemy.y,
      enemy.r,
      0,
      Math.PI*2
    );

    ctx.fill();

    if(enemy.dead)continue;

    ctx.fillStyle="#222";
    ctx.fillRect(
      enemy.x-14,
      enemy.y-23,
      28,
      4
    );

    ctx.fillStyle="#61c46d";

    ctx.fillRect(
      enemy.x-14,
      enemy.y-23,
      28*Math.max(
        0,
        enemy.hp/enemy.maxHp
      ),
      4
    );
  }

  ctx.fillStyle="#4f8fe8";

  ctx.beginPath();

  ctx.arc(
    player.x,
    player.y,
    player.r,
    0,
    Math.PI*2
  );

  ctx.fill();

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
    backpackUsed()+"/"+player.backpackCapacity;

  enemyEl.textContent=
    enemies.filter(e=>!e.dead).length;

  buildingEl.textContent=
    world.buildings.length;
}

function loop(time){
  if(!running)return;

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

function start(){
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

  baseWeaponEl.textContent=
    weapon1?.name || "なし";

  baseWeapon2El.textContent=
    weapon1?.name || "なし";

  if(baseWeaponSlot2El){
    baseWeaponSlot2El.textContent=
      weapon2?.name || "なし";
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

  stashEl.innerHTML=
    save.stash.length
    ? save.stash
      .map(x=>{
        const n=
          typeof x==="string"
            ? x
            : (x?.name || x?.type || "不明");

        return "<span>"+n+"</span>";
      })
      .join("")
    : "<span>まだ戦利品はありません</span>";
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

document.getElementById("startBtn")
  .addEventListener("click",()=>{
    if(window.EFRLoadout?.open){
      window.EFRLoadout.open();
    }else{
      start();
    }
  });

document.getElementById("returnBtn")
  .addEventListener(
    "click",
    ()=>{
      resultPanel.classList.add("hidden");
      basePanel.classList.remove("hidden");
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


interactBtn.addEventListener("click",()=>{
  interact();
});

closeLootBtn.addEventListener("click",()=>{
  hideLootPanel();
});

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
      efrAim.lastX = event.clientX;
      efrAim.lastY = event.clientY;

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

      const dx =
        event.clientX - efrAim.lastX;

      const dy =
        event.clientY - efrAim.lastY;

      efrAim.lastX = event.clientX;
      efrAim.lastY = event.clientY;

      efrAimDrag(dx,dy);
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

      efrFire.active = true;
      efrFire.pointerId = event.pointerId;
      efrFire.suppressClick = true;

      attackButton.setPointerCapture(
        event.pointerId
      );

      efrAim.active = true;
      efrAim.pointerId = event.pointerId;
      efrAim.lastX = event.clientX;
      efrAim.lastY = event.clientY;

      attack();
    },
    {passive:false}
  );

  attackButton.addEventListener(
    "pointermove",
    event=>{
      if(
        !efrFire.active ||
        event.pointerId !== efrFire.pointerId
      )return;

      event.preventDefault();

      const dx =
        event.clientX - efrAim.lastX;

      const dy =
        event.clientY - efrAim.lastY;

      efrAim.lastX = event.clientX;
      efrAim.lastY = event.clientY;

      if(Math.abs(dx)+Math.abs(dy) > 0){
        efrAimDrag(dx,dy);
      }

      attack();
    },
    {passive:false}
  );

  attackButton.addEventListener(
    "pointerup",
    releaseFire,
    {passive:false}
  );

  attackButton.addEventListener(
    "pointercancel",
    releaseFire,
    {passive:false}
  );

  attackButton.addEventListener(
    "lostpointercapture",
    ()=>{
      efrFire.active = false;
      efrFire.pointerId = null;
      resetAim();
    }
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


/* ============================================================
   EFR_BASE_HOME_V2
   拠点ホームUI
   ============================================================ */

function EFR_BASE_HOME_V2(state={}){
  const root=document.createElement("div");
  root.className="efr-base-home-v2";
  root.innerHTML=`
    <style>
      .efr-base-home-v2{
        width:100%;
        max-width:760px;
        margin:0 auto;
        padding:14px;
        box-sizing:border-box;
        color:#eee;
      }

      .efr-base-hero{
        border:1px solid rgba(255,255,255,.12);
        border-radius:18px;
        padding:18px;
        margin-bottom:12px;
        background:
          linear-gradient(135deg,rgba(255,255,255,.09),rgba(255,255,255,.025));
        box-shadow:0 10px 30px rgba(0,0,0,.22);
      }

      .efr-base-title{
        font-size:24px;
        font-weight:800;
        margin-bottom:4px;
      }

      .efr-base-subtitle{
        opacity:.65;
        font-size:13px;
      }

      .efr-base-status{
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:8px;
        margin-top:14px;
      }

      .efr-base-stat{
        padding:10px;
        border-radius:12px;
        background:rgba(0,0,0,.2);
      }

      .efr-base-stat-label{
        font-size:11px;
        opacity:.55;
      }

      .efr-base-stat-value{
        font-size:17px;
        font-weight:700;
        margin-top:3px;
      }

      .efr-base-section{
        margin-top:14px;
      }

      .efr-base-section-title{
        font-size:14px;
        font-weight:800;
        margin:0 0 8px;
        opacity:.85;
      }

      .efr-base-grid{
        display:grid;
        grid-template-columns:repeat(2,1fr);
        gap:10px;
      }

      .efr-base-card{
        border:1px solid rgba(255,255,255,.10);
        border-radius:16px;
        padding:15px;
        min-height:86px;
        box-sizing:border-box;
        background:rgba(255,255,255,.045);
        color:inherit;
        text-align:left;
        cursor:pointer;
        transition:transform .12s,background .12s;
      }

      .efr-base-card:active{
        transform:scale(.98);
        background:rgba(255,255,255,.09);
      }

      .efr-base-card.primary{
        grid-column:span 2;
        min-height:105px;
        background:linear-gradient(
          135deg,
          rgba(255,255,255,.12),
          rgba(255,255,255,.045)
        );
      }

      .efr-base-icon{
        font-size:23px;
        margin-bottom:7px;
      }

      .efr-base-card-title{
        font-size:15px;
        font-weight:800;
      }

      .efr-base-card-desc{
        margin-top:4px;
        font-size:11px;
        opacity:.58;
        line-height:1.4;
      }

      .efr-base-progress{
        height:5px;
        border-radius:99px;
        overflow:hidden;
        margin-top:9px;
        background:rgba(255,255,255,.10);
      }

      .efr-base-progress > div{
        height:100%;
        width:var(--progress,0%);
        background:currentColor;
        border-radius:99px;
      }

      @media(max-width:520px){
        .efr-base-status{
          grid-template-columns:repeat(2,1fr);
        }

        .efr-base-grid{
          grid-template-columns:1fr;
        }

        .efr-base-card.primary{
          grid-column:span 1;
        }
      }
    </style>

    <div class="efr-base-hero">
      <div class="efr-base-title">🏠 拠点</div>
      <div class="efr-base-subtitle">
        出撃の準備、装備、クラフト、強化をここから管理
      </div>

      <div class="efr-base-status">
        <div class="efr-base-stat">
          <div class="efr-base-stat-label">拠点</div>
          <div class="efr-base-stat-value">${state.baseLevel ?? 1}</div>
        </div>

        <div class="efr-base-stat">
          <div class="efr-base-stat-label">素材</div>
          <div class="efr-base-stat-value">${state.materials ?? 0}</div>
        </div>

        <div class="efr-base-stat">
          <div class="efr-base-stat-label">HP</div>
          <div class="efr-base-stat-value">${state.hp ?? "—"}</div>
        </div>

        <div class="efr-base-stat">
          <div class="efr-base-stat-label">MP</div>
          <div class="efr-base-stat-value">${state.mp ?? "—"}</div>
        </div>
      </div>
    </div>

    <div class="efr-base-section">
      <div class="efr-base-section-title">出撃</div>

      <div class="efr-base-grid">
        <button class="efr-base-card primary" data-action="deploy">
          <div class="efr-base-icon">⚔️</div>
          <div class="efr-base-card-title">出撃する</div>
          <div class="efr-base-card-desc">
            装備を確認して探索へ出発
          </div>
        </button>

        <button class="efr-base-card" data-action="loadout">
          <div class="efr-base-icon">🎒</div>
          <div class="efr-base-card-title">出撃準備</div>
          <div class="efr-base-card-desc">
            武器・防具・バッグ・回復アイテム
          </div>
        </button>

        <button class="efr-base-card" data-action="warehouse">
          <div class="efr-base-icon">📦</div>
          <div class="efr-base-card-title">倉庫・装備</div>
          <div class="efr-base-card-desc">
            所持品と装備を管理
          </div>
        </button>
      </div>
    </div>

    <div class="efr-base-section">
      <div class="efr-base-section-title">拠点設備</div>

      <div class="efr-base-grid">
        <button class="efr-base-card" data-action="craft">
          <div class="efr-base-icon">🔨</div>
          <div class="efr-base-card-title">クラフト</div>
          <div class="efr-base-card-desc">
            素材から装備・アイテムを作成
          </div>
        </button>

        <button class="efr-base-card" data-action="upgrade">
          <div class="efr-base-icon">🔧</div>
          <div class="efr-base-card-title">修理・強化</div>
          <div class="efr-base-card-desc">
            装備性能と耐久を管理
          </div>
        </button>

        <button class="efr-base-card" data-action="base">
          <div class="efr-base-icon">🏗️</div>
          <div class="efr-base-card-title">拠点強化</div>
          <div class="efr-base-card-desc">
            拠点レベルと施設を発展
          </div>
        </button>

        <button class="efr-base-card" data-action="character">
          <div class="efr-base-icon">👤</div>
          <div class="efr-base-card-title">キャラクター</div>
          <div class="efr-base-card-desc">
            レベル・クラス・ステータス
          </div>
        </button>

        <button class="efr-base-card" data-action="skill">
          <div class="efr-base-icon">🌳</div>
          <div class="efr-base-card-title">スキル</div>
          <div class="efr-base-card-desc">
            スキルポイントと成長ルート
          </div>
        </button>
      </div>
    </div>
  `;

  root.querySelectorAll("[data-action]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const action=btn.dataset.action;

      /*
       * 既存の拠点UIが提供している遷移関数を優先して利用。
       * 存在しない場合はイベントとして通知する。
       */
      const handlers={
        deploy:["startRaid","deploy","beginRaid"],
        loadout:["openLoadout","showLoadout"],
        warehouse:["openWarehouse","showWarehouse"],
        craft:["openCraft","showCraft"],
        upgrade:["openUpgrade","showUpgrade"],
        base:["openBaseUpgrade","showBaseUpgrade"],
        character:["openCharacter","showCharacter"],
        skill:["openSkillTree","showSkillTree"]
      };

      for(const name of (handlers[action]||[])){
        if(typeof window[name]==="function"){
          window[name]();
          return;
        }
      }

      window.dispatchEvent(
        new CustomEvent("efr-base-action",{detail:{action}})
      );
    });
  });

  return root;
}

