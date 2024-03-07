import path from "node:path";
import fs from "node:fs/promises";

import stringReplaceAll from 'string-replace-all';
import { checkDockerVersion, checkGitVersion } from "../check-software";
import { sudoExec, basicExec, spawnProcess } from "../exec";
import { getCustomLogger } from "../logger";
import { getPaths, validatorDockerComposePath, getLocalLighthousePath, getLighhouseDownloadUrl, validatorDockerComposeGroup } from "../constant";
import { isFileExists, writeProgramConfig } from "../fs";

export default function deployVcsAction(socket: import("socket.io").Socket) {
  return async (keyFileContent: Record<string, string>, 
    machinePublicIp: string,
    feeRecipientAddress: string,
    keyPassword: string,
    advanceSetting: DeployKeyAdvanceSetting,
  ) => {
    try {
      const response = await deployValidators(socket, keyFileContent,
        machinePublicIp,
        feeRecipientAddress,
        keyPassword,
        advanceSetting,
      );
      socket.emit("deployValidatorsResponse", null, response);
    } catch(err) {
      console.error(err);
      socket.emit("deployValidatorsResponse", (err instanceof Error) ? err.message : err?.toString());
    }
  };
}

  
async function deployValidators(socket: import("socket.io").Socket, keyFileContent: Record<string, string>,
  machinePublicIp: string,
  feeRecipientAddress: string,
  keyPassword: string,
  advanceSetting: DeployKeyAdvanceSetting,
) {
  const deployVcLogger = getCustomLogger("deployValidators", socket);
  const filePaths = getPaths();

  try {
    deployVcLogger.emitWithLog("Check Softwares");

    // check softwares
    const [dockerVersion, gitVersion] = await Promise.all([
      checkDockerVersion(),
      checkGitVersion(),
    ])

    deployVcLogger.logDebug("Docker", dockerVersion);
    deployVcLogger.logDebug("Git", gitVersion);

    if (!dockerVersion || !gitVersion) {
      let cmd = "";

      if (!dockerVersion) {
        cmd += // Add Docker's official GPG key:
          `apt-get update
        apt-get install ca-certificates curl gnupg -y
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor --yes -o /etc/apt/keyrings/docker.gpg
        chmod a+r /etc/apt/keyrings/docker.gpg
        ` +
          // Add the repository to Apt sources:
          `echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
        tee /etc/apt/sources.list.d/docker.list > /dev/null
        apt-get update
        apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
        `;
      }

      if (!gitVersion) {
        cmd += `apt-get update
        apt-get install git -y
        `;
      }

      deployVcLogger.emitWithLog("Install Softwares");

      deployVcLogger.injectExecTerminalLogs(await sudoExec(cmd));

      deployVcLogger.logDebug("Softwares Installed");
    }
    
    deployVcLogger.logInfo("VC_DEPLOY_TEMP", filePaths.VC_DEPLOY_TEMP);
    deployVcLogger.logInfo("VC_KEYS_PATH", filePaths.VC_KEYS_PATH);

    // Get jibchain data (and script)
    const chainConfigPath = path.join(filePaths.VC_DEPLOY_TEMP, "config");
    const hasChainConfigExits = await isFileExists(chainConfigPath);
    if(!hasChainConfigExits) {
      try {
        await fs.rm(filePaths.VC_DEPLOY_TEMP, {
          recursive: true,
          force: true,
        });
      } catch (err) {
  
      }
    
      await fs.mkdir(filePaths.VC_DEPLOY_TEMP, { recursive: true });

      // download git
      deployVcLogger.emitWithLog("Clone Jibchain Script Git");
    
      deployVcLogger.injectExecTerminalLogs(
        await basicExec("git", [
          "clone",
          "https://github.com/jibchain-net/node.git",
          filePaths.VC_DEPLOY_TEMP,
        ]),
      );
    } else {
      deployVcLogger.logDebug("Use Cached Script");
    }

    // Create files
    deployVcLogger.emitWithLog("Create Files");

    const tempKeyPath = path.join(filePaths.VC_DEPLOY_TEMP, "keys");
    try {
      await fs.rm(tempKeyPath, {
        recursive: true,
        force: true,
      });
    } catch (err) {
    }
    await fs.mkdir(tempKeyPath, { recursive: true });

    for (const fileKey of Object.keys(keyFileContent)) {
      const fileNameTokens = fileKey.split("/")
      const fileName = fileNameTokens[fileNameTokens.length - 1];
      const content = keyFileContent[fileKey];

      await fs.writeFile(path.join(tempKeyPath, fileName), content);
    }

    // replacement of `make env`
    const envContent = `## BOOTNODE Configuration\n` +
      `NETWORK_ID=8899\n` +
      `TARGET_PEERS=100\n` +
      `NODE_PUBLIC_IP="${machinePublicIp}"\n` +
      `\n## VALIDATOR Configuration\n` +
      `NODE_GRAFFITI="${advanceSetting.graffiti.replace(/\"/g, "_") || 'JBCValidatorClient'}"\n` +
      `PUBLIC_BEACON_NODE="https://metrabyte-cl.jibchain.net/"\n` +
      `FEE_RECIPIENT="${feeRecipientAddress}"\n`;

    await fs.writeFile(path.join(filePaths.VC_KEYS_PATH, ".env"), envContent);

    // Rewrite docker compose
    const vcKeyExportPath = path.join(filePaths.VC_KEYS_PATH, "vc");
    const vcKeyMountPath = path.join(filePaths.VC_KEYS_PATH, "vc-mount");
    const configExportPath = path.join(filePaths.VC_KEYS_PATH, "config");

    let lighhouseApiPort = parseInt(advanceSetting.exposeLighhouseApiPort, 10);
    if(!Number.isInteger(lighhouseApiPort) || lighhouseApiPort <= 1024) {
      lighhouseApiPort = 5062;
    }
    
    const composeContent = `version: "3.8"\n` +
      `services:\n` +
      `  jbc-validator:\n` +
      `    container_name: jbc-validator\n` +
      `    image: sigp/lighthouse\n` +
      `    user: root\n` +
      `    restart: unless-stopped\n` +
      `    logging:\n` +
      `      driver: "json-file"\n` +
      `      options:\n` +
      `        max-size: "50m"\n` +
      `    ports:\n` +
      `      - ${lighhouseApiPort}:5062\n` +
      `    volumes:\n` +
      `      - ${vcKeyMountPath}:/root/.lighthouse/\n` +
      `      - ${configExportPath}:/config\n` +
      `    command:\n` +
      `      - lighthouse\n` +
      `      - vc\n` +
      `      - --beacon-nodes=\${PUBLIC_BEACON_NODE}\n` +
      `      - --testnet-dir=/config\n` +
      `      - --init-slashing-protection\n` +
      `      - --graffiti=\${NODE_GRAFFITI}\n` +
      `      - --suggested-fee-recipient=\${FEE_RECIPIENT}\n` +
      `      - --debug-level=info\n` +
      `      - --http\n` +
      `      - --http-address=0.0.0.0\n`+
      `      - --http-allow-origin=*\n`+
      `      - --unencrypted-http-transport\n`;
    await fs.writeFile(validatorDockerComposePath(), composeContent);

    deployVcLogger.logInfo("LIGHTHOUSE_EXEC_PATH", filePaths.LIGHTHOUSE_EXEC_PATH);

    const hasLighthouseExists = await isFileExists(getLocalLighthousePath());
    if(!hasLighthouseExists) {
      try {
        await fs.rm(filePaths.LIGHTHOUSE_EXEC_PATH, {
          recursive: true,
          force: true,
        });
      } catch (err) {
  
      }
    
      await fs.mkdir(filePaths.LIGHTHOUSE_EXEC_PATH, { recursive: true });

      deployVcLogger.emitWithLog("Download Lighthouse");

      // Create files
      deployVcLogger.injectExecTerminalLogs(
          await basicExec("curl", [
          "-L",
          getLighhouseDownloadUrl(),
          "-o",
          "lighthouse.tar.gz",
        ], {
          cwd: filePaths.LIGHTHOUSE_EXEC_PATH,
        }),
      );
  
      deployVcLogger.emitWithLog("Extract Lighthouse File");

      deployVcLogger.injectExecTerminalLogs(
          await basicExec("tar", [
          "-xvf",
          "lighthouse.tar.gz",
        ], {
          cwd: filePaths.LIGHTHOUSE_EXEC_PATH,
        }),
      );

      deployVcLogger.logDebug("Lighthouse Downloaded");
    } else {
      deployVcLogger.logDebug("Use Cached File");
    }
    
    // Import key
    deployVcLogger.emitWithLog("Import Keys");
    try {
      await fs.rm(vcKeyExportPath, {
        recursive: true,
        force: true,
      });
    } catch (err) {

    }

    const importKeyPromise = new Promise<DeployKeyResult>((resolve, reject) => {
      const importKeyProcess = spawnProcess("./lighthouse", [
        "account",
        "validator",
        "import",
        "--directory",
        tempKeyPath,
        "--testnet-dir",
        chainConfigPath,
        "--datadir",
        vcKeyExportPath,
        "--reuse-password",
        "--stdin-inputs"
      ], {
        cwd: filePaths.LIGHTHOUSE_EXEC_PATH,
        timeout: 60 * 60 * 1000,
      })

      let step = 1;
      let out = "";

      // lighthouse account import out as stderr
      importKeyProcess.stderr.on("data", (data) => {
        deployVcLogger.injectTerminalLog(data.toString());
        out += data.toString();

        // deployVcLogger.logInfo(`Step : ${step}`, out);

        if (step === 1 && out.includes("Enter the keystore password, or press enter to omit it:")) {
          out = "";
          importKeyProcess.stdin.write(`${keyPassword}\n\n`);
          step += 1;
        }
      })

      importKeyProcess.on("exit", async (code, signal) => {
        if (code === 0) {
          const importResult: DeployKeyResult = {
            imported: undefined,
            skipped: undefined,
          }
          const captureOutText = /Successfully imported ([0-9]+) validators? \(([0-9]+) skipped\)\./.exec(out);
          if (captureOutText) {
            importResult.imported = parseInt(captureOutText[1], 10);
            importResult.skipped = parseInt(captureOutText[2], 10);
          }

          resolve(importResult);
        } else {
          const tokens = out.split('\n').filter((str) => !!str);
          const err = new Error(tokens[tokens.length - 1] || `Exit code:${code}`);
          reject(err);
        }
      })

      importKeyProcess.on("error", (err) => {
        console.error(err);
        reject(err);
      })
    });
    const importedResult = await importKeyPromise;

    deployVcLogger.logSuccess("Import Keys Result", {
      imported: importedResult.imported,
      skipped: importedResult.skipped
    });

    
    // fix deploy issue when use docker
    // change path inside validator_definitions.yml
    const vcDefsFilePath = path.join(vcKeyExportPath, "/validators/validator_definitions.yml");
    const vcDefsContentBuffer = await fs.readFile(vcDefsFilePath);
    const vcDefsContentStr = vcDefsContentBuffer.toString();

    const newVcDefsContentStr = stringReplaceAll(vcDefsContentStr, vcKeyExportPath, "/root/.lighthouse/custom");

    await fs.writeFile(vcDefsFilePath, newVcDefsContentStr);

    // Finally Deploy Docker (Yay!)
    deployVcLogger.emitWithLog("Deploy docker");

    const vcKeysCopyTargetPath = path.join(vcKeyMountPath, "custom");
    const dockerComposeProjectGroup = validatorDockerComposeGroup();

    deployVcLogger.injectExecTerminalLogs(
      await sudoExec(`docker compose -p "${dockerComposeProjectGroup}" -f "${validatorDockerComposePath()}" down
        docker container rm -f jbc-validator
        cp -rf "${path.join(filePaths.VC_DEPLOY_TEMP, "config")}" "${filePaths.VC_KEYS_PATH}"
        rm -rf "${vcKeysCopyTargetPath}"
        mkdir -p "${vcKeysCopyTargetPath}"
        cp -rf ${vcKeyExportPath}/* "${vcKeysCopyTargetPath}"
        docker compose -p "${dockerComposeProjectGroup}" -f "${validatorDockerComposePath()}" up -d
      `),
    );

    // Write Config
    deployVcLogger.emitWithLog("Get API Token");

    // Rewrite Lighthouse API Key to rightful format
    const apiKeyPath = path.join(vcKeyMountPath, "custom/validators/api-token.txt");
    const apiOut = await sudoExec(`cat "${apiKeyPath}"`);
    deployVcLogger.injectExecTerminalLogs(apiOut);

    importedResult.apiToken = apiOut.stdout;
    importedResult.apiPort = lighhouseApiPort;

    const lighhouseApiData = {
      apiToken: apiOut.stdout,
      apiPort: lighhouseApiPort,
    }
    
    await writeProgramConfig(lighhouseApiData, true);
    deployVcLogger.logSuccess("Lighhouse API Info", lighhouseApiData);

    return importedResult;
  } catch (err) {
    throw err;
  }
}
  