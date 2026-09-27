(function(){
  "use strict";

  const G=()=>window.EFRGame;
  let filter="all";
  let stashGridSelection=null;
  let carryGridSelection=null;


  function clone(x){
    return x ? JSON.parse(JSON.stringify(x)) : x;
  }

  function name(x){
    return typeof x==="string"
      ? x
      : (x?.name || x?.type || "不明なアイテム");
  }

  function kind(x){
    if(typeof x==="string") return "material";
    return x?.kind || "item";
  }

  function slot(x){
    if(typeof x==="string") return null;
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

          <div class="loadoutBox">
            <h3>現在の装備</h3>
            <div id="loadoutEquip" class="loadoutEquip"></div>
          </div>

          <div class="loadoutBox">
            <h3>倉庫</h3>
            <div id="loadoutFilters" class="loadoutFilters"></div>
            <div id="loadoutStash" class="loadoutList"></div>
          </div>

          <div class="loadoutBox">
            <h3>今回持っていくもの</h3>
            <div id="loadoutCarry" class="loadoutList"></div>
          </div>

          <div class="loadoutBox">
            <h3>出撃内容</h3>
            <div id="loadoutSummary" class="loadoutMeta"></div>
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
          if(container.id==="loadoutStash"){
            stashGridSelection=index;
          }else{
            carryGridSelection=index;
          }

          container
            .querySelectorAll(".efrSlotItem")
            .forEach(el=>{
              el.classList.toggle(
                "efrSelected",
                Number(el.dataset.gridItemIndex)===index
              );
            });
        }

        return;
      }

      if(gridCell){
        const container=
          gridCell.closest(
            "#loadoutStash,#loadoutCarry"
          );

        if(!container)return;

        const isStash=
          container.id==="loadoutStash";

        const selected=
          isStash
            ? stashGridSelection
            : carryGridSelection;

        if(selected===null)return;

        const items=
          isStash
            ? G().save.stash
            : (G().player.loot||[]);

        const cap=
          isStash
            ? storageCapacity
            : carryCapacity;

        const moved=
          window.EFRGrid?.move?.(
            items,
            cap,
            selected,
            Number(gridCell.dataset.gridCellX),
            Number(gridCell.dataset.gridCellY)
          );

        if(moved){
          save();

          if(isStash){
            stashGridSelection=null;
          }else{
            carryGridSelection=null;
          }

          render();
        }

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

    panel.addEventListener(
      "pointerup",
      event=>{
        lastPanelActivation=Date.now();
        event.preventDefault();
        handlePanelTap(event);
      },
      {passive:false}
    );

    panel.addEventListener(
      "click",
      event=>{
        if(Date.now()-lastPanelActivation<400){
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

    G().player.loot.push(clone(item));
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

  function equipItem(index){
    const stash=G().save.stash;
    const item=stash[index];
    const target=slot(item);

    if(!target) return;

    let equipmentSlot=target;

    if(target==="weapon"){
      if(
        G().save.player?.classId==="trainer" &&
        (G().activeWeaponSlot || 1)===2
      ){
        G().logMessage?.("調教師は武器2枠をペットに使用します");
        return;
      }

      equipmentSlot="weapon"+(G().activeWeaponSlot || 1);
    }

    const old=G().save.equipment[equipmentSlot];

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

  function render(){
    ensure();
    G().refreshBackpackCapacity?.();

    const saveData=G().save;
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

    document.getElementById("loadoutMeta").textContent=
      "倉庫 "+
      (
        window.EFRGrid
          ? window.EFRGrid.used(stash)
          : stash.reduce(
              (n,x)=>n+(x?.slots||1),
              0
            )
      )+
      "/"+
      storageCapacity+
      " マス / 持込 "+
      used()+"/"+carryCapacity+
      " マス / 重量 "+
      carriedWeight().toFixed(1)+
      "/"+
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
          <div class="loadoutSlot">
            <strong>${label}</strong>
            <span>${item ? name(item) : "なし"}</span>
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
        .map((item,index)=>({item,index}))
        .filter(entry=>matches(entry.item));

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
            <div class="efrSlotItemBody">
              <strong>${name(item)}</strong>
              <small>
                ${kind(item)} / ${cost(item)}マス
              </small>
              ${
                item.amount
                  ? `<b class="efrSlotAmount">×${item.amount}</b>`
                  : ""
              }
              ${
                equipSlot
                  ? `
                    <button
                      data-equip="${originalIndex}"
                      ${
                        saveData.player?.classId==="trainer" &&
                        (G().activeWeaponSlot||1)===2
                          ? "disabled"
                          : ""
                      }
                    >
                      装備
                    </button>
                  `
                  : `
                    <button data-carry="${originalIndex}">
                      持っていく
                    </button>
                  `
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
                <div class="loadoutItem">
                  <span>
                    ${name(item)}
                    <small>
                      ${kind(item)} / ${cost(item)}スロット
                    </small>
                  </span>
                  ${
                    equipSlot
                      ? `<button data-equip="${index}">装備</button>`
                      : `<button data-carry="${index}">持っていく</button>`
                  }
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
            <div class="efrSlotItemBody">
              <strong>${name(item)}</strong>
              <small>
                ${kind(item)} / ${cost(item)}マス
              </small>
              ${
                item.amount
                  ? `<b class="efrSlotAmount">×${item.amount}</b>`
                  : ""
              }
              <button data-return="${index}">
                倉庫へ
              </button>
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
                  <small>
                    ${kind(item)} / ${cost(item)}スロット
                  </small>
                </span>
                <button data-return="${index}">
                  倉庫へ
                </button>
              </div>
            `).join("")
          : `
            <div class="loadoutMeta">
              持込なし
            </div>
          `;
    }

    document.getElementById("loadoutSummary").innerHTML=
      "武器: "+
      name(equipment.weapon1 || "なし")+
      " / "+
      name(equipment.weapon2 || "なし")+
      "<br>"+
      "防具: "+
      name(equipment.head || "なし")+
      "・"+
      name(equipment.chest || "なし")+
      "・"+
      name(equipment.legs || "なし")+
      "<br>"+
      "バッグ: "+
      name(equipment.backpack || "なし")+
      "<br>"+
      "持込: "+
      used()+" / "+carryCapacity+
      " マス";
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
