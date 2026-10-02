import {writable} from 'svelte/store';

export const error = writable(null);

export const progress = writable({
  progress: 0,
  visible: false,
  text: ''
});
progress.reset = () => {
  progress.set({
    progress: 0,
    visible: false,
    text: ''
  });
};

export const currentTask = writable(null);
currentTask.replace = (newTask) => {
  currentTask.update((old) => {
    if (old) {
      old.abort();
    }
    return newTask;
  });
};
currentTask.abort = () => {
  currentTask.update((old) => {
    if (old) {
      old.abort();
      progress.reset();
    }
    return null;
  });
};

// The settings sidebar is rendered by the page shell (P4.svelte) while the option panels it
// controls are rendered by the lazily loaded PackagerOptions.svelte, so the navigation state
// has to live outside both of them.
// settingsGroups is published by PackagerOptions.svelte. It is empty until a project is open;
// the page shell always prepends its own "home" group, so the sidebar is never empty.
export const settingsGroups = writable([]);
// The group owned by the page shell (header, news, project selection).
export const HOME_SETTINGS_GROUP = 'home';
// The id of the currently selected settings panel.
export const activeSettingsGroup = writable(HOME_SETTINGS_GROUP);
// Used when the selected group is not among the published ones (the option panels only
// appear once a project is open).
export const FALLBACK_SETTINGS_GROUP = 'environment';

const POSSIBLE_THEMES = [
  'system',
  'dark',
  'light'
];
const THEME_KEY = 'P4.theme';
export const theme = writable('system');
try {
  const storedTheme = localStorage.getItem(THEME_KEY);
  if (POSSIBLE_THEMES.includes(storedTheme)) {
    theme.set(storedTheme);
  }
} catch (e) {
  // Ignore
}
theme.subscribe((value) => {
  try {
    if (value === 'system') {
      localStorage.removeItem(THEME_KEY);
    } else {
      localStorage.setItem(THEME_KEY, value);
    }
  } catch (e) {
    // ignore
  }
});
