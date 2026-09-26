/* EFR content expansion: richer items, firearms, ammo, durability, weight, crafting, repair and upgrades */
(function(){
"use strict";
const C={
materials:[
["鉄くず",1],["木材",1],["布",1],["革",1],["ボルト",1],["ネジ",1],["電子部品",1],["バッテリー",1],["ケーブル",1],["ガラス",1],["プラスチック",1],["医療素材",1],["火薬",1],["接着剤",1],["高品質金属",2]],
weapons:[
["ハンドガン","firearm",28,250,.32,12,"9mm",1.4,70],["SMG","firearm",18,260,.11,30,"9mm",2.8,90],["ショットガン","firearm",52,190,.8,6,"12ゲージ",4.2,80],["アサルトライフル","firearm",24,300,.14,30,"5.56mm",3.6,100],["マークスマンライフル","firearm",48,420,.55,10,"7.62mm",4.4,110],["バット","weapon",34,48,.58,0,null,2.2,80],["ハンマー","weapon",42,42,.72,0,null,2.8,75],["手斧","weapon",46,45,.64,0,null,2.5,70],["マチェット","weapon",38,52,.42,0,null,2,85]],
armor:[["強化ヘルメット","head",7,2],["戦術ヘルメット","head",9,2.5],["軽量プレート","chest",7,3],["重装プレート","chest",11,5],["戦術ブーツ","legs",5,2],["強化ブーツ","legs",7,2.7]],
bags:[["軍用バックパック",18,4,3],["大型遠征バックパック",26,6,4]],
medical:[["包帯",20,.5],["止血剤",35,.7],["救急キット",70,1.5]],
ammo:[["9mm",.25],["12ゲージ",.55],["5.56mm",.3],["7.62mm",.4]],
tools:[["工具セット","tool",1.8],["修理キット","repair",1.2],["電子工具","tool",1.5]]
};
const mk=(name,kind,x)=>Object.assign({name,kind,slots:1,weight:1},x||{});
function weapon(name){const v=C.weapons.find(x=>x[0]===name);return v&&mk(v[0],v[1],{damage:v[2],range:v[3],cooldown:v[4],magSize:v[5],ammoType:v[6],weight:v[7],durability:v[8],maxDurability:v[8],ammo:0,mods:[]});}
function loot(place){
 const r=Math.random(), a=[];
 if(place==="武器庫"||r<.12)a.push(weapon(C.weapons[(Math.random()*C.weapons.length)|0][0]));
 else if(place==="医務室"||r<.22){const x=C.medical[(Math.random()*C.medical.length)|0];a.push(mk(x[0],"heal",{value:x[1],weight:x[2]}));}
 else if(r<.37){const x=C.ammo[(Math.random()*C.ammo.length)|0];a.push(mk(x[0],"ammo",{amount:2+((Math.random()*8)|0),weight:x[1]}));}
 else if(r<.48){const x=C.armor[(Math.random()*C.armor.length)|0];a.push(mk(x[0],"armor",{slotType:x[1],reduction:x[2],weight:x[3],slots:2}));}
 else if(r<.56){const x=C.bags[(Math.random()*C.bags.length)|0];a.push(mk(x[0],"backpack",{capacity:x[1],weight:x[2],slots:x[3]}));}
 else if(r<.66){const x=C.tools[(Math.random()*C.tools.length)|0];a.push(mk(x[0],x[1],{weight:x[2]}));}
 else {const x=C.materials[(Math.random()*C.materials.length)|0];a.push(mk(x[0],"material",{weight:x[1],slots:x[1]}));if(Math.random()<.35){const y=C.materials[(Math.random()*C.materials.length)|0];a.push(mk(y[0],"material",{weight:y[1],slots:y[1]}));}}
 return a;
}
const oldFit=window.backpackCanFit,oldAdd=window.addToBackpack;
function weight(){return (window.player?.loot||[]).reduce((n,x)=>n+(x.weight||1)*(x.amount||1),0);}
function limit(){return 10+((window.save?.equipment?.backpack?.capacity||0)+4)*1.8;}
window.backpackCanFit=function(x){return oldFit(x)&&weight()+(x.weight||1)*(x.amount||1)<=limit();};
window.addToBackpack=function(x){if(!window.backpackCanFit(x)){window.logMessage?.("バッグ容量または重量が足りません");return false;}return oldAdd(x);};

function materialCount(name){return (window.save?.stash||[]).filter(x=>x===name).length+(window.player?.loot||[]).filter(x=>x.name===name).reduce((n,x)=>n+(x.amount||1),0);}
const recipes=[
["包帯",{"布":2,"医療素材":1},()=>mk("包帯","heal",{value:20,weight:.5})],
["修理キット",{"鉄くず":2,"ネジ":2,"布":1},()=>mk("修理キット","repair",{weight:1.2})],
["簡易バット",{"木材":2,"鉄くず":2,"ボルト":2},()=>mk("バット","weapon",{damage:34,range:48,cooldown:.58,knockback:16,weight:2.2,durability:80,maxDurability:80,slots:2})],
["電子センサー",{"電子部品":2,"バッテリー":1,"ケーブル":1},()=>mk("電子センサー","tool",{weight:1})]
];
function craft(name){
 const r=recipes.find(x=>x[0]===name);if(!r)return;
 if(!Object.entries(r[1]).every(([k,v])=>materialCount(k)>=v)){window.logMessage?.("素材が不足しています");return;}
 for(const [k,v] of Object.entries(r[1])){let n=v;for(let i=window.save.stash.length-1;i>=0&&n;i--)if(window.save.stash[i]===k){window.save.stash.splice(i,1);n--;}}
 const x=r[2]();if(window.addToBackpack(x)){window.save.efrStats=(window.save.efrStats||{crafted:0,repaired:0,upgraded:0});window.save.efrStats.crafted++;window.persist();window.renderInventory?.();}else{for(const [k,v] of Object.entries(r[1]))for(let i=0;i<v;i++)window.save.stash.push(k);}
}
function repair(slot){const w=window.save?.equipment?.[slot];if(!w)return;if((w.durability??w.maxDurability??100)>=(w.maxDurability??100))return;const need=Math.max(1,Math.ceil(((w.maxDurability||100)-(w.durability||0))/25));let ok=0;for(let i=window.save.stash.length-1;i>=0&&ok<need;i--)if(window.save.stash[i]==="鉄くず"){window.save.stash.splice(i,1);ok++;}if(ok<need){window.logMessage?.("鉄くずが不足しています");return;}w.durability=w.maxDurability||100;window.save.efrStats=(window.save.efrStats||{crafted:0,repaired:0,upgraded:0});window.save.efrStats.repaired++;window.persist();window.renderInventory?.();}
function upgrade(slot){const w=window.save?.equipment?.[slot];if(!w)return;const lv=w.upgradeLevel||0;if(lv>=3)return;if(materialCount("高品質金属")<lv+1||materialCount("接着剤")<1)return;let n=lv+1;for(let i=window.save.stash.length-1;i>=0&&n;i--)if(window.save.stash[i]==="高品質金属"){window.save.stash.splice(i,1);n--;}n=1;for(let i=window.save.stash.length-1;i>=0&&n;i--)if(window.save.stash[i]==="接着剤"){window.save.stash.splice(i,1);n--;}w.upgradeLevel=lv+1;if(w.damage)w.damage=Math.round(w.damage*1.08);if(w.reduction)w.reduction=Math.round(w.reduction*1.08);window.save.efrStats=(window.save.efrStats||{crafted:0,repaired:0,upgraded:0});window.save.efrStats.upgraded++;window.persist();window.renderInventory?.();}

function firearmAttack(){
 if(!window.running||window.attackTimer>0)return;const w=window.equippedWeapon?.();if(!w)return;
 if(w.kind==="firearm"){if((w.durability||0)<=0){window.logMessage?.("武器が壊れています");return;}if((w.ammo||0)<=0){window.logMessage?.("弾切れ。Rでリロード");return;}w.ammo--;w.durability--;window.attackTimer=w.cooldown||.3;window.attackFlash=.14;let t=null,b=Infinity;for(const e of window.enemies||[]){if(e.dead)continue;const d=Math.hypot(window.player.x-e.x,window.player.y-e.y);if(d<=w.range+(e.r||15)&&d<b&&window.playerCanSeeEnemy(e)){b=d;t=e;}}if(t){t.hp-=w.damage;if(t.hp<=0){t.dead=true;t.loot=loot("敵");}}return;}
 if((w.durability??100)<=0){window.logMessage?.("武器が壊れています");return;}if(w.durability!==undefined)w.durability--;window.attackTimer=0;window.attack?.();
}
function reload(){const w=window.equippedWeapon?.();if(!w||w.kind!=="firearm")return;const i=window.player.loot.findIndex(x=>x.kind==="ammo"&&x.name===w.ammoType&&(x.amount||0)>0);if(i<0){window.logMessage?.("対応する弾薬がありません");return;}const a=window.player.loot[i],n=Math.min((w.magSize||1)-(w.ammo||0),a.amount||1);w.ammo=(w.ammo||0)+n;a.amount-=n;if(a.amount<=0)window.player.loot.splice(i,1);window.renderInventory?.();}

function spawnExpansion(){
 const old=window.items;
 for(const b of window.world.buildings||[])for(let i=0;i<1+(Math.random()<.45);i++){const l=loot(b.name);for(const x of l)old.push(Object.assign(x,{x:b.x+30+Math.random()*Math.max(20,b.w-60),y:b.y+30+Math.random()*Math.max(20,b.h-60),buildingId:b.id,taken:false}));}
}
function install(){
 if(document.getElementById("efrExpansionPanel"))return;const hud=document.querySelector(".hud");if(!hud)return;
 const p=document.createElement("div");p.id="efrExpansionPanel";p.className="expansionPanel";p.innerHTML='<strong>重量 <span id="efrWeight">0</span></strong><button id="reloadBtn">R リロード</button><button id="craftBtn">クラフト</button><button id="repairBtn">修理</button><button id="upgradeBtn">改造</button>';hud.appendChild(p);
 const box=document.createElement("div");box.id="craftBox";box.className="craftBox hidden";box.innerHTML="<strong>クラフト</strong>"+recipes.map(r=>'<button data-craft="'+r[0]+'">'+r[0]+" / "+Object.entries(r[1]).map(x=>x[0]+"×"+x[1]).join(" ")+"</button>").join("");document.getElementById("raidPanel")?.appendChild(box);
 p.querySelector("#reloadBtn").onclick=reload;p.querySelector("#craftBtn").onclick=()=>box.classList.toggle("hidden");p.querySelector("#repairBtn").onclick=()=>repair("weapon"+(window.activeWeaponSlot||1));p.querySelector("#upgradeBtn").onclick=()=>upgrade("weapon"+(window.activeWeaponSlot||1));box.onclick=e=>{const b=e.target.closest("[data-craft]");if(b)craft(b.dataset.craft);};
}
document.addEventListener("click",e=>{if(e.target.id==="attackBtn"){e.stopImmediatePropagation();firearmAttack();}},true);
document.addEventListener("keydown",e=>{if(e.key==="r"){e.preventDefault();e.stopImmediatePropagation();reload();}else if(e.key===" "){e.preventDefault();e.stopImmediatePropagation();firearmAttack();}},true);
document.addEventListener("click",e=>{if(e.target.id==="startBtn"){e.stopImmediatePropagation();window.start();setTimeout(spawnExpansion,0);install();}},true);
const oldDraw=window.draw;window.draw=function(){oldDraw();const e=document.getElementById("efrWeight");if(e)e.textContent=weight().toFixed(1)+" / "+limit().toFixed(1);};
setTimeout(install,100);
window.EFRContentExpansion={catalog:C,craft,repair,upgrade,reload,weight,limit};
})();