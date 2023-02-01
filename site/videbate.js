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

// Detect which mode we are on (full or not).
// TODO - not certain this is the best way to do it.
const FULL_EXPERIENCE_WIDTH = 600;
const isFull = () => window.innerWidth >= FULL_EXPERIENCE_WIDTH;

// The main function.
export const show = async(core, appElement, post) => {
    console.log(post);
    const state = {
        post: post,
        full: isFull(),
        playing: false
    };
    const ui = await appElement.add('div');

    const player = await ui.add('video', state.full ? 'full' : null, {
        autoplay: state.full, controls: !state.full, src: state.post.videoUrl
    });
    player.addEventListener('play', () => state.playing = true);
    player.addEventListener('pause', () => state.playing = false);
    player.addEventListener('ended', () => state.playing = false);
    player.tryToPlay = () => {
        // Browsers often block programmatic playback of videos.
        try {
            player.play();
        } catch(_) {/* ignore */}
    };

    // Cascading update.
    const updateListeners = [];
    const update = () => updateListeners.forEach((listener) => listener.update());

    const navigate = async(partialPostId) => {
        const post = await new Promise((resolve, reject) => fetch(`/post/${partialPostId}`).then(
            (response) => response.json()
        ).then(resolve).catch(reject));
        if(post.id === state.post.id) return;
        state.post = post;
        player.src = state.post.videoUrl;
        if(state.full) {
            player.tryToPlay();
        }
        core.navigateToPost(post.id);
        update();
    };

    const controlOverlay = await appElement.add('div', 'control');
    updateListeners.push(...await Promise.all(Object.entries({
        'Parent': () => state.post.id.slice(0, -1),
        'Top Child': () => state.post.children[0],
        'Next Sibling': () => state.post.siblings.nextSiblings[0],
        'Previous Sibling': () => state.post.siblings.previousSiblings.at(-1)
    }).map(([label, getPostId]) => controlOverlay.add('button', null, {textContent: label}, (button) => {
        const postId = getPostId() || [];
        button.disabled = postId.length < 1;
        button.hidden = !state.full;
        button.onclick = () => navigate(postId);
    }))));

    const setFull = (full) => {
        if(state.full === full) return;
        player.classList.toggle('full', full);
        player.autoplay = full;
        player.controls = !full;
        if(full) {
            player.tryToPlay();
        }
        state.full = full;
        update();
    };

    window.addEventListener('resize', () => setFull(window.innerWidth >= FULL_EXPERIENCE_WIDTH));
};

// Lifecycle hooks.
export const mount = async(appElement, core) => {
    // This should really come from a component in the path, but for now we'll just use the hash, so it can be static.
    const partialPostId = window.location.hash.slice(1);
    const post = await new Promise((resolve, reject) => fetch(`/post/${partialPostId}`).then(
        (response) => response.json()
    ).then(resolve).catch(reject));
    await show(core, appElement, post);
};
