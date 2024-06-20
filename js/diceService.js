/**
 * DiceService class handles the dice rolling and result evaluation logic.
 * It manages dice sets, dice tracking, and various rolling modes including GM mode.
 */
class DiceService extends AbstractSheetHelper {
    initState = false;  // Indicates if the service is initialized
    gmMode = false;  // GM mode flag
    noUnneededExplode = false;  // Prevent rerolling after the threshold is already solved
    highestRoll = 0;  // Keeps track of the current highest roll to be able to stop rerolling if MW is reached
    openThrow = false;
    openThrowResult = 0;

    /**
     * @type {String}
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
        debug.log("DiceService.init");

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
        this.initState = true;

        //let user = await TS.players.whoAmI();
        //let userDetails = await TS.players.getMoreInfo([user.id]);
        //let canGM = userDetails[0].rights.canGm;
        //this.getElementById(this.ELEMENTID_GM_MODE).style.display = (canGM == true ? 'grid' : 'none');
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

        let diceSets = this.storage.getStorageAsObject();

        if (diceSets instanceof DiceSetsDTO) {
            this.sectionDiceSets.setData(diceSets);
            this.sectionDefenceDiceSets.setData(diceSets);
        }
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

            if (Xd6.endsWith('d6') && !isNaN(Xd6.slice(0, -2)) && !isNaN(Y)) {
                console.log("good format: ", diceString);
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

    /**
     * Evaluates the initiative roll results.
     * @param event
     */
    async evaluateInitiativeRoll(event) {
        console.log(event);
        const rollResults = this.calculateTotalInitiativeResult(event);
        const name = this.getInitiativeName(event);
        console.log("result: ", rollResults, name);

        const [total, numberOfDice, value] = rollResults;
        let message = `${name} Roll: ${numberOfDice}D6+${value} => Total: ${total}`;

        let rollResultsGroups = this.createRollResultsArray(event);
        console.log("groups", rollResultsGroups);

        TS.dice.sendDiceResult(rollResultsGroups);
        TS.chat.send(message, 'board');
        //send log to all
        this.reportDiceLogMessage(message); //send dicelog to all
        //console.log("Log message: ", message);


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
        console.log("rollresults:",rollResultsGroups);

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

        let message = totalThresholdSuccesses + ' von ' + diceSet.amount + ' Würfeln des "' + diceSet.name + '" Wurfes ' + (totalThresholdSuccesses === 1 ? 'war' : 'waren') + ' erfolgreich.';
        let dicelog = diceSet.name + ' => ' + diceSet.amount + ' D6 gegen MW ' + diceSet.threshold + ' : ' + totalThresholdSuccesses + ' Erfolg(e).';

        if (damageCode !== null) {
            if (isDefence) {
                if (totalThresholdSuccesses > 0) {
                    info.show(diceSet.name + ' => ' + totalThresholdSuccesses + ' Erfolg(e)  =>  Effektiver Schaden: ' + damageCode, true);
                    message += ' Effektiver Schaden: ' + damageCode;
                    dicelog += ' DMG ' + damageCode;
                } else {
                    info.show('Keine Erfolge => voller Schaden: ' + damageCode);
                    message += ' Voller Schaden: ' + damageCode;
                    dicelog += ' DMG ' + damageCode;
                }
            } else {
                if (totalThresholdSuccesses > 0) {
                    info.show(diceSet.name + ' => ' + totalThresholdSuccesses + ' Erfolg(e)  =>  Effektiver Schaden: ' + damageCode, true);
                    message += ' Effektiver Schaden: ' + damageCode;
                    dicelog += ' DMG ' + damageCode;
                } else {
                    info.show('Kein Treffer => kein Schaden', true);
                    message += ' Kein effektiver Schaden!';
                    dicelog += ' Kein Schaden!' ;
                }
            }
        } else {
            if (totalThresholdSuccesses > 0) {
                if(this.openThrow){
                    message = diceSet.name + ' => ' + diceSet.amount + ' D6 => Open Throw Result: ' + this.openThrowResult ;
                    dicelog = message;
                    info.show(message , false);
                } else {
                    info.show(diceSet.name + ' => ' + diceSet.amount + ' D6: '+ totalThresholdSuccesses + ' Erfolg(e) ', true);
                    dicelog = diceSet.name + ' => ' + diceSet.amount + ' D6: '+ totalThresholdSuccesses + ' Erfolg(e) ';
                  }
            } else {
                info.show(diceSet.name + ' => ' + diceSet.amount + ' D6: Keine Erfolge  ' + damageCode + ' DMG', true);
                dicelog = diceSet.name + ' => ' + diceSet.amount + ' D6: Keine Erfolge  ' + damageCode + ' DMG';
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
        const playerName = filterInput.value.trim().toLowerCase();
        const logMessages = document.querySelectorAll('#throw-log .log-message');

        if (playerName !== '') {
            logMessages.forEach(message => {
                const playerNameSpan = message.querySelector('.player-name');
                if (playerNameSpan.textContent.trim().toLowerCase().startsWith(playerName)) {
                    message.style.display = 'block';
                } else {
                    message.style.display = 'none';
                }
            });
        } else {
            logMessages.forEach(message => {
                message.style.display = 'block';
                const throwLog = document.getElementById('throw-log');
                throwLog.scrollTop = throwLog.scrollHeight;
            });
        }
    }

    addMessageToLog(message) {
        const throwLog = document.getElementById('throw-log');

        // Get the current time and format it
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const timestamp = `${hours}:${minutes}:${seconds}`;

        // Create a new div for the message
        const newMessageDiv = document.createElement('div');
        newMessageDiv.className = 'log-message';

        // Create a span for the timestamp
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'timestamp';
        timestampSpan.textContent = `[${timestamp}] `;

        // Create a span for the player name
        const playerNameSpan = document.createElement('span');
        playerNameSpan.className = 'player-name';
        const truncatedPlayerName = message.playerName.substring(0, 10); // Show only the first 5 letters
        playerNameSpan.textContent = truncatedPlayerName + ": ";
        playerNameSpan.style.color = this.getColorFromString(message.playerName);

        // Create a span for the log message
        const logMessageSpan = document.createElement('span');
        logMessageSpan.className = 'log-content';
        logMessageSpan.textContent = message.log;

        // Append the timestamp, player name, and log message to the new div
        newMessageDiv.appendChild(timestampSpan);
        newMessageDiv.appendChild(playerNameSpan);
        newMessageDiv.appendChild(logMessageSpan);

        // Add the new message to the end of the log
        throwLog.appendChild(newMessageDiv);

        // Ensure only the last 50 messages are kept
        const logMessages = throwLog.querySelectorAll('.log-message');
        if (logMessages.length > 50) {
            throwLog.removeChild(logMessages[0]);
        }

        // Scroll to the bottom of the log to show the latest messages
        throwLog.scrollTop = throwLog.scrollHeight;

        // Apply filter if checkbox is checked
        //this.togglePlayerFilter();
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

        return color;
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
            return "Kein schaden :-)";
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
                    console.log("Initiative:", group.name);
                    return true;
                }
            }
        }
        return false;
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
