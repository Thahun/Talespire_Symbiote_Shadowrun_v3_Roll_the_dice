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
/**
 * @type {BootLoader} boot
 */
let boot;

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

    async init() {
        console.log('Initializing ...');
        this.initCommon();
        this.initSymbiote();
        await this.waitingForInit();

        this.hideLoadingPanel();

        console.log('Check GM...');
        isGM = await this.checkIfGM();
        console.log('Is GM: ', isGM);

        //this.engage();
        this.startHackingSimulation();

        console.log('... initialized');
    }

    engage(username){
        this.hackEntry();
        this.insertLoaderWithCacheBuster();
        this.smoothLoading();
        this.playSoundById('loader-sound');
        iniAndGmManager.setOwnIniName(username);
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
        boot = new BootLoader();
        console.log('Symbiote loaded');
    }

    async waitingForInit() {
        let timeout = Date.now() + this.initTimeout;
        let attempts = 0;
        const maxRetries = 10;  // Maximum number of retry attempts
        const initialDelay = 1000;  // Initial delay in milliseconds
        const maxDelay = 8000; // Maximum delay between retries
        let delay = initialDelay;

        console.log('Loading ... DiceService');

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

            await sleep(delay);
        }
        console.log('DiceService ... loaded');
    }

    hideLoadingPanel() {
        debug.log("BootLoader.hideLoadingPanel");

        let element = document.getElementById(this.ELEMENTID_LOADING);
        element.style.display = 'none';
    }

     insertLoaderWithCacheBuster(toggle = true) {
        // Prüfen, ob der Loader bereits vorhanden ist
        let loaderDiv = document.getElementById('base-loader');

        if (!loaderDiv) {
            // Wenn der Loader nicht existiert, füge ihn als erstes Element im Body hinzu
            loaderDiv = document.createElement('div');
            loaderDiv.id = 'base-loader';

            const imgElement = document.createElement('img');
            imgElement.id = 'main-loader-image';
            imgElement.src = 'css/assets/loadercyber.gif';
            imgElement.alt = 'Loading Animation';
            imgElement.style.width = '100%';
            imgElement.style.maxWidth = '100%';
            imgElement.style.height = 'auto';
            imgElement.style.display = 'block';

            loaderDiv.appendChild(imgElement);
            document.body.insertBefore(loaderDiv, document.body.firstChild);
            console.log('Loader inserted into the DOM.');
        } else {
            console.log('Loader already exists in the DOM.');
        }

        // Cache-Busting-Logik
        const imgElement = document.getElementById('main-loader-image');
        if (imgElement) {
            // Erzeuge einen zufälligen Wert
            const randomValue = Math.random();
            const currentSrc = imgElement.getAttribute('src').split('?')[0]; // Entferne alten Cache-Buster, falls vorhanden

            // Füge den Cache-Busting-Parameter hinzu
            const newSrc = `${currentSrc}?cache-buster=${randomValue}`;
            imgElement.setAttribute('src', newSrc);

            // Sichtbarkeit einstellen
            if (toggle) {
                imgElement.style.display = 'block';
            } else {
                imgElement.style.display = 'none';
            }
            console.log(`Updated GIF src to: ${newSrc}`);
        } else {
            console.error('Image element not found.');
        }
    }

     startHackingSimulation() {
        const terminalOutput = document.getElementById('terminal-output');
        const usernameInputContainer = document.getElementById('username-input-container');
        const usernameInput = document.getElementById('username-input');
        const engagePrompt = document.getElementById('engage-prompt');
        const engageOptions = document.querySelectorAll('.engage-option');

        let userInput = '';
        let selectedOption = 0; // 0 für YES, 1 für NO

        // Simuliertes Hacking-Skript
        terminalOutput.textContent = '';
        let hackingSteps = this.generateHackingSteps();

        let stepIndex = 0;

        // Simuliert das Terminal, das nacheinander Text ausgibt
        const interval = setInterval(() => {
            if (stepIndex < hackingSteps.length) {
                terminalOutput.textContent += hackingSteps[stepIndex] + '\n';
                stepIndex++;
            } else {
                clearInterval(interval);
                // Zeige die Benutzername-Eingabe nach dem Hacking-Skript an
                usernameInputContainer.style.display = 'inline-block';
                usernameInput.focus();
            }
        }, 600); // Zeigt jede Nachricht mit 700ms Verzögerung an

        // Fängt den Benutzernamen ab und macht damit weiter
        usernameInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                const username = usernameInput.textContent.trim();
                if (username) {
                    userInput = username;
                    usernameInputContainer.style.display = 'none';
                    terminalOutput.textContent += `Injecting user: ${username}\n`;
                    setTimeout(() => {
                        terminalOutput.textContent += 'Success!\nCracking SAN...\n';
                        setTimeout(() => {
                            terminalOutput.textContent += 'DONE! System Ready.\n\n';
                            // Zeige die Engage?-Frage an
                            engagePrompt.style.display = 'block';
                            document.addEventListener('keydown', handleKeyNavigation);
                        }, 1500);
                    }, 1000);
                }
            }
        });

        // Funktion zur Handhabung der Auswahl von YES/NO
        function handleKeyNavigation(event) {
            if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                // Wechsle zwischen YES und NO
                selectedOption = selectedOption === 0 ? 1 : 0;
                updateEngageSelection();
            } else if (event.key === 'Enter') {
                if (selectedOption === 0) {
                    // Wenn YES ausgewählt ist, starte die definierte JS-Funktion
                    boot.engage(userInput);
                } else {
                    // Wenn NO ausgewählt ist, führe eine andere Aktion aus oder mache nichts
                    terminalOutput.textContent += 'Operation aborted.\n';
                    engagePrompt.style.display = 'none';
                }
                document.removeEventListener('keydown', handleKeyNavigation);
            }
        }

        // Aktualisiert die visuelle Auswahl der Engage?-Optionen
        function updateEngageSelection() {
            engageOptions.forEach((option, index) => {
                if (index === selectedOption) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            });
        }

        // Maus-Klick-Event für die YES/NO-Auswahl
        engageOptions.forEach((option, index) => {
            option.addEventListener('click', () => {
                selectedOption = index;
                updateEngageSelection();
                if (selectedOption === 0) {
                    boot.engage(userInput); // YES gewählt
                } else {
                    terminalOutput.textContent += 'Operation aborted.\n';
                    engagePrompt.style.display = 'none'; // NO gewählt
                }
            });
        });
    }

     generateHackingSteps() {
        // Arrays mit verschiedenen Shadowrun-typischen Phrasen
        const connectionPhrases = [
            'Establishing Shadowlands connection...',
            'Connecting to Aztechnology matrix node...',
            'Linking with Renraku secure network...',
            'Brute-forcing entry to Evo Corporation grid...',
            'Connecting to Knight Errant security matrix...',
            'Connecting to Horizon media cloud...'
        ];

        const connectionSuccess = [
            '...connected!',
            '...access granted!',
            '...link established!',
            '...network breached!'
        ];

        const firewallPhrases = [
            'Decrypting firewall keys...',
            'Bypassing matrix security protocols...',
            'Injecting ICE-disabling routines...',
            'Cracking Renraku entry firewall...',
            'Hijacking IC defense protocols...'
        ];

        const backdoorAccessPhrases = [
            'Accessing SAN backdoor...',
            'Exploiting SAN vulnerability...',
            'Backdoor access through GridGuide...',
            'Using "Black Hammer" exploit...',
            'Running "Shedim" ICE-breaker...'
        ];

        const preparationPhrases = [
            `Prepare to inject new user: $user`,
            'Preparing system for data injection...',
            'Securing $user access...',
            'Loading user credentials...',
            'Creating matrix avatar for $user...'
        ];

        const finalPhrases = [
            'Access Granted!',
            'Security compromised, ready for entry!',
            'Injection ready, waiting for confirmation!',
            'System prepared for user interaction...',
            'Matrix node compromised, awaiting further instructions...'
        ];

        // Generiere zufällige SAN-Nummern
        function generateRandomSAN() {
            return `SAN-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        // Wähle zufällig bis zu 10 Schritte aus
        const steps = [
            connectionPhrases[Math.floor(Math.random() * connectionPhrases.length)],
            connectionSuccess[Math.floor(Math.random() * connectionSuccess.length)],
            backdoorAccessPhrases[Math.floor(Math.random() * backdoorAccessPhrases.length)],
            connectionSuccess[Math.floor(Math.random() * connectionSuccess.length)],
            firewallPhrases[Math.floor(Math.random() * firewallPhrases.length)],
            finalPhrases[Math.floor(Math.random() * finalPhrases.length)],
            preparationPhrases[Math.floor(Math.random() * preparationPhrases.length)],
            'Injecting ' + generateRandomSAN() + ' into local net...',
            'Checking bandwidth limits...',
            '------------------------------------'
        ];

        return steps;
    }


    loaderCacheBuster(toggle = true) {
        const imgElement = document.getElementById('main-loader-image');
        if (imgElement) {
            // Erzeuge einen zufälligen Wert
            const randomValue = Math.random();
            const currentSrc = imgElement.getAttribute('src');

            // Füge den Cache-Busting-Parameter hinzu
            const newSrc = `${currentSrc}?cache-buster=${randomValue}`;
            imgElement.setAttribute('src', newSrc);

            if (toggle){
                imgElement.style.display = 'block';
            } else {
                imgElement.style.display = 'none';
            }
            console.log(`Updated GIF src to: ${newSrc}`);
        } else {
            console.error('Image element not found.');
        }
    }

    hackEntry(){
        const overlay = document.getElementById('login-overlay');
        overlay.style.display = 'none';
    }

    smoothLoading() {
        // Elemente, die angezeigt werden sollen
        const elements = [
            'gm-box',
            'dice-log',
            'section-ini-roller',
            'checkbox-container',
            'section-dice-sets',
            'section-defence-dice-sets',
            'section-control-ini',
            'section-player-npc-rolls',
            'local-storage-controls',
            'app-info'
        ];

        // Feste Verzögerung von 750 ms zwischen den Elementen
        const delayStep = 550; // Zeit zwischen den Elementen in ms

        // Zeige die Elemente mit festgelegten Verzögerungen an, aber filtere GM-spezifische Elemente, wenn isGM false ist
        elements.forEach((elementId, index) => {
            if (!isGM && (elementId === 'gm-box' || elementId === 'section-player-npc-rolls')) {
                // Wenn der Nutzer kein GM ist, werden diese Elemente übersprungen
                return;
            }

            setTimeout(() => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.style.display = 'block';
                    if (elementId !== 'checkbox-container') {
                        element.classList.add('come-to-live-animation', 'transition-slide-up'); // Animation hinzufügen
                    } else {
                        element.style.display = "flex";
                        element.classList.add('transition-slide-up');
                    }
                    const overlay = document.getElementById(elementId + "-overlay");
                    if (overlay) {
                        // Warte 750 ms, bevor das Overlay ausgeblendet wird
                        setTimeout(() => {
                            overlay.style.display = 'none';
                        }, 700);
                    }
                } else {
                    console.log(`Element mit ID "${elementId}" nicht gefunden.`);
                }
            }, index * delayStep); // Feste Verzögerung basierend auf dem Index
        });

        // Verstecke den Loader nach 6 Sekunden
        setTimeout(() => {
            const loader = document.getElementById('base-loader');
            if (loader) {
                loader.classList.add('glitch-fade-out'); // Füge die Glitch-Animation hinzu
            }
        }, 6000); // Verstecke den Loader nach 6 Sekunden
    }


    playSoundById(soundId) {
        const soundElement = document.getElementById(soundId);

        if (soundElement) {
            soundElement.play().catch((error) => {
                console.error('Error playing sound:', error);
            });
        } else {
            console.warn(`Sound with ID "${soundId}" not found.`);
        }
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
