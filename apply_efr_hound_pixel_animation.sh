#!/data/data/com.termux/files/usr/bin/bash
set -eu
cd ~/Escape-From-RPG

git pull --ff-only origin main
test "$(git branch --show-current)" = "main"

python - <<'PY'
from pathlib import Path
import re, shutil

root=Path(".")
design=root/"EFR_GAME_DESIGN.md"
pet=root/"efr_pet.js"
renderer=root/"efr_pet_renderer.js"
asset=root/"assets/pets/png/hound_animations_64x64.png"
source=Path.home()/"storage/downloads/hound_animations_64x64_v2.png"

if not design.exists() or not pet.exists() or not renderer.exists():
    raise SystemExit("STOP:required-file-missing")

# The generated PNG must be supplied by the user as the exact downloaded asset.
if not source.exists():
    raise SystemExit("STOP:put-hound_animations_64x64_v2.png-in-Download")
asset.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(source, asset)

d=design.read_text(encoding="utf-8")
p=pet.read_text(encoding="utf-8")
r=renderer.read_text(encoding="utf-8")

# ---- Design: unify the hound section with the existing single pet-graphics chapter.
start=d.index("### 猟犬の正式64×64ドット絵マスター")
end=d.index("### `PET_GRAPHICS` とSVGマスターの正式責務", start)
hound_section="""### 猟犬の正式64×64ラスター・アニメーションマスター

猟犬は、EFR全体をドット絵化するための先行実装として、**実ピクセルの64×64 PNGラスター**を一次グラフィック原本とする。

- 正式静止マスター：`assets/pets/png/hound_pixel_64.png`
- 正式アニメーション：`assets/pets/png/hound_animations_64x64.png`
- 1フレーム：64×64px
- アニメーションシート：8列×10行、各セル64×64px
- 1セル=1ピクセルのラスター制作を基準とし、ベクター曲線をマスターへ変換して制作したものを正式ドット絵制作方式とはしない。
- アンチエイリアスを使用しない。
- ゲーム内拡大はnearest-neighbor相当の整数ピクセル境界を保持する。
- 歩行・走行・攻撃・被弾・ノックバック・ダウン・死亡・捕獲・特殊動作を、同一の64×64ドット絵キャラクターからフレーム単位で成立させる。
- 各モーションは同一身体比率・同一パレット・同一輪郭規則を維持し、フレーム間で別キャラクターへ変化させない。
- モーションは既存 `EFRPetStates` の `moving`、`vx`、`vy`、`attackPulse`、`hitPulse`、`downed` 等のruntime状態から選択する。
- 新しいペットrenderer、画像DB、保存層、別ペットモデルは追加しない。既存 `EFRPetRenderer` がPNGスプライトシートをcacheしてCanvasへ投影する。
- UI、Hub、出撃準備、インベントリ、探索中の表示は、既存の `drawPetGraphic()` → `EFRPetRenderer.draw()` 経路を維持する。
- 猟犬についてはSVGを一次原本とせず、PNGラスターを一次原本とする。既存 `hound.svg` は互換fallback用として残すが、PNGがreadyなら一次描画に使用しない。

モーション行は次の順序で固定する。

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

この10行を猟犬の正式モーションセットとし、各フレームを独立した64×64ピクセル画像として扱える構造を維持する。

"""
d=d[:start]+hound_section+d[end:]

# Replace the old SVG-only single-master statement with a mixed master rule.
old="""ペットの**種族別一次グラフィック原本**は、1種につき1つのローカルSVGマスターアートワークとする。"""
new="""ペットの**種族別一次グラフィック原本**は、1種につき1つのローカル同梱グラフィックマスターとする。通常種はSVG、ドット絵化済み種はPNGラスターを使用できる。"""
if old not in d:
    raise SystemExit("STOP:design-master-anchor-missing")
d=d.replace(old,new,1)

old="""→ 種族SVGマスター
→ `drawPetGraphic()`"""
new="""→ 種族グラフィックマスター（SVGまたはPNG）
→ `drawPetGraphic()`"""
if old not in d:
    raise SystemExit("STOP:design-runtime-anchor-missing")
d=d.replace(old,new,1)

old="""- SVGマスターの選択・読み込み
- マスターのcache"""
new="""- 種族グラフィックマスターの選択・読み込み
- SVG/PNGマスターのcache"""
if old not in d:
    raise SystemExit("STOP:design-cache-anchor-missing")
d=d.replace(old,new,1)

# 15.19 runtime master and performance wording.
d=d.replace(
"""正式グラフィック原本：

`PET_GRAPHICS`
→ 種族SVGマスター""",
"""正式グラフィック原本：

`PET_GRAPHICS`
→ 種族グラフィックマスター（SVGまたはPNG）""",
1
)
d=d.replace(
"""runtimeはSVGマスターを読み込み、pose、gait、方向、個体差、LOD、cache、Canvas出力を担当する。""",
"""runtimeは種族グラフィックマスターを読み込み、pose、gait、方向、個体差、LOD、cache、Canvas出力を担当する。PNGドット絵種はスプライトシートからフレームを選択し、nearest-neighborでCanvasへ投影する。""",
1
)
d=d.replace(
"""SVGマスターはローカル同梱し、毎フレーム再解析・再生成しない。

静的なSVG/path、表面、模様はcacheし、動的なpose・gait・攻撃・被弾等だけを必要に応じて更新する。""",
"""SVG/PNGマスターはローカル同梱し、毎フレーム再解析・再生成しない。

静的なSVG/path/PNGスプライトシートはcacheし、動的なpose・gait・攻撃・被弾等だけを必要に応じて更新する。PNGドット絵はimageSmoothingEnabled=falseを維持する。""",
1
)

design.write_text(d,encoding="utf-8")

# ---- PET_GRAPHICS: hound becomes PNG-primary while preserving the existing manifest.
old='hound:{svg:"assets/pets/svg/hound.svg",body:"dog",ears:"drop",tail:"curve",mark:"chest"},'
new='hound:{png:"assets/pets/png/hound_animations_64x64.png",pngFrameW:64,pngFrameH:64,pngColumns:8,pngRows:10,pngAnimations:{idle:[0,6],walk:[1,8],run:[2,8],attack:[3,8],hit:[4,6],knockback:[5,6],down:[6,6],death:[7,8],capture:[8,8],special:[9,6]},svg:"assets/pets/svg/hound.svg",body:"dog",ears:"drop",tail:"curve",mark:"chest"},'
if old not in p:
    raise SystemExit("STOP:pet-hound-manifest-anchor-missing")
p=p.replace(old,new,1)
pet.write_text(p,encoding="utf-8")

# ---- Renderer: one additional raster-master cache inside the existing renderer.
anchor='  const svgMasterCache=new Map();\n'
if anchor not in r:
    raise SystemExit("STOP:renderer-svg-cache-anchor-missing")
insert=r"""  const pixelMasterCache=new Map();

  function pixelMasterFor(graphic){
    const path=String(graphic?.png||"");
    if(!path)return null;

    let entry=pixelMasterCache.get(path);
    if(entry)return entry;

    entry={path,state:"loading",image:null};
    pixelMasterCache.set(path,entry);

    if(typeof Image!=="function" || typeof document==="undefined"){
      entry.state="failed";
      return entry;
    }

    const image=new Image();
    image.decoding="async";
    image.onload=()=>{
      entry.image=image;
      entry.state="ready";
    };
    image.onerror=()=>{
      entry.image=null;
      entry.state="failed";
    };

    try{
      image.src=new URL(path,document.baseURI).href;
    }catch(error){
      entry.image=null;
      entry.state="failed";
    }

    return entry;
  }

  function pixelAnimationFrameFor(graphic,action,phase,attackPulse,hitPulse,downed){
    const defs=graphic?.pngAnimations||{};
    const key=downed ? "down" : String(action||"idle");
    const def=defs[key]||defs.idle||[0,1];
    const row=Number(def[0])||0;
    const count=Math.max(1,Number(def[1])||1);

    let normalized=(
      Number.isFinite(phase)
        ? phase/(Math.PI*2)
        : 0
    )%1;
    if(normalized<0)normalized+=1;

    if(key==="attack" && attackPulse>0){
      normalized=1-Math.max(0,Math.min(1,attackPulse));
    }else if(key==="hit" && hitPulse>0){
      normalized=1-Math.max(0,Math.min(1,hitPulse));
    }

    const frame=Math.min(
      count-1,
      Math.floor(normalized*count)
    );

    return {row,frame,count};
  }

  function drawPixelMaster(ctx,image,graphic,frame,r){
    if(
      !image ||
      !image.complete ||
      !image.naturalWidth ||
      !image.naturalHeight
    ){
      return false;
    }

    const fw=Math.max(1,Number(graphic?.pngFrameW)||64);
    const fh=Math.max(1,Number(graphic?.pngFrameH)||64);
    const sx=Math.max(0,frame.frame*fw);
    const sy=Math.max(0,frame.row*fh);

    const previousSmoothing=ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled=false;

    const target=Math.max(1,r*2);
    ctx.drawImage(
      image,
      sx,sy,fw,fh,
      -target*.5,-target*.5,target,target
    );

    ctx.imageSmoothingEnabled=previousSmoothing;
    return true;
  }

"""
r=r.replace(anchor,anchor+insert,1)

old="""    const svgMaster=
      pixelReady
        ? null
        : svgMasterFor(g);

    let svgReady=false;

    if(svgMaster?.state==="ready"){"""
new="""    const pixelMaster=
      body==="hound"
        ? pixelMasterFor(g)
        : null;

    const pixelAction=
      downed
        ? "down"
        : attackPulse>.02
          ? "attack"
          : hitPulse>.02
            ? "hit"
            : moving
              ? (
                  Math.hypot(velocityX,velocityY)>12
                    ? "run"
                    : "walk"
                )
              : "idle";

    let pixelReady=false;

    if(pixelMaster?.state==="ready"){
      const pixelFrame=
        pixelAnimationFrameFor(
          g,
          pixelAction,
          phase,
          attackPulse,
          hitPulse,
          downed
        );

      pixelReady=drawPixelMaster(
        ctx,
        pixelMaster.image,
        g,
        pixelFrame,
        r
      );
    }

    const svgMaster=
      pixelReady
        ? null
        : svgMasterFor(g);

    let svgReady=false;

    if(!pixelReady && svgMaster?.state==="ready"){"""
if old not in r:
    raise SystemExit("STOP:renderer-draw-anchor-missing")
r=r.replace(old,new,1)

old="""        r,
        body==="hound"
      );"""
new="""        r,
        false
      );"""
if old not in r:
    raise SystemExit("STOP:renderer-hound-svg-anchor-missing")
r=r.replace(old,new,1)

# Fallback must not draw SVG/Canvas body over a successfully drawn PNG.
old="""    if(!svgReady && staticLayer){"""
new="""    if(!pixelReady && !svgReady && staticLayer){"""
if old not in r:
    raise SystemExit("STOP:renderer-fallback-anchor-missing")
r=r.replace(old,new,1)

old="""    }else if(!svgReady){"""
new="""    }else if(!pixelReady && !svgReady){"""
if old not in r:
    raise SystemExit("STOP:renderer-fallback-else-anchor-missing")
r=r.replace(old,new,1)

renderer.write_text(r,encoding="utf-8")

# Exact structural verification; no build/diff/lint.
checks=[
    (asset.exists(),"asset"),
    ("pngAnimations" in p and "hound_animations_64x64.png" in p,"pet-manifest"),
    ("pixelMasterCache" in r and "drawPixelMaster" in r and "pixelAnimationFrameFor" in r,"renderer-png-runtime"),
    ("実ピクセルの64×64 PNGラスター" in d and "8列×10行" in d,"design-raster"),
    ("種族グラフィックマスター（SVGまたはPNG）" in d,"design-unified-master"),
]
for ok,name in checks:
    if not ok:
        raise SystemExit("STOP:verification:"+name)

print("OK:main-pulled")
print("OK:hound-animation-png")
print("OK:design-unified")
print("OK:pet-manifest")
print("OK:renderer-png-animation")
PY

git add EFR_GAME_DESIGN.md efr_pet.js efr_pet_renderer.js assets/pets/png/hound_animations_64x64.png
git commit -m "Integrate hound pixel animation into pet renderer"
git push origin main
git log -1 --oneline
