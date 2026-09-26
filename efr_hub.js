(function(){
  "use strict";

  const A=()=>window.EFRGame;
  const X=()=>window.EFRContentExpansion;

  let panel=null;
  let tab="base";

  const FACILITIES={
    storage:{
      name:"倉庫",
      desc:"保管上限を増やす",
      max:5,
      unlock:1,
      cost:[2,3,5,7]
    },
    workbench:{
      name:"工作台",
      desc:"簡易武器・消耗品・素材クラフトを強化する",
      max:5,
      unlock:1,
      cost:[2,3,5,7]
    },
    workshop:{
      name:"工房",
      desc:"近接武器・銃器・弓・防具の製作設備を強化する",
      max:5,
      unlock:2,
      cost:[2,4,6,8]
    },
    maintenance:{
      name:"整備台",
      desc:"武器・銃器・弓・防具・杖を修理する",
      max:5,
      unlock:2,
      cost:[2,3,5,7]
    },
    medical:{
      name:"医療設備",
      desc:"回復アイテムの製作設備を強化する",
      max:5,
      unlock:2,
      cost:[2,3,5,7]
    }
  };

  function clone(x){
    return x ? JSON.parse(JSON.stringify(x)) : x;
  }

  function ensureBase(){
    const a=A();
    if(!a)return null;

    a.save.base=a.save.base || {
      level:1,
      xp:0,
      facilities:{
        storage:1,
        workshop:1,
        medical:1,
        workbench:1
      }
    };

    a.save.base.facilities=Object.assign({
      storage:1,
      workshop:1,
      maintenance:1,
      medical:1,
      workbench:1
    },a.save.base.facilities||{});

    a.save.base.level=Math.max(
      1,
      Math.min(5,a.save.base.level||1)
    );

    a.save.base.xp=Math.max(
      0,
      a.save.base.xp||0
    );

    return a.save.base;
  }

  function materialCount(name){
    const a=A();
    let total=0;

    for(const x of a?.save?.stash||[]){
      if(typeof x==="string"){
        if(x===name)total++;
      }else if(x?.name===name){
        total+=x.amount||1;
      }
    }

    return total;
  }

  function takeMaterial(name,count){
    const a=A();
    let left=count;

    for(
      let i=(a.save.stash||[]).length-1;
      i>=0 && left>0;
      i--
    ){
      const x=a.save.stash[i];

      if(
        (typeof x==="string" && x===name) ||
        (x && x.name===name)
      ){
        const amount=
          typeof x==="string"
            ? 1
            : (x.amount||1);

        if(amount<=left){
          a.save.stash.splice(i,1);
          left-=amount;
        }else{
          x.amount=amount-left;
          left=0;
        }
      }
    }

    return left===0;
  }

  function facilityCost(key){
    const b=ensureBase();
    const f=FACILITIES[key];
    const lv=b.facilities[key]||1;

    return f?.cost?.[lv-1] || 999;
  }

  function upgradeFacility(key){
    const a=A();
    const b=ensureBase();
    const f=FACILITIES[key];

    if(!a||!b||!f)return false;

    const lv=b.facilities[key]||1;

    if(lv>=f.max){
      a.logMessage?.(f.name+"は最大レベルです");
      return false;
    }

    if(b.level<f.unlock){
      a.logMessage?.(
        "拠点Lv."+f.unlock+"で解放されます"
      );
      return false;
    }

    const cost=facilityCost(key);

    const high=materialCount("高品質金属");
    const scrap=materialCount("鉄くず");

    if(high+scrap<cost){
      a.logMessage?.(
        "高品質金属または鉄くずが不足しています"
      );
      return false;
    }

    // 高品質金属を優先
    const useHigh=Math.min(high,cost);
    const useScrap=cost-useHigh;

    if(useHigh && !takeMaterial("高品質金属",useHigh)){
      return false;
    }

    if(useScrap && !takeMaterial("鉄くず",useScrap)){
      for(let i=0;i<useHigh;i++){
        a.save.stash.push({
          name:"高品質金属",
          kind:"material",
          slots:1,
          weight:1
        });
      }
      return false;
    }

    b.facilities[key]=lv+1;

    a.persist();

    a.logMessage?.(
      f.name+"をLv."+(lv+1)+"へアップグレードしました"
    );

    return true;
  }

  function storageCapacity(){
    const a=A();
    const b=ensureBase();

    return 24+
      Math.max(0,(b?.level||1)-1)*4+
      Math.max(
        0,
        (b?.facilities?.storage||1)-1
      )*10;
  }

  function renderFacilities(){
    const b=ensureBase();

    return Object.entries(FACILITIES)
      .map(([key,f])=>{
        const lv=b.facilities[key]||1;
        const locked=b.level<f.unlock;
        const max=lv>=f.max;
        const cost=max?0:facilityCost(key);

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
      tool:"工具"
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
          <button data-tab="upgrade">整備・修理</button>
          <button data-tab="baseupgrade">拠点強化</button>
          <button data-tab="character">キャラクター</button>
          <button data-tab="skill">スキル</button>
          <button data-tab="pet">ペット</button>
        </nav>

        <div id="efrHubContent"></div>

      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector("#efrHubClose").onclick=close;

    const hubBtn=document.getElementById("hubBtn");
    if(hubBtn){
      hubBtn.onclick=open;
    }

    panel.addEventListener("click",e=>{
      const t=e.target.closest("[data-tab]");
      if(t){
        tab=t.dataset.tab;
        render();
        return;
      }

      const action=e.target.closest("[data-action]");
      if(!action)return;

      const type=action.dataset.action;
      const slot=action.dataset.slot;

      if(type==="facility"){
        upgradeFacility(action.dataset.key);
      }

      if(type==="craft"){
        X()?.craft?.(action.dataset.recipe);
      }

      if(type==="repair"){
        X()?.repair?.(slot);
      }

      if(type==="upgrade"){
        X()?.upgrade?.(slot);
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

      render();
      A()?.renderInventory?.();
    });
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
          <b>${(a.save.stash||[]).length}/${storageCapacity()}</b>
          <small>保管数 / 上限</small>
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

    return `
      <div class="hubSection">
        <h3>倉庫内容</h3>

        <div class="hubStorage">
          ${(a.save.stash||[]).map((x,i)=>`
            <div class="hubItem">
              <div>
                <strong>${esc(itemName(x))}</strong>
                <small>${kindName(x)} / ${x?.slots||1}スロット</small>
              </div>
              <span>${x?.amount ? "×"+x.amount : ""}</span>
            </div>
          `).join("") || `<p>倉庫は空です。</p>`}
        </div>
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
    const extraByName=new Map(
      (x?.EXTRA_RECIPES||[]).map(r=>[r.name,r])
    );

    const facilityNames={
      workbench:"工作台",
      workshop:"工房",
      maintenance:"整備台",
      medical:"医療設備"
    };

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

    const requirement=(r)=>{
      const name=Array.isArray(r)?r[0]:r?.name;
      const extra=extraByName.get(name);

      if(extra){
        return {
          facility:extra.facility,
          level:Number(extra.level||1)
        };
      }

      if(Array.isArray(r)){
        const n=String(name||"");
        return {
          facility:
            n.includes("包帯")||n.includes("止血")
              ?"medical"
              :"workbench",
          level:1
        };
      }

      return {
        facility:"workbench",
        level:1
      };
    };

    return `
      <div class="hubSection">
        <h3>クラフト</h3>

        <div class="hubRecipeGrid">
          ${recipes.map(r=>{
            const name=Array.isArray(r)?r[0]:r?.name;
            const cost=Array.isArray(r)?(r[1]||{}):(r?.cost||{});
            const req=requirement(r);
            const facilityLevel=
              Number(
                a?.save?.base?.facilities?.[req.facility]||1
              );

            const materialsOk=
              Object.entries(cost)
                .every(([n,c])=>available(n)>=c);

            const facilityOk=
              facilityLevel>=req.level;

            const canCraft=
              materialsOk&&facilityOk;

            const status=
              !facilityOk
                ? facilityNames[req.facility]+" Lv."+req.level+"が必要"
                : !materialsOk
                  ? "素材不足"
                  : "製作可能";

            return `
              <div class="hubRecipe">
                <strong>${esc(name)}</strong>

                <small>
                  設備：
                  ${esc(facilityNames[req.facility]||req.facility)}
                  Lv.${req.level}
                </small>

                <small>
                  ${Object.entries(cost)
                    .map(([n,c])=>`${esc(n)} ×${c}（所持 ${available(n)}）`)
                    .join(" / ")}
                </small>

                <button
                  data-action="craft"
                  data-recipe="${esc(name)}"
                  ${canCraft?"":"disabled"}>
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
        <h3>整備台・修理</h3>

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

            return `
              <div class="hubUpgrade">
                <strong>${label}</strong>
                <span>${esc(itemName(x))}</span>
                <small>${durability}</small>

                <button
                  data-action="repair"
                  data-slot="${slot}"
                  ${needsRepair?"":"disabled"}>
                  ${needsRepair?"修理":"修理不要"}
                </button>
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
    if(tab==="upgrade")content.innerHTML=renderUpgrade();
    if(tab==="baseupgrade")content.innerHTML=renderBaseUpgrade();
    if(tab==="character")content.innerHTML=renderCharacter();
    if(tab==="skill")content.innerHTML=renderSkill();
    if(tab==="pet")content.innerHTML=renderPet();

    const loadout=content.querySelector("[data-open-loadout]");
    if(loadout){
      loadout.onclick=()=>{
        close();
        window.EFRLoadout?.open();
      };
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
    render
  };

})();
