from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..domain import Order


def render_order(order: "Order") -> str:
    return f"{order.symbol}: {order.price}"
