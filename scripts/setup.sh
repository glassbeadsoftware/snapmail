#!/bin/sh

# Script for setting up dev environment

RUN yes | npm install

# Create build Directory
rm -r build
mkdir build
cd build

# Generate DNA
git clone https://github.com/glassbeadsoftware/snapmail-rsm


# Generate Web UI
git clone https://github.com/glassbeadsoftware/snapmail-ui
cd snapmail-ui
npm install
cd ..

# Done
cd ..
