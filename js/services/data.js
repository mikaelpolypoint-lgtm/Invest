import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAbxy7iOxwaaTt-uKQasKF6cjacS1YK1L0",
    authDomain: "invest-46b33.firebaseapp.com",
    projectId: "invest-46b33",
    storageBucket: "invest-46b33.firebasestorage.app",
    messagingSenderId: "38526331432",
    appId: "1:38526331432:web:8d9dfa663c6dd09ceae31d",
    measurementId: "G-SH34023SNX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const COLLECTION_NAME = 'initiatives';

// Initial data for seeding if empty
const INITIAL_INITIATIVES = [
    { prio: 0, topic: "EOL", invest: 15000, assignedEpics: "REL-878" },
    { prio: 0, topic: "Technische Improvements", invest: 122000, assignedEpics: "REL-874, REL-883, REL-885, REL-862, REL-991" },
    { prio: 0, topic: "Leftovers", invest: 70000, assignedEpics: "REL-750, REL-832, REL-825" },
    { prio: 0, topic: "Nichtfunktional", invest: 70000, assignedEpics: "REL-892" },
    { prio: 1, topic: "Planungswunsch", invest: 45000, assignedEpics: "REL-849, REL-879, REL-899, REL-847" },
    { prio: 2, topic: "myPOLYPOINT: Teamplan (ganzes Planblatt) anzeigen", invest: 95000, assignedEpics: "REL-826" },
    { prio: 3, topic: "smartPEP", invest: 95000, assignedEpics: "REL-901, REL-900, REL-882, REL-891, REL-881" },
    { prio: 3, topic: "Partnerarchitektur", invest: 95000, assignedEpics: "REL-893" },
    { prio: 4, topic: "Partnerarchitektur", invest: 15000, assignedEpics: "REL-893" },
    { prio: 5, topic: "Verbesserungen Zeiterfassung", invest: 66000, assignedEpics: "REL-795" },
    { prio: 6, topic: "Changes 26.1", invest: 15000, assignedEpics: "REL-884" },
    { prio: 7, topic: "Changes 26.1", invest: 19000, assignedEpics: "REL-888" }
];

export const DataService = {
    getInitiatives: async () => {
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
            const initiatives = [];
            querySnapshot.forEach((doc) => {
                initiatives.push({ id: doc.id, ...doc.data() });
            });

            if (initiatives.length === 0) {
                console.log("No initiatives found, seeding initial data...");
                // Seed data sequentially to avoid race conditions
                for (const init of INITIAL_INITIATIVES) {
                    await addDoc(collection(db, COLLECTION_NAME), init);
                }
                // Fetch again
                const seededSnapshot = await getDocs(collection(db, COLLECTION_NAME));
                const seededInitiatives = [];
                seededSnapshot.forEach((doc) => {
                    seededInitiatives.push({ id: doc.id, ...doc.data() });
                });
                return seededInitiatives;
            }

            return initiatives;
        } catch (error) {
            console.error("Error getting initiatives: ", error);
            throw error;
        }
    },

    addInitiative: async (initiative) => {
        try {
            // Remove id if present, let Firestore generate it
            const { id, ...data } = initiative;
            const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
            return { id: docRef.id, ...data };
        } catch (error) {
            console.error("Error adding initiative: ", error);
            throw error;
        }
    },

    updateInitiative: async (id, data) => {
        try {
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, data);
        } catch (error) {
            console.error("Error updating initiative: ", error);
            throw error;
        }
    },

    deleteInitiative: async (id) => {
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (error) {
            console.error("Error deleting initiative: ", error);
            throw error;
        }
    }
};
