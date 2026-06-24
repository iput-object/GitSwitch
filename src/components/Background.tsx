/**
 * The app-wide ambient background. Lives at the shell level so the entire
 * window, navbar included, shares one surface.
 *
 * Static radial-gradient glows instead of animated blur() blobs: paints once,
 * never repaints, and costs nothing to composite on macOS/Windows webviews
 * where filter blur is expensive. ponytail: traded pointer drift for perf.
 */
export default function Background() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        backgroundImage: [
          "radial-gradient(420px 320px at 50% -8%, rgba(6,182,212,0.14), transparent 70%)",
          "radial-gradient(360px 300px at 108% 108%, rgba(34,211,238,0.10), transparent 70%)",
          "radial-gradient(320px 280px at -8% 108%, rgba(6,182,212,0.10), transparent 70%)",
        ].join(","),
      }}
    >
      <div className="absolute inset-0 opacity-[0.035] bg-[linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] bg-size-[26px_26px] mask-[radial-gradient(circle_at_50%_45%,black,transparent_70%)]" />
    </div>
  );
}
