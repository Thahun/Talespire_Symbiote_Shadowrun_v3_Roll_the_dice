/**
 * DiceService class handles the dice rolling and result evaluation logic.
 * It manages dice sets, dice tracking, and various rolling modes including GM mode.
 */
class DiceService extends AbstractSheetHelper {
    initState = false;  // Indicates if the service is initialized
    gmMode = false;  // GM mode flag
    noUnneededExplode = true;  // Prevent rerolling after the threshold is already solved
    highestRoll = 0;  // Keeps track of the current highest roll to be able to stop rerolling if MW is reached
    openThrow = false;
    openThrowResult = 0;

    /**
     * @type {Any}
     */
    version;

    sectionDiceSets;  // Reference to the section for dice sets
    sectionDefenceDiceSets;  // Reference to the section for defence dice sets
    diceTracker;  // Instance of DiceTracker to track dice rolls

    ELEMENTID_GM_MODE = 'gm-mode';
    ELEMENTID_APP_NAME = 'app-name';
    ELEMENTID_APP_VERSION = 'app-version-number';
    ELEMENTID_APP_AUTHORS = 'app-author-names';

    /**
     * Constructor initializes the DiceService with a storage instance.
     * @param {StorageService} storage
     */
    constructor(storage) {
        debug.log("DiceService class loaded");
        super();

        this.storage = storage;
        this.manifestHelper = new ManifestHelper(this);
        this.sectionDiceSets = new SheetSectionDiceSets(this);
        this.sectionDefenceDiceSets = new SheetSectionDiceSets(this, true);
        this.diceTracker = new DiceTracker();

        this.init();
    }

    /**
     * Initializes the DiceService, waits for symbioteStorage to be ready.
     */
    async init() {
        debug.log("DiceService.init()");

        let retriesDelaySeconds = 1;
        let retriesMax = 10;
        let retries = retriesMax;
        while (retries > 0 && !symbioteStorage.isInit()) {
            debug.log("Character.init waiting for SymbioteStorage.init");
            retries--;
            await sleep(retriesDelaySeconds * 100);
        }
        if (!symbioteStorage.isInit()) {
            throw new SyntaxError("Failed to init SymbioteStorage within " + (retriesMax * retriesDelaySeconds) + " seconds!");
        }

        this.version = this.manifestHelper.fetchKey(ManifestHelper.KEY_VERSION);
        this.showAppInfo();

        this.loadDiceSets();
        this.loadThrowData();  // Load throw data on initialization

        this.initState = true;
        console.log('DiceService initialized!');

    }

    loadThrowData() {
        debug.log("DiceService.loadThrowData");

        let storageData = this.storage.getStorageAsObject();

        if (storageData instanceof DiceSetsDTO) {
            this.throwData = storageData.throwData || [];
            this.renderThrowData();  // Render the loaded throw data in the UI
        }
    }

     activateGlitchEffect() {
        // Check if the glitch effect is already active
        if (document.getElementById('glitch-background') || document.getElementById('glitch-foreground')) {
            return; // Exit the function if the effect is already active
        }

        // Create and add the glitch background
        const glitchBackground = document.createElement('div');
        glitchBackground.id = 'glitch-background';
        glitchBackground.className = 'glitch-background';
        document.body.appendChild(glitchBackground);

        // Create and add the glitch foreground
        const glitchForeground = document.createElement('div');
        glitchForeground.id = 'glitch-foreground';
        glitchForeground.className = 'glitch-foreground';

        // Add multiple glitching icons with random sizes and positions
        for (let i = 0; i < 5; i++) {
            const glitchIcon = document.createElement('div');
            glitchIcon.className = 'glitch-icon';
            glitchIcon.style.width = `${Math.random() * 100 + 50}px`; // Random width between 50px and 150px
            glitchIcon.style.height = glitchIcon.style.width; // Make it a square
            glitchIcon.style.top = `${Math.random() * 90}vh`; // Random position in viewport height
            glitchIcon.style.left = `${Math.random() * 90}vw`; // Random position in viewport width
            glitchForeground.appendChild(glitchIcon);
        }

        document.body.appendChild(glitchForeground);
    }

    toggleGlitchOverlayBoxes(show = true){
        const elements = [
            'section-ini-roller',
            'section-dice-sets',
            'section-defence-dice-sets',
        ];

        elements.forEach((elementId, index) => {
            const overlay = document.getElementById(elementId + "-overlay");
            if (show) {
                console.log("overlay",overlay);
                overlay.style.display = 'block';
            } else {
                overlay.style.display = 'none';
            }
        });
    }

     toggleGlitchSectionVisibility(show = null) {
        const glitchSection = document.getElementById('glitch-section');

        if (show === true || (show === null && glitchSection.classList.contains('glitch-hide'))) {
            // Show the section with glitch effect
            glitchSection.style.display = 'block';
            glitchSection.classList.remove('glitch-hide');
            glitchSection.classList.add('glitch-show');
        } else if (show === false || (show === null && glitchSection.classList.contains('glitch-show'))) {
            // Hide the section with glitch effect
            glitchSection.classList.remove('glitch-show');
            glitchSection.classList.add('glitch-hide');

            // Set the section to hidden after the animation completes
            setTimeout(() => {
                glitchSection.style.display = 'none';
            }, 500); // Duration of glitch-out animation
        }
    }

    deactivateGlitchEffect() {
        // Remove the glitch background
        const glitchBackground = document.getElementById('glitch-background');
        if (glitchBackground) {
            glitchBackground.remove();
        }

        // Remove the glitch foreground
        const glitchForeground = document.getElementById('glitch-foreground');
        if (glitchForeground) {
            glitchForeground.remove();
        }
    }


    /**
     * Checks if the service is initialized.
     * @returns {Boolean}
     */
    isInit() {
        return this.initState;
    }

    /**
     * Toggles GM mode.
     * @param {Boolean} value
     */
    toggleGMMode(value) {
        this.gmMode = value;
    }

    /**
     * Toggles the no unneeded explode mode.
     * @param {Boolean} value
     */
    toggleNoUnneededExplode(value) {
        this.noUnneededExplode = value;
    }

    /**
     * Displays application information.
     */
    showAppInfo() {
        debug.log("DiceService.showAppInfo");

        let elementName = this.getElementById(this.ELEMENTID_APP_NAME);
        elementName.innerText = this.manifestHelper.fetchKey(ManifestHelper.KEY_NAME);
        let elementVersion = this.getElementById(this.ELEMENTID_APP_VERSION);
        elementVersion.innerText = this.version;
        let elementAuthors = this.getElementById(this.ELEMENTID_APP_AUTHORS);
        let authors = this.manifestHelper.fetchKey(ManifestHelper.KEY_AUTHORS);
        elementAuthors.innerText = authors.join(', ');
    }

    /**
     * Loads dice sets from storage.
     */
    loadDiceSets() {
        debug.log("DiceService.loadDiceSets");
        console.log('Initializing DiceSets ...');

        let diceSets = this.storage.getStorageAsObject();

        if (diceSets instanceof DiceSetsDTO) {
            this.sectionDiceSets.setData(diceSets);
            this.sectionDefenceDiceSets.setData(diceSets);
        }
        console.log('DiceSets loaded');
    }

    /**
     * Persists dice sets to storage.
     */
    persistDiceSets() {
        debug.log("DiceService.persistDiceSets");
        let diceSets = this.sectionDiceSets.getData();
        let defenceDiceSets = this.sectionDefenceDiceSets.getData();

        diceSets.defenceDiceSetList = defenceDiceSets.defenceDiceSetList;

        this.storage.setStorageAsObject(diceSets);
        symbioteStorage.persist();
    }

    /**
     * Prevents setting a numeric input to a value lower than 0.
     * Must be placed first in "onchange" event.
     *
     * @param {HTMLElement} element
     */
    static preventNegativeValue(element) {
        debug.log("DiceService.preventNegativeValue");

        if (element.value === '' || Number(element.value) < 0) {
            element.value = 0;
        }
    }

    parseDiceString(diceString) {
        const splitParts = diceString.split('+');

        if (splitParts.length === 2) {
            const Xd6 = splitParts[0];
            const Y = splitParts[1];

            if ((Xd6.endsWith('d6') || Xd6.endsWith('D6') )&& !isNaN(Xd6.slice(0, -2)) && !isNaN(Y)) {
                //console.log("good format: ", diceString);
                return true;

            } else {
                console.error("Invalid format. Expected format is Xd6+Y with numeric values.");
                return false;
            }
        } else {
            console.error("Invalid format. Expected format is Xd6+Y.");
            return false;
        }
    }

    async rollInitiativeDices(){
        const name = iniAndGmManager.ownInitiativeName.value;
        let diceString = iniAndGmManager.ownInitiativeValue.value;

        if(!this.parseDiceString(diceString) || name.length === 0){
            info.show("Fehler im Initiative String oder Namen!");
            iniAndGmManager.toggleRedBorderIfEmpty(true,'ini-name-input', 'ini-value-input');
        } else {
            iniAndGmManager.toggleRedBorderIfEmpty(false,'ini-name-input', 'ini-value-input');
            iniAndGmManager.personalInitiativeData = [name,diceString];
            iniAndGmManager.persistInitiativeData();
            await TS.dice.putDiceInTray([{ name: 'Initiative: "' + name + '"', roll: "!" + diceString }], true);
        }
    }

    toggleRedBorderIfEmptyDiv(toggle, ...elementIds) {
        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                const inputElement = element.querySelector('input');
                if (inputElement) {
                    if (toggle) {
                        inputElement.classList.add('red-border');
                    } else {
                        inputElement.classList.remove('red-border');
                    }
                } else {
                    console.warn(`No <input> found in element with id ${id}`);
                }
            } else {
                console.warn(`Element with id ${id} not found`);
            }
        });
    }

     toggleGlitchLoader(diceSetIndex, shouldAddClass = true) {
        const id = "dice-sets-cell-icon-dice[" + diceSetIndex + "]";
        const parentElement = document.getElementById(id);

        if (!parentElement) {
            console.error(`Element with ID ${id} not found.`);
            return;
        }

        const childElement = parentElement.querySelector('i'); // Da es nur ein Child-Element gibt und es ein <i>-Tag ist

        if (!childElement) {
            console.error(`Child <i> element not found inside the element with ID ${id}.`);
            return;
        }

        if (shouldAddClass) {
            if (!childElement.classList.contains('glitch-loader-icon')) {
                childElement.classList.add('glitch-loader-icon');
                childElement.classList.remove('ts-icon-d6');
                childElement.classList.remove('icon-dice');
            }
        } else {
            if (childElement.classList.contains('glitch-loader-icon')) {
                childElement.classList.remove('glitch-loader-icon');
                childElement.classList.add('ts-icon-d6');
                childElement.classList.add('icon-dice');
            }
        }
    }


    async rollGlitchDice(){
        let diceString = '1d6';
        await TS.dice.putDiceInTray([{ name: 'GlitchRollCode', roll: "!" + diceString }], true);
    }

    /**
     * Rolls dices for the specified dice set index.
     * @param {Number} diceSetIndex
     */
    async rollDices(diceSetIndex) {
        debug.log("DiceService.rollDices");

        let diceSet = this.sectionDiceSets.sectionDiceSetsDiceSet.getData(diceSetIndex);
        this.toggleRedBorderIfEmptyDiv(false, 'dice-sets-cell-amount[' + diceSetIndex + ']');
        this.toggleRedBorderIfEmptyDiv(false, 'dice-sets-cell-threshold[' + diceSetIndex + ']');

        if (diceSet.amount <= 0) {
            info.show("Can't roll 0 dices!");
            this.toggleRedBorderIfEmptyDiv(true, 'dice-sets-cell-amount[' + diceSetIndex + ']');
            return;
        }
        if (diceSet.threshold <= 0 && diceSet.dmg !== '-') {
            info.show("Any dice roll would be above 0!");
            this.toggleRedBorderIfEmptyDiv(true, 'dice-sets-cell-threshold[' + diceSetIndex + ']');
            return;
        }
        //startet Offenen Wurf
        if (diceSet.threshold == 0 && diceSet.dmg == '-') {
            this.openThrow = true;
        }

        let diceString = diceSet.amount + 'd6';
        let rollId = await TS.dice.putDiceInTray([{ name: '"' + diceSet.name + '"', roll: "!" + diceString }], true);

        if (rollId) {
            this.diceTracker.addDiceTrack(rollId, diceSetIndex, false);  // Set isDefence to false
        }
    }

    /**
     * Rolls defence dices for the specified dice set index.
     * @param {Number} diceSetIndex
     */
    async rollDefenceDices(diceSetIndex) {
        debug.log("DiceService.rollDefenceDices");

        let diceSet = this.sectionDefenceDiceSets.sectionDefenceDiceSetsDiceSet.getData(diceSetIndex);
        this.toggleRedBorderIfEmptyDiv(false, 'defence-dice-sets-cell-threshold[' + diceSetIndex + ']');
        this.toggleRedBorderIfEmptyDiv(false, 'defence-dice-sets-cell-amount[' + diceSetIndex + ']');

        if (diceSet.amount <= 0) {
            info.show("Can't roll 0 dices!");
            this.toggleRedBorderIfEmptyDiv(true, 'defence-dice-sets-cell-amount[' + diceSetIndex + ']');
            return;
        }
        if (diceSet.threshold <= 0) {
            info.show("Any dice roll would be above 0!");
            this.toggleRedBorderIfEmptyDiv(true, 'defence-dice-sets-cell-threshold[' + diceSetIndex + ']');
            return;
        }

        let diceString = diceSet.amount + 'd6';
        let rollId = await TS.dice.putDiceInTray([{ name: '"' + diceSet.name + '"', roll: "!" + diceString }], true);

        if (rollId) {
            this.diceTracker.addDiceTrack(rollId, diceSetIndex, true);  // Set isDefence to true
        }
    }

    /**
     * Repeats the last roll, optionally adding previous successes.
     * @param {Number} previousSuccesses
     */
    async repeatLastRoll(previousSuccesses = 0) {
        const lastDiceTrack = this.diceTracker.getLastDiceTrack();

        if (!lastDiceTrack) {
            info.show("Kein vorheriger Wurf zum Wiederholen gefunden.");
            return;
        }

        let diceSet = lastDiceTrack.isDefence
            ? this.sectionDefenceDiceSets.sectionDefenceDiceSetsDiceSet.getData(lastDiceTrack.diceSetIndex)
            : this.sectionDiceSets.sectionDiceSetsDiceSet.getData(lastDiceTrack.diceSetIndex);

        if (diceSet.amount <= lastDiceTrack.successes) {
            info.show("Keine Würfel übrig, um erneut zu würfeln.");
            return;
        }

        let newDiceCount = diceSet.amount - lastDiceTrack.successes;
        let diceString = newDiceCount + 'd6';

        let rollId = await TS.dice.putDiceInTray([{ name: '"' + diceSet.name + '"', roll: "!" + diceString }], true);

        if (rollId) {
            this.diceTracker.addDiceTrack(rollId, lastDiceTrack.diceSetIndex, lastDiceTrack.isDefence);
            this.diceTracker.addKarmaReroll(rollId);
        }
    }

    createRollResultsArray(event) {
        if (event && event.kind === "rollResults" && event.payload && event.payload.resultsGroups) {
            const resultsGroups = event.payload.resultsGroups;
            let rollResultsArray = [];

            resultsGroups.forEach(group => {
                if (group.result && group.result.operands) {
                    group.result.operands.forEach(operand => {
                        if (operand.kind === "d6" && Array.isArray(operand.results)) {
                            let step = 1;
                            operand.results.forEach(result => {
                                let rollResultsGroup = {
                                    name: group.name + ' Dice ' + step,
                                    result: {
                                        kind: 'd6',
                                        results: [result]
                                    }
                                };
                                rollResultsArray.push(rollResultsGroup);
                                step++;
                            });
                        }
                    });
                }
            });

            return rollResultsArray;
        } else {
            console.error("Invalid event structure:", event);
            return [];
        }
    }

    isGlitch(data){
        if (
            data &&
            data.kind === "rollResults" &&
            data.payload &&
            Array.isArray(data.payload.resultsGroups)
        ) {
            const glitchGroups = data.payload.resultsGroups.filter(group => group.name === "GlitchRollCode");
            return glitchGroups.length === 1;
        }
        return false;
    }

    async evaluateGlitch(event) {
        const rollResults = event.payload?.resultsGroups;
        let glitchresult = 0;
        let message = '';

        if (!Array.isArray(rollResults)) {
            return null; // Return null if rollResults is not an array or doesn't exist
        }

        // Find the group with the name "Glitch"
        const glitchGroup = rollResults.find(group => group.name === "GlitchRollCode");

        if (glitchGroup && glitchGroup.result && Array.isArray(glitchGroup.result.results)) {
            glitchresult = glitchGroup.result.results[0]; // Return the results array
            console.log(glitchresult);
        }else{
            console.error("Invalid event structure:", event);
        }

        let result = [{
            name: "Glitch",
            result: {
                value: glitchresult
                    }
             }];
        TS.dice.sendDiceResult(result);

        if(glitchresult == 1){
             message = 'G̸̛̔̾̏̓̔̓L̶̛̄̀̇̾̓̾̔Ǐ̵̄͛̔T̷̔͛͌̆̚C̵̽͌̚H̴̓̓̏̽̎̋̈́̕̚I̴̅̔N̸̏̐̃͗̅͌̕͝͝G̶̔̐͑̌̓̾͝';
             this.toggleGlitchSectionVisibility(false);
        }else{
             message = `Had no glitch => ${glitchresult}`;
             this.toggleGlitchSectionVisibility(false);
        }
        this.toggleGlitchOverlayBoxes(false);

        this.reportDiceLogMessage(message); //send dicelog to all
        TS.chat.send(message, 'board');

    }

    /**
     * Evaluates the initiative roll results.
     * @param event
     */
    async evaluateInitiativeRoll(event) {
        //console.log(event);
        const rollResults = this.calculateTotalInitiativeResult(event);
        const name = this.getInitiativeName(event);
        //console.log("result: ", rollResults, name);

        const [total, numberOfDice, value] = rollResults;
        let message = `${name} Roll: ${numberOfDice}D6+${value} => Total: ${total}`;

        let rollResultsGroups = this.createRollResultsArray(event);
        //console.log("groups", rollResultsGroups);

        TS.dice.sendDiceResult(rollResultsGroups);
        TS.chat.send(message, 'board');
        //send log to all
        this.reportDiceLogMessage(message); //send dicelog to all
        ////console.log("Log message: ", message);


        //send result to GM
        const OwnIni = {
            name: name,
            result: total
        }
        iniAndGmManager.sendOwnInitiativeSyncMessage([name,total],['gms']);
    }

    getInitiativeName(event) {
        if (event && event.kind === "rollResults" && event.payload && event.payload.resultsGroups) {
            const resultsGroups = event.payload.resultsGroups;

            for (const group of resultsGroups) {
                if (group.name && group.name.startsWith("Initiative:")) {
                    return group.name; // Return the name
                }
            }
        }
        return null; // Return null if the name is not found
    }

    calculateTotalInitiativeResult(event) {
        if (event && event.kind === "rollResults" && event.payload && event.payload.resultsGroups) {
            let total = 0;
            let numberOfDice = 0;
            let value = 0;
            const resultsGroups = event.payload.resultsGroups;

            resultsGroups.forEach(group => {
                if (group.result && group.result.operands) {
                    group.result.operands.forEach(operand => {
                        if (operand.kind === "d6" && Array.isArray(operand.results)) {
                            numberOfDice += operand.results.length;
                            total += operand.results.reduce((sum, value) => sum + value, 0);
                        } else if (typeof operand.value === "number") {
                            value += operand.value;
                            total += operand.value;
                        }
                    });
                }
            });

            return [total, numberOfDice, value];
        }
        return [0, 0, 0]; // Return an array with default values if the event structure is invalid
    }

    /**
     * Evaluates the roll results, if the rollId is tracked by this service.
     * @param {String} rollId
     * @param {String} clientId
     * @param {Boolean} gmOnly
     * @param {Boolean} quiet
     * @param {Array.<TS.rollResultsGroup>} resultsGroups
     */
    async evaluateRollResults(rollId, clientId, gmOnly, quiet, resultsGroups) {
        debug.log("DiceService.evaluateRollResults");

        if (!this.diceTracker.hasDiceTrack(rollId)) {
            return;
        }
        let diceTrack = this.diceTracker.getDiceTrack(rollId);
        let diceSet;

        if (diceTrack.isDefence) {
            diceSet = this.sectionDefenceDiceSets.sectionDefenceDiceSetsDiceSet.getData(diceTrack.diceSetIndex);
        } else {
            diceSet = this.sectionDiceSets.sectionDiceSetsDiceSet.getData(diceTrack.diceSetIndex);
        }

        let diceType = resultsGroups[0].result.kind;
        let diceMax = diceType.substring(1);
        let rollResults = resultsGroups[0].result.results;
        let dices = diceTrack.dices;

        let rerollAmount = 0;
        let successes = 0;
        let newDiceResults = [];

        // Calculate the highest roll from the current roll results
        this.highestRoll = Math.max(...rollResults);
        // Add up the roll
        this.openThrowResult += this.highestRoll;

        rollResults.forEach(diceValue => {
            let isMax = (diceValue == diceMax);

            // Condition for rerolling if noUnneededExplode is true and threshold is not reached
            if (isMax && (this.openThrow || (!this.noUnneededExplode || (this.noUnneededExplode && diceSet.threshold > this.highestRoll)))) {
                rerollAmount++;
            }
            if (diceValue >= diceSet.threshold) {
                successes++;
            }
            let diceResult = new DiceTrackResultDTO(diceValue, isMax);
            newDiceResults.push(diceResult);
        });

        diceTrack.successes = successes; // Update successes in dice track

        if (dices) {
            let diceIndex = 0;
            for (let i = 0; i < newDiceResults.length; i++) {
                let newDiceResult = newDiceResults[i];

                for (let j = diceIndex; j < dices.length; j++) {
                    let dice = dices[j];
                    let lastResult = dice.results.slice(-1)[0];
                    if (lastResult.isMax === false) {
                        continue;
                    }
                    dice.results.push(newDiceResult);
                    diceIndex = j++;
                    break;
                }
            }
        } else {
            dices = [];
            for (let i = 0; i < newDiceResults.length; i++) {
                dices.push(new DiceTrackResultsDTO(diceType, [newDiceResults[i]]));
            }
        }
        diceTrack.dices = dices;

        if (rerollAmount === 0) {
            this.showRollResult(diceTrack);
            return;
        }

        let isKarmaUsed = false;
        if (diceTrack.isKarmaReroll === true) {
            isKarmaUsed = true;
        }

        this.showRerollNote(diceTrack, rerollAmount);

        let newDiceString = rerollAmount + 'd6';
        let newRollId = await TS.dice.putDiceInTray([{ name: '"' + diceSet.name + '"', roll: "!" + newDiceString }], true);
        this.diceTracker.replaceDiceTrack(rollId, newRollId);
        if (isKarmaUsed) {
            this.diceTracker.addKarmaReroll(newRollId);
        }
    }

    /**
     * Displays a message indicating the number of dice that can be rerolled.
     * @param {DiceTrackDTO} diceTrack
     * @param {Number} rerollAmount
     */
    showRerollNote(diceTrack, rerollAmount) {
        debug.log("DiceService.showRerollNote");

        let diceSet = diceTrack.isDefence
            ? this.sectionDefenceDiceSets.sectionDefenceDiceSetsDiceSet.getData(diceTrack.diceSetIndex)
            : this.sectionDiceSets.sectionDiceSetsDiceSet.getData(diceTrack.diceSetIndex);

        let message = rerollAmount + ' Würfel des "' + diceSet.name + '" Wurfes ' + (rerollAmount == 1 ? 'kann' : 'können') + ' erneut gewürfelt werden.';
        if (this.gmMode) {
            TS.chat.send(message, 'gms');
        } else {
            TS.chat.send(message, 'board');
        }
    }

    /**
     * Displays the roll result and calculates the damage code if applicable.
     * @param {DiceTrackDTO} diceTrack
     */
    showRollResult(diceTrack) {
        debug.log("DiceService.showRollResult");

        let isDefence = diceTrack.isDefence || false;

        let diceSet = isDefence
            ? this.sectionDefenceDiceSets.sectionDefenceDiceSetsDiceSet.getData(diceTrack.diceSetIndex)
            : this.sectionDiceSets.sectionDiceSetsDiceSet.getData(diceTrack.diceSetIndex);

        let totalSuccesses = 0;

        let rollResultsGroups = [];
        diceTrack.dices.forEach(dice => {
            let diceResults = [];
            let sum = 0;
            dice.results.forEach(diceResult => {
                diceResults.push(diceResult.result);
                sum += diceResult.result;
            });
            if (sum >= diceSet.threshold) {
                totalSuccesses++;
            }

            let rollResultsGroup = {
                name: '',
                result: {
                    kind: dice.diceType,
                    results: diceResults
                }
            }
            rollResultsGroups.push(rollResultsGroup);
        });
        //console.log("rollresults:",rollResultsGroups);

        this.diceTracker.setSuccesses(diceTrack['rollId'], totalSuccesses);

        let totalThresholdSuccesses = 0;

        if (diceTrack.isKarmaReroll === true) {
            totalThresholdSuccesses = this.calculateTotalSuccesses(this.diceTracker);
        } else {
            totalThresholdSuccesses = totalSuccesses;
        }

        let damageCode = null;

        if (diceSet.dmg !== '-') {
            let parsedCode = diceService.parseDamageCode(diceSet.dmg);
            if (isDefence) {
                damageCode = diceService.calculateReducedDamageCode(parsedCode.damageLevel, totalThresholdSuccesses);
            } else {
                damageCode = diceService.calculateDamageCode(parsedCode.powerLevel, parsedCode.damageLevel, diceSet.bullets, totalThresholdSuccesses);
            }
        }

        let message = totalThresholdSuccesses + ' of ' + diceSet.amount + ' dice in throw "' + diceSet.name + '" ' + (totalThresholdSuccesses === 1 ? 'were' : 'were') + ' successes.';
        let dicelog = diceSet.name + ' => ' + diceSet.amount + ' dice vs MW ' + diceSet.threshold + ' : ' + totalThresholdSuccesses + ' success(es).';

        if (damageCode !== null) {
            if (isDefence) {
                if (totalThresholdSuccesses > 0) {
                    info.show(diceSet.name + ' => ' + totalThresholdSuccesses + ' success(es)  => dmg: ' + damageCode, true);
                    message += ' DMG: ' + damageCode;
                    dicelog += ' DMG ' + damageCode;
                } else {
                    info.show('No successes => Max DMG: ' + damageCode);
                    message += ' Max DMG: ' + damageCode;
                    dicelog += ' DMG ' + damageCode;
                }
            } else {
                if (totalThresholdSuccesses > 0) {
                    info.show(diceSet.name + ' => ' + totalThresholdSuccesses + ' success(es)  =>  DMG: ' + damageCode, true);
                    message += ' DMG: ' + damageCode;
                    dicelog += ' DMG ' + damageCode;
                } else {
                    info.show('No Hits => no DMG', true);
                    message += ' no DMG!';
                    dicelog += ' no DMG!' ;
                }
            }
        } else {
            if (totalThresholdSuccesses > 0) {
                if(this.openThrow){
                    message = diceSet.name + ' => ' + diceSet.amount + ' D6 => Open Throw Result: ' + this.openThrowResult ;
                    dicelog = message;
                    info.show(message , false);
                } else {
                    info.show(diceSet.name + ' => ' + diceSet.amount + ' D6: '+ totalThresholdSuccesses + ' success(es)', true);
                    dicelog = diceSet.name + ' => ' + diceSet.amount + ' dice: '+ totalThresholdSuccesses + ' success(es)';
                  }
            } else {
                info.show(diceSet.name + ' => ' + diceSet.amount + ' D6: no success(es)  ' + damageCode + ' DMG', true);
                dicelog = diceSet.name + ' => ' + diceSet.amount + ' dice: no success(es)  ' + damageCode + ' DMG';
            }
        }

        if (this.gmMode) {
            TS.chat.send(message, 'gms');
        } else {
            TS.dice.sendDiceResult(rollResultsGroups);
            TS.chat.send(message, 'board');
            //Show the Karma usage in log.
            if(diceTrack.isKarmaReroll){
                dicelog+= ' Karma used!';
            }
            this.reportDiceLogMessage(dicelog);
        }

        // Reset highest roll
        this.highestRoll = 0;
        // Reset openThrow result
        this.openThrowResult = 0;
        this.openThrow = false;
    }

    reportDiceLogMessage(message) {
        const logEntry = {
            type: "dicelog",
            log: message
        };
        let log = JSON.stringify(logEntry);
        helm.SendSyncMessage(log, ["board"]);
    }

    togglePlayerFilter() {
        const filterInput = document.getElementById('player-filter-input');
        const filterValue = filterInput.value.trim().toLowerCase();
        const logMessages = document.querySelectorAll('#throw-log .log-message');

        if (filterValue !== '') {
            logMessages.forEach(message => {
                const playerNameSpan = message.querySelector('.player-name');
                const messageContentSpan = message.querySelector('.log-content');

                const playerName = playerNameSpan ? playerNameSpan.textContent.trim().toLowerCase() : '';
                const messageContent = messageContentSpan ? messageContentSpan.textContent.trim().toLowerCase() : '';

                if (playerName.includes(filterValue) || messageContent.includes(filterValue)) {
                    message.style.display = 'block';
                } else {
                    message.style.display = 'none';
                }
            });
        } else {
            logMessages.forEach(message => {
                message.style.display = 'block';
            });
            const throwLog = document.getElementById('throw-log');
            throwLog.scrollTop = throwLog.scrollHeight;
        }
    }

    addMessageToLog(message) {
        const throwLogElement = document.getElementById('throw-log');

        // Get the current time and format it
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const timestamp = `${hours}:${minutes}:${seconds}`;

        // Create a new log entry object
        const newLogEntry = {
            time: timestamp,
            playerName: message.playerName === "modemuser" ? "Gamemaster" : message.playerName,
            log: message.log
        };

        // Add the new entry to the throwData array
        this.throwData.push(newLogEntry);

        // Ensure only the last 50 messages are kept
        if (this.throwData.length > 50) {
            this.throwData.shift(); // Remove the oldest entry
        }

        // Persist the updated throwData array
        this.persistThrowData();

        // Render the updated throwData array
        this.renderThrowData();
    }

    removeThrowLogMessage(uniqueId) {
        // Find the index of the log entry with the given unique ID (which is the time)
        const indexToRemove = this.throwData.findIndex(entry => entry.time === uniqueId);

        if (indexToRemove !== -1) {
            // Remove the entry from the throwData array
            this.throwData.splice(indexToRemove, 1);

            // Re-render the log data
            this.renderThrowData();

            // Persist the updated throwData
            this.persistThrowData();
        }
    }

    clearGlobTextarea(){
        const textArea = document.getElementById('local-storage-content');
        textArea.innerHTML = '';
    }

    saveCustomGlob() {
        // Get the content from the textarea
        const textArea = document.getElementById('local-storage-content');
        const content = textArea.value.trim();

        // Check if the content is available before proceeding
        if (!content) {
            info.show('No content to save.');
            console.error('No content to save.');
            return;
        }

        // Perform flushAll() to clear previous data
        symbioteStorage.flushAll();

        // Call persist with the new content
        symbioteStorage.persist(content);

        // Optionally, you can add some confirmation log or message here
        console.log('Custom data saved successfully.');
        info.show('Custom data saved successfully....reloading');

        // Wait for 1.5 seconds before reloading the page
        setTimeout(() => {
            location.reload();
        }, 1500); // 1500 milliseconds = 1.5 seconds
    }


    loadCustomGlob() {
        // Load the local storage data using symbioteStorage.load()
        symbioteStorage.load().then((data) => {
            // Find the div element where the loaded content will be displayed
            const contentDiv = document.getElementById('local-storage-content');
            const copyButton = document.getElementById('copy-to-clipboard');
            const saveButton = document.getElementById('save-local-storage');
            const clearButton = document.getElementById('clear-local-storage');
            const resetButton = document.getElementById('reset-local-storage-view');

            // Check if the data is available and handle it
            if (data) {
                // Display the data in the div
                contentDiv.textContent = data;
            } else {
                console.warn('No data found in local storage.');
                contentDiv.textContent = 'No data available.';
            }
            contentDiv.style.display = 'block';
            saveButton.style.display = 'inline-block';
            clearButton.style.display = 'inline-block';
            resetButton.style.display = 'inline-block';
            copyButton.style.display = 'inline-block';
        }).catch((error) => {
            console.error('Error loading local storage:', error);
        });
    }

    copyToClipboard(){
        const contentDiv = document.getElementById('local-storage-content');

        let data = contentDiv.textContent;

        // Copy the data to the clipboard
        navigator.clipboard.writeText(data).then(() => {
            info.show('Data copied to clipboard successfully.');
        }).catch((err) => {
            error.show('Failed to copy to clipboard');
            console.error('Failed to copy to clipboard:', err);
        });
    }

    resetStorageSaveArea(){
        const contentDiv = document.getElementById('local-storage-content');
        const copyButton = document.getElementById('copy-to-clipboard');
        const saveButton = document.getElementById('save-local-storage');
        const clearButton = document.getElementById('clear-local-storage');
        const resetButton = document.getElementById('reset-local-storage-view');

        contentDiv.style.display = 'none';
        saveButton.style.display = 'none';
        clearButton.style.display = 'none';
        resetButton.style.display = 'none';
        copyButton.style.display = 'none';
    }

    persistThrowData() {
        debug.log("DiceService.persistThrowData");

        let storageData = this.storage.getStorageAsObject();

        if (storageData instanceof DiceSetsDTO) {
            storageData.throwData = this.throwData;
            this.storage.setStorageAsObject(storageData);
            symbioteStorage.persist();
        }
    }

    renderThrowData() {
        const throwLogElement = document.getElementById('throw-log');
        throwLogElement.innerHTML = ''; // Clear the log

        this.throwData.forEach(entry => {
            // Generate a unique ID based on the timestamp and a random value
            const uniqueId = entry.time;

            // Recreate each log entry in the UI
            const newMessageDiv = document.createElement('div');
            newMessageDiv.className = 'log-message';
            newMessageDiv.id = uniqueId; // Set the unique ID

            // Create the remove icon with click and hover effects
            const removeIcon = document.createElement('span');
            removeIcon.textContent = " ✖ ";
            removeIcon.style.cursor = 'pointer';
            removeIcon.style.color = '#737373'; // Initial color
            removeIcon.onmouseover = function() {
                this.style.color = 'red'; // Change color on hover
            };
            removeIcon.onmouseout = function() {
                this.style.color = '#737373'; // Revert color when not hovering
            };
            removeIcon.onclick = () => this.removeThrowLogMessage(uniqueId); // Attach the click event

            // Create the timestamp span
            const timestampSpan = document.createElement('span');
            timestampSpan.className = 'timestamp';
            timestampSpan.textContent = `[${entry.time}] `;

            // Create the player name span
            const playerNameSpan = document.createElement('span');
            playerNameSpan.className = 'player-name';
            const truncatedPlayerName = entry.playerName.substring(0, 10);
            playerNameSpan.textContent = truncatedPlayerName + ": ";
            playerNameSpan.style.color = this.getColorFromString(entry.playerName);

            // Create the log message span
            const logMessageSpan = document.createElement('span');
            logMessageSpan.className = 'log-content';
            logMessageSpan.textContent = entry.log;

            // Append all elements to the message div
            newMessageDiv.appendChild(removeIcon);
            newMessageDiv.appendChild(timestampSpan);
            newMessageDiv.appendChild(playerNameSpan);
            newMessageDiv.appendChild(logMessageSpan);

            // Append the message div to the log element
            throwLogElement.appendChild(newMessageDiv);
        });

        // Scroll to the bottom of the log to show the latest messages
        throwLogElement.scrollTop = throwLogElement.scrollHeight;
    }


    getColorFromString(str) {
        if (str.length < 3) {
            console.error("String must have at least 3 characters.");
            return "#bc0d0d"; // Default color if the string is too short
        }

        // Get the first three characters of the string
        const key = str.substring(0, 3);

        // Generate a hash from the characters
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = key.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Convert the hash to a hexadecimal color code
        let color = "#";
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }

        // Convert the color to RGB components
        let r = parseInt(color.substring(1, 3), 16);
        let g = parseInt(color.substring(3, 5), 16);
        let b = parseInt(color.substring(5, 7), 16);

        // Adjust luminance to ensure good contrast on dark backgrounds
        // This will lighten the color if it's too dark
        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

        if (luminance < 128) { // If color is too dark
            r = Math.min(255, r + 60);
            g = Math.min(255, g + 60);
            b = Math.min(255, b + 60);
        }

        // Convert back to hex format
        const adjustedColor = `#${('00' + r.toString(16)).substr(-2)}${('00' + g.toString(16)).substr(-2)}${('00' + b.toString(16)).substr(-2)}`;

        return adjustedColor;
    }


    /**
     * Removes a rollId from tracking, if it's tracked by this service.
     * @param {String} rollId
     */
    removeRollId(rollId) {
        debug.log("DiceService.removeRollId");

        if (this.diceTracker.hasDiceTrack(rollId)) {
            this.diceTracker.removeDiceTrack(rollId);
        }
    }

    /**
     * Calculates the reduced damage code based on the dice result.
     * @param {String} damageLevel
     * @param {Number} diceResult
     * @returns {String} Reduced damage code
     */
    calculateReducedDamageCode(damageLevel, diceResult) {
        const damageLevels = ['L', 'M', 'S', 'T'];
        let decreaseSteps = Math.floor(diceResult / 2);
        let damageIndex = damageLevels.indexOf(damageLevel);

        if (damageIndex === -1) {
            if (damageLevel.startsWith('T+')) {
                let additionalLevels = parseInt(damageLevel.split('+')[1], 10);
                additionalLevels -= decreaseSteps;
                if (additionalLevels < 0) {
                    damageIndex = 3; // 'T'
                    decreaseSteps = Math.abs(additionalLevels);
                } else {
                    return 'T+' + additionalLevels;
                }
            } else {
                info.show("Invalid damage level: " + damageLevel);
                throw new Error("Invalid damage level");
            }
        }

        damageIndex -= decreaseSteps;

        if (damageIndex < 0) {
            return "no DMG :-)";
        }

        return damageLevels[damageIndex];
    }

    /**
     * Calculates the damage code based on power level, damage level, shot count, and dice result.
     * @param {Number} powerLevel
     * @param {String} damageLevel
     * @param {Number} shotCount
     * @param {Number} diceResult
     * @returns {String} Calculated damage code
     */
    calculateDamageCode(powerLevel, damageLevel, shotCount, diceResult) {
        const damageLevels = ['L', 'M', 'S', 'T'];
        powerLevel += (shotCount - 1);
        const increaseSteps = Math.floor(diceResult / 2);
        let damageIndex = damageLevels.indexOf(damageLevel);

        if (damageIndex === -1) {
            info.show("Invalid damage level: " + damageLevel);
            throw new Error("Invalid damage level");
        }

        damageIndex += increaseSteps;

        const shotSteps = Math.floor(shotCount / 3);
        damageIndex += shotSteps;

        let additionalLevels = 0;
        while (damageIndex >= damageLevels.length) {
            additionalLevels++;
            damageIndex -= damageLevels.length;
        }

        if (damageIndex === damageLevels.length - 1 && additionalLevels > 0) {
            additionalLevels += Math.floor((damageIndex - (damageLevels.length - 1)) / 2);
        }

        while (damageIndex >= damageLevels.length) {
            additionalLevels++;
            damageIndex -= damageLevels.length;
        }

        let finalDamageLevel = damageLevels[damageIndex];

        if (additionalLevels > 0) {
            finalDamageLevel = 'T+' + additionalLevels;
        }

        return powerLevel + finalDamageLevel;
    }

    /**
     * Parses a damage code string into its power level and damage level components.
     * @param {string} damageCode
     * @returns {{ powerLevel: number, damageLevel: string }}
     */
    parseDamageCode(damageCode) {
        const regex = /^(\d+)([LMSTlmst](?:\+\d+)?)$/;
        const match = damageCode.match(regex);

        if (!match) {
            info.show(damageCode + " Invalid damage code format us something like 9M or 14S.");
            throw new Error("Invalid damage code format");
        }

        const powerLevel = parseInt(match[1], 10);
        const damageLevel = match[2].toUpperCase(); // Convert to uppercase

        return { powerLevel, damageLevel };
    }

    /**
     * Calculates the total successes from the last two roll IDs.
     * @param {Object} diceTracksObj
     * @returns {Number} Total successes
     */
    calculateTotalSuccesses(diceTracksObj) {
        let totalSuccesses = 0;

        let rollIds = Object.keys(diceTracksObj.diceTracks).sort();
        let lastTwoRollIds = rollIds.slice(-2);

        lastTwoRollIds.forEach(rollId => {
            totalSuccesses += diceTracksObj.diceTracks[rollId].successes;
        });

        return totalSuccesses;
    }

    checkIfRollIsInitiative(event) {
        if (event && event.kind === "rollResults" && event.payload && event.payload.resultsGroups) {
            const resultsGroups = event.payload.resultsGroups;
            for (let group of resultsGroups) {
                if (group.name && group.name.startsWith("Initiative:")) {
                    //console.log("Initiative:", group.name);
                    return true;
                }
            }
        }
        return false;
    }

    clearThrowLog() {
        debug.log("DiceService.clearThrowLog");

        // Clear the throwData array
        this.throwData = [];

        // Persist the updated (empty) throwData array
        this.persistThrowData();

        // Render the updated (empty) throwData array in the UI
        this.renderThrowData();
    }

}

/**
 * Callback function for TS.onRollResults event.
 * @param {TS.rollResults} event
 */
function onRollResults(event) {
    let kind = event.kind;
    let payload = event.payload;

    switch (kind) {
        case 'rollResults':
            console.log("ROLL", event);
            console.log("ISGLITCH?:", diceService.isGlitch(event));

            if (diceService.isGlitch(event)){
                diceService.evaluateGlitch(event);
            }

            if(diceService.checkIfRollIsInitiative(event)){
                diceService.evaluateInitiativeRoll(event);
            } else {
                diceService.evaluateRollResults(payload.rollId, payload.clientId, payload.gmOnly, payload.quiet, payload.resultsGroups);
            }
            break;
        case 'rollRemoved':
            diceService.removeRollId(payload.rollId);
            break;
    }
}

function onUrlMessage(event){
    console.log("onUrlMessage", event);
}