REM Script for building Snapmail DNA and UI
cd build

REM Generate DNA
cd snapmail-rsm
call scripts/save_dna_hash
call scripts/pack-happ.bat
cp snapmail.dna ../../dna
cp snapmail.happ ../../dna
cp dna_hash.txt ../../dna
cd ..

REM Generate Web UI
cd snapmail-ui
call npm run %1
@echo on
cp -r dist/* ../../ui
cd ..

REM Done
cd ..
