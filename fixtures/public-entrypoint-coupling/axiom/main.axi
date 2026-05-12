module Services
path "src/services/**"
exposes "src/services/index.ts"

module UI
path "src/ui/**"
depends on Services
