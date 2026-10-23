(() => {
  const $ = (s) => document.querySelector(s);
  const messages = $("#messages");
  const prompt = $("#prompt");
  const status = $("#status");
  const title = $("#chat-title");
  const form = $("#chat-form");
  const sendButton = form.querySelector('button[type="submit"]');
  let mode = "Code";
  let history = [];
  const modeInstructions = {
    Code: "You are VAELIS, a capable coding assistant. Help write, explain, debug, and review code. Ask for missing details when needed. Use clear examples.",
    Learn: "You are VAELIS, a patient tutor. Explain concepts clearly, step by step, with examples suited to the user's level.",
    Explore: "You are VAELIS, a helpful general-knowledge assistant. Be accurate, distinguish uncertainty, and do not invent facts.",
    Play: "You are VAELIS, a playful and friendly assistant for riddles, word games, quizzes, and creative fun."
  };

  function addMessage(text, role) {
    const node = document.createElement("div");
    node.className = `message ${role}`;
    node.textContent = text;
    messages.appendChild(node);
    messages.scrollTop = messages.scrollHeight;
    return node;
  }
  function setBusy(busy) {
    sendButton.disabled = busy;
    sendButton.textContent = busy ? "Thinking…" : "Send ↗";
    prompt.disabled = busy;
  }
  function welcomeText() {
    return `Hey! I'm VAELIS. You're in ${mode} mode. Ask me anything to get started.`;
  }

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.mode;
      document.querySelectorAll("[data-mode]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("selected", active);
        item.setAttribute("aria-pressed", String(active));
      });
      title.textContent = `${mode} chat`;
      status.textContent = `Ready · ${mode} mode`;
      prompt.placeholder = ({
        Code: "Ask about code or paste an error...",
        Learn: "What topic would you like explained?",
        Explore: "Ask a general knowledge question...",
        Play: "Ask for a riddle or a game..."
      })[mode];
    });
  });

  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      prompt.value = button.dataset.prompt;
      prompt.focus();
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = prompt.value.trim();
    if (!value) { status.textContent = "Type a message first."; return; }
    if (value.length > 5000) { status.textContent = "Please keep messages under 5,000 characters."; return; }

    addMessage(value, "user");
    prompt.value = "";
    setBusy(true);
    status.textContent = "VAELIS is thinking…";
    const waiting = addMessage("Thinking…", "assistant");

    try {
      const response = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: value, mode, history: history.slice(-12) })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
      if (!data.reply || typeof data.reply !== "string") throw new Error("The AI returned an empty response. Please try again.");
      waiting.textContent = data.reply;
      history.push({ role: "user", text: value }, { role: "model", text: data.reply });
      history = history.slice(-12);
      status.textContent = `Connected · ${mode} mode`;
    } catch (error) {
      waiting.textContent = `I couldn't get an AI response. ${error.message || "Please try again later."}`;
      status.textContent = "Connection error";
    } finally {
      setBusy(false);
      prompt.focus();
    }
  });

  $("#new-chat").addEventListener("click", () => {
    history = [];
    messages.replaceChildren();
    addMessage(welcomeText(), "assistant");
    status.textContent = `New chat · ${mode} mode`;
  });

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();