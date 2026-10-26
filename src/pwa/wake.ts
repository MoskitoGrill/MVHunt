export type WakeState = 'off' | 'requesting' | 'active' | 'lost' | 'denied' | 'unsupported'
export type Sentinel = { released: boolean; release(): Promise<void>; addEventListener(type: 'release', listener: () => void): void }
/** Race-safe ownership: a late permission result cannot reacquire after disable/dispose. */
export class ScreenWake {
  private generation = 0
  private sentinel?: Sentinel
  private wanted = false
  private pending = false
  constructor(private request: (() => Promise<Sentinel>) | undefined, private visible: () => boolean, private report: (state: WakeState) => void) {}
  enable() { this.wanted = true; void this.acquire() }
  disable() {
    this.wanted = false; this.generation++; this.pending = false
    const old = this.sentinel; this.sentinel = undefined
    void old?.release().catch(() => {})
    this.report('off')
  }
  resume() { if (this.wanted) void this.acquire() }
  private async acquire() {
    if (!this.request) { this.report('unsupported'); return }
    if (!this.visible() || this.pending || (this.sentinel && !this.sentinel.released)) return
    const generation = this.generation
    this.pending = true; this.report('requesting')
    try {
      const sentinel = await this.request()
      if (!this.wanted || generation !== this.generation || !this.visible()) {
        await sentinel.release()
        if (this.wanted && generation === this.generation) this.report('lost')
        return
      }
      this.sentinel = sentinel
      sentinel.addEventListener('release', () => {
        if (this.sentinel !== sentinel) return
        this.sentinel = undefined; this.report('lost')
      })
      this.report(sentinel.released ? 'lost' : 'active')
    } catch { if (generation === this.generation && this.wanted) this.report('denied') }
    finally { if (generation === this.generation) this.pending = false }
  }
}

export class HoldToUnlock {
  private since: number | null = null
  constructor(private now: () => number, private duration = 2000) {}
  start() { if (this.since === null) this.since = this.now() }
  cancel() { this.since = null }
  ready() { return this.since !== null && this.now() - this.since >= this.duration }
}
