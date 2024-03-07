import { Socket, io } from "socket.io-client";

let socket: Socket | undefined;

export const useSocketIO = (location : Location) => {
  if (socket) {
    return socket;
  }

  const {
    public: { sioPort },
  } = useRuntimeConfig();
  const baseHost = `${location.protocol}//${location.hostname}:${sioPort}`;
  socket = io(baseHost);

  socket.on("getPathsResponse", (pathObj) => {
    console.log(pathObj);
  });

  socket.on("connect", () => {
    console.log("SocketIO connected");
    socket?.emit("getPaths");
  });


  return socket;
};
