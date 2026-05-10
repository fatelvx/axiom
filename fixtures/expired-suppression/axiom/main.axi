module Rendering
path "src/rendering/**"

module Simulation
path "src/simulation/**"
forbids module Rendering
suppresses forbidden_dependency to Rendering until 2000-01-01 because "legacy renderer migration"
