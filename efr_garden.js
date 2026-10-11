(function(){
  "use strict";

  const A=()=>window.EFRGame;

  const BASE_GARDEN_WIDTH=6;
  const BASE_GARDEN_HEIGHT=4;
  const MAX_GARDEN_LEVEL=10;

  const gardenWidth=level=>BASE_GARDEN_WIDTH+Number(level)-1;
  const gardenHeight=level=>BASE_GARDEN_HEIGHT+Number(level)-1;

  // Keyed by the level being purchased. Costs intentionally rise sharply.
  const GARDEN_UPGRADE_COSTS=Object.freeze({
    2:Object.freeze({"木材":150,"鉄くず":100,"ボルト":80,"ネジ":80}),
    3:Object.freeze({"木材":300,"鉄くず":200,"ボルト":150,"ネジ":150,"高品質金属":30}),
    4:Object.freeze({"木材":650,"鉄くず":400,"ボルト":250,"ネジ":250,"高品質金属":80,"電子部品":50,"加工金属":50}),
    5:Object.freeze({"木材":1200,"鉄くず":750,"ボルト":400,"ネジ":400,"高品質金属":180,"加工金属":150,"電子部品":120,"回路基板":40,"ケーブル":80,"バッテリー":80}),
    6:Object.freeze({"木材":2200,"鉄くず":1400,"ボルト":700,"ネジ":700,"高品質金属":350,"加工金属":350,"電子部品":300,"回路基板":120,"ケーブル":180,"バッテリー":140,"ガラス":150,"接着剤":180}),
    7:Object.freeze({"木材":4000,"鉄くず":2600,"ボルト":1000,"ネジ":1000,"高品質金属":700,"加工金属":700,"電子部品":600,"回路基板":250,"ケーブル":350,"バッテリー":300,"ガラス":300,"強化布":200,"合成皮革":200,"精密機械部品":60}),
    8:Object.freeze({"木材":7200,"鉄くず":4700,"ボルト":1600,"ネジ":1600,"高品質金属":1400,"加工金属":1500,"電子部品":1200,"回路基板":550,"ケーブル":750,"バッテリー":650,"ガラス":650,"強化布":500,"合成皮革":500,"精密機械部品":200,"駆動ユニット":120,"高性能電池":100,"合成補強材":120}),
    9:Object.freeze({"木材":13000,"鉄くず":8500,"ボルト":2500,"ネジ":2500,"高品質金属":2800,"加工金属":3000,"電子部品":2500,"回路基板":1300,"ケーブル":1600,"バッテリー":1400,"ガラス":1300,"強化布":1100,"合成皮革":1100,"精密機械部品":500,"駆動ユニット":300,"高性能電池":280,"電子制御部品":250,"センサーユニット":120,"強化素材":100}),
    10:Object.freeze({"木材":24000,"鉄くず":16000,"ボルト":4000,"ネジ":4000,"高品質金属":5000,"加工金属":5500,"電子部品":5000,"回路基板":3000,"ケーブル":3500,"バッテリー":3000,"ガラス":3000,"強化布":2500,"合成皮革":2500,"精密機械部品":1500,"駆動ユニット":900,"高性能電池":900,"電子制御部品":800,"センサーユニット":500,"光学ユニット":200,"化学試薬セット":300,"合成補強材":500,"強化素材":250})
  });

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

  const REQUIRED_CROP_EXPEDITIONS=3;
  const LEGACY_SEED_NAME="野菜の種";
  const CROP=Object.freeze({
    wheat:Object.freeze({
      label:"小麦",
      seedName:"小麦の種",
      seedIcon:"🌾",
      icon:"🌾",
      harvestName:"小麦",
      requiredExpeditions:REQUIRED_CROP_EXPEDITIONS,
      healValue:15,
      harvestItem:Object.freeze({name:"小麦",kind:"heal",value:15,weight:.25,slots:1,gridW:1,gridH:1})
    }),
    carrot:Object.freeze({
      label:"ニンジン",
      seedName:"ニンジンの種",
      seedIcon:"🥕",
      icon:"🥕",
      harvestName:"ニンジン",
      requiredExpeditions:REQUIRED_CROP_EXPEDITIONS,
      healValue:15,
      harvestItem:Object.freeze({name:"ニンジン",kind:"heal",value:15,weight:.25,slots:1,gridW:1,gridH:1})
    }),
    potato:Object.freeze({
      label:"ジャガイモ",
      seedName:"ジャガイモの種",
      seedIcon:"🥔",
      icon:"🥔",
      harvestName:"ジャガイモ",
      requiredExpeditions:REQUIRED_CROP_EXPEDITIONS,
      healValue:15,
      harvestItem:Object.freeze({name:"ジャガイモ",kind:"heal",value:15,weight:.25,slots:1,gridW:1,gridH:1})
    })
  });

  let selectedType="field";
  let selectedFieldId=null;
  let selectedSeedName=null;
  let activeExpedition=false;

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
        version:2,
        level:1,
        width:BASE_GARDEN_WIDTH,
        height:BASE_GARDEN_HEIGHT,
        objects:[]
      };
    }

    const g=a.save.base.garden;
    const savedLevel=Number(g.level??1);
    g.level=Number.isFinite(savedLevel)
      ? Math.min(MAX_GARDEN_LEVEL,Math.max(1,Math.trunc(savedLevel)))
      : 1;
    g.version=2;
    g.width=gardenWidth(g.level);
    g.height=gardenHeight(g.level);

    if(!Array.isArray(g.objects)){
      g.objects=[];
    }

    // Convert previous generic crop items/states without discarding saved progress.
    if(Array.isArray(a.save.stash)){
      for(let i=0;i<a.save.stash.length;i++){
        const item=a.save.stash[i];
        if(item===LEGACY_SEED_NAME){
          a.save.stash[i]={
            name:"小麦の種",kind:"material",amount:1,rarity:1,
            value:0,slots:1,gridW:1,gridH:1,weight:.1
          };
        }else if(item&&typeof item==="object"&&item.name===LEGACY_SEED_NAME&&item.kind==="material"){
          item.name="小麦の種";
          item.gridW=1;
          item.gridH=1;
          item.slots=1;
        }else if(item&&typeof item==="object"&&item.name==="収穫野菜"&&item.kind==="heal"){
          item.name="小麦";
          item.gridW=1;
          item.gridH=1;
          item.slots=1;
        }
      }
    }
    for(const field of g.objects){
      if(field?.type==="field"&&field.crop?.type==="vegetable"){
        field.crop.type="wheat";
      }
    }

    const completed=Number(g.completedExpeditions||0);
    g.completedExpeditions=Number.isFinite(completed)
      ? Math.max(0,Math.trunc(completed))
      : 0;

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

  function fieldProgress(field,g=ensureBase()){
    const crop=field?.crop;
    if(!crop){
      return {
        planted:false,
        ready:false,
        remaining:REQUIRED_CROP_EXPEDITIONS,
        elapsed:0
      };
    }

    const definition=CROP[crop.type];
    if(!definition){
      return {
        planted:true,
        ready:false,
        unsupported:true,
        remaining:0,
        elapsed:0
      };
    }

    const current=Math.max(0,Math.trunc(Number(g?.completedExpeditions||0)));
    const rawPlantedAt=Number(crop.plantedAtExpedition||0);
    const plantedAt=Number.isFinite(rawPlantedAt)
      ? Math.max(0,Math.trunc(rawPlantedAt))
      : current;
    const elapsed=Math.max(0,current-plantedAt);
    const remaining=Math.max(0,definition.requiredExpeditions-elapsed);

    return {
      planted:true,
      ready:remaining===0,
      remaining,
      elapsed,
      definition
    };
  }

  function beginExpedition(){
    activeExpedition=true;
    return true;
  }

  function onRaidFinished(success){
    if(!activeExpedition)return false;
    activeExpedition=false;

    const g=ensureBase();
    if(!g)return false;

    g.completedExpeditions+=1;
    A()?.persist?.();
    window.EFRHub?.render?.();
    return true;
  }

  function selectField(x,y){
    const field=objectAt(x,y);
    if(!field||field.type!=="field")return false;
    selectedFieldId=field.id;
    window.EFRHub?.render?.();
    return true;
  }

  function seedCrop(name){
    return Object.entries(CROP)
      .find(([,definition])=>definition.seedName===String(name||""))||null;
  }

  function selectSeed(name){
    const entry=seedCrop(name);
    if(!entry||materialCount(entry[1].seedName)<1){
      A()?.logMessage?.("所持している種を選択してください");
      return false;
    }
    selectedSeedName=entry[1].seedName;
    window.EFRHub?.render?.();
    return true;
  }

  function canPlantSeed(name=selectedSeedName){
    const entry=seedCrop(name);
    return !!entry&&materialCount(entry[1].seedName)>=1;
  }

  function canStoreHarvest(field){
    const definition=CROP[field?.crop?.type];
    return !!definition&&!!window.EFRBaseCore?.canAddStashItems?.([
      {...definition.harvestItem}
    ]);
  }

  function plantSeed(x,y){
    const a=A();
    const g=ensureBase();
    const field=objectAt(x,y);
    const entry=seedCrop(selectedSeedName);

    if(!a||!g||!field||field.type!=="field")return false;
    if(field.crop){
      a.logMessage?.("この畑では作物が育っています");
      return false;
    }
    if(!entry||!canPlantSeed(entry[1].seedName)){
      a.logMessage?.("植える種を選択してください。所持数がある種だけ植えられます");
      return false;
    }
    const [cropType,definition]=entry;
    if(!window.EFRBaseCore?.consumeMaterials?.({
      [definition.seedName]:1
    })){
      a.logMessage?.("種を消費できませんでした");
      return false;
    }

    field.crop={
      type:cropType,
      plantedAtExpedition:g.completedExpeditions
    };
    selectedSeedName=null;
    selectedFieldId=field.id;
    a.persist?.();
    a.renderInventory?.();
    window.EFRHub?.render?.();
    a.logMessage?.(definition.seedName+"を植えました。収穫まであと"+definition.requiredExpeditions+"回の探索です");
    return true;
  }

  function harvest(x,y){
    const a=A();
    const g=ensureBase();
    const field=objectAt(x,y);

    if(!a||!g||!field||field.type!=="field"||!field.crop)return false;
    const progress=fieldProgress(field,g);
    if(!progress.ready){
      a.logMessage?.("まだ収穫できません。あと"+progress.remaining+"回の探索が必要です");
      return false;
    }
    const definition=CROP[field.crop.type];
    if(!definition){
      a.logMessage?.("この畑の作物データを収穫できません");
      return false;
    }
    if(!window.EFRBaseCore?.addStashItem?.(
      {...definition.harvestItem},
      {silent:true}
    )){
      a.logMessage?.("倉庫に空きがないため収穫できません。空きを作ってください");
      return false;
    }

    field.crop=null;
    selectedFieldId=field.id;
    a.persist?.();
    a.renderInventory?.();
    window.EFRHub?.render?.();
    a.logMessage?.(definition.harvestName+"を倉庫に保管しました");
    return true;
  }

  function canBuild(type){
    const def=TYPES[type];

    if(!def)return false;

    return Object.entries(def.cost||{})
      .every(([name,count])=>
        materialCount(name)>=Number(count||0)
      );
  }

  function nextUpgradeCost(){
    const g=ensureBase();
    if(!g||g.level>=MAX_GARDEN_LEVEL)return null;
    return GARDEN_UPGRADE_COSTS[g.level+1]||null;
  }

  function canUpgrade(){
    const cost=nextUpgradeCost();
    return !!cost&&Object.entries(cost).every(([name,count])=>
      materialCount(name)>=Number(count||0)
    );
  }

  function upgrade(){
    const a=A();
    const g=ensureBase();
    if(!a||!g)return false;

    if(g.level>=MAX_GARDEN_LEVEL){
      a.logMessage?.("庭は最大レベルです");
      return false;
    }

    const nextLevel=g.level+1;
    const cost=GARDEN_UPGRADE_COSTS[nextLevel];
    if(!cost||!canUpgrade()){
      a.logMessage?.("庭の拡張素材が不足しています");
      return false;
    }

    if(!window.EFRBaseCore?.consumeMaterials?.(cost)){
      a.logMessage?.("庭の拡張素材を消費できませんでした");
      return false;
    }

    // Commit the level only after the shared stash transaction succeeds.
    g.level=nextLevel;
    ensureBase();
    a.persist?.();
    a.renderInventory?.();
    window.EFRHub?.render?.();
    a.logMessage?.(
      `庭をLv${g.level}に拡張しました（${g.width} × ${g.height}）`
    );
    return true;
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
      x>=g.width||
      y>=g.height
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

    const target=g.objects[index];
    if(target?.type==="field"&&target.crop){
      a?.logMessage?.("作物が残っている畑は撤去できません。先に収穫してください");
      return false;
    }

    const removed=g.objects.splice(index,1)[0];
    if(selectedFieldId===removed?.id)selectedFieldId=null;

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

    for(let y=0;y<g.height;y++){
      for(let x=0;x<g.width;x++){
        const object=objectAt(x,y);
        const def=object?TYPES[object.type]:null;
        const cropState=object?.type==="field"
          ? fieldProgress(object,g)
          : null;
        const action=object
          ? (object.type==="field"?"gardenFieldSelect":"gardenRemove")
          : "gardenPlace";
        const cellClass="gardenCell"+
          (object?" occupied":"")+
          (cropState?.ready?" gardenCropReady":"");

        cells.push(`
          <button
            type="button"
            class="${cellClass}"
            data-action="${action}"
            data-garden-type="${escapeHtml(selectedType)}"
            data-garden-x="${x}"
            data-garden-y="${y}"
          >
            ${
              object
                ? `
                  <span class="gardenObjectIcon">${cropState
                    ? (!cropState.planted?"🌱":(cropState.definition?.icon||"🌿"))
                    : (def?.icon||"🌿")}</span>
                  <strong>${escapeHtml(def?.name||"庭")}</strong>
                  <small>${cropState
                    ? (!cropState.planted?"畑を管理":cropState.ready?"収穫可能":("残り"+cropState.remaining+"探索"))
                    : "タップで撤去"}</small>
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
    const upgradeCost=nextUpgradeCost();
    const upgradeAffordable=!!upgradeCost&&canUpgrade();
    const selectedField=g.objects.find(o=>
      o?.type==="field"&&o.id===selectedFieldId
    )||null;
    const selectedFieldProgress=selectedField
      ? fieldProgress(selectedField,g)
      : null;
    const selectedSeedDefinition=seedCrop(selectedSeedName)?.[1]||null;
    const selectedSeedCount=selectedSeedDefinition
      ? materialCount(selectedSeedDefinition.seedName)
      : 0;
    const selectedSeedLabel=selectedSeedDefinition
      ? selectedSeedDefinition.label+"の種"
      : "未選択";
    const selectedSeedStatus=selectedSeedDefinition
      ? `選択中：<strong>${escapeHtml(selectedSeedLabel)}</strong>（所持 ${selectedSeedCount}個）`
      : "（種を選択してください）";
    const canPlantSelectedSeed=!!selectedSeedDefinition&&selectedSeedCount>0;
    const seedOptions=Object.values(CROP).map(definition=>{
      const count=materialCount(definition.seedName);
      const active=selectedSeedName===definition.seedName;
      return `
        <button
          type="button"
          class="gardenSeedOption ${active?"active":""}"
          data-action="gardenSelectSeed"
          data-garden-seed="${escapeHtml(definition.seedName)}"
          ${count<1?"disabled":""}
        >
          <span>${definition.seedIcon}</span>
          <strong>${escapeHtml(definition.seedName)}</strong>
          <small>所持 ${count}個</small>
        </button>
      `;
    }).join("");
    const harvestFits=canStoreHarvest(selectedField);

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
            <span>${g.width} × ${g.height}</span>
          </div>
          <div>
            <strong>配置数</strong>
            <span>${objectCount} / ${g.width*g.height}</span>
          </div>
          <div>
            <strong>選択中</strong>
            <span>${escapeHtml(TYPES[selectedType]?.name||"なし")}</span>
          </div>
        </section>

        <section class="hubSection efrGardenUpgrade">
          <h3>庭を拡張する</h3>
          <p class="gardenHint">
            現在：Lv ${g.level} / ${MAX_GARDEN_LEVEL}（${g.width} × ${g.height}）
          </p>
          ${
            upgradeCost
              ? `
                <div class="gardenUpgradeSummary">
                  <span>拡張後 <strong>${g.width+1} × ${g.height+1}</strong></span>
                  <span>最大まであと <strong>${MAX_GARDEN_LEVEL-g.level}</strong> 回</span>
                </div>
                <div class="gardenUpgradeCost">${costHtml(upgradeCost)}</div>
                <button
                  type="button"
                  class="gardenUpgradeButton"
                  data-action="gardenUpgrade"
                  ${upgradeAffordable?"":"disabled"}
                >Lv ${g.level+1} へ拡張</button>
              `
              : `<p class="gardenMaxLevel">最大レベルに到達しました。</p>`
          }
        </section>

        <section class="hubSection gardenFieldManagement">
          <h3>畑の管理</h3>
          ${
            selectedField
              ? `
                <p class="gardenFieldStatus">
                  畑（${Number(selectedField.x)+1}, ${Number(selectedField.y)+1}） /
                  累計探索回数 ${g.completedExpeditions}
                </p>
                ${
                  !selectedFieldProgress?.planted
                    ? `
                      <p>植える種を選択してください。種を1個消費し、探索3回終了後に収穫できます。</p>
                      <div class="gardenSeedOptions">${seedOptions}</div>
                      <p class="gardenSeedSelected">${selectedSeedStatus}</p>
                      <div class="gardenFieldActions">
                        <button type="button" data-action="gardenPlantSeed" data-garden-x="${selectedField.x}" data-garden-y="${selectedField.y}" ${canPlantSelectedSeed?"":"disabled"}>選択した種を植える</button>
                        <button type="button" data-action="gardenRemove" data-garden-x="${selectedField.x}" data-garden-y="${selectedField.y}">畑を撤去</button>
                      </div>
                    `
                    : selectedFieldProgress.unsupported
                      ? `<p>この作物データは現在の栽培システムでは扱えません。</p>`
                      : selectedFieldProgress.ready
                        ? `
                          <p>${escapeHtml(selectedFieldProgress.definition.harvestName)}を収穫できます。出撃中にHPを15回復します。</p>
                          <div class="gardenFieldActions">
                            <button type="button" data-action="gardenHarvest" data-garden-x="${selectedField.x}" data-garden-y="${selectedField.y}" ${harvestFits?"":"disabled"}>収穫する</button>
                          </div>
                          ${harvestFits?"":"<p>倉庫に空きがありません。空きを作ると収穫できます。</p>"}
                        `
                        : `
                          <p>${escapeHtml(selectedFieldProgress.definition.label)}を栽培中です。あと <strong>${selectedFieldProgress.remaining} 回</strong> の探索終了で収穫できます。</p>
                          <p>探索結果が成功・失敗のどちらでも1回として数えます。現実時間では成長しません。</p>
                        `
                }
              `
              : `<p>畑のマスをタップすると、種まき・成長状況・収穫を管理できます。</p>`
          }
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

          <div class="gardenGridViewport">
            <div
              class="gardenGrid"
              style="grid-template-columns:repeat(${g.width},minmax(72px,1fr))"
            >
              ${cells.join("")}
            </div>
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
    select,
    selectField,
    selectSeed,
    plantSeed,
    harvest,
    beginExpedition,
    onRaidFinished,
    nextUpgradeCost,
    canUpgrade,
    upgrade,
    sizeLabel(){
      const g=ensureBase();
      return g?`${g.width} × ${g.height}`:"6 × 4";
    },
    get selectedType(){
      return selectedType;
    }
  };
})();
