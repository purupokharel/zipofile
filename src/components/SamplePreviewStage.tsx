type Props = {
  open: boolean;
  empty: React.ReactNode;
  list: React.ReactNode;
};

export function SamplePreviewStage({ open, empty, list }: Props) {
  return (
    <div className={`sample-preview-stage${open ? " open" : ""}`}>
      <div className="sample-preview-empty">{empty}</div>
      <div className="sample-preview-list-shell" aria-hidden={!open}>
        <div className="sample-preview-list-in">{list}</div>
      </div>
    </div>
  );
}
