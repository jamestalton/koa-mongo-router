/* istanbul ignore file */

import { ILogger, ILogObject } from 'node-server-utils'
import * as r7InsightNode from 'r7insight_node'

export function getLogEntriesLogger(logEntriesToken: string, hook?: (logObject: ILogObject) => ILogObject) {
    const logEntriesInsightNode = new r7InsightNode({
        token: logEntriesToken,
        minLevel: 'info',
        withLevel: false,
        region: 'eu',
        flatten: false,
        timestamp: false,
        levels: ['debug', 'info', 'notice', 'warn', 'error', 'crit', 'alert', 'emerg'],
    })

    const logEntriesLogger: ILogger = {
        silly: (logObject: ILogObject) => {
            if (logEntriesInsightNode != undefined) {
                if (hook != undefined) {
                    logObject = hook(logObject)
                }
                logEntriesInsightNode.debug(logObject)
            }
        },
        debug: (logObject: ILogObject) => {
            if (logEntriesInsightNode != undefined) {
                if (hook != undefined) {
                    logObject = hook(logObject)
                }
                logEntriesInsightNode.debug(logObject)
            }
        },
        info: (logObject: ILogObject) => {
            if (logEntriesInsightNode != undefined) {
                if (hook != undefined) {
                    logObject = hook(logObject)
                }
                logEntriesInsightNode.info(logObject)
            }
        },
        warn: (logObject: ILogObject) => {
            if (logEntriesInsightNode != undefined) {
                if (hook != undefined) {
                    logObject = hook(logObject)
                }
                logEntriesInsightNode.warn(logObject)
            }
        },
        error: (logObject: ILogObject) => {
            if (logEntriesInsightNode != undefined) {
                if (hook != undefined) {
                    logObject = hook(logObject)
                }
                logEntriesInsightNode.error(logObject)
            }
        },
    }

    return logEntriesLogger
}
