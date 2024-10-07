const sleep = ms => new Promise(r => setTimeout(r, ms));

class DebugBox {
    divDebug;
    preDebugLog;
    active;

    constructor(active = false) {
        this.divDebug = document.getElementById("debug");
        this.preDebugLog = document.getElementById("debug-log");
        this.active = active;
        this.log("Debug class loaded");
    }

    log(msg) {
        if(this.active == false) {
            return;
        }
        this.showDebugLog()
        let currentLog = this.preDebugLog.textContent;
        let newLog;
        if(currentLog == "") {
            newLog = msg;
        } else {
            newLog = currentLog + "\n" + msg;
        }
        this.preDebugLog.textContent = newLog;
    }

    showDebugLog() {
        this.divDebug.style.display = "block";
    }

    hideDebugLog() {
        this.divDebug.style.display = "none";
    }

    toggleSection(element) {
        debug.log("Debug.toggleSection");
        let currentState = this.determineSectionState(element);
        let sectionBody = element.parentElement.getElementsByClassName("debug-log")[0];
        let openIcon = element.getElementsByClassName("debug-open")[0];
        let closeIcon = element.getElementsByClassName("debug-close")[0];
        if(currentState == 1) {
            sectionBody.style.display = 'none';
            openIcon.style.display = 'block';
            closeIcon.style.display = 'none';
        } else {
            sectionBody.style.display = 'block';
            openIcon.style.display = 'none';
            closeIcon.style.display = 'block';
        }
    }

    /**
     * Determine if section is open(1) or closed(0)
     * 
     * @param {*} element 
     * @returns int
     */
    determineSectionState(element) {
        debug.log("Debug.determineSectionState");
        let openIcon = element.getElementsByClassName("debug-open")[0];
        if(openIcon.style.display == 'none') {
            return 1;
        } else {
            return 0;
        }
    }
}

class ErrorBox {
    divError;
    preErrorMessage;

    constructor() {
        this.divError = document.getElementById("error");
        this.preErrorMessage = document.getElementById("error-message");
        debug.log("Error class loaded");
    }

    show(msg) {
        this.divError.style.display = "block";
        this.preErrorMessage.textContent = msg;
    }

    hide() {
        this.divError.style.display = "none";
        this.preErrorMessage.textContent = "";
    }
}

class InfoBox {
    divInfo;
    spanInfoMessage;
    buttonInfo;
    currentSuccesses; // To store the current successes
    hideTimeout; // To store the timeout ID
    timerElement; // To reference the timer element

    constructor() {
        this.divInfo = document.getElementById("info");
        this.spanInfoMessage = document.getElementById("info-message");
        this.buttonInfo = document.getElementById("info-button");
        this.timerElement = document.getElementById("info-timer"); // Initialize the timer element
        this.currentSuccesses = 0; // Initialize with 0

        debug.log("Info class loaded");

        // Event listener for button
        this.buttonInfo.addEventListener("click", () => {
            debug.log("Info button clicked");
            diceService.repeatLastRoll(this.currentSuccesses); // Pass the current successes
        });
    }

    show(msg, showButton = false, successes = 0) {
        boot.playSoundById("message-sound",0.3);

        this.divInfo.style.display = "block";
        this.spanInfoMessage.textContent = msg;
        this.currentSuccesses = successes; // Update the current successes

        if (showButton) {
            this.buttonInfo.style.display = "inline-block"; // Show the button
            this.timerElement.style.display = "none"; // Hide the timer element
        } else {
            this.buttonInfo.style.display = "none"; // Hide the button
            this.timerElement.style.display = "block"; // Show the timer element

            // Add the timer fill element
            this.timerElement.innerHTML = '<div class="info-timer-fill"></div>';

            // Clear any existing timeout to avoid multiple timers
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
            }

            // Set a timeout to hide the info box after 30 seconds
            this.hideTimeout = setTimeout(() => {
                this.hide();
            }, 30000);
        }
    }

    hide() {
        this.divInfo.style.display = "none";
        this.spanInfoMessage.textContent = "";
        this.buttonInfo.style.display = "none"; // Hide the button
        this.currentSuccesses = 0; // Reset the current successes

        // Clear the timer element
        this.timerElement.innerHTML = '';

        // Clear the timeout when hiding manually
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }
}

class VersionSegments {
    mayor;
    minor;
    hotfix;

    /**
     * @param {String} version 
     */
    constructor(
        version
    ) {
        let versionSegments = version.split('.');
        this.mayor = versionSegments[0];
        this.minor = versionSegments[1];
        this.hotfix = versionSegments[2];
    }
}


function logSymbioteEvent(event) {
    console.log(event);
}