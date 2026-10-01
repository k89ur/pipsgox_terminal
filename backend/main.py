from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd

app = FastAPI(title="PIPSGOX")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

def normalize_symbol(symbol: str) -> str:
    symbol = symbol.strip().upper()
    return symbol if symbol.endswith((".NS", ".BO")) else f"{symbol}.NS"

@app.get("/data/chart/{symbol}")
def chart(symbol: str, timeframe: str = "1d", period: str = "6mo"):
    ticker = normalize_symbol(symbol)
    interval = {"1d": "1d", "1wk": "1wk", "1mo": "1mo"}.get(timeframe)
    if interval is None:
        raise HTTPException(400, "Only EOD timeframes 1d, 1wk and 1mo are supported.")

    data = yf.download(
        ticker,
        period=period,
        interval=interval,
        auto_adjust=False,
        progress=False,
        threads=False,
    )

    if data is None or data.empty:
        raise HTTPException(404, f"No Yahoo Finance data for {ticker}")

    if isinstance(data.columns, pd.MultiIndex):
        data.columns = data.columns.get_level_values(0)

    data = data.rename(columns=str.title)
    required = ["Open", "High", "Low", "Close", "Volume"]
    data = data[[c for c in required if c in data.columns]].dropna(subset=["Close"])

    if data.empty:
        raise HTTPException(404, f"No usable Yahoo Finance data for {ticker}")

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
    change = last["close"] - previous["close"]

    return {
        "symbol": ticker.replace(".NS", "").replace(".BO", ""),
        "ticker": ticker,
        "last": last["close"],
        "change": change,
        "change_pct": (change / previous["close"] * 100) if previous["close"] else 0,
        "data": rows,
    }
