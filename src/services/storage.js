import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

/**
 * Upload an image to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} path - The path in storage (e.g., 'projects/PROJ_ID/cover.jpg')
 * @returns {Promise<string>} - The download URL
 */
export const uploadImage = async (file, path) => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  return downloadURL;
};
