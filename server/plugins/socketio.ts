import { Server } from "socket.io";
import getPathsAction from "../src/getPaths";
import generateKeysAction from "../src/generateKeys";
import deployVcsAction from "../src/deployVcs";
import loadLighthouseApiDataAction from "../src/loadLighthouseApiData";
import exitVcAction from "../src/exitVc";
import deploySirenAction from "../src/deploySiren";

export default defineNitroPlugin(async (nitroApp) => {
  const { public: { sioPort } } = useRuntimeConfig();

  const originPort = parseInt(process.env.NITRO_PORT || process.env.PORT, 10) || 3000;

  console.log(`[SocketIO] originPort port ${originPort}`);

  const io = new Server({
    cors: {
      origin: '*',
    },
  });

  io.on("connection", (socket) : void => {
    console.log("[SocketIO] connected", socket.id);

    socket.on("getPaths", getPathsAction(socket));
    socket.on("generateKeys", generateKeysAction(socket));
    socket.on("deployValidators", deployVcsAction(socket));
    socket.on("loadLighthouseApiData", loadLighthouseApiDataAction(socket));
    socket.on("exitValidator", exitVcAction(socket));
    socket.on("loadSirenApiData", deploySirenAction(socket));
    socket.on("deployJbcSiren", deploySirenAction(socket));
  });

  await io.listen(parseInt(sioPort));
  console.log(`[SocketIO] start at port ${sioPort}`);
})