const { minify } = require("terser");
const { writeFileSync, readFileSync } = require('fs');
const pkg = require('./package.json');

const srcFile = `src/${pkg.name}.js`;
const distFile = `dist/${pkg.name}.js`;

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
    }
}).then(output => {
    writeFileSync(distFile, output.code, {
        encoding: 'utf8'
    });
})