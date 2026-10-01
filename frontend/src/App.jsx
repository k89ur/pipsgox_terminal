import React,{useEffect,useRef,useState} from "react";
import {createChart,CandlestickSeries,HistogramSeries,LineSeries,ColorType} from "lightweight-charts";

const API=import.meta.env.VITE_API_URL||"";
const INITIAL=["RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","SONACOMS","PGIL","SKYGOLD","DIVGIITTS","GNA","MENONBE"];

function PriceChart({rows,range,show44,show50,show200,showVolume}){
  const host=useRef(null);
  useEffect(()=>{
    if(!host.current||!rows.length)return;
    const chart=createChart(host.current,{layout:{background:{type:ColorType.Solid,color:"#080a0d"},textColor:"#8d96a5"},grid:{vertLines:{color:"#171b22"},horzLines:{color:"#171b22"}},rightPriceScale:{borderColor:"#252a33"},timeScale:{borderColor:"#252a33"},height:host.current.clientHeight||620,width:host.current.clientWidth});
    const candles=chart.addSeries(CandlestickSeries,{upColor:"#19c784",downColor:"#ef4f5f",borderUpColor:"#19c784",borderDownColor:"#ef4f5f",wickUpColor:"#19c784",wickDownColor:"#ef4f5f"});
    candles.setData(rows.map(r=>({time:r.time,open:r.open,high:r.high,low:r.low,close:r.close})));
    const line=(key,color,title)=>{const s=chart.addSeries(LineSeries,{color,lineWidth:2,title,crosshairMarkerVisible:false});s.setData(rows.filter(r=>r[key]!=null).map(r=>({time:r.time,value:r[key]})));};
    if(show44)line("sma44","#f2c94c","44 SMA");
    if(show50)line("sma50","#a970ff","50 SMA");
    if(show200)line("sma200","#4da3ff","200 SMA");
    if(showVolume){const v=chart.addSeries(HistogramSeries,{priceFormat:{type:"volume"},priceScaleId:"",priceLineVisible:false});v.priceScale().applyOptions({scaleMargins:{top:.82,bottom:0}});v.setData(rows.map(r=>({time:r.time,value:r.volume,color:r.close>=r.open?"#294d42":"#5a2e36"})));}
    if(range==="max"){
      chart.timeScale().fitContent();
    }else{
      const last=rows[rows.length-1].time;
      const end=new Date(last*1000);
      const start=new Date(end);
      if(range==="1mo")start.setUTCMonth(start.getUTCMonth()-1);
      else if(range==="3mo")start.setUTCMonth(start.getUTCMonth()-3);
      else if(range==="6mo")start.setUTCMonth(start.getUTCMonth()-6);
      else if(range==="1y")start.setUTCFullYear(start.getUTCFullYear()-1);
      else if(range==="5y")start.setUTCFullYear(start.getUTCFullYear()-5);
      chart.timeScale().setVisibleRange({from:Math.floor(start.getTime()/1000),to:last});
    }
    const resize=()=>chart.applyOptions({width:host.current.clientWidth,height:host.current.clientHeight||620});
    window.addEventListener("resize",resize);
    return()=>{window.removeEventListener("resize",resize);chart.remove()};
  },[rows,range,show44,show50,show200,showVolume]);
  return <div className="chart-host" ref={host}/>;
}

export default function App(){
  const [symbol,setSymbol]=useState("RELIANCE"),[input,setInput]=useState("RELIANCE");
  const [timeframe,setTimeframe]=useState("1d"),[range,setRange]=useState("6mo");
  const [rows,setRows]=useState([]),[meta,setMeta]=useState(null),[loading,setLoading]=useState(false);
  const [watchlist,setWatchlist]=useState(INITIAL),[watchSearch,setWatchSearch]=useState("");
  const [show44,set44]=useState(true),[show50,set50]=useState(true),[show200,set200]=useState(true),[showVolume,setVolume]=useState(true);
  const [tab,setTab]=useState("WATCHLIST");

  const load=async(s=symbol)=>{
    setLoading(true);
    try{const r=await fetch(API+`/data/chart/${encodeURIComponent(s)}?timeframe=${timeframe}&period=${range}`);const j=await r.json();if(!r.ok)throw Error(j.detail||"Data request failed");setMeta(j);setRows(j.data)}catch(e){console.error(e);setRows([])}finally{setLoading(false)}
  };
  useEffect(()=>{load(symbol)},[symbol,timeframe]);
  const select=s=>{setSymbol(s);setInput(s)};
  const fmt=n=>n==null?"—":Number(n).toLocaleString("en-IN",{maximumFractionDigits:2});
  const filtered=watchlist.filter(s=>s.includes(watchSearch.toUpperCase()));

  return <div className="terminal">
    <header className="topbar"><div className="brand">PIPSGOX</div><nav>{["MARKET","WATCHLIST","SCANNER","INSIGHTS"].map(x=><button key={x} className={tab===x?"nav active":"nav"} onClick={()=>setTab(x)}>{x}</button>)}</nav><div className="top-actions"><span className="status-dot"/><span>YAHOO EOD</span><button>⚙</button></div></header>
    <div className="toolbar">
      <div className="search"><input value={input} onChange={e=>setInput(e.target.value.toUpperCase())} onKeyDown={e=>e.key==="Enter"&&select(input)} placeholder="Search NSE symbol..."/><button onClick={()=>select(input)}>GO</button></div>
      <div className="timeframes">{["1d","1wk","1mo"].map(t=><button key={t} className={timeframe===t?"selected":""} onClick={()=>setTimeframe(t)}>{t.toUpperCase()}</button>)}</div>
      <div className="ranges">{["1mo","3mo","6mo","1y","5y","max"].map(x=><button key={x} className={range===x?"selected":""} onClick={()=>setRange(x)}>{x.toUpperCase()}</button>)}</div>
      <button className="tool">INDICATORS</button>
    </div>
    <main className="workspace">
      <section className="chart-panel">
        <div className="chart-header"><div><strong>{meta?.symbol||symbol}</strong><span className="muted"> · NSE · {timeframe.toUpperCase()}</span></div>{meta&&<div className={meta.change_pct>=0?"gain":"loss"}>{fmt(meta.last)} &nbsp; {meta.change_pct>=0?"+":""}{meta.change_pct.toFixed(2)}%</div>}</div>
        <div className="chart-wrap">{loading&&<div className="loading">Loading EOD data…</div>}{rows.length?<PriceChart rows={rows} range={range} show44={show44} show50={show50} show200={show200} showVolume={showVolume}/>:<div className="loading">No data</div>}</div>
        <div className="indicator-bar"><label><input type="checkbox" checked={show44} onChange={e=>set44(e.target.checked)}/> 44 SMA</label><label><input type="checkbox" checked={show50} onChange={e=>set50(e.target.checked)}/> 50 SMA</label><label><input type="checkbox" checked={show200} onChange={e=>set200(e.target.checked)}/> 200 SMA</label><label><input type="checkbox" checked={showVolume} onChange={e=>setVolume(e.target.checked)}/> Volume</label></div>
      </section>
      <aside className="sidepanel">
        <div className="tabs">{["WATCHLIST","MARKET","MOVERS"].map(x=><button key={x} className={tab===x?"active":""} onClick={()=>setTab(x)}>{x}</button>)}</div>
        <div className="watch-title"><strong>WATCHLIST</strong><span>{watchlist.length} / 1000</span></div>
        <input className="watch-search" value={watchSearch} onChange={e=>setWatchSearch(e.target.value)} placeholder="Search symbols..."/>
        <div className="watch-head"><span>SYMBOL</span><span>LAST</span><span>CHANGE %</span></div>
        <div className="watch-list">{filtered.map(s=><button key={s} className={s===symbol?"watch-row selected":"watch-row"} onClick={()=>select(s)}><span>{s}</span><span>—</span><span>—</span></button>)}</div>
      </aside>
    </main>
  </div>;
}
