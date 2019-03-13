/* istanbul ignore file */

import * as le_node from 'le_node'
import { ILogger, ILogObject } from 'node-server-utils'

export function getLogEntriesLogger(logEntriesToken: string, hook?: (logObject: ILogObject) => ILogObject) {
    const leNode = new le_node({
        token: logEntriesToken,
        minLevel: 'info',
        withLevel: false,
        flatten: false,
        timestamp: false,
        levels: ['debug', 'info', 'notice', 'warn', 'error', 'crit', 'alert', 'emerg']
    })

    const logEntriesLogger: ILogger = {
        silly: (logObject: ILogObject) => {
            if (leNode != undefined) {
                if (hook != undefined) {
                    logObject = hook(logObject)
                }
                leNode.debug(logObject)
            }
        },
        debug: (logObject: ILogObject) => {
            if (leNode != undefined) {
                if (hook != undefined) {
                    logObject = hook(logObject)
                }
                leNode.debug(logObject)
            }
        },
        info: (logObject: ILogObject) => {
            if (leNode != undefined) {
                if (hook != undefined) {
                    logObject = hook(logObject)
                }
                leNode.info(logObject)
            }
        },
        warn: (logObject: ILogObject) => {
            if (leNode != undefined) {
                if (hook != undefined) {
                    logObject = hook(logObject)
                }
                leNode.warn(logObject)
            }
        },
        error: (logObject: ILogObject) => {
            if (leNode != undefined) {
                if (hook != undefined) {
                    logObject = hook(logObject)
                }
                leNode.error(logObject)
            }
        }
    }

    return logEntriesLogger
}
