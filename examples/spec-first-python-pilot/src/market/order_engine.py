from utils import load_db


def open_order(symbol: str) -> int:
    return len(symbol) if load_db()["ok"] else 0
