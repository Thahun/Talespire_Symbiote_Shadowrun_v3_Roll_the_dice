class DiceTrackDTO {
    rollId;
    diceSetIndex;
    isDefence;
    isKarmaReroll; // Indicate if the roll is a Karma reroll
    /** @type {Array.<DiceTrackResultsDTO>} */
    dices;
    successes;

    /**
     * @param {String} rollId
     * @param {Number} diceSetIndex
     * @param {Boolean} isDefence
     *
     * @param {Array.<DiceTrackResultsDTO>|null} dices
     * @param {Number} successes
     */
    constructor(
        rollId,
        diceSetIndex,
        isDefence = false,
        dices = null,
        successes = 0
    ) {
        this.rollId = rollId;
        this.diceSetIndex = diceSetIndex;
        this.isDefence = isDefence;
        this.isKarmaReroll = false; // Initialize as not a Karma reroll
        this.dices = dices;
        this.successes = successes;
    }
}


/**
 * All results of a dice
 */
class DiceTrackResultsDTO {
    diceType;
    /** @type {Array.<DiceTrackResultDTO>} */
    results = [];

    /**
     * @param {String} diceType
     * @param {Array.<DiceTrackResultDTO>} results
     */
    constructor(
        diceType,
        results = []
    ) {
        this.diceType = diceType;
        this.results = results;
    }
}

/**
 * One result of a dice
 */
class DiceTrackResultDTO {
    result;
    isMax;

    /**
     * @param {Number} result
     * @param {Boolean} isMax
     */
    constructor(
        result,
        isMax = false
    ) {
        this.result = result;
        this.isMax = isMax;
    }
}

 class DiceTracker {
    diceTracks = {};

    /**
     * @param {String} rollId
     * @returns {Boolean}
     */
    hasDiceTrack(rollId) {
        return Object.hasOwn(this.diceTracks, rollId);
    }

    /**
     * @param {String} rollId
     * @returns {DiceTrackDTO}
     */
    getDiceTrack(rollId) {
        return this.diceTracks[rollId];
    }

    /**
     * @param {String} rollId
     * @param {Number} diceSetIndex
     * @param {Boolean} isDefence
     */
    addDiceTrack(rollId, diceSetIndex, isDefence = false) {
        let diceTrack = new DiceTrackDTO(rollId, diceSetIndex, isDefence);
        this.diceTracks[rollId] = diceTrack;
    }

    addKarmaReroll(rollId) {
        this.diceTracks[rollId].isKarmaReroll = true;
    }

    setSuccesses(rollId,successes) {
        this.diceTracks[rollId].successes = successes;
    }

    /**
     * @param {String} previousRollId
     * @param {String} newRollId
     */
    replaceDiceTrack(previousRollId, newRollId) {
        let previousDiceTrack = this.getDiceTrack(previousRollId);
        let newDiceTrack = new DiceTrackDTO(newRollId, previousDiceTrack.diceSetIndex, previousDiceTrack.isDefence, previousDiceTrack.dices, previousDiceTrack.successes);
        this.diceTracks[newRollId] = newDiceTrack;
        this.removeDiceTrack(previousRollId);
    }

    /**
     * @param {String} rollId
     */
    removeDiceTrack(rollId) {
        delete this.diceTracks[rollId];
    }

    /**
     * @returns {DiceTrackDTO|null}
     */
    getLastDiceTrack() {
        const rollIds = Object.keys(this.diceTracks);
        if (rollIds.length === 0) {
            return null;
        }
        return this.diceTracks[rollIds[rollIds.length - 1]];
    }

    clearDiceTracks() {
        this.diceTracks = {};
    }
}
