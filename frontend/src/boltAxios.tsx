/**
 * Kei Imada
 * 20200107
 * Bolt's axios instance
 */

import {AxiosResponse, AxiosError} from 'axios';

const axios = require('axios').default.create({
  baseURL: 'http://127.0.0.1:5000/',
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
      return new Promise((resolve, reject) => {
        reject();
      });
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

axios.interceptors.response.use(
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
    if (error.response && error.response.status !== 401) {
      // if not unauthorized (not refresh) reject with same error
      return new Promise((resolve, reject) => {
        reject(error);
      });
    }
    if (error.config.url && error.config.url.includes(refreshTokenUrl)) {
      // if refresh failed, then just reject
      console.log('refresh failed')
      return Promise.reject(error);
    }
    // refresh token
    console.log('token expired, refreshing...');
    return tokenManager
      .refreshToken()
      .then((response: AxiosResponse) => {
        // make the original request with refreshed token
        return axios.request(error.config);
      })
      .catch((error: AxiosError) => {
        Promise.reject(error);
      });
  },
);

export default axios;
