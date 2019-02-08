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

enum LogLevel {
    None,
    Error,
    Warn,
    Info,
    Debug,
    Silly
}

let logLevel: LogLevel = LogLevel.Info

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

function log(level: string, logObject: object) {
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
    msg += `${level}${Bright}${FgBlack}:${Reset}${FgWhite}${(logObject as any).message}`
    delete (logObject as any).message

    let data = JSON.stringify(logObject)
    data = data.substr(1, data.length - 2)
    data = data.split(',"').join(`  ${FgCyan}`)
    data = data.split('":').join(`${Bright}${FgBlack}:${Reset}${FgWhite}`)
    data = data.split('"').join('')
    data = `  ${FgCyan}` + data

    process.stderr.write(`${msg}${data}${Reset}\n`)
}

function silly(logObject: object) {
    if (enabled && logLevel >= LogLevel.Silly) {
        const levelString = color ? `${FgMagenta}SILLY` : `SILLY`
        log(levelString, logObject)
    }
}

function debug(logObject: object) {
    if (enabled && logLevel >= LogLevel.Debug) {
        const levelString = color ? `${FgBlue}DEBUG` : `DEBUG`
        log(levelString, logObject)
    }
}

function info(logObject: object) {
    if (enabled && logLevel >= LogLevel.Info) {
        const levelString = color ? ` ${FgGreen}INFO` : ` INFO`
        log(levelString, logObject)
    }
}

function warn(logObject: object) {
    if (enabled && logLevel >= LogLevel.Warn) {
        const levelString = color ? ` ${FgYellow}WARN` : ` WARN`
        log(levelString, logObject)
    }
}

function error(logObject: object) {
    if (enabled && logLevel >= LogLevel.Error) {
        const levelString = color ? `${FgRed}ERROR` : `ERROR`
        log(levelString, logObject)
    }
}

export const consoleLogger: ILogger = {
    silly,
    debug,
    info,
    warn,
    error
}
