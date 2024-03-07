import { readProgramConfig } from "../fs";

export default function loadSirenApiDataAction(socket: import("socket.io").Socket) {
  return async () => {
    let response: VcConfigData | undefined;

    try {
      response = await readProgramConfig();
    } catch(err) {
      console.error(err);
    }
    
    socket.emit("loadSirenApiDataResponse", response);
  };
}