import { defineConfig } from 'rollup';
import terser from "@rollup/plugin-terser";
import postcssCombineDuplicatedSelectors from 'postcss-combine-duplicated-selectors';
import cssnanoPlugin from 'cssnano';
import postcss from 'rollup-plugin-postcss';
import eslint from '@rollup/plugin-eslint';
import pkg from './package.json' with { type: "json"};

const srcDir = './src';
const distDir = './dist';
const input = `${srcDir}/iframemanager.js`;
const productionMode = !process.env.ROLLUP_WATCH;

const terserPlugin = terser({
    toplevel: true,
    format: {
        quote_style: 1,
        comments: /^!/
    },
    mangle: {
        properties: {
            regex: /^_/,
            keep_quoted: true
        }
    },
    compress: {
        drop_console: true,
        passes: 3
    },
    safari10: true
});

export default defineConfig(
    [
        {
            input: input,
            output: [
                {
                    file: pkg.main,
                    name: 'iframemanager'
                }
            ],
            plugins: [
                eslint({
                    fix: true,
                    include: ['./src/**'],
                    exclude: ['./src/scss/**']
                }),
                productionMode && terserPlugin,
            ]
        },
        {
            input: `${srcDir}/iframemanager.css`,
            output: {
                file: `${distDir}/iframemanager.css`,
            },
            plugins: postcss({
                extract: true,
                plugins: [
                    postcssCombineDuplicatedSelectors(),
                    productionMode && cssnanoPlugin({
                        preset: ["default", {
                            discardComments: {
                                removeAll: true,
                            }
                        }]
                    })
                ]
            }),
            onwarn(warning, warn) {
                if(warning.code === 'FILE_NAME_CONFLICT') return;
                warn(warning);
            }
        }
    ]
);