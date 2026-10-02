import {derived} from 'svelte/store';
import writablePersistentStore from '../p4/persistent-store';
import englishMessages from '!../build/unstructure-translations-loader!./en.json';
import localeNames from './locale-names.json';

const allMessages = {
  en: () => englishMessages,
  // Generated code:
  /*===*/
  "ca": () => require("./ca.json"),
  "cs": () => require("./cs.json"),
  "de": () => require("./de.json"),
  "es": () => require("./es.json"),
  "fi": () => require("./fi.json"),
  "fr": () => require("./fr.json"),
  "hu": () => require("./hu.json"),
  "it": () => require("./it.json"),
  "ja": () => require("./ja.json"),
  "ko": () => require("./ko.json"),
  "lt": () => require("./lt.json"),
  "nb": () => require("./nb.json"),
  "nl": () => require("./nl.json"),
  "pl": () => require("./pl.json"),
  "pt": () => require("./pt.json"),
  "pt-br": () => require("./pt-br.json"),
  "ru": () => require("./ru.json"),
  "sl": () => require("./sl.json"),
  "sv": () => require("./sv.json"),
  "tr": () => require("./tr.json"),
  "uk": () => require("./uk.json"),
  "zh-cn": () => require("./zh-cn.json"),
  "zh-tw": () => require("./zh-tw.json"),
  /*===*/
};

// Browser language tags that don't map 1:1 onto a catalogue we ship.
const LANGUAGE_ALIASES = {
  // Chinese browsers report a wide range of region/script tags; collapse them onto our two files.
  zh: 'zh-cn',
  'zh-hans': 'zh-cn',
  'zh-sg': 'zh-cn',
  'zh-my': 'zh-cn',
  'zh-hant': 'zh-tw',
  'zh-hk': 'zh-tw',
  'zh-mo': 'zh-tw',
  // The Bokmål catalogue also serves Nynorsk and the legacy "no" tag.
  no: 'nb',
  nn: 'nb'
};

// Map a single browser language tag onto a catalogue we ship, or null.
const findSupportedLocale = (language) => {
  const tag = language.toLowerCase();
  if (allMessages[tag]) {
    return tag;
  }
  if (LANGUAGE_ALIASES[tag]) {
    return LANGUAGE_ALIASES[tag];
  }
  const base = tag.split('-')[0];
  if (allMessages[base]) {
    return base;
  }
  if (LANGUAGE_ALIASES[base]) {
    return LANGUAGE_ALIASES[base];
  }
  // We may not ship a bare "xx" but we could ship a regional variant such as "pt-br".
  return Object.keys(allMessages).find((locale) => locale.startsWith(base + "-")) || null;
};

// Walk the browser's language preference list and take the first one we can serve.
const getInitialLocale = () => {
  if (typeof navigator === 'undefined') {
    return 'en';
  }
  const languages = navigator.languages && navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];
  for (const language of languages) {
    if (language) {
      const supported = findSupportedLocale(language);
      if (supported) {
        return supported;
      }
    }
  }
  return 'en';
};

const locale = writablePersistentStore('P4.locale', getInitialLocale());
locale.subscribe((lang) => {
  if (!allMessages[lang]) {
    locale.set('en');
  }
  document.documentElement.lang = lang;
});

const getProperty = (obj, id) => {
  const parts = id.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    obj = obj[parts[i]];
    if (!obj) {
      return null;
    }
  }
  return obj[parts[parts.length - 1]] || null;
};

const translate = derived(locale, (locale) => {
  const localMessages = allMessages[locale]();
  /**
   * @param {string} id Message ID
   * @returns {string} Translated message
   */
  const translateMessage = (id) => {
    return getProperty(localMessages, id) || getProperty(englishMessages, id) || id;
  };
  translate.translate = translateMessage;
  return translateMessage;
});

export {
  locale,
  localeNames,
  translate as _
};
