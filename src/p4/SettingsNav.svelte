<script>
  import {_} from '../locales/';

  export let groups = [];
  export let value = '';

  let listElement;

  // Icons are inlined rather than loaded from an icon set: the site has no icon pipeline, and
  // a font or sprite would be an extra request for eight glyphs. Each entry is a list of path
  // data drawn on a 24x24 grid, stroked with `currentColor` so it follows the item's colour in
  // both themes. Circles are written as arc subpaths to keep every glyph a plain <path>.
  const ICONS = {
    home: ['M3.6 10.7 12 4l8.4 6.7', 'M6.1 9.9v10.2h11.8V9.9', 'M10 20.1v-4.6h4v4.6'],
    // Lightning bolt: "how the project runs" (turbo mode, framerate, interpolation). A
    // speedometer reads as a frown at 16px, the bolt survives the downscale.
    runtime: ['M3.9 13.6 14.4 3.3l-3.4 7.2h7.8L7.9 20.7l3.4-7.1z'],
    // Monitor: the player chrome that ships inside the export.
    player: ['M3.6 5.2h16.8v10.4H3.6z', 'M12 15.6v3.8', 'M8.8 19.6h6.4'],
    // Mouse: pointer lock, keyboard and other input behaviour.
    interaction: [
      'M12 3.6a4.6 4.6 0 0 1 4.6 4.6v7.4a4.6 4.6 0 0 1-9.2 0V8.2A4.6 4.6 0 0 1 12 3.6z',
      'M12 7.2v2.8'
    ],
    cloud: ['M6.6 18.2h10.6a3.6 3.6 0 0 0 .3-7.2 5.2 5.2 0 0 0-9.9-1.3 3.9 3.9 0 0 0-1 8.5z'],
    advanced: [
      'M4 8h8.2', 'M16.6 8H20',
      'M12.4 8a2.1 2.1 0 1 0 4.2 0 2.1 2.1 0 1 0-4.2 0',
      'M4 16h3.3', 'M11.8 16H20',
      'M7.5 16a2.1 2.1 0 1 0 4.2 0 2.1 2.1 0 1 0-4.2 0'
    ],
    // Package: the environment the project is built for (HTML, Electron, zip, ...).
    environment: ['M12 3.5 19.8 7.7v8.6L12 20.5 4.2 16.3V7.7z', 'M4.2 7.7 12 11.9l7.8-4.2', 'M12 11.9v8.6'],
    // Used for any group id added later that has no icon of its own.
    other: ['M12 9.3a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 1 0 0-5.4']
  };

  // If the active group is not in the list - the page shell renders the sidebar before the
  // option panels have published their groups - fall back to the first one so the tablist
  // stays reachable.
  $: selectedId = groups.some((group) => group.id === value) ? value : (groups[0] ? groups[0].id : '');

  const getIndex = () => groups.findIndex((group) => group.id === selectedId);

  const focusIndex = (index) => {
    const group = groups[index];
    if (!group) return;
    value = group.id;
    // Roving tabindex is applied on the next update, so move focus afterwards.
    requestAnimationFrame(() => {
      if (!listElement) return;
      const tabs = listElement.querySelectorAll('[role="tab"]');
      if (tabs[index]) {
        tabs[index].focus();
      }
    });
  };

  const onKeydown = (event) => {
    const current = getIndex();
    if (current === -1) return;

    let next;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        next = (current + 1) % groups.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        next = (current - 1 + groups.length) % groups.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = groups.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    focusIndex(next);
  };
</script>

<style>
  /* Stickiness is handled by the page shell (.sidebar-inner in P4.svelte), because this
     list is only one part of the sidebar. */
  nav {
    min-width: 0;
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
  }
  button {
    position: relative;
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 8px 10px 8px 12px;
    font-family: inherit;
    font-size: 14px;
    line-height: 1.35;
    text-align: left;
    color: var(--text-muted, #6b7075);
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-md, 10px);
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s, border-color 0.15s;
  }
  /* The label is a flex item so it can be the thing that truncates; `min-width: 0` is what
     actually allows it to shrink below its content width. */
  button > span {
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  svg {
    flex: none;
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
  }
  /* Selection marker. A pseudo-element instead of an inset box-shadow: the shadow would be
     drawn along the 10px corner radius and taper off, and it cannot be animated. */
  button::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    width: 3px;
    height: 16px;
    margin-top: -8px;
    border-radius: 0 3px 3px 0;
    background: var(--accent, #ff4c4c);
    opacity: 0;
    transition: opacity 0.15s;
  }
  button:hover {
    color: var(--text, #1d1f21);
    background: var(--surface-2, #f5f6f7);
  }
  button[aria-selected="true"] {
    font-weight: 500;
    color: var(--text, #1d1f21);
    background: var(--surface-3, #ececee);
  }
  button[aria-selected="true"]::before {
    opacity: 1;
  }
  button:focus-visible {
    outline: 2px solid var(--focus, #4c97ff);
    outline-offset: 2px;
  }
  @media (max-width: 800px) {
    /* The sidebar collapses into a horizontally scrollable chip bar; the marker would be
       invisible inside a pill, so selection is shown with the border and the label colour
       instead. */
    ul {
      flex-direction: row;
      gap: 6px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    /* A scrollable flex row shrinks its items before it overflows, which would ellipsise the
       labels instead of scrolling them. */
    ul > li {
      flex: none;
    }
    ul::-webkit-scrollbar {
      display: none;
    }
    button {
      gap: 7px;
      width: auto;
      padding: 6px 13px 6px 11px;
      border: 1px solid var(--border, #e3e4e6);
      border-radius: 999px;
    }
    button::before {
      display: none;
    }
    button[aria-selected="true"] {
      border-color: var(--accent, #ff4c4c);
    }
  }
</style>

<nav aria-label={$_('options.nav')}>
  <ul role="tablist" aria-orientation="vertical" bind:this={listElement} on:keydown={onKeydown}>
    {#each groups as group (group.id)}
      <li role="presentation">
        <button
          type="button"
          role="tab"
          id={`tab-${group.id}`}
          aria-selected={group.id === selectedId}
          aria-controls={`panel-${group.id}`}
          tabindex={group.id === selectedId ? 0 : -1}
          on:click={() => value = group.id}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            {#each ICONS[group.id] || ICONS.other as d}
              <path {d} />
            {/each}
          </svg>
          <span>{group.label}</span>
        </button>
      </li>
    {/each}
  </ul>
</nav>
