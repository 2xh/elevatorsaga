"use strict";

// Console shim
(function () {
    var f = function () {};
    if (!self.console) {
        console = {
            log:f, info:f, warn:f, debug:f, error:f
        };
    }
}());

Math.clamp = function(num, min, max) {
    return Math.min(max, Math.max(num, min));
};

Math.fequal = function(a, b) {
    return Math.abs(a-b) < 0.00000001;
};

// Polyfill from MDN
if(typeof Math.sign === "undefined") {
    Math.sign = function(x) {
        x = +x; // convert to a number
        if (x === 0 || isNaN(x)){
            return x;
        }
        return x > 0 ? 1 : -1;
    };
}

if(!self.requestAnimationFrame) {
    self.requestAnimationFrame = function(callback) {
        return setTimeout(callback, 1.0 / 60.0, new Date().getTime());
    }
}

Element.prototype.addClass = function(c) {
    if((" " + this.className + " ").indexOf(" " + c + " ") === -1) {
        this.className += (this.className ? " " : "") + c;
    }
    return this;
}

Element.prototype.removeClass = function(c) {
    this.className = (" " + this.className + " ").replace(" " + c + " ", " ").trim();
    return this;
}

var newGuard = function(obj, type) {
    if(!(obj instanceof type)) { throw "Incorrect instantiation, got " + typeof obj + " but expected " + type; }
}

// Fake frame requester helper used for testing and fitness simulations
var createFrameRequester = function(timeStep) {
    var currentCb = null;
    var requester = {};
    requester.currentT = 0.0;
    requester.register = function(cb) { currentCb = cb; };
    requester.trigger = function() { requester.currentT += timeStep; if(currentCb !== null) { currentCb(requester.currentT); } };
    return requester;
};

var getCodeObjFromCode = function(code) {
    code = "(" + code + ")";
    /* jslint evil:true */
    var obj = eval(code);
    /* jshint evil:false */
    if(typeof obj.init !== "function") {
        obj.init = function(){};
    }
    if(typeof obj.update !== "function") {
        obj.update = function(){};
    }
    return obj;
}

