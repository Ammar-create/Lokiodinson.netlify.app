/* CaptionHub — configuration
   Static, client-side. No server, no build step. */
window.CH = window.CH || {};

CH.CONFIG = {
  API_BASE: 'https://api.opensubtitles.com/api/v1',
  USER_AGENT: 'CaptionHub v1.0',

  /* Free API key: https://opensubtitles.com/consumers/new
     Paste it here, or set it in the in-app Settings (stored locally). */
  DEFAULT_API_KEY: '',

  STORAGE_KEY: 'captionhub.settings.v1',
  TOKEN_KEY: 'captionhub.token.v1',
  RESULTS_PER_PAGE: 20,
  MAX_PAGES: 100,

  /* Popular languages surfaced as quick chips */
  POPULAR_LANGS: ['en', 'es', 'fr', 'de', 'it', 'pt', 'pt-br', 'ar', 'hi', 'tr', 'ja', 'zh'],

  /* Full selectable set (OpenSubtitles language codes) */
  LANGUAGES: [
    ['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['de', 'Deutsch'],
    ['it', 'Italiano'], ['pt', 'Português'], ['pt-br', 'Português (Brasil)'],
    ['ar', 'العربية'], ['hi', 'हिन्दी'], ['zh', '中文'], ['ja', '日本語'],
    ['ko', '한국어'], ['ru', 'Русский'], ['tr', 'Türkçe'], ['nl', 'Nederlands'],
    ['pl', 'Polski'], ['sv', 'Svenska'], ['da', 'Dansk'], ['no', 'Norsk'],
    ['fi', 'Suomi'], ['el', 'Ελληνικά'], ['he', 'עברית'], ['id', 'Bahasa Indonesia'],
    ['ms', 'Bahasa Melayu'], ['th', 'ไทย'], ['vi', 'Tiếng Việt'],
    ['uk', 'Українська'], ['cs', 'Čeština'], ['hu', 'Magyar'], ['ro', 'Română'],
    ['bg', 'Български'], ['hr', 'Hrvatski'], ['sk', 'Slovenčina'], ['sl', 'Slovenščina'],
    ['sr', 'Српски'], ['fa', 'فارسی'], ['ur', 'اردو'], ['bn', 'বাংলা'],
    ['ta', 'தமிழ்'], ['te', 'తెలుగు'], ['ca', 'Català'], ['eu', 'Euskara'],
    ['gl', 'Galego'], ['lt', 'Lietuvių'], ['lv', 'Latviešu'], ['et', 'Eesti'],
    ['is', 'Íslenska'], ['mk', 'Македонски'], ['sq', 'Shqip'], ['az', 'Azərbaycan'],
    ['be', 'Беларуская'], ['ka', 'ქართული'], ['hy', 'Հայերեն'], ['mt', 'Malti'],
    ['si', 'සිංහල'], ['tl', 'Filipino'], ['mn', 'Монгол'], ['ne', 'नेपाली'],
    ['sw', 'Kiswahili'], ['af', 'Afrikaans'], ['bs', 'Bosanski'], ['eo', 'Esperanto']
  ],

  ORDER_OPTIONS: [
    ['download_count', 'Most downloaded'],
    ['ratings', 'Best rated'],
    ['new_download_count', 'Trending'],
    ['upload_date', 'Recently uploaded'],
    ['release', 'Release name']
  ]
};

CH.langName = function (code) {
  const found = CH.CONFIG.LANGUAGES.find(function (l) { return l[0] === code; });
  return found ? found[1] : code;
};
