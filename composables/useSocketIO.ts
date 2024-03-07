import { Socket, io } from "socket.io-client";

let socket: Socket | undefined;

export const useSocketIO = () => {
  if (socket) {
    return socket;
  }
  const {
    public: { sioPort },
  } = useRuntimeConfig();

  socket = io(`http://localhost:${sioPort}`);

  socket.on("getPathsResponse", (pathObj) => {
    console.log(pathObj);
  });

  socket.on("connect", () => {
    console.log("SocketIO connected");
    socket?.emit("getPaths");
  });


  return socket;
};
