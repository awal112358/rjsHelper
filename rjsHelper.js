'use strict';

var path = require('path');
var fs = require('fs');

//requireJS helper object
//  needed so that this can be computed at the task runtime instead of
//  on config/load.  The only way to guarantee run-time accuracy is to
//  write a main file that gets loaded in via grunt's require task instead
//  of using the built in options which are analyzed at grunt config init
module.exports = function(grunt, root) {

    //validate root
    root = fs.realpathSync(root);
    if(!fs.existsSync(root)) {
        throw new Error("rjsHelper requires a valid root directory! Could not locate: "+root);
    }

    this._srcRoot = root;
    this._paths = [];
    this._pathMap = {};
    this._shim = {};
    this._srcMatchers = [];

    this._getHandle = function(filepath) {
        return filepath.replace(/\.js$/,'').replace(/^\.\//,'');
    };

    this.setShim = function(shimConfig) {
        this._shim = shimConfig;
    };

    this.setSrcMatchers = function(matchers) {
        this._srcMatchers = matchers;
    };

    this._generateFiles = function() {
        if(!this._srcMatchers) {
            throw new Error("generateFiles() error: setSrcMatchers() must be called first!");
        }
        if(!this._shim) {
            throw new Error("generateFiles() error: setShim() must be called first!");
        }

        //generate files from srcMatchers and shim provided
        var shimFiles = Object.keys(this._shim).map(function(val) {
            //ensure that file exists
            var absolutePath = root+path.sep+val+'.js';
            if(!fs.existsSync(absolutePath)) {
                throw new Error("filePath not found: "+absolutePath);
            }

            return './'+path.relative(root,absolutePath);
        });
        var matcherFiles = grunt.file.expand({
            cwd: root
        }, this._srcMatchers);

        //return the combination of files provided in shim as well as dynamically located matched files
        return this._paths = shimFiles.concat(matcherFiles);
    };

    this._generatePaths = function() {
        var files = this._paths || this._generateFiles();

        for (var i=0; i<files.length; i++) {
            this._pathMap[this._getHandle(files[i])] = files[i];
        }
    };

    this._generateShim = function() {
        var ngFilesFound = grunt.file.expand({
                cwd: root
        }, this._srcMatchers);

        for(var i=0; i<ngFilesFound.length; i++) {
            this._shim[this._getHandle(ngFilesFound[i])] = ['init'];
        }
    };

    this.writeFile = function() {
        this._generateFiles();
        this._generatePaths();
        this._generateShim();

        //stole this pattern from the shimmer library - allows us to specify
        //all of our info in the requirejs config file so that our config can
        //be accurate as of the task execution (specifically file.expand resolution)
        var out =
            '(function()\n' +
            '   {require({\n' +
            '       include: '+JSON.stringify(this._paths).replace(/,/g,',\n')+',\n'+
            '       paths:'+JSON.stringify(this._pathMap).replace(/,/g,',\n')+',\n' +
            '       shim:'+JSON.stringify(this._shim).replace(/,/g,',\n')+'\n' +
            '   });\n' +
            '}).call(this);';

        grunt.file.write(path.resolve(root,'require.main.js'),out);
    };
};