/* EFR base/crafting/equipment integration v1 */
(function(){
  "use strict";
  function G(){return window.EFRGame}
  function X(){return window.EFRContentExpansion}
  function clone(x){return x==null?x:JSON.parse(JSON.stringify(x))}
  function log(msg){G()?.logMessage?.(msg)}

  const FACILITIES={
    storage:{
      name:"倉庫",
      desc:"保管上限を増やす",
      max:5,
      unlock:1,
      cost:[
        {"鉄くず":3},
        {"高品質金属":2,"金属部品":1},
        {"加工金属":2,"精密機械部品":1},
        {"強化素材":2,"回路基板":1}
      ]
    },
    shop:{
      name:"ショップ",
      desc:"基本素材・弾薬・基本回復品を購入する",
      max:1,
      unlock:1,
      cost:[]
    },
    workbench:{
      name:"工作台",
      desc:"簡易武器・消耗品・素材クラフトを強化する",
      max:5,
      unlock:1,
      cost:[
        {"鉄くず":3},
        {"高品質金属":2,"金属部品":1},
        {"加工金属":2,"精密機械部品":1},
        {"強化素材":2,"回路基板":1}
      ]
    },
    workshop:{
      name:"工房",
      desc:"近接武器・銃器・弓・防具の製作設備を強化する",
      max:5,
      unlock:2,
      cost:[
        {"鉄くず":3},
        {"高品質金属":2,"金属部品":1},
        {"加工金属":2,"精密機械部品":1},
        {"強化素材":2,"回路基板":1}
      ]
    },
    maintenance:{
      name:"整備台",
      desc:"修理・分解・装備Lv/レアリティ強化と上限解放",
      max:5,
      unlock:2,
      cost:[
        {"鉄くず":3},
        {"高品質金属":2,"金属部品":1},
        {"加工金属":2,"精密機械部品":1},
        {"強化素材":2,"回路基板":1}
      ]
    },
    medical:{
      name:"医療設備",
      desc:"回復アイテムの製作設備を強化する",
      max:5,
      unlock:2,
      cost:[
        {"鉄くず":3},
        {"高品質金属":2,"金属部品":1},
        {"加工金属":2,"精密機械部品":1},
        {"強化素材":2,"回路基板":1}
      ]
    },
    kitchen:{
      name:"調理台",
      desc:"食材と飲料水から料理を作る",
      max:5,
      unlock:1,
      cost:[
        {"鉄くず":3},
        {"高品質金属":2,"金属部品":1},
        {"加工金属":2,"精密機械部品":1},
        {"強化素材":2,"回路基板":1}
      ]
    },
    research:{
      name:"研究所",
      desc:"アイテムごとの研究を行いレシピを解放する",
      max:5,
      unlock:1,
      cost:[
        {"鉄くず":3},
        {"高品質金属":2,"金属部品":1},
        {"加工金属":2,"精密機械部品":1},
        {"強化素材":2,"回路基板":1}
      ]
    }
  };

  // Training is a placeable, non-upgradable facility; its runtime does not store a level.
  FACILITIES.training={
    name:"訓練場",
    desc:"近接・銃器・弓・魔法を無消費で試せる訓練設備",
    max:1,
    unlock:1,
    cost:[]
  };

  const FACILITY_BUILD_COSTS=Object.freeze({
    storage:Object.freeze({"木材":1}),
    shop:Object.freeze({"木材":1}),
    workbench:Object.freeze({"木材":1}),
    workshop:Object.freeze({"木材":1}),
    maintenance:Object.freeze({"木材":1}),
    medical:Object.freeze({"木材":1}),
    research:Object.freeze({"木材":1}),
    training:Object.freeze({"木材":1}),
    kitchen:Object.freeze({"木材":1})
  });

  const recipeId=name=>"recipe."+encodeURIComponent(String(name));

  function materialItem(name,weight=1,slots=1){
    const rarity=
      Number(
        X()?.materialRarity?.(name) ||
        X()?.catalog?.materialRarity?.(name) ||
        1
      );

    return {
      name,
      kind:"material",
      amount:1,
      slots,
      weight,
      rarity
    };
  }

  const EXTRA_RECIPES=[
    /* --- 調理台の料理 --- */
    {name:"焼きニンジン",facility:"kitchen",level:1,researchable:false,cost:{"ニンジン":1},make:()=>({name:"焼きニンジン",kind:"heal",value:15,foodRestore:35,waterRestore:0,weight:.25,slots:1,gridW:1,gridH:1})},
    {name:"焼きジャガイモ",facility:"kitchen",level:1,researchable:false,cost:{"ジャガイモ":1},make:()=>({name:"焼きジャガイモ",kind:"heal",value:15,foodRestore:40,waterRestore:0,weight:.25,slots:1,gridW:1,gridH:1})},
    {name:"小麦粥",facility:"kitchen",level:1,researchable:false,cost:{"小麦":1,"飲料水":1},make:()=>({name:"小麦粥",kind:"heal",value:15,foodRestore:35,waterRestore:20,weight:.35,slots:1,gridW:1,gridH:1})},
    {name:"野菜スープ",facility:"kitchen",level:1,researchable:false,cost:{"ニンジン":1,"ジャガイモ":1,"飲料水":1},make:()=>({name:"野菜スープ",kind:"heal",value:15,foodRestore:30,waterRestore:35,weight:.45,slots:1,gridW:1,gridH:1})},

    /* --- 弾薬 --- */
    {name:"矢",facility:"workbench",level:1,cost:{"木材":1,"鉄くず":1},make:()=>({name:"矢",kind:"ammo",amount:12,weight:.24,slots:1})},
    {name:"棍棒",facility:"workbench",level:1,researchable:false,cost:{"木材":2},make:()=>({name:"棍棒",kind:"weapon",damage:12,range:40,cooldown:.48,knockback:2,weight:1.2,slots:1,durability:50,maxDurability:50})},
    {name:"斧",facility:"workbench",level:1,researchable:false,cost:{"木材":1,"鉄くず":1},make:()=>({name:"斧",kind:"weapon",damage:11,range:42,cooldown:.55,knockback:2,weight:1.5,slots:1,durability:60,maxDurability:60})},

    /* --- 近接武器 --- */
    {name:"ナイフ",facility:"workshop",level:1,researchable:false,cost:{"鉄くず":2},make:()=>({name:"ナイフ",kind:"weapon",damage:22,range:42,cooldown:.22,knockback:8,weight:.8,slots:1,durability:60,maxDurability:60})},
    {name:"鉄パイプ",facility:"workshop",level:1,researchable:false,cost:{"鉄くず":3},make:()=>({name:"鉄パイプ",kind:"weapon",damage:30,range:48,cooldown:.55,knockback:22,weight:1.8,slots:2,durability:70,maxDurability:70})},
    {name:"バット",facility:"workshop",level:2,cost:{"木材":3,"鉄くず":1},make:()=>({name:"バット",kind:"weapon",damage:34,range:48,cooldown:.58,knockback:10,weight:2.2,slots:2,durability:80,maxDurability:80})},
    {name:"ハンマー",facility:"workshop",level:1,cost:{"木材":1,"鉄くず":4,"ボルト":2},make:()=>({name:"ハンマー",kind:"weapon",damage:42,range:42,cooldown:.72,knockback:18,weight:2.8,slots:2,durability:75,maxDurability:75})},
    {name:"手斧",facility:"workshop",level:2,cost:{"木材":1,"鉄くず":5,"高品質金属":1},make:()=>({name:"手斧",kind:"weapon",damage:46,range:45,cooldown:.64,knockback:20,weight:2.5,slots:2,durability:70,maxDurability:70})},
    {name:"マチェット",facility:"workshop",level:2,cost:{"鉄くず":5,"高品質金属":1,"革":1},make:()=>({name:"マチェット",kind:"weapon",damage:38,range:52,cooldown:.42,knockback:12,weight:2,durability:85,maxDurability:85,slots:2})},

    /* --- 銃器 --- */
    {name:"ハンドガン",facility:"workshop",level:1,cost:{"鉄くず":5,"高品質金属":1,"ネジ":3},make:()=>({name:"ハンドガン",kind:"firearm",damage:28,range:250,cooldown:.32,magSize:12,ammoType:"9mm",weight:1.4,durability:70,maxDurability:70,ammo:0,mods:[],slots:2})},
    {name:"SMG",facility:"workshop",level:2,cost:{"鉄くず":6,"高品質金属":2,"ネジ":4,"電子部品":1},make:()=>({name:"SMG",kind:"firearm",damage:18,range:260,cooldown:.11,magSize:30,ammoType:"9mm",weight:2.8,durability:90,maxDurability:90,ammo:0,mods:[],slots:3})},
    {name:"ショットガン",facility:"workshop",level:2,cost:{"鉄くず":8,"高品質金属":2,"木材":2,"ネジ":4},make:()=>({name:"ショットガン",kind:"firearm",damage:52,range:190,cooldown:.8,magSize:6,ammoType:"12ゲージ",weight:4.2,durability:80,maxDurability:80,ammo:0,mods:[],slots:3})},
    {name:"アサルトライフル",facility:"workshop",level:3,cost:{"鉄くず":10,"高品質金属":4,"電子部品":2,"ネジ":5},make:()=>({name:"アサルトライフル",kind:"firearm",damage:24,range:300,cooldown:.14,magSize:30,ammoType:"5.56mm",weight:3.6,durability:100,maxDurability:100,ammo:0,mods:[],slots:3})},
    {name:"マークスマンライフル",facility:"workshop",level:3,cost:{"鉄くず":10,"高品質金属":5,"電子部品":2,"ボルト":4},make:()=>({name:"マークスマンライフル",kind:"firearm",damage:48,range:420,cooldown:.55,magSize:10,ammoType:"7.62mm",weight:4.4,durability:110,maxDurability:110,ammo:0,mods:[],slots:3})},
    {name:"スナイパーライフル",facility:"workshop",level:3,cost:{"鉄くず":12,"高品質金属":6,"電子部品":2,"ボルト":5},make:()=>({name:"スナイパーライフル",kind:"firearm",damage:95,range:650,cooldown:1.15,magSize:5,ammoType:"7.62mm",weight:6.2,durability:115,maxDurability:115,ammo:0,mods:[],slots:3})},
    {name:"ボルトアクション",facility:"workshop",level:3,cost:{"鉄くず":14,"高品質金属":7,"木材":2,"ボルト":6},make:()=>({name:"ボルトアクション",kind:"firearm",damage:125,range:720,cooldown:1.45,magSize:4,ammoType:"7.62mm",weight:6.8,durability:120,maxDurability:120,ammo:0,mods:[],slots:3})},

    /* --- 弓 --- */
    {name:"狩猟弓",facility:"workshop",level:1,cost:{"木材":5,"革":2,"接着剤":1},make:()=>({name:"狩猟弓",kind:"firearm",isBow:true,damage:38,range:360,cooldown:.75,magSize:1,ammoType:"矢",weight:1.8,durability:80,maxDurability:80,ammo:0,mods:[],slots:2})},
    {name:"コンポジットボウ",facility:"workshop",level:3,cost:{"木材":3,"高品質金属":3,"革":2,"接着剤":2},make:()=>({name:"コンポジットボウ",kind:"firearm",isBow:true,damage:62,range:480,cooldown:.9,magSize:1,ammoType:"矢",weight:2.4,durability:100,maxDurability:100,ammo:0,mods:[],slots:3})},

    /* --- 防具追加 --- */
    {name:"戦術ヘルメット",facility:"workshop",level:3,cost:{"鉄くず":5,"高品質金属":2,"布":1},make:()=>({name:"戦術ヘルメット",kind:"armor",slotType:"head",reduction:6,slots:1,durability:100,maxDurability:100})},
    {name:"戦闘アーマー",facility:"workshop",level:4,cost:{"鉄くず":8,"高品質金属":4,"布":2,"革":2},make:()=>({name:"戦闘アーマー",kind:"armor",slotType:"chest",reduction:9,slots:2,durability:100,maxDurability:100})},
    {name:"戦術ブーツ",facility:"workshop",level:3,cost:{"革":3,"高品質金属":1,"布":2},make:()=>({name:"戦術ブーツ",kind:"armor",slotType:"legs",reduction:5,slots:1,durability:100,maxDurability:100})},

    /* --- 素材加工。工作台へ統一 --- */
    {name:"加工金属",facility:"workbench",level:1,researchable:false,cost:{"鉄くず":3},make:()=>materialItem("加工金属",1,1)},
    {name:"回路基板",facility:"workbench",level:1,researchable:false,cost:{"電子部品":2,"ガラス":1,"プラスチック":1},make:()=>materialItem("回路基板",.5,2)},
    {name:"医療キット素材",facility:"workbench",level:1,researchable:false,cost:{"医療素材":2,"布":2,"プラスチック":1},make:()=>materialItem("医療キット素材",.5,1)},

    // 追加中間素材。研究不要で、クラフトでも探索Lootでも入手できる。
    {name:"絶縁配線",facility:"workbench",level:1,researchable:false,cost:{"銅線":2,"絶縁材":1,"ケーブル":1},make:()=>materialItem("絶縁配線",.6,1)},
    {name:"金属部品",facility:"workbench",level:1,researchable:false,cost:{"金属板":1,"ボルト":2},make:()=>materialItem("金属部品",1,1)},
    {name:"精密機械部品",facility:"workbench",level:1,researchable:false,cost:{"精密部品":1,"軸受":1,"歯車":1},make:()=>materialItem("精密機械部品",.8,1)},
    {name:"駆動ユニット",facility:"workbench",level:1,researchable:false,cost:{"モーター":1,"歯車":1,"ケーブル":1},make:()=>materialItem("駆動ユニット",1.2,2)},
    {name:"電子制御部品",facility:"workbench",level:1,researchable:false,cost:{"マイクロチップ":1,"半導体":1,"トランジスタ":1},make:()=>materialItem("電子制御部品",.4,1)},
    {name:"センサーユニット",facility:"workbench",level:1,researchable:false,cost:{"センサー":1,"コネクタ":1,"絶縁材":1},make:()=>materialItem("センサーユニット",.5,1)},
    {name:"光学ユニット",facility:"workbench",level:1,researchable:false,cost:{"光学部品":1,"レンズ":1,"研磨材":1},make:()=>materialItem("光学ユニット",.5,1)},
    {name:"高性能電池",facility:"workbench",level:1,researchable:false,cost:{"電池セル":2,"バッテリー":1},make:()=>materialItem("高性能電池",.8,2)},
    {name:"化学試薬セット",facility:"workbench",level:1,researchable:false,cost:{"化学薬品":1,"試薬":2,"サンプル容器":1},make:()=>materialItem("化学試薬セット",.6,1)},
    {name:"医療繊維素材",facility:"workbench",level:1,researchable:false,cost:{"滅菌ガーゼ":2,"医療テープ":1,"強化布":1},make:()=>materialItem("医療繊維素材",.4,1)},
    {name:"合成補強材",facility:"workbench",level:1,researchable:false,cost:{"合成皮革":1,"強化布":1,"樹脂":1},make:()=>materialItem("合成補強材",.7,1)},
    {name:"強化素材",facility:"workbench",level:1,researchable:false,cost:{"加工金属":1,"強化布":1,"樹脂":1},make:()=>materialItem("強化素材",1,2)},


    {name:"9mm弾",facility:"workbench",level:1,cost:{"火薬":1,"鉄くず":1,"ネジ":1},make:()=>({name:"9mm",kind:"ammo",amount:12,weight:.096,slots:1})},
    {name:"12ゲージ弾",facility:"workbench",level:1,cost:{"火薬":2,"鉄くず":1,"布":1},make:()=>({name:"12ゲージ",kind:"ammo",amount:6,weight:.21,slots:1})},
    {name:"5.56mm弾",facility:"workbench",level:2,cost:{"火薬":2,"高品質金属":1,"ネジ":1},make:()=>({name:"5.56mm",kind:"ammo",amount:10,weight:.12,slots:1})},
    {name:"7.62mm弾",facility:"workbench",level:2,cost:{"火薬":2,"高品質金属":1,"ボルト":1},make:()=>({name:"7.62mm",kind:"ammo",amount:8,weight:.2,slots:1})},
    {name:"応急包帯",facility:"medical",level:1,researchable:false,cost:{"布":2,"医療素材":1,"接着剤":1},make:()=>({name:"応急包帯",kind:"heal",value:25,weight:.4,slots:1})},
    {name:"医療キット",facility:"medical",level:2,cost:{"布":2,"医療素材":2,"接着剤":1},make:()=>({name:"医療キット",kind:"heal",value:50,weight:.6,slots:1})},
    {name:"高性能医療キット",facility:"medical",level:3,cost:{"布":2,"医療素材":3,"接着剤":2},make:()=>({name:"高性能医療キット",kind:"heal",value:75,weight:.8,slots:1})},
    {name:"戦闘用メディキット",facility:"medical",level:4,cost:{"布":3,"医療素材":4,"接着剤":2,"プラスチック":1},make:()=>({name:"戦闘用メディキット",kind:"heal",value:100,weight:1,slots:1})},
    {name:"完全回復剤",facility:"medical",level:5,cost:{"布":3,"医療素材":5,"接着剤":3,"プラスチック":2},make:()=>({name:"完全回復剤",kind:"heal",value:150,weight:1.2,slots:1})},
    {name:"微量魔力薬",facility:"medical",level:1,researchable:false,cost:{"布":1,"医療素材":1,"接着剤":1},make:()=>({name:"微量魔力薬",kind:"mpRestore",value:25,weight:.4,slots:1})},
    {name:"魔力回復薬",facility:"medical",level:2,cost:{"布":1,"医療素材":2,"接着剤":1},make:()=>({name:"魔力回復薬",kind:"mpRestore",value:50,weight:.5,slots:1})},
    {name:"高濃度魔力薬",facility:"medical",level:3,cost:{"布":1,"医療素材":3,"接着剤":2},make:()=>({name:"高濃度魔力薬",kind:"mpRestore",value:75,weight:.6,slots:1})},
    {name:"精製魔力エリクサー",facility:"medical",level:4,cost:{"布":2,"医療素材":4,"接着剤":2,"プラスチック":1},make:()=>({name:"精製魔力エリクサー",kind:"mpRestore",value:100,weight:.8,slots:1})},
    {name:"超濃縮魔力剤",facility:"medical",level:5,cost:{"布":2,"医療素材":5,"接着剤":3,"プラスチック":2},make:()=>({name:"超濃縮魔力剤",kind:"mpRestore",value:150,weight:1,slots:1})},
    {name:"簡易ヘルメット",facility:"workshop",level:1,cost:{"鉄くず":3,"布":2,"ボルト":1},make:()=>({name:"軽量ヘルメット",kind:"armor",slotType:"head",reduction:2,durability:80,maxDurability:80,slots:1,weight:1.5})},
    {name:"防護ヘルメット",facility:"workshop",level:2,cost:{"高品質金属":2,"布":2,"ボルト":2},make:()=>({name:"防護ヘルメット",kind:"armor",slotType:"head",reduction:4,durability:100,maxDurability:100,slots:1,weight:2})},
    {name:"軽量アーマー",facility:"workshop",level:1,cost:{"鉄くず":4,"布":3,"革":2,"ボルト":2},make:()=>({name:"軽量アーマー",kind:"armor",slotType:"chest",reduction:3,durability:100,maxDurability:100,slots:2,weight:3})},
    {name:"防護ベスト",facility:"workshop",level:3,cost:{"高品質金属":3,"布":4,"革":2,"ボルト":3},make:()=>({name:"防護ベスト",kind:"armor",slotType:"chest",reduction:6,durability:130,maxDurability:130,slots:2,weight:4})},
    {name:"小型バックパック",facility:"workshop",level:1,cost:{"布":3,"革":2,"ボルト":1},make:()=>({name:"小型バックパック",kind:"backpack",slotType:"backpack",capacity:6,slots:2,weight:2})},
    {name:"タクティカルバックパック",facility:"workshop",level:2,cost:{"布":4,"革":3,"電子部品":1,"ボルト":2},make:()=>({name:"タクティカルバックパック",kind:"backpack",slotType:"backpack",capacity:12,slots:2,weight:3.5})},
    {name:"大型バックパック",facility:"workshop",level:4,cost:{"布":6,"革":4,"電子部品":2,"ボルト":4},make:()=>({name:"大型バックパック",kind:"backpack",slotType:"backpack",capacity:18,slots:3,weight:5})},
    {name:"修理キット・改",facility:"workbench",level:2,cost:{"鉄くず":3,"ネジ":2,"布":1,"接着剤":1},make:()=>({name:"修理キット・改",kind:"repair",weight:1,slots:1})}
  ];

  const CRAFT_PROGRESS_MATERIALS=Object.freeze({
    workbench:Object.freeze({
      2:Object.freeze({"金属部品":1}),
      3:Object.freeze({"電子制御部品":1}),
      4:Object.freeze({"回路基板":1}),
      5:Object.freeze({"強化素材":1,"回路基板":1})
    }),
    workshop:Object.freeze({
      2:Object.freeze({"金属部品":1}),
      3:Object.freeze({"精密機械部品":1}),
      4:Object.freeze({"強化素材":1}),
      5:Object.freeze({"強化素材":2,"光学ユニット":1})
    }),
    medical:Object.freeze({
      2:Object.freeze({"医療繊維素材":1}),
      3:Object.freeze({"合成補強材":1}),
      4:Object.freeze({"医療キット素材":1}),
      5:Object.freeze({"医療キット素材":2,"化学試薬セット":1})
    })
  });

  function applyCraftProgressionCost(recipe){
    const level=Math.max(1,Number(recipe?.level||1));
    const extras=
      CRAFT_PROGRESS_MATERIALS[recipe?.facility]?.[level];

    if(!extras)return;

    recipe.cost=recipe.cost||{};

    for(const [name,count] of Object.entries(extras)){
      recipe.cost[name]=
        Math.max(0,Number(recipe.cost[name]||0))+
        Number(count||0);
    }
  }

  EXTRA_RECIPES.forEach(applyCraftProgressionCost);

  const RECIPE_IDS=new Set();
  EXTRA_RECIPES.forEach((r,index)=>{
    if(!r?.name){
      throw new Error("Recipe name is missing at index "+index);
    }

    const id=recipeId(r.name);

    if(RECIPE_IDS.has(id)){
      throw new Error("Duplicate recipe id: "+id);
    }

    if(!FACILITIES[r.facility]){
      throw new Error("Unknown recipe facility: "+r.facility);
    }

    const level=Number(r.level||1);
    if(!Number.isInteger(level)||level<1){
      throw new Error("Invalid recipe facility level: "+r.name);
    }

    if(!r.cost||typeof r.cost!=="object"){
      throw new Error("Recipe cost is missing: "+r.name);
    }

    const preview=
      typeof r.make==="function"
        ? r.make()
        : null;

    if(!preview?.name||!preview?.kind){
      throw new Error("Recipe output is invalid: "+r.name);
    }

    r.id=id;
    r.displayName=String(r.name);
    r.output={
      name:String(preview.name),
      kind:String(preview.kind),
      quantity:Math.max(1,Number(preview.amount)||1)
    };

    RECIPE_IDS.add(id);
  });

  const ECONOMY_SELL_RATE=0.30;
  const ECONOMY_BUY_RATE=1.50;

  const SHOP_BASIC_MATERIALS=Object.freeze([
    "木材","鉄くず","布","革","ネジ","ボルト","接着剤",
    "プラスチック","ガラス","ケーブル","電子部品",
    "バッテリー","化学薬品","医療素材","火薬"
  ]);

  const SHOP_BASIC_RECIPE_NAMES=Object.freeze([
    "矢","9mm弾","12ゲージ弾","5.56mm弾","7.62mm弾",
    "応急包帯","微量魔力薬"
  ]);

  const MATERIAL_BASE_VALUES=Object.freeze({
    1:10,
    2:25,
    3:50,
    4:100,
    5:200
  });

  const AMMO_BASE_VALUES=Object.freeze({
    "9mm":6,
    "12ゲージ":20,
    "5.56mm":16,
    "7.62mm":20,
    "矢":3
  });

  // 初期基本価値は現行の入手難易度に基づく共通値。
  const PET_BASE_VALUE=500;
  const KEY_BASE_VALUES=Object.freeze({
    military:1000,
    research:1000,
    factory:1000,
    storage:1000,
    security:1000,
    special:1000
  });

  function findRecipeForItem(item){
    const name=String(item?.name||"");
    const kind=String(item?.kind||"");

    return EXTRA_RECIPES.find(recipe=>
      recipe?.output?.name===name &&
      recipe?.output?.kind===kind
    ) || null;
  }

  function recipeCostBaseValue(cost={},trail=new Set()){
    return Object.entries(cost||{}).reduce(
      (sum,[name,count])=>
        sum+
        materialUnitBaseValue(
          name,
          trail
        )*
        Math.max(0,Number(count)||0),
      0
    );
  }

  function materialUnitBaseValue(name,trail=new Set()){
    const materialName=String(name||"");
    const rarity=
      Number(
        X()?.materialRarity?.(materialName) ||
        X()?.catalog?.materialRarity?.(materialName) ||
        1
      );

    const fallback=
      Number(MATERIAL_BASE_VALUES[
        Math.max(1,Math.min(5,rarity))
      ]||10);

    if(trail.has(materialName)){
      return fallback;
    }

    const recipe=findRecipeForItem({
      name:materialName,
      kind:"material"
    });

    if(!recipe){
      return fallback;
    }

    const nextTrail=new Set(trail);
    nextTrail.add(materialName);

    const outputQuantity=Math.max(
      1,
      Number(recipe.output?.quantity||1)
    );

    const recipeValue=recipeCostBaseValue(
      recipe.cost,
      nextTrail
    );

    // 中間素材はレア度に応じた最低価値と製作原価の両方を尊重する。
    return Math.max(
      fallback,
      Math.ceil(recipeValue/outputQuantity)
    );
  }

  function fallbackUnitBaseValue(item){
    const rarity=Math.max(
      1,
      Math.min(
        5,
        Number(item?.rarity||1)
      )
    );

    const rarityBase=
      Number(MATERIAL_BASE_VALUES[rarity]||10);

    const weight=Math.max(
      0,
      Number(item?.weight)||0
    );

    const slots=Math.max(
      1,
      Number(item?.slots||1)
    );

    const damage=Math.max(
      0,
      Number(item?.damage||item?.baseDamage||0)
    );

    const reduction=Math.max(
      0,
      Number(item?.reduction||0)
    );

    const capacity=Math.max(
      0,
      Number(item?.capacity||0)
    );

    const value=Math.max(
      0,
      Number(item?.value||0)
    );

    return Math.max(
      1,
      Math.ceil(
        rarityBase+
        weight*10+
        slots*5+
        damage*2+
        reduction*12+
        capacity*8+
        value*.5
      )
    );
  }

  function itemUnitBaseValue(item,trail=new Set()){
    if(!item){
      return 0;
    }

    const kind=String(item.kind||"");
    const name=String(item.name||"");

    if(kind==="pet"){
      return item?.petId ? PET_BASE_VALUE : 0;
    }

    if(kind==="key"){
      return Number(
        KEY_BASE_VALUES[String(item?.keyType||"")]||0
      );
    }

    if(kind==="ammo"){
      return Number(
        AMMO_BASE_VALUES[name]||5
      );
    }

    if(kind==="material"){
      return materialUnitBaseValue(
        name,
        trail
      );
    }

    if(kind==="blueprint"){
      const recipe=EXTRA_RECIPES.find(
        entry=>
          String(entry?.id||"")===
          String(item?.recipeId||"")
      );

      if(recipe?.output){
        const outputItem={
          name:recipe.output.name,
          kind:recipe.output.kind
        };

        return Math.max(
          1,
          Math.floor(
            itemUnitBaseValue(
              outputItem,
              new Set([...trail,name])
            )*.20
          )
        );
      }

      return 10;
    }

    const recipe=findRecipeForItem(item);

    if(
      recipe &&
      !trail.has(name)
    ){
      const nextTrail=new Set(trail);
      nextTrail.add(name);

      const outputQuantity=Math.max(
        1,
        Number(recipe.output?.quantity||1)
      );

      const recipeValue=recipeCostBaseValue(
        recipe.cost,
        nextTrail
      );

      return Math.max(
        1,
        Math.ceil(recipeValue/outputQuantity)
      );
    }

    if(kind==="weaponPart"){
      const rarity=Math.max(
        1,
        Math.min(
          5,
          Number(item.rarity||1)
        )
      );

      return Number(
        MATERIAL_BASE_VALUES[rarity]||10
      )*4;
    }

    if(kind==="loot"){
      const rarity=Math.max(
        1,
        Math.min(
          5,
          Number(item.rarity||1)
        )
      );

      return Number(
        MATERIAL_BASE_VALUES[rarity]||10
      );
    }

    return fallbackUnitBaseValue(item);
  }

  function itemBasicValue(item){
    if(!item){
      return 0;
    }

    const unit=itemUnitBaseValue(item);
    const amount=
      item.kind==="ammo" ||
      item.kind==="material"
        ? Math.max(
            1,
            Math.floor(
              Number(item.amount)||1
            )
          )
        : 1;

    return Math.max(
      0,
      unit*amount
    );
  }

  function itemSellPrice(item){
    const baseValue=itemBasicValue(item);

    if(
      !item ||
      baseValue<=0
    ){
      return 0;
    }

    return Math.max(
      1,
      Math.floor(
        baseValue*ECONOMY_SELL_RATE
      )
    );
  }

  function shopPurchasePrice(item){
    const baseValue=itemBasicValue(item);
    if(!item||baseValue<=0)return 0;
    return Math.max(
      itemSellPrice(item)+1,
      Math.ceil(baseValue*ECONOMY_BUY_RATE)
    );
  }

  function shopProducts(){
    const products=[];

    for(const name of SHOP_BASIC_MATERIALS){
      const item=normalizeStashItem({
        name,
        kind:"material",
        amount:1,
        slots:1
      });
      if(!item)continue;
      products.push({
        id:"material:"+name,
        name,
        category:"素材",
        item,
        price:shopPurchasePrice(item)
      });
    }

    for(const recipeName of SHOP_BASIC_RECIPE_NAMES){
      const recipe=EXTRA_RECIPES.find(entry=>entry.name===recipeName);
      if(!recipe||typeof recipe.make!=="function")continue;
      const item=normalizeStashItem(recipe.make());
      if(!item)continue;
      const category=item.kind==="ammo"
        ? "弾薬"
        : item.kind==="heal"||item.kind==="mpRestore"
          ? "回復"
          : "素材";
      products.push({
        id:"recipe:"+recipeName,
        name:String(item.name||recipeName),
        category,
        item,
        price:shopPurchasePrice(item)
      });
    }

    return products;
  }

  function purchaseShopProduct(productId){
    const a=G();
    const save=a?.save;
    if(!a||!save)return {success:false,reason:"save"};

    if(facilityLevel("shop")<1){
      log("ショップ施設を利用できません");
      return {success:false,reason:"facility"};
    }

    const product=shopProducts().find(entry=>entry.id===String(productId||""));
    if(!product||product.price<=0){
      log("購入商品が見つかりません");
      return {success:false,reason:"product"};
    }

    const balance=currency();
    if(balance<product.price){
      log("所持金が不足しています");
      return {success:false,reason:"currency"};
    }

    if(!Array.isArray(save.stash))save.stash=[];
    const plan=planStashAdditions(
      save.stash,
      [product.item],
      storageCapacity()
    );
    if(!plan.acceptedIndices.includes(0)){
      window.EFRGrid?.flash?.();
      log("倉庫に空きがないため購入できません。所持金は消費していません");
      return {success:false,reason:"stash"};
    }

    // Commit the accepted stash plan and currency change together.
    save.stash.splice(0,save.stash.length,...plan.items);
    save.currency=balance-product.price;
    a.persist?.();
    a.renderBase?.();
    a.renderInventory?.();
    window.EFRHub?.render?.();
    window.EFRLoadout?.render?.();
    log(product.name+"を購入しました（"+product.price+"）");
    return {
      success:true,
      id:product.id,
      price:product.price,
      currency:save.currency
    };
  }

  function currency(){
    const a=G();

    if(!a?.save){
      return 0;
    }

    a.save.currency=Math.max(
      0,
      Math.floor(
        Number(a.save.currency)||0
      )
    );

    return a.save.currency;
  }

  function addCurrency(amount){
    const a=G();

    if(!a?.save){
      return false;
    }

    const delta=Math.max(
      0,
      Math.floor(Number(amount)||0)
    );

    a.save.currency=
      Math.max(
        0,
        Math.floor(
          Number(a.save.currency)||0
        )+delta
      );

    a.persist?.();
    return true;
  }

  function spendCurrency(amount){
    const a=G();

    if(!a?.save){
      return false;
    }

    const cost=Math.max(
      0,
      Math.floor(Number(amount)||0)
    );

    const current=currency();

    if(current<cost){
      return false;
    }

    a.save.currency=current-cost;
    a.persist?.();
    return true;
  }

  function petSaleBlocked(a,petId){
    const id=String(petId||"");
    if(!id)return true;

    const equipped=Object.values(
      a?.save?.equipment||{}
    ).some(item=>
      item?.kind==="pet" &&
      String(item.petId||"")===id
    );

    const carried=(Array.isArray(a?.player?.loot)?a.player.loot:[])
      .some(item=>
        item?.kind==="pet" &&
        String(item.petId||"")===id
      );

    return equipped||carried;
  }

  function sellSelectedStorageItems(selection){
    const a=G();
    const save=a?.save;

    if(
      !save ||
      !Array.isArray(save.stash) ||
      !Array.isArray(selection) ||
      !selection.length
    ){
      return {success:false,count:0,total:0};
    }

    const stash=save.stash;
    const animals=Array.isArray(save.animals)?save.animals:[];
    const keys=Array.isArray(save.keys)?save.keys:[];
    const findAnimal=id=>animals.find(animal=>
      String(animal?.id||"")===String(id||"")
    )||null;
    const stashReferencesPet=id=>stash.some(item=>
      item?.kind==="pet" &&
      String(item.petId||"")===String(id||"")
    );
    const seenTargets=new Set();
    const seenPets=new Set();
    const plans=[];

    // Validate every entry before mutating any inventory or currency.
    for(const entry of selection){
      const source=String(entry?.source||"");
      let index=-1;
      let petId="";
      let item=null;
      let identity="";

      if(source==="stash"){
        index=Math.floor(Number(entry?.index));
        if(
          !Number.isInteger(index) ||
          index<0 ||
          index>=stash.length
        ){
          return {success:false,count:0,total:0};
        }

        item=stash[index];
        if(
          !item ||
          typeof item==="string" ||
          (entry?.item && item!==entry.item)
        ){
          return {success:false,count:0,total:0};
        }

        identity="stash:"+index;
        if(item.kind==="pet"){
          petId=String(item.petId||"");
          if(
            !petId ||
            !findAnimal(petId) ||
            petSaleBlocked(a,petId)
          ){
            return {success:false,count:0,total:0};
          }
        }
      }else if(source==="pet"){
        petId=String(entry?.petId||"");
        const animal=findAnimal(petId);
        if(
          !animal ||
          petSaleBlocked(a,petId) ||
          stashReferencesPet(petId)
        ){
          return {success:false,count:0,total:0};
        }

        item={
          kind:"pet",
          petId,
          name:String(animal.name||animal.type||"ペット")
        };
        identity="pet:"+petId;
      }else if(source==="key"){
        index=Math.floor(Number(entry?.index));
        if(
          !Array.isArray(save.keys) ||
          !Number.isInteger(index) ||
          index<0 ||
          index>=keys.length
        ){
          return {success:false,count:0,total:0};
        }

        const keyType=String(keys[index]||"");
        if(
          (entry?.keyType && String(entry.keyType)!==keyType) ||
          !Number(KEY_BASE_VALUES[keyType]||0)
        ){
          return {success:false,count:0,total:0};
        }

        item={
          kind:"key",
          keyType,
          name:keyType
        };
        identity="key:"+index;
      }else{
        return {success:false,count:0,total:0};
      }

      if(seenTargets.has(identity)){
        return {success:false,count:0,total:0};
      }
      seenTargets.add(identity);

      if(petId){
        if(seenPets.has(petId)){
          return {success:false,count:0,total:0};
        }
        seenPets.add(petId);
      }

      if(
        (
          source==="stash" &&
          item.kind!=="pet" &&
          item.sellProtected===true
        ) ||
        (petId && findAnimal(petId)?.sellProtected===true) ||
        (
          source==="key" &&
          Array.isArray(save.protectedKeyTypes) &&
          save.protectedKeyTypes.includes(item.keyType)
        )
      ){
        return {success:false,count:0,total:0};
      }

      const price=itemSellPrice(item);
      if(price<=0){
        return {success:false,count:0,total:0};
      }

      plans.push({source,index,petId,item,price});
    }

    const total=plans.reduce((sum,plan)=>sum+plan.price,0);
    if(total<=0)return {success:false,count:0,total:0};

    const stashIndices=new Set(
      plans.filter(plan=>plan.source==="stash")
        .map(plan=>plan.index)
    );
    const keyIndices=plans
      .filter(plan=>plan.source==="key")
      .map(plan=>plan.index)
      .sort((a,b)=>b-a);
    const soldPetIds=new Set(
      plans.filter(plan=>plan.petId).map(plan=>plan.petId)
    );

    // Remove selected stash entries and all references to a sold pet.
    for(let i=stash.length-1;i>=0;i--){
      const item=stash[i];
      const soldReference=
        item?.kind==="pet" &&
        soldPetIds.has(String(item.petId||""));
      if(stashIndices.has(i)||soldReference){
        stash.splice(i,1);
      }
    }

    if(Array.isArray(save.keys)){
      for(const index of keyIndices){
        save.keys.splice(index,1);
      }
    }

    if(Array.isArray(save.animals)){
      save.animals=save.animals.filter(animal=>
        !soldPetIds.has(String(animal?.id||""))
      );
    }

    // addCurrency persists the post-sale inventory, keys, pets and balance together.
    if(!addCurrency(total)){
      return {success:false,count:0,total:0};
    }

    a.renderBase?.();
    window.EFRHub?.render?.();
    window.EFRLoadout?.render?.();
    log(plans.length+"件を売却して"+total+"を獲得しました");

    return {
      success:true,
      count:plans.length,
      total
    };
  }

  function sellStashItem(index){
    const result=sellSelectedStorageItems([
      {source:"stash",index}
    ]);
    return Boolean(result?.success);
  }


  function base(){
    const a=G(); if(!a)return null;
    a.save.base=a.save.base||{level:1,xp:0,facilities:{}};
    a.save.base.level=Math.max(1,Math.min(5,Number(a.save.base.level||1)));
    a.save.base.xp=Math.max(0,Number(a.save.base.xp||0));
    a.save.base.facilities=Object.assign({
      storage:1,
      shop:1,
      workbench:1,
      workshop:1,
      maintenance:1,
      medical:1,
      research:1
    },a.save.base.facilities||{});
    delete a.save.base.facilities.shooting;
    return a.save.base;
  }
  function isFacilityBuilt(k){
    const garden=window.EFRGarden?.ensureBase?.();
    return Boolean(garden?.objects?.some(object=>
      object?.type==="facility"&&String(object.facilityKey||"")===String(k||"")
    ));
  }

  function facilityLevel(k){
    const b=base();
    if(!b||!isFacilityBuilt(k))return 0;
    if(k==="training")return 1;
    return Math.max(1,Number(b.facilities?.[k]||1));
  }

  function facilityBuildCost(k){
    return clone(FACILITY_BUILD_COSTS[k]||{});
  }

  function hasFacility(k,l){
    const name=FACILITIES[k]?.name||k;
    if(!isFacilityBuilt(k)){
      log(name+"が未建設です。庭の拠点区画で建設してください");
      return false;
    }
    if(facilityLevel(k)>=l)return true;
    log("必要設備: "+name+" Lv."+l);
    return false;
  }

  function maintenanceLimits(){
    const level=facilityLevel("maintenance");
    return {
      level,
      maxLevel:level>=5?10:level>=4?7:level>=3?5:0,
      maxRarity:level>=5?5:level>=4?3:level>=3?2:0
    };
  }

  function requireMaintenanceUpgrade(type,target){
    if(!hasFacility("maintenance",3))return false;
    const limits=maintenanceLimits();
    const cap=type==="level"?limits.maxLevel:limits.maxRarity;
    if(Number(target)<=cap)return true;
    const required=type==="level"
      ? (Number(target)<=7?4:5)
      : (Number(target)<=3?4:5);
    const currentCap=type==="level"?"Lv."+limits.maxLevel:String(limits.maxRarity);
    log("整備台Lv."+required+"で解放されます（現在の上限: "+currentCap+"）");
    return false;
  }

  function buildFacility(key,x,y){
    const a=G();
    const b=base();
    const facility=FACILITIES[key];
    const garden=window.EFRGarden?.ensureBase?.();
    x=Number(x); y=Number(y);
    if(!a||!b||!facility||!garden)return false;
    if(isFacilityBuilt(key)){
      log(facility.name+"は既に設置されています");
      return false;
    }
    if(b.level<Number(facility.unlock||1)){
      log("拠点Lv."+facility.unlock+"で"+facility.name+"を建設できます");
      return false;
    }
    if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=garden.width||y>=garden.height){
      log("建設位置が拠点区画の範囲外です");
      return false;
    }
    if(garden.objects.some(object=>Number(object?.x)===x&&Number(object?.y)===y)){
      log("建設先には既に設備があります");
      return false;
    }

    const cost=facilityBuildCost(key);
    if(!Array.isArray(a.save.stash))a.save.stash=[];
    const candidate=normalizeStashItems(a.save.stash);
    if(!canPayFromStash(candidate,cost)){
      log(facility.name+"の建設素材が不足しています");
      return false;
    }
    for(const [name,count] of Object.entries(cost)){
      if(!consumeMaterialFromList(candidate,name,count)){
        log(facility.name+"の建設素材を消費できませんでした");
        return false;
      }
    }
    try{
      window.EFRGrid?.layout?.(candidate,storageCapacity());
    }catch(error){
      log("倉庫内アイテムの配置を維持できないため建設を中止しました");
      return false;
    }

    a.save.stash.splice(0,a.save.stash.length,...candidate);
    if(key!=="training"){
      b.facilities[key]=Math.max(1,Number(b.facilities[key]||1));
    }
    garden.objects.push({
      id:"facility-"+key,
      type:"facility",
      facilityKey:key,
      x,y
    });
    a.persist?.();
    a.renderInventory?.();
    window.EFRHub?.render?.();
    log(facility.name+"を建設しました");
    return true;
  }

  function demolishFacility(key){
    const a=G();
    const b=base();
    const garden=window.EFRGarden?.ensureBase?.();
    const facility=FACILITIES[key];
    if(!a||!b||!garden||!facility)return false;
    const index=garden.objects.findIndex(object=>
      object?.type==="facility"&&String(object.facilityKey||"")===String(key)
    );
    if(index<0){
      log(facility.name+"は設置されていません");
      return false;
    }
    if(key==="storage"){
      const used=Number(window.EFRGrid?.used?.(a.save.stash||[])??(a.save.stash||[]).length);
      const baseCapacity=24+Math.max(0,(b.level||1)-1)*4;
      if(used>baseCapacity){
        log("倉庫の撤去は、保管中のアイテムが基本容量"+baseCapacity+"マス以内になってから行えます");
        return false;
      }
    }
    garden.objects.splice(index,1);
    a.persist?.();
    window.EFRHub?.render?.();
    log(facility.name+"を撤去しました。施設レベルは保持され、再設置時に引き継がれます");
    return true;
  }
  function knownMaterialNames(){
    return new Set([
      ...(window.EFRCombat?.materials||[]),
      ...(window.EFRCombat?.materialLootPool?.()||[]),
      ...(window.EFRCombat?.intermediateMaterials||[])
    ]);
  }

  function normalizeStashItem(raw){
    let item;
    if(typeof raw==="string"){
      item={name:raw,kind:"material",amount:1,slots:1,weight:1};
    }else if(raw&&typeof raw==="object"){
      item=clone(raw);
    }else{
      return null;
    }

    if(!item.name&&item.type)item.name=String(item.type);
    const name=String(item.name||item.type||"");
    if(item.kind==="loot"&&knownMaterialNames().has(name)){
      item.name=name;
      item.kind="material";
      item.amount=Math.max(1,Math.floor(Number(item.amount)||1));
      item.rarity=Math.max(1,Math.min(5,Number(item.rarity||window.EFRCombat?.materialRarity?.(name)||1)));
      delete item.type;
    }
    if(item.kind==="material"){
      item.amount=Math.max(1,Math.floor(Number(item.amount)||1));
      item.rarity=Math.max(1,Math.min(5,Number(item.rarity||window.EFRCombat?.materialRarity?.(name)||1)));
    }
    if(item.kind==="ammo"){
      item.amount=Math.max(0,Math.floor(Number(item.amount)||0));
    }
    window.EFRGrid?.size?.(item);
    G()?.ensureItemWeight?.(item);
    return item;
  }

  function appendStashItemToList(items,raw){
    const item=normalizeStashItem(raw);
    if(!item)return false;

    if(item.kind==="material"){
      const amount=Math.max(1,Math.floor(Number(item.amount)||1));
      const same=item.sellProtected===true
        ? null
        : items.find(existing=>
            existing?.kind==="material"&&
            existing.name===item.name&&
            existing.sellProtected!==true
          );
      if(same){
        same.amount=Math.max(1,Math.floor(Number(same.amount)||1))+amount;
        return true;
      }
      item.amount=amount;
      items.push(item);
      return true;
    }

    if(item.kind==="ammo"){
      let remaining=Math.max(0,Math.floor(Number(item.amount)||0));
      if(remaining<=0)return false;
      const limit=Number(G()?.ammoStackLimit?.(item)||0);
      if(limit>0){
        for(const existing of items){
          if(
            existing?.kind!=="ammo"||
            existing.name!==item.name||
            existing.sellProtected===true||
            item.sellProtected===true
          )continue;
          const current=Math.max(0,Math.floor(Number(existing.amount)||0));
          const free=Math.max(0,limit-current);
          if(free<=0)continue;
          const take=Math.min(free,remaining);
          existing.amount=current+take;
          G()?.ensureItemWeight?.(existing);
          remaining-=take;
          if(remaining<=0)return true;
        }
        while(remaining>0){
          const stack=clone(item);
          stack.amount=Math.min(limit,remaining);
          delete stack.gridX;
          delete stack.gridY;
          G()?.ensureItemWeight?.(stack);
          items.push(stack);
          remaining-=stack.amount;
        }
        return true;
      }
      item.amount=remaining;
      items.push(item);
      return true;
    }

    items.push(item);
    return true;
  }

  function normalizeStashItems(items){
    const normalized=[];
    for(const item of Array.isArray(items)?items:[]){
      appendStashItemToList(normalized,item);
    }
    return normalized;
  }

  function planStashAdditions(baseItems,incomingItems,capacity){
    let candidate=normalizeStashItems(baseItems);
    const acceptedIndices=[];
    const rejectedIndices=[];
    const incoming=Array.isArray(incomingItems)?incomingItems:[];

    for(let index=0;index<incoming.length;index++){
      const trial=candidate.map(item=>clone(item));
      if(!appendStashItemToList(trial,incoming[index])){
        rejectedIndices.push(index);
        continue;
      }
      if(window.EFRGrid){
        try{
          if(!window.EFRGrid.canFit(trial,capacity)){
            rejectedIndices.push(index);
            continue;
          }
          window.EFRGrid.layout(trial,capacity);
        }catch(error){
          rejectedIndices.push(index);
          continue;
        }
      }
      candidate=trial;
      acceptedIndices.push(index);
    }

    return {items:candidate,acceptedIndices,rejectedIndices};
  }

  function migrateLegacyStashMaterials(){
    const a=G();
    if(!a||!Array.isArray(a.save?.stash))return false;
    const before=JSON.stringify(a.save.stash);
    let candidate=normalizeStashItems(a.save.stash);
    try{
      if(window.EFRGrid)window.EFRGrid.layout(candidate,storageCapacity());
    }catch(error){
      const known=knownMaterialNames();
      candidate=a.save.stash.map(raw=>{
        if(typeof raw==="string"){
          return {name:raw,kind:"material",amount:1,slots:1,weight:1};
        }
        if(!raw||typeof raw!=="object")return raw;
        const item=raw;
        const name=String(item.name||item.type||"");
        if(!item.name&&item.type)item.name=name;
        if(item.kind==="loot"&&known.has(name)){
          item.name=name;
          item.kind="material";
          item.amount=Math.max(1,Math.floor(Number(item.amount)||1));
          delete item.type;
        }
        return item;
      });
    }
    if(JSON.stringify(candidate)!==before){
      a.save.stash.splice(0,a.save.stash.length,...candidate);
      a.persist?.();
      return true;
    }
    return false;
  }

  function materialCountIn(items,name){
    let total=0;
    for(const item of Array.isArray(items)?items:[]){
      if(typeof item==="string"){
        if(item===name)total++;
      }else if(item?.name===name){
        total+=Math.max(1,Number(item.amount||1));
      }
    }
    return total;
  }

  function consumeMaterialFromList(items,name,count){
    let left=Math.max(0,Number(count||0));
    if(left===0)return true;
    for(let i=(items||[]).length-1;i>=0&&left>0;i--){
      const item=items[i];
      if(!((typeof item==="string"&&item===name)||(item&&item.name===name)))continue;
      const amount=typeof item==="string"?1:Math.max(1,Number(item.amount||1));
      if(amount<=left){
        items.splice(i,1);
        left-=amount;
      }else{
        item.amount=amount-left;
        left=0;
      }
    }
    return left===0;
  }

  function canPayFromStash(items,cost){
    return Object.entries(cost||{}).every(([name,count])=>
      materialCountIn(items,name)>=Math.max(0,Number(count)||0)
    );
  }

  function materialCount(n){
    return materialCountIn(G()?.save?.stash||[],n);
  }

  function consumeMaterial(n,c){
    const a=G();
    if(!a)return false;
    return consumeMaterialFromList(a.save.stash||[],n,c);
  }

  function consumeMaterials(cost){
    const a=G();
    if(!a||!cost||typeof cost!=="object")return false;
    const candidate=normalizeStashItems(a.save.stash||[]);
    if(!canPayFromStash(candidate,cost))return false;
    for(const [name,count] of Object.entries(cost)){
      if(!consumeMaterialFromList(candidate,name,count))return false;
    }
    try{
      window.EFRGrid?.layout?.(candidate,storageCapacity());
    }catch(error){
      return false;
    }
    a.save.stash.splice(0,a.save.stash.length,...candidate);
    return true;
  }

  function canPay(cost){
    return Object.entries(cost||{}).every(([name,count])=>materialCount(name)>=count);
  }

  function upgradeFacility(key){
    const a=G();
    const b=base();
    const f=FACILITIES[key];
    if(!a||!b||!f)return false;
    if(key==="training"){
      log("訓練場は強化対象外です");
      return false;
    }
    if(!isFacilityBuilt(key)){
      log(f.name+"を先に庭の拠点区画へ建設してください");
      return false;
    }

    const lv=facilityLevel(key);
    if(lv>=f.max){
      log(f.name+"は最大レベルです");
      return false;
    }
    if(b.level<f.unlock){
      log("拠点Lv."+f.unlock+"で解放されます");
      return false;
    }

    const cost=facilityCost(key);
    const candidate=normalizeStashItems(a.save.stash||[]);
    if(!canPayFromStash(candidate,cost)){
      log("施設強化に必要な素材が不足しています");
      return false;
    }
    for(const [name,count] of Object.entries(cost)){
      if(!consumeMaterialFromList(candidate,name,count)){
        log("施設強化素材の消費に失敗しました");
        return false;
      }
    }
    try{
      window.EFRGrid?.layout?.(candidate,storageCapacity());
    }catch(error){
      log("倉庫の配置を維持できないため施設強化を中止しました");
      return false;
    }

    a.save.stash.splice(0,a.save.stash.length,...candidate);
    b.facilities[key]=lv+1;
    a.persist?.();
    log(f.name+"をLv."+(lv+1)+"へアップグレードしました");
    return true;
  }

  function facilityCost(key){
    const f=FACILITIES[key];
    if(!f||!isFacilityBuilt(key))return {};
    const lv=facilityLevel(key);
    if(lv>=Number(f.max||0))return {};
    return clone(f.cost?.[lv-1]||{});
  }

  function storageCapacity(){
    const b=base();
    const storageLevel=facilityLevel("storage");
    return 24+Math.max(0,(b?.level||1)-1)*4+Math.max(0,(storageLevel-1)*10);
  }

  function canAddStashItems(items){
    const a=G();
    if(!a||!Array.isArray(items)||!items.length)return false;
    const plan=planStashAdditions(a.save.stash||[],items,storageCapacity());
    return plan.acceptedIndices.length===items.length;
  }

  function addStashItems(items,options={}){
    const a=G();
    const incoming=Array.isArray(items)?items:[];
    if(!a||!incoming.length){
      return {success:false,added:0,acceptedIndices:[],rejectedIndices:incoming.map((_,i)=>i)};
    }
    if(!Array.isArray(a.save.stash))a.save.stash=[];
    const plan=planStashAdditions(a.save.stash,incoming,storageCapacity());
    if(options.allOrNothing&&plan.rejectedIndices.length){
      const rejectedIndices=incoming.map((_,i)=>i);
      if(options.silent!==true)log("倉庫の空きマスが足りません");
      return {success:false,added:0,acceptedIndices:[],rejectedIndices};
    }
    if(plan.acceptedIndices.length){
      a.save.stash.splice(0,a.save.stash.length,...plan.items);
    }
    if(plan.rejectedIndices.length&&options.silent!==true){
      window.EFRGrid?.flash?.();
      log("倉庫へ格納できないアイテムが"+plan.rejectedIndices.length+"個あります");
    }
    return {
      success:plan.rejectedIndices.length===0,
      added:plan.acceptedIndices.length,
      acceptedIndices:plan.acceptedIndices,
      rejectedIndices:plan.rejectedIndices
    };
  }

  function addStashItem(item,options={}){
    const result=addStashItems([item],options);
    return result.acceptedIndices.includes(0);
  }

  function isDismantleTarget(item){
    return Boolean(item&&["weapon","firearm","armor","backpack"].includes(item.kind));
  }

  function dismantleBlockReason(item){
    if(!isDismantleTarget(item))return "分解対象外";
    if(item.kind==="firearm"&&Number(item.ammo||0)>0)return "装填中の弾薬を抜いてください";
    const mods=item.mods;
    const hasMods=Array.isArray(mods)
      ? mods.some(Boolean)
      : Boolean(mods&&typeof mods==="object"&&Object.keys(mods).length>0);
    if(item.kind==="firearm"&&hasMods)return "装着パーツを外してください";
    return "";
  }

  function dismantleYieldRange(item){
    const rarity=Math.max(1,Math.min(5,Math.floor(Number(item?.rarity)||1)));
    const level=Math.max(1,Math.min(10,Math.floor(Number(item?.weaponLevel||item?.armorLevel||1))));
    const scrapBase=1+Math.floor((rarity-1)/2);
    const result={"鉄くず":{
      min:scrapBase,
      max:scrapBase+1+(level>=7?1:0)+(rarity>=4?1:0)
    }};
    if(level>=4||rarity>=3){
      result["高品質金属"]={min:1,max:1+(level>=7?1:0)+(rarity>=4?1:0)};
    }
    if(level>=7||rarity>=4){
      result["加工金属"]={min:1,max:1+(level>=9?1:0)+(rarity>=5?1:0)};
    }
    if(level>=9&&rarity>=4){
      result["精密機械部品"]={min:1,max:1+(level>=10?1:0)+(rarity>=5?1:0)};
    }
    if(level>=10&&rarity>=5){
      result["強化素材"]={min:1,max:2};
    }
    return result;
  }

  function dismantleYield(item){
    return Object.fromEntries(
      Object.entries(dismantleYieldRange(item)).map(([name,range])=>[
        name,
        range.min+Math.floor(Math.random()*(range.max-range.min+1))
      ])
    );
  }

  function dismantleYieldText(item,rolledYield){
    if(!isDismantleTarget(item))return "分解対象外";
    const rows=rolledYield&&typeof rolledYield==="object"
      ? Object.entries(rolledYield).map(([name,amount])=>[name,String(amount)])
      : Object.entries(dismantleYieldRange(item)).map(([name,range])=>[
          name,
          range.min===range.max?String(range.min):range.min+"～"+range.max
        ]);
    return rows.map(([name,amount])=>name+" ×"+amount).join(" / ");
  }

  function dismantleStashEquipment(index){
    const a=G();
    if(!a||!hasFacility("maintenance",2))return false;
    if(!Array.isArray(a.save?.stash)){
      log("倉庫の装備を確認できません");
      return false;
    }

    index=Number(index);
    if(!Number.isInteger(index)||index<0||index>=a.save.stash.length){
      log("分解する装備を選択してください");
      return false;
    }

    const item=a.save.stash[index];
    if(!isDismantleTarget(item)){
      log("分解できる装備を選択してください");
      return false;
    }

    const blockReason=dismantleBlockReason(item);
    if(blockReason){
      log("分解できません: "+blockReason);
      return false;
    }

    const materials=dismantleYield(item);
    const rewards=Object.entries(materials)
      .map(([name,amount])=>({...materialItem(name,1,1),amount}));
    const original=clone(a.save.stash);

    a.save.stash.splice(index,1);
    const added=addStashItems(rewards,{allOrNothing:true,silent:true});

    if(!added.success){
      a.save.stash.splice(0,a.save.stash.length,...original);
      log("回収素材を倉庫に格納できないため、分解を中止しました");
      return false;
    }

    a.persist?.();
    a.renderInventory?.();
    window.EFRHub?.render?.();
    log(String(item.name||"装備")+"を分解しました: "+dismantleYieldText(item,materials));
    return true;
  }

  function repair(slot){
    const a=G(),w=a?.save?.equipment?.[slot];if(!a||!w)return false;
    if(!hasFacility("maintenance",1))return false;
    const max=Number(w.maxDurability||w.durability||100),cur=Number(w.durability??max);
    if(cur>=max){log("修理は必要ありません");return false}
    const cost=Math.max(1,Math.ceil((max-cur)/35));
    if(materialCount("鉄くず")+materialCount("高品質金属")<cost){log("修理素材が不足しています");return false}
    const high=Math.min(materialCount("高品質金属"),cost),scrap=cost-high;
    if(high&&!consumeMaterial("高品質金属",high))return false;
    if(scrap&&!consumeMaterial("鉄くず",scrap))return false;
    w.durability=max;a.persist?.();a.renderInventory?.();window.EFRHub?.render?.();log(w.name+"を完全修理しました");return true;
  }
  function isWeapon(w){
    return w?.kind==="weapon" || w?.kind==="firearm";
  }

  function equipmentCostFamily(item){
    const name=[item?.weaponType,item?.type,item?.name,item?.id,item?.partId]
      .filter(Boolean).join(" ");
    if(item?.kind==="backpack")return "backpack";
    if(item?.kind==="armor")return "armor";
    if(item?.kind==="weaponPart")return "weaponPart";
    if(item?.isBow||/弓|bow/i.test(name))return "bow";
    if(item?.kind==="wand"||item?.kind==="staff"||/杖|ワンド|wand|staff/i.test(name))return "magic";
    if(item?.kind==="firearm")return "firearm";
    return "melee";
  }

  function addUpgradeCost(cost,name,amount){
    const count=Math.ceil(Number(amount)||0);
    if(count>0)cost[name]=Number(cost[name]||0)+count;
  }

  function adjustEquipmentUpgradeCost(base,item,target,mode){
    const cost=clone(base)||{};
    const rarity=Math.max(1,Math.min(5,Math.floor(Number(item?.rarity)||1)));
    const family=equipmentCostFamily(item);

    if(mode==="level"){
      const multiplier=1+(rarity-1)*0.2;
      for(const name of Object.keys(cost)){
        cost[name]=Math.ceil(Number(cost[name]||0)*multiplier);
      }
      switch(family){
        case "firearm":
          addUpgradeCost(cost,"電子部品",Math.ceil(target/3));
          addUpgradeCost(cost,"ボルト",Math.ceil(target/5));
          break;
        case "bow":
          addUpgradeCost(cost,"木材",Math.ceil(target/2));
          addUpgradeCost(cost,"革",Math.ceil(target/4));
          break;
        case "magic":
          addUpgradeCost(cost,"木材",Math.ceil(target/3));
          addUpgradeCost(cost,"接着剤",Math.ceil(target/4));
          break;
        case "armor":
          addUpgradeCost(cost,"布",Math.ceil(target/3));
          addUpgradeCost(cost,"革",Math.ceil(target/4));
          break;
        case "backpack":
          addUpgradeCost(cost,"布",Math.ceil(target/2));
          addUpgradeCost(cost,"革",Math.ceil(target/3));
          addUpgradeCost(cost,"電子部品",Math.ceil(target/4));
          break;
        case "weaponPart":
          addUpgradeCost(cost,"電子部品",Math.ceil(target/3));
          break;
        default:
          addUpgradeCost(cost,"鉄くず",Math.ceil(target/4));
          break;
      }
    }else{
      switch(family){
        case "firearm":
          addUpgradeCost(cost,"電子部品",target);
          addUpgradeCost(cost,"ボルト",Math.ceil(target/2));
          break;
        case "bow":
          addUpgradeCost(cost,"木材",target+1);
          addUpgradeCost(cost,"革",target);
          break;
        case "magic":
          addUpgradeCost(cost,"木材",target);
          addUpgradeCost(cost,"接着剤",Math.ceil(target/2));
          break;
        case "armor":
          addUpgradeCost(cost,"布",target);
          addUpgradeCost(cost,"革",target);
          break;
        case "backpack":
          addUpgradeCost(cost,"布",target);
          addUpgradeCost(cost,"革",target);
          addUpgradeCost(cost,"電子部品",Math.ceil(target/2));
          break;
        case "weaponPart":
          addUpgradeCost(cost,"電子部品",target);
          addUpgradeCost(cost,"精密機械部品",Math.ceil(target/2));
          break;
        default:
          addUpgradeCost(cost,"鉄くず",target);
          break;
      }
    }
    return cost;
  }

  function equipmentLevelCost(targetLevel,item){
    const n=Math.max(2,Math.min(10,Math.floor(Number(targetLevel)||2)));
    const table={
      2:{"高品質金属":2,"接着剤":1},
      3:{"高品質金属":3,"加工金属":1},
      4:{"加工金属":2,"精密機械部品":1},
      5:{"精密機械部品":2,"強化素材":1},
      6:{"加工金属":2,"強化素材":1,"回路基板":1},
      7:{"強化素材":2,"回路基板":1,"光学ユニット":1},
      8:{"強化素材":2,"回路基板":2,"光学ユニット":1},
      9:{"強化素材":3,"回路基板":2,"光学ユニット":2},
      10:{"強化素材":4,"回路基板":3,"光学ユニット":2}
    };
    return adjustEquipmentUpgradeCost(table[n]||{},item,n,"level");
  }

  function weaponLevelCost(targetLevel,item){
    return equipmentLevelCost(targetLevel,item);
  }

  function equipmentRarityCost(targetRarity,item){
    const n=Math.max(2,Math.min(5,Math.floor(Number(targetRarity)||2)));
    const table={
      2:{"高品質金属":6,"接着剤":2,"電子部品":1},
      3:{"高品質金属":4,"加工金属":2,"精密機械部品":1},
      4:{"精密機械部品":2,"電子制御部品":2,"強化素材":1},
      5:{"強化素材":3,"回路基板":2,"光学ユニット":1}
    };
    return adjustEquipmentUpgradeCost(table[n]||{},item,n,"rarity");
  }

  function weaponRarityCost(targetRarity,item){
    return equipmentRarityCost(targetRarity,item);
  }

  function equipmentUpgradeChance(mode,target){
    const levelChances={2:95,3:90,4:85,5:75,6:60,7:40,8:20,9:8,10:3};
    const rarityChances={2:90,3:60,4:20,5:3};
    const n=Math.floor(Number(target)||0);
    return Number((mode==="level"?levelChances:rarityChances)[n]||0);
  }

  function payAndRollUpgrade(cost,mode,target,item){
    if(!consumeMaterials(cost)){
      log("素材消費に失敗しました");
      return false;
    }
    const chance=equipmentUpgradeChance(mode,target);
    if(Math.random()*100<chance)return true;

    const a=G();
    a?.persist?.();
    a?.renderInventory?.();
    window.EFRHub?.render?.();
    const targetName=mode==="level"?"Lv."+target:"レア度"+target;
    log(String(item?.name||"装備")+"の"+targetName+
      "強化に失敗しました（成功率"+chance+"%）。素材は消費され、装備は変化しませんでした。");
    return false;
  }

  function refreshWeaponStats(w){
    const a=G();
    a?.ensureWeaponProgression?.(w);

    if(w?.kind==="firearm"){
      window.EFRBaseParts?.normalizeWeapon?.(w);
    }else{
      a?.applyWeaponProgression?.(w);
    }
  }

  function upgradeWeaponLevel(slot){
    const a=G(),w=a?.save?.equipment?.[slot];
    if(!a||!w||!isWeapon(w)){
      a?.logMessage?.("武器を選択してください");
      return false;
    }

    a.ensureWeaponProgression(w);

    const current=Math.max(1,Number(w.weaponLevel||1));

    if(current>=10){
      log("武器Lv.は最大です");
      return false;
    }

    const target=current+1;
    if(!requireMaintenanceUpgrade("level",target))return false;
    const cost=weaponLevelCost(target,w);

    if(!canPay(cost)){
      log(
        "武器Lv."+target+
        "に必要な素材が不足しています"
      );
      return false;
    }

    if(!payAndRollUpgrade(cost,"level",target,w))return false;

    w.weaponLevel=target;
    refreshWeaponStats(w);

    a.persist?.();
    a.renderInventory?.();
    window.EFRHub?.render?.();

    log(
      w.name+
      "を武器Lv."+target+
      "に改造しました"
    );

    return true;
  }

  function isArmor(w){
    return w?.kind==="armor";
  }

  function armorLevelCost(targetLevel,item){
    return equipmentLevelCost(targetLevel,item);
  }

  function armorRarityCost(targetRarity,item){
    return equipmentRarityCost(targetRarity,item);
  }

  function refreshArmorStats(w){
    const a=G();
    a?.ensureArmorProgression?.(w);
    a?.applyArmorProgression?.(w);
  }

  function isBackpack(w){
    return w?.kind==="backpack";
  }

  function backpackRarityCost(targetRarity,item){
    return equipmentRarityCost(targetRarity,item);
  }

  function refreshBackpackStats(w){
    const a=G();

    a?.ensureBackpackProgression?.(w);
    a?.applyBackpackProgression?.(w);
  }

  function upgradeBackpackRarity(slot){
    const a=G(),w=a?.save?.equipment?.[slot];

    if(!a||!w||!isBackpack(w)){
      a?.logMessage?.("バッグを選択してください");
      return false;
    }

    a.ensureBackpackProgression(w);

    const current=Math.max(
      1,
      Number(w.rarity||1)
    );

    if(current>=5){
      log("バッグのレア度は最大です");
      return false;
    }

    const target=current+1;
    if(!requireMaintenanceUpgrade("rarity",target))return false;
    const cost=backpackRarityCost(target,w);

    if(!canPay(cost)){
      log(
        "バッグのレア度"+
        target+
        "に必要な素材が不足しています"
      );
      return false;
    }

    if(!payAndRollUpgrade(cost,"rarity",target,w))return false;

    w.rarity=target;
    refreshBackpackStats(w);

    a.persist?.();
    a.renderInventory?.();
    window.EFRHub?.render?.();

    log(
      w.name+
      "を"+
      (a.backpackRarityName?.(target)||"レア")+
      "にしました"
    );

    return true;
  }

  function upgradeArmorLevel(slot){
    const a=G(),w=a?.save?.equipment?.[slot];

    if(!a||!w||!isArmor(w)){
      a?.logMessage?.("防具を選択してください");
      return false;
    }

    a.ensureArmorProgression(w);

    const current=Math.max(1,Number(w.armorLevel||1));

    if(current>=10){
      log("防具Lv.は最大です");
      return false;
    }

    const target=current+1;
    if(!requireMaintenanceUpgrade("level",target))return false;
    const cost=armorLevelCost(target,w);

    if(!canPay(cost)){
      log(
        "防具Lv."+target+
        "に必要な素材が不足しています"
      );
      return false;
    }

    if(!payAndRollUpgrade(cost,"level",target,w))return false;

    w.armorLevel=target;
    refreshArmorStats(w);

    a.persist?.();
    a.renderInventory?.();
    window.EFRHub?.render?.();

    log(
      w.name+
      "を防具Lv."+target+
      "に改造しました"
    );

    return true;
  }

  function upgradeArmorRarity(slot){
    const a=G(),w=a?.save?.equipment?.[slot];

    if(!a||!w||!isArmor(w)){
      a?.logMessage?.("防具を選択してください");
      return false;
    }

    a.ensureArmorProgression(w);

    const current=Math.max(1,Number(w.rarity||1));

    if(current>=5){
      log("レア度は最大です");
      return false;
    }

    const target=current+1;
    if(!requireMaintenanceUpgrade("rarity",target))return false;
    const cost=armorRarityCost(target,w);

    if(!canPay(cost)){
      log(
        "レア度「"+
        a.armorRarityName(target)+
        "」に必要な素材が不足しています"
      );
      return false;
    }

    if(!payAndRollUpgrade(cost,"rarity",target,w))return false;

    w.rarity=target;
    refreshArmorStats(w);

    a.persist?.();
    a.renderInventory?.();
    window.EFRHub?.render?.();

    log(
      w.name+
      "のレア度を"+
      a.armorRarityName(target)+
      "にしました"
    );

    return true;
  }

  function upgradeWeaponPartRarity(sourceOrIndex,indexArg){
    const a=G();
    if(!a)return false;

    let source="stash";
    let index=sourceOrIndex;

    if(typeof sourceOrIndex==="string"){
      source=sourceOrIndex;
      index=indexArg;
    }

    const items=
      source==="loot"
        ? a.player?.loot
        : a.save?.stash;

    if(
      !Array.isArray(items) ||
      !Number.isInteger(Number(index))
    ){
      return false;
    }

    index=Number(index);

    const part=
      window.EFRBaseParts?.normalizePart?.(
        items[index]
      );

    if(
      !part ||
      items[index]?.kind!=="weaponPart"
    ){
      log("武器パーツを選択してください");
      return false;
    }

    const current=Math.max(
      1,
      Number(part.rarity||1)
    );

    if(current>=5){
      log("武器パーツのレア度は最大です");
      return false;
    }

    const target=current+1;
    if(!requireMaintenanceUpgrade("rarity",target))return false;
    const cost=weaponRarityCost(target,part);

    if(!canPay(cost)){
      log(
        "武器パーツのレア度"+
        target+
        "に必要な素材が不足しています"
      );
      return false;
    }

    if(!payAndRollUpgrade(cost,"rarity",target,part))return false;

    part.rarity=target;
    items[index]={
      ...items[index],
      ...part,
      partId:items[index].partId||part.id,
      kind:"weaponPart",
      slots:1,
      gridW:1,
      gridH:1,
      weight:Number(items[index].weight||.5)
    };

    a.persist?.();
    a.renderInventory?.();
    window.EFRLoadout?.render?.();
    window.EFRHub?.render?.();

    log(
      (window.EFRBaseParts?.definitions?.[part.id]?.name||part.id)+
      "を"+
      (window.EFRBaseParts?.rarityName?.(target)||"レア")+
      "にしました"
    );

    return true;
  }

  function upgradeWeaponRarity(slot){
    const a=G(),w=a?.save?.equipment?.[slot];
    if(!a||!w||!isWeapon(w)){
      a?.logMessage?.("武器を選択してください");
      return false;
    }

    a.ensureWeaponProgression(w);

    const current=Math.max(1,Number(w.rarity||1));

    if(current>=5){
      log("レア度は最大です");
      return false;
    }

    const target=current+1;
    if(!requireMaintenanceUpgrade("rarity",target))return false;
    const cost=weaponRarityCost(target,w);

    if(!canPay(cost)){
      log(
        "レア度「"+
        a.weaponRarityName(target)+
        "」に必要な素材が不足しています"
      );
      return false;
    }

    if(!payAndRollUpgrade(cost,"rarity",target,w))return false;

    w.rarity=target;
    refreshWeaponStats(w);

    a.persist?.();
    a.renderInventory?.();
    window.EFRHub?.render?.();

    log(
      w.name+
      "のレア度を"+
      a.weaponRarityName(target)+
      "にしました"
    );

    return true;
  }

  function ensureResearch(){
    const a=G();
    if(!a)return null;

    a.save.research=a.save.research||{};
    a.save.research.available=a.save.research.available||{};
    a.save.research.unlocked=a.save.research.unlocked||{};

    const available=a.save.research.available;
    const unlocked=a.save.research.unlocked;
    let changed=false;

    for(const recipe of EXTRA_RECIPES){
      if(unlocked[recipe.name]===true && unlocked[recipe.id]!==true){
        unlocked[recipe.id]=true;
        changed=true;
      }

      // 既存セーブで研究済みだったレシピは、
      // 設計図による解放済み状態へ移行する。
      if(
        recipe?.researchable!==false &&
        unlocked[recipe.id]===true &&
        available[recipe.id]!==true
      ){
        available[recipe.id]=true;
        changed=true;
      }
    }

    for(const key of Object.keys(unlocked)){
      if(!RECIPE_IDS.has(key)){
        delete unlocked[key];
        changed=true;
        continue;
      }

      const recipe=EXTRA_RECIPES.find(r=>r.id===key);
      if(recipe?.researchable===false){
        delete unlocked[key];
        changed=true;
      }
    }

    for(const key of Object.keys(available)){
      if(!RECIPE_IDS.has(key)){
        delete available[key];
        changed=true;
        continue;
      }

      const recipe=EXTRA_RECIPES.find(r=>r.id===key);
      if(recipe?.researchable===false){
        delete available[key];
        changed=true;
      }
    }

    for(const name of ["ナイフ","鉄パイプ"]){
      const recipe=EXTRA_RECIPES.find(x=>x.name===name);
      if(recipe && unlocked[recipe.id]!==true){
        unlocked[recipe.id]=true;
        changed=true;
      }
    }

    if(changed)a.persist?.();

    return a.save.research;
  }

  function isResearchAvailable(recipe){
    return Boolean(ensureResearch()?.available?.[recipe?.id]);
  }

  function isResearched(recipe){
    return Boolean(ensureResearch()?.unlocked?.[recipe?.id]);
  }

  function useBlueprint(index){
    const a=G();
    if(!a)return false;

    const stash=a.save.stash||[];
    const i=Number(index);
    const blueprint=stash[i];

    if(!blueprint||blueprint.kind!=="blueprint"){
      log("使用できる設計図が見つかりません");
      return false;
    }

    const recipe=EXTRA_RECIPES.find(
      r=>r.id===String(blueprint.recipeId||"")
    );

    if(!recipe||recipe.researchable===false){
      log("設計図の研究対象が見つかりません");
      return false;
    }

    if(isResearched(recipe)||isResearchAvailable(recipe)){
      log(recipe.name+"の研究はすでに解放されています");
      return false;
    }

    ensureResearch().available[recipe.id]=true;
    stash.splice(i,1);

    a.persist?.();
    a.renderInventory?.();
    window.EFRHub?.render?.();

    log(recipe.name+"の研究を設計図から解放しました");
    return true;
  }

  function research(name){
    const a=G();
    if(!a)return false;
    const requested=String(name||"");
    const recipe=EXTRA_RECIPES.find(r=>r.id===requested||r.name===requested);
    if(!recipe){log("研究対象が見つかりません");return false}
    if(recipe.researchable===false){log(recipe.name+"は研究不要です");return false}
    if(!isResearchAvailable(recipe)){
      log(recipe.name+"の設計図を入手して倉庫で使用してください");
      return false;
    }
    if(isResearched(recipe)){log(recipe.name+"は研究済みです");return false}
    if(!hasFacility("research",recipe.level)){log("研究所Lv."+recipe.level+"が必要です");return false}
    if(!hasFacility(recipe.facility,recipe.level)){log((FACILITIES[recipe.facility]?.name||recipe.facility)+" Lv."+recipe.level+"が必要です");return false}
    const cost=recipe.cost||{};
    if(!canPay(cost)){log("研究に必要な素材が不足しています");return false}
    for(const [n,c] of Object.entries(cost)){
      if(!consumeMaterial(n,c)){log("研究素材の消費に失敗しました");return false}
    }
    ensureResearch().unlocked[recipe.id]=true;
    a.persist?.();
    window.EFRHub?.render?.();
    log(recipe.name+"を研究しました");
    return true;
  }

  function craft(name){
    const a=G(),x=X();
    if(!a||!x)return false;
    const requested=String(name||"");
    const recipe=EXTRA_RECIPES.find(
      entry=>entry.id===requested||entry.name===requested
    );
    if(!recipe){log("レシピが見つかりません");return false}
    if(recipe.researchable!==false&&!isResearched(recipe)){
      log(recipe.name+"は未研究です");
      return false;
    }

    const facility=Array.isArray(recipe)
      ?((name.includes("包帯")||name.includes("止血"))?"medical":"workbench")
      :recipe.facility;
    const level=Array.isArray(recipe)?1:recipe.level;
    const cost=Array.isArray(recipe)?recipe[1]:recipe.cost;
    if(!hasFacility(facility,level))return false;

    // Consume on a private candidate inventory. Nothing is committed until the output fits.
    const candidateStash=normalizeStashItems(a.save.stash||[]);
    if(!canPayFromStash(candidateStash,cost)){
      log("素材が不足しています");
      return false;
    }
    for(const [material,count] of Object.entries(cost)){
      if(!consumeMaterialFromList(candidateStash,material,count)){
        log("素材消費に失敗しました");
        return false;
      }
    }

    const result=Array.isArray(recipe)?recipe[2]():recipe.make();
    if(isWeapon(result)){
      G()?.ensureWeaponProgression?.(result);
      result.weaponLevel=1;
      result.rarity=1;
      G()?.applyWeaponProgression?.(result);
    }else if(result?.kind==="armor"){
      G()?.ensureArmorProgression?.(result);
      result.armorLevel=1;
      result.rarity=1;
      G()?.applyArmorProgression?.(result);
    }else if(result?.kind==="backpack"){
      G()?.ensureBackpackProgression?.(result);
      result.rarity=1;
      G()?.applyBackpackProgression?.(result);
    }

    const stashPlan=planStashAdditions(
      candidateStash,
      [result],
      storageCapacity()
    );
    if(!stashPlan.acceptedIndices.includes(0)){
      window.EFRGrid?.flash?.();
      log("倉庫に完成品を配置できないためクラフトできませんでした。素材は消費していません");
      return false;
    }

    a.save.stash.splice(0,a.save.stash.length,...stashPlan.items);
    a.persist?.();
    window.EFRHub?.render?.();
    window.EFRLoadout?.render?.();
    log(recipe.name+"をクラフトしました");
    return true;
  }
  function augmentRecipes(){
    const x=X();if(!x)return;
    x.__recipes=EXTRA_RECIPES;
    x.EXTRA_RECIPES=EXTRA_RECIPES;
    x.facilities=FACILITIES;
  }
  window.EFRBaseCore={
    facilities:FACILITIES,
    ensureBase:base,
    materialCount,
    consumeMaterials,
    canAddStashItems,
    addStashItem,
    addStashItems,
    isFacilityBuilt,
    facilityLevel,
    facilityBuildCost,
    buildFacility,
    demolishFacility,
    facilityCost,
    upgradeFacility,
    storageCapacity,
    currency,
    addCurrency,
    spendCurrency,
    itemUnitBaseValue,
    itemBasicValue,
    itemSellPrice,
    shopProducts,
    purchaseShopProduct,
    economyBuyRate:()=>ECONOMY_BUY_RATE,
    sellStashItem,
    sellSelectedStorageItems,
    economySellRate:()=>ECONOMY_SELL_RATE
  };

  function init(){
    if(!G()||!X())return false;
    augmentRecipes();
    window.EFRBaseFacilities=FACILITIES;
    const x=X();
    migrateLegacyStashMaterials();
    ensureResearch();
    x.craft=craft;
    x.research=research;
    x.useBlueprint=useBlueprint;
    x.repair=repair;
    x.upgradeWeaponLevel=upgradeWeaponLevel;
    x.upgradeWeaponRarity=upgradeWeaponRarity;
    x.upgradeWeaponPartRarity=upgradeWeaponPartRarity;
    x.upgradeArmorLevel=upgradeArmorLevel;
    x.upgradeArmorRarity=upgradeArmorRarity;
    x.upgradeBackpackRarity=upgradeBackpackRarity;
    x.weaponLevelCost=weaponLevelCost;
    x.weaponRarityCost=weaponRarityCost;
    x.equipmentUpgradeChance=equipmentUpgradeChance;
    x.armorLevelCost=armorLevelCost;
    x.armorRarityCost=armorRarityCost;
    x.backpackRarityCost=backpackRarityCost;
    x.materialCount=materialCount;
    x.facilityLevel=facilityLevel;
    x.maintenanceLimits=maintenanceLimits;
    x.isDismantleTarget=isDismantleTarget;
    x.dismantleBlockReason=dismantleBlockReason;
    x.dismantleYieldText=dismantleYieldText;
    x.dismantleStashEquipment=dismantleStashEquipment;
    x.EXTRA_RECIPES=EXTRA_RECIPES;
    x.facilities=FACILITIES;

    if(window.EFRContentExpansion){
      window.EFRContentExpansion.__recipes=EXTRA_RECIPES;
      window.EFRContentExpansion.__isResearched=isResearched;
      window.EFRContentExpansion.__isResearchAvailable=isResearchAvailable;
    }

    G().baseStorageCapacity=storageCapacity;
    G().renderBase?.();
    return true;
  }
  if(!init())setTimeout(init,0);
})();
