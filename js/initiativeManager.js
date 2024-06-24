class InitiativeManager {
    constructor(storage) {
        this.initiativeData = [];
        this.storage = storage;
        this.currentIndex = -1; // Track the current index for "Next" and "Prev"
        this.init();
    }

    async init() {
        // Get elements
        this.nameInput = document.getElementById('player-npc-rolls-name');
        this.initiativeInput = document.getElementById('player-npc-rolls-init');
        this.addButton = document.getElementById('player-npc-rolls-add');
        this.subtractButton = document.getElementById('player-npc-rolls-subtract');
        this.rollButton = document.getElementById('roll-initiative-button');
        this.nextButton = document.getElementById('next-button');
        this.prevButton = document.getElementById('prev-button');
        this.textarea = document.getElementById('player-npc-rolls-text');
        this.breadcrumbsContainer = document.getElementById('breadcrumbs');
        this.sendButton = document.getElementById('send-initiative-button');


        // Add event listeners
        this.addButton.addEventListener('click', () => this.addInitiative());
        this.subtractButton.addEventListener('click', () => this.subtractInitiative());
        this.rollButton.addEventListener('click', () => this.showInitiatives());
        this.nextButton.addEventListener('click', () => this.nextInitiative());
        this.prevButton.addEventListener('click', () => this.prevInitiative());
        this.sendButton.addEventListener('click', () => this.sendInitiativeMessage());


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

        this.loadInitiativeData();
    }

    addInitiative() {
        const name = this.nameInput.value.trim();
        const initiativeString = this.initiativeInput.value.trim();

        if (name && initiativeString) {
            const existingEntry = this.initiativeData.find(data => data.name === name);
            if (existingEntry) {
                existingEntry.initiative = initiativeString;
            } else {
                this.initiativeData.push({ name, initiative: initiativeString });
                this.addBreadcrumb(name);
            }
            this.clearInputs();
            this.persistInitiativeData(); // Persist data whenever it is added
        } else {
            alert('Please enter valid name and initiative.');
        }
    }

    subtractInitiative() {
        const name = this.nameInput.value.trim();

        if (name) {
            this.initiativeData = this.initiativeData.filter(data => data.name !== name);
            this.clearInputs();
            this.updateBreadcrumbs();
            this.persistInitiativeData(); // Persist data whenever it is removed
        } else {
            alert('Please enter a valid name to remove.');
        }
    }

    rollDice(diceString) {
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
            data.calculatedInitiative = this.rollDice(data.initiative);
        });

        let finalList = [];
        let tempInitiativeData = JSON.parse(JSON.stringify(this.initiativeData)); // Deep copy to avoid mutating original data

        // Repeat until all initiatives are less than 10
        while (tempInitiativeData.some(data => data.calculatedInitiative > 0)) {
            // Filter out those with positive initiative and sort them
            let currentRound = tempInitiativeData
                .filter(data => data.calculatedInitiative > 0)
                .sort((a, b) => b.calculatedInitiative - a.calculatedInitiative);

            // Add current round to final list
            currentRound.forEach(data => {
                finalList.push(`[${data.calculatedInitiative}] ${data.name} (${data.initiative})`);
                data.calculatedInitiative -= 10; // Reduce initiative by 10 for the next round
            });
        }

        // Display the final list in the textarea
        let displayText = finalList.join('\n') + '\n';

        this.textarea.innerHTML = displayText.replace(/\n/g, '<br>');
        this.currentIndex = -1; // Reset the current index
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
    }


    addBreadcrumb(name) {
        const breadcrumb = document.createElement('div');
        breadcrumb.className = 'breadcrumb';
        breadcrumb.innerText = name;
        breadcrumb.addEventListener('click', () => this.loadInitiative(name));
        this.breadcrumbsContainer.appendChild(breadcrumb);
    }

    updateBreadcrumbs() {
        this.breadcrumbsContainer.innerHTML = '';
        this.initiativeData.forEach(data => {
            this.addBreadcrumb(data.name);
        });
    }

    loadInitiative(name) {
        const entry = this.initiativeData.find(data => data.name === name);
        if (entry) {
            this.nameInput.value = entry.name;
            this.initiativeInput.value = entry.initiative;
        }
    }

    clearInputs() {
        this.nameInput.value = '';
        this.initiativeInput.value = '';
    }

    persistInitiativeData() {
        let diceSets = this.storage.getStorageAsObject();
        console.log("persist",diceSets);
        diceSets.initiativeData = this.initiativeData;
        this.storage.setStorageAsObject(diceSets);
        symbioteStorage.persist();
    }

    loadInitiativeData() {
        let diceSets = this.storage.getStorageAsObject();
        console.log("load",diceSets);
        console.log("storage",this.storage);
        if (diceSets instanceof DiceSetsDTO) {
            this.initiativeData = diceSets.initiativeData || [];
        }
        this.updateBreadcrumbs();
    }

    sendInitiativeMessage() {
        const lines = this.textarea.innerHTML.split('<br>');
        let message = 'Initiative:\n========================\n';
        lines.forEach(line => {
            if (line.startsWith('<s>') && line.endsWith('</s>')) {
                line = `~~${line.replace(/<\/?s>/g, '')}~~`;
            }
            message += line + '\n';
        });
        message += '========================\n';

        TS.chat.send(message, 'board');
    }


}
