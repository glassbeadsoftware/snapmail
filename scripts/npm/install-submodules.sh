#!/bin/bash

echo \* Create 'submodules' folder
rm -rf submodules
mkdir submodules


cd submodules
echo \* Download latest DNA source code
git clone https://github.com/glassbeadsoftware/snapmail-rsm

echo \* Download latest install scripts
git clone --depth 1 https://github.com/ddd-mtl/hc-prebuilt

cd ..


echo
echo \* Done
