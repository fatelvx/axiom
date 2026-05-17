from utils import load_db


def roll_price() -> int:
    return 10 if load_db()["ok"] else 0
