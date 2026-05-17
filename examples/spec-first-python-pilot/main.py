import importlib

from utils import load_db


def main() -> dict:
    return load_db()


def load_default_cog() -> object:
    return importlib.import_module("cogs.trading")


def load_named_cog(module_name: str) -> object:
    return importlib.import_module(module_name)
