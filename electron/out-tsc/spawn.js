"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pingBootstrap = void 0;
const logger_1 = require("./logger");
const constants_1 = require("./constants");
const child_process_1 = require("child_process");
/** */
function pingBootstrap(url) {
    const bin = "ping";
    const args = ['-n', 1, url.substring(8)];
    /** Spawn "holochain" subprocess */
    logger_1.log('info', 'Spawning ' + bin + ' (url: ' + url + ')');
    const proc = child_process_1.spawnSync(bin, args, {
        cwd: constants_1.CURRENT_DIR,
        //detached: false,
        timeout: 5000,
        encoding: 'utf8',
        env: {
            ...process.env,
            RUST_BACKTRACE: "1",
        },
    });
    logger_1.log('info', 'ping result: ' + proc.stdout);
    return proc.status == null || proc.status == 0;
}
exports.pingBootstrap = pingBootstrap;
//# sourceMappingURL=spawn.js.map