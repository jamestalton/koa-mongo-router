const path = require('path')

module.exports = {
    entry: './lib/main.js',
    target: 'node',
    mode: 'production',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'main.js'
    },
    stats: {
        warnings: false
    }
}
