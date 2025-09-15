import apiClient from './apiClient';
import { CONFIG } from '../config/env';

const API_BASE = `${CONFIG.GPX_API_BASE}`.replace(/\/$/, '');

// Create a helper that uses centralized apiClient with base URL prefixing
function buildUrl(path) {
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}


export async function getGpxList() {
  try {
    const response = await apiClient.get(buildUrl('/download/list'));
    return response.data.files || [];
  } catch (error) {
    console.warn('Failed to fetch GPX list:', error.message);
    return [];
  }
}


export async function downloadGpx(filename) {
  try {
    const response = await apiClient.get(buildUrl(`/download/download/${filename}`), {
      responseType: 'text',
    });
    return response.data;
  } catch (error) {
    console.warn('Failed to download GPX:', error.message);
    throw error;
  }
}


export async function uploadGpx(fileUri, filename) {
  try {
    const formData = new FormData();
    formData.append('gpxFile', {
      uri: fileUri,
      name: filename,
      type: 'application/gpx+xml',
    });

    const response = await apiClient.post(buildUrl('/upload/upload'), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    console.warn('Failed to upload GPX:', error.message);
    throw error;
  }
}