// Lets scripts/run-cron.mts load server code outside Next.js: the
// "server-only" guard package is swapped for an empty module.
const Module = require("node:module");
const path = require("node:path");
const empty = path.join(__dirname, "server-only-stub.cjs");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  return request === "server-only" ? empty : resolve.call(this, request, ...rest);
};
