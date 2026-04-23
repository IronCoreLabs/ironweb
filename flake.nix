{
  description = "ironweb";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfreePredicate = pkg:
            builtins.elem (nixpkgs.lib.getName pkg) [ "google-chrome" ];
        };
      in
      {
        devShell = pkgs.mkShell {
          buildInputs = [
            pkgs.prettier
            pkgs.nodejs_24
            (pkgs.yarn.override { nodejs = pkgs.nodejs_24; })
            pkgs.google-chrome
            pkgs.chromedriver
          ];
        };
      });
}
