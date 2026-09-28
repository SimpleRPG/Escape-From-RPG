(function(){
  "use strict";

  let active=false;
  let snapshot=null;
  let panel=null;

  function G(){
    return window.EFRGame;
  }

  function clone(value){
    return value==null
      ? value
      : JSON.parse(JSON.stringify(value));
  }

  function isActive(){
    return active;
  }

  function findTargetPosition(){
    const g=G();
    const p=g.player;

    for(let x=100;x<=520;x+=20){
      const dummy={
        x,
        y:p.y,
        r:18,
        dead:false
      };

      if(g.playerCanSeeEnemy?.(dummy)){
        return {x,y:p.y};
      }
    }

    return {
      x:p.x+100,
      y:p.y
    };
  }

  function createDummy(){
    const g=G();
    const pos=findTargetPosition();

    return {
      id:"training-dummy",
      name:"訓練用標的",
      role:"trainer",
      visualType:"human",
      x:pos.x,
      y:pos.y,
      r:18,
      hp:999999,
      maxHp:999999,
      dead:false,
      trainingDummy:true,
      loot:[]
    };
  }

  function restoreSnapshot(){
    const g=G();
    if(!g||!snapshot)return;

    Object.assign(
      g.player,
      clone(snapshot.player)
    );

    g.save.equipment=clone(snapshot.equipment);
    g.save.stash=clone(snapshot.stash);

    snapshot=null;
  }

  function close(){
    if(!active)return;

    active=false;

    restoreSnapshot();

    g()?.stopTrainingRuntime?.();

    panel?.remove();
    panel=null;
  }

  function g(){
    return G();
  }

  function update(){
    if(!active||!panel)return;

    const g=G();
    const p=g?.player;
    if(!g||!p)return;

    const weapon=g.equippedWeapon?.();
    const staff=
      window.EFRMagic?.activeStaff?.();

    panel.innerHTML=`
      <div style="
        position:absolute;
        left:50%;
        top:16px;
        transform:translateX(-50%);
        z-index:20;
        width:min(92vw,620px);
        padding:16px;
        border:1px solid rgba(255,255,255,.18);
        border-radius:14px;
        background:rgba(16,18,22,.94);
        color:#fff;
        box-sizing:border-box;
      ">
        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:12px;
        ">
          <div>
            <strong style="font-size:20px">訓練場</strong>
            <div style="opacity:.75;margin-top:4px">
              近接・銃器・弓・魔法を無消費で試せます
            </div>
          </div>
          <button data-training-close>閉じる</button>
        </div>

        <div style="
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          margin-top:14px;
        ">
          <span>武器: ${String(weapon?.name||"素手")}</span>
          <span>HP: ${Math.round(p.hp||0)}/${Math.round(p.maxHp||0)}</span>
          <span>MP: ${Math.round(p.mp||0)}/${Math.round(p.maxMP||0)}</span>
        </div>

        <div style="
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          margin-top:14px;
        ">
          <button data-training-action="attack">近接攻撃</button>
          <button data-training-action="fire">
            ${weapon?.kind==="firearm" ? "射撃" : weapon?.kind==="bow" ? "弓を試す" : "現在の武器を試す"}
          </button>
          ${
            staff?.spells?.length
              ? staff.spells.map((spell,index)=>`
                  <button data-training-magic="${index}">
                    ${String(spell.name)} (${spell.cost}MP)
                  </button>
                `).join("")
              : ""
          }
        </div>

        <div style="
          margin-top:12px;
          font-size:13px;
          opacity:.7;
        ">
          武器耐久・弾薬・MPは消費されません。XP・戦利品・通常の敵撃破も発生しません。
        </div>
      </div>
    `;

    panel.querySelector("[data-training-close]")
      ?.addEventListener("click",close);

    panel.querySelectorAll("[data-training-action]")
      .forEach(button=>{
        button.addEventListener("click",()=>{
          const action=button.dataset.trainingAction;

          if(action==="fire"){
            if(
              window.EFRExpansion?.fire
            ){
              window.EFRExpansion.fire();
            }else{
              g.attack?.();
            }
          }else{
            g.attack?.();
          }
        });
      });

    panel.querySelectorAll("[data-training-magic]")
      .forEach(button=>{
        button.addEventListener("click",()=>{
          window.EFRMagic?.castSpell?.(
            Number(button.dataset.trainingMagic)
          );
        });
      });
  }

  function open(){
    if(active)return;

    const g=G();
    if(!g)return;

    snapshot={
      player:clone(g.player),
      equipment:clone(g.save.equipment),
      stash:clone(g.save.stash)
    };

    active=true;

    g.start();

    g.enemies.splice(
      0,
      g.enemies.length,
      createDummy()
    );

    panel=document.createElement("section");
    panel.id="efrTrainingPanel";
    panel.style.position="fixed";
    panel.style.inset="0";
    panel.style.pointerEvents="none";
    panel.style.zIndex="100";

    panel.addEventListener("click",event=>{
      if(event.target.closest("button")){
        event.target.closest("button").style.pointerEvents="auto";
      }
    });

    document.body.appendChild(panel);

    panel.querySelectorAll("button")
      .forEach(button=>{
        button.style.pointerEvents="auto";
      });

    update();
  }

  window.EFRTraining={
    open,
    close,
    update,
    isActive
  };
})();
