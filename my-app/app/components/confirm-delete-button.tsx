"use client";

export default function ConfirmDeleteButton({ message, children }: {
  message: string; children: React.ReactNode;
}) {
  return <button type="submit" name="intent" value="delete" formNoValidate onClick={event => {
    if (!window.confirm(message)) { event.preventDefault(); return; }
    const form = event.currentTarget.form;
    if (form) {
      let confirmation = form.querySelector<HTMLInputElement>('input[name="confirm_delete"]');
      if (!confirmation) {
        confirmation = document.createElement("input");
        confirmation.type = "hidden";
        confirmation.name = "confirm_delete";
        form.appendChild(confirmation);
      }
      confirmation.value = "on";
    }
  }}>{children}</button>;
}
