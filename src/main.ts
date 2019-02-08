/* istanbul ignore file */
import { shutdownApp, startApp } from './app'
import { startCluster } from './clustered'

async function main() {
    await startCluster(startApp, shutdownApp)
}

void main()
