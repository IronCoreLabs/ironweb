import * as fs from "fs";
import * as path from "path";
//A `require` keeps the build module out of the tsc program, which would otherwise re-root the shim emit under dist/shim/*/src.
const {shimDependencies} = require("../../.github/scripts/shimDependencies");

const SRC = path.join(__dirname, "..");
const mainPackage = JSON.parse(fs.readFileSync(path.join(SRC, "..", "package.json"), "utf8"));

describe("shim packaging", () => {
    it("declares every runtime import of the shim as a caret range on the root package.json pin", () => {
        const dependencies = shimDependencies(SRC, mainPackage.dependencies);

        expect(dependencies.futurejs).toEqual(`^${mainPackage.dependencies.futurejs}`);
        expect(Object.keys(dependencies)).not.toContain("@ironcorelabs/recrypt-wasm-binding");
    });

    it("fails when the shim requires a package the root does not pin", () => {
        const withoutFuture = {...mainPackage.dependencies, futurejs: undefined};

        expect(() => shimDependencies(SRC, withoutFuture)).toThrow(/futurejs \(.*FrameMediator\.ts/);
    });
});
