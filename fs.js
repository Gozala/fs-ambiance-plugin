/* vim:set ts=2 sw=2 sts=2 expandtab */
/*jshint asi: true undef: true es5: true node: true devel: true
         forin: true latedef: false supernew: true browser: true */
/*global define: true port: true */

"use strict";

var fs = require("fs")
var path = require("path")
var promises = require("micro-promise/core"),
    defer = promises.defer
var hub = require("plugin-hub/core"), meta = hub.meta, values = meta.values
var score = require("match-score")
var pattern = require("pattern-exp")

exports.name = "fs"
exports.version = "0.0.2"
exports.author = "Irakli Gozalishvili <rfobic@gmail.com>"
exports.description = "Filesystem bindings for an editor"
exports.stability = "unstable"

exports.types = {
  path: meta({
    description: "Path on the local filesystem"
  }, function match(input) {
    input = input && input.trim() || ""
    var directory = path.dirname(input + ".")
    var name = path.basename(input)
    var search = pattern(input || "\\w")
    var matches = fs.readdirSync(directory).
              map(function(entry) {
                var value = path.join(directory, entry)
                return [ value, score(search, value) ]
              }).
              filter(function(pairs) {
                return pairs[1] > 0
              }).
              sort(function(a, b) {
                return b[1] - a[1]
              }).
              map(function(pairs) {
                return pairs[0]
              })

    // If there is single match than it's perfect otherwise
    // we add given input.
    return ~matches.indexOf(input) ? [input] : matches.concat(input)
  })
}

var commands = {
  open: meta({
    description: "opens a file in a buffer",
    takes: [ "path", { type: "env", hidden: true } ]
  }, function open(path, env) {
    var deferred = defer()
    fs.readFile(path, function(error, data) {
      if (error) return deferred.reject(error)
      env.broadcast("fs:open", path, data)
      deferred.resolve()
    })
    return deferred.promise
  }),
  write: meta({
    description: "Saves file changes",
    takes: [ "env" ],
  }, function(env) {
    var deferred = defer()
    fs.writeFile(env.path, env.getBufferValue(), function(error) {
      if (error) return deferred.reject(error)
      else deferred.resolve()
    })
  }),
  "write-as": meta({
    description: "Saves buffer into file under given path",
    takes: [ "path", "env" ],
  }, function(path, env) {
    var deferred = defer()
    fs.writeFile(path, env.getBufferValue(), function(error) {
      if (error) return deferred.reject(error)
      else deferred.resolve()
    })
  }),
  pwd: meta({
    description: "Prints current working directory",
  }, function() {
    return process.cwd()
  }),
  ls: meta({
    description: "list files in the working dir",
    takes: [ "path" ]
  }, function ls(path) {
    var deferred = defer()
    fs.readdir(path, function(error, entries) {
      if (error) deferred.reject(error.message)
      deferred.resolve(entries.join("\n<br/>"))
    })
    return deferred.promise
  }),
  cd: meta({
    description: "change working directory",
    takes: [ "path" ]
  }, function exec(path) {
    process.chdir(path)
  })
}
exports.commands = commands

exports["oneditor:save"] = commands.write
exports.onstartup = function startup(env) {
  env.fs = exports
}
