from dataclasses import dataclass


@dataclass(frozen=True)
class Order:
    symbol: str
    price: int


def make_order(symbol: str, price: int) -> Order:
    return Order(symbol=symbol, price=price)
