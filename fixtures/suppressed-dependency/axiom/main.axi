module Rendering
path "src/rendering/**"

module Simulation
path "src/simulation/**"
forbids module Rendering
accepts forbidden_dependency to Rendering until 2099-01-01 because "legacy renderer migration"
