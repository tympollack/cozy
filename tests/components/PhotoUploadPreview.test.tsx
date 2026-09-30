import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhotoUploadPreview } from '@/components/PhotoUploadPreview';
import { CAMERA_WARMTH_FILTERS } from '@/lib/cameraFilters';

describe('PhotoUploadPreview Component', () => {
  it('renders preview img directly when previewUrl is provided', () => {
    const mockFile = new File(['test-bytes'], 'space.jpg', { type: 'image/jpeg' });
    render(
      <PhotoUploadPreview
        file={mockFile}
        previewUrl="blob:http://localhost:3000/converted-image-123"
        mode="light"
        filter="natural"
      />
    );

    const img = screen.getByTestId('camera-preview-light');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'blob:http://localhost:3000/converted-image-123');
    expect(img).toHaveStyle({ filter: 'none' });
    expect(screen.queryByTestId('preview-fallback-placeholder')).not.toBeInTheDocument();
  });

  it('wires live Ambient Warmth Filters correctly', () => {
    const mockFile = new File(['test-bytes'], 'golden.jpg', { type: 'image/jpeg' });

    // 1. Golden Hour
    const { rerender } = render(
      <PhotoUploadPreview
        file={mockFile}
        previewUrl="blob:http://localhost:3000/golden"
        mode="light"
        filter="golden_hour"
      />
    );

    let img = screen.getByTestId('camera-preview-light');
    expect(img).toHaveStyle({ filter: 'sepia(0.25) saturate(1.2) contrast(1.05)' });

    // 2. Candlelight
    rerender(
      <PhotoUploadPreview
        file={mockFile}
        previewUrl="blob:http://localhost:3000/candlelight"
        mode="dark"
        filter="candlelight"
      />
    );

    img = screen.getByTestId('camera-preview-dark');
    expect(img).toHaveStyle({ filter: 'sepia(0.4) saturate(1.3) brightness(0.95)' });

    // 3. Natural
    rerender(
      <PhotoUploadPreview
        file={mockFile}
        previewUrl="blob:http://localhost:3000/natural"
        mode="light"
        filter="natural"
      />
    );

    img = screen.getByTestId('camera-preview-light');
    expect(img).toHaveStyle({ filter: 'none' });
  });

  it('renders converted JPG URL directly instead of fallback placeholder once conversion arrives', () => {
    const unconvertedFile = new File(['raw-heic-bytes'], 'photo.heic', { type: 'image/heic' });
    const { rerender } = render(
      <PhotoUploadPreview
        file={unconvertedFile}
        previewUrl="blob:http://localhost:3000/raw-heic"
        mode="light"
        filter="golden_hour"
        imgError={true} // Simulates native decoding failure for raw HEIC
      />
    );

    // Prior to conversion completion, fallback placeholder is visible
    expect(screen.getByTestId('preview-fallback-placeholder')).toBeInTheDocument();
    const rawImg = screen.getByTestId('camera-preview-light');
    expect(rawImg).toHaveClass('opacity-0');

    // WASM conversion finishes and delivers converted JPG URL
    const convertedJpgFile = new File(['jpg-bytes'], 'photo.jpg', { type: 'image/jpeg' });
    rerender(
      <PhotoUploadPreview
        file={convertedJpgFile}
        previewUrl="blob:http://localhost:3000/converted.jpg"
        mode="light"
        filter="golden_hour"
        imgError={false} // Error cleared upon converted JPG arrival
      />
    );

    // Converted JPG renders directly with opacity-100, placeholder removed
    expect(screen.queryByTestId('preview-fallback-placeholder')).not.toBeInTheDocument();
    const convertedImg = screen.getByTestId('camera-preview-light');
    expect(convertedImg).toHaveClass('opacity-100');
    expect(convertedImg).toHaveAttribute('src', 'blob:http://localhost:3000/converted.jpg');
    expect(convertedImg).toHaveStyle({ filter: 'sepia(0.25) saturate(1.2) contrast(1.05)' });
  });

  it('handles retake, gallery, and clear actions', () => {
    const onClearMock = vi.fn();
    const onRetakeMock = vi.fn();
    const onGalleryMock = vi.fn();

    render(
      <PhotoUploadPreview
        file={new File([''], 'test.jpg')}
        previewUrl="blob:test"
        mode="light"
        onClear={onClearMock}
        onRetake={onRetakeMock}
        onGallery={onGalleryMock}
      />
    );

    const clearBtn = screen.getByRole('button', { name: /Remove photo/i });
    fireEvent.click(clearBtn);
    expect(onClearMock).toHaveBeenCalled();

    const retakeBtn = screen.getByText(/Retake/i);
    fireEvent.click(retakeBtn);
    expect(onRetakeMock).toHaveBeenCalled();

    const galleryBtn = screen.getByText(/Gallery/i);
    fireEvent.click(galleryBtn);
    expect(onGalleryMock).toHaveBeenCalled();
  });
});
