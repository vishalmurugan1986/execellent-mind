import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

import { base64ToBytes, ThinkGearHandlers, ThinkGearParser } from './thinkgear';

export type SourceEvents = ThinkGearHandlers & {
  onDisconnected?: (reason?: string) => void;
};

export interface EegSource {
  stop(): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* BrainLink-Lite over Classic Bluetooth (needs a development build).  */
/* ------------------------------------------------------------------ */

export type PairedDevice = { name: string; address: string };

export const bluetoothSupported = () =>
  Platform.OS === 'android' && !!NativeModules.RNBluetoothClassic;

function btLib(): any {
  // Required lazily so Expo Go (which lacks the native module) never loads it.
  return require('react-native-bluetooth-classic').default;
}

export async function ensureBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (Platform.Version >= 31) {
    const res = await PermissionsAndroid.requestMultiple([
      'android.permission.BLUETOOTH_CONNECT' as any,
      'android.permission.BLUETOOTH_SCAN' as any,
    ]);
    return Object.values(res).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
  }
  const r = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

export async function listPairedDevices(): Promise<PairedDevice[]> {
  const BT = btLib();
  if (!(await BT.isBluetoothEnabled())) {
    const ok = await BT.requestBluetoothEnabled().catch(() => false);
    if (!ok) throw new Error('bluetooth-off');
  }
  const devices: any[] = await BT.getBondedDevices();
  return devices.map((d) => ({ name: d.name ?? d.address, address: d.address }));
}

export async function startBrainLink(address: string, ev: SourceEvents): Promise<EegSource> {
  const BT = btLib();
  const parser = new ThinkGearParser(ev);
  const devices: any[] = await BT.getBondedDevices();
  const device = devices.find((d) => d.address === address);
  if (!device) throw new Error('not-paired');

  const already = await device.isConnected().catch(() => false);
  if (!already) {
    await device.connect({
      connectionType: 'binary',
      readSize: 16384,
      delimiter: '',
      secure: true,
    });
  }
  const dataSub = device.onDataReceived((e: { data: string }) => {
    try {
      parser.push(base64ToBytes(e.data));
    } catch {
      // ignore a malformed chunk; the parser resyncs on the next 0xAA 0xAA
    }
  });
  const discSub = BT.onDeviceDisconnected((e: any) => {
    if (e?.device?.address === address) ev.onDisconnected?.('lost');
  });

  return {
    async stop() {
      dataSub?.remove?.();
      discSub?.remove?.();
      await device.disconnect().catch(() => {});
    },
  };
}
