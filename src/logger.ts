/* istanbul ignore file */

export enum LogLevel {
    None,
    Error,
    Warn,
    Info,
    Debug,
    Silly
}

export let logLevel: LogLevel = LogLevel.Info

switch (process.env.LOG_LEVEL) {
    case 'Silly':
    case 'silly':
    case 'SILLY':
        logLevel = LogLevel.Silly
        break
    case 'Debug':
    case 'debug':
    case 'DEBUG':
        logLevel = LogLevel.Debug
        break
    case 'Warn':
    case 'warn':
    case 'WARN':
    case 'Warning':
    case 'warning':
    case 'WARNING':
        logLevel = LogLevel.Warn
        break
    case 'Error':
    case 'error':
    case 'ERROR':
        logLevel = LogLevel.Error
        break
}

export interface ILogger {
    silly: (logObject: object) => void
    debug: (logObject: object) => void
    info: (logObject: object) => void
    warn: (logObject: object) => void
    error: (logObject: object) => void
}

export let logger: ILogger = {
    silly: (object: object) => {
        /**/
    },
    debug: (object: object) => {
        /**/
    },
    info: (object: object) => {
        /**/
    },
    warn: (object: object) => {
        /**/
    },
    error: (object: object) => {
        /**/
    }
}

export function setLogger(newLogger: ILogger) {
    logger = newLogger
}
