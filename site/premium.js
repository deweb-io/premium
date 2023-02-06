// Try to import bbs-common from our server, defaulting to the CDN if that fails.
let isRemote = false;
const bbs = await import('./bbs-common.js').catch(() => {
    isRemote = true;
    return import('https://cdn.jsdelivr.net/npm/@dewebio/bbs-common@latest/index.min.js');
});
console.info(`bbs-common library loaded from ${isRemote ? 'remote CDN' : 'local file'}`, bbs);

// UI framework :)
Element.prototype.add = async function(tagName, className, attributes, updateFunction) {
    const element = this.appendChild(document.createElement(tagName));
    element.classList.add(...(className ? (Array.isArray(className) ? className : [className]) : []));
    for(const [attribute, value] of Object.entries(attributes || {})) element[attribute] = value;
    if(updateFunction) {
        element.update = async() => updateFunction(element);
        await element.update();
    }
    return element;
};

// The main function.
export const show = async(appElement) => {
    const ui = await appElement.add('div');
    ui.add('p', null, {textContent: 'This is premium'});
};

// Lifecycle hooks.
export const mount = async(appElement) => {
    // This should really come from a component in the path, but for now we'll just use the hash, so it can be static.
    await show(appElement);
};
