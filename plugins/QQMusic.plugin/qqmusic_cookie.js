/*
QQ音乐Cookie获取脚本 - Loon版本
*/

// 读取现有Cookie
function getExistingCookies() {
    const cookies = [];
    for (let i = 1; i <= 4; i++) {
        const argName = `qqmusic_cookie${i}`;
        // 这里需要根据实际存储方式调整
        // 如果是通过插件参数，可能无法直接读取
        const cookie = ""; // 需要根据实际情况实现
        cookies.push({ index: i, cookie: cookie });
    }
    return cookies;
}

if ($request && $request.headers) {
    const cookie = $request.headers["Cookie"] || $request.headers["cookie"];
    
    if (cookie && cookie.includes("qqmusic_key") && cookie.includes("uin")) {
        // 提示用户手动复制到插件参数
        $notification.post(
            "QQ音乐Cookie获取", 
            "成功获取Cookie", 
            "请复制以下Cookie到插件参数中：\n" + 
            cookie.substring(0, 100) + "...\n\n" +
            "注意：需要手动复制到插件配置中"
        );
        
        // 可以尝试保存到持久化存储
        $persistentStore.write(cookie, "qqmusic_latest_cookie");
        
        console.log("Cookie已保存到持久化存储");
    }
}

$done();
