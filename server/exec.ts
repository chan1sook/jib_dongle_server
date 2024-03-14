// import sudoPrompt from 'sudo-prompt-alt';
import util from "node:util";
import { execFile as _execFile, spawn } from "node:child_process";

export const spawnProcess = spawn;
export const basicExec = util.promisify(_execFile);

export function sudoExec(
  cmd: string,
  logCb: ({stdout, stderr} : { stdout: string, stderr: string}) => void = () => {}
): Promise<{ stdout: string, stderr: string }> {
  return new Promise(async (resolve, reject) => {
    try {
      let stdout = "";
      let stderr = "";
      const cmds = cmd.trim().split("\n");
      for(const cmdLine of cmds) {
        const tokens = cmdLine.trim().split(/[\s\t]+/);
        console.log(tokens);
        
        if(tokens.length > 0 && tokens[0]) {
          await new Promise(async (resolve2, reject2) => {
            try {
              const p = spawn(tokens[0], tokens.slice(1));  
              p.stdout.on("data", (data) => {
                const dataStr = data.toString();
                logCb({ stdout: dataStr, stderr: "",});
                stdout += dataStr;
              });

              p.stderr.on("data", (data) => {
                const dataStr = data.toString();
                logCb({ stdout: "", stderr: dataStr,});
                stderr += dataStr;
              });

              p.on("exit", (code, signal) => {
                resolve2({ code, signal });
              });

              p.on("error", reject2);
            } catch(err) {
              reject2(err);
            }
          });
        }
      };

      resolve({ stdout, stderr });
    } catch(err) {
      reject(err);
    }
  });
}

export async function sudoSpawn(
  command: string,
  args?: readonly string[],
  ...params:any
) {
  try {
    return spawn(command, args, ...params);
  } catch(err) {
    throw err;
  }
} 