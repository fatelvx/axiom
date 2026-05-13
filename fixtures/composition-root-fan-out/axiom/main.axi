module AppEntry
path "src/main.ts"
depends on Engine
depends on Render
depends on Ui
depends on Phases

module Engine
path "src/engine/**"

module Render
path "src/render/**"

module Ui
path "src/ui/**"

module Phases
path "src/phases/**"
