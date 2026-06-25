/**
 * Analytics 配置 — 集中管理所有第三方分析服务的 ID
 * 修改 tracking ID 只需改这一处
 */
export const analyticsConfig = {
	baidu: {
		enabled: true,
		scriptUrl: "https://hm.baidu.com/hm.js?69025b38a7f30d097ec77b0635cc7f84",
	},
	clarity: {
		enabled: false,
		projectId: "udl1zwuz27",
	},
	ga: {
		enabled: true,
		trackingId: "G-8BSEJ23TXZ",
		scriptUrl: "https://www.googletagmanager.com/gtag/js",
	},
	cloudflare: {
		enabled: false,
		token: "58c9626fdb9c418eb0aeac6d3c60aada",
		scriptUrl: "https://static.cloudflareinsights.com/beacon.min.js",
	},
} as const;
