const { defineConfig } = require('@vue/cli-service');
const path = require('path');
const pkg = require('./package.json');
const webpack = require('webpack');
const { formatDate } = require('@winner-fed/cloud-utils');
const CompressionWebpackPlugin = require('compression-webpack-plugin');
const WebpackBar = require('webpackbar');
const Components = require('unplugin-vue-components/webpack');
const TerserPlugin = require('terser-webpack-plugin');
const { WebpackManifestPlugin } = require('webpack-manifest-plugin');
const N = '\n';
const resolve = (dir) => {
  return path.join(__dirname, './', dir);
};

const isProd = () => {
  return process.env.NODE_ENV === 'production';
};

const genPlugins = () => {
  const plugins = [
    Components({}),
    new WebpackBar(),
    require('unplugin-auto-import/webpack')({ 
      include: [
        /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
        /\.vue$/,
        /\.vue\?vue/, // .vue
        /\.md$/, // .md
      ],
      dts: true,
      imports: ['vue', 'vue-router'],
      eslintrc: {
        enabled: true,
      },
    }),
    require('@winner-fed/unplugin-vue-setup-extend/webpack').default({}),
  ];

  if (isProd()) {
    plugins.push(
      // bannerPlugin
      new webpack.BannerPlugin({
        banner:
          `@author: Whale FE${
  N}@version: ${pkg.version}${
  N}@description: Build time ${formatDate(new Date(), 'yyyy-MM-dd HH:mm:ss')}          `
      }),
      new WebpackManifestPlugin({
        fileName: path.resolve(
          __dirname,
          'dist',
          `manifest.${Date.now()}.json`
        ),
        generate (seed, files, entries) {
          return files.reduce((manifest, {name, path: manifestFilePath}) => {
            const {root, dir, base} = path.parse(manifestFilePath);
             if (['frame', 'frame/vendors_frame'].includes(dir)) {
              return { ...manifest };
            }
            return {
              ...manifest,
              [name + '-' + base]: {path: manifestFilePath, root, dir}
            };
          }, seed);
        }
      }),
      new CompressionWebpackPlugin({
        filename: '[path][base].gz[query]',
        algorithm: 'gzip',
        test: new RegExp(
          '\\.(' +
          ['js', 'css'].join('|') +
          ')$'
        ),
        threshold: 10240,
        minRatio: 0.8
      })
    );
  }
  return plugins;
};

// 生产环境去掉 console.log
const getOptimization = () => {
  let optimization = {};
  if (isProd()) {
    optimization = {
      // https://webpack.docschina.org/configuration/optimization/#optimization-minimizer
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
            compress: {
              warnings: false,
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.log']
            }
          }
        })
      ]
    };
  }
  return optimization;
};

module.exports = defineConfig({
  /**
   * You can set by yourself according to actual condition
   * You will need to set this if you plan to deploy your site under a sub path,
   * for example GitHub pages. If you plan to deploy your site to https://foo.github.io/bar/,
   * then assetsPublicPath should be set to "/bar/".
   * In most cases please use '/' !!!
   * Detail https://cli.vuejs.org/config/#publicPath
   *  publicPath: process.env.NODE_ENV === 'production' ? `${pkg.name}` : './'
   */
  publicPath: './',
  assetsDir: 'static',
  lintOnSave: process.env.NODE_ENV !== 'production',
  productionSourceMap: false,
  // webpack-dev-server 相关配置
  devServer: {
  headers: {
      'Access-Control-Allow-Origin': '*'
    },
    port: 3000,
    https: false,
    client: {
      overlay: {
        warnings: false,
        errors: true
      }
    }
    // 代理示例 https://webpack.docschina.org/configuration/dev-server/#devserver-proxy
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:8000', // 后端接口地址
    //     ws: true,
    //     changeOrigin: true, // 是否允许跨域
    //     pathRewrite: {
    //       '^/api': ''   // 直接用'api/接口名'进行请求.
    //     }
    //   }
    // }
  },
  // css相关配置
  css: {
    // 是否使用css分离插件 ExtractTextPlugin
    extract: isProd() ? true : false,
    // 开启 CSS source maps?
    sourceMap: isProd() ? true : false,
    // css预设器配置项
    loaderOptions: {
      less: {
        // 全局注入变量及mixins
        additionalData: `@import "@/assets/style/variable.less";@import "@winner-fed/magicless/magicless.less";`,
      }
    }
  },
  // disable thread-loader, which is not compactible with this plugin
  parallel: false,  
  configureWebpack: () => ({
    name: `${pkg.name}`,
    resolve: {
      alias: {
        '@': resolve('src'),
        '@assets': resolve('src/assets'),
        '@style': resolve('src/assets/style'),
        '@js': resolve('src/assets/js'),
        '@components': resolve('src/components'),
        '@mixins': resolve('src/mixins'),
        '@filters': resolve('src/filters'),
        '@store': resolve('src/store'),
        '@views': resolve('src/views'),

        // 文件别名
        services: resolve('src/services'),
        variable: resolve('src/assets/style/variable.less'),
        utils: resolve('node_modules/@winner-fed/cloud-utils/dist/cloud-utils.esm'),
        mixins: resolve('node_modules/@winner-fed/magicless/magicless.less'),
      }
    },
    plugins: genPlugins(),
    // https://github.com/cklwblove/vue-cli3-template/issues/12
    optimization: getOptimization(),
  }),
  // webpack配置
  // see https://github.com/vuejs/vue-cli/blob/dev/docs/webpack.md
  chainWebpack: (config) => {
    // module
   
    // svg
    // exclude icons
    config.module
      .rule('svg')
      .exclude.add(resolve('src/icons'))
      .end();
    config.module
      .rule('icons')
      .test(/\.svg$/)
      .include.add(resolve('src/icons'))
      .end()
      .use('svg-sprite-loader')
      .loader('svg-sprite-loader')
      .options({
        symbolId: 'icon-[name]'
      })
      .end();
    
    config
      .when(process.env.NODE_ENV === 'development',
        config => config.devtool('cheap-source-map')
      );

    // plugin
    
    // preload
    // 移除 preload 插件
    config
      .plugins
      .delete('preload');

    // when there are many pages, it will cause too many meaningless requests
    config
      .plugins
      .delete('prefetch');

    // webpack-html-plugin
    config
      .plugin('html')
      .tap((args) => {
        args[0].minify = {
          removeComments: true,
          collapseWhitespace: true,
          removeAttributeQuotes: true,
          useShortDoctype: true,
          removeEmptyAttributes: true,
          removeStyleLinkTypeAttributes: true,
          keepClosingSlash: true,
          minifyJS: true,
          minifyCSS: true,
          minifyURLs: true
        };
        return args;
      });

    // optimization
    config
      .when(process.env.NODE_ENV === 'production',
        config => {
          config
            .optimization
            .splitChunks({
              chunks: 'all',
              cacheGroups: {
                defaultVendors: {
                  name: 'chunk-vendors',
                  test: /[\\/]node_modules[\\/]/,
                  priority: 10,
                  chunks: 'initial' // 只打包初始时依赖的第三方
                },
                commons: {
                  name: 'chunk-commons',
                  test: resolve('src/components'), // 可自定义拓展你的规则
                  minChunks: 3, // 最小公用次数
                  priority: 5,
                  reuseExistingChunk: true
                }
              }
            });
          config.optimization.runtimeChunk('single');
        }
      );
  },
  pluginOptions: {
    lintStyleOnBuild: true,
    stylelint: {}
  }
});