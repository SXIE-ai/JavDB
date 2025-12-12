/*
 * QQ音乐签到主脚本
 * 功能：每日自动签到、领取VIP成长值、统计奖励
 */

// 导入工具函数
const utils = require('./qqmusic_utils.js');

// 插件配置
const CONFIG = {
    name: 'QQ音乐签到',
    version: '2.0.0',
    urls: {
        base: 'https://u.y.qq.com/cgi-bin/musicu.fcg',
        profile: 'https://c.y.qq.com/rsc/fcgi-bin/fcg_get_profile_homepage.fcg'
    },
    headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 QQMusic/12.0.5',
        'Referer': 'https://y.qq.com/',
        'Origin': 'https://y.qq.com',
        'Accept': 'application/json, text/plain, */*'
    }
};

class QQMusicCheckin {
    constructor() {
        this.utils = utils;
        this.storage = $persistentStore;
        this.notify = $notification;
        this.http = $httpClient;
        this.accounts = this.loadAccounts();
        this.results = [];
    }

    // 加载账号配置
    loadAccounts() {
        try {
            const configStr = this.storage.read('QQMusic_Plugin_Config');
            if (!configStr) return this.loadLegacyAccounts();
            
            const config = JSON.parse(configStr);
            if (config.multiAccount && config.accounts) {
                return config.accounts;
            }
            return this.loadLegacyAccounts();
        } catch (e) {
            console.log(`加载账号配置失败: ${e}`);
            return this.loadLegacyAccounts();
        }
    }

    loadLegacyAccounts() {
        const cookie = this.storage.read('QQMusic_Cookie');
        if (!cookie) return [];
        
        return [{
            name: '主账号',
            cookie: cookie,
            enabled: true,
            lastCheckin: this.storage.read('QQMusic_LastCheckin')
        }];
    }

    // 主执行函数
    async run() {
        console.log(`[${CONFIG.name}] 开始执行签到任务 v${CONFIG.version}`);
        
        if (this.accounts.length === 0) {
            this.notify.post(CONFIG.name, '错误', '未找到可用账号，请先获取Cookie');
            return;
        }

        let successCount = 0;
        let failCount = 0;

        // 遍历所有账号
        for (let i = 0; i < this.accounts.length; i++) {
            const account = this.accounts[i];
            
            if (!account.enabled) {
                console.log(`[${account.name}] 账号已禁用，跳过`);
                continue;
            }

            console.log(`[${account.name}] 开始处理账号 ${i + 1}/${this.accounts.length}`);
            
            try {
                const result = await this.processAccount(account);
                this.results.push(result);
                
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                }
                
                // 账号间延迟
                if (i < this.accounts.length - 1) {
                    await this.utils.delay(2000);
                }
            } catch (error) {
                console.log(`[${account.name}] 处理失败: ${error}`);
                failCount++;
            }
        }

        // 发送汇总通知
        await this.sendSummaryNotification(successCount, failCount);
        
        // 更新面板
        await this.updatePanel();
        
        console.log(`[${CONFIG.name}] 任务完成，成功: ${successCount}, 失败: ${failCount}`);
    }

    // 处理单个账号
    async processAccount(account) {
        const result = {
            account: account.name,
            success: false,
            checkin: null,
            vipCheckin: null,
            tasks: [],
            error: null
        };

        try {
            // 1. 验证Cookie
            const isValid = await this.validateCookie(account.cookie);
            if (!isValid) {
                result.error = 'Cookie无效';
                return result;
            }

            // 2. 执行普通签到
            result.checkin = await this.doDailyCheckin(account.cookie);
            
            // 3. 执行VIP签到
            await this.utils.delay(1000);
            result.vipCheckin = await this.doVipCheckin(account.cookie);
            
            // 4. 执行任务
            await this.utils.delay(1000);
            result.tasks = await this.completeTasks(account.cookie);
            
            // 5. 更新账号状态
            await this.updateAccountStatus(account, result);
            
            result.success = true;
            
        } catch (error) {
            result.error = error.message;
            console.log(`[${account.name}] 处理异常: ${error}`);
        }

        return result;
    }

    // 每日签到
    async doDailyCheckin(cookie) {
        const uin = this.utils.extractUin(cookie);
        const gtk = this.utils.calculateGTK(cookie);
        
        const requestData = {
            "comm": {
                "ct": "6",
                "cv": "1000",
                "uin": uin,
                "g_tk": gtk
            },
            "req": {
                "module": "music.task.TaskCenterServer",
                "method": "CheckIn",
                "param": {}
            }
        };

        const options = {
            url: CONFIG.urls.base,
            headers: {
                ...CONFIG.headers,
                'Cookie': cookie
            },
            body: JSON.stringify(requestData)
        };

        return new Promise((resolve, reject) => {
            this.http.post(options, (error, response, data) => {
                if (error) {
                    reject(error);
                    return;
                }

                try {
                    const result = JSON.parse(data);
                    resolve({
                        success: result.code === 0,
                        data: result.req?.data || {},
                        raw: result,
                        message: this.parseCheckinMessage(result)
                    });
                } catch (e) {
                    reject(new Error('响应解析失败'));
                }
            });
        });
    }

    // VIP签到
    async doVipCheckin(cookie) {
        const uin = this.utils.extractUin(cookie);
        
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
            url: CONFIG.urls.base,
            headers: {
                ...CONFIG.headers,
                'Cookie': cookie
            },
            body: JSON.stringify(requestData)
        };

        return new Promise((resolve, reject) => {
            this.http.post(options, (error, response, data) => {
                if (error) {
                    reject(error);
                    return;
                }

                try {
                    const result = JSON.parse(data);
                    resolve({
                        success: result.code === 0,
                        data: result.req?.data || {},
                        raw: result
                    });
                } catch (e) {
                    reject(new Error('VIP签到解析失败'));
                }
            });
        });
    }

    // 完成任务
    async completeTasks(cookie) {
        const taskList = await this.getTaskList(cookie);
        const completed = [];
        
        for (const task of taskList) {
            if (task.status === 1) { // 可完成状态
                try {
                    await this.completeSingleTask(cookie, task.task_id);
                    completed.push({
                        id: task.task_id,
                        name: task.task_name,
                        reward: task.reward_desc
                    });
                    
                    await this.utils.delay(500); // 任务间延迟
                } catch (error) {
                    console.log(`任务 ${task.task_name} 完成失败: ${error}`);
                }
            }
        }
        
        return completed;
    }

    // 获取任务列表
    async getTaskList(cookie) {
        const uin = this.utils.extractUin(cookie);
        
        const requestData = {
            "comm": {
                "ct": "6",
                "cv": "1000",
                "uin": uin
            },
            "req": {
                "module": "music.task.TaskCenterServer",
                "method": "QueryTaskList",
                "param": {}
            }
        };

        const options = {
            url: CONFIG.urls.base,
            headers: {
                ...CONFIG.headers,
                'Cookie': cookie
            },
            body: JSON.stringify(requestData)
        };

        return new Promise((resolve, reject) => {
            this.http.post(options, (error, response, data) => {
                if (error) {
                    reject(error);
                    return;
                }

                try {
                    const result = JSON.parse(data);
                    if (result.code === 0 && result.req?.data?.task_list) {
                        resolve(result.req.data.task_list);
                    } else {
                        resolve([]);
                    }
                } catch (e) {
                    resolve([]);
                }
            });
        });
    }

    // 完成单个任务
    async completeSingleTask(cookie, taskId) {
        const uin = this.utils.extractUin(cookie);
        
        const requestData = {
            "comm": {
                "ct": "6",
                "cv": "1000",
                "uin": uin
            },
            "req": {
                "module": "music.task.TaskCenterServer",
                "method": "CompleteTask",
                "param": {
                    "task_id": taskId
                }
            }
        };

        const options = {
            url: CONFIG.urls.base,
            headers: {
                ...CONFIG.headers,
                'Cookie': cookie
            },
            body: JSON.stringify(requestData)
        };

        return new Promise((resolve, reject) => {
            this.http.post(options, (error, response, data) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }

    // 验证Cookie有效性
    async validateCookie(cookie) {
        const params = {
            ctype: 8,
            userid: 0,
            reqtype: 1,
            outCharset: 'utf-8',
            format: 'json',
            g_tk: this.utils.calculateGTK(cookie)
        };

        const url = `${CONFIG.urls.profile}?${this.utils.buildQueryString(params)}`;
        
        const options = {
            url: url,
            headers: {
                'Cookie': cookie,
                'User-Agent': CONFIG.headers['User-Agent']
            }
        };

        return new Promise((resolve) => {
            this.http.get(options, (error, response, data) => {
                if (error || !data) {
                    resolve(false);
                    return;
                }

                try {
                    const result = JSON.parse(data);
                    resolve(result.code === 0);
                } catch (e) {
                    resolve(false);
                }
            });
        });
    }

    // 解析签到消息
    parseCheckinMessage(result) {
        if (result.code === 1001) {
            return '今日已签到';
        }
        
        if (result.code !== 0) {
            return `签到失败 (代码: ${result.code})`;
        }
        
        const reward = result.req?.data?.reward || {};
        const parts = [];
        
        if (reward.exp) parts.push(`经验+${reward.exp}`);
        if (reward.point) parts.push(`积分+${reward.point}`);
        if (reward.vip_point) parts.push(`成长值+${reward.vip_point}`);
        if (reward.extra_reward) parts.push(`额外奖励: ${reward.extra_reward}`);
        
        return parts.length > 0 ? parts.join(' ') : '签到成功（无奖励）';
    }

    // 更新账号状态
    async updateAccountStatus(account, result) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        // 更新最后签到时间
        account.lastCheckin = now.toISOString();
        
        // 记录签到历史
        const history = JSON.parse(this.storage.read('QQMusic_Checkin_History') || '[]');
        history.push({
            date: today,
            account: account.name,
            success: result.success,
            checkin: result.checkin,
            vipCheckin: result.vipCheckin,
            tasks: result.tasks.length
        });
        
        // 保留最近30天记录
        if (history.length > 30) {
            history.splice(0, history.length - 30);
        }
        
        this.storage.write(JSON.stringify(history), 'QQMusic_Checkin_History');
    }

    // 发送汇总通知
    async sendSummaryNotification(success, fail) {
        if (!CONFIG.enableNotification) return;
        
        let title = `${CONFIG.name} 签到完成`;
        let subtitle = `成功: ${success}个, 失败: ${fail}个`;
        let message = '';
        
        for (const result of this.results) {
            if (result.success) {
                const rewards = [];
                if (result.checkin?.message) rewards.push(result.checkin.message);
                if (result.tasks.length > 0) rewards.push(`完成任务: ${result.tasks.length}个`);
                
                message += `✅ ${result.account}: ${rewards.join(' | ')}\n`;
            } else {
                message += `❌ ${result.account}: ${result.error || '未知错误'}\n`;
            }
        }
        
        if (message) {
            this.notify.post(title, subtitle, message.trim());
        }
    }

    // 更新面板
    async updatePanel() {
        // 面板更新由独立脚本处理
        // 这里只是触发更新
        try {
            $httpClient.get({
                url: 'http://panel.update.qqmusic.local/'
            });
        } catch (e) {
            // 忽略错误
        }
    }
}

// 插件入口
if (typeof $argument !== 'undefined') {
    // 通过参数调用
    const plugin = new QQMusicCheckin();
    
    switch ($argument) {
        case 'checkin':
            plugin.run();
            break;
        case 'test':
            // 测试模式
            console.log('测试模式启动');
            break;
        case 'clean':
            // 清理数据
            $persistentStore.write('', 'QQMusic_Checkin_History');
            $notification.post('QQ音乐', '数据已清理', '');
            break;
        default:
            plugin.run();
    }
} else {
    // 定时任务入口
    const plugin = new QQMusicCheckin();
    plugin.run();
}
