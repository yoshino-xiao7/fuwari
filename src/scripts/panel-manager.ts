/**
 * panel-manager — 浮出面板管理
 * 提供统一的点击外部关闭功能，供 Navbar、搜索、显示设置等面板使用
 */

/**
 * 注册点击外部自动关闭
 * @param panelId  面板元素 ID
 * @param triggerIds  触发器元素 ID 列表（点击这些元素时不关闭）
 */
export function setupClickOutsideToClose(
	panelId: string,
	triggerIds: string[],
): void {
	document.addEventListener("click", (event) => {
		const panelDom = document.getElementById(panelId);
		const tDom = event.target;
		if (!(tDom instanceof Node)) return;
		for (const ig of triggerIds) {
			const ie = document.getElementById(ig);
			if (ie === tDom || ie?.contains(tDom)) {
				return;
			}
		}
		panelDom?.classList.add("float-panel-closed");
	});
}
