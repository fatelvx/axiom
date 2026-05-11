module Services
path "src/services/**"
exposes "src/services/index.ts"
hides "src/services/internal/**"
accepts hidden_reexport to Services until 2099-01-01 because "legacy public barrel cleanup"
