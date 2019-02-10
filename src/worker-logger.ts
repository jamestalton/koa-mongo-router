// Cluster worker threads send their log messages to the cluster master thread.
// The cluster master thread then handles the logging.
// This is done for performance and synchronization of the log messages.

import { worker } from 'cluster'
import { ILogger, ILogObject } from './logger'

export let workerLogger: ILogger = {
    silly: (logObject: ILogObject) => {
        if (worker.isConnected()) {
            process.send(logObject)
        }
    },
    debug: (logObject: ILogObject) => {
        if (worker.isConnected()) {
            process.send(logObject)
        }
    },
    info: (logObject: ILogObject) => {
        if (worker.isConnected()) {
            process.send(logObject)
        }
    },
    warn: (logObject: ILogObject) => {
        if (worker.isConnected()) {
            process.send(logObject)
        }
    },
    error: (logObject: ILogObject) => {
        if (worker.isConnected()) {
            process.send(logObject)
        }
    }
}
