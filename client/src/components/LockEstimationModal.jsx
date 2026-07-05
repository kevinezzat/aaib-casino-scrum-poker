import React, { useState, useEffect, useMemo } from "react"

/**
 * LockEstimationModal - shown to the dealer after revealing all chips.
 *
 * Props:
 *   open         {boolean}         - controls visibility
 *   votes        {Array}           - [{ participantName, value }]
 *   deckValues   {Array}           - valid values for this deck (e.g. [1,2,3,5,8,13,"?"])
 *   issueKey     {string}          - e.g. "AUTH-204"
 *   onConfirm    {(value) => void} - called with the final chosen value
 *   onCancel     {() => void}
 */
export default function LockEstimationModal({
  open,
  votes = [],
  deckValues = [1, 2, 3, 5, 8, 13, 20, "?"],
  issueKey,
  onConfirm,
  onCancel,
}) {
  // Compute suggestion: highest mode, fallback mean
  const suggestion = useMemo(() => {
    const numeric = votes.map((v) => Number(v.value)).filter((n) => !isNaN(n))
    if (numeric.length === 0) return null
    const freq = {}
    let maxFreq = 0
    numeric.forEach((n) => {
      freq[n] = (freq[n] || 0) + 1
      if (freq[n] > maxFreq) maxFreq = freq[n]
    })
    const modes = Object.entries(freq)
      .filter(([, f]) => f === maxFreq)
      .map(([v]) => Number(v))
      .sort((a, b) => a - b)
    return modes[modes.length - 1]
  }, [votes])

  const average = useMemo(() => {
    const numeric = votes.map((v) => Number(v.value)).filter((n) => !isNaN(n))
    if (numeric.length === 0) return null
    return Math.round((numeric.reduce((a, b) => a + b, 0) / numeric.length) * 10) / 10
  }, [votes])

  const [selectedValue, setSelectedValue] = useState(null)
  const [customInput, setCustomInput] = useState("")
  const [useCustom, setUseCustom] = useState(false)

  useEffect(() => {
    if (open) {
      const pre = suggestion ?? (votes[0]?.value ?? null)
      setSelectedValue(pre)
      setCustomInput(pre !== null ? String(pre) : "")
      setUseCustom(false)
    }
  }, [open, suggestion])

  if (!open) return null

  const finalValue = useCustom
    ? (isNaN(Number(customInput)) ? customInput : Number(customInput))
    : selectedValue

  const handleConfirm = () => {
    if (finalValue === null || finalValue === undefined || customInput === "") return
    onConfirm(finalValue)
  }

  const valueGroups = Object.entries(
    votes.reduce((acc, v) => {
      const key = String(v.value)
      if (!acc[key]) acc[key] = []
      acc[key].push(v.participantName)
      return acc
    }, {})
  ).sort((a, b) => {
    const na = Number(a[0]), nb = Number(b[0])
    if (!isNaN(na) && !isNaN(nb)) return na - nb
    return a[0].localeCompare(b[0])
  })

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-md"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}
    >
      <div
        className="bg-surface-container border border-outline-variant rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in w-full max-w-md"
        style={{ animationDuration: "0.2s" }}
      >
        {/* Header */}
        <div className="px-lg pt-lg pb-md border-b border-outline-variant flex items-start justify-between gap-md">
          <div>
            <div className="flex items-center gap-xs mb-[2px]">
              <span
                className="material-symbols-outlined text-[20px] text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >lock</span>
              <h2 className="font-headline-md text-on-surface font-bold m-0">Lock Estimation</h2>
            </div>
            {issueKey && (
              <p className="font-label-sm text-on-surface-variant m-0">{issueKey}</p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="text-on-surface-variant hover:text-on-surface transition-colors p-[4px] rounded-lg hover:bg-surface-container-high mt-[2px]"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="px-lg py-md flex flex-col gap-md overflow-y-auto max-h-[60vh]">
          {/* Vote Breakdown */}
          {votes.length > 0 ? (
            <div>
              <p className="font-label-sm text-on-surface-variant uppercase tracking-wider font-semibold mb-sm">
                Vote Breakdown
              </p>
              <div className="flex flex-col gap-xs">
                {valueGroups.map(([val, names]) => (
                  <div
                    key={val}
                    className="flex items-center gap-sm bg-surface-container-high border border-outline-variant rounded-xl px-sm py-xs"
                  >
                    <span
                      className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-[15px] text-on-secondary-container font-mono"
                      style={{ background: "var(--md-sys-color-secondary-container, #ffffffff)" }}
                    >{val}</span>
                    <div className="flex flex-wrap gap-xs flex-1">
                      {names.map((name) => (
                        <span
                          key={name}
                          className="font-body-sm text-on-surface bg-surface-container border border-outline-variant rounded-full px-xs py-[2px]"
                        >{name}</span>
                      ))}
                    </div>
                    <span className="font-label-sm text-secondary font-bold">x{names.length}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="font-body-sm text-on-surface-variant">No votes recorded.</p>
          )}

          {/* Suggestion */}
          {suggestion !== null && (
            <div className="flex items-center gap-sm bg-surface-container-high border border-secondary/40 rounded-xl px-sm py-xs">
              <span
                className="material-symbols-outlined text-[18px] text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >auto_awesome</span>
              <div className="flex-1">
                <span className="font-label-sm text-secondary font-semibold">
                  Suggested: {suggestion}
                </span>
                {average !== null && average !== suggestion && (
                  <span className="font-label-sm text-on-surface-variant ml-xs">
                    (avg {average})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Final Estimation */}
          <div>
            <p className="font-label-sm text-on-surface-variant uppercase tracking-wider font-semibold mb-sm">
              Final Estimation
            </p>
            <div className="flex flex-wrap gap-xs mb-sm">
              {deckValues.map((val) => {
                const isSelected = !useCustom && String(selectedValue) === String(val)
                return (
                  <button
                    key={val}
                    onClick={() => {
                      setSelectedValue(val)
                      setCustomInput(String(val))
                      setUseCustom(false)
                    }}
                    className={`w-10 h-10 rounded-lg font-bold font-mono text-[14px] border-2 transition-all ${isSelected
                        ? "border-secondary bg-secondary text-on-secondary shadow-md scale-105"
                        : "border-outline-variant bg-surface-container text-on-surface hover:border-secondary/60 hover:bg-surface-container-high"
                      }`}
                  >{val}</button>
                )
              })}
            </div>
            <div className="flex items-center gap-xs">
              <span className="font-label-sm text-on-surface-variant">Custom:</span>
              <input
                type="text"
                value={customInput}
                onChange={(e) => {
                  setCustomInput(e.target.value)
                  setUseCustom(true)
                  setSelectedValue(null)
                }}
                onFocus={() => setUseCustom(true)}
                placeholder="e.g. 6"
                className="flex-1 bg-surface-container border border-outline-variant rounded-lg px-sm py-xs font-mono font-bold text-on-surface text-[14px] focus:border-secondary outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-lg py-md border-t border-outline-variant flex items-center justify-between gap-sm">
          <button
            onClick={onCancel}
            className="px-md py-sm rounded-xl font-label-md uppercase hover:bg-surface-container-highest text-on-surface transition-colors"
          >Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={finalValue === null || finalValue === undefined || customInput === ""}
            className="px-md py-sm rounded-xl font-label-md uppercase bg-secondary text-on-secondary hover:bg-secondary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-xs font-bold"
          >
            <span
              className="material-symbols-outlined text-[16px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >lock</span>
            Lock in
          </button>
        </div>
      </div>
    </div>
  )
}
