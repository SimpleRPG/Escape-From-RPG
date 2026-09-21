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
  backpackCapacity:4
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

function generateRaid(){
  world=generateWorld();

  player.x=60;
  player.y=270;
  player.hp=100;
  player.loot=[];
  player.inside=null;

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
      buildingId:b.id
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
      buildingId:null
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
          : "アイテム";

        const action=item.kind==="heal"
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

  if(roll<.22){
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

  const weapon=equippedWeapon();

  attackTimer=weapon.cooldown || .35;
  attackFlash=.14;

  let target=null;
  let best=Infinity;

  for(const enemy of enemies){
    if(enemy.dead)continue;

    const d=Math.hypot(
      player.x-enemy.x,
      player.y-enemy.y
    );

    if(
      d<=weapon.range+enemy.r &&
      d<best
    ){
      best=d;
      target=enemy;
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
    save.stash.push(
      ...player.loot.map(item=>itemLabel(item))
    );
    save.escapes++;
    persist();
  }else{
    player.loot=[];
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
  renderBase();
}

function update(dt){
  let dx=stick.x;
  let dy=stick.y;

  if(Math.abs(dx)<.08)dx=0;
  if(Math.abs(dy)<.08)dy=0;

  if(dx || dy){
    const length=Math.hypot(dx,dy);
    const scale=Math.min(1,length);

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

    if(d<280){
      const nx=enemy.x+dx/d*speed*dt;
      const ny=enemy.y+dy/d*speed*dt;

      if(!blocked({
        x:nx,
        y:ny,
        r:enemy.r
      })){
        enemy.x=nx;
        enemy.y=ny;
      }
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
    ctx.fillStyle="#a94444";

    ctx.beginPath();

    ctx.arc(
      enemy.x,
      enemy.y,
      enemy.r,
      0,
      Math.PI*2
    );

    ctx.fill();

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

  generateRaid();

  running=true;
  lastTime=performance.now();

  requestAnimationFrame(loop);
}

function renderBase(){
  baseLootEl.textContent=
    save.stash.length;

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
      .map(x=>"<span>"+x+"</span>")
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
  .addEventListener("click",start);

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
