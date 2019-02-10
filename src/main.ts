/* istanbul ignore file */
import { shutdownApp, startApp } from './app'
import { startCluster } from './clustered'
import { consoleLogger } from './console-logger'

async function main() {
    await startCluster(startApp, shutdownApp, consoleLogger)
}

void main()
