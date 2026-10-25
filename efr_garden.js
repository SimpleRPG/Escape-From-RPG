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
      desc:"苗木を育て、探索3回終了後に木材を収穫できる",
      cost:{"木の苗":1}
    },
    flower:{
      name:"花",
      icon:"🌷",
      desc:"拠点を彩る花壇",
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
  const REQUIRED_TREE_EXPEDITIONS=3;
  const TREE_WOOD_YIELD=3;
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
      harvestItem:Object.freeze({name:"小麦",kind:"heal",value:15,foodRestore:25,waterRestore:0,weight:.25,slots:1,gridW:1,gridH:1})
    }),
    carrot:Object.freeze({
      label:"ニンジン",
      seedName:"ニンジンの種",
      seedIcon:"🥕",
      icon:"🥕",
      harvestName:"ニンジン",
      requiredExpeditions:REQUIRED_CROP_EXPEDITIONS,
      healValue:15,
      harvestItem:Object.freeze({name:"ニンジン",kind:"heal",value:15,foodRestore:25,waterRestore:0,weight:.25,slots:1,gridW:1,gridH:1})
    }),
    potato:Object.freeze({
      label:"ジャガイモ",
      seedName:"ジャガイモの種",
      seedIcon:"🥔",
      icon:"🥔",
      harvestName:"ジャガイモ",
      requiredExpeditions:REQUIRED_CROP_EXPEDITIONS,
      healValue:15,
      harvestItem:Object.freeze({name:"ジャガイモ",kind:"heal",value:15,foodRestore:25,waterRestore:0,weight:.25,slots:1,gridW:1,gridH:1})
    }),
    tomato:Object.freeze({
      label:"トマト",
      seedName:"トマトの種",
      seedIcon:"🍅",
      icon:"🍅",
      harvestName:"トマト",
      requiredExpeditions:REQUIRED_CROP_EXPEDITIONS,
      healValue:15,
      harvestItem:Object.freeze({name:"トマト",kind:"heal",value:15,foodRestore:25,waterRestore:0,weight:.25,slots:1,gridW:1,gridH:1})
    }),
    corn:Object.freeze({
      label:"トウモロコシ",
      seedName:"トウモロコシの種",
      seedIcon:"🌽",
      icon:"🌽",
      harvestName:"トウモロコシ",
      requiredExpeditions:REQUIRED_CROP_EXPEDITIONS,
      healValue:15,
      harvestItem:Object.freeze({name:"トウモロコシ",kind:"heal",value:15,foodRestore:25,waterRestore:0,weight:.25,slots:1,gridW:1,gridH:1})
    })
  });

  const FACILITY_ICONS=Object.freeze({
    storage:"📦",
    shop:"🛒",
    workbench:"🛠️",
    workshop:"⚒️",
    maintenance:"🔧",
    medical:"🩺",
    research:"🔬",
    kitchen:"🍳"
  });

  let selectedType="field";
  let selectedFacilityKey=null;
  let selectedFacilityId=null;
  let movingFacilityId=null;
  let pendingFacilityRemoveId=null;
  let selectedFieldId=null;
  let selectedTreeId=null;
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
        version:3,
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
    g.version=3;
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

    // Existing decorative trees have no growth timestamp; start them from this count.
    for(const tree of g.objects){
      if(tree?.type!=="tree")continue;
      const plantedAt=Number(tree.plantedAtExpedition);
      tree.plantedAtExpedition=Number.isFinite(plantedAt)
        ? Math.max(0,Math.min(g.completedExpeditions,Math.trunc(plantedAt)))
        : g.completedExpeditions;
    }

    // One-time, free migration: retain every previously available facility without
    // deleting existing crops or decorations. Expand only if required to make room.
    // If even the maximum plot is full, defer unplaced facilities and retry after space is freed.
    const pendingFacilityKeys=Array.isArray(g.pendingFacilityKeys)
      ? g.pendingFacilityKeys.filter(key=>typeof key==="string")
      : [];
    const migrationNeeded=
      Number(g.buildingSchemaVersion||0)<1 ||
      (pendingFacilityKeys.length>0&&g.objects.length<g.width*g.height);
    if(
      migrationNeeded &&
      window.EFRBaseFacilities &&
      typeof window.EFRBaseFacilities==="object"
    ){
      const knownKeys=Object.keys(window.EFRBaseFacilities)
        .filter(key=>key!=="kitchen");
      const placedKeys=new Set(g.objects
        .filter(object=>object?.type==="facility"&&object.facilityKey)
        .map(object=>String(object.facilityKey)));
      const missingKeys=[...new Set([
        ...knownKeys.filter(key=>!placedKeys.has(key)),
        ...pendingFacilityKeys.filter(key=>!placedKeys.has(key))
      ])];
      let migratedCount=0;

      while(
        g.objects.length+missingKeys.length>g.width*g.height &&
        g.level<MAX_GARDEN_LEVEL
      ){
        g.level+=1;
        g.width=gardenWidth(g.level);
        g.height=gardenHeight(g.level);
      }

      const findFreeCell=()=>{
        for(let y=0;y<g.height;y++){
          for(let x=0;x<g.width;x++){
            if(!g.objects.some(object=>Number(object?.x)===x&&Number(object?.y)===y)){
              return {x,y};
            }
          }
        }
        return null;
      };

      for(const key of missingKeys){
        const position=findFreeCell();
        if(!position)continue;
        g.objects.push({
          id:"facility-"+key,
          type:"facility",
          facilityKey:key,
          x:position.x,
          y:position.y
        });
        migratedCount+=1;
      }

      const placedAfter=new Set(g.objects
        .filter(object=>object?.type==="facility"&&object.facilityKey)
        .map(object=>String(object.facilityKey)));
      g.pendingFacilityKeys=missingKeys.filter(key=>!placedAfter.has(key));
      if(!g.pendingFacilityKeys.length)delete g.pendingFacilityKeys;
      g.buildingSchemaVersion=1;
      a.persist?.();
      if(g.pendingFacilityKeys?.length){
        a.logMessage?.("拠点の空きマスが不足しているため旧施設の一部を保留しました。空きマスを作ると無料で配置されます");
      }
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

  function treeProgress(tree,g=ensureBase()){
    if(!tree||tree.type!=="tree"){
      return {planted:false,ready:false,remaining:REQUIRED_TREE_EXPEDITIONS,elapsed:0};
    }

    const current=Math.max(0,Math.trunc(Number(g?.completedExpeditions||0)));
    const rawPlantedAt=Number(tree.plantedAtExpedition);
    const plantedAt=Number.isFinite(rawPlantedAt)
      ? Math.max(0,Math.trunc(rawPlantedAt))
      : current;
    const elapsed=Math.max(0,current-plantedAt);
    const remaining=Math.max(0,REQUIRED_TREE_EXPEDITIONS-elapsed);

    return {planted:true,ready:remaining===0,remaining,elapsed};
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
    selectedTreeId=null;
    selectedFacilityId=null;
    selectedFacilityKey=null;
    movingFacilityId=null;
    pendingFacilityRemoveId=null;
    window.EFRHub?.render?.();
    return true;
  }

  function selectTree(x,y){
    const tree=objectAt(x,y);
    if(!tree||tree.type!=="tree")return false;
    selectedTreeId=tree.id;
    selectedFieldId=null;
    selectedFacilityId=null;
    selectedFacilityKey=null;
    movingFacilityId=null;
    pendingFacilityRemoveId=null;
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

  function treeWoodItem(){
    return {
      name:"木材",
      kind:"material",
      amount:TREE_WOOD_YIELD,
      rarity:1,
      value:0,
      slots:1,
      gridW:1,
      gridH:3,
      weight:1
    };
  }

  function canStoreTree(){
    return !!window.EFRBaseCore?.canAddStashItems?.([treeWoodItem()]);
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

  function harvestTree(x,y){
    const a=A();
    const g=ensureBase();
    const tree=objectAt(x,y);

    if(!a||!g||!tree||tree.type!=="tree")return false;

    const progress=treeProgress(tree,g);
    if(!progress.ready){
      a.logMessage?.("まだ伐採できません。あと"+progress.remaining+"回の探索が必要です");
      return false;
    }

    const index=g.objects.findIndex(o=>o?.id===tree.id);
    if(index<0)return false;

    if(!window.EFRBaseCore?.addStashItem?.(
      treeWoodItem(),
      {allOrNothing:true,silent:true}
    )){
      a.logMessage?.("倉庫に空きがないため伐採できません。空きを作ってから再試行してください");
      return false;
    }

    g.objects.splice(index,1);
    if(selectedTreeId===tree.id)selectedTreeId=null;
    a.persist?.();
    a.renderInventory?.();
    window.EFRHub?.render?.();
    a.logMessage?.("木材×"+TREE_WOOD_YIELD+"を倉庫に保管し、木を伐採しました");
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
      a.logMessage?.("拠点の敷地は最大レベルです");
      return false;
    }

    const nextLevel=g.level+1;
    const cost=GARDEN_UPGRADE_COSTS[nextLevel];
    if(!cost||!canUpgrade()){
      a.logMessage?.("敷地拡張の素材が不足しています");
      return false;
    }

    if(!window.EFRBaseCore?.consumeMaterials?.(cost)){
      a.logMessage?.("敷地拡張の素材を消費できませんでした");
      return false;
    }

    // Commit the level only after the shared stash transaction succeeds.
    g.level=nextLevel;
    ensureBase();
    a.persist?.();
    a.renderInventory?.();
    window.EFRHub?.render?.();
    a.logMessage?.(
      `拠点の敷地をLv${g.level}に拡張しました（${g.width} × ${g.height}）`
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
      a.logMessage?.("そのマスには既に設備があります");
      return false;
    }

    if(!canBuild(type)){
      a.logMessage?.(
        def.name+"を作るための素材が不足しています"
      );
      return false;
    }

    if(!window.EFRBaseCore?.consumeMaterials?.(def.cost||{})){
      a.logMessage?.("建設素材の消費に失敗しました");
      return false;
    }

    const placed={
      id:"garden-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),
      type,
      x,
      y
    };
    if(type==="tree"){
      placed.plantedAtExpedition=g.completedExpeditions;
      selectedTreeId=placed.id;
      selectedFieldId=null;
    }
    g.objects.push(placed);

    a.persist?.();
    a.renderInventory?.();
    window.EFRHub?.render?.();

    a.logMessage?.(def.name+"を拠点に配置しました");

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
    if(target?.type==="facility"){
      a?.logMessage?.("施設は選択して詳細画面から撤去してください");
      return false;
    }
    if(target?.type==="field"&&target.crop){
      a?.logMessage?.("作物が残っている畑は撤去できません。先に収穫してください");
      return false;
    }

    const removed=g.objects.splice(index,1)[0];
    if(selectedFieldId===removed?.id)selectedFieldId=null;
    if(selectedTreeId===removed?.id)selectedTreeId=null;

    a?.persist?.();
    window.EFRHub?.render?.();

    a?.logMessage?.(
      (TYPES[removed?.type]?.name||"設備")+
      "を拠点から撤去しました"
    );

    return true;
  }

  function select(type){
    if(TYPES[type]){
      selectedType=type;
      selectedFacilityKey=null;
      selectedFacilityId=null;
      movingFacilityId=null;
      pendingFacilityRemoveId=null;
      selectedFieldId=null;
      selectedTreeId=null;
      window.EFRHub?.render?.();
    }
  }

  function facilityBuilt(key){
    return Boolean(window.EFRBaseCore?.isFacilityBuilt?.(key));
  }

  function facilityLevel(key){
    return Number(window.EFRBaseCore?.facilityLevel?.(key)??0);
  }

  function facilityBuildCost(key){
    return window.EFRBaseCore?.facilityBuildCost?.(key)||{};
  }

  function selectFacility(key){
    const facility=window.EFRBaseFacilities?.[String(key||"")];
    if(!facility)return false;
    const g=ensureBase();
    if(!g)return false;
    const existing=g.objects.find(object=>
      object?.type==="facility"&&String(object.facilityKey||"")===String(key)
    );
    selectedType=null;
    selectedFieldId=null;
    selectedTreeId=null;
    pendingFacilityRemoveId=null;
    movingFacilityId=null;
    if(existing){
      selectedFacilityId=existing.id;
      selectedFacilityKey=null;
    }else{
      selectedFacilityId=null;
      selectedFacilityKey=String(key);
    }
    window.EFRHub?.render?.();
    return true;
  }

  function selectFacilityObject(x,y){
    const object=objectAt(x,y);
    if(!object||object.type!=="facility")return false;
    selectedFacilityId=object.id;
    selectedFacilityKey=null;
    selectedType=null;
    selectedFieldId=null;
    selectedTreeId=null;
    movingFacilityId=null;
    pendingFacilityRemoveId=null;
    window.EFRHub?.render?.();
    return true;
  }

  function placeFacility(key,x,y){
    const success=Boolean(window.EFRBaseCore?.buildFacility?.(key,Number(x),Number(y)));
    if(success){
      const g=ensureBase();
      const object=g?.objects?.find(entry=>
        entry?.type==="facility"&&String(entry.facilityKey||"")===String(key)
      );
      selectedFacilityId=object?.id||null;
      selectedFacilityKey=null;
      selectedType=null;
      selectedFieldId=null;
      selectedTreeId=null;
      movingFacilityId=null;
      pendingFacilityRemoveId=null;
      window.EFRHub?.render?.();
    }
    return success;
  }

  function startFacilityMove(){
    const g=ensureBase();
    const object=g?.objects?.find(entry=>entry?.id===selectedFacilityId&&entry?.type==="facility");
    if(!object)return false;
    movingFacilityId=object.id;
    pendingFacilityRemoveId=null;
    window.EFRHub?.render?.();
    A()?.logMessage?.("移動先の空きマスをタップしてください");
    return true;
  }

  function cancelFacilityMove(){
    movingFacilityId=null;
    window.EFRHub?.render?.();
  }

  function moveSelectedFacility(x,y){
    const a=A();
    const g=ensureBase();
    const object=g?.objects?.find(entry=>entry?.id===movingFacilityId&&entry?.type==="facility");
    x=Number(x); y=Number(y);
    if(!a||!g||!object||!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=g.width||y>=g.height)return false;
    if(g.objects.some(entry=>entry!==object&&Number(entry?.x)===x&&Number(entry?.y)===y)){
      a.logMessage?.("移動先には既に設備があります");
      return false;
    }
    object.x=x;
    object.y=y;
    movingFacilityId=null;
    selectedFacilityId=object.id;
    a.persist?.();
    window.EFRHub?.render?.();
    a.logMessage?.((window.EFRBaseFacilities?.[object.facilityKey]?.name||"施設")+"を移動しました");
    return true;
  }

  function requestFacilityRemoval(){
    const object=ensureBase()?.objects?.find(entry=>entry?.id===selectedFacilityId&&entry?.type==="facility");
    if(!object)return false;
    pendingFacilityRemoveId=object.id;
    movingFacilityId=null;
    window.EFRHub?.render?.();
    return true;
  }

  function cancelFacilityRemoval(){
    pendingFacilityRemoveId=null;
    window.EFRHub?.render?.();
  }

  function confirmFacilityRemoval(){
    const g=ensureBase();
    const object=g?.objects?.find(entry=>entry?.id===pendingFacilityRemoveId&&entry?.type==="facility");
    if(!object)return false;
    const success=Boolean(window.EFRBaseCore?.demolishFacility?.(object.facilityKey));
    if(success){
      selectedFacilityId=null;
      selectedFacilityKey=null;
      pendingFacilityRemoveId=null;
      movingFacilityId=null;
      window.EFRHub?.render?.();
    }
    return success;
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
      return `<div class="hubSection"><p>拠点の配置を読み込めません。</p></div>`;
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

    const facilitySelector=Object.entries(window.EFRBaseFacilities||{})
      .map(([key,facility])=>{
        const built=facilityBuilt(key);
        const level=facilityLevel(key);
        const active=selectedFacilityKey===key||Boolean(selectedFacilityId&&g.objects.some(object=>
          object?.id===selectedFacilityId&&object?.type==="facility"&&String(object.facilityKey||"")===String(key)
        ));
        const cost=facilityBuildCost(key);
        const unlocked=Number(A()?.save?.base?.level||1)>=Number(facility.unlock||1);
        return `
          <button
            type="button"
            class="gardenBuildOption gardenFacilityBuildOption ${active?"active":""} ${built?"built":""}"
            data-action="gardenSelectFacility"
            data-facility-key="${escapeHtml(key)}"
            ${!built&&!unlocked?"disabled":""}
          >
            <strong>${FACILITY_ICONS[key]||"🏠"} ${escapeHtml(facility.name)}</strong>
            <small>${built?"設置済み・Lv."+level:escapeHtml(facility.desc)}</small>
            ${built?"<em>設置済み</em>":`<span>${costHtml(cost)}</span>${unlocked?"":"<em>拠点Lv."+Number(facility.unlock||1)+"で解放</em>"}`}
          </button>
        `;
      })
      .join("");

    const cells=[];

    for(let y=0;y<g.height;y++){
      for(let x=0;x<g.width;x++){
        const object=objectAt(x,y);
        const def=object?TYPES[object.type]:null;
        const facilityDef=object?.type==="facility"
          ? window.EFRBaseFacilities?.[object.facilityKey]
          : null;
        const cropState=object?.type==="field"
          ? fieldProgress(object,g)
          : null;
        const treeState=object?.type==="tree"
          ? treeProgress(object,g)
          : null;
        const action=movingFacilityId
          ? (object?"gardenMoveBlocked":"gardenMoveFacility")
          : object
            ? (object.type==="facility"
              ? "gardenFacilitySelect"
              : object.type==="field"
                ? "gardenFieldSelect"
                : object.type==="tree"
                  ? "gardenTreeSelect"
                  : selectedFacilityKey
                    ? "gardenOccupiedBlocked"
                    : "gardenRemove")
            : selectedFacilityKey
              ? "gardenPlaceFacility"
              : "gardenPlace";
        const cellClass="gardenCell"+
          (object?" occupied":"")+
          (cropState?.ready?" gardenCropReady":"")+
          (treeState?.ready?" gardenTreeReady":"");

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
                  <span class="gardenObjectIcon">${object.type==="facility"
                    ? (FACILITY_ICONS[object.facilityKey]||"🏠")
                    : cropState
                      ? (!cropState.planted?"🌱":(cropState.definition?.icon||"🌿"))
                      : treeState
                        ? (treeState.ready?"🌳":"🌱")
                        : (def?.icon||"🌿")}</span>
                  <strong>${escapeHtml(facilityDef?.name||def?.name||"設備")}</strong>
                  <small>${object.type==="facility"
                    ? "Lv."+facilityLevel(object.facilityKey)+"・タップで管理"
                    : cropState
                      ? (!cropState.planted?"畑を管理":cropState.ready?"収穫可能":("残り"+cropState.remaining+"探索"))
                      : treeState
                        ? (treeState.ready?"伐採可能":("残り"+treeState.remaining+"探索"))
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
    const selectedTree=g.objects.find(o=>
      o?.type==="tree"&&o.id===selectedTreeId
    )||null;
    const selectedTreeProgress=selectedTree
      ? treeProgress(selectedTree,g)
      : null;
    const selectedFacilityObject=g.objects.find(object=>
      object?.type==="facility"&&object.id===selectedFacilityId
    )||null;
    const facilityKeyForDetails=selectedFacilityObject?.facilityKey||selectedFacilityKey;
    const selectedFacilityDef=facilityKeyForDetails
      ? window.EFRBaseFacilities?.[facilityKeyForDetails]
      : null;
    const selectedFacilityBuilt=Boolean(selectedFacilityObject);
    const selectedFacilityLevel=selectedFacilityBuilt?facilityLevel(facilityKeyForDetails):0;
    const selectedFacilityBuildCost=facilityKeyForDetails?facilityBuildCost(facilityKeyForDetails):{};
    const selectedFacilityUnlocked=Number(A()?.save?.base?.level||1)>=Number(selectedFacilityDef?.unlock||1);
    const treeHarvestFits=!!selectedTree&&!!selectedTreeProgress?.ready&&canStoreTree();
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
          <div class="efrBaseEyebrow">BASE AREA</div>
          <h2>拠点</h2>
          <p>
            限られた敷地に、畑・木・花・池・倉庫・工房・研究所などを自由に配置できます。
            設備と生産物は同じマスを使うため、敷地の使い方を選ぶことが拠点づくりの中心になります。
          </p>
        </section>

        <section class="efrGardenStatus">
          <div>
            <strong>敷地サイズ</strong>
            <span>${g.width} × ${g.height}</span>
          </div>
          <div>
            <strong>配置数</strong>
            <span>${objectCount} / ${g.width*g.height}</span>
          </div>
          <div>
            <strong>選択中</strong>
            <span>${escapeHtml(selectedFacilityDef?.name||TYPES[selectedType]?.name||"なし")}</span>
          </div>
        </section>

        ${(selectedFacilityKey||selectedFacilityObject)?`
          <section class="hubSection gardenFieldManagement gardenFacilityManagement">
            <h3>${selectedFacilityBuilt?escapeHtml(selectedFacilityDef?.name||"施設")+"の管理":escapeHtml(selectedFacilityDef?.name||"施設")+"を建設"}</h3>
            ${selectedFacilityBuilt?`
              <p class="gardenFieldStatus">${facilityKeyForDetails==="training"?"設置型設備・強化なし":"施設Lv."+selectedFacilityLevel} / 拠点Lv.${Number(A()?.save?.base?.level||1)}</p>
              <p>${escapeHtml(selectedFacilityDef?.desc||"")}</p>
              ${movingFacilityId===selectedFacilityObject.id
                ? `<p>移動モード中です。移動先の空きマスをタップしてください。</p>`
                : ""}
              ${pendingFacilityRemoveId===selectedFacilityObject.id
                ? `<p class="gardenFacilityWarning">撤去すると利用できなくなります。施設レベルは保存され、再設置後に引き継がれます。</p>
                   <div class="gardenFieldActions">
                     <button type="button" data-action="gardenFacilityRemoveConfirm">撤去を確定</button>
                     <button type="button" data-action="gardenFacilityRemoveCancel">キャンセル</button>
                   </div>`
                : `<div class="gardenFieldActions">
                     <button type="button" data-action="gardenFacilityOpen" data-facility-key="${escapeHtml(facilityKeyForDetails)}">機能を開く</button>
                     ${facilityKeyForDetails!=="training"?`<button type="button" data-action="gardenFacilityUpgrade" data-facility-key="${escapeHtml(facilityKeyForDetails)}" ${selectedFacilityLevel>=Number(selectedFacilityDef?.max||0)||Number(A()?.save?.base?.level||1)<Number(selectedFacilityDef?.unlock||1)?"disabled":""}>強化</button>`:""}
                     <button type="button" data-action="gardenFacilityMove">${movingFacilityId===selectedFacilityObject.id?"移動中":"配置変更"}</button>
                     ${movingFacilityId===selectedFacilityObject.id?`<button type="button" data-action="gardenFacilityMoveCancel">移動をキャンセル</button>`:""}
                     <button type="button" data-action="gardenFacilityRemoveRequest">撤去</button>
                   </div>`}
            `:`
              <p>${escapeHtml(selectedFacilityDef?.desc||"")}</p>
              <p>${selectedFacilityUnlocked?"空いているマスをタップすると建設します。":"拠点Lv."+Number(selectedFacilityDef?.unlock||1)+"で建設できます。"}</p>
              <div class="gardenUpgradeCost">${costHtml(selectedFacilityBuildCost)}</div>
              <div class="gardenFieldActions">
                <button type="button" data-action="gardenFacilitySelectionCancel">建設選択を解除</button>
              </div>
            `}
          </section>
        `:""}

        <section class="hubSection efrGardenUpgrade">
          <h3>拠点の敷地を拡張</h3>
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

        <section class="hubSection gardenFieldManagement gardenTreeManagement">
          <h3>木の管理</h3>
          ${selectedTree
            ? `
              <p class="gardenFieldStatus">
                木（${Number(selectedTree.x)+1}, ${Number(selectedTree.y)+1}） /
                累計探索回数 ${g.completedExpeditions}
              </p>
              ${selectedTreeProgress?.ready
                ? `
                  <p>成熟しました。伐採すると木材×${TREE_WOOD_YIELD}を回収し、木は撤去されます。</p>
                  <div class="gardenFieldActions">
                    <button type="button" data-action="gardenTreeHarvest" data-garden-x="${selectedTree.x}" data-garden-y="${selectedTree.y}" ${treeHarvestFits?"":"disabled"}>伐採して木材×${TREE_WOOD_YIELD}を回収</button>
                    <button type="button" data-action="gardenRemove" data-garden-x="${selectedTree.x}" data-garden-y="${selectedTree.y}">木を撤去</button>
                  </div>
                  ${treeHarvestFits?"":"<p>倉庫に空きがないため伐採できません。空きを作ると再試行できます。</p>"}
                `
                : `
                  <p>木を育てています。あと <strong>${selectedTreeProgress?.remaining??REQUIRED_TREE_EXPEDITIONS} 回</strong> の探索終了で伐採できます。</p>
                  <p>探索結果が成功・失敗のどちらでも1回として数えます。現実時間では成長しません。</p>
                  <div class="gardenFieldActions">
                    <button type="button" data-action="gardenRemove" data-garden-x="${selectedTree.x}" data-garden-y="${selectedTree.y}">木を撤去</button>
                  </div>
                `}
            `
            : `<p>木のマスをタップすると、植え付けからの探索回数と伐採操作を管理できます。</p>`
          }
        </section>

        <section class="hubSection">
          <h3>拠点に配置する設備</h3>
          <div class="gardenBuildOptions">
            ${selector}
          </div>
        </section>

        <section class="hubSection">
          <h3>拠点施設を建設</h3>
          <p class="gardenHint">未設置の施設を選び、グリッドの空きマスをタップして建設します。設置済みの施設は選択すると、機能を開く・強化・移動・撤去を操作できます。</p>
          <div class="gardenBuildOptions gardenFacilityBuildOptions">
            ${facilitySelector}
          </div>
        </section>

        <section class="hubSection">
          <h3>拠点グリッド</h3>
          <p class="gardenHint">
            ${movingFacilityId?"移動先の空きマスをタップしてください。":selectedFacilityKey?"空いている場所をタップすると「"+escapeHtml(selectedFacilityDef?.name||"施設")+"」を建設します。": "空いている場所をタップすると選択中の設備を配置します。"}
            畑・木・施設のタップでは詳細を表示します。
          </p>

          <div class="gardenGridViewport">
            <div
              class="gardenGrid"
              style="grid-template-columns:repeat(${g.width},minmax(46px,1fr))"
            >
              ${cells.join("")}
            </div>
          </div>
        </section>

        <section class="hubInfoCard">
          <strong>拠点の発展</strong>
          <p>
            今後ここへ、拠点で暮らす可愛い生き物の住処や、
            生き物が好む環境・巣・水辺・花などを追加できます。
            調教師のペットシステムとは別の拠点要素として扱います。
          </p>
        </section>
      </div>
    `;
  }

  window.EFRGarden={
    TYPES,
    FACILITY_ICONS,
    ensureBase,
    render,
    place,
    placeFacility,
    remove,
    select,
    selectFacility,
    selectFacilityObject,
    startFacilityMove,
    cancelFacilityMove,
    moveSelectedFacility,
    requestFacilityRemoval,
    cancelFacilityRemoval,
    confirmFacilityRemoval,
    selectField,
    selectTree,
    selectSeed,
    plantSeed,
    harvest,
    harvestTree,
    beginExpedition,
    onRaidFinished,
    nextUpgradeCost,
    canUpgrade,
    upgrade,
    sizeLabel(){
      const g=ensureBase();
      return g?`${g.width} × ${g.height}`:"6 × 4";
    },
    get harvestItemNames(){
      return Object.values(CROP)
        .map(crop=>crop.harvestName)
        .filter(name=>typeof name==="string"&&name.length>0);
    },
    get selectedFacilityKey(){
      return selectedFacilityKey;
    },
    get selectedType(){
      return selectedType;
    }
  };
})();
