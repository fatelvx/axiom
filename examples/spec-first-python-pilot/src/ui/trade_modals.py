from fmt import format_amount


class TradeModal:
    def __init__(self, symbol: str) -> None:
        self.symbol = symbol

    def label(self) -> str:
        return format_amount(len(self.symbol))
