module UI
path "src/ui/**"
depends on Services

module Services
path "src/services/**"
exposes "src/services/index.ts"
hides "src/services/internal/**"
