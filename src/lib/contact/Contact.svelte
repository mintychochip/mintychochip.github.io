<script lang="ts">
  import { site } from '../site';
  import { mailto, validate, type Draft, type DraftErrors } from './mail';

  let draft = $state<Draft>({ name: '', email: '', message: '' });
  let errors = $state<DraftErrors>({});
  let sent = $state(false);
  let form: HTMLFormElement;

  function submit(e: SubmitEvent) {
    e.preventDefault();
    errors = validate(draft);
    const first = (['name', 'email', 'message'] as const).find((k) => errors[k]);
    if (first) {
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      sent = false;
      return;
    }
    window.location.href = mailto(site.email, draft);
    sent = true;
  }

  function edit(key: keyof Draft) {
    if (errors[key]) errors = { ...errors, [key]: undefined };
    sent = false;
  }
</script>

<section id="contact" aria-labelledby="contact-title">
  <h2 id="contact-title">Contact</h2>
  <p class="lede">
    <a href="mailto:{site.email}">{site.email}</a>, or write here and your mail app opens with it filled in.
  </p>
  <form bind:this={form} novalidate onsubmit={submit}>
    <label>
      <span>Name</span>
      <input
        class="px"
        name="name"
        autocomplete="name"
        bind:value={draft.name}
        oninput={() => edit('name')}
        aria-invalid={errors.name ? 'true' : undefined}
        aria-describedby={errors.name ? 'err-name' : undefined}
      />
      {#if errors.name}<em id="err-name">{errors.name}</em>{/if}
    </label>
    <label>
      <span>Email</span>
      <input
        class="px"
        name="email"
        type="email"
        autocomplete="email"
        bind:value={draft.email}
        oninput={() => edit('email')}
        aria-invalid={errors.email ? 'true' : undefined}
        aria-describedby={errors.email ? 'err-email' : undefined}
      />
      {#if errors.email}<em id="err-email">{errors.email}</em>{/if}
    </label>
    <label class="wide">
      <span>Message</span>
      <textarea
        class="px"
        name="message"
        rows="4"
        bind:value={draft.message}
        oninput={() => edit('message')}
        aria-invalid={errors.message ? 'true' : undefined}
        aria-describedby={errors.message ? 'err-message' : undefined}
      ></textarea>
      {#if errors.message}<em id="err-message">{errors.message}</em>{/if}
    </label>
    <div class="wide actions">
      <button class="btn px" type="submit">Send</button>
      <p class="note" role="status">
        {#if sent}Your email app should open with the message drafted — review and send it there.{/if}
      </p>
    </div>
  </form>
</section>

<style>
  h2 {
    margin: 0;
    font-size: clamp(24px, 5vw, 30px);
    line-height: 1.2;
  }
  .lede {
    margin: 12px 0 0;
    color: var(--muted);
  }
  .lede a {
    color: var(--fg);
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 5px;
  }
  .lede a:hover {
    color: var(--accent);
  }
  form {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 18px;
    margin-top: 20px;
  }
  label {
    display: grid;
    gap: 6px;
    align-content: start;
  }
  label span {
    font-size: 16px;
    color: var(--muted);
  }
  .wide {
    grid-column: 1 / -1;
  }
  input,
  textarea {
    width: 100%;
    padding: 10px 12px;
    border: 0;
    background: var(--field);
    font-size: 17px;
  }
  textarea {
    min-height: 100px;
    resize: vertical;
  }
  input:focus,
  textarea:focus {
    background: var(--field-focus);
  }
  input:focus-visible,
  textarea:focus-visible {
    outline: none;
    box-shadow: inset 0 -3px 0 var(--accent);
  }
  [aria-invalid='true'] {
    box-shadow: inset 0 -3px 0 var(--error);
  }
  em {
    font-style: normal;
    font-size: 15px;
    color: var(--error);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 18px;
  }
  .note {
    margin: 0;
    font-size: 15px;
    color: var(--muted);
  }
  @media (max-width: 600px) {
    form {
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }
  }
</style>
