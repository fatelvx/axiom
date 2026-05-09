module Physics
path "src/physics/**"
layer Core

module Rendering
path "src/rendering/**"
layer UI

module Simulation
path "src/simulation/**"
layer Core
depends Physics
forbids module Rendering
purpose "deterministic physics simulation"
