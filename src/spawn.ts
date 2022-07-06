import { log } from "./logger";
import { CURRENT_DIR, HOLOCHAIN_BIN } from "./constants";
import { spawnSync } from "child_process";


/** */
export function pingBootstrap(url:string): boolean {
  const bin = "ping";
  const args: any[] = ['-n', 1, url.substring(8)];

  /** Spawn "holochain" subprocess */
  log('info', 'Spawning ' + bin + ' (url: ' + url + ')');
  const proc = spawnSync(bin, args, {
    cwd: CURRENT_DIR,
    //detached: false,
    timeout: 5000,
    encoding: 'utf8', //stdio: 'pipe',
    env: {
      ... process.env,
      RUST_BACKTRACE: "1",
    },
  });
  log('info', 'ping result: ' + proc.stdout);
  return proc.status == null || proc.status == 0;
}
