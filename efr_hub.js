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
      desc:"クラフト設備を強化する",
      max:5,
      unlock:1,
      cost:[2,3,5,7]
    },
    workshop:{
      name:"整備台",
      desc:"修理・改造設備を強化する",
      max:5,
      unlock:2,
      cost:[2,4,6,8]
    },
    medical:{
      name:"医療設備",
      desc:"医療系クラフト設備を強化する",
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
        result[n]=(result[n]||0)+1;
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
          <button data-tab="upgrade">修理・強化</button>
          <button data-tab="baseupgrade">拠点強化</button>
          <button data-tab="character">キャラクター</button>
          <button data-tab="skill">スキル</button>
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
            <small>XP ${sp.xp||0}</small>
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
    const classId=sp.classId||"melee";

    const classNames={
      melee:"近接",
      gunner:"銃士",
      rogue:"盗賊",
      mage:"魔術師",
      support:"支援"
    };

    return `
      <div class="hubSection">
        <h3>スキル</h3>

        <div class="hubCards">
          <div class="hubCard">
            <strong>現在のクラス</strong>
            <b>${esc(classNames[classId]||classId)}</b>
          </div>

          <div class="hubCard">
            <strong>スキルポイント</strong>
            <b>${sp.skillPoints||0}</b>
            <small>未使用</small>
          </div>
        </div>
      </div>

      <div class="hubSection">
        <h3>成長方向</h3>

        <div class="hubSkillTree">
          <div class="hubSkillNode top">近接</div>
          <div class="hubSkillNode left">クラフト</div>

          <div class="hubSkillNode center">
            <strong>成長</strong>
            <small>スキルツリー</small>
          </div>

          <div class="hubSkillNode right">魔法</div>
          <div class="hubSkillNode bottom">銃器</div>
        </div>
      </div>

      <div class="hubSection hubInfoCard">
        <strong>スキル成長</strong>
        <p>
          現在のスキルポイントと成長方向を確認できます。
          未実装のスキルは取得できない状態を維持します。
        </p>
      </div>
    `;
  }

  function renderCraft(){
    const x=X();
    const recipes=x?.recipes || [];

    return `
      <div class="hubSection">
        <h3>クラフト</h3>
        <div class="hubRecipeGrid">

          ${recipes.map(r=>`
            <div class="hubRecipe">
              <strong>${esc(r[0])}</strong>
              <small>
                ${Object.entries(r[1])
                  .map(([n,c])=>`${esc(n)} ×${c}`)
                  .join(" / ")}
              </small>
              <button data-action="craft" data-recipe="${esc(r[0])}">
                製作
              </button>
            </div>
          `).join("")}

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
        <h3>装備強化・修理</h3>

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

            const lv=x.upgradeLevel||0;
            const durability=
              x.maxDurability
                ? `${x.durability??x.maxDurability}/${x.maxDurability}`
                : "耐久値なし";

            return `
              <div class="hubUpgrade">
                <strong>${label}</strong>
                <span>${esc(itemName(x))}</span>
                <small>改造 Lv.${lv} / ${durability}</small>

                <div class="hubActions">
                  <button
                    data-action="upgrade"
                    data-slot="${slot}">
                    改造
                  </button>

                  <button
                    data-action="repair"
                    data-slot="${slot}">
                    修理
                  </button>
                </div>
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
