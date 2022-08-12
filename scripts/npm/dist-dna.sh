#!/bin/bash
# Compile the WASM
cargo build --release --target wasm32-unknown-unknown --manifest-path submodules/snapmail-rsm/zomes/snapmail/Cargo.toml
# Pack DNAs
hc dna pack submodules/snapmail-rsm/workdir
cp submodules/snapmail-rsm/workdir/snapmail-dna.dna bin/snapmail.dna
hc app pack submodules/snapmail-rsm/workdir
cp submodules/snapmail-rsm/workdir/snapmail-app.happ bin/snapmail.happ
