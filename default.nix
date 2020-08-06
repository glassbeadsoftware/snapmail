# This is an example of what downstream consumers of holonix should do
# This is also used to dogfood as many commands as possible for holonix
# For example the release process for holonix uses this file
let

 # point this to your local config.nix file for this project
 # example.config.nix shows and documents a lot of the options
 config = import ./config.nix;

 # START HOLONIX IMPORT BOILERPLATE
 holonix = import (
  if ! config.holonix.use-github
  then config.holonix.local.path
  else fetchTarball {
   url = "https://github.com/${config.holonix.github.owner}/${config.holonix.github.repo}/tarball/${config.holonix.github.ref}";
   sha256 = config.holonix.github.sha256;
  }
 ) { config = config; };
 # END HOLONIX IMPORT BOILERPLATE

 libs = if holonix.pkgs.stdenv.isDarwin then [] else [
  holonix.pkgs.glib
  holonix.pkgs.xorg.libX11
  holonix.pkgs.xorg.libxcb
  holonix.pkgs.xorg.libXcomposite
  holonix.pkgs.xorg.libXcursor
  holonix.pkgs.xorg.libXdamage
  holonix.pkgs.xorg.libXext
  holonix.pkgs.xorg.libXfixes
  holonix.pkgs.xorg.libXi
  holonix.pkgs.xorg.libXrender
  holonix.pkgs.xorg.libXtst
  holonix.pkgs.xorg.libXrandr
  holonix.pkgs.xorg.libXScrnSaver
  holonix.pkgs.nss
  holonix.pkgs.nspr
  holonix.pkgs.gdk-pixbuf
  holonix.pkgs.gtk3
  holonix.pkgs.pango
  holonix.pkgs.atk
  holonix.pkgs.cairo
  holonix.pkgs.dbus
  holonix.pkgs.expat
  holonix.pkgs.libuuid
  holonix.pkgs.alsaLib
  holonix.pkgs.at-spi2-atk
  holonix.pkgs.at-spi2-core
  holonix.pkgs.cups
 ];

in
with holonix.pkgs;
{
 dev-shell = stdenv.mkDerivation (holonix.shell // {
  name = "dev-shell";

  shellHook = holonix.pkgs.lib.concatStrings [''
  ${holonix.pkgs.nodejs}/bin/npm install
  export PATH="$PATH:$( ${holonix.pkgs.nodejs}/bin/npm bin )"
  export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:"${holonix.pkgs.stdenv.lib.makeLibraryPath libs}"
  ''
  holonix.shell.shellHook
  ];

  buildInputs = [
   holonix.pkgs.nodejs
   holonix.pkgs.unzip
   holonix.pkgs.glib
   ]
   ++ holonix.shell.buildInputs
   ++ config.buildInputs
   ++ (holonix.pkgs.callPackage ./nix {
    holonix = holonix;
   }).buildInputs
  ;
 });
}
