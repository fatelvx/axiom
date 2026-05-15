layers Core -> Runtime -> UI

module Contracts
path "src/contracts/**"
layer Core
exposes "src/contracts/index.ts"
purpose "Shared service and store contracts with no runtime or UI dependency."

module Services
path "src/services/**"
layer Runtime
depends Contracts
exposes "src/services/index.ts"
hides "src/services/internal/**"
purpose "Runtime service behavior exposed through a reviewed public entry point."

module Store
path "src/store/**"
layer Runtime
depends Contracts
exposes "src/store/index.ts"
hides "src/store/internal/**"
purpose "Application state exposed through a reviewed public entry point."

module Hooks
path "src/hooks/**"
layer UI
depends Services
depends Store
purpose "UI-facing hooks that coordinate through public service and store boundaries."

module Components
path "src/components/**"
layer UI
depends Services
depends Store
accepts hidden_import to Services at "src/components/LegacySettingsBridge.ts" until 2099-01-01 because "legacy settings panel still reads internal service status during boundary migration"
purpose "UI components that should call services and store through public entry points."
