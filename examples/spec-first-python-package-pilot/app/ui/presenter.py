from ..domain import Order


def render_order(order: Order) -> str:
    return f"{order.symbol}: {order.price}"
