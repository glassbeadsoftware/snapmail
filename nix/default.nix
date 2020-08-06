{ holonix }:
{
 buildInputs = []
 ++ ( holonix.pkgs.callPackage ./snapmail { pkgs = holonix.pkgs; } ).buildInputs;
}
