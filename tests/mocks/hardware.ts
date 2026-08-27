/**
 * Hardware & Native Device API Boundary Mocks.
 * Simulates Web NFC (NDEFReader), Camera (navigator.mediaDevices.getUserMedia),
 * and Location (navigator.geolocation).
 */

// ---------------------------------------------------------------------------
// Web NFC Mock
// ---------------------------------------------------------------------------

export interface MockNDEFRecord {
  recordType: 'text' | 'url' | 'mime' | 'unknown';
  mediaType?: string;
  id?: string;
  data: ArrayBuffer | Uint8Array | string;
  encoding?: string;
  lang?: string;
}

export interface MockNDEFMessage {
  records: MockNDEFRecord[];
}

export interface MockNDEFReadingEvent extends Event {
  serialNumber: string;
  message: MockNDEFMessage;
}

type NDEFEventHandler = (event: MockNDEFReadingEvent) => void;
type NDEFErrorHandler = (event: Event) => void;

export class MockNDEFReader {
  private scanning = false;
  private listeners: {
    reading: NDEFEventHandler[];
    readingerror: NDEFErrorHandler[];
  } = {
    reading: [],
    readingerror: [],
  };

  public async scan(): Promise<void> {
    this.scanning = true;
  }

  public async write(message: MockNDEFMessage | string): Promise<void> {
    if (!this.scanning && !message) {
      throw new Error('Invalid NFC write target');
    }
  }

  public addEventListener(
    type: 'reading' | 'readingerror',
    listener: NDEFEventHandler | NDEFErrorHandler
  ): void {
    if (type === 'reading') {
      this.listeners.reading.push(listener as NDEFEventHandler);
    } else if (type === 'readingerror') {
      this.listeners.readingerror.push(listener as NDEFErrorHandler);
    }
  }

  public removeEventListener(
    type: 'reading' | 'readingerror',
    listener: NDEFEventHandler | NDEFErrorHandler
  ): void {
    if (type === 'reading') {
      this.listeners.reading = this.listeners.reading.filter((l) => l !== listener);
    } else if (type === 'readingerror') {
      this.listeners.readingerror = this.listeners.readingerror.filter((l) => l !== listener);
    }
  }

  public simulateScan(serialNumber: string, records: MockNDEFRecord[]): void {
    if (!this.scanning) {
      throw new Error('Cannot simulate scan when NDEFReader is not scanning');
    }
    const event = new Event('reading') as MockNDEFReadingEvent;
    Object.defineProperty(event, 'serialNumber', { value: serialNumber });
    Object.defineProperty(event, 'message', { value: { records } });

    for (const handler of this.listeners.reading) {
      handler(event);
    }
  }

  public simulateScanError(error?: Error): void {
    const event = new Event('readingerror');
    if (error) {
      Object.defineProperty(event, 'error', { value: error });
    }
    for (const handler of this.listeners.readingerror) {
      handler(event);
    }
  }

  public reset(): void {
    this.scanning = false;
    this.listeners = { reading: [], readingerror: [] };
  }
}

// ---------------------------------------------------------------------------
// Camera (MediaDevices) Mock
// ---------------------------------------------------------------------------

export class MockMediaStreamTrack implements MediaStreamTrack {
  public enabled = true;
  public id = 'mock-track-id';
  public kind = 'video';
  public label = 'Mock Front Camera';
  public muted = false;
  public readyState: MediaStreamTrackState = 'live';
  public contentHint = '';
  public onended: ((this: MediaStreamTrack, ev: Event) => void) | null = null;
  public onmute: ((this: MediaStreamTrack, ev: Event) => void) | null = null;
  public onunmute: ((this: MediaStreamTrack, ev: Event) => void) | null = null;

  public stop(): void {
    this.readyState = 'ended';
    if (this.onended) {
      this.onended.call(this, new Event('ended'));
    }
  }

  public clone(): MediaStreamTrack {
    return new MockMediaStreamTrack();
  }

  public applyConstraints(): Promise<void> {
    return Promise.resolve();
  }

  public getCapabilities(): MediaTrackCapabilities {
    return {};
  }

  public getConstraints(): MediaTrackConstraints {
    return {};
  }

  public getSettings(): MediaTrackSettings {
    return { width: 1920, height: 1080, frameRate: 30 };
  }

  public addEventListener(): void {}
  public removeEventListener(): void {}
  public dispatchEvent(): boolean {
    return true;
  }
}

export class MockMediaStream implements MediaStream {
  public active = true;
  public id = 'mock-stream-id';
  private tracks: MediaStreamTrack[] = [new MockMediaStreamTrack()];
  public onaddtrack: ((this: MediaStream, ev: MediaStreamTrackEvent) => void) | null = null;
  public onremovetrack: ((this: MediaStream, ev: MediaStreamTrackEvent) => void) | null = null;

  public getAudioTracks(): MediaStreamTrack[] {
    return [];
  }

  public getVideoTracks(): MediaStreamTrack[] {
    return this.tracks.filter((t) => t.kind === 'video');
  }

  public getTracks(): MediaStreamTrack[] {
    return [...this.tracks];
  }

  public getTrackById(id: string): MediaStreamTrack | null {
    return this.tracks.find((t) => t.id === id) ?? null;
  }

  public addTrack(track: MediaStreamTrack): void {
    this.tracks.push(track);
  }

  public removeTrack(track: MediaStreamTrack): void {
    this.tracks = this.tracks.filter((t) => t !== track);
  }

  public clone(): MediaStream {
    return new MockMediaStream();
  }

  public addEventListener(): void {}
  public removeEventListener(): void {}
  public dispatchEvent(): boolean {
    return true;
  }
}

export class MockMediaDevices {
  private shouldFail = false;
  private failureError: Error = new Error('Permission denied');

  public setShouldFail(fail: boolean, error?: Error): void {
    this.shouldFail = fail;
    if (error) this.failureError = error;
  }

  public async getUserMedia(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    if (this.shouldFail) {
      throw this.failureError;
    }
    if (!constraints || (!constraints.video && !constraints.audio)) {
      throw new TypeError('At least video or audio must be requested');
    }
    return new MockMediaStream();
  }
}

// ---------------------------------------------------------------------------
// Geolocation Mock
// ---------------------------------------------------------------------------

export class MockGeolocation {
  private latitude = 37.7749;
  private longitude = -122.4194;
  private accuracy = 10;
  private shouldFail = false;
  private errorCode = 1; // PERMISSION_DENIED

  public setLocation(latitude: number, longitude: number, accuracy = 10): void {
    this.latitude = latitude;
    this.longitude = longitude;
    this.accuracy = accuracy;
    this.shouldFail = false;
  }

  public setError(code: 1 | 2 | 3): void {
    this.shouldFail = true;
    this.errorCode = code;
  }

  public getCurrentPosition(
    success: PositionCallback,
    error?: PositionErrorCallback | null,
    _options?: PositionOptions
  ): void {
    if (this.shouldFail) {
      if (error) {
        error({
          code: this.errorCode,
          message: 'Geolocation error',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError);
      }
      return;
    }

    const pos: GeolocationPosition = {
      coords: {
        latitude: this.latitude,
        longitude: this.longitude,
        accuracy: this.accuracy,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({
          latitude: this.latitude,
          longitude: this.longitude,
          accuracy: this.accuracy,
        }),
      },
      timestamp: Date.now(),
      toJSON: () => ({ timestamp: Date.now() }),
    };
    success(pos);
  }

  public watchPosition(
    success: PositionCallback,
    error?: PositionErrorCallback | null,
    options?: PositionOptions
  ): number {
    this.getCurrentPosition(success, error, options);
    return 1;
  }

  public clearWatch(_watchId: number): void {}
}
