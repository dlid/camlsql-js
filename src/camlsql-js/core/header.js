(function (global, factory) {
  'use strict';
  typeof exports === 'object' && typeof module !== 'undefined' ? (module.exports = factory()) :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.camlsql = factory()); // jshint ignore:line
}(this, function() {
  'use strict';
  var publicData; 