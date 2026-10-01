import React,{useEffect,useRef,useState} from "react";
import {createChart,CandlestickSeries,HistogramSeries,LineSeries,AreaSeries,BaselineSeries,BarSeries,ColorType} from "lightweight-charts";

const API=import.meta.env.VITE_API_URL||"";
const INITIAL=["RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","SONACOMS","PGIL","SKYGOLD","DIVGIITTS","GNA","MENONBE"];
const TF=["1m","3m","5m","15m","30m","1h","2h","4h","1d","1wk","1mo"];
const RANGES=["1mo","3mo","6mo","1y","5y","max"];
const DRAW_TOOLS=[["↖","Cursor"],["╱","Trend Line"],["—","Horizontal Line"],["│","Vertical Line"],["⌗","Parallel Channel"],["F","Fibonacci"],["□","Rectangle"],["○","Circle"],["↗","Long Position"],["↙","Short Position"],["T","Text"],["⌖","Measure"]];

function PriceChart({rows,range,chartType,show44,show50,show200,showVolume,settings}){
  const host=useRef(null);
  useEffect(()=>{
    if(!host.current||!rows.length)return;
    const chart=createChart(host.current,{
      layout:{background:{type:ColorType.Solid,color:settings.background},textColor:settings.textColor},
      grid:{vertLines:{color:settings.gridColor},horzLines:{color:settings.gridColor}},
      rightPriceScale:{borderColor:"#252a33",autoScale:settings.autoScale},
      timeScale:{borderColor:"#252a33",timeVisible:false},
      crosshair:{mode:settings.crosshair?1:0},
      height:host.current.clientHeight||620,width:host.current.clientWidth
    });

    if(chartType==="line"){
      const s=chart.addSeries(LineSeries,{color:"#4da3ff",lineWidth:2,title:"Close"}); s.setData(rows.map(r=>({time:r.time,value:r.close})));
    }else if(chartType==="area"){
      const s=chart.addSeries(AreaSeries,{lineColor:"#4da3ff",topColor:"rgba(77,163,255,.22)",bottomColor:"rgba(77,163,255,0)",lineWidth:2,title:"Close"}); s.setData(rows.map(r=>({time:r.time,value:r.close})));
    }else if(chartType==="baseline"){
      const s=chart.addSeries(BaselineSeries,{baseValue:{type:"price",price:rows[0].close},topLineColor:"#19c784",bottomLineColor:"#ef4f5f",topFillColor1:"rgba(25,199,132,.16)",topFillColor2:"rgba(25,199,132,0)",bottomFillColor1:"rgba(239,79,95,0)",bottomFillColor2:"rgba(239,79,95,.16)",lineWidth:2}); s.setData(rows.map(r=>({time:r.time,value:r.close})));
    }else if(chartType==="bar"){
      const bars=chart.addSeries(BarSeries,{upColor:"#19c784",downColor:"#ef4f5f",openVisible:true,thinBars:false}); bars.setData(rows.map(r=>({time:r.time,open:r.open,high:r.high,low:r.low,close:r.close})));
    }else{
      const candles=chart.addSeries(CandlestickSeries,{
        upColor:"#19c784",downColor:"#ef4f5f",borderUpColor:"#19c784",borderDownColor:"#ef4f5f",
        wickUpColor:"#19c784",wickDownColor:"#ef4f5f"
      });
      candles.setData(rows.map(r=>({time:r.time,open:r.open,high:r.high,low:r.low,close:r.close})));
    }

    const line=(key,color,title)=>{const s=chart.addSeries(LineSeries,{color,lineWidth:2,title,crosshairMarkerVisible:false});s.setData(rows.filter(r=>r[key]!=null).map(r=>({time:r.time,value:r[key]})));};
    if(show44)line("sma44","#f2c94c","44 SMA");
    if(show50)line("sma50","#a970ff","50 SMA");
    if(show200)line("sma200","#4da3ff","200 SMA");

    if(showVolume){
      const v=chart.addSeries(HistogramSeries,{priceFormat:{type:"volume"},priceScaleId:"",priceLineVisible:false});
      v.priceScale().applyOptions({scaleMargins:{top:.82,bottom:0}});
      v.setData(rows.map(r=>({time:r.time,value:r.volume,color:r.close>=r.open?"#294d42":"#5a2e36"})));
    }

    if(range==="max")chart.timeScale().fitContent();
    else{
      const last=rows[rows.length-1].time;
      const end=new Date(last*1000),start=new Date(last*1000);
      if(range==="1mo")start.setUTCMonth(end.getUTCMonth()-1);
      else if(range==="3mo")start.setUTCMonth(end.getUTCMonth()-3);
      else if(range==="6mo")start.setUTCMonth(end.getUTCMonth()-6);
      else if(range==="1y")start.setUTCFullYear(end.getUTCFullYear()-1);
      else if(range==="5y")start.setUTCFullYear(end.getUTCFullYear()-5);
      chart.timeScale().setVisibleRange({from:Math.floor(start.getTime()/1000),to:last});
    }

    const resize=()=>chart.applyOptions({width:host.current.clientWidth,height:host.current.clientHeight||620});
    window.addEventListener("resize",resize);
    return()=>{window.removeEventListener("resize",resize);chart.remove()};
  },[rows,range,chartType,show44,show50,show200,showVolume,settings]);
  return <div className="chart-host" ref={host}/>;
}

function Modal({title,onClose,children}){return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><strong>{title}</strong><button onClick={onClose}>×</button></div>{children}</div></div>}

export default function App(){
  const [symbol,setSymbol]=useState("RELIANCE"),[input,setInput]=useState("RELIANCE");
  const [timeframe,setTimeframe]=useState("1d"),[range,setRange]=useState("6mo");
  const [rows,setRows]=useState([]),[meta,setMeta]=useState(null),[loading,setLoading]=useState(false);
  const [watchlist,setWatchlist]=useState(INITIAL),[watchSearch,setWatchSearch]=useState("");
  const [show44,set44]=useState(true),[show50,set50]=useState(true),[show200,set200]=useState(true),[showVolume,setVolume]=useState(true);
  const [tab,setTab]=useState("CHART"),[chartType,setChartType]=useState("candle"),[activeDraw,setActiveDraw]=useState("Cursor");
  const [modal,setModal]=useState(null);
  const [settings,setSettings]=useState({background:"#080a0d",textColor:"#8d96a5",gridColor:"#171b22",crosshair:true,autoScale:true});
  const [indicatorSearch,setIndicatorSearch]=useState("");

  const load=async(s=symbol)=>{
    setLoading(true);
    try{
      const r=await fetch(API+`/data/chart/${encodeURIComponent(s)}?timeframe=${timeframe}&period=max`);
      const j=await r.json(); if(!r.ok)throw Error(j.detail||"Data request failed");
      setMeta(j);setRows(j.data);
    }catch(e){console.error(e);setRows([])}
    finally{setLoading(false)}
  };
  useEffect(()=>{load(symbol)},[symbol,timeframe]);

  const select=s=>{const v=s.trim().toUpperCase();if(v){setSymbol(v);setInput(v)}};
  const fmt=n=>n==null?"—":Number(n).toLocaleString("en-IN",{maximumFractionDigits:2});
  const filtered=watchlist.filter(s=>s.includes(watchSearch.toUpperCase()));
  const indicators=[["44 SMA",show44,set44],["50 SMA",show50,set50],["200 SMA",show200,set200],["Volume",showVolume,setVolume]];
  const visibleIndicators=indicators.filter(x=>x[0].toLowerCase().includes(indicatorSearch.toLowerCase()));

  return <div className="terminal">
    <header className="tv-topbar">
      <div className="brand">PIPSGOX</div>
      <button className="symbol-box" onClick={()=>setModal("symbol")}>{meta?.symbol||symbol} <span>⌄</span></button>
      <div className="top-nav">
        {["CHART","SCANNER","INSIGHTS"].map(x=><button key={x} className={tab===x?"active":""} onClick={()=>setTab(x)}>{x}</button>)}
      </div>
      <div className="top-spacer"/>
      <span className="data-status"><i/> YAHOO EOD</span>
      <button className="icon-btn" title="Settings" onClick={()=>setModal("settings")}>⚙</button>
    </header>

    <div className="main-toolbar">
      <div className="toolbar-group symbol-search">
        <input value={input} onChange={e=>setInput(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&select(input)} placeholder="Search symbol"/>
        <button onClick={()=>select(input)}>↵</button>
      </div>
      <div className="toolbar-group">
        {["1d","1wk","1mo"].map(t=><button key={t} className={timeframe===t?"active":""} onClick={()=>setTimeframe(t)}>{t.toUpperCase()}</button>)}
        <button onClick={()=>setModal("timeframes")}>⌄</button>
      </div>
      <div className="toolbar-divider"/>
      <button className="toolbar-action" onClick={()=>setModal("chartType")}>{chartType==="candle"?"▥":"╱"} <span>{chartType==="candle"?"Candles":"Line"}</span>⌄</button>
      <button className="toolbar-action primary" onClick={()=>setModal("indicators")}>ƒx <span>Indicators</span></button>
      <button className="toolbar-action" onClick={()=>setModal("compare")}>＋ Compare</button>
      <div className="range-strip">{RANGES.map(x=><button key={x} className={range===x?"active":""} onClick={()=>setRange(x)}>{x==="max"?"ALL":x.toUpperCase()}</button>)}</div>
      <div className="top-spacer"/>
      <button className="toolbar-icon" onClick={()=>setModal("settings")}>⚙</button>
      <button className="toolbar-icon">⛶</button>
    </div>

    <main className="tv-workspace">
      <aside className="drawing-toolbar">
        {DRAW_TOOLS.map(([icon,name])=><button key={name} className={activeDraw===name?"active":""} title={name} onClick={()=>setActiveDraw(name)}>{icon}</button>)}
        <div className="draw-separator"/>
        <button title="Lock drawings">⌑</button>
        <button title="Hide drawings">◉</button>
        <button title="Delete drawings">⌫</button>
      </aside>

      <section className="chart-panel">
        <div className="chart-symbol-row">
          <div><strong>{meta?.symbol||symbol}</strong><span> NSE · {timeframe.toUpperCase()}</span></div>
          {meta&&<div className={meta.change_pct>=0?"gain":"loss"}>{fmt(meta.last)} &nbsp; {meta.change_pct>=0?"+":""}{meta.change_pct.toFixed(2)}%</div>}
        </div>
        {activeDraw!=="Cursor"&&<div className="tool-hint">Drawing tool: <b>{activeDraw}</b> · click the chart to use it</div>}
        <div className="chart-wrap">
          {loading&&<div className="loading">Loading EOD data…</div>}
          {rows.length?<PriceChart rows={rows} range={range} chartType={chartType} show44={show44} show50={show50} show200={show200} showVolume={showVolume} settings={settings}/>:<div className="loading">No data</div>}
        </div>
        <div className="chart-statusbar">
          <div>{["1d","1wk","1mo"].map(t=><button key={t} className={timeframe===t?"active":""} onClick={()=>setTimeframe(t)}>{t.toUpperCase()}</button>)}</div>
          <div className="active-tool">{activeDraw}</div>
          <div>Auto · NSE · EOD</div>
        </div>
      </section>

      <aside className="watchpanel">
        <div className="panel-tabs">{["WATCHLIST","MARKET","MOVERS"].map(x=><button key={x} className={tab===x?"active":""} onClick={()=>setTab(x)}>{x}</button>)}</div>
        <div className="watch-headline"><strong>Watchlist</strong><span>{watchlist.length} / 1000</span></div>
        <div className="watch-search"><span>⌕</span><input value={watchSearch} onChange={e=>setWatchSearch(e.target.value)} placeholder="Search symbols"/></div>
        <div className="watch-cols"><span>SYMBOL</span><span>LAST</span><span>CHG%</span></div>
        <div className="watch-list">{filtered.map(s=><button key={s} className={s===symbol?"watch-row selected":"watch-row"} onClick={()=>select(s)}><span>{s}</span><span>{s===symbol?fmt(meta?.last):"—"}</span><span>{s===symbol?(meta?.change_pct>=0?"+":"")+meta?.change_pct.toFixed(2):"—"}</span></button>)}</div>
      </aside>
    </main>

    {modal==="indicators"&&<Modal title="Indicators" onClose={()=>setModal(null)}>
      <input className="modal-search" autoFocus value={indicatorSearch} onChange={e=>setIndicatorSearch(e.target.value)} placeholder="Search indicators…"/>
      <div className="indicator-list">{visibleIndicators.map(([name,on,setOn])=><label key={name}><span>{name}</span><input type="checkbox" checked={on} onChange={e=>setOn(e.target.checked)}/></label>)}</div>
      <div className="modal-note">More indicators will be added to the PIPSGOX indicator engine.</div>
    </Modal>}

    {modal==="chartType"&&<Modal title="Chart Type" onClose={()=>setModal(null)}>
      <div className="option-grid">{[["candle","Candles","▥"],["bar","Bars","┃"],["line","Line","╱"],["area","Area","◒"],["baseline","Baseline","═"]].map(([v,n,i])=><button className={chartType===v?"selected":""} key={v} onClick={()=>{setChartType(v);setModal(null)}}><b>{i}</b><span>{n}</span></button>)}</div>
    </Modal>}

    {modal==="timeframes"&&<Modal title="Timeframe" onClose={()=>setModal(null)}>
      <div className="timeframe-grid">{TF.map(t=><button key={t} className={timeframe===t?"selected":""} disabled={!["1d","1wk","1mo"].includes(t)} onClick={()=>{if(["1d","1wk","1mo"].includes(t)){setTimeframe(t);setModal(null)}}}>{t.toUpperCase()}</button>)}</div>
      <div className="modal-note">Intraday timeframes are displayed in the UI, but remain disabled until an intraday data source is connected. Current PIPSGOX data is EOD Yahoo Finance.</div>
    </Modal>}

    {modal==="settings"&&<Modal title="Chart Settings" onClose={()=>setModal(null)}>
      <div className="settings-list">
        <label>Background <input type="text" value={settings.background} onChange={e=>setSettings({...settings,background:e.target.value})}/></label>
        <label>Text color <input type="text" value={settings.textColor} onChange={e=>setSettings({...settings,textColor:e.target.value})}/></label>
        <label>Grid color <input type="text" value={settings.gridColor} onChange={e=>setSettings({...settings,gridColor:e.target.value})}/></label>
        <label>Crosshair <input type="checkbox" checked={settings.crosshair} onChange={e=>setSettings({...settings,crosshair:e.target.checked})}/></label>
        <label>Auto scale <input type="checkbox" checked={settings.autoScale} onChange={e=>setSettings({...settings,autoScale:e.target.checked})}/></label>
      </div>
    </Modal>}

    {modal==="symbol"&&<Modal title="Symbol Search" onClose={()=>setModal(null)}>
      <input className="modal-search" autoFocus value={input} onChange={e=>setInput(e.target.value.toUpperCase())} onKeyDown={e=>{if(e.key==="Enter"){select(input);setModal(null)}}} placeholder="Enter NSE symbol…"/>
      <div className="modal-note">Press Enter to load the symbol from Yahoo Finance.</div>
    </Modal>}

    {modal==="compare"&&<Modal title="Compare" onClose={()=>setModal(null)}>
      <div className="modal-note">Compare is reserved for the multi-series chart engine. The next phase will add multiple symbols with independent styles and scales.</div>
    </Modal>}
  </div>;
}
