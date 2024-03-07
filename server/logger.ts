import "colors";

export function getCustomLogger(key: string, socket: import('socket.io').Socket) {
  const logDebug = (...msg: any[]) => {
    console.log(`[${key}]`.blue, ...msg);
  }
  const logInfo = (title: string, ...msg: any[]) => {
    console.log(`[${title || key}]`.magenta, ...msg);
  }
  const logSuccess = (title: string, ...msg: any[]) => {
    console.log(`[${title || key}]`.green, ...msg);
  }
  const logFailed = (title: string, ...msg: any[]) => {
    console.log(`[${title || key}]`.red, ...msg);
  }

  const emitWithLog = (msg: string, evName?:string , title?: string) => {
    socket.emit(evName || (key + "Status"), msg);
    logDebug(msg);
  }
  
  const injectTerminalLog = (log : string) => {
    socket.emit("terminalLogs", log)
  } 

  const injectExecTerminalLogs = (execOut : { stdout: string, stderr: string }) => {
    injectTerminalLog(execOut.stdout || execOut.stderr);
  }

  return Object.freeze({
    logDebug,
    logInfo,
    logSuccess,
    logFailed,
    emitWithLog,
    injectTerminalLog,
    injectExecTerminalLogs,
  });
}
