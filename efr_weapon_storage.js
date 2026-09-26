(function(){
  "use strict";

  const G=()=>window.EFRGame;
  const P=()=>window.EFRBaseParts;

  function esc(x){
    return String(x??"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function base(){
    const g=G();
    if(!g?.save)return null;

    g.save.base=g.save.base||{};
    g.save.base.weaponParts=
      Array.isArray(g.save.base.weaponParts)
        ?g.save.base.weaponParts
        :[];

    return g.save.base;
  }

  function defs(){
    return P()?.definitions||{};
  }

  function normalizedParts(){
    const b=base();
    if(!b)return [];

    b.weaponParts=b.weaponParts
      .map(x=>P()?.normalizePart?.(x))
      .filter(Boolean);

    return b.weaponParts;
  }

  function countPart(id,rarity){
    return normalizedParts().filter(
      x=>x.id===id &&
          Number(x.rarity||1)===Number(rarity)
    ).length;
  }

  function normalize(w){
    P()?.normalizeWeapon?.(w);
  }

  function attach(stashIndex,partId,partRarity){
    const g=G();
    const b=base();
    const definitions=defs();
    const w=g?.save?.stash?.[stashIndex];

    if(!g||!b||!w||w.kind!=="firearm"||w.isBow){
      g?.logMessage?.("銃器を選択してください");
      return false;
    }

    const p=definitions[partId];

    if(!p){
      g.logMessage?.("パーツが見つかりません");
      return false;
    }

    normalizedParts();

    const rarity=Math.max(
      1,
      Math.min(5,Number(partRarity||1))
    );

    const partIndex=b.weaponParts.findIndex(
      x=>x.id===partId &&
          Number(x.rarity||1)===rarity
    );

    if(partIndex<0){
      g.logMessage?.("そのレア度のパーツを所持していません");
      return false;
    }

    w.mods=Array.isArray(w.mods)
      ?w.mods.map(x=>P()?.normalizePart?.(x)).filter(Boolean)
      :[];

    const oldIndex=w.mods.findIndex(
      x=>definitions[x.id]?.slot===p.slot
    );

    if(oldIndex>=0){
      const old=w.mods[oldIndex];
      b.weaponParts.push(old);
      w.mods.splice(oldIndex,1);
    }

    w.mods.push({
      id:partId,
      rarity
    });

    b.weaponParts.splice(partIndex,1);

    normalize(w);
    g.persist?.();
    g.renderInventory?.();
    window.EFRHub?.render?.();

    g.logMessage?.(
      oldIndex>=0
        ? p.name+" "+P()?.rarityName?.(rarity)+"に交換しました"
        : p.name+" "+P()?.rarityName?.(rarity)+"を装着しました"
    );

    return true;
  }

  function remove(stashIndex,partId){
    const g=G();
    const b=base();
    const w=g?.save?.stash?.[stashIndex];

    if(!g||!b||!w||w.kind!=="firearm"||w.isBow)return false;

    w.mods=Array.isArray(w.mods)
      ?w.mods.map(x=>P()?.normalizePart?.(x)).filter(Boolean)
      :[];

    const i=w.mods.findIndex(
      x=>x.id===partId
    );

    if(i<0)return false;

    const old=w.mods.splice(i,1)[0];
    b.weaponParts.push(old);

    normalize(w);
    g.persist?.();
    window.EFRHub?.render?.();

    g.logMessage?.(
      (defs()[old.id]?.name||old.id)+
      " "+P()?.rarityName?.(old.rarity)+
      "を外して倉庫へ戻しました"
    );

    return true;
  }

  function inject(){
    const content=document.getElementById("efrHubContent");
    if(!content)return;

    const storage=content.querySelector(".hubStorage");
    if(!storage)return;

    const old=content.querySelector(".efrWeaponStorage");
    if(old)old.remove();

    const g=G();
    const stash=g?.save?.stash||[];
    const firearms=stash
      .map((x,i)=>({x,i}))
      .filter(v=>v.x?.kind==="firearm"&&!v.x?.isBow);

    const parts=normalizedParts();

    const section=document.createElement("div");
    section.className="hubSection efrWeaponStorage";

    section.innerHTML=
      "<h3>武器パーツ管理</h3>"+
      "<p class=\"efrWeaponStorageGuide\">武器パーツはLvを持たず、レア度だけを持ちます。</p>";

    if(parts.length){
      const inventory=document.createElement("div");
      inventory.className="efrWeaponPartInventory";

      const grouped=new Map();

      parts.forEach((p,index)=>{
        const key=p.id+"@"+p.rarity;
        if(!grouped.has(key)){
          grouped.set(key,{
            id:p.id,
            rarity:p.rarity,
            index,
            count:0
          });
        }
        grouped.get(key).count++;
      });

      for(const item of grouped.values()){
        const p=defs()[item.id];
        if(!p)continue;

        const card=document.createElement("article");
        card.className="efrWeaponPartInventoryCard";

        const nextCost=
          item.rarity<5
            ? G()?.weaponRarityCost?.(item.rarity+1)
            : null;

        card.innerHTML=
          "<strong>"+esc(p.name)+"</strong>"+
          "<small>"+
            esc(p.slot)+
            " / "+
            esc(P()?.rarityName?.(item.rarity))+
            " / ×"+
            item.count+
          "</small>"+
          (
            item.rarity<5
              ? "<button type=\"button\" data-efr-part-rarity=\""+
                item.index+"\">レア度を上げる</button>"+
                "<small>高品質金属 ×"+
                esc(nextCost?.["高品質金属"]||0)+
                " / 接着剤 ×"+
                esc(nextCost?.["接着剤"]||0)+
                " / 電子部品 ×"+
                esc(nextCost?.["電子部品"]||0)+
                "</small>"
              : "<small>レア度最大</small>"
          );

        inventory.appendChild(card);
      }

      section.appendChild(inventory);
    }else{
      section.innerHTML+=
        "<p>所持している武器パーツはありません。</p>";
    }

    if(!firearms.length){
      section.innerHTML+=
        "<p>倉庫に装着対象の銃器はありません。</p>";
    }else{
      const grid=document.createElement("div");
      grid.className="efrWeaponStorageGrid";

      for(const {x,i} of firearms){
        const card=document.createElement("article");
        card.className="efrWeaponCard";

        const mods=Array.isArray(x.mods)
          ?x.mods.map(v=>P()?.normalizePart?.(v)).filter(Boolean)
          :[];

        card.innerHTML=
          "<strong>"+esc(x.name)+"</strong>"+
          "<small>耐久 "+
          esc(
            (x.durability??x.maxDurability??"-")+
            "/"+
            (x.maxDurability??"-")
          )+
          "</small>"+
          "<div class=\"efrWeaponMods\">"+
          (
            mods.length
              ?mods.map(part=>
                "<button type=\"button\" data-efr-remove=\""+
                i+
                "\" data-part=\""+esc(part.id)+"\">"+
                esc(defs()[part.id]?.name||part.id)+
                " / "+
                esc(P()?.rarityName?.(part.rarity))+
                " ×外す</button>"
              ).join("")
              :"<span>装着パーツなし</span>"
          )+
          "</div>";

        const partGrid=document.createElement("div");
        partGrid.className="efrWeaponPartGrid";

        for(const [id,p] of Object.entries(defs())){
          for(const rarity of [1,2,3,4,5]){
            const n=countPart(id,rarity);
            if(n<=0)continue;

            const btn=document.createElement("button");
            btn.type="button";
            btn.dataset.efrAttach=String(i);
            btn.dataset.part=id;
            btn.dataset.partRarity=String(rarity);
            btn.textContent=
              p.name+
              " / "+
              P()?.rarityName?.(rarity)+
              " ×"+n;

            partGrid.appendChild(btn);
          }
        }

        card.appendChild(partGrid);
        grid.appendChild(card);
      }

      section.appendChild(grid);
    }

    storage.parentElement.appendChild(section);
  }

  function onClick(e){
    const up=e.target.closest("[data-efr-part-rarity]");
    if(up){
      e.preventDefault();
      e.stopPropagation();

      G()?.upgradeWeaponPartRarity?.(
        Number(up.dataset.efrPartRarity)
      );

      return;
    }

    const a=e.target.closest("[data-efr-attach]");
    if(a){
      e.preventDefault();
      e.stopPropagation();

      attach(
        Number(a.dataset.efrAttach),
        a.dataset.part,
        Number(a.dataset.partRarity||1)
      );

      return;
    }

    const r=e.target.closest("[data-efr-remove]");
    if(r){
      e.preventDefault();
      e.stopPropagation();

      remove(
        Number(r.dataset.efrRemove),
        r.dataset.part
      );
    }
  }

  document.addEventListener("click",onClick,true);

  const observer=new MutationObserver(()=>{
    inject();
  });

  observer.observe(document.body,{
    childList:true,
    subtree:true
  });

  window.EFRWeaponStorage={
    attach,
    remove,
    refresh:inject
  };

  setTimeout(inject,250);
})();
