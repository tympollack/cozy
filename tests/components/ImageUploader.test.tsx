import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  ImageUploader,
  isCloudSyncError,
  probeCloudFile,
  CLOUD_SYNC_ERROR_MESSAGE,
} from '@/components/ImageUploader';
import CameraPage from '@/app/camera/page';
import * as offlineStore from '@/lib/offlinePhotoStore';
import * as imageUtils from '@/lib/imageUtils';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/app/actions/postActions', () => ({
  uploadPost: vi.fn(),
}));

describe('ImageUploader & Cloud Sync Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isCloudSyncError', () => {
    it('detects DOMException NotReadableError and AbortError', () => {
      const notReadable = new DOMException('The requested file could not be read', 'NotReadableError');
      const abortErr = new DOMException('The operation was aborted', 'AbortError');
      expect(isCloudSyncError(notReadable)).toBe(true);
      expect(isCloudSyncError(abortErr)).toBe(true);
    });

    it('detects Windows OneDrive 0x80070185 error codes and strings', () => {
      const oneDriveErr = new Error('Error 0x80070185: The cloud operation was unsuccessful.');
      expect(isCloudSyncError(oneDriveErr)).toBe(true);
      expect(isCloudSyncError('0x80070185')).toBe(true);
      expect(isCloudSyncError({ code: '0x80070185', message: 'cloud error' })).toBe(true);
    });

    it('detects macOS iCloud cloud-only placeholder errors', () => {
      const iCloudErr = new Error('File is cloud-only and cannot be read');
      expect(isCloudSyncError(iCloudErr)).toBe(true);
      expect(isCloudSyncError('iCloud file syncing')).toBe(true);
    });

    it('returns false for generic / unrelated errors', () => {
      expect(isCloudSyncError(new Error('Invalid image dimension'))).toBe(false);
      expect(isCloudSyncError(null)).toBe(false);
      expect(isCloudSyncError(undefined)).toBe(false);
    });
  });

  describe('probeCloudFile', () => {
    it('resolves successfully when file bytes can be read', async () => {
      const testFile = new File(['fake-image-bytes'], 'photo.jpg', { type: 'image/jpeg' });
      await expect(probeCloudFile(testFile)).resolves.toBeUndefined();
    });

    it('throws with cloud error context when slice/arrayBuffer fails with NotReadableError', async () => {
      const mockCloudFile = new File([''], 'placeholder.jpg', { type: 'image/jpeg' });
      vi.spyOn(mockCloudFile, 'slice').mockImplementation(() => {
        return {
          arrayBuffer: () => Promise.reject(new DOMException('The cloud operation was unsuccessful', 'NotReadableError')),
        } as unknown as Blob;
      });

      await expect(probeCloudFile(mockCloudFile)).rejects.toThrow(CLOUD_SYNC_ERROR_MESSAGE);
    });
  });

  describe('ImageUploader Component', () => {
    it('renders with custom label and trigger button', () => {
      render(<ImageUploader label="Choose Cozy Photo" />);
      expect(screen.getByText('Choose Cozy Photo')).toBeInTheDocument();
      expect(screen.getByTestId('image-uploader-input')).toBeInTheDocument();
    });

    it('handles cloud-only file selection by displaying toast and resetting input value', async () => {
      const onCloudSyncErrorMock = vi.fn();
      render(<ImageUploader onCloudSyncError={onCloudSyncErrorMock} />);

      const input = screen.getByTestId('image-uploader-input') as HTMLInputElement;

      // Create a mock unhydrated file whose arrayBuffer fails with 0x80070185
      const cloudFile = new File([''], 'onedrive-cloud.jpg', { type: 'image/jpeg' });
      vi.spyOn(cloudFile, 'slice').mockImplementation(() => {
        return {
          arrayBuffer: () => Promise.reject(new Error('0x80070185: The cloud operation was unsuccessful')),
        } as unknown as Blob;
      });

      fireEvent.change(input, { target: { files: [cloudFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('cloud-sync-toast')).toBeInTheDocument();
      });

      expect(screen.getByText(CLOUD_SYNC_ERROR_MESSAGE)).toBeInTheDocument();
      expect(onCloudSyncErrorMock).toHaveBeenCalledWith(CLOUD_SYNC_ERROR_MESSAGE);
      expect(input.value).toBe('');
    });
  });

  describe('CameraPage Cloud Sync Error Integration', () => {
    it('displays cloud sync toast and resets slot when unhydrated cloud file is selected', async () => {
      vi.spyOn(offlineStore, 'useOfflineSync').mockReturnValue({
        isOnline: true,
        queuedCount: 0,
        isSyncing: false,
        lastSyncResult: null,
        refreshCount: vi.fn(),
        syncNow: vi.fn(),
      });

      render(<CameraPage />);

      const galleryInput = document.getElementById('gallery-input-light') as HTMLInputElement;
      expect(galleryInput).toBeInTheDocument();

      // Cloud file that fails probing
      const unhydratedFile = new File([''], 'icloud-stream.jpg', { type: 'image/jpeg' });
      vi.spyOn(unhydratedFile, 'slice').mockImplementation(() => {
        return {
          arrayBuffer: () => Promise.reject(new DOMException('File could not be read', 'NotReadableError')),
        } as unknown as Blob;
      });

      fireEvent.change(galleryInput, { target: { files: [unhydratedFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('cloud-sync-toast')).toBeInTheDocument();
      });

      expect(screen.getByText(CLOUD_SYNC_ERROR_MESSAGE)).toBeInTheDocument();

      // Ensure form did not freeze in processing or uploading state
      const submitButton = screen.getByRole('button', { name: /Share my space/i });
      expect(submitButton).toBeDisabled(); // Disabled because no valid photo is ready, NOT stuck processing
      expect(screen.queryByText(/Scrubbing EXIF & compressing/i)).not.toBeInTheDocument();
    });

    it('preserves existing valid photo in slot if replacement file throws cloud error', async () => {
      vi.spyOn(offlineStore, 'useOfflineSync').mockReturnValue({
        isOnline: true,
        queuedCount: 0,
        isSyncing: false,
        lastSyncResult: null,
        refreshCount: vi.fn(),
        syncNow: vi.fn(),
      });

      render(<CameraPage />);
      const galleryInput = document.getElementById('gallery-input-light') as HTMLInputElement;

      // 1. Select a valid photo first
      const validFile = new File(['valid-image'], 'cozy-room.jpg', { type: 'image/jpeg' });
      fireEvent.change(galleryInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('camera-preview-light')).toBeInTheDocument();
      });

      // 2. Try to replace it with an unhydrated cloud file
      const cloudFile = new File([''], 'cloud-fail.jpg', { type: 'image/jpeg' });
      vi.spyOn(cloudFile, 'slice').mockImplementation(() => {
        return {
          arrayBuffer: () => Promise.reject(new DOMException('The cloud operation was unsuccessful', 'NotReadableError')),
        } as unknown as Blob;
      });

      fireEvent.change(galleryInput, { target: { files: [cloudFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('cloud-sync-toast')).toBeInTheDocument();
      });

      // Valid preview remains visible and was not wiped out
      expect(screen.getByTestId('camera-preview-light')).toBeInTheDocument();
    });

    it('restores empty slot and keeps share button disabled if cloud error occurs during processing on initial selection', async () => {
      vi.spyOn(offlineStore, 'useOfflineSync').mockReturnValue({
        isOnline: true,
        queuedCount: 0,
        isSyncing: false,
        lastSyncResult: null,
        refreshCount: vi.fn(),
        syncNow: vi.fn(),
      });

      render(<CameraPage />);
      const galleryInput = document.getElementById('gallery-input-light') as HTMLInputElement;

      const cloudFile = new File(['mock-bytes'], 'cloud-fail.jpg', { type: 'image/jpeg' });
      // Probe succeeds, but background image processing throws cloud sync error
      const imageUtils = await import('@/lib/imageUtils');
      vi.spyOn(imageUtils, 'processImageFile').mockRejectedValueOnce(
        new DOMException('The cloud operation was unsuccessful', 'NotReadableError')
      );

      fireEvent.change(galleryInput, { target: { files: [cloudFile] } });

      await waitFor(() => {
        expect(screen.getByTestId('cloud-sync-toast')).toBeInTheDocument();
      });

      // Submit button remains disabled because slot was restored to empty
      const submitButton = screen.getByRole('button', { name: /Share my space/i });
      expect(submitButton).toBeDisabled();
    });

    it('does not allow an older slow or failing file selection to roll back a newer valid selection', async () => {
      vi.spyOn(offlineStore, 'useOfflineSync').mockReturnValue({
        isOnline: true,
        queuedCount: 0,
        isSyncing: false,
        lastSyncResult: null,
        refreshCount: vi.fn(),
        syncNow: vi.fn(),
      });

      render(<CameraPage />);
      const galleryInput = document.getElementById('gallery-input-light') as HTMLInputElement;

      let rejectSlowFile!: (reason?: any) => void;
      let onSlowProcessingStarted!: () => void;
      const slowProcessingStarted = new Promise<void>((resolve) => {
        onSlowProcessingStarted = resolve;
      });
      const slowProcessingPromise = new Promise<File>((_, reject) => {
        rejectSlowFile = reject;
      });

      const imageUtils = await import('@/lib/imageUtils');
      vi.spyOn(imageUtils, 'processImageFile').mockImplementation(async (file: File) => {
        if (file.name === 'slow-fail.jpg') {
          onSlowProcessingStarted();
          return slowProcessingPromise;
        }
        return file;
      });

      const slowFile = new File(['slow-bytes'], 'slow-fail.jpg', { type: 'image/jpeg' });
      const fastValidFile = new File(['fast-bytes'], 'fast-valid.jpg', { type: 'image/jpeg' });

      // 1. User initiates slow file selection
      fireEvent.change(galleryInput, { target: { files: [slowFile] } });

      // Wait until slow file has entered background processing
      await slowProcessingStarted;

      // 2. While slow file is processing, user selects a second, valid file
      fireEvent.change(galleryInput, { target: { files: [fastValidFile] } });

      // Fast file resolves and preview appears
      await waitFor(() => {
        expect(screen.getByTestId('camera-preview-light')).toBeInTheDocument();
      });

      // 3. The older slow selection now fails
      rejectSlowFile(new DOMException('The cloud operation was unsuccessful', 'NotReadableError'));

      // Allow event loop to process rejection
      await new Promise((r) => setTimeout(r, 50));

      // The newer valid photo must NOT be rolled back or discarded!
      expect(screen.getByTestId('camera-preview-light')).toBeInTheDocument();
      const submitButton = screen.getByRole('button', { name: /Share my space/i });
      expect(submitButton).not.toBeDisabled();
    });
  });
});
