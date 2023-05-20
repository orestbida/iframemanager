const { minify } = require("terser");
const { writeFileSync, readFileSync } = require('fs');
const pkgName = 'iframemanager';

const srcFile = `src/${pkgName}.js`;
const distFile = `dist/${pkgName}.js`;

const code = readFileSync(srcFile, {
    encoding: 'utf8'
});

minify(code, {
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
        passes: 3,
        ecma: 5
    },
    safari10: true
}).then(output => {
    writeFileSync(distFile, output.code, {
        encoding: 'utf8'
    });
})