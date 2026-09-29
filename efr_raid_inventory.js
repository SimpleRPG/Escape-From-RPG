(()=>{
  "use strict";

  const G=()=>window.EFRGame;

  const EQUIPMENT_SLOTS=[
    "weapon1",
    "weapon2",
    "head",
    "chest",
    "legs",
    "backpack"
  ];

  function isWeapon(item){
    return !!item && (
      item.kind==="firearm" ||
      item.kind==="weapon" ||
      item.magicStaff
    );
  }

  function equipmentSource(target){
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

    const slot=
      EQUIPMENT_SLOTS[elements.indexOf(element)];

    if(!slot){
      return null;
    }

    const item=
      G()?.save?.equipment?.[slot];

    if(!isWeapon(item)){
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

    if(!isWeapon(item)){
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

  function petFromTarget(target){
    const element=
      target.closest(
        "#equipmentSlots .equipmentSlot"
      );

    if(!element){
      return null;
    }

    const elements=[
      ...document.querySelectorAll(
        "#equipmentSlots .equipmentSlot"
      )
    ];

    const slot=
      EQUIPMENT_SLOTS[elements.indexOf(element)];

    if(!slot){
      return null;
    }

    const item=
      G()?.save?.equipment?.[slot];

    if(
      item?.kind!=="pet" ||
      !item.petId
    ){
      return null;
    }

    return G()?.save?.animals?.find(
      animal=>animal?.id===item.petId
    ) || null;
  }

  function weaponFromTarget(target){
    return (
      equipmentSource(target) ||
      lootSource(target)
    );
  }

  function renderStatus(){
    const g=G();
    const player=g?.player;

    if(!g || !player){
      return;
    }

    const status=
      document.getElementById(
        "raidInventoryStatus"
      );

    if(!status){
      return;
    }

    const loot=
      Array.isArray(player.loot)
        ? player.loot
        : [];

    const used=
      window.EFRGrid?.used?.(loot) ??
      loot.reduce(
        (total,item)=>{
          const [w,h]=
            window.EFRGrid?.size?.(item) ||
            [1,1];

          return total+(w*h);
        },
        0
      );

    const capacity=
      Number(player.backpackCapacity||0);

    const equipment=
      Object.values(
        g.save?.equipment||{}
      );

    const weight=
      [...equipment,...loot].reduce(
        (total,item)=>
          total+
          Math.max(
            0,
            Number(item?.weight||0)
          ),
        0
      );

    const weightCapacity=
      Number(
        player.backpackWeightCapacity||0
      );

    const hp=
      Math.max(
        0,
        Number(player.hp||0)
      );

    const maxHp=
      Math.max(
        1,
        Number(player.maxHp||1)
      );

    const mp=
      Math.max(
        0,
        Number(player.mp||0)
      );

    const maxMp=
      Math.max(
        1,
        Number(player.maxMP||1)
      );

    const hpRate=
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            hp/maxHp*100
          )
        )
      );

    const mpRate=
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            mp/maxMp*100
          )
        )
      );

    const equippedWeapon=
      g.equippedWeapon?.();

    const mpCard=
      equippedWeapon?.magicStaff
        ? `
          <div class="raidInventoryStatusCard raidInventoryStatusVitals">
            <span>MP</span>
            <strong>${mp}/${maxMp}</strong>
            <i style="--raid-status-rate:${mpRate}%"></i>
          </div>
        `
        : "";

    status.innerHTML=`
      <div class="raidInventoryStatusCard raidInventoryStatusVitals">
        <span>HP</span>
        <strong>${hp}/${maxHp}</strong>
        <i style="--raid-status-rate:${hpRate}%"></i>
      </div>

      ${mpCard}

      <div class="raidInventoryStatusCard">
        <span>バッグ</span>
        <strong>${used}/${capacity}</strong>
        <small>使用マス</small>
      </div>

      <div class="raidInventoryStatusCard">
        <span>重量</span>
        <strong>${weight}/${weightCapacity||"—"}</strong>
        <small>携行重量</small>
      </div>
    `;

    const bagCount=
      document.getElementById(
        "raidInventoryBagCount"
      );

    if(bagCount){
      bagCount.textContent=
        `${used}/${capacity}`;
    }
  }

  function decoratePanel(){
    const panel=
      document.getElementById(
        "inventoryPanel"
      );

    if(!panel){
      return;
    }

    panel.classList.add(
      "efrRaidInventoryModal"
    );

    renderStatus();
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

        const pet=
          petFromTarget(target);

        const weapon=
          weaponFromTarget(target);

        if(!pet && !weapon){
          return;
        }

        clearTimeout(timer);
        triggered=false;

        timer=setTimeout(()=>{
          triggered=true;
          suppressUntil=
            Date.now()+450;

          if(pet){
            window.EFRHub?.openPetDetail?.(
              pet.id
            );
          }else{
            window.EFRHub?.openWeaponDetail?.(
              weapon.item,
              weapon.source
            );
          }
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
    decoratePanel();

    const oldRender=
      G().renderInventory;

    if(
      oldRender &&
      !oldRender.__efrRaidInventoryWrapped
    ){
      const wrapped=function(){
        const result=
          oldRender.apply(this,arguments);

        setTimeout(()=>{
          bind();
          decoratePanel();
        },0);

        return result;
      };

      wrapped.__efrRaidInventoryWrapped=true;
      G().renderInventory=wrapped;
    }

    setTimeout(()=>{
      bind();
      decoratePanel();
    },0);
  }

  boot();
})();