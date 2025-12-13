// QQ音乐统一版插件 v3.0.0
// 同时支持单账号和多账号模式
// 作者: SXIE-ai

console.log('🎵 QQ音乐统一版插件启动');

// ============================================
// 配置管理器
// ============================================

class UnifiedConfig {
    constructor() {
        this.mode = this.detectMode();
        this.config = this.loadConfig();
        console.log(`运行模式: ${this.mode}, 通知: ${this.config.notification}`);
    }
    
    // 检测运行模式
    detectMode() {
        const args = this.parseArguments();
        let mode = args.mode || 'auto';
        
        if (mode === 'auto') {
            // 自动检测：检查已有数据
            if (this.hasMultiAccountData()) {
                mode = 'multi';
                console.log('检测到多账号数据，使用多账号模式');
            } else if (this.hasSingleAccountData()) {
                mode = 'single';
                console.log('检测到单账号数据，使用单账号模式');
            } else {
                mode = 'single'; // 默认单账号
                console.log('未检测到数据，使用默认单账号模式');
            }
        }
        
        return mode;
    }
    
    // 解析参数
    parseArguments() {
        const args = {};
        
        if (typeof $argument !== 'undefined' && $argument) {
            if (typeof $argument === 'string') {
                $argument.split('&').forEach(pair => {
                    const [key, value] = pair.split('=');
                    if (key && value !== undefined) {
                        args[key] = decodeURIComponent(value);
                    }
                });
            }
        }
        
        return args;
    }
    
    // 加载配置
    loadConfig() {
        const defaults = {
            notification: true,
            vip: true,
            cookieSwitch: true,
            checkinTime: '09:10'
        };
        
        // 从插件参数获取配置
        const args = this.parseArguments();
        Object.keys(defaults).forEach(key => {
            if (args[key] !== undefined) {
                defaults[key] = this.parseValue(args[key]);
            }
        });
        
        // 从存储获取用户配置
        const saved = this.loadSavedConfig();
        if (saved) {
            Object.assign(defaults, saved);
        }
        
        return defaults;
    }
    
    parseValue(value) {
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (!isNaN(value) && value !== '') return Number(value);
        return value;
    }
    
    loadSavedConfig() {
        try {
            const config = $persistentStore.read('QQMusic_Universal_Config');
            return config ? JSON.parse(config) : null;
        } catch (e) {
            return null;
        }
    }
    
    saveConfig() {
        $persistentStore.write(JSON.stringify(this.config), 'QQMusic_Universal_Config');
    }
    
    // 数据检测
    hasMultiAccountData() {
        const config = $persistentStore.read('QQMusic_Plugin_Config');
        if (!config) return false;
        
        try {
            const data = JSON.parse(config);
            return data.accounts && data.accounts.length > 0;
        } catch (e) {
            return false;
        }
    }
    
    hasSingleAccountData() {
        const cookie = $persistentStore.read('QQMusic_Cookie');
        return !!cookie && cookie.includes('uin=');
    }
    
    isMultiMode() {
        return this.mode === 'multi';
    }
    
    isSingleMode() {
        return this.mode === 'single';
    }
}

// ============================================
// 统一账号管理器
// ============================================

class UnifiedAccountManager {
    constructor(config) {
        this.config = config;
        this.mode = config.mode;
    }
    
    // 获取所有账号（兼容两种模式）
    getAccounts() {
        if (this.config.isMultiMode()) {
            return this.getMultiAccounts();
        } else {
            return this.getSingleAccount();
        }
    }
    
    // 获取多账号数据
    getMultiAccounts() {
        try {
            const configStr = $persistentStore.read('QQMusic_Plugin_Config');
            if (!configStr) return [];
            
            const config = JSON.parse(configStr);
            if (!config.accounts) return [];
            
            return config.accounts
                .filter(acc => acc.enabled !== false)
                .map(acc => ({
                    name: acc.name || `账号${acc.uin}`,
                    cookie: acc.cookie,
                    uin: acc.uin || this.extractUin(acc.cookie),
                    enabled: true,
                    source: 'multi'
                }));
        } catch (e) {
            console.log('读取多账号失败:', e);
            return [];
        }
    }
    
    // 获取单账号数据
    getSingleAccount() {
        const cookie = $persistentStore.read('QQMusic_Cookie');
        if (!cookie) return [];
        
        const uin = this.extractUin(cookie);
        const time = $persistentStore.read('QQMusic_Cookie_Time') || '未知';
        
        return [{
            name: '主账号',
            cookie: cookie,
            uin: uin,
            enabled: true,
            lastUpdate: time,
            source: 'single'
        }];
    }
    
    // 保存账号（根据模式）
    saveAccount(account) {
        if (this.config.isMultiMode()) {
            return this.saveToMulti(account);
        } else {
            return this.saveToSingle(account.cookie);
        }
    }
    
    // 保存到多账号系统
    saveToMulti(account) {
        try {
            let config = {
                accounts: [],
                multiAccount: true,
                enableNotification: true
            };
            
            const configStr = $persistentStore.read('QQMusic_Plugin_Config');
            if (configStr) {
                config = JSON.parse(configStr);
            }
            
            // 检查是否已存在
            const existingIndex = config.accounts.findIndex(acc => 
                acc.uin === account.uin || acc.cookie === account.cookie
            );
            
            if (existingIndex >= 0) {
                // 更新现有账号
                config.accounts[existingIndex] = {
                    ...config.accounts[existingIndex],
                    ...account,
                    lastUpdate: new Date().toISOString()
                };
            } else {
                // 添加新账号
                config.accounts.push({
                    name: account.name || `账号${account.uin}`,
                    cookie: account.cookie,
                    uin: account.uin,
                    enabled: true,
                    created: new Date().toISOString(),
                    lastUpdate: new Date().toISOString()
                });
            }
            
            $persistentStore.write(JSON.stringify(config), 'QQMusic_Plugin_Config');
            console.log(`多账号保存成功: ${account.uin}`);
            return true;
            
        } catch (e) {
            console.log('保存到多账号失败:', e);
            return false;
        }
    }
    
    // 保存到单账号系统
    saveToSingle(cookie) {
        if (!this.isValidCookie(cookie)) {
            console.log('Cookie无效，不保存');
            return false;
        }
        
        $persistentStore.write(cookie, 'QQMusic_Cookie');
        $persistentStore.write(new Date().toLocaleString('zh-CN'), 'QQMusic_Cookie_Time');
        
        console.log('单账号保存成功');
        return true;
    }
    
    // 从Cookie提取uin
    extractUin(cookie) {
        if (!cookie) return '未知';
        const match = cookie.match(/uin=o?(\d+)/i);
        return match ? match[1] : '未知';
    }
    
    // 验证Cookie
    isValidCookie(cookie) {
        if (!cookie) return false;
        return cookie.includes('uin=') && (cookie.includes('p_skey=') || cookie.includes('skey='));
    }
    
    // 获取账号数量
    getAccountCount() {
        const accounts = this.getAccounts();
        return accounts.length;
    }
    
    // 检查是否有账号
    hasAccounts() {
        return this.getAccountCount() > 0;
    }
    
    // 获取模式信息
    getModeInfo() {
        const accounts = this.getAccounts();
        return {
            mode: this.mode,
            count: accounts.length,
            accounts: accounts.map(acc => ({
                name: acc.name,
                uin: acc.uin,
                source: acc.source
            }))
        };
    }
}

// ============================================
// Cookie获取处理器
// ============================================

class CookieHandler {
    constructor(config, accountManager) {
        this.config = config;
        this.accountManager = accountManager;
    }
    
    // 处理Cookie获取请求
    handleRequest() {
        if (!this.config.config.cookieSwitch) {
            console.log('Cookie获取开关已关闭');
            $done({});
            return;
        }
        
        const url = $request.url;
        const cookie = $request.headers['Cookie'] || $request.headers['cookie'];
        
        if (!this.isQQMusicRequest(url) || !cookie) {
            $done({});
            return;
        }
        
        if (!this.accountManager.isValidCookie(cookie)) {
            console.log('Cookie格式无效');
            $done({});
            return;
        }
        
        const uin = this.accountManager.extractUin(cookie);
        const account = {
            name: `账号${uin}`,
            cookie: cookie,
            uin: uin
        };
        
        const saved = this.accountManager.saveAccount(account);
        
        if (saved && this.config.config.notification) {
            const mode = this.config.isMultiMode() ? '多账号' : '单账号';
            $notification.post('QQ音乐', `Cookie已保存(${mode})`, `账号: ${uin}`);
        }
        
        $done({});
    }
    
    isQQMusicRequest(url) {
        return url.includes('y.qq.com') || 
               url.includes('c.y.qq.com') || 
               url.includes('u.y.qq.com');
    }
}

// ============================================
// 签到管理器
// ============================================

class UnifiedCheckinManager {
    constructor(config, accountManager) {
        this.config = config;
        this.accountManager = accountManager;
        this.results = [];
    }
    
    // 执行签到
    async execute() {
        console.log(`开始执行签到（${this.config.mode}模式）`);
        
        const accounts = this.accountManager.getAccounts();
        
        if (accounts.length === 0) {
            this.sendNotification('QQ音乐签到', '失败', '请先获取Cookie');
            return;
        }
        
        console.log(`找到 ${accounts.length} 个账号`);
        
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            console.log(`处理账号 ${i + 1}/${accounts.length}: ${account.name}`);
            
            const result = await this.processAccount(account);
            this.results.push(result);
            
            // 账号间延迟
            if (i < accounts.length - 1) {
                await this.delay(2000);
            }
        }
        
        await this.sendSummary();
    }
    
    // 处理单个账号
    async processAccount(account) {
        const result = {
            name: account.name,
            uin: account.uin,
            success: false,
            message: '',
            error: null,
            timestamp: new Date().toISOString()
        };
        
        try {
            // 检查今天是否已签到
            if (this.hasCheckedToday(account.uin)) {
                result.success = true;
                result.message = '今日已签到';
                return result;
            }
            
            // 执行签到
            const checkinResult = await this.doCheckin(account.cookie);
            
            if (checkinResult.code === 0) {
                result.success = true;
                result.message = this.parseReward(checkinResult);
                
                // 保存签到记录
                this.saveCheckinRecord(account.uin);
                
                // VIP签到
                if (this.config.config.vip) {
                    await this.delay(1000);
                    await this.doVipCheckin(account.cookie);
                }
                
            } else if (checkinResult.code === 1001) {
                result.success = true;
                result.message = '今日已签到';
                this.saveCheckinRecord(account.uin);
            } else {
                result.error = `签到失败: ${checkinResult.code}`;
            }
            
        } catch (error) {
            result.error = error.message;
            console.error(`账号处理失败: ${account.name}`, error);
        }
        
        return result;
    }
    
    // 执行签到请求
    async doCheckin(cookie) {
        const uin = this.accountManager.extractUin(cookie);
        
        const requestData = {
            "comm": { "ct": "6", "cv": "1000", "uin": uin },
            "req": { "module": "music.task.TaskCenterServer", "method": "CheckIn", "param": {} }
        };
        
        return await this.httpRequest({
            url: 'https://u.y.qq.com/cgi-bin/musicu.fcg',
            headers: {
                'Cookie': cookie,
                'User-Agent': 'QQMusic/12.0.5',
                'Content-Type': 'application/json',
                'Referer': 'https://y.qq.com/'
            },
            body: JSON.stringify(requestData)
        });
    }
    
    // VIP签到
    async doVipCheckin(cookie) {
        const uin = this.accountManager.extractUin(cookie);
        
        const requestData = {
            "comm": { "ct": "6", "cv": "1000", "uin": uin },
            "req": { "module": "music.vip.VipCenterServer", "method": "CheckIn", "param": {} }
        };
        
        return await this.httpRequest({
            url: 'https://u.y.qq.com/cgi-bin/musicu.fcg',
            headers: {
                'Cookie': cookie,
                'User-Agent': 'QQMusic/12.0.5',
                'Content-Type': 'application/json',
                'Referer': 'https://y.qq.com/'
            },
            body: JSON.stringify(requestData)
        });
    }
    
    // HTTP请求
    async httpRequest(options) {
        return new Promise((resolve, reject) => {
            $httpClient.post(options, (error, response, data) => {
                if (error) {
                    reject(error);
                    return;
                }
                
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (e) {
                    reject(new Error('响应解析失败'));
                }
            });
        });
    }
    
    // 解析奖励
    parseReward(result) {
        const reward = result.req?.data?.reward || {};
        const parts = [];
        
        if (reward.exp) parts.push(`经验+${reward.exp}`);
        if (reward.point) parts.push(`积分+${reward.point}`);
        if (reward.vip_point) parts.push(`成长值+${reward.vip_point}`);
        
        return parts.length > 0 ? parts.join(' ') : '签到成功';
    }
    
    // 检查今天是否已签到
    hasCheckedToday(uin) {
        const key = `QQMusic_Checked_${uin}`;
        const lastDate = $persistentStore.read(key);
        const today = new Date().toLocaleDateString('zh-CN');
        return lastDate === today;
    }
    
    // 保存签到记录
    saveCheckinRecord(uin) {
        const today = new Date().toLocaleDateString('zh-CN');
        const key = `QQMusic_Checked_${uin}`;
        $persistentStore.write(today, key);
    }
    
    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 发送汇总通知
    async sendSummary() {
        if (!this.config.config.notification) return;
        
        const successCount = this.results.filter(r => r.success).length;
        const failCount = this.results.length - successCount;
        
        if (this.results.length === 0) return;
        
        let title = 'QQ音乐签到';
        let subtitle = `成功: ${successCount}, 失败: ${failCount}`;
        let message = '';
        
        this.results.forEach(result => {
            if (result.success) {
                message += `✅ ${result.name}: ${result.message}\n`;
            } else {
                message += `❌ ${result.name}: ${result.error}\n`;
            }
        });
        
        if (message) {
            $notification.post(title, subtitle, message.trim());
        }
    }
    
    // 发送通知
    sendNotification(title, subtitle, content) {
        if (this.config.config.notification) {
            $notification.post(title, subtitle, content);
        }
    }
}

// ============================================
// 面板生成器
// ============================================

class UnifiedPanelGenerator {
    constructor(config, accountManager) {
        this.config = config;
        this.accountManager = accountManager;
    }
    
    // 生成面板
    generate() {
        const modeInfo = this.accountManager.getModeInfo();
        const accounts = this.accountManager.getAccounts();
        
        let content = '';
        let subtitle = '';
        let icon = 'music.note';
        let iconColor = '#007AFF';
        
        if (accounts.length === 0) {
            // 无账号
            content = `❌ 未配置账号\n模式: ${modeInfo.mode}\n请打开QQ音乐获取Cookie`;
            subtitle = '未登录';
            icon = 'exclamationmark.triangle';
            iconColor = '#FF9500';
            
        } else {
            // 有账号
            const today = new Date().toLocaleDateString('zh-CN');
            let signedCount = 0;
            
            content = `📱 模式: ${modeInfo.mode}\n`;
            content += `👥 账号数: ${accounts.length}\n\n`;
            
            accounts.forEach(account => {
                const checkKey = `QQMusic_Checked_${account.uin}`;
                const lastCheck = $persistentStore.read(checkKey);
                const isToday = lastCheck === today;
                
                if (isToday) signedCount++;
                
                const status = isToday ? '✅' : '⏰';
                content += `${status} ${account.name} (${account.uin})\n`;
            });
            
            subtitle = signedCount === accounts.length ? '全部已签' : 
                      signedCount > 0 ? '部分已签' : '待签到';
            
            if (signedCount === accounts.length) {
                icon = 'checkmark.circle.fill';
                iconColor = '#34C759';
            }
            
            content += `\n📊 今日签到: ${signedCount}/${accounts.length}`;
        }
        
        // 添加配置信息
        content += `\n\n⚙️ 配置状态`;
        content += `\n通知: ${this.config.config.notification ? '✅' : '❌'}`;
        content += `  VIP: ${this.config.config.vip ? '✅' : '❌'}`;
        content += `\nCookie获取: ${this.config.config.cookieSwitch ? '✅' : '❌'}`;
        content += `\n签到时间: ${this.config.config.checkinTime}`;
        
        return {
            title: 'QQ音乐统一版',
            content: content,
            subtitle: subtitle,
            icon: icon,
            'icon-color': iconColor,
            'action-url': 'http://manage.qqmusic.local/',
            'action-title': '数据管理'
        };
    }
}

// ============================================
// 数据管理工具
// ============================================

class DataManager {
    static migrateToSingle() {
        console.log('迁移到单账号模式...');
        
        const multiConfig = $persistentStore.read('QQMusic_Plugin_Config');
        if (!multiConfig) {
            return { success: false, message: '没有多账号数据' };
        }
        
        try {
            const config = JSON.parse(multiConfig);
            if (!config.accounts || config.accounts.length === 0) {
                return { success: false, message: '没有账号数据' };
            }
            
            // 取第一个启用的账号
            const account = config.accounts.find(acc => acc.enabled) || config.accounts[0];
            
            if (!account.cookie) {
                return { success: false, message: '账号没有Cookie' };
            }
            
            // 保存到单账号
            $persistentStore.write(account.cookie, 'QQMusic_Cookie');
            $persistentStore.write(new Date().toLocaleString('zh-CN'), 'QQMusic_Cookie_Time');
            
            console.log(`迁移成功: ${account.uin}`);
            return { 
                success: true, 
                message: `已迁移账号: ${account.name || account.uin}`,
                uin: account.uin
            };
            
        } catch (e) {
            return { success: false, message: `迁移失败: ${e.message}` };
        }
    }
    
    static migrateToMulti() {
        console.log('迁移到多账号模式...');
        
        const cookie = $persistentStore.read('QQMusic_Cookie');
        if (!cookie) {
            return { success: false, message: '没有单账号数据' };
        }
        
        const uin = (cookie.match(/uin=o?(\d+)/i) || [])[1] || '未知';
        const time = $persistentStore.read('QQMusic_Cookie_Time') || new Date().toISOString();
        
        const account = {
            name: '主账号',
            cookie: cookie,
            uin: uin,
            enabled: true,
            created: time,
            lastUpdate: new Date().toISOString()
        };
        
        const config = {
            accounts: [account],
            multiAccount: true,
            enableNotification: true,
            checkinTime: "09:10"
        };
        
        $persistentStore.write(JSON.stringify(config), 'QQMusic_Plugin_Config');
        
        console.log(`迁移成功: ${uin}`);
        return { 
            success: true, 
            message: `已迁移账号: ${uin}`,
            uin: uin
        };
    }
    
    static clearAllData() {
        const keys = [
            'QQMusic_Cookie',
            'QQMusic_Cookie_Time',
            'QQMusic_Plugin_Config',
            'QQMusic_Universal_Config',
            'QQMusic_Checkin_History'
        ];
        
        // 清理所有签到记录
        const allKeys = $persistentStore.allKeys || [];
        allKeys.forEach(key => {
            if (key.startsWith('QQMusic_Checked_') || key.startsWith('QQMusic_LastCheckin_')) {
                $persistentStore.write('', key);
            }
        });
        
        keys.forEach(key => $persistentStore.write('', key));
        
        console.log('所有数据已清理');
        return { success: true, message: '所有数据已清理' };
    }
    
    static getDataInfo() {
        const info = {
            single: {
                hasCookie: !!$persistentStore.read('QQMusic_Cookie'),
                cookieTime: $persistentStore.read('QQMusic_Cookie_Time')
            },
            multi: {
                hasConfig: false,
                accountCount: 0
            },
            universal: {
                hasConfig: !!$persistentStore.read('QQMusic_Universal_Config')
            }
        };
        
        const multiConfig = $persistentStore.read('QQMusic_Plugin_Config');
        if (multiConfig) {
            try {
                const config = JSON.parse(multiConfig);
                info.multi.hasConfig = true;
                info.multi.accountCount = config.accounts ? config.accounts.length : 0;
            } catch (e) {
                info.multi.parseError = e.message;
            }
        }
        
        return info;
    }
}

// ============================================
// 主路由分发
// ============================================

(function() {
    console.log('=== QQ音乐统一版 ===');
    
    // 初始化配置
    const config = new UnifiedConfig();
    const accountManager = new UnifiedAccountManager(config);
    const cookieHandler = new CookieHandler(config, accountManager);
    
    // 获取执行参数
    const hasRequest = typeof $request !== 'undefined';
    const args = config.parseArguments();
    const action = args._action || args.action || '';
    
    console.log(`请求模式: ${hasRequest ? '是' : '否'}, 动作: ${action || '无'}`);
    
    // Cookie获取请求
    if (hasRequest) {
        cookieHandler.handleRequest();
        return;
    }
    
    // 根据action执行不同功能
    switch (action) {
        case 'panel':
            // 生成面板
            const panelGen = new UnifiedPanelGenerator(config, accountManager);
            $done(panelGen.generate());
            break;
            
        case 'manage':
            // 数据管理
            handleDataManagement(config);
            break;
            
        case 'migrate':
            // 数据迁移
            handleDataMigration(config);
            break;
            
        case 'manual':
        case 'auto':
        default:
            // 执行签到
            const checkinManager = new UnifiedCheckinManager(config, accountManager);
            checkinManager.execute();
            $done();
    }
})();

// ============================================
// 辅助函数
// ============================================

// 数据管理
function handleDataManagement(config) {
    const info = DataManager.getDataInfo();
    
    let message = '📊 数据状态\n';
    message += `单账号: ${info.single.hasCookie ? '✅ 有数据' : '❌ 无数据'}\n`;
    message += `多账号: ${info.multi.hasConfig ? `✅ ${info.multi.accountCount}个账号` : '❌ 无数据'}\n`;
    message += `统一配置: ${info.universal.hasConfig ? '✅ 已保存' : '❌ 未保存'}\n\n`;
    
    message += '🛠️ 管理操作\n';
    message += '1. 迁移到单账号\n';
    message += '2. 迁移到多账号\n';
    message += '3. 清理所有数据\n\n';
    
    message += '📱 当前模式: ' + config.mode;
    
    if (config.config.notification) {
        $notification.post('数据管理', '数据状态', message);
    }
    
    console.log('数据管理完成');
    $done();
}

// 数据迁移
function handleDataMigration(config) {
    const info = DataManager.getDataInfo();
    
    let message = '🔄 数据迁移\n\n';
    
    if (info.single.hasCookie && !info.multi.hasConfig) {
        // 单账号 → 多账号
        const result = DataManager.migrateToMulti();
        message += result.success ? `✅ ${result.message}` : `❌ ${result.message}`;
        
    } else if (info.multi.hasConfig && !info.single.hasCookie) {
        // 多账号 → 单账号
        const result = DataManager.migrateToSingle();
        message += result.success ? `✅ ${result.message}` : `❌ ${result.message}`;
        
    } else if (info.single.hasCookie && info.multi.hasConfig) {
        message += '⚠️ 两种模式都有数据\n';
        message += '请先清理不需要的数据';
        
    } else {
        message += '❌ 没有可迁移的数据';
    }
    
    if (config.config.notification) {
        $notification.post('数据迁移', '完成', message);
    }
    
    console.log('数据迁移完成:', message);
    $done();
}