#!/bin/bash
# Compile the WASM
cargo build --release --target wasm32-unknown-unknown --manifest-path build/snapmail-rsm/zomes/snapmail/Cargo.toml
# Pack DNAs
hc dna pack --output=dna/snapmail.dna build/snapmail-rsm/snapmail.dna.workdir
hc app pack --output=dna/snapmail.happ build/snapmail-rsm/snapmail.dna.workdir
