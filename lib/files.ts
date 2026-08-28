import { Platform } from 'react-native';
import { File } from 'expo-file-system';

/**
 * Reading a local file, on both platforms.
 *
 * Native goes through expo-file-system's `File`, which streams from disk.
 * `fetch('file://…')` also appears to work in Expo but loads the whole thing
 * through the network stack and falls over on larger files.
 *
 * Web has no such thing as a file path — the camera hands back a `blob:` or
 * `data:` URL — so there it goes through fetch and FileReader, which is the
 * only route the browser offers.
 */

export async function readAsBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read the image.'));
      reader.onload = () => {
        const result = String(reader.result);
        // FileReader gives `data:image/jpeg;base64,XXXX`; only the payload is wanted.
        resolve(result.slice(result.indexOf(',') + 1));
      };
      reader.readAsDataURL(blob);
    });
  }

  return await new File(uri).base64();
}

export async function readAsBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    return new Uint8Array(await blob.arrayBuffer());
  }
  return await new File(uri).bytes();
}

/** Size in bytes, or null when it cannot be determined (web blob URLs). */
export async function fileSize(uri: string): Promise<number | null> {
  try {
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob();
      return blob.size;
    }
    return new File(uri).size ?? null;
  } catch {
    return null;
  }
}
