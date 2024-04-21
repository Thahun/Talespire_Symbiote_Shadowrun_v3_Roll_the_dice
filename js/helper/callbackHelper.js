class GetterSetterCallbackDTO {
    object;
    getterMethod;
    getterParameters;
    setterMethod;
    setterParameters;

    /**
     * @param {Object} object 
     * @param {String} getterMethod 
     * @param {Array} getterParameters 
     * @param {String} setterMethod 
     * @param {Array} setterParameters 
     */
    constructor(
        object,
        getterMethod,
        getterParameters = [],
        setterMethod,
        setterParameters = []
    ) {
        this.object = object;
        this.getterMethod = getterMethod;
        this.getterParameters = getterParameters;
        this.setterMethod = setterMethod;
        this.setterParameters = setterParameters;
    }
}

class MethodCallbackDTO {
    object;
    method;
    parameters;

    /**
     * @param {Object} object 
     * @param {String} method 
     * @param {Array} parameters 
     */
    constructor(
        object,
        method,
        parameters = []
    ) {
        this.object = object;
        this.method = method;
        this.parameters = parameters;
    }
}

class CallbackHelper {
    /**
     * Execute a callback function
     * 
     * @param {MethodCallbackDTO} callback 
     * @param {Boolean} returnResult
     * @return {any|void}
     */
    static executeCallback(callback, returnResult = true) {
        if(returnResult) {
            return callback.object[callback.method](...callback.parameters);
        } else {
            callback.object[callback.method](...callback.parameters);
        }
    }
}