/* EFR DURABILITY */
(function(){
  "use strict";

  const G=()=>window.EFRGame;

  const ARMOR_SLOTS=["head","chest","legs"];
  const EQUIPMENT_SLOTS=[
    "weapon1",
    "weapon2",
    "head",
    "chest",
    "legs"
  ];

  function defaultMaxDurability(item){
    if(item?.magicStaff)return 90;
    if(item?.kind==="armor")return 100;
    if(item?.kind==="weapon" || item?.kind==="firearm")return 80;
    return 0;
  }

  function normalizeItem(item){
    if(!item)return;

    const max=defaultMaxDurability(item);
    if(max<=0)return;

    if(!Number.isFinite(Number(item.maxDurability))){
      item.maxDurability=max;
    }

    if(!Number.isFinite(Number(item.durability))){
      item.durability=Number(item.maxDurability);
    }

    item.maxDurability=Math.max(
      1,
      Number(item.maxDurability)
    );

    item.durability=Math.max(
      0,
      Math.min(
        item.maxDurability,
        Number(item.durability)
      )
    );
  }

  function normalize(){
    const g=G();
    if(!g?.save?.equipment)return;

    for(const slot of EQUIPMENT_SLOTS){
      normalizeItem(g.save.equipment[slot]);
    }
  }

  function isUsable(item){
    if(!item)return false;

    const max=Number(item.maxDurability);
    if(!Number.isFinite(max) || max<=0){
      return true;
    }

    return Number(item.durability)>0;
  }

  function damageArmor(amount=1){
    const g=G();
    if(!g?.save?.equipment)return 0;

    let damaged=0;
    let broken=[];

    for(const slot of ARMOR_SLOTS){
      const armor=g.save.equipment[slot];
      if(!armor)continue;

      normalizeItem(armor);

      if(!isUsable(armor))continue;

      const before=Number(armor.durability);

      armor.durability=Math.max(
        0,
        before-Math.max(1,Number(amount)||1)
      );

      damaged++;

      if(
        before>0 &&
        armor.durability<=0
      ){
        broken.push(armor.name || slot);
      }
    }

    if(damaged>0){
      g.persist?.();
    }

    for(const name of broken){
      g.logMessage?.(
        name+"の耐久値が0になりました。整備台で修理してください"
      );
    }

    return damaged;
  }

  function getArmorReduction(){
    const g=G();
    if(!g?.save?.equipment)return 0;

    let reduction=0;

    for(const slot of ARMOR_SLOTS){
      const armor=g.save.equipment[slot];
      if(!armor)continue;

      normalizeItem(armor);

      if(!isUsable(armor))continue;

      reduction+=Number(armor.reduction||0);
    }

    return reduction;
  }

  function isArmorUsable(slot){
    const g=G();
    const armor=g?.save?.equipment?.[slot];
    if(!armor)return false;

    normalizeItem(armor);
    return isUsable(armor);
  }

  function boot(){
    if(!G()){
      setTimeout(boot,100);
      return;
    }

    normalize();
    window.EFRDurability={
      normalize,
      isUsable,
      damageArmor,
      getArmorReduction,
      isArmorUsable
    };
  }

  boot();
})();
