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
      maintenance: 1,
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
    maintenance: {
      name: '整備台',
      max: 5,
      costs: { '鉄くず': 4, 'ボルト': 2, 'ネジ': 2 }
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
