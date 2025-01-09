// 全局变量
let currentUserId = null;
let userType = sessionStorage.getItem('userType');
let userInfo = JSON.parse(sessionStorage.getItem('userInfo'));

// 检查登录状态
function checkLogin() {
    if (!userInfo) {
        window.location.href = 'index.html';
    }
}

// 加载用户列表
async function loadUserList(type = 'all') {
    try {
        const response = await axios.get(`api/users.php?type=${type}`);
        const userList = document.getElementById('userList');
        userList.innerHTML = '';
        
        response.data.forEach(user => {
            const div = document.createElement('div');
            div.className = `user-item ${user.id === currentUserId ? 'active' : ''}`;
            div.setAttribute('data-id', user.id);
            div.onclick = () => selectUser(user.id);
            
            // 根据用户类型显示不同的信息
            if (userType === 'admin') {
                div.innerHTML = `
                    <div class="user-name">${user.nick_name}</div>
                    <div class="user-type">${user.type_name}</div>
                `;
            } else {
                div.innerHTML = `
                    <div class="user-name">客服 ${user.nick_name}</div>
                    <div class="user-type">在线客服</div>
                `;
            }
            userList.appendChild(div);
        });
    } catch (error) {
        console.error('加载用户列表失败:', error);
    }
}

// 选择用户
async function selectUser(userId) {
    console.log('选择用户:', userId);
    currentUserId = userId;
    
    // 更新UI显示
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`.user-item[data-id="${userId}"]`)?.classList.add('active');
    
    // 更新当前聊天用户名称
    const userItem = document.querySelector(`.user-item[data-id="${userId}"]`);
    const userName = userItem?.querySelector('.user-name')?.textContent || '未知用户';
    document.getElementById('currentChatUser').textContent = userName;
    
    console.log('当前用户ID已更新为:', currentUserId);
    
    // 加载聊天记录
    await loadChatHistory(userId);
}

// 加载聊天记录
async function loadChatHistory(userId) {
    try {
        const response = await axios.get(`api/messages.php?user_id=${userId}`);
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        
        if (response.data && Array.isArray(response.data)) {
            response.data.forEach(message => {
                const isCurrentUser = 
                    (userType === 'user' && message.user_id === userInfo.id) ||
                    (userType === 'admin' && message.admin_id === userInfo.id);
                
                const messageDiv = document.createElement('div');
                messageDiv.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
                
                // 检查消息内容是否包含图片标签
                const content = message.content.includes('<img') 
                    ? message.content // 如果是图片，保持HTML格式
                    : message.content.replace(/</g, '&lt;').replace(/>/g, '&gt;'); // 如果是文本，转义HTML
                
                messageDiv.innerHTML = `
                    <div class="message-content">
                        ${content}
                        <div class="message-time">${formatTime(message.created_at)}</div>
                    </div>
                `;
                
                chatMessages.appendChild(messageDiv);
            });
        }
        
        // 滚动到底部
        chatMessages.scrollTop = chatMessages.scrollHeight;
    } catch (error) {
        console.error('加载聊天记录失败:', error);
    }
}

// 格式化时间
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// 处理表情选择
function setupEmojiPicker() {
    const emojiBtn = document.getElementById('emojiBtn');
    const emojiPicker = document.querySelector('.emoji-picker');
    const messageInput = document.getElementById('messageInput');
    
    // 初始化隐藏表情选择器
    emojiPicker.style.display = 'none';

    // 监听表情按钮点击
    emojiBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isVisible = emojiPicker.style.display === 'block';
        emojiPicker.style.display = isVisible ? 'none' : 'block';
    });

    // 点击其他地方关闭表情选择器
    document.addEventListener('click', function(e) {
        if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
            emojiPicker.style.display = 'none';
        }
    });

    // 监听表情点击
    emojiPicker.addEventListener('click', function(e) {
        const emoji = e.target.closest('.emoji');
        if (emoji) {
            const emojiText = emoji.textContent;
            const start = messageInput.selectionStart;
            const end = messageInput.selectionEnd;
            const text = messageInput.value;
            messageInput.value = text.slice(0, start) + emojiText + text.slice(end);
            messageInput.focus();
            messageInput.selectionStart = messageInput.selectionEnd = start + emojiText.length;
            emojiPicker.style.display = 'none';
            e.stopPropagation();
        }
    });
}

// 发送消息
async function sendMessage(content, type = 'text') {
    console.log('sendMessage被调用，参数:', { content, type, currentUserId });
    
    if (!currentUserId) {
        console.error('未选择聊天对象，currentUserId:', currentUserId);
        alert('请先选择聊天对象');
        return false;
    }
    
    const messageInput = document.getElementById('messageInput');
    const messageContent = content || messageInput.value.trim();
    
    if (!messageContent) {
        console.error('消息内容为空');
        return false;
    }
    
    try {
        // 准备发送的数据
        const postData = {
            user_id: currentUserId,
            content: messageContent,
            type: type
        };
        console.log('准备发送消息，数据:', postData);
        
        const response = await axios.post('api/messages.php', postData);
        console.log('消息发送响应:', response.data);
        
        if (response.data.success) {
            // 立即添加消息到界面
            const chatMessages = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message sent';
            messageDiv.innerHTML = `
                <div class="message-content">
                    ${messageContent}
                    <div class="message-time">${formatTime(new Date())}</div>
                </div>
            `;
            chatMessages.appendChild(messageDiv);
            
            // 确保滚动到底部
            setTimeout(() => {
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 100);
            
            // 清空输入框（仅当是文本消息时）
            if (type === 'text') {
                messageInput.value = '';
            }
            
            console.log('消息发送成功并添加到界面');
            return true;
        } else {
            console.error('发送失败:', response.data);
            alert('发送失败：' + response.data.message);
            return false;
        }
    } catch (error) {
        console.error('发送消息失败:', error, error.response?.data);
        alert('发送失败，请重试');
        return false;
    }
}

// 初始化主题
function initTheme() {
    // 加载保存的主题
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        document.querySelector('.light-icon').style.display = 'none';
        document.querySelector('.dark-icon').style.display = 'inline-block';
    } else {
        // 强制使用暗色主题
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        document.querySelector('.light-icon').style.display = 'inline-block';
        document.querySelector('.dark-icon').style.display = 'none';
    }
}

// 主题切换
function toggleTheme() {
    const body = document.body;
    const lightIcon = document.querySelector('.light-icon');
    const darkIcon = document.querySelector('.dark-icon');
    
    // 切换主题
    body.classList.toggle('light-theme');
    const isLight = body.classList.contains('light-theme');
    
    if (isLight) {
        body.classList.remove('dark-theme');
    } else {
        body.classList.add('dark-theme');
    }
    
    // 保存主题设置
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    
    // 切换图标
    if (isLight) {
        lightIcon.style.display = 'none';
        darkIcon.style.display = 'inline-block';
    } else {
        lightIcon.style.display = 'inline-block';
        darkIcon.style.display = 'none';
    }
}

// 事件监听
document.addEventListener('DOMContentLoaded', async function() {
    checkLogin();
    
    // 先加载用户列表
    await loadUserList();
    
    // 如果是普通用户，自动选择第一个客服
    if (userType !== 'admin') {
        const firstUserItem = document.querySelector('.user-item');
        if (firstUserItem) {
            const userId = firstUserItem.getAttribute('data-id');
            await selectUser(parseInt(userId));
        }
    }

    // 主题相关
    initTheme();
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    themeToggleBtn.addEventListener('click', function() {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        
        // 更新图标显示
        const lightIcon = document.querySelector('.light-icon');
        const darkIcon = document.querySelector('.dark-icon');
        if (isLight) {
            lightIcon.style.display = 'none';
            darkIcon.style.display = 'inline-block';
        } else {
            lightIcon.style.display = 'inline-block';
            darkIcon.style.display = 'none';
        }
    });
    
    // 监听发送按钮点击
    document.getElementById('sendBtn').addEventListener('click', async function() {
        await sendMessage();
    });
    
    // 监听消息输入框的回车事件
    document.getElementById('messageInput').addEventListener('keypress', async function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            await sendMessage();
        }
    });
    
    // 监听上传按钮点击
    document.getElementById('uploadBtn').addEventListener('click', function() {
        if (!currentUserId) {
            alert('请先选择聊天对象');
            return;
        }
        document.getElementById('fileInput').click();
    });
    
    // 表情按钮和选择器
    const emojiBtn = document.getElementById('emojiBtn');
    const emojiPicker = document.querySelector('.emoji-picker');
    const messageInput = document.getElementById('messageInput');

    // 初始化隐藏表情选择器
    emojiPicker.style.display = 'none';

    // 监听表情按钮点击
    emojiBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isVisible = emojiPicker.style.display === 'block';
        emojiPicker.style.display = isVisible ? 'none' : 'block';
    });

    // 点击其他地方关闭表情选择器
    document.addEventListener('click', function(e) {
        if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
            emojiPicker.style.display = 'none';
        }
    });

    // 监听表情点击
    emojiPicker.addEventListener('click', function(e) {
        const emoji = e.target.closest('.emoji');
        if (emoji) {
            const emojiText = emoji.textContent;
            const start = messageInput.selectionStart;
            const end = messageInput.selectionEnd;
            const text = messageInput.value;
            messageInput.value = text.slice(0, start) + emojiText + text.slice(end);
            messageInput.focus();
            messageInput.selectionStart = messageInput.selectionEnd = start + emojiText.length;
            emojiPicker.style.display = 'none';
            e.stopPropagation();
        }
    });
    
    // 监听登出按钮
    document.getElementById('logoutBtn').addEventListener('click', function() {
        sessionStorage.clear();
        window.location.href = 'index.html';
    });
    
    // 监听用户类型标签点击
    document.querySelectorAll('#userTypeTabs .nav-link').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('#userTypeTabs .nav-link').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            loadUserList(this.getAttribute('data-type'));
        });
    });
    
    // 监听文件选择
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) {
            alert('请选择图片文件');
            return;
        }

        console.log('当前选择的用户ID:', currentUserId);
        if (!currentUserId) {
            alert('请先选择聊天对象');
            return;
        }

        try {
            // 1. 先上传图片
            console.log('1. 开始上传图片...');
            const formData = new FormData();
            formData.append('image', file);
            formData.append('user_id', currentUserId.toString()); // 确保转换为字符串

            // 打印FormData内容
            console.log('FormData内容:');
            for (let pair of formData.entries()) {
                console.log(pair[0] + ': ' + pair[1]);
            }

            const uploadRes = await axios.post('api/upload.php', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            console.log('2. 上传结果:', uploadRes.data);

            if (!uploadRes.data.success) {
                console.error('3. 上传失败:', uploadRes.data);
                alert(uploadRes.data.message || '图片上传失败');
                return;
            }

            // 3. 显示在聊天界面
            const chatMessages = document.getElementById('chatMessages');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message sent';
            messageDiv.innerHTML = `
                <div class="message-content">
                    <img src="${uploadRes.data.url}" alt="uploaded image" style="max-width:200px; cursor:pointer;" onclick="window.open(this.src)">
                    <div class="message-time">${formatTime(new Date())}</div>
                </div>
            `;
            chatMessages.appendChild(messageDiv);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            console.log('4. 界面更新完成');
        } catch (error) {
            console.error('发送图片失败:', error);
            if (error.response) {
                console.error('错误响应:', error.response.data);
            }
            alert('发送失败，请重试');
        }

        // 清空文件选择
        this.value = '';
    });
});
