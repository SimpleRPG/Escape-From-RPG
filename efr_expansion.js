/* EFR unified gameplay expansion: combat, cover, AI, VFX, audio, world density. */
(() => {
  "use strict";
  const A = () => window.EFRGame;
  const C = window.EFRCombat = {
    particles: [], trails: [], impacts: [], texts: [], shake: 0,
    aim: {accuracy:1, moveSpeed:0, moveInput:0, spreadState:0, weaponName:null},
    audio: null, audioReady: false, populatedSeed: null, lastShot: 0,
    weapons: [
      ["ハンドガン",28,250,.32,12,"9mm",1.4,70],
      ["SMG",18,260,.11,30,"9mm",2.8,90],
      ["ショットガン",52,190,.8,6,"12ゲージ",4.2,80],
      ["アサルトライフル",24,300,.14,30,"5.56mm",3.6,100],
      ["マークスマンライフル",48,420,.55,10,"7.62mm",4.4,110],
      ["スナイパーライフル",95,650,1.15,5,"7.62mm",6.2,115],
      ["ボルトアクション",125,720,1.45,4,"7.62mm",6.8,120],
      ["バット",34,48,.58,0,null,2.2,80],
      ["ハンマー",42,42,.72,0,null,2.8,75],
      ["手斧",46,45,.64,0,null,2.5,70],
      ["マチェット",38,52,.42,0,null,2,85]
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

      // 加工・中間素材 3
      "加工金属","回路基板","医療キット素材"
    ],

    materialRarities: Object.freeze({
      // ★1 コモン
      "鉄くず":1,
      "木材":1,
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
      "強化素材"
    ]),

    materialLootPool(){
      return [
        ...(this.materials||[]),
        ...(this.intermediateMaterials||[])
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
      {role:"melee",name:"略奪者",hp:80,speed:48,range:42,damage:10},
      {role:"rifle",name:"武装兵",hp:90,speed:34,range:300,damage:8},
      {role:"sniper",name:"狙撃兵",hp:70,speed:24,range:600,damage:24},
      {role:"scout",name:"偵察兵",hp:55,speed:62,range:220,damage:6}
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
        ammo:0,
        mods:[]
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
  function distPointSegment(px,py,x1,y1,x2,y2){const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy||1;const q=clamp(((px-x1)*dx+(py-y1)*dy)/l,0,1);const x=x1+dx*q,y=y1+dy*q;return Math.hypot(px-x,py-y)}
  function lineClear(from,to){return A().hasLineOfSight(from,to)}
  /* EFR precision/attack-area system v1 */
  /* Weapon-specific spread values are defined directly in aimProfile(). */

  function meleeArc(w){
    const n=w?.name||"";
    if(n.includes("ナイフ")) return 0.34;
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

    return minimum+
      (maximum-minimum)*Math.max(
        currentFloorState,
        effectiveState
      );
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
  }

  function randomShotAngle(w){
    const a=A();
    const p=a.player;
    const center=Math.atan2(
      p.facingY,
      p.facingX
    );

    const spread=currentSpread(w);

    return center+
      (Math.random()*2-1)*spread;
  }

  function aimedTarget(w, shotAngle=null){
    const a=A(),p=a.player,best={e:null,s:Infinity};
    for(const e of a.enemies){if(e.dead)continue;const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;if(d>w.range+(e.r||15)||!a.playerCanSeeEnemy(e))continue;const ang=Math.atan2(dy,dx),aim=shotAngle==null?Math.atan2(p.facingY,p.facingX):shotAngle;let da=ang-aim;while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;da=Math.abs(da);const aimWindow=(w.name.includes("スナイパー")||w.name.includes("ボルト"))?.10:.22;if(da>aimWindow)continue;const score=d+da*300;if(score<best.s)best.e=e,best.s=score;}
    return best.e;
  }
  function fire(){
    const a=A();if(!a||!a.running)return false;ensureAudio();

    const slot="weapon"+(a.activeWeaponSlot||1);
    const savedWeapon=a.save?.equipment?.[slot];
    const w=a.equippedWeapon();

    if(!w)return false;
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
      a.logMessage?.("弾切れ。リロードしてください");
      tone(90,.08,"square");
      return false;
    }

    if(a.attackTimer>0)return false;

    if(!window.EFRTraining?.isActive?.()){
      if(savedWeapon){
        savedWeapon.ammo=Math.max(0,ammo-1);
        savedWeapon.durability=Math.max(0,durability-1);
      }

      w.ammo=Math.max(0,ammo-1);
      w.durability=Math.max(0,durability-1);
    }

    a.attackTimer=w.cooldown||.3;
    a.attackFlash=.12;

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
      w.name.includes("スナイパー") ? 360 : 300,
      "gunshot"
    );

    const shotAngle=randomShotAngle(w),sdx=Math.cos(shotAngle),sdy=Math.sin(shotAngle),tx=p.x+sdx*w.range,ty=p.y+sdy*w.range,t=aimedTarget(w,shotAngle);const ex=t?t.x:tx,ey=t?t.y:ty;
    C.trails.push({x1:p.x,y1:p.y,x2:ex,y2:ey,life:.11,max:.11,hit:!!t});C.shake=Math.min(10,C.shake+(w.name.includes("スナイパー")?7:2));burst(p.x+p.facingX*18,p.y+p.facingY*18,w.name.includes("ショットガン")?10:4,"muzzle");tone(w.name.includes("スナイパー")?70:150,.08,"sawtooth",.045);

    if(t){
      const dmg=Math.round(w.damage);
      a.applyDamage?.(t,dmg);
      burst(t.x,t.y,10,"impact");
      tone(75,.045,"square",.035);

      if(t.hp<=0){
        if(t.trainingDummy){
          t.hp=t.maxHp;
          t.dead=false;
          return true;
        }

        t.dead=true;
        t.loot=[item("敵の戦利品","loot",{slots:1})];
        a.gainPlayerXP?.(20,"enemy");
        burst(t.x,t.y,18,"death");
      }
    }else{
      for(const b of a.world.buildings){
        if(
          distPointSegment(b.x,b.y,p.x,p.y,ex,ey)<18||
          distPointSegment(b.x+b.w,b.y+b.h,p.x,p.y,ex,ey)<18
        ){
          burst(ex,ey,7,"wall");
          break;
        }
      }
    }

    return true;
  }
  function reload(){
    const a=A();
    const slot="weapon"+(a?.activeWeaponSlot||1);
    const savedWeapon=a?.save?.equipment?.[slot];
    const w=a?.equippedWeapon?.();

    if(!a||!w||w.kind!=="firearm"||!savedWeapon)return;

    const ammoInMagazine=Number(savedWeapon.ammo||0);
    const need=(savedWeapon.magSize||w.magSize||1)-ammoInMagazine;

    if(need<=0)return;

    const idx=a.player.loot.findIndex(
      x=>x.kind==="ammo" &&
         x.name===w.ammoType &&
         (x.amount||0)>0
    );

    if(idx<0){
      a.logMessage?.("対応弾薬がありません");
      return;
    }

    const am=a.player.loot[idx];
    const n=Math.min(need,am.amount);

    savedWeapon.ammo=ammoInMagazine+n;
    am.amount-=n;

    if(am.amount<=0){
      a.player.loot.splice(idx,1);
    }

    tone(330,.12,"triangle",.03);
    a.renderInventory?.();
  }
  function materialCount(name){
    const a=A();if(!a)return 0;

    const stash=(a.save.stash||[]).reduce((n,x)=>{
      if(typeof x==="string") return n+(x===name?1:0);
      return n+(x?.name===name ? (x.amount||1) : 0);
    },0);

    const loot=(a.player.loot||[]).reduce((n,x)=>{
      return n+(x?.name===name ? (x.amount||1) : 0);
    },0);

    return stash+loot;
  }

  function takeMaterial(name,count){
    const a=A();
    let left=count;

    for(let i=a.save.stash.length-1;i>=0&&left;i--){
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
  function weight(){const a=A();return (a?.player?.loot||[]).reduce((n,x)=>n+(x.weight||1)*(x.amount||1),0)}
  function weightLimit(){const a=A();return 10+((a?.save?.equipment?.backpack?.capacity||0)+4)*1.8}

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
    a.enemies.forEach((e,i)=>{const t=C.enemyTypes[i%C.enemyTypes.length];Object.assign(e,t,{maxHp:t.hp,hp:t.hp,baseSpeed:t.speed,rangedCooldown:rand(1.1,2.4),rangedTimer:rand(.3,1.5),lastShotX:null,lastShotY:null});});
  }
  function enemyCombat(e,dt){
    const a=A(),p=a.player;if(e.dead)return;const d=Math.hypot(p.x-e.x,p.y-e.y)||1;
    if(!a.enemyCanSeePlayer(e))return;
    if(e.role==="melee")return;
    e.rangedTimer=(e.rangedTimer||0)-dt;if(d>e.range||e.rangedTimer>0)return;
    e.rangedTimer=e.rangedCooldown||1.5;e.lastShotX=p.x;e.lastShotY=p.y;
    C.trails.push({x1:e.x,y1:e.y,x2:p.x,y2:p.y,life:.08,max:.08,hit:true});C.shake=Math.min(6,C.shake+1);tone(e.role==="sniper"?95:120,.05,"sawtooth",.018);
    const hitSlot=window.EFRDurability?.resolveHitLocation?.()||"chest";
    const armorReduction=
      window.EFRDurability?.getArmorReduction?.(hitSlot)||0;

    p.hp-=Math.max(
      1,
      e.damage-armorReduction
    );

    window.EFRDurability?.damageArmor?.(
      1,
      hitSlot
    );
    C.texts.push({x:p.x,y:p.y-20,t:"被弾",life:.5});
    burst(p.x,p.y,5,"hit");
  }
  function update(dt){
    const a=A();if(!a?.running)return;updateAimStability(dt);addWorldLoot();
    for(const e of a.enemies)enemyCombat(e,dt);
    for(const p of C.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.93;p.vy*=.93;p.life-=dt}
    for(const t of C.trails)t.life-=dt;for(const t of C.texts){t.y-=22*dt;t.life-=dt}
    C.particles=C.particles.filter(p=>p.life>0);C.trails=C.trails.filter(t=>t.life>0);C.texts=C.texts.filter(t=>t.life>0);C.shake=Math.max(0,C.shake-dt*18);
  }
  function draw(){
    const a=A();if(!a?.world)return;const ctx=a.ctx, sx=C.shake?rand(-C.shake,C.shake):0,sy=C.shake?rand(-C.shake,C.shake):0;
    const p=a.player,w=a.equippedWeapon(),ang=Math.atan2(p.facingY,p.facingX),range=w?.range||42;

    // 半透明白の攻撃範囲・現在散布範囲。
    ctx.save();
    ctx.translate(sx,sy);
    ctx.globalAlpha=.12;
    ctx.fillStyle="#fff";
    ctx.strokeStyle="rgba(255,255,255,.42)";
    ctx.lineWidth=1;

    if(w?.kind==="firearm"){
      const spread=currentSpread(w);
      const start=ang-spread;
      const end=ang+spread;

      ctx.beginPath();
      ctx.moveTo(p.x,p.y);
      ctx.arc(p.x,p.y,range,start,end);
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha=.5;
      ctx.beginPath();
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(
        p.x+Math.cos(start)*range,
        p.y+Math.sin(start)*range
      );
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(
        p.x+Math.cos(ang)*range,
        p.y+Math.sin(ang)*range
      );
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(
        p.x+Math.cos(end)*range,
        p.y+Math.sin(end)*range
      );
      ctx.stroke();

    }else{
      const arc=meleeArc(w);
      const start=ang-arc/2;
      const end=ang+arc/2;

      ctx.beginPath();
      ctx.moveTo(p.x,p.y);
      ctx.arc(p.x,p.y,range,start,end);
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha=.5;
      ctx.beginPath();
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(
        p.x+Math.cos(start)*range,
        p.y+Math.sin(start)*range
      );
      ctx.moveTo(p.x,p.y);
      ctx.lineTo(
        p.x+Math.cos(end)*range,
        p.y+Math.sin(end)*range
      );
      ctx.stroke();
    }

    ctx.globalAlpha=1;
    ctx.restore();

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

    // 左移動スティックの倒し込み量に応じて収束する精度リング。
    ctx.save();
    ctx.strokeStyle="rgba(255,255,255,.28)";
    ctx.setLineDash([3,4]);

    const precisionRadius =
      w?.kind==="firearm"
        ? Math.max(5,currentSpread(w)*range)
        : meleeArc(w)*range*.28;

    ctx.beginPath();
    ctx.arc(
      p.x+p.facingX*range*.82,
      p.y+p.facingY*range*.82,
      precisionRadius,
      0,
      Math.PI*2
    );
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.restore();

    ctx.strokeStyle="rgba(255,255,255,.45)";ctx.beginPath();ctx.arc(p.x+p.facingX*48,p.y+p.facingY*48,8,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(p.x+p.facingX*35,p.y+p.facingY*35);ctx.lineTo(p.x+p.facingX*62,p.y+p.facingY*62);ctx.stroke();
    for(const t of C.trails){ctx.globalAlpha=Math.max(0,t.life/t.max);ctx.strokeStyle=t.hit?"#ffd36a":"#ddd";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(t.x1,t.y1);ctx.lineTo(t.x2,t.y2);ctx.stroke();ctx.lineWidth=1;ctx.globalAlpha=1}
    for(const q of C.particles){ctx.globalAlpha=Math.max(0,q.life/q.max);ctx.fillStyle=q.kind==="muzzle"?"#ffe49a":q.kind==="wall"?"#aaa":q.kind==="death"?"#a94444":"#ddd";ctx.beginPath();ctx.arc(q.x,q.y,q.size,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1}
    for(const q of C.texts){ctx.globalAlpha=Math.max(0,q.life/.7);ctx.fillStyle="#fff";ctx.font="bold 13px sans-serif";ctx.fillText(q.t,q.x-12,q.y);ctx.globalAlpha=1}
    ctx.restore();
  }
  function installControls(){
    const btn=document.getElementById("attackBtn");if(!btn||btn.dataset.efrV2)return;btn.dataset.efrV2="1";
    let active=false,lastX=0,lastY=0;
    btn.addEventListener("pointerdown",e=>{e.preventDefault();e.stopImmediatePropagation();ensureAudio();active=true;lastX=e.clientX;lastY=e.clientY;btn.setPointerCapture?.(e.pointerId);fire();},{capture:true,passive:false});
    btn.addEventListener("pointermove",e=>{if(!active)return;e.preventDefault();const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;const a=A(),p=a?.player;if(p){const ang=Math.atan2(p.facingY,p.facingX)+dx*.012;const y=clamp(Math.sin(ang)-dy*.012,-1,1);a.setAim?.(Math.cos(ang),y)}fire();},{passive:false});
    const up=e=>{active=false;try{btn.releasePointerCapture?.(e.pointerId)}catch{}};btn.addEventListener("pointerup",up,{capture:true});btn.addEventListener("pointercancel",up,{capture:true});
    btn.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();fire()},{capture:true});
    document.addEventListener("keydown",e=>{if(e.key.toLowerCase()==="r"){e.preventDefault();reload()}else if(e.code==="Space"){e.preventDefault();fire()}},{capture:true});
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
  window.EFRCombat.fire=fire;window.EFRCombat.reload=reload;window.EFRCombat.resetAimSpread=resetAimSpread;
  setInterval(installControls,100);
})();
