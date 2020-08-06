{ pkgs }:
let
 bundle-dna = (pkgs.writeShellScriptBin "snapmail-bundle-dna" ''
  rm -rf dna
  # an optional first argument should be the version number you want
  # default to 0.0.2
  echo "fetching DNA from https://github.com/glassbeadsoftware/snapmail-dna/releases/download/v''${1:-0.0.2}/snapmail-dna.dna.json"
  curl -O -L https://github.com/glassbeadsoftware/snapmail-dna/releases/download/v''${1:-0.0.2}/snapmail-dna.dna.json
  mkdir dna
  mv snapmail-dna.dna.json dna/snapmail-dna.dna.json
  # hash the dna, and pipe the cleaned output into the gitignored snapmail_dna_address file
  hc hash --path dna/snapmail-dna.dna.json | awk '/DNA Hash: /{print $NF}' | tr -d '\n' > snapmail_dna_address
 '');

 bundle-ui = (pkgs.writeShellScriptBin "snapmail-bundle-ui" ''
  rm -rf ui
  mkdir ui
  # an optional first argument should be the version number you want
  # default to 0.0.2
  curl -O -L https://github.com/glassbeadsoftware/snapmail-ui/releases/download/v''${1:-0.0.2}/snapmail-ui.zip
  # unzip into the ./ui folder
  unzip snapmail-ui.zip -d ui
  rm snapmail-ui.zip
 '');

 reset = (pkgs.writeShellScriptBin "snapmail-reset" ''
  set -euxo pipefail
  rm -rf ./ui
  rm -rf ./dna
  rm -rf ./Snapmail-*
  rm -rf $HOME/.config/Snapmail
  rm -rf $HOME/Library/Application\ Support/Snapmail
  rm -rf ./node_modules
 '');

 pre-build = (pkgs.writeShellScriptBin "snapmail-pre-build" ''
  ${pkgs.nodejs}/bin/npm install
 '');

 fetch-bins = (pkgs.writeShellScriptBin "snapmail-fetch-bins" ''
  set -euxo pipefail
  echo 'fetching package-able holochain and hc binaries'
  echo 'this command expects apple-darwin or generic-linux-gnu to be passed as first argument'
  echo 'this command optionally can be passed holochain-rust tag as second argument'
  PLATFORM=''${1}
  VERSION=''${2:-v0.0.51-alpha1}
  HC=cli-$VERSION-x86_64-$PLATFORM.tar.gz
  HOLOCHAIN=holochain-$VERSION-x86_64-$PLATFORM.tar.gz
  curl -O -L https://github.com/holochain/holochain-rust/releases/download/$VERSION/$HC
  curl -O -L https://github.com/holochain/holochain-rust/releases/download/$VERSION/$HOLOCHAIN
  tar -xzvf $HC ./hc
  tar -xzvf $HOLOCHAIN ./holochain
  rm $HC
  rm $HOLOCHAIN
 '');

 macos-fix-dylibs = (pkgs.writeShellScriptBin "snapmail-macos-fix-dylibs" ''
  set -euxo pipefail
  echo 'fixing the dynamic linking of hc and holochain'
  echo 'based on: otool -L hc'
  install_name_tool -change /nix/store/qjf3nf4qa8q62giagjwdmdbjqni983km-Libsystem-osx-10.12.6/lib/libSystem.B.dylib /usr/lib/libSystem.B.dylib hc
  install_name_tool -change /nix/store/qnzg5xh5qw84gqrhh7aysycp92bxinms-pcre-8.43/lib/libpcre.1.dylib /usr/lib/libpcre.0.dylib hc
  install_name_tool -change /nix/store/qjf3nf4qa8q62giagjwdmdbjqni983km-Libsystem-osx-10.12.6/lib/libresolv.9.dylib /usr/lib/libresolv.9.dylib hc
  # note this is a slight hack, with unforeseen consequences?
  # because its a different lib? libiconv.dylib > libiconv.2.dylib
  install_name_tool -change /nix/store/cib1v4zhizcjwkr96753n87ssm3nsfkm-libiconv-osx-10.12.6/lib/libiconv.dylib /usr/lib/libiconv.2.dylib hc
  echo 'based on: otool -L holochain'
  install_name_tool -change /nix/store/qjf3nf4qa8q62giagjwdmdbjqni983km-Libsystem-osx-10.12.6/lib/libSystem.B.dylib /usr/lib/libSystem.B.dylib holochain
  install_name_tool -change /nix/store/qnzg5xh5qw84gqrhh7aysycp92bxinms-pcre-8.43/lib/libpcre.1.dylib /usr/lib/libpcre.0.dylib holochain
  install_name_tool -change /nix/store/qjf3nf4qa8q62giagjwdmdbjqni983km-Libsystem-osx-10.12.6/lib/libresolv.9.dylib /usr/lib/libresolv.9.dylib holochain
  # note this is a slight hack, with unforeseen consequences?
  # because its a different lib? libiconv.dylib > libiconv.2.dylib
  install_name_tool -change /nix/store/cib1v4zhizcjwkr96753n87ssm3nsfkm-libiconv-osx-10.12.6/lib/libiconv.dylib /usr/lib/libiconv.2.dylib holochain
 '');

 build-linux = (pkgs.writeShellScriptBin "snapmail-build-linux" ''
  ${pre-build}/bin/snapmail-pre-build
  snapmail_platform=''${1:-linux}
  snapmail_arch=''${2:-x64}
  ${fetch-bins}/bin/snapmail-fetch-bins generic-linux-gnu
  electron-packager . Snapmail --platform=$snapmail_platform --arch=$snapmail_arch --overwrite --prune=true
  chmod +x ./Snapmail-$snapmail_platform-$snapmail_arch/Snapmail
 '');

 build-mac = (pkgs.writeShellScriptBin "snapmail-build-mac" ''
  ${pre-build}/bin/snapmail-pre-build
  ${fetch-bins}/bin/snapmail-fetch-bins apple-darwin
  ${macos-fix-dylibs}/bin/snapmail-macos-fix-dylibs
  electron-packager . Snapmail --platform=darwin --arch=x64 --overwrite --prune=true --icon=\"ui/assets/snapmail-logo.icns\" --osx-sign.hardenedRuntime=true --osx-sign.gatekeeperAssess=false --osx-sign.entitlements=entitlements.mac.plist --osx-sign.entitlements-inherit=entitlements.mac.plist --osx-sign.type=distribution --osx-sign.identity=\"$APPLE_DEV_IDENTITY\" --osx-notarize.apple-id=\"$APPLE_ID_EMAIL\" --osx-notarize.apple-id-password=\"$APPLE_ID_PASSWORD\"
 '');

 build-mac-unsigned = (pkgs.writeShellScriptBin "snapmail-build-mac-unsigned" ''
  ${pre-build}/bin/snapmail-pre-build
  ${fetch-bins}/bin/snapmail-fetch-bins apple-darwin
  ${macos-fix-dylibs}/bin/snapmail-macos-fix-dylibs
  electron-packager . Snapmail --platform=darwin --arch=x64 --overwrite --prune=true --icon=\"ui/assets/snapmail-logo.icns\"
 '');

 snapmail = (pkgs.writeShellScriptBin "snapmail" ''
  ${pkgs.nodejs}/bin/npm install
  ${pkgs.electron_6}/bin/electron .
 '');
in
{
 buildInputs = [
  bundle-dna
  bundle-ui
  reset
  fetch-bins
  macos-fix-dylibs
  build-linux
  build-mac
  build-mac-unsigned
  snapmail
 ];
}
