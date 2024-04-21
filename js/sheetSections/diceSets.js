class DiceSetsDTO {
    diceSetList;

    /**
     * @param {Array.<DiceSetsDiceSetDTO>} diceSetList 
     */
    constructor(
        diceSetList = []
    ) {
        this.diceSetList = diceSetList;
    }

    init(obj) {
      obj && Object.assign(this, obj);
    }
}

class DiceSetsDiceSetDTO {
    name;
    threshold;
    amount;

    /**
     * @param {String} name 
     * @param {Number} threshold 
     * @param {Number} amount 
     */
    constructor(
        name,
        threshold,
        amount
    ) {
        this.name = name;
        this.threshold = threshold;
        this.amount = amount;
    }
}

class SheetSectionDiceSets extends AbstractSheetHelper{
    parent;
    sectionDiceSetsDiceSet;

    FIELDNAME_INDEX = 'dice-sets-id[]';
    FIELDID_ADD_ROW = 'dice-sets-add-row';

    ELEMENTID_CELL_ICON_DICE = 'dice-sets-cell-icon-dice[' + this.INDEX_PLACEHOLDER + ']';
    ELEMENTID_CELL_NAME = 'dice-sets-cell-name[' + this.INDEX_PLACEHOLDER + ']';
    ELEMENTID_CELL_THRESHOLD = 'dice-sets-cell-threshold[' + this.INDEX_PLACEHOLDER + ']';
    ELEMENTID_CELL_AMOUNT = 'dice-sets-cell-amount[' + this.INDEX_PLACEHOLDER + ']';
    ELEMENTID_CELL_ICON_REMOVE = 'dice-sets-cell-icon-remove[' + this.INDEX_PLACEHOLDER + ']';

    /**
     * @param {SheetManager} parent 
     */
    constructor(parent) {
        super();
        this.parent = parent;
        this.sectionDiceSetsDiceSet = new SheetSectionDiceSetsDiceSet(this);
    }

    /**
     * Returns all data of section "diceSets"
     * 
     * @returns {DiceSetsDTO}
     */
    getData() {
        return new DiceSetsDTO(
            this.getDiceSets()
        );
    }

    /**
     * Sets all data of section "diceSets"
     * 
     * @param {DiceSetsDTO} data 
     */
    setData(data) {
        this.setDiceSets(data.diceSetList);
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
     * Setting a list of dice sets
     * This means all other potentially already existing records will be removed first
     * 
     * @param {Array.<DiceSetsDiceSetDTO>} diceSetList 
     */
    setDiceSets(diceSetList) {
        this.removeAllDiceSets();

        for (let i = 0; i < diceSetList.length; i++) {
            let diceSetData = diceSetList[i];
            this.addDiceSet(diceSetData.name, diceSetData.threshold, diceSetData.amount);
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
            this.setIndexToString(this.ELEMENTID_CELL_ICON_REMOVE, diceSetIndex)
        ];
        
        for(let i = 0;i < elementIds.length; i++)
        {
            this.removeElementById(elementIds[i]);
        }
    }

    /**
     * @param {String} name 
     * @param {Number} threshold 
     * @param {Number} amount 
     */
    addDiceSet(name = '', threshold = 0, amount = 0) {
        debug.log("SheetSectionDiceSets.addDiceSet");

        let diceSetIndex = this.determineNextIndex(this.FIELDNAME_INDEX);
        
        let newDiceSetHtmlString = ' \
            <div id="dice-sets-cell-icon-dice[' + diceSetIndex + ']" class="grid-item" style="grid-column-end: span 1;"> \
                <i class="icon-dice ts-icon-d6 ts-icon-small" onclick="diceService.rollDices(' + diceSetIndex + ');"></i> \
            </div> \
            <div id="dice-sets-cell-name[' + diceSetIndex + ']" class="grid-item-data align-left" style="grid-column-end: span 1;"> \
                <input name="dice-sets-id[]" type="hidden" value="' + diceSetIndex + '"> \
                <input name="dice-sets-name[' + diceSetIndex + ']" class="field-data-large" type="text" value="' + name + '" onchange="diceService.persistDiceSets();"></input> \
            </div> \
            <div id="dice-sets-cell-threshold[' + diceSetIndex + ']" class="grid-item-data" style="grid-column-end: span 1;"> \
                <input name="dice-sets-threshold[' + diceSetIndex + ']" class="field-data-short" type="number" value="' + threshold + '" onchange="DiceService.preventNegativeValue(this); diceService.persistDiceSets();"></input> \
            </div> \
            <div id="dice-sets-cell-amount[' + diceSetIndex + ']" class="grid-item-data" style="grid-column-end: span 1;"> \
                <input name="dice-sets-amount[' + diceSetIndex + ']" class="field-data-short" type="number" value="' + amount + '" onchange="DiceService.preventNegativeValue(this); diceService.persistDiceSets();"></input> \
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
}


class SheetSectionDiceSetsDiceSet extends AbstractSheetHelper {
    parent;

    FIELDNAME_NAME = 'dice-sets-name[' + this.INDEX_PLACEHOLDER + ']';
    FIELDNAME_THRESHOLD = 'dice-sets-threshold[' + this.INDEX_PLACEHOLDER + ']';
    FIELDNAME_AMOUNT = 'dice-sets-amount[' + this.INDEX_PLACEHOLDER + ']';

    /**
     * @param {SheetSectionDiceSets} parent 
     */
    constructor(parent) {
        super();
        this.parent = parent;
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
            this.getAmount(index)
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
}