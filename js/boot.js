/**
 * @type {DebugBox} debug
 */
var debug;
/**
 * @type {InfoBox} info
 */
var info;
/**
 * @type {ErrorBox} error
 */
var error;
/**
 * @type {StorageService} storageService
 */
var storageService;
/**
 * @type {SymbioteStorage} symbioteStorage
 */
var symbioteStorage;
/**
 * @type {DiceService} diceService
 */
var diceService;

class BootLoader {
    initTimeout = 2000; //ms
    ELEMENTID_LOADING = 'loading';

    scripts = [
        {src: 'js/common.js', loaded: false},
        {src: 'js/storageService.js', loaded: false},
        {src: 'js/symbioteStorage.js', loaded: false},
        
        {src: 'js/helper/manifestHelper.js', loaded: false},
        {src: 'js/helper/callbackHelper.js', loaded: false},
        {src: 'js/helper/abstractSheetHelper.js', loaded: false},

        {src: 'js/sheetSections/diceSets.js', loaded: false},

        {src: 'js/diceTracker.js', loaded: false},
        {src: 'js/diceService.js', loaded: false},
    ]

    allScriptsLoaded() {
        for (let index = 0; index < this.scripts.length; index++) {
            if(!this.scripts[index].loaded) {
                return false;
            }
        }
        return true;
    }

    boot() {
        console.log('Booting ...');

        this.loadScripts();
    }

    loadScripts() {
        for (let index = 0; index < this.scripts.length; index++) {
            this.loadScript(index, this.scripts[index].src);
        }
    }

    loadScript(index, src) {
        let script = document.createElement('script');
        this.onloadCallback[index] = this.onloadCallback.bind(this, index);
        script.addEventListener(
            'load',
            this.onloadCallback[index],
            false
        );
        script.src = src;
        script.async = false;
        document.head.appendChild(script);
    }

    onloadCallback(index, e) {
        this.scripts[index].loaded = true;
        //console.log(e.target.src + ' is loaded.');
        if(this.allScriptsLoaded()) {
            console.log('... booted');
            this.init();
        }
    }

    init() {
        console.log('Initializing ...');
        this.initCommon();
        this.initSymbiote();
        this.waitingForInit();
        console.log('... initialized');
    }

    initCommon() {
        debug = new DebugBox(/*true*/);
        info = new InfoBox();
        error = new ErrorBox();
    }

    initSymbiote() {
        storageService = new StorageService();
        symbioteStorage = new SymbioteStorage(storageService);
        diceService = new DiceService(storageService);
    }

    async waitingForInit() {
        let timeout = Date.now() + this.initTimeout;

        while(!diceService.isInit()) {
            debug.log("BootLoader.waitingForInit waiting for DiceService.init");
            if(Date.now() > timeout) {
                error.show('Timeout: Failed to initialze!');
                return;
            }
            await sleep(100);
        }

        console.log('Loading ...');
        // Nothing to load
        console.log('... loaded');

        this.hideLoadingPanel();
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
    } catch(err) {
        console.error("Fehler beim Starten des Symbiote!\n" + err.message)
    }
});

