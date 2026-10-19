type Props = {
  name: string;
  skip: string;
  skipErrors: string[];
  busy: boolean;
  onName: (v: string) => void;
  onSkip: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export function AddProjectPanel({ name, skip, skipErrors, busy, onName, onSkip, onClose, onSubmit }: Props) {
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy && !skipErrors.length) onSubmit();
      }}
    >
      <p className="hint">
        Dependencies, version control, build output, and caches are excluded automatically. See About for the full list.
      </p>
      <label className="field">
        <span>Archive Name</span>
        <input value={name} onChange={(e) => onName(e.target.value)} placeholder="Optional" disabled={busy} />
        <small>Optional. Leave blank to use the folder name you pick next.</small>
      </label>
      <label className="field">
        <span>Additional Exclusions</span>
        <textarea
          value={skip}
          onChange={(e) => onSkip(e.target.value)}
          placeholder={"logs\n*.pem\nruntime/forensics"}
          rows={4}
          spellCheck={false}
          disabled={busy}
          aria-invalid={skipErrors.length > 0}
        />
        <small>
          One per line or comma-separated. Names match anywhere; paths with / start at the project root. Supports * ? **.
          A .zipofiignore file is also read.
        </small>
        {skipErrors.length > 0 && (
          <ul className="field-errors" role="alert">
            {skipErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </label>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="submit" className="btn primary" disabled={busy || skipErrors.length > 0}>
          Choose Folder…
        </button>
      </div>
    </form>
  );
}
