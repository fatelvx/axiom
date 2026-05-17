from fmt import format_amount
from order_engine import open_order
from trade_modals import TradeModal


def open_trade(symbol: str) -> str:
    modal = TradeModal(symbol)
    return format_amount(open_order(modal.symbol))
