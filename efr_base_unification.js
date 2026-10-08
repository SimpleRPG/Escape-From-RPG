(function () {
  "use strict";

  const G=()=>window.EFRGame;

  const PARTS={
    precisionBarrel:{
      name:"精密バレル",
      slot:"barrel",
      damage:.06,
      range:.12
    },
    stableStock:{
      name:"安定ストック",
      slot:"stock",
      accuracy:.06,
      spread:.10
    },
    grip:{
      name:"グリップ",
      slot:"grip",
      cooldown:.015
    },
    extendedMagazine:{
      name:"拡張マガジン",
      slot:"magazine",
      magazine:.25
    },
    muzzleBrake:{
      name:"制退器",
      slot:"muzzle",
      accuracy:.03,
      spread:.15
    }
  };

  const RARITY_NAMES=[
    "コモン",
    "アンコモン",
    "レア",
    "エピック",
    "レジェンダリー"
  ];

  const RARITY_MULTIPLIERS=[
    1,
    1.08,
    1.18,
    1.30,
    1.45
  ];

  const RARITY_WEIGHTS=Object.freeze({
    1:70,
    2:20,
    3:7,
    4:2.5,
    5:.5
  });

  const GENERATED_PART_FIRST_CHANCE=.25;
  const GENERATED_PART_SECOND_CHANCE=.10;
  const STANDALONE_PART_DROP_CHANCE=.06;

  function rarityWeights(){
    return RARITY_WEIGHTS;
  }

  function randomRarity(rng=Math.random){
    const weights=rarityWeights();
    let total=0;

    for(let rarity=1;rarity<=5;rarity++){
      total+=Number(weights[rarity]||0);
    }

    let roll=rng()*total;

    for(let rarity=1;rarity<=5;rarity++){
      roll-=Number(weights[rarity]||0);
      if(roll<0){
        return rarity;
      }
    }

    return 1;
  }

  function randomPartRarity(rng=Math.random){
    return randomRarity(rng);
  }

  function randomPart(rng=Math.random,usedSlots=new Set()){
    const candidates=Object.entries(PARTS).filter(
      ([,definition])=>
        definition &&
        definition.slot &&
        !usedSlots.has(definition.slot)
    );

    if(!candidates.length)return null;

    const [id,definition]=
      candidates[(rng()*candidates.length)|0];

    usedSlots.add(definition.slot);

    return normalizePart({
      id,
      slot:definition.slot,
      rarity:randomPartRarity(rng)
    });
  }

  function makePartItem(part){
    const normalized=normalizePart(part);
    if(!normalized)return null;

    const definition=PARTS[normalized.id];
    if(!definition)return null;

    return {
      name:definition.name,
      kind:"weaponPart",
      id:normalized.id,
      partId:normalized.id,
      rarity:Math.max(
        1,
        Math.min(5,Number(normalized.rarity||1))
      ),
      slots:1,
      gridW:1,
      gridH:1,
      weight:.5
    };
  }

  function randomStandalonePartItem(rng=Math.random){
    if(rng()>=STANDALONE_PART_DROP_CHANCE){
      return null;
    }

    return makePartItem(randomPart(rng,new Set()));
  }

  function populateRandomMods(w,rng=Math.random){
    if(
      !w ||
      w.kind!=="firearm" ||
      w.isBow ||
      Array.isArray(w.mods) && w.mods.length
    ){
      return w;
    }

    const mods=[];
    const usedSlots=new Set();

    if(rng()<GENERATED_PART_FIRST_CHANCE){
      const first=randomPart(rng,usedSlots);
      if(first)mods.push(first);

      if(
        first &&
        rng()<GENERATED_PART_SECOND_CHANCE
      ){
        const second=randomPart(rng,usedSlots);
        if(second)mods.push(second);
      }
    }

    w.mods=mods;

    if(mods.length){
      normalizeWeapon(w);
    }

    return w;
  }


  function base(){
    const g=G();
    if(!g?.save)return null;

    g.save.base=g.save.base||{};

    return g.save.base;
  }

  function normalizePart(x){
    if(typeof x==="string"){
      return {
        id:x,
        rarity:1
      };
    }

    if(!x?.id)return null;

    return {
      ...x,
      rarity:Math.max(
        1,
        Math.min(5,Number(x.rarity||1))
      )
    };
  }

  function rarityName(rarity){
    const i=Math.max(
      0,
      Math.min(
        RARITY_NAMES.length-1,
        Number(rarity||1)-1
      )
    );

    return RARITY_NAMES[i];
  }

  function rarityMultiplier(rarity){
    const i=Math.max(
      0,
      Math.min(
        RARITY_MULTIPLIERS.length-1,
        Number(rarity||1)-1
      )
    );

    return RARITY_MULTIPLIERS[i];
  }

  function definition(part){
    return PARTS[
      typeof part==="string"
        ?part
        :part?.id
    ];
  }

  function effectValue(part,key){
    const p=definition(part);
    if(!p)return 0;

    return Number(p[key]||0)*
      (
        key==="accuracy" ||
        key==="spread"
          ? rarityMultiplier(part?.rarity)
          : rarityMultiplier(part?.rarity)
      );
  }

  function normalizeWeapon(w){
    if(!w||w.kind!=="firearm")return;

    const g=G();

    g?.ensureWeaponProgression?.(w);

    w.mods=Array.isArray(w.mods)
      ?w.mods.map(normalizePart).filter(Boolean)
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

    for(const part of w.mods){
      const p=definition(part);
      if(!p)continue;

      const mult=rarityMultiplier(part.rarity);

      if(p.damage){
        damage=Math.max(
          1,
          Math.round(
            b.damage*(1+p.damage*mult)
          )
        );
      }

      if(p.range){
        w.range=Math.round(
          b.range*(1+p.range*mult)
        );
      }

      if(p.cooldown){
        w.cooldown=Math.max(
          .05,
          b.cooldown-p.cooldown*mult
        );
      }

      if(p.magazine){
        w.magSize=
          b.magSize+
          Math.max(
            1,
            Math.ceil(
              b.magSize*p.magazine*mult
            )
          );
      }
    }

    w.damage=
      g?.weaponProgressionDamage?.(w,damage) ??
      damage;
  }

  function accuracyBonus(w){
    let result=0;

    for(const part of w?.mods||[]){
      result+=effectValue(part,"accuracy");
    }

    return Math.min(.35,result);
  }

  function spreadReduction(w){
    let result=0;

    for(const part of w?.mods||[]){
      result+=effectValue(part,"spread");
    }

    return Math.min(.40,result);
  }

  window.EFRBaseParts={
    definitions:PARTS,
    rarityNames:RARITY_NAMES,
    rarityMultipliers:RARITY_MULTIPLIERS,
    rarityName,
    rarityMultiplier,
    normalizePart,
    normalizeWeapon,
    accuracyBonus,
    spreadReduction,
    rarityWeights,
    randomRarity,
    randomPartRarity,
    randomPart,
    makePartItem,
    randomStandalonePartItem,
    populateRandomMods
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

      for(const key of ["weapon1","weapon2"]){
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
