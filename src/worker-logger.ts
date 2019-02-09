// Cluster worker threads send their log messages to the cluster master thread.
// The cluster master thread then handles the logging.
// This is done for performance and synchronization of the log messages.

import { worker } from 'cluster'
import { ILogger, LogLevel, logLevel } from './logger'

export let workerLogger: ILogger = {
    silly: (logObject: object) => {
        if (process.env.LOGGER !== 'false' && logLevel >= LogLevel.Silly) {
            if (worker.isConnected()) {
                ;(logObject as any).level = LogLevel.Silly
                process.send(logObject)
            }
        }
    },
    debug: (logObject: object) => {
        if (process.env.LOGGER !== 'false' && logLevel >= LogLevel.Debug) {
            if (worker.isConnected()) {
                ;(logObject as any).level = LogLevel.Debug
                process.send(logObject)
            }
        }
    },
    info: (logObject: object) => {
        if (process.env.LOGGER !== 'false' && logLevel >= LogLevel.Info) {
            if (worker.isConnected()) {
                ;(logObject as any).level = LogLevel.Info
                process.send(logObject)
            }
        }
    },
    warn: (logObject: object) => {
        if (process.env.LOGGER !== 'false' && logLevel >= LogLevel.Warn) {
            if (worker.isConnected()) {
                ;(logObject as any).level = LogLevel.Warn
                process.send(logObject)
            }
        }
    },
    error: (logObject: object) => {
        if (process.env.LOGGER !== 'false' && logLevel >= LogLevel.Error) {
            if (worker.isConnected()) {
                ;(logObject as any).level = LogLevel.Error
                process.send(logObject)
            }
        }
    }
}
