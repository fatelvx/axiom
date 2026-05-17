module AppEntry
path "main.py"
depends on Cogs
depends on Common

module Cogs
path "cogs/**"
depends on Common
depends on Ui
depends on Market
depends on Gacha

module Common
path "src/common/**"

module Gacha
path "src/gacha/**"
depends on Common

module Market
path "src/market/**"
depends on Common

module Ui
path "src/ui/**"
depends on Common
