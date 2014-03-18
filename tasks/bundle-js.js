/**
 * Grunt module for bundling sources from script tags found in an HTML file
 * into a single file and updating the HTML file with a new script tag,
 * removing the bundled tags.
 */
module.exports = function(grunt) {
    "use strict";

    var path    = require('path');
    var cheerio = require('cheerio');
    var uglify = require('uglify-js');

    var _ = grunt.util._;


    /**
     * Grunt bundlejs task.
     *
     * This task will collect and remove JavaScript script tags from an HTML
     * file, bundle the sources into a single file and update the HTML source
     * with a new script tag.
     *
     * UglifyJS is used for bundling and compressing the JavaScript source
     * files.
     *
     * Configuration:
     *
     * This task is a multi task and supports targets. A list of `files`
     * can be specified per target as an Object with the key being the target
     * file and the value an Array containing bundling configuration for
     * the source file.
     *
     * The `bundlejs` helper is used for bundling the scripts from an HTML
     * file. See the helper documentation for more information on available
     * bundling options.
     *
     *
     * @example
     */
    grunt.registerMultiTask('bundlejs', 'Bundle page script into a single file', function() {
        var options = _.extend({
            compress: true
        }, this.options());

        // Process each HTML file
        this.files.forEach(function(f) {
            if (f.src.length !== 1)
                grunt.fatal("Only one HTML source file can be specified");
            bundlejs(f.src[0], f.dest, options);
        });
    });

    var isUrlRe = /^\w+:\/\//;
    function bundlejs(src, dest, options, callback) {
        var outBase = options.outBase || path.dirname(src);
        var base    = options.base    || path.dirname(src);
        var root    = options.root    || base;

        var html = grunt.file.read(src);
        var $ = cheerio.load(html);

        var files = [];
        var scripts = $('script').filter(function() {
            var s = $(this).attr('src');

            if (!s || isUrlRe.test(s))
                return false;

            var f = s;
            if (s.charAt(0) === '/')
                f = path.join(root, s);
            else
                f = path.join(base, s);

            if (grunt.file.exists(f)) {
                files.push(f);
                return true;
            }
            else {
                return false;
            }
        });

        var bundle = uglify.minify(files, {
            mangle:   options.mangle,
            compress: options.compress,
            banner:   options.banner
        });

        console.log(files)
        // bundle.code = files.map(
        //     function(file) {
        //         return grunt.file.read(file);
        //     }
        // ).join('\n');

        grunt.file.write(dest, bundle.code);
        grunt.verbose.writeln('Bundled ' + String(files.length).cyan + ' scripts into ' + dest.cyan);

        scripts.remove();
        $('body').append(
            $('<script/>')
                .attr('src', path.relative(outBase, dest))
        );
        grunt.file.write(src, $.html());
        grunt.verbose.writeln('Rewrote ' + src.cyan);
    }
};
