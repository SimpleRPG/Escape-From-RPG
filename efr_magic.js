(() => {
  "use strict";

  const G=()=>window.EFRGame;

  const CLASS={
    melee:{name:"Melee / 近接",desc:"近接戦闘に特化"},
    gunner:{name:"Gunner / 銃器",desc:"銃器運用に特化"},
    rogue:{name:"Rogue / ローグ",desc:"機動・探索に特化"},
    mage:{name:"Mage / 魔法",desc:"魔法運用に特化"},
    support:{name:"Support / 支援",desc:"回復・支援に特化"}
  };

  const SPELLS=[
    {id:"fire",name:"ファイア",cost:18,cast:1.0,power:34,kind:"attack"},
    {id:"ice",name:"アイス",cost:22,cast:1.25,power:28,kind:"attack"},
    {id:"lightning",name:"ライトニング",cost:30,cast:1.7,power:52,kind:"attack"},
    {id:"heal",name:"ヒール",cost:16,cast:.9,power:28,kind:"heal"},
    {id:"guard",name:"ガード",cost:20,cast:1.1,power:0,kind:"support"},
    {id:"haste",name:"ヘイスト",cost:14,cast:.8,power:0,kind:"support"}
  ];

  const MP_ITEMS=[
    {name:"魔力回復薬",kind:"mpRestore",value:35,slots:1,weight:.5},
    {name:"大魔力回復薬",kind:"mpRestore",value:70,slots:2,weight:.8}
  ];

  function clone(x){
    return x ? JSON.parse(JSON.stringify(x)) : x;
  }

  function ensureState(){
    const g=G();
    if(!g)return;

    g.save.player=g.save.player || {
      level:1,
      xp:0,
      classId:"melee"
    };

    if(!CLASS[g.save.player.classId]){
      g.save.player.classId="melee";
    }

    const p=g.player;

    p.maxHp=p.maxHp || 100;
    p.maxMP=p.maxMP || 100;

    if(typeof p.mp!=="number"){
      p.mp=p.maxMP;
    }

    p.mp=Math.max(0,Math.min(p.maxMP,p.mp));
  }

  function randomSpells(){
    const pool=SPELLS.slice();

    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [pool[i],pool[j]]=[pool[j],pool[i]];
    }

    const count=1+Math.floor(Math.random()*3);

    return pool.slice(0,count).map(clone);
  }

  function makeStaff(){
    return {
      name:"魔法の杖",
      kind:"weapon",
      slotType:"weapon",
      magicStaff:true,
      damage:24,
      range:330,
      cooldown:1.2,
      durability:90,
      maxDurability:90,
      weight:2,
      slots:2,
      spells:randomSpells()
    };
  }

  function ensureStaff(staff){
    if(
      staff?.magicStaff &&
      (!Array.isArray(staff.spells) ||
       staff.spells.length<1 ||
       staff.spells.length>3)
    ){
      staff.spells=randomSpells();
    }

    return staff;
  }

  function activeStaff(){
    const g=G();

    if(!g)return null;

    const staff=
      g.save.equipment["weapon"+g.activeWeaponSlot];

    return staff?.magicStaff
      ? ensureStaff(staff)
      : null;
  }

  function nearestTarget(range){
    const g=G();
    const p=g.player;

    let best=null;
    let bestDistance=Infinity;

    for(const enemy of g.enemies){
      if(enemy.dead)continue;

      const d=Math.hypot(
        enemy.x-p.x,
        enemy.y-p.y
      );

      if(
        d<=range+(enemy.r||15) &&
        d<bestDistance &&
        g.playerCanSeeEnemy(enemy)
      ){
        best=enemy;
        bestDistance=d;
      }
    }

    return best;
  }

  function spendMP(cost){
    const g=G();

    if(g.playerMP<cost){
      g.logMessage("MPが不足しています");
      return false;
    }

    g.playerMP-=cost;

    return true;
  }

  function useSpell(staff,spell){
    const g=G();
    const p=g.player;

    if(!g.running || p.casting)return;

    if(!spendMP(spell.cost))return;

    p.casting=true;

    const started=performance.now();
    const duration=spell.cast*1000;

    const bar=document.getElementById("efrCastBar");
    const fill=document.getElementById("efrCastProgress");
    const label=document.getElementById("efrCastSpell");

    if(bar)bar.classList.remove("hidden");
    if(label)label.textContent=spell.name;

    const tick=()=>{
      if(!g.running){
        p.casting=false;
        return;
      }

      const ratio=Math.min(
        1,
        (performance.now()-started)/duration
      );

      if(fill){
        fill.style.width=(ratio*100)+"%";
      }

      if(ratio<1){
        requestAnimationFrame(tick);
        return;
      }

      p.casting=false;

      const target=nearestTarget(
        staff.range||330
      );

      if(spell.kind==="heal"){

        p.hp=Math.min(
          p.maxHp||100,
          p.hp+spell.power
        );

      }else if(spell.kind==="support"){

        if(spell.id==="haste"){
          p.hasteTimer=8;
        }

        if(spell.id==="guard"){
          p.guardTimer=6;
        }

      }else if(target){

        target.hp-=spell.power;

        if(target.hp<=0){
          target.dead=true;

          target.loot=[
            {
              type:"敵の戦利品",
              kind:"loot",
              slots:1
            }
          ];
        }
      }

      if(fill){
        fill.style.width="0%";
      }

      g.renderInventory?.();
      render();
    };

    requestAnimationFrame(tick);

    render();
  }

  function castSpell(index){
    ensureState();

    const g=G();
    const staff=activeStaff();

    if(!staff){
      g.logMessage("魔法の杖を装備してください");
      return;
    }

    const spell=staff.spells?.[index];

    if(!spell){
      g.logMessage("その魔法はありません");
      return;
    }

    useSpell(staff,spell);
  }

  function useMpItem(index){
    const g=G();
    const item=g.player.loot[index];

    if(!item || item.kind!=="mpRestore"){
      return false;
    }

    if(g.playerMP>=g.playerMaxMP){
      g.logMessage("MPは満タンです");
      return false;
    }

    g.playerMP=Math.min(
      g.playerMaxMP,
      g.playerMP+(item.value||0)
    );

    g.player.loot.splice(index,1);

    g.renderInventory?.();
    render();

    return true;
  }

  function updateHud(){

    const g=G();

    if(!g)return;

    const mp=document.getElementById("efrMp");
    const cls=document.getElementById("efrClass");
    const lv=document.getElementById("efrLevel");

    if(mp){
      mp.textContent=
        Math.round(g.playerMP)+
        "/"+
        Math.round(g.playerMaxMP);
    }

    if(cls){
      cls.textContent=
        CLASS[g.save.player?.classId]?.name ||
        "Melee / 近接";
    }

    if(lv){
      lv.textContent=
        g.save.player?.level || 1;
    }

    const bar=document.getElementById("efrCastBar");

    if(bar){
      bar.classList.toggle(
        "hidden",
        !g.player.casting
      );
    }

    const spells=document.getElementById(
      "efrSpellButtons"
    );

    const staff=activeStaff();

    if(spells){

      if(!staff){
        spells.innerHTML=
          "<span>杖を装備すると魔法を使用できます</span>";
      }else{

        spells.innerHTML=
          staff.spells.map((spell,index)=>
            '<button class="efrSpellButton" '+
            'data-spell-index="'+index+'" '+
            (g.player.casting ? "disabled":"")+
            '>'+
            spell.name+
            ' '+
            spell.cost+
            'MP / '+
            spell.cast+
            '秒'+
            '</button>'
          ).join("");

      }
    }

    const baseClass=
      document.getElementById(
        "efrBaseClass"
      );

    if(baseClass){
      baseClass.textContent=
        CLASS[g.save.player?.classId]?.name ||
        "Melee / 近接";
    }
  }

  function renderClassPanel(){

    const g=G();

    document
      .querySelectorAll(".efrClassCard")
      .forEach(card=>{
        card.classList.toggle(
          "active",
          card.dataset.class===
          g.save.player.classId
        );
      });
  }

  function render(){

    ensureState();
    updateHud();
    renderClassPanel();

    const spell=
      document.getElementById(
        "efrCastSpell"
      );

    if(
      spell &&
      G().player.casting
    ){
      const staff=activeStaff();

      spell.textContent=
        staff?.spells?.[0]?.name ||
        "詠唱中";
    }
  }

  function openClassPanel(){
    document
      .getElementById("efrClassPanel")
      ?.classList.remove("hidden");

    renderClassPanel();
  }

  function closeClassPanel(){
    document
      .getElementById("efrClassPanel")
      ?.classList.add("hidden");
  }

  function setup(){

    ensureState();

    if(!document.getElementById("efrMagicHud")){

      const raid=
        document.getElementById("raidPanel");

      const hud=
        document.createElement("div");

      hud.id="efrMagicHud";
      hud.className="efrMagicHud";

      hud.innerHTML=
        '<span>Lv <strong id="efrLevel">1</strong></span>'+
        '<span>Class <strong id="efrClass"></strong></span>'+
        '<span>MP <strong id="efrMp"></strong></span>'+
        '<button id="efrClassBtn">クラス</button>'+
        '<div id="efrSpellButtons" class="efrSpellButtons"></div>';

      raid.insertBefore(
        hud,
        raid.querySelector("canvas")
      );

      hud.addEventListener(
        "click",
        event=>{
          const btn=
            event.target.closest(
              "[data-spell-index]"
            );

          if(!btn)return;

          castSpell(
            Number(btn.dataset.spellIndex)
          );
        }
      );

      const bar=
        document.createElement("div");

      bar.id="efrCastBar";
      bar.className="efrCastBar hidden";

      bar.innerHTML=
        "<strong>詠唱中</strong>"+
        "<div id='efrCastSpell'></div>"+
        "<div class='efrCastProgress'>"+
        "<i id='efrCastProgress'></i>"+
        "</div>";

      raid.style.position="relative";

      raid.insertBefore(
        bar,
        raid.firstChild
      );
    }

    if(!document.getElementById("efrClassPanel")){

      const cp=
        document.createElement("div");

      cp.id="efrClassPanel";
      cp.className=
        "efrClassPanel hidden";

      cp.innerHTML=
        '<div class="efrClassWindow">'+
        '<h2>クラス選択</h2>'+
        '<p>5クラスから選択できます。</p>'+
        '<div id="efrClassGrid" class="efrClassGrid"></div>'+
        '<button id="efrClassClose">閉じる</button>'+
        '</div>';

      document.body.appendChild(cp);

      const grid=
        cp.querySelector(
          "#efrClassGrid"
        );

      grid.innerHTML=
        Object.entries(CLASS)
        .map(([id,c])=>
          '<button class="efrClassCard" '+
          'data-class="'+id+'">'+
          '<strong>'+c.name+'</strong>'+
          '<br><small>'+c.desc+
          '</small></button>'
        )
        .join("");

      grid.addEventListener(
        "click",
        event=>{
          const btn=
            event.target.closest(
              "[data-class]"
            );

          if(!btn)return;

          G().save.player.classId=
            btn.dataset.class;

          G().persist();

          render();
        }
      );

      cp.querySelector(
        "#efrClassClose"
      ).onclick=closeClassPanel;
    }

    const classBtn=
      document.getElementById(
        "efrClassBtn"
      );

    if(classBtn){
      classBtn.onclick=openClassPanel;
    }

    const basePanel=
      document.getElementById(
        "basePanel"
      );

    if(
      basePanel &&
      !document.getElementById(
        "efrBaseClassButton"
      )
    ){

      const wrap=
        document.createElement("div");

      wrap.className="efrBaseClassBox";

      wrap.innerHTML=
        '<strong>クラス</strong> '+
        '<span id="efrBaseClass">Melee / 近接</span> '+
        '<button id="efrBaseClassButton">変更</button>';

      basePanel.appendChild(wrap);

      document.getElementById(
        "efrBaseClassButton"
      ).onclick=openClassPanel;
    }

    setInterval(
      render,
      300
    );
  }

  window.EFRMagic={
    CLASS,
    SPELLS,
    MP_ITEMS,
    randomSpells,
    makeStaff,
    ensureStaff,
    castSpell,
    useMpItem,
    render
  };

  setup();
  render();

})();
