export default function AccessibilityPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6"
    >
      <h1 className="text-3xl font-semibold tracking-tight">Accessibility</h1>
      <div className="text-muted-foreground mt-6 space-y-5 leading-7">
        <p>
          BlakPath is designed to support WCAG 2.2 AA. We use clear labels, visible
          keyboard focus, responsive layouts and text alternatives for visual information.
        </p>
        <p>
          If something is difficult to use with a keyboard, screen reader, magnifier or
          another assistive technology, ask the organisation you are working with for help
          or an alternative way to complete the task.
        </p>
        <p>
          We review accessibility in automated checks and with assisted usability testing.
          Feedback helps us prioritise fixes that make the service easier for everyone to
          use.
        </p>
      </div>
    </main>
  );
}
