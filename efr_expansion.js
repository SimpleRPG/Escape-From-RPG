/* EFR unified gameplay expansion: combat, cover, AI, VFX, audio, world density. */
(() => {
  "use strict";
  const A = () => window.EFRGame;
  const C = window.EFRCombat = {
    particles: [], trails: [], projectiles: [], impacts: [], texts: [], shake: 0,
    aim: {accuracy:1, moveSpeed:0, moveInput:0, spreadState:0, weaponName:null},
    audio: null, audioReady: false, populatedSeed: null, lastShot: 0,
    reloadState: null,
    weapons: [
      ["ハンドガン",28,250,.32,12,"9mm",1.4,70,2,0],
      ["SMG",18,260,.11,30,"9mm",2.8,90,3,0],
      ["ショットガン",52,190,.8,6,"12ゲージ",4.2,80,3,0],
      ["アサルトライフル",24,300,.14,30,"5.56mm",3.6,100,3,0],
      ["マークスマンライフル",48,420,.55,10,"7.62mm",4.4,110,3,0],
      ["スナイパーライフル",95,650,1.15,5,"7.62mm",6.2,115,3,0],
      ["ボルトアクション",125,720,1.45,4,"7.62mm",6.8,120,3,0],
      ["バット",34,48,.58,0,null,2.2,80,2,10],
      ["ハンマー",42,42,.72,0,null,2.8,75,2,18],
      ["手斧",46,45,.64,0,null,2.5,70,2,20],
      ["マチェット",38,52,.42,0,null,2,85,2,12],
      ["ショートソード",26,46,.3,0,null,1.2,70,1,8],
      ["ロングソード",42,54,.5,0,null,2.2,90,2,12]
    ],
    ammo: [["9mm",.25],["12ゲージ",.55],["5.56mm",.3],["7.62mm",.4]],
    materials: [
      // 基礎素材 15
      "鉄くず","木材","布","革","ボルト","ネジ","電子部品",
      "バッテリー","ケーブル","ガラス","プラスチック","医療素材",
      "火薬","接着剤","高品質金属",

      // 追加素材 32
      "銅線","アルミ片","ゴム片","金属板","金属パイプ","歯車",
      "スプリング","軸受","モーター","精密部品","センサー",
      "光学部品","マイクロチップ","半導体","トランジスタ","ヒューズ",
      "電池セル","絶縁材","コネクタ","レンズ","研磨材","化学薬品",
      "試薬","サンプル容器","滅菌ガーゼ","医療テープ","樹脂","繊維",
      "強化布","合成皮革","木材接着剤","工具鋼",

      // 栽培用の種（各種を個別にスタック）
      "小麦の種","ニンジンの種","ジャガイモの種",
      "トマトの種","トウモロコシの種",
      "イチゴの種","キャベツの種","メロンの種",
      "ブルーベリーの種","カボチャの種","ナスの種",
      "クランベリーの種",
      "ブルージャズの種",
      "カリフラワーの種",
      "コーヒーの種",
      "ニンニクの種",
      "サヤエンドウの種",
      "ケールの種",
      "パースニップの種",
      "ルバーブの種",
      "チューリップの種",
      "玄米の種",
      "ホップの種",
      "トウガラシの種",
      "ポピーの種",
      "ラディッシュの種",
      "赤キャベツの種",
      "スターフルーツの種",
      "サマースパングルの種",
      "サマースクワッシュの種",
      "ヒマワリの種",
      "アマランサスの種",
      "アーティチョークの種",
      "ビーツの種",
      "チンゲンサイの種",
      "ブロッコリーの種",
      "フェアリーローズの種",
      "ブドウの種",
      "サツマイモの種",
      "パウダーメロンの種",
      "古代の種",
      "サボテンの種",
      "パイナップルの種",
      "スイートジェムベリーの種",
      "タロイモの根の種",
      "茶の種",
      "大根の種",
      "白菜の種",
      "ほうれん草の種",
      "ネギの種",
      "卵",
      "牛乳",
      "チーズ",
      "マヨネーズ",
      "砂糖",
      "油",
      "酢",
      "メープルシロップ",
      "ショウガ",
      "ココナッツ",
      "魚",
      "貝",
      "キノコ",
      "山菜",
      "海藻",
      "木の実",
      "スモモ",
      // 旧セーブ移行用。通常ドロップには使わない
      "野菜の種",
      // 庭木用苗木はレア度3の通常環境素材候補
      "木の苗",

      // 加工・中間素材 3
      "加工金属","回路基板","医療キット素材",

      // 畑の製粉物（製粉機でのみ生産。通常Lootには出ない）
      "小麦粉","コーンミール",

      // 汚染区域限定素材（通常Lootには出ない。変異敵と巣からのみ）
      "変異核",

      // 夜間限定素材（通常Lootには出ない。夜の探索で倒した敵からのみ）
      "夜光石"
    ],

    materialRarities: Object.freeze({
      // ★1 コモン
      "鉄くず":1,
      "木材":1,
      "小麦の種":1,
      "ニンジンの種":1,
      "ジャガイモの種":1,
      "トマトの種":1,
      "トウモロコシの種":1,
      "イチゴの種":1,
      "キャベツの種":1,
      "メロンの種":1,
      "ブルーベリーの種":1,
      "カボチャの種":1,
      "ナスの種":1,
      "クランベリーの種":1,
      "ブルージャズの種":1,
      "カリフラワーの種":1,
      "コーヒーの種":1,
      "ニンニクの種":1,
      "サヤエンドウの種":1,
      "ケールの種":1,
      "パースニップの種":1,
      "ルバーブの種":1,
      "チューリップの種":1,
      "玄米の種":1,
      "ホップの種":1,
      "トウガラシの種":1,
      "ポピーの種":1,
      "ラディッシュの種":1,
      "赤キャベツの種":1,
      "スターフルーツの種":1,
      "サマースパングルの種":1,
      "サマースクワッシュの種":1,
      "ヒマワリの種":1,
      "アマランサスの種":1,
      "アーティチョークの種":1,
      "ビーツの種":1,
      "チンゲンサイの種":1,
      "ブロッコリーの種":1,
      "フェアリーローズの種":1,
      "ブドウの種":1,
      "サツマイモの種":1,
      "パウダーメロンの種":1,
      "古代の種":1,
      "サボテンの種":1,
      "パイナップルの種":1,
      "スイートジェムベリーの種":1,
      "タロイモの根の種":1,
      "茶の種":1,
      "大根の種":1,
      "白菜の種":1,
      "ほうれん草の種":1,
      "ネギの種":1,
      "卵":1,
      "牛乳":1,
      "チーズ":2,
      "マヨネーズ":2,
      "砂糖":1,
      "油":1,
      "酢":2,
      "メープルシロップ":2,
      "ショウガ":2,
      "ココナッツ":2,
      "魚":2,
      "貝":2,
      "キノコ":1,
      "山菜":1,
      "海藻":1,
      "木の実":1,
      "スモモ":2,
      "野菜の種":1,
      "布":1,
      "ボルト":1,
      "ネジ":1,
      "プラスチック":1,
      "ガラス":1,
      "銅線":1,
      "アルミ片":1,
      "ゴム片":1,
      "ケーブル":1,
      "絶縁材":1,
      "繊維":1,
      "サンプル容器":1,
      "滅菌ガーゼ":1,
      "医療テープ":1,
      "樹脂":1,
      "木材接着剤":1,
      "スプリング":1,
      "ヒューズ":1,

      // ★2 アンコモン
      "革":2,
      "電子部品":2,
      "バッテリー":2,
      "医療素材":2,
      "接着剤":2,
      "金属板":2,
      "金属パイプ":2,
      "歯車":2,
      "軸受":2,
      "モーター":2,
      "精密部品":2,
      "電池セル":2,
      "コネクタ":2,
      "化学薬品":2,

      // ★3 レア
      "火薬":3,
      "木の苗":3,
      "高品質金属":3,
      "センサー":3,
      "光学部品":3,
      "マイクロチップ":3,
      "半導体":3,
      "トランジスタ":3,
      "レンズ":3,
      "研磨材":3,

      // ★4 エピック
      "試薬":4,
      "強化布":4,
      "合成皮革":4,
      "工具鋼":4,
      "加工金属":4,

      // ★5 レジェンダリー
      "回路基板":5,
      "医療キット素材":5,
      "変異核":5,
      "夜光石":3,

      // 追加中間素材
      "絶縁配線":3,
      "金属部品":3,
      "精密機械部品":4,
      "駆動ユニット":4,
      "電子制御部品":4,
      "センサーユニット":4,
      "光学ユニット":5,
      "高性能電池":4,
      "化学試薬セット":5,
      "医療繊維素材":3,
      "合成補強材":4,
      "強化素材":5
    }),

    get materialRarityWeights(){
      return (
        window.EFRBaseParts?.rarityWeights?.() ||
        {
          1:70,
          2:20,
          3:7,
          4:2.5,
          5:.5
        }
      );
    },

    intermediateMaterials: Object.freeze([
      "絶縁配線",
      "金属部品",
      "精密機械部品",
      "駆動ユニット",
      "電子制御部品",
      "センサーユニット",
      "光学ユニット",
      "高性能電池",
      "化学試薬セット",
      "医療繊維素材",
      "合成補強材",
      "強化素材",
      "堆肥（小麦）","堆肥（ニンジン）","堆肥（ジャガイモ）",
      "堆肥（トマト）","堆肥（トウモロコシ）","堆肥（イチゴ）",
      "堆肥（キャベツ）","堆肥（メロン）","堆肥（ブルーベリー）",
      "堆肥（カボチャ）","堆肥（ナス）","堆肥（クランベリー）",
      "堆肥（ブルージャズ）",
      "堆肥（カリフラワー）",
      "堆肥（コーヒー豆）",
      "堆肥（ニンニク）",
      "堆肥（サヤエンドウ）",
      "堆肥（ケール）",
      "堆肥（パースニップ）",
      "堆肥（ルバーブ）",
      "堆肥（チューリップ）",
      "堆肥（玄米）",
      "堆肥（ホップ）",
      "堆肥（トウガラシ）",
      "堆肥（ポピー）",
      "堆肥（ラディッシュ）",
      "堆肥（赤キャベツ）",
      "堆肥（スターフルーツ）",
      "堆肥（サマースパングル）",
      "堆肥（サマースクワッシュ）",
      "堆肥（ヒマワリ）",
      "堆肥（アマランサス）",
      "堆肥（アーティチョーク）",
      "堆肥（ビーツ）",
      "堆肥（チンゲンサイ）",
      "堆肥（ブロッコリー）",
      "堆肥（フェアリーローズ）",
      "堆肥（ブドウ）",
      "堆肥（サツマイモ）",
      "堆肥（パウダーメロン）",
      "堆肥（古代のフルーツ）",
      "堆肥（サボテンフルーツ）",
      "堆肥（パイナップル）",
      "堆肥（スイートジェムベリー）",
      "堆肥（タロイモの根）",
      "堆肥（茶葉）",
      "堆肥（大根）",
      "堆肥（白菜）",
      "堆肥（ほうれん草）",
      "堆肥（ネギ）",
      "成長肥料","品質肥料"
    ]),

    materialLootPool(){
      // 食用作物の種は通常の環境素材Loot抽選から除外し、通常コンテナの食料カテゴリだけで抽選する。木の苗は通常素材Lootの低確率候補。
      const gardenSeeds=new Set([
        "小麦の種","ニンジンの種","ジャガイモの種",
        "トマトの種","トウモロコシの種",
        "イチゴの種","キャベツの種","メロンの種",
        "ブルーベリーの種","カボチャの種","ナスの種",
        "クランベリーの種",
        "ブルージャズの種",
        "カリフラワーの種",
        "コーヒーの種",
        "ニンニクの種",
        "サヤエンドウの種",
        "ケールの種",
        "パースニップの種",
        "ルバーブの種",
        "チューリップの種",
        "玄米の種",
        "ホップの種",
        "トウガラシの種",
        "ポピーの種",
        "ラディッシュの種",
        "赤キャベツの種",
        "スターフルーツの種",
        "サマースパングルの種",
        "サマースクワッシュの種",
        "ヒマワリの種",
        "アマランサスの種",
        "アーティチョークの種",
        "ビーツの種",
        "チンゲンサイの種",
        "ブロッコリーの種",
        "フェアリーローズの種",
        "ブドウの種",
        "サツマイモの種",
        "パウダーメロンの種",
        "古代の種",
        "サボテンの種",
        "パイナップルの種",
        "スイートジェムベリーの種",
        "タロイモの根の種",
        "茶の種",
        "大根の種",
        "白菜の種",
        "ほうれん草の種",
        "ネギの種",
        "野菜の種"
      ]);
      const farmCraftOnly=new Set([
        "堆肥（小麦）","堆肥（ニンジン）","堆肥（ジャガイモ）",
        "堆肥（トマト）","堆肥（トウモロコシ）","堆肥（イチゴ）",
        "堆肥（キャベツ）","堆肥（メロン）","堆肥（ブルーベリー）",
        "堆肥（カボチャ）","堆肥（ナス）","堆肥（クランベリー）",
        "堆肥（ブルージャズ）",
        "堆肥（カリフラワー）",
        "堆肥（コーヒー豆）",
        "堆肥（ニンニク）",
        "堆肥（サヤエンドウ）",
        "堆肥（ケール）",
        "堆肥（パースニップ）",
        "堆肥（ルバーブ）",
        "堆肥（チューリップ）",
        "堆肥（玄米）",
        "堆肥（ホップ）",
        "堆肥（トウガラシ）",
        "堆肥（ポピー）",
        "堆肥（ラディッシュ）",
        "堆肥（赤キャベツ）",
        "堆肥（スターフルーツ）",
        "堆肥（サマースパングル）",
        "堆肥（サマースクワッシュ）",
        "堆肥（ヒマワリ）",
        "堆肥（アマランサス）",
        "堆肥（アーティチョーク）",
        "堆肥（ビーツ）",
        "堆肥（チンゲンサイ）",
        "堆肥（ブロッコリー）",
        "堆肥（フェアリーローズ）",
        "堆肥（ブドウ）",
        "堆肥（サツマイモ）",
        "堆肥（パウダーメロン）",
        "堆肥（古代のフルーツ）",
        "堆肥（サボテンフルーツ）",
        "堆肥（パイナップル）",
        "堆肥（スイートジェムベリー）",
        "堆肥（タロイモの根）",
        "堆肥（茶葉）",
        "堆肥（大根）",
        "堆肥（白菜）",
        "堆肥（ほうれん草）",
        "堆肥（ネギ）",
        "成長肥料","品質肥料","小麦粉","コーンミール","変異核","夜光石"
      ]);
      return [
        ...(this.materials||[]).filter(name=>!gardenSeeds.has(name) && !farmCraftOnly.has(name)),
        ...(this.intermediateMaterials||[]).filter(name=>!farmCraftOnly.has(name))
      ];
    },

    materialRarity(name){
      return Math.min(
        5,
        Math.max(
          1,
          Number(this.materialRarities?.[name]||1)
        )
      );
    },

    materialProfiles: {
      "工場":["鉄くず","ボルト","ネジ","金属板","金属パイプ","歯車","スプリング","軸受","モーター","工具鋼","アルミ片","ゴム片"],
      "整備室":["鉄くず","ボルト","ネジ","金属板","金属パイプ","歯車","スプリング","軸受","モーター","工具鋼","ケーブル","バッテリー"],
      "格納庫":["金属板","金属パイプ","ボルト","ネジ","アルミ片","ゴム片","工具鋼","バッテリー","ケーブル","モーター"],
      "研究棟":["電子部品","バッテリー","ケーブル","ガラス","プラスチック","センサー","光学部品","マイクロチップ","半導体","トランジスタ","ヒューズ","コネクタ","レンズ","化学薬品","試薬","サンプル容器","回路基板"],
      "診療所":["布","医療素材","プラスチック","ガラス","滅菌ガーゼ","医療テープ","ゴム片","繊維","強化布","化学薬品","サンプル容器","医療キット素材"],
      "倉庫":["鉄くず","木材","布","革","ボルト","ネジ","プラスチック","ガラス","ケーブル","接着剤","アルミ片","ゴム片"],
      "民家":["木材","布","革","プラスチック","ガラス","ケーブル","バッテリー","接着剤","繊維","合成皮革"],
      "住宅":["木材","布","革","プラスチック","ガラス","ケーブル","バッテリー","接着剤","繊維","合成皮革"],
      "事務所":["プラスチック","ケーブル","バッテリー","電子部品","ガラス","接着剤"],
      "施設":["鉄くず","プラスチック","ガラス","ケーブル","電子部品","バッテリー","布","化学薬品"],
      "店舗":["プラスチック","ガラス","布","繊維","接着剤","木材","アルミ片","ゴム片"],
      "管理棟":["電子部品","ケーブル","バッテリー","プラスチック","ガラス","ボルト","ネジ"]
    },
    enemyTypes: [
      {role:"melee",name:"非武装の略奪者",hp:32,speed:30,range:42,damage:0,contactDamage:4,aimTime:0,aimSpread:0},
      {role:"melee",name:"略奪者",hp:80,speed:48,range:42,damage:10,contactDamage:10,aimTime:0,aimSpread:0},
      {role:"rifle",name:"武装兵",hp:90,speed:34,range:300,damage:8,contactDamage:10,aimTime:.55,aimSpread:.045},
      {role:"sniper",name:"狙撃兵",hp:70,speed:24,range:600,damage:24,contactDamage:10,aimTime:1.15,aimSpread:.012},
      {role:"scout",name:"偵察兵",hp:55,speed:62,range:220,damage:6,contactDamage:10,aimTime:.25,aimSpread:.085},
      {role:"caster",name:"魔法使い",hp:60,speed:30,range:330,damage:14,contactDamage:6,aimTime:1.1,aimSpread:.03}
    ]
  };
  const item = (name,kind,extra={}) => ({name,kind,slots:1,weight:1,...extra});
  const weapon = name => {
    const v=C.weapons.find(x=>x[0]===name);
    if(!v)return null;

    const result=item(
      v[0],
      v[5]?"firearm":"weapon",
      {
        damage:v[1],
        baseDamage:v[1],
        weaponLevel:1,
        rarity:
          window.EFRBaseParts?.randomRarity?.() || 1,
        range:v[2],
        cooldown:v[3],
        magSize:v[4],
        ammoType:v[5],
        weight:v[6],
        durability:v[7],
        maxDurability:v[7],
        slots:v[8]||1,
        knockback:v[9]||0,
        ammo:0,
        mods:[],
        ...(v[0]==="ショットガン"?{pellets:6}:{})
      }
    );

    window.EFRBaseParts?.populateRandomMods?.(
      result,
      Math.random
    );

    return result;
  };
  function rand(a,b){return a+Math.random()*(b-a)}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v))}

  function selectWeightedMaterial(pool,rng){
    const candidates=(pool||[]).filter(
      name=>C.materialRarities?.[name]
    );

    if(!candidates.length)return "鉄くず";

    let total=0;

    for(const name of candidates){
      const rarity=C.materialRarity(name);
      total+=Number(
        C.materialRarityWeights?.[rarity]||1
      );
    }

    let roll=rng()*total;

    for(const name of candidates){
      roll-=Number(
        C.materialRarityWeights?.[
          C.materialRarity(name)
        ]||1
      );

      if(roll<0){
        return name;
      }
    }

    return candidates[candidates.length-1];
  }

  function selectMaterialForBuilding(building,rng){
    const profile=C.materialProfiles?.[building?.name]||[];
    const all=C.materialLootPool?.()||C.materials||[];

    if(!all.length)return "鉄くず";

    // 環境素材は限定ドロップではなく、68%の優先抽選。
    // その内部でも素材レア度によって出現率を変える。
    if(profile.length && rng()<.68){
      return selectWeightedMaterial(profile,rng);
    }

    return selectWeightedMaterial(all,rng);
  }
  function ensureAudio(){
    if(C.audioReady)return;
    try{C.audio=new (window.AudioContext||window.webkitAudioContext)();C.audioReady=true;}catch{}
  }
  function tone(freq,dur=.06,type="square",gain=.025){
    if(!C.audioReady||!C.audio)return;
    try{const o=C.audio.createOscillator(),g=C.audio.createGain();o.type=type;o.frequency.value=freq;g.gain.value=gain;o.connect(g);g.connect(C.audio.destination);const t=C.audio.currentTime;o.start(t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.stop(t+dur);}catch{}
  }
  function addParticle(x,y,vx,vy,life=.3,size=2,kind="dust"){C.particles.push({x,y,vx,vy,life,max:life,size,kind})}
  function burst(x,y,n=8,kind="impact"){for(let i=0;i<n;i++){const a=rand(0,Math.PI*2),s=rand(25,130);addParticle(x,y,Math.cos(a)*s,Math.sin(a)*s,rand(.18,.45),rand(1.5,4),kind)}}
  function text(x,y,t){C.texts.push({x,y,t,life:.7})}
  function lineClear(from,to){return A().hasLineOfSight(from,to)}
  /* EFR precision/attack-area system v1 */
  /* Weapon-specific spread values are defined directly in aimProfile(). */

  function meleeArc(w){
    const n=w?.name||"";
    if(n.includes("ナイフ")) return 0.34;
    if(n.includes("ショートソード")) return 0.55;
    if(n.includes("ロングソード")) return 0.62;
    if(n.includes("マチェット")) return 0.72;
    if(n.includes("バット")) return 0.62;
    if(n.includes("ハンマー")) return 0.48;
    if(n.includes("手斧")) return 0.55;
    return 0.50;
  }

  function aimProfile(w){
    const n=w?.name||"";
    if(n.includes("ハンドガン")) return {
      minSpread:0.01275,
      maxSpread:0.09375,
      moveFloorSpread:0.0255,
      restRecovery:5.0,
      fullInputRecovery:1.6,
      fireKick:.20
    };
    if(n.includes("SMG")) return {
      minSpread:0.0221,
      maxSpread:0.1755,
      moveFloorSpread:0.078,
      restRecovery:4.6,
      fullInputRecovery:1.0,
      fireKick:.09
    };
    if(n.includes("ショットガン")) return {
      minSpread:0.034,
      maxSpread:0.25,
      moveFloorSpread:0.156,
      restRecovery:5.2,
      fullInputRecovery:1.2,
      fireKick:.26
    };
    if(n.includes("アサルト")) return {
      minSpread:0.0153,
      maxSpread:0.117,
      moveFloorSpread:0.0495,
      restRecovery:4.8,
      fullInputRecovery:1.1,
      fireKick:.10
    };
    if(n.includes("マークスマン")) return {
      minSpread:0.01275,
      maxSpread:0.0885,
      moveFloorSpread:0.0285,
      restRecovery:5.8,
      fullInputRecovery:1.7,
      fireKick:.18
    };
    if(n.includes("スナイパー")) return {
      minSpread:0.00935,
      maxSpread:0.0605,
      moveFloorSpread:0.0154,
      restRecovery:6.4,
      fullInputRecovery:2.1,
      fireKick:.22
    };
    if(n.includes("ボルト")) return {
      minSpread:0.00765,
      maxSpread:0.0486,
      moveFloorSpread:0.0108,
      restRecovery:6.8,
      fullInputRecovery:2.2,
      fireKick:.24
    };
    if(n.includes("狩猟弓")) return {
      minSpread:0.0272,
      maxSpread:0.1952,
      moveFloorSpread:0.0544,
      restRecovery:4.2,
      fullInputRecovery:1.3,
      fireKick:.25
    };
    if(n.includes("クロスボウ")) return {
      minSpread:0.0085,
      maxSpread:0.055,
      moveFloorSpread:0.02,
      restRecovery:5.5,
      fullInputRecovery:1.8,
      fireKick:.3
    };
    if(n.includes("コンポジットボウ")) return {
      minSpread:0.030,
      maxSpread:0.1888,
      moveFloorSpread:0.048,
      restRecovery:4.8,
      fullInputRecovery:1.5,
      fireKick:.27
    };
    return {
      minSpread:0.0272,
      maxSpread:0.192,
      moveFloorSpread:0.080,
      restRecovery:4.5,
      fullInputRecovery:1.3,
      fireKick:.15
    };
  }

  function currentMoveInput(a){
    return Math.max(
      0,
      Math.min(
        1,
        Number(a?.moveInputStrength)||0
      )
    );
  }

  function currentSpread(w){
    const a=A();
    const profile=aimProfile(w);
    const input=currentMoveInput(a);

    const partSpread=
      window.EFRBaseParts
        ?window.EFRBaseParts.spreadReduction(w)
        :0;

    const partAccuracy=
      window.EFRBaseParts
        ?window.EFRBaseParts.accuracyBonus(w)
        :0;

    const scale=Math.max(
      .60,
      1-partSpread
    );

    const minimum=profile.minSpread*scale;
    const maximum=profile.maxSpread*scale;

    const fullFloor=Math.min(
      maximum,
      Math.max(
        minimum,
        profile.moveFloorSpread*scale
      )
    );

    const floorState=
      maximum<=minimum
        ? 0
        : (fullFloor-minimum)/(maximum-minimum);

    const currentFloorState=floorState*input;

    const rawState=Math.max(
      currentFloorState,
      Math.min(
        1,
        Number(C.aim.spreadState)||0
      )
    );

    const effectiveState=Math.max(
      0,
      rawState-
      Math.min(
        .35,
        Math.max(0,Number(partAccuracy)||0)
      )
    );

    return (minimum+
      (maximum-minimum)*Math.max(
        currentFloorState,
        effectiveState
      ))*(window.EFRGame?.jobWheelEffects?.()?.spreadMultiplier||1);
  }

  function updateAimStability(dt){
    const a=A();
    if(!a?.player)return;

    const p=a.player;
    const w=a.equippedWeapon?.();
    const name=w?.name||"";
    const profile=aimProfile(w);
    const input=currentMoveInput(a);

    C.aim.moveInput=input;
    C.aim.moveSpeed=(p.speed||0)*input;

    if(C.aim.weaponName!==name){
      C.aim.weaponName=name;
      C.aim.spreadState=0;
    }

    const partSpread=
      window.EFRBaseParts
        ?window.EFRBaseParts.spreadReduction(w)
        :0;

    const scale=Math.max(
      .60,
      1-partSpread
    );

    const minimum=profile.minSpread*scale;
    const maximum=profile.maxSpread*scale;

    const fullFloor=Math.min(
      maximum,
      Math.max(
        minimum,
        profile.moveFloorSpread*scale
      )
    );

    const floorState=
      maximum<=minimum
        ? 0
        : (fullFloor-minimum)/(maximum-minimum);

    const targetFloor=
      floorState*input;

    const rate=
      profile.restRecovery+
      (
        profile.fullInputRecovery-
        profile.restRecovery
      )*input;

    C.aim.spreadState +=
      (targetFloor-C.aim.spreadState)*
      Math.min(
        1,
        Math.max(
          0,
          Number(dt)||0
        )*rate
      );

    C.aim.spreadState=Math.max(
      targetFloor,
      Math.min(
        1,
        C.aim.spreadState
      )
    );

    C.aim.accuracy=
      1-C.aim.spreadState;
  }

  function resetAimSpread(){
    C.aim.accuracy=1;
    C.aim.moveSpeed=0;
    C.aim.moveInput=0;
    C.aim.spreadState=0;
    C.aim.weaponName=null;
    C.projectiles.length=0;
  }

  /* 照準アシスト（調整はこの定数だけ）：射角の中心を、向いている方向から
     この角度以内にいる敵のうち最も角度が近い1体へ寄せる（マグネティズム）。
     コーン外・武器の射程外・壁の向こうの敵には干渉せず、自動発射もしない。
     散布は従来どおり中心の周りに付く。 */
  const AIM_ASSIST_CONE=0.14;

  function assistedAimCenter(w){
    const a=A();
    const p=a?.player;
    if(!p)return 0;

    const center=Math.atan2(
      p.facingY,
      p.facingX
    );

    const enemies=a?.enemies;
    if(!Array.isArray(enemies)||!enemies.length)return center;

    const reach=Math.max(0,Number(w?.range)||0);
    let bestAngle=null;
    let bestDelta=Infinity;

    for(const e of enemies){
      if(!e||e.dead||Number(e.hp)<=0)continue;

      const dx=e.x-p.x;
      const dy=e.y-p.y;
      const d=Math.hypot(dx,dy);
      if(d>reach+(Number(e.r)||0))continue;

      const targetAngle=Math.atan2(dy,dx);
      let delta=targetAngle-center;
      while(delta>Math.PI)delta-=Math.PI*2;
      while(delta<-Math.PI)delta+=Math.PI*2;
      const absDelta=Math.abs(delta);

      // 近い敵ほど見かけの大きさが大きいぶん、寄せられる角度を広げる
      const cone=AIM_ASSIST_CONE+
        (a.jobWheelEffects?.()?.aimConeBonus||0)+
        Math.atan2(Number(e.r)||10,Math.max(1,d));
      if(absDelta>cone||absDelta>=bestDelta)continue;
      if(
        typeof a.hasLineOfSight==="function" &&
        !a.hasLineOfSight(p,e)
      )continue;

      bestDelta=absDelta;
      bestAngle=targetAngle;
    }

    return bestAngle===null?center:bestAngle;
  }

  function randomShotAngle(w){
    const spread=currentSpread(w);

    return assistedAimCenter(w)+
      (Math.random()*2-1)*spread;
  }

  function falloffProfile(w){
    const n=w?.name||"";

    if(n.includes("ショットガン"))return{start:.35,floor:.25};
    if(n.includes("スナイパー")||n.includes("ボルト"))return{start:1,floor:1};
    if(n.includes("マークスマン"))return{start:.8,floor:.7};
    if(n.includes("アサルト"))return{start:.65,floor:.55};
    if(n.includes("SMG"))return{start:.5,floor:.4};
    if(n.includes("ハンドガン"))return{start:.55,floor:.45};
    if(w?.isBow||n.includes("弓"))return{start:.7,floor:.6};

    return{start:.7,floor:.5};
  }

  function falloffMultiplier(projectile){
    const start=Number(projectile?.falloffStart);

    if(!Number.isFinite(start)||start>=1)return 1;

    const range=Math.max(1,Number(projectile.range)||1);
    const ratio=Math.min(
      1,
      Math.max(0,Number(projectile.traveled)||0)/range
    );

    if(ratio<=start)return 1;

    const floor=Number(projectile.falloffFloor??.5);
    const t=(ratio-start)/Math.max(.0001,1-start);

    return 1-(1-floor)*t;
  }

  function gunshotNoiseRadius(w){
    if(!w)return 280;

    const n=w.name||"";

    if(w.isBow||n.includes("弓")||n.includes("クロスボウ"))return 35;

    let base=280;

    if(n.includes("ボルト"))base=370;
    else if(n.includes("スナイパー"))base=360;
    else if(n.includes("ショットガン"))base=330;
    else if(n.includes("マークスマン"))base=310;
    else if(n.includes("アサルト"))base=300;
    else if(n.includes("SMG"))base=260;
    else if(n.includes("ハンドガン"))base=240;

    const mult=
      window.EFRBaseParts?.noiseMultiplier?.(w) ?? 1;

    return Math.max(10,Math.round(base*mult));
  }

  function weaponProjectileSpeed(w){
    const n=w?.name||"";
    if(n.includes("クロスボウ"))return 1000;
    if(n.includes("コンポジットボウ"))return 520;
    if(n.includes("狩猟弓"))return 420;
    if(n.includes("ボルト"))return 3400;
    if(n.includes("スナイパー"))return 3200;
    if(n.includes("マークスマン"))return 2200;
    if(n.includes("アサルト"))return 1650;
    if(n.includes("ショットガン"))return 900;
    if(n.includes("SMG"))return 1350;
    if(n.includes("ハンドガン"))return 1200;
    return 1200;
  }

  function enemyProjectileSpeed(e){
    if(e?.role==="caster")return 620;
    if(e?.role==="sniper")return 3000;
    if(e?.role==="scout")return 1550;
    return 2100;
  }
  const AMMO_LEVEL_DAMAGE_MULTIPLIERS=Object.freeze({
    1:1,
    2:1.10,
    3:1.20,
    4:1.35,
    5:1.50
  });

  const AMMO_FAMILY_NAMES=Object.freeze([
    "9mm","12ゲージ","5.56mm","7.62mm","矢"
  ]);

  function ammoFamily(itemOrName){
    const declared=(
      itemOrName&&typeof itemOrName==="object"
    )?String(itemOrName.ammoType||""):"";
    if(AMMO_FAMILY_NAMES.includes(declared))return declared;

    const name=typeof itemOrName==="string"
      ?itemOrName
      :String(itemOrName?.name||"");
    const match=name.match(/^(9mm|12ゲージ|5\.56mm|7\.62mm|矢)(?: Lv\.[2-5])?$/);
    if(match)return match[1];
    return name==="矢"?"矢":"";
  }

  function ammoLevelOf(item){
    const declared=Number(
      item&&typeof item==="object"?item.ammoLevel:0
    );
    if(Number.isFinite(declared)&&declared>=1){
      return Math.max(1,Math.min(5,Math.floor(declared)));
    }
    const name=typeof item==="string"
      ?item
      :String(item?.name||"");
    const match=name.match(/ Lv\.([2-5])$/);
    return match?Number(match[1]):1;
  }

  function normalizeMagazineAmmoLoads(savedWeapon){
    if(!savedWeapon||typeof savedWeapon!=="object")return [];

    const total=Math.max(
      0,
      Math.floor(Number(savedWeapon.ammo)||0)
    );
    const source=Array.isArray(savedWeapon.ammoLoads)
      ?savedWeapon.ammoLoads
      :null;
    const normalized=[];
    let remaining=total;

    const append=(level,count)=>{
      const amount=Math.max(0,Math.floor(Number(count)||0));
      if(amount<=0)return;
      const safeLevel=Math.max(1,Math.min(5,Math.floor(Number(level)||1)));
      const last=normalized[normalized.length-1];
      if(last&&last.level===safeLevel){
        last.count+=amount;
      }else{
        normalized.push({level:safeLevel,count:amount});
      }
    };

    if(source){
      for(const raw of source){
        if(remaining<=0)break;
        const count=Math.max(0,Math.floor(Number(raw?.count)||0));
        if(count<=0)continue;
        const take=Math.min(count,remaining);
        append(raw?.level,take);
        remaining-=take;
      }
    }

    // 旧セーブでammoだけが保存されていた装填分はLv1として移行する。
    if(remaining>0)append(1,remaining);

    savedWeapon.ammoLoads=normalized;
    return normalized;
  }

  function consumeMagazineAmmoLevel(savedWeapon){
    const loads=normalizeMagazineAmmoLoads(savedWeapon);
    if(!loads.length)return 1;

    const level=loads[0].level;
    loads[0].count-=1;
    if(loads[0].count<=0)loads.shift();
    savedWeapon.ammoLoads=loads;
    return level;
  }

  function appendMagazineAmmoLevel(savedWeapon,level,count){
    if(!savedWeapon)return;
    const loads=normalizeMagazineAmmoLoads(savedWeapon);
    const amount=Math.max(0,Math.floor(Number(count)||0));
    if(amount<=0)return;

    const safeLevel=Math.max(1,Math.min(5,Math.floor(Number(level)||1)));
    const last=loads[loads.length-1];
    if(last&&last.level===safeLevel){
      last.count+=amount;
    }else{
      loads.push({level:safeLevel,count:amount});
    }
    savedWeapon.ammoLoads=loads;
  }

  function findCompatibleAmmoIndex(items,caliber){
    const family=ammoFamily(caliber);
    if(!family)return -1;

    let bestIndex=-1;
    let bestY=Number.POSITIVE_INFINITY;
    let bestX=Number.POSITIVE_INFINITY;
    const list=Array.isArray(items)?items:[];

    for(let i=0;i<list.length;i++){
      const item=list[i];
      if(
        item?.kind!=="ammo"||
        ammoFamily(item)!==family||
        Math.floor(Number(item.amount)||0)<=0
      )continue;

      const rawY=Number(item.gridY);
      const rawX=Number(item.gridX);
      const y=Number.isFinite(rawY)?rawY:Number.POSITIVE_INFINITY;
      const x=Number.isFinite(rawX)?rawX:Number.POSITIVE_INFINITY;

      // Match the visible backpack order: top row first, then left to right.
      // If grid coordinates are absent, preserve the underlying inventory order.
      if(
        bestIndex<0||
        y<bestY||
        (y===bestY&&(x<bestX||(x===bestX&&i<bestIndex)))
      ){
        bestIndex=i;
        bestY=y;
        bestX=x;
      }
    }
    return bestIndex;
  }

  function fire(){
    const a=A();if(!a||(!a.running&&!window.EFRTraining?.isActive?.()))return false;ensureAudio();

    const slot="weapon"+(a.activeWeaponSlot||1);
    const savedWeapon=a.save?.equipment?.[slot];
    const w=a.equippedWeapon();

    if(!w)return false;
    if(C.reloadState)return false;
    if(w.kind!=="firearm")return a.attack();

    const maxDurability=Number(
      savedWeapon?.maxDurability ??
      savedWeapon?.durability ??
      w.maxDurability ??
      w.durability ??
      100
    );

    const durability=Number(
      savedWeapon?.durability ??
      w.durability ??
      maxDurability
    );

    const ammo=Number(
      savedWeapon?.ammo ??
      w.ammo ??
      0
    );

    if(
      !window.EFRTraining?.isActive?.() &&
      durability<=0
    ){
      a.logMessage?.("武器が壊れています");
      tone(110,.08,"sawtooth");
      return false;
    }

    if(
      !window.EFRTraining?.isActive?.() &&
      ammo<=0
    ){
      if(tryAutoReload())return false;

      a.logMessage?.("弾切れ。リロードしてください");
      tone(90,.08,"square");
      return false;
    }

    if(a.attackTimer>0)return false;

    const shotAmmoLevel=
      window.EFRTraining?.isActive?.()
        ?1
        :consumeMagazineAmmoLevel(savedWeapon);

    if(!window.EFRTraining?.isActive?.()){
      if(savedWeapon){
        savedWeapon.ammo=Math.max(0,ammo-1);
        savedWeapon.durability=Math.max(0,durability-1);
      }

      w.ammo=Math.max(0,ammo-1);
      w.durability=Math.max(0,durability-1);
    }

    // 最終弾を撃って空になったら、その場で自動リロードを開始する
    if(
      !window.EFRTraining?.isActive?.() &&
      savedWeapon &&
      Number(savedWeapon.ammo||0)<=0
    ){
      tryAutoReload();
    }

    a.attackTimer=w.cooldown||.3;
    a.attackFlash=.12;
    const shotAngle=randomShotAngle(w);

    {
      const profile=aimProfile(w);

      C.aim.spreadState=Math.min(
        1,
        (Number(C.aim.spreadState)||0)+
        profile.fireKick
      );
    }

    const p=a.player;

    a.emitNoise?.(
      p.x,
      p.y,
      gunshotNoiseRadius(w)*(a.jobWheelEffects?.()?.noiseMultiplier||1),
      "gunshot"
    );

    const muzzleOffset=(Number(p.r)||10)+2;
    const isBow=!!w.isBow||w.name.includes("弓");
    const falloff=falloffProfile(w);
    const fullDamage=Math.round(
      Number(w.damage||0)*
      Number(AMMO_LEVEL_DAMAGE_MULTIPLIERS[shotAmmoLevel]||1)
    );
    const pelletCount=Math.max(
      1,
      Math.floor(Number(w.pellets)||1)
    );
    const pelletDamage=Math.max(
      1,
      Math.round(fullDamage/pelletCount)
    );
    // ペレットは照準の基準線（この射撃の中心角）を軸に、拡散範囲内へ散る
    const pelletSpread=.13;

    for(let i=0;i<pelletCount;i++){
      const angle=
        pelletCount>1
          ? shotAngle+(Math.random()*2-1)*pelletSpread
          : shotAngle;
      const vx=Math.cos(angle),vy=Math.sin(angle);

      C.projectiles.push({
        x:p.x+vx*muzzleOffset,
        y:p.y+vy*muzzleOffset,
        vx,
        vy,
        speed:weaponProjectileSpeed(w),
        range:Math.max(0,(Number(w.range)||0)-muzzleOffset),
        traveled:0,
        damage:pelletDamage,
        falloffStart:falloff.start,
        falloffFloor:falloff.floor,
        ammoLevel:shotAmmoLevel,
        owner:"player",
        radius:isBow?2.2:1.5,
        isBow,
        color:isBow?"#e2dfc8":"#ffe49a"
      });
    }
    C.shake=Math.min(10,C.shake+(w.name.includes("スナイパー")?7:2));
    burst(p.x+p.facingX*18,p.y+p.facingY*18,w.name.includes("ショットガン")?10:4,"muzzle");
    if(isBow)tone(520,.06,"sine",.015);
    else if(w.name.includes("ショットガン"))tone(95,.1,"sawtooth",.05);
    else tone(w.name.includes("スナイパー")||w.name.includes("ボルト")?70:150,.08,"sawtooth",.045);

    return true;
  }
  function reloadDuration(w){
    const name=w?.name||"";

    if(name==="ハンドガン")return 1.4;
    if(name==="SMG")return 1.6;
    if(name==="ショットガン")return 2.2;
    if(name==="アサルトライフル")return 1.9;
    if(name==="マークスマンライフル")return 2.0;
    if(name==="スナイパーライフル")return 2.5;
    if(name==="ボルトアクション")return 2.3;
    if(name==="狩猟弓")return .65;
    if(name==="コンポジットボウ")return .75;
    if(name==="クロスボウ")return 2.0;

    return 1.8;
  }

  function finishReload(){
    const state=C.reloadState;

    if(!state)return false;

    C.reloadState=null;

    const a=A();
    if(
      !a ||
      (
        !a.running &&
        !window.EFRTraining?.isActive?.()
      )
    ){
      return false;
    }

    const savedWeapon=a.save?.equipment?.[state.slot];

    if(
      !savedWeapon ||
      savedWeapon.kind!=="firearm"
    ){
      return false;
    }

    const ammoInMagazine=Number(
      savedWeapon.ammo||0
    );

    const magSize=Number(
      savedWeapon.magSize||1
    );

    const need=Math.max(
      0,
      magSize-ammoInMagazine
    );

    if(need<=0)return true;

    normalizeMagazineAmmoLoads(savedWeapon);
    let remaining=need;
    let loaded=0;
    const loadedLevels=[];

    while(remaining>0){
      const idx=findCompatibleAmmoIndex(
        a.player.loot,
        savedWeapon.ammoType
      );
      if(idx<0)break;

      const am=a.player.loot[idx];
      const available=Math.max(0,Math.floor(Number(am.amount)||0));
      const count=Math.min(remaining,available);
      if(count<=0)break;

      const level=ammoLevelOf(am);
      appendMagazineAmmoLevel(savedWeapon,level,count);
      savedWeapon.ammo=
        Math.max(0,Math.floor(Number(savedWeapon.ammo)||0))+count;

      am.amount=available-count;
      if(am.amount<=0){
        a.player.loot.splice(idx,1);
      }else{
        a.ensureItemWeight?.(am);
      }

      loaded+=count;
      remaining-=count;
      loadedLevels.push(level);
    }

    if(loaded<=0){
      a.logMessage?.("対応弾薬がありません");
      return false;
    }

    tone(330,.12,"triangle",.03);
    a.persist?.();
    a.renderInventory?.();

    const levelLabel=[...new Set(loadedLevels)]
      .map(level=>"Lv."+level)
      .join(" / ");
    a.logMessage?.("弾薬を"+loaded+"発装填しました（"+levelLabel+"）");
    a.awardJobActionXP?.("reloadComplete");
    return true;
  }

  function cancelReload(){
    C.reloadState=null;
  }

  // 弾切れ時の自動リロード：対応する予備弾がバッグにあれば、通常の
  // reload() をそのまま開始する（所要時間・装填処理・武器切替での
  // 中断は手動リロードと同一）。予備弾がなければ何もしない
  // （呼び出し側が従来の弾切れ表示を行う）。
  function tryAutoReload(){
    if(C.reloadState)return false;
    if(window.EFRTraining?.isActive?.())return false;

    const a=A();
    const w=a?.equippedWeapon?.();

    if(!a || !w || w.kind!=="firearm")return false;

    const idx=findCompatibleAmmoIndex(
      a.player.loot,
      w.ammoType
    );

    if(idx<0)return false;

    return reload();
  }

  function reload(){
    const a=A();
    const slot="weapon"+(a?.activeWeaponSlot||1);
    const savedWeapon=a?.save?.equipment?.[slot];
    const w=a?.equippedWeapon?.();

    if(
      !a ||
      (
        !a.running &&
        !window.EFRTraining?.isActive?.()
      ) ||
      !w ||
      w.kind!=="firearm" ||
      !savedWeapon
    ){
      return false;
    }

    if(C.reloadState)return false;

    const ammoInMagazine=Number(
      savedWeapon.ammo||0
    );

    const magSize=Number(
      savedWeapon.magSize||
      w.magSize||
      1
    );

    const need=Math.max(
      0,
      magSize-ammoInMagazine
    );

    if(need<=0)return false;

    const idx=findCompatibleAmmoIndex(
      a.player.loot,
      w.ammoType
    );

    if(idx<0){
      a.logMessage?.("対応弾薬がありません");
      return false;
    }

    const duration=reloadDuration(w)*(a.jobWheelEffects?.()?.reloadMultiplier||1);

    C.reloadState={
      slot,
      duration,
      remaining:duration
    };

    a.logMessage?.(
      "リロード中… "+
      duration.toFixed(1)+
      "秒"
    );

    return true;
  }


  // 強個体：通常種（最弱想定）の上に、出現率低めで常駐する格上げ個体（2026-11-22）。
  // ワールド日数で世界が変わる方式は採らない。いつでも低確率で居る。
  const ELITE_CHANCE=.06;
  const ELITE_SPEED={melee:100,scout:115,rifle:55,sniper:40,caster:50};
  function makeElite(e){
    if(!e||e.elite)return e;
    e.elite=true;
    const boost=(v,mul)=>{v=Number(v)||0;return v>0?Math.max(1,Math.round(v*mul)):0;};
    e.maxHp=Math.round((Number(e.maxHp)||60)*2.2);
    e.hp=e.maxHp;
    e.damage=boost(e.damage,1.4);
    e.contactDamage=boost(e.contactDamage,1.4);
    const speed=ELITE_SPEED[e.role];
    if(speed){e.speed=speed;e.baseSpeed=speed;}
    e.r=Math.min(20,(Number(e.r)||15)+3);
    e.name="強個体・"+(e.name||"敵");
    return e;
  }

  // ボス（2026-11-22）：攻撃軸×仕掛け軸の組み合わせで用意する。第一弾は巨大型×近接。
  // 出現はボスの日が必ず1体、通常時は1%。ドロップは必須にしない強化寄り。
  const BOSS_CHANCE=.01;
  const BOSS_TYPES={
    brute:{name:"重装の親玉",hp:650,speed:42,r:34,contactDamage:0,range:48,role:"melee",swingDamage:20,slamDamage:34,chargeDamage:24},
    shifter:{name:"凶暴な親玉",hp:520,speed:58,r:32,contactDamage:0,range:48,role:"melee",swingDamage:16,slamDamage:26,chargeDamage:20},
    nest:{name:"巣の主",hp:800,speed:0,r:44,contactDamage:0,range:340,role:"caster",damage:12},
    summoner:{name:"召喚士",hp:380,speed:52,r:27,contactDamage:0,range:330,role:"caster",damage:13},
    commander:{name:"司令官",hp:460,speed:48,r:28,contactDamage:0,range:380,role:"rifle",damage:9}
  };
  const BOSS_KINDS=["brute","shifter","nest","summoner","commander"];
  function bossDayActive(){
    try{return window.EFRGarden?.dayState?.(0)?.id==="boss";}catch(_){return false;}
  }
  function spawnBoss(a,rng,guaranteed){
    if(!a?.world||!Array.isArray(a.enemies))return null;
    if(a.enemies.some(e=>e&&e.boss))return null;
    if(!guaranteed&&rng()>=BOSS_CHANCE)return null;
    let kind=BOSS_KINDS[Math.floor(rng()*BOSS_KINDS.length)]||"brute";
    let nestZone=null;
    if(kind==="nest"){
      try{nestZone=window.EFRContamination?.biologicalZone?.()||null;}catch(_){nestZone=null;}
      if(!nestZone)kind="brute";
    }
    const spec=BOSS_TYPES[kind];
    const width=Number(a.world.walls?.[0]?.w||3326);
    const height=Number(a.world.walls?.[2]?.h||1871);
    const start=a.world.start||{x:60,y:270};
    let x=0,y=0,found=false;
    for(let attempt=0;attempt<300&&!found;attempt++){
      x=90+rng()*(width-180);
      y=90+rng()*(height-180);
      if(Math.hypot(x-start.x,y-start.y)<600)continue;
      if(typeof a.blocked==="function"&&a.blocked({x,y,r:spec.r}))continue;
      found=true;
    }
    if(kind==="nest"&&nestZone){
      x=nestZone.x;
      y=nestZone.y;
      found=true;
    }
    if(!found)return null;
    const boss={
      x,y,
      r:spec.r,
      hp:spec.hp,
      maxHp:spec.hp,
      speed:spec.speed,
      baseSpeed:spec.speed,
      role:spec.role||"melee",
      name:spec.name,
      boss:true,
      bossKind:kind,
      damage:spec.damage||0,
      contactDamage:spec.contactDamage,
      swingDamage:spec.swingDamage||20,
      slamDamage:spec.slamDamage||34,
      chargeDamage:spec.chargeDamage||24,
      range:spec.range,
      buildingId:null,
      visualType:"boss_"+kind,
      facingX:1,
      facingY:0,
      alerted:false,
      lastSeenX:null,
      lastSeenY:null,
      searchTimer:0,
      alertX:null,
      alertY:null,
      alertConfidence:0,
      alertTimer:0,
      alertRole:null,
      alertSource:null,
      alertShareTimer:0,
      detection:0
    };
    a.enemies.push(boss);
    return boss;
  }

  function addWorldLoot(){
    const a=A();if(!a?.world||C.populatedSeed===a.world.seed)return;C.populatedSeed=a.world.seed;
    const rng=Math.random;

    const placeWorldItem=(building,x)=>{
      const buildingContainers=(a.containers||[]).filter(
        container=>container?.buildingId===building.id
      );

      if(
        buildingContainers.length &&
        rng()<.88
      ){
        const shelves=buildingContainers.filter(
          container=>container.type==="棚"
        );
        const pool=shelves.length && rng()<.68
          ? shelves
          : buildingContainers;
        const container=
          pool[(rng()*pool.length)|0];

        if(!Array.isArray(container.preloadedLoot)){
          container.preloadedLoot=[];
        }

        delete x.x;
        delete x.y;
        x.containerId=container.id;
        container.preloadedLoot.push(x);
        return;
      }

      a.items.push({
        ...x,
        x:rand(building.x+25,building.x+Math.max(25,building.w-25)),
        y:rand(building.y+25,building.y+Math.max(25,building.h-25)),
        buildingId:building.id,
        taken:false
      });
    };

    for(const b of a.world.buildings){
      const count=2+(rng()>.55?1:0);
      for(let i=0;i<count;i++){
        let x=
          window.EFRBaseParts?.randomStandalonePartItem?.(
            rng
          ) || null;

        if(!x){
          const roll=rng();

          if(roll<.18)x=weapon(C.weapons[(rng()*C.weapons.length)|0][0]);
          else if(roll<.30){const am=C.ammo[(rng()*C.ammo.length)|0];x=item(am[0],"ammo",{amount:6+((rng()*18)|0),weight:am[1]})}
        else if(roll<.43)x=item(["包帯","止血剤","救急キット"][(rng()*3)|0],"heal",{value:[20,35,70][(rng()*3)|0],weight:1});
        else {
          const materialName=selectMaterialForBuilding(b,rng);

          x=item(
            materialName,
            "material",
            {
              weight:1,
              rarity:C.materialRarity(materialName)
            }
          );
        }
        }
        if(x)placeWorldItem(b,x);
      }
    }

    // 研究対象レシピから、このマップの設計図を0～3枚生成する。
    // 既に生成済み・解放済み・研究済みのレシピも候補に含め、
    // 探索ごとに設計図が再出現する可能性を持たせる。
    const researchApi=window.EFRContentExpansion;
    const recipes=researchApi?.recipes||[];
    const blueprintCandidates=recipes.filter(r=>
      r?.researchable!==false
    );

    const blueprintCount=Math.floor(rng()*4);

    for(let blueprintIndex=0;
        blueprintIndex<blueprintCount &&
        blueprintCandidates.length &&
        a.world.buildings.length;
        blueprintIndex++){
      const recipe=
        blueprintCandidates[(rng()*blueprintCandidates.length)|0];
      const building=
        a.world.buildings[(rng()*a.world.buildings.length)|0];

      placeWorldItem(building,{
        name:"設計図："+String(recipe.name||""),
        kind:"blueprint",
        recipeId:String(recipe.id||""),
        slots:1,
        weight:.2
      });
    }

    // Upgrade existing enemies into roles without replacing their core AI.
    a.enemies.forEach((e,i)=>{const t=C.enemyTypes[i%C.enemyTypes.length];Object.assign(e,t,{maxHp:t.hp,hp:t.hp,baseSpeed:t.speed,rangedCooldown:rand(1.1,2.4),rangedTimer:rand(.3,1.5),aiming:false,aimTimer:0,aimTargetX:null,aimTargetY:null,lastShotX:null,lastShotY:null});if(!e.efrContaminationMutant&&!e.trainingDummy&&rng()<ELITE_CHANCE)makeElite(e);});
    spawnBoss(a,rng,bossDayActive());
  }
  function enemyCombat(e,dt){
    const a=A(),p=a?.player;
    if(!a||!p||e.dead)return;

    if(e.boss){
      e.aiming=false;
      e.aimTimer=0;
      e.aimTargetX=null;
      e.aimTargetY=null;
      return;
    }

    if(Number(e.freezeTimer||0)>0 || Number(e.flinchTimer||0)>0){
      e.aiming=false;
      e.aimTimer=0;
      e.aimTargetX=null;
      e.aimTargetY=null;
      return;
    }

    if(
      !a.enemyCanSeePlayer(e) ||
      ((Number(e.detection)||0)<1 && !e.trainingDummy)
    ){
      e.aiming=false;
      e.aimTimer=0;
      e.aimTargetX=null;
      e.aimTargetY=null;
      return;
    }

    if(e.role==="melee"){
      e.aiming=false;
      e.aimTimer=0;
      e.aimTargetX=null;
      e.aimTargetY=null;
      return;
    }

    const d=Math.hypot(p.x-e.x,p.y-e.y)||1;
    e.rangedTimer=Math.max(
      0,
      (Number(e.rangedTimer)||0)-Math.max(0,Number(dt)||0)
    );

    if(d>Number(e.range)||e.rangedTimer>0){
      e.aiming=false;
      e.aimTimer=0;
      e.aimTargetX=null;
      e.aimTargetY=null;
      return;
    }

    if(!e.aiming){
      e.aiming=true;
      e.aimTimer=Math.max(0,Number(e.aimTime)||0);
      e.aimTargetX=p.x;
      e.aimTargetY=p.y;
      return;
    }

    e.aimTimer=Math.max(
      0,
      (Number(e.aimTimer)||0)-Math.max(0,Number(dt)||0)
    );
    if(e.aimTimer>0)return;

    // Aim at the location captured when the warning began; never home after firing.
    const targetX=Number.isFinite(e.aimTargetX)?e.aimTargetX:p.x;
    const targetY=Number.isFinite(e.aimTargetY)?e.aimTargetY:p.y;
    const aimSpread=Math.max(0,Number(e.aimSpread)||0);
    const shotAngle=
      Math.atan2(targetY-e.y,targetX-e.x)+
      (Math.random()*2-1)*aimSpread;
    const vx=Math.cos(shotAngle),vy=Math.sin(shotAngle);
    const muzzleOffset=(Number(e.r)||10)+2;

    e.rangedTimer=e.rangedCooldown||1.5;
    e.lastShotX=targetX;
    e.lastShotY=targetY;
    e.aiming=false;
    e.aimTimer=0;
    e.aimTargetX=null;
    e.aimTargetY=null;

    C.projectiles.push({
      x:e.x+vx*muzzleOffset,
      y:e.y+vy*muzzleOffset,
      vx,
      vy,
      speed:enemyProjectileSpeed(e),
      range:Math.max(0,(Number(e.range)||0)-muzzleOffset),
      traveled:0,
      damage:Math.max(
        1,
        Math.round(
          (Number(e.damage)||1)*
          (Number(e.buffTimer||0)>0?1.3:1)*
          (Number(e.attackDownTimer||0)>0
            ? Math.max(
                0,
                Math.min(1,Number(e.attackDownMultiplier)||.7)
              )
            : 1)
        )
      ),
      ownerEntity:e,
      owner:"enemy",
      radius:1.8,
      isBow:false,
      color:e.role==="sniper"?"#ffb46e":e.role==="scout"?"#e5c66b":e.role==="caster"?"#b16be8":"#f16b5b"
    });

    C.shake=Math.min(6,C.shake+1);
    if(e.role==="caster")tone(660,.12,"sine",.02);
    else tone(e.role==="sniper"?95:120,.05,"sawtooth",.018);
  }

  function updateCombatProjectiles(dt){
    const a=A();
    if(!a)return;
    const frameTime=Math.max(0,Number(dt)||0);

    for(let i=C.projectiles.length-1;i>=0;i--){
      const projectile=C.projectiles[i];
      const range=Math.max(0,Number(projectile.range)||0);
      const traveled=Math.max(0,Number(projectile.traveled)||0);
      const remaining=range-traveled;
      if(remaining<=0){
        C.projectiles.splice(i,1);
        continue;
      }

      const distance=Math.min(
        Math.max(0,Number(projectile.speed)||0)*frameTime,
        remaining
      );
      if(distance<=0)continue;

      const steps=Math.max(1,Math.ceil(distance/3));
      const stepLength=distance/steps;
      let remove=false;

      for(let step=0;step<steps;step++){
        const nextX=projectile.x+projectile.vx*stepLength;
        const nextY=projectile.y+projectile.vy*stepLength;
        const radius=Math.max(.5,Number(projectile.radius)||1.5);

        // Resolve the wall first at each substep, so a target behind cover is never hit.
        if(a.blocked?.({x:nextX,y:nextY,r:radius})){
          burst(nextX,nextY,projectile.owner==="enemy"?2:4,"wall");
          remove=true;
          break;
        }

        projectile.x=nextX;
        projectile.y=nextY;
        projectile.traveled+=stepLength;

        if(projectile.owner==="player"){
          for(const target of a.enemies||[]){
            if(target.dead)continue;
            const targetRadius=(Number(target.r)||12)+radius;
            if(Math.hypot(target.x-nextX,target.y-nextY)>targetRadius)continue;

            // Keep the established stealth rule: a successful hit breaks concealment.
            if((a.player?.petStealthTimer||0)>0)a.player.petStealthTimer=0;
            const rangedDamage=
              projectile.damage*falloffMultiplier(projectile);
            const outgoingDamage=(window.EFRMagic?.modifyOutgoingDamage?.(
              rangedDamage,
              a.player
            ) ?? rangedDamage)*((!target.alerted && (Number(target.detection)||0)<1)
              ? (a.jobWheelEffects?.()?.unseenDamageMultiplier||1)
              : 1);
            const result=a.resolveEnemyDamage?.(target,outgoingDamage);

            if(
              result?.killed &&
              a.equippedWeapon?.()?.kind==="firearm"
            ){
              a.awardJobActionXP?.("firearmKill");
            }

            if(result?.killed){
              burst(target.x,target.y,18,"death");
            }else{
              burst(target.x,target.y,8,"impact");
              tone(75,.045,"square",.035);
            }

            remove=true;
            break;
          }
          if(remove)break;
        }else{
          const target=a.player;
          if(target&&Math.hypot(target.x-nextX,target.y-nextY)<=(Number(target.r)||10)+radius){
            const hitSlot=window.EFRDurability?.resolveHitLocation?.()||"chest";
            const armorReduction=window.EFRDurability?.getArmorReduction?.(hitSlot)||0;
            const outgoingDamage=window.EFRMagic?.modifyOutgoingDamage?.(
              projectile.damage,
              projectile.ownerEntity
            ) ?? projectile.damage;
            const baseIncomingDamage=Math.max(1,Number(outgoingDamage||1)-armorReduction);
            const incomingDamage=window.EFRMagic?.modifyIncomingDamage?.(
              target,
              baseIncomingDamage
            ) ?? baseIncomingDamage;
            const foodReduction=Math.max(0,Number(target.foodBuff?.damageReduction)||0);
            const drinkReduction=Math.max(0,Number(target.drinkBuff?.damageReduction)||0);
            const totalReduction=Math.min(.75,foodReduction+drinkReduction);
            const wheelFx=a.jobWheelEffects?.();
            const lowHpMult=(wheelFx && (Number(target.hp)||0)<=Math.max(1,Number(target.maxHp)||100)*0.3)
              ? (wheelFx.lowHpDamageTakenMultiplier||1)
              : 1;
            let reducedDamage=Math.max(
              1,
              Math.round(Number(incomingDamage||0)*(1-totalReduction)*(wheelFx?.damageTakenMultiplier||1)*lowHpMult)
            );
            // 不死の霊薬（錬金術師キーストーン）: 弾の直撃でも致死をHP1で耐える
            if(
              wheelFx?.undyingElixir &&
              !target.undyingUsed &&
              (Number(target.hp)||0)>1 &&
              reducedDamage>=(Number(target.hp)||0)
            ){
              target.undyingUsed=true;
              reducedDamage=(Number(target.hp)||0)-1;
              a.logMessage?.("不死の霊薬が身を守った");
            }
            target.hp-=reducedDamage;
            window.EFRDurability?.damageArmor?.(1,hitSlot);
            window.EFRDurability?.damageShield?.(1);
            C.texts.push({x:target.x,y:target.y-20,t:"被弾",life:.5});
            burst(target.x,target.y,5,"hit");
            remove=true;
            break;
          }
        }

        if(projectile.traveled>=range){
          remove=true;
          break;
        }
      }

      if(remove)C.projectiles.splice(i,1);
    }
  }

  function update(dt){
    const a=A();

    if(
      !a ||
      (
        !a.running &&
        !window.EFRTraining?.isActive?.()
      )
    )return;

    if(C.reloadState){
      C.reloadState.remaining-=Math.max(
        0,
        Number(dt)||0
      );

      if(C.reloadState.remaining<=0){
        finishReload();
      }
    }

    updateAimStability(dt);
    updateCombatProjectiles(dt);
    addWorldLoot();
    for(const e of a.enemies)enemyCombat(e,dt);
    for(const p of C.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.93;p.vy*=.93;p.life-=dt}
    for(const t of C.trails)t.life-=dt;for(const t of C.texts){t.y-=22*dt;t.life-=dt}
    C.particles=C.particles.filter(p=>p.life>0);C.trails=C.trails.filter(t=>t.life>0);C.texts=C.texts.filter(t=>t.life>0);C.shake=Math.max(0,C.shake-dt*18);
  }
  function draw(){
    const a=A();if(!a?.world)return;const ctx=a.ctx, sx=C.shake?rand(-C.shake,C.shake):0,sy=C.shake?rand(-C.shake,C.shake):0;
    const p=a.player,w=a.equippedWeapon(),ang=Math.atan2(p.facingY,p.facingX),range=w?.range||42;

    ctx.save();
    ctx.translate(sx,sy);
    // Environmental depth pass.
    for(const b of a.world.buildings){
      ctx.save();ctx.globalAlpha=.18;ctx.fillStyle="#000";ctx.fillRect(b.x+6,b.y+8,b.w,b.h);ctx.restore();
      ctx.strokeStyle="rgba(210,200,180,.18)";ctx.strokeRect(b.x+3,b.y+3,b.w-6,b.h-6);
      if(a.player.inside===b){ctx.strokeStyle="rgba(220,205,170,.5)";ctx.lineWidth=2;ctx.strokeRect(b.x+17,b.y+17,b.w-34,b.h-34);ctx.lineWidth=1;}
    }
    // Aim reticle and direction.
    const r=44;

    ctx.strokeStyle="rgba(255,255,255,.45)";ctx.beginPath();ctx.arc(p.x+p.facingX*48,p.y+p.facingY*48,8,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x+p.facingX*35,p.y+p.facingY*35);ctx.lineTo(p.x+p.facingX*62,p.y+p.facingY*62);ctx.stroke();
    // Telegraph the locked aim point before an enemy projectile is fired.
    for(const e of a.enemies||[]){
      if(
        e.dead ||
        !e.aiming ||
        !Number.isFinite(e.aimTargetX) ||
        !Number.isFinite(e.aimTargetY)
      ){
        continue;
      }

      const target={x:e.aimTargetX,y:e.aimTargetY};
      const targetDistance=Math.hypot(target.x-e.x,target.y-e.y);
      if(!Number.isFinite(targetDistance)||targetDistance<=1)continue;
      if(typeof a.blocked!=="function")continue;

      const aimDuration=Math.max(.01,Number(e.aimTime)||.01);
      const progress=Math.max(
        0,
        Math.min(1,1-(Number(e.aimTimer)||0)/aimDuration)
      );
      const aimSpread=Math.max(0,Number(e.aimSpread)||0);
      const spreadRadius=Math.max(
        5,
        Math.min(18,Math.tan(aimSpread)*targetDistance)
      );
      const warningColor=e.role==="sniper"
        ? "#ff765f"
        : e.role==="scout"
          ? "#ffd36a"
          : "#ef5b5b";

      const aimAngle=Math.atan2(target.y-e.y,target.x-e.x);
      const segmentCount=Math.max(
        8,
        Math.min(24,Math.ceil(2*aimSpread*targetDistance/6))
      );
      const sectorPoints=[];
      const rayStep=12;

      // Trace each angle only to the first wall/building collision.
      for(let i=0;i<=segmentCount;i++){
        const rayAngle=aimAngle-aimSpread+(2*aimSpread)*(i/segmentCount);
        const rayX=Math.cos(rayAngle);
        const rayY=Math.sin(rayAngle);
        let rayDistance=targetDistance;
        let previousDistance=0;

        for(
          let testDistance=Math.min(rayStep,targetDistance);
          ;
          testDistance=Math.min(targetDistance,testDistance+rayStep)
        ){
          const testPoint={
            x:e.x+rayX*testDistance,
            y:e.y+rayY*testDistance,
            r:0
          };

          if(a.blocked(testPoint)){
            let low=previousDistance;
            let high=testDistance;

            for(let iteration=0;iteration<4;iteration++){
              const middle=(low+high)/2;
              const middlePoint={
                x:e.x+rayX*middle,
                y:e.y+rayY*middle,
                r:0
              };

              if(a.blocked(middlePoint)){
                high=middle;
              }else{
                low=middle;
              }
            }

            rayDistance=low;
            break;
          }

          previousDistance=testDistance;
          if(testDistance>=targetDistance)break;
        }

        sectorPoints.push({
          x:e.x+rayX*rayDistance,
          y:e.y+rayY*rayDistance
        });
      }

      const centerVisible=
        typeof a.hasLineOfSight==="function" &&
        a.hasLineOfSight(e,target);

      ctx.save();
      ctx.fillStyle="#ff4141";
      ctx.globalAlpha=.08+.14*progress;
      ctx.beginPath();
      ctx.moveTo(e.x,e.y);
      for(const point of sectorPoints){
        ctx.lineTo(point.x,point.y);
      }
      ctx.closePath();
      ctx.fill();

      // Both spread boundaries stop at their clipped ray endpoints.
      ctx.strokeStyle="#ff6565";
      ctx.lineWidth=1;
      ctx.globalAlpha=.34+.26*progress;
      ctx.beginPath();
      ctx.moveTo(e.x,e.y);
      ctx.lineTo(sectorPoints[0].x,sectorPoints[0].y);
      const lastPoint=sectorPoints[sectorPoints.length-1];
      ctx.moveTo(e.x,e.y);
      ctx.lineTo(lastPoint.x,lastPoint.y);
      ctx.stroke();

      // Never draw a center warning line or target marker through cover.
      if(centerVisible){
        ctx.strokeStyle=warningColor;
        ctx.lineWidth=1.4;
        ctx.globalAlpha=.28+.4*progress;
        ctx.setLineDash([7,5]);
        ctx.beginPath();
        ctx.moveTo(e.x,e.y);
        ctx.lineTo(target.x,target.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.lineWidth=1.6;
        ctx.globalAlpha=.8;
        ctx.beginPath();
        ctx.arc(target.x,target.y,spreadRadius,0,Math.PI*2);
        ctx.stroke();

        ctx.lineWidth=2;
        ctx.globalAlpha=.45+.5*progress;
        ctx.beginPath();
        ctx.arc(
          target.x,
          target.y,
          spreadRadius+4,
          -Math.PI/2,
          -Math.PI/2+Math.PI*2*progress
        );
        ctx.stroke();
      }
      ctx.restore();
    }

    for(const t of C.trails){ctx.globalAlpha=Math.max(0,t.life/t.max);ctx.strokeStyle=t.hit?"#ffd36a":"#ddd";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(t.x1,t.y1);ctx.lineTo(t.x2,t.y2);ctx.stroke();ctx.lineWidth=1;ctx.globalAlpha=1}
    for(const q of C.projectiles){
      ctx.strokeStyle=q.color||"#ffe49a";
      ctx.lineWidth=q.isBow?2:1.6;
      ctx.beginPath();
      const tail=q.isBow?9:6;
      ctx.moveTo(q.x-q.vx*tail,q.y-q.vy*tail);
      ctx.lineTo(q.x+q.vx*2,q.y+q.vy*2);
      ctx.stroke();
      ctx.fillStyle=q.color||"#ffe49a";
      ctx.beginPath();
      ctx.arc(q.x,q.y,q.isBow?1.8:1.35,0,Math.PI*2);
      ctx.fill();
      ctx.lineWidth=1;
    }
    for(const q of C.particles){ctx.globalAlpha=Math.max(0,q.life/q.max);ctx.fillStyle=q.kind==="muzzle"?"#ffe49a":q.kind==="wall"?"#aaa":q.kind==="death"?"#a94444":"#ddd";ctx.beginPath();ctx.arc(q.x,q.y,Math.max(0,q.size),0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
    for(const q of C.texts){ctx.globalAlpha=Math.max(0,q.life/.7);ctx.fillStyle="#fff";ctx.font="bold 13px sans-serif";ctx.fillText(q.t,q.x-12,q.y);ctx.globalAlpha=1}
    ctx.restore();
  }
  function installControls(){
    const btn=document.getElementById("attackBtn");
    const reloadBtn=document.getElementById("reloadBtn");

    if(!btn)return;

    const a=A();
    const weapon=a?.equippedWeapon?.();
    const reloading=!!C.reloadState;

    if(reloadBtn){
      reloadBtn.hidden=weapon?.kind!=="firearm";
      reloadBtn.disabled=reloading || weapon?.kind!=="firearm";
      reloadBtn.textContent=
        reloading
          ? "リロード "+Math.max(
              0,
              C.reloadState.remaining
            ).toFixed(1)+"s"
          : "リロード";
    }

    /* 残弾表示：装填数／マガジン容量＋バッグ内の予備弾（同口径の合計）。
       銃器のときだけ出す。近接は弾を使わず、杖はMP表示が別にあるため、
       それらでは隠して誤った数字を見せない。 */
    const ammoHud=document.getElementById("ammoHud");
    const ammoValue=document.getElementById("ammoValue");

    if(ammoHud&&ammoValue){
      if(weapon?.kind!=="firearm"||weapon?.magicStaff){
        ammoHud.hidden=true;
      }else{
        const slot="weapon"+(a?.activeWeaponSlot||1);
        const savedWeapon=a?.save?.equipment?.[slot];

        const loaded=Math.max(
          0,
          Math.floor(Number(savedWeapon?.ammo ?? weapon.ammo ?? 0))
        );
        const magSize=Math.max(
          1,
          Math.floor(Number(savedWeapon?.magSize ?? weapon.magSize ?? 1))
        );

        const family=ammoFamily(
          savedWeapon?.ammoType ?? weapon.ammoType ?? ""
        );
        let reserve=0;
        if(family){
          for(const item of a?.player?.loot||[]){
            if(item?.kind==="ammo"&&ammoFamily(item)===family){
              reserve+=Math.max(
                0,
                Math.floor(Number(item.amount)||0)
              );
            }
          }
        }

        const label=loaded+"/"+magSize+"（残"+reserve+"）";
        if(ammoValue.textContent!==label){
          ammoValue.textContent=label;
        }

        const severity=
          loaded<=0
            ? "critical"
            : reserve<=0
              ? "warning"
              : "";
        if((ammoHud.dataset.raidSeverity||"")!==severity){
          if(severity)ammoHud.dataset.raidSeverity=severity;
          else delete ammoHud.dataset.raidSeverity;
        }

        ammoHud.hidden=false;
      }
    }

    if(btn.dataset.efrV3)return;
    btn.dataset.efrV3="1";

    let active=false,lastX=0,lastY=0;
    btn.addEventListener("pointerdown",e=>{e.preventDefault();e.stopImmediatePropagation();ensureAudio();active=true;lastX=e.clientX;lastY=e.clientY;btn.setPointerCapture?.(e.pointerId);fire();},{capture:true,passive:false});
    btn.addEventListener("pointermove",e=>{if(!active)return;e.preventDefault();const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;const a=A(),p=a?.player;if(p){const ang=Math.atan2(p.facingY,p.facingX)+dx*.012;const y=clamp(Math.sin(ang)-dy*.012,-1,1);a.setAim?.(Math.cos(ang),y)}fire();},{passive:false});
    const up=e=>{active=false;try{btn.releasePointerCapture?.(e.pointerId)}catch{}};btn.addEventListener("pointerup",up,{capture:true});btn.addEventListener("pointercancel",up,{capture:true});
    btn.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();fire()},{capture:true});

    if(reloadBtn){
      reloadBtn.addEventListener("click",e=>{
        e.preventDefault();
        e.stopImmediatePropagation();
        reload();
      });
    }

    document.addEventListener("keydown",e=>{if(e.key.toLowerCase()==="r"){e.preventDefault();reload()}else if(e.code==="Space"){e.preventDefault();e.stopImmediatePropagation();fire()}},{capture:true});
    document.addEventListener("pointerdown",ensureAudio,{once:false,capture:true});
  }
  window.EFRHooks={update,draw};

  window.EFRPrecision={
    get accuracy(){
      return C.aim.accuracy;
    },
    get moveSpeed(){
      return C.aim.moveSpeed;
    },
    get spread(){
      const a=A();
      return a ? currentSpread(a.equippedWeapon()) : 0;
    }
  };
  // Delegate to the canonical carry-weight APIs exported by game.js.
  const weight=item=>{
    const game=A();
    if(typeof game?.itemWeight==="function"){
      return game.itemWeight(item);
    }
    return Math.max(0,Number(item?.weight)||0);
  };
  const weightLimit=()=>{
    const game=A();
    if(typeof game?.backpackWeightCapacity==="function"){
      return Math.max(0,Number(game.backpackWeightCapacity())||0);
    }
    return 0;
  };

  window.EFRContentExpansion={
    catalog:C,
    weapons:C.weapons,
    ammo:C.ammo,
    materialRarity:name=>C.materialRarity(name),
    weight,
    weightLimit,
    reload,
    fire,
    get recipes(){return window.EFRContentExpansion?.__recipes||[]},
    get isResearched(){return window.EFRContentExpansion?.__isResearched||null},
    get isResearchAvailable(){return window.EFRContentExpansion?.__isResearchAvailable||null}
  };
  // ボスのカスタム射撃（game.js のボスロジックから使う）
  function spawnEnemyShot(e,angle,opts={}){
    const speed=Number(opts.speed)>0?Number(opts.speed):enemyProjectileSpeed(e);
    const vx=Math.cos(angle),vy=Math.sin(angle);
    const muzzleOffset=(Number(e.r)||10)+2;
    C.projectiles.push({
      x:e.x+vx*muzzleOffset,
      y:e.y+vy*muzzleOffset,
      vx,
      vy,
      speed,
      range:Math.max(0,(Number(opts.range||e.range)||0)-muzzleOffset),
      traveled:0,
      damage:Math.max(
        1,
        Math.round(
          (Number(opts.damage??e.damage)||1)*
          (Number(e.attackDownTimer||0)>0
            ? Math.max(0,Math.min(1,Number(e.attackDownMultiplier)||.7))
            : 1)
        )
      ),
      ownerEntity:e,
      owner:"enemy",
      radius:Number(opts.radius)>0?Number(opts.radius):1.8,
      isBow:false,
      color:opts.color||"#f16b5b"
    });
  }

  window.EFRCombat.fire=fire;
  window.EFRCombat.reload=reload;
  window.EFRCombat.cancelReload=cancelReload;
  window.EFRCombat.resetAimSpread=resetAimSpread;
  window.EFRCombat.falloffProfile=falloffProfile;
  window.EFRCombat.falloffMultiplier=falloffMultiplier;
  window.EFRCombat.gunshotNoiseRadius=gunshotNoiseRadius;
  window.EFRCombat.makeElite=makeElite;
  window.EFRCombat.spawnBoss=spawnBoss;
  window.EFRCombat.selectWeightedMaterial=selectWeightedMaterial;
  window.EFRCombat.spawnEnemyShot=spawnEnemyShot;
  window.EFRCombat.BOSS_KINDS=BOSS_KINDS;
  window.EFRCombat.BOSS_TYPES=BOSS_TYPES;
  window.EFRCombat.BOSS_CHANCE=BOSS_CHANCE;
  window.EFRCombat.ELITE_CHANCE=ELITE_CHANCE;
  setInterval(installControls,100);
})();
