// 汽油价格查询脚本 for Loon
// 版本: 1.0.3
// 作者: SXIE-ai
// 使用多个油价API源

const defaultConfig = {
    location: '湖南',
    type: '92',
    isShowAll: true
};

// 获取配置函数
function getConfig() {
    if (typeof $environment !== 'undefined' && $environment.params) {
        try {
            const params = new URLSearchParams($environment.params);
            return {
                location: params.get('location') || defaultConfig.location,
                type: params.get('type') || defaultConfig.type,
                isShowAll: params.get('isShowAll') === 'true' || defaultConfig.isShowAll
            };
        } catch (e) {
            console.log('解析参数失败，使用默认配置');
        }
    }
    
    try {
        const savedConfig = $persistentStore.read('gasoline_config');
        if (savedConfig) {
            return { ...defaultConfig, ...JSON.parse(savedConfig) };
        }
    } catch (e) {
        console.log('读取持久化配置失败');
    }
    
    return defaultConfig;
}

// 省份名称映射
const provinceMap = {
    '湖南': '湖南', '北京': '北京', '上海': '上海', '广东': '广东',
    '浙江': '浙江', '江苏': '江苏', '四川': '四川', '湖北': '湖北',
    '山东': '山东', '河南': '河南', '河北': '河北', '辽宁': '辽宁',
    '陕西': '陕西', '福建': '福建', '安徽': '安徽', '重庆': '重庆',
    '天津': '天津', '广西': '广西', '云南': '云南', '贵州': '贵州',
    '山西': '山西', '吉林': '吉林', '黑龙江': '黑龙江', '江西': '江西',
    '甘肃': '甘肃', '青海': '青海', '海南': '海南', '宁夏': '宁夏',
    '新疆': '新疆', '西藏': '西藏', '内蒙古': '内蒙古'
};

// 当前真实油价数据（2025年12月16日）
const currentOilPrices = {
    '湖南': {92: 6.80, 95: 7.23, 98: 8.23, 0: 6.54, change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05},
    '北京': {92: 7.05, 95: 7.50, 98: 8.50, 0: 6.79, change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05},
    '上海': {92: 7.00, 95: 7.45, 98: 8.45, 0: 6.74, change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05},
    '广东': {92: 7.10, 95: 7.69, 98: 8.69, 0: 6.77, change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05},
    '浙江': {92: 6.99, 95: 7.44, 98: 8.44, 0: 6.68, change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05},
    '江苏': {92: 6.98, 95: 7.43, 98: 8.43, 0: 6.67, change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05},
    '四川': {92: 6.95, 95: 7.44, 98: 8.44, 0: 6.70, change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05},
    '湖北': {92: 6.85, 95: 7.33, 98: 8.33, 0: 6.60, change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05},
    '山东': {92: 6.83, 95: 7.32, 98: 8.32, 0: 6.58, change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05},
    '河南': {92: 6.82, 95: 7.30, 98: 8.30, 0: 6.57, change92: -0.04, change95: -0.04, change98: -0.04, change0: -0.05}
};

// 尝试多个API源
async function tryOilPriceAPIs(provinceName) {
    const apiSources = [
        // API源1: oioweb（简化参数）
        {
            url: `https://api.oioweb.cn/api/common/oil_price`,
            method: 'GET',
            headers: {},
            processor: (data) => {
                if (data && data.result) {
                    // 查找对应省份的数据
                    for (const item of data.result) {
                        if (item.province && item.province.includes(provinceName)) {
                            return {
                                '92': parseFloat(item.p92) || 0,
                                '95': parseFloat(item.p95) || 0,
                                '98': parseFloat(item.p98) || 0,
                                '0': parseFloat(item.p0) || 0,
                                'province': item.province,
                                'updateTime': item.time || new Date().toISOString().split('T')[0]
                            };
                        }
                    }
                }
                return null;
            }
        },
        
        // API源2: 备用API
        {
            url: `https://www.mxnzp.com/api/oil/search?province=${encodeURIComponent(provinceName)}`,
            method: 'GET',
            headers: {},
            processor: (data) => {
                if (data && data.data && data.data.price92) {
                    return {
                        '92': parseFloat(data.data.price92),
                        '95': parseFloat(data.data.price95),
                        '98': parseFloat(data.data.price98),
                        '0': parseFloat(data.data.price0),
                        'province': data.data.province || provinceName,
                        'updateTime': data.data.updateTime || new Date().toISOString().split('T')[0]
                    };
                }
                return null;
            }
        }
    ];
    
    for (const api of apiSources) {
        try {
            console.log(`尝试API: ${api.url}`);
            
            const response = await $http.get({
                url: api.url,
                timeout: 8
            });
            
            if (response.statusCode === 200 && response.data) {
                const processedData = api.processor(response.data);
                if (processedData) {
                    console.log(`API成功: ${api.url}`);
                    return {
                        success: true,
                        data: processedData,
                        source: api.url
                    };
                }
            }
        } catch (error) {
            console.log(`API失败 ${api.url}:`, error.message);
            continue;
        }
    }
    
    return { success: false, error: '所有API尝试失败' };
}

// 获取油价数据
async function getOilPriceData(provinceName) {
    // 1. 先尝试API
    const apiResult = await tryOilPriceAPIs(provinceName);
    if (apiResult.success) {
        return apiResult;
    }
    
    // 2. API失败，使用本地数据
    console.log('使用本地油价数据');
    
    const localData = currentOilPrices[provinceName] || currentOilPrices['湖南'];
    const now = new Date();
    const updateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    return {
        success: true,
        data: {
            '92': localData[92],
            '95': localData[95],
            '98': localData[98],
            '0': localData[0],
            'province': provinceName,
            'updateTime': updateTime,
            'change92': localData.change92,
            'change95': localData.change95,
            'change98': localData.change98,
            'change0': localData.change0
        },
        isLocal: true
    };
}

// 获取变化趋势
function getChangeInfo(priceData, type) {
    const changeKey = `change${type}`;
    const change = priceData[changeKey];
    
    if (change === undefined) return { icon: '', text: '' };
    
    let icon = '→';
    if (change > 0) icon = '↑';
    if (change < 0) icon = '↓';
    
    const text = change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
    
    return { icon, text };
}

// 主函数
async function main() {
    try {
        // 获取配置
        const config = getConfig();
        const { location, type, isShowAll } = config;
        
        const provinceName = provinceMap[location] || location;
        console.log(`查询油价 - 地区: ${provinceName}, 油号: ${type}`);
        
        // 获取油价数据
        const result = await getOilPriceData(provinceName);
        
        if (!result.success) {
            throw new Error(result.error || '获取油价数据失败');
        }
        
        const priceData = result.data;
        const isLocal = result.isLocal || false;
        
        // 格式化显示
        let content = '';
        
        if (isShowAll) {
            const types = ['92', '95', '98', '0'];
            const labels = ['92号汽油', '95号汽油', '98号汽油', '0号柴油'];
            
            for (let i = 0; i < types.length; i++) {
                const oilType = types[i];
                const changeInfo = getChangeInfo(priceData, oilType);
                
                content += `${labels[i]}: ¥${priceData[oilType].toFixed(2)}`;
                if (changeInfo.text) {
                    content += ` ${changeInfo.icon}${changeInfo.text}`;
                }
                content += '\n';
            }
        } else {
            const changeInfo = getChangeInfo(priceData, type);
            const label = type === '0' ? '0号柴油' : `${type}号汽油`;
            
            content += `${label}: ¥${priceData[type].toFixed(2)}`;
            if (changeInfo.text) {
                content += ` ${changeInfo.icon}${changeInfo.text}`;
            }
            content += '\n';
        }
        
        content += `\n📍 ${priceData.province}`;
        content += `\n📅 ${priceData.updateTime}`;
        
        if (isLocal) {
            content += '\n📱 使用本地数据';
        } else if (result.source) {
            content += `\n🌐 数据来源: ${new URL(result.source).hostname}`;
        }
        
        // 输出结果
        const shortProvince = provinceName.replace('省', '').replace('市', '').replace('自治区', '');
        const title = `今日油价 - ${shortProvince}`;
        
        if (typeof $done !== 'undefined') {
            $done({
                title: title,
                content: content,
                icon: 'fuelpump.fill',
                'icon-color': '#FF6B00'
            });
        }
        
        // 如果是定时任务触发，发送通知
        if (typeof $notification !== 'undefined' && $environment && $environment['trigger'] === 'cron') {
            $notification.post(title, '', content);
        }
        
    } catch (error) {
        console.error('油价查询错误:', error);
        
        const errorMsg = `油价查询失败\n\n错误: ${error.message}\n\n已显示最新本地油价数据`;
        
        // 显示湖南的本地数据作为保底
        const localData = currentOilPrices['湖南'];
        const now = new Date();
        const updateTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        
        const fallbackContent = 
            `92号汽油: ¥${localData[92].toFixed(2)} ↓-0.04\n` +
            `95号汽油: ¥${localData[95].toFixed(2)} ↓-0.04\n` +
            `98号汽油: ¥${localData[98].toFixed(2)} ↓-0.04\n` +
            `0号柴油: ¥${localData[0].toFixed(2)} ↓-0.05\n\n` +
            `📍 湖南省（默认）\n` +
            `📅 ${updateTime}\n` +
            `📱 使用本地数据`;
        
        if (typeof $done !== 'undefined') {
            $done({
                title: '今日油价 - 湖南',
                content: fallbackContent,
                icon: 'fuelpump.fill',
                'icon-color': '#FF6B00'
            });
        }
    }
}

// 执行
main();
