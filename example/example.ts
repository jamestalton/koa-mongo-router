import { consoleLogger, startCluster } from 'node-server-utils'
import { startApp, stopApp } from './example-app'

startCluster(startApp, stopApp, consoleLogger)
