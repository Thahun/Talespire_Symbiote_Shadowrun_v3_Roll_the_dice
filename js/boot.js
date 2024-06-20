/**
 * @type {DebugBox} debug
 */
let debug;
/**
 * @type {InfoBox} info
 */
let info;
/**
 * @type {ErrorBox} error
 */
let error;
/**
 * @type {StorageService} storageService
 */
let storageService;
/**
 * @type {SymbioteStorage} symbioteStorage
 */
let symbioteStorage;
/**
 * @type {DiceService} diceService
 */
let diceService;
/**
 * @type {IniAndGmManager} iniAndGmManager
 */
let iniAndGmManager;
/**
 * @type {Helm} helm
 */
let helm;

let isGM = false;


class BootLoader {

    initTimeout = 10000; // ms
    ELEMENTID_LOADING = 'loading';

    scripts = [
        { src: 'js/common.js', loaded: false },
        { src: 'js/storageService.js', loaded: false },
        { src: 'js/symbioteStorage.js', loaded: false },

        { src: 'js/helper/manifestHelper.js', loaded: false },
        { src: 'js/helper/callbackHelper.js', loaded: false },
        { src: 'js/helper/abstractSheetHelper.js', loaded: false },

        { src: 'js/sheetSections/diceSets.js', loaded: false },

        // Stelle sicher, dass diceTracker.js vor diceService.js geladen wird
        { src: 'js/diceTracker.js', loaded: false },
        { src: 'js/diceService.js', loaded: false },
        { src: 'js/iniAndGmManager.js', loaded: false },
        { src: 'js/helm.js', loaded: false },
    ];

    allScriptsLoaded() {
        return this.scripts.every(script => script.loaded);
    }

    async boot() {
        console.log('Booting ...');
        await this.loadScripts();
    }

    async loadScripts() {
        for (let index = 0; index < this.scripts.length; index++) {
            await this.loadScript(index, this.scripts[index].src);
        }
        console.log('... booted');
        this.init();
    }

    loadScript(index, src) {
        return new Promise((resolve, reject) => {
            let script = document.createElement('script');
            script.src = src;
            script.async = false;

            script.onload = () => {
                this.scripts[index].loaded = true;
                console.log(`${src} loaded.`);
                resolve();
            };

            script.onerror = () => {
                console.error(`Failed to load script: ${src}`);
                reject(new Error(`Failed to load script: ${src}`));
            };

            document.head.appendChild(script);
        });
    }

    init() {
        console.log('Initializing ...');
        this.initCommon();
        this.initSymbiote();
        this.waitingForInit();
        console.log('... initialized');
    }

    async checkIfGM(){
        let user = await TS.players.whoAmI();
        let userDetails = await TS.players.getMoreInfo([user.id]);
        return userDetails[0].rights.canGm;
    }

    initCommon() {
        console.log('Initializing Common ...');
        debug = new DebugBox(/*true*/);
        info = new InfoBox();
        error = new ErrorBox();
        console.log('Common done');
    }

    initSymbiote() {
        console.log('Initializing Symbiote ...');
        storageService = new StorageService();
        symbioteStorage = new SymbioteStorage(storageService);
        diceService = new DiceService(storageService);
        iniAndGmManager = new IniAndGmManager(storageService);
        helm = new Helm();
        console.log('Symbiote loaded');
    }

    async waitingForInit() {
        let timeout = Date.now() + this.initTimeout;
        let attempts = 0;
        const maxRetries = 10;  // Maximum number of retry attempts
        const initialDelay = 1000;  // Initial delay in milliseconds
        const maxDelay = 8000; // Maximum delay between retries
        let delay = initialDelay;

        while (!diceService.isInit()) {
            attempts++;
            debug.log(`BootLoader.waitingForInit attempt ${attempts}: waiting for DiceService.init`);

            if (Date.now() > timeout) {
                error.show('Timeout: Failed to initialize!');
                throw new Error('Timeout: Initialization failed.');
            }

            try {
                // Versuche, den Service zu initialisieren
                await diceService.init();  // Assuming diceService has an init method
            } catch (err) {
                console.warn(`Error during initialization attempt ${attempts}:`, err);

                if (attempts >= maxRetries) {
                    console.error('Max retries reached. Unable to initialize DiceService.');
                    throw new Error('Max retries reached: Initialization failed.');
                }

                // Exponentieller Backoff: Wartezeit erhöhen, aber nicht über maxDelay hinaus
                delay = Math.min(maxDelay, delay * 2);

                console.log(`Retrying initialization in ${delay / 1000} seconds...`);
                await sleep(delay);
            }

            await sleep(this.retryInterval);
        }

        console.log('Loading ...');
        // Add your loading logic here if necessary
        console.log('... loaded');

        this.hideLoadingPanel();

        console.log('Check GM...');
        isGM = await this.checkIfGM();
        console.log('Is GM: ', isGM);
    }

    hideLoadingPanel() {
        debug.log("BootLoader.hideLoadingPanel");

        let element = document.getElementById(this.ELEMENTID_LOADING);
        element.style.display = 'none';
    }
}

document.addEventListener("DOMContentLoaded", (event) => {
    try {
        let bootLoader = new BootLoader();
        bootLoader.boot();
    } catch (err) {
        console.error("Fehler beim Starten des Symbiote!\n" + err.message)
    }
});
