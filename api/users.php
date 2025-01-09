<?php
require_once 'config.php';

$userId = checkLogin();
$type = $_GET['type'] ?? 'all';

$conn = getDB();

if ($_SESSION['user_type'] === 'admin') {
    // 管理员看到有聊天记录的用户
    $sql = "SELECT u.*, ut.name as type_name 
            FROM user u 
            LEFT JOIN user_type ut ON u.type_id = ut.id
            WHERE EXISTS (SELECT 1 FROM chat c WHERE c.user_id = u.id AND c.admin_id = ?)";
} else {
    // 用户看到管理员列表
    $sql = "SELECT a.id, a.account as nick_name, 'admin' as type_name 
            FROM admin a";
}

$stmt = $conn->prepare($sql);

if ($_SESSION['user_type'] === 'admin') {
    $stmt->bind_param('i', $userId);
}

$stmt->execute();
$result = $stmt->get_result();
$users = [];

while ($row = $result->fetch_assoc()) {
    unset($row['password']); // 不返回密码
    $users[] = $row;
}

jsonResponse($users);

$stmt->close();
$conn->close();
