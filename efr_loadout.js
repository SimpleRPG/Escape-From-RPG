(function(){
  "use strict";

  const G=()=>window.EFRGame;
  let filter="all";
  let transferSelection=null;


  function clone(x){
    return x ? JSON.parse(JSON.stringify(x)) : x;
  }

  function name(x){
    return typeof x==="string"
      ? x
      : (x?.name || x?.type || "不明なアイテム");
  }

  function escPetTypeName(type){
    const petType=
      window.EFRPet?.PET_TYPES?.[type];

    return String(
      petType?.name ||
      type ||
      "不明"
    )
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function kind(x){
    if(typeof x==="string") return "material";
    return x?.kind || "item";
  }

  function slot(x){
    if(typeof x==="string") return null;
    if(x.kind==="pet") return "pet";
    if(x.kind==="weapon") return "weapon";
    if(x.kind==="armor") return x.slotType || "chest";
    if(x.kind==="backpack") return "backpack";
    return null;
  }

  function cost(x){
    const [w,h]=window.EFRGrid?.size?.(x) || [1,1];
    return w*h;
  }

  function used(){
    return (G().player.loot || [])
      .reduce((n,x)=>n+cost(x),0);
  }

  function carriedWeight(){
    return G().carriedWeight?.() || 0;
  }

  function carriedWeightCapacity(){
    return G().backpackWeightCapacity?.() || 20;
  }

  function capacity(){
    G().refreshBackpackCapacity?.();
    return G().player.backpackCapacity ?? 4;
  }

  function save(){
    G().persist?.();
  }

  function tap(button,handler){
    const g=G();

    if(g?.bindTap){
      g.bindTap(button,handler);
    }else if(button){
      button.onclick=handler;
    }
  }

  function ensure(){
    if(document.getElementById("efrLoadoutPanel")) return;

    const panel=document.createElement("section");
    panel.id="efrLoadoutPanel";
    panel.className="loadoutPanel hidden";

    panel.innerHTML=`
      <div class="loadoutWindow">

        <div class="loadoutHead">
          <div>
            <h2>出撃準備 / 倉庫・装備</h2>
            <div id="loadoutMeta" class="loadoutMeta"></div>
          </div>
          <button id="loadoutClose">閉じる</button>
        </div>

        <div class="loadoutGrid">

          <div class="loadoutCurrent">

            <div class="loadoutBox">
              <h3>現在の装備</h3>
              <div id="loadoutEquip" class="loadoutEquip"></div>
            </div>

            <div class="loadoutBox loadoutInventoryBox">
              <h3>インベントリ</h3>
              <div id="loadoutCarry" class="loadoutList"></div>

              <div class="loadoutInventoryKeys">
                <h4>鍵保管</h4>
                <div id="loadoutKeys" class="loadoutList"></div>
              </div>
            </div>

</div>

          <div class="loadoutWarehouse loadoutBox">
            <h3>倉庫</h3>
            <div id="loadoutFilters" class="loadoutFilters"></div>
            <div id="loadoutStash" class="loadoutList"></div>

            <div class="loadoutWarehousePets">
              <h3>🐾 動物ケージ</h3>
              <div id="loadoutPetCage" class="efrPetCage"></div>
            </div>
          </div>

        </div>

        <div class="loadoutFoot">
          <button id="loadoutClear">持込を全解除</button>
          <button id="loadoutStart" class="primary">
            この装備で探索開始
          </button>
        </div>

      </div>
    `;

    document.body.appendChild(panel);

    tap(
      panel.querySelector("#loadoutClose"),
      close
    );

    tap(
      panel.querySelector("#loadoutClear"),
      ()=>{
        const loot=G().player.loot || [];

        G().save.stash.push(...loot.map(clone));
        G().player.loot=[];

        save();
        render();
      }
    );

    tap(
      panel.querySelector("#loadoutStart"),
      ()=>{
        const run=window.EFRErrorHandler?.run;

        if(run){
          return run(
            "出撃準備から探索開始",
            ()=>{
              G().refreshBackpackCapacity?.();

        if(used()>capacity()){
          alert("持込品が現在のバッグ容量を超えています。");
          render();
          return;
        }

        if(carriedWeight()>carriedWeightCapacity()+0.0001){
          alert(
            "装備・持込品の重量が上限を超えています。"
          );
          render();
          return;
        }

              save();
              close();
              G().start();
            },
            {
              phase:"出撃準備",
              file:"efr_loadout.js"
            }
          );
        }

        G().refreshBackpackCapacity?.();

        if(used()>capacity()){
          alert("持込品が現在のバッグ容量を超えています。");
          render();
          return;
        }

        if(carriedWeight()>carriedWeightCapacity()+0.0001){
          alert(
            "装備・持込品の重量が上限を超えています。"
          );
          render();
          return;
        }

        save();
        close();
        G().start();
      }
    );

    let lastPanelActivation=0;

    const handlePanelTapCore=event=>{
      const gridItem=event.target.closest(".efrSlotItem");
      const gridCell=event.target.closest(".efrSlotCell");
      const equipmentSlot=event.target.closest(".loadoutSlot");

      if(
        equipmentSlot &&
        !event.target.closest("button")
      ){
        const slotName=
          equipmentSlot.dataset.equipmentSlot;

        if(
          transferSelection?.source==="stash" ||
          transferSelection?.source==="carry"
        ){
          if(equipSelectedItemToSlot(slotName)){
            return;
          }
        }

        const equipped=
          G().save.equipment?.[slotName];

        if(equipped){
          transferSelection={
            source:"equipment",
            slotName
          };

          document
            .querySelectorAll(
              "#loadoutStash .efrSlotItem,"+
              "#loadoutCarry .efrSlotItem,"+
              ".efrPetCageCard,"+
              ".loadoutKeySlot,"+
              ".loadoutSlot"
            )
            .forEach(el=>{
              el.classList.remove("efrSelected");
            });

          equipmentSlot.classList.add("efrSelected");
        }

        return;
      }

      if(
        gridItem &&
        !event.target.closest("button")
      ){
        const index=Number(
          gridItem.dataset.gridItemIndex
        );

        const container=
          gridItem.closest(
            "#loadoutStash,#loadoutCarry"
          );

        if(
          Number.isInteger(index) &&
          container
        ){
          transferSelection={
            source:
              container.id==="loadoutStash"
                ? "stash"
                : "carry",
            index
          };

          document
            .querySelectorAll(
              "#loadoutStash .efrSlotItem,"+
              "#loadoutCarry .efrSlotItem"
            )
            .forEach(el=>{
              el.classList.remove("efrSelected");
            });

          gridItem.classList.add("efrSelected");
        }

        return;
      }

      if(gridCell){
        const container=
          gridCell.closest(
            "#loadoutStash,#loadoutCarry"
          );

        if(!container)return;

        if(!transferSelection)return;

        if(transferSelection.source==="equipment"){
          const slotName=
            String(transferSelection.slotName||"");
          const equipment=
            G().save.equipment||{};
          const item=equipment[slotName];

          if(!item){
            transferSelection=null;
            render();
            return;
          }

          const destination=
            container.id==="loadoutStash"
              ? "stash"
              : "carry";

          const destinationItems=
            destination==="stash"
              ? G().save.stash
              : (G().player.loot||[]);

          const destinationCapacity=
            destination==="stash"
              ? Number(
                  window.EFRHub?.storageCapacity?.() ||
                  (
                    24+
                    Math.max(
                      0,
                      (G().save.base?.level||1)-1
                    )*4+
                    Math.max(
                      0,
                      (G().save.base?.facilities?.storage||1)-1
                    )*10
                  )
                )
              : capacity();

          const candidate=clone(item);

          if(
            destination==="carry" &&
            G().itemWeight
          ){
            G().ensureItemWeight?.(candidate);

            const nextWeight=
              carriedWeight()+
              (
                G().itemWeight(candidate)||0
              );

            if(
              nextWeight>
              carriedWeightCapacity()+0.0001
            ){
              alert("装備・持込品の重量上限を超えています。");
              return;
            }
          }

          destinationItems.push(candidate);

          const destinationIndex=
            destinationItems.length-1;

          const moved=
            window.EFRGrid?.move?.(
              destinationItems,
              destinationCapacity,
              destinationIndex,
              Number(gridCell.dataset.gridCellX),
              Number(gridCell.dataset.gridCellY)
            );

          if(!moved){
            destinationItems.pop();
            return;
          }

          equipment[slotName]=null;

          save();
          G().renderInventory?.();
          transferSelection=null;
          render();
          return;
        }

        if(transferSelection.source==="keyStorage"){
          const destination=
            container.id==="loadoutStash"
              ? "stash"
              : "carry";

          if(takeStoredKey(
            Number(transferSelection.index),
            destination,
            Number(gridCell.dataset.gridCellX),
            Number(gridCell.dataset.gridCellY)
          )){
            return;
          }

          return;
        }

        const destination=
          container.id==="loadoutStash"
            ? "stash"
            : "carry";

        /*
         * 動物ケージは物理グリッドではないため、
         * ケージからはプレイヤーインベントリへだけ移動する。
         */
        if(transferSelection.source==="cage"){
          if(destination!=="carry"){
            return;
          }

          const petId=
            String(transferSelection.petId||"");

          const pet=
            (G().save.animals||[])
              .find(
                animal=>String(animal?.id||"")===petId
              );

          if(!pet)return;

          const loot=
            G().player.loot || [];

          const candidate={
            kind:"pet",
            petId:pet.id,
            name:pet.name,
            type:pet.type,
            gridW:2,
            gridH:2,
            slots:4,
            weight:0
          };

          const nextUsed=
            (
              window.EFRGrid
                ? window.EFRGrid.used(loot)
                : used()
            )+
            4;

          if(nextUsed>capacity()){
            alert("バッグ容量を超えています。");
            return;
          }

          loot.push(candidate);

          const destinationIndex=
            loot.length-1;

          const moved=
            window.EFRGrid?.move?.(
              loot,
              capacity(),
              destinationIndex,
              Number(gridCell.dataset.gridCellX),
              Number(gridCell.dataset.gridCellY)
            );

          if(!moved){
            loot.pop();
            return;
          }

          save();
          G().renderInventory?.();
          transferSelection=null;
          render();

          return;
        }

        if(
          transferSelection.source!=="stash" &&
          transferSelection.source!=="carry"
        ){
          return;
        }

        const source=
          transferSelection.source;

        const sourceItems=
          source==="stash"
            ? G().save.stash
            : (G().player.loot||[]);

        const sourceIndex=
          Number(transferSelection.index);

        const item=
          sourceItems[sourceIndex];

        if(!item)return;

        const destinationItems=
          destination==="stash"
            ? G().save.stash
            : (G().player.loot||[]);

        const destinationCapacity=
          destination==="stash"
            ? Number(
                window.EFRHub?.storageCapacity?.() ||
                (
                  24+
                  Math.max(
                    0,
                    (G().save.base?.level||1)-1
                  )*4+
                  Math.max(
                    0,
                    (G().save.base?.facilities?.storage||1)-1
                  )*10
                )
              )
            : capacity();

        if(source===destination){
          const moved=
            window.EFRGrid?.move?.(
              destinationItems,
              destinationCapacity,
              sourceIndex,
              Number(gridCell.dataset.gridCellX),
              Number(gridCell.dataset.gridCellY)
            );

          if(moved){
            save();
            transferSelection=null;
            render();
          }

          return;
        }

        const candidate=
          clone(item);

        if(
          destination==="carry" &&
          source!=="carry"
        ){
          G().ensureItemWeight?.(candidate);

          const nextWeight=
            carriedWeight()+
            (
              G().itemWeight?.(candidate)||0
            );

          if(
            nextWeight>
            carriedWeightCapacity()+0.0001
          ){
            alert("装備・持込品の重量上限を超えています。");
            return;
          }
        }

        destinationItems.push(candidate);

        const destinationIndex=
          destinationItems.length-1;

        const moved=
          window.EFRGrid?.move?.(
            destinationItems,
            destinationCapacity,
            destinationIndex,
            Number(gridCell.dataset.gridCellX),
            Number(gridCell.dataset.gridCellY)
          );

        if(!moved){
          destinationItems.pop();
          return;
        }

        sourceItems.splice(sourceIndex,1);

        save();
        G().renderInventory?.();
        transferSelection=null;
        render();

        return;
      }


      const keySlot=
        event.target.closest(
          ".loadoutKeySlot[data-key-index]"
        );

      if(keySlot){
        const index=
          Number(keySlot.dataset.keyIndex);

        const storedKeys=
          Array.isArray(G().save.keys)
            ? G().save.keys
            : [];

        const selectedSource=
          transferSelection?.source;

        if(
          (
            selectedSource==="stash" ||
            selectedSource==="carry"
          ) &&
          transferSelection?.index!==undefined
        ){
          const sourceItems=
            selectedSource==="stash"
              ? (G().save.stash || [])
              : (G().player.loot || []);

          const selected=
            sourceItems[
              Number(transferSelection.index)
            ];

          if(
            selected?.kind==="key" &&
            selected.keyType
          ){
            if(storedKeys[index]){
              return;
            }

            storeSelectedKey(
              selectedSource,
              Number(transferSelection.index)
            );
            return;
          }
        }

        if(!storedKeys[index]){
          return;
        }

        transferSelection={
          source:"keyStorage",
          index
        };

        document
          .querySelectorAll(
            "#loadoutStash .efrSlotItem,"+
            "#loadoutCarry .efrSlotItem,"+
            ".efrPetCageCard,"+
            ".loadoutKeySlot"
          )
          .forEach(el=>{
            el.classList.remove("efrSelected");
          });

        keySlot.classList.add("efrSelected");
        return;
      }

      const cageSlot=
        event.target.closest(
          ".efrPetCageSlot"
        );

      if(
        cageSlot &&
        !cageSlot.classList.contains("efrPetCageCard") &&
        transferSelection?.source==="carry"
      ){
        const sourceItems=
          G().player.loot || [];

        const sourceIndex=
          Number(transferSelection.index);

        const item=
          sourceItems[sourceIndex];

        if(
          !item ||
          item.kind!=="pet" ||
          !item.petId
        ){
          return;
        }

        const petExists=
          (G().save.animals||[])
            .some(
              animal=>
                String(animal?.id||"")===
                String(item.petId)
            );

        if(!petExists){
          return;
        }

        sourceItems.splice(sourceIndex,1);

        save();
        G().renderInventory?.();
        transferSelection=null;
        render();

        return;
      }

      const cageCard=
        event.target.closest(
          ".efrPetCageCard[data-pet-id]"
        );

      if(cageCard){
        const petId=
          String(cageCard.dataset.petId||"");

        if(!petId)return;

        transferSelection={
          source:"cage",
          petId
        };

        document
          .querySelectorAll(
            "#loadoutStash .efrSlotItem,"+
            "#loadoutCarry .efrSlotItem"
          )
          .forEach(el=>{
            el.classList.remove("efrSelected");
          });

        document
          .querySelectorAll(
            ".efrPetCageCard"
          )
          .forEach(el=>{
            el.classList.remove("efrSelected");
          });

        cageCard.classList.add("efrSelected");

        return;
      }


      const filterButton=event.target.closest("[data-filter]");
      if(filterButton){
        filter=filterButton.dataset.filter;
        render();
        return;
      }

      const carry=event.target.closest("[data-carry]");
      if(carry){
        carryItem(Number(carry.dataset.carry));
        return;
      }

      const back=event.target.closest("[data-return]");
      if(back){
        returnItem(Number(back.dataset.return));
        return;
      }

        const stashKey=event.target.closest("[data-store-stash-key]");
      if(stashKey){
        storeStashKey(Number(stashKey.dataset.storeStashKey));
        return;
      }

      const equip=event.target.closest("[data-equip]");
      if(equip){
        equipItem(Number(equip.dataset.equip));
        return;
      }

      const unequip=event.target.closest("[data-unequip]");
      if(unequip){
        unequipItem(unequip.dataset.unequip);
      }
    };

    const handlePanelTap=event=>{
      const run=window.EFRErrorHandler?.run;

      if(run){
        return run(
          "出撃準備操作",
          ()=>handlePanelTapCore(event),
          {
            phase:"出撃準備UI",
            file:"efr_loadout.js",
            screen:"出撃準備画面"
          }
        );
      }

      return handlePanelTapCore(event);
    };


    let weaponLongPressTimer=null;
    let weaponLongPressTriggered=false;
    let weaponLongPressSuppressUntil=0;

    function loadoutPetFromTarget(target){
      const cageTarget=
        target.closest(".efrPetCageCard[data-pet-id]");

      if(cageTarget){
        return G()?.save?.animals?.find(
          animal=>animal?.id===cageTarget.dataset.petId
        ) || null;
      }

      const equipmentTarget=
        target.closest(".loadoutSlot");

      if(equipmentTarget){
        const slotName=
          equipmentTarget.dataset.equipmentSlot;

        const item=
          slotName
            ? G()?.save?.equipment?.[slotName]
            : null;

        if(item?.kind==="pet" && item.petId){
          return G()?.save?.animals?.find(
            animal=>animal?.id===item.petId
          ) || null;
        }

        return null;
      }

      const gridItem=
        target.closest(".efrSlotItem");

      if(!gridItem){
        return null;
      }

      const index=
        Number(gridItem.dataset.gridItemIndex);

      if(!Number.isInteger(index)){
        return null;
      }

      const container=
        gridItem.closest(
          "#loadoutStash,#loadoutCarry"
        );

      if(!container){
        return null;
      }

      if(container.id!=="loadoutCarry"){
        return null;
      }

      const item=
        G()?.player?.loot?.[index];

      if(item?.kind!=="pet" || !item.petId){
        return null;
      }

      return G()?.save?.animals?.find(
        animal=>animal?.id===item.petId
      ) || null;
    }

    function loadoutWeaponFromTarget(target){
      const equipmentTarget=
        target.closest(".loadoutSlot");

      if(equipmentTarget){
        const slotName=
          equipmentTarget.dataset.equipmentSlot;

        const item=
          slotName
            ? G()?.save?.equipment?.[slotName]
            : null;

        if(
          item &&
          (
            item.kind==="firearm" ||
            item.kind==="weapon" ||
            item.magicStaff
          )
        ){
          return {
            item,
            source:{
              type:"equipment",
              slot:slotName
            }
          };
        }

        return null;
      }

      const gridItem=
        target.closest(".efrSlotItem");

      if(!gridItem){
        return null;
      }

      const index=
        Number(gridItem.dataset.gridItemIndex);

      if(!Number.isInteger(index)){
        return null;
      }

      const container=
        gridItem.closest(
          "#loadoutStash,#loadoutCarry"
        );

      if(!container){
        return null;
      }

      const stash=
        container.id==="loadoutStash";

      const item=
        stash
          ? G()?.save?.stash?.[index]
          : G()?.player?.loot?.[index];

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
          type:stash ? "stash" : "loot",
          index
        }
      };
    }

    panel.addEventListener(
      "pointerdown",
      event=>{
        const target=
          event.target.closest(
            ".loadoutSlot,.efrSlotItem,.efrPetCageCard,.loadoutKeySlot"
          );

        if(
          !target ||
          event.target.closest("button")
        ){
          return;
        }

        const pet=
          loadoutPetFromTarget(target);

        const weapon=
          loadoutWeaponFromTarget(target);

        const keySlot=
          target.closest(
            ".loadoutKeySlot[data-key-index]"
          );

        const keyIndex=
          keySlot
            ? Number(keySlot.dataset.keyIndex)
            : -1;

        const storedKeys=
          Array.isArray(G()?.save?.keys)
            ? G().save.keys
            : [];

        const keyType=
          keyIndex>=0
            ? storedKeys[keyIndex]
            : null;

        if(!pet && !weapon && !keyType){
          return;
        }

        clearTimeout(weaponLongPressTimer);
        weaponLongPressTriggered=false;

        weaponLongPressTimer=setTimeout(()=>{
          weaponLongPressTriggered=true;
          weaponLongPressSuppressUntil=
            Date.now()+450;
          lastPanelActivation=Date.now();

          if(keyType){
            openKeyDetail(keyType);
          }else if(pet){
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
        clearTimeout(weaponLongPressTimer);
        weaponLongPressTimer=null;
        weaponLongPressTriggered=false;
      },
      {capture:true}
    );

    panel.addEventListener(
      "pointerup",
      event=>{
        clearTimeout(weaponLongPressTimer);
        weaponLongPressTimer=null;

        if(weaponLongPressTriggered){
          lastPanelActivation=Date.now();
          weaponLongPressSuppressUntil=
            Date.now()+450;

          event.preventDefault();
          event.stopImmediatePropagation();

          weaponLongPressTriggered=false;
          return;
        }

        lastPanelActivation=Date.now();
        event.preventDefault();
        handlePanelTap(event);
      },
      {
        passive:false,
        capture:true
      }
    );

    panel.addEventListener(
      "click",
      event=>{
        if(
          Date.now()<
          weaponLongPressSuppressUntil
        ){
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }

        if(
          Date.now()-lastPanelActivation<400
        ){
          lastPanelActivation=0;
          return;
        }

        handlePanelTap(event);
      }
    );
  }

  function matches(x){
    if(filter==="all") return true;

    const k=kind(x);

    if(filter==="weapon") return k==="weapon";
    if(filter==="armor") return k==="armor";
    if(filter==="backpack") return k==="backpack";
    if(filter==="material") return k==="material" || k==="loot";
    if(filter==="heal") return k==="heal";

    return true;
  }

  function carryItem(index){
    const stash=G().save.stash;
    const item=stash[index];

    if(!item) return;

    if(used()+cost(item)>capacity()){
      alert("バッグ容量を超えています。");
      return;
    }

    G().ensureItemWeight?.(item);

    if(
      carriedWeight()+(
        G().itemWeight?.(item)||0
      )>
      carriedWeightCapacity()+0.0001
    ){
      alert("バッグの重量上限を超えています。");
      return;
    }

    if(!G().addToBackpack?.(item))return;
    stash.splice(index,1);

    save();
    render();
  }

  function returnItem(index){
    const loot=G().player.loot || [];
    const item=loot[index];

    if(!item) return;

    G().save.stash.push(clone(item));
    loot.splice(index,1);

    save();
    render();
  }

  function storeStashKey(index){
    const stash=G().save.stash || [];
    const item=stash[index];

    if(!item || item.kind!=="key")return;
    if(!Array.isArray(G().save.keys))G().save.keys=[];

    if(G().save.keys.length>=3){
      alert("鍵保管は3個までです。");
      return;
    }

    G().save.keys.push(item.keyType);
    stash.splice(index,1);
    save();
    render();
  }

  function storeSelectedKey(source,index){
    const sourceItems=
      source==="stash"
        ? (G().save.stash || [])
        : (G().player.loot || []);

    const item=sourceItems[Number(index)];

    if(
      !item ||
      item.kind!=="key" ||
      !item.keyType
    ){
      return false;
    }

    if(!Array.isArray(G().save.keys)){
      G().save.keys=[];
    }

    if(G().save.keys.length>=3){
      alert("鍵保管は3個までです。");
      return false;
    }

    G().save.keys.push(item.keyType);
    sourceItems.splice(Number(index),1);

    save();
    G().renderInventory?.();
    transferSelection=null;
    render();

    return true;
  }

  function takeStoredKey(
    index,
    destination,
    gridX,
    gridY
  ){
    const storedKeys=
      Array.isArray(G().save.keys)
        ? G().save.keys
        : [];

    const sourceIndex=Number(index);
    const keyType=storedKeys[sourceIndex];

    if(!keyType){
      return false;
    }

    const item={
      kind:"key",
      keyType,
      name:
        KEY_TYPES.find(x=>x[0]===keyType)?.[1] ||
        keyType,
      gridW:1,
      gridH:1,
      slots:1,
      weight:0
    };

    const destinationItems=
      destination==="stash"
        ? (G().save.stash || [])
        : (G().player.loot || []);

    const destinationCapacity=
      destination==="stash"
        ? Number(
            window.EFRHub?.storageCapacity?.() ||
            0
          )
        : capacity();

    if(
      window.EFRGrid &&
      window.EFRGrid.used(destinationItems)+1>
      destinationCapacity
    ){
      alert(
        destination==="stash"
          ? "倉庫容量が不足しています。"
          : "バッグ容量を超えています。"
      );
      return false;
    }

    if(destination==="carry"){
      if(
        carriedWeight()+
        (G().itemWeight?.(item)||0)>
        carriedWeightCapacity()+0.0001
      ){
        alert("装備・持込品の重量上限を超えています。");
        return false;
      }
    }

    destinationItems.push(item);

    const destinationIndex=
      destinationItems.length-1;

    const moved=
      window.EFRGrid?.move?.(
        destinationItems,
        destinationCapacity,
        destinationIndex,
        Number(gridX),
        Number(gridY)
      );

    if(!moved){
      destinationItems.pop();
      return false;
    }

    storedKeys.splice(sourceIndex,1);

    save();
    G().renderInventory?.();
    transferSelection=null;
    render();

    return true;
  }

  function equipItem(index){
    const stash=G().save.stash;
    const item=stash[index];
    const target=slot(item);

    if(!target) return;

    let equipmentSlot=target;

    if(target==="pet"){
      if(G().save.player?.classId!=="trainer"){
        G().logMessage?.("ペットを装備できるのは調教師だけです");
        return;
      }

      equipmentSlot="weapon"+(G().activeWeaponSlot || 1);
    }else if(target==="weapon"){
      equipmentSlot="weapon"+(G().activeWeaponSlot || 1);
    }

    const old=G().save.equipment[equipmentSlot];

    if(
      item.kind==="pet" &&
      (
        equipmentSlot!=="weapon1" &&
        equipmentSlot!=="weapon2"
      )
    ){
      return;
    }

    G().save.equipment[equipmentSlot]=clone(item);
    stash.splice(index,1);

    if(old){
      stash.push(clone(old));
    }

    G().refreshBackpackCapacity?.();
    save();
    G().renderInventory?.();
    render();
  }

  function equipSelectedItemToSlot(slotName){
    if(
      slotName!=="weapon1" &&
      slotName!=="weapon2" &&
      slotName!=="head" &&
      slotName!=="chest" &&
      slotName!=="legs" &&
      slotName!=="backpack"
    ){
      return false;
    }

    const source=transferSelection?.source;

    if(
      source!=="stash" &&
      source!=="carry"
    ){
      return false;
    }

    const sourceItems=
      source==="stash"
        ? (G().save.stash||[])
        : (G().player.loot||[]);

    const sourceIndex=
      Number(transferSelection.index);

    const item=sourceItems[sourceIndex];

    if(!item){
      return false;
    }

    const target=slot(item);

    if(item.kind==="pet"){
      if(G().save.player?.classId!=="trainer"){
        G().logMessage?.("ペットを装備できるのは調教師だけです");
        return false;
      }

      if(
        slotName!=="weapon1" &&
        slotName!=="weapon2"
      ){
        return false;
      }
    }else if(item.kind==="weapon"){
      if(
        slotName!=="weapon1" &&
        slotName!=="weapon2"
      ){
        return false;
      }
    }else if(
      target!==slotName
    ){
      return false;
    }

    const equipment=
      G().save.equipment||{};

    const old=equipment[slotName];
    const stash=G().save.stash||[];

    if(old){
      const storageCapacity=
        Number(
          window.EFRHub?.storageCapacity?.() ||
          (
            24+
            Math.max(
              0,
              (G().save.base?.level||1)-1
            )*4+
            Math.max(
              0,
              (G().save.base?.facilities?.storage||1)-1
            )*10
          )
        );

      const candidateStash=
        stash.concat([clone(old)]);

      if(
        window.EFRGrid &&
        window.EFRGrid.used(candidateStash)>
        storageCapacity
      ){
        alert("倉庫容量が不足しています。");
        return false;
      }
    }

    equipment[slotName]=clone(item);
    sourceItems.splice(sourceIndex,1);

    if(old){
      stash.push(clone(old));
    }

    G().refreshBackpackCapacity?.();
    save();
    G().renderInventory?.();
    transferSelection=null;
    render();

    return true;
  }

  function equipCarryPetToSlot(slotName){
    if(
      slotName!=="weapon1" &&
      slotName!=="weapon2"
    ){
      return false;
    }

    if(G().save.player?.classId!=="trainer"){
      G().logMessage?.("ペットを装備できるのは調教師だけです");
      return false;
    }

    if(transferSelection?.source!=="carry"){
      return false;
    }

    const loot=G().player.loot || [];
    const sourceIndex=
      Number(transferSelection.index);

    const pet=loot[sourceIndex];

    if(
      !pet ||
      pet.kind!=="pet" ||
      !pet.petId
    ){
      return false;
    }

    const animalExists=
      (G().save.animals||[])
        .some(
          animal=>
            String(animal?.id||"")===
            String(pet.petId)
        );

    if(!animalExists){
      return false;
    }

    const equipment=
      G().save.equipment || {};

    const old=
      equipment[slotName];

    const stash=
      G().save.stash || [];

    if(old){
      const storageCapacity=
        Number(
          window.EFRHub?.storageCapacity?.() ||
          (
            24+
            Math.max(
              0,
              (G().save.base?.level||1)-1
            )*4+
            Math.max(
              0,
              (G().save.base?.facilities?.storage||1)-1
            )*10
          )
        );

      const candidateStash=
        stash.concat([clone(old)]);

      if(
        window.EFRGrid &&
        window.EFRGrid.used(candidateStash)>
        storageCapacity
      ){
        alert("倉庫容量が不足しています。");
        return false;
      }

      stash.push(clone(old));
    }

    equipment[slotName]=clone(pet);
    loot.splice(sourceIndex,1);

    save();
    G().renderInventory?.();
    transferSelection=null;
    render();

    return true;
  }

  function unequipItem(slotName){
    const equipment=G().save.equipment;
    const item=equipment[slotName];

    if(!item) return;

    G().save.stash.push(clone(item));
    equipment[slotName]=null;

    G().refreshBackpackCapacity?.();
    save();
    render();
  }

  const KEY_TYPES=[
    ["military","軍用鍵","🪖","軍用区画・軍事施設で使用する鍵"],
    ["research","研究施設鍵","🧪","研究施設の施錠区画で使用する鍵"],
    ["factory","工場鍵","🏭","工場・製造区画で使用する鍵"],
    ["storage","倉庫鍵","📦","倉庫・保管区画で使用する鍵"],
    ["security","保安区画鍵","🔒","保安設備の施錠区画で使用する鍵"],
    ["special","特殊区画鍵","🗝️","特殊な施錠区画で使用する鍵"]
  ];

  function keyInfo(keyType){
    const found=KEY_TYPES.find(
      x=>x[0]===keyType
    );

    return {
      type:keyType || "unknown",
      name:found?.[1] || keyType || "不明な鍵",
      icon:found?.[2] || "🔑",
      description:
        found?.[3] ||
        "この鍵に対応する施錠区画を解錠できます。"
    };
  }

  function openKeyDetail(keyType){
    const info=keyInfo(keyType);

    let modal=document.getElementById(
      "efrLoadoutKeyDetailModal"
    );

    if(!modal){
      modal=document.createElement("section");
      modal.id="efrLoadoutKeyDetailModal";
      modal.className=
        "efrLoadoutKeyDetailModal hidden";

      document.body.appendChild(modal);
    }

    modal.innerHTML=`
      <div
        class="efrLoadoutKeyDetailWindow"
        role="dialog"
        aria-modal="true"
      >
        <header class="efrLoadoutKeyDetailHead">
          <div
            class="efrLoadoutKeyDetailIcon key-type-${info.type}"
          >
            ${info.icon}
          </div>

          <div>
            <span>KEY DETAIL</span>
            <h3>${info.name}</h3>
          </div>

          <button
            type="button"
            data-key-detail-close
          >
            閉じる
          </button>
        </header>

        <section class="efrLoadoutKeyDetailBody">
          <div class="efrLoadoutKeyDetailRow">
            <span>種類</span>
            <strong>${info.name}</strong>
          </div>

          <div class="efrLoadoutKeyDetailRow">
            <span>用途</span>
            <p>${info.description}</p>
          </div>
        </section>
      </div>
    `;

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden","false");

    const close=()=>{
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden","true");
    };

    modal
      .querySelector("[data-key-detail-close]")
      ?.addEventListener("click",close);

    modal.onclick=event=>{
      if(event.target===modal){
        close();
      }
    };
  }

    function render(){
    ensure();
    G().refreshBackpackCapacity?.();

    const saveData=G().save;
    const storedKeys=Array.isArray(saveData.keys)?saveData.keys:[];
    document.getElementById("loadoutKeys").innerHTML=
      `<div class="loadoutKeySlots">`+
      Array.from({length:3},(_,index)=>{
        const key=storedKeys[index];

        if(!key){
          return `
            <div
              class="loadoutKeySlot key-type-empty"
              data-key-index="${index}"
            >
              <span class="loadoutKeyIcon">＋</span>
            </div>
          `;
        }

        const info=keyInfo(key);

        return `
          <div
            class="loadoutKeySlot key-type-${info.type}"
            data-key-index="${index}"
            title="${info.name}"
          >
            <span class="loadoutKeyIcon">${info.icon}</span>
          </div>
        `;
      }).join("")+
      `</div>`;

    const equipment=saveData.equipment || {};
    const stash=saveData.stash || [];

    const storageCapacity=
      window.EFRHub?.storageCapacity?.() ||
      (
        24+
        Math.max(
          0,
          (saveData.base?.level||1)-1
        )*4+
        Math.max(
          0,
          (saveData.base?.facilities?.storage||1)-1
        )*10
      );

    const carryCapacity=
      capacity();

    const equipmentSlots=[
      ["weapon1","武器1"],
      ["weapon2","武器2"],
      ["head","頭"],
      ["chest","胴"],
      ["legs","脚"],
      ["backpack","バッグ"]
    ];

    const animals=
      Array.isArray(saveData.animals)
        ? saveData.animals
        : [];

    const equippedPetIds=new Set(
      equipmentSlots
        .map(([key])=>equipment[key])
        .filter(item=>item?.kind==="pet" && item.petId)
        .map(item=>String(item.petId))
    );

    const carriedPetIds=new Set(
      (G().player.loot||[])
        .filter(item=>item?.kind==="pet" && item.petId)
        .map(item=>String(item.petId))
    );

    const cagePets=
      animals
        .filter(animal=>{
          const id=String(animal?.id||"");
          return Boolean(id) &&
            !equippedPetIds.has(id) &&
            !carriedPetIds.has(id);
        })
        .slice(0,20);

    const cage=document.getElementById("loadoutPetCage");

    if(cage){
      cage.innerHTML=
        Array.from({length:20},(_,index)=>{
          const pet=cagePets[index];

          if(!pet){
            return `
              <div class="efrPetCageSlot isEmpty">
                <span>${index+1}</span>
                <small>空き</small>
              </div>
            `;
          }

          return `
            <div
              class="efrPetCageSlot efrPetCageCard"
              data-pet-id="${String(pet.id)}"
            >
              <span class="efrPetCageIndex">${index+1}</span>
              <strong>${name(pet)}</strong>
              <small>
                Lv.${Number(pet.level||1)}
                / ${escPetTypeName(pet.type)}
              </small>
              <em>長押しで詳細</em>
            </div>
          `;
        }).join("") ||
        `<div class="loadoutMeta">動物はいません</div>`;
    }

    document.getElementById("loadoutMeta").textContent=
      "重量 "+
      carriedWeight().toFixed(1)+
      " / "+
      carriedWeightCapacity().toFixed(1)+
      " kg";

    document.getElementById("loadoutEquip").innerHTML=
      equipmentSlots.map(([key,label])=>{
        if(
          key==="weapon2" &&
          saveData.player?.classId==="trainer"
        ){
          label="ペット";
        }

        const item=equipment[key];

        return `
          <div
            class="loadoutSlot${item?.magicStaff ? " loadoutMagicStaff" : ""}"
            data-equipment-slot="${key}"
          >
            <strong>${label}</strong>
            <span>${item ? name(item) : "なし"}</span>
            ${
              item?.magicStaff
                ? `<small class="loadoutStaffHint">長押しで武器詳細</small>`
                : ""
            }
            ${
              item
                ? `
                  <button data-unequip="${key}">
                    倉庫へ戻す
                  </button>
                `
                : ""
            }
          </div>
        `;
      }).join("");

    const filters=[
      ["all","全部"],
      ["weapon","武器"],
      ["armor","防具"],
      ["backpack","バッグ"],
      ["material","素材"],
      ["heal","医療"]
    ];

    document.getElementById("loadoutFilters").innerHTML=
      filters.map(([key,label])=>`
        <button
          data-filter="${key}"
          class="${filter===key ? "active" : ""}"
        >
          ${label}
        </button>
      `).join("");

    const stashEntries=
      stash
        .map((item,index)=>({item,index}));

    if(window.EFRGrid){
      const fullLayout=
        window.EFRGrid.layout(
          stash,
          storageCapacity
        );

      if(fullLayout.changed){
        save();
      }

      const grid=window.EFRGrid.render(
        stashEntries.map(x=>x.item),
        storageCapacity,
        (item,filteredIndex)=>{
          const entry=stashEntries[filteredIndex];
          const originalIndex=entry.index;
          const equipSlot=slot(item);

          return `
            <div
              class="efrSlotItemBody ${matches(item) ? "" : "loadoutFilterDimmed"}"
              ${item?.magicStaff ? `data-magic-staff-stash-index="${originalIndex}"` : ""}
            >
              <strong>${name(item)}</strong>
              ${
                item.amount
                  ? `<b class="efrSlotAmount">×${item.amount}</b>`
                  : ""
              }
              ${
                item?.magicStaff
                  ? `<small class="loadoutStaffHint">長押しで武器詳細</small>`
                  : ""
              }

            </div>
          `;
        },
        {
          layout:false,
          indexMap:stashEntries.map(
            x=>x.index
          )
        }
      );

      document.getElementById("loadoutStash").innerHTML=
        grid.html;

      if(grid.changed){
        save();
      }
    }else{
      document.getElementById("loadoutStash").innerHTML=
        stashEntries.length
          ? stashEntries.map(({item,index})=>{
              const equipSlot=slot(item);

              return `
                <div
                  class="loadoutItem"
                  ${item?.magicStaff ? `data-magic-staff-stash-index="${index}"` : ""}
                >
                  <span>
                    ${name(item)}
                    ${
                      item?.magicStaff
                        ? `<small class="loadoutStaffHint">長押しで杖を編集</small>`
                        : ""
                    }
                  </span>

                </div>
              `;
            }).join("")
          : `
            <div class="loadoutMeta">
              該当するアイテムはありません
            </div>
          `;
    }

    const loot=G().player.loot || [];

    if(window.EFRGrid){
      const grid=window.EFRGrid.render(
        loot,
        carryCapacity,
        (item,index)=>{
          return `
            <div
              class="efrSlotItemBody"
              ${item?.magicStaff ? `data-magic-staff-carry-index="${index}"` : ""}
            >
              <strong>${name(item)}</strong>
              ${
                item.amount
                  ? `<b class="efrSlotAmount">×${item.amount}</b>`
                  : ""
              }
              ${
                item?.magicStaff
                  ? `<small class="loadoutStaffHint">長押しで杖を編集</small>`
                  : ""
              }

            </div>
          `;
        }
      );

      document.getElementById("loadoutCarry").innerHTML=
        grid.html;

      if(grid.changed){
        save();
      }
    }else{
      document.getElementById("loadoutCarry").innerHTML=
        loot.length
          ? loot.map((item,index)=>`
              <div class="loadoutItem">
                <span>
                  ${name(item)}
                </span>

              </div>
            `).join("")
          : `
            <div class="loadoutMeta">
              インベントリなし
            </div>
          `;
    }

  }

function open(){
    ensure();

    const panel=
      document.getElementById("efrLoadoutPanel");

    panel.classList.remove("hidden");

    try{
      render();
    }catch(error){
      console.error(
        "[EFRLoadout] render failed",
        error
      );

      const meta=
        document.getElementById("loadoutMeta");

      if(meta){
        meta.textContent=
          "出撃準備の読み込みでエラーが発生しました。";
      }
    }
  }

  function close(){
    document
      .getElementById("efrLoadoutPanel")
      ?.classList.add("hidden");
  }

  ensure();

  window.EFRLoadout={
    open,
    close,
    render
  };

})();
