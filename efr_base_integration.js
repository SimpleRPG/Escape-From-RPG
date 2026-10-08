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
      desc:"武器・銃器・弓・防具・杖を修理する",
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
    /* --- 弾薬 --- */
    {name:"矢",facility:"workbench",level:1,cost:{"木材":1,"鉄くず":1},make:()=>({name:"矢",kind:"ammo",amount:12,weight:.24,slots:1})},

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
    {name:"小型バックパック",facility:"workshop",level:1,cost:{"布":3,"革":2,"ボルト":1},make:()=>({name:"小型バックパック",kind:"backpack",slotType:"backpack",capacity:4,slots:2,weight:2})},
    {name:"タクティカルバックパック",facility:"workshop",level:2,cost:{"布":4,"革":3,"電子部品":1,"ボルト":2},make:()=>({name:"タクティカルバックパック",kind:"backpack",slotType:"backpack",capacity:10,slots:2,weight:3.5})},
    {name:"大型バックパック",facility:"workshop",level:4,cost:{"布":6,"革":4,"電子部品":2,"ボルト":4},make:()=>({name:"大型バックパック",kind:"backpack",slotType:"backpack",capacity:14,slots:3,weight:5})},
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

  function base(){
    const a=G(); if(!a)return null;
    a.save.base=a.save.base||{level:1,xp:0,facilities:{}};
    a.save.base.level=Math.max(1,Math.min(5,Number(a.save.base.level||1)));
    a.save.base.xp=Math.max(0,Number(a.save.base.xp||0));
    a.save.base.facilities=Object.assign({
      storage:1,
      workbench:1,
      workshop:1,
      maintenance:1,
      medical:1,
      research:1
    },a.save.base.facilities||{});
    delete a.save.base.facilities.shooting;
    return a.save.base;
  }
  function facilityLevel(k){return Number(base()?.facilities?.[k]||1)}
  function hasFacility(k,l){
    if(facilityLevel(k)>=l)return true;
    log("必要設備: "+(FACILITIES[k]?.name||k)+" Lv."+l);
    return false;
  }
  function materialCount(n){
    const a=G();let t=0;
    for(const x of a?.save?.stash||[]){
      if(typeof x==="string"){if(x===n)t++}
      else if(x?.name===n)t+=Math.max(1,Number(x.amount||1));
    }
    return t;
  }
  function consumeMaterial(n,c){
    const a=G();let left=Math.max(0,Number(c||0));if(!a||left===0)return true;
    for(let i=(a.save.stash||[]).length-1;i>=0&&left>0;i--){
      const x=a.save.stash[i];
      if(!((typeof x==="string"&&x===n)||(x&&x.name===n)))continue;
      const amount=typeof x==="string"?1:Math.max(1,Number(x.amount||1));
      if(amount<=left){a.save.stash.splice(i,1);left-=amount}else{x.amount=amount-left;left=0}
    }
    return left===0;
  }
  function canPay(cost){return Object.entries(cost).every(([n,c])=>materialCount(n)>=c)}
  function upgradeFacility(key){
    const a=G();
    const b=base();
    const f=FACILITIES[key];

    if(!a||!b||!f)return false;

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

    if(!canPay(cost)){
      log("施設強化に必要な素材が不足しています");
      return false;
    }

    for(const [name,count] of Object.entries(cost)){
      if(!consumeMaterial(name,count)){
        log("施設強化素材の消費に失敗しました");
        return false;
      }
    }

    b.facilities[key]=lv+1;
    a.persist?.();
    log(f.name+"をLv."+(lv+1)+"へアップグレードしました");
    return true;
  }

  function facilityCost(key){
    const f=FACILITIES[key];
    if(!f)return {};

    const lv=facilityLevel(key);
    if(lv>=Number(f.max||0))return {};

    return clone(f.cost?.[lv-1]||{});
  }

  function storageCapacity(){
    const b=base();return 24+Math.max(0,(b?.level||1)-1)*4+Math.max(0,(b?.facilities?.storage||1)-1)*10;
  }
  function addStashItem(item){
    const a=G();if(!a||!item)return false;

    if(window.EFRGrid?.size){
      window.EFRGrid.size(item);
    }

    if(item.kind==="ammo"||item.kind==="material"){
      const same=(a.save.stash||[]).find(x=>x&&typeof x!=="string"&&x.name===item.name&&x.kind===item.kind);
      if(same){
        if(window.EFRGrid?.size){
          window.EFRGrid.size(same);
        }
        same.amount=(same.amount||1)+(item.amount||1);
        return true;
      }
    }
    const candidateStash=
      (a.save.stash||[]).map(clone);

    candidateStash.push(clone(item));

    if(
      window.EFRGrid &&
      !window.EFRGrid.canFit(
        candidateStash,
        storageCapacity()
      )
    ){
      window.EFRGrid.flash();
      log("倉庫の空きマスが足りません");
      return false;
    }

    a.save.stash.push(clone(item));

    if(window.EFRGrid){
      window.EFRGrid.layout(
        a.save.stash,
        storageCapacity()
      );
    }

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

  function equipmentLevelCost(targetLevel){
    const n=Math.max(2,Number(targetLevel||2));
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

    return clone(table[n]||{});
  }

  function weaponLevelCost(targetLevel){
    return equipmentLevelCost(targetLevel);
  }

  function equipmentRarityCost(targetRarity){
    const n=Math.max(2,Number(targetRarity||2));
    const table={
      2:{"高品質金属":6,"接着剤":2,"電子部品":1},
      3:{"高品質金属":4,"加工金属":2,"精密機械部品":1},
      4:{"精密機械部品":2,"電子制御部品":2,"強化素材":1},
      5:{"強化素材":3,"回路基板":2,"光学ユニット":1}
    };

    return clone(table[n]||{});
  }

  function weaponRarityCost(targetRarity){
    return equipmentRarityCost(targetRarity);
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

    if(!hasFacility("maintenance",1)){
      log("整備台Lv.1が必要です");
      return false;
    }

    const target=current+1;
    const cost=weaponLevelCost(target);

    if(!canPay(cost)){
      log(
        "武器Lv."+target+
        "に必要な素材が不足しています"
      );
      return false;
    }

    for(const [name,count] of Object.entries(cost)){
      if(!consumeMaterial(name,count)){
        log("素材消費に失敗しました");
        return false;
      }
    }

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

  function armorLevelCost(targetLevel){
    return equipmentLevelCost(targetLevel);
  }

  function armorRarityCost(targetRarity){
    return equipmentRarityCost(targetRarity);
  }

  function refreshArmorStats(w){
    const a=G();
    a?.ensureArmorProgression?.(w);
    a?.applyArmorProgression?.(w);
  }

  function isBackpack(w){
    return w?.kind==="backpack";
  }

  function backpackRarityCost(targetRarity){
    return equipmentRarityCost(targetRarity);
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

    if(!hasFacility("maintenance",1)){
      log("整備台Lv.1が必要です");
      return false;
    }

    const target=current+1;
    const cost=backpackRarityCost(target);

    if(!canPay(cost)){
      log(
        "バッグのレア度"+
        target+
        "に必要な素材が不足しています"
      );
      return false;
    }

    for(const [name,count] of Object.entries(cost)){
      if(!consumeMaterial(name,count)){
        log("素材消費に失敗しました");
        return false;
      }
    }

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

    if(!hasFacility("maintenance",1)){
      log("整備台Lv.1が必要です");
      return false;
    }

    const target=current+1;
    const cost=armorLevelCost(target);

    if(!canPay(cost)){
      log(
        "防具Lv."+target+
        "に必要な素材が不足しています"
      );
      return false;
    }

    for(const [name,count] of Object.entries(cost)){
      if(!consumeMaterial(name,count)){
        log("素材消費に失敗しました");
        return false;
      }
    }

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

    if(!hasFacility("maintenance",1)){
      log("整備台Lv.1が必要です");
      return false;
    }

    const target=current+1;
    const cost=armorRarityCost(target);

    if(!canPay(cost)){
      log(
        "レア度「"+
        a.armorRarityName(target)+
        "」に必要な素材が不足しています"
      );
      return false;
    }

    for(const [name,count] of Object.entries(cost)){
      if(!consumeMaterial(name,count)){
        log("素材消費に失敗しました");
        return false;
      }
    }

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

    if(!hasFacility("maintenance",1)){
      log("整備台Lv.1が必要です");
      return false;
    }

    const target=current+1;
    const cost=weaponRarityCost(target);

    if(!canPay(cost)){
      log(
        "武器パーツのレア度"+
        target+
        "に必要な素材が不足しています"
      );
      return false;
    }

    for(const [name,count] of Object.entries(cost)){
      if(!consumeMaterial(name,count)){
        log("素材消費に失敗しました");
        return false;
      }
    }

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

    if(!hasFacility("maintenance",1)){
      log("整備台Lv.1が必要です");
      return false;
    }

    const target=current+1;
    const cost=weaponRarityCost(target);

    if(!canPay(cost)){
      log(
        "レア度「"+
        a.weaponRarityName(target)+
        "」に必要な素材が不足しています"
      );
      return false;
    }

    for(const [name,count] of Object.entries(cost)){
      if(!consumeMaterial(name,count)){
        log("素材消費に失敗しました");
        return false;
      }
    }

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
    const a=G(),x=X();if(!a||!x)return false;
    const requested=String(name||"");
    const recipe=EXTRA_RECIPES.find(
      r=>r.id===requested||r.name===requested
    );
    if(!recipe){log("レシピが見つかりません");return false}
    if(recipe.researchable!==false && !isResearched(recipe)){log(recipe.name+"は未研究です");return false}
    const facility=Array.isArray(recipe)?((name.includes("包帯")||name.includes("止血"))?"medical":"workbench"):recipe.facility;
    const level=Array.isArray(recipe)?1:recipe.level,cost=Array.isArray(recipe)?recipe[1]:recipe.cost;
    if(!hasFacility(facility,level)||!canPay(cost)){
      if(canPay(cost)===false)log("素材が不足しています");
      return false;
    }
    for(const [n,c] of Object.entries(cost))if(!consumeMaterial(n,c)){log("素材消費に失敗しました");return false}
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

    if(!addStashItem(result)){
      for(const [n,c] of Object.entries(cost))a.save.stash.push({name:n,kind:"material",amount:c,slots:1,weight:1});
      a.persist?.();return false;
    }
    a.persist?.();window.EFRHub?.render?.();window.EFRLoadout?.render?.();log(name+"をクラフトしました");return true;
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
    facilityLevel,
    facilityCost,
    upgradeFacility,
    storageCapacity
  };

  function init(){
    if(!G()||!X())return false;
    augmentRecipes();
    const x=X();
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
    x.armorLevelCost=armorLevelCost;
    x.armorRarityCost=armorRarityCost;
    x.backpackRarityCost=backpackRarityCost;
    x.materialCount=materialCount;
    x.facilityLevel=facilityLevel;
    x.EXTRA_RECIPES=EXTRA_RECIPES;
    x.facilities=FACILITIES;

    if(window.EFRContentExpansion){
      window.EFRContentExpansion.__recipes=EXTRA_RECIPES;
      window.EFRContentExpansion.__isResearched=isResearched;
      window.EFRContentExpansion.__isResearchAvailable=isResearchAvailable;
    }

    window.EFRBaseFacilities=FACILITIES;
    G().baseStorageCapacity=storageCapacity;
    return true;
  }
  if(!init())setTimeout(init,0);
})();
