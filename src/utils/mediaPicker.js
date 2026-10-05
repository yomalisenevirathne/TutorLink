import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

/**
 * Prompt user to select between Camera and Photo Library, checking permissions before opening.
 * @returns {Promise<string|null>} Selected image URI or null if canceled
 */
export async function pickImageWithPermissions() {
  return new Promise((resolve) => {
    // For Web environment
    if (Platform.OS === 'web') {
      ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      }).then(result => {
        if (!result.canceled && result.assets && result.assets.length > 0) {
          resolve(result.assets[0].uri);
        } else {
          resolve(null);
        }
      }).catch(err => {
        console.error('Image picker error:', err);
        resolve(null);
      });
      return;
    }

    // Native Mobile Environment Alert prompt
    Alert.alert(
      'Profile Photo',
      'Choose an option to upload your profile photo:',
      [
        {
          text: '📷 Take Photo (Camera)',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Camera access is required to take a photo.');
              resolve(null);
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              resolve(result.assets[0].uri);
            } else {
              resolve(null);
            }
          },
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission Denied', 'Photo Library access is required to choose a photo.');
              resolve(null);
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
              resolve(result.assets[0].uri);
            } else {
              resolve(null);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true }
    );
  });
}

/**
 * Pick qualification document (PDF, Word doc, or Image)
 * @returns {Promise<{name: string, uri: string, size?: number}|null>}
 */
export async function pickQualificationDocument() {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/*'
      ],
      copyToCacheDirectory: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const file = result.assets[0];
      return {
        name: file.name || 'Qualification_Certificate.pdf',
        uri: file.uri,
        size: file.size,
        mimeType: file.mimeType,
      };
    }
    return null;
  } catch (error) {
    console.error('Document picker error:', error);
    Alert.alert('Error', 'Unable to pick document.');
    return null;
  }
}
