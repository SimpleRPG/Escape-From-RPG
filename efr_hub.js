(function(){
  "use strict";

  const A=()=>window.EFRGame;
  const X=()=>window.EFRContentExpansion;

  let panel=null;
  let tab="base";
  let storageGridSelection=null;
    let weaponDetailIndex=null;
    let weaponDetailPartIndex=null;
    let weaponDetailTimer=null;
    let weaponDetailLongPress=false;


  const facilities=()=>window.EFRBaseFacilities||{};
  function clone(x){
    return x ? JSON.parse(JSON.stringify(x)) : x;
  }

  function tap(button,handler){
    const a=A();

    if(a?.bindTap){
      a.bindTap(button,handler);
    }else if(button){
      button.onclick=handler;
    }
  }

  function ensureBase(){
    return window.EFRBaseCore?.ensureBase?.() || null;
  }

  function materialCount(name){
    return Number(
      window.EFRBaseCore?.materialCount?.(name) || 0
    );
  }

  function upgradeFacility(key){
    return Boolean(
      window.EFRBaseCore?.upgradeFacility?.(key)
    );
  }

  function storageCapacity(){
    return Number(
      window.EFRBaseCore?.storageCapacity?.() || 0
    );
  }

  function renderFacilities(){
    const b=ensureBase();

    return Object.entries(facilities())
      .map(([key,f])=>{
        const lv=b.facilities[key]||1;
        const locked=b.level<f.unlock;
        const max=lv>=f.max;
        const cost=max
          ? 0
          : Number(
              window.EFRBaseCore?.facilityCost?.(key) || 0
            );

        return `
          <div class="hubFacilityCard">
            <strong>${esc(f.name)} Lv.${lv}</strong>
            <span>${esc(f.desc)}</span>
            <small>${
              max
                ? "最大レベル"
                : locked
                  ? "拠点Lv."+f.unlock+"で解放"
                  : "必要素材：高品質金属 / 鉄くず ×"+cost
            }</small>

            <button
              data-action="facility"
              data-key="${key}"
              ${max||locked?"disabled":""}>
              ${max?"最大":locked?"未解放":"アップグレード"}
            </button>
          </div>`;
      })
      .join("");
  }

  function esc(x){
    return String(x ?? "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function itemName(x){
    return typeof x==="string"
      ? x
      : (x?.name || x?.type || "不明");
  }

  function kindName(x){
    const k=typeof x==="string" ? "material" : x?.kind;

    return {
      weapon:"武器",
      firearm:"銃器",
      armor:"防具",
      backpack:"バッグ",
      ammo:"弾薬",
      heal:"医療",
      material:"素材",
      loot:"戦利品",
      repair:"修理",
      tool:"工具",
      blueprint:"設計図"
    }[k] || "アイテム";
  }

  function materials(){
    const a=A();
    const result={};

    for(const x of (a.save.stash||[])){
      const n=itemName(x);
      const k=typeof x==="string" ? "material" : x?.kind;
      if(k==="material" || k==="loot"){
        result[n]=(result[n]||0)+(Number(x?.amount)||1);
      }
    }

    return result;
  }

  function isWeapon(x){
    return x?.kind==="firearm" || x?.kind==="weapon";
  }

  function isCustomizableWeapon(x){
    return x?.kind==="firearm" &&
      window.EFRBaseParts?.normalizeWeapon &&
      window.EFRBaseParts?.definitions;
  }

  function weaponPartDefinition(part){
    return window.EFRBaseParts?.definitions?.[
      typeof part==="string"
        ? part
        : part?.id
    ] || null;
  }

  function weaponPartName(part){
    return weaponPartDefinition(part)?.name ||
      part?.name ||
      part?.id ||
      "不明なパーツ";
  }

  function weaponPartSlotName(slot){
    return {
      barrel:"バレル",
      stock:"ストック",
      grip:"グリップ",
      magazine:"マガジン",
      muzzle:"マズル"
    }[slot] || slot;
  }

  function weaponPartInventory(){
    const b=ensureBase();

    if(!Array.isArray(b.weaponParts)){
      b.weaponParts=[];
    }

    return b.weaponParts;
  }

  function weaponStats(w){
    if(!w)return {};

    const clone=JSON.parse(JSON.stringify(w));

    window.EFRBaseParts?.normalizeWeapon?.(clone);

    return {
      damage:Number(clone.damage||0),
      range:Number(clone.range||0),
      cooldown:Number(clone.cooldown||0),
      magSize:Number(clone.magSize||0),
      accuracy:Number(
        window.EFRBaseParts?.accuracyBonus?.(clone)||0
      ),
      spread:Number(
        window.EFRBaseParts?.spreadReduction?.(clone)||0
      )
    };
  }

  function weaponStatRows(before,after){
    const rows=[
      ["攻撃力","damage",0],
      ["射程","range",0],
      ["射撃間隔","cooldown",3],
      ["マガジン","magSize",0],
      ["精度","accuracy",1],
      ["拡散軽減","spread",1]
    ];

    return rows.map(([label,key,digits])=>{
      const b=Number(before[key]||0);
      const a=Number(after[key]||0);
      const d=a-b;

      const fmt=v=>{
        if(digits===0)return String(Math.round(v));
        return v.toFixed(digits);
      };

      const sign=
        d>0
          ? "+"
          : d<0
            ? ""
            : "";

      const diff=
        d===0
          ? "変化なし"
          : `${sign}${fmt(d)}`;

      return `
        <div class="weaponDetailStat">
          <span>${esc(label)}</span>
          <strong>
            ${fmt(b)}
            →
            ${fmt(a)}
            <small>${esc(diff)}</small>
          </strong>
        </div>
      `;
    }).join("");
  }

  function partPreviewWeapon(weapon,part){
    const preview=JSON.parse(
      JSON.stringify(weapon)
    );

    preview.mods=Array.isArray(preview.mods)
      ? preview.mods
      : [];

    const definition=weaponPartDefinition(part);

    if(!definition)return null;

    preview.mods=
      preview.mods.filter(x=>{
        const d=weaponPartDefinition(x);
        return d?.slot!==definition.slot;
      });

    preview.mods.push(
      window.EFRBaseParts?.normalizePart?.(part) || part
    );

    window.EFRBaseParts?.normalizeWeapon?.(
      preview
    );

    return preview;
  }

  function showWeaponDetail(index){
    const a=A();
    const item=a?.save?.stash?.[index];

    if(!item || !isWeapon(item)){
      return;
    }

    weaponDetailIndex=index;
    weaponDetailPartIndex=null;

    const modal=panel?.querySelector(
      "#efrWeaponDetailModal"
    );

    if(!modal)return;

    modal.classList.remove("hidden");
    renderWeaponDetail();
  }

  function closeWeaponDetail(){
    weaponDetailIndex=null;
    weaponDetailPartIndex=null;

    panel?.querySelector(
      "#efrWeaponDetailModal"
    )?.classList.add("hidden");
  }

  function equipWeaponPart(partIndex){
    const a=A();
    const weapon=a?.save?.stash?.[weaponDetailIndex];
    const inventory=weaponPartInventory();
    const part=inventory[partIndex];

    if(!weapon || !isCustomizableWeapon(weapon) || !part){
      return;
    }

    const ok=window.EFRWeaponStorage?.attach?.(
      weaponDetailIndex,
      part.id,
      Number(part.rarity||1)
    );

    if(ok){
      weaponDetailPartIndex=null;
      render();
      a.renderInventory?.();
      renderWeaponDetail();
    }
  }

  function removeWeaponPart(slot){
    const a=A();
    const weapon=a?.save?.stash?.[weaponDetailIndex];

    if(!weapon || !isCustomizableWeapon(weapon)){
      return;
    }

    const part=(weapon.mods||[]).find(x=>
      weaponPartDefinition(x)?.slot===slot
    );

    if(!part){
      return;
    }

    const ok=window.EFRWeaponStorage?.remove?.(
      weaponDetailIndex,
      part.id
    );

    if(ok){
      weaponDetailPartIndex=null;
      render();
      a.renderInventory?.();
      renderWeaponDetail();
    }
  }

  function renderWeaponDetail(){
    const a=A();
    const weapon=a?.save?.stash?.[weaponDetailIndex];

    const modal=panel?.querySelector(
      "#efrWeaponDetailModal"
    );

    if(!modal)return;

    if(!weapon || !isWeapon(weapon)){
      closeWeaponDetail();
      return;
    }

    const baseStats=weaponStats(weapon);
    const parts=Array.isArray(weapon.mods)
      ? weapon.mods
      : [];

    const partRows=[
      ["barrel","バレル"],
      ["stock","ストック"],
      ["grip","グリップ"],
      ["magazine","マガジン"],
      ["muzzle","マズル"]
    ];

    const available=weaponPartInventory();

    let previewHtml="";

    if(
      Number.isInteger(weaponDetailPartIndex)
    ){
      const selected=
        available[weaponDetailPartIndex];

      if(selected){
        const preview=
          partPreviewWeapon(
            weapon,
            selected
          );

        if(preview){
          previewHtml=`
            <div class="hubInfoCard">
              <strong>
                ${esc(weaponPartName(selected))}
              </strong>

              <p>
                ${esc(
                  weaponPartSlotName(
                    weaponPartDefinition(selected)?.slot
                  )
                )}に装着した場合
              </p>

              <div class="weaponDetailStats">
                ${weaponStatRows(
                  baseStats,
                  weaponStats(preview)
                )}
              </div>

              <button
                data-action="weaponPartEquip"
                data-index="${weaponDetailPartIndex}"
              >
                このパーツを装着
              </button>

              <button
                data-action="weaponPartCancelPreview"
              >
                戻る
              </button>
            </div>
          `;
        }
      }
    }

    if(!previewHtml){
      previewHtml=`
        <div class="weaponDetailParts">

          ${partRows.map(([slot,label])=>{
            const current=
              parts.find(x=>{
                const d=weaponPartDefinition(x);
                return d?.slot===slot;
              });

            const candidates=
              available
                .map((x,i)=>({part:x,index:i}))
                .filter(x=>{
                  const d=
                    weaponPartDefinition(x.part);
                  return d?.slot===slot;
                });

            return `
              <div class="weaponDetailPartSlot">
                <div>
                  <strong>${esc(label)}</strong>
                  <span>
                    ${
                      current
                        ? esc(weaponPartName(current))
                        : "未装着"
                    }
                  </span>
                </div>

                ${
                  current
                    ? `
                      <button
                        data-action="weaponPartRemove"
                        data-slot="${slot}"
                      >
                        外す
                      </button>
                    `
                    : ""
                }

                <div class="weaponPartCandidates">
                  ${
                    candidates.length
                      ? candidates.map(x=>`
                        <button
                          data-action="weaponPartPreview"
                          data-index="${x.index}"
                        >
                          ${esc(
                            weaponPartName(x.part)
                          )}
                          ${
                            Number(x.part?.rarity||1)>1
                              ? " / "+
                                esc(
                                  window.EFRBaseParts?.rarityName?.(
                                    x.part.rarity
                                  )||""
                                )
                              : ""
                          }
                        </button>
                      `).join("")
                      : `
                        <small>
                          装着可能な所持パーツなし
                        </small>
                      `
                  }
                </div>
              </div>
            `;
          }).join("")}

        </div>
      `;
    }

    modal.innerHTML=`
      <div
        class="efrWeaponDetailWindow"
        style="
          max-width:720px;
          width:calc(100% - 24px);
          max-height:90vh;
          overflow:auto;
        "
      >
        <header class="efrHubHeader">
          <div>
            <h2>${esc(itemName(weapon))}</h2>
            <p>
              ${esc(kindName(weapon))}
              /
              Lv.${Number(weapon.weaponLevel||1)}
              /
              ${esc(
                a.weaponRarityName?.(
                  weapon.rarity||1
                ) || "コモン"
              )}
            </p>
          </div>

          <button data-action="weaponDetailClose">
            閉じる
          </button>
        </header>

        <div class="hubInfoCard">
          <div class="weaponDetailStats">
            ${[
              ["攻撃力",baseStats.damage.toFixed(0)],
              ["射程",baseStats.range.toFixed(0)],
              ["射撃間隔",baseStats.cooldown.toFixed(3)],
              ["マガジン",baseStats.magSize.toFixed(0)],
              ["精度",baseStats.accuracy.toFixed(2)],
              ["拡散軽減",baseStats.spread.toFixed(2)],
              ["耐久",
                `${Number(weapon.durability||0)}/${Number(weapon.maxDurability||0)}`
              ],
              ["重量",
                `${Number(
                  a.itemWeight?.(weapon) ||
                  weapon.weight ||
                  0
                ).toFixed(1)}kg`
              ]
            ].map(([label,value])=>`
              <div class="weaponDetailStat">
                <span>${esc(label)}</span>
                <strong>${esc(value)}</strong>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="hubSection">
          <h3>アタッチメント</h3>
          ${previewHtml}
        </div>

        <div class="hubInfoCard">
          パーツを押すと、この武器へ装着した場合の性能変化を確認できます。
          同じ部位に装着済みパーツがある場合は交換され、
          外したパーツは在庫へ戻ります。
        </div>
      </div>
    `;
  }

  function ensure(){
    if(panel)return;

    panel=document.createElement("section");
    panel.id="efrHubPanel";
    panel.className="efrHubPanel hidden";

    panel.innerHTML=`
      <div class="efrHubWindow">

        <header class="efrHubHeader">
          <div>
            <h2>拠点管理</h2>
            <p id="efrHubStats"></p>
          </div>
          <button id="efrHubClose">閉じる</button>
        </header>

        <nav class="efrHubTabs">
          <button data-tab="base">概要</button>
          <button data-tab="storage">倉庫</button>
          <button data-tab="craft">クラフト</button>
          <button data-tab="research">研究所</button>
          <button data-tab="upgrade">整備・修理</button>
          <button data-tab="baseupgrade">拠点強化</button>
          <button data-tab="character">キャラクター</button>
          <button data-tab="skill">スキル</button>
          <button data-tab="pet">ペット</button>
        </nav>

        <div id="efrHubContent"></div>

        <section
          id="efrWeaponDetailModal"
          class="efrWeaponDetailModal hidden"
          aria-hidden="true"
        ></section>

      </div>
    `;

    document.body.appendChild(panel);

    tap(
      panel.querySelector("#efrHubClose"),
      close
    );

    panel
      .querySelectorAll("[data-tab]")
      .forEach(button=>{
        tap(
          button,
          ()=>{
            tab=button.dataset.tab;
            render();
          }
        );
      });

    const hubBtn=document.getElementById("hubBtn");
    if(hubBtn){
      tap(hubBtn,open);
    }

    panel.addEventListener("pointerdown",e=>{
      const itemEl=e.target.closest(".efrSlotItem");

      if(!itemEl)return;
      if(e.target.closest("button"))return;

      const index=Number(
        itemEl.dataset.gridItemIndex
      );

      const item=A()?.save?.stash?.[index];

      if(!item || !isWeapon(item)){
        return;
      }

      weaponDetailLongPress=false;

      clearTimeout(weaponDetailTimer);

      weaponDetailTimer=setTimeout(()=>{
        weaponDetailLongPress=true;
        showWeaponDetail(index);
      },550);
    });

    panel.addEventListener("pointerup",()=>{
      clearTimeout(weaponDetailTimer);
    });

    panel.addEventListener("pointercancel",()=>{
      clearTimeout(weaponDetailTimer);
    });

    panel.addEventListener("pointerleave",()=>{
      clearTimeout(weaponDetailTimer);
    });

    let lastPanelActivation=0;

    const handlePanelTapCore=e=>{
      if(weaponDetailLongPress){
        weaponDetailLongPress=false;
        return;
      }

      if(
        !e.target.closest("button:not(.efrSlotCell)")
      ){
        const itemEl=e.target.closest(".efrSlotItem");

        if(itemEl){
          const index=Number(
            itemEl.dataset.gridItemIndex
          );
          const stash=A()?.save?.stash||[];

          if(
            Number.isInteger(index) &&
            stash[index]
          ){
            storageGridSelection=index;

            panel
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

        const cell=e.target.closest(".efrSlotCell");

        if(
          cell &&
          storageGridSelection!==null
        ){
          const a=A();

          const moved=
            window.EFRGrid?.move?.(
              a.save.stash||[],
              storageCapacity(),
              storageGridSelection,
              Number(cell.dataset.gridCellX),
              Number(cell.dataset.gridCellY)
            );

          if(moved){
            a.persist?.();
            storageGridSelection=null;
            render();
            a.renderInventory?.();
          }

          return;
        }
      }

      const action=e.target.closest("[data-action]");
      if(!action)return;

      const type=action.dataset.action;
      const slot=action.dataset.slot;

      if(type==="weaponDetailClose"){
        closeWeaponDetail();
        return;
      }

      if(type==="facility"){
        upgradeFacility(action.dataset.key);
      }

      if(type==="craft"){
        X()?.craft?.(action.dataset.recipeId);
      }

      if(type==="research"){
        X()?.research?.(action.dataset.recipeId);
      }

      if(type==="useBlueprint"){
        X()?.useBlueprint?.(Number(action.dataset.index));
      }

      if(type==="weaponPartPreview"){
        weaponDetailPartIndex=
          Number(action.dataset.index);

        renderWeaponDetail();
        return;
      }

      if(type==="weaponPartCancelPreview"){
        weaponDetailPartIndex=null;
        renderWeaponDetail();
        return;
      }

      if(type==="weaponPartEquip"){
        equipWeaponPart(
          Number(action.dataset.index)
        );
        return;
      }

      if(type==="weaponPartRemove"){
        removeWeaponPart(
          action.dataset.slot
        );
        return;
      }

      if(type==="repair"){
        X()?.repair?.(slot);
      }

      if(type==="equipmentLevel"){
        if(action.dataset.kind==="armor"){
          X()?.upgradeArmorLevel?.(slot);
        }else{
          X()?.upgradeWeaponLevel?.(slot);
        }
      }

      if(type==="equipmentRarity"){
        if(action.dataset.kind==="armor"){
          X()?.upgradeArmorRarity?.(slot);
        }else if(action.dataset.kind==="backpack"){
          X()?.upgradeBackpackRarity?.(slot);
        }else{
          X()?.upgradeWeaponRarity?.(slot);
        }
      }

      if(type==="skill"){
        X()?.spendCharacterSkill?.(
          action.dataset.key
        );
      }

      if(type==="petType"){
        window.EFRPet?.setType?.(action.dataset.key);
      }

      if(type==="petSkill"){
        window.EFRPet?.spendSkill?.(action.dataset.key);
      }

      if(type==="resetSave"){
        if(
          window.confirm(
            "セーブデータを初期状態へリセットします。\\n\\n"+
            "キャラクター、倉庫、装備、拠点、研究などの進行状況は失われます。\\n"+
            "この操作は元に戻せません。\\n\\n"+
            "本当にリセットしますか？"
          )
        ){
          A()?.resetSaveData?.();
          tab="character";
        }
        return;
      }

      if(type==="removeLegacySave"){
        if(
          window.confirm(
            "現行データは残したまま、旧形式の不要データだけを削除します。\\n\\n"+
            "旧データを削除しますか？"
          )
        ){
          const removed=A()?.removeLegacySaveData?.()||0;

          A()?.logMessage?.(
            removed>0
              ? "旧データを"+removed+"件整理しました"
              : "削除対象の旧データはありません"
          );

          tab="character";
          render();
          A()?.renderInventory?.();
        }
        return;
      }

      render();
      A()?.renderInventory?.();
    };

    const handlePanelTap=e=>{
      const run=window.EFRErrorHandler?.run;

      if(run){
        return run(
          "拠点管理操作",
          ()=>handlePanelTapCore(e),
          {
            phase:"拠点管理UI",
            file:"efr_hub.js",
            screen:"拠点管理画面"
          }
        );
      }

      return handlePanelTapCore(e);
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

  function renderBase(){
    const a=A();
    const base=ensureBase();

    const counts=materials();

    return `
      <div class="hubCards">

        <div class="hubCard">
          <strong>拠点レベル</strong>
          <b>Lv.${base.level}</b>
          <small>経験値 ${base.xp||0}</small>
        </div>

        <div class="hubCard">
          <strong>脱出回数</strong>
          <b>${a.save.escapes||0}</b>
        </div>

        <div class="hubCard">
          <strong>倉庫</strong>
          <b>${
            window.EFRGrid
              ? window.EFRGrid.used(a.save.stash||[])
              : (a.save.stash||[]).reduce(
                  (n,x)=>n+(x?.slots||1),
                  0
                )
          }/${storageCapacity()}</b>
          <small>使用マス / 倉庫マス</small>
        </div>

        <div class="hubCard">
          <strong>素材種類</strong>
          <b>${Object.keys(counts).length}</b>
        </div>

      </div>

      <div class="hubSection">
        <h3>拠点施設</h3>

        <div class="facilityGrid">
          ${renderFacilities()}
        </div>
      </div>

      <div class="hubSection">
        <h3>出撃</h3>
        <p>装備・倉庫・持込品は「探索開始」からまとめて管理できます。</p>
        <button class="hubPrimary" data-open-loadout>出撃準備を開く</button>
      </div>
    `;
  }

  function renderStorage(){
    const a=A();
    const stash=a.save.stash||[];
    const capacity=storageCapacity();

    if(!window.EFRGrid){
      return `
        <div class="hubSection">
          <h3>倉庫内容</h3>
          <div class="hubStorage">
            ${stash.map((x,i)=>`
              <div class="hubItem">
                <div>
                  <strong>${esc(itemName(x))}</strong>
                  <small>
                    ${kindName(x)} / ${x?.slots||1}スロット
                  </small>
                </div>
                ${
                  x?.kind==="blueprint"
                    ? `<button data-action="useBlueprint" data-index="${i}">使用</button>`
                    : `<span>${x?.amount ? "×"+x.amount : ""}</span>`
                }
              </div>
            `).join("") || `<p>倉庫は空です。</p>`}
          </div>
        </div>
      `;
    }

    const grid=window.EFRGrid.render(
      stash,
      capacity,
      (item,index)=>{
        return `
          <div class="efrSlotItemBody">
            <strong>${esc(itemName(item))}</strong>
            <small>
              ${esc(kindName(item))} / ${item?.slots||1}マス
            </small>
            ${
              item?.amount
                ? `<b class="efrSlotAmount">×${item.amount}</b>`
                : ""
            }
            ${
              item?.kind==="blueprint"
                ? `
                  <button
                    data-action="useBlueprint"
                    data-index="${index}"
                  >
                    使用
                  </button>
                `
                : ""
            }
          </div>
        `;
      }
    );

    if(grid.changed){
      a.persist?.();
    }

    return `
      <div class="hubSection">
        <div class="efrStorageHeader">
          <div>
            <h3>倉庫</h3>
            <p>
              使用 ${grid.used} / ${capacity} マス
            </p>
          </div>
          <strong>マス式倉庫</strong>
        </div>

        ${grid.html}

        <p class="hubInfoCard">
          設計図を使用すると、その設計図に対応するレシピが研究対象として解放されます。
        </p>
      </div>
    `;
  }

function renderBaseUpgrade(){
    const b=ensureBase();

    return `
      <div class="hubSection">
        <h3>拠点強化</h3>

        <div class="hubCards">
          <div class="hubCard">
            <strong>拠点レベル</strong>
            <b>Lv.${b.level}</b>
            <small>経験値 ${b.xp||0}</small>
          </div>

          <div class="hubCard">
            <strong>倉庫容量</strong>
            <b>${storageCapacity()}</b>
            <small>最大保管スロット</small>
          </div>
        </div>
      </div>

      <div class="hubSection">
        <h3>拠点設備</h3>
        <div class="facilityGrid">
          ${renderFacilities()}
        </div>
      </div>

      <div class="hubSection hubInfoCard">
        <strong>拠点を育てる</strong>
        <p>
          探索から持ち帰った素材を使って施設を強化できます。
          拠点レベルが上がると、より高い施設レベルを解放できます。
        </p>
      </div>
    `;
  }

  function renderCharacter(){
    const a=A();
    const p=a?.player||{};
    const sp=a?.save?.player||{};

    const nextXp=
      a?.playerXpToNextLevel
        ? a.playerXpToNextLevel(sp.level||1)
        : 50+(Math.max(1,(sp.level||1))-1)*50;

    const classNames={
      melee:"近接",
      gunner:"銃士",
      rogue:"盗賊",
      mage:"魔術師",
      support:"支援"
    };

    const classId=sp.classId||"melee";

    return `
      <div class="hubSection">
        <h3>キャラクター</h3>

        <div class="hubCards">
          <div class="hubCard">
            <strong>レベル</strong>
            <b>Lv.${sp.level||1}</b>
            <small>XP ${sp.xp||0} / ${nextXp}</small>
          </div>

          <div class="hubCard">
            <strong>スキルポイント</strong>
            <b>${sp.skillPoints||0}</b>
            <small>レベルアップで +1</small>
          </div>

          <div class="hubCard">
            <strong>クラス</strong>
            <b>${esc(classNames[classId]||classId)}</b>
            <small>現在のクラス</small>
          </div>

          <div class="hubCard">
            <strong>HP</strong>
            <b>${p.hp??100}/${p.maxHp??100}</b>
            <small>現在 / 最大</small>
          </div>

          <div class="hubCard">
            <strong>MP</strong>
            <b>${p.mp??100}/${p.maxMP??100}</b>
            <small>現在 / 最大</small>
          </div>
        </div>
      </div>

      <div class="hubSection efrSaveManagement">
        <h3>セーブ管理</h3>

        <div class="efrSaveManagementCard">
          <strong>データを管理</strong>
          <p>
            通常のプレイデータは自動保存されます。
            セーブを消したい場合だけリセットを使用してください。
            旧データの削除は、現在のゲームデータを残したまま、
            現行仕様へ移行済みの不要な旧形式だけを整理します。
          </p>

          <div class="efrSaveManagementActions">
            <button
              type="button"
              data-action="resetSave"
              class="efrDangerButton"
            >
              セーブをリセット
            </button>

            <button
              type="button"
              data-action="removeLegacySave"
              class="efrLegacyButton"
            >
              旧データを削除
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function renderSkill(){
    const a=A();
    const sp=a?.save?.player||{};
    const skills=a?.getCharacterSkills?.()||{};

    const names={
      meleePower:"近接威力",
      gunPower:"銃器威力",
      exploration:"携行術",
      magic:"魔力容量",
      survival:"生存力"
    };

    const descriptions={
      meleePower:"近接武器のダメージ +6% / Lv",
      gunPower:"銃器のダメージ +5% / Lv",
      exploration:"バッグ容量 +1 / Lv",
      magic:"最大MP +10 / Lv",
      survival:"最大HP +5 / Lv"
    };

    return `
      <div class="hubSection">
        <h3>スキル</h3>

        <div class="hubCards">
          <div class="hubCard">
            <strong>スキルポイント</strong>
            <b>${sp.skillPoints||0}</b>
            <small>レベルアップで獲得</small>
          </div>

          <div class="hubCard">
            <strong>キャラクターレベル</strong>
            <b>Lv.${sp.level||1}</b>
            <small>レベルは主に成長ポイントを生みます</small>
          </div>
        </div>
      </div>

      <div class="hubSection">
        <h3>成長スキル</h3>

        <div class="hubSkillGrid">
          ${Object.entries(skills).map(([key,skill])=>{
            const lv=
              a?.getCharacterSkillLevel?.(key) ||
              sp.skills?.[key] ||
              0;

            const max=skill.max||3;

            return `
              <div class="hubSkillCard">
                <strong>${esc(names[key]||skill.name)}</strong>
                <b>Lv.${lv} / ${max}</b>
                <small>${esc(
                  descriptions[key]||
                  skill.description||
                  ""
                )}</small>

                <button
                  data-action="skill"
                  data-key="${esc(key)}"
                  ${lv>=max || (sp.skillPoints||0)<=0 ? "disabled":""}>
                  ${lv>=max?"最大":"取得"}
                </button>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div class="hubSection hubInfoCard">
        <strong>成長方針</strong>
        <p>
          キャラクターレベル自体では大きな数値インフレを起こさず、
          レベルアップで得たスキルポイントを使って能力を伸ばします。
          クラスは基礎的なプレイスタイル、スキルはプレイヤー自身の育成方針を担当します。
        </p>
      </div>
    `;
  }

  function renderPet(){
    const petApi=window.EFRPet;
    const a=A();
    const sp=a?.save?.player||{};
    const pet=petApi?.getState?.();

    if(sp.classId!=="trainer"){
      return `
        <div class="hubSection hubInfoCard">
          <strong>ペットシステム</strong>
          <p>
            ペットは「調教師」クラス専用です。
            クラスを調教師に変更するとペットを選択・育成できるようになります。
            代わりに武器2枠をペット枠として使用します。
          </p>
        </div>
      `;
    }

    if(!pet){
      return `<div class="hubSection"><p>ペットデータを初期化しています。</p></div>`;
    }

    const typeEntries=Object.entries(petApi.PET_TYPES||{});

    return `
      <div class="hubSection">
        <h3>ペット</h3>

        <div class="hubCards">
          <div class="hubCard">
            <strong>種類</strong>
            <b>${esc(pet.typeData?.name||pet.type)}</b>
            <small>${esc(pet.typeData?.desc||"")}</small>
          </div>

          <div class="hubCard">
            <strong>レベル</strong>
            <b>Lv.${pet.level}</b>
            <small>XP ${pet.xp} / ${pet.xpNext}</small>
          </div>

          <div class="hubCard">
            <strong>スキルポイント</strong>
            <b>${pet.skillPoints}</b>
            <small>ペットLvアップで獲得</small>
          </div>

          <div class="hubCard">
            <strong>出撃制約</strong>
            <b>武器2 → ペット</b>
            <small>調教師は武器2を使用できません</small>
          </div>
        </div>
      </div>

      <div class="hubSection">
        <h3>ペット選択</h3>

        <div class="efrPetGrid">
          ${typeEntries.map(([key,type])=>`
            <div class="efrPetCard ${key===pet.type?"active":""}">
              <strong>${esc(type.name)}</strong>
              <small>${esc(type.desc)}</small>
              <button
                data-action="petType"
                data-key="${esc(key)}"
                ${key===pet.type?"disabled":""}>
                ${key===pet.type?"現在のペット":"このペットにする"}
              </button>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="hubSection">
        <h3>ペットスキル</h3>

        <div class="efrPetSkillGrid">
          ${Object.entries(petApi.PET_SKILLS||{}).map(([key,skill])=>{
            const lv=petApi.skillLevel(key);

            return `
              <div class="efrPetSkill">
                <strong>${esc(skill.name)}</strong>
                <b>Lv.${lv} / ${skill.max}</b>
                <small>${esc(skill.desc)}</small>

                <button
                  data-action="petSkill"
                  data-key="${esc(key)}"
                  ${lv>=skill.max || pet.skillPoints<=0?"disabled":""}>
                  ${lv>=skill.max?"最大":"取得"}
                </button>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div class="hubSection hubInfoCard">
        <strong>調教師の考え方</strong>
        <p>
          ペットは全クラス共通の便利機能ではありません。
          調教師を選び、武器2枠をペットに使う代わりに、
          ペットを育てて戦闘・索敵・支援へ特化させます。
        </p>
      </div>
    `;
  }

  function renderCraft(){
    const x=X();
    const a=A();
    const recipes=x?.recipes || [];

    const available=(name)=>{
      let total=0;

      for(const item of a?.save?.stash||[]){
        if(typeof item==="string"){
          if(item===name)total++;
        }else if(item?.name===name){
          total+=Number(item.amount)||1;
        }
      }

      return total;
    };

    return `
      <div class="hubSection">
        <h3>クラフト</h3>

        <div class="hubRecipeGrid">
          ${recipes.map(r=>{
            const id=String(r?.id||"");
            const name=String(r?.name||"");
            const cost=r?.cost||{};
            const facility=String(r?.facility||"workbench");
            const level=Number(r?.level||1);
            const facilityDef=facilities()[facility];

            const facilityLevel=
              Number(
                a?.save?.base?.facilities?.[facility]||1
              );

            const materialsOk=
              Object.entries(cost)
                .every(([n,c])=>available(n)>=c);

            const facilityOk=
              facilityLevel>=level;

            const researched=
              Boolean(x?.isResearched?.(r));

            const researchRequired=r?.researchable!==false;
            const researchOk=!researchRequired||researched;
            const canCraft=
              Boolean(id)&&researchOk&&materialsOk&&facilityOk;

            const status=
              !id
                ? "レシピID不正"
                : !researchOk
                  ? "未研究"
                  : !facilityOk
                    ? (facilityDef?.name||facility)+" Lv."+level+"が必要"
                    : !materialsOk
                      ? "素材不足"
                      : "製作可能";

            return `
              <div class="hubRecipe">
                <strong>${esc(name)}</strong>

                <small>
                  設備：
                  ${esc(facilityDef?.name||facility)}
                  Lv.${level}
                </small>

                <small>
                  ${Object.entries(cost)
                    .map(([n,c])=>`${esc(n)} ×${c}（所持 ${available(n)}）`)
                    .join(" / ")}
                </small>

                <button
                  data-action="craft"
                  data-recipe-id="${esc(id)}"
                  ${canCraft?"":"disabled"}>
                  ${status}
                </button>
              </div>`;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderResearch(){
    const a=A();
    const x=X();
    const recipes=x?.recipes||[];

    return `
      <div class="hubSection">
        <h3>研究所</h3>
        <p>マップで拾った設計図を倉庫で使用すると、そのレシピが研究対象として解放されます。解放後はここで研究し、研究済みのレシピだけをクラフトできます。</p>
        <div class="hubRecipeGrid">
          ${recipes.filter(r=>r?.researchable!==false && x?.isResearchAvailable?.(r)).map(r=>{
            const id=String(r?.id||"");
            const cost=r?.cost||{};
            const done=Boolean(x?.isResearched?.(r));
            const level=Number(r?.level||1);
            const researchFacilityLevel=
              Number(a?.save?.base?.facilities?.research||1);
            const craftingFacilityLevel=
              Number(a?.save?.base?.facilities?.[r?.facility]||1);
            const researchFacilityOk=researchFacilityLevel>=level;
            const craftingFacilityOk=craftingFacilityLevel>=level;
            const materialsOk=Object.entries(cost)
              .every(([n,c])=>materialCount(n)>=c);

            const canResearch=
              Boolean(id)&&!done&&researchFacilityOk&&craftingFacilityOk&&materialsOk;

            const status=
              !id
                ? "レシピID不正"
                : done
                  ? "研究済み"
                  : !researchFacilityOk
                    ? "研究所 Lv."+level+"が必要"
                    : !craftingFacilityOk
                      ? (facilities()[r?.facility]?.name||r?.facility)+" Lv."+level+"が必要"
                      : !materialsOk
                        ? "研究素材不足"
                        : "研究する";

            return `
              <div class="hubRecipe">
                <strong>${esc(r?.name||"")}</strong>
                <small>研究所 Lv.${level} / ${esc(facilities()[r?.facility]?.name||r?.facility)} Lv.${level}</small>
                <small>${Object.entries(cost)
                  .map(([n,c])=>`${esc(n)} ×${c}（所持 ${materialCount(n)}）`)
                  .join(" / ") || "研究素材なし"}</small>
                <button
                  data-action="research"
                  data-recipe-id="${esc(id)}"
                  ${canResearch?"":"disabled"}>
                  ${status}
                </button>
              </div>`;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderUpgrade(){
    const a=A();
    const eq=a.save.equipment || {};

    const slots=[
      ["weapon1","武器1"],
      ["weapon2","武器2"],
      ["head","頭"],
      ["chest","胴"],
      ["legs","足"],
      ["backpack","バッグ"]
    ];

    return `
      <div class="hubSection">
        <h3>整備台・修理・装備改造</h3>

        <div class="hubUpgradeGrid">
          ${slots.map(([slot,label])=>{
            const x=eq[slot];

            if(!x){
              return `
                <div class="hubUpgrade">
                  <strong>${label}</strong>
                  <span>装備なし</span>
                </div>
              `;
            }

            const durability=
              x.maxDurability
                ? `${x.durability??x.maxDurability}/${x.maxDurability}`
                : "耐久値なし";

            const needsRepair=
              x.maxDurability &&
              Number(x.durability??x.maxDurability)
                < Number(x.maxDurability);

            const isWeapon=
              x.kind==="weapon" ||
              x.kind==="firearm";

            const isArmor=
              x.kind==="armor";

            const isBackpack=
              x.kind==="backpack";

            const isProgressionTarget=
              isWeapon || isArmor || isBackpack;

            const hasLevel=
              isWeapon || isArmor;

            const level=
              isArmor
                ? Number(x.armorLevel||1)
                : Number(x.weaponLevel||1);

            const rarity=
              isProgressionTarget
                ? Number(x.rarity||1)
                : 1;

            const rarityName=
              isArmor
                ? (a.armorRarityName?.(rarity)||"コモン")
                : isBackpack
                  ? (a.backpackRarityName?.(rarity)||"コモン")
                  : (a.weaponRarityName?.(rarity)||"コモン");

            const levelMax=10;
            const rarityMax=5;

            const levelCost=
              hasLevel && level<levelMax
                ? (
                    isArmor
                      ? `高品質金属 ×${a.armorLevelCost?.(level+1)?.["高品質金属"]||0} / 接着剤 ×${a.armorLevelCost?.(level+1)?.["接着剤"]||0}`
                      : `高品質金属 ×${a.weaponLevelCost?.(level+1)?.["高品質金属"]||0} / 接着剤 ×${a.weaponLevelCost?.(level+1)?.["接着剤"]||0}`
                  )
                : hasLevel
                  ? "Lv.最大"
                  : "";

            const rarityCost=
              isProgressionTarget && rarity<rarityMax
                ? (
                    isArmor
                      ? `高品質金属 ×${a.armorRarityCost?.(rarity+1)?.["高品質金属"]||0} / 接着剤 ×${a.armorRarityCost?.(rarity+1)?.["接着剤"]||0} / 電子部品 ×${a.armorRarityCost?.(rarity+1)?.["電子部品"]||0}`
                      : isBackpack
                        ? `高品質金属 ×${a.backpackRarityCost?.(rarity+1)?.["高品質金属"]||0} / 接着剤 ×${a.backpackRarityCost?.(rarity+1)?.["接着剤"]||0} / 電子部品 ×${a.backpackRarityCost?.(rarity+1)?.["電子部品"]||0}`
                        : `高品質金属 ×${a.weaponRarityCost?.(rarity+1)?.["高品質金属"]||0} / 接着剤 ×${a.weaponRarityCost?.(rarity+1)?.["接着剤"]||0} / 電子部品 ×${a.weaponRarityCost?.(rarity+1)?.["電子部品"]||0}`
                  )
                : "レア度最大";

            return `
              <div class="hubUpgrade">
                <strong>${label}</strong>
                <span>${esc(itemName(x))}</span>

                ${
                  isProgressionTarget
                    ? `
                      <small>
                        ${
                          hasLevel
                            ? `Lv.${level}/10 / `
                            : ""
                        }${esc(rarityName)}
                        ${
                          isBackpack
                            ? ` / 容量${esc(a.equippedBackpack?.(x)?.capacity||x.capacity||0)}`
                            : ""
                        }
                      </small>
                    `
                    : ""
                }

                <small>${durability}</small>

                ${
                  !isBackpack
                    ? `
                      <button
                        data-action="repair"
                        data-slot="${slot}"
                        ${needsRepair?"":"disabled"}>
                        ${needsRepair?"修理":"修理不要"}
                      </button>
                    `
                    : ""
                }

                ${
                  isProgressionTarget
                    ? `
                      ${
                        hasLevel
                          ? `
                            <button
                              data-action="equipmentLevel"
                              data-kind="${isArmor?"armor":"weapon"}"
                              data-slot="${slot}"
                              ${level<levelMax?"":"disabled"}>
                              ${level<levelMax?"Lv."+(level+1)+"へ":"Lv.10"}
                            </button>

                            <small>
                              ${esc(levelCost)}
                            </small>
                          `
                          : ""
                      }

                      <button
                        data-action="equipmentRarity"
                        data-kind="${isBackpack?"backpack":isArmor?"armor":"weapon"}"
                        data-slot="${slot}"
                        ${rarity<rarityMax?"":"disabled"}>
                        ${rarity<rarityMax?"レア度"+(rarity+1)+"へ":"レア度5"}
                      </button>

                      <small>
                        ${esc(rarityCost)}
                      </small>
                    `
                    : `
                      <small>この装備はLv/レア度改造の対象外です</small>
                    `
                }
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function render(){
    ensure();

    const a=A();
    if(!a)return;

    if(!a.save.base){
      a.save.base={level:1,xp:0};
      a.persist();
    }

    document.getElementById("efrHubStats").textContent=
      `脱出 ${a.save.escapes||0}回 / 拠点Lv.${ensureBase().level} / 倉庫 ${(a.save.stash||[]).length}/${storageCapacity()}`;

    panel.querySelectorAll("[data-tab]").forEach(b=>{
      b.classList.toggle("active",b.dataset.tab===tab);
    });

    const content=document.getElementById("efrHubContent");

    if(tab==="base")content.innerHTML=renderBase();
    if(tab==="storage")content.innerHTML=renderStorage();
    if(tab==="craft")content.innerHTML=renderCraft();
    if(tab==="research")content.innerHTML=renderResearch();
    if(tab==="upgrade")content.innerHTML=renderUpgrade();
    if(tab==="baseupgrade")content.innerHTML=renderBaseUpgrade();
    if(tab==="character")content.innerHTML=renderCharacter();
    if(tab==="skill")content.innerHTML=renderSkill();
    if(tab==="pet")content.innerHTML=renderPet();

    const loadout=content.querySelector("[data-open-loadout]");
    if(loadout){
      tap(
        loadout,
        ()=>{
          close();
          window.EFRLoadout?.open();
        }
      );
    }
  }

  function open(){
    ensure();
    tab="base";
    render();
    panel.classList.remove("hidden");
  }

  function close(){
    panel?.classList.add("hidden");
  }

  ensure();

  window.EFRHub={
    open,
    close,
    render,
    storageCapacity
  };

})();
