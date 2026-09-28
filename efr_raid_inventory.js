(function(){
  "use strict";
  const G=()=>window.EFRGame;
  const parts=()=>G()?.save?.base?.weaponParts||[];
  const defs=()=>window.EFRBaseParts?.definitions||{};
  const normalize=x=>window.EFRBaseParts?.normalizePart?.(x)||x;
  const label=id=>defs()[id]?.name||id;
  function target(key){
    const g=G();
    if(!g)return null;
    if(key.startsWith("loot:"))return g.player.loot[Number(key.slice(5))]||null;
    return g.save.equipment?.[key]||null;
  }
  function normalizeWeapon(w){window.EFRBaseParts?.normalizeWeapon?.(w)}
  function attach(key,id,rarity){
    const g=G(),w=target(key),b=g?.save?.base;
    if(!g||!w||w.kind!=="firearm"||w.isBow||!b)return;
    const p=defs()[id];
    if(!p)return;
    b.weaponParts=Array.isArray(b.weaponParts)?b.weaponParts:[];
    const r=Math.max(1,Math.min(5,Number(rarity||1)));
    const i=b.weaponParts.findIndex(x=>{x=normalize(x);return x?.id===id&&Number(x.rarity||1)===r});
    if(i<0)return;
    w.mods=Array.isArray(w.mods)?w.mods.map(normalize).filter(Boolean):[];
    const old=w.mods.findIndex(x=>defs()[x.id]?.slot===p.slot);
    if(old>=0)b.weaponParts.push(w.mods.splice(old,1)[0]);
    w.mods.push({id,rarity:r});
    b.weaponParts.splice(i,1);
    normalizeWeapon(w);g.persist?.();render();g.logMessage?.(label(id)+"を装着しました");
  }
  function detach(key,id){
    const g=G(),w=target(key),b=g?.save?.base;
    if(!g||!w||!b)return;
    w.mods=Array.isArray(w.mods)?w.mods.map(normalize).filter(Boolean):[];
    const i=w.mods.findIndex(x=>x.id===id);
    if(i<0)return;
    b.weaponParts=Array.isArray(b.weaponParts)?b.weaponParts:[];
    b.weaponParts.push(w.mods.splice(i,1)[0]);
    normalizeWeapon(w);g.persist?.();render();g.logMessage?.(label(id)+"を外しました");
  }
  function panel(){return document.getElementById("raidAttachmentPanel")}
  function show(key){
    const w=target(key),el=panel();
    if(!w||!el)return;
    const ds=defs();w.mods=Array.isArray(w.mods)?w.mods.map(normalize).filter(Boolean):[];
    const grouped=new Map();
    for(const x of parts()){
      const p=normalize(x);if(!p||!ds[p.id])continue;
      const k=p.id+"@"+Number(p.rarity||1);grouped.set(k,(grouped.get(k)||0)+1);
    }
    el.innerHTML=`<div class="raidAttachmentHead"><strong>${w.name||"銃器"} のアタッチメント</strong><button type="button" data-raid-attach-close>閉じる</button></div><div class="raidAttachmentMods">${w.mods.length?w.mods.map(x=>`<div class="raidAttachmentRow"><span>${label(x.id)} / ${window.EFRBaseParts?.rarityName?.(x.rarity)||""}</span><button type="button" data-raid-detach="${key}" data-part-id="${x.id}">外す</button></div>`).join(""):"<small>装着中のアタッチメントはありません</small>"}</div><div class="raidAttachmentParts"><strong>保管中のアタッチメント</strong>${grouped.size?[...grouped].map(([k,count])=>{const [id,r]=k.split("@");return `<div class="raidAttachmentRow"><span>${label(id)} / ${window.EFRBaseParts?.rarityName?.(Number(r))||""} ×${count}</span><button type="button" data-raid-attach="${key}" data-part-id="${id}" data-part-rarity="${r}">装着</button></div>`}).join(""):"<small>保管中のアタッチメントはありません</small>"}</div>`;
    el.classList.remove("hidden");
  }
  function decorate(){
    const g=G(),panel=document.getElementById("inventoryPanel"),content=document.getElementById("inventoryContents");
    if(!g||!panel||!content)return;
    panel.classList.add("efrRaidInventoryModal");
    if(!document.getElementById("raidAttachmentPanel")){
      const e=document.createElement("div");e.id="raidAttachmentPanel";e.className="raidAttachmentPanel hidden";panel.appendChild(e);
    }
    content.querySelectorAll(".efrSlotItem").forEach(el=>{
      const i=Number(el.dataset.gridItemIndex),item=g.player.loot[i];
      if(item?.kind!=="firearm"||item.isBow||el.querySelector("[data-raid-attachment]"))return;
      const b=document.createElement("button");b.type="button";b.dataset.raidAttachment="loot:"+i;b.textContent="アタッチメント";el.querySelector(".efrSlotItemBody")?.appendChild(b);
    });
    document.querySelectorAll("#equipmentSlots .equipmentSlot").forEach((el,i)=>{
      const keys=["weapon1","weapon2","head","chest","legs","backpack"],key=keys[i],item=g.save.equipment?.[key];
      if(item?.kind!=="firearm"||item.isBow||el.querySelector("[data-raid-attachment]"))return;
      const b=document.createElement("button");b.type="button";b.dataset.raidAttachment=key;b.textContent="アタッチメント";el.appendChild(b);
    });
  }
  function render(){G()?.renderInventory?.();setTimeout(decorate,0)}
  function boot(){
    const g=G();if(!g){setTimeout(boot,100);return}
    const old=g.renderInventory;g.renderInventory=function(){old();setTimeout(decorate,0)};
    document.addEventListener("click",e=>{
      const a=e.target.closest("[data-raid-attachment]");if(a){show(a.dataset.raidAttachment);return}
      const x=e.target.closest("[data-raid-attach]");if(x){attach(x.dataset.raidAttach,x.dataset.partId,x.dataset.partRarity);return}
      const d=e.target.closest("[data-raid-detach]");if(d){detach(d.dataset.raidDetach,d.dataset.partId);return}
      if(e.target.closest("[data-raid-attach-close]")){panel()?.classList.add("hidden")}
    });
    const style=document.createElement("style");style.textContent="#inventoryPanel.efrRaidInventoryModal{position:fixed;inset:8px;z-index:200;background:#111419ee;border:1px solid #4a515c;border-radius:14px;padding:10px;overflow:auto;box-shadow:0 14px 45px #000}.raidAttachmentPanel{margin-top:8px;padding:9px;background:#171a20;border:1px solid #353c46;border-radius:9px}.raidAttachmentHead,.raidAttachmentRow{display:flex;align-items:center;justify-content:space-between;gap:7px}.raidAttachmentRow{padding:7px;margin-top:5px;background:#20252c;border-radius:7px}.raidAttachmentParts{margin-top:8px}.raidAttachmentPanel button{padding:6px 8px}";document.head.appendChild(style);setTimeout(decorate,0)
  }
  boot();
})();
