<?php
// 启动会话
session_start();

// 数据库配置
define('DB_HOST', 'localhost');
define('DB_USER', 'kefu5');
define('DB_PASS', 'kefu5');
define('DB_NAME', 'kefu5');

// 创建数据库连接
function getDB() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        die("连接失败: " . $conn->connect_error);
    }
    $conn->set_charset("utf8mb4");
    return $conn;
}

// 响应JSON数据
function jsonResponse($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// 检查用户是否登录
function checkLogin() {
    if (!isset($_SESSION['user_id'])) {
        jsonResponse(['success' => false, 'message' => '未登录']);
    }
    return $_SESSION['user_id'];
}
