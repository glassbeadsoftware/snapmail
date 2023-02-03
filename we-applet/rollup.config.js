import nodeResolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

// import builtins from "rollup-plugin-node-builtins";
// import globals from "rollup-plugin-node-globals";

import babel from "@rollup/plugin-babel";
//import { importMetaAssets } from "@web/rollup-plugin-import-meta-assets";
//import { terser } from "rollup-plugin-terser";
//import copy from "rollup-plugin-copy";

//const DEV_MODE = process.env.DEV_MODE || "prod";
//const HC_PORT = process.env.HC_PORT || 8888;

const DIST_FOLDER = "dist"


export default {
  input: "dist/index.js",
  output: {
    format: "es",
    dir: DIST_FOLDER,
    sourcemap: false
  },
  watch: {
    clearScreen: false,
  },
  external: [],

  plugins: [
    /** Resolve bare module imports */
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    typescript({ experimentalDecorators: true, outDir: DIST_FOLDER }),
    // copy({
    //   targets: [{ src: "icon.png", dest: "dist" }],
    // }),
    /** Minify JS */
    //terser(),
    /** Bundle assets references via import.meta.url */
    //importMetaAssets(),
    /** Compile JS to a lower language target */
    babel({
      exclude: /node_modules/,

      babelHelpers: "bundled",
      presets: [
        [
          require.resolve("@babel/preset-env"),
          {
            targets: [
              "last 3 Chrome major versions",
              "last 3 Firefox major versions",
              "last 3 Edge major versions",
              "last 3 Safari major versions",
            ],
            modules: false,
            bugfixes: true,
          },
        ],
      ],
      plugins: [
        [
          require.resolve("babel-plugin-template-html-minifier"),
          {
            modules: {
              lit: ["html", { name: "css", encapsulation: "style" }],
            },
            failOnError: false,
            strictCSS: true,
            htmlMinifier: {
              collapseWhitespace: true,
              conservativeCollapse: true,
              removeComments: true,
              caseSensitive: true,
              minifyCSS: true,
            },
          },
        ],
      ],
    }),
    commonjs({}),
  ],
};
