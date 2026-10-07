(function(){
  "use strict";

  let active=false;
  let snapshot=null;
  let panel=null;

  function G(){
    return window.EFRGame;
  }

  function clone(value){
    return value==null
      ? value
      : JSON.parse(JSON.stringify(value));
  }

  function isActive(){
    return active;
  }

  function findTargetPosition(){
    const g=G();
    const p=g.player;

    return {
      x:Math.min(
        p.x+150,
        (g.world?.walls?.[1]?.x||1920)-80
      ),
      y:p.y
    };
  }

  function createDummy(){
    const g=G();
    const pos=findTargetPosition();

    return {
      id:"training-dummy",
      name:"訓練用サンドバッグ",
      role:"trainer",
      visualType:"human",
      x:pos.x,
      y:pos.y,
      r:22,
      hp:999999,
      maxHp:999999,
      dead:false,
      trainingDummy:true,
      loot:[]
    };
  }

  function weaponName(w){
    return w?.name || "素手";
  }

  function isWeapon(w){
    return w?.kind==="weapon" || w?.kind==="firearm";
  }

  function currentSlot(){
    return G()?.activeWeaponSlot===2 ? 2 : 1;
  }

  function swapWithStorage(index){
    const g=G();
    if(!g)return false;

    const stash=g.save.stash||[];
    const slot="weapon"+currentSlot();
    const selected=stash[index];

    if(!isWeapon(selected)){
      g.logMessage?.("訓練に使用できる武器を選択してください");
      return false;
    }

    const old=g.save.equipment?.[slot] || null;

    if(old && window.EFRGrid){
      const candidateStash=
        stash.map(
          (item,i)=>
            i===index
              ? clone(old)
              : clone(item)
        );

      const capacity=
        Number(
          window.EFRBaseCore?.storageCapacity?.() || 0
        );

      if(
        capacity &&
        !window.EFRGrid.canFit(
          candidateStash,
          capacity
        )
      ){
        window.EFRGrid.flash();
        return false;
      }
    }

    g.save.equipment[slot]=clone(selected);
    stash[index]=old ? clone(old) : null;

    if(old){
      // 空の配列要素を残さず、選択した武器の位置へ旧武器を戻す。
      stash[index]=clone(old);
    }else{
      stash.splice(index,1);
    }

    g.refreshBackpackCapacity?.();
    g.renderInventory?.();
    update();
    return true;
  }

  function selectSlot(slot){
    if(slot!==1 && slot!==2)return;

    const g=G();
    g.activeWeaponSlot=slot;
    g.renderInventory?.();
    update();
  }

  function attachPart(partId,rarity){
    const g=G();
    const slot="weapon"+currentSlot();

    const ok=
      window.EFRWeaponStorage?.attachEquipment?.(
        slot,
        partId,
        rarity
      );

    if(ok)update();
  }

  function removePart(partId){
    const g=G();
    const slot="weapon"+currentSlot();

    const ok=
      window.EFRWeaponStorage?.removeEquipment?.(
        slot,
        partId
      );

    if(ok)update();
  }

  function restoreSnapshot(){
    const g=G();
    if(!g||!snapshot)return;

    const restored=clone(snapshot.save);

    Object.keys(g.save).forEach(key=>{
      delete g.save[key];
    });

    Object.assign(g.save,restored);

    Object.assign(
      g.player,
      clone(snapshot.player)
    );

    g.activeWeaponSlot=snapshot.activeWeaponSlot;

    g.refreshBackpackCapacity?.();
    g.renderInventory?.();

    snapshot=null;
  }

  function close(){
    if(!active)return;

    active=false;

    const g=G();

    g?.stopTrainingRuntime?.();

    restoreSnapshot();

    g?.persist?.();
    g?.renderInventory?.();
    window.EFRHub?.render?.();

    panel?.remove();
    panel=null;
  }

  function renderParts(g,w){
    if(
      !w ||
      w.kind!=="firearm" ||
      w.isBow
    ){
      return `
        <div style="opacity:.65">
          この武器は銃器パーツ装着対象ではありません。
        </div>
      `;
    }

    const definitions=
      window.EFRBaseParts?.definitions || {};

    const parts=
      Array.isArray(g.save.base?.weaponParts)
        ?g.save.base.weaponParts
        :[];

    const mods=Array.isArray(w.mods)
      ?w.mods
      :[];

    const modHtml=mods.length
      ?mods.map(part=>{
          const def=definitions[part.id];
          return `
            <div style="
              display:flex;
              justify-content:space-between;
              gap:8px;
              align-items:center;
              padding:6px 8px;
              border:1px solid rgba(255,255,255,.10);
              border-radius:8px;
            ">
              <span>
                ${String(def?.name||part.id)}
                / ${String(
                  window.EFRBaseParts?.rarityName?.(part.rarity)||
                  "レア度"+part.rarity
                )}
              </span>
              <button
                data-training-remove-part="${String(part.id)}">
                外す
              </button>
            </div>
          `;
        }).join("")
      : `<div style="opacity:.65">装着パーツなし</div>`;

    const available=parts
      .map((part,index)=>{
        const def=definitions[part.id];
        if(!def)return "";

        return `
          <button
            data-training-attach-part="${String(part.id)}"
            data-training-attach-rarity="${Number(part.rarity||1)}">
            ${String(def.name||part.id)}
            /
            ${String(
              window.EFRBaseParts?.rarityName?.(part.rarity)||
              "レア度"+part.rarity
            )}
          </button>
        `;
      })
      .join("");

    return `
      <div>
        <strong>装着中</strong>
        <div style="
          display:grid;
          gap:6px;
          margin-top:6px;
        ">
          ${modHtml}
        </div>
      </div>

      <div style="margin-top:10px">
        <strong>倉庫のパーツ</strong>
        <div style="
          display:flex;
          flex-wrap:wrap;
          gap:6px;
          margin-top:6px;
        ">
          ${available || `<span style="opacity:.65">使用可能なパーツなし</span>`}
        </div>
      </div>
    `;
  }

  function update(){
    if(!active||!panel)return;

    const g=G();
    const p=g?.player;
    if(!g||!p)return;

    const slot=currentSlot();
    const weapon=g.equippedWeapon?.();
    const w1=g.save.equipment?.weapon1;
    const w2=g.save.equipment?.weapon2;

    const stash=(g.save.stash||[])
      .map((item,index)=>({item,index}))
      .filter(x=>isWeapon(x.item));

    panel.innerHTML=`
      <div style="
        position:absolute;
        left:50%;
        top:12px;
        transform:translateX(-50%);
        z-index:20;
        width:min(94vw,760px);
        max-height:92vh;
        overflow:auto;
        padding:14px;
        border:1px solid rgba(255,255,255,.18);
        border-radius:14px;
        background:rgba(16,18,22,.95);
        color:#fff;
        box-sizing:border-box;
        pointer-events:auto;
      ">
        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
        ">
          <div>
            <strong style="font-size:20px">訓練場</strong>
            <div style="opacity:.72;margin-top:3px">
              サンドバッグで自由に試せます
            </div>
          </div>
          <button data-training-close>訓練終了</button>
        </div>

        <div style="
          display:flex;
          flex-wrap:wrap;
          gap:7px;
          margin-top:12px;
        ">
          <button
            data-training-slot="1"
            ${slot===1?"disabled":""}>
            武器1: ${weaponName(w1)}
          </button>

          <button
            data-training-slot="2"
            ${slot===2?"disabled":""}>
            武器2: ${weaponName(w2)}
          </button>
        </div>

        <div style="
          margin-top:10px;
          padding:9px;
          border-radius:10px;
          background:rgba(255,255,255,.06);
        ">
          <strong>現在のテスト装備</strong>
          <div style="margin-top:5px">
            ${weaponName(weapon)}
            /
            HP ${Math.round(p.hp||0)}
            /
            MP ${Math.round(p.mp||0)}/${Math.round(p.maxMP||0)}
          </div>
        </div>

        <div style="
          margin-top:10px;
          display:flex;
          flex-wrap:wrap;
          gap:7px;
        ">
          <button data-training-attack>攻撃</button>
          <button data-training-fire>射撃 / 弓</button>
          ${
            window.EFRMagic?.activeStaff?.()?.spells?.map(
              (spell,index)=>`
                <button data-training-magic="${index}">
                  ${String(spell.name)}を試す
                </button>
              `
            ).join("") || ""
          }
        </div>

        <details open style="margin-top:12px">
          <summary>倉庫の武器と入れ替える</summary>
          <div style="
            display:flex;
            flex-wrap:wrap;
            gap:7px;
            margin-top:8px;
          ">
            ${
              stash.map(x=>`
                <button
                  data-training-stash="${x.index}">
                  ${weaponName(x.item)}
                </button>
              `).join("") ||
              `<span style="opacity:.65">倉庫に交換可能な武器がありません</span>`
            }
          </div>
        </details>

        <details open style="margin-top:12px">
          <summary>アタッチメント / 武器パーツ</summary>
          <div style="margin-top:8px">
            ${renderParts(g,weapon)}
          </div>
        </details>

        <div style="
          margin-top:12px;
          font-size:12px;
          opacity:.68;
        ">
          訓練中の武器交換・パーツ変更は訓練場内だけの一時変更です。
          終了すると訓練開始前の装備・倉庫・パーツ状態へ戻ります。
          耐久・弾薬・MP・XP・戦利品は消費/獲得しません。
        </div>
      </div>
    `;

    panel
      .querySelector("[data-training-close]")
      ?.addEventListener("click",close);

    panel
      .querySelectorAll("[data-training-slot]")
      .forEach(button=>{
        button.addEventListener("click",()=>{
          selectSlot(
            Number(button.dataset.trainingSlot)
          );
        });
      });

    panel
      .querySelector("[data-training-attack]")
      ?.addEventListener("click",()=>{
        g.attack?.();
        update();
      });

    panel
      .querySelector("[data-training-fire]")
      ?.addEventListener("click",()=>{
        if(window.EFRContentExpansion?.fire){
          window.EFRContentExpansion.fire();
        }else{
          g.attack?.();
        }
        update();
      });

    panel
      .querySelectorAll("[data-training-magic]")
      .forEach(button=>{
        button.addEventListener("click",()=>{
          window.EFRMagic?.castSpell?.(
            Number(button.dataset.trainingMagic)
          );
        });
      });

    panel
      .querySelectorAll("[data-training-stash]")
      .forEach(button=>{
        button.addEventListener("click",()=>{
          swapWithStorage(
            Number(button.dataset.trainingStash)
          );
        });
      });

    panel
      .querySelectorAll("[data-training-attach-part]")
      .forEach(button=>{
        button.addEventListener("click",()=>{
          attachPart(
            button.dataset.trainingAttachPart,
            Number(button.dataset.trainingAttachRarity||1)
          );
        });
      });

    panel
      .querySelectorAll("[data-training-remove-part]")
      .forEach(button=>{
        button.addEventListener("click",()=>{
          removePart(
            button.dataset.trainingRemovePart
          );
        });
      });
  }

  function open(){
    if(active)return;

    const g=G();
    if(!g)return;

    snapshot={
      save:clone(g.save),
      player:clone(g.player),
      activeWeaponSlot:g.activeWeaponSlot
    };

    active=true;

    g.start();

    g.enemies.splice(
      0,
      g.enemies.length,
      createDummy()
    );

    panel=document.createElement("section");
    panel.id="efrTrainingPanel";
    panel.style.position="fixed";
    panel.style.inset="0";
    panel.style.pointerEvents="none";
    panel.style.zIndex="100";

    document.body.appendChild(panel);

    update();
  }

  window.EFRTraining={
    open,
    close,
    update,
    isActive
  };
})();
