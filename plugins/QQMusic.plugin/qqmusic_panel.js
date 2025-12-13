/*
 * QQ音乐状态面板
 * 显示签到状态、账号信息、统计信息
 */

class QQMusicPanel {
    constructor() {
        this.config = this.loadConfig();
        this.history = this.loadHistory();
        this.accounts = this.config?.accounts || [];
    }

    loadConfig() {
        try {
            const configStr = $persistentStore.read('QQMusic_Plugin_Config');
            return configStr ? JSON.parse(configStr) : null;
        } catch (e) {
            return null;
        }
    }

    loadHistory() {
        try {
            const historyStr = $persistentStore.read('QQMusic_Checkin_History');
            return historyStr ? JSON.parse(historyStr) : [];
        } catch (e) {
            return [];
        }
    }

    // 生成面板内容
    generatePanel() {
        if (this.accounts.length === 0) {
            return {
                title: 'QQ音乐签到',
                content: '⚠️ 未配置账号\n请先打开QQ音乐获取Cookie',
                icon: 'exclamationmark.triangle',
                'icon-color': '#FF9500'
            };
        }

        const today = new Date().toISOString().split('T')[0];
        const content = [];
        let signedToday = false;

        // 账号状态
        for (const account of this.accounts) {
            const lastCheckin = account.lastCheckin ? 
                new Date(account.lastCheckin).toISOString().split('T')[0] : null;
            
            const isToday = lastCheckin === today;
            const status = isToday ? '✅' : '⏰';
            const uin = account.uin || '未知';
            
            content.push(`${status} ${account.name} (${uin})`);
            
            if (isToday) {
                signedToday = true;
                if (account.lastCheckin) {
                    const time = new Date(account.lastCheckin).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    content.push(`   上次签到: ${time}`);
                }
            } else {
                content.push(`   下次签到: 09:10`);
            }
            
            content.push(''); // 空行
        }

        // 统计信息
        const recentHistory = this.history.filter(record => {
            const recordDate = new Date(record.date);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return recordDate >= thirtyDaysAgo;
        });

        const successCount = recentHistory.filter(h => h.success).length;
        const totalTasks = recentHistory.reduce((sum, h) => sum + (h.tasks || 0), 0);

        content.push('📊 最近30天统计');
        content.push(`   签到成功: ${successCount}天`);
        content.push(`   完成任务: ${totalTasks}个`);

        return {
            title: 'QQ音乐签到',
            content: content.join('\n'),
            subtitle: this.getSubtitle(signedToday),
            icon: signedToday ? 'checkmark.circle.fill' : 'clock',
            'icon-color': signedToday ? '#34C759' : '#007AFF'
        };
    }

    getSubtitle(signedToday) {
        if (this.accounts.length === 0) return '未配置';
        
        const enabledAccounts = this.accounts.filter(a => a.enabled).length;
        if (enabledAccounts === 0) return '已禁用';
        
        return signedToday ? '今日已签' : '待签到';
    }

    // 生成面板点击动作
    getActions() {
        return {
            'action': 'refresh',
            'action-title': '立即签到',
            'action-url': 'http://trigger.qqmusic.local/'
        };
    }
}

// 面板主函数
function main() {
    const panel = new QQMusicPanel();
    const panelData = panel.generatePanel();
    
    // 添加动作
    const actions = panel.getActions();
    
    $done({
        ...panelData,
        ...actions
    });
}

// 执行
main();
