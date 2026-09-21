const canvas=document.getElementById("game"),ctx=canvas.getContext("2d");
const basePanel=document.getElementById("basePanel"),raidPanel=document.getElementById("raidPanel"),resultPanel=document.getElementById("resultPanel");
const statusEl=document.getElementById("status"),hpEl=document.getElementById("hp"),lootEl=document.getElementById("lootCount"),enemyEl=document.getElementById("enemyCount");
const baseLootEl=document.getElementById("baseLoot"),escapesEl=document.getElementById("escapes"),stashEl=document.getElementById("stash");
const W=960,H=540,keys=new Set();let running=false,last=0,damageTimer=0;
const save=JSON.parse(localStorage.getItem("efr-save")||'{"stash":[],"escapes":0}');
const player={x:70,y:270,r:15,hp:100,speed:190,loot:[]};
const exit={x:880,y:215,w:42,h:110};
const walls=[
{x:0,y:0,w:960,h:18},{x:0,y:522,w:960,h:18},{x:0,y:0,w:18,h:540},{x:942,y:0,w:18,h:540},
{x:180,y:80,w:32,h:300},{x:330,y:160,w:250,h:28},{x:620,y:70,w:32,h:250},{x:720,y:350,w:150,h:30},{x:410,y:390,w:32,h:100}
];
const items=[
{x:115,y:100,type:"薬草",taken:false},{x:275,y:440,type:"古い鍵",taken:false},
{x:690,y:145,type:"食料",taken:false},{x:820,y:450,type:"部品",taken:false}
];
let enemies=[];

function newRaid(){
 player.x=70;player.y=270;player.hp=100;player.loot=[];damageTimer=0;
 items.forEach(i=>i.taken=false);
 enemies=[
  {x:280,y:110,r:16,hp:40,speed:48},
  {x:560,y:450,r:16,hp:40,speed:52},
  {x:800,y:190,r:16,hp:40,speed:45}
 ];
}

function rectHitCircle(c,r){
 const nx=Math.max(r.x,Math.min(c.x,r.x+r.w)),ny=Math.max(r.y,Math.min(c.y,r.y+r.h));
 return Math.hypot(c.x-nx,c.y-ny)<c.r;
}

function movePlayer(dx,dy,dt){
 let nx=player.x+dx*dt,ny=player.y+dy*dt;
 let test={x:nx,y:ny,r:player.r};
 if(!walls.some(w=>rectHitCircle(test,w)))player.x=nx;
 test.x=player.x;test.y=ny;
 if(!walls.some(w=>rectHitCircle(test,w)))player.y=ny;
 player.x=Math.max(25,Math.min(W-25,player.x));
 player.y=Math.max(25,Math.min(H-25,player.y));
}

function finish(ok,text){
 running=false;
 resultPanel.classList.remove("hidden");
 raidPanel.classList.add("hidden");
 document.getElementById("resultTitle").textContent=ok?"脱出成功":"探索失敗";
 document.getElementById("resultText").textContent=text;
 if(ok){
  save.stash.push(...player.loot);
  save.escapes++;
  localStorage.setItem("efr-save",JSON.stringify(save));
 }
 statusEl.textContent=ok?"帰還":"失敗";
 renderBase();
}

function update(dt){
 let dx=(keys.has("ArrowRight")||keys.has("d")?1:0)-(keys.has("ArrowLeft")||keys.has("a")?1:0);
 let dy=(keys.has("ArrowDown")||keys.has("s")?1:0)-(keys.has("ArrowUp")||keys.has("w")?1:0);

 if(dx||dy){
  const n=Math.hypot(dx,dy);
  movePlayer(dx/n,dy/n,player.speed*dt);
 }

 for(const e of enemies){
  const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
  const nx=e.x+dx/d*e.speed*dt,ny=e.y+dy/d*e.speed*dt;

  if(d<240&&!walls.some(w=>rectHitCircle({x:nx,y:ny,r:e.r},w))){
   e.x=nx;
   e.y=ny;
  }

  if(d<e.r+player.r+5&&damageTimer<=0){
   player.hp-=10;
   damageTimer=.6;
  }
 }

 damageTimer=Math.max(0,damageTimer-dt);

 for(const i of items){
  if(!i.taken&&Math.hypot(player.x-i.x,player.y-i.y)<28){
   i.taken=true;
   player.loot.push(i.type);
  }
 }

 if(player.hp<=0)
  finish(false,"力尽きました。今回の戦利品は失われました。");

 if(player.x>exit.x&&player.y>exit.y&&player.y<exit.y+exit.h)
  finish(true,"脱出成功。回収したアイテムを拠点へ持ち帰りました。");
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

 for(const w of walls){
  ctx.fillStyle="#454b43";
  ctx.fillRect(w.x,w.y,w.w,w.h);
 }

 ctx.fillStyle="#3c8f61";
 ctx.fillRect(exit.x,exit.y,exit.w,exit.h);
 ctx.fillStyle="#d8f5df";
 ctx.font="bold 14px sans-serif";
 ctx.fillText("EXIT",exit.x+3,exit.y+58);

 for(const i of items){
  if(!i.taken){
   ctx.fillStyle="#d8a23a";
   ctx.beginPath();
   ctx.arc(i.x,i.y,9,0,Math.PI*2);
   ctx.fill();

   ctx.fillStyle="#fff";
   ctx.font="11px sans-serif";
   ctx.fillText(i.type,i.x-16,i.y-14);
  }
 }

 for(const e of enemies){
  ctx.fillStyle="#a94444";
  ctx.beginPath();
  ctx.arc(e.x,e.y,e.r,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle="#fff";
  ctx.fillRect(e.x-12,e.y-23,24,3);

  ctx.fillStyle="#61c46d";
  ctx.fillRect(e.x-12,e.y-23,24*Math.max(0,e.hp/40),3);
 }

 ctx.fillStyle="#4f8fe8";
 ctx.beginPath();
 ctx.arc(player.x,player.y,player.r,0,Math.PI*2);
 ctx.fill();

 hpEl.textContent=Math.max(0,player.hp);
 lootEl.textContent=player.loot.length;
 enemyEl.textContent=enemies.length;
}

function loop(t){
 if(!running)return;

 const dt=Math.min(.033,(t-last)/1000||0);
 last=t;

 update(dt);
 draw();

 if(running)
  requestAnimationFrame(loop);
}

function start(){
 basePanel.classList.add("hidden");
 resultPanel.classList.add("hidden");
 raidPanel.classList.remove("hidden");

 statusEl.textContent="探索中";

 newRaid();

 running=true;
 last=performance.now();
 requestAnimationFrame(loop);
}

function renderBase(){
 baseLootEl.textContent=save.stash.length;
 escapesEl.textContent=save.escapes;

 stashEl.innerHTML=save.stash.length
  ?save.stash.map(x=>"<span>"+x+"</span>").join("")
  :"<span>まだ戦利品はありません</span>";
}

document.getElementById("startBtn").onclick=start;

document.getElementById("returnBtn").onclick=()=>{
 resultPanel.classList.add("hidden");
 basePanel.classList.remove("hidden");
 statusEl.textContent="拠点";
};

addEventListener("keydown",e=>{
 keys.add(e.key);

 if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))
  e.preventDefault();
});

addEventListener("keyup",e=>keys.delete(e.key));

document.querySelectorAll(".mobileControls button").forEach(b=>{
 const k=b.dataset.key;

 b.onpointerdown=e=>{
  e.preventDefault();
  keys.add(k);
 };

 b.onpointerup=b.onpointercancel=b.onpointerleave=()=>{
  keys.delete(k);
 };
});

renderBase();
