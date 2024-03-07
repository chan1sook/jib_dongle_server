// import sudoPrompt from 'sudo-prompt-alt';
import util from "node:util";
import { execFile as _execFile, spawn } from "node:child_process";

export const spawnProcess = spawn;
export const basicExec = util.promisify(_execFile);

export function sudoExec(cmd: string): Promise<{ stdout: string, stderr: string }> {
  // TODO run as root ...
  return new Promise(async (resolve, reject) => {
    const { stdout, stderr } = await basicExec(cmd);
    return  { stdout, stderr };

    // sudoPrompt.exec(cmd, {
    //   name: 'Electron',
    //   icns: '/Applications/Electron.app/Contents/Resources/Electron.icns',
    // },
    //   (error: Error | undefined, stdout: string, stderr: string) => {
    //     if (error) { return reject(error); };
    //     resolve({ stdout, stderr });
    //   }
    // );
  });
}
