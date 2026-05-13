module App
path "src/app/**"
depends on ServicesCycle

module ServicesCycle
path "src/services/*"
path "src/services/sandbox/**"
path "src/store/*"
