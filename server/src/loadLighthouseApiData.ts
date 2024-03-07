import { checkDockerVersion, checkVcInstalled } from "../check-software";
import { getLighthouseApiData } from "../fs";

export default function loadLighthouseApiDataAction(socket: import("socket.io").Socket) {
  return async () => {
    let response: LighhouseApiData | undefined;

    try {
      const [dockerVersion, vcInstalled] = await Promise.all([
        checkDockerVersion(),
        checkVcInstalled(), 
      ]);
        if(!!dockerVersion && vcInstalled) {
          response = await getLighthouseApiData();
        }
    } catch(err) {
      console.error(err);
    }

    socket.emit("loadLighthouseApiDataResponse", response);
  };
}