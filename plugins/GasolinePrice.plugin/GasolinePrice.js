// 汽油价格查询脚本 for Loon
// 版本: 1.0.2
// 作者: SXIE-ai
// 使用真实油价API

const defaultConfig = {
    location: '湖南',
    type: '92',
    isShowAll: true
};

// 获取配置函数
function getConfig() {
    // 方法1: 从 $environment 获取
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
    
    // 方法2: 从持久化存储获取
    try {
        const savedConfig = $persistentStore.read('gasoline_config');
        if (savedConfig) {
            return { ...defaultConfig, ...JSON.parse(savedConfig) };
        }
    } catch (e) {
        console.log('读取持久化配置失败');
    }
    
    // 方法3: 使用默认配置
    return defaultConfig;
}

// 省份名称映射（将简称为完整省份名）
const provinceMap = {
    '湖南': '湖南省',
    '北京': '北京市',
    '上海': '上海市',
    '广东': '广东省',
    '浙江': '浙江省',
    '江苏': '江苏省',
    '四川': '四川省',
    '湖北': '湖北省',
    '山东': '山东省',
    '河南': '河南省',
    '河北': '河北省',
    '辽宁': '辽宁省',
    '陕西': '陕西省',
    '福建': '福建省',
    '安徽': '安徽省'
};

// 使用真实油价API
async function fetchRealGasolinePrice(provinceName) {
    try {
        // API 1: 天行数据（需要API密钥，这里用示例）
        // const apiKey = "你的API密钥";
        // const apiUrl = `https://apis.tianapi.com/oilprice/index?key=${apiKey}&prov=${encodeURIComponent(provinceName)}`;
        
        // API 2: 使用公共油价API（免费）
        // 这里使用一个公开的油价查询接口
        const apiUrl = `https://api.oioweb.cn/api/common/oil_price?province=${encodeURIComponent(provinceName)}`;
        
        console.log(`请求API: ${apiUrl}`);
        
        const response = await $http.get({
            url: apiUrl,
            timeout: 10
        });
        
        if (response.statusCode === 200 && response.data) {
            return {
                success: true,
                data: response.data
            };
        } else {
            throw new Error(`API响应失败: ${response.statusCode}`);
        }
        
    } catch (error) {
        console.log('API调用失败，使用模拟数据:', error);
        
        // 使用你截图中的真实数据作为模拟数据
        const realData = {
            '湖南省': {
                '92': 6.80,
                '95': 7.23,
                '98': 8.23,
                '0': 6.54,
                'updateTime': '2025-12-16',
                'province': '湖南省',
                'change92': -0.04,
                'change95': -0.04,
                'change98': -0.04,
                'change0': -0.05
            },
            '北京市': {
                '92': 7.05,
                '95': 7.50,
                '98': 8.50,
                '0': 6.79,
                'updateTime': '2025-12-16',
                'province': '北京市',
                'change92': -0.04,
                'change95': -0.04,
                'change98': -0.04,
                'change0': -0.05
            },
            '上海市': {
                '92': 7.00,
                '95': 7.45,
                '98': 8.45,
                '0': 6.74,
                'updateTime': '2025-12-16',
                'province': '上海市',
                'change92': -0.04,
                'change95': -0.04,
                'change98': -0.04,
                'change0': -0.05
            }
        };
        
        // 查找省份数据
        const fullProvinceName = provinceMap[provinceName] || provinceName;
        const data = realData[fullProvinceName] || realData['湖南省'];
        
        return {
            success: true,
            data: data,
            isMock: true
        };
    }
}

// 获取变化趋势图标
function getChangeIcon(change) {
    if (!change) return '';
    if (change > 0) return '↑';
    if (change < 0) return '↓';
    return '→';
}

// 获取变化值文字
function getChangeText(change) {
    if (!change) return '';
    const absChange = Math.abs(change);
    return `${change > 0 ? '+' : ''}${change.toFixed(2)}`;
}

// 主函数
async function main() {
    try {
        // 1. 获取配置
        const config = getConfig();
        let { location, type, isShowAll } = config;
        
        // 转换为完整省份名称
        const provinceName = provinceMap[location] || location;
        
        console.log(`开始查询油价 - 地区: ${provinceName}, 油号: ${type}`);
        
        // 2. 获取油价数据
        const result = await fetchRealGasolinePrice(provinceName);
        
        if (!result.success) {
            throw new Error('获取油价数据失败');
        }
        
        const priceData = result.data;
        const isMock = result.isMock || false;
        
        // 3. 格式化显示内容
        let content = '';
        
        if (isShowAll) {
            // 显示所有油号价格
            if (priceData.change92 !== undefined) {
                content += `92号: ¥${priceData['92']} ${getChangeIcon(priceData.change92)}${getChangeText(priceData.change92)}\n`;
            } else {
                content += `92号: ¥${priceData['92']}\n`;
            }
            
            if (priceData.change95 !== undefined) {
                content += `95号: ¥${priceData['95']} ${getChangeIcon(priceData.change95)}${getChangeText(priceData.change95)}\n`;
            } else {
                content += `95号: ¥${priceData['95']}\n`;
            }
            
            if (priceData.change98 !== undefined) {
                content += `98号: ¥${priceData['98']} ${getChangeIcon(priceData.change98)}${getChangeText(priceData.change98)}\n`;
            } else {
                content += `98号: ¥${priceData['98']}\n`;
            }
            
            if (priceData.change0 !== undefined) {
                content += `0号柴油: ¥${priceData['0']} ${getChangeIcon(priceData.change0)}${getChangeText(priceData.change0)}\n`;
            } else {
                content += `0号柴油: ¥${priceData['0']}\n`;
            }
        } else {
            // 只显示指定油号
            const changeKey = `change${type}`;
            const change = priceData[changeKey];
            
            content += `${type}号: ¥${priceData[type]}`;
            if (change !== undefined) {
                content += ` ${getChangeIcon(change)}${getChangeText(change)}`;
            }
            content += '\n';
        }
        
        content += `\n📍 ${priceData.province}`;
        content += `\n📅 ${priceData.updateTime}`;
        
        if (isMock) {
            content += '\n⚠️ 使用本地数据';
        }
        
        // 4. 输出到Loon面板
        const title = `今日油价 - ${priceData.province.replace('省', '').replace('市', '')}`;
        
        if (typeof $done !== 'undefined') {
            $done({
                title: title,
                content: content,
                icon: 'fuelpump.fill',
                'icon-color': '#FF6B00'
            });
        }
        
        // 如果需要发送通知（cron任务时）
        if (typeof $notification !== 'undefined' && $environment && $environment['trigger'] === 'cron') {
            $notification.post(title, '', content);
        }
        
    } catch (error) {
        console.error('油价查询错误:', error);
        
        const errorContent = `错误: ${error.message}\n\n📌 建议:\n1. 检查网络连接\n2. 确认地区名称正确\n3. 稍后重试`;
        
        if (typeof $done !== 'undefined') {
            $done({
                title: '油价查询失败',
                content: errorContent,
                icon: 'exclamationmark.triangle.fill',
                style: 'error'
            });
        }
    }
}

// 执行主函数
main();
