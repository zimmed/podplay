/**
 * pagestack.js - Customized PageView stack data-structure
 *      for url/view tracking.
 * Authors: Dave Zimmelman
 * Modified: 22 Apr 15
 */

(function (document, window) {
    'use strict';
    
    /**
     * @callback PageEventCallback - Event listener function.
     *      PageEventCallback functions must respond to the caller
     *      through Event.complete() when asynchrounous work is done,
     *      otherwise endless loops will occur.
     * @param {PageEvent} Event - The event object fired.
     */
    
    /**
     * PageEvent - Event object passed by onLoad and onUnload page events.
     * @property {Bool} incomplete - Status of callback event.
     * @property {String} type - The type of event ('load' / 'unload').
     * @property {Mixed} data - The data of the current page.
     * @property {String} page - The identifier of the current page.
     * @function complete - Used to designate async functions in callback
     *      have finished.
     * @function isEnd - Check if current page is at the end of the stack.
     */
    var PageEvent = function (type, state) {
        return {
            incomplete: true,
            type: type,
            data: state.data,
            page: state.page,
            complete: function () {
                this.incomplete = false;
            },
            isEnd: function () {
                return (PageStack._cur === PageStack._stack.length - 1);
            }
        };
    };
    /**
     * LoadPageEvent:PageEvent
     * @property {Mixed} prev_data - The data of the previous page.
     * @property {String} prev_page - The identifier for the previous page.
     */
    var LoadPageEvent = function (state, prev) {
        var e = new PageEvent('load', state);
        if (prev) {
            e.prev_page = prev.page;
            e.prev_data = prev.data;
        }
        return e;
    };
    /**
     * UnloadPageEvent:PageEvent
     * @property {Mixed} next_data - The data of the next page.
     * @property {String} next_page - The identifier for the next page.
     */
    var UnloadPageEvent = function (state, prev) {
        var e = new PageEvent('unload', prev);
        e.next_page = state.page;
        e.next_data = state.data;
        return e;
    };
    
    /**
     * PageStack - Stack structure for managing and tracking client urls and
     *      page views.
     * @function init - Initialize the PageStack when the client page is first
     *      loaded.
     * @function load - Load a new page into the client's view.
     * @function update - Reload the current state.
     * @function replace - Replace the current page state, without changing
     *      the client's view.
     * @function back - A safe alternative to window.history.back that will not
     *      take the client away from the current page session.
     * @function onLoad - Add a new LoadPageEvent listener.
     * @function onUnload - Add a new UnloadPageEvent listener.
     * @function offLoad - Remove all LoadPageEvent listeners for a specific page.
     * @function offUnload - Remove all UnloadPageEvent listeners for a specific page.
     * @function getState - Get the current page state object.
     * @function getPage - Get the current page identifier.
     * @function getData - Get the current page data (if any).
     * @function getPath - get the localized path of the current page.
     */
    var PageStack = {
        /**
         * Initiliaze PageStack to page `index`.
         * @param {Object} options - Initialization options.
         *      : {String} options.index - Default page identifier for '/' path.
         * @param {Function} onReady - Optional callback func.
         */
        init : function (options, onReady) {
            this._stack = [];
            this._cur = 0;
            if (options && options.index) {
                this._index = options.index;
            }
            this.replace(this._index, false, '/');
            this._fireLoad(this._index, this.getState(), false, onReady);
        },
        /**
         * Load new page onto the stack.
         * @param {String} page - The page identifier.
         * @param {Mixed} data - The optional page data.
         * @param {String} path - The localized path to display.
         */
        load : function (page, data, path) {
            var s = {page: page.toLowerCase(), data: data};
            if (this._cur > 0 && this._pages_eq(this.getState(-1), s)) {
                // New page is same as one page back in the history.
                this.back();
            }
            else {
                this._push(s, path);
            }
        },
        /**
         * Update the user's view by reloading the current page state.
         * @param {Object} ow_state - Optional state to overwrite with.
         */
        update : function (offset) {
            var state = this.getState(offset), path = this.getPath(offset);
            if (offset) this._cur += offset;
            this._stack = this._stack.slice(0, this._cur);
            this.replace(state.page, state.data, path);
            this._fireLoad(this._index, {page: this._index}, false, function () {
                if (state.page !== this._index) {
                    this._fireLoad(state.page, state, {page: this._index});
                }
            });
        },
        /** 
         * Replace current state in the navigation history.
         * @param {String} page - Page identifier.
         *                          Keeps current identifier if falsy.
         * @param {Object} data - State data to associate with page.
         *                          Keeps current data if falsy.
         * @param {String} path - The localized path to display.
         *                          Keeps current path if falsy.
         */
        replace : function (page, data, path) {
            var n_page = (page) ? page : this.getPage(),
                n_data = (data) ? data : this.getData(),
                n_path = (path) ? path : this.getPath();
            this._stack[this._cur] = {state: {
                                        page: n_page,
                                        data: n_data},
                                      path: n_path};
            window.history.replaceState(this.getState(), document.title, n_path);
            this._checkBack();
        },
        /**
         *
         */
        back : function () {
            if (this._cur > 0) {
                window.history.back();
            }
            else {
                throw new Error('PageStack cannot move back any further.');
            }
        },
        /**
         * Remove all LoadPageEvent listeners for a given page.
         * @param {String} page - The page identifier.
         */
        offLoad : function (page) {
            this._on_loads[page.toLowerCase()] = false;
        },
        /**
         * Remove all UnloadPageEvent listeners for a given page.
         * @param {String} page - The page identifier.
         */
        offUnload : function (page) {
            this._on_unloads[page.toLowerCase()] = false;
        },
        /**
         * Add OnLoad Event listener for given page.
         * @param {String} page - The state.page value to listen for.
         * @param {PageEventCallback} listenerCallback
         */
        onLoad : function (page, listenerCallback) {
            page = page.toLowerCase();
            if (!listenerCallback.toString()
                    .match(/(e|event|Event)\.complete\(\)/)) {
                console.log('WARNING: onLoad listener added that has no ' +
                            'call to `PageEvent.complete`. This may result ' +
                            'in a non-terminating script.');
            }
            if (!this._on_loads[page]) this._on_loads[page] = [];
            this._on_loads[page].push(listenerCallback);
        },
        /**
         * Add OnLoad Event listener for given page.
         * @param {String} page - The state.page value to listen for.
         * @param {PageEventCallback} listenerCallback
         */
        onUnload : function (page, listenerCallback) {
            page = page.toLowerCase();
            if (!listenerCallback.toString()
                    .match(/(e|event|Event)\.complete\(\)/)) {
                console.log('WARNING: onUnload listener added that has no ' +
                            'call to `PageEvent.complete`. This may result ' +
                            'in a non-terminating script.');
            }
            if (!this._on_unloads[page]) this._on_unloads[page] = [];
            this._on_unloads[page].push(listenerCallback);
        },
        /** 
         * Get the state object of the current page.
         * @param {Number} offset_index - Optional positive or negative
         *      offset from the current stack pointer to check.
         * @return {Object} - The state object, if exists, else false.
         */
        getState : function (offset_index) {
            var i = (offset_index)
                ? this._cur + offset_index
                : this._cur;
            if (i >= 0 && i < this._stack.length) {
                return this._stack[i].state;
            }
            return false;
        },
        /**
         * Get the state data of the current page.
         * @param {Number} offset_index - Optional positive or negative
         *      offset from the current stack pointer to check.
         * @return {Mixed} - The state data, if exists, else false.
         */
        getData : function (offset_index) {
            var s = this.getState(offset_index);
            if (!s) return false;
            return s.data;
        },
        /**
         * Get the page identifier of the current page.
         * @param {Number} offset_index - Optional positive or negative
         *      offset from the current stack pointer to check.
         * @return {String} - The page identifier, if exists, else false.
         */
        getPage : function (offset_index) {
            var s = this.getState(offset_index);
            if (!s) return false;
            return s.page;
        },
        /** 
         * Get the localized path of the current page.
         * @param {Number} offset_index - Optional positive or negative
         *      offset from the current stack pointer to check.
         * @return {String} - The path, if exists, else false.
         */
        getPath : function (offset_index) {
            var i = (offset_index)
                ? this._cur + offset_index
                : this._cur;
            if (i >= 0 && i < this._stack.length) {
                return this._stack[i].path;
            }
            return false;
        },
        
        _index : 'index', // Default page identifier
        _cur : 0, // Current stack pointer
        _stack : [], // Stack
        _on_loads : {}, // OnLoad Event listeners
        _on_unloads : {}, // OnUnload Event listeners
        
        /**
         * Handle the soft-back button visibility.
         */
        _checkBack : function () {
            var val = (this._cur === 0) ? 'hidden' : 'visible';
            $('#soft-back-btn').css('visibility', val);
        },
        /**
         * Check if all events have finished.
         * @param {Array} events - List of PageEvents.
         * @return {Bool} - True if finished, else false.
         */
        _eventsFinished : function (events) {
            for (var e in events) {
                if (events[e].incomplete) {
                    return false
                }
            }
            return true;
        },
        /**
         * Execute load listeners for given page.
         * @param {String} page - The page identifier.
         * @param {Object} state - The state of the current page.
         * @param {Object} prev - The state of the previous page.
         * @param {Function} cb - Optional generic callback function.
         */
        _fireLoad : function (page, state, prev, cb) {
            console.log('Load: ' + page);
            var events = [], e;
            if (this._on_loads[page]) {
                for (var i in this._on_loads[page]) {
                    e = new LoadPageEvent(state, prev);
                    events.push(e);
                    this._on_loads[page][i](e);
                }
            }
            if (cb) {
                var h = setInterval(function () {
                    if (PageStack._eventsFinished(events)) {
                        clearInterval(h);
                        cb();
                    }
                    else {
                        console.log(events);
                    }
                }, 500);
            }
        },
        /**
         * Execute unload listeners for given page.
         * @param {String} page - The page identifier.
         * @param {Object} state - The state of the current page.
         * @param {Object} prev - The state of the previous page.
         * @param {Function} cb - Optional generic callback function.
         */
        _fireUnload : function (page, state, prev, cb) {
            console.log('Unload: ' + page);
            var events = [], e;
            if (this._on_unloads[page]) {
                for (var i in this._on_unloads[page]) {
                    e = new UnloadPageEvent(state, prev);
                    events.push(e);
                    this._on_unloads[page][i](e);
                }
            }
            if (cb) {
                var h = setInterval(function () {
                    if (PageStack._eventsFinished(events)) {
                        clearInterval(h);
                        cb();
                    }
                    else {
                        console.log(events);
                    }
                }, 500);
            }
        },
        /** 
         * Push new state into the navigation history.
         * @param {Object} state - State data to associate with page.
         * @param {String} path - The localized path to display.
         * @param {Function} onReady - Optional callback func.
         */
        _push : function (state, path) {
            if (this._stack.length === 0) {
                throw new Error('Cannot push to uninitialized PageStack.');
            }
            var prev_state = this.getState(); // Get old state.
            this._cur++; // Increment current stack pointer.
            this._stack = this._stack.slice(0, this._cur); // Trim stack to _cur
            this._stack[this._cur] = {state: state, path: path}; // Set new state
            window.history.pushState(this.getState(), document.title, path); // Push path to window
            this._checkBack(); // Check back-button for visibility
            this._fireUnload(prev_state.page, state, prev_state,
                             function () {
                PageStack._fireLoad(state.page, state, prev_state);
            });
        },
        /** 
         * Move back in the page stack.
         * @return {Bool} - True if moved backward.
         *                - False if cannot move backward.
         */
        _handle_back : function () {
            var state, prev_state = this.getState();
            if (this._cur === 0) return false;
            this._cur--;
            this._checkBack();
            state = this.getState();
            this._fireUnload(prev_state.page, state, prev_state,
                             function () {
                PageStack._fireLoad(state.page, state, prev_state);
            });
            return true;
        },
        /** 
         * Move forward in the page stack.
         * @return {Bool} - True if moved forward.
         *                - False if cannot move forward.
         */
        _handle_forward : function () {
            var state, prev_state = this.getState();
            if (this._cur + 1 >= this._stack.length) return false;
            this._cur++;
            this._checkBack();
            state = this.getState();
            this._fireUnload(prev_state.page, state, prev_state,
                             function () {
                PageStack._fireLoad(state.page, state, prev_state);
            });
            return true;
        },
        /**
         * Compares two page states for equality.
         * @param {Object} state1
         * @param {Object} state2
         * @return {Bool} True if pages are identical, else False.
         */
        _pages_eq : function (state1, state2) {
            return (JSON.stringify(state1) === JSON.stringify(state2));
        }
    };
    
    /**
     * Handle popstate events.
     */
    window.onpopstate = function () {
        var state = window.history.state,
            prev = (PageStack._pages_eq(state, PageStack.getState(-1)))
                    ? PageStack._handle_back()
                    : ((PageStack._pages_eq(state, PageStack.getState(1)))
                        ? PageStack._handle_forward()
                        : false);
        
        console.log('COMPARE ' + JSON.stringify(state) + ' to:');
        console.log('\tback: ' + JSON.stringify(PageStack.getState(-1)));
        console.log('\tforw: ' + JSON.stringify(PageStack.getState(1)));
        if (!prev) {
            console.log('Popped to state not found in PageStack.');
            //window.location.replace(document.location.pathname);
        }
    };
    
    /**
     * Expose to window.
     */
    window.PageStack = PageStack;
    
}(document, window));