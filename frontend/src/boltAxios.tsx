/**
 * Kei Imada
 * 20200107
 * Bolt's axios instance
 */

import {AxiosResponse, AxiosError} from 'axios';

const axios = require('axios').default.create({
  headers: {
    'Access-Control-Allow-Origin':
      process.env.NODE_ENV === 'production' ? 'null' : '*',
  },
  baseURL:
    process.env.NODE_ENV === 'production' ? '/' : 'http://127.0.0.1:5000/',
  timeout: 5000,
});

const refreshTokenUrl = 'auth/refresh';
const refreshLogoutUrl = 'auth/logout/2';

function TokenManager() {
  let token = localStorage.getItem('token');
  let refreshToken_ = localStorage.getItem('refreshToken');
  let rememberMe = false;
  function getToken() {
    return token;
  }
  function setToken(t: string) {
    token = t;
    if (rememberMe) {
      localStorage.setItem('token', t);
    }
  }
  function getRefreshToken() {
    return refreshToken_;
  }
  function setRefreshToken(t: string) {
    refreshToken_ = t;
    if (rememberMe) {
      localStorage.setItem('refreshToken', t);
    }
  }
  function clearTokens() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    token = null;
    refreshToken_ = null;
  }
  function getRememberMe() {
    return rememberMe;
  }
  function setRememberMe(r: boolean) {
    rememberMe = r;
  }
  function refreshToken() {
    if (!refreshToken_) {
      return Promise.reject();
    }
    return axios.post(refreshTokenUrl);
  }
  return {
    getToken: getToken,
    setToken: setToken,
    getRefreshToken: getRefreshToken,
    setRefreshToken: setRefreshToken,
    clearTokens: clearTokens,
    refreshToken: refreshToken,
    getRememberMe: getRememberMe,
    setRememberMe: setRememberMe,
  };
}

export const tokenManager = TokenManager();

axios.interceptors.request.use((request: any) => {
  let token = null;
  if (request.url === refreshTokenUrl || request.url === refreshLogoutUrl) {
    token = tokenManager.getRefreshToken();
  } else {
    token = tokenManager.getToken();
  }
  if (token) {
    request.headers.Authorization = `Bearer ${token}`;
  }
  console.log('Starting Request', request);
  return request;
});

export function createAxiosResponseInterceptor(logout: () => void) {
  const interceptor = axios.interceptors.response.use(
    (response: AxiosResponse) => {
      if (response.data.token) {
        // update token
        tokenManager.setToken(response.data.token);
      }
      if (response.data.refreshToken) {
        // update refresh token
        tokenManager.setRefreshToken(response.data.refreshToken);
      }
      console.log('Response:', response);
      return response;
    },
    (error: AxiosError) => {
      console.log('Error:', error.response);
      if (error.response && error.response.status !== 401) {
        // if not unauthorized (not refresh) reject with same error
        return Promise.reject(error);
      }
      // refresh token
      // eject interceptor to stop looping if refresh is 401
      axios.interceptors.response.eject(interceptor);
      console.log('token expired, refreshing...');
      return tokenManager
        .refreshToken()
        .then((response: AxiosResponse) => {
          // make the original request with refreshed token
          if (response.data.token) {
            // update token
            tokenManager.setToken(response.data.token);
            console.log('refresh token successful');
          }
          return axios(error.response!.config);
        })
        .catch((error: AxiosError) => {
          // failed to refresh, logging out
          console.log('token refresh failed, logging out...');
          tokenManager.clearTokens();
          console.log(logout);
          logout();
          return Promise.reject(error);
        })
        .finally(createAxiosResponseInterceptor);
    },
  );
}

export default axios;
