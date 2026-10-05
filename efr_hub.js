(function(){
  "use strict";

  const A=()=>window.EFRGame;
  const X=()=>window.EFRContentExpansion;

  let panel=null;
  let tab="base";
  let storageGridSelection=null;
    let weaponDetailSource=null;
  let weaponDetailPartIndex=null;
  let weaponDetailTimer=null;
  let weaponDetailLongPress=false;

  let petDetailTimer=null;
  let petDetailLongPress=false;
  let petDetailId=null;
  let petDetailMode="detail";
  let petSkillDetailIndex=null;

  let facilityUpgradeKey=null;


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

  function facilityLevel(key){
    return Number(
      window.EFRBaseCore?.facilityLevel?.(key) || 1
    );
  }

  function facilityTab(key){
    return {
      storage:"storage",
      workbench:"craft",
      workshop:"craft",
      maintenance:"upgrade",
      medical:"craft",
      research:"research"
    }[key] || null;
  }

  function facilityUpgradeState(key){
    const b=ensureBase();
    const f=facilities()[key];

    if(!b || !f)return null;

    const lv=facilityLevel(key);
    const max=lv>=Number(f.max||0);
    const locked=b.level<Number(f.unlock||1);
    const cost=max ? 0 : Number(
      window.EFRBaseCore?.facilityCost?.(key) || 0
    );
    const high=materialCount("高品質金属");
    const scrap=materialCount("鉄くず");
    const canUpgrade=
      !max &&
      !locked &&
      high+scrap>=cost;

    return {
      key,
      facility:f,
      level:lv,
      targetLevel:lv+1,
      max,
      locked,
      cost,
      high,
      scrap,
      canUpgrade
    };
  }

  function facilityUpgradeChanges(key,state){
    const f=state?.facility;
    if(!f || !state)return [];

    if(key==="storage"){
      const baseLevel=Number(ensureBase()?.level||1);
      const before=
        24+
        Math.max(0,baseLevel-1)*4+
        Math.max(0,state.level-1)*10;
      const after=
        24+
        Math.max(0,baseLevel-1)*4+
        Math.max(0,state.targetLevel-1)*10;

      return [["容量",before+"マス",after+"マス"]];
    }

    const recipes=
      Array.isArray(window.EFRContentExpansion?.EXTRA_RECIPES)
        ? window.EFRContentExpansion.EXTRA_RECIPES
        : [];

    const unlocked=recipes
      .filter(recipe=>
        recipe &&
        recipe.facility===key &&
        Number(recipe.level||1)===state.targetLevel
      )
      .map(recipe=>recipe.name)
      .filter(Boolean);

    if(unlocked.length){
      return [["新たに対象になる内容",unlocked.join(" / "),""]];
    }

    const labels={
      workbench:"クラフト設備Lv.",
      workshop:"製作設備Lv.",
      maintenance:"修理設備Lv.",
      medical:"医療設備Lv.",
      research:"研究所Lv."
    };

    return [[
      "施設レベル",
      "Lv."+state.level,
      "Lv."+state.targetLevel
    ],[
      "変化",
      labels[key] || f.name,
      "Lv."+state.targetLevel
    ]];
  }

  function openFacilityUpgrade(key){
    const state=facilityUpgradeState(key);
    if(!state)return;

    facilityUpgradeKey=key;
    const modal=document.getElementById("efrFacilityUpgradeModal");
    if(!modal)return;

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden","false");
    renderFacilityUpgradeModal();
  }

  function closeFacilityUpgrade(){
    const modal=document.getElementById("efrFacilityUpgradeModal");
    facilityUpgradeKey=null;

    if(!modal)return;

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden","true");
  }

  function renderFacilityUpgradeModal(){
    const modal=document.getElementById("efrFacilityUpgradeModal");
    const state=facilityUpgradeState(facilityUpgradeKey);

    if(!modal || !state){
      closeFacilityUpgrade();
      return;
    }

    const changes=facilityUpgradeChanges(
      facilityUpgradeKey,
      state
    );

    const changeHtml=changes.map(row=>{
      const label=row[0];
      const before=row[1];
      const after=row[2];

      return `
        <div class="efrFacilityUpgradeRow">
          <span>${esc(label)}</span>
          <strong>
            ${esc(before)}
            ${after ? `→ ${esc(after)}` : ""}
          </strong>
        </div>
      `;
    }).join("");

    const enough=state.canUpgrade;
    const reason=
      state.max
        ? "最大レベルです。"
        : state.locked
          ? "拠点Lv."+state.facility.unlock+"で解放されます。"
          : !enough
            ? "必要な素材が不足しています。"
            : "強化できます。";

    modal.innerHTML=`
      <div
        class="efrFacilityUpgradeWindow"
        role="dialog"
        aria-modal="true"
        aria-label="${esc(state.facility.name)}の強化"
      >
        <header class="efrFacilityUpgradeHeader">
          <div>
            <span>FACILITY UPGRADE</span>
            <h3>${esc(state.facility.name)}</h3>
          </div>
          <button
            type="button"
            data-action="facilityUpgradeModalClose"
          >閉じる</button>
        </header>

        <div class="efrFacilityUpgradeLevel">
          <span>レベル</span>
          <strong>
            Lv.${state.level}
            ${state.max ? "" : ` → Lv.${state.targetLevel}`}
          </strong>
        </div>

        <section class="efrFacilityUpgradeSection">
          <h4>変化する要素</h4>
          <div class="efrFacilityUpgradeChanges">
            ${changeHtml}
          </div>
        </section>

        <section class="efrFacilityUpgradeSection">
          <h4>強化コスト</h4>
          <div class="efrFacilityUpgradeMaterials">
            <div>
              <span>高品質金属 所持</span>
              <strong>${state.high}</strong>
            </div>
            <div>
              <span>鉄くず 所持</span>
              <strong>${state.scrap}</strong>
            </div>
            <p>必要数：${state.cost}</p>
          </div>
        </section>

        <p class="efrFacilityUpgradeStatus">${esc(reason)}</p>

        <footer class="efrFacilityUpgradeFooter">
          <button
            type="button"
            data-action="facilityUpgradeModalClose"
          >閉じる</button>
          <button
            type="button"
            class="efrFacilityUpgradeConfirm"
            data-action="facilityUpgradeConfirm"
            ${enough ? "" : "disabled"}
          >OK</button>
        </footer>
      </div>
    `;
  }

  function renderFacilities(){
    const cards=Object.entries(facilities())
      .map(([key,f])=>{
        const state=facilityUpgradeState(key);
        const lv=state?.level||1;
        const locked=Boolean(state?.locked);
        const max=Boolean(state?.max);
        const canUpgrade=Boolean(state?.canUpgrade);
        const targetTab=facilityTab(key);

        return `
          <article
            class="hubFacilityCard"
            data-action="${targetTab ? "facilityOpen" : "facility"}"
            data-key="${key}"
          >
            <div class="hubFacilityMain">
              <strong>${esc(f.name)}</strong>
              <b>Lv.${lv}</b>
            </div>

            <span>${esc(f.desc)}</span>

            <small>${
              max
                ? "最大レベル"
                : locked
                  ? "拠点Lv."+f.unlock+"で解放"
                  : ""
            }</small>

            <div class="hubFacilityActions">
              ${
                targetTab
                  ? `<button
                      type="button"
                      data-action="facilityOpen"
                      data-key="${key}"
                    >開く</button>`
                  : ""
              }

              <button
                type="button"
                class="${canUpgrade ? "efrFacilityUpgradeReady" : ""}"
                data-action="facilityUpgrade"
                data-key="${key}"
                ${max||locked?"disabled":""}
              >
                強化
              </button>
            </div>
          </article>`;
      })
      .join("");

    return cards+`
      <article class="hubFacilityCard hubFacilityTraining">
        <div class="hubFacilityMain">
          <strong>訓練場</strong>
          <b>実戦訓練</b>
        </div>
        <span>近接・銃器・弓・魔法を実際に試せます。</span>
        <small>武器耐久・弾薬・MPを消費せず、XP・戦利品も発生しません。</small>
        <div class="hubFacilityActions">
          <button
            type="button"
            data-action="training"
          >訓練場を開く</button>
        </div>
      </article>`;
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
      return false;
    }

    return openWeaponDetail(
      item,
      {
        type:"stash",
        index
      }
    );
  }

  function openWeaponDetail(item,source){
    ensure();

    if(!item || !isWeapon(item)){
      return false;
    }

    weaponDetailSource={
      ...(source||{}),
      item
    };

    weaponDetailPartIndex=null;

    const modal=
      document.getElementById(
        "efrWeaponDetailModal"
      );

    if(!modal){
      return false;
    }

    if(modal.parentElement!==document.body){
      document.body.appendChild(modal);
    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden","false");

    renderWeaponDetail();

    return true;
  }

  function closeWeaponDetail(){
    weaponDetailSource=null;
    weaponDetailPartIndex=null;

    const modal=
      document.getElementById(
        "efrWeaponDetailModal"
      );

    if(modal){
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden","true");
    }
  }

  function weaponDetailWeapon(){
    return weaponDetailSource?.item || null;
  }

  function weaponDetailAttach(part){
    const source=weaponDetailSource;

    if(!source){
      return false;
    }

    if(source.type==="stash"){
      return Boolean(
        window.EFRWeaponStorage?.attach?.(
          source.index,
          part.id,
          Number(part.rarity||1)
        )
      );
    }

    if(source.type==="equipment"){
      return Boolean(
        window.EFRWeaponStorage?.attachEquipment?.(
          source.slot,
          part.id,
          Number(part.rarity||1)
        )
      );
    }

    if(source.type==="loot"){
      return Boolean(
        window.EFRWeaponStorage?.attachLoot?.(
          source.index,
          part.id,
          Number(part.rarity||1)
        )
      );
    }

    return false;
  }

  function weaponDetailRemove(part){
    const source=weaponDetailSource;

    if(!source){
      return false;
    }

    if(source.type==="stash"){
      return Boolean(
        window.EFRWeaponStorage?.remove?.(
          source.index,
          part.id
        )
      );
    }

    if(source.type==="equipment"){
      return Boolean(
        window.EFRWeaponStorage?.removeEquipment?.(
          source.slot,
          part.id
        )
      );
    }

    if(source.type==="loot"){
      return Boolean(
        window.EFRWeaponStorage?.removeLoot?.(
          source.index,
          part.id
        )
      );
    }

    return false;
  }

  function equipWeaponPart(partIndex){
    const a=A();
    const weapon=weaponDetailWeapon();
    const inventory=weaponPartInventory();
    const part=inventory[partIndex];

    if(
      !weapon ||
      !isCustomizableWeapon(weapon) ||
      !part
    ){
      return;
    }

    if(weaponDetailAttach(part)){
      weaponDetailPartIndex=null;
      a.renderInventory?.();
      window.EFRLoadout?.render?.();
      render();
      renderWeaponDetail();
    }
  }

  function removeWeaponPart(slot){
    const a=A();
    const weapon=weaponDetailWeapon();

    if(
      !weapon ||
      !isCustomizableWeapon(weapon)
    ){
      return;
    }

    const part=(weapon.mods||[]).find(x=>
      weaponPartDefinition(x)?.slot===slot
    );

    if(!part){
      return;
    }

    if(weaponDetailRemove(part)){
      weaponDetailPartIndex=null;
      a.renderInventory?.();
      window.EFRLoadout?.render?.();
      render();
      renderWeaponDetail();
    }
  }

  function renderWeaponDetail(){
    const a=A();
    const weapon=weaponDetailWeapon();

    const modal=
      document.getElementById(
        "efrWeaponDetailModal"
      );

    if(!modal){
      return;
    }

    if(!weapon || !isWeapon(weapon)){
      closeWeaponDetail();
      return;
    }

    const baseStats=weaponStats(weapon);
    const customizable=isCustomizableWeapon(weapon);
    const staff=Boolean(weapon.magicStaff);

    let bodyHtml="";

    if(customizable){
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

      if(Number.isInteger(weaponDetailPartIndex)){
        const selected=
          available[weaponDetailPartIndex];

        if(selected){
          const preview=
            partPreviewWeapon(
              weapon,
              selected
            );

          if(preview){
            bodyHtml=`
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

      if(!bodyHtml){
        bodyHtml=`
          <div class="weaponDetailParts">
            ${partRows.map(([slot,label])=>{
              const current=
                parts.find(x=>
                  weaponPartDefinition(x)?.slot===slot
                );

              const candidates=
                available
                  .map((x,i)=>({
                    part:x,
                    index:i
                  }))
                  .filter(x=>
                    weaponPartDefinition(
                      x.part
                    )?.slot===slot
                  );

              return `
                <div class="weaponDetailPartSlot">
                  <div>
                    <strong>${esc(label)}</strong>
                    <span>
                      ${
                        current
                          ? esc(
                              weaponPartName(current)
                            )
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
    }else if(staff){
      bodyHtml=`
        <div class="hubInfoCard">
          <strong>魔法構築</strong>
          <p>
            この杖の魔法と挙動パーツを編集できます。
          </p>
          <button
            data-action="weaponStaffEdit"
          >
            魔法を編集
          </button>
        </div>
      `;
    }else{
      bodyHtml=`
        <div class="hubInfoCard">
          <strong>武器状態</strong>
          <p>
            この武器は現在の状態を確認できます。
            専用の追加編集項目はありません。
          </p>
        </div>
      `;
    }

    const stats=[
      ["攻撃力",baseStats.damage.toFixed(0)],
      ["射程",baseStats.range.toFixed(0)],
      ["射撃間隔",baseStats.cooldown.toFixed(3)],
      ["マガジン",baseStats.magSize.toFixed(0)],
      ["精度",baseStats.accuracy.toFixed(2)],
      ["拡散軽減",baseStats.spread.toFixed(2)],
      [
        "耐久",
        `${Number(weapon.durability||0)}/${Number(weapon.maxDurability||0)}`
      ],
      [
        "重量",
        `${Number(
          a.itemWeight?.(weapon) ||
          weapon.weight ||
          0
        ).toFixed(1)}kg`
      ]
    ];

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
            ${stats.map(([label,value])=>`
              <div class="weaponDetailStat">
                <span>${esc(label)}</span>
                <strong>${esc(value)}</strong>
              </div>
            `).join("")}
          </div>
        </div>

        <div class="hubSection">
          <h3>
            ${
              customizable
                ? "アタッチメント"
                : staff
                  ? "魔法"
                  : "武器状態"
            }
          </h3>
          ${bodyHtml}
        </div>

        ${
          customizable
            ? `
              <div class="hubInfoCard">
                パーツを選択すると装着前後の性能を比較できます。
              </div>
            `
            : ""
        }
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
          <button data-tab="storage">倉庫</button>
          <button data-tab="craft">クラフト</button>
          <button data-tab="upgrade">整備・修理</button>
          <button data-tab="wishlist">欲しいもの</button>
          <button data-tab="character">キャラクター</button>
          <button data-tab="skill">スキル</button>
          <button data-tab="pet">ペット</button>
          <button data-tab="garden">🌿 庭</button>
        </nav>

        <div id="efrHubContent"></div>

        <section
          id="efrWeaponDetailModal"
          class="efrWeaponDetailModal hidden"
          aria-hidden="true"
        ></section>

        <section
          id="efrFacilityUpgradeModal"
          class="efrFacilityUpgradeModal hidden"
          aria-hidden="true"
        ></section>

      </div>

      <section
        id="efrPetDetailModal"
        class="efrPetDetailModal hidden"
        aria-hidden="true"
      ></section>
    `;

    document.body.appendChild(panel);

    const petDetailModal=
      panel.querySelector("#efrPetDetailModal");

    if(petDetailModal){
      petDetailModal.addEventListener(
        "click",
        event=>{
          const action=
            event.target?.closest?.("[data-action]");

          if(
            action &&
            petDetailModal.contains(action) &&
            handlePetDetailAction(action)
          ){
            event.preventDefault();
            event.stopPropagation();
            return;
          }

          if(event.target===petDetailModal){
            closePetDetail();
          }
        }
      );
    }

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
      const petCard=
        e.target.closest(
          ".efrPetCageCard[data-pet-id]"
        );

      if(
        petCard &&
        !e.target.closest("button")
      ){
        petDetailLongPress=false;

        clearTimeout(petDetailTimer);

        petDetailTimer=setTimeout(()=>{
          petDetailLongPress=true;
          openPetDetail(
            petCard.dataset.petId
          );
        },550);

        return;
      }

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
      clearTimeout(petDetailTimer);
    });

    panel.addEventListener("pointercancel",()=>{
      clearTimeout(weaponDetailTimer);
      clearTimeout(petDetailTimer);
    });

    panel.addEventListener("pointerleave",()=>{
      clearTimeout(weaponDetailTimer);
      clearTimeout(petDetailTimer);
    });

    let lastPanelActivation=0;

    const handlePanelTapCore=e=>{
      if(weaponDetailLongPress){
        weaponDetailLongPress=false;
        return;
      }

      if(petDetailLongPress){
        petDetailLongPress=false;
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

      if(handlePetDetailAction(action)){
        return;
      }

      if(type==="weaponStaffEdit"){
        const staff=weaponDetailWeapon();

        if(staff?.magicStaff){
          closeWeaponDetail();
          window.EFRMagic?.openStaffEditor?.(staff);
        }

        return;
      }

      if(type==="facilityOpen"){
        const targetTab=facilityTab(action.dataset.key);

        if(targetTab){
          tab=targetTab;
          render();
        }

        return;
      }

      if(type==="openTab"){
        const targetTab=action.dataset.tab;

        if(targetTab){
          tab=targetTab;
          render();
        }

        return;
      }

      if(type==="facilityUpgrade"){
        openFacilityUpgrade(action.dataset.key);
        return;
      }

      if(type==="facilityUpgradeModalClose"){
        closeFacilityUpgrade();
        return;
      }

      if(type==="facilityUpgradeConfirm"){
        if(facilityUpgradeKey){
          const key=facilityUpgradeKey;
          const upgraded=upgradeFacility(key);

          if(upgraded){
            closeFacilityUpgrade();
            render();
          }else{
            renderFacilityUpgradeModal();
          }
        }
        return;
      }

      if(type==="training"){
        window.EFRTraining?.open?.();
      }

      if(type==="wishlistRecipe"){
        toggleWishlistRecipe(action.dataset.recipeId);
        return;
      }

      if(type==="wishlistUpgrade"){
        const row=action.closest(".efrWishlistTargetRow");
        const select=row?.querySelector("select");

        if(select){
          setWishlistUpgrade(
            action.dataset.slot,
            action.dataset.mode,
            Number(select.value||0)
          );
        }

        return;
      }

      if(type==="wishlistRemove"){
        removeWishlist(Number(action.dataset.index));
        return;
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

      if(type==="weaponPartRarity"){
        X()?.upgradeWeaponPartRarity?.(
          Number(action.dataset.index)
        );
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

      if(type==="gardenSelect"){
        window.EFRGarden?.select?.(
          action.dataset.gardenType
        );
        return;
      }

      if(type==="gardenPlace"){
        window.EFRGarden?.place?.(
          action.dataset.gardenType ||
            window.EFRGarden?.selectedType,
          Number(action.dataset.gardenX),
          Number(action.dataset.gardenY)
        );
        return;
      }

      if(type==="gardenRemove"){
        window.EFRGarden?.remove?.(
          Number(action.dataset.gardenX),
          Number(action.dataset.gardenY)
        );
        return;
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
    const equipment=a.save.equipment||{};

    const slots=[
      ["weapon1","武器1"],
      ["weapon2","武器2"],
      ["head","頭"],
      ["chest","胸"],
      ["legs","足"],
      ["backpack","バックパック"]
    ];

    const stashUsed=window.EFRGrid
      ? window.EFRGrid.used(a.save.stash||[])
      : (a.save.stash||[]).reduce(
          (n,x)=>n+(x?.slots||1),
          0
        );

    return `
      <div class="efrBaseHome">

        <section class="efrBaseHero">
          <div class="efrBaseEyebrow">BASE</div>
          <h2>拠点</h2>
          <p>探索の準備、施設の利用、装備の整備をここから行います。</p>
        </section>

        <section class="efrBaseStats">
          <div class="efrBaseStat">
            <span>拠点レベル</span>
            <strong>Lv.${base.level}</strong>
            <small>XP ${base.xp||0}</small>
          </div>

          <div class="efrBaseStat">
            <span>脱出回数</span>
            <strong>${a.save.escapes||0}</strong>
            <small>累計脱出</small>
          </div>

          <div class="efrBaseStat">
            <span>倉庫</span>
            <strong>${stashUsed}/${storageCapacity()}</strong>
            <small>使用マス / 総マス</small>
          </div>
        </section>

        <section class="efrBaseSection">
          <div class="efrBaseSectionHead">
            <h3>現在の装備</h3>
            <span>出撃準備</span>
          </div>

          <div class="efrBaseEquipment">
            ${slots.map(([slot,label])=>{
              const item=equipment[slot];

              return `
                <div>
                  <span>${esc(label)}</span>
                  <strong>${esc(item ? itemName(item) : "装備なし")}</strong>
                </div>
              `;
            }).join("")}
          </div>
        </section>

        <section class="efrBaseSection">
          <div class="efrBaseSectionHead">
            <h3>施設</h3>
            <span>施設を選んで直接移動</span>
          </div>

          <div class="facilityGrid hubFacilityHomeGrid">
            ${renderFacilities()}
          </div>
        </section>

        <section class="efrBaseSection">
          <div class="efrBaseSectionHead">
            <h3>庭</h3>
            <span>拠点を自分好みに育てる</span>
          </div>

          <div class="hubFacilityCard">
            <div class="hubFacilityMain">
              <strong>🌿 庭</strong>
              <b>6 × 4</b>
            </div>
            <span>畑・木・花・池を配置して庭を作れます。</span>
            <small>今後、庭に住む可愛い生き物の配置へ拡張します。</small>
            <div class="hubFacilityActions">
              <button
                type="button"
                data-action="openTab"
                data-tab="garden"
              >庭を開く</button>
            </div>
          </div>
        </section>

        <section class="efrBaseSection">
          <div class="efrBaseSectionHead">
            <h3>出撃</h3>
            <span>探索前の準備</span>
          </div>

          <div class="efrBaseActionGrid">
            <button
              type="button"
              class="efrBaseAction efrBaseActionPrimary"
              data-open-loadout
            >
              <strong>探索開始</strong>
              <span>装備・持込品を確認して出撃準備へ</span>
            </button>

            <button
              type="button"
              class="efrBaseAction"
              data-action="openTab"
              data-tab="base"
            >
              <strong>拠点管理</strong>
              <span>拠点レベルと施設を管理</span>
            </button>
          </div>
        </section>

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

  function renderGarden(){
    return window.EFRGarden?.render?.() ||
      `<div class="hubSection"><p>庭を読み込めません。</p></div>`;
  }

  const PET_SKILL_ICONS={
    combat:"⚔",
    predator:"🐺",
    guard:"🛡",
    scout:"◉",
    keenEye:"👁",
    stealth:"◌",
    bond:"♥",
    forager:"🌿",
    swift:"⚡",
    tracking:"🐾"
  };

  function petSkillIcon(key){
    return PET_SKILL_ICONS[key] || "✦";
  }

  function petDetailPet(){
    return window.EFRPet?.getAnimalById?.(
      petDetailId
    ) || null;
  }

  function closePetDetail(){
    petDetailId=null;
    petDetailMode="detail";

    const modal=
      document.getElementById(
        "efrPetDetailModal"
      );

    if(modal){
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden","true");
    }
  }

  function openPetDetail(petOrId){
    const pet=
      typeof petOrId==="object"
        ? petOrId
        : window.EFRPet?.getAnimalById?.(
            petOrId
          );

    if(!pet){
      return false;
    }

    petDetailId=pet.id;
    petDetailMode="detail";

    ensure();

    const modal=
      document.getElementById(
        "efrPetDetailModal"
      );

    if(!modal){
      return false;
    }

    if(modal.parentElement!==document.body){
      document.body.appendChild(modal);
    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden","false");

    renderPetDetailModal();

    return true;
  }

  function openPetSkills(){
    if(!petDetailPet()){
      return;
    }

    petSkillDetailIndex=null;
    petDetailMode="skills";
    renderPetDetailModal();
  }

  function openPetSkillDetail(index){
    const pet=petDetailPet();
    const board=Array.isArray(pet?.skillBoard)
      ? pet.skillBoard
      : [];
    const numericIndex=Number(index);

    if(
      !pet ||
      !Number.isInteger(numericIndex) ||
      !board[numericIndex]
    ){
      return false;
    }

    petSkillDetailIndex=numericIndex;
    petDetailMode="skillDetail";
    renderPetDetailModal();

    return true;
  }

  function backPetSkillBoard(){
    petSkillDetailIndex=null;
    petDetailMode="skills";
    renderPetDetailModal();
  }

  function petSkillGroupClass(group){
    return {
      "戦闘系":"combat",
      "偵察系":"scout",
      "隠密系":"stealth",
      "運搬系":"carry",
      "探索系":"explore",
      "支援系":"support",
      "妨害系":"disruption",
      "特殊系":"special"
    }[group] || "unknown";
  }

  function backPetDetail(){
    petSkillDetailIndex=null;

    if(
      petDetailMode==="skills" ||
      petDetailMode==="skillDetail"
    ){
      petDetailMode="detail";
      renderPetDetailModal();
    }
  }

  function handlePetDetailAction(action){
    const type=action?.dataset?.action;

    if(type==="petDetailClose"){
      closePetDetail();
      return true;
    }

    if(type==="petSkillOpen"){
      openPetSkills();
      return true;
    }

    if(type==="petSkillBack"){
      backPetDetail();
      return true;
    }

    if(type==="petSkillCell"){
      openPetSkillDetail(
        Number(action.dataset.index)
      );
      return true;
    }

    if(type==="petSkillDetailBack"){
      backPetSkillBoard();
      return true;
    }

    if(type==="petSkillAcquire"){
      const pet=petDetailPet();

      if(pet){
        window.EFRPet?.spendSkillCell?.(
          Number(action.dataset.index),
          pet.id
        );

        renderPetDetailModal();
      }

      return true;
    }

    return false;
  }

  function renderPetDetailModal(){
    const modal=
      document.getElementById(
        "efrPetDetailModal"
      );

    const pet=petDetailPet();
    const petApi=window.EFRPet;

    if(!modal || !pet || !petApi){
      closePetDetail();
      return;
    }

    const type=
      petApi.PET_TYPES?.[pet.type] || {};

    if(petDetailMode==="skills"){
      const board=
        Array.isArray(pet.skillBoard)
          ? pet.skillBoard
          : [];

      const mainGroup=
        petApi.PET_TYPES?.[pet.type]?.group||
        "—";

      const secondaryGroup=
        petApi.PET_SECONDARY_GROUPS?.[pet.type]||
        "—";

      modal.innerHTML=`
        <div
          class="efrPetDetailWindow efrPetSkillWindow"
          role="dialog"
          aria-modal="true"
          aria-label="${esc(pet.name)}のペットスキル"
        >
          <header class="efrPetDetailHeader">
            <div>
              <span>PET SKILL</span>
              <h2>${esc(pet.name)}</h2>
              <p>
                Lv.${Number(pet.level||1)}
                / 取得可能マス ${Number(pet.skillPoints||0)}
              </p>
            </div>

            <button
              type="button"
              data-action="petDetailClose"
            >閉じる</button>
          </header>

          <div class="efrPetSkillBoardMeta">
            <span>取得済み ${
              board.filter(cell=>cell.selected).length
            }/Lv.${Number(pet.level||1)}</span>
            <span>残り ${Number(pet.skillPoints||0)}マス</span>
          </div>

          <div class="efrPetSkillBoardMeta">
            <span>メイン系統：${esc(mainGroup)}</span>
            <span>混成系統：${esc(secondaryGroup)}</span>
          </div>

          <div class="efrPetSkillBoardLarge">
            ${board.map(cell=>{
              const skill=
                petApi.PET_SKILLS?.[cell.skill] || {};

              const group=
                petApi.PET_SKILL_GROUP_BY_KEY?.[cell.skill] ||
                "—";

              const groupClass=
                petSkillGroupClass(group);

              const available=
                !cell.selected &&
                Number(pet.skillPoints||0)>0 &&
                petApi.skillBoardAvailable(
                  board,
                  cell.index
                ) &&
                petApi.skillLevel(
                  cell.skill,
                  pet.id
                )<(skill.max||99);

              const state=
                cell.selected
                  ? "selected"
                  : available
                    ? "available"
                    : "locked";

              return `
                <button
                  type="button"
                  class="efrPetSkillCell ${state} efrPetSkillGroup-${groupClass}"
                  data-action="petSkillCell"
                  data-index="${cell.index}"
                  aria-label="${esc(skill.name||cell.skill)}"
                >
                  <span class="efrPetSkillIcon">
                    ${petSkillIcon(cell.skill)}
                  </span>

                  <strong>${esc(skill.name||cell.skill)}</strong>

                  <small>
                    ${
                      cell.selected
                        ? "取得済み"
                        : available
                          ? "取得可能"
                          : "取得不可"
                    }
                  </small>
                </button>
              `;
            }).join("")}
          </div>

          <footer class="efrPetDetailFooter">
            <button
              type="button"
              data-action="petSkillBack"
            >ペット詳細へ戻る</button>
          </footer>
        </div>
      `;
      return;
    }

    if(petDetailMode==="skillDetail"){
      const board=
        Array.isArray(pet.skillBoard)
          ? pet.skillBoard
          : [];

      const cell=
        board[petSkillDetailIndex];

      if(!cell){
        petDetailMode="skills";
        petSkillDetailIndex=null;
        renderPetDetailModal();
        return;
      }

      const skill=
        petApi.PET_SKILLS?.[cell.skill] || {};

      const group=
        petApi.PET_SKILL_GROUP_BY_KEY?.[cell.skill] ||
        "—";

      const groupClass=
        petSkillGroupClass(group);

      const available=
        !cell.selected &&
        Number(pet.skillPoints||0)>0 &&
        petApi.skillBoardAvailable(
          board,
          cell.index
        ) &&
        petApi.skillLevel(
          cell.skill,
          pet.id
        )<(skill.max||99);

      const currentLevel=
        petApi.skillLevel(
          cell.skill,
          pet.id
        );

      const maxLevel=
        Number(skill.max||99);

      const status=
        cell.selected
          ? "取得済み"
          : available
            ? "取得可能"
            : "現在は取得不可";

      modal.innerHTML=`
        <div
          class="efrPetDetailWindow efrPetSkillWindow efrPetSkillDetailWindow efrPetSkillGroup-${groupClass}"
          role="dialog"
          aria-modal="true"
          aria-label="${esc(skill.name||cell.skill)}の詳細"
        >
          <header class="efrPetDetailHeader">
            <div>
              <span>PET SKILL DETAIL</span>
              <h2>${esc(skill.name||cell.skill)}</h2>
              <p>${esc(group)}</p>
            </div>

            <button
              type="button"
              data-action="petSkillDetailBack"
            >戻る</button>
          </header>

          <section class="efrPetSkillDetailBody">
            <div class="efrPetSkillDetailIcon">
              ${petSkillIcon(cell.skill)}
            </div>

            <div class="efrPetSkillDetailStatus">
              <span>状態</span>
              <strong>${esc(status)}</strong>
            </div>

            <div class="efrPetSkillDetailLevel">
              <span>現在Lv.</span>
              <strong>${currentLevel}/${maxLevel}</strong>
            </div>

            <div class="efrPetSkillDetailDescription">
              <span>効果</span>
              <p>${esc(skill.desc||"常時発動するスキルです。")}</p>
            </div>
          </section>

          <footer class="efrPetDetailFooter efrPetSkillDetailFooter">
            ${
              available
                ? `
                  <button
                    type="button"
                    class="efrPetSkillAcquire efrPetSkillAcquireReady"
                    data-action="petSkillAcquire"
                    data-index="${cell.index}"
                  >取得</button>
                `
                : cell.selected
                  ? `
                    <button
                      type="button"
                      class="efrPetSkillAcquire"
                      disabled
                    >取得済み</button>
                  `
                  : `
                    <button
                      type="button"
                      class="efrPetSkillAcquire"
                      disabled
                    >現在は取得不可</button>
                  `
            }

            <button
              type="button"
              data-action="petSkillDetailBack"
            >スキル一覧へ戻る</button>
          </footer>
        </div>
      `;
      return;
    }

    const selected=
      (pet.skillBoard||[])
        .filter(cell=>cell.selected);

    const selectedKeys=
      [...new Set(
        selected
          .map(cell=>cell?.skill)
          .filter(key=>petApi.PET_SKILLS?.[key])
      )];

    const skillSummary=
      selectedKeys.length
        ? selectedKeys.map(key=>{
            const skill=
              petApi.PET_SKILLS[key];

            const level=
              petApi.skillLevel(
                key,
                pet.id
              );

            return `
              <div class="efrPetDetailSkillMini">
                <span class="efrPetSkillIcon">
                  ${petSkillIcon(key)}
                </span>
                <div>
                  <strong>${esc(skill.name)}</strong>
                  <small>Lv.${level}/${skill.max}</small>
                </div>
              </div>
            `;
          }).join("")
        : `<small>まだスキルを取得していません。</small>`;

    const equipped=
      (A()?.save?.equipment||{});

    const equippedSlots=
      Object.entries(equipped)
        .filter(([,item])=>
          item?.kind==="pet" &&
          item.petId===pet.id
        )
        .map(([slot])=>slot==="weapon2"?"ペット枠":"武器1")
        .join(" / ");

    modal.innerHTML=`
      <div
        class="efrPetDetailWindow"
        role="dialog"
        aria-modal="true"
        aria-label="${esc(pet.name)}の詳細"
      >
        <header class="efrPetDetailHeader">
          <div>
            <span>PET DETAIL</span>
            <h2>${esc(pet.name)}</h2>
            <p>
              ${esc(type.name||pet.type)}
              / ${esc(type.group||"")}
            </p>
          </div>

          <button
            type="button"
            data-action="petDetailClose"
          >閉じる</button>
        </header>

        <div class="efrPetDetailStats">
          <div>
            <span>Lv</span>
            <strong>${Number(pet.level||1)}</strong>
          </div>
          <div>
            <span>XP</span>
            <strong>
              ${Number(pet.xp||0)}
              /
              ${
                Number(pet.level||1)>=petApi.MAX_PET_LEVEL
                  ? "MAX"
                  : Number(
                      50+
                      (
                        Math.max(1,Number(pet.level||1))-1
                      )*50
                    )
              }
            </strong>
          </div>
          <div>
            <span>HP</span>
            <strong>
              ${Number(pet.maxHp||0)}
            </strong>
          </div>
          <div>
            <span>サイズ</span>
            <strong>
              ${Number(pet.size||1).toFixed(2)}
            </strong>
          </div>
          <div>
            <span>取得可能マス</span>
            <strong>
              ${Number(pet.skillPoints||0)}
            </strong>
          </div>
          <div>
            <span>装備</span>
            <strong>
              ${esc(equippedSlots||"未装備")}
            </strong>
          </div>
        </div>

        <div class="efrPetDetailDescription">
          <strong>${esc(type.name||pet.type)}</strong>
          <p>${esc(type.desc||"")}</p>
          ${
            type.ability
              ? `<small>固有能力：${esc(type.ability)}</small>`
              : ""
          }
          <small>
            スキル系統：${esc(type.group||"—")}
            / 混成：${esc(
              petApi.PET_SECONDARY_GROUPS?.[pet.type]||"—"
            )}
            / 混成スキル ${
              Array.isArray(pet.secondarySkillKeys)
                ? pet.secondarySkillKeys.length
                : 0
            }種
          </small>
        </div>

        <section class="efrPetDetailSection">
          <div class="efrPetDetailSectionHead">
            <h3>現在のスキル</h3>
            <span>
              ${selected.length}/Lv.${Number(pet.level||1)} 取得
            </span>
          </div>

          <div class="efrPetDetailSkillList">
            ${skillSummary}
          </div>

          <button
            type="button"
            class="efrPetSkillOpenButton"
            data-action="petSkillOpen"
          >
            ペットスキルを見る
          </button>
        </section>

        <section class="efrPetDetailSection">
          <h3>コマンド</h3>
          <div class="efrPetCommandInfo">
            <strong>
              ${
                petApi.COMMANDS?.[pet.command]?.name ||
                "追従"
              }
            </strong>
            <span>
              ${
                petApi.COMMANDS?.[pet.command]?.desc ||
                "プレイヤーについてくる"
              }
            </span>
          </div>
        </section>
      </div>
    `;
  }

  function renderPet(){
    const petApi=window.EFRPet;
    const a=A();
    const sp=a?.save?.player||{};

    if(sp.classId!=="trainer"){
      return `
        <div class="hubSection hubInfoCard">
          <strong>ペットシステム</strong>
          <p>
            ペットは「調教師」クラス専用です。
            調教師に変更するとペットを管理できます。
          </p>
        </div>
      `;
    }

    const animals=
      petApi?.getAnimals?.() || [];

    if(!animals.length){
      return `
        <div class="hubSection">
          <h3>ペットケージ</h3>
          <div class="efrPetEmpty">
            <strong>ペットはいません</strong>
            <span>探索中に野生動物を仲間にするとここへ追加されます。</span>
          </div>
        </div>
      `;
    }

    const equipment=
      a.save?.equipment||{};

    const equippedIds=
      new Set(
        Object.values(equipment)
          .filter(item=>item?.kind==="pet")
          .map(item=>item.petId)
      );

    return `
      <div class="hubSection">
        <div class="efrPetCageHeader">
          <div>
            <h3>ペットケージ</h3>
            <p>所持 ${animals.length}/${petApi.MAX_ANIMALS}</p>
          </div>
          <small>ペットを長押しすると詳細を開けます</small>
        </div>

        <div class="efrPetCageGrid">
          ${animals.map(animal=>{
            const type=
              petApi.PET_TYPES?.[animal.type] || {};

            const selected=
              (animal.skillBoard||[])
                .filter(cell=>cell.selected)
                .length;

            return `
              <article
                class="efrPetCageCard ${
                  equippedIds.has(animal.id)
                    ? "equipped"
                    : ""
                }"
                data-pet-id="${esc(animal.id)}"
              >
                <div class="efrPetCageIcon">
                  ${
                    petApi.petIconMarkup?.(
                      animal,
                      {size:48}
                    ) || ""
                  }
                </div>

                <div class="efrPetCageMain">
                  <strong>${esc(animal.name)}</strong>
                  <span>
                    ${esc(type.name||animal.type)}
                    / Lv.${Number(animal.level||1)}
                  </span>
                  <small>
                    サイズ ${Number(animal.size||1).toFixed(2)}
                    / 取得 ${selected}/Lv.${Number(animal.level||1)}
                  </small>
                </div>

                <div class="efrPetCageState">
                  ${
                    equippedIds.has(animal.id)
                      ? "出撃中"
                      : "待機"
                  }
                </div>
              </article>
            `;
          }).join("")}
        </div>
      </div>

      <div class="hubSection hubInfoCard">
        <strong>ペットの管理</strong>
        <p>
          ペットを長押しすると個体詳細を開けます。
          詳細画面から個体専用の3×3スキルボードを確認できます。
        </p>
      </div>
    `;
  }

  function ensureWishlist(){
    const a=A();
    if(!a)return [];
    if(!Array.isArray(a.save.wishlist)){
      a.save.wishlist=[];
    }
    return a.save.wishlist;
  }

  function wishlistRecipeAdded(recipeId){
    const id=String(recipeId||"");
    return ensureWishlist().some(entry=>
      entry.type==="recipe" &&
      String(entry.recipeId||"")===id
    );
  }

  function wishlistUpgradeEntry(slot,mode){
    return ensureWishlist().find(entry=>
      entry.type==="upgrade" &&
      entry.slot===String(slot) &&
      entry.mode===String(mode)
    )||null;
  }

  function toggleWishlistRecipe(recipeId){
    const a=A();
    const id=String(recipeId||"");
    if(!a||!id)return;

    const list=ensureWishlist();
    const index=list.findIndex(entry=>
      entry.type==="recipe" &&
      String(entry.recipeId||"")===id
    );

    if(index>=0){
      list.splice(index,1);
    }else{
      list.push({
        type:"recipe",
        recipeId:id
      });
    }

    a.persist?.();
    render();
  }

  function setWishlistUpgrade(slot,mode,target){
    const a=A();
    const item=a?.save?.equipment?.[slot];
    if(!a||!item)return;

    const normalizedSlot=String(slot);
    const normalizedMode=String(mode);
    const normalizedTarget=Math.max(2,Number(target||2));
    const list=ensureWishlist();

    for(let i=list.length-1;i>=0;i--){
      if(
        list[i].type==="upgrade" &&
        list[i].slot===normalizedSlot &&
        list[i].mode===normalizedMode
      ){
        list.splice(i,1);
      }
    }

    list.push({
      type:"upgrade",
      slot:normalizedSlot,
      mode:normalizedMode,
      target:normalizedTarget,
      itemName:String(item.name||"")
    });

    a.persist?.();
    render();
  }

  function removeWishlist(index){
    const list=ensureWishlist();
    const i=Number(index);
    if(!Number.isInteger(i)||!list[i])return;

    list.splice(i,1);
    A()?.persist?.();
    render();
  }

  function wishlistRarityName(item,rarity){
    const a=A();

    if(item?.kind==="armor"){
      return a?.armorRarityName?.(rarity)||"レア度"+rarity;
    }

    if(item?.kind==="backpack"){
      return a?.backpackRarityName?.(rarity)||"レア度"+rarity;
    }

    return a?.weaponRarityName?.(rarity)||"レア度"+rarity;
  }

  function wishlistUpgradeCost(entry){
    const a=A();
    const item=a?.save?.equipment?.[entry?.slot];

    if(!item){
      return {
        status:"装備なし",
        current:0,
        target:0,
        cost:{}
      };
    }

    if(String(item.name||"")!==String(entry.itemName||"")){
      return {
        status:"装備変更",
        current:0,
        target:Number(entry.target||0),
        cost:{}
      };
    }

    const isWeapon=
      item.kind==="weapon"||
      item.kind==="firearm";
    const isArmor=item.kind==="armor";
    const isBackpack=item.kind==="backpack";
    const hasLevel=isWeapon||isArmor;

    let current=1;
    let max=1;

    if(entry.mode==="level"){
      if(!hasLevel){
        return {
          status:"対象外",
          current:0,
          target:0,
          cost:{}
        };
      }

      current=
        isArmor
          ? Number(item.armorLevel||1)
          : Number(item.weaponLevel||1);

      max=10;
    }else if(entry.mode==="rarity"){
      if(!isWeapon&&!isArmor&&!isBackpack){
        return {
          status:"対象外",
          current:0,
          target:0,
          cost:{}
        };
      }

      current=Number(item.rarity||1);
      max=5;
    }else{
      return {
        status:"対象外",
        current:0,
        target:0,
        cost:{}
      };
    }

    const target=Math.min(
      max,
      Math.max(current,Number(entry.target||current))
    );

    if(current>=target){
      return {
        status:"達成",
        current,
        target,
        cost:{}
      };
    }

    const cost={};

    for(let step=current+1;step<=target;step++){
      let stepCost={};

      if(entry.mode==="level"){
        stepCost=
          isArmor
            ? X()?.armorLevelCost?.(step)||{}
            : X()?.weaponLevelCost?.(step)||{};
      }else{
        stepCost=
          isBackpack
            ? X()?.backpackRarityCost?.(step)||{}
            : isArmor
              ? X()?.armorRarityCost?.(step)||{}
              : X()?.weaponRarityCost?.(step)||{};
      }

      for(const [name,count] of Object.entries(stepCost)){
        cost[name]=Number(cost[name]||0)+Number(count||0);
      }
    }

    return {
      status:"進行中",
      current,
      target,
      cost
    };
  }

  function wishlistUpgradeControls(slot,item){
    const isWeapon=
      item?.kind==="weapon"||
      item?.kind==="firearm";
    const isArmor=item?.kind==="armor";
    const isBackpack=item?.kind==="backpack";
    const hasLevel=isWeapon||isArmor;
    const rarityTarget=Math.min(
      5,
      Math.max(1,Number(item?.rarity||1))
    );
    const levelTarget=Math.min(
      10,
      Math.max(
        1,
        isArmor
          ? Number(item?.armorLevel||1)
          : Number(item?.weaponLevel||1)
      )
    );

    const levelEntry=wishlistUpgradeEntry(slot,"level");
    const rarityEntry=wishlistUpgradeEntry(slot,"rarity");

    const levelOptions=hasLevel&&levelTarget<10
      ? Array.from(
          {length:10-levelTarget},
          (_,i)=>levelTarget+i+1
        ).map(value=>`
          <option
            value="${value}"
            ${Number(levelEntry?.target||0)===value?"selected":""}
          >Lv.${value}</option>
        `).join("")
      : "";

    const rarityOptions=
      (isWeapon||isArmor||isBackpack)&&rarityTarget<5
        ? Array.from(
            {length:5-rarityTarget},
            (_,i)=>rarityTarget+i+1
          ).map(value=>`
            <option
              value="${value}"
              ${Number(rarityEntry?.target||0)===value?"selected":""}
            >${esc(wishlistRarityName(item,value))}</option>
        `).join("")
      : "";

    return `
      <div class="efrWishlistUpgradeControls">
        ${
          levelOptions
            ? `
              <div class="efrWishlistTargetRow">
                <select data-wishlist-mode="level">
                  <option value="" disabled ${levelEntry?"":"selected"}>Lv目標</option>
                  ${levelOptions}
                </select>
                <button
                  type="button"
                  data-action="wishlistUpgrade"
                  data-slot="${esc(slot)}"
                  data-mode="level"
                >${levelEntry?"目標更新":"目標登録"}</button>
              </div>
            `
            : ""
        }
        ${
          rarityOptions
            ? `
              <div class="efrWishlistTargetRow">
                <select data-wishlist-mode="rarity">
                  <option value="" disabled ${rarityEntry?"":"selected"}>レア度目標</option>
                  ${rarityOptions}
                </select>
                <button
                  type="button"
                  data-action="wishlistUpgrade"
                  data-slot="${esc(slot)}"
                  data-mode="rarity"
                >${rarityEntry?"目標更新":"目標登録"}</button>
              </div>
            `
            : ""
        }
      </div>
    `;
  }

  function renderWishlist(){
    const a=A();
    const x=X();
    const list=ensureWishlist();
    const recipes=x?.recipes||[];
    const total={};

    const addTotal=cost=>{
      for(const [name,count] of Object.entries(cost||{})){
        total[name]=Number(total[name]||0)+Number(count||0);
      }
    };

    const cards=list.map((entry,index)=>{
      if(entry.type==="recipe"){
        const recipe=recipes.find(r=>
          String(r?.id||"")===String(entry.recipeId||"")
        );

        if(!recipe){
          return `
            <article class="efrWishlistCard">
              <div class="efrWishlistCardHead">
                <div>
                  <strong>レシピ未確認</strong>
                  <small>現在のレシピ一覧に存在しません。</small>
                </div>
                <button
                  type="button"
                  data-action="wishlistRemove"
                  data-index="${index}"
                >削除</button>
              </div>
            </article>
          `;
        }

        const cost=recipe.cost||{};
        addTotal(cost);

        return `
          <article class="efrWishlistCard">
            <div class="efrWishlistCardHead">
              <div>
                <strong>${esc(recipe.name)}</strong>
                <small>
                  ${esc(
                    facilities()[recipe.facility]?.name||
                    recipe.facility||
                    "クラフト"
                  )} Lv.${Number(recipe.level||1)}
                </small>
              </div>
              <button
                type="button"
                data-action="wishlistRemove"
                data-index="${index}"
              >削除</button>
            </div>

            <div class="efrWishlistRows">
              ${Object.entries(cost).map(([name,count])=>{
                const owned=materialCount(name);
                const missing=Math.max(
                  0,
                  Number(count||0)-owned
                );

                return `
                  <div class="efrWishlistRow">
                    <span>${esc(name)}</span>
                    <strong>
                      ${count} / ${owned}
                      ${
                        missing
                          ? `<em>不足 ${missing}</em>`
                          : `<em class="ready">OK</em>`
                      }
                    </strong>
                  </div>
                `;
              }).join("")||`<small>必要素材なし</small>`}
            </div>
          </article>
        `;
      }

      if(entry.type==="upgrade"){
        const result=wishlistUpgradeCost(entry);
        addTotal(result.cost);

        const currentItem=a?.save?.equipment?.[entry.slot];
        const label=entry.mode==="level"
          ? `Lv.${result.current||"?"} → Lv.${result.target||entry.target}`
          : wishlistRarityName(
              currentItem,
              result.target||entry.target
            );

        return `
          <article class="efrWishlistCard">
            <div class="efrWishlistCardHead">
              <div>
                <strong>${esc(entry.itemName||"装備")}</strong>
                <small>${esc(label)}</small>
              </div>
              <button
                type="button"
                data-action="wishlistRemove"
                data-index="${index}"
              >削除</button>
            </div>

            <div class="efrWishlistStatus ${
              result.status==="達成"
                ? "ready"
                : result.status==="進行中"
                  ? ""
                  : "warning"
            }">
              ${
                result.status==="装備変更"
                  ? "登録した装備と現在の装備が違います。"
                  : result.status
              }
            </div>

            <div class="efrWishlistRows">
              ${
                Object.entries(result.cost).map(([name,count])=>{
                  const owned=materialCount(name);
                  const missing=Math.max(
                    0,
                    Number(count||0)-owned
                  );

                  return `
                    <div class="efrWishlistRow">
                      <span>${esc(name)}</span>
                      <strong>
                        ${count} / ${owned}
                        ${
                          missing
                            ? `<em>不足 ${missing}</em>`
                            : `<em class="ready">OK</em>`
                        }
                      </strong>
                    </div>
                  `;
                }).join("")||
                `<small>${
                  result.status==="達成"
                    ? "この目標は達成済みです。"
                    : "必要素材を取得できません。"
                }</small>`
              }
            </div>
          </article>
        `;
      }

      return "";
    }).join("");

    const totalHtml=Object.entries(total).map(([name,count])=>{
      const owned=materialCount(name);
      const missing=Math.max(
        0,
        Number(count||0)-owned
      );

      return `
        <div class="efrWishlistAggregateRow">
          <span>${esc(name)}</span>
          <strong>
            ${count} / ${owned}
            ${
              missing
                ? `<em>不足 ${missing}</em>`
                : `<em class="ready">OK</em>`
            }
          </strong>
        </div>
      `;
    }).join("");

    const recipeRows=recipes.map(recipe=>{
      const id=String(recipe?.id||"");
      const registered=wishlistRecipeAdded(id);

      return `
        <div class="efrWishlistAddRow">
          <div>
            <strong>${esc(recipe?.name||"")}</strong>
            <small>
              ${esc(
                facilities()[recipe?.facility]?.name||
                recipe?.facility||
                "クラフト"
              )} Lv.${Number(recipe?.level||1)}
            </small>
          </div>
          <button
            type="button"
            data-action="wishlistRecipe"
            data-recipe-id="${esc(id)}"
          >${registered?"登録解除":"欲しいものに追加"}</button>
        </div>
      `;
    }).join("");

    const slots=[
      ["weapon1","武器1"],
      ["weapon2","武器2"],
      ["head","頭"],
      ["chest","胴"],
      ["legs","脚"],
      ["backpack","バッグ"]
    ];

    const equipmentRows=slots.map(([slot,label])=>{
      const item=a?.save?.equipment?.[slot];

      if(!item){
        return `
          <div class="efrWishlistAddRow">
            <div>
              <strong>${label}</strong>
              <small>装備なし</small>
            </div>
          </div>
        `;
      }

      return `
        <div class="efrWishlistAddRow efrWishlistEquipmentRow">
          <div>
            <strong>${esc(label)} / ${esc(itemName(item))}</strong>
            <small>
              ${
                item.kind==="backpack"
                  ? `レア度 ${Number(item.rarity||1)}/5`
                  : `Lv.${Number(
                      item.kind==="armor"
                        ? item.armorLevel||1
                        : item.weaponLevel||1
                    )}/10 / レア度 ${Number(item.rarity||1)}/5`
              }
            </small>
          </div>
          ${wishlistUpgradeControls(slot,item)}
        </div>
      `;
    }).join("");

    const missingTotal=Object.entries(total).reduce(
      (sum,[name,count])=>
        sum+
        Math.max(
          0,
          Number(count||0)-materialCount(name)
        ),
      0
    );

    return `
      <div class="hubSection">
        <h3>欲しいもの</h3>
        <p>
          作りたい物や、現在の装備をどこまで強化したいかを登録できます。
          同じ素材を使う目標は必要数を合算します。
        </p>

        <section class="efrWishlistSummary">
          <div>
            <strong>登録目標</strong>
            <span>${list.length}</span>
          </div>
          <div>
            <strong>不足素材合計</strong>
            <span>${missingTotal}</span>
          </div>
        </section>

        <section class="efrWishlistAggregate">
          <h4>必要素材 合計</h4>
          <div class="efrWishlistAggregateRows">
            ${
              totalHtml||
              `<small>まだ目標が登録されていません。</small>`
            }
          </div>
        </section>

        <section class="hubSection">
          <h3>登録済み</h3>
          <div class="efrWishlistGrid">
            ${
              cards||
              `<div class="efrWishlistEmpty">登録された目標はありません。</div>`
            }
          </div>
        </section>

        <section class="hubSection">
          <h3>クラフト・研究品を追加</h3>
          <div class="efrWishlistAddGrid">
            ${recipeRows}
          </div>
        </section>

        <section class="hubSection">
          <h3>現在の装備の強化目標</h3>
          <div class="efrWishlistAddGrid">
            ${equipmentRows}
          </div>
        </section>
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

            const currentFacilityLevel=facilityLevel(facility);

            const materialsOk=
              Object.entries(cost)
                .every(([n,c])=>available(n)>=c);

            const facilityOk=
              currentFacilityLevel>=level;

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
                <button
                  data-action="wishlistRecipe"
                  data-recipe-id="${esc(id)}">
                  ${wishlistRecipeAdded(id)?"欲しいもの解除":"欲しいものに追加"}
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
              facilityLevel("research");
            const craftingFacilityLevel=
              facilityLevel(r?.facility);
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
                <button
                  data-action="wishlistRecipe"
                  data-recipe-id="${esc(id)}">
                  ${wishlistRecipeAdded(id)?"欲しいもの解除":"欲しいものに追加"}
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
                      ? `高品質金属 ×${X()?.armorLevelCost?.(level+1)?.["高品質金属"]||0} / 接着剤 ×${X()?.armorLevelCost?.(level+1)?.["接着剤"]||0}`
                      : `高品質金属 ×${X()?.weaponLevelCost?.(level+1)?.["高品質金属"]||0} / 接着剤 ×${X()?.weaponLevelCost?.(level+1)?.["接着剤"]||0}`
                  )
                : hasLevel
                  ? "Lv.最大"
                  : "";

            const rarityCost=
              isProgressionTarget && rarity<rarityMax
                ? (
                    isArmor
                      ? `高品質金属 ×${X()?.armorRarityCost?.(rarity+1)?.["高品質金属"]||0} / 接着剤 ×${X()?.armorRarityCost?.(rarity+1)?.["接着剤"]||0} / 電子部品 ×${X()?.armorRarityCost?.(rarity+1)?.["電子部品"]||0}`
                      : isBackpack
                        ? `高品質金属 ×${X()?.backpackRarityCost?.(rarity+1)?.["高品質金属"]||0} / 接着剤 ×${X()?.backpackRarityCost?.(rarity+1)?.["接着剤"]||0} / 電子部品 ×${X()?.backpackRarityCost?.(rarity+1)?.["電子部品"]||0}`
                        : `高品質金属 ×${X()?.weaponRarityCost?.(rarity+1)?.["高品質金属"]||0} / 接着剤 ×${X()?.weaponRarityCost?.(rarity+1)?.["接着剤"]||0} / 電子部品 ×${X()?.weaponRarityCost?.(rarity+1)?.["電子部品"]||0}`
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

                      ${wishlistUpgradeControls(slot,x)}
                    `
                    : `
                      <small>この装備はLv/レア度改造の対象外です</small>
                    `
                }
              </div>
            `;
          }).join("")}
        </div>

        <div class="hubSection">
          <h3>武器パーツ改造</h3>
          <p>
            所持している武器パーツは整備台でレア度だけを改造できます。
            武器本体のLv・レア度とは独立しています。
          </p>

          <div class="hubUpgradeGrid">
            ${weaponPartInventory().map((part,index)=>{
              const rarity=Math.max(
                1,
                Math.min(5,Number(part?.rarity||1))
              );
              const max=rarity>=5;
              const target=rarity+1;
              const cost=max
                ? null
                : X()?.weaponRarityCost?.(target)||{};

              const costText=max
                ? "レア度最大"
                : `高品質金属 ×${cost["高品質金属"]||0} / 接着剤 ×${cost["接着剤"]||0} / 電子部品 ×${cost["電子部品"]||0}`;

              return `
                <div class="hubUpgrade">
                  <strong>${esc(weaponPartName(part))}</strong>
                  <span>${esc(weaponPartSlotName(weaponPartDefinition(part)?.slot||""))}</span>
                  <small>
                    レア度：
                    ${esc(
                      window.EFRBaseParts?.rarityName?.(rarity)||
                      "コモン"
                    )}
                    (${rarity}/5)
                  </small>

                  <button
                    data-action="weaponPartRarity"
                    data-index="${index}"
                    ${max?"disabled":""}>
                    ${max?"レア度5":"レア度"+target+"へ"}
                  </button>

                  <small>${esc(costText)}</small>
                </div>
              `;
            }).join("") || `
              <div class="hubUpgrade">
                <span>所持している武器パーツはありません</span>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  function render(){
    ensure();

    const a=A();
    if(!a)return;

    ensureBase();

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
    if(tab==="wishlist")content.innerHTML=renderWishlist();
    if(tab==="character")content.innerHTML=renderCharacter();
    if(tab==="skill")content.innerHTML=renderSkill();
    if(tab==="pet")content.innerHTML=renderPet();
    if(tab==="garden")content.innerHTML=renderGarden();

    window.EFRPet?.mountPetIcons?.(
      content
    );

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
    storageCapacity,
    openWeaponDetail,
    openPetDetail
  };

})();
