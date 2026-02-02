// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAn5_ykClBBkoNaDZsoEapclyVNvER8Xzg",
  authDomain: "chat-af8a1.firebaseapp.com",
  databaseURL: "https://chat-af8a1-default-rtdb.firebaseio.com",
  projectId: "chat-af8a1",
  storageBucket: "chat-af8a1.firebasestorage.app",
  messagingSenderId: "67545261496",
  appId: "1:67545261496:web:8d3becf4acda9639ec9b4d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Firebase References
const messagesRef = database.ref('messages');
const usersRef = database.ref('users');
const aboutRef = database.ref('about');
const blockedUsersRef = database.ref('blockedUsers');

// Current User
let currentFirebaseUser = null;

// Initialize Chat
function initChat() {
    if (!currentUser) return;
    
    // Check if user is blocked
    checkIfBlocked(currentUser.id);
    
    // Load messages
    loadMessages();
    
    // Load about content
    loadAboutContent();
    
    // Set up real-time listeners
    setupRealtimeListeners();
    
    // Show admin toggle if admin
    if (isAdmin) {
        document.getElementById('adminToggleBtn').style.display = 'flex';
        loadUsersForAdmin();
        loadMessagesForAdmin();
    }
}

// Check if user is blocked
function checkIfBlocked(userId) {
    blockedUsersRef.child(userId).on('value', (snapshot) => {
        if (snapshot.exists()) {
            currentUser.isBlocked = snapshot.val().blocked;
            if (currentUser.isBlocked) {
                alert('You have been blocked by admin');
            }
        }
    });
}

// Load Messages
function loadMessages() {
    messagesRef.orderByChild('timestamp').on('value', (snapshot) => {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.innerHTML = '';
        
        if (!snapshot.exists()) {
            messagesContainer.innerHTML = '<p class="no-messages">No messages yet. Be the first to say hi!</p>';
            return;
        }
        
        const messages = [];
        snapshot.forEach((childSnapshot) => {
            const message = childSnapshot.val();
            message.id = childSnapshot.key;
            
            // Don't show hidden messages to regular users
            if (!message.hidden || isAdmin) {
                messages.push(message);
            }
        });
        
        // Sort by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        // Display messages
        messages.forEach(message => {
            if (!message.hidden || isAdmin) {
                displayMessage(message);
            }
        });
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// Display Message
function displayMessage(message) {
    const messagesContainer = document.getElementById('messagesContainer');
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${message.senderId === currentUser.id ? 'sent' : 'received'} ${message.hidden ? 'hidden' : ''}`;
    messageElement.id = `message-${message.id}`;
    
    const isSentByCurrentUser = message.senderId === currentUser.id;
    
    let replyHtml = '';
    if (message.replyTo) {
        replyHtml = `
            <div class="reply-indicator">
                ↪️ ${message.replyTo.text}
            </div>
        `;
    }
    
    let reactionsHtml = '';
    if (message.reactions && Object.keys(message.reactions).length > 0) {
        reactionsHtml = `
            <div class="reactions">
                ${Object.entries(message.reactions).map(([emoji, users]) => `
                    <span class="reaction">
                        ${emoji} ${users.length}
                    </span>
                `).join('')}
            </div>
        `;
    }
    
    const messageTime = new Date(message.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="sender-name">${message.senderName}</span>
            <span class="message-time">${messageTime}</span>
        </div>
        ${replyHtml}
        <div class="message-text">${message.text}</div>
        <div class="message-actions">
            <button class="reply-btn" onclick="replyToMessage('${message.id}', '${message.text.replace(/'/g, "\\'")}')">
                <i class="fas fa-reply"></i> Reply
            </button>
            <button class="reaction-btn" onclick="showReactionMenu('${message.id}')">
                <i class="fas fa-smile"></i> React
            </button>
        </div>
        ${reactionsHtml}
    `;
    
    messagesContainer.appendChild(messageElement);
}

// Send Message to Firebase
function sendMessageToFirebase(messageData) {
    if (currentUser.isBlocked) {
        alert('You are blocked from sending messages');
        return;
    }
    
    messagesRef.push(messageData)
        .catch(error => {
            console.error('Error sending message:', error);
            alert('Failed to send message');
        });
}

// Add Reaction
function addReaction(messageId, userId, emoji) {
    const reactionRef = messagesRef.child(messageId).child('reactions').child(emoji);
    
    reactionRef.transaction((currentUsers) => {
        if (currentUsers) {
            if (!currentUsers.includes(userId)) {
                currentUsers.push(userId);
            }
        } else {
            currentUsers = [userId];
        }
        return currentUsers;
    });
}

// Show Reaction Menu
function showReactionMenu(messageId) {
    const emojis = ['❤️', '👍', '😂', '😮', '😢', '😡'];
    const menu = document.createElement('div');
    menu.className = 'reaction-menu';
    menu.style.position = 'fixed';
    menu.style.background = 'white';
    menu.style.padding = '10px';
    menu.style.borderRadius = '20px';
    menu.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
    menu.style.display = 'flex';
    menu.style.gap = '10px';
    menu.style.zIndex = '1000';
    
    emojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.textContent = emoji;
        btn.style.background = 'none';
        btn.style.border = 'none';
        btn.style.fontSize = '1.5rem';
        btn.style.cursor = 'pointer';
        btn.onclick = () => {
            reactToMessage(messageId, emoji);
            document.body.removeChild(menu);
        };
        menu.appendChild(btn);
    });
    
    document.body.appendChild(menu);
    
    // Position menu near mouse
    menu.style.left = (event.clientX - 100) + 'px';
    menu.style.top = (event.clientY - 50) + 'px';
    
    // Remove menu on outside click
    setTimeout(() => {
        document.addEventListener('click', function removeMenu(e) {
            if (!menu.contains(e.target)) {
                document.body.removeChild(menu);
                document.removeEventListener('click', removeMenu);
            }
        });
    }, 0);
}

// Admin Authentication
function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            currentFirebaseUser = result.user;
            currentUser = {
                id: currentFirebaseUser.uid,
                name: currentFirebaseUser.displayName,
                isAdmin: true,
                isBlocked: false
            };
            
            isAdmin = true;
            showScreen('chatScreen');
            initChat();
            
            // Add admin to users list
            usersRef.child(currentUser.id).set({
                name: currentUser.name,
                isAdmin: true,
                lastSeen: Date.now()
            });
        })
        .catch((error) => {
            console.error('Google login error:', error);
            alert('Failed to login as admin');
        });
}

function logoutAdmin() {
    auth.signOut()
        .then(() => {
            currentFirebaseUser = null;
            isAdmin = false;
            document.getElementById('adminToggleBtn').style.display = 'none';
        })
        .catch((error) => {
            console.error('Logout error:', error);
        });
}

function checkAuth() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in as admin
            currentFirebaseUser = user;
            currentUser = {
                id: user.uid,
                name: user.displayName,
                isAdmin: true,
                isBlocked: false
            };
            
            isAdmin = true;
            showScreen('chatScreen');
            initChat();
        } else {
            // Check for regular user session
            const savedUser = localStorage.getItem('chatUser');
            if (savedUser) {
                currentUser = JSON.parse(savedUser);
                showScreen('chatScreen');
                initChat();
            }
        }
    });
}

// About Content
function loadAboutContent() {
    aboutRef.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const aboutContent = snapshot.val();
            document.getElementById('aboutContentDisplay').textContent = aboutContent;
            if (isAdmin) {
                document.getElementById('aboutContent').value = aboutContent;
            }
        }
    });
}

function updateAboutContent(content) {
    aboutRef.set(content)
        .then(() => {
            alert('About content updated successfully');
        })
        .catch((error) => {
            console.error('Error updating about:', error);
            alert('Failed to update about content');
        });
}

// Admin Functions
function loadUsersForAdmin() {
    usersRef.on('value', (snapshot) => {
        const userList = document.getElementById('userList');
        userList.innerHTML = '';
        
        if (!snapshot.exists()) return;
        
        snapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            user.id = childSnapshot.key;
            
            if (!user.isAdmin) { // Don't show other admins
                const userItem = document.createElement('div');
                userItem.className = 'user-item';
                
                userItem.innerHTML = `
                    <div>
                        <strong>${user.name}</strong>
                        <div class="user-status">Last seen: ${new Date(user.lastSeen).toLocaleString()}</div>
                    </div>
                    <div class="user-actions">
                        <button class="block-btn" onclick="toggleUserBlock('${user.id}', ${user.isBlocked || false})">
                            ${user.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                    </div>
                `;
                
                userList.appendChild(userItem);
            }
        });
    });
}

function loadMessagesForAdmin() {
    messagesRef.on('value', (snapshot) => {
        const adminMessageList = document.getElementById('adminMessageList');
        adminMessageList.innerHTML = '';
        
        if (!snapshot.exists()) return;
        
        snapshot.forEach((childSnapshot) => {
            const message = childSnapshot.val();
            message.id = childSnapshot.key;
            
            const messageItem = document.createElement('div');
            messageItem.className = 'admin-message-item';
            
            const messageTime = new Date(message.timestamp).toLocaleString();
            
            messageItem.innerHTML = `
                <div>
                    <strong>${message.senderName}</strong>
                    <div class="message-preview">${message.text.substring(0, 50)}${message.text.length > 50 ? '...' : ''}</div>
                    <div class="message-time">${messageTime}</div>
                    <div class="message-status">${message.hidden ? 'Hidden' : 'Visible'}</div>
                </div>
                <div class="message-actions-admin">
                    <button class="delete-btn" onclick="deleteMessage('${message.id}')">
                        Delete
                    </button>
                    <button class="hide-btn" onclick="toggleMessageVisibility('${message.id}', ${message.hidden || false})">
                        ${message.hidden ? 'Show' : 'Hide'}
                    </button>
                </div>
            `;
            
            adminMessageList.appendChild(messageItem);
        });
    });
}

function deleteMessageFromFirebase(messageId) {
    messagesRef.child(messageId).remove()
        .catch(error => {
            console.error('Error deleting message:', error);
            alert('Failed to delete message');
        });
}

function toggleMessageHidden(messageId, hidden) {
    messagesRef.child(messageId).update({ hidden })
        .catch(error => {
            console.error('Error toggling message:', error);
            alert('Failed to update message');
        });
}

function toggleUserBlocked(userId, blocked) {
    blockedUsersRef.child(userId).set({ blocked })
        .then(() => {
            usersRef.child(userId).update({ isBlocked: blocked });
        })
        .catch(error => {
            console.error('Error blocking user:', error);
            alert('Failed to update user');
        });
}

// Setup Real-time Listeners
function setupRealtimeListeners() {
    // Update user's last seen
    if (currentUser) {
        usersRef.child(currentUser.id).update({
            lastSeen: Date.now()
        });
        
        // Update last seen every minute
        setInterval(() => {
            if (currentUser) {
                usersRef.child(currentUser.id).update({
                    lastSeen: Date.now()
                });
            }
        }, 60000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});