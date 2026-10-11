(function(){
  "use strict";

  const G=()=>window.EFRGame;
  const X=()=>window.EFRContentExpansion;
  const P=()=>window.EFRBaseParts;

  function defs(){
    return P()?.definitions||{};
  }

  function normalizePart(part){
    return P()?.normalizePart?.(part)||null;
  }

  function partItem(part){
    const normalized=normalizePart(part);
    if(!normalized)return null;

    const definition=defs()[normalized.id];
    if(!definition)return null;

    return {
      name:definition.name,
      kind:"weaponPart",
      id:normalized.id,
      partId:normalized.id,
      rarity:Math.max(
        1,
        Math.min(5,Number(normalized.rarity||1))
      ),
      slots:1,
      gridW:1,
      gridH:1,
      weight:.5
    };
  }

  function isPart(item,id,rarity){
    return Boolean(
      item &&
      item.kind==="weaponPart" &&
      String(item.id||item.partId||"")===String(id) &&
      Number(item.rarity||1)===Number(rarity)
    );
  }

  function sourceItems(source){
    const g=G();
    if(!g)return null;

    if(source==="stash"){
      return Array.isArray(g.save?.stash)
        ? g.save.stash
        : null;
    }

    if(source==="loot"){
      return Array.isArray(g.player?.loot)
        ? g.player.loot
        : null;
    }

    return null;
  }

  function sourceCapacity(source){
    const g=G();

    if(source==="stash"){
      return Number(
        window.EFRHub?.storageCapacity?.()||0
      );
    }

    if(source==="loot"){
      return Number(
        g?.player?.backpackCapacity||0
      );
    }

    return 0;
  }

  function canFitAddedPart(source,part){
    const g=G();
    const items=sourceItems(source);

    if(!g||!items||!part)return false;

    if(source==="loot"){
      return Boolean(
        g.backpackCanFit?.(part)
      );
    }

    const candidate=items.map(
      item=>JSON.parse(JSON.stringify(item))
    );

    candidate.push(
      JSON.parse(JSON.stringify(part))
    );

    return Boolean(
      window.EFRGrid?.canFit?.(
        candidate,
        sourceCapacity(source)
      )
    );
  }

  function refresh(g){
    g?.renderInventory?.();
    window.EFRLoadout?.render?.();
    window.EFRHub?.render?.();
  }

  function commit(g){
    if(window.EFRTraining?.isActive?.()){
      return;
    }

    g?.persist?.();
  }

  function attachFromSource(
    source,
    weaponIndex,
    partId,
    partRarity
  ){
    const g=G();
    const items=sourceItems(source);
    const definitions=defs();

    if(
      !g ||
      !items ||
      !definitions ||
      !Number.isInteger(weaponIndex)
    ){
      return false;
    }

    const w=items[weaponIndex];

    if(
      !w ||
      w.kind!=="firearm" ||
      w.isBow
    ){
      g.logMessage?.(
        "パーツ装着は対応する銃器で行ってください"
      );
      return false;
    }

    const definition=definitions[partId];

    if(!definition){
      g.logMessage?.("パーツが見つかりません");
      return false;
    }

    const rarity=Math.max(
      1,
      Math.min(5,Number(partRarity||1))
    );

    const partIndex=items.findIndex(
      item=>isPart(item,partId,rarity)
    );

    if(partIndex<0){
      g.logMessage?.(
        "そのレア度のパーツを所持していません"
      );
      return false;
    }

    w.mods=Array.isArray(w.mods)
      ?w.mods
        .map(normalizePart)
        .filter(Boolean)
      :[];

    const oldIndex=w.mods.findIndex(
      part=>
        definitions[part.id]?.slot===definition.slot
    );

    const old=
      oldIndex>=0
        ? w.mods[oldIndex]
        : null;

    const oldItem=old
      ? partItem(old)
      : null;

    if(old && !oldItem){
      g.logMessage?.(
        "交換元パーツの変換に失敗しました"
      );
      return false;
    }

    const nextPart={
      id:partId,
      rarity
    };

    w.mods=
      w.mods.filter(
        (_,index)=>index!==oldIndex
      );

    w.mods.push(nextPart);

    items.splice(partIndex,1);

    if(oldItem){
      items.push(oldItem);
    }

    P()?.normalizeWeapon?.(w);
    commit(g);
    refresh(g);

    g.logMessage?.(
      old
        ? definition.name+
          " "+
          (P()?.rarityName?.(rarity)||"")+
          "に交換しました"
        : definition.name+
          " "+
          (P()?.rarityName?.(rarity)||"")+
          "を装着しました"
    );

    return true;
  }

  function removeFromSource(
    source,
    weaponIndex,
    partId
  ){
    const g=G();
    const items=sourceItems(source);

    if(
      !g ||
      !items ||
      !Number.isInteger(weaponIndex)
    ){
      return false;
    }

    const w=items[weaponIndex];

    if(
      !w ||
      w.kind!=="firearm" ||
      w.isBow
    ){
      return false;
    }

    w.mods=Array.isArray(w.mods)
      ?w.mods
        .map(normalizePart)
        .filter(Boolean)
      :[];

    const partIndex=w.mods.findIndex(
      part=>String(part.id)===String(partId)
    );

    if(partIndex<0){
      return false;
    }

    const old=w.mods[partIndex];
    const oldItem=partItem(old);

    if(!oldItem){
      return false;
    }

    if(!canFitAddedPart(source,oldItem)){
      g.logMessage?.(
        source==="loot"
          ? "バッグにパーツを戻す空きがありません"
          : "倉庫にパーツを戻す空きがありません"
      );
      window.EFRGrid?.flash?.();
      return false;
    }

    w.mods.splice(partIndex,1);
    items.push(oldItem);

    P()?.normalizeWeapon?.(w);
    commit(g);
    refresh(g);

    g.logMessage?.(
      (defs()[old.id]?.name||old.id)+
      " "+
      (P()?.rarityName?.(old.rarity)||"")+
      "を外しました"
    );

    return true;
  }

  function attach(stashIndex,partId,partRarity){
    return attachFromSource(
      "stash",
      Number(stashIndex),
      partId,
      partRarity
    );
  }

  function remove(stashIndex,partId){
    return removeFromSource(
      "stash",
      Number(stashIndex),
      partId
    );
  }

  function attachLoot(index,partId,partRarity){
    return attachFromSource(
      "loot",
      Number(index),
      partId,
      partRarity
    );
  }

  function removeLoot(index,partId){
    return removeFromSource(
      "loot",
      Number(index),
      partId
    );
  }

  function attachEquipment(slot,partId,partRarity){
    const g=G();
    const w=g?.save?.equipment?.[slot];
    const stash=g?.save?.stash;

    if(
      !g ||
      !w ||
      !Array.isArray(stash) ||
      w.kind!=="firearm" ||
      w.isBow
    ){
      g?.logMessage?.(
        "パーツ装着は対応する銃器で行ってください"
      );
      return false;
    }

    const definition=defs()[partId];

    if(!definition){
      g.logMessage?.("パーツが見つかりません");
      return false;
    }

    const rarity=Math.max(
      1,
      Math.min(5,Number(partRarity||1))
    );

    const partIndex=stash.findIndex(
      item=>isPart(item,partId,rarity)
    );

    if(partIndex<0){
      g.logMessage?.(
        "倉庫にそのレア度のパーツを所持していません"
      );
      return false;
    }

    const oldMods=Array.isArray(w.mods)
      ?w.mods.map(normalizePart).filter(Boolean)
      :[];

    const oldIndex=oldMods.findIndex(
      part=>defs()[part.id]?.slot===definition.slot
    );

    const old=
      oldIndex>=0
        ?oldMods[oldIndex]
        :null;

    const oldItem=old
      ?partItem(old)
      :null;

    if(old && !oldItem){
      return false;
    }

    w.mods=
      oldMods.filter(
        (_,index)=>index!==oldIndex
      );

    w.mods.push({
      id:partId,
      rarity
    });

    stash.splice(partIndex,1);

    if(oldItem){
      stash.push(oldItem);
    }

    P()?.normalizeWeapon?.(w);
    commit(g);
    refresh(g);

    g.logMessage?.(
      old
        ? definition.name+
          " "+
          (P()?.rarityName?.(rarity)||"")+
          "に交換しました"
        : definition.name+
          " "+
          (P()?.rarityName?.(rarity)||"")+
          "を装着しました"
    );

    return true;
  }

  function removeEquipment(slot,partId){
    const g=G();
    const w=g?.save?.equipment?.[slot];

    if(
      !g ||
      !w ||
      w.kind!=="firearm" ||
      w.isBow
    ){
      return false;
    }

    const parts=Array.isArray(w.mods)
      ?w.mods.map(normalizePart).filter(Boolean)
      :[];

    const index=parts.findIndex(
      part=>String(part.id)===String(partId)
    );

    if(index<0)return false;

    const oldItem=partItem(parts[index]);

    if(!oldItem)return false;

    if(!canFitAddedPart("stash",oldItem)){
      g.logMessage?.("倉庫にパーツを戻す空きがありません");
      window.EFRGrid?.flash?.();
      return false;
    }

    if(!window.EFRBaseCore?.addStashItem?.(oldItem,{silent:true})){
      g.logMessage?.("倉庫にパーツを戻す空きがありません");
      window.EFRGrid?.flash?.();
      return false;
    }

    w.mods=parts.filter(
      (_,i)=>i!==index
    );

    P()?.normalizeWeapon?.(w);
    commit(g);
    refresh(g);

    g.logMessage?.(
      (defs()[oldItem.id]?.name||oldItem.id)+
      " "+
      (P()?.rarityName?.(oldItem.rarity)||"")+
      "を外しました"
    );

    return true;
  }

  function refresh(){
    window.EFRHub?.render?.();
    window.EFRLoadout?.render?.();
  }

  window.EFRWeaponStorage={
    attach,
    remove,
    attachEquipment,
    removeEquipment,
    attachLoot,
    removeLoot,
    partItem,
    isPart,
    refresh
  };
})();
