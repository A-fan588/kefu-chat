let socket = null;
let currentUser = null;
let customers = [];
let selectedCustomerId = null;
let unreadCounts = {};
let quickReplies = [];
let isRegister = false;

async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.user) {
            currentUser = data.user;
            showAdminView();
        }
    } catch (e) {}
}

function toggleAuth() {
    isRegister = !isRegister;
    document.getElementById('authTitle').textContent = isRegister ? '注册' : '登录';
    document.getElementById('authBtn').textContent = isRegister ? '注册' : '登录';
    document.getElementById('nickname').style.display = isRegister ? 'block' : 'none';
    document.querySelector('.toggle').textContent = isRegister ? '已有账号？点击登录' : '没有账号？点击注册';
}

async function handleAuth() {
    initAudioContext();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const nickname = document.getElementById('nickname').value;

    if (!username || !password) return alert('请填写完整信息');
    if (isRegister && !nickname) return alert('请填写昵称');

    const url = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister ? { username, password, nickname } : { username, password };

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.error) return alert(data.error);
        if (!isRegister) {
            currentUser = data.user;
            showAdminView();
        } else {
            alert('注册成功，请登录');
            toggleAuth();
        }
    } catch (e) {
        alert('操作失败');
    }
}

async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    if (socket) socket.disconnect();
    document.getElementById('authView').style.display = 'flex';
    document.getElementById('adminView').style.display = 'none';
}

let isAdminUser = false;

async function checkAdmin() {
    try {
        const res = await fetch('/api/admin/is-admin');
        const data = await res.json();
        isAdminUser = data.isAdmin;
        if (isAdminUser) {
            document.getElementById('adminPanel').style.display = 'block';
        }
    } catch (e) {}
}

function openAdminModal() {
    document.getElementById('adminModal').style.display = 'flex';
    loadUsers();
}

function closeAdminModal() {
    document.getElementById('adminModal').style.display = 'none';
    document.getElementById('editUserId').value = '';
    document.getElementById('editUsername').value = '';
    document.getElementById('editNickname').value = '';
    document.getElementById('editAvatar').value = '';
    document.getElementById('editPassword').value = '';
}

async function loadUsers() {
    try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();
        if (data.users) {
            renderAdminUserList(data.users);
        }
    } catch (e) {}
}

function renderAdminUserList(users) {
    const el = document.getElementById('adminUserList');
    el.innerHTML = users.map(u => {
        const isAdmin = u.username === '阿凡';
        return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid #f5f5f5;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <img src="${u.avatar}" style="width:40px;height:40px;border-radius:50%;">
                    <div>
                        <div style="font-weight:600;">${u.username} ${isAdmin ? '👑' : ''}</div>
                        <div style="font-size:13px;color:#666;">${u.nickname} ${u.online ? '● 在线' : '○ 离线'} ${isAdmin ? '(管理员)' : ''}</div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button onclick="openEditModal('${u.id}')" style="background:#667eea;color:#fff;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;">编辑</button>
                    ${!isAdmin ? `<button onclick="deleteUser('${u.id}')" style="background:#ff4d4f;color:#fff;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;">删除</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

let currentEditingUserId = null;

function openEditModal(userId) {
    currentEditingUserId = userId;
    document.getElementById('adminModal').style.display = 'none';
    document.getElementById('editModal').style.display = 'flex';
    
    fetch(`/api/admin/users/${userId}`)
        .then(res => res.json())
        .then(data => {
            if (data.user) {
                document.getElementById('editUsername').value = data.user.username;
                document.getElementById('editNickname').value = data.user.nickname;
                document.getElementById('editAvatarPreview').src = data.user.avatar;
                document.getElementById('editPassword').value = '';
            }
        });
}

let currentAvatarUrl = '';

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('editAvatarPreview').src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    const formData = new FormData();
    formData.append('file', file);
    
    fetch('/api/upload', {
        method: 'POST',
        body: formData
    }).then(res => res.json())
      .then(data => {
          if (data.url) {
              currentAvatarUrl = data.url;
          }
      });
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('adminModal').style.display = 'flex';
    loadUsers();
    currentAvatarUrl = '';
}

async function saveUser() {
    const id = currentEditingUserId;
    const username = document.getElementById('editUsername').value;
    const nickname = document.getElementById('editNickname').value;
    const password = document.getElementById('editPassword').value;

    if (!id || !username || !nickname) {
        alert('请填写用户名和昵称');
        return;
    }

    try {
        const data = { username, nickname };
        if (currentAvatarUrl) data.avatar = currentAvatarUrl;
        if (password) data.password = password;
        
        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            alert('修改成功');
            closeEditModal();
        } else {
            alert(result.error || '修改失败');
        }
    } catch (e) {
        alert('修改失败');
    }
}

async function deleteUser(id) {
    if (!confirm('确定要删除该客服吗？')) return;

    try {
        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
            alert('删除成功');
            loadUsers();
        } else {
            alert(data.error || '删除失败');
        }
    } catch (e) {
        alert('删除失败');
    }
}

async function loadUnreadCounts() {
    try {
        const res = await fetch('/api/unread-counts');
        const data = await res.json();
        if (data.unreadCounts) {
            unreadCounts = { ...data.unreadCounts };
            renderCustomerList();
        }
    } catch (e) {}
}

let audioContext = null;

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

function playNotificationSound() {
    try {
        const ctx = initAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) {
        console.log('提示音播放失败', e);
    }
}

function showAdminView() {
    document.getElementById('authView').style.display = 'none';
    document.getElementById('adminView').style.display = 'flex';
    document.getElementById('myAvatar').src = currentUser.avatar;
    document.getElementById('myName').textContent = currentUser.nickname;
    connectSocket();
    loadQuickReplies();
    checkAdmin();
}

function connectSocket() {
    socket = io({ query: { type: 'user' } });
    socket.on('admin:init', (data) => {
        customers = data.customers;
        renderCustomerList();
    });
    socket.on('customer:update', (data) => {
        const idx = customers.findIndex(c => c.id === data.customer.id);
        let updatedCustomer;
        if (idx >= 0) {
            updatedCustomer = { ...customers[idx], ...data.customer, online: data.online };
            customers = customers.filter(c => c.id !== data.customer.id);
        } else {
            updatedCustomer = { ...data.customer, online: data.online };
        }
        customers.unshift(updatedCustomer);
        renderCustomerList();
    });
    socket.on('message', (data) => {
        playNotificationSound();
        if (data.customerId === selectedCustomerId) {
            addMessage(data.message);
            if (window.currentCustomerMessages) {
                window.currentCustomerMessages.push(data.message);
            }
            if (unreadCounts[data.customerId]) {
                delete unreadCounts[data.customerId];
            }
        } else {
            unreadCounts[data.customerId] = data.unreadCount || 1;
        }
        updateCustomerPreview(data.customerId, data.message.content);
    });
    socket.on('message:notify', (data) => {
        playNotificationSound();
        if (data.customerId !== selectedCustomerId) {
            unreadCounts[data.customerId] = data.unreadCount || 1;
        } else {
            addMessage(data.message);
            if (window.currentCustomerMessages) {
                window.currentCustomerMessages.push(data.message);
            }
            if (unreadCounts[data.customerId]) {
                delete unreadCounts[data.customerId];
            }
        }
        updateCustomerPreview(data.customerId, data.message.content);
    });
    
    socket.on('messages:read', (data) => {
        if (data.customerId in unreadCounts) {
            delete unreadCounts[data.customerId];
            renderCustomerList();
        }
    });
    
    loadUnreadCounts();
    socket.on('typing:update', (data) => {
        if (data.from === 'customer' && data.customerId === selectedCustomerId) {
            showTypingIndicator(data.isTyping);
        }
    });
    socket.on('online:users', (users) => {
        console.log('在线客服:', users);
    });
}

function renderCustomerList() {
    const el = document.getElementById('customerList');
    el.innerHTML = customers.map(c => {
        const unread = unreadCounts[c.id] || 0;
        const displayName = `${c.region || '未知地区'} ${c.ip}`;
        return `
            <div class="customer-item ${c.id === selectedCustomerId ? 'active' : ''}" onclick="selectCustomer('${c.id}')">
                <img src="${c.avatar}">
                <div class="info">
                    <div class="name">
                        <span class="online-dot ${c.online ? '' : 'offline'}"></span>
                        ${displayName}
                        ${unread > 0 ? `<span class="unread-badge">${unread > 99 ? '99+' : unread}</span>` : ''}
                    </div>
                    <div class="preview">${c.preview ? (c.preview.length > 30 ? c.preview.substring(0, 30) + '...' : c.preview) : ''}</div>
                </div>
                <div class="time">${formatTime(c.last_active)}</div>
            </div>
        `;
    }).join('');
}

function updateCustomerPreview(customerId, content) {
    const c = customers.find(x => x.id === customerId);
    if (c) c.preview = content;
    customers = customers.filter(x => x.id !== customerId);
    customers.unshift(c);
    renderCustomerList();
}

async function selectCustomer(id) {
    selectedCustomerId = id;
    if (unreadCounts[id]) {
        delete unreadCounts[id];
    }
    renderCustomerList();
    closeSidebar();
    const c = customers.find(x => x.id === id);
    try {
        const res = await fetch(`/api/customers/${id}/messages`);
        const data = await res.json();
        renderChatArea(c, data.messages);
    } catch (e) {}
}

function renderChatArea(customer, messages) {
    window.currentCustomerMessages = messages;
    const el = document.getElementById('chatArea');
    const displayName = `${customer.region || '未知地区'} ${customer.ip}`;
    el.innerHTML = `
        <div class="mobile-menu-btn" onclick="toggleSidebar()">☰</div>
        <div class="chat-header">
            <div class="customer-info">
                <img src="${customer.avatar}">
                <div>
                    <div style="font-weight:600;">${displayName}</div>
                    <div class="region">${customer.ip} · ${customer.region || '未知地区'}</div>
                </div>
            </div>
            <button class="search-chat-btn" onclick="toggleSearchChat()">🔍 搜索聊天记录</button>
        </div>
        <div class="chat-search-box" id="chatSearchBox" style="display:none;">
            <button class="nav-btn" onclick="prevMatch()">◀</button>
            <button class="nav-btn" onclick="nextMatch()">▶</button>
            <input type="text" id="chatSearchInput" placeholder="搜索聊天内容..." oninput="searchChatMessages()">
            <button onclick="closeSearchChat()">✕</button>
            <div id="searchResultInfo" class="search-result-info"></div>
        </div>
        <div class="chat-messages" id="chatMessages"></div>
        <div class="chat-input-area">
            <div class="toolbar">
                <button onclick="document.getElementById('photoInput').click()">📷 照片</button>
                <button onclick="document.getElementById('fileInput').click()">📎 文件</button>
                <input type="file" id="photoInput" accept="image/*" style="display:none;" onchange="handleFileUpload(event, 'image')">
                <input type="file" id="fileInput" accept="video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar,.7z" style="display:none;" onchange="handleFileUpload(event, 'file')">
            </div>
            <div class="quick-replies" id="quickRepliesBar"></div>
            <div class="chat-input">
                <textarea id="chatInput" placeholder="输入消息..." rows="1"></textarea>
                <button onclick="sendMessage()">发送</button>
            </div>
        </div>
    `;
    renderQuickRepliesBar();
    messages.forEach(msg => addMessage(msg));
    const input = document.getElementById('chatInput');
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 150) + 'px';
        socket.emit('typing', { customerId: selectedCustomerId, isTyping: true });
        clearTimeout(window.typingTimeout);
        window.typingTimeout = setTimeout(() => socket.emit('typing', { customerId: selectedCustomerId, isTyping: false }), 1000);
    });
}

function renderQuickRepliesBar() {
    const el = document.getElementById('quickRepliesBar');
    if (!el) return;
    el.innerHTML = quickReplies.map((r, index) => `
        <span class="quick-reply" onclick="useQuickReply(quickReplies[${index}])">${r.title}</span>
    `).join('');
}

function useQuickReply(reply) {
    if (!selectedCustomerId) {
        console.log('未选择客户');
        return;
    }
    
    if (!socket) {
        console.log('Socket 未连接');
        return;
    }
    
    if (reply.message_type === 'image' || reply.message_type === 'file') {
        console.log('发送媒体消息', reply);
        socket.emit('message', { 
            customerId: selectedCustomerId, 
            content: reply.content || '',
            file_url: reply.file_url,
            message_type: reply.message_type 
        });
    } else {
        const input = document.getElementById('chatInput');
        if (input) {
            input.value = reply.content;
            sendMessage();
        }
    }
}

function addMessage(msg, searchKeyword = '') {
    const el = document.getElementById('chatMessages');
    if (!el) return;
    const div = document.createElement('div');
    const isCustomer = msg.is_from_customer === 1 || msg.is_from_customer === true;
    div.className = 'message ' + (isCustomer ? '' : 'agent');
    div.dataset.messageId = msg.id;
    
    let content = '';
    let displayContent = msg.content;
    
    if (searchKeyword && msg.message_type === 'text' && msg.content.toLowerCase().includes(searchKeyword.toLowerCase())) {
        const regex = new RegExp(`(${searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        displayContent = msg.content.replace(regex, '<span class="highlight">$1</span>');
    }
    
    if (msg.message_type === 'image') {
        content = `<img class="media-image" src="${msg.file_url}" onclick="openMedia('${msg.file_url}')">`;
    } else if (msg.message_type === 'video') {
        content = `<video class="media-video" src="${msg.file_url}" controls></video>`;
    } else if (msg.message_type === 'file') {
        content = `<div class="file-link"><a href="${msg.file_url}" target="_blank" download="${msg.content}">📎 ${msg.content}</a></div>`;
    } else {
        content = displayContent;
    }
    
    div.innerHTML = `
        <img class="avatar" src="${isCustomer ? customers.find(c => c.id === msg.customer_id)?.avatar : currentUser.avatar}">
        <div class="msg-content">
            <div class="bubble">${content}</div>
            <div class="time">${formatTime(msg.created_at)}</div>
        </div>
    `;
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
}

function toggleSearchChat() {
    const searchBox = document.getElementById('chatSearchBox');
    const searchInput = document.getElementById('chatSearchInput');
    
    if (searchBox.style.display === 'none') {
        searchBox.style.display = 'flex';
        searchInput.focus();
    } else {
        closeSearchChat();
    }
}

function closeSearchChat() {
    const searchBox = document.getElementById('chatSearchBox');
    const searchInput = document.getElementById('chatSearchInput');
    
    searchBox.style.display = 'none';
    searchInput.value = '';
    
    if (window.currentCustomerMessages) {
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        window.currentCustomerMessages.forEach(msg => addMessage(msg));
    }
}

function searchChatMessages() {
    const searchInput = document.getElementById('chatSearchInput');
    const keyword = searchInput.value.trim();
    
    if (!window.currentCustomerMessages) return;
    
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    
    if (!keyword) {
        window.currentCustomerMessages.forEach(msg => addMessage(msg));
        window.searchMatchIndices = [];
        window.currentMatchIndex = -1;
        updateSearchResultInfo();
        return;
    }
    
    window.searchMatchIndices = [];
    window.currentMatchIndex = -1;
    let matchCount = 0;
    
    window.currentCustomerMessages.forEach((msg, index) => {
        const isMatch = msg.message_type === 'text' && msg.content.toLowerCase().includes(keyword.toLowerCase());
        
        if (isMatch) {
            window.searchMatchIndices.push(index);
            matchCount++;
            if (window.currentMatchIndex === -1) {
                window.currentMatchIndex = 0;
            }
        }
        
        addMessage(msg, isMatch ? keyword : '');
    });
    
    updateSearchResultInfo();
    
    if (window.searchMatchIndices.length > 0) {
        scrollToMatch(window.searchMatchIndices[0]);
    }
}

function updateSearchResultInfo() {
    let infoEl = document.getElementById('searchResultInfo');
    if (!infoEl) {
        infoEl = document.createElement('div');
        infoEl.id = 'searchResultInfo';
        infoEl.className = 'search-result-info';
        document.querySelector('.chat-search-box').appendChild(infoEl);
    }
    
    if (window.searchMatchIndices && window.searchMatchIndices.length > 0) {
        infoEl.innerHTML = `找到 ${window.searchMatchIndices.length} 条匹配结果`;
    } else {
        infoEl.innerHTML = '';
    }
}

function scrollToMatch(messageIndex) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElements = chatMessages.querySelectorAll('.message');
    
    if (messageElements[messageIndex]) {
        messageElements[messageIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        messageElements[messageIndex].classList.add('match-highlight');
        
        setTimeout(() => {
            messageElements[messageIndex].classList.remove('match-highlight');
        }, 2000);
    }
}

function nextMatch() {
    if (!window.searchMatchIndices || window.searchMatchIndices.length === 0) return;
    
    window.currentMatchIndex = (window.currentMatchIndex + 1) % window.searchMatchIndices.length;
    scrollToMatch(window.searchMatchIndices[window.currentMatchIndex]);
}

function prevMatch() {
    if (!window.searchMatchIndices || window.searchMatchIndices.length === 0) return;
    
    window.currentMatchIndex = (window.currentMatchIndex - 1 + window.searchMatchIndices.length) % window.searchMatchIndices.length;
    scrollToMatch(window.searchMatchIndices[window.currentMatchIndex]);
}

function openMedia(url) {
    const win = window.open(url, '_blank');
    if (win) win.focus();
}

function showTypingIndicator(show) {
    const el = document.getElementById('chatMessages');
    if (!el) return;
    let indicator = el.querySelector('#typingIndicator');
    if (show && !indicator) {
        const c = customers.find(x => x.id === selectedCustomerId);
        indicator = document.createElement('div');
        indicator.id = 'typingIndicator';
        indicator.className = 'message';
        indicator.innerHTML = `
            <img class="avatar" src="${c.avatar}">
            <div class="typing-indicator"><span></span><span></span><span></span></div>
        `;
        el.appendChild(indicator);
        el.scrollTop = el.scrollHeight;
    } else if (!show && indicator) {
        indicator.remove();
    }
}

function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text || !selectedCustomerId) return;
    
    const message = {
        id: Date.now().toString(),
        customer_id: selectedCustomerId,
        user_id: currentUser.id,
        content: text,
        message_type: 'text',
        file_url: null,
        is_from_customer: false,
        created_at: new Date().toISOString(),
        user_nickname: currentUser.nickname,
        user_avatar: currentUser.avatar
    };
    
    addMessage(message);
    if (window.currentCustomerMessages) {
        window.currentCustomerMessages.push(message);
    }
    
    socket.emit('message', { customerId: selectedCustomerId, content: text });
    input.value = '';
    input.style.height = 'auto';
}

async function handleFileUpload(e, expectedType) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) {
            let type = 'file';
            if (expectedType === 'image' || data.type.startsWith('image')) {
                type = 'image';
            } else if (expectedType === 'file' && data.type.startsWith('video')) {
                type = 'video';
            }
            
            const message = {
                id: Date.now().toString(),
                customer_id: selectedCustomerId,
                user_id: currentUser.id,
                content: type === 'image' ? '' : file.name,
                message_type: type,
                file_url: data.url,
                is_from_customer: false,
                created_at: new Date().toISOString(),
                user_nickname: currentUser.nickname,
                user_avatar: currentUser.avatar
            };
            
            addMessage(message);
            if (window.currentCustomerMessages) {
                window.currentCustomerMessages.push(message);
            }
            
            socket.emit('message', { customerId: selectedCustomerId, content: type === 'image' ? '' : file.name, message_type: type, file_url: data.url });
        }
    } catch (err) {
        alert('上传失败');
    }
    e.target.value = '';
}

async function loadQuickReplies() {
    try {
        const res = await fetch('/api/quick-replies');
        const data = await res.json();
        quickReplies = data.replies || [];
        renderQuickRepliesBar();
    } catch (e) {}
}

async function openQuickRepliesModal() {
    document.getElementById('quickRepliesModal').style.display = 'flex';
    renderQuickRepliesList();
}

function closeQuickRepliesModal() {
    document.getElementById('quickRepliesModal').style.display = 'none';
}

function renderQuickRepliesList() {
    const el = document.getElementById('quickRepliesList');
    el.innerHTML = quickReplies.map(r => {
        let contentPreview = '';
        if (r.message_type === 'image' && r.file_url) {
            contentPreview = `<img src="${r.file_url}" style="max-width:150px;max-height:100px;display:block;margin-top:4px;">`;
        } else if (r.message_type === 'file' && r.file_url) {
            const fileName = r.file_url.split('/').pop();
            contentPreview = `<div style="font-size:13px;color:#1890ff;margin-top:4px;">📎 ${fileName}</div>`;
        } else {
            contentPreview = `<div style="font-size:13px;color:#666;">${r.content}</div>`;
        }
        return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f5f5f5;">
                <div>
                    <strong>${r.title}</strong>
                    ${contentPreview}
                </div>
                <button onclick="deleteQuickReply('${r.id}')" style="background:#fff1f0;color:#ff4d4f;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;">删除</button>
            </div>
        `;
    }).join('');
}

let currentQuickReplyFile = null;

async function handleQuickReplyFileUpload(e, expectedType) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.url) {
            let type = 'file';
            if (expectedType === 'image' || data.type.startsWith('image')) {
                type = 'image';
            }
            currentQuickReplyFile = { url: data.url, type: type, name: file.name };
            
            const previewDiv = document.getElementById('quickReplyFilePreview');
            const imgPreview = document.getElementById('quickReplyImagePreview');
            const fileName = document.getElementById('quickReplyFileName');
            
            previewDiv.style.display = 'block';
            if (type === 'image') {
                imgPreview.src = data.url;
                imgPreview.style.display = 'block';
                fileName.textContent = '';
            } else {
                imgPreview.style.display = 'none';
                fileName.textContent = file.name;
            }
        }
    } catch (e) {
        console.error('文件上传失败:', e);
    }
}

function clearQuickReplyFile() {
    currentQuickReplyFile = null;
    document.getElementById('quickReplyFilePreview').style.display = 'none';
    document.getElementById('quickReplyImagePreview').src = '';
    document.getElementById('quickReplyFileName').textContent = '';
}

async function addQuickReply() {
    const title = document.getElementById('newReplyTitle').value;
    const content = document.getElementById('newReplyContent').value;
    
    if (!title) return;
    if (!content && !currentQuickReplyFile) return;
    
    try {
        const data = { 
            title, 
            content: content || '',
            file_url: currentQuickReplyFile?.url || null,
            message_type: currentQuickReplyFile?.type || 'text'
        };
        
        const res = await fetch('/api/quick-replies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        await loadQuickReplies();
        document.getElementById('newReplyTitle').value = '';
        document.getElementById('newReplyContent').value = '';
        clearQuickReplyFile();
    } catch (e) {}
}

async function deleteQuickReply(id) {
    try {
        await fetch(`/api/quick-replies/${id}`, { method: 'DELETE' });
        await loadQuickReplies();
        renderQuickRepliesList();
    } catch (e) {}
}

async function handleSearch(e) {
    if (e.key !== 'Enter') return;
    const q = e.target.value.trim();
    if (!q) return;
    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        showSearchResults(data.results);
    } catch (e) {}
}

function showSearchResults(results) {
    const el = document.getElementById('searchResults');
    const list = document.getElementById('searchResultsList');
    el.style.display = 'block';
    list.innerHTML = results.map(r => `
        <div class="search-result-item" onclick="selectCustomer('${r.customer_id}');closeSearchResults();">
            <div style="font-weight:600;">${r.customer_nickname || '未知'} - ${r.user_nickname || '智能客服'}</div>
            <div style="font-size:13px;color:#666;margin-top:4px;">${r.content}</div>
            <div style="font-size:12px;color:#999;margin-top:4px;">${formatTime(r.created_at)}</div>
        </div>
    `).join('') || '<div style="padding:20px;text-align:center;color:#999;">无结果</div>';
}

function closeSearchResults() {
    document.getElementById('searchResults').style.display = 'none';
}

function formatTime(dt) {
    const d = new Date(dt);
    const now = new Date();
    if (now - d < 86400000 && d.getDate() === now.getDate()) {
        return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) {
        sidebar.classList.toggle('open');
    }
    if (overlay) {
        overlay.classList.toggle('active');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) {
        sidebar.classList.remove('open');
    }
    if (overlay) {
        overlay.classList.remove('active');
    }
}

checkAuth();
