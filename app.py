import streamlit as st
import yfinance as yf
import pandas as pd
import numpy as np
import plotly.graph_objects as go

st.set_page_config(page_title="PIPSGOX Terminal", page_icon="📈", layout="wide")

if "watchlist" not in st.session_state:
    st.session_state.watchlist = ["RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS"]

@st.cache_data(ttl=300, show_spinner=False)
def load_history(symbol: str, period: str, interval: str) -> pd.DataFrame:
    data = yf.download(symbol, period=period, interval=interval, auto_adjust=False, progress=False, threads=False)
    if data is None or data.empty:
        return pd.DataFrame()
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)
    data = data.rename(columns=str.title)
    cols = [c for c in ["Open", "High", "Low", "Close", "Volume"] if c in data.columns]
    return data[cols].dropna(subset=["Close"])

def add_indicators(df, sma44, sma50, sma200, vwap):
    out = df.copy()
    if sma44: out["SMA 44"] = out["Close"].rolling(44).mean()
    if sma50: out["SMA 50"] = out["Close"].rolling(50).mean()
    if sma200: out["SMA 200"] = out["Close"].rolling(200).mean()
    if vwap:
        typical = (out["High"] + out["Low"] + out["Close"]) / 3
        out["VWAP"] = (typical * out["Volume"]).cumsum() / out["Volume"].replace(0, np.nan).cumsum()
    return out

def make_chart(df, symbol, show_volume, show_52w):
    fig = go.Figure()
    fig.add_trace(go.Candlestick(x=df.index, open=df["Open"], high=df["High"], low=df["Low"], close=df["Close"], name=symbol))
    for col in ["SMA 44", "SMA 50", "SMA 200", "VWAP"]:
        if col in df.columns:
            fig.add_trace(go.Scatter(x=df.index, y=df[col], mode="lines", name=col))
    if show_52w and len(df):
        recent = df["Close"].tail(252)
        fig.add_hline(y=float(recent.max()), line_dash="dot", annotation_text="52W High")
        fig.add_hline(y=float(recent.min()), line_dash="dot", annotation_text="52W Low")
    fig.update_layout(height=650, margin=dict(l=10,r=10,t=35,b=10), xaxis_rangeslider_visible=False, hovermode="x unified")
    return fig

st.title("PIPSGOX Terminal")
st.caption("Streamlit + yfinance foundation — broker/API integration removed")

with st.sidebar:
    st.header("Chart")
    raw = st.text_input("NSE symbol", value="RELIANCE").strip().upper()
    symbol = raw if raw.endswith((".NS", ".BO")) else raw + ".NS"
    timeframe = st.selectbox("Timeframe", ["1d", "1wk", "1mo", "1h", "30m", "15m", "5m", "1m"])
    periods = {"1d":["1mo","3mo","6mo","1y","5y","max"],"1wk":["6mo","1y","5y","max"],"1mo":["1y","5y","max"],"1h":["1mo","3mo","6mo"],"30m":["1mo","3mo","6mo"],"15m":["1mo","3mo"],"5m":["5d","1mo"],"1m":["1d","5d","7d"]}
    period = st.selectbox("Range", periods[timeframe], index=min(2, len(periods[timeframe])-1))
    st.divider()
    st.subheader("Indicators")
    sma44 = st.checkbox("44 SMA", True)
    sma50 = st.checkbox("50 SMA", True)
    sma200 = st.checkbox("200 SMA", True)
    vwap = st.checkbox("VWAP", False)
    show_volume = st.checkbox("Volume", True)
    show_52w = st.checkbox("52W High / Low", False)
    st.divider()
    st.subheader("Watchlist")
    add = st.text_input("Add stock", placeholder="e.g. SBIN")
    if st.button("Add", use_container_width=True) and add:
        s = add.strip().upper()
        s = s if s.endswith((".NS",".BO")) else s+".NS"
        if s not in st.session_state.watchlist: st.session_state.watchlist.append(s)
    if st.button("Remove current", use_container_width=True) and symbol in st.session_state.watchlist:
        st.session_state.watchlist.remove(symbol)

df = load_history(symbol, period, timeframe)
if df.empty:
    st.error(f"No Yahoo Finance data returned for {symbol}.")
    st.stop()

df = add_indicators(df, sma44, sma50, sma200, vwap)
last = float(df["Close"].iloc[-1])
prev = float(df["Close"].iloc[-2]) if len(df) > 1 else last
pct = ((last-prev)/prev*100) if prev else 0
c1,c2,c3,c4 = st.columns(4)
c1.metric("Symbol", symbol.replace(".NS",""))
c2.metric("Last", f"{last:,.2f}")
c3.metric("Change", f"{last-prev:,.2f}")
c4.metric("Change %", f"{pct:.2f}%")
st.plotly_chart(make_chart(df, symbol, show_volume, show_52w), use_container_width=True)

st.subheader("Watchlist")
for i in range(0, len(st.session_state.watchlist), 5):
    cols = st.columns(5)
    for j, s in enumerate(st.session_state.watchlist[i:i+5]):
        hist = load_history(s, "5d", "1d")
        label = s.replace(".NS","")
        if not hist.empty:
            close=float(hist["Close"].iloc[-1]); p=float(hist["Close"].iloc[-2]) if len(hist)>1 else close
            label += f"  {close:,.2f} ({((close-p)/p*100 if p else 0):+.2f}%)"
        if cols[j].button(label, key=f"wl_{i+j}", use_container_width=True):
            st.session_state["selected_symbol"] = s.replace(".NS","")
            st.rerun()
