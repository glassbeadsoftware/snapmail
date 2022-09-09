#!/bin/sh
echo
echo \* Setup dev environment
npm install


echo
echo \* Create 'submodules' folder
rm -rf submodules
mkdir submodules

cd submodules
echo \* Download latest DNA source code
git clone https://github.com/glassbeadsoftware/snapmail-rsm
cd ..

pwd
./scripts/copy-binaries.sh

echo
echo \* Done

