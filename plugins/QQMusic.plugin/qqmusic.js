/*
QQ音乐签到脚本 for Loon - 修复版
修复GTK计算和响应处理问题
*/

// 获取配置：优先从插件参数，其次从持久化存储
function getConfig() {
    const config = {};
    
    // 从插件参数获取
    if (typeof $argument !== 'undefined' && $argument) {
        $argument.split('&').forEach(item => {
            const [key, value] = item.split('=');
            if (key && value !== undefined) {
                config[key] = decodeURIComponent(value);
            }
        });
    }
    
    // 如果插件参数中Cookie为空，尝试从持久化存储读取
    for (let i = 1; i <= 4; i++) {
        const cookieKey = `qqmusic_cookie${i}`;
        const enableKey = `qqmusic_enable${i}`;
        
        if (!config[cookieKey] || !config[cookieKey].trim()) {
            const storedCookie = $persistentStore.read(cookieKey);
            const storedEnable = $persistentStore.read(enableKey);
            
            if (storedCookie) {
                config[cookieKey] = storedCookie;
                if (!config[enableKey]) {
                    config[enableKey] = storedEnable || 'false';
                }
            }
        }
    }
    
    return config;
}

// 主函数
(async () => {
    const config = getConfig();
    
    // 账号配置
    const accounts = [
        { 
            cookie: config.qqmusic_cookie1 || '', 
            enable: config.qqmusic_enable1 === 'true', 
            name: '账号1' 
        },
        { 
            cookie: config.qqmusic_cookie2 || '', 
            enable: config.qqmusic_enable2 === 'true', 
            name: '账号2' 
        },
        { 
            cookie: config.qqmusic_cookie3 || '', 
            enable: config.qqmusic_enable3 === 'true', 
            name: '账号3' 
        },
        { 
            cookie: config.qqmusic_cookie4 || '', 
            enable: config.qqmusic_enable4 === 'true', 
            name: '账号4' 
        }
    ];
    
    const notifyTitle = config.notify_title || 'QQ音乐签到';
    const testMode = config.test_mode === 'true';
    
    console.log(`QQ音乐签到开始，测试模式: ${testMode}`);
    
    const results = [];
    let successCount = 0;
    
    for (const account of accounts) {
        if (!account.enable || !account.cookie.trim()) {
            console.log(`${account.name}: 未启用或Cookie为空`);
            continue;
        }
        
        console.log(`处理 ${account.name}...`);
        const result = await signIn(account.cookie, account.name, testMode);
        results.push(result);
        
        if (result.success) successCount++;
        
        // 请求间隔
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // 发送通知
    if (results.length > 0) {
        let subtitle = `结果: ${successCount}/${results.length}`;
        let message = '';
        
        results.forEach((result, index) => {
            const icon = result.success ? '✅' : '❌';
            message += `${icon} ${result.account}: ${result.message}`;
            if (index < results.length - 1) message += '\n';
        });
        
        message += `\n\n📅 ${new Date().toLocaleDateString("zh-CN")}`;
        
        $notification.post(notifyTitle, subtitle, message);
    } else {
        $notification.post(notifyTitle, '跳过', '没有启用的账号');
    }
    
    $done();
})();

// 签到函数 - 修复版
function signIn(cookie, accountName, testMode) {
    return new Promise(resolve => {
        if (testMode) {
            console.log(`[测试] ${accountName}: 模拟成功`);
            return resolve({
                account: accountName,
                success: true,
                message: '测试成功'
            });
        }
        
        // 检查Cookie是否有效
        if (!isValidQQMusicCookie(cookie)) {
            console.log(`${accountName}: Cookie格式无效`);
            return resolve({
                account: accountName,
                success: false,
                message: 'Cookie格式错误'
            });
        }
        
        // 修复GTK计算
        const gtk = calculateGTK(cookie);
        const timestamp = Date.now();
        const url = `https://c.y.qq.com/vip/task/sign?g_tk=${gtk}&_=${timestamp}`;
        
        console.log(`${accountName}: 开始签到，URL: ${url.substring(0, 80)}...`);
        
        $httpClient.get({
            url: url,
            headers: {
                'Cookie': cookie,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
                'Referer': 'https://y.qq.com/',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'zh-CN,zh-Hans;q=0.9'
            }
        }, (error, response, data) => {
            if (error) {
                console.log(`${accountName}: 请求失败: ${error}`);
                return resolve({
                    account: accountName,
                    success: false,
                    message: '网络请求失败'
                });
            }
            
            console.log(`${accountName}: 状态码: ${response.status}`);
            
            if (response.status === 200) {
                try {
                    // 尝试解析JSON
                    let jsonData;
                    try {
                        jsonData = JSON.parse(data);
                    } catch (e) {
                        // 可能不是JSON，尝试提取
                        console.log(`${accountName}: JSON解析失败，原始数据: ${data.substring(0, 100)}`);
                        
                        // 尝试从HTML中提取信息
                        if (data.includes('已经签到') || data.includes('今日已签到')) {
                            return resolve({
                                account: accountName,
                                success: true,
                                message: '今日已签到'
                            });
                        }
                        
                        // 尝试提取错误信息
                        const errorMatch = data.match(/<error>(\d+)<\/error>/);
                        if (errorMatch) {
                            return resolve({
                                account: accountName,
                                success: false,
                                message: `错误码: ${errorMatch[1]}`
                            });
                        }
                        
                        return resolve({
                            account: accountName,
                            success: false,
                            message: '响应格式错误'
                        });
                    }
                    
                    console.log(`${accountName}: 解析成功，响应数据:`, jsonData);
                    
                    // 处理不同格式的响应
                    if (jsonData.code !== undefined) {
                        const code = jsonData.code;
                        const message = jsonData.message || jsonData.msg || '';
                        
                        if (code === 0 || code === 200) {
                            // 签到成功
                            const days = jsonData.data?.signDays || jsonData.data?.continuousDays || '未知';
                            const points = jsonData.data?.awardPoints || jsonData.data?.point || 0;
                            
                            return resolve({
                                account: accountName,
                                success: true,
                                message: `成功(连续${days}天，+${points}积分)`
                            });
                        } 
                        else if (code === -3001 || message.includes('已经签到') || message.includes('重复')) {
                            // 已签到
                            const days = jsonData.data?.signDays || jsonData.data?.continuousDays || '未知';
                            return resolve({
                                account: accountName,
                                success: true,
                                message: `已签到(连续${days}天)`
                            });
                        }
                        else if (code === 1001 || message.includes('未登录')) {
                            // Cookie失效
                            return resolve({
                                account: accountName,
                                success: false,
                                message: 'Cookie失效，请重新获取'
                            });
                        }
                        else {
                            // 其他错误
                            return resolve({
                                account: accountName,
                                success: false,
                                message: `失败: ${message || `错误码 ${code}`}`
                            });
                        }
                    } 
                    else if (jsonData.retcode !== undefined) {
                        // 另一种格式
                        if (jsonData.retcode === 0) {
                            const days = jsonData.result?.signDays || '未知';
                            const points = jsonData.result?.awardPoints || 0;
                            return resolve({
                                account: accountName,
                                success: true,
                                message: `成功(连续${days}天，+${points}积分)`
                            });
                        } else {
                            return resolve({
                                account: accountName,
                                success: false,
                                message: `失败: ${jsonData.errmsg || `错误码 ${jsonData.retcode}`}`
                            });
                        }
                    }
                    else {
                        // 未知格式
                        console.log(`${accountName}: 未知响应格式`, jsonData);
                        return resolve({
                            account: accountName,
                            success: false,
                            message: '未知响应格式'
                        });
                    }
                    
                } catch (e) {
                    console.log(`${accountName}: 处理响应异常: ${e}`);
                    return resolve({
                        account: accountName,
                        success: false,
                        message: '处理响应异常'
                    });
                }
            } 
            else if (response.status === 403 || response.status === 401) {
                // 权限错误
                console.log(`${accountName}: 权限错误，状态码: ${response.status}`);
                return resolve({
                    account: accountName,
                    success: false,
                    message: `权限错误(状态码: ${response.status})`
                });
            }
            else {
                // 其他HTTP错误
                console.log(`${accountName}: HTTP错误: ${response.status}`);
                return resolve({
                    account: accountName,
                    success: false,
                    message: `HTTP错误: ${response.status}`
                });
            }
        });
    });
}

// 验证QQ音乐Cookie格式
function isValidQQMusicCookie(cookie) {
    if (!cookie || typeof cookie !== 'string') {
        return false;
    }
    
    // QQ音乐Cookie应该包含的关键字段
    const requiredFields = ['qqmusic_key', 'uin', 'qm_keystr'];
    let foundCount = 0;
    
    for (const field of requiredFields) {
        if (cookie.includes(field + '=')) {
            foundCount++;
        }
    }
    
    // 至少需要2个关键字段
    return foundCount >= 2;
}

// 修复GTK计算函数
function calculateGTK(cookie) {
    console.log(`计算GTK，Cookie长度: ${cookie.length}`);
    
    // 提取必要的key
    let key = '';
    
    // 优先使用p_skey
    const pskeyMatch = cookie.match(/p_skey=([^;]+)/);
    if (pskeyMatch && pskeyMatch[1]) {
        key = pskeyMatch[1];
        console.log(`使用p_skey: ${key.substring(0, 5)}...`);
    } 
    // 其次使用skey
    else if (cookie.match(/skey=([^;]+)/)) {
        const skeyMatch = cookie.match(/skey=([^;]+)/);
        key = skeyMatch[1];
        console.log(`使用skey: ${key.substring(0, 5)}...`);
    }
    // 最后使用qm_keystr
    else if (cookie.match(/qm_keystr=([^;]+)/)) {
        const qmKeystrMatch = cookie.match(/qm_keystr=([^;]+)/);
        key = qmKeystrMatch[1];
        console.log(`使用qm_keystr: ${key.substring(0, 5)}...`);
    }
    else {
        console.log('未找到有效的key，尝试其他字段');
        
        // 尝试其他可能的key字段
        const possibleKeys = ['p_lskey', 'lskey', 'music_key'];
        for (const field of possibleKeys) {
            const match = cookie.match(new RegExp(field + '=([^;]+)'));
            if (match) {
                key = match[1];
                console.log(`使用${field}: ${key.substring(0, 5)}...`);
                break;
            }
        }
    }
    
    if (!key) {
        console.log('未找到任何有效key，使用默认值');
        return '123456';
    }
    
    // QQ的GTK算法（修正版）
    let hash = 5381;
    for (let i = 0; i < key.length; i++) {
        hash += (hash << 5) + key.charCodeAt(i);
    }
    
    const result = hash & 0x7fffffff;
    console.log(`计算GTK结果: ${result} (key长度: ${key.length})`);
    return result;
}

// 从Cookie中提取uin（用于显示）
function extractUin(cookie) {
    const match = cookie.match(/uin=(\d+)/);
    return match ? match[1] : null;
}
