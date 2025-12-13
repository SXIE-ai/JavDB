/*
我爱破解自动获取Cookie脚本 for Loon
自动捕获Cookie并保存到合适的账号位置
*/

// 检查是否是Cookie获取模式
function isCookieMode() {
    if (typeof $argument === 'undefined') return true;
    
    const config = {};
    if ($argument) {
        $argument.split('&').forEach(item => {
            const [key, value] = item.split('=');
            if (key && value !== undefined) {
                config[key] = decodeURIComponent(value);
            }
        });
    }
    return config.auto_cookie !== 'false'; // 默认true
}

// 主逻辑
if ($request && isCookieMode()) {
    const cookie = $request.headers['Cookie'] || $request.headers['cookie'];
    
    if (cookie && isValid52PoJieCookie(cookie)) {
        saveCookieToAccount(cookie);
    }
}

$done();

// 验证是否是有效的我爱破解Cookie
function isValid52PoJieCookie(cookie) {
    // 我爱破解的主要Cookie字段
    return cookie.includes('cdb_auth') || 
           cookie.includes('cdb_sid') || 
           cookie.includes('cdb_visited_fid') ||
           cookie.includes('_saltkey') ||
           (cookie.includes('auth') && cookie.includes('saltkey'));
}

// 保存Cookie到合适的账号位置
function saveCookieToAccount(newCookie) {
    console.log('检测到我爱破解Cookie，开始处理...');
    
    // 提取用户名用于识别
    const username = extractUsername(newCookie);
    
    // 检查现有账号情况
    const accounts = [];
    for (let i = 1; i <= 4; i++) {
        const cookieKey = `52pojie_cookie${i}`;
        const enableKey = `52pojie_enable${i}`;
        
        // 尝试从持久化存储读取
        const existingCookie = $persistentStore.read(cookieKey) || '';
        const existingEnable = $persistentStore.read(enableKey) || 'false';
        const existingUsername = extractUsername(existingCookie);
        
        accounts.push({
            index: i,
            cookie: existingCookie,
            enabled: existingEnable === 'true',
            username: existingUsername,
            isEmpty: !existingCookie.trim()
        });
    }
    
    // 策略1：优先替换相同账号（通过用户名判断）
    let targetAccount = null;
    
    if (username) {
        for (const account of accounts) {
            if (account.username && account.username === username) {
                targetAccount = account;
                console.log(`找到相同账号(用户: ${username})，更新账号${account.index}`);
                break;
            }
        }
    }
    
    // 策略2：如果没有相同账号，使用第一个空位
    if (!targetAccount) {
        for (const account of accounts) {
            if (account.isEmpty) {
                targetAccount = account;
                console.log(`使用空位账号${account.index}`);
                break;
            }
        }
    }
    
    // 策略3：如果没有空位，使用第一个账号
    if (!targetAccount) {
        targetAccount = accounts[0];
        console.log(`所有账号已满，更新账号1`);
    }
    
    // 保存Cookie和启用状态
    if (targetAccount) {
        const cookieKey = `52pojie_cookie${targetAccount.index}`;
        const enableKey = `52pojie_enable${targetAccount.index}`;
        
        $persistentStore.write(newCookie, cookieKey);
        $persistentStore.write('true', enableKey);
        
        // 发送通知
        const accountName = `账号${targetAccount.index}`;
        const userDisplay = username ? `(用户: ${username})` : '';
        
        $notification.post(
            '🔐 我爱破解Cookie获取成功',
            `${accountName} 已更新`,
            `Cookie已自动保存到${accountName} ${userDisplay}\n\n` +
            `请进入插件设置确认：\n` +
            `1. Cookie已自动填充\n` +
            `2. 开关已自动开启\n` +
            `3. 如有多账号请手动调整`
        );
        
        console.log(`Cookie已保存到${accountName}`);
        
        // 记录获取时间
        $persistentStore.write(new Date().toISOString(), `52pojie_last_cookie_update`);
        
        // 如果是新Cookie，立即测试一次签到
        if (targetAccount.isEmpty) {
            setTimeout(() => {
                console.log(`新Cookie获取，触发测试签到`);
                // 这里可以调用签到函数进行测试，但需要确保不会冲突
            }, 3000);
        }
    }
}

// 从Cookie中提取用户名
function extractUsername(cookie) {
    if (!cookie) return null;
    
    // 尝试从cdb_auth中提取
    const authMatch = cookie.match(/(?:cdb_auth|auth)=([^%]+)/);
    if (authMatch) {
        try {
            const decoded = decodeURIComponent(authMatch[1]);
            const parts = decoded.split('\t');
            if (parts.length > 0) {
                return parts[0];
            }
        } catch (e) {
            console.log('解码用户名失败:', e);
        }
    }
    
    return null;
}

// 辅助函数：从插件参数获取配置
function getPluginArg(key) {
    try {
        if (typeof $argument !== 'undefined' && $argument) {
            const args = {};
            $argument.split('&').forEach(item => {
                const [k, v] = item.split('=');
                if (k && v !== undefined) {
                    args[k] = decodeURIComponent(v);
                }
            });
            return args[key];
        }
    } catch (e) {
        console.log('读取插件参数失败:', e);
    }
    return null;
}
