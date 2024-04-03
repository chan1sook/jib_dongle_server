import { getCustomLogger } from "../logger";
import { checkCurlVersion } from "../check-software";
import { basicExec, sudoExec } from "../exec";


export default function getPublicIpAction(socket: import("socket.io").Socket) {
  return async () => {
    try {
      const ip = await getPublicIp(socket);

      socket.emit("getPublicIpResponse", null, ip);
    } catch(err) {
      console.error(err);
      socket.emit("getPublicIpResponse", (err instanceof Error) ? err.message : err?.toString());
    }
  };
}

async function getPublicIp(socket: import("socket.io").Socket) {
  const getPublicIpLogger = getCustomLogger("getPublicIp", socket);
  
  try {
    getPublicIpLogger.emitWithLog("Check Softwares");

    // check softwares
    const [curlVersion] = await Promise.all([
      checkCurlVersion(),
    ])

    getPublicIpLogger.logDebug("Curl", curlVersion);
    if (!curlVersion) {
      const cmd = `apt-get update
        apt-get install curl -y
        `;

      getPublicIpLogger.emitWithLog("Install Softwares");

      await sudoExec(cmd, getPublicIpLogger.injectExecTerminalLogs);

      getPublicIpLogger.logDebug("Softwares Installed");
    };

    getPublicIpLogger.logDebug("Get Public IP");
    const { stdout } = await basicExec("curl", ["ifconfig.me"]);
    getPublicIpLogger.logSuccess("Public IP", stdout);

    return stdout;
  } catch (err) {
    throw err;
  }
}