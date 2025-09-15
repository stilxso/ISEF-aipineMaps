import apiClient from './apiClient';



export async function sendAiChat({ messages, routeIds = [], extra = {} }) {
  const res = await apiClient.post('/ml/prompt', { messages, routeIds, extra }, { timeout: 30000 });
  return res?.data;
}

