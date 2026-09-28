(()=>{
  "use strict";

  const G=()=>window.EFRGame;

  function equipmentSource(target){
    const slots=[
      "weapon1",
      "weapon2",
      "head",
      "chest",
      "legs",
      "backpack"
    ];

    const elements=[
      ...document.querySelectorAll(
        "#equipmentSlots .equipmentSlot"
      )
    ];

    const element=target.closest(
      "#equipmentSlots .equipmentSlot"
    );

    if(!element){
      return null;
    }

    const index=elements.indexOf(element);
    const slot=slots[index];

    if(!slot){
      return null;
    }

    const item=
      G()?.save?.equipment?.[slot];

    if(
      !item ||
      !(
        item.kind==="firearm" ||
        item.kind==="weapon" ||
        item.magicStaff
      )
    ){
      return null;
    }

    return {
      item,
      source:{
        type:"equipment",
        slot
      }
    };
  }

  function lootSource(target){
    const itemEl=
      target.closest(
        "#inventoryContents .efrSlotItem"
      );

    if(!itemEl){
      return null;
    }

    const index=
      Number(itemEl.dataset.gridItemIndex);

    if(!Number.isInteger(index)){
      return null;
    }

    const item=
      G()?.player?.loot?.[index];

    if(
      !item ||
      !(
        item.kind==="firearm" ||
        item.kind==="weapon" ||
        item.magicStaff
      )
    ){
      return null;
    }

    return {
      item,
      source:{
        type:"loot",
        index
      }
    };
  }

  function weaponFromTarget(target){
    return (
      equipmentSource(target) ||
      lootSource(target)
    );
  }

  function bind(){
    const panel=
      document.getElementById(
        "inventoryPanel"
      );

    if(
      !panel ||
      panel.dataset.efrWeaponDetailBound
    ){
      return;
    }

    panel.dataset.efrWeaponDetailBound="1";

    let timer=null;
    let triggered=false;
    let suppressUntil=0;

    panel.addEventListener(
      "pointerdown",
      event=>{
        const target=
          event.target.closest(
            "#equipmentSlots .equipmentSlot,"+
            "#inventoryContents .efrSlotItem"
          );

        if(
          !target ||
          event.target.closest("button")
        ){
          return;
        }

        const weapon=
          weaponFromTarget(target);

        if(!weapon){
          return;
        }

        clearTimeout(timer);
        triggered=false;

        timer=setTimeout(()=>{
          triggered=true;
          suppressUntil=Date.now()+450;

          window.EFRHub?.openWeaponDetail?.(
            weapon.item,
            weapon.source
          );
        },550);
      },
      {
        passive:true,
        capture:true
      }
    );

    panel.addEventListener(
      "pointercancel",
      ()=>{
        clearTimeout(timer);
        timer=null;
        triggered=false;
      },
      {capture:true}
    );

    panel.addEventListener(
      "pointerleave",
      ()=>{
        clearTimeout(timer);
        timer=null;
      },
      {capture:true}
    );

    panel.addEventListener(
      "pointerup",
      event=>{
        clearTimeout(timer);
        timer=null;

        if(!triggered){
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        triggered=false;
      },
      {
        passive:false,
        capture:true
      }
    );

    panel.addEventListener(
      "click",
      event=>{
        if(Date.now()<suppressUntil){
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      },
      {capture:true}
    );
  }

  function boot(){
    if(!G()){
      setTimeout(boot,100);
      return;
    }

    bind();

    const oldRender=
      G().renderInventory;

    if(
      oldRender &&
      !oldRender.__efrWeaponDetailWrapped
    ){
      const wrapped=function(){
        const result=
          oldRender.apply(this,arguments);

        setTimeout(bind,0);

        return result;
      };

      wrapped.__efrWeaponDetailWrapped=true;
      G().renderInventory=wrapped;
    }

    setTimeout(bind,0);
  }

  boot();
})();
