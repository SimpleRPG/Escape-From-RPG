/* EFR DURABILITY NORMALIZATION */
(function(){
  "use strict";

  const G=()=>window.EFRGame;

  function normalize(){
    const g=G();
    if(!g?.save?.equipment)return;

    for(const slot of [
      "weapon1",
      "weapon2",
      "head",
      "chest",
      "legs"
    ]){
      const item=g.save.equipment[slot];
      if(!item)continue;

      const isStaff=!!item.magicStaff;
      const isWeapon=
        item.kind==="weapon" ||
        item.kind==="firearm";
      const isArmor=item.kind==="armor";

      if(!(isStaff||isWeapon||isArmor))continue;

      if(!Number.isFinite(Number(item.maxDurability))){
        item.maxDurability=
          isStaff ? 90 :
          isArmor ? 100 :
          80;
      }

      if(!Number.isFinite(Number(item.durability))){
        item.durability=Number(item.maxDurability);
      }

      item.durability=Math.max(
        0,
        Math.min(
          Number(item.maxDurability),
          Number(item.durability)
        )
      );
    }
  }

  function boot(){
    if(!G()){
      setTimeout(boot,100);
      return;
    }

    normalize();
    setInterval(normalize,1000);
  }

  boot();

  window.EFRDurability={normalize};
})();
