(function () {
  'use strict';

  const G = () => window.EFRGame;
  const X = () => window.EFRContentExpansion;
  const S = () => {
    const g = G();
    if (!g || !g.save) return null;
    g.save.base = g.save.base || {};
    const b = g.save.base;

    b.facilities = b.facilities || {};
    b.stations = b.facilities;

    const defaults = {
      storage: 1,
      workbench: 1,
      workshop: 1,
      medical: 1,
      shooting: 0
    };

    Object.keys(defaults).forEach(k => {
      if (!Number.isFinite(Number(b.facilities[k]))) {
        b.facilities[k] = defaults[k];
      }
    });

    b.training = Math.max(0, Number(b.training || 0));
    b.intel = Math.max(0, Number(b.intel || 0));

    return b;
  };

  const FACILITIES = {
    storage: {
      name: '倉庫',
      max: 5,
      costs: { '木材': 4, '鉄くず': 4, 'ボルト': 2, 'ネジ': 2 }
    },
    workbench: {
      name: '作業台',
      max: 5,
      costs: { '鉄くず': 4, 'ネジ': 3, 'ボルト': 3, '電子部品': 1 }
    },
    workshop: {
      name: '工房',
      max: 5,
      costs: { '鉄くず': 5, '高品質金属': 2, '電子部品': 2 }
    },
    medical: {
      name: '医療設備',
      max: 5,
      costs: { '布': 3, '医療素材': 2, 'ガラス': 1 }
    },
    shooting: {
      name: '射撃訓練場',
      max: 3,
      costs: { '木材': 4, '鉄くず': 3, 'ボルト': 3 }
    },

    barrel:{
      name:"精密バレル",
      slot:"barrel",
      cost:{
        "鉄くず":2,
        "高品質金属":2,
        "ボルト":1
      },
      damage:.06,
      range:.12
    },

    stock:{
      name:"安定ストック",
      slot:"stock",
      cost:{
        "木材":2,
        "革":1,
        "高品質金属":1
      },
      accuracy:.06,
      spread:.10
    },

    grip:{
      name:"グリップ",
      slot:"grip",
      cost:{
        "革":1,
        "接着剤":1,
        "プラスチック":1
      },
      cooldown:.015
    },

    magazine:{
      name:"拡張マガジン",
      slot:"magazine",
      cost:{
        "鉄くず":2,
        "ネジ":2,
        "プラスチック":1
      },
      magazine:.25
    },

    muzzle:{
      name:"制退器",
      slot:"muzzle",
      cost:{
        "鉄くず":2,
        "高品質金属":1,
        "接着剤":1
      },
      accuracy:.03,
      spread:.15
    }
  };

  function base(){
    const g=G();

    if(!g?.save)return null;

    g.save.base=g.save.base||{};

    g.save.base.weaponParts=
      Array.isArray(g.save.base.weaponParts)
        ?g.save.base.weaponParts
        :[];

    return g.save.base;
  }

  function count(name){
    return (G()?.save?.stash||[]).reduce(
      (n,x)=>{
        if(typeof x==="string"){
          return n+(x===name?1:0);
        }

        return n+
          (x?.name===name
            ?Math.max(1,Number(x.amount)||1)
            :0);
      },
      0
    );
  }

  function take(name,amount){
    const stash=G()?.save?.stash;

    if(!Array.isArray(stash))return false;

    let left=amount;

    for(
      let i=stash.length-1;
      i>=0&&left>0;
      i--
    ){
      const x=stash[i];

      if(typeof x==="string"){
        if(x!==name)continue;

        stash.splice(i,1);
        left--;
        continue;
      }

      if(x?.name!==name)continue;

      const have=
        Math.max(
          1,
          Number(x.amount)||1
        );

      const used=Math.min(have,left);

      left-=used;

      if(have-used<=0){
        stash.splice(i,1);
      }else{
        x.amount=have-used;
      }
    }

    return left===0;
  }

  function pay(cost){
    if(!Object.entries(cost).every(
      ([n,v])=>count(n)>=Number(v)
    )){
      return false;
    }

    for(const [n,v] of Object.entries(cost)){
      if(!take(n,Number(v))){
        return false;
      }
    }

    return true;
  }

  function craft(id){
    const p=PARTS[id];
    const b=base();
    const g=G();

    if(!p||!b||!g)return false;

    const f=b.facilities||{};

    if(Number(f.workbench||0)<1){
      g.logMessage?.(
        "作業台Lv1が必要です"
      );
      return false;
    }

    if(
      id==="muzzle" &&
      Number(f.workshop||0)<1
    ){
      g.logMessage?.(
        "工房Lv1が必要です"
      );
      return false;
    }

    if(!pay(p.cost)){
      g.logMessage?.(
        "部品素材が不足しています"
      );
      return false;
    }

    b.weaponParts.push(id);

    g.persist?.();

    g.logMessage?.(
      p.name+"を製作しました"
    );

    return true;
  }

  function attach(id){
    const g=G();
    const b=base();
    const p=PARTS[id];

    if(!g||!b||!p)return false;

    const slot=
      "weapon"+(g.activeWeaponSlot||1);

    const w=
      g.save.equipment?.[slot];

    if(!w||w.kind!=="firearm"){
      g.logMessage?.(
        "銃器を選択してください"
      );
      return false;
    }

    const index=
      b.weaponParts.indexOf(id);

    if(index<0){
      g.logMessage?.(
        "その部品を製作してください"
      );
      return false;
    }

    w.mods=
      Array.isArray(w.mods)
        ?w.mods
        :[];

    const old=
      w.mods.findIndex(
        x=>PARTS[x]?.slot===p.slot
      );

    if(old>=0){
      b.weaponParts.push(
        w.mods[old]
      );

      w.mods.splice(old,1);
    }

    w.mods.push(id);

    b.weaponParts.splice(index,1);

    g.persist?.();
    g.renderInventory?.();

    g.logMessage?.(
      p.name+"を装着しました"
    );

    return true;
  }

  function normalizeWeapon(w){
    if(!w||w.kind!=="firearm")return;

    w.mods=
      Array.isArray(w.mods)
        ?w.mods
        :[];

    if(!w._efrBaseStats){
      w._efrBaseStats={
        damage:Number(w.damage||0),
        range:Number(w.range||0),
        cooldown:Number(w.cooldown||0),
        magSize:Number(w.magSize||0)
      };
    }

    const b=w._efrBaseStats;

    w.damage=b.damage;
    w.range=b.range;
    w.cooldown=b.cooldown;
    w.magSize=b.magSize;

    for(const id of w.mods){
      const p=PARTS[id];

      if(!p)continue;

      if(p.damage){
        w.damage=Math.max(
          1,
          Math.round(
            b.damage*(1+p.damage)
          )
        );
      }

      if(p.range){
        w.range=Math.round(
          b.range*(1+p.range)
        );
      }

      if(p.cooldown){
        w.cooldown=Math.max(
          .05,
          b.cooldown-p.cooldown
        );
      }

      if(p.magazine){
        w.magSize=
          b.magSize+
          Math.max(
            1,
            Math.ceil(
              b.magSize*p.magazine
            )
          );
      }
    }
  }

  function accuracyBonus(w){
    let result=0;

    for(const id of w?.mods||[]){
      result+=
        Number(
          PARTS[id]?.accuracy||0
        );
    }

    const b=base();

    result+=Math.min(
      .20,
      Number(
        b?.facilities?.shooting||0
      )*.03+
      Number(b?.training||0)*.001
    );

    return Math.min(.35,result);
  }

  function spreadReduction(w){
    let result=0;

    for(const id of w?.mods||[]){
      result+=
        Number(
          PARTS[id]?.spread||0
        );
    }

    return Math.min(.40,result);
  }

  window.EFRBaseParts={
    definitions:PARTS,
    craft,
    attach,
    normalizeWeapon,
    accuracyBonus,
    spreadReduction
  };

  function boot(){
    const g=G();

    if(!g){
      setTimeout(boot,200);
      return;
    }

    base();

    setInterval(()=>{
      const b=base();

      for(
        const key of ["weapon1","weapon2"]
      ){
        normalizeWeapon(
          b
            ?g.save.equipment?.[key]
            :null
        );
      }
    },250);
  }

  boot();
})();


/* EFR BASE PROCESSING V4 */
(function(){
  'use strict';

  const G=()=>window.EFRGame;

  const RECIPES={
    "加工金属":{
      "鉄くず":3
    },
    "回路基板":{
      "電子部品":2,
      "ガラス":1,
      "プラスチック":1
    },
    "医療キット素材":{
      "医療素材":2,
      "布":2,
      "プラスチック":1
    }
  };

  function count(name){
    return (G()?.save?.stash||[]).reduce(
      (n,x)=>{
        if(typeof x==="string"){
          return n+(x===name?1:0);
        }

        return n+
          (x?.name===name
            ?Math.max(1,Number(x.amount)||1)
            :0);
      },
      0
    );
  }

  function take(name,amount){
    const stash=G()?.save?.stash;

    if(!Array.isArray(stash))return false;

    let left=amount;

    for(
      let i=stash.length-1;
      i>=0&&left>0;
      i--
    ){
      const x=stash[i];

      if(typeof x==="string"){
        if(x!==name)continue;
        stash.splice(i,1);
        left--;
        continue;
      }

      if(x?.name!==name)continue;

      const have=
        Math.max(
          1,
          Number(x.amount)||1
        );

      const used=Math.min(have,left);

      left-=used;

      if(have-used<=0){
        stash.splice(i,1);
      }else{
        x.amount=have-used;
      }
    }

    return left===0;
  }

  function process(name){
    const g=G();
    const b=g?.save?.base;
    const recipe=RECIPES[name];

    if(!g||!b||!recipe)return false;

    if(
      Number(
        b.facilities?.workshop||0
      )<1
    ){
      g.logMessage?.(
        "工房Lv1が必要です"
      );
      return false;
    }

    if(!Object.entries(recipe).every(
      ([k,v])=>count(k)>=v
    )){
      g.logMessage?.(
        "加工素材が不足しています"
      );
      return false;
    }

    for(const [k,v] of Object.entries(recipe)){
      if(!take(k,v))return false;
    }

    const existing=
      g.save.stash.find(
        x=>
          x&&
          typeof x==="object"&&
          x.name===name
      );

    if(existing){
      existing.amount=
        Math.max(
          1,
          Number(existing.amount)||1
        )+1;
    }else{
      g.save.stash.push({
        name,
        kind:"material",
        amount:1
      });
    }

    g.persist?.();

    g.logMessage?.(
      name+"を加工しました"
    );

    return true;
  }

  window.EFRBaseProcessing={
    recipes:RECIPES,
    process
  };
})();


/* EFR BASE UI UNIFICATION V4 */
(function(){
  const style=document.createElement("style");

  style.textContent=`
    .efr-base-v3-facilities{
      display:none !important;
    }
  `;

  document.head.appendChild(style);
})();
