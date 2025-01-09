<?php
require_once 'config.php';

// 开启错误日志
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/php-error.log');

$userId = checkLogin();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // 获取聊天记录
    $chatUserId = $_GET['user_id'] ?? 0;
    
    $conn = getDB();
    
    if ($_SESSION['user_type'] === 'admin') {
        $sql = "SELECT c.*, u.nick_name as user_name, a.account as admin_name 
                FROM chat c
                LEFT JOIN user u ON c.user_id = u.id
                LEFT JOIN admin a ON c.admin_id = a.id
                WHERE c.user_id = ? 
                ORDER BY c.created_at ASC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $chatUserId);
    } else {
        $sql = "SELECT c.*, u.nick_name as user_name, a.account as admin_name 
                FROM chat c
                LEFT JOIN user u ON c.user_id = u.id
                LEFT JOIN admin a ON c.admin_id = a.id
                WHERE c.user_id = ? AND c.admin_id = ?
                ORDER BY c.created_at ASC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('ii', $userId, $chatUserId);
    }
    
    error_log("Prepared SQL: $sql");
    
    if (!$stmt) {
        error_log("SQL prepare failed: " . $conn->error);
        throw new Exception("SQL prepare failed");
    }
    
    $stmt->execute();
    error_log("Executed SQL");
    
    $result = $stmt->get_result();
    $messages = [];
    
    while ($row = $result->fetch_assoc()) {
        // 如果是图片消息，转换为img标签
        if ($row['type'] === 'image') {
            $row['content'] = '<img src="' . $row['content'] . '" alt="image" style="max-width:200px; cursor:pointer;" onclick="window.open(this.src)">';
        }
        $messages[] = $row;
    }
    
    error_log("Fetched messages");
    
    jsonResponse($messages);
    
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // 发送消息
    $input = file_get_contents('php://input');
    error_log("Received POST data: " . $input);
    
    $data = json_decode($input, true);
    $content = $data['content'] ?? '';
    $chatUserId = $data['user_id'] ?? 0;
    $type = $data['type'] ?? 'text';
    
    error_log("Parsed data - content: $content, chatUserId: $chatUserId, type: $type");
    
    if (empty($content) || empty($chatUserId)) {
        error_log("Validation failed - content or chatUserId is empty");
        jsonResponse(['success' => false, 'message' => '消息内容不能为空']);
    }
    
    try {
        $conn = getDB();
        $sql = "INSERT INTO chat (user_id, admin_id, content, type, created_at) VALUES (?, ?, ?, ?, NOW())";
        error_log("Prepared SQL: $sql");
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            error_log("SQL prepare failed: " . $conn->error);
            throw new Exception("SQL prepare failed");
        }
        
        if ($_SESSION['user_type'] === 'admin') {
            error_log("Binding params for admin - chatUserId: $chatUserId, userId: $userId");
            $stmt->bind_param('iiss', $chatUserId, $userId, $content, $type);
        } else {
            error_log("Binding params for user - userId: $userId, chatUserId: $chatUserId");
            $stmt->bind_param('iiss', $userId, $chatUserId, $content, $type);
        }
        
        if ($stmt->execute()) {
            error_log("Message inserted successfully");
            jsonResponse(['success' => true]);
        } else {
            error_log("Execute failed: " . $stmt->error);
            jsonResponse(['success' => false, 'message' => '发送失败']);
        }
    } catch (Exception $e) {
        error_log("Exception: " . $e->getMessage());
        jsonResponse(['success' => false, 'message' => $e->getMessage()]);
    }
}
