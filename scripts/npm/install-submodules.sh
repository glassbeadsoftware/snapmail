#!/bin/bash

# Script for downloading prebuilt submodule dependecies

echo Executing \"$0\".

hcversion=`cat ./package.json | grep hc-version | head -1 | awk -F: '{ print $2 }' | sed 's/[",]//g' | tr -d '[[:space:]]'`
echo hc-version: $hcversion

if [ "$hcversion" == "hc" ]; then
  echo Missing \"hc-version\" field in \"package.json\".
  exit 1
fi
echo \* Create 'submodules' folder
rm -rf submodules
mkdir submodules


cd submodules
echo \* Download latest DNA source code
git clone -b hc-$hcversion https://github.com/glassbeadsoftware/snapmail-rsm

echo \* Download latest install scripts
git clone --depth 1 https://github.com/ddd-mtl/hc-prebuilt

cd ..


echo
echo \* Done
