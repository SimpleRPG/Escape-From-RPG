(()=>{
  "use strict";

  const G=()=>window.EFRGame;

  const KEY_NAMES={
    military:"軍用鍵",
    research:"研究施設鍵",
    factory:"工場鍵",
    storage:"倉庫鍵",
    security:"保安区画鍵",
    special:"特殊区画鍵"
  };

  function decorate(){
    const g=G();
    const panel=
      document.getElementById(
        "inventoryPanel"
      );

    if(!g || !panel){
      return;
    }

    panel.classList.add(
      "efrRaidInventoryModal"
    );

    let storage=
      document.getElementById(
        "raidKeyStorage"
      );

    if(!storage){
      storage=
        document.createElement("div");

      storage.id="raidKeyStorage";
      panel.appendChild(storage);
    }

    const keys=
      Array.isArray(g.player?.raidKeys)
        ? g.player.raidKeys
        : [];

    storage.innerHTML=
      "<strong>鍵</strong>"+
      (
        keys.length
          ? keys.map(
              id=>
                `<div class="raidKeyRow">
                  <span>${KEY_NAMES[id]||id}</span>
                  <small>保管中</small>
                </div>`
            ).join("")
          : "<small>保管中の鍵はありません</small>"
      );
  }

  function boot(){
    const g=G();

    if(!g){
      setTimeout(boot,100);
      return;
    }

    const old=
      g.renderInventory;

    if(
      old &&
      !old.__efrRaidInventoryControlsWrapped
    ){
      const wrapped=function(){
        const result=
          old.apply(this,arguments);

        setTimeout(decorate,0);

        return result;
      };

      wrapped.__efrRaidInventoryControlsWrapped=true;
      g.renderInventory=wrapped;
    }

    setTimeout(decorate,0);
  }

  boot();
})();