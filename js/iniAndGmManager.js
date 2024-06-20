class IniAndGmManager {
    constructor(storage) {
        this.initiativeData = [];
        this.personalInitiativeData = [];
        this.storage = storage;
        this.currentIndex = -1; // Track the current index for "Next" and "Prev"
        this.canGM = false;
        this.selectedEntry = null; // Track the selected initiative entry
        this.conditionPenalties = { row1: 0, row2: 0 }; // Track the penalties from each row
        this.init();
    }

    async init() {
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

        //Iniative Roll Box
        this.ownInitiativeName = document.getElementById('ini-name-input');
        this.ownInitiativeValue = document.getElementById('ini-value-input');
        this.ownInitiativeTurnMeter = document.getElementById('ini-current-value');

        //GM Box
        this.GmBox = document.getElementById('gm-box');
//        this.throwType = document.getElementById('throw-type');
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
        this.infoButton.addEventListener('click', () => this.getCreatureInfo()); // Add info button event
        this.rollButton.addEventListener('click', () => this.showInitiatives());
        this.resetButton.addEventListener('click', () => this.resetInitiativeData()); // Add reset button event
        this.nextButton.addEventListener('click', () => this.nextInitiative());
        this.prevButton.addEventListener('click', () => this.prevInitiative());
        this.sendButton.addEventListener('click', () => this.sendInitiativeMessage());

        this.addConditionMonitorEventListeners();

        //GM
        this.GMsendButton.addEventListener('click', () => this.sendThrow());


        let retriesDelaySeconds = 1;
        let retriesMax = 10;
        let retries = retriesMax;
        while (retries > 0 && !symbioteStorage.isInit()) {
            console.log("Character.init waiting for SymbioteStorage.init");
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

        //Ini Box
        this.toggleIniManager();

        //GM Box
        this.toggleGMBox();
        await helm.displayConnected();
    }

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

    toggleResize(targetId) {
        const htmlElement = document.getElementById(targetId);
        if (htmlElement) {
            let currentHeight = window.getComputedStyle(htmlElement).maxHeight;
            currentHeight = parseInt(currentHeight); // Convert to integer

            // Toggle the max-height value
            if (currentHeight === 70) {
                htmlElement.style.maxHeight = '140px';
            } else if (currentHeight == 140) {
                htmlElement.style.maxHeight = '280px';
            } else {
                htmlElement.style.maxHeight = '70px';
            }
        }
    }


    toggleBodyDiv(targetId){
        const gmBoxContent = document.getElementById(targetId);
        if(gmBoxContent == null) {
            console.error("no valid html target: ", targetId);
        }
        if (gmBoxContent.style.display === "none" || gmBoxContent.style.display === "") {
            gmBoxContent.style.display = "block";
        } else {
            gmBoxContent.style.display = "none";
        }
    }

    toggleGMBoxBody() {
        const gmBoxContent = document.getElementById('gm-box-content');
        if (gmBoxContent.style.display === "none" || gmBoxContent.style.display === "") {
            gmBoxContent.style.display = "block";
        } else {
            gmBoxContent.style.display = "none";
        }
    }


    toggleGMBox() {
        if (this.canGM || isGM) {
            this.GmBox.style.display = 'block';
        }
    }

    sendThrow() {
        const to = this.collectRecipients();
        const throwData = this.collectThrowData();

        console.log("TO:", to);

        if (throwData.name.trim() === "") {
            // Make the input field border red if name is empty
            this.throwName.style.border = "2px solid red";
            console.log("Name is empty. Cannot send throw data.");
        } else {
            console.log("Sending Throw Data:", JSON.stringify(throwData), "To:", to);
            helm.SendSyncMessage(JSON.stringify(throwData), to);
            // Reset the input field border
            this.throwName.style.border = "";
        }
    }

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


    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    addConditionMonitorEventListeners() {
        const boxes = document.querySelectorAll('.condition-monitor-grid .box');
        boxes.forEach(box => {
            box.addEventListener('click', (event) => this.toggleConditionBox(event.target));
        });
    }

    toggleConditionBox(box) {
        const row = box.id.split('-')[0]; // Determine row (row1 or row2)
        const value = box.innerText; // Get box value (L, M, S, T or empty)

        if (box.classList.contains('selected')) {
            box.classList.remove('selected');
            this.conditionPenalties[row] = 0; // Remove penalty
        } else {
            const penalty = this.getPenaltyValue(value);
            this.conditionPenalties[row] = penalty; // Update penalty for the row

            // Deselect other boxes in the same row
            const rowBoxes = document.querySelectorAll(`#${row} .box`);
            rowBoxes.forEach(rowBox => {
                if (rowBox !== box) rowBox.classList.remove('selected');
            });

            box.classList.add('selected'); // Select the clicked box
        }

        this.updateInitiativeWithCondition();
    }

    getPenaltyValue(value) {
        switch (value) {
            case 'L': return -1;
            case 'M': return -2;
            case 'S': return -3;
            case 'T': return -4;
            default: return 0;
        }
    }

    updateInitiativeWithCondition() {
        if (this.selectedEntry) {
            const totalPenalty = this.conditionPenalties.row1 + this.conditionPenalties.row2;
            this.selectedEntry.calculatedInitiative = this.selectedEntry.originalInitiative + totalPenalty;
            this.selectedEntry.row1Penalty = this.conditionPenalties.row1;
            this.selectedEntry.row2Penalty = this.conditionPenalties.row2;

            this.updateInitiativeListDisplay();
        }
    }

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
                        name: name,
                        value: initiativeArrays[name].shift()
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

        console.log("finalList", finalList);

        this.textarea.innerHTML = finalList.join('<br>');
        if (AutoSync) {
            this.sendInitiativeMessage(['board']);
        }
    }

    addInitiative(name = '', initiativeString = '', isPlayer = false) {
        if(name === '' && initiativeString === '') {
            name = this.nameInput.value.trim();
            initiativeString = this.initiativeInput.value.trim();
        }
        console.log("initiative", initiativeString);
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
            alert('Please enter valid name and initiative.'); //Todo: Ändern
        }
    }

    getTotalPenaltyForEntry(entry) {
        return (entry.row1Penalty || 0) + (entry.row2Penalty || 0);
    }

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

    async getCreatureInfo() {
        let info = await TS.creatures.getSelectedCreatures();
        if (info.length > 0) {
            let creatureId = info[0].id;

            // Use the id to get more information
            let creatureInfo = await TS.creatures.getMoreInfo([creatureId]);

            // Extract and report the name
            if (creatureInfo.length > 0) {
                let creatureName = creatureInfo[0].name;

                // Put the name into the input box for a new initiative entry
                this.nameInput.value = creatureName;
                this.initiativeInput.value = "1d6+3"; // Add default value
            } else {
                console.log("No additional information found for the creature");
            }
        } else {
            console.log("No creature selected");
        }
    }

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

    showInitiatives() {
        // Calculate initiatives for all entries
        this.initiativeData.forEach(data => {
            data.originalInitiative = this.rollDice(data.initiative);
            data.calculatedInitiative = data.originalInitiative + this.getTotalPenaltyForEntry(data);
        });

        this.updateInitiativeListDisplay(false);
        this.currentIndex = -1; // Reset the current index
    }

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


    nextInitiative() {
        const lines = this.textarea.innerHTML.split('<br>');
        if (this.currentIndex < lines.length - 1) {
            this.currentIndex++;
            this.updateTextarea(lines);
        }
    }

    prevInitiative() {
        this.currentIndex = -1;
        this.updateTextarea(this.textarea.innerHTML.split('<br>'));
    }

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

    updateIniBreadcrumbs() {
        this.breadcrumbsContainer.innerHTML = '';
        this.initiativeData.forEach(data => {
            this.addIniBreadcrumb(data.name);
        });
    }

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

    updateConditionMonitor() {
        this.conditionPenalties = { row1: this.selectedEntry.row1Penalty || 0, row2: this.selectedEntry.row2Penalty || 0 };

        this.updateConditionMonitorBoxes('row1', this.conditionPenalties.row1);
        this.updateConditionMonitorBoxes('row2', this.conditionPenalties.row2);
    }

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

    clearInputs() {
        this.nameInput.value = '';
        this.initiativeInput.value = '';
    }

    persistInitiativeData() {
        let diceSets = this.storage.getStorageAsObject();
        diceSets.initiativeData = this.initiativeData;
        diceSets.personalInitiativeData = this.personalInitiativeData;
        this.storage.setStorageAsObject(diceSets);
        symbioteStorage.persist();
    }


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
            console.log("PersonalINIDATA:",this.personalInitiativeData);
            this.updatePersonalInitiativeInputs();

        }
        this.updateIniBreadcrumbs();
    }

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


    sendInitiativeMessage(to = [], fromChatCommand = false) {
        const content = this.textarea.innerHTML;

        const lines = this.textarea.innerHTML.split('<br>'); //todo: lines directly
        let message = 'Initiative:\n========================\n';
        lines.forEach(line => {
            if (line.startsWith('<s>') && line.endsWith('</s>')) {
                line = `~~${line.replace(/<\/?s>/g, '')}~~`;
            }
            message += line + '\n';
        });
       // message += '========================\n';

        if(to.length === 0){
            to = this.collectRecipients(false);
            console.log("to initiative:", to);
        }

        if(to.length > 0){
           // helm.sendChatMessage(message, to);
            this.sendInitiativeFetchSyncMessage(content, to);
        } else if (!fromChatCommand){
           // helm.sendChatMessage(message, ['board']);
            this.sendInitiativeFetchSyncMessage(content, ['board']);
        }
    }

    //Send Inilist as a GM to the players
    sendInitiativeFetchSyncMessage(message, to) {
        const data = {
            type: 'fetchini',
            message: message
        };
        helm.SendSyncMessage( JSON.stringify(data), to);
    }


    //Send OwnIni as player to GM
    sendOwnInitiativeSyncMessage(message, to) {
        const data = {
            type: 'setini',
            message: message
        };
        helm.SendSyncMessage( JSON.stringify(data), to);
    }

    getNextTurn(name, initiativeData) {
        console.log("getNextTurn:", name, initiativeData);
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
        return "Not in list / no List"; // Return a message if the name is not found
    }

     updateInitiativeListFromSyncMessage(initiativeData) {
        // Ensure the initiativeData is an object and has the expected structure
         console.log(initiativeData);
        if (initiativeData && initiativeData.type === "fetchini") {
            //This is the NON-GM ini list
            const initiativeListDiv = document.getElementById('ini-list');

            // Clear the previous content
            initiativeListDiv.innerHTML = '';

            // Append the new message to the ini-list div
            if(initiativeData.message){
                initiativeListDiv.innerHTML = initiativeData.message;
            } else {
                // Create a pre element to display the message with proper formatting
                const messageSpan = document.createElement('span');
                messageSpan.textContent = 'Aktuell kein aktiver Initiative Durchgang.';
                initiativeListDiv.appendChild(messageSpan);
            }
            //Update TurnMeter
            const name = this.ownInitiativeName.value;
            this.ownInitiativeTurnMeter.innerHTML = this.getNextTurn(name, initiativeData);
        } else {
            console.log("Invalid initiative data:", initiativeData);
        }
    }


    toggleIniManager() {
        if (this.canGM || isGM) {
            this.iniSection.style.display = 'block';
        }
    }

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
}

