layers Domain -> App -> UI

module Domain
path "src/domain/**"
layer Domain
exposes "src/domain/index.ts"
purpose "shared business types and domain helpers"

module Services
path "src/services/**"
layer App
depends on Domain
exposes "src/services/index.ts"
hides "src/services/internal/**"
purpose "application services exposed through a public entry point"

module UI
path "src/ui/**"
layer UI
depends on Services
purpose "screens and view models"
