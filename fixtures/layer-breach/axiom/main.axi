layers Core -> UI

module Rendering
path "src/rendering/**"
layer UI

module Simulation
path "src/simulation/**"
layer Core
depends Rendering
