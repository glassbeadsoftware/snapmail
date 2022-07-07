#!/bin/sh
echo
echo \* Setup dev environment
npm install


echo
echo \* Create 'submodules' folder
rm -rf submodules
mkdir submodules
cd submodules


echo
echo \* Download latest DNA source code
git clone https://github.com/glassbeadsoftware/snapmail-rsm


echo
echo \* Download and set up latest UI source code
git clone https://github.com/glassbeadsoftware/snapmail-ui
cd snapmail-ui
npm install
cd ..
cd ..

pwd
./scripts/copy-binaries.sh

echo
echo \* Done

