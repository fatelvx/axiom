module Services
path "src/services/**"
exposes "src/services/index.ts"
exposes "src/services/public.ts"
hides "src/services/internal/**"
accepts hidden_reexport to Services at "src/services/index.ts" until 2099-01-01 because "legacy index barrel cleanup"
