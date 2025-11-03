//roll up config
import path from "path";
import typescript from "rollup-plugin-typescript2";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import replace from "@rollup/plugin-replace";

// Use import.meta.url to get the current directory equivalent to __dirname in ES modules
const __dirname = path.resolve();

export default {
  input: "src/app.ts",
  output: [
    {
      entryFileNames: "bundle.mjs",
      dir: "dist/esm",
      format: "esm",
      sourcemap: true,
    },
    {
      entryFileNames: "bundle.cjs",
      dir: "dist/cjs",
      format: "cjs",
      sourcemap: true,
    },
  ],
  plugins: [
    replace({
      preventAssignment: true,
      values: {
        __dirname: JSON.stringify(path.resolve()), // or a more specific path
      },
    }),
    json(),
    nodeResolve({
      extensions: [".ts", ".js", ".json"],
      preferBuiltins: true,
      mainFields: ["exports", "module", "main"], // Handle module resolution for ESM
    }),

    typescript({
      tsconfig: path.resolve(__dirname, "tsconfig.json"),
      useTsconfigDeclarationDir: true,
    }),

    commonjs(),
  ],
  treeshake: true,
  onwarn(warning, warn) {
    if (warning.code === "CIRCULAR_DEPENDENCY") return;
    warn(warning);
  },
};
