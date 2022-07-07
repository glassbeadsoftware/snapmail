#!/bin/bash
# Compile the WASM
cargo build --release --target wasm32-unknown-unknown --manifest-path submodules/snapmail-rsm/zomes/snapmail/Cargo.toml
# Pack DNAs
hc dna pack --output=bin/snapmail.dna submodules/snapmail-rsm/snapmail.dna.workdir
hc app pack --output=bin/snapmail.happ submodules/snapmail-rsm/snapmail.dna.workdir
