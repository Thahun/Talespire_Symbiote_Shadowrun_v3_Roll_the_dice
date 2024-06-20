/**
 * Class representing an initiative and GM manager.
 */
class IniAndGmManager {
    /**
     * Create an instance of IniAndGmManager.
     * @param {Object} storage - The storage object to persist data.
     */
     constructor(storage) {
        this.initiativeData = [];
        this.personalInitiativeData = [];
        this.storage = storage;
        this.currentIndex = -1; // Track the current index for "Next" and "Prev"
        this.canGM = false;
        this.selectedEntry = null; // Track the selected initiative entry
        this.conditionPenalties = {row1: 0, row2: 0}; // Track the penalties from each row
        this.init();
    }

    /**
     * Initialize the manager by setting up elements, event listeners, and loading data.
     */
    async init() {
        console.log('Initializing IniAndGmManager...');
        // Get elements
        this.nameInput = document.getElementById('player-npc-rolls-name');
        this.initiativeInput = document.getElementById('player-npc-rolls-init');
        this.addButton = document.getElementById('player-npc-rolls-add');
        this.subtractButton = document.getElementById('player-npc-rolls-subtract');
        this.infoButton = document.getElementById('player-npc-rolls-info'); // New info button
        this.rollButton = document.getElementById('roll-initiative-button');
        this.resetButton = document.getElementById('reset-initiative-button'); // New reset button
        this.nextButton = document.getElementById('next-button');
        this.prevButton = document.getElementById('prev-button');
        this.textarea = document.getElementById('player-npc-rolls-text');
        this.breadcrumbsContainer = document.getElementById('breadcrumbs');
        this.sendButton = document.getElementById('send-initiative-button');
        this.iniSection = document.getElementById('section-player-npc-rolls');
        this.conditionMonitorSection = document.getElementById('condition-monitor-section');
        // this.conditionMonitorTitle = document.getElementById('condition-monitor-title');
        this.conditionMonitorName = document.getElementById('condition-monitor-name');

        // Initiative Roll Box
        this.ownInitiativeName = document.getElementById('ini-name-input');
        this.ownInitiativeValue = document.getElementById('ini-value-input');
        this.ownInitiativeTurnMeter = document.getElementById('ini-current-value');

        // GM Box
        this.GmBox = document.getElementById('gm-box');
        this.throwType = document.querySelector('input[name="throw-type"]:checked');
        this.throwName = document.getElementById('throw-name-input');
        this.throwMW = document.getElementById('throw-mw-input');
        this.throwAmount = document.getElementById('throw-amount-input');
        this.throwDmg = document.getElementById('throw-dmg-input');
        this.throwBullets = document.getElementById('throw-bullets-input');
        this.GMsendButton = document.getElementById('send-throw-button');

        // Add event listeners
        this.addButton.addEventListener('click', () => this.addInitiative());
        this.subtractButton.addEventListener('click', () => this.subtractInitiative());
        this.infoButton.addEventListener('click', () => this.getCreatureInfoForIniList()); // Add info button event
        this.rollButton.addEventListener('click', () => this.showInitiatives());
        this.resetButton.addEventListener('click', () => this.resetInitiativeData()); // Add reset button event
        this.nextButton.addEventListener('click', () => this.nextInitiative());
        this.prevButton.addEventListener('click', () => this.prevInitiative());
        this.sendButton.addEventListener('click', () => this.sendInitiativeMessage());
        this.addConditionMonitorEventListeners();

        // GM
        this.GMsendButton.addEventListener('click', () => this.sendThrow());

        let retriesDelaySeconds = 1;
        let retriesMax = 10;
        let retries = retriesMax;
        while (retries > 0 && !symbioteStorage.isInit()) {
            //console.log("Character.init waiting for SymbioteStorage.init");
            retries--;
            await this.sleep(retriesDelaySeconds * 100);
        }
        if (!symbioteStorage.isInit()) {
            throw new SyntaxError("Failed to init SymbioteStorage within " + (retriesMax * retriesDelaySeconds) + " seconds!");
        }

        // Initiative Box and Handling
        this.loadInitiativeData();

        let user = await TS.players.whoAmI();
        let userDetails = await TS.players.getMoreInfo([user.id]);
        this.canGM = userDetails[0].rights.canGm; // to test set this true if you are no GM

        // Ini Box
        this.toggleIniManager();

        // GM Box
        this.toggleGMBox();
        await helm.displayConnected();
        console.log("Connected and IniManager loaded");
    }

    /**
     * Toggles the red border on input elements if they are empty.
     * @param {boolean} toggle - Whether to toggle the red border on or off.
     * @param {...string} elementIds - The IDs of the elements to toggle.
     */
    toggleRedBorderIfEmpty(toggle, ...elementIds) {
        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (toggle && element.value.trim() === "") {
                    element.classList.add('red-border');
                } else {
                    element.classList.remove('red-border');
                }
            } else {
                console.warn(`Element with id ${id} not found`);
            }
        });
    }

    /**
     * Toggles the resize of an element by cycling through predefined heights.
     * Updates the button text to reflect the current maxHeight.
     * @param {string} targetId - The ID of the target element.
     */
    toggleResize(targetId) {
        const htmlElement = document.getElementById(targetId);
        const g = document.getElementById('throw-log-resize-button');

        if (htmlElement && resizeButton) {
            let currentHeight = window.getComputedStyle(htmlElement).maxHeight;
            currentHeight = parseInt(currentHeight); // Convert to integer

            // Toggle the max-height value
            let newHeight;
            if (currentHeight === 70) {
                newHeight = 140;
            } else if (currentHeight === 140) {
                newHeight = 280;
            } else {
                newHeight = 70;
            }

            htmlElement.style.maxHeight = `${newHeight}px`;

            // Update the button text to include the new max-height in brackets
            const baseText = resizeButton.dataset.baseText || 'resize log';
            resizeButton.dataset.baseText = baseText; // Store the base text without the height

            resizeButton.textContent = `${baseText} (${newHeight}px)`;
        }
    }



    /**
     * Toggles the visibility of a specified div.
     * @param {string} targetId - The ID of the target div.
     */
    toggleBodyDiv(targetId, toggle = null) {
        const gmBoxContent = document.getElementById(targetId);
        if (gmBoxContent == null) {
            console.error("no valid html target: ", targetId);
        }
        if (toggle != null){
            gmBoxContent.style.display = toggle ? "block" : "none";
        } else {
            if (gmBoxContent.style.display === "none") {
                gmBoxContent.style.display = "block";
            } else {
                gmBoxContent.style.display = "none";
            }
        }
    }

    /**
     * Toggles the visibility of the GM box content.
     */
    toggleGMBoxBody() {
        const gmBoxContent = document.getElementById('gm-box-content');
        if (gmBoxContent.style.display === "none") {
            gmBoxContent.style.display = "block";
        } else {
            gmBoxContent.style.display = "none";
        }
    }



    /**
     * Toggles the visibility of the GM box if the user can GM.
     */
    toggleGMBox() {
        if (this.canGM || isGM) {
            this.GmBox.style.display = 'block';
        }
    }

    /**
     * Sends a throw message.
     */
    sendThrow() {
        const to = this.collectRecipients();
        const throwData = this.collectThrowData();

        //console.log("TO:", to);

        if (throwData.name.trim() === "") {
            // Make the input field border red if name is empty
            this.throwName.style.border = "2px solid red";
            //console.log("Name is empty. Cannot send throw data.");
        } else {
            //console.log("Sending Throw Data:", JSON.stringify(throwData), "To:", to);
            helm.SendSyncMessage(JSON.stringify(throwData), to);
            // Reset the input field border
            this.throwName.style.border = "";
        }
    }

     checkHackingState() {
        const minigameSection = document.getElementById('minigame-section');
        const accessGrantedTerminal = document.getElementById('access-granted-terminal');
        const terminalLocked = document.getElementById('terminal-locked');

        if (minigameSection && minigameSection.style.display === 'block') {
            return 'run';
        } else if (accessGrantedTerminal && accessGrantedTerminal.style.display === 'block') {
            return 'granted';
        } else if (terminalLocked && terminalLocked.style.display === 'block') {
            return 'locked';
        }

        return null; // Optional: Falls keines der Elemente sichtbar ist, kannst du auch null oder einen anderen Standardwert zurückgeben.
    }


    async startHacking(newMaxAttempts= 4, newDifficulty = 7){

        let { TogglePower } = await import('./robco-industries/js/terminal.js');

        console.log("state",this.checkHackingState());
        //check if hacking state
        switch (this.checkHackingState()) {
            case "run":
                TogglePower()
                TogglePower(newMaxAttempts,newDifficulty);
                console.log('run');
                break;
            case "granted":
                console.log('granted');
                TogglePower();
                TogglePower(newMaxAttempts,newDifficulty);
                break;
            case "locked":
                console.log('locked');
                TogglePower();
                TogglePower(newMaxAttempts,newDifficulty);
                break;
            default:
                this.toggleBodyDiv('minigame-section');
                TogglePower(newMaxAttempts,newDifficulty);
        }
    }

    async endHacking(solved = false){
        let { Success, Failure  } = await import('./robco-industries/js/terminal.js');

        if(solved){
            Success();
        } else {
            Failure();
        }
    }

    sendGlitch(message) {
        const to = this.collectRecipients();
        const logEntry = {
            type: "glitch",
            command: message
        };
        let command = JSON.stringify(logEntry);

        helm.SendSyncMessage(command, to);

        console.log("TO:", to);
    }

    sendHack() {
        let diff  = document.getElementById('difficulty-input').value;
        let attempts  = document.getElementById('att-input').value;

        const to = this.collectRecipients();
        const logEntry = {
            type: "hack",
            diff: diff,
            attempts: attempts
        };
        let command = JSON.stringify(logEntry);

        helm.SendSyncMessage(command, to);

        console.log("TO:", to, command);
    }

    sendEndHack(succ = true) {
        const to = this.collectRecipients();
        const logEntry = {
            type: "endHack",
            succ: succ
        };

        let command = JSON.stringify(logEntry);

        helm.SendSyncMessage(command, to);

        console.log("TO:", to, command);
    }


    /**
     * Collects the recipients from the selected breadcrumbs.
     * @param {boolean} [useOriginal=true] - Whether to use the original breadcrumb or the chatID breadcrumb.
     * @returns {Array} An array of recipient IDs.
     */
    collectRecipients(useOriginal = true) {
        const recipients = [];
        const breadcrumbContainers = document.querySelectorAll('#gm-box-body .breadcrumb-container');

        breadcrumbContainers.forEach(container => {
            if (container.querySelector('.breadcrumb').classList.contains('selected')) {
                const hiddenInput = container.querySelector(`input[name^='breadcrumb-${useOriginal ? '' : 'chatID-'}']`);
                recipients.push(hiddenInput.value);
            }
        });

        return recipients; // Return the recipients as an array
    }

    /**
     * Collects throw data from the input fields.
     * @returns {Object} The collected throw data.
     */
    collectThrowData() {
        // Refresh state
        this.throwType = document.querySelector('input[name="throw-type"]:checked');

        return {
            type: this.throwType.value,
            name: this.throwName.value,
            mw: this.throwMW.value,
            amount: this.throwAmount.value,
            dmg: this.throwDmg.value,
            bullets: this.throwBullets.value
        };
    }

    /**
     * Sleeps for a specified number of milliseconds.
     * @param {number} ms - The number of milliseconds to sleep.
     * @returns {Promise} A promise that resolves after the specified time.
     */
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Adds event listeners for the condition monitor boxes.
     */
    addConditionMonitorEventListeners() {
        const boxes = document.querySelectorAll('.condition-monitor-grid .box');
        boxes.forEach(box => {
            box.addEventListener('click', (event) => this.toggleConditionBox(event.target));
        });
    }

    /**
     * Toggles the selected state of a condition monitor box and updates penalties.
     * @param {HTMLElement} box - The clicked box element.
     */
    toggleConditionBox(box) {
        const row = box.id.split('-')[0]; // Determine row (row1 or row2)
        const value = box.innerText; // Get box value (L, M, S, T or empty)

        if (box.classList.contains('selected')) {
            box.classList.remove('selected');
            this.conditionPenalties[row] = 0; // Remove penalty
        } else {
            this.conditionPenalties[row] = this.getPenaltyValue(value); // Update penalty for the row

            // Deselect other boxes in the same row
            const rowBoxes = document.querySelectorAll(`#${row} .box`);
            rowBoxes.forEach(rowBox => {
                if (rowBox !== box) rowBox.classList.remove('selected');
            });

            box.classList.add('selected'); // Select the clicked box
        }

        this.updateInitiativeWithCondition();
    }

    /**
     * Gets the penalty value for a given condition box value.
     * @param {string} value - The value of the condition box.
     * @returns {number} The penalty value.
     */
    getPenaltyValue(value) {
        switch (value) {
            case 'L':
                return -1;
            case 'M':
                return -2;
            case 'S':
                return -3;
            case 'T':
                return -4;
            default:
                return 0;
        }
    }

    /**
     * Updates the initiative with the condition penalties.
     */
    updateInitiativeWithCondition() {
        if (this.selectedEntry) {
            const totalPenalty = this.conditionPenalties.row1 + this.conditionPenalties.row2;
            this.selectedEntry.calculatedInitiative = this.selectedEntry.originalInitiative + totalPenalty;
            this.selectedEntry.row1Penalty = this.conditionPenalties.row1;
            this.selectedEntry.row2Penalty = this.conditionPenalties.row2;

            this.updateInitiativeListDisplay();
        }
    }

    /**
     * Updates the initiative list display and optionally syncs the data.
     * @param {boolean} [AutoSync=true] - Whether to automatically sync the data.
     */
    updateInitiativeListDisplay(AutoSync = true) {
        let tempInitiativeData = JSON.parse(JSON.stringify(this.initiativeData)); // Deep copy to avoid mutating original data
        let initiativeArrays = {};

        // Create arrays of initiative values for each participant
        tempInitiativeData.forEach(data => {
            let initiative = data.calculatedInitiative;
            let initiativeList = [];
            while (initiative > 0) {
                initiativeList.push(initiative);
                initiative -= 10;
            }
            initiativeArrays[data.name] = initiativeList;
        });

        let finalList = [];
        let added = true;

        // Iterate until all initiative arrays are empty
        while (added) {
            added = false;
            let roundInitiatives = [];

            // Collect the highest current initiative from each participant
            for (let name in initiativeArrays) {
                if (initiativeArrays[name].length > 0) {
                    roundInitiatives.push({
                        name: name, value: initiativeArrays[name].shift()
                    });
                    added = true;
                }
            }

            // Sort the collected initiatives in descending order and add to the final list
            roundInitiatives.sort((a, b) => b.value - a.value);
            roundInitiatives.forEach(item => {
                let data = tempInitiativeData.find(d => d.name === item.name);
                const totalPenalty = data.originalInitiative - data.calculatedInitiative;
                const penaltyDisplay = totalPenalty ? ` :: [-${totalPenalty}]` : '';
                finalList.push(`[${item.value}]${penaltyDisplay} ${item.name} (${data.initiative})`);
            });
        }

        //console.log("finalList", finalList);

        this.textarea.innerHTML = finalList.join('<br>');
        if (AutoSync) {
            this.sendInitiativeMessage(['board']);
        }
    }

    /**
     * Adds an initiative entry to the list.
     * @param {string} [name=''] - The name of the entry.
     * @param {string} [initiativeString=''] - The initiative string.
     * @param {boolean} [isPlayer=false] - Whether the entry is for a player.
     */
    addInitiative(name = '', initiativeString = '', isPlayer = false) {
        if (name === '' && initiativeString === '') {
            name = this.nameInput.value.trim();
            initiativeString = this.initiativeInput.value.trim();
        }
        //console.log("initiative", initiativeString);
        if (name && initiativeString) {
            const existingEntry = this.initiativeData.find(data => data.name === name);
            if (existingEntry) {
                existingEntry.initiative = initiativeString;
                existingEntry.originalInitiative = this.rollDice(initiativeString);
                existingEntry.calculatedInitiative = existingEntry.originalInitiative + this.getTotalPenaltyForEntry(existingEntry);
            } else {
                const newEntry = new InitiativeListDTO(name, initiativeString, this.rollDice(initiativeString));
                newEntry.originalInitiative = newEntry.calculatedInitiative; // Store original initiative
                this.initiativeData.push(newEntry);
                this.addIniBreadcrumb(name);
            }
            this.clearInputs();
            this.persistInitiativeData(); // Persist data whenever it is added

            // Update initiative list if already generated
            if (this.textarea.innerHTML.trim() !== '') {
                const newEntry = new InitiativeListDTO(name, initiativeString, this.rollDice(initiativeString));
                newEntry.originalInitiative = newEntry.calculatedInitiative; // Store original initiative
                this.updateOrInsertEntryInList(name, initiativeString, existingEntry ? existingEntry.originalInitiative : newEntry.originalInitiative);
            }
        } else {
            alert('Please enter valid name and initiative.');
        }
    }

    /**
     * Gets the total penalty for a given entry.
     * @param {Object} entry - The initiative entry.
     * @returns {number} The total penalty for the entry.
     */
    getTotalPenaltyForEntry(entry) {
        return (entry.row1Penalty || 0) + (entry.row2Penalty || 0);
    }

    /**
     * Subtracts an initiative entry from the list.
     */
    subtractInitiative() {
        const name = this.nameInput.value.trim();

        if (name) {
            this.initiativeData = this.initiativeData.filter(data => data.name !== name);
            this.clearInputs();
            this.updateIniBreadcrumbs();
            this.persistInitiativeData(); // Persist data whenever it is removed

            // Update initiative list if already generated
            if (this.textarea.innerHTML.trim() !== '') {
                this.updateInitiativeListDisplay();
            }
        } else {
            alert('Please enter a valid name to remove.');
        }
    }

    /**
     * Retrieves information about a selected creature.
     * @returns {Promise<Object|null>} The creature information or null if not found.
     */
    async getCreatureInfo() {
        let info = await TS.creatures.getSelectedCreatures();
        if (info.length > 0) {
            let creatureId = info[0].id;

            // Use the id to get more information
            return await TS.creatures.getMoreInfo([creatureId]);
        }
        return null;
    }

    /**
     * Retrieves creature information for the initiative list and updates the input fields.
     */
    async getCreatureInfoForIniList() {
        // Use the id to get more information
        let creatureInfo = await this.getCreatureInfo()

        // Extract and report the name
        if (creatureInfo.length > 0) {
            const iniAndReaction = this.parseIniDiceAndReaction(creatureInfo[0].stats)
            //console.log("stableCreatureInfo", iniAndReaction);
            // Put the name into the input box for a new initiative entry
            this.nameInput.value = creatureInfo[0].name;
            this.initiativeInput.value = iniAndReaction['iniDice'] + "d6+" + iniAndReaction['reaction']; // Add default value
        } else {
            //console.log("No additional information found for the creature");
        }
    }

    /**
     * Parses initiative dice and reaction values from a stats array.
     * @param {Array} statsArray - The stats array to parse.
     * @returns {Object} An object containing iniDice and reaction values.
     */
    parseIniDiceAndReaction(statsArray) {
        let iniDice = null;
        let reaction = null;

        statsArray.forEach(stat => {
            if (stat.name === "iniDice") {
                iniDice = stat.value;
            } else if (stat.name === "Reaction") {
                reaction = stat.value;
            }
        });

        return { iniDice, reaction };
    }

    /**
     * Updates or inserts an entry in the initiative list.
     * @param {string} name - The name of the entry.
     * @param {string} initiativeString - The initiative string.
     * @param {number} newInitiativeValue - The new initiative value.
     */
    updateOrInsertEntryInList(name, initiativeString, newInitiativeValue) {
        // Update the initiative data and re-sort it
        const entry = this.initiativeData.find(data => data.name === name);
        if (entry) {
            entry.initiative = initiativeString;
            entry.originalInitiative = newInitiativeValue;
            entry.calculatedInitiative = newInitiativeValue + this.getTotalPenaltyForEntry(entry);
        } else {
            const newEntry = new InitiativeListDTO(name, initiativeString, newInitiativeValue);
            newEntry.originalInitiative = newEntry.calculatedInitiative; // Store original initiative
            this.initiativeData.push(newEntry);
        }
        this.updateInitiativeListDisplay(false);
    }

    /**
     * Rolls dice based on a dice string (e.g., "2d6+4").
     * @param {string} diceString - The dice string to roll.
     * @returns {number} The total rolled value.
     * @throws {TypeError} If the dice string is not a string.
     */
    rollDice(diceString) {
        if (typeof diceString !== 'string') {
            console.error('Invalid dice string:', diceString);
            throw new TypeError('Expected a string for diceString');
        }

        const diceParts = diceString.split('+');
        let total = 0;

        diceParts.forEach(part => {
            part = part.trim();
            if (part.includes('d')) {
                const [numDice, dieSize] = part.split('d').map(Number);
                for (let i = 0; i < numDice; i++) {
                    total += Math.floor(Math.random() * dieSize) + 1;
                }
            } else {
                total += parseInt(part, 10);
            }
        });

        return total;
    }

    /**
     * Shows the calculated initiatives for all entries.
     */
    showInitiatives() {
        // Calculate initiatives for all entries
        this.initiativeData.forEach(data => {
            data.originalInitiative = this.rollDice(data.initiative);
            data.calculatedInitiative = data.originalInitiative + this.getTotalPenaltyForEntry(data);
        });

        this.updateInitiativeListDisplay(false);
        this.currentIndex = -1; // Reset the current index
    }

    /**
     * Resets the initiative data and updates the display.
     */
    resetInitiativeData() {
        // Save the state of checked breadcrumbs
        const checkedBreadcrumbs = this.initiativeData
            .filter(data => {
                const checkbox = document.getElementById(`checkbox-${data.name}`);
                return checkbox && checkbox.checked;
            })
            .map(data => data.name);

        // Filter the initiative data based on the checked state
        this.initiativeData = this.initiativeData.filter(data => checkedBreadcrumbs.includes(data.name));

        this.clearInputs();
        this.updateIniBreadcrumbs();

        // Restore the checked state of the breadcrumbs
        checkedBreadcrumbs.forEach(name => {
            const checkbox = document.getElementById(`checkbox-${name}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
        this.updateInitiativeListDisplay();
        this.persistInitiativeData();
    }

    /**
     * Moves to the next initiative in the list.
     */
    nextInitiative() {
        const lines = this.textarea.innerHTML.split('<br>');
        if (this.currentIndex < lines.length - 1) {
            this.currentIndex++;
            this.updateTextarea(lines);
        }
    }

    /**
     * Moves to the previous initiative in the list.
     */
    prevInitiative() {
        this.currentIndex = -1;
        this.updateTextarea(this.textarea.innerHTML.split('<br>'));
    }

    /**
     * Updates the textarea display with the current initiative data.
     * @param {Array} lines - The lines of initiative data.
     */
    updateTextarea(lines) {
        const updatedLines = lines.map((line, index) => {
            if (this.currentIndex === -1) {
                return line.replace(/<\/?s>/g, ''); // Remove strikethrough tags if resetting
            }
            if (index === this.currentIndex) {
                return line.startsWith('<s>') ? line.replace(/<\/?s>/g, '') : `<s>${line}</s>`;
            }
            return line;
        });
        this.textarea.innerHTML = updatedLines.join('<br>');
        this.sendInitiativeMessage(['board']);
    }

    /**
     * Adds a breadcrumb for the initiative entry.
     * @param {string} name - The name of the entry.
     */
    addIniBreadcrumb(name) {
        const breadcrumb = document.createElement('div');
        breadcrumb.className = 'breadcrumb';
        breadcrumb.innerHTML = `
            <input type="checkbox" class="breadcrumb-checkbox" id="checkbox-${name}" />
            <span class="breadcrumb-name">${name}</span>
        `;
        breadcrumb.querySelector('.breadcrumb-name').addEventListener('click', () => this.loadInitiative(name));
        this.breadcrumbsContainer.appendChild(breadcrumb);
    }

    /**
     * Updates the initiative breadcrumbs display.
     */
    updateIniBreadcrumbs() {
        this.breadcrumbsContainer.innerHTML = '';
        this.initiativeData.forEach(data => {
            this.addIniBreadcrumb(data.name);
        });
    }

    /**
     * Loads the initiative entry into the input fields.
     * @param {string} name - The name of the entry to load.
     */
    loadInitiative(name) {
        const entry = this.initiativeData.find(data => data.name === name);
        if (entry) {
            this.nameInput.value = entry.name;
            this.initiativeInput.value = entry.initiative;
            this.selectedEntry = entry;
            this.updateConditionMonitor();
        }
        this.showConditionMonitor(name); // Show the condition monitor when a breadcrumb is clicked
    }

    /**
     * Updates the condition monitor with the penalties for the selected entry.
     */
    updateConditionMonitor() {
        this.conditionPenalties = {
            row1: this.selectedEntry.row1Penalty || 0,
            row2: this.selectedEntry.row2Penalty || 0
        };

        this.updateConditionMonitorBoxes('row1', this.conditionPenalties.row1);
        this.updateConditionMonitorBoxes('row2', this.conditionPenalties.row2);
    }

    /**
     * Updates the condition monitor boxes for a specific row.
     * @param {string} row - The row to update (e.g., "row1").
     * @param {number} penalty - The penalty value to apply.
     */
    updateConditionMonitorBoxes(row, penalty) {
        const rowBoxes = document.querySelectorAll(`.${row} .box`);
        rowBoxes.forEach(box => {
            const boxValue = box.innerText.trim();
            const boxPenalty = this.getPenaltyValue(boxValue);

            if (boxValue !== '' && boxPenalty === penalty) {
                box.classList.add('selected');
            } else {
                box.classList.remove('selected');
            }
        });
    }

    /**
     * Clears the input fields.
     */
    clearInputs() {
        this.nameInput.value = '';
        this.initiativeInput.value = '';
    }

    /**
     * Persists the initiative data to storage.
     */
    persistInitiativeData() {
        let diceSets = this.storage.getStorageAsObject();
        diceSets.initiativeData = this.initiativeData;
        diceSets.personalInitiativeData = this.personalInitiativeData;
        this.storage.setStorageAsObject(diceSets);
        symbioteStorage.persist();
    }

    /**
     * Loads the initiative data from storage and updates the display.
     */
    loadInitiativeData() {
        let diceSets = this.storage.getStorageAsObject();
        if (diceSets instanceof DiceSetsDTO) {
            this.initiativeData = diceSets.initiativeData || [];
            this.initiativeData.forEach(data => {
                data.originalInitiative = this.rollDice(data.initiative);
                data.calculatedInitiative = data.originalInitiative + this.getTotalPenaltyForEntry(data);
            });
            this.updateInitiativeListDisplay(); // Render loaded initiative data

            this.personalInitiativeData = diceSets.personalInitiativeData || [];
            //console.log("PersonalINIDATA:", this.personalInitiativeData);
            this.updatePersonalInitiativeInputs();
        }
        this.updateIniBreadcrumbs();
    }

    /**
     * Updates the personal initiative inputs with the loaded data.
     */
    updatePersonalInitiativeInputs() {
        if (this.personalInitiativeData && Array.isArray(this.personalInitiativeData) && this.personalInitiativeData.length === 2) {
            const [name, initiativeValue] = this.personalInitiativeData;

            if (this.ownInitiativeName && this.ownInitiativeValue) {
                this.ownInitiativeName.value = name;
                this.ownInitiativeValue.value = initiativeValue;
            } else {
                console.error("Initiative input elements not found");
            }
        } else {
            console.error("Invalid personal initiative data");
        }
    }

    /**
     * Sends the initiative message to specified recipients.
     * @param {Array} [to=[]] - The recipients of the message.
     * @param {boolean} [fromChatCommand=false] - Whether the message is from a chat command.
     */
    sendInitiativeMessage(to = [], fromChatCommand = false) {
        const content = this.textarea.innerHTML;

        const lines = this.textarea.innerHTML.split('<br>');
        let message = 'Initiative:\n========================\n';
        lines.forEach(line => {
            if (line.startsWith('<s>') && line.endsWith('</s>')) {
                line = `~~${line.replace(/<\/?s>/g, '')}~~`;
            }
            message += line + '\n';
        });
        // message += '========================\n';

        if (to.length === 0) {
            to = this.collectRecipients(false);
            //console.log("to initiative:", to);
        }

        if (to.length > 0) {
            // helm.sendChatMessage(message, to);
            this.sendInitiativeFetchSyncMessage(content, to);
        } else if (!fromChatCommand) {
            // helm.sendChatMessage(message, ['board']);
            this.sendInitiativeFetchSyncMessage(content, ['board']);
        }
    }

    /**
     * Sends the initiative fetch sync message.
     * @param {string} message - The message content.
     * @param {Array} to - The recipients of the message.
     */
    sendInitiativeFetchSyncMessage(message, to) {
        const data = {
            type: 'fetchini', message: message
        };
        helm.SendSyncMessage(JSON.stringify(data), to);
    }

    /**
     * Sends the own initiative sync message.
     * @param {string} message - The message content.
     * @param {Array} to - The recipients of the message.
     */
    sendOwnInitiativeSyncMessage(message, to) {
        const data = {
            type: 'setini', message: message
        };
        helm.SendSyncMessage(JSON.stringify(data), to);
    }

    /**
     * Gets the next turn for a specified name from the initiative data.
     * @param {string} name - The name to search for.
     * @param {Object} initiativeData - The initiative data object.
     * @returns {string} A message indicating the next turn status.
     */
    getNextTurn(name, initiativeData) {
        //console.log("getNextTurn:", name, initiativeData);
        if (initiativeData.type !== "fetchini") {
            console.error("Invalid initiative data type.");
            return "Fehler: Ungültiger Initiativdaten-Typ"; // Return an error message
        }

        const message = initiativeData.message;
        const turns = message.split('<br>').filter(turn => !turn.startsWith('<s>')); // Filter out crossed-out entries

        for (let i = 0; i < turns.length; i++) {
            if (turns[i].includes(name)) {
                if (i === 0) {
                    return "Now!";
                } else {
                    return `${i} turn(s)`;
                }
            }
        }
        return "No"; // Return a message if the name is not found
    }

    /**
     * Updates the initiative list from a sync message.
     * @param {Object} initiativeData - The initiative data object.
     */
    updateInitiativeListFromSyncMessage(initiativeData) {
        // Ensure the initiativeData is an object and has the expected structure
        //console.log(initiativeData);
        if (initiativeData && initiativeData.type === "fetchini") {
            // This is the NON-GM ini list
            const initiativeListDiv = document.getElementById('ini-list');

            // Clear the previous content
            initiativeListDiv.innerHTML = '';

            // Append the new message to the ini-list div
            if (initiativeData.message) {
                initiativeListDiv.innerHTML = initiativeData.message;
            } else {
                // Create a pre element to display the message with proper formatting
                const messageSpan = document.createElement('span');
                messageSpan.textContent = 'No current Ini-table';
                initiativeListDiv.appendChild(messageSpan);
            }
            // Update TurnMeter
            const name = this.ownInitiativeName.value;
            this.ownInitiativeTurnMeter.innerHTML = this.getNextTurn(name, initiativeData);
        } else {
            //console.log("Invalid initiative data:", initiativeData);
        }
    }

    /**
     * Toggles the initiative manager visibility if the user can GM.
     */
    toggleIniManager() {
        if (this.canGM || isGM) {
            this.iniSection.style.display = 'block';
        }
    }

    /**
     * Shows the condition monitor for a specified name.
     * @param {string} name - The name to show in the condition monitor.
     */
    showConditionMonitor(name) {
        this.conditionMonitorName.innerText = name;
        this.conditionMonitorSection.style.display = 'block';

        // Set the selected entry
        this.selectedEntry = this.initiativeData.find(data => data.name === name);

        // Deselect all boxes
        const boxes = document.querySelectorAll('.condition-monitor-grid .box');
        boxes.forEach(box => box.classList.remove('selected'));

        this.updateConditionMonitor(); // Update condition monitor display
    }

    /**
     * Retrieves the own initiative from a creature and updates the input fields.
     */
    async getOwnInitiativeFromCreature() {
        // Use the id to get more information
        let creatureInfo = await this.getCreatureInfo()

        // Extract and report the name
        if (creatureInfo.length > 0) {
            const iniAndReaction = this.parseIniDiceAndReaction(creatureInfo[0].stats)
            //console.log("getOwnInitiativeFromCreature", iniAndReaction);
            // Put the name into the input box for a new initiative entry
            this.ownInitiativeName.value = creatureInfo[0].name;
            this.ownInitiativeValue.value = iniAndReaction['iniDice'] + "d6+" + iniAndReaction['reaction'];
        } else {
            //console.log("No additional information found for the creature");
        }
    }

    /**
     * Retrieves stats from a picked creature based on the event.
     * @param {Object} event - The event object containing the picked creature information.
     */
    async getStatsfromPickedCreature(event) {
        try {
            //console.log("getStatsfromPickedCreature", event);

            // Ensure event.payload and event.payload.idOfPicked are defined
            if (!event.payload || !event.payload.idOfPicked) {
                console.error("Invalid event payload or idOfPicked missing", event.payload);
                return;
            }

            let creatureInfo = await TS.creatures.getMoreInfo([event.payload.idOfPicked]); // this id is not the right creature id :( picking does not work

            // Check if creatureInfo is not empty
            if (creatureInfo.length > 0) {
                //console.log("pickINFO", creatureInfo);
            } else {
                //console.log("No additional information found for the creature with ID:", event.payload.idOfPicked);
            }
        } catch (error) {
            console.error("Error getting stats from picked creature:", error);
        }

    }
}

/**
 * Handles the picking event and retrieves stats from the picked creature.
 * @param {Object} event - The event object containing the picked creature information.
 */
async function onPickingEvent(event) {
    //console.log("onPickingEvent", event);
    // await iniAndGmManager.getStatsfromPickedCreature(event) // broken id from TS :(
}
