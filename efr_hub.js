(function(){
  "use strict";

  const A=()=>window.EFRGame;
  const X=()=>window.EFRContentExpansion;

  let panel=null;
  let tab="base";
  let shopMode="buy";
  let shopCategory="all";
  let storageGridSelection=null;
  let storageSellMode=false;
  let storageSellSelection=new Set();
    let weaponDetailSource=null;
  let weaponDetailPartIndex=null;
  let weaponDetailTimer=null;
  let weaponDetailLongPress=false;

  let itemDetailSource=null;
  let itemDetailTimer=null;
  let itemDetailLongPress=false;

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
      window.EFRBaseCore?.facilityLevel?.(key) ?? 0
    );
  }

  function facilityBuilt(key){
    return Boolean(window.EFRBaseCore?.isFacilityBuilt?.(key));
  }

  function facilityBuildCost(key){
    return window.EFRBaseCore?.facilityBuildCost?.(key)||{};
  }

  function renderFacilityUnavailable(key){
    const facility=facilities()[key];
    if(!facility)return `<div class="hubSection"><p>施設が見つかりません。</p></div>`;
    const base=ensureBase();
    const unlocked=Number(base?.level||1)>=Number(facility.unlock||1);
    return `
      <div class="hubSection hubFacilityUnavailable">
        <h3>${esc(facility.name)}は未建設です</h3>
        <p>${esc(facility.desc)}</p>
        <p>${unlocked?"拠点の敷地に建設すると、このメニューから直接利用できます。":"拠点Lv."+Number(facility.unlock||1)+"で建設できます。"}</p>
        <button type="button" data-action="facilityPlace" data-key="${esc(key)}" ${unlocked?"":"disabled"}>拠点に建設・配置</button>
      </div>
    `;
  }

  function currency(){
    return Number(
      window.EFRBaseCore?.currency?.() || 0
    );
  }

  function itemSellPrice(item){
    return Number(
      window.EFRBaseCore?.itemSellPrice?.(item) || 0
    );
  }

  function sellStashItem(index){
    return Boolean(
      window.EFRBaseCore?.sellStashItem?.(index)
    );
  }

  const STORAGE_KEY_NAMES=Object.freeze({
    military:"軍用鍵",
    research:"研究施設鍵",
    factory:"工場鍵",
    storage:"倉庫鍵",
    security:"保安区画鍵",
    special:"特殊区画鍵"
  });

  function storageSellTargetKey(source,index,petId){
    return source==="pet"
      ? "pet:"+String(petId||"")
      : String(source)+":"+String(Number(index));
  }

  function storageSellTargets(){
    const a=A();
    const save=a?.save;
    if(!save)return [];

    const stash=Array.isArray(save.stash)?save.stash:[];
    const animals=Array.isArray(save.animals)?save.animals:[];
    const keys=Array.isArray(save.keys)?save.keys:[];
    const protectedKeyTypes=new Set(Array.isArray(save.protectedKeyTypes)?save.protectedKeyTypes:[]);
    const findAnimal=id=>animals.find(animal=>
      String(animal?.id||"")===String(id||"")
    )||null;
    const stashPetIds=new Set(stash
      .filter(item=>item?.kind==="pet"&&item.petId)
      .map(item=>String(item.petId)));
    const equippedPetIds=new Set(Object.values(save.equipment||{})
      .filter(item=>item?.kind==="pet"&&item.petId)
      .map(item=>String(item.petId)));
    const carriedPetIds=new Set((Array.isArray(a.player?.loot)?a.player.loot:[])
      .filter(item=>item?.kind==="pet"&&item.petId)
      .map(item=>String(item.petId)));
    const unavailablePetIds=new Set([
      ...equippedPetIds,
      ...carriedPetIds
    ]);
    const targets=[];

    stash.forEach((item,index)=>{
      if(!item||typeof item==="string")return;
      if(item.kind==="pet"){
        const id=String(item.petId||"");
        if(
          !id ||
          !findAnimal(id) ||
          unavailablePetIds.has(id)
        )return;
      }

      const price=itemSellPrice(item);
      if(price<=0)return;
      targets.push({
        key:storageSellTargetKey("stash",index),
        source:"stash",
        index,
        item,
        label:itemName(item),
        price,
        protected:item.kind==="pet" ? findAnimal(item.petId)?.sellProtected===true : item.sellProtected===true
      });
    });

    animals.forEach(animal=>{
      const id=String(animal?.id||"");
      if(
        !id ||
        stashPetIds.has(id) ||
        unavailablePetIds.has(id)
      )return;

      const item={
        kind:"pet",
        petId:id,
        name:String(animal.name||animal.type||"ペット")
      };
      const price=itemSellPrice(item);
      if(price<=0)return;
      targets.push({
        key:storageSellTargetKey("pet",null,id),
        source:"pet",
        petId:id,
        item,
        label:item.name,
        price,
        protected:animal.sellProtected===true
      });
    });

    keys.forEach((keyType,index)=>{
      const key=String(keyType||"");
      const name=STORAGE_KEY_NAMES[key];
      if(!name)return;
      const item={kind:"key",keyType:key,name};
      const price=itemSellPrice(item);
      if(price<=0)return;
      targets.push({
        key:storageSellTargetKey("key",index),
        source:"key",
        index,
        item,
        label:name,
        price,
        protected:protectedKeyTypes.has(key)
      });
    });

    const validKeys=new Set(targets.filter(target=>!target.protected).map(target=>target.key));
    for(const key of storageSellSelection){
      if(!validKeys.has(key))storageSellSelection.delete(key);
    }

    return targets;
  }

  function toggleStorageSaleProtection(source,index,petId){
    const a=A();
    const save=a?.save;
    const i=Number(index);
    let target=null;
    let label="";
    let selectionKey="";

    if(!save){
      return;
    }

    if(source==="stash"){
      if(
        !Array.isArray(save.stash) ||
        !Number.isInteger(i) ||
        i<0 ||
        i>=save.stash.length
      ){
        a.logMessage?.("保護対象のアイテムが見つかりません");
        render();
        return;
      }

      const item=save.stash[i];
      if(!item || typeof item==="string"){
        a.logMessage?.("保護対象のアイテムが見つかりません");
        render();
        return;
      }

      if(item.kind==="pet"){
        target=(Array.isArray(save.animals)?save.animals:[])
          .find(animal=>String(animal?.id||"")===String(item.petId||""))||null;
        if(!target){
          a.logMessage?.("対応するペット個体が見つかりません");
          render();
          return;
        }
        label=String(target.name||target.type||itemName(item));
      }else{
        target=item;
        label=itemName(item);
      }
      selectionKey=storageSellTargetKey("stash",i);
    }else if(source==="pet"){
      const id=String(petId||"");
      target=(Array.isArray(save.animals)?save.animals:[])
        .find(animal=>String(animal?.id||"")===id)||null;
      if(!target){
        a.logMessage?.("保護対象のペットが見つかりません");
        render();
        return;
      }
      label=String(target.name||target.type||"ペット");
      selectionKey=storageSellTargetKey("pet",null,id);
    }else if(source==="key"){
      const keyType=Array.isArray(save.keys)?String(save.keys[i]||""):"";
      if(
        !Number.isInteger(i) ||
        i<0 ||
        !keyType ||
        !["military","research","factory","storage","security","special"].includes(keyType)
      ){
        a.logMessage?.("保護対象の鍵が見つかりません");
        render();
        return;
      }

      const protectedTypes=Array.isArray(save.protectedKeyTypes)
        ? save.protectedKeyTypes
        : [];
      const willProtect=!protectedTypes.includes(keyType);
      save.protectedKeyTypes=willProtect
        ? [...new Set([...protectedTypes,keyType])]
        : protectedTypes.filter(type=>type!==keyType);
      storageSellSelection.delete(storageSellTargetKey("key",i));
      a.persist?.();
      a.logMessage?.(
        (STORAGE_KEY_NAMES[keyType]||keyType)+
        (willProtect ? "を売却保護しました（同じ種類の鍵すべて）" : "の売却保護を解除しました")
      );
      render();
      return;
    }else{
      return;
    }

    if(!target){
      return;
    }

    target.sellProtected=target.sellProtected!==true;
    storageSellSelection.delete(selectionKey);
    a.persist?.();
    a.logMessage?.(
      label+
      (target.sellProtected ? "を売却保護しました" : "の売却保護を解除しました")
    );
    render();
  }

  function toggleStorageSellTarget(source,index,petId){
    const key=storageSellTargetKey(source,index,petId);
    const target=storageSellTargets().find(item=>item.key===key);
    if(!target || target.protected){
      A()?.logMessage?.(
        target?.protected
          ? "売却保護中のアイテムは選択できません"
          : "このアイテムは現在売却対象にできません"
      );
      render();
      return;
    }

    if(storageSellSelection.has(key)){
      storageSellSelection.delete(key);
    }else{
      storageSellSelection.add(key);
    }
    render();
  }

  function endStorageSellMode(){
    storageSellMode=false;
    storageSellSelection.clear();
    storageGridSelection=null;
  }

  function confirmStorageSell(){
    const targets=storageSellTargets();
    const selected=targets.filter(target=>
      !target.protected && storageSellSelection.has(target.key)
    );
    const total=selected.reduce((sum,target)=>sum+target.price,0);

    if(!selected.length||total<=0){
      A()?.logMessage?.("売却するアイテムを選択してください");
      render();
      return;
    }

    if(
      typeof window.confirm==="function" &&
      !window.confirm(
        "選択した"+selected.length+"件を売却します。\n"+
        "合計："+total+"\n"+
        "よろしいですか？"
      )
    )return;

    const request=selected.map(target=>({
      source:target.source,
      index:target.index,
      petId:target.petId,
      keyType:target.item?.keyType,
      item:target.source==="stash"?target.item:undefined
    }));

    endStorageSellMode();
    const result=window.EFRBaseCore?.sellSelectedStorageItems?.(request);
    if(!result?.success){
      A()?.logMessage?.("選択対象に変更があったため売却を中止しました");
      render();
    }
  }

  function facilityTab(key){
    return {
      storage:"storage",
      shop:"shop",
      workbench:"craft",
      workshop:"craft",
      maintenance:"upgrade",
      medical:"craft",
      research:"research",
      training:"training",
      kitchen:"craft"
    }[key] || null;
  }

  function facilityUpgradeState(key){
    const b=ensureBase();
    const f=facilities()[key];
    if(!b||!f)return null;

    const built=facilityBuilt(key);
    const lv=facilityLevel(key);
    const max=built&&lv>=Number(f.max||0);
    const locked=b.level<Number(f.unlock||1);
    const cost=built
      ? (max?{}:(window.EFRBaseCore?.facilityCost?.(key)||{}))
      : facilityBuildCost(key);
    const materials=Object.entries(cost).map(([name,required])=>({
      name,
      required:Math.max(0,Number(required)||0),
      owned:materialCount(name)
    }));
    const canUpgrade=
      built&&
      !max&&
      !locked&&
      materials.every(material=>material.owned>=material.required);

    return {
      key,
      facility:f,
      built,
      level:lv,
      targetLevel:lv+1,
      max,
      locked,
      cost,
      materials,
      canUpgrade
    };
  }

  function facilityUpgradeChanges(key,state){
    const f=state?.facility;
    if(!f || !state)return [];

    if(key==="storage"){
      const before=storageCapacity();
      const after=before+10;
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
            ${state.materials.length
              ?state.materials.map(material=>`
                <div class="efrFacilityUpgradeMaterialRow">
                  <span>${esc(material.name)}</span>
                  <strong>所持 ${material.owned} / 必要 ${material.required}</strong>
                </div>
              `).join("")
              :"<p>必要素材なし</p>"
            }
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
        const built=facilityBuilt(key);
        const lv=built&&key!=="training"?facilityLevel(key):0;
        const locked=Boolean(state?.locked);
        const max=key!=="training"&&Boolean(state?.max);
        const canUpgrade=key!=="training"&&Boolean(state?.canUpgrade);
        const targetTab=facilityTab(key);
        const rootAction=built?(targetTab?"facilityOpen":"facility"):"facilityPlace";

        return `
          <article
            class="hubFacilityCard ${built?"hubFacilityBuilt":"hubFacilityUnbuilt"}"
            data-action="${rootAction}"
            data-key="${key}"
          >
            <div class="hubFacilityMain">
              <strong>${esc(f.name)}</strong>
              <b>${built?(key==="training"?"設置済み":"Lv."+lv):"未建設"}</b>
            </div>

            <span>${esc(f.desc)}</span>

            <small>${built
              ? (key==="training"?"強化レベルなし":max?"最大レベル":locked?"拠点Lv."+f.unlock+"で強化解放":"設置済み")
              : (locked?"拠点Lv."+f.unlock+"で建設解放":"未設置・拠点に建設")
            }</small>

            <div class="hubFacilityActions">
              ${built&&targetTab?`<button type="button" data-action="facilityOpen" data-key="${key}">開く</button>`:""}
              ${built&&key!=="training"?`<button type="button" class="${canUpgrade?"efrFacilityUpgradeReady":""}" data-action="facilityUpgrade" data-key="${key}" ${max||locked?"disabled":""}>強化</button>`:
                built?"":`<button type="button" class="hubPrimary" data-action="facilityPlace" data-key="${key}" ${locked?"disabled":""}>拠点に建設</button>`}
            </div>
          </article>`;
      })
      .join("");

    return cards;
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



  function isWeapon(x){
    return x?.kind==="firearm" || x?.kind==="weapon";
  }

  function isRarityDetailItem(x){
    return x?.kind==="armor" ||
      x?.kind==="backpack" ||
      x?.kind==="weaponPart";
  }

  function rarityDetailName(item,rarity){
    if(item?.kind==="weaponPart"){
      return window.EFRBaseParts?.rarityName?.(rarity)||"コモン";
    }

    if(item?.kind==="armor"){
      return A()?.armorRarityName?.(rarity)||"コモン";
    }

    if(item?.kind==="backpack"){
      return A()?.backpackRarityName?.(rarity)||"コモン";
    }

    return "コモン";
  }

  function openItemDetail(item,source){
    if(!item || !isRarityDetailItem(item)){
      return false;
    }

    itemDetailSource={
      ...(source||{}),
      item
    };

    const modal=document.getElementById(
      "efrItemDetailModal"
    );

    if(!modal){
      return false;
    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden","false");
    renderItemDetail();

    return true;
  }

  function closeItemDetail(){
    itemDetailSource=null;

    const modal=document.getElementById(
      "efrItemDetailModal"
    );

    if(modal){
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden","true");
    }
  }

  function renderItemDetail(){
    const modal=document.getElementById(
      "efrItemDetailModal"
    );

    const item=itemDetailSource?.item;

    if(!modal || !item || !isRarityDetailItem(item)){
      closeItemDetail();
      return;
    }

    const rarity=Math.max(
      1,
      Math.min(
        5,
        Math.round(Number(item.rarity)||1)
      )
    );

    const size=
      window.EFRGrid?.size?.(item) ||
      [
        Math.max(1,Number(item.gridW)||1),
        Math.max(1,Number(item.gridH)||1)
      ];

    const rows=[
      ["分類",
        item.kind==="weaponPart"
          ? "武器パーツ"
          : kindName(item)
      ],
      ["レア度",
        `${rarityDetailName(item,rarity)} (${rarity}/5)`
      ],
      ["占有",
        `${size[0]}×${size[1]}マス`
      ]
    ];

    if(item.kind==="armor"){
      rows.splice(
        1,
        0,
        ["装備Lv",`Lv.${Number(item.armorLevel||1)}/10`]
      );
    }

    if(item.kind==="backpack"){
      rows.push([
        "容量",
        `${Number(item.capacity||0)}マス`
      ]);
    }

    if(item.kind==="weaponPart"){
      rows.splice(
        1,
        0,
        ["部位",
          weaponPartSlotName(
            weaponPartDefinition(item)?.slot || ""
          )]
      );
    }

    if(Number.isFinite(Number(item.weight))){
      rows.push([
        "重量",
        `${Number(item.weight).toFixed(1)}kg`
      ]);
    }

    modal.innerHTML=`
      <div
        class="efrWeaponDetailWindow"
        style="
          max-width:520px;
          width:calc(100% - 24px);
          max-height:90vh;
          overflow:auto;
        "
      >
        <header class="efrHubHeader">
          <div>
            <h2>${esc(itemName(item))}</h2>
            <p>
              レア度
              ${esc(rarityDetailName(item,rarity))}
            </p>
          </div>
          <button
            type="button"
            data-action="itemDetailClose"
          >閉じる</button>
        </header>

        <div class="hubInfoCard">
          <div style="
            display:flex;
            align-items:center;
            gap:12px;
            margin-bottom:10px;
          ">
            <span
              aria-hidden="true"
              class="efrItemDetailIcon"
            >${
              window.EFRItemIcons?.markup?.(item,true)||""
            }</span>
            <strong>
              ${esc(itemName(item))}
            </strong>
          </div>

          <div class="weaponDetailStats">
            ${rows.map(([label,value])=>`
              <div class="weaponDetailStat">
                <span>${esc(label)}</span>
                <strong>${esc(value)}</strong>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;
  }

  function isCustomizableWeapon(x){
    return x?.kind==="firearm" &&
      !x?.isBow &&
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
    const a=A();
    const source=weaponDetailSource;

    if(!a || !source){
      return [];
    }

    if(source.type==="stash"){
      return (a.save?.stash||[])
        .filter(item=>item?.kind==="weaponPart");
    }

    if(source.type==="loot"){
      return (a.player?.loot||[])
        .filter(item=>item?.kind==="weaponPart");
    }

    if(source.type==="equipment"){
      return (a.save?.stash||[])
        .filter(item=>item?.kind==="weaponPart");
    }

    return [];
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

        <nav class="efrHubTabs" aria-label="拠点管理メニュー">
          <button data-tab="base">施設</button>
          <button data-tab="storage">倉庫</button>
          <button data-tab="craft">クラフト</button>
          <button data-tab="shop">ショップ</button>
          <button data-tab="upgrade">整備・修理</button>
          <button data-tab="research">研究所</button>
          <button data-tab="wishlist">欲しいもの</button>
          <button data-tab="character">キャラクター</button>
          <button data-tab="skill">スキル</button>
          <button data-tab="pet">ペット</button>
          <button data-tab="garden">🏠 拠点配置</button>
        </nav>

        <div id="efrHubContent"></div>

        <section
          id="efrWeaponDetailModal"
          class="efrWeaponDetailModal hidden"
          aria-hidden="true"
        ></section>

        <section
          id="efrItemDetailModal"
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
            if(button.dataset.tab!=="storage"){
              endStorageSellMode();
            }
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
      if(e.target.closest("#efrLoadoutPanel.efrLoadoutInline"))return;
      if(
        tab==="storage" &&
        storageSellMode &&
        document.getElementById("efrHubContent")?.contains(e.target)
      )return;

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

      if(!item){
        return;
      }

      if(isWeapon(item)){
        weaponDetailLongPress=false;

        clearTimeout(weaponDetailTimer);

        weaponDetailTimer=setTimeout(()=>{
          weaponDetailLongPress=true;
          showWeaponDetail(index);
        },550);

        return;
      }

      if(isRarityDetailItem(item)){
        itemDetailLongPress=false;

        clearTimeout(itemDetailTimer);

        itemDetailTimer=setTimeout(()=>{
          itemDetailLongPress=true;
          openItemDetail(
            item,
            {
              type:"stash",
              index
            }
          );
        },550);
      }
    });

    panel.addEventListener("pointerup",()=>{
      clearTimeout(weaponDetailTimer);
      clearTimeout(itemDetailTimer);
      clearTimeout(petDetailTimer);
    });

    panel.addEventListener("pointercancel",()=>{
      clearTimeout(weaponDetailTimer);
      clearTimeout(itemDetailTimer);
      clearTimeout(petDetailTimer);
    });

    panel.addEventListener("pointerleave",()=>{
      clearTimeout(weaponDetailTimer);
      clearTimeout(itemDetailTimer);
      clearTimeout(petDetailTimer);
    });

    let lastPanelActivation=0;

    const handlePanelTapCore=e=>{
      if(weaponDetailLongPress){
        weaponDetailLongPress=false;
        return;
      }

      if(itemDetailLongPress){
        itemDetailLongPress=false;
        return;
      }

      if(petDetailLongPress){
        petDetailLongPress=false;
        return;
      }

      if(
        tab==="storage" &&
        storageSellMode &&
        document.getElementById("efrHubContent")?.contains(e.target)
      ){
        const action=e.target.closest("[data-action]");
        if(action){
          const type=action.dataset.action;
          if(type==="toggleStorageSellMode"){
            endStorageSellMode();
            render();
          }else if(type==="toggleStorageSaleProtection"){
            toggleStorageSaleProtection(
              action.dataset.sellType,
              Number(action.dataset.index),
              action.dataset.petId
            );
          }else if(type==="toggleStorageSellTarget"){
            toggleStorageSellTarget(
              action.dataset.sellType,
              Number(action.dataset.index),
              action.dataset.petId
            );
          }else if(type==="clearStorageSellSelection"){
            storageSellSelection.clear();
            render();
          }else if(type==="confirmStorageSell"){
            confirmStorageSell();
          }
          return;
        }

        const itemEl=e.target.closest(".efrSlotItem");
        if(itemEl && (
          itemEl.closest("#loadoutStash") ||
          !document.getElementById("efrLoadoutMount")
        )){
          toggleStorageSellTarget(
            "stash",
            Number(itemEl.dataset.gridItemIndex)
          );
        }
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

      if(type==="itemDetailClose"){
        closeItemDetail();
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

      if(type==="facilityPlace"){
        const key=String(action.dataset.key||"");
        tab="garden";
        window.EFRGarden?.selectFacility?.(key);
        render();
        return;
      }

      if(type==="facilityOpen"){
        const key=String(action.dataset.key||"");
        if(!facilityBuilt(key)){
          tab="garden";
          window.EFRGarden?.selectFacility?.(key);
          render();
          return;
        }
        if(key==="training"){
          window.EFRTraining?.open?.();
          return;
        }
        const targetTab=facilityTab(key);
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

      if(type==="gardenSelectFacility"){
        window.EFRGarden?.selectFacility?.(action.dataset.facilityKey);
        return;
      }

      if(type==="gardenFacilitySelect"){
        window.EFRGarden?.selectFacilityObject?.(
          Number(action.dataset.gardenX),
          Number(action.dataset.gardenY)
        );
        return;
      }

      if(type==="gardenPlaceFacility"){
        window.EFRGarden?.placeFacility?.(
          window.EFRGarden?.selectedFacilityKey,
          Number(action.dataset.gardenX),
          Number(action.dataset.gardenY)
        );
        return;
      }

      if(type==="gardenMoveBlocked"){
        A()?.logMessage?.("移動先には既に設備があります。空きマスを選んでください");
        return;
      }

      if(type==="gardenOccupiedBlocked"){
        A()?.logMessage?.("そのマスは使用中です。施設を置くには空きマスを選んでください");
        return;
      }

      if(type==="gardenFacilityOpen"){
        const key=String(action.dataset.facilityKey||"");
        if(facilityBuilt(key)){
          if(key==="training"){window.EFRTraining?.open?.();return;}
          const targetTab=facilityTab(key);
          if(targetTab){tab=targetTab;render();}
        }else{
          tab="garden";
          window.EFRGarden?.selectFacility?.(key);
          render();
        }
        return;
      }

      if(type==="gardenFacilityUpgrade"){
        const key=String(action.dataset.facilityKey||"");
        if(facilityBuilt(key))openFacilityUpgrade(key);
        return;
      }

      if(type==="gardenFacilityMove"){
        window.EFRGarden?.startFacilityMove?.();
        return;
      }

      if(type==="gardenFacilityMoveCancel"){
        window.EFRGarden?.cancelFacilityMove?.();
        return;
      }

      if(type==="gardenMoveFacility"){
        window.EFRGarden?.moveSelectedFacility?.(
          Number(action.dataset.gardenX),
          Number(action.dataset.gardenY)
        );
        return;
      }

      if(type==="gardenFacilityRemoveRequest"){
        window.EFRGarden?.requestFacilityRemoval?.();
        return;
      }

      if(type==="gardenFacilityRemoveConfirm"){
        window.EFRGarden?.confirmFacilityRemoval?.();
        return;
      }

      if(type==="gardenFacilityRemoveCancel"){
        window.EFRGarden?.cancelFacilityRemoval?.();
        return;
      }

      if(type==="gardenFacilitySelectionCancel"){
        window.EFRGarden?.select?.("field");
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
        return;
      }

      if(type==="craftQueueAdd"){
        const row=action.closest(".hubRecipe");
        const quantity=row?.querySelector("[data-craft-quantity]")?.value;
        window.EFRBaseCore?.enqueueCraft?.(
          action.dataset.recipeId,
          Number(quantity||1)
        );
        return;
      }

      if(type==="craftQueueProcess"){
        window.EFRBaseCore?.processCraftQueue?.();
        return;
      }

      if(type==="craftQueueCancel"){
        window.EFRBaseCore?.cancelCraftQueue?.(Number(action.dataset.queueIndex));
        return;
      }

      if(type==="toggleStorageSellMode"){
        storageSellMode=true;
        storageSellSelection.clear();
        storageGridSelection=null;
        render();
        return;
      }

      if(type==="setShopMode"){
        const nextMode=String(action.dataset.mode||"");
        if(nextMode==="buy"||nextMode==="sell"){
          shopMode=nextMode;
          shopCategory="all";
          render();
        }
        return;
      }

      if(type==="setShopCategory"){
        shopCategory=String(action.dataset.category||"all");
        render();
        return;
      }

      if(type==="purchaseShopProduct"){
        window.EFRBaseCore?.purchaseShopProduct?.(
          action.dataset.productId
        );
        return;
      }

      if(type==="sellShopTarget"){
        const targetKey=String(action.dataset.targetKey||"");
        const target=storageSellTargets().find(entry=>entry.key===targetKey);
        if(!target||target.protected){
          A()?.logMessage?.(target?.protected?"このアイテムは売却保護中です":"売却対象が見つかりません");
          render();
          return;
        }

        const result=target.source==="stash"
          ? {success:sellStashItem(target.index)}
          : window.EFRBaseCore?.sellSelectedStorageItems?.([{
              source:target.source,
              index:target.index,
              petId:target.petId,
              keyType:target.item?.keyType
            }]);
        if(!result?.success){
          A()?.logMessage?.("売却対象に変更があったため売却できませんでした");
          render();
        }
        return;
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

      if(type==="dismantleEquipment"){
        const index=Number(action.dataset.index);
        const item=A()?.save?.stash?.[index];
        if(item&&X()?.isDismantleTarget?.(item)){
          const blockReason=X()?.dismantleBlockReason?.(item)||"";
          if(blockReason){
            A()?.logMessage?.("分解できません: "+blockReason);
            return;
          }
          const yieldText=X()?.dismantleYieldText?.(item)||"素材";
          if(window.confirm("「"+itemName(item)+"」を分解して、"+yieldText+"を回収します。\nこの操作は元に戻せません。続けますか？")){
            X()?.dismantleStashEquipment?.(index);
          }
        }
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
          "stash",
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

      if(type==="gardenFieldSelect"){
        window.EFRGarden?.selectField?.(
          Number(action.dataset.gardenX),
          Number(action.dataset.gardenY)
        );
        return;
      }

      if(type==="gardenTreeSelect"){
        window.EFRGarden?.selectTree?.(
          Number(action.dataset.gardenX),
          Number(action.dataset.gardenY)
        );
        return;
      }

      if(type==="gardenSelectSeed"){
        window.EFRGarden?.selectSeed?.(action.dataset.gardenSeed);
        return;
      }

      if(type==="gardenPlantSeed"){
        window.EFRGarden?.plantSeed?.(
          Number(action.dataset.gardenX),
          Number(action.dataset.gardenY)
        );
        return;
      }

      if(type==="gardenWater"){
        window.EFRGarden?.waterField?.(
          Number(action.dataset.gardenX),
          Number(action.dataset.gardenY)
        );
        return;
      }

      if(type==="gardenWaterAll"){
        window.EFRGarden?.waterAll?.();
        return;
      }

      if(type==="gardenClearWiltedCrop"){
        window.EFRGarden?.clearWiltedCrop?.(
          Number(action.dataset.gardenX),
          Number(action.dataset.gardenY)
        );
        return;
      }

      if(type==="gardenHarvest"){
        window.EFRGarden?.harvest?.(
          Number(action.dataset.gardenX),
          Number(action.dataset.gardenY)
        );
        return;
      }

      if(type==="gardenTreeHarvest"){
        window.EFRGarden?.harvestTree?.(
          Number(action.dataset.gardenX),
          Number(action.dataset.gardenY)
        );
        return;
      }

      if(type==="gardenUpgrade"){
        window.EFRGarden?.upgrade?.();
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
        if(
          event.target.closest("#efrLoadoutPanel.efrLoadoutInline") &&
          !storageSellMode &&
          !event.target.closest("#loadoutStash [data-action]")
        )return;
        lastPanelActivation=Date.now();
        event.preventDefault();
        handlePanelTap(event);
      },
      {passive:false}
    );

    panel.addEventListener(
      "click",
      event=>{
        if(
          event.target.closest("#efrLoadoutPanel.efrLoadoutInline") &&
          !storageSellMode &&
          !event.target.closest("#loadoutStash [data-action]")
        )return;
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
    if(!a||!base)return "";

    const facilityCount=Object.keys(facilities()).length;
    const gardenSize=window.EFRGarden?.sizeLabel?.()||"6 × 4";

    return `
      <div class="hubFacilityDashboard">
        <section class="hubFacilityIntro">
          <div class="efrBaseEyebrow">SAFEHOUSE / OPERATIONS</div>
          <div class="hubFacilityIntroRow">
            <div>
              <h3>施設ネットワーク</h3>
              <p>拠点の設備を整え、次の探索に備えます。</p>
            </div>
            <span class="hubFacilityLevel">BASE · Lv.${Number(base.level||1)}</span>
          </div>
        </section>

        <section class="hubSection hubFacilitySection">
          <div class="hubDashboardSectionHead">
            <div>
              <h3>運用施設</h3>
              <p>「開く」で機能へ移動し、「強化」で施設を成長させます。</p>
            </div>
            <span>${facilityCount} FACILITIES</span>
          </div>
          <div class="facilityGrid hubFacilityHomeGrid">
            ${renderFacilities()}
          </div>
        </section>

        <section class="hubSection hubGardenSection">
          <div class="hubDashboardSectionHead">
            <div>
              <h3>拠点の配置</h3>
              <p>畑・木・花・池・加工設備・家畜小屋・通常施設は同じ限られた敷地を使います。</p>
            </div>
            <span>BASE AREA</span>
          </div>
          <article class="hubFacilityCard hubGardenCard">
            <div class="hubFacilityMain">
                <strong>🏗️ 拠点の配置</strong>
                <b>${gardenSize}</b>
              </div>
              <span>畑・木・花・池・倉庫・工房・研究所などを同じ敷地に配置できます。敷地が共通なので、建設する設備を選んで使い方を決めます。</span>
              <small>設置済みの施設は、このグリッドだけでなく既存メニューから直接利用できます。</small>
            <div class="hubFacilityActions">
              <button type="button" class="hubPrimary" data-action="openTab" data-tab="garden">配置を編集</button>
            </div>
          </article>
        </section>
      </div>
    `;
  }

  function renderStorage(){
    if(!facilityBuilt("storage"))return renderFacilityUnavailable("storage");
    const a=A();
    const stash=Array.isArray(a?.save?.stash)?a.save.stash:[];
    const capacity=storageCapacity();
    const saleTargets=storageSellTargets();
    const selectedTargets=saleTargets.filter(target=>
      !target.protected && storageSellSelection.has(target.key)
    );
    const selectedTotal=selectedTargets.reduce(
      (sum,target)=>sum+target.price,
      0
    );
    const extraTargets=saleTargets.filter(target=>
      target.source!=="stash"
    );

    const salePanel=storageSellMode
      ? `
        <div class="hubInfoCard">
          <strong>売却モード</strong>
          <p>倉庫アイテムを複数タップして選択します。ペットと保管鍵は下のカードから選べます。</p>
          <p>選択中：${selectedTargets.length}件 / 合計 ${selectedTotal}</p>
          <div class="hubActions">
            <button data-action="confirmStorageSell" ${selectedTargets.length?"":"disabled"}>選択したアイテムを売却</button>
            <button data-action="clearStorageSellSelection" ${selectedTargets.length?"":"disabled"}>選択解除</button>
            <button data-action="toggleStorageSellMode">終了</button>
          </div>
        </div>
        <div class="hubSection">
          <h4>動物ケージ・鍵保管</h4>
          <div class="hubRecipeGrid">
            ${extraTargets.length
              ? extraTargets.map(target=>{
                  const selected=!target.protected&&storageSellSelection.has(target.key);
                  const label=target.source==="pet"?"ペット（動物ケージ）":"鍵（永続鍵保管）";
                  const basicValue=Number(window.EFRBaseCore?.itemBasicValue?.(target.item)||0);
                  return `
                    <div class="hubRecipe${selected?" efrSellSelected":""}">
                      <strong>${esc(target.label)}</strong>
                      <small>${target.protected?"売却保護中":label}</small>
                      <small>基本価値：${basicValue} / 売却価格：${target.price}</small>
                      <button
                        data-action="toggleStorageSaleProtection"
                        data-sell-type="${target.source}"
                        data-index="${target.index??""}"
                        data-pet-id="${esc(target.petId||"")}"
                      >${target.protected?"保護解除":"売却保護"}</button>
                      <button
                        data-action="toggleStorageSellTarget"
                        data-sell-type="${target.source}"
                        data-index="${target.index??""}"
                        data-pet-id="${esc(target.petId||"")}"
                        ${target.protected?"disabled":""}
                      >${target.protected?"保護中":selected?"選択解除":"選択"}</button>
                    </div>
                  `;
                }).join("")
              : `<p>選択できるペット・保管鍵はありません。</p>`
            }
          </div>
        </div>
      `
      : `
        <div class="hubInfoCard">
          <p>売却モードでは複数のアイテムをまとめて売却できます。ペットと保管鍵も対象にできます。</p>
          <button data-action="toggleStorageSellMode">売却モード</button>
        </div>
      `;

    if(window.EFRLoadout?.mountInline){
      return `
        <div class="hubSection efrStorageWorkspace">
          ${salePanel}
          <div id="efrLoadoutMount" class="efrLoadoutMount"></div>
        </div>
      `;
    }

    if(!window.EFRGrid){
      return `
        <div class="hubSection">
          <h3>倉庫内容</h3>
          ${salePanel}
          <div class="hubStorage">
            ${stash.map((item,index)=>{
              const protectedState=item?.kind==="pet"
                ? Boolean(a?.save?.animals?.find(animal=>String(animal?.id||"")===String(item.petId||""))?.sellProtected===true)
                : item?.sellProtected===true;
              const selected=!protectedState&&storageSellSelection.has("stash:"+index);
              return `
                <div class="hubItem${selected?" efrSellSelected":""}">
                  <div>
                    <strong>${esc(itemName(item))}</strong>
                    <small>${esc(kindName(item))} / ${item?.slots||1}スロット</small>
                    ${storageSellMode?`<small>売却価格：${itemSellPrice(item)}</small>`:""}
                  </div>
                  ${storageSellMode
                    ? `<button data-action="toggleStorageSaleProtection" data-sell-type="stash" data-index="${index}">${protectedState?"保護解除":"売却保護"}</button><button data-action="toggleStorageSellTarget" data-sell-type="stash" data-index="${index}" ${protectedState?"disabled":""}>${protectedState?"保護中":selected?"選択解除":"選択"}</button>`
                    : item?.kind==="blueprint"
                      ? `<button data-action="useBlueprint" data-index="${index}">使用</button>`
                      : `<span>${item?.amount ? "×"+item.amount : ""}</span>`
                  }
                </div>
              `;
            }).join("")||`<p>倉庫は空です。</p>`}
          </div>
        </div>
      `;
    }

    const grid=window.EFRGrid.render(
      stash,
      capacity,
      (item,index)=>{
        const protectedState=item?.kind==="pet"
          ? Boolean(a?.save?.animals?.find(animal=>String(animal?.id||"")===String(item.petId||""))?.sellProtected===true)
          : item?.sellProtected===true;
        const selected=!protectedState&&storageSellSelection.has("stash:"+index);
        return `
          <div class="efrSlotItemBody">
            <strong>${esc(itemName(item))}</strong>
            <small>${esc(kindName(item))} / ${item?.slots||1}マス</small>
            ${item?.amount?`<b class="efrSlotAmount">×${item.amount}</b>`:""}
            ${storageSellMode
              ? `<small>${protectedState?"売却保護中":selected?"✓ 選択中":"タップして選択"} / 売却価格：${itemSellPrice(item)}</small><button data-action="toggleStorageSaleProtection" data-sell-type="stash" data-index="${index}">${protectedState?"保護解除":"売却保護"}</button>`
              : item?.kind==="blueprint"
                ? `<button data-action="useBlueprint" data-index="${index}">使用</button>`
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
            <p>使用 ${grid.used} / ${capacity} マス</p>
          </div>
          <strong>マス式倉庫</strong>
        </div>
        ${salePanel}
        ${grid.html}
        <p class="hubInfoCard">
          ${storageSellMode
            ? "選択した倉庫アイテムはスタック全量が売却されます。装備中のペットは売却対象外です。"
            : "設計図を使用すると、その設計図に対応するレシピが研究対象として解放されます。"
          }
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
      `<div class="hubSection"><p>拠点の配置を読み込めません。</p></div>`;
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

  function formatUpgradeCost(cost){
    const entries=Object.entries(cost||{})
      .filter(([,amount])=>Number(amount)>0);
    return entries.length
      ? entries.map(([name,amount])=>name+" ×"+Number(amount)).join(" / ")
      : "素材なし";
  }

  function maintenanceUnlockLevel(mode,target){
    const value=Math.max(1,Number(target)||1);
    if(mode==="level")return value<=5?3:value<=7?4:5;
    return value<=2?3:value<=3?4:5;
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
    const limits=X()?.maintenanceLimits?.()||{maxLevel:0,maxRarity:0};

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

    const maintenanceCap=entry.mode==="level"
      ? Number(limits.maxLevel||0)
      : Number(limits.maxRarity||0);
    if(target>maintenanceCap){
      return {
        status:"整備台Lv."+maintenanceUnlockLevel(entry.mode,target)+"で解放",
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
            ? X()?.armorLevelCost?.(step,item)||{}
            : X()?.weaponLevelCost?.(step,item)||{};
      }else{
        stepCost=
          isBackpack
            ? X()?.backpackRarityCost?.(step,item)||{}
            : isArmor
              ? X()?.armorRarityCost?.(step,item)||{}
              : X()?.weaponRarityCost?.(step,item)||{};
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
    const limits=X()?.maintenanceLimits?.()||{maxLevel:0,maxRarity:0};
    const levelCap=Math.max(0,Math.min(10,Number(limits.maxLevel)||0));
    const rarityCap=Math.max(0,Math.min(5,Number(limits.maxRarity)||0));
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

    const levelOptions=hasLevel&&levelTarget<levelCap
      ? Array.from(
          {length:levelCap-levelTarget},
          (_,i)=>levelTarget+i+1
        ).map(value=>`
          <option
            value="${value}"
            ${Number(levelEntry?.target||0)===value?"selected":""}
          >Lv.${value}</option>
        `).join("")
      : "";

    const rarityOptions=
      (isWeapon||isArmor||isBackpack)&&rarityTarget<rarityCap
        ? Array.from(
            {length:rarityCap-rarityTarget},
            (_,i)=>rarityTarget+i+1
          ).map(value=>`
            <option
              value="${value}"
              ${Number(rarityEntry?.target||0)===value?"selected":""}
            >${esc(wishlistRarityName(item,value))}</option>
        `).join("")
      : "";

    const savedLevelTarget=Number(levelEntry?.target||0);
    const savedRarityTarget=Number(rarityEntry?.target||0);
    const levelHint=hasLevel&&levelCap<10&&(
      levelTarget>=levelCap||savedLevelTarget>levelCap
    )
      ? "整備台Lv."+maintenanceUnlockLevel(
          "level",
          savedLevelTarget>levelCap?savedLevelTarget:levelCap+1
        )+"で上限解放"
      : "";
    const rarityHint=(isWeapon||isArmor||isBackpack)&&rarityCap<5&&(
      rarityTarget>=rarityCap||savedRarityTarget>rarityCap
    )
      ? "整備台Lv."+maintenanceUnlockLevel(
          "rarity",
          savedRarityTarget>rarityCap?savedRarityTarget:rarityCap+1
        )+"で上限解放"
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
        ${levelHint ? "<small>"+esc(levelHint)+"</small>" : ""}
        ${rarityHint ? "<small>"+esc(rarityHint)+"</small>" : ""}
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
    const queueRows=window.EFRBaseCore?.craftingQueue?.()||[];
    if(!["workbench","workshop","medical","kitchen"].some(facilityBuilt)&&!queueRows.length)return renderFacilityUnavailable("workbench");
    const x=X();
    const a=A();
    const recipes=x?.recipes || [];
    const queueUnits=queueRows.reduce((sum,job)=>sum+Math.max(1,Number(job.quantity)||1),0);

    const available=name=>materialCount(name);

    return `
      <div class="hubSection">
        <h3>クラフト</h3>

        <section class="hubSection">
          <h3>作業予約（${queueUnits}回）</h3>
          <p>予約素材は倉庫に残して確保します。他の製作・研究・施設強化・拠点設備の素材消費には使えず、予約解除すると使用可能に戻ります。完成品が倉庫に入らない場合、予約は維持され素材は消費されません。</p>
          <button data-action="craftQueueProcess" ${queueRows.length?"":"disabled"}>次の予約を1回製作</button>
          ${queueRows.length?`<div class="hubRecipeGrid">${queueRows.map((job,index)=>{
            const quantity=Math.max(1,Number(job.quantity)||1);
            const costText=Object.entries(job.cost||{}).map(([name,count])=>`${esc(name)} ×${Math.max(0,Number(count)||0)*quantity}`).join(" / ");
            const recipe=recipes.find(entry=>entry?.id===job.recipeId||entry?.name===job.name);
            const facilityKey=String(recipe?.facility||"");
            const requiredLevel=Math.max(1,Math.floor(Number(recipe?.level)||1));
            const facilityName=String(facilities()[facilityKey]?.name||facilityKey||"担当設備");
            const facilityStatus=!recipe
              ? "レシピ不明（予約解除が必要）"
              : !facilityBuilt(facilityKey)
                ? facilityName+"が未設置"
                : facilityLevel(facilityKey)<requiredLevel
                  ? facilityName+" Lv."+requiredLevel+"が必要"
                  : "利用可能";
            return `<div class="hubRecipe">
              <strong>${index+1}. ${esc(job.name)} ×${quantity}回</strong>
              <small>確保中の素材：${costText||"なし"}</small>
              <small>設備：${esc(facilityStatus)}</small>
              <button data-action="craftQueueCancel" data-queue-index="${index}">予約解除</button>
            </div>`;
          }).join("")}</div>`:`<p>作業予約はありません。</p>`}
        </section>

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

            const facilityIsBuilt=facilityBuilt(facility);
            const facilityOk=facilityIsBuilt&&currentFacilityLevel>=level;

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
                  : !facilityIsBuilt
                    ? (facilityDef?.name||facility)+"が未建設"
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
                    .map(([n,c])=>`${esc(n)} ×${c}（使用可能 ${available(n)}）`)
                    .join(" / ")}
                </small>

                <label>予約する製作回数
                  <input type="number" data-craft-quantity min="1" max="99" value="1" inputmode="numeric" ${facilityIsBuilt?"":"disabled"}>
                </label>
                <button
                  data-action="craftQueueAdd"
                  data-recipe-id="${esc(id)}"
                  ${canCraft?"":"disabled"}>
                  予約に追加
                </button>
                <button
                  data-action="${facilityIsBuilt?"craft":"facilityPlace"}"
                  data-key="${esc(facility)}"
                  data-recipe-id="${esc(id)}"
                  ${canCraft||!facilityIsBuilt?"":"disabled"}>
                  ${facilityIsBuilt?"今すぐ製作（"+status+"）":(facilityDef?.name||facility)+"を拠点に建設"}
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

  function renderShop(){
    if(!facilityBuilt("shop"))return renderFacilityUnavailable("shop");
    const a=A();
    const money=currency();
    const purchaseProducts=window.EFRBaseCore?.shopProducts?.()||[];
    const saleTargets=storageSellTargets();
    const purchaseCategory=product=>product?.category==="回復"?"回復品":String(product?.category||"その他");
    const saleCategory=item=>{
      const kind=typeof item==="string"?"material":String(item?.kind||"");
      return ({
        material:"素材",
        ammo:"弾薬",
        heal:"回復品",
        mpRestore:"回復品",
        weapon:"武器",
        firearm:"武器",
        armor:"防具",
        backpack:"バッグ",
        weaponPart:"武器パーツ",
        pet:"ペット",
        key:"鍵",
        blueprint:"設計図",
        loot:"戦利品",
        repair:"修理",
        tool:"工具"
      })[kind]||"その他";
    };
    const mode=shopMode==="sell"?"sell":"buy";
    const categoryOrder=["素材","弾薬","回復品","武器","防具","バッグ","武器パーツ","ペット","鍵","設計図","戦利品","修理","工具","その他"];
    const availableCategories=new Set(
      mode==="buy"
        ? purchaseProducts.map(purchaseCategory)
        : saleTargets.map(target=>saleCategory(target.item))
    );
    const categories=[
      ...categoryOrder.filter(category=>availableCategories.has(category)),
      ...Array.from(availableCategories).filter(category=>!categoryOrder.includes(category))
    ];
    const selectedCategory=categories.includes(shopCategory)?shopCategory:"all";
    if(shopCategory!==selectedCategory)shopCategory=selectedCategory;
    const total=mode==="buy"?purchaseProducts.length:saleTargets.length;
    const categoryCount=category=>mode==="buy"
      ? purchaseProducts.filter(product=>purchaseCategory(product)===category).length
      : saleTargets.filter(target=>saleCategory(target.item)===category).length;
    const categoryButtons=[
      `<button type="button" data-action="setShopCategory" data-category="all" class="${selectedCategory==="all"?"active":""}" aria-pressed="${selectedCategory==="all"}">すべて (${total})</button>`,
      ...categories.map(category=>`<button type="button" data-action="setShopCategory" data-category="${esc(category)}" class="${selectedCategory===category?"active":""}" aria-pressed="${selectedCategory===category}">${esc(category)} (${categoryCount(category)})</button>`)
    ].join("");
    const visibleProducts=mode==="buy"
      ? purchaseProducts.filter(product=>selectedCategory==="all"||purchaseCategory(product)===selectedCategory)
      : [];
    const visibleSaleTargets=mode==="sell"
      ? saleTargets.filter(target=>selectedCategory==="all"||saleCategory(target.item)===selectedCategory)
      : [];

    return `
      <div class="hubSection">
        <h3>ショップ</h3>
        <div class="hubInfoCard">
          <strong>所持金：${money}</strong>
          <p>${mode==="buy"
            ? "基本素材・弾薬・基本回復品を購入できます。購入品は倉庫へ格納され、倉庫に入らない場合は所持金を消費しません。"
            : "倉庫アイテム、売却可能な動物ケージ内ペット、永続鍵保管の鍵を1件ずつ売却できます。売却保護中の対象は売却できません。"}</p>
        </div>

        <div class="hubShopModeSwitch" role="group" aria-label="購入と売却の切り替え">
          <button type="button" data-action="setShopMode" data-mode="buy" class="${mode==="buy"?"active":""}" aria-pressed="${mode==="buy"}">購入</button>
          <button type="button" data-action="setShopMode" data-mode="sell" class="${mode==="sell"?"active":""}" aria-pressed="${mode==="sell"}">売却</button>
        </div>

        <section class="hubSection">
          <h4>${mode==="buy"?"商品を購入":"アイテムを売却"}</h4>
          <p>${mode==="buy"
            ? "素材は1個、弾薬は1パック、回復品は1個単位です。購入価格を確認して購入してください。"
            : "カテゴリを選んで対象を絞り込めます。スタックアイテムは1枠分をまとめて売却します。"}</p>
          <div class="hubShopCategorySwitch" role="group" aria-label="商品カテゴリ">
            ${categoryButtons}
          </div>
          <div class="hubRecipeGrid">
            ${mode==="buy"
              ? visibleProducts.length
                ? visibleProducts.map(product=>{
                    const item=product.item;
                    const amount=item?.kind==="ammo"||item?.kind==="material"
                      ? Math.max(1,Number(item.amount||1))
                      : 1;
                    const enoughMoney=money>=Number(product.price||0);
                    const canStore=Boolean(window.EFRBaseCore?.canAddStashItems?.([item]));
                    return `
                      <div class="hubRecipe">
                        <strong>${esc(product.name)}</strong>
                        <small>${esc(purchaseCategory(product))}${amount>1?" / ×"+amount:""}</small>
                        <small>購入価格：${Number(product.price||0)}</small>
                        <button type="button" data-action="purchaseShopProduct" data-product-id="${esc(product.id)}" ${enoughMoney&&canStore?"":"disabled"}>${canStore?(enoughMoney?"購入":"所持金不足"):"倉庫満杯"}</button>
                      </div>
                    `;
                  }).join("")
                : `<p class="hubShopEmpty">このカテゴリに購入できる商品はありません。</p>`
              : visibleSaleTargets.length
                ? visibleSaleTargets.map(target=>{
                    const item=target.item;
                    const amount=item?.kind==="ammo"||item?.kind==="material"
                      ? Math.max(1,Number(item.amount||1))
                      : 1;
                    const sourceLabel=target.source==="pet"?" / 動物ケージ":target.source==="key"?" / 永続鍵保管":"";
                    return `
                      <div class="hubRecipe">
                        <strong>${esc(target.label)}</strong>
                        <small>${esc(saleCategory(item))}${amount>1?" / ×"+amount:""}${sourceLabel}</small>
                        <small>${target.protected?"売却保護中 / ":""}売却価格：${Number(target.price||0)}</small>
                        <button type="button" data-action="sellShopTarget" data-target-key="${esc(target.key)}" ${target.protected?"disabled":""}>${target.protected?"売却保護中":"売却"}</button>
                      </div>
                    `;
                  }).join("")
                : `<p class="hubShopEmpty">このカテゴリに売却できるアイテムはありません。</p>`
            }
          </div>
        </section>
      </div>
    `;
  }

  function renderResearch(){
    if(!facilityBuilt("research"))return renderFacilityUnavailable("research");
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
            const researchFacilityOk=facilityBuilt("research")&&researchFacilityLevel>=level;
            const craftingFacilityIsBuilt=facilityBuilt(r?.facility);
            const craftingFacilityOk=craftingFacilityIsBuilt&&craftingFacilityLevel>=level;
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
                    : !craftingFacilityIsBuilt
                      ? (facilities()[r?.facility]?.name||r?.facility)+"が未建設"
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
                  data-action="${craftingFacilityIsBuilt?"research":"facilityPlace"}"
                  data-key="${esc(r?.facility||"workbench")}"
                  data-recipe-id="${esc(id)}"
                  ${canResearch||!craftingFacilityIsBuilt?"":"disabled"}>
                  ${craftingFacilityIsBuilt?status:(facilities()[r?.facility]?.name||r?.facility)+"を拠点に建設"}
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
    if(!facilityBuilt("maintenance"))return renderFacilityUnavailable("maintenance");
    const a=A();
    const eq=a.save.equipment || {};
    const limits=X()?.maintenanceLimits?.()||{level:0,maxLevel:0,maxRarity:0};
    const rarityLabels=["","コモン","アンコモン","レア","エピック","レジェンダリー"];

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
        <p>強化は成功率制です。失敗時は素材を消費しますが、装備のレベル／レアリティは変化しません。</p>
        <p>整備台Lv.${limits.level}：修理Lv.1／分解Lv.2／装備強化Lv.3。強化上限はLv.${limits.maxLevel||"未解放"}・レアリティ${limits.maxRarity?rarityLabels[limits.maxRarity]:"未解放"}です（Lv.4：Lv.7/Rare、Lv.5：Lv.10/Legendary）。</p>

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

            const levelMax=limits.maxLevel;
            const rarityMax=limits.maxRarity;
            const levelChance=hasLevel&&level<levelMax
              ? (X()?.equipmentUpgradeChance?.("level",level+1)??null)
              : null;
            const rarityChance=isProgressionTarget&&rarity<rarityMax
              ? (X()?.equipmentUpgradeChance?.("rarity",rarity+1)??null)
              : null;

            const levelCost=
              hasLevel && levelMax===0
                ? "整備台Lv.3で解放"
                : hasLevel && level<levelMax
                ? (
                    isArmor
                      ? formatUpgradeCost(X()?.armorLevelCost?.(level+1,x)||{})
                      : formatUpgradeCost(X()?.weaponLevelCost?.(level+1,x)||{})
                  )
                : hasLevel
                  ? (level>=10?"Lv.最大":"上限（整備台強化で解放）")
                  : "";

            const rarityCost=
              isProgressionTarget && rarityMax===0
                ? "整備台Lv.3で解放"
                : isProgressionTarget && rarity<rarityMax
                ? (
                    isArmor
                      ? formatUpgradeCost(X()?.armorRarityCost?.(rarity+1,x)||{})
                      : isBackpack
                        ? formatUpgradeCost(X()?.backpackRarityCost?.(rarity+1,x)||{})
                        : formatUpgradeCost(X()?.weaponRarityCost?.(rarity+1,x)||{})
                  )
                : (rarity>=5?"レア度最大":"上限（整備台強化で解放）");

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
                            ? `Lv.${level}/${levelMax||"未解放"} / `
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
                              ${level<levelMax?"Lv."+(level+1)+"へ":levelMax===0?"整備台Lv.3が必要":"上限Lv."+levelMax}
                            </button>

                            <small>
                              ${esc(levelCost)}
                            </small>
                            ${levelChance!==null?`<small>成功率 ${levelChance}%（失敗時は素材消費）</small>`:""}
                          `
                          : ""
                      }

                      <button
                        data-action="equipmentRarity"
                        data-kind="${isBackpack?"backpack":isArmor?"armor":"weapon"}"
                        data-slot="${slot}"
                        ${rarity<rarityMax?"":"disabled"}>
                        ${rarity<rarityMax?"レア度"+(rarity+1)+"へ":rarityMax===0?"整備台Lv.3が必要":rarity>=5?"レア度最大":"上限（整備台強化で解放）"}
                      </button>

                      <small>
                        ${esc(rarityCost)}
                      </small>
                      ${rarityChance!==null?`<small>成功率 ${rarityChance}%（失敗時は素材消費）</small>`:""}

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
            ${(A()?.save?.stash||[])
              .map((part,index)=>({
                part,
                index
              }))
              .filter(entry=>entry.part?.kind==="weaponPart")
              .map(({part,index})=>{
              const rarity=Math.max(
                1,
                Math.min(5,Number(part?.rarity||1))
              );
              const max=rarity>=rarityMax;
              const target=rarity+1;
              const capLabel=rarity>=5?"レア度最大":rarityMax===0?"整備台Lv.3が必要":"上限（整備台強化で解放）";
              const cost=max
                ? null
                : X()?.weaponRarityCost?.(target,part)||{};
              const chance=max
                ? null
                : (X()?.equipmentUpgradeChance?.("rarity",target)??null);

              const costText=max
                ? capLabel
                : formatUpgradeCost(cost);

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
                    ${max?capLabel:"レア度"+target+"へ"}
                  </button>

                  <small>${esc(costText)}</small>
                  ${chance!==null?`<small>成功率 ${chance}%（失敗時は素材消費）</small>`:""}
                </div>
              `;
              }).join("") || `
              <div class="hubUpgrade">
                <span>所持している武器パーツはありません</span>
              </div>
            `}
          </div>
        </div>

        <div class="hubSection">
          <h3>装備分解（整備台Lv.2）</h3>
          <p>倉庫内の未装備の武器・銃器・防具・バッグを分解して素材を回収します。素材を倉庫へ格納できない場合は分解されません。</p>
          <div class="hubUpgradeGrid">
            ${
              limits.level<2
                ? `<div class="hubUpgrade"><span>整備台Lv.2で解放</span></div>`
                : (A()?.save?.stash||[])
                  .map((item,index)=>({item,index}))
                  .filter(({item})=>X()?.isDismantleTarget?.(item))
                  .map(({item,index})=>{
                    const rarity=Math.max(1,Math.min(5,Number(item?.rarity||1)));
                    const hasLevel=item?.kind==="weapon"||item?.kind==="firearm"||item?.kind==="armor";
                    const level=item?.kind==="armor"?Number(item.armorLevel||1):Number(item?.weaponLevel||1);
                    const detail=(hasLevel?"Lv."+level+" / ":"")+(rarityLabels[rarity]||"コモン");
                    const yieldText=X()?.dismantleYieldText?.(item)||"素材";
                    const blockReason=X()?.dismantleBlockReason?.(item)||"";
                    return `
                      <div class="hubUpgrade">
                        <strong>${esc(itemName(item))}</strong>
                        <small>${esc(detail)}</small>
                        <small>${blockReason?esc(blockReason):"回収："+esc(yieldText)}</small>
                        <button data-action="dismantleEquipment" data-index="${index}" ${blockReason?"disabled":""}>${blockReason?"準備が必要":"分解"}</button>
                      </div>
                    `;
                  }).join("")||`<div class="hubUpgrade"><span>分解できる装備はありません</span></div>`
            }
          </div>
        </div>
      </div>
    `;
  }

  function renderWishlistPreview(target,carriedItems=[]){
    if(!target)return null;

    const a=A();
    const list=Array.isArray(a?.save?.wishlist)
      ? a.save.wishlist
      : [];
    const recipes=X()?.recipes||[];
    const carried={};
    const totals={};

    for(const item of Array.isArray(carriedItems)?carriedItems:[]){
      if(
        typeof item!=="string" &&
        item?.kind!=="material" &&
        item?.kind!=="loot"
      ){
        continue;
      }

      const name=String(
        typeof item==="string"
          ? item
          : item?.name||""
      );

      if(!name)continue;

      carried[name]=
        Number(carried[name]||0)+
        Math.max(
          1,
          Number(
            typeof item==="string"
              ? 1
              : item.amount||1
          )
        );
    }

    const goals=list.map(entry=>{
      let title="";
      let detail="";
      let cost={};

      if(entry?.type==="recipe"){
        const recipe=recipes.find(item=>
          String(item?.id||"")===String(entry.recipeId||"")
        );

        title=recipe?.name||"レシピ未確認";
        detail=recipe
          ? `${facilities()[recipe.facility]?.name||recipe.facility||"クラフト"} Lv.${Number(recipe.level||1)}`
          : "現在のレシピ一覧にありません";
        cost=recipe?.cost||{};
      }else if(entry?.type==="upgrade"){
        const result=wishlistUpgradeCost(entry);
        const item=a?.save?.equipment?.[entry.slot];

        title=String(entry.itemName||"装備");
        detail=entry.mode==="level"
          ? `Lv.${result.current||"?"} → Lv.${result.target||entry.target} · ${result.status}`
          : `${wishlistRarityName(item,result.target||entry.target)} · ${result.status}`;
        cost=result.cost||{};
      }else{
        return null;
      }

      for(const [name,count] of Object.entries(cost)){
        totals[name]=Number(totals[name]||0)+Number(count||0);
      }

      return {title,detail};
    }).filter(Boolean);

    const materialRows=Object.entries(totals).map(([name,count])=>{
      const stored=materialCount(name);
      const inBag=Number(carried[name]||0);
      const secured=stored+inBag;
      const missing=Math.max(0,Number(count||0)-secured);

      return `
        <div class="efrWishlistPreviewMaterial">
          <span>
            <strong>${esc(name)}</strong>
            <small>倉庫 ${stored} · 携行 ${inBag}</small>
          </span>
          <strong class="efrWishlistPreviewProgress">
            ${secured}/${count}
            <em class="${missing?"missing":"ready"}">
              ${missing?`不足 ${missing}`:"充足"}
            </em>
          </strong>
        </div>
      `;
    });

    const missingTotal=Object.entries(totals).reduce(
      (sum,[name,count])=>
        sum+
        Math.max(
          0,
          Number(count||0)-
          materialCount(name)-
          Number(carried[name]||0)
        ),
      0
    );

    target.innerHTML=`
      <div class="efrWishlistPreviewGoals">
        ${
          goals.length
            ? goals.map(goal=>`
                <article class="efrWishlistPreviewGoal">
                  <strong>${esc(goal.title)}</strong>
                  <small>${esc(goal.detail)}</small>
                </article>
              `).join("")
            : `<div class="efrWishlistPreviewEmpty">
                 欲しいものが未登録です。拠点で目標を登録すると、探索中にも必要素材を確認できます。
               </div>`
        }
      </div>
      <div class="efrWishlistPreviewMaterials">
        <strong class="efrWishlistPreviewMaterialsTitle">素材の進捗</strong>
        ${
          materialRows.length
            ? materialRows.join("")
            : `<div class="efrWishlistPreviewEmpty">
                 ${list.length?"必要素材の不足はありません。":"目標を登録すると必要素材が表示されます。"}
               </div>`
        }
      </div>
    `;

    return {
      goalCount:list.length,
      missingTotal
    };
  }

  function storageSellInfo(index){
    return storageSellTargets().find(target=>
      target.source==="stash" &&
      Number(target.index)===Number(index)
    )||null;
  }

  function isStorageSellSelected(key){
    return storageSellSelection.has(String(key||""));
  }

  function isStorageSellMode(){
    return storageSellMode;
  }

  function refreshStats(){
    const a=A();
    const stats=document.getElementById("efrHubStats");
    if(!a||!stats)return;

    const base=ensureBase();
    const stash=Array.isArray(a.save.stash)?a.save.stash:[];
    const stashUsed=window.EFRGrid?.used?.(stash) ?? stash.length;
    stats.textContent=
      `所持金 ${currency()} / 脱出 ${a.save.escapes||0}回 / 拠点Lv.${base.level} / 倉庫 ${stashUsed}/${storageCapacity()}マス`;
  }

  function render(){
    ensure();

    const a=A();
    if(!a)return;
    window.EFRLoadout?.unmountInline?.();

    refreshStats();

    panel.querySelectorAll("[data-tab]").forEach(b=>{
      b.classList.toggle("active",b.dataset.tab===tab);
    });

    const content=document.getElementById("efrHubContent");

    if(tab==="base")content.innerHTML=renderBase();
    if(tab==="storage")content.innerHTML=renderStorage();
    if(tab==="craft")content.innerHTML=renderCraft();
    if(tab==="shop")content.innerHTML=renderShop();
    if(tab==="research")content.innerHTML=renderResearch();
    if(tab==="upgrade")content.innerHTML=renderUpgrade();
    if(tab==="wishlist")content.innerHTML=renderWishlist();
    if(tab==="character")content.innerHTML=renderCharacter();
    if(tab==="skill")content.innerHTML=renderSkill();
    if(tab==="pet")content.innerHTML=renderPet();
    if(tab==="garden")content.innerHTML=renderGarden();

    if(tab==="storage"){
      const mount=content.querySelector("#efrLoadoutMount");
      const inlineMounted=Boolean(
        mount && window.EFRLoadout?.mountInline?.(mount)
      );

      if(inlineMounted){
        storageGridSelection=null;
        content.querySelectorAll("#loadoutStash .efrSlotItem").forEach(element=>{
          const index=Number(element.dataset.gridItemIndex);
          const selected=storageSellMode &&
            storageSellSelection.has("stash:"+index);
          element.classList.toggle("efrSelected",Boolean(selected));
        });
      }else{
        content.querySelectorAll(".efrSlotItem").forEach(element=>{
          const index=Number(element.dataset.gridItemIndex);
          const selected=storageSellMode
            ? storageSellSelection.has("stash:"+index)
            : storageGridSelection===index;
          element.classList.toggle("efrSelected",Boolean(selected));
        });
      }
    }

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
    endStorageSellMode();
    tab="base";
    render();
    panel.classList.remove("hidden");
  }

  function openWishlist(){
    ensure();
    tab="wishlist";
    render();
    panel.classList.remove("hidden");
  }

  function close(){
    endStorageSellMode();
    window.EFRLoadout?.unmountInline?.();
    panel?.classList.add("hidden");
  }

  ensure();

  window.EFRHub={
    open,
    openWishlist,
    close,
    render,
    renderWishlistPreview,
    storageCapacity,
    refreshStats,
    isStorageSellMode,
    storageSellInfo,
    isStorageSellSelected,
    openWeaponDetail,
    openItemDetail,
    openPetDetail
  };

})();
