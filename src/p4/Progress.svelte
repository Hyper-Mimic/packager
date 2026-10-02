<script>
  export let progress = 0;
  export let text = '';

  // Some steps (loading the compiler, downloading large assets, ...) never report a value,
  // so we show an indeterminate sweeping bar instead of a stuck 0% one.
  $: indeterminate = !(progress > 0);
  $: percent = Math.round(progress * 100);
</script>

<style>
  .progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }
  .bar-outer {
    position: relative;
    width: 100%;
    height: 6px;
    border-radius: 999px;
    background: var(--surface-3, #ececee);
    overflow: hidden;
  }
  .bar-inner {
    height: 100%;
    border-radius: 999px;
    background: var(--accent, #ff4c4c);
    transition: width 0.25s ease;
  }
  .bar-outer.indeterminate .bar-inner {
    animation: indeterminate 1.4s ease-in-out infinite;
  }
  @keyframes indeterminate {
    0% {
      margin-left: -35%;
    }
    100% {
      margin-left: 100%;
    }
  }
  .meta {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    min-height: 17px;
    font-size: 12px;
    line-height: 1.4;
  }
  .text {
    min-width: 0;
    color: var(--text-muted, #6b7075);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .percent {
    flex: none;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--text, inherit);
  }
</style>

<div class="progress">
  <div
    class="bar-outer"
    class:indeterminate
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow={indeterminate ? null : percent}
  >
    <div
      class="bar-inner"
      style:width={indeterminate ? '35%' : `${percent}%`}
    ></div>
  </div>
  {#if text || !indeterminate}
    <div class="meta">
      <span class="text">{text}</span>
      {#if !indeterminate}
        <span class="percent">{percent}%</span>
      {/if}
    </div>
  {/if}
</div>
