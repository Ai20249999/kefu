<?php
require_once 'config.php';

// 获取POST数据
$data = json_decode(file_get_contents('php://input'), true);
$account = $data['account'] ?? '';
$password = $data['password'] ?? '';
$type = $data['type'] ?? '';

if (empty($account) || empty($password) || empty($type)) {
    jsonResponse(['success' => false, 'message' => '请填写完整信息']);
}

$conn = getDB();
$table = $type === 'admin' ? 'admin' : 'user';
$password = md5($password);

$stmt = $conn->prepare("SELECT * FROM {$table} WHERE account = ? AND password = ?");
$stmt->bind_param('ss', $account, $password);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    session_start();
    $user = $result->fetch_assoc();
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_type'] = $type;
    
    // 不返回密码
    unset($user['password']);
    
    jsonResponse([
        'success' => true,
        'user' => $user
    ]);
} else {
    jsonResponse([
        'success' => false,
        'message' => '账号或密码错误'
    ]);
}

$stmt->close();
$conn->close();
