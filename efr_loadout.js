(function(){
  "use strict";

  const G=()=>window.EFRGame;
  let filter="all";

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
    return x?.slots || 1;
  }

  function used(){
    return (G().player.loot || [])
      .reduce((n,x)=>n+cost(x),0);
  }

  function capacity(){
    return G().player.backpackCapacity ?? 4;
  }

  function save(){
    G().persist?.();
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

    panel.querySelector("#loadoutClose").onclick=close;

    panel.querySelector("#loadoutClear").onclick=()=>{
      const loot=G().player.loot || [];

      G().save.stash.push(...loot.map(clone));
      G().player.loot=[];

      save();
      render();
    };

    panel.querySelector("#loadoutStart").onclick=()=>{
      close();
      G().start();
    };

    panel.addEventListener("click",event=>{

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
    });
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

    save();
    render();
  }

  function render(){

    ensure();

    const saveData=G().save;
    const equipment=saveData.equipment || {};
    const stash=saveData.stash || [];

    document.getElementById("loadoutMeta").textContent=
      "倉庫 "+stash.length+
      "個 / 持込 "+
      used()+"/"+capacity()+" スロット";

    const equipmentSlots=[
      ["weapon1","武器1"],
      ["weapon2","武器2"],
      ["head","頭"],
      ["chest","胴"],
      ["legs","脚"],
      ["backpack","バッグ"]
    ];

    document.getElementById("loadoutEquip").innerHTML=
      equipmentSlots.map(([key,label])=>{

        if(key==="weapon2" && saveData.player?.classId==="trainer"){
          label="ペット";
        }

        const item=equipment[key];

        return `
          <div class="loadoutSlot">
            <strong>${label}</strong>
            <span>${item ? name(item) : "なし"}</span>
            ${
              item
              ? `<button data-unequip="${key}">
                   倉庫へ戻す
                 </button>`
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
          class="${filter===key ? "active" : ""}">
          ${label}
        </button>
      `).join("");

    document.getElementById("loadoutStash").innerHTML=
      stash.map((item,index)=>{

        if(!matches(item)) return "";

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
              ? `<button data-equip="${index}" ${
                  saveData.player?.classId==="trainer" &&
                  (G().activeWeaponSlot||1)===2
                    ? "disabled"
                    : ""
                }>
                   装備
                 </button>`
              : `<button data-carry="${index}">
                   持っていく
                 </button>`
            }

          </div>
        `;

      }).join("") ||
      `<div class="loadoutMeta">
        該当するアイテムはありません
      </div>`;

    const loot=G().player.loot || [];

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
      : `<div class="loadoutMeta">
          持込なし
        </div>`;

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
      used()+" / "+capacity()+" スロット";
  }

  function open(){
    ensure();
    render();

    document
      .getElementById("efrLoadoutPanel")
      .classList.remove("hidden");
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
