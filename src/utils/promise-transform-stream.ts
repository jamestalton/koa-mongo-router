import { Transform, TransformOptions } from 'stream'

const defaultTransformOptions: TransformOptions = {
    writableObjectMode: true,
    readableObjectMode: true,
    objectMode: true,
    autoDestroy: false
}

export class PromiseTransformStream extends Transform {
    public results: any = []
    public resumeCallback: () => void
    public endCallback: () => void
    private pushIndex = 0
    private activeCount = 0

    constructor(
        private transform: (item: any) => Promise<any>,
        private concurrency: number = 100,
        options: TransformOptions = defaultTransformOptions
    ) {
        super(options)
    }
    public _transform(chunk: any, encoding: any, callback: any) {
        const index = this.results.length
        this.results.push(null)

        this.activeCount++
        if (this.activeCount === this.concurrency) {
            this.resumeCallback = callback
        } else {
            callback()
        }

        void this.transform(chunk).then(item => {
            this.activeCount--
            this.results[index] = item
            while (this.results[this.pushIndex] != null && this.pushIndex < this.results.length) {
                this.push(this.results[this.pushIndex])
                this.results[this.pushIndex] = undefined
                this.pushIndex++
            }
            if (this.resumeCallback != undefined) {
                const tempResumeCallback = this.resumeCallback
                this.resumeCallback = undefined
                tempResumeCallback()
            }
            if (this.endCallback != undefined && this.activeCount === 0) {
                this.endCallback()
            }
        })
    }

    public end(chunk: any, encoding?: any, cb?: () => void): void {
        if (this.results.length === 0) {
            super.end(chunk, encoding, cb)
        } else {
            this.endCallback = () => {
                super.end(chunk, encoding, cb)
            }
        }
    }
}
