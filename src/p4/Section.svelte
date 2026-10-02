<script>
  import ResetButton from './ResetButton.svelte';

  export let caption = false;
  export let center = false;
  export let modal = false;
  export let accent = '';
  export let reset;
</script>

<style>
  .card {
    position: relative;
    max-width: var(--content-w, 960px);
    margin: 0 auto 16px;
    padding: 18px 20px 20px;
    background: var(--surface, #fff);
    color: var(--text, inherit);
    border: 1px solid var(--border, #e3e4e6);
    border-radius: var(--radius-lg, 16px);
    box-shadow: var(--shadow, none);
    /* Clips the accent rail below to the rounded corners. The rail is only 3px tall, and CSS
       scales a radius down to fit the box, so its own `border-radius` collapses to ~3px and
       cannot follow a 16px corner - without this the rail runs straight out past both
       corners. Establishes a BFC too, which also contains the floated reset button. */
    overflow: hidden;
  }
  /* The accent stripe is drawn as a pseudo-element instead of `border-top`: a top border
     thickens around the corner arc, so the two top corners end up heavier than the middle
     of the stripe. `--card-accent` is set inline by the component (transparent if absent). */
  .card::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    height: 3px;
    background: var(--card-accent, transparent);
    pointer-events: none;
  }
  /* "caption" cards are empty-state hints, not content, so they are deliberately lighter
     than a real card: dashed outline, tinted surface, no shadow. */
  .caption {
    padding: 12px 16px;
    background: var(--surface-2, #f5f6f7);
    border-style: dashed;
    border-color: var(--border-strong, #cfd1d4);
    box-shadow: none;
    font-style: italic;
    color: var(--text-muted, inherit);
  }
  /* The paragraph belongs to the caller's component, so it can only be reached globally. */
  .caption :global(p) {
    margin: 0;
  }
  .modal {
    width: 100%;
    max-width: 420px;
    margin: 0 8px;
    padding: 20px 22px 22px;
    box-shadow: var(--shadow-lg, 0 16px 40px rgba(0, 0, 0, 0.3));
  }
  /* min-height rather than height: the placeholder card hosts a progress bar, which is
     taller than a single line and used to be squeezed by a fixed 40px box. */
  .center {
    min-height: 48px;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
  }
  .reset {
    float: right;
    margin-left: 8px;
    margin-bottom: 4px;
  }
</style>

<div
  class="card"
  class:caption
  class:modal
  class:center={caption || center}
  style:--card-accent={accent || 'transparent'}
>
  {#if reset}
    <div class="reset">
      <ResetButton on:click={reset} />
    </div>
  {/if}
  <slot></slot>
</div>
