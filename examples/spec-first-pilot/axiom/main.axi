layers Domain -> Application -> UI

module Domain
path "src/domain/**"
layer Domain
exposes "src/domain/index.ts"
purpose "Pure domain records and transformations with no application or UI dependency."

module Application
path "src/application/**"
layer Application
depends Domain
exposes "src/application/index.ts"
hides "src/application/internal/**"
purpose "Application use cases and public coordination over domain records."

module UI
path "src/ui/**"
layer UI
depends Application
purpose "User-facing rendering that calls application use cases through the public boundary."
