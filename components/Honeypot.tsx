// Hidden form field that real users won't see or fill in. Naive bots fill
// every input by name, so a non-empty value is a strong spam signal.
// Server-side helper: lib/honeypot.ts
export function Honeypot() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
