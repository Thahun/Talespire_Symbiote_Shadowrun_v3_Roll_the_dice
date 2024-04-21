class DiceService extends AbstractSheetHelper {
    initState = false;
    gmMode = false;

    /**
     * @type {String}
     */
    version;

    sectionDiceSets;
    diceTracker;

    ELEMENTID_GM_MODE = 'gm-mode';
    ELEMENTID_APP_NAME = 'app-name';
    ELEMENTID_APP_VERSION = 'app-version-number';
    ELEMENTID_APP_AUTHORS = 'app-author-names';

    /**
     * @param {StorageService} storage 
     */
    constructor(
        storage
    ) {
        debug.log("DiceService class loaded");
        super();

        this.storage = storage;
        this.manifestHelper = new ManifestHelper(this);
        this.sectionDiceSets = new SheetSectionDiceSets(this);
        this.diceTracker = new DiceTracker();

        this.init();
    }

    async init() {
        debug.log("DiceService.init");

        let retriesDelaySeconds = 1;
        let retriesMax = 10;
        let retries = retriesMax;
        while(retries > 0 && !symbioteStorage.isInit()) {
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

        let user = await TS.players.whoAmI();
        let userDetails = await TS.players.getMoreInfo([user.id]);
        let canGM = userDetails[0].rights.canGm;
        this.getElementById(this.ELEMENTID_GM_MODE).style.display = (canGM == true ? 'grid' : 'none');
    }

    /**
     * @returns {Boolean}
     */
    isInit() {
        return this.initState;
    }

    /**
     * @param {Boolean} value 
     */
    toggleGMMode(value) {
        this.gmMode = value;
    }

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

    loadDiceSets() {
        debug.log("DiceService.loadDiceSets");

        let diceSets = this.storage.getStorageAsObject();
        if(diceSets instanceof DiceSetsDTO) {
            this.sectionDiceSets.setData(diceSets);
        }
    }

    persistDiceSets() {
        debug.log("DiceService.persistDiceSets");

        let diceSets = this.sectionDiceSets.getData();
        this.storage.setStorageAsObject(diceSets);
        symbioteStorage.persist();
    }

    /**
     * Prevents setting a numeric input to a value lower than 0
     * Must be placed first in "onchange" event
     *
     * @param {HTMLElement} element 
     */
    static preventNegativeValue(element) {
        debug.log("DiceService.preventNegativeValue");

        if(element.value == '' || Number(element.value) < 0) {
            element.value = 0;
        }
    }

    /**
     * @param {Number} diceSetIndex 
     */
    async rollDices(diceSetIndex) {
        debug.log("DiceService.rollDices");

        let diceSet = this.sectionDiceSets.sectionDiceSetsDiceSet.getData(diceSetIndex);

        if(diceSet.amount <= 0) {
            info.show("Can't roll 0 dices!");
            return;
        }
        if(diceSet.threshold <= 0) {
            info.show("Any dice roll would be above 0!");
            return;
        }

        let diceString = diceSet.amount + 'd6';
        let rollId = await TS.dice.putDiceInTray([{name: '"' + diceSet.name + '"', roll: "!" + diceString}], true);

        if(rollId) {
            this.diceTracker.addDiceTrack(rollId, diceSetIndex);
        }
    }

    /**
     * Evaluate a roll result, if the rollId is tracked by us
     * 
     * @param {String} rollId 
     * @param {String} clientId 
     * @param {Boolean} gmOnly 
     * @param {Boolean} quiet 
     * @param {Array.<TS.rollResultsGroup>} resultsGroups 
     */
    async evaluateRollResults(rollId, clientId, gmOnly, quiet, resultsGroups) {
        debug.log("DiceService.evaluateRollResults");

        if(!this.diceTracker.hasDiceTrack(rollId)) {
            return;
        }

        let diceTrack = this.diceTracker.getDiceTrack(rollId);
        let diceType = resultsGroups[0].result.kind;
        let diceMax = diceType.substring(1);
        let rollResults = resultsGroups[0].result.results;
        let dices = diceTrack.dices;

        let rerollAmount = 0;
        /** @type {Array.<DiceTrackResultDTO>} */
        let newDiceResults = [];
        rollResults.forEach(diceValue => {
            let isMax = (diceValue == diceMax);
            if(isMax) {
                rerollAmount++;
            }
            let diceResult = new DiceTrackResultDTO(diceValue, isMax);
            newDiceResults.push(diceResult);
        });

        if(dices) {
            let diceIndex = 0;
            for (let i = 0; i < newDiceResults.length; i++) {
                let newDiceResult = newDiceResults[i];
                
                for (let j = diceIndex; j < dices.length; j++) {
                    let dice = dices[j];
                    let lastResult = dice.results.slice(-1)[0];
                    if(lastResult.isMax == false) {
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


        if(rerollAmount == 0) {
            this.showRollResult(diceTrack);
            return;
        }
        this.showRerollNote(diceTrack, rerollAmount);

        let diceSet = this.sectionDiceSets.sectionDiceSetsDiceSet.getData(diceTrack.diceSetIndex);
        let diceString = rerollAmount + 'd6';
        let newRollId = await TS.dice.putDiceInTray([{name: '"' + diceSet.name + '"', roll: "!" + diceString}], true);
        this.diceTracker.replaceDiceTrack(rollId, newRollId);
    }

    /**
     * @param {DiceTrackDTO} diceTrack 
     * @param {Number} rerollAmount 
     */
    showRerollNote(diceTrack, rerollAmount) {
        debug.log("DiceService.showRerollNote");

        let diceSet = this.sectionDiceSets.sectionDiceSetsDiceSet.getData(diceTrack.diceSetIndex);
        //let message = rerollAmount + ' ' + (rerollAmount == 1 ? 'dice' : 'dices')  + ' of "' + diceSet.name + '" maxed and can be rerolled.';
        let message = rerollAmount + ' Würfel des "' + diceSet.name + '" Wurfes ' + (rerollAmount == 1 ? 'kann' : 'können')  + ' erneut gewürfelt werden.';
        if(this.gmMode) {
            TS.chat.send(message, 'gms');
        } else {
            TS.chat.send(message, 'board');
        }
    }

    /**
     * @param {DiceTrackDTO} diceTrack 
     */
    showRollResult(diceTrack) {
        debug.log("DiceService.showRollResult");

        let diceSet = this.sectionDiceSets.sectionDiceSetsDiceSet.getData(diceTrack.diceSetIndex);
        let aboveThreshold = 0;

        let rollResultsGroups = [];
        diceTrack.dices.forEach(dice => {
            let diceResults = [];
            let sum = 0;
            dice.results.forEach(diceResult => {
                diceResults.push(diceResult.result);
                sum += diceResult.result;
            });
            if (sum >= diceSet.threshold) {
                aboveThreshold++;
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

        //let message = aboveThreshold + ' of ' + diceSet.amount + ' dices of "' + diceSet.name + '" ' + (aboveThreshold == 1 ? 'was' : 'were')  + ' successful.';
        let message = aboveThreshold + ' von ' + diceSet.amount + ' Würfeln des "' + diceSet.name + '" Wurfes ' + (aboveThreshold == 1 ? 'war' : 'waren')  + ' erfolgreich.';

        if(this.gmMode) {
            TS.chat.send(message, 'gms');
        } else {
            TS.dice.sendDiceResult(rollResultsGroups);
            TS.chat.send(message, 'board');
        }
    }

    /**
     * Remove a rollId from tracking, if it's a tracked one
     * 
     * @param {String} rollId 
     */
    removeRollId(rollId) {
        debug.log("DiceService.removeRollId");
        
        if(this.diceTracker.hasDiceTrack(rollId)) {
            this.diceTracker.removeDiceTrack(rollId);
        }
    }
}


/**
 * Callback function for TS.onRollResults event
 * 
 * @param {TS.rollResults} event 
 */
function onRollResults(event) {
    let kind = event.kind;
    let payload = event.payload;

    switch(kind) {
        case 'rollResults':
            diceService.evaluateRollResults(payload.rollId, payload.clientId, payload.gmOnly, payload.quiet, payload.resultsGroups);
            break;
        case 'rollRemoved':
            diceService.removeRollId(payload.rollId);
            break;
    }
}