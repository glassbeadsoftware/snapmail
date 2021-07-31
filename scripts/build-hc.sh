#!/bin/sh
# Script for building holochain and lair for linux / MacOs
# Holochain must have been downloaded first

cd build

## Holochain
cd holochain
cargo build --release -p holochain
cp target/release/holochain ../../bin/holochain-linux
cargo install --path crates/hc
cd ..

## Lair
cd lair
cargo build --release
cp target/release/lair-keystore ../../bin/lair-keystore-linux
cd ..

## Done
cd ..
