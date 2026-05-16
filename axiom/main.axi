layers Core -> Engine -> Interface

module CoreTypes
path "src/axi/constants.ts"
path "src/axi/types.ts"
layer Core
purpose "shared architecture contract and diagnostic types"

module Language
path "src/axi/parser.ts"
layer Engine
depends on CoreTypes
purpose "parse .axi text into typed declarations"

module Config
path "src/config/**"
layer Engine
depends on TextIO
purpose "load project discovery config"

module TextIO
path "src/fs/text.ts"
layer Engine
purpose "read generated text artifacts across common shell encodings"

module ValidatorCore
path "src/validator/glob.ts"
path "src/validator/couplingWarnings.ts"
path "src/validator/deepInternalImportWarnings.ts"
path "src/validator/intentionalDebt.ts"
path "src/validator/largeFilePressure.ts"
path "src/validator/ownership.ts"
path "src/validator/publicApiSurfaceWarnings.ts"
path "src/validator/validate.ts"
layer Engine
depends on CoreTypes
purpose "match source ownership and compare declared vs observed graphs"

module Discovery
path "src/fs/discover.ts"
layer Engine
depends on Config
depends on TextIO
depends on ValidatorCore
purpose "discover source and spec files"

module Scanner
path "src/scanner/**"
layer Engine
depends on CoreTypes
purpose "discover and resolve TypeScript and JavaScript imports"

module CheckRunner
path "src/validator/check.ts"
layer Engine
depends on CoreTypes
depends on Language
depends on Config
depends on Discovery
depends on Scanner
depends on TextIO
depends on ValidatorCore
purpose "orchestrate spec discovery, import scanning, and validation"

module Infer
path "src/infer/**"
layer Engine
depends on CoreTypes
depends on Config
depends on Discovery
depends on Scanner
depends on ValidatorCore
purpose "infer starter contracts from observed source graphs"

module Diagnostics
path "src/diagnostics/**"
layer Interface
depends on CoreTypes
depends on CheckRunner
depends on Infer
purpose "format validator, graph, and inference outputs"

module MCP
path "src/mcp/**"
layer Interface
purpose "define read-only MCP tool contracts and CLI adapter mappings over existing JSON evidence"

module CLI
path "src/cli.ts"
layer Interface
depends on Diagnostics
depends on Discovery
depends on CheckRunner
depends on Infer
depends on TextIO
purpose "provide command line entry points"
