(function () {
  'use strict';

  const G = () => window.EFRGame;
  const X = () => window.EFRContentExpansion;
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

    G()?.ensureWeaponProgression?.(w);

    w.mods=
      Array.isArray(w.mods)
        ?w.mods
        :[];

    if(!w._efrBaseStats){
      w._efrBaseStats={
        damage:Number(w.baseDamage ?? w.damage ?? 0),
        range:Number(w.range||0),
        cooldown:Number(w.cooldown||0),
        magSize:Number(w.magSize||0)
      };
    }

    const b=w._efrBaseStats;

    w.baseDamage=b.damage;
    w.range=b.range;
    w.cooldown=b.cooldown;
    w.magSize=b.magSize;

    let damage=b.damage;

    for(const id of w.mods){
      const p=PARTS[id];

      if(!p)continue;

      if(p.damage){
        damage=Math.max(
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

    w.damage=
      G()?.weaponProgressionDamage?.(w,damage) ??
      damage;
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
