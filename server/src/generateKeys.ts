import { checkCurlVersion, checkDockerVersion, checkGitVersion, getDockerInstallCmd } from "../check-software";
import { getPaths, isOverrideCheckFiles, jbcKeygenDockerfilePath, jbcKeygenGitUrl } from "../constant";
import { basicExec, sudoExec, sudoSpawn } from "../exec";
import path from "node:path";
import fs from "node:fs/promises";
import { isFileExists } from "../fs";
import { getCustomLogger } from "../logger";


export default function generateKeysAction(socket: import("socket.io").Socket) {
  return async (vcQty: number, withdrawAddress: string, keyPassword: string) => {
    try {
      const response = await generateKeys(socket, vcQty, withdrawAddress, keyPassword);
      socket.emit("generateKeysResponse", null, response);
    } catch(err) {
      console.error(err);
      socket.emit("generateKeysResponse", (err instanceof Error) ? err.message : err?.toString());
    }
  };
}

async function generateKeys(socket: import("socket.io").Socket, qty: number, withdrawAddress: string, keyPassword: string) {
  const generateKeyLogger = getCustomLogger("generateKeys", socket);
  const filePaths = getPaths();

  try {
    generateKeyLogger.emitWithLog("Check Softwares");

    // check softwares
    const [dockerVersion, gitVersion, curlVersion] = await Promise.all([
      checkDockerVersion(),
      checkGitVersion(),
      checkCurlVersion(),
    ]);

    generateKeyLogger.logDebug("Docker", dockerVersion);
    generateKeyLogger.logDebug("Git", gitVersion);
    generateKeyLogger.logDebug("cURL", curlVersion);

    if (!dockerVersion || !gitVersion || !curlVersion) {
      let cmd = "";

      if (!dockerVersion) {
        cmd += await getDockerInstallCmd();
      }

      const sofewareNeeds: string[] = [];
      if (!gitVersion) {
        sofewareNeeds.push("git");
      }

      if (!curlVersion) {
        sofewareNeeds.push("curl");
      }

      if (sofewareNeeds.length > 0) {
        cmd += `apt-get update
        apt-get install ${sofewareNeeds.join(' ')} -y
        `
      }

      generateKeyLogger.emitWithLog("Install Softwares");

      await sudoExec(cmd, generateKeyLogger.injectExecTerminalLogs);

      generateKeyLogger.logDebug("Softwares Installed");
    }

    generateKeyLogger.logInfo("JBC_KEYGEN_SCRIPT_PATH", filePaths.JBC_KEYGEN_SCRIPT_PATH);

    // Get keygen script data (and script)
    const keygenDockerfilePath = jbcKeygenDockerfilePath();
    const isKeygenDockerfileExists = !isOverrideCheckFiles() && await isFileExists(keygenDockerfilePath);

    if(!isKeygenDockerfileExists) {
      try {
        await fs.rm(filePaths.JBC_KEYGEN_SCRIPT_PATH, { recursive: true, force: true, });
      } catch (err) {
  
      }
      await fs.mkdir(filePaths.JBC_KEYGEN_SCRIPT_PATH, { recursive: true });

      // download git
      generateKeyLogger.emitWithLog("Clone Jbc Depossit Script Git");
    
      generateKeyLogger.injectExecTerminalLogs(
        await basicExec("git", [
          "clone",
          jbcKeygenGitUrl(),
          filePaths.JBC_KEYGEN_SCRIPT_PATH,
        ]),
      );
    } else {
      generateKeyLogger.logDebug("Use Cached Script");
    }
    
    // Clear old generated file
    const keysPath = path.join(filePaths.JBC_KEYGEN_SCRIPT_PATH, "validator_keys");
    try {
      await sudoExec(`rm -rf ${keysPath}`, generateKeyLogger.injectExecTerminalLogs);
    } catch(err) {
      console.error(err);
    }
    await fs.mkdir(keysPath, { recursive: true });
    
    generateKeyLogger.emitWithLog("Generate Keys");

    // create compose
    generateKeyLogger.emitWithLog("Build Dockerfile");

    const buildDocker = new Promise<void>(async (resolve, reject) => {
      try {
        const buildProcess = await sudoSpawn("docker", [
          "build", "--pull", "-t", "jbc-keygen", filePaths.JBC_KEYGEN_SCRIPT_PATH,
        ]);

        let out = "";
        buildProcess.stdout.on("data", (data) => {
          generateKeyLogger.injectTerminalLog(data.toString());
          out += data.toString();
        });

        buildProcess.stderr.on("data", (data) => {
          out += data.toString();
          generateKeyLogger.injectTerminalLog(data.toString());
        })

        buildProcess.on("exit", async (code, signal) => {
          console.log(out);
          if (code === 0) {
            resolve();
          } else {
            const tokens = out.split('\n').filter((str) => !!str);
            const err = new Error(tokens[tokens.length - 1] || `Exit code:${code}`);
            reject(err);
          }
        });
      } catch(err) {
        reject(err);
      }
    });

    await buildDocker;
    
    generateKeyLogger.emitWithLog("Generate Keys");
    
    const genKey = new Promise<GenerateKeyResponse>(async (resolve, reject) => {
      let checkfileWorker : NodeJS.Timeout | undefined;
      let cachedProcess = "";

      try {
        const genKeyProcess = await sudoSpawn("docker", [
          "run",
          "-v",
          `${keysPath}:/app/validator_keys`,
          "-i",
          "--rm",
          "jbc-keygen",
          "--non_interactive",
          "new-mnemonic",
          `--num_validators=${qty}`,
          "--mnemonic_language=english",
          "--chain=jib",
          `--eth1_withdrawal_address=${withdrawAddress}`,
          `--keystore_password=${keyPassword}`,
        ], {
          timeout: 60 * 60 * 1000,
        });

        let step = 1;
        let out = "";
        let mnemonic = "";

        genKeyProcess.stdout.on("data", (data) => {
          generateKeyLogger.injectTerminalLog(data.toString());
          out += data.toString();

          if (step === 1 && out.includes("Please choose your language ['1. العربية', '2. ελληνικά', '3. English', '4. Français', '5. Bahasa melayu', '6. Italiano', '7. 日本語', '8. 한국어', '9. Português do Brasil', '10. român', '11. Türkçe', '12. 简体中文']:  [English]:")) {
            out = "";
            genKeyProcess.stdin.write("\n");
            step += 1;
          }

          if (step === 2 && out.includes("Repeat your execution address for confirmation.:")) {
            out = "";
            genKeyProcess.stdin.write(`${withdrawAddress}\n`);
            step += 1;
          }

          if (step === 3 && out.includes("Repeat your keystore password for confirmation:")) {
            out = "";
            genKeyProcess.stdin.write(`${keyPassword}\n`);
            step += 1;
          }

          if (step === 2 && out.includes("Please type your mnemonic (separated by spaces) to confirm you have written it down. Note: you only need to enter the first 4 letters of each word if you'd prefer.")) {
            const token = out.split("This is your mnemonic (seed phrase). Write it down and store it safely. It is the ONLY way to retrieve your deposit.")[1]
            const token1 = token.split("Please type your mnemonic (separated by spaces) to confirm you have written it down. Note: you only need to enter the first 4 letters of each word if you'd prefer.")[0]
            mnemonic = token1.trim();

            generateKeyLogger.logSuccess("Key Mnemonic", mnemonic);

            out = "";
            genKeyProcess.stdin.write(`${mnemonic}\n`);
            step += 1;

            checkfileWorker = setInterval(async () => {
              try {
                const files = await fs.readdir(keysPath);
                const percents = files.length * 100 / (qty + 2);
                const processText = `Generate Keys: ${files.length}/${qty + 2} (${percents.toFixed(2)}%)`;
                if(cachedProcess !== processText) {
                  cachedProcess = processText;
                  generateKeyLogger.emitWithLog(processText);
                }
              } catch(err) {

              }
            }, 100);
          }
        })

        genKeyProcess.stderr.on("data", (data) => {
          generateKeyLogger.injectTerminalLog(data.toString());
          console.log(data.toString());
        })

        genKeyProcess.on("exit", async (code, signal) => {
          clearInterval(checkfileWorker);
          
          try {
            if (code === 0) {
              generateKeyLogger.logDebug("Read Keys");
              await sudoExec(`chmod +r -R ${keysPath}`, generateKeyLogger.injectExecTerminalLogs);

              // read content
              const files = await fs.readdir(keysPath);
              const contents : Record<string, string> = {};
              for (const file of files) {
                const str = (await fs.readFile(path.join(keysPath, file))).toString();
                contents[file] = str;
              }
              resolve({ mnemonic, contents, exportPath: keysPath });
            } else {
              const tokens = out.split('\n').filter((str) => !!str);
              const err = new Error(tokens[tokens.length - 1] || `Exit code:${code}`);
              reject(err);
            }
          } catch(err) {
            reject(err);
          }
        })

        genKeyProcess.on("error", (err) => {
          clearInterval(checkfileWorker);
          reject(err);
        });

      } catch(err) {
        reject(err);
      }
    });

    const result = await genKey;
    generateKeyLogger.logSuccess("Key Files", Object.keys(result.contents));
    return result;
  } catch (err) {
    throw err;
  }
}