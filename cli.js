const { spawnSync } = require('child_process');
const path = require('path');


/**
 *
 * @returns {string}
 */
function executablePath() {
  let executable;
  if (process.platform === "win32") {
    return process.env.comspec;
  }
  if (process.platform === "darwin") {
    executable = "./hc-darwin"
  } else if (process.platform === "linux") {
    executable = "./hc-linux"
  } else {
    log('error', "unsupported platform: " + process.platform);
    return
  }
  return path.join(__dirname, executable)
}
module.exports.executablePath = executablePath;


/**
 * On windows, call `wsl wslpath` on filePath to convert it to a wsl compatible filepath usable within wsl
 * @param filePath
 * @returns {string|*}
 */
function wslPath(filePath) {
  if (process.platform !== "win32") {
    return filePath;
  }
  let fp = filePath.replace(/\\/g, "\\\\");
  let wslparams = ["/c", "wsl", "wslpath", "-a", fp];
  let { stdout, stderr, error } = spawnSync(
    process.env.comspec,
    wslparams,
    {cwd: __dirname}
  );
  stderr = stderr? stderr.toString() : "";
  stdout = stdout? stdout.toString() : "";
  // console.log("CLI wslPath; got results:");
  // console.log("stdout:", stdout);
  // console.log("stderr:", stderr);
  fp = stdout.substring(0, stdout.length - 1); // remove 'return' char
  return fp
}
module.exports.wslPath = wslPath;
