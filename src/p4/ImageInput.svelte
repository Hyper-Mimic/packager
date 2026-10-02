<script>
  import {_} from '../locales';
  import DropArea from './DropArea.svelte';

  const ACCEPT = [
    '.png',
    '.jpg',
    '.jpeg',
    '.bmp',
    '.svg',
    '.ico',
    '.gif'
  ];

  export let file;
  export let previewSizes;
  let dropping;
  let url;

  // This is a bit strange, there's probably a better way to do this
  // Seems to create and revoke an extra object URL for each file for some reason
  $: if (file) {
    if (url) {
      URL.revokeObjectURL(url);
    }
    url = URL.createObjectURL(file);
  } else if (url) {
    URL.revokeObjectURL(url);
    url = null;
  }

  const clear = (e) => {
    e.stopPropagation();
    file = null;
  };

  const handleClickBackground = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPT.join(',');
    input.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files.length) {
        file = files[0];
      } else {
        file = null;
      }
    });
    document.body.appendChild(input);
    input.click();
    input.remove();
  };

  const handleDrop = ({detail: dataTransfer}) => {
    const droppedFile = dataTransfer.files[0];
    if (ACCEPT.some((ext) => droppedFile.name.endsWith(ext))) {
      file = droppedFile;
    }
  };
</script>

<style>
  .container {
    background: transparent;
    color: var(--text-muted, #6b7075);
    width: 100%;
    box-sizing: border-box;
    border: 2px dashed var(--border-strong, #cfd1d4);
    border-radius: var(--radius-lg, 16px);
    transition: border-color 0.15s, color 0.15s, background-color 0.15s;
    min-height: 90px;
    font: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    overflow: hidden;
    position: relative;
    cursor: pointer;
    padding: 4px;
  }
  .container:hover {
    border-color: var(--text-muted, #6b7075);
    color: var(--text, inherit);
  }
  /* Dropping and focus both read as "this will accept your file", so they share one look:
     accent outline, tinted fill. The two hardcoded blues this replaced did not follow the
     accent colour or the theme. */
  .dropping,
  .container:focus-visible,
  .container:active {
    border-color: var(--accent, #ff4c4c);
    color: var(--text, inherit);
    background-color: var(--surface-2, #f5f6f7);
  }
  .placeholder {
    font-size: 1.5em;
  }
  .selected {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
  }
  .selected > *:not(:last-child) {
    margin-right: 12px;
  }
  /* The clear button is a plain <button> inside the drop area, so it matches the page's
     secondary buttons by hand. */
  .selected button {
    font: inherit;
    padding: 5px 12px;
    color: var(--text, inherit);
    background-color: var(--surface-2, #f5f6f7);
    border: 1px solid var(--border-strong, #cfd1d4);
    border-radius: var(--radius-md, 10px);
    cursor: pointer;
    transition: background-color 0.15s, border-color 0.15s;
  }
  .selected button:hover {
    background-color: var(--surface-3, #ececee);
    border-color: var(--text-muted, #6b7075);
  }
</style>

<DropArea bind:dropping={dropping} on:drop={handleDrop}>
  <button class="container" class:dropping on:click={handleClickBackground}>
    {#if file}
      <div class="selected">
        {#each previewSizes as size}
          <!-- svelte-ignore a11y-missing-attribute -->
          <img src={url} width={size[0]} height={size[1]}>
        {/each}
        <div>{$_('fileInput.selected').replace('{file}', file.name)}</div>
        <button on:click={clear}>{$_('fileInput.clear')}</button>
      </div>
    {:else}
      <div class="placeholder">{$_('fileInput.select')}</div>
    {/if}
  </button>
</DropArea>
