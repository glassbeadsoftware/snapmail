#!/bin/bash

# TOP LEVEL
#rm -rf bin/*
#rm -rf submodules
rm -rf out-builder
rm -rf node_modules
rm package-lock.json
rm .hc_live*
# WEBCOMPONENTS
rm -rf webcomponents/dist
rm -rf webcomponents/node_modules
rm webcomponents/package-lock.json
rm webcomponents/tsconfig.tsbuildinfo
# WEB-APP
rm -rf webapp/dist
rm -rf webapp/out-tsc
rm -rf webapp/node_modules
rm webapp/package-lock.json
rm webapp/tsconfig.tsbuildinfo
rm webapp/package-lock.json
rm webapp/ui.zip
# ELECTRON
rm -rf electron/out-tsc
rm -rf electron/node_modules
rm electron/package-lock.json
# WE APPLET
rm -rf we-applet/out-tsc
rm -rf we-applet/node_modules
rm we-applet/package-lock.json
rm we-applet/.hc_live*
