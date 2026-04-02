{
  description = "ironweb";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShell = pkgs.mkShell {
          buildInputs = [
            pkgs.prettier
            pkgs.nodejs_24
            (pkgs.yarn.override { nodejs = pkgs.nodejs_24; })
          ];
        };
      });
}
