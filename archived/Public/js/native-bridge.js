window.SDXBridge = {
    hasNativeBridge() {
        return !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.openExternal);
    },

    openExternal(url, mode) {
        if (!this.hasNativeBridge()) return false;
        window.webkit.messageHandlers.openExternal.postMessage({ url, mode });
        return true;
    }
};
