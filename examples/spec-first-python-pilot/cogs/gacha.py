import gacha_engine
from fmt import format_amount


def pull_card() -> str:
    return format_amount(gacha_engine.roll_price())
