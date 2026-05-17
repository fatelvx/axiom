module AppEntry
path "app/main.py"
depends on Services
depends on Ui

module Domain
path "app/domain/**"

module Services
path "app/services/**"
depends on Domain

module Ui
path "app/ui/**"
depends on Domain
