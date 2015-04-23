/**
 * feedview.js - Singleton object for managing the view container
 *      to display podcast feeds to the user.
 * Authors: Ian McGaunn; Dave Zimmelman
 * Modified: 22 Apr 15
 *
 * @expose {FeedView} window.FeedView
 */

(function (window, $) {
    'use strict';
    
    /**
     * FeedView - Singleton container that manages podcast feed views.
     * @function
     */
    var FeedView = {
        /**
         * Attach FeedView to parent DOM Element and display it.
         * @param {Mixed} parent - Any jQuery-recognized object selector
         *      that will identify the single parent.
         * @return FeedView
         */
        open : function (parent) {
            if (this.isOpen()) {
                // Already open
                if (!$(parent).is(this._view.parent())) {
                    // Attached to different parent; Close FeedView
                    //  then attach to new parent and reopen.
                    this.close(parent);
                }
                else {
                    // Attached to same parent; Make ready for
                    //  new contents.
                    this._show_loader();
                    this.focus();
                }
                return this;
            }
            // Not already open
            this._show_loader();
            $(parent).append(this._view);
            this.focus();
            // Animate the opening of the FeedView
            this._view.animate({
                height: '400px'
            }, 500, function () {
                // Animation complete
                FeedView._isopen = true;
                // Pop off any queued event listeners and execute them.
                var f = FeedView._open_queue.pop();
                while (typeof(f) !== 'undefined') {
                    f();
                    f = FeedView._open_queue.pop();
                }
            });
            return this;
        },
        /**
         * Hide FeedView and remove it from the DOM.
         * @param {Mixed} open - Optional parent selector to pass
         *      to FeedView.open when it has finished closing.
         * @return FeedView
         */
        close : function (open) {
            if (!this.isOpen()) {
                // Already closed
                this._loading = false;
                return this;
            }
            // Is open
            this._isopen = false;
            // Animate closing
            this._view.animate({
                height: '0px'
            }, 500, function () {
                // Animation complete
                FeedView._view.empty();
                FeedView._view.remove();
                // If `open` passed, reopen.
                if (open) FeedView.open(open);
            });
            return this;
        },
        /**
         * Async-safely load HTML into the FeedView object.
         * @param {String} html - Raw HTML to load into the container.
         * @param {Function} func - Optional function to execute necessary
         *      scripts once the FeedView has been loaded.
         * @return FeedView
         */
        load : function (html, func) {
            if (!this.isOpen()) {
                // View not open, queue html to load once opened.
                this.onOpen(function () {
                    FeedView.load(html, func);
                });
            }
            else if (html) {
                // Is open; insert new HTML
                this._view.html(html);
                this._loading = false;
                if (func) func();
            }
            return this;
        },
        /**
         * Report if the FeedView is currently open.
         * @return {Bool}
         */
        isOpen : function () {
            return this._isopen;
        },
        /**
         * Focus user's scroll view to the top of the FeedView's parent.
         * @return FeedView
         */
        focus : function () {
            if (this._view.parent()) {
                this._view.parent()[0].scrollIntoView();
            }
            return this;
        },
        /**
         * Return the FeedView's parent object if it currently has one.
         * @return {Mixed} - jQuery object of parent, or false if none.
         */
        parent : function () {
            if (this.isOpen()) {
                return this._view.parent();
            }
            return false;
        },
        /**
         * Report if the FeedView is currently in a loading state.
         * @return {Bool}
         */
        isLoading : function () {
            return this._loading;
        },
        /**
         * Add onOpen event listener function into highest priority.
         */
        onOpen : function (func) {
            this._open_queue.unshift(func);
        },
        /**
         * Empty the contents of the FeedView object.
         * @return FeedView
         */
        empty : function () {
            this._loading = false;
            return this._view.html('');
        },
        /**
         * Report if the FeedView's contents are empty.
         * @return {Bool}
         */
        isEmpty : function () {
            return (this._view.html() === '');
        },
        
        _view : $('<div id="feed-view"></div>'), // The enclosed HTML
        _isopen : false, // isOpen flag
        _loading : false, // isLoading flag
        _open_queue : [], // Event listener queue
        
        /**
         * Stuff the loading graphic into the FeedView contents.
         */
        _show_loader : function () {
            this._view.html('<div class="loader">Loading...</div>');
            this._loading = true;
        }
    };
    
    /**
     * Expose object to window.
     */
    window.FeedView = FeedView;
    
}(window, jQuery));