const admin = require("firebase-admin");
// Check if we can use the default initialization which often already has credentials in the environment
admin.initializeApp();

const db = admin.firestore();

async function updateDriveSettings() {
  const newFolderId = "1gZwFfBYS5idiyV9ZMuVyUwEhYXuijAxY";
  try {
    await db.collection('settings').doc('global').set({
      googleDriveFolderId: newFolderId
    }, { merge: true });
    console.log("Successfully updated Google Drive Master Folder ID to:", newFolderId);
    process.exit(0);
  } catch (error) {
    console.error("Error updating settings:", error);
    process.exit(1);
  }
}

updateDriveSettings();
