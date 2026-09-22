import * as fs from "fs";
import * as os from "os";
import * as path from "path";
//A `require` keeps the build module out of the tsc program, which would otherwise re-root the shim emit under dist/shim/*/src.
const {shimDependencies} = require("../../.github/scripts/shimDependencies");

const ROOT_DEPENDENCIES = {"@ironcorelabs/recrypt-wasm-binding": "0.7.1", "@stablelib/utf8": "1.0.1", "base64-js": "1.5.1", futurejs: "2.2.1"};

let buildOutput: string;

/**
 * Writes a file into a stand-in for the build output, which is laid out like dist/shim/commonjs.
 */
function emit(relativePath: string, source: string) {
    const file = path.join(buildOutput, relativePath);
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, source);
}

function entryPoint() {
    return path.join(buildOutput, "shim", "index.js");
}

beforeEach(() => {
    buildOutput = fs.mkdtempSync(path.join(os.tmpdir(), "shim-packaging-"));
});

afterEach(() => {
    fs.rmSync(buildOutput, {recursive: true, force: true});
});

describe("shimDependencies", () => {
    it("follows relative requires from the entry point, pinning each package to a caret on the root version", () => {
        emit("shim/index.js", 'require("futurejs");\nrequire("../lib/Utils");');
        emit("lib/Utils.js", 'require("base64-js");\nrequire("@stablelib/utf8");');

        expect(shimDependencies(entryPoint(), ROOT_DEPENDENCIES)).toEqual({
            "@stablelib/utf8": "^1.0.1",
            "base64-js": "^1.5.1",
            futurejs: "^2.2.1",
        });
    });

    it("ignores files the entry point cannot reach", () => {
        emit("shim/index.js", 'require("futurejs");');
        emit("frame/worker/index.js", 'require("@ironcorelabs/recrypt-wasm-binding");');
        emit("lib/tests/Utils.test.js", 'require("@ironcorelabs/recrypt-wasm-binding");');

        expect(shimDependencies(entryPoint(), ROOT_DEPENDENCIES)).toEqual({futurejs: "^2.2.1"});
    });

    it("ignores the word require in comments and string literals", () => {
        emit("shim/index.js", '//we could require("@ironcorelabs/recrypt-wasm-binding") here\nconst s = \'require("base64-js")\';\nrequire("futurejs");');

        expect(shimDependencies(entryPoint(), ROOT_DEPENDENCIES)).toEqual({futurejs: "^2.2.1"});
    });

    it("resolves a require of a directory to its index", () => {
        emit("shim/index.js", 'require("../lib");');
        emit("lib/index.js", 'require("futurejs");');

        expect(shimDependencies(entryPoint(), ROOT_DEPENDENCIES)).toEqual({futurejs: "^2.2.1"});
    });

    it("visits a module required down two paths exactly once", () => {
        emit("shim/index.js", 'require("./SDK");\nrequire("../lib/Utils");');
        emit("shim/SDK.js", 'require("../lib/Utils");');
        emit("lib/Utils.js", 'require("futurejs");');

        expect(shimDependencies(entryPoint(), ROOT_DEPENDENCIES)).toEqual({futurejs: "^2.2.1"});
    });

    it("passes a root pin that is not a bare version through untouched", () => {
        emit("shim/index.js", 'require("futurejs");');

        expect(shimDependencies(entryPoint(), {futurejs: "github:IronCoreLabs/futurejs#main"})).toEqual({futurejs: "github:IronCoreLabs/futurejs#main"});
    });

    it("reduces a deep scoped import path to the package name", () => {
        emit("shim/index.js", 'require("@stablelib/utf8/lib/deep");');

        expect(shimDependencies(entryPoint(), ROOT_DEPENDENCIES)).toEqual({"@stablelib/utf8": "^1.0.1"});
    });

    it("names the package and the file requiring it when the root does not pin it", () => {
        emit("shim/index.js", 'require("../lib/Utils");');
        emit("lib/Utils.js", 'require("left-pad");');

        expect(() => shimDependencies(entryPoint(), ROOT_DEPENDENCIES)).toThrow(/left-pad \(.*Utils\.js/);
    });

    it("reports a relative require with no file behind it", () => {
        emit("shim/index.js", 'require("./Missing");');

        expect(() => shimDependencies(entryPoint(), ROOT_DEPENDENCIES)).toThrow(/does not exist in the build output/);
    });
});
