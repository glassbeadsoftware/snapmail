import plugins from './web-dev.plugins.mjs';

export default {
  port: 8081,
  watch: true,
  nodeResolve: {
    browser: true,
    preferBuiltins: false
  },
  appIndex: './dist/index.html',
  open: true,
  plugins,
};
