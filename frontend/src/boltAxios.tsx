/**
 * Kei Imada
 * 20200107
 * Bolt's axios instance
 */

const axios = require('axios').default.create({
  baseURL: 'http://127.0.0.1:5000/',
  timeout: 5000,
});

axios.interceptors.request.use((request: any) => {
  console.log('Starting Request', request);
  return request;
});

axios.interceptors.response.use((response: any) => {
  console.log('Response:', response);
  return response;
});

export default axios;
