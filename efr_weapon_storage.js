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

  function countPart(id){
    return base()?.weaponParts?.filter(x=>x===id).length||0;
  }

  function normalize(w){
    P()?.normalizeWeapon?.(w);
  }

  function attach(stashIndex,partId){
    const g=G();
    const b=base();
    const definitions=defs();
    const w=g?.save?.stash?.[stashIndex];
    const p=definitions[partId];

    if(!g||!b||!w||w.kind!=="firearm"||w.isBow){
      g?.logMessage?.("銃器を選択してください");
      return false;
    }

    if(!p){
      g.logMessage?.("パーツが見つかりません");
      return false;
    }

    const partIndex=b.weaponParts.indexOf(partId);

    if(partIndex<0){
      g.logMessage?.("そのパーツを所持していません");
      return false;
    }

    w.mods=Array.isArray(w.mods)?w.mods:[];

    const oldIndex=w.mods.findIndex(
      id=>definitions[id]?.slot===p.slot
    );

    if(oldIndex>=0){
      const old=w.mods[oldIndex];
      b.weaponParts.push(old);
      w.mods.splice(oldIndex,1);
    }

    w.mods.push(partId);
    b.weaponParts.splice(partIndex,1);

    normalize(w);
    g.persist?.();
    g.renderInventory?.();
    window.EFRHub?.render?.();

    g.logMessage?.(
      oldIndex>=0
        ? p.name+"に交換しました。旧パーツは倉庫へ戻しました"
        : p.name+"を装着しました"
    );

    return true;
  }

  function remove(stashIndex,partId){
    const g=G();
    const b=base();
    const w=g?.save?.stash?.[stashIndex];

    if(!g||!b||!w||w.kind!=="firearm")return false;

    w.mods=Array.isArray(w.mods)?w.mods:[];

    const i=w.mods.indexOf(partId);
    if(i<0)return false;

    const old=w.mods.splice(i,1)[0];
    b.weaponParts.push(old);

    normalize(w);
    g.persist?.();
    window.EFRHub?.render?.();

    g.logMessage?.(
      (defs()[old]?.name||old)+"を外して倉庫へ戻しました"
    );

    return true;
  }

  function inject(){
    const content=document.getElementById("efrHubContent");
    if(!content)return;

    if(!content.querySelector(".efrWeaponStorage")){
      const storage=content.querySelector(".hubStorage");
      if(!storage)return;

      const g=G();
      const stash=g?.save?.stash||[];
      const firearms=stash
        .map((x,i)=>({x,i}))
        .filter(v=>v.x?.kind==="firearm");

      const section=document.createElement("div");
      section.className="hubSection efrWeaponStorage";
      section.innerHTML=
        "<h3>武器パーツ管理</h3>"+
        "<p class=\"efrWeaponStorageGuide\">倉庫にある武器を選択して、所持パーツを装着・交換できます。交換した旧パーツは倉庫へ戻ります。</p>";

      if(!firearms.length){
        section.innerHTML+=
          "<p>倉庫に装着対象の銃器・弓はありません。</p>";
      }else{
        const grid=document.createElement("div");
        grid.className="efrWeaponStorageGrid";

        for(const {x,i} of firearms){
          const card=document.createElement("article");
          card.className="efrWeaponCard";

          const mods=Array.isArray(x.mods)?x.mods:[];

          card.innerHTML=
            "<strong>"+esc(x.name)+"</strong>"+
            "<small>耐久 "+
              esc((x.durability??x.maxDurability??"-")+
              "/"+
              (x.maxDurability??"-"))+
            "</small>"+
            "<div class=\"efrWeaponMods\">"+
              (mods.length
                ?mods.map(id=>
                  "<button type=\"button\" data-efr-remove=\""+
                  i+"\" data-part=\""+esc(id)+"\">"+
                  esc(defs()[id]?.name||id)+" ×外す</button>"
                ).join("")
                :"<span>装着パーツなし</span>")+
            "</div>";

          const partGrid=document.createElement("div");
          partGrid.className="efrWeaponPartGrid";

          for(const [id,p] of Object.entries(defs())){
            const n=countPart(id);
            const btn=document.createElement("button");
            btn.type="button";
            btn.dataset.efrAttach=String(i);
            btn.dataset.part=id;
            btn.disabled=n<=0;
            btn.textContent=
              p.name+
              " ["+p.slot+"] ×"+n;
            partGrid.appendChild(btn);
          }

          card.appendChild(partGrid);
          grid.appendChild(card);
        }

        section.appendChild(grid);
      }

      storage.parentElement.appendChild(section);
    }
  }

  function onClick(e){
    const a=e.target.closest("[data-efr-attach]");
    if(a){
      e.preventDefault();
      e.stopPropagation();
      attach(Number(a.dataset.efrAttach),a.dataset.part);
      return;
    }

    const r=e.target.closest("[data-efr-remove]");
    if(r){
      e.preventDefault();
      e.stopPropagation();
      remove(Number(r.dataset.efrRemove),r.dataset.part);
    }
  }

  document.addEventListener("click",onClick,true);

  const observer=new MutationObserver(()=>{
    inject();
  });

  observer.observe(document.body,{childList:true,subtree:true});

  window.EFRWeaponStorage={
    attach,
    remove,
    refresh:inject
  };

  setTimeout(inject,250);
})();