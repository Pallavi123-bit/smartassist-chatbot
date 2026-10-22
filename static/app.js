
const chatBox = document.getElementById("chat-box");
const form = document.getElementById("chat-form");
const input = document.getElementById("message");
const sendButton = document.getElementById("send-button");
const newChatButton = document.getElementById("new-chat");
const clearChatButton = document.getElementById("clear-chat");

let conversationId = createConversationId();

function createConversationId() {
    return crypto.randomUUID();
}

function addMessage(role, content) {
    const welcome = document.getElementById("welcome");
    if (welcome) welcome.remove();

    const message = document.createElement("div");
    message.className = `message ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = role === "user" ? "Y" : "✦";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    // Use textContent to display text safely.
    bubble.textContent = content;

    message.appendChild(avatar);
    message.appendChild(bubble);
    chatBox.appendChild(message);

    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage(text) {
    const message = text.trim();
    if (!message) return;

    addMessage("user", message);
    input.value = "";
    input.style.height = "auto";
    sendButton.disabled = true;

    const typing = document.createElement("div");
    typing.className = "typing";
    typing.textContent = "SmartAssist is thinking...";
    chatBox.appendChild(typing);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                message: message,
                conversation_id: conversationId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Unable to get a response.");
        }

        addMessage("assistant", data.reply);
    } catch (error) {
        addMessage("assistant", error.message || "Something went wrong.");
    } finally {
        typing.remove();
        sendButton.disabled = false;
        input.focus();
    }
}

form.addEventListener("submit", function(event) {
    event.preventDefault();
    sendMessage(input.value);
});

input.addEventListener("keydown", function(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
    }
});

input.addEventListener("input", function() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 150) + "px";
});

document.querySelectorAll(".suggestion").forEach(function(button) {
    button.addEventListener("click", function() {
        sendMessage(button.textContent);
    });
});

function startNewChat() {
    conversationId = createConversationId();
    chatBox.innerHTML = `
        <div class="welcome" id="welcome">
            <div class="welcome-icon">✦</div>
            <h1>How can I help you today?</h1>
            <p>Ask a question or choose a suggestion to get started.</p>
            <div class="suggestions">
                <button class="suggestion">Explain Python in simple words</button>
                <button class="suggestion">Give me project ideas</button>
                <button class="suggestion">Help me prepare for interviews</button>
            </div>
        </div>
    `;

    document.querySelectorAll(".suggestion").forEach(function(button) {
        button.addEventListener("click", function() {
            sendMessage(button.textContent);
        });
    });

    input.value = "";
    input.focus();
}

newChatButton.addEventListener("click", startNewChat);
clearChatButton.addEventListener("click", startNewChat);
