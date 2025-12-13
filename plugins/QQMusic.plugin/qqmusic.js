// QQ音乐Cookie获取调试脚本
// 专门解决Cookie获取问题
// 作者: SXIE-ai

console.log('🔧 QQ音乐Cookie调试脚本启动');
console.log('================================');

// 详细的调试日志
function debugLog(title, data) {
    console.log(`\n📋 ${title}`);
    if (typeof data === 'object') {
        Object.entries(data).forEach(([key, value]) => {
            if (typeof value === 'string' && value.length > 100) {
                console.log(`  ${key}: ${value.substring(0, 100)}...`);
            } else {
                console.log(`  ${key}: ${value}`);
            }
        });
    } else {
        console.log(`  ${data}`);
    }
}

// 检查环境
function checkEnvironment() {
    debugLog('环境检查', {
        '$httpClient': typeof $httpClient,
        '$persistentStore': typeof $persistentStore,
        '$notification': typeof $notification,
        '$request': typeof $request,
        '$argument': typeof $argument,
        '时间': new Date().toLocaleString('zh-CN')
    });
}

// 检查当前请求的详细信息
function inspectRequest() {
    if (typeof $request === 'undefined') {
        console.log('❌ 没有请求对象');
        return null;
    }
    
    const request = {
        url: $request.url,
        method: $request.method || 'GET',
        headers: {},
        body: $request.body ? `[长度: ${$request.body.length}]` : '无'
    };
    
    // 收集所有头部
    if ($request.headers) {
        Object.keys($request.headers).forEach(key => {
            const value = $request.headers[key];
            if (key.toLowerCase().includes('cookie')) {
                request.headers[key] = `[Cookie长度: ${value.length}]`;
                request.cookiePreview = value.substring(0, 100) + '...';
            } else if (key.toLowerCase().includes('user-agent')) {
                request.headers[key] = value;
            } else {
                request.headers[key] = `[长度: ${value.length}]`;
            }
        });
    }
    
    debugLog('请求详情', request);
    return request;
}

// 分析Cookie
function analyzeCookie(cookie) {
    if (!cookie) {
        console.log('❌ Cookie为空');
        return null;
    }
    
    const analysis = {
        length: cookie.length,
        uin: null,
        p_skey: null,
        skey: null,
        p_lskey: null,
        qm_keyst: null,
        fragments: []
    };
    
    // 分割Cookie片段
    const fragments = cookie.split('; ').filter(f => f.trim());
    analysis.fragments = fragments;
    
    // 分析关键字段
    fragments.forEach(fragment => {
        const [key, ...valueParts] = fragment.split('=');
        const value = valueParts.join('=');
        const keyLower = key.toLowerCase();
        
        if (keyLower.includes('uin')) {
            analysis.uin = value;
        } else if (keyLower.includes('p_skey')) {
            analysis.p_skey = `[长度: ${value.length}]`;
        } else if (keyLower.includes('skey')) {
            analysis.skey = `[长度: ${value.length}]`;
        } else if (keyLower.includes('p_lskey')) {
            analysis.p_lskey = `[长度: ${value.length}]`;
        } else if (keyLower.includes('qm_keyst')) {
            analysis.qm_keyst = `[长度: ${value.length}]`;
        }
    });
    
    // 检查必需字段
    analysis.hasRequiredFields = analysis.uin && (analysis.p_skey || analysis.skey);
    analysis.isValid = analysis.hasRequiredFields;
    
    debugLog('Cookie分析', analysis);
    return analysis;
}

// 保存Cookie（带详细日志）
function saveCookieWithLog(cookie, source) {
    console.log(`\n💾 尝试保存Cookie（来源: ${source}）`);
    
    if (!cookie) {
        console.log('❌ Cookie为空，不保存');
        return false;
    }
    
    const analysis = analyzeCookie(cookie);
    if (!analysis || !analysis.isValid) {
        console.log('❌ Cookie格式无效，不保存');
        return false;
    }
    
    // 检查是否已存在
    const existing = $persistentStore.read('QQMusic_Cookie');
    if (existing === cookie) {
        console.log('ℹ️ Cookie未变化，不重复保存');
        return false;
    }
    
    // 保存Cookie
    $persistentStore.write(cookie, 'QQMusic_Cookie');
    
    // 保存元数据
    const metadata = {
        uin: analysis.uin,
        savedAt: new Date().toISOString(),
        source: source,
        length: cookie.length,
        url: $request ? $request.url : 'manual'
    };
    
    $persistentStore.write(JSON.stringify(metadata), 'QQMusic_Cookie_Meta');
    $persistentStore.write(new Date().toLocaleString('zh-CN'), 'QQMusic_Cookie_Time');
    
    console.log(`✅ Cookie保存成功`);
    console.log(`  账号: ${analysis.uin}`);
    console.log(`  长度: ${cookie.length} 字符`);
    console.log(`  时间: ${metadata.savedAt}`);
    
    // 发送通知
    $notification.post(
        'QQ音乐Cookie获取',
        '调试成功',
        `账号: ${analysis.uin}\n长度: ${cookie.length}字符\n来源: ${source}`
    );
    
    return true;
}

// 检查存储状态
function checkStorage() {
    console.log('\n📦 存储状态检查');
    
    const keys = [
        'QQMusic_Cookie',
        'QQMusic_Cookie_Meta',
        'QQMusic_Cookie_Time',
        'QQMusic_Plugin_Config',
        'QQMusic_Config'
    ];
    
    keys.forEach(key => {
        const value = $persistentStore.read(key);
        const exists = value !== undefined && value !== '';
        
        console.log(`${exists ? '✅' : '❌'} ${key}: ${exists ? '存在' : '不存在'}`);
        
        if (exists && key === 'QQMusic_Cookie') {
            const preview = value.substring(0, 50) + '...';
            console.log(`   内容: ${preview}`);
        }
    });
    
    // 检查所有键
    if ($persistentStore.allKeys) {
        const allKeys = $persistentStore.allKeys.filter(k => k.includes('QQ') || k.includes('qq'));
        console.log(`\n🔍 找到 ${allKeys.length} 个相关键:`);
        allKeys.forEach(key => {
            console.log(`  ${key}`);
        });
    }
}

// 测试MitM功能
function testMitM() {
    console.log('\n🔐 MitM功能测试');
    
    // 测试几个QQ音乐域名
    const testUrls = [
        'https://y.qq.com/',
        'https://c.y.qq.com/',
        'https://u.y.qq.com/'
    ];
    
    let successCount = 0;
    
    testUrls.forEach(url => {
        console.log(`  测试 ${url}...`);
        // 这里可以添加实际的HTTP测试
    });
    
    console.log(`  MitM测试完成，成功: ${successCount}/${testUrls.length}`);
}

// Cookie获取处理器（主函数）
function handleCookieCapture() {
    console.log('\n🎯 开始Cookie捕获处理');
    
    // 1. 检查环境
    checkEnvironment();
    
    // 2. 检查请求
    const requestInfo = inspectRequest();
    if (!requestInfo) {
        $done({});
        return;
    }
    
    // 3. 提取Cookie
    let cookie = null;
    let cookieSource = '未知';
    
    // 尝试不同位置的Cookie
    if ($request.headers) {
        // 标准位置
        if ($request.headers['Cookie']) {
            cookie = $request.headers['Cookie'];
            cookieSource = 'Cookie头部';
        } else if ($request.headers['cookie']) {
            cookie = $request.headers['cookie'];
            cookieSource = 'cookie头部（小写）';
        }
        
        // 尝试其他可能的位置
        const possibleHeaders = ['Set-Cookie', 'set-cookie', 'COOKIE', 'Cookie2'];
        possibleHeaders.forEach(header => {
            if (!$request.headers[header] && cookie) return;
            if ($request.headers[header]) {
                cookie = $request.headers[header];
                cookieSource = `${header}头部`;
            }
        });
    }
    
    if (!cookie) {
        console.log('❌ 未找到Cookie头部');
        
        // 检查请求体是否包含Cookie
        if ($request.body && typeof $request.body === 'string') {
            const cookieMatch = $request.body.match(/uin=[^&]+/);
            if (cookieMatch) {
                console.log('ℹ️ 在请求体中找到uin参数');
                // 可以进一步处理
            }
        }
        
        $done({});
        return;
    }
    
    console.log(`📨 找到Cookie（来源: ${cookieSource}）`);
    console.log(`   长度: ${cookie.length} 字符`);
    console.log(`   预览: ${cookie.substring(0, 80)}...`);
    
    // 4. 保存Cookie
    const saved = saveCookieWithLog(cookie, cookieSource);
    
    if (saved) {
        // 额外验证
        setTimeout(() => {
            verifySavedCookie();
        }, 1000);
    }
    
    $done({});
}

// 验证保存的Cookie
function verifySavedCookie() {
    const cookie = $persistentStore.read('QQMusic_Cookie');
    if (!cookie) {
        console.log('❌ 验证失败：Cookie未保存');
        return;
    }
    
    const analysis = analyzeCookie(cookie);
    if (analysis && analysis.isValid) {
        console.log(`✅ Cookie验证通过`);
        console.log(`   账号: ${analysis.uin}`);
        console.log(`   必需字段: ${analysis.hasRequiredFields ? '完整' : '缺失'}`);
        
        $notification.post(
            'Cookie验证',
            '验证成功',
            `账号 ${analysis.uin} 的Cookie已保存并验证`
        );
    } else {
        console.log('❌ Cookie验证失败');
    }
}

// 手动获取Cookie
function handleManualGetCookie() {
    console.log('\n👋 手动获取Cookie');
    
    // 检查当前存储
    checkStorage();
    
    const currentCookie = $persistentStore.read('QQMusic_Cookie');
    
    if (currentCookie) {
        const analysis = analyzeCookie(currentCookie);
        const message = `已有Cookie:\n账号: ${analysis.uin}\n长度: ${currentCookie.length}字符\n\n请打开QQ音乐App刷新`;
        
        console.log('ℹ️ ' + message.replace(/\n/g, ' '));
        $notification.post('QQ音乐Cookie', '已有Cookie', message);
    } else {
        const message = '未找到Cookie\n请打开QQ音乐App获取';
        
        console.log('ℹ️ ' + message);
        $notification.post('QQ音乐Cookie', '提示', message);
    }
}

// 显示当前Cookie
function handleShowCookie() {
    console.log('\n👁️ 显示当前Cookie');
    
    const cookie = $persistentStore.read('QQMusic_Cookie');
    const meta = $persistentStore.read('QQMusic_Cookie_Meta');
    
    if (!cookie) {
        console.log('❌ 未找到Cookie');
        $notification.post('Cookie查看', '无数据', '未保存任何Cookie');
        return;
    }
    
    const analysis = analyzeCookie(cookie);
    let metaInfo = {};
    
    try {
        metaInfo = meta ? JSON.parse(meta) : {};
    } catch (e) {
        metaInfo = { error: '解析失败' };
    }
    
    console.log('📋 Cookie信息:');
    console.log(`   账号: ${analysis.uin}`);
    console.log(`   长度: ${cookie.length} 字符`);
    console.log(`   保存时间: ${metaInfo.savedAt || '未知'}`);
    console.log(`   来源: ${metaInfo.source || '未知'}`);
    console.log(`   必需字段: ${analysis.hasRequiredFields ? '✅ 完整' : '❌ 缺失'}`);
    
    // 显示前200个字符
    console.log(`\n📝 Cookie预览（前200字符）:`);
    console.log(cookie.substring(0, 200) + '...');
    
    const message = `账号: ${analysis.uin}\n长度: ${cookie.length}字符\n时间: ${metaInfo.savedAt || '未知'}\n来源: ${metaInfo.source || '未知'}`;
    $notification.post('Cookie详情', analysis.uin, message);
}

// 主路由
(function main() {
    console.log('🚀 QQ音乐Cookie调试工具启动');
    console.log('================================');
    
    const args = {};
    if (typeof $argument !== 'undefined' && $argument) {
        $argument.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            if (key && value !== undefined) {
                args[key] = decodeURIComponent(value);
            }
        });
    }
    
    const action = args._action || args.action || '';
    
    console.log(`动作: ${action || 'capture'}`);
    console.log(`请求模式: ${typeof $request !== 'undefined' ? 'HTTP请求' : '脚本执行'}`);
    
    // 根据动作执行不同功能
    switch (action) {
        case 'test':
            console.log('\n🧪 执行环境测试');
            checkEnvironment();
            checkStorage();
            $done();
            break;
            
        case 'mitm':
            console.log('\n🔐 执行MitM测试');
            testMitM();
            $done();
            break;
            
        case 'storage':
            console.log('\n📦 执行存储测试');
            checkStorage();
            $done();
            break;
            
        case 'getcookie':
            console.log('\n👋 手动获取Cookie');
            handleManualGetCookie();
            $done();
            break;
            
        case 'showcookie':
            console.log('\n👁️ 显示当前Cookie');
            handleShowCookie();
            $done();
            break;
            
        case 'capture':
        default:
            // 默认：Cookie捕获
            if (typeof $request === 'undefined') {
                console.log('❌ 不是HTTP请求，无法捕获Cookie');
                console.log('💡 提示：请打开QQ音乐App触发请求');
                $done();
            } else {
                handleCookieCapture();
            }
    }
    
    console.log('\n================================');
    console.log('🎯 调试执行完成');
})();