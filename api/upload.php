<?php
require_once 'config.php';
header('Content-Type: application/json');

// 开启错误日志
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);
ini_set('error_log', '/tmp/php-error.log');

// 检查用户是否登录
$userId = checkLogin();
error_log("Upload.php - 用户ID: " . $userId);
error_log("Upload.php - 用户类型: " . $_SESSION['user_type']);

// 检查是否有文件上传
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    error_log("Upload.php - 文件上传失败: " . print_r($_FILES, true));
    jsonResponse(['success' => false, 'message' => '文件上传失败']);
}

// 检查聊天对象ID
error_log("Upload.php - POST数据: " . print_r($_POST, true));
error_log("Upload.php - POST['user_id']原始值: " . $_POST['user_id']);
$chatUserId = isset($_POST['user_id']) ? intval($_POST['user_id']) : 0;
error_log("Upload.php - 聊天对象ID转换后: " . $chatUserId);

if (!$chatUserId) {
    error_log("Upload.php - 未指定聊天对象ID");
    jsonResponse(['success' => false, 'message' => '未指定聊天对象']);
}

$file = $_FILES['image'];
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

// 验证文件类型
if (!in_array($file['type'], $allowedTypes)) {
    error_log("Upload.php - 不支持的文件类型: " . $file['type']);
    jsonResponse(['success' => false, 'message' => '只允许上传图片文件']);
}

// 创建上传目录
$uploadDir = '../uploads/' . date('Y/m/');
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// 生成唯一文件名
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = uniqid() . '.' . $extension;
$filepath = $uploadDir . $filename;

error_log("Upload.php - 准备保存文件到: " . $filepath);

// 移动上传的文件
if (move_uploaded_file($file['tmp_name'], $filepath)) {
    try {
        // 获取数据库连接
        $conn = getDB();
        
        // 准备图片URL
        $imageUrl = str_replace('../', '', $filepath);
        error_log("Upload.php - 图片URL: " . $imageUrl);
        
        // 插入到chat表
        $sql = "INSERT INTO chat (user_id, admin_id, content, type, created_at) VALUES (?, ?, ?, 'image', NOW())";
        error_log("Upload.php - SQL: " . $sql);
        
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            error_log("Upload.php - SQL准备失败: " . $conn->error);
            throw new Exception("SQL准备失败");
        }
        
        error_log("Upload.php - 用户类型: " . $_SESSION['user_type']);
        if ($_SESSION['user_type'] === 'admin') {
            error_log("Upload.php - 管理员发送消息 - chatUserId: $chatUserId, userId: $userId");
            $stmt->bind_param('iis', $chatUserId, $userId, $imageUrl);
        } else {
            error_log("Upload.php - 用户发送消息 - userId: $userId, chatUserId: $chatUserId");
            $stmt->bind_param('iis', $userId, $chatUserId, $imageUrl);
        }
        
        if ($stmt->execute()) {
            error_log("Upload.php - 消息保存成功");
            jsonResponse(['success' => true, 'url' => $imageUrl]);
        } else {
            error_log("Upload.php - 执行失败: " . $stmt->error);
            // 如果插入失败，删除已上传的文件
            unlink($filepath);
            jsonResponse(['success' => false, 'message' => '保存到数据库失败']);
        }
    } catch (Exception $e) {
        error_log("Upload.php - 异常: " . $e->getMessage());
        // 如果发生错误，删除已上传的文件
        unlink($filepath);
        jsonResponse(['success' => false, 'message' => $e->getMessage()]);
    }
} else {
    error_log("Upload.php - 文件移动失败");
    jsonResponse(['success' => false, 'message' => '文件保存失败']);
}
