/*
AppRaven Premium Unlock
Unlock Premium, InAppPurchases, Ownership, Arcade, Preorder features
Quantumult X / Loon / Surge compatible
*/

let body = $response.body;

// Unlock all premium features
body = body.replace(/"premium":false/g, '"premium":true');
body = body.replace(/"hasInAppPurchases":false/g, '"hasInAppPurchases":true');
body = body.replace(/"youOwn":false/g, '"youOwn":true');
body = body.replace(/"arcade":false/g, '"arcade":true');
body = body.replace(/"preorder":false/g, '"preorder":true');

// Additional unlocks (optional)
body = body.replace(/"isPremium":false/g, '"isPremium":true');
body = body.replace(/"isSubscribed":false/g, '"isSubscribed":true');
body = body.replace(/"subscriptionActive":false/g, '"subscriptionActive":true');

$done({body});
