module Hub
path "src/hub/**"
exposes "src/hub/index.ts"

module FeatureA
path "src/feature-a/**"
depends on Hub

module FeatureB
path "src/feature-b/**"
depends on Hub

module FeatureC
path "src/feature-c/**"
depends on Hub

module FeatureD
path "src/feature-d/**"
depends on Hub
