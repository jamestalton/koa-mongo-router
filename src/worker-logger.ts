import { ILogger, LogLevel, logLevel } from './logger'

export let workerLogger: ILogger = {
    silly: (logObject: object) => {
        if (process.env.LOGGER !== 'false' && logLevel >= LogLevel.Silly) {
            ;(logObject as any).level = LogLevel.Silly
            process.send(logObject)
        }
    },
    debug: (logObject: object) => {
        if (process.env.LOGGER !== 'false' && logLevel >= LogLevel.Debug) {
            ;(logObject as any).level = LogLevel.Debug
            process.send(logObject)
        }
    },
    info: (logObject: object) => {
        if (process.env.LOGGER !== 'false' && logLevel >= LogLevel.Info) {
            ;(logObject as any).level = LogLevel.Info
            process.send(logObject)
        }
    },
    warn: (logObject: object) => {
        if (process.env.LOGGER !== 'false' && logLevel >= LogLevel.Warn) {
            ;(logObject as any).level = LogLevel.Warn
            process.send(logObject)
        }
    },
    error: (logObject: object) => {
        if (process.env.LOGGER !== 'false' && logLevel >= LogLevel.Error) {
            ;(logObject as any).level = LogLevel.Error
            process.send(logObject)
        }
    }
}
