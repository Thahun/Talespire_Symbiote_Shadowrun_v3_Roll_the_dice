class ManifestHelper {
    manifestData;

    static KEY_AUTHORS = 'about.authors';
    static KEY_NAME = 'name';
    static KEY_VERSION = 'version';

    constructor() {
        this.loadManifestData();
    }

    loadManifestData() {
        fetch('./manifest.json')
        .then((response) => response.json())
        .then((json) => this.manifestData = json);
    }

    /**
     * @param {String} key 
     * @returns {Any}
     */
    fetchKey(key) {
        if(!this.manifestData) {
            error.show("No manifest data loaded!");
            throw new Error("No manifest data loaded!");
        }

        let data = this.manifestData;
        let keyChain = [];

        if(key.includes('.')) {
            keyChain = key.split('.');
        } else {
            keyChain = [key];
        }
        for (let i = 0; i < keyChain.length; i++) {
            const keySegment = keyChain[i];
            this.validateKey(data, keySegment);
            data = data[keySegment];
        }

        return data;
    }

    validateKey(data, key) {
        if(!Object.hasOwn(data, key)) {
            error.show("Key '" + key + "' doesn't exist in manifest!");
            throw new Error("Key '" + key + "' doesn't exist in manifest!");
        }
    }
}