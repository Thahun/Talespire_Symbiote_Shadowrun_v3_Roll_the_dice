class DiceSetsDTO {
    diceSetList;
    defenceDiceSetList;
    initiativeData;

    /**
     * @param {Array.<DiceSetsDiceSetDTO>} diceSetList
     * @param {Array.<DiceSetsDiceSetDTO>} defenceDiceSetList
     * @param {Array.<InitiativeDTO>} initiativeData
     */
    constructor(diceSetList = [], defenceDiceSetList = [], initiativeData = []) {
        this.diceSetList = diceSetList;
        this.defenceDiceSetList = defenceDiceSetList;
        this.initiativeData = initiativeData;
    }

    init(obj) {
        obj && Object.assign(this, obj);
    }

    /**
     * @returns {Object}
     */
    getData() {
        return {
            diceSetList: this.diceSetList,
            defenceDiceSetList: this.defenceDiceSetList,
            initiativeData: this.initiativeData
        };
    }

    /**
     * @param {Object} data
     */
    setData(data) {
        this.diceSetList = data.diceSetList || [];
        this.defenceDiceSetList = data.defenceDiceSetList || [];
        this.initiativeData = data.initiativeData || [];
    }
}


class DiceSetsDiceSetDTO {
    name;
    threshold;
    amount;
    dmg;
    bullets;

    /**
     * @param {String} name
     * @param {Number} threshold
     * @param {Number} amount
     * @param {String} dmg
     * @param {Number} bullets
     */
    constructor(name, threshold, amount, dmg, bullets) {
        this.name = name;
        this.threshold = threshold;
        this.amount = amount;
        this.dmg = dmg;
        this.bullets = bullets;
    }
}

class InitiativeDTO {
    name;
    initiative;

    /**
     * @param {String} name
     * @param {String} initiative
     */
    constructor(name, initiative) {
        this.name = name;
        this.initiative = initiative;
    }

    /**
     * Returns all data of section "diceSets"
     *
     * @returns {DiceSetsDTO}
     */
    getData() {
        return new DiceSetsDTO(
            this.getDiceSets(),
            this.getDefenceDiceSets()
        );
    }

    /**
     * Sets all data of section "diceSets"
     *
     * @param {DiceSetsDTO} data
     */
    setData(data) {
        this.setDiceSets(data.diceSetList);
        this.setDefenceDiceSets(data.defenceDiceSetList);
    }
}

class SheetSectionDiceSets extends AbstractSheetHelper {
    parent;
    sectionDiceSetsDiceSet;
    sectionDefenceDiceSetsDiceSet;

    FIELDNAME_INDEX = 'dice-sets-id[]';
    DEFENCE_FIELDNAME_INDEX = 'defence-dice-sets-id[]';
    FIELDID_ADD_ROW = 'dice-sets-add-row';
    DEFENCE_FIELDID_ADD_ROW = 'defence-dice-sets-add-row';

    ELEMENTID_CELL_ICON_DICE = 'dice-sets-cell-icon-dice[' + this.INDEX_PLACEHOLDER + ']';
    ELEMENTID_CELL_NAME = 'dice-sets-cell-name[' + this.INDEX_PLACEHOLDER + ']';
    ELEMENTID_CELL_THRESHOLD = 'dice-sets-cell-threshold[' + this.INDEX_PLACEHOLDER + ']';
    ELEMENTID_CELL_AMOUNT = 'dice-sets-cell-amount[' + this.INDEX_PLACEHOLDER + ']';
    ELEMENTID_CELL_DMG = 'dice-sets-cell-dmg[' + this.INDEX_PLACEHOLDER + ']';
    ELEMENTID_CELL_BULLETS = 'dice-sets-cell-bullets[' + this.INDEX_PLACEHOLDER + ']';
    ELEMENTID_CELL_ICON_REMOVE = 'dice-sets-cell-icon-remove[' + this.INDEX_PLACEHOLDER + ']';

    /**
     * @param {SheetManager} parent
     */
    constructor(parent) {
        super();
        this.parent = parent;
        this.sectionDiceSetsDiceSet = new SheetSectionDiceSetsDiceSet(this);
        this.sectionDefenceDiceSetsDiceSet = new SheetSectionDiceSetsDiceSet(this, true);
    }

    /**
     * Returns all data of section "diceSets"
     *
     * @returns {DiceSetsDTO}
     */
    getData() {
        return new DiceSetsDTO(
            this.getDiceSets(),
            this.getDefenceDiceSets()
        );
    }

    /**
     * Sets all data of section "diceSets"
     *
     * @param {DiceSetsDTO} data
     */
    setData(data) {
        this.setDiceSets(data.diceSetList);
        this.setDefenceDiceSets(data.defenceDiceSetList);
    }

    /**
     * @returns {Array.<DiceSetsDiceSetDTO>}
     */
    getDiceSets() {
        let diceSetList = [];
        let indexes = this.getIndexes(this.FIELDNAME_INDEX);
        for (let i = 0; i < indexes.length; i++) {
            let index = indexes[i];
            let diceSetData = this.sectionDiceSetsDiceSet.getData(index);
            diceSetList.push(diceSetData);
        }
        return diceSetList;
    }

    /**
     * @returns {Array.<DiceSetsDiceSetDTO>}
     */
    getDefenceDiceSets() {
        let diceSetList = [];
        let indexes = this.getIndexes(this.DEFENCE_FIELDNAME_INDEX, 'defence-dice-sets');
        for (let i = 0; i < indexes.length; i++) {
            let index = indexes[i];
            let diceSetData = this.sectionDefenceDiceSetsDiceSet.getData(index);
            diceSetList.push(diceSetData);
        }
        return diceSetList;
    }

    /**
     * Setting a list of dice sets
     * This means all other potentially already existing records will be removed first
     *
     * @param {Array.<DiceSetsDiceSetDTO>} diceSetList
     */
    setDiceSets(diceSetList) {
        this.removeAllDiceSets();

        for (let i = 0; i < diceSetList.length; i++) {
            let diceSetData = diceSetList[i];
            this.addDiceSet(diceSetData.name, diceSetData.threshold, diceSetData.amount, diceSetData.dmg, diceSetData.bullets);
        }
    }

    /**
     * Setting a list of defence dice sets
     * This means all other potentially already existing records will be removed first
     *
     * @param {Array.<DiceSetsDiceSetDTO>} diceSetList
     */
    setDefenceDiceSets(diceSetList) {
        this.removeAllDefenceDiceSets();

        for (let i = 0; i < diceSetList.length; i++) {
            let diceSetData = diceSetList[i];
            this.addDefenceDiceSet(diceSetData.name, diceSetData.threshold, diceSetData.amount, diceSetData.dmg);
        }
    }

    /**
     * ################################
     * # Sheet functions
     * ################################
     */

    removeAllDiceSets() {
        debug.log("SheetSectionDiceSets.removeAllDiceSets");

        let indexes = this.getIndexes(this.FIELDNAME_INDEX);
        for (let i = 0; i < indexes.length; i++) {
            this.removeDiceSet(indexes[i]);
        }
    }

    removeAllDefenceDiceSets() {
        debug.log("SheetSectionDiceSets.removeAllDefenceDiceSets");

        let indexes = this.getIndexes(this.DEFENCE_FIELDNAME_INDEX, 'defence-dice-sets');
        for (let i = 0; i < indexes.length; i++) {
            this.removeDefenceDiceSet(indexes[i]);
        }
    }

    /**
     * @param {Number} diceSetIndex
     */
    removeDiceSet(diceSetIndex) {
        debug.log("SheetSectionDiceSets.removeDiceSet");

        let elementIds = [
            this.setIndexToString(this.ELEMENTID_CELL_ICON_DICE, diceSetIndex),
            this.setIndexToString(this.ELEMENTID_CELL_NAME, diceSetIndex),
            this.setIndexToString(this.ELEMENTID_CELL_THRESHOLD, diceSetIndex),
            this.setIndexToString(this.ELEMENTID_CELL_AMOUNT, diceSetIndex),
            this.setIndexToString(this.ELEMENTID_CELL_DMG, diceSetIndex),
            this.setIndexToString(this.ELEMENTID_CELL_BULLETS, diceSetIndex),
            this.setIndexToString(this.ELEMENTID_CELL_ICON_REMOVE, diceSetIndex)
        ];

        for (let i = 0; i < elementIds.length; i++) {
            this.removeElementById(elementIds[i]);
        }
    }

    /**
     * @param {Number} diceSetIndex
     */
    removeDefenceDiceSet(diceSetIndex) {
        let elementIds = [
            'defence-' + this.setIndexToString(this.ELEMENTID_CELL_ICON_DICE, diceSetIndex),
            'defence-' + this.setIndexToString(this.ELEMENTID_CELL_NAME, diceSetIndex),
            'defence-' + this.setIndexToString(this.ELEMENTID_CELL_THRESHOLD, diceSetIndex),
            'defence-' + this.setIndexToString(this.ELEMENTID_CELL_AMOUNT, diceSetIndex),
            'defence-' + this.setIndexToString(this.ELEMENTID_CELL_DMG, diceSetIndex),
            'defence-' + this.setIndexToString(this.ELEMENTID_CELL_ICON_REMOVE, diceSetIndex)
        ];

        for (let i = 0; i < elementIds.length; i++) {
            this.removeElementById(elementIds[i]);
        }
    }


    /**
     * @param {String} name
     * @param {Number} threshold
     * @param {Number} amount
     * @param {String} dmg
     * @param {Number} bullets
     */
    addDiceSet(name = '', threshold = 0, amount = 0, dmg = '-', bullets = 1) {
        debug.log("SheetSectionDiceSets.addDiceSet");

        let diceSetIndex = this.determineNextIndex(this.FIELDNAME_INDEX);

        let newDiceSetHtmlString = ' \
            <div id="dice-sets-cell-icon-dice[' + diceSetIndex + ']" class="grid-item" style="grid-column-end: span 1;"> \
                <i class="icon-dice ts-icon-d6 ts-icon-small" onclick="diceService.rollDices(' + diceSetIndex + ');"></i> \
            </div> \
            <div id="dice-sets-cell-name[' + diceSetIndex + ']" class="grid-item-data align-left" style="grid-column-end: span 1;"> \
                <input name="dice-sets-id[]" type="hidden" value="' + diceSetIndex + '"> \
                <input name="dice-sets-name[' + diceSetIndex + ']" class="field-data" type="text" value="' + name + '" onchange="diceService.persistDiceSets();"></input> \
            </div> \
            <div id="dice-sets-cell-threshold[' + diceSetIndex + ']" class="grid-item-data" style="grid-column-end: span 1;"> \
                <input name="dice-sets-threshold[' + diceSetIndex + ']" class="field-data-short" type="number" value="' + threshold + '" onchange="DiceService.preventNegativeValue(this); diceService.persistDiceSets();"></input> \
            </div> \
            <div id="dice-sets-cell-amount[' + diceSetIndex + ']" class="grid-item-data" style="grid-column-end: span 1;"> \
                <input name="dice-sets-amount[' + diceSetIndex + ']" class="field-data-short" type="number" value="' + amount + '" onchange="DiceService.preventNegativeValue(this); diceService.persistDiceSets();"></input> \
            </div> \
            <div id="dice-sets-cell-dmg[' + diceSetIndex + ']" class="grid-item-data" style="grid-column-end: span 1;"> \
                <input name="dice-sets-dmg[' + diceSetIndex + ']" class="field-data-short" type="text" value="' + dmg + '" onchange="diceService.persistDiceSets();"></input> \
            </div> \
            <div id="dice-sets-cell-bullets[' + diceSetIndex + ']" class="grid-item-data" style="grid-column-end: span 1;"> \
                <input name="dice-sets-bullets[' + diceSetIndex + ']" class="field-data-short" type="number" value="' + bullets + '" onchange="DiceService.preventNegativeValue(this); diceService.persistDiceSets();"></input> \
            </div> \
            <div id="dice-sets-cell-icon-remove[' + diceSetIndex + ']" class="grid-item" style="grid-column-end: span 1;"> \
                <div id="dice-sets-icon-remove[' + diceSetIndex + ']" class="addRemoveIcon" onclick="diceService.sectionDiceSets.removeDiceSet(' + diceSetIndex + '); diceService.persistDiceSets();">-</div> \
            </div> \
        ';
        let newDiceSetHtmlDocument = new DOMParser().parseFromString(newDiceSetHtmlString, "text/html");
        let newDiceSetHtmlCollection = newDiceSetHtmlDocument.body.children;
        let diceSetAddRow = this.getElementById(this.FIELDID_ADD_ROW);
        diceSetAddRow.before(...newDiceSetHtmlCollection);
    }

    /**
     * @param {String} name
     * @param {Number} threshold
     * @param {Number} amount
     * @param {String} dmg
     */
    addDefenceDiceSet(name = '', threshold = 0, amount = 0, dmg = '-') {
        debug.log("SheetSectionDiceSets.addDefenceDiceSet");

        let diceSetIndex = this.determineNextIndex(this.DEFENCE_FIELDNAME_INDEX, 'defence-dice-sets');

        let newDiceSetHtmlString = ' \
            <div id="defence-dice-sets-cell-icon-dice[' + diceSetIndex + ']" class="grid-item" style="grid-column-end: span 1;"> \
                <i class="icon-dice ts-icon-d6 ts-icon-small" onclick="diceService.rollDefenceDices(' + diceSetIndex + ');"></i> \
            </div> \
            <div id="defence-dice-sets-cell-name[' + diceSetIndex + ']" class="grid-item-data align-left" style="grid-column-end: span 1;"> \
                <input name="defence-dice-sets-id[]" type="hidden" value="' + diceSetIndex + '"> \
                <input name="defence-dice-sets-name[' + diceSetIndex + ']" class="field-data" type="text" value="' + name + '" onchange="diceService.persistDiceSets();"></input> \
            </div> \
            <div id="defence-dice-sets-cell-threshold[' + diceSetIndex + ']" class="grid-item-data" style="grid-column-end: span 1;"> \
                <input name="defence-dice-sets-threshold[' + diceSetIndex + ']" class="field-data-short" type="number" value="' + threshold + '" onchange="DiceService.preventNegativeValue(this); diceService.persistDiceSets();"></input> \
            </div> \
            <div id="defence-dice-sets-cell-amount[' + diceSetIndex + ']" class="grid-item-data" style="grid-column-end: span 1;"> \
                <input name="defence-dice-sets-amount[' + diceSetIndex + ']" class="field-data-short" type="number" value="' + amount + '" onchange="DiceService.preventNegativeValue(this); diceService.persistDiceSets();"></input> \
            </div> \
            <div id="defence-dice-sets-cell-dmg[' + diceSetIndex + ']" class="grid-item-data" style="grid-column-end: span 1;"> \
                <input name="defence-dice-sets-dmg[' + diceSetIndex + ']" class="field-data-short" type="text" value="' + dmg + '" onchange="diceService.persistDiceSets();"></input> \
            </div> \
            <div id="defence-dice-sets-cell-icon-remove[' + diceSetIndex + ']" class="grid-item" style="grid-column-end: span 1;"> \
                <div id="defence-dice-sets-icon-remove[' + diceSetIndex + ']" class="addRemoveIcon" onclick="diceService.sectionDiceSets.removeDefenceDiceSet(' + diceSetIndex + '); diceService.persistDiceSets();">-</div> \
            </div> \
        ';
        let newDiceSetHtmlDocument = new DOMParser().parseFromString(newDiceSetHtmlString, "text/html");
        let newDiceSetHtmlCollection = newDiceSetHtmlDocument.body.children;
        let diceSetAddRow = this.getElementById(this.DEFENCE_FIELDID_ADD_ROW);
        diceSetAddRow.before(...newDiceSetHtmlCollection);
    }
}

class SheetSectionDiceSetsDiceSet extends AbstractSheetHelper {
    parent;
    isDefence = false;

    FIELDNAME_NAME = 'dice-sets-name[' + this.INDEX_PLACEHOLDER + ']';
    FIELDNAME_THRESHOLD = 'dice-sets-threshold[' + this.INDEX_PLACEHOLDER + ']';
    FIELDNAME_AMOUNT = 'dice-sets-amount[' + this.INDEX_PLACEHOLDER + ']';
    FIELDNAME_DMG = 'dice-sets-dmg[' + this.INDEX_PLACEHOLDER + ']';
    FIELDNAME_BULLETS = 'dice-sets-bullets[' + this.INDEX_PLACEHOLDER + ']';

    /**
     * @param {SheetSectionDiceSets} parent
     * @param {Boolean} isDefence
     */
    constructor(parent, isDefence = false) {
        super();
        this.parent = parent;
        this.isDefence = isDefence;

        if (isDefence) {
            this.FIELDNAME_NAME = 'defence-dice-sets-name[' + this.INDEX_PLACEHOLDER + ']';
            this.FIELDNAME_THRESHOLD = 'defence-dice-sets-threshold[' + this.INDEX_PLACEHOLDER + ']';
            this.FIELDNAME_AMOUNT = 'defence-dice-sets-amount[' + this.INDEX_PLACEHOLDER + ']';
            this.FIELDNAME_DMG = 'defence-dice-sets-dmg[' + this.INDEX_PLACEHOLDER + ']';
            this.FIELDNAME_BULLETS = null; // No bullets for defence dice sets
        }
    }

    /**
     * Returns all data of one dice set of section "diceSets"
     *
     * @param {Number} index
     * @returns {DiceSetsDiceSetDTO}
     */
    getData(index) {
        return new DiceSetsDiceSetDTO(
            this.getName(index),
            this.getThreshold(index),
            this.getAmount(index),
            this.getDmg(index),
            this.isDefence ? 0 : this.getBullets(index) // No bullets for defence dice sets
        );
    }

    /**
     * Sets all data of one dice set of section "diceSets"
     *
     * @param {Number} index
     * @param {DiceSetsDiceSetDTO} data
     */
    setData(index, data) {
        this.setName(index, data.name);
        this.setThreshold(index, data.threshold);
        this.setAmount(index, data.amount);
        this.setDmg(index, data.dmg);
        if (!this.isDefence) {
            this.setBullets(index, data.bullets);
        }
    }

    /**
     * @param {Number} index
     * @returns {String}
     */
    getName(index) {
        let fieldname = this.setIndexToString(this.FIELDNAME_NAME, index);
        return this.getElementValueByName(fieldname);
    }

    /**
     * @param {Number} index
     * @param {String} value
     */
    setName(index, value) {
        let fieldname = this.setIndexToString(this.FIELDNAME_NAME, index);
        this.setElementValueByName(fieldname, value);
    }

    /**
     * @param {Number} index
     * @returns {Number}
     */
    getThreshold(index) {
        let fieldname = this.setIndexToString(this.FIELDNAME_THRESHOLD, index);
        return this.getElementValueByName(fieldname, this.DATA_TYPE_NUMBER);
    }

    /**
     * @param {Number} index
     * @param {Number} value
     */
    setThreshold(index, value) {
        let fieldname = this.setIndexToString(this.FIELDNAME_THRESHOLD, index);
        this.setElementValueByName(fieldname, value);
    }

    /**
     * @param {Number} index
     * @returns {Number}
     */
    getAmount(index) {
        let fieldname = this.setIndexToString(this.FIELDNAME_AMOUNT, index);
        return this.getElementValueByName(fieldname, this.DATA_TYPE_NUMBER);
    }

    /**
     * @param {Number} index
     * @param {Number} value
     */
    setAmount(index, value) {
        let fieldname = this.setIndexToString(this.FIELDNAME_AMOUNT, index);
        this.setElementValueByName(fieldname, value);
    }

    /**
     * @param {Number} index
     * @returns {string}
     */
    getDmg(index) {
        let fieldname = this.setIndexToString(this.FIELDNAME_DMG, index);
        return this.getElementValueByName(fieldname);
    }

    /**
     * @param {Number} index
     * @param {string} value
     */
    setDmg(index, value) {
        let fieldname = this.setIndexToString(this.FIELDNAME_DMG, index);
        this.setElementValueByName(fieldname, value);
    }

    /**
     * @param {Number} index
     * @returns {Number}
     */
    getBullets(index) {
        if (this.isDefence) return 0; // No bullets for defence dice sets
        let fieldname = this.setIndexToString(this.FIELDNAME_BULLETS, index);
        return this.getElementValueByName(fieldname, this.DATA_TYPE_NUMBER);
    }

    /**
     * @param {Number} index
     * @param {Number} value
     */
    setBullets(index, value) {
        if (this.isDefence) return; // No bullets for defence dice sets
        let fieldname = this.setIndexToString(this.FIELDNAME_BULLETS, index);
        this.setElementValueByName(fieldname, value);
    }
}
