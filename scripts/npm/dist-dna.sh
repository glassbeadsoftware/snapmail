#!/bin/bash
# Compile the WASM
cargo build --release --target wasm32-unknown-unknown --manifest-path submodules/snapmail-rsm/zomes/snapmail/Cargo.toml
# Pack DNAs
hc dna pack submodules/snapmail-rsm/workdir
cp submodules/snapmail-rsm/workdir/snapmail-dna.dna submodules/snapmail.dna
hc app pack submodules/snapmail-rsm/workdir
cp submodules/snapmail-rsm/workdir/snapmail-app.happ submodules/snapmail.happ
cp submodules/snapmail-rsm/workdir/snapmail-app.happ electron/bin/snapmail.happ
