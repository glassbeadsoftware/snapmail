#!/bin/bash

# OUTDATED

# install dependencies
sudo apt-get install -y build-essential libssl-dev pkg-config

# install rust and webassembly
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup target install wasm32-unknown-unknown

