#!/bin/sh
echo
echo \* Setup dev environment
npm install


echo
echo \* Create 'build' folder
rm -r build
mkdir build
cd build


echo
echo \* Download latest DNA source code
git clone https://github.com/glassbeadsoftware/snapmail-rsm


echo
echo \* Download and set up latest UI source code
git clone https://github.com/glassbeadsoftware/snapmail-ui
cd snapmail-ui
npm install
cd ..


echo
echo \* Done
cd ..
