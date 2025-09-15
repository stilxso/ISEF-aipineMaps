import apiClient from './apiClient';
import { ENDPOINTS } from '../config/api';

export const updateUserPreparation = async (preparationData) => {
  try {
    const response = await apiClient.put(
      ENDPOINTS.USER.UPDATE_PREPARATION,
      preparationData
    );
    return response.data;
  } catch (error) {
    console.error('Error updating user preparation:', error);
    throw error;
  }
};

export const getUserProfile = async () => {
  try {
    const response = await apiClient.get(ENDPOINTS.USER.PROFILE);
    return response.data;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

