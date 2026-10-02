<script>
  import {onDestroy} from 'svelte';
  import {_} from '../locales/';
  import {slide, fade} from 'svelte/transition';
  import Section from './Section.svelte';
  import ComplexMessage from './ComplexMessage.svelte';
  import Button from '../p4/Button.svelte';
  import ImageInput from './ImageInput.svelte';
  import CustomExtensions from '../p4/CustomExtensions.svelte';
  import LearnMore from './LearnMore.svelte';
  import ColorPicker from './ColorPicker.svelte';
  import Downloads from './Downloads.svelte';
  import Progress from './Progress.svelte';
  import writablePersistentStore from './persistent-store';
  import fileStore from './file-store';
  import {progress, currentTask, error, settingsGroups, activeSettingsGroup} from './stores';
  import Preview from './preview';
  import deepClone from './deep-clone';
  import Packager from '../packager/web/export';
  import Task from './task';
  import downloadURL from './download-url';
  import {recursivelySerializeBlobs, recursivelyDeserializeBlobs} from './blob-serializer';
  import {readAsText} from '../common/readers';
  import merge from './merge';
  import DropArea from './DropArea.svelte';
  import {APP_NAME} from '../packager/brand';

  export let projectData;
  export let title;

  // JSON can't easily parse Infinity, so we'll just store large numbers instead
  const ALMOST_INFINITY = 9999999999;

  const cloudVariables = projectData.project.analysis.stageVariables
    .filter(i => i.isCloud)
    .map(i => i.name);

  const defaultOptions = Packager.DEFAULT_OPTIONS();
  defaultOptions.projectId = projectData.projectId || `p4-${projectData.uniqueId}`;
  for (const variable of cloudVariables) {
    defaultOptions.cloudVariables.custom[variable] = 'ws';
  }
  defaultOptions.app.packageName = Packager.getDefaultPackageNameFromFileName(projectData.title);
  defaultOptions.app.windowTitle = Packager.getWindowTitleFromFileName(projectData.title);
  defaultOptions.extensions = projectData.project.analysis.extensions;
  const options = writablePersistentStore(`PackagerOptions.${projectData.uniqueId}`, defaultOptions);

  // Compatibility with https://github.com/TurboWarp/packager/commit/f66199abd1c896c11aa69247275a1594fdfc95b8
  $options.extensions = $options.extensions.map(i => {
    if (typeof i === 'object' && i) return i.url || '';
    return i;
  });

  const hasMagicComment = (magic) => projectData.project.analysis.stageComments.find(
    (text) => text.split('\n').find((line) => line.endsWith(magic))
  );
  const hasSettingsStoredInProject = hasMagicComment(' // _twconfig_');

  let result = null;
  let previewer = null;
  const resetResult = () => {
    previewer = null;
    if (result) {
      URL.revokeObjectURL(result.url);
    }
    result = null;
  }
  $: if (previewer) {
    previewer.setProgress($progress.progress, $progress.text);
  }
  $: $options, resetResult(), currentTask.abort();

  const icon = fileStore.writableFileStore(`PackagerOptions.icon.${projectData.uniqueId}`);
  $: $options.app.icon = $icon;

  const customCursorIcon = fileStore.writableFileStore(`PackagerOptions.customCursorIcon.${projectData.uniqueId}`);
  $: $options.cursor.custom = $customCursorIcon;

  const loadingScreenImage = fileStore.writableFileStore(`PackagerOptions.loadingScreenImage.${projectData.uniqueId}`);
  $: $options.loadingScreen.image = $loadingScreenImage;

  $: title = $options.app.windowTitle;

  const setOptions = (newOptions) => {
    $options = newOptions;
    $icon = $options.app.icon;
    $customCursorIcon = $options.cursor.custom;
    $loadingScreenImage = $options.loadingScreen.image;
  };

  const otherEnvironmentsInitiallyOpen = ![
    'html',
    'zip',
    'electron-win32',
    'webview-mac',
    'electron-linux64'
  ].includes($options.target);

  const advancedOptionsInitiallyOpen = (
    $options.compiler.enabled !== defaultOptions.compiler.enabled ||
    $options.compiler.warpTimer !== defaultOptions.compiler.warpTimer ||
    $options.extensions.length !== 0 ||
    $options.bakeExtensions !== defaultOptions.bakeExtensions ||
    $options.custom.css !== '' ||
    $options.custom.js !== '' ||
    $options.projectId !== defaultOptions.projectId ||
    $options.packagedRuntime !== defaultOptions.packagedRuntime ||
    $options.maxTextureDimension !== defaultOptions.maxTextureDimension
  );

  // Sidebar groups. The sidebar itself is rendered by the page shell (P4.svelte), so we
  // publish the list through a store instead of rendering it here. The application settings
  // live at the bottom of the environment panel, so every group listed here is always
  // present and the shell never has to drop a stale selection.
  const usesSteamworks = projectData.project.analysis.usesSteamworks;

  $: visibleGroups = [
    {id: 'runtime', label: $_('options.runtimeOptions')},
    {id: 'player', label: $_('options.playerOptions')},
    {id: 'interaction', label: $_('options.interaction')},
    {id: 'cloud', label: $_('options.cloudVariables')},
    {id: 'advanced', label: $_('options.advancedOptions')},
    {id: 'environment', label: $_('options.environment')}
  ];
  $: settingsGroups.set(visibleGroups);

  const automaticallyCenterCursor = () => {
    const icon = $customCursorIcon;
    const url = URL.createObjectURL(icon)
    const image = new Image();
    const cleanup = () => {
      image.onerror = null;
      image.onload = null;
      URL.revokeObjectURL(url);
    };
    image.onload = () => {
      $options.cursor.center.x = Math.round(image.width / 2);
      $options.cursor.center.y = Math.round(image.height / 2);
      cleanup();
    };
    image.onerror = () => {
      cleanup();
      $error = new Error('Image could not be loaded');
      throw $error;
    };
    image.src = url;
  };

  const runPackager = async (task, options) => {
    const packager = new Packager();
    packager.options = options;
    packager.project = projectData.project;

    task.addEventListener('abort', () => {
      packager.abort();
    });

    task.setProgressText($_('progress.loadingScripts'));

    packager.addEventListener('fetch-extensions', ({detail}) => {
      task.setProgressText($_('progress.downloadingExtensions'));
      task.setProgress(detail.progress);
    });
    packager.addEventListener('large-asset-fetch', ({detail}) => {
      let thing;
      if (detail.asset.startsWith('nwjs-')) {
        thing = 'NW.js';
      } else if (detail.asset.startsWith('electron-')) {
        thing = 'Electron';
      } else if (detail.asset === 'webview-mac') {
        thing = 'WKWebView';
      } else if (detail.asset === 'steamworks.js') {
        thing = 'Steamworks.js';
      }
      if (thing) {
        task.setProgressText($_('progress.loadingLargeAsset').replace('{thing}', thing));
      }
      task.setProgress(detail.progress);
    });
    packager.addEventListener('zip-progress', ({detail}) => {
      task.setProgressText($_('progress.compressingProject'));
      task.setProgress(detail.progress);
    });

    const result = await packager.package();
    result.blob = new Blob([result.data], {
      type: result.type
    });
    result.url = URL.createObjectURL(result.blob);
    return result;
  };

  const pack = async () => {
    resetResult();
    const task = new Task();
    result = await task.do(runPackager(task, deepClone($options)));
    task.done();
    downloadURL(result.filename, result.url);
  };

  const preview = async () => {
    resetResult();
    previewer = new Preview();
    const task = new Task();
    const optionsClone = deepClone($options);
    optionsClone.target = 'html';
    try {
      result = await task.do(runPackager(task, optionsClone));
      task.done();
      previewer.setContent(result.blob);
    } catch (e) {
      previewer.close();
    }
  };

  const resetOptions = (properties) => {
    for (const key of properties) {
      let current = $options;
      let defaults = defaultOptions;
      const parts = key.split('.');
      const lastPart = parts.pop();
      for (const i of parts) {
        current = current[i];
        defaults = defaults[i];
      }
      current[lastPart] = deepClone(defaults[lastPart]);
    }
    $options = $options;
  };

  const resetAll = () => {
    if (confirm($_('reset.confirmAll'))) {
      resetOptions(Object.keys($options));
      $icon = null;
      $customCursorIcon = null;
      $loadingScreenImage = null;
    }
  };

  const exportOptions = async () => {
    const exported = await recursivelySerializeBlobs($options);
    const blob = new Blob([JSON.stringify(exported)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const formattedAppName = APP_NAME
      .replace(/[^a-z0-9 ]/gi, '')
      .replace(/ /g, '-')
      .toLowerCase();
    downloadURL(`${formattedAppName}-settings.json`, url);
    URL.revokeObjectURL(url);
  };
    
  const importOptions = async () => {
    const input = document.createElement("input");
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', (e) => {
      importOptionsFromDataTransfer(e.target);
    });
    document.body.appendChild(input);
    input.click();
    input.remove();
  };

  const importOptionsFromDataTransfer = async (dataTransfer) => {
    const file = dataTransfer.files[0];
    if (!file) {
      // Should never happen.
      return;
    }
    try {
      const text = await readAsText(file);
      const parsed = JSON.parse(text);
      const deserialized = recursivelyDeserializeBlobs(parsed);
      const copiedDefaultOptions = deepClone(defaultOptions);
      const mergedWithDefaults = merge(deserialized, copiedDefaultOptions);

      const isUnsafe = Packager.usesUnsafeOptions(mergedWithDefaults);
      if (!isUnsafe || confirm($_('options.confirmImportUnsafe'))) {
        setOptions(mergedWithDefaults);
      }
    } catch (e) {
      $error = e;
    }
  };

  onDestroy(() => {
    if (result) {
      URL.revokeObjectURL(result.url);
    }
  });
</script>

<style>
  /* The sidebar lives in the page shell (P4.svelte), so this is a plain single-column
     container that just holds the panels. */
  /* The shell lays its column out with flex so the sticky action bar below can be pushed to
     the bottom of the viewport. That costs us two non-obvious declarations here:
     `width: 100%` because a flex item with auto inline margins shrinks to fit instead of
     filling the column, and the growth factor because sticky can only pull an element back
     into view - when the panel is shorter than the viewport something above the bar has to
     take the leftover height, otherwise the bar floats in the middle of the page. */
  .settings {
    width: 100%;
    flex: 1 0 auto;
    max-width: var(--content-w, 960px);
    margin: 0 auto;
  }
  .panel {
    min-width: 0;
  }
  .panel[hidden] {
    display: none;
  }
  .option {
    display: block;
    margin: 4px 0;
  }
  .group {
    margin: 12px 0;
  }
  p {
    margin: 8px 0;
  }
  .group:last-child, .option:last-child, p:last-child {
    margin-bottom: 0;
  }
  textarea {
    box-sizing: border-box;
    width: 100%;
    min-width: 100%;
    height: 150px;
  }
  input[type="text"] {
    width: 200px;
  }
  input[type="text"].shorter {
    width: 150px;
  }
  input[type="number"] {
    width: 50px;
  }
  input:invalid, .version:placeholder-shown {
    outline: 2px solid var(--danger, #ff8c1a);
  }
  .warning {
    font-weight: 500;
    padding: 10px 12px;
    background: var(--surface-3, #ececee);
    color: var(--text, inherit);
    border-left: 3px solid var(--danger, #ff8c1a);
    border-radius: var(--radius-sm, 6px);
  }
  .warning ul {
    margin: 8px 0;
    padding-left: 20px;
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
  .actions-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .actions-divider {
    width: 1px;
    align-self: stretch;
    min-height: 22px;
    background: var(--border, #e3e4e6);
  }
  .actions-primary {
    margin-left: auto;
  }
  /* Shared slot above the buttons holding whichever of the two takes over: the running
     progress bar, or the download link once packaging finished. */
  .actions-extra {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border, #e3e4e6);
  }
  .actions-hint {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 12px;
    text-align: right;
    color: var(--text-muted, #6b7075);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* Sticky rather than fixed: the bar stays in flow, so it reserves its own space and can
     only travel while its containing block is still on screen. Its containing block is
     <main> - see the comment in P4.svelte - which is what makes it sit at the bottom of the
     viewport instead of scrolling away with the page. */
  .settings-actions {
    position: sticky;
    bottom: 0;
    /* Flex item with auto inline margins: it needs an explicit width, and border-box so
       that width is the outer one (the bar has padding and a border). */
    box-sizing: border-box;
    width: 100%;
    z-index: 10;
    max-width: var(--content-w, 960px);
    margin: 16px auto 0;
    padding: 12px 14px;
    background: var(--surface, #fff);
    border: 1px solid var(--border, #e3e4e6);
    /* Same radius as a card: the action bar is a surface card too, it just happens to stick. */
    border-radius: var(--radius-lg, 16px);
    box-shadow: var(--shadow, none);
  }
  @media (max-width: 800px) {
    /* Primary actions move to the top of the bar and get their own row, so the buttons
       people actually reach for are never the ones pushed off screen. */
    .actions-primary {
      order: -1;
      width: 100%;
      margin-left: 0;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border, #e3e4e6);
    }
    .actions-divider {
      display: none;
    }
    .actions-hint {
      display: none;
    }
  }
</style>

<div class="settings" in:fade>
  <div class="panel" role="tabpanel" id="panel-runtime" aria-labelledby="tab-runtime" tabindex="0" hidden={$activeSettingsGroup !== 'runtime'}>
    <Section
      accent="#FFAB19"
      reset={() => {
        resetOptions([
          'turbo',
          'framerate',
          'interpolation',
          'highQualityPen',
          'maxClones',
          'fencing',
          'miscLimits',
          'stageWidth',
          'stageHeight',
          'resizeMode',
          'username'
        ]);
      }}
    >
      <div>
        <h2>{$_('options.runtimeOptions')}</h2>

        {#if hasSettingsStoredInProject}
          <div class="group">
            {$_('options.storedWarning')}
          </div>
        {/if}

        <label class="option">
          <input type="checkbox" bind:checked={$options.turbo}>
          {$_('options.turbo')}
        </label>
        <div class="option">
          <label>
            {$_('options.framerate')}
            <input type="number" min="0" max="240" bind:value={$options.framerate}>
          </label>
          <LearnMore slug="custom-fps" />
        </div>
        <div class="option">
          <label>
            <input type="checkbox" bind:checked={$options.interpolation}>
            {$_('options.interpolation')}
          </label>
          <LearnMore slug="interpolation" />
        </div>
        <div class="option">
          <label>
            <input type="checkbox" bind:checked={$options.highQualityPen}>
            {$_('options.highQualityPen')}
          </label>
          <LearnMore slug="high-quality-pen" />
        </div>
        <div class="option">
          <label>
            <input type="checkbox" checked={$options.maxClones === ALMOST_INFINITY} on:change={(e) => {
              $options.maxClones = e.target.checked ? ALMOST_INFINITY : 300;
            }}>
            {$_('options.infiniteClones')}
          </label>
          <LearnMore slug="infinite-clones" />
        </div>
        <div class="option">
          <label>
            <input type="checkbox" checked={!$options.fencing} on:change={(e) => {
              $options.fencing = !e.target.checked;
            }}>
            {$_('options.removeFencing')}
          </label>
          <LearnMore slug="remove-fencing" />
        </div>
        <div class="option">
          <label>
            <input type="checkbox" checked={!$options.miscLimits} on:change={(e) => {
              $options.miscLimits = !e.target.checked;
            }}>
            {$_('options.removeMiscLimits')}
          </label>
          <LearnMore slug="remove-misc-limits" />
        </div>
        <label class="option">
          {$_('options.username')}
          <input type="text" class="shorter" bind:value={$options.username}>
        </label>
        {#if $options.username !== defaultOptions.username && cloudVariables.length !== 0}
          <p class="warning">
            {$_('options.customUsernameWarning')}
          </p>
        {/if}
        <label class="option">
          <input type="checkbox" bind:checked={$options.closeWhenStopped}>
          {$_('options.closeWhenStopped')}
        </label>

        <h3>{$_('options.stage')}</h3>
        <label class="option">
          {$_('options.stageSize')}
          <input type="number" min="1" max="4096" step="1" bind:value={$options.stageWidth}>
          &times;
          <input type="number" min="1" max="4096" step="1" bind:value={$options.stageHeight}>
          <LearnMore slug="custom-stage-size" />
        </label>
        <div class="group">
          <label class="option">
            <input type="radio" name="resize-mode" value="preserve-ratio" bind:group={$options.resizeMode}>
            {$_('options.preserveRatio')}
          </label>
          <label class="option">
            <input type="radio" name="resize-mode" value="stretch" bind:group={$options.resizeMode}>
            {$_('options.stretch')}
          </label>
          <label class="option">
            <input type="radio" name="resize-mode" value="dynamic-resize" bind:group={$options.resizeMode}>
            {$_('options.dynamicResize')}
            <LearnMore slug="packager/dynamic-stage-resize" />
          </label>
        </div>
      </div>
    </Section>
  </div>

  <div class="panel" role="tabpanel" id="panel-player" aria-labelledby="tab-player" tabindex="0" hidden={$activeSettingsGroup !== 'player'}>
    <Section
      accent="#9966FF"
      reset={() => {
        $icon = null;
        $loadingScreenImage = null;
        resetOptions([
          'app.windowTitle',
          'loadingScreen',
          'autoplay',
          'controls',
          'appearance',
          'monitors',
        ]);
      }}
    >
      <div>
        <h2>{$_('options.playerOptions')}</h2>

        <label class="option">
          {$_('options.pageTitle')}
          <input type="text" bind:value={$options.app.windowTitle}>
        </label>
        <div class="option">
          {$_('options.icon')}
          <ImageInput bind:file={$icon} previewSizes={[[64, 64], [32, 32], [16, 16]]} />
        </div>

        <h3>{$_('options.loadingScreen')}</h3>
        <label class="option">
          <input type="checkbox" bind:checked={$options.loadingScreen.progressBar}>
          {$_('options.showProgressBar')}
        </label>
        <label class="option">
          {$_('options.loadingScreenText')}
          <input type="text" bind:value={$options.loadingScreen.text} placeholder={$_('options.loadingScreenTextPlaceholder')}>
        </label>
        <div class="option">
          {$_('options.loadingScreenImage')}
          <!-- Display preview at image's native size -->
          <ImageInput bind:file={$loadingScreenImage} previewSizes={[['', '']]} />
        </div>
        {#if $loadingScreenImage}
          <label class="option">
            <input type="radio" name="loading-screen-mode" value="normal" bind:group={$options.loadingScreen.imageMode}>
            {$_('options.sizeNormal')}
          </label>
          <label class="option">
            <input type="radio" name="loading-screen-mode" value="stretch" bind:group={$options.loadingScreen.imageMode}>
            {$_('options.sizeStretch')}
          </label>
        {/if}

        <h3>{$_('options.controls')}</h3>
        <div class="group">
          <label class="option">
            <input type="checkbox" bind:checked={$options.autoplay}>
            {$_('options.autoplay')}
          </label>
          {#if $options.autoplay}
            {$_('options.autoplayHint')}
          {/if}
        </div>
        <label class="option">
          <input type="checkbox" bind:checked={$options.controls.greenFlag.enabled}>
          {$_('options.showFlag')}
        </label>
        <label class="option">
          <input type="checkbox" bind:checked={$options.controls.stopAll.enabled}>
          {$_('options.showStop')}
        </label>
        <label class="option">
          <input type="checkbox" bind:checked={$options.controls.pause.enabled}>
          {$_('options.showPause')}
        </label>
        <label class="option">
          <input type="checkbox" bind:checked={$options.controls.fullscreen.enabled}>
          {$_('options.showFullscreen')}
        </label>
        <p>{$_('options.controlsHelp')}</p>

        <h3>{$_('options.colors')}</h3>
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label class="option">
          <ColorPicker bind:value={$options.appearance.background} />
          {$_('options.backgroundColor')}
        </label>
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label class="option">
          <ColorPicker bind:value={$options.appearance.foreground} />
          {$_('options.foregroundColor')}
        </label>
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label class="option">
          <ColorPicker bind:value={$options.appearance.accent} />
          {$_('options.accentColor')}
        </label>

        <h3>{$_('options.monitors')}</h3>
        <label class="option">
          <input type="checkbox" bind:checked={$options.monitors.editableLists}>
          {$_('options.editableLists')}
        </label>
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label class="option">
          <ColorPicker bind:value={$options.monitors.variableColor} />
          {$_('options.variableColor')}
        </label>
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label class="option">
          <ColorPicker bind:value={$options.monitors.listColor} />
          {$_('options.listColor')}
        </label>
      </div>
    </Section>
  </div>

  <div class="panel" role="tabpanel" id="panel-interaction" aria-labelledby="tab-interaction" tabindex="0" hidden={$activeSettingsGroup !== 'interaction'}>
    <Section
      accent="#4CBFE6"
      reset={() => {
        $customCursorIcon = null;
        resetOptions([
          'cursor',
          'chunks',
        ]);
      }}
    >
      <div>
        <h2>{$_('options.interaction')}</h2>
        <div class="group">
          <label class="option">
            <input type="radio" name="cursor-type" bind:group={$options.cursor.type} value="auto">
            {$_('options.normalCursor')}
          </label>
          <label class="option">
            <input type="radio" name="cursor-type" bind:group={$options.cursor.type} value="none">
            {$_('options.noCursor')}
          </label>
          <label class="option">
            <input type="radio" name="cursor-type" bind:group={$options.cursor.type} value="custom">
            {$_('options.customCursor')}
          </label>
        </div>
        {#if $options.cursor.type === 'custom'}
          <div in:slide|self class="option">
            <ImageInput bind:file={$customCursorIcon} previewSizes={[[32, 32], [16, 16]]} />
            <p>{$_('options.cursorHelp')}</p>
            <label class="option">
              {$_('options.cursorCenter')}
              <!-- X: and Y: intentionally not translated -->
              X: <input type="number" min="0" bind:value={$options.cursor.center.x}>
              Y: <input type="number" min="0" bind:value={$options.cursor.center.y}>
              <button
                on:click={automaticallyCenterCursor}
                disabled={!$customCursorIcon}
              >
                {$_('options.automaticallyCenter')}
              </button>
            </label>
          </div>
        {/if}

        <div class="group">
          <label class="option">
            <input type="checkbox" bind:checked={$options.chunks.pointerlock}>
            {$_('options.pointerlock')}
          </label>
          <a href="https://experiments.turbowarp.org/pointerlock/" target="_blank" rel="noopener noreferrer">
            {$_('options.pointerlockHelp')}
          </a>
        </div>

        <div class="group">
          <label class="option">
            <input type="checkbox" bind:checked={$options.chunks.gamepad}>
            {$_('options.gamepad')}
          </label>
          <a href="https://turbowarp.org/addons#gamepad" target="_blank" rel="noopener noreferrer">
            {$_('options.gamepadHelp')}
          </a>
        </div>
      </div>
    </Section>
  </div>

  <div class="panel" role="tabpanel" id="panel-cloud" aria-labelledby="tab-cloud" tabindex="0" hidden={$activeSettingsGroup !== 'cloud'}>
    <Section
      accent="#FF8C1A"
      reset={cloudVariables.length === 0 ? null : () => {
        resetOptions([
          'cloudVariables'
        ]);
      }}
    >
      <div>
        <h2>{$_('options.cloudVariables')}</h2>

        {#if cloudVariables.length > 0}
          <label class="option">
            {$_('options.mode')}
            <select bind:value={$options.cloudVariables.mode}>
              <option value="ws">{$_('options.cloudVariables-ws')}</option>
              <option value="local">{$_('options.cloudVariables-local')}</option>
              <option value="">{$_('options.cloudVariables-ignore')}</option>
              <option value="custom">{$_('options.cloudVariables-custom')}</option>
            </select>
          </label>

          {#if $options.cloudVariables.mode === "custom"}
            <div transition:fade|local>
              {#each cloudVariables as variable}
                <label class="option">
                  <select bind:value={$options.cloudVariables.custom[variable]}>
                    <option value="ws">{$_('options.cloudVariables-ws')}</option>
                    <option value="local">{$_('options.cloudVariables-local')}</option>
                    <option value="">{$_('options.cloudVariables-ignore')}</option>
                  </select>
                  {variable}
                </label>
              {/each}
            </div>
          {/if}

          {#if $options.cloudVariables.mode === 'ws' || $options.cloudVariables.mode === 'custom'}
            <div transition:fade|local>
              <label class="option">
                {$_('options.cloudVariablesHost')}
                <!-- Examples of valid values: -->
                <!-- wss://clouddata.turbowarp.org -->
                <!-- ws:localhost:8080 -->
                <input type="text" bind:value={$options.cloudVariables.cloudHost} pattern="wss?:.*">
              </label>
            </div>
          {/if}

          <p>{$_('options.cloudVariables-ws-help')}</p>
          <p>{$_('options.cloudVariables-local-help')}</p>
          <p>{$_('options.cloudVariables-ignore-help')}</p>
          <p>{$_('options.cloudVariables-custom-help')}</p>

          <div class="option">
            <label>
              <input type="checkbox" bind:checked={$options.cloudVariables.specialCloudBehaviors}>
              {$_('options.specialCloudBehaviors')}
            </label>
            <LearnMore slug="packager/special-cloud-behaviors" />
          </div>

          <div class="option">
            <label>
              <input type="checkbox" bind:checked={$options.cloudVariables.unsafeCloudBehaviors}>
              {$_('options.unsafeCloudBehaviors')}
            </label>
            <LearnMore slug="packager/special-cloud-behaviors#eval" />
          </div>
          {#if $options.cloudVariables.unsafeCloudBehaviors}
            <p class="warning">{$_('options.unsafeCloudBehaviorsWarning')}</p>
          {/if}
          <p>{$_('options.implicitCloudHint').replace('{cloud}', '☁')}</p>
        {:else}
          <p>{$_('options.noCloudVariables')}</p>
        {/if}
      </div>
    </Section>
  </div>

  <div class="panel" role="tabpanel" id="panel-advanced" aria-labelledby="tab-advanced" tabindex="0" hidden={$activeSettingsGroup !== 'advanced'}>
    <Section
      accent="#FF6680"
      reset={() => {
        resetOptions([
          'compiler',
          'extensions',
          'bakeExtensions',
          'custom',
          'projectId',
          'maxTextureDimension'
        ]);
      }}
    >
      <div>
        <h2>{$_('options.advancedOptions')}</h2>
        <details open={advancedOptionsInitiallyOpen}>
          <summary>{$_('options.advancedSummary')}</summary>

          <div class="option">
            <label>
              <input type="checkbox" bind:checked={$options.compiler.enabled}>
              {$_('options.enableCompiler')}
            </label>
            <LearnMore slug="disable-compiler" />
          </div>
          <div class="option">
            <label>
              <input type="checkbox" bind:checked={$options.compiler.warpTimer}>
              {$_('options.warpTimer')}
            </label>
            <LearnMore slug="warp-timer" />
          </div>

          <!-- Ignore because CustomExtensions will have a <textarea> inside it -->
          <!-- svelte-ignore a11y-label-has-associated-control -->
          <label class="option">
            {$_('options.customExtensions')}
            <!-- TODO: use the user-facing documentation when that becomes available -->
            <LearnMore slug="development/custom-extensions" />
            <CustomExtensions bind:extensions={$options.extensions} />
            <p class="warning">{$_('options.customExtensionsSecurity')}</p>
          </label>

          <label class="option">
            <input type="checkbox" bind:checked={$options.bakeExtensions}>
            {$_('options.bakeExtensions')}
          </label>

          <label class="option">
            {$_('options.customCSS')}
            <textarea bind:value={$options.custom.css}></textarea>
          </label>
          <label class="option">
            {$_('options.customJS')}
            <textarea bind:value={$options.custom.js}></textarea>
          </label>

          <label class="option">
            {$_('options.projectId')}
            <input type="text" bind:value={$options.projectId}>
          </label>
          <p>{$_('options.projectIdHelp')}</p>

          <label class="option">
            <input type="checkbox" bind:checked={$options.packagedRuntime} />
            {$_('options.packagedRuntime')}
          </label>

          <label class="option">
            <input type="checkbox" checked={$options.maxTextureDimension !== defaultOptions.maxTextureDimension} on:change={(e) => {
              $options.maxTextureDimension = defaultOptions.maxTextureDimension * (e.target.checked ? 2 : 1);
            }} />
            {$_('options.maxTextureDimension')}
          </label>
        </details>
      </div>
    </Section>
  </div>

  <div class="panel" role="tabpanel" id="panel-environment" aria-labelledby="tab-environment" tabindex="0" hidden={$activeSettingsGroup !== 'environment'}>
    <Section
      accent="#0FBD8C"
      reset={() => {
        resetOptions([
          'target'
        ])
      }}
    >
      <div>
        <h2>{$_('options.environment')}</h2>

        <div class="group">
          <label class="option">
            <input type="radio" name="environment" bind:group={$options.target} value="html">
            {$_('options.html')}
          </label>
          <label class="option">
            <input type="radio" name="environment" bind:group={$options.target} value="zip">
            {$_('options.zip')}
          </label>
        </div>

        <div class="group">
          <label class="option">
            <input type="radio" name="environment" bind:group={$options.target} value="electron-win32">
            {$_('options.application-win32').replace('{type}', 'Electron')}
          </label>
          <label class="option">
            <input type="radio" name="environment" bind:group={$options.target} value="webview-mac">
            {$_('options.application-mac').replace('{type}', 'WKWebView')}
          </label>
          <label class="option">
            <input type="radio" name="environment" bind:group={$options.target} value="electron-linux64">
            {$_('options.application-linux64').replace('{type}', 'Electron')}
          </label>
        </div>

        <details open={otherEnvironmentsInitiallyOpen}>
          <summary>{$_('options.otherEnvironments')}</summary>
          <p>{$_('options.otherEnvironmentsHelp')}</p>
          <div class="group">
            <label class="option">
              <input type="radio" name="environment" bind:group={$options.target} value="zip-one-asset">
              {$_('options.zip-one-asset')}
            </label>
          </div>
          <div class="group">
            <label class="option">
              <input type="radio" name="environment" bind:group={$options.target} value="electron-win64">
              {$_('options.application-win64').replace('{type}', 'Electron')}
            </label>
            <label class="option">
              <input type="radio" name="environment" bind:group={$options.target} value="electron-win-arm">
              {$_('options.application-win-arm').replace('{type}', 'Electron')}
            </label>
            <label class="option">
              <input type="radio" name="environment" bind:group={$options.target} value="electron-mac">
              {$_('options.application-mac').replace('{type}', 'Electron')}
            </label>
            <label class="option">
              <input type="radio" name="environment" bind:group={$options.target} value="electron-linux-arm32">
              {$_('options.application-linux-arm32').replace('{type}', 'Electron')}
            </label>
            <label class="option">
              <input type="radio" name="environment" bind:group={$options.target} value="electron-linux-arm64">
              {$_('options.application-linux-arm64').replace('{type}', 'Electron')}
            </label>  
          </div>

          <div class="group">
            <label class="option">
              <input type="radio" name="environment" bind:group={$options.target} value="nwjs-win32">
              {$_('options.application-win32').replace('{type}', 'NW.js')}
            </label>
            <label class="option">
              <input type="radio" name="environment" bind:group={$options.target} value="nwjs-win64">
              {$_('options.application-win64').replace('{type}', 'NW.js')}
            </label>
            <label class="option">
              <input type="radio" name="environment" bind:group={$options.target} value="nwjs-mac">
              {$_('options.application-mac').replace('{type}', 'NW.js')}
            </label>
            <label class="option">
              <input type="radio" name="environment" bind:group={$options.target} value="nwjs-linux-x64">
              {$_('options.application-linux64').replace('{type}', 'NW.js')}
            </label>
          </div>
        </details>
      </div>
    </Section>

    {#if $options.target !== 'html'}
      <div in:fade|local>
        <Section
          accent="#FF661A"
          reset={$options.target.startsWith('zip') ? null : () => {
            resetOptions([
              'app.packageName',
              'app.windowMode',
              'app.escapeBehavior',
              'app.backgroundThrottling'
            ]);
          }}
        >
          <div>
            {#if $options.target.startsWith('zip')}
              <h2>Zip</h2>
              <p>{$_('options.zipWarning')}</p>
            {:else}
              <h2>{$_('options.applicationSettings')}</h2>
              <label class="option">
                {$_('options.packageName')}
                <input type="text" bind:value={$options.app.packageName} pattern="[\w \-]+" minlength="1">
              </label>
              <p>{$_('options.packageNameHelp')}</p>

              <label class="option">
                {$_('options.version')}
                <input type="text" class="version" bind:value={$options.app.version} pattern="\d+\.\d+\.\d+" placeholder="1.0.0" minlength="1">
              </label>
              <p>{$_('options.versionHelp')}</p>

              {#if $options.target.includes('electron')}
                <label class="option">
                  {$_('options.initalWindowSize')}
                  <select bind:value={$options.app.windowMode}>
                    <option value="window">{$_('options.startWindow')}</option>
                    <option value="maximize">{$_('options.startMaximized')}</option>
                    <option value="fullscreen">{$_('options.startFullscreen')}</option>
                  </select>
                </label>

                <label class="option">
                  {$_('options.escapeBehavior')}
                  <select bind:value={$options.app.escapeBehavior}>
                    <option value="unfullscreen-only">{$_('options.unFullscreenOnly')}</option>
                    <option value="exit-only">{$_('options.exitOnly')}</option>
                    <option value="unfullscreen-or-exit">{$_('options.unFullscreenOrExit')}</option>
                    <option value="nothing">{$_('options.doNothing')}</option>
                  </select>
                </label>

                <label class="option">
                  {$_('options.windowControls')}
                  <select bind:value={$options.app.windowControls}>
                    <option value="default">{$_('options.defaultControls')}</option>
                    <option value="frameless">{$_('options.noControls')}</option>
                  </select>
                </label>

                <label class="option">
                  <input type="checkbox" bind:checked={$options.app.backgroundThrottling}>
                  {$_('options.backgroundThrottling')}
                </label>
              {/if}

              <div class="warning">
                <div>{$_('options.nativeWarning')}</div>
                <ul>
                  <li>{$_('options.nativeAdvantageWeb')}</li>
                  <li>{$_('options.nativeAdvantageVirus')}</li>
                  <li>{$_('options.nativeAdvantageSize')}</li>
                  <li>{$_('options.nativeAdvantageOffline')}</li>
                </ul>
                <div>{$_('options.nativeWarningFooter')}</div>
              </div>

              {#if $options.target.includes('win')}
                <div>
                  <h2>Windows</h2>
                  <p>{$_('options.windowsUnsigned')}</p>
                  <p>
                    <ComplexMessage
                      message={$_('options.windowsExtras')}
                      values={{
                        extras: {
                          text: 'TurboWarp Packager Extras',
                          href: 'https://github.com/TurboWarp/packager-extras/releases'
                        }
                      }}
                    />
                  </p>
                </div>
              {:else if $options.target.includes('mac')}
                <div>
                  <h2>macOS</h2>
                  <p>{$_('options.macosPolicy')}</p>
                  <ul>
                    <li>{$_('options.macosGatekeeper')}</li>
                    <li>{$_('options.macosNotarize')}</li>
                  </ul>
                </div>
              {:else if $options.target.includes('linux')}
                <div>
                  <h2>Linux</h2>
                  <p>{$_('options.linuxExperimental')}</p>
                </div>
              {/if}

              {#if $options.target.includes('electron')}
                <div>
                  <h2>Electron</h2>
                  <p>{$_('options.electronIntro')}</p>

                  {#if $options.target.includes('win')}
                    {#if $options.target.includes('32')}
                      <p>{$_('options.electron32bit')}</p>
                    {/if}
                  {:else if $options.target.includes('mac')}
                    <p>{$_('options.electronMac')}</p>
                  {:else if $options.target.includes('linux')}
                    <p>
                      <ComplexMessage
                        message={$_('options.electronLinux')}
                        values={{
                          cmd: {
                            text: 'start.sh',
                            code: true
                          }
                        }}
                      />
                    </p>
                  {/if}
                </div>
              {:else if $options.target.includes('nwjs')}
                <div>
                  <h2>NW.js</h2>
                  <p>{$_('options.nwjsIntro')}</p>
                  <p>
                    <ComplexMessage
                      message={$_('options.nwjsDocs')}
                      values={{
                        docs: {
                          text: 'NW.js Documentation',
                          href: 'https://docs.nwjs.io/en/latest/For%20Users/Package%20and%20Distribute/#linux'
                        }
                      }}
                    />
                  </p>
                  {#if $options.target.includes('mac')}
                    <p>{$_('options.nwjsMacRosetta')}</p>
                  {/if}
                </div>
              {:else if $options.target.includes('webview-mac')}
                <div>
                  <h2>WKWebView</h2>
                  <p>{$_('options.wkwebviewIntro')}</p>
                  <p>{$_('options.wkwebviewNative')}</p>
                  <p>{$_('options.wkwebviewNote')}</p>
                  <ul>
                    <li>{$_('options.wkwebviewVideoSensing')}</li>
                    <li>{$_('options.wkwebviewPointerLock')}</li>
                    <li>{$_('options.wkwebviewLargeProjects')}</li>
                  </ul>
                  <p>{$_('options.wkwebviewFallback')}</p>
                </div>
              {/if}
            {/if}
          </div>
        </Section>
      </div>
    {/if}

    {#if usesSteamworks}
      <Section
        accent="#136C9F"
        reset={() => {
          resetOptions([
            'steamworks'
          ]);
        }}
      >
        <h2>{$_('options.steamworksExtension')}</h2>
        {#if ['electron-win64', 'electron-linux64', 'electron-mac'].includes($options.target)}
          <p>{$_('options.steamworksAvailable').replace('{n}', '480')}</p>
          <label class="option">
            {$_('options.steamworksAppId')}
            <input pattern="\d+" minlength="1" bind:value={$options.steamworks.appId}>
          </label>
          <label class="option">
            {$_('options.steamworksOnError')}
            <select bind:value={$options.steamworks.onError}>
              <option value="ignore">{$_('options.steamworksIgnore')}</option>
              <option value="warning">{$_('options.steamworksWarning')}</option>
              <option value="error">{$_('options.steamworksError')}</option>
            </select>
          </label>

          {#if $options.target === 'electron-mac'}
            <p class="warning">
              {$_('options.steamworksMacWarning')}
            </p>
          {/if}
        {:else}
          <p>{$_('options.steamworksUnavailable')}</p>
          <ul>
            <li>{$_('options.application-win64').replace('{type}', 'Electron')}</li>
            <li>
              {$_('options.application-mac').replace('{type}', 'Electron')}
              <br>
              {$_('options.steamworksMacWarning')}
            </li>
            <li>{$_('options.application-linux64').replace('{type}', 'Electron')}</li>
          </ul>
        {/if}

        <p>
          <a href="https://extensions.turbowarp.org/steamworks">{$_('options.steamworksDocumentation')}</a>
        </p>
      </Section>
    {/if}

  </div>

</div>

<div class="settings-actions" in:fade>
  <DropArea on:drop={(e) => importOptionsFromDataTransfer(e.detail)}>
    {#if $progress.visible}
      <div class="actions-extra">
        <Progress progress={$progress.progress} text={$progress.text} />
      </div>
    {:else if result}
      <div class="actions-extra">
        <Downloads
          name={result.filename}
          url={result.url}
          blob={result.blob}
        />
      </div>
    {/if}

    <div class="buttons">
      <div class="actions-group">
        <Button on:click={exportOptions} secondary text={$_('options.export')} />
        <Button on:click={importOptions} secondary text={$_('options.import')} />
      </div>

      <span class="actions-divider" aria-hidden="true"></span>

      <div class="actions-group">
        <Button on:click={resetAll} dangerous text={$_('options.resetAll')} />
      </div>

      {#if !result && !$progress.visible}
        <span class="actions-hint">{$_('options.downloadsWillAppearHere')}</span>
      {/if}

      <div class="actions-group actions-primary">
        <Button on:click={preview} secondary text={$_('options.preview')} />
        <Button on:click={pack} text={$_('options.package')} />
      </div>
    </div>
  </DropArea>
</div>
