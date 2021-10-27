# Start
cd build

# Generate Web UI
cd snapmail-ui
npm run prod
cp -r dist/* ../../ui
cd ..

# Done
cd ..
