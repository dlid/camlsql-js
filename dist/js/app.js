  /*! camlsql v1.0.1 (https://github.com/dlid/camlsql-js) */


  	/* File: c:\git\camlsql-js\src\app\js\vendor\q-1.5.1\q.js  */
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



  	/* File: c:\git\camlsql-js\node_modules\clipboard\dist\clipboard.min.js  */
  /*!
   * clipboard.js v1.7.1
   * https://zenorocha.github.io/clipboard.js
   *
   * Licensed MIT © Zeno Rocha
   */
  !function(t){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=t();else if("function"==typeof define&&define.amd)define([],t);else{var e;e="undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:this,e.Clipboard=t()}}(function(){var t,e,n;return function t(e,n,o){function i(a,c){if(!n[a]){if(!e[a]){var l="function"==typeof require&&require;if(!c&&l)return l(a,!0);if(r)return r(a,!0);var s=new Error("Cannot find module '"+a+"'");throw s.code="MODULE_NOT_FOUND",s}var u=n[a]={exports:{}};e[a][0].call(u.exports,function(t){var n=e[a][1][t];return i(n||t)},u,u.exports,t,e,n,o)}return n[a].exports}for(var r="function"==typeof require&&require,a=0;a<o.length;a++)i(o[a]);return i}({1:[function(t,e,n){function o(t,e){for(;t&&t.nodeType!==i;){if("function"==typeof t.matches&&t.matches(e))return t;t=t.parentNode}}var i=9;if("undefined"!=typeof Element&&!Element.prototype.matches){var r=Element.prototype;r.matches=r.matchesSelector||r.mozMatchesSelector||r.msMatchesSelector||r.oMatchesSelector||r.webkitMatchesSelector}e.exports=o},{}],2:[function(t,e,n){function o(t,e,n,o,r){var a=i.apply(this,arguments);return t.addEventListener(n,a,r),{destroy:function(){t.removeEventListener(n,a,r)}}}function i(t,e,n,o){return function(n){n.delegateTarget=r(n.target,e),n.delegateTarget&&o.call(t,n)}}var r=t("./closest");e.exports=o},{"./closest":1}],3:[function(t,e,n){n.node=function(t){return void 0!==t&&t instanceof HTMLElement&&1===t.nodeType},n.nodeList=function(t){var e=Object.prototype.toString.call(t);return void 0!==t&&("[object NodeList]"===e||"[object HTMLCollection]"===e)&&"length"in t&&(0===t.length||n.node(t[0]))},n.string=function(t){return"string"==typeof t||t instanceof String},n.fn=function(t){return"[object Function]"===Object.prototype.toString.call(t)}},{}],4:[function(t,e,n){function o(t,e,n){if(!t&&!e&&!n)throw new Error("Missing required arguments");if(!c.string(e))throw new TypeError("Second argument must be a String");if(!c.fn(n))throw new TypeError("Third argument must be a Function");if(c.node(t))return i(t,e,n);if(c.nodeList(t))return r(t,e,n);if(c.string(t))return a(t,e,n);throw new TypeError("First argument must be a String, HTMLElement, HTMLCollection, or NodeList")}function i(t,e,n){return t.addEventListener(e,n),{destroy:function(){t.removeEventListener(e,n)}}}function r(t,e,n){return Array.prototype.forEach.call(t,function(t){t.addEventListener(e,n)}),{destroy:function(){Array.prototype.forEach.call(t,function(t){t.removeEventListener(e,n)})}}}function a(t,e,n){return l(document.body,t,e,n)}var c=t("./is"),l=t("delegate");e.exports=o},{"./is":3,delegate:2}],5:[function(t,e,n){function o(t){var e;if("SELECT"===t.nodeName)t.focus(),e=t.value;else if("INPUT"===t.nodeName||"TEXTAREA"===t.nodeName){var n=t.hasAttribute("readonly");n||t.setAttribute("readonly",""),t.select(),t.setSelectionRange(0,t.value.length),n||t.removeAttribute("readonly"),e=t.value}else{t.hasAttribute("contenteditable")&&t.focus();var o=window.getSelection(),i=document.createRange();i.selectNodeContents(t),o.removeAllRanges(),o.addRange(i),e=o.toString()}return e}e.exports=o},{}],6:[function(t,e,n){function o(){}o.prototype={on:function(t,e,n){var o=this.e||(this.e={});return(o[t]||(o[t]=[])).push({fn:e,ctx:n}),this},once:function(t,e,n){function o(){i.off(t,o),e.apply(n,arguments)}var i=this;return o._=e,this.on(t,o,n)},emit:function(t){var e=[].slice.call(arguments,1),n=((this.e||(this.e={}))[t]||[]).slice(),o=0,i=n.length;for(o;o<i;o++)n[o].fn.apply(n[o].ctx,e);return this},off:function(t,e){var n=this.e||(this.e={}),o=n[t],i=[];if(o&&e)for(var r=0,a=o.length;r<a;r++)o[r].fn!==e&&o[r].fn._!==e&&i.push(o[r]);return i.length?n[t]=i:delete n[t],this}},e.exports=o},{}],7:[function(e,n,o){!function(i,r){if("function"==typeof t&&t.amd)t(["module","select"],r);else if(void 0!==o)r(n,e("select"));else{var a={exports:{}};r(a,i.select),i.clipboardAction=a.exports}}(this,function(t,e){"use strict";function n(t){return t&&t.__esModule?t:{default:t}}function o(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}var i=n(e),r="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},a=function(){function t(t,e){for(var n=0;n<e.length;n++){var o=e[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(t,o.key,o)}}return function(e,n,o){return n&&t(e.prototype,n),o&&t(e,o),e}}(),c=function(){function t(e){o(this,t),this.resolveOptions(e),this.initSelection()}return a(t,[{key:"resolveOptions",value:function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};this.action=e.action,this.container=e.container,this.emitter=e.emitter,this.target=e.target,this.text=e.text,this.trigger=e.trigger,this.selectedText=""}},{key:"initSelection",value:function t(){this.text?this.selectFake():this.target&&this.selectTarget()}},{key:"selectFake",value:function t(){var e=this,n="rtl"==document.documentElement.getAttribute("dir");this.removeFake(),this.fakeHandlerCallback=function(){return e.removeFake()},this.fakeHandler=this.container.addEventListener("click",this.fakeHandlerCallback)||!0,this.fakeElem=document.createElement("textarea"),this.fakeElem.style.fontSize="12pt",this.fakeElem.style.border="0",this.fakeElem.style.padding="0",this.fakeElem.style.margin="0",this.fakeElem.style.position="absolute",this.fakeElem.style[n?"right":"left"]="-9999px";var o=window.pageYOffset||document.documentElement.scrollTop;this.fakeElem.style.top=o+"px",this.fakeElem.setAttribute("readonly",""),this.fakeElem.value=this.text,this.container.appendChild(this.fakeElem),this.selectedText=(0,i.default)(this.fakeElem),this.copyText()}},{key:"removeFake",value:function t(){this.fakeHandler&&(this.container.removeEventListener("click",this.fakeHandlerCallback),this.fakeHandler=null,this.fakeHandlerCallback=null),this.fakeElem&&(this.container.removeChild(this.fakeElem),this.fakeElem=null)}},{key:"selectTarget",value:function t(){this.selectedText=(0,i.default)(this.target),this.copyText()}},{key:"copyText",value:function t(){var e=void 0;try{e=document.execCommand(this.action)}catch(t){e=!1}this.handleResult(e)}},{key:"handleResult",value:function t(e){this.emitter.emit(e?"success":"error",{action:this.action,text:this.selectedText,trigger:this.trigger,clearSelection:this.clearSelection.bind(this)})}},{key:"clearSelection",value:function t(){this.trigger&&this.trigger.focus(),window.getSelection().removeAllRanges()}},{key:"destroy",value:function t(){this.removeFake()}},{key:"action",set:function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"copy";if(this._action=e,"copy"!==this._action&&"cut"!==this._action)throw new Error('Invalid "action" value, use either "copy" or "cut"')},get:function t(){return this._action}},{key:"target",set:function t(e){if(void 0!==e){if(!e||"object"!==(void 0===e?"undefined":r(e))||1!==e.nodeType)throw new Error('Invalid "target" value, use a valid Element');if("copy"===this.action&&e.hasAttribute("disabled"))throw new Error('Invalid "target" attribute. Please use "readonly" instead of "disabled" attribute');if("cut"===this.action&&(e.hasAttribute("readonly")||e.hasAttribute("disabled")))throw new Error('Invalid "target" attribute. You can\'t cut text from elements with "readonly" or "disabled" attributes');this._target=e}},get:function t(){return this._target}}]),t}();t.exports=c})},{select:5}],8:[function(e,n,o){!function(i,r){if("function"==typeof t&&t.amd)t(["module","./clipboard-action","tiny-emitter","good-listener"],r);else if(void 0!==o)r(n,e("./clipboard-action"),e("tiny-emitter"),e("good-listener"));else{var a={exports:{}};r(a,i.clipboardAction,i.tinyEmitter,i.goodListener),i.clipboard=a.exports}}(this,function(t,e,n,o){"use strict";function i(t){return t&&t.__esModule?t:{default:t}}function r(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function a(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}function c(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}function l(t,e){var n="data-clipboard-"+t;if(e.hasAttribute(n))return e.getAttribute(n)}var s=i(e),u=i(n),f=i(o),d="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},h=function(){function t(t,e){for(var n=0;n<e.length;n++){var o=e[n];o.enumerable=o.enumerable||!1,o.configurable=!0,"value"in o&&(o.writable=!0),Object.defineProperty(t,o.key,o)}}return function(e,n,o){return n&&t(e.prototype,n),o&&t(e,o),e}}(),p=function(t){function e(t,n){r(this,e);var o=a(this,(e.__proto__||Object.getPrototypeOf(e)).call(this));return o.resolveOptions(n),o.listenClick(t),o}return c(e,t),h(e,[{key:"resolveOptions",value:function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};this.action="function"==typeof e.action?e.action:this.defaultAction,this.target="function"==typeof e.target?e.target:this.defaultTarget,this.text="function"==typeof e.text?e.text:this.defaultText,this.container="object"===d(e.container)?e.container:document.body}},{key:"listenClick",value:function t(e){var n=this;this.listener=(0,f.default)(e,"click",function(t){return n.onClick(t)})}},{key:"onClick",value:function t(e){var n=e.delegateTarget||e.currentTarget;this.clipboardAction&&(this.clipboardAction=null),this.clipboardAction=new s.default({action:this.action(n),target:this.target(n),text:this.text(n),container:this.container,trigger:n,emitter:this})}},{key:"defaultAction",value:function t(e){return l("action",e)}},{key:"defaultTarget",value:function t(e){var n=l("target",e);if(n)return document.querySelector(n)}},{key:"defaultText",value:function t(e){return l("text",e)}},{key:"destroy",value:function t(){this.listener.destroy(),this.clipboardAction&&(this.clipboardAction.destroy(),this.clipboardAction=null)}}],[{key:"isSupported",value:function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:["copy","cut"],n="string"==typeof e?[e]:e,o=!!document.queryCommandSupported;return n.forEach(function(t){o=o&&!!document.queryCommandSupported(t)}),o}}]),e}(u.default);t.exports=p})},{"./clipboard-action":7,"good-listener":4,"tiny-emitter":6}]},{},[8])(8)});


  	/* File: c:\git\camlsql-js\src\app\js\vendor\vkbeautify\vkbeautify.0.99.00.beta.js  */
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




  	/* File: c:\git\camlsql-js\src\app\js\vendor\lz-string\lz-string.min.js  */
  var LZString=function(){function o(o,r){if(!t[o]){t[o]={};for(var n=0;n<o.length;n++)t[o][o.charAt(n)]=n}return t[o][r]}var r=String.fromCharCode,n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",t={},i={compressToBase64:function(o){if(null==o)return"";var r=i._compress(o,6,function(o){return n.charAt(o)});switch(r.length%4){default:case 0:return r;case 1:return r+"===";case 2:return r+"==";case 3:return r+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(e){return o(n,r.charAt(e))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(o){return null==o?"":""==o?null:i._decompress(o.length,16384,function(r){return o.charCodeAt(r)-32})},compressToUint8Array:function(o){for(var r=i.compress(o),n=new Uint8Array(2*r.length),e=0,t=r.length;t>e;e++){var s=r.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null===o||void 0===o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;t>e;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(o){return null==o?"":i._compress(o,6,function(o){return e.charAt(o)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(n){return o(e,r.charAt(n))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(o,r,n){if(null==o)return"";var e,t,i,s={},p={},u="",c="",a="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<o.length;i+=1)if(u=o.charAt(i),Object.prototype.hasOwnProperty.call(s,u)||(s[u]=f++,p[u]=!0),c=a+u,Object.prototype.hasOwnProperty.call(s,c))a=c;else{if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++),s[c]=f++,a=String(u)}if(""!==a){if(Object.prototype.hasOwnProperty.call(p,a)){if(a.charCodeAt(0)<256){for(e=0;h>e;e++)m<<=1,v==r-1?(v=0,d.push(n(m)),m=0):v++;for(t=a.charCodeAt(0),e=0;8>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;h>e;e++)m=m<<1|t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=a.charCodeAt(0),e=0;16>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}l--,0==l&&(l=Math.pow(2,h),h++),delete p[a]}else for(t=s[a],e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;l--,0==l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;h>e;e++)m=m<<1|1&t,v==r-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==r-1){d.push(n(m));break}v++}return d.join("")},decompress:function(o){return null==o?"":""==o?null:i._decompress(o.length,32768,function(r){return o.charCodeAt(r)})},_decompress:function(o,n,e){var t,i,s,p,u,c,a,l,f=[],h=4,d=4,m=3,v="",w=[],A={val:e(0),position:n,index:1};for(i=0;3>i;i+=1)f[i]=i;for(p=0,c=Math.pow(2,2),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(t=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;l=r(p);break;case 2:return""}for(f[3]=l,s=l,w.push(l);;){if(A.index>o)return"";for(p=0,c=Math.pow(2,m),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;switch(l=p){case 0:for(p=0,c=Math.pow(2,8),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 1:for(p=0,c=Math.pow(2,16),a=1;a!=c;)u=A.val&A.position,A.position>>=1,0==A.position&&(A.position=n,A.val=e(A.index++)),p|=(u>0?1:0)*a,a<<=1;f[d++]=r(p),l=d-1,h--;break;case 2:return w.join("")}if(0==h&&(h=Math.pow(2,m),m++),f[l])v=f[l];else{if(l!==d)return null;v=s+s.charAt(0)}w.push(v),f[d++]=s+v.charAt(0),h--,s=v,0==h&&(h=Math.pow(2,m),m++)}}};return i}();"function"==typeof define&&define.amd?define(function(){return LZString}):"undefined"!=typeof module&&null!=module&&(module.exports=LZString);



  	/* File: c:\git\camlsql-js\src\app\js\vendor\vue\vue.min.js  */
  /*!
   * Vue.js v2.5.2
   * (c) 2014-2017 Evan You
   * Released under the MIT License.
   */
  !function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):e.Vue=t()}(this,function(){"use strict";function e(e){return void 0===e||null===e}function t(e){return void 0!==e&&null!==e}function n(e){return!0===e}function r(e){return!1===e}function i(e){return"string"==typeof e||"number"==typeof e||"boolean"==typeof e}function o(e){return null!==e&&"object"==typeof e}function a(e){return"[object Object]"===Ai.call(e)}function s(e){return"[object RegExp]"===Ai.call(e)}function c(e){var t=parseFloat(String(e));return t>=0&&Math.floor(t)===t&&isFinite(e)}function u(e){return null==e?"":"object"==typeof e?JSON.stringify(e,null,2):String(e)}function l(e){var t=parseFloat(e);return isNaN(t)?e:t}function f(e,t){for(var n=Object.create(null),r=e.split(","),i=0;i<r.length;i++)n[r[i]]=!0;return t?function(e){return n[e.toLowerCase()]}:function(e){return n[e]}}function d(e,t){if(e.length){var n=e.indexOf(t);if(n>-1)return e.splice(n,1)}}function p(e,t){return Ti.call(e,t)}function v(e){var t=Object.create(null);return function(n){return t[n]||(t[n]=e(n))}}function h(e,t){function n(n){var r=arguments.length;return r?r>1?e.apply(t,arguments):e.call(t,n):e.call(t)}return n._length=e.length,n}function m(e,t){t=t||0;for(var n=e.length-t,r=new Array(n);n--;)r[n]=e[n+t];return r}function y(e,t){for(var n in t)e[n]=t[n];return e}function g(e){for(var t={},n=0;n<e.length;n++)e[n]&&y(t,e[n]);return t}function _(e,t,n){}function b(e,t){if(e===t)return!0;var n=o(e),r=o(t);if(!n||!r)return!n&&!r&&String(e)===String(t);try{var i=Array.isArray(e),a=Array.isArray(t);if(i&&a)return e.length===t.length&&e.every(function(e,n){return b(e,t[n])});if(i||a)return!1;var s=Object.keys(e),c=Object.keys(t);return s.length===c.length&&s.every(function(n){return b(e[n],t[n])})}catch(e){return!1}}function $(e,t){for(var n=0;n<e.length;n++)if(b(e[n],t))return n;return-1}function C(e){var t=!1;return function(){t||(t=!0,e.apply(this,arguments))}}function w(e){var t=(e+"").charCodeAt(0);return 36===t||95===t}function x(e,t,n,r){Object.defineProperty(e,t,{value:n,enumerable:!!r,writable:!0,configurable:!0})}function k(e){if(!Ui.test(e)){var t=e.split(".");return function(e){for(var n=0;n<t.length;n++){if(!e)return;e=e[t[n]]}return e}}}function A(e){return"function"==typeof e&&/native code/.test(e.toString())}function O(e){so.target&&co.push(so.target),so.target=e}function S(){so.target=co.pop()}function T(e){return new uo(void 0,void 0,void 0,String(e))}function E(e,t){var n=new uo(e.tag,e.data,e.children,e.text,e.elm,e.context,e.componentOptions,e.asyncFactory);return n.ns=e.ns,n.isStatic=e.isStatic,n.key=e.key,n.isComment=e.isComment,n.isCloned=!0,t&&e.children&&(n.children=j(e.children)),n}function j(e,t){for(var n=e.length,r=new Array(n),i=0;i<n;i++)r[i]=E(e[i],t);return r}function L(e,t,n){e.__proto__=t}function N(e,t,n){for(var r=0,i=n.length;r<i;r++){var o=n[r];x(e,o,t[o])}}function I(e,t){if(o(e)&&!(e instanceof uo)){var n;return p(e,"__ob__")&&e.__ob__ instanceof yo?n=e.__ob__:mo.shouldConvert&&!no()&&(Array.isArray(e)||a(e))&&Object.isExtensible(e)&&!e._isVue&&(n=new yo(e)),t&&n&&n.vmCount++,n}}function M(e,t,n,r,i){var o=new so,a=Object.getOwnPropertyDescriptor(e,t);if(!a||!1!==a.configurable){var s=a&&a.get,c=a&&a.set,u=!i&&I(n);Object.defineProperty(e,t,{enumerable:!0,configurable:!0,get:function(){var t=s?s.call(e):n;return so.target&&(o.depend(),u&&(u.dep.depend(),Array.isArray(t)&&R(t))),t},set:function(t){var r=s?s.call(e):n;t===r||t!==t&&r!==r||(c?c.call(e,t):n=t,u=!i&&I(t),o.notify())}})}}function P(e,t,n){if(Array.isArray(e)&&c(t))return e.length=Math.max(e.length,t),e.splice(t,1,n),n;if(p(e,t))return e[t]=n,n;var r=e.__ob__;return e._isVue||r&&r.vmCount?n:r?(M(r.value,t,n),r.dep.notify(),n):(e[t]=n,n)}function D(e,t){if(Array.isArray(e)&&c(t))e.splice(t,1);else{var n=e.__ob__;e._isVue||n&&n.vmCount||p(e,t)&&(delete e[t],n&&n.dep.notify())}}function R(e){for(var t=void 0,n=0,r=e.length;n<r;n++)(t=e[n])&&t.__ob__&&t.__ob__.dep.depend(),Array.isArray(t)&&R(t)}function F(e,t){if(!t)return e;for(var n,r,i,o=Object.keys(t),s=0;s<o.length;s++)r=e[n=o[s]],i=t[n],p(e,n)?a(r)&&a(i)&&F(r,i):P(e,n,i);return e}function H(e,t,n){return n?e||t?function(){var r="function"==typeof t?t.call(n):t,i="function"==typeof e?e.call(n):e;return r?F(r,i):i}:void 0:t?e?function(){return F("function"==typeof t?t.call(this):t,"function"==typeof e?e.call(this):e)}:t:e}function B(e,t){return t?e?e.concat(t):Array.isArray(t)?t:[t]:e}function U(e,t,n,r){var i=Object.create(e||null);return t?y(i,t):i}function V(e,t){var n=e.props;if(n){var r,i,o={};if(Array.isArray(n))for(r=n.length;r--;)"string"==typeof(i=n[r])&&(o[ji(i)]={type:null});else if(a(n))for(var s in n)i=n[s],o[ji(s)]=a(i)?i:{type:i};e.props=o}}function z(e,t){var n=e.inject,r=e.inject={};if(Array.isArray(n))for(var i=0;i<n.length;i++)r[n[i]]={from:n[i]};else if(a(n))for(var o in n){var s=n[o];r[o]=a(s)?y({from:o},s):{from:s}}}function K(e){var t=e.directives;if(t)for(var n in t){var r=t[n];"function"==typeof r&&(t[n]={bind:r,update:r})}}function J(e,t,n){function r(r){var i=go[r]||$o;c[r]=i(e[r],t[r],n,r)}"function"==typeof t&&(t=t.options),V(t,n),z(t,n),K(t);var i=t.extends;if(i&&(e=J(e,i,n)),t.mixins)for(var o=0,a=t.mixins.length;o<a;o++)e=J(e,t.mixins[o],n);var s,c={};for(s in e)r(s);for(s in t)p(e,s)||r(s);return c}function q(e,t,n,r){if("string"==typeof n){var i=e[t];if(p(i,n))return i[n];var o=ji(n);if(p(i,o))return i[o];var a=Li(o);if(p(i,a))return i[a];var s=i[n]||i[o]||i[a];return s}}function W(e,t,n,r){var i=t[e],o=!p(n,e),a=n[e];if(Y(Boolean,i.type)&&(o&&!p(i,"default")?a=!1:Y(String,i.type)||""!==a&&a!==Ii(e)||(a=!0)),void 0===a){a=G(r,i,e);var s=mo.shouldConvert;mo.shouldConvert=!0,I(a),mo.shouldConvert=s}return a}function G(e,t,n){if(p(t,"default")){var r=t.default;return e&&e.$options.propsData&&void 0===e.$options.propsData[n]&&void 0!==e._props[n]?e._props[n]:"function"==typeof r&&"Function"!==Z(t.type)?r.call(e):r}}function Z(e){var t=e&&e.toString().match(/^\s*function (\w+)/);return t?t[1]:""}function Y(e,t){if(!Array.isArray(t))return Z(t)===Z(e);for(var n=0,r=t.length;n<r;n++)if(Z(t[n])===Z(e))return!0;return!1}function Q(e,t,n){if(t)for(var r=t;r=r.$parent;){var i=r.$options.errorCaptured;if(i)for(var o=0;o<i.length;o++)try{if(!1===i[o].call(r,e,t,n))return}catch(e){X(e,r,"errorCaptured hook")}}X(e,t,n)}function X(e,t,n){if(Hi.errorHandler)try{return Hi.errorHandler.call(null,e,t,n)}catch(e){ee(e,null,"config.errorHandler")}ee(e,t,n)}function ee(e,t,n){if(!zi||"undefined"==typeof console)throw e;console.error(e)}function te(){wo=!1;var e=Co.slice(0);Co.length=0;for(var t=0;t<e.length;t++)e[t]()}function ne(e){return e._withTask||(e._withTask=function(){xo=!0;var t=e.apply(null,arguments);return xo=!1,t})}function re(e,t){var n;if(Co.push(function(){if(e)try{e.call(t)}catch(e){Q(e,t,"nextTick")}else n&&n(t)}),wo||(wo=!0,xo?bo():_o()),!e&&"undefined"!=typeof Promise)return new Promise(function(e){n=e})}function ie(e){function t(){var e=arguments,n=t.fns;if(!Array.isArray(n))return n.apply(null,arguments);for(var r=n.slice(),i=0;i<r.length;i++)r[i].apply(null,e)}return t.fns=e,t}function oe(t,n,r,i,o){var a,s,c,u;for(a in t)s=t[a],c=n[a],u=To(a),e(s)||(e(c)?(e(s.fns)&&(s=t[a]=ie(s)),r(u.name,s,u.once,u.capture,u.passive)):s!==c&&(c.fns=s,t[a]=c));for(a in n)e(t[a])&&i((u=To(a)).name,n[a],u.capture)}function ae(r,i,o){function a(){o.apply(this,arguments),d(s.fns,a)}var s,c=r[i];e(c)?s=ie([a]):t(c.fns)&&n(c.merged)?(s=c).fns.push(a):s=ie([c,a]),s.merged=!0,r[i]=s}function se(n,r,i){var o=r.options.props;if(!e(o)){var a={},s=n.attrs,c=n.props;if(t(s)||t(c))for(var u in o){var l=Ii(u);ce(a,c,u,l,!0)||ce(a,s,u,l,!1)}return a}}function ce(e,n,r,i,o){if(t(n)){if(p(n,r))return e[r]=n[r],o||delete n[r],!0;if(p(n,i))return e[r]=n[i],o||delete n[i],!0}return!1}function ue(e){for(var t=0;t<e.length;t++)if(Array.isArray(e[t]))return Array.prototype.concat.apply([],e);return e}function le(e){return i(e)?[T(e)]:Array.isArray(e)?de(e):void 0}function fe(e){return t(e)&&t(e.text)&&r(e.isComment)}function de(r,o){var a,s,c,u,l=[];for(a=0;a<r.length;a++)e(s=r[a])||"boolean"==typeof s||(u=l[c=l.length-1],Array.isArray(s)?s.length>0&&(fe((s=de(s,(o||"")+"_"+a))[0])&&fe(u)&&(l[c]=T(u.text+s[0].text),s.shift()),l.push.apply(l,s)):i(s)?fe(u)?l[c]=T(u.text+s):""!==s&&l.push(T(s)):fe(s)&&fe(u)?l[c]=T(u.text+s.text):(n(r._isVList)&&t(s.tag)&&e(s.key)&&t(o)&&(s.key="__vlist"+o+"_"+a+"__"),l.push(s)));return l}function pe(e,t){return(e.__esModule||io&&"Module"===e[Symbol.toStringTag])&&(e=e.default),o(e)?t.extend(e):e}function ve(e,t,n,r,i){var o=fo();return o.asyncFactory=e,o.asyncMeta={data:t,context:n,children:r,tag:i},o}function he(r,i,a){if(n(r.error)&&t(r.errorComp))return r.errorComp;if(t(r.resolved))return r.resolved;if(n(r.loading)&&t(r.loadingComp))return r.loadingComp;if(!t(r.contexts)){var s=r.contexts=[a],c=!0,u=function(){for(var e=0,t=s.length;e<t;e++)s[e].$forceUpdate()},l=C(function(e){r.resolved=pe(e,i),c||u()}),f=C(function(e){t(r.errorComp)&&(r.error=!0,u())}),d=r(l,f);return o(d)&&("function"==typeof d.then?e(r.resolved)&&d.then(l,f):t(d.component)&&"function"==typeof d.component.then&&(d.component.then(l,f),t(d.error)&&(r.errorComp=pe(d.error,i)),t(d.loading)&&(r.loadingComp=pe(d.loading,i),0===d.delay?r.loading=!0:setTimeout(function(){e(r.resolved)&&e(r.error)&&(r.loading=!0,u())},d.delay||200)),t(d.timeout)&&setTimeout(function(){e(r.resolved)&&f(null)},d.timeout))),c=!1,r.loading?r.loadingComp:r.resolved}r.contexts.push(a)}function me(e){return e.isComment&&e.asyncFactory}function ye(e){if(Array.isArray(e))for(var n=0;n<e.length;n++){var r=e[n];if(t(r)&&(t(r.componentOptions)||me(r)))return r}}function ge(e){e._events=Object.create(null),e._hasHookEvent=!1;var t=e.$options._parentListeners;t&&$e(e,t)}function _e(e,t,n){n?So.$once(e,t):So.$on(e,t)}function be(e,t){So.$off(e,t)}function $e(e,t,n){So=e,oe(t,n||{},_e,be,e)}function Ce(e,t){var n={};if(!e)return n;for(var r=[],i=0,o=e.length;i<o;i++){var a=e[i],s=a.data;if(s&&s.attrs&&s.attrs.slot&&delete s.attrs.slot,a.context!==t&&a.functionalContext!==t||!s||null==s.slot)r.push(a);else{var c=a.data.slot,u=n[c]||(n[c]=[]);"template"===a.tag?u.push.apply(u,a.children):u.push(a)}}return r.every(we)||(n.default=r),n}function we(e){return e.isComment||" "===e.text}function xe(e,t){t=t||{};for(var n=0;n<e.length;n++)Array.isArray(e[n])?xe(e[n],t):t[e[n].key]=e[n].fn;return t}function ke(e){var t=e.$options,n=t.parent;if(n&&!t.abstract){for(;n.$options.abstract&&n.$parent;)n=n.$parent;n.$children.push(e)}e.$parent=n,e.$root=n?n.$root:e,e.$children=[],e.$refs={},e._watcher=null,e._inactive=null,e._directInactive=!1,e._isMounted=!1,e._isDestroyed=!1,e._isBeingDestroyed=!1}function Ae(e,t,n){e.$el=t,e.$options.render||(e.$options.render=fo),je(e,"beforeMount");var r;return r=function(){e._update(e._render(),n)},e._watcher=new Ro(e,r,_),n=!1,null==e.$vnode&&(e._isMounted=!0,je(e,"mounted")),e}function Oe(e,t,n,r,i){var o=!!(i||e.$options._renderChildren||r.data.scopedSlots||e.$scopedSlots!==Bi);if(e.$options._parentVnode=r,e.$vnode=r,e._vnode&&(e._vnode.parent=r),e.$options._renderChildren=i,e.$attrs=r.data&&r.data.attrs||Bi,e.$listeners=n||Bi,t&&e.$options.props){mo.shouldConvert=!1;for(var a=e._props,s=e.$options._propKeys||[],c=0;c<s.length;c++){var u=s[c];a[u]=W(u,e.$options.props,t,e)}mo.shouldConvert=!0,e.$options.propsData=t}if(n){var l=e.$options._parentListeners;e.$options._parentListeners=n,$e(e,n,l)}o&&(e.$slots=Ce(i,r.context),e.$forceUpdate())}function Se(e){for(;e&&(e=e.$parent);)if(e._inactive)return!0;return!1}function Te(e,t){if(t){if(e._directInactive=!1,Se(e))return}else if(e._directInactive)return;if(e._inactive||null===e._inactive){e._inactive=!1;for(var n=0;n<e.$children.length;n++)Te(e.$children[n]);je(e,"activated")}}function Ee(e,t){if(!(t&&(e._directInactive=!0,Se(e))||e._inactive)){e._inactive=!0;for(var n=0;n<e.$children.length;n++)Ee(e.$children[n]);je(e,"deactivated")}}function je(e,t){var n=e.$options[t];if(n)for(var r=0,i=n.length;r<i;r++)try{n[r].call(e)}catch(n){Q(n,e,t+" hook")}e._hasHookEvent&&e.$emit("hook:"+t)}function Le(){Po=jo.length=Lo.length=0,No={},Io=Mo=!1}function Ne(){Mo=!0;var e,t;for(jo.sort(function(e,t){return e.id-t.id}),Po=0;Po<jo.length;Po++)t=(e=jo[Po]).id,No[t]=null,e.run();var n=Lo.slice(),r=jo.slice();Le(),Pe(n),Ie(r),ro&&Hi.devtools&&ro.emit("flush")}function Ie(e){for(var t=e.length;t--;){var n=e[t],r=n.vm;r._watcher===n&&r._isMounted&&je(r,"updated")}}function Me(e){e._inactive=!1,Lo.push(e)}function Pe(e){for(var t=0;t<e.length;t++)e[t]._inactive=!0,Te(e[t],!0)}function De(e){var t=e.id;if(null==No[t]){if(No[t]=!0,Mo){for(var n=jo.length-1;n>Po&&jo[n].id>e.id;)n--;jo.splice(n+1,0,e)}else jo.push(e);Io||(Io=!0,re(Ne))}}function Re(e){Fo.clear(),Fe(e,Fo)}function Fe(e,t){var n,r,i=Array.isArray(e);if((i||o(e))&&Object.isExtensible(e)){if(e.__ob__){var a=e.__ob__.dep.id;if(t.has(a))return;t.add(a)}if(i)for(n=e.length;n--;)Fe(e[n],t);else for(n=(r=Object.keys(e)).length;n--;)Fe(e[r[n]],t)}}function He(e,t,n){Ho.get=function(){return this[t][n]},Ho.set=function(e){this[t][n]=e},Object.defineProperty(e,n,Ho)}function Be(e){e._watchers=[];var t=e.$options;t.props&&Ue(e,t.props),t.methods&&We(e,t.methods),t.data?Ve(e):I(e._data={},!0),t.computed&&Ke(e,t.computed),t.watch&&t.watch!==Yi&&Ge(e,t.watch)}function Ue(e,t){var n=e.$options.propsData||{},r=e._props={},i=e.$options._propKeys=[],o=!e.$parent;mo.shouldConvert=o;for(var a in t)!function(o){i.push(o);var a=W(o,t,n,e);M(r,o,a),o in e||He(e,"_props",o)}(a);mo.shouldConvert=!0}function Ve(e){var t=e.$options.data;a(t=e._data="function"==typeof t?ze(t,e):t||{})||(t={});for(var n=Object.keys(t),r=e.$options.props,i=n.length;i--;){var o=n[i];r&&p(r,o)||w(o)||He(e,"_data",o)}I(t,!0)}function ze(e,t){try{return e.call(t,t)}catch(e){return Q(e,t,"data()"),{}}}function Ke(e,t){var n=e._computedWatchers=Object.create(null),r=no();for(var i in t){var o=t[i],a="function"==typeof o?o:o.get;r||(n[i]=new Ro(e,a||_,_,Bo)),i in e||Je(e,i,o)}}function Je(e,t,n){var r=!no();"function"==typeof n?(Ho.get=r?qe(t):n,Ho.set=_):(Ho.get=n.get?r&&!1!==n.cache?qe(t):n.get:_,Ho.set=n.set?n.set:_),Object.defineProperty(e,t,Ho)}function qe(e){return function(){var t=this._computedWatchers&&this._computedWatchers[e];if(t)return t.dirty&&t.evaluate(),so.target&&t.depend(),t.value}}function We(e,t){for(var n in t)e[n]=null==t[n]?_:h(t[n],e)}function Ge(e,t){for(var n in t){var r=t[n];if(Array.isArray(r))for(var i=0;i<r.length;i++)Ze(e,n,r[i]);else Ze(e,n,r)}}function Ze(e,t,n,r){return a(n)&&(r=n,n=n.handler),"string"==typeof n&&(n=e[n]),e.$watch(t,n,r)}function Ye(e){var t=e.$options.provide;t&&(e._provided="function"==typeof t?t.call(e):t)}function Qe(e){var t=Xe(e.$options.inject,e);t&&(mo.shouldConvert=!1,Object.keys(t).forEach(function(n){M(e,n,t[n])}),mo.shouldConvert=!0)}function Xe(e,t){if(e){for(var n=Object.create(null),r=io?Reflect.ownKeys(e).filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}):Object.keys(e),i=0;i<r.length;i++){for(var o=r[i],a=e[o].from,s=t;s;){if(s._provided&&a in s._provided){n[o]=s._provided[a];break}s=s.$parent}if(!s&&"default"in e[o]){var c=e[o].default;n[o]="function"==typeof c?c.call(t):c}}return n}}function et(e,n){var r,i,a,s,c;if(Array.isArray(e)||"string"==typeof e)for(r=new Array(e.length),i=0,a=e.length;i<a;i++)r[i]=n(e[i],i);else if("number"==typeof e)for(r=new Array(e),i=0;i<e;i++)r[i]=n(i+1,i);else if(o(e))for(s=Object.keys(e),r=new Array(s.length),i=0,a=s.length;i<a;i++)c=s[i],r[i]=n(e[c],c,i);return t(r)&&(r._isVList=!0),r}function tt(e,t,n,r){var i=this.$scopedSlots[e];if(i)return n=n||{},r&&(n=y(y({},r),n)),i(n)||t;var o=this.$slots[e];return o||t}function nt(e){return q(this.$options,"filters",e,!0)||Pi}function rt(e,t,n,r){var i=Hi.keyCodes[t]||n;return i?Array.isArray(i)?-1===i.indexOf(e):i!==e:r?Ii(r)!==t:void 0}function it(e,t,n,r,i){if(n)if(o(n)){Array.isArray(n)&&(n=g(n));var a;for(var s in n)!function(o){if("class"===o||"style"===o||Si(o))a=e;else{var s=e.attrs&&e.attrs.type;a=r||Hi.mustUseProp(t,s,o)?e.domProps||(e.domProps={}):e.attrs||(e.attrs={})}o in a||(a[o]=n[o],i&&((e.on||(e.on={}))["update:"+o]=function(e){n[o]=e}))}(s)}else;return e}function ot(e,t){var n=this.$options.staticRenderFns,r=n.cached||(n.cached=[]),i=r[e];return i&&!t?Array.isArray(i)?j(i):E(i):(i=r[e]=n[e].call(this._renderProxy,null,this),st(i,"__static__"+e,!1),i)}function at(e,t,n){return st(e,"__once__"+t+(n?"_"+n:""),!0),e}function st(e,t,n){if(Array.isArray(e))for(var r=0;r<e.length;r++)e[r]&&"string"!=typeof e[r]&&ct(e[r],t+"_"+r,n);else ct(e,t,n)}function ct(e,t,n){e.isStatic=!0,e.key=t,e.isOnce=n}function ut(e,t){if(t)if(a(t)){var n=e.on=e.on?y({},e.on):{};for(var r in t){var i=n[r],o=t[r];n[r]=i?[].concat(i,o):o}}else;return e}function lt(e){e._o=at,e._n=l,e._s=u,e._l=et,e._t=tt,e._q=b,e._i=$,e._m=ot,e._f=nt,e._k=rt,e._b=it,e._v=T,e._e=fo,e._u=xe,e._g=ut}function ft(e,t,r,i,o){var a=o.options;this.data=e,this.props=t,this.children=r,this.parent=i,this.listeners=e.on||Bi,this.injections=Xe(a.inject,i),this.slots=function(){return Ce(r,i)};var s=Object.create(i),c=n(a._compiled),u=!c;c&&(this.$options=a,this.$slots=this.slots(),this.$scopedSlots=e.scopedSlots||Bi),a._scopeId?this._c=function(e,t,n,r){var o=_t(s,e,t,n,r,u);return o&&(o.functionalScopeId=a._scopeId,o.functionalContext=i),o}:this._c=function(e,t,n,r){return _t(s,e,t,n,r,u)}}function dt(e,n,r,i,o){var a=e.options,s={},c=a.props;if(t(c))for(var u in c)s[u]=W(u,c,n||Bi);else t(r.attrs)&&pt(s,r.attrs),t(r.props)&&pt(s,r.props);var l=new ft(r,s,o,i,e),f=a.render.call(null,l._c,l);return f instanceof uo&&(f.functionalContext=i,f.functionalOptions=a,r.slot&&((f.data||(f.data={})).slot=r.slot)),f}function pt(e,t){for(var n in t)e[ji(n)]=t[n]}function vt(r,i,a,s,c){if(!e(r)){var u=a.$options._base;if(o(r)&&(r=u.extend(r)),"function"==typeof r){var l;if(e(r.cid)&&(l=r,void 0===(r=he(l,u,a))))return ve(l,i,a,s,c);i=i||{},xt(r),t(i.model)&&gt(r.options,i);var f=se(i,r,c);if(n(r.options.functional))return dt(r,f,i,a,s);var d=i.on;if(i.on=i.nativeOn,n(r.options.abstract)){var p=i.slot;i={},p&&(i.slot=p)}mt(i);var v=r.options.name||c;return new uo("vue-component-"+r.cid+(v?"-"+v:""),i,void 0,void 0,void 0,a,{Ctor:r,propsData:f,listeners:d,tag:c,children:s},l)}}}function ht(e,n,r,i){var o=e.componentOptions,a={_isComponent:!0,parent:n,propsData:o.propsData,_componentTag:o.tag,_parentVnode:e,_parentListeners:o.listeners,_renderChildren:o.children,_parentElm:r||null,_refElm:i||null},s=e.data.inlineTemplate;return t(s)&&(a.render=s.render,a.staticRenderFns=s.staticRenderFns),new o.Ctor(a)}function mt(e){e.hook||(e.hook={});for(var t=0;t<Vo.length;t++){var n=Vo[t],r=e.hook[n],i=Uo[n];e.hook[n]=r?yt(i,r):i}}function yt(e,t){return function(n,r,i,o){e(n,r,i,o),t(n,r,i,o)}}function gt(e,n){var r=e.model&&e.model.prop||"value",i=e.model&&e.model.event||"input";(n.props||(n.props={}))[r]=n.model.value;var o=n.on||(n.on={});t(o[i])?o[i]=[n.model.callback].concat(o[i]):o[i]=n.model.callback}function _t(e,t,r,o,a,s){return(Array.isArray(r)||i(r))&&(a=o,o=r,r=void 0),n(s)&&(a=Ko),bt(e,t,r,o,a)}function bt(e,n,r,i,o){if(t(r)&&t(r.__ob__))return fo();if(t(r)&&t(r.is)&&(n=r.is),!n)return fo();Array.isArray(i)&&"function"==typeof i[0]&&((r=r||{}).scopedSlots={default:i[0]},i.length=0),o===Ko?i=le(i):o===zo&&(i=ue(i));var a,s;if("string"==typeof n){var c;s=e.$vnode&&e.$vnode.ns||Hi.getTagNamespace(n),a=Hi.isReservedTag(n)?new uo(Hi.parsePlatformTagName(n),r,i,void 0,void 0,e):t(c=q(e.$options,"components",n))?vt(c,r,e,i,n):new uo(n,r,i,void 0,void 0,e)}else a=vt(n,r,e,i);return t(a)?(s&&$t(a,s),a):fo()}function $t(r,i,o){if(r.ns=i,"foreignObject"===r.tag&&(i=void 0,o=!0),t(r.children))for(var a=0,s=r.children.length;a<s;a++){var c=r.children[a];t(c.tag)&&(e(c.ns)||n(o))&&$t(c,i,o)}}function Ct(e){e._vnode=null;var t=e.$options,n=e.$vnode=t._parentVnode,r=n&&n.context;e.$slots=Ce(t._renderChildren,r),e.$scopedSlots=Bi,e._c=function(t,n,r,i){return _t(e,t,n,r,i,!1)},e.$createElement=function(t,n,r,i){return _t(e,t,n,r,i,!0)};var i=n&&n.data;M(e,"$attrs",i&&i.attrs||Bi,null,!0),M(e,"$listeners",t._parentListeners||Bi,null,!0)}function wt(e,t){var n=e.$options=Object.create(e.constructor.options);n.parent=t.parent,n.propsData=t.propsData,n._parentVnode=t._parentVnode,n._parentListeners=t._parentListeners,n._renderChildren=t._renderChildren,n._componentTag=t._componentTag,n._parentElm=t._parentElm,n._refElm=t._refElm,t.render&&(n.render=t.render,n.staticRenderFns=t.staticRenderFns)}function xt(e){var t=e.options;if(e.super){var n=xt(e.super);if(n!==e.superOptions){e.superOptions=n;var r=kt(e);r&&y(e.extendOptions,r),(t=e.options=J(n,e.extendOptions)).name&&(t.components[t.name]=e)}}return t}function kt(e){var t,n=e.options,r=e.extendOptions,i=e.sealedOptions;for(var o in n)n[o]!==i[o]&&(t||(t={}),t[o]=At(n[o],r[o],i[o]));return t}function At(e,t,n){if(Array.isArray(e)){var r=[];n=Array.isArray(n)?n:[n],t=Array.isArray(t)?t:[t];for(var i=0;i<e.length;i++)(t.indexOf(e[i])>=0||n.indexOf(e[i])<0)&&r.push(e[i]);return r}return e}function Ot(e){this._init(e)}function St(e){e.use=function(e){var t=this._installedPlugins||(this._installedPlugins=[]);if(t.indexOf(e)>-1)return this;var n=m(arguments,1);return n.unshift(this),"function"==typeof e.install?e.install.apply(e,n):"function"==typeof e&&e.apply(null,n),t.push(e),this}}function Tt(e){e.mixin=function(e){return this.options=J(this.options,e),this}}function Et(e){e.cid=0;var t=1;e.extend=function(e){e=e||{};var n=this,r=n.cid,i=e._Ctor||(e._Ctor={});if(i[r])return i[r];var o=e.name||n.options.name,a=function(e){this._init(e)};return a.prototype=Object.create(n.prototype),a.prototype.constructor=a,a.cid=t++,a.options=J(n.options,e),a.super=n,a.options.props&&jt(a),a.options.computed&&Lt(a),a.extend=n.extend,a.mixin=n.mixin,a.use=n.use,Ri.forEach(function(e){a[e]=n[e]}),o&&(a.options.components[o]=a),a.superOptions=n.options,a.extendOptions=e,a.sealedOptions=y({},a.options),i[r]=a,a}}function jt(e){var t=e.options.props;for(var n in t)He(e.prototype,"_props",n)}function Lt(e){var t=e.options.computed;for(var n in t)Je(e.prototype,n,t[n])}function Nt(e){Ri.forEach(function(t){e[t]=function(e,n){return n?("component"===t&&a(n)&&(n.name=n.name||e,n=this.options._base.extend(n)),"directive"===t&&"function"==typeof n&&(n={bind:n,update:n}),this.options[t+"s"][e]=n,n):this.options[t+"s"][e]}})}function It(e){return e&&(e.Ctor.options.name||e.tag)}function Mt(e,t){return Array.isArray(e)?e.indexOf(t)>-1:"string"==typeof e?e.split(",").indexOf(t)>-1:!!s(e)&&e.test(t)}function Pt(e,t){var n=e.cache,r=e.keys,i=e._vnode;for(var o in n){var a=n[o];if(a){var s=It(a.componentOptions);s&&!t(s)&&Dt(n,o,r,i)}}}function Dt(e,t,n,r){var i=e[t];i&&i!==r&&i.componentInstance.$destroy(),e[t]=null,d(n,t)}function Rt(e){for(var n=e.data,r=e,i=e;t(i.componentInstance);)(i=i.componentInstance._vnode).data&&(n=Ft(i.data,n));for(;t(r=r.parent);)r.data&&(n=Ft(n,r.data));return Ht(n.staticClass,n.class)}function Ft(e,n){return{staticClass:Bt(e.staticClass,n.staticClass),class:t(e.class)?[e.class,n.class]:n.class}}function Ht(e,n){return t(e)||t(n)?Bt(e,Ut(n)):""}function Bt(e,t){return e?t?e+" "+t:e:t||""}function Ut(e){return Array.isArray(e)?Vt(e):o(e)?zt(e):"string"==typeof e?e:""}function Vt(e){for(var n,r="",i=0,o=e.length;i<o;i++)t(n=Ut(e[i]))&&""!==n&&(r&&(r+=" "),r+=n);return r}function zt(e){var t="";for(var n in e)e[n]&&(t&&(t+=" "),t+=n);return t}function Kt(e){return va(e)?"svg":"math"===e?"math":void 0}function Jt(e){if("string"==typeof e){var t=document.querySelector(e);return t||document.createElement("div")}return e}function qt(e,t){var n=e.data.ref;if(n){var r=e.context,i=e.componentInstance||e.elm,o=r.$refs;t?Array.isArray(o[n])?d(o[n],i):o[n]===i&&(o[n]=void 0):e.data.refInFor?Array.isArray(o[n])?o[n].indexOf(i)<0&&o[n].push(i):o[n]=[i]:o[n]=i}}function Wt(r,i){return r.key===i.key&&(r.tag===i.tag&&r.isComment===i.isComment&&t(r.data)===t(i.data)&&Gt(r,i)||n(r.isAsyncPlaceholder)&&r.asyncFactory===i.asyncFactory&&e(i.asyncFactory.error))}function Gt(e,n){if("input"!==e.tag)return!0;var r,i=t(r=e.data)&&t(r=r.attrs)&&r.type,o=t(r=n.data)&&t(r=r.attrs)&&r.type;return i===o||ya(i)&&ya(o)}function Zt(e,n,r){var i,o,a={};for(i=n;i<=r;++i)t(o=e[i].key)&&(a[o]=i);return a}function Yt(e,t){(e.data.directives||t.data.directives)&&Qt(e,t)}function Qt(e,t){var n,r,i,o=e===ba,a=t===ba,s=Xt(e.data.directives,e.context),c=Xt(t.data.directives,t.context),u=[],l=[];for(n in c)r=s[n],i=c[n],r?(i.oldValue=r.value,tn(i,"update",t,e),i.def&&i.def.componentUpdated&&l.push(i)):(tn(i,"bind",t,e),i.def&&i.def.inserted&&u.push(i));if(u.length){var f=function(){for(var n=0;n<u.length;n++)tn(u[n],"inserted",t,e)};o?ae(t.data.hook||(t.data.hook={}),"insert",f):f()}if(l.length&&ae(t.data.hook||(t.data.hook={}),"postpatch",function(){for(var n=0;n<l.length;n++)tn(l[n],"componentUpdated",t,e)}),!o)for(n in s)c[n]||tn(s[n],"unbind",e,e,a)}function Xt(e,t){var n=Object.create(null);if(!e)return n;var r,i;for(r=0;r<e.length;r++)(i=e[r]).modifiers||(i.modifiers=wa),n[en(i)]=i,i.def=q(t.$options,"directives",i.name,!0);return n}function en(e){return e.rawName||e.name+"."+Object.keys(e.modifiers||{}).join(".")}function tn(e,t,n,r,i){var o=e.def&&e.def[t];if(o)try{o(n.elm,e,n,r,i)}catch(r){Q(r,n.context,"directive "+e.name+" "+t+" hook")}}function nn(n,r){var i=r.componentOptions;if(!(t(i)&&!1===i.Ctor.options.inheritAttrs||e(n.data.attrs)&&e(r.data.attrs))){var o,a,s=r.elm,c=n.data.attrs||{},u=r.data.attrs||{};t(u.__ob__)&&(u=r.data.attrs=y({},u));for(o in u)a=u[o],c[o]!==a&&rn(s,o,a);(qi||Wi)&&u.value!==c.value&&rn(s,"value",u.value);for(o in c)e(u[o])&&(ua(o)?s.removeAttributeNS(ca,la(o)):aa(o)||s.removeAttribute(o))}}function rn(e,t,n){sa(t)?fa(n)?e.removeAttribute(t):(n="allowfullscreen"===t&&"EMBED"===e.tagName?"true":t,e.setAttribute(t,n)):aa(t)?e.setAttribute(t,fa(n)||"false"===n?"false":"true"):ua(t)?fa(n)?e.removeAttributeNS(ca,la(t)):e.setAttributeNS(ca,t,n):fa(n)?e.removeAttribute(t):e.setAttribute(t,n)}function on(n,r){var i=r.elm,o=r.data,a=n.data;if(!(e(o.staticClass)&&e(o.class)&&(e(a)||e(a.staticClass)&&e(a.class)))){var s=Rt(r),c=i._transitionClasses;t(c)&&(s=Bt(s,Ut(c))),s!==i._prevClass&&(i.setAttribute("class",s),i._prevClass=s)}}function an(e){function t(){(a||(a=[])).push(e.slice(v,i).trim()),v=i+1}var n,r,i,o,a,s=!1,c=!1,u=!1,l=!1,f=0,d=0,p=0,v=0;for(i=0;i<e.length;i++)if(r=n,n=e.charCodeAt(i),s)39===n&&92!==r&&(s=!1);else if(c)34===n&&92!==r&&(c=!1);else if(u)96===n&&92!==r&&(u=!1);else if(l)47===n&&92!==r&&(l=!1);else if(124!==n||124===e.charCodeAt(i+1)||124===e.charCodeAt(i-1)||f||d||p){switch(n){case 34:c=!0;break;case 39:s=!0;break;case 96:u=!0;break;case 40:p++;break;case 41:p--;break;case 91:d++;break;case 93:d--;break;case 123:f++;break;case 125:f--}if(47===n){for(var h=i-1,m=void 0;h>=0&&" "===(m=e.charAt(h));h--);m&&Oa.test(m)||(l=!0)}}else void 0===o?(v=i+1,o=e.slice(0,i).trim()):t();if(void 0===o?o=e.slice(0,i).trim():0!==v&&t(),a)for(i=0;i<a.length;i++)o=sn(o,a[i]);return o}function sn(e,t){var n=t.indexOf("(");return n<0?'_f("'+t+'")('+e+")":'_f("'+t.slice(0,n)+'")('+e+","+t.slice(n+1)}function cn(e){console.error("[Vue compiler]: "+e)}function un(e,t){return e?e.map(function(e){return e[t]}).filter(function(e){return e}):[]}function ln(e,t,n){(e.props||(e.props=[])).push({name:t,value:n})}function fn(e,t,n){(e.attrs||(e.attrs=[])).push({name:t,value:n})}function dn(e,t,n,r,i,o){(e.directives||(e.directives=[])).push({name:t,rawName:n,value:r,arg:i,modifiers:o})}function pn(e,t,n,r,i,o){r&&r.capture&&(delete r.capture,t="!"+t),r&&r.once&&(delete r.once,t="~"+t),r&&r.passive&&(delete r.passive,t="&"+t);var a;r&&r.native?(delete r.native,a=e.nativeEvents||(e.nativeEvents={})):a=e.events||(e.events={});var s={value:n,modifiers:r},c=a[t];Array.isArray(c)?i?c.unshift(s):c.push(s):a[t]=c?i?[s,c]:[c,s]:s}function vn(e,t,n){var r=hn(e,":"+t)||hn(e,"v-bind:"+t);if(null!=r)return an(r);if(!1!==n){var i=hn(e,t);if(null!=i)return JSON.stringify(i)}}function hn(e,t,n){var r;if(null!=(r=e.attrsMap[t]))for(var i=e.attrsList,o=0,a=i.length;o<a;o++)if(i[o].name===t){i.splice(o,1);break}return n&&delete e.attrsMap[t],r}function mn(e,t,n){var r=n||{},i=r.number,o="$$v";r.trim&&(o="(typeof $$v === 'string'? $$v.trim(): $$v)"),i&&(o="_n("+o+")");var a=yn(t,o);e.model={value:"("+t+")",expression:'"'+t+'"',callback:"function ($$v) {"+a+"}"}}function yn(e,t){var n=gn(e);return null===n.key?e+"="+t:"$set("+n.exp+", "+n.key+", "+t+")"}function gn(e){if(Go=e.length,e.indexOf("[")<0||e.lastIndexOf("]")<Go-1)return(Qo=e.lastIndexOf("."))>-1?{exp:e.slice(0,Qo),key:'"'+e.slice(Qo+1)+'"'}:{exp:e,key:null};for(Zo=e,Qo=Xo=ea=0;!bn();)$n(Yo=_n())?wn(Yo):91===Yo&&Cn(Yo);return{exp:e.slice(0,Xo),key:e.slice(Xo+1,ea)}}function _n(){return Zo.charCodeAt(++Qo)}function bn(){return Qo>=Go}function $n(e){return 34===e||39===e}function Cn(e){var t=1;for(Xo=Qo;!bn();)if(e=_n(),$n(e))wn(e);else if(91===e&&t++,93===e&&t--,0===t){ea=Qo;break}}function wn(e){for(var t=e;!bn()&&(e=_n())!==t;);}function xn(e,t,n){var r=n&&n.number,i=vn(e,"value")||"null",o=vn(e,"true-value")||"true",a=vn(e,"false-value")||"false";ln(e,"checked","Array.isArray("+t+")?_i("+t+","+i+")>-1"+("true"===o?":("+t+")":":_q("+t+","+o+")")),pn(e,"change","var $$a="+t+",$$el=$event.target,$$c=$$el.checked?("+o+"):("+a+");if(Array.isArray($$a)){var $$v="+(r?"_n("+i+")":i)+",$$i=_i($$a,$$v);if($$el.checked){$$i<0&&("+t+"=$$a.concat([$$v]))}else{$$i>-1&&("+t+"=$$a.slice(0,$$i).concat($$a.slice($$i+1)))}}else{"+yn(t,"$$c")+"}",null,!0)}function kn(e,t,n){var r=n&&n.number,i=vn(e,"value")||"null";ln(e,"checked","_q("+t+","+(i=r?"_n("+i+")":i)+")"),pn(e,"change",yn(t,i),null,!0)}function An(e,t,n){var r="var $$selectedVal = "+('Array.prototype.filter.call($event.target.options,function(o){return o.selected}).map(function(o){var val = "_value" in o ? o._value : o.value;return '+(n&&n.number?"_n(val)":"val")+"})")+";";pn(e,"change",r=r+" "+yn(t,"$event.target.multiple ? $$selectedVal : $$selectedVal[0]"),null,!0)}function On(e,t,n){var r=e.attrsMap.type,i=n||{},o=i.lazy,a=i.number,s=i.trim,c=!o&&"range"!==r,u=o?"change":"range"===r?Sa:"input",l="$event.target.value";s&&(l="$event.target.value.trim()"),a&&(l="_n("+l+")");var f=yn(t,l);c&&(f="if($event.target.composing)return;"+f),ln(e,"value","("+t+")"),pn(e,u,f,null,!0),(s||a)&&pn(e,"blur","$forceUpdate()")}function Sn(e){if(t(e[Sa])){var n=Ji?"change":"input";e[n]=[].concat(e[Sa],e[n]||[]),delete e[Sa]}t(e[Ta])&&(e.change=[].concat(e[Ta],e.change||[]),delete e[Ta])}function Tn(e,t,n){var r=ta;return function i(){null!==e.apply(null,arguments)&&jn(t,i,n,r)}}function En(e,t,n,r,i){t=ne(t),n&&(t=Tn(t,e,r)),ta.addEventListener(e,t,Qi?{capture:r,passive:i}:r)}function jn(e,t,n,r){(r||ta).removeEventListener(e,t._withTask||t,n)}function Ln(t,n){if(!e(t.data.on)||!e(n.data.on)){var r=n.data.on||{},i=t.data.on||{};ta=n.elm,Sn(r),oe(r,i,En,jn,n.context)}}function Nn(n,r){if(!e(n.data.domProps)||!e(r.data.domProps)){var i,o,a=r.elm,s=n.data.domProps||{},c=r.data.domProps||{};t(c.__ob__)&&(c=r.data.domProps=y({},c));for(i in s)e(c[i])&&(a[i]="");for(i in c){if(o=c[i],"textContent"===i||"innerHTML"===i){if(r.children&&(r.children.length=0),o===s[i])continue;1===a.childNodes.length&&a.removeChild(a.childNodes[0])}if("value"===i){a._value=o;var u=e(o)?"":String(o);In(a,u)&&(a.value=u)}else a[i]=o}}}function In(e,t){return!e.composing&&("OPTION"===e.tagName||Mn(e,t)||Pn(e,t))}function Mn(e,t){var n=!0;try{n=document.activeElement!==e}catch(e){}return n&&e.value!==t}function Pn(e,n){var r=e.value,i=e._vModifiers;return t(i)&&i.number?l(r)!==l(n):t(i)&&i.trim?r.trim()!==n.trim():r!==n}function Dn(e){var t=Rn(e.style);return e.staticStyle?y(e.staticStyle,t):t}function Rn(e){return Array.isArray(e)?g(e):"string"==typeof e?La(e):e}function Fn(e,t){var n,r={};if(t)for(var i=e;i.componentInstance;)(i=i.componentInstance._vnode).data&&(n=Dn(i.data))&&y(r,n);(n=Dn(e.data))&&y(r,n);for(var o=e;o=o.parent;)o.data&&(n=Dn(o.data))&&y(r,n);return r}function Hn(n,r){var i=r.data,o=n.data;if(!(e(i.staticStyle)&&e(i.style)&&e(o.staticStyle)&&e(o.style))){var a,s,c=r.elm,u=o.staticStyle,l=o.normalizedStyle||o.style||{},f=u||l,d=Rn(r.data.style)||{};r.data.normalizedStyle=t(d.__ob__)?y({},d):d;var p=Fn(r,!0);for(s in f)e(p[s])&&Ma(c,s,"");for(s in p)(a=p[s])!==f[s]&&Ma(c,s,null==a?"":a)}}function Bn(e,t){if(t&&(t=t.trim()))if(e.classList)t.indexOf(" ")>-1?t.split(/\s+/).forEach(function(t){return e.classList.add(t)}):e.classList.add(t);else{var n=" "+(e.getAttribute("class")||"")+" ";n.indexOf(" "+t+" ")<0&&e.setAttribute("class",(n+t).trim())}}function Un(e,t){if(t&&(t=t.trim()))if(e.classList)t.indexOf(" ")>-1?t.split(/\s+/).forEach(function(t){return e.classList.remove(t)}):e.classList.remove(t),e.classList.length||e.removeAttribute("class");else{for(var n=" "+(e.getAttribute("class")||"")+" ",r=" "+t+" ";n.indexOf(r)>=0;)n=n.replace(r," ");(n=n.trim())?e.setAttribute("class",n):e.removeAttribute("class")}}function Vn(e){if(e){if("object"==typeof e){var t={};return!1!==e.css&&y(t,Fa(e.name||"v")),y(t,e),t}return"string"==typeof e?Fa(e):void 0}}function zn(e){qa(function(){qa(e)})}function Kn(e,t){var n=e._transitionClasses||(e._transitionClasses=[]);n.indexOf(t)<0&&(n.push(t),Bn(e,t))}function Jn(e,t){e._transitionClasses&&d(e._transitionClasses,t),Un(e,t)}function qn(e,t,n){var r=Wn(e,t),i=r.type,o=r.timeout,a=r.propCount;if(!i)return n();var s=i===Ba?za:Ja,c=0,u=function(){e.removeEventListener(s,l),n()},l=function(t){t.target===e&&++c>=a&&u()};setTimeout(function(){c<a&&u()},o+1),e.addEventListener(s,l)}function Wn(e,t){var n,r=window.getComputedStyle(e),i=r[Va+"Delay"].split(", "),o=r[Va+"Duration"].split(", "),a=Gn(i,o),s=r[Ka+"Delay"].split(", "),c=r[Ka+"Duration"].split(", "),u=Gn(s,c),l=0,f=0;return t===Ba?a>0&&(n=Ba,l=a,f=o.length):t===Ua?u>0&&(n=Ua,l=u,f=c.length):f=(n=(l=Math.max(a,u))>0?a>u?Ba:Ua:null)?n===Ba?o.length:c.length:0,{type:n,timeout:l,propCount:f,hasTransform:n===Ba&&Wa.test(r[Va+"Property"])}}function Gn(e,t){for(;e.length<t.length;)e=e.concat(e);return Math.max.apply(null,t.map(function(t,n){return Zn(t)+Zn(e[n])}))}function Zn(e){return 1e3*Number(e.slice(0,-1))}function Yn(n,r){var i=n.elm;t(i._leaveCb)&&(i._leaveCb.cancelled=!0,i._leaveCb());var a=Vn(n.data.transition);if(!e(a)&&!t(i._enterCb)&&1===i.nodeType){for(var s=a.css,c=a.type,u=a.enterClass,f=a.enterToClass,d=a.enterActiveClass,p=a.appearClass,v=a.appearToClass,h=a.appearActiveClass,m=a.beforeEnter,y=a.enter,g=a.afterEnter,_=a.enterCancelled,b=a.beforeAppear,$=a.appear,w=a.afterAppear,x=a.appearCancelled,k=a.duration,A=Eo,O=Eo.$vnode;O&&O.parent;)A=(O=O.parent).context;var S=!A._isMounted||!n.isRootInsert;if(!S||$||""===$){var T=S&&p?p:u,E=S&&h?h:d,j=S&&v?v:f,L=S?b||m:m,N=S&&"function"==typeof $?$:y,I=S?w||g:g,M=S?x||_:_,P=l(o(k)?k.enter:k),D=!1!==s&&!qi,R=er(N),F=i._enterCb=C(function(){D&&(Jn(i,j),Jn(i,E)),F.cancelled?(D&&Jn(i,T),M&&M(i)):I&&I(i),i._enterCb=null});n.data.show||ae(n.data.hook||(n.data.hook={}),"insert",function(){var e=i.parentNode,t=e&&e._pending&&e._pending[n.key];t&&t.tag===n.tag&&t.elm._leaveCb&&t.elm._leaveCb(),N&&N(i,F)}),L&&L(i),D&&(Kn(i,T),Kn(i,E),zn(function(){Kn(i,j),Jn(i,T),F.cancelled||R||(Xn(P)?setTimeout(F,P):qn(i,c,F))})),n.data.show&&(r&&r(),N&&N(i,F)),D||R||F()}}}function Qn(n,r){function i(){x.cancelled||(n.data.show||((a.parentNode._pending||(a.parentNode._pending={}))[n.key]=n),v&&v(a),b&&(Kn(a,f),Kn(a,p),zn(function(){Kn(a,d),Jn(a,f),x.cancelled||$||(Xn(w)?setTimeout(x,w):qn(a,u,x))})),h&&h(a,x),b||$||x())}var a=n.elm;t(a._enterCb)&&(a._enterCb.cancelled=!0,a._enterCb());var s=Vn(n.data.transition);if(e(s))return r();if(!t(a._leaveCb)&&1===a.nodeType){var c=s.css,u=s.type,f=s.leaveClass,d=s.leaveToClass,p=s.leaveActiveClass,v=s.beforeLeave,h=s.leave,m=s.afterLeave,y=s.leaveCancelled,g=s.delayLeave,_=s.duration,b=!1!==c&&!qi,$=er(h),w=l(o(_)?_.leave:_),x=a._leaveCb=C(function(){a.parentNode&&a.parentNode._pending&&(a.parentNode._pending[n.key]=null),b&&(Jn(a,d),Jn(a,p)),x.cancelled?(b&&Jn(a,f),y&&y(a)):(r(),m&&m(a)),a._leaveCb=null});g?g(i):i()}}function Xn(e){return"number"==typeof e&&!isNaN(e)}function er(n){if(e(n))return!1;var r=n.fns;return t(r)?er(Array.isArray(r)?r[0]:r):(n._length||n.length)>1}function tr(e,t){!0!==t.data.show&&Yn(t)}function nr(e,t,n){rr(e,t,n),(Ji||Wi)&&setTimeout(function(){rr(e,t,n)},0)}function rr(e,t,n){var r=t.value,i=e.multiple;if(!i||Array.isArray(r)){for(var o,a,s=0,c=e.options.length;s<c;s++)if(a=e.options[s],i)o=$(r,or(a))>-1,a.selected!==o&&(a.selected=o);else if(b(or(a),r))return void(e.selectedIndex!==s&&(e.selectedIndex=s));i||(e.selectedIndex=-1)}}function ir(e,t){return t.every(function(t){return!b(t,e)})}function or(e){return"_value"in e?e._value:e.value}function ar(e){e.target.composing=!0}function sr(e){e.target.composing&&(e.target.composing=!1,cr(e.target,"input"))}function cr(e,t){var n=document.createEvent("HTMLEvents");n.initEvent(t,!0,!0),e.dispatchEvent(n)}function ur(e){return!e.componentInstance||e.data&&e.data.transition?e:ur(e.componentInstance._vnode)}function lr(e){var t=e&&e.componentOptions;return t&&t.Ctor.options.abstract?lr(ye(t.children)):e}function fr(e){var t={},n=e.$options;for(var r in n.propsData)t[r]=e[r];var i=n._parentListeners;for(var o in i)t[ji(o)]=i[o];return t}function dr(e,t){if(/\d-keep-alive$/.test(t.tag))return e("keep-alive",{props:t.componentOptions.propsData})}function pr(e){for(;e=e.parent;)if(e.data.transition)return!0}function vr(e,t){return t.key===e.key&&t.tag===e.tag}function hr(e){e.elm._moveCb&&e.elm._moveCb(),e.elm._enterCb&&e.elm._enterCb()}function mr(e){e.data.newPos=e.elm.getBoundingClientRect()}function yr(e){var t=e.data.pos,n=e.data.newPos,r=t.left-n.left,i=t.top-n.top;if(r||i){e.data.moved=!0;var o=e.elm.style;o.transform=o.WebkitTransform="translate("+r+"px,"+i+"px)",o.transitionDuration="0s"}}function gr(e,t){var n=t?os(t):rs;if(n.test(e)){for(var r,i,o=[],a=n.lastIndex=0;r=n.exec(e);){(i=r.index)>a&&o.push(JSON.stringify(e.slice(a,i)));var s=an(r[1].trim());o.push("_s("+s+")"),a=i+r[0].length}return a<e.length&&o.push(JSON.stringify(e.slice(a))),o.join("+")}}function _r(e,t){var n=t?Ps:Ms;return e.replace(n,function(e){return Is[e]})}function br(e,t){function n(t){l+=t,e=e.substring(t)}function r(e,n,r){var i,s;if(null==n&&(n=l),null==r&&(r=l),e&&(s=e.toLowerCase()),e)for(i=a.length-1;i>=0&&a[i].lowerCasedTag!==s;i--);else i=0;if(i>=0){for(var c=a.length-1;c>=i;c--)t.end&&t.end(a[c].tag,n,r);a.length=i,o=i&&a[i-1].tag}else"br"===s?t.start&&t.start(e,[],!0,n,r):"p"===s&&(t.start&&t.start(e,[],!1,n,r),t.end&&t.end(e,n,r))}for(var i,o,a=[],s=t.expectHTML,c=t.isUnaryTag||Mi,u=t.canBeLeftOpenTag||Mi,l=0;e;){if(i=e,o&&Ls(o)){var f=0,d=o.toLowerCase(),p=Ns[d]||(Ns[d]=new RegExp("([\\s\\S]*?)(</"+d+"[^>]*>)","i")),v=e.replace(p,function(e,n,r){return f=r.length,Ls(d)||"noscript"===d||(n=n.replace(/<!--([\s\S]*?)-->/g,"$1").replace(/<!\[CDATA\[([\s\S]*?)]]>/g,"$1")),Rs(d,n)&&(n=n.slice(1)),t.chars&&t.chars(n),""});l+=e.length-v.length,e=v,r(d,l-f,l)}else{var h=e.indexOf("<");if(0===h){if(_s.test(e)){var m=e.indexOf("--\x3e");if(m>=0){t.shouldKeepComment&&t.comment(e.substring(4,m)),n(m+3);continue}}if(bs.test(e)){var y=e.indexOf("]>");if(y>=0){n(y+2);continue}}var g=e.match(gs);if(g){n(g[0].length);continue}var _=e.match(ys);if(_){var b=l;n(_[0].length),r(_[1],b,l);continue}var $=function(){var t=e.match(hs);if(t){var r={tagName:t[1],attrs:[],start:l};n(t[0].length);for(var i,o;!(i=e.match(ms))&&(o=e.match(ds));)n(o[0].length),r.attrs.push(o);if(i)return r.unarySlash=i[1],n(i[0].length),r.end=l,r}}();if($){!function(e){var n=e.tagName,i=e.unarySlash;s&&("p"===o&&fs(n)&&r(o),u(n)&&o===n&&r(n));for(var l=c(n)||!!i,f=e.attrs.length,d=new Array(f),p=0;p<f;p++){var v=e.attrs[p];$s&&-1===v[0].indexOf('""')&&(""===v[3]&&delete v[3],""===v[4]&&delete v[4],""===v[5]&&delete v[5]);var h=v[3]||v[4]||v[5]||"";d[p]={name:v[1],value:_r(h,t.shouldDecodeNewlines)}}l||(a.push({tag:n,lowerCasedTag:n.toLowerCase(),attrs:d}),o=n),t.start&&t.start(n,d,l,e.start,e.end)}($),Rs(o,e)&&n(1);continue}}var C=void 0,w=void 0,x=void 0;if(h>=0){for(w=e.slice(h);!(ys.test(w)||hs.test(w)||_s.test(w)||bs.test(w)||(x=w.indexOf("<",1))<0);)h+=x,w=e.slice(h);C=e.substring(0,h),n(h)}h<0&&(C=e,e=""),t.chars&&C&&t.chars(C)}if(e===i){t.chars&&t.chars(e);break}}r()}function $r(e,t,n){return{type:1,tag:e,attrsList:t,attrsMap:Fr(t),parent:n,children:[]}}function Cr(e,t){function n(e){e.pre&&(s=!1),Os(e.tag)&&(c=!1)}Cs=t.warn||cn,Os=t.isPreTag||Mi,Ss=t.mustUseProp||Mi,Ts=t.getTagNamespace||Mi,xs=un(t.modules,"transformNode"),ks=un(t.modules,"preTransformNode"),As=un(t.modules,"postTransformNode"),ws=t.delimiters;var r,i,o=[],a=!1!==t.preserveWhitespace,s=!1,c=!1;return br(e,{warn:Cs,expectHTML:t.expectHTML,isUnaryTag:t.isUnaryTag,canBeLeftOpenTag:t.canBeLeftOpenTag,shouldDecodeNewlines:t.shouldDecodeNewlines,shouldKeepComment:t.comments,start:function(e,a,u){var l=i&&i.ns||Ts(e);Ji&&"svg"===l&&(a=Ur(a));var f=$r(e,a,i);l&&(f.ns=l),Br(f)&&!no()&&(f.forbidden=!0);for(var d=0;d<ks.length;d++)f=ks[d](f,t)||f;if(s||(wr(f),f.pre&&(s=!0)),Os(f.tag)&&(c=!0),s?xr(f):f.processed||(Sr(f),Tr(f),Nr(f),kr(f,t)),r?o.length||r.if&&(f.elseif||f.else)&&Lr(r,{exp:f.elseif,block:f}):r=f,i&&!f.forbidden)if(f.elseif||f.else)Er(f,i);else if(f.slotScope){i.plain=!1;var p=f.slotTarget||'"default"';(i.scopedSlots||(i.scopedSlots={}))[p]=f}else i.children.push(f),f.parent=i;u?n(f):(i=f,o.push(f));for(var v=0;v<As.length;v++)As[v](f,t)},end:function(){var e=o[o.length-1],t=e.children[e.children.length-1];t&&3===t.type&&" "===t.text&&!c&&e.children.pop(),o.length-=1,i=o[o.length-1],n(e)},chars:function(e){if(i&&(!Ji||"textarea"!==i.tag||i.attrsMap.placeholder!==e)){var t=i.children;if(e=c||e.trim()?Hr(i)?e:Js(e):a&&t.length?" ":""){var n;!s&&" "!==e&&(n=gr(e,ws))?t.push({type:2,expression:n,text:e}):" "===e&&t.length&&" "===t[t.length-1].text||t.push({type:3,text:e})}}},comment:function(e){i.children.push({type:3,text:e,isComment:!0})}}),r}function wr(e){null!=hn(e,"v-pre")&&(e.pre=!0)}function xr(e){var t=e.attrsList.length;if(t)for(var n=e.attrs=new Array(t),r=0;r<t;r++)n[r]={name:e.attrsList[r].name,value:JSON.stringify(e.attrsList[r].value)};else e.pre||(e.plain=!0)}function kr(e,t){Ar(e),e.plain=!e.key&&!e.attrsList.length,Or(e),Ir(e),Mr(e);for(var n=0;n<xs.length;n++)e=xs[n](e,t)||e;Pr(e)}function Ar(e){var t=vn(e,"key");t&&(e.key=t)}function Or(e){var t=vn(e,"ref");t&&(e.ref=t,e.refInFor=Dr(e))}function Sr(e){var t;if(t=hn(e,"v-for")){var n=t.match(Bs);if(!n)return;e.for=n[2].trim();var r=n[1].trim(),i=r.match(Us);i?(e.alias=i[1].trim(),e.iterator1=i[2].trim(),i[3]&&(e.iterator2=i[3].trim())):e.alias=r}}function Tr(e){var t=hn(e,"v-if");if(t)e.if=t,Lr(e,{exp:t,block:e});else{null!=hn(e,"v-else")&&(e.else=!0);var n=hn(e,"v-else-if");n&&(e.elseif=n)}}function Er(e,t){var n=jr(t.children);n&&n.if&&Lr(n,{exp:e.elseif,block:e})}function jr(e){for(var t=e.length;t--;){if(1===e[t].type)return e[t];e.pop()}}function Lr(e,t){e.ifConditions||(e.ifConditions=[]),e.ifConditions.push(t)}function Nr(e){null!=hn(e,"v-once")&&(e.once=!0)}function Ir(e){if("slot"===e.tag)e.slotName=vn(e,"name");else{var t;"template"===e.tag?(t=hn(e,"scope"),e.slotScope=t||hn(e,"slot-scope")):(t=hn(e,"slot-scope"))&&(e.slotScope=t);var n=vn(e,"slot");n&&(e.slotTarget='""'===n?'"default"':n,e.slotScope||fn(e,"slot",n))}}function Mr(e){var t;(t=vn(e,"is"))&&(e.component=t),null!=hn(e,"inline-template")&&(e.inlineTemplate=!0)}function Pr(e){var t,n,r,i,o,a,s,c=e.attrsList;for(t=0,n=c.length;t<n;t++)if(r=i=c[t].name,o=c[t].value,Hs.test(r))if(e.hasBindings=!0,(a=Rr(r))&&(r=r.replace(Ks,"")),zs.test(r))r=r.replace(zs,""),o=an(o),s=!1,a&&(a.prop&&(s=!0,"innerHtml"===(r=ji(r))&&(r="innerHTML")),a.camel&&(r=ji(r)),a.sync&&pn(e,"update:"+ji(r),yn(o,"$event"))),s||!e.component&&Ss(e.tag,e.attrsMap.type,r)?ln(e,r,o):fn(e,r,o);else if(Fs.test(r))pn(e,r=r.replace(Fs,""),o,a,!1,Cs);else{var u=(r=r.replace(Hs,"")).match(Vs),l=u&&u[1];l&&(r=r.slice(0,-(l.length+1))),dn(e,r,i,o,l,a)}else fn(e,r,JSON.stringify(o))}function Dr(e){for(var t=e;t;){if(void 0!==t.for)return!0;t=t.parent}return!1}function Rr(e){var t=e.match(Ks);if(t){var n={};return t.forEach(function(e){n[e.slice(1)]=!0}),n}}function Fr(e){for(var t={},n=0,r=e.length;n<r;n++)t[e[n].name]=e[n].value;return t}function Hr(e){return"script"===e.tag||"style"===e.tag}function Br(e){return"style"===e.tag||"script"===e.tag&&(!e.attrsMap.type||"text/javascript"===e.attrsMap.type)}function Ur(e){for(var t=[],n=0;n<e.length;n++){var r=e[n];qs.test(r.name)||(r.name=r.name.replace(Ws,""),t.push(r))}return t}function Vr(e){return $r(e.tag,e.attrsList.slice(),e.parent)}function zr(e,t,n){e.attrsMap[t]=n,e.attrsList.push({name:t,value:n})}function Kr(e,t){e&&(Es=Ys(t.staticKeys||""),js=t.isReservedTag||Mi,Jr(e),qr(e,!1))}function Jr(e){if(e.static=Wr(e),1===e.type){if(!js(e.tag)&&"slot"!==e.tag&&null==e.attrsMap["inline-template"])return;for(var t=0,n=e.children.length;t<n;t++){var r=e.children[t];Jr(r),r.static||(e.static=!1)}if(e.ifConditions)for(var i=1,o=e.ifConditions.length;i<o;i++){var a=e.ifConditions[i].block;Jr(a),a.static||(e.static=!1)}}}function qr(e,t){if(1===e.type){if((e.static||e.once)&&(e.staticInFor=t),e.static&&e.children.length&&(1!==e.children.length||3!==e.children[0].type))return void(e.staticRoot=!0);if(e.staticRoot=!1,e.children)for(var n=0,r=e.children.length;n<r;n++)qr(e.children[n],t||!!e.for);if(e.ifConditions)for(var i=1,o=e.ifConditions.length;i<o;i++)qr(e.ifConditions[i].block,t)}}function Wr(e){return 2!==e.type&&(3===e.type||!(!e.pre&&(e.hasBindings||e.if||e.for||Oi(e.tag)||!js(e.tag)||Gr(e)||!Object.keys(e).every(Es))))}function Gr(e){for(;e.parent;){if("template"!==(e=e.parent).tag)return!1;if(e.for)return!0}return!1}function Zr(e,t,n){var r=t?"nativeOn:{":"on:{";for(var i in e){var o=e[i];r+='"'+i+'":'+Yr(i,o)+","}return r.slice(0,-1)+"}"}function Yr(e,t){if(!t)return"function(){}";if(Array.isArray(t))return"["+t.map(function(t){return Yr(e,t)}).join(",")+"]";var n=Xs.test(t.value),r=Qs.test(t.value);if(t.modifiers){var i="",o="",a=[];for(var s in t.modifiers)if(nc[s])o+=nc[s],ec[s]&&a.push(s);else if("exact"===s){var c=t.modifiers;o+=tc(["ctrl","shift","alt","meta"].filter(function(e){return!c[e]}).map(function(e){return"$event."+e+"Key"}).join("||"))}else a.push(s);return a.length&&(i+=Qr(a)),o&&(i+=o),"function($event){"+i+(n?t.value+"($event)":r?"("+t.value+")($event)":t.value)+"}"}return n||r?t.value:"function($event){"+t.value+"}"}function Qr(e){return"if(!('button' in $event)&&"+e.map(Xr).join("&&")+")return null;"}function Xr(e){var t=parseInt(e,10);if(t)return"$event.keyCode!=="+t;var n=ec[e];return"_k($event.keyCode,"+JSON.stringify(e)+","+JSON.stringify(n)+",$event.key)"}function ei(e,t){var n=new ic(t);return{render:"with(this){return "+(e?ti(e,n):'_c("div")')+"}",staticRenderFns:n.staticRenderFns}}function ti(e,t){if(e.staticRoot&&!e.staticProcessed)return ni(e,t);if(e.once&&!e.onceProcessed)return ri(e,t);if(e.for&&!e.forProcessed)return ai(e,t);if(e.if&&!e.ifProcessed)return ii(e,t);if("template"!==e.tag||e.slotTarget){if("slot"===e.tag)return _i(e,t);var n;if(e.component)n=bi(e.component,e,t);else{var r=e.plain?void 0:si(e,t),i=e.inlineTemplate?null:pi(e,t,!0);n="_c('"+e.tag+"'"+(r?","+r:"")+(i?","+i:"")+")"}for(var o=0;o<t.transforms.length;o++)n=t.transforms[o](e,n);return n}return pi(e,t)||"void 0"}function ni(e,t){return e.staticProcessed=!0,t.staticRenderFns.push("with(this){return "+ti(e,t)+"}"),"_m("+(t.staticRenderFns.length-1)+(e.staticInFor?",true":"")+")"}function ri(e,t){if(e.onceProcessed=!0,e.if&&!e.ifProcessed)return ii(e,t);if(e.staticInFor){for(var n="",r=e.parent;r;){if(r.for){n=r.key;break}r=r.parent}return n?"_o("+ti(e,t)+","+t.onceId+++","+n+")":ti(e,t)}return ni(e,t)}function ii(e,t,n,r){return e.ifProcessed=!0,oi(e.ifConditions.slice(),t,n,r)}function oi(e,t,n,r){function i(e){return n?n(e,t):e.once?ri(e,t):ti(e,t)}if(!e.length)return r||"_e()";var o=e.shift();return o.exp?"("+o.exp+")?"+i(o.block)+":"+oi(e,t,n,r):""+i(o.block)}function ai(e,t,n,r){var i=e.for,o=e.alias,a=e.iterator1?","+e.iterator1:"",s=e.iterator2?","+e.iterator2:"";return e.forProcessed=!0,(r||"_l")+"(("+i+"),function("+o+a+s+"){return "+(n||ti)(e,t)+"})"}function si(e,t){var n="{",r=ci(e,t);r&&(n+=r+","),e.key&&(n+="key:"+e.key+","),e.ref&&(n+="ref:"+e.ref+","),e.refInFor&&(n+="refInFor:true,"),e.pre&&(n+="pre:true,"),e.component&&(n+='tag:"'+e.tag+'",');for(var i=0;i<t.dataGenFns.length;i++)n+=t.dataGenFns[i](e);if(e.attrs&&(n+="attrs:{"+$i(e.attrs)+"},"),e.props&&(n+="domProps:{"+$i(e.props)+"},"),e.events&&(n+=Zr(e.events,!1,t.warn)+","),e.nativeEvents&&(n+=Zr(e.nativeEvents,!0,t.warn)+","),e.slotTarget&&!e.slotScope&&(n+="slot:"+e.slotTarget+","),e.scopedSlots&&(n+=li(e.scopedSlots,t)+","),e.model&&(n+="model:{value:"+e.model.value+",callback:"+e.model.callback+",expression:"+e.model.expression+"},"),e.inlineTemplate){var o=ui(e,t);o&&(n+=o+",")}return n=n.replace(/,$/,"")+"}",e.wrapData&&(n=e.wrapData(n)),e.wrapListeners&&(n=e.wrapListeners(n)),n}function ci(e,t){var n=e.directives;if(n){var r,i,o,a,s="directives:[",c=!1;for(r=0,i=n.length;r<i;r++){o=n[r],a=!0;var u=t.directives[o.name];u&&(a=!!u(e,o,t.warn)),a&&(c=!0,s+='{name:"'+o.name+'",rawName:"'+o.rawName+'"'+(o.value?",value:("+o.value+"),expression:"+JSON.stringify(o.value):"")+(o.arg?',arg:"'+o.arg+'"':"")+(o.modifiers?",modifiers:"+JSON.stringify(o.modifiers):"")+"},")}return c?s.slice(0,-1)+"]":void 0}}function ui(e,t){var n=e.children[0];if(1===n.type){var r=ei(n,t.options);return"inlineTemplate:{render:function(){"+r.render+"},staticRenderFns:["+r.staticRenderFns.map(function(e){return"function(){"+e+"}"}).join(",")+"]}"}}function li(e,t){return"scopedSlots:_u(["+Object.keys(e).map(function(n){return fi(n,e[n],t)}).join(",")+"])"}function fi(e,t,n){return t.for&&!t.forProcessed?di(e,t,n):"{key:"+e+",fn:"+("function("+String(t.slotScope)+"){return "+("template"===t.tag?t.if?t.if+"?"+(pi(t,n)||"undefined")+":undefined":pi(t,n)||"undefined":ti(t,n))+"}")+"}"}function di(e,t,n){var r=t.for,i=t.alias,o=t.iterator1?","+t.iterator1:"",a=t.iterator2?","+t.iterator2:"";return t.forProcessed=!0,"_l(("+r+"),function("+i+o+a+"){return "+fi(e,t,n)+"})"}function pi(e,t,n,r,i){var o=e.children;if(o.length){var a=o[0];if(1===o.length&&a.for&&"template"!==a.tag&&"slot"!==a.tag)return(r||ti)(a,t);var s=n?vi(o,t.maybeComponent):0,c=i||mi;return"["+o.map(function(e){return c(e,t)}).join(",")+"]"+(s?","+s:"")}}function vi(e,t){for(var n=0,r=0;r<e.length;r++){var i=e[r];if(1===i.type){if(hi(i)||i.ifConditions&&i.ifConditions.some(function(e){return hi(e.block)})){n=2;break}(t(i)||i.ifConditions&&i.ifConditions.some(function(e){return t(e.block)}))&&(n=1)}}return n}function hi(e){return void 0!==e.for||"template"===e.tag||"slot"===e.tag}function mi(e,t){return 1===e.type?ti(e,t):3===e.type&&e.isComment?gi(e):yi(e)}function yi(e){return"_v("+(2===e.type?e.expression:Ci(JSON.stringify(e.text)))+")"}function gi(e){return"_e("+JSON.stringify(e.text)+")"}function _i(e,t){var n=e.slotName||'"default"',r=pi(e,t),i="_t("+n+(r?","+r:""),o=e.attrs&&"{"+e.attrs.map(function(e){return ji(e.name)+":"+e.value}).join(",")+"}",a=e.attrsMap["v-bind"];return!o&&!a||r||(i+=",null"),o&&(i+=","+o),a&&(i+=(o?"":",null")+","+a),i+")"}function bi(e,t,n){var r=t.inlineTemplate?null:pi(t,n,!0);return"_c("+e+","+si(t,n)+(r?","+r:"")+")"}function $i(e){for(var t="",n=0;n<e.length;n++){var r=e[n];t+='"'+r.name+'":'+Ci(r.value)+","}return t.slice(0,-1)}function Ci(e){return e.replace(/\u2028/g,"\\u2028").replace(/\u2029/g,"\\u2029")}function wi(e,t){try{return new Function(e)}catch(n){return t.push({err:n,code:e}),_}}function xi(e){var t=Object.create(null);return function(n,r,i){delete(r=y({},r)).warn;var o=r.delimiters?String(r.delimiters)+n:n;if(t[o])return t[o];var a=e(n,r),s={},c=[];return s.render=wi(a.render,c),s.staticRenderFns=a.staticRenderFns.map(function(e){return wi(e,c)}),t[o]=s}}function ki(e){if(e.outerHTML)return e.outerHTML;var t=document.createElement("div");return t.appendChild(e.cloneNode(!0)),t.innerHTML}var Ai=Object.prototype.toString,Oi=f("slot,component",!0),Si=f("key,ref,slot,slot-scope,is"),Ti=Object.prototype.hasOwnProperty,Ei=/-(\w)/g,ji=v(function(e){return e.replace(Ei,function(e,t){return t?t.toUpperCase():""})}),Li=v(function(e){return e.charAt(0).toUpperCase()+e.slice(1)}),Ni=/\B([A-Z])/g,Ii=v(function(e){return e.replace(Ni,"-$1").toLowerCase()}),Mi=function(e,t,n){return!1},Pi=function(e){return e},Di="data-server-rendered",Ri=["component","directive","filter"],Fi=["beforeCreate","created","beforeMount","mounted","beforeUpdate","updated","beforeDestroy","destroyed","activated","deactivated","errorCaptured"],Hi={optionMergeStrategies:Object.create(null),silent:!1,productionTip:!1,devtools:!1,performance:!1,errorHandler:null,warnHandler:null,ignoredElements:[],keyCodes:Object.create(null),isReservedTag:Mi,isReservedAttr:Mi,isUnknownElement:Mi,getTagNamespace:_,parsePlatformTagName:Pi,mustUseProp:Mi,_lifecycleHooks:Fi},Bi=Object.freeze({}),Ui=/[^\w.$]/,Vi="__proto__"in{},zi="undefined"!=typeof window,Ki=zi&&window.navigator.userAgent.toLowerCase(),Ji=Ki&&/msie|trident/.test(Ki),qi=Ki&&Ki.indexOf("msie 9.0")>0,Wi=Ki&&Ki.indexOf("edge/")>0,Gi=Ki&&Ki.indexOf("android")>0,Zi=Ki&&/iphone|ipad|ipod|ios/.test(Ki),Yi=(Ki&&/chrome\/\d+/.test(Ki),{}.watch),Qi=!1;if(zi)try{var Xi={};Object.defineProperty(Xi,"passive",{get:function(){Qi=!0}}),window.addEventListener("test-passive",null,Xi)}catch(e){}var eo,to,no=function(){return void 0===eo&&(eo=!zi&&"undefined"!=typeof global&&"server"===global.process.env.VUE_ENV),eo},ro=zi&&window.__VUE_DEVTOOLS_GLOBAL_HOOK__,io="undefined"!=typeof Symbol&&A(Symbol)&&"undefined"!=typeof Reflect&&A(Reflect.ownKeys);to="undefined"!=typeof Set&&A(Set)?Set:function(){function e(){this.set=Object.create(null)}return e.prototype.has=function(e){return!0===this.set[e]},e.prototype.add=function(e){this.set[e]=!0},e.prototype.clear=function(){this.set=Object.create(null)},e}();var oo=_,ao=0,so=function(){this.id=ao++,this.subs=[]};so.prototype.addSub=function(e){this.subs.push(e)},so.prototype.removeSub=function(e){d(this.subs,e)},so.prototype.depend=function(){so.target&&so.target.addDep(this)},so.prototype.notify=function(){for(var e=this.subs.slice(),t=0,n=e.length;t<n;t++)e[t].update()},so.target=null;var co=[],uo=function(e,t,n,r,i,o,a,s){this.tag=e,this.data=t,this.children=n,this.text=r,this.elm=i,this.ns=void 0,this.context=o,this.functionalContext=void 0,this.functionalOptions=void 0,this.functionalScopeId=void 0,this.key=t&&t.key,this.componentOptions=a,this.componentInstance=void 0,this.parent=void 0,this.raw=!1,this.isStatic=!1,this.isRootInsert=!0,this.isComment=!1,this.isCloned=!1,this.isOnce=!1,this.asyncFactory=s,this.asyncMeta=void 0,this.isAsyncPlaceholder=!1},lo={child:{configurable:!0}};lo.child.get=function(){return this.componentInstance},Object.defineProperties(uo.prototype,lo);var fo=function(e){void 0===e&&(e="");var t=new uo;return t.text=e,t.isComment=!0,t},po=Array.prototype,vo=Object.create(po);["push","pop","shift","unshift","splice","sort","reverse"].forEach(function(e){var t=po[e];x(vo,e,function(){for(var n=[],r=arguments.length;r--;)n[r]=arguments[r];var i,o=t.apply(this,n),a=this.__ob__;switch(e){case"push":case"unshift":i=n;break;case"splice":i=n.slice(2)}return i&&a.observeArray(i),a.dep.notify(),o})});var ho=Object.getOwnPropertyNames(vo),mo={shouldConvert:!0},yo=function(e){this.value=e,this.dep=new so,this.vmCount=0,x(e,"__ob__",this),Array.isArray(e)?((Vi?L:N)(e,vo,ho),this.observeArray(e)):this.walk(e)};yo.prototype.walk=function(e){for(var t=Object.keys(e),n=0;n<t.length;n++)M(e,t[n],e[t[n]])},yo.prototype.observeArray=function(e){for(var t=0,n=e.length;t<n;t++)I(e[t])};var go=Hi.optionMergeStrategies;go.data=function(e,t,n){return n?H(e,t,n):t&&"function"!=typeof t?e:H.call(this,e,t)},Fi.forEach(function(e){go[e]=B}),Ri.forEach(function(e){go[e+"s"]=U}),go.watch=function(e,t,n,r){if(e===Yi&&(e=void 0),t===Yi&&(t=void 0),!t)return Object.create(e||null);if(!e)return t;var i={};y(i,e);for(var o in t){var a=i[o],s=t[o];a&&!Array.isArray(a)&&(a=[a]),i[o]=a?a.concat(s):Array.isArray(s)?s:[s]}return i},go.props=go.methods=go.inject=go.computed=function(e,t,n,r){if(!e)return t;var i=Object.create(null);return y(i,e),t&&y(i,t),i},go.provide=H;var _o,bo,$o=function(e,t){return void 0===t?e:t},Co=[],wo=!1,xo=!1;if("undefined"!=typeof setImmediate&&A(setImmediate))bo=function(){setImmediate(te)};else if("undefined"==typeof MessageChannel||!A(MessageChannel)&&"[object MessageChannelConstructor]"!==MessageChannel.toString())bo=function(){setTimeout(te,0)};else{var ko=new MessageChannel,Ao=ko.port2;ko.port1.onmessage=te,bo=function(){Ao.postMessage(1)}}if("undefined"!=typeof Promise&&A(Promise)){var Oo=Promise.resolve();_o=function(){Oo.then(te),Zi&&setTimeout(_)}}else _o=bo;var So,To=v(function(e){var t="&"===e.charAt(0),n="~"===(e=t?e.slice(1):e).charAt(0),r="!"===(e=n?e.slice(1):e).charAt(0);return e=r?e.slice(1):e,{name:e,once:n,capture:r,passive:t}}),Eo=null,jo=[],Lo=[],No={},Io=!1,Mo=!1,Po=0,Do=0,Ro=function(e,t,n,r){this.vm=e,e._watchers.push(this),r?(this.deep=!!r.deep,this.user=!!r.user,this.lazy=!!r.lazy,this.sync=!!r.sync):this.deep=this.user=this.lazy=this.sync=!1,this.cb=n,this.id=++Do,this.active=!0,this.dirty=this.lazy,this.deps=[],this.newDeps=[],this.depIds=new to,this.newDepIds=new to,this.expression="","function"==typeof t?this.getter=t:(this.getter=k(t),this.getter||(this.getter=function(){})),this.value=this.lazy?void 0:this.get()};Ro.prototype.get=function(){O(this);var e,t=this.vm;try{e=this.getter.call(t,t)}catch(e){if(!this.user)throw e;Q(e,t,'getter for watcher "'+this.expression+'"')}finally{this.deep&&Re(e),S(),this.cleanupDeps()}return e},Ro.prototype.addDep=function(e){var t=e.id;this.newDepIds.has(t)||(this.newDepIds.add(t),this.newDeps.push(e),this.depIds.has(t)||e.addSub(this))},Ro.prototype.cleanupDeps=function(){for(var e=this,t=this.deps.length;t--;){var n=e.deps[t];e.newDepIds.has(n.id)||n.removeSub(e)}var r=this.depIds;this.depIds=this.newDepIds,this.newDepIds=r,this.newDepIds.clear(),r=this.deps,this.deps=this.newDeps,this.newDeps=r,this.newDeps.length=0},Ro.prototype.update=function(){this.lazy?this.dirty=!0:this.sync?this.run():De(this)},Ro.prototype.run=function(){if(this.active){var e=this.get();if(e!==this.value||o(e)||this.deep){var t=this.value;if(this.value=e,this.user)try{this.cb.call(this.vm,e,t)}catch(e){Q(e,this.vm,'callback for watcher "'+this.expression+'"')}else this.cb.call(this.vm,e,t)}}},Ro.prototype.evaluate=function(){this.value=this.get(),this.dirty=!1},Ro.prototype.depend=function(){for(var e=this,t=this.deps.length;t--;)e.deps[t].depend()},Ro.prototype.teardown=function(){var e=this;if(this.active){this.vm._isBeingDestroyed||d(this.vm._watchers,this);for(var t=this.deps.length;t--;)e.deps[t].removeSub(e);this.active=!1}};var Fo=new to,Ho={enumerable:!0,configurable:!0,get:_,set:_},Bo={lazy:!0};lt(ft.prototype);var Uo={init:function(e,t,n,r){if(!e.componentInstance||e.componentInstance._isDestroyed)(e.componentInstance=ht(e,Eo,n,r)).$mount(t?e.elm:void 0,t);else if(e.data.keepAlive){var i=e;Uo.prepatch(i,i)}},prepatch:function(e,t){var n=t.componentOptions;Oe(t.componentInstance=e.componentInstance,n.propsData,n.listeners,t,n.children)},insert:function(e){var t=e.context,n=e.componentInstance;n._isMounted||(n._isMounted=!0,je(n,"mounted")),e.data.keepAlive&&(t._isMounted?Me(n):Te(n,!0))},destroy:function(e){var t=e.componentInstance;t._isDestroyed||(e.data.keepAlive?Ee(t,!0):t.$destroy())}},Vo=Object.keys(Uo),zo=1,Ko=2,Jo=0;!function(e){e.prototype._init=function(e){var t=this;t._uid=Jo++,t._isVue=!0,e&&e._isComponent?wt(t,e):t.$options=J(xt(t.constructor),e||{},t),t._renderProxy=t,t._self=t,ke(t),ge(t),Ct(t),je(t,"beforeCreate"),Qe(t),Be(t),Ye(t),je(t,"created"),t.$options.el&&t.$mount(t.$options.el)}}(Ot),function(e){var t={};t.get=function(){return this._data};var n={};n.get=function(){return this._props},Object.defineProperty(e.prototype,"$data",t),Object.defineProperty(e.prototype,"$props",n),e.prototype.$set=P,e.prototype.$delete=D,e.prototype.$watch=function(e,t,n){var r=this;if(a(t))return Ze(r,e,t,n);(n=n||{}).user=!0;var i=new Ro(r,e,t,n);return n.immediate&&t.call(r,i.value),function(){i.teardown()}}}(Ot),function(e){var t=/^hook:/;e.prototype.$on=function(e,n){var r=this,i=this;if(Array.isArray(e))for(var o=0,a=e.length;o<a;o++)r.$on(e[o],n);else(i._events[e]||(i._events[e]=[])).push(n),t.test(e)&&(i._hasHookEvent=!0);return i},e.prototype.$once=function(e,t){function n(){r.$off(e,n),t.apply(r,arguments)}var r=this;return n.fn=t,r.$on(e,n),r},e.prototype.$off=function(e,t){var n=this,r=this;if(!arguments.length)return r._events=Object.create(null),r;if(Array.isArray(e)){for(var i=0,o=e.length;i<o;i++)n.$off(e[i],t);return r}var a=r._events[e];if(!a)return r;if(1===arguments.length)return r._events[e]=null,r;if(t)for(var s,c=a.length;c--;)if((s=a[c])===t||s.fn===t){a.splice(c,1);break}return r},e.prototype.$emit=function(e){var t=this,n=t._events[e];if(n){n=n.length>1?m(n):n;for(var r=m(arguments,1),i=0,o=n.length;i<o;i++)try{n[i].apply(t,r)}catch(n){Q(n,t,'event handler for "'+e+'"')}}return t}}(Ot),function(e){e.prototype._update=function(e,t){var n=this;n._isMounted&&je(n,"beforeUpdate");var r=n.$el,i=n._vnode,o=Eo;Eo=n,n._vnode=e,i?n.$el=n.__patch__(i,e):(n.$el=n.__patch__(n.$el,e,t,!1,n.$options._parentElm,n.$options._refElm),n.$options._parentElm=n.$options._refElm=null),Eo=o,r&&(r.__vue__=null),n.$el&&(n.$el.__vue__=n),n.$vnode&&n.$parent&&n.$vnode===n.$parent._vnode&&(n.$parent.$el=n.$el)},e.prototype.$forceUpdate=function(){var e=this;e._watcher&&e._watcher.update()},e.prototype.$destroy=function(){var e=this;if(!e._isBeingDestroyed){je(e,"beforeDestroy"),e._isBeingDestroyed=!0;var t=e.$parent;!t||t._isBeingDestroyed||e.$options.abstract||d(t.$children,e),e._watcher&&e._watcher.teardown();for(var n=e._watchers.length;n--;)e._watchers[n].teardown();e._data.__ob__&&e._data.__ob__.vmCount--,e._isDestroyed=!0,e.__patch__(e._vnode,null),je(e,"destroyed"),e.$off(),e.$el&&(e.$el.__vue__=null),e.$vnode&&(e.$vnode.parent=null)}}}(Ot),function(e){lt(e.prototype),e.prototype.$nextTick=function(e){return re(e,this)},e.prototype._render=function(){var e=this,t=e.$options,n=t.render,r=t._parentVnode;if(e._isMounted)for(var i in e.$slots){var o=e.$slots[i];o._rendered&&(e.$slots[i]=j(o,!0))}e.$scopedSlots=r&&r.data.scopedSlots||Bi,e.$vnode=r;var a;try{a=n.call(e._renderProxy,e.$createElement)}catch(t){Q(t,e,"render"),a=e._vnode}return a instanceof uo||(a=fo()),a.parent=r,a}}(Ot);var qo=[String,RegExp,Array],Wo={KeepAlive:{name:"keep-alive",abstract:!0,props:{include:qo,exclude:qo,max:[String,Number]},created:function(){this.cache=Object.create(null),this.keys=[]},destroyed:function(){var e=this;for(var t in e.cache)Dt(e.cache,t,e.keys)},watch:{include:function(e){Pt(this,function(t){return Mt(e,t)})},exclude:function(e){Pt(this,function(t){return!Mt(e,t)})}},render:function(){var e=ye(this.$slots.default),t=e&&e.componentOptions;if(t){var n=It(t);if(n&&(this.include&&!Mt(this.include,n)||this.exclude&&Mt(this.exclude,n)))return e;var r=this,i=r.cache,o=r.keys,a=null==e.key?t.Ctor.cid+(t.tag?"::"+t.tag:""):e.key;i[a]?(e.componentInstance=i[a].componentInstance,d(o,a),o.push(a)):(i[a]=e,o.push(a),this.max&&o.length>parseInt(this.max)&&Dt(i,o[0],o,this._vnode)),e.data.keepAlive=!0}return e}}};!function(e){var t={};t.get=function(){return Hi},Object.defineProperty(e,"config",t),e.util={warn:oo,extend:y,mergeOptions:J,defineReactive:M},e.set=P,e.delete=D,e.nextTick=re,e.options=Object.create(null),Ri.forEach(function(t){e.options[t+"s"]=Object.create(null)}),e.options._base=e,y(e.options.components,Wo),St(e),Tt(e),Et(e),Nt(e)}(Ot),Object.defineProperty(Ot.prototype,"$isServer",{get:no}),Object.defineProperty(Ot.prototype,"$ssrContext",{get:function(){return this.$vnode&&this.$vnode.ssrContext}}),Ot.version="2.5.2";var Go,Zo,Yo,Qo,Xo,ea,ta,na,ra=f("style,class"),ia=f("input,textarea,option,select,progress"),oa=function(e,t,n){return"value"===n&&ia(e)&&"button"!==t||"selected"===n&&"option"===e||"checked"===n&&"input"===e||"muted"===n&&"video"===e},aa=f("contenteditable,draggable,spellcheck"),sa=f("allowfullscreen,async,autofocus,autoplay,checked,compact,controls,declare,default,defaultchecked,defaultmuted,defaultselected,defer,disabled,enabled,formnovalidate,hidden,indeterminate,inert,ismap,itemscope,loop,multiple,muted,nohref,noresize,noshade,novalidate,nowrap,open,pauseonexit,readonly,required,reversed,scoped,seamless,selected,sortable,translate,truespeed,typemustmatch,visible"),ca="http://www.w3.org/1999/xlink",ua=function(e){return":"===e.charAt(5)&&"xlink"===e.slice(0,5)},la=function(e){return ua(e)?e.slice(6,e.length):""},fa=function(e){return null==e||!1===e},da={svg:"http://www.w3.org/2000/svg",math:"http://www.w3.org/1998/Math/MathML"},pa=f("html,body,base,head,link,meta,style,title,address,article,aside,footer,header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,menuitem,summary,content,element,shadow,template,blockquote,iframe,tfoot"),va=f("svg,animate,circle,clippath,cursor,defs,desc,ellipse,filter,font-face,foreignObject,g,glyph,image,line,marker,mask,missing-glyph,path,pattern,polygon,polyline,rect,switch,symbol,text,textpath,tspan,use,view",!0),ha=function(e){return pa(e)||va(e)},ma=Object.create(null),ya=f("text,number,password,search,email,tel,url"),ga=Object.freeze({createElement:function(e,t){var n=document.createElement(e);return"select"!==e?n:(t.data&&t.data.attrs&&void 0!==t.data.attrs.multiple&&n.setAttribute("multiple","multiple"),n)},createElementNS:function(e,t){return document.createElementNS(da[e],t)},createTextNode:function(e){return document.createTextNode(e)},createComment:function(e){return document.createComment(e)},insertBefore:function(e,t,n){e.insertBefore(t,n)},removeChild:function(e,t){e.removeChild(t)},appendChild:function(e,t){e.appendChild(t)},parentNode:function(e){return e.parentNode},nextSibling:function(e){return e.nextSibling},tagName:function(e){return e.tagName},setTextContent:function(e,t){e.textContent=t},setAttribute:function(e,t,n){e.setAttribute(t,n)}}),_a={create:function(e,t){qt(t)},update:function(e,t){e.data.ref!==t.data.ref&&(qt(e,!0),qt(t))},destroy:function(e){qt(e,!0)}},ba=new uo("",{},[]),$a=["create","activate","update","remove","destroy"],Ca={create:Yt,update:Yt,destroy:function(e){Yt(e,ba)}},wa=Object.create(null),xa=[_a,Ca],ka={create:nn,update:nn},Aa={create:on,update:on},Oa=/[\w).+\-_$\]]/,Sa="__r",Ta="__c",Ea={create:Ln,update:Ln},ja={create:Nn,update:Nn},La=v(function(e){var t={},n=/;(?![^(]*\))/g,r=/:(.+)/;return e.split(n).forEach(function(e){if(e){var n=e.split(r);n.length>1&&(t[n[0].trim()]=n[1].trim())}}),t}),Na=/^--/,Ia=/\s*!important$/,Ma=function(e,t,n){if(Na.test(t))e.style.setProperty(t,n);else if(Ia.test(n))e.style.setProperty(t,n.replace(Ia,""),"important");else{var r=Da(t);if(Array.isArray(n))for(var i=0,o=n.length;i<o;i++)e.style[r]=n[i];else e.style[r]=n}},Pa=["Webkit","Moz","ms"],Da=v(function(e){if(na=na||document.createElement("div").style,"filter"!==(e=ji(e))&&e in na)return e;for(var t=e.charAt(0).toUpperCase()+e.slice(1),n=0;n<Pa.length;n++){var r=Pa[n]+t;if(r in na)return r}}),Ra={create:Hn,update:Hn},Fa=v(function(e){return{enterClass:e+"-enter",enterToClass:e+"-enter-to",enterActiveClass:e+"-enter-active",leaveClass:e+"-leave",leaveToClass:e+"-leave-to",leaveActiveClass:e+"-leave-active"}}),Ha=zi&&!qi,Ba="transition",Ua="animation",Va="transition",za="transitionend",Ka="animation",Ja="animationend";Ha&&(void 0===window.ontransitionend&&void 0!==window.onwebkittransitionend&&(Va="WebkitTransition",za="webkitTransitionEnd"),void 0===window.onanimationend&&void 0!==window.onwebkitanimationend&&(Ka="WebkitAnimation",Ja="webkitAnimationEnd"));var qa=zi?window.requestAnimationFrame?window.requestAnimationFrame.bind(window):setTimeout:function(e){return e()},Wa=/\b(transform|all)(,|$)/,Ga=function(r){function o(e){return new uo(j.tagName(e).toLowerCase(),{},[],void 0,e)}function a(e,t){function n(){0==--n.listeners&&s(e)}return n.listeners=t,n}function s(e){var n=j.parentNode(e);t(n)&&j.removeChild(n,e)}function c(e,r,i,o,a){if(e.isRootInsert=!a,!u(e,r,i,o)){var s=e.data,c=e.children,l=e.tag;t(l)?(e.elm=e.ns?j.createElementNS(e.ns,l):j.createElement(l,e),y(e),v(e,c,r),t(s)&&m(e,r),p(i,e.elm,o)):n(e.isComment)?(e.elm=j.createComment(e.text),p(i,e.elm,o)):(e.elm=j.createTextNode(e.text),p(i,e.elm,o))}}function u(e,r,i,o){var a=e.data;if(t(a)){var s=t(e.componentInstance)&&a.keepAlive;if(t(a=a.hook)&&t(a=a.init)&&a(e,!1,i,o),t(e.componentInstance))return l(e,r),n(s)&&d(e,r,i,o),!0}}function l(e,n){t(e.data.pendingInsert)&&(n.push.apply(n,e.data.pendingInsert),e.data.pendingInsert=null),e.elm=e.componentInstance.$el,h(e)?(m(e,n),y(e)):(qt(e),n.push(e))}function d(e,n,r,i){for(var o,a=e;a.componentInstance;)if(a=a.componentInstance._vnode,t(o=a.data)&&t(o=o.transition)){for(o=0;o<T.activate.length;++o)T.activate[o](ba,a);n.push(a);break}p(r,e.elm,i)}function p(e,n,r){t(e)&&(t(r)?r.parentNode===e&&j.insertBefore(e,n,r):j.appendChild(e,n))}function v(e,t,n){if(Array.isArray(t))for(var r=0;r<t.length;++r)c(t[r],n,e.elm,null,!0);else i(e.text)&&j.appendChild(e.elm,j.createTextNode(e.text))}function h(e){for(;e.componentInstance;)e=e.componentInstance._vnode;return t(e.tag)}function m(e,n){for(var r=0;r<T.create.length;++r)T.create[r](ba,e);t(O=e.data.hook)&&(t(O.create)&&O.create(ba,e),t(O.insert)&&n.push(e))}function y(e){var n;if(t(n=e.functionalScopeId))j.setAttribute(e.elm,n,"");else for(var r=e;r;)t(n=r.context)&&t(n=n.$options._scopeId)&&j.setAttribute(e.elm,n,""),r=r.parent;t(n=Eo)&&n!==e.context&&n!==e.functionalContext&&t(n=n.$options._scopeId)&&j.setAttribute(e.elm,n,"")}function g(e,t,n,r,i,o){for(;r<=i;++r)c(n[r],o,e,t)}function _(e){var n,r,i=e.data;if(t(i))for(t(n=i.hook)&&t(n=n.destroy)&&n(e),n=0;n<T.destroy.length;++n)T.destroy[n](e);if(t(n=e.children))for(r=0;r<e.children.length;++r)_(e.children[r])}function b(e,n,r,i){for(;r<=i;++r){var o=n[r];t(o)&&(t(o.tag)?($(o),_(o)):s(o.elm))}}function $(e,n){if(t(n)||t(e.data)){var r,i=T.remove.length+1;for(t(n)?n.listeners+=i:n=a(e.elm,i),t(r=e.componentInstance)&&t(r=r._vnode)&&t(r.data)&&$(r,n),r=0;r<T.remove.length;++r)T.remove[r](e,n);t(r=e.data.hook)&&t(r=r.remove)?r(e,n):n()}else s(e.elm)}function C(n,r,i,o,a){for(var s,u,l,f=0,d=0,p=r.length-1,v=r[0],h=r[p],m=i.length-1,y=i[0],_=i[m],$=!a;f<=p&&d<=m;)e(v)?v=r[++f]:e(h)?h=r[--p]:Wt(v,y)?(x(v,y,o),v=r[++f],y=i[++d]):Wt(h,_)?(x(h,_,o),h=r[--p],_=i[--m]):Wt(v,_)?(x(v,_,o),$&&j.insertBefore(n,v.elm,j.nextSibling(h.elm)),v=r[++f],_=i[--m]):Wt(h,y)?(x(h,y,o),$&&j.insertBefore(n,h.elm,v.elm),h=r[--p],y=i[++d]):(e(s)&&(s=Zt(r,f,p)),e(u=t(y.key)?s[y.key]:w(y,r,f,p))?c(y,o,n,v.elm):Wt(l=r[u],y)?(x(l,y,o),r[u]=void 0,$&&j.insertBefore(n,l.elm,v.elm)):c(y,o,n,v.elm),y=i[++d]);f>p?g(n,e(i[m+1])?null:i[m+1].elm,i,d,m,o):d>m&&b(n,r,f,p)}function w(e,n,r,i){for(var o=r;o<i;o++){var a=n[o];if(t(a)&&Wt(e,a))return o}}function x(r,i,o,a){if(r!==i){var s=i.elm=r.elm;if(n(r.isAsyncPlaceholder))t(i.asyncFactory.resolved)?A(r.elm,i,o):i.isAsyncPlaceholder=!0;else if(n(i.isStatic)&&n(r.isStatic)&&i.key===r.key&&(n(i.isCloned)||n(i.isOnce)))i.componentInstance=r.componentInstance;else{var c,u=i.data;t(u)&&t(c=u.hook)&&t(c=c.prepatch)&&c(r,i);var l=r.children,f=i.children;if(t(u)&&h(i)){for(c=0;c<T.update.length;++c)T.update[c](r,i);t(c=u.hook)&&t(c=c.update)&&c(r,i)}e(i.text)?t(l)&&t(f)?l!==f&&C(s,l,f,o,a):t(f)?(t(r.text)&&j.setTextContent(s,""),g(s,null,f,0,f.length-1,o)):t(l)?b(s,l,0,l.length-1):t(r.text)&&j.setTextContent(s,""):r.text!==i.text&&j.setTextContent(s,i.text),t(u)&&t(c=u.hook)&&t(c=c.postpatch)&&c(r,i)}}}function k(e,r,i){if(n(i)&&t(e.parent))e.parent.data.pendingInsert=r;else for(var o=0;o<r.length;++o)r[o].data.hook.insert(r[o])}function A(e,r,i){if(n(r.isComment)&&t(r.asyncFactory))return r.elm=e,r.isAsyncPlaceholder=!0,!0;r.elm=e;var o=r.tag,a=r.data,s=r.children;if(t(a)&&(t(O=a.hook)&&t(O=O.init)&&O(r,!0),t(O=r.componentInstance)))return l(r,i),!0;if(t(o)){if(t(s))if(e.hasChildNodes())if(t(O=a)&&t(O=O.domProps)&&t(O=O.innerHTML)){if(O!==e.innerHTML)return!1}else{for(var c=!0,u=e.firstChild,f=0;f<s.length;f++){if(!u||!A(u,s[f],i)){c=!1;break}u=u.nextSibling}if(!c||u)return!1}else v(r,s,i);if(t(a))for(var d in a)if(!L(d)){m(r,i);break}}else e.data!==r.text&&(e.data=r.text);return!0}var O,S,T={},E=r.modules,j=r.nodeOps;for(O=0;O<$a.length;++O)for(T[$a[O]]=[],S=0;S<E.length;++S)t(E[S][$a[O]])&&T[$a[O]].push(E[S][$a[O]]);var L=f("attrs,style,class,staticClass,staticStyle,key");return function(r,i,a,s,u,l){if(!e(i)){var f=!1,d=[];if(e(r))f=!0,c(i,d,u,l);else{var p=t(r.nodeType);if(!p&&Wt(r,i))x(r,i,d,s);else{if(p){if(1===r.nodeType&&r.hasAttribute(Di)&&(r.removeAttribute(Di),a=!0),n(a)&&A(r,i,d))return k(i,d,!0),r;r=o(r)}var v=r.elm,m=j.parentNode(v);if(c(i,d,v._leaveCb?null:m,j.nextSibling(v)),t(i.parent))for(var y=i.parent,g=h(i);y;){for(var $=0;$<T.destroy.length;++$)T.destroy[$](y);if(y.elm=i.elm,g){for(var C=0;C<T.create.length;++C)T.create[C](ba,y);var w=y.data.hook.insert;if(w.merged)for(var O=1;O<w.fns.length;O++)w.fns[O]()}else qt(y);y=y.parent}t(m)?b(m,[r],0,0):t(r.tag)&&_(r)}}return k(i,d,f),i.elm}t(r)&&_(r)}}({nodeOps:ga,modules:[ka,Aa,Ea,ja,Ra,zi?{create:tr,activate:tr,remove:function(e,t){!0!==e.data.show?Qn(e,t):t()}}:{}].concat(xa)});qi&&document.addEventListener("selectionchange",function(){var e=document.activeElement;e&&e.vmodel&&cr(e,"input")});var Za={model:{inserted:function(e,t,n){"select"===n.tag?(nr(e,t,n.context),e._vOptions=[].map.call(e.options,or)):("textarea"===n.tag||ya(e.type))&&(e._vModifiers=t.modifiers,t.modifiers.lazy||(e.addEventListener("change",sr),Gi||(e.addEventListener("compositionstart",ar),e.addEventListener("compositionend",sr)),qi&&(e.vmodel=!0)))},componentUpdated:function(e,t,n){if("select"===n.tag){nr(e,t,n.context);var r=e._vOptions,i=e._vOptions=[].map.call(e.options,or);i.some(function(e,t){return!b(e,r[t])})&&(e.multiple?t.value.some(function(e){return ir(e,i)}):t.value!==t.oldValue&&ir(t.value,i))&&cr(e,"change")}}},show:{bind:function(e,t,n){var r=t.value,i=(n=ur(n)).data&&n.data.transition,o=e.__vOriginalDisplay="none"===e.style.display?"":e.style.display;r&&i?(n.data.show=!0,Yn(n,function(){e.style.display=o})):e.style.display=r?o:"none"},update:function(e,t,n){var r=t.value;r!==t.oldValue&&((n=ur(n)).data&&n.data.transition?(n.data.show=!0,r?Yn(n,function(){e.style.display=e.__vOriginalDisplay}):Qn(n,function(){e.style.display="none"})):e.style.display=r?e.__vOriginalDisplay:"none")},unbind:function(e,t,n,r,i){i||(e.style.display=e.__vOriginalDisplay)}}},Ya={name:String,appear:Boolean,css:Boolean,mode:String,type:String,enterClass:String,leaveClass:String,enterToClass:String,leaveToClass:String,enterActiveClass:String,leaveActiveClass:String,appearClass:String,appearActiveClass:String,appearToClass:String,duration:[Number,String,Object]},Qa={name:"transition",props:Ya,abstract:!0,render:function(e){var t=this,n=this.$options._renderChildren;if(n&&(n=n.filter(function(e){return e.tag||me(e)})).length){var r=this.mode,o=n[0];if(pr(this.$vnode))return o;var a=lr(o);if(!a)return o;if(this._leaving)return dr(e,o);var s="__transition-"+this._uid+"-";a.key=null==a.key?a.isComment?s+"comment":s+a.tag:i(a.key)?0===String(a.key).indexOf(s)?a.key:s+a.key:a.key;var c=(a.data||(a.data={})).transition=fr(this),u=this._vnode,l=lr(u);if(a.data.directives&&a.data.directives.some(function(e){return"show"===e.name})&&(a.data.show=!0),l&&l.data&&!vr(a,l)&&!me(l)){var f=l.data.transition=y({},c);if("out-in"===r)return this._leaving=!0,ae(f,"afterLeave",function(){t._leaving=!1,t.$forceUpdate()}),dr(e,o);if("in-out"===r){if(me(a))return u;var d,p=function(){d()};ae(c,"afterEnter",p),ae(c,"enterCancelled",p),ae(f,"delayLeave",function(e){d=e})}}return o}}},Xa=y({tag:String,moveClass:String},Ya);delete Xa.mode;var es={Transition:Qa,TransitionGroup:{props:Xa,render:function(e){for(var t=this.tag||this.$vnode.data.tag||"span",n=Object.create(null),r=this.prevChildren=this.children,i=this.$slots.default||[],o=this.children=[],a=fr(this),s=0;s<i.length;s++){var c=i[s];c.tag&&null!=c.key&&0!==String(c.key).indexOf("__vlist")&&(o.push(c),n[c.key]=c,(c.data||(c.data={})).transition=a)}if(r){for(var u=[],l=[],f=0;f<r.length;f++){var d=r[f];d.data.transition=a,d.data.pos=d.elm.getBoundingClientRect(),n[d.key]?u.push(d):l.push(d)}this.kept=e(t,null,u),this.removed=l}return e(t,null,o)},beforeUpdate:function(){this.__patch__(this._vnode,this.kept,!1,!0),this._vnode=this.kept},updated:function(){var e=this.prevChildren,t=this.moveClass||(this.name||"v")+"-move";e.length&&this.hasMove(e[0].elm,t)&&(e.forEach(hr),e.forEach(mr),e.forEach(yr),this._reflow=document.body.offsetHeight,e.forEach(function(e){if(e.data.moved){var n=e.elm,r=n.style;Kn(n,t),r.transform=r.WebkitTransform=r.transitionDuration="",n.addEventListener(za,n._moveCb=function e(r){r&&!/transform$/.test(r.propertyName)||(n.removeEventListener(za,e),n._moveCb=null,Jn(n,t))})}}))},methods:{hasMove:function(e,t){if(!Ha)return!1;if(this._hasMove)return this._hasMove;var n=e.cloneNode();e._transitionClasses&&e._transitionClasses.forEach(function(e){Un(n,e)}),Bn(n,t),n.style.display="none",this.$el.appendChild(n);var r=Wn(n);return this.$el.removeChild(n),this._hasMove=r.hasTransform}}}};Ot.config.mustUseProp=oa,Ot.config.isReservedTag=ha,Ot.config.isReservedAttr=ra,Ot.config.getTagNamespace=Kt,Ot.config.isUnknownElement=function(e){if(!zi)return!0;if(ha(e))return!1;if(e=e.toLowerCase(),null!=ma[e])return ma[e];var t=document.createElement(e);return e.indexOf("-")>-1?ma[e]=t.constructor===window.HTMLUnknownElement||t.constructor===window.HTMLElement:ma[e]=/HTMLUnknownElement/.test(t.toString())},y(Ot.options.directives,Za),y(Ot.options.components,es),Ot.prototype.__patch__=zi?Ga:_,Ot.prototype.$mount=function(e,t){return e=e&&zi?Jt(e):void 0,Ae(this,e,t)},Ot.nextTick(function(){Hi.devtools&&ro&&ro.emit("init",Ot)},0);var ts,ns=!!zi&&function(e,t){var n=document.createElement("div");return n.innerHTML='<div a="'+e+'"/>',n.innerHTML.indexOf(t)>0}("\n","&#10;"),rs=/\{\{((?:.|\n)+?)\}\}/g,is=/[-.*+?^${}()|[\]\/\\]/g,os=v(function(e){var t=e[0].replace(is,"\\$&"),n=e[1].replace(is,"\\$&");return new RegExp(t+"((?:.|\\n)+?)"+n,"g")}),as={staticKeys:["staticClass"],transformNode:function(e,t){t.warn;var n=hn(e,"class");n&&(e.staticClass=JSON.stringify(n));var r=vn(e,"class",!1);r&&(e.classBinding=r)},genData:function(e){var t="";return e.staticClass&&(t+="staticClass:"+e.staticClass+","),e.classBinding&&(t+="class:"+e.classBinding+","),t}},ss={staticKeys:["staticStyle"],transformNode:function(e,t){var n=hn(e,"style");n&&(e.staticStyle=JSON.stringify(La(n)));var r=vn(e,"style",!1);r&&(e.styleBinding=r)},genData:function(e){var t="";return e.staticStyle&&(t+="staticStyle:"+e.staticStyle+","),e.styleBinding&&(t+="style:("+e.styleBinding+"),"),t}},cs={decode:function(e){return ts=ts||document.createElement("div"),ts.innerHTML=e,ts.textContent}},us=f("area,base,br,col,embed,frame,hr,img,input,isindex,keygen,link,meta,param,source,track,wbr"),ls=f("colgroup,dd,dt,li,options,p,td,tfoot,th,thead,tr,source"),fs=f("address,article,aside,base,blockquote,body,caption,col,colgroup,dd,details,dialog,div,dl,dt,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,legend,li,menuitem,meta,optgroup,option,param,rp,rt,source,style,summary,tbody,td,tfoot,th,thead,title,tr,track"),ds=/^\s*([^\s"'<>\/=]+)(?:\s*(=)\s*(?:"([^"]*)"+|'([^']*)'+|([^\s"'=<>`]+)))?/,ps="[a-zA-Z_][\\w\\-\\.]*",vs="((?:"+ps+"\\:)?"+ps+")",hs=new RegExp("^<"+vs),ms=/^\s*(\/?)>/,ys=new RegExp("^<\\/"+vs+"[^>]*>"),gs=/^<!DOCTYPE [^>]+>/i,_s=/^<!--/,bs=/^<!\[/,$s=!1;"x".replace(/x(.)?/g,function(e,t){$s=""===t});var Cs,ws,xs,ks,As,Os,Ss,Ts,Es,js,Ls=f("script,style,textarea",!0),Ns={},Is={"&lt;":"<","&gt;":">","&quot;":'"',"&amp;":"&","&#10;":"\n"},Ms=/&(?:lt|gt|quot|amp);/g,Ps=/&(?:lt|gt|quot|amp|#10);/g,Ds=f("pre,textarea",!0),Rs=function(e,t){return e&&Ds(e)&&"\n"===t[0]},Fs=/^@|^v-on:/,Hs=/^v-|^@|^:/,Bs=/(.*?)\s+(?:in|of)\s+(.*)/,Us=/\((\{[^}]*\}|[^,]*),([^,]*)(?:,([^,]*))?\)/,Vs=/:(.*)$/,zs=/^:|^v-bind:/,Ks=/\.[^.]+/g,Js=v(cs.decode),qs=/^xmlns:NS\d+/,Ws=/^NS\d+:/,Gs=[as,ss,{preTransformNode:function(e,t){if("input"===e.tag){var n=e.attrsMap;if(n["v-model"]&&(n["v-bind:type"]||n[":type"])){var r=vn(e,"type"),i=hn(e,"v-if",!0),o=i?"&&("+i+")":"",a=Vr(e);Sr(a),zr(a,"type","checkbox"),kr(a,t),a.processed=!0,a.if="("+r+")==='checkbox'"+o,Lr(a,{exp:a.if,block:a});var s=Vr(e);hn(s,"v-for",!0),zr(s,"type","radio"),kr(s,t),Lr(a,{exp:"("+r+")==='radio'"+o,block:s});var c=Vr(e);return hn(c,"v-for",!0),zr(c,":type",r),kr(c,t),Lr(a,{exp:i,block:c}),a}}}}],Zs={expectHTML:!0,modules:Gs,directives:{model:function(e,t,n){var r=t.value,i=t.modifiers,o=e.tag,a=e.attrsMap.type;if(e.component)return mn(e,r,i),!1;if("select"===o)An(e,r,i);else if("input"===o&&"checkbox"===a)xn(e,r,i);else if("input"===o&&"radio"===a)kn(e,r,i);else if("input"===o||"textarea"===o)On(e,r,i);else if(!Hi.isReservedTag(o))return mn(e,r,i),!1;return!0},text:function(e,t){t.value&&ln(e,"textContent","_s("+t.value+")")},html:function(e,t){t.value&&ln(e,"innerHTML","_s("+t.value+")")}},isPreTag:function(e){return"pre"===e},isUnaryTag:us,mustUseProp:oa,canBeLeftOpenTag:ls,isReservedTag:ha,getTagNamespace:Kt,staticKeys:function(e){return e.reduce(function(e,t){return e.concat(t.staticKeys||[])},[]).join(",")}(Gs)},Ys=v(function(e){return f("type,tag,attrsList,attrsMap,plain,parent,children,attrs"+(e?","+e:""))}),Qs=/^\s*([\w$_]+|\([^)]*?\))\s*=>|^function\s*\(/,Xs=/^\s*[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['.*?']|\[".*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*\s*$/,ec={esc:27,tab:9,enter:13,space:32,up:38,left:37,right:39,down:40,delete:[8,46]},tc=function(e){return"if("+e+")return null;"},nc={stop:"$event.stopPropagation();",prevent:"$event.preventDefault();",self:tc("$event.target !== $event.currentTarget"),ctrl:tc("!$event.ctrlKey"),shift:tc("!$event.shiftKey"),alt:tc("!$event.altKey"),meta:tc("!$event.metaKey"),left:tc("'button' in $event && $event.button !== 0"),middle:tc("'button' in $event && $event.button !== 1"),right:tc("'button' in $event && $event.button !== 2")},rc={on:function(e,t){e.wrapListeners=function(e){return"_g("+e+","+t.value+")"}},bind:function(e,t){e.wrapData=function(n){return"_b("+n+",'"+e.tag+"',"+t.value+","+(t.modifiers&&t.modifiers.prop?"true":"false")+(t.modifiers&&t.modifiers.sync?",true":"")+")"}},cloak:_},ic=function(e){this.options=e,this.warn=e.warn||cn,this.transforms=un(e.modules,"transformCode"),this.dataGenFns=un(e.modules,"genData"),this.directives=y(y({},rc),e.directives);var t=e.isReservedTag||Mi;this.maybeComponent=function(e){return!t(e.tag)},this.onceId=0,this.staticRenderFns=[]},oc=(new RegExp("\\b"+"do,if,for,let,new,try,var,case,else,with,await,break,catch,class,const,super,throw,while,yield,delete,export,import,return,switch,default,extends,finally,continue,debugger,function,arguments".split(",").join("\\b|\\b")+"\\b"),new RegExp("\\b"+"delete,typeof,void".split(",").join("\\s*\\([^\\)]*\\)|\\b")+"\\s*\\([^\\)]*\\)"),function(e){return function(t){function n(n,r){var i=Object.create(t),o=[],a=[];if(i.warn=function(e,t){(t?a:o).push(e)},r){r.modules&&(i.modules=(t.modules||[]).concat(r.modules)),r.directives&&(i.directives=y(Object.create(t.directives),r.directives));for(var s in r)"modules"!==s&&"directives"!==s&&(i[s]=r[s])}var c=e(n,i);return c.errors=o,c.tips=a,c}return{compile:n,compileToFunctions:xi(n)}}}(function(e,t){var n=Cr(e.trim(),t);Kr(n,t);var r=ei(n,t);return{ast:n,render:r.render,staticRenderFns:r.staticRenderFns}})(Zs).compileToFunctions),ac=v(function(e){var t=Jt(e);return t&&t.innerHTML}),sc=Ot.prototype.$mount;return Ot.prototype.$mount=function(e,t){if((e=e&&Jt(e))===document.body||e===document.documentElement)return this;var n=this.$options;if(!n.render){var r=n.template;if(r)if("string"==typeof r)"#"===r.charAt(0)&&(r=ac(r));else{if(!r.nodeType)return this;r=r.innerHTML}else e&&(r=ki(e));if(r){var i=oc(r,{shouldDecodeNewlines:ns,delimiters:n.delimiters,comments:n.comments},this),o=i.render,a=i.staticRenderFns;n.render=o,n.staticRenderFns=a}}return sc.call(this,e,t)},Ot.compile=oc,Ot});


  	/* File: c:\git\camlsql-js\src\app\js\vendor\vue-router\vue-router.js  */
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



  	/* File: c:\git\camlsql-js\src\app\js\managers\SharePointListManager.js  */
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


  	/* File: c:\git\camlsql-js\src\app\js\vue\directives\ClipboardDirective.js  */
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


  	/* File: c:\git\camlsql-js\src\app\js\vue\directives\HighlightjsDirective.js  */
  Vue.directive('highlightjs', {
    deep: true,
    bind: function (el, binding) {
      // on first bind, highlight all targets
      var targets = el.querySelectorAll('code');
      targets.forEach((target) => {
        // if a value is directly assigned to the directive, use this
        // instead of the element content.
        if (binding.value) {
          target.textContent = binding.value
        }
        hljs.highlightBlock(target);

      
   
      });




    },
    componentUpdated: function (el, binding) {
      // after an update, re-fill the content and then highlight
      var targets = el.querySelectorAll('code')
      targets.forEach((target) => {
        if (binding.value) {
          target.textContent = binding.value
          hljs.highlightBlock(target)
           
        }
      })
    }
  })


  	/* File: c:\git\camlsql-js\src\app\js\vue\components\ExamplesTabComponent.js  */

  var ExamplesTabComponent = { 
  	template: '#ExamplesTab-template',
  	mounted : function() {
  	 	setTimeout(PR.prettyPrint, 10);
  	},
  	methods : {
  		cutDownSql : function(s) {
  			if (s.length > 70) {
  				return s.substring(0, 67) + "...";
  			}
  			return s;
  		}
  	},
  	data : function() {
  		return {
  			examples : [

  				{
  					name : 'Basic field selection',
  					description : 'Provide a comma separated list of field name between SELECT and FROM to create the ViewFields element',
  					sql : 'SELECT [Title], [Preamble], [Created] FROM [Pages]',
  					keywords : 'ViewFields',
  					parameters : [],
  					status : 1,
  					version : "0.0.1"
  				},

  				{
  					name : 'Basic Text comparison - Equal to',
  					description : 'Bind a string parameter to = statement to create the Eq element',
  					sql : 'SELECT * FROM [Pages] WHERE [Title] = ?',
  					keywords : 'Text, Equal',
  					parameters : [
  						"My Page"
  					],
  					status : 1,
  					version : "0.0.1"
  				},

  				{
  					name : 'Basic Number comparison - Equal to',
  					description : 'Bind a numeric parameter to = statement to create the Eq element',
  					sql : 'SELECT * FROM [Pages] WHERE [Happiness] = ?',
  					keywords : 'Number, Equal',
  					parameters : [
  						5
  					],
  					status : 1,
  					version : "0.0.1"
  				},

  				{
  					name : 'Basic Number comparison - Less than',
  					description : 'Bind a numeric parameter to = statement to create the Lt element',
  					sql : 'SELECT * FROM [Pages] WHERE [Happiness] < ?',
  					keywords : 'Number, Less than',
  					parameters : [
  						10
  					],
  					status : 1,
  					version : "0.0.1"
  				},

  				{
  					name : 'Basic Null check',
  					description : 'Use the [Field] IS NULL pattern to check for null values',
  					sql : 'SELECT * FROM [Presentations] WHERE [Preparation] IS NULL',
  					keywords : 'Is Null',
  					parameters : [],
  					status : 1,
  					version : "0.0.1"
  				},

  				{
  					name : 'Basic NOT Null check',
  					description : 'Use the [Field] IS NULL pattern to check for values that are not null',
  					sql : 'SELECT * FROM [Presentations] WHERE [Preparation] IS NOT NULL',
  					keywords : 'Is Not Null',
  					parameters : [],
  					status : 1,
  					version : "0.0.1"
  				},

  				{
  					name : 'Sorting the result',
  					description : 'Use the ORDER BY statement to return your data in an orderly fashion',
  					sql : 'SELECT * FROM [Presentations] WHERE [Preparation] IS NOT NULL ORDER BY [Created] DESC',
  					keywords : 'Sorting, Desc',
  					parameters : [],
  					status : 0,
  					version : "0.0.1"
  				},

  				{
  					name : 'Sorting the result, multiple fields',
  					description : 'Use the ORDER BY statement to return your data in an orderly fashion',
  					sql : 'SELECT * FROM [Books] ORDER BY [Published] DESC, [Author]',
  					keywords : 'Sorting, Asc, Desc',
  					parameters : [],
  					status : 0,
  					version : "0.0.1"
  				},
  				{
  					name : 'Using <Today> element',
  					description : 'Use camsql.today to get babies born the last 60 days',
  					sql : 'SELECT * FROM [Newborns] WHERE [BirthDate] > ?',
  					keywords : 'Today, Date, camlsql.today',
  					parameters : [ camlsql.today(-60) ],
  					status : 1,
  					version : "0.0.1"
  				},
  				{
  					name : 'Using <In> element',
  					description : 'Use camsql.today to get babies born the last 60 days',
  					sql : 'SELECT * FROM [Newborns] WHERE [Names] In ?',
  					keywords : 'In',
  					parameters : [ ["Anna", "Johan", "David", "Indigo"] ],
  					status : 1,
  					version : "0.0.1"
  				},
  				{
  					name : 'Using <Contains> element',
  					description : 'Use a LIKE statement to create Contains queries. Surround your text parameter with % characters to create the Contains statement',
  					sql : 'SELECT * FROM [Popular Songs] WHERE [Title] LIKE ?',
  					keywords : 'LIKE, Contains',
  					parameters : [ "%love%"],
  					status : 1,
  					version : "0.0.1"
  				},
  				{
  					name : 'Using <BeginsWith> element',
  					description : 'Use a LIKE statement to create Contains queries. But a % characters in the end of your parameter value.',
  					sql : 'SELECT * FROM [Popular Songs] WHERE [Title] LIKE ?',
  					keywords : 'LIKE, BeginsWith',
  					parameters : [ "love%"],
  					status : 1,
  					version : "0.0.1"
  				},
  				{
  					name : 'More complex #1 - ? and (? or?)',
  					description : 'Combine multiple AND and OR statements to generate the more complex View Xml statements',
  					sql : 'SELECT * FROM [Decisions] WHERE [Title] LIKE ? AND ([Motivation] IS NULL OR [IsBoss] = ?)',
  					keywords : 'LIKE, BeginsWith',
  					parameters : [ "%maybe%", 'Yes'],
  					status : 1,
  					version : "0.0.1"
  				},
  				{
  					name : 'More complex #2 - ? and ((? and ?) or ?)',
  					description : 'Combine multiple AND and OR statements to generate the more complex View Xml statements',
  					sql : 'SELECT * FROM [Decisions] WHERE [Title] LIKE ? AND ((Field1 = ? AND Field2 = ?) OR Field3 = ?)',
  					keywords : 'LIKE, BeginsWith',
  					parameters : [ "%maybe%", 'Yes'],
  					status : 1,
  					version : "0.0.1"
  				},
  				{
  					name : 'More complex #3 - ? and ((? and ?) or (? and ?))',
  					description : 'x',
  					sql : 'SELECT * FROM [Decisions] WHERE [Title] LIKE ? AND ((Field1 = ? AND Field2 = ?) OR (Field3 = ? and Field4 < ?))',
  					keywords : 'LIKE, BeginsWith',
  					parameters : [ "%maybe%", 'Value1', 'Value2', 'Value3', 1970],
  					status : 0,
  					version : "0.0.1"
  				},
  				{
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
  	},
  	watch: {
  	    '$route' : function(to, from) {
  	      // react to route changes...
  	    } 
  	  }
  }


  	/* File: c:\git\camlsql-js\src\app\js\vue\components\GetStartedTabComponent.js  */

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


  	/* File: c:\git\camlsql-js\src\app\js\vue\components\LiveTabComponent.js  */

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
  			camlRawXml : ''
  		}
  	},
  	computed : {
  		 compressedQuery : function() {
  		 	if (this.liveQuery)
  		 		return LZString.compressToEncodedURIComponent(JSON.stringify({
  		 			query : this.liveQuery,
  		 			param : this.parameters
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
  	    }
  	  },
  	  methods : {
  	  	paramError : function(param) {
  	  		if (param.type == "Number" && isNaN(Number(param.value))) {
  	  			return "That's not a number";
  	  		} else if (param.type == "Today" && isNaN(Number(param.value))) {
  	  			return "Set a positive number for adding days, or a negative to subtract.";
  	  		}
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
  	    				parameterCode += " " + JSON.stringify(ps[i].value);
  	    				actualParams.push(ps[i].value);
  	    			} else if (ps[i].type == "Number") {
  	    				parameterCode += " " + Number(ps[i].value);
  	    				actualParams.push(Number(ps[i].value));
  	    			} else if (ps[i].type == "Today") {
  	    				var n = Number(ps[i].value);
  	    				parameterCode += " camlsql.today(" + (ps[i].value ? (isNaN(n) ? n : 0) : '') +")";
  	    				actualParams.push(ps[i].value && !isNaN(n) ? camlsql.today(n) : camlsql.today());
  	    			} 
  	    		}

  	    		console.warn("actualParams", actualParams, ps);

  	    		if(parameterCode) parameterCode = ",\n[\n" + parameterCode + "\n]";
  	    		var q = camlsql.prepare(theQuery, actualParams, true);
  	    		self.camlRawXml = q.getXml();
  	    		self.camlXml = vkbeautify.xml(self.camlRawXml);
  	    		self.calculatedScript = "camlsql.prepare(" + JSON.stringify(theQuery) + parameterCode + ");";
  	    		self.liveTimeout = null;
  	    		var f = document.querySelectorAll('pre.prettyprinted');
  	    		for (var i=0; i < f.length;i++) {
  	    			f[i].classList.remove('prettyprinted');	    			
  	    		}
  	    		PR.prettyPrint();
  	    	}, 500);
  	  	}
  	  }
  }





  	/* File: c:\git\camlsql-js\src\app\js\vue\components\StartTabComponent.js  */
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
  			}
  		}
  	},

  	watch: {
  		'$route' : function(to, from) {
  			this.changeTabByRoute(to.name);
  		}
  	}
  }


  	/* File: c:\git\camlsql-js\src\app\js\vue\components\VisaAvtalComponent.js  */

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


  	/* File: c:\git\camlsql-js\src\app\js\start.js  */
  //window.splm = SharePointListManager;

  var routes = [
    { path: '/', redirect : '/start', 'name' : 'sok'},
    
    { path: '/start', name : 'start', component: StartTabComponent },
    { path: '/start/other', name : 'start-other', component: StartTabComponent },
    { path: '/start/about', name : 'start-about', component: StartTabComponent },
    { path: '/get-started', name : 'get-started', component: GetStartedTabComponent },
    { path: '/examples', name : 'examples', component: ExamplesTabComponent },
    { path: '/examples/find/:query', component: ExamplesTabComponent },
    { path: '/examples/find/:query/:id', name : 'example-search-item', component: VisaAvtalComponent },
    { path: '/examples/:id', name : 'show-example', component: VisaAvtalComponent },
    { path: '/live', name : 'live', component: LiveTabComponent },
    { path: '/live/:hash', name : 'live-hash', component: LiveTabComponent },
  ] 


    
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
  		test : "hej4"
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