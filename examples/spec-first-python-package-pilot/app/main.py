from .services.pricing import quote_order
from .ui.presenter import render_order


def run_demo(symbol: str) -> str:
    order = quote_order(symbol)
    return render_order(order)
