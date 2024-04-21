class DiceTrackDTO {
    rollId;
    diceSetIndex;
    /** @type {Array.<DiceTrackResultsDTO>} */
    dices;

    /**
     * @param {String} rollId 
     * @param {Number} diceSetIndex 
     * @param {Array.<DiceTrackResultsDTO>|null} dices 
     */
    constructor(
        rollId,
        diceSetIndex,
        dices = null
    ) {
        this.rollId = rollId;
        this.diceSetIndex = diceSetIndex;
        this.dices = dices;
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
     */
    addDiceTrack(rollId, diceSetIndex) {
        let diceTrack = new DiceTrackDTO(rollId, diceSetIndex);
        this.diceTracks[rollId] = diceTrack;
    }

    /**
     * @param {String} previousRollId 
     * @param {String} newRollId 
     */
    replaceDiceTrack(previousRollId, newRollId) {
        let previousDiceTrack = this.getDiceTrack(previousRollId);
        let newDiceTrack = new DiceTrackDTO(newRollId, previousDiceTrack.diceSetIndex, previousDiceTrack.dices);
        this.diceTracks[newRollId] = newDiceTrack;
        this.removeDiceTrack(previousRollId);
    }

    /**
     * @param {String} rollId 
     */
    removeDiceTrack(rollId) {
        delete this.diceTracks[rollId];
    }
}