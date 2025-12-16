// 中国联通签到脚本 for Loon
// 版本: 2.0.0
// 功能: 签到 + 抽奖 + 查询余量
// 需要先抓包获取Cookie配置

const CONFIG = {
    name: '中国联通签到',
    version: '2.0.0',
    author: 'SXIE-ai',

  // === 用户配置区（手动修改这里）===
const USER_CONFIG = {
  // 登录配置
  loginUrl: "https://act.10010.com/SigninApp/login",
  loginHeaders: {
    "Cookie": "ecs_token=eyJkYXRhIjoiYzhkYjRiOGNjYWJlNDYyYjg2MjkxYWJkZmZjZjFiZTQ0N2EwYmYzODc3YWUzYzJjYmU5ZjUyOWFhMmQxNjY2NDQzYTg1MmY5N2NmZDUyODQwOGVkYmJlYWQ1MjQ4YTEyYmRlMTlkMWI4Y2UyNGQzNmY5OGY0YTkzNDFlYWY1MDZiNGM2NzU3ZDRjOWE2Mzk1YjdmOWJjNmI3YWJkZDBkMjE4MmViZTg5NGZmODQ0NmQ4M2RmMWJjNjliZWZlNDk4YzcyNjFkZjE4OWZlMTNmMzliNDBjMGY4NDRlMmRiMGY4MDU1M2U4ZTViYTI2OTVjYTc3ZmU0MjY2OGE3MWU0NDUyYThlZWE0N2ZhMjVlZjU0ZDZjM2Y2YjczNjE2M2ZiMTE4MDI3MDFlNTkzZTRjZWJlNGE1MjJmYTA0NmMxNWM3MTkzYTRkN2E3YmY3MjJkOTE5NmEyMWQ3OTdlOWI5Zjc5NDY1MjMzNGM2NzgzNmQyOThkM2EwZjAxOTFiMzNkMzBkYzk1MjA0ZjY0N2EzNjQ3YjAxNzc2ODMzZjk3YTExMGEyMDE0ZmY4YTdhMjliZmNhYTEwMWJhMjFjYWM4NyIsInZlcnNpb24iOiIwMCJ9;t3_token=079161d6ccdbf793da6d26d4e62bff38;PvSessionId=20251216235313367BA4A3-D15D-4449-B7F8-DB209A9997E5;devicedId=367BA4A3-D15D-4449-B7F8-DB209A9997E5;cw_mutual=7064d003eb3c8934e769e430ecf3d64aa2eab2e201564032ff2e99be6d9dc5915cea2e60447b0cd01a4be5936f36624092f2ee1860f197effea41662eada20a5;login_type=06;c_mobile=18556734898;c_id=c8d5b5eb5a56fccebc49892cf6bf899d9ed00ff3314cacf1665d609fb0b8b36d;u_areaCode=;c_version=iphone_c@12.0801;channel=GGPD;wo_family=0;u_account=18556734898;city=034|450|90063345|-99;invalid_at=c22860e5e664936b33c57cc4ee0ec62a17a24e65040286d1a63989e9c9f1c1a4;ecs_acc=RDwx9SCYg/abxn1GmlfW6Xmr/Z5rrFY/bqzym1KTt3beNhfEHHZfORhwwYDSTYVa9K3WScJnglUAXR1tyvvjLALIvU1C29e9VUyt+n5CgVt4GJpmDmkOHzalVQ0RS/fb5jeLMJMw6ARSOQzgOgsHG8tBtvFZygwBLASZvxdioe8=;random_login=0;enc_acc=RDwx9SCYg/abxn1GmlfW6Xmr/Z5rrFY/bqzym1KTt3beNhfEHHZfORhwwYDSTYVa9K3WScJnglUAXR1tyvvjLALIvU1C29e9VUyt+n5CgVt4GJpmDmkOHzalVQ0RS/fb5jeLMJMw6ARSOQzgOgsHG8tBtvFZygwBLASZvxdioe8=;third_token=eyJkYXRhIjoiMzVmMTllNmYxMDJkZWM5OTcxM2JiZDJmMTYxOTIzZWNjZTFlMTg4NzA0ODE5ODU4MjE3YzdhZjM2OTZiOGNlM2U4NTYxYTE4YWJiYjJkODJlYWYzZWNiOTQxYzM2ZDVlNGM3MDU2YTFhZDlhMTgwNGZlYTU0NGI5MTdmNDBlZGY4YTgwMTI1NmNlZTk5MTU0OGY3NjZkNzlhNzJkMDMwOCIsInZlcnNpb24iOiIwMCJ9;",
    "User-Agent": "ChinaUnicom/7.4.0",
    "Content-Type": "application/x-www-form-urlencoded"
  },
  
  // 签到配置
  signUrl: "https://act.10010.com/SigninApp/signin/daySign",
  signHeaders: {
    "Cookie": "ecs_token=eyJkYXRhIjoiYzhkYjRiOGNjYWJlNDYyYjg2MjkxYWJkZmZjZjFiZTQ0N2EwYmYzODc3YWUzYzJjYmU5ZjUyOWFhMmQxNjY2NDQzYTg1MmY5N2NmZDUyODQwOGVkYmJlYWQ1MjQ4YTEyNGIwNDRmNTdhZTBkMjUzYmY0ZmE2MmUxYzNiZjk5NDZhYWY5NDRiNDZkMDMxOWNjY2RkYzNhM2EyNzVmYzliMzc5ZGVmZmM0M2M3Njc0YTE5OGVjMGRlNDU2ODEyYjA4YWU3ZmQ0OTM0NjM0OTdiNWZlOGE5OTUzOTAyZTg3YWE3YThiMWEyMTUyYjFiYWU4YTFkODZhNzI1Yzg5ZWRjMDUwODI4MDZiMGM2NGM2MmY5NjFiMTJkNjUzMzgyN2M5MDQ3MDdmMWEyMjQyZDFlMmYwMjgzZDVhOGEzZDIzYWQyNzY4M2Q0NTdkZmFjZGUxNDBhZTUxYTcyOTRjMWFkMWYxNzYxMmY2ZGMyMTVjZTUzYjhmOWRkYjQ5NzBkNzI3OWRhOWY1ZGRiODVmZDliNGRhMjI1MzZkNTFlZDc2MmVmMzAzYmM4YWEwMWRhMThkOTYwM2M0YmVhMTAzNTlhMiIsInZlcnNpb24iOiIwMCJ9",
    "Referer": "https://act.10010.com/SigninApp/signin/index",
    "User-Agent": "ChinaUnicom/7.4.0"
  },
  
  // 功能开关
  enableSign: true,
  enableLottery: true,
  enableNotification: true
};
// === 配置结束 ===
    // 默认配置
    defaults: {
        enableSign: true,
        enableLottery: true,
        enableNotification: true
    }
};

// 全局状态
const state = {
    signResult: null,
    lotteryResult: null,
    userInfo: null,
    lotteryToken: null,
    lotteryTimes: 0,
    lotteryList: [],
    errors: []
};

// 主函数
async function main() {
    console.log(`🚀 ${CONFIG.name} v${CONFIG.version} 开始执行`);
    
    try {
        // 1. 加载配置
        const config = await loadConfig();
        if (!validateConfig(config)) {
            return;
        }
        
        // 2. 执行签到相关任务
        if (config.enableSign) {
            console.log('📝 开始签到任务');
            await executeSignTasks(config);
        }
        
        // 3. 执行抽奖任务
        if (config.enableLottery && config.lotteryLoginUrl) {
            console.log('🎰 开始抽奖任务');
            await executeLotteryTasks(config);
        }
        
        // 4. 查询用户信息
        console.log('📱 查询用户信息');
        await queryUserInfo(config);
        
        // 5. 显示结果
        await showResults(config);
        
        console.log(`✅ ${CONFIG.name} 执行完成`);
        
    } catch (error) {
        console.error(`❌ 主函数执行失败: ${error}`);
        state.errors.push(`主函数错误: ${error.message}`);
        await showErrorResults();
    }
}

// 加载配置
async function loadConfig() {
    try {
        // 从环境变量获取
        let config = CONFIG.defaults;
        
        if (typeof $environment !== 'undefined' && $environment.params) {
            try {
                const params = new URLSearchParams($environment.params);
                config = {
                    loginUrl: params.get('loginUrl') || '',
                    loginHeaders: params.get('loginHeaders') || '{}',
                    signUrl: params.get('signUrl') || '',
                    signHeaders: params.get('signHeaders') || '{}',
                    lotteryLoginUrl: params.get('lotteryLoginUrl') || '',
                    lotteryLoginHeaders: params.get('lotteryLoginHeaders') || '{}',
                    enableSign: params.get('enableSign') !== 'false',
                    enableLottery: params.get('enableLottery') !== 'false',
                    enableNotification: params.get('enableNotification') !== 'false'
                };
                
                // 解析JSON headers
                try {
                    config.loginHeaders = JSON.parse(config.loginHeaders);
                    config.signHeaders = JSON.parse(config.signHeaders);
                    config.lotteryLoginHeaders = JSON.parse(config.lotteryLoginHeaders);
                } catch (e) {
                    console.warn('⚠️ 解析Headers失败，使用空对象');
                    config.loginHeaders = {};
                    config.signHeaders = {};
                    config.lotteryLoginHeaders = {};
                }
                
                console.log('📋 从环境变量加载配置成功');
            } catch (e) {
                console.warn('⚠️ 解析环境变量失败:', e);
            }
        }
        
        // 从持久化存储获取（用户可能已经保存）
        try {
            const savedConfig = $persistentStore.read('china_unicom_config');
            if (savedConfig) {
                const userConfig = JSON.parse(savedConfig);
                Object.assign(config, userConfig);
                console.log('📋 从持久化存储加载配置');
            }
        } catch (e) {
            console.warn('⚠️ 读取持久化配置失败:', e);
        }
        
        return config;
        
    } catch (error) {
        console.error('❌ 加载配置失败:', error);
        throw error;
    }
}

// 验证配置
function validateConfig(config) {
    const errors = [];
    
    if (config.enableSign) {
        if (!config.loginUrl || !config.signUrl) {
            errors.push('签到需要配置loginUrl和signUrl');
        }
        if (!config.signHeaders || Object.keys(config.signHeaders).length === 0) {
            errors.push('需要配置签到Headers（包含Cookie）');
        }
    }
    
    if (config.enableLottery && !config.lotteryLoginUrl) {
        console.log('⚠️ 未配置抽奖URL，跳过抽奖');
        config.enableLottery = false;
    }
    
    if (errors.length > 0) {
        state.errors = errors;
        console.error('❌ 配置验证失败:', errors);
        $notification.post(CONFIG.name, '配置错误', errors.join('\n'));
        return false;
    }
    
    return true;
}

// 执行签到任务
async function executeSignTasks(config) {
    try {
        // 1. 登录（如果需要）
        if (config.loginUrl && config.loginHeaders) {
            await login(config.loginUrl, config.loginHeaders);
        }
        
        // 2. 签到
        await sign(config.signUrl || 'https://act.10010.com/SigninApp/signin/daySign', config.signHeaders);
        
    } catch (error) {
        console.error('❌ 签到任务失败:', error);
        state.errors.push(`签到失败: ${error.message}`);
    }
}

// 登录
function login(url, headers) {
    return new Promise((resolve, reject) => {
        const request = {
            url: url,
            headers: headers,
            timeout: 10
        };
        
        $httpClient.post(request, function(error, response, data) {
            if (error) {
                console.error('❌ 登录失败:', error);
                reject(error);
            } else {
                console.log('✅ 登录成功');
                resolve(data);
            }
        });
    });
}

// 签到
function sign(url, headers) {
    return new Promise((resolve, reject) => {
        // 处理URL
        let signUrl = url;
        if (signUrl.endsWith('.do')) {
            signUrl = signUrl.replace('.do', '');
        }
        
        const request = {
            url: signUrl,
            headers: headers,
            timeout: 10
        };
        
        $httpClient.post(request, function(error, response, data) {
            if (error) {
                console.error('❌ 签到请求失败:', error);
                reject(error);
            } else {
                try {
                    const result = JSON.parse(data);
                    console.log('✅ 签到响应:', JSON.stringify(result));
                    
                    state.signResult = result;
                    
                    if (result.status === '0000') {
                        console.log(`✅ 签到成功，获得积分: ${result.data?.prizeCount || 0}`);
                    } else if (result.status === '0002') {
                        console.log('ℹ️ 今日已签到');
                    } else {
                        console.warn(`⚠️ 签到失败: ${result.msg || result.status}`);
                    }
                    
                    resolve(result);
                } catch (e) {
                    console.error('❌ 解析签到结果失败:', e, '原始数据:', data);
                    reject(e);
                }
            }
        });
    });
}

// 执行抽奖任务
async function executeLotteryTasks(config) {
    try {
        // 1. 获取抽奖token
        state.lotteryToken = await getLotteryToken(config.lotteryLoginUrl, config.lotteryLoginHeaders);
        if (!state.lotteryToken) {
            console.log('⚠️ 未获取到抽奖token，跳过抽奖');
            return;
        }
        
        // 2. 获取抽奖次数
        state.lotteryTimes = await getLotteryTimes(state.lotteryToken, config.lotteryLoginHeaders);
        console.log(`🎰 可抽奖次数: ${state.lotteryTimes}`);
        
        // 3. 执行抽奖
        if (state.lotteryTimes > 0) {
            for (let i = 0; i < state.lotteryTimes; i++) {
                const lotteryResult = await doLottery(state.lotteryToken, config.lotteryLoginHeaders);
                state.lotteryList.push(lotteryResult);
                // 避免请求过快
                await sleep(500);
            }
            console.log(`✅ 完成 ${state.lotteryTimes} 次抽奖`);
        }
        
    } catch (error) {
        console.error('❌ 抽奖任务失败:', error);
        state.errors.push(`抽奖失败: ${error.message}`);
    }
}

// 获取抽奖token
function getLotteryToken(url, headers) {
    return new Promise((resolve, reject) => {
        const request = {
            url: url,
            headers: headers,
            timeout: 10
        };
        
        $httpClient.get(request, function(error, response, data) {
            if (error) {
                console.error('❌ 获取抽奖token失败:', error);
                reject(error);
            } else {
                try {
                    // 从响应中提取encryptmobile
                    const tokenMatch = data.match(/encryptmobile=([^('|")]*)/);
                    if (tokenMatch && tokenMatch[1]) {
                        console.log('✅ 获取抽奖token成功');
                        resolve(tokenMatch[1]);
                    } else {
                        console.warn('⚠️ 未找到抽奖token');
                        resolve(null);
                    }
                } catch (e) {
                    console.error('❌ 解析抽奖token失败:', e);
                    reject(e);
                }
            }
        });
    });
}

// 获取抽奖次数
function getLotteryTimes(token, headers) {
    return new Promise((resolve, reject) => {
        const url = `https://m.client.10010.com/dailylottery/static/findActivityInfo?encryptmobile=${token}`;
        
        const request = {
            url: url,
            headers: headers,
            timeout: 10
        };
        
        $httpClient.get(request, function(error, response, data) {
            if (error) {
                console.error('❌ 获取抽奖次数失败:', error);
                reject(error);
            } else {
                try {
                    const result = JSON.parse(data);
                    if (result.acFrequency && result.acFrequency.usableAcFreq !== undefined) {
                        resolve(result.acFrequency.usableAcFreq);
                    } else {
                        console.warn('⚠️ 未找到抽奖次数信息:', result);
                        resolve(0);
                    }
                } catch (e) {
                    console.error('❌ 解析抽奖次数失败:', e);
                    reject(e);
                }
            }
        });
    });
}

// 执行抽奖
function doLottery(token, headers) {
    return new Promise((resolve, reject) => {
        const url = `https://m.client.10010.com/dailylottery/static/doubleball/choujiang?usernumberofjsp=${token}`;
        
        const request = {
            url: url,
            method: 'POST',
            headers: Object.assign({}, headers, {
                'Referer': `https://m.client.10010.com/dailylottery/static/doubleball/firstpage?encryptmobile=${token}`
            }),
            timeout: 10
        };
        
        $httpClient.post(request, function(error, response, data) {
            if (error) {
                console.error('❌ 抽奖请求失败:', error);
                reject(error);
            } else {
                try {
                    const result = JSON.parse(data);
                    console.log(`🎯 抽奖结果: ${result.RspMsg || '未知'}`);
                    resolve(result);
                } catch (e) {
                    console.error('❌ 解析抽奖结果失败:', e);
                    reject(e);
                }
            }
        });
    });
}

// 查询用户信息
async function queryUserInfo(config) {
    try {
        if (!config.signHeaders || !config.signHeaders.Cookie) {
            console.log('⚠️ 无Cookie信息，跳过查询用户信息');
            return;
        }
        
        // 从Cookie中提取手机号
        const cookie = config.signHeaders.Cookie;
        let mobile = '';
        
        // 尝试多种方式获取手机号
        if (cookie.includes('u_account=')) {
            const match = cookie.match(/u_account=([^;]+)/);
            if (match) mobile = match[1];
        }
        
        if (!mobile && config.signHeaders.Referer) {
            const referer = config.signHeaders.Referer;
            if (referer.includes('desmobile=')) {
                const match = referer.match(/desmobile=([^&]+)/);
                if (match) mobile = match[1];
            }
        }
        
        if (!mobile) {
            console.log('⚠️ 无法获取手机号，跳过查询用户信息');
            return;
        }
        
        const url = `https://m.client.10010.com/mobileService/home/queryUserInfoSeven.htm?version=iphone_c@7.0403&desmobiel=${mobile}&showType=3`;
        
        const request = {
            url: url,
            headers: { "Cookie": config.signHeaders.Cookie },
            timeout: 10
        };
        
        $httpClient.get(request, function(error, response, data) {
            if (error) {
                console.error('❌ 查询用户信息失败:', error);
            } else {
                try {
                    const result = JSON.parse(data);
                    if (result.code === 'Y') {
                        state.userInfo = result;
                        console.log('✅ 查询用户信息成功');
                    } else {
                        console.warn('⚠️ 用户信息查询失败:', result.msg);
                    }
                } catch (e) {
                    console.error('❌ 解析用户信息失败:', e);
                }
            }
        });
        
    } catch (error) {
        console.error('❌ 查询用户信息过程出错:', error);
    }
}

// 显示结果
async function showResults(config) {
    let title = CONFIG.name;
    let subtitle = '';
    let body = '';
    
    // 签到结果
    if (state.signResult) {
        if (state.signResult.status === '0000') {
            subtitle = '签到成功';
            const data = state.signResult.data || {};
            body += `✅ 签到成功\n`;
            body += `积分: +${data.prizeCount || 0}\n`;
            body += `成长值: +${data.growthV || 0}\n`;
            body += `鲜花: +${data.flowerCount || 0}\n`;
        } else if (state.signResult.status === '0002') {
            subtitle = '今日已签到';
            body += `ℹ️ 今日已签到\n`;
        } else {
            subtitle = '签到失败';
            body += `❌ 签到失败: ${state.signResult.msg || state.signResult.status}\n`;
        }
        body += '\n';
    }
    
    // 抽奖结果
    if (state.lotteryList.length > 0) {
        subtitle = subtitle ? `${subtitle} | 抽奖` : '抽奖完成';
        body += `🎰 抽奖完成 (${state.lotteryList.length}次):\n`;
        state.lotteryList.forEach((result, index) => {
            body += `${index + 1}. ${result.RspMsg || '未知'}\n`;
        });
        body += '\n';
    }
    
    // 用户信息
    if (state.userInfo && state.userInfo.data && state.userInfo.data.dataList) {
        body += `📱 账户信息:\n`;
        state.userInfo.data.dataList.forEach(item => {
            if (item && item.remainTitle && item.number !== undefined) {
                body += `${item.remainTitle}: ${item.number}${item.unit || ''}\n`;
            }
        });
    }
    
    // 错误信息
    if (state.errors.length > 0) {
        body += `\n⚠️ 错误信息:\n`;
        state.errors.forEach((error, index) => {
            body += `${index + 1}. ${error}\n`;
        });
    }
    
    // 如果没有内容
    if (!body) {
        body = '无任务执行结果\n请检查配置是否正确';
    }
    
    // 发送通知
    if (config.enableNotification && typeof $notification !== 'undefined') {
        const finalSubtitle = subtitle || '执行完成';
        $notification.post(title, finalSubtitle, body);
    }
    
    // 输出到面板
    if (typeof $done !== 'undefined') {
        const panelTitle = subtitle ? `${title} - ${subtitle}` : title;
        $done({
            title: panelTitle,
            content: body,
            icon: 'antenna.radiowaves.left.and.right'
        });
    }
}

// 显示错误结果
function showErrorResults() {
    const title = CONFIG.name;
    const subtitle = '执行失败';
    let body = '脚本执行过程中发生错误:\n\n';
    
    if (state.errors.length > 0) {
        state.errors.forEach((error, index) => {
            body += `${index + 1}. ${error}\n`;
        });
    } else {
        body += '未知错误，请查看日志\n';
    }
    
    body += '\n请检查:\n1. 网络连接\n2. Cookie是否有效\n3. 配置是否正确';
    
    if (typeof $notification !== 'undefined') {
        $notification.post(title, subtitle, body);
    }
    
    if (typeof $done !== 'undefined') {
        $done({
            title: `${title} - 错误`,
            content: body,
            icon: 'exclamationmark.triangle',
            style: 'error'
        });
    }
}

// 工具函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 执行
main().catch(error => {
    console.error('❌ 脚本执行失败:', error);
    if (typeof $done !== 'undefined') {
        $done({
            title: `${CONFIG.name} - 错误`,
            content: `执行失败: ${error.message}`,
            icon: 'exclamationmark.triangle',
            style: 'error'
        });
    }
});
