/* CaptionHub — OpenSubtitles API client
   Docs: https://opensubtitles.stoplight.io/docs/opensubtitles-api */
window.CH = window.CH || {};

CH.ApiError = function (status, message, raw) {
  this.name = 'ApiError';
  this.status = status;
  this.message = message || ('Request failed (' + status + ')');
  this.raw = raw || null;
};
CH.ApiError.prototype = Object.create(Error.prototype);
CH.ApiError.prototype.constructor = CH.ApiError;

CH.API = (function () {
  'use strict';
  var BASE = CH.CONFIG.API_BASE;
  var UA = CH.CONFIG.USER_AGENT;

  function apiKey() {
    var s = CH.Settings.get();
    return (s.apiKey || '').trim() || CH.CONFIG.DEFAULT_API_KEY;
  }

  function baseHeaders(extra) {
    var h = {
      'Api-Key': apiKey(),
      'X-User-Agent': UA,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }

  function queryString(params) {
    var parts = [];
    var keys = Object.keys(params).sort(); // alphabetical — OpenSubtitles canonicalizes otherwise (301 redirect)
    keys.forEach(function (k) {
      var v = params[k];
      if (v === undefined || v === null || v === '') return;
      if (Array.isArray(v)) v = v.join(',');
      parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
    });
    return parts.length ? '?' + parts.join('&') : '';
  }

  async function request(path, options) {
    var resp;
    try {
      resp = await fetch(BASE + path, options);
    } catch (e) {
      throw new CH.ApiError(0, 'Network error — check your connection and try again.');
    }

    var body = null;
    try { body = await resp.json(); } catch (e) { /* non-JSON */ }

    if (!resp.ok) {
      var msg = body && body.message ? body.message : ('Request failed (' + resp.status + ')');
      throw new CH.ApiError(resp.status, msg, body);
    }
    return body;
  }

  /* GET /subtitles — the search endpoint */
  function search(params) {
    return request('/subtitles' + queryString(params), {
      method: 'GET',
      headers: baseHeaders()
    });
  }

  /* POST /login — returns { token, user } */
  function login(username, password) {
    return request('/login', {
      method: 'POST',
      headers: baseHeaders(),
      body: JSON.stringify({ username: username, password: password })
    });
  }

  /* POST /download — returns { link, file_name, requests, remaining } */
  function download(fileId, token) {
    return request('/download', {
      method: 'POST',
      headers: baseHeaders({ 'Authorization': 'Bearer ' + token }),
      body: JSON.stringify({ file_id: fileId })
    });
  }

  return {
    apiKey: apiKey,
    search: search,
    login: login,
    download: download
  };
})();
