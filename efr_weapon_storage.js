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

  function cloneInventoryItem(item){
    return item==null ? item : JSON.parse(JSON.stringify(item));
  }

  function stageInventoryLayout(source,candidate){
    const capacity=sourceCapacity(source);
    if(
      !window.EFRGrid?.layout ||
      !Number.isFinite(capacity) ||
      capacity<1
    ){
      return false;
    }
    try{
      window.EFRGrid.layout(candidate,capacity);
      return true;
    }catch(error){
      window.EFRGrid?.flash?.();
      return false;
    }
  }

  function applyInventoryLayout(items,candidate){
    if(!Array.isArray(items)||!Array.isArray(candidate)||items.length!==candidate.length)return;
    for(let i=0;i<items.length;i++){
      const source=candidate[i];
      if(!items[i]||typeof items[i]!=="object"){
        items[i]=cloneInventoryItem(source);
        continue;
      }
      if(Object.prototype.hasOwnProperty.call(source,"gridX"))items[i].gridX=source.gridX;
      else delete items[i].gridX;
      if(Object.prototype.hasOwnProperty.call(source,"gridY"))items[i].gridY=source.gridY;
      else delete items[i].gridY;
    }
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

    const currentMods=Array.isArray(w.mods)
      ?w.mods.map(normalizePart).filter(Boolean)
      :[];
    const oldIndex=currentMods.findIndex(
      part=>definitions[part.id]?.slot===definition.slot
    );
    const old=oldIndex>=0?currentMods[oldIndex]:null;
    const oldItem=old?partItem(old):null;

    if(old && !oldItem){
      g.logMessage?.("交換元パーツの変換に失敗しました");
      return false;
    }

    const nextMods=currentMods
      .filter((_,index)=>index!==oldIndex)
      .map(part=>({id:part.id,rarity:part.rarity}));
    nextMods.push({id:partId,rarity});

    const candidate=items.map(cloneInventoryItem);
    const candidateWeapon=candidate[weaponIndex];
    candidateWeapon.mods=nextMods.map(part=>({...part}));
    candidate.splice(partIndex,1);
    if(oldItem)candidate.push(cloneInventoryItem(oldItem));
    P()?.normalizeWeapon?.(candidateWeapon);

    if(!stageInventoryLayout(source,candidate)){
      g.logMessage?.(source==="loot"
        ?"バッグにパーツを戻す空きがありません"
        :"倉庫にパーツを戻す空きがありません");
      return false;
    }

    items.splice(partIndex,1);
    if(oldItem)items.push(oldItem);
    w.mods=nextMods;
    P()?.normalizeWeapon?.(w);
    applyInventoryLayout(items,candidate);
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

    const currentMods=Array.isArray(w.mods)
      ?w.mods.map(normalizePart).filter(Boolean)
      :[];
    const partIndex=currentMods.findIndex(
      part=>String(part.id)===String(partId)
    );
    if(partIndex<0)return false;

    const old=currentMods[partIndex];
    const oldItem=partItem(old);
    if(!oldItem)return false;

    if(!canFitAddedPart(source,oldItem)){
      g.logMessage?.(source==="loot"
        ?"バッグにパーツを戻す空きがありません"
        :"倉庫にパーツを戻す空きがありません");
      window.EFRGrid?.flash?.();
      return false;
    }

    const nextMods=currentMods.filter((_,index)=>index!==partIndex);
    const candidate=items.map(cloneInventoryItem);
    candidate[weaponIndex].mods=nextMods.map(part=>({...part}));
    candidate.push(cloneInventoryItem(oldItem));
    P()?.normalizeWeapon?.(candidate[weaponIndex]);

    if(!stageInventoryLayout(source,candidate)){
      g.logMessage?.(source==="loot"
        ?"バッグにパーツを戻す空きがありません"
        :"倉庫にパーツを戻す空きがありません");
      return false;
    }

    items.push(oldItem);
    w.mods=nextMods;
    P()?.normalizeWeapon?.(w);
    applyInventoryLayout(items,candidate);
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
    const old=oldIndex>=0?oldMods[oldIndex]:null;
    const oldItem=old?partItem(old):null;
    if(old && !oldItem)return false;

    const nextMods=oldMods
      .filter((_,index)=>index!==oldIndex)
      .map(part=>({id:part.id,rarity:part.rarity}));
    nextMods.push({id:partId,rarity});

    const candidate=stash.map(cloneInventoryItem);
    candidate.splice(partIndex,1);
    if(oldItem)candidate.push(cloneInventoryItem(oldItem));

    if(!stageInventoryLayout("stash",candidate)){
      g.logMessage?.("交換後のパーツが倉庫に収まりません");
      return false;
    }

    stash.splice(partIndex,1);
    if(oldItem)stash.push(oldItem);
    w.mods=nextMods;
    P()?.normalizeWeapon?.(w);
    applyInventoryLayout(stash,candidate);
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
