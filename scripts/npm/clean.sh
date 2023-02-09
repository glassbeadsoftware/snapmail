#!/bin/bash

# TOP LEVEL
rm -rf bin
rm -rf artifacts
rm .hc_live*
# WEBCOMPONENTS
rm -rf webcomponents/dist
rm webcomponents/tsconfig.tsbuildinfo
# WE-APPLET
rm -rf we-applet/.rollup.cache/
rm -rf we-applet/out-tsc/
rm we-applet/dist/*.js
rm we-applet/dist/*.map
rm we-applet/.hc*
rm we-applet/tsconfig.tsbuildinfo
rm we-applet/webhapp.workdir/snapmail-we_applet.webhapp
# WEB-APP
rm -rf webapp/dist
rm -rf webapp/out-tsc
rm webapp/tsconfig.tsbuildinfo
# ELECTRON
rm -rf electron/out-builder
rm -rf electron/out-tsc
rm electron/bin/*
rm electron/web/*.js
rm electron/tsconfig.tsbuildinfo
# WE APPLET
rm -rf we-applet/out-tsc
rm we-applet/.hc_live*
