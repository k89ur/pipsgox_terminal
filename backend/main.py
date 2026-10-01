from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd

app = FastAPI(title="PIPSGOX Market Data API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PERIODS = {
    "1d": {"1mo", "3mo", "6mo", "1y", "5y", "max"},
    "1wk": {"6mo", "1y", "5y", "max"},
    "1mo": {"1y", "5y", "max"},
}

def normalize_symbol(symbol: str) -> str:
    symbol = symbol.strip().upper()
    return symbol if symbol.endswith((".NS", ".BO")) else f"{symbol}.NS"

@app.get("/api/health")
def health():
    return {"status": "ok", "data_source": "yfinance"}

@app.get("/api/chart/{symbol}")
def chart(symbol: str, timeframe: str = "1d", period: str = "6mo"):
    ticker = normalize_symbol(symbol)
    interval = {"1d": "1d", "1wk": "1wk", "1mo": "1mo"}.get(timeframe)
    if interval is None:
        raise HTTPException(400, "EOD API currently supports 1d, 1wk and 1mo")

    data = yf.download(
        ticker, period=period, interval=interval,
        auto_adjust=False, progress=False, threads=False
    )
    if data is None or data.empty:
        raise HTTPException(404, f"No Yahoo Finance data for {ticker}")

    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    data = data.rename(columns=str.title)
    required = ["Open", "High", "Low", "Close", "Volume"]
    data = data[[c for c in required if c in data.columns]].dropna(subset=["Close"])

    data["sma44"] = data["Close"].rolling(44).mean()
    data["sma50"] = data["Close"].rolling(50).mean()
    data["sma200"] = data["Close"].rolling(200).mean()

    rows = []
    for idx, row in data.iterrows():
        rows.append({
            "time": int(pd.Timestamp(idx).timestamp()),
            "open": float(row["Open"]),
            "high": float(row["High"]),
            "low": float(row["Low"]),
            "close": float(row["Close"]),
            "volume": float(row["Volume"]) if pd.notna(row["Volume"]) else 0,
            "sma44": None if pd.isna(row["sma44"]) else float(row["sma44"]),
            "sma50": None if pd.isna(row["sma50"]) else float(row["sma50"]),
            "sma200": None if pd.isna(row["sma200"]) else float(row["sma200"]),
        })

    last = rows[-1]
    previous = rows[-2] if len(rows) > 1 else last
    return {
        "symbol": ticker.replace(".NS", "").replace(".BO", ""),
        "ticker": ticker,
        "last": last["close"],
        "change": last["close"] - previous["close"],
        "change_pct": ((last["close"] - previous["close"]) / previous["close"] * 100) if previous["close"] else 0,
        "data": rows,
    }

@app.get("/api/quote/{symbol}")
def quote(symbol: str):
    ticker = normalize_symbol(symbol)
    data = yf.download(ticker, period="5d", interval="1d", auto_adjust=False, progress=False, threads=False)
    if data is None or data.empty:
        raise HTTPException(404, f"No quote for {ticker}")
    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)
    close = data["Close"].dropna()
    last = float(close.iloc[-1])
    prev = float(close.iloc[-2]) if len(close) > 1 else last
    return {
        "symbol": ticker.replace(".NS", "").replace(".BO", ""),
        "last": last,
        "change": last - prev,
        "change_pct": ((last - prev) / prev * 100) if prev else 0,
    }
