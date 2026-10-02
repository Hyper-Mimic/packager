<script>
  import {_} from '../locales/';
  import ComplexMessage from './ComplexMessage.svelte';
  import Section from './Section.svelte';
  import SelectProject from './SelectProject.svelte';
  import SelectLocale from './SelectLocale.svelte';
  import SelectTheme from './SelectTheme.svelte';
  import Progress from './Progress.svelte';
  import Modals from './Modals.svelte';
  import News from './News.svelte';
  import SettingsNav from './SettingsNav.svelte';
  import {theme, error, settingsGroups, activeSettingsGroup, HOME_SETTINGS_GROUP, FALLBACK_SETTINGS_GROUP} from './stores';
  import {isSupported, isSafari, isStandalone, version} from './environment';
  import {
    APP_NAME,
    FEEDBACK_PRIMARY,
    FEEDBACK_SECONDARY,
    ACCENT_COLOR,
    SOURCE_CODE,
    WEBSITE,
    DONATE,
    PRIVACY_POLICY
  } from '../packager/brand';
  import favicon from '../../static/favicon.svg';

  let projectData;

  const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');
  let systemTheme = darkMedia.matches ? 'dark' : 'light';
  if (darkMedia.addEventListener) {
    darkMedia.addEventListener('change', () => {
      systemTheme = darkMedia.matches ? 'dark' : 'light';
    });
  }
  $: document.documentElement.setAttribute('theme', $theme === 'system' ? systemTheme : $theme);

  // Keep the CSS accent token in sync with the single source of truth in brand.js.
  document.documentElement.style.setProperty('--accent', ACCENT_COLOR);

  let modalVisible = false;

  // The sidebar belongs to the page shell and is always visible. The "home" group is owned by
  // this component; the option groups are published by the lazily loaded PackagerOptions.svelte.
  $: navGroups = [
    {id: HOME_SETTINGS_GROUP, label: $_('options.home')},
    ...$settingsGroups
  ];
  // If the selected group is not among the published ones - the option panels only appear
  // once a project is open - fall back to a group that always exists.
  $: if (!navGroups.some((group) => group.id === $activeSettingsGroup)) {
    activeSettingsGroup.set(
      $settingsGroups.some((group) => group.id === FALLBACK_SETTINGS_GROUP)
        ? FALLBACK_SETTINGS_GROUP
        : HOME_SETTINGS_GROUP
    );
  }

  // Opening a project jumps out of "home" into the first settings group. Wait until
  // PackagerOptions.svelte has published its groups, otherwise the fallback above would
  // immediately bounce us back to "home". `switchedForProject` makes this happen once per
  // project, so the user can still navigate back to "home" by hand afterwards.
  let switchedForProject = null;
  $: if (
    projectData &&
    $settingsGroups.length > 0 &&
    projectData.uniqueId !== switchedForProject &&
    $activeSettingsGroup === HOME_SETTINGS_GROUP
  ) {
    switchedForProject = projectData.uniqueId;
    activeSettingsGroup.set($settingsGroups[0].id);
  }

  const defaultTitle = document.title;
  let title = '';
  $: document.title = projectData && title ? `${title} - ${APP_NAME}` : defaultTitle;

  const getPackagerOptionsComponent = () => import(
    /* webpackChunkName: "packager-options-ui" */
    './PackagerOptions.svelte'
  ).catch((err) => {
    $error = err;
  });

  // We know for sure we will need this component very soon, so start loading it immediately.
  getPackagerOptionsComponent();
</script>

<style>
  /* The browser's default 8px body margin used to be invisible because the page was
     content-sized. Now that `.app` is at least one viewport tall, that margin pushes the
     document 16px past the fold, so every page could be scrolled a little even when it
     clearly fit. The shell is meant to be full-bleed anyway. */
  :global(body) {
    margin: 0;
  }
  /* Design tokens. Declared on :root / [theme="dark"] so that Svelte 3 leaves them global
     and every descendant component can consume them with var(). */
  :root {
    --bg: #ffffff;
    --surface: #ffffff;
    --surface-2: #f5f6f7;
    --surface-3: #ececee;
    --border: #e3e4e6;
    --border-strong: #cfd1d4;
    --text: #1d1f21;
    --text-muted: #6b7075;
    --accent: #ff4c4c; /* overwritten at runtime from brand.ACCENT_COLOR */
    --danger: #ff8c1a;
    --secondary: #0fbd8c;
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 16px;
    --shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 4px 12px -2px rgba(16, 24, 40, 0.06);
    --shadow-lg: 0 4px 12px -2px rgba(16, 24, 40, 0.1), 0 16px 40px -8px rgba(16, 24, 40, 0.18);
    --focus: #4c97ff;
    --content-w: 960px;
    --sidebar-w: 232px;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
  }
  :global([theme="dark"]) {
    --bg: #0e0f11;
    --surface: #17191c;
    --surface-2: #202327;
    --surface-3: #2a2e33;
    --border: #2c3034;
    --border-strong: #3a3f45;
    --text: #e8eaed;
    --text-muted: #9aa0a6;
    --accent: #ff4c4c;
    --danger: #ff9d43;
    --secondary: #23c69a;
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.5), 0 4px 12px -2px rgba(0, 0, 0, 0.4);
    --shadow-lg: 0 8px 24px -6px rgba(0, 0, 0, 0.65), 0 24px 56px -12px rgba(0, 0, 0, 0.7);
    --focus: #56b2ff;
    background: var(--bg);
    color: var(--text);
    color-scheme: dark;
  }
  :global(a) {
    color: blue;
  }
  :global([theme="dark"] a) {
    color: #56b2ff;
  }
  :global(a:active) {
    color: red;
  }
  :global(input[type="text"]),
  :global(input[type="number"]),
  :global(textarea) {
    background: var(--surface-2);
    color: var(--text);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
    padding: 4px 6px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  /* Selects are styled separately from the other fields because they need a drawn chevron:
     Safari keeps its native control (`.is-not-safari` is only added when not on Safari). */
  :global(.is-not-safari select) {
    appearance: none;
    background-color: var(--surface-2);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.75 6 7.75 9 4.75' fill='none' stroke='%236b7075' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center;
    background-size: 12px 12px;
    color: var(--text);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    padding: 6px 30px 6px 10px;
    max-width: 100%;
    cursor: pointer;
    /* Reaches the popup list too: engines use it for the highlighted row. */
    accent-color: var(--accent);
    transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s;
  }
  /* Fallback rows for engines that still paint the popup with the OS (Firefox, Safari): only
     colour and background reach <option>, padding is honoured by Firefox alone. `color-scheme`
     on [theme="dark"] covers the popup chrome itself; these rules cover the rows. Chromium and
     Safari 27+ take the fully styled path further down instead. */
  :global(.is-not-safari select option) {
    background-color: var(--surface);
    color: var(--text);
    padding: 6px 10px;
  }
  :global(.is-not-safari select option:hover),
  :global(.is-not-safari select option:checked) {
    background-color: var(--surface-3);
    color: var(--text);
  }
  /* Same chevron in a lighter stroke, since the light one disappears on a dark surface. */
  :global([theme="dark"] .is-not-safari select) {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 4.75 6 7.75 9 4.75' fill='none' stroke='%239aa0a6' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  }
  :global(.is-not-safari select:hover) {
    border-color: var(--text-muted);
    background-color: var(--surface-3);
  }
  /* The popup list, take two. `appearance: base-select` (Chromium 135+) replaces the OS-drawn
     menu with a real element tree, so the panel, the rows and the open/close transition all
     become styleable and follow the theme. Engines without it ignore this block and keep the
     native popup, which is why the rules above stay. Safari 27 supports it too but is left on
     the native popup on purpose (`.is-not-safari`), since WebKit ships its own base styles. */
  @supports (appearance: base-select) {
    :global(.is-not-safari select) {
      appearance: base-select;
    }
    /* The trigger already draws its own chevron above; hide the UA arrow so only one shows. */
    :global(.is-not-safari select)::picker-icon {
      display: none;
    }
    :global(.is-not-safari select)::picker(select) {
      appearance: base-select;
      margin-top: 6px;
      padding: 4px;
      min-width: 168px;
      max-height: 320px;
      overflow-y: auto;
      overscroll-behavior: contain;
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      opacity: 0;
      translate: 0 -4px;
      transition: opacity 0.15s ease, translate 0.15s ease, display 0.15s allow-discrete,
        overlay 0.15s allow-discrete;
    }
    :global(.is-not-safari select:open)::picker(select) {
      opacity: 1;
      translate: 0 0;
    }
    @starting-style {
      :global(.is-not-safari select:open)::picker(select) {
        opacity: 0;
        translate: 0 -4px;
      }
    }
    /* While the list is open the trigger reads as pressed. */
    :global(.is-not-safari select:open) {
      border-color: var(--text-muted);
      background-color: var(--surface-3);
    }
    /* Rows. The label is offset by a fixed slot so the checkmark on the selected row does not
       push its own text out of line with the rest. */
    :global(.is-not-safari select option) {
      padding: 7px 10px 7px 32px;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text);
      font-weight: 400;
    }
    :global(.is-not-safari select option:hover),
    :global(.is-not-safari select option:focus-visible) {
      background: var(--surface-3);
      color: var(--text);
    }
    /* Keyboard navigation moves focus between rows; the UA ring is drawn with system colours
       and clashes with both themes, so it is replaced by the same focus colour used by the
       fields on the page. */
    :global(.is-not-safari select option:focus-visible) {
      outline: 2px solid var(--focus);
      outline-offset: -2px;
    }
    :global(.is-not-safari select option:checked) {
      background: var(--surface-2);
      color: var(--text);
      font-weight: 600;
    }
    :global(.is-not-safari select option)::checkmark {
      box-sizing: border-box;
      width: 24px;
      margin-left: -24px;
      text-align: center;
      color: var(--accent);
      font-weight: 700;
    }
  }
  :global(input[type="text"]:focus-visible),
  :global(input[type="number"]:focus-visible),
  :global(textarea:focus-visible),
  :global(.is-not-safari select:focus-visible) {
    outline: none;
    border-color: var(--focus);
    box-shadow: 0 0 0 2px rgba(76, 151, 255, 0.3);
  }
  /* Checkboxes and radios are drawn from scratch. `accent-color` could only tint the OS
     control: it kept the platform's own box/circle geometry, hover feedback and focus ring.
     `appearance: none` hands all of that to the design tokens. The tick is an inline SVG and
     the radio dot a radial-gradient, so neither needs extra markup. */
  :global(input[type="checkbox"]),
  :global(input[type="radio"]) {
    appearance: none;
    flex: none;
    box-sizing: border-box;
    width: 15px;
    height: 15px;
    margin: 0;
    vertical-align: middle;
    background-color: var(--surface-2);
    border: 1px solid var(--border-strong);
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
  }
  :global(input[type="radio"]) {
    border-radius: 50%;
  }
  :global(input[type="checkbox"]:hover:not(:disabled)),
  :global(input[type="radio"]:hover:not(:disabled)) {
    border-color: var(--text-muted);
  }
  /* background-color rather than the `background` shorthand, so the tick image survives. */
  :global(input[type="checkbox"]:checked) {
    background-color: var(--accent);
    border-color: var(--accent);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2.6 6.4 4.9 8.7 9.4 3.5' fill='none' stroke='%23fff' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: center;
    background-size: 13px 13px;
  }
  :global(input[type="radio"]:checked) {
    border-color: var(--accent);
    background-image: radial-gradient(circle at center, var(--accent) 0 4px, transparent 4.5px);
  }
  :global(input[type="checkbox"]:disabled),
  :global(input[type="radio"]:disabled) {
    opacity: 0.5;
    cursor: default;
  }
  :global(input[type="color"]) {
    width: 32px;
    height: 24px;
    padding: 0;
    background: var(--surface-2);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-sm);
  }
  /* A file input is one UA-drawn button plus a label; only the button part is reachable,
     through ::file-selector-button. The whole selector sits inside :global() so Svelte does
     not append a scope class the pseudo-element cannot carry. */
  :global(input[type="file"]) {
    max-width: 100%;
    color: var(--text-muted);
  }
  :global(input[type="file"]::file-selector-button) {
    font: inherit;
    margin-right: 10px;
    padding: 5px 12px;
    color: var(--text);
    background-color: var(--surface-2);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
  }
  :global(input[type="file"]::file-selector-button:hover) {
    background-color: var(--surface-3);
    border-color: var(--text-muted);
  }
  :global(p), :global(h1), :global(h2), :global(h3) {
    margin: 12px 0;
  }
  :global(summary) {
    cursor: pointer;
  }
  :global(input) {
    font-size: 0.875em;
  }
  :global(button:focus-visible),
  :global(summary:focus-visible),
  :global(a:focus-visible),
  :global(input[type="checkbox"]:focus-visible),
  :global(input[type="radio"]:focus-visible) {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
  /* Page shell. The settings sidebar spans the whole page and is always visible, so it sits
     here as the outermost grid. Note: no `align-items: start`, otherwise the sidebar would
     shrink to its own content height and could never stick. */
  .app {
    display: grid;
    grid-template-columns: var(--sidebar-w, 208px) minmax(0, 1fr);
    min-height: 100vh;
    /* dvh keeps mobile browser chrome (the URL bar) from making the shell taller than the
       actually visible area, which would reintroduce the same 1-viewport-tall overflow. */
    min-height: 100dvh;
  }
  /* The divider belongs on the grid item, not on the sticky inner box: the inner box is only
     as tall as its own content, so a border there stops halfway down the page. */
  .sidebar {
    border-right: 1px solid var(--border, #e3e4e6);
  }
  .sidebar-inner {
    position: sticky;
    top: 0;
    box-sizing: border-box;
    max-height: 100vh;
    max-height: 100dvh;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px 12px;
  }
  /* Brand block. The mark is the site's own favicon (static/favicon.svg). The artwork already
     sits on its own rounded frame with a small inset, so it needs no coloured plate behind it
     and is drawn 2px larger than the plate it replaces to keep the same visual weight. */
  .sidebar-brand {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 0 10px 14px;
    border-bottom: 1px solid var(--border, #e3e4e6);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }
  .brand-mark {
    flex: none;
    display: block;
    width: 24px;
    height: 24px;
  }
  .brand-name {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .panel {
    min-width: 0;
  }
  .panel[hidden] {
    display: none;
  }
  /* Progress.svelte stretches to its container, which is what we want inside the sticky
     action bar but not in this small centered placeholder card. */
  .centered-progress {
    width: 100%;
    max-width: 320px;
  }
  /* A flex column so that the sticky action bar rendered by PackagerOptions is the last
     item and has a containing block taller than itself. `position: sticky` can only pull
     an element back into view, never push it down, so when the page is shorter than the
     viewport the leftover height has to be absorbed by an item above the bar (`.settings`,
     which has a growth factor for exactly that reason). */
  main {
    display: flex;
    flex-direction: column;
    min-width: 0;
    /* Cards are `max-width` + auto-centred, so without a gutter they go edge-to-edge and
       stop reading as cards on anything narrower than the content width. */
    padding: 16px;
  }
  /* Footer chrome. Links inherit the muted colour instead of the raw `blue` from the bare
     `a` rule, and only pick up the brand accent on hover, so the stack stays quiet. */
  footer {
    margin-top: 4px;
    text-align: center;
    font-size: 13px;
    color: var(--text-muted);
  }
  footer > div {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    margin-top: 12px;
  }
  footer a {
    color: inherit;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    padding-bottom: 1px;
    transition: color 0.15s, border-color 0.15s;
  }
  /* Neutral emphasis rather than the accent colour: accent stays reserved for selected and
     primary states. */
  footer a:hover,
  footer a:active {
    color: var(--text);
    border-bottom-color: currentColor;
  }
  /* Divider drawn in CSS rather than a literal " - " text node: it centres on the text
     baseline and follows the theme. Spacing lives on the divider's own margins so it is
     identical inside and outside the .donate-link wrapper (flex gap would not reach in). */
  .sep {
    display: inline-block;
    width: 1px;
    height: 12px;
    margin: 0 10px;
    vertical-align: middle;
    background: var(--border-strong, #cfd1d4);
  }
  .pickers {
    gap: 8px;
  }
  .disclaimer {
    font-style: italic;
  }
  .version {
    font-size: small;
    opacity: 0.8;
  }
  .version a {
    color: inherit;
  }
  @media (max-width: 800px) {
    /* Single column: the sidebar collapses into a sticky top bar holding a horizontally
       scrollable list of group chips (see SettingsNav.svelte). */
    .app {
      grid-template-columns: minmax(0, 1fr);
    }
    .sidebar {
      border-right: none;
    }
    .sidebar-inner {
      z-index: 5;
      max-height: none;
      gap: 0;
      padding: 8px 12px;
      border-bottom: 1px solid var(--border, #e3e4e6);
      background: var(--bg);
    }
    .sidebar-brand {
      display: none;
    }
  }
</style>

<Modals bind:modalVisible={modalVisible} />

<div class="app" aria-hidden={modalVisible}>
  <aside class="sidebar">
    <div class="sidebar-inner">
      <div class="sidebar-brand">
        <!-- draggable=false: images are draggable by default, and dragging the logo out of the
             sidebar (ghost image, or a drop into the page) is never a useful gesture here. -->
        <img class="brand-mark" src={favicon} alt="" width="24" height="24" draggable="false">
        <span class="brand-name">{APP_NAME}</span>
      </div>
      <SettingsNav groups={navGroups} bind:value={$activeSettingsGroup} />
    </div>
  </aside>

  <main class:is-not-safari={!isSafari}>
    <div
      class="panel"
      role="tabpanel"
      id="panel-home"
      aria-labelledby="tab-home"
      tabindex="0"
      hidden={$activeSettingsGroup !== HOME_SETTINGS_GROUP}
    >
      <Section accent={ACCENT_COLOR}>
        <div>
          <h1>{APP_NAME}</h1>
          {#if version}
            <p class="version">
              {version}
              {#if isStandalone}
                - <a href={WEBSITE}>{WEBSITE}</a>
              {/if}
            </p>
          {/if}
          <p>{$_('p4.description1')}</p>
          <p>
            <ComplexMessage
              message={$_('p4.description2')}
              values={{
                embedding: {
                  text: $_('p4.description2-embedding'),
                  href: 'https://docs.turbowarp.org/embedding'
                }
              }}
            />
          </p>
          <p>
            <ComplexMessage
              message={$_('p4.description3')}
              values={{
                // These placeholders are named this way for legacy reasons.
                onScratch: {
                  text: $_('p4.description3-on').replace('{brand}', FEEDBACK_PRIMARY.name),
                  href: FEEDBACK_PRIMARY.link
                },
                onGitHub: {
                  text: $_('p4.description3-on').replace('{brand}', FEEDBACK_SECONDARY.name),
                  href: FEEDBACK_SECONDARY.link
                }
              }}
            />
          </p>
          <p class="disclaimer">
            {$_('p4.disclaimer')}
          </p>
        </div>
      </Section>

      {#if !isStandalone}
        <News />
      {/if}

      {#if isSupported}
        <SelectProject bind:projectData />
      {:else}
        <Section accent="#4C97FF">
          <h2>{$_('p4.browserNotSupported')}</h2>
          <p>{$_('p4.browserNotSupportedDescription')}</p>
        </Section>
      {/if}

      <!-- Site chrome (credits, docs link, theme and language pickers). It lives inside the
           "home" panel on purpose: those controls are about browsing this site, not about
           configuring the export, so they step aside while a settings group is open. -->
      <footer>
        <div>
          {#if PRIVACY_POLICY && !isStandalone}
            <a href={PRIVACY_POLICY}>{$_('p4.privacy')}</a>
            <span class="sep" aria-hidden="true"></span>
          {/if}
          <a href={FEEDBACK_PRIMARY.link}>{$_('p4.feedback')}</a>
          {#if SOURCE_CODE}
            <span class="sep" aria-hidden="true"></span>
            <a href={SOURCE_CODE}>{$_('p4.sourceCode')}</a>
          {/if}
          {#if DONATE}
            <!-- Donation link needs to be wrapped in another element so we can hide it in the Mac App Store.
                 No styles are attached to .donate-link on purpose, so an outside rule can still hide it. -->
            <span class="donate-link">
              <!-- Divider and link are kept on one line: inside a flex item the whitespace
                   between two inline elements would render as an extra space. -->
              <span class="sep" aria-hidden="true"></span><a href={DONATE}>{$_('p4.donate')}</a>
            </span>
          {/if}
        </div>
        <div>
          <a href="https://docs.turbowarp.org/packager">{$_('p4.documentation')}</a>
        </div>
        <div class="pickers">
          <SelectTheme />
          <SelectLocale />
        </div>
      </footer>
    </div>

    {#if projectData}
      {#await getPackagerOptionsComponent()}
        <div>
          <Section center>
            <div class="centered-progress">
              <Progress text={$_('p4.importingInterface')} />
            </div>
          </Section>
        </div>
      {:then { default: PackagerOptions }}
        <!-- Deliberately not wrapped in a container: the sticky action bar rendered by
             PackagerOptions has to be a direct child of <main> so that <main> is its
             containing block. A sticky element can only be shifted inside its containing
             block, and on the home panel the hidden option panels collapse to zero height,
             so a wrapper here would end up exactly as tall as the bar itself and leave it
             no travel at all. Its enter transition moved into PackagerOptions. -->
        <PackagerOptions
          projectData={projectData}
          bind:title={title}
        />
      {:catch}
        <div>
          <Section center>
            <p>
              {$_('p4.unknownImportError')}
            </p>
          </Section>
        </div>
      {/await}
    {/if}

  </main>
</div>
