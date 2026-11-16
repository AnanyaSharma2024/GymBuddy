
const contactsContainer = document.querySelector("#chat-contacts");
const messagesContainer = document.querySelector("#chat-messages");
const chatTitle = document.querySelector("#chat-title");
const chatSubtitle = document.querySelector("#chat-subtitle");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatSend = document.querySelector("#chat-send");
const chatNotice = document.querySelector("#chat-notice");

let contacts = [];
let activeContact = null;
let activeConversationId = null;
let currentUserId = null;

const socket = io();

function showNotice(text) {
  chatNotice.textContent = text;
}

function getId(value) {
  if (!value) return "";

  if (value._id) return String(value._id);

  if (typeof value === "string") return value;

  return value.toString();
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    window.location.replace("/login.html");
    throw new Error("Please log in again.");
  }

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Something went wrong.");
  }

  return result;
}

function createAvatar(user) {
  if (user.profileImage) {
    const image = document.createElement("img");
    image.src = user.profileImage;
    image.alt = user.name || "Buddy";
    image.className = "avatar";
    image.style.objectFit = "cover";
    return image;
  }

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = (user.name || "G").charAt(0).toUpperCase();

  return avatar;
}

function renderContacts() {
  contactsContainer.replaceChildren();

  if (contacts.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent =
      "No connected buddies yet. Connect with someone first.";

    contactsContainer.appendChild(empty);
    return;
  }

  contacts.forEach((contact) => {
    const user = contact.user;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "chat-person";

    if (activeContact?.id === user.id) {
      button.classList.add("active");
    }

    const details = document.createElement("span");

    const name = document.createElement("strong");
    name.textContent = user.name || "GymBuddy Member";

    const preview = document.createElement("small");
    preview.className = "muted";

    preview.textContent =
      contact.lastMessage?.text || "No messages yet";

    details.append(name, document.createElement("br"), preview);
    const unreadBadge = document.createElement("span");
unreadBadge.className = "unread-badge";

if (contact.unreadCount > 0) {
  unreadBadge.textContent = contact.unreadCount;
  unreadBadge.style.display = "inline-flex";
} else {
  unreadBadge.style.display = "none";
}

details.appendChild(unreadBadge);
    button.append(createAvatar(user), details);

    button.addEventListener("click", () => selectContact(contact));

    contactsContainer.appendChild(button);
  });
}

function renderMessage(message) {
  const senderId = getId(message.sender);
  const mine = senderId === currentUserId;

  const bubble = document.createElement("div");
  bubble.className = mine ? "bubble mine" : "bubble";

  const text = document.createElement("div");
  text.textContent = message.text;

  const time = document.createElement("small");
  time.className = "muted";
  time.style.display = "block";
  time.style.marginTop = "6px";

  if (message.createdAt) {
    time.textContent = new Date(message.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  bubble.append(text, time);
  bubble.dataset.messageId = getId(message._id);

  messagesContainer.appendChild(bubble);
}

function addMessageOnce(message) {
  const messageId = getId(message._id);

  if (!messageId) return;

  const alreadyExists = Array.from(
    messagesContainer.querySelectorAll("[data-message-id]")
  ).some((element) => element.dataset.messageId === messageId);

  if (alreadyExists) return;

  const empty = messagesContainer.querySelector("#chat-empty");
  empty?.remove();

  renderMessage(message);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function loadMessages(conversationId) {
  const result = await apiRequest(
    `/api/conversations/${encodeURIComponent(conversationId)}/messages?limit=50`
  );

  messagesContainer.replaceChildren();

  const messages = Array.isArray(result.data) ? result.data : [];

  if (messages.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.id = "chat-empty";
    empty.textContent = "No messages yet. Say hello!";

    messagesContainer.appendChild(empty);
  } else {
    messages.forEach(renderMessage);
  }

  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  await apiRequest(
    `/api/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: "PATCH" }
  );
}

async function selectContact(contact) {
  try {
    activeContact = contact.user;
    renderContacts();

    chatTitle.textContent = activeContact.name || "GymBuddy Member";
    chatSubtitle.textContent = "Connected GymBuddy";
    showNotice("Opening conversation...");

    chatInput.disabled = true;
    chatSend.disabled = true;

    if (activeConversationId) {
      socket.emit("conversation:leave", {
        conversationId: activeConversationId,
      });
    }

    const result = await apiRequest("/api/conversations", {
      method: "POST",
      body: JSON.stringify({ userId: activeContact.id }),
    });

    const conversation = result.data;
    activeConversationId = getId(conversation._id);

    const participants = conversation.participants || [];

    currentUserId = participants
      .map(getId)
      .find((id) => id !== activeContact.id);

    if (!currentUserId) {
      const conversationsResult = await apiRequest(
        "/api/conversations?limit=50"
      );

      const matching = conversationsResult.data.find(
        (item) => getId(item._id) === activeConversationId
      );

      currentUserId = matching?.participants
        ?.map(getId)
        .find((id) => id !== activeContact.id);
    }

    socket.emit(
      "conversation:join",
      { conversationId: activeConversationId },
      async (ack) => {
        if (!ack?.success) {
          showNotice(ack?.message || "Unable to join conversation.");
          return;
        }

        try {
          await loadMessages(activeConversationId);

// Clear unread count as soon as the conversation is opened.
const selectedContact = contacts.find(
  (item) => item.user.id === activeContact.id
);

if (selectedContact) {
  selectedContact.unreadCount = 0;
}

renderContacts();

chatInput.disabled = false;
          chatSend.disabled = false;
          chatInput.focus();

          showNotice("");
        } catch (error) {
          showNotice(error.message);
        }
      }
    );
  } catch (error) {
    console.error("Conversation error:", error);
    showNotice(error.message);
  }
}

async function loadChatPage() {
  try {
    showNotice("Loading connected buddies...");

    const [connectionsResult, conversationsResult] = await Promise.all([
      apiRequest("/api/buddies/connections"),
      apiRequest("/api/conversations?limit=50"),
    ]);

    contacts = Array.isArray(connectionsResult.data)
      ? connectionsResult.data.filter((item) => item.user?.id)
      : [];

    const conversations = Array.isArray(conversationsResult.data)
      ? conversationsResult.data
      : [];

    // Attach each buddy's latest message to their contact.
    contacts.forEach((contact) => {
      const conversation = conversations.find((item) =>
  (item.participants || []).some(
    (participant) => getId(participant) === contact.user.id
  )
);

contact.lastMessage = conversation?.lastMessage || null;
contact.unreadCount = conversation?.unreadCount || 0;
    });

    renderContacts();

    if (contacts.length === 0) {
      showNotice("Connect with a buddy before starting a chat.");
    } else {
      showNotice("Select a connected buddy to start chatting.");
    }
  } catch (error) {
    console.error("Chat loading error:", error);
    showNotice(error.message);
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = chatInput.value.trim();

  if (!text || !activeConversationId || !socket.connected) {
    showNotice("Chat connection is not ready.");
    return;
  }

  chatSend.disabled = true;

  socket.emit(
    "message:send",
    {
      conversationId: activeConversationId,
      text,
    },
    (ack) => {
      chatSend.disabled = false;

      if (!ack?.success) {
        showNotice(ack?.message || "Message could not be sent.");
        return;
      }

      chatInput.value = "";
      chatInput.focus();
    }
  );
});

socket.on("connect", () => {
  showNotice("Chat connected.");
});

socket.on("connect_error", (error) => {
  console.error("Socket connection error:", error);
  showNotice("Unable to connect to chat. Please refresh.");
});

socket.on("message:new", (message) => {
  const messageConversationId = getId(message.conversation);

  if (messageConversationId !== activeConversationId) return;

  // Update latest message preview in the sidebar.
  const contact = contacts.find(
    (item) => item.user.id === activeContact?.id
  );

  if (contact) {
    contact.lastMessage = message;
    renderContacts();
  }

  addMessageOnce(message);

  if (getId(message.sender) !== currentUserId) {
    apiRequest(
      `/api/conversations/${encodeURIComponent(activeConversationId)}/read`,
      { method: "PATCH" }
    ).catch((error) => console.error("Read status error:", error));
  }
});

loadChatPage();
