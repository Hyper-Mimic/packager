<script>
  import {_} from '../locales';
  import {getJSZip} from '../packager/packager';
  import downloadURL from './download-url';
  import {isChromeOS} from './environment';

  export let name;
  export let url;
  export let blob;

  let workaroundInProgress;

  const useAlternativeDownloadToBypassChromeOSBugs = async () => {
    // We've had a lot of bug reports about people on Chrome OS devices not being able to download
    // HTML files but being able to download zip files just fine. We're pretty sure that's not our
    // fault so we have to work around it (I want to blame whatever surveillance extensions
    // they're being forced to install).

    workaroundInProgress = true;

    try {
      const JSZip = await getJSZip();
      const zip = new JSZip();
      zip.file(name, blob);
      const zippedBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE'
      });
      const newFileName = name.replace(/\.html$/, '.zip');

      const blobURL = URL.createObjectURL(zippedBlob);
      downloadURL(newFileName, blobURL);
      URL.revokeObjectURL(blobURL);
    } catch (e) {
      console.error(e);
    }

    workaroundInProgress = false;
  };
</script>

<style>
  .download {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .link {
    max-width: 100%;
    padding: 6px 14px;
    border-radius: var(--radius-sm, 6px);
    background: var(--secondary, #0fbd8c);
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: filter 0.15s;
  }
  .link:hover,
  .link:active {
    color: #fff;
    filter: brightness(0.94);
  }
  .workaround {
    padding: 0;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 12px;
    color: var(--text-muted, #6b7075);
    text-decoration: underline;
    cursor: pointer;
  }
  .workaround:disabled {
    cursor: default;
    opacity: 0.6;
  }
</style>

<div class="download">
  <a
    class="link"
    href={url}
    download={name}
  >
    {$_('downloads.link')
      .replace('{size}', `${(blob.size / 1000 / 1000).toFixed(2)}MB`)
      .replace('{filename}', name)}
  </a>
  {#if isChromeOS && name.endsWith('.html')}
    <button
      class="workaround"
      on:click={useAlternativeDownloadToBypassChromeOSBugs}
      disabled={workaroundInProgress}
    >
      {$_('downloads.useWorkaround')}
    </button>
  {/if}
</div>
