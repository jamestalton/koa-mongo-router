/* istanbul ignore file */
import * as cluster from 'cluster'
import * as os from 'os'
import { consoleLogger } from './console-logger'
import { logger, setLogger } from './logger'
import { closeMongoClient } from './mongo-router'
import { initializeProcess } from './process'

export function startCluster(startApp: () => Promise<any>, shutdownApp: () => Promise<any>) {
    setLogger(consoleLogger)

    if (cluster.isMaster && os.cpus().length > 1 && process.env.MAX_WORKERS !== '1') {
        initializeProcess(async () => {
            cluster.disconnect()
            await closeMongoClient()
        }, logger)

        let workerCount = os.cpus().length
        if (process.env.MAX_WORKERS != undefined) {
            const clusterMaxWorkerCount: number = Number(process.env.MAX_WORKERS)
            if (!isNaN(clusterMaxWorkerCount)) {
                workerCount = Math.min(clusterMaxWorkerCount, workerCount)
            }
        }

        cluster.on('exit', (deadWorker, code, signal) => {
            if (!deadWorker.exitedAfterDisconnect) {
                logger.error({ message: `cluster worker crash`, code, signal })
            } else {
                logger.silly({ message: `cluster worker exit`, disconnect: true, code, signal })
            }
        })

        for (let i = 0; i < workerCount; i += 1) {
            cluster.fork()
        }
    } else {
        initializeProcess(shutdownApp, logger)
        return startApp()
    }
}
