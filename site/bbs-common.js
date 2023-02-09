// Common BBS functionality.

const importFirstOf = async(...names) => {
    const errors = [];
    for(const name of names) {
        try {
            return await import(name);
        } catch(error) {
            errors.push(error);
        }
    }
    throw new Error(`Could not find any of the following modules: ${names.join(', ')} - ${errors.map(
        (error) => error.message || error
    ).join(', ')}`);
};

const firebase = await importFirstOf(
    'firebase/app', './firebase.js', 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js'
);
const firestore = await importFirstOf(
    'firebase/firestore', './firebase-firestore.js', 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js'
);
let postsCollection = null;

export const initialize = async(firebaseProject) => {
    // We should have a better check, like counting apps in firebase-admin.
    if(postsCollection) {
        return console.warn('Not attempting to initialize Firebase again.');
    }
    const app = firebase.initializeApp({projectId: firebaseProject});
    postsCollection = firestore.collection(firestore.getFirestore(app), 'Post');
    console.info('Firebase initialized');
};

export const getPostsByCommunity = async(community) => (await firestore.getDocs(await firestore.query(
    postsCollection, firestore.where('tokenName', '==', community)
))).docs.map((doc) => doc.data());

export const getPostById = async(id) => (await firestore.getDoc(firestore.doc(postsCollection, id))).data();

export const getAuthToken = async() => await window.deWeb.getFirebaseIdToken();
