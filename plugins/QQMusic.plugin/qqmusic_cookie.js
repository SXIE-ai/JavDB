/*
 * QQ音乐Cookie获取脚本
 * 自动捕获并验证QQ音乐Cookie
 */

// 目标域名
const TARGET_DOMAINS = [
    'y.qq.com',
    'c.y.qq.com', 
    'u.y.qq.com',
    'graph.qq.com',
    'open.mobile.qq.com'
];

// 检查是否目标请求
function isTargetRequest(url) {
    return TARGET_DOMAINS.some(domain => url.includes(domain));
}

// 提取Cookie
function extractCookie(headers) {
    const cookieHeader = headers['Cookie'] || headers['cookie'];
    if (!cookieHeader) return null;
    
    // 过滤关键Cookie字段
    const importantCookies = [
        'uin', 'p_skey', 'skey', 'p_lskey', 'p_uin',
        'qm_keyst', 'qm_username', 'qm_loginfrom'
    ];
    
    const cookieParts = cookieHeader.split('; ');
    const filtered = cookieParts.filter(part => {
        const [key] = part.split('=');
        return importantCookies.some(important => 
            key.toLowerCase().includes(important.toLowerCase())
        );
    });
    
    return filtered.length > 0 ? filtered.join('; ') : cookieHeader;
}

// 验证Cookie有效性
function validateCookie(cookie) {
    if (!cookie) return false;
    
    // 检查必需字段
    const requiredFields = ['uin', 'p_skey'];
    for (const field of requiredFields) {
        if (!cookie.toLowerCase().includes(field.toLowerCase())) {
            return false;
        }
    }
    
    return true;
}

// 保存Cookie
function saveCookie(cookie) {
    try {
        // 提取uin用于标识
        const uinMatch = cookie.match(/uin=o?(\d+)/i);
        const uin = uinMatch ? uinMatch[1] : 'unknown';
        
        // 读取现有账号
        let accounts = [];
        const configStr = $persistentStore.read('QQMusic_Plugin_Config');
        if (configStr) {
            const config = JSON.parse(configStr);
            accounts = config.accounts || [];
        }
        
        // 检查是否已存在
        const existingIndex = accounts.findIndex(acc => 
            acc.cookie === cookie || acc.uin === uin
        );
        
        if (existingIndex >= 0) {
            // 更新现有账号
            accounts[existingIndex] = {
                ...accounts[existingIndex],
                cookie: cookie,
                uin: uin,
                lastUpdate: new Date().toISOString()
            };
        } else {
            // 添加新账号
            accounts.push({
                name: `账号${accounts.length + 1}`,
                cookie: cookie,
                uin: uin,
                enabled: true,
                lastUpdate: new Date().toISOString(),
                created: new Date().toISOString()
            });
        }
        
        // 保存配置
        const config = {
            multiAccount: true,
            enableNotification: true,
            checkinTime: "09:10",
            accounts: accounts
        };
        
        $persistentStore.write(JSON.stringify(config), 'QQMusic_Plugin_Config');
        
        // 发送通知
        $notification.post('QQ音乐Cookie', '获取成功', `账号: ${uin}\n已保存到多账号列表`);
        
        return true;
    } catch (error) {
        console.log(`保存Cookie失败: ${error}`);
        return false;
    }
}

// 主处理函数
function main() {
    const url = $request.url;
    
    if (!isTargetRequest(url)) {
        $done({});
        return;
    }
    
    const cookie = extractCookie($request.headers);
    
    if (!cookie || !validateCookie(cookie)) {
        console.log('未获取到有效Cookie');
        $done({});
        return;
    }
    
    // 保存Cookie
    const saved = saveCookie(cookie);
    
    if (saved) {
        console.log(`Cookie获取成功，uin: ${cookie.match(/uin=o?(\d+)/i)?.[1] || 'unknown'}`);
    }
    
    $done({});
}

// 执行
main();
