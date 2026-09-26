/* EFR Base / Hideout / Materials / Weapon Parts system v2 */
(() => {
  "use strict";
  const G=()=>window.EFRGame;
  const defs={
    stash:{n:"保管庫",max:5,req:l=>({"木材":l*2,"鉄くず":l*2,"ボルト":l,"ネジ":l})},
    workbench:{n:"作業台",max:4,req:l=>({"鉄くず":l*2,"ネジ":l*2,"ボルト":l,"電子部品":l})},
    medical:{n:"医療室",max:4,req:l=>({"布":l*2,"医療素材":l*2,"ガラス":l})},
    shooting:{n:"射撃場",max:3,req:l=>({"木材":l*2,"鉄くず":l*2,"ボルト":l})},
    generator:{n:"発電機",max:3,req:l=>({"鉄くず":l*2,"バッテリー":l,"ケーブル":l})},
    workshop:{n:"工房",max:3,req:l=>({"鉄くず":l*2,"高品質金属":l,"電子部品":l})},
    communications:{n:"通信室",max:3,req:l=>({"電子部品":l*2,"バッテリー":l,"ケーブル":l})},
    defense:{n:"防衛設備",max:3,req:l=>({"鉄くず":l*3,"木材":l*2,"ボルト":l*2})},
    armory:{n:"武器庫",max:3,req:l=>({"高品質金属":l,"木材":l*2,"ボルト":l*2})}
  };
  const parts={
    optic:{n:"光学サイト",s:"optic",r:{"ガラス":2,"電子部品":1,"高品質金属":1},e:"静止精度を改善"},
    barrel:{n:"精密バレル",s:"barrel",r:{"鉄くず":2,"高品質金属":2,"ボルト":1},e:"射程+12%、威力+6%"},
    stock:{n:"安定ストック",s:"stock",r:{"木材":2,"革":1,"高品質金属":1},e:"移動時の精度低下を軽減"},
    grip:{n:"グリップ",s:"grip",r:{"革":1,"接着剤":1,"プラスチック":1},e:"収束速度と連射間隔を改善"},
    magazine:{n:"拡張マガジン",s:"magazine",r:{"鉄くず":2,"ネジ":2,"プラスチック":1},e:"装弾数+25%"},
    muzzle:{n:"制退器",s:"muzzle",r:{"鉄くず":2,"高品質金属":1,"接着剤":1},e:"射撃散布を軽減"}
  };
  const process={
    "加工金属":{"鉄くず":3,"高品質金属":1},
    "回路基板":{"電子部品":2,"ガラス":1,"プラスチック":1},
    "医療キット素材":{"医療素材":2,"布":2,"プラスチック":1}
  };
  function st(){
    const g=G();if(!g)return null;
    const b=g.save.base||(g.save.base={stations:{},fuel:0,parts:[],training:0});
    b.stations=b.stations||{};for(const k in defs)b.stations[k]=Number(b.stations[k]||0);
    if(!b.stations.stash)b.stations.stash=1;
    b.parts=Array.isArray(b.parts)?b.parts:[];b.fuel=Number(b.fuel||0);b.training=Number(b.training||0);return b;
  }
  const save=()=>G()?.persist?.();
  const stash=()=>G()?.save?.stash||[];
  const lv=k=>st().stations[k]||0;
  const cnt=n=>stash().reduce((a,x)=>a+(x===n?1:(x?.name===n?(x.amount||1):0)),0);
  function take(n,c){let q=c,s=stash();for(let i=s.length-1;i>=0&&q;i--){let x=s[i];if(x===n){s.splice(i,1);q--}else if(x?.name===n){let z=Math.min(q,x.amount||1);x.amount=(x.amount||1)-z;q-=z;if(x.amount<=0)s.splice(i,1)}}return q===0}
  const enough=r=>Object.entries(r).every(([k,v])=>cnt(k)>=v);
  function pay(r){if(!enough(r))return false;for(const [k,v] of Object.entries(r))if(!take(k,v))return false;return true}
  const fmt=r=>Object.entries(r).map(([k,v])=>k+"×"+v).join(" / ");
  const cap=()=>20+(lv("stash")-1)*8;
  function upgrade(k){
    const g=G(),d=defs[k],n=lv(k)+1;if(!g||!d||n>d.max)return;
    const r=d.req(n);if(!pay(r)){g.logMessage?.("必要素材: "+fmt(r));return}
    st().stations[k]=n;save();render()
  }
  function craftPart(id){
    const g=G(),p=parts[id];if(lv("workbench")<1){g.logMessage?.("作業台Lv1が必要です");return}
    if(id==="muzzle"&&lv("workshop")<1){g.logMessage?.("工房Lv1が必要です");return}
    if(!pay(p.r)){g.logMessage?.("部品素材が不足しています");return}
    st().parts.push(id);save();render()
  }
  function attach(id){
    const g=G(),w=g?.save?.equipment?.["weapon"+(g.activeWeaponSlot||1)];
    if(!w||w.kind!=="firearm"){g?.logMessage?.("銃器を選択してください");return}
    const i=st().parts.indexOf(id);if(i<0){g.logMessage?.("部品を先に製作してください");return}
    w.mods=Array.isArray(w.mods)?w.mods:[];
    const old=w.mods.findIndex(x=>parts[x]?.s===parts[id].s);if(old>=0)w.mods.splice(old,1);
    w.mods.push(id);st().parts.splice(i,1);save();g.renderInventory?.();render()
  }
  function processItem(n){
    const g=G(),r=process[n];if(lv("workshop")<1){g.logMessage?.("工房Lv1が必要です");return}
    if(!pay(r)){g.logMessage?.("加工素材が不足しています");return}
    st().parts.push("processed:"+n);save();render()
  }
  function train(){
    const g=G();if(lv("shooting")<1||lv("generator")<1){g.logMessage?.("射撃場Lv1と発電機Lv1が必要です");return}
    st().training++;save();g.logMessage?.("射撃訓練完了");render()
  }
  function charge(){
    const g=G();if(lv("generator")<1||cnt("バッテリー")<1){g.logMessage?.("発電機Lv1とバッテリーが必要です");return}
    take("バッテリー",1);st().fuel=Math.min(10,st().fuel+1);save();render()
  }
  function comms(){
    const g=G();if(lv("communications")<1||st().fuel<1){g.logMessage?.("通信室Lv1と電力1が必要です");return}
    st().fuel--;save();g.logMessage?.("通信解析完了");render()
  }
  function normalizeWeapon(w){
    if(!w)return;
    w.mods=Array.isArray(w.mods)?w.mods:[];
    if(!w._baseStats)w._baseStats={damage:w.damage,range:w.range,cooldown:w.cooldown,magSize:w.magSize};
    const b=w._baseStats;w.damage=b.damage;w.range=b.range;w.cooldown=b.cooldown;w.magSize=b.magSize;
    for(const id of w.mods){
      if(id==="barrel"){w.damage=Math.round(w.damage*1.06);w.range=Math.round(w.range*1.12)}
      if(id==="magazine")w.magSize+=Math.max(3,Math.ceil(b.magSize*.25));
      if(id==="grip")w.cooldown=Math.max(.05,w.cooldown-.015);
    }
  }
  function build(){
    const base=document.getElementById("basePanel");if(!base||document.getElementById("efrBasePanel"))return;
    const p=document.createElement("section");p.id="efrBasePanel";p.className="efrBasePanel";
    p.innerHTML="<div class='efrBaseHead'><div><h2>拠点施設</h2><small>レイド → 素材 → 拠点 → 改造 → 次のレイド</small></div><div><b id='efrCap'></b> <b id='efrFuel'></b></div></div><div id='efrStations' class='efrGrid'></div><h3>武器部品</h3><div id='efrParts' class='efrGrid'></div><h3>素材加工</h3><div id='efrProcess' class='efrGrid'></div><h3>施設機能</h3><div id='efrActions' class='efrActions'></div>";
    base.appendChild(p)
  }
  function render(){
    build();const b=st();if(!b)return;
    document.getElementById("efrCap").textContent="保管 "+stash().length+"/"+cap();
    document.getElementById("efrFuel").textContent="電力 "+b.fuel;
    document.getElementById("efrStations").innerHTML=Object.entries(defs).map(([k,d])=>{const n=lv(k),x=n+1;const info=k==="stash"?"保管容量 "+cap():k==="workbench"?"武器部品・改造":k==="shooting"?"精度訓練":k==="generator"?"電力供給":k==="workshop"?"素材加工":k==="medical"?"医療機能":k==="communications"?"探索情報":k==="defense"?"基地防御":"武器保管";return "<div class='efrCard'><strong>"+d.n+" Lv."+n+"/"+d.max+"</strong><small>"+info+"</small>"+(n<d.max?"<button data-build='"+k+"'>Lv."+x+"へ<br><small>"+fmt(d.req(x))+"</small></button>":"<em>最大</em>")+"</div>"}).join("");
    document.getElementById("efrParts").innerHTML=Object.entries(parts).map(([id,p])=>"<div class='efrCard'><strong>"+p.n+"</strong><small>"+p.e+"</small><button data-part='"+id+"' "+(lv("workbench")<1?"disabled":"")+">製作<br><small>"+fmt(p.r)+"</small></button><button data-attach='"+id+"'>装着</button></div>").join("");
    document.getElementById("efrProcess").innerHTML=Object.entries(process).map(([n,r])=>"<div class='efrCard'><strong>"+n+"</strong><small>"+fmt(r)+"</small><button data-process='"+n+"' "+(lv("workshop")<1?"disabled":"")+">加工</button></div>").join("");
    document.getElementById("efrActions").innerHTML="<button data-action='train'>射撃訓練</button><button data-action='charge'>バッテリー→電力</button><button data-action='comms'>通信解析</button>";
  }
  function bind(){
    document.addEventListener("click",e=>{
      const b=e.target.closest("[data-build]"),p=e.target.closest("[data-part]"),a=e.target.closest("[data-attach]"),q=e.target.closest("[data-process]"),x=e.target.closest("[data-action]");
      if(b)upgrade(b.dataset.build);else if(p)craftPart(p.dataset.part);else if(a)attach(a.dataset.attach);else if(q)processItem(q.dataset.process);else if(x)({train,charge,comms}[x.dataset.action])()
    })
  }
  function boot(){if(!G())return setTimeout(boot,100);st();build();render();bind();setInterval(()=>{normalizeWeapon(G()?.equippedWeapon?.())},250)}
  window.EFRBase={state:st,stations:defs,parts,process,upgradeStation:upgrade,buildPart:craftPart,attachPart:attach,process:processItem,train,refuel:charge,intel:comms,stashCapacity:cap};
  boot()
})();