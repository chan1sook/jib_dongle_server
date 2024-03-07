import colors from "colors";

export function getCustomLogger(key: string, socket: import('socket.io').Socket) {
  const logDebug = (...msg: any[]) => {
    console.log(colors.blue(`[${key}]`), ...msg);
  }
  const logInfo = (title: string, ...msg: any[]) => {
    console.log(colors.magenta(`[${title || key}]`), ...msg);
  }
  const logSuccess = (title: string, ...msg: any[]) => {
    console.log(colors.green(`[${title || key}]`), ...msg);
  }
  const logFailed = (title: string, ...msg: any[]) => {
    console.log(colors.green(`[${title || key}]`), ...msg);
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
