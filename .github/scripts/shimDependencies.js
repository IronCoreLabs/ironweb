const fs = require("fs");
const path = require("path");
const ts = require("typescript");

/**
 * Everything tsc emits under src/ minus src/frame (deleted after compile) and `tests` directories (removed by `yarn run cleanTest`).
 * @param {string} dir
 * @returns {string[]}
 */
function shimSourceFiles(dir) {
    const files = [];
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
 * Transpiled to CommonJS first so type-only imports are elided as in the real build.
 * @param {string} file
 * @returns {string[]}
 */
function runtimePackages(file) {
    const {outputText} = ts.transpileModule(fs.readFileSync(file, "utf8"), {
        fileName: file,
        compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2015},
    });
    const packages = [];
    const pattern = /\brequire\("([^"]+)"\)/g;
    let match = pattern.exec(outputText);
    while (match !== null) {
        const specifier = match[1];
        if (!specifier.startsWith(".")) {
            packages.push(specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0]);
        }
        match = pattern.exec(outputText);
    }
    return packages;
}

/**
 * `dependencies` for the published shim: every package the shim sources require at runtime, as a caret range on the
 * root package.json pin. Throws if the shim requires a package the root does not pin.
 * @param {string} srcDir
 * @param {Record<string, string>} rootDependencies
 * @returns {Record<string, string>}
 */
function shimDependencies(srcDir, rootDependencies) {
    const dependencies = {};
    const missing = new Map();
    for (const file of shimSourceFiles(srcDir)) {
        for (const packageName of runtimePackages(file)) {
            const pin = rootDependencies[packageName];
            if (pin) {
                dependencies[packageName] = /^\d/.test(pin) ? `^${pin}` : pin;
            } else {
                missing.set(packageName, (missing.get(packageName) || []).concat(path.relative(srcDir, file)));
            }
        }
    }
    if (missing.size > 0) {
        const detail = Array.from(missing.entries())
            .map(([packageName, files]) => `${packageName} (${files.join(", ")})`)
            .join("; ");
        throw new Error(`Shim sources require packages that are not in the root package.json dependencies: ${detail}`);
    }
    return Object.fromEntries(Object.entries(dependencies).sort(([a], [b]) => a.localeCompare(b)));
}

module.exports = {shimDependencies, shimSourceFiles};
