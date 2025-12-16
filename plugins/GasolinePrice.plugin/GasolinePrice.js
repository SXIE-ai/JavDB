// 汽油价格查询脚本 for Loon
// 版本: 1.0.0
// 作者: SXIE-ai

const defaultConfig = {
    location: '江苏',
    type: '92',
    isShowAll: true
};

// 获取配置函数（Loon专用）
function getConfig() {
    // 方法1: 从 $environment 获取（如果从插件配置面板传入）
    if (typeof $environment !== 'undefined' && $environment.params) {
        try {
            const params = new URLSearchParams($environment.params);
            const config = {
                location: params.get('location') || defaultConfig.location,
                type: params.get('type') || defaultConfig.type,
                isShowAll: params.get('isShowAll') === 'true' || defaultConfig.isShowAll
            };
            console.log('从 $environment 获取配置:', config);
            return config;
        } catch (e) {
            console.log('解析参数失败，使用默认配置');
        }
    }
    
    // 方法2: 从持久化存储获取（如果用户已保存配置）
    try {
        const savedConfig = $persistentStore.read('gasoline_config');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            console.log('从持久化存储获取配置:', config);
            return { ...defaultConfig, ...config };
        }
    } catch (e) {
        console.log('读取持久化配置失败');
    }
    
    // 方法3: 使用默认配置
    console.log('使用默认配置:', defaultConfig);
    return defaultConfig;
}

// 模拟油价数据（实际使用时替换为真实API）
async function fetchGasolinePrice(location, type) {
    // 这里应该是真实的API调用，暂时用模拟数据
    // 示例API: https://apis.tianapi.com/oilprice/index?key=你的API密钥&prov=省份
    
    // 模拟数据
    const mockData = {
        '江苏': {
            '92': 7.98,
            '95': 8.49,
            '98': 9.49,
            '0': 7.67,
            'updateTime': '2024-12-16 08:00',
            'province': '江苏省'
        },
        '北京': {
            '92': 8.05,
            '95': 8.56,
            '98': 9.56,
            '0': 7.74,
            'updateTime': '2024-12-16 08:00',
            'province': '北京市'
        },
        '上海': {
            '92': 8.00,
            '95': 8.51,
            '98': 9.51,
            '0': 7.69,
            'updateTime': '2024-12-16 08:00',
            'province': '上海市'
        }
    };
    
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const data = mockData[location] || mockData['江苏'];
    return {
        success: true,
        data: data
    };
}

// 主函数
async function main() {
    try {
        // 1. 获取配置
        const config = getConfig();
        const { location, type, isShowAll } = config;
        
        console.log(`开始查询油价 - 地区: ${location}, 油号: ${type}`);
        
        // 2. 获取油价数据
        const result = await fetchGasolinePrice(location, type);
        
        if (!result.success) {
            throw new Error('获取油价数据失败');
        }
        
        const priceData = result.data;
        
        // 3. 格式化显示内容
        let content = '';
        if (isShowAll) {
            content += `⛽ 92号汽油: ¥${priceData['92']}\n`;
            content += `⛽ 95号汽油: ¥${priceData['95']}\n`;
            content += `⛽ 98号汽油: ¥${priceData['98']}\n`;
            content += `⛽ 0号柴油: ¥${priceData['0']}\n`;
        } else {
            content += `⛽ ${type}号: ¥${priceData[type]}\n`;
        }
        
        content += `📍 ${priceData.province}\n`;
        content += `🕒 ${priceData.updateTime}`;
        
        // 4. 输出到Loon面板
        const notification = {
            title: `今日油价 - ${priceData.province}`,
            content: content
        };
        
        // 判断执行环境
        if (typeof $notification !== 'undefined') {
            // Loon环境
            $notification.post(notification.title, '', notification.content);
        }
        
        if (typeof $done !== 'undefined') {
            // 面板更新
            $done({
                title: notification.title,
                content: notification.content,
                icon: 'fuelpump.fill'
            });
        } else {
            // 纯脚本执行
            console.log(JSON.stringify(notification, null, 2));
        }
        
    } catch (error) {
        console.error('油价查询错误:', error);
        
        const errorMsg = {
            title: '油价查询失败',
            content: `错误: ${error.message}\n请检查网络连接`
        };
        
        if (typeof $notification !== 'undefined') {
            $notification.post(errorMsg.title, '', errorMsg.content);
        }
        
        if (typeof $done !== 'undefined') {
            $done({
                title: errorMsg.title,
                content: errorMsg.content,
                icon: 'exclamationmark.triangle.fill',
                style: 'error'
            });
        }
    }
}

// 执行主函数
main();
