<script>
  import Section from './Section.svelte';
  import Button from './Button.svelte';
  import {fade, fly} from 'svelte/transition';
  import {cubicIn, cubicOut} from 'svelte/easing';
  import {CannotAccessProjectError, OutdatedPackagerError, UnknownNetworkError, UserError} from '../common/errors';
  import {error} from './stores';
  import {FEEDBACK_PRIMARY} from '../packager/brand';
  import {_} from '../locales/';
  import ComplexMessage from './ComplexMessage.svelte';

  export let modalVisible;
  let modalElement;
  let initiallyFocusedElement;

  const getAllFocusableElements = () => Array.from(document.querySelectorAll('a, button, input, select, summary, textarea'))
    .filter((i) => !modalElement || !modalElement.contains(i));

  $: {
    modalVisible = !!$error;
    if ($error) {
      console.error($error);
      document.body.setAttribute('p4-modal-visible', '');
      initiallyFocusedElement = document.activeElement;
      getAllFocusableElements().forEach((i) => {
        i.setAttribute('p4-old-tabIndex', i.tabIndex);
        i.tabIndex = -1;
      });
    } else {
      document.body.removeAttribute('p4-modal-visible');
      getAllFocusableElements().forEach((i) => {
        if (i.hasAttribute('p4-old-tabIndex')) {
          i.tabIndex = i.getAttribute('p4-old-tabIndex');
          i.removeAttribute('p4-old-tabIndex');
        }
      });
      if (initiallyFocusedElement) {
        initiallyFocusedElement.focus();
      }
    }
  }

  $: if (modalElement) {
    const button = modalElement.querySelector('button');
    if (button) {
      button.focus();
    }
  }

  const closeModal = () => {
    $error = null;
  };
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };

  const refresh = () => location.reload();
</script>

<style>
  :global([p4-modal-visible]) {
    overflow: hidden;
  }
  .modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(0, 0, 0, 0.75);
    word-break: break-word;
  }
  /* The card needs its own element to animate on: Svelte 3 can only transition DOM
     elements, not components. It also has to be a flex container so the card stays a
     flex item - that is what keeps its `width: 100%` shrinking against the viewport
     instead of overflowing by its own horizontal margin. */
  .dialog {
    display: flex;
    justify-content: center;
    width: 100%;
  }
  .technical {
    font-style: italic;
  }
</style>

<svelte:window on:keydown={onKeyDown} />

{#if modalVisible}
  <!-- All prompts can be closed using buttons in the modal, so we can ignore this warning -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="modal"
    on:click|self={closeModal}
    bind:this={modalElement}
    in:fade|local={{duration: 160}}
    out:fade|local={{duration: 120}}
  >
    <div
      class="dialog"
      in:fly|local={{y: -14, duration: 220, easing: cubicOut}}
      out:fly|local={{y: -10, duration: 140, easing: cubicIn}}
    >
      <Section modal>
        <h2>{$_('p4.error')}</h2>
        {#if $error instanceof UserError}
          <p>{$error.message}</p>
          <p>
            <Button on:click={closeModal} text={$_('p4.close')} />
          </p>
        {:else if $error instanceof UnknownNetworkError}
          <p>
            <ComplexMessage
              message={$_('p4.networkError')}
              values={{
                url: {
                  text: $error.url,
                  href: $error.url,
                  newTab: true
                }
              }}
            />
          </p>
          <p>
            <Button on:click={closeModal} text={$_('p4.close')} />
          </p>
        {:else if $error instanceof OutdatedPackagerError}
          <p>{$_('p4.outdated')}</p>
          <p class="technical">{$error}</p>
          <p>
            <Button on:click={refresh} text={$_('p4.refresh')} />
            <Button secondary on:click={closeModal} text={$_('p4.close')} />
          </p>
        {:else if $error instanceof CannotAccessProjectError}
          <p>
            {$_('p4.cannotAccessProject')}
          </p>
          <p>
            {$_('select.unsharedProjects')}
          </p>
          <p>
            <ComplexMessage
              message={$_('select.unsharedProjectsMore')}
              values={{
                link: {
                  text: 'https://docs.turbowarp.org/unshared-projects',
                  href: 'https://docs.turbowarp.org/unshared-projects',
                  newTab: true
                }
              }}
            />
          </p>
          <p>
            {$_('p4.cannotAccessProjectCaching')}
          </p>
          <p>
            <Button on:click={closeModal} text={$_('p4.close')} />
          </p>
        {:else}
          <p>{$_('p4.errorMessage').replace('{error}', $error)}</p>
          <p>
            <Button on:click={closeModal} text={$_('p4.close')} />
            <a href={FEEDBACK_PRIMARY.link}>{$_('p4.reportBug')}</a>
          </p>
        {/if}
      </Section>
    </div>
  </div>
{/if}
