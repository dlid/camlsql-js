  /*! camlsqj-js v0.5.5 | (c) dlid.se | https://github.com/dlid/camlsql-js */

  // BEGIN C:\git\camlsql-js\src\app\js\vendor\q-1.5.1\q.js*/
  // vim:ts=4:sts=4:sw=4:
  /*!
   *
   * Copyright 2009-2017 Kris Kowal under the terms of the MIT
   * license found at https://github.com/kriskowal/q/blob/v1/LICENSE
   *
   * With parts by Tyler Close
   * Copyright 2007-2009 Tyler Close under the terms of the MIT X license found
   * at http://www.opensource.org/licenses/mit-license.html
   * Forked at ref_send.js version: 2009-05-11
   *
   * With parts by Mark Miller
   * Copyright (C) 2011 Google Inc.
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   * http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *
   */

  (function (definition) {
      "use strict";

      // This file will function properly as a <script> tag, or a module
      // using CommonJS and NodeJS or RequireJS module formats.  In
      // Common/Node/RequireJS, the module exports the Q API and when
      // executed as a simple <script>, it creates a Q global instead.

      // Montage Require
      if (typeof bootstrap === "function") {
          bootstrap("promise", definition);

      // CommonJS
      } else if (typeof exports === "object" && typeof module === "object") {
          module.exports = definition();

      // RequireJS
      } else if (typeof define === "function" && define.amd) {
          define(definition);

      // SES (Secure EcmaScript)
      } else if (typeof ses !== "undefined") {
          if (!ses.ok()) {
              return;
          } else {
              ses.makeQ = definition;
          }

      // <script>
      } else if (typeof window !== "undefined" || typeof self !== "undefined") {
          // Prefer window over self for add-on scripts. Use self for
          // non-windowed contexts.
          var global = typeof window !== "undefined" ? window : self;

          // Get the `window` object, save the previous Q global
          // and initialize Q as a global.
          var previousQ = global.Q;
          global.Q = definition();

          // Add a noConflict function so Q can be removed from the
          // global namespace.
          global.Q.noConflict = function () {
              global.Q = previousQ;
              return this;
          };

      } else {
          throw new Error("This environment was not anticipated by Q. Please file a bug.");
      }

  })(function () {
  "use strict";

  var hasStacks = false;
  try {
      throw new Error();
  } catch (e) {
      hasStacks = !!e.stack;
  }

  // All code after this point will be filtered from stack traces reported
  // by Q.
  var qStartingLine = captureLine();
  var qFileName;

  // shims

  // used for fallback in "allResolved"
  var noop = function () {};

  // Use the fastest possible means to execute a task in a future turn
  // of the event loop.
  var nextTick =(function () {
      // linked list of tasks (single, with head node)
      var head = {task: void 0, next: null};
      var tail = head;
      var flushing = false;
      var requestTick = void 0;
      var isNodeJS = false;
      // queue for late tasks, used by unhandled rejection tracking
      var laterQueue = [];

      function flush() {
          /* jshint loopfunc: true */
          var task, domain;

          while (head.next) {
              head = head.next;
              task = head.task;
              head.task = void 0;
              domain = head.domain;

              if (domain) {
                  head.domain = void 0;
                  domain.enter();
              }
              runSingle(task, domain);

          }
          while (laterQueue.length) {
              task = laterQueue.pop();
              runSingle(task);
          }
          flushing = false;
      }
      // runs a single function in the async queue
      function runSingle(task, domain) {
          try {
              task();

          } catch (e) {
              if (isNodeJS) {
                  // In node, uncaught exceptions are considered fatal errors.
                  // Re-throw them synchronously to interrupt flushing!

                  // Ensure continuation if the uncaught exception is suppressed
                  // listening "uncaughtException" events (as domains does).
                  // Continue in next event to avoid tick recursion.
                  if (domain) {
                      domain.exit();
                  }
                  setTimeout(flush, 0);
                  if (domain) {
                      domain.enter();
                  }

                  throw e;

              } else {
                  // In browsers, uncaught exceptions are not fatal.
                  // Re-throw them asynchronously to avoid slow-downs.
                  setTimeout(function () {
                      throw e;
                  }, 0);
              }
          }

          if (domain) {
              domain.exit();
          }
      }

      nextTick = function (task) {
          tail = tail.next = {
              task: task,
              domain: isNodeJS && process.domain,
              next: null
          };

          if (!flushing) {
              flushing = true;
              requestTick();
          }
      };

      if (typeof process === "object" &&
          process.toString() === "[object process]" && process.nextTick) {
          // Ensure Q is in a real Node environment, with a `process.nextTick`.
          // To see through fake Node environments:
          // * Mocha test runner - exposes a `process` global without a `nextTick`
          // * Browserify - exposes a `process.nexTick` function that uses
          //   `setTimeout`. In this case `setImmediate` is preferred because
          //    it is faster. Browserify's `process.toString()` yields
          //   "[object Object]", while in a real Node environment
          //   `process.toString()` yields "[object process]".
          isNodeJS = true;

          requestTick = function () {
              process.nextTick(flush);
          };

      } else if (typeof setImmediate === "function") {
          // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
          if (typeof window !== "undefined") {
              requestTick = setImmediate.bind(window, flush);
          } else {
              requestTick = function () {
                  setImmediate(flush);
              };
          }

      } else if (typeof MessageChannel !== "undefined") {
          // modern browsers
          // http://www.nonblocking.io/2011/06/windownexttick.html
          var channel = new MessageChannel();
          // At least Safari Version 6.0.5 (8536.30.1) intermittently cannot create
          // working message ports the first time a page loads.
          channel.port1.onmessage = function () {
              requestTick = requestPortTick;
              channel.port1.onmessage = flush;
              flush();
          };
          var requestPortTick = function () {
              // Opera requires us to provide a message payload, regardless of
              // whether we use it.
              channel.port2.postMessage(0);
          };
          requestTick = function () {
              setTimeout(flush, 0);
              requestPortTick();
          };

      } else {
          // old browsers
          requestTick = function () {
              setTimeout(flush, 0);
          };
      }
      // runs a task after all other tasks have been run
      // this is useful for unhandled rejection tracking that needs to happen
      // after all `then`d tasks have been run.
      nextTick.runAfter = function (task) {
          laterQueue.push(task);
          if (!flushing) {
              flushing = true;
              requestTick();
          }
      };
      return nextTick;
  })();

  // Attempt to make generics safe in the face of downstream
  // modifications.
  // There is no situation where this is necessary.
  // If you need a security guarantee, these primordials need to be
  // deeply frozen anyway, and if you don’t need a security guarantee,
  // this is just plain paranoid.
  // However, this **might** have the nice side-effect of reducing the size of
  // the minified code by reducing x.call() to merely x()
  // See Mark Miller’s explanation of what this does.
  // http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
  var call = Function.call;
  function uncurryThis(f) {
      return function () {
          return call.apply(f, arguments);
      };
  }
  // This is equivalent, but slower:
  // uncurryThis = Function_bind.bind(Function_bind.call);
  // http://jsperf.com/uncurrythis

  var array_slice = uncurryThis(Array.prototype.slice);

  var array_reduce = uncurryThis(
      Array.prototype.reduce || function (callback, basis) {
          var index = 0,
              length = this.length;
          // concerning the initial value, if one is not provided
          if (arguments.length === 1) {
              // seek to the first value in the array, accounting
              // for the possibility that is is a sparse array
              do {
                  if (index in this) {
                      basis = this[index++];
                      break;
                  }
                  if (++index >= length) {
                      throw new TypeError();
                  }
              } while (1);
          }
          // reduce
          for (; index < length; index++) {
              // account for the possibility that the array is sparse
              if (index in this) {
                  basis = callback(basis, this[index], index);
              }
          }
          return basis;
      }
  );

  var array_indexOf = uncurryThis(
      Array.prototype.indexOf || function (value) {
          // not a very good shim, but good enough for our one use of it
          for (var i = 0; i < this.length; i++) {
              if (this[i] === value) {
                  return i;
              }
          }
          return -1;
      }
  );

  var array_map = uncurryThis(
      Array.prototype.map || function (callback, thisp) {
          var self = this;
          var collect = [];
          array_reduce(self, function (undefined, value, index) {
              collect.push(callback.call(thisp, value, index, self));
          }, void 0);
          return collect;
      }
  );

  var object_create = Object.create || function (prototype) {
      function Type() { }
      Type.prototype = prototype;
      return new Type();
  };

  var object_defineProperty = Object.defineProperty || function (obj, prop, descriptor) {
      obj[prop] = descriptor.value;
      return obj;
  };

  var object_hasOwnProperty = uncurryThis(Object.prototype.hasOwnProperty);

  var object_keys = Object.keys || function (object) {
      var keys = [];
      for (var key in object) {
          if (object_hasOwnProperty(object, key)) {
              keys.push(key);
          }
      }
      return keys;
  };

  var object_toString = uncurryThis(Object.prototype.toString);

  function isObject(value) {
      return value === Object(value);
  }

  // generator related shims

  // FIXME: Remove this function once ES6 generators are in SpiderMonkey.
  function isStopIteration(exception) {
      return (
          object_toString(exception) === "[object StopIteration]" ||
          exception instanceof QReturnValue
      );
  }

  // FIXME: Remove this helper and Q.return once ES6 generators are in
  // SpiderMonkey.
  var QReturnValue;
  if (typeof ReturnValue !== "undefined") {
      QReturnValue = ReturnValue;
  } else {
      QReturnValue = function (value) {
          this.value = value;
      };
  }

  // long stack traces

  var STACK_JUMP_SEPARATOR = "From previous event:";

  function makeStackTraceLong(error, promise) {
      // If possible, transform the error stack trace by removing Node and Q
      // cruft, then concatenating with the stack trace of `promise`. See #57.
      if (hasStacks &&
          promise.stack &&
          typeof error === "object" &&
          error !== null &&
          error.stack
      ) {
          var stacks = [];
          for (var p = promise; !!p; p = p.source) {
              if (p.stack && (!error.__minimumStackCounter__ || error.__minimumStackCounter__ > p.stackCounter)) {
                  object_defineProperty(error, "__minimumStackCounter__", {value: p.stackCounter, configurable: true});
                  stacks.unshift(p.stack);
              }
          }
          stacks.unshift(error.stack);

          var concatedStacks = stacks.join("\n" + STACK_JUMP_SEPARATOR + "\n");
          var stack = filterStackString(concatedStacks);
          object_defineProperty(error, "stack", {value: stack, configurable: true});
      }
  }

  function filterStackString(stackString) {
      var lines = stackString.split("\n");
      var desiredLines = [];
      for (var i = 0; i < lines.length; ++i) {
          var line = lines[i];

          if (!isInternalFrame(line) && !isNodeFrame(line) && line) {
              desiredLines.push(line);
          }
      }
      return desiredLines.join("\n");
  }

  function isNodeFrame(stackLine) {
      return stackLine.indexOf("(module.js:") !== -1 ||
             stackLine.indexOf("(node.js:") !== -1;
  }

  function getFileNameAndLineNumber(stackLine) {
      // Named functions: "at functionName (filename:lineNumber:columnNumber)"
      // In IE10 function name can have spaces ("Anonymous function") O_o
      var attempt1 = /at .+ \((.+):(\d+):(?:\d+)\)$/.exec(stackLine);
      if (attempt1) {
          return [attempt1[1], Number(attempt1[2])];
      }

      // Anonymous functions: "at filename:lineNumber:columnNumber"
      var attempt2 = /at ([^ ]+):(\d+):(?:\d+)$/.exec(stackLine);
      if (attempt2) {
          return [attempt2[1], Number(attempt2[2])];
      }

      // Firefox style: "function@filename:lineNumber or @filename:lineNumber"
      var attempt3 = /.*@(.+):(\d+)$/.exec(stackLine);
      if (attempt3) {
          return [attempt3[1], Number(attempt3[2])];
      }
  }

  function isInternalFrame(stackLine) {
      var fileNameAndLineNumber = getFileNameAndLineNumber(stackLine);

      if (!fileNameAndLineNumber) {
          return false;
      }

      var fileName = fileNameAndLineNumber[0];
      var lineNumber = fileNameAndLineNumber[1];

      return fileName === qFileName &&
          lineNumber >= qStartingLine &&
          lineNumber <= qEndingLine;
  }

  // discover own file name and line number range for filtering stack
  // traces
  function captureLine() {
      if (!hasStacks) {
          return;
      }

      try {
          throw new Error();
      } catch (e) {
          var lines = e.stack.split("\n");
          var firstLine = lines[0].indexOf("@") > 0 ? lines[1] : lines[2];
          var fileNameAndLineNumber = getFileNameAndLineNumber(firstLine);
          if (!fileNameAndLineNumber) {
              return;
          }

          qFileName = fileNameAndLineNumber[0];
          return fileNameAndLineNumber[1];
      }
  }

  function deprecate(callback, name, alternative) {
      return function () {
          if (typeof console !== "undefined" &&
              typeof console.warn === "function") {
              console.warn(name + " is deprecated, use " + alternative +
                           " instead.", new Error("").stack);
          }
          return callback.apply(callback, arguments);
      };
  }

  // end of shims
  // beginning of real work

  /**
   * Constructs a promise for an immediate reference, passes promises through, or
   * coerces promises from different systems.
   * @param value immediate reference or promise
   */
  function Q(value) {
      // If the object is already a Promise, return it directly.  This enables
      // the resolve function to both be used to created references from objects,
      // but to tolerably coerce non-promises to promises.
      if (value instanceof Promise) {
          return value;
      }

      // assimilate thenables
      if (isPromiseAlike(value)) {
          return coerce(value);
      } else {
          return fulfill(value);
      }
  }
  Q.resolve = Q;

  /**
   * Performs a task in a future turn of the event loop.
   * @param {Function} task
   */
  Q.nextTick = nextTick;

  /**
   * Controls whether or not long stack traces will be on
   */
  Q.longStackSupport = false;

  /**
   * The counter is used to determine the stopping point for building
   * long stack traces. In makeStackTraceLong we walk backwards through
   * the linked list of promises, only stacks which were created before
   * the rejection are concatenated.
   */
  var longStackCounter = 1;

  // enable long stacks if Q_DEBUG is set
  if (typeof process === "object" && process && process.env && process.env.Q_DEBUG) {
      Q.longStackSupport = true;
  }

  /**
   * Constructs a {promise, resolve, reject} object.
   *
   * `resolve` is a callback to invoke with a more resolved value for the
   * promise. To fulfill the promise, invoke `resolve` with any value that is
   * not a thenable. To reject the promise, invoke `resolve` with a rejected
   * thenable, or invoke `reject` with the reason directly. To resolve the
   * promise to another thenable, thus putting it in the same state, invoke
   * `resolve` with that other thenable.
   */
  Q.defer = defer;
  function defer() {
      // if "messages" is an "Array", that indicates that the promise has not yet
      // been resolved.  If it is "undefined", it has been resolved.  Each
      // element of the messages array is itself an array of complete arguments to
      // forward to the resolved promise.  We coerce the resolution value to a
      // promise using the `resolve` function because it handles both fully
      // non-thenable values and other thenables gracefully.
      var messages = [], progressListeners = [], resolvedPromise;

      var deferred = object_create(defer.prototype);
      var promise = object_create(Promise.prototype);

      promise.promiseDispatch = function (resolve, op, operands) {
          var args = array_slice(arguments);
          if (messages) {
              messages.push(args);
              if (op === "when" && operands[1]) { // progress operand
                  progressListeners.push(operands[1]);
              }
          } else {
              Q.nextTick(function () {
                  resolvedPromise.promiseDispatch.apply(resolvedPromise, args);
              });
          }
      };

      // XXX deprecated
      promise.valueOf = function () {
          if (messages) {
              return promise;
          }
          var nearerValue = nearer(resolvedPromise);
          if (isPromise(nearerValue)) {
              resolvedPromise = nearerValue; // shorten chain
          }
          return nearerValue;
      };

      promise.inspect = function () {
          if (!resolvedPromise) {
              return { state: "pending" };
          }
          return resolvedPromise.inspect();
      };

      if (Q.longStackSupport && hasStacks) {
          try {
              throw new Error();
          } catch (e) {
              // NOTE: don't try to use `Error.captureStackTrace` or transfer the
              // accessor around; that causes memory leaks as per GH-111. Just
              // reify the stack trace as a string ASAP.
              //
              // At the same time, cut off the first line; it's always just
              // "[object Promise]\n", as per the `toString`.
              promise.stack = e.stack.substring(e.stack.indexOf("\n") + 1);
              promise.stackCounter = longStackCounter++;
          }
      }

      // NOTE: we do the checks for `resolvedPromise` in each method, instead of
      // consolidating them into `become`, since otherwise we'd create new
      // promises with the lines `become(whatever(value))`. See e.g. GH-252.

      function become(newPromise) {
          resolvedPromise = newPromise;

          if (Q.longStackSupport && hasStacks) {
              // Only hold a reference to the new promise if long stacks
              // are enabled to reduce memory usage
              promise.source = newPromise;
          }

          array_reduce(messages, function (undefined, message) {
              Q.nextTick(function () {
                  newPromise.promiseDispatch.apply(newPromise, message);
              });
          }, void 0);

          messages = void 0;
          progressListeners = void 0;
      }

      deferred.promise = promise;
      deferred.resolve = function (value) {
          if (resolvedPromise) {
              return;
          }

          become(Q(value));
      };

      deferred.fulfill = function (value) {
          if (resolvedPromise) {
              return;
          }

          become(fulfill(value));
      };
      deferred.reject = function (reason) {
          if (resolvedPromise) {
              return;
          }

          become(reject(reason));
      };
      deferred.notify = function (progress) {
          if (resolvedPromise) {
              return;
          }

          array_reduce(progressListeners, function (undefined, progressListener) {
              Q.nextTick(function () {
                  progressListener(progress);
              });
          }, void 0);
      };

      return deferred;
  }

  /**
   * Creates a Node-style callback that will resolve or reject the deferred
   * promise.
   * @returns a nodeback
   */
  defer.prototype.makeNodeResolver = function () {
      var self = this;
      return function (error, value) {
          if (error) {
              self.reject(error);
          } else if (arguments.length > 2) {
              self.resolve(array_slice(arguments, 1));
          } else {
              self.resolve(value);
          }
      };
  };

  /**
   * @param resolver {Function} a function that returns nothing and accepts
   * the resolve, reject, and notify functions for a deferred.
   * @returns a promise that may be resolved with the given resolve and reject
   * functions, or rejected by a thrown exception in resolver
   */
  Q.Promise = promise; // ES6
  Q.promise = promise;
  function promise(resolver) {
      if (typeof resolver !== "function") {
          throw new TypeError("resolver must be a function.");
      }
      var deferred = defer();
      try {
          resolver(deferred.resolve, deferred.reject, deferred.notify);
      } catch (reason) {
          deferred.reject(reason);
      }
      return deferred.promise;
  }

  promise.race = race; // ES6
  promise.all = all; // ES6
  promise.reject = reject; // ES6
  promise.resolve = Q; // ES6

  // XXX experimental.  This method is a way to denote that a local value is
  // serializable and should be immediately dispatched to a remote upon request,
  // instead of passing a reference.
  Q.passByCopy = function (object) {
      //freeze(object);
      //passByCopies.set(object, true);
      return object;
  };

  Promise.prototype.passByCopy = function () {
      //freeze(object);
      //passByCopies.set(object, true);
      return this;
  };

  /**
   * If two promises eventually fulfill to the same value, promises that value,
   * but otherwise rejects.
   * @param x {Any*}
   * @param y {Any*}
   * @returns {Any*} a promise for x and y if they are the same, but a rejection
   * otherwise.
   *
   */
  Q.join = function (x, y) {
      return Q(x).join(y);
  };

  Promise.prototype.join = function (that) {
      return Q([this, that]).spread(function (x, y) {
          if (x === y) {
              // TODO: "===" should be Object.is or equiv
              return x;
          } else {
              throw new Error("Q can't join: not the same: " + x + " " + y);
          }
      });
  };

  /**
   * Returns a promise for the first of an array of promises to become settled.
   * @param answers {Array[Any*]} promises to race
   * @returns {Any*} the first promise to be settled
   */
  Q.race = race;
  function race(answerPs) {
      return promise(function (resolve, reject) {
          // Switch to this once we can assume at least ES5
          // answerPs.forEach(function (answerP) {
          //     Q(answerP).then(resolve, reject);
          // });
          // Use this in the meantime
          for (var i = 0, len = answerPs.length; i < len; i++) {
              Q(answerPs[i]).then(resolve, reject);
          }
      });
  }

  Promise.prototype.race = function () {
      return this.then(Q.race);
  };

  /**
   * Constructs a Promise with a promise descriptor object and optional fallback
   * function.  The descriptor contains methods like when(rejected), get(name),
   * set(name, value), post(name, args), and delete(name), which all
   * return either a value, a promise for a value, or a rejection.  The fallback
   * accepts the operation name, a resolver, and any further arguments that would
   * have been forwarded to the appropriate method above had a method been
   * provided with the proper name.  The API makes no guarantees about the nature
   * of the returned object, apart from that it is usable whereever promises are
   * bought and sold.
   */
  Q.makePromise = Promise;
  function Promise(descriptor, fallback, inspect) {
      if (fallback === void 0) {
          fallback = function (op) {
              return reject(new Error(
                  "Promise does not support operation: " + op
              ));
          };
      }
      if (inspect === void 0) {
          inspect = function () {
              return {state: "unknown"};
          };
      }

      var promise = object_create(Promise.prototype);

      promise.promiseDispatch = function (resolve, op, args) {
          var result;
          try {
              if (descriptor[op]) {
                  result = descriptor[op].apply(promise, args);
              } else {
                  result = fallback.call(promise, op, args);
              }
          } catch (exception) {
              result = reject(exception);
          }
          if (resolve) {
              resolve(result);
          }
      };

      promise.inspect = inspect;

      // XXX deprecated `valueOf` and `exception` support
      if (inspect) {
          var inspected = inspect();
          if (inspected.state === "rejected") {
              promise.exception = inspected.reason;
          }

          promise.valueOf = function () {
              var inspected = inspect();
              if (inspected.state === "pending" ||
                  inspected.state === "rejected") {
                  return promise;
              }
              return inspected.value;
          };
      }

      return promise;
  }

  Promise.prototype.toString = function () {
      return "[object Promise]";
  };

  Promise.prototype.then = function (fulfilled, rejected, progressed) {
      var self = this;
      var deferred = defer();
      var done = false;   // ensure the untrusted promise makes at most a
                          // single call to one of the callbacks

      function _fulfilled(value) {
          try {
              return typeof fulfilled === "function" ? fulfilled(value) : value;
          } catch (exception) {
              return reject(exception);
          }
      }

      function _rejected(exception) {
          if (typeof rejected === "function") {
              makeStackTraceLong(exception, self);
              try {
                  return rejected(exception);
              } catch (newException) {
                  return reject(newException);
              }
          }
          return reject(exception);
      }

      function _progressed(value) {
          return typeof progressed === "function" ? progressed(value) : value;
      }

      Q.nextTick(function () {
          self.promiseDispatch(function (value) {
              if (done) {
                  return;
              }
              done = true;

              deferred.resolve(_fulfilled(value));
          }, "when", [function (exception) {
              if (done) {
                  return;
              }
              done = true;

              deferred.resolve(_rejected(exception));
          }]);
      });

      // Progress propagator need to be attached in the current tick.
      self.promiseDispatch(void 0, "when", [void 0, function (value) {
          var newValue;
          var threw = false;
          try {
              newValue = _progressed(value);
          } catch (e) {
              threw = true;
              if (Q.onerror) {
                  Q.onerror(e);
              } else {
                  throw e;
              }
          }

          if (!threw) {
              deferred.notify(newValue);
          }
      }]);

      return deferred.promise;
  };

  Q.tap = function (promise, callback) {
      return Q(promise).tap(callback);
  };

  /**
   * Works almost like "finally", but not called for rejections.
   * Original resolution value is passed through callback unaffected.
   * Callback may return a promise that will be awaited for.
   * @param {Function} callback
   * @returns {Q.Promise}
   * @example
   * doSomething()
   *   .then(...)
   *   .tap(console.log)
   *   .then(...);
   */
  Promise.prototype.tap = function (callback) {
      callback = Q(callback);

      return this.then(function (value) {
          return callback.fcall(value).thenResolve(value);
      });
  };

  /**
   * Registers an observer on a promise.
   *
   * Guarantees:
   *
   * 1. that fulfilled and rejected will be called only once.
   * 2. that either the fulfilled callback or the rejected callback will be
   *    called, but not both.
   * 3. that fulfilled and rejected will not be called in this turn.
   *
   * @param value      promise or immediate reference to observe
   * @param fulfilled  function to be called with the fulfilled value
   * @param rejected   function to be called with the rejection exception
   * @param progressed function to be called on any progress notifications
   * @return promise for the return value from the invoked callback
   */
  Q.when = when;
  function when(value, fulfilled, rejected, progressed) {
      return Q(value).then(fulfilled, rejected, progressed);
  }

  Promise.prototype.thenResolve = function (value) {
      return this.then(function () { return value; });
  };

  Q.thenResolve = function (promise, value) {
      return Q(promise).thenResolve(value);
  };

  Promise.prototype.thenReject = function (reason) {
      return this.then(function () { throw reason; });
  };

  Q.thenReject = function (promise, reason) {
      return Q(promise).thenReject(reason);
  };

  /**
   * If an object is not a promise, it is as "near" as possible.
   * If a promise is rejected, it is as "near" as possible too.
   * If it’s a fulfilled promise, the fulfillment value is nearer.
   * If it’s a deferred promise and the deferred has been resolved, the
   * resolution is "nearer".
   * @param object
   * @returns most resolved (nearest) form of the object
   */

  // XXX should we re-do this?
  Q.nearer = nearer;
  function nearer(value) {
      if (isPromise(value)) {
          var inspected = value.inspect();
          if (inspected.state === "fulfilled") {
              return inspected.value;
          }
      }
      return value;
  }

  /**
   * @returns whether the given object is a promise.
   * Otherwise it is a fulfilled value.
   */
  Q.isPromise = isPromise;
  function isPromise(object) {
      return object instanceof Promise;
  }

  Q.isPromiseAlike = isPromiseAlike;
  function isPromiseAlike(object) {
      return isObject(object) && typeof object.then === "function";
  }

  /**
   * @returns whether the given object is a pending promise, meaning not
   * fulfilled or rejected.
   */
  Q.isPending = isPending;
  function isPending(object) {
      return isPromise(object) && object.inspect().state === "pending";
  }

  Promise.prototype.isPending = function () {
      return this.inspect().state === "pending";
  };

  /**
   * @returns whether the given object is a value or fulfilled
   * promise.
   */
  Q.isFulfilled = isFulfilled;
  function isFulfilled(object) {
      return !isPromise(object) || object.inspect().state === "fulfilled";
  }

  Promise.prototype.isFulfilled = function () {
      return this.inspect().state === "fulfilled";
  };

  /**
   * @returns whether the given object is a rejected promise.
   */
  Q.isRejected = isRejected;
  function isRejected(object) {
      return isPromise(object) && object.inspect().state === "rejected";
  }

  Promise.prototype.isRejected = function () {
      return this.inspect().state === "rejected";
  };

  //// BEGIN UNHANDLED REJECTION TRACKING

  // This promise library consumes exceptions thrown in handlers so they can be
  // handled by a subsequent promise.  The exceptions get added to this array when
  // they are created, and removed when they are handled.  Note that in ES6 or
  // shimmed environments, this would naturally be a `Set`.
  var unhandledReasons = [];
  var unhandledRejections = [];
  var reportedUnhandledRejections = [];
  var trackUnhandledRejections = true;

  function resetUnhandledRejections() {
      unhandledReasons.length = 0;
      unhandledRejections.length = 0;

      if (!trackUnhandledRejections) {
          trackUnhandledRejections = true;
      }
  }

  function trackRejection(promise, reason) {
      if (!trackUnhandledRejections) {
          return;
      }
      if (typeof process === "object" && typeof process.emit === "function") {
          Q.nextTick.runAfter(function () {
              if (array_indexOf(unhandledRejections, promise) !== -1) {
                  process.emit("unhandledRejection", reason, promise);
                  reportedUnhandledRejections.push(promise);
              }
          });
      }

      unhandledRejections.push(promise);
      if (reason && typeof reason.stack !== "undefined") {
          unhandledReasons.push(reason.stack);
      } else {
          unhandledReasons.push("(no stack) " + reason);
      }
  }

  function untrackRejection(promise) {
      if (!trackUnhandledRejections) {
          return;
      }

      var at = array_indexOf(unhandledRejections, promise);
      if (at !== -1) {
          if (typeof process === "object" && typeof process.emit === "function") {
              Q.nextTick.runAfter(function () {
                  var atReport = array_indexOf(reportedUnhandledRejections, promise);
                  if (atReport !== -1) {
                      process.emit("rejectionHandled", unhandledReasons[at], promise);
                      reportedUnhandledRejections.splice(atReport, 1);
                  }
              });
          }
          unhandledRejections.splice(at, 1);
          unhandledReasons.splice(at, 1);
      }
  }

  Q.resetUnhandledRejections = resetUnhandledRejections;

  Q.getUnhandledReasons = function () {
      // Make a copy so that consumers can't interfere with our internal state.
      return unhandledReasons.slice();
  };

  Q.stopUnhandledRejectionTracking = function () {
      resetUnhandledRejections();
      trackUnhandledRejections = false;
  };

  resetUnhandledRejections();

  //// END UNHANDLED REJECTION TRACKING

  /**
   * Constructs a rejected promise.
   * @param reason value describing the failure
   */
  Q.reject = reject;
  function reject(reason) {
      var rejection = Promise({
          "when": function (rejected) {
              // note that the error has been handled
              if (rejected) {
                  untrackRejection(this);
              }
              return rejected ? rejected(reason) : this;
          }
      }, function fallback() {
          return this;
      }, function inspect() {
          return { state: "rejected", reason: reason };
      });

      // Note that the reason has not been handled.
      trackRejection(rejection, reason);

      return rejection;
  }

  /**
   * Constructs a fulfilled promise for an immediate reference.
   * @param value immediate reference
   */
  Q.fulfill = fulfill;
  function fulfill(value) {
      return Promise({
          "when": function () {
              return value;
          },
          "get": function (name) {
              return value[name];
          },
          "set": function (name, rhs) {
              value[name] = rhs;
          },
          "delete": function (name) {
              delete value[name];
          },
          "post": function (name, args) {
              // Mark Miller proposes that post with no name should apply a
              // promised function.
              if (name === null || name === void 0) {
                  return value.apply(void 0, args);
              } else {
                  return value[name].apply(value, args);
              }
          },
          "apply": function (thisp, args) {
              return value.apply(thisp, args);
          },
          "keys": function () {
              return object_keys(value);
          }
      }, void 0, function inspect() {
          return { state: "fulfilled", value: value };
      });
  }

  /**
   * Converts thenables to Q promises.
   * @param promise thenable promise
   * @returns a Q promise
   */
  function coerce(promise) {
      var deferred = defer();
      Q.nextTick(function () {
          try {
              promise.then(deferred.resolve, deferred.reject, deferred.notify);
          } catch (exception) {
              deferred.reject(exception);
          }
      });
      return deferred.promise;
  }

  /**
   * Annotates an object such that it will never be
   * transferred away from this process over any promise
   * communication channel.
   * @param object
   * @returns promise a wrapping of that object that
   * additionally responds to the "isDef" message
   * without a rejection.
   */
  Q.master = master;
  function master(object) {
      return Promise({
          "isDef": function () {}
      }, function fallback(op, args) {
          return dispatch(object, op, args);
      }, function () {
          return Q(object).inspect();
      });
  }

  /**
   * Spreads the values of a promised array of arguments into the
   * fulfillment callback.
   * @param fulfilled callback that receives variadic arguments from the
   * promised array
   * @param rejected callback that receives the exception if the promise
   * is rejected.
   * @returns a promise for the return value or thrown exception of
   * either callback.
   */
  Q.spread = spread;
  function spread(value, fulfilled, rejected) {
      return Q(value).spread(fulfilled, rejected);
  }

  Promise.prototype.spread = function (fulfilled, rejected) {
      return this.all().then(function (array) {
          return fulfilled.apply(void 0, array);
      }, rejected);
  };

  /**
   * The async function is a decorator for generator functions, turning
   * them into asynchronous generators.  Although generators are only part
   * of the newest ECMAScript 6 drafts, this code does not cause syntax
   * errors in older engines.  This code should continue to work and will
   * in fact improve over time as the language improves.
   *
   * ES6 generators are currently part of V8 version 3.19 with the
   * --harmony-generators runtime flag enabled.  SpiderMonkey has had them
   * for longer, but under an older Python-inspired form.  This function
   * works on both kinds of generators.
   *
   * Decorates a generator function such that:
   *  - it may yield promises
   *  - execution will continue when that promise is fulfilled
   *  - the value of the yield expression will be the fulfilled value
   *  - it returns a promise for the return value (when the generator
   *    stops iterating)
   *  - the decorated function returns a promise for the return value
   *    of the generator or the first rejected promise among those
   *    yielded.
   *  - if an error is thrown in the generator, it propagates through
   *    every following yield until it is caught, or until it escapes
   *    the generator function altogether, and is translated into a
   *    rejection for the promise returned by the decorated generator.
   */
  Q.async = async;
  function async(makeGenerator) {
      return function () {
          // when verb is "send", arg is a value
          // when verb is "throw", arg is an exception
          function continuer(verb, arg) {
              var result;

              // Until V8 3.19 / Chromium 29 is released, SpiderMonkey is the only
              // engine that has a deployed base of browsers that support generators.
              // However, SM's generators use the Python-inspired semantics of
              // outdated ES6 drafts.  We would like to support ES6, but we'd also
              // like to make it possible to use generators in deployed browsers, so
              // we also support Python-style generators.  At some point we can remove
              // this block.

              if (typeof StopIteration === "undefined") {
                  // ES6 Generators
                  try {
                      result = generator[verb](arg);
                  } catch (exception) {
                      return reject(exception);
                  }
                  if (result.done) {
                      return Q(result.value);
                  } else {
                      return when(result.value, callback, errback);
                  }
              } else {
                  // SpiderMonkey Generators
                  // FIXME: Remove this case when SM does ES6 generators.
                  try {
                      result = generator[verb](arg);
                  } catch (exception) {
                      if (isStopIteration(exception)) {
                          return Q(exception.value);
                      } else {
                          return reject(exception);
                      }
                  }
                  return when(result, callback, errback);
              }
          }
          var generator = makeGenerator.apply(this, arguments);
          var callback = continuer.bind(continuer, "next");
          var errback = continuer.bind(continuer, "throw");
          return callback();
      };
  }

  /**
   * The spawn function is a small wrapper around async that immediately
   * calls the generator and also ends the promise chain, so that any
   * unhandled errors are thrown instead of forwarded to the error
   * handler. This is useful because it's extremely common to run
   * generators at the top-level to work with libraries.
   */
  Q.spawn = spawn;
  function spawn(makeGenerator) {
      Q.done(Q.async(makeGenerator)());
  }

  // FIXME: Remove this interface once ES6 generators are in SpiderMonkey.
  /**
   * Throws a ReturnValue exception to stop an asynchronous generator.
   *
   * This interface is a stop-gap measure to support generator return
   * values in older Firefox/SpiderMonkey.  In browsers that support ES6
   * generators like Chromium 29, just use "return" in your generator
   * functions.
   *
   * @param value the return value for the surrounding generator
   * @throws ReturnValue exception with the value.
   * @example
   * // ES6 style
   * Q.async(function* () {
   *      var foo = yield getFooPromise();
   *      var bar = yield getBarPromise();
   *      return foo + bar;
   * })
   * // Older SpiderMonkey style
   * Q.async(function () {
   *      var foo = yield getFooPromise();
   *      var bar = yield getBarPromise();
   *      Q.return(foo + bar);
   * })
   */
  Q["return"] = _return;
  function _return(value) {
      throw new QReturnValue(value);
  }

  /**
   * The promised function decorator ensures that any promise arguments
   * are settled and passed as values (`this` is also settled and passed
   * as a value).  It will also ensure that the result of a function is
   * always a promise.
   *
   * @example
   * var add = Q.promised(function (a, b) {
   *     return a + b;
   * });
   * add(Q(a), Q(B));
   *
   * @param {function} callback The function to decorate
   * @returns {function} a function that has been decorated.
   */
  Q.promised = promised;
  function promised(callback) {
      return function () {
          return spread([this, all(arguments)], function (self, args) {
              return callback.apply(self, args);
          });
      };
  }

  /**
   * sends a message to a value in a future turn
   * @param object* the recipient
   * @param op the name of the message operation, e.g., "when",
   * @param args further arguments to be forwarded to the operation
   * @returns result {Promise} a promise for the result of the operation
   */
  Q.dispatch = dispatch;
  function dispatch(object, op, args) {
      return Q(object).dispatch(op, args);
  }

  Promise.prototype.dispatch = function (op, args) {
      var self = this;
      var deferred = defer();
      Q.nextTick(function () {
          self.promiseDispatch(deferred.resolve, op, args);
      });
      return deferred.promise;
  };

  /**
   * Gets the value of a property in a future turn.
   * @param object    promise or immediate reference for target object
   * @param name      name of property to get
   * @return promise for the property value
   */
  Q.get = function (object, key) {
      return Q(object).dispatch("get", [key]);
  };

  Promise.prototype.get = function (key) {
      return this.dispatch("get", [key]);
  };

  /**
   * Sets the value of a property in a future turn.
   * @param object    promise or immediate reference for object object
   * @param name      name of property to set
   * @param value     new value of property
   * @return promise for the return value
   */
  Q.set = function (object, key, value) {
      return Q(object).dispatch("set", [key, value]);
  };

  Promise.prototype.set = function (key, value) {
      return this.dispatch("set", [key, value]);
  };

  /**
   * Deletes a property in a future turn.
   * @param object    promise or immediate reference for target object
   * @param name      name of property to delete
   * @return promise for the return value
   */
  Q.del = // XXX legacy
  Q["delete"] = function (object, key) {
      return Q(object).dispatch("delete", [key]);
  };

  Promise.prototype.del = // XXX legacy
  Promise.prototype["delete"] = function (key) {
      return this.dispatch("delete", [key]);
  };

  /**
   * Invokes a method in a future turn.
   * @param object    promise or immediate reference for target object
   * @param name      name of method to invoke
   * @param value     a value to post, typically an array of
   *                  invocation arguments for promises that
   *                  are ultimately backed with `resolve` values,
   *                  as opposed to those backed with URLs
   *                  wherein the posted value can be any
   *                  JSON serializable object.
   * @return promise for the return value
   */
  // bound locally because it is used by other methods
  Q.mapply = // XXX As proposed by "Redsandro"
  Q.post = function (object, name, args) {
      return Q(object).dispatch("post", [name, args]);
  };

  Promise.prototype.mapply = // XXX As proposed by "Redsandro"
  Promise.prototype.post = function (name, args) {
      return this.dispatch("post", [name, args]);
  };

  /**
   * Invokes a method in a future turn.
   * @param object    promise or immediate reference for target object
   * @param name      name of method to invoke
   * @param ...args   array of invocation arguments
   * @return promise for the return value
   */
  Q.send = // XXX Mark Miller's proposed parlance
  Q.mcall = // XXX As proposed by "Redsandro"
  Q.invoke = function (object, name /*...args*/) {
      return Q(object).dispatch("post", [name, array_slice(arguments, 2)]);
  };

  Promise.prototype.send = // XXX Mark Miller's proposed parlance
  Promise.prototype.mcall = // XXX As proposed by "Redsandro"
  Promise.prototype.invoke = function (name /*...args*/) {
      return this.dispatch("post", [name, array_slice(arguments, 1)]);
  };

  /**
   * Applies the promised function in a future turn.
   * @param object    promise or immediate reference for target function
   * @param args      array of application arguments
   */
  Q.fapply = function (object, args) {
      return Q(object).dispatch("apply", [void 0, args]);
  };

  Promise.prototype.fapply = function (args) {
      return this.dispatch("apply", [void 0, args]);
  };

  /**
   * Calls the promised function in a future turn.
   * @param object    promise or immediate reference for target function
   * @param ...args   array of application arguments
   */
  Q["try"] =
  Q.fcall = function (object /* ...args*/) {
      return Q(object).dispatch("apply", [void 0, array_slice(arguments, 1)]);
  };

  Promise.prototype.fcall = function (/*...args*/) {
      return this.dispatch("apply", [void 0, array_slice(arguments)]);
  };

  /**
   * Binds the promised function, transforming return values into a fulfilled
   * promise and thrown errors into a rejected one.
   * @param object    promise or immediate reference for target function
   * @param ...args   array of application arguments
   */
  Q.fbind = function (object /*...args*/) {
      var promise = Q(object);
      var args = array_slice(arguments, 1);
      return function fbound() {
          return promise.dispatch("apply", [
              this,
              args.concat(array_slice(arguments))
          ]);
      };
  };
  Promise.prototype.fbind = function (/*...args*/) {
      var promise = this;
      var args = array_slice(arguments);
      return function fbound() {
          return promise.dispatch("apply", [
              this,
              args.concat(array_slice(arguments))
          ]);
      };
  };

  /**
   * Requests the names of the owned properties of a promised
   * object in a future turn.
   * @param object    promise or immediate reference for target object
   * @return promise for the keys of the eventually settled object
   */
  Q.keys = function (object) {
      return Q(object).dispatch("keys", []);
  };

  Promise.prototype.keys = function () {
      return this.dispatch("keys", []);
  };

  /**
   * Turns an array of promises into a promise for an array.  If any of
   * the promises gets rejected, the whole array is rejected immediately.
   * @param {Array*} an array (or promise for an array) of values (or
   * promises for values)
   * @returns a promise for an array of the corresponding values
   */
  // By Mark Miller
  // http://wiki.ecmascript.org/doku.php?id=strawman:concurrency&rev=1308776521#allfulfilled
  Q.all = all;
  function all(promises) {
      return when(promises, function (promises) {
          var pendingCount = 0;
          var deferred = defer();
          array_reduce(promises, function (undefined, promise, index) {
              var snapshot;
              if (
                  isPromise(promise) &&
                  (snapshot = promise.inspect()).state === "fulfilled"
              ) {
                  promises[index] = snapshot.value;
              } else {
                  ++pendingCount;
                  when(
                      promise,
                      function (value) {
                          promises[index] = value;
                          if (--pendingCount === 0) {
                              deferred.resolve(promises);
                          }
                      },
                      deferred.reject,
                      function (progress) {
                          deferred.notify({ index: index, value: progress });
                      }
                  );
              }
          }, void 0);
          if (pendingCount === 0) {
              deferred.resolve(promises);
          }
          return deferred.promise;
      });
  }

  Promise.prototype.all = function () {
      return all(this);
  };

  /**
   * Returns the first resolved promise of an array. Prior rejected promises are
   * ignored.  Rejects only if all promises are rejected.
   * @param {Array*} an array containing values or promises for values
   * @returns a promise fulfilled with the value of the first resolved promise,
   * or a rejected promise if all promises are rejected.
   */
  Q.any = any;

  function any(promises) {
      if (promises.length === 0) {
          return Q.resolve();
      }

      var deferred = Q.defer();
      var pendingCount = 0;
      array_reduce(promises, function (prev, current, index) {
          var promise = promises[index];

          pendingCount++;

          when(promise, onFulfilled, onRejected, onProgress);
          function onFulfilled(result) {
              deferred.resolve(result);
          }
          function onRejected(err) {
              pendingCount--;
              if (pendingCount === 0) {
                  var rejection = err || new Error("" + err);

                  rejection.message = ("Q can't get fulfillment value from any promise, all " +
                      "promises were rejected. Last error message: " + rejection.message);

                  deferred.reject(rejection);
              }
          }
          function onProgress(progress) {
              deferred.notify({
                  index: index,
                  value: progress
              });
          }
      }, undefined);

      return deferred.promise;
  }

  Promise.prototype.any = function () {
      return any(this);
  };

  /**
   * Waits for all promises to be settled, either fulfilled or
   * rejected.  This is distinct from `all` since that would stop
   * waiting at the first rejection.  The promise returned by
   * `allResolved` will never be rejected.
   * @param promises a promise for an array (or an array) of promises
   * (or values)
   * @return a promise for an array of promises
   */
  Q.allResolved = deprecate(allResolved, "allResolved", "allSettled");
  function allResolved(promises) {
      return when(promises, function (promises) {
          promises = array_map(promises, Q);
          return when(all(array_map(promises, function (promise) {
              return when(promise, noop, noop);
          })), function () {
              return promises;
          });
      });
  }

  Promise.prototype.allResolved = function () {
      return allResolved(this);
  };

  /**
   * @see Promise#allSettled
   */
  Q.allSettled = allSettled;
  function allSettled(promises) {
      return Q(promises).allSettled();
  }

  /**
   * Turns an array of promises into a promise for an array of their states (as
   * returned by `inspect`) when they have all settled.
   * @param {Array[Any*]} values an array (or promise for an array) of values (or
   * promises for values)
   * @returns {Array[State]} an array of states for the respective values.
   */
  Promise.prototype.allSettled = function () {
      return this.then(function (promises) {
          return all(array_map(promises, function (promise) {
              promise = Q(promise);
              function regardless() {
                  return promise.inspect();
              }
              return promise.then(regardless, regardless);
          }));
      });
  };

  /**
   * Captures the failure of a promise, giving an oportunity to recover
   * with a callback.  If the given promise is fulfilled, the returned
   * promise is fulfilled.
   * @param {Any*} promise for something
   * @param {Function} callback to fulfill the returned promise if the
   * given promise is rejected
   * @returns a promise for the return value of the callback
   */
  Q.fail = // XXX legacy
  Q["catch"] = function (object, rejected) {
      return Q(object).then(void 0, rejected);
  };

  Promise.prototype.fail = // XXX legacy
  Promise.prototype["catch"] = function (rejected) {
      return this.then(void 0, rejected);
  };

  /**
   * Attaches a listener that can respond to progress notifications from a
   * promise's originating deferred. This listener receives the exact arguments
   * passed to ``deferred.notify``.
   * @param {Any*} promise for something
   * @param {Function} callback to receive any progress notifications
   * @returns the given promise, unchanged
   */
  Q.progress = progress;
  function progress(object, progressed) {
      return Q(object).then(void 0, void 0, progressed);
  }

  Promise.prototype.progress = function (progressed) {
      return this.then(void 0, void 0, progressed);
  };

  /**
   * Provides an opportunity to observe the settling of a promise,
   * regardless of whether the promise is fulfilled or rejected.  Forwards
   * the resolution to the returned promise when the callback is done.
   * The callback can return a promise to defer completion.
   * @param {Any*} promise
   * @param {Function} callback to observe the resolution of the given
   * promise, takes no arguments.
   * @returns a promise for the resolution of the given promise when
   * ``fin`` is done.
   */
  Q.fin = // XXX legacy
  Q["finally"] = function (object, callback) {
      return Q(object)["finally"](callback);
  };

  Promise.prototype.fin = // XXX legacy
  Promise.prototype["finally"] = function (callback) {
      if (!callback || typeof callback.apply !== "function") {
          throw new Error("Q can't apply finally callback");
      }
      callback = Q(callback);
      return this.then(function (value) {
          return callback.fcall().then(function () {
              return value;
          });
      }, function (reason) {
          // TODO attempt to recycle the rejection with "this".
          return callback.fcall().then(function () {
              throw reason;
          });
      });
  };

  /**
   * Terminates a chain of promises, forcing rejections to be
   * thrown as exceptions.
   * @param {Any*} promise at the end of a chain of promises
   * @returns nothing
   */
  Q.done = function (object, fulfilled, rejected, progress) {
      return Q(object).done(fulfilled, rejected, progress);
  };

  Promise.prototype.done = function (fulfilled, rejected, progress) {
      var onUnhandledError = function (error) {
          // forward to a future turn so that ``when``
          // does not catch it and turn it into a rejection.
          Q.nextTick(function () {
              makeStackTraceLong(error, promise);
              if (Q.onerror) {
                  Q.onerror(error);
              } else {
                  throw error;
              }
          });
      };

      // Avoid unnecessary `nextTick`ing via an unnecessary `when`.
      var promise = fulfilled || rejected || progress ?
          this.then(fulfilled, rejected, progress) :
          this;

      if (typeof process === "object" && process && process.domain) {
          onUnhandledError = process.domain.bind(onUnhandledError);
      }

      promise.then(void 0, onUnhandledError);
  };

  /**
   * Causes a promise to be rejected if it does not get fulfilled before
   * some milliseconds time out.
   * @param {Any*} promise
   * @param {Number} milliseconds timeout
   * @param {Any*} custom error message or Error object (optional)
   * @returns a promise for the resolution of the given promise if it is
   * fulfilled before the timeout, otherwise rejected.
   */
  Q.timeout = function (object, ms, error) {
      return Q(object).timeout(ms, error);
  };

  Promise.prototype.timeout = function (ms, error) {
      var deferred = defer();
      var timeoutId = setTimeout(function () {
          if (!error || "string" === typeof error) {
              error = new Error(error || "Timed out after " + ms + " ms");
              error.code = "ETIMEDOUT";
          }
          deferred.reject(error);
      }, ms);

      this.then(function (value) {
          clearTimeout(timeoutId);
          deferred.resolve(value);
      }, function (exception) {
          clearTimeout(timeoutId);
          deferred.reject(exception);
      }, deferred.notify);

      return deferred.promise;
  };

  /**
   * Returns a promise for the given value (or promised value), some
   * milliseconds after it resolved. Passes rejections immediately.
   * @param {Any*} promise
   * @param {Number} milliseconds
   * @returns a promise for the resolution of the given promise after milliseconds
   * time has elapsed since the resolution of the given promise.
   * If the given promise rejects, that is passed immediately.
   */
  Q.delay = function (object, timeout) {
      if (timeout === void 0) {
          timeout = object;
          object = void 0;
      }
      return Q(object).delay(timeout);
  };

  Promise.prototype.delay = function (timeout) {
      return this.then(function (value) {
          var deferred = defer();
          setTimeout(function () {
              deferred.resolve(value);
          }, timeout);
          return deferred.promise;
      });
  };

  /**
   * Passes a continuation to a Node function, which is called with the given
   * arguments provided as an array, and returns a promise.
   *
   *      Q.nfapply(FS.readFile, [__filename])
   *      .then(function (content) {
   *      })
   *
   */
  Q.nfapply = function (callback, args) {
      return Q(callback).nfapply(args);
  };

  Promise.prototype.nfapply = function (args) {
      var deferred = defer();
      var nodeArgs = array_slice(args);
      nodeArgs.push(deferred.makeNodeResolver());
      this.fapply(nodeArgs).fail(deferred.reject);
      return deferred.promise;
  };

  /**
   * Passes a continuation to a Node function, which is called with the given
   * arguments provided individually, and returns a promise.
   * @example
   * Q.nfcall(FS.readFile, __filename)
   * .then(function (content) {
   * })
   *
   */
  Q.nfcall = function (callback /*...args*/) {
      var args = array_slice(arguments, 1);
      return Q(callback).nfapply(args);
  };

  Promise.prototype.nfcall = function (/*...args*/) {
      var nodeArgs = array_slice(arguments);
      var deferred = defer();
      nodeArgs.push(deferred.makeNodeResolver());
      this.fapply(nodeArgs).fail(deferred.reject);
      return deferred.promise;
  };

  /**
   * Wraps a NodeJS continuation passing function and returns an equivalent
   * version that returns a promise.
   * @example
   * Q.nfbind(FS.readFile, __filename)("utf-8")
   * .then(console.log)
   * .done()
   */
  Q.nfbind =
  Q.denodeify = function (callback /*...args*/) {
      if (callback === undefined) {
          throw new Error("Q can't wrap an undefined function");
      }
      var baseArgs = array_slice(arguments, 1);
      return function () {
          var nodeArgs = baseArgs.concat(array_slice(arguments));
          var deferred = defer();
          nodeArgs.push(deferred.makeNodeResolver());
          Q(callback).fapply(nodeArgs).fail(deferred.reject);
          return deferred.promise;
      };
  };

  Promise.prototype.nfbind =
  Promise.prototype.denodeify = function (/*...args*/) {
      var args = array_slice(arguments);
      args.unshift(this);
      return Q.denodeify.apply(void 0, args);
  };

  Q.nbind = function (callback, thisp /*...args*/) {
      var baseArgs = array_slice(arguments, 2);
      return function () {
          var nodeArgs = baseArgs.concat(array_slice(arguments));
          var deferred = defer();
          nodeArgs.push(deferred.makeNodeResolver());
          function bound() {
              return callback.apply(thisp, arguments);
          }
          Q(bound).fapply(nodeArgs).fail(deferred.reject);
          return deferred.promise;
      };
  };

  Promise.prototype.nbind = function (/*thisp, ...args*/) {
      var args = array_slice(arguments, 0);
      args.unshift(this);
      return Q.nbind.apply(void 0, args);
  };

  /**
   * Calls a method of a Node-style object that accepts a Node-style
   * callback with a given array of arguments, plus a provided callback.
   * @param object an object that has the named method
   * @param {String} name name of the method of object
   * @param {Array} args arguments to pass to the method; the callback
   * will be provided by Q and appended to these arguments.
   * @returns a promise for the value or error
   */
  Q.nmapply = // XXX As proposed by "Redsandro"
  Q.npost = function (object, name, args) {
      return Q(object).npost(name, args);
  };

  Promise.prototype.nmapply = // XXX As proposed by "Redsandro"
  Promise.prototype.npost = function (name, args) {
      var nodeArgs = array_slice(args || []);
      var deferred = defer();
      nodeArgs.push(deferred.makeNodeResolver());
      this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
      return deferred.promise;
  };

  /**
   * Calls a method of a Node-style object that accepts a Node-style
   * callback, forwarding the given variadic arguments, plus a provided
   * callback argument.
   * @param object an object that has the named method
   * @param {String} name name of the method of object
   * @param ...args arguments to pass to the method; the callback will
   * be provided by Q and appended to these arguments.
   * @returns a promise for the value or error
   */
  Q.nsend = // XXX Based on Mark Miller's proposed "send"
  Q.nmcall = // XXX Based on "Redsandro's" proposal
  Q.ninvoke = function (object, name /*...args*/) {
      var nodeArgs = array_slice(arguments, 2);
      var deferred = defer();
      nodeArgs.push(deferred.makeNodeResolver());
      Q(object).dispatch("post", [name, nodeArgs]).fail(deferred.reject);
      return deferred.promise;
  };

  Promise.prototype.nsend = // XXX Based on Mark Miller's proposed "send"
  Promise.prototype.nmcall = // XXX Based on "Redsandro's" proposal
  Promise.prototype.ninvoke = function (name /*...args*/) {
      var nodeArgs = array_slice(arguments, 1);
      var deferred = defer();
      nodeArgs.push(deferred.makeNodeResolver());
      this.dispatch("post", [name, nodeArgs]).fail(deferred.reject);
      return deferred.promise;
  };

  /**
   * If a function would like to support both Node continuation-passing-style and
   * promise-returning-style, it can end its internal promise chain with
   * `nodeify(nodeback)`, forwarding the optional nodeback argument.  If the user
   * elects to use a nodeback, the result will be sent there.  If they do not
   * pass a nodeback, they will receive the result promise.
   * @param object a result (or a promise for a result)
   * @param {Function} nodeback a Node.js-style callback
   * @returns either the promise or nothing
   */
  Q.nodeify = nodeify;
  function nodeify(object, nodeback) {
      return Q(object).nodeify(nodeback);
  }

  Promise.prototype.nodeify = function (nodeback) {
      if (nodeback) {
          this.then(function (value) {
              Q.nextTick(function () {
                  nodeback(null, value);
              });
          }, function (error) {
              Q.nextTick(function () {
                  nodeback(error);
              });
          });
      } else {
          return this;
      }
  };

  Q.noConflict = function() {
      throw new Error("Q.noConflict only works when Q is used as a global");
  };

  // All code before this point will be filtered from stack traces.
  var qEndingLine = captureLine();

  return Q;

  });

  // END C:\git\camlsql-js\src\app\js\vendor\q-1.5.1\q.js

  // BEGIN C:\git\camlsql-js\node_modules\clipboard\dist\clipboard.min.js*/
  /*!
   * clipboard.js v1.7.1
   * https://zenorocha.github.io/clipboard.js
   *
   * Licensed MIT © Zeno Rocha
   */
  !function(t){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=t();else if("function"==typeof define&&define.amd)define([],t);else{var e;e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,e.Clipboard=t()}}(function(){var t,e,n;return function t(e,n,o){function i(a,c){if(!n[a]){if(!e[a]){var l="function"==typeof require&&require;if(!c&&l)return l(a,!0);if(r)return r(a,!0);var s=new Error("Cannot find module '"+a+"'");throw s.code="MODULE_NOT_FOUND",s}var u=n[a]={exports:{}};e[a][0].call(u.exports,function(t){var n=e[a][1][t];return i(n||t)},u,u.exports,t,e,n,o)}return n[a].exports}for(var r="function"==typeof require&&require,a=0;a<o.length;a++)i(o[a]);return i}({1:[function(t,e,n){function o(t,e){for(;t&&t.nodeType!==i;){if("function"==typeof t.matches&&t.matches(e))return t;t=t.parentNode}}var i=9;if("undefined"!=typeof Element&&!Element.prototype.matches){var r=Element.prototype;r.matches=r.matchesSelector||r.mozMatchesSelector||r.msMatchesSelector||r.oMatchesSelector||r.webkitMatchesSelector}e.exports=o},{}],2:[function(t,e,n){function o(t,e,n,o,r){var a=i.apply(this,arguments);return t.addEventListener(n,a,r),{destroy:function(){t.removeEventListener(n,a,r)}}}function i(t,e,n,o){return function(n){n.delegateTarget=r(n.target,e),n.delegateTarget&&o.call(t,n)}}var r=t("./closest");e.exports=o},{"./closest":1}],3:[function(t,e,n){n.node=function(t){return void 0!==t&&t instanceof HTMLElement&&1===t.nodeType},n.nodeList=function(t){var e=Object.prototype.toString.call(t);return void 0!==t&&("[object NodeList]"===e||"[object HTMLCollection]"===e)&&"length"in t&&(0===t.length||n.node(t[0]))},n.string=function(t){return"string"==typeof t||t instanceof String},n.fn=function(t){return"[object Function]"===Object.prototype.toString.call(t)}},{}],4:[function(t,e,n){function o(t,e,n){if(!t&&!e&&!n)throw new Error("Missing required arguments");if(!c.string(e))throw new TypeError("Second argument must be a String");if(!c.fn(n))throw new TypeError("Third argument must be a Function");if(c.node(t))return i(t,e,n);if(c.nodeList(t))return r(t,e,n);if(c.string(t))return a(t,e,n);throw new TypeError("First argument must be a String, HTMLElement, HTMLCollection, or NodeList")}function i(t,e,n){return t.addEventListener(e,n),{destroy:function(){t.removeEventListener(e,n)}}}function r(t,e,n){return Array.prototype.forEach.call(t,function(t){t.addEventListener(e,n)}),{destroy:function(){Array.prototype.forEach.call(t,function(t){t.removeEventListener(e,n)})}}}function a(t,e,n){return l(document.body,t,e,n)}var c=t("./is"),l=t("delegate");e.exports=o},{"./is":3,delegate:2}],5:[function(t,e,n){function o(t){var e;if("SELECT"===t.nodeName)t.focus(),e=t.value;else if("INPUT"===t.nodeName||"TEXTAREA"===t.nodeName){var n=t.hasAttribute("readonly");n||t.setAttribute("readonly",""),t.select(),t.setSelectionRange(0,t.value.length),n||t.removeAttribute("readonly"),e=t.value}else{t.hasAttribute("contenteditable")&&t.focus();var o=window.getSelection(),i=document.createRange();i.selectNodeContents(t),o.removeAllRanges(),o.addRange(i),e=o.toString()}return e}e.exports=o},{}],6:[function(t,e,n){function o(){}o.prototype={on:function(t,e,n){var o=this.e||(this.e={});return(o[t]||(o[t]=[])).push({fn:e,ctx:n}),this},once:function(t,e,n){function o(){i.off(t,o),e.apply(n,arguments)}var i=this;return o._=e,this.on(t,o,n)},emit:function(t){var e=[].slice.call(arguments,1),n=((this.e||(this.e={}))[t]||[]).slice(),o=0,i=n.length;for(o;o<i;o++)n[o].fn.apply(n[o].ctx,e);return this},off:function(t,e){var n=this.e||(this.e={}),o=n[t],i=[];if(o&&e)for(var r=0,a=o.length;r<a;r++)o[r].fn!==e&&o[r].fn._!==e&&i.push(o[r]);return i.length?n[t]=i:delete n[t],this}},e.exports=o},{}],7:[function(e,n,o){!function(i,r){if("function"==typeof t&&t.amd)t(["module","select"],r);else if(void 0!==o)r(n,e("select"));else{var a={exports:{}};r(a,i.select),i.clipboardAction=a.exports}}(this,function(t,e){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function o(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}var i=n(e),r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},a=function(){function t(t,e){for(var n=0;n<e.length;n++){var o=e[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(t,o.key,o)}}return function(e,n,o){return n&&t(e.prototype,n),o&&t(e,o),e}}(),c=function(){function t(e){o(this,t),this.resolveOptions(e),this.initSelection()}return a(t,[{key:"resolveOptions",value:function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};this.action=e.action,this.container=e.container,this.emitter=e.emitter,this.target=e.target,this.text=e.text,this.trigger=e.trigger,this.selectedText=""}},{key:"initSelection",value:function t(){this.text?this.selectFake():this.target&&this.selectTarget()}},{key:"selectFake",value:function t(){var e=this,n="rtl"==document.documentElement.getAttribute("dir");this.removeFake(),this.fakeHandlerCallback=function(){return e.removeFake()},this.fakeHandler=this.container.addEventListener("click",this.fakeHandlerCallback)||!0,this.fakeElem=document.createElement("textarea"),this.fakeElem.style.fontSize="12pt",this.fakeElem.style.border="0",this.fakeElem.style.padding="0",this.fakeElem.style.margin="0",this.fakeElem.style.position="absolute",this.fakeElem.style[n?"right":"left"]="-9999px";var o=window.pageYOffset||document.documentElement.scrollTop;this.fakeElem.style.top=o+"px",this.fakeElem.setAttribute("readonly",""),this.fakeElem.value=this.text,this.container.appendChild(this.fakeElem),this.selectedText=(0,i.default)(this.fakeElem),this.copyText()}},{key:"removeFake",value:function t(){this.fakeHandler&&(this.container.removeEventListener("click",this.fakeHandlerCallback),this.fakeHandler=null,this.fakeHandlerCallback=null),this.fakeElem&&(this.container.removeChild(this.fakeElem),this.fakeElem=null)}},{key:"selectTarget",value:function t(){this.selectedText=(0,i.default)(this.target),this.copyText()}},{key:"copyText",value:function t(){var e=void 0;try{e=document.execCommand(this.action)}catch(t){e=!1}this.handleResult(e)}},{key:"handleResult",value:function t(e){this.emitter.emit(e?"success":"error",{action:this.action,text:this.selectedText,trigger:this.trigger,clearSelection:this.clearSelection.bind(this)})}},{key:"clearSelection",value:function t(){this.trigger&&this.trigger.focus(),window.getSelection().removeAllRanges()}},{key:"destroy",value:function t(){this.removeFake()}},{key:"action",set:function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"copy";if(this._action=e,"copy"!==this._action&&"cut"!==this._action)throw new Error('Invalid "action" value, use either "copy" or "cut"')},get:function t(){return this._action}},{key:"target",set:function t(e){if(void 0!==e){if(!e||"object"!==(void 0===e?"undefined":r(e))||1!==e.nodeType)throw new Error('Invalid "target" value, use a valid Element');if("copy"===this.action&&e.hasAttribute("disabled"))throw new Error('Invalid "target" attribute. Please use "readonly" instead of "disabled" attribute');if("cut"===this.action&&(e.hasAttribute("readonly")||e.hasAttribute("disabled")))throw new Error('Invalid "target" attribute. You can\'t cut text from elements with "readonly" or "disabled" attributes');this._target=e}},get:function t(){return this._target}}]),t}();t.exports=c})},{select:5}],8:[function(e,n,o){!function(i,r){if("function"==typeof t&&t.amd)t(["module","./clipboard-action","tiny-emitter","good-listener"],r);else if(void 0!==o)r(n,e("./clipboard-action"),e("tiny-emitter"),e("good-listener"));else{var a={exports:{}};r(a,i.clipboardAction,i.tinyEmitter,i.goodListener),i.clipboard=a.exports}}(this,function(t,e,n,o){"use strict";function i(t){return t&&t.__esModule?t:{default:t}}function r(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function a(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function c(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}function l(t,e){var n="data-clipboard-"+t;if(e.hasAttribute(n))return e.getAttribute(n)}var s=i(e),u=i(n),f=i(o),d="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},h=function(){function t(t,e){for(var n=0;n<e.length;n++){var o=e[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(t,o.key,o)}}return function(e,n,o){return n&&t(e.prototype,n),o&&t(e,o),e}}(),p=function(t){function e(t,n){r(this,e);var o=a(this,(e.__proto__||Object.getPrototypeOf(e)).call(this));return o.resolveOptions(n),o.listenClick(t),o}return c(e,t),h(e,[{key:"resolveOptions",value:function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};this.action="function"==typeof e.action?e.action:this.defaultAction,this.target="function"==typeof e.target?e.target:this.defaultTarget,this.text="function"==typeof e.text?e.text:this.defaultText,this.container="object"===d(e.container)?e.container:document.body}},{key:"listenClick",value:function t(e){var n=this;this.listener=(0,f.default)(e,"click",function(t){return n.onClick(t)})}},{key:"onClick",value:function t(e){var n=e.delegateTarget||e.currentTarget;this.clipboardAction&&(this.clipboardAction=null),this.clipboardAction=new s.default({action:this.action(n),target:this.target(n),text:this.text(n),container:this.container,trigger:n,emitter:this})}},{key:"defaultAction",value:function t(e){return l("action",e)}},{key:"defaultTarget",value:function t(e){var n=l("target",e);if(n)return document.querySelector(n)}},{key:"defaultText",value:function t(e){return l("text",e)}},{key:"destroy",value:function t(){this.listener.destroy(),this.clipboardAction&&(this.clipboardAction.destroy(),this.clipboardAction=null)}}],[{key:"isSupported",value:function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:["copy","cut"],n="string"==typeof e?[e]:e,o=!!document.queryCommandSupported;return n.forEach(function(t){o=o&&!!document.queryCommandSupported(t)}),o}}]),e}(u.default);t.exports=p})},{"./clipboard-action":7,"good-listener":4,"tiny-emitter":6}]},{},[8])(8)});
  // END C:\git\camlsql-js\node_modules\clipboard\dist\clipboard.min.js

  // BEGIN C:\git\camlsql-js\src\app\js\vendor\vkbeautify\vkbeautify.0.99.00.beta.js*/
  /**
  * vkBeautify - javascript plugin to pretty-print or minify text in XML, JSON, CSS and SQL formats.
  *  
  * Version - 0.99.00.beta 
  * Copyright (c) 2012 Vadim Kiryukhin
  * vkiryukhin @ gmail.com
  * http://www.eslinstructor.net/vkbeautify/
  * 
  * Dual licensed under the MIT and GPL licenses:
  *   http://www.opensource.org/licenses/mit-license.php
  *   http://www.gnu.org/licenses/gpl.html
  *
  *   Pretty print
  *
  *        vkbeautify.xml(text [,indent_pattern]);
  *        vkbeautify.json(text [,indent_pattern]);
  *        vkbeautify.css(text [,indent_pattern]);
  *        vkbeautify.sql(text [,indent_pattern]);
  *
  *        @text - String; text to beatufy;
  *        @indent_pattern - Integer | String;
  *                Integer:  number of white spaces;
  *                String:   character string to visualize indentation ( can also be a set of white spaces )
  *   Minify
  *
  *        vkbeautify.xmlmin(text [,preserve_comments]);
  *        vkbeautify.jsonmin(text);
  *        vkbeautify.cssmin(text [,preserve_comments]);
  *        vkbeautify.sqlmin(text);
  *
  *        @text - String; text to minify;
  *        @preserve_comments - Bool; [optional];
  *                Set this flag to true to prevent removing comments from @text ( minxml and mincss functions only. )
  *
  *   Examples:
  *        vkbeautify.xml(text); // pretty print XML
  *        vkbeautify.json(text, 4 ); // pretty print JSON
  *        vkbeautify.css(text, '. . . .'); // pretty print CSS
  *        vkbeautify.sql(text, '----'); // pretty print SQL
  *
  *        vkbeautify.xmlmin(text, true);// minify XML, preserve comments
  *        vkbeautify.jsonmin(text);// minify JSON
  *        vkbeautify.cssmin(text);// minify CSS, remove comments ( default )
  *        vkbeautify.sqlmin(text);// minify SQL
  *
  */

  (function() {

  function createShiftArr(step) {

  	var space = '    ';
  	
  	if ( isNaN(parseInt(step)) ) {  // argument is string
  		space = step;
  	} else { // argument is integer
  		switch(step) {
  			case 1: space = ' '; break;
  			case 2: space = '  '; break;
  			case 3: space = '   '; break;
  			case 4: space = '    '; break;
  			case 5: space = '     '; break;
  			case 6: space = '      '; break;
  			case 7: space = '       '; break;
  			case 8: space = '        '; break;
  			case 9: space = '         '; break;
  			case 10: space = '          '; break;
  			case 11: space = '           '; break;
  			case 12: space = '            '; break;
  		}
  	}

  	var shift = ['\n']; // array of shifts
  	for(ix=0;ix<100;ix++){
  		shift.push(shift[ix]+space); 
  	}
  	return shift;
  }

  function vkbeautify(){
  	this.step = '    '; // 4 spaces
  	this.shift = createShiftArr(this.step);
  };

  vkbeautify.prototype.xml = function(text,step) {

  	var ar = text.replace(/>\s{0,}</g,"><")
  				 .replace(/</g,"~::~<")
  				 .replace(/\s*xmlns\:/g,"~::~xmlns:")
  				 .replace(/\s*xmlns\=/g,"~::~xmlns=")
  				 .split('~::~'),
  		len = ar.length,
  		inComment = false,
  		deep = 0,
  		str = '',
  		ix = 0,
  		shift = step ? createShiftArr(step) : this.shift;

  		for(ix=0;ix<len;ix++) {
  			// start comment or <![CDATA[...]]> or <!DOCTYPE //
  			if(ar[ix].search(/<!/) > -1) { 
  				str += shift[deep]+ar[ix];
  				inComment = true; 
  				// end comment  or <![CDATA[...]]> //
  				if(ar[ix].search(/-->/) > -1 || ar[ix].search(/\]>/) > -1 || ar[ix].search(/!DOCTYPE/) > -1 ) { 
  					inComment = false; 
  				}
  			} else 
  			// end comment  or <![CDATA[...]]> //
  			if(ar[ix].search(/-->/) > -1 || ar[ix].search(/\]>/) > -1) { 
  				str += ar[ix];
  				inComment = false; 
  			} else 
  			// <elm></elm> //
  			if( /^<\w/.exec(ar[ix-1]) && /^<\/\w/.exec(ar[ix]) &&
  				/^<[\w:\-\.\,]+/.exec(ar[ix-1]) == /^<\/[\w:\-\.\,]+/.exec(ar[ix])[0].replace('/','')) { 
  				str += ar[ix];
  				if(!inComment) deep--;
  			} else
  			 // <elm> //
  			if(ar[ix].search(/<\w/) > -1 && ar[ix].search(/<\//) == -1 && ar[ix].search(/\/>/) == -1 ) {
  				str = !inComment ? str += shift[deep++]+ar[ix] : str += ar[ix];
  			} else 
  			 // <elm>...</elm> //
  			if(ar[ix].search(/<\w/) > -1 && ar[ix].search(/<\//) > -1) {
  				str = !inComment ? str += shift[deep]+ar[ix] : str += ar[ix];
  			} else 
  			// </elm> //
  			if(ar[ix].search(/<\//) > -1) { 
  				str = !inComment ? str += shift[--deep]+ar[ix] : str += ar[ix];
  			} else 
  			// <elm/> //
  			if(ar[ix].search(/\/>/) > -1 ) { 
  				str = !inComment ? str += shift[deep]+ar[ix] : str += ar[ix];
  			} else 
  			// <? xml ... ?> //
  			if(ar[ix].search(/<\?/) > -1) { 
  				str += shift[deep]+ar[ix];
  			} else 
  			// xmlns //
  			if( ar[ix].search(/xmlns\:/) > -1  || ar[ix].search(/xmlns\=/) > -1) { 
  				str += shift[deep]+ar[ix];
  			} 
  			
  			else {
  				str += ar[ix];
  			}
  		}
  		
  	return  (str[0] == '\n') ? str.slice(1) : str;
  }

  vkbeautify.prototype.json = function(text,step) {

  	var step = step ? step : this.step;
  	
  	if (typeof JSON === 'undefined' ) return text; 
  	
  	if ( typeof text === "string" ) return JSON.stringify(JSON.parse(text), null, step);
  	if ( typeof text === "object" ) return JSON.stringify(text, null, step);
  		
  	return text; // text is not string nor object
  }

  vkbeautify.prototype.css = function(text, step) {

  	var ar = text.replace(/\s{1,}/g,' ')
  				.replace(/\{/g,"{~::~")
  				.replace(/\}/g,"~::~}~::~")
  				.replace(/\;/g,";~::~")
  				.replace(/\/\*/g,"~::~/*")
  				.replace(/\*\//g,"*/~::~")
  				.replace(/~::~\s{0,}~::~/g,"~::~")
  				.split('~::~'),
  		len = ar.length,
  		deep = 0,
  		str = '',
  		ix = 0,
  		shift = step ? createShiftArr(step) : this.shift;
  		
  		for(ix=0;ix<len;ix++) {

  			if( /\{/.exec(ar[ix]))  { 
  				str += shift[deep++]+ar[ix];
  			} else 
  			if( /\}/.exec(ar[ix]))  { 
  				str += shift[--deep]+ar[ix];
  			} else
  			if( /\*\\/.exec(ar[ix]))  { 
  				str += shift[deep]+ar[ix];
  			}
  			else {
  				str += shift[deep]+ar[ix];
  			}
  		}
  		return str.replace(/^\n{1,}/,'');
  }

  //----------------------------------------------------------------------------

  function isSubquery(str, parenthesisLevel) {
  	return  parenthesisLevel - (str.replace(/\(/g,'').length - str.replace(/\)/g,'').length )
  }

  function split_sql(str, tab) {

  	return str.replace(/\s{1,}/g," ")

  				.replace(/ AND /ig,"~::~"+tab+tab+"AND ")
  				.replace(/ BETWEEN /ig,"~::~"+tab+"BETWEEN ")
  				.replace(/ CASE /ig,"~::~"+tab+"CASE ")
  				.replace(/ ELSE /ig,"~::~"+tab+"ELSE ")
  				.replace(/ END /ig,"~::~"+tab+"END ")
  				.replace(/ FROM /ig,"~::~FROM ")
  				.replace(/ GROUP\s{1,}BY/ig,"~::~GROUP BY ")
  				.replace(/ HAVING /ig,"~::~HAVING ")
  				//.replace(/ SET /ig," SET~::~")
  				.replace(/ IN /ig," IN ")
  				
  				.replace(/ JOIN /ig,"~::~JOIN ")
  				.replace(/ CROSS~::~{1,}JOIN /ig,"~::~CROSS JOIN ")
  				.replace(/ INNER~::~{1,}JOIN /ig,"~::~INNER JOIN ")
  				.replace(/ LEFT~::~{1,}JOIN /ig,"~::~LEFT JOIN ")
  				.replace(/ RIGHT~::~{1,}JOIN /ig,"~::~RIGHT JOIN ")
  				
  				.replace(/ ON /ig,"~::~"+tab+"ON ")
  				.replace(/ OR /ig,"~::~"+tab+tab+"OR ")
  				.replace(/ ORDER\s{1,}BY/ig,"~::~ORDER BY ")
  				.replace(/ OVER /ig,"~::~"+tab+"OVER ")

  				.replace(/\(\s{0,}SELECT /ig,"~::~(SELECT ")
  				.replace(/\)\s{0,}SELECT /ig,")~::~SELECT ")
  				
  				.replace(/ THEN /ig," THEN~::~"+tab+"")
  				.replace(/ UNION /ig,"~::~UNION~::~")
  				.replace(/ USING /ig,"~::~USING ")
  				.replace(/ WHEN /ig,"~::~"+tab+"WHEN ")
  				.replace(/ WHERE /ig,"~::~WHERE ")
  				.replace(/ WITH /ig,"~::~WITH ")
  				
  				//.replace(/\,\s{0,}\(/ig,",~::~( ")
  				//.replace(/\,/ig,",~::~"+tab+tab+"")

  				.replace(/ ALL /ig," ALL ")
  				.replace(/ AS /ig," AS ")
  				.replace(/ ASC /ig," ASC ")	
  				.replace(/ DESC /ig," DESC ")	
  				.replace(/ DISTINCT /ig," DISTINCT ")
  				.replace(/ EXISTS /ig," EXISTS ")
  				.replace(/ NOT /ig," NOT ")
  				.replace(/ NULL /ig," NULL ")
  				.replace(/ LIKE /ig," LIKE ")
  				.replace(/\s{0,}SELECT /ig,"SELECT ")
  				.replace(/\s{0,}UPDATE /ig,"UPDATE ")
  				.replace(/ SET /ig," SET ")
  							
  				.replace(/~::~{1,}/g,"~::~")
  				.split('~::~');
  }

  vkbeautify.prototype.sql = function(text,step) {

  	var ar_by_quote = text.replace(/\s{1,}/g," ")
  							.replace(/\'/ig,"~::~\'")
  							.split('~::~'),
  		len = ar_by_quote.length,
  		ar = [],
  		deep = 0,
  		tab = this.step,//+this.step,
  		inComment = true,
  		inQuote = false,
  		parenthesisLevel = 0,
  		str = '',
  		ix = 0,
  		shift = step ? createShiftArr(step) : this.shift;;

  		for(ix=0;ix<len;ix++) {
  			if(ix%2) {
  				ar = ar.concat(ar_by_quote[ix]);
  			} else {
  				ar = ar.concat(split_sql(ar_by_quote[ix], tab) );
  			}
  		}
  		
  		len = ar.length;
  		for(ix=0;ix<len;ix++) {
  			
  			parenthesisLevel = isSubquery(ar[ix], parenthesisLevel);
  			
  			if( /\s{0,}\s{0,}SELECT\s{0,}/.exec(ar[ix]))  { 
  				ar[ix] = ar[ix].replace(/\,/g,",\n"+tab+tab+"")
  			} 
  			
  			if( /\s{0,}\s{0,}SET\s{0,}/.exec(ar[ix]))  { 
  				ar[ix] = ar[ix].replace(/\,/g,",\n"+tab+tab+"")
  			} 
  			
  			if( /\s{0,}\(\s{0,}SELECT\s{0,}/.exec(ar[ix]))  { 
  				deep++;
  				str += shift[deep]+ar[ix];
  			} else 
  			if( /\'/.exec(ar[ix]) )  { 
  				if(parenthesisLevel<1 && deep) {
  					deep--;
  				}
  				str += ar[ix];
  			}
  			else  { 
  				str += shift[deep]+ar[ix];
  				if(parenthesisLevel<1 && deep) {
  					deep--;
  				}
  			} 
  			var junk = 0;
  		}

  		str = str.replace(/^\n{1,}/,'').replace(/\n{1,}/g,"\n");
  		return str;
  }


  vkbeautify.prototype.xmlmin = function(text, preserveComments) {

  	var str = preserveComments ? text
  							   : text.replace(/\<![ \r\n\t]*(--([^\-]|[\r\n]|-[^\-])*--[ \r\n\t]*)\>/g,"")
  									 .replace(/[ \r\n\t]{1,}xmlns/g, ' xmlns');
  	return  str.replace(/>\s{0,}</g,"><"); 
  }

  vkbeautify.prototype.jsonmin = function(text) {

  	if (typeof JSON === 'undefined' ) return text; 
  	
  	return JSON.stringify(JSON.parse(text), null, 0); 
  				
  }

  vkbeautify.prototype.cssmin = function(text, preserveComments) {
  	
  	var str = preserveComments ? text
  							   : text.replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+\//g,"") ;

  	return str.replace(/\s{1,}/g,' ')
  			  .replace(/\{\s{1,}/g,"{")
  			  .replace(/\}\s{1,}/g,"}")
  			  .replace(/\;\s{1,}/g,";")
  			  .replace(/\/\*\s{1,}/g,"/*")
  			  .replace(/\*\/\s{1,}/g,"*/");
  }

  vkbeautify.prototype.sqlmin = function(text) {
  	return text.replace(/\s{1,}/g," ").replace(/\s{1,}\(/,"(").replace(/\s{1,}\)/,")");
  }

  window.vkbeautify = new vkbeautify();

  })();


  // END C:\git\camlsql-js\src\app\js\vendor\vkbeautify\vkbeautify.0.99.00.beta.js

  // BEGIN C:\git\camlsql-js\src\app\js\vendor\lz-string\lz-string.min.js*/
  var LZString=function(){function o(o,r){if(!t[o]){t[o]={};for(var n=0;n<o.length;n++)t[o][o.charAt(n)]=n}return t[o][r]}var r=String.fromCharCode,n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",t={},i={compressToBase64:function(o){if(null==o)return"";var r=i._compress(o,6,function(o){return n.charAt(o)});switch(r.length%4){default:case 0:return r;case 1:return r+"===";case 2:return r+"==";case 3:return r+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(e){return o(n,r.charAt(e))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(o){return null==o?"":""==o?null:i._decompress(o.length,16384,function(r){return o.charCodeAt(r)-32})},compressToUint8Array:function(o){for(var r=i.compress(o),n=new Uint8Array(2*r.length),e=0,t=r.length;t>e;e++){var s=r.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null===o||void 0===o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;t>e;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(o){return null==o?"":i._compress(o,6,function(o){return e.charAt(o)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(n){return o(e,r.charAt(n))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(o,r,n){if(null==o)return"";var e,t,i,s={},p={},u="",c="",a="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<o.length;i+=1)if(u=o.charAt(i),Object.prototype.hasOwnProperty.call(s,u)||(s[u]=f++,p[u]=!0),c=a+u,Object.prototype.hasOwnProperty.call(s,c))a=c;else{if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++),s[c]=f++,a=String(u)}if(""!==a){if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==r-1){d.push(n(m));break}v++}return d.join("")},decompress:function(o){return null==o?"":""==o?null:i._decompress(o.length,32768,function(r){return o.charCodeAt(r)})},_decompress:function(o,n,e){var t,i,s,p,u,c,a,l,f=[],h=4,d=4,m=3,v="",w=[],A={val:e(0),position:n,index:1};for(i=0;3>i;i+=1)f[i]=i;for(p=0,c=Math.pow(2,2),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(t=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 2:return""}for(f[3]=l,s=l,w.push(l);;){if(A.index>o)return"";for(p=0,c=Math.pow(2,m),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(l=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 2:return w.join("")}if(0==h&&(h=Math.pow(2,m),m++),f[l])v=f[l];else{if(l!==d)return null;v=s+s.charAt(0)}w.push(v),f[d++]=s+v.charAt(0),h--,s=v,0==h&&(h=Math.pow(2,m),m++)}}};return i}();"function"==typeof define&&define.amd?define(function(){return LZString}):"undefined"!=typeof module&&null!=module&&(module.exports=LZString);

  // END C:\git\camlsql-js\src\app\js\vendor\lz-string\lz-string.min.js

  // BEGIN C:\git\camlsql-js\src\app\js\vendor\vue\vue.min.js*/
  /*!
   * Vue.js v2.5.2
   * (c) 2014-2017 Evan You
   * Released under the MIT License.
   */
  !function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):e.Vue=t()}(this,function(){"use strict";function e(e){return void 0===e||null===e}function t(e){return void 0!==e&&null!==e}function n(e){return!0===e}function r(e){return!1===e}function i(e){return"string"==typeof e||"number"==typeof e||"boolean"==typeof e}function o(e){return null!==e&&"object"==typeof e}function a(e){return"[object Object]"===Ai.call(e)}function s(e){return"[object RegExp]"===Ai.call(e)}function c(e){var t=parseFloat(String(e));return t>=0&&Math.floor(t)===t&&isFinite(e)}function u(e){return null==e?"":"object"==typeof e?JSON.stringify(e,null,2):String(e)}function l(e){var t=parseFloat(e);return isNaN(t)?e:t}function f(e,t){for(var n=Object.create(null),r=e.split(","),i=0;i<r.length;i++)n[r[i]]=!0;return t?function(e){return n[e.toLowerCase()]}:function(e){return n[e]}}function d(e,t){if(e.length){var n=e.indexOf(t);if(n>-1)return e.splice(n,1)}}function p(e,t){return Ti.call(e,t)}function v(e){var t=Object.create(null);return function(n){return t[n]||(t[n]=e(n))}}function h(e,t){function n(n){var r=arguments.length;return r?r>1?e.apply(t,arguments):e.call(t,n):e.call(t)}return n._length=e.length,n}function m(e,t){t=t||0;for(var n=e.length-t,r=new Array(n);n--;)r[n]=e[n+t];return r}function y(e,t){for(var n in t)e[n]=t[n];return e}function g(e){for(var t={},n=0;n<e.length;n++)e[n]&&y(t,e[n]);return t}function _(e,t,n){}function b(e,t){if(e===t)return!0;var n=o(e),r=o(t);if(!n||!r)return!n&&!r&&String(e)===String(t);try{var i=Array.isArray(e),a=Array.isArray(t);if(i&&a)return e.length===t.length&&e.every(function(e,n){return b(e,t[n])});if(i||a)return!1;var s=Object.keys(e),c=Object.keys(t);return s.length===c.length&&s.every(function(n){return b(e[n],t[n])})}catch(e){return!1}}function $(e,t){for(var n=0;n<e.length;n++)if(b(e[n],t))return n;return-1}function C(e){var t=!1;return function(){t||(t=!0,e.apply(this,arguments))}}function w(e){var t=(e+"").charCodeAt(0);return 36===t||95===t}function x(e,t,n,r){Object.defineProperty(e,t,{value:n,enumerable:!!r,writable:!0,configurable:!0})}function k(e){if(!Ui.test(e)){var t=e.split(".");return function(e){for(var n=0;n<t.length;n++){if(!e)return;e=e[t[n]]}return e}}}function A(e){return"function"==typeof e&&/native code/.test(e.toString())}function O(e){so.target&&co.push(so.target),so.target=e}function S(){so.target=co.pop()}function T(e){return new uo(void 0,void 0,void 0,String(e))}function E(e,t){var n=new uo(e.tag,e.data,e.children,e.text,e.elm,e.context,e.componentOptions,e.asyncFactory);return n.ns=e.ns,n.isStatic=e.isStatic,n.key=e.key,n.isComment=e.isComment,n.isCloned=!0,t&&e.children&&(n.children=j(e.children)),n}function j(e,t){for(var n=e.length,r=new Array(n),i=0;i<n;i++)r[i]=E(e[i],t);return r}function L(e,t,n){e.__proto__=t}function N(e,t,n){for(var r=0,i=n.length;r<i;r++){var o=n[r];x(e,o,t[o])}}function I(e,t){if(o(e)&&!(e instanceof uo)){var n;return p(e,"__ob__")&&e.__ob__ instanceof yo?n=e.__ob__:mo.shouldConvert&&!no()&&(Array.isArray(e)||a(e))&&Object.isExtensible(e)&&!e._isVue&&(n=new yo(e)),t&&n&&n.vmCount++,n}}function M(e,t,n,r,i){var o=new so,a=Object.getOwnPropertyDescriptor(e,t);if(!a||!1!==a.configurable){var s=a&&a.get,c=a&&a.set,u=!i&&I(n);Object.defineProperty(e,t,{enumerable:!0,configurable:!0,get:function(){var t=s?s.call(e):n;return so.target&&(o.depend(),u&&(u.dep.depend(),Array.isArray(t)&&R(t))),t},set:function(t){var r=s?s.call(e):n;t===r||t!==t&&r!==r||(c?c.call(e,t):n=t,u=!i&&I(t),o.notify())}})}}function P(e,t,n){if(Array.isArray(e)&&c(t))return e.length=Math.max(e.length,t),e.splice(t,1,n),n;if(p(e,t))return e[t]=n,n;var r=e.__ob__;return e._isVue||r&&r.vmCount?n:r?(M(r.value,t,n),r.dep.notify(),n):(e[t]=n,n)}function D(e,t){if(Array.isArray(e)&&c(t))e.splice(t,1);else{var n=e.__ob__;e._isVue||n&&n.vmCount||p(e,t)&&(delete e[t],n&&n.dep.notify())}}function R(e){for(var t=void 0,n=0,r=e.length;n<r;n++)(t=e[n])&&t.__ob__&&t.__ob__.dep.depend(),Array.isArray(t)&&R(t)}function F(e,t){if(!t)return e;for(var n,r,i,o=Object.keys(t),s=0;s<o.length;s++)r=e[n=o[s]],i=t[n],p(e,n)?a(r)&&a(i)&&F(r,i):P(e,n,i);return e}function H(e,t,n){return n?e||t?function(){var r="function"==typeof t?t.call(n):t,i="function"==typeof e?e.call(n):e;return r?F(r,i):i}:void 0:t?e?function(){return F("function"==typeof t?t.call(this):t,"function"==typeof e?e.call(this):e)}:t:e}function B(e,t){return t?e?e.concat(t):Array.isArray(t)?t:[t]:e}function U(e,t,n,r){var i=Object.create(e||null);return t?y(i,t):i}function V(e,t){var n=e.props;if(n){var r,i,o={};if(Array.isArray(n))for(r=n.length;r--;)"string"==typeof(i=n[r])&&(o[ji(i)]={type:null});else if(a(n))for(var s in n)i=n[s],o[ji(s)]=a(i)?i:{type:i};e.props=o}}function z(e,t){var n=e.inject,r=e.inject={};if(Array.isArray(n))for(var i=0;i<n.length;i++)r[n[i]]={from:n[i]};else if(a(n))for(var o in n){var s=n[o];r[o]=a(s)?y({from:o},s):{from:s}}}function K(e){var t=e.directives;if(t)for(var n in t){var r=t[n];"function"==typeof r&&(t[n]={bind:r,update:r})}}function J(e,t,n){function r(r){var i=go[r]||$o;c[r]=i(e[r],t[r],n,r)}"function"==typeof t&&(t=t.options),V(t,n),z(t,n),K(t);var i=t.extends;if(i&&(e=J(e,i,n)),t.mixins)for(var o=0,a=t.mixins.length;o<a;o++)e=J(e,t.mixins[o],n);var s,c={};for(s in e)r(s);for(s in t)p(e,s)||r(s);return c}function q(e,t,n,r){if("string"==typeof n){var i=e[t];if(p(i,n))return i[n];var o=ji(n);if(p(i,o))return i[o];var a=Li(o);if(p(i,a))return i[a];var s=i[n]||i[o]||i[a];return s}}function W(e,t,n,r){var i=t[e],o=!p(n,e),a=n[e];if(Y(Boolean,i.type)&&(o&&!p(i,"default")?a=!1:Y(String,i.type)||""!==a&&a!==Ii(e)||(a=!0)),void 0===a){a=G(r,i,e);var s=mo.shouldConvert;mo.shouldConvert=!0,I(a),mo.shouldConvert=s}return a}function G(e,t,n){if(p(t,"default")){var r=t.default;return e&&e.$options.propsData&&void 0===e.$options.propsData[n]&&void 0!==e._props[n]?e._props[n]:"function"==typeof r&&"Function"!==Z(t.type)?r.call(e):r}}function Z(e){var t=e&&e.toString().match(/^\s*function (\w+)/);return t?t[1]:""}function Y(e,t){if(!Array.isArray(t))return Z(t)===Z(e);for(var n=0,r=t.length;n<r;n++)if(Z(t[n])===Z(e))return!0;return!1}function Q(e,t,n){if(t)for(var r=t;r=r.$parent;){var i=r.$options.errorCaptured;if(i)for(var o=0;o<i.length;o++)try{if(!1===i[o].call(r,e,t,n))return}catch(e){X(e,r,"errorCaptured hook")}}X(e,t,n)}function X(e,t,n){if(Hi.errorHandler)try{return Hi.errorHandler.call(null,e,t,n)}catch(e){ee(e,null,"config.errorHandler")}ee(e,t,n)}function ee(e,t,n){if(!zi||"undefined"==typeof console)throw e;console.error(e)}function te(){wo=!1;var e=Co.slice(0);Co.length=0;for(var t=0;t<e.length;t++)e[t]()}function ne(e){return e._withTask||(e._withTask=function(){xo=!0;var t=e.apply(null,arguments);return xo=!1,t})}function re(e,t){var n;if(Co.push(function(){if(e)try{e.call(t)}catch(e){Q(e,t,"nextTick")}else n&&n(t)}),wo||(wo=!0,xo?bo():_o()),!e&&"undefined"!=typeof Promise)return new Promise(function(e){n=e})}function ie(e){function t(){var e=arguments,n=t.fns;if(!Array.isArray(n))return n.apply(null,arguments);for(var r=n.slice(),i=0;i<r.length;i++)r[i].apply(null,e)}return t.fns=e,t}function oe(t,n,r,i,o){var a,s,c,u;for(a in t)s=t[a],c=n[a],u=To(a),e(s)||(e(c)?(e(s.fns)&&(s=t[a]=ie(s)),r(u.name,s,u.once,u.capture,u.passive)):s!==c&&(c.fns=s,t[a]=c));for(a in n)e(t[a])&&i((u=To(a)).name,n[a],u.capture)}function ae(r,i,o){function a(){o.apply(this,arguments),d(s.fns,a)}var s,c=r[i];e(c)?s=ie([a]):t(c.fns)&&n(c.merged)?(s=c).fns.push(a):s=ie([c,a]),s.merged=!0,r[i]=s}function se(n,r,i){var o=r.options.props;if(!e(o)){var a={},s=n.attrs,c=n.props;if(t(s)||t(c))for(var u in o){var l=Ii(u);ce(a,c,u,l,!0)||ce(a,s,u,l,!1)}return a}}function ce(e,n,r,i,o){if(t(n)){if(p(n,r))return e[r]=n[r],o||delete n[r],!0;if(p(n,i))return e[r]=n[i],o||delete n[i],!0}return!1}function ue(e){for(var t=0;t<e.length;t++)if(Array.isArray(e[t]))return Array.prototype.concat.apply([],e);return e}function le(e){return i(e)?[T(e)]:Array.isArray(e)?de(e):void 0}function fe(e){return t(e)&&t(e.text)&&r(e.isComment)}function de(r,o){var a,s,c,u,l=[];for(a=0;a<r.length;a++)e(s=r[a])||"boolean"==typeof s||(u=l[c=l.length-1],Array.isArray(s)?s.length>0&&(fe((s=de(s,(o||"")+"_"+a))[0])&&fe(u)&&(l[c]=T(u.text+s[0].text),s.shift()),l.push.apply(l,s)):i(s)?fe(u)?l[c]=T(u.text+s):""!==s&&l.push(T(s)):fe(s)&&fe(u)?l[c]=T(u.text+s.text):(n(r._isVList)&&t(s.tag)&&e(s.key)&&t(o)&&(s.key="__vlist"+o+"_"+a+"__"),l.push(s)));return l}function pe(e,t){return(e.__esModule||io&&"Module"===e[Symbol.toStringTag])&&(e=e.default),o(e)?t.extend(e):e}function ve(e,t,n,r,i){var o=fo();return o.asyncFactory=e,o.asyncMeta={data:t,context:n,children:r,tag:i},o}function he(r,i,a){if(n(r.error)&&t(r.errorComp))return r.errorComp;if(t(r.resolved))return r.resolved;if(n(r.loading)&&t(r.loadingComp))return r.loadingComp;if(!t(r.contexts)){var s=r.contexts=[a],c=!0,u=function(){for(var e=0,t=s.length;e<t;e++)s[e].$forceUpdate()},l=C(function(e){r.resolved=pe(e,i),c||u()}),f=C(function(e){t(r.errorComp)&&(r.error=!0,u())}),d=r(l,f);return o(d)&&("function"==typeof d.then?e(r.resolved)&&d.then(l,f):t(d.component)&&"function"==typeof d.component.then&&(d.component.then(l,f),t(d.error)&&(r.errorComp=pe(d.error,i)),t(d.loading)&&(r.loadingComp=pe(d.loading,i),0===d.delay?r.loading=!0:setTimeout(function(){e(r.resolved)&&e(r.error)&&(r.loading=!0,u())},d.delay||200)),t(d.timeout)&&setTimeout(function(){e(r.resolved)&&f(null)},d.timeout))),c=!1,r.loading?r.loadingComp:r.resolved}r.contexts.push(a)}function me(e){return e.isComment&&e.asyncFactory}function ye(e){if(Array.isArray(e))for(var n=0;n<e.length;n++){var r=e[n];if(t(r)&&(t(r.componentOptions)||me(r)))return r}}function ge(e){e._events=Object.create(null),e._hasHookEvent=!1;var t=e.$options._parentListeners;t&&$e(e,t)}function _e(e,t,n){n?So.$once(e,t):So.$on(e,t)}function be(e,t){So.$off(e,t)}function $e(e,t,n){So=e,oe(t,n||{},_e,be,e)}function Ce(e,t){var n={};if(!e)return n;for(var r=[],i=0,o=e.length;i<o;i++){var a=e[i],s=a.data;if(s&&s.attrs&&s.attrs.slot&&delete s.attrs.slot,a.context!==t&&a.functionalContext!==t||!s||null==s.slot)r.push(a);else{var c=a.data.slot,u=n[c]||(n[c]=[]);"template"===a.tag?u.push.apply(u,a.children):u.push(a)}}return r.every(we)||(n.default=r),n}function we(e){return e.isComment||" "===e.text}function xe(e,t){t=t||{};for(var n=0;n<e.length;n++)Array.isArray(e[n])?xe(e[n],t):t[e[n].key]=e[n].fn;return t}function ke(e){var t=e.$options,n=t.parent;if(n&&!t.abstract){for(;n.$options.abstract&&n.$parent;)n=n.$parent;n.$children.push(e)}e.$parent=n,e.$root=n?n.$root:e,e.$children=[],e.$refs={},e._watcher=null,e._inactive=null,e._directInactive=!1,e._isMounted=!1,e._isDestroyed=!1,e._isBeingDestroyed=!1}function Ae(e,t,n){e.$el=t,e.$options.render||(e.$options.render=fo),je(e,"beforeMount");var r;return r=function(){e._update(e._render(),n)},e._watcher=new Ro(e,r,_),n=!1,null==e.$vnode&&(e._isMounted=!0,je(e,"mounted")),e}function Oe(e,t,n,r,i){var o=!!(i||e.$options._renderChildren||r.data.scopedSlots||e.$scopedSlots!==Bi);if(e.$options._parentVnode=r,e.$vnode=r,e._vnode&&(e._vnode.parent=r),e.$options._renderChildren=i,e.$attrs=r.data&&r.data.attrs||Bi,e.$listeners=n||Bi,t&&e.$options.props){mo.shouldConvert=!1;for(var a=e._props,s=e.$options._propKeys||[],c=0;c<s.length;c++){var u=s[c];a[u]=W(u,e.$options.props,t,e)}mo.shouldConvert=!0,e.$options.propsData=t}if(n){var l=e.$options._parentListeners;e.$options._parentListeners=n,$e(e,n,l)}o&&(e.$slots=Ce(i,r.context),e.$forceUpdate())}function Se(e){for(;e&&(e=e.$parent);)if(e._inactive)return!0;return!1}function Te(e,t){if(t){if(e._directInactive=!1,Se(e))return}else if(e._directInactive)return;if(e._inactive||null===e._inactive){e._inactive=!1;for(var n=0;n<e.$children.length;n++)Te(e.$children[n]);je(e,"activated")}}function Ee(e,t){if(!(t&&(e._directInactive=!0,Se(e))||e._inactive)){e._inactive=!0;for(var n=0;n<e.$children.length;n++)Ee(e.$children[n]);je(e,"deactivated")}}function je(e,t){var n=e.$options[t];if(n)for(var r=0,i=n.length;r<i;r++)try{n[r].call(e)}catch(n){Q(n,e,t+" hook")}e._hasHookEvent&&e.$emit("hook:"+t)}function Le(){Po=jo.length=Lo.length=0,No={},Io=Mo=!1}function Ne(){Mo=!0;var e,t;for(jo.sort(function(e,t){return e.id-t.id}),Po=0;Po<jo.length;Po++)t=(e=jo[Po]).id,No[t]=null,e.run();var n=Lo.slice(),r=jo.slice();Le(),Pe(n),Ie(r),ro&&Hi.devtools&&ro.emit("flush")}function Ie(e){for(var t=e.length;t--;){var n=e[t],r=n.vm;r._watcher===n&&r._isMounted&&je(r,"updated")}}function Me(e){e._inactive=!1,Lo.push(e)}function Pe(e){for(var t=0;t<e.length;t++)e[t]._inactive=!0,Te(e[t],!0)}function De(e){var t=e.id;if(null==No[t]){if(No[t]=!0,Mo){for(var n=jo.length-1;n>Po&&jo[n].id>e.id;)n--;jo.splice(n+1,0,e)}else jo.push(e);Io||(Io=!0,re(Ne))}}function Re(e){Fo.clear(),Fe(e,Fo)}function Fe(e,t){var n,r,i=Array.isArray(e);if((i||o(e))&&Object.isExtensible(e)){if(e.__ob__){var a=e.__ob__.dep.id;if(t.has(a))return;t.add(a)}if(i)for(n=e.length;n--;)Fe(e[n],t);else for(n=(r=Object.keys(e)).length;n--;)Fe(e[r[n]],t)}}function He(e,t,n){Ho.get=function(){return this[t][n]},Ho.set=function(e){this[t][n]=e},Object.defineProperty(e,n,Ho)}function Be(e){e._watchers=[];var t=e.$options;t.props&&Ue(e,t.props),t.methods&&We(e,t.methods),t.data?Ve(e):I(e._data={},!0),t.computed&&Ke(e,t.computed),t.watch&&t.watch!==Yi&&Ge(e,t.watch)}function Ue(e,t){var n=e.$options.propsData||{},r=e._props={},i=e.$options._propKeys=[],o=!e.$parent;mo.shouldConvert=o;for(var a in t)!function(o){i.push(o);var a=W(o,t,n,e);M(r,o,a),o in e||He(e,"_props",o)}(a);mo.shouldConvert=!0}function Ve(e){var t=e.$options.data;a(t=e._data="function"==typeof t?ze(t,e):t||{})||(t={});for(var n=Object.keys(t),r=e.$options.props,i=n.length;i--;){var o=n[i];r&&p(r,o)||w(o)||He(e,"_data",o)}I(t,!0)}function ze(e,t){try{return e.call(t,t)}catch(e){return Q(e,t,"data()"),{}}}function Ke(e,t){var n=e._computedWatchers=Object.create(null),r=no();for(var i in t){var o=t[i],a="function"==typeof o?o:o.get;r||(n[i]=new Ro(e,a||_,_,Bo)),i in e||Je(e,i,o)}}function Je(e,t,n){var r=!no();"function"==typeof n?(Ho.get=r?qe(t):n,Ho.set=_):(Ho.get=n.get?r&&!1!==n.cache?qe(t):n.get:_,Ho.set=n.set?n.set:_),Object.defineProperty(e,t,Ho)}function qe(e){return function(){var t=this._computedWatchers&&this._computedWatchers[e];if(t)return t.dirty&&t.evaluate(),so.target&&t.depend(),t.value}}function We(e,t){for(var n in t)e[n]=null==t[n]?_:h(t[n],e)}function Ge(e,t){for(var n in t){var r=t[n];if(Array.isArray(r))for(var i=0;i<r.length;i++)Ze(e,n,r[i]);else Ze(e,n,r)}}function Ze(e,t,n,r){return a(n)&&(r=n,n=n.handler),"string"==typeof n&&(n=e[n]),e.$watch(t,n,r)}function Ye(e){var t=e.$options.provide;t&&(e._provided="function"==typeof t?t.call(e):t)}function Qe(e){var t=Xe(e.$options.inject,e);t&&(mo.shouldConvert=!1,Object.keys(t).forEach(function(n){M(e,n,t[n])}),mo.shouldConvert=!0)}function Xe(e,t){if(e){for(var n=Object.create(null),r=io?Reflect.ownKeys(e).filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}):Object.keys(e),i=0;i<r.length;i++){for(var o=r[i],a=e[o].from,s=t;s;){if(s._provided&&a in s._provided){n[o]=s._provided[a];break}s=s.$parent}if(!s&&"default"in e[o]){var c=e[o].default;n[o]="function"==typeof c?c.call(t):c}}return n}}function et(e,n){var r,i,a,s,c;if(Array.isArray(e)||"string"==typeof e)for(r=new Array(e.length),i=0,a=e.length;i<a;i++)r[i]=n(e[i],i);else if("number"==typeof e)for(r=new Array(e),i=0;i<e;i++)r[i]=n(i+1,i);else if(o(e))for(s=Object.keys(e),r=new Array(s.length),i=0,a=s.length;i<a;i++)c=s[i],r[i]=n(e[c],c,i);return t(r)&&(r._isVList=!0),r}function tt(e,t,n,r){var i=this.$scopedSlots[e];if(i)return n=n||{},r&&(n=y(y({},r),n)),i(n)||t;var o=this.$slots[e];return o||t}function nt(e){return q(this.$options,"filters",e,!0)||Pi}function rt(e,t,n,r){var i=Hi.keyCodes[t]||n;return i?Array.isArray(i)?-1===i.indexOf(e):i!==e:r?Ii(r)!==t:void 0}function it(e,t,n,r,i){if(n)if(o(n)){Array.isArray(n)&&(n=g(n));var a;for(var s in n)!function(o){if("class"===o||"style"===o||Si(o))a=e;else{var s=e.attrs&&e.attrs.type;a=r||Hi.mustUseProp(t,s,o)?e.domProps||(e.domProps={}):e.attrs||(e.attrs={})}o in a||(a[o]=n[o],i&&((e.on||(e.on={}))["update:"+o]=function(e){n[o]=e}))}(s)}else;return e}function ot(e,t){var n=this.$options.staticRenderFns,r=n.cached||(n.cached=[]),i=r[e];return i&&!t?Array.isArray(i)?j(i):E(i):(i=r[e]=n[e].call(this._renderProxy,null,this),st(i,"__static__"+e,!1),i)}function at(e,t,n){return st(e,"__once__"+t+(n?"_"+n:""),!0),e}function st(e,t,n){if(Array.isArray(e))for(var r=0;r<e.length;r++)e[r]&&"string"!=typeof e[r]&&ct(e[r],t+"_"+r,n);else ct(e,t,n)}function ct(e,t,n){e.isStatic=!0,e.key=t,e.isOnce=n}function ut(e,t){if(t)if(a(t)){var n=e.on=e.on?y({},e.on):{};for(var r in t){var i=n[r],o=t[r];n[r]=i?[].concat(i,o):o}}else;return e}function lt(e){e._o=at,e._n=l,e._s=u,e._l=et,e._t=tt,e._q=b,e._i=$,e._m=ot,e._f=nt,e._k=rt,e._b=it,e._v=T,e._e=fo,e._u=xe,e._g=ut}function ft(e,t,r,i,o){var a=o.options;this.data=e,this.props=t,this.children=r,this.parent=i,this.listeners=e.on||Bi,this.injections=Xe(a.inject,i),this.slots=function(){return Ce(r,i)};var s=Object.create(i),c=n(a._compiled),u=!c;c&&(this.$options=a,this.$slots=this.slots(),this.$scopedSlots=e.scopedSlots||Bi),a._scopeId?this._c=function(e,t,n,r){var o=_t(s,e,t,n,r,u);return o&&(o.functionalScopeId=a._scopeId,o.functionalContext=i),o}:this._c=function(e,t,n,r){return _t(s,e,t,n,r,u)}}function dt(e,n,r,i,o){var a=e.options,s={},c=a.props;if(t(c))for(var u in c)s[u]=W(u,c,n||Bi);else t(r.attrs)&&pt(s,r.attrs),t(r.props)&&pt(s,r.props);var l=new ft(r,s,o,i,e),f=a.render.call(null,l._c,l);return f instanceof uo&&(f.functionalContext=i,f.functionalOptions=a,r.slot&&((f.data||(f.data={})).slot=r.slot)),f}function pt(e,t){for(var n in t)e[ji(n)]=t[n]}function vt(r,i,a,s,c){if(!e(r)){var u=a.$options._base;if(o(r)&&(r=u.extend(r)),"function"==typeof r){var l;if(e(r.cid)&&(l=r,void 0===(r=he(l,u,a))))return ve(l,i,a,s,c);i=i||{},xt(r),t(i.model)&&gt(r.options,i);var f=se(i,r,c);if(n(r.options.functional))return dt(r,f,i,a,s);var d=i.on;if(i.on=i.nativeOn,n(r.options.abstract)){var p=i.slot;i={},p&&(i.slot=p)}mt(i);var v=r.options.name||c;return new uo("vue-component-"+r.cid+(v?"-"+v:""),i,void 0,void 0,void 0,a,{Ctor:r,propsData:f,listeners:d,tag:c,children:s},l)}}}function ht(e,n,r,i){var o=e.componentOptions,a={_isComponent:!0,parent:n,propsData:o.propsData,_componentTag:o.tag,_parentVnode:e,_parentListeners:o.listeners,_renderChildren:o.children,_parentElm:r||null,_refElm:i||null},s=e.data.inlineTemplate;return t(s)&&(a.render=s.render,a.staticRenderFns=s.staticRenderFns),new o.Ctor(a)}function mt(e){e.hook||(e.hook={});for(var t=0;t<Vo.length;t++){var n=Vo[t],r=e.hook[n],i=Uo[n];e.hook[n]=r?yt(i,r):i}}function yt(e,t){return function(n,r,i,o){e(n,r,i,o),t(n,r,i,o)}}function gt(e,n){var r=e.model&&e.model.prop||"value",i=e.model&&e.model.event||"input";(n.props||(n.props={}))[r]=n.model.value;var o=n.on||(n.on={});t(o[i])?o[i]=[n.model.callback].concat(o[i]):o[i]=n.model.callback}function _t(e,t,r,o,a,s){return(Array.isArray(r)||i(r))&&(a=o,o=r,r=void 0),n(s)&&(a=Ko),bt(e,t,r,o,a)}function bt(e,n,r,i,o){if(t(r)&&t(r.__ob__))return fo();if(t(r)&&t(r.is)&&(n=r.is),!n)return fo();Array.isArray(i)&&"function"==typeof i[0]&&((r=r||{}).scopedSlots={default:i[0]},i.length=0),o===Ko?i=le(i):o===zo&&(i=ue(i));var a,s;if("string"==typeof n){var c;s=e.$vnode&&e.$vnode.ns||Hi.getTagNamespace(n),a=Hi.isReservedTag(n)?new uo(Hi.parsePlatformTagName(n),r,i,void 0,void 0,e):t(c=q(e.$options,"components",n))?vt(c,r,e,i,n):new uo(n,r,i,void 0,void 0,e)}else a=vt(n,r,e,i);return t(a)?(s&&$t(a,s),a):fo()}function $t(r,i,o){if(r.ns=i,"foreignObject"===r.tag&&(i=void 0,o=!0),t(r.children))for(var a=0,s=r.children.length;a<s;a++){var c=r.children[a];t(c.tag)&&(e(c.ns)||n(o))&&$t(c,i,o)}}function Ct(e){e._vnode=null;var t=e.$options,n=e.$vnode=t._parentVnode,r=n&&n.context;e.$slots=Ce(t._renderChildren,r),e.$scopedSlots=Bi,e._c=function(t,n,r,i){return _t(e,t,n,r,i,!1)},e.$createElement=function(t,n,r,i){return _t(e,t,n,r,i,!0)};var i=n&&n.data;M(e,"$attrs",i&&i.attrs||Bi,null,!0),M(e,"$listeners",t._parentListeners||Bi,null,!0)}function wt(e,t){var n=e.$options=Object.create(e.constructor.options);n.parent=t.parent,n.propsData=t.propsData,n._parentVnode=t._parentVnode,n._parentListeners=t._parentListeners,n._renderChildren=t._renderChildren,n._componentTag=t._componentTag,n._parentElm=t._parentElm,n._refElm=t._refElm,t.render&&(n.render=t.render,n.staticRenderFns=t.staticRenderFns)}function xt(e){var t=e.options;if(e.super){var n=xt(e.super);if(n!==e.superOptions){e.superOptions=n;var r=kt(e);r&&y(e.extendOptions,r),(t=e.options=J(n,e.extendOptions)).name&&(t.components[t.name]=e)}}return t}function kt(e){var t,n=e.options,r=e.extendOptions,i=e.sealedOptions;for(var o in n)n[o]!==i[o]&&(t||(t={}),t[o]=At(n[o],r[o],i[o]));return t}function At(e,t,n){if(Array.isArray(e)){var r=[];n=Array.isArray(n)?n:[n],t=Array.isArray(t)?t:[t];for(var i=0;i<e.length;i++)(t.indexOf(e[i])>=0||n.indexOf(e[i])<0)&&r.push(e[i]);return r}return e}function Ot(e){this._init(e)}function St(e){e.use=function(e){var t=this._installedPlugins||(this._installedPlugins=[]);if(t.indexOf(e)>-1)return this;var n=m(arguments,1);return n.unshift(this),"function"==typeof e.install?e.install.apply(e,n):"function"==typeof e&&e.apply(null,n),t.push(e),this}}function Tt(e){e.mixin=function(e){return this.options=J(this.options,e),this}}function Et(e){e.cid=0;var t=1;e.extend=function(e){e=e||{};var n=this,r=n.cid,i=e._Ctor||(e._Ctor={});if(i[r])return i[r];var o=e.name||n.options.name,a=function(e){this._init(e)};return a.prototype=Object.create(n.prototype),a.prototype.constructor=a,a.cid=t++,a.options=J(n.options,e),a.super=n,a.options.props&&jt(a),a.options.computed&&Lt(a),a.extend=n.extend,a.mixin=n.mixin,a.use=n.use,Ri.forEach(function(e){a[e]=n[e]}),o&&(a.options.components[o]=a),a.superOptions=n.options,a.extendOptions=e,a.sealedOptions=y({},a.options),i[r]=a,a}}function jt(e){var t=e.options.props;for(var n in t)He(e.prototype,"_props",n)}function Lt(e){var t=e.options.computed;for(var n in t)Je(e.prototype,n,t[n])}function Nt(e){Ri.forEach(function(t){e[t]=function(e,n){return n?("component"===t&&a(n)&&(n.name=n.name||e,n=this.options._base.extend(n)),"directive"===t&&"function"==typeof n&&(n={bind:n,update:n}),this.options[t+"s"][e]=n,n):this.options[t+"s"][e]}})}function It(e){return e&&(e.Ctor.options.name||e.tag)}function Mt(e,t){return Array.isArray(e)?e.indexOf(t)>-1:"string"==typeof e?e.split(",").indexOf(t)>-1:!!s(e)&&e.test(t)}function Pt(e,t){var n=e.cache,r=e.keys,i=e._vnode;for(var o in n){var a=n[o];if(a){var s=It(a.componentOptions);s&&!t(s)&&Dt(n,o,r,i)}}}function Dt(e,t,n,r){var i=e[t];i&&i!==r&&i.componentInstance.$destroy(),e[t]=null,d(n,t)}function Rt(e){for(var n=e.data,r=e,i=e;t(i.componentInstance);)(i=i.componentInstance._vnode).data&&(n=Ft(i.data,n));for(;t(r=r.parent);)r.data&&(n=Ft(n,r.data));return Ht(n.staticClass,n.class)}function Ft(e,n){return{staticClass:Bt(e.staticClass,n.staticClass),class:t(e.class)?[e.class,n.class]:n.class}}function Ht(e,n){return t(e)||t(n)?Bt(e,Ut(n)):""}function Bt(e,t){return e?t?e+" "+t:e:t||""}function Ut(e){return Array.isArray(e)?Vt(e):o(e)?zt(e):"string"==typeof e?e:""}function Vt(e){for(var n,r="",i=0,o=e.length;i<o;i++)t(n=Ut(e[i]))&&""!==n&&(r&&(r+=" "),r+=n);return r}function zt(e){var t="";for(var n in e)e[n]&&(t&&(t+=" "),t+=n);return t}function Kt(e){return va(e)?"svg":"math"===e?"math":void 0}function Jt(e){if("string"==typeof e){var t=document.querySelector(e);return t||document.createElement("div")}return e}function qt(e,t){var n=e.data.ref;if(n){var r=e.context,i=e.componentInstance||e.elm,o=r.$refs;t?Array.isArray(o[n])?d(o[n],i):o[n]===i&&(o[n]=void 0):e.data.refInFor?Array.isArray(o[n])?o[n].indexOf(i)<0&&o[n].push(i):o[n]=[i]:o[n]=i}}function Wt(r,i){return r.key===i.key&&(r.tag===i.tag&&r.isComment===i.isComment&&t(r.data)===t(i.data)&&Gt(r,i)||n(r.isAsyncPlaceholder)&&r.asyncFactory===i.asyncFactory&&e(i.asyncFactory.error))}function Gt(e,n){if("input"!==e.tag)return!0;var r,i=t(r=e.data)&&t(r=r.attrs)&&r.type,o=t(r=n.data)&&t(r=r.attrs)&&r.type;return i===o||ya(i)&&ya(o)}function Zt(e,n,r){var i,o,a={};for(i=n;i<=r;++i)t(o=e[i].key)&&(a[o]=i);return a}function Yt(e,t){(e.data.directives||t.data.directives)&&Qt(e,t)}function Qt(e,t){var n,r,i,o=e===ba,a=t===ba,s=Xt(e.data.directives,e.context),c=Xt(t.data.directives,t.context),u=[],l=[];for(n in c)r=s[n],i=c[n],r?(i.oldValue=r.value,tn(i,"update",t,e),i.def&&i.def.componentUpdated&&l.push(i)):(tn(i,"bind",t,e),i.def&&i.def.inserted&&u.push(i));if(u.length){var f=function(){for(var n=0;n<u.length;n++)tn(u[n],"inserted",t,e)};o?ae(t.data.hook||(t.data.hook={}),"insert",f):f()}if(l.length&&ae(t.data.hook||(t.data.hook={}),"postpatch",function(){for(var n=0;n<l.length;n++)tn(l[n],"componentUpdated",t,e)}),!o)for(n in s)c[n]||tn(s[n],"unbind",e,e,a)}function Xt(e,t){var n=Object.create(null);if(!e)return n;var r,i;for(r=0;r<e.length;r++)(i=e[r]).modifiers||(i.modifiers=wa),n[en(i)]=i,i.def=q(t.$options,"directives",i.name,!0);return n}function en(e){return e.rawName||e.name+"."+Object.keys(e.modifiers||{}).join(".")}function tn(e,t,n,r,i){var o=e.def&&e.def[t];if(o)try{o(n.elm,e,n,r,i)}catch(r){Q(r,n.context,"directive "+e.name+" "+t+" hook")}}function nn(n,r){var i=r.componentOptions;if(!(t(i)&&!1===i.Ctor.options.inheritAttrs||e(n.data.attrs)&&e(r.data.attrs))){var o,a,s=r.elm,c=n.data.attrs||{},u=r.data.attrs||{};t(u.__ob__)&&(u=r.data.attrs=y({},u));for(o in u)a=u[o],c[o]!==a&&rn(s,o,a);(qi||Wi)&&u.value!==c.value&&rn(s,"value",u.value);for(o in c)e(u[o])&&(ua(o)?s.removeAttributeNS(ca,la(o)):aa(o)||s.removeAttribute(o))}}function rn(e,t,n){sa(t)?fa(n)?e.removeAttribute(t):(n="allowfullscreen"===t&&"EMBED"===e.tagName?"true":t,e.setAttribute(t,n)):aa(t)?e.setAttribute(t,fa(n)||"false"===n?"false":"true"):ua(t)?fa(n)?e.removeAttributeNS(ca,la(t)):e.setAttributeNS(ca,t,n):fa(n)?e.removeAttribute(t):e.setAttribute(t,n)}function on(n,r){var i=r.elm,o=r.data,a=n.data;if(!(e(o.staticClass)&&e(o.class)&&(e(a)||e(a.staticClass)&&e(a.class)))){var s=Rt(r),c=i._transitionClasses;t(c)&&(s=Bt(s,Ut(c))),s!==i._prevClass&&(i.setAttribute("class",s),i._prevClass=s)}}function an(e){function t(){(a||(a=[])).push(e.slice(v,i).trim()),v=i+1}var n,r,i,o,a,s=!1,c=!1,u=!1,l=!1,f=0,d=0,p=0,v=0;for(i=0;i<e.length;i++)if(r=n,n=e.charCodeAt(i),s)39===n&&92!==r&&(s=!1);else if(c)34===n&&92!==r&&(c=!1);else if(u)96===n&&92!==r&&(u=!1);else if(l)47===n&&92!==r&&(l=!1);else if(124!==n||124===e.charCodeAt(i+1)||124===e.charCodeAt(i-1)||f||d||p){switch(n){case 34:c=!0;break;case 39:s=!0;break;case 96:u=!0;break;case 40:p++;break;case 41:p--;break;case 91:d++;break;case 93:d--;break;case 123:f++;break;case 125:f--}if(47===n){for(var h=i-1,m=void 0;h>=0&&" "===(m=e.charAt(h));h--);m&&Oa.test(m)||(l=!0)}}else void 0===o?(v=i+1,o=e.slice(0,i).trim()):t();if(void 0===o?o=e.slice(0,i).trim():0!==v&&t(),a)for(i=0;i<a.length;i++)o=sn(o,a[i]);return o}function sn(e,t){var n=t.indexOf("(");return n<0?'_f("'+t+'")('+e+")":'_f("'+t.slice(0,n)+'")('+e+","+t.slice(n+1)}function cn(e){console.error("[Vue compiler]: "+e)}function un(e,t){return e?e.map(function(e){return e[t]}).filter(function(e){return e}):[]}function ln(e,t,n){(e.props||(e.props=[])).push({name:t,value:n})}function fn(e,t,n){(e.attrs||(e.attrs=[])).push({name:t,value:n})}function dn(e,t,n,r,i,o){(e.directives||(e.directives=[])).push({name:t,rawName:n,value:r,arg:i,modifiers:o})}function pn(e,t,n,r,i,o){r&&r.capture&&(delete r.capture,t="!"+t),r&&r.once&&(delete r.once,t="~"+t),r&&r.passive&&(delete r.passive,t="&"+t);var a;r&&r.native?(delete r.native,a=e.nativeEvents||(e.nativeEvents={})):a=e.events||(e.events={});var s={value:n,modifiers:r},c=a[t];Array.isArray(c)?i?c.unshift(s):c.push(s):a[t]=c?i?[s,c]:[c,s]:s}function vn(e,t,n){var r=hn(e,":"+t)||hn(e,"v-bind:"+t);if(null!=r)return an(r);if(!1!==n){var i=hn(e,t);if(null!=i)return JSON.stringify(i)}}function hn(e,t,n){var r;if(null!=(r=e.attrsMap[t]))for(var i=e.attrsList,o=0,a=i.length;o<a;o++)if(i[o].name===t){i.splice(o,1);break}return n&&delete e.attrsMap[t],r}function mn(e,t,n){var r=n||{},i=r.number,o="$$v";r.trim&&(o="(typeof $$v === 'string'? $$v.trim(): $$v)"),i&&(o="_n("+o+")");var a=yn(t,o);e.model={value:"("+t+")",expression:'"'+t+'"',callback:"function ($$v) {"+a+"}"}}function yn(e,t){var n=gn(e);return null===n.key?e+"="+t:"$set("+n.exp+", "+n.key+", "+t+")"}function gn(e){if(Go=e.length,e.indexOf("[")<0||e.lastIndexOf("]")<Go-1)return(Qo=e.lastIndexOf("."))>-1?{exp:e.slice(0,Qo),key:'"'+e.slice(Qo+1)+'"'}:{exp:e,key:null};for(Zo=e,Qo=Xo=ea=0;!bn();)$n(Yo=_n())?wn(Yo):91===Yo&&Cn(Yo);return{exp:e.slice(0,Xo),key:e.slice(Xo+1,ea)}}function _n(){return Zo.charCodeAt(++Qo)}function bn(){return Qo>=Go}function $n(e){return 34===e||39===e}function Cn(e){var t=1;for(Xo=Qo;!bn();)if(e=_n(),$n(e))wn(e);else if(91===e&&t++,93===e&&t--,0===t){ea=Qo;break}}function wn(e){for(var t=e;!bn()&&(e=_n())!==t;);}function xn(e,t,n){var r=n&&n.number,i=vn(e,"value")||"null",o=vn(e,"true-value")||"true",a=vn(e,"false-value")||"false";ln(e,"checked","Array.isArray("+t+")?_i("+t+","+i+")>-1"+("true"===o?":("+t+")":":_q("+t+","+o+")")),pn(e,"change","var $$a="+t+",$$el=$event.target,$$c=$$el.checked?("+o+"):("+a+");if(Array.isArray($$a)){var $$v="+(r?"_n("+i+")":i)+",$$i=_i($$a,$$v);if($$el.checked){$$i<0&&("+t+"=$$a.concat([$$v]))}else{$$i>-1&&("+t+"=$$a.slice(0,$$i).concat($$a.slice($$i+1)))}}else{"+yn(t,"$$c")+"}",null,!0)}function kn(e,t,n){var r=n&&n.number,i=vn(e,"value")||"null";ln(e,"checked","_q("+t+","+(i=r?"_n("+i+")":i)+")"),pn(e,"change",yn(t,i),null,!0)}function An(e,t,n){var r="var $$selectedVal = "+('Array.prototype.filter.call($event.target.options,function(o){return o.selected}).map(function(o){var val = "_value" in o ? o._value : o.value;return '+(n&&n.number?"_n(val)":"val")+"})")+";";pn(e,"change",r=r+" "+yn(t,"$event.target.multiple ? $$selectedVal : $$selectedVal[0]"),null,!0)}function On(e,t,n){var r=e.attrsMap.type,i=n||{},o=i.lazy,a=i.number,s=i.trim,c=!o&&"range"!==r,u=o?"change":"range"===r?Sa:"input",l="$event.target.value";s&&(l="$event.target.value.trim()"),a&&(l="_n("+l+")");var f=yn(t,l);c&&(f="if($event.target.composing)return;"+f),ln(e,"value","("+t+")"),pn(e,u,f,null,!0),(s||a)&&pn(e,"blur","$forceUpdate()")}function Sn(e){if(t(e[Sa])){var n=Ji?"change":"input";e[n]=[].concat(e[Sa],e[n]||[]),delete e[Sa]}t(e[Ta])&&(e.change=[].concat(e[Ta],e.change||[]),delete e[Ta])}function Tn(e,t,n){var r=ta;return function i(){null!==e.apply(null,arguments)&&jn(t,i,n,r)}}function En(e,t,n,r,i){t=ne(t),n&&(t=Tn(t,e,r)),ta.addEventListener(e,t,Qi?{capture:r,passive:i}:r)}function jn(e,t,n,r){(r||ta).removeEventListener(e,t._withTask||t,n)}function Ln(t,n){if(!e(t.data.on)||!e(n.data.on)){var r=n.data.on||{},i=t.data.on||{};ta=n.elm,Sn(r),oe(r,i,En,jn,n.context)}}function Nn(n,r){if(!e(n.data.domProps)||!e(r.data.domProps)){var i,o,a=r.elm,s=n.data.domProps||{},c=r.data.domProps||{};t(c.__ob__)&&(c=r.data.domProps=y({},c));for(i in s)e(c[i])&&(a[i]="");for(i in c){if(o=c[i],"textContent"===i||"innerHTML"===i){if(r.children&&(r.children.length=0),o===s[i])continue;1===a.childNodes.length&&a.removeChild(a.childNodes[0])}if("value"===i){a._value=o;var u=e(o)?"":String(o);In(a,u)&&(a.value=u)}else a[i]=o}}}function In(e,t){return!e.composing&&("OPTION"===e.tagName||Mn(e,t)||Pn(e,t))}function Mn(e,t){var n=!0;try{n=document.activeElement!==e}catch(e){}return n&&e.value!==t}function Pn(e,n){var r=e.value,i=e._vModifiers;return t(i)&&i.number?l(r)!==l(n):t(i)&&i.trim?r.trim()!==n.trim():r!==n}function Dn(e){var t=Rn(e.style);return e.staticStyle?y(e.staticStyle,t):t}function Rn(e){return Array.isArray(e)?g(e):"string"==typeof e?La(e):e}function Fn(e,t){var n,r={};if(t)for(var i=e;i.componentInstance;)(i=i.componentInstance._vnode).data&&(n=Dn(i.data))&&y(r,n);(n=Dn(e.data))&&y(r,n);for(var o=e;o=o.parent;)o.data&&(n=Dn(o.data))&&y(r,n);return r}function Hn(n,r){var i=r.data,o=n.data;if(!(e(i.staticStyle)&&e(i.style)&&e(o.staticStyle)&&e(o.style))){var a,s,c=r.elm,u=o.staticStyle,l=o.normalizedStyle||o.style||{},f=u||l,d=Rn(r.data.style)||{};r.data.normalizedStyle=t(d.__ob__)?y({},d):d;var p=Fn(r,!0);for(s in f)e(p[s])&&Ma(c,s,"");for(s in p)(a=p[s])!==f[s]&&Ma(c,s,null==a?"":a)}}function Bn(e,t){if(t&&(t=t.trim()))if(e.classList)t.indexOf(" ")>-1?t.split(/\s+/).forEach(function(t){return e.classList.add(t)}):e.classList.add(t);else{var n=" "+(e.getAttribute("class")||"")+" ";n.indexOf(" "+t+" ")<0&&e.setAttribute("class",(n+t).trim())}}function Un(e,t){if(t&&(t=t.trim()))if(e.classList)t.indexOf(" ")>-1?t.split(/\s+/).forEach(function(t){return e.classList.remove(t)}):e.classList.remove(t),e.classList.length||e.removeAttribute("class");else{for(var n=" "+(e.getAttribute("class")||"")+" ",r=" "+t+" ";n.indexOf(r)>=0;)n=n.replace(r," ");(n=n.trim())?e.setAttribute("class",n):e.removeAttribute("class")}}function Vn(e){if(e){if("object"==typeof e){var t={};return!1!==e.css&&y(t,Fa(e.name||"v")),y(t,e),t}return"string"==typeof e?Fa(e):void 0}}function zn(e){qa(function(){qa(e)})}function Kn(e,t){var n=e._transitionClasses||(e._transitionClasses=[]);n.indexOf(t)<0&&(n.push(t),Bn(e,t))}function Jn(e,t){e._transitionClasses&&d(e._transitionClasses,t),Un(e,t)}function qn(e,t,n){var r=Wn(e,t),i=r.type,o=r.timeout,a=r.propCount;if(!i)return n();var s=i===Ba?za:Ja,c=0,u=function(){e.removeEventListener(s,l),n()},l=function(t){t.target===e&&++c>=a&&u()};setTimeout(function(){c<a&&u()},o+1),e.addEventListener(s,l)}function Wn(e,t){var n,r=window.getComputedStyle(e),i=r[Va+"Delay"].split(", "),o=r[Va+"Duration"].split(", "),a=Gn(i,o),s=r[Ka+"Delay"].split(", "),c=r[Ka+"Duration"].split(", "),u=Gn(s,c),l=0,f=0;return t===Ba?a>0&&(n=Ba,l=a,f=o.length):t===Ua?u>0&&(n=Ua,l=u,f=c.length):f=(n=(l=Math.max(a,u))>0?a>u?Ba:Ua:null)?n===Ba?o.length:c.length:0,{type:n,timeout:l,propCount:f,hasTransform:n===Ba&&Wa.test(r[Va+"Property"])}}function Gn(e,t){for(;e.length<t.length;)e=e.concat(e);return Math.max.apply(null,t.map(function(t,n){return Zn(t)+Zn(e[n])}))}function Zn(e){return 1e3*Number(e.slice(0,-1))}function Yn(n,r){var i=n.elm;t(i._leaveCb)&&(i._leaveCb.cancelled=!0,i._leaveCb());var a=Vn(n.data.transition);if(!e(a)&&!t(i._enterCb)&&1===i.nodeType){for(var s=a.css,c=a.type,u=a.enterClass,f=a.enterToClass,d=a.enterActiveClass,p=a.appearClass,v=a.appearToClass,h=a.appearActiveClass,m=a.beforeEnter,y=a.enter,g=a.afterEnter,_=a.enterCancelled,b=a.beforeAppear,$=a.appear,w=a.afterAppear,x=a.appearCancelled,k=a.duration,A=Eo,O=Eo.$vnode;O&&O.parent;)A=(O=O.parent).context;var S=!A._isMounted||!n.isRootInsert;if(!S||$||""===$){var T=S&&p?p:u,E=S&&h?h:d,j=S&&v?v:f,L=S?b||m:m,N=S&&"function"==typeof $?$:y,I=S?w||g:g,M=S?x||_:_,P=l(o(k)?k.enter:k),D=!1!==s&&!qi,R=er(N),F=i._enterCb=C(function(){D&&(Jn(i,j),Jn(i,E)),F.cancelled?(D&&Jn(i,T),M&&M(i)):I&&I(i),i._enterCb=null});n.data.show||ae(n.data.hook||(n.data.hook={}),"insert",function(){var e=i.parentNode,t=e&&e._pending&&e._pending[n.key];t&&t.tag===n.tag&&t.elm._leaveCb&&t.elm._leaveCb(),N&&N(i,F)}),L&&L(i),D&&(Kn(i,T),Kn(i,E),zn(function(){Kn(i,j),Jn(i,T),F.cancelled||R||(Xn(P)?setTimeout(F,P):qn(i,c,F))})),n.data.show&&(r&&r(),N&&N(i,F)),D||R||F()}}}function Qn(n,r){function i(){x.cancelled||(n.data.show||((a.parentNode._pending||(a.parentNode._pending={}))[n.key]=n),v&&v(a),b&&(Kn(a,f),Kn(a,p),zn(function(){Kn(a,d),Jn(a,f),x.cancelled||$||(Xn(w)?setTimeout(x,w):qn(a,u,x))})),h&&h(a,x),b||$||x())}var a=n.elm;t(a._enterCb)&&(a._enterCb.cancelled=!0,a._enterCb());var s=Vn(n.data.transition);if(e(s))return r();if(!t(a._leaveCb)&&1===a.nodeType){var c=s.css,u=s.type,f=s.leaveClass,d=s.leaveToClass,p=s.leaveActiveClass,v=s.beforeLeave,h=s.leave,m=s.afterLeave,y=s.leaveCancelled,g=s.delayLeave,_=s.duration,b=!1!==c&&!qi,$=er(h),w=l(o(_)?_.leave:_),x=a._leaveCb=C(function(){a.parentNode&&a.parentNode._pending&&(a.parentNode._pending[n.key]=null),b&&(Jn(a,d),Jn(a,p)),x.cancelled?(b&&Jn(a,f),y&&y(a)):(r(),m&&m(a)),a._leaveCb=null});g?g(i):i()}}function Xn(e){return"number"==typeof e&&!isNaN(e)}function er(n){if(e(n))return!1;var r=n.fns;return t(r)?er(Array.isArray(r)?r[0]:r):(n._length||n.length)>1}function tr(e,t){!0!==t.data.show&&Yn(t)}function nr(e,t,n){rr(e,t,n),(Ji||Wi)&&setTimeout(function(){rr(e,t,n)},0)}function rr(e,t,n){var r=t.value,i=e.multiple;if(!i||Array.isArray(r)){for(var o,a,s=0,c=e.options.length;s<c;s++)if(a=e.options[s],i)o=$(r,or(a))>-1,a.selected!==o&&(a.selected=o);else if(b(or(a),r))return void(e.selectedIndex!==s&&(e.selectedIndex=s));i||(e.selectedIndex=-1)}}function ir(e,t){return t.every(function(t){return!b(t,e)})}function or(e){return"_value"in e?e._value:e.value}function ar(e){e.target.composing=!0}function sr(e){e.target.composing&&(e.target.composing=!1,cr(e.target,"input"))}function cr(e,t){var n=document.createEvent("HTMLEvents");n.initEvent(t,!0,!0),e.dispatchEvent(n)}function ur(e){return!e.componentInstance||e.data&&e.data.transition?e:ur(e.componentInstance._vnode)}function lr(e){var t=e&&e.componentOptions;return t&&t.Ctor.options.abstract?lr(ye(t.children)):e}function fr(e){var t={},n=e.$options;for(var r in n.propsData)t[r]=e[r];var i=n._parentListeners;for(var o in i)t[ji(o)]=i[o];return t}function dr(e,t){if(/\d-keep-alive$/.test(t.tag))return e("keep-alive",{props:t.componentOptions.propsData})}function pr(e){for(;e=e.parent;)if(e.data.transition)return!0}function vr(e,t){return t.key===e.key&&t.tag===e.tag}function hr(e){e.elm._moveCb&&e.elm._moveCb(),e.elm._enterCb&&e.elm._enterCb()}function mr(e){e.data.newPos=e.elm.getBoundingClientRect()}function yr(e){var t=e.data.pos,n=e.data.newPos,r=t.left-n.left,i=t.top-n.top;if(r||i){e.data.moved=!0;var o=e.elm.style;o.transform=o.WebkitTransform="translate("+r+"px,"+i+"px)",o.transitionDuration="0s"}}function gr(e,t){var n=t?os(t):rs;if(n.test(e)){for(var r,i,o=[],a=n.lastIndex=0;r=n.exec(e);){(i=r.index)>a&&o.push(JSON.stringify(e.slice(a,i)));var s=an(r[1].trim());o.push("_s("+s+")"),a=i+r[0].length}return a<e.length&&o.push(JSON.stringify(e.slice(a))),o.join("+")}}function _r(e,t){var n=t?Ps:Ms;return e.replace(n,function(e){return Is[e]})}function br(e,t){function n(t){l+=t,e=e.substring(t)}function r(e,n,r){var i,s;if(null==n&&(n=l),null==r&&(r=l),e&&(s=e.toLowerCase()),e)for(i=a.length-1;i>=0&&a[i].lowerCasedTag!==s;i--);else i=0;if(i>=0){for(var c=a.length-1;c>=i;c--)t.end&&t.end(a[c].tag,n,r);a.length=i,o=i&&a[i-1].tag}else"br"===s?t.start&&t.start(e,[],!0,n,r):"p"===s&&(t.start&&t.start(e,[],!1,n,r),t.end&&t.end(e,n,r))}for(var i,o,a=[],s=t.expectHTML,c=t.isUnaryTag||Mi,u=t.canBeLeftOpenTag||Mi,l=0;e;){if(i=e,o&&Ls(o)){var f=0,d=o.toLowerCase(),p=Ns[d]||(Ns[d]=new RegExp("([\\s\\S]*?)(</"+d+"[^>]*>)","i")),v=e.replace(p,function(e,n,r){return f=r.length,Ls(d)||"noscript"===d||(n=n.replace(/<!--([\s\S]*?)-->/g,"$1").replace(/<!\[CDATA\[([\s\S]*?)]]>/g,"$1")),Rs(d,n)&&(n=n.slice(1)),t.chars&&t.chars(n),""});l+=e.length-v.length,e=v,r(d,l-f,l)}else{var h=e.indexOf("<");if(0===h){if(_s.test(e)){var m=e.indexOf("--\x3e");if(m>=0){t.shouldKeepComment&&t.comment(e.substring(4,m)),n(m+3);continue}}if(bs.test(e)){var y=e.indexOf("]>");if(y>=0){n(y+2);continue}}var g=e.match(gs);if(g){n(g[0].length);continue}var _=e.match(ys);if(_){var b=l;n(_[0].length),r(_[1],b,l);continue}var $=function(){var t=e.match(hs);if(t){var r={tagName:t[1],attrs:[],start:l};n(t[0].length);for(var i,o;!(i=e.match(ms))&&(o=e.match(ds));)n(o[0].length),r.attrs.push(o);if(i)return r.unarySlash=i[1],n(i[0].length),r.end=l,r}}();if($){!function(e){var n=e.tagName,i=e.unarySlash;s&&("p"===o&&fs(n)&&r(o),u(n)&&o===n&&r(n));for(var l=c(n)||!!i,f=e.attrs.length,d=new Array(f),p=0;p<f;p++){var v=e.attrs[p];$s&&-1===v[0].indexOf('""')&&(""===v[3]&&delete v[3],""===v[4]&&delete v[4],""===v[5]&&delete v[5]);var h=v[3]||v[4]||v[5]||"";d[p]={name:v[1],value:_r(h,t.shouldDecodeNewlines)}}l||(a.push({tag:n,lowerCasedTag:n.toLowerCase(),attrs:d}),o=n),t.start&&t.start(n,d,l,e.start,e.end)}($),Rs(o,e)&&n(1);continue}}var C=void 0,w=void 0,x=void 0;if(h>=0){for(w=e.slice(h);!(ys.test(w)||hs.test(w)||_s.test(w)||bs.test(w)||(x=w.indexOf("<",1))<0);)h+=x,w=e.slice(h);C=e.substring(0,h),n(h)}h<0&&(C=e,e=""),t.chars&&C&&t.chars(C)}if(e===i){t.chars&&t.chars(e);break}}r()}function $r(e,t,n){return{type:1,tag:e,attrsList:t,attrsMap:Fr(t),parent:n,children:[]}}function Cr(e,t){function n(e){e.pre&&(s=!1),Os(e.tag)&&(c=!1)}Cs=t.warn||cn,Os=t.isPreTag||Mi,Ss=t.mustUseProp||Mi,Ts=t.getTagNamespace||Mi,xs=un(t.modules,"transformNode"),ks=un(t.modules,"preTransformNode"),As=un(t.modules,"postTransformNode"),ws=t.delimiters;var r,i,o=[],a=!1!==t.preserveWhitespace,s=!1,c=!1;return br(e,{warn:Cs,expectHTML:t.expectHTML,isUnaryTag:t.isUnaryTag,canBeLeftOpenTag:t.canBeLeftOpenTag,shouldDecodeNewlines:t.shouldDecodeNewlines,shouldKeepComment:t.comments,start:function(e,a,u){var l=i&&i.ns||Ts(e);Ji&&"svg"===l&&(a=Ur(a));var f=$r(e,a,i);l&&(f.ns=l),Br(f)&&!no()&&(f.forbidden=!0);for(var d=0;d<ks.length;d++)f=ks[d](f,t)||f;if(s||(wr(f),f.pre&&(s=!0)),Os(f.tag)&&(c=!0),s?xr(f):f.processed||(Sr(f),Tr(f),Nr(f),kr(f,t)),r?o.length||r.if&&(f.elseif||f.else)&&Lr(r,{exp:f.elseif,block:f}):r=f,i&&!f.forbidden)if(f.elseif||f.else)Er(f,i);else if(f.slotScope){i.plain=!1;var p=f.slotTarget||'"default"';(i.scopedSlots||(i.scopedSlots={}))[p]=f}else i.children.push(f),f.parent=i;u?n(f):(i=f,o.push(f));for(var v=0;v<As.length;v++)As[v](f,t)},end:function(){var e=o[o.length-1],t=e.children[e.children.length-1];t&&3===t.type&&" "===t.text&&!c&&e.children.pop(),o.length-=1,i=o[o.length-1],n(e)},chars:function(e){if(i&&(!Ji||"textarea"!==i.tag||i.attrsMap.placeholder!==e)){var t=i.children;if(e=c||e.trim()?Hr(i)?e:Js(e):a&&t.length?" ":""){var n;!s&&" "!==e&&(n=gr(e,ws))?t.push({type:2,expression:n,text:e}):" "===e&&t.length&&" "===t[t.length-1].text||t.push({type:3,text:e})}}},comment:function(e){i.children.push({type:3,text:e,isComment:!0})}}),r}function wr(e){null!=hn(e,"v-pre")&&(e.pre=!0)}function xr(e){var t=e.attrsList.length;if(t)for(var n=e.attrs=new Array(t),r=0;r<t;r++)n[r]={name:e.attrsList[r].name,value:JSON.stringify(e.attrsList[r].value)};else e.pre||(e.plain=!0)}function kr(e,t){Ar(e),e.plain=!e.key&&!e.attrsList.length,Or(e),Ir(e),Mr(e);for(var n=0;n<xs.length;n++)e=xs[n](e,t)||e;Pr(e)}function Ar(e){var t=vn(e,"key");t&&(e.key=t)}function Or(e){var t=vn(e,"ref");t&&(e.ref=t,e.refInFor=Dr(e))}function Sr(e){var t;if(t=hn(e,"v-for")){var n=t.match(Bs);if(!n)return;e.for=n[2].trim();var r=n[1].trim(),i=r.match(Us);i?(e.alias=i[1].trim(),e.iterator1=i[2].trim(),i[3]&&(e.iterator2=i[3].trim())):e.alias=r}}function Tr(e){var t=hn(e,"v-if");if(t)e.if=t,Lr(e,{exp:t,block:e});else{null!=hn(e,"v-else")&&(e.else=!0);var n=hn(e,"v-else-if");n&&(e.elseif=n)}}function Er(e,t){var n=jr(t.children);n&&n.if&&Lr(n,{exp:e.elseif,block:e})}function jr(e){for(var t=e.length;t--;){if(1===e[t].type)return e[t];e.pop()}}function Lr(e,t){e.ifConditions||(e.ifConditions=[]),e.ifConditions.push(t)}function Nr(e){null!=hn(e,"v-once")&&(e.once=!0)}function Ir(e){if("slot"===e.tag)e.slotName=vn(e,"name");else{var t;"template"===e.tag?(t=hn(e,"scope"),e.slotScope=t||hn(e,"slot-scope")):(t=hn(e,"slot-scope"))&&(e.slotScope=t);var n=vn(e,"slot");n&&(e.slotTarget='""'===n?'"default"':n,e.slotScope||fn(e,"slot",n))}}function Mr(e){var t;(t=vn(e,"is"))&&(e.component=t),null!=hn(e,"inline-template")&&(e.inlineTemplate=!0)}function Pr(e){var t,n,r,i,o,a,s,c=e.attrsList;for(t=0,n=c.length;t<n;t++)if(r=i=c[t].name,o=c[t].value,Hs.test(r))if(e.hasBindings=!0,(a=Rr(r))&&(r=r.replace(Ks,"")),zs.test(r))r=r.replace(zs,""),o=an(o),s=!1,a&&(a.prop&&(s=!0,"innerHtml"===(r=ji(r))&&(r="innerHTML")),a.camel&&(r=ji(r)),a.sync&&pn(e,"update:"+ji(r),yn(o,"$event"))),s||!e.component&&Ss(e.tag,e.attrsMap.type,r)?ln(e,r,o):fn(e,r,o);else if(Fs.test(r))pn(e,r=r.replace(Fs,""),o,a,!1,Cs);else{var u=(r=r.replace(Hs,"")).match(Vs),l=u&&u[1];l&&(r=r.slice(0,-(l.length+1))),dn(e,r,i,o,l,a)}else fn(e,r,JSON.stringify(o))}function Dr(e){for(var t=e;t;){if(void 0!==t.for)return!0;t=t.parent}return!1}function Rr(e){var t=e.match(Ks);if(t){var n={};return t.forEach(function(e){n[e.slice(1)]=!0}),n}}function Fr(e){for(var t={},n=0,r=e.length;n<r;n++)t[e[n].name]=e[n].value;return t}function Hr(e){return"script"===e.tag||"style"===e.tag}function Br(e){return"style"===e.tag||"script"===e.tag&&(!e.attrsMap.type||"text/javascript"===e.attrsMap.type)}function Ur(e){for(var t=[],n=0;n<e.length;n++){var r=e[n];qs.test(r.name)||(r.name=r.name.replace(Ws,""),t.push(r))}return t}function Vr(e){return $r(e.tag,e.attrsList.slice(),e.parent)}function zr(e,t,n){e.attrsMap[t]=n,e.attrsList.push({name:t,value:n})}function Kr(e,t){e&&(Es=Ys(t.staticKeys||""),js=t.isReservedTag||Mi,Jr(e),qr(e,!1))}function Jr(e){if(e.static=Wr(e),1===e.type){if(!js(e.tag)&&"slot"!==e.tag&&null==e.attrsMap["inline-template"])return;for(var t=0,n=e.children.length;t<n;t++){var r=e.children[t];Jr(r),r.static||(e.static=!1)}if(e.ifConditions)for(var i=1,o=e.ifConditions.length;i<o;i++){var a=e.ifConditions[i].block;Jr(a),a.static||(e.static=!1)}}}function qr(e,t){if(1===e.type){if((e.static||e.once)&&(e.staticInFor=t),e.static&&e.children.length&&(1!==e.children.length||3!==e.children[0].type))return void(e.staticRoot=!0);if(e.staticRoot=!1,e.children)for(var n=0,r=e.children.length;n<r;n++)qr(e.children[n],t||!!e.for);if(e.ifConditions)for(var i=1,o=e.ifConditions.length;i<o;i++)qr(e.ifConditions[i].block,t)}}function Wr(e){return 2!==e.type&&(3===e.type||!(!e.pre&&(e.hasBindings||e.if||e.for||Oi(e.tag)||!js(e.tag)||Gr(e)||!Object.keys(e).every(Es))))}function Gr(e){for(;e.parent;){if("template"!==(e=e.parent).tag)return!1;if(e.for)return!0}return!1}function Zr(e,t,n){var r=t?"nativeOn:{":"on:{";for(var i in e){var o=e[i];r+='"'+i+'":'+Yr(i,o)+","}return r.slice(0,-1)+"}"}function Yr(e,t){if(!t)return"function(){}";if(Array.isArray(t))return"["+t.map(function(t){return Yr(e,t)}).join(",")+"]";var n=Xs.test(t.value),r=Qs.test(t.value);if(t.modifiers){var i="",o="",a=[];for(var s in t.modifiers)if(nc[s])o+=nc[s],ec[s]&&a.push(s);else if("exact"===s){var c=t.modifiers;o+=tc(["ctrl","shift","alt","meta"].filter(function(e){return!c[e]}).map(function(e){return"$event."+e+"Key"}).join("||"))}else a.push(s);return a.length&&(i+=Qr(a)),o&&(i+=o),"function($event){"+i+(n?t.value+"($event)":r?"("+t.value+")($event)":t.value)+"}"}return n||r?t.value:"function($event){"+t.value+"}"}function Qr(e){return"if(!('button' in $event)&&"+e.map(Xr).join("&&")+")return null;"}function Xr(e){var t=parseInt(e,10);if(t)return"$event.keyCode!=="+t;var n=ec[e];return"_k($event.keyCode,"+JSON.stringify(e)+","+JSON.stringify(n)+",$event.key)"}function ei(e,t){var n=new ic(t);return{render:"with(this){return "+(e?ti(e,n):'_c("div")')+"}",staticRenderFns:n.staticRenderFns}}function ti(e,t){if(e.staticRoot&&!e.staticProcessed)return ni(e,t);if(e.once&&!e.onceProcessed)return ri(e,t);if(e.for&&!e.forProcessed)return ai(e,t);if(e.if&&!e.ifProcessed)return ii(e,t);if("template"!==e.tag||e.slotTarget){if("slot"===e.tag)return _i(e,t);var n;if(e.component)n=bi(e.component,e,t);else{var r=e.plain?void 0:si(e,t),i=e.inlineTemplate?null:pi(e,t,!0);n="_c('"+e.tag+"'"+(r?","+r:"")+(i?","+i:"")+")"}for(var o=0;o<t.transforms.length;o++)n=t.transforms[o](e,n);return n}return pi(e,t)||"void 0"}function ni(e,t){return e.staticProcessed=!0,t.staticRenderFns.push("with(this){return "+ti(e,t)+"}"),"_m("+(t.staticRenderFns.length-1)+(e.staticInFor?",true":"")+")"}function ri(e,t){if(e.onceProcessed=!0,e.if&&!e.ifProcessed)return ii(e,t);if(e.staticInFor){for(var n="",r=e.parent;r;){if(r.for){n=r.key;break}r=r.parent}return n?"_o("+ti(e,t)+","+t.onceId+++","+n+")":ti(e,t)}return ni(e,t)}function ii(e,t,n,r){return e.ifProcessed=!0,oi(e.ifConditions.slice(),t,n,r)}function oi(e,t,n,r){function i(e){return n?n(e,t):e.once?ri(e,t):ti(e,t)}if(!e.length)return r||"_e()";var o=e.shift();return o.exp?"("+o.exp+")?"+i(o.block)+":"+oi(e,t,n,r):""+i(o.block)}function ai(e,t,n,r){var i=e.for,o=e.alias,a=e.iterator1?","+e.iterator1:"",s=e.iterator2?","+e.iterator2:"";return e.forProcessed=!0,(r||"_l")+"(("+i+"),function("+o+a+s+"){return "+(n||ti)(e,t)+"})"}function si(e,t){var n="{",r=ci(e,t);r&&(n+=r+","),e.key&&(n+="key:"+e.key+","),e.ref&&(n+="ref:"+e.ref+","),e.refInFor&&(n+="refInFor:true,"),e.pre&&(n+="pre:true,"),e.component&&(n+='tag:"'+e.tag+'",');for(var i=0;i<t.dataGenFns.length;i++)n+=t.dataGenFns[i](e);if(e.attrs&&(n+="attrs:{"+$i(e.attrs)+"},"),e.props&&(n+="domProps:{"+$i(e.props)+"},"),e.events&&(n+=Zr(e.events,!1,t.warn)+","),e.nativeEvents&&(n+=Zr(e.nativeEvents,!0,t.warn)+","),e.slotTarget&&!e.slotScope&&(n+="slot:"+e.slotTarget+","),e.scopedSlots&&(n+=li(e.scopedSlots,t)+","),e.model&&(n+="model:{value:"+e.model.value+",callback:"+e.model.callback+",expression:"+e.model.expression+"},"),e.inlineTemplate){var o=ui(e,t);o&&(n+=o+",")}return n=n.replace(/,$/,"")+"}",e.wrapData&&(n=e.wrapData(n)),e.wrapListeners&&(n=e.wrapListeners(n)),n}function ci(e,t){var n=e.directives;if(n){var r,i,o,a,s="directives:[",c=!1;for(r=0,i=n.length;r<i;r++){o=n[r],a=!0;var u=t.directives[o.name];u&&(a=!!u(e,o,t.warn)),a&&(c=!0,s+='{name:"'+o.name+'",rawName:"'+o.rawName+'"'+(o.value?",value:("+o.value+"),expression:"+JSON.stringify(o.value):"")+(o.arg?',arg:"'+o.arg+'"':"")+(o.modifiers?",modifiers:"+JSON.stringify(o.modifiers):"")+"},")}return c?s.slice(0,-1)+"]":void 0}}function ui(e,t){var n=e.children[0];if(1===n.type){var r=ei(n,t.options);return"inlineTemplate:{render:function(){"+r.render+"},staticRenderFns:["+r.staticRenderFns.map(function(e){return"function(){"+e+"}"}).join(",")+"]}"}}function li(e,t){return"scopedSlots:_u(["+Object.keys(e).map(function(n){return fi(n,e[n],t)}).join(",")+"])"}function fi(e,t,n){return t.for&&!t.forProcessed?di(e,t,n):"{key:"+e+",fn:"+("function("+String(t.slotScope)+"){return "+("template"===t.tag?t.if?t.if+"?"+(pi(t,n)||"undefined")+":undefined":pi(t,n)||"undefined":ti(t,n))+"}")+"}"}function di(e,t,n){var r=t.for,i=t.alias,o=t.iterator1?","+t.iterator1:"",a=t.iterator2?","+t.iterator2:"";return t.forProcessed=!0,"_l(("+r+"),function("+i+o+a+"){return "+fi(e,t,n)+"})"}function pi(e,t,n,r,i){var o=e.children;if(o.length){var a=o[0];if(1===o.length&&a.for&&"template"!==a.tag&&"slot"!==a.tag)return(r||ti)(a,t);var s=n?vi(o,t.maybeComponent):0,c=i||mi;return"["+o.map(function(e){return c(e,t)}).join(",")+"]"+(s?","+s:"")}}function vi(e,t){for(var n=0,r=0;r<e.length;r++){var i=e[r];if(1===i.type){if(hi(i)||i.ifConditions&&i.ifConditions.some(function(e){return hi(e.block)})){n=2;break}(t(i)||i.ifConditions&&i.ifConditions.some(function(e){return t(e.block)}))&&(n=1)}}return n}function hi(e){return void 0!==e.for||"template"===e.tag||"slot"===e.tag}function mi(e,t){return 1===e.type?ti(e,t):3===e.type&&e.isComment?gi(e):yi(e)}function yi(e){return"_v("+(2===e.type?e.expression:Ci(JSON.stringify(e.text)))+")"}function gi(e){return"_e("+JSON.stringify(e.text)+")"}function _i(e,t){var n=e.slotName||'"default"',r=pi(e,t),i="_t("+n+(r?","+r:""),o=e.attrs&&"{"+e.attrs.map(function(e){return ji(e.name)+":"+e.value}).join(",")+"}",a=e.attrsMap["v-bind"];return!o&&!a||r||(i+=",null"),o&&(i+=","+o),a&&(i+=(o?"":",null")+","+a),i+")"}function bi(e,t,n){var r=t.inlineTemplate?null:pi(t,n,!0);return"_c("+e+","+si(t,n)+(r?","+r:"")+")"}function $i(e){for(var t="",n=0;n<e.length;n++){var r=e[n];t+='"'+r.name+'":'+Ci(r.value)+","}return t.slice(0,-1)}function Ci(e){return e.replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")}function wi(e,t){try{return new Function(e)}catch(n){return t.push({err:n,code:e}),_}}function xi(e){var t=Object.create(null);return function(n,r,i){delete(r=y({},r)).warn;var o=r.delimiters?String(r.delimiters)+n:n;if(t[o])return t[o];var a=e(n,r),s={},c=[];return s.render=wi(a.render,c),s.staticRenderFns=a.staticRenderFns.map(function(e){return wi(e,c)}),t[o]=s}}function ki(e){if(e.outerHTML)return e.outerHTML;var t=document.createElement("div");return t.appendChild(e.cloneNode(!0)),t.innerHTML}var Ai=Object.prototype.toString,Oi=f("slot,component",!0),Si=f("key,ref,slot,slot-scope,is"),Ti=Object.prototype.hasOwnProperty,Ei=/-(\w)/g,ji=v(function(e){return e.replace(Ei,function(e,t){return t?t.toUpperCase():""})}),Li=v(function(e){return e.charAt(0).toUpperCase()+e.slice(1)}),Ni=/\B([A-Z])/g,Ii=v(function(e){return e.replace(Ni,"-$1").toLowerCase()}),Mi=function(e,t,n){return!1},Pi=function(e){return e},Di="data-server-rendered",Ri=["component","directive","filter"],Fi=["beforeCreate","created","beforeMount","mounted","beforeUpdate","updated","beforeDestroy","destroyed","activated","deactivated","errorCaptured"],Hi={optionMergeStrategies:Object.create(null),silent:!1,productionTip:!1,devtools:!1,performance:!1,errorHandler:null,warnHandler:null,ignoredElements:[],keyCodes:Object.create(null),isReservedTag:Mi,isReservedAttr:Mi,isUnknownElement:Mi,getTagNamespace:_,parsePlatformTagName:Pi,mustUseProp:Mi,_lifecycleHooks:Fi},Bi=Object.freeze({}),Ui=/[^\w.$]/,Vi="__proto__"in{},zi="undefined"!=typeof window,Ki=zi&&window.navigator.userAgent.toLowerCase(),Ji=Ki&&/msie|trident/.test(Ki),qi=Ki&&Ki.indexOf("msie 9.0")>0,Wi=Ki&&Ki.indexOf("edge/")>0,Gi=Ki&&Ki.indexOf("android")>0,Zi=Ki&&/iphone|ipad|ipod|ios/.test(Ki),Yi=(Ki&&/chrome\/\d+/.test(Ki),{}.watch),Qi=!1;if(zi)try{var Xi={};Object.defineProperty(Xi,"passive",{get:function(){Qi=!0}}),window.addEventListener("test-passive",null,Xi)}catch(e){}var eo,to,no=function(){return void 0===eo&&(eo=!zi&&"undefined"!=typeof global&&"server"===global.process.env.VUE_ENV),eo},ro=zi&&window.__VUE_DEVTOOLS_GLOBAL_HOOK__,io="undefined"!=typeof Symbol&&A(Symbol)&&"undefined"!=typeof Reflect&&A(Reflect.ownKeys);to="undefined"!=typeof Set&&A(Set)?Set:function(){function e(){this.set=Object.create(null)}return e.prototype.has=function(e){return!0===this.set[e]},e.prototype.add=function(e){this.set[e]=!0},e.prototype.clear=function(){this.set=Object.create(null)},e}();var oo=_,ao=0,so=function(){this.id=ao++,this.subs=[]};so.prototype.addSub=function(e){this.subs.push(e)},so.prototype.removeSub=function(e){d(this.subs,e)},so.prototype.depend=function(){so.target&&so.target.addDep(this)},so.prototype.notify=function(){for(var e=this.subs.slice(),t=0,n=e.length;t<n;t++)e[t].update()},so.target=null;var co=[],uo=function(e,t,n,r,i,o,a,s){this.tag=e,this.data=t,this.children=n,this.text=r,this.elm=i,this.ns=void 0,this.context=o,this.functionalContext=void 0,this.functionalOptions=void 0,this.functionalScopeId=void 0,this.key=t&&t.key,this.componentOptions=a,this.componentInstance=void 0,this.parent=void 0,this.raw=!1,this.isStatic=!1,this.isRootInsert=!0,this.isComment=!1,this.isCloned=!1,this.isOnce=!1,this.asyncFactory=s,this.asyncMeta=void 0,this.isAsyncPlaceholder=!1},lo={child:{configurable:!0}};lo.child.get=function(){return this.componentInstance},Object.defineProperties(uo.prototype,lo);var fo=function(e){void 0===e&&(e="");var t=new uo;return t.text=e,t.isComment=!0,t},po=Array.prototype,vo=Object.create(po);["push","pop","shift","unshift","splice","sort","reverse"].forEach(function(e){var t=po[e];x(vo,e,function(){for(var n=[],r=arguments.length;r--;)n[r]=arguments[r];var i,o=t.apply(this,n),a=this.__ob__;switch(e){case"push":case"unshift":i=n;break;case"splice":i=n.slice(2)}return i&&a.observeArray(i),a.dep.notify(),o})});var ho=Object.getOwnPropertyNames(vo),mo={shouldConvert:!0},yo=function(e){this.value=e,this.dep=new so,this.vmCount=0,x(e,"__ob__",this),Array.isArray(e)?((Vi?L:N)(e,vo,ho),this.observeArray(e)):this.walk(e)};yo.prototype.walk=function(e){for(var t=Object.keys(e),n=0;n<t.length;n++)M(e,t[n],e[t[n]])},yo.prototype.observeArray=function(e){for(var t=0,n=e.length;t<n;t++)I(e[t])};var go=Hi.optionMergeStrategies;go.data=function(e,t,n){return n?H(e,t,n):t&&"function"!=typeof t?e:H.call(this,e,t)},Fi.forEach(function(e){go[e]=B}),Ri.forEach(function(e){go[e+"s"]=U}),go.watch=function(e,t,n,r){if(e===Yi&&(e=void 0),t===Yi&&(t=void 0),!t)return Object.create(e||null);if(!e)return t;var i={};y(i,e);for(var o in t){var a=i[o],s=t[o];a&&!Array.isArray(a)&&(a=[a]),i[o]=a?a.concat(s):Array.isArray(s)?s:[s]}return i},go.props=go.methods=go.inject=go.computed=function(e,t,n,r){if(!e)return t;var i=Object.create(null);return y(i,e),t&&y(i,t),i},go.provide=H;var _o,bo,$o=function(e,t){return void 0===t?e:t},Co=[],wo=!1,xo=!1;if("undefined"!=typeof setImmediate&&A(setImmediate))bo=function(){setImmediate(te)};else if("undefined"==typeof MessageChannel||!A(MessageChannel)&&"[object MessageChannelConstructor]"!==MessageChannel.toString())bo=function(){setTimeout(te,0)};else{var ko=new MessageChannel,Ao=ko.port2;ko.port1.onmessage=te,bo=function(){Ao.postMessage(1)}}if("undefined"!=typeof Promise&&A(Promise)){var Oo=Promise.resolve();_o=function(){Oo.then(te),Zi&&setTimeout(_)}}else _o=bo;var So,To=v(function(e){var t="&"===e.charAt(0),n="~"===(e=t?e.slice(1):e).charAt(0),r="!"===(e=n?e.slice(1):e).charAt(0);return e=r?e.slice(1):e,{name:e,once:n,capture:r,passive:t}}),Eo=null,jo=[],Lo=[],No={},Io=!1,Mo=!1,Po=0,Do=0,Ro=function(e,t,n,r){this.vm=e,e._watchers.push(this),r?(this.deep=!!r.deep,this.user=!!r.user,this.lazy=!!r.lazy,this.sync=!!r.sync):this.deep=this.user=this.lazy=this.sync=!1,this.cb=n,this.id=++Do,this.active=!0,this.dirty=this.lazy,this.deps=[],this.newDeps=[],this.depIds=new to,this.newDepIds=new to,this.expression="","function"==typeof t?this.getter=t:(this.getter=k(t),this.getter||(this.getter=function(){})),this.value=this.lazy?void 0:this.get()};Ro.prototype.get=function(){O(this);var e,t=this.vm;try{e=this.getter.call(t,t)}catch(e){if(!this.user)throw e;Q(e,t,'getter for watcher "'+this.expression+'"')}finally{this.deep&&Re(e),S(),this.cleanupDeps()}return e},Ro.prototype.addDep=function(e){var t=e.id;this.newDepIds.has(t)||(this.newDepIds.add(t),this.newDeps.push(e),this.depIds.has(t)||e.addSub(this))},Ro.prototype.cleanupDeps=function(){for(var e=this,t=this.deps.length;t--;){var n=e.deps[t];e.newDepIds.has(n.id)||n.removeSub(e)}var r=this.depIds;this.depIds=this.newDepIds,this.newDepIds=r,this.newDepIds.clear(),r=this.deps,this.deps=this.newDeps,this.newDeps=r,this.newDeps.length=0},Ro.prototype.update=function(){this.lazy?this.dirty=!0:this.sync?this.run():De(this)},Ro.prototype.run=function(){if(this.active){var e=this.get();if(e!==this.value||o(e)||this.deep){var t=this.value;if(this.value=e,this.user)try{this.cb.call(this.vm,e,t)}catch(e){Q(e,this.vm,'callback for watcher "'+this.expression+'"')}else this.cb.call(this.vm,e,t)}}},Ro.prototype.evaluate=function(){this.value=this.get(),this.dirty=!1},Ro.prototype.depend=function(){for(var e=this,t=this.deps.length;t--;)e.deps[t].depend()},Ro.prototype.teardown=function(){var e=this;if(this.active){this.vm._isBeingDestroyed||d(this.vm._watchers,this);for(var t=this.deps.length;t--;)e.deps[t].removeSub(e);this.active=!1}};var Fo=new to,Ho={enumerable:!0,configurable:!0,get:_,set:_},Bo={lazy:!0};lt(ft.prototype);var Uo={init:function(e,t,n,r){if(!e.componentInstance||e.componentInstance._isDestroyed)(e.componentInstance=ht(e,Eo,n,r)).$mount(t?e.elm:void 0,t);else if(e.data.keepAlive){var i=e;Uo.prepatch(i,i)}},prepatch:function(e,t){var n=t.componentOptions;Oe(t.componentInstance=e.componentInstance,n.propsData,n.listeners,t,n.children)},insert:function(e){var t=e.context,n=e.componentInstance;n._isMounted||(n._isMounted=!0,je(n,"mounted")),e.data.keepAlive&&(t._isMounted?Me(n):Te(n,!0))},destroy:function(e){var t=e.componentInstance;t._isDestroyed||(e.data.keepAlive?Ee(t,!0):t.$destroy())}},Vo=Object.keys(Uo),zo=1,Ko=2,Jo=0;!function(e){e.prototype._init=function(e){var t=this;t._uid=Jo++,t._isVue=!0,e&&e._isComponent?wt(t,e):t.$options=J(xt(t.constructor),e||{},t),t._renderProxy=t,t._self=t,ke(t),ge(t),Ct(t),je(t,"beforeCreate"),Qe(t),Be(t),Ye(t),je(t,"created"),t.$options.el&&t.$mount(t.$options.el)}}(Ot),function(e){var t={};t.get=function(){return this._data};var n={};n.get=function(){return this._props},Object.defineProperty(e.prototype,"$data",t),Object.defineProperty(e.prototype,"$props",n),e.prototype.$set=P,e.prototype.$delete=D,e.prototype.$watch=function(e,t,n){var r=this;if(a(t))return Ze(r,e,t,n);(n=n||{}).user=!0;var i=new Ro(r,e,t,n);return n.immediate&&t.call(r,i.value),function(){i.teardown()}}}(Ot),function(e){var t=/^hook:/;e.prototype.$on=function(e,n){var r=this,i=this;if(Array.isArray(e))for(var o=0,a=e.length;o<a;o++)r.$on(e[o],n);else(i._events[e]||(i._events[e]=[])).push(n),t.test(e)&&(i._hasHookEvent=!0);return i},e.prototype.$once=function(e,t){function n(){r.$off(e,n),t.apply(r,arguments)}var r=this;return n.fn=t,r.$on(e,n),r},e.prototype.$off=function(e,t){var n=this,r=this;if(!arguments.length)return r._events=Object.create(null),r;if(Array.isArray(e)){for(var i=0,o=e.length;i<o;i++)n.$off(e[i],t);return r}var a=r._events[e];if(!a)return r;if(1===arguments.length)return r._events[e]=null,r;if(t)for(var s,c=a.length;c--;)if((s=a[c])===t||s.fn===t){a.splice(c,1);break}return r},e.prototype.$emit=function(e){var t=this,n=t._events[e];if(n){n=n.length>1?m(n):n;for(var r=m(arguments,1),i=0,o=n.length;i<o;i++)try{n[i].apply(t,r)}catch(n){Q(n,t,'event handler for "'+e+'"')}}return t}}(Ot),function(e){e.prototype._update=function(e,t){var n=this;n._isMounted&&je(n,"beforeUpdate");var r=n.$el,i=n._vnode,o=Eo;Eo=n,n._vnode=e,i?n.$el=n.__patch__(i,e):(n.$el=n.__patch__(n.$el,e,t,!1,n.$options._parentElm,n.$options._refElm),n.$options._parentElm=n.$options._refElm=null),Eo=o,r&&(r.__vue__=null),n.$el&&(n.$el.__vue__=n),n.$vnode&&n.$parent&&n.$vnode===n.$parent._vnode&&(n.$parent.$el=n.$el)},e.prototype.$forceUpdate=function(){var e=this;e._watcher&&e._watcher.update()},e.prototype.$destroy=function(){var e=this;if(!e._isBeingDestroyed){je(e,"beforeDestroy"),e._isBeingDestroyed=!0;var t=e.$parent;!t||t._isBeingDestroyed||e.$options.abstract||d(t.$children,e),e._watcher&&e._watcher.teardown();for(var n=e._watchers.length;n--;)e._watchers[n].teardown();e._data.__ob__&&e._data.__ob__.vmCount--,e._isDestroyed=!0,e.__patch__(e._vnode,null),je(e,"destroyed"),e.$off(),e.$el&&(e.$el.__vue__=null),e.$vnode&&(e.$vnode.parent=null)}}}(Ot),function(e){lt(e.prototype),e.prototype.$nextTick=function(e){return re(e,this)},e.prototype._render=function(){var e=this,t=e.$options,n=t.render,r=t._parentVnode;if(e._isMounted)for(var i in e.$slots){var o=e.$slots[i];o._rendered&&(e.$slots[i]=j(o,!0))}e.$scopedSlots=r&&r.data.scopedSlots||Bi,e.$vnode=r;var a;try{a=n.call(e._renderProxy,e.$createElement)}catch(t){Q(t,e,"render"),a=e._vnode}return a instanceof uo||(a=fo()),a.parent=r,a}}(Ot);var qo=[String,RegExp,Array],Wo={KeepAlive:{name:"keep-alive",abstract:!0,props:{include:qo,exclude:qo,max:[String,Number]},created:function(){this.cache=Object.create(null),this.keys=[]},destroyed:function(){var e=this;for(var t in e.cache)Dt(e.cache,t,e.keys)},watch:{include:function(e){Pt(this,function(t){return Mt(e,t)})},exclude:function(e){Pt(this,function(t){return!Mt(e,t)})}},render:function(){var e=ye(this.$slots.default),t=e&&e.componentOptions;if(t){var n=It(t);if(n&&(this.include&&!Mt(this.include,n)||this.exclude&&Mt(this.exclude,n)))return e;var r=this,i=r.cache,o=r.keys,a=null==e.key?t.Ctor.cid+(t.tag?"::"+t.tag:""):e.key;i[a]?(e.componentInstance=i[a].componentInstance,d(o,a),o.push(a)):(i[a]=e,o.push(a),this.max&&o.length>parseInt(this.max)&&Dt(i,o[0],o,this._vnode)),e.data.keepAlive=!0}return e}}};!function(e){var t={};t.get=function(){return Hi},Object.defineProperty(e,"config",t),e.util={warn:oo,extend:y,mergeOptions:J,defineReactive:M},e.set=P,e.delete=D,e.nextTick=re,e.options=Object.create(null),Ri.forEach(function(t){e.options[t+"s"]=Object.create(null)}),e.options._base=e,y(e.options.components,Wo),St(e),Tt(e),Et(e),Nt(e)}(Ot),Object.defineProperty(Ot.prototype,"$isServer",{get:no}),Object.defineProperty(Ot.prototype,"$ssrContext",{get:function(){return this.$vnode&&this.$vnode.ssrContext}}),Ot.version="2.5.2";var Go,Zo,Yo,Qo,Xo,ea,ta,na,ra=f("style,class"),ia=f("input,textarea,option,select,progress"),oa=function(e,t,n){return"value"===n&&ia(e)&&"button"!==t||"selected"===n&&"option"===e||"checked"===n&&"input"===e||"muted"===n&&"video"===e},aa=f("contenteditable,draggable,spellcheck"),sa=f("allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,default,defaultchecked,defaultmuted,defaultselected,defer,disabled,enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,required,reversed,scoped,seamless,selected,sortable,translate,truespeed,typemustmatch,visible"),ca="http://www.w3.org/1999/xlink",ua=function(e){return":"===e.charAt(5)&&"xlink"===e.slice(0,5)},la=function(e){return ua(e)?e.slice(6,e.length):""},fa=function(e){return null==e||!1===e},da={svg:"http://www.w3.org/2000/svg",math:"http://www.w3.org/1998/Math/MathML"},pa=f("html,body,base,head,link,meta,style,title,address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,menuitem,summary,content,element,shadow,template,blockquote,iframe,tfoot"),va=f("svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view",!0),ha=function(e){return pa(e)||va(e)},ma=Object.create(null),ya=f("text,number,password,search,email,tel,url"),ga=Object.freeze({createElement:function(e,t){var n=document.createElement(e);return"select"!==e?n:(t.data&&t.data.attrs&&void 0!==t.data.attrs.multiple&&n.setAttribute("multiple","multiple"),n)},createElementNS:function(e,t){return document.createElementNS(da[e],t)},createTextNode:function(e){return document.createTextNode(e)},createComment:function(e){return document.createComment(e)},insertBefore:function(e,t,n){e.insertBefore(t,n)},removeChild:function(e,t){e.removeChild(t)},appendChild:function(e,t){e.appendChild(t)},parentNode:function(e){return e.parentNode},nextSibling:function(e){return e.nextSibling},tagName:function(e){return e.tagName},setTextContent:function(e,t){e.textContent=t},setAttribute:function(e,t,n){e.setAttribute(t,n)}}),_a={create:function(e,t){qt(t)},update:function(e,t){e.data.ref!==t.data.ref&&(qt(e,!0),qt(t))},destroy:function(e){qt(e,!0)}},ba=new uo("",{},[]),$a=["create","activate","update","remove","destroy"],Ca={create:Yt,update:Yt,destroy:function(e){Yt(e,ba)}},wa=Object.create(null),xa=[_a,Ca],ka={create:nn,update:nn},Aa={create:on,update:on},Oa=/[\w).+\-_$\]]/,Sa="__r",Ta="__c",Ea={create:Ln,update:Ln},ja={create:Nn,update:Nn},La=v(function(e){var t={},n=/;(?![^(]*\))/g,r=/:(.+)/;return e.split(n).forEach(function(e){if(e){var n=e.split(r);n.length>1&&(t[n[0].trim()]=n[1].trim())}}),t}),Na=/^--/,Ia=/\s*!important$/,Ma=function(e,t,n){if(Na.test(t))e.style.setProperty(t,n);else if(Ia.test(n))e.style.setProperty(t,n.replace(Ia,""),"important");else{var r=Da(t);if(Array.isArray(n))for(var i=0,o=n.length;i<o;i++)e.style[r]=n[i];else e.style[r]=n}},Pa=["Webkit","Moz","ms"],Da=v(function(e){if(na=na||document.createElement("div").style,"filter"!==(e=ji(e))&&e in na)return e;for(var t=e.charAt(0).toUpperCase()+e.slice(1),n=0;n<Pa.length;n++){var r=Pa[n]+t;if(r in na)return r}}),Ra={create:Hn,update:Hn},Fa=v(function(e){return{enterClass:e+"-enter",enterToClass:e+"-enter-to",enterActiveClass:e+"-enter-active",leaveClass:e+"-leave",leaveToClass:e+"-leave-to",leaveActiveClass:e+"-leave-active"}}),Ha=zi&&!qi,Ba="transition",Ua="animation",Va="transition",za="transitionend",Ka="animation",Ja="animationend";Ha&&(void 0===window.ontransitionend&&void 0!==window.onwebkittransitionend&&(Va="WebkitTransition",za="webkitTransitionEnd"),void 0===window.onanimationend&&void 0!==window.onwebkitanimationend&&(Ka="WebkitAnimation",Ja="webkitAnimationEnd"));var qa=zi?window.requestAnimationFrame?window.requestAnimationFrame.bind(window):setTimeout:function(e){return e()},Wa=/\b(transform|all)(,|$)/,Ga=function(r){function o(e){return new uo(j.tagName(e).toLowerCase(),{},[],void 0,e)}function a(e,t){function n(){0==--n.listeners&&s(e)}return n.listeners=t,n}function s(e){var n=j.parentNode(e);t(n)&&j.removeChild(n,e)}function c(e,r,i,o,a){if(e.isRootInsert=!a,!u(e,r,i,o)){var s=e.data,c=e.children,l=e.tag;t(l)?(e.elm=e.ns?j.createElementNS(e.ns,l):j.createElement(l,e),y(e),v(e,c,r),t(s)&&m(e,r),p(i,e.elm,o)):n(e.isComment)?(e.elm=j.createComment(e.text),p(i,e.elm,o)):(e.elm=j.createTextNode(e.text),p(i,e.elm,o))}}function u(e,r,i,o){var a=e.data;if(t(a)){var s=t(e.componentInstance)&&a.keepAlive;if(t(a=a.hook)&&t(a=a.init)&&a(e,!1,i,o),t(e.componentInstance))return l(e,r),n(s)&&d(e,r,i,o),!0}}function l(e,n){t(e.data.pendingInsert)&&(n.push.apply(n,e.data.pendingInsert),e.data.pendingInsert=null),e.elm=e.componentInstance.$el,h(e)?(m(e,n),y(e)):(qt(e),n.push(e))}function d(e,n,r,i){for(var o,a=e;a.componentInstance;)if(a=a.componentInstance._vnode,t(o=a.data)&&t(o=o.transition)){for(o=0;o<T.activate.length;++o)T.activate[o](ba,a);n.push(a);break}p(r,e.elm,i)}function p(e,n,r){t(e)&&(t(r)?r.parentNode===e&&j.insertBefore(e,n,r):j.appendChild(e,n))}function v(e,t,n){if(Array.isArray(t))for(var r=0;r<t.length;++r)c(t[r],n,e.elm,null,!0);else i(e.text)&&j.appendChild(e.elm,j.createTextNode(e.text))}function h(e){for(;e.componentInstance;)e=e.componentInstance._vnode;return t(e.tag)}function m(e,n){for(var r=0;r<T.create.length;++r)T.create[r](ba,e);t(O=e.data.hook)&&(t(O.create)&&O.create(ba,e),t(O.insert)&&n.push(e))}function y(e){var n;if(t(n=e.functionalScopeId))j.setAttribute(e.elm,n,"");else for(var r=e;r;)t(n=r.context)&&t(n=n.$options._scopeId)&&j.setAttribute(e.elm,n,""),r=r.parent;t(n=Eo)&&n!==e.context&&n!==e.functionalContext&&t(n=n.$options._scopeId)&&j.setAttribute(e.elm,n,"")}function g(e,t,n,r,i,o){for(;r<=i;++r)c(n[r],o,e,t)}function _(e){var n,r,i=e.data;if(t(i))for(t(n=i.hook)&&t(n=n.destroy)&&n(e),n=0;n<T.destroy.length;++n)T.destroy[n](e);if(t(n=e.children))for(r=0;r<e.children.length;++r)_(e.children[r])}function b(e,n,r,i){for(;r<=i;++r){var o=n[r];t(o)&&(t(o.tag)?($(o),_(o)):s(o.elm))}}function $(e,n){if(t(n)||t(e.data)){var r,i=T.remove.length+1;for(t(n)?n.listeners+=i:n=a(e.elm,i),t(r=e.componentInstance)&&t(r=r._vnode)&&t(r.data)&&$(r,n),r=0;r<T.remove.length;++r)T.remove[r](e,n);t(r=e.data.hook)&&t(r=r.remove)?r(e,n):n()}else s(e.elm)}function C(n,r,i,o,a){for(var s,u,l,f=0,d=0,p=r.length-1,v=r[0],h=r[p],m=i.length-1,y=i[0],_=i[m],$=!a;f<=p&&d<=m;)e(v)?v=r[++f]:e(h)?h=r[--p]:Wt(v,y)?(x(v,y,o),v=r[++f],y=i[++d]):Wt(h,_)?(x(h,_,o),h=r[--p],_=i[--m]):Wt(v,_)?(x(v,_,o),$&&j.insertBefore(n,v.elm,j.nextSibling(h.elm)),v=r[++f],_=i[--m]):Wt(h,y)?(x(h,y,o),$&&j.insertBefore(n,h.elm,v.elm),h=r[--p],y=i[++d]):(e(s)&&(s=Zt(r,f,p)),e(u=t(y.key)?s[y.key]:w(y,r,f,p))?c(y,o,n,v.elm):Wt(l=r[u],y)?(x(l,y,o),r[u]=void 0,$&&j.insertBefore(n,l.elm,v.elm)):c(y,o,n,v.elm),y=i[++d]);f>p?g(n,e(i[m+1])?null:i[m+1].elm,i,d,m,o):d>m&&b(n,r,f,p)}function w(e,n,r,i){for(var o=r;o<i;o++){var a=n[o];if(t(a)&&Wt(e,a))return o}}function x(r,i,o,a){if(r!==i){var s=i.elm=r.elm;if(n(r.isAsyncPlaceholder))t(i.asyncFactory.resolved)?A(r.elm,i,o):i.isAsyncPlaceholder=!0;else if(n(i.isStatic)&&n(r.isStatic)&&i.key===r.key&&(n(i.isCloned)||n(i.isOnce)))i.componentInstance=r.componentInstance;else{var c,u=i.data;t(u)&&t(c=u.hook)&&t(c=c.prepatch)&&c(r,i);var l=r.children,f=i.children;if(t(u)&&h(i)){for(c=0;c<T.update.length;++c)T.update[c](r,i);t(c=u.hook)&&t(c=c.update)&&c(r,i)}e(i.text)?t(l)&&t(f)?l!==f&&C(s,l,f,o,a):t(f)?(t(r.text)&&j.setTextContent(s,""),g(s,null,f,0,f.length-1,o)):t(l)?b(s,l,0,l.length-1):t(r.text)&&j.setTextContent(s,""):r.text!==i.text&&j.setTextContent(s,i.text),t(u)&&t(c=u.hook)&&t(c=c.postpatch)&&c(r,i)}}}function k(e,r,i){if(n(i)&&t(e.parent))e.parent.data.pendingInsert=r;else for(var o=0;o<r.length;++o)r[o].data.hook.insert(r[o])}function A(e,r,i){if(n(r.isComment)&&t(r.asyncFactory))return r.elm=e,r.isAsyncPlaceholder=!0,!0;r.elm=e;var o=r.tag,a=r.data,s=r.children;if(t(a)&&(t(O=a.hook)&&t(O=O.init)&&O(r,!0),t(O=r.componentInstance)))return l(r,i),!0;if(t(o)){if(t(s))if(e.hasChildNodes())if(t(O=a)&&t(O=O.domProps)&&t(O=O.innerHTML)){if(O!==e.innerHTML)return!1}else{for(var c=!0,u=e.firstChild,f=0;f<s.length;f++){if(!u||!A(u,s[f],i)){c=!1;break}u=u.nextSibling}if(!c||u)return!1}else v(r,s,i);if(t(a))for(var d in a)if(!L(d)){m(r,i);break}}else e.data!==r.text&&(e.data=r.text);return!0}var O,S,T={},E=r.modules,j=r.nodeOps;for(O=0;O<$a.length;++O)for(T[$a[O]]=[],S=0;S<E.length;++S)t(E[S][$a[O]])&&T[$a[O]].push(E[S][$a[O]]);var L=f("attrs,style,class,staticClass,staticStyle,key");return function(r,i,a,s,u,l){if(!e(i)){var f=!1,d=[];if(e(r))f=!0,c(i,d,u,l);else{var p=t(r.nodeType);if(!p&&Wt(r,i))x(r,i,d,s);else{if(p){if(1===r.nodeType&&r.hasAttribute(Di)&&(r.removeAttribute(Di),a=!0),n(a)&&A(r,i,d))return k(i,d,!0),r;r=o(r)}var v=r.elm,m=j.parentNode(v);if(c(i,d,v._leaveCb?null:m,j.nextSibling(v)),t(i.parent))for(var y=i.parent,g=h(i);y;){for(var $=0;$<T.destroy.length;++$)T.destroy[$](y);if(y.elm=i.elm,g){for(var C=0;C<T.create.length;++C)T.create[C](ba,y);var w=y.data.hook.insert;if(w.merged)for(var O=1;O<w.fns.length;O++)w.fns[O]()}else qt(y);y=y.parent}t(m)?b(m,[r],0,0):t(r.tag)&&_(r)}}return k(i,d,f),i.elm}t(r)&&_(r)}}({nodeOps:ga,modules:[ka,Aa,Ea,ja,Ra,zi?{create:tr,activate:tr,remove:function(e,t){!0!==e.data.show?Qn(e,t):t()}}:{}].concat(xa)});qi&&document.addEventListener("selectionchange",function(){var e=document.activeElement;e&&e.vmodel&&cr(e,"input")});var Za={model:{inserted:function(e,t,n){"select"===n.tag?(nr(e,t,n.context),e._vOptions=[].map.call(e.options,or)):("textarea"===n.tag||ya(e.type))&&(e._vModifiers=t.modifiers,t.modifiers.lazy||(e.addEventListener("change",sr),Gi||(e.addEventListener("compositionstart",ar),e.addEventListener("compositionend",sr)),qi&&(e.vmodel=!0)))},componentUpdated:function(e,t,n){if("select"===n.tag){nr(e,t,n.context);var r=e._vOptions,i=e._vOptions=[].map.call(e.options,or);i.some(function(e,t){return!b(e,r[t])})&&(e.multiple?t.value.some(function(e){return ir(e,i)}):t.value!==t.oldValue&&ir(t.value,i))&&cr(e,"change")}}},show:{bind:function(e,t,n){var r=t.value,i=(n=ur(n)).data&&n.data.transition,o=e.__vOriginalDisplay="none"===e.style.display?"":e.style.display;r&&i?(n.data.show=!0,Yn(n,function(){e.style.display=o})):e.style.display=r?o:"none"},update:function(e,t,n){var r=t.value;r!==t.oldValue&&((n=ur(n)).data&&n.data.transition?(n.data.show=!0,r?Yn(n,function(){e.style.display=e.__vOriginalDisplay}):Qn(n,function(){e.style.display="none"})):e.style.display=r?e.__vOriginalDisplay:"none")},unbind:function(e,t,n,r,i){i||(e.style.display=e.__vOriginalDisplay)}}},Ya={name:String,appear:Boolean,css:Boolean,mode:String,type:String,enterClass:String,leaveClass:String,enterToClass:String,leaveToClass:String,enterActiveClass:String,leaveActiveClass:String,appearClass:String,appearActiveClass:String,appearToClass:String,duration:[Number,String,Object]},Qa={name:"transition",props:Ya,abstract:!0,render:function(e){var t=this,n=this.$options._renderChildren;if(n&&(n=n.filter(function(e){return e.tag||me(e)})).length){var r=this.mode,o=n[0];if(pr(this.$vnode))return o;var a=lr(o);if(!a)return o;if(this._leaving)return dr(e,o);var s="__transition-"+this._uid+"-";a.key=null==a.key?a.isComment?s+"comment":s+a.tag:i(a.key)?0===String(a.key).indexOf(s)?a.key:s+a.key:a.key;var c=(a.data||(a.data={})).transition=fr(this),u=this._vnode,l=lr(u);if(a.data.directives&&a.data.directives.some(function(e){return"show"===e.name})&&(a.data.show=!0),l&&l.data&&!vr(a,l)&&!me(l)){var f=l.data.transition=y({},c);if("out-in"===r)return this._leaving=!0,ae(f,"afterLeave",function(){t._leaving=!1,t.$forceUpdate()}),dr(e,o);if("in-out"===r){if(me(a))return u;var d,p=function(){d()};ae(c,"afterEnter",p),ae(c,"enterCancelled",p),ae(f,"delayLeave",function(e){d=e})}}return o}}},Xa=y({tag:String,moveClass:String},Ya);delete Xa.mode;var es={Transition:Qa,TransitionGroup:{props:Xa,render:function(e){for(var t=this.tag||this.$vnode.data.tag||"span",n=Object.create(null),r=this.prevChildren=this.children,i=this.$slots.default||[],o=this.children=[],a=fr(this),s=0;s<i.length;s++){var c=i[s];c.tag&&null!=c.key&&0!==String(c.key).indexOf("__vlist")&&(o.push(c),n[c.key]=c,(c.data||(c.data={})).transition=a)}if(r){for(var u=[],l=[],f=0;f<r.length;f++){var d=r[f];d.data.transition=a,d.data.pos=d.elm.getBoundingClientRect(),n[d.key]?u.push(d):l.push(d)}this.kept=e(t,null,u),this.removed=l}return e(t,null,o)},beforeUpdate:function(){this.__patch__(this._vnode,this.kept,!1,!0),this._vnode=this.kept},updated:function(){var e=this.prevChildren,t=this.moveClass||(this.name||"v")+"-move";e.length&&this.hasMove(e[0].elm,t)&&(e.forEach(hr),e.forEach(mr),e.forEach(yr),this._reflow=document.body.offsetHeight,e.forEach(function(e){if(e.data.moved){var n=e.elm,r=n.style;Kn(n,t),r.transform=r.WebkitTransform=r.transitionDuration="",n.addEventListener(za,n._moveCb=function e(r){r&&!/transform$/.test(r.propertyName)||(n.removeEventListener(za,e),n._moveCb=null,Jn(n,t))})}}))},methods:{hasMove:function(e,t){if(!Ha)return!1;if(this._hasMove)return this._hasMove;var n=e.cloneNode();e._transitionClasses&&e._transitionClasses.forEach(function(e){Un(n,e)}),Bn(n,t),n.style.display="none",this.$el.appendChild(n);var r=Wn(n);return this.$el.removeChild(n),this._hasMove=r.hasTransform}}}};Ot.config.mustUseProp=oa,Ot.config.isReservedTag=ha,Ot.config.isReservedAttr=ra,Ot.config.getTagNamespace=Kt,Ot.config.isUnknownElement=function(e){if(!zi)return!0;if(ha(e))return!1;if(e=e.toLowerCase(),null!=ma[e])return ma[e];var t=document.createElement(e);return e.indexOf("-")>-1?ma[e]=t.constructor===window.HTMLUnknownElement||t.constructor===window.HTMLElement:ma[e]=/HTMLUnknownElement/.test(t.toString())},y(Ot.options.directives,Za),y(Ot.options.components,es),Ot.prototype.__patch__=zi?Ga:_,Ot.prototype.$mount=function(e,t){return e=e&&zi?Jt(e):void 0,Ae(this,e,t)},Ot.nextTick(function(){Hi.devtools&&ro&&ro.emit("init",Ot)},0);var ts,ns=!!zi&&function(e,t){var n=document.createElement("div");return n.innerHTML='<div a="'+e+'"/>',n.innerHTML.indexOf(t)>0}("\n","&#10;"),rs=/\{\{((?:.|\n)+?)\}\}/g,is=/[-.*+?^${}()|[\]\/\\]/g,os=v(function(e){var t=e[0].replace(is,"\\$&"),n=e[1].replace(is,"\\$&");return new RegExp(t+"((?:.|\\n)+?)"+n,"g")}),as={staticKeys:["staticClass"],transformNode:function(e,t){t.warn;var n=hn(e,"class");n&&(e.staticClass=JSON.stringify(n));var r=vn(e,"class",!1);r&&(e.classBinding=r)},genData:function(e){var t="";return e.staticClass&&(t+="staticClass:"+e.staticClass+","),e.classBinding&&(t+="class:"+e.classBinding+","),t}},ss={staticKeys:["staticStyle"],transformNode:function(e,t){var n=hn(e,"style");n&&(e.staticStyle=JSON.stringify(La(n)));var r=vn(e,"style",!1);r&&(e.styleBinding=r)},genData:function(e){var t="";return e.staticStyle&&(t+="staticStyle:"+e.staticStyle+","),e.styleBinding&&(t+="style:("+e.styleBinding+"),"),t}},cs={decode:function(e){return ts=ts||document.createElement("div"),ts.innerHTML=e,ts.textContent}},us=f("area,base,br,col,embed,frame,hr,img,input,isindex,keygen,link,meta,param,source,track,wbr"),ls=f("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source"),fs=f("address,article,aside,base,blockquote,body,caption,col,colgroup,dd,details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,title,tr,track"),ds=/^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/,ps="[a-zA-Z_][\\w\\-\\.]*",vs="((?:"+ps+"\\:)?"+ps+")",hs=new RegExp("^<"+vs),ms=/^\s*(\/?)>/,ys=new RegExp("^<\\/"+vs+"[^>]*>"),gs=/^<!DOCTYPE [^>]+>/i,_s=/^<!--/,bs=/^<!\[/,$s=!1;"x".replace(/x(.)?/g,function(e,t){$s=""===t});var Cs,ws,xs,ks,As,Os,Ss,Ts,Es,js,Ls=f("script,style,textarea",!0),Ns={},Is={"&lt;":"<","&gt;":">","&quot;":'"',"&amp;":"&","&#10;":"\n"},Ms=/&(?:lt|gt|quot|amp);/g,Ps=/&(?:lt|gt|quot|amp|#10);/g,Ds=f("pre,textarea",!0),Rs=function(e,t){return e&&Ds(e)&&"\n"===t[0]},Fs=/^@|^v-on:/,Hs=/^v-|^@|^:/,Bs=/(.*?)\s+(?:in|of)\s+(.*)/,Us=/\((\{[^}]*\}|[^,]*),([^,]*)(?:,([^,]*))?\)/,Vs=/:(.*)$/,zs=/^:|^v-bind:/,Ks=/\.[^.]+/g,Js=v(cs.decode),qs=/^xmlns:NS\d+/,Ws=/^NS\d+:/,Gs=[as,ss,{preTransformNode:function(e,t){if("input"===e.tag){var n=e.attrsMap;if(n["v-model"]&&(n["v-bind:type"]||n[":type"])){var r=vn(e,"type"),i=hn(e,"v-if",!0),o=i?"&&("+i+")":"",a=Vr(e);Sr(a),zr(a,"type","checkbox"),kr(a,t),a.processed=!0,a.if="("+r+")==='checkbox'"+o,Lr(a,{exp:a.if,block:a});var s=Vr(e);hn(s,"v-for",!0),zr(s,"type","radio"),kr(s,t),Lr(a,{exp:"("+r+")==='radio'"+o,block:s});var c=Vr(e);return hn(c,"v-for",!0),zr(c,":type",r),kr(c,t),Lr(a,{exp:i,block:c}),a}}}}],Zs={expectHTML:!0,modules:Gs,directives:{model:function(e,t,n){var r=t.value,i=t.modifiers,o=e.tag,a=e.attrsMap.type;if(e.component)return mn(e,r,i),!1;if("select"===o)An(e,r,i);else if("input"===o&&"checkbox"===a)xn(e,r,i);else if("input"===o&&"radio"===a)kn(e,r,i);else if("input"===o||"textarea"===o)On(e,r,i);else if(!Hi.isReservedTag(o))return mn(e,r,i),!1;return!0},text:function(e,t){t.value&&ln(e,"textContent","_s("+t.value+")")},html:function(e,t){t.value&&ln(e,"innerHTML","_s("+t.value+")")}},isPreTag:function(e){return"pre"===e},isUnaryTag:us,mustUseProp:oa,canBeLeftOpenTag:ls,isReservedTag:ha,getTagNamespace:Kt,staticKeys:function(e){return e.reduce(function(e,t){return e.concat(t.staticKeys||[])},[]).join(",")}(Gs)},Ys=v(function(e){return f("type,tag,attrsList,attrsMap,plain,parent,children,attrs"+(e?","+e:""))}),Qs=/^\s*([\w$_]+|\([^)]*?\))\s*=>|^function\s*\(/,Xs=/^\s*[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['.*?']|\[".*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*\s*$/,ec={esc:27,tab:9,enter:13,space:32,up:38,left:37,right:39,down:40,delete:[8,46]},tc=function(e){return"if("+e+")return null;"},nc={stop:"$event.stopPropagation();",prevent:"$event.preventDefault();",self:tc("$event.target !== $event.currentTarget"),ctrl:tc("!$event.ctrlKey"),shift:tc("!$event.shiftKey"),alt:tc("!$event.altKey"),meta:tc("!$event.metaKey"),left:tc("'button' in $event && $event.button !== 0"),middle:tc("'button' in $event && $event.button !== 1"),right:tc("'button' in $event && $event.button !== 2")},rc={on:function(e,t){e.wrapListeners=function(e){return"_g("+e+","+t.value+")"}},bind:function(e,t){e.wrapData=function(n){return"_b("+n+",'"+e.tag+"',"+t.value+","+(t.modifiers&&t.modifiers.prop?"true":"false")+(t.modifiers&&t.modifiers.sync?",true":"")+")"}},cloak:_},ic=function(e){this.options=e,this.warn=e.warn||cn,this.transforms=un(e.modules,"transformCode"),this.dataGenFns=un(e.modules,"genData"),this.directives=y(y({},rc),e.directives);var t=e.isReservedTag||Mi;this.maybeComponent=function(e){return!t(e.tag)},this.onceId=0,this.staticRenderFns=[]},oc=(new RegExp("\\b"+"do,if,for,let,new,try,var,case,else,with,await,break,catch,class,const,super,throw,while,yield,delete,export,import,return,switch,default,extends,finally,continue,debugger,function,arguments".split(",").join("\\b|\\b")+"\\b"),new RegExp("\\b"+"delete,typeof,void".split(",").join("\\s*\\([^\\)]*\\)|\\b")+"\\s*\\([^\\)]*\\)"),function(e){return function(t){function n(n,r){var i=Object.create(t),o=[],a=[];if(i.warn=function(e,t){(t?a:o).push(e)},r){r.modules&&(i.modules=(t.modules||[]).concat(r.modules)),r.directives&&(i.directives=y(Object.create(t.directives),r.directives));for(var s in r)"modules"!==s&&"directives"!==s&&(i[s]=r[s])}var c=e(n,i);return c.errors=o,c.tips=a,c}return{compile:n,compileToFunctions:xi(n)}}}(function(e,t){var n=Cr(e.trim(),t);Kr(n,t);var r=ei(n,t);return{ast:n,render:r.render,staticRenderFns:r.staticRenderFns}})(Zs).compileToFunctions),ac=v(function(e){var t=Jt(e);return t&&t.innerHTML}),sc=Ot.prototype.$mount;return Ot.prototype.$mount=function(e,t){if((e=e&&Jt(e))===document.body||e===document.documentElement)return this;var n=this.$options;if(!n.render){var r=n.template;if(r)if("string"==typeof r)"#"===r.charAt(0)&&(r=ac(r));else{if(!r.nodeType)return this;r=r.innerHTML}else e&&(r=ki(e));if(r){var i=oc(r,{shouldDecodeNewlines:ns,delimiters:n.delimiters,comments:n.comments},this),o=i.render,a=i.staticRenderFns;n.render=o,n.staticRenderFns=a}}return sc.call(this,e,t)},Ot.compile=oc,Ot});
  // END C:\git\camlsql-js\src\app\js\vendor\vue\vue.min.js

  // BEGIN C:\git\camlsql-js\src\app\js\vendor\vue-router\vue-router.js*/
  /**
    * vue-router v3.0.1
    * (c) 2017 Evan You
    * @license MIT
    */
  (function (global, factory) {
  	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  	typeof define === 'function' && define.amd ? define(factory) :
  	(global.VueRouter = factory());
  }(this, (function () { 'use strict';

  /*  */

  function assert (condition, message) {
    if (!condition) {
      throw new Error(("[vue-router] " + message))
    }
  }

  function warn (condition, message) {
    if ("development" !== 'production' && !condition) {
      typeof console !== 'undefined' && console.warn(("[vue-router] " + message));
    }
  }

  function isError (err) {
    return Object.prototype.toString.call(err).indexOf('Error') > -1
  }

  var View = {
    name: 'router-view',
    functional: true,
    props: {
      name: {
        type: String,
        default: 'default'
      }
    },
    render: function render (_, ref) {
      var props = ref.props;
      var children = ref.children;
      var parent = ref.parent;
      var data = ref.data;

      data.routerView = true;

      // directly use parent context's createElement() function
      // so that components rendered by router-view can resolve named slots
      var h = parent.$createElement;
      var name = props.name;
      var route = parent.$route;
      var cache = parent._routerViewCache || (parent._routerViewCache = {});

      // determine current view depth, also check to see if the tree
      // has been toggled inactive but kept-alive.
      var depth = 0;
      var inactive = false;
      while (parent && parent._routerRoot !== parent) {
        if (parent.$vnode && parent.$vnode.data.routerView) {
          depth++;
        }
        if (parent._inactive) {
          inactive = true;
        }
        parent = parent.$parent;
      }
      data.routerViewDepth = depth;

      // render previous view if the tree is inactive and kept-alive
      if (inactive) {
        return h(cache[name], data, children)
      }

      var matched = route.matched[depth];
      // render empty node if no matched route
      if (!matched) {
        cache[name] = null;
        return h()
      }

      var component = cache[name] = matched.components[name];

      // attach instance registration hook
      // this will be called in the instance's injected lifecycle hooks
      data.registerRouteInstance = function (vm, val) {
        // val could be undefined for unregistration
        var current = matched.instances[name];
        if (
          (val && current !== vm) ||
          (!val && current === vm)
        ) {
          matched.instances[name] = val;
        }
      }

      // also register instance in prepatch hook
      // in case the same component instance is reused across different routes
      ;(data.hook || (data.hook = {})).prepatch = function (_, vnode) {
        matched.instances[name] = vnode.componentInstance;
      };

      // resolve props
      var propsToPass = data.props = resolveProps(route, matched.props && matched.props[name]);
      if (propsToPass) {
        // clone to prevent mutation
        propsToPass = data.props = extend({}, propsToPass);
        // pass non-declared props as attrs
        var attrs = data.attrs = data.attrs || {};
        for (var key in propsToPass) {
          if (!component.props || !(key in component.props)) {
            attrs[key] = propsToPass[key];
            delete propsToPass[key];
          }
        }
      }

      return h(component, data, children)
    }
  };

  function resolveProps (route, config) {
    switch (typeof config) {
      case 'undefined':
        return
      case 'object':
        return config
      case 'function':
        return config(route)
      case 'boolean':
        return config ? route.params : undefined
      default:
        {
          warn(
            false,
            "props in \"" + (route.path) + "\" is a " + (typeof config) + ", " +
            "expecting an object, function or boolean."
          );
        }
    }
  }

  function extend (to, from) {
    for (var key in from) {
      to[key] = from[key];
    }
    return to
  }

  /*  */

  var encodeReserveRE = /[!'()*]/g;
  var encodeReserveReplacer = function (c) { return '%' + c.charCodeAt(0).toString(16); };
  var commaRE = /%2C/g;

  // fixed encodeURIComponent which is more conformant to RFC3986:
  // - escapes [!'()*]
  // - preserve commas
  var encode = function (str) { return encodeURIComponent(str)
    .replace(encodeReserveRE, encodeReserveReplacer)
    .replace(commaRE, ','); };

  var decode = decodeURIComponent;

  function resolveQuery (
    query,
    extraQuery,
    _parseQuery
  ) {
    if ( extraQuery === void 0 ) extraQuery = {};

    var parse = _parseQuery || parseQuery;
    var parsedQuery;
    try {
      parsedQuery = parse(query || '');
    } catch (e) {
      "development" !== 'production' && warn(false, e.message);
      parsedQuery = {};
    }
    for (var key in extraQuery) {
      parsedQuery[key] = extraQuery[key];
    }
    return parsedQuery
  }

  function parseQuery (query) {
    var res = {};

    query = query.trim().replace(/^(\?|#|&)/, '');

    if (!query) {
      return res
    }

    query.split('&').forEach(function (param) {
      var parts = param.replace(/\+/g, ' ').split('=');
      var key = decode(parts.shift());
      var val = parts.length > 0
        ? decode(parts.join('='))
        : null;

      if (res[key] === undefined) {
        res[key] = val;
      } else if (Array.isArray(res[key])) {
        res[key].push(val);
      } else {
        res[key] = [res[key], val];
      }
    });

    return res
  }

  function stringifyQuery (obj) {
    var res = obj ? Object.keys(obj).map(function (key) {
      var val = obj[key];

      if (val === undefined) {
        return ''
      }

      if (val === null) {
        return encode(key)
      }

      if (Array.isArray(val)) {
        var result = [];
        val.forEach(function (val2) {
          if (val2 === undefined) {
            return
          }
          if (val2 === null) {
            result.push(encode(key));
          } else {
            result.push(encode(key) + '=' + encode(val2));
          }
        });
        return result.join('&')
      }

      return encode(key) + '=' + encode(val)
    }).filter(function (x) { return x.length > 0; }).join('&') : null;
    return res ? ("?" + res) : ''
  }

  /*  */


  var trailingSlashRE = /\/?$/;

  function createRoute (
    record,
    location,
    redirectedFrom,
    router
  ) {
    var stringifyQuery$$1 = router && router.options.stringifyQuery;

    var query = location.query || {};
    try {
      query = clone(query);
    } catch (e) {}

    var route = {
      name: location.name || (record && record.name),
      meta: (record && record.meta) || {},
      path: location.path || '/',
      hash: location.hash || '',
      query: query,
      params: location.params || {},
      fullPath: getFullPath(location, stringifyQuery$$1),
      matched: record ? formatMatch(record) : []
    };
    if (redirectedFrom) {
      route.redirectedFrom = getFullPath(redirectedFrom, stringifyQuery$$1);
    }
    return Object.freeze(route)
  }

  function clone (value) {
    if (Array.isArray(value)) {
      return value.map(clone)
    } else if (value && typeof value === 'object') {
      var res = {};
      for (var key in value) {
        res[key] = clone(value[key]);
      }
      return res
    } else {
      return value
    }
  }

  // the starting route that represents the initial state
  var START = createRoute(null, {
    path: '/'
  });

  function formatMatch (record) {
    var res = [];
    while (record) {
      res.unshift(record);
      record = record.parent;
    }
    return res
  }

  function getFullPath (
    ref,
    _stringifyQuery
  ) {
    var path = ref.path;
    var query = ref.query; if ( query === void 0 ) query = {};
    var hash = ref.hash; if ( hash === void 0 ) hash = '';

    var stringify = _stringifyQuery || stringifyQuery;
    return (path || '/') + stringify(query) + hash
  }

  function isSameRoute (a, b) {
    if (b === START) {
      return a === b
    } else if (!b) {
      return false
    } else if (a.path && b.path) {
      return (
        a.path.replace(trailingSlashRE, '') === b.path.replace(trailingSlashRE, '') &&
        a.hash === b.hash &&
        isObjectEqual(a.query, b.query)
      )
    } else if (a.name && b.name) {
      return (
        a.name === b.name &&
        a.hash === b.hash &&
        isObjectEqual(a.query, b.query) &&
        isObjectEqual(a.params, b.params)
      )
    } else {
      return false
    }
  }

  function isObjectEqual (a, b) {
    if ( a === void 0 ) a = {};
    if ( b === void 0 ) b = {};

    // handle null value #1566
    if (!a || !b) { return a === b }
    var aKeys = Object.keys(a);
    var bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) {
      return false
    }
    return aKeys.every(function (key) {
      var aVal = a[key];
      var bVal = b[key];
      // check nested equality
      if (typeof aVal === 'object' && typeof bVal === 'object') {
        return isObjectEqual(aVal, bVal)
      }
      return String(aVal) === String(bVal)
    })
  }

  function isIncludedRoute (current, target) {
    return (
      current.path.replace(trailingSlashRE, '/').indexOf(
        target.path.replace(trailingSlashRE, '/')
      ) === 0 &&
      (!target.hash || current.hash === target.hash) &&
      queryIncludes(current.query, target.query)
    )
  }

  function queryIncludes (current, target) {
    for (var key in target) {
      if (!(key in current)) {
        return false
      }
    }
    return true
  }

  /*  */

  // work around weird flow bug
  var toTypes = [String, Object];
  var eventTypes = [String, Array];

  var Link = {
    name: 'router-link',
    props: {
      to: {
        type: toTypes,
        required: true
      },
      tag: {
        type: String,
        default: 'a'
      },
      exact: Boolean,
      append: Boolean,
      replace: Boolean,
      activeClass: String,
      exactActiveClass: String,
      event: {
        type: eventTypes,
        default: 'click'
      }
    },
    render: function render (h) {
      var this$1 = this;

      var router = this.$router;
      var current = this.$route;
      var ref = router.resolve(this.to, current, this.append);
      var location = ref.location;
      var route = ref.route;
      var href = ref.href;

      var classes = {};
      var globalActiveClass = router.options.linkActiveClass;
      var globalExactActiveClass = router.options.linkExactActiveClass;
      // Support global empty active class
      var activeClassFallback = globalActiveClass == null
              ? 'router-link-active'
              : globalActiveClass;
      var exactActiveClassFallback = globalExactActiveClass == null
              ? 'router-link-exact-active'
              : globalExactActiveClass;
      var activeClass = this.activeClass == null
              ? activeClassFallback
              : this.activeClass;
      var exactActiveClass = this.exactActiveClass == null
              ? exactActiveClassFallback
              : this.exactActiveClass;
      var compareTarget = location.path
        ? createRoute(null, location, null, router)
        : route;

      classes[exactActiveClass] = isSameRoute(current, compareTarget);
      classes[activeClass] = this.exact
        ? classes[exactActiveClass]
        : isIncludedRoute(current, compareTarget);

      var handler = function (e) {
        if (guardEvent(e)) {
          if (this$1.replace) {
            router.replace(location);
          } else {
            router.push(location);
          }
        }
      };

      var on = { click: guardEvent };
      if (Array.isArray(this.event)) {
        this.event.forEach(function (e) { on[e] = handler; });
      } else {
        on[this.event] = handler;
      }

      var data = {
        class: classes
      };

      if (this.tag === 'a') {
        data.on = on;
        data.attrs = { href: href };
      } else {
        // find the first <a> child and apply listener and href
        var a = findAnchor(this.$slots.default);
        if (a) {
          // in case the <a> is a static node
          a.isStatic = false;
          var extend = _Vue.util.extend;
          var aData = a.data = extend({}, a.data);
          aData.on = on;
          var aAttrs = a.data.attrs = extend({}, a.data.attrs);
          aAttrs.href = href;
        } else {
          // doesn't have <a> child, apply listener to self
          data.on = on;
        }
      }

      return h(this.tag, data, this.$slots.default)
    }
  };

  function guardEvent (e) {
    // don't redirect with control keys
    if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey) { return }
    // don't redirect when preventDefault called
    if (e.defaultPrevented) { return }
    // don't redirect on right click
    if (e.button !== undefined && e.button !== 0) { return }
    // don't redirect if `target="_blank"`
    if (e.currentTarget && e.currentTarget.getAttribute) {
      var target = e.currentTarget.getAttribute('target');
      if (/\b_blank\b/i.test(target)) { return }
    }
    // this may be a Weex event which doesn't have this method
    if (e.preventDefault) {
      e.preventDefault();
    }
    return true
  }

  function findAnchor (children) {
    if (children) {
      var child;
      for (var i = 0; i < children.length; i++) {
        child = children[i];
        if (child.tag === 'a') {
          return child
        }
        if (child.children && (child = findAnchor(child.children))) {
          return child
        }
      }
    }
  }

  var _Vue;

  function install (Vue) {
    if (install.installed && _Vue === Vue) { return }
    install.installed = true;

    _Vue = Vue;

    var isDef = function (v) { return v !== undefined; };

    var registerInstance = function (vm, callVal) {
      var i = vm.$options._parentVnode;
      if (isDef(i) && isDef(i = i.data) && isDef(i = i.registerRouteInstance)) {
        i(vm, callVal);
      }
    };

    Vue.mixin({
      beforeCreate: function beforeCreate () {
        if (isDef(this.$options.router)) {
          this._routerRoot = this;
          this._router = this.$options.router;
          this._router.init(this);
          Vue.util.defineReactive(this, '_route', this._router.history.current);
        } else {
          this._routerRoot = (this.$parent && this.$parent._routerRoot) || this;
        }
        registerInstance(this, this);
      },
      destroyed: function destroyed () {
        registerInstance(this);
      }
    });

    Object.defineProperty(Vue.prototype, '$router', {
      get: function get () { return this._routerRoot._router }
    });

    Object.defineProperty(Vue.prototype, '$route', {
      get: function get () { return this._routerRoot._route }
    });

    Vue.component('router-view', View);
    Vue.component('router-link', Link);

    var strats = Vue.config.optionMergeStrategies;
    // use the same hook merging strategy for route hooks
    strats.beforeRouteEnter = strats.beforeRouteLeave = strats.beforeRouteUpdate = strats.created;
  }

  /*  */

  var inBrowser = typeof window !== 'undefined';

  /*  */

  function resolvePath (
    relative,
    base,
    append
  ) {
    var firstChar = relative.charAt(0);
    if (firstChar === '/') {
      return relative
    }

    if (firstChar === '?' || firstChar === '#') {
      return base + relative
    }

    var stack = base.split('/');

    // remove trailing segment if:
    // - not appending
    // - appending to trailing slash (last segment is empty)
    if (!append || !stack[stack.length - 1]) {
      stack.pop();
    }

    // resolve relative path
    var segments = relative.replace(/^\//, '').split('/');
    for (var i = 0; i < segments.length; i++) {
      var segment = segments[i];
      if (segment === '..') {
        stack.pop();
      } else if (segment !== '.') {
        stack.push(segment);
      }
    }

    // ensure leading slash
    if (stack[0] !== '') {
      stack.unshift('');
    }

    return stack.join('/')
  }

  function parsePath (path) {
    var hash = '';
    var query = '';

    var hashIndex = path.indexOf('#');
    if (hashIndex >= 0) {
      hash = path.slice(hashIndex);
      path = path.slice(0, hashIndex);
    }

    var queryIndex = path.indexOf('?');
    if (queryIndex >= 0) {
      query = path.slice(queryIndex + 1);
      path = path.slice(0, queryIndex);
    }

    return {
      path: path,
      query: query,
      hash: hash
    }
  }

  function cleanPath (path) {
    return path.replace(/\/\//g, '/')
  }

  var isarray = Array.isArray || function (arr) {
    return Object.prototype.toString.call(arr) == '[object Array]';
  };

  /**
   * Expose `pathToRegexp`.
   */
  var pathToRegexp_1 = pathToRegexp;
  var parse_1 = parse;
  var compile_1 = compile;
  var tokensToFunction_1 = tokensToFunction;
  var tokensToRegExp_1 = tokensToRegExp;

  /**
   * The main path matching regexp utility.
   *
   * @type {RegExp}
   */
  var PATH_REGEXP = new RegExp([
    // Match escaped characters that would otherwise appear in future matches.
    // This allows the user to escape special characters that won't transform.
    '(\\\\.)',
    // Match Express-style parameters and un-named parameters with a prefix
    // and optional suffixes. Matches appear as:
    //
    // "/:test(\\d+)?" => ["/", "test", "\d+", undefined, "?", undefined]
    // "/route(\\d+)"  => [undefined, undefined, undefined, "\d+", undefined, undefined]
    // "/*"            => ["/", undefined, undefined, undefined, undefined, "*"]
    '([\\/.])?(?:(?:\\:(\\w+)(?:\\(((?:\\\\.|[^\\\\()])+)\\))?|\\(((?:\\\\.|[^\\\\()])+)\\))([+*?])?|(\\*))'
  ].join('|'), 'g');

  /**
   * Parse a string for the raw tokens.
   *
   * @param  {string}  str
   * @param  {Object=} options
   * @return {!Array}
   */
  function parse (str, options) {
    var tokens = [];
    var key = 0;
    var index = 0;
    var path = '';
    var defaultDelimiter = options && options.delimiter || '/';
    var res;

    while ((res = PATH_REGEXP.exec(str)) != null) {
      var m = res[0];
      var escaped = res[1];
      var offset = res.index;
      path += str.slice(index, offset);
      index = offset + m.length;

      // Ignore already escaped sequences.
      if (escaped) {
        path += escaped[1];
        continue
      }

      var next = str[index];
      var prefix = res[2];
      var name = res[3];
      var capture = res[4];
      var group = res[5];
      var modifier = res[6];
      var asterisk = res[7];

      // Push the current path onto the tokens.
      if (path) {
        tokens.push(path);
        path = '';
      }

      var partial = prefix != null && next != null && next !== prefix;
      var repeat = modifier === '+' || modifier === '*';
      var optional = modifier === '?' || modifier === '*';
      var delimiter = res[2] || defaultDelimiter;
      var pattern = capture || group;

      tokens.push({
        name: name || key++,
        prefix: prefix || '',
        delimiter: delimiter,
        optional: optional,
        repeat: repeat,
        partial: partial,
        asterisk: !!asterisk,
        pattern: pattern ? escapeGroup(pattern) : (asterisk ? '.*' : '[^' + escapeString(delimiter) + ']+?')
      });
    }

    // Match any characters still remaining.
    if (index < str.length) {
      path += str.substr(index);
    }

    // If the path exists, push it onto the end.
    if (path) {
      tokens.push(path);
    }

    return tokens
  }

  /**
   * Compile a string to a template function for the path.
   *
   * @param  {string}             str
   * @param  {Object=}            options
   * @return {!function(Object=, Object=)}
   */
  function compile (str, options) {
    return tokensToFunction(parse(str, options))
  }

  /**
   * Prettier encoding of URI path segments.
   *
   * @param  {string}
   * @return {string}
   */
  function encodeURIComponentPretty (str) {
    return encodeURI(str).replace(/[\/?#]/g, function (c) {
      return '%' + c.charCodeAt(0).toString(16).toUpperCase()
    })
  }

  /**
   * Encode the asterisk parameter. Similar to `pretty`, but allows slashes.
   *
   * @param  {string}
   * @return {string}
   */
  function encodeAsterisk (str) {
    return encodeURI(str).replace(/[?#]/g, function (c) {
      return '%' + c.charCodeAt(0).toString(16).toUpperCase()
    })
  }

  /**
   * Expose a method for transforming tokens into the path function.
   */
  function tokensToFunction (tokens) {
    // Compile all the tokens into regexps.
    var matches = new Array(tokens.length);

    // Compile all the patterns before compilation.
    for (var i = 0; i < tokens.length; i++) {
      if (typeof tokens[i] === 'object') {
        matches[i] = new RegExp('^(?:' + tokens[i].pattern + ')$');
      }
    }

    return function (obj, opts) {
      var path = '';
      var data = obj || {};
      var options = opts || {};
      var encode = options.pretty ? encodeURIComponentPretty : encodeURIComponent;

      for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];

        if (typeof token === 'string') {
          path += token;

          continue
        }

        var value = data[token.name];
        var segment;

        if (value == null) {
          if (token.optional) {
            // Prepend partial segment prefixes.
            if (token.partial) {
              path += token.prefix;
            }

            continue
          } else {
            throw new TypeError('Expected "' + token.name + '" to be defined')
          }
        }

        if (isarray(value)) {
          if (!token.repeat) {
            throw new TypeError('Expected "' + token.name + '" to not repeat, but received `' + JSON.stringify(value) + '`')
          }

          if (value.length === 0) {
            if (token.optional) {
              continue
            } else {
              throw new TypeError('Expected "' + token.name + '" to not be empty')
            }
          }

          for (var j = 0; j < value.length; j++) {
            segment = encode(value[j]);

            if (!matches[i].test(segment)) {
              throw new TypeError('Expected all "' + token.name + '" to match "' + token.pattern + '", but received `' + JSON.stringify(segment) + '`')
            }

            path += (j === 0 ? token.prefix : token.delimiter) + segment;
          }

          continue
        }

        segment = token.asterisk ? encodeAsterisk(value) : encode(value);

        if (!matches[i].test(segment)) {
          throw new TypeError('Expected "' + token.name + '" to match "' + token.pattern + '", but received "' + segment + '"')
        }

        path += token.prefix + segment;
      }

      return path
    }
  }

  /**
   * Escape a regular expression string.
   *
   * @param  {string} str
   * @return {string}
   */
  function escapeString (str) {
    return str.replace(/([.+*?=^!:${}()[\]|\/\\])/g, '\\$1')
  }

  /**
   * Escape the capturing group by escaping special characters and meaning.
   *
   * @param  {string} group
   * @return {string}
   */
  function escapeGroup (group) {
    return group.replace(/([=!:$\/()])/g, '\\$1')
  }

  /**
   * Attach the keys as a property of the regexp.
   *
   * @param  {!RegExp} re
   * @param  {Array}   keys
   * @return {!RegExp}
   */
  function attachKeys (re, keys) {
    re.keys = keys;
    return re
  }

  /**
   * Get the flags for a regexp from the options.
   *
   * @param  {Object} options
   * @return {string}
   */
  function flags (options) {
    return options.sensitive ? '' : 'i'
  }

  /**
   * Pull out keys from a regexp.
   *
   * @param  {!RegExp} path
   * @param  {!Array}  keys
   * @return {!RegExp}
   */
  function regexpToRegexp (path, keys) {
    // Use a negative lookahead to match only capturing groups.
    var groups = path.source.match(/\((?!\?)/g);

    if (groups) {
      for (var i = 0; i < groups.length; i++) {
        keys.push({
          name: i,
          prefix: null,
          delimiter: null,
          optional: false,
          repeat: false,
          partial: false,
          asterisk: false,
          pattern: null
        });
      }
    }

    return attachKeys(path, keys)
  }

  /**
   * Transform an array into a regexp.
   *
   * @param  {!Array}  path
   * @param  {Array}   keys
   * @param  {!Object} options
   * @return {!RegExp}
   */
  function arrayToRegexp (path, keys, options) {
    var parts = [];

    for (var i = 0; i < path.length; i++) {
      parts.push(pathToRegexp(path[i], keys, options).source);
    }

    var regexp = new RegExp('(?:' + parts.join('|') + ')', flags(options));

    return attachKeys(regexp, keys)
  }

  /**
   * Create a path regexp from string input.
   *
   * @param  {string}  path
   * @param  {!Array}  keys
   * @param  {!Object} options
   * @return {!RegExp}
   */
  function stringToRegexp (path, keys, options) {
    return tokensToRegExp(parse(path, options), keys, options)
  }

  /**
   * Expose a function for taking tokens and returning a RegExp.
   *
   * @param  {!Array}          tokens
   * @param  {(Array|Object)=} keys
   * @param  {Object=}         options
   * @return {!RegExp}
   */
  function tokensToRegExp (tokens, keys, options) {
    if (!isarray(keys)) {
      options = /** @type {!Object} */ (keys || options);
      keys = [];
    }

    options = options || {};

    var strict = options.strict;
    var end = options.end !== false;
    var route = '';

    // Iterate over the tokens and create our regexp string.
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];

      if (typeof token === 'string') {
        route += escapeString(token);
      } else {
        var prefix = escapeString(token.prefix);
        var capture = '(?:' + token.pattern + ')';

        keys.push(token);

        if (token.repeat) {
          capture += '(?:' + prefix + capture + ')*';
        }

        if (token.optional) {
          if (!token.partial) {
            capture = '(?:' + prefix + '(' + capture + '))?';
          } else {
            capture = prefix + '(' + capture + ')?';
          }
        } else {
          capture = prefix + '(' + capture + ')';
        }

        route += capture;
      }
    }

    var delimiter = escapeString(options.delimiter || '/');
    var endsWithDelimiter = route.slice(-delimiter.length) === delimiter;

    // In non-strict mode we allow a slash at the end of match. If the path to
    // match already ends with a slash, we remove it for consistency. The slash
    // is valid at the end of a path match, not in the middle. This is important
    // in non-ending mode, where "/test/" shouldn't match "/test//route".
    if (!strict) {
      route = (endsWithDelimiter ? route.slice(0, -delimiter.length) : route) + '(?:' + delimiter + '(?=$))?';
    }

    if (end) {
      route += '$';
    } else {
      // In non-ending mode, we need the capturing groups to match as much as
      // possible by using a positive lookahead to the end or next path segment.
      route += strict && endsWithDelimiter ? '' : '(?=' + delimiter + '|$)';
    }

    return attachKeys(new RegExp('^' + route, flags(options)), keys)
  }

  /**
   * Normalize the given path string, returning a regular expression.
   *
   * An empty array can be passed in for the keys, which will hold the
   * placeholder key descriptions. For example, using `/user/:id`, `keys` will
   * contain `[{ name: 'id', delimiter: '/', optional: false, repeat: false }]`.
   *
   * @param  {(string|RegExp|Array)} path
   * @param  {(Array|Object)=}       keys
   * @param  {Object=}               options
   * @return {!RegExp}
   */
  function pathToRegexp (path, keys, options) {
    if (!isarray(keys)) {
      options = /** @type {!Object} */ (keys || options);
      keys = [];
    }

    options = options || {};

    if (path instanceof RegExp) {
      return regexpToRegexp(path, /** @type {!Array} */ (keys))
    }

    if (isarray(path)) {
      return arrayToRegexp(/** @type {!Array} */ (path), /** @type {!Array} */ (keys), options)
    }

    return stringToRegexp(/** @type {string} */ (path), /** @type {!Array} */ (keys), options)
  }

  pathToRegexp_1.parse = parse_1;
  pathToRegexp_1.compile = compile_1;
  pathToRegexp_1.tokensToFunction = tokensToFunction_1;
  pathToRegexp_1.tokensToRegExp = tokensToRegExp_1;

  /*  */

  // $flow-disable-line
  var regexpCompileCache = Object.create(null);

  function fillParams (
    path,
    params,
    routeMsg
  ) {
    try {
      var filler =
        regexpCompileCache[path] ||
        (regexpCompileCache[path] = pathToRegexp_1.compile(path));
      return filler(params || {}, { pretty: true })
    } catch (e) {
      {
        warn(false, ("missing param for " + routeMsg + ": " + (e.message)));
      }
      return ''
    }
  }

  /*  */

  function createRouteMap (
    routes,
    oldPathList,
    oldPathMap,
    oldNameMap
  ) {
    // the path list is used to control path matching priority
    var pathList = oldPathList || [];
    // $flow-disable-line
    var pathMap = oldPathMap || Object.create(null);
    // $flow-disable-line
    var nameMap = oldNameMap || Object.create(null);

    routes.forEach(function (route) {
      addRouteRecord(pathList, pathMap, nameMap, route);
    });

    // ensure wildcard routes are always at the end
    for (var i = 0, l = pathList.length; i < l; i++) {
      if (pathList[i] === '*') {
        pathList.push(pathList.splice(i, 1)[0]);
        l--;
        i--;
      }
    }

    return {
      pathList: pathList,
      pathMap: pathMap,
      nameMap: nameMap
    }
  }

  function addRouteRecord (
    pathList,
    pathMap,
    nameMap,
    route,
    parent,
    matchAs
  ) {
    var path = route.path;
    var name = route.name;
    {
      assert(path != null, "\"path\" is required in a route configuration.");
      assert(
        typeof route.component !== 'string',
        "route config \"component\" for path: " + (String(path || name)) + " cannot be a " +
        "string id. Use an actual component instead."
      );
    }

    var pathToRegexpOptions = route.pathToRegexpOptions || {};
    var normalizedPath = normalizePath(
      path,
      parent,
      pathToRegexpOptions.strict
    );

    if (typeof route.caseSensitive === 'boolean') {
      pathToRegexpOptions.sensitive = route.caseSensitive;
    }

    var record = {
      path: normalizedPath,
      regex: compileRouteRegex(normalizedPath, pathToRegexpOptions),
      components: route.components || { default: route.component },
      instances: {},
      name: name,
      parent: parent,
      matchAs: matchAs,
      redirect: route.redirect,
      beforeEnter: route.beforeEnter,
      meta: route.meta || {},
      props: route.props == null
        ? {}
        : route.components
          ? route.props
          : { default: route.props }
    };

    if (route.children) {
      // Warn if route is named, does not redirect and has a default child route.
      // If users navigate to this route by name, the default child will
      // not be rendered (GH Issue #629)
      {
        if (route.name && !route.redirect && route.children.some(function (child) { return /^\/?$/.test(child.path); })) {
          warn(
            false,
            "Named Route '" + (route.name) + "' has a default child route. " +
            "When navigating to this named route (:to=\"{name: '" + (route.name) + "'\"), " +
            "the default child route will not be rendered. Remove the name from " +
            "this route and use the name of the default child route for named " +
            "links instead."
          );
        }
      }
      route.children.forEach(function (child) {
        var childMatchAs = matchAs
          ? cleanPath((matchAs + "/" + (child.path)))
          : undefined;
        addRouteRecord(pathList, pathMap, nameMap, child, record, childMatchAs);
      });
    }

    if (route.alias !== undefined) {
      var aliases = Array.isArray(route.alias)
        ? route.alias
        : [route.alias];

      aliases.forEach(function (alias) {
        var aliasRoute = {
          path: alias,
          children: route.children
        };
        addRouteRecord(
          pathList,
          pathMap,
          nameMap,
          aliasRoute,
          parent,
          record.path || '/' // matchAs
        );
      });
    }

    if (!pathMap[record.path]) {
      pathList.push(record.path);
      pathMap[record.path] = record;
    }

    if (name) {
      if (!nameMap[name]) {
        nameMap[name] = record;
      } else if ("development" !== 'production' && !matchAs) {
        warn(
          false,
          "Duplicate named routes definition: " +
          "{ name: \"" + name + "\", path: \"" + (record.path) + "\" }"
        );
      }
    }
  }

  function compileRouteRegex (path, pathToRegexpOptions) {
    var regex = pathToRegexp_1(path, [], pathToRegexpOptions);
    {
      var keys = Object.create(null);
      regex.keys.forEach(function (key) {
        warn(!keys[key.name], ("Duplicate param keys in route with path: \"" + path + "\""));
        keys[key.name] = true;
      });
    }
    return regex
  }

  function normalizePath (path, parent, strict) {
    if (!strict) { path = path.replace(/\/$/, ''); }
    if (path[0] === '/') { return path }
    if (parent == null) { return path }
    return cleanPath(((parent.path) + "/" + path))
  }

  /*  */


  function normalizeLocation (
    raw,
    current,
    append,
    router
  ) {
    var next = typeof raw === 'string' ? { path: raw } : raw;
    // named target
    if (next.name || next._normalized) {
      return next
    }

    // relative params
    if (!next.path && next.params && current) {
      next = assign({}, next);
      next._normalized = true;
      var params = assign(assign({}, current.params), next.params);
      if (current.name) {
        next.name = current.name;
        next.params = params;
      } else if (current.matched.length) {
        var rawPath = current.matched[current.matched.length - 1].path;
        next.path = fillParams(rawPath, params, ("path " + (current.path)));
      } else {
        warn(false, "relative params navigation requires a current route.");
      }
      return next
    }

    var parsedPath = parsePath(next.path || '');
    var basePath = (current && current.path) || '/';
    var path = parsedPath.path
      ? resolvePath(parsedPath.path, basePath, append || next.append)
      : basePath;

    var query = resolveQuery(
      parsedPath.query,
      next.query,
      router && router.options.parseQuery
    );

    var hash = next.hash || parsedPath.hash;
    if (hash && hash.charAt(0) !== '#') {
      hash = "#" + hash;
    }

    return {
      _normalized: true,
      path: path,
      query: query,
      hash: hash
    }
  }

  function assign (a, b) {
    for (var key in b) {
      a[key] = b[key];
    }
    return a
  }

  /*  */


  function createMatcher (
    routes,
    router
  ) {
    var ref = createRouteMap(routes);
    var pathList = ref.pathList;
    var pathMap = ref.pathMap;
    var nameMap = ref.nameMap;

    function addRoutes (routes) {
      createRouteMap(routes, pathList, pathMap, nameMap);
    }

    function match (
      raw,
      currentRoute,
      redirectedFrom
    ) {
      var location = normalizeLocation(raw, currentRoute, false, router);
      var name = location.name;

      if (name) {
        var record = nameMap[name];
        {
          warn(record, ("Route with name '" + name + "' does not exist"));
        }
        if (!record) { return _createRoute(null, location) }
        var paramNames = record.regex.keys
          .filter(function (key) { return !key.optional; })
          .map(function (key) { return key.name; });

        if (typeof location.params !== 'object') {
          location.params = {};
        }

        if (currentRoute && typeof currentRoute.params === 'object') {
          for (var key in currentRoute.params) {
            if (!(key in location.params) && paramNames.indexOf(key) > -1) {
              location.params[key] = currentRoute.params[key];
            }
          }
        }

        if (record) {
          location.path = fillParams(record.path, location.params, ("named route \"" + name + "\""));
          return _createRoute(record, location, redirectedFrom)
        }
      } else if (location.path) {
        location.params = {};
        for (var i = 0; i < pathList.length; i++) {
          var path = pathList[i];
          var record$1 = pathMap[path];
          if (matchRoute(record$1.regex, location.path, location.params)) {
            return _createRoute(record$1, location, redirectedFrom)
          }
        }
      }
      // no match
      return _createRoute(null, location)
    }

    function redirect (
      record,
      location
    ) {
      var originalRedirect = record.redirect;
      var redirect = typeof originalRedirect === 'function'
          ? originalRedirect(createRoute(record, location, null, router))
          : originalRedirect;

      if (typeof redirect === 'string') {
        redirect = { path: redirect };
      }

      if (!redirect || typeof redirect !== 'object') {
        {
          warn(
            false, ("invalid redirect option: " + (JSON.stringify(redirect)))
          );
        }
        return _createRoute(null, location)
      }

      var re = redirect;
      var name = re.name;
      var path = re.path;
      var query = location.query;
      var hash = location.hash;
      var params = location.params;
      query = re.hasOwnProperty('query') ? re.query : query;
      hash = re.hasOwnProperty('hash') ? re.hash : hash;
      params = re.hasOwnProperty('params') ? re.params : params;

      if (name) {
        // resolved named direct
        var targetRecord = nameMap[name];
        {
          assert(targetRecord, ("redirect failed: named route \"" + name + "\" not found."));
        }
        return match({
          _normalized: true,
          name: name,
          query: query,
          hash: hash,
          params: params
        }, undefined, location)
      } else if (path) {
        // 1. resolve relative redirect
        var rawPath = resolveRecordPath(path, record);
        // 2. resolve params
        var resolvedPath = fillParams(rawPath, params, ("redirect route with path \"" + rawPath + "\""));
        // 3. rematch with existing query and hash
        return match({
          _normalized: true,
          path: resolvedPath,
          query: query,
          hash: hash
        }, undefined, location)
      } else {
        {
          warn(false, ("invalid redirect option: " + (JSON.stringify(redirect))));
        }
        return _createRoute(null, location)
      }
    }

    function alias (
      record,
      location,
      matchAs
    ) {
      var aliasedPath = fillParams(matchAs, location.params, ("aliased route with path \"" + matchAs + "\""));
      var aliasedMatch = match({
        _normalized: true,
        path: aliasedPath
      });
      if (aliasedMatch) {
        var matched = aliasedMatch.matched;
        var aliasedRecord = matched[matched.length - 1];
        location.params = aliasedMatch.params;
        return _createRoute(aliasedRecord, location)
      }
      return _createRoute(null, location)
    }

    function _createRoute (
      record,
      location,
      redirectedFrom
    ) {
      if (record && record.redirect) {
        return redirect(record, redirectedFrom || location)
      }
      if (record && record.matchAs) {
        return alias(record, location, record.matchAs)
      }
      return createRoute(record, location, redirectedFrom, router)
    }

    return {
      match: match,
      addRoutes: addRoutes
    }
  }

  function matchRoute (
    regex,
    path,
    params
  ) {
    var m = path.match(regex);

    if (!m) {
      return false
    } else if (!params) {
      return true
    }

    for (var i = 1, len = m.length; i < len; ++i) {
      var key = regex.keys[i - 1];
      var val = typeof m[i] === 'string' ? decodeURIComponent(m[i]) : m[i];
      if (key) {
        params[key.name] = val;
      }
    }

    return true
  }

  function resolveRecordPath (path, record) {
    return resolvePath(path, record.parent ? record.parent.path : '/', true)
  }

  /*  */


  var positionStore = Object.create(null);

  function setupScroll () {
    // Fix for #1585 for Firefox
    window.history.replaceState({ key: getStateKey() }, '');
    window.addEventListener('popstate', function (e) {
      saveScrollPosition();
      if (e.state && e.state.key) {
        setStateKey(e.state.key);
      }
    });
  }

  function handleScroll (
    router,
    to,
    from,
    isPop
  ) {
    if (!router.app) {
      return
    }

    var behavior = router.options.scrollBehavior;
    if (!behavior) {
      return
    }

    {
      assert(typeof behavior === 'function', "scrollBehavior must be a function");
    }

    // wait until re-render finishes before scrolling
    router.app.$nextTick(function () {
      var position = getScrollPosition();
      var shouldScroll = behavior(to, from, isPop ? position : null);

      if (!shouldScroll) {
        return
      }

      if (typeof shouldScroll.then === 'function') {
        shouldScroll.then(function (shouldScroll) {
          scrollToPosition((shouldScroll), position);
        }).catch(function (err) {
          {
            assert(false, err.toString());
          }
        });
      } else {
        scrollToPosition(shouldScroll, position);
      }
    });
  }

  function saveScrollPosition () {
    var key = getStateKey();
    if (key) {
      positionStore[key] = {
        x: window.pageXOffset,
        y: window.pageYOffset
      };
    }
  }

  function getScrollPosition () {
    var key = getStateKey();
    if (key) {
      return positionStore[key]
    }
  }

  function getElementPosition (el, offset) {
    var docEl = document.documentElement;
    var docRect = docEl.getBoundingClientRect();
    var elRect = el.getBoundingClientRect();
    return {
      x: elRect.left - docRect.left - offset.x,
      y: elRect.top - docRect.top - offset.y
    }
  }

  function isValidPosition (obj) {
    return isNumber(obj.x) || isNumber(obj.y)
  }

  function normalizePosition (obj) {
    return {
      x: isNumber(obj.x) ? obj.x : window.pageXOffset,
      y: isNumber(obj.y) ? obj.y : window.pageYOffset
    }
  }

  function normalizeOffset (obj) {
    return {
      x: isNumber(obj.x) ? obj.x : 0,
      y: isNumber(obj.y) ? obj.y : 0
    }
  }

  function isNumber (v) {
    return typeof v === 'number'
  }

  function scrollToPosition (shouldScroll, position) {
    var isObject = typeof shouldScroll === 'object';
    if (isObject && typeof shouldScroll.selector === 'string') {
      var el = document.querySelector(shouldScroll.selector);
      if (el) {
        var offset = shouldScroll.offset && typeof shouldScroll.offset === 'object' ? shouldScroll.offset : {};
        offset = normalizeOffset(offset);
        position = getElementPosition(el, offset);
      } else if (isValidPosition(shouldScroll)) {
        position = normalizePosition(shouldScroll);
      }
    } else if (isObject && isValidPosition(shouldScroll)) {
      position = normalizePosition(shouldScroll);
    }

    if (position) {
      window.scrollTo(position.x, position.y);
    }
  }

  /*  */

  var supportsPushState = inBrowser && (function () {
    var ua = window.navigator.userAgent;

    if (
      (ua.indexOf('Android 2.') !== -1 || ua.indexOf('Android 4.0') !== -1) &&
      ua.indexOf('Mobile Safari') !== -1 &&
      ua.indexOf('Chrome') === -1 &&
      ua.indexOf('Windows Phone') === -1
    ) {
      return false
    }

    return window.history && 'pushState' in window.history
  })();

  // use User Timing api (if present) for more accurate key precision
  var Time = inBrowser && window.performance && window.performance.now
    ? window.performance
    : Date;

  var _key = genKey();

  function genKey () {
    return Time.now().toFixed(3)
  }

  function getStateKey () {
    return _key
  }

  function setStateKey (key) {
    _key = key;
  }

  function pushState (url, replace) {
    saveScrollPosition();
    // try...catch the pushState call to get around Safari
    // DOM Exception 18 where it limits to 100 pushState calls
    var history = window.history;
    try {
      if (replace) {
        history.replaceState({ key: _key }, '', url);
      } else {
        _key = genKey();
        history.pushState({ key: _key }, '', url);
      }
    } catch (e) {
      window.location[replace ? 'replace' : 'assign'](url);
    }
  }

  function replaceState (url) {
    pushState(url, true);
  }

  /*  */

  function runQueue (queue, fn, cb) {
    var step = function (index) {
      if (index >= queue.length) {
        cb();
      } else {
        if (queue[index]) {
          fn(queue[index], function () {
            step(index + 1);
          });
        } else {
          step(index + 1);
        }
      }
    };
    step(0);
  }

  /*  */

  function resolveAsyncComponents (matched) {
    return function (to, from, next) {
      var hasAsync = false;
      var pending = 0;
      var error = null;

      flatMapComponents(matched, function (def, _, match, key) {
        // if it's a function and doesn't have cid attached,
        // assume it's an async component resolve function.
        // we are not using Vue's default async resolving mechanism because
        // we want to halt the navigation until the incoming component has been
        // resolved.
        if (typeof def === 'function' && def.cid === undefined) {
          hasAsync = true;
          pending++;

          var resolve = once(function (resolvedDef) {
            if (isESModule(resolvedDef)) {
              resolvedDef = resolvedDef.default;
            }
            // save resolved on async factory in case it's used elsewhere
            def.resolved = typeof resolvedDef === 'function'
              ? resolvedDef
              : _Vue.extend(resolvedDef);
            match.components[key] = resolvedDef;
            pending--;
            if (pending <= 0) {
              next();
            }
          });

          var reject = once(function (reason) {
            var msg = "Failed to resolve async component " + key + ": " + reason;
            "development" !== 'production' && warn(false, msg);
            if (!error) {
              error = isError(reason)
                ? reason
                : new Error(msg);
              next(error);
            }
          });

          var res;
          try {
            res = def(resolve, reject);
          } catch (e) {
            reject(e);
          }
          if (res) {
            if (typeof res.then === 'function') {
              res.then(resolve, reject);
            } else {
              // new syntax in Vue 2.3
              var comp = res.component;
              if (comp && typeof comp.then === 'function') {
                comp.then(resolve, reject);
              }
            }
          }
        }
      });

      if (!hasAsync) { next(); }
    }
  }

  function flatMapComponents (
    matched,
    fn
  ) {
    return flatten(matched.map(function (m) {
      return Object.keys(m.components).map(function (key) { return fn(
        m.components[key],
        m.instances[key],
        m, key
      ); })
    }))
  }

  function flatten (arr) {
    return Array.prototype.concat.apply([], arr)
  }

  var hasSymbol =
    typeof Symbol === 'function' &&
    typeof Symbol.toStringTag === 'symbol';

  function isESModule (obj) {
    return obj.__esModule || (hasSymbol && obj[Symbol.toStringTag] === 'Module')
  }

  // in Webpack 2, require.ensure now also returns a Promise
  // so the resolve/reject functions may get called an extra time
  // if the user uses an arrow function shorthand that happens to
  // return that Promise.
  function once (fn) {
    var called = false;
    return function () {
      var args = [], len = arguments.length;
      while ( len-- ) args[ len ] = arguments[ len ];

      if (called) { return }
      called = true;
      return fn.apply(this, args)
    }
  }

  /*  */

  var History = function History (router, base) {
    this.router = router;
    this.base = normalizeBase(base);
    // start with a route object that stands for "nowhere"
    this.current = START;
    this.pending = null;
    this.ready = false;
    this.readyCbs = [];
    this.readyErrorCbs = [];
    this.errorCbs = [];
  };

  History.prototype.listen = function listen (cb) {
    this.cb = cb;
  };

  History.prototype.onReady = function onReady (cb, errorCb) {
    if (this.ready) {
      cb();
    } else {
      this.readyCbs.push(cb);
      if (errorCb) {
        this.readyErrorCbs.push(errorCb);
      }
    }
  };

  History.prototype.onError = function onError (errorCb) {
    this.errorCbs.push(errorCb);
  };

  History.prototype.transitionTo = function transitionTo (location, onComplete, onAbort) {
      var this$1 = this;

    var route = this.router.match(location, this.current);
    this.confirmTransition(route, function () {
      this$1.updateRoute(route);
      onComplete && onComplete(route);
      this$1.ensureURL();

      // fire ready cbs once
      if (!this$1.ready) {
        this$1.ready = true;
        this$1.readyCbs.forEach(function (cb) { cb(route); });
      }
    }, function (err) {
      if (onAbort) {
        onAbort(err);
      }
      if (err && !this$1.ready) {
        this$1.ready = true;
        this$1.readyErrorCbs.forEach(function (cb) { cb(err); });
      }
    });
  };

  History.prototype.confirmTransition = function confirmTransition (route, onComplete, onAbort) {
      var this$1 = this;

    var current = this.current;
    var abort = function (err) {
      if (isError(err)) {
        if (this$1.errorCbs.length) {
          this$1.errorCbs.forEach(function (cb) { cb(err); });
        } else {
          warn(false, 'uncaught error during route navigation:');
          console.error(err);
        }
      }
      onAbort && onAbort(err);
    };
    if (
      isSameRoute(route, current) &&
      // in the case the route map has been dynamically appended to
      route.matched.length === current.matched.length
    ) {
      this.ensureURL();
      return abort()
    }

    var ref = resolveQueue(this.current.matched, route.matched);
      var updated = ref.updated;
      var deactivated = ref.deactivated;
      var activated = ref.activated;

    var queue = [].concat(
      // in-component leave guards
      extractLeaveGuards(deactivated),
      // global before hooks
      this.router.beforeHooks,
      // in-component update hooks
      extractUpdateHooks(updated),
      // in-config enter guards
      activated.map(function (m) { return m.beforeEnter; }),
      // async components
      resolveAsyncComponents(activated)
    );

    this.pending = route;
    var iterator = function (hook, next) {
      if (this$1.pending !== route) {
        return abort()
      }
      try {
        hook(route, current, function (to) {
          if (to === false || isError(to)) {
            // next(false) -> abort navigation, ensure current URL
            this$1.ensureURL(true);
            abort(to);
          } else if (
            typeof to === 'string' ||
            (typeof to === 'object' && (
              typeof to.path === 'string' ||
              typeof to.name === 'string'
            ))
          ) {
            // next('/') or next({ path: '/' }) -> redirect
            abort();
            if (typeof to === 'object' && to.replace) {
              this$1.replace(to);
            } else {
              this$1.push(to);
            }
          } else {
            // confirm transition and pass on the value
            next(to);
          }
        });
      } catch (e) {
        abort(e);
      }
    };

    runQueue(queue, iterator, function () {
      var postEnterCbs = [];
      var isValid = function () { return this$1.current === route; };
      // wait until async components are resolved before
      // extracting in-component enter guards
      var enterGuards = extractEnterGuards(activated, postEnterCbs, isValid);
      var queue = enterGuards.concat(this$1.router.resolveHooks);
      runQueue(queue, iterator, function () {
        if (this$1.pending !== route) {
          return abort()
        }
        this$1.pending = null;
        onComplete(route);
        if (this$1.router.app) {
          this$1.router.app.$nextTick(function () {
            postEnterCbs.forEach(function (cb) { cb(); });
          });
        }
      });
    });
  };

  History.prototype.updateRoute = function updateRoute (route) {
    var prev = this.current;
    this.current = route;
    this.cb && this.cb(route);
    this.router.afterHooks.forEach(function (hook) {
      hook && hook(route, prev);
    });
  };

  function normalizeBase (base) {
    if (!base) {
      if (inBrowser) {
        // respect <base> tag
        var baseEl = document.querySelector('base');
        base = (baseEl && baseEl.getAttribute('href')) || '/';
        // strip full URL origin
        base = base.replace(/^https?:\/\/[^\/]+/, '');
      } else {
        base = '/';
      }
    }
    // make sure there's the starting slash
    if (base.charAt(0) !== '/') {
      base = '/' + base;
    }
    // remove trailing slash
    return base.replace(/\/$/, '')
  }

  function resolveQueue (
    current,
    next
  ) {
    var i;
    var max = Math.max(current.length, next.length);
    for (i = 0; i < max; i++) {
      if (current[i] !== next[i]) {
        break
      }
    }
    return {
      updated: next.slice(0, i),
      activated: next.slice(i),
      deactivated: current.slice(i)
    }
  }

  function extractGuards (
    records,
    name,
    bind,
    reverse
  ) {
    var guards = flatMapComponents(records, function (def, instance, match, key) {
      var guard = extractGuard(def, name);
      if (guard) {
        return Array.isArray(guard)
          ? guard.map(function (guard) { return bind(guard, instance, match, key); })
          : bind(guard, instance, match, key)
      }
    });
    return flatten(reverse ? guards.reverse() : guards)
  }

  function extractGuard (
    def,
    key
  ) {
    if (typeof def !== 'function') {
      // extend now so that global mixins are applied.
      def = _Vue.extend(def);
    }
    return def.options[key]
  }

  function extractLeaveGuards (deactivated) {
    return extractGuards(deactivated, 'beforeRouteLeave', bindGuard, true)
  }

  function extractUpdateHooks (updated) {
    return extractGuards(updated, 'beforeRouteUpdate', bindGuard)
  }

  function bindGuard (guard, instance) {
    if (instance) {
      return function boundRouteGuard () {
        return guard.apply(instance, arguments)
      }
    }
  }

  function extractEnterGuards (
    activated,
    cbs,
    isValid
  ) {
    return extractGuards(activated, 'beforeRouteEnter', function (guard, _, match, key) {
      return bindEnterGuard(guard, match, key, cbs, isValid)
    })
  }

  function bindEnterGuard (
    guard,
    match,
    key,
    cbs,
    isValid
  ) {
    return function routeEnterGuard (to, from, next) {
      return guard(to, from, function (cb) {
        next(cb);
        if (typeof cb === 'function') {
          cbs.push(function () {
            // #750
            // if a router-view is wrapped with an out-in transition,
            // the instance may not have been registered at this time.
            // we will need to poll for registration until current route
            // is no longer valid.
            poll(cb, match.instances, key, isValid);
          });
        }
      })
    }
  }

  function poll (
    cb, // somehow flow cannot infer this is a function
    instances,
    key,
    isValid
  ) {
    if (instances[key]) {
      cb(instances[key]);
    } else if (isValid()) {
      setTimeout(function () {
        poll(cb, instances, key, isValid);
      }, 16);
    }
  }

  /*  */


  var HTML5History = (function (History$$1) {
    function HTML5History (router, base) {
      var this$1 = this;

      History$$1.call(this, router, base);

      var expectScroll = router.options.scrollBehavior;

      if (expectScroll) {
        setupScroll();
      }

      var initLocation = getLocation(this.base);
      window.addEventListener('popstate', function (e) {
        var current = this$1.current;

        // Avoiding first `popstate` event dispatched in some browsers but first
        // history route not updated since async guard at the same time.
        var location = getLocation(this$1.base);
        if (this$1.current === START && location === initLocation) {
          return
        }

        this$1.transitionTo(location, function (route) {
          if (expectScroll) {
            handleScroll(router, route, current, true);
          }
        });
      });
    }

    if ( History$$1 ) HTML5History.__proto__ = History$$1;
    HTML5History.prototype = Object.create( History$$1 && History$$1.prototype );
    HTML5History.prototype.constructor = HTML5History;

    HTML5History.prototype.go = function go (n) {
      window.history.go(n);
    };

    HTML5History.prototype.push = function push (location, onComplete, onAbort) {
      var this$1 = this;

      var ref = this;
      var fromRoute = ref.current;
      this.transitionTo(location, function (route) {
        pushState(cleanPath(this$1.base + route.fullPath));
        handleScroll(this$1.router, route, fromRoute, false);
        onComplete && onComplete(route);
      }, onAbort);
    };

    HTML5History.prototype.replace = function replace (location, onComplete, onAbort) {
      var this$1 = this;

      var ref = this;
      var fromRoute = ref.current;
      this.transitionTo(location, function (route) {
        replaceState(cleanPath(this$1.base + route.fullPath));
        handleScroll(this$1.router, route, fromRoute, false);
        onComplete && onComplete(route);
      }, onAbort);
    };

    HTML5History.prototype.ensureURL = function ensureURL (push) {
      if (getLocation(this.base) !== this.current.fullPath) {
        var current = cleanPath(this.base + this.current.fullPath);
        push ? pushState(current) : replaceState(current);
      }
    };

    HTML5History.prototype.getCurrentLocation = function getCurrentLocation () {
      return getLocation(this.base)
    };

    return HTML5History;
  }(History));

  function getLocation (base) {
    var path = window.location.pathname;
    if (base && path.indexOf(base) === 0) {
      path = path.slice(base.length);
    }
    return (path || '/') + window.location.search + window.location.hash
  }

  /*  */


  var HashHistory = (function (History$$1) {
    function HashHistory (router, base, fallback) {
      History$$1.call(this, router, base);
      // check history fallback deeplinking
      if (fallback && checkFallback(this.base)) {
        return
      }
      ensureSlash();
    }

    if ( History$$1 ) HashHistory.__proto__ = History$$1;
    HashHistory.prototype = Object.create( History$$1 && History$$1.prototype );
    HashHistory.prototype.constructor = HashHistory;

    // this is delayed until the app mounts
    // to avoid the hashchange listener being fired too early
    HashHistory.prototype.setupListeners = function setupListeners () {
      var this$1 = this;

      var router = this.router;
      var expectScroll = router.options.scrollBehavior;
      var supportsScroll = supportsPushState && expectScroll;

      if (supportsScroll) {
        setupScroll();
      }

      window.addEventListener(supportsPushState ? 'popstate' : 'hashchange', function () {
        var current = this$1.current;
        if (!ensureSlash()) {
          return
        }
        this$1.transitionTo(getHash(), function (route) {
          if (supportsScroll) {
            handleScroll(this$1.router, route, current, true);
          }
          if (!supportsPushState) {
            replaceHash(route.fullPath);
          }
        });
      });
    };

    HashHistory.prototype.push = function push (location, onComplete, onAbort) {
      var this$1 = this;

      var ref = this;
      var fromRoute = ref.current;
      this.transitionTo(location, function (route) {
        pushHash(route.fullPath);
        handleScroll(this$1.router, route, fromRoute, false);
        onComplete && onComplete(route);
      }, onAbort);
    };

    HashHistory.prototype.replace = function replace (location, onComplete, onAbort) {
      var this$1 = this;

      var ref = this;
      var fromRoute = ref.current;
      this.transitionTo(location, function (route) {
        replaceHash(route.fullPath);
        handleScroll(this$1.router, route, fromRoute, false);
        onComplete && onComplete(route);
      }, onAbort);
    };

    HashHistory.prototype.go = function go (n) {
      window.history.go(n);
    };

    HashHistory.prototype.ensureURL = function ensureURL (push) {
      var current = this.current.fullPath;
      if (getHash() !== current) {
        push ? pushHash(current) : replaceHash(current);
      }
    };

    HashHistory.prototype.getCurrentLocation = function getCurrentLocation () {
      return getHash()
    };

    return HashHistory;
  }(History));

  function checkFallback (base) {
    var location = getLocation(base);
    if (!/^\/#/.test(location)) {
      window.location.replace(
        cleanPath(base + '/#' + location)
      );
      return true
    }
  }

  function ensureSlash () {
    var path = getHash();
    if (path.charAt(0) === '/') {
      return true
    }
    replaceHash('/' + path);
    return false
  }

  function getHash () {
    // We can't use window.location.hash here because it's not
    // consistent across browsers - Firefox will pre-decode it!
    var href = window.location.href;
    var index = href.indexOf('#');
    return index === -1 ? '' : href.slice(index + 1)
  }

  function getUrl (path) {
    var href = window.location.href;
    var i = href.indexOf('#');
    var base = i >= 0 ? href.slice(0, i) : href;
    return (base + "#" + path)
  }

  function pushHash (path) {
    if (supportsPushState) {
      pushState(getUrl(path));
    } else {
      window.location.hash = path;
    }
  }

  function replaceHash (path) {
    if (supportsPushState) {
      replaceState(getUrl(path));
    } else {
      window.location.replace(getUrl(path));
    }
  }

  /*  */


  var AbstractHistory = (function (History$$1) {
    function AbstractHistory (router, base) {
      History$$1.call(this, router, base);
      this.stack = [];
      this.index = -1;
    }

    if ( History$$1 ) AbstractHistory.__proto__ = History$$1;
    AbstractHistory.prototype = Object.create( History$$1 && History$$1.prototype );
    AbstractHistory.prototype.constructor = AbstractHistory;

    AbstractHistory.prototype.push = function push (location, onComplete, onAbort) {
      var this$1 = this;

      this.transitionTo(location, function (route) {
        this$1.stack = this$1.stack.slice(0, this$1.index + 1).concat(route);
        this$1.index++;
        onComplete && onComplete(route);
      }, onAbort);
    };

    AbstractHistory.prototype.replace = function replace (location, onComplete, onAbort) {
      var this$1 = this;

      this.transitionTo(location, function (route) {
        this$1.stack = this$1.stack.slice(0, this$1.index).concat(route);
        onComplete && onComplete(route);
      }, onAbort);
    };

    AbstractHistory.prototype.go = function go (n) {
      var this$1 = this;

      var targetIndex = this.index + n;
      if (targetIndex < 0 || targetIndex >= this.stack.length) {
        return
      }
      var route = this.stack[targetIndex];
      this.confirmTransition(route, function () {
        this$1.index = targetIndex;
        this$1.updateRoute(route);
      });
    };

    AbstractHistory.prototype.getCurrentLocation = function getCurrentLocation () {
      var current = this.stack[this.stack.length - 1];
      return current ? current.fullPath : '/'
    };

    AbstractHistory.prototype.ensureURL = function ensureURL () {
      // noop
    };

    return AbstractHistory;
  }(History));

  /*  */

  var VueRouter = function VueRouter (options) {
    if ( options === void 0 ) options = {};

    this.app = null;
    this.apps = [];
    this.options = options;
    this.beforeHooks = [];
    this.resolveHooks = [];
    this.afterHooks = [];
    this.matcher = createMatcher(options.routes || [], this);

    var mode = options.mode || 'hash';
    this.fallback = mode === 'history' && !supportsPushState && options.fallback !== false;
    if (this.fallback) {
      mode = 'hash';
    }
    if (!inBrowser) {
      mode = 'abstract';
    }
    this.mode = mode;

    switch (mode) {
      case 'history':
        this.history = new HTML5History(this, options.base);
        break
      case 'hash':
        this.history = new HashHistory(this, options.base, this.fallback);
        break
      case 'abstract':
        this.history = new AbstractHistory(this, options.base);
        break
      default:
        {
          assert(false, ("invalid mode: " + mode));
        }
    }
  };

  var prototypeAccessors = { currentRoute: { configurable: true } };

  VueRouter.prototype.match = function match (
    raw,
    current,
    redirectedFrom
  ) {
    return this.matcher.match(raw, current, redirectedFrom)
  };

  prototypeAccessors.currentRoute.get = function () {
    return this.history && this.history.current
  };

  VueRouter.prototype.init = function init (app /* Vue component instance */) {
      var this$1 = this;

    "development" !== 'production' && assert(
      install.installed,
      "not installed. Make sure to call `Vue.use(VueRouter)` " +
      "before creating root instance."
    );

    this.apps.push(app);

    // main app already initialized.
    if (this.app) {
      return
    }

    this.app = app;

    var history = this.history;

    if (history instanceof HTML5History) {
      history.transitionTo(history.getCurrentLocation());
    } else if (history instanceof HashHistory) {
      var setupHashListener = function () {
        history.setupListeners();
      };
      history.transitionTo(
        history.getCurrentLocation(),
        setupHashListener,
        setupHashListener
      );
    }

    history.listen(function (route) {
      this$1.apps.forEach(function (app) {
        app._route = route;
      });
    });
  };

  VueRouter.prototype.beforeEach = function beforeEach (fn) {
    return registerHook(this.beforeHooks, fn)
  };

  VueRouter.prototype.beforeResolve = function beforeResolve (fn) {
    return registerHook(this.resolveHooks, fn)
  };

  VueRouter.prototype.afterEach = function afterEach (fn) {
    return registerHook(this.afterHooks, fn)
  };

  VueRouter.prototype.onReady = function onReady (cb, errorCb) {
    this.history.onReady(cb, errorCb);
  };

  VueRouter.prototype.onError = function onError (errorCb) {
    this.history.onError(errorCb);
  };

  VueRouter.prototype.push = function push (location, onComplete, onAbort) {
    this.history.push(location, onComplete, onAbort);
  };

  VueRouter.prototype.replace = function replace (location, onComplete, onAbort) {
    this.history.replace(location, onComplete, onAbort);
  };

  VueRouter.prototype.go = function go (n) {
    this.history.go(n);
  };

  VueRouter.prototype.back = function back () {
    this.go(-1);
  };

  VueRouter.prototype.forward = function forward () {
    this.go(1);
  };

  VueRouter.prototype.getMatchedComponents = function getMatchedComponents (to) {
    var route = to
      ? to.matched
        ? to
        : this.resolve(to).route
      : this.currentRoute;
    if (!route) {
      return []
    }
    return [].concat.apply([], route.matched.map(function (m) {
      return Object.keys(m.components).map(function (key) {
        return m.components[key]
      })
    }))
  };

  VueRouter.prototype.resolve = function resolve (
    to,
    current,
    append
  ) {
    var location = normalizeLocation(
      to,
      current || this.history.current,
      append,
      this
    );
    var route = this.match(location, current);
    var fullPath = route.redirectedFrom || route.fullPath;
    var base = this.history.base;
    var href = createHref(base, fullPath, this.mode);
    return {
      location: location,
      route: route,
      href: href,
      // for backwards compat
      normalizedTo: location,
      resolved: route
    }
  };

  VueRouter.prototype.addRoutes = function addRoutes (routes) {
    this.matcher.addRoutes(routes);
    if (this.history.current !== START) {
      this.history.transitionTo(this.history.getCurrentLocation());
    }
  };

  Object.defineProperties( VueRouter.prototype, prototypeAccessors );

  function registerHook (list, fn) {
    list.push(fn);
    return function () {
      var i = list.indexOf(fn);
      if (i > -1) { list.splice(i, 1); }
    }
  }

  function createHref (base, fullPath, mode) {
    var path = mode === 'hash' ? '#' + fullPath : fullPath;
    return base ? cleanPath(base + '/' + path) : path
  }

  VueRouter.install = install;
  VueRouter.version = '3.0.1';

  if (inBrowser && window.Vue) {
    window.Vue.use(VueRouter);
  }

  return VueRouter;

  })));

  // END C:\git\camlsql-js\src\app\js\vendor\vue-router\vue-router.js

  // BEGIN C:\git\camlsql-js\src\app\js\vendor\codemirror\codemirror.js*/
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: http://codemirror.net/LICENSE

  // This is CodeMirror (http://codemirror.net), a code editor
  // implemented in JavaScript on top of the browser's DOM.
  //
  // You can find some technical background for some of the code below
  // at http://marijnhaverbeke.nl/blog/#cm-internals .

  (function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global.CodeMirror = factory());
  }(this, (function () { 'use strict';

  // Kludges for bugs and behavior differences that can't be feature
  // detected are enabled based on userAgent etc sniffing.
  var userAgent = navigator.userAgent
  var platform = navigator.platform

  var gecko = /gecko\/\d/i.test(userAgent)
  var ie_upto10 = /MSIE \d/.test(userAgent)
  var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(userAgent)
  var edge = /Edge\/(\d+)/.exec(userAgent)
  var ie = ie_upto10 || ie_11up || edge
  var ie_version = ie && (ie_upto10 ? document.documentMode || 6 : +(edge || ie_11up)[1])
  var webkit = !edge && /WebKit\//.test(userAgent)
  var qtwebkit = webkit && /Qt\/\d+\.\d+/.test(userAgent)
  var chrome = !edge && /Chrome\//.test(userAgent)
  var presto = /Opera\//.test(userAgent)
  var safari = /Apple Computer/.test(navigator.vendor)
  var mac_geMountainLion = /Mac OS X 1\d\D([8-9]|\d\d)\D/.test(userAgent)
  var phantom = /PhantomJS/.test(userAgent)

  var ios = !edge && /AppleWebKit/.test(userAgent) && /Mobile\/\w+/.test(userAgent)
  var android = /Android/.test(userAgent)
  // This is woefully incomplete. Suggestions for alternative methods welcome.
  var mobile = ios || android || /webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(userAgent)
  var mac = ios || /Mac/.test(platform)
  var chromeOS = /\bCrOS\b/.test(userAgent)
  var windows = /win/i.test(platform)

  var presto_version = presto && userAgent.match(/Version\/(\d*\.\d*)/)
  if (presto_version) { presto_version = Number(presto_version[1]) }
  if (presto_version && presto_version >= 15) { presto = false; webkit = true }
  // Some browsers use the wrong event properties to signal cmd/ctrl on OS X
  var flipCtrlCmd = mac && (qtwebkit || presto && (presto_version == null || presto_version < 12.11))
  var captureRightClick = gecko || (ie && ie_version >= 9)

  function classTest(cls) { return new RegExp("(^|\\s)" + cls + "(?:$|\\s)\\s*") }

  var rmClass = function(node, cls) {
    var current = node.className
    var match = classTest(cls).exec(current)
    if (match) {
      var after = current.slice(match.index + match[0].length)
      node.className = current.slice(0, match.index) + (after ? match[1] + after : "")
    }
  }

  function removeChildren(e) {
    for (var count = e.childNodes.length; count > 0; --count)
      { e.removeChild(e.firstChild) }
    return e
  }

  function removeChildrenAndAdd(parent, e) {
    return removeChildren(parent).appendChild(e)
  }

  function elt(tag, content, className, style) {
    var e = document.createElement(tag)
    if (className) { e.className = className }
    if (style) { e.style.cssText = style }
    if (typeof content == "string") { e.appendChild(document.createTextNode(content)) }
    else if (content) { for (var i = 0; i < content.length; ++i) { e.appendChild(content[i]) } }
    return e
  }
  // wrapper for elt, which removes the elt from the accessibility tree
  function eltP(tag, content, className, style) {
    var e = elt(tag, content, className, style)
    e.setAttribute("role", "presentation")
    return e
  }

  var range
  if (document.createRange) { range = function(node, start, end, endNode) {
    var r = document.createRange()
    r.setEnd(endNode || node, end)
    r.setStart(node, start)
    return r
  } }
  else { range = function(node, start, end) {
    var r = document.body.createTextRange()
    try { r.moveToElementText(node.parentNode) }
    catch(e) { return r }
    r.collapse(true)
    r.moveEnd("character", end)
    r.moveStart("character", start)
    return r
  } }

  function contains(parent, child) {
    if (child.nodeType == 3) // Android browser always returns false when child is a textnode
      { child = child.parentNode }
    if (parent.contains)
      { return parent.contains(child) }
    do {
      if (child.nodeType == 11) { child = child.host }
      if (child == parent) { return true }
    } while (child = child.parentNode)
  }

  function activeElt() {
    // IE and Edge may throw an "Unspecified Error" when accessing document.activeElement.
    // IE < 10 will throw when accessed while the page is loading or in an iframe.
    // IE > 9 and Edge will throw when accessed in an iframe if document.body is unavailable.
    var activeElement
    try {
      activeElement = document.activeElement
    } catch(e) {
      activeElement = document.body || null
    }
    while (activeElement && activeElement.shadowRoot && activeElement.shadowRoot.activeElement)
      { activeElement = activeElement.shadowRoot.activeElement }
    return activeElement
  }

  function addClass(node, cls) {
    var current = node.className
    if (!classTest(cls).test(current)) { node.className += (current ? " " : "") + cls }
  }
  function joinClasses(a, b) {
    var as = a.split(" ")
    for (var i = 0; i < as.length; i++)
      { if (as[i] && !classTest(as[i]).test(b)) { b += " " + as[i] } }
    return b
  }

  var selectInput = function(node) { node.select() }
  if (ios) // Mobile Safari apparently has a bug where select() is broken.
    { selectInput = function(node) { node.selectionStart = 0; node.selectionEnd = node.value.length } }
  else if (ie) // Suppress mysterious IE10 errors
    { selectInput = function(node) { try { node.select() } catch(_e) {} } }

  function bind(f) {
    var args = Array.prototype.slice.call(arguments, 1)
    return function(){return f.apply(null, args)}
  }

  function copyObj(obj, target, overwrite) {
    if (!target) { target = {} }
    for (var prop in obj)
      { if (obj.hasOwnProperty(prop) && (overwrite !== false || !target.hasOwnProperty(prop)))
        { target[prop] = obj[prop] } }
    return target
  }

  // Counts the column offset in a string, taking tabs into account.
  // Used mostly to find indentation.
  function countColumn(string, end, tabSize, startIndex, startValue) {
    if (end == null) {
      end = string.search(/[^\s\u00a0]/)
      if (end == -1) { end = string.length }
    }
    for (var i = startIndex || 0, n = startValue || 0;;) {
      var nextTab = string.indexOf("\t", i)
      if (nextTab < 0 || nextTab >= end)
        { return n + (end - i) }
      n += nextTab - i
      n += tabSize - (n % tabSize)
      i = nextTab + 1
    }
  }

  var Delayed = function() {this.id = null};
  Delayed.prototype.set = function (ms, f) {
    clearTimeout(this.id)
    this.id = setTimeout(f, ms)
  };

  function indexOf(array, elt) {
    for (var i = 0; i < array.length; ++i)
      { if (array[i] == elt) { return i } }
    return -1
  }

  // Number of pixels added to scroller and sizer to hide scrollbar
  var scrollerGap = 30

  // Returned or thrown by various protocols to signal 'I'm not
  // handling this'.
  var Pass = {toString: function(){return "CodeMirror.Pass"}}

  // Reused option objects for setSelection & friends
  var sel_dontScroll = {scroll: false};
  var sel_mouse = {origin: "*mouse"};
  var sel_move = {origin: "+move"};
  // The inverse of countColumn -- find the offset that corresponds to
  // a particular column.
  function findColumn(string, goal, tabSize) {
    for (var pos = 0, col = 0;;) {
      var nextTab = string.indexOf("\t", pos)
      if (nextTab == -1) { nextTab = string.length }
      var skipped = nextTab - pos
      if (nextTab == string.length || col + skipped >= goal)
        { return pos + Math.min(skipped, goal - col) }
      col += nextTab - pos
      col += tabSize - (col % tabSize)
      pos = nextTab + 1
      if (col >= goal) { return pos }
    }
  }

  var spaceStrs = [""]
  function spaceStr(n) {
    while (spaceStrs.length <= n)
      { spaceStrs.push(lst(spaceStrs) + " ") }
    return spaceStrs[n]
  }

  function lst(arr) { return arr[arr.length-1] }

  function map(array, f) {
    var out = []
    for (var i = 0; i < array.length; i++) { out[i] = f(array[i], i) }
    return out
  }

  function insertSorted(array, value, score) {
    var pos = 0, priority = score(value)
    while (pos < array.length && score(array[pos]) <= priority) { pos++ }
    array.splice(pos, 0, value)
  }

  function nothing() {}

  function createObj(base, props) {
    var inst
    if (Object.create) {
      inst = Object.create(base)
    } else {
      nothing.prototype = base
      inst = new nothing()
    }
    if (props) { copyObj(props, inst) }
    return inst
  }

  var nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/
  function isWordCharBasic(ch) {
    return /\w/.test(ch) || ch > "\x80" &&
      (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch))
  }
  function isWordChar(ch, helper) {
    if (!helper) { return isWordCharBasic(ch) }
    if (helper.source.indexOf("\\w") > -1 && isWordCharBasic(ch)) { return true }
    return helper.test(ch)
  }

  function isEmpty(obj) {
    for (var n in obj) { if (obj.hasOwnProperty(n) && obj[n]) { return false } }
    return true
  }

  // Extending unicode characters. A series of a non-extending char +
  // any number of extending chars is treated as a single unit as far
  // as editing and measuring is concerned. This is not fully correct,
  // since some scripts/fonts/browsers also treat other configurations
  // of code points as a group.
  var extendingChars = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0900-\u0902\u093c\u0941-\u0948\u094d\u0951-\u0955\u0962\u0963\u0981\u09bc\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0a01\u0a02\u0a3c\u0a41\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a70\u0a71\u0a75\u0a81\u0a82\u0abc\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3\u0b01\u0b3c\u0b3e\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0cbc\u0cbf\u0cc2\u0cc6\u0ccc\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0dca\u0dcf\u0dd2-\u0dd4\u0dd6\u0ddf\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0f18\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86\u0f87\u0f90-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039\u103a\u103d\u103e\u1058\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085\u1086\u108d\u109d\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193b\u1a17\u1a18\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a7c\u1a7f\u1b00-\u1b03\u1b34\u1b36-\u1b3a\u1b3c\u1b42\u1b6b-\u1b73\u1b80\u1b81\u1ba2-\u1ba5\u1ba8\u1ba9\u1c2c-\u1c33\u1c36\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce0\u1ce2-\u1ce8\u1ced\u1dc0-\u1de6\u1dfd-\u1dff\u200c\u200d\u20d0-\u20f0\u2cef-\u2cf1\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua66f-\ua672\ua67c\ua67d\ua6f0\ua6f1\ua802\ua806\ua80b\ua825\ua826\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua951\ua980-\ua982\ua9b3\ua9b6-\ua9b9\ua9bc\uaa29-\uaa2e\uaa31\uaa32\uaa35\uaa36\uaa43\uaa4c\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uabe5\uabe8\uabed\udc00-\udfff\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\uff9e\uff9f]/
  function isExtendingChar(ch) { return ch.charCodeAt(0) >= 768 && extendingChars.test(ch) }

  // Returns a number from the range [`0`; `str.length`] unless `pos` is outside that range.
  function skipExtendingChars(str, pos, dir) {
    while ((dir < 0 ? pos > 0 : pos < str.length) && isExtendingChar(str.charAt(pos))) { pos += dir }
    return pos
  }

  // Returns the value from the range [`from`; `to`] that satisfies
  // `pred` and is closest to `from`. Assumes that at least `to`
  // satisfies `pred`. Supports `from` being greater than `to`.
  function findFirst(pred, from, to) {
    // At any point we are certain `to` satisfies `pred`, don't know
    // whether `from` does.
    var dir = from > to ? -1 : 1
    for (;;) {
      if (from == to) { return from }
      var midF = (from + to) / 2, mid = dir < 0 ? Math.ceil(midF) : Math.floor(midF)
      if (mid == from) { return pred(mid) ? from : to }
      if (pred(mid)) { to = mid }
      else { from = mid + dir }
    }
  }

  // The display handles the DOM integration, both for input reading
  // and content drawing. It holds references to DOM nodes and
  // display-related state.

  function Display(place, doc, input) {
    var d = this
    this.input = input

    // Covers bottom-right square when both scrollbars are present.
    d.scrollbarFiller = elt("div", null, "CodeMirror-scrollbar-filler")
    d.scrollbarFiller.setAttribute("cm-not-content", "true")
    // Covers bottom of gutter when coverGutterNextToScrollbar is on
    // and h scrollbar is present.
    d.gutterFiller = elt("div", null, "CodeMirror-gutter-filler")
    d.gutterFiller.setAttribute("cm-not-content", "true")
    // Will contain the actual code, positioned to cover the viewport.
    d.lineDiv = eltP("div", null, "CodeMirror-code")
    // Elements are added to these to represent selection and cursors.
    d.selectionDiv = elt("div", null, null, "position: relative; z-index: 1")
    d.cursorDiv = elt("div", null, "CodeMirror-cursors")
    // A visibility: hidden element used to find the size of things.
    d.measure = elt("div", null, "CodeMirror-measure")
    // When lines outside of the viewport are measured, they are drawn in this.
    d.lineMeasure = elt("div", null, "CodeMirror-measure")
    // Wraps everything that needs to exist inside the vertically-padded coordinate system
    d.lineSpace = eltP("div", [d.measure, d.lineMeasure, d.selectionDiv, d.cursorDiv, d.lineDiv],
                      null, "position: relative; outline: none")
    var lines = eltP("div", [d.lineSpace], "CodeMirror-lines")
    // Moved around its parent to cover visible view.
    d.mover = elt("div", [lines], null, "position: relative")
    // Set to the height of the document, allowing scrolling.
    d.sizer = elt("div", [d.mover], "CodeMirror-sizer")
    d.sizerWidth = null
    // Behavior of elts with overflow: auto and padding is
    // inconsistent across browsers. This is used to ensure the
    // scrollable area is big enough.
    d.heightForcer = elt("div", null, null, "position: absolute; height: " + scrollerGap + "px; width: 1px;")
    // Will contain the gutters, if any.
    d.gutters = elt("div", null, "CodeMirror-gutters")
    d.lineGutter = null
    // Actual scrollable element.
    d.scroller = elt("div", [d.sizer, d.heightForcer, d.gutters], "CodeMirror-scroll")
    d.scroller.setAttribute("tabIndex", "-1")
    // The element in which the editor lives.
    d.wrapper = elt("div", [d.scrollbarFiller, d.gutterFiller, d.scroller], "CodeMirror")

    // Work around IE7 z-index bug (not perfect, hence IE7 not really being supported)
    if (ie && ie_version < 8) { d.gutters.style.zIndex = -1; d.scroller.style.paddingRight = 0 }
    if (!webkit && !(gecko && mobile)) { d.scroller.draggable = true }

    if (place) {
      if (place.appendChild) { place.appendChild(d.wrapper) }
      else { place(d.wrapper) }
    }

    // Current rendered range (may be bigger than the view window).
    d.viewFrom = d.viewTo = doc.first
    d.reportedViewFrom = d.reportedViewTo = doc.first
    // Information about the rendered lines.
    d.view = []
    d.renderedView = null
    // Holds info about a single rendered line when it was rendered
    // for measurement, while not in view.
    d.externalMeasured = null
    // Empty space (in pixels) above the view
    d.viewOffset = 0
    d.lastWrapHeight = d.lastWrapWidth = 0
    d.updateLineNumbers = null

    d.nativeBarWidth = d.barHeight = d.barWidth = 0
    d.scrollbarsClipped = false

    // Used to only resize the line number gutter when necessary (when
    // the amount of lines crosses a boundary that makes its width change)
    d.lineNumWidth = d.lineNumInnerWidth = d.lineNumChars = null
    // Set to true when a non-horizontal-scrolling line widget is
    // added. As an optimization, line widget aligning is skipped when
    // this is false.
    d.alignWidgets = false

    d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null

    // Tracks the maximum line length so that the horizontal scrollbar
    // can be kept static when scrolling.
    d.maxLine = null
    d.maxLineLength = 0
    d.maxLineChanged = false

    // Used for measuring wheel scrolling granularity
    d.wheelDX = d.wheelDY = d.wheelStartX = d.wheelStartY = null

    // True when shift is held down.
    d.shift = false

    // Used to track whether anything happened since the context menu
    // was opened.
    d.selForContextMenu = null

    d.activeTouch = null

    input.init(d)
  }

  // Find the line object corresponding to the given line number.
  function getLine(doc, n) {
    n -= doc.first
    if (n < 0 || n >= doc.size) { throw new Error("There is no line " + (n + doc.first) + " in the document.") }
    var chunk = doc
    while (!chunk.lines) {
      for (var i = 0;; ++i) {
        var child = chunk.children[i], sz = child.chunkSize()
        if (n < sz) { chunk = child; break }
        n -= sz
      }
    }
    return chunk.lines[n]
  }

  // Get the part of a document between two positions, as an array of
  // strings.
  function getBetween(doc, start, end) {
    var out = [], n = start.line
    doc.iter(start.line, end.line + 1, function (line) {
      var text = line.text
      if (n == end.line) { text = text.slice(0, end.ch) }
      if (n == start.line) { text = text.slice(start.ch) }
      out.push(text)
      ++n
    })
    return out
  }
  // Get the lines between from and to, as array of strings.
  function getLines(doc, from, to) {
    var out = []
    doc.iter(from, to, function (line) { out.push(line.text) }) // iter aborts when callback returns truthy value
    return out
  }

  // Update the height of a line, propagating the height change
  // upwards to parent nodes.
  function updateLineHeight(line, height) {
    var diff = height - line.height
    if (diff) { for (var n = line; n; n = n.parent) { n.height += diff } }
  }

  // Given a line object, find its line number by walking up through
  // its parent links.
  function lineNo(line) {
    if (line.parent == null) { return null }
    var cur = line.parent, no = indexOf(cur.lines, line)
    for (var chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
      for (var i = 0;; ++i) {
        if (chunk.children[i] == cur) { break }
        no += chunk.children[i].chunkSize()
      }
    }
    return no + cur.first
  }

  // Find the line at the given vertical position, using the height
  // information in the document tree.
  function lineAtHeight(chunk, h) {
    var n = chunk.first
    outer: do {
      for (var i$1 = 0; i$1 < chunk.children.length; ++i$1) {
        var child = chunk.children[i$1], ch = child.height
        if (h < ch) { chunk = child; continue outer }
        h -= ch
        n += child.chunkSize()
      }
      return n
    } while (!chunk.lines)
    var i = 0
    for (; i < chunk.lines.length; ++i) {
      var line = chunk.lines[i], lh = line.height
      if (h < lh) { break }
      h -= lh
    }
    return n + i
  }

  function isLine(doc, l) {return l >= doc.first && l < doc.first + doc.size}

  function lineNumberFor(options, i) {
    return String(options.lineNumberFormatter(i + options.firstLineNumber))
  }

  // A Pos instance represents a position within the text.
  function Pos(line, ch, sticky) {
    if ( sticky === void 0 ) sticky = null;

    if (!(this instanceof Pos)) { return new Pos(line, ch, sticky) }
    this.line = line
    this.ch = ch
    this.sticky = sticky
  }

  // Compare two positions, return 0 if they are the same, a negative
  // number when a is less, and a positive number otherwise.
  function cmp(a, b) { return a.line - b.line || a.ch - b.ch }

  function equalCursorPos(a, b) { return a.sticky == b.sticky && cmp(a, b) == 0 }

  function copyPos(x) {return Pos(x.line, x.ch)}
  function maxPos(a, b) { return cmp(a, b) < 0 ? b : a }
  function minPos(a, b) { return cmp(a, b) < 0 ? a : b }

  // Most of the external API clips given positions to make sure they
  // actually exist within the document.
  function clipLine(doc, n) {return Math.max(doc.first, Math.min(n, doc.first + doc.size - 1))}
  function clipPos(doc, pos) {
    if (pos.line < doc.first) { return Pos(doc.first, 0) }
    var last = doc.first + doc.size - 1
    if (pos.line > last) { return Pos(last, getLine(doc, last).text.length) }
    return clipToLen(pos, getLine(doc, pos.line).text.length)
  }
  function clipToLen(pos, linelen) {
    var ch = pos.ch
    if (ch == null || ch > linelen) { return Pos(pos.line, linelen) }
    else if (ch < 0) { return Pos(pos.line, 0) }
    else { return pos }
  }
  function clipPosArray(doc, array) {
    var out = []
    for (var i = 0; i < array.length; i++) { out[i] = clipPos(doc, array[i]) }
    return out
  }

  // Optimize some code when these features are not used.
  var sawReadOnlySpans = false;
  var sawCollapsedSpans = false;
  function seeReadOnlySpans() {
    sawReadOnlySpans = true
  }

  function seeCollapsedSpans() {
    sawCollapsedSpans = true
  }

  // TEXTMARKER SPANS

  function MarkedSpan(marker, from, to) {
    this.marker = marker
    this.from = from; this.to = to
  }

  // Search an array of spans for a span matching the given marker.
  function getMarkedSpanFor(spans, marker) {
    if (spans) { for (var i = 0; i < spans.length; ++i) {
      var span = spans[i]
      if (span.marker == marker) { return span }
    } }
  }
  // Remove a span from an array, returning undefined if no spans are
  // left (we don't store arrays for lines without spans).
  function removeMarkedSpan(spans, span) {
    var r
    for (var i = 0; i < spans.length; ++i)
      { if (spans[i] != span) { (r || (r = [])).push(spans[i]) } }
    return r
  }
  // Add a span to a line.
  function addMarkedSpan(line, span) {
    line.markedSpans = line.markedSpans ? line.markedSpans.concat([span]) : [span]
    span.marker.attachLine(line)
  }

  // Used for the algorithm that adjusts markers for a change in the
  // document. These functions cut an array of spans at a given
  // character position, returning an array of remaining chunks (or
  // undefined if nothing remains).
  function markedSpansBefore(old, startCh, isInsert) {
    var nw
    if (old) { for (var i = 0; i < old.length; ++i) {
      var span = old[i], marker = span.marker
      var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= startCh : span.from < startCh)
      if (startsBefore || span.from == startCh && marker.type == "bookmark" && (!isInsert || !span.marker.insertLeft)) {
        var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= startCh : span.to > startCh)
        ;(nw || (nw = [])).push(new MarkedSpan(marker, span.from, endsAfter ? null : span.to))
      }
    } }
    return nw
  }
  function markedSpansAfter(old, endCh, isInsert) {
    var nw
    if (old) { for (var i = 0; i < old.length; ++i) {
      var span = old[i], marker = span.marker
      var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= endCh : span.to > endCh)
      if (endsAfter || span.from == endCh && marker.type == "bookmark" && (!isInsert || span.marker.insertLeft)) {
        var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= endCh : span.from < endCh)
        ;(nw || (nw = [])).push(new MarkedSpan(marker, startsBefore ? null : span.from - endCh,
                                              span.to == null ? null : span.to - endCh))
      }
    } }
    return nw
  }

  // Given a change object, compute the new set of marker spans that
  // cover the line in which the change took place. Removes spans
  // entirely within the change, reconnects spans belonging to the
  // same marker that appear on both sides of the change, and cuts off
  // spans partially within the change. Returns an array of span
  // arrays with one element for each line in (after) the change.
  function stretchSpansOverChange(doc, change) {
    if (change.full) { return null }
    var oldFirst = isLine(doc, change.from.line) && getLine(doc, change.from.line).markedSpans
    var oldLast = isLine(doc, change.to.line) && getLine(doc, change.to.line).markedSpans
    if (!oldFirst && !oldLast) { return null }

    var startCh = change.from.ch, endCh = change.to.ch, isInsert = cmp(change.from, change.to) == 0
    // Get the spans that 'stick out' on both sides
    var first = markedSpansBefore(oldFirst, startCh, isInsert)
    var last = markedSpansAfter(oldLast, endCh, isInsert)

    // Next, merge those two ends
    var sameLine = change.text.length == 1, offset = lst(change.text).length + (sameLine ? startCh : 0)
    if (first) {
      // Fix up .to properties of first
      for (var i = 0; i < first.length; ++i) {
        var span = first[i]
        if (span.to == null) {
          var found = getMarkedSpanFor(last, span.marker)
          if (!found) { span.to = startCh }
          else if (sameLine) { span.to = found.to == null ? null : found.to + offset }
        }
      }
    }
    if (last) {
      // Fix up .from in last (or move them into first in case of sameLine)
      for (var i$1 = 0; i$1 < last.length; ++i$1) {
        var span$1 = last[i$1]
        if (span$1.to != null) { span$1.to += offset }
        if (span$1.from == null) {
          var found$1 = getMarkedSpanFor(first, span$1.marker)
          if (!found$1) {
            span$1.from = offset
            if (sameLine) { (first || (first = [])).push(span$1) }
          }
        } else {
          span$1.from += offset
          if (sameLine) { (first || (first = [])).push(span$1) }
        }
      }
    }
    // Make sure we didn't create any zero-length spans
    if (first) { first = clearEmptySpans(first) }
    if (last && last != first) { last = clearEmptySpans(last) }

    var newMarkers = [first]
    if (!sameLine) {
      // Fill gap with whole-line-spans
      var gap = change.text.length - 2, gapMarkers
      if (gap > 0 && first)
        { for (var i$2 = 0; i$2 < first.length; ++i$2)
          { if (first[i$2].to == null)
            { (gapMarkers || (gapMarkers = [])).push(new MarkedSpan(first[i$2].marker, null, null)) } } }
      for (var i$3 = 0; i$3 < gap; ++i$3)
        { newMarkers.push(gapMarkers) }
      newMarkers.push(last)
    }
    return newMarkers
  }

  // Remove spans that are empty and don't have a clearWhenEmpty
  // option of false.
  function clearEmptySpans(spans) {
    for (var i = 0; i < spans.length; ++i) {
      var span = spans[i]
      if (span.from != null && span.from == span.to && span.marker.clearWhenEmpty !== false)
        { spans.splice(i--, 1) }
    }
    if (!spans.length) { return null }
    return spans
  }

  // Used to 'clip' out readOnly ranges when making a change.
  function removeReadOnlyRanges(doc, from, to) {
    var markers = null
    doc.iter(from.line, to.line + 1, function (line) {
      if (line.markedSpans) { for (var i = 0; i < line.markedSpans.length; ++i) {
        var mark = line.markedSpans[i].marker
        if (mark.readOnly && (!markers || indexOf(markers, mark) == -1))
          { (markers || (markers = [])).push(mark) }
      } }
    })
    if (!markers) { return null }
    var parts = [{from: from, to: to}]
    for (var i = 0; i < markers.length; ++i) {
      var mk = markers[i], m = mk.find(0)
      for (var j = 0; j < parts.length; ++j) {
        var p = parts[j]
        if (cmp(p.to, m.from) < 0 || cmp(p.from, m.to) > 0) { continue }
        var newParts = [j, 1], dfrom = cmp(p.from, m.from), dto = cmp(p.to, m.to)
        if (dfrom < 0 || !mk.inclusiveLeft && !dfrom)
          { newParts.push({from: p.from, to: m.from}) }
        if (dto > 0 || !mk.inclusiveRight && !dto)
          { newParts.push({from: m.to, to: p.to}) }
        parts.splice.apply(parts, newParts)
        j += newParts.length - 3
      }
    }
    return parts
  }

  // Connect or disconnect spans from a line.
  function detachMarkedSpans(line) {
    var spans = line.markedSpans
    if (!spans) { return }
    for (var i = 0; i < spans.length; ++i)
      { spans[i].marker.detachLine(line) }
    line.markedSpans = null
  }
  function attachMarkedSpans(line, spans) {
    if (!spans) { return }
    for (var i = 0; i < spans.length; ++i)
      { spans[i].marker.attachLine(line) }
    line.markedSpans = spans
  }

  // Helpers used when computing which overlapping collapsed span
  // counts as the larger one.
  function extraLeft(marker) { return marker.inclusiveLeft ? -1 : 0 }
  function extraRight(marker) { return marker.inclusiveRight ? 1 : 0 }

  // Returns a number indicating which of two overlapping collapsed
  // spans is larger (and thus includes the other). Falls back to
  // comparing ids when the spans cover exactly the same range.
  function compareCollapsedMarkers(a, b) {
    var lenDiff = a.lines.length - b.lines.length
    if (lenDiff != 0) { return lenDiff }
    var aPos = a.find(), bPos = b.find()
    var fromCmp = cmp(aPos.from, bPos.from) || extraLeft(a) - extraLeft(b)
    if (fromCmp) { return -fromCmp }
    var toCmp = cmp(aPos.to, bPos.to) || extraRight(a) - extraRight(b)
    if (toCmp) { return toCmp }
    return b.id - a.id
  }

  // Find out whether a line ends or starts in a collapsed span. If
  // so, return the marker for that span.
  function collapsedSpanAtSide(line, start) {
    var sps = sawCollapsedSpans && line.markedSpans, found
    if (sps) { for (var sp = (void 0), i = 0; i < sps.length; ++i) {
      sp = sps[i]
      if (sp.marker.collapsed && (start ? sp.from : sp.to) == null &&
          (!found || compareCollapsedMarkers(found, sp.marker) < 0))
        { found = sp.marker }
    } }
    return found
  }
  function collapsedSpanAtStart(line) { return collapsedSpanAtSide(line, true) }
  function collapsedSpanAtEnd(line) { return collapsedSpanAtSide(line, false) }

  // Test whether there exists a collapsed span that partially
  // overlaps (covers the start or end, but not both) of a new span.
  // Such overlap is not allowed.
  function conflictingCollapsedRange(doc, lineNo, from, to, marker) {
    var line = getLine(doc, lineNo)
    var sps = sawCollapsedSpans && line.markedSpans
    if (sps) { for (var i = 0; i < sps.length; ++i) {
      var sp = sps[i]
      if (!sp.marker.collapsed) { continue }
      var found = sp.marker.find(0)
      var fromCmp = cmp(found.from, from) || extraLeft(sp.marker) - extraLeft(marker)
      var toCmp = cmp(found.to, to) || extraRight(sp.marker) - extraRight(marker)
      if (fromCmp >= 0 && toCmp <= 0 || fromCmp <= 0 && toCmp >= 0) { continue }
      if (fromCmp <= 0 && (sp.marker.inclusiveRight && marker.inclusiveLeft ? cmp(found.to, from) >= 0 : cmp(found.to, from) > 0) ||
          fromCmp >= 0 && (sp.marker.inclusiveRight && marker.inclusiveLeft ? cmp(found.from, to) <= 0 : cmp(found.from, to) < 0))
        { return true }
    } }
  }

  // A visual line is a line as drawn on the screen. Folding, for
  // example, can cause multiple logical lines to appear on the same
  // visual line. This finds the start of the visual line that the
  // given line is part of (usually that is the line itself).
  function visualLine(line) {
    var merged
    while (merged = collapsedSpanAtStart(line))
      { line = merged.find(-1, true).line }
    return line
  }

  function visualLineEnd(line) {
    var merged
    while (merged = collapsedSpanAtEnd(line))
      { line = merged.find(1, true).line }
    return line
  }

  // Returns an array of logical lines that continue the visual line
  // started by the argument, or undefined if there are no such lines.
  function visualLineContinued(line) {
    var merged, lines
    while (merged = collapsedSpanAtEnd(line)) {
      line = merged.find(1, true).line
      ;(lines || (lines = [])).push(line)
    }
    return lines
  }

  // Get the line number of the start of the visual line that the
  // given line number is part of.
  function visualLineNo(doc, lineN) {
    var line = getLine(doc, lineN), vis = visualLine(line)
    if (line == vis) { return lineN }
    return lineNo(vis)
  }

  // Get the line number of the start of the next visual line after
  // the given line.
  function visualLineEndNo(doc, lineN) {
    if (lineN > doc.lastLine()) { return lineN }
    var line = getLine(doc, lineN), merged
    if (!lineIsHidden(doc, line)) { return lineN }
    while (merged = collapsedSpanAtEnd(line))
      { line = merged.find(1, true).line }
    return lineNo(line) + 1
  }

  // Compute whether a line is hidden. Lines count as hidden when they
  // are part of a visual line that starts with another line, or when
  // they are entirely covered by collapsed, non-widget span.
  function lineIsHidden(doc, line) {
    var sps = sawCollapsedSpans && line.markedSpans
    if (sps) { for (var sp = (void 0), i = 0; i < sps.length; ++i) {
      sp = sps[i]
      if (!sp.marker.collapsed) { continue }
      if (sp.from == null) { return true }
      if (sp.marker.widgetNode) { continue }
      if (sp.from == 0 && sp.marker.inclusiveLeft && lineIsHiddenInner(doc, line, sp))
        { return true }
    } }
  }
  function lineIsHiddenInner(doc, line, span) {
    if (span.to == null) {
      var end = span.marker.find(1, true)
      return lineIsHiddenInner(doc, end.line, getMarkedSpanFor(end.line.markedSpans, span.marker))
    }
    if (span.marker.inclusiveRight && span.to == line.text.length)
      { return true }
    for (var sp = (void 0), i = 0; i < line.markedSpans.length; ++i) {
      sp = line.markedSpans[i]
      if (sp.marker.collapsed && !sp.marker.widgetNode && sp.from == span.to &&
          (sp.to == null || sp.to != span.from) &&
          (sp.marker.inclusiveLeft || span.marker.inclusiveRight) &&
          lineIsHiddenInner(doc, line, sp)) { return true }
    }
  }

  // Find the height above the given line.
  function heightAtLine(lineObj) {
    lineObj = visualLine(lineObj)

    var h = 0, chunk = lineObj.parent
    for (var i = 0; i < chunk.lines.length; ++i) {
      var line = chunk.lines[i]
      if (line == lineObj) { break }
      else { h += line.height }
    }
    for (var p = chunk.parent; p; chunk = p, p = chunk.parent) {
      for (var i$1 = 0; i$1 < p.children.length; ++i$1) {
        var cur = p.children[i$1]
        if (cur == chunk) { break }
        else { h += cur.height }
      }
    }
    return h
  }

  // Compute the character length of a line, taking into account
  // collapsed ranges (see markText) that might hide parts, and join
  // other lines onto it.
  function lineLength(line) {
    if (line.height == 0) { return 0 }
    var len = line.text.length, merged, cur = line
    while (merged = collapsedSpanAtStart(cur)) {
      var found = merged.find(0, true)
      cur = found.from.line
      len += found.from.ch - found.to.ch
    }
    cur = line
    while (merged = collapsedSpanAtEnd(cur)) {
      var found$1 = merged.find(0, true)
      len -= cur.text.length - found$1.from.ch
      cur = found$1.to.line
      len += cur.text.length - found$1.to.ch
    }
    return len
  }

  // Find the longest line in the document.
  function findMaxLine(cm) {
    var d = cm.display, doc = cm.doc
    d.maxLine = getLine(doc, doc.first)
    d.maxLineLength = lineLength(d.maxLine)
    d.maxLineChanged = true
    doc.iter(function (line) {
      var len = lineLength(line)
      if (len > d.maxLineLength) {
        d.maxLineLength = len
        d.maxLine = line
      }
    })
  }

  // BIDI HELPERS

  function iterateBidiSections(order, from, to, f) {
    if (!order) { return f(from, to, "ltr", 0) }
    var found = false
    for (var i = 0; i < order.length; ++i) {
      var part = order[i]
      if (part.from < to && part.to > from || from == to && part.to == from) {
        f(Math.max(part.from, from), Math.min(part.to, to), part.level == 1 ? "rtl" : "ltr", i)
        found = true
      }
    }
    if (!found) { f(from, to, "ltr") }
  }

  var bidiOther = null
  function getBidiPartAt(order, ch, sticky) {
    var found
    bidiOther = null
    for (var i = 0; i < order.length; ++i) {
      var cur = order[i]
      if (cur.from < ch && cur.to > ch) { return i }
      if (cur.to == ch) {
        if (cur.from != cur.to && sticky == "before") { found = i }
        else { bidiOther = i }
      }
      if (cur.from == ch) {
        if (cur.from != cur.to && sticky != "before") { found = i }
        else { bidiOther = i }
      }
    }
    return found != null ? found : bidiOther
  }

  // Bidirectional ordering algorithm
  // See http://unicode.org/reports/tr9/tr9-13.html for the algorithm
  // that this (partially) implements.

  // One-char codes used for character types:
  // L (L):   Left-to-Right
  // R (R):   Right-to-Left
  // r (AL):  Right-to-Left Arabic
  // 1 (EN):  European Number
  // + (ES):  European Number Separator
  // % (ET):  European Number Terminator
  // n (AN):  Arabic Number
  // , (CS):  Common Number Separator
  // m (NSM): Non-Spacing Mark
  // b (BN):  Boundary Neutral
  // s (B):   Paragraph Separator
  // t (S):   Segment Separator
  // w (WS):  Whitespace
  // N (ON):  Other Neutrals

  // Returns null if characters are ordered as they appear
  // (left-to-right), or an array of sections ({from, to, level}
  // objects) in the order in which they occur visually.
  var bidiOrdering = (function() {
    // Character types for codepoints 0 to 0xff
    var lowTypes = "bbbbbbbbbtstwsbbbbbbbbbbbbbbssstwNN%%%NNNNNN,N,N1111111111NNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNbbbbbbsbbbbbbbbbbbbbbbbbbbbbbbbbb,N%%%%NNNNLNNNNN%%11NLNNN1LNNNNNLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLN"
    // Character types for codepoints 0x600 to 0x6f9
    var arabicTypes = "nnnnnnNNr%%r,rNNmmmmmmmmmmmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmmmmmmmmnnnnnnnnnn%nnrrrmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmnNmmmmmmrrmmNmmmmrr1111111111"
    function charType(code) {
      if (code <= 0xf7) { return lowTypes.charAt(code) }
      else if (0x590 <= code && code <= 0x5f4) { return "R" }
      else if (0x600 <= code && code <= 0x6f9) { return arabicTypes.charAt(code - 0x600) }
      else if (0x6ee <= code && code <= 0x8ac) { return "r" }
      else if (0x2000 <= code && code <= 0x200b) { return "w" }
      else if (code == 0x200c) { return "b" }
      else { return "L" }
    }

    var bidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/
    var isNeutral = /[stwN]/, isStrong = /[LRr]/, countsAsLeft = /[Lb1n]/, countsAsNum = /[1n]/

    function BidiSpan(level, from, to) {
      this.level = level
      this.from = from; this.to = to
    }

    return function(str, direction) {
      var outerType = direction == "ltr" ? "L" : "R"

      if (str.length == 0 || direction == "ltr" && !bidiRE.test(str)) { return false }
      var len = str.length, types = []
      for (var i = 0; i < len; ++i)
        { types.push(charType(str.charCodeAt(i))) }

      // W1. Examine each non-spacing mark (NSM) in the level run, and
      // change the type of the NSM to the type of the previous
      // character. If the NSM is at the start of the level run, it will
      // get the type of sor.
      for (var i$1 = 0, prev = outerType; i$1 < len; ++i$1) {
        var type = types[i$1]
        if (type == "m") { types[i$1] = prev }
        else { prev = type }
      }

      // W2. Search backwards from each instance of a European number
      // until the first strong type (R, L, AL, or sor) is found. If an
      // AL is found, change the type of the European number to Arabic
      // number.
      // W3. Change all ALs to R.
      for (var i$2 = 0, cur = outerType; i$2 < len; ++i$2) {
        var type$1 = types[i$2]
        if (type$1 == "1" && cur == "r") { types[i$2] = "n" }
        else if (isStrong.test(type$1)) { cur = type$1; if (type$1 == "r") { types[i$2] = "R" } }
      }

      // W4. A single European separator between two European numbers
      // changes to a European number. A single common separator between
      // two numbers of the same type changes to that type.
      for (var i$3 = 1, prev$1 = types[0]; i$3 < len - 1; ++i$3) {
        var type$2 = types[i$3]
        if (type$2 == "+" && prev$1 == "1" && types[i$3+1] == "1") { types[i$3] = "1" }
        else if (type$2 == "," && prev$1 == types[i$3+1] &&
                 (prev$1 == "1" || prev$1 == "n")) { types[i$3] = prev$1 }
        prev$1 = type$2
      }

      // W5. A sequence of European terminators adjacent to European
      // numbers changes to all European numbers.
      // W6. Otherwise, separators and terminators change to Other
      // Neutral.
      for (var i$4 = 0; i$4 < len; ++i$4) {
        var type$3 = types[i$4]
        if (type$3 == ",") { types[i$4] = "N" }
        else if (type$3 == "%") {
          var end = (void 0)
          for (end = i$4 + 1; end < len && types[end] == "%"; ++end) {}
          var replace = (i$4 && types[i$4-1] == "!") || (end < len && types[end] == "1") ? "1" : "N"
          for (var j = i$4; j < end; ++j) { types[j] = replace }
          i$4 = end - 1
        }
      }

      // W7. Search backwards from each instance of a European number
      // until the first strong type (R, L, or sor) is found. If an L is
      // found, then change the type of the European number to L.
      for (var i$5 = 0, cur$1 = outerType; i$5 < len; ++i$5) {
        var type$4 = types[i$5]
        if (cur$1 == "L" && type$4 == "1") { types[i$5] = "L" }
        else if (isStrong.test(type$4)) { cur$1 = type$4 }
      }

      // N1. A sequence of neutrals takes the direction of the
      // surrounding strong text if the text on both sides has the same
      // direction. European and Arabic numbers act as if they were R in
      // terms of their influence on neutrals. Start-of-level-run (sor)
      // and end-of-level-run (eor) are used at level run boundaries.
      // N2. Any remaining neutrals take the embedding direction.
      for (var i$6 = 0; i$6 < len; ++i$6) {
        if (isNeutral.test(types[i$6])) {
          var end$1 = (void 0)
          for (end$1 = i$6 + 1; end$1 < len && isNeutral.test(types[end$1]); ++end$1) {}
          var before = (i$6 ? types[i$6-1] : outerType) == "L"
          var after = (end$1 < len ? types[end$1] : outerType) == "L"
          var replace$1 = before == after ? (before ? "L" : "R") : outerType
          for (var j$1 = i$6; j$1 < end$1; ++j$1) { types[j$1] = replace$1 }
          i$6 = end$1 - 1
        }
      }

      // Here we depart from the documented algorithm, in order to avoid
      // building up an actual levels array. Since there are only three
      // levels (0, 1, 2) in an implementation that doesn't take
      // explicit embedding into account, we can build up the order on
      // the fly, without following the level-based algorithm.
      var order = [], m
      for (var i$7 = 0; i$7 < len;) {
        if (countsAsLeft.test(types[i$7])) {
          var start = i$7
          for (++i$7; i$7 < len && countsAsLeft.test(types[i$7]); ++i$7) {}
          order.push(new BidiSpan(0, start, i$7))
        } else {
          var pos = i$7, at = order.length
          for (++i$7; i$7 < len && types[i$7] != "L"; ++i$7) {}
          for (var j$2 = pos; j$2 < i$7;) {
            if (countsAsNum.test(types[j$2])) {
              if (pos < j$2) { order.splice(at, 0, new BidiSpan(1, pos, j$2)) }
              var nstart = j$2
              for (++j$2; j$2 < i$7 && countsAsNum.test(types[j$2]); ++j$2) {}
              order.splice(at, 0, new BidiSpan(2, nstart, j$2))
              pos = j$2
            } else { ++j$2 }
          }
          if (pos < i$7) { order.splice(at, 0, new BidiSpan(1, pos, i$7)) }
        }
      }
      if (direction == "ltr") {
        if (order[0].level == 1 && (m = str.match(/^\s+/))) {
          order[0].from = m[0].length
          order.unshift(new BidiSpan(0, 0, m[0].length))
        }
        if (lst(order).level == 1 && (m = str.match(/\s+$/))) {
          lst(order).to -= m[0].length
          order.push(new BidiSpan(0, len - m[0].length, len))
        }
      }

      return direction == "rtl" ? order.reverse() : order
    }
  })()

  // Get the bidi ordering for the given line (and cache it). Returns
  // false for lines that are fully left-to-right, and an array of
  // BidiSpan objects otherwise.
  function getOrder(line, direction) {
    var order = line.order
    if (order == null) { order = line.order = bidiOrdering(line.text, direction) }
    return order
  }

  // EVENT HANDLING

  // Lightweight event framework. on/off also work on DOM nodes,
  // registering native DOM handlers.

  var noHandlers = []

  var on = function(emitter, type, f) {
    if (emitter.addEventListener) {
      emitter.addEventListener(type, f, false)
    } else if (emitter.attachEvent) {
      emitter.attachEvent("on" + type, f)
    } else {
      var map = emitter._handlers || (emitter._handlers = {})
      map[type] = (map[type] || noHandlers).concat(f)
    }
  }

  function getHandlers(emitter, type) {
    return emitter._handlers && emitter._handlers[type] || noHandlers
  }

  function off(emitter, type, f) {
    if (emitter.removeEventListener) {
      emitter.removeEventListener(type, f, false)
    } else if (emitter.detachEvent) {
      emitter.detachEvent("on" + type, f)
    } else {
      var map = emitter._handlers, arr = map && map[type]
      if (arr) {
        var index = indexOf(arr, f)
        if (index > -1)
          { map[type] = arr.slice(0, index).concat(arr.slice(index + 1)) }
      }
    }
  }

  function signal(emitter, type /*, values...*/) {
    var handlers = getHandlers(emitter, type)
    if (!handlers.length) { return }
    var args = Array.prototype.slice.call(arguments, 2)
    for (var i = 0; i < handlers.length; ++i) { handlers[i].apply(null, args) }
  }

  // The DOM events that CodeMirror handles can be overridden by
  // registering a (non-DOM) handler on the editor for the event name,
  // and preventDefault-ing the event in that handler.
  function signalDOMEvent(cm, e, override) {
    if (typeof e == "string")
      { e = {type: e, preventDefault: function() { this.defaultPrevented = true }} }
    signal(cm, override || e.type, cm, e)
    return e_defaultPrevented(e) || e.codemirrorIgnore
  }

  function signalCursorActivity(cm) {
    var arr = cm._handlers && cm._handlers.cursorActivity
    if (!arr) { return }
    var set = cm.curOp.cursorActivityHandlers || (cm.curOp.cursorActivityHandlers = [])
    for (var i = 0; i < arr.length; ++i) { if (indexOf(set, arr[i]) == -1)
      { set.push(arr[i]) } }
  }

  function hasHandler(emitter, type) {
    return getHandlers(emitter, type).length > 0
  }

  // Add on and off methods to a constructor's prototype, to make
  // registering events on such objects more convenient.
  function eventMixin(ctor) {
    ctor.prototype.on = function(type, f) {on(this, type, f)}
    ctor.prototype.off = function(type, f) {off(this, type, f)}
  }

  // Due to the fact that we still support jurassic IE versions, some
  // compatibility wrappers are needed.

  function e_preventDefault(e) {
    if (e.preventDefault) { e.preventDefault() }
    else { e.returnValue = false }
  }
  function e_stopPropagation(e) {
    if (e.stopPropagation) { e.stopPropagation() }
    else { e.cancelBubble = true }
  }
  function e_defaultPrevented(e) {
    return e.defaultPrevented != null ? e.defaultPrevented : e.returnValue == false
  }
  function e_stop(e) {e_preventDefault(e); e_stopPropagation(e)}

  function e_target(e) {return e.target || e.srcElement}
  function e_button(e) {
    var b = e.which
    if (b == null) {
      if (e.button & 1) { b = 1 }
      else if (e.button & 2) { b = 3 }
      else if (e.button & 4) { b = 2 }
    }
    if (mac && e.ctrlKey && b == 1) { b = 3 }
    return b
  }

  // Detect drag-and-drop
  var dragAndDrop = function() {
    // There is *some* kind of drag-and-drop support in IE6-8, but I
    // couldn't get it to work yet.
    if (ie && ie_version < 9) { return false }
    var div = elt('div')
    return "draggable" in div || "dragDrop" in div
  }()

  var zwspSupported
  function zeroWidthElement(measure) {
    if (zwspSupported == null) {
      var test = elt("span", "\u200b")
      removeChildrenAndAdd(measure, elt("span", [test, document.createTextNode("x")]))
      if (measure.firstChild.offsetHeight != 0)
        { zwspSupported = test.offsetWidth <= 1 && test.offsetHeight > 2 && !(ie && ie_version < 8) }
    }
    var node = zwspSupported ? elt("span", "\u200b") :
      elt("span", "\u00a0", null, "display: inline-block; width: 1px; margin-right: -1px")
    node.setAttribute("cm-text", "")
    return node
  }

  // Feature-detect IE's crummy client rect reporting for bidi text
  var badBidiRects
  function hasBadBidiRects(measure) {
    if (badBidiRects != null) { return badBidiRects }
    var txt = removeChildrenAndAdd(measure, document.createTextNode("A\u062eA"))
    var r0 = range(txt, 0, 1).getBoundingClientRect()
    var r1 = range(txt, 1, 2).getBoundingClientRect()
    removeChildren(measure)
    if (!r0 || r0.left == r0.right) { return false } // Safari returns null in some cases (#2780)
    return badBidiRects = (r1.right - r0.right < 3)
  }

  // See if "".split is the broken IE version, if so, provide an
  // alternative way to split lines.
  var splitLinesAuto = "\n\nb".split(/\n/).length != 3 ? function (string) {
    var pos = 0, result = [], l = string.length
    while (pos <= l) {
      var nl = string.indexOf("\n", pos)
      if (nl == -1) { nl = string.length }
      var line = string.slice(pos, string.charAt(nl - 1) == "\r" ? nl - 1 : nl)
      var rt = line.indexOf("\r")
      if (rt != -1) {
        result.push(line.slice(0, rt))
        pos += rt + 1
      } else {
        result.push(line)
        pos = nl + 1
      }
    }
    return result
  } : function (string) { return string.split(/\r\n?|\n/); }

  var hasSelection = window.getSelection ? function (te) {
    try { return te.selectionStart != te.selectionEnd }
    catch(e) { return false }
  } : function (te) {
    var range
    try {range = te.ownerDocument.selection.createRange()}
    catch(e) {}
    if (!range || range.parentElement() != te) { return false }
    return range.compareEndPoints("StartToEnd", range) != 0
  }

  var hasCopyEvent = (function () {
    var e = elt("div")
    if ("oncopy" in e) { return true }
    e.setAttribute("oncopy", "return;")
    return typeof e.oncopy == "function"
  })()

  var badZoomedRects = null
  function hasBadZoomedRects(measure) {
    if (badZoomedRects != null) { return badZoomedRects }
    var node = removeChildrenAndAdd(measure, elt("span", "x"))
    var normal = node.getBoundingClientRect()
    var fromRange = range(node, 0, 1).getBoundingClientRect()
    return badZoomedRects = Math.abs(normal.left - fromRange.left) > 1
  }

  var modes = {};
  var mimeModes = {};
  // Extra arguments are stored as the mode's dependencies, which is
  // used by (legacy) mechanisms like loadmode.js to automatically
  // load a mode. (Preferred mechanism is the require/define calls.)
  function defineMode(name, mode) {
    if (arguments.length > 2)
      { mode.dependencies = Array.prototype.slice.call(arguments, 2) }
    modes[name] = mode
  }

  function defineMIME(mime, spec) {
    mimeModes[mime] = spec
  }

  // Given a MIME type, a {name, ...options} config object, or a name
  // string, return a mode config object.
  function resolveMode(spec) {
    if (typeof spec == "string" && mimeModes.hasOwnProperty(spec)) {
      spec = mimeModes[spec]
    } else if (spec && typeof spec.name == "string" && mimeModes.hasOwnProperty(spec.name)) {
      var found = mimeModes[spec.name]
      if (typeof found == "string") { found = {name: found} }
      spec = createObj(found, spec)
      spec.name = found.name
    } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+xml$/.test(spec)) {
      return resolveMode("application/xml")
    } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+json$/.test(spec)) {
      return resolveMode("application/json")
    }
    if (typeof spec == "string") { return {name: spec} }
    else { return spec || {name: "null"} }
  }

  // Given a mode spec (anything that resolveMode accepts), find and
  // initialize an actual mode object.
  function getMode(options, spec) {
    spec = resolveMode(spec)
    var mfactory = modes[spec.name]
    if (!mfactory) { return getMode(options, "text/plain") }
    var modeObj = mfactory(options, spec)
    if (modeExtensions.hasOwnProperty(spec.name)) {
      var exts = modeExtensions[spec.name]
      for (var prop in exts) {
        if (!exts.hasOwnProperty(prop)) { continue }
        if (modeObj.hasOwnProperty(prop)) { modeObj["_" + prop] = modeObj[prop] }
        modeObj[prop] = exts[prop]
      }
    }
    modeObj.name = spec.name
    if (spec.helperType) { modeObj.helperType = spec.helperType }
    if (spec.modeProps) { for (var prop$1 in spec.modeProps)
      { modeObj[prop$1] = spec.modeProps[prop$1] } }

    return modeObj
  }

  // This can be used to attach properties to mode objects from
  // outside the actual mode definition.
  var modeExtensions = {}
  function extendMode(mode, properties) {
    var exts = modeExtensions.hasOwnProperty(mode) ? modeExtensions[mode] : (modeExtensions[mode] = {})
    copyObj(properties, exts)
  }

  function copyState(mode, state) {
    if (state === true) { return state }
    if (mode.copyState) { return mode.copyState(state) }
    var nstate = {}
    for (var n in state) {
      var val = state[n]
      if (val instanceof Array) { val = val.concat([]) }
      nstate[n] = val
    }
    return nstate
  }

  // Given a mode and a state (for that mode), find the inner mode and
  // state at the position that the state refers to.
  function innerMode(mode, state) {
    var info
    while (mode.innerMode) {
      info = mode.innerMode(state)
      if (!info || info.mode == mode) { break }
      state = info.state
      mode = info.mode
    }
    return info || {mode: mode, state: state}
  }

  function startState(mode, a1, a2) {
    return mode.startState ? mode.startState(a1, a2) : true
  }

  // STRING STREAM

  // Fed to the mode parsers, provides helper functions to make
  // parsers more succinct.

  var StringStream = function(string, tabSize, lineOracle) {
    this.pos = this.start = 0
    this.string = string
    this.tabSize = tabSize || 8
    this.lastColumnPos = this.lastColumnValue = 0
    this.lineStart = 0
    this.lineOracle = lineOracle
  };

  StringStream.prototype.eol = function () {return this.pos >= this.string.length};
  StringStream.prototype.sol = function () {return this.pos == this.lineStart};
  StringStream.prototype.peek = function () {return this.string.charAt(this.pos) || undefined};
  StringStream.prototype.next = function () {
    if (this.pos < this.string.length)
      { return this.string.charAt(this.pos++) }
  };
  StringStream.prototype.eat = function (match) {
    var ch = this.string.charAt(this.pos)
    var ok
    if (typeof match == "string") { ok = ch == match }
    else { ok = ch && (match.test ? match.test(ch) : match(ch)) }
    if (ok) {++this.pos; return ch}
  };
  StringStream.prototype.eatWhile = function (match) {
    var start = this.pos
    while (this.eat(match)){}
    return this.pos > start
  };
  StringStream.prototype.eatSpace = function () {
      var this$1 = this;

    var start = this.pos
    while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) { ++this$1.pos }
    return this.pos > start
  };
  StringStream.prototype.skipToEnd = function () {this.pos = this.string.length};
  StringStream.prototype.skipTo = function (ch) {
    var found = this.string.indexOf(ch, this.pos)
    if (found > -1) {this.pos = found; return true}
  };
  StringStream.prototype.backUp = function (n) {this.pos -= n};
  StringStream.prototype.column = function () {
    if (this.lastColumnPos < this.start) {
      this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue)
      this.lastColumnPos = this.start
    }
    return this.lastColumnValue - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0)
  };
  StringStream.prototype.indentation = function () {
    return countColumn(this.string, null, this.tabSize) -
      (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0)
  };
  StringStream.prototype.match = function (pattern, consume, caseInsensitive) {
    if (typeof pattern == "string") {
      var cased = function (str) { return caseInsensitive ? str.toLowerCase() : str; }
      var substr = this.string.substr(this.pos, pattern.length)
      if (cased(substr) == cased(pattern)) {
        if (consume !== false) { this.pos += pattern.length }
        return true
      }
    } else {
      var match = this.string.slice(this.pos).match(pattern)
      if (match && match.index > 0) { return null }
      if (match && consume !== false) { this.pos += match[0].length }
      return match
    }
  };
  StringStream.prototype.current = function (){return this.string.slice(this.start, this.pos)};
  StringStream.prototype.hideFirstChars = function (n, inner) {
    this.lineStart += n
    try { return inner() }
    finally { this.lineStart -= n }
  };
  StringStream.prototype.lookAhead = function (n) {
    var oracle = this.lineOracle
    return oracle && oracle.lookAhead(n)
  };
  StringStream.prototype.baseToken = function () {
    var oracle = this.lineOracle
    return oracle && oracle.baseToken(this.pos)
  };

  var SavedContext = function(state, lookAhead) {
    this.state = state
    this.lookAhead = lookAhead
  };

  var Context = function(doc, state, line, lookAhead) {
    this.state = state
    this.doc = doc
    this.line = line
    this.maxLookAhead = lookAhead || 0
    this.baseTokens = null
    this.baseTokenPos = 1
  };

  Context.prototype.lookAhead = function (n) {
    var line = this.doc.getLine(this.line + n)
    if (line != null && n > this.maxLookAhead) { this.maxLookAhead = n }
    return line
  };

  Context.prototype.baseToken = function (n) {
      var this$1 = this;

    if (!this.baseTokens) { return null }
    while (this.baseTokens[this.baseTokenPos] <= n)
      { this$1.baseTokenPos += 2 }
    var type = this.baseTokens[this.baseTokenPos + 1]
    return {type: type && type.replace(/( |^)overlay .*/, ""),
            size: this.baseTokens[this.baseTokenPos] - n}
  };

  Context.prototype.nextLine = function () {
    this.line++
    if (this.maxLookAhead > 0) { this.maxLookAhead-- }
  };

  Context.fromSaved = function (doc, saved, line) {
    if (saved instanceof SavedContext)
      { return new Context(doc, copyState(doc.mode, saved.state), line, saved.lookAhead) }
    else
      { return new Context(doc, copyState(doc.mode, saved), line) }
  };

  Context.prototype.save = function (copy) {
    var state = copy !== false ? copyState(this.doc.mode, this.state) : this.state
    return this.maxLookAhead > 0 ? new SavedContext(state, this.maxLookAhead) : state
  };


  // Compute a style array (an array starting with a mode generation
  // -- for invalidation -- followed by pairs of end positions and
  // style strings), which is used to highlight the tokens on the
  // line.
  function highlightLine(cm, line, context, forceToEnd) {
    // A styles array always starts with a number identifying the
    // mode/overlays that it is based on (for easy invalidation).
    var st = [cm.state.modeGen], lineClasses = {}
    // Compute the base array of styles
    runMode(cm, line.text, cm.doc.mode, context, function (end, style) { return st.push(end, style); },
            lineClasses, forceToEnd)
    var state = context.state

    // Run overlays, adjust style array.
    var loop = function ( o ) {
      context.baseTokens = st
      var overlay = cm.state.overlays[o], i = 1, at = 0
      context.state = true
      runMode(cm, line.text, overlay.mode, context, function (end, style) {
        var start = i
        // Ensure there's a token end at the current position, and that i points at it
        while (at < end) {
          var i_end = st[i]
          if (i_end > end)
            { st.splice(i, 1, end, st[i+1], i_end) }
          i += 2
          at = Math.min(end, i_end)
        }
        if (!style) { return }
        if (overlay.opaque) {
          st.splice(start, i - start, end, "overlay " + style)
          i = start + 2
        } else {
          for (; start < i; start += 2) {
            var cur = st[start+1]
            st[start+1] = (cur ? cur + " " : "") + "overlay " + style
          }
        }
      }, lineClasses)
      context.state = state
      context.baseTokens = null
      context.baseTokenPos = 1
    };

    for (var o = 0; o < cm.state.overlays.length; ++o) loop( o );

    return {styles: st, classes: lineClasses.bgClass || lineClasses.textClass ? lineClasses : null}
  }

  function getLineStyles(cm, line, updateFrontier) {
    if (!line.styles || line.styles[0] != cm.state.modeGen) {
      var context = getContextBefore(cm, lineNo(line))
      var resetState = line.text.length > cm.options.maxHighlightLength && copyState(cm.doc.mode, context.state)
      var result = highlightLine(cm, line, context)
      if (resetState) { context.state = resetState }
      line.stateAfter = context.save(!resetState)
      line.styles = result.styles
      if (result.classes) { line.styleClasses = result.classes }
      else if (line.styleClasses) { line.styleClasses = null }
      if (updateFrontier === cm.doc.highlightFrontier)
        { cm.doc.modeFrontier = Math.max(cm.doc.modeFrontier, ++cm.doc.highlightFrontier) }
    }
    return line.styles
  }

  function getContextBefore(cm, n, precise) {
    var doc = cm.doc, display = cm.display
    if (!doc.mode.startState) { return new Context(doc, true, n) }
    var start = findStartLine(cm, n, precise)
    var saved = start > doc.first && getLine(doc, start - 1).stateAfter
    var context = saved ? Context.fromSaved(doc, saved, start) : new Context(doc, startState(doc.mode), start)

    doc.iter(start, n, function (line) {
      processLine(cm, line.text, context)
      var pos = context.line
      line.stateAfter = pos == n - 1 || pos % 5 == 0 || pos >= display.viewFrom && pos < display.viewTo ? context.save() : null
      context.nextLine()
    })
    if (precise) { doc.modeFrontier = context.line }
    return context
  }

  // Lightweight form of highlight -- proceed over this line and
  // update state, but don't save a style array. Used for lines that
  // aren't currently visible.
  function processLine(cm, text, context, startAt) {
    var mode = cm.doc.mode
    var stream = new StringStream(text, cm.options.tabSize, context)
    stream.start = stream.pos = startAt || 0
    if (text == "") { callBlankLine(mode, context.state) }
    while (!stream.eol()) {
      readToken(mode, stream, context.state)
      stream.start = stream.pos
    }
  }

  function callBlankLine(mode, state) {
    if (mode.blankLine) { return mode.blankLine(state) }
    if (!mode.innerMode) { return }
    var inner = innerMode(mode, state)
    if (inner.mode.blankLine) { return inner.mode.blankLine(inner.state) }
  }

  function readToken(mode, stream, state, inner) {
    for (var i = 0; i < 10; i++) {
      if (inner) { inner[0] = innerMode(mode, state).mode }
      var style = mode.token(stream, state)
      if (stream.pos > stream.start) { return style }
    }
    throw new Error("Mode " + mode.name + " failed to advance stream.")
  }

  var Token = function(stream, type, state) {
    this.start = stream.start; this.end = stream.pos
    this.string = stream.current()
    this.type = type || null
    this.state = state
  };

  // Utility for getTokenAt and getLineTokens
  function takeToken(cm, pos, precise, asArray) {
    var doc = cm.doc, mode = doc.mode, style
    pos = clipPos(doc, pos)
    var line = getLine(doc, pos.line), context = getContextBefore(cm, pos.line, precise)
    var stream = new StringStream(line.text, cm.options.tabSize, context), tokens
    if (asArray) { tokens = [] }
    while ((asArray || stream.pos < pos.ch) && !stream.eol()) {
      stream.start = stream.pos
      style = readToken(mode, stream, context.state)
      if (asArray) { tokens.push(new Token(stream, style, copyState(doc.mode, context.state))) }
    }
    return asArray ? tokens : new Token(stream, style, context.state)
  }

  function extractLineClasses(type, output) {
    if (type) { for (;;) {
      var lineClass = type.match(/(?:^|\s+)line-(background-)?(\S+)/)
      if (!lineClass) { break }
      type = type.slice(0, lineClass.index) + type.slice(lineClass.index + lineClass[0].length)
      var prop = lineClass[1] ? "bgClass" : "textClass"
      if (output[prop] == null)
        { output[prop] = lineClass[2] }
      else if (!(new RegExp("(?:^|\s)" + lineClass[2] + "(?:$|\s)")).test(output[prop]))
        { output[prop] += " " + lineClass[2] }
    } }
    return type
  }

  // Run the given mode's parser over a line, calling f for each token.
  function runMode(cm, text, mode, context, f, lineClasses, forceToEnd) {
    var flattenSpans = mode.flattenSpans
    if (flattenSpans == null) { flattenSpans = cm.options.flattenSpans }
    var curStart = 0, curStyle = null
    var stream = new StringStream(text, cm.options.tabSize, context), style
    var inner = cm.options.addModeClass && [null]
    if (text == "") { extractLineClasses(callBlankLine(mode, context.state), lineClasses) }
    while (!stream.eol()) {
      if (stream.pos > cm.options.maxHighlightLength) {
        flattenSpans = false
        if (forceToEnd) { processLine(cm, text, context, stream.pos) }
        stream.pos = text.length
        style = null
      } else {
        style = extractLineClasses(readToken(mode, stream, context.state, inner), lineClasses)
      }
      if (inner) {
        var mName = inner[0].name
        if (mName) { style = "m-" + (style ? mName + " " + style : mName) }
      }
      if (!flattenSpans || curStyle != style) {
        while (curStart < stream.start) {
          curStart = Math.min(stream.start, curStart + 5000)
          f(curStart, curStyle)
        }
        curStyle = style
      }
      stream.start = stream.pos
    }
    while (curStart < stream.pos) {
      // Webkit seems to refuse to render text nodes longer than 57444
      // characters, and returns inaccurate measurements in nodes
      // starting around 5000 chars.
      var pos = Math.min(stream.pos, curStart + 5000)
      f(pos, curStyle)
      curStart = pos
    }
  }

  // Finds the line to start with when starting a parse. Tries to
  // find a line with a stateAfter, so that it can start with a
  // valid state. If that fails, it returns the line with the
  // smallest indentation, which tends to need the least context to
  // parse correctly.
  function findStartLine(cm, n, precise) {
    var minindent, minline, doc = cm.doc
    var lim = precise ? -1 : n - (cm.doc.mode.innerMode ? 1000 : 100)
    for (var search = n; search > lim; --search) {
      if (search <= doc.first) { return doc.first }
      var line = getLine(doc, search - 1), after = line.stateAfter
      if (after && (!precise || search + (after instanceof SavedContext ? after.lookAhead : 0) <= doc.modeFrontier))
        { return search }
      var indented = countColumn(line.text, null, cm.options.tabSize)
      if (minline == null || minindent > indented) {
        minline = search - 1
        minindent = indented
      }
    }
    return minline
  }

  function retreatFrontier(doc, n) {
    doc.modeFrontier = Math.min(doc.modeFrontier, n)
    if (doc.highlightFrontier < n - 10) { return }
    var start = doc.first
    for (var line = n - 1; line > start; line--) {
      var saved = getLine(doc, line).stateAfter
      // change is on 3
      // state on line 1 looked ahead 2 -- so saw 3
      // test 1 + 2 < 3 should cover this
      if (saved && (!(saved instanceof SavedContext) || line + saved.lookAhead < n)) {
        start = line + 1
        break
      }
    }
    doc.highlightFrontier = Math.min(doc.highlightFrontier, start)
  }

  // LINE DATA STRUCTURE

  // Line objects. These hold state related to a line, including
  // highlighting info (the styles array).
  var Line = function(text, markedSpans, estimateHeight) {
    this.text = text
    attachMarkedSpans(this, markedSpans)
    this.height = estimateHeight ? estimateHeight(this) : 1
  };

  Line.prototype.lineNo = function () { return lineNo(this) };
  eventMixin(Line)

  // Change the content (text, markers) of a line. Automatically
  // invalidates cached information and tries to re-estimate the
  // line's height.
  function updateLine(line, text, markedSpans, estimateHeight) {
    line.text = text
    if (line.stateAfter) { line.stateAfter = null }
    if (line.styles) { line.styles = null }
    if (line.order != null) { line.order = null }
    detachMarkedSpans(line)
    attachMarkedSpans(line, markedSpans)
    var estHeight = estimateHeight ? estimateHeight(line) : 1
    if (estHeight != line.height) { updateLineHeight(line, estHeight) }
  }

  // Detach a line from the document tree and its markers.
  function cleanUpLine(line) {
    line.parent = null
    detachMarkedSpans(line)
  }

  // Convert a style as returned by a mode (either null, or a string
  // containing one or more styles) to a CSS style. This is cached,
  // and also looks for line-wide styles.
  var styleToClassCache = {};
  var styleToClassCacheWithMode = {};
  function interpretTokenStyle(style, options) {
    if (!style || /^\s*$/.test(style)) { return null }
    var cache = options.addModeClass ? styleToClassCacheWithMode : styleToClassCache
    return cache[style] ||
      (cache[style] = style.replace(/\S+/g, "cm-$&"))
  }

  // Render the DOM representation of the text of a line. Also builds
  // up a 'line map', which points at the DOM nodes that represent
  // specific stretches of text, and is used by the measuring code.
  // The returned object contains the DOM node, this map, and
  // information about line-wide styles that were set by the mode.
  function buildLineContent(cm, lineView) {
    // The padding-right forces the element to have a 'border', which
    // is needed on Webkit to be able to get line-level bounding
    // rectangles for it (in measureChar).
    var content = eltP("span", null, null, webkit ? "padding-right: .1px" : null)
    var builder = {pre: eltP("pre", [content], "CodeMirror-line"), content: content,
                   col: 0, pos: 0, cm: cm,
                   trailingSpace: false,
                   splitSpaces: (ie || webkit) && cm.getOption("lineWrapping")}
    lineView.measure = {}

    // Iterate over the logical lines that make up this visual line.
    for (var i = 0; i <= (lineView.rest ? lineView.rest.length : 0); i++) {
      var line = i ? lineView.rest[i - 1] : lineView.line, order = (void 0)
      builder.pos = 0
      builder.addToken = buildToken
      // Optionally wire in some hacks into the token-rendering
      // algorithm, to deal with browser quirks.
      if (hasBadBidiRects(cm.display.measure) && (order = getOrder(line, cm.doc.direction)))
        { builder.addToken = buildTokenBadBidi(builder.addToken, order) }
      builder.map = []
      var allowFrontierUpdate = lineView != cm.display.externalMeasured && lineNo(line)
      insertLineContent(line, builder, getLineStyles(cm, line, allowFrontierUpdate))
      if (line.styleClasses) {
        if (line.styleClasses.bgClass)
          { builder.bgClass = joinClasses(line.styleClasses.bgClass, builder.bgClass || "") }
        if (line.styleClasses.textClass)
          { builder.textClass = joinClasses(line.styleClasses.textClass, builder.textClass || "") }
      }

      // Ensure at least a single node is present, for measuring.
      if (builder.map.length == 0)
        { builder.map.push(0, 0, builder.content.appendChild(zeroWidthElement(cm.display.measure))) }

      // Store the map and a cache object for the current logical line
      if (i == 0) {
        lineView.measure.map = builder.map
        lineView.measure.cache = {}
      } else {
        ;(lineView.measure.maps || (lineView.measure.maps = [])).push(builder.map)
        ;(lineView.measure.caches || (lineView.measure.caches = [])).push({})
      }
    }

    // See issue #2901
    if (webkit) {
      var last = builder.content.lastChild
      if (/\bcm-tab\b/.test(last.className) || (last.querySelector && last.querySelector(".cm-tab")))
        { builder.content.className = "cm-tab-wrap-hack" }
    }

    signal(cm, "renderLine", cm, lineView.line, builder.pre)
    if (builder.pre.className)
      { builder.textClass = joinClasses(builder.pre.className, builder.textClass || "") }

    return builder
  }

  function defaultSpecialCharPlaceholder(ch) {
    var token = elt("span", "\u2022", "cm-invalidchar")
    token.title = "\\u" + ch.charCodeAt(0).toString(16)
    token.setAttribute("aria-label", token.title)
    return token
  }

  // Build up the DOM representation for a single token, and add it to
  // the line map. Takes care to render special characters separately.
  function buildToken(builder, text, style, startStyle, endStyle, title, css) {
    if (!text) { return }
    var displayText = builder.splitSpaces ? splitSpaces(text, builder.trailingSpace) : text
    var special = builder.cm.state.specialChars, mustWrap = false
    var content
    if (!special.test(text)) {
      builder.col += text.length
      content = document.createTextNode(displayText)
      builder.map.push(builder.pos, builder.pos + text.length, content)
      if (ie && ie_version < 9) { mustWrap = true }
      builder.pos += text.length
    } else {
      content = document.createDocumentFragment()
      var pos = 0
      while (true) {
        special.lastIndex = pos
        var m = special.exec(text)
        var skipped = m ? m.index - pos : text.length - pos
        if (skipped) {
          var txt = document.createTextNode(displayText.slice(pos, pos + skipped))
          if (ie && ie_version < 9) { content.appendChild(elt("span", [txt])) }
          else { content.appendChild(txt) }
          builder.map.push(builder.pos, builder.pos + skipped, txt)
          builder.col += skipped
          builder.pos += skipped
        }
        if (!m) { break }
        pos += skipped + 1
        var txt$1 = (void 0)
        if (m[0] == "\t") {
          var tabSize = builder.cm.options.tabSize, tabWidth = tabSize - builder.col % tabSize
          txt$1 = content.appendChild(elt("span", spaceStr(tabWidth), "cm-tab"))
          txt$1.setAttribute("role", "presentation")
          txt$1.setAttribute("cm-text", "\t")
          builder.col += tabWidth
        } else if (m[0] == "\r" || m[0] == "\n") {
          txt$1 = content.appendChild(elt("span", m[0] == "\r" ? "\u240d" : "\u2424", "cm-invalidchar"))
          txt$1.setAttribute("cm-text", m[0])
          builder.col += 1
        } else {
          txt$1 = builder.cm.options.specialCharPlaceholder(m[0])
          txt$1.setAttribute("cm-text", m[0])
          if (ie && ie_version < 9) { content.appendChild(elt("span", [txt$1])) }
          else { content.appendChild(txt$1) }
          builder.col += 1
        }
        builder.map.push(builder.pos, builder.pos + 1, txt$1)
        builder.pos++
      }
    }
    builder.trailingSpace = displayText.charCodeAt(text.length - 1) == 32
    if (style || startStyle || endStyle || mustWrap || css) {
      var fullStyle = style || ""
      if (startStyle) { fullStyle += startStyle }
      if (endStyle) { fullStyle += endStyle }
      var token = elt("span", [content], fullStyle, css)
      if (title) { token.title = title }
      return builder.content.appendChild(token)
    }
    builder.content.appendChild(content)
  }

  function splitSpaces(text, trailingBefore) {
    if (text.length > 1 && !/  /.test(text)) { return text }
    var spaceBefore = trailingBefore, result = ""
    for (var i = 0; i < text.length; i++) {
      var ch = text.charAt(i)
      if (ch == " " && spaceBefore && (i == text.length - 1 || text.charCodeAt(i + 1) == 32))
        { ch = "\u00a0" }
      result += ch
      spaceBefore = ch == " "
    }
    return result
  }

  // Work around nonsense dimensions being reported for stretches of
  // right-to-left text.
  function buildTokenBadBidi(inner, order) {
    return function (builder, text, style, startStyle, endStyle, title, css) {
      style = style ? style + " cm-force-border" : "cm-force-border"
      var start = builder.pos, end = start + text.length
      for (;;) {
        // Find the part that overlaps with the start of this text
        var part = (void 0)
        for (var i = 0; i < order.length; i++) {
          part = order[i]
          if (part.to > start && part.from <= start) { break }
        }
        if (part.to >= end) { return inner(builder, text, style, startStyle, endStyle, title, css) }
        inner(builder, text.slice(0, part.to - start), style, startStyle, null, title, css)
        startStyle = null
        text = text.slice(part.to - start)
        start = part.to
      }
    }
  }

  function buildCollapsedSpan(builder, size, marker, ignoreWidget) {
    var widget = !ignoreWidget && marker.widgetNode
    if (widget) { builder.map.push(builder.pos, builder.pos + size, widget) }
    if (!ignoreWidget && builder.cm.display.input.needsContentAttribute) {
      if (!widget)
        { widget = builder.content.appendChild(document.createElement("span")) }
      widget.setAttribute("cm-marker", marker.id)
    }
    if (widget) {
      builder.cm.display.input.setUneditable(widget)
      builder.content.appendChild(widget)
    }
    builder.pos += size
    builder.trailingSpace = false
  }

  // Outputs a number of spans to make up a line, taking highlighting
  // and marked text into account.
  function insertLineContent(line, builder, styles) {
    var spans = line.markedSpans, allText = line.text, at = 0
    if (!spans) {
      for (var i$1 = 1; i$1 < styles.length; i$1+=2)
        { builder.addToken(builder, allText.slice(at, at = styles[i$1]), interpretTokenStyle(styles[i$1+1], builder.cm.options)) }
      return
    }

    var len = allText.length, pos = 0, i = 1, text = "", style, css
    var nextChange = 0, spanStyle, spanEndStyle, spanStartStyle, title, collapsed
    for (;;) {
      if (nextChange == pos) { // Update current marker set
        spanStyle = spanEndStyle = spanStartStyle = title = css = ""
        collapsed = null; nextChange = Infinity
        var foundBookmarks = [], endStyles = (void 0)
        for (var j = 0; j < spans.length; ++j) {
          var sp = spans[j], m = sp.marker
          if (m.type == "bookmark" && sp.from == pos && m.widgetNode) {
            foundBookmarks.push(m)
          } else if (sp.from <= pos && (sp.to == null || sp.to > pos || m.collapsed && sp.to == pos && sp.from == pos)) {
            if (sp.to != null && sp.to != pos && nextChange > sp.to) {
              nextChange = sp.to
              spanEndStyle = ""
            }
            if (m.className) { spanStyle += " " + m.className }
            if (m.css) { css = (css ? css + ";" : "") + m.css }
            if (m.startStyle && sp.from == pos) { spanStartStyle += " " + m.startStyle }
            if (m.endStyle && sp.to == nextChange) { (endStyles || (endStyles = [])).push(m.endStyle, sp.to) }
            if (m.title && !title) { title = m.title }
            if (m.collapsed && (!collapsed || compareCollapsedMarkers(collapsed.marker, m) < 0))
              { collapsed = sp }
          } else if (sp.from > pos && nextChange > sp.from) {
            nextChange = sp.from
          }
        }
        if (endStyles) { for (var j$1 = 0; j$1 < endStyles.length; j$1 += 2)
          { if (endStyles[j$1 + 1] == nextChange) { spanEndStyle += " " + endStyles[j$1] } } }

        if (!collapsed || collapsed.from == pos) { for (var j$2 = 0; j$2 < foundBookmarks.length; ++j$2)
          { buildCollapsedSpan(builder, 0, foundBookmarks[j$2]) } }
        if (collapsed && (collapsed.from || 0) == pos) {
          buildCollapsedSpan(builder, (collapsed.to == null ? len + 1 : collapsed.to) - pos,
                             collapsed.marker, collapsed.from == null)
          if (collapsed.to == null) { return }
          if (collapsed.to == pos) { collapsed = false }
        }
      }
      if (pos >= len) { break }

      var upto = Math.min(len, nextChange)
      while (true) {
        if (text) {
          var end = pos + text.length
          if (!collapsed) {
            var tokenText = end > upto ? text.slice(0, upto - pos) : text
            builder.addToken(builder, tokenText, style ? style + spanStyle : spanStyle,
                             spanStartStyle, pos + tokenText.length == nextChange ? spanEndStyle : "", title, css)
          }
          if (end >= upto) {text = text.slice(upto - pos); pos = upto; break}
          pos = end
          spanStartStyle = ""
        }
        text = allText.slice(at, at = styles[i++])
        style = interpretTokenStyle(styles[i++], builder.cm.options)
      }
    }
  }


  // These objects are used to represent the visible (currently drawn)
  // part of the document. A LineView may correspond to multiple
  // logical lines, if those are connected by collapsed ranges.
  function LineView(doc, line, lineN) {
    // The starting line
    this.line = line
    // Continuing lines, if any
    this.rest = visualLineContinued(line)
    // Number of logical lines in this visual line
    this.size = this.rest ? lineNo(lst(this.rest)) - lineN + 1 : 1
    this.node = this.text = null
    this.hidden = lineIsHidden(doc, line)
  }

  // Create a range of LineView objects for the given lines.
  function buildViewArray(cm, from, to) {
    var array = [], nextPos
    for (var pos = from; pos < to; pos = nextPos) {
      var view = new LineView(cm.doc, getLine(cm.doc, pos), pos)
      nextPos = pos + view.size
      array.push(view)
    }
    return array
  }

  var operationGroup = null

  function pushOperation(op) {
    if (operationGroup) {
      operationGroup.ops.push(op)
    } else {
      op.ownsGroup = operationGroup = {
        ops: [op],
        delayedCallbacks: []
      }
    }
  }

  function fireCallbacksForOps(group) {
    // Calls delayed callbacks and cursorActivity handlers until no
    // new ones appear
    var callbacks = group.delayedCallbacks, i = 0
    do {
      for (; i < callbacks.length; i++)
        { callbacks[i].call(null) }
      for (var j = 0; j < group.ops.length; j++) {
        var op = group.ops[j]
        if (op.cursorActivityHandlers)
          { while (op.cursorActivityCalled < op.cursorActivityHandlers.length)
            { op.cursorActivityHandlers[op.cursorActivityCalled++].call(null, op.cm) } }
      }
    } while (i < callbacks.length)
  }

  function finishOperation(op, endCb) {
    var group = op.ownsGroup
    if (!group) { return }

    try { fireCallbacksForOps(group) }
    finally {
      operationGroup = null
      endCb(group)
    }
  }

  var orphanDelayedCallbacks = null

  // Often, we want to signal events at a point where we are in the
  // middle of some work, but don't want the handler to start calling
  // other methods on the editor, which might be in an inconsistent
  // state or simply not expect any other events to happen.
  // signalLater looks whether there are any handlers, and schedules
  // them to be executed when the last operation ends, or, if no
  // operation is active, when a timeout fires.
  function signalLater(emitter, type /*, values...*/) {
    var arr = getHandlers(emitter, type)
    if (!arr.length) { return }
    var args = Array.prototype.slice.call(arguments, 2), list
    if (operationGroup) {
      list = operationGroup.delayedCallbacks
    } else if (orphanDelayedCallbacks) {
      list = orphanDelayedCallbacks
    } else {
      list = orphanDelayedCallbacks = []
      setTimeout(fireOrphanDelayed, 0)
    }
    var loop = function ( i ) {
      list.push(function () { return arr[i].apply(null, args); })
    };

    for (var i = 0; i < arr.length; ++i)
      loop( i );
  }

  function fireOrphanDelayed() {
    var delayed = orphanDelayedCallbacks
    orphanDelayedCallbacks = null
    for (var i = 0; i < delayed.length; ++i) { delayed[i]() }
  }

  // When an aspect of a line changes, a string is added to
  // lineView.changes. This updates the relevant part of the line's
  // DOM structure.
  function updateLineForChanges(cm, lineView, lineN, dims) {
    for (var j = 0; j < lineView.changes.length; j++) {
      var type = lineView.changes[j]
      if (type == "text") { updateLineText(cm, lineView) }
      else if (type == "gutter") { updateLineGutter(cm, lineView, lineN, dims) }
      else if (type == "class") { updateLineClasses(cm, lineView) }
      else if (type == "widget") { updateLineWidgets(cm, lineView, dims) }
    }
    lineView.changes = null
  }

  // Lines with gutter elements, widgets or a background class need to
  // be wrapped, and have the extra elements added to the wrapper div
  function ensureLineWrapped(lineView) {
    if (lineView.node == lineView.text) {
      lineView.node = elt("div", null, null, "position: relative")
      if (lineView.text.parentNode)
        { lineView.text.parentNode.replaceChild(lineView.node, lineView.text) }
      lineView.node.appendChild(lineView.text)
      if (ie && ie_version < 8) { lineView.node.style.zIndex = 2 }
    }
    return lineView.node
  }

  function updateLineBackground(cm, lineView) {
    var cls = lineView.bgClass ? lineView.bgClass + " " + (lineView.line.bgClass || "") : lineView.line.bgClass
    if (cls) { cls += " CodeMirror-linebackground" }
    if (lineView.background) {
      if (cls) { lineView.background.className = cls }
      else { lineView.background.parentNode.removeChild(lineView.background); lineView.background = null }
    } else if (cls) {
      var wrap = ensureLineWrapped(lineView)
      lineView.background = wrap.insertBefore(elt("div", null, cls), wrap.firstChild)
      cm.display.input.setUneditable(lineView.background)
    }
  }

  // Wrapper around buildLineContent which will reuse the structure
  // in display.externalMeasured when possible.
  function getLineContent(cm, lineView) {
    var ext = cm.display.externalMeasured
    if (ext && ext.line == lineView.line) {
      cm.display.externalMeasured = null
      lineView.measure = ext.measure
      return ext.built
    }
    return buildLineContent(cm, lineView)
  }

  // Redraw the line's text. Interacts with the background and text
  // classes because the mode may output tokens that influence these
  // classes.
  function updateLineText(cm, lineView) {
    var cls = lineView.text.className
    var built = getLineContent(cm, lineView)
    if (lineView.text == lineView.node) { lineView.node = built.pre }
    lineView.text.parentNode.replaceChild(built.pre, lineView.text)
    lineView.text = built.pre
    if (built.bgClass != lineView.bgClass || built.textClass != lineView.textClass) {
      lineView.bgClass = built.bgClass
      lineView.textClass = built.textClass
      updateLineClasses(cm, lineView)
    } else if (cls) {
      lineView.text.className = cls
    }
  }

  function updateLineClasses(cm, lineView) {
    updateLineBackground(cm, lineView)
    if (lineView.line.wrapClass)
      { ensureLineWrapped(lineView).className = lineView.line.wrapClass }
    else if (lineView.node != lineView.text)
      { lineView.node.className = "" }
    var textClass = lineView.textClass ? lineView.textClass + " " + (lineView.line.textClass || "") : lineView.line.textClass
    lineView.text.className = textClass || ""
  }

  function updateLineGutter(cm, lineView, lineN, dims) {
    if (lineView.gutter) {
      lineView.node.removeChild(lineView.gutter)
      lineView.gutter = null
    }
    if (lineView.gutterBackground) {
      lineView.node.removeChild(lineView.gutterBackground)
      lineView.gutterBackground = null
    }
    if (lineView.line.gutterClass) {
      var wrap = ensureLineWrapped(lineView)
      lineView.gutterBackground = elt("div", null, "CodeMirror-gutter-background " + lineView.line.gutterClass,
                                      ("left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px; width: " + (dims.gutterTotalWidth) + "px"))
      cm.display.input.setUneditable(lineView.gutterBackground)
      wrap.insertBefore(lineView.gutterBackground, lineView.text)
    }
    var markers = lineView.line.gutterMarkers
    if (cm.options.lineNumbers || markers) {
      var wrap$1 = ensureLineWrapped(lineView)
      var gutterWrap = lineView.gutter = elt("div", null, "CodeMirror-gutter-wrapper", ("left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px"))
      cm.display.input.setUneditable(gutterWrap)
      wrap$1.insertBefore(gutterWrap, lineView.text)
      if (lineView.line.gutterClass)
        { gutterWrap.className += " " + lineView.line.gutterClass }
      if (cm.options.lineNumbers && (!markers || !markers["CodeMirror-linenumbers"]))
        { lineView.lineNumber = gutterWrap.appendChild(
          elt("div", lineNumberFor(cm.options, lineN),
              "CodeMirror-linenumber CodeMirror-gutter-elt",
              ("left: " + (dims.gutterLeft["CodeMirror-linenumbers"]) + "px; width: " + (cm.display.lineNumInnerWidth) + "px"))) }
      if (markers) { for (var k = 0; k < cm.options.gutters.length; ++k) {
        var id = cm.options.gutters[k], found = markers.hasOwnProperty(id) && markers[id]
        if (found)
          { gutterWrap.appendChild(elt("div", [found], "CodeMirror-gutter-elt",
                                     ("left: " + (dims.gutterLeft[id]) + "px; width: " + (dims.gutterWidth[id]) + "px"))) }
      } }
    }
  }

  function updateLineWidgets(cm, lineView, dims) {
    if (lineView.alignable) { lineView.alignable = null }
    for (var node = lineView.node.firstChild, next = (void 0); node; node = next) {
      next = node.nextSibling
      if (node.className == "CodeMirror-linewidget")
        { lineView.node.removeChild(node) }
    }
    insertLineWidgets(cm, lineView, dims)
  }

  // Build a line's DOM representation from scratch
  function buildLineElement(cm, lineView, lineN, dims) {
    var built = getLineContent(cm, lineView)
    lineView.text = lineView.node = built.pre
    if (built.bgClass) { lineView.bgClass = built.bgClass }
    if (built.textClass) { lineView.textClass = built.textClass }

    updateLineClasses(cm, lineView)
    updateLineGutter(cm, lineView, lineN, dims)
    insertLineWidgets(cm, lineView, dims)
    return lineView.node
  }

  // A lineView may contain multiple logical lines (when merged by
  // collapsed spans). The widgets for all of them need to be drawn.
  function insertLineWidgets(cm, lineView, dims) {
    insertLineWidgetsFor(cm, lineView.line, lineView, dims, true)
    if (lineView.rest) { for (var i = 0; i < lineView.rest.length; i++)
      { insertLineWidgetsFor(cm, lineView.rest[i], lineView, dims, false) } }
  }

  function insertLineWidgetsFor(cm, line, lineView, dims, allowAbove) {
    if (!line.widgets) { return }
    var wrap = ensureLineWrapped(lineView)
    for (var i = 0, ws = line.widgets; i < ws.length; ++i) {
      var widget = ws[i], node = elt("div", [widget.node], "CodeMirror-linewidget")
      if (!widget.handleMouseEvents) { node.setAttribute("cm-ignore-events", "true") }
      positionLineWidget(widget, node, lineView, dims)
      cm.display.input.setUneditable(node)
      if (allowAbove && widget.above)
        { wrap.insertBefore(node, lineView.gutter || lineView.text) }
      else
        { wrap.appendChild(node) }
      signalLater(widget, "redraw")
    }
  }

  function positionLineWidget(widget, node, lineView, dims) {
    if (widget.noHScroll) {
      ;(lineView.alignable || (lineView.alignable = [])).push(node)
      var width = dims.wrapperWidth
      node.style.left = dims.fixedPos + "px"
      if (!widget.coverGutter) {
        width -= dims.gutterTotalWidth
        node.style.paddingLeft = dims.gutterTotalWidth + "px"
      }
      node.style.width = width + "px"
    }
    if (widget.coverGutter) {
      node.style.zIndex = 5
      node.style.position = "relative"
      if (!widget.noHScroll) { node.style.marginLeft = -dims.gutterTotalWidth + "px" }
    }
  }

  function widgetHeight(widget) {
    if (widget.height != null) { return widget.height }
    var cm = widget.doc.cm
    if (!cm) { return 0 }
    if (!contains(document.body, widget.node)) {
      var parentStyle = "position: relative;"
      if (widget.coverGutter)
        { parentStyle += "margin-left: -" + cm.display.gutters.offsetWidth + "px;" }
      if (widget.noHScroll)
        { parentStyle += "width: " + cm.display.wrapper.clientWidth + "px;" }
      removeChildrenAndAdd(cm.display.measure, elt("div", [widget.node], null, parentStyle))
    }
    return widget.height = widget.node.parentNode.offsetHeight
  }

  // Return true when the given mouse event happened in a widget
  function eventInWidget(display, e) {
    for (var n = e_target(e); n != display.wrapper; n = n.parentNode) {
      if (!n || (n.nodeType == 1 && n.getAttribute("cm-ignore-events") == "true") ||
          (n.parentNode == display.sizer && n != display.mover))
        { return true }
    }
  }

  // POSITION MEASUREMENT

  function paddingTop(display) {return display.lineSpace.offsetTop}
  function paddingVert(display) {return display.mover.offsetHeight - display.lineSpace.offsetHeight}
  function paddingH(display) {
    if (display.cachedPaddingH) { return display.cachedPaddingH }
    var e = removeChildrenAndAdd(display.measure, elt("pre", "x"))
    var style = window.getComputedStyle ? window.getComputedStyle(e) : e.currentStyle
    var data = {left: parseInt(style.paddingLeft), right: parseInt(style.paddingRight)}
    if (!isNaN(data.left) && !isNaN(data.right)) { display.cachedPaddingH = data }
    return data
  }

  function scrollGap(cm) { return scrollerGap - cm.display.nativeBarWidth }
  function displayWidth(cm) {
    return cm.display.scroller.clientWidth - scrollGap(cm) - cm.display.barWidth
  }
  function displayHeight(cm) {
    return cm.display.scroller.clientHeight - scrollGap(cm) - cm.display.barHeight
  }

  // Ensure the lineView.wrapping.heights array is populated. This is
  // an array of bottom offsets for the lines that make up a drawn
  // line. When lineWrapping is on, there might be more than one
  // height.
  function ensureLineHeights(cm, lineView, rect) {
    var wrapping = cm.options.lineWrapping
    var curWidth = wrapping && displayWidth(cm)
    if (!lineView.measure.heights || wrapping && lineView.measure.width != curWidth) {
      var heights = lineView.measure.heights = []
      if (wrapping) {
        lineView.measure.width = curWidth
        var rects = lineView.text.firstChild.getClientRects()
        for (var i = 0; i < rects.length - 1; i++) {
          var cur = rects[i], next = rects[i + 1]
          if (Math.abs(cur.bottom - next.bottom) > 2)
            { heights.push((cur.bottom + next.top) / 2 - rect.top) }
        }
      }
      heights.push(rect.bottom - rect.top)
    }
  }

  // Find a line map (mapping character offsets to text nodes) and a
  // measurement cache for the given line number. (A line view might
  // contain multiple lines when collapsed ranges are present.)
  function mapFromLineView(lineView, line, lineN) {
    if (lineView.line == line)
      { return {map: lineView.measure.map, cache: lineView.measure.cache} }
    for (var i = 0; i < lineView.rest.length; i++)
      { if (lineView.rest[i] == line)
        { return {map: lineView.measure.maps[i], cache: lineView.measure.caches[i]} } }
    for (var i$1 = 0; i$1 < lineView.rest.length; i$1++)
      { if (lineNo(lineView.rest[i$1]) > lineN)
        { return {map: lineView.measure.maps[i$1], cache: lineView.measure.caches[i$1], before: true} } }
  }

  // Render a line into the hidden node display.externalMeasured. Used
  // when measurement is needed for a line that's not in the viewport.
  function updateExternalMeasurement(cm, line) {
    line = visualLine(line)
    var lineN = lineNo(line)
    var view = cm.display.externalMeasured = new LineView(cm.doc, line, lineN)
    view.lineN = lineN
    var built = view.built = buildLineContent(cm, view)
    view.text = built.pre
    removeChildrenAndAdd(cm.display.lineMeasure, built.pre)
    return view
  }

  // Get a {top, bottom, left, right} box (in line-local coordinates)
  // for a given character.
  function measureChar(cm, line, ch, bias) {
    return measureCharPrepared(cm, prepareMeasureForLine(cm, line), ch, bias)
  }

  // Find a line view that corresponds to the given line number.
  function findViewForLine(cm, lineN) {
    if (lineN >= cm.display.viewFrom && lineN < cm.display.viewTo)
      { return cm.display.view[findViewIndex(cm, lineN)] }
    var ext = cm.display.externalMeasured
    if (ext && lineN >= ext.lineN && lineN < ext.lineN + ext.size)
      { return ext }
  }

  // Measurement can be split in two steps, the set-up work that
  // applies to the whole line, and the measurement of the actual
  // character. Functions like coordsChar, that need to do a lot of
  // measurements in a row, can thus ensure that the set-up work is
  // only done once.
  function prepareMeasureForLine(cm, line) {
    var lineN = lineNo(line)
    var view = findViewForLine(cm, lineN)
    if (view && !view.text) {
      view = null
    } else if (view && view.changes) {
      updateLineForChanges(cm, view, lineN, getDimensions(cm))
      cm.curOp.forceUpdate = true
    }
    if (!view)
      { view = updateExternalMeasurement(cm, line) }

    var info = mapFromLineView(view, line, lineN)
    return {
      line: line, view: view, rect: null,
      map: info.map, cache: info.cache, before: info.before,
      hasHeights: false
    }
  }

  // Given a prepared measurement object, measures the position of an
  // actual character (or fetches it from the cache).
  function measureCharPrepared(cm, prepared, ch, bias, varHeight) {
    if (prepared.before) { ch = -1 }
    var key = ch + (bias || ""), found
    if (prepared.cache.hasOwnProperty(key)) {
      found = prepared.cache[key]
    } else {
      if (!prepared.rect)
        { prepared.rect = prepared.view.text.getBoundingClientRect() }
      if (!prepared.hasHeights) {
        ensureLineHeights(cm, prepared.view, prepared.rect)
        prepared.hasHeights = true
      }
      found = measureCharInner(cm, prepared, ch, bias)
      if (!found.bogus) { prepared.cache[key] = found }
    }
    return {left: found.left, right: found.right,
            top: varHeight ? found.rtop : found.top,
            bottom: varHeight ? found.rbottom : found.bottom}
  }

  var nullRect = {left: 0, right: 0, top: 0, bottom: 0}

  function nodeAndOffsetInLineMap(map, ch, bias) {
    var node, start, end, collapse, mStart, mEnd
    // First, search the line map for the text node corresponding to,
    // or closest to, the target character.
    for (var i = 0; i < map.length; i += 3) {
      mStart = map[i]
      mEnd = map[i + 1]
      if (ch < mStart) {
        start = 0; end = 1
        collapse = "left"
      } else if (ch < mEnd) {
        start = ch - mStart
        end = start + 1
      } else if (i == map.length - 3 || ch == mEnd && map[i + 3] > ch) {
        end = mEnd - mStart
        start = end - 1
        if (ch >= mEnd) { collapse = "right" }
      }
      if (start != null) {
        node = map[i + 2]
        if (mStart == mEnd && bias == (node.insertLeft ? "left" : "right"))
          { collapse = bias }
        if (bias == "left" && start == 0)
          { while (i && map[i - 2] == map[i - 3] && map[i - 1].insertLeft) {
            node = map[(i -= 3) + 2]
            collapse = "left"
          } }
        if (bias == "right" && start == mEnd - mStart)
          { while (i < map.length - 3 && map[i + 3] == map[i + 4] && !map[i + 5].insertLeft) {
            node = map[(i += 3) + 2]
            collapse = "right"
          } }
        break
      }
    }
    return {node: node, start: start, end: end, collapse: collapse, coverStart: mStart, coverEnd: mEnd}
  }

  function getUsefulRect(rects, bias) {
    var rect = nullRect
    if (bias == "left") { for (var i = 0; i < rects.length; i++) {
      if ((rect = rects[i]).left != rect.right) { break }
    } } else { for (var i$1 = rects.length - 1; i$1 >= 0; i$1--) {
      if ((rect = rects[i$1]).left != rect.right) { break }
    } }
    return rect
  }

  function measureCharInner(cm, prepared, ch, bias) {
    var place = nodeAndOffsetInLineMap(prepared.map, ch, bias)
    var node = place.node, start = place.start, end = place.end, collapse = place.collapse

    var rect
    if (node.nodeType == 3) { // If it is a text node, use a range to retrieve the coordinates.
      for (var i$1 = 0; i$1 < 4; i$1++) { // Retry a maximum of 4 times when nonsense rectangles are returned
        while (start && isExtendingChar(prepared.line.text.charAt(place.coverStart + start))) { --start }
        while (place.coverStart + end < place.coverEnd && isExtendingChar(prepared.line.text.charAt(place.coverStart + end))) { ++end }
        if (ie && ie_version < 9 && start == 0 && end == place.coverEnd - place.coverStart)
          { rect = node.parentNode.getBoundingClientRect() }
        else
          { rect = getUsefulRect(range(node, start, end).getClientRects(), bias) }
        if (rect.left || rect.right || start == 0) { break }
        end = start
        start = start - 1
        collapse = "right"
      }
      if (ie && ie_version < 11) { rect = maybeUpdateRectForZooming(cm.display.measure, rect) }
    } else { // If it is a widget, simply get the box for the whole widget.
      if (start > 0) { collapse = bias = "right" }
      var rects
      if (cm.options.lineWrapping && (rects = node.getClientRects()).length > 1)
        { rect = rects[bias == "right" ? rects.length - 1 : 0] }
      else
        { rect = node.getBoundingClientRect() }
    }
    if (ie && ie_version < 9 && !start && (!rect || !rect.left && !rect.right)) {
      var rSpan = node.parentNode.getClientRects()[0]
      if (rSpan)
        { rect = {left: rSpan.left, right: rSpan.left + charWidth(cm.display), top: rSpan.top, bottom: rSpan.bottom} }
      else
        { rect = nullRect }
    }

    var rtop = rect.top - prepared.rect.top, rbot = rect.bottom - prepared.rect.top
    var mid = (rtop + rbot) / 2
    var heights = prepared.view.measure.heights
    var i = 0
    for (; i < heights.length - 1; i++)
      { if (mid < heights[i]) { break } }
    var top = i ? heights[i - 1] : 0, bot = heights[i]
    var result = {left: (collapse == "right" ? rect.right : rect.left) - prepared.rect.left,
                  right: (collapse == "left" ? rect.left : rect.right) - prepared.rect.left,
                  top: top, bottom: bot}
    if (!rect.left && !rect.right) { result.bogus = true }
    if (!cm.options.singleCursorHeightPerLine) { result.rtop = rtop; result.rbottom = rbot }

    return result
  }

  // Work around problem with bounding client rects on ranges being
  // returned incorrectly when zoomed on IE10 and below.
  function maybeUpdateRectForZooming(measure, rect) {
    if (!window.screen || screen.logicalXDPI == null ||
        screen.logicalXDPI == screen.deviceXDPI || !hasBadZoomedRects(measure))
      { return rect }
    var scaleX = screen.logicalXDPI / screen.deviceXDPI
    var scaleY = screen.logicalYDPI / screen.deviceYDPI
    return {left: rect.left * scaleX, right: rect.right * scaleX,
            top: rect.top * scaleY, bottom: rect.bottom * scaleY}
  }

  function clearLineMeasurementCacheFor(lineView) {
    if (lineView.measure) {
      lineView.measure.cache = {}
      lineView.measure.heights = null
      if (lineView.rest) { for (var i = 0; i < lineView.rest.length; i++)
        { lineView.measure.caches[i] = {} } }
    }
  }

  function clearLineMeasurementCache(cm) {
    cm.display.externalMeasure = null
    removeChildren(cm.display.lineMeasure)
    for (var i = 0; i < cm.display.view.length; i++)
      { clearLineMeasurementCacheFor(cm.display.view[i]) }
  }

  function clearCaches(cm) {
    clearLineMeasurementCache(cm)
    cm.display.cachedCharWidth = cm.display.cachedTextHeight = cm.display.cachedPaddingH = null
    if (!cm.options.lineWrapping) { cm.display.maxLineChanged = true }
    cm.display.lineNumChars = null
  }

  function pageScrollX() {
    // Work around https://bugs.chromium.org/p/chromium/issues/detail?id=489206
    // which causes page_Offset and bounding client rects to use
    // different reference viewports and invalidate our calculations.
    if (chrome && android) { return -(document.body.getBoundingClientRect().left - parseInt(getComputedStyle(document.body).marginLeft)) }
    return window.pageXOffset || (document.documentElement || document.body).scrollLeft
  }
  function pageScrollY() {
    if (chrome && android) { return -(document.body.getBoundingClientRect().top - parseInt(getComputedStyle(document.body).marginTop)) }
    return window.pageYOffset || (document.documentElement || document.body).scrollTop
  }

  function widgetTopHeight(lineObj) {
    var height = 0
    if (lineObj.widgets) { for (var i = 0; i < lineObj.widgets.length; ++i) { if (lineObj.widgets[i].above)
      { height += widgetHeight(lineObj.widgets[i]) } } }
    return height
  }

  // Converts a {top, bottom, left, right} box from line-local
  // coordinates into another coordinate system. Context may be one of
  // "line", "div" (display.lineDiv), "local"./null (editor), "window",
  // or "page".
  function intoCoordSystem(cm, lineObj, rect, context, includeWidgets) {
    if (!includeWidgets) {
      var height = widgetTopHeight(lineObj)
      rect.top += height; rect.bottom += height
    }
    if (context == "line") { return rect }
    if (!context) { context = "local" }
    var yOff = heightAtLine(lineObj)
    if (context == "local") { yOff += paddingTop(cm.display) }
    else { yOff -= cm.display.viewOffset }
    if (context == "page" || context == "window") {
      var lOff = cm.display.lineSpace.getBoundingClientRect()
      yOff += lOff.top + (context == "window" ? 0 : pageScrollY())
      var xOff = lOff.left + (context == "window" ? 0 : pageScrollX())
      rect.left += xOff; rect.right += xOff
    }
    rect.top += yOff; rect.bottom += yOff
    return rect
  }

  // Coverts a box from "div" coords to another coordinate system.
  // Context may be "window", "page", "div", or "local"./null.
  function fromCoordSystem(cm, coords, context) {
    if (context == "div") { return coords }
    var left = coords.left, top = coords.top
    // First move into "page" coordinate system
    if (context == "page") {
      left -= pageScrollX()
      top -= pageScrollY()
    } else if (context == "local" || !context) {
      var localBox = cm.display.sizer.getBoundingClientRect()
      left += localBox.left
      top += localBox.top
    }

    var lineSpaceBox = cm.display.lineSpace.getBoundingClientRect()
    return {left: left - lineSpaceBox.left, top: top - lineSpaceBox.top}
  }

  function charCoords(cm, pos, context, lineObj, bias) {
    if (!lineObj) { lineObj = getLine(cm.doc, pos.line) }
    return intoCoordSystem(cm, lineObj, measureChar(cm, lineObj, pos.ch, bias), context)
  }

  // Returns a box for a given cursor position, which may have an
  // 'other' property containing the position of the secondary cursor
  // on a bidi boundary.
  // A cursor Pos(line, char, "before") is on the same visual line as `char - 1`
  // and after `char - 1` in writing order of `char - 1`
  // A cursor Pos(line, char, "after") is on the same visual line as `char`
  // and before `char` in writing order of `char`
  // Examples (upper-case letters are RTL, lower-case are LTR):
  //     Pos(0, 1, ...)
  //     before   after
  // ab     a|b     a|b
  // aB     a|B     aB|
  // Ab     |Ab     A|b
  // AB     B|A     B|A
  // Every position after the last character on a line is considered to stick
  // to the last character on the line.
  function cursorCoords(cm, pos, context, lineObj, preparedMeasure, varHeight) {
    lineObj = lineObj || getLine(cm.doc, pos.line)
    if (!preparedMeasure) { preparedMeasure = prepareMeasureForLine(cm, lineObj) }
    function get(ch, right) {
      var m = measureCharPrepared(cm, preparedMeasure, ch, right ? "right" : "left", varHeight)
      if (right) { m.left = m.right; } else { m.right = m.left }
      return intoCoordSystem(cm, lineObj, m, context)
    }
    var order = getOrder(lineObj, cm.doc.direction), ch = pos.ch, sticky = pos.sticky
    if (ch >= lineObj.text.length) {
      ch = lineObj.text.length
      sticky = "before"
    } else if (ch <= 0) {
      ch = 0
      sticky = "after"
    }
    if (!order) { return get(sticky == "before" ? ch - 1 : ch, sticky == "before") }

    function getBidi(ch, partPos, invert) {
      var part = order[partPos], right = part.level == 1
      return get(invert ? ch - 1 : ch, right != invert)
    }
    var partPos = getBidiPartAt(order, ch, sticky)
    var other = bidiOther
    var val = getBidi(ch, partPos, sticky == "before")
    if (other != null) { val.other = getBidi(ch, other, sticky != "before") }
    return val
  }

  // Used to cheaply estimate the coordinates for a position. Used for
  // intermediate scroll updates.
  function estimateCoords(cm, pos) {
    var left = 0
    pos = clipPos(cm.doc, pos)
    if (!cm.options.lineWrapping) { left = charWidth(cm.display) * pos.ch }
    var lineObj = getLine(cm.doc, pos.line)
    var top = heightAtLine(lineObj) + paddingTop(cm.display)
    return {left: left, right: left, top: top, bottom: top + lineObj.height}
  }

  // Positions returned by coordsChar contain some extra information.
  // xRel is the relative x position of the input coordinates compared
  // to the found position (so xRel > 0 means the coordinates are to
  // the right of the character position, for example). When outside
  // is true, that means the coordinates lie outside the line's
  // vertical range.
  function PosWithInfo(line, ch, sticky, outside, xRel) {
    var pos = Pos(line, ch, sticky)
    pos.xRel = xRel
    if (outside) { pos.outside = true }
    return pos
  }

  // Compute the character position closest to the given coordinates.
  // Input must be lineSpace-local ("div" coordinate system).
  function coordsChar(cm, x, y) {
    var doc = cm.doc
    y += cm.display.viewOffset
    if (y < 0) { return PosWithInfo(doc.first, 0, null, true, -1) }
    var lineN = lineAtHeight(doc, y), last = doc.first + doc.size - 1
    if (lineN > last)
      { return PosWithInfo(doc.first + doc.size - 1, getLine(doc, last).text.length, null, true, 1) }
    if (x < 0) { x = 0 }

    var lineObj = getLine(doc, lineN)
    for (;;) {
      var found = coordsCharInner(cm, lineObj, lineN, x, y)
      var merged = collapsedSpanAtEnd(lineObj)
      var mergedPos = merged && merged.find(0, true)
      if (merged && (found.ch > mergedPos.from.ch || found.ch == mergedPos.from.ch && found.xRel > 0))
        { lineN = lineNo(lineObj = mergedPos.to.line) }
      else
        { return found }
    }
  }

  function wrappedLineExtent(cm, lineObj, preparedMeasure, y) {
    y -= widgetTopHeight(lineObj)
    var end = lineObj.text.length
    var begin = findFirst(function (ch) { return measureCharPrepared(cm, preparedMeasure, ch - 1).bottom <= y; }, end, 0)
    end = findFirst(function (ch) { return measureCharPrepared(cm, preparedMeasure, ch).top > y; }, begin, end)
    return {begin: begin, end: end}
  }

  function wrappedLineExtentChar(cm, lineObj, preparedMeasure, target) {
    if (!preparedMeasure) { preparedMeasure = prepareMeasureForLine(cm, lineObj) }
    var targetTop = intoCoordSystem(cm, lineObj, measureCharPrepared(cm, preparedMeasure, target), "line").top
    return wrappedLineExtent(cm, lineObj, preparedMeasure, targetTop)
  }

  // Returns true if the given side of a box is after the given
  // coordinates, in top-to-bottom, left-to-right order.
  function boxIsAfter(box, x, y, left) {
    return box.bottom <= y ? false : box.top > y ? true : (left ? box.left : box.right) > x
  }

  function coordsCharInner(cm, lineObj, lineNo, x, y) {
    // Move y into line-local coordinate space
    y -= heightAtLine(lineObj)
    var preparedMeasure = prepareMeasureForLine(cm, lineObj)
    // When directly calling `measureCharPrepared`, we have to adjust
    // for the widgets at this line.
    var widgetHeight = widgetTopHeight(lineObj)
    var begin = 0, end = lineObj.text.length, ltr = true

    var order = getOrder(lineObj, cm.doc.direction)
    // If the line isn't plain left-to-right text, first figure out
    // which bidi section the coordinates fall into.
    if (order) {
      var part = (cm.options.lineWrapping ? coordsBidiPartWrapped : coordsBidiPart)
                   (cm, lineObj, lineNo, preparedMeasure, order, x, y)
      ltr = part.level != 1
      // The awkward -1 offsets are needed because findFirst (called
      // on these below) will treat its first bound as inclusive,
      // second as exclusive, but we want to actually address the
      // characters in the part's range
      begin = ltr ? part.from : part.to - 1
      end = ltr ? part.to : part.from - 1
    }

    // A binary search to find the first character whose bounding box
    // starts after the coordinates. If we run across any whose box wrap
    // the coordinates, store that.
    var chAround = null, boxAround = null
    var ch = findFirst(function (ch) {
      var box = measureCharPrepared(cm, preparedMeasure, ch)
      box.top += widgetHeight; box.bottom += widgetHeight
      if (!boxIsAfter(box, x, y, false)) { return false }
      if (box.top <= y && box.left <= x) {
        chAround = ch
        boxAround = box
      }
      return true
    }, begin, end)

    var baseX, sticky, outside = false
    // If a box around the coordinates was found, use that
    if (boxAround) {
      // Distinguish coordinates nearer to the left or right side of the box
      var atLeft = x - boxAround.left < boxAround.right - x, atStart = atLeft == ltr
      ch = chAround + (atStart ? 0 : 1)
      sticky = atStart ? "after" : "before"
      baseX = atLeft ? boxAround.left : boxAround.right
    } else {
      // (Adjust for extended bound, if necessary.)
      if (!ltr && (ch == end || ch == begin)) { ch++ }
      // To determine which side to associate with, get the box to the
      // left of the character and compare it's vertical position to the
      // coordinates
      sticky = ch == 0 ? "after" : ch == lineObj.text.length ? "before" :
        (measureCharPrepared(cm, preparedMeasure, ch - (ltr ? 1 : 0)).bottom + widgetHeight <= y) == ltr ?
        "after" : "before"
      // Now get accurate coordinates for this place, in order to get a
      // base X position
      var coords = cursorCoords(cm, Pos(lineNo, ch, sticky), "line", lineObj, preparedMeasure)
      baseX = coords.left
      outside = y < coords.top || y >= coords.bottom
    }

    ch = skipExtendingChars(lineObj.text, ch, 1)
    return PosWithInfo(lineNo, ch, sticky, outside, x - baseX)
  }

  function coordsBidiPart(cm, lineObj, lineNo, preparedMeasure, order, x, y) {
    // Bidi parts are sorted left-to-right, and in a non-line-wrapping
    // situation, we can take this ordering to correspond to the visual
    // ordering. This finds the first part whose end is after the given
    // coordinates.
    var index = findFirst(function (i) {
      var part = order[i], ltr = part.level != 1
      return boxIsAfter(cursorCoords(cm, Pos(lineNo, ltr ? part.to : part.from, ltr ? "before" : "after"),
                                     "line", lineObj, preparedMeasure), x, y, true)
    }, 0, order.length - 1)
    var part = order[index]
    // If this isn't the first part, the part's start is also after
    // the coordinates, and the coordinates aren't on the same line as
    // that start, move one part back.
    if (index > 0) {
      var ltr = part.level != 1
      var start = cursorCoords(cm, Pos(lineNo, ltr ? part.from : part.to, ltr ? "after" : "before"),
                               "line", lineObj, preparedMeasure)
      if (boxIsAfter(start, x, y, true) && start.top > y)
        { part = order[index - 1] }
    }
    return part
  }

  function coordsBidiPartWrapped(cm, lineObj, _lineNo, preparedMeasure, order, x, y) {
    // In a wrapped line, rtl text on wrapping boundaries can do things
    // that don't correspond to the ordering in our `order` array at
    // all, so a binary search doesn't work, and we want to return a
    // part that only spans one line so that the binary search in
    // coordsCharInner is safe. As such, we first find the extent of the
    // wrapped line, and then do a flat search in which we discard any
    // spans that aren't on the line.
    var ref = wrappedLineExtent(cm, lineObj, preparedMeasure, y);
    var begin = ref.begin;
    var end = ref.end;
    if (/\s/.test(lineObj.text.charAt(end - 1))) { end-- }
    var part = null, closestDist = null
    for (var i = 0; i < order.length; i++) {
      var p = order[i]
      if (p.from >= end || p.to <= begin) { continue }
      var ltr = p.level != 1
      var endX = measureCharPrepared(cm, preparedMeasure, ltr ? Math.min(end, p.to) - 1 : Math.max(begin, p.from)).right
      // Weigh against spans ending before this, so that they are only
      // picked if nothing ends after
      var dist = endX < x ? x - endX + 1e9 : endX - x
      if (!part || closestDist > dist) {
        part = p
        closestDist = dist
      }
    }
    if (!part) { part = order[order.length - 1] }
    // Clip the part to the wrapped line.
    if (part.from < begin) { part = {from: begin, to: part.to, level: part.level} }
    if (part.to > end) { part = {from: part.from, to: end, level: part.level} }
    return part
  }

  var measureText
  // Compute the default text height.
  function textHeight(display) {
    if (display.cachedTextHeight != null) { return display.cachedTextHeight }
    if (measureText == null) {
      measureText = elt("pre")
      // Measure a bunch of lines, for browsers that compute
      // fractional heights.
      for (var i = 0; i < 49; ++i) {
        measureText.appendChild(document.createTextNode("x"))
        measureText.appendChild(elt("br"))
      }
      measureText.appendChild(document.createTextNode("x"))
    }
    removeChildrenAndAdd(display.measure, measureText)
    var height = measureText.offsetHeight / 50
    if (height > 3) { display.cachedTextHeight = height }
    removeChildren(display.measure)
    return height || 1
  }

  // Compute the default character width.
  function charWidth(display) {
    if (display.cachedCharWidth != null) { return display.cachedCharWidth }
    var anchor = elt("span", "xxxxxxxxxx")
    var pre = elt("pre", [anchor])
    removeChildrenAndAdd(display.measure, pre)
    var rect = anchor.getBoundingClientRect(), width = (rect.right - rect.left) / 10
    if (width > 2) { display.cachedCharWidth = width }
    return width || 10
  }

  // Do a bulk-read of the DOM positions and sizes needed to draw the
  // view, so that we don't interleave reading and writing to the DOM.
  function getDimensions(cm) {
    var d = cm.display, left = {}, width = {}
    var gutterLeft = d.gutters.clientLeft
    for (var n = d.gutters.firstChild, i = 0; n; n = n.nextSibling, ++i) {
      left[cm.options.gutters[i]] = n.offsetLeft + n.clientLeft + gutterLeft
      width[cm.options.gutters[i]] = n.clientWidth
    }
    return {fixedPos: compensateForHScroll(d),
            gutterTotalWidth: d.gutters.offsetWidth,
            gutterLeft: left,
            gutterWidth: width,
            wrapperWidth: d.wrapper.clientWidth}
  }

  // Computes display.scroller.scrollLeft + display.gutters.offsetWidth,
  // but using getBoundingClientRect to get a sub-pixel-accurate
  // result.
  function compensateForHScroll(display) {
    return display.scroller.getBoundingClientRect().left - display.sizer.getBoundingClientRect().left
  }

  // Returns a function that estimates the height of a line, to use as
  // first approximation until the line becomes visible (and is thus
  // properly measurable).
  function estimateHeight(cm) {
    var th = textHeight(cm.display), wrapping = cm.options.lineWrapping
    var perLine = wrapping && Math.max(5, cm.display.scroller.clientWidth / charWidth(cm.display) - 3)
    return function (line) {
      if (lineIsHidden(cm.doc, line)) { return 0 }

      var widgetsHeight = 0
      if (line.widgets) { for (var i = 0; i < line.widgets.length; i++) {
        if (line.widgets[i].height) { widgetsHeight += line.widgets[i].height }
      } }

      if (wrapping)
        { return widgetsHeight + (Math.ceil(line.text.length / perLine) || 1) * th }
      else
        { return widgetsHeight + th }
    }
  }

  function estimateLineHeights(cm) {
    var doc = cm.doc, est = estimateHeight(cm)
    doc.iter(function (line) {
      var estHeight = est(line)
      if (estHeight != line.height) { updateLineHeight(line, estHeight) }
    })
  }

  // Given a mouse event, find the corresponding position. If liberal
  // is false, it checks whether a gutter or scrollbar was clicked,
  // and returns null if it was. forRect is used by rectangular
  // selections, and tries to estimate a character position even for
  // coordinates beyond the right of the text.
  function posFromMouse(cm, e, liberal, forRect) {
    var display = cm.display
    if (!liberal && e_target(e).getAttribute("cm-not-content") == "true") { return null }

    var x, y, space = display.lineSpace.getBoundingClientRect()
    // Fails unpredictably on IE[67] when mouse is dragged around quickly.
    try { x = e.clientX - space.left; y = e.clientY - space.top }
    catch (e) { return null }
    var coords = coordsChar(cm, x, y), line
    if (forRect && coords.xRel == 1 && (line = getLine(cm.doc, coords.line).text).length == coords.ch) {
      var colDiff = countColumn(line, line.length, cm.options.tabSize) - line.length
      coords = Pos(coords.line, Math.max(0, Math.round((x - paddingH(cm.display).left) / charWidth(cm.display)) - colDiff))
    }
    return coords
  }

  // Find the view element corresponding to a given line. Return null
  // when the line isn't visible.
  function findViewIndex(cm, n) {
    if (n >= cm.display.viewTo) { return null }
    n -= cm.display.viewFrom
    if (n < 0) { return null }
    var view = cm.display.view
    for (var i = 0; i < view.length; i++) {
      n -= view[i].size
      if (n < 0) { return i }
    }
  }

  function updateSelection(cm) {
    cm.display.input.showSelection(cm.display.input.prepareSelection())
  }

  function prepareSelection(cm, primary) {
    if ( primary === void 0 ) primary = true;

    var doc = cm.doc, result = {}
    var curFragment = result.cursors = document.createDocumentFragment()
    var selFragment = result.selection = document.createDocumentFragment()

    for (var i = 0; i < doc.sel.ranges.length; i++) {
      if (!primary && i == doc.sel.primIndex) { continue }
      var range = doc.sel.ranges[i]
      if (range.from().line >= cm.display.viewTo || range.to().line < cm.display.viewFrom) { continue }
      var collapsed = range.empty()
      if (collapsed || cm.options.showCursorWhenSelecting)
        { drawSelectionCursor(cm, range.head, curFragment) }
      if (!collapsed)
        { drawSelectionRange(cm, range, selFragment) }
    }
    return result
  }

  // Draws a cursor for the given range
  function drawSelectionCursor(cm, head, output) {
    var pos = cursorCoords(cm, head, "div", null, null, !cm.options.singleCursorHeightPerLine)

    var cursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor"))
    cursor.style.left = pos.left + "px"
    cursor.style.top = pos.top + "px"
    cursor.style.height = Math.max(0, pos.bottom - pos.top) * cm.options.cursorHeight + "px"

    if (pos.other) {
      // Secondary cursor, shown when on a 'jump' in bi-directional text
      var otherCursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor CodeMirror-secondarycursor"))
      otherCursor.style.display = ""
      otherCursor.style.left = pos.other.left + "px"
      otherCursor.style.top = pos.other.top + "px"
      otherCursor.style.height = (pos.other.bottom - pos.other.top) * .85 + "px"
    }
  }

  function cmpCoords(a, b) { return a.top - b.top || a.left - b.left }

  // Draws the given range as a highlighted selection
  function drawSelectionRange(cm, range, output) {
    var display = cm.display, doc = cm.doc
    var fragment = document.createDocumentFragment()
    var padding = paddingH(cm.display), leftSide = padding.left
    var rightSide = Math.max(display.sizerWidth, displayWidth(cm) - display.sizer.offsetLeft) - padding.right
    var docLTR = doc.direction == "ltr"

    function add(left, top, width, bottom) {
      if (top < 0) { top = 0 }
      top = Math.round(top)
      bottom = Math.round(bottom)
      fragment.appendChild(elt("div", null, "CodeMirror-selected", ("position: absolute; left: " + left + "px;\n                             top: " + top + "px; width: " + (width == null ? rightSide - left : width) + "px;\n                             height: " + (bottom - top) + "px")))
    }

    function drawForLine(line, fromArg, toArg) {
      var lineObj = getLine(doc, line)
      var lineLen = lineObj.text.length
      var start, end
      function coords(ch, bias) {
        return charCoords(cm, Pos(line, ch), "div", lineObj, bias)
      }

      function wrapX(pos, dir, side) {
        var extent = wrappedLineExtentChar(cm, lineObj, null, pos)
        var prop = (dir == "ltr") == (side == "after") ? "left" : "right"
        var ch = side == "after" ? extent.begin : extent.end - (/\s/.test(lineObj.text.charAt(extent.end - 1)) ? 2 : 1)
        return coords(ch, prop)[prop]
      }

      var order = getOrder(lineObj, doc.direction)
      iterateBidiSections(order, fromArg || 0, toArg == null ? lineLen : toArg, function (from, to, dir, i) {
        var ltr = dir == "ltr"
        var fromPos = coords(from, ltr ? "left" : "right")
        var toPos = coords(to - 1, ltr ? "right" : "left")

        var openStart = fromArg == null && from == 0, openEnd = toArg == null && to == lineLen
        var first = i == 0, last = !order || i == order.length - 1
        if (toPos.top - fromPos.top <= 3) { // Single line
          var openLeft = (docLTR ? openStart : openEnd) && first
          var openRight = (docLTR ? openEnd : openStart) && last
          var left = openLeft ? leftSide : (ltr ? fromPos : toPos).left
          var right = openRight ? rightSide : (ltr ? toPos : fromPos).right
          add(left, fromPos.top, right - left, fromPos.bottom)
        } else { // Multiple lines
          var topLeft, topRight, botLeft, botRight
          if (ltr) {
            topLeft = docLTR && openStart && first ? leftSide : fromPos.left
            topRight = docLTR ? rightSide : wrapX(from, dir, "before")
            botLeft = docLTR ? leftSide : wrapX(to, dir, "after")
            botRight = docLTR && openEnd && last ? rightSide : toPos.right
          } else {
            topLeft = !docLTR ? leftSide : wrapX(from, dir, "before")
            topRight = !docLTR && openStart && first ? rightSide : fromPos.right
            botLeft = !docLTR && openEnd && last ? leftSide : toPos.left
            botRight = !docLTR ? rightSide : wrapX(to, dir, "after")
          }
          add(topLeft, fromPos.top, topRight - topLeft, fromPos.bottom)
          if (fromPos.bottom < toPos.top) { add(leftSide, fromPos.bottom, null, toPos.top) }
          add(botLeft, toPos.top, botRight - botLeft, toPos.bottom)
        }

        if (!start || cmpCoords(fromPos, start) < 0) { start = fromPos }
        if (cmpCoords(toPos, start) < 0) { start = toPos }
        if (!end || cmpCoords(fromPos, end) < 0) { end = fromPos }
        if (cmpCoords(toPos, end) < 0) { end = toPos }
      })
      return {start: start, end: end}
    }

    var sFrom = range.from(), sTo = range.to()
    if (sFrom.line == sTo.line) {
      drawForLine(sFrom.line, sFrom.ch, sTo.ch)
    } else {
      var fromLine = getLine(doc, sFrom.line), toLine = getLine(doc, sTo.line)
      var singleVLine = visualLine(fromLine) == visualLine(toLine)
      var leftEnd = drawForLine(sFrom.line, sFrom.ch, singleVLine ? fromLine.text.length + 1 : null).end
      var rightStart = drawForLine(sTo.line, singleVLine ? 0 : null, sTo.ch).start
      if (singleVLine) {
        if (leftEnd.top < rightStart.top - 2) {
          add(leftEnd.right, leftEnd.top, null, leftEnd.bottom)
          add(leftSide, rightStart.top, rightStart.left, rightStart.bottom)
        } else {
          add(leftEnd.right, leftEnd.top, rightStart.left - leftEnd.right, leftEnd.bottom)
        }
      }
      if (leftEnd.bottom < rightStart.top)
        { add(leftSide, leftEnd.bottom, null, rightStart.top) }
    }

    output.appendChild(fragment)
  }

  // Cursor-blinking
  function restartBlink(cm) {
    if (!cm.state.focused) { return }
    var display = cm.display
    clearInterval(display.blinker)
    var on = true
    display.cursorDiv.style.visibility = ""
    if (cm.options.cursorBlinkRate > 0)
      { display.blinker = setInterval(function () { return display.cursorDiv.style.visibility = (on = !on) ? "" : "hidden"; },
        cm.options.cursorBlinkRate) }
    else if (cm.options.cursorBlinkRate < 0)
      { display.cursorDiv.style.visibility = "hidden" }
  }

  function ensureFocus(cm) {
    if (!cm.state.focused) { cm.display.input.focus(); onFocus(cm) }
  }

  function delayBlurEvent(cm) {
    cm.state.delayingBlurEvent = true
    setTimeout(function () { if (cm.state.delayingBlurEvent) {
      cm.state.delayingBlurEvent = false
      onBlur(cm)
    } }, 100)
  }

  function onFocus(cm, e) {
    if (cm.state.delayingBlurEvent) { cm.state.delayingBlurEvent = false }

    if (cm.options.readOnly == "nocursor") { return }
    if (!cm.state.focused) {
      signal(cm, "focus", cm, e)
      cm.state.focused = true
      addClass(cm.display.wrapper, "CodeMirror-focused")
      // This test prevents this from firing when a context
      // menu is closed (since the input reset would kill the
      // select-all detection hack)
      if (!cm.curOp && cm.display.selForContextMenu != cm.doc.sel) {
        cm.display.input.reset()
        if (webkit) { setTimeout(function () { return cm.display.input.reset(true); }, 20) } // Issue #1730
      }
      cm.display.input.receivedFocus()
    }
    restartBlink(cm)
  }
  function onBlur(cm, e) {
    if (cm.state.delayingBlurEvent) { return }

    if (cm.state.focused) {
      signal(cm, "blur", cm, e)
      cm.state.focused = false
      rmClass(cm.display.wrapper, "CodeMirror-focused")
    }
    clearInterval(cm.display.blinker)
    setTimeout(function () { if (!cm.state.focused) { cm.display.shift = false } }, 150)
  }

  // Read the actual heights of the rendered lines, and update their
  // stored heights to match.
  function updateHeightsInViewport(cm) {
    var display = cm.display
    var prevBottom = display.lineDiv.offsetTop
    for (var i = 0; i < display.view.length; i++) {
      var cur = display.view[i], height = (void 0)
      if (cur.hidden) { continue }
      if (ie && ie_version < 8) {
        var bot = cur.node.offsetTop + cur.node.offsetHeight
        height = bot - prevBottom
        prevBottom = bot
      } else {
        var box = cur.node.getBoundingClientRect()
        height = box.bottom - box.top
      }
      var diff = cur.line.height - height
      if (height < 2) { height = textHeight(display) }
      if (diff > .005 || diff < -.005) {
        updateLineHeight(cur.line, height)
        updateWidgetHeight(cur.line)
        if (cur.rest) { for (var j = 0; j < cur.rest.length; j++)
          { updateWidgetHeight(cur.rest[j]) } }
      }
    }
  }

  // Read and store the height of line widgets associated with the
  // given line.
  function updateWidgetHeight(line) {
    if (line.widgets) { for (var i = 0; i < line.widgets.length; ++i) {
      var w = line.widgets[i], parent = w.node.parentNode
      if (parent) { w.height = parent.offsetHeight }
    } }
  }

  // Compute the lines that are visible in a given viewport (defaults
  // the the current scroll position). viewport may contain top,
  // height, and ensure (see op.scrollToPos) properties.
  function visibleLines(display, doc, viewport) {
    var top = viewport && viewport.top != null ? Math.max(0, viewport.top) : display.scroller.scrollTop
    top = Math.floor(top - paddingTop(display))
    var bottom = viewport && viewport.bottom != null ? viewport.bottom : top + display.wrapper.clientHeight

    var from = lineAtHeight(doc, top), to = lineAtHeight(doc, bottom)
    // Ensure is a {from: {line, ch}, to: {line, ch}} object, and
    // forces those lines into the viewport (if possible).
    if (viewport && viewport.ensure) {
      var ensureFrom = viewport.ensure.from.line, ensureTo = viewport.ensure.to.line
      if (ensureFrom < from) {
        from = ensureFrom
        to = lineAtHeight(doc, heightAtLine(getLine(doc, ensureFrom)) + display.wrapper.clientHeight)
      } else if (Math.min(ensureTo, doc.lastLine()) >= to) {
        from = lineAtHeight(doc, heightAtLine(getLine(doc, ensureTo)) - display.wrapper.clientHeight)
        to = ensureTo
      }
    }
    return {from: from, to: Math.max(to, from + 1)}
  }

  // Re-align line numbers and gutter marks to compensate for
  // horizontal scrolling.
  function alignHorizontally(cm) {
    var display = cm.display, view = display.view
    if (!display.alignWidgets && (!display.gutters.firstChild || !cm.options.fixedGutter)) { return }
    var comp = compensateForHScroll(display) - display.scroller.scrollLeft + cm.doc.scrollLeft
    var gutterW = display.gutters.offsetWidth, left = comp + "px"
    for (var i = 0; i < view.length; i++) { if (!view[i].hidden) {
      if (cm.options.fixedGutter) {
        if (view[i].gutter)
          { view[i].gutter.style.left = left }
        if (view[i].gutterBackground)
          { view[i].gutterBackground.style.left = left }
      }
      var align = view[i].alignable
      if (align) { for (var j = 0; j < align.length; j++)
        { align[j].style.left = left } }
    } }
    if (cm.options.fixedGutter)
      { display.gutters.style.left = (comp + gutterW) + "px" }
  }

  // Used to ensure that the line number gutter is still the right
  // size for the current document size. Returns true when an update
  // is needed.
  function maybeUpdateLineNumberWidth(cm) {
    if (!cm.options.lineNumbers) { return false }
    var doc = cm.doc, last = lineNumberFor(cm.options, doc.first + doc.size - 1), display = cm.display
    if (last.length != display.lineNumChars) {
      var test = display.measure.appendChild(elt("div", [elt("div", last)],
                                                 "CodeMirror-linenumber CodeMirror-gutter-elt"))
      var innerW = test.firstChild.offsetWidth, padding = test.offsetWidth - innerW
      display.lineGutter.style.width = ""
      display.lineNumInnerWidth = Math.max(innerW, display.lineGutter.offsetWidth - padding) + 1
      display.lineNumWidth = display.lineNumInnerWidth + padding
      display.lineNumChars = display.lineNumInnerWidth ? last.length : -1
      display.lineGutter.style.width = display.lineNumWidth + "px"
      updateGutterSpace(cm)
      return true
    }
    return false
  }

  // SCROLLING THINGS INTO VIEW

  // If an editor sits on the top or bottom of the window, partially
  // scrolled out of view, this ensures that the cursor is visible.
  function maybeScrollWindow(cm, rect) {
    if (signalDOMEvent(cm, "scrollCursorIntoView")) { return }

    var display = cm.display, box = display.sizer.getBoundingClientRect(), doScroll = null
    if (rect.top + box.top < 0) { doScroll = true }
    else if (rect.bottom + box.top > (window.innerHeight || document.documentElement.clientHeight)) { doScroll = false }
    if (doScroll != null && !phantom) {
      var scrollNode = elt("div", "\u200b", null, ("position: absolute;\n                         top: " + (rect.top - display.viewOffset - paddingTop(cm.display)) + "px;\n                         height: " + (rect.bottom - rect.top + scrollGap(cm) + display.barHeight) + "px;\n                         left: " + (rect.left) + "px; width: " + (Math.max(2, rect.right - rect.left)) + "px;"))
      cm.display.lineSpace.appendChild(scrollNode)
      scrollNode.scrollIntoView(doScroll)
      cm.display.lineSpace.removeChild(scrollNode)
    }
  }

  // Scroll a given position into view (immediately), verifying that
  // it actually became visible (as line heights are accurately
  // measured, the position of something may 'drift' during drawing).
  function scrollPosIntoView(cm, pos, end, margin) {
    if (margin == null) { margin = 0 }
    var rect
    if (!cm.options.lineWrapping && pos == end) {
      // Set pos and end to the cursor positions around the character pos sticks to
      // If pos.sticky == "before", that is around pos.ch - 1, otherwise around pos.ch
      // If pos == Pos(_, 0, "before"), pos and end are unchanged
      pos = pos.ch ? Pos(pos.line, pos.sticky == "before" ? pos.ch - 1 : pos.ch, "after") : pos
      end = pos.sticky == "before" ? Pos(pos.line, pos.ch + 1, "before") : pos
    }
    for (var limit = 0; limit < 5; limit++) {
      var changed = false
      var coords = cursorCoords(cm, pos)
      var endCoords = !end || end == pos ? coords : cursorCoords(cm, end)
      rect = {left: Math.min(coords.left, endCoords.left),
              top: Math.min(coords.top, endCoords.top) - margin,
              right: Math.max(coords.left, endCoords.left),
              bottom: Math.max(coords.bottom, endCoords.bottom) + margin}
      var scrollPos = calculateScrollPos(cm, rect)
      var startTop = cm.doc.scrollTop, startLeft = cm.doc.scrollLeft
      if (scrollPos.scrollTop != null) {
        updateScrollTop(cm, scrollPos.scrollTop)
        if (Math.abs(cm.doc.scrollTop - startTop) > 1) { changed = true }
      }
      if (scrollPos.scrollLeft != null) {
        setScrollLeft(cm, scrollPos.scrollLeft)
        if (Math.abs(cm.doc.scrollLeft - startLeft) > 1) { changed = true }
      }
      if (!changed) { break }
    }
    return rect
  }

  // Scroll a given set of coordinates into view (immediately).
  function scrollIntoView(cm, rect) {
    var scrollPos = calculateScrollPos(cm, rect)
    if (scrollPos.scrollTop != null) { updateScrollTop(cm, scrollPos.scrollTop) }
    if (scrollPos.scrollLeft != null) { setScrollLeft(cm, scrollPos.scrollLeft) }
  }

  // Calculate a new scroll position needed to scroll the given
  // rectangle into view. Returns an object with scrollTop and
  // scrollLeft properties. When these are undefined, the
  // vertical/horizontal position does not need to be adjusted.
  function calculateScrollPos(cm, rect) {
    var display = cm.display, snapMargin = textHeight(cm.display)
    if (rect.top < 0) { rect.top = 0 }
    var screentop = cm.curOp && cm.curOp.scrollTop != null ? cm.curOp.scrollTop : display.scroller.scrollTop
    var screen = displayHeight(cm), result = {}
    if (rect.bottom - rect.top > screen) { rect.bottom = rect.top + screen }
    var docBottom = cm.doc.height + paddingVert(display)
    var atTop = rect.top < snapMargin, atBottom = rect.bottom > docBottom - snapMargin
    if (rect.top < screentop) {
      result.scrollTop = atTop ? 0 : rect.top
    } else if (rect.bottom > screentop + screen) {
      var newTop = Math.min(rect.top, (atBottom ? docBottom : rect.bottom) - screen)
      if (newTop != screentop) { result.scrollTop = newTop }
    }

    var screenleft = cm.curOp && cm.curOp.scrollLeft != null ? cm.curOp.scrollLeft : display.scroller.scrollLeft
    var screenw = displayWidth(cm) - (cm.options.fixedGutter ? display.gutters.offsetWidth : 0)
    var tooWide = rect.right - rect.left > screenw
    if (tooWide) { rect.right = rect.left + screenw }
    if (rect.left < 10)
      { result.scrollLeft = 0 }
    else if (rect.left < screenleft)
      { result.scrollLeft = Math.max(0, rect.left - (tooWide ? 0 : 10)) }
    else if (rect.right > screenw + screenleft - 3)
      { result.scrollLeft = rect.right + (tooWide ? 0 : 10) - screenw }
    return result
  }

  // Store a relative adjustment to the scroll position in the current
  // operation (to be applied when the operation finishes).
  function addToScrollTop(cm, top) {
    if (top == null) { return }
    resolveScrollToPos(cm)
    cm.curOp.scrollTop = (cm.curOp.scrollTop == null ? cm.doc.scrollTop : cm.curOp.scrollTop) + top
  }

  // Make sure that at the end of the operation the current cursor is
  // shown.
  function ensureCursorVisible(cm) {
    resolveScrollToPos(cm)
    var cur = cm.getCursor()
    cm.curOp.scrollToPos = {from: cur, to: cur, margin: cm.options.cursorScrollMargin}
  }

  function scrollToCoords(cm, x, y) {
    if (x != null || y != null) { resolveScrollToPos(cm) }
    if (x != null) { cm.curOp.scrollLeft = x }
    if (y != null) { cm.curOp.scrollTop = y }
  }

  function scrollToRange(cm, range) {
    resolveScrollToPos(cm)
    cm.curOp.scrollToPos = range
  }

  // When an operation has its scrollToPos property set, and another
  // scroll action is applied before the end of the operation, this
  // 'simulates' scrolling that position into view in a cheap way, so
  // that the effect of intermediate scroll commands is not ignored.
  function resolveScrollToPos(cm) {
    var range = cm.curOp.scrollToPos
    if (range) {
      cm.curOp.scrollToPos = null
      var from = estimateCoords(cm, range.from), to = estimateCoords(cm, range.to)
      scrollToCoordsRange(cm, from, to, range.margin)
    }
  }

  function scrollToCoordsRange(cm, from, to, margin) {
    var sPos = calculateScrollPos(cm, {
      left: Math.min(from.left, to.left),
      top: Math.min(from.top, to.top) - margin,
      right: Math.max(from.right, to.right),
      bottom: Math.max(from.bottom, to.bottom) + margin
    })
    scrollToCoords(cm, sPos.scrollLeft, sPos.scrollTop)
  }

  // Sync the scrollable area and scrollbars, ensure the viewport
  // covers the visible area.
  function updateScrollTop(cm, val) {
    if (Math.abs(cm.doc.scrollTop - val) < 2) { return }
    if (!gecko) { updateDisplaySimple(cm, {top: val}) }
    setScrollTop(cm, val, true)
    if (gecko) { updateDisplaySimple(cm) }
    startWorker(cm, 100)
  }

  function setScrollTop(cm, val, forceScroll) {
    val = Math.min(cm.display.scroller.scrollHeight - cm.display.scroller.clientHeight, val)
    if (cm.display.scroller.scrollTop == val && !forceScroll) { return }
    cm.doc.scrollTop = val
    cm.display.scrollbars.setScrollTop(val)
    if (cm.display.scroller.scrollTop != val) { cm.display.scroller.scrollTop = val }
  }

  // Sync scroller and scrollbar, ensure the gutter elements are
  // aligned.
  function setScrollLeft(cm, val, isScroller, forceScroll) {
    val = Math.min(val, cm.display.scroller.scrollWidth - cm.display.scroller.clientWidth)
    if ((isScroller ? val == cm.doc.scrollLeft : Math.abs(cm.doc.scrollLeft - val) < 2) && !forceScroll) { return }
    cm.doc.scrollLeft = val
    alignHorizontally(cm)
    if (cm.display.scroller.scrollLeft != val) { cm.display.scroller.scrollLeft = val }
    cm.display.scrollbars.setScrollLeft(val)
  }

  // SCROLLBARS

  // Prepare DOM reads needed to update the scrollbars. Done in one
  // shot to minimize update/measure roundtrips.
  function measureForScrollbars(cm) {
    var d = cm.display, gutterW = d.gutters.offsetWidth
    var docH = Math.round(cm.doc.height + paddingVert(cm.display))
    return {
      clientHeight: d.scroller.clientHeight,
      viewHeight: d.wrapper.clientHeight,
      scrollWidth: d.scroller.scrollWidth, clientWidth: d.scroller.clientWidth,
      viewWidth: d.wrapper.clientWidth,
      barLeft: cm.options.fixedGutter ? gutterW : 0,
      docHeight: docH,
      scrollHeight: docH + scrollGap(cm) + d.barHeight,
      nativeBarWidth: d.nativeBarWidth,
      gutterWidth: gutterW
    }
  }

  var NativeScrollbars = function(place, scroll, cm) {
    this.cm = cm
    var vert = this.vert = elt("div", [elt("div", null, null, "min-width: 1px")], "CodeMirror-vscrollbar")
    var horiz = this.horiz = elt("div", [elt("div", null, null, "height: 100%; min-height: 1px")], "CodeMirror-hscrollbar")
    place(vert); place(horiz)

    on(vert, "scroll", function () {
      if (vert.clientHeight) { scroll(vert.scrollTop, "vertical") }
    })
    on(horiz, "scroll", function () {
      if (horiz.clientWidth) { scroll(horiz.scrollLeft, "horizontal") }
    })

    this.checkedZeroWidth = false
    // Need to set a minimum width to see the scrollbar on IE7 (but must not set it on IE8).
    if (ie && ie_version < 8) { this.horiz.style.minHeight = this.vert.style.minWidth = "18px" }
  };

  NativeScrollbars.prototype.update = function (measure) {
    var needsH = measure.scrollWidth > measure.clientWidth + 1
    var needsV = measure.scrollHeight > measure.clientHeight + 1
    var sWidth = measure.nativeBarWidth

    if (needsV) {
      this.vert.style.display = "block"
      this.vert.style.bottom = needsH ? sWidth + "px" : "0"
      var totalHeight = measure.viewHeight - (needsH ? sWidth : 0)
      // A bug in IE8 can cause this value to be negative, so guard it.
      this.vert.firstChild.style.height =
        Math.max(0, measure.scrollHeight - measure.clientHeight + totalHeight) + "px"
    } else {
      this.vert.style.display = ""
      this.vert.firstChild.style.height = "0"
    }

    if (needsH) {
      this.horiz.style.display = "block"
      this.horiz.style.right = needsV ? sWidth + "px" : "0"
      this.horiz.style.left = measure.barLeft + "px"
      var totalWidth = measure.viewWidth - measure.barLeft - (needsV ? sWidth : 0)
      this.horiz.firstChild.style.width =
        Math.max(0, measure.scrollWidth - measure.clientWidth + totalWidth) + "px"
    } else {
      this.horiz.style.display = ""
      this.horiz.firstChild.style.width = "0"
    }

    if (!this.checkedZeroWidth && measure.clientHeight > 0) {
      if (sWidth == 0) { this.zeroWidthHack() }
      this.checkedZeroWidth = true
    }

    return {right: needsV ? sWidth : 0, bottom: needsH ? sWidth : 0}
  };

  NativeScrollbars.prototype.setScrollLeft = function (pos) {
    if (this.horiz.scrollLeft != pos) { this.horiz.scrollLeft = pos }
    if (this.disableHoriz) { this.enableZeroWidthBar(this.horiz, this.disableHoriz, "horiz") }
  };

  NativeScrollbars.prototype.setScrollTop = function (pos) {
    if (this.vert.scrollTop != pos) { this.vert.scrollTop = pos }
    if (this.disableVert) { this.enableZeroWidthBar(this.vert, this.disableVert, "vert") }
  };

  NativeScrollbars.prototype.zeroWidthHack = function () {
    var w = mac && !mac_geMountainLion ? "12px" : "18px"
    this.horiz.style.height = this.vert.style.width = w
    this.horiz.style.pointerEvents = this.vert.style.pointerEvents = "none"
    this.disableHoriz = new Delayed
    this.disableVert = new Delayed
  };

  NativeScrollbars.prototype.enableZeroWidthBar = function (bar, delay, type) {
    bar.style.pointerEvents = "auto"
    function maybeDisable() {
      // To find out whether the scrollbar is still visible, we
      // check whether the element under the pixel in the bottom
      // right corner of the scrollbar box is the scrollbar box
      // itself (when the bar is still visible) or its filler child
      // (when the bar is hidden). If it is still visible, we keep
      // it enabled, if it's hidden, we disable pointer events.
      var box = bar.getBoundingClientRect()
      var elt = type == "vert" ? document.elementFromPoint(box.right - 1, (box.top + box.bottom) / 2)
          : document.elementFromPoint((box.right + box.left) / 2, box.bottom - 1)
      if (elt != bar) { bar.style.pointerEvents = "none" }
      else { delay.set(1000, maybeDisable) }
    }
    delay.set(1000, maybeDisable)
  };

  NativeScrollbars.prototype.clear = function () {
    var parent = this.horiz.parentNode
    parent.removeChild(this.horiz)
    parent.removeChild(this.vert)
  };

  var NullScrollbars = function () {};

  NullScrollbars.prototype.update = function () { return {bottom: 0, right: 0} };
  NullScrollbars.prototype.setScrollLeft = function () {};
  NullScrollbars.prototype.setScrollTop = function () {};
  NullScrollbars.prototype.clear = function () {};

  function updateScrollbars(cm, measure) {
    if (!measure) { measure = measureForScrollbars(cm) }
    var startWidth = cm.display.barWidth, startHeight = cm.display.barHeight
    updateScrollbarsInner(cm, measure)
    for (var i = 0; i < 4 && startWidth != cm.display.barWidth || startHeight != cm.display.barHeight; i++) {
      if (startWidth != cm.display.barWidth && cm.options.lineWrapping)
        { updateHeightsInViewport(cm) }
      updateScrollbarsInner(cm, measureForScrollbars(cm))
      startWidth = cm.display.barWidth; startHeight = cm.display.barHeight
    }
  }

  // Re-synchronize the fake scrollbars with the actual size of the
  // content.
  function updateScrollbarsInner(cm, measure) {
    var d = cm.display
    var sizes = d.scrollbars.update(measure)

    d.sizer.style.paddingRight = (d.barWidth = sizes.right) + "px"
    d.sizer.style.paddingBottom = (d.barHeight = sizes.bottom) + "px"
    d.heightForcer.style.borderBottom = sizes.bottom + "px solid transparent"

    if (sizes.right && sizes.bottom) {
      d.scrollbarFiller.style.display = "block"
      d.scrollbarFiller.style.height = sizes.bottom + "px"
      d.scrollbarFiller.style.width = sizes.right + "px"
    } else { d.scrollbarFiller.style.display = "" }
    if (sizes.bottom && cm.options.coverGutterNextToScrollbar && cm.options.fixedGutter) {
      d.gutterFiller.style.display = "block"
      d.gutterFiller.style.height = sizes.bottom + "px"
      d.gutterFiller.style.width = measure.gutterWidth + "px"
    } else { d.gutterFiller.style.display = "" }
  }

  var scrollbarModel = {"native": NativeScrollbars, "null": NullScrollbars}

  function initScrollbars(cm) {
    if (cm.display.scrollbars) {
      cm.display.scrollbars.clear()
      if (cm.display.scrollbars.addClass)
        { rmClass(cm.display.wrapper, cm.display.scrollbars.addClass) }
    }

    cm.display.scrollbars = new scrollbarModel[cm.options.scrollbarStyle](function (node) {
      cm.display.wrapper.insertBefore(node, cm.display.scrollbarFiller)
      // Prevent clicks in the scrollbars from killing focus
      on(node, "mousedown", function () {
        if (cm.state.focused) { setTimeout(function () { return cm.display.input.focus(); }, 0) }
      })
      node.setAttribute("cm-not-content", "true")
    }, function (pos, axis) {
      if (axis == "horizontal") { setScrollLeft(cm, pos) }
      else { updateScrollTop(cm, pos) }
    }, cm)
    if (cm.display.scrollbars.addClass)
      { addClass(cm.display.wrapper, cm.display.scrollbars.addClass) }
  }

  // Operations are used to wrap a series of changes to the editor
  // state in such a way that each change won't have to update the
  // cursor and display (which would be awkward, slow, and
  // error-prone). Instead, display updates are batched and then all
  // combined and executed at once.

  var nextOpId = 0
  // Start a new operation.
  function startOperation(cm) {
    cm.curOp = {
      cm: cm,
      viewChanged: false,      // Flag that indicates that lines might need to be redrawn
      startHeight: cm.doc.height, // Used to detect need to update scrollbar
      forceUpdate: false,      // Used to force a redraw
      updateInput: null,       // Whether to reset the input textarea
      typing: false,           // Whether this reset should be careful to leave existing text (for compositing)
      changeObjs: null,        // Accumulated changes, for firing change events
      cursorActivityHandlers: null, // Set of handlers to fire cursorActivity on
      cursorActivityCalled: 0, // Tracks which cursorActivity handlers have been called already
      selectionChanged: false, // Whether the selection needs to be redrawn
      updateMaxLine: false,    // Set when the widest line needs to be determined anew
      scrollLeft: null, scrollTop: null, // Intermediate scroll position, not pushed to DOM yet
      scrollToPos: null,       // Used to scroll to a specific position
      focus: false,
      id: ++nextOpId           // Unique ID
    }
    pushOperation(cm.curOp)
  }

  // Finish an operation, updating the display and signalling delayed events
  function endOperation(cm) {
    var op = cm.curOp
    finishOperation(op, function (group) {
      for (var i = 0; i < group.ops.length; i++)
        { group.ops[i].cm.curOp = null }
      endOperations(group)
    })
  }

  // The DOM updates done when an operation finishes are batched so
  // that the minimum number of relayouts are required.
  function endOperations(group) {
    var ops = group.ops
    for (var i = 0; i < ops.length; i++) // Read DOM
      { endOperation_R1(ops[i]) }
    for (var i$1 = 0; i$1 < ops.length; i$1++) // Write DOM (maybe)
      { endOperation_W1(ops[i$1]) }
    for (var i$2 = 0; i$2 < ops.length; i$2++) // Read DOM
      { endOperation_R2(ops[i$2]) }
    for (var i$3 = 0; i$3 < ops.length; i$3++) // Write DOM (maybe)
      { endOperation_W2(ops[i$3]) }
    for (var i$4 = 0; i$4 < ops.length; i$4++) // Read DOM
      { endOperation_finish(ops[i$4]) }
  }

  function endOperation_R1(op) {
    var cm = op.cm, display = cm.display
    maybeClipScrollbars(cm)
    if (op.updateMaxLine) { findMaxLine(cm) }

    op.mustUpdate = op.viewChanged || op.forceUpdate || op.scrollTop != null ||
      op.scrollToPos && (op.scrollToPos.from.line < display.viewFrom ||
                         op.scrollToPos.to.line >= display.viewTo) ||
      display.maxLineChanged && cm.options.lineWrapping
    op.update = op.mustUpdate &&
      new DisplayUpdate(cm, op.mustUpdate && {top: op.scrollTop, ensure: op.scrollToPos}, op.forceUpdate)
  }

  function endOperation_W1(op) {
    op.updatedDisplay = op.mustUpdate && updateDisplayIfNeeded(op.cm, op.update)
  }

  function endOperation_R2(op) {
    var cm = op.cm, display = cm.display
    if (op.updatedDisplay) { updateHeightsInViewport(cm) }

    op.barMeasure = measureForScrollbars(cm)

    // If the max line changed since it was last measured, measure it,
    // and ensure the document's width matches it.
    // updateDisplay_W2 will use these properties to do the actual resizing
    if (display.maxLineChanged && !cm.options.lineWrapping) {
      op.adjustWidthTo = measureChar(cm, display.maxLine, display.maxLine.text.length).left + 3
      cm.display.sizerWidth = op.adjustWidthTo
      op.barMeasure.scrollWidth =
        Math.max(display.scroller.clientWidth, display.sizer.offsetLeft + op.adjustWidthTo + scrollGap(cm) + cm.display.barWidth)
      op.maxScrollLeft = Math.max(0, display.sizer.offsetLeft + op.adjustWidthTo - displayWidth(cm))
    }

    if (op.updatedDisplay || op.selectionChanged)
      { op.preparedSelection = display.input.prepareSelection() }
  }

  function endOperation_W2(op) {
    var cm = op.cm

    if (op.adjustWidthTo != null) {
      cm.display.sizer.style.minWidth = op.adjustWidthTo + "px"
      if (op.maxScrollLeft < cm.doc.scrollLeft)
        { setScrollLeft(cm, Math.min(cm.display.scroller.scrollLeft, op.maxScrollLeft), true) }
      cm.display.maxLineChanged = false
    }

    var takeFocus = op.focus && op.focus == activeElt()
    if (op.preparedSelection)
      { cm.display.input.showSelection(op.preparedSelection, takeFocus) }
    if (op.updatedDisplay || op.startHeight != cm.doc.height)
      { updateScrollbars(cm, op.barMeasure) }
    if (op.updatedDisplay)
      { setDocumentHeight(cm, op.barMeasure) }

    if (op.selectionChanged) { restartBlink(cm) }

    if (cm.state.focused && op.updateInput)
      { cm.display.input.reset(op.typing) }
    if (takeFocus) { ensureFocus(op.cm) }
  }

  function endOperation_finish(op) {
    var cm = op.cm, display = cm.display, doc = cm.doc

    if (op.updatedDisplay) { postUpdateDisplay(cm, op.update) }

    // Abort mouse wheel delta measurement, when scrolling explicitly
    if (display.wheelStartX != null && (op.scrollTop != null || op.scrollLeft != null || op.scrollToPos))
      { display.wheelStartX = display.wheelStartY = null }

    // Propagate the scroll position to the actual DOM scroller
    if (op.scrollTop != null) { setScrollTop(cm, op.scrollTop, op.forceScroll) }

    if (op.scrollLeft != null) { setScrollLeft(cm, op.scrollLeft, true, true) }
    // If we need to scroll a specific position into view, do so.
    if (op.scrollToPos) {
      var rect = scrollPosIntoView(cm, clipPos(doc, op.scrollToPos.from),
                                   clipPos(doc, op.scrollToPos.to), op.scrollToPos.margin)
      maybeScrollWindow(cm, rect)
    }

    // Fire events for markers that are hidden/unidden by editing or
    // undoing
    var hidden = op.maybeHiddenMarkers, unhidden = op.maybeUnhiddenMarkers
    if (hidden) { for (var i = 0; i < hidden.length; ++i)
      { if (!hidden[i].lines.length) { signal(hidden[i], "hide") } } }
    if (unhidden) { for (var i$1 = 0; i$1 < unhidden.length; ++i$1)
      { if (unhidden[i$1].lines.length) { signal(unhidden[i$1], "unhide") } } }

    if (display.wrapper.offsetHeight)
      { doc.scrollTop = cm.display.scroller.scrollTop }

    // Fire change events, and delayed event handlers
    if (op.changeObjs)
      { signal(cm, "changes", cm, op.changeObjs) }
    if (op.update)
      { op.update.finish() }
  }

  // Run the given function in an operation
  function runInOp(cm, f) {
    if (cm.curOp) { return f() }
    startOperation(cm)
    try { return f() }
    finally { endOperation(cm) }
  }
  // Wraps a function in an operation. Returns the wrapped function.
  function operation(cm, f) {
    return function() {
      if (cm.curOp) { return f.apply(cm, arguments) }
      startOperation(cm)
      try { return f.apply(cm, arguments) }
      finally { endOperation(cm) }
    }
  }
  // Used to add methods to editor and doc instances, wrapping them in
  // operations.
  function methodOp(f) {
    return function() {
      if (this.curOp) { return f.apply(this, arguments) }
      startOperation(this)
      try { return f.apply(this, arguments) }
      finally { endOperation(this) }
    }
  }
  function docMethodOp(f) {
    return function() {
      var cm = this.cm
      if (!cm || cm.curOp) { return f.apply(this, arguments) }
      startOperation(cm)
      try { return f.apply(this, arguments) }
      finally { endOperation(cm) }
    }
  }

  // Updates the display.view data structure for a given change to the
  // document. From and to are in pre-change coordinates. Lendiff is
  // the amount of lines added or subtracted by the change. This is
  // used for changes that span multiple lines, or change the way
  // lines are divided into visual lines. regLineChange (below)
  // registers single-line changes.
  function regChange(cm, from, to, lendiff) {
    if (from == null) { from = cm.doc.first }
    if (to == null) { to = cm.doc.first + cm.doc.size }
    if (!lendiff) { lendiff = 0 }

    var display = cm.display
    if (lendiff && to < display.viewTo &&
        (display.updateLineNumbers == null || display.updateLineNumbers > from))
      { display.updateLineNumbers = from }

    cm.curOp.viewChanged = true

    if (from >= display.viewTo) { // Change after
      if (sawCollapsedSpans && visualLineNo(cm.doc, from) < display.viewTo)
        { resetView(cm) }
    } else if (to <= display.viewFrom) { // Change before
      if (sawCollapsedSpans && visualLineEndNo(cm.doc, to + lendiff) > display.viewFrom) {
        resetView(cm)
      } else {
        display.viewFrom += lendiff
        display.viewTo += lendiff
      }
    } else if (from <= display.viewFrom && to >= display.viewTo) { // Full overlap
      resetView(cm)
    } else if (from <= display.viewFrom) { // Top overlap
      var cut = viewCuttingPoint(cm, to, to + lendiff, 1)
      if (cut) {
        display.view = display.view.slice(cut.index)
        display.viewFrom = cut.lineN
        display.viewTo += lendiff
      } else {
        resetView(cm)
      }
    } else if (to >= display.viewTo) { // Bottom overlap
      var cut$1 = viewCuttingPoint(cm, from, from, -1)
      if (cut$1) {
        display.view = display.view.slice(0, cut$1.index)
        display.viewTo = cut$1.lineN
      } else {
        resetView(cm)
      }
    } else { // Gap in the middle
      var cutTop = viewCuttingPoint(cm, from, from, -1)
      var cutBot = viewCuttingPoint(cm, to, to + lendiff, 1)
      if (cutTop && cutBot) {
        display.view = display.view.slice(0, cutTop.index)
          .concat(buildViewArray(cm, cutTop.lineN, cutBot.lineN))
          .concat(display.view.slice(cutBot.index))
        display.viewTo += lendiff
      } else {
        resetView(cm)
      }
    }

    var ext = display.externalMeasured
    if (ext) {
      if (to < ext.lineN)
        { ext.lineN += lendiff }
      else if (from < ext.lineN + ext.size)
        { display.externalMeasured = null }
    }
  }

  // Register a change to a single line. Type must be one of "text",
  // "gutter", "class", "widget"
  function regLineChange(cm, line, type) {
    cm.curOp.viewChanged = true
    var display = cm.display, ext = cm.display.externalMeasured
    if (ext && line >= ext.lineN && line < ext.lineN + ext.size)
      { display.externalMeasured = null }

    if (line < display.viewFrom || line >= display.viewTo) { return }
    var lineView = display.view[findViewIndex(cm, line)]
    if (lineView.node == null) { return }
    var arr = lineView.changes || (lineView.changes = [])
    if (indexOf(arr, type) == -1) { arr.push(type) }
  }

  // Clear the view.
  function resetView(cm) {
    cm.display.viewFrom = cm.display.viewTo = cm.doc.first
    cm.display.view = []
    cm.display.viewOffset = 0
  }

  function viewCuttingPoint(cm, oldN, newN, dir) {
    var index = findViewIndex(cm, oldN), diff, view = cm.display.view
    if (!sawCollapsedSpans || newN == cm.doc.first + cm.doc.size)
      { return {index: index, lineN: newN} }
    var n = cm.display.viewFrom
    for (var i = 0; i < index; i++)
      { n += view[i].size }
    if (n != oldN) {
      if (dir > 0) {
        if (index == view.length - 1) { return null }
        diff = (n + view[index].size) - oldN
        index++
      } else {
        diff = n - oldN
      }
      oldN += diff; newN += diff
    }
    while (visualLineNo(cm.doc, newN) != newN) {
      if (index == (dir < 0 ? 0 : view.length - 1)) { return null }
      newN += dir * view[index - (dir < 0 ? 1 : 0)].size
      index += dir
    }
    return {index: index, lineN: newN}
  }

  // Force the view to cover a given range, adding empty view element
  // or clipping off existing ones as needed.
  function adjustView(cm, from, to) {
    var display = cm.display, view = display.view
    if (view.length == 0 || from >= display.viewTo || to <= display.viewFrom) {
      display.view = buildViewArray(cm, from, to)
      display.viewFrom = from
    } else {
      if (display.viewFrom > from)
        { display.view = buildViewArray(cm, from, display.viewFrom).concat(display.view) }
      else if (display.viewFrom < from)
        { display.view = display.view.slice(findViewIndex(cm, from)) }
      display.viewFrom = from
      if (display.viewTo < to)
        { display.view = display.view.concat(buildViewArray(cm, display.viewTo, to)) }
      else if (display.viewTo > to)
        { display.view = display.view.slice(0, findViewIndex(cm, to)) }
    }
    display.viewTo = to
  }

  // Count the number of lines in the view whose DOM representation is
  // out of date (or nonexistent).
  function countDirtyView(cm) {
    var view = cm.display.view, dirty = 0
    for (var i = 0; i < view.length; i++) {
      var lineView = view[i]
      if (!lineView.hidden && (!lineView.node || lineView.changes)) { ++dirty }
    }
    return dirty
  }

  // HIGHLIGHT WORKER

  function startWorker(cm, time) {
    if (cm.doc.highlightFrontier < cm.display.viewTo)
      { cm.state.highlight.set(time, bind(highlightWorker, cm)) }
  }

  function highlightWorker(cm) {
    var doc = cm.doc
    if (doc.highlightFrontier >= cm.display.viewTo) { return }
    var end = +new Date + cm.options.workTime
    var context = getContextBefore(cm, doc.highlightFrontier)
    var changedLines = []

    doc.iter(context.line, Math.min(doc.first + doc.size, cm.display.viewTo + 500), function (line) {
      if (context.line >= cm.display.viewFrom) { // Visible
        var oldStyles = line.styles
        var resetState = line.text.length > cm.options.maxHighlightLength ? copyState(doc.mode, context.state) : null
        var highlighted = highlightLine(cm, line, context, true)
        if (resetState) { context.state = resetState }
        line.styles = highlighted.styles
        var oldCls = line.styleClasses, newCls = highlighted.classes
        if (newCls) { line.styleClasses = newCls }
        else if (oldCls) { line.styleClasses = null }
        var ischange = !oldStyles || oldStyles.length != line.styles.length ||
          oldCls != newCls && (!oldCls || !newCls || oldCls.bgClass != newCls.bgClass || oldCls.textClass != newCls.textClass)
        for (var i = 0; !ischange && i < oldStyles.length; ++i) { ischange = oldStyles[i] != line.styles[i] }
        if (ischange) { changedLines.push(context.line) }
        line.stateAfter = context.save()
        context.nextLine()
      } else {
        if (line.text.length <= cm.options.maxHighlightLength)
          { processLine(cm, line.text, context) }
        line.stateAfter = context.line % 5 == 0 ? context.save() : null
        context.nextLine()
      }
      if (+new Date > end) {
        startWorker(cm, cm.options.workDelay)
        return true
      }
    })
    doc.highlightFrontier = context.line
    doc.modeFrontier = Math.max(doc.modeFrontier, context.line)
    if (changedLines.length) { runInOp(cm, function () {
      for (var i = 0; i < changedLines.length; i++)
        { regLineChange(cm, changedLines[i], "text") }
    }) }
  }

  // DISPLAY DRAWING

  var DisplayUpdate = function(cm, viewport, force) {
    var display = cm.display

    this.viewport = viewport
    // Store some values that we'll need later (but don't want to force a relayout for)
    this.visible = visibleLines(display, cm.doc, viewport)
    this.editorIsHidden = !display.wrapper.offsetWidth
    this.wrapperHeight = display.wrapper.clientHeight
    this.wrapperWidth = display.wrapper.clientWidth
    this.oldDisplayWidth = displayWidth(cm)
    this.force = force
    this.dims = getDimensions(cm)
    this.events = []
  };

  DisplayUpdate.prototype.signal = function (emitter, type) {
    if (hasHandler(emitter, type))
      { this.events.push(arguments) }
  };
  DisplayUpdate.prototype.finish = function () {
      var this$1 = this;

    for (var i = 0; i < this.events.length; i++)
      { signal.apply(null, this$1.events[i]) }
  };

  function maybeClipScrollbars(cm) {
    var display = cm.display
    if (!display.scrollbarsClipped && display.scroller.offsetWidth) {
      display.nativeBarWidth = display.scroller.offsetWidth - display.scroller.clientWidth
      display.heightForcer.style.height = scrollGap(cm) + "px"
      display.sizer.style.marginBottom = -display.nativeBarWidth + "px"
      display.sizer.style.borderRightWidth = scrollGap(cm) + "px"
      display.scrollbarsClipped = true
    }
  }

  function selectionSnapshot(cm) {
    if (cm.hasFocus()) { return null }
    var active = activeElt()
    if (!active || !contains(cm.display.lineDiv, active)) { return null }
    var result = {activeElt: active}
    if (window.getSelection) {
      var sel = window.getSelection()
      if (sel.anchorNode && sel.extend && contains(cm.display.lineDiv, sel.anchorNode)) {
        result.anchorNode = sel.anchorNode
        result.anchorOffset = sel.anchorOffset
        result.focusNode = sel.focusNode
        result.focusOffset = sel.focusOffset
      }
    }
    return result
  }

  function restoreSelection(snapshot) {
    if (!snapshot || !snapshot.activeElt || snapshot.activeElt == activeElt()) { return }
    snapshot.activeElt.focus()
    if (snapshot.anchorNode && contains(document.body, snapshot.anchorNode) && contains(document.body, snapshot.focusNode)) {
      var sel = window.getSelection(), range = document.createRange()
      range.setEnd(snapshot.anchorNode, snapshot.anchorOffset)
      range.collapse(false)
      sel.removeAllRanges()
      sel.addRange(range)
      sel.extend(snapshot.focusNode, snapshot.focusOffset)
    }
  }

  // Does the actual updating of the line display. Bails out
  // (returning false) when there is nothing to be done and forced is
  // false.
  function updateDisplayIfNeeded(cm, update) {
    var display = cm.display, doc = cm.doc

    if (update.editorIsHidden) {
      resetView(cm)
      return false
    }

    // Bail out if the visible area is already rendered and nothing changed.
    if (!update.force &&
        update.visible.from >= display.viewFrom && update.visible.to <= display.viewTo &&
        (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo) &&
        display.renderedView == display.view && countDirtyView(cm) == 0)
      { return false }

    if (maybeUpdateLineNumberWidth(cm)) {
      resetView(cm)
      update.dims = getDimensions(cm)
    }

    // Compute a suitable new viewport (from & to)
    var end = doc.first + doc.size
    var from = Math.max(update.visible.from - cm.options.viewportMargin, doc.first)
    var to = Math.min(end, update.visible.to + cm.options.viewportMargin)
    if (display.viewFrom < from && from - display.viewFrom < 20) { from = Math.max(doc.first, display.viewFrom) }
    if (display.viewTo > to && display.viewTo - to < 20) { to = Math.min(end, display.viewTo) }
    if (sawCollapsedSpans) {
      from = visualLineNo(cm.doc, from)
      to = visualLineEndNo(cm.doc, to)
    }

    var different = from != display.viewFrom || to != display.viewTo ||
      display.lastWrapHeight != update.wrapperHeight || display.lastWrapWidth != update.wrapperWidth
    adjustView(cm, from, to)

    display.viewOffset = heightAtLine(getLine(cm.doc, display.viewFrom))
    // Position the mover div to align with the current scroll position
    cm.display.mover.style.top = display.viewOffset + "px"

    var toUpdate = countDirtyView(cm)
    if (!different && toUpdate == 0 && !update.force && display.renderedView == display.view &&
        (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo))
      { return false }

    // For big changes, we hide the enclosing element during the
    // update, since that speeds up the operations on most browsers.
    var selSnapshot = selectionSnapshot(cm)
    if (toUpdate > 4) { display.lineDiv.style.display = "none" }
    patchDisplay(cm, display.updateLineNumbers, update.dims)
    if (toUpdate > 4) { display.lineDiv.style.display = "" }
    display.renderedView = display.view
    // There might have been a widget with a focused element that got
    // hidden or updated, if so re-focus it.
    restoreSelection(selSnapshot)

    // Prevent selection and cursors from interfering with the scroll
    // width and height.
    removeChildren(display.cursorDiv)
    removeChildren(display.selectionDiv)
    display.gutters.style.height = display.sizer.style.minHeight = 0

    if (different) {
      display.lastWrapHeight = update.wrapperHeight
      display.lastWrapWidth = update.wrapperWidth
      startWorker(cm, 400)
    }

    display.updateLineNumbers = null

    return true
  }

  function postUpdateDisplay(cm, update) {
    var viewport = update.viewport

    for (var first = true;; first = false) {
      if (!first || !cm.options.lineWrapping || update.oldDisplayWidth == displayWidth(cm)) {
        // Clip forced viewport to actual scrollable area.
        if (viewport && viewport.top != null)
          { viewport = {top: Math.min(cm.doc.height + paddingVert(cm.display) - displayHeight(cm), viewport.top)} }
        // Updated line heights might result in the drawn area not
        // actually covering the viewport. Keep looping until it does.
        update.visible = visibleLines(cm.display, cm.doc, viewport)
        if (update.visible.from >= cm.display.viewFrom && update.visible.to <= cm.display.viewTo)
          { break }
      }
      if (!updateDisplayIfNeeded(cm, update)) { break }
      updateHeightsInViewport(cm)
      var barMeasure = measureForScrollbars(cm)
      updateSelection(cm)
      updateScrollbars(cm, barMeasure)
      setDocumentHeight(cm, barMeasure)
      update.force = false
    }

    update.signal(cm, "update", cm)
    if (cm.display.viewFrom != cm.display.reportedViewFrom || cm.display.viewTo != cm.display.reportedViewTo) {
      update.signal(cm, "viewportChange", cm, cm.display.viewFrom, cm.display.viewTo)
      cm.display.reportedViewFrom = cm.display.viewFrom; cm.display.reportedViewTo = cm.display.viewTo
    }
  }

  function updateDisplaySimple(cm, viewport) {
    var update = new DisplayUpdate(cm, viewport)
    if (updateDisplayIfNeeded(cm, update)) {
      updateHeightsInViewport(cm)
      postUpdateDisplay(cm, update)
      var barMeasure = measureForScrollbars(cm)
      updateSelection(cm)
      updateScrollbars(cm, barMeasure)
      setDocumentHeight(cm, barMeasure)
      update.finish()
    }
  }

  // Sync the actual display DOM structure with display.view, removing
  // nodes for lines that are no longer in view, and creating the ones
  // that are not there yet, and updating the ones that are out of
  // date.
  function patchDisplay(cm, updateNumbersFrom, dims) {
    var display = cm.display, lineNumbers = cm.options.lineNumbers
    var container = display.lineDiv, cur = container.firstChild

    function rm(node) {
      var next = node.nextSibling
      // Works around a throw-scroll bug in OS X Webkit
      if (webkit && mac && cm.display.currentWheelTarget == node)
        { node.style.display = "none" }
      else
        { node.parentNode.removeChild(node) }
      return next
    }

    var view = display.view, lineN = display.viewFrom
    // Loop over the elements in the view, syncing cur (the DOM nodes
    // in display.lineDiv) with the view as we go.
    for (var i = 0; i < view.length; i++) {
      var lineView = view[i]
      if (lineView.hidden) {
      } else if (!lineView.node || lineView.node.parentNode != container) { // Not drawn yet
        var node = buildLineElement(cm, lineView, lineN, dims)
        container.insertBefore(node, cur)
      } else { // Already drawn
        while (cur != lineView.node) { cur = rm(cur) }
        var updateNumber = lineNumbers && updateNumbersFrom != null &&
          updateNumbersFrom <= lineN && lineView.lineNumber
        if (lineView.changes) {
          if (indexOf(lineView.changes, "gutter") > -1) { updateNumber = false }
          updateLineForChanges(cm, lineView, lineN, dims)
        }
        if (updateNumber) {
          removeChildren(lineView.lineNumber)
          lineView.lineNumber.appendChild(document.createTextNode(lineNumberFor(cm.options, lineN)))
        }
        cur = lineView.node.nextSibling
      }
      lineN += lineView.size
    }
    while (cur) { cur = rm(cur) }
  }

  function updateGutterSpace(cm) {
    var width = cm.display.gutters.offsetWidth
    cm.display.sizer.style.marginLeft = width + "px"
  }

  function setDocumentHeight(cm, measure) {
    cm.display.sizer.style.minHeight = measure.docHeight + "px"
    cm.display.heightForcer.style.top = measure.docHeight + "px"
    cm.display.gutters.style.height = (measure.docHeight + cm.display.barHeight + scrollGap(cm)) + "px"
  }

  // Rebuild the gutter elements, ensure the margin to the left of the
  // code matches their width.
  function updateGutters(cm) {
    var gutters = cm.display.gutters, specs = cm.options.gutters
    removeChildren(gutters)
    var i = 0
    for (; i < specs.length; ++i) {
      var gutterClass = specs[i]
      var gElt = gutters.appendChild(elt("div", null, "CodeMirror-gutter " + gutterClass))
      if (gutterClass == "CodeMirror-linenumbers") {
        cm.display.lineGutter = gElt
        gElt.style.width = (cm.display.lineNumWidth || 1) + "px"
      }
    }
    gutters.style.display = i ? "" : "none"
    updateGutterSpace(cm)
  }

  // Make sure the gutters options contains the element
  // "CodeMirror-linenumbers" when the lineNumbers option is true.
  function setGuttersForLineNumbers(options) {
    var found = indexOf(options.gutters, "CodeMirror-linenumbers")
    if (found == -1 && options.lineNumbers) {
      options.gutters = options.gutters.concat(["CodeMirror-linenumbers"])
    } else if (found > -1 && !options.lineNumbers) {
      options.gutters = options.gutters.slice(0)
      options.gutters.splice(found, 1)
    }
  }

  var wheelSamples = 0;
  var wheelPixelsPerUnit = null;
  // Fill in a browser-detected starting value on browsers where we
  // know one. These don't have to be accurate -- the result of them
  // being wrong would just be a slight flicker on the first wheel
  // scroll (if it is large enough).
  if (ie) { wheelPixelsPerUnit = -.53 }
  else if (gecko) { wheelPixelsPerUnit = 15 }
  else if (chrome) { wheelPixelsPerUnit = -.7 }
  else if (safari) { wheelPixelsPerUnit = -1/3 }

  function wheelEventDelta(e) {
    var dx = e.wheelDeltaX, dy = e.wheelDeltaY
    if (dx == null && e.detail && e.axis == e.HORIZONTAL_AXIS) { dx = e.detail }
    if (dy == null && e.detail && e.axis == e.VERTICAL_AXIS) { dy = e.detail }
    else if (dy == null) { dy = e.wheelDelta }
    return {x: dx, y: dy}
  }
  function wheelEventPixels(e) {
    var delta = wheelEventDelta(e)
    delta.x *= wheelPixelsPerUnit
    delta.y *= wheelPixelsPerUnit
    return delta
  }

  function onScrollWheel(cm, e) {
    var delta = wheelEventDelta(e), dx = delta.x, dy = delta.y

    var display = cm.display, scroll = display.scroller
    // Quit if there's nothing to scroll here
    var canScrollX = scroll.scrollWidth > scroll.clientWidth
    var canScrollY = scroll.scrollHeight > scroll.clientHeight
    if (!(dx && canScrollX || dy && canScrollY)) { return }

    // Webkit browsers on OS X abort momentum scrolls when the target
    // of the scroll event is removed from the scrollable element.
    // This hack (see related code in patchDisplay) makes sure the
    // element is kept around.
    if (dy && mac && webkit) {
      outer: for (var cur = e.target, view = display.view; cur != scroll; cur = cur.parentNode) {
        for (var i = 0; i < view.length; i++) {
          if (view[i].node == cur) {
            cm.display.currentWheelTarget = cur
            break outer
          }
        }
      }
    }

    // On some browsers, horizontal scrolling will cause redraws to
    // happen before the gutter has been realigned, causing it to
    // wriggle around in a most unseemly way. When we have an
    // estimated pixels/delta value, we just handle horizontal
    // scrolling entirely here. It'll be slightly off from native, but
    // better than glitching out.
    if (dx && !gecko && !presto && wheelPixelsPerUnit != null) {
      if (dy && canScrollY)
        { updateScrollTop(cm, Math.max(0, scroll.scrollTop + dy * wheelPixelsPerUnit)) }
      setScrollLeft(cm, Math.max(0, scroll.scrollLeft + dx * wheelPixelsPerUnit))
      // Only prevent default scrolling if vertical scrolling is
      // actually possible. Otherwise, it causes vertical scroll
      // jitter on OSX trackpads when deltaX is small and deltaY
      // is large (issue #3579)
      if (!dy || (dy && canScrollY))
        { e_preventDefault(e) }
      display.wheelStartX = null // Abort measurement, if in progress
      return
    }

    // 'Project' the visible viewport to cover the area that is being
    // scrolled into view (if we know enough to estimate it).
    if (dy && wheelPixelsPerUnit != null) {
      var pixels = dy * wheelPixelsPerUnit
      var top = cm.doc.scrollTop, bot = top + display.wrapper.clientHeight
      if (pixels < 0) { top = Math.max(0, top + pixels - 50) }
      else { bot = Math.min(cm.doc.height, bot + pixels + 50) }
      updateDisplaySimple(cm, {top: top, bottom: bot})
    }

    if (wheelSamples < 20) {
      if (display.wheelStartX == null) {
        display.wheelStartX = scroll.scrollLeft; display.wheelStartY = scroll.scrollTop
        display.wheelDX = dx; display.wheelDY = dy
        setTimeout(function () {
          if (display.wheelStartX == null) { return }
          var movedX = scroll.scrollLeft - display.wheelStartX
          var movedY = scroll.scrollTop - display.wheelStartY
          var sample = (movedY && display.wheelDY && movedY / display.wheelDY) ||
            (movedX && display.wheelDX && movedX / display.wheelDX)
          display.wheelStartX = display.wheelStartY = null
          if (!sample) { return }
          wheelPixelsPerUnit = (wheelPixelsPerUnit * wheelSamples + sample) / (wheelSamples + 1)
          ++wheelSamples
        }, 200)
      } else {
        display.wheelDX += dx; display.wheelDY += dy
      }
    }
  }

  // Selection objects are immutable. A new one is created every time
  // the selection changes. A selection is one or more non-overlapping
  // (and non-touching) ranges, sorted, and an integer that indicates
  // which one is the primary selection (the one that's scrolled into
  // view, that getCursor returns, etc).
  var Selection = function(ranges, primIndex) {
    this.ranges = ranges
    this.primIndex = primIndex
  };

  Selection.prototype.primary = function () { return this.ranges[this.primIndex] };

  Selection.prototype.equals = function (other) {
      var this$1 = this;

    if (other == this) { return true }
    if (other.primIndex != this.primIndex || other.ranges.length != this.ranges.length) { return false }
    for (var i = 0; i < this.ranges.length; i++) {
      var here = this$1.ranges[i], there = other.ranges[i]
      if (!equalCursorPos(here.anchor, there.anchor) || !equalCursorPos(here.head, there.head)) { return false }
    }
    return true
  };

  Selection.prototype.deepCopy = function () {
      var this$1 = this;

    var out = []
    for (var i = 0; i < this.ranges.length; i++)
      { out[i] = new Range(copyPos(this$1.ranges[i].anchor), copyPos(this$1.ranges[i].head)) }
    return new Selection(out, this.primIndex)
  };

  Selection.prototype.somethingSelected = function () {
      var this$1 = this;

    for (var i = 0; i < this.ranges.length; i++)
      { if (!this$1.ranges[i].empty()) { return true } }
    return false
  };

  Selection.prototype.contains = function (pos, end) {
      var this$1 = this;

    if (!end) { end = pos }
    for (var i = 0; i < this.ranges.length; i++) {
      var range = this$1.ranges[i]
      if (cmp(end, range.from()) >= 0 && cmp(pos, range.to()) <= 0)
        { return i }
    }
    return -1
  };

  var Range = function(anchor, head) {
    this.anchor = anchor; this.head = head
  };

  Range.prototype.from = function () { return minPos(this.anchor, this.head) };
  Range.prototype.to = function () { return maxPos(this.anchor, this.head) };
  Range.prototype.empty = function () { return this.head.line == this.anchor.line && this.head.ch == this.anchor.ch };

  // Take an unsorted, potentially overlapping set of ranges, and
  // build a selection out of it. 'Consumes' ranges array (modifying
  // it).
  function normalizeSelection(ranges, primIndex) {
    var prim = ranges[primIndex]
    ranges.sort(function (a, b) { return cmp(a.from(), b.from()); })
    primIndex = indexOf(ranges, prim)
    for (var i = 1; i < ranges.length; i++) {
      var cur = ranges[i], prev = ranges[i - 1]
      if (cmp(prev.to(), cur.from()) >= 0) {
        var from = minPos(prev.from(), cur.from()), to = maxPos(prev.to(), cur.to())
        var inv = prev.empty() ? cur.from() == cur.head : prev.from() == prev.head
        if (i <= primIndex) { --primIndex }
        ranges.splice(--i, 2, new Range(inv ? to : from, inv ? from : to))
      }
    }
    return new Selection(ranges, primIndex)
  }

  function simpleSelection(anchor, head) {
    return new Selection([new Range(anchor, head || anchor)], 0)
  }

  // Compute the position of the end of a change (its 'to' property
  // refers to the pre-change end).
  function changeEnd(change) {
    if (!change.text) { return change.to }
    return Pos(change.from.line + change.text.length - 1,
               lst(change.text).length + (change.text.length == 1 ? change.from.ch : 0))
  }

  // Adjust a position to refer to the post-change position of the
  // same text, or the end of the change if the change covers it.
  function adjustForChange(pos, change) {
    if (cmp(pos, change.from) < 0) { return pos }
    if (cmp(pos, change.to) <= 0) { return changeEnd(change) }

    var line = pos.line + change.text.length - (change.to.line - change.from.line) - 1, ch = pos.ch
    if (pos.line == change.to.line) { ch += changeEnd(change).ch - change.to.ch }
    return Pos(line, ch)
  }

  function computeSelAfterChange(doc, change) {
    var out = []
    for (var i = 0; i < doc.sel.ranges.length; i++) {
      var range = doc.sel.ranges[i]
      out.push(new Range(adjustForChange(range.anchor, change),
                         adjustForChange(range.head, change)))
    }
    return normalizeSelection(out, doc.sel.primIndex)
  }

  function offsetPos(pos, old, nw) {
    if (pos.line == old.line)
      { return Pos(nw.line, pos.ch - old.ch + nw.ch) }
    else
      { return Pos(nw.line + (pos.line - old.line), pos.ch) }
  }

  // Used by replaceSelections to allow moving the selection to the
  // start or around the replaced test. Hint may be "start" or "around".
  function computeReplacedSel(doc, changes, hint) {
    var out = []
    var oldPrev = Pos(doc.first, 0), newPrev = oldPrev
    for (var i = 0; i < changes.length; i++) {
      var change = changes[i]
      var from = offsetPos(change.from, oldPrev, newPrev)
      var to = offsetPos(changeEnd(change), oldPrev, newPrev)
      oldPrev = change.to
      newPrev = to
      if (hint == "around") {
        var range = doc.sel.ranges[i], inv = cmp(range.head, range.anchor) < 0
        out[i] = new Range(inv ? to : from, inv ? from : to)
      } else {
        out[i] = new Range(from, from)
      }
    }
    return new Selection(out, doc.sel.primIndex)
  }

  // Used to get the editor into a consistent state again when options change.

  function loadMode(cm) {
    cm.doc.mode = getMode(cm.options, cm.doc.modeOption)
    resetModeState(cm)
  }

  function resetModeState(cm) {
    cm.doc.iter(function (line) {
      if (line.stateAfter) { line.stateAfter = null }
      if (line.styles) { line.styles = null }
    })
    cm.doc.modeFrontier = cm.doc.highlightFrontier = cm.doc.first
    startWorker(cm, 100)
    cm.state.modeGen++
    if (cm.curOp) { regChange(cm) }
  }

  // DOCUMENT DATA STRUCTURE

  // By default, updates that start and end at the beginning of a line
  // are treated specially, in order to make the association of line
  // widgets and marker elements with the text behave more intuitive.
  function isWholeLineUpdate(doc, change) {
    return change.from.ch == 0 && change.to.ch == 0 && lst(change.text) == "" &&
      (!doc.cm || doc.cm.options.wholeLineUpdateBefore)
  }

  // Perform a change on the document data structure.
  function updateDoc(doc, change, markedSpans, estimateHeight) {
    function spansFor(n) {return markedSpans ? markedSpans[n] : null}
    function update(line, text, spans) {
      updateLine(line, text, spans, estimateHeight)
      signalLater(line, "change", line, change)
    }
    function linesFor(start, end) {
      var result = []
      for (var i = start; i < end; ++i)
        { result.push(new Line(text[i], spansFor(i), estimateHeight)) }
      return result
    }

    var from = change.from, to = change.to, text = change.text
    var firstLine = getLine(doc, from.line), lastLine = getLine(doc, to.line)
    var lastText = lst(text), lastSpans = spansFor(text.length - 1), nlines = to.line - from.line

    // Adjust the line structure
    if (change.full) {
      doc.insert(0, linesFor(0, text.length))
      doc.remove(text.length, doc.size - text.length)
    } else if (isWholeLineUpdate(doc, change)) {
      // This is a whole-line replace. Treated specially to make
      // sure line objects move the way they are supposed to.
      var added = linesFor(0, text.length - 1)
      update(lastLine, lastLine.text, lastSpans)
      if (nlines) { doc.remove(from.line, nlines) }
      if (added.length) { doc.insert(from.line, added) }
    } else if (firstLine == lastLine) {
      if (text.length == 1) {
        update(firstLine, firstLine.text.slice(0, from.ch) + lastText + firstLine.text.slice(to.ch), lastSpans)
      } else {
        var added$1 = linesFor(1, text.length - 1)
        added$1.push(new Line(lastText + firstLine.text.slice(to.ch), lastSpans, estimateHeight))
        update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0))
        doc.insert(from.line + 1, added$1)
      }
    } else if (text.length == 1) {
      update(firstLine, firstLine.text.slice(0, from.ch) + text[0] + lastLine.text.slice(to.ch), spansFor(0))
      doc.remove(from.line + 1, nlines)
    } else {
      update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0))
      update(lastLine, lastText + lastLine.text.slice(to.ch), lastSpans)
      var added$2 = linesFor(1, text.length - 1)
      if (nlines > 1) { doc.remove(from.line + 1, nlines - 1) }
      doc.insert(from.line + 1, added$2)
    }

    signalLater(doc, "change", doc, change)
  }

  // Call f for all linked documents.
  function linkedDocs(doc, f, sharedHistOnly) {
    function propagate(doc, skip, sharedHist) {
      if (doc.linked) { for (var i = 0; i < doc.linked.length; ++i) {
        var rel = doc.linked[i]
        if (rel.doc == skip) { continue }
        var shared = sharedHist && rel.sharedHist
        if (sharedHistOnly && !shared) { continue }
        f(rel.doc, shared)
        propagate(rel.doc, doc, shared)
      } }
    }
    propagate(doc, null, true)
  }

  // Attach a document to an editor.
  function attachDoc(cm, doc) {
    if (doc.cm) { throw new Error("This document is already in use.") }
    cm.doc = doc
    doc.cm = cm
    estimateLineHeights(cm)
    loadMode(cm)
    setDirectionClass(cm)
    if (!cm.options.lineWrapping) { findMaxLine(cm) }
    cm.options.mode = doc.modeOption
    regChange(cm)
  }

  function setDirectionClass(cm) {
    ;(cm.doc.direction == "rtl" ? addClass : rmClass)(cm.display.lineDiv, "CodeMirror-rtl")
  }

  function directionChanged(cm) {
    runInOp(cm, function () {
      setDirectionClass(cm)
      regChange(cm)
    })
  }

  function History(startGen) {
    // Arrays of change events and selections. Doing something adds an
    // event to done and clears undo. Undoing moves events from done
    // to undone, redoing moves them in the other direction.
    this.done = []; this.undone = []
    this.undoDepth = Infinity
    // Used to track when changes can be merged into a single undo
    // event
    this.lastModTime = this.lastSelTime = 0
    this.lastOp = this.lastSelOp = null
    this.lastOrigin = this.lastSelOrigin = null
    // Used by the isClean() method
    this.generation = this.maxGeneration = startGen || 1
  }

  // Create a history change event from an updateDoc-style change
  // object.
  function historyChangeFromChange(doc, change) {
    var histChange = {from: copyPos(change.from), to: changeEnd(change), text: getBetween(doc, change.from, change.to)}
    attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1)
    linkedDocs(doc, function (doc) { return attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1); }, true)
    return histChange
  }

  // Pop all selection events off the end of a history array. Stop at
  // a change event.
  function clearSelectionEvents(array) {
    while (array.length) {
      var last = lst(array)
      if (last.ranges) { array.pop() }
      else { break }
    }
  }

  // Find the top change event in the history. Pop off selection
  // events that are in the way.
  function lastChangeEvent(hist, force) {
    if (force) {
      clearSelectionEvents(hist.done)
      return lst(hist.done)
    } else if (hist.done.length && !lst(hist.done).ranges) {
      return lst(hist.done)
    } else if (hist.done.length > 1 && !hist.done[hist.done.length - 2].ranges) {
      hist.done.pop()
      return lst(hist.done)
    }
  }

  // Register a change in the history. Merges changes that are within
  // a single operation, or are close together with an origin that
  // allows merging (starting with "+") into a single event.
  function addChangeToHistory(doc, change, selAfter, opId) {
    var hist = doc.history
    hist.undone.length = 0
    var time = +new Date, cur
    var last

    if ((hist.lastOp == opId ||
         hist.lastOrigin == change.origin && change.origin &&
         ((change.origin.charAt(0) == "+" && doc.cm && hist.lastModTime > time - doc.cm.options.historyEventDelay) ||
          change.origin.charAt(0) == "*")) &&
        (cur = lastChangeEvent(hist, hist.lastOp == opId))) {
      // Merge this change into the last event
      last = lst(cur.changes)
      if (cmp(change.from, change.to) == 0 && cmp(change.from, last.to) == 0) {
        // Optimized case for simple insertion -- don't want to add
        // new changesets for every character typed
        last.to = changeEnd(change)
      } else {
        // Add new sub-event
        cur.changes.push(historyChangeFromChange(doc, change))
      }
    } else {
      // Can not be merged, start a new event.
      var before = lst(hist.done)
      if (!before || !before.ranges)
        { pushSelectionToHistory(doc.sel, hist.done) }
      cur = {changes: [historyChangeFromChange(doc, change)],
             generation: hist.generation}
      hist.done.push(cur)
      while (hist.done.length > hist.undoDepth) {
        hist.done.shift()
        if (!hist.done[0].ranges) { hist.done.shift() }
      }
    }
    hist.done.push(selAfter)
    hist.generation = ++hist.maxGeneration
    hist.lastModTime = hist.lastSelTime = time
    hist.lastOp = hist.lastSelOp = opId
    hist.lastOrigin = hist.lastSelOrigin = change.origin

    if (!last) { signal(doc, "historyAdded") }
  }

  function selectionEventCanBeMerged(doc, origin, prev, sel) {
    var ch = origin.charAt(0)
    return ch == "*" ||
      ch == "+" &&
      prev.ranges.length == sel.ranges.length &&
      prev.somethingSelected() == sel.somethingSelected() &&
      new Date - doc.history.lastSelTime <= (doc.cm ? doc.cm.options.historyEventDelay : 500)
  }

  // Called whenever the selection changes, sets the new selection as
  // the pending selection in the history, and pushes the old pending
  // selection into the 'done' array when it was significantly
  // different (in number of selected ranges, emptiness, or time).
  function addSelectionToHistory(doc, sel, opId, options) {
    var hist = doc.history, origin = options && options.origin

    // A new event is started when the previous origin does not match
    // the current, or the origins don't allow matching. Origins
    // starting with * are always merged, those starting with + are
    // merged when similar and close together in time.
    if (opId == hist.lastSelOp ||
        (origin && hist.lastSelOrigin == origin &&
         (hist.lastModTime == hist.lastSelTime && hist.lastOrigin == origin ||
          selectionEventCanBeMerged(doc, origin, lst(hist.done), sel))))
      { hist.done[hist.done.length - 1] = sel }
    else
      { pushSelectionToHistory(sel, hist.done) }

    hist.lastSelTime = +new Date
    hist.lastSelOrigin = origin
    hist.lastSelOp = opId
    if (options && options.clearRedo !== false)
      { clearSelectionEvents(hist.undone) }
  }

  function pushSelectionToHistory(sel, dest) {
    var top = lst(dest)
    if (!(top && top.ranges && top.equals(sel)))
      { dest.push(sel) }
  }

  // Used to store marked span information in the history.
  function attachLocalSpans(doc, change, from, to) {
    var existing = change["spans_" + doc.id], n = 0
    doc.iter(Math.max(doc.first, from), Math.min(doc.first + doc.size, to), function (line) {
      if (line.markedSpans)
        { (existing || (existing = change["spans_" + doc.id] = {}))[n] = line.markedSpans }
      ++n
    })
  }

  // When un/re-doing restores text containing marked spans, those
  // that have been explicitly cleared should not be restored.
  function removeClearedSpans(spans) {
    if (!spans) { return null }
    var out
    for (var i = 0; i < spans.length; ++i) {
      if (spans[i].marker.explicitlyCleared) { if (!out) { out = spans.slice(0, i) } }
      else if (out) { out.push(spans[i]) }
    }
    return !out ? spans : out.length ? out : null
  }

  // Retrieve and filter the old marked spans stored in a change event.
  function getOldSpans(doc, change) {
    var found = change["spans_" + doc.id]
    if (!found) { return null }
    var nw = []
    for (var i = 0; i < change.text.length; ++i)
      { nw.push(removeClearedSpans(found[i])) }
    return nw
  }

  // Used for un/re-doing changes from the history. Combines the
  // result of computing the existing spans with the set of spans that
  // existed in the history (so that deleting around a span and then
  // undoing brings back the span).
  function mergeOldSpans(doc, change) {
    var old = getOldSpans(doc, change)
    var stretched = stretchSpansOverChange(doc, change)
    if (!old) { return stretched }
    if (!stretched) { return old }

    for (var i = 0; i < old.length; ++i) {
      var oldCur = old[i], stretchCur = stretched[i]
      if (oldCur && stretchCur) {
        spans: for (var j = 0; j < stretchCur.length; ++j) {
          var span = stretchCur[j]
          for (var k = 0; k < oldCur.length; ++k)
            { if (oldCur[k].marker == span.marker) { continue spans } }
          oldCur.push(span)
        }
      } else if (stretchCur) {
        old[i] = stretchCur
      }
    }
    return old
  }

  // Used both to provide a JSON-safe object in .getHistory, and, when
  // detaching a document, to split the history in two
  function copyHistoryArray(events, newGroup, instantiateSel) {
    var copy = []
    for (var i = 0; i < events.length; ++i) {
      var event = events[i]
      if (event.ranges) {
        copy.push(instantiateSel ? Selection.prototype.deepCopy.call(event) : event)
        continue
      }
      var changes = event.changes, newChanges = []
      copy.push({changes: newChanges})
      for (var j = 0; j < changes.length; ++j) {
        var change = changes[j], m = (void 0)
        newChanges.push({from: change.from, to: change.to, text: change.text})
        if (newGroup) { for (var prop in change) { if (m = prop.match(/^spans_(\d+)$/)) {
          if (indexOf(newGroup, Number(m[1])) > -1) {
            lst(newChanges)[prop] = change[prop]
            delete change[prop]
          }
        } } }
      }
    }
    return copy
  }

  // The 'scroll' parameter given to many of these indicated whether
  // the new cursor position should be scrolled into view after
  // modifying the selection.

  // If shift is held or the extend flag is set, extends a range to
  // include a given position (and optionally a second position).
  // Otherwise, simply returns the range between the given positions.
  // Used for cursor motion and such.
  function extendRange(range, head, other, extend) {
    if (extend) {
      var anchor = range.anchor
      if (other) {
        var posBefore = cmp(head, anchor) < 0
        if (posBefore != (cmp(other, anchor) < 0)) {
          anchor = head
          head = other
        } else if (posBefore != (cmp(head, other) < 0)) {
          head = other
        }
      }
      return new Range(anchor, head)
    } else {
      return new Range(other || head, head)
    }
  }

  // Extend the primary selection range, discard the rest.
  function extendSelection(doc, head, other, options, extend) {
    if (extend == null) { extend = doc.cm && (doc.cm.display.shift || doc.extend) }
    setSelection(doc, new Selection([extendRange(doc.sel.primary(), head, other, extend)], 0), options)
  }

  // Extend all selections (pos is an array of selections with length
  // equal the number of selections)
  function extendSelections(doc, heads, options) {
    var out = []
    var extend = doc.cm && (doc.cm.display.shift || doc.extend)
    for (var i = 0; i < doc.sel.ranges.length; i++)
      { out[i] = extendRange(doc.sel.ranges[i], heads[i], null, extend) }
    var newSel = normalizeSelection(out, doc.sel.primIndex)
    setSelection(doc, newSel, options)
  }

  // Updates a single range in the selection.
  function replaceOneSelection(doc, i, range, options) {
    var ranges = doc.sel.ranges.slice(0)
    ranges[i] = range
    setSelection(doc, normalizeSelection(ranges, doc.sel.primIndex), options)
  }

  // Reset the selection to a single range.
  function setSimpleSelection(doc, anchor, head, options) {
    setSelection(doc, simpleSelection(anchor, head), options)
  }

  // Give beforeSelectionChange handlers a change to influence a
  // selection update.
  function filterSelectionChange(doc, sel, options) {
    var obj = {
      ranges: sel.ranges,
      update: function(ranges) {
        var this$1 = this;

        this.ranges = []
        for (var i = 0; i < ranges.length; i++)
          { this$1.ranges[i] = new Range(clipPos(doc, ranges[i].anchor),
                                     clipPos(doc, ranges[i].head)) }
      },
      origin: options && options.origin
    }
    signal(doc, "beforeSelectionChange", doc, obj)
    if (doc.cm) { signal(doc.cm, "beforeSelectionChange", doc.cm, obj) }
    if (obj.ranges != sel.ranges) { return normalizeSelection(obj.ranges, obj.ranges.length - 1) }
    else { return sel }
  }

  function setSelectionReplaceHistory(doc, sel, options) {
    var done = doc.history.done, last = lst(done)
    if (last && last.ranges) {
      done[done.length - 1] = sel
      setSelectionNoUndo(doc, sel, options)
    } else {
      setSelection(doc, sel, options)
    }
  }

  // Set a new selection.
  function setSelection(doc, sel, options) {
    setSelectionNoUndo(doc, sel, options)
    addSelectionToHistory(doc, doc.sel, doc.cm ? doc.cm.curOp.id : NaN, options)
  }

  function setSelectionNoUndo(doc, sel, options) {
    if (hasHandler(doc, "beforeSelectionChange") || doc.cm && hasHandler(doc.cm, "beforeSelectionChange"))
      { sel = filterSelectionChange(doc, sel, options) }

    var bias = options && options.bias ||
      (cmp(sel.primary().head, doc.sel.primary().head) < 0 ? -1 : 1)
    setSelectionInner(doc, skipAtomicInSelection(doc, sel, bias, true))

    if (!(options && options.scroll === false) && doc.cm)
      { ensureCursorVisible(doc.cm) }
  }

  function setSelectionInner(doc, sel) {
    if (sel.equals(doc.sel)) { return }

    doc.sel = sel

    if (doc.cm) {
      doc.cm.curOp.updateInput = doc.cm.curOp.selectionChanged = true
      signalCursorActivity(doc.cm)
    }
    signalLater(doc, "cursorActivity", doc)
  }

  // Verify that the selection does not partially select any atomic
  // marked ranges.
  function reCheckSelection(doc) {
    setSelectionInner(doc, skipAtomicInSelection(doc, doc.sel, null, false))
  }

  // Return a selection that does not partially select any atomic
  // ranges.
  function skipAtomicInSelection(doc, sel, bias, mayClear) {
    var out
    for (var i = 0; i < sel.ranges.length; i++) {
      var range = sel.ranges[i]
      var old = sel.ranges.length == doc.sel.ranges.length && doc.sel.ranges[i]
      var newAnchor = skipAtomic(doc, range.anchor, old && old.anchor, bias, mayClear)
      var newHead = skipAtomic(doc, range.head, old && old.head, bias, mayClear)
      if (out || newAnchor != range.anchor || newHead != range.head) {
        if (!out) { out = sel.ranges.slice(0, i) }
        out[i] = new Range(newAnchor, newHead)
      }
    }
    return out ? normalizeSelection(out, sel.primIndex) : sel
  }

  function skipAtomicInner(doc, pos, oldPos, dir, mayClear) {
    var line = getLine(doc, pos.line)
    if (line.markedSpans) { for (var i = 0; i < line.markedSpans.length; ++i) {
      var sp = line.markedSpans[i], m = sp.marker
      if ((sp.from == null || (m.inclusiveLeft ? sp.from <= pos.ch : sp.from < pos.ch)) &&
          (sp.to == null || (m.inclusiveRight ? sp.to >= pos.ch : sp.to > pos.ch))) {
        if (mayClear) {
          signal(m, "beforeCursorEnter")
          if (m.explicitlyCleared) {
            if (!line.markedSpans) { break }
            else {--i; continue}
          }
        }
        if (!m.atomic) { continue }

        if (oldPos) {
          var near = m.find(dir < 0 ? 1 : -1), diff = (void 0)
          if (dir < 0 ? m.inclusiveRight : m.inclusiveLeft)
            { near = movePos(doc, near, -dir, near && near.line == pos.line ? line : null) }
          if (near && near.line == pos.line && (diff = cmp(near, oldPos)) && (dir < 0 ? diff < 0 : diff > 0))
            { return skipAtomicInner(doc, near, pos, dir, mayClear) }
        }

        var far = m.find(dir < 0 ? -1 : 1)
        if (dir < 0 ? m.inclusiveLeft : m.inclusiveRight)
          { far = movePos(doc, far, dir, far.line == pos.line ? line : null) }
        return far ? skipAtomicInner(doc, far, pos, dir, mayClear) : null
      }
    } }
    return pos
  }

  // Ensure a given position is not inside an atomic range.
  function skipAtomic(doc, pos, oldPos, bias, mayClear) {
    var dir = bias || 1
    var found = skipAtomicInner(doc, pos, oldPos, dir, mayClear) ||
        (!mayClear && skipAtomicInner(doc, pos, oldPos, dir, true)) ||
        skipAtomicInner(doc, pos, oldPos, -dir, mayClear) ||
        (!mayClear && skipAtomicInner(doc, pos, oldPos, -dir, true))
    if (!found) {
      doc.cantEdit = true
      return Pos(doc.first, 0)
    }
    return found
  }

  function movePos(doc, pos, dir, line) {
    if (dir < 0 && pos.ch == 0) {
      if (pos.line > doc.first) { return clipPos(doc, Pos(pos.line - 1)) }
      else { return null }
    } else if (dir > 0 && pos.ch == (line || getLine(doc, pos.line)).text.length) {
      if (pos.line < doc.first + doc.size - 1) { return Pos(pos.line + 1, 0) }
      else { return null }
    } else {
      return new Pos(pos.line, pos.ch + dir)
    }
  }

  function selectAll(cm) {
    cm.setSelection(Pos(cm.firstLine(), 0), Pos(cm.lastLine()), sel_dontScroll)
  }

  // UPDATING

  // Allow "beforeChange" event handlers to influence a change
  function filterChange(doc, change, update) {
    var obj = {
      canceled: false,
      from: change.from,
      to: change.to,
      text: change.text,
      origin: change.origin,
      cancel: function () { return obj.canceled = true; }
    }
    if (update) { obj.update = function (from, to, text, origin) {
      if (from) { obj.from = clipPos(doc, from) }
      if (to) { obj.to = clipPos(doc, to) }
      if (text) { obj.text = text }
      if (origin !== undefined) { obj.origin = origin }
    } }
    signal(doc, "beforeChange", doc, obj)
    if (doc.cm) { signal(doc.cm, "beforeChange", doc.cm, obj) }

    if (obj.canceled) { return null }
    return {from: obj.from, to: obj.to, text: obj.text, origin: obj.origin}
  }

  // Apply a change to a document, and add it to the document's
  // history, and propagating it to all linked documents.
  function makeChange(doc, change, ignoreReadOnly) {
    if (doc.cm) {
      if (!doc.cm.curOp) { return operation(doc.cm, makeChange)(doc, change, ignoreReadOnly) }
      if (doc.cm.state.suppressEdits) { return }
    }

    if (hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange")) {
      change = filterChange(doc, change, true)
      if (!change) { return }
    }

    // Possibly split or suppress the update based on the presence
    // of read-only spans in its range.
    var split = sawReadOnlySpans && !ignoreReadOnly && removeReadOnlyRanges(doc, change.from, change.to)
    if (split) {
      for (var i = split.length - 1; i >= 0; --i)
        { makeChangeInner(doc, {from: split[i].from, to: split[i].to, text: i ? [""] : change.text, origin: change.origin}) }
    } else {
      makeChangeInner(doc, change)
    }
  }

  function makeChangeInner(doc, change) {
    if (change.text.length == 1 && change.text[0] == "" && cmp(change.from, change.to) == 0) { return }
    var selAfter = computeSelAfterChange(doc, change)
    addChangeToHistory(doc, change, selAfter, doc.cm ? doc.cm.curOp.id : NaN)

    makeChangeSingleDoc(doc, change, selAfter, stretchSpansOverChange(doc, change))
    var rebased = []

    linkedDocs(doc, function (doc, sharedHist) {
      if (!sharedHist && indexOf(rebased, doc.history) == -1) {
        rebaseHist(doc.history, change)
        rebased.push(doc.history)
      }
      makeChangeSingleDoc(doc, change, null, stretchSpansOverChange(doc, change))
    })
  }

  // Revert a change stored in a document's history.
  function makeChangeFromHistory(doc, type, allowSelectionOnly) {
    if (doc.cm && doc.cm.state.suppressEdits && !allowSelectionOnly) { return }

    var hist = doc.history, event, selAfter = doc.sel
    var source = type == "undo" ? hist.done : hist.undone, dest = type == "undo" ? hist.undone : hist.done

    // Verify that there is a useable event (so that ctrl-z won't
    // needlessly clear selection events)
    var i = 0
    for (; i < source.length; i++) {
      event = source[i]
      if (allowSelectionOnly ? event.ranges && !event.equals(doc.sel) : !event.ranges)
        { break }
    }
    if (i == source.length) { return }
    hist.lastOrigin = hist.lastSelOrigin = null

    for (;;) {
      event = source.pop()
      if (event.ranges) {
        pushSelectionToHistory(event, dest)
        if (allowSelectionOnly && !event.equals(doc.sel)) {
          setSelection(doc, event, {clearRedo: false})
          return
        }
        selAfter = event
      }
      else { break }
    }

    // Build up a reverse change object to add to the opposite history
    // stack (redo when undoing, and vice versa).
    var antiChanges = []
    pushSelectionToHistory(selAfter, dest)
    dest.push({changes: antiChanges, generation: hist.generation})
    hist.generation = event.generation || ++hist.maxGeneration

    var filter = hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange")

    var loop = function ( i ) {
      var change = event.changes[i]
      change.origin = type
      if (filter && !filterChange(doc, change, false)) {
        source.length = 0
        return {}
      }

      antiChanges.push(historyChangeFromChange(doc, change))

      var after = i ? computeSelAfterChange(doc, change) : lst(source)
      makeChangeSingleDoc(doc, change, after, mergeOldSpans(doc, change))
      if (!i && doc.cm) { doc.cm.scrollIntoView({from: change.from, to: changeEnd(change)}) }
      var rebased = []

      // Propagate to the linked documents
      linkedDocs(doc, function (doc, sharedHist) {
        if (!sharedHist && indexOf(rebased, doc.history) == -1) {
          rebaseHist(doc.history, change)
          rebased.push(doc.history)
        }
        makeChangeSingleDoc(doc, change, null, mergeOldSpans(doc, change))
      })
    };

    for (var i$1 = event.changes.length - 1; i$1 >= 0; --i$1) {
      var returned = loop( i$1 );

      if ( returned ) return returned.v;
    }
  }

  // Sub-views need their line numbers shifted when text is added
  // above or below them in the parent document.
  function shiftDoc(doc, distance) {
    if (distance == 0) { return }
    doc.first += distance
    doc.sel = new Selection(map(doc.sel.ranges, function (range) { return new Range(
      Pos(range.anchor.line + distance, range.anchor.ch),
      Pos(range.head.line + distance, range.head.ch)
    ); }), doc.sel.primIndex)
    if (doc.cm) {
      regChange(doc.cm, doc.first, doc.first - distance, distance)
      for (var d = doc.cm.display, l = d.viewFrom; l < d.viewTo; l++)
        { regLineChange(doc.cm, l, "gutter") }
    }
  }

  // More lower-level change function, handling only a single document
  // (not linked ones).
  function makeChangeSingleDoc(doc, change, selAfter, spans) {
    if (doc.cm && !doc.cm.curOp)
      { return operation(doc.cm, makeChangeSingleDoc)(doc, change, selAfter, spans) }

    if (change.to.line < doc.first) {
      shiftDoc(doc, change.text.length - 1 - (change.to.line - change.from.line))
      return
    }
    if (change.from.line > doc.lastLine()) { return }

    // Clip the change to the size of this doc
    if (change.from.line < doc.first) {
      var shift = change.text.length - 1 - (doc.first - change.from.line)
      shiftDoc(doc, shift)
      change = {from: Pos(doc.first, 0), to: Pos(change.to.line + shift, change.to.ch),
                text: [lst(change.text)], origin: change.origin}
    }
    var last = doc.lastLine()
    if (change.to.line > last) {
      change = {from: change.from, to: Pos(last, getLine(doc, last).text.length),
                text: [change.text[0]], origin: change.origin}
    }

    change.removed = getBetween(doc, change.from, change.to)

    if (!selAfter) { selAfter = computeSelAfterChange(doc, change) }
    if (doc.cm) { makeChangeSingleDocInEditor(doc.cm, change, spans) }
    else { updateDoc(doc, change, spans) }
    setSelectionNoUndo(doc, selAfter, sel_dontScroll)
  }

  // Handle the interaction of a change to a document with the editor
  // that this document is part of.
  function makeChangeSingleDocInEditor(cm, change, spans) {
    var doc = cm.doc, display = cm.display, from = change.from, to = change.to

    var recomputeMaxLength = false, checkWidthStart = from.line
    if (!cm.options.lineWrapping) {
      checkWidthStart = lineNo(visualLine(getLine(doc, from.line)))
      doc.iter(checkWidthStart, to.line + 1, function (line) {
        if (line == display.maxLine) {
          recomputeMaxLength = true
          return true
        }
      })
    }

    if (doc.sel.contains(change.from, change.to) > -1)
      { signalCursorActivity(cm) }

    updateDoc(doc, change, spans, estimateHeight(cm))

    if (!cm.options.lineWrapping) {
      doc.iter(checkWidthStart, from.line + change.text.length, function (line) {
        var len = lineLength(line)
        if (len > display.maxLineLength) {
          display.maxLine = line
          display.maxLineLength = len
          display.maxLineChanged = true
          recomputeMaxLength = false
        }
      })
      if (recomputeMaxLength) { cm.curOp.updateMaxLine = true }
    }

    retreatFrontier(doc, from.line)
    startWorker(cm, 400)

    var lendiff = change.text.length - (to.line - from.line) - 1
    // Remember that these lines changed, for updating the display
    if (change.full)
      { regChange(cm) }
    else if (from.line == to.line && change.text.length == 1 && !isWholeLineUpdate(cm.doc, change))
      { regLineChange(cm, from.line, "text") }
    else
      { regChange(cm, from.line, to.line + 1, lendiff) }

    var changesHandler = hasHandler(cm, "changes"), changeHandler = hasHandler(cm, "change")
    if (changeHandler || changesHandler) {
      var obj = {
        from: from, to: to,
        text: change.text,
        removed: change.removed,
        origin: change.origin
      }
      if (changeHandler) { signalLater(cm, "change", cm, obj) }
      if (changesHandler) { (cm.curOp.changeObjs || (cm.curOp.changeObjs = [])).push(obj) }
    }
    cm.display.selForContextMenu = null
  }

  function replaceRange(doc, code, from, to, origin) {
    if (!to) { to = from }
    if (cmp(to, from) < 0) { var assign;
      (assign = [to, from], from = assign[0], to = assign[1], assign) }
    if (typeof code == "string") { code = doc.splitLines(code) }
    makeChange(doc, {from: from, to: to, text: code, origin: origin})
  }

  // Rebasing/resetting history to deal with externally-sourced changes

  function rebaseHistSelSingle(pos, from, to, diff) {
    if (to < pos.line) {
      pos.line += diff
    } else if (from < pos.line) {
      pos.line = from
      pos.ch = 0
    }
  }

  // Tries to rebase an array of history events given a change in the
  // document. If the change touches the same lines as the event, the
  // event, and everything 'behind' it, is discarded. If the change is
  // before the event, the event's positions are updated. Uses a
  // copy-on-write scheme for the positions, to avoid having to
  // reallocate them all on every rebase, but also avoid problems with
  // shared position objects being unsafely updated.
  function rebaseHistArray(array, from, to, diff) {
    for (var i = 0; i < array.length; ++i) {
      var sub = array[i], ok = true
      if (sub.ranges) {
        if (!sub.copied) { sub = array[i] = sub.deepCopy(); sub.copied = true }
        for (var j = 0; j < sub.ranges.length; j++) {
          rebaseHistSelSingle(sub.ranges[j].anchor, from, to, diff)
          rebaseHistSelSingle(sub.ranges[j].head, from, to, diff)
        }
        continue
      }
      for (var j$1 = 0; j$1 < sub.changes.length; ++j$1) {
        var cur = sub.changes[j$1]
        if (to < cur.from.line) {
          cur.from = Pos(cur.from.line + diff, cur.from.ch)
          cur.to = Pos(cur.to.line + diff, cur.to.ch)
        } else if (from <= cur.to.line) {
          ok = false
          break
        }
      }
      if (!ok) {
        array.splice(0, i + 1)
        i = 0
      }
    }
  }

  function rebaseHist(hist, change) {
    var from = change.from.line, to = change.to.line, diff = change.text.length - (to - from) - 1
    rebaseHistArray(hist.done, from, to, diff)
    rebaseHistArray(hist.undone, from, to, diff)
  }

  // Utility for applying a change to a line by handle or number,
  // returning the number and optionally registering the line as
  // changed.
  function changeLine(doc, handle, changeType, op) {
    var no = handle, line = handle
    if (typeof handle == "number") { line = getLine(doc, clipLine(doc, handle)) }
    else { no = lineNo(handle) }
    if (no == null) { return null }
    if (op(line, no) && doc.cm) { regLineChange(doc.cm, no, changeType) }
    return line
  }

  // The document is represented as a BTree consisting of leaves, with
  // chunk of lines in them, and branches, with up to ten leaves or
  // other branch nodes below them. The top node is always a branch
  // node, and is the document object itself (meaning it has
  // additional methods and properties).
  //
  // All nodes have parent links. The tree is used both to go from
  // line numbers to line objects, and to go from objects to numbers.
  // It also indexes by height, and is used to convert between height
  // and line object, and to find the total height of the document.
  //
  // See also http://marijnhaverbeke.nl/blog/codemirror-line-tree.html

  function LeafChunk(lines) {
    var this$1 = this;

    this.lines = lines
    this.parent = null
    var height = 0
    for (var i = 0; i < lines.length; ++i) {
      lines[i].parent = this$1
      height += lines[i].height
    }
    this.height = height
  }

  LeafChunk.prototype = {
    chunkSize: function chunkSize() { return this.lines.length },

    // Remove the n lines at offset 'at'.
    removeInner: function removeInner(at, n) {
      var this$1 = this;

      for (var i = at, e = at + n; i < e; ++i) {
        var line = this$1.lines[i]
        this$1.height -= line.height
        cleanUpLine(line)
        signalLater(line, "delete")
      }
      this.lines.splice(at, n)
    },

    // Helper used to collapse a small branch into a single leaf.
    collapse: function collapse(lines) {
      lines.push.apply(lines, this.lines)
    },

    // Insert the given array of lines at offset 'at', count them as
    // having the given height.
    insertInner: function insertInner(at, lines, height) {
      var this$1 = this;

      this.height += height
      this.lines = this.lines.slice(0, at).concat(lines).concat(this.lines.slice(at))
      for (var i = 0; i < lines.length; ++i) { lines[i].parent = this$1 }
    },

    // Used to iterate over a part of the tree.
    iterN: function iterN(at, n, op) {
      var this$1 = this;

      for (var e = at + n; at < e; ++at)
        { if (op(this$1.lines[at])) { return true } }
    }
  }

  function BranchChunk(children) {
    var this$1 = this;

    this.children = children
    var size = 0, height = 0
    for (var i = 0; i < children.length; ++i) {
      var ch = children[i]
      size += ch.chunkSize(); height += ch.height
      ch.parent = this$1
    }
    this.size = size
    this.height = height
    this.parent = null
  }

  BranchChunk.prototype = {
    chunkSize: function chunkSize() { return this.size },

    removeInner: function removeInner(at, n) {
      var this$1 = this;

      this.size -= n
      for (var i = 0; i < this.children.length; ++i) {
        var child = this$1.children[i], sz = child.chunkSize()
        if (at < sz) {
          var rm = Math.min(n, sz - at), oldHeight = child.height
          child.removeInner(at, rm)
          this$1.height -= oldHeight - child.height
          if (sz == rm) { this$1.children.splice(i--, 1); child.parent = null }
          if ((n -= rm) == 0) { break }
          at = 0
        } else { at -= sz }
      }
      // If the result is smaller than 25 lines, ensure that it is a
      // single leaf node.
      if (this.size - n < 25 &&
          (this.children.length > 1 || !(this.children[0] instanceof LeafChunk))) {
        var lines = []
        this.collapse(lines)
        this.children = [new LeafChunk(lines)]
        this.children[0].parent = this
      }
    },

    collapse: function collapse(lines) {
      var this$1 = this;

      for (var i = 0; i < this.children.length; ++i) { this$1.children[i].collapse(lines) }
    },

    insertInner: function insertInner(at, lines, height) {
      var this$1 = this;

      this.size += lines.length
      this.height += height
      for (var i = 0; i < this.children.length; ++i) {
        var child = this$1.children[i], sz = child.chunkSize()
        if (at <= sz) {
          child.insertInner(at, lines, height)
          if (child.lines && child.lines.length > 50) {
            // To avoid memory thrashing when child.lines is huge (e.g. first view of a large file), it's never spliced.
            // Instead, small slices are taken. They're taken in order because sequential memory accesses are fastest.
            var remaining = child.lines.length % 25 + 25
            for (var pos = remaining; pos < child.lines.length;) {
              var leaf = new LeafChunk(child.lines.slice(pos, pos += 25))
              child.height -= leaf.height
              this$1.children.splice(++i, 0, leaf)
              leaf.parent = this$1
            }
            child.lines = child.lines.slice(0, remaining)
            this$1.maybeSpill()
          }
          break
        }
        at -= sz
      }
    },

    // When a node has grown, check whether it should be split.
    maybeSpill: function maybeSpill() {
      if (this.children.length <= 10) { return }
      var me = this
      do {
        var spilled = me.children.splice(me.children.length - 5, 5)
        var sibling = new BranchChunk(spilled)
        if (!me.parent) { // Become the parent node
          var copy = new BranchChunk(me.children)
          copy.parent = me
          me.children = [copy, sibling]
          me = copy
       } else {
          me.size -= sibling.size
          me.height -= sibling.height
          var myIndex = indexOf(me.parent.children, me)
          me.parent.children.splice(myIndex + 1, 0, sibling)
        }
        sibling.parent = me.parent
      } while (me.children.length > 10)
      me.parent.maybeSpill()
    },

    iterN: function iterN(at, n, op) {
      var this$1 = this;

      for (var i = 0; i < this.children.length; ++i) {
        var child = this$1.children[i], sz = child.chunkSize()
        if (at < sz) {
          var used = Math.min(n, sz - at)
          if (child.iterN(at, used, op)) { return true }
          if ((n -= used) == 0) { break }
          at = 0
        } else { at -= sz }
      }
    }
  }

  // Line widgets are block elements displayed above or below a line.

  var LineWidget = function(doc, node, options) {
    var this$1 = this;

    if (options) { for (var opt in options) { if (options.hasOwnProperty(opt))
      { this$1[opt] = options[opt] } } }
    this.doc = doc
    this.node = node
  };

  LineWidget.prototype.clear = function () {
      var this$1 = this;

    var cm = this.doc.cm, ws = this.line.widgets, line = this.line, no = lineNo(line)
    if (no == null || !ws) { return }
    for (var i = 0; i < ws.length; ++i) { if (ws[i] == this$1) { ws.splice(i--, 1) } }
    if (!ws.length) { line.widgets = null }
    var height = widgetHeight(this)
    updateLineHeight(line, Math.max(0, line.height - height))
    if (cm) {
      runInOp(cm, function () {
        adjustScrollWhenAboveVisible(cm, line, -height)
        regLineChange(cm, no, "widget")
      })
      signalLater(cm, "lineWidgetCleared", cm, this, no)
    }
  };

  LineWidget.prototype.changed = function () {
      var this$1 = this;

    var oldH = this.height, cm = this.doc.cm, line = this.line
    this.height = null
    var diff = widgetHeight(this) - oldH
    if (!diff) { return }
    updateLineHeight(line, line.height + diff)
    if (cm) {
      runInOp(cm, function () {
        cm.curOp.forceUpdate = true
        adjustScrollWhenAboveVisible(cm, line, diff)
        signalLater(cm, "lineWidgetChanged", cm, this$1, lineNo(line))
      })
    }
  };
  eventMixin(LineWidget)

  function adjustScrollWhenAboveVisible(cm, line, diff) {
    if (heightAtLine(line) < ((cm.curOp && cm.curOp.scrollTop) || cm.doc.scrollTop))
      { addToScrollTop(cm, diff) }
  }

  function addLineWidget(doc, handle, node, options) {
    var widget = new LineWidget(doc, node, options)
    var cm = doc.cm
    if (cm && widget.noHScroll) { cm.display.alignWidgets = true }
    changeLine(doc, handle, "widget", function (line) {
      var widgets = line.widgets || (line.widgets = [])
      if (widget.insertAt == null) { widgets.push(widget) }
      else { widgets.splice(Math.min(widgets.length - 1, Math.max(0, widget.insertAt)), 0, widget) }
      widget.line = line
      if (cm && !lineIsHidden(doc, line)) {
        var aboveVisible = heightAtLine(line) < doc.scrollTop
        updateLineHeight(line, line.height + widgetHeight(widget))
        if (aboveVisible) { addToScrollTop(cm, widget.height) }
        cm.curOp.forceUpdate = true
      }
      return true
    })
    signalLater(cm, "lineWidgetAdded", cm, widget, typeof handle == "number" ? handle : lineNo(handle))
    return widget
  }

  // TEXTMARKERS

  // Created with markText and setBookmark methods. A TextMarker is a
  // handle that can be used to clear or find a marked position in the
  // document. Line objects hold arrays (markedSpans) containing
  // {from, to, marker} object pointing to such marker objects, and
  // indicating that such a marker is present on that line. Multiple
  // lines may point to the same marker when it spans across lines.
  // The spans will have null for their from/to properties when the
  // marker continues beyond the start/end of the line. Markers have
  // links back to the lines they currently touch.

  // Collapsed markers have unique ids, in order to be able to order
  // them, which is needed for uniquely determining an outer marker
  // when they overlap (they may nest, but not partially overlap).
  var nextMarkerId = 0

  var TextMarker = function(doc, type) {
    this.lines = []
    this.type = type
    this.doc = doc
    this.id = ++nextMarkerId
  };

  // Clear the marker.
  TextMarker.prototype.clear = function () {
      var this$1 = this;

    if (this.explicitlyCleared) { return }
    var cm = this.doc.cm, withOp = cm && !cm.curOp
    if (withOp) { startOperation(cm) }
    if (hasHandler(this, "clear")) {
      var found = this.find()
      if (found) { signalLater(this, "clear", found.from, found.to) }
    }
    var min = null, max = null
    for (var i = 0; i < this.lines.length; ++i) {
      var line = this$1.lines[i]
      var span = getMarkedSpanFor(line.markedSpans, this$1)
      if (cm && !this$1.collapsed) { regLineChange(cm, lineNo(line), "text") }
      else if (cm) {
        if (span.to != null) { max = lineNo(line) }
        if (span.from != null) { min = lineNo(line) }
      }
      line.markedSpans = removeMarkedSpan(line.markedSpans, span)
      if (span.from == null && this$1.collapsed && !lineIsHidden(this$1.doc, line) && cm)
        { updateLineHeight(line, textHeight(cm.display)) }
    }
    if (cm && this.collapsed && !cm.options.lineWrapping) { for (var i$1 = 0; i$1 < this.lines.length; ++i$1) {
      var visual = visualLine(this$1.lines[i$1]), len = lineLength(visual)
      if (len > cm.display.maxLineLength) {
        cm.display.maxLine = visual
        cm.display.maxLineLength = len
        cm.display.maxLineChanged = true
      }
    } }

    if (min != null && cm && this.collapsed) { regChange(cm, min, max + 1) }
    this.lines.length = 0
    this.explicitlyCleared = true
    if (this.atomic && this.doc.cantEdit) {
      this.doc.cantEdit = false
      if (cm) { reCheckSelection(cm.doc) }
    }
    if (cm) { signalLater(cm, "markerCleared", cm, this, min, max) }
    if (withOp) { endOperation(cm) }
    if (this.parent) { this.parent.clear() }
  };

  // Find the position of the marker in the document. Returns a {from,
  // to} object by default. Side can be passed to get a specific side
  // -- 0 (both), -1 (left), or 1 (right). When lineObj is true, the
  // Pos objects returned contain a line object, rather than a line
  // number (used to prevent looking up the same line twice).
  TextMarker.prototype.find = function (side, lineObj) {
      var this$1 = this;

    if (side == null && this.type == "bookmark") { side = 1 }
    var from, to
    for (var i = 0; i < this.lines.length; ++i) {
      var line = this$1.lines[i]
      var span = getMarkedSpanFor(line.markedSpans, this$1)
      if (span.from != null) {
        from = Pos(lineObj ? line : lineNo(line), span.from)
        if (side == -1) { return from }
      }
      if (span.to != null) {
        to = Pos(lineObj ? line : lineNo(line), span.to)
        if (side == 1) { return to }
      }
    }
    return from && {from: from, to: to}
  };

  // Signals that the marker's widget changed, and surrounding layout
  // should be recomputed.
  TextMarker.prototype.changed = function () {
      var this$1 = this;

    var pos = this.find(-1, true), widget = this, cm = this.doc.cm
    if (!pos || !cm) { return }
    runInOp(cm, function () {
      var line = pos.line, lineN = lineNo(pos.line)
      var view = findViewForLine(cm, lineN)
      if (view) {
        clearLineMeasurementCacheFor(view)
        cm.curOp.selectionChanged = cm.curOp.forceUpdate = true
      }
      cm.curOp.updateMaxLine = true
      if (!lineIsHidden(widget.doc, line) && widget.height != null) {
        var oldHeight = widget.height
        widget.height = null
        var dHeight = widgetHeight(widget) - oldHeight
        if (dHeight)
          { updateLineHeight(line, line.height + dHeight) }
      }
      signalLater(cm, "markerChanged", cm, this$1)
    })
  };

  TextMarker.prototype.attachLine = function (line) {
    if (!this.lines.length && this.doc.cm) {
      var op = this.doc.cm.curOp
      if (!op.maybeHiddenMarkers || indexOf(op.maybeHiddenMarkers, this) == -1)
        { (op.maybeUnhiddenMarkers || (op.maybeUnhiddenMarkers = [])).push(this) }
    }
    this.lines.push(line)
  };

  TextMarker.prototype.detachLine = function (line) {
    this.lines.splice(indexOf(this.lines, line), 1)
    if (!this.lines.length && this.doc.cm) {
      var op = this.doc.cm.curOp
      ;(op.maybeHiddenMarkers || (op.maybeHiddenMarkers = [])).push(this)
    }
  };
  eventMixin(TextMarker)

  // Create a marker, wire it up to the right lines, and
  function markText(doc, from, to, options, type) {
    // Shared markers (across linked documents) are handled separately
    // (markTextShared will call out to this again, once per
    // document).
    if (options && options.shared) { return markTextShared(doc, from, to, options, type) }
    // Ensure we are in an operation.
    if (doc.cm && !doc.cm.curOp) { return operation(doc.cm, markText)(doc, from, to, options, type) }

    var marker = new TextMarker(doc, type), diff = cmp(from, to)
    if (options) { copyObj(options, marker, false) }
    // Don't connect empty markers unless clearWhenEmpty is false
    if (diff > 0 || diff == 0 && marker.clearWhenEmpty !== false)
      { return marker }
    if (marker.replacedWith) {
      // Showing up as a widget implies collapsed (widget replaces text)
      marker.collapsed = true
      marker.widgetNode = eltP("span", [marker.replacedWith], "CodeMirror-widget")
      if (!options.handleMouseEvents) { marker.widgetNode.setAttribute("cm-ignore-events", "true") }
      if (options.insertLeft) { marker.widgetNode.insertLeft = true }
    }
    if (marker.collapsed) {
      if (conflictingCollapsedRange(doc, from.line, from, to, marker) ||
          from.line != to.line && conflictingCollapsedRange(doc, to.line, from, to, marker))
        { throw new Error("Inserting collapsed marker partially overlapping an existing one") }
      seeCollapsedSpans()
    }

    if (marker.addToHistory)
      { addChangeToHistory(doc, {from: from, to: to, origin: "markText"}, doc.sel, NaN) }

    var curLine = from.line, cm = doc.cm, updateMaxLine
    doc.iter(curLine, to.line + 1, function (line) {
      if (cm && marker.collapsed && !cm.options.lineWrapping && visualLine(line) == cm.display.maxLine)
        { updateMaxLine = true }
      if (marker.collapsed && curLine != from.line) { updateLineHeight(line, 0) }
      addMarkedSpan(line, new MarkedSpan(marker,
                                         curLine == from.line ? from.ch : null,
                                         curLine == to.line ? to.ch : null))
      ++curLine
    })
    // lineIsHidden depends on the presence of the spans, so needs a second pass
    if (marker.collapsed) { doc.iter(from.line, to.line + 1, function (line) {
      if (lineIsHidden(doc, line)) { updateLineHeight(line, 0) }
    }) }

    if (marker.clearOnEnter) { on(marker, "beforeCursorEnter", function () { return marker.clear(); }) }

    if (marker.readOnly) {
      seeReadOnlySpans()
      if (doc.history.done.length || doc.history.undone.length)
        { doc.clearHistory() }
    }
    if (marker.collapsed) {
      marker.id = ++nextMarkerId
      marker.atomic = true
    }
    if (cm) {
      // Sync editor state
      if (updateMaxLine) { cm.curOp.updateMaxLine = true }
      if (marker.collapsed)
        { regChange(cm, from.line, to.line + 1) }
      else if (marker.className || marker.title || marker.startStyle || marker.endStyle || marker.css)
        { for (var i = from.line; i <= to.line; i++) { regLineChange(cm, i, "text") } }
      if (marker.atomic) { reCheckSelection(cm.doc) }
      signalLater(cm, "markerAdded", cm, marker)
    }
    return marker
  }

  // SHARED TEXTMARKERS

  // A shared marker spans multiple linked documents. It is
  // implemented as a meta-marker-object controlling multiple normal
  // markers.
  var SharedTextMarker = function(markers, primary) {
    var this$1 = this;

    this.markers = markers
    this.primary = primary
    for (var i = 0; i < markers.length; ++i)
      { markers[i].parent = this$1 }
  };

  SharedTextMarker.prototype.clear = function () {
      var this$1 = this;

    if (this.explicitlyCleared) { return }
    this.explicitlyCleared = true
    for (var i = 0; i < this.markers.length; ++i)
      { this$1.markers[i].clear() }
    signalLater(this, "clear")
  };

  SharedTextMarker.prototype.find = function (side, lineObj) {
    return this.primary.find(side, lineObj)
  };
  eventMixin(SharedTextMarker)

  function markTextShared(doc, from, to, options, type) {
    options = copyObj(options)
    options.shared = false
    var markers = [markText(doc, from, to, options, type)], primary = markers[0]
    var widget = options.widgetNode
    linkedDocs(doc, function (doc) {
      if (widget) { options.widgetNode = widget.cloneNode(true) }
      markers.push(markText(doc, clipPos(doc, from), clipPos(doc, to), options, type))
      for (var i = 0; i < doc.linked.length; ++i)
        { if (doc.linked[i].isParent) { return } }
      primary = lst(markers)
    })
    return new SharedTextMarker(markers, primary)
  }

  function findSharedMarkers(doc) {
    return doc.findMarks(Pos(doc.first, 0), doc.clipPos(Pos(doc.lastLine())), function (m) { return m.parent; })
  }

  function copySharedMarkers(doc, markers) {
    for (var i = 0; i < markers.length; i++) {
      var marker = markers[i], pos = marker.find()
      var mFrom = doc.clipPos(pos.from), mTo = doc.clipPos(pos.to)
      if (cmp(mFrom, mTo)) {
        var subMark = markText(doc, mFrom, mTo, marker.primary, marker.primary.type)
        marker.markers.push(subMark)
        subMark.parent = marker
      }
    }
  }

  function detachSharedMarkers(markers) {
    var loop = function ( i ) {
      var marker = markers[i], linked = [marker.primary.doc]
      linkedDocs(marker.primary.doc, function (d) { return linked.push(d); })
      for (var j = 0; j < marker.markers.length; j++) {
        var subMarker = marker.markers[j]
        if (indexOf(linked, subMarker.doc) == -1) {
          subMarker.parent = null
          marker.markers.splice(j--, 1)
        }
      }
    };

    for (var i = 0; i < markers.length; i++) loop( i );
  }

  var nextDocId = 0
  var Doc = function(text, mode, firstLine, lineSep, direction) {
    if (!(this instanceof Doc)) { return new Doc(text, mode, firstLine, lineSep, direction) }
    if (firstLine == null) { firstLine = 0 }

    BranchChunk.call(this, [new LeafChunk([new Line("", null)])])
    this.first = firstLine
    this.scrollTop = this.scrollLeft = 0
    this.cantEdit = false
    this.cleanGeneration = 1
    this.modeFrontier = this.highlightFrontier = firstLine
    var start = Pos(firstLine, 0)
    this.sel = simpleSelection(start)
    this.history = new History(null)
    this.id = ++nextDocId
    this.modeOption = mode
    this.lineSep = lineSep
    this.direction = (direction == "rtl") ? "rtl" : "ltr"
    this.extend = false

    if (typeof text == "string") { text = this.splitLines(text) }
    updateDoc(this, {from: start, to: start, text: text})
    setSelection(this, simpleSelection(start), sel_dontScroll)
  }

  Doc.prototype = createObj(BranchChunk.prototype, {
    constructor: Doc,
    // Iterate over the document. Supports two forms -- with only one
    // argument, it calls that for each line in the document. With
    // three, it iterates over the range given by the first two (with
    // the second being non-inclusive).
    iter: function(from, to, op) {
      if (op) { this.iterN(from - this.first, to - from, op) }
      else { this.iterN(this.first, this.first + this.size, from) }
    },

    // Non-public interface for adding and removing lines.
    insert: function(at, lines) {
      var height = 0
      for (var i = 0; i < lines.length; ++i) { height += lines[i].height }
      this.insertInner(at - this.first, lines, height)
    },
    remove: function(at, n) { this.removeInner(at - this.first, n) },

    // From here, the methods are part of the public interface. Most
    // are also available from CodeMirror (editor) instances.

    getValue: function(lineSep) {
      var lines = getLines(this, this.first, this.first + this.size)
      if (lineSep === false) { return lines }
      return lines.join(lineSep || this.lineSeparator())
    },
    setValue: docMethodOp(function(code) {
      var top = Pos(this.first, 0), last = this.first + this.size - 1
      makeChange(this, {from: top, to: Pos(last, getLine(this, last).text.length),
                        text: this.splitLines(code), origin: "setValue", full: true}, true)
      if (this.cm) { scrollToCoords(this.cm, 0, 0) }
      setSelection(this, simpleSelection(top), sel_dontScroll)
    }),
    replaceRange: function(code, from, to, origin) {
      from = clipPos(this, from)
      to = to ? clipPos(this, to) : from
      replaceRange(this, code, from, to, origin)
    },
    getRange: function(from, to, lineSep) {
      var lines = getBetween(this, clipPos(this, from), clipPos(this, to))
      if (lineSep === false) { return lines }
      return lines.join(lineSep || this.lineSeparator())
    },

    getLine: function(line) {var l = this.getLineHandle(line); return l && l.text},

    getLineHandle: function(line) {if (isLine(this, line)) { return getLine(this, line) }},
    getLineNumber: function(line) {return lineNo(line)},

    getLineHandleVisualStart: function(line) {
      if (typeof line == "number") { line = getLine(this, line) }
      return visualLine(line)
    },

    lineCount: function() {return this.size},
    firstLine: function() {return this.first},
    lastLine: function() {return this.first + this.size - 1},

    clipPos: function(pos) {return clipPos(this, pos)},

    getCursor: function(start) {
      var range = this.sel.primary(), pos
      if (start == null || start == "head") { pos = range.head }
      else if (start == "anchor") { pos = range.anchor }
      else if (start == "end" || start == "to" || start === false) { pos = range.to() }
      else { pos = range.from() }
      return pos
    },
    listSelections: function() { return this.sel.ranges },
    somethingSelected: function() {return this.sel.somethingSelected()},

    setCursor: docMethodOp(function(line, ch, options) {
      setSimpleSelection(this, clipPos(this, typeof line == "number" ? Pos(line, ch || 0) : line), null, options)
    }),
    setSelection: docMethodOp(function(anchor, head, options) {
      setSimpleSelection(this, clipPos(this, anchor), clipPos(this, head || anchor), options)
    }),
    extendSelection: docMethodOp(function(head, other, options) {
      extendSelection(this, clipPos(this, head), other && clipPos(this, other), options)
    }),
    extendSelections: docMethodOp(function(heads, options) {
      extendSelections(this, clipPosArray(this, heads), options)
    }),
    extendSelectionsBy: docMethodOp(function(f, options) {
      var heads = map(this.sel.ranges, f)
      extendSelections(this, clipPosArray(this, heads), options)
    }),
    setSelections: docMethodOp(function(ranges, primary, options) {
      var this$1 = this;

      if (!ranges.length) { return }
      var out = []
      for (var i = 0; i < ranges.length; i++)
        { out[i] = new Range(clipPos(this$1, ranges[i].anchor),
                           clipPos(this$1, ranges[i].head)) }
      if (primary == null) { primary = Math.min(ranges.length - 1, this.sel.primIndex) }
      setSelection(this, normalizeSelection(out, primary), options)
    }),
    addSelection: docMethodOp(function(anchor, head, options) {
      var ranges = this.sel.ranges.slice(0)
      ranges.push(new Range(clipPos(this, anchor), clipPos(this, head || anchor)))
      setSelection(this, normalizeSelection(ranges, ranges.length - 1), options)
    }),

    getSelection: function(lineSep) {
      var this$1 = this;

      var ranges = this.sel.ranges, lines
      for (var i = 0; i < ranges.length; i++) {
        var sel = getBetween(this$1, ranges[i].from(), ranges[i].to())
        lines = lines ? lines.concat(sel) : sel
      }
      if (lineSep === false) { return lines }
      else { return lines.join(lineSep || this.lineSeparator()) }
    },
    getSelections: function(lineSep) {
      var this$1 = this;

      var parts = [], ranges = this.sel.ranges
      for (var i = 0; i < ranges.length; i++) {
        var sel = getBetween(this$1, ranges[i].from(), ranges[i].to())
        if (lineSep !== false) { sel = sel.join(lineSep || this$1.lineSeparator()) }
        parts[i] = sel
      }
      return parts
    },
    replaceSelection: function(code, collapse, origin) {
      var dup = []
      for (var i = 0; i < this.sel.ranges.length; i++)
        { dup[i] = code }
      this.replaceSelections(dup, collapse, origin || "+input")
    },
    replaceSelections: docMethodOp(function(code, collapse, origin) {
      var this$1 = this;

      var changes = [], sel = this.sel
      for (var i = 0; i < sel.ranges.length; i++) {
        var range = sel.ranges[i]
        changes[i] = {from: range.from(), to: range.to(), text: this$1.splitLines(code[i]), origin: origin}
      }
      var newSel = collapse && collapse != "end" && computeReplacedSel(this, changes, collapse)
      for (var i$1 = changes.length - 1; i$1 >= 0; i$1--)
        { makeChange(this$1, changes[i$1]) }
      if (newSel) { setSelectionReplaceHistory(this, newSel) }
      else if (this.cm) { ensureCursorVisible(this.cm) }
    }),
    undo: docMethodOp(function() {makeChangeFromHistory(this, "undo")}),
    redo: docMethodOp(function() {makeChangeFromHistory(this, "redo")}),
    undoSelection: docMethodOp(function() {makeChangeFromHistory(this, "undo", true)}),
    redoSelection: docMethodOp(function() {makeChangeFromHistory(this, "redo", true)}),

    setExtending: function(val) {this.extend = val},
    getExtending: function() {return this.extend},

    historySize: function() {
      var hist = this.history, done = 0, undone = 0
      for (var i = 0; i < hist.done.length; i++) { if (!hist.done[i].ranges) { ++done } }
      for (var i$1 = 0; i$1 < hist.undone.length; i$1++) { if (!hist.undone[i$1].ranges) { ++undone } }
      return {undo: done, redo: undone}
    },
    clearHistory: function() {this.history = new History(this.history.maxGeneration)},

    markClean: function() {
      this.cleanGeneration = this.changeGeneration(true)
    },
    changeGeneration: function(forceSplit) {
      if (forceSplit)
        { this.history.lastOp = this.history.lastSelOp = this.history.lastOrigin = null }
      return this.history.generation
    },
    isClean: function (gen) {
      return this.history.generation == (gen || this.cleanGeneration)
    },

    getHistory: function() {
      return {done: copyHistoryArray(this.history.done),
              undone: copyHistoryArray(this.history.undone)}
    },
    setHistory: function(histData) {
      var hist = this.history = new History(this.history.maxGeneration)
      hist.done = copyHistoryArray(histData.done.slice(0), null, true)
      hist.undone = copyHistoryArray(histData.undone.slice(0), null, true)
    },

    setGutterMarker: docMethodOp(function(line, gutterID, value) {
      return changeLine(this, line, "gutter", function (line) {
        var markers = line.gutterMarkers || (line.gutterMarkers = {})
        markers[gutterID] = value
        if (!value && isEmpty(markers)) { line.gutterMarkers = null }
        return true
      })
    }),

    clearGutter: docMethodOp(function(gutterID) {
      var this$1 = this;

      this.iter(function (line) {
        if (line.gutterMarkers && line.gutterMarkers[gutterID]) {
          changeLine(this$1, line, "gutter", function () {
            line.gutterMarkers[gutterID] = null
            if (isEmpty(line.gutterMarkers)) { line.gutterMarkers = null }
            return true
          })
        }
      })
    }),

    lineInfo: function(line) {
      var n
      if (typeof line == "number") {
        if (!isLine(this, line)) { return null }
        n = line
        line = getLine(this, line)
        if (!line) { return null }
      } else {
        n = lineNo(line)
        if (n == null) { return null }
      }
      return {line: n, handle: line, text: line.text, gutterMarkers: line.gutterMarkers,
              textClass: line.textClass, bgClass: line.bgClass, wrapClass: line.wrapClass,
              widgets: line.widgets}
    },

    addLineClass: docMethodOp(function(handle, where, cls) {
      return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function (line) {
        var prop = where == "text" ? "textClass"
                 : where == "background" ? "bgClass"
                 : where == "gutter" ? "gutterClass" : "wrapClass"
        if (!line[prop]) { line[prop] = cls }
        else if (classTest(cls).test(line[prop])) { return false }
        else { line[prop] += " " + cls }
        return true
      })
    }),
    removeLineClass: docMethodOp(function(handle, where, cls) {
      return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function (line) {
        var prop = where == "text" ? "textClass"
                 : where == "background" ? "bgClass"
                 : where == "gutter" ? "gutterClass" : "wrapClass"
        var cur = line[prop]
        if (!cur) { return false }
        else if (cls == null) { line[prop] = null }
        else {
          var found = cur.match(classTest(cls))
          if (!found) { return false }
          var end = found.index + found[0].length
          line[prop] = cur.slice(0, found.index) + (!found.index || end == cur.length ? "" : " ") + cur.slice(end) || null
        }
        return true
      })
    }),

    addLineWidget: docMethodOp(function(handle, node, options) {
      return addLineWidget(this, handle, node, options)
    }),
    removeLineWidget: function(widget) { widget.clear() },

    markText: function(from, to, options) {
      return markText(this, clipPos(this, from), clipPos(this, to), options, options && options.type || "range")
    },
    setBookmark: function(pos, options) {
      var realOpts = {replacedWith: options && (options.nodeType == null ? options.widget : options),
                      insertLeft: options && options.insertLeft,
                      clearWhenEmpty: false, shared: options && options.shared,
                      handleMouseEvents: options && options.handleMouseEvents}
      pos = clipPos(this, pos)
      return markText(this, pos, pos, realOpts, "bookmark")
    },
    findMarksAt: function(pos) {
      pos = clipPos(this, pos)
      var markers = [], spans = getLine(this, pos.line).markedSpans
      if (spans) { for (var i = 0; i < spans.length; ++i) {
        var span = spans[i]
        if ((span.from == null || span.from <= pos.ch) &&
            (span.to == null || span.to >= pos.ch))
          { markers.push(span.marker.parent || span.marker) }
      } }
      return markers
    },
    findMarks: function(from, to, filter) {
      from = clipPos(this, from); to = clipPos(this, to)
      var found = [], lineNo = from.line
      this.iter(from.line, to.line + 1, function (line) {
        var spans = line.markedSpans
        if (spans) { for (var i = 0; i < spans.length; i++) {
          var span = spans[i]
          if (!(span.to != null && lineNo == from.line && from.ch >= span.to ||
                span.from == null && lineNo != from.line ||
                span.from != null && lineNo == to.line && span.from >= to.ch) &&
              (!filter || filter(span.marker)))
            { found.push(span.marker.parent || span.marker) }
        } }
        ++lineNo
      })
      return found
    },
    getAllMarks: function() {
      var markers = []
      this.iter(function (line) {
        var sps = line.markedSpans
        if (sps) { for (var i = 0; i < sps.length; ++i)
          { if (sps[i].from != null) { markers.push(sps[i].marker) } } }
      })
      return markers
    },

    posFromIndex: function(off) {
      var ch, lineNo = this.first, sepSize = this.lineSeparator().length
      this.iter(function (line) {
        var sz = line.text.length + sepSize
        if (sz > off) { ch = off; return true }
        off -= sz
        ++lineNo
      })
      return clipPos(this, Pos(lineNo, ch))
    },
    indexFromPos: function (coords) {
      coords = clipPos(this, coords)
      var index = coords.ch
      if (coords.line < this.first || coords.ch < 0) { return 0 }
      var sepSize = this.lineSeparator().length
      this.iter(this.first, coords.line, function (line) { // iter aborts when callback returns a truthy value
        index += line.text.length + sepSize
      })
      return index
    },

    copy: function(copyHistory) {
      var doc = new Doc(getLines(this, this.first, this.first + this.size),
                        this.modeOption, this.first, this.lineSep, this.direction)
      doc.scrollTop = this.scrollTop; doc.scrollLeft = this.scrollLeft
      doc.sel = this.sel
      doc.extend = false
      if (copyHistory) {
        doc.history.undoDepth = this.history.undoDepth
        doc.setHistory(this.getHistory())
      }
      return doc
    },

    linkedDoc: function(options) {
      if (!options) { options = {} }
      var from = this.first, to = this.first + this.size
      if (options.from != null && options.from > from) { from = options.from }
      if (options.to != null && options.to < to) { to = options.to }
      var copy = new Doc(getLines(this, from, to), options.mode || this.modeOption, from, this.lineSep, this.direction)
      if (options.sharedHist) { copy.history = this.history
      ; }(this.linked || (this.linked = [])).push({doc: copy, sharedHist: options.sharedHist})
      copy.linked = [{doc: this, isParent: true, sharedHist: options.sharedHist}]
      copySharedMarkers(copy, findSharedMarkers(this))
      return copy
    },
    unlinkDoc: function(other) {
      var this$1 = this;

      if (other instanceof CodeMirror) { other = other.doc }
      if (this.linked) { for (var i = 0; i < this.linked.length; ++i) {
        var link = this$1.linked[i]
        if (link.doc != other) { continue }
        this$1.linked.splice(i, 1)
        other.unlinkDoc(this$1)
        detachSharedMarkers(findSharedMarkers(this$1))
        break
      } }
      // If the histories were shared, split them again
      if (other.history == this.history) {
        var splitIds = [other.id]
        linkedDocs(other, function (doc) { return splitIds.push(doc.id); }, true)
        other.history = new History(null)
        other.history.done = copyHistoryArray(this.history.done, splitIds)
        other.history.undone = copyHistoryArray(this.history.undone, splitIds)
      }
    },
    iterLinkedDocs: function(f) {linkedDocs(this, f)},

    getMode: function() {return this.mode},
    getEditor: function() {return this.cm},

    splitLines: function(str) {
      if (this.lineSep) { return str.split(this.lineSep) }
      return splitLinesAuto(str)
    },
    lineSeparator: function() { return this.lineSep || "\n" },

    setDirection: docMethodOp(function (dir) {
      if (dir != "rtl") { dir = "ltr" }
      if (dir == this.direction) { return }
      this.direction = dir
      this.iter(function (line) { return line.order = null; })
      if (this.cm) { directionChanged(this.cm) }
    })
  })

  // Public alias.
  Doc.prototype.eachLine = Doc.prototype.iter

  // Kludge to work around strange IE behavior where it'll sometimes
  // re-fire a series of drag-related events right after the drop (#1551)
  var lastDrop = 0

  function onDrop(e) {
    var cm = this
    clearDragCursor(cm)
    if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e))
      { return }
    e_preventDefault(e)
    if (ie) { lastDrop = +new Date }
    var pos = posFromMouse(cm, e, true), files = e.dataTransfer.files
    if (!pos || cm.isReadOnly()) { return }
    // Might be a file drop, in which case we simply extract the text
    // and insert it.
    if (files && files.length && window.FileReader && window.File) {
      var n = files.length, text = Array(n), read = 0
      var loadFile = function (file, i) {
        if (cm.options.allowDropFileTypes &&
            indexOf(cm.options.allowDropFileTypes, file.type) == -1)
          { return }

        var reader = new FileReader
        reader.onload = operation(cm, function () {
          var content = reader.result
          if (/[\x00-\x08\x0e-\x1f]{2}/.test(content)) { content = "" }
          text[i] = content
          if (++read == n) {
            pos = clipPos(cm.doc, pos)
            var change = {from: pos, to: pos,
                          text: cm.doc.splitLines(text.join(cm.doc.lineSeparator())),
                          origin: "paste"}
            makeChange(cm.doc, change)
            setSelectionReplaceHistory(cm.doc, simpleSelection(pos, changeEnd(change)))
          }
        })
        reader.readAsText(file)
      }
      for (var i = 0; i < n; ++i) { loadFile(files[i], i) }
    } else { // Normal drop
      // Don't do a replace if the drop happened inside of the selected text.
      if (cm.state.draggingText && cm.doc.sel.contains(pos) > -1) {
        cm.state.draggingText(e)
        // Ensure the editor is re-focused
        setTimeout(function () { return cm.display.input.focus(); }, 20)
        return
      }
      try {
        var text$1 = e.dataTransfer.getData("Text")
        if (text$1) {
          var selected
          if (cm.state.draggingText && !cm.state.draggingText.copy)
            { selected = cm.listSelections() }
          setSelectionNoUndo(cm.doc, simpleSelection(pos, pos))
          if (selected) { for (var i$1 = 0; i$1 < selected.length; ++i$1)
            { replaceRange(cm.doc, "", selected[i$1].anchor, selected[i$1].head, "drag") } }
          cm.replaceSelection(text$1, "around", "paste")
          cm.display.input.focus()
        }
      }
      catch(e){}
    }
  }

  function onDragStart(cm, e) {
    if (ie && (!cm.state.draggingText || +new Date - lastDrop < 100)) { e_stop(e); return }
    if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e)) { return }

    e.dataTransfer.setData("Text", cm.getSelection())
    e.dataTransfer.effectAllowed = "copyMove"

    // Use dummy image instead of default browsers image.
    // Recent Safari (~6.0.2) have a tendency to segfault when this happens, so we don't do it there.
    if (e.dataTransfer.setDragImage && !safari) {
      var img = elt("img", null, null, "position: fixed; left: 0; top: 0;")
      img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
      if (presto) {
        img.width = img.height = 1
        cm.display.wrapper.appendChild(img)
        // Force a relayout, or Opera won't use our image for some obscure reason
        img._top = img.offsetTop
      }
      e.dataTransfer.setDragImage(img, 0, 0)
      if (presto) { img.parentNode.removeChild(img) }
    }
  }

  function onDragOver(cm, e) {
    var pos = posFromMouse(cm, e)
    if (!pos) { return }
    var frag = document.createDocumentFragment()
    drawSelectionCursor(cm, pos, frag)
    if (!cm.display.dragCursor) {
      cm.display.dragCursor = elt("div", null, "CodeMirror-cursors CodeMirror-dragcursors")
      cm.display.lineSpace.insertBefore(cm.display.dragCursor, cm.display.cursorDiv)
    }
    removeChildrenAndAdd(cm.display.dragCursor, frag)
  }

  function clearDragCursor(cm) {
    if (cm.display.dragCursor) {
      cm.display.lineSpace.removeChild(cm.display.dragCursor)
      cm.display.dragCursor = null
    }
  }

  // These must be handled carefully, because naively registering a
  // handler for each editor will cause the editors to never be
  // garbage collected.

  function forEachCodeMirror(f) {
    if (!document.getElementsByClassName) { return }
    var byClass = document.getElementsByClassName("CodeMirror")
    for (var i = 0; i < byClass.length; i++) {
      var cm = byClass[i].CodeMirror
      if (cm) { f(cm) }
    }
  }

  var globalsRegistered = false
  function ensureGlobalHandlers() {
    if (globalsRegistered) { return }
    registerGlobalHandlers()
    globalsRegistered = true
  }
  function registerGlobalHandlers() {
    // When the window resizes, we need to refresh active editors.
    var resizeTimer
    on(window, "resize", function () {
      if (resizeTimer == null) { resizeTimer = setTimeout(function () {
        resizeTimer = null
        forEachCodeMirror(onResize)
      }, 100) }
    })
    // When the window loses focus, we want to show the editor as blurred
    on(window, "blur", function () { return forEachCodeMirror(onBlur); })
  }
  // Called when the window resizes
  function onResize(cm) {
    var d = cm.display
    if (d.lastWrapHeight == d.wrapper.clientHeight && d.lastWrapWidth == d.wrapper.clientWidth)
      { return }
    // Might be a text scaling operation, clear size caches.
    d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null
    d.scrollbarsClipped = false
    cm.setSize()
  }

  var keyNames = {
    3: "Enter", 8: "Backspace", 9: "Tab", 13: "Enter", 16: "Shift", 17: "Ctrl", 18: "Alt",
    19: "Pause", 20: "CapsLock", 27: "Esc", 32: "Space", 33: "PageUp", 34: "PageDown", 35: "End",
    36: "Home", 37: "Left", 38: "Up", 39: "Right", 40: "Down", 44: "PrintScrn", 45: "Insert",
    46: "Delete", 59: ";", 61: "=", 91: "Mod", 92: "Mod", 93: "Mod",
    106: "*", 107: "=", 109: "-", 110: ".", 111: "/", 127: "Delete",
    173: "-", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\",
    221: "]", 222: "'", 63232: "Up", 63233: "Down", 63234: "Left", 63235: "Right", 63272: "Delete",
    63273: "Home", 63275: "End", 63276: "PageUp", 63277: "PageDown", 63302: "Insert"
  }

  // Number keys
  for (var i = 0; i < 10; i++) { keyNames[i + 48] = keyNames[i + 96] = String(i) }
  // Alphabetic keys
  for (var i$1 = 65; i$1 <= 90; i$1++) { keyNames[i$1] = String.fromCharCode(i$1) }
  // Function keys
  for (var i$2 = 1; i$2 <= 12; i$2++) { keyNames[i$2 + 111] = keyNames[i$2 + 63235] = "F" + i$2 }

  var keyMap = {}

  keyMap.basic = {
    "Left": "goCharLeft", "Right": "goCharRight", "Up": "goLineUp", "Down": "goLineDown",
    "End": "goLineEnd", "Home": "goLineStartSmart", "PageUp": "goPageUp", "PageDown": "goPageDown",
    "Delete": "delCharAfter", "Backspace": "delCharBefore", "Shift-Backspace": "delCharBefore",
    "Tab": "defaultTab", "Shift-Tab": "indentAuto",
    "Enter": "newlineAndIndent", "Insert": "toggleOverwrite",
    "Esc": "singleSelection"
  }
  // Note that the save and find-related commands aren't defined by
  // default. User code or addons can define them. Unknown commands
  // are simply ignored.
  keyMap.pcDefault = {
    "Ctrl-A": "selectAll", "Ctrl-D": "deleteLine", "Ctrl-Z": "undo", "Shift-Ctrl-Z": "redo", "Ctrl-Y": "redo",
    "Ctrl-Home": "goDocStart", "Ctrl-End": "goDocEnd", "Ctrl-Up": "goLineUp", "Ctrl-Down": "goLineDown",
    "Ctrl-Left": "goGroupLeft", "Ctrl-Right": "goGroupRight", "Alt-Left": "goLineStart", "Alt-Right": "goLineEnd",
    "Ctrl-Backspace": "delGroupBefore", "Ctrl-Delete": "delGroupAfter", "Ctrl-S": "save", "Ctrl-F": "find",
    "Ctrl-G": "findNext", "Shift-Ctrl-G": "findPrev", "Shift-Ctrl-F": "replace", "Shift-Ctrl-R": "replaceAll",
    "Ctrl-[": "indentLess", "Ctrl-]": "indentMore",
    "Ctrl-U": "undoSelection", "Shift-Ctrl-U": "redoSelection", "Alt-U": "redoSelection",
    fallthrough: "basic"
  }
  // Very basic readline/emacs-style bindings, which are standard on Mac.
  keyMap.emacsy = {
    "Ctrl-F": "goCharRight", "Ctrl-B": "goCharLeft", "Ctrl-P": "goLineUp", "Ctrl-N": "goLineDown",
    "Alt-F": "goWordRight", "Alt-B": "goWordLeft", "Ctrl-A": "goLineStart", "Ctrl-E": "goLineEnd",
    "Ctrl-V": "goPageDown", "Shift-Ctrl-V": "goPageUp", "Ctrl-D": "delCharAfter", "Ctrl-H": "delCharBefore",
    "Alt-D": "delWordAfter", "Alt-Backspace": "delWordBefore", "Ctrl-K": "killLine", "Ctrl-T": "transposeChars",
    "Ctrl-O": "openLine"
  }
  keyMap.macDefault = {
    "Cmd-A": "selectAll", "Cmd-D": "deleteLine", "Cmd-Z": "undo", "Shift-Cmd-Z": "redo", "Cmd-Y": "redo",
    "Cmd-Home": "goDocStart", "Cmd-Up": "goDocStart", "Cmd-End": "goDocEnd", "Cmd-Down": "goDocEnd", "Alt-Left": "goGroupLeft",
    "Alt-Right": "goGroupRight", "Cmd-Left": "goLineLeft", "Cmd-Right": "goLineRight", "Alt-Backspace": "delGroupBefore",
    "Ctrl-Alt-Backspace": "delGroupAfter", "Alt-Delete": "delGroupAfter", "Cmd-S": "save", "Cmd-F": "find",
    "Cmd-G": "findNext", "Shift-Cmd-G": "findPrev", "Cmd-Alt-F": "replace", "Shift-Cmd-Alt-F": "replaceAll",
    "Cmd-[": "indentLess", "Cmd-]": "indentMore", "Cmd-Backspace": "delWrappedLineLeft", "Cmd-Delete": "delWrappedLineRight",
    "Cmd-U": "undoSelection", "Shift-Cmd-U": "redoSelection", "Ctrl-Up": "goDocStart", "Ctrl-Down": "goDocEnd",
    fallthrough: ["basic", "emacsy"]
  }
  keyMap["default"] = mac ? keyMap.macDefault : keyMap.pcDefault

  // KEYMAP DISPATCH

  function normalizeKeyName(name) {
    var parts = name.split(/-(?!$)/)
    name = parts[parts.length - 1]
    var alt, ctrl, shift, cmd
    for (var i = 0; i < parts.length - 1; i++) {
      var mod = parts[i]
      if (/^(cmd|meta|m)$/i.test(mod)) { cmd = true }
      else if (/^a(lt)?$/i.test(mod)) { alt = true }
      else if (/^(c|ctrl|control)$/i.test(mod)) { ctrl = true }
      else if (/^s(hift)?$/i.test(mod)) { shift = true }
      else { throw new Error("Unrecognized modifier name: " + mod) }
    }
    if (alt) { name = "Alt-" + name }
    if (ctrl) { name = "Ctrl-" + name }
    if (cmd) { name = "Cmd-" + name }
    if (shift) { name = "Shift-" + name }
    return name
  }

  // This is a kludge to keep keymaps mostly working as raw objects
  // (backwards compatibility) while at the same time support features
  // like normalization and multi-stroke key bindings. It compiles a
  // new normalized keymap, and then updates the old object to reflect
  // this.
  function normalizeKeyMap(keymap) {
    var copy = {}
    for (var keyname in keymap) { if (keymap.hasOwnProperty(keyname)) {
      var value = keymap[keyname]
      if (/^(name|fallthrough|(de|at)tach)$/.test(keyname)) { continue }
      if (value == "...") { delete keymap[keyname]; continue }

      var keys = map(keyname.split(" "), normalizeKeyName)
      for (var i = 0; i < keys.length; i++) {
        var val = (void 0), name = (void 0)
        if (i == keys.length - 1) {
          name = keys.join(" ")
          val = value
        } else {
          name = keys.slice(0, i + 1).join(" ")
          val = "..."
        }
        var prev = copy[name]
        if (!prev) { copy[name] = val }
        else if (prev != val) { throw new Error("Inconsistent bindings for " + name) }
      }
      delete keymap[keyname]
    } }
    for (var prop in copy) { keymap[prop] = copy[prop] }
    return keymap
  }

  function lookupKey(key, map, handle, context) {
    map = getKeyMap(map)
    var found = map.call ? map.call(key, context) : map[key]
    if (found === false) { return "nothing" }
    if (found === "...") { return "multi" }
    if (found != null && handle(found)) { return "handled" }

    if (map.fallthrough) {
      if (Object.prototype.toString.call(map.fallthrough) != "[object Array]")
        { return lookupKey(key, map.fallthrough, handle, context) }
      for (var i = 0; i < map.fallthrough.length; i++) {
        var result = lookupKey(key, map.fallthrough[i], handle, context)
        if (result) { return result }
      }
    }
  }

  // Modifier key presses don't count as 'real' key presses for the
  // purpose of keymap fallthrough.
  function isModifierKey(value) {
    var name = typeof value == "string" ? value : keyNames[value.keyCode]
    return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod"
  }

  function addModifierNames(name, event, noShift) {
    var base = name
    if (event.altKey && base != "Alt") { name = "Alt-" + name }
    if ((flipCtrlCmd ? event.metaKey : event.ctrlKey) && base != "Ctrl") { name = "Ctrl-" + name }
    if ((flipCtrlCmd ? event.ctrlKey : event.metaKey) && base != "Cmd") { name = "Cmd-" + name }
    if (!noShift && event.shiftKey && base != "Shift") { name = "Shift-" + name }
    return name
  }

  // Look up the name of a key as indicated by an event object.
  function keyName(event, noShift) {
    if (presto && event.keyCode == 34 && event["char"]) { return false }
    var name = keyNames[event.keyCode]
    if (name == null || event.altGraphKey) { return false }
    return addModifierNames(name, event, noShift)
  }

  function getKeyMap(val) {
    return typeof val == "string" ? keyMap[val] : val
  }

  // Helper for deleting text near the selection(s), used to implement
  // backspace, delete, and similar functionality.
  function deleteNearSelection(cm, compute) {
    var ranges = cm.doc.sel.ranges, kill = []
    // Build up a set of ranges to kill first, merging overlapping
    // ranges.
    for (var i = 0; i < ranges.length; i++) {
      var toKill = compute(ranges[i])
      while (kill.length && cmp(toKill.from, lst(kill).to) <= 0) {
        var replaced = kill.pop()
        if (cmp(replaced.from, toKill.from) < 0) {
          toKill.from = replaced.from
          break
        }
      }
      kill.push(toKill)
    }
    // Next, remove those actual ranges.
    runInOp(cm, function () {
      for (var i = kill.length - 1; i >= 0; i--)
        { replaceRange(cm.doc, "", kill[i].from, kill[i].to, "+delete") }
      ensureCursorVisible(cm)
    })
  }

  function moveCharLogically(line, ch, dir) {
    var target = skipExtendingChars(line.text, ch + dir, dir)
    return target < 0 || target > line.text.length ? null : target
  }

  function moveLogically(line, start, dir) {
    var ch = moveCharLogically(line, start.ch, dir)
    return ch == null ? null : new Pos(start.line, ch, dir < 0 ? "after" : "before")
  }

  function endOfLine(visually, cm, lineObj, lineNo, dir) {
    if (visually) {
      var order = getOrder(lineObj, cm.doc.direction)
      if (order) {
        var part = dir < 0 ? lst(order) : order[0]
        var moveInStorageOrder = (dir < 0) == (part.level == 1)
        var sticky = moveInStorageOrder ? "after" : "before"
        var ch
        // With a wrapped rtl chunk (possibly spanning multiple bidi parts),
        // it could be that the last bidi part is not on the last visual line,
        // since visual lines contain content order-consecutive chunks.
        // Thus, in rtl, we are looking for the first (content-order) character
        // in the rtl chunk that is on the last line (that is, the same line
        // as the last (content-order) character).
        if (part.level > 0 || cm.doc.direction == "rtl") {
          var prep = prepareMeasureForLine(cm, lineObj)
          ch = dir < 0 ? lineObj.text.length - 1 : 0
          var targetTop = measureCharPrepared(cm, prep, ch).top
          ch = findFirst(function (ch) { return measureCharPrepared(cm, prep, ch).top == targetTop; }, (dir < 0) == (part.level == 1) ? part.from : part.to - 1, ch)
          if (sticky == "before") { ch = moveCharLogically(lineObj, ch, 1) }
        } else { ch = dir < 0 ? part.to : part.from }
        return new Pos(lineNo, ch, sticky)
      }
    }
    return new Pos(lineNo, dir < 0 ? lineObj.text.length : 0, dir < 0 ? "before" : "after")
  }

  function moveVisually(cm, line, start, dir) {
    var bidi = getOrder(line, cm.doc.direction)
    if (!bidi) { return moveLogically(line, start, dir) }
    if (start.ch >= line.text.length) {
      start.ch = line.text.length
      start.sticky = "before"
    } else if (start.ch <= 0) {
      start.ch = 0
      start.sticky = "after"
    }
    var partPos = getBidiPartAt(bidi, start.ch, start.sticky), part = bidi[partPos]
    if (cm.doc.direction == "ltr" && part.level % 2 == 0 && (dir > 0 ? part.to > start.ch : part.from < start.ch)) {
      // Case 1: We move within an ltr part in an ltr editor. Even with wrapped lines,
      // nothing interesting happens.
      return moveLogically(line, start, dir)
    }

    var mv = function (pos, dir) { return moveCharLogically(line, pos instanceof Pos ? pos.ch : pos, dir); }
    var prep
    var getWrappedLineExtent = function (ch) {
      if (!cm.options.lineWrapping) { return {begin: 0, end: line.text.length} }
      prep = prep || prepareMeasureForLine(cm, line)
      return wrappedLineExtentChar(cm, line, prep, ch)
    }
    var wrappedLineExtent = getWrappedLineExtent(start.sticky == "before" ? mv(start, -1) : start.ch)

    if (cm.doc.direction == "rtl" || part.level == 1) {
      var moveInStorageOrder = (part.level == 1) == (dir < 0)
      var ch = mv(start, moveInStorageOrder ? 1 : -1)
      if (ch != null && (!moveInStorageOrder ? ch >= part.from && ch >= wrappedLineExtent.begin : ch <= part.to && ch <= wrappedLineExtent.end)) {
        // Case 2: We move within an rtl part or in an rtl editor on the same visual line
        var sticky = moveInStorageOrder ? "before" : "after"
        return new Pos(start.line, ch, sticky)
      }
    }

    // Case 3: Could not move within this bidi part in this visual line, so leave
    // the current bidi part

    var searchInVisualLine = function (partPos, dir, wrappedLineExtent) {
      var getRes = function (ch, moveInStorageOrder) { return moveInStorageOrder
        ? new Pos(start.line, mv(ch, 1), "before")
        : new Pos(start.line, ch, "after"); }

      for (; partPos >= 0 && partPos < bidi.length; partPos += dir) {
        var part = bidi[partPos]
        var moveInStorageOrder = (dir > 0) == (part.level != 1)
        var ch = moveInStorageOrder ? wrappedLineExtent.begin : mv(wrappedLineExtent.end, -1)
        if (part.from <= ch && ch < part.to) { return getRes(ch, moveInStorageOrder) }
        ch = moveInStorageOrder ? part.from : mv(part.to, -1)
        if (wrappedLineExtent.begin <= ch && ch < wrappedLineExtent.end) { return getRes(ch, moveInStorageOrder) }
      }
    }

    // Case 3a: Look for other bidi parts on the same visual line
    var res = searchInVisualLine(partPos + dir, dir, wrappedLineExtent)
    if (res) { return res }

    // Case 3b: Look for other bidi parts on the next visual line
    var nextCh = dir > 0 ? wrappedLineExtent.end : mv(wrappedLineExtent.begin, -1)
    if (nextCh != null && !(dir > 0 && nextCh == line.text.length)) {
      res = searchInVisualLine(dir > 0 ? 0 : bidi.length - 1, dir, getWrappedLineExtent(nextCh))
      if (res) { return res }
    }

    // Case 4: Nowhere to move
    return null
  }

  // Commands are parameter-less actions that can be performed on an
  // editor, mostly used for keybindings.
  var commands = {
    selectAll: selectAll,
    singleSelection: function (cm) { return cm.setSelection(cm.getCursor("anchor"), cm.getCursor("head"), sel_dontScroll); },
    killLine: function (cm) { return deleteNearSelection(cm, function (range) {
      if (range.empty()) {
        var len = getLine(cm.doc, range.head.line).text.length
        if (range.head.ch == len && range.head.line < cm.lastLine())
          { return {from: range.head, to: Pos(range.head.line + 1, 0)} }
        else
          { return {from: range.head, to: Pos(range.head.line, len)} }
      } else {
        return {from: range.from(), to: range.to()}
      }
    }); },
    deleteLine: function (cm) { return deleteNearSelection(cm, function (range) { return ({
      from: Pos(range.from().line, 0),
      to: clipPos(cm.doc, Pos(range.to().line + 1, 0))
    }); }); },
    delLineLeft: function (cm) { return deleteNearSelection(cm, function (range) { return ({
      from: Pos(range.from().line, 0), to: range.from()
    }); }); },
    delWrappedLineLeft: function (cm) { return deleteNearSelection(cm, function (range) {
      var top = cm.charCoords(range.head, "div").top + 5
      var leftPos = cm.coordsChar({left: 0, top: top}, "div")
      return {from: leftPos, to: range.from()}
    }); },
    delWrappedLineRight: function (cm) { return deleteNearSelection(cm, function (range) {
      var top = cm.charCoords(range.head, "div").top + 5
      var rightPos = cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div")
      return {from: range.from(), to: rightPos }
    }); },
    undo: function (cm) { return cm.undo(); },
    redo: function (cm) { return cm.redo(); },
    undoSelection: function (cm) { return cm.undoSelection(); },
    redoSelection: function (cm) { return cm.redoSelection(); },
    goDocStart: function (cm) { return cm.extendSelection(Pos(cm.firstLine(), 0)); },
    goDocEnd: function (cm) { return cm.extendSelection(Pos(cm.lastLine())); },
    goLineStart: function (cm) { return cm.extendSelectionsBy(function (range) { return lineStart(cm, range.head.line); },
      {origin: "+move", bias: 1}
    ); },
    goLineStartSmart: function (cm) { return cm.extendSelectionsBy(function (range) { return lineStartSmart(cm, range.head); },
      {origin: "+move", bias: 1}
    ); },
    goLineEnd: function (cm) { return cm.extendSelectionsBy(function (range) { return lineEnd(cm, range.head.line); },
      {origin: "+move", bias: -1}
    ); },
    goLineRight: function (cm) { return cm.extendSelectionsBy(function (range) {
      var top = cm.cursorCoords(range.head, "div").top + 5
      return cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div")
    }, sel_move); },
    goLineLeft: function (cm) { return cm.extendSelectionsBy(function (range) {
      var top = cm.cursorCoords(range.head, "div").top + 5
      return cm.coordsChar({left: 0, top: top}, "div")
    }, sel_move); },
    goLineLeftSmart: function (cm) { return cm.extendSelectionsBy(function (range) {
      var top = cm.cursorCoords(range.head, "div").top + 5
      var pos = cm.coordsChar({left: 0, top: top}, "div")
      if (pos.ch < cm.getLine(pos.line).search(/\S/)) { return lineStartSmart(cm, range.head) }
      return pos
    }, sel_move); },
    goLineUp: function (cm) { return cm.moveV(-1, "line"); },
    goLineDown: function (cm) { return cm.moveV(1, "line"); },
    goPageUp: function (cm) { return cm.moveV(-1, "page"); },
    goPageDown: function (cm) { return cm.moveV(1, "page"); },
    goCharLeft: function (cm) { return cm.moveH(-1, "char"); },
    goCharRight: function (cm) { return cm.moveH(1, "char"); },
    goColumnLeft: function (cm) { return cm.moveH(-1, "column"); },
    goColumnRight: function (cm) { return cm.moveH(1, "column"); },
    goWordLeft: function (cm) { return cm.moveH(-1, "word"); },
    goGroupRight: function (cm) { return cm.moveH(1, "group"); },
    goGroupLeft: function (cm) { return cm.moveH(-1, "group"); },
    goWordRight: function (cm) { return cm.moveH(1, "word"); },
    delCharBefore: function (cm) { return cm.deleteH(-1, "char"); },
    delCharAfter: function (cm) { return cm.deleteH(1, "char"); },
    delWordBefore: function (cm) { return cm.deleteH(-1, "word"); },
    delWordAfter: function (cm) { return cm.deleteH(1, "word"); },
    delGroupBefore: function (cm) { return cm.deleteH(-1, "group"); },
    delGroupAfter: function (cm) { return cm.deleteH(1, "group"); },
    indentAuto: function (cm) { return cm.indentSelection("smart"); },
    indentMore: function (cm) { return cm.indentSelection("add"); },
    indentLess: function (cm) { return cm.indentSelection("subtract"); },
    insertTab: function (cm) { return cm.replaceSelection("\t"); },
    insertSoftTab: function (cm) {
      var spaces = [], ranges = cm.listSelections(), tabSize = cm.options.tabSize
      for (var i = 0; i < ranges.length; i++) {
        var pos = ranges[i].from()
        var col = countColumn(cm.getLine(pos.line), pos.ch, tabSize)
        spaces.push(spaceStr(tabSize - col % tabSize))
      }
      cm.replaceSelections(spaces)
    },
    defaultTab: function (cm) {
      if (cm.somethingSelected()) { cm.indentSelection("add") }
      else { cm.execCommand("insertTab") }
    },
    // Swap the two chars left and right of each selection's head.
    // Move cursor behind the two swapped characters afterwards.
    //
    // Doesn't consider line feeds a character.
    // Doesn't scan more than one line above to find a character.
    // Doesn't do anything on an empty line.
    // Doesn't do anything with non-empty selections.
    transposeChars: function (cm) { return runInOp(cm, function () {
      var ranges = cm.listSelections(), newSel = []
      for (var i = 0; i < ranges.length; i++) {
        if (!ranges[i].empty()) { continue }
        var cur = ranges[i].head, line = getLine(cm.doc, cur.line).text
        if (line) {
          if (cur.ch == line.length) { cur = new Pos(cur.line, cur.ch - 1) }
          if (cur.ch > 0) {
            cur = new Pos(cur.line, cur.ch + 1)
            cm.replaceRange(line.charAt(cur.ch - 1) + line.charAt(cur.ch - 2),
                            Pos(cur.line, cur.ch - 2), cur, "+transpose")
          } else if (cur.line > cm.doc.first) {
            var prev = getLine(cm.doc, cur.line - 1).text
            if (prev) {
              cur = new Pos(cur.line, 1)
              cm.replaceRange(line.charAt(0) + cm.doc.lineSeparator() +
                              prev.charAt(prev.length - 1),
                              Pos(cur.line - 1, prev.length - 1), cur, "+transpose")
            }
          }
        }
        newSel.push(new Range(cur, cur))
      }
      cm.setSelections(newSel)
    }); },
    newlineAndIndent: function (cm) { return runInOp(cm, function () {
      var sels = cm.listSelections()
      for (var i = sels.length - 1; i >= 0; i--)
        { cm.replaceRange(cm.doc.lineSeparator(), sels[i].anchor, sels[i].head, "+input") }
      sels = cm.listSelections()
      for (var i$1 = 0; i$1 < sels.length; i$1++)
        { cm.indentLine(sels[i$1].from().line, null, true) }
      ensureCursorVisible(cm)
    }); },
    openLine: function (cm) { return cm.replaceSelection("\n", "start"); },
    toggleOverwrite: function (cm) { return cm.toggleOverwrite(); }
  }


  function lineStart(cm, lineN) {
    var line = getLine(cm.doc, lineN)
    var visual = visualLine(line)
    if (visual != line) { lineN = lineNo(visual) }
    return endOfLine(true, cm, visual, lineN, 1)
  }
  function lineEnd(cm, lineN) {
    var line = getLine(cm.doc, lineN)
    var visual = visualLineEnd(line)
    if (visual != line) { lineN = lineNo(visual) }
    return endOfLine(true, cm, line, lineN, -1)
  }
  function lineStartSmart(cm, pos) {
    var start = lineStart(cm, pos.line)
    var line = getLine(cm.doc, start.line)
    var order = getOrder(line, cm.doc.direction)
    if (!order || order[0].level == 0) {
      var firstNonWS = Math.max(0, line.text.search(/\S/))
      var inWS = pos.line == start.line && pos.ch <= firstNonWS && pos.ch
      return Pos(start.line, inWS ? 0 : firstNonWS, start.sticky)
    }
    return start
  }

  // Run a handler that was bound to a key.
  function doHandleBinding(cm, bound, dropShift) {
    if (typeof bound == "string") {
      bound = commands[bound]
      if (!bound) { return false }
    }
    // Ensure previous input has been read, so that the handler sees a
    // consistent view of the document
    cm.display.input.ensurePolled()
    var prevShift = cm.display.shift, done = false
    try {
      if (cm.isReadOnly()) { cm.state.suppressEdits = true }
      if (dropShift) { cm.display.shift = false }
      done = bound(cm) != Pass
    } finally {
      cm.display.shift = prevShift
      cm.state.suppressEdits = false
    }
    return done
  }

  function lookupKeyForEditor(cm, name, handle) {
    for (var i = 0; i < cm.state.keyMaps.length; i++) {
      var result = lookupKey(name, cm.state.keyMaps[i], handle, cm)
      if (result) { return result }
    }
    return (cm.options.extraKeys && lookupKey(name, cm.options.extraKeys, handle, cm))
      || lookupKey(name, cm.options.keyMap, handle, cm)
  }

  // Note that, despite the name, this function is also used to check
  // for bound mouse clicks.

  var stopSeq = new Delayed

  function dispatchKey(cm, name, e, handle) {
    var seq = cm.state.keySeq
    if (seq) {
      if (isModifierKey(name)) { return "handled" }
      if (/\'$/.test(name))
        { cm.state.keySeq = null }
      else
        { stopSeq.set(50, function () {
          if (cm.state.keySeq == seq) {
            cm.state.keySeq = null
            cm.display.input.reset()
          }
        }) }
      if (dispatchKeyInner(cm, seq + " " + name, e, handle)) { return true }
    }
    return dispatchKeyInner(cm, name, e, handle)
  }

  function dispatchKeyInner(cm, name, e, handle) {
    var result = lookupKeyForEditor(cm, name, handle)

    if (result == "multi")
      { cm.state.keySeq = name }
    if (result == "handled")
      { signalLater(cm, "keyHandled", cm, name, e) }

    if (result == "handled" || result == "multi") {
      e_preventDefault(e)
      restartBlink(cm)
    }

    return !!result
  }

  // Handle a key from the keydown event.
  function handleKeyBinding(cm, e) {
    var name = keyName(e, true)
    if (!name) { return false }

    if (e.shiftKey && !cm.state.keySeq) {
      // First try to resolve full name (including 'Shift-'). Failing
      // that, see if there is a cursor-motion command (starting with
      // 'go') bound to the keyname without 'Shift-'.
      return dispatchKey(cm, "Shift-" + name, e, function (b) { return doHandleBinding(cm, b, true); })
          || dispatchKey(cm, name, e, function (b) {
               if (typeof b == "string" ? /^go[A-Z]/.test(b) : b.motion)
                 { return doHandleBinding(cm, b) }
             })
    } else {
      return dispatchKey(cm, name, e, function (b) { return doHandleBinding(cm, b); })
    }
  }

  // Handle a key from the keypress event
  function handleCharBinding(cm, e, ch) {
    return dispatchKey(cm, "'" + ch + "'", e, function (b) { return doHandleBinding(cm, b, true); })
  }

  var lastStoppedKey = null
  function onKeyDown(e) {
    var cm = this
    cm.curOp.focus = activeElt()
    if (signalDOMEvent(cm, e)) { return }
    // IE does strange things with escape.
    if (ie && ie_version < 11 && e.keyCode == 27) { e.returnValue = false }
    var code = e.keyCode
    cm.display.shift = code == 16 || e.shiftKey
    var handled = handleKeyBinding(cm, e)
    if (presto) {
      lastStoppedKey = handled ? code : null
      // Opera has no cut event... we try to at least catch the key combo
      if (!handled && code == 88 && !hasCopyEvent && (mac ? e.metaKey : e.ctrlKey))
        { cm.replaceSelection("", null, "cut") }
    }

    // Turn mouse into crosshair when Alt is held on Mac.
    if (code == 18 && !/\bCodeMirror-crosshair\b/.test(cm.display.lineDiv.className))
      { showCrossHair(cm) }
  }

  function showCrossHair(cm) {
    var lineDiv = cm.display.lineDiv
    addClass(lineDiv, "CodeMirror-crosshair")

    function up(e) {
      if (e.keyCode == 18 || !e.altKey) {
        rmClass(lineDiv, "CodeMirror-crosshair")
        off(document, "keyup", up)
        off(document, "mouseover", up)
      }
    }
    on(document, "keyup", up)
    on(document, "mouseover", up)
  }

  function onKeyUp(e) {
    if (e.keyCode == 16) { this.doc.sel.shift = false }
    signalDOMEvent(this, e)
  }

  function onKeyPress(e) {
    var cm = this
    if (eventInWidget(cm.display, e) || signalDOMEvent(cm, e) || e.ctrlKey && !e.altKey || mac && e.metaKey) { return }
    var keyCode = e.keyCode, charCode = e.charCode
    if (presto && keyCode == lastStoppedKey) {lastStoppedKey = null; e_preventDefault(e); return}
    if ((presto && (!e.which || e.which < 10)) && handleKeyBinding(cm, e)) { return }
    var ch = String.fromCharCode(charCode == null ? keyCode : charCode)
    // Some browsers fire keypress events for backspace
    if (ch == "\x08") { return }
    if (handleCharBinding(cm, e, ch)) { return }
    cm.display.input.onKeyPress(e)
  }

  var DOUBLECLICK_DELAY = 400

  var PastClick = function(time, pos, button) {
    this.time = time
    this.pos = pos
    this.button = button
  };

  PastClick.prototype.compare = function (time, pos, button) {
    return this.time + DOUBLECLICK_DELAY > time &&
      cmp(pos, this.pos) == 0 && button == this.button
  };

  var lastClick;
  var lastDoubleClick;
  function clickRepeat(pos, button) {
    var now = +new Date
    if (lastDoubleClick && lastDoubleClick.compare(now, pos, button)) {
      lastClick = lastDoubleClick = null
      return "triple"
    } else if (lastClick && lastClick.compare(now, pos, button)) {
      lastDoubleClick = new PastClick(now, pos, button)
      lastClick = null
      return "double"
    } else {
      lastClick = new PastClick(now, pos, button)
      lastDoubleClick = null
      return "single"
    }
  }

  // A mouse down can be a single click, double click, triple click,
  // start of selection drag, start of text drag, new cursor
  // (ctrl-click), rectangle drag (alt-drag), or xwin
  // middle-click-paste. Or it might be a click on something we should
  // not interfere with, such as a scrollbar or widget.
  function onMouseDown(e) {
    var cm = this, display = cm.display
    if (signalDOMEvent(cm, e) || display.activeTouch && display.input.supportsTouch()) { return }
    display.input.ensurePolled()
    display.shift = e.shiftKey

    if (eventInWidget(display, e)) {
      if (!webkit) {
        // Briefly turn off draggability, to allow widgets to do
        // normal dragging things.
        display.scroller.draggable = false
        setTimeout(function () { return display.scroller.draggable = true; }, 100)
      }
      return
    }
    if (clickInGutter(cm, e)) { return }
    var pos = posFromMouse(cm, e), button = e_button(e), repeat = pos ? clickRepeat(pos, button) : "single"
    window.focus()

    // #3261: make sure, that we're not starting a second selection
    if (button == 1 && cm.state.selectingText)
      { cm.state.selectingText(e) }

    if (pos && handleMappedButton(cm, button, pos, repeat, e)) { return }

    if (button == 1) {
      if (pos) { leftButtonDown(cm, pos, repeat, e) }
      else if (e_target(e) == display.scroller) { e_preventDefault(e) }
    } else if (button == 2) {
      if (pos) { extendSelection(cm.doc, pos) }
      setTimeout(function () { return display.input.focus(); }, 20)
    } else if (button == 3) {
      if (captureRightClick) { onContextMenu(cm, e) }
      else { delayBlurEvent(cm) }
    }
  }

  function handleMappedButton(cm, button, pos, repeat, event) {
    var name = "Click"
    if (repeat == "double") { name = "Double" + name }
    else if (repeat == "triple") { name = "Triple" + name }
    name = (button == 1 ? "Left" : button == 2 ? "Middle" : "Right") + name

    return dispatchKey(cm,  addModifierNames(name, event), event, function (bound) {
      if (typeof bound == "string") { bound = commands[bound] }
      if (!bound) { return false }
      var done = false
      try {
        if (cm.isReadOnly()) { cm.state.suppressEdits = true }
        done = bound(cm, pos) != Pass
      } finally {
        cm.state.suppressEdits = false
      }
      return done
    })
  }

  function configureMouse(cm, repeat, event) {
    var option = cm.getOption("configureMouse")
    var value = option ? option(cm, repeat, event) : {}
    if (value.unit == null) {
      var rect = chromeOS ? event.shiftKey && event.metaKey : event.altKey
      value.unit = rect ? "rectangle" : repeat == "single" ? "char" : repeat == "double" ? "word" : "line"
    }
    if (value.extend == null || cm.doc.extend) { value.extend = cm.doc.extend || event.shiftKey }
    if (value.addNew == null) { value.addNew = mac ? event.metaKey : event.ctrlKey }
    if (value.moveOnDrag == null) { value.moveOnDrag = !(mac ? event.altKey : event.ctrlKey) }
    return value
  }

  function leftButtonDown(cm, pos, repeat, event) {
    if (ie) { setTimeout(bind(ensureFocus, cm), 0) }
    else { cm.curOp.focus = activeElt() }

    var behavior = configureMouse(cm, repeat, event)

    var sel = cm.doc.sel, contained
    if (cm.options.dragDrop && dragAndDrop && !cm.isReadOnly() &&
        repeat == "single" && (contained = sel.contains(pos)) > -1 &&
        (cmp((contained = sel.ranges[contained]).from(), pos) < 0 || pos.xRel > 0) &&
        (cmp(contained.to(), pos) > 0 || pos.xRel < 0))
      { leftButtonStartDrag(cm, event, pos, behavior) }
    else
      { leftButtonSelect(cm, event, pos, behavior) }
  }

  // Start a text drag. When it ends, see if any dragging actually
  // happen, and treat as a click if it didn't.
  function leftButtonStartDrag(cm, event, pos, behavior) {
    var display = cm.display, moved = false
    var dragEnd = operation(cm, function (e) {
      if (webkit) { display.scroller.draggable = false }
      cm.state.draggingText = false
      off(document, "mouseup", dragEnd)
      off(document, "mousemove", mouseMove)
      off(display.scroller, "dragstart", dragStart)
      off(display.scroller, "drop", dragEnd)
      if (!moved) {
        e_preventDefault(e)
        if (!behavior.addNew)
          { extendSelection(cm.doc, pos, null, null, behavior.extend) }
        // Work around unexplainable focus problem in IE9 (#2127) and Chrome (#3081)
        if (webkit || ie && ie_version == 9)
          { setTimeout(function () {document.body.focus(); display.input.focus()}, 20) }
        else
          { display.input.focus() }
      }
    })
    var mouseMove = function(e2) {
      moved = moved || Math.abs(event.clientX - e2.clientX) + Math.abs(event.clientY - e2.clientY) >= 10
    }
    var dragStart = function () { return moved = true; }
    // Let the drag handler handle this.
    if (webkit) { display.scroller.draggable = true }
    cm.state.draggingText = dragEnd
    dragEnd.copy = !behavior.moveOnDrag
    // IE's approach to draggable
    if (display.scroller.dragDrop) { display.scroller.dragDrop() }
    on(document, "mouseup", dragEnd)
    on(document, "mousemove", mouseMove)
    on(display.scroller, "dragstart", dragStart)
    on(display.scroller, "drop", dragEnd)

    delayBlurEvent(cm)
    setTimeout(function () { return display.input.focus(); }, 20)
  }

  function rangeForUnit(cm, pos, unit) {
    if (unit == "char") { return new Range(pos, pos) }
    if (unit == "word") { return cm.findWordAt(pos) }
    if (unit == "line") { return new Range(Pos(pos.line, 0), clipPos(cm.doc, Pos(pos.line + 1, 0))) }
    var result = unit(cm, pos)
    return new Range(result.from, result.to)
  }

  // Normal selection, as opposed to text dragging.
  function leftButtonSelect(cm, event, start, behavior) {
    var display = cm.display, doc = cm.doc
    e_preventDefault(event)

    var ourRange, ourIndex, startSel = doc.sel, ranges = startSel.ranges
    if (behavior.addNew && !behavior.extend) {
      ourIndex = doc.sel.contains(start)
      if (ourIndex > -1)
        { ourRange = ranges[ourIndex] }
      else
        { ourRange = new Range(start, start) }
    } else {
      ourRange = doc.sel.primary()
      ourIndex = doc.sel.primIndex
    }

    if (behavior.unit == "rectangle") {
      if (!behavior.addNew) { ourRange = new Range(start, start) }
      start = posFromMouse(cm, event, true, true)
      ourIndex = -1
    } else {
      var range = rangeForUnit(cm, start, behavior.unit)
      if (behavior.extend)
        { ourRange = extendRange(ourRange, range.anchor, range.head, behavior.extend) }
      else
        { ourRange = range }
    }

    if (!behavior.addNew) {
      ourIndex = 0
      setSelection(doc, new Selection([ourRange], 0), sel_mouse)
      startSel = doc.sel
    } else if (ourIndex == -1) {
      ourIndex = ranges.length
      setSelection(doc, normalizeSelection(ranges.concat([ourRange]), ourIndex),
                   {scroll: false, origin: "*mouse"})
    } else if (ranges.length > 1 && ranges[ourIndex].empty() && behavior.unit == "char" && !behavior.extend) {
      setSelection(doc, normalizeSelection(ranges.slice(0, ourIndex).concat(ranges.slice(ourIndex + 1)), 0),
                   {scroll: false, origin: "*mouse"})
      startSel = doc.sel
    } else {
      replaceOneSelection(doc, ourIndex, ourRange, sel_mouse)
    }

    var lastPos = start
    function extendTo(pos) {
      if (cmp(lastPos, pos) == 0) { return }
      lastPos = pos

      if (behavior.unit == "rectangle") {
        var ranges = [], tabSize = cm.options.tabSize
        var startCol = countColumn(getLine(doc, start.line).text, start.ch, tabSize)
        var posCol = countColumn(getLine(doc, pos.line).text, pos.ch, tabSize)
        var left = Math.min(startCol, posCol), right = Math.max(startCol, posCol)
        for (var line = Math.min(start.line, pos.line), end = Math.min(cm.lastLine(), Math.max(start.line, pos.line));
             line <= end; line++) {
          var text = getLine(doc, line).text, leftPos = findColumn(text, left, tabSize)
          if (left == right)
            { ranges.push(new Range(Pos(line, leftPos), Pos(line, leftPos))) }
          else if (text.length > leftPos)
            { ranges.push(new Range(Pos(line, leftPos), Pos(line, findColumn(text, right, tabSize)))) }
        }
        if (!ranges.length) { ranges.push(new Range(start, start)) }
        setSelection(doc, normalizeSelection(startSel.ranges.slice(0, ourIndex).concat(ranges), ourIndex),
                     {origin: "*mouse", scroll: false})
        cm.scrollIntoView(pos)
      } else {
        var oldRange = ourRange
        var range = rangeForUnit(cm, pos, behavior.unit)
        var anchor = oldRange.anchor, head
        if (cmp(range.anchor, anchor) > 0) {
          head = range.head
          anchor = minPos(oldRange.from(), range.anchor)
        } else {
          head = range.anchor
          anchor = maxPos(oldRange.to(), range.head)
        }
        var ranges$1 = startSel.ranges.slice(0)
        ranges$1[ourIndex] = bidiSimplify(cm, new Range(clipPos(doc, anchor), head))
        setSelection(doc, normalizeSelection(ranges$1, ourIndex), sel_mouse)
      }
    }

    var editorSize = display.wrapper.getBoundingClientRect()
    // Used to ensure timeout re-tries don't fire when another extend
    // happened in the meantime (clearTimeout isn't reliable -- at
    // least on Chrome, the timeouts still happen even when cleared,
    // if the clear happens after their scheduled firing time).
    var counter = 0

    function extend(e) {
      var curCount = ++counter
      var cur = posFromMouse(cm, e, true, behavior.unit == "rectangle")
      if (!cur) { return }
      if (cmp(cur, lastPos) != 0) {
        cm.curOp.focus = activeElt()
        extendTo(cur)
        var visible = visibleLines(display, doc)
        if (cur.line >= visible.to || cur.line < visible.from)
          { setTimeout(operation(cm, function () {if (counter == curCount) { extend(e) }}), 150) }
      } else {
        var outside = e.clientY < editorSize.top ? -20 : e.clientY > editorSize.bottom ? 20 : 0
        if (outside) { setTimeout(operation(cm, function () {
          if (counter != curCount) { return }
          display.scroller.scrollTop += outside
          extend(e)
        }), 50) }
      }
    }

    function done(e) {
      cm.state.selectingText = false
      counter = Infinity
      e_preventDefault(e)
      display.input.focus()
      off(document, "mousemove", move)
      off(document, "mouseup", up)
      doc.history.lastSelOrigin = null
    }

    var move = operation(cm, function (e) {
      if (!e_button(e)) { done(e) }
      else { extend(e) }
    })
    var up = operation(cm, done)
    cm.state.selectingText = up
    on(document, "mousemove", move)
    on(document, "mouseup", up)
  }

  // Used when mouse-selecting to adjust the anchor to the proper side
  // of a bidi jump depending on the visual position of the head.
  function bidiSimplify(cm, range) {
    var anchor = range.anchor;
    var head = range.head;
    var anchorLine = getLine(cm.doc, anchor.line)
    if (cmp(anchor, head) == 0 && anchor.sticky == head.sticky) { return range }
    var order = getOrder(anchorLine)
    if (!order) { return range }
    var index = getBidiPartAt(order, anchor.ch, anchor.sticky), part = order[index]
    if (part.from != anchor.ch && part.to != anchor.ch) { return range }
    var boundary = index + ((part.from == anchor.ch) == (part.level != 1) ? 0 : 1)
    if (boundary == 0 || boundary == order.length) { return range }

    // Compute the relative visual position of the head compared to the
    // anchor (<0 is to the left, >0 to the right)
    var leftSide
    if (head.line != anchor.line) {
      leftSide = (head.line - anchor.line) * (cm.doc.direction == "ltr" ? 1 : -1) > 0
    } else {
      var headIndex = getBidiPartAt(order, head.ch, head.sticky)
      var dir = headIndex - index || (head.ch - anchor.ch) * (part.level == 1 ? -1 : 1)
      if (headIndex == boundary - 1 || headIndex == boundary)
        { leftSide = dir < 0 }
      else
        { leftSide = dir > 0 }
    }

    var usePart = order[boundary + (leftSide ? -1 : 0)]
    var from = leftSide == (usePart.level == 1)
    var ch = from ? usePart.from : usePart.to, sticky = from ? "after" : "before"
    return anchor.ch == ch && anchor.sticky == sticky ? range : new Range(new Pos(anchor.line, ch, sticky), head)
  }


  // Determines whether an event happened in the gutter, and fires the
  // handlers for the corresponding event.
  function gutterEvent(cm, e, type, prevent) {
    var mX, mY
    if (e.touches) {
      mX = e.touches[0].clientX
      mY = e.touches[0].clientY
    } else {
      try { mX = e.clientX; mY = e.clientY }
      catch(e) { return false }
    }
    if (mX >= Math.floor(cm.display.gutters.getBoundingClientRect().right)) { return false }
    if (prevent) { e_preventDefault(e) }

    var display = cm.display
    var lineBox = display.lineDiv.getBoundingClientRect()

    if (mY > lineBox.bottom || !hasHandler(cm, type)) { return e_defaultPrevented(e) }
    mY -= lineBox.top - display.viewOffset

    for (var i = 0; i < cm.options.gutters.length; ++i) {
      var g = display.gutters.childNodes[i]
      if (g && g.getBoundingClientRect().right >= mX) {
        var line = lineAtHeight(cm.doc, mY)
        var gutter = cm.options.gutters[i]
        signal(cm, type, cm, line, gutter, e)
        return e_defaultPrevented(e)
      }
    }
  }

  function clickInGutter(cm, e) {
    return gutterEvent(cm, e, "gutterClick", true)
  }

  // CONTEXT MENU HANDLING

  // To make the context menu work, we need to briefly unhide the
  // textarea (making it as unobtrusive as possible) to let the
  // right-click take effect on it.
  function onContextMenu(cm, e) {
    if (eventInWidget(cm.display, e) || contextMenuInGutter(cm, e)) { return }
    if (signalDOMEvent(cm, e, "contextmenu")) { return }
    cm.display.input.onContextMenu(e)
  }

  function contextMenuInGutter(cm, e) {
    if (!hasHandler(cm, "gutterContextMenu")) { return false }
    return gutterEvent(cm, e, "gutterContextMenu", false)
  }

  function themeChanged(cm) {
    cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-s-\S+/g, "") +
      cm.options.theme.replace(/(^|\s)\s*/g, " cm-s-")
    clearCaches(cm)
  }

  var Init = {toString: function(){return "CodeMirror.Init"}}

  var defaults = {}
  var optionHandlers = {}

  function defineOptions(CodeMirror) {
    var optionHandlers = CodeMirror.optionHandlers

    function option(name, deflt, handle, notOnInit) {
      CodeMirror.defaults[name] = deflt
      if (handle) { optionHandlers[name] =
        notOnInit ? function (cm, val, old) {if (old != Init) { handle(cm, val, old) }} : handle }
    }

    CodeMirror.defineOption = option

    // Passed to option handlers when there is no old value.
    CodeMirror.Init = Init

    // These two are, on init, called from the constructor because they
    // have to be initialized before the editor can start at all.
    option("value", "", function (cm, val) { return cm.setValue(val); }, true)
    option("mode", null, function (cm, val) {
      cm.doc.modeOption = val
      loadMode(cm)
    }, true)

    option("indentUnit", 2, loadMode, true)
    option("indentWithTabs", false)
    option("smartIndent", true)
    option("tabSize", 4, function (cm) {
      resetModeState(cm)
      clearCaches(cm)
      regChange(cm)
    }, true)
    option("lineSeparator", null, function (cm, val) {
      cm.doc.lineSep = val
      if (!val) { return }
      var newBreaks = [], lineNo = cm.doc.first
      cm.doc.iter(function (line) {
        for (var pos = 0;;) {
          var found = line.text.indexOf(val, pos)
          if (found == -1) { break }
          pos = found + val.length
          newBreaks.push(Pos(lineNo, found))
        }
        lineNo++
      })
      for (var i = newBreaks.length - 1; i >= 0; i--)
        { replaceRange(cm.doc, val, newBreaks[i], Pos(newBreaks[i].line, newBreaks[i].ch + val.length)) }
    })
    option("specialChars", /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff]/g, function (cm, val, old) {
      cm.state.specialChars = new RegExp(val.source + (val.test("\t") ? "" : "|\t"), "g")
      if (old != Init) { cm.refresh() }
    })
    option("specialCharPlaceholder", defaultSpecialCharPlaceholder, function (cm) { return cm.refresh(); }, true)
    option("electricChars", true)
    option("inputStyle", mobile ? "contenteditable" : "textarea", function () {
      throw new Error("inputStyle can not (yet) be changed in a running editor") // FIXME
    }, true)
    option("spellcheck", false, function (cm, val) { return cm.getInputField().spellcheck = val; }, true)
    option("rtlMoveVisually", !windows)
    option("wholeLineUpdateBefore", true)

    option("theme", "default", function (cm) {
      themeChanged(cm)
      guttersChanged(cm)
    }, true)
    option("keyMap", "default", function (cm, val, old) {
      var next = getKeyMap(val)
      var prev = old != Init && getKeyMap(old)
      if (prev && prev.detach) { prev.detach(cm, next) }
      if (next.attach) { next.attach(cm, prev || null) }
    })
    option("extraKeys", null)
    option("configureMouse", null)

    option("lineWrapping", false, wrappingChanged, true)
    option("gutters", [], function (cm) {
      setGuttersForLineNumbers(cm.options)
      guttersChanged(cm)
    }, true)
    option("fixedGutter", true, function (cm, val) {
      cm.display.gutters.style.left = val ? compensateForHScroll(cm.display) + "px" : "0"
      cm.refresh()
    }, true)
    option("coverGutterNextToScrollbar", false, function (cm) { return updateScrollbars(cm); }, true)
    option("scrollbarStyle", "native", function (cm) {
      initScrollbars(cm)
      updateScrollbars(cm)
      cm.display.scrollbars.setScrollTop(cm.doc.scrollTop)
      cm.display.scrollbars.setScrollLeft(cm.doc.scrollLeft)
    }, true)
    option("lineNumbers", false, function (cm) {
      setGuttersForLineNumbers(cm.options)
      guttersChanged(cm)
    }, true)
    option("firstLineNumber", 1, guttersChanged, true)
    option("lineNumberFormatter", function (integer) { return integer; }, guttersChanged, true)
    option("showCursorWhenSelecting", false, updateSelection, true)

    option("resetSelectionOnContextMenu", true)
    option("lineWiseCopyCut", true)
    option("pasteLinesPerSelection", true)

    option("readOnly", false, function (cm, val) {
      if (val == "nocursor") {
        onBlur(cm)
        cm.display.input.blur()
      }
      cm.display.input.readOnlyChanged(val)
    })
    option("disableInput", false, function (cm, val) {if (!val) { cm.display.input.reset() }}, true)
    option("dragDrop", true, dragDropChanged)
    option("allowDropFileTypes", null)

    option("cursorBlinkRate", 530)
    option("cursorScrollMargin", 0)
    option("cursorHeight", 1, updateSelection, true)
    option("singleCursorHeightPerLine", true, updateSelection, true)
    option("workTime", 100)
    option("workDelay", 100)
    option("flattenSpans", true, resetModeState, true)
    option("addModeClass", false, resetModeState, true)
    option("pollInterval", 100)
    option("undoDepth", 200, function (cm, val) { return cm.doc.history.undoDepth = val; })
    option("historyEventDelay", 1250)
    option("viewportMargin", 10, function (cm) { return cm.refresh(); }, true)
    option("maxHighlightLength", 10000, resetModeState, true)
    option("moveInputWithCursor", true, function (cm, val) {
      if (!val) { cm.display.input.resetPosition() }
    })

    option("tabindex", null, function (cm, val) { return cm.display.input.getField().tabIndex = val || ""; })
    option("autofocus", null)
    option("direction", "ltr", function (cm, val) { return cm.doc.setDirection(val); }, true)
  }

  function guttersChanged(cm) {
    updateGutters(cm)
    regChange(cm)
    alignHorizontally(cm)
  }

  function dragDropChanged(cm, value, old) {
    var wasOn = old && old != Init
    if (!value != !wasOn) {
      var funcs = cm.display.dragFunctions
      var toggle = value ? on : off
      toggle(cm.display.scroller, "dragstart", funcs.start)
      toggle(cm.display.scroller, "dragenter", funcs.enter)
      toggle(cm.display.scroller, "dragover", funcs.over)
      toggle(cm.display.scroller, "dragleave", funcs.leave)
      toggle(cm.display.scroller, "drop", funcs.drop)
    }
  }

  function wrappingChanged(cm) {
    if (cm.options.lineWrapping) {
      addClass(cm.display.wrapper, "CodeMirror-wrap")
      cm.display.sizer.style.minWidth = ""
      cm.display.sizerWidth = null
    } else {
      rmClass(cm.display.wrapper, "CodeMirror-wrap")
      findMaxLine(cm)
    }
    estimateLineHeights(cm)
    regChange(cm)
    clearCaches(cm)
    setTimeout(function () { return updateScrollbars(cm); }, 100)
  }

  // A CodeMirror instance represents an editor. This is the object
  // that user code is usually dealing with.

  function CodeMirror(place, options) {
    var this$1 = this;

    if (!(this instanceof CodeMirror)) { return new CodeMirror(place, options) }

    this.options = options = options ? copyObj(options) : {}
    // Determine effective options based on given values and defaults.
    copyObj(defaults, options, false)
    setGuttersForLineNumbers(options)

    var doc = options.value
    if (typeof doc == "string") { doc = new Doc(doc, options.mode, null, options.lineSeparator, options.direction) }
    this.doc = doc

    var input = new CodeMirror.inputStyles[options.inputStyle](this)
    var display = this.display = new Display(place, doc, input)
    display.wrapper.CodeMirror = this
    updateGutters(this)
    themeChanged(this)
    if (options.lineWrapping)
      { this.display.wrapper.className += " CodeMirror-wrap" }
    initScrollbars(this)

    this.state = {
      keyMaps: [],  // stores maps added by addKeyMap
      overlays: [], // highlighting overlays, as added by addOverlay
      modeGen: 0,   // bumped when mode/overlay changes, used to invalidate highlighting info
      overwrite: false,
      delayingBlurEvent: false,
      focused: false,
      suppressEdits: false, // used to disable editing during key handlers when in readOnly mode
      pasteIncoming: false, cutIncoming: false, // help recognize paste/cut edits in input.poll
      selectingText: false,
      draggingText: false,
      highlight: new Delayed(), // stores highlight worker timeout
      keySeq: null,  // Unfinished key sequence
      specialChars: null
    }

    if (options.autofocus && !mobile) { display.input.focus() }

    // Override magic textarea content restore that IE sometimes does
    // on our hidden textarea on reload
    if (ie && ie_version < 11) { setTimeout(function () { return this$1.display.input.reset(true); }, 20) }

    registerEventHandlers(this)
    ensureGlobalHandlers()

    startOperation(this)
    this.curOp.forceUpdate = true
    attachDoc(this, doc)

    if ((options.autofocus && !mobile) || this.hasFocus())
      { setTimeout(bind(onFocus, this), 20) }
    else
      { onBlur(this) }

    for (var opt in optionHandlers) { if (optionHandlers.hasOwnProperty(opt))
      { optionHandlers[opt](this$1, options[opt], Init) } }
    maybeUpdateLineNumberWidth(this)
    if (options.finishInit) { options.finishInit(this) }
    for (var i = 0; i < initHooks.length; ++i) { initHooks[i](this$1) }
    endOperation(this)
    // Suppress optimizelegibility in Webkit, since it breaks text
    // measuring on line wrapping boundaries.
    if (webkit && options.lineWrapping &&
        getComputedStyle(display.lineDiv).textRendering == "optimizelegibility")
      { display.lineDiv.style.textRendering = "auto" }
  }

  // The default configuration options.
  CodeMirror.defaults = defaults
  // Functions to run when options are changed.
  CodeMirror.optionHandlers = optionHandlers

  // Attach the necessary event handlers when initializing the editor
  function registerEventHandlers(cm) {
    var d = cm.display
    on(d.scroller, "mousedown", operation(cm, onMouseDown))
    // Older IE's will not fire a second mousedown for a double click
    if (ie && ie_version < 11)
      { on(d.scroller, "dblclick", operation(cm, function (e) {
        if (signalDOMEvent(cm, e)) { return }
        var pos = posFromMouse(cm, e)
        if (!pos || clickInGutter(cm, e) || eventInWidget(cm.display, e)) { return }
        e_preventDefault(e)
        var word = cm.findWordAt(pos)
        extendSelection(cm.doc, word.anchor, word.head)
      })) }
    else
      { on(d.scroller, "dblclick", function (e) { return signalDOMEvent(cm, e) || e_preventDefault(e); }) }
    // Some browsers fire contextmenu *after* opening the menu, at
    // which point we can't mess with it anymore. Context menu is
    // handled in onMouseDown for these browsers.
    if (!captureRightClick) { on(d.scroller, "contextmenu", function (e) { return onContextMenu(cm, e); }) }

    // Used to suppress mouse event handling when a touch happens
    var touchFinished, prevTouch = {end: 0}
    function finishTouch() {
      if (d.activeTouch) {
        touchFinished = setTimeout(function () { return d.activeTouch = null; }, 1000)
        prevTouch = d.activeTouch
        prevTouch.end = +new Date
      }
    }
    function isMouseLikeTouchEvent(e) {
      if (e.touches.length != 1) { return false }
      var touch = e.touches[0]
      return touch.radiusX <= 1 && touch.radiusY <= 1
    }
    function farAway(touch, other) {
      if (other.left == null) { return true }
      var dx = other.left - touch.left, dy = other.top - touch.top
      return dx * dx + dy * dy > 20 * 20
    }
    on(d.scroller, "touchstart", function (e) {
      if (!signalDOMEvent(cm, e) && !isMouseLikeTouchEvent(e) && !clickInGutter(cm, e)) {
        d.input.ensurePolled()
        clearTimeout(touchFinished)
        var now = +new Date
        d.activeTouch = {start: now, moved: false,
                         prev: now - prevTouch.end <= 300 ? prevTouch : null}
        if (e.touches.length == 1) {
          d.activeTouch.left = e.touches[0].pageX
          d.activeTouch.top = e.touches[0].pageY
        }
      }
    })
    on(d.scroller, "touchmove", function () {
      if (d.activeTouch) { d.activeTouch.moved = true }
    })
    on(d.scroller, "touchend", function (e) {
      var touch = d.activeTouch
      if (touch && !eventInWidget(d, e) && touch.left != null &&
          !touch.moved && new Date - touch.start < 300) {
        var pos = cm.coordsChar(d.activeTouch, "page"), range
        if (!touch.prev || farAway(touch, touch.prev)) // Single tap
          { range = new Range(pos, pos) }
        else if (!touch.prev.prev || farAway(touch, touch.prev.prev)) // Double tap
          { range = cm.findWordAt(pos) }
        else // Triple tap
          { range = new Range(Pos(pos.line, 0), clipPos(cm.doc, Pos(pos.line + 1, 0))) }
        cm.setSelection(range.anchor, range.head)
        cm.focus()
        e_preventDefault(e)
      }
      finishTouch()
    })
    on(d.scroller, "touchcancel", finishTouch)

    // Sync scrolling between fake scrollbars and real scrollable
    // area, ensure viewport is updated when scrolling.
    on(d.scroller, "scroll", function () {
      if (d.scroller.clientHeight) {
        updateScrollTop(cm, d.scroller.scrollTop)
        setScrollLeft(cm, d.scroller.scrollLeft, true)
        signal(cm, "scroll", cm)
      }
    })

    // Listen to wheel events in order to try and update the viewport on time.
    on(d.scroller, "mousewheel", function (e) { return onScrollWheel(cm, e); })
    on(d.scroller, "DOMMouseScroll", function (e) { return onScrollWheel(cm, e); })

    // Prevent wrapper from ever scrolling
    on(d.wrapper, "scroll", function () { return d.wrapper.scrollTop = d.wrapper.scrollLeft = 0; })

    d.dragFunctions = {
      enter: function (e) {if (!signalDOMEvent(cm, e)) { e_stop(e) }},
      over: function (e) {if (!signalDOMEvent(cm, e)) { onDragOver(cm, e); e_stop(e) }},
      start: function (e) { return onDragStart(cm, e); },
      drop: operation(cm, onDrop),
      leave: function (e) {if (!signalDOMEvent(cm, e)) { clearDragCursor(cm) }}
    }

    var inp = d.input.getField()
    on(inp, "keyup", function (e) { return onKeyUp.call(cm, e); })
    on(inp, "keydown", operation(cm, onKeyDown))
    on(inp, "keypress", operation(cm, onKeyPress))
    on(inp, "focus", function (e) { return onFocus(cm, e); })
    on(inp, "blur", function (e) { return onBlur(cm, e); })
  }

  var initHooks = []
  CodeMirror.defineInitHook = function (f) { return initHooks.push(f); }

  // Indent the given line. The how parameter can be "smart",
  // "add"/null, "subtract", or "prev". When aggressive is false
  // (typically set to true for forced single-line indents), empty
  // lines are not indented, and places where the mode returns Pass
  // are left alone.
  function indentLine(cm, n, how, aggressive) {
    var doc = cm.doc, state
    if (how == null) { how = "add" }
    if (how == "smart") {
      // Fall back to "prev" when the mode doesn't have an indentation
      // method.
      if (!doc.mode.indent) { how = "prev" }
      else { state = getContextBefore(cm, n).state }
    }

    var tabSize = cm.options.tabSize
    var line = getLine(doc, n), curSpace = countColumn(line.text, null, tabSize)
    if (line.stateAfter) { line.stateAfter = null }
    var curSpaceString = line.text.match(/^\s*/)[0], indentation
    if (!aggressive && !/\S/.test(line.text)) {
      indentation = 0
      how = "not"
    } else if (how == "smart") {
      indentation = doc.mode.indent(state, line.text.slice(curSpaceString.length), line.text)
      if (indentation == Pass || indentation > 150) {
        if (!aggressive) { return }
        how = "prev"
      }
    }
    if (how == "prev") {
      if (n > doc.first) { indentation = countColumn(getLine(doc, n-1).text, null, tabSize) }
      else { indentation = 0 }
    } else if (how == "add") {
      indentation = curSpace + cm.options.indentUnit
    } else if (how == "subtract") {
      indentation = curSpace - cm.options.indentUnit
    } else if (typeof how == "number") {
      indentation = curSpace + how
    }
    indentation = Math.max(0, indentation)

    var indentString = "", pos = 0
    if (cm.options.indentWithTabs)
      { for (var i = Math.floor(indentation / tabSize); i; --i) {pos += tabSize; indentString += "\t"} }
    if (pos < indentation) { indentString += spaceStr(indentation - pos) }

    if (indentString != curSpaceString) {
      replaceRange(doc, indentString, Pos(n, 0), Pos(n, curSpaceString.length), "+input")
      line.stateAfter = null
      return true
    } else {
      // Ensure that, if the cursor was in the whitespace at the start
      // of the line, it is moved to the end of that space.
      for (var i$1 = 0; i$1 < doc.sel.ranges.length; i$1++) {
        var range = doc.sel.ranges[i$1]
        if (range.head.line == n && range.head.ch < curSpaceString.length) {
          var pos$1 = Pos(n, curSpaceString.length)
          replaceOneSelection(doc, i$1, new Range(pos$1, pos$1))
          break
        }
      }
    }
  }

  // This will be set to a {lineWise: bool, text: [string]} object, so
  // that, when pasting, we know what kind of selections the copied
  // text was made out of.
  var lastCopied = null

  function setLastCopied(newLastCopied) {
    lastCopied = newLastCopied
  }

  function applyTextInput(cm, inserted, deleted, sel, origin) {
    var doc = cm.doc
    cm.display.shift = false
    if (!sel) { sel = doc.sel }

    var paste = cm.state.pasteIncoming || origin == "paste"
    var textLines = splitLinesAuto(inserted), multiPaste = null
    // When pasing N lines into N selections, insert one line per selection
    if (paste && sel.ranges.length > 1) {
      if (lastCopied && lastCopied.text.join("\n") == inserted) {
        if (sel.ranges.length % lastCopied.text.length == 0) {
          multiPaste = []
          for (var i = 0; i < lastCopied.text.length; i++)
            { multiPaste.push(doc.splitLines(lastCopied.text[i])) }
        }
      } else if (textLines.length == sel.ranges.length && cm.options.pasteLinesPerSelection) {
        multiPaste = map(textLines, function (l) { return [l]; })
      }
    }

    var updateInput
    // Normal behavior is to insert the new text into every selection
    for (var i$1 = sel.ranges.length - 1; i$1 >= 0; i$1--) {
      var range = sel.ranges[i$1]
      var from = range.from(), to = range.to()
      if (range.empty()) {
        if (deleted && deleted > 0) // Handle deletion
          { from = Pos(from.line, from.ch - deleted) }
        else if (cm.state.overwrite && !paste) // Handle overwrite
          { to = Pos(to.line, Math.min(getLine(doc, to.line).text.length, to.ch + lst(textLines).length)) }
        else if (lastCopied && lastCopied.lineWise && lastCopied.text.join("\n") == inserted)
          { from = to = Pos(from.line, 0) }
      }
      updateInput = cm.curOp.updateInput
      var changeEvent = {from: from, to: to, text: multiPaste ? multiPaste[i$1 % multiPaste.length] : textLines,
                         origin: origin || (paste ? "paste" : cm.state.cutIncoming ? "cut" : "+input")}
      makeChange(cm.doc, changeEvent)
      signalLater(cm, "inputRead", cm, changeEvent)
    }
    if (inserted && !paste)
      { triggerElectric(cm, inserted) }

    ensureCursorVisible(cm)
    cm.curOp.updateInput = updateInput
    cm.curOp.typing = true
    cm.state.pasteIncoming = cm.state.cutIncoming = false
  }

  function handlePaste(e, cm) {
    var pasted = e.clipboardData && e.clipboardData.getData("Text")
    if (pasted) {
      e.preventDefault()
      if (!cm.isReadOnly() && !cm.options.disableInput)
        { runInOp(cm, function () { return applyTextInput(cm, pasted, 0, null, "paste"); }) }
      return true
    }
  }

  function triggerElectric(cm, inserted) {
    // When an 'electric' character is inserted, immediately trigger a reindent
    if (!cm.options.electricChars || !cm.options.smartIndent) { return }
    var sel = cm.doc.sel

    for (var i = sel.ranges.length - 1; i >= 0; i--) {
      var range = sel.ranges[i]
      if (range.head.ch > 100 || (i && sel.ranges[i - 1].head.line == range.head.line)) { continue }
      var mode = cm.getModeAt(range.head)
      var indented = false
      if (mode.electricChars) {
        for (var j = 0; j < mode.electricChars.length; j++)
          { if (inserted.indexOf(mode.electricChars.charAt(j)) > -1) {
            indented = indentLine(cm, range.head.line, "smart")
            break
          } }
      } else if (mode.electricInput) {
        if (mode.electricInput.test(getLine(cm.doc, range.head.line).text.slice(0, range.head.ch)))
          { indented = indentLine(cm, range.head.line, "smart") }
      }
      if (indented) { signalLater(cm, "electricInput", cm, range.head.line) }
    }
  }

  function copyableRanges(cm) {
    var text = [], ranges = []
    for (var i = 0; i < cm.doc.sel.ranges.length; i++) {
      var line = cm.doc.sel.ranges[i].head.line
      var lineRange = {anchor: Pos(line, 0), head: Pos(line + 1, 0)}
      ranges.push(lineRange)
      text.push(cm.getRange(lineRange.anchor, lineRange.head))
    }
    return {text: text, ranges: ranges}
  }

  function disableBrowserMagic(field, spellcheck) {
    field.setAttribute("autocorrect", "off")
    field.setAttribute("autocapitalize", "off")
    field.setAttribute("spellcheck", !!spellcheck)
  }

  function hiddenTextarea() {
    var te = elt("textarea", null, null, "position: absolute; bottom: -1em; padding: 0; width: 1px; height: 1em; outline: none")
    var div = elt("div", [te], null, "overflow: hidden; position: relative; width: 3px; height: 0px;")
    // The textarea is kept positioned near the cursor to prevent the
    // fact that it'll be scrolled into view on input from scrolling
    // our fake cursor out of view. On webkit, when wrap=off, paste is
    // very slow. So make the area wide instead.
    if (webkit) { te.style.width = "1000px" }
    else { te.setAttribute("wrap", "off") }
    // If border: 0; -- iOS fails to open keyboard (issue #1287)
    if (ios) { te.style.border = "1px solid black" }
    disableBrowserMagic(te)
    return div
  }

  // The publicly visible API. Note that methodOp(f) means
  // 'wrap f in an operation, performed on its `this` parameter'.

  // This is not the complete set of editor methods. Most of the
  // methods defined on the Doc type are also injected into
  // CodeMirror.prototype, for backwards compatibility and
  // convenience.

  function addEditorMethods(CodeMirror) {
    var optionHandlers = CodeMirror.optionHandlers

    var helpers = CodeMirror.helpers = {}

    CodeMirror.prototype = {
      constructor: CodeMirror,
      focus: function(){window.focus(); this.display.input.focus()},

      setOption: function(option, value) {
        var options = this.options, old = options[option]
        if (options[option] == value && option != "mode") { return }
        options[option] = value
        if (optionHandlers.hasOwnProperty(option))
          { operation(this, optionHandlers[option])(this, value, old) }
        signal(this, "optionChange", this, option)
      },

      getOption: function(option) {return this.options[option]},
      getDoc: function() {return this.doc},

      addKeyMap: function(map, bottom) {
        this.state.keyMaps[bottom ? "push" : "unshift"](getKeyMap(map))
      },
      removeKeyMap: function(map) {
        var maps = this.state.keyMaps
        for (var i = 0; i < maps.length; ++i)
          { if (maps[i] == map || maps[i].name == map) {
            maps.splice(i, 1)
            return true
          } }
      },

      addOverlay: methodOp(function(spec, options) {
        var mode = spec.token ? spec : CodeMirror.getMode(this.options, spec)
        if (mode.startState) { throw new Error("Overlays may not be stateful.") }
        insertSorted(this.state.overlays,
                     {mode: mode, modeSpec: spec, opaque: options && options.opaque,
                      priority: (options && options.priority) || 0},
                     function (overlay) { return overlay.priority; })
        this.state.modeGen++
        regChange(this)
      }),
      removeOverlay: methodOp(function(spec) {
        var this$1 = this;

        var overlays = this.state.overlays
        for (var i = 0; i < overlays.length; ++i) {
          var cur = overlays[i].modeSpec
          if (cur == spec || typeof spec == "string" && cur.name == spec) {
            overlays.splice(i, 1)
            this$1.state.modeGen++
            regChange(this$1)
            return
          }
        }
      }),

      indentLine: methodOp(function(n, dir, aggressive) {
        if (typeof dir != "string" && typeof dir != "number") {
          if (dir == null) { dir = this.options.smartIndent ? "smart" : "prev" }
          else { dir = dir ? "add" : "subtract" }
        }
        if (isLine(this.doc, n)) { indentLine(this, n, dir, aggressive) }
      }),
      indentSelection: methodOp(function(how) {
        var this$1 = this;

        var ranges = this.doc.sel.ranges, end = -1
        for (var i = 0; i < ranges.length; i++) {
          var range = ranges[i]
          if (!range.empty()) {
            var from = range.from(), to = range.to()
            var start = Math.max(end, from.line)
            end = Math.min(this$1.lastLine(), to.line - (to.ch ? 0 : 1)) + 1
            for (var j = start; j < end; ++j)
              { indentLine(this$1, j, how) }
            var newRanges = this$1.doc.sel.ranges
            if (from.ch == 0 && ranges.length == newRanges.length && newRanges[i].from().ch > 0)
              { replaceOneSelection(this$1.doc, i, new Range(from, newRanges[i].to()), sel_dontScroll) }
          } else if (range.head.line > end) {
            indentLine(this$1, range.head.line, how, true)
            end = range.head.line
            if (i == this$1.doc.sel.primIndex) { ensureCursorVisible(this$1) }
          }
        }
      }),

      // Fetch the parser token for a given character. Useful for hacks
      // that want to inspect the mode state (say, for completion).
      getTokenAt: function(pos, precise) {
        return takeToken(this, pos, precise)
      },

      getLineTokens: function(line, precise) {
        return takeToken(this, Pos(line), precise, true)
      },

      getTokenTypeAt: function(pos) {
        pos = clipPos(this.doc, pos)
        var styles = getLineStyles(this, getLine(this.doc, pos.line))
        var before = 0, after = (styles.length - 1) / 2, ch = pos.ch
        var type
        if (ch == 0) { type = styles[2] }
        else { for (;;) {
          var mid = (before + after) >> 1
          if ((mid ? styles[mid * 2 - 1] : 0) >= ch) { after = mid }
          else if (styles[mid * 2 + 1] < ch) { before = mid + 1 }
          else { type = styles[mid * 2 + 2]; break }
        } }
        var cut = type ? type.indexOf("overlay ") : -1
        return cut < 0 ? type : cut == 0 ? null : type.slice(0, cut - 1)
      },

      getModeAt: function(pos) {
        var mode = this.doc.mode
        if (!mode.innerMode) { return mode }
        return CodeMirror.innerMode(mode, this.getTokenAt(pos).state).mode
      },

      getHelper: function(pos, type) {
        return this.getHelpers(pos, type)[0]
      },

      getHelpers: function(pos, type) {
        var this$1 = this;

        var found = []
        if (!helpers.hasOwnProperty(type)) { return found }
        var help = helpers[type], mode = this.getModeAt(pos)
        if (typeof mode[type] == "string") {
          if (help[mode[type]]) { found.push(help[mode[type]]) }
        } else if (mode[type]) {
          for (var i = 0; i < mode[type].length; i++) {
            var val = help[mode[type][i]]
            if (val) { found.push(val) }
          }
        } else if (mode.helperType && help[mode.helperType]) {
          found.push(help[mode.helperType])
        } else if (help[mode.name]) {
          found.push(help[mode.name])
        }
        for (var i$1 = 0; i$1 < help._global.length; i$1++) {
          var cur = help._global[i$1]
          if (cur.pred(mode, this$1) && indexOf(found, cur.val) == -1)
            { found.push(cur.val) }
        }
        return found
      },

      getStateAfter: function(line, precise) {
        var doc = this.doc
        line = clipLine(doc, line == null ? doc.first + doc.size - 1: line)
        return getContextBefore(this, line + 1, precise).state
      },

      cursorCoords: function(start, mode) {
        var pos, range = this.doc.sel.primary()
        if (start == null) { pos = range.head }
        else if (typeof start == "object") { pos = clipPos(this.doc, start) }
        else { pos = start ? range.from() : range.to() }
        return cursorCoords(this, pos, mode || "page")
      },

      charCoords: function(pos, mode) {
        return charCoords(this, clipPos(this.doc, pos), mode || "page")
      },

      coordsChar: function(coords, mode) {
        coords = fromCoordSystem(this, coords, mode || "page")
        return coordsChar(this, coords.left, coords.top)
      },

      lineAtHeight: function(height, mode) {
        height = fromCoordSystem(this, {top: height, left: 0}, mode || "page").top
        return lineAtHeight(this.doc, height + this.display.viewOffset)
      },
      heightAtLine: function(line, mode, includeWidgets) {
        var end = false, lineObj
        if (typeof line == "number") {
          var last = this.doc.first + this.doc.size - 1
          if (line < this.doc.first) { line = this.doc.first }
          else if (line > last) { line = last; end = true }
          lineObj = getLine(this.doc, line)
        } else {
          lineObj = line
        }
        return intoCoordSystem(this, lineObj, {top: 0, left: 0}, mode || "page", includeWidgets || end).top +
          (end ? this.doc.height - heightAtLine(lineObj) : 0)
      },

      defaultTextHeight: function() { return textHeight(this.display) },
      defaultCharWidth: function() { return charWidth(this.display) },

      getViewport: function() { return {from: this.display.viewFrom, to: this.display.viewTo}},

      addWidget: function(pos, node, scroll, vert, horiz) {
        var display = this.display
        pos = cursorCoords(this, clipPos(this.doc, pos))
        var top = pos.bottom, left = pos.left
        node.style.position = "absolute"
        node.setAttribute("cm-ignore-events", "true")
        this.display.input.setUneditable(node)
        display.sizer.appendChild(node)
        if (vert == "over") {
          top = pos.top
        } else if (vert == "above" || vert == "near") {
          var vspace = Math.max(display.wrapper.clientHeight, this.doc.height),
          hspace = Math.max(display.sizer.clientWidth, display.lineSpace.clientWidth)
          // Default to positioning above (if specified and possible); otherwise default to positioning below
          if ((vert == 'above' || pos.bottom + node.offsetHeight > vspace) && pos.top > node.offsetHeight)
            { top = pos.top - node.offsetHeight }
          else if (pos.bottom + node.offsetHeight <= vspace)
            { top = pos.bottom }
          if (left + node.offsetWidth > hspace)
            { left = hspace - node.offsetWidth }
        }
        node.style.top = top + "px"
        node.style.left = node.style.right = ""
        if (horiz == "right") {
          left = display.sizer.clientWidth - node.offsetWidth
          node.style.right = "0px"
        } else {
          if (horiz == "left") { left = 0 }
          else if (horiz == "middle") { left = (display.sizer.clientWidth - node.offsetWidth) / 2 }
          node.style.left = left + "px"
        }
        if (scroll)
          { scrollIntoView(this, {left: left, top: top, right: left + node.offsetWidth, bottom: top + node.offsetHeight}) }
      },

      triggerOnKeyDown: methodOp(onKeyDown),
      triggerOnKeyPress: methodOp(onKeyPress),
      triggerOnKeyUp: onKeyUp,
      triggerOnMouseDown: methodOp(onMouseDown),

      execCommand: function(cmd) {
        if (commands.hasOwnProperty(cmd))
          { return commands[cmd].call(null, this) }
      },

      triggerElectric: methodOp(function(text) { triggerElectric(this, text) }),

      findPosH: function(from, amount, unit, visually) {
        var this$1 = this;

        var dir = 1
        if (amount < 0) { dir = -1; amount = -amount }
        var cur = clipPos(this.doc, from)
        for (var i = 0; i < amount; ++i) {
          cur = findPosH(this$1.doc, cur, dir, unit, visually)
          if (cur.hitSide) { break }
        }
        return cur
      },

      moveH: methodOp(function(dir, unit) {
        var this$1 = this;

        this.extendSelectionsBy(function (range) {
          if (this$1.display.shift || this$1.doc.extend || range.empty())
            { return findPosH(this$1.doc, range.head, dir, unit, this$1.options.rtlMoveVisually) }
          else
            { return dir < 0 ? range.from() : range.to() }
        }, sel_move)
      }),

      deleteH: methodOp(function(dir, unit) {
        var sel = this.doc.sel, doc = this.doc
        if (sel.somethingSelected())
          { doc.replaceSelection("", null, "+delete") }
        else
          { deleteNearSelection(this, function (range) {
            var other = findPosH(doc, range.head, dir, unit, false)
            return dir < 0 ? {from: other, to: range.head} : {from: range.head, to: other}
          }) }
      }),

      findPosV: function(from, amount, unit, goalColumn) {
        var this$1 = this;

        var dir = 1, x = goalColumn
        if (amount < 0) { dir = -1; amount = -amount }
        var cur = clipPos(this.doc, from)
        for (var i = 0; i < amount; ++i) {
          var coords = cursorCoords(this$1, cur, "div")
          if (x == null) { x = coords.left }
          else { coords.left = x }
          cur = findPosV(this$1, coords, dir, unit)
          if (cur.hitSide) { break }
        }
        return cur
      },

      moveV: methodOp(function(dir, unit) {
        var this$1 = this;

        var doc = this.doc, goals = []
        var collapse = !this.display.shift && !doc.extend && doc.sel.somethingSelected()
        doc.extendSelectionsBy(function (range) {
          if (collapse)
            { return dir < 0 ? range.from() : range.to() }
          var headPos = cursorCoords(this$1, range.head, "div")
          if (range.goalColumn != null) { headPos.left = range.goalColumn }
          goals.push(headPos.left)
          var pos = findPosV(this$1, headPos, dir, unit)
          if (unit == "page" && range == doc.sel.primary())
            { addToScrollTop(this$1, charCoords(this$1, pos, "div").top - headPos.top) }
          return pos
        }, sel_move)
        if (goals.length) { for (var i = 0; i < doc.sel.ranges.length; i++)
          { doc.sel.ranges[i].goalColumn = goals[i] } }
      }),

      // Find the word at the given position (as returned by coordsChar).
      findWordAt: function(pos) {
        var doc = this.doc, line = getLine(doc, pos.line).text
        var start = pos.ch, end = pos.ch
        if (line) {
          var helper = this.getHelper(pos, "wordChars")
          if ((pos.sticky == "before" || end == line.length) && start) { --start; } else { ++end }
          var startChar = line.charAt(start)
          var check = isWordChar(startChar, helper)
            ? function (ch) { return isWordChar(ch, helper); }
            : /\s/.test(startChar) ? function (ch) { return /\s/.test(ch); }
            : function (ch) { return (!/\s/.test(ch) && !isWordChar(ch)); }
          while (start > 0 && check(line.charAt(start - 1))) { --start }
          while (end < line.length && check(line.charAt(end))) { ++end }
        }
        return new Range(Pos(pos.line, start), Pos(pos.line, end))
      },

      toggleOverwrite: function(value) {
        if (value != null && value == this.state.overwrite) { return }
        if (this.state.overwrite = !this.state.overwrite)
          { addClass(this.display.cursorDiv, "CodeMirror-overwrite") }
        else
          { rmClass(this.display.cursorDiv, "CodeMirror-overwrite") }

        signal(this, "overwriteToggle", this, this.state.overwrite)
      },
      hasFocus: function() { return this.display.input.getField() == activeElt() },
      isReadOnly: function() { return !!(this.options.readOnly || this.doc.cantEdit) },

      scrollTo: methodOp(function (x, y) { scrollToCoords(this, x, y) }),
      getScrollInfo: function() {
        var scroller = this.display.scroller
        return {left: scroller.scrollLeft, top: scroller.scrollTop,
                height: scroller.scrollHeight - scrollGap(this) - this.display.barHeight,
                width: scroller.scrollWidth - scrollGap(this) - this.display.barWidth,
                clientHeight: displayHeight(this), clientWidth: displayWidth(this)}
      },

      scrollIntoView: methodOp(function(range, margin) {
        if (range == null) {
          range = {from: this.doc.sel.primary().head, to: null}
          if (margin == null) { margin = this.options.cursorScrollMargin }
        } else if (typeof range == "number") {
          range = {from: Pos(range, 0), to: null}
        } else if (range.from == null) {
          range = {from: range, to: null}
        }
        if (!range.to) { range.to = range.from }
        range.margin = margin || 0

        if (range.from.line != null) {
          scrollToRange(this, range)
        } else {
          scrollToCoordsRange(this, range.from, range.to, range.margin)
        }
      }),

      setSize: methodOp(function(width, height) {
        var this$1 = this;

        var interpret = function (val) { return typeof val == "number" || /^\d+$/.test(String(val)) ? val + "px" : val; }
        if (width != null) { this.display.wrapper.style.width = interpret(width) }
        if (height != null) { this.display.wrapper.style.height = interpret(height) }
        if (this.options.lineWrapping) { clearLineMeasurementCache(this) }
        var lineNo = this.display.viewFrom
        this.doc.iter(lineNo, this.display.viewTo, function (line) {
          if (line.widgets) { for (var i = 0; i < line.widgets.length; i++)
            { if (line.widgets[i].noHScroll) { regLineChange(this$1, lineNo, "widget"); break } } }
          ++lineNo
        })
        this.curOp.forceUpdate = true
        signal(this, "refresh", this)
      }),

      operation: function(f){return runInOp(this, f)},
      startOperation: function(){return startOperation(this)},
      endOperation: function(){return endOperation(this)},

      refresh: methodOp(function() {
        var oldHeight = this.display.cachedTextHeight
        regChange(this)
        this.curOp.forceUpdate = true
        clearCaches(this)
        scrollToCoords(this, this.doc.scrollLeft, this.doc.scrollTop)
        updateGutterSpace(this)
        if (oldHeight == null || Math.abs(oldHeight - textHeight(this.display)) > .5)
          { estimateLineHeights(this) }
        signal(this, "refresh", this)
      }),

      swapDoc: methodOp(function(doc) {
        var old = this.doc
        old.cm = null
        attachDoc(this, doc)
        clearCaches(this)
        this.display.input.reset()
        scrollToCoords(this, doc.scrollLeft, doc.scrollTop)
        this.curOp.forceScroll = true
        signalLater(this, "swapDoc", this, old)
        return old
      }),

      getInputField: function(){return this.display.input.getField()},
      getWrapperElement: function(){return this.display.wrapper},
      getScrollerElement: function(){return this.display.scroller},
      getGutterElement: function(){return this.display.gutters}
    }
    eventMixin(CodeMirror)

    CodeMirror.registerHelper = function(type, name, value) {
      if (!helpers.hasOwnProperty(type)) { helpers[type] = CodeMirror[type] = {_global: []} }
      helpers[type][name] = value
    }
    CodeMirror.registerGlobalHelper = function(type, name, predicate, value) {
      CodeMirror.registerHelper(type, name, value)
      helpers[type]._global.push({pred: predicate, val: value})
    }
  }

  // Used for horizontal relative motion. Dir is -1 or 1 (left or
  // right), unit can be "char", "column" (like char, but doesn't
  // cross line boundaries), "word" (across next word), or "group" (to
  // the start of next group of word or non-word-non-whitespace
  // chars). The visually param controls whether, in right-to-left
  // text, direction 1 means to move towards the next index in the
  // string, or towards the character to the right of the current
  // position. The resulting position will have a hitSide=true
  // property if it reached the end of the document.
  function findPosH(doc, pos, dir, unit, visually) {
    var oldPos = pos
    var origDir = dir
    var lineObj = getLine(doc, pos.line)
    function findNextLine() {
      var l = pos.line + dir
      if (l < doc.first || l >= doc.first + doc.size) { return false }
      pos = new Pos(l, pos.ch, pos.sticky)
      return lineObj = getLine(doc, l)
    }
    function moveOnce(boundToLine) {
      var next
      if (visually) {
        next = moveVisually(doc.cm, lineObj, pos, dir)
      } else {
        next = moveLogically(lineObj, pos, dir)
      }
      if (next == null) {
        if (!boundToLine && findNextLine())
          { pos = endOfLine(visually, doc.cm, lineObj, pos.line, dir) }
        else
          { return false }
      } else {
        pos = next
      }
      return true
    }

    if (unit == "char") {
      moveOnce()
    } else if (unit == "column") {
      moveOnce(true)
    } else if (unit == "word" || unit == "group") {
      var sawType = null, group = unit == "group"
      var helper = doc.cm && doc.cm.getHelper(pos, "wordChars")
      for (var first = true;; first = false) {
        if (dir < 0 && !moveOnce(!first)) { break }
        var cur = lineObj.text.charAt(pos.ch) || "\n"
        var type = isWordChar(cur, helper) ? "w"
          : group && cur == "\n" ? "n"
          : !group || /\s/.test(cur) ? null
          : "p"
        if (group && !first && !type) { type = "s" }
        if (sawType && sawType != type) {
          if (dir < 0) {dir = 1; moveOnce(); pos.sticky = "after"}
          break
        }

        if (type) { sawType = type }
        if (dir > 0 && !moveOnce(!first)) { break }
      }
    }
    var result = skipAtomic(doc, pos, oldPos, origDir, true)
    if (equalCursorPos(oldPos, result)) { result.hitSide = true }
    return result
  }

  // For relative vertical movement. Dir may be -1 or 1. Unit can be
  // "page" or "line". The resulting position will have a hitSide=true
  // property if it reached the end of the document.
  function findPosV(cm, pos, dir, unit) {
    var doc = cm.doc, x = pos.left, y
    if (unit == "page") {
      var pageSize = Math.min(cm.display.wrapper.clientHeight, window.innerHeight || document.documentElement.clientHeight)
      var moveAmount = Math.max(pageSize - .5 * textHeight(cm.display), 3)
      y = (dir > 0 ? pos.bottom : pos.top) + dir * moveAmount

    } else if (unit == "line") {
      y = dir > 0 ? pos.bottom + 3 : pos.top - 3
    }
    var target
    for (;;) {
      target = coordsChar(cm, x, y)
      if (!target.outside) { break }
      if (dir < 0 ? y <= 0 : y >= doc.height) { target.hitSide = true; break }
      y += dir * 5
    }
    return target
  }

  // CONTENTEDITABLE INPUT STYLE

  var ContentEditableInput = function(cm) {
    this.cm = cm
    this.lastAnchorNode = this.lastAnchorOffset = this.lastFocusNode = this.lastFocusOffset = null
    this.polling = new Delayed()
    this.composing = null
    this.gracePeriod = false
    this.readDOMTimeout = null
  };

  ContentEditableInput.prototype.init = function (display) {
      var this$1 = this;

    var input = this, cm = input.cm
    var div = input.div = display.lineDiv
    disableBrowserMagic(div, cm.options.spellcheck)

    on(div, "paste", function (e) {
      if (signalDOMEvent(cm, e) || handlePaste(e, cm)) { return }
      // IE doesn't fire input events, so we schedule a read for the pasted content in this way
      if (ie_version <= 11) { setTimeout(operation(cm, function () { return this$1.updateFromDOM(); }), 20) }
    })

    on(div, "compositionstart", function (e) {
      this$1.composing = {data: e.data, done: false}
    })
    on(div, "compositionupdate", function (e) {
      if (!this$1.composing) { this$1.composing = {data: e.data, done: false} }
    })
    on(div, "compositionend", function (e) {
      if (this$1.composing) {
        if (e.data != this$1.composing.data) { this$1.readFromDOMSoon() }
        this$1.composing.done = true
      }
    })

    on(div, "touchstart", function () { return input.forceCompositionEnd(); })

    on(div, "input", function () {
      if (!this$1.composing) { this$1.readFromDOMSoon() }
    })

    function onCopyCut(e) {
      if (signalDOMEvent(cm, e)) { return }
      if (cm.somethingSelected()) {
        setLastCopied({lineWise: false, text: cm.getSelections()})
        if (e.type == "cut") { cm.replaceSelection("", null, "cut") }
      } else if (!cm.options.lineWiseCopyCut) {
        return
      } else {
        var ranges = copyableRanges(cm)
        setLastCopied({lineWise: true, text: ranges.text})
        if (e.type == "cut") {
          cm.operation(function () {
            cm.setSelections(ranges.ranges, 0, sel_dontScroll)
            cm.replaceSelection("", null, "cut")
          })
        }
      }
      if (e.clipboardData) {
        e.clipboardData.clearData()
        var content = lastCopied.text.join("\n")
        // iOS exposes the clipboard API, but seems to discard content inserted into it
        e.clipboardData.setData("Text", content)
        if (e.clipboardData.getData("Text") == content) {
          e.preventDefault()
          return
        }
      }
      // Old-fashioned briefly-focus-a-textarea hack
      var kludge = hiddenTextarea(), te = kludge.firstChild
      cm.display.lineSpace.insertBefore(kludge, cm.display.lineSpace.firstChild)
      te.value = lastCopied.text.join("\n")
      var hadFocus = document.activeElement
      selectInput(te)
      setTimeout(function () {
        cm.display.lineSpace.removeChild(kludge)
        hadFocus.focus()
        if (hadFocus == div) { input.showPrimarySelection() }
      }, 50)
    }
    on(div, "copy", onCopyCut)
    on(div, "cut", onCopyCut)
  };

  ContentEditableInput.prototype.prepareSelection = function () {
    var result = prepareSelection(this.cm, false)
    result.focus = this.cm.state.focused
    return result
  };

  ContentEditableInput.prototype.showSelection = function (info, takeFocus) {
    if (!info || !this.cm.display.view.length) { return }
    if (info.focus || takeFocus) { this.showPrimarySelection() }
    this.showMultipleSelections(info)
  };

  ContentEditableInput.prototype.showPrimarySelection = function () {
    var sel = window.getSelection(), cm = this.cm, prim = cm.doc.sel.primary()
    var from = prim.from(), to = prim.to()

    if (cm.display.viewTo == cm.display.viewFrom || from.line >= cm.display.viewTo || to.line < cm.display.viewFrom) {
      sel.removeAllRanges()
      return
    }

    var curAnchor = domToPos(cm, sel.anchorNode, sel.anchorOffset)
    var curFocus = domToPos(cm, sel.focusNode, sel.focusOffset)
    if (curAnchor && !curAnchor.bad && curFocus && !curFocus.bad &&
        cmp(minPos(curAnchor, curFocus), from) == 0 &&
        cmp(maxPos(curAnchor, curFocus), to) == 0)
      { return }

    var view = cm.display.view
    var start = (from.line >= cm.display.viewFrom && posToDOM(cm, from)) ||
        {node: view[0].measure.map[2], offset: 0}
    var end = to.line < cm.display.viewTo && posToDOM(cm, to)
    if (!end) {
      var measure = view[view.length - 1].measure
      var map = measure.maps ? measure.maps[measure.maps.length - 1] : measure.map
      end = {node: map[map.length - 1], offset: map[map.length - 2] - map[map.length - 3]}
    }

    if (!start || !end) {
      sel.removeAllRanges()
      return
    }

    var old = sel.rangeCount && sel.getRangeAt(0), rng
    try { rng = range(start.node, start.offset, end.offset, end.node) }
    catch(e) {} // Our model of the DOM might be outdated, in which case the range we try to set can be impossible
    if (rng) {
      if (!gecko && cm.state.focused) {
        sel.collapse(start.node, start.offset)
        if (!rng.collapsed) {
          sel.removeAllRanges()
          sel.addRange(rng)
        }
      } else {
        sel.removeAllRanges()
        sel.addRange(rng)
      }
      if (old && sel.anchorNode == null) { sel.addRange(old) }
      else if (gecko) { this.startGracePeriod() }
    }
    this.rememberSelection()
  };

  ContentEditableInput.prototype.startGracePeriod = function () {
      var this$1 = this;

    clearTimeout(this.gracePeriod)
    this.gracePeriod = setTimeout(function () {
      this$1.gracePeriod = false
      if (this$1.selectionChanged())
        { this$1.cm.operation(function () { return this$1.cm.curOp.selectionChanged = true; }) }
    }, 20)
  };

  ContentEditableInput.prototype.showMultipleSelections = function (info) {
    removeChildrenAndAdd(this.cm.display.cursorDiv, info.cursors)
    removeChildrenAndAdd(this.cm.display.selectionDiv, info.selection)
  };

  ContentEditableInput.prototype.rememberSelection = function () {
    var sel = window.getSelection()
    this.lastAnchorNode = sel.anchorNode; this.lastAnchorOffset = sel.anchorOffset
    this.lastFocusNode = sel.focusNode; this.lastFocusOffset = sel.focusOffset
  };

  ContentEditableInput.prototype.selectionInEditor = function () {
    var sel = window.getSelection()
    if (!sel.rangeCount) { return false }
    var node = sel.getRangeAt(0).commonAncestorContainer
    return contains(this.div, node)
  };

  ContentEditableInput.prototype.focus = function () {
    if (this.cm.options.readOnly != "nocursor") {
      if (!this.selectionInEditor())
        { this.showSelection(this.prepareSelection(), true) }
      this.div.focus()
    }
  };
  ContentEditableInput.prototype.blur = function () { this.div.blur() };
  ContentEditableInput.prototype.getField = function () { return this.div };

  ContentEditableInput.prototype.supportsTouch = function () { return true };

  ContentEditableInput.prototype.receivedFocus = function () {
    var input = this
    if (this.selectionInEditor())
      { this.pollSelection() }
    else
      { runInOp(this.cm, function () { return input.cm.curOp.selectionChanged = true; }) }

    function poll() {
      if (input.cm.state.focused) {
        input.pollSelection()
        input.polling.set(input.cm.options.pollInterval, poll)
      }
    }
    this.polling.set(this.cm.options.pollInterval, poll)
  };

  ContentEditableInput.prototype.selectionChanged = function () {
    var sel = window.getSelection()
    return sel.anchorNode != this.lastAnchorNode || sel.anchorOffset != this.lastAnchorOffset ||
      sel.focusNode != this.lastFocusNode || sel.focusOffset != this.lastFocusOffset
  };

  ContentEditableInput.prototype.pollSelection = function () {
    if (this.readDOMTimeout != null || this.gracePeriod || !this.selectionChanged()) { return }
    var sel = window.getSelection(), cm = this.cm
    // On Android Chrome (version 56, at least), backspacing into an
    // uneditable block element will put the cursor in that element,
    // and then, because it's not editable, hide the virtual keyboard.
    // Because Android doesn't allow us to actually detect backspace
    // presses in a sane way, this code checks for when that happens
    // and simulates a backspace press in this case.
    if (android && chrome && this.cm.options.gutters.length && isInGutter(sel.anchorNode)) {
      this.cm.triggerOnKeyDown({type: "keydown", keyCode: 8, preventDefault: Math.abs})
      this.blur()
      this.focus()
      return
    }
    if (this.composing) { return }
    this.rememberSelection()
    var anchor = domToPos(cm, sel.anchorNode, sel.anchorOffset)
    var head = domToPos(cm, sel.focusNode, sel.focusOffset)
    if (anchor && head) { runInOp(cm, function () {
      setSelection(cm.doc, simpleSelection(anchor, head), sel_dontScroll)
      if (anchor.bad || head.bad) { cm.curOp.selectionChanged = true }
    }) }
  };

  ContentEditableInput.prototype.pollContent = function () {
    if (this.readDOMTimeout != null) {
      clearTimeout(this.readDOMTimeout)
      this.readDOMTimeout = null
    }

    var cm = this.cm, display = cm.display, sel = cm.doc.sel.primary()
    var from = sel.from(), to = sel.to()
    if (from.ch == 0 && from.line > cm.firstLine())
      { from = Pos(from.line - 1, getLine(cm.doc, from.line - 1).length) }
    if (to.ch == getLine(cm.doc, to.line).text.length && to.line < cm.lastLine())
      { to = Pos(to.line + 1, 0) }
    if (from.line < display.viewFrom || to.line > display.viewTo - 1) { return false }

    var fromIndex, fromLine, fromNode
    if (from.line == display.viewFrom || (fromIndex = findViewIndex(cm, from.line)) == 0) {
      fromLine = lineNo(display.view[0].line)
      fromNode = display.view[0].node
    } else {
      fromLine = lineNo(display.view[fromIndex].line)
      fromNode = display.view[fromIndex - 1].node.nextSibling
    }
    var toIndex = findViewIndex(cm, to.line)
    var toLine, toNode
    if (toIndex == display.view.length - 1) {
      toLine = display.viewTo - 1
      toNode = display.lineDiv.lastChild
    } else {
      toLine = lineNo(display.view[toIndex + 1].line) - 1
      toNode = display.view[toIndex + 1].node.previousSibling
    }

    if (!fromNode) { return false }
    var newText = cm.doc.splitLines(domTextBetween(cm, fromNode, toNode, fromLine, toLine))
    var oldText = getBetween(cm.doc, Pos(fromLine, 0), Pos(toLine, getLine(cm.doc, toLine).text.length))
    while (newText.length > 1 && oldText.length > 1) {
      if (lst(newText) == lst(oldText)) { newText.pop(); oldText.pop(); toLine-- }
      else if (newText[0] == oldText[0]) { newText.shift(); oldText.shift(); fromLine++ }
      else { break }
    }

    var cutFront = 0, cutEnd = 0
    var newTop = newText[0], oldTop = oldText[0], maxCutFront = Math.min(newTop.length, oldTop.length)
    while (cutFront < maxCutFront && newTop.charCodeAt(cutFront) == oldTop.charCodeAt(cutFront))
      { ++cutFront }
    var newBot = lst(newText), oldBot = lst(oldText)
    var maxCutEnd = Math.min(newBot.length - (newText.length == 1 ? cutFront : 0),
                             oldBot.length - (oldText.length == 1 ? cutFront : 0))
    while (cutEnd < maxCutEnd &&
           newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1))
      { ++cutEnd }
    // Try to move start of change to start of selection if ambiguous
    if (newText.length == 1 && oldText.length == 1 && fromLine == from.line) {
      while (cutFront && cutFront > from.ch &&
             newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1)) {
        cutFront--
        cutEnd++
      }
    }

    newText[newText.length - 1] = newBot.slice(0, newBot.length - cutEnd).replace(/^\u200b+/, "")
    newText[0] = newText[0].slice(cutFront).replace(/\u200b+$/, "")

    var chFrom = Pos(fromLine, cutFront)
    var chTo = Pos(toLine, oldText.length ? lst(oldText).length - cutEnd : 0)
    if (newText.length > 1 || newText[0] || cmp(chFrom, chTo)) {
      replaceRange(cm.doc, newText, chFrom, chTo, "+input")
      return true
    }
  };

  ContentEditableInput.prototype.ensurePolled = function () {
    this.forceCompositionEnd()
  };
  ContentEditableInput.prototype.reset = function () {
    this.forceCompositionEnd()
  };
  ContentEditableInput.prototype.forceCompositionEnd = function () {
    if (!this.composing) { return }
    clearTimeout(this.readDOMTimeout)
    this.composing = null
    this.updateFromDOM()
    this.div.blur()
    this.div.focus()
  };
  ContentEditableInput.prototype.readFromDOMSoon = function () {
      var this$1 = this;

    if (this.readDOMTimeout != null) { return }
    this.readDOMTimeout = setTimeout(function () {
      this$1.readDOMTimeout = null
      if (this$1.composing) {
        if (this$1.composing.done) { this$1.composing = null }
        else { return }
      }
      this$1.updateFromDOM()
    }, 80)
  };

  ContentEditableInput.prototype.updateFromDOM = function () {
      var this$1 = this;

    if (this.cm.isReadOnly() || !this.pollContent())
      { runInOp(this.cm, function () { return regChange(this$1.cm); }) }
  };

  ContentEditableInput.prototype.setUneditable = function (node) {
    node.contentEditable = "false"
  };

  ContentEditableInput.prototype.onKeyPress = function (e) {
    if (e.charCode == 0) { return }
    e.preventDefault()
    if (!this.cm.isReadOnly())
      { operation(this.cm, applyTextInput)(this.cm, String.fromCharCode(e.charCode == null ? e.keyCode : e.charCode), 0) }
  };

  ContentEditableInput.prototype.readOnlyChanged = function (val) {
    this.div.contentEditable = String(val != "nocursor")
  };

  ContentEditableInput.prototype.onContextMenu = function () {};
  ContentEditableInput.prototype.resetPosition = function () {};

  ContentEditableInput.prototype.needsContentAttribute = true

  function posToDOM(cm, pos) {
    var view = findViewForLine(cm, pos.line)
    if (!view || view.hidden) { return null }
    var line = getLine(cm.doc, pos.line)
    var info = mapFromLineView(view, line, pos.line)

    var order = getOrder(line, cm.doc.direction), side = "left"
    if (order) {
      var partPos = getBidiPartAt(order, pos.ch)
      side = partPos % 2 ? "right" : "left"
    }
    var result = nodeAndOffsetInLineMap(info.map, pos.ch, side)
    result.offset = result.collapse == "right" ? result.end : result.start
    return result
  }

  function isInGutter(node) {
    for (var scan = node; scan; scan = scan.parentNode)
      { if (/CodeMirror-gutter-wrapper/.test(scan.className)) { return true } }
    return false
  }

  function badPos(pos, bad) { if (bad) { pos.bad = true; } return pos }

  function domTextBetween(cm, from, to, fromLine, toLine) {
    var text = "", closing = false, lineSep = cm.doc.lineSeparator()
    function recognizeMarker(id) { return function (marker) { return marker.id == id; } }
    function close() {
      if (closing) {
        text += lineSep
        closing = false
      }
    }
    function addText(str) {
      if (str) {
        close()
        text += str
      }
    }
    function walk(node) {
      if (node.nodeType == 1) {
        var cmText = node.getAttribute("cm-text")
        if (cmText != null) {
          addText(cmText || node.textContent.replace(/\u200b/g, ""))
          return
        }
        var markerID = node.getAttribute("cm-marker"), range
        if (markerID) {
          var found = cm.findMarks(Pos(fromLine, 0), Pos(toLine + 1, 0), recognizeMarker(+markerID))
          if (found.length && (range = found[0].find(0)))
            { addText(getBetween(cm.doc, range.from, range.to).join(lineSep)) }
          return
        }
        if (node.getAttribute("contenteditable") == "false") { return }
        var isBlock = /^(pre|div|p)$/i.test(node.nodeName)
        if (isBlock) { close() }
        for (var i = 0; i < node.childNodes.length; i++)
          { walk(node.childNodes[i]) }
        if (isBlock) { closing = true }
      } else if (node.nodeType == 3) {
        addText(node.nodeValue)
      }
    }
    for (;;) {
      walk(from)
      if (from == to) { break }
      from = from.nextSibling
    }
    return text
  }

  function domToPos(cm, node, offset) {
    var lineNode
    if (node == cm.display.lineDiv) {
      lineNode = cm.display.lineDiv.childNodes[offset]
      if (!lineNode) { return badPos(cm.clipPos(Pos(cm.display.viewTo - 1)), true) }
      node = null; offset = 0
    } else {
      for (lineNode = node;; lineNode = lineNode.parentNode) {
        if (!lineNode || lineNode == cm.display.lineDiv) { return null }
        if (lineNode.parentNode && lineNode.parentNode == cm.display.lineDiv) { break }
      }
    }
    for (var i = 0; i < cm.display.view.length; i++) {
      var lineView = cm.display.view[i]
      if (lineView.node == lineNode)
        { return locateNodeInLineView(lineView, node, offset) }
    }
  }

  function locateNodeInLineView(lineView, node, offset) {
    var wrapper = lineView.text.firstChild, bad = false
    if (!node || !contains(wrapper, node)) { return badPos(Pos(lineNo(lineView.line), 0), true) }
    if (node == wrapper) {
      bad = true
      node = wrapper.childNodes[offset]
      offset = 0
      if (!node) {
        var line = lineView.rest ? lst(lineView.rest) : lineView.line
        return badPos(Pos(lineNo(line), line.text.length), bad)
      }
    }

    var textNode = node.nodeType == 3 ? node : null, topNode = node
    if (!textNode && node.childNodes.length == 1 && node.firstChild.nodeType == 3) {
      textNode = node.firstChild
      if (offset) { offset = textNode.nodeValue.length }
    }
    while (topNode.parentNode != wrapper) { topNode = topNode.parentNode }
    var measure = lineView.measure, maps = measure.maps

    function find(textNode, topNode, offset) {
      for (var i = -1; i < (maps ? maps.length : 0); i++) {
        var map = i < 0 ? measure.map : maps[i]
        for (var j = 0; j < map.length; j += 3) {
          var curNode = map[j + 2]
          if (curNode == textNode || curNode == topNode) {
            var line = lineNo(i < 0 ? lineView.line : lineView.rest[i])
            var ch = map[j] + offset
            if (offset < 0 || curNode != textNode) { ch = map[j + (offset ? 1 : 0)] }
            return Pos(line, ch)
          }
        }
      }
    }
    var found = find(textNode, topNode, offset)
    if (found) { return badPos(found, bad) }

    // FIXME this is all really shaky. might handle the few cases it needs to handle, but likely to cause problems
    for (var after = topNode.nextSibling, dist = textNode ? textNode.nodeValue.length - offset : 0; after; after = after.nextSibling) {
      found = find(after, after.firstChild, 0)
      if (found)
        { return badPos(Pos(found.line, found.ch - dist), bad) }
      else
        { dist += after.textContent.length }
    }
    for (var before = topNode.previousSibling, dist$1 = offset; before; before = before.previousSibling) {
      found = find(before, before.firstChild, -1)
      if (found)
        { return badPos(Pos(found.line, found.ch + dist$1), bad) }
      else
        { dist$1 += before.textContent.length }
    }
  }

  // TEXTAREA INPUT STYLE

  var TextareaInput = function(cm) {
    this.cm = cm
    // See input.poll and input.reset
    this.prevInput = ""

    // Flag that indicates whether we expect input to appear real soon
    // now (after some event like 'keypress' or 'input') and are
    // polling intensively.
    this.pollingFast = false
    // Self-resetting timeout for the poller
    this.polling = new Delayed()
    // Used to work around IE issue with selection being forgotten when focus moves away from textarea
    this.hasSelection = false
    this.composing = null
  };

  TextareaInput.prototype.init = function (display) {
      var this$1 = this;

    var input = this, cm = this.cm

    // Wraps and hides input textarea
    var div = this.wrapper = hiddenTextarea()
    // The semihidden textarea that is focused when the editor is
    // focused, and receives input.
    var te = this.textarea = div.firstChild
    display.wrapper.insertBefore(div, display.wrapper.firstChild)

    // Needed to hide big blue blinking cursor on Mobile Safari (doesn't seem to work in iOS 8 anymore)
    if (ios) { te.style.width = "0px" }

    on(te, "input", function () {
      if (ie && ie_version >= 9 && this$1.hasSelection) { this$1.hasSelection = null }
      input.poll()
    })

    on(te, "paste", function (e) {
      if (signalDOMEvent(cm, e) || handlePaste(e, cm)) { return }

      cm.state.pasteIncoming = true
      input.fastPoll()
    })

    function prepareCopyCut(e) {
      if (signalDOMEvent(cm, e)) { return }
      if (cm.somethingSelected()) {
        setLastCopied({lineWise: false, text: cm.getSelections()})
      } else if (!cm.options.lineWiseCopyCut) {
        return
      } else {
        var ranges = copyableRanges(cm)
        setLastCopied({lineWise: true, text: ranges.text})
        if (e.type == "cut") {
          cm.setSelections(ranges.ranges, null, sel_dontScroll)
        } else {
          input.prevInput = ""
          te.value = ranges.text.join("\n")
          selectInput(te)
        }
      }
      if (e.type == "cut") { cm.state.cutIncoming = true }
    }
    on(te, "cut", prepareCopyCut)
    on(te, "copy", prepareCopyCut)

    on(display.scroller, "paste", function (e) {
      if (eventInWidget(display, e) || signalDOMEvent(cm, e)) { return }
      cm.state.pasteIncoming = true
      input.focus()
    })

    // Prevent normal selection in the editor (we handle our own)
    on(display.lineSpace, "selectstart", function (e) {
      if (!eventInWidget(display, e)) { e_preventDefault(e) }
    })

    on(te, "compositionstart", function () {
      var start = cm.getCursor("from")
      if (input.composing) { input.composing.range.clear() }
      input.composing = {
        start: start,
        range: cm.markText(start, cm.getCursor("to"), {className: "CodeMirror-composing"})
      }
    })
    on(te, "compositionend", function () {
      if (input.composing) {
        input.poll()
        input.composing.range.clear()
        input.composing = null
      }
    })
  };

  TextareaInput.prototype.prepareSelection = function () {
    // Redraw the selection and/or cursor
    var cm = this.cm, display = cm.display, doc = cm.doc
    var result = prepareSelection(cm)

    // Move the hidden textarea near the cursor to prevent scrolling artifacts
    if (cm.options.moveInputWithCursor) {
      var headPos = cursorCoords(cm, doc.sel.primary().head, "div")
      var wrapOff = display.wrapper.getBoundingClientRect(), lineOff = display.lineDiv.getBoundingClientRect()
      result.teTop = Math.max(0, Math.min(display.wrapper.clientHeight - 10,
                                          headPos.top + lineOff.top - wrapOff.top))
      result.teLeft = Math.max(0, Math.min(display.wrapper.clientWidth - 10,
                                           headPos.left + lineOff.left - wrapOff.left))
    }

    return result
  };

  TextareaInput.prototype.showSelection = function (drawn) {
    var cm = this.cm, display = cm.display
    removeChildrenAndAdd(display.cursorDiv, drawn.cursors)
    removeChildrenAndAdd(display.selectionDiv, drawn.selection)
    if (drawn.teTop != null) {
      this.wrapper.style.top = drawn.teTop + "px"
      this.wrapper.style.left = drawn.teLeft + "px"
    }
  };

  // Reset the input to correspond to the selection (or to be empty,
  // when not typing and nothing is selected)
  TextareaInput.prototype.reset = function (typing) {
    if (this.contextMenuPending || this.composing) { return }
    var cm = this.cm
    if (cm.somethingSelected()) {
      this.prevInput = ""
      var content = cm.getSelection()
      this.textarea.value = content
      if (cm.state.focused) { selectInput(this.textarea) }
      if (ie && ie_version >= 9) { this.hasSelection = content }
    } else if (!typing) {
      this.prevInput = this.textarea.value = ""
      if (ie && ie_version >= 9) { this.hasSelection = null }
    }
  };

  TextareaInput.prototype.getField = function () { return this.textarea };

  TextareaInput.prototype.supportsTouch = function () { return false };

  TextareaInput.prototype.focus = function () {
    if (this.cm.options.readOnly != "nocursor" && (!mobile || activeElt() != this.textarea)) {
      try { this.textarea.focus() }
      catch (e) {} // IE8 will throw if the textarea is display: none or not in DOM
    }
  };

  TextareaInput.prototype.blur = function () { this.textarea.blur() };

  TextareaInput.prototype.resetPosition = function () {
    this.wrapper.style.top = this.wrapper.style.left = 0
  };

  TextareaInput.prototype.receivedFocus = function () { this.slowPoll() };

  // Poll for input changes, using the normal rate of polling. This
  // runs as long as the editor is focused.
  TextareaInput.prototype.slowPoll = function () {
      var this$1 = this;

    if (this.pollingFast) { return }
    this.polling.set(this.cm.options.pollInterval, function () {
      this$1.poll()
      if (this$1.cm.state.focused) { this$1.slowPoll() }
    })
  };

  // When an event has just come in that is likely to add or change
  // something in the input textarea, we poll faster, to ensure that
  // the change appears on the screen quickly.
  TextareaInput.prototype.fastPoll = function () {
    var missed = false, input = this
    input.pollingFast = true
    function p() {
      var changed = input.poll()
      if (!changed && !missed) {missed = true; input.polling.set(60, p)}
      else {input.pollingFast = false; input.slowPoll()}
    }
    input.polling.set(20, p)
  };

  // Read input from the textarea, and update the document to match.
  // When something is selected, it is present in the textarea, and
  // selected (unless it is huge, in which case a placeholder is
  // used). When nothing is selected, the cursor sits after previously
  // seen text (can be empty), which is stored in prevInput (we must
  // not reset the textarea when typing, because that breaks IME).
  TextareaInput.prototype.poll = function () {
      var this$1 = this;

    var cm = this.cm, input = this.textarea, prevInput = this.prevInput
    // Since this is called a *lot*, try to bail out as cheaply as
    // possible when it is clear that nothing happened. hasSelection
    // will be the case when there is a lot of text in the textarea,
    // in which case reading its value would be expensive.
    if (this.contextMenuPending || !cm.state.focused ||
        (hasSelection(input) && !prevInput && !this.composing) ||
        cm.isReadOnly() || cm.options.disableInput || cm.state.keySeq)
      { return false }

    var text = input.value
    // If nothing changed, bail.
    if (text == prevInput && !cm.somethingSelected()) { return false }
    // Work around nonsensical selection resetting in IE9/10, and
    // inexplicable appearance of private area unicode characters on
    // some key combos in Mac (#2689).
    if (ie && ie_version >= 9 && this.hasSelection === text ||
        mac && /[\uf700-\uf7ff]/.test(text)) {
      cm.display.input.reset()
      return false
    }

    if (cm.doc.sel == cm.display.selForContextMenu) {
      var first = text.charCodeAt(0)
      if (first == 0x200b && !prevInput) { prevInput = "\u200b" }
      if (first == 0x21da) { this.reset(); return this.cm.execCommand("undo") }
    }
    // Find the part of the input that is actually new
    var same = 0, l = Math.min(prevInput.length, text.length)
    while (same < l && prevInput.charCodeAt(same) == text.charCodeAt(same)) { ++same }

    runInOp(cm, function () {
      applyTextInput(cm, text.slice(same), prevInput.length - same,
                     null, this$1.composing ? "*compose" : null)

      // Don't leave long text in the textarea, since it makes further polling slow
      if (text.length > 1000 || text.indexOf("\n") > -1) { input.value = this$1.prevInput = "" }
      else { this$1.prevInput = text }

      if (this$1.composing) {
        this$1.composing.range.clear()
        this$1.composing.range = cm.markText(this$1.composing.start, cm.getCursor("to"),
                                           {className: "CodeMirror-composing"})
      }
    })
    return true
  };

  TextareaInput.prototype.ensurePolled = function () {
    if (this.pollingFast && this.poll()) { this.pollingFast = false }
  };

  TextareaInput.prototype.onKeyPress = function () {
    if (ie && ie_version >= 9) { this.hasSelection = null }
    this.fastPoll()
  };

  TextareaInput.prototype.onContextMenu = function (e) {
    var input = this, cm = input.cm, display = cm.display, te = input.textarea
    var pos = posFromMouse(cm, e), scrollPos = display.scroller.scrollTop
    if (!pos || presto) { return } // Opera is difficult.

    // Reset the current text selection only if the click is done outside of the selection
    // and 'resetSelectionOnContextMenu' option is true.
    var reset = cm.options.resetSelectionOnContextMenu
    if (reset && cm.doc.sel.contains(pos) == -1)
      { operation(cm, setSelection)(cm.doc, simpleSelection(pos), sel_dontScroll) }

    var oldCSS = te.style.cssText, oldWrapperCSS = input.wrapper.style.cssText
    input.wrapper.style.cssText = "position: absolute"
    var wrapperBox = input.wrapper.getBoundingClientRect()
    te.style.cssText = "position: absolute; width: 30px; height: 30px;\n      top: " + (e.clientY - wrapperBox.top - 5) + "px; left: " + (e.clientX - wrapperBox.left - 5) + "px;\n      z-index: 1000; background: " + (ie ? "rgba(255, 255, 255, .05)" : "transparent") + ";\n      outline: none; border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);"
    var oldScrollY
    if (webkit) { oldScrollY = window.scrollY } // Work around Chrome issue (#2712)
    display.input.focus()
    if (webkit) { window.scrollTo(null, oldScrollY) }
    display.input.reset()
    // Adds "Select all" to context menu in FF
    if (!cm.somethingSelected()) { te.value = input.prevInput = " " }
    input.contextMenuPending = true
    display.selForContextMenu = cm.doc.sel
    clearTimeout(display.detectingSelectAll)

    // Select-all will be greyed out if there's nothing to select, so
    // this adds a zero-width space so that we can later check whether
    // it got selected.
    function prepareSelectAllHack() {
      if (te.selectionStart != null) {
        var selected = cm.somethingSelected()
        var extval = "\u200b" + (selected ? te.value : "")
        te.value = "\u21da" // Used to catch context-menu undo
        te.value = extval
        input.prevInput = selected ? "" : "\u200b"
        te.selectionStart = 1; te.selectionEnd = extval.length
        // Re-set this, in case some other handler touched the
        // selection in the meantime.
        display.selForContextMenu = cm.doc.sel
      }
    }
    function rehide() {
      input.contextMenuPending = false
      input.wrapper.style.cssText = oldWrapperCSS
      te.style.cssText = oldCSS
      if (ie && ie_version < 9) { display.scrollbars.setScrollTop(display.scroller.scrollTop = scrollPos) }

      // Try to detect the user choosing select-all
      if (te.selectionStart != null) {
        if (!ie || (ie && ie_version < 9)) { prepareSelectAllHack() }
        var i = 0, poll = function () {
          if (display.selForContextMenu == cm.doc.sel && te.selectionStart == 0 &&
              te.selectionEnd > 0 && input.prevInput == "\u200b") {
            operation(cm, selectAll)(cm)
          } else if (i++ < 10) {
            display.detectingSelectAll = setTimeout(poll, 500)
          } else {
            display.selForContextMenu = null
            display.input.reset()
          }
        }
        display.detectingSelectAll = setTimeout(poll, 200)
      }
    }

    if (ie && ie_version >= 9) { prepareSelectAllHack() }
    if (captureRightClick) {
      e_stop(e)
      var mouseup = function () {
        off(window, "mouseup", mouseup)
        setTimeout(rehide, 20)
      }
      on(window, "mouseup", mouseup)
    } else {
      setTimeout(rehide, 50)
    }
  };

  TextareaInput.prototype.readOnlyChanged = function (val) {
    if (!val) { this.reset() }
    this.textarea.disabled = val == "nocursor"
  };

  TextareaInput.prototype.setUneditable = function () {};

  TextareaInput.prototype.needsContentAttribute = false

  function fromTextArea(textarea, options) {
    options = options ? copyObj(options) : {}
    options.value = textarea.value
    if (!options.tabindex && textarea.tabIndex)
      { options.tabindex = textarea.tabIndex }
    if (!options.placeholder && textarea.placeholder)
      { options.placeholder = textarea.placeholder }
    // Set autofocus to true if this textarea is focused, or if it has
    // autofocus and no other element is focused.
    if (options.autofocus == null) {
      var hasFocus = activeElt()
      options.autofocus = hasFocus == textarea ||
        textarea.getAttribute("autofocus") != null && hasFocus == document.body
    }

    function save() {textarea.value = cm.getValue()}

    var realSubmit
    if (textarea.form) {
      on(textarea.form, "submit", save)
      // Deplorable hack to make the submit method do the right thing.
      if (!options.leaveSubmitMethodAlone) {
        var form = textarea.form
        realSubmit = form.submit
        try {
          var wrappedSubmit = form.submit = function () {
            save()
            form.submit = realSubmit
            form.submit()
            form.submit = wrappedSubmit
          }
        } catch(e) {}
      }
    }

    options.finishInit = function (cm) {
      cm.save = save
      cm.getTextArea = function () { return textarea; }
      cm.toTextArea = function () {
        cm.toTextArea = isNaN // Prevent this from being ran twice
        save()
        textarea.parentNode.removeChild(cm.getWrapperElement())
        textarea.style.display = ""
        if (textarea.form) {
          off(textarea.form, "submit", save)
          if (typeof textarea.form.submit == "function")
            { textarea.form.submit = realSubmit }
        }
      }
    }

    textarea.style.display = "none"
    var cm = CodeMirror(function (node) { return textarea.parentNode.insertBefore(node, textarea.nextSibling); },
      options)
    return cm
  }

  function addLegacyProps(CodeMirror) {
    CodeMirror.off = off
    CodeMirror.on = on
    CodeMirror.wheelEventPixels = wheelEventPixels
    CodeMirror.Doc = Doc
    CodeMirror.splitLines = splitLinesAuto
    CodeMirror.countColumn = countColumn
    CodeMirror.findColumn = findColumn
    CodeMirror.isWordChar = isWordCharBasic
    CodeMirror.Pass = Pass
    CodeMirror.signal = signal
    CodeMirror.Line = Line
    CodeMirror.changeEnd = changeEnd
    CodeMirror.scrollbarModel = scrollbarModel
    CodeMirror.Pos = Pos
    CodeMirror.cmpPos = cmp
    CodeMirror.modes = modes
    CodeMirror.mimeModes = mimeModes
    CodeMirror.resolveMode = resolveMode
    CodeMirror.getMode = getMode
    CodeMirror.modeExtensions = modeExtensions
    CodeMirror.extendMode = extendMode
    CodeMirror.copyState = copyState
    CodeMirror.startState = startState
    CodeMirror.innerMode = innerMode
    CodeMirror.commands = commands
    CodeMirror.keyMap = keyMap
    CodeMirror.keyName = keyName
    CodeMirror.isModifierKey = isModifierKey
    CodeMirror.lookupKey = lookupKey
    CodeMirror.normalizeKeyMap = normalizeKeyMap
    CodeMirror.StringStream = StringStream
    CodeMirror.SharedTextMarker = SharedTextMarker
    CodeMirror.TextMarker = TextMarker
    CodeMirror.LineWidget = LineWidget
    CodeMirror.e_preventDefault = e_preventDefault
    CodeMirror.e_stopPropagation = e_stopPropagation
    CodeMirror.e_stop = e_stop
    CodeMirror.addClass = addClass
    CodeMirror.contains = contains
    CodeMirror.rmClass = rmClass
    CodeMirror.keyNames = keyNames
  }

  // EDITOR CONSTRUCTOR

  defineOptions(CodeMirror)

  addEditorMethods(CodeMirror)

  // Set up methods on CodeMirror's prototype to redirect to the editor's document.
  var dontDelegate = "iter insert remove copy getEditor constructor".split(" ")
  for (var prop in Doc.prototype) { if (Doc.prototype.hasOwnProperty(prop) && indexOf(dontDelegate, prop) < 0)
    { CodeMirror.prototype[prop] = (function(method) {
      return function() {return method.apply(this.doc, arguments)}
    })(Doc.prototype[prop]) } }

  eventMixin(Doc)

  // INPUT HANDLING

  CodeMirror.inputStyles = {"textarea": TextareaInput, "contenteditable": ContentEditableInput}

  // MODE DEFINITION AND QUERYING

  // Extra arguments are stored as the mode's dependencies, which is
  // used by (legacy) mechanisms like loadmode.js to automatically
  // load a mode. (Preferred mechanism is the require/define calls.)
  CodeMirror.defineMode = function(name/*, mode, …*/) {
    if (!CodeMirror.defaults.mode && name != "null") { CodeMirror.defaults.mode = name }
    defineMode.apply(this, arguments)
  }

  CodeMirror.defineMIME = defineMIME

  // Minimal default mode.
  CodeMirror.defineMode("null", function () { return ({token: function (stream) { return stream.skipToEnd(); }}); })
  CodeMirror.defineMIME("text/plain", "null")

  // EXTENSIONS

  CodeMirror.defineExtension = function (name, func) {
    CodeMirror.prototype[name] = func
  }
  CodeMirror.defineDocExtension = function (name, func) {
    Doc.prototype[name] = func
  }

  CodeMirror.fromTextArea = fromTextArea

  addLegacyProps(CodeMirror)

  CodeMirror.version = "5.32.0"

  return CodeMirror;

  })));
  // END C:\git\camlsql-js\src\app\js\vendor\codemirror\codemirror.js

  // BEGIN C:\git\camlsql-js\src\app\js\vendor\codemirror\show-hint.js*/
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: http://codemirror.net/LICENSE

  (function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
      mod(require("../../lib/codemirror"));
    else if (typeof define == "function" && define.amd) // AMD
      define(["../../lib/codemirror"], mod);
    else // Plain browser env
      mod(CodeMirror);
  })(function(CodeMirror) {
    "use strict";

    var HINT_ELEMENT_CLASS        = "CodeMirror-hint";
    var ACTIVE_HINT_ELEMENT_CLASS = "CodeMirror-hint-active";

    // This is the old interface, kept around for now to stay
    // backwards-compatible.
    CodeMirror.showHint = function(cm, getHints, options) {
      if (!getHints) return cm.showHint(options);
      if (options && options.async) getHints.async = true;
      var newOpts = {hint: getHints};
      if (options) for (var prop in options) newOpts[prop] = options[prop];
      return cm.showHint(newOpts);
    };

    CodeMirror.defineExtension("showHint", function(options) {
      options = parseOptions(this, this.getCursor("start"), options);
      var selections = this.listSelections()
      if (selections.length > 1) return;
      // By default, don't allow completion when something is selected.
      // A hint function can have a `supportsSelection` property to
      // indicate that it can handle selections.
      if (this.somethingSelected()) {
        if (!options.hint.supportsSelection) return;
        // Don't try with cross-line selections
        for (var i = 0; i < selections.length; i++)
          if (selections[i].head.line != selections[i].anchor.line) return;
      }

      if (this.state.completionActive) this.state.completionActive.close();
      var completion = this.state.completionActive = new Completion(this, options);
      if (!completion.options.hint) return;

      CodeMirror.signal(this, "startCompletion", this);
      completion.update(true);
    });

    function Completion(cm, options) {
      this.cm = cm;
      this.options = options;
      this.widget = null;
      this.debounce = 0;
      this.tick = 0;
      this.startPos = this.cm.getCursor("start");
      this.startLen = this.cm.getLine(this.startPos.line).length - this.cm.getSelection().length;

      var self = this;
      cm.on("cursorActivity", this.activityFunc = function() { self.cursorActivity(); });
    }

    var requestAnimationFrame = window.requestAnimationFrame || function(fn) {
      return setTimeout(fn, 1000/60);
    };
    var cancelAnimationFrame = window.cancelAnimationFrame || clearTimeout;

    Completion.prototype = {
      close: function() {
        if (!this.active()) return;
        this.cm.state.completionActive = null;
        this.tick = null;
        this.cm.off("cursorActivity", this.activityFunc);

        if (this.widget && this.data) CodeMirror.signal(this.data, "close");
        if (this.widget) this.widget.close();
        CodeMirror.signal(this.cm, "endCompletion", this.cm);
      },

      active: function() {
        return this.cm.state.completionActive == this;
      },

      pick: function(data, i) {
        var completion = data.list[i];
        if (completion.hint) completion.hint(this.cm, data, completion);
        else this.cm.replaceRange(getText(completion), completion.from || data.from,
                                  completion.to || data.to, "complete");
        CodeMirror.signal(data, "pick", completion);
        this.close();
      },

      cursorActivity: function() {
        if (this.debounce) {
          cancelAnimationFrame(this.debounce);
          this.debounce = 0;
        }

        var pos = this.cm.getCursor(), line = this.cm.getLine(pos.line);
        if (pos.line != this.startPos.line || line.length - pos.ch != this.startLen - this.startPos.ch ||
            pos.ch < this.startPos.ch || this.cm.somethingSelected() ||
            (pos.ch && this.options.closeCharacters.test(line.charAt(pos.ch - 1)))) {
          this.close();
        } else {
          var self = this;
          this.debounce = requestAnimationFrame(function() {self.update();});
          if (this.widget) this.widget.disable();
        }
      },

      update: function(first) {
        if (this.tick == null) return
        var self = this, myTick = ++this.tick
        fetchHints(this.options.hint, this.cm, this.options, function(data) {
          if (self.tick == myTick) self.finishUpdate(data, first)
        })
      },

      finishUpdate: function(data, first) {
        if (this.data) CodeMirror.signal(this.data, "update");

        var picked = (this.widget && this.widget.picked) || (first && this.options.completeSingle);
        if (this.widget) this.widget.close();

        this.data = data;

        if (data && data.list.length) {
          if (picked && data.list.length == 1) {
            this.pick(data, 0);
          } else {
            this.widget = new Widget(this, data);
            CodeMirror.signal(data, "shown");
          }
        }
      }
    };

    function parseOptions(cm, pos, options) {
      var editor = cm.options.hintOptions;
      var out = {};
      for (var prop in defaultOptions) out[prop] = defaultOptions[prop];
      if (editor) for (var prop in editor)
        if (editor[prop] !== undefined) out[prop] = editor[prop];
      if (options) for (var prop in options)
        if (options[prop] !== undefined) out[prop] = options[prop];
      if (out.hint.resolve) out.hint = out.hint.resolve(cm, pos)
      return out;
    }

    function getText(completion) {
      if (typeof completion == "string") return completion;
      else return completion.text;
    }

    function buildKeyMap(completion, handle) {
      var baseMap = {
        Up: function() {handle.moveFocus(-1);},
        Down: function() {handle.moveFocus(1);},
        PageUp: function() {handle.moveFocus(-handle.menuSize() + 1, true);},
        PageDown: function() {handle.moveFocus(handle.menuSize() - 1, true);},
        Home: function() {handle.setFocus(0);},
        End: function() {handle.setFocus(handle.length - 1);},
        Enter: handle.pick,
        Tab: handle.pick,
        Esc: handle.close
      };
      var custom = completion.options.customKeys;
      var ourMap = custom ? {} : baseMap;
      function addBinding(key, val) {
        var bound;
        if (typeof val != "string")
          bound = function(cm) { return val(cm, handle); };
        // This mechanism is deprecated
        else if (baseMap.hasOwnProperty(val))
          bound = baseMap[val];
        else
          bound = val;
        ourMap[key] = bound;
      }
      if (custom)
        for (var key in custom) if (custom.hasOwnProperty(key))
          addBinding(key, custom[key]);
      var extra = completion.options.extraKeys;
      if (extra)
        for (var key in extra) if (extra.hasOwnProperty(key))
          addBinding(key, extra[key]);
      return ourMap;
    }

    function getHintElement(hintsElement, el) {
      while (el && el != hintsElement) {
        if (el.nodeName.toUpperCase() === "LI" && el.parentNode == hintsElement) return el;
        el = el.parentNode;
      }
    }

    function Widget(completion, data) {
      this.completion = completion;
      this.data = data;
      this.picked = false;
      var widget = this, cm = completion.cm;

      var hints = this.hints = document.createElement("ul");
      hints.className = "CodeMirror-hints";
      this.selectedHint = data.selectedHint || 0;

      var completions = data.list;
      for (var i = 0; i < completions.length; ++i) {
        var elt = hints.appendChild(document.createElement("li")), cur = completions[i];
        var className = HINT_ELEMENT_CLASS + (i != this.selectedHint ? "" : " " + ACTIVE_HINT_ELEMENT_CLASS);
        if (cur.className != null) className = cur.className + " " + className;
        elt.className = className;
        if (cur.render) cur.render(elt, data, cur);
        else elt.appendChild(document.createTextNode(cur.displayText || getText(cur)));
        elt.hintId = i;
      }

      var pos = cm.cursorCoords(completion.options.alignWithWord ? data.from : null);
      var left = pos.left, top = pos.bottom, below = true;
      hints.style.left = left + "px";
      hints.style.top = top + "px";
      // If we're at the edge of the screen, then we want the menu to appear on the left of the cursor.
      var winW = window.innerWidth || Math.max(document.body.offsetWidth, document.documentElement.offsetWidth);
      var winH = window.innerHeight || Math.max(document.body.offsetHeight, document.documentElement.offsetHeight);
      (completion.options.container || document.body).appendChild(hints);
      var box = hints.getBoundingClientRect(), overlapY = box.bottom - winH;
      var scrolls = hints.scrollHeight > hints.clientHeight + 1
      var startScroll = cm.getScrollInfo();

      if (overlapY > 0) {
        var height = box.bottom - box.top, curTop = pos.top - (pos.bottom - box.top);
        if (curTop - height > 0) { // Fits above cursor
          hints.style.top = (top = pos.top - height) + "px";
          below = false;
        } else if (height > winH) {
          hints.style.height = (winH - 5) + "px";
          hints.style.top = (top = pos.bottom - box.top) + "px";
          var cursor = cm.getCursor();
          if (data.from.ch != cursor.ch) {
            pos = cm.cursorCoords(cursor);
            hints.style.left = (left = pos.left) + "px";
            box = hints.getBoundingClientRect();
          }
        }
      }
      var overlapX = box.right - winW;
      if (overlapX > 0) {
        if (box.right - box.left > winW) {
          hints.style.width = (winW - 5) + "px";
          overlapX -= (box.right - box.left) - winW;
        }
        hints.style.left = (left = pos.left - overlapX) + "px";
      }
      if (scrolls) for (var node = hints.firstChild; node; node = node.nextSibling)
        node.style.paddingRight = cm.display.nativeBarWidth + "px"

      cm.addKeyMap(this.keyMap = buildKeyMap(completion, {
        moveFocus: function(n, avoidWrap) { widget.changeActive(widget.selectedHint + n, avoidWrap); },
        setFocus: function(n) { widget.changeActive(n); },
        menuSize: function() { return widget.screenAmount(); },
        length: completions.length,
        close: function() { completion.close(); },
        pick: function() { widget.pick(); },
        data: data
      }));

      if (completion.options.closeOnUnfocus) {
        var closingOnBlur;
        cm.on("blur", this.onBlur = function() { closingOnBlur = setTimeout(function() { completion.close(); }, 100); });
        cm.on("focus", this.onFocus = function() { clearTimeout(closingOnBlur); });
      }

      cm.on("scroll", this.onScroll = function() {
        var curScroll = cm.getScrollInfo(), editor = cm.getWrapperElement().getBoundingClientRect();
        var newTop = top + startScroll.top - curScroll.top;
        var point = newTop - (window.pageYOffset || (document.documentElement || document.body).scrollTop);
        if (!below) point += hints.offsetHeight;
        if (point <= editor.top || point >= editor.bottom) return completion.close();
        hints.style.top = newTop + "px";
        hints.style.left = (left + startScroll.left - curScroll.left) + "px";
      });

      CodeMirror.on(hints, "dblclick", function(e) {
        var t = getHintElement(hints, e.target || e.srcElement);
        if (t && t.hintId != null) {widget.changeActive(t.hintId); widget.pick();}
      });

      CodeMirror.on(hints, "click", function(e) {
        var t = getHintElement(hints, e.target || e.srcElement);
        if (t && t.hintId != null) {
          widget.changeActive(t.hintId);
          if (completion.options.completeOnSingleClick) widget.pick();
        }
      });

      CodeMirror.on(hints, "mousedown", function() {
        setTimeout(function(){cm.focus();}, 20);
      });

      CodeMirror.signal(data, "select", completions[this.selectedHint], hints.childNodes[this.selectedHint]);
      return true;
    }

    Widget.prototype = {
      close: function() {
        if (this.completion.widget != this) return;
        this.completion.widget = null;
        this.hints.parentNode.removeChild(this.hints);
        this.completion.cm.removeKeyMap(this.keyMap);

        var cm = this.completion.cm;
        if (this.completion.options.closeOnUnfocus) {
          cm.off("blur", this.onBlur);
          cm.off("focus", this.onFocus);
        }
        cm.off("scroll", this.onScroll);
      },

      disable: function() {
        this.completion.cm.removeKeyMap(this.keyMap);
        var widget = this;
        this.keyMap = {Enter: function() { widget.picked = true; }};
        this.completion.cm.addKeyMap(this.keyMap);
      },

      pick: function() {
        this.completion.pick(this.data, this.selectedHint);
      },

      changeActive: function(i, avoidWrap) {
        if (i >= this.data.list.length)
          i = avoidWrap ? this.data.list.length - 1 : 0;
        else if (i < 0)
          i = avoidWrap ? 0  : this.data.list.length - 1;
        if (this.selectedHint == i) return;
        var node = this.hints.childNodes[this.selectedHint];
        node.className = node.className.replace(" " + ACTIVE_HINT_ELEMENT_CLASS, "");
        node = this.hints.childNodes[this.selectedHint = i];
        node.className += " " + ACTIVE_HINT_ELEMENT_CLASS;
        if (node.offsetTop < this.hints.scrollTop)
          this.hints.scrollTop = node.offsetTop - 3;
        else if (node.offsetTop + node.offsetHeight > this.hints.scrollTop + this.hints.clientHeight)
          this.hints.scrollTop = node.offsetTop + node.offsetHeight - this.hints.clientHeight + 3;
        CodeMirror.signal(this.data, "select", this.data.list[this.selectedHint], node);
      },

      screenAmount: function() {
        return Math.floor(this.hints.clientHeight / this.hints.firstChild.offsetHeight) || 1;
      }
    };

    function applicableHelpers(cm, helpers) {
      if (!cm.somethingSelected()) return helpers
      var result = []
      for (var i = 0; i < helpers.length; i++)
        if (helpers[i].supportsSelection) result.push(helpers[i])
      return result
    }

    function fetchHints(hint, cm, options, callback) {
      if (hint.async) {
        hint(cm, callback, options)
      } else {
        var result = hint(cm, options)
        if (result && result.then) result.then(callback)
        else callback(result)
      }
    }

    function resolveAutoHints(cm, pos) {
      var helpers = cm.getHelpers(pos, "hint"), words
      if (helpers.length) {
        var resolved = function(cm, callback, options) {
          var app = applicableHelpers(cm, helpers);
          function run(i) {
            if (i == app.length) return callback(null)
            fetchHints(app[i], cm, options, function(result) {
              if (result && result.list.length > 0) callback(result)
              else run(i + 1)
            })
          }
          run(0)
        }
        resolved.async = true
        resolved.supportsSelection = true
        return resolved
      } else if (words = cm.getHelper(cm.getCursor(), "hintWords")) {
        return function(cm) { return CodeMirror.hint.fromList(cm, {words: words}) }
      } else if (CodeMirror.hint.anyword) {
        return function(cm, options) { return CodeMirror.hint.anyword(cm, options) }
      } else {
        return function() {}
      }
    }

    CodeMirror.registerHelper("hint", "auto", {
      resolve: resolveAutoHints
    });

    CodeMirror.registerHelper("hint", "fromList", function(cm, options) {
      var cur = cm.getCursor(), token = cm.getTokenAt(cur);
      var to = CodeMirror.Pos(cur.line, token.end);
      if (token.string && /\w/.test(token.string[token.string.length - 1])) {
        var term = token.string, from = CodeMirror.Pos(cur.line, token.start);
      } else {
        var term = "", from = to;
      }
      var found = [];
      for (var i = 0; i < options.words.length; i++) {
        var word = options.words[i];
        if (word.slice(0, term.length) == term)
          found.push(word);
      }

      if (found.length) return {list: found, from: from, to: to};
    });

    CodeMirror.commands.autocomplete = CodeMirror.showHint;

    var defaultOptions = {
      hint: CodeMirror.hint.auto,
      completeSingle: true,
      alignWithWord: true,
      closeCharacters: /[\s()\[\]{};:>,]/,
      closeOnUnfocus: true,
      completeOnSingleClick: true,
      container: null,
      customKeys: null,
      extraKeys: null
    };

    CodeMirror.defineOption("hintOptions", null);
  });

  // END C:\git\camlsql-js\src\app\js\vendor\codemirror\show-hint.js

  // BEGIN C:\git\camlsql-js\src\app\js\vendor\codemirror\sql-hint.js*/
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: http://codemirror.net/LICENSE

  (function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
      mod(require("../../lib/codemirror"), require("../../mode/sql/sql"));
    else if (typeof define == "function" && define.amd) // AMD
      define(["../../lib/codemirror", "../../mode/sql/sql"], mod);
    else // Plain browser env
      mod(CodeMirror);
  })(function(CodeMirror) {
    "use strict";

    var tables;
    var defaultTable;
    var keywords;
    var identifierQuote;
    var CONS = {
      QUERY_DIV: ";",
      ALIAS_KEYWORD: "AS"
    };
    var Pos = CodeMirror.Pos, cmpPos = CodeMirror.cmpPos;

    function isArray(val) { return Object.prototype.toString.call(val) == "[object Array]" }

    function getKeywords(editor) {
      var mode = editor.doc.modeOption;
      if (mode === "sql") mode = "text/x-camlsql";
      return CodeMirror.resolveMode(mode).keywords;
    }

    function getIdentifierQuote(editor) {
      var mode = editor.doc.modeOption;
      if (mode === "sql") mode = "text/x-camlsql";
      return CodeMirror.resolveMode(mode).identifierQuote || "`";
    }

    function getText(item) {
      return typeof item == "string" ? item : item.text;
    }

    function wrapTable(name, value) {
      if (isArray(value)) value = {columns: value}
      if (!value.text) value.text = name
      return value
    }

    function parseTables(input) {
      var result = {}
      if (isArray(input)) {
        for (var i = input.length - 1; i >= 0; i--) {
          var item = input[i]
          result[getText(item).toUpperCase()] = wrapTable(getText(item), item)
        }
      } else if (input) {
        for (var name in input)
          result[name.toUpperCase()] = wrapTable(name, input[name])
      }
      return result
    }

    function getTable(name) {
      return tables[name.toUpperCase()]
    }

    function shallowClone(object) {
      var result = {};
      for (var key in object) if (object.hasOwnProperty(key))
        result[key] = object[key];
      return result;
    }

    function match(string, word) {
      var len = string.length;
      var sub = getText(word).substr(0, len);
      return string.toUpperCase() === sub.toUpperCase();
    }

    function addMatches(result, search, wordlist, formatter) {
      if (isArray(wordlist)) {
        for (var i = 0; i < wordlist.length; i++)
          if (match(search, wordlist[i])) result.push(formatter(wordlist[i]))
      } else {
        for (var word in wordlist) if (wordlist.hasOwnProperty(word)) {
          var val = wordlist[word]
          if (!val || val === true)
            val = word
          else
            val = val.displayText ? {text: val.text, displayText: val.displayText} : val.text
          if (match(search, val)) result.push(formatter(val))
        }
      }
    }

    function cleanName(name) {
      // Get rid name from identifierQuote and preceding dot(.)
      if (name.charAt(0) == ".") {
        name = name.substr(1);
      }
      // replace doublicated identifierQuotes with single identifierQuotes
      // and remove single identifierQuotes
      var nameParts = name.split(identifierQuote+identifierQuote);
      for (var i = 0; i < nameParts.length; i++)
        nameParts[i] = nameParts[i].replace(new RegExp(identifierQuote,"g"), "");
      return nameParts.join(identifierQuote);
    }

    function insertIdentifierQuotes(name) {
      var nameParts = getText(name).split(".");
      for (var i = 0; i < nameParts.length; i++)
        nameParts[i] = identifierQuote +
          // doublicate identifierQuotes
          nameParts[i].replace(new RegExp(identifierQuote,"g"), identifierQuote+identifierQuote) +
          identifierQuote;
      var escaped = nameParts.join(".");
      if (typeof name == "string") return escaped;
      name = shallowClone(name);
      name.text = escaped;
      return name;
    }

    function nameCompletion(cur, token, result, editor) {
      // Try to complete table, column names and return start position of completion
      var useIdentifierQuotes = false;
      var nameParts = [];
      var start = token.start;
      var cont = true;
      while (cont) {
        cont = (token.string.charAt(0) == ".");
        useIdentifierQuotes = useIdentifierQuotes || (token.string.charAt(0) == identifierQuote);

        start = token.start;
        nameParts.unshift(cleanName(token.string));

        token = editor.getTokenAt(Pos(cur.line, token.start));
        if (token.string == ".") {
          cont = true;
          token = editor.getTokenAt(Pos(cur.line, token.start));
        }
      }

      // Try to complete table names
      var string = nameParts.join(".");
      addMatches(result, string, tables, function(w) {
        return useIdentifierQuotes ? insertIdentifierQuotes(w) : w;
      });

      // Try to complete columns from defaultTable
      addMatches(result, string, defaultTable, function(w) {
        return useIdentifierQuotes ? insertIdentifierQuotes(w) : w;
      });

      // Try to complete columns
      string = nameParts.pop();
      var table = nameParts.join(".");

      var alias = false;
      var aliasTable = table;
      // Check if table is available. If not, find table by Alias
      if (!getTable(table)) {
        var oldTable = table;
        table = findTableByAlias(table, editor);
        if (table !== oldTable) alias = true;
      }

      var columns = getTable(table);
      if (columns && columns.columns)
        columns = columns.columns;

      if (columns) {
        addMatches(result, string, columns, function(w) {
          var tableInsert = table;
          if (alias == true) tableInsert = aliasTable;
          if (typeof w == "string") {
            w = tableInsert + "." + w;
          } else {
            w = shallowClone(w);
            w.text = tableInsert + "." + w.text;
          }
          return useIdentifierQuotes ? insertIdentifierQuotes(w) : w;
        });
      }

      return start;
    }

    function eachWord(lineText, f) {
      var words = lineText.split(/\s+/)
      for (var i = 0; i < words.length; i++)
        if (words[i]) f(words[i].replace(/[,;]/g, ''))
    }

    function findTableByAlias(alias, editor) {
      var doc = editor.doc;
      var fullQuery = doc.getValue();
      var aliasUpperCase = alias.toUpperCase();
      var previousWord = "";
      var table = "";
      var separator = [];
      var validRange = {
        start: Pos(0, 0),
        end: Pos(editor.lastLine(), editor.getLineHandle(editor.lastLine()).length)
      };

      //add separator
      var indexOfSeparator = fullQuery.indexOf(CONS.QUERY_DIV);
      while(indexOfSeparator != -1) {
        separator.push(doc.posFromIndex(indexOfSeparator));
        indexOfSeparator = fullQuery.indexOf(CONS.QUERY_DIV, indexOfSeparator+1);
      }
      separator.unshift(Pos(0, 0));
      separator.push(Pos(editor.lastLine(), editor.getLineHandle(editor.lastLine()).text.length));

      //find valid range
      var prevItem = null;
      var current = editor.getCursor()
      for (var i = 0; i < separator.length; i++) {
        if ((prevItem == null || cmpPos(current, prevItem) > 0) && cmpPos(current, separator[i]) <= 0) {
          validRange = {start: prevItem, end: separator[i]};
          break;
        }
        prevItem = separator[i];
      }

      var query = doc.getRange(validRange.start, validRange.end, false);

      for (var i = 0; i < query.length; i++) {
        var lineText = query[i];
        eachWord(lineText, function(word) {
          var wordUpperCase = word.toUpperCase();
          if (wordUpperCase === aliasUpperCase && getTable(previousWord))
            table = previousWord;
          if (wordUpperCase !== CONS.ALIAS_KEYWORD)
            previousWord = word;
        });
        if (table) break;
      }
      return table;
    }

    CodeMirror.registerHelper("hint", "sql", function(editor, options) {
      tables = parseTables(options && options.tables)
      var defaultTableName = options && options.defaultTable;
      var disableKeywords = options && options.disableKeywords;
      defaultTable = defaultTableName && getTable(defaultTableName);
      keywords = getKeywords(editor);
      identifierQuote = getIdentifierQuote(editor);

      if (defaultTableName && !defaultTable)
        defaultTable = findTableByAlias(defaultTableName, editor);

      defaultTable = defaultTable || [];

      if (defaultTable.columns)
        defaultTable = defaultTable.columns;

      var cur = editor.getCursor();
      var result = [];
      var token = editor.getTokenAt(cur), start, end, search;
      if (token.end > cur.ch) {
        token.end = cur.ch;
        token.string = token.string.slice(0, cur.ch - token.start);
      }

      if (token.string.match(/^[.`"\w@]\w*$/)) {
        search = token.string;
        start = token.start;
        end = token.end;
      } else {
        start = end = cur.ch;
        search = "";
      }
      if (search.charAt(0) == "." || search.charAt(0) == identifierQuote) {
        start = nameCompletion(cur, token, result, editor);
      } else {
        addMatches(result, search, tables, function(w) {return w;});
        addMatches(result, search, defaultTable, function(w) {return w;});
        if (!disableKeywords)
          addMatches(result, search, keywords, function(w) {return w.toUpperCase();});
      }

      return {list: result, from: Pos(cur.line, start), to: Pos(cur.line, end)};
    });
  });

  // END C:\git\camlsql-js\src\app\js\vendor\codemirror\sql-hint.js

  // BEGIN C:\git\camlsql-js\src\app\js\vendor\codemirror\sql.js*/
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: http://codemirror.net/LICENSE

  (function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
      mod(require("../../lib/codemirror"));
    else if (typeof define == "function" && define.amd) // AMD
      define(["../../lib/codemirror"], mod);
    else // Plain browser env
      mod(CodeMirror);
  })(function(CodeMirror) {
  "use strict";

  CodeMirror.defineMode("sql", function(config, parserConfig) {
    "use strict";

    var client         = parserConfig.client || {},
        atoms          = parserConfig.atoms || {"false": true, "true": true, "null": true},
        builtin        = parserConfig.builtin || {},
        keywords       = parserConfig.keywords || {},
        operatorChars  = parserConfig.operatorChars || /^[*+\-%<>!=&|~^]/,
        support        = parserConfig.support || {},
        hooks          = parserConfig.hooks || {},
        dateSQL        = parserConfig.dateSQL || {"date" : true, "time" : true, "timestamp" : true};

    function tokenBase(stream, state) {
      var ch = stream.next();

      // call hooks from the mime type
      if (hooks[ch]) {
        var result = hooks[ch](stream, state);
        if (result !== false) return result;
      }

      if (support.hexNumber &&
        ((ch == "0" && stream.match(/^[xX][0-9a-fA-F]+/))
        || (ch == "x" || ch == "X") && stream.match(/^'[0-9a-fA-F]+'/))) {
        // hex
        // ref: http://dev.mysql.com/doc/refman/5.5/en/hexadecimal-literals.html
        return "number";
      } else if (support.binaryNumber &&
        (((ch == "b" || ch == "B") && stream.match(/^'[01]+'/))
        || (ch == "0" && stream.match(/^b[01]+/)))) {
        // bitstring
        // ref: http://dev.mysql.com/doc/refman/5.5/en/bit-field-literals.html
        return "number";
      } else if (ch.charCodeAt(0) > 47 && ch.charCodeAt(0) < 58) {
        // numbers
        // ref: http://dev.mysql.com/doc/refman/5.5/en/number-literals.html
        stream.match(/^[0-9]*(\.[0-9]+)?([eE][-+]?[0-9]+)?/);
        support.decimallessFloat && stream.match(/^\.(?!\.)/);
        return "number";
      } else if (ch == "?" && (stream.eatSpace() || stream.eol() || stream.eat(";"))) {
        // placeholders
        return "variable-3";
      } else if (ch == "'" || (ch == '"' && support.doubleQuote)) {
        // strings
        // ref: http://dev.mysql.com/doc/refman/5.5/en/string-literals.html
        state.tokenize = tokenLiteral(ch);
        return state.tokenize(stream, state);
      } else if ((((support.nCharCast && (ch == "n" || ch == "N"))
          || (support.charsetCast && ch == "_" && stream.match(/[a-z][a-z0-9]*/i)))
          && (stream.peek() == "'" || stream.peek() == '"'))) {
        // charset casting: _utf8'str', N'str', n'str'
        // ref: http://dev.mysql.com/doc/refman/5.5/en/string-literals.html
        return "keyword";
      } else if (/^[\(\),\;\[\]]/.test(ch)) {
        // no highlighting
        return null;
      } else if (support.commentSlashSlash && ch == "/" && stream.eat("/")) {
        // 1-line comment
        stream.skipToEnd();
        return "comment";
      } else if ((support.commentHash && ch == "#")
          || (ch == "-" && stream.eat("-") && (!support.commentSpaceRequired || stream.eat(" ")))) {
        // 1-line comments
        // ref: https://kb.askmonty.org/en/comment-syntax/
        stream.skipToEnd();
        return "comment";
      } else if (ch == "/" && stream.eat("*")) {
        // multi-line comments
        // ref: https://kb.askmonty.org/en/comment-syntax/
        state.tokenize = tokenComment(1);
        return state.tokenize(stream, state);
      } else if (ch == ".") {
        // .1 for 0.1
        if (support.zerolessFloat && stream.match(/^(?:\d+(?:e[+-]?\d+)?)/i))
          return "number";
        if (stream.match(/^\.+/))
          return null
        // .table_name (ODBC)
        // // ref: http://dev.mysql.com/doc/refman/5.6/en/identifier-qualifiers.html
        if (support.ODBCdotTable && stream.match(/^[\w\d_]+/))
          return "variable-2";
      } else if (operatorChars.test(ch)) {
        // operators
        stream.eatWhile(operatorChars);
        return null;
      } else if (ch == '{' &&
          (stream.match(/^( )*(d|D|t|T|ts|TS)( )*'[^']*'( )*}/) || stream.match(/^( )*(d|D|t|T|ts|TS)( )*"[^"]*"( )*}/))) {
        // dates (weird ODBC syntax)
        // ref: http://dev.mysql.com/doc/refman/5.5/en/date-and-time-literals.html
        return "number";
      } else {
        stream.eatWhile(/^[_\w\d]/);
        var word = stream.current().toLowerCase();
        // dates (standard SQL syntax)
        // ref: http://dev.mysql.com/doc/refman/5.5/en/date-and-time-literals.html
        if (dateSQL.hasOwnProperty(word) && (stream.match(/^( )+'[^']*'/) || stream.match(/^( )+"[^"]*"/)))
          return "number";
        if (atoms.hasOwnProperty(word)) return "atom";
        if (builtin.hasOwnProperty(word)) return "builtin";
        if (keywords.hasOwnProperty(word)) return "keyword";
        if (client.hasOwnProperty(word)) return "string-2";
        return null;
      }
    }

    // 'string', with char specified in quote escaped by '\'
    function tokenLiteral(quote) {
      return function(stream, state) {
        var escaped = false, ch;
        while ((ch = stream.next()) != null) {
          if (ch == quote && !escaped) {
            state.tokenize = tokenBase;
            break;
          }
          escaped = !escaped && ch == "\\";
        }
        return "string";
      };
    }
    function tokenComment(depth) {
      return function(stream, state) {
        var m = stream.match(/^.*?(\/\*|\*\/)/)
        if (!m) stream.skipToEnd()
        else if (m[1] == "/*") state.tokenize = tokenComment(depth + 1)
        else if (depth > 1) state.tokenize = tokenComment(depth - 1)
        else state.tokenize = tokenBase
        return "comment"
      }
    }

    function pushContext(stream, state, type) {
      state.context = {
        prev: state.context,
        indent: stream.indentation(),
        col: stream.column(),
        type: type
      };
    }

    function popContext(state) {
      state.indent = state.context.indent;
      state.context = state.context.prev;
    }

    return {
      startState: function() {
        return {tokenize: tokenBase, context: null};
      },

      token: function(stream, state) {
        if (stream.sol()) {
          if (state.context && state.context.align == null)
            state.context.align = false;
        }
        if (state.tokenize == tokenBase && stream.eatSpace()) return null;

        var style = state.tokenize(stream, state);
        if (style == "comment") return style;

        if (state.context && state.context.align == null)
          state.context.align = true;

        var tok = stream.current();
        if (tok == "(")
          pushContext(stream, state, ")");
        else if (tok == "[")
          pushContext(stream, state, "]");
        else if (state.context && state.context.type == tok)
          popContext(state);
        return style;
      },

      indent: function(state, textAfter) {
        var cx = state.context;
        if (!cx) return CodeMirror.Pass;
        var closing = textAfter.charAt(0) == cx.type;
        if (cx.align) return cx.col + (closing ? 0 : 1);
        else return cx.indent + (closing ? 0 : config.indentUnit);
      },

      blockCommentStart: "/*",
      blockCommentEnd: "*/",
      lineComment: support.commentSlashSlash ? "//" : support.commentHash ? "#" : "--"
    };
  });

  (function() {
    "use strict";

    // `identifier`
    function hookIdentifier(stream) {
      // MySQL/MariaDB identifiers
      // ref: http://dev.mysql.com/doc/refman/5.6/en/identifier-qualifiers.html
      var ch;
      while ((ch = stream.next()) != null) {
        if (ch == "`" && !stream.eat("`")) return "variable-2";
      }
      stream.backUp(stream.current().length - 1);
      return stream.eatWhile(/\w/) ? "variable-2" : null;
    }

    // "identifier"
    function hookIdentifierDoublequote(stream) {
      // Standard SQL /SQLite identifiers
      // ref: http://web.archive.org/web/20160813185132/http://savage.net.au/SQL/sql-99.bnf.html#delimited%20identifier
      // ref: http://sqlite.org/lang_keywords.html
      var ch;
      while ((ch = stream.next()) != null) {
        if (ch == "\"" && !stream.eat("\"")) return "variable-2";
      }
      stream.backUp(stream.current().length - 1);
      return stream.eatWhile(/\w/) ? "variable-2" : null;
    }

    // variable token
    function hookVar(stream) {
      // variables
      // @@prefix.varName @varName
      // varName can be quoted with ` or ' or "
      // ref: http://dev.mysql.com/doc/refman/5.5/en/user-variables.html
      if (stream.eat("@")) {
        stream.match(/^session\./);
        stream.match(/^local\./);
        stream.match(/^global\./);
      }

      if (stream.eat("'")) {
        stream.match(/^.*'/);
        return "variable-2";
      } else if (stream.eat('"')) {
        stream.match(/^.*"/);
        return "variable-2";
      } else if (stream.eat("`")) {
        stream.match(/^.*`/);
        return "variable-2";
      } else if (stream.match(/^[0-9a-zA-Z$\.\_]+/)) {
        return "variable-2";
      }
      return null;
    };

    // short client keyword token
    function hookClient(stream) {
      // \N means NULL
      // ref: http://dev.mysql.com/doc/refman/5.5/en/null-values.html
      if (stream.eat("N")) {
          return "atom";
      }
      // \g, etc
      // ref: http://dev.mysql.com/doc/refman/5.5/en/mysql-commands.html
      return stream.match(/^[a-zA-Z.#!?]/) ? "variable-2" : null;
    }

    // these keywords are used by all SQL dialects (however, a mode can still overwrite it)
    var sqlKeywords = "alter and as asc between by count create delete desc distinct drop from group having in insert into is join like not on or order select set table union update values where limit ";

    // turn a space-separated list into an array
    function set(str) {
      var obj = {}, words = str.split(" ");
      for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
      return obj;
    }

    // A generic SQL Mode. It's not a standard, it just try to support what is generally supported
    CodeMirror.defineMIME("text/x-sql", {
      name: "sql",
      keywords: set(sqlKeywords + "begin"),
      builtin: set("bool boolean bit blob enum long longblob longtext medium mediumblob mediumint mediumtext time timestamp tinyblob tinyint tinytext text bigint int int1 int2 int3 int4 int8 integer float float4 float8 double char varbinary varchar varcharacter precision real date datetime year unsigned signed decimal numeric"),
      atoms: set("false true null unknown"),
      operatorChars: /^[*+\-%<>!=]/,
      dateSQL: set("date time timestamp"),
      support: set("ODBCdotTable doubleQuote binaryNumber hexNumber")
    });


     // A generic SQL Mode. It's not a standard, it just try to support what is generally supported
    CodeMirror.defineMIME("text/x-camlsql", {
      name: "sql",
      keywords: set("select order or by and desc limit where like "),
      builtin: set("kaka"),
      atoms: set("null unknown"),
      operatorChars: /^[*+\-%<>!=]/,
      dateSQL: set(""),
      support: set("ODBCdotTable doubleQuote binaryNumber hexNumber")
    });

    CodeMirror.defineMIME("text/x-mssql", {
      name: "sql",
      client: set("charset clear connect edit ego exit go help nopager notee nowarning pager print prompt quit rehash source status system tee"),
      keywords: set(sqlKeywords + "begin trigger proc view index for add constraint key primary foreign collate clustered nonclustered declare exec"),
      builtin: set("bigint numeric bit smallint decimal smallmoney int tinyint money float real char varchar text nchar nvarchar ntext binary varbinary image cursor timestamp hierarchyid uniqueidentifier sql_variant xml table "),
      atoms: set("false true null unknown"),
      operatorChars: /^[*+\-%<>!=]/,
      dateSQL: set("date datetimeoffset datetime2 smalldatetime datetime time"),
      hooks: {
        "@":   hookVar
      }
    });

    CodeMirror.defineMIME("text/x-mysql", {
      name: "sql",
      client: set("charset clear connect edit ego exit go help nopager notee nowarning pager print prompt quit rehash source status system tee"),
      keywords: set(sqlKeywords + "accessible action add after algorithm all analyze asensitive at authors auto_increment autocommit avg avg_row_length before binary binlog both btree cache call cascade cascaded case catalog_name chain change changed character check checkpoint checksum class_origin client_statistics close coalesce code collate collation collations column columns comment commit committed completion concurrent condition connection consistent constraint contains continue contributors convert cross current current_date current_time current_timestamp current_user cursor data database databases day_hour day_microsecond day_minute day_second deallocate dec declare default delay_key_write delayed delimiter des_key_file describe deterministic dev_pop dev_samp deviance diagnostics directory disable discard distinctrow div dual dumpfile each elseif enable enclosed end ends engine engines enum errors escape escaped even event events every execute exists exit explain extended fast fetch field fields first flush for force foreign found_rows full fulltext function general get global grant grants group group_concat handler hash help high_priority hosts hour_microsecond hour_minute hour_second if ignore ignore_server_ids import index index_statistics infile inner innodb inout insensitive insert_method install interval invoker isolation iterate key keys kill language last leading leave left level limit linear lines list load local localtime localtimestamp lock logs low_priority master master_heartbeat_period master_ssl_verify_server_cert masters match max max_rows maxvalue message_text middleint migrate min min_rows minute_microsecond minute_second mod mode modifies modify mutex mysql_errno natural next no no_write_to_binlog offline offset one online open optimize option optionally out outer outfile pack_keys parser partition partitions password phase plugin plugins prepare preserve prev primary privileges procedure processlist profile profiles purge query quick range read read_write reads real rebuild recover references regexp relaylog release remove rename reorganize repair repeatable replace require resignal restrict resume return returns revoke right rlike rollback rollup row row_format rtree savepoint schedule schema schema_name schemas second_microsecond security sensitive separator serializable server session share show signal slave slow smallint snapshot soname spatial specific sql sql_big_result sql_buffer_result sql_cache sql_calc_found_rows sql_no_cache sql_small_result sqlexception sqlstate sqlwarning ssl start starting starts status std stddev stddev_pop stddev_samp storage straight_join subclass_origin sum suspend table_name table_statistics tables tablespace temporary terminated to trailing transaction trigger triggers truncate uncommitted undo uninstall unique unlock upgrade usage use use_frm user user_resources user_statistics using utc_date utc_time utc_timestamp value variables varying view views warnings when while with work write xa xor year_month zerofill begin do then else loop repeat"),
      builtin: set("bool boolean bit blob decimal double float long longblob longtext medium mediumblob mediumint mediumtext time timestamp tinyblob tinyint tinytext text bigint int int1 int2 int3 int4 int8 integer float float4 float8 double char varbinary varchar varcharacter precision date datetime year unsigned signed numeric"),
      atoms: set("false true null unknown"),
      operatorChars: /^[*+\-%<>!=&|^]/,
      dateSQL: set("date time timestamp"),
      support: set("ODBCdotTable decimallessFloat zerolessFloat binaryNumber hexNumber doubleQuote nCharCast charsetCast commentHash commentSpaceRequired"),
      hooks: {
        "@":   hookVar,
        "`":   hookIdentifier,
        "\\":  hookClient
      }
    });

    CodeMirror.defineMIME("text/x-mariadb", {
      name: "sql",
      client: set("charset clear connect edit ego exit go help nopager notee nowarning pager print prompt quit rehash source status system tee"),
      keywords: set(sqlKeywords + "accessible action add after algorithm all always analyze asensitive at authors auto_increment autocommit avg avg_row_length before binary binlog both btree cache call cascade cascaded case catalog_name chain change changed character check checkpoint checksum class_origin client_statistics close coalesce code collate collation collations column columns comment commit committed completion concurrent condition connection consistent constraint contains continue contributors convert cross current current_date current_time current_timestamp current_user cursor data database databases day_hour day_microsecond day_minute day_second deallocate dec declare default delay_key_write delayed delimiter des_key_file describe deterministic dev_pop dev_samp deviance diagnostics directory disable discard distinctrow div dual dumpfile each elseif enable enclosed end ends engine engines enum errors escape escaped even event events every execute exists exit explain extended fast fetch field fields first flush for force foreign found_rows full fulltext function general generated get global grant grants group groupby_concat handler hard hash help high_priority hosts hour_microsecond hour_minute hour_second if ignore ignore_server_ids import index index_statistics infile inner innodb inout insensitive insert_method install interval invoker isolation iterate key keys kill language last leading leave left level limit linear lines list load local localtime localtimestamp lock logs low_priority master master_heartbeat_period master_ssl_verify_server_cert masters match max max_rows maxvalue message_text middleint migrate min min_rows minute_microsecond minute_second mod mode modifies modify mutex mysql_errno natural next no no_write_to_binlog offline offset one online open optimize option optionally out outer outfile pack_keys parser partition partitions password persistent phase plugin plugins prepare preserve prev primary privileges procedure processlist profile profiles purge query quick range read read_write reads real rebuild recover references regexp relaylog release remove rename reorganize repair repeatable replace require resignal restrict resume return returns revoke right rlike rollback rollup row row_format rtree savepoint schedule schema schema_name schemas second_microsecond security sensitive separator serializable server session share show shutdown signal slave slow smallint snapshot soft soname spatial specific sql sql_big_result sql_buffer_result sql_cache sql_calc_found_rows sql_no_cache sql_small_result sqlexception sqlstate sqlwarning ssl start starting starts status std stddev stddev_pop stddev_samp storage straight_join subclass_origin sum suspend table_name table_statistics tables tablespace temporary terminated to trailing transaction trigger triggers truncate uncommitted undo uninstall unique unlock upgrade usage use use_frm user user_resources user_statistics using utc_date utc_time utc_timestamp value variables varying view views virtual warnings when while with work write xa xor year_month zerofill begin do then else loop repeat"),
      builtin: set("bool boolean bit blob decimal double float long longblob longtext medium mediumblob mediumint mediumtext time timestamp tinyblob tinyint tinytext text bigint int int1 int2 int3 int4 int8 integer float float4 float8 double char varbinary varchar varcharacter precision date datetime year unsigned signed numeric"),
      atoms: set("false true null unknown"),
      operatorChars: /^[*+\-%<>!=&|^]/,
      dateSQL: set("date time timestamp"),
      support: set("ODBCdotTable decimallessFloat zerolessFloat binaryNumber hexNumber doubleQuote nCharCast charsetCast commentHash commentSpaceRequired"),
      hooks: {
        "@":   hookVar,
        "`":   hookIdentifier,
        "\\":  hookClient
      }
    });

    // provided by the phpLiteAdmin project - phpliteadmin.org
    CodeMirror.defineMIME("text/x-sqlite", {
      name: "sql",
      // commands of the official SQLite client, ref: https://www.sqlite.org/cli.html#dotcmd
      client: set("auth backup bail binary changes check clone databases dbinfo dump echo eqp exit explain fullschema headers help import imposter indexes iotrace limit lint load log mode nullvalue once open output print prompt quit read restore save scanstats schema separator session shell show stats system tables testcase timeout timer trace vfsinfo vfslist vfsname width"),
      // ref: http://sqlite.org/lang_keywords.html
      keywords: set(sqlKeywords + "abort action add after all analyze attach autoincrement before begin cascade case cast check collate column commit conflict constraint cross current_date current_time current_timestamp database default deferrable deferred detach each else end escape except exclusive exists explain fail for foreign full glob if ignore immediate index indexed initially inner instead intersect isnull key left limit match natural no notnull null of offset outer plan pragma primary query raise recursive references regexp reindex release rename replace restrict right rollback row savepoint temp temporary then to transaction trigger unique using vacuum view virtual when with without"),
      // SQLite is weakly typed, ref: http://sqlite.org/datatype3.html. This is just a list of some common types.
      builtin: set("bool boolean bit blob decimal double float long longblob longtext medium mediumblob mediumint mediumtext time timestamp tinyblob tinyint tinytext text clob bigint int int2 int8 integer float double char varchar date datetime year unsigned signed numeric real"),
      // ref: http://sqlite.org/syntax/literal-value.html
      atoms: set("null current_date current_time current_timestamp"),
      // ref: http://sqlite.org/lang_expr.html#binaryops
      operatorChars: /^[*+\-%<>!=&|/~]/,
      // SQLite is weakly typed, ref: http://sqlite.org/datatype3.html. This is just a list of some common types.
      dateSQL: set("date time timestamp datetime"),
      support: set("decimallessFloat zerolessFloat"),
      identifierQuote: "\"",  //ref: http://sqlite.org/lang_keywords.html
      hooks: {
        // bind-parameters ref:http://sqlite.org/lang_expr.html#varparam
        "@":   hookVar,
        ":":   hookVar,
        "?":   hookVar,
        "$":   hookVar,
        // The preferred way to escape Identifiers is using double quotes, ref: http://sqlite.org/lang_keywords.html
        "\"":   hookIdentifierDoublequote,
        // there is also support for backtics, ref: http://sqlite.org/lang_keywords.html
        "`":   hookIdentifier
      }
    });

    // the query language used by Apache Cassandra is called CQL, but this mime type
    // is called Cassandra to avoid confusion with Contextual Query Language
    CodeMirror.defineMIME("text/x-cassandra", {
      name: "sql",
      client: { },
      keywords: set("add all allow alter and any apply as asc authorize batch begin by clustering columnfamily compact consistency count create custom delete desc distinct drop each_quorum exists filtering from grant if in index insert into key keyspace keyspaces level limit local_one local_quorum modify nan norecursive nosuperuser not of on one order password permission permissions primary quorum rename revoke schema select set storage superuser table three to token truncate ttl two type unlogged update use user users using values where with writetime"),
      builtin: set("ascii bigint blob boolean counter decimal double float frozen inet int list map static text timestamp timeuuid tuple uuid varchar varint"),
      atoms: set("false true infinity NaN"),
      operatorChars: /^[<>=]/,
      dateSQL: { },
      support: set("commentSlashSlash decimallessFloat"),
      hooks: { }
    });

    // this is based on Peter Raganitsch's 'plsql' mode
    CodeMirror.defineMIME("text/x-plsql", {
      name:       "sql",
      client:     set("appinfo arraysize autocommit autoprint autorecovery autotrace blockterminator break btitle cmdsep colsep compatibility compute concat copycommit copytypecheck define describe echo editfile embedded escape exec execute feedback flagger flush heading headsep instance linesize lno loboffset logsource long longchunksize markup native newpage numformat numwidth pagesize pause pno recsep recsepchar release repfooter repheader serveroutput shiftinout show showmode size spool sqlblanklines sqlcase sqlcode sqlcontinue sqlnumber sqlpluscompatibility sqlprefix sqlprompt sqlterminator suffix tab term termout time timing trimout trimspool ttitle underline verify version wrap"),
      keywords:   set("abort accept access add all alter and any array arraylen as asc assert assign at attributes audit authorization avg base_table begin between binary_integer body boolean by case cast char char_base check close cluster clusters colauth column comment commit compress connect connected constant constraint crash create current currval cursor data_base database date dba deallocate debugoff debugon decimal declare default definition delay delete desc digits dispose distinct do drop else elseif elsif enable end entry escape exception exception_init exchange exclusive exists exit external fast fetch file for force form from function generic goto grant group having identified if immediate in increment index indexes indicator initial initrans insert interface intersect into is key level library like limited local lock log logging long loop master maxextents maxtrans member minextents minus mislabel mode modify multiset new next no noaudit nocompress nologging noparallel not nowait number_base object of off offline on online only open option or order out package parallel partition pctfree pctincrease pctused pls_integer positive positiven pragma primary prior private privileges procedure public raise range raw read rebuild record ref references refresh release rename replace resource restrict return returning returns reverse revoke rollback row rowid rowlabel rownum rows run savepoint schema segment select separate session set share snapshot some space split sql start statement storage subtype successful synonym tabauth table tables tablespace task terminate then to trigger truncate type union unique unlimited unrecoverable unusable update use using validate value values variable view views when whenever where while with work"),
      builtin:    set("abs acos add_months ascii asin atan atan2 average bfile bfilename bigserial bit blob ceil character chartorowid chr clob concat convert cos cosh count dec decode deref dual dump dup_val_on_index empty error exp false float floor found glb greatest hextoraw initcap instr instrb int integer isopen last_day least length lengthb ln lower lpad ltrim lub make_ref max min mlslabel mod months_between natural naturaln nchar nclob new_time next_day nextval nls_charset_decl_len nls_charset_id nls_charset_name nls_initcap nls_lower nls_sort nls_upper nlssort no_data_found notfound null number numeric nvarchar2 nvl others power rawtohex real reftohex round rowcount rowidtochar rowtype rpad rtrim serial sign signtype sin sinh smallint soundex sqlcode sqlerrm sqrt stddev string substr substrb sum sysdate tan tanh to_char text to_date to_label to_multi_byte to_number to_single_byte translate true trunc uid unlogged upper user userenv varchar varchar2 variance varying vsize xml"),
      operatorChars: /^[*+\-%<>!=~]/,
      dateSQL:    set("date time timestamp"),
      support:    set("doubleQuote nCharCast zerolessFloat binaryNumber hexNumber")
    });

    // Created to support specific hive keywords
    CodeMirror.defineMIME("text/x-hive", {
      name: "sql",
      keywords: set("select alter $elem$ $key$ $value$ add after all analyze and archive as asc before between binary both bucket buckets by cascade case cast change cluster clustered clusterstatus collection column columns comment compute concatenate continue create cross cursor data database databases dbproperties deferred delete delimited desc describe directory disable distinct distribute drop else enable end escaped exclusive exists explain export extended external false fetch fields fileformat first format formatted from full function functions grant group having hold_ddltime idxproperties if import in index indexes inpath inputdriver inputformat insert intersect into is items join keys lateral left like limit lines load local location lock locks mapjoin materialized minus msck no_drop nocompress not of offline on option or order out outer outputdriver outputformat overwrite partition partitioned partitions percent plus preserve procedure purge range rcfile read readonly reads rebuild recordreader recordwriter recover reduce regexp rename repair replace restrict revoke right rlike row schema schemas semi sequencefile serde serdeproperties set shared show show_database sort sorted ssl statistics stored streamtable table tables tablesample tblproperties temporary terminated textfile then tmp to touch transform trigger true unarchive undo union uniquejoin unlock update use using utc utc_tmestamp view when where while with"),
      builtin: set("bool boolean long timestamp tinyint smallint bigint int float double date datetime unsigned string array struct map uniontype"),
      atoms: set("false true null unknown"),
      operatorChars: /^[*+\-%<>!=]/,
      dateSQL: set("date timestamp"),
      support: set("ODBCdotTable doubleQuote binaryNumber hexNumber")
    });

    CodeMirror.defineMIME("text/x-pgsql", {
      name: "sql",
      client: set("source"),
      // https://www.postgresql.org/docs/10/static/sql-keywords-appendix.html
      keywords: set(sqlKeywords + "a abort abs absent absolute access according action ada add admin after aggregate all allocate also always analyse analyze any are array array_agg array_max_cardinality asensitive assertion assignment asymmetric at atomic attribute attributes authorization avg backward base64 before begin begin_frame begin_partition bernoulli binary bit_length blob blocked bom both breadth c cache call called cardinality cascade cascaded case cast catalog catalog_name ceil ceiling chain characteristics characters character_length character_set_catalog character_set_name character_set_schema char_length check checkpoint class class_origin clob close cluster coalesce cobol collate collation collation_catalog collation_name collation_schema collect column columns column_name command_function command_function_code comment comments commit committed concurrently condition condition_number configuration conflict connect connection connection_name constraint constraints constraint_catalog constraint_name constraint_schema constructor contains content continue control conversion convert copy corr corresponding cost covar_pop covar_samp cross csv cube cume_dist current current_catalog current_date current_default_transform_group current_path current_role current_row current_schema current_time current_timestamp current_transform_group_for_type current_user cursor cursor_name cycle data database datalink datetime_interval_code datetime_interval_precision day db deallocate dec declare default defaults deferrable deferred defined definer degree delimiter delimiters dense_rank depth deref derived describe descriptor deterministic diagnostics dictionary disable discard disconnect dispatch dlnewcopy dlpreviouscopy dlurlcomplete dlurlcompleteonly dlurlcompletewrite dlurlpath dlurlpathonly dlurlpathwrite dlurlscheme dlurlserver dlvalue do document domain dynamic dynamic_function dynamic_function_code each element else empty enable encoding encrypted end end-exec end_frame end_partition enforced enum equals escape event every except exception exclude excluding exclusive exec execute exists exp explain expression extension external extract false family fetch file filter final first first_value flag float floor following for force foreign fortran forward found frame_row free freeze fs full function functions fusion g general generated get global go goto grant granted greatest grouping groups handler header hex hierarchy hold hour id identity if ignore ilike immediate immediately immutable implementation implicit import including increment indent index indexes indicator inherit inherits initially inline inner inout input insensitive instance instantiable instead integrity intersect intersection invoker isnull isolation k key key_member key_type label lag language large last last_value lateral lead leading leakproof least left length level library like_regex link listen ln load local localtime localtimestamp location locator lock locked logged lower m map mapping match matched materialized max maxvalue max_cardinality member merge message_length message_octet_length message_text method min minute minvalue mod mode modifies module month more move multiset mumps name names namespace national natural nchar nclob nesting new next nfc nfd nfkc nfkd nil no none normalize normalized nothing notify notnull nowait nth_value ntile null nullable nullif nulls number object occurrences_regex octets octet_length of off offset oids old only open operator option options ordering ordinality others out outer output over overlaps overlay overriding owned owner p pad parallel parameter parameter_mode parameter_name parameter_ordinal_position parameter_specific_catalog parameter_specific_name parameter_specific_schema parser partial partition pascal passing passthrough password percent percentile_cont percentile_disc percent_rank period permission placing plans pli policy portion position position_regex power precedes preceding prepare prepared preserve primary prior privileges procedural procedure program public quote range rank read reads reassign recheck recovery recursive ref references referencing refresh regr_avgx regr_avgy regr_count regr_intercept regr_r2 regr_slope regr_sxx regr_sxy regr_syy reindex relative release rename repeatable replace replica requiring reset respect restart restore restrict restricted result return returned_cardinality returned_length returned_octet_length returned_sqlstate returning returns revoke right role rollback rollup routine routine_catalog routine_name routine_schema row rows row_count row_number rule savepoint scale schema schema_name scope scope_catalog scope_name scope_schema scroll search second section security selective self sensitive sequence sequences serializable server server_name session session_user setof sets share show similar simple size skip snapshot some source space specific specifictype specific_name sql sqlcode sqlerror sqlexception sqlstate sqlwarning sqrt stable standalone start state statement static statistics stddev_pop stddev_samp stdin stdout storage strict strip structure style subclass_origin submultiset substring substring_regex succeeds sum symmetric sysid system system_time system_user t tables tablesample tablespace table_name temp template temporary then ties timezone_hour timezone_minute to token top_level_count trailing transaction transactions_committed transactions_rolled_back transaction_active transform transforms translate translate_regex translation treat trigger trigger_catalog trigger_name trigger_schema trim trim_array true truncate trusted type types uescape unbounded uncommitted under unencrypted unique unknown unlink unlisten unlogged unnamed unnest until untyped upper uri usage user user_defined_type_catalog user_defined_type_code user_defined_type_name user_defined_type_schema using vacuum valid validate validator value value_of varbinary variadic var_pop var_samp verbose version versioning view views volatile when whenever whitespace width_bucket window within work wrapper write xmlagg xmlattributes xmlbinary xmlcast xmlcomment xmlconcat xmldeclaration xmldocument xmlelement xmlexists xmlforest xmliterate xmlnamespaces xmlparse xmlpi xmlquery xmlroot xmlschema xmlserialize xmltable xmltext xmlvalidate year yes loop repeat attach path depends detach zone"),
      // https://www.postgresql.org/docs/10/static/datatype.html
      builtin: set("bigint int8 bigserial serial8 bit varying varbit boolean bool box bytea character char varchar cidr circle date double precision float8 inet integer int int4 interval json jsonb line lseg macaddr macaddr8 money numeric decimal path pg_lsn point polygon real float4 smallint int2 smallserial serial2 serial serial4 text time without zone with timetz timestamp timestamptz tsquery tsvector txid_snapshot uuid xml"),
      atoms: set("false true null unknown"),
      operatorChars: /^[*+\-%<>!=&|^\/#@?~]/,
      dateSQL: set("date time timestamp"),
      support: set("ODBCdotTable decimallessFloat zerolessFloat binaryNumber hexNumber nCharCast charsetCast")
    });

    // Google's SQL-like query language, GQL
    CodeMirror.defineMIME("text/x-gql", {
      name: "sql",
      keywords: set("ancestor and asc by contains desc descendant distinct from group has in is limit offset on order select superset where"),
      atoms: set("false true"),
      builtin: set("blob datetime first key __key__ string integer double boolean null"),
      operatorChars: /^[*+\-%<>!=]/
    });

    // Greenplum
    CodeMirror.defineMIME("text/x-gpsql", {
      name: "sql",
      client: set("source"),
      //https://github.com/greenplum-db/gpdb/blob/master/src/include/parser/kwlist.h
      keywords: set("abort absolute access action active add admin after aggregate all also alter always analyse analyze and any array as asc assertion assignment asymmetric at authorization backward before begin between bigint binary bit boolean both by cache called cascade cascaded case cast chain char character characteristics check checkpoint class close cluster coalesce codegen collate column comment commit committed concurrency concurrently configuration connection constraint constraints contains content continue conversion copy cost cpu_rate_limit create createdb createexttable createrole createuser cross csv cube current current_catalog current_date current_role current_schema current_time current_timestamp current_user cursor cycle data database day deallocate dec decimal declare decode default defaults deferrable deferred definer delete delimiter delimiters deny desc dictionary disable discard distinct distributed do document domain double drop dxl each else enable encoding encrypted end enum errors escape every except exchange exclude excluding exclusive execute exists explain extension external extract false family fetch fields filespace fill filter first float following for force foreign format forward freeze from full function global grant granted greatest group group_id grouping handler hash having header hold host hour identity if ignore ilike immediate immutable implicit in including inclusive increment index indexes inherit inherits initially inline inner inout input insensitive insert instead int integer intersect interval into invoker is isnull isolation join key language large last leading least left level like limit list listen load local localtime localtimestamp location lock log login mapping master match maxvalue median merge minute minvalue missing mode modifies modify month move name names national natural nchar new newline next no nocreatedb nocreateexttable nocreaterole nocreateuser noinherit nologin none noovercommit nosuperuser not nothing notify notnull nowait null nullif nulls numeric object of off offset oids old on only operator option options or order ordered others out outer over overcommit overlaps overlay owned owner parser partial partition partitions passing password percent percentile_cont percentile_disc placing plans position preceding precision prepare prepared preserve primary prior privileges procedural procedure protocol queue quote randomly range read readable reads real reassign recheck recursive ref references reindex reject relative release rename repeatable replace replica reset resource restart restrict returning returns revoke right role rollback rollup rootpartition row rows rule savepoint scatter schema scroll search second security segment select sequence serializable session session_user set setof sets share show similar simple smallint some split sql stable standalone start statement statistics stdin stdout storage strict strip subpartition subpartitions substring superuser symmetric sysid system table tablespace temp template temporary text then threshold ties time timestamp to trailing transaction treat trigger trim true truncate trusted type unbounded uncommitted unencrypted union unique unknown unlisten until update user using vacuum valid validation validator value values varchar variadic varying verbose version view volatile web when where whitespace window with within without work writable write xml xmlattributes xmlconcat xmlelement xmlexists xmlforest xmlparse xmlpi xmlroot xmlserialize year yes zone"),
      builtin: set("bigint int8 bigserial serial8 bit varying varbit boolean bool box bytea character char varchar cidr circle date double precision float float8 inet integer int int4 interval json jsonb line lseg macaddr macaddr8 money numeric decimal path pg_lsn point polygon real float4 smallint int2 smallserial serial2 serial serial4 text time without zone with timetz timestamp timestamptz tsquery tsvector txid_snapshot uuid xml"),
      atoms: set("false true null unknown"),
      operatorChars: /^[*+\-%<>!=&|^\/#@?~]/,
      dateSQL: set("date time timestamp"),
      support: set("ODBCdotTable decimallessFloat zerolessFloat binaryNumber hexNumber nCharCast charsetCast")
    });

    // Spark SQL
    CodeMirror.defineMIME("text/x-sparksql", {
      name: "sql",
      keywords: set("add after all alter analyze and anti archive array as asc at between bucket buckets by cache cascade case cast change clear cluster clustered codegen collection column columns comment commit compact compactions compute concatenate cost create cross cube current current_date current_timestamp database databases datata dbproperties defined delete delimited desc describe dfs directories distinct distribute drop else end escaped except exchange exists explain export extended external false fields fileformat first following for format formatted from full function functions global grant group grouping having if ignore import in index indexes inner inpath inputformat insert intersect interval into is items join keys last lateral lazy left like limit lines list load local location lock locks logical macro map minus msck natural no not null nulls of on option options or order out outer outputformat over overwrite partition partitioned partitions percent preceding principals purge range recordreader recordwriter recover reduce refresh regexp rename repair replace reset restrict revoke right rlike role roles rollback rollup row rows schema schemas select semi separated serde serdeproperties set sets show skewed sort sorted start statistics stored stratify struct table tables tablesample tblproperties temp temporary terminated then to touch transaction transactions transform true truncate unarchive unbounded uncache union unlock unset use using values view when where window with"),
      builtin: set("tinyint smallint int bigint boolean float double string binary timestamp decimal array map struct uniontype delimited serde sequencefile textfile rcfile inputformat outputformat"),
      atoms: set("false true null"),
      operatorChars: /^[*+\-%<>!=~&|^]/,
      dateSQL: set("date time timestamp"),
      support: set("ODBCdotTable doubleQuote zerolessFloat")
    });

    // Esper
    CodeMirror.defineMIME("text/x-esper", {
      name: "sql",
      client: set("source"),
      // http://www.espertech.com/esper/release-5.5.0/esper-reference/html/appendix_keywords.html
      keywords: set("alter and as asc between by count create delete desc distinct drop from group having in insert into is join like not on or order select set table union update values where limit after all and as at asc avedev avg between by case cast coalesce count create current_timestamp day days delete define desc distinct else end escape events every exists false first from full group having hour hours in inner insert instanceof into irstream is istream join last lastweekday left limit like max match_recognize matches median measures metadatasql min minute minutes msec millisecond milliseconds not null offset on or order outer output partition pattern prev prior regexp retain-union retain-intersection right rstream sec second seconds select set some snapshot sql stddev sum then true unidirectional until update variable weekday when where window"),
      builtin: {},
      atoms: set("false true null"),
      operatorChars: /^[*+\-%<>!=&|^\/#@?~]/,
      dateSQL: set("time"),
      support: set("decimallessFloat zerolessFloat binaryNumber hexNumber")
    });
  }());

  });

  /*
    How Properties of Mime Types are used by SQL Mode
    =================================================

    keywords:
      A list of keywords you want to be highlighted.
    builtin:
      A list of builtin types you want to be highlighted (if you want types to be of class "builtin" instead of "keyword").
    operatorChars:
      All characters that must be handled as operators.
    client:
      Commands parsed and executed by the client (not the server).
    support:
      A list of supported syntaxes which are not common, but are supported by more than 1 DBMS.
      * ODBCdotTable: .tableName
      * zerolessFloat: .1
      * doubleQuote
      * nCharCast: N'string'
      * charsetCast: _utf8'string'
      * commentHash: use # char for comments
      * commentSlashSlash: use // for comments
      * commentSpaceRequired: require a space after -- for comments
    atoms:
      Keywords that must be highlighted as atoms,. Some DBMS's support more atoms than others:
      UNKNOWN, INFINITY, UNDERFLOW, NaN...
    dateSQL:
      Used for date/time SQL standard syntax, because not all DBMS's support same temporal types.
  */

  // END C:\git\camlsql-js\src\app\js\vendor\codemirror\sql.js

  // BEGIN C:\git\camlsql-js\src\app\js\managers\SharePointListManager.js*/
  var SharePointListManager = (function() {


  	/**
  	 * [getListItems description]
  	 * @param  {[object]} options [description]
  	 * @example
  	 * 		getListItems({
  	 *   		viewXml : '<View><Query>...',
  	 *    		listName : 'Announcements'
  	 *     	}).then(sucess, fail);
       *
  	 * @return {Q.promise}         Returns a promise
  	 */
  	function getListItems(options) {
  		//
  		// options.viewXml 
  		// options.listName 
  		//

  		// var camlBuilder = new cSql(clientContext, 
  		// 	"SELECT * FROM ListName WHERE [ID] = ? ORDER BY [Title] ASC", [ 
  		// 	cSql.Number(5) 
  		// ]).skip(3).take(5);

  		var deferred = Q.defer();

  		 var clientContext = SP.ClientContext.get_current();
  	     var oList = clientContext.get_web().get_lists().getByTitle(options.listName);
  	     var camlQuery = new SP.CamlQuery(); // https://msdn.microsoft.com/en-us/library/office/jj245851.aspx

  	     camlQuery.set_viewXml(options.viewXml);
  	     // <View><RowLimit>100</RowLimit></View>
  	     /*camlQuery.set_viewXml('<View><Query><Where><Geq><FieldRef Name=\'ID\'/>' + 
  	         '<Value Type=\'Number\'>1</Value></Geq></Where></Query><RowLimit>10</RowLimit></View>');*/

  	     this.collListItem = oList.getItems(camlQuery);
  	     clientContext.load(collListItem);
  	     // clientContext.load(collListItem, 'Include(Id, DisplayName, HasUniqueRoleAssignments)');
  	     clientContext.executeQueryAsync(Function.createDelegate(this, function() {
  	     	deferred.resolve({status : "success", data : []});
  	     }), Function.createDelegate(this, function() {
  	     	deferred.reject({status : "error", message : "Query failed"});
  	     }));
  	    return deferred.promise;
  	}

  	
  	return {
  		getListItems : getListItems
  	}


  }());
  // END C:\git\camlsql-js\src\app\js\managers\SharePointListManager.js

  // BEGIN C:\git\camlsql-js\src\app\js\vue\directives\ClipboardDirective.js*/
  Vue.directive('clipboard', {
    deep: true,
    bind: function (el, binding) {
      // on first bind, highlight all targets
      // 
      
      new Clipboard(el);




      // var targets = el.querySelectorAll('code')
      // targets.forEach((target) => {
      //   // if a value is directly assigned to the directive, use this
      //   // instead of the element content.
      //   if (binding.value) {
      //     target.textContent = binding.value
      //   }
      //   hljs.highlightBlock(target)
      // })
      
    },
    componentUpdated: function (el, binding) {
      // after an update, re-fill the content and then highlight
      // var targets = el.querySelectorAll('code')
      // targets.forEach((target) => {
      //   if (binding.value) {
      //     target.textContent = binding.value
      //     hljs.highlightBlock(target)
      //   }
      // })
    }
  })
  // END C:\git\camlsql-js\src\app\js\vue\directives\ClipboardDirective.js

  // BEGIN C:\git\camlsql-js\src\app\js\vue\directives\HighlightjsDirective.js*/
  Vue.directive('highlightjs', {
    deep: true,
    bind: function (el, binding) {
      // on first bind, highlight all targets
      var targets = el.querySelectorAll('code'), target;
      for (var i=0; i < targets.length; i++) {
        target = targets[i];
        if (binding.value) { 
          target.textContent = binding.value
          hljs.highlightBlock(target)
        }
      }
    },
    componentUpdated: function (el, binding) {
      // after an update, re-fill the content and then highlight
      var targets = el.querySelectorAll('code'), target;
      for (var i=0; i < targets.length; i++) {
        target = targets[i];
        if (binding.value) { 
          target.textContent = binding.value
          hljs.highlightBlock(target)
        }
      }
      
    }
  })
  // END C:\git\camlsql-js\src\app\js\vue\directives\HighlightjsDirective.js

  // BEGIN C:\git\camlsql-js\src\app\js\vue\components\ExamplesTabComponent.js*/

  var ExamplesTabComponent = { 
  	template: '#ExamplesTab-template',
  	mounted : function() {
  	 	setTimeout(PR.prettyPrint, 10);

  	 	var codemirrorTextArea = document.getElementById('codemirror');
  	 	window.cm = CodeMirror.fromTextArea(codemirrorTextArea, {
  	 		mode : 'text/x-camlsql',
  	 		lineNumbers: true,
  	 		extraKeys: {"Ctrl-Space": "autocomplete"},
  	 		hintOptions : {
  	 			tables : {
  		 				'Pages' : ['Title','Something', 'ID', 'Author'],
  		 				'Tasks' : ['Title', 'DueDate']
  		 			}
  	 		}
  	 	});


  	 	// cm.setOption("hintOptions", { "tables" : {"Tabellen" : ["Title", "ID"] } } );

  	},
  	methods : {
  		cutDownSql : function(s) {
  			if (s.length > 70) {
  				return s.substring(0, 67) + "...";
  			}
  			return s;
  		}, 
  		urifyString : function(str) {
  			str = str.toLowerCase();
  			var newString = "";
  			for (var i=0; i <  str.length; i++) {
  				if (str[i].match(/[a-z0-9-_]/)) {
  					newString += str[i];
  				} else if (str[i] == " ") {
  					newString += "-";
  				}
  			}
  			newString = newString.replace(/-{2,}/, '-');
  			return newString;
  		}
  	},
  	computed : {
  		examples : function() {
  		return this.globals.examples
  	}
  	},
  	data : function() {
  		return {
  			globals : appGlobals
  		} 
  	},
  	watch: {
  	    '$route' : function(to, from) {
  	      // react to route changes...
  	    } 
  	  }
  }
  // END C:\git\camlsql-js\src\app\js\vue\components\ExamplesTabComponent.js

  // BEGIN C:\git\camlsql-js\src\app\js\vue\components\GetStartedTabComponent.js*/

  var GetStartedTabComponent = { 
  	template: '#GetStartedTab-template',
  	mounted : function() {
  	 	setTimeout(PR.prettyPrint, 10);
  	},
  	watch: {
  	    '$route' : function(to, from) {
  	      // react to route changes...
  	    }
  	  }
  }
  // END C:\git\camlsql-js\src\app\js\vue\components\GetStartedTabComponent.js

  // BEGIN C:\git\camlsql-js\src\app\js\vue\components\LiveTabComponent.js*/

  var LiveTabComponent = { 
  	template: '#LiveTab-template',
  	mounted : function() {
  	 	// setTimeout(PR.prettyPrint, 10);
  	 	this.triggerRefresh();
  	},
  	data : function() {
  		return {
  			liveQuery : 'SELECT Title, Preamble, Image FROM [Pages] WHERE [Preamble] LIKE ? OR [Preamble] IS NULL',
  			liveTimeout : null,
  			parameters : [{type : "Text", value : "%Press release%", "name" : "@param0"}],
  			calculatedScript : "",
  			camlXml : '',
  			camlRawXml : '',
  			viewScope : "DefaultValue"
  		}
  	},
  	computed : {
  		 compressedQuery : function() {
  		 	if (this.liveQuery)
  		 		return LZString.compressToEncodedURIComponent(JSON.stringify({
  		 			query : this.liveQuery,
  		 			param : this.parameters,
  		 			viewScope : this.viewScope
  		 		}));
  		 	return "";
  		 }
  	}, 
  	watch: {	
  	    '$route' : function(to, from) {
  	      // react to route changes...
  	       this.triggerRefresh();
  	    },
  	    'liveQuery' : function(newValue) {
  	    	this.triggerRefresh();
  	    },
  	    'calculatedScript' : function() {
  				var f = document.querySelectorAll('pre.prettyprinted');
  	    		for (var i=0; i < f.length;i++) {
  	    			f[i].classList.remove('prettyprinted');	    			
  	    		}
  	    		setTimeout(PR.prettyPrint, 50);
  	    		this.highlightErrors();

  	    }
  	  },
  	  methods : {
  	  	highlightErrors : function() { 
  	  		setTimeout(function() {
  	    		var items = document.querySelectorAll(".hljs-name");
  				for (var i=0; i < items.length; i++) {
  				 if (items[i].innerText == "casql:Error") {
  				  items[i].style.color = "red"
  				 }
  				}
  			}, 100);
  	  	},
  	  	paramError : function(param) {
  	  		if (param.type == "Number" && isNaN(Number(param.value))) {
  	  			return "That's not a number";
  	  		} else if (param.type == "Today" && isNaN(Number(param.value))) {
  	  			return "Set a positive number for adding days, or a negative to subtract.";
  	  		}
  	  	},
  	  	showParamTextInput : function(param) {
  	  		if (param.type == "Now") 
  	  			return false;
  	  		return true;
  	  	},
  	  	triggerRefresh : function() {
  	  		var self = this;
  	    	if(this.liveTimeout) clearTimeout(this.liveTimeout);

  	    	this.liveTimeout = setTimeout(function() {
  	    

  				var theQuery = self.liveQuery.replace(/[\n\r]/g, " ");
  	    		theQuery = theQuery.replace(/\s{2,}/g, ' ');
  	    		theQuery = theQuery.replace(/^\s+|\s+$/, '');

  	    		var query = camlsql.prepare(theQuery, [], true),
  	    			macros  = query._properties.macros;

  	    		function findParameterIndexByMacroName(parameters, macro) {
  	    			for (var i=0; i <  parameters.length; i++) {
  	    				if (parameters[i].name == macro) {
  	    					return i;
  	    				}
  	    			}
  	    			return -1;
  	    		}
  	    		var newparams = [];
  	    		if (macros) {
  		    		for (var i=0; i < macros.length; i++) {
  		    			var ix = findParameterIndexByMacroName(self.parameters, macros[i]);
  		    			if (ix === -1) {
  		    				console.log("add", macros[i]);
  		    				self.parameters.push({name : macros[i], value : "", type : "Text"});
  		    			}
  		    		}

  		    		for (var i=0; i < self.parameters.length; i++) {
  		    			if (macros.indexOf(self.parameters[i].name) !== -1) {
  		    				newparams.push(self.parameters[i]);
  		    			}
  		    		}

  		    		
  		    	}

  		    	console.warn("oldparam", self.parameters);
  self.parameters = newparams;
  	    		
  	    		self.$router.push({ name: 'live-hash', params: { hash: self.compressedQuery }})

  	    		var parameterCode = "",
  	    			ps = self.parameters,
  	    			actualParams = [];

  	    		for (var i=0; i<  ps.length; i++) {
  	    			console.log("ps", ps[i]);
  	    			if (parameterCode) parameterCode += ",\n";
  	    			if (ps[i].type == "Text") {
  	    				parameterCode += "  " + JSON.stringify(ps[i].value);
  	    				actualParams.push(ps[i].value);
  	    			} else if (ps[i].type == "Number") {
  	    				parameterCode += "  " + Number(ps[i].value);
  	    				actualParams.push(Number(ps[i].value));
  	    			} else if (ps[i].type == "Today") {
  	    				var n = Number(ps[i].value);
  	    				parameterCode += "  camlsql.today(" + (!isNaN(n) && n != 0 ? n : '') +")";
  	    				actualParams.push(ps[i].value && !isNaN(n) ? camlsql.today(n) : camlsql.today());
  	    			}  else if (ps[i].type == "Now") {
  	    				parameterCode += "  camlsql.now()";
  	    				actualParams.push(camlsql.now());
  	    			}  else if (ps[i].type == "Now (With time)") {
  	    				parameterCode += "  camlsql.now(true)";
  	    				actualParams.push(camlsql.now(true)); 
  	    			}  else if (ps[i].type == "DateTime") {
  	    				parameterCode += "  camlsql.datetime(" + (ps[i].value ? JSON.stringify(ps[i].value) : '') + ")";
  	    				actualParams.push(camlsql.datetime(ps[i].value));
  	    			} else if (ps[i].type == "Date") {
  	    				parameterCode += "  camlsql.date(" + (ps[i].value ? JSON.stringify(ps[i].value) : '') + ")";
  	    				actualParams.push(camlsql.date(ps[i].value));
  	    			}

  	    			
  	    		}

  	    		console.warn("actualParams", actualParams, ps);

  	    		if(parameterCode) parameterCode = ",\n [\n" + parameterCode + "\n ]";
  	    		var q = camlsql.prepare(theQuery, actualParams, true);

  	    		self.camlRawXml = q.getXml();
  	    		self.camlXml = vkbeautify.xml(self.camlRawXml);
  	    		self.calculatedScript = "camlsql.prepare(" + JSON.stringify(theQuery) + parameterCode + ")\n .exec(function(err, rows, pagingInfo) {\n\n });";
  	    		self.liveTimeout = null;
  	    		var f = document.querySelectorAll('pre.prettyprinted');
  	    		for (var i=0; i < f.length;i++) {
  	    			f[i].classList.remove('prettyprinted');	    			
  	    		}
  	    		PR.prettyPrint();

  				self.highlightErrors();

  	    	}, 500);
  	  	}
  	  }
  }



  // END C:\git\camlsql-js\src\app\js\vue\components\LiveTabComponent.js

  // BEGIN C:\git\camlsql-js\src\app\js\vue\components\StartTabComponent.js*/
  /**
   * The SearchTab. The startpage where you can search for Avtal 
   * 
   */
   var StartTabComponent = { 
   	template: '#StartTab-template',

  	/**
  	 * Executes when the component is first initialized
  	 */
  	 mounted : function() {
  	 	if (this.$route.params.query) {
  	 	}
  	 	
  	 	this.changeTabByRoute(this.$route.name);

  	 	setTimeout(PR.prettyPrint, 10);
  	 }, 

  	/**
  	 * Data used in this component
  	 */
  	 data : function() {
  	 	return {
  	 		activeTab : 'start'
  	 	}
  	 }, 

  	 methods : {
  		changeTabByRoute : function(route) {
  			if (route == "start") {
  				this.activeTab = "start"; 
  			} else if (route == "start-other") {
  				this.activeTab = "other"; 
  			} else if (route == "start-about") {
  				this.activeTab = "about"; 
  			} else if (route == "start-license") {
  				this.activeTab = "license"; 
  			}
  		} 
  	},

  	watch: {
  		'$route' : function(to, from) {
  			this.changeTabByRoute(to.name);
  		}
  	}
  }
  // END C:\git\camlsql-js\src\app\js\vue\components\StartTabComponent.js

  // BEGIN C:\git\camlsql-js\src\app\js\vue\components\ViewExampleComponent.js*/

  var ViewExampleTabComponent = { 
  	template: '#ViewExample-template',
  	mounted : function() {
  	 	setTimeout(PR.prettyPrint, 10); 
  	 	this.loadExample(this.$route.params.id);


  	},
  	methods : {

  		loadExample : function(id) {

  			id = parseInt(id.substring(0, id.indexOf('-')));
  		
  			for (var i=0; i < this.globals.examples.length; i++) {
  				if (this.globals.examples[i].id == id ) {
  					this.example = this.globals.examples[i];
  					break;  
  				}
  			}
  		},

  		formatXml : function() {
  			if (!this.example.xml) return "";
  			return vkbeautify.xml(this.example.xml);
  		},

  		formatParametersAsString : function(p) {
  			var s = "";
  			if (!p) return "";
  			for (var i=0; i< p.length; i++) {
  				s+=  "\n " + p[i] + (i < p.length - 1 ? ',' : '');
  			}
  			if (!s) return "";
  			return ", [" + s + "\n]";
  		},

  		cutDownSql : function(s) {
  			if (s.length > 70) {
  				return s.substring(0, 67) + "...";
  			}
  			return s;
  		},
  		urifyString : function(str) {
  			str = str.toLowerCase();
  			var newString = "";
  			for (var i=0; i <  str.length; i++) {
  				if (str[i].match(/[a-z0-9-_]/)) {
  					newString += str[i];
  				} else if (str[i] == " ") {
  					newString += "-";
  				}
  			}
  			newString = newString.replace(/-{2,}/, '-');
  			return newString;
  		}
  	},
  	computed : {
  		examples : function() {
  		return this.globals.examples
  	}
  	},
  	data : function() {
  		return {
  			globals : appGlobals,
  			example_id : null,
  			example : null
  		} 
  	},
  	watch: {
  	    '$route' : function(to, from) {
  	      // react to route changes...
  	    } 
  	  }
  }
  // END C:\git\camlsql-js\src\app\js\vue\components\ViewExampleComponent.js

  // BEGIN C:\git\camlsql-js\src\app\js\vue\components\VisaAvtalComponent.js*/

  var VisaAvtalComponent = { 
  	template: '#VisaAvtal-template',
  	mounted : function() {
  		console.warn("route", this.$route);
  		this.createBreadcrumb();

  	},

  	data : function() {
  		return {
  			breadcrumbs : []
  		};
  	},

  	methods : {
  		createBreadcrumb : function() {

  			this.breadcrumbs = [];
  			if (this.$route.name == "search/avtal") 
  			{
  				this.breadcrumbs.push({title : "Sök", route : { name : 'sok' }}); 
  				this.breadcrumbs.push({title : "Sökresultat ("+this.$route.params.query+")", route : { name : 'search-for-paged', params : { page : this.$route.params.page, query : this.$route.params.query } }}); 
  				this.breadcrumbs.push({title : "Avtal " + this.$route.params.id, route : { name : 'sok' }}); 
  			} else if (this.$route.name == "visa-avtal") 
  			{
  				this.breadcrumbs.push({title : "Avtal " + this.$route.params.id, route : {name : 'avtal'}}); 
  				this.breadcrumbs.push({title : "Avtal " + this.$route.params.id, route : { name : 'sok' }}); 
  			}
  		}
  	},

  	watch: {
  	    '$route' : function(to, from) {
  		this.createBreadcrumb();
  	    }
  	  }
  }
  // END C:\git\camlsql-js\src\app\js\vue\components\VisaAvtalComponent.js

  // BEGIN C:\git\camlsql-js\src\app\js\vue\appGlobals.js*/
  var appGlobals = {

    examples : [

          {
            id : 1,
            name : 'Basic field selection',
            description : 'Provide a comma separated list of field name between SELECT and FROM to create the ViewFields element',
            sql : 'SELECT [Title], [Preamble], [Created] FROM [Pages]',
            xml : '<View><ViewFields><FieldRef Name="Title" /><FieldRef Name="Preamble" /><FieldRef Name="Created" /></ViewFields></View>',
            keywords : 'ViewFields',
            parameters : [],
            status : 1,
            version : "0.0.1",
            body : '<p>It is always good to specify which fields you need, or the query may take longer that you\d like.</p><div class="notice"><strong>Note!</strong> It\'s a good idea to always wrap field and list names within brackets: [ and ]</div>'
          },

          {
            id : 2,
            name : 'Basic Text comparison - Equal to',
            description : 'Use = operator with a string parameter to create the Eq element',
            sql : 'SELECT * FROM [Pages] WHERE [Title] = ?',
            xml : '',
            keywords : 'Text, Equal',
            parameters : [
              "My Page"
            ],
            xml : '<View><Query><Where><Eq><FieldRef Name="Title" /><Value Type="Text">My Page</Value></Eq></Where></Query></View>',
            parametersAsString : ['"My Page"'],
            status : 1,
            version : "0.0.1",
            body : '<p></p>'
          },

          {
            id : 3,
            name : 'Basic Number comparison - Equal to',
            description : 'Use = operator with a numeric parameter to create the Eq element',
            sql : 'SELECT * FROM [Pages] WHERE [Happiness] = ?',
            xml : '<View><Query><Where><Eq><FieldRef Name="Happiness" /><Value Type="Number">5</Value></Eq></Where></Query></View>',
            keywords : 'Number, Equal',
            parameters : [
              5
            ],
            parametersAsString : ['5'],
            status : 1,
            version : "0.0.1"
          },

          {
             id : 4,
            name : 'Basic Number comparison - Less than',
            description : 'Use < operator with a numeric parameter to create the Eq element',
            sql : 'SELECT * FROM [Pages] WHERE [Happiness] < ?',
            keywords : 'Number, Less than',
            parameters : [
              10
            ],
            parametersAsString : ['10'],
            status : 1,
            version : "0.0.1",
            xml : '<View><Query><Where><Lt><FieldRef Name="Happiness" /><Value Type="Number">10</Value></Lt></Where></Query></View>'
          },

          {
             id : 5,

            name : 'Basic Null check',
            description : 'Use the [Field] IS NULL pattern to check for null values',
            sql : 'SELECT * FROM [Presentations] WHERE [Preparation] IS NULL',
            keywords : 'Is Null',
            parameters : [],
            status : 1,
            version : "0.0.1",
            'xml' : '<View><Query><Where><IsNull><FieldRef Name="Preparation" /></IsNull></Where></Query></View>'
          },

          {
             id : 6,

            name : 'Basic NOT Null check',
            description : 'Use the [Field] IS NULL pattern to check for values that are not null',
            sql : 'SELECT * FROM [Presentations] WHERE [Preparation] IS NOT NULL',
            keywords : 'Is Not Null',
            parameters : [],
            status : 1,
            version : "0.0.1",
            xml : '<View><Query><Where><IsNotNull><FieldRef Name="Preparation" /></IsNotNull></Where></Query></View>'
          },

          {
             id : 7,

            name : 'Sorting the result',
            description : 'Use the ORDER BY statement to return your data in an orderly fashion',
            sql : 'SELECT * FROM [Presentations] ORDER BY [Created] DESC',
            keywords : 'Sorting, Desc',
            parameters : [],
            status : 1,
            version : "0.0.1",
            xml : '<View><Query><OrderBy><FieldRef Name="Created" Ascending="False" /></OrderBy></Query></View>'
          },

          {
             id : 8,

            name : 'Sorting the result, multiple fields',
            description : 'Use the ORDER BY statement to return sorted data',
            sql : 'SELECT * FROM [Books] ORDER BY [Published] DESC, [Author]',
            keywords : 'Sorting, Asc, Desc',
            parameters : [],
            status : 1,
            version : "0.0.1",
            xml : '<View><Query><OrderBy><FieldRef Name="Published" Ascending="False" /><FieldRef Name="Author" /></OrderBy></Query></View>'
          },
          {
             id : 9,

            name : 'Using <Today> element',
            description : 'Use camsql.today with an offset parameter to get the babies born the last 60 days',
            sql : 'SELECT * FROM [Newborns] WHERE [BirthDate] > ?',
            keywords : 'Today, Date, camlsql.today',
            parametersAsString : ['camlsql.today(-60)'],
            parameters : [ camlsql.today(-60)],
            status : 1,
            version : "0.0.1",
            xml : '<View><Query><Where><Gt><FieldRef Name="BirthDate" /><Value Type="DateTime"><Today OffsetDays="-60" /></Value></Gt></Where></Query></View>',
            body : 'Note, this will not check time, only date'
          },
          {
            id : 10,
            name : 'Using <In> element',
            description : 'Use camsql.today to get babies born the last 60 days',
            sql : 'SELECT * FROM [Newborns] WHERE [Names] In ?',
            keywords : 'In',
            parameters : [ ["Anna", "Johan", "David", "Indigo"] ],
            status : 1,
            version : "0.0.1"
          },
          {
            id : 11,
            name : 'Using <Contains> element',
            description : 'Use a LIKE statement to create Contains queries. Surround your text parameter with % characters to create the Contains statement',
            sql : 'SELECT * FROM [Popular Songs] WHERE [Title] LIKE ?',
            keywords : 'LIKE, Contains',
            parameters : [ "%love%"],
            parametersAsString : ['"%love%"'],
            status : 1,
            version : "0.0.1"
          },
          {
            id : 12,
            name : 'Using <BeginsWith> element',
            description : 'Use a LIKE statement to create Contains queries. But a % characters in the end of your parameter value.',
            sql : 'SELECT * FROM [Popular Songs] WHERE [Title] LIKE ?',
            keywords : 'LIKE, BeginsWith',
            parameters : [ "love%"],
            status : 1,
            version : "0.0.1"
          },
          {
            id : 13,
            name : 'More complex #1 - ? and (? or?)',
            description : 'Combine multiple AND and OR statements to generate the more complex View Xml statements',
            sql : 'SELECT * FROM [Decisions] WHERE [Title] LIKE ? AND ([Motivation] IS NULL OR [IsBoss] = ?)',
            keywords : 'LIKE, BeginsWith',
            parameters : [ "%maybe%", 'Yes'],
            parametersAsString : [ "'%maybe%'", '"Yes"'],
            status : 1,
            version : "0.0.1",
            xml : '<View><Query><Where><And><Contains><FieldRef Name="Title" /><Value Type="Text">maybe</Value></Contains><Or><IsNull><FieldRef Name="Motivation" /></IsNull><Eq><FieldRef Name="IsBoss" /><Value Type="Text">Yes</Value></Eq></Or></And></Where></Query></View>'
          },
          {
            id : 14,
            name : 'More complex #2 - ? and ((? and ?) or ?)',
            description : 'Combine multiple AND and OR statements to generate the more complex View Xml statements',
            sql : 'SELECT * FROM [Decisions] WHERE [Title] LIKE ? AND ((Field1 = ? AND Field2 = ?) OR Field3 = ?)',
            keywords : 'LIKE, BeginsWith',
            parameters : [ "maybe%", 13, 441.12, "Depracated"],
            status : 1,
            version : "0.0.1",
            xml : '<View><Query><Where><And><BeginsWith><FieldRef Name="Title" /><Value Type="Text">maybe</Value></BeginsWith><Or><IsNull><FieldRef Name="Motivation" /></IsNull><Eq><FieldRef Name="IsBoss" /><Value Type="Number">13</Value></Eq></Or></And></Where></Query></View>'
          },
          {
            id : 15,
            name : 'More complex #3 - ? and (? and ?) or (? and ?)',
            description : 'x',
            sql : 'SELECT * FROM [Decisions] WHERE [Title] LIKE ? AND (Field1 = ? AND Field2 = ?) OR (Field3 = ? and Field4 < ?)',
            keywords : 'LIKE, BeginsWith',
            parameters : [ "%maybe%", 'Value1', 'Value2', 'Value3', 1970],
            status : 1,
            version : "0.0.1",
            xml1 : '<View><Query><Where><And><BeginsWith><FieldRef Name="Title" /><Value Type="Text">maybe</Value></BeginsWith><And><Eq><FieldRef Name="Field1" /><Value Type="Number">13</Value></Eq><Or><Eq><FieldRef Name="Field2" /><Value Type="Number">441.12</Value></Eq><And><Eq><FieldRef Name="Field3" /><Value Type="Text">Depracated</Value></Eq><Lt><FieldRef Name="Field4" /><Value Type="Number">44</Value></Lt></And></Or></And></And></Where></Query></View>',
            xml : '<View><Query><Where><And><BeginsWith><FieldRef Name="Title" /><Value Type="Text">maybe</Value></BeginsWith><Or><And><Eq><FieldRef Name="Field1" /><Value Type="Number">13</Value></Eq><Eq><FieldRef Name="Field2" /><Value Type="Number">441.12</Value></Eq></And><And><Eq><FieldRef Name="Field3" /><Value Type="Text">Depracated</Value></Eq><Lt><FieldRef Name="Field4" /><Value Type="Number">44</Value></Lt></And></Or></And></Where></Query></View>'
          },
          {
            id : 16,
            name : '(FAILS!) More complex #3 - ? and ((? and ?) or (? and ?))',
            description : 'Compare to example 15',
            sql : 'SELECT * FROM [Decisions] WHERE [Title] LIKE ? AND ((Field1 = ? AND Field2 = ?) OR (Field3 = ? and Field4 < ?))',
            keywords : 'LIKE, BeginsWith',
            parameters : [ "%maybe%", 'Value1', 'Value2', 'Value3', 1970],
            status : 0,
            version : "0.0.1",
            xml : '<View><Query><Where><And><BeginsWith><FieldRef Name="Title" /><Value Type="Text">maybe</Value></BeginsWith><And><Eq><FieldRef Name="Field1" /><Value Type="Number">13</Value></Eq><Or><Eq><FieldRef Name="Field2" /><Value Type="Number">441.12</Value></Eq><And><Eq><FieldRef Name="Field3" /><Value Type="Text">Depracated</Value></Eq><Lt><FieldRef Name="Field4" /><Value Type="Number">44</Value></Lt></And></Or></And></And></Where></Query></View>',
          },
          {
            id : 17,
            name : 'Using Include to get ListItem properties',
            description : 'x',
            sql : 'SELECT * FROM [Decisions]',
            customSqlText : '.prepare(..).include("Id, DisplayName, HasUniqueRoleAssignments")',
            include : 'Id, DisplayName, HasUniqueRoleAssignments',
            keywords : 'LIKE, BeginsWith',
            parameters : [],
            status : 0,
            raw : 'camlsql.prepare("SELECT * FROM [Pages]").include("Id, DisplayName, HasUniqueRoleAssignments").exec(function(err, rows) {})',
            version : "0.0.1",
            urls : [
              {
                title : 'How to: Retrieve List Items Using JavaScript',
                url : 'https://msdn.microsoft.com/en-us/library/office/hh185007(v=office.14).aspx'
              }
            ]
          }

          

        ]

  }
  // END C:\git\camlsql-js\src\app\js\vue\appGlobals.js

  // BEGIN C:\git\camlsql-js\src\app\js\start.js*/
  //window.splm = SharePointListManager;

  var routes = [
    { path: '/', redirect : '/start', 'name' : 'sok'},
    
    { path: '/start', name : 'start', component: StartTabComponent },
    { path: '/start/other', name : 'start-other', component: StartTabComponent },
    { path: '/start/about', name : 'start-about', component: StartTabComponent },
    { path: '/start/license', name : 'start-license', component: StartTabComponent },
    { path: '/get-started', name : 'get-started', component: GetStartedTabComponent },
    { path: '/examples', name : 'examples', component: ExamplesTabComponent },
    { path: '/examples/find/:query', component: ExamplesTabComponent },
    { path: '/examples/find/:query/:id', name : 'example-search-item', component: ViewExampleTabComponent },
    { path: '/examples/:id', name : 'show-example', component: ViewExampleTabComponent },
    { path: '/live', name : 'live', component: LiveTabComponent },
    { path: '/live/:hash', name : 'live-hash', component: LiveTabComponent }, 
  ];
    
  // 3. Create the router instance and pass the `routes` option
  // You can pass in additional options here, but let's
  // keep it simple for now.
  var router = new VueRouter({
    routes : routes,
    base : '/start/'
  })

  var app = new Vue({
  	el : '#camljs-app',
  	router : router,
  	data : {
  		globals : appGlobals
  	}
  });
       
       ;(function () {
    function domReady (f) { /in/.test(document.readyState) ? setTimeout(domReady,16,f) : f() }

    function resize (event) {
      event.target.style.height = 'auto';
      event.target.style.height = (event.target.scrollHeight + 16)+'px';
    }
    /* 0-timeout to get the already changed text */
    function delayedResize (event) {
      window.setTimeout(resize, 0, event);
    }

    domReady(function () {
      var textareas = document.querySelectorAll('textarea[auto-resize]')

      for (var i = 0, l = textareas.length; i < l; ++i) {
        var el = textareas.item(i)

        el.addEventListener('change',  resize, false);
        el.addEventListener('cut',     delayedResize, false);
        el.addEventListener('paste',   delayedResize, false);
        el.addEventListener('drop',    delayedResize, false);
        el.addEventListener('keydown', delayedResize, false);
      }
    })
  }());
  // END C:\git\camlsql-js\src\app\js\start.js