// Bounded in-memory login throttling for this single-instance academic project.
export class LoginLimiter {
  private entries = new Map<string, { count: number; until: number }>();
  constructor(private now = () => Date.now()) {}
  blocked(key: string) {
    const item = this.entries.get(key);
    return Boolean(item && item.until > this.now() && item.count >= 10);
  }
  failure(key: string) {
    const existing = this.entries.get(key);
    if (existing && existing.until > this.now()) {
      existing.count++;
      return;
    }
    this.entries.delete(key);
    if (this.entries.size >= 10000)
      this.entries.delete(this.entries.keys().next().value!);
    this.entries.set(key, { count: 1, until: this.now() + 15 * 60 * 1000 });
  }
  clear(key: string) {
    this.entries.delete(key);
  }
}
