let playerId = "";
let isFirst = false;
let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");
let isDrawing = false;
let gameStarted = false;
let hasSubmitted = false;
let roomCode = null;

let currentTool = "pen";
let currentColor = "black";
let currentLineWidth = 7;

function setTool(tool) {
    currentTool = tool;

    ["penBtn", "eraserBtn", "colorBtn", "clearBtn"].forEach(id => {
        document.getElementById(id).classList.remove("active");
    });

    if (tool === "pen") {
        ctx.strokeStyle = currentColor;
        document.getElementById("penBtn").classList.add("active");
    } else if (tool === "eraser") {
        ctx.strokeStyle = "#f0f0f0";
        document.getElementById("eraserBtn").classList.add("active");
    }
}

function setupCanvas() {
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = currentLineWidth;
    ctx.strokeStyle = currentTool === "eraser" ? "#f0f0f0" : currentColor;
}

setupCanvas();

function disableAllControls() {
    ["penBtn", "colorBtn", "eraserBtn", "clearBtn"].forEach(id => {
        document.getElementById(id).disabled = true;
    });

    document.querySelectorAll(".canvas-footer button").forEach(btn => {
        btn.disabled = true;
    });
}

function enableAllControls() {
    ["penBtn", "colorBtn", "eraserBtn", "clearBtn"].forEach(id => {
        document.getElementById(id).disabled = false;
    });

    document.querySelectorAll(".canvas-footer button").forEach(btn => {
        btn.disabled = false;
    });
}

function getCorrectedCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
        offsetX: (e.clientX - rect.left) * scaleX,
        offsetY: (e.clientY - rect.top) * scaleY
    };
}

document.addEventListener("click", (event) => {
    const isToolButton = event.target.closest(".toolbox button");
    const isMenu = event.target.closest("#thicknessMenu") || event.target.closest("#colorMenu");

    if (!isToolButton && !isMenu) {
        document.getElementById("thicknessMenu").style.display = "none";
        document.getElementById("colorMenu").style.display = "none";
    }
});

document.getElementById("colorBtn").addEventListener("click", () => {
    toggleColorMenu();
});

canvas.onmousedown = function (e) {
    if (!gameStarted) return;
    isDrawing = true;

    const { offsetX, offsetY } = getCorrectedCoords(e);
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
};

canvas.addEventListener("mouseup", function () {
    if (!gameStarted) return;
    isDrawing = false;
});

canvas.onmousemove = function (e) {
    if (isDrawing && gameStarted) {
        const { offsetX, offsetY } = getCorrectedCoords(e);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
    }
};

canvas.addEventListener("touchstart", function (e) {
    if (!gameStarted) return;
    e.preventDefault();

    const isToolButton = e.target.closest(".toolbox button");
    const isMenu = e.target.closest("#thicknessMenu") || e.target.closest("#colorMenu");

    if (!isToolButton && !isMenu) {
        document.getElementById("thicknessMenu").style.display = "none";
        document.getElementById("colorMenu").style.display = "none";
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.touches[0].clientX - rect.left) * scaleX;
    const y = (e.touches[0].clientY - rect.top) * scaleY;

    isDrawing = true;

    ctx.beginPath();
    ctx.moveTo(x, y);
}, { passive: false });

canvas.addEventListener("touchmove", function (e) {
    if (!isDrawing || !gameStarted) return;
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.touches[0].clientX - rect.left) * scaleX;
    const y = (e.touches[0].clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
}, { passive: false });

canvas.addEventListener("touchend", function () {
    if (!gameStarted) return;
    isDrawing = false;
}, { passive: false });

document.getElementById("clearBtn").addEventListener("click", () => {
    setupCanvas();
});

let lastClicked = "";

document.getElementById("penBtn").addEventListener("click", () => {
    if (currentTool === "pen" && lastClicked === "pen") {
        toggleThicknessMenu("pen");
    } else {
        setTool("pen");
        lastClicked = "pen";
        hideThicknessMenu();
    }
});

document.getElementById("eraserBtn").addEventListener("click", () => {
    if (currentTool === "eraser" && lastClicked === "eraser") {
        toggleThicknessMenu("eraser");
    } else {
        setTool("eraser");
        lastClicked = "eraser";
        hideThicknessMenu();
    }
});

function toggleColorMenu() {
    const menu = document.getElementById("colorMenu");
    const triggerBtn = document.getElementById("colorBtn");
    const rect = triggerBtn.getBoundingClientRect();

    menu.style.display = "grid";
    menu.style.visibility = "hidden";

    const top = rect.top + window.scrollY - menu.offsetHeight - 8;
    const left = rect.left + window.scrollX + (rect.width / 2) - (menu.offsetWidth / 2);

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;

    menu.style.visibility = "visible";
    menu.style.display = "grid";

    if (menu.dataset.open === "true") {
        menu.style.display = "none";
        menu.dataset.open = "false";
    } else {
        menu.style.display = "grid";
        menu.dataset.open = "true";

        const closeOnClickOutside = (e) => {
            if (!menu.contains(e.target) && e.target !== triggerBtn) {
                menu.style.display = "none";
                menu.dataset.open = "false";
                document.removeEventListener("click", closeOnClickOutside);
            }
        };
        setTimeout(() => document.addEventListener("click", closeOnClickOutside), 0);
    }
    document.getElementById("thicknessMenu").style.display = "none";
}

document.querySelectorAll(".colorOption").forEach(btn => {
    btn.addEventListener("click", () => {
        const newColor = btn.dataset.color;
        currentColor = newColor;
        if (currentTool === "pen") {
            ctx.strokeStyle = currentColor;
        }
        document.getElementById("colorMenu").style.display = "none";
    });
});

function toggleThicknessMenu(tool) {
    const menu = document.getElementById("thicknessMenu");
    const button = tool === "pen" ? document.getElementById("penBtn") : document.getElementById("eraserBtn");
    const container = document.querySelector(".container");

    if (menu.style.display === "flex" && menu.dataset.tool === tool) {
        menu.style.display = "none";
        menu.dataset.tool = "";
        return;
    }

    const sizes = [
        { label: "⬤", value: tool === "pen" ? 11 : 22 },
        { label: "●", value: tool === "pen" ? 7 : 14 },
        { label: "•", value: tool === "pen" ? 3 : 6 }
    ];

    menu.innerHTML = "";
    sizes.forEach(({ label, value }) => {
        const btn = document.createElement("button");
        btn.className = "popup-option";
        btn.style.width = "40px";
        btn.style.height = "40px";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.style.fontWeight = "bold";
        btn.style.fontSize = "14px";
        btn.innerText = label;

        btn.onclick = () => {
            ctx.lineWidth = value;
            menu.style.display = "none";
            menu.dataset.tool = "";
        };
        menu.appendChild(btn);
    });

    const btnRect = button.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const offsetLeft = btnRect.left - containerRect.left + btnRect.width / 2 - 50;
    const offsetTop = btnRect.top - containerRect.top - menu.offsetHeight - 10;

    menu.style.position = "absolute";
    menu.style.left = `${offsetLeft}px`;
    menu.style.top = `${offsetTop}px`;
    menu.style.display = "flex";
    menu.style.flexDirection = "column";
    menu.dataset.tool = tool;

    const outsideClick = (e) => {
        if (!menu.contains(e.target) && e.target !== button) {
            menu.style.display = "none";
            menu.dataset.tool = "";
            document.removeEventListener("click", outsideClick);
        }
    };
    setTimeout(() => document.addEventListener("click", outsideClick), 0);
}

function hideThicknessMenu() {
    document.getElementById("thicknessMenu").style.display = "none";
}

document.querySelectorAll(".thicknessOption").forEach(btn => {
    btn.addEventListener("click", () => {
        currentLineWidth = parseInt(btn.dataset.size);
        ctx.lineWidth = currentLineWidth;
        hideThicknessMenu();
    });
});

async function joinGame() {
    const res = await fetch("/api/join", { method: "POST" });
    const data = await res.json();
    playerId = data.playerId;
    isFirst = data.isFirst;
    roomCode = data.roomCode;

    document.getElementById("room-code").innerText = `Room ID: ${roomCode}`;

    console.log("playerId =", playerId, "isFirst =", isFirst, "roomCode =", roomCode);
}

async function setupGame() {
    const word = document.getElementById("word").value.trim();
    const time = parseInt(document.getElementById("time").value);

    if (!playerId || !word || isNaN(time) || time <= 0) {
        alert("Please enter the word and the time (in seconds)!");
        return;
    }

    const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, word, timeLimitSeconds: time })
    });

    if (res.ok) {
        document.getElementById("setup-section").style.display = "none";
        await waitForSecondPlayer();
    } else {
        const msg = await res.text();
        alert("Setup failed: " + msg);
    }
}

async function waitForSecondPlayer() {
    document.getElementById("result").innerText = "Waiting for the second player...";
    while (true) {
        const res = await fetch(`/api/canstart/${playerId}`);
        if (res.ok) {
            const canStart = await res.json();
            if (canStart === true) break;
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    document.getElementById("result").innerText = "Let the game begin! Draw!";
    gameStarted = true;
    enableAllControls();
    startSyncedCountdown();
}

async function startSyncedCountdown() {
    const res = await fetch(`/api/gametime/${playerId}`);
    if (!res.ok) return;

    const data = await res.json();
    const start = new Date(data.start);
    const duration = data.duration;
    const word = data.word;
    const end = new Date(start.getTime() + duration * 1000);

    document.getElementById("task").innerHTML = `Draw Better: <font size="6"><strong>${word}</strong></font>`;

    const timer = setInterval(() => {
        if (hasSubmitted) {
            clearInterval(timer);
            return;
        }

        const now = new Date();
        const secondsLeft = Math.round((end - now) / 1000);

        if (secondsLeft <= 0) {
            clearInterval(timer);
            submitDrawing();
        } else {
            document.getElementById("result").innerText = `Remained time: ${secondsLeft} s`;
        }
    }, 1000);
}

async function submitDrawing() {
    if (!gameStarted || hasSubmitted) return;
    hasSubmitted = true;
    gameStarted = false;

    const image = canvas.toDataURL().split(",")[1];
    await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: playerId, imageBase64: image })
    });

    document.getElementById("toolbox").classList.add("disabled");
    document.getElementById("submitBtn").disabled = true;

    document.getElementById("result").innerText = "Nice! Waiting for the enemy...";
    pollForResult();
}

async function pollForResult() {
    const poll = setInterval(async () => {
        const res = await fetch("/api/result/" + playerId);
        if (res.status === 200) {
            const outcome = await res.json();

            const resultText = outcome.result === "YouWin" ? "You Win!" : "You Lose!";
            const resultClass = outcome.result === "YouWin" ? "win-text" : "lose-text";

            const resultElem = document.getElementById("result");
            resultElem.innerText = resultText;
            resultElem.className = resultClass;

            document.getElementById("resultDetails").style.display = "flex";

            document.getElementById("yourImage").src = "data:image/png;base64," + outcome.images[playerId];
            document.getElementById("yourLabels").innerHTML =
                outcome.labels[playerId].map(l => `<li>${l}</li>`).join("");

            const otherId = Object.keys(outcome.images).find(id => id !== playerId);
            document.getElementById("opponentImage").src = "data:image/png;base64," + outcome.images[otherId];
            document.getElementById("opponentLabels").innerHTML =
                outcome.labels[otherId].map(l => `<li>${l}</li>`).join("");

            document.getElementById("submitBtn").disabled = true;
            document.getElementById("toolbox").classList.add("disabled");

            clearInterval(poll);
        }
    }, 2000);
}

async function waitForSetup() {
    document.getElementById("result").innerText = "Waiting for the first player to setup the game...";
    while (true) {
        const res = await fetch("/api/hassetup/" + playerId);
        if (res.ok) {
            const has = await res.json();
            if (has) break;
        } else {
            console.warn("Setup check failed with status:", res.status);
        }
        await new Promise(r => setTimeout(r, 2000));
    }
    await waitForSecondPlayer();
}

async function resetGame() {
    document.getElementById("toolbox").classList.remove("disabled");
    await fetch("/api/reset", { method: "POST" });
    location.reload();
}

window.onload = async () => {
    await joinGame();

    disableAllControls();

    if (isFirst) {
        document.getElementById("setup-section").style.display = "block";
    } else {
        await waitForSetup();
    }
};