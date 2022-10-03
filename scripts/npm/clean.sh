#!/bin/bash

# TOP LEVEL
#rm -rf bin/*
#rm -rf submodules
rm -rf out-builder
rm .hc_live*
# WEBCOMPONENTS
rm -rf webcomponents/dist
rm webcomponents/tsconfig.tsbuildinfo
# WEB-APP
rm -rf webapp/dist
rm -rf webapp/out-tsc
rm webapp/tsconfig.tsbuildinfo
rm webapp/ui.zip
# ELECTRON
rm -rf electron/out-tsc
rm electron/bin/*
rm electron/web/*.js
rm electron/tsconfig.tsbuildinfo
# WE APPLET
rm -rf we-applet/out-tsc
rm we-applet/.hc_live*
