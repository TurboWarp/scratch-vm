class MouseWheel {
    constructor (runtime) {
        /**
         * Reference to the owning Runtime.
         * @type{!Runtime}
         */
        this.runtime = runtime;
        this.scroll = 0;
    }

    /**
     * Mouse wheel DOM event handler.
     * @param  {object} data Data from DOM event.
     */
    postData (data) {
        const matchFields = {};
        this.scroll = data.deltaY;

        if (data.deltaY < 0) {
            matchFields.KEY_OPTION = 'up arrow';
        } else if (data.deltaY > 0) {
            matchFields.KEY_OPTION = 'down arrow';
        } else {
            return;
        }

        this.runtime.startHats('event_whenkeypressed', matchFields);
    }

    getMouseWheelY (data) {
        return this.scroll;
    }
}

module.exports = MouseWheel;
