// QQ音乐自动签到插件 final.2.0
// 简洁稳定的单账号最终版本
// 作者: SXIE-ai

// ============================================
// 日志工具
// ============================================

const Logger = {
    log: (message) => {
        const time = new Date().toLocaleTimeString('zh-CN');
        console.log(`[${time}] QQMusic: ${message}`);
    },
    
    error: (message) => {
        const time = new Date().toLocaleTimeString('zh-CN');
        console.log(`[${time}] ❌ QQMusic: ${message}`);
    },
    
    success: (message) => {
        const time = new Date().toLocaleTimeString('zh-CN');
        console.log(`[${time}] ✅ QQMusic: ${message}`);
    }
};

// ============================================
// 配置管理
// ============================================

class Config {
    constructor() {
        this.load();
    }
    
    load() {
        // 默认配置
        this.data = {
            cookieSwitch: true,
            notification: true,
            vip: true,
            checkinTime: '09:10',
            retryTimes: 2
        };
        
        // 从插件参数加载
        this.loadFromArgs();
        
        // 保存配置
        this.save();
        
        Logger.log(`配置加载: 通知=${this.data.notification}, VIP=${this.data.vip}`);
    }
    
    loadFromArgs() {
        if (typeof $argument === 'undefined' || !$argument) return;
        
        try {
            const args = this.parseArgs($argument);
            Object.assign(this.data, args);
        } catch (e) {
            Logger.error('参数解析失败');
        }
    }
    
    parseArgs(arg) {
        const config = {};
        
        if (typeof arg === 'string') {
            arg.split('&').forEach(pair => {
                const [key, value] = pair.split('=');
                if (key && value !== undefined) {
                    config[key] = this.parseValue(value);
                }
            });
        }
        
        return config;
    }
    
    parseValue(value) {
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (!isNaN(value) && value !== '') return Number(value);
        return value;
    }
    
    save() {
        try {
            $persistentStore.write(JSON.stringify(this.data), 'QQMusic_Config');
        } catch (e) {
            // 忽略保存错误
        }
    }
    
    get(key, defaultValue = null) {
        return this.data[key] !== undefined ? this.data[key] : defaultValue;
    }
}

// ============================================
// Cookie管理
// ============================================

class CookieManager {
    constructor(config) {
        this.config = config;
    }
    
    // 获取当前Cookie
    get() {
        return $persistentStore.read('QQMusic_Cookie');
    }
    
    // 保存Cookie
    save(cookie) {
        if (!this.isValid(cookie)) {
            Logger.error('Cookie无效，不保存');
            return false;
        }
        
        const oldCookie = this.get();
        if (oldCookie === cookie) {
            Logger.log('Cookie未变化');
            return false;
        }
        
        // 保存Cookie
        $persistentStore.write(cookie, 'QQMusic_Cookie');
        
        // 保存时间
        const time = new Date().toLocaleString('zh-CN');
        $persistentStore.write(time, 'QQMusic_Cookie_Time');
        
        // 发送通知
        if (this.config.get('notification', true)) {
            const uin = this.extractUin(cookie);
            $notification.post('QQ音乐', 'Cookie已保存', `账号: ${uin}\n时间: ${time}`);
        }
        
        Logger.success(`Cookie保存成功: ${this.extractUin(cookie)}`);
        return true;
    }
    
    // 自动获取Cookie处理
    handleAutoCapture() {
        if (!this.config.get('cookieSwitch', true)) {
            Logger.log('Cookie获取开关已关闭');
            $done({});
            return;
        }
        
        const url = $request.url;
        const cookie = $request.headers['Cookie'] || $request.headers['cookie'];
        
        // 只处理QQ音乐请求
        if (!url.includes('qq.com') || !cookie) {
            $done({});
            return;
        }
        
        this.save(cookie);
        $done({});
    }
    
    // 验证Cookie格式
    isValid(cookie) {
        if (!cookie) return false;
        return cookie.includes('uin=') && cookie.includes('p_skey=');
    }
    
    // 提取uin
    extractUin(cookie) {
        if (!cookie) return '未知';
        const match = cookie.match(/uin=o?(\d+)/i);
        return match ? match[1] : '未知';
    }
    
    // 获取Cookie信息
    getInfo() {
        const cookie = this.get();
        if (!cookie) return null;
        
        return {
            uin: this.extractUin(cookie),
            time: $persistentStore.read('QQMusic_Cookie_Time') || '未知',
            length: cookie.length
        };
    }
    
    // 检查Cookie是否存在
    exists() {
        return !!this.get();
    }
    
    // 清理Cookie
    clear() {
        $persistentStore.write('', 'QQMusic_Cookie');
        $persistentStore.write('', 'QQMusic_Cookie_Time');
        Logger.log('Cookie已清理');
        return true;
    }
}

// ============================================
// 签到核心
// ============================================

class CheckinCore {
    constructor(config, cookieManager) {
        this.config = config;
        this.cookieManager = cookieManager;
    }
    
    // 执行签到
    async execute() {
        Logger.log('开始执行签到');
        
        // 检查Cookie
        if (!this.cookieManager.exists()) {
            this.sendNotification('QQ音乐签到', '失败', '请先获取Cookie');
            return;
        }
        
        const cookie = this.cookieManager.get();
        const uin = this.cookieManager.extractUin(cookie);
        
        // 检查今天是否已签到
        if (this.hasCheckedToday(uin)) {
            this.sendNotification('QQ音乐签到', '提示', '今日已签到');
            return;
        }
        
        try {
            // 执行签到
            const result = await this.doCheckin(cookie);
            
            if (result.code === 0) {
                await this.handleSuccess(result, cookie, uin);
            } else if (result.code === 1001) {
                await this.handleAlreadyChecked(uin);
            } else {
                this.handleFailure(result);
            }
            
        } catch (error) {
            Logger.error(`签到失败: ${error.message}`);
            this.sendNotification('QQ音乐签到', '错误', error.message);
        }
    }
    
    // 执行签到请求（带重试）
    async doCheckin(cookie) {
        const uin = this.cookieManager.extractUin(cookie);
        const retryTimes = this.config.get('retryTimes', 2);
        
        for (let attempt = 1; attempt <= retryTimes + 1; attempt++) {
            try {
                Logger.log(`签到尝试 ${attempt}/${retryTimes + 1}`);
                
                const result = await this.requestCheckin(cookie);
                return result;
                
            } catch (error) {
                Logger.error(`尝试 ${attempt} 失败: ${error.message}`);
                
                if (attempt <= retryTimes) {
                    // 等待后重试
                    await this.delay(attempt * 1000);
                } else {
                    throw error;
                }
            }
        }
    }
    
    // 单次签到请求
    async requestCheckin(cookie) {
        const uin = this.cookieManager.extractUin(cookie);
        
        const requestData = {
            "comm": {
                "ct": "6",
                "cv": "1000",
                "uin": uin
            },
            "req": {
                "module": "music.task.TaskCenterServer",
                "method": "CheckIn",
                "param": {}
            }
        };
        
        const options = {
            url: 'https://u.y.qq.com/cgi-bin/musicu.fcg',
            headers: {
                'Cookie': cookie,
                'User-Agent': 'QQMusic/12.0.5',
                'Content-Type': 'application/json',
                'Referer': 'https://y.qq.com/'
            },
            body: JSON.stringify(requestData),
            timeout: 10000
        };
        
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
    
    // 执行VIP签到
    async doVipCheckin(cookie) {
        if (!this.config.get('vip', true)) {
            Logger.log('VIP签到已关闭');
            return null;
        }
        
        const uin = this.cookieManager.extractUin(cookie);
        
        const requestData = {
            "comm": {
                "ct": "6",
                "cv": "1000",
                "uin": uin
            },
            "req": {
                "module": "music.vip.VipCenterServer",
                "method": "CheckIn",
                "param": {}
            }
        };
        
        const options = {
            url: 'https://u.y.qq.com/cgi-bin/musicu.fcg',
            headers: {
                'Cookie': cookie,
                'User-Agent': 'QQMusic/12.0.5',
                'Content-Type': 'application/json',
                'Referer': 'https://y.qq.com/'
            },
            body: JSON.stringify(requestData)
        };
        
        try {
            const result = await new Promise((resolve, reject) => {
                $httpClient.post(options, (error, response, data) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    
                    try {
                        const json = JSON.parse(data);
                        resolve(json);
                    } catch (e) {
                        reject(new Error('VIP响应解析失败'));
                    }
                });
            });
            
            if (result.code === 0) {
                Logger.success('VIP签到成功');
                return result;
            }
            
        } catch (error) {
            Logger.error(`VIP签到失败: ${error.message}`);
        }
        
        return null;
    }
    
    // 处理签到成功
    async handleSuccess(result, cookie, uin) {
        // 解析奖励
        const reward = result.req?.data?.reward || {};
        let message = '签到成功';
        const rewards = [];
        
        if (reward.exp) rewards.push(`经验+${reward.exp}`);
        if (reward.point) rewards.push(`积分+${reward.point}`);
        if (reward.vip_point) rewards.push(`成长值+${reward.vip_point}`);
        
        if (rewards.length > 0) {
            message += '：' + rewards.join(' ');
        }
        
        // 保存签到记录
        this.saveCheckinRecord(uin);
        
        // 发送通知
        this.sendNotification('QQ音乐签到', '成功', message);
        Logger.success(`签到成功: ${message}`);
        
        // VIP签到
        await this.delay(1000);
        const vipResult = await this.doVipCheckin(cookie);
        
        if (vipResult && vipResult.code === 0) {
            const vipReward = vipResult.req?.data?.reward || {};
            if (vipReward.vip_point) {
                this.sendNotification('QQ音乐VIP', '成功', `成长值+${vipReward.vip_point}`);
            }
        }
    }
    
    // 处理已签到
    async handleAlreadyChecked(uin) {
        this.saveCheckinRecord(uin);
        this.sendNotification('QQ音乐签到', '提示', '今日已签到');
        Logger.log('今日已签到');
    }
    
    // 处理失败
    handleFailure(result) {
        const errorMsg = result.msg || `错误码: ${result.code}`;
        this.sendNotification('QQ音乐签到', '失败', errorMsg);
        Logger.error(`签到失败: ${errorMsg}`);
    }
    
    // 保存签到记录
    saveCheckinRecord(uin) {
        const today = new Date().toLocaleDateString('zh-CN');
        const time = new Date().toLocaleTimeString('zh-CN');
        
        $persistentStore.write(today, `QQMusic_LastCheckin_${uin}`);
        $persistentStore.write(time, `QQMusic_LastCheckin_Time_${uin}`);
    }
    
    // 检查今天是否已签到
    hasCheckedToday(uin) {
        const lastDate = $persistentStore.read(`QQMusic_LastCheckin_${uin}`);
        const today = new Date().toLocaleDateString('zh-CN');
        return lastDate === today;
    }
    
    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // 发送通知
    sendNotification(title, subtitle, content) {
        if (this.config.get('notification', true)) {
            $notification.post(title, subtitle, content);
        }
    }
}

// ============================================
// 面板生成
// ============================================

class PanelGenerator {
    constructor(config, cookieManager) {
        this.config = config;
        this.cookieManager = cookieManager;
    }
    
    generate() {
        const cookieInfo = this.cookieManager.getInfo();
        const today = new Date().toLocaleDateString('zh-CN');
        
        let content = '';
        let subtitle = '';
        let icon = 'music.note';
        let iconColor = '#007AFF';
        let actionUrl = 'http://manual.qqmusic.local/';
        let actionTitle = '立即签到';
        
        if (!cookieInfo) {
            // 无Cookie
            const cookieEnabled = this.config.get('cookieSwitch', true);
            const status = cookieEnabled ? '请打开QQ音乐获取' : 'Cookie获取已关闭';
            
            content = `❌ 未配置账号\n${status}`;
            subtitle = '未登录';
            icon = 'exclamationmark.triangle';
            iconColor = '#FF9500';
            
        } else {
            // 有Cookie
            const uin = cookieInfo.uin;
            const lastCheckin = $persistentStore.read(`QQMusic_LastCheckin_${uin}`);
            const checkinTime = $persistentStore.read(`QQMusic_LastCheckin_Time_${uin}`);
            
            if (lastCheckin === today) {
                // 今日已签
                content = `✅ 今日已签到\n时间: ${checkinTime || '今日'}\n账号: ${uin}`;
                subtitle = '已签到';
                icon = 'checkmark.circle.fill';
                iconColor = '#34C759';
                actionTitle = '查看详情';
                
            } else {
                // 待签到
                const checkinTime = this.config.get('checkinTime', '09:10');
                content = `⏰ 待签到\n时间: ${checkinTime}\n账号: ${uin}\nCookie: ${cookieInfo.time}`;
                subtitle = '待签到';
            }
        }
        
        // 添加配置状态
        content += `\n\n⚙️ 配置状态`;
        content += `\n通知: ${this.config.get('notification', true) ? '✅' : '❌'}`;
        content += `  VIP: ${this.config.get('vip', true) ? '✅' : '❌'}`;
        content += `\nCookie获取: ${this.config.get('cookieSwitch', true) ? '✅' : '❌'}`;
        content += `\n签到时间: ${this.config.get('checkinTime', '09:10')}`;
        
        return {
            title: 'QQ音乐签到',
            content: content,
            subtitle: subtitle,
            icon: icon,
            'icon-color': iconColor,
            'action-url': actionUrl,
            'action-title': actionTitle
        };
    }
}

// ============================================
// 手动操作处理器
// ============================================

class ManualHandler {
    constructor(config, cookieManager, checkinCore) {
        this.config = config;
        this.cookieManager = cookieManager;
        this.checkinCore = checkinCore;
    }
    
    handle() {
        const cookieInfo = this.cookieManager.getInfo();
        
        if (!cookieInfo) {
            const message = '❌ 未配置Cookie\n请先打开QQ音乐获取';
            this.sendNotification('QQ音乐手动操作', '失败', message);
            return;
        }
        
        const lastCheckin = $persistentStore.read(`QQMusic_LastCheckin_${cookieInfo.uin}`);
        const today = new Date().toLocaleDateString('zh-CN');
        
        if (lastCheckin === today) {
            const checkinTime = $persistentStore.read(`QQMusic_LastCheckin_Time_${cookieInfo.uin}`);
            const message = `✅ 今日已签到\n时间: ${checkinTime}\n账号: ${cookieInfo.uin}`;
            this.sendNotification('QQ音乐', '签到状态', message);
        } else {
            this.sendNotification('QQ音乐', '开始签到', `账号: ${cookieInfo.uin}\n正在执行签到...`);
            setTimeout(() => {
                this.checkinCore.execute();
            }, 1000);
        }
    }
    
    sendNotification(title, subtitle, content) {
        if (this.config.get('notification', true)) {
            $notification.post(title, subtitle, content);
        }
    }
}

// ============================================
// 主入口
// ============================================

(function main() {
    Logger.log('插件启动');
    
    // 初始化
    const config = new Config();
    const cookieManager = new CookieManager(config);
    
    // Cookie获取请求
    if (typeof $request !== 'undefined') {
        cookieManager.handleAutoCapture();
        return;
    }
    
    // 获取执行参数
    const argument = typeof $argument !== 'undefined' ? $argument : '';
    
    if (argument === 'panel') {
        // 生成面板
        const panelGen = new PanelGenerator(config, cookieManager);
        $done(panelGen.generate());
        
    } else if (argument === 'manual') {
        // 手动操作
        const checkinCore = new CheckinCore(config, cookieManager);
        const manualHandler = new ManualHandler(config, cookieManager, checkinCore);
        manualHandler.handle();
        $done();
        
    } else {
        // 自动签到（定时任务）
        const checkinCore = new CheckinCore(config, cookieManager);
        checkinCore.execute();
        $done();
    }
})();