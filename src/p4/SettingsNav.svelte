<script>
  import {onDestroy} from 'svelte';
  import {_} from '../locales/';

  export let groups = [];
  export let value = '';

  let navElement;
  let triggerElement;
  let listElement;
  // Compact mode only. Above the breakpoint the trigger is hidden and the list is always
  // shown, so the flag is simply ignored there.
  let expanded = false;

  // Must stay in sync with the media query in the style block below.
  const compactQuery = window.matchMedia('(max-width: 800px)');
  const onCompactChange = (event) => {
    // Leaving compact mode makes the list permanently visible again, so the popup state has
    // to be dropped. Otherwise narrowing the window later would reveal a popup the user
    // never opened.
    if (!event.matches) {
      expanded = false;
    }
  };
  compactQuery.addEventListener('change', onCompactChange);
  onDestroy(() => compactQuery.removeEventListener('change', onCompactChange));

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
  $: selectedGroup = groups.find((group) => group.id === selectedId);

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

  // Picking a group also closes the compact popup. Above the breakpoint there is nothing to
  // close, so this is just an assignment.
  const selectGroup = (id) => {
    value = id;
    expanded = false;
  };

  const onKeydown = (event) => {
    if (event.key === 'Escape' && expanded) {
      expanded = false;
      if (triggerElement) {
        triggerElement.focus();
      }
      return;
    }

    // Arrow keys drive the list through its roving tabindex. Pressing them on the compact
    // trigger unfolds the popup and hands focus to the selected item rather than moving the
    // selection behind a closed panel.
    if (event.target === triggerElement) {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        return;
      }
      event.preventDefault();
      expanded = true;
      focusIndex(Math.max(getIndex(), 0));
      return;
    }

    // Everything else only applies while focus is inside the list itself.
    if (!listElement || !listElement.contains(event.target)) {
      return;
    }

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

  // A popup that stays open while the page behind it is being used is worse than no popup:
  // close it on any press outside the navigation.
  const onWindowPointerDown = (event) => {
    if (!expanded) return;
    if (navElement && !navElement.contains(event.target)) {
      expanded = false;
    }
  };
</script>

<svelte:window on:pointerdown={onWindowPointerDown} />

<style>
  /* Stickiness is handled by the page shell (.sidebar-inner in P4.svelte), because this
     list is only one part of the sidebar. */
  nav {
    /* Containing block for the compact popup below. */
    position: relative;
    min-width: 0;
  }
  /* Hidden everywhere except the compact breakpoint, where it replaces the always-visible
     list. */
  .trigger {
    display: none;
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
  .trigger > span,
  li button > span {
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
    /* Compact mode. The bar has to stay one row tall: a wrapped chip row needs three or
       four lines at phone widths, and a horizontally scrollable row is not actually
       scrollable with a plain mouse wheel (it is horizontal, the wheel is vertical, and
       the scrollbar is hidden), which made the navigation look stuck. The trigger unfolds
       the very same list instead, so every group stays one press away. */
    .trigger {
      display: flex;
      align-items: center;
      gap: 9px;
      width: 100%;
      padding: 9px 10px 9px 12px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.35;
      text-align: left;
      color: var(--text, #1d1f21);
      background: var(--surface-2, #f5f6f7);
      border: 1px solid var(--border, #e3e4e6);
      border-radius: var(--radius-md, 10px);
      cursor: pointer;
    }
    .trigger > span {
      flex: 1;
    }
    .trigger:focus-visible {
      outline: 2px solid var(--focus, #4c97ff);
      outline-offset: 2px;
    }
    .trigger[aria-expanded="true"] {
      background: var(--surface-3, #ececee);
      border-color: var(--border-strong, #cfd1d4);
    }
    .chevron {
      transition: transform 0.15s;
    }
    .trigger[aria-expanded="true"] .chevron {
      transform: rotate(180deg);
    }
    /* Floats over the page rather than pushing it down, so opening the navigation does not
       shift everything below the bar. The page shell keeps `overflow` visible on the bar
       for exactly this reason. The offset clears the bar's own padding and bottom border so
       the panel never straddles that divider. */
    ul {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      left: 0;
      display: none;
      margin: 0;
      padding: 4px;
      background: var(--surface, #fff);
      border: 1px solid var(--border, #e3e4e6);
      border-radius: var(--radius-md, 10px);
      box-shadow: var(--shadow-lg, 0 16px 40px rgba(0, 0, 0, 0.3));
    }
    ul.expanded {
      display: flex;
    }
  }
</style>

<nav aria-label={$_('options.nav')} bind:this={navElement} on:keydown={onKeydown}>
  <!-- Compact trigger. `aria-controls` points at the one and only tablist rather than at a
       second copy of it, so the document never holds two sets of tabs. -->
  <button
    class="trigger"
    type="button"
    aria-expanded={expanded}
    aria-controls="settings-groups"
    on:click={() => expanded = !expanded}
    bind:this={triggerElement}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {#each ICONS[selectedId] || ICONS.other as d}
        <path {d} />
      {/each}
    </svg>
    <span>{selectedGroup ? selectedGroup.label : ''}</span>
    <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6.8 9.6 12 14.8l5.2-5.2" />
    </svg>
  </button>
  <ul id="settings-groups" class:expanded role="tablist" aria-orientation="vertical" bind:this={listElement}>
    {#each groups as group (group.id)}
      <li role="presentation">
        <button
          type="button"
          role="tab"
          id={`tab-${group.id}`}
          aria-selected={group.id === selectedId}
          aria-controls={`panel-${group.id}`}
          tabindex={group.id === selectedId ? 0 : -1}
          on:click={() => selectGroup(group.id)}
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
