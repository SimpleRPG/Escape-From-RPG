/* EFR base/crafting/equipment integration v1 */
(function(){
  "use strict";
  function G(){return window.EFRGame}
  function X(){return window.EFRContentExpansion}
  function clone(x){return x==null?x:JSON.parse(JSON.stringify(x))}
  function log(msg){G()?.logMessage?.(msg)}

  const EXTRA_RECIPES=[
    {name:"9mm弾",facility:"workbench",level:1,cost:{"火薬":1,"鉄くず":1,"ネジ":1},make:()=>({name:"9mm",kind:"ammo",amount:12,weight:.25,slots:1})},
    {name:"12ゲージ弾",facility:"workbench",level:1,cost:{"火薬":2,"鉄くず":1,"布":1},make:()=>({name:"12ゲージ",kind:"ammo",amount:6,weight:.3,slots:1})},
    {name:"5.56mm弾",facility:"workbench",level:2,cost:{"火薬":2,"高品質金属":1,"ネジ":1},make:()=>({name:"5.56mm",kind:"ammo",amount:10,weight:.3,slots:1})},
    {name:"7.62mm弾",facility:"workbench",level:2,cost:{"火薬":2,"高品質金属":1,"ボルト":1},make:()=>({name:"7.62mm",kind:"ammo",amount:8,weight:.4,slots:1})},
    {name:"救急キット",facility:"medical",level:1,cost:{"布":2,"医療素材":2,"接着剤":1},make:()=>({name:"救急キット",kind:"heal",value:70,weight:1,slots:1})},
    {name:"止血剤・改",facility:"medical",level:2,cost:{"布":1,"医療素材":3,"接着剤":1},make:()=>({name:"止血剤・改",kind:"heal",value:50,weight:.7,slots:1})},
    {name:"簡易ヘルメット",facility:"workshop",level:1,cost:{"鉄くず":3,"布":2,"ボルト":1},make:()=>({name:"軽量ヘルメット",kind:"armor",slotType:"head",reduction:2,durability:80,maxDurability:80,slots:1,weight:1.5})},
    {name:"防護ヘルメット",facility:"workshop",level:2,cost:{"高品質金属":2,"布":2,"ボルト":2},make:()=>({name:"防護ヘルメット",kind:"armor",slotType:"head",reduction:4,durability:100,maxDurability:100,slots:1,weight:2})},
    {name:"軽量アーマー",facility:"workshop",level:1,cost:{"鉄くず":4,"布":3,"革":2,"ボルト":2},make:()=>({name:"軽量アーマー",kind:"armor",slotType:"chest",reduction:3,durability:100,maxDurability:100,slots:2,weight:3})},
    {name:"防護ベスト",facility:"workshop",level:3,cost:{"高品質金属":3,"布":4,"革":2,"ボルト":3},make:()=>({name:"防護ベスト",kind:"armor",slotType:"chest",reduction:6,durability:130,maxDurability:130,slots:2,weight:4})},
    {name:"小型バックパック",facility:"workshop",level:1,cost:{"布":3,"革":2,"ボルト":1},make:()=>({name:"小型バックパック",kind:"backpack",slotType:"backpack",capacity:4,slots:2,weight:2})},
    {name:"タクティカルバックパック",facility:"workshop",level:2,cost:{"布":4,"革":3,"電子部品":1,"ボルト":2},make:()=>({name:"タクティカルバックパック",kind:"backpack",slotType:"backpack",capacity:10,slots:2,weight:3.5})},
    {name:"大型バックパック",facility:"workshop",level:4,cost:{"布":6,"革":4,"電子部品":2,"ボルト":4},make:()=>({name:"大型バックパック",kind:"backpack",slotType:"backpack",capacity:14,slots:3,weight:5})},
    {name:"簡易拳銃",facility:"workbench",level:2,cost:{"鉄くず":4,"高品質金属":1,"ネジ":3,"木材":1},make:()=>({name:"ハンドガン",kind:"firearm",damage:28,range:250,cooldown:.32,magSize:12,ammoType:"9mm",weight:1.4,durability:70,maxDurability:70,ammo:0,mods:[],slots:2})},
    {name:"簡易SMG",facility:"workbench",level:3,cost:{"鉄くず":5,"高品質金属":2,"ネジ":4,"電子部品":1},make:()=>({name:"SMG",kind:"firearm",damage:18,range:260,cooldown:.11,magSize:30,ammoType:"9mm",weight:2.8,durability:90,maxDurability:90,ammo:0,mods:[],slots:3})},
    {name:"修理キット・改",facility:"workbench",level:2,cost:{"鉄くず":3,"ネジ":2,"布":1,"接着剤":1},make:()=>({name:"修理キット・改",kind:"repair",weight:1,slots:1})}
  ];

  function base(){
    const a=G(); if(!a)return null;
    a.save.base=a.save.base||{level:1,xp:0,facilities:{}};
    a.save.base.level=Math.max(1,Math.min(5,Number(a.save.base.level||1)));
    a.save.base.facilities=Object.assign({storage:1,workbench:1,workshop:1,maintenance:1,medical:1},a.save.base.facilities||{});
    return a.save.base;
  }
  function facilityLevel(k){return Number(base()?.facilities?.[k]||1)}
  function hasFacility(k,l){
    if(facilityLevel(k)>=l)return true;
    log("必要設備: "+({workbench:"工作台",workshop:"工房",maintenance:"整備台",medical:"医療設備"}[k]||k)+" Lv."+l);
    return false;
  }
  function materialCount(n){
    const a=G();let t=0;
    for(const x of a?.save?.stash||[]){
      if(typeof x==="string"){if(x===n)t++}
      else if(x?.name===n)t+=Math.max(1,Number(x.amount||1));
    }
    return t;
  }
  function consumeMaterial(n,c){
    const a=G();let left=Math.max(0,Number(c||0));if(!a||left===0)return true;
    for(let i=(a.save.stash||[]).length-1;i>=0&&left>0;i--){
      const x=a.save.stash[i];
      if(!((typeof x==="string"&&x===n)||(x&&x.name===n)))continue;
      const amount=typeof x==="string"?1:Math.max(1,Number(x.amount||1));
      if(amount<=left){a.save.stash.splice(i,1);left-=amount}else{x.amount=amount-left;left=0}
    }
    return left===0;
  }
  function canPay(cost){return Object.entries(cost).every(([n,c])=>materialCount(n)>=c)}
  function storageCapacity(){
    const b=base();return 24+Math.max(0,(b?.level||1)-1)*4+Math.max(0,(b?.facilities?.storage||1)-1)*10;
  }
  function addStashItem(item){
    const a=G();if(!a||!item)return false;
    if(item.kind==="ammo"||item.kind==="material"){
      const same=(a.save.stash||[]).find(x=>x&&typeof x!=="string"&&x.name===item.name&&x.kind===item.kind);
      if(same){same.amount=(same.amount||1)+(item.amount||1);return true}
    }
    if((a.save.stash||[]).length>=storageCapacity()){log("倉庫容量がいっぱいです");return false}
    a.save.stash.push(clone(item));return true;
  }
  function repair(slot){
    const a=G(),w=a?.save?.equipment?.[slot];if(!a||!w)return false;
    if(!hasFacility("maintenance",1))return false;
    const max=Number(w.maxDurability||w.durability||100),cur=Number(w.durability??max);
    if(cur>=max){log("修理は必要ありません");return false}
    const cost=Math.max(1,Math.ceil((max-cur)/35));
    if(materialCount("鉄くず")+materialCount("高品質金属")<cost){log("修理素材が不足しています");return false}
    const high=Math.min(materialCount("高品質金属"),cost),scrap=cost-high;
    if(high&&!consumeMaterial("高品質金属",high))return false;
    if(scrap&&!consumeMaterial("鉄くず",scrap))return false;
    w.durability=max;a.persist?.();a.renderInventory?.();window.EFRHub?.render?.();log(w.name+"を完全修理しました");return true;
  }
  function upgrade(slot){
    const a=G(),w=a?.save?.equipment?.[slot];if(!a||!w)return false;
    if(!hasFacility("maintenance",1))return false;
    const lv=Number(w.upgradeLevel||0);if(lv>=3){log("改造上限です");return false}
    if(materialCount("高品質金属")<lv+1||materialCount("接着剤")<1){log("改造素材が不足しています");return false}
    if(!consumeMaterial("高品質金属",lv+1)||!consumeMaterial("接着剤",1))return false;
    w.upgradeLevel=lv+1;
    if(w.damage)w.damage=Math.round(w.damage*1.08);
    if(w.reduction)w.reduction=Math.max(w.reduction+1,Math.round(w.reduction*1.08));
    if(w.maxDurability)w.maxDurability+=5;
    if(w.durability!=null)w.durability=Math.min(w.maxDurability,w.durability+5);
    a.persist?.();a.renderInventory?.();window.EFRHub?.render?.();log(w.name+"を改造Lv."+(lv+1)+"にしました");return true;
  }
  function craft(name){
    const a=G(),x=X();if(!a||!x)return false;
    const original=(x.recipes||[]).find(r=>r&&(Array.isArray(r)?r[0]===name:r.name===name));
    const extra=EXTRA_RECIPES.find(r=>r.name===name),recipe=extra||original;
    if(!recipe){log("レシピが見つかりません");return false}
    const facility=Array.isArray(recipe)?((name.includes("包帯")||name.includes("止血"))?"medical":"workbench"):recipe.facility;
    const level=Array.isArray(recipe)?1:recipe.level,cost=Array.isArray(recipe)?recipe[1]:recipe.cost;
    if(!hasFacility(facility,level)||!canPay(cost)){
      if(canPay(cost)===false)log("素材が不足しています");
      return false;
    }
    for(const [n,c] of Object.entries(cost))if(!consumeMaterial(n,c)){log("素材消費に失敗しました");return false}
    const result=Array.isArray(recipe)?recipe[2]():recipe.make();
    if(!addStashItem(result)){
      for(const [n,c] of Object.entries(cost))a.save.stash.push({name:n,kind:"material",amount:c,slots:1,weight:1});
      a.persist?.();return false;
    }
    a.persist?.();window.EFRHub?.render?.();window.EFRLoadout?.render?.();log(name+"をクラフトしました");return true;
  }
  function augmentRecipes(){
    const x=X();if(!x)return;x.recipes=x.recipes||[];const names=new Set(x.recipes.map(r=>Array.isArray(r)?r[0]:r.name));
    for(const r of EXTRA_RECIPES)if(!names.has(r.name))x.recipes.push([r.name,r.cost,r.make]);
  }
  function patchFirearmLoadout(){
    const loadout=window.EFRLoadout;if(!loadout||loadout.__EFRFirearmPatched)return;
    const originalRender=loadout.render;if(typeof originalRender!=="function")return;
    function equip(index){
      const a=G(),item=a?.save?.stash?.[index];if(!a||!item||item.kind!=="firearm")return;
      const slot="weapon"+(a.activeWeaponSlot||1);
      if(a.save.player?.classId==="trainer"&&slot==="weapon2"){log("調教師は武器2枠をペットに使用します");return}
      const old=a.save.equipment[slot];a.save.equipment[slot]=clone(item);a.save.stash.splice(index,1);if(old)a.save.stash.push(clone(old));a.persist?.();a.renderInventory?.();originalRender();log(item.name+"を装備しました");
    }
    loadout.render=function(){
      originalRender();const panel=document.getElementById("efrLoadoutPanel");if(!panel)return;const stash=G()?.save?.stash||[];
      panel.querySelectorAll("[data-carry]").forEach(btn=>{const i=Number(btn.dataset.carry),item=stash[i];if(item?.kind==="firearm"){btn.textContent="装備";btn.dataset.efrFirearmEquip=String(i);btn.removeAttribute("data-carry")}});
    };
    if(!document.documentElement.dataset.efrFirearmClick){
      document.documentElement.dataset.efrFirearmClick="1";
      document.addEventListener("click",e=>{const b=e.target.closest("[data-efr-firearm-equip]");if(!b)return;e.preventDefault();e.stopImmediatePropagation();equip(Number(b.dataset.efrFirearmEquip))},true);
    }
    loadout.__EFRFirearmPatched=true;
  }
  function init(){
    if(!G()||!X())return false;augmentRecipes();const x=X();x.craft=craft;x.repair=repair;x.upgrade=upgrade;x.materialCount=materialCount;x.facilityLevel=facilityLevel;x.EXTRA_RECIPES=EXTRA_RECIPES;patchFirearmLoadout();G().baseStorageCapacity=storageCapacity;return true;
  }
  if(!init())setTimeout(init,0);
})();
