document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const account = document.getElementById('account').value;
    const password = document.getElementById('password').value;
    const userType = document.getElementById('userType').value;
    
    try {
        const response = await axios.post('api/login.php', {
            account: account,
            password: password,
            type: userType
        });
        
        if (response.data.success) {
            // 保存用户信息到sessionStorage
            sessionStorage.setItem('userInfo', JSON.stringify(response.data.user));
            sessionStorage.setItem('userType', userType);
            
            // 跳转到聊天页面
            window.location.href = 'chat.html';
        } else {
            alert(response.data.message || '登录失败');
        }
    } catch (error) {
        console.error('登录错误:', error);
        alert('登录失败，请稍后重试');
    }
});
