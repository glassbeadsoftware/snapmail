#!/bin/bash
# Compile the WASM
cargo build --release --target wasm32-unknown-unknown --manifest-path submodules/snapmail-rsm/Cargo.toml
# Pack DNAs
hc dna pack submodules/snapmail-rsm/workdir
hc app pack submodules/snapmail-rsm/workdir
cp submodules/snapmail-rsm/workdir/dSnapmail.dna artifacts/snapmail.dna
cp submodules/snapmail-rsm/workdir/hSnapmail.happ artifacts/snapmail.happ
cp artifacts/snapmail.happ electron/bin/snapmail.happ
