(function(){
"use strict";
const G=()=>window.EFRGame;
const N={military:"軍用鍵",research:"研究施設鍵",factory:"工場鍵",storage:"倉庫鍵",security:"保安区画鍵",special:"特殊区画鍵"};
const S=["weapon1","weapon2","head","chest","legs","backpack"];
function detail(item){
 const e=document.getElementById("raidInventoryDetail");if(!e||!item)return;
 const a=["種類: "+(item.kind==="key"?"鍵":item.kind==="armor"?"防具":item.kind==="backpack"?"バッグ":"武器")];
 if(item.damage!=null)a.push("ダメージ: "+item.damage);
 if(item.range!=null)a.push("射程: "+item.range);
 if(item.cooldown!=null)a.push("攻撃間隔: "+item.cooldown);
 if(item.magazine!=null)a.push("装弾数: "+item.magazine);
 if(item.durability!=null)a.push("耐久: "+item.durability);
 if(item.kind==="key")a.push("鍵種別: "+(N[item.keyType]||item.keyType));
 if(item.capacity!=null)a.push("容量: "+item.capacity);
 if(Array.isArray(item.mods)&&item.mods.length)a.push("アタッチメント: "+item.mods.map(x=>window.EFRBaseParts?.definitions?.[x.id]?.name||x.id).join(" / "));
 e.innerHTML="<div class=raidDetailHead><strong>"+(item.name||"装備")+"</strong><button type=button data-raid-detail-close>閉じる</button></div>"+a.map(x=>"<div class=raidDetailRow>"+x+"</div>").join("");
 e.classList.remove("hidden");
}
function decorate(){
 const g=G(),p=document.getElementById("inventoryPanel"),c=document.getElementById("inventoryContents");if(!g||!p||!c)return;
 p.classList.add("efrRaidInventoryModal");
 let d=document.getElementById("raidInventoryDetail");
 if(!d){d=document.createElement("div");d.id="raidInventoryDetail";d.className="raidInventoryDetail hidden";p.appendChild(d);}
 c.querySelectorAll(".efrSlotItem").forEach(el=>{
  const i=Number(el.dataset.gridItemIndex),item=g.player.loot[i],b=el.querySelector(".efrSlotItemBody");if(!item||!b)return;
  if(!b.querySelector("[data-raid-detail]")){const x=document.createElement("button");x.type="button";x.dataset.raidDetail="loot:"+i;x.textContent="確認";b.appendChild(x);}
 });
 document.querySelectorAll("#equipmentSlots .equipmentSlot").forEach((el,i)=>{
  const item=g.save.equipment?.[S[i]];if(!item)return;
  if(!el.querySelector("[data-raid-detail]")){const x=document.createElement("button");x.type="button";x.dataset.raidDetail=S[i];x.textContent="確認";el.appendChild(x);}
 });
 let k=document.getElementById("raidKeyStorage");
 if(!k){k=document.createElement("div");k.id="raidKeyStorage";p.appendChild(k);}
 const keys=Array.isArray(g.player.raidKeys)?g.player.raidKeys:[];
 k.innerHTML="<strong>鍵保管</strong>"+(keys.length?keys.map(id=>"<div class=raidKeyRow><span>"+(N[id]||id)+"</span><small>使用中</small></div>").join(""):"<small>保管中の鍵はありません</small>");
}
function render(){G()?.renderInventory?.();setTimeout(decorate,0);}
function boot(){
 const g=G();if(!g){setTimeout(boot,100);return;}
 const old=g.renderInventory;g.renderInventory=function(){old();setTimeout(decorate,0);};
 document.addEventListener("click",e=>{
  const d=e.target.closest("[data-raid-detail]");
  if(d){const k=d.dataset.raidDetail;detail(k.startsWith("loot:")?G().player.loot[Number(k.slice(5))]:G().save.equipment?.[k]);return;}
  if(e.target.closest("[data-raid-detail-close]")){document.getElementById("raidInventoryDetail")?.classList.add("hidden");return;}
 });
 const st=document.createElement("style");st.textContent=".raidInventoryDetail{margin-top:8px;padding:9px;background:#171a20;border:1px solid #353c46;border-radius:9px}.raidDetailHead,.raidKeyRow{display:flex;align-items:center;justify-content:space-between;gap:7px}.raidDetailRow,.raidKeyRow{padding:7px;margin-top:5px;background:#20252c;border-radius:7px}.raidInventoryDetail button{padding:6px 8px}#raidKeyStorage{margin-top:8px;padding:8px;background:#171a20;border:1px solid #353c46;border-radius:9px}";document.head.appendChild(st);
 setTimeout(decorate,0);
}
boot();
})();