/**
 * lib/socket.js - Module for managing socket.io connection.
 *
 * Allows abstracted listeners as routes for socket events.
 * It's a pretty swanky module, if I do say so, myself.
 *
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 30 Apr 15
 */

var iostream = require('socket.io');

// Persisting variables for module.
var Statics = {
    io_ref: null,
    routers: {}
};

/**
 * Parse the parameter names out of a function.
 * @param {Function} func - The function to parse.
 * @return {[String]} - List of parameter names.
 */
var func_params = function (func) {
    var comments = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg,
        params = /([^\s,]+)/g,
        func_str = func.toString().replace(comments, ''),
        start = func_str.indexOf('(') + 1,
        end = func_str.indexOf(')'),
        head = func_str.slice(start, end),
        result = head.match(params);
    return (result) ? result : [];
};

/**
 * Helper function that returns the power set of a given array.
 * @param {Array} list - The list to operate on.
 * @return {[Array]} - Array of all combinations of list elements.
 */
var power_set = function (list) {
    var set = [],
        listSize = list.length,
        combinationsCount = (1 << listSize);
    for (var i = 1; i < combinationsCount; i++, set.push(combination))
        for (var j = 0, combination = []; j < listSize; j++)
            if ((i & (1 << j)))
                combination.push(list[j]);
    return set;
};

/**
 * Router - Pseudoclass for socket event routing.
 * 
 * @method {Object} getIO () - Return the reference to the socket.io IO
 *      instance.
 * @method {} add ({Function}) - Add new handler to socket event router.
 * Usage (example: in module events/myEvent):
 *      var router = require('../lib/socket');
 *      // Handler for event passed without any arguments.
 *      router.add(function () {
 *          doSomething();
 *      });
 *      // Handler for event passed with arguments named `arg1` and `arg2`,
 *      //  or only `arg1` as `arg2` is designated an optional parameter by
 *      //  the `$` preceding symbol.
 *      router.add(function (arg1, $arg2) {
 *          doSomethingWith(arg1);
 *          // In Router handlers, this = the current socket.
 *          if (typeof($arg2) !== 'undefined') this.emit('another-event');
 *      });
 * @method {} addException ({Function}) - Add handler for if/when the
 *      event of the router goes unhandled by provided handlers.
 *  Usage (very similar to add, but uses one parameter):
 *      router.addException(function (data) {
 *         // data contains a map of argument-names to values.
 *         console.log('Uncaught myEvent Socket Event.');
 *         console.log('Provided data: ' + JSON.stringify(data));
 *      });
 * @method {} run ({Socket}, {Object}) - Use the router to find the approp-
 *      riate handler for the given dataset and run the handler for the
 *      given socket.
 */
var Router = function () {
    /**
     * Router/Handler - Pseudoclass for Handler object.
     *
     * @constructor
     *  @param {Function} func - The handler function.
     *
     * @property {[String]} params - List of handler function parameters.
     * @property {[String]} keys - List of all possible accepting arguments.
     * @property {Function} func - The handler function.
     *
     * @method {} execute ({Socket}, {Object}) - Run the handler function
     *      with the socket and data provided.
     */
    var Handler = function (func) {
        var params = func_params(func),
            p = params.filter(function (v) { return (v[0] !== '$'); }),
            o = params.filter(function (v) { return (v[0] === '$'); }),
            o = (function (a) {
                for (var i in a) a[i] = a[i].substr(1); return a;
            }(o)),
            pset = power_set(o),
            possible = (p.length > 0) ? [p.sort().join(' ')] : [];
        for (var i in pset) {
            possible.push(p.concat(pset[i]).sort().join(' '));
        }
        return {
            params: params,
            keys: possible,
            func: func,
            execute: function (socket, data) {
                var k, p = [];
                if (data) {
                    for (var i in this.params) {
                        k = this.params[i];
                        if (k[0] === '$') k = k.substr(1);
                        p.push(data[k]);
                    }
                }
                this.func.apply(socket, p);
            }
        };
    };
    return {
        _handlers: {},
        getIO: function () { return Statics.io_ref; },
        add: function (func) {
            var h = new Handler(func);
            if (!this._add_handler(h)) {
                throw new Error('Cannot add socket handler for path' +
                                ' that already exists.');
            }
        },
        addException: function (func) {
            if (this._handlers.except) {
                throw new Error('Exception handler already added for event.');
            }
            this._handlers.except = new Handler(func);
        },
        run: function (socket, data) {
            var h, k;
            if (!data || typeof(data) !== 'object' ||
                    Object.keys(data).length < 1) {
                h = this._handlers.do;
            }
            else {
                h = this._handlers[Object.keys(data).sort().join(' ')];
            }
            if (!h) {
                h = this._handlers.except;
            }
            if (!this._run_handler(h, socket, data)) {
                throw new Error('Uncaught event passed: ' + JSON.stringify(data));
            }
        },
        _run_handler: function (h, socket, data) {
            if (!h) return false;
            h.execute(socket, data);
            return true;
        },
        _add_handler: function (h) {
            if (h.params.length === 0) {
                if (this._handlers.do) return false;
                this._handlers.do = h;
            }
            else {
                for (var i in h.keys) {
                    if (h.keys[i]) {
                        if (this._handlers[h.keys[i]]) return false;
                        this._handlers[h.keys[i]] = h;
                    }
                }
            }
            return true;
        }
    };
};

/**
 * Initialize the IO Socket Stream with the server object.
 *      Note: Function must be called before socket streams are opened.
 * @param {Object} server - Reference to the NodeJS Server instance.
 * @param {Function} middleware - Middleware function for socket handling.
 */
var init = function (server, middleware) {
    // Initialize socket.io.
    Statics.io_ref = iostream(server); 
    // Add middleware if any provided.
    if (middleware) Statics.io_ref.use(middleware); 
    // Add entry 'connection' handler.
    Statics.io_ref.on('connection', function (socket) {
        // Create event-handler creator for given event;
        var f = function (event) {
            // This method is needed to deal with bugs caused by
            //      local variable scopes.
            return function (data) {
                Statics.routers[event].run(socket, data);
            };
        };
        // If custom 'connection' router specified, attach it.
        if (Statics.routers['connection']) {
            // Connection Handler
            Statics.routers['connection'].run(socket);
        }
        // Attach all other routers.
        for (var event in Statics.routers) {
            if (event !== 'connection') {
                socket.on(event, f(event));
            }
        }
    });
};

/**
 * Specify a router to be used for a given socket event.
 * @param {String} event - The event name to attach to.
 * @param {Router} router - The router to use for the given event.
 * Usage (suggested for usage in app.js next to router.use statements):
 *  var socket = require('lib/socket');
 *  var myEventRouter = require('events/myEvent');
 *  socket.use('my-event', myEventRouter);
 */
var use = function (event, router) {
    Statics.routers[event] = router;
};

// Expose necessary objects.
module.exports = {
    Router: Router,
    initialize: init,
    use: use
};