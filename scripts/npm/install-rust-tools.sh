#!/bin/bash

rustc --version

### ts-bindings
# KEEP THIS IN SYNC
cargo install zits --version 1.6.0


### install wasm32 compilation target

#rustup install 1.65.0
#rustup override set 1.65.0

rustup target install wasm32-unknown-unknown

