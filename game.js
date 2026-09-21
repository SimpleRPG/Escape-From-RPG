const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const basePanel = document.getElementById("basePanel");
const raidPanel = document.getElementById("raidPanel");
const resultPanel = document.getElementById("resultPanel");

const statusEl = document.getElementById("status");
const hpEl = document.getElementById("hp");
const weaponEl = document.getElementById("weapon");
const armorEl = document.getElementById("armor");
const lootEl = document.getElementById("lootCount");
const enemyEl = document.getElementById("enemyCount");
const buildingEl = document.getElementById("buildingCount");
const mapInfoEl = document.getElementById("mapInfo");

const baseLootEl = document.getElementById("baseLoot");
const escapesEl = document.getElementById("escapes");
const baseWeaponEl = document.getElementById("baseWeapon");
const baseWeapon2El = document.getElementById("baseWeapon2");
const baseArmorEl = document.getElementById("baseArmor");
const stashEl = document.getElementById("stash");

const stickArea = document.getElementById("stickArea");
const stickKnob = document.getElementById("stickKnob");

const W = canvas.width;
const H = canvas.height;

let running = false;
let lastTime = 0;
let damageTimer = 0;
let attackTimer = 0;
let attackFlash = 0;

let world = null;
let enemies = [];
let items = [];

const stick = {
  active:false,
  pointerId:null,
  x:0,
  y:0
};

const defaultSave = {
  stash:[],
  escapes:0,
  equipment:{
    weapon:null,
    armor:null
  }
};

let save;

try{
  save = Object.assign(
    {},
    defaultSave,
    JSON.parse(localStorage.getItem("efr-save") || "{}")
  );

  save.equipment = Object.assign(
    {},
    defaultSave.equipment,
    save.equipment || {}
  );
}catch{
  save = JSON.parse(JSON.stringify(defaultSave));
}

const player = {
  x:60,
  y:270,
  r:14,
  hp:100,
  speed:185,
  loot:[],
  inside:null
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
        x:x+w/2-18,
        y:y+h-5,
        w:36,
        h:18
      };
    }else{
      door={
        x:x+w-5,
        y:y+h/2-18,
        w:18,
        h:36
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

  const weaponData=[
    {type:"ナイフ",kind:"weapon",damage:18,range:44},
    {type:"鉄パイプ",kind:"weapon",damage:27,range:52}
  ];

  const armorData=[
    {type:"軽装アーマー",kind:"armor",reduction:3},
    {type:"防護ベスト",kind:"armor",reduction:6}
  ];

  for(let i=0;i<world.buildings.length;i++){
    const b=world.buildings[i];

    const ix=b.x+30+rng()*(b.w-60);
    const iy=b.y+30+rng()*(b.h-60);

    if(i<2){
      const w=weaponData[i%weaponData.length];

      items.push({
        x:ix,
        y:iy,
        type:w.type,
        kind:w.kind,
        value:w.damage,
        range:w.range,
        buildingId:b.id,
        taken:false
      });
    }

    if(i<2){
      const a=armorData[i%armorData.length];

      items.push({
        x:b.x+45+rng()*(b.w-90),
        y:b.y+45+rng()*(b.h-90),
        type:a.type,
        kind:a.kind,
        value:a.reduction,
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

function equippedWeapon(){
  const w=save.equipment.weapon;

  if(!w){
    return {
      name:"素手",
      damage:10,
      range:38
    };
  }

  return w;
}

function equippedArmor(){
  const a=save.equipment.armor;

  if(!a){
    return {
      name:"なし",
      reduction:0
    };
  }

  return a;
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
  if(!rectHitCircle(c,b))return false;

  if(pointInRect(c.x,c.y,b.door)){
    return false;
  }

  const inner={
    x:b.x+15,
    y:b.y+15,
    w:b.w-30,
    h:b.h-30
  };

  return !pointInRect(c.x,c.y,inner);
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

function pickup(item){
  item.taken=true;

  player.loot.push(item.type);

  if(item.kind==="weapon"){
    save.equipment.weapon={
      name:item.type,
      damage:item.value,
      range:item.range
    };
  }

  if(item.kind==="armor"){
    save.equipment.armor={
      name:item.type,
      reduction:item.value
    };
  }

  if(item.kind==="heal"){
    player.hp=Math.min(100,player.hp+item.value);
  }
}

function attack(){
  if(!running || attackTimer>0)return;

  attackTimer=.35;
  attackFlash=.14;

  const weapon=equippedWeapon();

  let target=null;
  let best=Infinity;

  for(const enemy of enemies){
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

  if(target.hp<=0){
    const index=enemies.indexOf(target);

    if(index>=0){
      enemies.splice(index,1);
    }

    player.loot.push("敵の戦利品");
  }
}

function finish(success,text){
  running=false;

  resultPanel.classList.remove("hidden");
  raidPanel.classList.add("hidden");

  document.getElementById("resultTitle").textContent =
    success ? "脱出成功" : "探索失敗";

  document.getElementById("resultText").textContent=text;

  if(success){
    save.stash.push(...player.loot);
    save.escapes++;
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

    if(
      Math.hypot(
        player.x-item.x,
        player.y-item.y
      )<25
    ){
      pickup(item);
    }
  }

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
      item.type,
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
    equippedWeapon().name;

  armorEl.textContent=
    equippedArmor().name;

  lootEl.textContent=
    player.loot.length;

  enemyEl.textContent=
    enemies.length;

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

  baseWeaponEl.textContent=
    equippedWeapon().name;

  baseWeapon2El.textContent=
    equippedWeapon().name;

  baseArmorEl.textContent=
    equippedArmor().name;

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
