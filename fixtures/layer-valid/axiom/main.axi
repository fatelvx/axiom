layers Core -> UI

module Physics
path "src/physics/**"
layer Core

module Rendering
path "src/rendering/**"
layer UI
depends Physics
