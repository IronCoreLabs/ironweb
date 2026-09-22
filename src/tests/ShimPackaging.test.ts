import * as fs from "fs";
import * as path from "path";

/**
 * The shim is published as plain tsc output (`main`/`module` point at commonjs/es, not the UMD bundle), so its
 * bare imports stay as runtime requires and have to be declared. `.github/scripts/build.js` builds that declaration
 * from the root package.json `peerDependencies` block, not from `dependencies` — `dependencies` feeds the frame,
 * which additionally pulls in Recrypt and the WASM binding that shim consumers should never download.
 */
const SHIM_DEPENDENCY_FIELD = "peerDependencies";

const REPO_ROOT = path.join(__dirname, "..", "..");

/**
 * The files that end up in the published shim: everything tsc emits under src/, minus src/frame (deleted after
 * compile) and the `tests` directories (removed by `yarn run cleanTest`). Declaration files never emit.
 */
function shimSourceFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== "frame" && entry.name !== "tests") {
                files.push(...shimSourceFiles(entryPath));
            }
        } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
            files.push(entryPath);
        }
    }
    return files;
}

/**
 * Specifiers that survive into the emitted JS. `import type` statements are dropped first so they don't count;
 * that syntax is what makes the distinction visible without type information.
 */
function runtimeSpecifiers(source: string): string[] {
    const withoutTypeImports = source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "").replace(/\bimport\s+type\b[^"]*"[^"]+"/g, "");
    const specifiers: string[] = [];
    const pattern = /\b(?:from|import|require)\s*\(?\s*"([^"]+)"/g;
    let match = pattern.exec(withoutTypeImports);
    while (match !== null) {
        specifiers.push(match[1]);
        match = pattern.exec(withoutTypeImports);
    }
    return specifiers;
}

describe("shim packaging", () => {
    it("declares every package the published shim imports at runtime", () => {
        const declared = Object.keys(JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"))[SHIM_DEPENDENCY_FIELD] || {});

        const undeclared = new Map<string, string[]>();
        for (const file of shimSourceFiles(path.join(REPO_ROOT, "src"))) {
            const source = fs.readFileSync(file, "utf8");
            for (const specifier of runtimeSpecifiers(source)) {
                //A scoped package's import path can go deeper than the package name, e.g. "@scope/pkg/sub".
                const packageName = specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0];
                if (!specifier.startsWith(".") && declared.indexOf(packageName) === -1) {
                    undeclared.set(packageName, (undeclared.get(packageName) || []).concat(path.relative(REPO_ROOT, file)));
                }
            }
        }

        expect(Array.from(undeclared.entries())).toEqual([]);
    });

    it("finds the shim sources it is meant to be scanning", () => {
        const files = shimSourceFiles(path.join(REPO_ROOT, "src")).map((file) => path.relative(REPO_ROOT, file));

        expect(files).toContain(path.join("src", "shim", "index.ts"));
        expect(files).toContain(path.join("src", "lib", "Utils.ts"));
        expect(files.filter((file) => file.indexOf(`${path.sep}frame${path.sep}`) !== -1)).toEqual([]);
        expect(files.filter((file) => file.indexOf(`${path.sep}tests${path.sep}`) !== -1)).toEqual([]);
    });
});
