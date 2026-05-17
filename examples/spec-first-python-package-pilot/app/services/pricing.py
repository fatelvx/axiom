from ..domain import Order, make_order


def quote_order(symbol: str) -> Order:
    return make_order(symbol=symbol, price=len(symbol) * 10)
