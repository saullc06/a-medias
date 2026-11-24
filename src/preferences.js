'use strict';
const supportedLanguages = ['es','en','fr'];
const languagePicker = document.getElementById('language');
const themePicker = document.getElementById('theme');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
function preference(key, value) {
  try {
    if (value === undefined) return localStorage.getItem('a-medias.' + key);
    localStorage.setItem('a-medias.' + key,value);
  } catch { /* Preference still applies to this page when storage is unavailable. */ }
}
const browserLanguage = (navigator.languages || [navigator.language]).map(code => code.split('-')[0]).find(code => supportedLanguages.includes(code));
const storedLanguage = preference('language');
let language = supportedLanguages.includes(storedLanguage) ? storedLanguage : browserLanguage || 'es';
function tr(source) {
  if (language === 'es') return source;
  return translations[source]?.[language === 'en' ? 0 : 1] ?? source;
}
// Only bind the original interface. Names, uploaded text and typed amounts stay untouched.
const bindings = [];
const walker = document.createTreeWalker(document.documentElement,NodeFilter.SHOW_TEXT);
while (walker.nextNode()) {
  const text = walker.currentNode;
  const key = text.data.trim();
  if (Object.hasOwn(translations,key)) {
    const original = text.data;
    bindings.push(() => {text.data = original.replace(key,() => tr(key));});
  }
}
for (const element of document.querySelectorAll('[placeholder],[alt],[aria-label],meta[name="description"]')) {
  for (const attr of ['placeholder','alt','aria-label','content']) {
    const key = element.getAttribute(attr);
    if (key && Object.hasOwn(translations,key)) bindings.push(() => element.setAttribute(attr,tr(key)));
  }
}
const menu = document.getElementById('language-menu');
const choices = Array.from(menu.querySelectorAll('[data-language]'));
let chosenTheme = preference('theme');
function applyTheme() {
  const dark = chosenTheme === 'dark' || (chosenTheme !== 'light' && systemTheme.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  themePicker.title = tr(dark ? 'Activar modo claro' : 'Activar modo oscuro');
  themePicker.setAttribute('aria-label',themePicker.title);
}
function applyLanguage() {
  document.documentElement.lang = language;
  for (const apply of bindings) apply();
  for (const option of choices) {
    const active = option.dataset.language === language;
    option.setAttribute('aria-checked',String(active));
    if (active) {
      const name = option.firstElementChild.textContent;
      document.getElementById('active-language').textContent = name;
      languagePicker.setAttribute('aria-label',tr('Idioma') + ': ' + name);
    }
  }
  applyTheme();
}
function openMenu() {
  menu.hidden = false;
  languagePicker.setAttribute('aria-expanded','true');
  choices.find(option => option.dataset.language === language).focus();
}
function closeMenu(restoreFocus = false) {
  menu.hidden = true;
  languagePicker.setAttribute('aria-expanded','false');
  if (restoreFocus) languagePicker.focus();
}
languagePicker.onclick = () => menu.hidden ? openMenu() : closeMenu(true);
languagePicker.onkeydown = event => {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openMenu(); }
};
for (const option of choices) option.onclick = () => {
  language = option.dataset.language;
  preference('language',language);
  applyLanguage();
  closeMenu(true);
  if (typeof updateAppLanguage === 'function') updateAppLanguage();
};
menu.onkeydown = event => {
  const index = choices.indexOf(document.activeElement);
  const next = {ArrowDown:(index + 1) % choices.length, ArrowUp:(index + choices.length - 1) % choices.length, Home:0, End:choices.length-1};
  if (Object.hasOwn(next,event.key)) { event.preventDefault(); choices[next[event.key]].focus(); }
  if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); }
};
const control = languagePicker.parentElement;
document.addEventListener('pointerdown',event => { if (!menu.hidden && !control.contains(event.target)) closeMenu(); });
control.addEventListener('focusout',event => { if (!control.contains(event.relatedTarget)) closeMenu(); });
themePicker.onclick = () => {
  chosenTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  preference('theme',chosenTheme);
  applyTheme();
};
systemTheme.addEventListener('change',applyTheme);
applyLanguage();
