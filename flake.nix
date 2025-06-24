{
  description = "ironweb";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      rec {
        devShell = pkgs.mkShell {
          buildInputs = with pkgs.nodePackages; [
            pkgs.nodejs_20
            (pkgs.yarn.override { nodejs = pkgs.nodejs_20; })
          ];
        };
      });
}
