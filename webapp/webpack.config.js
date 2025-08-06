const path = require('path');

module.exports = {
    entry: [
        './src/index.tsx',
    ],
    resolve: {
        modules: [
            'node_modules',
            path.resolve(__dirname),
        ],
        alias: {
            'mattermost-redux': path.resolve(__dirname, '../node_modules/mattermost-redux'),
        },
        extensions: ['*', '.js', '.jsx', '.ts', '.tsx'],
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx|ts|tsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        cacheDirectory: true,
                        presets: [
                            ['@babel/preset-env', {
                                targets: {
                                    chrome: 90,
                                    firefox: 88,
                                    edge: 90,
                                    safari: 14,
                                },
                                modules: false,
                                debug: false,
                                useBuiltIns: 'entry',
                                corejs: 3,
                            }],
                            ['@babel/preset-react', {
                                useBuiltIns: true,
                            }],
                            ['@babel/preset-typescript', {
                                allExtensions: true,
                                isTSX: true,
                            }],
                        ],
                        plugins: [
                            '@babel/plugin-proposal-class-properties',
                            '@babel/plugin-proposal-object-rest-spread',
                            '@babel/plugin-proposal-optional-chaining',
                            '@babel/plugin-syntax-dynamic-import',
                        ],
                    },
                },
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    'css-loader',
                ],
            },
            {
                test: /\.scss$/,
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader',
                ],
            },
            {
                test: /\.(png|eot|tiff|svg|woff2|woff|ttf|jpg|gif)$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: 'files/[hash].[ext]',
                        },
                    },
                ],
            },
        ],
    },
    externals: {
        react: 'React',
        'react-dom': 'ReactDOM',
        redux: 'Redux',
        'react-redux': 'ReactRedux',
        'prop-types': 'PropTypes',
        'react-bootstrap': 'ReactBootstrap',
    },
    output: {
        devtoolNamespace: 'video-plugin',
        path: path.join(__dirname, '/dist'),
        publicPath: '/',
        filename: 'main.js',
        chunkFilename: '[name].js',
    },
    devtool: 'source-map',
    performance: {
        hints: 'warning',
    },
    target: 'web',
    plugins: [],
}; 