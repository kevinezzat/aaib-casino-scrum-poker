/**
 * TokenTest — Design token verification component.
 *
 * Renders colour swatches for AAIB Red (primary) and Casino Green (secondary),
 * plus a form input to verify the @tailwindcss/forms plugin is active.
 * Delete or comment out once token integration is confirmed.
 */
export default function TokenTest() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-md font-sans">
      <div className="max-w-lg w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm animate-fade-in">

        {/* Header */}
        <div className="flex items-center gap-sm mb-md">
          <span
            className="material-symbols-outlined text-primary text-[28px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            casino
          </span>
          <div>
            <h1 className="text-headline-md font-headline-md text-primary">
              AAIB Scrum Poker
            </h1>
            <p className="text-label-sm text-on-surface-variant">Design Token Verification</p>
          </div>
        </div>

        {/* Colour Swatches */}
        <section className="mb-md">
          <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-sm">
            Brand Colours
          </h2>
          <div className="grid grid-cols-2 gap-sm">

            {/* Primary – AAIB Red */}
            <div className="rounded-lg overflow-hidden border border-outline-variant">
              <div className="h-16 bg-primary flex items-center justify-center">
                <span className="text-on-primary text-label-md font-bold">#b61722</span>
              </div>
              <div className="bg-primary-fixed p-xs">
                <p className="text-label-md text-on-surface font-semibold">Primary</p>
                <p className="text-label-sm text-on-surface-variant">AAIB Red</p>
              </div>
            </div>

            {/* Secondary – Casino Green */}
            <div className="rounded-lg overflow-hidden border border-outline-variant">
              <div className="h-16 bg-secondary flex items-center justify-center">
                <span className="text-on-secondary text-label-md font-bold">#006c49</span>
              </div>
              <div className="bg-secondary-container p-xs">
                <p className="text-label-md text-on-surface font-semibold">Secondary</p>
                <p className="text-label-sm text-on-secondary-container">Casino Green</p>
              </div>
            </div>

          </div>
        </section>

        {/* Surface Palette */}
        <section className="mb-md">
          <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-sm">
            Surface Palette
          </h2>
          <div className="flex gap-xs">
            {[
              { bg: 'bg-surface-container-lowest', label: 'Lowest' },
              { bg: 'bg-surface-container-low',    label: 'Low' },
              { bg: 'bg-surface-container',         label: 'Base' },
              { bg: 'bg-surface-container-high',    label: 'High' },
              { bg: 'bg-surface-container-highest', label: 'Highest' },
            ].map(({ bg, label }) => (
              <div key={label} className="flex-1 text-center">
                <div className={`h-10 rounded border border-outline-variant ${bg}`} />
                <p className="text-label-sm text-on-surface-variant mt-xs">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Typography Scale */}
        <section className="mb-md">
          <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-sm">
            Type Scale
          </h2>
          <div className="space-y-xs">
            <p className="text-headline-lg text-on-surface font-headline-lg">Headline LG</p>
            <p className="text-headline-md text-on-surface font-headline-md">Headline MD</p>
            <p className="text-body-lg text-on-surface">Body LG — Inter Regular</p>
            <p className="text-body-sm text-on-surface-variant">Body SM — supporting text</p>
            <p className="text-label-md text-on-surface uppercase tracking-wide font-semibold">Label MD</p>
          </div>
        </section>

        {/* Forms Plugin Test */}
        <section className="mb-md">
          <h2 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-sm">
            Forms Plugin
          </h2>
          <label className="block text-label-md text-on-surface mb-xs" htmlFor="test-email">
            Email address
          </label>
          <input
            id="test-email"
            type="email"
            placeholder="poker@aaib.com"
            className="
              w-full rounded-lg border border-outline-variant bg-surface px-sm py-xs
              text-body-sm text-on-surface placeholder-on-surface-variant
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
              transition
            "
          />
          <p className="text-label-sm text-on-surface-variant mt-xs">
            Focus the input — ring should appear in AAIB Red.
          </p>
        </section>

        {/* Status badge */}
        <div className="flex items-center gap-xs">
          <span className="live-dot w-2 h-2 rounded-full bg-secondary inline-block" />
          <span className="text-label-sm text-on-surface font-semibold">Tokens OK — ready for Phase 2</span>
        </div>

      </div>
    </div>
  )
}
