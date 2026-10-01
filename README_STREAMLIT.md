# PIPSGOX Terminal — Streamlit + yfinance

New terminal architecture:
Streamlit UI → yfinance → pandas → indicators → Plotly chart.

Broker integrations are intentionally excluded.

Initial foundation:
- NSE Yahoo Finance symbols
- Candlestick chart
- 44 / 50 / 200 SMA
- VWAP
- Volume
- 52-week high/low
- Multiple ranges/timeframes
- Session watchlist

Next:
1. Persistent watchlists
2. NSE symbol universe
3. Scanner engine
4. RS calculation
5. VCP scanner
6. 44 SMA scan condition
7. Pipscript/custom indicators
8. EOD data cache
9. Scanner results → chart navigation
