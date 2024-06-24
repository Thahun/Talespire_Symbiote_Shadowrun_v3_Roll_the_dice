class InitiativeManager {
    constructor(storage) {
        this.initiativeData = [];
        this.init();

        this.storage = storage;
    }

    init() {
        // Get elements
        this.nameInput = document.getElementById('player-npc-rolls-name');
        this.initiativeInput = document.getElementById('player-npc-rolls-init');
        this.addButton = document.getElementById('player-npc-rolls-add');
        this.subtractButton = document.getElementById('player-npc-rolls-subtract');
        this.rollButton = document.getElementById('roll-initiative-button');
        this.textarea = document.getElementById('player-npc-rolls-text');

        // Add event listeners
        this.addButton.addEventListener('click', () => this.addInitiative());
        this.subtractButton.addEventListener('click', () => this.subtractInitiative());
        this.rollButton.addEventListener('click', () => this.showInitiatives());
    }

    addInitiative() {
        console.log("clicked");
        const name = this.nameInput.value.trim();
        const initiativeString = this.initiativeInput.value.trim();
        console.log(name, initiativeString);

        if (name && initiativeString) {
            this.initiativeData.push({ name, initiative: initiativeString });
            this.clearInputs();
        } else {
            alert('Please enter valid name and initiative.');
        }
        console.log(this.initiativeData);
    }


    subtractInitiative() {
        const name = this.nameInput.value.trim();

        if (name) {
            this.initiativeData = this.initiativeData.filter(data => data.name !== name);
            this.clearInputs();
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

        // Repeat until all initiatives are less than 10
        let round = 1;
        while (this.initiativeData.some(data => data.calculatedInitiative > 0)) {
            // Filter out those with positive initiative and sort them
            let currentRound = this.initiativeData
                .filter(data => data.calculatedInitiative > 0)
                .sort((a, b) => b.calculatedInitiative - a.calculatedInitiative);

            // Add current round to final list
            currentRound.forEach(data => {
                finalList.push(`[${data.calculatedInitiative}] ${data.name} (${data.initiative})`);
            });

            // Reduce initiative by 10 for the next round
            this.initiativeData.forEach(data => {
                if (data.calculatedInitiative > 0) {
                    data.calculatedInitiative -= 10;
                }
            });

            round++;
        }

        // Display the final list in the textarea
        let displayText = '[Roll] Player or NPC (Mod)\n========================\n';
        displayText += finalList.join('\n') + '\n';
        displayText += '========================\n';

        this.textarea.value = displayText;
    }


    clearInputs() {
        this.nameInput.value = '';
        this.initiativeInput.value = '';
    }
}
