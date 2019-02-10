/* istanbul ignore file */

import { ILogger } from './logger'

const Reset = '\x1b[0m'
const Bright = '\x1b[1m'
const FgBlack = '\x1b[30m'
const FgRed = '\x1b[31m'
const FgGreen = '\x1b[32m'
const FgYellow = '\x1b[33m'
const FgBlue = '\x1b[34m'
const FgMagenta = '\x1b[35m'
const FgCyan = '\x1b[36m'
const FgWhite = '\x1b[37m'

const enabled = process.env.LOGGER !== 'false'
const color = process.env.LOG_COLOR !== 'false'

function log(levelString: string, logObject: object) {
    let msg = ''
    if (process.env.LOG_DATE !== 'false' && process.env.LOG_TIME !== 'false') {
        const date = new Date()
        if (process.env.LOG_DATE !== 'false') {
            const dateString = date.toLocaleDateString()
            msg += `${Bright}${FgBlack}${dateString}${Reset}`
        }
        if (process.env.LOG_TIME !== 'false') {
            const timeString = date.toLocaleTimeString(undefined, { hour12: false })
            if (msg !== '') {
                msg += ' '
            }
            msg += `${Bright}${FgBlack}${timeString}${Reset}`
        }
    }

    if (msg !== '') {
        msg += ' '
    }

    const { message, level, ...logObj } = logObject as any
    msg += `${levelString}${Bright}${FgBlack}:${Reset}${FgWhite}${message}`

    let data = JSON.stringify(logObj)
    data = data.substr(1, data.length - 2)
    data = data.split(',"').join(`  ${FgCyan}`)
    data = data.split('":').join(`${Bright}${FgBlack}:${Reset}${FgWhite}`)
    data = data.split('"').join('')
    data = `  ${FgCyan}` + data

    process.stdout.write(`${msg}${data}${Reset}\n`)
}

export const consoleLogger: ILogger = {
    silly(logObject: object) {
        const levelString = color ? `${FgMagenta}SILLY` : `SILLY`
        log(levelString, logObject)
    },
    debug(logObject: object) {
        const levelString = color ? `${FgBlue}DEBUG` : `DEBUG`
        log(levelString, logObject)
    },
    info(logObject: object) {
        const levelString = color ? ` ${FgGreen}INFO` : ` INFO`
        log(levelString, logObject)
    },
    warn(logObject: object) {
        const levelString = color ? ` ${FgYellow}WARN` : ` WARN`
        log(levelString, logObject)
    },
    error(logObject: object) {
        const levelString = color ? `${FgRed}ERROR` : `ERROR`
        log(levelString, logObject)
    }
}
