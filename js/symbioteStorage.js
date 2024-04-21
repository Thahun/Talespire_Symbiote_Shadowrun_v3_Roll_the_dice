class SymbioteStorage {
    initState = false;
    storage;

    /**
     * @param {StorageService} storage 
     */
    constructor(storage) {
        debug.log("SymbioteStorage class loaded");

        this.storage = storage;
        this.init();
    }

    async init() {
        debug.log("SymbioteStorage.init");
        // Wait to ensure TS is loaded and available
        await sleep(500);
        // Enable to flush storage in case it's broken
        //this.flushAll();

        TS.localStorage.global.getBlob().then((storedData) => {
            debug.log("storedData: " + storedData);
            this.storage.setStorageAsString(storedData || "{}");
            this.initState = true;
            debug.log("SymbioteStorage.load success")
        }).catch(e => {
            error.show("Failed to load from local storage: " + e.message);
            TS.debug.log("Failed to load from local storage: " + e.message);
            console.error("Failed to load from local storage:", e);
            throw new SyntaxError("Failed to load from local storage: " + e.message);
        });
        debug.log("SymbioteStorage.init end");
    }

    isInit() {
        return this.initState;
    }

    flushAll() {
        debug.log("SymbioteStorage.flush");
        TS.localStorage.global.deleteBlob();
    }

    persist() {
        debug.log("SymbioteStorage.persist");
        TS.localStorage.global.setBlob(this.storage.getStorageAsString()).then(() => {
            debug.log("SymbioteStorage.persist success")
        }).catch(e => {
            error.show("Failed to persist to local storage: " + e.message);
            TS.debug.log("Failed to persist to local storage: " + e.message);
            console.error("Failed to persist to local storage:", e); 
            throw new SyntaxError("Failed to persist to local storage: " + e.message);
        });
    }
}