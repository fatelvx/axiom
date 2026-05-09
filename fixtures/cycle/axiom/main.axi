module A
path "src/a/**"
depends B

module B
path "src/b/**"
depends A
