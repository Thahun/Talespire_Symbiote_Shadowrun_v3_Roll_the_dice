/**
 * The Helm class provides various functionalities for handling chat and sync messages,
 * managing GM box, and communicating with TaleSpire sync and chat services.
 */
class Helm {
    constructor() {
        //console.log("Hello Helm!");

        // Initialize GM box and connect breadcrumbs
        this.GmBox = document.getElementById('gm-box-body');
        this.ConnectBreadcrumb = document.querySelectorAll('.breadcrumb');
    }

    /**
     * Parses a 'setini!' command from the message body.
     * @param {string} body - The message body containing the command.
     * @returns {Object|null} Parsed object containing name and initiativeValue or null if invalid.
     */
    parseSetIni(body) {
        const parts = body.trim().split(' ');

        // Validate command
        if (parts[0] !== "setini!") {
            console.error("Invalid command. Expected 'setini!'.");
            return null;
        }

        // Validate and assign name
        const name = parts[1];
        if (!name) {
            console.error("Name is required.");
            return null;
        }

        // Validate and assign initiative value
        const initiativeValue = parts[2];
        if (!initiativeValue) {
            console.error("Initiative value is required.");
            return null;
        }

        const initiativeRegex = /^(\d+|\d+d\d+(\+\d+)?)$/;
        if (!initiativeRegex.test(initiativeValue)) {
            console.error("Invalid initiative value format. Must be a number or in the form '1d6+9' or '3d6+14'.");
            return null;
        }

        return { name, initiativeValue };
    }

    /**
     * Parses incoming chat messages and triggers appropriate actions based on the command.
     * @param {Object} message - The chat message object.
     */
    parseChatMessage(message) {
        // Ensure the message is an object and has the expected structure
        if (message && message.kind === "chatMessageReceived" && message.payload) {
            const { body } = message.payload;

            // Extract the command part of the body
            const command = body.split(' ')[0];

            // Handle different commands using a switch statement
            switch (command) {
                case "ri!":
                    //console.log("Roll initiative command received.", command, body);
                    diceService.rollInitiativeDices();
                    break;
                case "help!":
                    //console.log("Help command received.", command, body);
                    this.sendChatMessage("Roll ini:  ri!", [message.payload.senderPlayerId]);
                    break;
                default:
                    //console.log("Chat message received but no action triggered:", body);
                    break;
            }
        } else {
            console.error("Invalid message structure:", message);
        }
    }

    /**
     * Parses incoming sync messages and triggers appropriate actions based on the message type.
     * @param {Object} message - The sync message object.
     */
    parseSyncMessage(message) {
        //console.log("parseSyncMessage", message);
        // Ensure the message is an object and has the expected structure
        if (message && message.kind === "syncMessageReceived" && message.payload) {
            const { str, fromClient } = message.payload;
            if (str && fromClient && fromClient.player) {
                const { id: playerId, name: playerName } = fromClient.player;
                //console.log(`Message received from ${playerName} (${playerId}): ${str}`);

                // Parse the string payload to JSON
                let payloadData;
                try {
                    payloadData = JSON.parse(str);
                } catch (error) {
                    console.error("Failed to parse payload string:", str);
                    return;
                }

                // Check the type and trigger the corresponding function
                if (payloadData.type) {
                    switch (payloadData.type) {
                        case "off":
                            info.show("The GM Sent you a throw!: " + payloadData.name);
                            this.handleOffType(payloadData);
                            break;
                        case "open":
                            info.show("The GM Sent you a throw!: " + payloadData.name);
                            this.handleOpenType(payloadData);
                            break;
                        case "dev":
                            info.show("The GM Sent you a throw!: " + payloadData.name);
                            this.handleDevType(payloadData);
                            break;
                        case "dicelog":
                            payloadData.playerName = playerName;
                            payloadData.playerId = playerId;
                            this.handleDiceLog(payloadData);
                            break;
                        case "setini":
                            if (iniAndGmManager.canGM) {
                                //console.log("setini:", payloadData);
                                this.handleSetIniType(payloadData);
                            }
                            break;
                        case "fetchini":
                            //console.log("fetchini:", payloadData);
                            iniAndGmManager.updateInitiativeListFromSyncMessage(payloadData);
                            break;
                        default:
                            console.error("Unknown type:", payloadData.type);
                    }
                } else {
                    console.error("Payload does not contain type:", payloadData);
                }
            } else {
                console.error("Invalid message payload structure:", message.payload);
            }
        } else {
            console.error("Invalid message structure:", message);
        }
    }

    /**
     * Handles the 'setini' type messages.
     * @param {Object} payload - The message payload containing the type and message.
     */
    handleSetIniType(payload) {
        if (payload && payload.type === "setini" && Array.isArray(payload.message)) {
            const [namePart, initiativeValue] = payload.message;

            // Extract name between quotes
            const nameMatch = namePart.match(/"([^"]+)"/);
            const name = nameMatch ? nameMatch[1] : null;

            // Assign initiative value
            const initiative = initiativeValue;

            if (name && !isNaN(initiative)) {
                //console.log("Name:", name);
                //console.log("Initiative:", initiative);
                iniAndGmManager.addInitiative(name, initiative.toString());
            } else {
                console.error("Invalid payload message format:", payload.message);
            }
        } else {
            console.error("Invalid payload structure:", payload);
        }
    }

    /**
     * Handles the 'off' type messages.
     * @param {Object} payload - The message payload containing the dice set information.
     */
    handleOffType(payload) {
        //console.log("Handling OFF type:", payload);
        diceService.sectionDiceSets.addDiceSet(payload.name, payload.mw, payload.amount, payload.dmg, payload.bullets, true);
    }

    /**
     * Handles the 'open' type messages.
     * @param {Object} payload - The message payload containing the dice set information.
     */
    handleOpenType(payload) {
        //console.log("Handling OPEN type:", payload);
        diceService.sectionDiceSets.addDiceSet(payload.name, 0, payload.amount, "-", 1, true);
    }

    /**
     * Handles the 'dev' type messages.
     * @param {Object} payload - The message payload containing the dice set information.
     */
    handleDevType(payload) {
        //console.log("Handling DEV type:", payload);
        diceService.sectionDiceSets.addDefenceDiceSet(payload.name, payload.mw, payload.amount, payload.dmg, true);
    }

    /**
     * Handles the 'dicelog' type messages.
     * @param {Object} payload - The message payload containing the log information.
     */
    handleDiceLog(payload) {
        //console.log("Handling LOG type:", payload);
        diceService.addMessageToLog(payload);
    }

    /**
     * Sends a sync message to specified recipients.
     * @param {string} message - The message to be sent.
     * @param {Array} to - The recipients of the message.
     */
    SendSyncMessage(message, to) {
        //console.log("sync message", message);
        try {
            if (to.includes("board")) {
                TS.sync.send(message, "board");
            } else {
                to.forEach(recipient => {
                    //console.log("sync rec", recipient);
                    TS.sync.send(message, recipient);
                });
            }
        } catch (error) {
            //console.log("Failed to send: ", error);
        }
    }

    /**
     * Sends a chat message to specified recipients.
     * @param {string} message - The chat message to be sent.
     * @param {Array} to - The recipients of the message.
     */
    sendChatMessage(message, to) {
        //console.log("chat message", message, "TOs", to);
        try {
            if (to.includes("board")) {
                TS.chat.send(message, "board");
            } else {
                to.forEach(recipient => {
                    //console.log("recip", recipient);
                    TS.chat.send(message, recipient);
                });
            }
        } catch (error) {
            //console.log("Failed to send chat message: ", error);
        }
    }

    /**
     * Displays connected clients in the GM box.
     */
    async displayConnected() {
        try {
            const clients = await this.fetchConnectedClients();
            clients.unshift({ id: "board", name: "board", playerId: "board" }); // Add "board" as the first item
            //console.log("Client names:", clients);
            this.displayClientNames(clients);
        } catch (error) {
            console.error("Failed to get client names:", error);
        }
    }

    /**
     * Fetches the list of connected clients from TaleSpire.
     * @returns {Array} The list of connected clients.
     * @throws Will throw an error if fetching clients fails.
     */
    async fetchConnectedClients() {
        try {
            const clients = await TS.sync.getClientsConnected();
            //console.log("raw clients", clients);

            //console.log("Connected clients:", clientNames);
            return clients.map(client => ({
                id: client.id,
                name: client.player.name,
                playerId: client.player.id
            }));
        } catch (error) {
            console.error("Error fetching clients:", error);
            throw error;
        }
    }

    /**
     * Displays the list of client names in the GM box.
     * @param {Array} clients - The list of clients to be displayed.
     */
    displayClientNames(clients) {
        this.GmBox.innerHTML = ''; // Clear previous content

        clients.forEach(client => {
            const truncatedName = client.name.length > 10 ? client.name.substring(0, 10) + '...' : client.name;

            const breadcrumbContainer = document.createElement('div');
            breadcrumbContainer.className = 'breadcrumb-container';

            const breadcrumb = document.createElement('span');
            breadcrumb.className = 'breadcrumb';
            breadcrumb.textContent = truncatedName;

            const hiddenInput = document.createElement('input');
            hiddenInput.type = 'hidden';
            hiddenInput.value = client.id;
            hiddenInput.name = `breadcrumb-${client.name}`;

            const hiddenInputPlayerChatId = document.createElement('input');
            hiddenInputPlayerChatId.type = 'hidden';
            hiddenInputPlayerChatId.value = client.playerId;
            hiddenInputPlayerChatId.name = `breadcrumb-chatID-${client.name}`;

            breadcrumb.onclick = () => this.toggleBreadcrumbSelection(breadcrumb);

            breadcrumbContainer.appendChild(breadcrumb);
            breadcrumbContainer.appendChild(hiddenInput);
            breadcrumbContainer.appendChild(hiddenInputPlayerChatId);

            this.GmBox.appendChild(breadcrumbContainer);
        });
    }

    /**
     * Toggles the selection state of a breadcrumb.
     * @param {HTMLElement} breadcrumb - The breadcrumb element to toggle.
     */
    toggleBreadcrumbSelection(breadcrumb) {
        breadcrumb.classList.toggle('selected');
    }
}

/**
 * Handles the sync message event.
 * @param {Object} event - The sync message event object.
 */
function onSyncMessage(event) {
    //console.log("onSyncMessage", event);
    helm.parseSyncMessage(event);
}

/**
 * Handles the chat message event.
 * @param {Object} event - The chat message event object.
 */
function onChatMessage(event) {
    //console.log("onChatMessage", event);
    helm.parseChatMessage(event);
}
