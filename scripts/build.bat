REM Script for building Snapmail DNA and UI
cd build

REM Generate DNA
REM cd snapmail-rsm
REM call scripts/save_dna_hash
REM call scripts/pack-happ.bat
REM cp snapmail.dna ../../dna
REM cp snapmail.happ ../../dna
REM cp dna_hash.txt ../../dna
REM cd ..

REM Generate Web UI
cd snapmail-ui
call npm run %1
@echo on
cp -r dist/* ../../ui
cd ..

REM Done
cd ..
