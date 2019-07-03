import { Transform, TransformOptions } from 'stream'

const to: TransformOptions = {
    writableObjectMode: true,
    readableObjectMode: true,
    objectMode: true
}

export class PromiseTransformStream extends Transform {
    constructor(private transform: (item: any) => Promise<any>, options: TransformOptions = to) {
        super(options)
    }

    public _transform(chunk: any, encoding: any, callback: any) {
        return this.transform(chunk)
            .then(item => {
                this.push(item)
            })
            .finally(() => {
                callback()
            })
    }
}
