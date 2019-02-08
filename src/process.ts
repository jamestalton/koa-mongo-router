/* istanbul ignore file */
import { isMaster, worker } from 'cluster'
import { cpus, totalmem } from 'os'
import { ILogger } from './logger'

const processName = isMaster ? 'process' : 'worker process'

export function initializeProcess(shutdownCallback: () => Promise<any>, logger: ILogger) {
    const shutdown = async () => {
        setTimeout(() => {
            logger.error({ message: 'shutdown timeout' })
            process.exit(1)
        }, 10 * 1000).unref()

        await shutdownCallback()
    }

    const logInfo = isMaster ? logger.info : logger.silly

    logInfo({
        message: `${processName} start`,
        env: process.env.NODE_ENV,
        cpus: Object.keys(cpus()).length,
        mem: (totalmem() / (1024 * 1024 * 1024)).toString() + 'GB',
        port: process.env.PORT
    })

    process.on('uncaughtException', err => {
        logger.error({
            message: `${processName} uncaughtException`,
            errorName: err.name,
            error: err.message,
            stack: err.stack
        })
        void shutdown()
    })

    process.on('exit', code => {
        if (code !== 0) {
            logger.error({ message: `${processName} exit`, code })
        } else {
            logInfo({ message: `${processName} exit`, code })
        }
    })

    process.on('SIGTERM', async () => {
        logInfo({ message: `${processName} SIGTERM` })
        await shutdown()
    })

    process.on('SIGINT', async () => {
        logInfo({ message: `${processName} SIGINT` })
        await shutdown()
    })

    process.on('SIGILL', async () => {
        logger.error({ message: `${processName} SIGILL` })
        await shutdown()
    })

    process.on('SIGBUS', async () => {
        logger.error({ message: `${processName} SIGBUS` })
        await shutdown()
    })

    process.on('SIGFPE', async () => {
        logger.error({ message: `${processName} SIGFPE` })
        await shutdown()
    })

    process.on('SIGSEGV', async () => {
        logger.error({ message: `${processName} SIGSEGV` })
        await shutdown()
    })

    if (worker != undefined) {
        worker.on('disconnect', async () => {
            logger.silly({ message: 'cluster worker disconnect' })
            await shutdown()
        })
    }
}
