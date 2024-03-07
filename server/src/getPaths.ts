import { getPaths } from "../constant";

export default function getPathsAction(socket: import("socket.io").Socket) {
  return () => {
    socket.emit("getPathsResponse", getPaths());
  };
}