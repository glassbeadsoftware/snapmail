#!/bin/sh

cd build

# Compile the WASM
cd snapmail-rsm
cargo build --release --target wasm32-unknown-unknown
cd ..
# Compile the exe
cd hash_zome
cargo build --release
cd ..
# Compute hash of zome
value=`./hash_zome/target/release/hash_zome ./snapmail-rsm/target/wasm32-unknown-unknown/snapmail.wasm`
echo "$value" > zome_hash.txt
echo
echo "SNAPMAIL ZOME HASH = $value"
