var iostream = require('socket.io');

var Statics = {
    io_ref: null,
    routers: {}
};

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

var Router = function () {
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
                        if (k[0] === '$') p.push(data[k.substr(1)]);
                        else p.push(data[k]);
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
                h = this._handlers[Object.keys(data.sort()).join(' ')];
            }
            if (!h) {
                h = this._handlers.except;
            }
            if (!this._run_handler(h, socket, data)) {
                throw new Error('Uncaught event passed.');
            }
        },
        _run_handler: function (h, socket, data) {
            if (!h) return false;
            h.execute(socket, data);
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

var init = function (server, middleware) {
    Statics.io_ref = iostream(server);
    Statics.io_ref.use(middleware);
    Statics.io_ref.on('connection', function (socket) {
        var r;
        if (Statics.routers['connection']) {
            // Connection Handler
            Statics.routers['connection'].run(socket);
        }
        // All other handlers
        for (var event in Statics.routers) {
            if (event !== 'connection') {
                socket.on(event, function(data) {
                    Statics.routers[event].run(socket, data);
                });
            }
        }
    });
};
                 
var use = function (event, router) {
    Statics.routers[event] = router;
};

module.exports = {
    Router: Router,
    initialize: init,
    use: use
};