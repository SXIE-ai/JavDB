// 汽油价格查询脚本
// 适配 Loon GitHub 仓库订阅方式

const defaultConfig = {
    location: '江苏',
    type: '92',
    isShowAll: true
};

// 主函数
async function getGasolinePrice() {
    try {
        // 获取当前日期
        const now = new Date();
        let year = String(now.getFullYear());
        let month = String(now.getMonth() + 1).padStart(2, '0');
        let day = String(now.getDate()).padStart(2, '0');
        
        // 油价数据源（使用开源 API）
        const url = `https://raw.githubusercontent.com/zqzess/openApiData/main/gasolinePrice/${year}/${month}/${year}${month}${day}.json`;
        
        console.log(`🌐 请求油价数据: ${url}`);
        
        // 发送请求
        const response = await $httpClient.get({ 
            url: url, 
            timeout: 15 
        });
        
        if (!response.data) {
            throw new Error('无响应数据');
        }
        
        const data = response.data;
        
        // 获取用户配置（从持久化存储）
        let userConfig = await getConfig();
        const location = userConfig.location || defaultConfig.location;
        const type = userConfig.type || defaultConfig.type;
        const showAll = userConfig.isShowAll !== false;
        
        console.log(`📍 查询地区: ${location}, 油号: ${type}`);
        
        // 查找匹配的地区数据
        let result = null;
        for (const area of data.group) {
            if (area.location.includes(location) || location.includes(area.location)) {
                result = area;
                break;
            }
        }
        
        if (!result) {
            $done({
                title: '今日油价查询',
                content: `❌ 未找到 ${location} 的油价数据\n请尝试其他地区`,
                icon: 'exclamationmark.triangle.fill',
                'icon-color': '#FF9500'
            });
            return;
        }
        
        // 构建显示内容
        let content = '';
        
        if (showAll) {
            // 显示所有油号价格
            for (let i = 0; i < 4; i++) {
                const oilType = data.title[i].replace('汽油', '').replace('柴油', '').trim();
                const price = result.data[i];
                content += `⛽️ ${oilType}: ${price}\n`;
            }
        } else {
            // 只显示用户选择的油号
            const oilTypes = ['92号汽油', '95号汽油', '98号汽油', '0号柴油'];
            const selectedIndex = oilTypes.findIndex(t => t.includes(type));
            if (selectedIndex >= 0) {
                content = `⛽️ ${data.title[selectedIndex]}: ${result.data[selectedIndex]}`;
            } else {
                content = `❌ 未找到 ${type} 号油价`;
            }
        }
        
        // 添加更新时间
        const updateTime = data.update_time || '今日';
        content += `\n📅 更新: ${updateTime}`;
        
        // 如果有附加信息
        if (data.message) {
            content += `\n💡 ${data.message}`;
        }
        
        // 添加设置提示
        content += `\n\n⚙️ 设置: 长按面板可修改地区`;
        
        $done({
            title: `⛽️ ${location}今日油价`,
            content: content,
            icon: 'fuelpump.fill',
            'icon-color': '#FFCD00'
        });
        
    } catch (error) {
        console.log('❌ 油价查询失败:', error);
        
        $done({
            title: '今日油价查询',
            content: `❌ 获取油价失败\n\n可能原因：\n1. 网络连接问题\n2. 数据源更新延迟\n3. 当前地区暂无数据\n\n请稍后重试或更换地区`,
            icon: 'exclamationmark.triangle.fill',
            'icon-color': '#FF3B30'
        });
    }
}

// 获取配置函数
async function getConfig() {
    try {
        const saved = $persistentStore.read('GasolinePriceConfig');
        if (saved) {
            return JSON.parse(saved);
        }
        return defaultConfig;
    } catch (e) {
        console.log('读取配置失败:', e);
        return defaultConfig;
    }
}

// 保存配置函数（用于长按面板设置）
function saveConfig(config) {
    try {
        $persistentStore.write(JSON.stringify(config), 'GasolinePriceConfig');
        return true;
    } catch (e) {
        console.log('保存配置失败:', e);
        return false;
    }
}

// ========== 主执行逻辑 ==========

// 检查是否来自长按面板的设置请求
const arg = $argument || '';
if (arg) {
    try {
        const params = new URLSearchParams(arg);
        if (params.has('action') && params.get('action') === 'config') {
            // 处理配置更新
            const newConfig = {
                location: params.get('location') || defaultConfig.location,
                type: params.get('type') || defaultConfig.type,
                isShowAll: params.get('isShowAll') !== 'false'
            };
            
            if (saveConfig(newConfig)) {
                $done({
                    title: '油价设置',
                    content: '✅ 配置已保存\n\n地区: ' + newConfig.location + '\n油号: ' + newConfig.type,
                    icon: 'checkmark.circle.fill',
                    'icon-color': '#34C759'
                });
            } else {
                $done({
                    title: '油价设置',
                    content: '❌ 配置保存失败',
                    icon: 'xmark.circle.fill',
                    'icon-color': '#FF3B30'
                });
            }
            $done();
            return;
        }
    } catch (e) {
        console.log('参数解析失败:', e);
    }
}

// 正常执行油价查询
(async () => {
    await getGasolinePrice();
})();
