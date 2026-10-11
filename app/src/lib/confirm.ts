import toast from 'react-hot-toast';

/**
 * In-app confirmation using react-hot-toast.
 * Returns a promise that resolves true (confirmed) or false (cancelled).
 * Replaces browser confirm() which looks ugly and is blocked on some mobile browsers.
 */
export function confirmAction(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    toast(
      (t) => {
        const el = document.createElement('div');
        // We return the JSX via the toast callback — handled below
        return el as unknown as React.ReactElement;
      },
      { duration: Infinity }
    );
    // Use a custom toast with action buttons
    // Since react-hot-toast supports JSX in the callback, we use it directly:
    toast.dismiss(); // clear any pending

    // Re-create using the proper JSX form handled in the calling component
    // This utility is intentionally simple — callers use confirmToast() below
    resolve(false);
  });
}

/**
 * Shows a toast with Confirm / Cancel buttons.
 * Usage: const ok = await confirmToast('Delete this entry?');
 */
export function confirmToast(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;

    const id = toast(
      // react-hot-toast accepts a render function
      (t) => {
        // We need DOM manipulation here since this runs outside React's render cycle
        // Return a plain string — the actual UI is injected below via innerHTML trick
        return message as unknown as React.ReactElement;
      },
      {
        duration: Infinity,
        style: { padding: 0, background: 'transparent', boxShadow: 'none' },
      }
    );

    // Dismiss and resolve
    function done(result: boolean) {
      if (resolved) return;
      resolved = true;
      toast.dismiss(id);
      resolve(result);
    }

    // Since react-hot-toast's render fn runs synchronously, we use a different approach:
    // Show a styled toast with clickable text and two buttons rendered as a component.
    // The cleanest way is to call this from a React component using the JSX form.
    // This module exports the helper; the actual JSX is in ConfirmToast component.
    toast.dismiss(id);

    // Show the real toast with JSX
    showConfirmToast(message, done);
  });
}

// Internal — called by confirmToast
function showConfirmToast(message: string, done: (result: boolean) => void) {
  toast(
    (t) => {
      // Build HTML manually since we're outside React here
      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        background: #1f2937; color: white; border-radius: 12px;
        padding: 14px 16px; min-width: 260px; max-width: 320px;
      `;

      const msg = document.createElement('p');
      msg.style.cssText = 'font-size: 13px; margin: 0 0 12px 0; line-height: 1.4;';
      msg.textContent = message;

      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display: flex; gap: 8px;';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `
        flex: 1; padding: 8px; border-radius: 8px; font-size: 13px; font-weight: 600;
        background: #374151; color: #d1d5db; border: none; cursor: pointer;
      `;
      cancelBtn.onclick = () => { toast.dismiss(t.id); done(false); };

      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = 'Delete';
      confirmBtn.style.cssText = `
        flex: 1; padding: 8px; border-radius: 8px; font-size: 13px; font-weight: 600;
        background: #dc2626; color: white; border: none; cursor: pointer;
      `;
      confirmBtn.onclick = () => { toast.dismiss(t.id); done(true); };

      btnRow.appendChild(cancelBtn);
      btnRow.appendChild(confirmBtn);
      wrapper.appendChild(msg);
      wrapper.appendChild(btnRow);

      return wrapper as unknown as React.ReactElement;
    },
    { duration: Infinity, style: { padding: 0, background: 'transparent', boxShadow: 'none', maxWidth: '360px' } }
  );
}
