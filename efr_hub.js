(function(){
  "use strict";

  const A=()=>window.EFRGame;
  const X=()=>window.EFRContentExpansion;

  let panel=null;
  let tab="base";

  function clone(x){
    return x ? JSON.parse(JSON.stringify(x)) : x;
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
          <button data-tab="base">拠点</button>
          <button data-tab="storage">倉庫</button>
          <button data-tab="craft">クラフト</button>
          <button data-tab="upgrade">強化・修理</button>
        </nav>

        <div id="efrHubContent"></div>

      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector("#efrHubClose").onclick=close;

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
    const base=a.save.base || {level:1,xp:0};

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
          <b>${(a.save.stash||[]).length}</b>
          <small>アイテム</small>
        </div>

        <div class="hubCard">
          <strong>素材種類</strong>
          <b>${Object.keys(counts).length}</b>
        </div>

      </div>

      <div class="hubSection">
        <h3>拠点施設</h3>

        <div class="facilityGrid">
          <div>
            <strong>倉庫</strong>
            <span>探索で回収した物資を保管</span>
          </div>

          <div>
            <strong>工作台</strong>
            <span>素材から装備・医療品を製作</span>
          </div>

          <div>
            <strong>整備台</strong>
            <span>武器を修理・改造</span>
          </div>

          <div>
            <strong>医療設備</strong>
            <span>回復アイテムを製作</span>
          </div>
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
      `脱出 ${a.save.escapes||0}回 / 倉庫 ${(a.save.stash||[]).length}個`;

    panel.querySelectorAll("[data-tab]").forEach(b=>{
      b.classList.toggle("active",b.dataset.tab===tab);
    });

    const content=document.getElementById("efrHubContent");

    if(tab==="base")content.innerHTML=renderBase();
    if(tab==="storage")content.innerHTML=renderStorage();
    if(tab==="craft")content.innerHTML=renderCraft();
    if(tab==="upgrade")content.innerHTML=renderUpgrade();

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
