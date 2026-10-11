(function(){
  "use strict";

  const A=()=>window.EFRGame;

  const GARDEN_WIDTH=6;
  const GARDEN_HEIGHT=4;

  const TYPES={
    field:{
      name:"畑",
      icon:"🌱",
      desc:"作物を育てるための区画",
      cost:{"木材":2}
    },
    tree:{
      name:"木",
      icon:"🌳",
      desc:"庭に木陰と緑を作る",
      cost:{"木材":3}
    },
    flower:{
      name:"花",
      icon:"🌷",
      desc:"庭を彩る花壇",
      cost:{"木材":1}
    },
    pond:{
      name:"池",
      icon:"💧",
      desc:"水辺の生き物が暮らせる池",
      cost:{"木材":5}
    }
  };

  let selectedType="field";

  function ensureBase(){
    const a=A();
    if(!a)return null;

    a.save.base=a.save.base||{
      level:1,
      xp:0,
      facilities:{}
    };

    const garden=a.save.base.garden;

    if(!garden || typeof garden!=="object"){
      a.save.base.garden={
        version:1,
        width:GARDEN_WIDTH,
        height:GARDEN_HEIGHT,
        objects:[]
      };
    }

    const g=a.save.base.garden;

    g.version=1;
    g.width=GARDEN_WIDTH;
    g.height=GARDEN_HEIGHT;

    if(!Array.isArray(g.objects)){
      g.objects=[];
    }

    return g;
  }

  function materialCount(name){
    return Number(window.EFRBaseCore?.materialCount?.(name)||0);
  }

  function objectAt(x,y){
    const g=ensureBase();

    return g?.objects?.find(o=>
      Number(o.x)===Number(x) &&
      Number(o.y)===Number(y)
    )||null;
  }

  function canBuild(type){
    const def=TYPES[type];

    if(!def)return false;

    return Object.entries(def.cost||{})
      .every(([name,count])=>
        materialCount(name)>=Number(count||0)
      );
  }

  function place(type,x,y){
    const a=A();
    const g=ensureBase();
    const def=TYPES[type];

    x=Number(x);
    y=Number(y);

    if(!a||!g||!def)return false;

    if(
      !Number.isInteger(x)||
      !Number.isInteger(y)||
      x<0||
      y<0||
      x>=GARDEN_WIDTH||
      y>=GARDEN_HEIGHT
    ){
      return false;
    }

    if(objectAt(x,y)){
      a.logMessage?.("その場所には既に庭の設備があります");
      return false;
    }

    if(!canBuild(type)){
      a.logMessage?.(
        def.name+"を作るための素材が不足しています"
      );
      return false;
    }

    if(!window.EFRBaseCore?.consumeMaterials?.(def.cost||{})){
      a.logMessage?.("庭の建築素材の消費に失敗しました");
      return false;
    }

    g.objects.push({
      id:"garden-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),
      type,
      x,
      y
    });

    a.persist?.();
    a.renderInventory?.();
    window.EFRHub?.render?.();

    a.logMessage?.(def.name+"を庭に配置しました");

    return true;
  }

  function remove(x,y){
    const a=A();
    const g=ensureBase();

    const index=g?.objects?.findIndex(o=>
      Number(o.x)===Number(x)&&
      Number(o.y)===Number(y)
    );

    if(index===undefined||index<0)return false;

    const removed=g.objects.splice(index,1)[0];

    a?.persist?.();
    window.EFRHub?.render?.();

    a?.logMessage?.(
      (TYPES[removed?.type]?.name||"庭の設備")+
      "を撤去しました"
    );

    return true;
  }

  function select(type){
    if(TYPES[type]){
      selectedType=type;
      window.EFRHub?.render?.();
    }
  }

  function costHtml(cost){
    return Object.entries(cost||{})
      .map(([name,count])=>{
        const owned=materialCount(name);
        const missing=Math.max(
          0,
          Number(count||0)-owned
        );

        return `
          <span class="${missing?"gardenMaterialMissing":""}">
            ${escapeHtml(name)} ×${count}
            <small>所持 ${owned}</small>
          </span>
        `;
      })
      .join("");
  }

  function escapeHtml(value){
    return String(value??"")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;");
  }

  function render(){
    const g=ensureBase();
    if(!g){
      return `<div class="hubSection"><p>庭を読み込めません。</p></div>`;
    }

    const selector=Object.entries(TYPES)
      .map(([key,def])=>{
        const active=key===selectedType;
        const enough=canBuild(key);

        return `
          <button
            type="button"
            class="gardenBuildOption ${active?"active":""}"
            data-action="gardenSelect"
            data-garden-type="${escapeHtml(key)}"
          >
            <strong>${def.icon} ${escapeHtml(def.name)}</strong>
            <small>${escapeHtml(def.desc)}</small>
            <span>${costHtml(def.cost)}</span>
            ${enough?"":"<em>素材不足</em>"}
          </button>
        `;
      })
      .join("");

    const cells=[];

    for(let y=0;y<GARDEN_HEIGHT;y++){
      for(let x=0;x<GARDEN_WIDTH;x++){
        const object=objectAt(x,y);
        const def=object?TYPES[object.type]:null;

        cells.push(`
          <button
            type="button"
            class="gardenCell ${object?"occupied":""}"
            data-action="${object?"gardenRemove":"gardenPlace"}"
            data-garden-x="${x}"
            data-garden-y="${y}"
          >
            ${
              object
                ? `
                  <span class="gardenObjectIcon">${def?.icon||"🌿"}</span>
                  <strong>${escapeHtml(def?.name||"庭")}</strong>
                  <small>タップで撤去</small>
                `
                : `
                  <span>＋</span>
                  <small>配置</small>
                `
            }
          </button>
        `);
      }
    }

    const objectCount=g.objects.length;

    return `
      <div class="hubSection efrGardenPanel">
        <section class="efrGardenHero">
          <div class="efrBaseEyebrow">GARDEN</div>
          <h2>庭</h2>
          <p>
            拠点の庭を自由に作り、畑・木・花・池などを配置できます。
            ここはペットとは別の、拠点を生きた場所にするための空間です。
          </p>
        </section>

        <section class="efrGardenStatus">
          <div>
            <strong>庭の広さ</strong>
            <span>${GARDEN_WIDTH} × ${GARDEN_HEIGHT}</span>
          </div>
          <div>
            <strong>配置数</strong>
            <span>${objectCount} / ${GARDEN_WIDTH*GARDEN_HEIGHT}</span>
          </div>
          <div>
            <strong>選択中</strong>
            <span>${escapeHtml(TYPES[selectedType]?.name||"なし")}</span>
          </div>
        </section>

        <section class="hubSection">
          <h3>庭を作る</h3>
          <div class="gardenBuildOptions">
            ${selector}
          </div>
        </section>

        <section class="hubSection">
          <h3>庭</h3>
          <p class="gardenHint">
            空いている場所をタップすると選択中の設備を配置します。
            配置済みの設備をタップすると撤去します。
          </p>

          <div class="gardenGrid">
            ${cells.join("")}
          </div>
        </section>

        <section class="hubInfoCard">
          <strong>これからの庭</strong>
          <p>
            今後ここへ、庭に住み着く可愛い生き物や、
            生き物が好む環境・巣・水辺・花などを追加できます。
            調教師のペットシステムとは別の拠点要素として扱います。
          </p>
        </section>
      </div>
    `;
  }

  window.EFRGarden={
    TYPES,
    ensureBase,
    render,
    place,
    remove,
    select
  };
})();
