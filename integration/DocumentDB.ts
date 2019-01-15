interface LocalDocuments {
    [key: string]: {
        id: string;
        content: string;
        name: string | null;
    };
}

export const LOCAL_DOC_STORAGE_KEY = `icl_docs`;

const docContentInLocalStorage = localStorage.getItem(LOCAL_DOC_STORAGE_KEY) || "";
let documents: LocalDocuments = {};
try {
    documents = JSON.parse(docContentInLocalStorage) as LocalDocuments;
} catch (_) {
    /*Invalid JSON, sad*/
}

function saveDocs() {
    localStorage.setItem(LOCAL_DOC_STORAGE_KEY, JSON.stringify(documents));
}

export function isLocalDocument(id: string) {
    return documents[id] && documents[id].id === id;
}

export function getDoc(id: string) {
    if (!documents[id]) {
        throw new Error(`Document does not exist - ${id}`);
    }
    return documents[id];
}

export function saveDoc(id: string, content: string, name: string | null) {
    documents[id] = {content, name, id};
    saveDocs();
}

export function updateDoc(id: string, content: string, name: string | null) {
    if (!documents[id]) {
        throw new Error("Document cannot be updated because it does not exist");
    }
    documents[id] = {content, name, id};
    saveDocs();
}
