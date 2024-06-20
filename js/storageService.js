class StorageService {
    /**
     * @type {DiceSetsDTO}
     */
    storage;

    /**
     * @param {DiceSetsDTO} storage
     */
    constructor(storage = new DiceSetsDTO()) {
        this.storage = storage;
    }

    /**
     * @return {String}
     */
    getStorageAsString() {
        return this.convertToString(this.storage);
    }

    /**
     * @param {DiceSetsDTO} data
     */
    setStorageAsString(data) {
        data = this.convertToObject(data);
        this.validateStorageObject(data);
        this.storage = data;
    }


    /**
     * @return {DiceSetsDTO}
     */
    getStorageAsObject() {
        return this.storage;
    }

    /**
     * @param {DiceSetsDTO} data
     */
    setStorageAsObject(data) {
        this.validateStorageObject(data);
        this.storage = data;
    }


    /**
     * @param {DiceSetsDTO} data
     * @return {String}
     */
    convertToString(data) {
        try {
            return JSON.stringify(data);
        } catch (e) {
            error.show("Failed to convert storage Object to String: " + e.message);
            throw new Error("Failed to convert storage Object to String: " + e.message);
        }
    }

    /**
     * @param {DiceSetsDTO} data
     * @return {DiceSetsDTO}
     */
    convertToObject(data) {
        try {
            let obj = new DiceSetsDTO();
            obj.init(JSON.parse(data));
            return obj;
        } catch (e) {
            error.show("Failed to convert storage String to Object: " + e.message);
            throw new Error("Failed to convert storage String to Object: " + e.message);
        }
    }

    /**
     * @param {DiceSetsDTO} data
     */
    validateStorageObject(data) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            error.show("Invalid storage object: Not an Object.");
            console.log("Invalid storage object: Not an Object.", data);
            throw new Error("Invalid storage object: Not an Object.");
        }

        if (!(data instanceof DiceSetsDTO)) {
            error.show("Invalid storage object: Element isn't of type {DiceSetsDTO}.");
            console.log("Invalid storage object: Element isn't of type {DiceSetsDTO}.", data);
            throw new Error("Invalid storage object: Element isn't of type {DiceSetsDTO}.");
        }
    }
}
