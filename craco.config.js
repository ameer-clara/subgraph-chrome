const CopyPlugin = require("copy-webpack-plugin");


module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      return {
        ...webpackConfig,
        entry: {
          main: [
            env === "development" &&
              require.resolve("react-dev-utils/webpackHotDevClient"),
            paths.appIndexJs,
          ].filter(Boolean),
          content: "./src/content-scripts/opensea.js",
          background: "./src/background/index.js",
        },
        output: {
          ...webpackConfig.output,
          filename: "static/js/[name].js",
        },
        optimization: {
          ...webpackConfig.optimization,
          runtimeChunk: false,
        },
        plugins: [...webpackConfig.plugins,
          new CopyPlugin({
            patterns: [
              { from: "./src/content-scripts/opensea.css",
                to: "static/css/opensea.css" }
            ],
          }),
        ]
      };
    },
  },
};
