/* istanbul ignore file */

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
