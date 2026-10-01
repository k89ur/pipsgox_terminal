import React,{useEffect,useRef,useState} from "react";
import {createChart,CandlestickSeries,HistogramSeries,LineSeries,AreaSeries,BaselineSeries,BarSeries,ColorType} from "lightweight-charts";

const API=import.meta.env.VITE_API_URL||"";
const INITIAL=["RELIANCE","TCS","INFY","HDFCBANK","ICICIBANK","SONACOMS","PGIL","SKYGOLD","DIVGIITTS","GNA","MENONBE"];
const TF=["1m","3m","5m","15m","30m","1h","2h","4h","1d","1wk","1mo"];
const RANGES=["1mo","3mo","6mo","1y","5y","max"];
const DRAW_TOOLS=[["↖","Cursor"],["╱","Trend Line"],["—","Horizontal Line"],["│","Vertical Line"],["⌗","Parallel Channel"],["F","Fibonacci"],["□","Rectangle"],["○","Circle"],["↗","Long Position"],["↙","Short Position"],["T","Text"],["⌖","Measure"]];

function DrawingOverlay({activeDraw,rows,onDraw}){
  const ref=useRef(null); const [start,setStart]=useState(null); const [items,setItems]=useState([]);
  useEffect(()=>{const el=ref.current;if(!el)return;const resize=()=>{el.width=el.clientWidth;el.height=el.clientHeight;};resize();window.addEventListener("resize",resize);return()=>window.removeEventListener("resize",resize)},[]);
  const point=e=>{const r=ref.current.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};
  const draw=e=>{if(activeDraw==="Cursor")return;const p=point(e);if(!start){setStart(p);return;}setItems(v=>[...v,{type:activeDraw,a:start,b:p}]);setStart(null);onDraw?.();};
  useEffect(()=>{const el=ref.current;if(!el)return;const ctx=el.getContext("2d");ctx.clearRect(0,0,el.width,el.height);ctx.lineWidth=1;ctx.strokeStyle="#7aa7ff";ctx.fillStyle="#7aa7ff";items.forEach(d=>{const {a,b}=d;if(d.type==="Horizontal Line"){ctx.beginPath();ctx.moveTo(0,a.y);ctx.lineTo(el.width,a.y);ctx.stroke()}else if(d.type==="Vertical Line"){ctx.beginPath();ctx.moveTo(a.x,0);ctx.lineTo(a.x,el.height);ctx.stroke()}else if(d.type==="Rectangle"){ctx.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y)}else if(d.type==="Circle"){ctx.beginPath();ctx.ellipse((a.x+b.x)/2,(a.y+b.y)/2,Math.abs(b.x-a.x)/2,Math.abs(b.y-a.y)/2,0,0,Math.PI*2);ctx.stroke()}else if(d.type==="Fibonacci"){for(let i=0;i<5;i++){const y=a.y+(b.y-a.y)*[0,.236,.382,.618,1][i];ctx.beginPath();ctx.moveTo(a.x,y);ctx.lineTo(b.x,y);ctx.stroke()}}else{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}})},[items]);
  return <canvas ref={ref} className="drawing-overlay" onClick={draw}/>;
}

function PriceChart({rows,range,chartType,show44,show50,show200,showVolume,settings,activeIndicators=[],indicatorParams={},activeDraw,onDraw}){
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
    const data=rows.map(r=>({time:r.time,open:r.open,high:r.high,low:r.low,close:r.close}));
    if(chartType==="line"){const s=chart.addSeries(LineSeries,{color:"#4da3ff",lineWidth:2});s.setData(rows.map(r=>({time:r.time,value:r.close})))}
    else if(chartType==="area"){const s=chart.addSeries(AreaSeries,{lineColor:"#4da3ff",topColor:"rgba(77,163,255,.22)",bottomColor:"rgba(77,163,255,0)",lineWidth:2});s.setData(rows.map(r=>({time:r.time,value:r.close})))}
    else if(chartType==="baseline"){const s=chart.addSeries(BaselineSeries,{baseValue:{type:"price",price:rows[0].close},topLineColor:"#19c784",bottomLineColor:"#ef4f5f"});s.setData(rows.map(r=>({time:r.time,value:r.close})))}
    else if(chartType==="bar"){const s=chart.addSeries(BarSeries,{upColor:"#19c784",downColor:"#ef4f5f"});s.setData(data)}
    else {const s=chart.addSeries(CandlestickSeries,{upColor:"#19c784",downColor:"#ef4f5f",borderUpColor:"#19c784",borderDownColor:"#ef4f5f",wickUpColor:"#19c784",wickDownColor:"#ef4f5f"});s.setData(data)}

    const C=rows.map(r=>r.close),H=rows.map(r=>r.high),L=rows.map(r=>r.low),V=rows.map(r=>r.volume||0);
    const sma=(a,n)=>a.map((_,i)=>i<n-1?null:a.slice(i-n+1,i+1).reduce((x,y)=>x+y,0)/n);
    const ema=(a,n)=>{const o=Array(a.length).fill(null);if(a.length<n)return o;let v=a.slice(0,n).reduce((x,y)=>x+y,0)/n;o[n-1]=v;const k=2/(n+1);for(let i=n;i<a.length;i++){v=a[i]*k+v*(1-k);o[i]=v}return o};
    const wma=(a,n)=>a.map((_,i)=>{if(i<n-1)return null;const d=n*(n+1)/2;return a.slice(i-n+1,i+1).reduce((x,y,j)=>x+y*(j+1),0)/d});
    const atr=(n=14)=>sma(rows.map((r,i)=>i?Math.max(r.high-r.low,Math.abs(r.high-rows[i-1].close),Math.abs(r.low-rows[i-1].close)):r.high-r.low),n);
    const vwma=(n=20)=>C.map((_,i)=>{if(i<n-1)return null;const cv=C.slice(i-n+1,i+1),vv=V.slice(i-n+1,i+1),z=vv.reduce((a,b)=>a+b,0);return z?cv.reduce((a,x,j)=>a+x*vv[j],0)/z:null});
    const hma=(n=20)=>{const a=wma(C,n/2),b=wma(C,n),raw=C.map((_,i)=>a[i]!=null&&b[i]!=null?2*a[i]-b[i]:null);return wma(raw.map(x=>x??0),Math.round(Math.sqrt(n))).map((x,i)=>raw[i]==null?null:x)};
    const add=(vals,color,title,width=2)=>{const s=chart.addSeries(LineSeries,{color,lineWidth:width,title,crosshairMarkerVisible:false});s.setData(vals.map((v,i)=>v==null?null:{time:rows[i].time,value:v}).filter(Boolean));return s};
    const bands=(mid,mult,sd)=>({mid,upper:mid.map((x,i)=>x==null?null:x+mult*sd[i]),lower:mid.map((x,i)=>x==null?null:x-mult*sd[i])});
    const std=(a,n)=>a.map((_,i)=>{if(i<n-1)return null;const w=a.slice(i-n+1,i+1),m=w.reduce((x,y)=>x+y,0)/n;return Math.sqrt(w.reduce((x,y)=>x+(y-m)**2,0)/n)});
    const boll=(n=20,m=2)=>bands(sma(C,n),m,std(C,n));
    const don=(n=20)=>({upper:H.map((_,i)=>i<n-1?null:Math.max(...H.slice(i-n+1,i+1))),lower:L.map((_,i)=>i<n-1?null:Math.min(...L.slice(i-n+1,i+1)))});
    const vwap=()=>{let pv=0,vol=0,o=[];for(let i=0;i<rows.length;i++){pv+=((H[i]+L[i]+C[i])/3)*V[i];vol+=V[i];o.push(vol?pv/vol:null)}return o};
    const kelt=(n=20,m=2)=>{const mid=ema(C,n),a=atr(10);return {mid,upper:mid.map((x,i)=>x==null?null:x+m*(a[i]||0)),lower:mid.map((x,i)=>x==null?null:x-m*(a[i]||0))}};
    const supertrend=(n=10,m=3)=>{const a=atr(n),u=[],l=[],st=[];for(let i=0;i<C.length;i++){const mid=(H[i]+L[i])/2,up=mid+m*(a[i]||0),dn=mid-m*(a[i]||0);if(i===0){u[i]=up;l[i]=dn;st[i]=C[i]>=mid?dn:up}else{u[i]=C[i-1]>u[i-1]?Math.min(up,u[i-1]):up;l[i]=C[i-1]<l[i-1]?Math.max(dn,l[i-1]):dn;st[i]=st[i-1]===u[i-1]?(C[i]<=u[i]?u[i]:l[i]):(C[i]>=l[i]?l[i]:u[i])}}return st};

    if(show44)add(sma(C,44),"#f2c94c","44 SMA");
    if(show50)add(sma(C,50),"#a970ff","50 SMA");
    if(show200)add(sma(C,200),"#4da3ff","200 SMA");

    const overlays=new Set(activeIndicators);
    if(overlays.has("SMA 20"))add(sma(C,20),"#f2c94c","SMA 20");
    if(overlays.has("EMA 20"))add(ema(C,20),"#4da3ff","EMA 20");
    if(overlays.has("EMA 50"))add(ema(C,50),"#a970ff","EMA 50");
    if(overlays.has("WMA 20"))add(wma(C,20),"#ffcf5c","WMA 20");
    if(overlays.has("VWMA 20"))add(vwma(20),"#20c997","VWMA 20");
    if(overlays.has("HMA 20"))add(hma(20),"#ff9f43","HMA 20");
    if(overlays.has("Bollinger Bands")){const b=boll(20,2);add(b.upper,"#f2c94c","BB Upper");add(b.mid,"#8d96a5","BB Basis");add(b.lower,"#f2c94c","BB Lower")}
    if(overlays.has("Keltner Channels")){const k=kelt();add(k.upper,"#4da3ff","KC Upper");add(k.mid,"#8d96a5","KC Basis");add(k.lower,"#4da3ff","KC Lower")}
    if(overlays.has("Donchian Channels")){const d=don(20);add(d.upper,"#20c997","Donchian Upper");add(d.lower,"#20c997","Donchian Lower")}
    if(overlays.has("Supertrend 10,3"))add(supertrend(10,3),"#20c997","Supertrend");
    if(overlays.has("VWAP"))add(vwap(),"#ff9f43","VWAP");

    if(showVolume){const v=chart.addSeries(HistogramSeries,{priceFormat:{type:"volume"},priceScaleId:""});v.priceScale().applyOptions({scaleMargins:{top:.82,bottom:0}});v.setData(rows.map(r=>({time:r.time,value:r.volume||0,color:r.close>=r.open?"#294d42":"#5a2e36"})))}
    if(range==="max")chart.timeScale().fitContent();else{const last=rows.at(-1).time,end=new Date(last*1000),s=new Date(last*1000);if(range==="1mo")s.setUTCMonth(end.getUTCMonth()-1);else if(range==="3mo")s.setUTCMonth(end.getUTCMonth()-3);else if(range==="6mo")s.setUTCMonth(end.getUTCMonth()-6);else if(range==="1y")s.setUTCFullYear(end.getUTCFullYear()-1);else if(range==="5y")s.setUTCFullYear(end.getUTCFullYear()-5);chart.timeScale().setVisibleRange({from:Math.floor(s.getTime()/1000),to:last})}
    const resize=()=>chart.applyOptions({width:host.current.clientWidth,height:host.current.clientHeight||620});window.addEventListener("resize",resize);
    return()=>{window.removeEventListener("resize",resize);chart.remove()}
  },[rows,range,chartType,show44,show50,show200,showVolume,settings,activeIndicators,indicatorParams]);
  return <div className="chart-host" ref={host}><DrawingOverlay activeDraw={activeDraw} rows={rows} onDraw={onDraw}/></div>;
}

function Modal({title,onClose,children}){return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><strong>{title}</strong><button onClick={onClose}>×</button></div>{children}</div></div>}


function sma(a,n){return a.map((_,i)=>i<n-1?null:a.slice(i-n+1,i+1).reduce((x,y)=>x+y,0)/n)}
function ema(a,n){const out=Array(a.length).fill(null);if(a.length<n)return out;let v=a.slice(0,n).reduce((x,y)=>x+y,0)/n;out[n-1]=v;const k=2/(n+1);for(let i=n;i<a.length;i++){v=a[i]*k+v*(1-k);out[i]=v}return out}
function std(a,n){return a.map((_,i)=>{if(i<n-1)return null;const w=a.slice(i-n+1,i+1),m=w.reduce((x,y)=>x+y,0)/n;return Math.sqrt(w.reduce((x,y)=>x+(y-m)**2,0)/n)})}
function rsi(a,n=14){const o=Array(a.length).fill(null);let g=0,l=0;for(let i=1;i<=n;i++){const d=a[i]-a[i-1];g+=Math.max(d,0);l+=Math.max(-d,0)}let ag=g/n,al=l/n;o[n]=al===0?100:100-100/(1+ag/al);for(let i=n+1;i<a.length;i++){const d=a[i]-a[i-1];ag=(ag*(n-1)+Math.max(d,0))/n;al=(al*(n-1)+Math.max(-d,0))/n;o[i]=al===0?100:100-100/(1+ag/al)}return o}
function atr(rows,n=14){const tr=rows.map((r,i)=>i?Math.max(r.high-r.low,Math.abs(r.high-rows[i-1].close),Math.abs(r.low-rows[i-1].close)):r.high-r.low);return sma(tr,n)}
function macd(a,fast=12,slow=26,signal=9){const f=ema(a,fast),s=ema(a,slow),m=a.map((_,i)=>f[i]!=null&&s[i]!=null?f[i]-s[i]:null),sig=ema(m.map(x=>x??0),signal);return {macd:m,signal:sig,hist:m.map((x,i)=>x!=null&&sig[i]!=null?x-sig[i]:null)}}
function bollinger(a,n=20,mult=2){const mid=sma(a,n),sd=std(a,n);return {mid,upper:mid.map((x,i)=>x==null?null:x+mult*sd[i]),lower:mid.map((x,i)=>x==null?null:x-mult*sd[i])}}
function obv(rows){const o=Array(rows.length).fill(null);let v=0;for(let i=0;i<rows.length;i++){if(i)v+=rows[i].close>rows[i-1].close?rows[i].volume:rows[i].close<rows[i-1].close?-rows[i].volume:0;o[i]=v}return o}
function IndicatorPane({rows,name,onRemove,params,onParams}){
  const host=useRef(null);
  useEffect(()=>{
    if(!host.current||!rows.length)return;
    const chart=createChart(host.current,{layout:{background:{type:ColorType.Solid,color:"#080a0d"},textColor:"#8d96a5"},grid:{vertLines:{color:"#171b22"},horzLines:{color:"#171b22"}},height:170,rightPriceScale:{borderColor:"#252a33"},timeScale:{borderColor:"#252a33",timeVisible:false}});
    const C=rows.map(r=>r.close),H=rows.map(r=>r.high),L=rows.map(r=>r.low),V=rows.map(r=>r.volume);
    const sma=(a,n)=>a.map((_,i)=>i<n-1?null:a.slice(i-n+1,i+1).reduce((x,y)=>x+y,0)/n);
    const ema=(a,n)=>{const o=Array(a.length).fill(null);if(a.length<n)return o;let v=a.slice(0,n).reduce((x,y)=>x+y,0)/n;o[n-1]=v;const k=2/(n+1);for(let i=n;i<a.length;i++){v=a[i]*k+v*(1-k);o[i]=v}return o};
    const wma=(a,n)=>a.map((_,i)=>{if(i<n-1)return null;let d=n*(n+1)/2;return a.slice(i-n+1,i+1).reduce((x,y,j)=>x+y*(j+1),0)/d});
    const atr=(n=14)=>sma(rows.map((r,i)=>i?Math.max(r.high-r.low,Math.abs(r.high-rows[i-1].close),Math.abs(r.low-rows[i-1].close)):r.high-r.low),n);
    const rsi=(n=14)=>{const o=Array(C.length).fill(null);let g=0,l=0;for(let i=1;i<=n;i++){let d=C[i]-C[i-1];g+=Math.max(d,0);l+=Math.max(-d,0)}let ag=g/n,al=l/n;o[n]=al?100-100/(1+ag/al):100;for(let i=n+1;i<C.length;i++){let d=C[i]-C[i-1];ag=(ag*(n-1)+Math.max(d,0))/n;al=(al*(n-1)+Math.max(-d,0))/n;o[i]=al?100-100/(1+ag/al):100}return o};
    const add=(vals,color,title)=>{const s=chart.addSeries(LineSeries,{color,lineWidth:2,title,crosshairMarkerVisible:false});s.setData(vals.map((v,i)=>v==null?null:{time:rows[i].time,value:v}).filter(Boolean))};
    const obv=()=>{let v=0,o=[];for(let i=0;i<C.length;i++){if(i)v+=C[i]>C[i-1]?V[i]:C[i]<C[i-1]?-V[i]:0;o.push(v)}return o};
    const mfi=(n=14)=>{let tp=rows.map(r=>(r.high+r.low+r.close)/3),o=Array(C.length).fill(null);for(let i=n;i<C.length;i++){let pos=0,neg=0;for(let j=i-n+1;j<=i;j++){let f=tp[j]*V[j];if(j&&tp[j]>tp[j-1])pos+=f;else if(j)neg+=f}o[i]=neg?100-100/(1+pos/neg):100}return o};
    const stoch=(n=14,d=3)=>{let k=C.map((_,i)=>{if(i<n-1)return null;let hi=Math.max(...H.slice(i-n+1,i+1)),lo=Math.min(...L.slice(i-n+1,i+1));return hi===lo?0:100*(C[i]-lo)/(hi-lo)});return {k,d:sma(k.map(x=>x??0),d)}};
    const cci=(n=20)=>{let tp=rows.map(r=>(r.high+r.low+r.close)/3);return tp.map((x,i)=>{if(i<n-1)return null;let m=tp.slice(i-n+1,i+1).reduce((a,b)=>a+b,0)/n,dev=tp.slice(i-n+1,i+1).reduce((a,b)=>a+Math.abs(b-m),0)/n;return dev?(x-m)/(.015*dev):0})};
    const roc=(n=12)=>C.map((x,i)=>i<n?null:(x/C[i-n]-1)*100);
    const will=(n=14)=>C.map((x,i)=>{if(i<n-1)return null;let hi=Math.max(...H.slice(i-n+1,i+1)),lo=Math.min(...L.slice(i-n+1,i+1));return hi===lo?0:-100*(hi-x)/(hi-lo)});
    const adx=(n=14)=>{let tr=atr(n),p=Array(C.length).fill(null),m=Array(C.length).fill(null),dx=Array(C.length).fill(null);for(let i=1;i<C.length;i++){let up=H[i]-H[i-1],dn=L[i-1]-L[i];p[i]=up>dn&&up>0?up:0;m[i]=dn>up&&dn>0?dn:0}let ps=sma(p,n),ms=sma(m,n);for(let i=0;i<C.length;i++)if(tr[i]&&ps[i]!=null&&ms[i]!=null){let pi=100*ps[i]/tr[i],mi=100*ms[i]/tr[i];dx[i]=(pi+mi)?100*Math.abs(pi-mi)/(pi+mi):0}return sma(dx.map(x=>x??0),n)};
    const boll=(n=20,m=2)=>{let mid=sma(C,n),sd=C.map((_,i)=>{if(i<n-1)return null;let w=C.slice(i-n+1,i+1),q=w.reduce((a,b)=>a+b,0)/n;return Math.sqrt(w.reduce((a,b)=>a+(b-q)**2,0)/n)});return {u:mid.map((x,i)=>x==null?null:x+m*sd[i]),l:mid.map((x,i)=>x==null?null:x-m*sd[i])}};
    const kelt=()=>{let mid=ema(C,20),a=atr(10);return {u:mid.map((x,i)=>x==null?null:x+2*a[i]),l:mid.map((x,i)=>x==null?null:x-2*a[i])}};
    const don=(n=20)=>({u:H.map((_,i)=>i<n-1?null:Math.max(...H.slice(i-n+1,i+1))),l:L.map((_,i)=>i<n-1?null:Math.min(...L.slice(i-n+1,i+1)))});
    const vwap=()=>{let pv=0,vol=0,o=[];for(let i=0;i<rows.length;i++){pv+=(H[i]+L[i]+C[i])/3*V[i];vol+=V[i];o.push(vol?pv/vol:null)}return o};
    if(name==="RSI 14")add(rsi(params.period||14),"#20c997",name);
    else if(name==="ATR 14")add(atr(params.period||14),"#ff9f43",name);
    else if(name==="OBV")add(obv(),"#8f7cff",name);
    else if(name==="MFI 14")add(mfi(params.period||14),"#d48cff",name);
    else if(name==="Stochastic 14,3,3"){let x=stoch(params.k||14,params.d||3);add(x.k,"#4da3ff","%K");add(x.d,"#f2c94c","%D")}
    else if(name==="CCI 20")add(cci(params.period||20),"#ffcf5c",name);
    else if(name==="ROC 12")add(roc(params.period||12),"#5ac8fa",name);
    else if(name==="Williams %R 14")add(will(params.period||14),"#ff7aa2",name);
    else if(name==="ADX 14")add(adx(params.period||14),"#9b8cff",name);
    else if(name==="MACD"){let f=ema(C,params.fast||12),s=ema(C,params.slow||26),m=C.map((_,i)=>f[i]!=null&&s[i]!=null?f[i]-s[i]:null),sig=ema(m.map(x=>x??0),params.signal||9);add(m,"#4da3ff","MACD");add(sig,"#f2c94c","Signal")}
    else if(name==="WMA 20")add(wma(C,20),"#f2c94c",name);
    else if(name==="VWMA 20")add(C.map((_,i)=>{if(i<19)return null;let cv=C.slice(i-19,i+1),vv=V.slice(i-19,i+1),z=vv.reduce((a,b)=>a+b,0);return z?cv.reduce((a,x,j)=>a+x*vv[j],0)/z:null}),"#20c997",name);
    else if(name==="HMA 20"){let n=20,a=wma(C,n/2),b=wma(C,n),raw=C.map((_,i)=>a[i]!=null&&b[i]!=null?2*a[i]-b[i]:null);add(wma(raw.map(x=>x??0),Math.round(Math.sqrt(n))),"#ff9f43",name)}
    else if(name==="Bollinger Bands"){let b=boll();add(b.u,"#f2c94c","Upper");add(sma(C,20),"#8d96a5","Basis");add(b.l,"#f2c94c","Lower")}
    else if(name==="Keltner Channels"){let k=kelt();add(k.u,"#4da3ff","Upper");add(ema(C,20),"#8d96a5","Basis");add(k.l,"#4da3ff","Lower")}
    else if(name==="Donchian Channels"){let d=don();add(d.u,"#20c997","Upper");add(d.l,"#20c997","Lower")}
    else if(name==="VWAP")add(vwap(),"#ff9f43",name);
    else if(name==="SMA 20")add(sma(C,20),"#f2c94c",name);
    else if(name==="EMA 20")add(ema(C,20),"#4da3ff",name);
    else if(name==="EMA 50")add(ema(C,50),"#a970ff",name);
    else if(name==="Supertrend 10,3"){let n=10,mult=3,a=atr(n),u=[],l=[],st=[];for(let i=0;i<C.length;i++){let mid=(H[i]+L[i])/2,up=mid+mult*(a[i]||0),dn=mid-mult*(a[i]||0);if(i===0){u[i]=up;l[i]=dn;st[i]=C[i]>mid?dn:up}else{u[i]=C[i-1]>u[i-1]?Math.min(up,u[i-1]):up;l[i]=C[i-1]<l[i-1]?Math.max(dn,l[i-1]):dn;st[i]=st[i-1]===u[i-1]?(C[i]<=u[i]?u[i]:l[i]):(C[i]>=l[i]?l[i]:u[i])}}add(st,"#20c997",name)}
    chart.timeScale().fitContent();const resize=()=>chart.applyOptions({width:host.current.clientWidth});window.addEventListener("resize",resize);resize();return()=>{window.removeEventListener("resize",resize);chart.remove()};
  },[rows,name,params]);
  return <div className="indicator-pane"><div className="indicator-pane-title"><span>{name}</span><div><button onClick={()=>onParams(name)} title="Indicator settings">⚙</button><button onClick={()=>onRemove(name)} title="Remove indicator">×</button></div></div><div ref={host} className="indicator-pane-chart"/></div>
}

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
  const [activeIndicators,setActiveIndicators]=useState([]);
  const [indicatorParams,setIndicatorParams]=useState({"RSI 14":{period:14},"ATR 14":{period:14},"MACD":{fast:12,slow:26,signal:9},"OBV":{}});

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
  const advanced=["SMA 20","EMA 20","EMA 50","WMA 20","VWMA 20","HMA 20","RSI 14","ATR 14","MACD","Stochastic 14,3,3","CCI 20","ROC 12","Williams %R 14","ADX 14","Bollinger Bands","Keltner Channels","Donchian Channels","Supertrend 10,3","OBV","MFI 14","VWAP"];
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
          {rows.length?<PriceChart rows={rows} range={range} chartType={chartType} show44={show44} show50={show50} show200={show200} showVolume={showVolume} settings={settings} activeIndicators={activeIndicators} indicatorParams={indicatorParams} activeDraw={activeDraw}/>:<div className="loading">No data</div>}
        </div>
        {activeIndicators.filter(n=>["RSI 14","ATR 14","MACD","Stochastic 14,3,3","CCI 20","ROC 12","Williams %R 14","ADX 14","OBV","MFI 14"].includes(n)).map(n=><IndicatorPane key={n} rows={rows} name={n} params={indicatorParams[n]||{}} onRemove={name=>setActiveIndicators(v=>v.filter(x=>x!==name))} onParams={name=>setModal("params:"+name)}/>) }
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
      <div className="indicator-list">{visibleIndicators.map(([name,on,setOn])=><label key={name}><span>{name}</span><input type="checkbox" checked={on} onChange={e=>setOn(e.target.checked)}/></label>)}{advanced.filter(n=>n.toLowerCase().includes(indicatorSearch.toLowerCase())).map(name=><label key={name}><span>{name}</span><input type="checkbox" checked={activeIndicators.includes(name)} onChange={e=>setActiveIndicators(v=>e.target.checked?[...v,name]:v.filter(x=>x!==name))}/></label>)}</div>
      <div className="modal-note">Built-in PIPSGOX indicators are calculated locally from the loaded EOD series.</div>
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
