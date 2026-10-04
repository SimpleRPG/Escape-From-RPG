#!/data/data/com.termux/files/usr/bin/bash
set -eu
cd ~/Escape-From-RPG

git pull --ff-only origin main
test "$(git branch --show-current)" = "main"

python - <<'PY'
from pathlib import Path
import shutil

D=Path('EFR_GAME_DESIGN.md'); P=Path('efr_pet.js'); R=Path('efr_pet_renderer.js')
SRC=Path.home()/'storage/downloads/hound_animations_64x64_v2.png'
DST=Path('assets/pets/png/hound_animations_64x64.png')
for f in (D,P,R):
    if not f.exists(): raise SystemExit('STOP:required-file-missing:'+str(f))
if not SRC.exists(): raise SystemExit('STOP:put-hound_animations_64x64_v2.png-in-Download')
DST.parent.mkdir(parents=True,exist_ok=True); shutil.copyfile(SRC,DST)

d=D.read_text(encoding='utf-8'); p=P.read_text(encoding='utf-8'); r=R.read_text(encoding='utf-8')

# Design: tolerate the partial first attempt; never duplicate the hound section.
if '### 猟犬の正式64×64ラスター・アニメーションマスター' not in d:
    a=d.find('### 猟犬の正式64×64ドット絵マスター'); b=d.find('### `PET_GRAPHICS` とSVGマスターの正式責務',a)
    if a<0 or b<0: raise SystemExit('STOP:design-hound-section-anchor-missing')
    h="""### 猟犬の正式64×64ラスター・アニメーションマスター

猟犬は、EFR全体をドット絵化するための先行実装として、**実ピクセルの64×64 PNGラスター**を一次グラフィック原本とする。

- 正式静止マスター：`assets/pets/png/hound_pixel_64.png`
- 正式アニメーション：`assets/pets/png/hound_animations_64x64.png`
- 1フレーム：64×64px
- アニメーションシート：8列×10行、各セル64×64px
- 1セル=1ピクセルのラスター制作を基準とし、ベクター曲線をマスターへ変換して制作したものを正式ドット絵制作方式とはしない。
- アンチエイリアスを使用しない。
- ゲーム内拡大はnearest-neighbor相当の整数ピクセル境界を保持する。
- 歩行・走行・攻撃・被弾・ノックバック・ダウン・死亡・捕獲・特殊動作を、同一の64×64ドット絵キャラクターからフレーム単位で成立させる。
- 各モーションは同一身体比率・同一パレット・同一輪郭規則を維持する。
- モーションは既存 `EFRPetStates` の `moving`、`vx`、`vy`、`attackPulse`、`hitPulse`、`downed` 等のruntime状態から選択する。
- 新しいペットrenderer、画像DB、保存層、別ペットモデルは追加しない。既存 `EFRPetRenderer` がPNGスプライトシートをcacheしてCanvasへ投影する。
- UI、Hub、出撃準備、インベントリ、探索中の表示は、既存の `drawPetGraphic()` → `EFRPetRenderer.draw()` 経路を維持する。
- 猟犬についてはSVGを一次原本とせず、PNGラスターを一次原本とする。既存 `hound.svg` は互換fallback用として残す。

モーション行は固定する。

1. `idle` 6フレーム
2. `walk` 8フレーム
3. `run` 8フレーム
4. `attack` 8フレーム
5. `hit` 6フレーム
6. `knockback` 6フレーム
7. `down` 6フレーム
8. `death` 8フレーム
9. `capture` 8フレーム
10. `special` 6フレーム

"""
    d=d[:a]+h+d[b:]

repls=[
('ペットの**種族別一次グラフィック原本**は、1種につき1つのローカルSVGマスターアートワークとする。','ペットの**種族別一次グラフィック原本**は、1種につき1つのローカル同梱グラフィックマスターとする。通常種はSVG、ドット絵化済み種はPNGラスターを使用できる。'),
('→ 種族SVGマスター\n→ `drawPetGraphic()`','→ 種族グラフィックマスター（SVGまたはPNG）\n→ `drawPetGraphic()`'),
('- SVGマスターの選択・読み込み\n- マスターのcache','- 種族グラフィックマスターの選択・読み込み\n- SVG/PNGマスターのcache'),
('正式グラフィック原本：\n\n`PET_GRAPHICS`\n→ 種族SVGマスター','正式グラフィック原本：\n\n`PET_GRAPHICS`\n→ 種族グラフィックマスター（SVGまたはPNG）'),
('runtimeはSVGマスターを読み込み、pose、gait、方向、個体差、LOD、cache、Canvas出力を担当する。','runtimeは種族グラフィックマスターを読み込み、pose、gait、方向、個体差、LOD、cache、Canvas出力を担当する。PNGドット絵種はスプライトシートからフレームを選択し、nearest-neighborでCanvasへ投影する。'),
('SVGマスターはローカル同梱し、毎フレーム再解析・再生成しない。\n\n静的なSVG/path、表面、模様はcacheし、動的なpose・gait・攻撃・被弾等だけを必要に応じて更新する。','SVG/PNGマスターはローカル同梱し、毎フレーム再解析・再生成しない。\n\n静的なSVG/path/PNGスプライトシートはcacheし、動的なpose・gait・攻撃・被弾等だけを必要に応じて更新する。PNGドット絵はimageSmoothingEnabled=falseを維持する。')]
for a,b in repls:
    if a in d: d=d.replace(a,b,1)
D.write_text(d,encoding='utf-8')

old='hound:{svg:"assets/pets/svg/hound.svg",body:"dog",ears:"drop",tail:"curve",mark:"chest"},'
new='hound:{png:"assets/pets/png/hound_animations_64x64.png",pngFrameW:64,pngFrameH:64,pngColumns:8,pngRows:10,pngAnimations:{idle:[0,6],walk:[1,8],run:[2,8],attack:[3,8],hit:[4,6],knockback:[5,6],down:[6,6],death:[7,8],capture:[8,8],special:[9,6]},svg:"assets/pets/svg/hound.svg",body:"dog",ears:"drop",tail:"curve",mark:"chest"},'
if old in p: p=p.replace(old,new,1)
elif 'hound:{png:"assets/pets/png/hound_animations_64x64.png"' not in p: raise SystemExit('STOP:pet-hound-manifest-anchor-missing')
P.write_text(p,encoding='utf-8')

if 'const pixelMasterCache=new Map();' not in r:
    anchor='  const svgMasterCache=new Map();\n'
    if anchor not in r: raise SystemExit('STOP:renderer-svg-cache-anchor-missing')
    helpers="""  const pixelMasterCache=new Map();

  function pixelMasterFor(graphic){
    const path=String(graphic?.png||"");
    if(!path)return null;
    let entry=pixelMasterCache.get(path);
    if(entry)return entry;
    entry={path,state:"loading",image:null};
    pixelMasterCache.set(path,entry);
    if(typeof Image!=="function" || typeof document==="undefined"){
      entry.state="failed"; return entry;
    }
    const image=new Image(); image.decoding="async";
    image.onload=()=>{entry.image=image;entry.state="ready";};
    image.onerror=()=>{entry.image=null;entry.state="failed";};
    try{image.src=new URL(path,document.baseURI).href;}
    catch(error){entry.image=null;entry.state="failed";}
    return entry;
  }

  function pixelAnimationFrameFor(graphic,action,phase,attackPulse,hitPulse,downed){
    const defs=graphic?.pngAnimations||{};
    const key=downed ? "down" : String(action||"idle");
    const def=defs[key]||defs.idle||[0,1];
    const row=Number(def[0])||0;
    const count=Math.max(1,Number(def[1])||1);
    let normalized=(Number.isFinite(phase)?phase/(Math.PI*2):0)%1;
    if(normalized<0)normalized+=1;
    if(key==="attack" && attackPulse>0) normalized=1-Math.max(0,Math.min(1,attackPulse));
    else if(key==="hit" && hitPulse>0) normalized=1-Math.max(0,Math.min(1,hitPulse));
    return {row,frame:Math.min(count-1,Math.floor(normalized*count)),count};
  }

  function drawPixelMaster(ctx,image,graphic,frame,r){
    if(!image || !image.complete || !image.naturalWidth || !image.naturalHeight)return false;
    const fw=Math.max(1,Number(graphic?.pngFrameW)||64);
    const fh=Math.max(1,Number(graphic?.pngFrameH)||64);
    const sx=Math.max(0,frame.frame*fw);
    const sy=Math.max(0,frame.row*fh);
    const previousSmoothing=ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled=false;
    const target=Math.max(1,r*2);
    ctx.drawImage(image,sx,sy,fw,fh,-target*.5,-target*.5,target,target);
    ctx.imageSmoothingEnabled=previousSmoothing;
    return true;
  }

"""
    r=r.replace(anchor,anchor+helpers,1)

# IMPORTANT: current main anchor is exactly this. Do not use the failed pixelReady anchor.
old='''    const svgMaster=\n      svgMasterFor(g);\n\n    let svgReady=false;'''
if old in r:
    replacement='''    const pixelMaster=\n      body==="hound"\n        ? pixelMasterFor(g)\n        : null;\n\n    const pixelAction=\n      downed\n        ? "down"\n        : attackPulse>.02\n          ? "attack"\n          : hitPulse>.02\n            ? "hit"\n            : moving\n              ? (Math.hypot(velocityX,velocityY)>12 ? "run" : "walk")\n              : "idle";\n\n    let pixelReady=false;\n\n    if(pixelMaster?.state==="ready"){\n      const pixelFrame=pixelAnimationFrameFor(g,pixelAction,phase,attackPulse,hitPulse,downed);\n      pixelReady=drawPixelMaster(ctx,pixelMaster.image,g,pixelFrame,r);\n    }\n\n    const svgMaster=\n      pixelReady\n        ? null\n        : svgMasterFor(g);\n\n    let svgReady=false;'''
    r=r.replace(old,replacement,1)
elif 'const pixelMaster=' not in r:
    raise SystemExit('STOP:renderer-current-draw-anchor-missing')

r=r.replace('    if(!svgReady && staticLayer){','    if(!pixelReady && !svgReady && staticLayer){',1)
r=r.replace('    }else if(!svgReady){','    }else if(!pixelReady && !svgReady){',1)
R.write_text(r,encoding='utf-8')

checks=[
(DST.exists(),'asset'),
('pngAnimations' in p and 'hound_animations_64x64.png' in p,'pet-manifest'),
('pixelMasterCache' in r and 'drawPixelMaster' in r and 'pixelAnimationFrameFor' in r,'renderer-png-runtime'),
('実ピクセルの64×64 PNGラスター' in d and '8列×10行' in d,'design-raster'),
('種族グラフィックマスター（SVGまたはPNG）' in d,'design-unified-master')]
for ok,name in checks:
    if not ok: raise SystemExit('STOP:verification:'+name)
print('OK:main-pulled'); print('OK:hound-animation-png'); print('OK:design-unified'); print('OK:pet-manifest'); print('OK:renderer-png-animation')
PY

git add EFR_GAME_DESIGN.md efr_pet.js efr_pet_renderer.js assets/pets/png/hound_animations_64x64.png
git commit -m "Integrate hound pixel animation into pet renderer"
git push origin main
git log -1 --oneline
