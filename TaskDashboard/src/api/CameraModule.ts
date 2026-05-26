import { NativeModules, Platform } from 'react-native';

const { CameraModule } = NativeModules;

export interface CameraModuleInterface {
  takePhoto(): Promise<string>;
}

const isMockEnabled = false;

// Fallback o mock si no está disponible (ej. en web o si falla la vinculación)
export const Camera: CameraModuleInterface = CameraModule || {
  takePhoto: async () => {
    if (isMockEnabled || Platform.OS === 'web') {
      console.log('CameraModule no está disponible, usando mock.');
      return 'file://mock/path/to/image.jpg';
    }
    throw new Error('CameraModule no está enlazado correctamente.');
  }
};

export default Camera;
