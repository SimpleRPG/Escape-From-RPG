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
      shooting: 0,
      generator: 0,
      communications: 0,
      defense: 0,
      armory: 0
    };

    Object.keys(defaults).forEach(k => {
      if (!Number.isFinite(Number(b.facilities[k]))) {
        b.facilities[k] = defaults[k];
      }
    });

    b.energy = Math.max(0, Math.min(10, Number(b.energy || 0)));
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
    generator: {
      name: '発電設備',
      max: 3,
      costs: { '鉄くず': 5, 'バッテリー': 2, 'ケーブル': 2 }
    },
    communications: {
      name: '通信設備',
      max: 3,
      costs: { '電子部品': 3, 'バッテリー': 1, 'ケーブル': 2 }
    },
    defense: {
      name: '防衛設備',
      max: 3,
      costs: { '鉄くず': 5, '木材': 3, 'ボルト': 3 }
    },
    armory: {
      name: '武器庫',
      max: 3,
      costs: { '高品質金属': 3, '木材': 2, 'ボルト': 4 }
    }
  };

  function getInventory() {
    const g = G();
    if (!g || !g.save) return null;

    const s = g.save;
    if (s.stash && typeof s.stash === 'object') return s.stash;
    if (s.inventory && typeof s.inventory === 'object') return s.inventory;

    return null;
  }

  function getCount(inv, name) {
    if (!inv) return 0;

    const value = inv[name];

    if (typeof value === 'number') return value;
    if (value && typeof value.count === 'number') return value.count;
    if (value && typeof value.qty === 'number') return value.qty;

    return 0;
  }

  function changeCount(inv, name, delta) {
    if (!inv) return false;

    if (typeof inv[name] === 'number') {
      inv[name] += delta;
      if (inv[name] <= 0) delete inv[name];
      return true;
    }

    if (inv[name] && typeof inv[name] === 'object') {
      if (typeof inv[name].count === 'number') {
        inv[name].count += delta;
        if (inv[name].count <= 0) delete inv[name];
        return true;
      }

      if (typeof inv[name].qty === 'number') {
        inv[name].qty += delta;
        if (inv[name].qty <= 0) delete inv[name];
        return true;
      }
    }

    if (delta > 0) {
      inv[name] = delta;
      return true;
    }

    return false;
  }

  function canPay(costs) {
    const inv = getInventory();
    if (!inv) return false;

    return Object.keys(costs).every(
      k => getCount(inv, k) >= Number(costs[k])
    );
  }

  function pay(costs) {
    const inv = getInventory();
    if (!inv || !canPay(costs)) return false;

    Object.keys(costs).forEach(k => changeCount(inv, k, -Number(costs[k])));
    return true;
  }

  function persist() {
    const g = G();
    if (!g) return;

    try {
      if (typeof g.persist === 'function') g.persist();
    } catch (_) {}

    try {
      if (typeof g.saveGame === 'function') g.saveGame();
    } catch (_) {}

    try {
      window.dispatchEvent(new CustomEvent('efr:base-updated'));
    } catch (_) {}
  }

  function facilityLevel(key) {
    const b = S();
    return b ? Number(b.facilities[key] || 0) : 0;
  }

  function upgrade(key) {
    const b = S();
    const f = FACILITIES[key];

    if (!b || !f) return { ok: false, reason: 'unknown_facility' };

    const current = facilityLevel(key);

    if (current >= f.max) {
      return { ok: false, reason: 'max_level', level: current };
    }

    const costs = {};
    Object.keys(f.costs).forEach(k => {
      costs[k] = f.costs[k] * Math.max(1, current);
    });

    if (!canPay(costs)) {
      return {
        ok: false,
        reason: 'materials',
        level: current,
        costs
      };
    }

    if (!pay(costs)) {
      return { ok: false, reason: 'materials', level: current, costs };
    }

    b.facilities[key] = current + 1;
    persist();

    return {
      ok: true,
      level: b.facilities[key],
      costs
    };
  }

  function charge() {
    const b = S();
    if (!b) return { ok: false };

    const generator = facilityLevel('generator');
    const maxEnergy = 10 + generator * 5;

    if (b.energy >= maxEnergy) {
      return { ok: false, reason: 'full', energy: b.energy, maxEnergy };
    }

    let gained = Math.max(1, generator);
    b.energy = Math.min(maxEnergy, b.energy + gained);
    persist();

    return { ok: true, energy: b.energy, maxEnergy };
  }

  function train() {
    const b = S();
    if (!b) return { ok: false };

    const shooting = facilityLevel('shooting');

    if (shooting <= 0) {
      return { ok: false, reason: 'shooting_required' };
    }

    if (b.energy < 1) {
      return { ok: false, reason: 'energy' };
    }

    b.energy -= 1;
    b.training += shooting;
    persist();

    return {
      ok: true,
      training: b.training,
      energy: b.energy
    };
  }

  function communications() {
    const b = S();
    if (!b) return { ok: false };

    const lv = facilityLevel('communications');

    if (lv <= 0) {
      return { ok: false, reason: 'communications_required' };
    }

    if (b.energy < 1) {
      return { ok: false, reason: 'energy' };
    }

    b.energy -= 1;
    b.intel += lv;
    persist();

    return {
      ok: true,
      intel: b.intel,
      energy: b.energy
    };
  }

  function storageCapacity() {
    const b = S();
    if (!b) return 24;

    return (
      24 +
      Math.max(0, Number(b.level || 1) - 1) * 4 +
      Math.max(0, facilityLevel('storage') - 1) * 10
    );
  }

  function hasFirearmName(name) {
    const n = String(name || '').toLowerCase();

    return [
      '銃',
      '拳銃',
      'ハンドガン',
      'ピストル',
      'ライフル',
      'ショットガン',
      'スナイパー',
      'マシンガン',
      'サブマシンガン',
      'smg',
      'ak',
      'ar',
      'mp',
      'rifle',
      'pistol',
      'shotgun',
      'sniper'
    ].some(x => n.includes(x));
  }

  function wrapExpansion() {
    const x = X();
    if (!x || x.__baseV3Wrapped) return;

    x.__baseV3Wrapped = true;

    if (typeof x.craft === 'function') {
      const originalCraft = x.craft;

      x.craft = function (name) {
        if (hasFirearmName(name) && facilityLevel('armory') < 1) {
          return {
            ok: false,
            reason: 'armory_required',
            facility: 'armory'
          };
        }

        if (
          String(name || '').includes('医療') &&
          facilityLevel('medical') < 1
        ) {
          return {
            ok: false,
            reason: 'medical_required',
            facility: 'medical'
          };
        }

        if (facilityLevel('workbench') < 1) {
          return {
            ok: false,
            reason: 'workbench_required',
            facility: 'workbench'
          };
        }

        return originalCraft.apply(this, arguments);
      };
    }

    if (typeof x.repair === 'function') {
      const originalRepair = x.repair;

      x.repair = function () {
        if (facilityLevel('workshop') < 2) {
          return {
            ok: false,
            reason: 'workshop_level_required',
            required: 2
          };
        }

        return originalRepair.apply(this, arguments);
      };
    }

    if (typeof x.upgrade === 'function') {
      const originalUpgrade = x.upgrade;

      x.upgrade = function () {
        if (facilityLevel('workshop') < 2) {
          return {
            ok: false,
            reason: 'workshop_level_required',
            required: 2
          };
        }

        return originalUpgrade.apply(this, arguments);
      };
    }
  }

  function renderPanel() {
    const b = S();
    if (!b) return '';

    const rows = Object.keys(FACILITIES).map(key => {
      const f = FACILITIES[key];
      const lv = facilityLevel(key);
      const disabled = lv >= f.max ? 'disabled' : '';

      return `
        <div class="efr-base-v3-row">
          <span>${f.name} Lv.${lv}/${f.max}</span>
          <button data-efr-base-upgrade="${key}" ${disabled}>
            ${lv >= f.max ? '最大' : '強化'}
          </button>
        </div>
      `;
    }).join('');

    const generator = facilityLevel('generator');
    const maxEnergy = 10 + generator * 5;

    return `
      <section class="efr-base-v3-panel">
        <h3>統合拠点設備</h3>

        <div class="efr-base-v3-status">
          <span>電力 ${b.energy}/${maxEnergy}</span>
          <span>訓練値 ${b.training}</span>
          <span>情報値 ${b.intel}</span>
        </div>

        <div class="efr-base-v3-actions">
          <button data-efr-base-action="charge">発電</button>
          <button data-efr-base-action="train">射撃訓練</button>
          <button data-efr-base-action="comms">通信・情報収集</button>
        </div>

        <div class="efr-base-v3-facilities">
          ${rows}
        </div>
      </section>
    `;
  }

  function attachHandlers(root) {
    if (!root || root.__efrBaseV3Handlers) return;

    root.__efrBaseV3Handlers = true;

    root.addEventListener('click', function (event) {
      const upgradeButton =
        event.target.closest('[data-efr-base-upgrade]');

      if (upgradeButton) {
        const key = upgradeButton.getAttribute('data-efr-base-upgrade');
        const result = upgrade(key);

        if (!result.ok) {
          if (result.reason === 'materials') {
            alert('強化素材が足りません。');
          } else if (result.reason === 'max_level') {
            alert('この設備は最大レベルです。');
          } else {
            alert('設備を強化できません。');
          }
        }

        renderIntoHub();
        return;
      }

      const action =
        event.target.closest('[data-efr-base-action]');

      if (!action) return;

      const type = action.getAttribute('data-efr-base-action');
      let result;

      if (type === 'charge') result = charge();
      if (type === 'train') result = train();
      if (type === 'comms') result = communications();

      if (!result || !result.ok) {
        const reason = result && result.reason;

        if (reason === 'energy') {
          alert('電力が足りません。発電してください。');
        } else if (reason === 'shooting_required') {
          alert('射撃訓練場を建設してください。');
        } else if (reason === 'communications_required') {
          alert('通信設備を建設してください。');
        } else if (reason === 'full') {
          alert('電力は満タンです。');
        }
      }

      renderIntoHub();
    });
  }

  function renderIntoHub() {
    const hub = document.querySelector(
      '.efr-hub, #efr-hub, [data-efr-hub]'
    );

    if (!hub) return;

    const tab =
      hub.querySelector('.active[data-tab="base"]') ||
      hub.querySelector('.active[data-tab="baseupgrade"]') ||
      hub.querySelector('[data-tab="base"]');

    const target = tab || hub;

    let panel = hub.querySelector('.efr-base-v3-panel');

    if (!panel) {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = renderPanel();
      panel = wrapper.firstElementChild;

      if (panel) {
        target.appendChild(panel);
      }
    } else {
      panel.outerHTML = renderPanel();
    }

    attachHandlers(hub);
  }

  function patchHub() {
    const hub = window.EFRHub;

    if (!hub || hub.__baseV3Wrapped) return;

    hub.__baseV3Wrapped = true;

    if (typeof hub.render === 'function') {
      const originalRender = hub.render;

      hub.render = function () {
        const result = originalRender.apply(this, arguments);

        setTimeout(renderIntoHub, 0);

        return result;
      };
    }
  }

  function boot() {
    S();
    wrapExpansion();
    patchHub();

    if (G()) {
      G().baseStorageCapacity = storageCapacity;
    }

    window.EFRBaseV3 = {
      facilities: FACILITIES,
      state: S,
      facilityLevel,
      upgrade,
      charge,
      train,
      communications,
      storageCapacity,
      render: renderIntoHub
    };

    setTimeout(renderIntoHub, 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();


/* EFR BASE LEGACY MIGRATION V4 */
(function(){
  'use strict';

  function migrate(){
    const g=window.EFRGame;
    const b=g?.save?.base;

    if(!b)return;

    b.facilities=b.facilities||{};

    if(b.stations && b.stations!==b.facilities){
      for(const [key,value] of Object.entries(b.stations)){
        if(Number.isFinite(Number(value)) &&
           !Number.isFinite(Number(b.facilities[key]))){
          b.facilities[key]=Number(value);
        }
      }
    }

    if(!Number.isFinite(Number(b.energy))){
      b.energy=Math.max(
        0,
        Number(b.fuel||0)
      );
    }

    b.weaponParts=
      Array.isArray(b.weaponParts)
        ? b.weaponParts
        : [];

    if(Array.isArray(b.parts)){
      for(const part of b.parts){
        if(
          typeof part==="string" &&
          !b.weaponParts.includes(part)
        ){
          b.weaponParts.push(part);
        }
      }
    }

    b.training=Math.max(
      0,
      Number(b.training||0)
    );

    b.intel=Math.max(
      0,
      Number(b.intel||0)
    );

    try{
      g.persist?.();
    }catch(_){}
  }

  if(window.EFRGame){
    migrate();
  }else{
    setTimeout(migrate,250);
  }
})();


/* EFR BASE WEAPON PARTS V4 */
(function(){
  'use strict';

  const G=()=>window.EFRGame;

  const PARTS={
    optic:{
      name:"光学サイト",
      slot:"optic",
      cost:{
        "ガラス":2,
        "電子部品":1,
        "高品質金属":1
      },
      accuracy:.08
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


/* EFR BASE ENERGY FIX V4 */
(function(){
  'use strict';

  function boot(){
    const g=window.EFRGame;
    const api=window.EFRBaseV3;

    if(!g?.save?.base||!api){
      setTimeout(boot,200);
      return;
    }

    const b=g.save.base;

    function maxEnergy(){
      return 10+
        Number(
          b.facilities?.generator||0
        )*5;
    }

    const original=api.charge;

    api.charge=function(){
      const max=maxEnergy();

      b.energy=Math.max(
        0,
        Math.min(
          max,
          Number(b.energy||0)
        )
      );

      if(b.energy>=max){
        return {
          ok:false,
          reason:"full",
          energy:b.energy,
          maxEnergy:max
        };
      }

      const gained=Math.max(
        1,
        Number(
          b.facilities?.generator||0
        )
      );

      b.energy=Math.min(
        max,
        b.energy+gained
      );

      g.persist?.();

      return {
        ok:true,
        energy:b.energy,
        maxEnergy:max
      };
    };

    window.EFRBaseEnergy={
      maxEnergy
    };
  }

  boot();
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
