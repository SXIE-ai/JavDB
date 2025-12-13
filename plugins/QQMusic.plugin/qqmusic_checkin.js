/*
QQ音乐签到脚本
支持多账号，每个账号独立控制开关
使用方法：在插件参数中填写Cookie并开启对应开关
*/

const $ = new API("qqmusic-checkin");

// 从插件参数获取配置
const notifyTitle = $.read("notify_title") || "QQ音乐签到通知";
const testMode = $.read("test_mode") === "true";

// 账号配置
const accounts = [
    { cookie: $.read("qqmusic_cookie1"), enable: $.read("qqmusic_enable1") === "true", name: "账号1" },
    { cookie: $.read("qqmusic_cookie2"), enable: $.read("qqmusic_enable2") === "true", name: "账号2" },
    { cookie: $.read("qqmusic_cookie3"), enable: $.read("qqmusic_enable3") === "true", name: "账号3" },
    { cookie: $.read("qqmusic_cookie4"), enable: $.read("qqmusic_enable4") === "true", name: "账号4" }
];

// 主函数
(async () => {
    let allResults = [];
    let successCount = 0;
    
    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        
        if (!account.enable || !account.cookie || account.cookie.trim() === "") {
            $.log(`${account.name}: 未启用或Cookie为空，跳过`);
            continue;
        }
        
        const result = await checkin(account.cookie, account.name, i + 1);
        allResults.push(result);
        
        if (result.success) {
            successCount++;
        }
        
        // 避免请求过快
        if (i < accounts.length - 1) {
            await $.wait(1000);
        }
    }
    
    // 发送汇总通知
    if (allResults.length > 0) {
        sendSummaryNotification(allResults, successCount);
    } else {
        $.log("没有启用的账号");
    }
})();

// 签到函数
async function checkin(cookie, accountName, accountIndex) {
    const timestamp = Date.now();
    const url = `https://c.y.qq.com/vip/task/sign?g_tk=${calculateGTK(cookie)}&_=${timestamp}`;
    
    $.log(`开始执行 ${accountName} 签到...`);
    
    try {
        if (testMode) {
            $.log(`[测试模式] ${accountName}: 模拟请求，不实际签到`);
            return {
                account: accountName,
                success: true,
                message: "测试模式 - 模拟成功",
                days: "测试",
                points: "测试"
            };
        }
        
        const headers = {
            "Cookie": cookie,
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1",
            "Referer": "https://y.qq.com/",
            "Accept": "application/json",
            "Accept-Language": "zh-CN,zh;q=0.9"
        };
        
        const response = await $.http.get({
            url: url,
            headers: headers
        });
        
        if (response.statusCode === 200) {
            const data = JSON.parse(response.body);
            
            if (data.code === 0) {
                const days = data.data?.signDays || "未知";
                const points = data.data?.awardPoints || 0;
                
                $.log(`${accountName}: 签到成功！已连续签到 ${days} 天，获得 ${points} 积分`);
                
                return {
                    account: accountName,
                    success: true,
                    message: "签到成功",
                    days: days,
                    points: points
                };
            } else {
                $.log(`${accountName}: 签到失败，错误码: ${data.code}, 信息: ${data.message}`);
                
                // 判断是否已签到
                if (data.message && data.message.includes("已签到")) {
                    const days = data.data?.signDays || "未知";
                    return {
                        account: accountName,
                        success: true,
                        message: "今日已签到",
                        days: days,
                        points: 0
                    };
                }
                
                return {
                    account: accountName,
                    success: false,
                    message: `失败: ${data.message || "未知错误"}`
                };
            }
        } else {
            $.log(`${accountName}: 请求失败，状态码: ${response.statusCode}`);
            return {
                account: accountName,
                success: false,
                message: `HTTP错误: ${response.statusCode}`
            };
        }
    } catch (error) {
        $.log(`${accountName}: 发生异常: ${error}`);
        return {
            account: accountName,
            success: false,
            message: `异常: ${error.message}`
        };
    }
}

// 计算g_tk（从Cookie中提取）
function calculateGTK(cookie) {
    // 从cookie中获取p_skey或skey
    const pskeyMatch = cookie.match(/p_skey=([^;]+)/);
    const skeyMatch = cookie.match(/skey=([^;]+)/);
    
    const key = pskeyMatch ? pskeyMatch[1] : (skeyMatch ? skeyMatch[1] : "");
    
    if (!key) return "123456";
    
    // QQ的GTK算法
    let hash = 5381;
    for (let i = 0; i < key.length; i++) {
        hash += (hash << 5) + key.charCodeAt(i);
    }
    return hash & 0x7fffffff;
}

// 发送汇总通知
function sendSummaryNotification(results, successCount) {
    let message = `🎵 QQ音乐签到完成\n\n`;
    message += `✅ 成功: ${successCount}/${results.length}\n\n`;
    
    results.forEach(result => {
        const status = result.success ? "✅" : "❌";
        let detail = `${status} ${result.account}: `;
        
        if (result.success) {
            if (result.message === "今日已签到") {
                detail += `今日已签到 (连续${result.days}天)`;
            } else {
                detail += `成功 (连续${result.days}天, +${result.points}积分)`;
            }
        } else {
            detail += result.message;
        }
        
        message += detail + "\n";
    });
    
    message += `\n📅 ${new Date().toLocaleDateString("zh-CN")}`;
    
    $.notice(notifyTitle, "", message);
}

// API类（Loon脚本环境）
function API(name) {
    this.name = name;
    
    this.read = function(key) {
        return $loon.getConfig()[key];
    };
    
    this.write = function(key, value) {
        $loon.setConfig(key, value);
    };
    
    this.http = {
        get: async function(options) {
            return await $http.get(options);
        },
        post: async function(options) {
            return await $http.post(options);
        }
    };
    
    this.wait = function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    };
    
    this.log = function(message) {
        console.log(`[${this.name}] ${message}`);
    };
    
    this.notice = function(title, subtitle, content) {
        $notification.post(title, subtitle, content);
    };
    
    return this;
}
