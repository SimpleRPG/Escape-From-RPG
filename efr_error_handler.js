(() => {
  "use strict";

  let currentContext = {
    phase: "初期化",
    file: "",
    operation: "",
    screen: ""
  };

  let lastErrorKey = "";
  let lastErrorAt = 0;
  let modal = null;
  let heartbeat = performance.now();
  let monitoring = false;
  let lastMonitorReport = 0;

  function getScreen(){
    const base=document.getElementById("basePanel");
    const raid=document.getElementById("raidPanel");
    const result=document.getElementById("resultPanel");
    const loadout=document.getElementById("efrLoadoutPanel");

    if(loadout && !loadout.classList.contains("hidden")){
      return "出撃準備";
    }

    if(raid && !raid.classList.contains("hidden")){
      return "探索";
    }

    if(result && !result.classList.contains("hidden")){
      return "探索結果";
    }

    if(base && !base.classList.contains("hidden")){
      return "拠点";
    }

    return "不明";
  }

  function fileFromStack(stack){
    if(!stack)return "";

    const match=String(stack).match(
      /(?:at\s+.*?\()?((?:https?:\/\/|file:\/\/|\/)[^)\s]+):(\d+):(\d+)/
    );

    if(!match)return "";

    try{
      return decodeURIComponent(match[1])+
        ":"+
        match[2]+
        ":"+
        match[3];
    }catch{
      return match[1]+":"+match[2]+":"+match[3];
    }
  }

  function normalizeError(error){
    const value=error instanceof Error
      ? error
      : new Error(
          typeof error==="string"
            ? error
            : JSON.stringify(error)
        );

    return {
      name:value.name || "Error",
      message:value.message || String(value),
      stack:value.stack || "",
      file:fileFromStack(value.stack)
    };
  }

  function ensureModal(){
    if(modal)return modal;

    modal=document.createElement("section");
    modal.id="efrCommonErrorModal";
    modal.hidden=true;

    modal.innerHTML=`
      <div class="efrErrorBackdrop"></div>
      <div class="efrErrorDialog" role="alertdialog" aria-modal="true">
        <div class="efrErrorHeader">
          <div>
            <small>EFR COMMON ERROR HANDLER</small>
            <h2>処理中にエラーが発生しました</h2>
          </div>
          <button type="button" data-error-close>閉じる</button>
        </div>

        <div class="efrErrorStatus" data-error-status></div>

        <div class="efrErrorGrid">
          <div>
            <span>エラー種別</span>
            <strong data-error-name></strong>
          </div>
          <div>
            <span>発生画面</span>
            <strong data-error-screen></strong>
          </div>
          <div>
            <span>実行中の処理</span>
            <strong data-error-operation></strong>
          </div>
          <div>
            <span>発生元ファイル</span>
            <strong data-error-file></strong>
          </div>
        </div>

        <div class="efrErrorSection">
          <span>エラー内容</span>
          <pre data-error-message></pre>
        </div>

        <div class="efrErrorSection">
          <span>スタックトレース</span>
          <pre data-error-stack></pre>
        </div>

        <div class="efrErrorActions">
          <button type="button" data-error-retry>現在の処理を再試行</button>
          <button type="button" data-error-reload>ページを再読み込み</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("[data-error-close]")
      .addEventListener("click",()=>hide());

    modal.querySelector("[data-error-retry]")
      .addEventListener("click",()=>{
        hide();

        try{
          window.EFRErrorHandler?.retry?.();
        }catch(error){
          report(
            error,
            {
              phase:"エラー画面",
              operation:"エラー発生後の再試行"
            }
          );
        }
      });

    modal.querySelector("[data-error-reload]")
      .addEventListener("click",()=>{
        window.location.reload();
      });

    return modal;
  }

  function show(error,meta={}){
    const normalized=normalizeError(error);
    const panel=ensureModal();

    const context={
      ...currentContext,
      ...meta
    };

    const file=
      meta.file ||
      context.file ||
      normalized.file ||
      "取得できませんでした";

    panel.querySelector("[data-error-name]").textContent=
      normalized.name;

    panel.querySelector("[data-error-screen]").textContent=
      context.screen ||
      getScreen();

    panel.querySelector("[data-error-operation]").textContent=
      context.operation ||
      "不明";

    panel.querySelector("[data-error-file]").textContent=
      file;

    panel.querySelector("[data-error-message]").textContent=
      normalized.message;

    panel.querySelector("[data-error-stack]").textContent=
      normalized.stack ||
      "スタックトレースを取得できませんでした。";

    panel.querySelector("[data-error-status]").textContent=
      context.phase ||
      "異常検知";

    panel.hidden=false;

    document.body.classList.add("efrErrorActive");

    console.error(
      "[EFR Common Error]",
      {
        error:normalized,
        context
      }
    );
  }

  function hide(){
    if(!modal)return;

    modal.hidden=true;
    document.body.classList.remove("efrErrorActive");
  }

  function setContext(meta={}){
    currentContext={
      ...currentContext,
      ...meta,
      screen:meta.screen || getScreen()
    };
  }

  function clearContext(){
    currentContext={
      phase:"待機",
      file:"",
      operation:"",
      screen:getScreen()
    };
  }

  function run(operation,fn,meta={}){
    const previous={...currentContext};

    setContext({
      ...meta,
      operation
    });

    try{
      return fn();
    }catch(error){
      report(error,{
        ...meta,
        operation
      });
      throw error;
    }finally{
      currentContext=previous;
    }
  }

  function report(error,meta={}){
    const normalized=normalizeError(error);
    const now=Date.now();

    const key=
      normalized.name+
      "|"+
      normalized.message+
      "|"+
      (
        meta.file||
        currentContext.file||
        normalized.file||
        ""
      );

    if(
      key===lastErrorKey &&
      now-lastErrorAt<1500
    ){
      return;
    }

    lastErrorKey=key;
    lastErrorAt=now;

    show(normalized,{
      ...currentContext,
      ...meta,
      screen:
        meta.screen ||
        currentContext.screen ||
        getScreen()
    });
  }

  function beat(){
    heartbeat=performance.now();
  }

  function startWatchdog(){
    if(monitoring)return;

    monitoring=true;

    window.setInterval(()=>{
      const raid=document.getElementById("raidPanel");
      const visible=
        raid &&
        !raid.classList.contains("hidden");

      if(!visible){
        heartbeat=performance.now();
        return;
      }

      if(
        document.visibilityState!=="visible"
      ){
        heartbeat=performance.now();
        return;
      }

      const now=performance.now();
      const stalled=now-heartbeat;

      if(
        stalled>10000 &&
        now-lastMonitorReport>10000
      ){
        lastMonitorReport=now;

        report(
          new Error(
            "探索処理の応答が10秒以上確認できません。"
          ),
          {
            phase:"応答停止監視",
            operation:
              currentContext.operation ||
              "探索ゲームループ",
            file:
              currentContext.file ||
              "game.js"
          }
        );
      }
    },3000);
  }

  window.addEventListener(
    "error",
    event=>{
      report(
        event.error || new Error(event.message || "Unknown error"),
        {
          phase:"グローバル例外",
          operation:
            currentContext.operation ||
            "ブラウザイベント処理",
          file:
            event.filename
              ? event.filename+
                ":"+
                event.lineno+
                ":"+
                event.colno
              : currentContext.file
        }
      );
    }
  );

  window.addEventListener(
    "unhandledrejection",
    event=>{
      report(
        event.reason instanceof Error
          ? event.reason
          : new Error(
              "Unhandled Promise rejection: "+
              String(event.reason)
            ),
        {
          phase:"未処理Promise例外",
          operation:
            currentContext.operation ||
            "非同期処理"
        }
      );
    }
  );

  window.EFRErrorHandler={
    setContext,
    clearContext,
    run,
    report,
    show,
    hide,
    beat,
    startWatchdog,
    getContext:()=>({...currentContext}),
    retry:()=>{
      hide();
      window.location.reload();
    }
  };

  function installStyle(){
    if(document.getElementById("efrCommonErrorStyle"))return;

    const style=document.createElement("style");
    style.id="efrCommonErrorStyle";

    style.textContent=`
      #efrCommonErrorModal{
        position:fixed;
        inset:0;
        z-index:99999;
        display:grid;
        place-items:center;
        padding:16px;
        box-sizing:border-box;
      }

      #efrCommonErrorModal[hidden]{
        display:none;
      }

      .efrErrorBackdrop{
        position:absolute;
        inset:0;
        background:rgba(0,0,0,.78);
        backdrop-filter:blur(4px);
      }

      .efrErrorDialog{
        position:relative;
        width:min(760px,100%);
        max-height:min(88vh,760px);
        overflow:auto;
        box-sizing:border-box;
        padding:18px;
        border:1px solid rgba(235,103,103,.58);
        border-radius:14px;
        background:#17191d;
        color:#eee;
        box-shadow:0 18px 60px rgba(0,0,0,.55);
      }

      .efrErrorHeader{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:12px;
      }

      .efrErrorHeader small{
        opacity:.65;
        letter-spacing:.08em;
      }

      .efrErrorHeader h2{
        margin:5px 0 0;
        font-size:20px;
      }

      .efrErrorHeader button,
      .efrErrorActions button{
        border:1px solid rgba(255,255,255,.18);
        border-radius:8px;
        background:#252931;
        color:#fff;
        padding:9px 12px;
      }

      .efrErrorStatus{
        margin:14px 0;
        padding:10px 12px;
        border-radius:8px;
        background:rgba(220,82,82,.12);
        border:1px solid rgba(220,82,82,.25);
      }

      .efrErrorGrid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:9px;
      }

      .efrErrorGrid>div,
      .efrErrorSection{
        padding:10px;
        border-radius:8px;
        background:#202329;
      }

      .efrErrorGrid span,
      .efrErrorSection>span{
        display:block;
        font-size:11px;
        opacity:.62;
        margin-bottom:5px;
      }

      .efrErrorGrid strong{
        display:block;
        overflow-wrap:anywhere;
        font-size:13px;
      }

      .efrErrorSection{
        margin-top:9px;
      }

      .efrErrorSection pre{
        margin:0;
        white-space:pre-wrap;
        overflow-wrap:anywhere;
        font:12px/1.5 monospace;
      }

      .efrErrorActions{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        margin-top:14px;
      }

      @media(max-width:560px){
        .efrErrorGrid{
          grid-template-columns:1fr;
        }

        .efrErrorDialog{
          padding:14px;
        }
      }

      body.efrErrorActive{
        overflow:hidden;
      }
    `;

    document.head.appendChild(style);
  }

  if(document.readyState==="loading"){
    document.addEventListener(
      "DOMContentLoaded",
      ()=>{
        installStyle();
        startWatchdog();
      },
      {once:true}
    );
  }else{
    installStyle();
    startWatchdog();
  }
})();
