import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where,
  orderBy 
} from "firebase/firestore";
import { db } from "../firebase";

const PROJECTS_COLLECTION = "projects";

/**
 * Project Document Schema:
 * {
 *   internalRef: string,
 *   address: string,
 *   planningPortalRef: string,
 *   status: "Pending" | "Completed" | "Approved",
 *   approvalDate: string,
 *   clientInfo: {
 *     name: string,
 *     phone: string
 *   },
 *   projectDetails: {
 *     description: string,
 *     breakdown: string
 *   },
 *   assetStatus: {
 *     architectural: string,
 *     structural: string,
 *     finishes: string
 *   },
 *   media: {
 *     coverImage: string,
 *     aerialMap: string,
 *     documents: Array<{ name: string, url: string, category: string }>
 *   },
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp
 * }
 */

export const createProject = async (projectData) => {
  try {
    const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), {
      ...projectData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { id: docRef.id, ...projectData };
  } catch (e) {
    console.error("Error adding document: ", e);
    throw e;
  }
};

export const getProjects = async () => {
  const q = query(collection(db, PROJECTS_COLLECTION), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateProject = async (id, updateData) => {
  const docRef = doc(db, PROJECTS_COLLECTION, id);
  await updateDoc(docRef, {
    ...updateData,
    updatedAt: new Date()
  });
};

export const getProjectById = async (id) => {
  try {
    const docRef = doc(db, PROJECTS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (e) {
    console.error("Error getting document: ", e);
    throw e;
  }
};
