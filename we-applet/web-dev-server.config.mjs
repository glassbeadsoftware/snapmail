// import { hmrPlugin, presets } from '@open-wc/dev-server-hmr';
import { fromRollup } from "@web/dev-server-rollup";
import rollupReplace from "@rollup/plugin-replace";
import rollupCommonjs from "@rollup/plugin-commonjs";
import rollupBuiltins from 'rollup-plugin-node-builtins';
//import rollupGlobals from 'rollup-plugin-node-globals';

const replace = fromRollup(rollupReplace);
const commonjs = fromRollup(rollupCommonjs);
const builtins = fromRollup(rollupBuiltins);
//const globals = fromRollup(rollupGlobals);

const HAPP_BUILD_MODE = process.env.HAPP_BUILD_MODE? process.env.HAPP_BUILD_MODE : 'prod';
console.log("web-dev-server HAPP_BUILD_MODE =", HAPP_BUILD_MODE);

console.log("web-dev-server: process.env.APPLET_VIEW: ", process.env.APPLET_VIEW);
const APPLET_VIEW = process.env.APPLET_VIEW? process.env.APPLET_VIEW : "main";

/** Use Hot Module replacement by adding --hmr to the start command */
const hmr = process.argv.includes("--hmr");

export default /** @type {import('@web/dev-server').DevServerConfig} */ ({
  open: true,
  watch: !hmr,
  /** Resolve bare module imports */
  nodeResolve: {
    preferBuiltins: false,
    browser: true,
    exportConditions: ['browser', HAPP_BUILD_MODE === 'Debug' ? 'development' : ''],
  },

  /** Compile JS for older browsers. Requires @web/dev-server-esbuild plugin */
  // esbuildTarget: 'auto'

  /** Set appIndex to enable SPA routing */
  appIndex: "./index.html",
  rootDir: '../',
  clearTerminalOnReload: false,

  plugins: [
    replace({
      "preventAssignment": true,
      'process.env.HAPP_BUILD_MODE': JSON.stringify(HAPP_BUILD_MODE),
      'process.env.HAPP_ENV': JSON.stringify("DevtestWe"),
      'process.env.HC_APP_PORT': JSON.stringify(process.env.HC_PORT || 8888),
      'process.env.HC_ADMIN_PORT': JSON.stringify(process.env.ADMIN_PORT || 8889),
      '  COMB =': 'window.COMB =',
      delimiters: ["", ""],
    }),
    builtins(),
    commonjs(),
    /** Use Hot Module Replacement by uncommenting. Requires @open-wc/dev-server-hmr plugin */
    // hmr && hmrPlugin({ exclude: ['**/*/node_modules/**/*'], presets: [presets.litElement] }),
  ],

  // See documentation for all available options
});
