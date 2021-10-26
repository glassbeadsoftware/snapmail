#!/bin/bash
# Compile the WASM
cargo build --release --target wasm32-unknown-unknown --manifest-path build/snapmail-rsm/zomes/Cargo.toml
# Pack DNAs
hc dna pack --output=dna/snapmail.dna build/snapmail-rsm/snapmail.dna.workdir
