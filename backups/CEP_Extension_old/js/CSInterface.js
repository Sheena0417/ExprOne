/**
 * Enumeration of CSInterface system path types.
 */
var SystemPath = {
    /** The user data folder */
    USER_DATA: "userData",
    /** The common files folder */
    COMMON_FILES: "commonFiles",
    /** The extensions folder */
    EXTENSION: "extension",
    /** The host application folder */
    HOST_APPLICATION: "hostApplication"
};

/**
 * CSInterface - Communication bridge between CEP and Host application.
 */
function CSInterface() {}

/**
 * Gets the system path for the given path type.
 * @param {string} pathType The path type from SystemPath enumeration.
 * @return {string} The system path string.
 */
CSInterface.prototype.getSystemPath = function(pathType) {
    if (window.__adobe_cep__) {
        return window.__adobe_cep__.getSystemPath(pathType);
    }
    return "";
};

/**
 * Evaluates a JavaScript script in the host application.
 * @param {string} script The script to evaluate.
 * @param {function} callback The callback function to call when evaluation is complete.
 */
CSInterface.prototype.evalScript = function(script, callback) {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.evalScript(script, callback);
    } else {
        if (callback) {
            callback("CEP not available");
        }
    }
};

/**
 * Gets the scale factor of the monitor.
 * @return {number} The scale factor of the monitor.
 */
CSInterface.prototype.getScaleFactor = function() {
    if (window.__adobe_cep__) {
        return window.__adobe_cep__.getScaleFactor();
    }
    return 1.0;
};

/**
 * Gets the application ID.
 * @return {string} The application ID.
 */
CSInterface.prototype.getApplicationID = function() {
    if (window.__adobe_cep__) {
        return window.__adobe_cep__.getApplicationID();
    }
    return "";
};

/**
 * Gets the extension ID.
 * @return {string} The extension ID.
 */
CSInterface.prototype.getExtensionID = function() {
    if (window.__adobe_cep__) {
        return window.__adobe_cep__.getExtensionID();
    }
    return "";
};

/**
 * Gets information about the host environment.
 * @return {object} The host environment information.
 */
CSInterface.prototype.getHostEnvironment = function() {
    if (window.__adobe_cep__) {
        return JSON.parse(window.__adobe_cep__.getHostEnvironment());
    }
    return {};
};

/**
 * Gets the current locale.
 * @return {string} The current locale.
 */
CSInterface.prototype.getCurrentLocale = function() {
    if (window.__adobe_cep__) {
        return window.__adobe_cep__.getCurrentLocale();
    }
    return "en_US";
};

/**
 * Registers an event listener for the specified event type.
 * @param {string} type The event type.
 * @param {function} listener The event listener.
 * @param {object} obj The object to bind the listener to.
 */
CSInterface.prototype.addEventListener = function(type, listener, obj) {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.addEventListener(type, listener, obj);
    }
};

/**
 * Removes an event listener for the specified event type.
 * @param {string} type The event type.
 * @param {function} listener The event listener.
 * @param {object} obj The object to unbind the listener from.
 */
CSInterface.prototype.removeEventListener = function(type, listener, obj) {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.removeEventListener(type, listener, obj);
    }
};

/**
 * Dispatches an event.
 * @param {object} event The event to dispatch.
 */
CSInterface.prototype.dispatchEvent = function(event) {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.dispatchEvent(event);
    }
};

/**
 * Requests the CEP engine to run the specified command.
 * @param {string} extensionId The extension ID.
 * @param {string} commandId The command ID.
 * @param {string} params The command parameters.
 * @param {function} callback The callback function.
 */
CSInterface.prototype.requestOpenExtension = function(extensionId, commandId, params, callback) {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.requestOpenExtension(extensionId, commandId, params, callback);
    }
};

/**
 * Closes the extension.
 */
CSInterface.prototype.closeExtension = function() {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.closeExtension();
    }
};

/**
 * Resizes the extension window.
 * @param {number} width The new width.
 * @param {number} height The new height.
 */
CSInterface.prototype.resizeContent = function(width, height) {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.resizeContent(width, height);
    }
};
