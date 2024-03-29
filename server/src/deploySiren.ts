import fs from "node:fs/promises";

import { getJbcSirenDownloadUrl, getJbcSirenSha256Checksum, getLocalJbcSirenDockerImagePath, isOverrideCheckFiles, jbcSirenDockerComposeGroup, jbcSirenDockerComposePath } from "../constant";
import { getPaths } from "../constant";
import { calculateHash, isFileValid, readProgramConfig, writeProgramConfig } from "../fs";
import { getCustomLogger } from "../logger";
import { checkDockerVersion, checkGitVersion, getDockerInstallCmd } from "../check-software";
import { spawnProcess, sudoExec } from "../exec";


export default function deploySirenAction(socket: import("socket.io").Socket) {
  return async (port: string) => {
    try {
      await deployJbcSiren(socket, port);
      const response = await readProgramConfig();

      socket.emit("deployJbcSirenResponse", null, response);
    } catch(err) {
      console.error(err);
      socket.emit("deployJbcSirenResponse", (err instanceof Error) ? err.message : err?.toString());
    }
  };
}

async function deployJbcSiren(socket: import("socket.io").Socket, sirenPort: string) {
  const deployJbcSirenLogger = getCustomLogger("deployJbcSiren", socket);
  const filePaths = getPaths();
  
  try {
    deployJbcSirenLogger.emitWithLog("Check Softwares");

    // check softwares
    const [dockerVersion, gitVersion] = await Promise.all([
      checkDockerVersion(),
      checkGitVersion(),
    ])

    deployJbcSirenLogger.logDebug("Docker", dockerVersion);
    deployJbcSirenLogger.logDebug("Git", gitVersion);

    if (!dockerVersion || !gitVersion) {
      let cmd = "";

      if (!dockerVersion) {
        cmd +=  await getDockerInstallCmd();
      }

      if (!gitVersion) {
        cmd += `apt-get update
        apt-get install git -y
        `;
      }

      deployJbcSirenLogger.emitWithLog("Install Softwares");

      await sudoExec(cmd, deployJbcSirenLogger.injectExecTerminalLogs);

      deployJbcSirenLogger.logDebug("Softwares Installed");
    };


    const sirenImagePath = getLocalJbcSirenDockerImagePath();
    const isSirenImageValid = !isOverrideCheckFiles() && 
      await isFileValid(sirenImagePath, getJbcSirenSha256Checksum());

    if(!isSirenImageValid) {
      try {
        await fs.rm(filePaths.JBC_SIREN_TEMP, {
          recursive: true,
          force: true,
        });
      } catch (err) {
  
      }
    
      await fs.mkdir(filePaths.JBC_SIREN_TEMP, { recursive: true });

      deployJbcSirenLogger.emitWithLog("Download Image");

      // Create files
      const downloadPromise = new Promise<void>((resolve, reject) => {
        const downloadProcess = spawnProcess("curl", [
          "-L",
          getJbcSirenDownloadUrl(),
          "-o",
          sirenImagePath,
        ], {
          timeout: 60 * 60 * 1000,
        })
  
        let out = "";
  
        downloadProcess.stdin.on("data", (data) => {
          deployJbcSirenLogger.injectTerminalLog(data.toString());
          out += data.toString();
        })

        downloadProcess.stderr.on("data", (data) => {
          deployJbcSirenLogger.injectTerminalLog(data.toString());
          out += data.toString();
        })
  
        downloadProcess.on("exit", async (code, signal) => {
          if (code === 0) {
            resolve();
          } else {
            const tokens = out.split('\n').filter((str) => !!str);
            const err = new Error(tokens[tokens.length - 1] || `Exit code:${code}`);
            reject(err);
          }
        })
  
        downloadProcess.on("error", (err) => {
          console.error(err);
          reject(err);
        })
      });
      
      await downloadPromise;

      deployJbcSirenLogger.logDebug("Image Downloaded");

      deployJbcSirenLogger.logDebug("sha256", await calculateHash(sirenImagePath));
    } else {
      deployJbcSirenLogger.logDebug("Use Cached File");
    }

    // deploy docker (Yay!)
    deployJbcSirenLogger.emitWithLog("Deploy Docker");

    let _sirenPort = parseInt(sirenPort, 10);
    if(!Number.isInteger(_sirenPort) || _sirenPort <= 1024) {
      _sirenPort = 8080;
    }

    const composePath = jbcSirenDockerComposePath();
    const composeContent = `version: "3.8"\n` +
      `services:\n` +
      `  jbc-siren:\n` +
      `    container_name: jbc-siren\n` +
      `    image: jbc-siren\n` +
      `    user: root\n` +
      `    restart: unless-stopped\n` +
      `    logging:\n` +
      `      driver: "json-file"\n` +
      `      options:\n` +
      `        max-size: "50m"\n` +
      `    ports:\n` +
      `      - ${_sirenPort}:80\n`;
    await fs.writeFile(composePath, composeContent);

    const dockerComposeProjectGroup = jbcSirenDockerComposeGroup();
    const installDockerScript = `docker compose -p "${dockerComposeProjectGroup}" -f "${composePath}" down
    docker container rm -f jbc-siren
    docker image rm -f jbc-siren
    docker load -i "${sirenImagePath}"
    docker compose -p "${dockerComposeProjectGroup}" -f "${composePath}" up -d
    `;

    await sudoExec(installDockerScript, deployJbcSirenLogger.injectExecTerminalLogs);

    const deployResult = {
      sirenPort: _sirenPort,
    }
    await writeProgramConfig(deployResult, true);

    deployJbcSirenLogger.logSuccess("JBC Siren Deployed", deployResult);

    return deployResult;
  } catch (err) {
    throw err;
  }
}